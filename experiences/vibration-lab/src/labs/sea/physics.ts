/** Reciprocal seven-subsystem SEA; SI energy, power and modes/Hz. */
import { CAVITY, JUNCTIONS, MATERIALS, SUBSYSTEMS } from "./falcon";
export { SUBSYSTEMS, JUNCTIONS } from "./falcon";
export type EnergyVector = number[];
export type Matrix = number[][];
export const BANDS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000] as const;
export const zeroEnergy = () => SUBSYSTEMS.map(() => 0);
export interface Settings {
  frequency: number;
  power: number;
  source: number;
  loss: number[];
  coupling: number[];
  densityScale: number[];
  cavityRT: number;
}
export const DEFAULT: Settings = {
  frequency: 1000,
  power: 1,
  source: 1,
  loss: [0.008, 0.008, 0.012, 0.008, 0.01, 0.015, 0],
  coupling: [0.008, 0.008, 0.008, 0.006, 0.006, 0.004, 0.001, 0.003],
  densityScale: SUBSYSTEMS.map(() => 1),
  cavityRT: CAVITY.rt60,
};
export const sum = (v: readonly number[]) => v.reduce((a, b) => a + b, 0);
export const bandLimits = (f: number) =>
  [f / 2 ** (1 / 6), f * 2 ** (1 / 6)] as const;
export const bandWidth = (f: number) => {
  const [a, b] = bandLimits(f);
  return b - a;
};
export function ringFrequency(index: number) {
  const p = SUBSYSTEMS[index],
    m = MATERIALS[p.material];
  return p.kind === "cylinder"
    ? Math.sqrt(m.young / (m.density * (1 - m.poisson ** 2))) /
        (2 * Math.PI * 1.85)
    : 0;
}
export function modalDensity(index: number, multiplier = 1, frequency = 1000) {
  const p = SUBSYSTEMS[index];
  if (p.kind === "acoustic")
    return (
      (multiplier * 4 * Math.PI * CAVITY.volume * frequency ** 2) /
      CAVITY.soundSpeed ** 3
    );
  const m = MATERIALS[p.material],
    d = (m.young * p.thickness ** 3) / (12 * (1 - m.poisson ** 2));
  let n = (p.area / 2) * Math.sqrt((m.density * p.thickness) / d);
  if (p.kind === "cylinder") {
    // autoSEA's NASA/plate-convergent screening branch; not a stiffened-shell solution.
    const ratio = frequency / ringFrequency(index),
      u = Math.max(0, Math.min(1, (ratio - 0.83) / (2 - 0.83)));
    n *=
      ratio <= 0.48
        ? (2.5 * Math.sqrt(ratio)) / 2.6
        : ratio <= 0.83
          ? (3.6 * ratio) / 2.6
          : 1 + ((3.6 * 0.83) / 2.6 - 1) * (1 - u * u * (3 - 2 * u));
  }
  return multiplier * n;
}
export const reciprocalCLF = (forward: number, nFrom: number, nTo: number) =>
  (forward * nFrom) / nTo;
export function buildLossMatrix(
  loss: number[],
  edges: { a: number; b: number; forward: number; reverse: number }[],
): Matrix {
  const matrix = loss.map((v, i) => loss.map((_, j) => (i === j ? v : 0)));
  for (const e of edges) {
    matrix[e.a][e.a] += e.forward;
    matrix[e.b][e.b] += e.reverse;
    matrix[e.b][e.a] -= e.forward;
    matrix[e.a][e.b] -= e.reverse;
  }
  return matrix;
}
export const multiply = (a: Matrix, x: number[]) =>
  a.map((row) => sum(row.map((v, i) => v * x[i])));
