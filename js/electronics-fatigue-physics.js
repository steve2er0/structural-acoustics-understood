/* Source-aware screening physics for Steinberg-style electronics vibration fatigue. */

export const ELECTRONICS_G0 = 9.80665;
export const STEINBERG_REFERENCE_CYCLES = 20_000_000;
export const STEINBERG_COMPONENTS = Object.freeze({
  axial: { label: 'Axial-leaded / discrete component', coefficient: 0.75 },
  dip: { label: 'DIP / pin-grid package', coefficient: 1.0 },
  ceramic: { label: 'Side-brazed leaded ceramic package', coefficient: 1.26 },
  bga: { label: 'Ball-grid array', coefficient: 1.75 },
  lccc: { label: 'Leadless ceramic chip carrier', coefficient: 2.25 }
});

const K_STEINBERG_MM = 0.00022 * 25.4 ** 1.5;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback = Number.EPSILON) => Math.max(finite(value, fallback), Number.EPSILON);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function steinbergLocationFactor(xFraction = 0.5, yFraction = 0.5) {
  const x = clamp(finite(xFraction, 0.5), 0, 1);
  const y = clamp(finite(yFraction, 0.5), 0, 1);
  return Math.sin(Math.PI * x) * Math.sin(Math.PI * y);
}

export function steinbergAllowableDisplacement({ boardSpanMm, boardThicknessMm, componentLengthMm, componentCoefficient = 1, locationFactor = 1 }) {
  const B = positive(boardSpanMm);
  const h = positive(boardThicknessMm);
  const L = positive(componentLengthMm);
  const C = positive(componentCoefficient);
  const r = positive(locationFactor);
  return K_STEINBERG_MM * B / (C * h * r * Math.sqrt(L));
}

export function steinbergDisplacementState({
  boardSpanMm = 150, boardThicknessMm = 1.6, componentLengthMm = 25,
  componentCoefficient = 1.75, xFraction = 0.5, yFraction = 0.5,
  response3SigmaMm = 0.25, responseBasis = 'center', safetyFactor = 1
} = {}) {
  const locationFactor = Math.max(steinbergLocationFactor(xFraction, yFraction), 1e-6);
  const localAllowableMm = steinbergAllowableDisplacement({ boardSpanMm, boardThicknessMm, componentLengthMm, componentCoefficient, locationFactor: 1 });
  const allowableCenterMm = localAllowableMm / locationFactor;
  const responseCenterMm = responseBasis === 'local' ? positive(response3SigmaMm) / locationFactor : positive(response3SigmaMm);
  const responseLocalMm = responseBasis === 'local' ? positive(response3SigmaMm) : responseCenterMm * locationFactor;
  const demandMm = responseLocalMm * positive(safetyFactor, 1);
  const ratio = demandMm / localAllowableMm;
  return {
    locationFactor, localAllowableMm, allowableCenterMm, responseCenterMm, responseLocalMm,
    demandMm, ratio, marginOfSafety: 1 / ratio - 1, passes: ratio <= 1,
    coefficientMm: K_STEINBERG_MM
  };
}

export function parsePsdSpectrum(text) {
  const rows = String(text ?? '').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  const points = rows.map((line, index) => {
    const fields = line.split(/[\s,;]+/).filter(Boolean);
    const frequency = Number(fields[0]);
    const psd = Number(fields[1]);
    if (!(frequency > 0) || !(psd >= 0)) throw new Error(`PSD row ${index + 1} must contain positive frequency and non-negative g²/Hz.`);
    return { frequency, psd };
  }).sort((a, b) => a.frequency - b.frequency);
  if (points.length < 2) throw new Error('Enter at least two frequency, PSD rows.');
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].frequency === points[index - 1].frequency) throw new Error(`Duplicate PSD frequency ${points[index].frequency} Hz.`);
  }
  return points;
}

function logInterpolate(points, frequency) {
  if (frequency <= points[0].frequency) return points[0].psd;
  if (frequency >= points.at(-1).frequency) return points.at(-1).psd;
  let high = 1;
  while (points[high].frequency < frequency) high += 1;
  const a = points[high - 1], b = points[high];
  if (a.psd <= 0 || b.psd <= 0) return a.psd + (b.psd - a.psd) * (frequency - a.frequency) / (b.frequency - a.frequency);
  const t = Math.log(frequency / a.frequency) / Math.log(b.frequency / a.frequency);
  return Math.exp(Math.log(a.psd) + t * Math.log(b.psd / a.psd));
}

function analysisGrid(points, count = 1600) {
  const f0 = points[0].frequency, f1 = points.at(-1).frequency;
  const grid = Array.from({ length: count }, (_, index) => f0 * (f1 / f0) ** (index / (count - 1)));
  return [...new Set([...grid, ...points.map(point => point.frequency)])].sort((a, b) => a - b);
}

