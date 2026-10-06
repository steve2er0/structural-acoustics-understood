import { describe, expect, it } from "vitest";
// @ts-expect-error The legacy course calculator is plain JavaScript.
import { jointAcceptance, spatialCoherence } from "../../../../../js/demos.js";
import {
  DEFAULT,
  MODE_ORDER,
  axisIntegral,
  coherence,
  createRealization,
  frequencyRange,
  integratedResponse,
  magnitude,
  modalForceMatrix,
  modes,
  receptance,
  sampleRealization,
  shape,
  solve,
  spectrum,
  type Field,
  type Settings,
} from "./physics";

const FIELDS: Field[] = ["tbl", "daf", "pwf"];
const legacy: Record<Field, string> = {
  tbl: "tbl",
  daf: "diffuse",
  pwf: "plane-wave",
};
const relative = (actual: number, expected: number, tolerance = 1e-6) =>
  expect(
    Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-30),
  ).toBeLessThan(tolerance);

describe("spatial pressure fields and conventions", () => {
  it("agrees directly with the existing field kernels, using Uc as legacy velocity", () => {
    for (const field of FIELDS)
      for (const [x, y] of [
        [0, 0],
        [0.14, -0.08],
        [-0.23, 0.17],
      ]) {
        const s = { ...DEFAULT, field };
        const expected = spatialCoherence(legacy[field], {
          ...s,
          x,
          y,
          velocity: s.velocity * s.convectionRatio,
        });
        const actual = coherence(s, x, y);
        expect(actual.re).toBeCloseTo(expected.re, 13);
        expect(actual.im).toBeCloseTo(expected.im, 13);
      }
  });
  it("has unit diagonal, Hermitian symmetry, and positive pressure covariance", () => {
    const points = [
      [0.01, 0.09],
      [0.32, 0.1],
      [0.18, 0.46],
      [0.56, 0.52],
    ];
    for (const field of FIELDS) {
      const s = { ...DEFAULT, field, heading: 31 };
      expect(coherence(s, 0, 0).re).toBe(1);
      for (const point of points) {
        const a = coherence(s, point[0], point[1]),
          b = coherence(s, -point[0], -point[1]);
        expect(a.re).toBeCloseTo(b.re, 13);
        expect(a.im).toBeCloseTo(-b.im, 13);
      }
      for (let trial = 0; trial < 8; trial++) {
        const vectors = points.map((_, i) => [
          Math.sin(i * 1.7 + trial),
          Math.cos(i * 2.3 + trial),
        ]);
        let power = 0;
        for (let i = 0; i < points.length; i++)
          for (let j = 0; j < points.length; j++) {
            const c = coherence(
              s,
              points[i][0] - points[j][0],
              points[i][1] - points[j][1],
            );
            const a = vectors[i],
              b = vectors[j];
            power +=
              c.re * (a[0] * b[0] + a[1] * b[1]) -
              c.im * (a[0] * b[1] - a[1] * b[0]);
          }
        expect(power).toBeGreaterThanOrEqual(-1e-12);
      }
    }
  });
  it("uses Corcos magnitude e-fold lengths, physical delay, and heading rotation", () => {
    const result = solve(DEFAULT);
    expect(magnitude(coherence(DEFAULT, result.lx, 0))).toBeCloseTo(
      Math.exp(-1),
      12,
    );
    expect(magnitude(coherence(DEFAULT, 0, result.ly))).toBeCloseTo(
      Math.exp(-1),
      12,
    );
    expect(coherence(DEFAULT, result.lambdaC / 4, 0).im).toBeLessThan(0);
    relative(
      result.delay,
      ((DEFAULT.bx - DEFAULT.ax) * DEFAULT.length) / result.uc,
    );
    const a = coherence(DEFAULT, 0.18, 0.04),
      b = coherence({ ...DEFAULT, heading: 90 }, -0.04, 0.18);
    expect(a.re).toBeCloseTo(b.re, 12);
    expect(a.im).toBeCloseTo(b.im, 12);
  });
  it("uses spherical DAF sinc and unit-coherent PWF including uniform normal incidence", () => {
    const lambda = DEFAULT.soundSpeed / DEFAULT.frequency;
    expect(
      coherence({ ...DEFAULT, field: "daf" }, lambda / 2, 0).re,
    ).toBeCloseTo(0, 12);
    expect(
      coherence({ ...DEFAULT, field: "daf" }, 0.75 * lambda, 0).re,
    ).toBeLessThan(0);
    expect(
      magnitude(coherence({ ...DEFAULT, field: "pwf" }, 0.34, 0.52)),
    ).toBeCloseTo(1, 12);
    expect(coherence({ ...DEFAULT, field: "pwf", incidence: 0 }, 2, 3).re).toBe(
      1,
    );
  });
  it("keeps δ99 contextual and distinguishes the outer-flow reduced frequency", () => {
    const a = solve(DEFAULT),
      b = solve({ ...DEFAULT, delta: 0.12 });
    expect(b.coherence).toEqual(a.coherence);
    expect(b.accelerationPsd).toBe(a.accelerationPsd);
    relative(b.reducedFrequency / a.reducedFrequency, 3);
    relative(
      a.reducedFrequency,
      (2 * Math.PI * DEFAULT.frequency * DEFAULT.delta) / DEFAULT.velocity,
    );
  });
});

