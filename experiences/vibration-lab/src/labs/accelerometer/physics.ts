/** Representative annular-shear IEPE sensor. SI internally, sinusoidal peaks throughout. */
export const G = 9.80665;
export const SENSOR = {
  mass: 0.003,
  naturalFrequency: 24_000,
  dampingRatio: 0.075,
  chargeCoefficient: 250e-12,
  sensitivity: 0.1 / G,
  highPassFrequency: 0.5,
  supplyCurrent: 0.004,
  supplyVoltage: 24,
  biasVoltage: 12,
  outputHeadroom: 8,
} as const;
export const OMEGA_N = 2 * Math.PI * SENSOR.naturalFrequency;
export const STIFFNESS = SENSOR.mass * OMEGA_N ** 2;
export const DAMPING = 2 * SENSOR.dampingRatio * SENSOR.mass * OMEGA_N;
export const EFFECTIVE_CAPACITANCE =
  (SENSOR.chargeCoefficient * SENSOR.mass) / SENSOR.sensitivity;
export const FREQUENCY_RANGE = [0.02, 60_000] as const;
export interface Complex {
  re: number;
  im: number;
}
export const multiply = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const scale = (a: Complex, b: number): Complex => ({
  re: a.re * b,
  im: a.im * b,
});
export const magnitude = (a: Complex) => Math.hypot(a.re, a.im);
export const phaseDegrees = (a: Complex) =>
  (Math.atan2(a.im, a.re) * 180) / Math.PI;
export const harmonic = (a: Complex, phase: number) =>
  a.re * Math.sin(phase) + a.im * Math.cos(phase);
export const inertialForce = (mass: number, acceleration: number) =>
  -mass * acceleration;
export const piezoCharge = (
  force: number,
  coefficient = SENSOR.chargeCoefficient,
) => coefficient * force;
export function sensorMechanicalResponse(frequency: number): Complex {
  const r = frequency / SENSOR.naturalFrequency,
    re = 1 - r * r,
    im = 2 * SENSOR.dampingRatio * r,
    d = re * re + im * im;
  return { re: re / d, im: -im / d };
}
export function sensorElectricalResponse(frequency: number): Complex {
  const r = frequency / SENSOR.highPassFrequency,
    d = 1 + r * r;
  return { re: (r * r) / d, im: r / d };
}
export const sensorTransferFunction = (frequency: number) =>
  multiply(
    sensorMechanicalResponse(frequency),
    sensorElectricalResponse(frequency),
  );
export const outputVoltage = (
  acceleration: number,
  sensitivity = SENSOR.sensitivity,
  transfer: Complex = { re: 1, im: 0 },
) => scale(transfer, acceleration * sensitivity);
export type InputMode = "Manual" | "Sine";
export interface Settings {
  mode: InputMode;
  acceleration: number;
  amplitude: number;
  frequency: number;
}
export const DEFAULT: Settings = {
  mode: "Manual",
  acceleration: G,
  amplitude: 10 * G,
  frequency: 100,
};
export function solve(settings: Settings) {
  const manual = settings.mode === "Manual";
  const acceleration = manual ? settings.acceleration : settings.amplitude;
  const mechanical = manual
    ? { re: 1, im: 0 }
    : sensorMechanicalResponse(settings.frequency);
  const electrical = manual
    ? { re: 1, im: 0 }
    : sensorElectricalResponse(settings.frequency);
  const transfer = multiply(mechanical, electrical);
  const drive = inertialForce(SENSOR.mass, acceleration);
  // Kelvin-Voigt internal model: only the elastic piezo path generates charge.
  const piezoLoad = scale(mechanical, drive);
  const charge = scale(piezoLoad, SENSOR.chargeCoefficient);
  const voltage = scale(
    multiply(charge, electrical),
    -1 / EFFECTIVE_CAPACITANCE,
  );
  const relative = scale(piezoLoad, 1 / STIFFNESS);
  const dampingForce = manual
    ? { re: 0, im: 0 }
    : multiply(relative, {
        re: 0,
        im: 2 * Math.PI * settings.frequency * DAMPING,
      });
  const massForce = {
    re: piezoLoad.re + dampingForce.re,
    im: piezoLoad.im + dampingForce.im,
  };
  return {
    manual,
    acceleration,
    drive,
    mechanical,
    electrical,
    transfer,
    piezoLoad,
    charge,
    voltage,
    relative,
    massForce,
    gain: magnitude(transfer),
    phase: phaseDegrees(transfer),
    voltagePeak: magnitude(voltage),
    chargePeak: magnitude(charge),
    relativePeak: magnitude(relative),
    baseDisplacementPeak: manual
      ? null
      : Math.abs(acceleration) / (2 * Math.PI * settings.frequency) ** 2,
    visualFrequency: manual ? 0 : Math.min(0.75, settings.frequency),
  };
}
export type Solution = ReturnType<typeof solve>;
export function sample(solution: Solution, phase: number) {
  const instant = (value: Complex) =>
    solution.manual ? value.re : harmonic(value, phase);
  const acceleration =
    solution.acceleration * (solution.manual ? 1 : Math.sin(phase));
  const voltage = instant(solution.voltage);
  return {
    acceleration,
    drive: inertialForce(SENSOR.mass, acceleration),
    piezoLoad: instant(solution.piezoLoad),
    charge: instant(solution.charge),
    voltage,
    wireVoltage: SENSOR.biasVoltage + voltage,
    relative: instant(solution.relative),
    massForce: instant(solution.massForce),
  };
}
export type Sample = ReturnType<typeof sample>;
export function responseBand(tolerance = 0.05) {
  const points = Array.from(
    { length: 4001 },
    (_, i) =>
      FREQUENCY_RANGE[0] *
      (FREQUENCY_RANGE[1] / FREQUENCY_RANGE[0]) ** (i / 4000),
  );
  // Follow the contiguous nominal band; exclude the accidental unity crossing above resonance.
  const anchor = points.findIndex((f) => f >= 100);
  let lo = anchor,
    hi = anchor;
  const acceptable = (f: number) =>
    Math.abs(magnitude(sensorTransferFunction(f)) - 1) <= tolerance;
  while (lo > 0 && acceptable(points[lo - 1])) lo--;
  while (hi < points.length - 1 && acceptable(points[hi + 1])) hi++;
  return [points[lo], points[hi]] as const;
}
export const USABLE_BAND = responseBand();
export const sweepFrequency = (progress: number) =>
  FREQUENCY_RANGE[0] *
  (FREQUENCY_RANGE[1] / FREQUENCY_RANGE[0]) **
    Math.max(0, Math.min(1, progress));
