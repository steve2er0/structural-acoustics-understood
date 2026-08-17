import { SORBOTHANE_CATALOG, sorbothaneCatalogItem, sorbothaneMaterial } from './sorbothane-data.js';
import { PARKER_LORD_AM_CATALOG, parkerLordCatalogItem } from './parker-lord-isolators.js';

const INCH = 0.0254;
const LB = 0.45359237;
const LBF = 4.4482216152605;
const PSI = 6894.757293168;
const G0 = 9.80665;
const TAU = 2 * Math.PI;
const DOF_NAMES = ['X translation', 'Y translation', 'Z / bounce', 'Roll', 'Pitch', 'Yaw'];
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clone = value => JSON.parse(JSON.stringify(value));
const zeros = (rows, columns = rows) => Array.from({ length: rows }, () => Array(columns).fill(0));
const identity = size => zeros(size).map((row, index) => row.map((_, column) => index === column ? 1 : 0));
const transpose = matrix => matrix[0].map((_, column) => matrix.map(row => row[column]));
const multiply = (left, right) => left.map(row => right[0].map((_, column) => row.reduce((sum, value, index) => sum + value * right[index][column], 0)));
const multiplyVector = (matrix, vector) => matrix.map(row => row.reduce((sum, value, index) => sum + value * vector[index], 0));

export const NASTRAN_PLATE_MATERIALS = Object.freeze({
  aluminum: Object.freeze({ label: 'Aluminum', youngsModulusPsi: 10.3e6, poisson: 0.33, densitySlinchPerIn3: 0.00026684 }),
  steel: Object.freeze({ label: 'Steel', youngsModulusPsi: 29e6, poisson: 0.30, densitySlinchPerIn3: 0.00073299 })
});

export const DEFAULT_SORBOTHANE_CONFIG = {
  schema: 'sau-sorbothane-isolation',
  version: 1,
  units: 'English',
  component: {
    massKg: 10 * LB,
    dimensionsM: [10 * INCH, 8 * INCH, 4 * INCH],
    cgM: [0, 0, 2 * INCH],
    inertiaMode: 'auto',
    inertiaKgM2: [0.0136, 0.0219, 0.0338, 0, 0, 0]
  },
  mounts: {
    count: 4,
    spacingM: [8.5 * INCH, 6.5 * INCH],
    planeZM: 0,
    stackTop: 1,
    stackBottom: 1
  },
  isolator: {
    kind: 'sorbothane-element',
    formulation: 'standard',
    productNumber: 'custom-ring',
    geometry: 'ring',
    odM: 1.25 * INCH,
    idM: 0.50 * INCH,
    thicknessM: 0.25 * INCH,
    durometer: 50,
    compressionPct: 15,
    preloadMode: 'compression',
    preloadN: 9.8 * LBF,
    poisson: 0.49,
    temperatureC: 23,
    extrapolation: 'log-linear',
    userModulusMPa: 2.0,
    userTanDelta: 0.65,
    modulusScale: 1,
    lossScale: 1,
    mountsPerPoint: 1,
    lordLossFactor: 0.30
  },
  environment: { accelerationG: [0, 0, 0] },
  analysis: {
    excitationAxis: 'z',
    responsePoint: 'cg',
    magnitudeScale: 'db',
    frequencyMinHz: 10,
    frequencyMaxHz: 2000,
    frequencyPoints: 181,
    modeAvoidBandHz: [10, 100],
    modeAcceptBandHz: [100, 200],
    lateralModeMinimumHz: [50, 50],
    resonanceBandHz: [100, 200],
    resonanceLimitDb: 6,
    tones: [
      { frequencyHz: 600, maximumDb: -10 },
      { frequencyHz: 1200, maximumDb: -20 },
      { frequencyHz: 1400, maximumDb: -20 }
    ]
  },
  uncertainty: {
    enabled: true,
    samples: 24,
    modulusPct: 20,
    lossPct: 20,
    massPct: 5,
    cgMm: 3,
    compressionPct: 2,
    seed: 519
  },
  validation: {
    nastran: {
      plateThicknessIn: 0.125,
      plateMaterial: 'aluminum',
      plateYoungsModulusPsi: 10.3e6,
      platePoisson: 0.33,
      plateDensitySlinchPerIn3: 0.00026684,
      meshX: 8,
      meshY: 6,
      attachmentSpacingIn: [6, 4.8],
      coupling: 'rbe3',
      massAccounting: 'box-plus-plate',
      stiffnessReferenceMode: 'vertical-mode',
      customReferenceFrequencyHz: 100,
      modeCount: 20,
      maximumFrequencyHz: 2000
    }
  }
};

export function normalizeSorbothaneConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const config = clone(DEFAULT_SORBOTHANE_CONFIG);
  for (const key of ['units', 'schema', 'version']) if (source[key] != null) config[key] = source[key];
  for (const section of ['component', 'mounts', 'isolator', 'environment', 'analysis', 'uncertainty', 'validation']) {
    config[section] = { ...config[section], ...(source[section] ?? {}) };
  }
  config.validation.nastran = { ...DEFAULT_SORBOTHANE_CONFIG.validation.nastran, ...(source.validation?.nastran ?? {}) };
  config.component.dimensionsM = [...(source.component?.dimensionsM ?? config.component.dimensionsM)].map((value, index) => Math.max(finite(value, config.component.dimensionsM[index]), 1e-6));
  config.component.cgM = [...(source.component?.cgM ?? config.component.cgM)].map((value, index) => finite(value, config.component.cgM[index]));
  config.component.inertiaKgM2 = [...(source.component?.inertiaKgM2 ?? config.component.inertiaKgM2)].map((value, index) => finite(value, config.component.inertiaKgM2[index]));
  config.component.massKg = Math.max(finite(config.component.massKg, DEFAULT_SORBOTHANE_CONFIG.component.massKg), 1e-6);
  config.mounts.spacingM = [...(source.mounts?.spacingM ?? config.mounts.spacingM)].map((value, index) => Math.max(finite(value, config.mounts.spacingM[index]), 1e-5));
  config.mounts.stackTop = Math.max(1, Math.round(finite(config.mounts.stackTop, 1)));
  config.mounts.stackBottom = Math.max(1, Math.round(finite(config.mounts.stackBottom, 1)));
  if (!['sorbothane-element', 'parker-lord-am'].includes(config.isolator.kind)) config.isolator.kind = 'sorbothane-element';
  if (!['standard', 'water-resistant'].includes(config.isolator.formulation)) config.isolator.formulation = 'standard';
  config.isolator.odM = Math.max(finite(config.isolator.odM, DEFAULT_SORBOTHANE_CONFIG.isolator.odM), 1e-5);
  config.isolator.idM = clamp(finite(config.isolator.idM, DEFAULT_SORBOTHANE_CONFIG.isolator.idM), 0, config.isolator.odM * 0.99);
  config.isolator.thicknessM = Math.max(finite(config.isolator.thicknessM, DEFAULT_SORBOTHANE_CONFIG.isolator.thicknessM), 1e-5);
  config.isolator.durometer = clamp(finite(config.isolator.durometer, 50), 30, 70);
  config.isolator.compressionPct = clamp(finite(config.isolator.compressionPct, 15), 1, 30);
  config.isolator.poisson = clamp(finite(config.isolator.poisson, 0.49), 0, 0.4995);
  config.isolator.modulusScale = clamp(finite(config.isolator.modulusScale, 1), 0.05, 20);
  config.isolator.lossScale = clamp(finite(config.isolator.lossScale, 1), 0.05, 20);
  config.isolator.mountsPerPoint = clamp(Math.round(finite(config.isolator.mountsPerPoint, 1)), 1, 2);
  config.isolator.lordLossFactor = clamp(finite(config.isolator.lordLossFactor, 0.30), 0.01, 1);
  config.environment.accelerationG = [...(source.environment?.accelerationG ?? config.environment.accelerationG)].map((value, index) => finite(value, config.environment.accelerationG[index]));
  config.analysis.frequencyPoints = clamp(Math.round(finite(config.analysis.frequencyPoints, 181)), 41, 501);
  if (!['cg', 'corner-positive', 'corner-negative'].includes(config.analysis.responsePoint)) config.analysis.responsePoint = 'cg';
  const lateralModeMinimumHz = source.analysis?.lateralModeMinimumHz ?? config.analysis.lateralModeMinimumHz;
  config.analysis.lateralModeMinimumHz = [0, 1].map(index => Math.max(finite(lateralModeMinimumHz[index], config.analysis.lateralModeMinimumHz[index]), 0.1));
  config.analysis.tones = (source.analysis?.tones ?? config.analysis.tones).map(tone => ({ frequencyHz: Math.max(finite(tone.frequencyHz, 600), 0.1), maximumDb: finite(tone.maximumDb, -10) }));
  const nastran = config.validation.nastran;
  nastran.plateThicknessIn = clamp(finite(nastran.plateThicknessIn, 0.125), 0.005, 5);
  if (!NASTRAN_PLATE_MATERIALS[nastran.plateMaterial]) nastran.plateMaterial = 'aluminum';
  const plateMaterial = NASTRAN_PLATE_MATERIALS[nastran.plateMaterial];
  nastran.plateYoungsModulusPsi = plateMaterial.youngsModulusPsi;
  nastran.platePoisson = plateMaterial.poisson;
  nastran.plateDensitySlinchPerIn3 = plateMaterial.densitySlinchPerIn3;
  nastran.meshX = clamp(Math.round(finite(nastran.meshX, 8)), 2, 40);
  nastran.meshY = clamp(Math.round(finite(nastran.meshY, 6)), 2, 40);
  const componentLengthIn = config.component.dimensionsM[0] / INCH;
  const componentWidthIn = config.component.dimensionsM[1] / INCH;
  const attachment = source.validation?.nastran?.attachmentSpacingIn ?? nastran.attachmentSpacingIn;
  nastran.attachmentSpacingIn = [
    clamp(finite(attachment?.[0], componentLengthIn * 0.6), Math.min(0.01, componentLengthIn * 0.1), componentLengthIn * 0.98),
    clamp(finite(attachment?.[1], componentWidthIn * 0.6), Math.min(0.01, componentWidthIn * 0.1), componentWidthIn * 0.98)
  ];
  if (!['rbe3', 'rbe2'].includes(nastran.coupling)) nastran.coupling = 'rbe3';
  if (!['box-plus-plate', 'preserve-browser'].includes(nastran.massAccounting)) nastran.massAccounting = 'box-plus-plate';
  if (!['vertical-mode', 'custom'].includes(nastran.stiffnessReferenceMode)) nastran.stiffnessReferenceMode = 'vertical-mode';
  nastran.customReferenceFrequencyHz = clamp(finite(nastran.customReferenceFrequencyHz, 100), 0.1, 1e5);
  nastran.modeCount = clamp(Math.round(finite(nastran.modeCount, 20)), 6, 200);
  nastran.maximumFrequencyHz = clamp(finite(nastran.maximumFrequencyHz, config.analysis.frequencyMaxHz), 1, 1e6);
  return config;
}

