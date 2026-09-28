import { describe, expect, it } from "vitest";
import {
  G,
  SENSOR,
  STIFFNESS,
  DAMPING,
  DEFAULT,
  USABLE_BAND,
  EFFECTIVE_CAPACITANCE,
  inertialForce,
  piezoCharge,
  outputVoltage,
  sensorMechanicalResponse,
  sensorElectricalResponse,
  sensorTransferFunction,
  magnitude,
  phaseDegrees,
  solve,
  sample,
  sweepFrequency,
} from "./physics";
describe("annular shear accelerometer", () => {
  it("uses F = -ma in the accelerating housing frame", () => {
    expect(inertialForce(0.003, 10 * G)).toBeCloseTo(-0.2941995, 9);
    expect(inertialForce(0.003, -G)).toBe(-inertialForce(0.003, G));
  });
  it("scales charge with load and reverses polarity", () => {
    expect(piezoCharge(0.2)).toBeCloseTo(50e-12, 18);
    expect(piezoCharge(-0.2)).toBe(-piezoCharge(0.2));
  });
  it.each([1, 5, 10])("converts %s g to the specified 100 mV/g", (g) => {
    const s = solve({ ...DEFAULT, acceleration: g * G });
    expect(sample(s, 0).voltage).toBeCloseTo(g * 0.1, 12);
    expect(outputVoltage(g * G).re).toBeCloseTo(g * 0.1, 12);
  });
  it("reverses every signed manual quantity, including electrode charge and wire AC", () => {
    const p = sample(solve({ ...DEFAULT, acceleration: 10 * G }), 0),
      n = sample(solve({ ...DEFAULT, acceleration: -10 * G }), 0);
    for (const key of [
      "acceleration",
      "drive",
      "piezoLoad",
      "charge",
      "voltage",
      "relative",
    ] as const)
      expect(n[key]).toBe(-p[key]);
    expect(n.wireVoltage).toBe(11);
    expect(p.wireVoltage).toBe(13);
  });
  it("derives stiffness, damping, capacitance and actual nanometre relative motion", () => {
    expect(Math.sqrt(STIFFNESS / SENSOR.mass) / (2 * Math.PI)).toBeCloseTo(
      24000,
      10,
    );
    expect(DAMPING).toBeCloseTo(2 * 0.075 * 0.003 * 2 * Math.PI * 24000, 10);
    const s = solve({ ...DEFAULT, acceleration: 10 * G });
    expect(s.relativePeak * 1e9).toBeCloseTo(4.3125928193, 5);
    expect(-s.charge.re / EFFECTIVE_CAPACITANCE).toBeCloseTo(s.voltage.re, 12);
  });
  it("retains peak amplitude with one phase for scene, voltage and waveform", () => {
    const s = solve({ ...DEFAULT, mode: "Sine" });
    let a2 = 0,
      v2 = 0;
    for (let i = 0; i < 4000; i++) {
      const t = sample(s, (2 * Math.PI * i) / 4000);
      a2 += t.acceleration ** 2;
      v2 += t.voltage ** 2;
    }
    expect(Math.sqrt(a2 / 4000) * Math.SQRT2).toBeCloseTo(10 * G, 9);
    expect(Math.sqrt(v2 / 4000) * Math.SQRT2).toBeCloseTo(s.voltagePeak, 9);
    expect(s.voltagePeak).toBeCloseTo(1, 4);
  });
  it("uses the actual frequency for response, independently of visual slowing", () => {
    const a = solve({ ...DEFAULT, mode: "Sine", frequency: 100 }),
      b = solve({ ...DEFAULT, mode: "Sine", frequency: 24000 });
    expect(a.visualFrequency).toBe(b.visualFrequency);
    expect(b.gain).toBeGreaterThan(a.gain * 6);
  });
  it("approximates nominal sensitivity in the flat band", () => {
    for (const f of [5, 100, 1000])
      expect(Math.abs(magnitude(sensorTransferFunction(f)) - 1)).toBeLessThan(
        0.006,
      );
  });
  it("rolls electrical response off to zero at DC while mechanics retain inertial load", () => {
    expect(sensorElectricalResponse(0)).toEqual({ re: 0, im: 0 });
    expect(sensorMechanicalResponse(0)).toEqual({ re: 1, im: -0 });
    expect(magnitude(sensorTransferFunction(0.02))).toBeLessThan(0.041);
    expect(magnitude(sensorTransferFunction(0.5))).toBeCloseTo(Math.SQRT1_2, 8);
  });
  it("amplifies and rotates phase near the internal resonance", () => {
    expect(magnitude(sensorMechanicalResponse(24000))).toBeCloseTo(
      1 / (2 * 0.075),
      10,
    );
    expect(phaseDegrees(sensorMechanicalResponse(24000))).toBeCloseTo(-90, 10);
    expect(phaseDegrees(sensorTransferFunction(40000))).toBeLessThan(-165);
  });
  it("keeps reported mass inertia equal to elastic plus damping load", () => {
    for (const frequency of [1, 100, 24000, 60000]) {
      const s = solve({ ...DEFAULT, mode: "Sine", frequency });
      for (const phase of [0, 0.8, 2.5]) {
        const t = sample(s, phase);
        const relAcceleration = -((2 * Math.PI * frequency) ** 2) * t.relative;
        expect(t.massForce).toBeCloseTo(
          -SENSOR.mass * (t.acceleration + relAcceleration),
          10,
        );
      }
    }
  });
  it("reports the contiguous five-percent operating band and full sweep endpoints", () => {
    expect(USABLE_BAND[0]).toBeGreaterThan(1.5);
    expect(USABLE_BAND[1]).toBeGreaterThan(5000);
    expect(USABLE_BAND[1]).toBeLessThan(6000);
    expect(sweepFrequency(0)).toBe(0.02);
    expect(sweepFrequency(1)).toBe(60000);
  });
  it("keeps the entire 10 g sweep within representative IEPE headroom", () => {
    for (let i = 0; i <= 2000; i++) {
      const s = solve({
        ...DEFAULT,
        mode: "Sine",
        frequency: sweepFrequency(i / 2000),
      });
      expect(s.voltagePeak).toBeLessThan(SENSOR.outputHeadroom);
    }
  });
});
