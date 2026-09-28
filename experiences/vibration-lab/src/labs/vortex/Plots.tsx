import { EngineeringPlot } from "@engine/Plot";
import {
  solve,
  longitudinalPath,
  sourceY,
  pathLength,
  pairVisibility,
  TAIL,
  type Model,
} from "./physics";
import type { Clock } from "./simulation";
const COLORS = ["#efae79", "#72daca"];
export function CrossflowMap({
  model,
  clock,
  selected,
  onSelect,
}: {
  model: Model;
  clock: Clock;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const scale = 10,
    origin = [124, 105];
  return (
    <svg
      viewBox="0 0 248 226"
      role="img"
      aria-label="Midbody cross-section looking aft: paired longitudinal vortices, with axial flow into the page"
    >
      <defs>
        <marker
          id="vx-cross-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0 0L10 5L0 10" fill="#8fbfef" />
        </marker>
      </defs>
      {[24, 64, 104, 144, 184, 224].map((x) => (
        <path
          key={x}
          d={`M${x} 28V195 M12 ${x}H236`}
          stroke="#638597"
          strokeOpacity=".12"
        />
      ))}
      {model.bodies.flatMap((body) =>
        [0, 1].map((side) => {
          const p = longitudinalPath(model, body, side, sourceY(body));
          const x = origin[0] + p[0] * scale,
            y = origin[1] + p[2] * scale;
          const r = body.diameter * 0.105 * scale;
          const theta =
            ((side ? -1 : 1) * 2 * Math.PI * clock.travel) /
            (body.diameter * 3.2);
          return (
            <g
              key={`${body.index}-${side}`}
              opacity={
                pairVisibility(model) * (selected === body.index ? 1 : 0.5)
              }
            >
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={COLORS[side]}
                fillOpacity=".10"
                stroke={COLORS[side]}
              />
              <circle
                cx={x + r * Math.cos(theta)}
                cy={y + r * Math.sin(theta)}
                r="2"
                fill={COLORS[side]}
              />
            </g>
          );
        }),
      )}
      {model.bodies.map((body) => (
        <g
          key={body.index}
          className="vx-map-body"
          role="button"
          tabIndex={0}
          aria-label={`Inspect ${body.name}`}
          onClick={() => onSelect(body.index)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(body.index);
            }
          }}
        >
          <circle
            cx={origin[0] + body.x * scale}
            cy={origin[1]}
            r={(body.diameter * scale) / 2}
            fill="#273f4a"
            stroke={body.color}
            strokeWidth={selected === body.index ? 2.5 : 1}
          />
          <text
            x={origin[0] + body.x * scale}
            y={origin[1] + 3}
            textAnchor="middle"
            fill={body.color}
            fontSize="8"
          >
            {body.index === 0 ? "C" : body.index === 1 ? "P" : "S"}
          </text>
        </g>
      ))}
      {model.crossSpeed > 0 && (
        <line
          x1={origin[0] - model.normal[0] * 76}
          y1={origin[1] - model.normal[1] * 76}
          x2={origin[0] - model.normal[0] * 48}
          y2={origin[1] - model.normal[1] * 48}
          stroke="#8fbfef"
          strokeWidth="1.4"
          markerEnd="url(#vx-cross-arrow)"
        />
      )}
      <text x="12" y="18" fill="#a1b6c3" fontSize="8">
        MIDBODY / LOOKING AFT
      </text>
      <text x="12" y="207" fill="#80baee" fontSize="8">
        ⊗ AXIAL AIR INTO PAGE · {model.axialSpeed.toFixed(1)} m/s
      </text>
      <text x="12" y="220" fill="#7694a4" fontSize="7">
        ARROW = CROSSFLOW COMPONENT ONLY
      </text>
    </svg>
  );
}
export function FrequencyPlot({ model }: { model: Model }) {
  const end = solve({ ...model.settings, mach: 2 });
  const max = Math.max(1, ...end.bodies.map((b) => b.frequency)) * 1.1;
  const y = (f: number) => 156 - (120 * f) / max;
  return (
    <EngineeringPlot
      viewBox="0 0 620 202"
      role="img"
      aria-label="Crossflow reference frequency versus Mach at the current angles and Strouhal number"
    >
      <rect
        x="127"
        y="25"
        width="439"
        height="131"
        fill="#e0b183"
        opacity=".055"
      />
      <text x="142" y="38" fill="#d0ab86" fontSize="9">
        COMPRESSIBLE EXTRAPOLATION · FIXED St
      </text>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1="50"
            x2="566"
            y1={y(f * max)}
            y2={y(f * max)}
            stroke="#54717c"
            strokeOpacity=".3"
          />
          <text x="40" y={y(f * max) + 3} textAnchor="end">
            {(f * max).toFixed(1)}
          </text>
        </g>
      ))}
      {[0, 0.5, 1, 1.5, 2].map((m) => (
        <text key={m} x={50 + m * 258} y="177" textAnchor="middle">
          {m.toFixed(1)}
        </text>
      ))}
      {end.bodies.slice(0, 2).map((body) => (
        <path
          key={body.index}
          d={`M50 156L566 ${y(body.frequency)}`}
          stroke={body.color}
          strokeWidth="2"
          fill="none"
          strokeDasharray={body.index ? "5 4" : undefined}
        />
      ))}
      <line
        x1={50 + model.settings.mach * 258}
        x2={50 + model.settings.mach * 258}
        y1="26"
        y2="156"
        stroke="#8fbaab"
        strokeDasharray="3 3"
      />
      {model.bodies.slice(0, 2).map((body) => (
        <circle
          key={body.index}
          cx={50 + model.settings.mach * 258}
          cy={y(body.frequency)}
          r="4"
          fill={body.color}
        />
      ))}
      <text x="50" y="15">
        St U⊥/D / Hz
      </text>
      <text x="566" y="198" textAnchor="end">
        FREESTREAM MACH
      </text>
    </EngineeringPlot>
  );
}
export function ConvectionPlot({
  model,
  clock,
  selected,
}: {
  model: Model;
  clock: Clock;
  selected: number;
}) {
  const body =
    model.bodies.find((b) => b.index === selected) ?? model.bodies[0];
  const length = pathLength(body),
    end = sourceY(body) - TAIL;
  const x = (s: number) => 50 + (516 * s) / length;
  return (
    <EngineeringPlot
      viewBox="0 0 620 202"
      role="img"
      aria-label="Longitudinal vortex paths from the forebody shoulder to the aft wake; dots track downstream convection"
    >
      <rect
        x="50"
        y="84"
        width={x(end) - 50}
        height="26"
        rx="5"
        fill="#667e8430"
        stroke="#8fa6ac60"
      />
      <text x="60" y="101">
        {body.name.toUpperCase()}
      </text>
      {[0, 1].map((side) => {
        const points = Array.from({ length: 101 }, (_, i) => {
          const s = (length * i) / 100,
            p = longitudinalPath(model, body, side, s);
          const transverse =
            (p[0] - body.x) * model.tangent[0] + p[2] * model.tangent[1];
          return `${i ? "L" : "M"}${x(s)},${97 + transverse * 11}`;
        }).join(" ");
        return (
          <g key={side} opacity={pairVisibility(model)}>
            <path
              d={points}
              fill="none"
              stroke={COLORS[side]}
              strokeWidth="2"
            />
            {[0, 1, 2, 3, 4].map((i) => {
              const s = (clock.travel + (i * length) / 5) % length;
              const p = longitudinalPath(model, body, side, s);
              const transverse =
                (p[0] - body.x) * model.tangent[0] + p[2] * model.tangent[1];
              return (
                <circle
                  key={i}
                  cx={x(s)}
                  cy={97 + transverse * 11}
                  r="3"
                  fill={COLORS[side]}
                />
              );
            })}
          </g>
        );
      })}
      <path d="M50 32H550l-9 -4m9 4l-9 4" stroke="#80baee" fill="none" />
      <text x="50" y="15">
        NOSE → AFT · CONVECTION = 0.65 Uaxial
      </text>
      <line
        x1={x(end)}
        x2={x(end)}
        y1="47"
        y2="151"
        stroke="#8fa6ac60"
        strokeDasharray="3 3"
      />
      <text x="50" y="172">
        SHOULDER
      </text>
      <text x={x(end)} y="172" textAnchor="middle">
        TAIL
      </text>
      <text x="566" y="172" textAnchor="end">
        WAKE
      </text>
      <text x="566" y="198" textAnchor="end">
        PRESCRIBED PATHS · NOT LOADS
      </text>
    </EngineeringPlot>
  );
}
