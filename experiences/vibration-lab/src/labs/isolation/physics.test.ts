import { describe, expect, it } from "vitest";
import {
  DEFAULTS,
  GRAVITY,
  TAU,
  dampingRatio,
  naturalFrequency,
  phase,
  sampleMotion,
  solve,
  transmissibility,
  transmittedForce,
} from "./physics";
import {
  motionScale,
  positionFrequency,
  frequencyPosition,
  SWEEP_DURATION,
  sweepFrequency,
  visualMotion,
  displacement,
} from "./visualization";

describe("SDOF physical invariants", () => {
  it("uses a consistent 10 lb, 25 Hz, 1 g baseline", () => {
    const s = solve(DEFAULTS);
    expect(DEFAULTS.mass).toBeCloseTo(4.5359237, 9);
    expect(s.fn).toBeCloseTo(25, 12);
    expect(s.baseAmplitude).toBeCloseTo(GRAVITY / (TAU * 5) ** 2, 12);
    expect(
      dampingRatio(DEFAULTS.mass, DEFAULTS.stiffness, s.damping),
    ).toBeCloseTo(0.08, 12);
    expect(s.staticDeflection).toBeCloseTo(GRAVITY / (TAU * 25) ** 2, 12);
  });
  it("scales natural frequency with stiffness and mass", () => {
    expect(naturalFrequency(4, 1600) / naturalFrequency(4, 400)).toBeCloseTo(
      2,
      12,
    );
    expect(naturalFrequency(16, 400) / naturalFrequency(4, 400)).toBeCloseTo(
      0.5,
      12,
    );
  });
  it("has unit transmission and zero phase at zero frequency", () => {
    for (const zeta of [0, 0.01, 0.08, 0.4]) {
      expect(transmissibility(0, zeta)).toBe(1);
      expect(phase(0, zeta)).toBe(0);
    }
  });
  it("crosses unity at sqrt(2) for every damping ratio", () => {
    for (const zeta of [0, 0.01, 0.08, 0.4, 1]) {
      expect(transmissibility(Math.SQRT2, zeta)).toBeCloseTo(1, 13);
      expect(transmissibility(1.4, zeta)).toBeGreaterThan(1);
      expect(transmissibility(1.42, zeta)).toBeLessThan(1);
    }
  });
  it("has the exact resonance amplitude and correct phase quadrant", () => {
    const zeta = 0.08;
    expect(transmissibility(1, zeta)).toBeCloseTo(
      Math.sqrt(1 + 4 * zeta ** 2) / (2 * zeta),
      13,
    );
    expect(phase(1, zeta)).toBeCloseTo(Math.atan(2 * zeta) - Math.PI / 2, 13);
    expect(phase(2, zeta)).toBeLessThan(-Math.PI / 2);
    expect(phase(1e6, zeta)).toBeCloseTo(-Math.PI / 2, 4);
  });
  it("captures both effects of damping, including high frequency asymptote", () => {
    expect(transmissibility(1, 0.4)).toBeLessThan(transmissibility(1, 0.08));
    expect(transmissibility(24, 0.4)).toBeGreaterThan(
      transmissibility(24, 0.08),
    );
    expect(transmissibility(1e5, 0.08) * 1e5).toBeCloseTo(0.16, 6);
    expect(transmissibility(1e5, 0) * 1e10).toBeCloseTo(1, 8);
  });
  it("satisfies the original complex equation for all UI parameter extremes", () => {
    for (const mass of [0.90718474, DEFAULTS.mass, 13.6077711])
      for (const stiffness of [20000, DEFAULTS.stiffness, 320000])
        for (const zeta of [0.01, 0.08, 0.4])
          for (const frequency of [1, 5, 25, 100, 600]) {
            const s = solve({ ...DEFAULTS, mass, stiffness, zeta, frequency });
            const xr = s.payloadAmplitude * Math.cos(s.phase),
              xi = s.payloadAmplitude * Math.sin(s.phase);
            const real =
              (stiffness - mass * s.omega ** 2) * xr -
              s.damping * s.omega * xi -
              stiffness * s.baseAmplitude;
            const imag =
              (stiffness - mass * s.omega ** 2) * xi +
              s.damping * s.omega * xr -
              s.damping * s.omega * s.baseAmplitude;
            const forcing =
              Math.hypot(stiffness, s.damping * s.omega) * s.baseAmplitude;
            expect(Math.hypot(real, imag) / forcing).toBeLessThan(1e-10);
            const mountForce =
              Math.hypot(stiffness, s.damping * s.omega) * s.relativeAmplitude;
            expect(Math.abs(mountForce - s.force) / s.force).toBeLessThan(
              1e-10,
            );
          }
  });
  it("satisfies time-domain force balance and signed force direction", () => {
    for (const frequency of [5, 25, 100, 600]) {
      const p = { ...DEFAULTS, frequency },
        s = solve(p);
      for (let i = 0; i < 40; i++) {
        const theta = (i * TAU) / 40,
          motion = sampleMotion(s, theta);
        const velocityDifference =
          s.omega *
          (s.payloadAmplitude * Math.cos(theta + s.phase) -
            s.baseAmplitude * Math.cos(theta));
        const force =
          -p.stiffness * motion.relative - s.damping * velocityDifference;
        expect(force / s.force).toBeCloseTo(
          motion.forceOnPayload / s.force,
          10,
        );
      }
    }
  });
  it("distinguishes constant-acceleration forcing and positive isolation dB", () => {
    const low = solve(DEFAULTS),
      high = solve({ ...DEFAULTS, frequency: 600 });
    expect(low.isolationDb).toBeLessThan(0);
    expect(high.isolationDb).toBeGreaterThan(0);
    expect(high.force).toBeLessThan(low.force);
    expect(high.force / (DEFAULTS.mass * GRAVITY)).toBeCloseTo(high.T, 13);
    expect(high.baseAmplitude / low.baseAmplitude).toBeCloseTo(
      (5 / 600) ** 2,
      13,
    );
  });
  it("exposes undamped resonance as singular rather than manufacturing an answer", () => {
    expect(transmissibility(1, 0)).toBe(Infinity);
    expect(phase(1, 0)).toBeNaN();
  });
  it("rejects invalid physical parameters", () => {
    expect(() => naturalFrequency(0, 10)).toThrow(RangeError);
    expect(() => solve({ ...DEFAULTS, zeta: -1 })).toThrow(RangeError);
    expect(() => solve({ ...DEFAULTS, frequency: 0 })).toThrow(RangeError);
    expect(() => solve({ ...DEFAULTS, stiffness: NaN })).toThrow(RangeError);
    expect(() => transmittedForce(2, 4, -1)).toThrow(RangeError);
  });
});
describe("visualization keeps physical state intact", () => {
  it("does not round sub-micrometer responses to zero", () => {
    expect(displacement(3.2e-10)).toBe("0.32 nm");
    expect(displacement(2e-6)).toBe("2.00 µm");
    expect(displacement(0.01)).toBe("10.00 mm");
  });
  it("applies one bounded linear gain to both displacements", () => {
    for (const frequency of [1, 5, 25, 100, 600])
      for (const zeta of [0.01, 0.4]) {
        const s = solve({ ...DEFAULTS, frequency, zeta }),
          before = { ...s },
          scale = motionScale(s);
        const motion = visualMotion(s, 0.72);
        expect(motion.base).toBeCloseTo(
          motion.physical.base * scale.worldUnitsPerMeter,
          13,
        );
        expect(motion.payload).toBeCloseTo(
          motion.physical.payload * scale.worldUnitsPerMeter,
          13,
        );
        expect(
          s.relativeAmplitude * scale.worldUnitsPerMeter,
        ).toBeLessThanOrEqual(0.460000001);
        expect(s).toEqual(before);
      }
  });
  it("round-trips the logarithmic frequency control", () => {
    for (const frequency of [1, 5, 25, 100, 600])
      expect(positionFrequency(frequencyPosition(frequency))).toBeCloseTo(
        frequency,
        10,
      );
  });
  it("sweeps continuously, holds at resonance, and ends at 600 Hz", () => {
    expect(sweepFrequency(0, 25)).toBe(2);
    expect(sweepFrequency(7, 25)).toBe(25);
    expect(sweepFrequency(9, 25)).toBe(25);
    expect(sweepFrequency(10, 25)).toBe(25);
    expect(sweepFrequency(SWEEP_DURATION, 25)).toBeCloseTo(600, 12);
    let previous = 0;
    for (let t = 0; t <= SWEEP_DURATION; t += 0.05) {
      const f = sweepFrequency(t, 25);
      expect(f).toBeGreaterThanOrEqual(previous);
      previous = f;
    }
  });
});
