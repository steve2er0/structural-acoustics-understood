import { memo, useEffect, useMemo, useState } from "react";
import { EngineeringPlot, logScale } from "@engine/Plot";
import {
  FREQUENCY_RANGE,
  G,
  SENSOR,
  USABLE_BAND,
  magnitude,
  phaseDegrees,
  sample,
  sensorTransferFunction,
  sweepFrequency,
  type Solution,
} from "./physics";
import { frequency, voltage } from "./format";
const line = (values: readonly [number, number][]) =>
  values
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
function usePlotWidth() {
  const [small, setSmall] = useState(
    () => window.matchMedia("(max-width:700px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width:700px)");
    const update = () => setSmall(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return small ? 480 : 1080;
}
function Waves({
  solution,
  phase,
  actualFrequency,
}: {
  solution: Solution;
  phase: number;
  actualFrequency: number;
}) {
  const width = usePlotWidth(),
    span = width - 110;
  const p = useMemo(() => {
    const aMax = Math.max(solution.acceleration / G, 0.1),
      vMax = Math.max(
        solution.acceleration * SENSOR.sensitivity,
        solution.voltagePeak,
        0.01,
      );
    const points = Array.from({ length: 501 }, (_, i) => {
      const phase = (i / 500) * 4 * Math.PI;
      return { x: 55 + (i / 500) * span, ...sample(solution, phase) };
    });
    return {
      aMax,
      vMax,
      a: line(points.map((v) => [v.x, 53 - (v.acceleration / G / aMax) * 27])),
      v: line(points.map((v) => [v.x, 132 - (v.voltage / vMax) * 27])),
    };
  }, [solution, span]);
  const cursor = 55 + ((phase / (4 * Math.PI)) % 1) * span;
  const ms = (2 / actualFrequency) * 1000;
  return (
    <div className="ac-wave-panel">
      <div className="ac-plot-heading">
        <span>
          <i className="ac-dot green" /> INPUT ACCELERATION{" "}
          <b>{(solution.acceleration / G).toFixed(1)} g peak</b>
        </span>
        <span>
          <i className="ac-dot amber" /> OUTPUT VOLTAGE{" "}
          <b>{voltage(solution.voltagePeak, false)} peak</b>
        </span>
      </div>
      <EngineeringPlot
        viewBox={`0 0 ${width} 196`}
        preserveAspectRatio={width === 1080 ? "none" : "xMidYMid meet"}
        role="img"
        aria-label={`Synchronized acceleration and voltage waveforms at ${frequency(actualFrequency)}. ${voltage(solution.voltagePeak, false)} peak output.`}
      >
        {[0, 0.5, 1, 1.5, 2].map((n, i) => (
          <g key={n}>
            <line
              x1={55 + (i * span) / 4}
              x2={55 + (i * span) / 4}
              y1={20}
              y2={164}
              stroke="#89a7a319"
            />
            <text x={55 + (i * span) / 4} y={186} textAnchor="middle">
              {((ms * i) / 4).toFixed(ms < 1 ? 3 : ms < 10 ? 2 : 0)}
            </text>
          </g>
        ))}
        {[53, 132].map((y) => (
          <line
            key={y}
            x1={55}
            x2={width - 55}
            y1={y}
            y2={y}
            stroke="#bed8d132"
          />
        ))}
        <text x="9" y="30">
          {p.aMax.toFixed(1)}
        </text>
        <text x="9" y="82">
          −{p.aMax.toFixed(1)}
        </text>
        <text x="12" y="58">
          g
        </text>
        <text x="9" y="109">
          {p.vMax.toFixed(2)}
        </text>
        <text x="9" y="161">
          −{p.vMax.toFixed(2)}
        </text>
        <text x="12" y="136">
          V
        </text>
        <path d={p.a} fill="none" stroke="#b5ded0" strokeWidth="2" />
        <path d={p.v} fill="none" stroke="#e7bb82" strokeWidth="2" />
        <line
          x1={cursor}
          x2={cursor}
          y1={20}
          y2={164}
          stroke="#d9e5d798"
          strokeDasharray="3 4"
        />
        <text x={width - 6} y="186" textAnchor="end">
          ms
        </text>
      </EngineeringPlot>
      <div className="ac-plot-foot">
        <span>Actual time axis · two cycles · shared phase cursor</span>
        <span>
          Phase {solution.phase.toFixed(1)}° · {solution.gain.toFixed(3)}×
          nominal
        </span>
      </div>
    </div>
  );
}
const y = logScale(0.01, 10, 123, 30);
const responseCurve = Array.from({ length: 800 }, (_, i) => {
  const f = sweepFrequency(i / 799),
    h = sensorTransferFunction(f);
  return { f, gain: magnitude(h), phase: phaseDegrees(h) };
});
function Response({
  solution,
  actualFrequency,
  onFrequency,
}: {
  solution: Solution;
  actualFrequency: number;
  onFrequency: (f: number) => void;
}) {
  const width = usePlotWidth(),
    x = useMemo(() => logScale(...FREQUENCY_RANGE, 55, width - 55), [width]);
  const gainPath = useMemo(
    () => line(responseCurve.map((p) => [x(p.f), y(p.gain)])),
    [x],
  );
  const phasePath = useMemo(
    () => line(responseCurve.map((p) => [x(p.f), 154 - (p.phase / 180) * 23])),
    [x],
  );
  return (
    <div className="ac-response-panel">
      <div className="ac-plot-heading">
        <span>
          NORMALIZED SENSITIVITY <b>|V / (S a)|</b>
        </span>
        <span>
          {solution.gain.toFixed(3)}×{" "}
          <b>{((solution.gain - 1) * 100).toFixed(1)}% amplitude error</b>
        </span>
      </div>
      <EngineeringPlot
        viewBox={`0 0 ${width} 212`}
        preserveAspectRatio={width === 1080 ? "none" : "xMidYMid meet"}
        role="img"
        aria-label="Sensor frequency response with electrical rolloff, flat usable band, internal resonance and phase. Click to select frequency."
        domain={FREQUENCY_RANGE}
        plotLeft={55}
        plotWidth={width - 110}
        onSelect={onFrequency}
      >
        <rect
          x={x(USABLE_BAND[0])}
          y={27}
          width={x(USABLE_BAND[1]) - x(USABLE_BAND[0])}
          height={155}
          fill="#b5ded00a"
        />
        {[0.01, 0.1, 1, 10].map((n) => (
          <g key={n}>
            <line
              x1={55}
              x2={width - 55}
              y1={y(n)}
              y2={y(n)}
              stroke={n === 1 ? "#b7dfc855" : "#89a7a31d"}
              strokeDasharray={n === 1 ? "4 5" : undefined}
            />
            <text x="37" y={y(n) + 3} textAnchor="end">
              {n}×
            </text>
          </g>
        ))}
        {[0.1, 1, 10, 100, 1000, 10000].map((f) => (
          <g key={f}>
            <line x1={x(f)} x2={x(f)} y1="27" y2="182" stroke="#89a7a31d" />
            <text x={x(f)} y="202" textAnchor="middle">
              {f >= 1000 ? `${f / 1000}k` : f}
            </text>
          </g>
        ))}
        <text x="65" y="13">
          {width === 1080 ? "ELECTRICAL ROLLOFF" : "LF ROLLOFF"}
        </text>
        <text x={x(80)} y="13" textAnchor="middle">
          {width === 1080 ? "±5% AMPLITUDE BAND" : "±5% BAND"}
        </text>
        <text x={width - 30} y="13" textAnchor="end">
          {width === 1080 ? "INTERNAL RESONANCE" : "RESONANCE"}
        </text>
        <path d={gainPath} fill="none" stroke="#b5ded0" strokeWidth="2" />
        <path
          d={phasePath}
          fill="none"
          stroke="#a7c6d6"
          strokeWidth="1.5"
          opacity=".8"
        />
        <text x="8" y="150">
          0°
        </text>
        <text x="3" y="178">
          −180°
        </text>
        <text x="62" y="147">
          PHASE
        </text>
        <line
          x1={x(actualFrequency)}
          x2={x(actualFrequency)}
          y1="25"
          y2="183"
          stroke="#e7bb82"
          strokeDasharray="3 4"
        />
        <circle
          cx={x(actualFrequency)}
          cy={y(solution.gain)}
          r="4"
          fill="#e7bb82"
        />
        <text x={width - 6} y="202" textAnchor="end">
          Hz
        </text>
      </EngineeringPlot>
      <div className="ac-plot-foot">
        <span>
          Calculated from the mechanical SDOF × electrical high-pass model
        </span>
        <span>Click the curve to change physical frequency</span>
      </div>
    </div>
  );
}
export const Waveforms = memo(Waves);
export const FrequencyResponse = memo(Response);
