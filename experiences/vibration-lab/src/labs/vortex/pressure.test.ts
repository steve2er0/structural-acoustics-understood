import { describe, expect, it } from "vitest";
import { DEFAULT, solve } from "./physics";
import {
  ATTACHMENT_Y,
  attachments,
  HARMONIC_INDEX,
  harmonicComparisonTaps,
  footprintWidth,
  attachmentWakeCenter,
  clampTap,
  convectionSpeed,
  evaluateModes,
  modeCorrelation,
  modeRms,
  noseY,
  omlRadius,
  PRESSURE_DEFAULT,
  pressureModes,
  pressureRgb,
  pressureScale,
  tapPoint,
} from "./pressure";
const model = solve(DEFAULT),
  body = model.bodies[0],
  settings = PRESSURE_DEFAULT;
describe("prescribed surface pressure", () => {
  it("has zero fluctuating pressure without flow or attachments, and ahead of the bracket", () => {
    for (const m of [
      solve({ ...DEFAULT, mach: 0 }),
      solve({ ...DEFAULT, boosters: false }),
    ])
      expect(modeRms(pressureModes(m, m.bodies[0], settings, 0, 0.6))).toBe(0);
    expect(
      modeRms(pressureModes(model, body, settings, noseY(body), 0.6)),
    ).toBe(0);
  });
  it("keeps attachment shedding active in axial flow and loads both facing surfaces", () => {
    const axial = solve({ ...DEFAULT, alpha: 0, beta: 0 });
    const core = pressureModes(
      axial,
      axial.bodies[0],
      settings,
      4,
      Math.PI / 2,
    );
    const booster = pressureModes(
      axial,
      axial.bodies[2],
      settings,
      4,
      (3 * Math.PI) / 2,
    );
    expect(modeRms(core)).toBeGreaterThan(0.03);
    for (const t of [0, 0.3, 1])
      expect(evaluateModes(core, t)).toBeCloseTo(evaluateModes(booster, t), 9);
    expect(
      modeRms(
        pressureModes(
          axial,
          axial.bodies[0],
          settings,
          ATTACHMENT_Y + 0.01,
          Math.PI / 2,
        ),
      ),
    ).toBe(0);
  });
  it("scales amplitudes linearly and pressure with dynamic pressure", () => {
    const rms = (m = model, amplitude = settings.amplitude) =>
      modeRms(
        pressureModes(m, m.bodies[0], { ...settings, amplitude }, 0, 0.6),
      );
    expect(rms(model, 0.24)).toBeCloseTo(2 * rms());
    const faster = solve({ ...DEFAULT, mach: DEFAULT.mach * 2 });
    expect(rms(faster) * pressureScale(faster, "pa")).toBeCloseTo(
      4 * rms() * pressureScale(model, "pa"),
    );
  });
  it("is periodic around the circumference and mirrors reversed incidence", () => {
    const reversed = solve({ ...DEFAULT, alpha: -DEFAULT.alpha });
    for (const time of [0, 0.12, 0.74]) {
      const sample = (m: typeof model, angle: number) =>
        evaluateModes(pressureModes(m, m.bodies[0], settings, 0, angle), time);
      expect(sample(model, 0.6)).toBeCloseTo(sample(model, 0.6 + 2 * Math.PI));
      expect(modeRms(pressureModes(model, body, settings, 0, 0.6))).toBeCloseTo(
        modeRms(pressureModes(reversed, body, settings, 0, Math.PI - 0.6)),
      );
    }
  });
  it("matches analytic RMS and zero mean over the common 50 second period", () => {
    const modes = pressureModes(model, body, settings, 0, 0.6);
    let sum = 0,
      sum2 = 0;
    for (let i = 0; i < 20000; i++) {
      const p = evaluateModes(modes, (i * 50) / 20000);
      sum += p;
      sum2 += p * p;
    }
    expect(sum / 20000).toBeCloseTo(0, 9);
    expect(Math.sqrt(sum2 / 20000)).toBeCloseTo(modeRms(modes), 9);
    expect(modeCorrelation(modes, modes)).toBeCloseTo(1);
  });
  it("uses an independent prescribed tone, not the cylinder Strouhal reference", () => {
    const a = pressureModes(model, body, settings, 0, 0.6);
    const other = solve({ ...DEFAULT, strouhal: 0.35 });
    expect(pressureModes(other, other.bodies[0], settings, 0, 0.6)).toEqual(a);
    expect(
      pressureModes(model, body, { ...settings, coherence: 1 }, 0, 0.6)
        .slice(1, HARMONIC_INDEX)
        .every((m) => modeRms([m]) === 0),
    ).toBe(true);
  });
  it("has an odd fundamental and an even 2x harmonic about each wake centerline", () => {
    const axial = solve({ ...DEFAULT, alpha: 0, beta: 0 });
    const booster = axial.bodies[2],
      y = 4,
      center = (3 * Math.PI) / 2;
    const coherent = { ...settings, coherence: 1 };
    const at = (d: number) =>
      pressureModes(
        axial,
        booster,
        coherent,
        y,
        center + d * footprintWidth(ATTACHMENT_Y - y),
      );
    const middle = at(0),
      plus = at(1),
      minus = at(-1);
    expect(modeRms([middle[0]])).toBeLessThan(1e-12);
    expect(modeRms([middle[HARMONIC_INDEX]])).toBeGreaterThan(0.02);
    expect(middle[HARMONIC_INDEX].frequency).toBe(2 * settings.frequency);
    for (const t of [0, 0.047, 0.31]) {
      expect(evaluateModes([plus[0]], t)).toBeCloseTo(
        -evaluateModes([minus[0]], t),
        12,
      );
      expect(evaluateModes([plus[HARMONIC_INDEX]], t)).toBeCloseTo(
        evaluateModes([minus[HARMONIC_INDEX]], t),
        12,
      );
      expect(evaluateModes(middle, t)).toBeCloseTo(
        evaluateModes(middle, t + 1 / (2 * settings.frequency)),
        12,
      );
    }
    expect(modeRms([plus[HARMONIC_INDEX]])).toBeLessThan(
      modeRms([middle[HARMONIC_INDEX]]),
    );
  });
  it("locks the 2x phase to the carrier and allows the harmonic to be removed independently", () => {
    const source = attachments(model)[1],
      booster = model.bodies[2],
      s = 10;
    const p = attachmentWakeCenter(model, source, s);
    const center = Math.atan2(p[0] - booster.x, p[2]);
    const modes = pressureModes(
      model,
      booster,
      settings,
      ATTACHMENT_Y - s,
      center,
    );
    const harmonic = modes[HARMONIC_INDEX];
    const gain = Math.hypot(harmonic.cosine, harmonic.sine);
    for (const t of [0, 0.07, 0.39]) {
      const carrierPhase =
        2 * Math.PI * settings.frequency * (t - s / convectionSpeed(model)) +
        source.sign * 0.4;
      expect(evaluateModes([harmonic], t) / gain).toBeCloseTo(
        Math.cos(2 * carrierPhase),
        12,
      );
    }
    const off = pressureModes(
      model,
      booster,
      { ...settings, harmonic: 0 },
      ATTACHMENT_Y - s,
      center,
    );
    expect(off.slice(0, HARMONIC_INDEX)).toEqual(
      modes.slice(0, HARMONIC_INDEX),
    );
    expect(modeRms([off[HARMONIC_INDEX]])).toBe(0);
    const doubled = pressureModes(
      model,
      booster,
      { ...settings, frequency: settings.frequency * 2 },
      ATTACHMENT_Y - s,
      center,
    );
    expect(doubled[HARMONIC_INDEX].frequency).toBe(4 * settings.frequency);
  });
  it("places comparison taps at the flank and projected centerline after attitude changes", () => {
    for (const body of model.bodies) {
      const [a, b] = harmonicComparisonTaps(model, body.index);
      expect(a.y).toBe(b.y);
      expect(a.body).toBe(body.index);
      const source = attachments(model).find(
        (s) => s.booster === (body.index || 2),
      )!;
      const p = attachmentWakeCenter(model, source, ATTACHMENT_Y - b.y);
      const center = Math.atan2(p[0] - body.x, p[2]);
      expect(Math.sin(b.theta - center)).toBeCloseTo(0, 12);
      expect(Math.sin(a.theta - b.theta)).toBeCloseTo(
        Math.sin(footprintWidth(ATTACHMENT_Y - b.y)),
        12,
      );
    }
  });
  it("retards a traveling mode at the downstream station by distance / Uc", () => {
    const body = model.bodies[2],
      uc = convectionSpeed(model),
      s1 = 10,
      s2 = 25;
    // Isolate the fourth tone, whose positive spatial weight carries no additional meander phase.
    const source = attachments(model)[1];
    const modes = [s1, s2].map((s) => {
      const p = attachmentWakeCenter(model, source, s);
      return [
        pressureModes(
          model,
          body,
          settings,
          ATTACHMENT_Y - s,
          Math.atan2(p[0] - body.x, p[2]),
        )[3],
      ];
    });
    const normalized = (i: number, t: number) =>
      evaluateModes(modes[i], t) / modeRms(modes[i]);
    expect(normalized(0, 0.13)).toBeCloseTo(
      normalized(1, 0.13 + (s2 - s1) / uc),
      9,
    );
  });
  it("keeps pressure taps on the correct OML and handles removed boosters", () => {
    for (const b of model.bodies) {
      const tap = clampTap({ body: b.index, y: 10, theta: -1 }, model),
        p = tapPoint(b, tap);
      expect(Math.hypot(p[0] - b.x, p[2])).toBeCloseTo(omlRadius(b, 10) + 0.08);
    }
    const tap = clampTap(
      { body: 2, y: 100, theta: -1 },
      solve({ ...DEFAULT, boosters: false }),
    );
    expect(tap.body).toBe(0);
    expect(tap.y).toBeLessThan(noseY(body));
    expect(tap.theta).toBeGreaterThan(0);
    expect(modeCorrelation([], [])).toBeNull();
  });
  it("uses a fixed diverging scale with explicit saturation", () => {
    expect(pressureRgb(0, 0.25)).toEqual([231, 236, 225]);
    expect(pressureRgb(-1, 0.25)).toEqual(pressureRgb(-0.25, 0.25));
    expect(pressureRgb(1, 0.25)).toEqual(pressureRgb(0.25, 0.25));
  });
});
