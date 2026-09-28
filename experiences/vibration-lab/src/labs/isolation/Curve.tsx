import { EngineeringPlot } from "@engine/Plot";
import { useId } from "react";
import {
  naturalFrequency,
  transmissibility,
  type Parameters,
  type Solution,
} from "./physics";
import { frequencyPosition, positionFrequency } from "./visualization";

const W = 520,
  H = 172,
  L = 37,
  R = 16,
  TOP = 16,
  BOTTOM = 27;
const x = (f: number) => L + frequencyPosition(f) * (W - L - R);
const y = (t: number) =>
  TOP +
  ((Math.log10(70) - Math.log10(Math.max(0.0001, t))) / (Math.log10(70) + 4)) *
    (H - TOP - BOTTOM);
function line(p: Parameters, damping = p.zeta) {
  const fn = naturalFrequency(p.mass, p.stiffness);
  // Include the exact natural frequency so very lightly damped peaks cannot disappear between samples.
  const frequencies = [
    ...Array.from({ length: 321 }, (_, i) => positionFrequency(i / 320)),
    fn,
  ].sort((a, b) => a - b);
  return frequencies
    .map(
      (f, i) =>
        `${i ? "L" : "M"}${x(f).toFixed(2)},${y(transmissibility(f / fn, damping)).toFixed(2)}`,
    )
    .join(" ");
}
export default function Curve({
  parameters,
  solution,
  compare,
  onChange,
}: {
  parameters: Parameters;
  solution: Solution;
  compare: boolean;
  onChange: (frequency: number) => void;
}) {
  const id = useId().replace(/:/g, "");
  const path = line(parameters);
  const px = x(parameters.frequency),
    py = y(solution.T);
  return (
    <EngineeringPlot
      className="curve-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Transmissibility curve. Current frequency ${parameters.frequency.toFixed(1)} hertz, ratio ${solution.T.toPrecision(4)}. Isolation begins at ${solution.isolationThreshold.toFixed(1)} hertz.`}
      domain={[1, 600]}
      plotLeft={L}
      plotWidth={W - L - R}
      onSelect={onChange}
    >
      <defs>
        <linearGradient id={`curve-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".24" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`plot-${id}`}>
          <rect
            x={L}
            y={TOP - 1}
            width={W - L - R}
            height={H - TOP - BOTTOM + 2}
          />
        </clipPath>
      </defs>
      <rect
        x={x(solution.fn * 0.7)}
        y={TOP}
        width={x(solution.isolationThreshold) - x(solution.fn * 0.7)}
        height={H - TOP - BOTTOM}
        fill="#efb47b"
        opacity=".04"
      />
      {[0.0001, 0.001, 0.01, 0.1, 1, 10].map((t) => (
        <g key={t}>
          <line
            x1={L}
            y1={y(t)}
            x2={W - R}
            y2={y(t)}
            stroke="#96b0ad"
            strokeOpacity={t === 1 ? 0.25 : 0.09}
            strokeDasharray={t === 1 ? "3 4" : undefined}
          />
          <text x={L - 9} y={y(t) + 3} textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      {[1, 5, 10, 25, 100, 600].map((f) => (
        <g key={f}>
          <line
            x1={x(f)}
            y1={H - BOTTOM}
            x2={x(f)}
            y2={H - BOTTOM + 4}
            stroke="#56706d"
          />
          <text x={x(f)} y={H - 8} textAnchor="middle">
            {f}
          </text>
        </g>
      ))}
      <text x={L} y={9} className="axis-title">
        X/Y
      </text>
      <text x={W - 2} y={H - 8} textAnchor="end" className="axis-title">
        Hz
      </text>
      <g clipPath={`url(#plot-${id})`}>
        <path
          d={`${path} L${W - R},${H - BOTTOM} L${L},${H - BOTTOM} Z`}
          fill={`url(#curve-fill-${id})`}
        />
        <line
          x1={x(solution.fn)}
          x2={x(solution.fn)}
          y1={TOP}
          y2={H - BOTTOM}
          stroke="#efb47b"
          strokeOpacity=".35"
          strokeDasharray="2 4"
        />
        <line
          x1={x(solution.isolationThreshold)}
          x2={x(solution.isolationThreshold)}
          y1={TOP}
          y2={H - BOTTOM}
          stroke="#a9edc8"
          strokeOpacity=".25"
          strokeDasharray="2 4"
        />
        {compare && (
          <path
            d={line(parameters, 0.4)}
            fill="none"
            stroke="#ccb4eb"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity=".75"
          />
        )}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
        <line
          x1={px}
          x2={px}
          y1={py}
          y2={H - BOTTOM}
          stroke="var(--accent)"
          strokeOpacity=".4"
        />
        <circle cx={px} cy={py} r={8} fill="var(--accent)" opacity=".13" />
        <circle
          cx={px}
          cy={py}
          r={3.5}
          fill="var(--accent)"
          stroke="#162021"
          strokeWidth="2"
        />
      </g>
      <text
        x={x(solution.fn) - 5}
        y={TOP + 8}
        textAnchor="end"
        className="fn-label"
      >
        fₙ
      </text>
      <text
        x={x(solution.isolationThreshold) + 5}
        y={TOP + 8}
        className="threshold-label"
      >
        √2 fₙ
      </text>
    </EngineeringPlot>
  );
}
