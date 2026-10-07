import { describe, expect, it } from "vitest";
import {
  DEFAULT,
  FOURIER_CUTOFFS,
  FOURIER_MAX_ORDER,
  SHELL_MAX_ORDER,
  fourierBasisDiagnostics,
  fourierCoverage,
  fourierCoverageSteps,
  fourierFillSweep,
  fourierQuadratureDiagnostics,
  findMode,
  solve,
} from "./physics";

const close = (actual: number, expected: number, relative = 1e-8) =>
  expect(Math.abs(actual - expected)).toBeLessThan(
    relative * Math.max(1, Math.abs(expected)),
  );

describe("independent Fourier angular coverage", () => {
  it("preserves the scene's existing spectrum and seven surface coordinates", () => {
    const before = solve(DEFAULT),
      spectrum = Object.fromEntries(
        Object.entries(before.cases).map(([id, value]) => [
          id,
          value.modes.map((m) => [m.eigenvalue, m.residual]),
        ]),
      ),
      coverage = fourierCoverage(DEFAULT);
    for (let n = 0; n <= SHELL_MAX_ORDER; n++) {
      const sceneModes = before.cases.mass.modes.filter(
        (m) => m.n === n && m.orientation === "cos",
      );
      expect(coverage.families[n].modes.map((mode) => mode.frequency)).toEqual(
        sceneModes.map((mode) => mode.frequency),
      );
    }
    const after = solve(DEFAULT);
    expect(
      Object.fromEntries(
        Object.entries(after.cases).map(([id, value]) => [
          id,
          value.modes.map((m) => [m.eigenvalue, m.residual]),
        ]),
      ),
    ).toEqual(spectrum);
    expect(after.retainedSlosh).toBe(7);
    expect(after.cases.dry.modes).toHaveLength(80);
    expect(after.cases.coupled.modes).toHaveLength(87);
  });

  it("exposes new in-band families instead of treating identical common blocks as convergence", () => {
    const screens = FOURIER_CUTOFFS.map((cutoff) =>
      fourierCoverage(DEFAULT, { cutoff }),
    );
    expect(screens[0].families).toHaveLength(FOURIER_MAX_ORDER + 1);
    for (let i = 1; i < screens.length; i++) {
      expect(screens[i].families.map((family) => family.modes)).toEqual(
        screens[0].families.map((family) => family.modes),
      );
      expect(screens[i].retainedInBandModes).toBeGreaterThan(
        screens[i - 1].retainedInBandModes,
      );
      expect(
        screens[i].retainedInBandModes + screens[i].omittedInBandModes,
      ).toBe(screens[0].retainedInBandModes + screens[0].omittedInBandModes);
    }
    expect(screens[1].omittedFamilies).toEqual([
      13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    expect(screens[1].omittedInBandModes).toBeGreaterThan(0);
    expect(screens[3].omittedInBandModes).toBe(0);
    expect(
      fourierCoverage(DEFAULT, { minHz: 1000, maxHz: 2000 }).families.every(
        (family) => family.inBandCount === 0,
      ),
    ).toBe(true);
  });

  it("uses the full wet-vector inertia above 100 Hz and satisfies its Rayleigh identity", () => {
    const coverage = fourierCoverage(DEFAULT),
      highOrder = coverage.families[20];
    expect(coverage.families.every((family) => family.available)).toBe(true);
    expect(coverage.maxResidual).toBeLessThan(1e-8);
    expect(
      highOrder.modes.some(
        (mode) => mode.frequency > 100 && mode.addedMassRatio > 1,
      ),
    ).toBe(true);
    for (const family of coverage.families)
      for (const mode of family.modes) {
        expect(mode.frequency).toBeGreaterThan(0);
        expect(mode.addedMassRatio).toBeGreaterThan(0);
        expect(mode.residual).toBeLessThan(1e-8);
        close(
          mode.frequency,
          mode.structuralRayleighFrequency / Math.sqrt(1 + mode.addedMassRatio),
        );
      }
    const empty = fourierCoverage({ ...DEFAULT, fill: 0 });
    expect(
      empty.families.every((family) =>
        family.modes.every((mode) => mode.addedMassRatio === 0),
      ),
    ).toBe(true);
  });

  it("distinguishes density, pressure stiffness, and the diagnostic surface assumptions", () => {
    const mass = fourierCoverage(DEFAULT),
      lh2 = fourierCoverage({ ...DEFAULT, fluid: "lh2" }),
      combined = fourierCoverage(DEFAULT, { caseId: "combined" });
    for (const n of [4, 12, 20])
      mass.families[n].modes.forEach((mode, i) => {
        expect(lh2.families[n].modes[i].frequency).toBeGreaterThan(
          mode.frequency,
        );
        expect(combined.families[n].modes[i].frequency).toBeGreaterThan(
          mode.frequency,
        );
      });
    expect(
      mass.families
        .slice(0, 4)
        .every(
          (family) => family.freeSurfaceModel === "condensed-retained-shape",
        ),
    ).toBe(true);
    expect(
      mass.families
        .slice(4)
        .every((family) => family.freeSurfaceModel === "rigid-surface"),
    ).toBe(true);
    const full = fourierCoverage({ ...DEFAULT, fill: 1 });
    expect(
      full.families.every(
        (family) => family.freeSurfaceModel === "closed-liquid",
      ),
    ).toBe(true);
    expect(full.families[0].dryFrequencies).toHaveLength(5);
    expect(full.families[0].modes).toHaveLength(4);
  });

  it("reports a singular shallow-pool family as unavailable rather than zero mass", () => {
    const coverage = fourierCoverage({ ...DEFAULT, fill: 0.01 }),
      unavailable = coverage.families.filter((family) => !family.available);
    expect(unavailable.length).toBeGreaterThan(0);
    for (const family of unavailable) {
      expect(family.error).toMatch(/kinetic energy/);
      expect(family.modes).toEqual([]);
    }
  });
});

describe("pressure-only Fourier operator", () => {
  it("adds pressure stiffness without fluid inertia or free-surface constraints", () => {
    const pressure = fourierCoverage(DEFAULT, { caseId: "pressure" }),
      zeroPressure = fourierCoverage(
        { ...DEFAULT, ullagePsi: 0, accelerationG: 0 },
        { caseId: "pressure" },
      );
    expect(pressure.caseId).toBe("pressure");
    for (const family of pressure.families) {
      expect(family.available).toBe(true);
      expect(family.freeSurfaceModel).toBe("not-applied");
      expect(family.modes).toHaveLength(5);
      family.modes.forEach((mode, i) => {
        expect(mode.addedMassRatio).toBe(0);
        expect(mode.frequency).toBeGreaterThan(family.dryFrequencies[i]);
        expect(mode.residual).toBeLessThan(1e-8);
        close(
          zeroPressure.families[family.n].modes[i].frequency,
          family.dryFrequencies[i],
        );
      });
    }
    // This pool has an unavailable high-n mass block; pressure has no reason to
    // factor that liquid operator and must remain valid at every angular order.
    const shallow = fourierCoverage(
        { ...DEFAULT, fill: 0.01 },
        { caseId: "pressure" },
      ),
      full = fourierCoverage({ ...DEFAULT, fill: 1 }, { caseId: "pressure" });
    expect(shallow.families.every((family) => family.available)).toBe(true);
    expect(full.families[0].modes).toHaveLength(5);
    expect(
      full.families.every((family) =>
        family.modes.every((mode) => mode.addedMassRatio === 0),
      ),
    ).toBe(true);
  });

  it("uses density only through the hydrostatic prestress field", () => {
    const lox = fourierCoverage(DEFAULT, { caseId: "pressure" }),
      lh2 = fourierCoverage(
        { ...DEFAULT, fluid: "lh2" },
        { caseId: "pressure" },
      ),
      noHeadLox = fourierCoverage(
        { ...DEFAULT, accelerationG: 0 },
        { caseId: "pressure" },
      ),
      noHeadLh2 = fourierCoverage(
        { ...DEFAULT, fluid: "lh2", accelerationG: 0 },
        { caseId: "pressure" },
      );
    for (const n of [0, 2, 12, 20])
      lox.families[n].modes.forEach((mode, i) => {
        expect(mode.frequency).toBeGreaterThan(
          lh2.families[n].modes[i].frequency,
        );
        close(
          noHeadLox.families[n].modes[i].frequency,
          noHeadLh2.families[n].modes[i].frequency,
        );
      });
  });
});

describe("one tracked meridional branch", () => {
  for (const caseId of ["mass", "pressure", "combined"] as const)
    it(`keeps ${caseId} coverage, fill markers and main inspection on the same m1 identity`, () => {
      const coverage = fourierCoverage(DEFAULT, { caseId, trackedBranch: 1 }),
        scene = solve(DEFAULT);
      expect(
        coverage.families.every(
          (family) => family.available && family.modes.length === 1,
        ),
      ).toBe(true);
      for (const n of [0, 2, 8, 12]) {
        const sweep = fourierFillSweep(DEFAULT, n, caseId, {
            trackedBranch: 1,
          }),
          nominal = sweep.points.find((point) => point.fill === DEFAULT.fill)!,
          inspected = findMode(scene, caseId, {
            kind: "shell",
            n,
            axialOrder: 1,
          })!;
        expect(coverage.families[n].modes).toEqual(nominal.modes);
        close(nominal.modes[0].frequency, inspected.frequency);
        expect(nominal.modes[0].branch).toBe(1);
        for (const point of sweep.points)
          expect(point.modes.every((mode) => mode.branch === 1)).toBe(true);
      }
      // All five meridional Ritz functions still enter each solve.
      expect(
        coverage.families.every((family) => family.dryFrequencies.length === 5),
      ).toBe(true);
    }, 30000);

  it("preserves exact-marker history independence with the adaptive m1 path", () => {
    for (const n of [0, 2, 12]) {
      const canonical = fourierFillSweep(DEFAULT, n, "combined", {
          trackedBranch: 1,
        }),
        inserted = fourierFillSweep(
          { ...DEFAULT, fill: 0.2375 },
          n,
          "combined",
          { trackedBranch: 1 },
        ),
        insertedAgain = fourierFillSweep(
          { ...DEFAULT, fill: 0.28 },
          n,
          "combined",
          { trackedBranch: 1 },
        );
      for (const point of canonical.points) {
        expect(
          inserted.points.find((candidate) => candidate.fill === point.fill),
        ).toEqual(point);
        expect(
          insertedAgain.points.find(
            (candidate) => candidate.fill === point.fill,
          ),
        ).toEqual(point);
      }
      for (const fill of [0.2375, 0.28]) {
        const solution = solve({ ...DEFAULT, fill }),
          mode = findMode(solution, "combined", {
            kind: "shell",
            n,
            axialOrder: 1,
          })!,
          sweep = fill === 0.2375 ? inserted : insertedAgain;
        close(
          sweep.points.find((point) => point.fill === fill)!.modes[0].frequency,
          mode.frequency,
        );
      }
    }
  });

  it("ignores unused pressure controls in mass-only spectra and branch tracking", () => {
    const base = fourierFillSweep(DEFAULT, 12, "mass", { trackedBranch: 1 }),
      changed = fourierFillSweep(
        { ...DEFAULT, ullagePsi: 60, accelerationG: 4 },
        12,
        "mass",
        { trackedBranch: 1 },
      );
    expect(changed.points).toEqual(base.points);
    expect(changed.minTrackingMAC).toBe(base.minTrackingMAC);
    expect(changed.settings.ullagePsi).toBe(60);
    expect(changed.settings.accelerationG).toBe(4);
  });

  it("yields each angular family for scheduling and returns the same coverage", () => {
    const steps = fourierCoverageSteps(DEFAULT, {
        caseId: "pressure",
        trackedBranch: 1,
      }),
      completed: number[] = [];
    let result = steps.next();
    while (!result.done) {
      completed.push(result.value);
      result = steps.next();
    }
    expect(completed).toEqual(
      Array.from({ length: FOURIER_MAX_ORDER + 1 }, (_, n) => n),
    );
    expect(result.value).toEqual(
      fourierCoverage(DEFAULT, { caseId: "pressure", trackedBranch: 1 }),
    );
  });
});

describe("high-order integration and potential-trial sensitivity", () => {
  it("resolves high-n radial energy products and reports remaining basis sensitivity", () => {
    for (const n of [12, 20]) {
      const quadrature = fourierQuadratureDiagnostics(DEFAULT, n),
        basis = fourierBasisDiagnostics(DEFAULT, n);
      expect(quadrature.radialPoints).toBeGreaterThanOrEqual(n + 7);
      expect(quadrature.refinedRadialPoints).toBeGreaterThan(
        quadrature.radialPoints,
      );
      expect(quadrature.maxFrequencyRelativeDifference).toBeLessThan(1e-8);
      expect(quadrature.maxMassRatioRelativeDifference).toBeLessThan(1e-8);
      expect(quadrature.minMAC).toBeGreaterThan(0.999);
      expect(basis.maxFrequencyRelativeDifference).toBeGreaterThan(1e-4);
      expect(basis.maxFrequencyRelativeDifference).toBeLessThan(0.02);
      expect(basis.maxMassRatioRelativeDifference).toBeLessThan(0.02);
      expect(basis.maxResidual).toBeLessThan(1e-8);
      expect(basis.minMAC).toBeGreaterThan(0.999);
      expect(basis.matchingAmbiguous).toBe(false);
    }
  });
});

describe("Fourier fill continuation", () => {
  it("tracks n12 across the fill sweep without the previous 5% identity gaps", () => {
    const sweep = fourierFillSweep(DEFAULT);
    expect(sweep.points).toHaveLength(21);
    expect(sweep.points.every((point) => point.available)).toBe(true);
    expect(sweep.minTrackingMAC).toBeGreaterThan(0.995);
    expect(sweep.trackingAmbiguous).toBe(false);
    const empty = sweep.points[0],
      nominal = sweep.points.find((point) => point.fill === DEFAULT.fill)!;
    nominal.modes.forEach((mode) => {
      expect(mode.frequency).toBeLessThan(
        empty.modes.find((dry) => dry.branch === mode.branch)!.frequency,
      );
      expect(mode.addedMassRatio).toBeGreaterThan(0);
    });
  });

  it("inserts exact fill markers without changing any canonical branch assignment", () => {
    const canonical = fourierFillSweep(DEFAULT),
      inserted = fourierFillSweep({ ...DEFAULT, fill: 0.2375 });
    expect(inserted.points).toHaveLength(22);
    const exact = inserted.points.find((point) => point.fill === 0.2375)!;
    expect(exact.available).toBe(true);
    expect(
      exact.modes.every(
        (mode) => mode.stepMAC !== null && mode.stepMAC > 0.995,
      ),
    ).toBe(true);
    for (const point of canonical.points)
      expect(
        inserted.points.find((candidate) => candidate.fill === point.fill),
      ).toEqual(point);
    expect(fourierFillSweep({ ...DEFAULT, fill: 0.2375 })).toEqual(inserted);
  });

  it("retires the full-tank volume direction and identifies uncertain closure matches", () => {
    const sweep = fourierFillSweep(DEFAULT, 0),
      full = sweep.points.at(-1)!;
    expect(full.fill).toBe(1);
    expect(full.modes).toHaveLength(4);
    expect(full.modes.some((mode) => mode.trackingAmbiguous)).toBe(true);
    expect(new Set(full.modes.map((mode) => mode.branch)).size).toBe(4);
  });
});