function trapz(x, y) {
  let area = 0;
  for (let index = 1; index < x.length; index += 1) area += 0.5 * (y[index] + y[index - 1]) * (x[index] - x[index - 1]);
  return area;
}

function cumulativeTrapz(x, y) {
  const values = [0];
  for (let index = 1; index < x.length; index += 1) {
    values.push(values[index - 1] + 0.5 * (y[index] + y[index - 1]) * (x[index] - x[index - 1]));
  }
  return values;
}

export function pcbRandomResponseState({ spectrum, naturalFrequencyHz = 300, qualityFactor = 10, durationSeconds = 60 } = {}) {
  const points = Array.isArray(spectrum) ? spectrum.map(point => ({ frequency: positive(point.frequency), psd: Math.max(0, finite(point.psd)) })).sort((a, b) => a.frequency - b.frequency) : parsePsdSpectrum(spectrum);
  const fn = positive(naturalFrequencyHz), Q = positive(qualityFactor), dampingRatio = 1 / (2 * Q), wn = 2 * Math.PI * fn;
  const frequencies = analysisGrid(points);
  const inputPsd = frequencies.map(frequency => logInterpolate(points, frequency));
  const accelerationPsd = [], relativeDisplacementPsdMm2 = [], accelerationTransferH2 = [], relativeDisplacementH2Mm2PerG2 = [];
  frequencies.forEach((frequency, index) => {
    const r = frequency / fn;
    const denominator = (1 - r * r) ** 2 + (2 * dampingRatio * r) ** 2;
    const accelerationH2 = (1 + (2 * dampingRatio * r) ** 2) / denominator;
    const relativeH2 = 1 / (wn ** 4 * denominator);
    accelerationPsd.push(inputPsd[index] * accelerationH2);
    relativeDisplacementPsdMm2.push(inputPsd[index] * ELECTRONICS_G0 ** 2 * relativeH2 * 1e6);
    accelerationTransferH2.push(accelerationH2);
    relativeDisplacementH2Mm2PerG2.push(ELECTRONICS_G0 ** 2 * relativeH2 * 1e6);
  });
  const inputGrms = Math.sqrt(trapz(frequencies, inputPsd));
  const responseGrms = Math.sqrt(trapz(frequencies, accelerationPsd));
  const relativeRmsMm = Math.sqrt(trapz(frequencies, relativeDisplacementPsdMm2));
  const localPsd = logInterpolate(points, fn);
  const milesAccelerationGrms = Math.sqrt(Math.PI * Q * fn * localPsd / 2);
  const milesRelativeRmsMm = 1000 * ELECTRONICS_G0 * milesAccelerationGrms / wn ** 2;
  const moment = order => trapz(frequencies, relativeDisplacementPsdMm2.map((value, index) => value * (2 * Math.PI * frequencies[index]) ** order));
  const m0 = moment(0), m2 = moment(2), m4 = moment(4);
  const zeroCrossingRateHz = m0 > 0 ? Math.sqrt(m2 / m0) / (2 * Math.PI) : 0;
  const peakRateHz = m2 > 0 ? Math.sqrt(m4 / m2) / (2 * Math.PI) : 0;
  const independentPeaks = Math.max(1, peakRateHz * positive(durationSeconds, 1));
  const expectedPeakFactor = Math.sqrt(2 * Math.log(Math.max(2, 2 * independentPeaks)));
  const cumulativeRelativeVarianceMm2 = cumulativeTrapz(frequencies, relativeDisplacementPsdMm2);
  const totalRelativeVarianceMm2 = cumulativeRelativeVarianceMm2.at(-1) || 0;
  const cumulativeRelativeVarianceFraction = cumulativeRelativeVarianceMm2.map(value => totalRelativeVarianceMm2 > 0 ? value / totalRelativeVarianceMm2 : 0);
  return {
    points, frequencies, inputPsd, accelerationPsd, relativeDisplacementPsdMm2,
    accelerationH2: accelerationTransferH2, relativeDisplacementH2Mm2PerG2, cumulativeRelativeVarianceMm2, cumulativeRelativeVarianceFraction,
    inputGrms, responseGrms, relativeRmsMm, relative3SigmaMm: 3 * relativeRmsMm,
    milesAccelerationGrms, milesRelativeRmsMm, milesRelative3SigmaMm: 3 * milesRelativeRmsMm,
    dampingRatio, localPsd, zeroCrossingRateHz, peakRateHz, expectedPeakFactor,
    expectedPeakMm: expectedPeakFactor * relativeRmsMm,
    resonanceInsideBand: fn >= points[0].frequency && fn <= points.at(-1).frequency
  };
}