export function isParkerLordConfig(configInput) {
  return configInput?.isolator?.kind === 'parker-lord-am';
}

function bracket(values, target) {
  if (target <= values[0]) return [0, 0, 0];
  const last = values.length - 1;
  if (target >= values[last]) return [last, last, 0];
  for (let index = 0; index < last; index += 1) {
    if (target <= values[index + 1]) return [index, index + 1, (target - values[index]) / (values[index + 1] - values[index])];
  }
  return [last, last, 0];
}

function interpolateLinear(x, xs, ys) {
  const [left, right, mix] = bracket(xs, x);
  return ys[left] + mix * (ys[right] - ys[left]);
}

function interpolateLog(x, xs, ys) {
  const logs = xs.map(value => Math.log(value));
  const [left, right, mix] = bracket(logs, Math.log(Math.max(x, xs[0])));
  if (left === right) return ys[left];
  return Math.exp(Math.log(ys[left]) + mix * (Math.log(ys[right]) - Math.log(ys[left])));
}

function materialCurveAtDurometer(table, durometer, compression) {
  const durometers = [30, 50, 70];
  const compressions = [10, 15, 20];
  const [d0, d1, dm] = bracket(durometers, durometer);
  const [c0, c1, cm] = bracket(compressions, compression);
  const low0 = table[durometers[d0]][compressions[c0]];
  const low1 = table[durometers[d0]][compressions[c1]];
  const high0 = table[durometers[d1]][compressions[c0]];
  const high1 = table[durometers[d1]][compressions[c1]];
  return low0.map((_, index) => {
    const low = low0[index] + cm * (low1[index] - low0[index]);
    const high = high0[index] + cm * (high1[index] - high0[index]);
    return low + dm * (high - low);
  });
}

function tanCurveAtDurometer(material, durometer) {
  const durometers = [30, 50, 70];
  const [left, right, mix] = bracket(durometers, durometer);
  const low = material.tanDelta[durometers[left]];
  const high = material.tanDelta[durometers[right]];
  return low.map((value, index) => value + mix * (high[index] - value));
}

function logLinearExtrapolate(frequency, frequencies, values) {
  const count = 4;
  const xs = frequencies.slice(-count).map(Math.log);
  const ys = values.slice(-count).map(Math.log);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / count;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / count;
  const slope = xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0) / xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  return Math.exp(meanY + slope * (Math.log(frequency) - meanX));
}

export function sorbothaneDynamicProperties(configInput, frequencyHz) {
  const config = normalizeSorbothaneConfig(configInput);
  const { isolator } = config;
  const material = sorbothaneMaterial(isolator.formulation);
  const frequencies = material.frequencyHz;
  const startingCompressionPct = isolator.preloadMode === 'preload'
    ? compressionForPreload(config, Math.max(isolator.preloadN, 0))
    : isolator.compressionPct;
  const modulusCurve = materialCurveAtDurometer(material.dynamicYoungsModulusPsi, isolator.durometer, clamp(startingCompressionPct, 10, 20));
  const tanCurve = tanCurveAtDurometer(material, isolator.durometer);
  let modulusPsi;
  let tanDelta;
  let provenance;
  if (isolator.extrapolation === 'user') {
    modulusPsi = Math.max(isolator.userModulusMPa * 1e6 / PSI, 1e-3);
    tanDelta = Math.max(isolator.userTanDelta, 0);
    provenance = 'engineering-assumption';
  } else if (frequencyHz <= frequencies.at(-1)) {
    modulusPsi = interpolateLog(frequencyHz, frequencies, modulusCurve);
    tanDelta = interpolateLinear(frequencyHz, frequencies, tanCurve);
    const exactIndex = frequencies.indexOf(frequencyHz);
    if (exactIndex >= 0) provenance = material.provenance[exactIndex];
    else provenance = material.publishedTableMaxHz > 0 && frequencyHz <= material.publishedTableMaxHz ? 'manufacturer-interpolated' : 'manufacturer-digitized-interpolated';
  } else if (isolator.extrapolation === 'log-linear') {
    modulusPsi = logLinearExtrapolate(frequencyHz, frequencies, modulusCurve);
    tanDelta = tanCurve.at(-1);
    provenance = 'engineering-extrapolation-log-linear';
  } else {
    modulusPsi = modulusCurve.at(-1);
    tanDelta = tanCurve.at(-1);
    provenance = isolator.extrapolation === 'constant-complex' ? 'engineering-assumption-constant-complex' : 'engineering-extrapolation-hold';
  }
  modulusPsi *= isolator.modulusScale;
  tanDelta *= isolator.lossScale;
  const storagePa = modulusPsi * PSI;
  return {
    frequencyHz,
    storageModulusPa: storagePa,
    storageModulusPsi: modulusPsi,
    lossModulusPa: storagePa * tanDelta,
    tanDelta,
    formulation: material.formulation,
    formulationLabel: material.label,
    startingCompressionPct,
    provenance,
    supported: frequencyHz <= material.digitizedCurveMaxHz
  };
}

export function isolatorDynamicProperties(configInput, frequencyHz) {
  const config = normalizeSorbothaneConfig(configInput);
  if (!isParkerLordConfig(config)) return sorbothaneDynamicProperties(config, frequencyHz);
  const item = parkerLordCatalogItem(config.isolator.productNumber);
  const tanDelta = config.isolator.lordLossFactor * config.isolator.lossScale;
  return {
    frequencyHz,
    storageModulusPa: config.isolator.modulusScale,
    storageModulusPsi: null,
    lossModulusPa: config.isolator.modulusScale * tanDelta,
    tanDelta,
    provenance: item.lossFactorProvenance,
    supported: true,
    model: 'catalog-dynamic-spring-rate',
    productNumber: item.productNumber
  };
}

export function isolatorGeometry(configInput) {
  const config = normalizeSorbothaneConfig(configInput);
  if (isParkerLordConfig(config)) {
    const item = parkerLordCatalogItem(config.isolator.productNumber);
    return {
      geometry: 'complete-mount',
      loadedAreaM2: null,
      loadedAreaIn2: null,
      freeBulgeAreaM2: null,
      effectiveAreaM2: null,
      shapeFactor: NaN,
      shapeCorrection: 1,
      envelopeIn: { ...item.envelopeIn },
      equation: 'Published complete-mount dynamic spring rates; no bulk-pad shape-factor correction.'
    };
  }
  const { odM, idM, thicknessM, geometry } = config.isolator;
  const loadedAreaM2 = Math.PI * (odM ** 2 - (geometry === 'disc' ? 0 : idM ** 2)) / 4;
  const freeBulgeAreaM2 = geometry === 'disc'
    ? Math.PI * odM * thicknessM
    : Math.PI * (odM + idM) * thicknessM;
  const shapeFactor = loadedAreaM2 / Math.max(freeBulgeAreaM2, 1e-15);
  return {
    geometry,
    loadedAreaM2,
    loadedAreaIn2: loadedAreaM2 / (INCH ** 2),
    freeBulgeAreaM2,
    effectiveAreaM2: loadedAreaM2,
    shapeFactor,
    shapeCorrection: 1 + 2 * shapeFactor ** 2,
    equation: geometry === 'disc' ? 'SF = OD / (4t)' : 'SF = (OD - ID) / (4t)'
  };
}

function stressAtCompression(config, compressionPct) {
  const material = sorbothaneMaterial(config.isolator.formulation);
  const durometers = Object.keys(material.staticCompressiveStressPsi).map(Number).sort((a, b) => a - b);
  const [left, right, mix] = bracket(durometers, config.isolator.durometer);
  const stress = durometer => {
    const table = material.staticCompressiveStressPsi[durometer];
    if (compressionPct <= 10) return table[10] * compressionPct / 10;
    const compressions = Object.keys(table).map(Number).sort((a, b) => a - b);
    const [c0, c1, cm] = bracket(compressions, clamp(compressionPct, 10, 20));
    return table[compressions[c0]] + cm * (table[compressions[c1]] - table[compressions[c0]]);
  };
  return stress(durometers[left]) + mix * (stress(durometers[right]) - stress(durometers[left]));
}

