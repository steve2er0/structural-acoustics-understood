import {
  isolationMountCoordinates,
  isolationMountStiffnesses,
  isParkerLordConfig,
  mountDynamicStiffness,
  normalizeSorbothaneConfig,
  rigidBodyResponseAtFrequency,
  rigidBodyMassMatrix,
  solveRigidBodyModes
} from './sorbothane-analysis.js';
import { isSorbothaneAssemblyConfig } from './sorbothane-assemblies.js';

export const NASTRAN_IPS_UNITS = Object.freeze({
  length: 'in',
  force: 'lbf',
  time: 's',
  mass: 'slinch',
  inertia: 'slinch·in²',
  density: 'slinch/in³',
  modulus: 'psi',
  stiffness: 'lbf/in',
  gravityInPerSec2: 386.08858267716535,
  lbmPerSlinch: 386.08858267716535,
  inchPerM: 39.37007874015748,
  lbfPerN: 0.22480894387096
});

const { gravityInPerSec2, lbmPerSlinch, inchPerM, lbfPerN } = NASTRAN_IPS_UNITS;
const KG_TO_LBM = 2.2046226218487757;
const KG_M2_TO_SLINCH_IN2 = KG_TO_LBM * inchPerM ** 2 / lbmPerSlinch;
const N_PER_M_TO_LBF_PER_IN = lbfPerN / inchPerM;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const bdfNumber = value => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Cannot write non-finite NASTRAN value: ${value}`);
  if (number === 0) return '0.';
  const magnitude = Math.abs(number);
  if (magnitude >= 1e7 || magnitude < 1e-3) return number.toExponential(7).replace('e', 'E').replace('E+', 'E');
  const text = Number(number.toPrecision(12)).toString();
  return /[.eE]/.test(text) ? text : `${text}.`;
};

const card = (name, ...fields) => [name, ...fields].map(field => {
  if (field == null || field === '') return '';
  if (typeof field !== 'number') return String(field);
  if (!Number.isSafeInteger(field)) throw new Error(`BDF integer field requires a safe integer: ${field}`);
  return String(field);
}).join(',');
// Real fields must be explicitly typed; integer IDs and component numbers must
// never pass through the real formatter (in particular CID=0, not CID=0.).
const real = bdfNumber;

const comment = value => `$ ${String(value).replace(/\r?\n/g, '\n$ ')}`;
const coordinateKey = (x, y) => `${Number(x).toFixed(9)}:${Number(y).toFixed(9)}`;

function axisCoordinates(halfExtent, divisionsInput, criticalValues = []) {
  const divisions = Math.max(2, Math.round(divisionsInput));
  const values = Array.from({ length: divisions + 1 }, (_, index) => -halfExtent + 2 * halfExtent * index / divisions);
  values.push(0, ...criticalValues.map(value => clamp(value, -halfExtent, halfExtent)));
  return values
    .sort((a, b) => a - b)
    .filter((value, index, list) => index === 0 || Math.abs(value - list[index - 1]) > 1e-8);
}

function wrapContinuation(name, initialFields, continuationFields, chunkSize = 8) {
  const lines = [card(name, ...initialFields)];
  for (let index = 0; index < continuationFields.length; index += chunkSize) {
    lines.push(card('+', ...continuationFields.slice(index, index + chunkSize)));
  }
  return lines;
}

function cleanFilename(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'isolation-system';
}

function tableD1(id, frequencies, values) {
  const pairs = frequencies.flatMap((frequency, index) => [real(frequency), real(values[index])]);
  return wrapContinuation('TABLED1', [id, 'LINEAR', 'LINEAR'], [...pairs, 'ENDT']);
}

function responseFrequencies(config, modes) {
  const { frequencyMinHz: minimum, frequencyMaxHz: maximum, frequencyPoints: count } = config.analysis;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum <= 0 || maximum <= minimum) throw new Error('SOL 111 requires a positive frequency minimum and a larger maximum.');
  const base = Array.from({ length: count }, (_, index) => index === 0 ? minimum : index === count - 1 ? maximum
    : 10 ** (Math.log10(minimum) + index / (count - 1) * Math.log10(maximum / minimum)));
  // Include exact modal frequencies and nearby points so narrow resonances are
  // not hidden between logarithmically spaced excitation frequencies.
  const extra = modes.flatMap(mode => [.98, 1, 1.02].map(scale => scale * mode.frequencyHz));
  extra.push(...config.analysis.tones.map(tone => tone.frequencyHz));
  return [...new Set([...base, ...extra].filter(frequency => frequency >= minimum && frequency <= maximum).map(frequency => Number(frequency.toPrecision(12))))].sort((a, b) => a - b);
}

export function generateNastranIsolationSol111Bdf(configInput, analysisInput = null) {
  return generateNastranIsolationBdf(configInput, analysisInput, { solution: 111 });
}

export function nastranBrowserComparisonCsv(configInput, modelInput = null) {
  const config = normalizeSorbothaneConfig(configInput);
  const model = modelInput?.solution === 111 ? modelInput : generateNastranIsolationSol111Bdf(config);
  const metadata = { source: 'browser rigid-body prediction, not NASTRAN results', responseGrid: model.response.responseGridId,
    baseGrid: model.response.baseGridId, responsePoint: config.analysis.responsePoint, damping: config.damping,
    massAccounting: model.settings.massAccounting, coupling: model.settings.coupling, nominalOnly: true };
  const axes = ['x', 'y', 'z'];
  const header = ['frequency_hz', ...axes.flatMap(axis => [`T${axis}${axis}_real`, `T${axis}${axis}_imag`, `T${axis}${axis}_magnitude`, `T${axis}${axis}_db`, `T${axis}${axis}_phase_deg`])];
  const rows = model.response.frequencies.map(frequency => [frequency, ...axes.flatMap((axis, index) => {
    const response = rigidBodyResponseAtFrequency(config, frequency, axis);
    return [response.complex[index].re, response.complex[index].im, response.magnitude[index], response.db[index], response.phaseDeg[index]];
  })].join(','));
  return `# ${JSON.stringify(metadata)}\n${header.join(',')}\n${rows.join('\n')}\n`;
}

