import { EngineeringPlot } from "@engine/Plot";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  envelope,
  LIMIT_COLORS,
  MACHINE,
  sampleSolution,
  type Parameters,
  type Solution,
} from "../shaker-model/model";
import {
  G,
  magnitude,
  sample,
  type Complex,
} from "../physics/electromechanics";
import { frequencyPosition, type AnimationClock } from "../animation/motion";

export function Envelope({
  solution: s,
  onFrequency,
}: {
  solution: Solution;
  onFrequency: (frequency: number) => void;
}) {
  const data = useMemo(
    () => envelope(s.parameters),
    [s.parameters.fieldPercent, s.parameters.payload],
  );
  const bare = useMemo(
    () => envelope({ ...s.parameters, payload: 0 }),
    [s.parameters.fieldPercent],
  );
  const x = (f: number) => 35 + frequencyPosition(f) * 287;
  const y = (a: number) =>
    133 -
    Math.max(0, Math.min(1, (Math.log10(Math.max(0.01, a / G)) + 2) / 4)) * 118;
  const path = (d: typeof data) =>
    d
      .map((p, i) => `${i ? "L" : "M"}${x(p.frequency)},${y(p.acceleration)}`)
      .join(" ");
  return (
    <div className="context-chart envelope-chart">
      <div className="chart-heading">
        <span>ACCELERATION CAPABILITY</span>
        <span>g · peak</span>
      </div>
      <EngineeringPlot
        viewBox="0 0 338 162"
        role="img"
        aria-label={`Computed capability envelope. ${s.mass.toFixed(1)} kg moving mass. Click a frequency to explore.`}
        domain={[1, 2000]}
        plotLeft={35}
        plotWidth={287}
        onSelect={(f) => onFrequency(Math.round(f * 10) / 10)}
      >
        {[0.01, 0.1, 1, 10, 100].map((a) => (
          <g key={a}>
            <line
              x1="35"
              x2="322"
              y1={y(a * G)}
              y2={y(a * G)}
              className="chart-grid"
            />
            <text x="27" y={y(a * G) + 3} textAnchor="end">
              {a}
            </text>
          </g>
        ))}
        {[1, 10, 100, 1000, 2000].map((f) => (
          <g key={f}>
            <line
              x1={x(f)}
              x2={x(f)}
              y1="15"
              y2="133"
              className="chart-grid vertical"
            />
            <text x={x(f)} y="154" textAnchor="middle">
              {f >= 1000 ? `${f / 1000}k` : f}
            </text>
          </g>
        ))}
        {s.field.B > 0 && (
          <>
            {s.parameters.payload > 0 && (
              <path
                d={path(bare)}
                fill="none"
                stroke="#a2b3b0"
                strokeWidth="1"
                strokeDasharray="3 4"
                opacity=".6"
              />
            )}
            {data.slice(1).map((p, i) => (
              <path
                key={i}
                d={`M${x(data[i].frequency)},${y(data[i].acceleration)} L${x(p.frequency)},${y(p.acceleration)}`}
                fill="none"
                stroke={LIMIT_COLORS[p.limiting]}
                strokeWidth="2.5"
              />
            ))}
            <line
              x1={x(s.parameters.frequency)}
              x2={x(s.parameters.frequency)}
              y1="15"
              y2="133"
              stroke="#dde8dd"
              strokeDasharray="2 3"
              opacity=".6"
            />
            <circle
              cx={x(s.parameters.frequency)}
              cy={y(s.cap.acceleration)}
              r="4"
              fill={LIMIT_COLORS[s.cap.limiting]}
            />
          </>
        )}
        {!s.field.B && (
          <text className="chart-message" x="181" y="78" textAnchor="middle">
            Energize the field to produce force.
          </text>
        )}
      </EngineeringPlot>
      <div className="chart-legend">
        {Object.entries(LIMIT_COLORS).map(([key, color]) => (
          <span key={key}>
            <i style={{ background: color }} />
            {
              {
                stroke: "Stroke",
                velocity: "Velocity",
                current: "Current",
                voltage: "Voltage",
                thermal: "Heating",
              }[key]
            }
          </span>
        ))}
      </div>
      <p className="chart-note">
        {s.parameters.payload > 0 ? "Dashed: bare table. " : ""}Click to set
        frequency. The controlling limit is calculated.
      </p>
    </div>
  );
}
export function Voltage({ solution: s }: { solution: Solution }) {
  const parts = [s.resistanceVoltage, s.inductanceVoltage, s.emf];
  let re = 0,
    im = 0;
  const paths = parts.map((p) => {
    const start = { re, im };
    re += p.re;
    im += p.im;
    return { start, end: { re, im } };
  });
  const max = Math.max(
    120,
    ...paths.flatMap((p) => [
      Math.abs(p.start.im),
      Math.abs(p.end.im),
      p.end.re,
    ]),
  );
  const k = 66 / max,
    point = (p: Complex) => `${42 + p.re * k},${86 - p.im * k}`;
  const colors = ["#d5d6c5", "#b7a3dd", "#8fd9f2"];
  return (
    <div className="context-chart voltage-chart">
      <div className="chart-heading">
        <span>VOLTAGE ADDS WITH PHASE</span>
        <span>{s.voltagePeak.toFixed(1)} / 120 V peak</span>
      </div>
      <div className="phasor-content">
        <svg
          viewBox="0 0 156 167"
          role="img"
          aria-label="Head-to-tail voltage phasors for resistance, inductance, and back EMF"
        >
          <defs>
            {colors.map((c, i) => (
              <marker
                key={c}
                id={`voltage-${i}`}
                markerWidth="5"
                markerHeight="5"
                refX="4"
                refY="2.5"
                orient="auto"
              >
                <path d="M0,0 L5,2.5 L0,5" fill={c} />
              </marker>
            ))}
          </defs>
          <circle
            cx="42"
            cy="86"
            r={120 * k}
            className="chart-grid"
            fill="none"
            strokeDasharray="2 4"
          />
          <line x1="15" x2="140" y1="86" y2="86" className="chart-grid" />
          <line x1="42" x2="42" y1="9" y2="160" className="chart-grid" />
          <path
            d={`M42,86 L${point(s.voltage)}`}
            stroke="#f1f4de"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          {paths.map((p, i) => (
            <path
              key={i}
              d={`M${point(p.start)} L${point(p.end)}`}
              fill="none"
              stroke={colors[i]}
              strokeWidth="2.4"
              markerEnd={`url(#voltage-${i})`}
            />
          ))}
          <circle
            cx={42 + s.voltage.re * k}
            cy={86 - s.voltage.im * k}
            r="3.1"
            fill="#f1f4de"
          />
        </svg>
        <dl className="voltage-values">
          {["Resistance · Ri", "Inductance · Lₑ di/dt", "Back EMF · BLv"].map(
            (name, i) => (
              <div key={name} style={{ color: colors[i] }}>
                <dt>{name}</dt>
                <dd>
                  {magnitude(parts[i]).toFixed(1)}{" "}
                  <small>
                    V {s.parameters.driveMode === "sine" ? "pk" : "DC"}
                  </small>
                </dd>
              </div>
            ),
          )}
        </dl>
      </div>
      <div className="headroom">
        <span
          style={{
            width: `${Math.min(100, (s.voltagePeak / MACHINE.peakVoltage) * 100)}%`,
          }}
        />
      </div>
      <p className="chart-note">
        {Math.max(0, 120 - s.voltagePeak).toFixed(1)} V headroom. Add voltage
        arrows using their relative phase.
      </p>
    </div>
  );
}
export function Waveform({
  solution: s,
  clock,
}: {
  solution: Solution;
  clock: RefObject<AnimationClock>;
}) {
  const cursor = useRef<SVGLineElement>(null);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const x =
        12 + ((clock.current.theta % (Math.PI * 2)) / (Math.PI * 2)) * 314;
      cursor.current?.setAttribute("x1", String(x));
      cursor.current?.setAttribute("x2", String(x));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [clock]);
  const curve = (value: Complex) =>
    Array.from(
      { length: 121 },
      (_, i) =>
        `${i ? "L" : "M"}${12 + (i / 120) * 314},${52 - (sample(value, (i / 120) * Math.PI * 2) / Math.max(1e-14, magnitude(value))) * 34}`,
    ).join(" ");
  return (
    <div className="context-chart waveform">
      <div className="chart-heading">
        <span>ONE CYCLE · PHASE PRESERVED</span>
        <span>normalized</span>
      </div>
      <svg
        viewBox="0 0 338 104"
        aria-label="Drive current and force are in phase. Velocity and displacement follow the mechanical response."
        role="img"
      >
        <line x1="12" x2="326" y1="52" y2="52" className="chart-grid" />
        <path
          d={curve(s.x)}
          fill="none"
          stroke="#bdc7bb"
          strokeWidth="1.3"
          strokeDasharray="3 3"
        />
        <path
          d={curve(s.velocity)}
          fill="none"
          stroke="#ceb9ff"
          strokeWidth="1.8"
        />
        <path
          d={curve({ re: s.current, im: 0 })}
          fill="none"
          stroke="#8fd9f2"
          strokeWidth="2"
        />
        <line
          ref={cursor}
          y1="9"
          y2="96"
          stroke="#edf5e0"
          opacity=".5"
          strokeWidth="1"
        />
      </svg>
      <div className="chart-legend">
        <span>
          <i style={{ background: "#8fd9f2" }} />
          Current{s.field.B > 0 ? " & force" : ""}
        </span>
        <span>
          <i style={{ background: "#ceb9ff" }} />
          Velocity
        </span>
        <span>
          <i style={{ background: "#bdc7bb" }} />
          Displacement
        </span>
      </div>
    </div>
  );
}
export function ForceBalance({
  solution: s,
  clock,
  onView,
}: {
  solution: Solution;
  clock: RefObject<AnimationClock>;
  onView: () => void;
}) {
  const output = useRef<(HTMLOutputElement | null)[]>([]);
  useEffect(() => {
    let id = 0,
      last = 0;
    const tick = (now: number) => {
      if (now - last > 45) {
        last = now;
        const q = sampleSolution(s, clock.current.theta);
        [q.force, q.suspension, q.armatureInertia, q.payloadReaction].forEach(
          (v, i) => {
            if (output.current[i])
              output.current[i]!.textContent =
                `${Math.abs(v) < 0.05 ? "0" : v.toFixed(0)} N`;
          },
        );
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [s, clock]);
  return (
    <div className="force-balance">
      <div className="chart-heading">
        <span>INSTANTANEOUS FORCE BALANCE</span>
        <button onClick={onView} aria-label="View full force balance">
          Full view ↗
        </button>
      </div>
      {[
        ["Electromagnetic", "F = BLi", "#ffc387"],
        ["Suspension", "−kx − cv", "#b5c8b7"],
        ["Armature inertia", "−mₐa", "#dfb4e3"],
        ["Payload reaction", "−mₚa", "#e5d7a7"],
      ].map(([name, equation, color], i) => (
        <div className="force-row" key={name}>
          <i style={{ background: color }} />
          <span>
            {name}
            <small>{equation}</small>
          </span>
          <output
            ref={(n) => {
              output.current[i] = n;
            }}
          >
            0 N
          </output>
        </div>
      ))}
      <p className="chart-note">
        These terms sum to zero. Inertia is a balance term, not another applied
        force. Gravity is removed about the supported equilibrium.
      </p>
    </div>
  );
}
export function Energy({ solution: s }: { solution: Solution }) {
  return (
    <div className="energy-flow">
      <div className="chart-heading">
        <span>AVERAGE POWER · WATTS</span>
      </div>
      <div className="energy-path">
        <span>DC field supply</span>
        <b>{s.field.heat.toFixed(0)} W</b>
        <small>Field winding → heat → cooling</small>
      </div>
      <div className="energy-path blue">
        <span>Power amplifier</span>
        <b>{s.amplifierRealPower.toFixed(0)} W</b>
        <small>Current → force → motion → test article</small>
      </div>
      <div className="energy-losses">
        <span>
          Drive winding <b>{s.copperHeat.toFixed(1)} W</b>
        </span>
        <span>
          Suspension damping <b>{s.mechanicalLoss.toFixed(1)} W</b>
        </span>
      </div>
      <p className="chart-note">
        The rigid payload stores and returns energy. These heat loads require
        cooling; temperatures are not modeled.
      </p>
    </div>
  );
}
export type Update = (patch: Partial<Parameters>) => void;