function compressionForPreload(config, preloadN) {
  const geometry = isolatorGeometry(config);
  let low = 0;
  let high = 20;
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const middle = (low + high) / 2;
    const force = stressAtCompression(config, middle) * PSI * geometry.loadedAreaM2 * geometry.shapeCorrection;
    if (force < preloadN) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

function mountPositions(config) {
  const [spacingX, spacingY] = config.mounts.spacingM;
  const [cgX, cgY, cgZ] = config.component.cgM;
  const plane = config.mounts.planeZM;
  return [
    [-spacingX / 2 - cgX, -spacingY / 2 - cgY, plane - cgZ],
    [ spacingX / 2 - cgX, -spacingY / 2 - cgY, plane - cgZ],
    [ spacingX / 2 - cgX,  spacingY / 2 - cgY, plane - cgZ],
    [-spacingX / 2 - cgX,  spacingY / 2 - cgY, plane - cgZ]
  ];
}

function inverse(matrix) {
  const size = matrix.length;
  const augmented = matrix.map((row, index) => [...row, ...identity(size)[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    if (Math.abs(augmented[pivot][column]) < 1e-18) throw new Error('Matrix is singular. Check mass, inertia, and mount geometry.');
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    augmented[column] = augmented[column].map(value => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index]);
    }
  }
  return augmented.map(row => row.slice(size));
}

function leastNormVerticalLoads(positions, targets) {
  const A = [positions.map(() => 1), positions.map(position => position[1]), positions.map(position => position[0])];
  const AAT = multiply(A, transpose(A));
  return multiplyVector(multiply(transpose(A), inverse(AAT)), targets);
}

export function staticPreloadState(configInput) {
  const config = normalizeSorbothaneConfig(configInput);
  if (isParkerLordConfig(config)) {
    const positions = mountPositions(config);
    const [ax, ay, az] = config.environment.accelerationG;
    const forceX = config.component.massKg * ax * G0;
    const forceY = config.component.massKg * ay * G0;
    const forceZ = config.component.massKg * (1 + az) * G0;
    const averagePlaneOffset = positions.reduce((sum, position) => sum + position[2], 0) / positions.length;
    const payloadContributionsN = leastNormVerticalLoads(positions, [forceZ, averagePlaneOffset * forceY, averagePlaneOffset * forceX]);
    const item = parkerLordCatalogItem(config.isolator.productNumber);
    const capacityN = item.ratedLoadLb * LBF * config.isolator.mountsPerPoint;
    const lateralXPerPointN = forceX / positions.length;
    const lateralYPerPointN = forceY / positions.length;
    const mounts = positions.map((position, index) => {
      const payloadN = payloadContributionsN[index];
      const resultantLoadN = Math.hypot(payloadN, lateralXPerPointN, lateralYPerPointN);
      const flags = resultantLoadN > capacityN * (1 + 1e-9) ? ['outside catalog rated load'] : [];
      return {
        index: index + 1,
        positionM: position,
        payloadN,
        upperLoadN: payloadN,
        lowerLoadN: payloadN,
        lateralLoadN: Math.hypot(lateralXPerPointN, lateralYPerPointN),
        resultantLoadN,
        ratedLoadN: capacityN,
        flags
      };
    });
    return {
      compressionPct: NaN,
      freeThicknessM: item.envelopeIn.height * INCH * config.isolator.mountsPerPoint,
      compressedThicknessM: null,
      preloadN: 0,
      preloadProvenance: 'complete bonded mount; no captured-pad preload calculation',
      payloadContributionsN,
      mounts,
      allEngaged: true,
      catalogCompliant: mounts.every(mount => mount.resultantLoadN <= capacityN * (1 + 1e-9)),
      compressionCompliant: true,
      recommendedCompressionPct: null,
      ratedLoadN: [0, capacityN],
      capacityPerPointN: capacityN,
      mountsPerPoint: config.isolator.mountsPerPoint
    };
  }
  const geometry = isolatorGeometry(config);
  let compressionPct = config.isolator.compressionPct;
  let preloadN;
  let preloadProvenance;
  if (config.isolator.preloadMode === 'preload') {
    preloadN = Math.max(config.isolator.preloadN, 0);
    compressionPct = compressionForPreload(config, preloadN);
    preloadProvenance = 'calculated from specified preload and manufacturer static stress';
  } else {
    const stressPa = stressAtCompression(config, compressionPct) * PSI;
    preloadN = stressPa * geometry.loadedAreaM2 * geometry.shapeCorrection;
    preloadProvenance = [10, 15, 20].includes(compressionPct)
      ? 'calculated from the selected manufacturer static-stress curve'
      : 'calculated by interpolating the selected manufacturer static-stress curves';
  }
  const positions = mountPositions(config);
  const [ax, ay, az] = config.environment.accelerationG;
  const forceX = config.component.massKg * ax * G0;
  const forceY = config.component.massKg * ay * G0;
  const forceZ = config.component.massKg * (1 + az) * G0;
  const averagePlaneOffset = positions.reduce((sum, position) => sum + position[2], 0) / positions.length;
  const payloadContributionsN = leastNormVerticalLoads(positions, [forceZ, averagePlaneOffset * forceY, averagePlaneOffset * forceX]);
  const catalog = sorbothaneCatalogItem(config.isolator.productNumber);
  const ratedN = catalog.ratedLoadLb?.map(value => value * LBF) ?? null;
  const recommendedCompressionPct = catalog.recommendedCompressionPct ?? [10, 20];
  const mounts = positions.map((position, index) => {
    const payloadN = payloadContributionsN[index];
    const lowerLoadN = preloadN + payloadN / 2;
    const upperLoadN = preloadN - payloadN / 2;
    const flags = [];
    if (upperLoadN <= 0) flags.push('upper element unloaded');
    if (lowerLoadN <= 0) flags.push('lower element unloaded');
    if (ratedN && (lowerLoadN < ratedN[0] || lowerLoadN > ratedN[1] || upperLoadN < ratedN[0] || upperLoadN > ratedN[1])) flags.push('outside catalog rated load');
    if (compressionPct > 20) flags.push('compression exceeds manufacturer continuous-load recommendation');
    return { index: index + 1, positionM: position, payloadN, upperLoadN, lowerLoadN, flags };
  });
  return {
    compressionPct,
    freeThicknessM: config.isolator.thicknessM * Math.max(config.mounts.stackTop, config.mounts.stackBottom),
    compressedThicknessM: config.isolator.thicknessM * (1 - compressionPct / 100) * Math.max(config.mounts.stackTop, config.mounts.stackBottom),
    preloadN,
    preloadProvenance,
    payloadContributionsN,
    mounts,
    allEngaged: mounts.every(mount => mount.upperLoadN > 0 && mount.lowerLoadN > 0),
    catalogCompliant: !ratedN || mounts.every(mount => mount.flags.every(flag => flag !== 'outside catalog rated load')),
    compressionCompliant: compressionPct >= recommendedCompressionPct[0] && compressionPct <= recommendedCompressionPct[1],
    recommendedCompressionPct,
    ratedLoadN: ratedN
  };
}

export function rigidBodyMassMatrix(configInput) {
  const config = normalizeSorbothaneConfig(configInput);
  const mass = config.component.massKg;
  const [length, width, height] = config.component.dimensionsM;
  let inertia;
  if (config.component.inertiaMode === 'manual') inertia = [...config.component.inertiaKgM2];
  else inertia = [
    mass * (width ** 2 + height ** 2) / 12,
    mass * (length ** 2 + height ** 2) / 12,
    mass * (length ** 2 + width ** 2) / 12,
    0, 0, 0
  ];
  const [ixx, iyy, izz, ixy, ixz, iyz] = inertia;
  const matrix = zeros(6);
  matrix[0][0] = matrix[1][1] = matrix[2][2] = mass;
  matrix[3][3] = ixx;
  matrix[4][4] = iyy;
  matrix[5][5] = izz;
  matrix[3][4] = matrix[4][3] = -ixy;
  matrix[3][5] = matrix[5][3] = -ixz;
  matrix[4][5] = matrix[5][4] = -iyz;
  return { matrix, inertiaKgM2: inertia };
}

function mountKinematics(position) {
  const [x, y, z] = position;
  return [
    [1, 0, 0, 0, z, -y],
    [0, 1, 0, -z, 0, x],
    [0, 0, 1, y, -x, 0]
  ];
}

export function mountDynamicStiffness(configInput, frequencyHz) {
  const config = normalizeSorbothaneConfig(configInput);
  if (isParkerLordConfig(config)) {
    const item = parkerLordCatalogItem(config.isolator.productNumber);
    const material = isolatorDynamicProperties(config, frequencyHz);
    const parallelFactor = config.isolator.mountsPerPoint * config.isolator.modulusScale;
    const axialNPerM = item.dynamicAxialSpringRateLbPerIn * LBF / INCH * parallelFactor;
    const radialNPerM = item.dynamicRadialSpringRateLbPerIn * LBF / INCH * parallelFactor;
    return {
      kxNPerM: radialNPerM,
      kyNPerM: radialNPerM,
      kzNPerM: axialNPerM,
      singleCompressionNPerM: item.dynamicAxialSpringRateLbPerIn * LBF / INCH,
      singleShearNPerM: item.dynamicRadialSpringRateLbPerIn * LBF / INCH,
      material,
      geometry: isolatorGeometry(config),
      seriesFactor: parallelFactor,
      mountItem: item,
      sandwichRule: config.isolator.mountsPerPoint === 2
        ? 'Two complete AM mounts are installed back-to-back at each support point; catalog capacity and spring rate are doubled.'
        : 'One complete AM mount is installed at each of the four support points.'
    };
  }
  const geometry = isolatorGeometry(config);
  const material = sorbothaneDynamicProperties(config, frequencyHz);
  const singleCompression = material.storageModulusPa * geometry.shapeCorrection * geometry.loadedAreaM2 / config.isolator.thicknessM;
  const shearModulusPa = material.storageModulusPa / (2 * (1 + config.isolator.poisson));
  const singleShear = shearModulusPa * geometry.loadedAreaM2 / config.isolator.thicknessM;
  const seriesFactor = 1 / config.mounts.stackTop + 1 / config.mounts.stackBottom;
  return {
    kxNPerM: singleShear * seriesFactor,
    kyNPerM: singleShear * seriesFactor,
    kzNPerM: singleCompression * seriesFactor,
    singleCompressionNPerM: singleCompression,
    singleShearNPerM: singleShear,
    material,
    geometry,
    seriesFactor,
    sandwichRule: 'Upper and lower stacks act in parallel for incremental plate motion; elements within each stack act in series.'
  };
}

export function assembleRigidBodyStiffness(configInput, frequencyHz) {
  const config = normalizeSorbothaneConfig(configInput);
  const positions = mountPositions(config);
  const mount = mountDynamicStiffness(config, frequencyHz);
  const local = [[mount.kxNPerM, 0, 0], [0, mount.kyNPerM, 0], [0, 0, mount.kzNPerM]];
  const matrix = zeros(6);
  for (const position of positions) {
    const B = mountKinematics(position);
    const contribution = multiply(transpose(B), multiply(local, B));
    for (let row = 0; row < 6; row += 1) for (let column = 0; column < 6; column += 1) matrix[row][column] += contribution[row][column];
  }
  return { matrix, positions, mount };
}

function cholesky(matrix) {
  const size = matrix.length;
  const lower = zeros(size);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let sum = matrix[row][column];
      for (let index = 0; index < column; index += 1) sum -= lower[row][index] * lower[column][index];
      if (row === column) {
        if (sum <= 0) throw new Error('Mass/inertia matrix is not positive definite. Check manual products of inertia.');
        lower[row][column] = Math.sqrt(sum);
      } else lower[row][column] = sum / lower[column][column];
    }
  }
  return lower;
}

