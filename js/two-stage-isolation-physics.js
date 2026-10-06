export const TWO_STAGE_G0 = 9.80665;

const finitePositive = (value, label) => {
  const number = Number(value);
  if (!(number > 0) || !Number.isFinite(number)) throw new Error(`${label} must be a finite value greater than zero.`);
  return number;
};

export const complex = (re = 0, im = 0) => ({ re: Number(re), im: Number(im) });
export const complexAdd = (a, b) => complex(a.re + b.re, a.im + b.im);
export const complexSubtract = (a, b) => complex(a.re - b.re, a.im - b.im);
export const complexMultiply = (a, b) => complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const complexScale = (a, scale) => complex(a.re * scale, a.im * scale);
export const complexMagnitude = value => Math.hypot(value.re, value.im);
export const complexPhaseDeg = value => Math.atan2(value.im, value.re) * 180 / Math.PI;
export function complexDivide(a, b) {
  const denominator = b.re * b.re + b.im * b.im;
  if (!(denominator > 0) || !Number.isFinite(denominator)) throw new Error('Complex division encountered a singular denominator.');
  return complex((a.re * b.re + a.im * b.im) / denominator, (a.im * b.re - a.re * b.im) / denominator);
}

const asComplex = value => typeof value === 'number' ? complex(value, 0) : complex(value?.re, value?.im);

/**
 * Pivoted complex Gaussian elimination. This deliberately solves Dq=b rather
 * than forming D^-1, and provides the reusable seam for future larger systems.
 */
export function solveComplexLinearSystem(matrixInput, rhsInput) {
  const size = matrixInput.length;
  if (!size || matrixInput.some(row => row.length !== size) || rhsInput.length !== size) throw new Error('Complex linear system dimensions are inconsistent.');
  const matrix = matrixInput.map(row => row.map(asComplex));
  const rhs = rhsInput.map(asComplex);
  const matrixScale = Math.max(1, ...matrix.flat().map(complexMagnitude));

  for (let column = 0; column < size; column++) {
    let pivotRow = column;
    for (let row = column + 1; row < size; row++) {
      if (complexMagnitude(matrix[row][column]) > complexMagnitude(matrix[pivotRow][column])) pivotRow = row;
    }
    if (complexMagnitude(matrix[pivotRow][column]) <= matrixScale * 1e-14) throw new Error('Dynamic stiffness matrix is singular at this frequency. Add damping or move off the exact undamped resonance.');
    if (pivotRow !== column) {
      [matrix[column], matrix[pivotRow]] = [matrix[pivotRow], matrix[column]];
      [rhs[column], rhs[pivotRow]] = [rhs[pivotRow], rhs[column]];
    }
    const pivot = matrix[column][column];
    for (let row = column + 1; row < size; row++) {
      const factor = complexDivide(matrix[row][column], pivot);
      matrix[row][column] = complex(0, 0);
      for (let entry = column + 1; entry < size; entry++) matrix[row][entry] = complexSubtract(matrix[row][entry], complexMultiply(factor, matrix[column][entry]));
      rhs[row] = complexSubtract(rhs[row], complexMultiply(factor, rhs[column]));
    }
  }

  const solution = Array.from({ length: size }, () => complex());
  for (let row = size - 1; row >= 0; row--) {
    let remainder = rhs[row];
    for (let column = row + 1; column < size; column++) remainder = complexSubtract(remainder, complexMultiply(matrix[row][column], solution[column]));
    solution[row] = complexDivide(remainder, matrix[row][row]);
  }
  return solution;
}

