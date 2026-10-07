import { useMemo } from "react";
import { findMode, solve, type Solution, type CaseId } from "./physics";
import type { AnalysisTab } from "./tour";
import FourierCoverage from "./FourierCoverage";
export interface Selection {
  kind: "shell" | "slosh";
  n: number;
  axialOrder: number;
  sloshId: number;
}
export const CASES: {
  id: CaseId;
  label: string;
  short: string;
  color: string;
  copy: string;
}[] = [
  {
    id: "dry",
    label: "Dry shell",
    short: "Dry",
    color: "#b6c6c5",
    copy: "Structural stiffness and mass",
  },
  {
    id: "mass",
    label: "Added mass only",
    short: "+ inertia",
    color: "#8dcbdc",
    copy: "Fluid inertia; no pressure prestress",
  },
  {
    id: "pressure",
    label: "Pressure only",
    short: "+ prestress",
    color: "#e8be85",
    copy: "Pressure stiffness; dry structural mass",
  },
  {
    id: "combined",
    label: "Mass + pressure",
    short: "Both",
    color: "#b9d6a5",
    copy: "Condensed fluid inertia and pressure stiffness",
  },
  {
    id: "coupled",
    label: "With seven slosh modes",
    short: "+ 7 slosh",
    color: "#c9b4e8",
    copy: "Shell + surface solve; retained slosh shapes at n = 0–3",
  },
];
const fmt = (x: number) =>
  x.toLocaleString("en-US", { maximumFractionDigits: 2 });
const W = 740,
  H = 265,
  L = 58,
  T = 20,
  R = 22,
  B = 42;
