import { describe, expect, it } from "vitest";
import {
  DEFAULT,
  FLUIDS,
  G0,
  PSI,
  SHELL_MAX_ORDER,
  TANK,
  TANK_VOLUME,
  besselJ,
  cylinderSloshFrequency,
  cylinderGalerkinFrequency,
  convergenceDiagnostics,
  dryRitzFrequencies,
  findMode,
  freeSurfaceDisplacement,
  fluidDisplacement,
  fourierCoverage,
  generalizedEigen,
  heightForFill,
  pressureAt,
  radiusAt,
  resolveCaseModes,
  shellDisplacement,
  solve,
  structuralMAC,
  volumeBelow,
} from "./physics";

const baseline = solve(DEFAULT);
const close = (a: number, b: number, relative = 1e-8) =>
  expect(Math.abs(a - b)).toBeLessThan(relative * Math.max(1, Math.abs(b)));

describe("tank geometry and load definitions", () => {
  it("uses total height including two ellipsoidal domes and exact volume fill", () => {
    close(TANK.barrelHeight + 2 * TANK.domeDepth, TANK.height);
    close(
      TANK_VOLUME,
      Math.PI *
        TANK.radius ** 2 *
        (TANK.barrelHeight + (4 * TANK.domeDepth) / 3),
    );
    for (const fill of [0, 0.01, 0.15, 0.5, 0.85, 0.99, 1])
      close(volumeBelow(heightForFill(fill)) / TANK_VOLUME, fill);
    close(heightForFill(0.5), TANK.height / 2);
    expect(radiusAt(0)).toBe(0);
    expect(radiusAt(TANK.height)).toBe(0);
    expect(baseline.shellMass).toBeGreaterThan(8300);
    expect(baseline.shellMass).toBeLessThan(8350);
  });
  it("defines 31 psig and TOTAL effective 2g separately", () => {
    close(baseline.ullagePa, 31 * PSI);
    close(baseline.headPa, 1140 * 2 * G0 * baseline.liquidHeight);
    close(baseline.bottomPa, baseline.ullagePa + baseline.headPa);
    close(pressureAt(baseline, baseline.liquidHeight + 1).head, 0);
    close(pressureAt(baseline, 0).total, baseline.bottomPa);
  });
});