export function assembleTwoStageMatrices(input) {
  const m1 = finitePositive(input.m1, 'Intermediate mass');
  const m2 = finitePositive(input.m2, 'Payload mass');
  const k1 = finitePositive(input.k1, 'Stage 1 stiffness');
  const k2 = finitePositive(input.k2, 'Stage 2 stiffness');
  const c1 = Number(input.c1 ?? 0);
  const c2 = Number(input.c2 ?? 0);
  if (!(c1 >= 0) || !Number.isFinite(c1) || !(c2 >= 0) || !Number.isFinite(c2)) throw new Error('Stage damping coefficients must be finite and non-negative.');
  return {
    m1, m2, k1, k2, c1, c2,
    M: [[m1, 0], [0, m2]],
    C: [[c1 + c2, -c2], [-c2, c2]],
    K: [[k1 + k2, -k2], [-k2, k2]],
    baseStiffness: [k1, 0],
    baseDamping: [c1, 0]
  };
}

export function stageDampingCoefficients({ m1, m2, k1, k2, stage1Mode = 'ratio', stage2Mode = 'ratio', zeta1 = 0, zeta2 = 0, c1 = 0, c2 = 0 }) {
  m1 = finitePositive(m1, 'Intermediate mass');
  m2 = finitePositive(m2, 'Payload mass');
  k1 = finitePositive(k1, 'Stage 1 stiffness');
  k2 = finitePositive(k2, 'Stage 2 stiffness');
  const totalMass = m1 + m2;
  const reducedMass = m1 * m2 / totalMass;
  const coefficient1 = stage1Mode === 'coefficient' ? Number(c1) : 2 * Number(zeta1) * Math.sqrt(k1 * totalMass);
  const coefficient2 = stage2Mode === 'coefficient' ? Number(c2) : 2 * Number(zeta2) * Math.sqrt(k2 * reducedMass);
  if (!(coefficient1 >= 0) || !Number.isFinite(coefficient1) || !(coefficient2 >= 0) || !Number.isFinite(coefficient2)) throw new Error('Damping inputs must be finite and non-negative.');
  return { c1: coefficient1, c2: coefficient2, stage1ReferenceMass: totalMass, stage2ReferenceMass: reducedMass };
}

export function twoStageResponseAtFrequency(input, frequencyHz) {
  const matrices = assembleTwoStageMatrices(input);
  const frequency = finitePositive(frequencyHz, 'Frequency');
  const omega = 2 * Math.PI * frequency;
  const dynamic = matrices.K.map((row, i) => row.map((stiffness, j) => complex(stiffness - omega * omega * matrices.M[i][j], omega * matrices.C[i][j])));
  const rhs = matrices.baseStiffness.map((stiffness, index) => complex(stiffness, omega * matrices.baseDamping[index]));
  const [x1, x2] = solveComplexLinearSystem(dynamic, rhs);
  const base = complex(1, 0);
  const relative1 = complexSubtract(x1, base);
  const relative2 = complexSubtract(x2, x1);
  const stage1Impedance = complex(matrices.k1, omega * matrices.c1);
  const stage2Impedance = complex(matrices.k2, omega * matrices.c2);
  return {
    frequencyHz: frequency,
    omega,
    x1,
    x2,
    relative1,
    relative2,
    force1PerBaseDisplacement: complexMultiply(stage1Impedance, relative1),
    force2PerBaseDisplacement: complexMultiply(stage2Impedance, relative2)
  };
}

