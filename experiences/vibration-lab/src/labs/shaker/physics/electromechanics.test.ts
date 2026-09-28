import { describe, expect, it } from "vitest";
import {
  availableAcceleration,
  backEMF,
  coilInductiveVoltage,
  coilResistanceVoltage,
  fieldCoilPower,
  forceFactor,
  G,
  localDirections,
  lorentzForce,
  magnitude,
  sample,
  sinusoidalDisplacementFromAcceleration,
  sinusoidalVelocityFromAcceleration,
  TAU,
} from "./electromechanics";
import { gapFluxDensity, magneticState } from "../magnetics/field";
import {
  capability,
  DEFAULTS,
  envelope,
  MACHINE,
  sampleSolution,
  solve,
} from "../shaker-model/model";
import {
  displayGain,
  DRAWING_SCALE,
  frequencyPosition,
  playbackFrequency,
  positionFrequency,
} from "../animation/motion";
import { TOUR, TOUR_DURATION, tourAt, seekTour } from "../animation/tour";

describe("independent SI relationships", () => {
  it("reversing current reverses force", () => {
    expect(lorentzForce(1.2, 50, -4)).toBe(-lorentzForce(1.2, 50, 4));
  });
  it("force is linear in current at fixed field", () => {
    expect(lorentzForce(1.2, 50, 12)).toBe(3 * lorentzForce(1.2, 50, 4));
  });
  it("force scales with B and the active wire length", () => {
    expect(forceFactor(1.2, 50)).toBe(60);
    expect(lorentzForce(0.6, 50, 4)).toBe(0.5 * lorentzForce(1.2, 50, 4));
  });
  it("back EMF scales with speed and reverses with velocity", () => {
    expect(backEMF(80, 0.25)).toBe(20);
    expect(backEMF(80, -0.5)).toBe(-40);
  });
  it("field heating follows I squared R", () => {
    expect(fieldCoilPower(12, 5)).toBe(720);
    expect(fieldCoilPower(6, 5)).toBe(180);
  });
  it("more mass reduces acceleration for fixed net force", () => {
    expect(availableAcceleration(1200, 12)).toBe(100);
    expect(availableAcceleration(1200, 60)).toBe(20);
    expect(() => availableAcceleration(10, 0)).toThrow();
  });
  it("displacement decreases as 1/f squared for constant acceleration", () => {
    const x = sinusoidalDisplacementFromAcceleration(G, 10);
    expect(x).toBeCloseTo(0.002484053464, 12);
    expect(sinusoidalDisplacementFromAcceleration(G, 20)).toBeCloseTo(
      x / 4,
      12,
    );
  });
  it("velocity decreases as 1/f for constant acceleration", () => {
    const v = sinusoidalVelocityFromAcceleration(G, 10);
    expect(v).toBeCloseTo(0.156077682267, 12);
    expect(sinusoidalVelocityFromAcceleration(G, 20)).toBeCloseTo(v / 2, 12);
  });
  it("resistive and inductive voltage have their SI scaling", () => {
    expect(coilResistanceVoltage(10, 0.8)).toBe(8);
    expect(coilInductiveVoltage(0.0012, 10000)).toBeCloseTo(12);
  });
  it("radial B and circumferential I give axial force around the entire coil", () => {
    for (let i = 0; i < 36; i++) {
      for (const sign of [-1, 1]) {
        const { I, B, F } = localDirections((i * TAU) / 36, sign);
        expect(I.reduce((sum, v, j) => sum + v * B[j], 0)).toBeCloseTo(0, 12);
        expect(F[0]).toBeCloseTo(0, 12);
        expect(F[1]).toBeCloseTo(sign, 12);
        expect(F[2]).toBeCloseTo(0, 12);
      }
    }
  });
});
describe("coupled shaker model", () => {
  it("starts with both coils off and has no flux, force or motion", () => {
    const s = solve(DEFAULTS);
    expect(s.field.B).toBe(0);
    expect(s.current).toBe(0);
    expect(s.force).toBe(0);
    expect(s.displacementPeak).toBe(0);
  });
  it("the field alone creates flux and heat without motion", () => {
    const s = solve({ ...DEFAULTS, fieldPercent: 100 });
    expect(s.field.B).toBeCloseTo(1.2, 12);
    expect(s.field.BL).toBeCloseTo(80, 12);
    expect(s.field.heat).toBe(720);
    expect(s.displacementPeak).toBe(0);
    expect(s.emfPeak).toBe(0);
  });
  it("has a monotone saturating field calibration", () => {
    expect(gapFluxDensity(0)).toBe(0);
    let prior = 0;
    for (let i = 1; i <= 100; i++) {
      const B = magneticState(i).B;
      expect(B).toBeGreaterThan(prior);
      expect(B).toBeLessThan(1.6);
      prior = B;
    }
    expect(gapFluxDensity(120)).toBeLessThanOrEqual(1.6);
  });
  it("drive current with no field still heats the drive coil but produces no force", () => {
    const s = solve({
      ...DEFAULTS,
      driveMode: "sine",
      levelPercent: 50,
      frequency: 100,
    });
    expect(s.current).toBe(30);
    expect(s.copperHeat).toBe(360);
    expect(s.force).toBe(0);
    expect(s.emfPeak).toBe(0);
  });
  it("DC equilibrium balances electromagnetic and suspension force", () => {
    for (const manualPercent of [-100, 0, 100]) {
      const s = solve({ ...DEFAULTS, fieldPercent: 100, manualPercent }),
        q = sampleSolution(s, 1.4);
      expect(q.force + q.suspension).toBeCloseTo(0, 10);
      expect(q.x).toBeCloseTo(q.force / 60000, 12);
      expect(q.a).toBe(0);
      expect(q.v).toBe(0);
      expect(q.emf).toBe(0);
      expect(s.displacementPeak).toBeLessThan(MACHINE.peakStroke);
    }
  });
  it("satisfies Newton's law and Kirchhoff's voltage law at arbitrary phases", () => {
    for (const f of [1, 5, 11.25, 20, 100, 2000])
      for (const payload of [0, 40]) {
        const s = solve({
          ...DEFAULTS,
          driveMode: "sine",
          fieldPercent: 80,
          levelPercent: 70,
          frequency: f,
          payload,
        });
        for (let i = 0; i < 33; i++) {
          const q = sampleSolution(s, i * 0.31);
          expect(s.mass * q.a + 250 * q.v + 60000 * q.x).toBeCloseTo(
            q.force,
            8,
          );
          expect(
            q.force + q.suspension + q.armatureInertia + q.payloadReaction,
          ).toBeCloseTo(0, 8);
          expect(q.voltage).toBeCloseTo(sample(s.voltage, i * 0.31), 8);
          expect(q.emf).toBeCloseTo(s.field.BL * q.v, 10);
          expect(q.a).toBeCloseTo(-((TAU * f) ** 2) * q.x, 8);
        }
      }
  });
  it("average amplifier input equals drive heat plus mechanical dissipation", () => {
    for (const f of [1, 11.25, 20, 100, 2000]) {
      const s = solve({
        ...DEFAULTS,
        driveMode: "sine",
        fieldPercent: 100,
        levelPercent: 80,
        frequency: f,
        payload: 25,
      });
      let electrical = 0,
        mechanical = 0;
      for (let i = 0; i < 2048; i++) {
        const q = sampleSolution(s, (i * TAU) / 2048);
        electrical += (q.voltage * q.current) / 2048;
        mechanical += (q.force * q.v) / 2048;
      }
      expect(electrical).toBeCloseTo(s.amplifierRealPower, 8);
      expect(mechanical).toBeCloseTo(s.mechanicalLoss, 8);
    }
  });
  it("the envelope satisfies every modeled limit and reaches at least one", () => {
    for (const fieldPercent of [0, 10, 50, 100])
      for (const payload of [0, 10, 60])
        for (const point of envelope(
          { ...DEFAULTS, fieldPercent, payload },
          71,
        )) {
          const s = solve({
            ...DEFAULTS,
            fieldPercent,
            payload,
            driveMode: "sine",
            levelPercent: 100,
            frequency: point.frequency,
          });
          expect(s.displacementPeak).toBeLessThanOrEqual(
            MACHINE.peakStroke * (1 + 1e-10),
          );
          expect(s.velocityPeak).toBeLessThanOrEqual(1 + 1e-10);
          expect(s.voltagePeak).toBeLessThanOrEqual(120 * (1 + 1e-10));
          expect(s.current).toBeLessThanOrEqual(60);
          expect(s.copperHeat).toBeLessThanOrEqual(1600 * (1 + 1e-10));
          expect(point.current).toBe(point.limits[point.limiting]);
          expect(s.accelerationPeak).toBeCloseTo(point.acceleration, 8);
        }
  });
  it("has derived stroke, velocity, current and voltage regimes for the nominal configuration", () => {
    const regimes = new Set(
      envelope({ ...DEFAULTS, fieldPercent: 100 }, 1000).map((p) => p.limiting),
    );
    expect(regimes.has("stroke")).toBe(true);
    expect(regimes.has("velocity")).toBe(true);
    expect(regimes.has("current")).toBe(true);
    expect(regimes.has("voltage")).toBe(true);
  });
  it("does not clamp the current to a mechanically irrelevant limit with the field off", () => {
    const c = capability(1, 0, 0);
    expect(c.limits.stroke).toBe(Infinity);
    expect(c.limits.velocity).toBe(Infinity);
    expect(c.acceleration).toBe(0);
  });
  it("a payload reduces mass-controlled acceleration at the same delivered force", () => {
    const p = {
      ...DEFAULTS,
      fieldPercent: 100,
      driveMode: "sine" as const,
      frequency: 100,
      levelPercent: 35,
    };
    const bare = solve(p),
      loaded = solve({ ...p, payload: 40 });
    expect(bare.current).toBe(loaded.current);
    expect(bare.force).toBe(loaded.force);
    expect(loaded.accelerationPeak).toBeLessThan(bare.accelerationPeak * 0.25);
    expect(loaded.cap.acceleration).toBeLessThan(bare.cap.acceleration * 0.25);
  });
  it("rejects invalid UI parameter domains", () => {
    for (const patch of [
      { frequency: 0 },
      { frequency: 2001 },
      { payload: -1 },
      { fieldPercent: 101 },
      { manualPercent: NaN },
    ])
      expect(() => solve({ ...DEFAULTS, ...patch })).toThrow();
  });
  it("peak emf agrees with velocity amplitude and electrical impedance is passive", () => {
    for (const f of [1, 10, 20, 1000]) {
      const s = solve({
        ...DEFAULTS,
        driveMode: "sine",
        fieldPercent: 100,
        levelPercent: 50,
        frequency: f,
      });
      expect(s.emfPeak).toBeCloseTo(80 * magnitude(s.velocity), 10);
      expect(s.voltage.re).toBeGreaterThanOrEqual(0.8 * s.current);
    }
  });
});
describe("honest visualization and guided sequence", () => {
  it("does not normalize away current, field or payload changes", () => {
    const p = {
      ...DEFAULTS,
      driveMode: "sine" as const,
      fieldPercent: 100,
      frequency: 100,
    };
    const ref = solve(p);
    for (const patch of [
      { levelPercent: 70 },
      { fieldPercent: 50 },
      { payload: 40 },
    ])
      expect(displayGain(solve({ ...p, ...patch }))).toBe(displayGain(ref));
  });
  it("keeps visible winding travel inside the axial gap throughout the control domain", () => {
    let largest = 0;
    for (const fieldPercent of [0, 25, 50, 75, 100])
      for (const payload of [0, 10, 30, 60])
        for (let i = 0; i < 80; i++) {
          const frequency = positionFrequency(i / 79),
            s = solve({
              ...DEFAULTS,
              driveMode: "sine",
              fieldPercent,
              payload,
              frequency,
              levelPercent: 100,
            });
          largest = Math.max(
            largest,
            s.displacementPeak * displayGain(s) * DRAWING_SCALE,
          );
        }
    for (const manualPercent of [-100, 100]) {
      const s = solve({ ...DEFAULTS, fieldPercent: 100, manualPercent });
      largest = Math.max(
        largest,
        s.displacementPeak * displayGain(s) * DRAWING_SCALE,
      );
    }
    expect(0.865 - 0.022 - largest).toBeGreaterThan(0.4);
    expect(0.865 + 0.031 * 9 + 0.022 + largest).toBeLessThan(1.5);
  });
  it("keeps actual frequency distinct from slow playback and maps the log slider reversibly", () => {
    for (const f of [1, 5, 25, 100, 2000]) {
      expect(positionFrequency(frequencyPosition(f))).toBeCloseTo(f, 9);
      expect(playbackFrequency(f)).toBeLessThanOrEqual(1.25);
    }
    expect(playbackFrequency(2000)).toBeLessThan(2000 / 1000);
  });
  it("the tour is 76 seconds, starts off, reverses current, generates emf, then adds payload", () => {
    expect(TOUR_DURATION).toBe(76);
    expect(TOUR).toHaveLength(20);
    expect(tourAt(0).parameters.fieldPercent).toBe(0);
    expect(tourAt(0).parameters.manualPercent).toBe(0);
    expect(tourAt(10 * 3.8 + 0.1).parameters.manualPercent).toBe(-100);
    expect(solve(tourAt(15 * 3.8 + 0.1).parameters).emfPeak).toBeGreaterThan(0);
    expect(tourAt(76).parameters.payload).toBe(40);
  });
  it("all tour states remain finite and respect the model limits", () => {
    for (let t = 0; t <= 76; t += 0.1) {
      const s = solve(tourAt(t).parameters);
      for (const v of [
        s.field.B,
        s.current,
        s.force,
        s.voltagePeak,
        s.accelerationPeak,
        s.displacementPeak,
      ])
        expect(Number.isFinite(v)).toBe(true);
      expect(s.voltagePeak).toBeLessThanOrEqual(120.000001);
    }
  });
  it("next and previous visit every exact stage boundary without stalling", () => {
    let time = 0;
    for (let i = 1; i < 20; i++) {
      time = seekTour(time, 1);
      expect(tourAt(time).index).toBe(i);
      expect(tourAt(i * 3.8).index).toBe(i);
    }
    expect(tourAt(seekTour(time, 1)).index).toBe(19);
    for (let i = 18; i >= 0; i--) {
      time = seekTour(time, -1);
      expect(tourAt(time).index).toBe(i);
    }
    expect(seekTour(time, -1)).toBe(0);
  });
});
