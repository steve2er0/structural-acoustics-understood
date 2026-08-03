/* Reusable two-subsystem SEA coupling, power-injection, and uncertainty models. */

const TAU = 2 * Math.PI;

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback, name = 'Value') => {
  const result = finite(value, fallback);
  if (!(result > 0)) throw new Error(`${name} must be greater than zero.`);
  return result;
};
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function solveTwoByTwo(a, b, c, d, p, q) {
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < 1e-30) throw new Error('The SEA balance matrix is singular.');
  return [(p * d - b * q) / determinant, (a * q - p * c) / determinant];
}

export function reciprocalCoupling(eta12, modalDensity1, modalDensity2) {
  const coupling12 = Math.max(0, finite(eta12));
  const n1 = positive(modalDensity1, 0.08, 'Subsystem 1 modal density');
  const n2 = positive(modalDensity2, 0.04, 'Subsystem 2 modal density');
  return coupling12 * n1 / n2;
}

export function couplingPowerState(input = {}) {
  const frequency = positive(input.frequency, 1000, 'Frequency');
  const omega = TAU * frequency;
  const n1 = positive(input.n1, 0.08, 'Subsystem 1 modal density');
  const n2 = positive(input.n2, 0.04, 'Subsystem 2 modal density');
  const eta12 = Math.max(0, finite(input.eta12, 0.02));
  const eta21 = input.eta21 == null ? reciprocalCoupling(eta12, n1, n2) : Math.max(0, finite(input.eta21));
  const E1 = Math.max(0, finite(input.E1));
  const E2 = Math.max(0, finite(input.E2));
  const gross12 = omega * eta12 * E1;
  const gross21 = omega * eta21 * E2;
  const net12 = gross12 - gross21;
  const modalEnergy1 = E1 / n1;
  const modalEnergy2 = E2 / n2;
  return {
    frequency, omega, n1, n2, eta12, eta21, E1, E2,
    modalEnergy1, modalEnergy2, gross12, gross21, net12,
    reciprocityRatio: eta21 > 0 ? n1 * eta12 / (n2 * eta21) : eta12 === 0 ? 1 : Infinity
  };
}

export function twoSubsystemEnergyBalance(input = {}) {
  const frequency = positive(input.frequency, 1000, 'Frequency');
  const omega = TAU * frequency;
  const n1 = positive(input.n1, 0.08, 'Subsystem 1 modal density');
  const n2 = positive(input.n2, 0.04, 'Subsystem 2 modal density');
  const eta1 = positive(input.eta1, 0.03, 'Subsystem 1 internal loss factor');
  const eta2 = positive(input.eta2, 0.05, 'Subsystem 2 internal loss factor');
  const eta12 = Math.max(0, finite(input.eta12, 0.02));
  const eta21 = input.eta21 == null ? reciprocalCoupling(eta12, n1, n2) : Math.max(0, finite(input.eta21));
  const P1 = Math.max(0, finite(input.P1, 1));
  const P2 = Math.max(0, finite(input.P2, 0));
  if (!(P1 + P2 > 0)) throw new Error('At least one subsystem must receive positive input power.');
  const a = omega * (eta1 + eta12);
  const b = -omega * eta21;
  const c = -omega * eta12;
  const d = omega * (eta2 + eta21);
  const [E1, E2] = solveTwoByTwo(a, b, c, d, P1, P2);
  const flow = couplingPowerState({ frequency, n1, n2, eta12, eta21, E1, E2 });
  const dissipation1 = omega * eta1 * E1;
  const dissipation2 = omega * eta2 * E2;
  const inputPower = P1 + P2;
  const balanceError = (dissipation1 + dissipation2 - inputPower) / inputPower;
  const couplingStrength = Math.max(eta12 / eta1, eta21 / eta2);
  const regime = couplingStrength < 0.25 ? 'weak coupling' : couplingStrength < 1 ? 'coupling competes with internal loss' : 'strong-coupling warning';
  return {
    ...flow, eta1, eta2, P1, P2, dissipation1, dissipation2,
    inputPower, balanceError, couplingStrength, regime,
    matrix: [[a, b], [c, d]]
  };
}

export function forwardClfExperiment(input = {}) {
  const frequency = positive(input.frequency, 1000, 'Frequency');
  const n1 = positive(input.n1, 0.08, 'Subsystem 1 modal density');
  const n2 = positive(input.n2, 0.04, 'Subsystem 2 modal density');
  const eta1 = positive(input.eta1, 0.012, 'Subsystem 1 internal loss factor');
  const eta2 = positive(input.eta2, 0.014, 'Subsystem 2 internal loss factor');
  const eta12 = Math.max(0, finite(input.eta12, 0.004));
  const eta21 = input.eta21 == null ? reciprocalCoupling(eta12, n1, n2) : Math.max(0, finite(input.eta21));
  const P1 = positive(input.P1, 1e-4, 'Injection power 1');
  const P2 = positive(input.P2, 1e-4, 'Injection power 2');
  const case1 = twoSubsystemEnergyBalance({ frequency, n1, n2, eta1, eta2, eta12, eta21, P1, P2: 0 });
  const case2 = twoSubsystemEnergyBalance({ frequency, n1, n2, eta1, eta2, eta12, eta21, P1: 0, P2 });
  return {
    frequency, n1, n2, eta1, eta2, eta12, eta21, P1, P2,
    E11: case1.E1, E21: case1.E2, E12: case2.E1, E22: case2.E2
  };
}

