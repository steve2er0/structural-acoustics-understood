import { describe, expect, it } from "vitest";
import {
  DEFAULT,
  FS,
  GRID,
  IMPULSE,
  MODES,
  PLATE,
  TIPS,
  expectedCoherence,
  fft,
  force,
  forceSpectrum,
  frf,
  magnitude,
  measure,
  modalTerm,
  reconstruct,
  shape,
  surveyValues,
} from "./physics";
const clean = measure(DEFAULT);
const rms = (a: Float32Array, start: number, end: number) =>
  Math.sqrt(
    a
      .subarray(Math.floor(start * FS), Math.floor(end * FS))
      .reduce((s, v) => s + v * v, 0) /
      ((end - start) * FS),
  );
describe("free-edge plate modal model", () => {
  it("stores six ordered converged elastic modes with positive modal mass", () => {
    expect(MODES).toHaveLength(6);
    MODES.forEach((m, i) => {
      expect(m.frequency).toBeGreaterThan(i ? MODES[i - 1].frequency : 0);
      expect(m.mass).toBeGreaterThan(0);
      expect(m.convergencePercent).toBeLessThan(0.018);
      expect(m.coefficients).toHaveLength(PLATE.basis.length);
    });
  });
  it("matches reproducible Ritz frequencies and plate mass", () => {
    expect(MODES.map((m) => +m.frequency.toFixed(3))).toEqual([
      53.821, 57.964, 124.628, 136.159, 155.555, 183.07,
    ]);
    expect(
      PLATE.length * PLATE.width * PLATE.thickness * PLATE.density,
    ).toBeCloseTo(2.592, 8);
  });
  it("normalizes the actual spatial modes, including free-edge displacement", () => {
    MODES.forEach((_, m) => {
      let peak = 0;
      for (let i = 0; i <= 40; i++)
        for (let j = 0; j <= 30; j++)
          peak = Math.max(peak, Math.abs(shape(m, i / 20 - 1, j / 15 - 1)));
      expect(peak).toBeCloseTo(1, 3);
      expect(
        Math.max(
          ...Array.from({ length: 41 }, (_, i) =>
            Math.abs(shape(m, 1, i / 20 - 1)),
          ),
        ),
      ).toBeGreaterThan(0.3);
    });
  });
  it("has nodal cancellation and input/output location dependence", () => {
    expect(Math.abs(shape(0, 0, 0.8))).toBeLessThan(1e-6);
    expect(
      magnitude(frf(MODES[0].frequency, { x: 0, y: 0 }, GRID[4], 0.012)),
    ).toBeLessThan(
      magnitude(frf(MODES[0].frequency, GRID[0], GRID[4], 0.012)) * 0.25,
    );
  });
  it("is reciprocal for a passive linear plate", () => {
    for (const f of [22, 53.8, 87, 156, 205])
      expect(frf(f, GRID[3], GRID[12], 0.02)).toEqual(
        frf(f, GRID[12], GRID[3], 0.02),
      );
  });
  it("preserves accelerance, mobility and receptance complex relationships", () => {
    const f = 88,
      w = 2 * Math.PI * f,
      r = frf(f, GRID[2], GRID[8], 0.02, "receptance"),
      v = frf(f, GRID[2], GRID[8], 0.02, "mobility"),
      a = frf(f, GRID[2], GRID[8], 0.02);
    expect(v.re).toBeCloseTo(-w * r.im, 10);
    expect(v.im).toBeCloseTo(w * r.re, 10);
    expect(a.re).toBeCloseTo(-w * w * r.re, 10);
    expect(a.im).toBeCloseTo(-w * w * r.im, 10);
  });
  it("places isolated modal accelerance maxima near natural frequencies", () => {
    MODES.forEach((m, i) => {
      let peak = 0,
        fpeak = 0;
      for (let f = m.frequency * 0.95; f <= m.frequency * 1.05; f += 0.02) {
        const v = magnitude(modalTerm(i, f, 0.01));
        if (v > peak) {
          peak = v;
          fpeak = f;
        }
      }
      expect(Math.abs(fpeak / m.frequency - 1)).toBeLessThan(0.001);
    });
  });
  it("higher damping lowers and broadens isolated modal peaks", () => {
    const mode = 2,
      fn = MODES[mode].frequency;
    const width = (z: number) => {
      const peak = magnitude(modalTerm(mode, fn, z));
      let bins = 0;
      for (let f = fn * 0.8; f < fn * 1.2; f += 0.02)
        if (magnitude(modalTerm(mode, f, z)) >= peak / Math.sqrt(2)) bins++;
      return bins * 0.02;
    };
    expect(magnitude(modalTerm(mode, fn, 0.04))).toBeLessThan(
      magnitude(modalTerm(mode, fn, 0.01)) * 0.26,
    );
    expect(width(0.04) / width(0.01)).toBeCloseTo(4, 0);
  });
});
describe("hammer and measured record", () => {
  it("integrates all finite pulse tips to the same impulse", () => {
    for (const tip of Object.keys(TIPS) as (keyof typeof TIPS)[]) {
      let integral = 0;
      const dt = TIPS[tip].duration / 1000;
      for (let i = 0; i < 1000; i++)
        integral += force((i + 0.5) * dt, tip) * dt;
      expect(integral).toBeCloseTo(IMPULSE, 6);
      expect(force(-0.01, tip)).toBe(0);
      expect(force(0.1, tip)).toBe(0);
    }
  });
  it("hard tips excite wider bandwidth than soft tips", () => {
    expect(magnitude(forceSpectrum(180, "Hard"))).toBeGreaterThan(
      magnitude(forceSpectrum(180, "Soft")) * 10,
    );
    expect(magnitude(forceSpectrum(0, "Soft"))).toBeCloseTo(IMPULSE, 5);
  });
  it("adds a clearly delayed second force pulse for double hits", () => {
    expect(force(0.0365, "Medium", true)).toBeCloseTo(
      0.65 * force(0.0015, "Medium"),
      9,
    );
    expect(force(0.0365, "Medium")).toBe(0);
  });
  it("FFT has the correct complex sign and normalization", () => {
    const re = Float64Array.from({ length: 32 }, (_, i) =>
        Math.sin((2 * Math.PI * i) / 32),
      ),
      im = new Float64Array(32);
    fft(re, im);
    expect(re[1]).toBeCloseTo(0, 10);
    expect(im[1]).toBeCloseTo(-16, 10);
  });
  it("starts from rest and produces a real nonzero ring-down", () => {
    expect(clean.acceleration[0]).toBe(0);
    expect(clean.q.every((q) => q[0] === 0)).toBe(true);
    expect(clean.peakAcceleration).toBeGreaterThan(5);
    expect(rms(clean.acceleration, 0.5, 0.6)).toBeLessThan(
      rms(clean.acceleration, 0.02, 0.12),
    );
  });
  it("time-domain FFT agrees with the analytical complex accelerance", () => {
    for (const f of [40, 54, 58, 100, 125, 156, 183, 205]) {
      const k = f * 4,
        a = clean.measured[k],
        b = clean.model[k];
      const error =
        Math.hypot(a.re - b.re, a.im - b.im) / Math.max(0.1, magnitude(b));
      expect(error).toBeLessThan(0.008);
    }
  });
  it("damping consistently shortens the measured ring-down", () => {
    const damped = measure({ ...DEFAULT, damping: 0.04 });
    expect(rms(damped.acceleration, 0.4, 0.6)).toBeLessThan(
      rms(clean.acceleration, 0.4, 0.6) * 0.15,
    );
  });
  it("response location changes the actual recorded acceleration", () => {
    const other = measure({ ...DEFAULT, output: 7 });
    expect(rms(other.acceleration, 0, 0.2)).not.toBeCloseTo(
      rms(clean.acceleration, 0, 0.2),
      1,
    );
  });
  it("predicts ensemble coherence bounded by 0 and 1 with response noise", () => {
    const noisy = measure({ ...DEFAULT, noise: 20 });
    let sum = 0;
    for (let i = 120; i < 850; i++) {
      expect(noisy.coherence[i]).toBeGreaterThanOrEqual(0);
      expect(noisy.coherence[i]).toBeLessThanOrEqual(1);
      sum += noisy.coherence[i];
    }
    expect(sum / 730).toBeLessThan(0.95);
    expect(clean.coherence[300]).toBe(1);
    expect(expectedCoherence(4, 4)).toBe(0.5);
    expect(expectedCoherence(0, 0)).toBe(0);
  });
  it("increased output noise worsens the measured complex FRF", () => {
    const noisy = measure({ ...DEFAULT, noise: 6 }),
      err = (m: typeof clean) =>
        m.measured.reduce(
          (s, v, i) =>
            s +
            (m.valid[i]
              ? Math.hypot(v.re - m.model[i].re, v.im - m.model[i].im)
              : 0),
          0,
        );
    expect(err(noisy)).toBeGreaterThan(err(clean) * 20);
  });
  it("fits signed modal samples from measured FRFs", () => {
    const values = surveyValues(clean);
    values.forEach((v, i) =>
      expect(v).toBeCloseTo(
        shape(i, GRID[DEFAULT.input].x, GRID[DEFAULT.input].y),
        2,
      ),
    );
  });
  it("reconstruction preserves measured samples and is empty without measurements", () => {
    const values = surveyValues(clean),
      p = GRID[DEFAULT.input];
    expect(reconstruct(0, p.x, p.y, { [DEFAULT.input]: values })).toBe(
      values[0],
    );
    expect(reconstruct(0, 0.2, 0.3, {})).toBe(0);
    expect(
      Math.abs(reconstruct(0, 0.8, -0.8, { [DEFAULT.input]: values })),
    ).toBeLessThan(Math.abs(values[0]) * 0.05);
  });
});

describe("modal mass and observability", () => {
  it("preserves mass normalization and orthogonality under the Legendre basis", () => {
    const mass = PLATE.length * PLATE.width * PLATE.thickness * PLATE.density;
    MODES.forEach((mode, i) =>
      MODES.forEach((other, j) => {
        const integral = mode.coefficients.reduce(
          (sum, c, k) =>
            sum +
            (c * other.coefficients[k] * mass) /
              ((2 * PLATE.basis[k][0] + 1) * (2 * PLATE.basis[k][1] + 1)),
          0,
        );
        expect(integral).toBeCloseTo(i === j ? mode.mass : 0, 8);
      }),
    );
  });
  it("rejects reconstruction when the reference lies on a modal node", () => {
    const centered = surveyValues(measure({ ...DEFAULT, output: 7 }));
    expect(Number.isNaN(centered[0])).toBe(true);
    expect(Number.isNaN(centered[2])).toBe(true);
    expect(Number.isFinite(centered[1])).toBe(true);
  });
});
