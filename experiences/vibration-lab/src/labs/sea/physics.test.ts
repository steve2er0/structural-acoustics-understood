import { describe, expect, it } from "vitest";
import {
  BANDS,
  DEFAULT,
  SUBSYSTEMS,
  JUNCTIONS,
  balance,
  bandWidth,
  buildLossMatrix,
  createModel,
  energyPerMode,
  integrateTransientEnergy,
  modalDensity,
  ringFrequency,
  presetSettings,
  solveLinear,
  sum,
  transientEnergyDerivative,
  zeroEnergy,
} from "./physics";
import { CAVITY, ENVELOPE, FAIRING_AREA, fairingProfile } from "./falcon";
const close = (a: number, b: number, tol = 1e-10) =>
  expect(Math.abs(a - b)).toBeLessThan(tol);
describe("Falcon 9 geometry snapshot and seven-state SEA", () => {
  it("matches the autoSEA envelope, six surface areas and branched topology", () => {
    expect(ENVELOPE).toEqual({
      height: 70,
      diameter: 3.7,
      fairingHeight: 13.1,
      fairingDiameter: 5.2,
    });
    close(
      sum(SUBSYSTEMS.slice(0, 6).map((p) => p.area)),
      875.843523040011,
      1e-8,
    );
    expect(FAIRING_AREA).toBeGreaterThan(170);
    expect(fairingProfile().at(-1)).toEqual([70, 0]);
    expect(JUNCTIONS.filter((j) => j.kind === "structural")).toHaveLength(6);
    expect(
      JUNCTIONS.filter((j) => j.kind === "acoustic").map((j) => [j.a, j.b]),
    ).toEqual([
      [4, 6],
      [5, 6],
    ]);
    expect(JUNCTIONS.map((j) => [j.a, j.b])).toContainEqual([3, 5]);
    expect(JUNCTIONS.map((j) => [j.a, j.b])).toContainEqual([4, 5]);
  });
  it("matches the autoSEA shell ring anchor and high-frequency plate asymptote", () => {
    close(ringFrequency(1), 474.2004784233287, 1e-9);
    const area = 2 * Math.PI * 1.85 * 39.6,
      h = 0.0028,
      D = (73.1e9 * h ** 3) / (12 * (1 - 0.33 ** 2));
    close(modalDensity(1, 1, 4000), (area / 2) * Math.sqrt((2700 * h) / D));
    expect(modalDensity(1, 1, 63)).toBeLessThan(modalDensity(1, 1, 500));
  });
  it("uses the acoustic dimensional asymptote and an RT60 energy decay rate", () => {
    close(modalDensity(6, 1, 500), (4 * Math.PI * 190 * 500 ** 2) / 343 ** 3);
    close(modalDensity(6, 1, 1000), 4 * modalDensity(6, 1, 500));
    const m = createModel(DEFAULT);
    close(m.omega * m.loss[6], Math.log(1e6) / CAVITY.rt60);
  });
  it("solves a nontrivial independent linear system", () => {
    const x = solveLinear(
      [
        [3, -1, 0],
        [-1, 3, -1],
        [0, -1, 2],
      ],
      [1, 0, 0],
    );
    [5 / 13, 2 / 13, 1 / 13].forEach((v, i) => close(v, x[i]));
  });
  it("has zero energy for zero input and scales linearly", () => {
    expect(createModel({ ...DEFAULT, power: 0 }).steady).toEqual(zeroEnergy());
    const a = createModel(DEFAULT),
      b = createModel({ ...DEFAULT, power: 3 });
    a.steady.forEach((e, i) => close(3 * e, b.steady[i]));
  });
  it.each([0, 1, 2, 3, 4, 5, 6])(
    "disconnects source %s to its exact single-state solution",
    (source) => {
      const m = createModel({
        ...DEFAULT,
        source,
        coupling: JUNCTIONS.map(() => 0),
      });
      m.steady.forEach((e, i) =>
        close(e, i === source ? 1 / (m.omega * m.loss[i]) : 0),
      );
      expect(balance(m, m.steady).flows.every((p) => p === 0)).toBe(true);
    },
  );
  it.each(BANDS)(
    "enforces reciprocity and subsystem/global conservation at %s Hz",
    (frequency) => {
      const m = createModel({ ...DEFAULT, frequency }),
        b = balance(m, m.steady);
      m.edges.forEach((e) => close(m.n[e.a] * e.forward, m.n[e.b] * e.reverse));
      close(b.dissipated, 1);
      b.rate.forEach((r) => close(r, 0));
      close(b.residual, 0);
      const arbitrary = [0.003, 0.02, 0.01, 0.004, 0.006, 0.002, 0.005],
        t = balance(m, arbitrary);
      close(sum(t.netOut), 0, 1e-9);
      close(
        sum(transientEnergyDerivative(m, arbitrary)),
        1 - t.dissipated,
        1e-9,
      );
      balance(
        m,
        m.n.map((n) => n * 0.001),
      ).flows.forEach((p) => close(p, 0, 1e-9));
    },
  );
  it("conserves reciprocal exchange with a branching node and no internal losses", () => {
    const matrix = buildLossMatrix(
      [0, 0, 0],
      [
        { a: 0, b: 1, forward: 0.1, reverse: 0.2 },
        { a: 0, b: 2, forward: 0.3, reverse: 0.1 },
      ],
    );
    for (let j = 0; j < 3; j++) close(sum(matrix.map((row) => row[j])), 0);
  });
  it("can reverse transfers when the cavity is excited", () => {
    const m = createModel({ ...DEFAULT, source: 6 }),
      b = balance(m, m.steady);
    expect(b.flows[6]).toBeLessThan(0);
    expect(b.flows[7]).toBeLessThan(0);
    expect(m.steady.slice(0, 6).every((e) => e > 0)).toBe(true);
  });
  it("damping the interstage reduces onward energy and shorter RT reduces cavity energy", () => {
    const a = createModel(DEFAULT),
      b = createModel(presetSettings("Damp interstage"));
    expect(b.steady[2]).toBeLessThan(a.steady[2]);
    expect(b.steady[5]).toBeLessThan(a.steady[5]);
    const c = createModel({ ...DEFAULT, source: 6 }),
      d = createModel({ ...DEFAULT, source: 6, cavityRT: 0.3 });
    expect(d.steady[6]).toBeLessThan(c.steady[6]);
  });
  it("integrates toward the independently solved steady state", () => {
    const m = createModel(DEFAULT),
      e = integrateTransientEnergy(m, zeroEnergy(), 5);
    e.forEach((v, i) => close(v, m.steady[i], 1e-9));
  });
  it("recovers analytic uncoupled step and decay solutions", () => {
    const m = createModel({ ...DEFAULT, coupling: JUNCTIONS.map(() => 0) }),
      t = 0.013;
    const e = integrateTransientEnergy(m, zeroEnergy(), t);
    close(e[1], m.steady[1] * (1 - Math.exp(-m.omega * m.loss[1] * t)), 1e-7);
    const off = createModel({ ...m.settings, power: 0 });
    close(
      integrateTransientEnergy(off, e, t)[1],
      e[1] * Math.exp(-off.omega * off.loss[1] * t),
      1e-7,
    );
  });
  it("keeps energies finite and nonnegative at control extremes", () => {
    for (const frequency of [31.5, 4000]) {
      const m = createModel({
        ...DEFAULT,
        frequency,
        source: 6,
        cavityRT: 0.2,
        loss: DEFAULT.loss.map((_, i) => (i % 2 ? 0.001 : 0.08)),
        coupling: JUNCTIONS.map(() => 0.04),
        densityScale: SUBSYSTEMS.map((_, i) => (i % 2 ? 0.25 : 4)),
      });
      const e = integrateTransientEnergy(
        m,
        SUBSYSTEMS.map(() => 0.02),
        0.05,
      );
      [...e, ...m.steady].forEach((v) => {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      });
    }
  });
  it("uses modes/Hz and distinguishes modal density from modes in a band", () => {
    close(energyPerMode(0.02, 2, 100), 0.0001);
    close(bandWidth(2000), 2 * bandWidth(1000));
    close(createModel(DEFAULT).count[0], modalDensity(0) * bandWidth(1000));
  });
});