export function twoStageUndampedModes(input) {
  const { m1, m2, k1, k2, C } = assembleTwoStageMatrices({ ...input, c1: input.c1 ?? 0, c2: input.c2 ?? 0 });
  const quadraticA = m1 * m2;
  const quadraticB = k1 * m2 + k2 * (m1 + m2);
  const discriminant = Math.max(0, quadraticB * quadraticB - 4 * quadraticA * k1 * k2);
  const lambdaValues = [(quadraticB - Math.sqrt(discriminant)) / (2 * quadraticA), (quadraticB + Math.sqrt(discriminant)) / (2 * quadraticA)];
  return lambdaValues.map((lambda, index) => {
    const omega = Math.sqrt(Math.max(0, lambda));
    let shape = [(k2 - lambda * m2) / k2, 1];
    const maximum = Math.max(...shape.map(Math.abs), 1e-30);
    shape = shape.map(value => value / maximum);
    if (shape[1] < 0) shape = shape.map(value => -value);
    const modalMass = m1 * shape[0] * shape[0] + m2 * shape[1] * shape[1];
    const modalDamping = shape[0] * (C[0][0] * shape[0] + C[0][1] * shape[1]) + shape[1] * (C[1][0] * shape[0] + C[1][1] * shape[1]);
    const dampingRatio = omega > 0 ? modalDamping / (2 * omega * modalMass) : 0;
    return {
      number: index + 1,
      eigenvalue: lambda,
      omegaRadPerSec: omega,
      frequencyHz: omega / (2 * Math.PI),
      dampingRatio,
      dampedFrequencyHz: dampingRatio < 1 ? omega * Math.sqrt(Math.max(0, 1 - dampingRatio * dampingRatio)) / (2 * Math.PI) : 0,
      shape,
      phaseRelation: shape[0] * shape[1] >= 0 ? 'in phase' : 'out of phase'
    };
  });
}

export function equivalentSeriesStiffness(k1, k2) {
  k1 = finitePositive(k1, 'Stage 1 stiffness');
  k2 = finitePositive(k2, 'Stage 2 stiffness');
  return k1 * k2 / (k1 + k2);
}

export function singleStageResponseAtFrequency({ mass, stiffness, dampingRatio = 0 }, frequencyHz) {
  mass = finitePositive(mass, 'Single-stage supported mass');
  stiffness = finitePositive(stiffness, 'Single-stage stiffness');
  const zeta = Number(dampingRatio);
  if (!(zeta >= 0) || !Number.isFinite(zeta)) throw new Error('Single-stage damping ratio must be finite and non-negative.');
  const omega = 2 * Math.PI * finitePositive(frequencyHz, 'Frequency');
  const damping = 2 * zeta * Math.sqrt(stiffness * mass);
  return complexDivide(complex(stiffness, omega * damping), complex(stiffness - mass * omega * omega, omega * damping));
}

export function logarithmicFrequencyGrid(minimumHz, maximumHz, pointsPerDecade = 48) {
  const minimum = finitePositive(minimumHz, 'Minimum frequency');
  const maximum = finitePositive(maximumHz, 'Maximum frequency');
  if (!(maximum > minimum)) throw new Error('Maximum frequency must be greater than minimum frequency.');
  const resolution = Math.max(8, Math.min(240, Math.round(Number(pointsPerDecade) || 48)));
  const count = Math.max(2, Math.ceil(Math.log10(maximum / minimum) * resolution) + 1);
  return Array.from({ length: count }, (_, index) => minimum * (maximum / minimum) ** (index / (count - 1)));
}

export function unwrapPhaseDegrees(values) {
  if (!values.length) return [];
  const output = [values[0]];
  for (let index = 1; index < values.length; index++) {
    let value = values[index];
    while (value - output[index - 1] > 180) value -= 360;
    while (value - output[index - 1] < -180) value += 360;
    output.push(value);
  }
  return output;
}

export function estimateLogSlopeDbPerDecade(frequencies, magnitudes, minimumFrequency = 0) {
  const samples = frequencies.map((frequency, index) => ({ x: Math.log10(frequency), y: 20 * Math.log10(Math.max(magnitudes[index], 1e-300)), frequency })).filter(sample => sample.frequency >= minimumFrequency && Number.isFinite(sample.x) && Number.isFinite(sample.y));
  if (samples.length < 3) return NaN;
  const meanX = samples.reduce((sum, sample) => sum + sample.x, 0) / samples.length;
  const meanY = samples.reduce((sum, sample) => sum + sample.y, 0) / samples.length;
  const denominator = samples.reduce((sum, sample) => sum + (sample.x - meanX) ** 2, 0);
  return denominator > 0 ? samples.reduce((sum, sample) => sum + (sample.x - meanX) * (sample.y - meanY), 0) / denominator : NaN;
}

