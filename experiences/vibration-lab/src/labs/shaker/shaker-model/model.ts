import {
  add,
  complex,
  divide,
  magnitude,
  multiply,
  sample,
  scale,
  TAU,
} from "../physics/electromechanics";
import { magneticState } from "../magnetics/field";

export const MACHINE = {
  armatureMass: 12,
  suspensionStiffness: 60_000,
  suspensionDamping: 250,
  driveResistance: 0.8,
  driveInductance: 0.0012,
  peakCurrent: 60,
  peakVoltage: 120,
  peakStroke: 0.0125,
  peakVelocity: 1,
  continuousCopperLoss: 1600,
  manualCurrent: 8,
  maxPayload: 60,
  maxFrequency: 2000,
};
export type DriveMode = "manual" | "sine";
export interface Parameters {
  fieldPercent: number;
  manualPercent: number;
  levelPercent: number;
  frequency: number;
  payload: number;
  driveMode: DriveMode;
}
export const DEFAULTS: Parameters = {
  fieldPercent: 0,
  manualPercent: 0,
  levelPercent: 35,
  frequency: 5,
  payload: 0,
  driveMode: "manual",
};
export type Limit = "stroke" | "velocity" | "current" | "voltage" | "thermal";
export const LIMIT_NAMES: Record<Limit, string> = {
  stroke: "Stroke",
  velocity: "Velocity",
  current: "Current / force",
  voltage: "Amplifier voltage",
  thermal: "Coil heating",
};
export const LIMIT_COLORS: Record<Limit, string> = {
  stroke: "#eeb786",
  velocity: "#b8d8b8",
  current: "#9dcfdb",
  voltage: "#b5a5de",
  thermal: "#e39783",
};
export function validate(p: Parameters) {
  if (
    ![
      p.fieldPercent,
      p.manualPercent,
      p.levelPercent,
      p.frequency,
      p.payload,
    ].every(Number.isFinite) ||
    p.fieldPercent < 0 ||
    p.fieldPercent > 100 ||
    Math.abs(p.manualPercent) > 100 ||
    p.levelPercent < 0 ||
    p.levelPercent > 100 ||
    p.frequency < 1 ||
    p.frequency > MACHINE.maxFrequency ||
    p.payload < 0 ||
    p.payload > MACHINE.maxPayload ||
    !["manual", "sine"].includes(p.driveMode)
  )
    throw new RangeError("Parameters are outside this demonstration's domain.");
}
/** Unit-current harmonic response and the electromechanical input impedance. */
export function frequencyResponse(
  frequency: number,
  payload: number,
  BL: number,
) {
  const mass = MACHINE.armatureMass + payload,
    omega = TAU * frequency;
  const dynamicStiffness = complex(
    MACHINE.suspensionStiffness - mass * omega ** 2,
    MACHINE.suspensionDamping * omega,
  );
  const x = divide(complex(BL), dynamicStiffness);
  const velocity = multiply(complex(0, omega), x);
  const acceleration = scale(x, -(omega ** 2));
  const resistanceVoltage = complex(MACHINE.driveResistance);
  const inductanceVoltage = complex(0, omega * MACHINE.driveInductance);
  const emf = scale(velocity, BL);
  const impedance = add(add(resistanceVoltage, inductanceVoltage), emf);
  return {
    mass,
    omega,
    dynamicStiffness,
    x,
    velocity,
    acceleration,
    resistanceVoltage,
    inductanceVoltage,
    emf,
    impedance,
  };
}
export function capability(frequency: number, payload: number, BL: number) {
  const h = frequencyResponse(frequency, payload, BL);
  const limits: Record<Limit, number> = {
    stroke: magnitude(h.x) > 0 ? MACHINE.peakStroke / magnitude(h.x) : Infinity,
    velocity:
      magnitude(h.velocity) > 0
        ? MACHINE.peakVelocity / magnitude(h.velocity)
        : Infinity,
    current: MACHINE.peakCurrent,
    voltage: MACHINE.peakVoltage / magnitude(h.impedance),
    thermal: Math.sqrt(
      (2 * MACHINE.continuousCopperLoss) / MACHINE.driveResistance,
    ),
  };
  const limiting = (Object.keys(limits) as Limit[]).reduce((a, b) =>
    limits[a] <= limits[b] ? a : b,
  );
  const current = limits[limiting];
  return {
    ...h,
    limits,
    limiting,
    current,
    acceleration: magnitude(h.acceleration) * current,
    displacement: magnitude(h.x) * current,
  };
}
export function solve(p: Parameters) {
  validate(p);
  const field = magneticState(p.fieldPercent);
  const cap = capability(p.frequency, p.payload, field.BL);
  const h = frequencyResponse(p.frequency, p.payload, field.BL);
  const sine = p.driveMode === "sine";
  const requested = sine
    ? (p.levelPercent / 100) * MACHINE.peakCurrent
    : (p.manualPercent / 100) * MACHINE.manualCurrent;
  // A sinusoidal current controller reduces amplitude to remain inside modeled limits. No waveform clipping.
  const current = sine ? Math.min(requested, cap.current) : requested;
  const x = sine
    ? scale(h.x, current)
    : complex((field.BL * current) / MACHINE.suspensionStiffness);
  const velocity = sine ? scale(h.velocity, current) : complex();
  const acceleration = sine ? scale(h.acceleration, current) : complex();
  const resistanceVoltage = complex(MACHINE.driveResistance * current);
  const inductanceVoltage = sine
    ? scale(h.inductanceVoltage, current)
    : complex();
  const emf = scale(velocity, field.BL);
  const voltage = add(add(resistanceVoltage, inductanceVoltage), emf);
  const force = field.BL * current;
  const copperHeat = current ** 2 * MACHINE.driveResistance * (sine ? 0.5 : 1);
  const mechanicalLoss = sine
    ? 0.5 * MACHINE.suspensionDamping * magnitude(velocity) ** 2
    : 0;
  return {
    parameters: p,
    field,
    cap,
    mass: h.mass,
    omega: h.omega,
    current,
    requested,
    force,
    x,
    velocity,
    acceleration,
    resistanceVoltage,
    inductanceVoltage,
    emf,
    voltage,
    copperHeat,
    mechanicalLoss,
    amplifierRealPower: copperHeat + mechanicalLoss,
    limited: sine && requested > cap.current + 1e-8,
    displacementPeak: magnitude(x),
    velocityPeak: magnitude(velocity),
    accelerationPeak: magnitude(acceleration),
    voltagePeak: magnitude(voltage),
    emfPeak: magnitude(emf),
    fn: Math.sqrt(MACHINE.suspensionStiffness / h.mass) / TAU,
  };
}
export type Solution = ReturnType<typeof solve>;
export function sampleSolution(s: Solution, theta: number) {
  const sine = s.parameters.driveMode === "sine";
  const current = sine ? s.current * Math.sin(theta) : s.current;
  const x = sine ? sample(s.x, theta) : s.x.re;
  const v = sine ? sample(s.velocity, theta) : 0;
  const a = sine ? sample(s.acceleration, theta) : 0;
  const dIdt = sine ? s.omega * s.current * Math.cos(theta) : 0;
  const force = s.field.BL * current;
  const suspension =
    -MACHINE.suspensionStiffness * x - MACHINE.suspensionDamping * v;
  const armatureInertia = -MACHINE.armatureMass * a;
  const payloadReaction = -s.parameters.payload * a;
  const e = s.field.BL * v;
  const voltage =
    MACHINE.driveResistance * current + MACHINE.driveInductance * dIdt + e;
  return {
    current,
    x,
    v,
    a,
    dIdt,
    force,
    suspension,
    armatureInertia,
    payloadReaction,
    emf: e,
    voltage,
  };
}
export function envelope(p: Parameters, count = 180) {
  const BL = magneticState(p.fieldPercent).BL;
  return Array.from({ length: count }, (_, i) => {
    const frequency = Math.exp(
      (i / (count - 1)) * Math.log(MACHINE.maxFrequency),
    );
    return { frequency, ...capability(frequency, p.payload, BL) };
  });
}