function jacobiEigen(matrix) {
  const size = matrix.length;
  const values = matrix.map(row => [...row]);
  const vectors = identity(size);
  for (let iteration = 0; iteration < 160; iteration += 1) {
    let p = 0;
    let q = 1;
    let maximum = 0;
    for (let row = 0; row < size; row += 1) for (let column = row + 1; column < size; column += 1) {
      if (Math.abs(values[row][column]) > maximum) { maximum = Math.abs(values[row][column]); p = row; q = column; }
    }
    if (maximum < 1e-10) break;
    const angle = 0.5 * Math.atan2(2 * values[p][q], values[q][q] - values[p][p]);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    for (let index = 0; index < size; index += 1) {
      const aip = values[index][p];
      const aiq = values[index][q];
      values[index][p] = cosine * aip - sine * aiq;
      values[index][q] = sine * aip + cosine * aiq;
    }
    for (let index = 0; index < size; index += 1) {
      const api = values[p][index];
      const aqi = values[q][index];
      values[p][index] = cosine * api - sine * aqi;
      values[q][index] = sine * api + cosine * aqi;
    }
    values[p][q] = values[q][p] = 0;
    for (let index = 0; index < size; index += 1) {
      const vip = vectors[index][p];
      const viq = vectors[index][q];
      vectors[index][p] = cosine * vip - sine * viq;
      vectors[index][q] = sine * vip + cosine * viq;
    }
  }
  return { values: values.map((row, index) => row[index]), vectors };
}

function generalizedModes(mass, stiffness) {
  const lower = cholesky(mass);
  const inverseLower = inverse(lower);
  const transformed = multiply(inverseLower, multiply(stiffness, transpose(inverseLower)));
  const eigen = jacobiEigen(transformed);
  const physicalVectors = multiply(transpose(inverseLower), eigen.vectors);
  return eigen.values.map((value, index) => ({
    eigenvalue: Math.max(value, 0),
    vector: physicalVectors.map(row => row[index])
  })).sort((left, right) => left.eigenvalue - right.eigenvalue);
}

function classifyMode(vector, config) {
  const lengthScale = Math.sqrt(config.component.dimensionsM[0] * config.component.dimensionsM[1]);
  const scaled = vector.map((value, index) => Math.abs(value) * (index < 3 ? 1 : lengthScale));
  const total = scaled.reduce((sum, value) => sum + value ** 2, 0) || 1;
  const participation = scaled.map(value => 100 * value ** 2 / total);
  const order = participation.map((value, index) => ({ index, value })).sort((a, b) => b.value - a.value);
  return {
    dominant: DOF_NAMES[order[0].index],
    secondary: DOF_NAMES[order[1].index],
    participation,
    dominantIndex: order[0].index,
    secondaryIndex: order[1].index
  };
}

export function solveRigidBodyModes(configInput) {
  const config = normalizeSorbothaneConfig(configInput);
  const mass = rigidBodyMassMatrix(config);
  let frequencies = Array(6).fill(100);
  let modal = [];
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const referenceFrequency = Math.exp(frequencies.reduce((sum, value) => sum + Math.log(Math.max(value, 1)), 0) / frequencies.length);
    const stiffness = assembleRigidBodyStiffness(config, referenceFrequency);
    modal = generalizedModes(mass.matrix, stiffness.matrix);
    const referenceModulus = stiffness.mount.material.storageModulusPa;
    const next = modal.map((mode, index) => {
      let frequency = Math.sqrt(mode.eigenvalue) / TAU;
      for (let inner = 0; inner < 12; inner += 1) {
        const property = isolatorDynamicProperties(config, Math.max(frequency, 1));
        const candidate = Math.sqrt(mode.eigenvalue * property.storageModulusPa / referenceModulus) / TAU;
        if (Math.abs(candidate - frequency) < 0.01) { frequency = candidate; break; }
        frequency = 0.55 * frequency + 0.45 * candidate;
      }
      return Math.max(frequency, 0);
    });
    if (Math.max(...next.map((value, index) => Math.abs(value - frequencies[index]))) < 0.02) { frequencies = next; break; }
    frequencies = next;
  }
  const modes = modal.map((mode, index) => {
    const classification = classifyMode(mode.vector, config);
    const property = isolatorDynamicProperties(config, frequencies[index]);
    const lengthScale = Math.sqrt(config.component.dimensionsM[0] * config.component.dimensionsM[1]);
    const maximum = Math.max(...mode.vector.map((value, dof) => Math.abs(value) * (dof < 3 ? 1 : lengthScale))) || 1;
    const normalizedVector = mode.vector.map((value, dof) => value * (dof < 3 ? 1 : lengthScale) / maximum);
    return {
      number: index + 1,
      frequencyHz: frequencies[index],
      vector: normalizedVector,
      dampingRatio: property.tanDelta / 2,
      lossFactor: property.tanDelta,
      materialProvenance: property.provenance,
      ...classification
    };
  });
  return { modes, massMatrix: mass.matrix, inertiaKgM2: mass.inertiaKgM2 };
}

function modeWithMostParticipation(modes, dofIndex) {
  return modes.reduce((best, mode) => mode.participation[dofIndex] > best.participation[dofIndex] ? mode : best, modes[0]);
}

function lateralTranslationModeResults(modes, config) {
  return ['X', 'Y'].map((axis, dofIndex) => {
    const mode = modeWithMostParticipation(modes, dofIndex);
    const minimumHz = config.analysis.lateralModeMinimumHz[dofIndex];
    return {
      axis,
      dofIndex,
      modeNumber: mode.number,
      modeLabel: mode.dominant,
      frequencyHz: mode.frequencyHz,
      participationPct: mode.participation[dofIndex],
      minimumHz,
      pass: mode.frequencyHz >= minimumHz
    };
  });
}

function verticalTranslationModeResult(modes, config) {
  const mode = modeWithMostParticipation(modes, 2);
  const rangeHz = [...config.analysis.modeAcceptBandHz];
  return {
    axis: 'Z',
    dofIndex: 2,
    modeNumber: mode.number,
    modeLabel: mode.dominant,
    frequencyHz: mode.frequencyHz,
    participationPct: mode.participation[2],
    rangeHz,
    pass: mode.frequencyHz >= rangeHz[0] && mode.frequencyHz <= rangeHz[1]
  };
}

const complex = (re = 0, im = 0) => ({ re, im });
const cAdd = (a, b) => complex(a.re + b.re, a.im + b.im);
const cSub = (a, b) => complex(a.re - b.re, a.im - b.im);
const cMul = (a, b) => complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cDiv = (a, b) => { const denominator = b.re ** 2 + b.im ** 2; return complex((a.re * b.re + a.im * b.im) / denominator, (a.im * b.re - a.re * b.im) / denominator); };
const cAbs = value => Math.hypot(value.re, value.im);
const cPhase = value => Math.atan2(value.im, value.re) * 180 / Math.PI;

function solveComplex(matrixInput, vectorInput) {
  const size = matrixInput.length;
  const matrix = matrixInput.map((row, index) => [...row.map(value => complex(value.re, value.im)), complex(vectorInput[index].re, vectorInput[index].im)]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (cAbs(matrix[row][column]) > cAbs(matrix[pivot][column])) pivot = row;
    if (cAbs(matrix[pivot][column]) < 1e-20) throw new Error('Dynamic stiffness matrix is singular at the requested frequency.');
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];
    matrix[column] = matrix[column].map(value => cDiv(value, divisor));
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = matrix[row][column];
      matrix[row] = matrix[row].map((value, index) => cSub(value, cMul(factor, matrix[column][index])));
    }
  }
  return matrix.map(row => row[size]);
}

