import { describe, it, expect } from "vitest";
import {
  DEFAULT,
  LEGACY_DEFAULT,
  TANK,
  radiusAt,
  besselJ,
  cylinderSloshFrequency,
  cylinderSloshSpectrum,
  findMode,
  prepareTrackedModes,
  solve,
  surfaceShapes,
  surfaceSpectrum,
  surfaceConvergenceSteps,
  surfaceBoundaryComparison,
  symmetricEigen,
  freeSurfaceDisplacement,
  fluidDisplacement,
  fourierCoverage,
  fourierBasisDiagnostics,
} from "./physics";
import { SLOSH_ROOTS } from "./sloshRoots";
describe("expanded angular and radial surface basis", () => {
  it("preserves legacy IDs and adds every represented shell family with independent radial roots", () => {
    expect(surfaceShapes(LEGACY_DEFAULT).map((s) => s.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(surfaceShapes(DEFAULT)).toHaveLength(32);
    for (let n = 0; n <= 12; n++)
      expect(
        surfaceShapes(DEFAULT, n, "cos").map((s) => s.radialOrder),
      ).toEqual([1, 2]);
    for (let n = 0; n <= 20; n++)
      for (let p = 0; p < 4; p++) {
        const x = SLOSH_ROOTS[n][p],
          d = n ? (besselJ(n - 1, x) - besselJ(n + 1, x)) / 2 : -besselJ(1, x);
        expect(x).toBeGreaterThan(p ? SLOSH_ROOTS[n][p - 1] : 0);
        expect(Math.abs(d)).toBeLessThan(2e-12);
      }
  });
  it("benchmarks four rigid-cylinder gravity modes independently at shallow/deep fill and high angular order", () => {
    for (const n of [0, 1, 4, 12])
      for (const h of [2, 12]) {
        const numeric = cylinderSloshSpectrum(n, h, 2);
        numeric.forEach((f, p) => {
          const exact = cylinderSloshFrequency(n, h, 2, TANK.radius, p + 1);
          expect(f).toBeGreaterThanOrEqual(exact * (1 - 1e-7));
          expect(Math.abs(f / exact - 1)).toBeLessThan(0.025);
        });
      }
  }, 30000);
  it("solves positive coupled energy matrices for each allowed radial count across dome and barrel fills", () => {
    for (const radial of [1, 2, 3, 4])
      for (const fill of [0.01, 0.5, 0.99]) {
        const s = solve({ ...DEFAULT, fill, surfaceRadialOrder: radial });
        expect(s.retainedSlosh).toBe(16 * radial);
        expect(
          s.cases.coupled.modes.filter((m) => m.kind === "slosh"),
        ).toHaveLength(16 * radial);
        expect(
          s.cases.coupled.modes.every(
            (m) => Number.isFinite(m.frequency) && !m.unstable,
          ),
        ).toBe(true);
        expect(s.cases.coupled.maxResidual).toBeLessThan(1e-5);
      }
  }, 30000);
  it("condenses the full multi-coordinate mass and recovers its nonzero zero-gravity coupled spectrum", () => {
    const s = solve({ ...DEFAULT, accelerationG: 0 });
    for (const n of [0, 2, 4, 12]) {
      const coupled = s.cases.coupled.modes
          .filter((m) => m.n === n && m.orientation === "cos")
          .map((m) => m.frequency)
          .filter((f) => f > 1e-4)
          .sort((a, b) => a - b),
        reduced = s.cases.combined.modes
          .filter((m) => m.n === n && m.orientation === "cos")
          .map((m) => m.frequency)
          .sort((a, b) => a - b);
      expect(coupled).toHaveLength(5);
      coupled.forEach((f, i) =>
        expect(Math.abs(f / reduced[i] - 1)).toBeLessThan(2e-7),
      );
    }
  });
  it("retains sine/cosine degeneracy and actual multi-shape motion in the selected solved vector", () => {
    const s = solve(DEFAULT),
      pair = s.slosh.filter((m) => m.n === 2 && m.radialOrder === 2);
    expect(pair).toHaveLength(2);
    expect(pair[0].frequency).toBeCloseTo(pair[1].frequency, 10);
    const bending = findMode(s, "coupled", { kind: "shell", n: 1 })!;
    const center = fluidDisplacement(s, bending, 0, 8, Math.PI / 2),
      near = fluidDisplacement(s, bending, 1e-6, 8, Math.PI / 2);
    expect(center.tangential).toBeCloseTo(near.tangential, 7);
    for (const n of [4, 12]) {
      const m = findMode(s, "coupled", { kind: "shell", n })!;
      expect(m.referenceId).toBe(`shell-${n}-1-cos`);
      expect(m.vector.every(Number.isFinite)).toBe(true);
      expect(
        Math.abs(freeSurfaceDisplacement(s, m, s.surfaceRadius, 0)),
      ).toBeGreaterThan(1e-5);
      expect(
        Object.values(fluidDisplacement(s, m, 2, 8, 0)).every(Number.isFinite),
      ).toBe(true);
    }
  }, 30000);
  it("prepares all comparison identities incrementally with the same final continuation", () => {
    const s = solve({ ...DEFAULT, fill: 0.025 }),
      progress = [...prepareTrackedModes(s, 4)];
    expect(progress.at(-1)).toBe(1);
    expect(progress.every((v, i) => !i || v >= progress[i - 1])).toBe(true);
    const branch = findMode(s, "coupled", { kind: "shell", n: 4 })!;
    expect(branch.referenceId).toBe("shell-4-1-cos");
    expect(branch.residual).toBeLessThan(1e-5);
    for (const id of ["mass", "pressure", "combined", "coupled"] as const)
      expect(
        findMode(s, id, { kind: "shell", n: 4 })?.frequency,
      ).toBeGreaterThan(0);
  });
  it("releases rather than double-counts fluid inertia when adding radial surface shapes", () => {
    const one = surfaceBoundaryComparison(
        { ...DEFAULT, surfaceRadialOrder: 1 },
        4,
        false,
        8,
        20,
      )[0],
      four = surfaceBoundaryComparison(
        { ...DEFAULT, surfaceRadialOrder: 4 },
        4,
        false,
        8,
        20,
      )[0],
      values = symmetricEigen(
        one.addedMass.map((r, i) => r.map((v, j) => v - four.addedMass[i][j])),
      ).values;
    expect(one.available && four.available).toBe(true);
    expect(Math.min(...values)).toBeGreaterThan(-1e-5);
  });
  it("preserves the displayed multi-shape liquid kinetic energy under the expanded potential basis", () => {
    const s = solve(DEFAULT),
      shape = surfaceShapes(DEFAULT, 4, "cos").find(
        (m) => m.radialOrder === 2,
      )!,
      mode = findMode(s, "coupled", { kind: "slosh", sloshId: shape.id })!;
    let energy = 0;
    const edges = [0, TANK.domeDepth, s.liquidHeight],
      nz = 120,
      nr = 160;
    for (let segment = 1; segment < edges.length; segment++) {
      const dz = (edges[segment] - edges[segment - 1]) / nz;
      for (let i = 0; i < nz; i++) {
        const z = edges[segment - 1] + (i + 0.5) * dz,
          dr = radiusAt(z) / nr;
        for (let j = 0; j < nr; j++)
          for (const theta of [0, Math.PI / 8]) {
            const r = (j + 0.5) * dr,
              u = fluidDisplacement(s, mode, r, z, theta);
            // Two phases integrate cos²(nθ) and sin²(nθ) exactly; volume integration is independent midpoint quadrature.
            energy +=
              s.density *
              (u.radial ** 2 + u.axial ** 2 + u.tangential ** 2) *
              r *
              dr *
              dz *
              Math.PI;
          }
      }
    }
    const target = mode.sloshFraction / mode.normalization ** 2;
    expect(Math.abs(energy / target - 1)).toBeLessThan(0.01);
  }, 30000);
  it("applies the chosen basis consistently to scene, boundary and Fourier solves", () => {
    const s = solve(DEFAULT),
      fourier = fourierCoverage(DEFAULT, { caseId: "combined" });
    for (const n of [2, 4, 12]) {
      const frequencies = s.cases.combined.modes
          .filter((m) => m.n === n && m.orientation === "cos")
          .map((m) => m.frequency)
          .sort((a, b) => a - b),
        boundary = surfaceBoundaryComparison(DEFAULT, n)[0];
      expect(fourier.families[n].freeSurfaceModel).toBe(
        "condensed-retained-shape",
      );
      frequencies.forEach((f, i) => {
        expect(boundary.frequencies[i]).toBeCloseTo(f, 6);
        expect(fourier.families[n].modes[i].frequency).toBeCloseTo(f, 6);
      });
    }
    const refinement = fourierBasisDiagnostics(DEFAULT, 4, "combined");
    expect([
      refinement.potentialRadialOrder,
      refinement.potentialAxialOrder,
      refinement.refinedPotentialRadialOrder,
      refinement.refinedPotentialAxialOrder,
    ]).toEqual([6, 12, 7, 14]);
    expect(refinement.maxFrequencyRelativeDifference).toBeGreaterThan(1e-9);
  });
});
describe("surface convergence across fill", () => {
  it("checks coverage, returns reproducible matches, and leaves unresolved truncations open", () => {
    const options = { maxOrder: 2, fills: [0, 0.01, 0.5, 0.85, 0.99, 1] },
      rows = [...surfaceConvergenceSteps(DEFAULT, options)];
    expect(rows).toHaveLength(18);
    expect(rows.every((r) => !r.error)).toBe(true);
    expect(
      rows.filter((r) => r.noSurface).every((r) => r.recommended === 0),
    ).toBe(true);
    expect(rows.some((r) => !r.noSurface && r.recommended !== null)).toBe(true);
    const strict = [
      ...surfaceConvergenceSteps(DEFAULT, {
        maxOrder: 2,
        fills: [0.5],
        tolerance: 1e-9,
      }),
    ];
    expect(strict.every((r) => r.recommended === null && !r.error)).toBe(true);
    for (const r of rows.filter(
      (r) => r.recommended !== null && !r.noSurface,
    )) {
      const m = r.matches.find((m) => m.radial === r.recommended)!;
      expect(m.frequencyError).toBeLessThanOrEqual(0.01);
      expect(m.energyError).toBeLessThanOrEqual(0.05);
      expect(m.minimumMAC).toBeGreaterThanOrEqual(0.9);
      expect(r.potentialError).toBeLessThanOrEqual(0.01);
    }
    expect([...surfaceConvergenceSteps(DEFAULT, options)]).toEqual(rows);
    const tighter = [
      ...surfaceConvergenceSteps(DEFAULT, { ...options, tolerance: 0.005 }),
    ];
    tighter.forEach((r, i) => {
      if (r.recommended !== null && !r.noSurface) {
        expect(rows[i].recommended).not.toBeNull();
        expect(r.recommended).toBeGreaterThanOrEqual(rows[i].recommended!);
      }
    });
    const highOrder = [
      ...surfaceConvergenceSteps(DEFAULT, { maxOrder: 12, fills: [0.5] }),
    ].find((r) => r.n === 12)!;
    expect(highOrder.recommended).toBe(2);
    expect(highOrder.matches[1].minimumMAC).toBeGreaterThan(0.99);
    expect(highOrder.matches[1].frequencyError).toBeLessThan(0.01);
  }, 30000);
  it("resolves shallow potential directions explicitly and keeps empty/full topology consistent", () => {
    const shallow = surfaceSpectrum({ ...DEFAULT, fill: 0.01 }, 12, 4);
    expect(shallow.potentialRank).toBeGreaterThan(shallow.ns + shallow.nf);
    expect(shallow.potentialRank).toBeLessThanOrEqual(shallow.potentialTrials);
    expect(shallow.residuals.every((r) => r < 1e-5)).toBe(true);
    for (const fill of [0, 1]) {
      const s = solve({ ...DEFAULT, fill, surfaceRadialOrder: 4 });
      expect(s.retainedSlosh).toBe(0);
      expect(
        s.cases.coupled.modes.filter((m) => m.kind === "slosh"),
      ).toHaveLength(0);
    }
  });
});
