import { useEffect, useMemo, useState } from "react";
import {
  cylinderAddedMassBenchmark,
  surfaceBoundaryComparison,
  surfacePotentialOrders,
  type Solution,
  type SurfaceBoundary,
} from "./physics";

const LABELS: Record<SurfaceBoundary, string> = {
  retained: "Current reduced surface",
  rigid: "Constrained surface",
  "pressure-release": "Pressure release",
};
const fmt = (value: number, digits = 3) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });

export default function SurfaceBoundaryComparison({
  solution,
  initialOrder,
}: {
  solution: Solution;
  initialOrder: number;
}) {
  const [n, setN] = useState(initialOrder),
    [prestress, setPrestress] = useState(true),
    [refine, setRefine] = useState(false),
    [depth, setDepth] = useState(2);
  useEffect(() => setN(initialOrder), [initialOrder]);
  const [potentialRadial, potentialAxial] = surfacePotentialOrders(
      solution.settings,
      n,
    ),
    count =
      n <= (solution.settings.surfaceMaxOrder ?? 12)
        ? (solution.settings.surfaceRadialOrder ?? 2)
        : 0;
  const rows = useMemo(
    () => surfaceBoundaryComparison(solution.settings, n, prestress),
    [solution.settings, n, prestress],
  );
  const refined = useMemo(
    () =>
      refine
        ? surfaceBoundaryComparison(
            solution.settings,
            n,
            prestress,
            potentialRadial + 1,
            potentialAxial + 2,
          )
        : null,
    [solution.settings, n, prestress, refine],
  );
  const benchmark = useMemo(
    () => cylinderAddedMassBenchmark(1, depth, solution.density),
    [depth, solution.density],
  );
  const partial = solution.surfaceActive;
  return (
    <div className="cryo-boundary-panels">
      <div className="cryo-plot-card">
        <div className="cryo-plot-title">
          <h3>How much does the surface boundary matter?</h3>
          <span>SAME SHELL SPACE AND STIFFNESS</span>
        </div>
        <p className="cryo-boundary-intro">
          Re-solve the shell with three liquid boundary models at the current
          fill, density and pressure. Pressure release allows the surface to
          move at constant incremental pressure in the high-frequency limit; it
          omits gravity-wave dynamics. Constraining it forces more liquid motion
          inside the tank. The scene above uses the current reduced surface
          model.
        </p>
        <div className="cryo-boundary-controls">
          <label>
            Angular order n
            <select
              value={n}
              onChange={(event) => setN(Number(event.target.value))}
            >
              {Array.from({ length: 21 }, (_, order) => (
                <option key={order} value={order}>
                  {order}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Shell stiffness</legend>
            <div className="vl-segment">
              <button
                type="button"
                aria-pressed={!prestress}
                onClick={() => setPrestress(false)}
              >
                Dry stiffness
              </button>
              <button
                type="button"
                aria-pressed={prestress}
                onClick={() => setPrestress(true)}
              >
                With pressure prestress
              </button>
            </div>
          </fieldset>
          <button
            type="button"
            className="cryo-boundary-refine"
            aria-pressed={refine}
            onClick={() => setRefine(!refine)}
          >
            {refine ? "Hide fluid refinement" : "Check fluid refinement"}
          </button>
        </div>
        {!partial && (
          <p className="cryo-boundary-status" role="status">
            {solution.fluidActive
              ? "Completely full: there is no free surface. All three rows use the same closed-liquid boundary and volume constraint."
              : "Empty: there is no liquid inertia. All three rows reduce to the selected structural stiffness."}
          </p>
        )}
        <div className="cryo-boundary-cards">
          {rows.map((row, index) => {
            const check = refined?.[index],
              frequency = row.frequencies[0],
              difference =
                check?.available && row.available && check.frequencies[0] > 0
                  ? (Math.abs(frequency - check.frequencies[0]) /
                      check.frequencies[0]) *
                    100
                  : null;
            return (
              <article
                key={row.boundary}
                className={`cryo-boundary-card boundary-${row.boundary}`}
              >
                <h4>{LABELS[row.boundary]}</h4>
                <p className="cryo-boundary-rule">
                  {!partial
                    ? "No free-surface boundary"
                    : row.boundary === "retained"
                      ? count > 0
                        ? `${count} radial surface shapes in this angular block`
                        : "No retained surface shape at this n"
                      : row.boundary === "rigid"
                        ? "Zero normal surface motion"
                        : "Zero incremental surface pressure"}
                </p>
                <strong>
                  {row.available ? fmt(frequency) : "Unavailable"}
                  <span>{row.available ? " Hz" : ""}</span>
                </strong>
                <p>Lowest elastic eigenfrequency</p>
                {row.available ? (
                  <dl>
                    <div>
                      <dt>Added-mass ratio μ</dt>
                      <dd>{fmt(row.addedMassRatios[0])}</dd>
                    </div>
                    <div>
                      <dt>Eigen residual</dt>
                      <dd>{row.maxResidual.toExponential(1)}</dd>
                    </div>
                    <div>
                      <dt>Shell directions</dt>
                      <dd>
                        {row.frequencies.length}
                        {row.constrainedVolume ? " · zero volume change" : ""}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p role="status">{row.error}</p>
                )}
                {refine && (
                  <p className="cryo-boundary-refinement">
                    {difference === null
                      ? "Refinement unavailable; comparison incomplete."
                      : `${potentialRadial}×${potentialAxial} → ${potentialRadial + 1}×${potentialAxial + 2} fluid basis: ${fmt(difference, 4)}% frequency change.`}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        <p className="cryo-plot-caption">
          Each row solves the full reduced matrix eigenproblem. Eigenfrequencies
          are ordered separately in each row; equal rank does not establish the
          same tracked mode. μ is evaluated on that row’s wet eigenvector.
          {partial &&
            n === 0 &&
            " A constrained axisymmetric surface requires zero wall-volume change, removing one shell direction; the other partial-fill models allow volume-conserving surface motion."}
          {partial &&
            count === 0 &&
            " The current model coincides with the constrained surface at this angular order."}
          {refine &&
            " The refinement checks the lowest eigenfrequency only, not mode identity or structural convergence."}
        </p>
        <details className="cryo-boundary-spectrum">
          <summary>All reduced shell eigenfrequencies</summary>
          <div className="cryo-boundary-table-wrap">
            <table>
              <caption>
                Eigenvalue order within each boundary model · Hz
              </caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  {rows.map((row) => (
                    <th scope="col" key={row.boundary}>
                      {LABELS[row.boundary]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    <th scope="row">{i + 1}</th>
                    {rows.map((row) => (
                      <td key={row.boundary}>
                        {row.frequencies[i] === undefined
                          ? "—"
                          : fmt(row.frequencies[i])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
      <div className="cryo-plot-card">
        <div className="cryo-plot-title">
          <h3>An independent added-mass check.</h3>
          <span>FLAT CYLINDER / EXACT POTENTIAL SOLUTIONS</span>
        </div>
        <p className="cryo-boundary-intro">
          The same fluid assembly is tested in a rigid-bottom cylinder of radius
          4.2 m with two prescribed lateral wall patterns (n = 1). These exact
          solutions check liquid kinetic energy independently of shell stiffness
          and slosh frequency. This checks the cylinder solver, rather than
          correlating the domed tank with FE or test data.
        </p>
        <div className="cryo-boundary-controls">
          <label>
            Cylinder liquid depth
            <select
              value={depth}
              onChange={(event) => setDepth(Number(event.target.value))}
            >
              <option value={2}>2 m</option>
              <option value={12}>12 m</option>
            </select>
          </label>
          <span>Current liquid density: {fmt(solution.density, 1)} kg/m³</span>
        </div>
        <div className="cryo-boundary-table-wrap">
          <table>
            <caption>
              Generalized added mass for a unit wall-velocity amplitude
            </caption>
            <thead>
              <tr>
                <th scope="col">Boundary and wall pattern</th>
                <th scope="col">Analytical / kg</th>
                <th scope="col">Numerical / kg</th>
                <th scope="col">Relative error</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.map((row) => (
                <tr key={row.boundary}>
                  <th scope="row">
                    {row.boundary === "rigid"
                      ? "Rigid lid · uniform with height"
                      : "Pressure release · cos(πz / 2h)"}
                  </th>
                  <td>{fmt(row.analytic, 2)}</td>
                  <td>{fmt(row.numerical, 2)}</td>
                  <td>{(row.relativeError * 100).toExponential(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cryo-plot-caption">
          For the uniform lateral pattern under a rigid lid, added mass equals
          the entire liquid mass: Mₐ = ρπR²h. For pressure release, the cosine
          wall pattern has Mₐ = ρπRh I₁(kR) / [2k I′₁(kR)], k = π/(2h). I₁ is
          the modified Bessel function. The wall patterns differ between these
          two checks, so their mass difference does not isolate a boundary
          effect. The tank comparison above uses identical wall trial spaces.
        </p>
      </div>
    </div>
  );
}