describe("simply supported panel and exact pressure projection", () => {
  it("has analytical modal frequencies, modal masses, boundary zeros and orthogonality", () => {
    const s = { ...DEFAULT, length: 1, width: 1 },
      basis = modes(s);
    const m11 = basis[0],
      m21 = basis[MODE_ORDER];
    relative(m11.mass, (s.density * s.thickness) / 4);
    relative(m21.frequency / m11.frequency, 2.5);
    relative(
      modes({ ...s, thickness: 2 * s.thickness })[0].frequency,
      2 * m11.frequency,
    );
    let norm = 0,
      cross = 0;
    for (let i = 0; i < 24; i++)
      for (let j = 0; j < 24; j++) {
        const x = (i + 0.5) / 24,
          y = (j + 0.5) / 24,
          a = shape(m11, x, y);
        norm += (a * a) / 24 ** 2;
        cross += (a * shape(m21, x, y)) / 24 ** 2;
      }
    expect(norm).toBeCloseTo(0.25, 12);
    expect(cross).toBeCloseTo(0, 12);
    for (const mode of basis)
      for (const x of [0, 1]) expect(shape(mode, x, 0.37)).toBeCloseTo(0, 12);
  });
  it("matches independent midpoint integration including resonant wavenumber poles", () => {
    const length = 0.83,
      cells = 4096;
    for (const m of [1, 2, 5])
      for (const k of [
        0,
        -15,
        15,
        (-m * Math.PI) / length,
        (m * Math.PI) / length,
      ]) {
        let re = 0,
          im = 0;
        for (let i = 0; i < cells; i++) {
          const x = (length * (i + 0.5)) / cells,
            p = (Math.sin((m * Math.PI * x) / length) * length) / cells;
          re += p * Math.cos(k * x);
          im -= p * Math.sin(k * x);
        }
        const value = axisIntegral(m, length, k);
        expect(value.re).toBeCloseTo(re, 6);
        expect(value.im).toBeCloseTo(im, 6);
      }
  });
  it("recovers uniform-pressure odd/even joint acceptance without spatial aliasing", () => {
    for (const [m, n] of [
      [1, 1],
      [3, 1],
      [2, 1],
      [1, 4],
    ]) {
      const s = {
        ...DEFAULT,
        field: "pwf" as const,
        incidence: 0,
        modeX: m,
        modeY: n,
      };
      const expected = m % 2 && n % 2 ? 16 / (m * m * n * n * Math.PI ** 4) : 0;
      expect(solve(s).acceptance).toBeCloseTo(expected, 12);
    }
  });
  it("matches legacy joint acceptance under a refined independent spatial grid", () => {
    for (const field of FIELDS) {
      const s = { ...DEFAULT, field, frequency: 150, modeX: 3, modeY: 1 };
      const coarse = jointAcceptance(legacy[field], {
        ...s,
        velocity: s.velocity * s.convectionRatio,
        gridX: 41,
        gridY: 31,
      }).jointAcceptance;
      const fine = jointAcceptance(legacy[field], {
        ...s,
        velocity: s.velocity * s.convectionRatio,
        gridX: 81,
        gridY: 61,
      }).jointAcceptance;
      const value = solve(s).acceptance;
      relative(value, fine, 0.004);
      expect(Math.abs(fine - value)).toBeLessThan(Math.abs(coarse - value));
    }
  }, 20000);
  it("builds a Hermitian positive semidefinite full modal-force CSD", () => {
    for (const field of FIELDS) {
      const matrix = modalForceMatrix({ ...DEFAULT, field }, field, 6),
        count = matrix.modes.length;
      for (let i = 0; i < count; i++)
        for (let j = 0; j < count; j++) {
          expect(matrix.re[i * count + j]).toBeCloseTo(
            matrix.re[j * count + i],
            12,
          );
          expect(matrix.im[i * count + j]).toBeCloseTo(
            -matrix.im[j * count + i],
            12,
          );
        }
      for (let trial = 0; trial < 4; trial++) {
        let power = 0;
        for (let i = 0; i < count; i++)
          for (let j = 0; j < count; j++) {
            const ar = Math.sin(i + trial),
              ai = Math.cos(i * 2 + trial);
            const br = Math.sin(j + trial),
              bi = Math.cos(j * 2 + trial);
            power +=
              matrix.re[i * count + j] * (ar * br + ai * bi) -
              matrix.im[i * count + j] * (ar * bi - ai * br);
          }
        expect(power).toBeGreaterThanOrEqual(-1e-12);
      }
    }
  });
  it("retains coherent cross-modal interference at B instead of summing auto PSDs", () => {
    const s = {
      ...DEFAULT,
      field: "pwf" as const,
      frequency: 48,
      incidence: 43,
      azimuth: 24,
    };
    let re = 0,
      im = 0,
      diagonalOnly = 0;
    const k = (2 * Math.PI * s.frequency) / s.soundSpeed;
    for (const mode of modes(s)) {
      const x = axisIntegral(
        mode.m,
        s.length,
        k *
          Math.sin((s.incidence * Math.PI) / 180) *
          Math.cos((s.azimuth * Math.PI) / 180),
      );
      const y = axisIntegral(
        mode.n,
        s.width,
        k *
          Math.sin((s.incidence * Math.PI) / 180) *
          Math.sin((s.azimuth * Math.PI) / 180),
      );
      const pr = x.re * y.re - x.im * y.im,
        pi = x.im * y.re + x.re * y.im;
      const h = receptance(s, mode),
        p = shape(mode, s.bx, s.by);
      const ar = p * (h.re * pr - h.im * pi),
        ai = p * (h.re * pi + h.im * pr);
      re += ar;
      im += ai;
      diagonalOnly += ar * ar + ai * ai;
    }
    const expected = s.pressurePsd * (re * re + im * im),
      actual = solve(s).displacementPsd;
    relative(actual, expected, 1e-12);
    expect(
      Math.abs(actual / (s.pressurePsd * diagonalOnly) - 1),
    ).toBeGreaterThan(0.1);
    expect(solve({ ...s, modeX: 1, modeY: 2 }).displacementPsd).toBe(actual);
  });
  it("has resonant phase and inverse damping scaling of modal receptance", () => {
    const mode = modes(DEFAULT)[0],
      s = { ...DEFAULT, frequency: mode.frequency };
    const a = receptance(s, mode),
      b = receptance({ ...s, damping: 2 * s.damping }, mode);
    expect(a.re).toBe(0);
    expect(a.im).toBeLessThan(0);
    relative(
      magnitude(a),
      1 / (2 * s.damping * mode.mass * (2 * Math.PI * s.frequency) ** 2),
    );
    relative(magnitude(a) / magnitude(b), 2);
  });
  it("preserves PSD units, input scaling, RMS bandwidth scaling, and a silent zero input", () => {
    const a = solve(DEFAULT),
      b = solve({ ...DEFAULT, pressurePsd: 4, bandwidth: 9 });
    relative(
      a.accelerationPsd,
      a.displacementPsd * (2 * Math.PI * DEFAULT.frequency) ** 4,
    );
    relative(a.modalForcePsd, a.acceptance * DEFAULT.pressurePsd * a.area ** 2);
    relative(b.accelerationPsd, 4 * a.accelerationPsd);
    relative(b.accelerationRms, 6 * a.accelerationRms);
    const silent = solve({ ...DEFAULT, pressurePsd: 0 });
    expect(silent.accelerationPsd).toBe(0);
    expect(silent.displacementPsd).toBe(0);
    relative(silent.acceptance, a.acceptance, 1e-9);
    expect(
      sampleRealization(
        createRealization({ ...DEFAULT, pressurePsd: 0 }),
        0.2,
        0.3,
        1,
      ),
    ).toEqual({ pressure: 0, displacement: 0 });
  });
});