function responsePointVector(config) {
  if (config.analysis.responsePoint === 'cg') return [0, 0, 0];
  const [length, width, height] = config.component.dimensionsM;
  const [cgX, cgY, cgZ] = config.component.cgM;
  const signs = config.analysis.responsePoint === 'corner-negative' ? [-1, -1] : [1, 1];
  return [signs[0] * length / 2 - cgX, signs[1] * width / 2 - cgY, height - cgZ];
}

export function rigidBodyResponseAtFrequency(configInput, frequencyHz, axis = null) {
  const config = normalizeSorbothaneConfig(configInput);
  const excitationAxis = axis ?? config.analysis.excitationAxis;
  const axisIndex = { x: 0, y: 1, z: 2 }[excitationAxis] ?? 2;
  const omega = TAU * frequencyHz;
  const mass = rigidBodyMassMatrix(config).matrix;
  const stiffness = assembleRigidBodyStiffness(config, frequencyHz);
  const eta = stiffness.mount.material.tanDelta;
  const dynamic = zeros(6).map((row, i) => row.map((_, j) => complex(stiffness.matrix[i][j] - omega ** 2 * mass[i][j], stiffness.matrix[i][j] * eta)));
  const gamma = Array(6).fill(0);
  gamma[axisIndex] = 1;
  const forcing = multiplyVector(mass, gamma).map(value => complex(omega ** 2 * value, 0));
  const relative = solveComplex(dynamic, forcing);
  const absolute = relative.map((value, index) => cAdd(value, complex(gamma[index], 0)));
  const point = responsePointVector(config);
  const [px, py, pz] = point;
  const pointMotion = [
    cAdd(absolute[0], cAdd(cMul(absolute[4], complex(pz, 0)), cMul(absolute[5], complex(-py, 0)))),
    cAdd(absolute[1], cAdd(cMul(absolute[3], complex(-pz, 0)), cMul(absolute[5], complex(px, 0)))),
    cAdd(absolute[2], cAdd(cMul(absolute[3], complex(py, 0)), cMul(absolute[4], complex(-px, 0))))
  ];
  const output = [...pointMotion, ...absolute.slice(3)];
  return {
    frequencyHz,
    axis: excitationAxis,
    complex: output,
    magnitude: output.map(cAbs),
    db: output.map(value => 20 * Math.log10(Math.max(cAbs(value), 1e-12))),
    phaseDeg: output.map(cPhase),
    property: stiffness.mount.material
  };
}

function logspace(minimum, maximum, count) {
  const start = Math.log10(minimum);
  const end = Math.log10(maximum);
  return Array.from({ length: count }, (_, index) => 10 ** (start + index * (end - start) / (count - 1)));
}

export function frequencyResponse(configInput, axis = null) {
  const config = normalizeSorbothaneConfig(configInput);
  const excitationAxis = axis ?? config.analysis.excitationAxis;
  const frequencies = logspace(config.analysis.frequencyMinHz, config.analysis.frequencyMaxHz, config.analysis.frequencyPoints);
  const responses = frequencies.map(frequency => rigidBodyResponseAtFrequency(config, frequency, excitationAxis));
  return {
    axis: excitationAxis,
    frequencies,
    magnitude: Array.from({ length: 6 }, (_, dof) => responses.map(response => response.magnitude[dof])),
    db: Array.from({ length: 6 }, (_, dof) => responses.map(response => response.db[dof])),
    phaseDeg: Array.from({ length: 6 }, (_, dof) => responses.map(response => response.phaseDeg[dof])),
    supported: responses.map(response => response.property.supported)
  };
}

function peakDirectResponse(config, minimumHz, maximumHz, axis) {
  const axisIndex = { x: 0, y: 1, z: 2 }[axis] ?? 2;
  const frequencies = logspace(minimumHz, maximumHz, 121);
  let peak = { axis: axis.toUpperCase(), frequencyHz: minimumHz, magnitude: 0, db: -Infinity };
  for (const frequency of frequencies) {
    const response = rigidBodyResponseAtFrequency(config, frequency, axis);
    if (response.magnitude[axisIndex] > peak.magnitude) peak = { axis: axis.toUpperCase(), frequencyHz: frequency, magnitude: response.magnitude[axisIndex], db: response.db[axisIndex] };
  }
  return peak;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normalRandom(random) {
  const u = Math.max(random(), 1e-12);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

function percentile(values, probability) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp((sorted.length - 1) * probability, 0, sorted.length - 1);
  const left = Math.floor(index);
  const right = Math.ceil(index);
  return sorted[left] + (index - left) * (sorted[right] - sorted[left]);
}

export function uncertaintyEnvelope(configInput, nominalResponses = null) {
  const config = normalizeSorbothaneConfig(configInput);
  if (!config.uncertainty.enabled) return null;
  const axes = ['x', 'y', 'z'];
  const nominal = nominalResponses ?? Object.fromEntries(axes.map(axis => [axis, frequencyResponse(config, axis)]));
  const random = seededRandom(config.uncertainty.seed);
  const samples = [];
  const count = clamp(config.uncertainty.samples, 8, 80);
  for (let index = 0; index < count; index += 1) {
    const sample = clone(config);
    sample.uncertainty.enabled = false;
    sample.isolator.modulusScale *= clamp(1 + normalRandom(random) * config.uncertainty.modulusPct / 200, 0.35, 2);
    sample.isolator.lossScale *= clamp(1 + normalRandom(random) * config.uncertainty.lossPct / 200, 0.35, 2);
    sample.component.massKg *= clamp(1 + normalRandom(random) * config.uncertainty.massPct / 200, 0.5, 1.5);
    sample.component.cgM[0] += normalRandom(random) * config.uncertainty.cgMm / 2000;
    sample.component.cgM[1] += normalRandom(random) * config.uncertainty.cgMm / 2000;
    sample.component.cgM[2] += normalRandom(random) * config.uncertainty.cgMm / 2000;
    sample.isolator.compressionPct = clamp(sample.isolator.compressionPct + normalRandom(random) * config.uncertainty.compressionPct / 2, 5, 25);
    const modes = solveRigidBodyModes(sample).modes;
    const tones = config.analysis.tones.map(tone => axes.map((axis, axisIndex) => rigidBodyResponseAtFrequency(sample, tone.frequencyHz, axis).db[axisIndex]));
    const responses = Object.fromEntries(axes.map(axis => [axis, frequencyResponse({ ...sample, analysis: { ...sample.analysis, frequencyPoints: nominal[axis].frequencies.length } }, axis)]));
    samples.push({ modes, tones, responses });
  }
  const directionalBands = Object.fromEntries(axes.map((axis, axisIndex) => [axis, {
    lowerDb: nominal[axis].frequencies.map((_, frequencyIndex) => percentile(samples.map(sample => sample.responses[axis].db[axisIndex][frequencyIndex]), 0.05)),
    upperDb: nominal[axis].frequencies.map((_, frequencyIndex) => percentile(samples.map(sample => sample.responses[axis].db[axisIndex][frequencyIndex]), 0.95))
  }]));
  const toneRangesDbByAxis = config.analysis.tones.map((_, toneIndex) => axes.map((axis, axisIndex) => ({
    axis: axis.toUpperCase(),
    rangeDb: [percentile(samples.map(sample => sample.tones[toneIndex][axisIndex]), 0.05), percentile(samples.map(sample => sample.tones[toneIndex][axisIndex]), 0.95)]
  })));
  return {
    samples: count,
    modeRangesHz: Array.from({ length: 6 }, (_, mode) => [percentile(samples.map(sample => sample.modes[mode].frequencyHz), 0.05), percentile(samples.map(sample => sample.modes[mode].frequencyHz), 0.95)]),
    toneRangesDbByAxis,
    toneRangesDb: toneRangesDbByAxis.map(results => results[2].rangeDb),
    directionalBands,
    lowerDb: directionalBands.z.lowerDb,
    upperDb: directionalBands.z.upperDb,
    method: `Seeded ${count}-sample Monte Carlo; each Txx, Tyy, and Tzz band shows its own 5th-95th percentile range.`
  };
}

export function analyzeSorbothaneIsolation(configInput, options = {}) {
  const config = normalizeSorbothaneConfig(configInput);
  const modes = solveRigidBodyModes(config);
  const lateralModeResults = lateralTranslationModeResults(modes.modes, config);
  const verticalModeResult = verticalTranslationModeResult(modes.modes, config);
  const preload = staticPreloadState(config);
  const directionalResponses = options.skipResponse ? null : Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, frequencyResponse(config, axis)]));
  const response = directionalResponses?.[config.analysis.excitationAxis] ?? null;
  const toneResults = config.analysis.tones.map(tone => {
    const axisResults = ['x', 'y', 'z'].map((axis, axisIndex) => {
      const result = rigidBodyResponseAtFrequency(config, tone.frequencyHz, axis);
      return { axis: axis.toUpperCase(), db: result.db[axisIndex], magnitude: result.magnitude[axisIndex], phaseDeg: result.phaseDeg[axisIndex], pass: result.db[axisIndex] <= tone.maximumDb, provenance: result.property.provenance };
    });
    const worst = axisResults.reduce((largest, result) => result.db > largest.db ? result : largest, axisResults[0]);
    return { ...tone, axisResults, worstAxis: worst.axis, db: worst.db, magnitude: worst.magnitude, phaseDeg: worst.phaseDeg, pass: axisResults.every(result => result.pass), provenance: worst.provenance };
  });
  const peakResults = ['x', 'y', 'z'].map(axis => {
    const result = peakDirectResponse(config, ...config.analysis.resonanceBandHz, axis);
    const closestMode = modes.modes.reduce((best, mode) => Math.abs(mode.frequencyHz - result.frequencyHz) < Math.abs(best.frequencyHz - result.frequencyHz) ? mode : best, modes.modes[0]);
    result.modeNumber = closestMode.number;
    result.modeLabel = closestMode.dominant;
    result.pass = result.db <= config.analysis.resonanceLimitDb;
    return result;
  });
  const peak = peakResults.reduce((largest, result) => result.db > largest.db ? result : largest, peakResults[0]);
  const uncertainty = options.skipUncertainty || !directionalResponses ? null : uncertaintyEnvelope(config, directionalResponses);
  const warnings = [];
  if (isParkerLordConfig(config)) {
    const item = parkerLordCatalogItem(config.isolator.productNumber);
    warnings.push('Parker LORD catalog dynamic spring rates are treated as frequency-independent complex stiffness for preliminary screening; qualification should use current application-specific data.');
    warnings.push('Rated-load natural frequency and spring rate are catalog typical values. Confirm part availability, current drawing, load direction, environment, and installation with Parker LORD.');
    if (item.lossFactorProvenance === 'engineering-assumption') warnings.push(`${item.elastomer} loss factor is an editable engineering assumption because the catalog table does not publish a damping value.`);
    else warnings.push(`${item.elastomer} loss factor is an editable estimate digitized from the catalog's typical transmissibility curve, not a tabulated specification.`);
    if (!preload.catalogCompliant) warnings.push('At least one support-point resultant load exceeds the catalog rated load for the selected single/back-to-back arrangement.');
  } else {
    const material = sorbothaneMaterial(config.isolator.formulation);
    if (config.analysis.frequencyMaxHz > material.digitizedCurveMaxHz) warnings.push(`${material.label} data above ${material.digitizedCurveMaxHz} Hz are extrapolated using the selected ${config.isolator.extrapolation} policy.`);
    if (material.formulation === 'water-resistant') warnings.push('Water-resistant properties are applied to the selected catalog geometry for analysis, but the Standard Products Guide part number and rated load do not confirm water-resistant availability. Confirm formulation, load rating, and orderable part number with Sorbothane.');
    if (!preload.allEngaged) warnings.push('At least one opposing isolator unloads under the specified quasi-static acceleration. The linear sandwich model is invalid after loss of contact.');
    if (!preload.catalogCompliant) warnings.push('At least one element load lies outside the manufacturer catalog rating.');
    if (preload.compressionPct < 10 || preload.compressionPct > 20) warnings.push('Nominal compression lies outside the manufacturer 10-20% preferred static-deflection range for shape factors from 0.3 to 1.0.');
    if (isolatorGeometry(config).shapeFactor > 1.2) warnings.push('Shape factor exceeds 1.2; the manufacturer guide states no accepted shock methodology above this value and geometry correction uncertainty increases.');
    if (config.isolator.temperatureC < -29 || config.isolator.temperatureC > 72) warnings.push('Temperature is outside the broad manufacturer operating range; the current model does not shift modulus with temperature.');
  }
  return {
    config,
    material: isParkerLordConfig(config) ? null : sorbothaneMaterial(config.isolator.formulation),
    geometry: isolatorGeometry(config),
    preload,
    modes: modes.modes,
    lateralModeResults,
    verticalModeResult,
    massMatrix: modes.massMatrix,
    inertiaKgM2: modes.inertiaKgM2,
    stiffnessAt100Hz: assembleRigidBodyStiffness(config, 100).matrix,
    response,
    directionalResponses,
    toneResults,
    peak,
    peakResults,
    uncertainty,
    warnings,
    passes: lateralModeResults.every(result => result.pass) && verticalModeResult.pass && toneResults.every(result => result.pass) && peak.pass && preload.allEngaged && preload.catalogCompliant && preload.compressionCompliant
  };
}

