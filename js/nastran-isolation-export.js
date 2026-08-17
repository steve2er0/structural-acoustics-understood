import {
  isParkerLordConfig,
  mountDynamicStiffness,
  normalizeSorbothaneConfig,
  rigidBodyMassMatrix,
  solveRigidBodyModes
} from './sorbothane-analysis.js';

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
  return Number(number.toPrecision(9)).toString();
};

const card = (name, ...fields) => [name, ...fields].map(field => {
  if (field == null || field === '') return '';
  return typeof field === 'number' ? bdfNumber(field) : String(field);
}).join(',');

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

export function nastranExportSettings(configInput) {
  return normalizeSorbothaneConfig(configInput).validation.nastran;
}

export function generateNastranIsolationBdf(configInput, analysisInput = null) {
  const config = normalizeSorbothaneConfig(configInput);
  const settings = config.validation.nastran;
  const modal = analysisInput?.modes ? analysisInput : solveRigidBodyModes(config);
  const verticalMode = modal.modes.find(mode => mode.dominantIndex === 2) ?? modal.modes[0];
  const referenceFrequencyHz = settings.stiffnessReferenceMode === 'custom'
    ? settings.customReferenceFrequencyHz
    : verticalMode.frequencyHz;
  const mount = mountDynamicStiffness(config, referenceFrequencyHz);
  const mass = rigidBodyMassMatrix(config);

  const plateLengthIn = config.component.dimensionsM[0] * inchPerM;
  const plateWidthIn = config.component.dimensionsM[1] * inchPerM;
  const plateZIn = config.mounts.planeZM * inchPerM;
  const cgIn = config.component.cgM.map(value => value * inchPerM);
  const mountSpacingIn = config.mounts.spacingM.map(value => value * inchPerM);
  const attachmentSpacingIn = [...settings.attachmentSpacingIn];
  const mountCoordinates = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [sx * mountSpacingIn[0] / 2, sy * mountSpacingIn[1] / 2]);
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
  if (settings.massAccounting === 'box-plus-plate') warnings.push('The CQUAD4 plate mass is added to the website component mass; NASTRAN total isolated mass is therefore greater than the browser rigid-body mass.');
  else warnings.push('The plate density is omitted so the CONM2 preserves the browser total mass; plate self-mass and free plate modes are not represented.');
  if (!isParkerLordConfig(config)) warnings.push(`Sorbothane PBUSH stiffness is frozen at ${referenceFrequencyHz.toFixed(2)} Hz; one SOL 103 property cannot reproduce the browser model's frequency-dependent modulus at every mode.`);
  if (settings.coupling === 'rbe2') warnings.push('RBE2 makes the four box attachment grids rigid relative to the CG and may increase the apparent plate stiffness.');
  const coincidentAttachmentCount = attachmentCoordinates.filter(([x, y]) => mountCoordinates.some(([mx, my]) => Math.abs(x - mx) < 1e-8 && Math.abs(y - my) < 1e-8)).length;
  if (coincidentAttachmentCount === 4) warnings.push('The box attachment footprint coincides with all four isolator grids, so the plate is largely bypassed in the rigid-body load path.');

  const lines = [
    'SOL 103',
    'CEND',
    'TITLE = STRUCTURAL ACOUSTICS UNDERSTOOD - ISOLATION SYSTEM',
    'ECHO = NONE',
    'SUBCASE 1',
    '  LABEL = ISOLATED ASSEMBLY NORMAL MODES',
    '  METHOD = 42',
    '  SPC = 1',
    '  DISPLACEMENT(PLOT) = ALL',
    '  SPCFORCES(PLOT) = ALL',
    '  MPCFORCES(PLOT) = ALL',
    'BEGIN BULK',
    comment('UNIT CONTRACT: INCH, LBF, SECOND, SLINCH. WTMASS = 1.0.'),
    comment(`1 SLINCH = ${lbmPerSlinch.toFixed(9)} LBM; G0 = ${gravityInPerSec2.toFixed(9)} IN/S^2.`),
    comment('MAT1 RHO: SLINCH/IN^3. CONM2 MASS: SLINCH. CONM2 INERTIA: SLINCH-IN^2.'),
    comment('PBUSH K1/K2/K3: LBF/IN IN BASIC X/Y/Z. PBUSH GE: DIMENSIONLESS LOSS FACTOR.'),
    comment(`SOURCE CONFIGURATION: ${config.isolator.productNumber}; ${isParkerLordConfig(config) ? 'PARKER LORD COMPLETE MOUNT' : `CAPTURED ${config.isolator.formulation === 'water-resistant' ? 'WATER-RESISTANT' : 'STANDARD'} SORBOTHANE ELEMENT`}.`),
    comment(`BROWSER RIGID-BODY MODES (HZ): ${modal.modes.map(mode => mode.frequencyHz.toFixed(4)).join(', ')}.`),
    comment(`PBUSH STIFFNESS REFERENCE FREQUENCY: ${referenceFrequencyHz.toFixed(6)} HZ (${settings.stiffnessReferenceMode}).`),
    comment(`PLATE MATERIAL: ${settings.plateMaterial.toUpperCase()}; E = ${settings.plateYoungsModulusPsi.toExponential(7)} PSI; NU = ${settings.platePoisson}; RHO = ${settings.plateDensitySlinchPerIn3.toExponential(7)} SLINCH/IN^3.`),
    comment(`MASS ACCOUNTING: ${settings.massAccounting}. BOX CONM2 = ${boxMassSlinch.toExponential(7)} SLINCH; INCLUDED PLATE = ${includedPlateMassSlinch.toExponential(7)} SLINCH.`),
    ...warnings.map(warning => comment(`WARNING: ${warning}`)),
    card('PARAM', 'WTMASS', '1.0'),
    card('PARAM', 'POST', -1),
    card('EIGRL', 42, 0, settings.maximumFrequencyHz, settings.modeCount),
    comment('PLATE MATERIAL AND SHELL PROPERTY'),
    card('MAT1', matId, settings.plateYoungsModulusPsi, '', settings.platePoisson, deckDensity ?? ''),
    card('PSHELL', pshellId, matId, settings.plateThicknessIn, matId, 1, matId, 0.833333, 0),
    comment('EQUIVALENT ISOLATOR PROPERTY: K1=X RADIAL, K2=Y RADIAL, K3=Z AXIAL.'),
    card('PBUSH', pbushId, 'K', kxLbfPerIn, kyLbfPerIn, kzLbfPerIn, 0, 0, 0),
    card('+', 'GE', lossFactor, lossFactor, lossFactor, 0, 0, 0),
    comment('PLATE GRIDS AND CQUAD4 ELEMENTS')
  ];

  grids.forEach(grid => lines.push(card('GRID', grid.id, '', grid.x, grid.y, grid.z)));
  quads.forEach(quad => lines.push(card('CQUAD4', quad.id, pshellId, ...quad.grids)));
  lines.push(comment('BOX CG, CONCENTRATED MASS, AND LOAD-DISTRIBUTION COUPLING'));
  lines.push(card('GRID', cgGridId, '', ...cgIn));
  lines.push(card('CONM2', conmId, cgGridId, 0, boxMassSlinch, 0, 0, 0));
  lines.push(card('+', inertiaSlinchIn2[0], Math.abs(inertiaSlinchIn2[3]), inertiaSlinchIn2[1], Math.abs(inertiaSlinchIn2[4]), Math.abs(inertiaSlinchIn2[5]), inertiaSlinchIn2[2]));
  if (settings.coupling === 'rbe3') {
    lines.push(...wrapContinuation('RBE3', [rbeId, '', cgGridId, 123456, 1, 123, ...attachmentGridIds.slice(0, 2)], attachmentGridIds.slice(2)));
  } else {
    lines.push(card('RBE2', rbeId, cgGridId, 123456, ...attachmentGridIds));
  }
  lines.push(comment('FOUR ZERO-LENGTH CBUSHES TO FIXED BASE GRIDS; CID=0 ALIGNS K1/K2/K3 WITH BASIC X/Y/Z.'));
  groundGrids.forEach(grid => lines.push(card('GRID', grid.id, '', grid.x, grid.y, grid.z)));
  mountGridIds.forEach((topGridId, index) => lines.push(card('CBUSH', 4001 + index, pbushId, topGridId, groundGrids[index].id, '', '', '', 0)));
  lines.push(card('SPC1', 1, 123456, ...groundGrids.map(grid => grid.id)));
  lines.push('ENDDATA');

  const deck = `${lines.join('\n')}\n`;
  const filename = `${cleanFilename(`isolation-${config.isolator.productNumber}-sol103`)}.bdf`;
  return {
    deck,
    filename,
    settings: { ...settings, attachmentSpacingIn },
    units: NASTRAN_IPS_UNITS,
    counts: {
      grids: grids.length + groundGrids.length + 1,
      cquad4: quads.length,
      cbush: 4,
      conm2: 1,
      rbe2: settings.coupling === 'rbe2' ? 1 : 0,
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
    isolators: { referenceFrequencyHz, kxLbfPerIn, kyLbfPerIn, kzLbfPerIn, lossFactor, mountGridIds, groundGridIds: groundGrids.map(grid => grid.id) },
    attachmentGridIds,
    warnings
  };
}
