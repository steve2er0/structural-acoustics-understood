import { TAU } from "@engine/units";
/** Pure SI operations. Lwire is active wire length; inductance is Le. */
export { GRAVITY as G, TAU } from "@engine/units";
export const forceFactor = (B: number, Lwire: number) => B * Lwire;
export const lorentzForce = (B: number, Lwire: number, current: number) =>
  forceFactor(B, Lwire) * current;
export const backEMF = (BL: number, velocity: number) => BL * velocity;
export const coilResistanceVoltage = (current: number, resistance: number) =>
  current * resistance;
export const coilInductiveVoltage = (inductance: number, dIdt: number) =>
  inductance * dIdt;
export const fieldCoilPower = (current: number, resistance: number) =>
  current * current * resistance;
export function availableAcceleration(force: number, mass: number) {
  if (!Number.isFinite(mass) || mass <= 0)
    throw new RangeError("Moving mass must be positive.");
  return force / mass;
}
export function sinusoidalDisplacementFromAcceleration(
  acceleration: number,
  frequency: number,
) {
  if (!Number.isFinite(frequency) || frequency <= 0)
    throw new RangeError("Frequency must be positive.");
  return acceleration / (TAU * frequency) ** 2;
}
export function sinusoidalVelocityFromAcceleration(
  acceleration: number,
  frequency: number,
) {
  if (!Number.isFinite(frequency) || frequency <= 0)
    throw new RangeError("Frequency must be positive.");
  return acceleration / (TAU * frequency);
}
export type Complex = { re: number; im: number };
export const complex = (re = 0, im = 0): Complex => ({ re, im });
export const add = (a: Complex, b: Complex): Complex =>
  complex(a.re + b.re, a.im + b.im);
export const scale = (a: Complex, k: number): Complex =>
  complex(a.re * k, a.im * k);
export const multiply = (a: Complex, b: Complex): Complex =>
  complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export function divide(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) throw new RangeError("Singular complex divisor.");
  return complex(
    (a.re * b.re + a.im * b.im) / d,
    (a.im * b.re - a.re * b.im) / d,
  );
}
export const magnitude = (a: Complex) => Math.hypot(a.re, a.im);
/** Sinusoidal convention: q(t)=Im{Q exp(jθ)}; real I means Ipk sin θ. */
export const sample = (a: Complex, theta: number) =>
  a.re * Math.sin(theta) + a.im * Math.cos(theta);
export type Vec3 = [number, number, number];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** Render coordinates: +Y axial. Positive drive current gives +Y force with outward radial B. */
export function localDirections(angle: number, polarity = 1) {
  const B: Vec3 = [Math.sin(angle), 0, Math.cos(angle)];
  const I: Vec3 = [-Math.cos(angle) * polarity, 0, Math.sin(angle) * polarity];
  return { B, I, F: cross(I, B) };
}