const DESIGN_VARIABLES = {
  durometer: { path: ['isolator', 'durometer'], scale: 1 },
  thickness: { path: ['isolator', 'thicknessM'], scale: INCH },
  od: { path: ['isolator', 'odM'], scale: INCH },
  id: { path: ['isolator', 'idM'], scale: INCH },
  compression: { path: ['isolator', 'compressionPct'], scale: 1 },
  mass: { path: ['component', 'massKg'], scale: LB },
  cgHeight: { path: ['component', 'cgM', 2], scale: INCH },
  mountSpacing: { path: ['mounts', 'spacingM', 0], scale: INCH },
  mountSpacingY: { path: ['mounts', 'spacingM', 1], scale: INCH },
  stackCount: { path: ['mounts', 'stackTop'], scale: 1 },
  stiffnessScale: { path: ['isolator', 'modulusScale'], scale: 1 },
  lossFactor: { path: ['isolator', 'lordLossFactor'], scale: 1 },
  mountsPerPoint: { path: ['isolator', 'mountsPerPoint'], scale: 1 }
};

function setDesignVariable(config, variable, displayValue) {
  const definition = DESIGN_VARIABLES[variable];
  if (!definition) return;
  let target = config;
  for (const key of definition.path.slice(0, -1)) target = target[key];
  target[definition.path.at(-1)] = displayValue * definition.scale;
  if (variable === 'stackCount') {
    target[definition.path.at(-1)] = Math.max(1, Math.round(displayValue));
    config.mounts.stackBottom = target[definition.path.at(-1)];
  }
  if (variable === 'mountsPerPoint') target[definition.path.at(-1)] = clamp(Math.round(displayValue), 1, 2);
}

function getDesignVariable(config, variable) {
  const definition = DESIGN_VARIABLES[variable];
  if (!definition) return NaN;
  let value = config;
  for (const key of definition.path) value = value[key];
  return value / definition.scale;
}

export function runDesignGrid(configInput, settings = {}) {
  const config = normalizeSorbothaneConfig(configInput);
  const xVariable = settings.xVariable ?? 'thickness';
  const yVariable = settings.yVariable ?? 'od';
  const xRange = settings.xRange ?? [0.15, 0.5];
  const yRange = settings.yRange ?? [0.9, 1.8];
  const gridSize = clamp(Math.round(settings.gridSize ?? 7), 3, 11);
  const output = settings.output ?? 't1200';
  const reference = { xValue: getDesignVariable(config, xVariable), yValue: getDesignVariable(config, yVariable) };
  const xValues = Array.from({ length: gridSize }, (_, index) => xRange[0] + index * (xRange[1] - xRange[0]) / (gridSize - 1));
  const yValues = Array.from({ length: gridSize }, (_, index) => yRange[0] + index * (yRange[1] - yRange[0]) / (gridSize - 1));
  const candidates = [];
  const values = yValues.map(yValue => xValues.map(xValue => {
    const candidateConfig = clone(config);
    candidateConfig.uncertainty.enabled = false;
    setDesignVariable(candidateConfig, xVariable, xValue);
    setDesignVariable(candidateConfig, yVariable, yValue);
    if (!isParkerLordConfig(candidateConfig) && candidateConfig.isolator.idM >= candidateConfig.isolator.odM) return NaN;
    try {
      const analysis = analyzeSorbothaneIsolation(candidateConfig, { skipResponse: true, skipUncertainty: true });
      const outputValues = {
        t600: analysis.toneResults.find(result => Math.abs(result.frequencyHz - 600) < 1)?.db ?? analysis.toneResults[0]?.db,
        t1200: analysis.toneResults.find(result => Math.abs(result.frequencyHz - 1200) < 1)?.db ?? analysis.toneResults[1]?.db,
        peak: analysis.peak.db,
        verticalMode: analysis.modes.find(mode => mode.dominantIndex === 2)?.frequencyHz ?? analysis.modes[2].frequencyHz
      };
      const score = analysis.toneResults.reduce((sum, result) => sum + result.db, 0) + Math.max(analysis.peak.db - config.analysis.resonanceLimitDb, 0) * 4 + (analysis.preload.allEngaged ? 0 : 100) + (analysis.preload.catalogCompliant ? 0 : 40);
      const isReference = Math.abs(xValue - reference.xValue) < 1e-8 && Math.abs(yValue - reference.yValue) < 1e-8;
      candidates.push({ xValue, yValue, value: outputValues[output], score, pass: analysis.passes, isReference, analysis, config: candidateConfig });
      return outputValues[output];
    } catch { return NaN; }
  }));
  candidates.sort((left, right) => left.score - right.score);
  const rankedCandidates = candidates.slice(0, 12);
  const referenceCandidate = candidates.find(candidate => candidate.isReference);
  if (referenceCandidate && !rankedCandidates.includes(referenceCandidate)) rankedCandidates[rankedCandidates.length - 1] = referenceCandidate;
  return { xVariable, yVariable, xValues, yValues, output, values, reference, candidates: rankedCandidates };
}

function catalogCandidateConfig(baseConfig, item, stackCount) {
  const config = clone(baseConfig);
  config.isolator.kind = 'sorbothane-element';
  config.isolator.productNumber = item.productNumber;
  config.isolator.geometry = item.geometry;
  config.isolator.odM = item.odIn * INCH;
  config.isolator.idM = item.idIn * INCH;
  config.isolator.thicknessM = item.thicknessIn * INCH;
  config.isolator.durometer = item.durometer;
  config.mounts.stackTop = stackCount;
  config.mounts.stackBottom = stackCount;
  config.uncertainty.enabled = false;
  return config;
}