export function solveLinear(a: Matrix, b: number[]): number[] {
  const size = b.length,
    rows = a.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < size; k++) {
    let pivot = k;
    for (let i = k + 1; i < size; i++)
      if (Math.abs(rows[i][k]) > Math.abs(rows[pivot][k])) pivot = i;
    [rows[k], rows[pivot]] = [rows[pivot], rows[k]];
    if (Math.abs(rows[k][k]) < 1e-15)
      throw new Error("SEA loss matrix needs a dissipative path.");
    const d = rows[k][k];
    for (let j = k; j <= size; j++) rows[k][j] /= d;
    for (let i = 0; i < size; i++)
      if (i !== k) {
        const c = rows[i][k];
        for (let j = k; j <= size; j++) rows[i][j] -= c * rows[k][j];
      }
  }
  return rows.map((r) => r[size]);
}
export function createModel(settings: Settings) {
  const n = SUBSYSTEMS.map((_, i) =>
    modalDensity(i, settings.densityScale[i], settings.frequency),
  );
  const omega = 2 * Math.PI * settings.frequency,
    bandwidth = bandWidth(settings.frequency);
  const loss = settings.loss.map((v, i) =>
    i === 6 ? Math.log(1e6) / (omega * settings.cavityRT) : v,
  );
  const edges = JUNCTIONS.map((e, i) => ({
    ...e,
    forward: settings.coupling[i],
    reverse: reciprocalCLF(settings.coupling[i], n[e.a], n[e.b]),
  }));
  const matrix = buildLossMatrix(loss, edges),
    power = SUBSYSTEMS.map((_, i) =>
      i === settings.source ? settings.power : 0,
    );
  const count = n.map((v) => v * bandwidth),
    overlap = n.map((v, i) => v * settings.frequency * matrix[i][i]);
  const steady = solveLinear(
    matrix,
    power.map((v) => v / omega),
  );
  return {
    settings,
    n,
    count,
    overlap,
    matrix,
    power,
    omega,
    bandwidth,
    loss,
    edges,
    steady,
  };
}
export type Model = ReturnType<typeof createModel>;
export const energyPerMode = (
  energy: number,
  density: number,
  bandwidth: number,
) => energy / (density * bandwidth);
export const coupledPowerFlow = (
  omega: number,
  forward: number,
  reverse: number,
  ei: number,
  ej: number,
) => omega * (forward * ei - reverse * ej);
export const internalDissipation = (
  omega: number,
  loss: number,
  energy: number,
) => omega * loss * energy;
export function balance(model: Model, energy: EnergyVector) {
  const flows = model.edges.map((e) =>
    coupledPowerFlow(
      model.omega,
      e.forward,
      e.reverse,
      energy[e.a],
      energy[e.b],
    ),
  );
  const netOut = zeroEnergy(),
    incoming = zeroEnergy(),
    outgoing = zeroEnergy();
  model.edges.forEach((e, i) => {
    const p = flows[i];
    netOut[e.a] += p;
    netOut[e.b] -= p;
    outgoing[e.a] += Math.max(0, p);
    incoming[e.b] += Math.max(0, p);
    incoming[e.a] += Math.max(0, -p);
    outgoing[e.b] += Math.max(0, -p);
  });
  const dissipation = energy.map((e, i) =>
    internalDissipation(model.omega, model.loss[i], e),
  );
  const rate = model.power.map((p, i) => p - dissipation[i] - netOut[i]);
  return {
    flows,
    netOut,
    incoming,
    outgoing,
    dissipation,
    rate,
    totalEnergy: sum(energy),
    dissipated: sum(dissipation),
    storedPower: sum(rate),
    residual: sum(model.power) - sum(dissipation) - sum(rate),
  };
}
export const transientEnergyDerivative = (model: Model, e: EnergyVector) => {
  const losses = multiply(model.matrix, e);
  return model.power.map((p, i) => p - model.omega * losses[i]);
};
/** RK4 substeps enforce h*max escape rate <= .2. */
export function integrateTransientEnergy(
  model: Model,
  initial: EnergyVector,
  dt: number,
): EnergyVector {
  if (dt <= 0) return [...initial];
  const rate = model.omega * Math.max(...model.matrix.map((r, i) => r[i]));
  const steps = Math.max(1, Math.ceil((dt * rate) / 0.2)),
    h = dt / steps;
  let e = [...initial];
  const add = (a: number[], b: number[], f: number) =>
    a.map((v, i) => v + f * b[i]);
  for (let k = 0; k < steps; k++) {
    const a = transientEnergyDerivative(model, e),
      b = transientEnergyDerivative(model, add(e, a, h / 2));
    const c = transientEnergyDerivative(model, add(e, b, h / 2)),
      d = transientEnergyDerivative(model, add(e, c, h));
    e = e.map((v, i) => v + (h * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6);
  }
  return e;
}
export const physicalTimeRate = (f: number) => 5 / f;
export const settlingError = (model: Model, energy: EnergyVector) =>
  Math.max(...energy.map((e, i) => Math.abs(e - model.steady[i]))) /
  Math.max(1e-9, ...model.steady, ...energy);
export const rmsVelocity = (energy: number, index: number) => {
  const p = SUBSYSTEMS[index];
  return p.kind === "acoustic"
    ? 0
    : Math.sqrt(
        Math.max(0, energy) /
          (p.area * p.thickness * MATERIALS[p.material].density),
      );
};
export const cavityPressure = (energy: number) =>
  Math.sqrt(
    (Math.max(0, energy) * CAVITY.density * CAVITY.soundSpeed ** 2) /
      CAVITY.volume,
  );
export const PRESETS = {
  Baseline: {},
  "Weak interstage": {
    coupling: DEFAULT.coupling.map((v, i) => (i === 1 || i === 2 ? 0.0005 : v)),
  },
  "Strong interstage": {
    coupling: DEFAULT.coupling.map((v, i) => (i === 1 || i === 2 ? 0.03 : v)),
  },
  "Damp interstage": { loss: DEFAULT.loss.map((v, i) => (i === 2 ? 0.06 : v)) },
  "Fairing excitation": { source: 5 },
  "Acoustic excitation": { source: 6 },
  "Absorptive fairing": { cavityRT: 0.3 },
  "Low-frequency band": { frequency: 31.5 },
} satisfies Record<string, Partial<Settings>>;
export type Preset = keyof typeof PRESETS;
export const presetSettings = (name: Preset): Settings => ({
  ...DEFAULT,
  ...PRESETS[name],
});
