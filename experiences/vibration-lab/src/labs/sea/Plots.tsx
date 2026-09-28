import { EngineeringPlot } from "@engine/Plot";
import {
  SUBSYSTEMS,
  balance,
  energyPerMode,
  bandLimits,
  type Model,
  type EnergyVector,
} from "./physics";
import type { EnergyPoint } from "./simulation";
export type Panel = "Energy" | "Power balance" | "Modal population";
export type Metric = "Total energy" | "Energy per mode";
export const energyText = (e: number) =>
  e >= 1 ? `${e.toFixed(2)} J` : `${(e * 1000).toFixed(e < 0.001 ? 3 : 2)} mJ`;
export const powerText = (p: number) =>
  `${Math.abs(p) < 0.00005 ? "0.000" : p.toFixed(3)} W`;
export const frequencyText = (f: number) =>
  f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`;
const path = (points: [number, number][]) =>
  points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
export function EnergyPlot({
  model,
  energy,
  history,
  metric,
}: {
  model: Model;
  energy: EnergyVector;
  history: EnergyPoint[];
  metric: Metric;
}) {
  const value = (e: number, i: number) =>
    metric === "Total energy"
      ? e
      : energyPerMode(e, model.n[i], model.bandwidth);
  const max = Math.max(
    1e-8,
    ...history.flatMap((h) => h.energy.map(value)),
    ...model.steady.map(value),
  );
  const end = Math.max(0.001, history[history.length - 1]?.t ?? 0),
    start = history[0]?.t ?? 0,
    span = Math.max(0.001, end - start);
  return (
    <div className="sea-energy-plot">
      <div className="sea-chart-copy">
        <span>
          {history.length > 1
            ? "ENERGY BUILDUP / PHYSICAL TIME"
            : "ENERGY COMPARISON / FROZEN STATE"}
        </span>
        <p>
          {metric === "Total energy"
            ? "Band-averaged stored energy"
            : "Band energy ÷ expected modes in the band"}
        </p>
        <div className="sea-keys">
          {SUBSYSTEMS.map((p, i) => (
            <span key={i} style={{ color: p.color }}>
              <i />
              {i + 1} · {p.short}{" "}
              <b>
                {energyText(value(energy[i], i))}
                {metric === "Energy per mode" ? " / mode" : ""}
              </b>
            </span>
          ))}
        </div>
      </div>
      {history.length <= 1 ? (
        <EngineeringPlot
          viewBox="0 0 650 174"
          role="img"
          aria-label={`${metric} comparison by subsystem`}
        >
          {SUBSYSTEMS.map((p, i) => {
            const h = (110 * value(energy[i], i)) / max;
            return (
              <g key={i}>
                <rect
                  x={50 + i * 83}
                  y={138 - h}
                  width={46}
                  height={h}
                  rx={2}
                  fill={p.color}
                  opacity={0.8}
                />
                <text x={73 + i * 83} y={128 - h} textAnchor="middle">
                  {energyText(value(energy[i], i))}
                  {metric === "Energy per mode" ? "/mode" : ""}
                </text>
                <text x={73 + i * 83} y={160} textAnchor="middle">
                  {i + 1}
                </text>
              </g>
            );
          })}
        </EngineeringPlot>
      ) : (
        <EngineeringPlot
          viewBox="0 0 650 174"
          role="img"
          aria-label={`${metric} versus physical time for the seven subsystems. Dashed lines are steady-state targets.`}
        >
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line
                x1={48}
                x2={627}
                y1={140 - v * 114}
                y2={140 - v * 114}
                stroke="#b8d4d521"
              />
              <text x={40} y={144 - v * 114} textAnchor="end">
                {(v * max * 1000).toFixed(max < 0.003 ? 2 : 1)}
              </text>
            </g>
          ))}
          {SUBSYSTEMS.map((p, i) => (
            <g key={i}>
              <line
                x1={48}
                x2={627}
                y1={140 - (114 * value(model.steady[i], i)) / max}
                y2={140 - (114 * value(model.steady[i], i)) / max}
                stroke={p.color}
                strokeDasharray="3 5"
                opacity={0.3}
              />
              <path
                d={path(
                  history.map((h) => [
                    48 + (579 * (h.t - start)) / span,
                    140 - (114 * value(h.energy[i], i)) / max,
                  ]),
                )}
                fill="none"
                stroke={p.color}
                strokeWidth={2}
              />
              <circle
                cx={627}
                cy={140 - (114 * value(energy[i], i)) / max}
                r={3}
                fill={p.color}
              />
            </g>
          ))}
          <text x={10} y={14}>
            {metric === "Total energy" ? "mJ" : "mJ/mode"}
          </text>
          {[0, 0.5, 1].map((v) => (
            <text key={v} x={48 + 579 * v} y={165} textAnchor="middle">
              {((start + span * v) * 1000).toFixed(0)}
            </text>
          ))}
          <text x={647} y={165} textAnchor="end">
            ms
          </text>
        </EngineeringPlot>
      )}
    </div>
  );
}
export function PowerBalance({
  model,
  energy,
  selected,
}: {
  model: Model;
  energy: EnergyVector;
  selected: number;
}) {
  const b = balance(model, energy),
    source = model.power[selected],
    incoming = b.incoming[selected],
    outgoing = b.outgoing[selected],
    diss = b.dissipation[selected],
    rate = b.rate[selected];
  const scale = Math.max(
    0.001,
    source + incoming,
    diss + outgoing,
    Math.abs(rate),
  );
  const values = [
    ["External input", source, "#e7bd86"],
    ["Net received", incoming, "#a9d9c4"],
    ["Internal dissipation", diss, SUBSYSTEMS[selected].color],
    ["Net sent onward", outgoing, "#e7bd86"],
    [
      rate >= 0 ? "Energy accumulating" : "Energy releasing",
      Math.abs(rate),
      "#d8e2de",
    ],
  ] as const;
  return (
    <div className="sea-balance-panel">
      <div className="sea-chart-copy">
        <span>SUBSYSTEM {selected + 1} / POWER ACCOUNTING</span>
        <p>Input + received = dissipated + sent + storage rate.</p>
        <strong>
          {powerText(source + incoming)} <em>=</em>{" "}
          {powerText(diss + outgoing + rate)}
        </strong>
        <small>
          {Math.abs(rate) < 0.001
            ? "Steady balance · storage rate ≈ 0"
            : "Transient · dE/dt is part of the balance"}
        </small>
      </div>
      <div className="sea-power-bars">
        {values.map(([label, v, c]) => (
          <div key={label}>
            <span>{label}</span>
            <div>
              <i style={{ width: `${(v / scale) * 100}%`, background: c }} />
            </div>
            <b>{powerText(v)}</b>
          </div>
        ))}
        <p>
          Interface powers are signed net exchanges; coupling cancels in the
          global balance.
        </p>
      </div>
    </div>
  );
}
export function ModalPopulation({
  model,
  selected,
  energy,
}: {
  model: Model;
  selected: number;
  energy: EnergyVector;
}) {
  const n = model.n[selected],
    N = model.count[selected],
    M = model.overlap[selected],
    count = Math.min(180, Math.round(N)),
    [low, high] = bandLimits(model.settings.frequency);
  const bandwidthFraction = Math.min(
    0.2,
    (model.matrix[selected][selected] * model.settings.frequency) /
      model.bandwidth,
  );
  return (
    <div className="sea-modes-panel">
      <div className="sea-chart-copy">
        <span>SUBSYSTEM {selected + 1} / A POPULATION OF MODES</span>
        <p>
          <b>{N.toFixed(1)}</b> expected modes in this band ·{" "}
          <b>{n.toFixed(3)}</b> modes/Hz.
        </p>
        <small>
          Modal overlap M ≈ n f ηtotal = {M.toFixed(2)}.{" "}
          {N < 5
            ? "Few modes: the statistical estimate is fragile."
            : M < 1
              ? "Resonances are still distinguishable."
              : "Overlapping resonances favor statistical averaging."}
        </small>
      </div>
      <div className="sea-modal-spectrum">
        <EngineeringPlot
          viewBox="0 0 650 120"
          role="img"
          aria-label={`${N.toFixed(1)} expected modes in the band, modal density ${n.toFixed(3)} modes per hertz, overlap ${M.toFixed(2)}. Representative resonance markers, not computed eigenfrequencies.`}
        >
          {Array.from({ length: count }, (_, i) => {
            const x =
              25 +
              (600 * (i + 0.5 + 0.2 * Math.sin(i * 2.4))) / Math.max(1, count);
            const h = 24 + 28 * (0.5 + 0.5 * Math.sin(i * 4.1 + selected));
            return (
              <g key={i}>
                <path
                  d={`M${x - (600 * bandwidthFraction) / 2},87 Q${x},${87 - 2 * h} ${x + (600 * bandwidthFraction) / 2},87`}
                  fill="none"
                  stroke={SUBSYSTEMS[selected].color}
                  opacity={0.15}
                />
                <line
                  x1={x}
                  x2={x}
                  y1={87}
                  y2={87 - h}
                  stroke={SUBSYSTEMS[selected].color}
                  opacity={0.65}
                />
              </g>
            );
          })}
          <line x1={25} x2={625} y1={88} y2={88} stroke="#acc4cf44" />
          <text x={25} y={110}>
            {low.toFixed(1)} Hz
          </text>
          <text x={625} y={110} textAnchor="end">
            {high.toFixed(1)} Hz
          </text>
        </EngineeringPlot>
        <div className="sea-mode-foot">
          <span>E/n = {((energy[selected] / n) * 1000).toFixed(2)} mJ·Hz</span>
          <span>
            E/(nΔf) ={" "}
            {energyText(energyPerMode(energy[selected], n, model.bandwidth))}
            /mode
          </span>
        </div>
        <small>
          Illustrative spacing; {N > 180 ? "180 markers shown. " : ""}density
          follows the selected shell, plate or acoustic model. Markers are not
          individual solved modes.
        </small>
      </div>
    </div>
  );
}