export default function Plots({
  solution,
  selection,
  tab,
  caseId,
  onCase,
  onSlosh,
}: {
  solution: Solution;
  selection: Selection;
  tab: AnalysisTab;
  caseId: CaseId;
  onCase: (id: CaseId) => void;
  onSlosh: (id: number) => void;
}) {
  const sweep = useMemo(
    () =>
      tab !== "Fill sweep" || selection.kind !== "shell"
        ? []
        : Array.from({ length: 21 }, (_, i) => {
            const fill = i * 0.05;
            const s = solve({ ...solution.settings, fill });
            const modes = CASES.map((c) => findMode(s, c.id, selection));
            return {
              fill,
              values: modes.map((m) => m?.frequency ?? null),
              uncertain: modes.map((m) => !m || m.trackingAmbiguous),
            };
          }),
    [
      tab,
      solution.settings.fluid,
      solution.settings.ullagePsi,
      solution.settings.accelerationG,
      selection.kind,
      selection.n,
      selection.axialOrder,
    ],
  );
  if (tab === "Fourier coverage")
    return <FourierCoverage solution={solution} />;
  if (tab === "Pressure") {
    const ullage = solution.ullagePa / 1000,
      head = solution.headPa / 1000,
      limit = Math.max(20, Math.ceil(solution.bottomPa / 1000 / 50) * 50);
    const x = (p: number) => L + (p / limit) * (W - L - R),
      y = (z: number) => T + ((16.8 - z) / 16.8) * (H - T - B);
    const path = `M ${x(ullage)} ${y(16.8)} L ${x(ullage)} ${y(solution.liquidHeight)} L ${x(ullage + head)} ${y(0)}`;
    return (
      <div className="cryo-plot-card">
        <div className="cryo-plot-title">
          <h3>Uniform ullage. A head that grows with depth.</h3>
          <span>STATIC PRESSURE / kPa GAUGE</span>
        </div>
        <svg
          className="cryo-plot"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Pressure versus elevation: uniform ullage pressure plus acceleration induced liquid head"
        >
          <rect
            x={L}
            y={y(solution.liquidHeight)}
            width={W - L - R}
            height={y(0) - y(solution.liquidHeight)}
            fill="#69bdd510"
          />
          {[0, 4.2, 8.4, 12.6, 16.8].map((z) => (
            <g key={z}>
              <line x1={L} x2={W - R} y1={y(z)} y2={y(z)} stroke="#adc9cb18" />
              <text x={L - 9} y={y(z) + 4} textAnchor="end">
                {z.toFixed(1)}
              </text>
            </g>
          ))}
          {Array.from({ length: 5 }, (_, i) => (limit * i) / 4).map((p) => (
            <g key={p}>
              <line x1={x(p)} x2={x(p)} y1={T} y2={H - B} stroke="#adc9cb18" />
              <text x={x(p)} y={H - B + 19} textAnchor="middle">
                {fmt(p)}
              </text>
            </g>
          ))}
          <path
            d={`M ${x(0)} ${y(16.8)} L ${x(0)} ${y(solution.liquidHeight)} L ${x(head)} ${y(0)}`}
            fill="none"
            stroke="#e8be85"
            strokeDasharray="4 5"
            strokeWidth={2}
          />
          <line
            x1={x(ullage)}
            x2={x(ullage)}
            y1={T}
            y2={H - B}
            stroke="#b8d3a5"
            strokeDasharray="5 4"
            strokeWidth={2}
          />
          <path d={path} fill="none" stroke="#9cdae3" strokeWidth={3} />
          <line
            x1={L}
            x2={W - R}
            y1={y(solution.liquidHeight)}
            y2={y(solution.liquidHeight)}
            stroke="#89bfd0"
            strokeDasharray="2 5"
          />
          <text x={W - R - 4} y={y(solution.liquidHeight) - 7} textAnchor="end">
            Liquid surface · {fmt(solution.liquidHeight)} m
          </text>
          <text x={W / 2} y={H - 3} textAnchor="middle">
            Pressure relative to exterior / kPa
          </text>
          <text
            transform={`translate(13 ${H / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            Elevation / m
          </text>
        </svg>
        <div className="cryo-plot-legend">
          <span style={{ color: "#b8d3a5" }}>─ ─ Ullage {fmt(ullage)} kPa</span>
          <span style={{ color: "#e8be85" }}>
            ─ ─ Liquid head {fmt(head)} kPa at bottom
          </span>
          <span style={{ color: "#9cdae3" }}>
            ━━ Total {fmt(ullage + head)} kPa at bottom
          </span>
        </div>
        <p className="cryo-plot-caption">
          p(z) = p<sub>ullage,gauge</sub> + ρ a<sub>eff</sub> max(h − z, 0). Gas
          pressure is uniform; acceleration creates the liquid gradient. The
          colored field on the tank uses this same profile.
        </p>
      </div>
    );
  }
  if (tab === "Slosh" || selection.kind === "slosh")
    return (
      <div className="cryo-plot-card">
        <div className="cryo-plot-title">
          <h3>Seven eigenvectors. Four spatial families.</h3>
          <span>IDEAL TANK / COUPLED REDUCTION</span>
        </div>
        <div className="cryo-slosh-grid">
          {solution.slosh.map((s) => {
            const coupled = findMode(solution, "coupled", {
              kind: "slosh",
              sloshId: s.id,
            });
            return (
              <button
                key={s.id}
                className={
                  selection.kind === "slosh" && selection.sloshId === s.id
                    ? "active"
                    : ""
                }
                onClick={() => onSlosh(s.id)}
                aria-label={`Inspect slosh eigenvector ${s.id}`}
                aria-pressed={
                  selection.kind === "slosh" && selection.sloshId === s.id
                }
              >
                <span className="cryo-slosh-id">
                  S{String(s.id).padStart(2, "0")}
                </span>
                <span className="cryo-slosh-shape">
                  {s.n === 0
                    ? "Axisymmetric"
                    : `n = ${s.n} · ${s.orientation === "cos" ? "cosine" : "sine"}`}
                </span>
                <strong>
                  {s.frequency.toFixed(3)} <small>Hz</small>
                </strong>
                <span className="cryo-slosh-coupled">
                  Coupled {coupled ? coupled.frequency.toFixed(3) : "—"} Hz
                </span>
              </button>
            );
          })}
        </div>
        <p className="cryo-plot-caption">
          The rigid-wall fluid benchmark and coupled result share the same
          retained surface basis. Directional pairs stay degenerate in this
          symmetric geometry. Gravity-slosh restoring stiffness scales with
          effective acceleration.{" "}
          {solution.settings.fill === 0
            ? "The tank is empty; fluid modes are inactive."
            : solution.settings.fill === 1
              ? "The tank is full; free-surface modes are inactive."
              : ""}
        </p>
      </div>
    );
  if (tab === "Fill sweep") {
    // Use the same exact-fill eigenvectors as the readout and scene, rather
    // than placing their markers on an independently interpolated curve.
    const currentModes = CASES.map((c) => findMode(solution, c.id, selection));
    const points = [
      ...sweep.filter((s) => Math.abs(s.fill - solution.settings.fill) > 1e-9),
      {
        fill: solution.settings.fill,
        values: currentModes.map((m) => m?.frequency ?? null),
        uncertain: currentModes.map((m) => !m || m.trackingAmbiguous),
      },
    ].sort((a, b) => a.fill - b.fill);
    const limit =
      Math.max(1, ...points.flatMap((s) => s.values.map((v) => v ?? 0))) * 1.15;
    const x = (f: number) => L + f * (W - L - R),
      y = (f: number) => T + (1 - f / limit) * (H - T - B);
    return (
      <div className="cryo-plot-card">
        <div className="cryo-plot-title">
          <h3>Follow the same mode as the tank fills.</h3>
          <span>FILL CONTINUATION / Hz</span>
        </div>
        <svg
          className="cryo-plot"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Tracked modal frequencies as liquid volume fill changes"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={T} y2={H - B} stroke="#adc9cb18" />
              <text x={x(v)} y={H - B + 19} textAnchor="middle">
                {v * 100}%
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line
                x1={L}
                x2={W - R}
                y1={y(limit * v)}
                y2={y(limit * v)}
                stroke="#adc9cb18"
              />
              <text x={L - 9} y={y(limit * v) + 4} textAnchor="end">
                {fmt(limit * v)}
              </text>
            </g>
          ))}
          {CASES.map((c, j) => (
            <path
              key={c.id}
              d={points
                .map((s, i) =>
                  s.uncertain[j] || s.values[j] === null
                    ? ""
                    : `${i > 0 && !points[i - 1].uncertain[j] && points[i - 1].values[j] !== null ? "L" : "M"} ${x(s.fill)} ${y(s.values[j]!)}`,
                )
                .join(" ")}
              stroke={c.color}
              strokeWidth={caseId === c.id ? 3 : 1.5}
              strokeDasharray={c.id === "dry" ? "4 5" : undefined}
              fill="none"
            />
          ))}
          <line
            x1={x(solution.settings.fill)}
            x2={x(solution.settings.fill)}
            y1={T}
            y2={H - B}
            stroke="#e5eee2"
            strokeDasharray="2 5"
          />
          {CASES.map((c, j) =>
            points
              .filter((s) => s.uncertain[j] && s.values[j] !== null)
              .map((s) => (
                <circle
                  key={`${c.id}-${s.fill}`}
                  cx={x(s.fill)}
                  cy={y(s.values[j]!)}
                  r={3}
                  fill="none"
                  stroke={c.color}
                />
              )),
          )}
          {CASES.map((c) => {
            const m = findMode(solution, c.id, selection);
            return (
              m && (
                <circle
                  key={c.id}
                  cx={x(solution.settings.fill)}
                  cy={y(m.frequency)}
                  r={4}
                  fill={m.trackingAmbiguous ? "none" : c.color}
                  stroke={c.color}
                  strokeWidth={m.trackingAmbiguous ? 2 : 1}
                />
              )
            );
          })}
          <text x={W / 2} y={H - 3} textAnchor="middle">
            Liquid volume / tank capacity
          </text>
          <text
            transform={`translate(13 ${H / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            Frequency / Hz
          </text>
        </svg>
        <div className="cryo-plot-legend">
          {CASES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCase(c.id)}
              style={{ color: c.color }}
              aria-pressed={c.id === caseId}
            >
              ━ {c.short}
            </button>
          ))}
        </div>
        <p className="cryo-plot-caption">
          Each branch follows eigenvector overlap through small fill increments
          within its circumferential family. Its shape can evolve away from the
          dry shape without changing its identity. Open circles and breaks mark
          uncertain continuation; an unavailable full-tank branch has no point.
          Pressure and acceleration are held fixed. Dots at the current fill use
          the same solve as the readout and 3D mode.
          {selection.n >= 4 &&
            " At partial fill, this angular family uses a rigid free surface and has no retained slosh coordinate; its coupled and mass-plus-pressure results coincide."}
        </p>
      </div>
    );
  }
  const matched = CASES.map((c) => ({
    ...c,
    mode: findMode(solution, c.id, selection),
  }));
  const dry = matched[0].mode?.frequency ?? 0,
    max = Math.max(1, ...matched.map((c) => c.mode?.frequency ?? 0));
  return (
    <div className="cryo-plot-card">
      <div className="cryo-plot-title">
        <h3>One tracked branch. Five ways to solve it.</h3>
        <span>FREQUENCY / Hz</span>
      </div>
      <div className="cryo-comparison">
        {matched.map((c) => (
          <button
            key={c.id}
            onClick={() => onCase(c.id)}
            aria-pressed={caseId === c.id}
            className={caseId === c.id ? "active" : ""}
          >
            <span className="cryo-case-text">
              <b>{c.label}</b>
              <small>
                {c.id === "coupled" && selection.n >= 4
                  ? "No retained slosh shape at this n; same solve as mass + pressure"
                  : c.copy}
                {c.mode?.trackingAmbiguous
                  ? " · uncertain continuation"
                  : c.mode && c.mode.match < 0.8
                    ? " · evolved from dry shape"
                    : ""}
              </small>
            </span>
            <span className="cryo-bar-track">
              <i
                style={{
                  width: `${((c.mode?.frequency ?? 0) / max) * 100}%`,
                  background: c.color,
                }}
              />
            </span>
            <strong style={{ color: c.color }}>
              {c.mode ? fmt(c.mode.frequency) : "—"} <small>Hz</small>
            </strong>
            <span className="cryo-case-delta">
              {c.id === "dry"
                ? "reference"
                : dry > 0 && c.mode
                  ? `${c.mode.frequency >= dry ? "+" : ""}${fmt((c.mode.frequency / dry - 1) * 100)}%`
                  : "—"}
            </span>
          </button>
        ))}
      </div>
      <p className="cryo-plot-caption">
        Branches are anchored to the dry shell and followed through fill using
        overlap between successive eigenvectors. Dry-shape overlap measures how
        much the shape has changed; it does not select a different mode at each
        fill. Selecting a comparison updates the 3D mode. The condensed-fluid
        cases represent the high-frequency limit of the same liquid model used
        in the full solve.
        {selection.n >= 4 &&
          " This higher angular family uses a rigid surface at partial fill, so adding the seven lower-order slosh coordinates does not change its result."}
      </p>
    </div>
  );
}
