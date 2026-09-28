import { SUBSYSTEMS, balance, type Model, type EnergyVector } from "./physics";
import { powerText } from "./Plots";
const POS = [
  [85, 270],
  [85, 225],
  [85, 180],
  [85, 135],
  [35, 82],
  [135, 82],
  [85, 26],
];
export function Network({
  model,
  energy,
  selected,
  onSelect,
}: {
  model: Model;
  energy: EnergyVector;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const b = balance(model, energy),
    max = Math.max(1e-9, ...energy, ...model.steady);
  return (
    <div className="sea-network">
      <span>7 ENERGY STATES · 8 PATHS</span>
      <svg
        viewBox="0 0 180 305"
        role="group"
        aria-label="Falcon 9 SEA connectivity, six shells and one acoustic cavity"
      >
        <defs>
          <marker
            id="sea-net-arrow"
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L6,3 L0,6" fill="#e7bd86" />
          </marker>
        </defs>
        {model.edges.map((edge, i) => {
          const p = b.flows[i],
            a = POS[p >= 0 ? edge.a : edge.b],
            z = POS[p >= 0 ? edge.b : edge.a];
          const dx = z[0] - a[0],
            dy = z[1] - a[1],
            l = Math.hypot(dx, dy);
          return (
            <line
              key={i}
              x1={a[0] + (dx / l) * 9}
              y1={a[1] + (dy / l) * 9}
              x2={z[0] - (dx / l) * 10}
              y2={z[1] - (dy / l) * 10}
              stroke={edge.kind === "acoustic" ? "#ed99be" : "#e7bd86"}
              strokeWidth={
                0.6 +
                2 *
                  Math.sqrt(
                    Math.abs(p) /
                      Math.max(0.001, model.settings.power, Math.abs(p)),
                  )
              }
              opacity={Math.abs(p) > 1e-8 ? 0.85 : 0.16}
              strokeDasharray={edge.kind === "acoustic" ? "3 3" : undefined}
              markerEnd={Math.abs(p) > 1e-8 ? "url(#sea-net-arrow)" : undefined}
            >
              <title>
                {edge.name}: {powerText(p)} (positive {edge.a + 1} →{" "}
                {edge.b + 1})
              </title>
            </line>
          );
        })}
        {SUBSYSTEMS.map((s, i) => (
          <g
            key={s.id}
            role="button"
            tabIndex={0}
            aria-label={`Inspect ${s.name}`}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(i);
              }
            }}
            className="sea-net-node"
          >
            <circle
              cx={POS[i][0]}
              cy={POS[i][1]}
              r={selected === i ? 9 : 7}
              fill={s.color}
              fillOpacity={0.2 + 0.8 * Math.sqrt(energy[i] / max)}
              stroke={s.color}
              strokeWidth={selected === i ? 2 : 1}
            />
            <text
              x={POS[i][0]}
              y={POS[i][1] + 21}
              textAnchor="middle"
              fill={s.color}
            >
              {i + 1} · {s.short}
            </text>
          </g>
        ))}
      </svg>
      <small>
        Arrows show net power
        <br />
        Dashed paths couple to air
      </small>
    </div>
  );
}
