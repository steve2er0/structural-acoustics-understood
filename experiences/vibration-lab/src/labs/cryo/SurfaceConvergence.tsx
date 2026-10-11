import { useEffect, useMemo, useState } from "react";
import {
  SURFACE_FILL_GRID,
  surfaceConvergenceSteps,
  type Solution,
  type Settings,
  type SurfaceConvergenceRow,
} from "./physics";
const pct = (v: number | null) =>
  v === null ? "—" : `${(100 * v).toFixed(2)}%`;
export default function SurfaceConvergence({
  solution,
  onBasis,
}: {
  solution: Solution;
  onBasis: (patch: Partial<Settings>) => void;
}) {
  const [maximum, setMaximum] = useState(12),
    [branches, setBranches] = useState(3),
    [maxHz, setMaxHz] = useState(100),
    [tolerance, setTolerance] = useState(0.01),
    [n, setN] = useState(2),
    [fill, setFill] = useState(0.8);
  const key = JSON.stringify([
    solution.settings.fluid,
    solution.settings.ullagePsi,
    solution.settings.accelerationG,
    maximum,
    branches,
    maxHz,
    tolerance,
  ]);
  const [result, setResult] = useState<{
    key: string;
    rows: SurfaceConvergenceRow[];
    done: boolean;
  }>({ key: "", rows: [], done: false });
  useEffect(() => {
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    const steps = surfaceConvergenceSteps(solution.settings, {
        maxOrder: maximum,
        branches,
        maxHz,
        tolerance,
      }),
      rows: SurfaceConvergenceRow[] = [];
    setResult({ key, rows: [], done: false });
    const advance = () => {
      if (cancelled) return;
      try {
        const next = steps.next();
        if (next.done) {
          setResult({ key, rows: rows.slice(), done: true });
          return;
        }
        rows.push(next.value);
        setResult({ key, rows: rows.slice(), done: false });
        timer = setTimeout(advance, 0);
      } catch (error) {
        setResult({
          key,
          rows: [
            ...rows,
            {
              fill: 0,
              n: 0,
              noSurface: false,
              matches: [],
              recommended: null,
              potentialError: null,
              referenceResidual: Infinity,
              error:
                error instanceof Error ? error.message : "Convergence failed",
            },
          ],
          done: true,
        });
      }
    };
    timer = setTimeout(advance, 40);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);
  const rows = result.key === key ? result.rows : [],
    done = result.key === key && result.done,
    selected = rows.find((r) => r.n === n && r.fill === fill),
    partial = rows.filter((r) => !r.noSurface),
    unresolved = partial.filter((r) => r.recommended === null),
    required =
      partial.length && !unresolved.length
        ? Math.max(...partial.map((r) => r.recommended!))
        : null;
  const fills = useMemo(() => SURFACE_FILL_GRID, []);
  return (
    <div className="cryo-boundary-panels">
      <div className="cryo-plot-card">
        <div className="cryo-plot-title">
          <h3>How many surface shapes are enough?</h3>
          <span>ANGULAR AND RADIAL COVERAGE / FILL RANGE</span>
        </div>
        <p className="cryo-boundary-intro">
          Compare one, two and three radial shapes with a four-shape reference
          in every angular family across the fill range. The check follows
          corresponding coupled eigenvectors across basis sizes using
          kinetic-energy overlap. It assesses the selected dry-shell branches
          and the lowest surface branch within the frequency band. This is basis
          sensitivity within the reduced model.
        </p>
        <div className="cryo-boundary-controls">
          <label>
            Check angular orders through
            <select
              value={maximum}
              onChange={(e) => {
                setMaximum(+e.target.value);
                setN((v) => Math.min(v, +e.target.value));
              }}
            >
              {[3, 6, 12].map((v) => (
                <option key={v} value={v}>
                  n = {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dry-shell branches
            <select
              value={branches}
              onChange={(e) => setBranches(+e.target.value)}
            >
              {[1, 3, 5].map((v) => (
                <option key={v} value={v}>
                  {v === 5 ? "All five" : `First ${v}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Upper frequency
            <select value={maxHz} onChange={(e) => setMaxHz(+e.target.value)}>
              {[10, 50, 100, 500].map((v) => (
                <option key={v} value={v}>
                  {v} Hz
                </option>
              ))}
            </select>
          </label>
          <label>
            Frequency tolerance
            <select
              value={tolerance}
              onChange={(e) => setTolerance(+e.target.value)}
            >
              {[0.005, 0.01, 0.02, 0.05].map((v) => (
                <option key={v} value={v}>
                  {100 * v}%
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="cryo-boundary-status" role="status">
          {done
            ? `${rows.length} samples checked. ${unresolved.length} partial-fill samples remain unresolved.`
            : `Checking ${rows.length} of ${fills.length * (maximum + 1)} angular / fill samples…`}
        </p>
        {done && (
          <p className="cryo-boundary-intro">
            {required === null
              ? "A single verified basis count cannot be given for this range and tolerance. Inspect the unresolved cells: they can require more surface shapes, a better liquid potential space, or clearer mode correspondence."
              : `Across these samples, ${required} radial shape${required === 1 ? "" : "s"} per represented angular family through n=${maximum} matches the four-shape reference within the selected criteria.`}
          </p>
        )}
        {done && required !== null && (
          <button
            className="cryo-boundary-refine"
            onClick={() =>
              onBasis({
                surfaceMaxOrder: maximum,
                surfaceRadialOrder: required,
              })
            }
          >
            Apply n ≤ {maximum}, radial shapes {required}
          </button>
        )}
        <div className="cryo-boundary-table-wrap">
          <table className="cryo-convergence-map">
            <caption>
              Minimum radial count matching the reference · click a cell to
              inspect
            </caption>
            <thead>
              <tr>
                <th scope="col">Fill</th>
                {Array.from({ length: maximum + 1 }, (_, i) => (
                  <th scope="col" key={i}>
                    n={i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fills.map((f) => (
                <tr key={f}>
                  <th scope="row">{100 * f}%</th>
                  {Array.from({ length: maximum + 1 }, (_, i) => {
                    const row = rows.find((r) => r.fill === f && r.n === i),
                      label = !row
                        ? "…"
                        : row.noSurface
                          ? "—"
                          : row.recommended === null
                            ? "!"
                            : String(row.recommended),
                      excluded = i > (solution.settings.surfaceMaxOrder ?? 12),
                      needsMore =
                        !!row?.recommended &&
                        row.recommended >
                          (solution.settings.surfaceRadialOrder ?? 2);
                    return (
                      <td key={i}>
                        <button
                          type="button"
                          className={`cryo-convergence-cell ${row?.recommended === null && !row.noSurface ? "unresolved" : ""} ${excluded ? "excluded" : ""} ${needsMore ? "needs-more" : ""}`}
                          aria-label={`Inspect fill ${100 * f}%, n ${i}`}
                          aria-pressed={fill === f && n === i}
                          onClick={() => {
                            setFill(f);
                            setN(i);
                          }}
                          title={
                            excluded
                              ? "This angular family is excluded from the active surface basis"
                              : (row?.error ?? "Inspect comparison")
                          }
                        >
                          {label}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cryo-plot-caption">
          — means no free surface at empty/full fill. ! means unresolved at the
          tested cap. Dashed cells lie above the active angular cutoff. Amber
          borders mark samples requiring more radial shapes than the active
          basis. Passing also requires liquid/shell kinetic-ratio change ≤0.05 ×
          max(1, reference ratio) for shell targets, MAC ≥0.90, unambiguous
          eigenvalues, and a separate 8×20 → 9×22 liquid-potential frequency
          check. The grid samples fills; it does not prove every intervening
          fill converged. Numerically dependent potential trials are discarded
          by a documented pivot criterion; resolved direction counts are shown
          below. Four radial shapes are a reference cap, not a demonstrated
          converged solution.
        </p>
      </div>
      <div className="cryo-plot-card">
        <div className="cryo-plot-title">
          <h3>Inspect the basis comparison.</h3>
          <span>COUPLED SPECTRUM / COMMON LIQUID POTENTIAL SPACE</span>
        </div>
        <div className="cryo-boundary-controls">
          <label>
            Inspect angular order
            <select value={n} onChange={(e) => setN(+e.target.value)}>
              {Array.from({ length: maximum + 1 }, (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label>
            Inspect fill
            <select value={fill} onChange={(e) => setFill(+e.target.value)}>
              {fills.map((f) => (
                <option key={f} value={f}>
                  {100 * f}%
                </option>
              ))}
            </select>
          </label>
        </div>
        {!selected ? (
          <p role="status">Waiting for this sample…</p>
        ) : selected.error ? (
          <p role="status">Unavailable: {selected.error}</p>
        ) : (
          <>
            <p className="cryo-boundary-intro">
              {selected.noSurface
                ? "There is no active free surface at this fill."
                : selected.recommended === null
                  ? "No supported minimum at this sample within the tested cap."
                  : `Minimum supported count at this sample: ${selected.recommended} radial shapes.`}{" "}
              Liquid-potential frequency sensitivity:{" "}
              {pct(selected.potentialError)}. Reference eigen residual:{" "}
              {selected.referenceResidual.toExponential(1)}. Resolved potential
              directions: {selected.potentialRank} / {selected.potentialTrials}.
            </p>
            <div className="cryo-boundary-table-wrap">
              <table>
                <caption>
                  Differences from the four-shape reference for matched target
                  modes
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Radial shapes</th>
                    <th scope="col">Max frequency change</th>
                    <th scope="col">Shell energy-ratio change</th>
                    <th scope="col">Min MAC</th>
                    <th scope="col">Correspondence</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.matches.map((m) => (
                    <tr key={m.radial}>
                      <th scope="row">
                        {m.radial}
                        {m.radial === 4 ? " · reference" : ""}
                      </th>
                      <td>{pct(m.frequencyError)}</td>
                      <td>{pct(m.energyError)}</td>
                      <td>{(100 * m.minimumMAC).toFixed(1)}%</td>
                      <td>
                        {m.missing
                          ? `${m.missing} missing`
                          : m.reliable
                            ? "Resolved"
                            : "Uncertain / no target"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