export function componentPlacementState({ boardSpanXMm = 180, boardSpanYMm = 120, boardThicknessMm = 1.6, center3SigmaMm = 0.3, components = [] } = {}) {
  const rows = components.map((component, index) => {
    const axis = String(component.axis ?? 'x').toLowerCase() === 'y' ? 'y' : 'x';
    const packageKey = STEINBERG_COMPONENTS[component.package] ? component.package : 'dip';
    const coefficient = STEINBERG_COMPONENTS[packageKey].coefficient;
    const r = Math.max(steinbergLocationFactor(component.xFraction, component.yFraction), 1e-6);
    const boardSpanMm = axis === 'x' ? boardSpanXMm : boardSpanYMm;
    const localAllowableMm = steinbergAllowableDisplacement({ boardSpanMm, boardThicknessMm, componentLengthMm: component.lengthMm, componentCoefficient: coefficient, locationFactor: 1 });
    const localResponseMm = positive(center3SigmaMm) * r;
    const ratio = localResponseMm / localAllowableMm;
    return {
      name: String(component.name || `C${index + 1}`), xFraction: clamp(finite(component.xFraction, 0.5), 0, 1), yFraction: clamp(finite(component.yFraction, 0.5), 0, 1),
      axis, package: packageKey, packageLabel: STEINBERG_COMPONENTS[packageKey].label, coefficient, boardSpanMm,
      lengthMm: positive(component.lengthMm, 1), locationFactor: r, localAllowableMm, allowableCenterMm: localAllowableMm / r,
      localResponseMm, ratio, marginOfSafety: 1 / ratio - 1, passes: ratio <= 1
    };
  }).sort((a, b) => b.ratio - a.ratio);
  return { rows, controlling: rows[0] ?? null, passCount: rows.filter(row => row.passes).length, totalCount: rows.length };
}

const PCB_MODE_ORDERS = Object.freeze([[1, 1], [2, 1], [1, 2], [2, 2], [3, 1], [1, 3]]);

function plateModePoint({ xFraction, yFraction, modeX, modeY, spanXMm, spanYMm, thicknessMm, peakDisplacementMm }) {
  const x = clamp(finite(xFraction, 0.5), 0, 1), y = clamp(finite(yFraction, 0.5), 0, 1);
  const mx = Math.max(1, Math.round(positive(modeX, 1))), my = Math.max(1, Math.round(positive(modeY, 1)));
  const ax = mx * Math.PI / positive(spanXMm), ay = my * Math.PI / positive(spanYMm);
  const sinX = Math.sin(mx * Math.PI * x), sinY = Math.sin(my * Math.PI * y);
  const cosX = Math.cos(mx * Math.PI * x), cosY = Math.cos(my * Math.PI * y);
  const amplitude = positive(peakDisplacementMm);
  const displacementMm = amplitude * sinX * sinY;
  const curvatureXPerMm = -amplitude * ax ** 2 * sinX * sinY;
  const curvatureYPerMm = -amplitude * ay ** 2 * sinX * sinY;
  const twistCurvaturePerMm = 2 * amplitude * ax * ay * cosX * cosY;
  const z = positive(thicknessMm) / 2;
  const strainX = -z * curvatureXPerMm;
  const strainY = -z * curvatureYPerMm;
  const engineeringShearStrain = -z * twistCurvaturePerMm;
  const averageStrain = (strainX + strainY) / 2;
  const radius = Math.hypot((strainX - strainY) / 2, engineeringShearStrain / 2);
  const principalStrain1 = averageStrain + radius, principalStrain2 = averageStrain - radius;
  const governingPrincipalStrain = Math.abs(principalStrain1) >= Math.abs(principalStrain2) ? principalStrain1 : principalStrain2;
  return {
    xFraction: x, yFraction: y, displacementMm, curvatureXPerMm, curvatureYPerMm, twistCurvaturePerMm,
    strainX, strainY, engineeringShearStrain, principalStrain1, principalStrain2, governingPrincipalStrain,
    surfaceStrainMicrostrain: governingPrincipalStrain * 1e6
  };
}

