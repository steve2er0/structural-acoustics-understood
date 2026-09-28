import { describe, expect, it } from "vitest";
import {
  DEFAULT,
  SOUND_SPEED,
  solve,
  longitudinalPath,
  sourceY,
  pathLength,
  pairVisibility,
  axialTravel,
  TAIL,
  physicalTimeRate,
} from "./physics";
describe("launch vehicle flow and longitudinal paths", () => {
  it("uses the ideal-gas speed of sound at the documented temperature", () => {
    expect(SOUND_SPEED).toBeCloseTo(340.2922869, 5);
    expect(solve({ ...DEFAULT, mach: 1 }).speed).toBe(SOUND_SPEED);
  });
  it("returns zero flow, frequency and pressure in still air without NaNs", () => {
    const m = solve({ ...DEFAULT, mach: 0 });
    expect(m.speed).toBe(0);
    expect(m.crossSpeed).toBe(0);
    expect(m.dynamicPressure).toBe(0);
    expect(m.bodies.every((b) => b.frequency === 0 && b.reynolds === 0)).toBe(
      true,
    );
    expect(m.normal.every(Number.isFinite)).toBe(true);
  });
  it("removes barrel crossflow for axial flight even at supersonic Mach", () => {
    const m = solve({ ...DEFAULT, alpha: 0, beta: 0, mach: 2 });
    expect(m.crossSpeed).toBe(0);
    expect(m.bodies[0].frequency).toBe(0);
    expect(m.axialSpeed).toBe(m.speed);
  });
  it("recovers the full freestream for either broadside angle", () => {
    for (const angles of [
      { alpha: 90, beta: 0 },
      { alpha: 0, beta: -90 },
    ]) {
      const m = solve({ ...DEFAULT, ...angles });
      expect(m.crossSpeed).toBeCloseTo(m.speed, 12);
      expect(m.incidence).toBeCloseTo(90, 10);
    }
  });
  it("matches an independently resolved combined-angle vector", () => {
    const m = solve({ ...DEFAULT, mach: 0.2, alpha: 30, beta: 30 });
    expect(m.flow[0]).toBeCloseTo(-0.5, 12);
    expect(m.flow[1]).toBeCloseTo(-0.75, 12);
    expect(m.flow[2]).toBeCloseTo(Math.sqrt(3) / 4, 12);
    expect(m.crossSpeed / m.speed).toBeCloseTo(Math.sqrt(7) / 4, 12);
    expect(m.crossSpeed ** 2 + m.axialSpeed ** 2).toBeCloseTo(m.speed ** 2, 8);
    expect(Math.hypot(...m.flow)).toBeCloseTo(1, 12);
  });
  it("reverses the wake direction, preserving frequency, when angle signs reverse", () => {
    const a = solve({ ...DEFAULT, alpha: 23, beta: 17 }),
      b = solve({ ...DEFAULT, alpha: -23, beta: -17 });
    expect(a.crossSpeed).toBe(b.crossSpeed);
    expect(a.bodies[0].frequency).toBe(b.bodies[0].frequency);
    expect(a.normal[0]).toBe(-b.normal[0]);
    expect(a.normal[1]).toBe(-b.normal[1]);
  });
  it("obeys f=St Uperp/D with the actual core and booster diameters", () => {
    const m = solve({ ...DEFAULT, mach: 0.1, alpha: 90 });
    expect(m.bodies[0].frequency).toBeCloseTo(
      (0.2 * (0.1 * SOUND_SPEED)) / 5,
      12,
    );
    expect(m.bodies[1].frequency / m.bodies[0].frequency).toBeCloseTo(
      5 / 3.2,
      12,
    );
    expect(m.bodies[1].frequency).toBe(m.bodies[2].frequency);
    const faster = solve({ ...DEFAULT, mach: DEFAULT.mach * 2 });
    expect(faster.bodies[0].frequency).toBeCloseTo(
      solve(DEFAULT).bodies[0].frequency * 2,
      12,
    );
  });
  it("only identifies geometric overlap; never invents a shielding correction", () => {
    const pitch = solve({ ...DEFAULT, alpha: 25, beta: 0 });
    expect(pitch.bodies.every((b) => b.upstream.length === 0)).toBe(true);
    const yaw = solve({ ...DEFAULT, alpha: 0, beta: 25 });
    expect(yaw.bodies[2].upstream).toEqual([]);
    expect(yaw.bodies[0].upstream).toEqual(["Starboard booster"]);
    expect(yaw.bodies[1].upstream).toEqual(["Core", "Starboard booster"]);
    expect(yaw.bodies[0].frequency).toBeCloseTo(pitch.bodies[0].frequency, 12);
  });
  it("preserves physical gap and removes boosters entirely in isolated mode", () => {
    const m = solve({ ...DEFAULT, gap: 1.7 });
    expect(m.bodies[2].x - (5 + 3.2) / 2).toBeCloseTo(1.7, 12);
    const single = solve({ ...DEFAULT, boosters: false });
    expect(single.bodies).toHaveLength(1);
    expect(single.bodies[0].frequency).toBe(solve(DEFAULT).bodies[0].frequency);
  });
  it("marks total Mach compressibility even if crossflow Mach stays small", () => {
    expect(solve({ ...DEFAULT, mach: 0.3 }).regime).toBe("Subsonic analogy");
    const m = solve({ ...DEFAULT, mach: 1, alpha: 2 });
    expect(m.crossMach).toBeLessThan(0.1);
    expect(m.regime).toBe("Compressible extrapolation");
  });
  it("develops along the body and then aligns with the full air vector aft", () => {
    const m = solve(DEFAULT),
      b = m.bodies[0];
    const start = longitudinalPath(m, b, 0, 0);
    const tailDistance = sourceY(b) - TAIL;
    const tail = longitudinalPath(m, b, 0, tailDistance);
    expect(start[1]).toBe(26.5);
    expect(tail[1]).toBe(-22);
    expect(start[1] - tail[1]).toBeGreaterThan(
      10 * Math.abs(tail[2] - start[2]),
    );
    const end = longitudinalPath(m, b, 0, tailDistance + 10);
    const delta = end.map((v, i) => v - tail[i]);
    const mag = Math.hypot(...delta);
    delta.forEach((v, i) => expect(v / mag).toBeCloseTo(m.flow[i], 12));
  });
  it("keeps both cores beside the barrel at every axial station", () => {
    const m = solve(DEFAULT);
    for (const b of m.bodies)
      for (const side of [0, 1]) {
        let previousY = Infinity;
        for (let s = 0; s <= pathLength(b); s += 1) {
          const p = longitudinalPath(m, b, side, s);
          expect(p[1]).toBeLessThan(previousY);
          if (p[1] >= TAIL)
            expect(Math.hypot(p[0] - b.x, p[2])).toBeGreaterThan(
              b.diameter / 2,
            );
          previousY = p[1];
        }
      }
  });
  it("mirrors leeward placement with angle signs while preserving axial position", () => {
    const a = solve({ ...DEFAULT, alpha: 12, beta: 8 });
    const b = solve({ ...DEFAULT, alpha: -12, beta: -8 });
    for (const side of [0, 1]) {
      const p = longitudinalPath(a, a.bodies[0], side, 20);
      const q = longitudinalPath(b, b.bodies[0], side, 20);
      expect(q[0]).toBeCloseTo(-p[0], 12);
      expect(q[2]).toBeCloseTo(-p[2], 12);
      expect(q[1]).toBe(p[1]);
    }
  });
  it("transports air axially with no crossflow oscillator and stops in still air", () => {
    const axial = solve({ ...DEFAULT, alpha: 0, beta: 0, mach: 0.2 });
    expect(axial.bodies[0].frequency).toBe(0);
    expect(pairVisibility(axial)).toBe(0);
    expect(axialTravel(axial, 1)).toBeCloseTo(0.65 * 0.2 * SOUND_SPEED, 12);
    const still = solve({ ...DEFAULT, mach: 0 });
    expect(axialTravel(still, 1)).toBe(0);
    expect(pairVisibility(still)).toBe(0);
  });
  it("keeps the geometric pair independent of the cylinder reference frequency", () => {
    const a = solve({ ...DEFAULT, strouhal: 0.1 });
    const b = solve({ ...DEFAULT, strouhal: 0.3 });
    expect(b.bodies[0].frequency).toBeCloseTo(3 * a.bodies[0].frequency, 12);
    expect(longitudinalPath(a, a.bodies[0], 0, 20)).toEqual(
      longitudinalPath(b, b.bodies[0], 0, 20),
    );
    expect(axialTravel(a, 1)).toBe(axialTravel(b, 1));
  });
  it("bounds full-flow visual transport, including zero-incidence ascent", () => {
    for (const mach of [0, 0.01, 0.3, 1, 2]) {
      const m = solve({ ...DEFAULT, alpha: 0, beta: 0, mach });
      const rate = physicalTimeRate(m, 0.5);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(0.5);
      expect(m.speed * rate).toBeLessThanOrEqual(14.000000001);
    }
  });
});
