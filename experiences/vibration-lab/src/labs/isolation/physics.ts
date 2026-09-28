import { GRAVITY, LB_TO_KG, TAU } from "@engine/units";
/** Linear, viscously damped, base-excited SDOF. All internal quantities are SI; amplitudes are peak. */
export { GRAVITY, LB_TO_KG, TAU } from "@engine/units";
export interface Parameters {
  mass: number;
  stiffness: number; // sum of four identical parallel mounts, N/m
  zeta: number;
  frequency: number;
  baseAcceleration: number; // m/s², peak; held constant during the sweep
}

function positive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be finite and positive`);
}
function checkRatio(r: number, zeta: number) {
  if (!Number.isFinite(r) || r < 0)
    throw new RangeError("Frequency ratio must be finite and nonnegative");
  if (!Number.isFinite(zeta) || zeta < 0)
    throw new RangeError("Damping ratio must be finite and nonnegative");
}
export function naturalFrequency(mass: number, stiffness: number) {
  positive(mass, "Mass");
  positive(stiffness, "Stiffness");
  return Math.sqrt(stiffness / mass) / TAU;
}
export function dampingRatio(mass: number, stiffness: number, damping: number) {
  positive(mass, "Mass");
  positive(stiffness, "Stiffness");
  if (!Number.isFinite(damping) || damping < 0)
    throw new RangeError("Damping must be finite and nonnegative");
  return damping / (2 * Math.sqrt(stiffness * mass));
}
export function transmissibility(r: number, zeta: number) {
  checkRatio(r, zeta);
  return Math.hypot(1, 2 * zeta * r) / Math.hypot(1 - r * r, 2 * zeta * r);
}
/** X/Y = (1 + i 2ζr)/(1 - r² + i 2ζr). Negative phase means payload lags base. */
export function phase(r: number, zeta: number) {
  checkRatio(r, zeta);
  if (r === 1 && zeta === 0) return NaN; // no bounded harmonic solution at undamped resonance
  if (r === 0) return 0;
  return Math.atan2(-2 * zeta * r ** 3, 1 - r * r + (2 * zeta * r) ** 2);
}
export function responseAmplitude(
  baseAmplitude: number,
  r: number,
  zeta: number,
) {
  if (!Number.isFinite(baseAmplitude) || baseAmplitude < 0)
    throw new RangeError("Amplitude must be finite and nonnegative");
  return baseAmplitude * transmissibility(r, zeta);
}
/** Dynamic force amplitude on the payload; equal and opposite force on the base. Excludes static weight. */
export function transmittedForce(
  mass: number,
  frequency: number,
  payloadAmplitude: number,
) {
  positive(mass, "Mass");
  positive(frequency, "Frequency");
  if (!Number.isFinite(payloadAmplitude) || payloadAmplitude < 0)
    throw new RangeError("Amplitude must be finite and nonnegative");
  return mass * (TAU * frequency) ** 2 * payloadAmplitude;
}
export function solve(p: Parameters) {
  positive(p.frequency, "Frequency");
  positive(p.baseAcceleration, "Base acceleration");
  const fn = naturalFrequency(p.mass, p.stiffness);
  const r = p.frequency / fn;
  const T = transmissibility(r, p.zeta);
  const phi = phase(r, p.zeta);
  const omega = TAU * p.frequency;
  const baseAmplitude = p.baseAcceleration / omega ** 2;
  const payloadAmplitude = responseAmplitude(baseAmplitude, r, p.zeta);
  const relativeAmplitude =
    (baseAmplitude * r * r) / Math.hypot(1 - r * r, 2 * p.zeta * r);
  return {
    fn,
    r,
    T,
    phase: phi,
    omega,
    baseAmplitude,
    payloadAmplitude,
    relativeAmplitude,
    isolationDb: -20 * Math.log10(T),
    damping: 2 * p.zeta * Math.sqrt(p.stiffness * p.mass),
    force: transmittedForce(p.mass, p.frequency, payloadAmplitude),
    payloadAcceleration: p.baseAcceleration * T,
    isolationThreshold: Math.SQRT2 * fn,
    staticDeflection: (p.mass * GRAVITY) / p.stiffness,
  };
}
export type Solution = ReturnType<typeof solve>;
export function sampleMotion(s: Solution, theta: number) {
  const base = s.baseAmplitude * Math.sin(theta);
  const payload = s.payloadAmplitude * Math.sin(theta + s.phase);
  return {
    base,
    payload,
    relative: payload - base,
    forceOnPayload: -s.force * Math.sin(theta + s.phase),
  };
}
export type Regime = "coupled" | "resonance" | "isolation";
/** 0.7 is a teaching-region boundary, not a mathematical threshold. Isolation starts exactly at √2. */
export function regime(r: number): Regime {
  return r < 0.7 ? "coupled" : r < Math.SQRT2 ? "resonance" : "isolation";
}
export const DEFAULTS: Parameters = {
  mass: 10 * LB_TO_KG,
  stiffness: 10 * LB_TO_KG * (TAU * 25) ** 2,
  frequency: 5,
  zeta: 0.08,
  baseAcceleration: GRAVITY,
};