function catalogPerformanceScore(analysis) {
  const tonePenalty = analysis.toneResults.reduce((sum, result) => sum + Math.max(result.db - result.maximumDb, 0) * 12, 0);
  const peakPenalty = Math.max(analysis.peak.db - analysis.config.analysis.resonanceLimitDb, 0) * 8;
  return tonePenalty + peakPenalty + analysis.toneResults.reduce((sum, result) => sum + result.db, 0) + analysis.peak.db;
}

const catalogNumberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function sortedCatalogRange(input, fallback) {
  const values = Array.isArray(input) ? input : fallback;
  const first = catalogNumberOr(values[0], fallback[0]);
  const second = catalogNumberOr(values[1], fallback[1]);
  return first <= second ? [first, second] : [second, first];
}

function normalizeCatalogCriteria(config, input = {}) {
  const tonesInput = Array.isArray(input.tones) ? input.tones : config.analysis.tones;
  const tones = tonesInput.slice(0, 8).map((tone, index) => ({
    frequencyHz: Math.max(0.1, catalogNumberOr(tone?.frequencyHz, config.analysis.tones[index]?.frequencyHz ?? 600)),
    maximumDb: catalogNumberOr(tone?.maximumDb, config.analysis.tones[index]?.maximumDb ?? -10)
  }));
  return {
    lateralModeMinimumHz: [0, 1].map(index => Math.max(0.1, catalogNumberOr(input.lateralModeMinimumHz?.[index], config.analysis.lateralModeMinimumHz[index]))),
    verticalModeRangeHz: sortedCatalogRange(input.verticalModeRangeHz, config.analysis.modeAcceptBandHz),
    resonanceBandHz: sortedCatalogRange(input.resonanceBandHz, config.analysis.resonanceBandHz),
    resonanceMaximumDb: catalogNumberOr(input.resonanceMaximumDb, config.analysis.resonanceLimitDb),
    tones
  };
}

function createCatalogScreenContext(configInput, settings = {}) {
  const config = normalizeSorbothaneConfig(configInput);
  const criteria = normalizeCatalogCriteria(config, settings.criteria);
  config.analysis.lateralModeMinimumHz = [...criteria.lateralModeMinimumHz];
  config.analysis.modeAcceptBandHz = [...criteria.verticalModeRangeHz];
  config.analysis.resonanceBandHz = [...criteria.resonanceBandHz];
  config.analysis.resonanceLimitDb = criteria.resonanceMaximumDb;
  config.analysis.tones = criteria.tones.map(tone => ({ ...tone }));
  const geometry = ['all', 'washer', 'ring', 'disc'].includes(settings.geometry) ? settings.geometry : 'all';
  const odRange = sortedCatalogRange(settings.odRange, [0.5, 5]);
  const idRange = sortedCatalogRange(settings.idRange, [0, 3.1]);
  const thicknessRange = sortedCatalogRange(settings.thicknessRange, [0.125, 1]);
  const stackRange = sortedCatalogRange(settings.stackRange, [1, 8]).map(value => clamp(Math.round(value), 1, 8));
  const stackMin = Math.min(...stackRange);
  const stackMax = Math.max(...stackRange);
  const catalog = SORBOTHANE_CATALOG.filter(item => item.productNumber !== 'custom-ring');
  const eligibleParts = catalog.filter(item => (
    (geometry === 'all' || item.geometry === geometry)
    && item.odIn >= odRange[0] && item.odIn <= odRange[1]
    && item.idIn >= idRange[0] && item.idIn <= idRange[1]
    && item.thicknessIn >= thicknessRange[0] && item.thicknessIn <= thicknessRange[1]
  ));
  const combinations = eligibleParts.flatMap(item => Array.from({ length: stackMax - stackMin + 1 }, (_, index) => ({ item, stackCount: stackMin + index })));
  return { config, criteria, geometry, odRange, idRange, thicknessRange, stackMin, stackMax, catalog, eligibleParts, combinations };
}

function preScreenCatalogCombination(context, combination, exclusions) {
  const candidateConfig = catalogCandidateConfig(context.config, combination.item, combination.stackCount);
  const preload = staticPreloadState(candidateConfig);
  const modes = solveRigidBodyModes(candidateConfig).modes;
  const lateralModes = lateralTranslationModeResults(modes, candidateConfig);
  const verticalMode = modeWithMostParticipation(modes, 2);
  const xTranslationPass = lateralModes[0].pass;
  const yTranslationPass = lateralModes[1].pass;
  const verticalModePass = verticalMode.frequencyHz >= context.criteria.verticalModeRangeHz[0] && verticalMode.frequencyHz <= context.criteria.verticalModeRangeHz[1];
  if (!preload.compressionCompliant) exclusions.compression += 1;
  if (!preload.allEngaged) exclusions.engagement += 1;
  if (!preload.catalogCompliant) exclusions.ratedLoad += 1;
  if (!xTranslationPass) exclusions.xTranslation += 1;
  if (!yTranslationPass) exclusions.yTranslation += 1;
  if (!verticalModePass) exclusions.verticalMode += 1;
  if (!preload.compressionCompliant || !preload.allEngaged || !preload.catalogCompliant || !xTranslationPass || !yTranslationPass || !verticalModePass) return null;
  return { ...combination, candidateConfig };
}

function evaluateCatalogCombination(context, candidate, exclusions) {
  const analysis = analyzeSorbothaneIsolation(candidate.candidateConfig, { skipResponse: true, skipUncertainty: true });
  const loadsLbf = analysis.preload.mounts.flatMap(mount => [mount.upperLoadN / LBF, mount.lowerLoadN / LBF]);
  const pass = analysis.passes;
  if (!pass) exclusions.dynamic += 1;
  return {
    item: candidate.item,
    stackCount: candidate.stackCount,
    totalElementCount: candidate.stackCount * context.config.mounts.count * 2,
    installedLoadRangeLb: [Math.min(...loadsLbf), Math.max(...loadsLbf)],
    score: catalogPerformanceScore(analysis),
    pass,
    analysis,
    config: candidate.candidateConfig
  };
}

function finalizeCatalogScreen(context, evaluated, exclusions) {
  const byPart = new Map();
  for (const candidate of evaluated) {
    if (!byPart.has(candidate.item.productNumber)) byPart.set(candidate.item.productNumber, []);
    byPart.get(candidate.item.productNumber).push(candidate);
  }
  const recommendations = [];
  const nearMisses = [];
  for (const candidates of byPart.values()) {
    const passing = candidates.filter(candidate => candidate.pass).sort((left, right) => left.stackCount - right.stackCount || left.score - right.score);
    if (passing.length) recommendations.push(passing[0]);
    else nearMisses.push(...candidates);
  }
  recommendations.sort((left, right) => left.score - right.score || left.stackCount - right.stackCount);
  nearMisses.sort((left, right) => left.score - right.score || left.stackCount - right.stackCount);
  return {
    library: 'sorbothane',
    formulation: context.config.isolator.formulation,
    settings: { geometry: context.geometry, odRange: context.odRange, idRange: context.idRange, thicknessRange: context.thicknessRange, stackRange: [context.stackMin, context.stackMax] },
    criteria: context.criteria,
    catalogPartCount: context.catalog.length,
    eligiblePartCount: context.eligibleParts.length,
    combinationCount: context.combinations.length,
    dynamicallyEvaluatedCount: evaluated.length,
    passingPartCount: recommendations.length,
    exclusions,
    recommendations: recommendations.slice(0, 16),
    nearMisses: nearMisses.slice(0, 8)
  };
}

export function screenSorbothaneCatalog(configInput, settings = {}) {
  const context = createCatalogScreenContext(configInput, settings);
  const exclusions = { compression: 0, engagement: 0, ratedLoad: 0, xTranslation: 0, yTranslation: 0, verticalMode: 0, dynamic: 0 };
  const preliminary = context.combinations.map(combination => preScreenCatalogCombination(context, combination, exclusions)).filter(Boolean);
  const evaluated = preliminary.map(candidate => evaluateCatalogCombination(context, candidate, exclusions));
  return finalizeCatalogScreen(context, evaluated, exclusions);
}

export async function screenSorbothaneCatalogAsync(configInput, settings = {}, options = {}) {
  const context = createCatalogScreenContext(configInput, settings);
  const exclusions = { compression: 0, engagement: 0, ratedLoad: 0, xTranslation: 0, yTranslation: 0, verticalMode: 0, dynamic: 0 };
  const preliminary = [];
  const evaluated = [];
  const batchSize = clamp(Math.round(catalogNumberOr(options.batchSize, 4)), 1, 24);
  const yieldControl = options.yieldControl ?? (() => new Promise(resolve => setTimeout(resolve, 0)));
  const cancelled = () => Boolean(options.shouldCancel?.());
  options.onProgress?.({ stage: 'pre-screen', completed: 0, total: context.combinations.length, percent: 0 });
  await yieldControl();
  for (let start = 0; start < context.combinations.length; start += batchSize) {
    if (cancelled()) return null;
    const end = Math.min(start + batchSize, context.combinations.length);
    for (let index = start; index < end; index += 1) {
      const candidate = preScreenCatalogCombination(context, context.combinations[index], exclusions);
      if (candidate) preliminary.push(candidate);
    }
    options.onProgress?.({ stage: 'pre-screen', completed: end, total: context.combinations.length, percent: context.combinations.length ? end / context.combinations.length * 50 : 50 });
    await yieldControl();
  }
  options.onProgress?.({ stage: 'dynamic', completed: 0, total: preliminary.length, percent: 50 });
  await yieldControl();
  for (let start = 0; start < preliminary.length; start += batchSize) {
    if (cancelled()) return null;
    const end = Math.min(start + batchSize, preliminary.length);
    for (let index = start; index < end; index += 1) evaluated.push(evaluateCatalogCombination(context, preliminary[index], exclusions));
    options.onProgress?.({ stage: 'dynamic', completed: end, total: preliminary.length, percent: 50 + (preliminary.length ? end / preliminary.length * 50 : 50) });
    await yieldControl();
  }
  options.onProgress?.({ stage: 'complete', completed: evaluated.length, total: evaluated.length, percent: 100 });
  return finalizeCatalogScreen(context, evaluated, exclusions);
}