export function pcbModeCurvatureState({
  boardSpanXMm = 180, boardSpanYMm = 120, boardThicknessMm = 1.6,
  modeX = 1, modeY = 1, peakDisplacementMm = 0.3, components = []
} = {}) {
  const spanXMm = positive(boardSpanXMm), spanYMm = positive(boardSpanYMm), thicknessMm = positive(boardThicknessMm);
  const mx = Math.max(1, Math.round(positive(modeX, 1))), my = Math.max(1, Math.round(positive(modeY, 1)));
  const point = (xFraction, yFraction, orderX = mx, orderY = my) => plateModePoint({
    xFraction, yFraction, modeX: orderX, modeY: orderY, spanXMm, spanYMm, thicknessMm, peakDisplacementMm
  });
  const xCount = 31, yCount = 21;
  const grid = Array.from({ length: yCount }, (_, iy) => Array.from({ length: xCount }, (_, ix) => point(ix / (xCount - 1), iy / (yCount - 1))));
  const flat = grid.flat();
  const maxima = {
    displacementMm: Math.max(...flat.map(item => Math.abs(item.displacementMm)), Number.EPSILON),
    curvatureXPerMm: Math.max(...flat.map(item => Math.abs(item.curvatureXPerMm)), Number.EPSILON),
    curvatureYPerMm: Math.max(...flat.map(item => Math.abs(item.curvatureYPerMm)), Number.EPSILON),
    surfaceStrainMicrostrain: Math.max(...flat.map(item => Math.abs(item.surfaceStrainMicrostrain)), Number.EPSILON)
  };
  flat.forEach(item => {
    item.normalizedDisplacement = item.displacementMm / maxima.displacementMm;
    item.normalizedCurvatureX = item.curvatureXPerMm / maxima.curvatureXPerMm;
    item.normalizedCurvatureY = item.curvatureYPerMm / maxima.curvatureYPerMm;
    item.normalizedSurfaceStrain = item.surfaceStrainMicrostrain / maxima.surfaceStrainMicrostrain;
  });
  const componentRows = components.map((component, index) => {
    const local = point(component.xFraction, component.yFraction);
    return {
      name: String(component.name || `C${index + 1}`), xFraction: local.xFraction, yFraction: local.yFraction,
      axis: String(component.axis || 'x').toLowerCase() === 'y' ? 'y' : 'x',
      displacementMm: local.displacementMm, curvatureXPerMm: local.curvatureXPerMm, curvatureYPerMm: local.curvatureYPerMm,
      surfaceStrainMicrostrain: local.surfaceStrainMicrostrain,
      modeParticipation: Math.abs(local.displacementMm) / maxima.displacementMm
    };
  }).sort((a, b) => Math.abs(b.surfaceStrainMicrostrain) - Math.abs(a.surfaceStrainMicrostrain));
  const baseWaveNumber = 1 / spanXMm ** 2 + 1 / spanYMm ** 2;
  const modeCards = PCB_MODE_ORDERS.map(([orderX, orderY]) => {
    const cardGrid = Array.from({ length: 7 }, (_, iy) => Array.from({ length: 11 }, (_, ix) => point(ix / 10, iy / 6, orderX, orderY)));
    return {
      modeX: orderX, modeY: orderY,
      frequencyRatio: (orderX ** 2 / spanXMm ** 2 + orderY ** 2 / spanYMm ** 2) / baseWaveNumber,
      values: cardGrid.map(row => row.map(item => item.displacementMm / positive(peakDisplacementMm)))
    };
  });
  return {
    boardSpanXMm: spanXMm, boardSpanYMm: spanYMm, boardThicknessMm: thicknessMm,
    modeX: mx, modeY: my, peakDisplacementMm: positive(peakDisplacementMm), grid, maxima,
    componentRows, controllingComponent: componentRows[0] || null, modeCards,
    frequencyRatio: (mx ** 2 / spanXMm ** 2 + my ** 2 / spanYMm ** 2) / baseWaveNumber,
    fieldBasis: 'Simply supported sine-mode curvature with linear top-surface plate strain'
  };
}

export function parseComponentTable(text) {
  const rows = String(text ?? '').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  return rows.map((line, index) => {
    const fields = line.split(',').map(value => value.trim());
    if (fields.length < 6) throw new Error(`Component row ${index + 1} must contain name, x, y, length_mm, axis, package.`);
    const [name, xFraction, yFraction, lengthMm, axis, packageKey] = fields;
    if (!STEINBERG_COMPONENTS[packageKey]) throw new Error(`Component row ${index + 1} package must be one of ${Object.keys(STEINBERG_COMPONENTS).join(', ')}.`);
    return { name, xFraction: Number(xFraction), yFraction: Number(yFraction), lengthMm: Number(lengthMm), axis, package: packageKey };
  });
}