export function identifyClfExperiment(input = {}) {
  const frequency = positive(input.frequency, 1000, 'Frequency');
  const omega = TAU * frequency;
  const P1 = positive(input.P1, 1e-4, 'Injection power 1');
  const P2 = positive(input.P2, 1e-4, 'Injection power 2');
  const E11 = positive(input.E11, 1e-9, 'E11');
  const E21 = positive(input.E21, 2e-10, 'E21');
  const E12 = positive(input.E12, 2e-10, 'E12');
  const E22 = positive(input.E22, 9e-10, 'E22');
  const determinant = E21 * E12 - E11 * E22;
  const scale = Math.max(E11 * E22, E12 * E21, 1e-300);
  if (Math.abs(determinant) < 1e-12 * scale) throw new Error('The energy matrix is too close to singular for a stable CLF inversion.');
  const eta1 = (-E22 * P1 + E21 * P2) / (determinant * omega);
  const eta12 = -E21 * P2 / (determinant * omega);
  const eta21 = -E12 * P1 / (determinant * omega);
  const eta2 = (E12 * P1 - E11 * P2) / (determinant * omega);
  const separation = Math.abs(determinant) / (E11 * E22 + E12 * E21);
  return { frequency, omega, P1, P2, E11, E21, E12, E22, determinant, separation, eta1, eta12, eta21, eta2 };
}

function seededRandom(seed) {
  let state = Math.trunc(finite(seed, 12007)) >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function gaussian(random) {
  const first = Math.max(random(), 1e-12);
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(TAU * second);
}

function measurement(value, uncertaintyPercent, biasPercent, random) {
  const sigma = Math.max(0, finite(uncertaintyPercent)) / 100;
  const bias = Math.max(0.01, 1 + finite(biasPercent) / 100);
  return value * bias * Math.exp(sigma * gaussian(random) - 0.5 * sigma ** 2);
}

function quantile(sorted, probability) {
  if (!sorted.length) return NaN;
  const position = clamp(probability, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

function summarize(values) {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return { count: 0, mean: NaN, median: NaN, standardDeviation: NaN, p05: NaN, p95: NaN, negativeProbability: NaN };
  const sorted = [...finiteValues].sort((a, b) => a - b);
  const mean = finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
  const variance = finiteValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, finiteValues.length - 1);
  return {
    count: finiteValues.length,
    mean,
    median: quantile(sorted, 0.5),
    standardDeviation: Math.sqrt(variance),
    p05: quantile(sorted, 0.05),
    p95: quantile(sorted, 0.95),
    negativeProbability: finiteValues.filter(value => value < 0).length / finiteValues.length
  };
}

export function histogram(values, binCount = 28) {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return { centers: [], counts: [], minimum: NaN, maximum: NaN };
  const minimum = Math.min(...finiteValues);
  const maximum = Math.max(...finiteValues);
  const count = clamp(Math.round(binCount), 5, 80);
  const span = maximum - minimum || Math.max(Math.abs(maximum), 1) * 1e-6;
  const width = span / count;
  const counts = Array(count).fill(0);
  for (const value of finiteValues) counts[clamp(Math.floor((value - minimum) / width), 0, count - 1)]++;
  return { centers: counts.map((_, index) => minimum + (index + 0.5) * width), counts, minimum, maximum };
}

export function clfIdentificationUncertainty(input = {}) {
  const truth = forwardClfExperiment(input);
  const trials = clamp(Math.round(finite(input.trials, 1200)), 20, 5000);
  const energyUncertainty = clamp(finite(input.energyUncertainty, 5), 0, 80);
  const powerUncertainty = clamp(finite(input.powerUncertainty, 2), 0, 80);
  const energyBias1 = clamp(finite(input.energyBias1, 0), -90, 200);
  const energyBias2 = clamp(finite(input.energyBias2, 0), -90, 200);
  const random = seededRandom(input.seed);
  const samples = [];
  for (let index = 0; index < trials; index++) {
    const measured = {
      frequency: truth.frequency,
      P1: measurement(truth.P1, powerUncertainty, 0, random),
      P2: measurement(truth.P2, powerUncertainty, 0, random),
      E11: measurement(truth.E11, energyUncertainty, energyBias1, random),
      E12: measurement(truth.E12, energyUncertainty, energyBias1, random),
      E21: measurement(truth.E21, energyUncertainty, energyBias2, random),
      E22: measurement(truth.E22, energyUncertainty, energyBias2, random)
    };
    try {
      const identified = identifyClfExperiment(measured);
      const reciprocityRatio = identified.eta21 === 0 ? NaN : truth.n1 * identified.eta12 / (truth.n2 * identified.eta21);
      samples.push({ ...identified, reciprocityRatio });
    } catch {
      samples.push({ eta1: NaN, eta12: NaN, eta21: NaN, eta2: NaN, separation: NaN, reciprocityRatio: NaN });
    }
  }
  const statistics = {};
  for (const key of ['eta1', 'eta12', 'eta21', 'eta2', 'separation', 'reciprocityRatio']) statistics[key] = summarize(samples.map(sample => sample[key]));
  const anyNegativeProbability = samples.filter(sample => [sample.eta1, sample.eta12, sample.eta21, sample.eta2].some(value => value < 0)).length / trials;
  const invalidProbability = samples.filter(sample => !Number.isFinite(sample.eta12)).length / trials;
  return {
    truth, trials, energyUncertainty, powerUncertainty, energyBias1, energyBias2,
    samples, statistics, anyNegativeProbability, invalidProbability
  };
}