function lordCatalogCandidateConfig(baseConfig, item, mountsPerPoint) {
  const config = clone(baseConfig);
  config.isolator.kind = 'parker-lord-am';
  config.isolator.productNumber = item.productNumber;
  config.isolator.mountsPerPoint = mountsPerPoint;
  config.isolator.lordLossFactor = item.lossFactorDefault;
  config.isolator.modulusScale = 1;
  config.isolator.lossScale = 1;
  config.uncertainty.enabled = false;
  return config;
}

function createParkerLordScreenContext(configInput, settings = {}) {
  const config = normalizeSorbothaneConfig(configInput);
  const criteria = normalizeCatalogCriteria(config, settings.criteria);
  config.analysis.lateralModeMinimumHz = [...criteria.lateralModeMinimumHz];
  config.analysis.modeAcceptBandHz = [...criteria.verticalModeRangeHz];
  config.analysis.resonanceBandHz = [...criteria.resonanceBandHz];
  config.analysis.resonanceLimitDb = criteria.resonanceMaximumDb;
  config.analysis.tones = criteria.tones.map(tone => ({ ...tone }));
  const family = settings.family === 'all' || /^AM-00[1-9]$/.test(settings.family ?? '') ? settings.family : 'all';
  const elastomer = ['all', 'BTR', 'BTR II', 'MEA'].includes(settings.elastomer) ? settings.elastomer : 'all';
  const ratedLoadRange = sortedCatalogRange(settings.ratedLoadRange, [0, 25]);
  const mountRange = sortedCatalogRange(settings.mountsPerPointRange, [1, 2]).map(value => clamp(Math.round(value), 1, 2));
  const mountMin = Math.min(...mountRange);
  const mountMax = Math.max(...mountRange);
  const eligibleParts = PARKER_LORD_AM_CATALOG.filter(item => (
    (family === 'all' || item.family === family)
    && (elastomer === 'all' || item.elastomer === elastomer)
    && item.ratedLoadLb >= ratedLoadRange[0]
    && item.ratedLoadLb <= ratedLoadRange[1]
  ));
  const combinations = eligibleParts.flatMap(item => Array.from({ length: mountMax - mountMin + 1 }, (_, index) => ({ item, mountsPerPoint: mountMin + index })));
  return { config, criteria, family, elastomer, ratedLoadRange, mountMin, mountMax, eligibleParts, combinations };
}

function preScreenParkerLordCombination(context, combination, exclusions) {
  const candidateConfig = lordCatalogCandidateConfig(context.config, combination.item, combination.mountsPerPoint);
  const preload = staticPreloadState(candidateConfig);
  const modes = solveRigidBodyModes(candidateConfig).modes;
  const lateralModes = lateralTranslationModeResults(modes, candidateConfig);
  const verticalMode = modeWithMostParticipation(modes, 2);
  const xTranslationPass = lateralModes[0].pass;
  const yTranslationPass = lateralModes[1].pass;
  const verticalModePass = verticalMode.frequencyHz >= context.criteria.verticalModeRangeHz[0] && verticalMode.frequencyHz <= context.criteria.verticalModeRangeHz[1];
  if (!preload.catalogCompliant) exclusions.ratedLoad += 1;
  if (!xTranslationPass) exclusions.xTranslation += 1;
  if (!yTranslationPass) exclusions.yTranslation += 1;
  if (!verticalModePass) exclusions.verticalMode += 1;
  if (!preload.catalogCompliant || !xTranslationPass || !yTranslationPass || !verticalModePass) return null;
  return { ...combination, candidateConfig };
}

function evaluateParkerLordCombination(context, candidate, exclusions) {
  const analysis = analyzeSorbothaneIsolation(candidate.candidateConfig, { skipResponse: true, skipUncertainty: true });
  const loadsLbf = analysis.preload.mounts.map(mount => mount.resultantLoadN / LBF);
  const pass = analysis.passes;
  if (!pass) exclusions.dynamic += 1;
  return {
    item: candidate.item,
    mountsPerPoint: candidate.mountsPerPoint,
    stackCount: candidate.mountsPerPoint,
    totalMountCount: candidate.mountsPerPoint * context.config.mounts.count,
    totalElementCount: candidate.mountsPerPoint * context.config.mounts.count,
    installedLoadRangeLb: [Math.min(...loadsLbf), Math.max(...loadsLbf)],
    score: catalogPerformanceScore(analysis),
    pass,
    analysis,
    config: candidate.candidateConfig
  };
}

function finalizeParkerLordScreen(context, evaluated, exclusions) {
  const byPart = new Map();
  for (const candidate of evaluated) {
    if (!byPart.has(candidate.item.productNumber)) byPart.set(candidate.item.productNumber, []);
    byPart.get(candidate.item.productNumber).push(candidate);
  }
  const recommendations = [];
  const nearMisses = [];
  for (const candidates of byPart.values()) {
    const passing = candidates.filter(candidate => candidate.pass).sort((left, right) => left.mountsPerPoint - right.mountsPerPoint || left.score - right.score);
    if (passing.length) recommendations.push(passing[0]);
    else nearMisses.push(...candidates);
  }
  recommendations.sort((left, right) => left.score - right.score || left.mountsPerPoint - right.mountsPerPoint);
  nearMisses.sort((left, right) => left.score - right.score || left.mountsPerPoint - right.mountsPerPoint);
  return {
    library: 'parker-lord-am',
    settings: { family: context.family, elastomer: context.elastomer, ratedLoadRange: context.ratedLoadRange, mountsPerPointRange: [context.mountMin, context.mountMax] },
    criteria: context.criteria,
    catalogPartCount: PARKER_LORD_AM_CATALOG.length,
    eligiblePartCount: context.eligibleParts.length,
    combinationCount: context.combinations.length,
    dynamicallyEvaluatedCount: evaluated.length,
    passingPartCount: recommendations.length,
    exclusions,
    recommendations: recommendations.slice(0, 16),
    nearMisses: nearMisses.slice(0, 8)
  };
}

export function screenParkerLordCatalog(configInput, settings = {}) {
  const context = createParkerLordScreenContext(configInput, settings);
  const exclusions = { compression: 0, engagement: 0, ratedLoad: 0, xTranslation: 0, yTranslation: 0, verticalMode: 0, dynamic: 0 };
  const preliminary = context.combinations.map(combination => preScreenParkerLordCombination(context, combination, exclusions)).filter(Boolean);
  const evaluated = preliminary.map(candidate => evaluateParkerLordCombination(context, candidate, exclusions));
  return finalizeParkerLordScreen(context, evaluated, exclusions);
}

export async function screenParkerLordCatalogAsync(configInput, settings = {}, options = {}) {
  const context = createParkerLordScreenContext(configInput, settings);
  const exclusions = { compression: 0, engagement: 0, ratedLoad: 0, xTranslation: 0, yTranslation: 0, verticalMode: 0, dynamic: 0 };
  const preliminary = [];
  const evaluated = [];
  const batchSize = clamp(Math.round(catalogNumberOr(options.batchSize, 4)), 1, 24);
  const yieldControl = options.yieldControl ?? (() => new Promise(resolve => setTimeout(resolve, 0)));
  const cancelled = () => Boolean(options.shouldCancel?.());
  options.onProgress?.({ stage: 'pre-screen', completed: 0, total: context.combinations.length, percent: 0 });
  await yieldControl();
  for (let start = 0; start < context.combinations.length; start += batchSize) {
    if (cancelled()) return null;
    const end = Math.min(start + batchSize, context.combinations.length);
    for (let index = start; index < end; index += 1) {
      const candidate = preScreenParkerLordCombination(context, context.combinations[index], exclusions);
      if (candidate) preliminary.push(candidate);
    }
    options.onProgress?.({ stage: 'pre-screen', completed: end, total: context.combinations.length, percent: context.combinations.length ? end / context.combinations.length * 50 : 50 });
    await yieldControl();
  }
  options.onProgress?.({ stage: 'dynamic', completed: 0, total: preliminary.length, percent: 50 });
  await yieldControl();
  for (let start = 0; start < preliminary.length; start += batchSize) {
    if (cancelled()) return null;
    const end = Math.min(start + batchSize, preliminary.length);
    for (let index = start; index < end; index += 1) evaluated.push(evaluateParkerLordCombination(context, preliminary[index], exclusions));
    options.onProgress?.({ stage: 'dynamic', completed: end, total: preliminary.length, percent: 50 + (preliminary.length ? end / preliminary.length * 50 : 50) });
    await yieldControl();
  }
  options.onProgress?.({ stage: 'complete', completed: evaluated.length, total: evaluated.length, percent: 100 });
  return finalizeParkerLordScreen(context, evaluated, exclusions);
}

export const SORBOTHANE_UNITS = { INCH, LB, LBF, PSI, G0 };
export { PARKER_LORD_AM_CATALOG, SORBOTHANE_CATALOG };