export function findLocalPeaks(frequencies, magnitudes, count = 2) {
  const peaks = [];
  for (let index = 1; index < magnitudes.length - 1; index++) {
    if (magnitudes[index] >= magnitudes[index - 1] && magnitudes[index] > magnitudes[index + 1]) peaks.push({ frequencyHz: frequencies[index], magnitude: magnitudes[index], index });
  }
  return peaks.sort((a, b) => b.magnitude - a.magnitude).slice(0, count).sort((a, b) => a.frequencyHz - b.frequencyHz);
}

export function sustainedThresholdFrequency(frequencies, magnitudes, threshold) {
  let lastFailure = -1;
  for (let index = 0; index < magnitudes.length; index++) if (!(magnitudes[index] < threshold)) lastFailure = index;
  if (lastFailure >= frequencies.length - 1) return null;
  return frequencies[lastFailure + 1];
}

export function analyzeTwoStageIsolation(input) {
  const matrices = assembleTwoStageMatrices(input);
  const frequencies = logarithmicFrequencyGrid(input.minimumFrequencyHz, input.maximumFrequencyHz, input.pointsPerDecade);
  const modes = twoStageUndampedModes(matrices);
  const responses = frequencies.map(frequency => {
    try { return twoStageResponseAtFrequency(matrices, frequency); }
    catch { return null; }
  });
  const magnitude = response => response ? complexMagnitude(response) : NaN;
  const x1Magnitude = responses.map(response => magnitude(response?.x1));
  const x2Magnitude = responses.map(response => magnitude(response?.x2));
  const relative1Magnitude = responses.map(response => magnitude(response?.relative1));
  const relative2Magnitude = responses.map(response => magnitude(response?.relative2));
  const phase1Deg = unwrapPhaseDegrees(responses.map(response => response ? complexPhaseDeg(response.x1) : NaN));
  const phase2Deg = unwrapPhaseDegrees(responses.map(response => response ? complexPhaseDeg(response.x2) : NaN));
  const phaseDifferenceDeg = unwrapPhaseDegrees(responses.map(response => response ? complexPhaseDeg(complexDivide(response.x2, response.x1)) : NaN));
  const antiresonanceHz = Math.sqrt(matrices.k2 / matrices.m2) / (2 * Math.PI);
  const slopeStart = Math.max(input.maximumFrequencyHz / 5, modes[1].frequencyHz * 1.5);
  const fallbackSlopeStart = input.maximumFrequencyHz / 3;
  let highFrequencySlopeDbPerDecade = estimateLogSlopeDbPerDecade(frequencies, x2Magnitude, slopeStart);
  if (!Number.isFinite(highFrequencySlopeDbPerDecade)) highFrequencySlopeDbPerDecade = estimateLogSlopeDbPerDecade(frequencies, x2Magnitude, fallbackSlopeStart);
  return {
    ...matrices,
    frequencies,
    responses,
    x1Magnitude,
    x2Magnitude,
    relative1Magnitude,
    relative2Magnitude,
    phase1Deg,
    phase2Deg,
    phaseDifferenceDeg,
    modes,
    antiresonanceHz,
    payloadPeaks: findLocalPeaks(frequencies, x2Magnitude, 2),
    highFrequencySlopeDbPerDecade,
    thresholdFrequencies: {
      unity: sustainedThresholdFrequency(frequencies, x2Magnitude, 1),
      minus10: sustainedThresholdFrequency(frequencies, x2Magnitude, 10 ** (-10 / 20)),
      minus20: sustainedThresholdFrequency(frequencies, x2Magnitude, .1),
      minus30: sustainedThresholdFrequency(frequencies, x2Magnitude, 10 ** (-30 / 20))
    }
  };
}