function logGamma(z) {
  const p = [0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.5073432786869, -0.1385710952657201, 9.984369578019572e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  let x = p[0], q = z - 1;
  for (let index = 1; index < p.length; index += 1) x += p[index] / (q + index);
  const t = q + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (q + 0.5) * Math.log(t) - t + Math.log(x);
}

export function spectralFatigueComparisonState({ stressRms = 10, referenceStress = 40, referenceCycles = STEINBERG_REFERENCE_CYCLES, fatigueExponent = 6.4, cycleRateHz = 300, durationSeconds = 60, repeats = 1 } = {}) {
  const sigma = positive(stressRms), reference = positive(referenceStress), Nref = positive(referenceCycles), b = positive(fatigueExponent);
  const cycles = positive(cycleRateHz) * positive(durationSeconds) * positive(repeats);
  const bands = [
    { level: 1, fraction: 0.683 },
    { level: 2, fraction: 0.271 },
    { level: 3, fraction: 0.0433 }
  ].map(item => {
    const amplitude = item.level * sigma;
    const cyclesAtLevel = cycles * item.fraction;
    const cyclesToFailure = Nref * (reference / amplitude) ** b;
    return { ...item, amplitude, cyclesAtLevel, cyclesToFailure, damage: cyclesAtLevel / cyclesToFailure };
  });
  const threeBandDamage = bands.reduce((sum, band) => sum + band.damage, 0);
  const rayleighMoment = sigma ** b * 2 ** (b / 2) * Math.exp(logGamma(1 + b / 2));
  const rayleighDamage = cycles / Nref * rayleighMoment / reference ** b;
  const amplitudes = Array.from({ length: 121 }, (_, index) => 5 * sigma * index / 120);
  const rayleighPdf = amplitudes.map(amplitude => amplitude / sigma ** 2 * Math.exp(-(amplitude ** 2) / (2 * sigma ** 2)));
  const damageDensity = amplitudes.map((amplitude, index) => cycles / Nref * rayleighPdf[index] * (amplitude / reference) ** b);
  const cumulativeDamage = cumulativeTrapz(amplitudes, damageDensity);
  return {
    cycles, bands, threeBandDamage, rayleighDamage, rayleighToThreeBandRatio: rayleighDamage / threeBandDamage,
    threeBandFraction: bands.reduce((sum, band) => sum + band.fraction, 0), amplitudes, rayleighPdf, damageDensity, cumulativeDamage,
    plus3DbDamageFactor: 2 ** (b / 2), fatigueExponent: b
  };
}

function deterministicRandom(seed = 537) {
  let value = Math.max(1, Math.floor(Math.abs(finite(seed, 537)))) >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function turningPoints(values) {
  if (values.length < 3) return values.map((value, index) => ({ index, value }));
  const points = [{ index: 0, value: values[0] }];
  for (let index = 1; index < values.length - 1; index += 1) {
    const left = values[index] - values[index - 1], right = values[index + 1] - values[index];
    if ((left >= 0 && right < 0) || (left <= 0 && right > 0)) points.push({ index, value: values[index] });
  }
  points.push({ index: values.length - 1, value: values.at(-1) });
  return points;
}

function rainflowCycles(points) {
  const stack = [], cycles = [];
  for (const point of points) {
    stack.push(point);
    while (stack.length >= 3) {
      const a = stack.at(-3), b = stack.at(-2), c = stack.at(-1);
      const firstRange = Math.abs(b.value - a.value), secondRange = Math.abs(c.value - b.value);
      if (secondRange < firstRange) break;
      const cycle = { range: firstRange, amplitude: firstRange / 2, mean: (a.value + b.value) / 2 };
      if (stack.length === 3) {
        cycles.push({ ...cycle, count: 0.5 });
        stack.shift();
      } else {
        cycles.push({ ...cycle, count: 1 });
        stack.splice(stack.length - 3, 2);
      }
    }
  }
  for (let index = 0; index < stack.length - 1; index += 1) {
    const range = Math.abs(stack[index + 1].value - stack[index].value);
    cycles.push({ range, amplitude: range / 2, mean: (stack[index + 1].value + stack[index].value) / 2, count: 0.5 });
  }
  return cycles.filter(cycle => cycle.amplitude > Number.EPSILON);
}

export function synthesizedRainflowState({
  stressRms = 10, dominantFrequencyHz = 300, fractionalBandwidth = 0.2,
  durationSeconds = 60, repeats = 1, referenceStress = 40,
  referenceCycles = STEINBERG_REFERENCE_CYCLES, fatigueExponent = 6.4, seed = 537
} = {}) {
  const sigma = positive(stressRms), frequency = positive(dominantFrequencyHz), bandwidth = clamp(positive(fractionalBandwidth), 0.02, 1.2);
  const fullDurationSeconds = positive(durationSeconds), repeatCount = positive(repeats), b = positive(fatigueExponent);
  const displayDurationSeconds = Math.min(fullDurationSeconds, Math.max(0.08, 18 / frequency));
  const sampleCount = 1024, random = deterministicRandom(seed), componentCount = 32;
  const components = Array.from({ length: componentCount }, () => {
    const offset = (2 * random() - 1) * bandwidth / 2;
    const weight = Math.exp(-0.5 * (offset / Math.max(bandwidth / 4, 0.01)) ** 2);
    return { frequency: frequency * Math.max(0.05, 1 + offset), phase: 2 * Math.PI * random(), weight };
  });
  const time = Array.from({ length: sampleCount }, (_, index) => displayDurationSeconds * index / (sampleCount - 1));
  const raw = time.map(t => components.reduce((sum, component) => sum + component.weight * Math.cos(2 * Math.PI * component.frequency * t + component.phase), 0));
  const mean = raw.reduce((sum, value) => sum + value, 0) / raw.length;
  const rawRms = Math.sqrt(raw.reduce((sum, value) => sum + (value - mean) ** 2, 0) / raw.length);
  const stress = raw.map(value => (value - mean) * sigma / Math.max(rawRms, Number.EPSILON));
  const reversals = turningPoints(stress);
  const cycleScale = fullDurationSeconds / displayDurationSeconds * repeatCount;
  const reference = positive(referenceStress), Nref = positive(referenceCycles);
  const cycles = rainflowCycles(reversals).map(cycle => {
    const scaledCount = cycle.count * cycleScale;
    const cyclesToFailure = Nref * (reference / Math.max(cycle.amplitude, Number.EPSILON)) ** b;
    return { ...cycle, scaledCount, cyclesToFailure, damage: scaledCount / cyclesToFailure };
  });
  const totalDamage = cycles.reduce((sum, cycle) => sum + cycle.damage, 0);
  const amplitudeMax = Math.max(3 * sigma, ...cycles.map(cycle => cycle.amplitude), Number.EPSILON);
  const amplitudeEdges = Array.from({ length: 13 }, (_, index) => amplitudeMax * index / 12);
  const damageByAmplitude = amplitudeEdges.slice(0, -1).map((low, index) => ({
    low, high: amplitudeEdges[index + 1], amplitude: (low + amplitudeEdges[index + 1]) / 2, count: 0, damage: 0
  }));
  cycles.forEach(cycle => {
    const index = clamp(Math.floor(cycle.amplitude / amplitudeMax * damageByAmplitude.length), 0, damageByAmplitude.length - 1);
    damageByAmplitude[index].count += cycle.scaledCount;
    damageByAmplitude[index].damage += cycle.damage;
  });
  damageByAmplitude.forEach(bin => { bin.damageShare = totalDamage > 0 ? bin.damage / totalDamage : 0; });
  const meanLimit = Math.max(3 * sigma, ...cycles.map(cycle => Math.abs(cycle.mean)), Number.EPSILON);
  const matrix = Array.from({ length: 9 }, () => Array.from({ length: 10 }, () => ({ count: 0, damage: 0 })));
  cycles.forEach(cycle => {
    const amplitudeIndex = clamp(Math.floor(cycle.amplitude / amplitudeMax * 10), 0, 9);
    const meanIndex = clamp(Math.floor((cycle.mean + meanLimit) / (2 * meanLimit) * 9), 0, 8);
    matrix[meanIndex][amplitudeIndex].count += cycle.scaledCount;
    matrix[meanIndex][amplitudeIndex].damage += cycle.damage;
  });
  const rms = Math.sqrt(stress.reduce((sum, value) => sum + value ** 2, 0) / stress.length);
  const maxAbsoluteStress = Math.max(...stress.map(Math.abs));
  return {
    time, stress, reversals, cycles, damageByAmplitude, matrix,
    stressRms: rms, targetStressRms: sigma, dominantFrequencyHz: frequency, fractionalBandwidth: bandwidth,
    displayDurationSeconds, fullDurationSeconds, repeats: repeatCount, cycleScale,
    referenceStress: reference, referenceCycles: Nref, fatigueExponent: b, totalDamage,
    amplitudeMax, meanLimit, maxAbsoluteStress, maximumSigma: maxAbsoluteStress / sigma,
    threeSigmaSampleCount: stress.filter(value => Math.abs(value) > 3 * sigma).length,
    seed: Math.max(1, Math.floor(Math.abs(finite(seed, 537)))), processLabel: 'Deterministic synthesized stationary Gaussian narrowband response'
  };
}

export function pcbTestLayoutState({ correlationState = {}, selectedChannel = 'SG-1' } = {}) {
  const channels = [
    { id: 'CTRL-1', type: 'control accelerometer', quantity: 'fixture input', location: 'fixture', xFraction: -0.04, yFraction: 1.08, direction: 'Z', closes: 'Controller-to-fixture input' },
    { id: 'RESP-1', type: 'miniature response accelerometer', quantity: 'PCB acceleration', location: 'board', xFraction: 0.50, yFraction: 0.50, direction: 'Z', closes: 'Mode frequency, Q, and response' },
    { id: 'RESP-2', type: 'miniature response accelerometer', quantity: 'mode-shape response', location: 'board', xFraction: 0.82, yFraction: 0.72, direction: 'Z', closes: 'Spatial mode-shape pairing' },
    { id: 'SG-1', type: 'biaxial strain rosette', quantity: 'local board strain', location: 'board', xFraction: 0.58, yFraction: 0.45, direction: 'X/Y', closes: 'Curvature-to-attachment deformation' },
    { id: 'DISP-1', type: 'relative-displacement probe', quantity: 'board-to-package motion', location: 'board', xFraction: 0.68, yFraction: 0.42, direction: 'Z', closes: 'Steinberg response basis' },
    { id: 'E-1', type: 'electrical continuity monitor', quantity: 'intermittent opens', location: 'board', xFraction: 0.67, yFraction: 0.42, direction: '—', closes: 'Observed electrical failure boundary' }
  ];
  const selected = channels.find(channel => channel.id === selectedChannel) || channels[3];
  const evidenceChain = [
    { stage: 'Fixture control', channelId: 'CTRL-1', quantity: 'base acceleration', evidence: 'Input reproduced' },
    { stage: 'Board dynamics', channelId: 'RESP-1 / RESP-2', quantity: 'frequency, Q, shape', evidence: 'Mode paired' },
    { stage: 'Local deformation', channelId: 'SG-1 / DISP-1', quantity: 'strain and relative motion', evidence: 'Failure driver reproduced' },
    { stage: 'Functional outcome', channelId: 'E-1', quantity: 'continuity event', evidence: 'Observed boundary retained' }
  ];
  return {
    channels, selected, evidenceChain,
    frequencyPass: Boolean(correlationState.frequencyPass), responsePass: Boolean(correlationState.responsePass),
    correlationPass: Boolean(correlationState.passes),
    frequencyErrorPercent: finite(correlationState.frequencyErrorPercent),
    responseDifferenceDb: finite(correlationState.peakResponseDifferenceDb),
    damageRatio: positive(correlationState.damageRatio, 1),
    planBasis: 'Conceptual instrumentation layout; select actual sensors and assess mass loading, range, noise, attachment, and DAQ uncertainty separately.'
  };
}

export function parseDamageLedger(text) {
  const rows = String(text ?? '').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  return rows.map((line, index) => {
    const fields = line.split(',').map(value => value.trim());
    if (fields.length < 5) throw new Error(`Ledger row ${index + 1} must contain event, response_3sigma_mm, duration_s, repeats, cycle_rate_hz.`);
    return { name: fields[0], response3SigmaMm: Number(fields[1]), durationSeconds: Number(fields[2]), repeats: Number(fields[3]), cycleRateHz: Number(fields[4]) };
  });
}

export function steinbergDamageLedgerState({ allowable3SigmaMm = 0.3, referenceCycles = STEINBERG_REFERENCE_CYCLES, fatigueExponent = 6.4, events = [] } = {}) {
  const allowable = positive(allowable3SigmaMm), Nref = positive(referenceCycles), b = positive(fatigueExponent);
  const rows = events.map((event, index) => {
    const response = positive(event.response3SigmaMm), cycles = positive(event.durationSeconds) * positive(event.repeats) * positive(event.cycleRateHz);
    const demandRatio = response / allowable;
    const cyclesToFailure = Nref / demandRatio ** b;
    return { name: String(event.name || `Event ${index + 1}`), response3SigmaMm: response, durationSeconds: positive(event.durationSeconds), repeats: positive(event.repeats), cycleRateHz: positive(event.cycleRateHz), cycles, demandRatio, cyclesToFailure, damage: cycles / cyclesToFailure };
  });
  const totalDamage = rows.reduce((sum, row) => sum + row.damage, 0);
  let cumulativeDamage = 0;
  rows.forEach(row => {
    cumulativeDamage += row.damage;
    row.cumulativeDamage = cumulativeDamage;
    row.damageShare = totalDamage > 0 ? row.damage / totalDamage : 0;
  });
  const controlling = [...rows].sort((a, bRow) => bRow.damage - a.damage)[0] ?? null;
  return { rows, totalDamage, lifeMargin: 1 / Math.max(totalDamage, Number.EPSILON) - 1, passes: totalDamage <= 1, controlling, fatigueExponent: b };
}

export function threeSigmaDurationState({ durationSeconds = 60, independentPeakRateHz = 300 } = {}) {
  const samples = Math.max(1, positive(durationSeconds) * positive(independentPeakRateHz));
  const singleInside = 0.9973002039367398;
  const exceedanceProbability = 1 - singleInside ** samples;
  const expectedPeakFactor = Math.sqrt(2 * Math.log(Math.max(2, 2 * samples)));
  return { samples, exceedanceProbability, expectedPeakFactor };
}

export function pcbDesignTradeState({
  referenceSpanMm = 180, effectiveSpanMm = 180, referenceThicknessMm = 1.6, thicknessMm = 1.6,
  referenceNaturalFrequencyHz = 300, referenceCenter3SigmaMm = 0.3, localPsdSlope = 0,
  componentLengthMm = 25, componentCoefficient = 1.75, locationFactor = 1, includeDesignGrid = true
} = {}) {
  const calculateFor = (h, span) => {
    const frequencyRatio = (positive(h) / positive(referenceThicknessMm)) * (positive(referenceSpanMm) / positive(span)) ** 2;
    const naturalFrequencyHz = positive(referenceNaturalFrequencyHz) * frequencyRatio;
    const psdRatio = frequencyRatio ** finite(localPsdSlope, 0);
    const center3SigmaMm = positive(referenceCenter3SigmaMm) * frequencyRatio ** -1.5 * Math.sqrt(psdRatio);
    const allowableCenterMm = steinbergAllowableDisplacement({ boardSpanMm: span, boardThicknessMm: h, componentLengthMm, componentCoefficient, locationFactor });
    const demandRatio = center3SigmaMm / allowableCenterMm;
    return { thicknessMm: h, effectiveSpanMm: span, naturalFrequencyHz, center3SigmaMm, allowableCenterMm, demandRatio, marginOfSafety: 1 / demandRatio - 1 };
  };
  const calculate = h => calculateFor(h, effectiveSpanMm);
  const state = calculate(positive(thicknessMm));
  const thicknesses = Array.from({ length: 41 }, (_, index) => positive(referenceThicknessMm) * (0.5 + 2 * index / 40));
  const spans = Array.from({ length: 31 }, (_, index) => positive(referenceSpanMm) * (0.35 + 0.85 * index / 30));
  const designGrid = includeDesignGrid ? spans.map(span => thicknesses.map(thickness => calculateFor(thickness, span))) : [];
  return { ...state, curve: thicknesses.map(calculate), thicknesses, spans, designGrid, frequencyScaling: 'fₙ ∝ h/B²', responseScaling: 'zRMS ∝ √(fₙSa)/fₙ²' };
}

export function pcbTestCorrelationState({
  predictedNaturalFrequencyHz = 320, measuredNaturalFrequencyHz = 295,
  predictedQualityFactor = 10, measuredQualityFactor = 7,
  predictedPeakResponseMm = 0.24, measuredPeakResponseMm = 0.29,
  fatigueExponent = 6.4, frequencyTolerancePercent = 10, responseToleranceDb = 3
} = {}) {
  const fp = positive(predictedNaturalFrequencyHz), fm = positive(measuredNaturalFrequencyHz);
  const qp = positive(predictedQualityFactor), qm = positive(measuredQualityFactor);
  const zp = positive(predictedPeakResponseMm), zm = positive(measuredPeakResponseMm);
  const low = Math.max(1, 0.35 * Math.min(fp, fm));
  const high = 2.2 * Math.max(fp, fm);
  const frequencies = Array.from({ length: 321 }, (_, index) => low * (high / low) ** (index / 320));
  const responseCurve = (frequency, naturalFrequency, qualityFactor, peak) => {
    const r = frequency / naturalFrequency;
    const denominator = Math.sqrt((1 - r * r) ** 2 + (r / qualityFactor) ** 2);
    return peak / Math.max(qualityFactor * denominator, Number.EPSILON);
  };
  const predictedResponse = frequencies.map(frequency => responseCurve(frequency, fp, qp, zp));
  const measuredResponse = frequencies.map(frequency => responseCurve(frequency, fm, qm, zm));
  const responseRatioDb = frequencies.map((_, index) => 20 * Math.log10(Math.max(measuredResponse[index], Number.EPSILON) / Math.max(predictedResponse[index], Number.EPSILON)));
  const frequencyErrorPercent = 100 * (fm / fp - 1);
  const peakResponseRatio = zm / zp;
  const peakResponseDifferenceDb = 20 * Math.log10(peakResponseRatio);
  const damageRatio = peakResponseRatio ** positive(fatigueExponent);
  const frequencyPass = Math.abs(frequencyErrorPercent) <= Math.abs(finite(frequencyTolerancePercent, 10));
  const responsePass = Math.abs(peakResponseDifferenceDb) <= Math.abs(finite(responseToleranceDb, 3));
  return {
    frequencies, predictedResponse, measuredResponse, responseRatioDb,
    predictedNaturalFrequencyHz: fp, measuredNaturalFrequencyHz: fm,
    predictedQualityFactor: qp, measuredQualityFactor: qm,
    predictedPeakResponseMm: zp, measuredPeakResponseMm: zm,
    frequencyErrorPercent, peakResponseRatio, peakResponseDifferenceDb, damageRatio,
    frequencyTolerancePercent: Math.abs(finite(frequencyTolerancePercent, 10)),
    responseToleranceDb: Math.abs(finite(responseToleranceDb, 3)),
    frequencyPass, responsePass, passes: frequencyPass && responsePass
  };
}