describe("numerical limits, convergence and phase-linked animation", () => {
  it("returns exactly zero structural response on all simply supported edges", () => {
    for (const field of FIELDS) {
      for (const [bx, by] of [
        [0, 0.4],
        [1, 0.4],
        [0.3, 0],
        [0.3, 1],
      ]) {
        const state = { ...DEFAULT, field, bx, by };
        expect(solve(state).accelerationPsd).toBe(0);
        expect(
          sampleRealization(createRealization(state), bx, by, 0.7).displacement,
        ).toBe(0);
      }
    }
  });

  it("resolves quadrature independently of modal convergence at control-box extremes", () => {
    const cases: Settings[] = [
      DEFAULT,
      {
        ...DEFAULT,
        heading: 37,
        length: 0.4,
        width: 0.3,
        thickness: 0.006,
        velocity: 40,
        convectionRatio: 0.3,
        alphaX: 0.06,
        alphaY: 0.2,
        frequency: 900,
      },
      {
        ...DEFAULT,
        heading: -65,
        length: 1.6,
        width: 1,
        thickness: 0.001,
        velocity: 350,
        convectionRatio: 0.95,
        alphaX: 0.5,
        alphaY: 1.5,
        frequency: 30,
      },
    ];
    for (const s of cases) {
      const a = integratedResponse(s, "tbl", 8),
        b = integratedResponse(s, "tbl", 12);
      relative(a.displacement, b.displacement, 0.01);
      relative(a.selectedForce, b.selectedForce, 0.01);
    }
    const result = solve(DEFAULT);
    expect(result.quadratureConverged).toBe(true);
    expect(result.modalConverged).toBe(true);
    expect(result.modalConvergenceError).toBeLessThan(0.01);
  });
  it("bounds the frequency domain by the first omitted modes and reports extrapolation", () => {
    const range = frequencyRange(DEFAULT),
      full = modes(DEFAULT, MODE_ORDER + 1);
    const firstOmitted = Math.min(
      ...full
        .filter((m) => m.m === MODE_ORDER + 1 || m.n === MODE_ORDER + 1)
        .map((m) => m.frequency),
    );
    relative(range.firstOmittedFrequency, firstOmitted);
    relative(range.recommendedMaxFrequency, 0.65 * firstOmitted);
    const outside = solve({ ...DEFAULT, frequency: firstOmitted });
    expect(outside.notes.some((note) => note.includes("omitted modes"))).toBe(
      true,
    );
  });
  it("samples exact structural peaks and damping widths in a bounded spectrum", () => {
    const values = spectrum(DEFAULT),
      range = frequencyRange(DEFAULT);
    expect(values[0].frequency).toBe(range.minFrequency);
    relative(values.at(-1)!.frequency, range.recommendedMaxFrequency);
    for (const mode of modes(DEFAULT).filter(
      (m) =>
        m.frequency >= range.minFrequency &&
        m.frequency <= range.recommendedMaxFrequency,
    ))
      expect(values.some((point) => point.frequency === mode.frequency)).toBe(
        true,
      );
    for (const value of values)
      for (const field of FIELDS) {
        expect(value[field]).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(value[field])).toBe(true);
      }
  });
  it("keeps the cheaper rotated spectrum quadrature close to refined cursor results", () => {
    for (const heading of [15, 60, 90])
      for (const frequency of [5, 67, 199]) {
        const s = { ...DEFAULT, heading, frequency };
        relative(
          integratedResponse(s, "tbl", 3).displacement,
          integratedResponse(s, "tbl", 8).displacement,
          0.002,
        );
      }
  });
  it("repeats seeded fields, changes them with seed, and keeps pressure and motion in phase", () => {
    const s = { ...DEFAULT, field: "pwf" as const },
      realization = createRealization(s);
    expect(createRealization(s)).toEqual(realization);
    expect(createRealization(s, 20)).not.toEqual(realization);
    const a = sampleRealization(realization, s.bx, s.by, 0),
      b = sampleRealization(realization, s.bx, s.by, Math.PI / 2);
    relative(
      (a.pressure ** 2 + b.pressure ** 2) / 2,
      s.pressurePsd * s.bandwidth,
    );
    relative(
      (a.displacement ** 2 + b.displacement ** 2) / 2,
      solve(s).displacementPsd * s.bandwidth,
    );
    const phase = 0.71,
      value = sampleRealization(realization, s.bx, s.by, phase);
    expect(value.pressure).toBeCloseTo(
      a.pressure * Math.cos(phase) + b.pressure * Math.sin(phase),
      12,
    );
    expect(value.displacement).toBeCloseTo(
      a.displacement * Math.cos(phase) + b.displacement * Math.sin(phase),
      12,
    );
  });
  it("reproduces ensemble Corcos pressure CSD and panel response over independent seeds", () => {
    const s = DEFAULT,
      count = 1200;
    let pp = 0,
      cr = 0,
      ci = 0,
      ww = 0;
    for (let seed = 1; seed <= count; seed++) {
      const r = createRealization(s, seed);
      const a0 = sampleRealization(r, s.ax, s.ay, 0),
        a1 = sampleRealization(r, s.ax, s.ay, Math.PI / 2);
      const b0 = sampleRealization(r, s.bx, s.by, 0),
        b1 = sampleRealization(r, s.bx, s.by, Math.PI / 2);
      pp += (a0.pressure ** 2 + a1.pressure ** 2) / (2 * count);
      cr +=
        (a0.pressure * b0.pressure + a1.pressure * b1.pressure) / (2 * count);
      ci +=
        (a1.pressure * b0.pressure - a0.pressure * b1.pressure) / (2 * count);
      ww += (b0.displacement ** 2 + b1.displacement ** 2) / (2 * count);
    }
    const expected = solve(s),
      scale = s.pressurePsd * s.bandwidth;
    relative(pp, scale, 0.09);
    expect(Math.abs(cr / scale - expected.coherence.re)).toBeLessThan(0.09);
    expect(Math.abs(ci / scale - expected.coherence.im)).toBeLessThan(0.09);
    relative(ww, expected.displacementPsd * s.bandwidth, 0.1);
  });
});