describe("deterministic fill continuation", () => {
  const selection = { kind: "shell", n: 2, axialOrder: 1 } as const;
  it("follows the wet lowest ovalization branch through the previous label swaps", () => {
    let previous = Infinity;
    for (const fill of [0, 0.1, 0.2, 0.25, 0.28, 0.5, 0.85]) {
      const solution = solve({ ...DEFAULT, fill }),
        mode = findMode(solution, "mass", selection)!,
        lowest = solution.cases.mass.modes.filter(
          (m) => m.n === 2 && m.orientation === "cos",
        )[0];
      close(mode.eigenvalue, lowest.eigenvalue);
      expect(mode.frequency).toBeLessThanOrEqual(previous * (1 + 1e-10));
      expect(mode.trackingMinMAC).toBeGreaterThan(0.99);
      expect(mode.trackingAmbiguous).toBe(false);
      previous = mode.frequency;
    }
    close(
      findMode(solve({ ...DEFAULT, fill: 0.25 }), "mass", selection)!.frequency,
      12.0193636516579,
      1e-6,
    );
  });
  it("separates a large physical shape change from loss of step correspondence", () => {
    const solution = solve({ ...DEFAULT, fill: 0.28 }),
      mode = findMode(solution, "combined", {
        kind: "shell",
        n: 0,
        axialOrder: 1,
      })!;
    close(mode.frequency, 18.5220460519275, 1e-8);
    expect(mode.match).toBeLessThan(0.02);
    expect(mode.trackingMAC).toBeGreaterThan(0.999);
    expect(mode.trackingMinMAC).toBeGreaterThan(0.99);
    expect(mode.trackingAmbiguous).toBe(false);
  });
  it("gives identical labels, phases and quality independent of visitation history", () => {
    const snapshot = (fill: number) => {
      const mode = findMode(solve({ ...DEFAULT, fill }), "combined", {
        kind: "shell",
        n: 0,
        axialOrder: 1,
      })!;
      return {
        id: mode.referenceId,
        eigenvalue: mode.eigenvalue,
        vector: mode.vector.slice(),
        dryMAC: mode.match,
        stepMAC: mode.trackingMAC,
        minimumMAC: mode.trackingMinMAC,
      };
    };
    const high = snapshot(0.85),
      low = snapshot(0.28);
    snapshot(0.53);
    expect(snapshot(0.28)).toEqual(low);
    expect(snapshot(0.85)).toEqual(high);
  });
  it("does not smooth or modify any eigenvalue or algebraic residual when resolving labels", () => {
    const solution = solve({ ...DEFAULT, fill: 0.2375 }),
      before = Object.fromEntries(
        Object.entries(solution.cases).map(([id, c]) => [
          id,
          c.modes.map((mode) => [mode.eigenvalue, mode.residual]),
        ]),
      );
    for (const id of [
      "dry",
      "mass",
      "pressure",
      "combined",
      "coupled",
    ] as const)
      findMode(solution, id, selection);
    expect(
      Object.fromEntries(
        Object.entries(solution.cases).map(([id, c]) => [
          id,
          c.modes.map((mode) => [mode.eigenvalue, mode.residual]),
        ]),
      ),
    ).toEqual(before);
  });
  it("retains distinct sine/cosine fluid identities and retires the closed-tank branches", () => {
    const nearFull = solve({ ...DEFAULT, fill: 0.99 });
    const slosh = Array.from({ length: 7 }, (_, i) =>
      findMode(nearFull, "coupled", { kind: "slosh", sloshId: i + 1 })!,
    );
    expect(new Set(slosh.map((mode) => mode.referenceId)).size).toBe(7);
    expect(slosh.every((mode) => mode.trackingMinMAC > 0.99)).toBe(true);
    for (const [i, j] of [
      [0, 1],
      [2, 3],
      [5, 6],
    ])
      close(slosh[i].frequency, slosh[j].frequency);
    const full = solve({ ...DEFAULT, fill: 1 });
    findMode(full, "combined", { kind: "shell", n: 0 });
    const surviving = full.cases.combined.modes.filter((mode) => mode.n === 0);
    expect(surviving).toHaveLength(4);
    expect(new Set(surviving.map((mode) => mode.referenceId)).size).toBe(4);
    expect(
      findMode(full, "combined", { kind: "shell", n: 0, axialOrder: 1 }),
    ).toBeUndefined();
    expect(
      findMode(full, "coupled", { kind: "slosh", sloshId: 5 }),
    ).toBeUndefined();
    expect(
      resolveCaseModes(full, "coupled").filter((mode) => mode.kind === "slosh"),
    ).toHaveLength(0);
    // Enumerating all identities now continues the additional n5..12 blocks.
  }, 30000);
  it("bounds adaptive refinement near an empty pool and keeps cached settings isolated", () => {
    const settings = { ...DEFAULT, ullagePsi: 30, fill: 0.005 },
      early = solve(settings),
      initial = findMode(early, "combined", selection)!;
    expect(Number.isFinite(initial.frequency)).toBe(true);
    expect(initial.trackingMinMAC).toBeGreaterThan(0.99);
    // The tracker must own a settings snapshot, not this externally mutable result.
    early.settings.ullagePsi = 60;
    const fresh = solve({ ...settings, fill: 0.25 }),
      later = findMode(fresh, "combined", selection)!;
    expect(later.frequency).toBeLessThan(20);
    expect(later.trackingMinMAC).toBeGreaterThan(0.99);
    const other = findMode(
      solve({ ...settings, fill: 0.25, ullagePsi: 60 }),
      "combined",
      selection,
    )!;
    expect(other.frequency).toBeGreaterThan(later.frequency);
    expect(
      findMode(solve({ ...settings, fill: 0.25 }), "combined", selection)!
        .frequency,
    ).toBe(later.frequency);
  });
});
describe("seven retained free-surface eigenvectors", () => {
  it("counts degeneracies as vectors and preserves orthogonal angular families", () => {
    expect(baseline.slosh).toHaveLength(7);
    expect(baseline.slosh.map((s) => s.n)).toEqual([1, 1, 2, 2, 0, 3, 3]);
    for (const [i, j] of [
      [0, 1],
      [2, 3],
      [5, 6],
    ])
      close(baseline.slosh[i].frequency, baseline.slosh[j].frequency);
    expect(
      baseline.cases.coupled.modes.filter((m) => m.kind === "slosh"),
    ).toHaveLength(7);
    for (const mode of baseline.cases.coupled.modes)
      for (const other of baseline.cases.coupled.modes)
        if (mode.n !== other.n) expect(structuralMAC(mode, other)).toBe(0);
  });
  it("matches the rigid circular-cylinder benchmark and sqrt acceleration scaling", () => {
    const R = TANK.radius,
      h = 12,
      root = 1.841183781340659;
    close(
      cylinderSloshFrequency(1, h, 2),
      Math.sqrt(((2 * G0 * root) / R) * Math.tanh((root * h) / R)) /
        (2 * Math.PI),
    );
    const half = solve({ ...DEFAULT, accelerationG: 0.5 });
    for (let i = 0; i < 7; i++)
      close(half.slosh[i].frequency, baseline.slosh[i].frequency / 2);
  });
  it("benchmarks the actual potential-flow energy solve against cylindrical slosh", () => {
    for (const n of [0, 1, 2, 3])
      for (const depth of [2, 12]) {
        const exact = cylinderSloshFrequency(n, depth, 2),
          numeric = cylinderGalerkinFrequency(n, depth, 2);
        expect(numeric).toBeGreaterThanOrEqual(exact * (1 - 1e-9));
        expect(Math.abs(numeric - exact) / exact).toBeLessThan(0.00015);
      }
  });
  it("checks convergence of potential-flow and structural Ritz reductions", () => {
    const d = convergenceDiagnostics();
    expect(Math.max(...d.map((x) => x.fluidRelativeDifference))).toBeLessThan(
      0.0005,
    );
    expect(Math.max(...d.map((x) => x.sloshRelativeDifference))).toBeLessThan(
      0.0005,
    );
    // The primary n2 shell example is stable to adding two trial functions.
    expect(d.find((x) => x.n === 2)!.shellRelativeDifference).toBeLessThan(
      0.001,
    );
    // Ritz refinements must lower eigenvalues, but other shell families remain
    // visibly truncation-sensitive and must not be described as converged FE.
    for (const n of [0, 1, 2, 3, 4])
      expect(dryRitzFrequencies(n, 7)[0]).toBeLessThanOrEqual(
        dryRitzFrequencies(n, 5)[0] * (1 + 1e-8),
      );
  });
  it("has zero-mean circular surface basis and valid positive-root values", () => {
    for (const s of baseline.slosh) {
      const x = s.root,
        derivative =
          s.n === 0
            ? -besselJ(1, x)
            : (besselJ(s.n - 1, x) - besselJ(s.n + 1, x)) / 2;
      expect(Math.abs(derivative)).toBeLessThan(1e-12);
    }
    const zeroG = solve({ ...DEFAULT, accelerationG: 0 });
    expect(zeroG.slosh.every((s) => s.frequency === 0)).toBe(true);
    expect(
      zeroG.cases.coupled.modes
        .filter((m) => m.kind === "slosh")
        .every((m) => m.frequency < 1e-5),
    ).toBe(true);
  });
});
describe("consistent shell / fluid modal mechanics", () => {
  it("solves the generalized eigenproblem with small residuals", () => {
    const e = generalizedEigen(
      [
        [4, 1],
        [1, 9],
      ],
      [
        [2, 0.2],
        [0.2, 3],
      ],
    );
    expect(e.residuals.every((x) => x < 1e-12)).toBe(true);
    for (const c of Object.values(baseline.cases))
      expect(c.maxResidual).toBeLessThan(1e-8);
    expect(
      baseline.cases.coupled.modes.every(
        (m) => Number.isFinite(m.frequency) && !m.unstable,
      ),
    ).toBe(true);
  });
  it("returns dry mechanics when both liquid and pressure disappear", () => {
    const empty = solve({ ...DEFAULT, fill: 0, ullagePsi: 0 });
    expect(empty.slosh).toHaveLength(0);
    expect(empty.headPa).toBeLessThan(1e-8);
    for (const id of ["mass", "pressure", "combined", "coupled"] as const)
      for (const dry of empty.cases.dry.modes)
        close(
          empty.cases[id].modes.find((m) => m.referenceId === dry.referenceId)!
            .frequency,
          dry.frequency,
        );
  });
  it("mass alone lowers corresponding low shell modes and density strengthens that effect", () => {
    const hydrogen = solve({ ...DEFAULT, fluid: "lh2" });
    for (const n of [0, 1, 2, 3, 4]) {
      const dry = findMode(baseline, "dry", { kind: "shell", n })!,
        lo = findMode(baseline, "mass", { kind: "shell", n })!,
        hy = findMode(hydrogen, "mass", { kind: "shell", n })!;
      expect(lo.frequency).toBeLessThan(dry.frequency);
      expect(lo.frequency).toBeLessThan(hy.frequency);
    }
    close(
      baseline.liquidMass / hydrogen.liquidMass,
      FLUIDS.lox.density / FLUIDS.lh2.density,
    );
    // Density cancels out of the rigid-wall gravity-only eigenproblem.
    for (let i = 0; i < 7; i++)
      close(baseline.slosh[i].frequency, hydrogen.slosh[i].frequency);
  });
  it("barrel tensile prestress raises eigenvalues without a frequency multiplier", () => {
    const unpressurized = solve({ ...DEFAULT, ullagePsi: 0, accelerationG: 0 });
    for (const n of [0, 1, 2, 3, 4]) {
      const dry = findMode(baseline, "dry", { kind: "shell", n })!,
        loaded = findMode(baseline, "pressure", { kind: "shell", n })!;
      expect(loaded.frequency).toBeGreaterThan(dry.frequency);
      close(
        findMode(unpressurized, "pressure", { kind: "shell", n })!.frequency,
        dry.frequency,
      );
    }
  });
  it("reports positive structural and complete fluid kinetic-energy fractions", () => {
    for (const m of baseline.cases.coupled.modes) {
      expect(m.shellFraction).toBeGreaterThanOrEqual(-1e-12);
      expect(m.sloshFraction).toBeGreaterThanOrEqual(-1e-12);
      close(m.shellFraction + m.sloshFraction, 1);
      expect(m.match).toBeGreaterThanOrEqual(0);
      expect(m.match).toBeLessThanOrEqual(1 + 1e-12);
    }
    const slosh = findMode(baseline, "coupled", { kind: "slosh", sloshId: 1 })!;
    expect(slosh.sloshFraction).toBeGreaterThan(0.9);
    expect(
      Math.abs(shellDisplacement(baseline, slosh, 8, 0).radial),
    ).toBeLessThan(0.01);
    expect(
      Math.abs(
        freeSurfaceDisplacement(baseline, slosh, baseline.surfaceRadius, 0),
      ),
    ).toBeGreaterThan(0.5);
  });
  it("draws the same potential-flow kinetic energy used in the eigensolve", () => {
    const mode = findMode(baseline, "coupled", { kind: "shell", n: 2 })!;
    // Independent midpoint integration of the displayed liquid displacement.
    // The eigenvector has unit generalized mass; one common visual scale is used.
    let energy = 0;
    const edges = [0, TANK.domeDepth, baseline.liquidHeight],
      nz = 35,
      nr = 20,
      nt = 8;
    for (let segment = 1; segment < edges.length; segment++) {
      const dz = (edges[segment] - edges[segment - 1]) / nz;
      for (let i = 0; i < nz; i++) {
        const z = edges[segment - 1] + (i + 0.5) * dz,
          R = radiusAt(z),
          dr = R / nr;
        for (let j = 0; j < nr; j++)
          for (let k = 0; k < nt; k++) {
            const r = (j + 0.5) * dr,
              u = fluidDisplacement(
                baseline,
                mode,
                r,
                z,
                (2 * Math.PI * k) / nt,
              );
            energy +=
              (baseline.density *
                (u.radial * u.radial +
                  u.axial * u.axial +
                  u.tangential * u.tangential) *
                r *
                dr *
                dz *
                2 *
                Math.PI) /
              nt;
          }
      }
    }
    const target =
      mode.sloshFraction / (mode.normalization * mode.normalization);
    expect(Math.abs(energy - target) / target).toBeLessThan(0.002);
    const dry = findMode(baseline, "dry", { kind: "shell", n: 2 })!;
    expect(fluidDisplacement(baseline, dry, 1, 5, 0)).toEqual({
      radial: 0,
      axial: 0,
      tangential: 0,
    });
    expect(freeSurfaceDisplacement(baseline, dry, 1, 0)).toBe(0);
    const condensed = findMode(baseline, "combined", { kind: "shell", n: 2 })!;
    expect(
      Math.abs(
        freeSurfaceDisplacement(baseline, condensed, baseline.surfaceRadius, 0),
      ),
    ).toBeGreaterThan(0.01);
  });
  it("phase-aligns matched shell modes for synchronized comparison", () => {
    const dry = findMode(baseline, "dry", { kind: "shell", n: 2 })!;
    for (const id of ["mass", "pressure", "combined", "coupled"] as const) {
      const m = findMode(baseline, id, { kind: "shell", n: 2 })!;
      expect(
        shellDisplacement(baseline, m, TANK.height / 2, 0).radial *
          shellDisplacement(baseline, dry, TANK.height / 2, 0).radial,
      ).toBeGreaterThan(0);
    }
  });
  it("enforces a sealed full-tank volume constraint and removes free-surface modes", () => {
    const full = solve({ ...DEFAULT, fill: 1 });
    expect(full.slosh).toHaveLength(0);
    expect(full.surfaceActive).toBe(false);
    expect(full.cases.coupled.modes.filter((m) => m.n === 0)).toHaveLength(4);
    expect(
      full.cases.coupled.modes.every((m) => Number.isFinite(m.frequency)),
    ).toBe(true);
    expect(full.cases.coupled.maxResidual).toBeLessThan(1e-8);
  });
  it("remains finite near both dome fill limits", () => {
    for (const fill of [0.005, 0.05, 0.15, 0.95, 0.995]) {
      const result = solve({ ...DEFAULT, fill });
      expect(result.slosh).toHaveLength(7);
      expect(
        result.cases.coupled.modes.every((m) => Number.isFinite(m.frequency)),
      ).toBe(true);
      expect(result.cases.coupled.maxResidual).toBeLessThan(1e-7);
    }
  });
});