export function nastranExportSettings(configInput) {
  return normalizeSorbothaneConfig(configInput).validation.nastran;
}

export function generateNastranIsolationBdf(configInput, analysisInput = null, options = {}) {
  const config = normalizeSorbothaneConfig(configInput);
  const settings = config.validation.nastran;
  const solution = options.solution === 111 ? 111 : 103;
  const frequencyResponse = solution === 111;
  const modal = analysisInput?.modes ? analysisInput : solveRigidBodyModes(config);
  const verticalMode = modal.modes.reduce((best, mode) => mode.participation[2] > best.participation[2] ? mode : best, modal.modes[0]);
  const referenceFrequencyHz = settings.stiffnessReferenceMode === 'custom'
    ? settings.customReferenceFrequencyHz
    : verticalMode.frequencyHz;
  const mount = mountDynamicStiffness(config, referenceFrequencyHz);
  const mixed = isSorbothaneAssemblyConfig(config);
  const supportMounts = isolationMountStiffnesses(config, referenceFrequencyHz);
  const supportProperties = supportMounts.map((support, index) => ({
    id: mixed ? 40 + index : 40, group: support.group ?? null,
    topPart: support.topItem?.productNumber, bottomPart: support.bottomItem?.productNumber,
    rates: [support.kxNPerM, support.kyNPerM, support.kzNPerM].map(value => value * N_PER_M_TO_LBF_PER_IN),
    lossFactors: support.lossNPerM ? support.lossNPerM.map((value, axis) => value / [support.kxNPerM, support.kyNPerM, support.kzNPerM][axis]) : Array(3).fill(support.material.tanDelta)
  }));
  const mass = rigidBodyMassMatrix(config);

  const plateLengthIn = config.component.dimensionsM[0] * inchPerM;
  const plateWidthIn = config.component.dimensionsM[1] * inchPerM;
  const plateZIn = config.mounts.planeZM * inchPerM;
  const cgIn = config.component.cgM.map(value => value * inchPerM);
  const attachmentSpacingIn = [...settings.attachmentSpacingIn];
  const mountCoordinates = isolationMountCoordinates(config).map(point => point.slice(0, 2).map(value => value * inchPerM));
  const attachmentCoordinates = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [sx * attachmentSpacingIn[0] / 2, sy * attachmentSpacingIn[1] / 2]);
  const xCoordinates = axisCoordinates(plateLengthIn / 2, settings.meshX, [...mountCoordinates, ...attachmentCoordinates].map(point => point[0]));
  const yCoordinates = axisCoordinates(plateWidthIn / 2, settings.meshY, [...mountCoordinates, ...attachmentCoordinates].map(point => point[1]));

  const grids = [];
  const gridByCoordinate = new Map();
  let nextGridId = 1001;
  for (const y of yCoordinates) for (const x of xCoordinates) {
    const grid = { id: nextGridId++, x, y, z: plateZIn };
    grids.push(grid);
    gridByCoordinate.set(coordinateKey(x, y), grid.id);
  }
  const plateGrid = (x, y) => {
    const id = gridByCoordinate.get(coordinateKey(x, y));
    if (!id) throw new Error(`Plate mesh does not contain required grid at (${x}, ${y}) in.`);
    return id;
  };

  const quads = [];
  let nextQuadId = 2001;
  for (let yIndex = 0; yIndex < yCoordinates.length - 1; yIndex += 1) {
    for (let xIndex = 0; xIndex < xCoordinates.length - 1; xIndex += 1) {
      quads.push({
        id: nextQuadId++,
        grids: [
          plateGrid(xCoordinates[xIndex], yCoordinates[yIndex]),
          plateGrid(xCoordinates[xIndex + 1], yCoordinates[yIndex]),
          plateGrid(xCoordinates[xIndex + 1], yCoordinates[yIndex + 1]),
          plateGrid(xCoordinates[xIndex], yCoordinates[yIndex + 1])
        ]
      });
    }
  }

  const attachmentGridIds = attachmentCoordinates.map(([x, y]) => plateGrid(x, y));
  const mountGridIds = mountCoordinates.map(([x, y]) => plateGrid(x, y));
  const groundGrids = mountCoordinates.map(([x, y], index) => ({ id: 8001 + index, x, y, z: plateZIn }));
  const cgGridId = 9001;
  const responseGridId = frequencyResponse && config.analysis.responsePoint !== 'cg' ? 9002 : cgGridId;
  const matId = 10;
  const pshellId = 20;
  const pbushId = 40;
  const rbeId = 6001;
  const conmId = 7001;

  const boxMassLbm = config.component.massKg * KG_TO_LBM;
  const boxMassSlinch = boxMassLbm / lbmPerSlinch;
  const inertiaSlinchIn2 = mass.inertiaKgM2.map(value => value * KG_M2_TO_SLINCH_IN2);
  const physicalPlateMassSlinch = plateLengthIn * plateWidthIn * settings.plateThicknessIn * settings.plateDensitySlinchPerIn3;
  const includedPlateMassSlinch = settings.massAccounting === 'box-plus-plate' ? physicalPlateMassSlinch : 0;
  const deckDensity = settings.massAccounting === 'box-plus-plate' ? settings.plateDensitySlinchPerIn3 : null;
  const kxLbfPerIn = mount.kxNPerM * N_PER_M_TO_LBF_PER_IN;
  const kyLbfPerIn = mount.kyNPerM * N_PER_M_TO_LBF_PER_IN;
  const kzLbfPerIn = mount.kzNPerM * N_PER_M_TO_LBF_PER_IN;
  const lossFactor = finite(mount.material?.tanDelta, 0);

  const warnings = [];
  if (config.damping.mode === 'manual-q') warnings.push(`Manual effective Q = ${config.damping.effectiveQ}: PBUSH GE = 1/Q is a user damping assumption, not manufacturer data. ${frequencyResponse ? 'SOL 111 uses this element loss once; no additional global/modal damping is added.' : 'SOL 103 real eigenvalues do not use this damping.'}`);
  if (mixed) warnings.push('Mixed-assembly flange/sleeve/contact assumptions are not validated by this linear CBUSH export. Each leg has its own PBUSH, with axis-specific effective loss factors at the reference frequency. See the browser assembly checks.');
  if (settings.massAccounting === 'box-plus-plate') warnings.push('The CQUAD4 plate mass is added to the website component mass; NASTRAN total isolated mass is therefore greater than the browser rigid-body mass.');
  else warnings.push('The plate density is omitted so the CONM2 preserves the browser total mass; plate self-mass and free plate modes are not represented.');
  if (!isParkerLordConfig(config) && !frequencyResponse) warnings.push(`Sorbothane PBUSH stiffness is frozen at ${referenceFrequencyHz.toFixed(2)} Hz; one SOL 103 property cannot reproduce the browser model's frequency-dependent modulus at every mode.`);
  if (settings.coupling === 'rbe2') warnings.push('RBE2 makes the four box attachment grids rigid relative to the CG and may increase the apparent plate stiffness.');
  const coincidentAttachmentCount = attachmentCoordinates.filter(([x, y]) => mountCoordinates.some(([mx, my]) => Math.abs(x - mx) < 1e-8 && Math.abs(y - my) < 1e-8)).length;
  if (coincidentAttachmentCount === attachmentCoordinates.length) warnings.push('All four box attachment grids coincide with isolator grids, so the plate is bypassed at those attachment locations.');

  const frequencies = frequencyResponse ? responseFrequencies(config, modal.modes) : [];
  const modalCutoffHz = frequencyResponse ? Math.max(settings.maximumFrequencyHz, 2 * frequencies.at(-1)) : settings.maximumFrequencyHz;
  if (frequencyResponse) {
    warnings.push('SOL 111 uses frequency-dependent PBUSHT K and GE tables, with real modes extracted from the nominal PBUSH stiffness. Check modal-cutoff and mesh convergence before accepting correlation.');
    warnings.push('The flexible CQUAD4 plate and selected plate mass/coupling can differ from the browser rigid-component model. No uncertainty envelope or design criteria are solved by this nominal deck.');
    warnings.push('Coherent 1 g enforced base acceleration is applied to all ground grids, one axis per subcase. Transmissibility is the complex response acceleration divided by the same-axis base acceleration, not raw acceleration in g.');
  }
  const outputGrids = [...new Set([cgGridId, responseGridId, ...groundGrids.map(grid => grid.id)])];
  const lines = [
    `SOL ${solution}`,
    'CEND',
    'TITLE = STRUCTURAL ACOUSTICS UNDERSTOOD - ISOLATION SYSTEM',
    'ECHO = NONE',
    ...(frequencyResponse ? [
      'RESVEC = YES',
      `SET 99 = ${outputGrids.join(',')}`,
      ...['X', 'Y', 'Z'].flatMap((axis, index) => [
        `SUBCASE ${index + 1}`, `  LABEL = ${axis} BASE TO ${axis} RESPONSE`,
        '  METHOD = 42', '  SPC = 1', '  FREQUENCY = 50', `  DLOAD = ${201 + index}`,
        '  ACCELERATION(SORT1,REAL,PRINT,PLOT,PUNCH) = 99', '  DISPLACEMENT(PLOT) = 99'
      ])
    ] : ['SUBCASE 1',
    '  LABEL = ISOLATED ASSEMBLY NORMAL MODES',
    '  METHOD = 42',
    '  SPC = 1',
    '  DISPLACEMENT(PLOT) = ALL',
    '  SPCFORCES(PLOT) = ALL',
    '  MPCFORCES(PLOT) = ALL']),
    'BEGIN BULK',
    comment('UNIT CONTRACT: INCH, LBF, SECOND, SLINCH. WTMASS = 1.0.'),
    comment(`1 SLINCH = ${lbmPerSlinch.toFixed(9)} LBM; G0 = ${gravityInPerSec2.toFixed(9)} IN/S^2.`),
    comment('MAT1 RHO: SLINCH/IN^3. CONM2 MASS: SLINCH. CONM2 INERTIA: SLINCH-IN^2.'),
    comment('PBUSH K1/K2/K3: LBF/IN IN BASIC X/Y/Z. PBUSH GE: DIMENSIONLESS LOSS FACTOR.'),
    comment(`SOURCE CONFIGURATION: ${mixed ? 'MIXED SORBOTHANE ASSEMBLIES' : config.isolator.productNumber}; ${isParkerLordConfig(config) ? 'PARKER LORD COMPLETE MOUNT' : `CAPTURED ${config.isolator.formulation === 'water-resistant' ? 'WATER-RESISTANT' : 'STANDARD'} SORBOTHANE ELEMENT`}.`),
    comment(`BROWSER RIGID-BODY MODES (HZ): ${modal.modes.map(mode => mode.frequencyHz.toFixed(4)).join(', ')}.`),
    comment(`SUPPORT LAYOUT: ${config.mounts.count} LEGS, ${config.mounts.count / 2} PER SIDE; EQUALLY SPACED ALONG ${config.mounts.rowAxis.toUpperCase()} ON THE -${config.mounts.rowAxis === 'x' ? 'Y' : 'X'} AND +${config.mounts.rowAxis === 'x' ? 'Y' : 'X'} SIDES.`),
    comment(`PBUSH STIFFNESS REFERENCE FREQUENCY: ${referenceFrequencyHz.toFixed(6)} HZ (${settings.stiffnessReferenceMode}).`),
    comment(`PLATE MATERIAL: ${settings.plateMaterial.toUpperCase()}; E = ${settings.plateYoungsModulusPsi.toExponential(7)} PSI; NU = ${settings.platePoisson}; RHO = ${settings.plateDensitySlinchPerIn3.toExponential(7)} SLINCH/IN^3.`),
    comment(`MASS ACCOUNTING: ${settings.massAccounting}. BOX CONM2 = ${boxMassSlinch.toExponential(7)} SLINCH; INCLUDED PLATE = ${includedPlateMassSlinch.toExponential(7)} SLINCH.`),
    ...warnings.map(warning => comment(`WARNING: ${warning}`)),
    card('PARAM', 'WTMASS', '1.0'),
    card('PARAM', 'POST', -1),
    card('EIGRL', 42, real(0), real(modalCutoffHz), frequencyResponse ? '' : settings.modeCount),
    comment('PLATE MATERIAL AND SHELL PROPERTY'),
    card('MAT1', matId, real(settings.plateYoungsModulusPsi), '', real(settings.platePoisson), deckDensity == null ? '' : real(deckDensity)),
    card('PSHELL', pshellId, matId, real(settings.plateThicknessIn), matId, real(1), matId, real(0.833333), real(0)),
    comment('EQUIVALENT ISOLATOR PROPERTY: K1=X RADIAL, K2=Y RADIAL, K3=Z AXIAL.'),
    ...(mixed ? supportProperties : supportProperties.slice(0, 1)).flatMap(property => [
      comment(`SUPPORT PROPERTY ${property.id}${property.group ? ` GROUP ${property.group}; UPPER ${property.topPart}; LOWER ${property.bottomPart}` : ''}`),
      card('PBUSH', property.id, 'K', ...property.rates.map(real), real(0), real(0), real(0)),
      card('+', '', 'GE', ...property.lossFactors.map(real), real(0), real(0), real(0))
    ]),
    comment('PLATE GRIDS AND CQUAD4 ELEMENTS')
  ];

  grids.forEach(grid => lines.push(card('GRID', grid.id, '', ...[grid.x, grid.y, grid.z].map(real))));
  quads.forEach(quad => lines.push(card('CQUAD4', quad.id, pshellId, ...quad.grids)));
  lines.push(comment('BOX CG, CONCENTRATED MASS, AND LOAD-DISTRIBUTION COUPLING'));
  lines.push(card('GRID', cgGridId, '', ...cgIn.map(real)));
  lines.push(card('CONM2', conmId, cgGridId, 0, real(boxMassSlinch), real(0), real(0), real(0)));
  lines.push(card('+', ...[inertiaSlinchIn2[0], inertiaSlinchIn2[3], inertiaSlinchIn2[1], inertiaSlinchIn2[4], inertiaSlinchIn2[5], inertiaSlinchIn2[2]].map(real)));
  if (settings.coupling === 'rbe3') {
    lines.push(...wrapContinuation('RBE3', [rbeId, '', cgGridId, 123456, real(1), 123, ...attachmentGridIds.slice(0, 2)], attachmentGridIds.slice(2)));
  } else {
    lines.push(card('RBE2', rbeId, cgGridId, 123456, ...attachmentGridIds));
  }
  lines.push(comment(`${mountGridIds.length} ZERO-LENGTH CBUSHES TO FIXED BASE GRIDS; CID=0 ALIGNS K1/K2/K3 WITH BASIC X/Y/Z.`));
  if (responseGridId !== cgGridId) {
    const sign = config.analysis.responsePoint === 'corner-negative' ? -1 : 1;
    lines.push(comment(`RESPONSE POINT: ${config.analysis.responsePoint}; RIGID OFFSET FROM BOX CG.`));
    lines.push(card('GRID', responseGridId, '', ...[sign * plateLengthIn / 2, sign * plateWidthIn / 2, config.component.dimensionsM[2] * inchPerM].map(real)));
    lines.push(card('RBE2', 6002, cgGridId, 123456, responseGridId));
  }
  groundGrids.forEach(grid => lines.push(card('GRID', grid.id, '', ...[grid.x, grid.y, grid.z].map(real))));
  const firstBushId = Math.max(4001, nextQuadId);
  mountGridIds.forEach((topGridId, index) => lines.push(card('CBUSH', firstBushId + index, supportProperties[index].id, topGridId, groundGrids[index].id, '', '', '', 0)));
  const groundGridIds = groundGrids.map(grid => grid.id);
  lines.push(...wrapContinuation('SPC1', [1, 123456, ...groundGridIds.slice(0, 6)], groundGridIds.slice(6)));
  if (frequencyResponse) {
    lines.push(comment(`RESPONSE GRID ${responseGridId}; BASE REFERENCE GRID ${groundGridIds[0]}; SUBCASES 1=X, 2=Y, 3=Z.`));
    lines.push(comment(`ALL MODES THROUGH ${modalCutoffHz} HZ; SOL 103 MODE-COUNT CAP IS NOT APPLIED TO SOL 111.`));
    lines.push(...wrapContinuation('FREQ', [50, ...frequencies.slice(0, 7).map(real)], frequencies.slice(7).map(real)));
    lines.push(...tableD1(500, [frequencies[0], frequencies.at(-1)], [1, 1]));
    ['X', 'Y', 'Z'].forEach((axis, index) => {
      const exciteId = 301 + index, loadId = 101 + index;
      lines.push(comment(`${axis}: 1 G = ${gravityInPerSec2} IN/S^2 AT EVERY BASE GRID.`));
      groundGridIds.forEach(id => lines.push(card('SPCD', exciteId, id, index + 1, real(gravityInPerSec2))));
      lines.push(card('RLOAD2', loadId, exciteId, '', '', 500, '', 'ACCE'));
      lines.push(card('DLOAD', 201 + index, real(1), real(1), loadId));
    });
    const uniqueProperties = mixed ? supportProperties : supportProperties.slice(0, 1);
    const dynamic = frequencies.map(frequency => isolationMountStiffnesses(config, frequency));
    uniqueProperties.forEach((property, propertyIndex) => {
      const kTables = [0, 1, 2].map(axis => 20000 + propertyIndex * 6 + axis);
      const geTables = kTables.map(id => id + 3);
      lines.push(card('PBUSHT', property.id, 'K', ...kTables));
      lines.push(card('+', '', 'GE', ...geTables));
      for (let axis = 0; axis < 3; axis++) {
        const rates = dynamic.map(mounts => [mounts[propertyIndex].kxNPerM, mounts[propertyIndex].kyNPerM, mounts[propertyIndex].kzNPerM][axis]);
        const losses = dynamic.map((mounts, index) => mounts[propertyIndex].lossNPerM ? mounts[propertyIndex].lossNPerM[axis] / rates[index] : mounts[propertyIndex].material.tanDelta);
        lines.push(...tableD1(kTables[axis], frequencies, rates.map(rate => rate * N_PER_M_TO_LBF_PER_IN)));
        lines.push(...tableD1(geTables[axis], frequencies, losses));
      }
    });
  }
  lines.push('ENDDATA');

  const deck = `${lines.join('\n')}\n`;
  const filename = `${cleanFilename(`isolation-${mixed ? 'mixed-assemblies' : config.isolator.productNumber}-sol${solution}`)}.bdf`;
  return {
    solution,
    response: frequencyResponse ? { frequencies, responseGridId, baseGridId: groundGridIds[0], responsePoint: config.analysis.responsePoint, baseAccelerationInPerSec2: gravityInPerSec2, modalCutoffHz, subcases: { x: 1, y: 2, z: 3 } } : null,
    deck,
    filename,
    settings: { ...settings, attachmentSpacingIn },
    units: NASTRAN_IPS_UNITS,
    counts: {
      grids: grids.length + groundGrids.length + 1 + Number(responseGridId !== cgGridId),
      cquad4: quads.length,
      cbush: mountGridIds.length,
      pbush: mixed ? mountGridIds.length : 1,
      conm2: 1,
      rbe2: (settings.coupling === 'rbe2' ? 1 : 0) + Number(responseGridId !== cgGridId),
      rbe3: settings.coupling === 'rbe3' ? 1 : 0
    },
    plate: {
      material: settings.plateMaterial,
      lengthIn: plateLengthIn,
      widthIn: plateWidthIn,
      thicknessIn: settings.plateThicknessIn,
      densitySlinchPerIn3: deckDensity ?? 0,
      physicalMassSlinch: physicalPlateMassSlinch,
      includedMassSlinch: includedPlateMassSlinch,
      includedMassLbm: includedPlateMassSlinch * lbmPerSlinch,
      xCoordinates,
      yCoordinates
    },
    box: { massLbm: boxMassLbm, massSlinch: boxMassSlinch, inertiaSlinchIn2, cgIn },
    totalIncludedMassSlinch: boxMassSlinch + includedPlateMassSlinch,
    totalIncludedMassLbm: (boxMassSlinch + includedPlateMassSlinch) * lbmPerSlinch,
    isolators: { referenceFrequencyHz, kxLbfPerIn, kyLbfPerIn, kzLbfPerIn, lossFactor, supportProperties, mountGridIds, groundGridIds: groundGrids.map(grid => grid.id) },
    attachmentGridIds,
    warnings
  };
}
