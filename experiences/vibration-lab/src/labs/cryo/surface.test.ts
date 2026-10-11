import { describe, expect, it } from "vitest";
import {
  LEGACY_DEFAULT as DEFAULT,
  FLUIDS,
  TANK,
  cylinderAddedMassBenchmark,
  solve,
  surfaceBoundaryComparison,
  symmetricEigen,
} from "./physics";

describe("independent cylinder added inertia", () => {
  it("recovers total liquid mass for uniform lateral translation under a rigid lid", () => {
    for (const depth of [2, 12]) {
      for (const density of [FLUIDS.lox.density, FLUIDS.lh2.density]) {
        const rigid = cylinderAddedMassBenchmark(1, depth, density)[0];
        const totalLiquidMass = density * Math.PI * TANK.radius ** 2 * depth;
        expect(Math.abs(rigid.numerical / totalLiquidMass - 1)).toBeLessThan(
          1e-10,
        );
      }
    }
  });

  it("agrees with the independent exact harmonic potentials at shallow/deep fill and high angular order", () => {
    for (const n of [1, 2, 4, 12, 20]) {
      for (const depth of [2, 12]) {
        for (const result of cylinderAddedMassBenchmark(n, depth)) {
          expect(result.numerical).toBeGreaterThan(0);
          expect(result.relativeError).toBeLessThan(1e-6);
          // Galerkin energy approaches the exact energy from below.
          expect(result.numerical).toBeLessThanOrEqual(
            result.analytic * (1 + 1e-10),
          );
        }
      }
    }
  });

  it("checks the analytical pressure-release normalization against independent numerical anchors", () => {
    const shallow = cylinderAddedMassBenchmark(1, 2)[1],
      deep = cylinderAddedMassBenchmark(1, 12)[1];
    expect(shallow.analytic).toBeCloseTo(21235.620336204425, 6);
    expect(deep.analytic).toBeCloseTo(352732.55525406037, 6);
    const refined = cylinderAddedMassBenchmark(
      1,
      2,
      FLUIDS.lox.density,
      5,
      10,
    )[1];
    expect(refined.relativeError).toBeLessThan(shallow.relativeError);
    expect(refined.relativeError).toBeLessThan(1e-9);
    const hydrogen = cylinderAddedMassBenchmark(1, 2, FLUIDS.lh2.density)[1];
    expect(hydrogen.numerical / shallow.numerical).toBeCloseTo(
      FLUIDS.lh2.density / FLUIDS.lox.density,
      12,
    );
  });
});

describe("free-surface boundary comparison", () => {
  it("re-solves all angular orders with positive inertia and small eigen residuals", () => {
    for (let n = 0; n <= 20; n++) {
      const rows = surfaceBoundaryComparison(DEFAULT, n);
      for (const row of rows) {
        expect(row.available, row.error).toBe(true);
        expect(row.maxResidual).toBeLessThan(1e-8);
        expect(row.frequencies.every((f) => f > 0)).toBe(true);
        expect(row.addedMassRatios.every((mu) => mu >= 0)).toBe(true);
        expect(row.frequencies).toHaveLength(
          n === 0 && row.boundary === "rigid" ? 4 : 5,
        );
      }
    }
  });

  it("releases inertia rather than adding a pressure spring to a constrained surface", () => {
    for (const n of [1, 2, 4, 12, 20]) {
      const [, rigid, release] = surfaceBoundaryComparison(DEFAULT, n, false);
      const difference = rigid.addedMass.map((row, i) =>
        row.map((v, j) => v - release.addedMass[i][j]),
      );
      const eigenvalues = symmetricEigen(difference).values;
      const scale = Math.max(...eigenvalues.map(Math.abs));
      // The pressure-release space permits less kinetic energy for any common wall shape.
      expect(Math.min(...eigenvalues)).toBeGreaterThan(-1e-8 * scale);
      for (let i = 0; i < 5; i++)
        expect(release.frequencies[i]).toBeGreaterThanOrEqual(
          rigid.frequencies[i] * (1 - 1e-8),
        );
    }
    const zeroG = { ...DEFAULT, accelerationG: 0 },
      withG = surfaceBoundaryComparison(DEFAULT, 2, false),
      withoutG = surfaceBoundaryComparison(zeroG, 2, false);
    expect(withoutG).toEqual(withG); // Gravity restoring dynamics are absent from these mass comparisons.
  });

  it("preserves the existing reduced spectrum and identifies its higher-order constrained boundary", () => {
    const before = solve(DEFAULT),
      spectrum = before.cases.combined.modes.map((mode) => mode.eigenvalue);
    for (const n of [0, 1, 2, 4, 12]) {
      const rows = surfaceBoundaryComparison(DEFAULT, n),
        old = before.cases.combined.modes.filter(
          (mode) => mode.n === n && mode.orientation === "cos",
        );
      for (let i = 0; i < old.length; i++)
        expect(rows[0].frequencies[i]).toBeCloseTo(old[i].frequency, 7);
      if (n >= 4) expect(rows[0].frequencies).toEqual(rows[1].frequencies);
    }
    expect(
      solve(DEFAULT).cases.combined.modes.map((mode) => mode.eigenvalue),
    ).toEqual(spectrum);
  });

  it("collapses boundary distinctions when the tank is empty or closed full", () => {
    for (const fill of [0, 1]) {
      for (const n of [0, 2, 12, 20]) {
        const rows = surfaceBoundaryComparison({ ...DEFAULT, fill }, n);
        expect(rows.every((row) => row.available)).toBe(true);
        expect(rows[1].frequencies).toEqual(rows[0].frequencies);
        expect(rows[2].frequencies).toEqual(rows[0].frequencies);
        expect(rows[0].frequencies).toHaveLength(fill === 1 && n === 0 ? 4 : 5);
      }
    }
  });

  it("keeps density and pressure effects separate in the diagnostic", () => {
    const base = surfaceBoundaryComparison(DEFAULT, 2, false),
      hydrogen = surfaceBoundaryComparison(
        { ...DEFAULT, fluid: "lh2" },
        2,
        false,
      ),
      pressure = surfaceBoundaryComparison(DEFAULT, 2, true),
      differentUllage = surfaceBoundaryComparison(
        { ...DEFAULT, ullagePsi: 60 },
        2,
        false,
      );
    expect(differentUllage).toEqual(base);
    for (let b = 0; b < 3; b++) {
      expect(hydrogen[b].frequencies[0]).toBeGreaterThan(
        base[b].frequencies[0],
      );
      expect(pressure[b].frequencies[0]).toBeGreaterThan(
        base[b].frequencies[0],
      );
      expect(pressure[b].addedMass).toEqual(base[b].addedMass);
    }
  });
});