describe("inspected angular shell coverage through n=12", () => {
  it("retains solved vectors for each new family and all five comparison cases", () => {
    expect(SHELL_MAX_ORDER).toBe(12);
    for (const [id, modalCase] of Object.entries(baseline.cases)) {
      for (let n = 5; n <= SHELL_MAX_ORDER; n++) {
        const family = modalCase.modes.filter((mode) => mode.n === n);
        expect(family).toHaveLength(5);
        for (const mode of family) {
          expect(mode.kind).toBe("shell");
          expect(mode.orientation).toBe("cos");
          expect(mode.vector).toHaveLength(87);
          expect(mode.vector.every(Number.isFinite)).toBe(true);
          expect(mode.residual).toBeLessThan(1e-8);
          expect(mode.unstable).toBe(false);
          expect(mode.vector.slice(80)).toEqual(Array(7).fill(0));
        }
      }
      for (const axialOrder of [1, 2, 3]) {
        const mode = findMode(baseline, id as keyof typeof baseline.cases, {
          kind: "shell",
          n: 12,
          axialOrder,
        })!;
        expect(mode.referenceId).toBe(`shell-12-${axialOrder}-cos`);
        expect(mode.trackingAmbiguous).toBe(false);
        expect(mode.trackingMinMAC).toBeGreaterThan(0.99);
      }
    }
    expect(baseline.retainedSlosh).toBe(7);
    expect(
      baseline.cases.coupled.modes.filter((mode) => mode.kind === "slosh"),
    ).toHaveLength(7);
  });

  it("uses the same high-order added mass in inspection and Fourier coverage", () => {
    for (const caseId of ["mass", "combined"] as const) {
      const coverage = fourierCoverage(DEFAULT, { caseId });
      for (const n of [5, 8, 12]) {
        const displayed = baseline.cases[caseId].modes
            .filter((mode) => mode.n === n)
            .map((mode) => mode.frequency)
            .sort((a, b) => a - b),
          diagnostic = coverage.families[n].modes
            .map((mode) => mode.frequency)
            .sort((a, b) => a - b);
        expect(coverage.families[n].available).toBe(true);
        for (let j = 0; j < displayed.length; j++)
          close(displayed[j], diagnostic[j], 1e-10);
      }
    }
    const combined = baseline.cases.combined.modes.filter(
        (mode) => mode.n === 12,
      ),
      coupled = baseline.cases.coupled.modes.filter((mode) => mode.n === 12);
    for (let j = 0; j < combined.length; j++) {
      close(combined[j].frequency, coupled[j].frequency);
      expect(combined[j].referenceId).toBe(coupled[j].referenceId);
      expect(combined[j].vector).toEqual(coupled[j].vector);
      close(combined[j].trackingMAC, coupled[j].trackingMAC);
      close(combined[j].trackingMinMAC, coupled[j].trackingMinMAC);
    }
  });

  it("draws twelve circumferential waves from the solved n12 eigenvector", () => {
    const mode = findMode(baseline, "mass", {
        kind: "shell",
        n: 12,
        axialOrder: 1,
      })!,
      z = TANK.height / 2,
      zero = shellDisplacement(baseline, mode, z, 0),
      half = shellDisplacement(baseline, mode, z, Math.PI / 12),
      whole = shellDisplacement(baseline, mode, z, (2 * Math.PI) / 12);
    expect(Math.abs(zero.radial)).toBeGreaterThan(0.1);
    close(half.radial, -zero.radial);
    close(half.axial, -zero.axial);
    close(whole.radial, zero.radial);
    close(whole.axial, zero.axial);
    close(shellDisplacement(baseline, mode, z, Math.PI / 24).radial, 0);
    expect(freeSurfaceDisplacement(baseline, mode, 2, 0)).toBe(0);
  });

  it("draws the high-order liquid field with the same kinetic energy as its modal mass", () => {
    const mode = findMode(baseline, "mass", {
      kind: "shell",
      n: 12,
      axialOrder: 1,
    })!;
    // Independent midpoint volume integration resolves the thin near-wall field.
    // 25 angular samples exactly integrate the squared n12 sine/cosine factors.
    let energy = 0;
    const edges = [0, TANK.domeDepth, baseline.liquidHeight],
      nz = 50,
      nr = 100,
      nt = 25;
    for (let segment = 1; segment < edges.length; segment++) {
      const dz = (edges[segment] - edges[segment - 1]) / nz;
      for (let i = 0; i < nz; i++) {
        const z = edges[segment - 1] + (i + 0.5) * dz,
          dr = radiusAt(z) / nr;
        for (let j = 0; j < nr; j++)
          for (let k = 0; k < nt; k++) {
            const r = (j + 0.5) * dr,
              u = fluidDisplacement(
                baseline,
                mode,
                r,
                z,
                (2 * Math.PI * k) / nt,
              );
            energy +=
              (baseline.density *
                (u.radial ** 2 + u.axial ** 2 + u.tangential ** 2) *
                r *
                dr *
                dz *
                2 *
                Math.PI) /
              nt;
          }
      }
    }
    const target = mode.sloshFraction / mode.normalization ** 2;
    expect(Math.abs(energy - target) / target).toBeLessThan(0.004);
  });

  it("keeps n12 finite at empty, shallow and sealed-full fill limits", () => {
    for (const fill of [0, 0.00001, 0.005, 0.01, 0.99, 1]) {
      const solution = solve({ ...DEFAULT, fill });
      for (const id of [
        "dry",
        "mass",
        "pressure",
        "combined",
        "coupled",
      ] as const) {
        const mode = findMode(solution, id, {
          kind: "shell",
          n: 12,
          axialOrder: 1,
        })!;
        expect(Number.isFinite(mode.frequency)).toBe(true);
        expect(mode.vector.every(Number.isFinite)).toBe(true);
        expect(mode.residual).toBeLessThan(1e-7);
      }
      expect(solution.retainedSlosh).toBe(fill > 0 && fill < 1 ? 7 : 0);
    }
  });
});
