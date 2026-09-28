import { useEffect, useId, useMemo, useRef, useState } from "react";
import { EngineeringPlot, plotCoordinates } from "@engine/Plot";
import {
  FS,
  IMPULSE,
  MODES,
  TIPS,
  forceSpectrum,
  magnitude,
  type Measurement,
  type Tip,
} from "./physics";
export type Domain = "Time" | "Spectra" | "FRF";
const W = 560,
  H = 145,
  L = 46,
  R = 544,
  T = 15,
  B = 117;
const x = (f: number) => L + (f / 225) * (R - L);
const db = (v: number) => 20 * Math.log10(Math.max(v, 1e-8));
function path(
  values: ArrayLike<number>,
  toX: (i: number) => number,
  toY: (v: number) => number,
  stride = 1,
) {
  let d = "";
  for (let i = 0; i < values.length; i += stride)
    d += `${i ? "L" : "M"}${toX(i).toFixed(2)},${toY(values[i]).toFixed(2)}`;
  return d;
}
function Grid({
  yLabels = ["0", "−20", "−40"],
  frequency = true,
  right = R,
}: {
  yLabels?: string[];
  frequency?: boolean;
  right?: number;
}) {
  return (
    <>
      {yLabels.map((v, i) => (
        <g key={i}>
          <line
            x1={L}
            x2={right}
            y1={T + (i * (B - T)) / (yLabels.length - 1)}
            y2={T + (i * (B - T)) / (yLabels.length - 1)}
            className="mt-gridline"
          />
          <text
            x={L - 10}
            y={T + (i * (B - T)) / (yLabels.length - 1) + 3}
            textAnchor="end"
          >
            {v}
          </text>
        </g>
      ))}
      {(frequency ? [0, 50, 100, 150, 200] : [0, 150, 300, 450, 600]).map(
        (f, i) => (
          <text
            key={f}
            x={
              frequency
                ? L + (f / 225) * (right - L)
                : L + (i * (right - L)) / 4
            }
            y={138}
            textAnchor="middle"
          >
            {f}
          </text>
        ),
      )}
      <text x={right} y={138} textAnchor="end">
        {frequency ? "Hz" : "ms"}
      </text>
    </>
  );
}
function TimePlots({
  m,
  time,
  playing,
}: {
  m: Measurement;
  time: number;
  playing: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const forceDuration = m.settings.double ? 0.065 : 0.02;
  const peakF = (IMPULSE * Math.PI) / (2 * TIPS[m.settings.tip].duration),
    peakA = Math.max(1, m.peakAcceleration);
  const paths = useMemo(() => {
    // Min/max buckets preserve high-frequency acceleration peaks at display resolution.
    const a: number[] = [];
    const end = Math.floor(0.6 * FS),
      step = Math.ceil(end / 500);
    for (let j = 0; j < end; j += step) {
      let lo = Infinity,
        hi = -Infinity;
      for (let k = j; k < Math.min(end, j + step); k++) {
        lo = Math.min(lo, m.acceleration[k]);
        hi = Math.max(hi, m.acceleration[k]);
      }
      a.push(lo, hi);
    }
    return {
      f: path(
        m.force.subarray(0, Math.ceil(forceDuration * FS)),
        (i) => L + (i / FS / forceDuration) * (R - L),
        (v) => B - (v / peakF) * (B - T),
      ),
      a: path(
        a,
        (i) => L + (i / (a.length - 1)) * (R - L),
        (v) => (T + B) / 2 - ((v / peakA) * (B - T)) / 2,
      ),
    };
  }, [m, forceDuration, peakF, peakA]);
  const reveal = (span: number) => (playing ? Math.min(1, time / span) : 1);
  return (
    <div className="mt-two-plots">
      <div>
        <div className="mt-chart-title">
          <span>
            <i className="force" />
            HAMMER FORCE <em>F(t)</em>
          </span>
          <b>{peakF.toFixed(1)} N peak</b>
        </div>
        <EngineeringPlot
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Hammer force time history"
        >
          <defs>
            <clipPath id={`${id}f`}>
              <rect
                x={L}
                y={0}
                width={(R - L) * reveal(forceDuration)}
                height={H}
              />
            </clipPath>
          </defs>
          <Grid
            yLabels={[peakF.toFixed(0), (peakF / 2).toFixed(0), "0"]}
            frequency={false}
          />
          <rect
            x={L - 17}
            y={125}
            width={R - L + 38}
            height={20}
            fill="#15272b"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <text key={v} x={L + v * (R - L)} y={138} textAnchor="middle">
              {(v * forceDuration * 1000).toFixed(0)}
              {v === 1 ? " ms" : ""}
            </text>
          ))}
          <path
            d={paths.f}
            stroke="#e9bd88"
            className="mt-signal"
            clipPath={`url(#${id}f)`}
          />
        </EngineeringPlot>
        <p>
          {(TIPS[m.settings.tip].duration * 1000).toFixed(1)} ms contact ·{" "}
          {m.settings.double ? "two pulses, 35 ms apart" : "one finite pulse"} ·
          {m.settings.double ? "0.12 + 0.078 N·s" : "0.12 N·s impulse"}
        </p>
      </div>
      <div>
        <div className="mt-chart-title">
          <span>
            <i />
            ACCELERATION <em>a(t)</em>
          </span>
          <b>m/s² · +Z</b>
        </div>
        <EngineeringPlot
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Acceleration ring-down time history"
        >
          <defs>
            <clipPath id={`${id}a`}>
              <rect x={L} y={0} width={(R - L) * reveal(0.6)} height={H} />
            </clipPath>
          </defs>
          <Grid
            yLabels={[peakA.toFixed(0), "0", (-peakA).toFixed(0)]}
            frequency={false}
          />
          <path
            d={paths.a}
            stroke="#a7dce9"
            strokeWidth={0.9}
            className="mt-signal"
            clipPath={`url(#${id}a)`}
          />
          {playing && (
            <line
              x1={L + (R - L) * reveal(0.6)}
              x2={L + (R - L) * reveal(0.6)}
              y1={T}
              y2={B}
              stroke="#dce9d7"
              opacity={0.4}
            />
          )}
        </EngineeringPlot>
        <p>
          First 600 ms of a 4 s record · shared event clock · playback slowed 8×
        </p>
      </div>
    </div>
  );
}
function Spectra({ m }: { m: Measurement }) {
  const tipCurves = useMemo(
    () =>
      Object.keys(TIPS).map((t) => ({
        tip: t as Tip,
        values: Float64Array.from({ length: 226 }, (_, f) =>
          magnitude(forceSpectrum(f, t as Tip)),
        ),
      })),
    [],
  );
  const fy = (v: number) =>
    Math.min(B, Math.max(T, T - (db(v / IMPULSE) / 60) * (B - T)));
  const maxA = Math.max(...m.responseSpectrum),
    ay = (v: number) =>
      Math.min(B, Math.max(T, T - (db(v / maxA) / 60) * (B - T)));
  return (
    <div className="mt-two-plots">
      <div>
        <div className="mt-chart-title">
          <span>
            <i className="force" />
            INPUT SPECTRUM <em>|F(f)|</em>
          </span>
          <b>dB re 0.12 N·s</b>
        </div>
        <EngineeringPlot
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Force spectra comparing soft medium and hard hammer tips"
        >
          <Grid yLabels={["0", "−30", "−60"]} />
          {tipCurves.map(({ tip, values }) => (
            <path
              key={tip}
              d={path(values, (i) => x(i), fy)}
              className="mt-signal"
              stroke={TIPS[tip].color}
              opacity={0.45}
              strokeDasharray="4 4"
            />
          ))}
          <path
            d={path(m.inputSpectrum, (i) => x(m.frequencies[i]), fy)}
            className="mt-signal"
            stroke={TIPS[m.settings.tip].color}
          />
        </EngineeringPlot>
        <p className="mt-legend">
          {Object.entries(TIPS).map(([tip, t]) => (
            <span key={tip} style={{ color: t.color }}>
              {tip.toUpperCase()} · {t.duration * 1000} ms
            </span>
          ))}
        </p>
      </div>
      <div>
        <div className="mt-chart-title">
          <span>
            <i />
            RESPONSE SPECTRUM <em>|A(f)|</em>
          </span>
          <b>dB re {maxA.toFixed(2)} m/s</b>
        </div>
        <EngineeringPlot
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Acceleration Fourier amplitude spectrum"
        >
          <Grid yLabels={["0", "−30", "−60"]} />
          <path
            d={path(m.responseSpectrum, (i) => x(m.frequencies[i]), ay)}
            className="mt-signal"
            stroke="#a7dce9"
          />
        </EngineeringPlot>
        <p>
          FFT of the same record · 0.25 Hz bins · A/F removes the input spectrum
        </p>
      </div>
    </div>
  );
}
function FRF({
  m,
  selected,
  onMode,
  quality,
}: {
  m: Measurement;
  selected: number | null;
  onMode: (i: number) => void;
  quality: boolean;
}) {
  const [cursor, setCursor] = useState<number | null>(null),
    [plotWidth, setPlotWidth] = useState(1000);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      if (r.height > 0) setPlotWidth((r.width / r.height) * H);
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, []);
  const right = plotWidth - 16,
    fx = (f: number) => L + (f / 225) * (right - L);
  const y = (v: number) =>
    Math.max(
      T,
      Math.min(B, T + ((2 - Math.log10(Math.max(v, 0.01))) / 4) * (B - T)),
    );
  const data = useMemo(
    () => ({
      model: path(m.model.map(magnitude), (i) => fx(m.frequencies[i]), y),
      measured: m.measured
        .map((v, i) =>
          m.valid[i]
            ? `${i && m.valid[i - 1] ? "L" : "M"}${fx(m.frequencies[i]).toFixed(2)},${y(magnitude(v)).toFixed(2)}`
            : "",
        )
        .join(""),
    }),
    [m, plotWidth],
  );
  const nearest = (f: number) =>
    MODES.reduce(
      (best, v, i) =>
        Math.abs(v.frequency - f) < Math.abs(MODES[best].frequency - f)
          ? i
          : best,
      0,
    );
  const pointed = cursor === null ? selected : nearest(cursor);
  const bin =
    cursor === null
      ? null
      : Math.max(0, Math.min(m.measured.length - 1, Math.round(cursor * 4)));
  return (
    <div className={`mt-frf-layout ${quality ? "with-quality" : ""}`}>
      <div className="mt-frf-main">
        <div className="mt-chart-title">
          <span>
            <i />
            ACCELERANCE <em>H(f) = A(f) / F(f)</em>
          </span>
          <b>
            {bin !== null
              ? `${cursor!.toFixed(1)} Hz · ${magnitude(m.measured[bin]).toFixed(2)} m/s²/N`
              : "Click a peak to reveal its shape"}
          </b>
        </div>
        <EngineeringPlot
          ref={svg}
          viewBox={`0 0 ${plotWidth} ${H}`}
          role="img"
          aria-label="Accelerance frequency response. Select a resonance using the mode buttons below."
          onPointerLeave={() => setCursor(null)}
          onPointerMove={(e) => {
            const p = plotCoordinates(e);
            if (p)
              setCursor(
                Math.max(0, Math.min(225, ((p.x - L) / (right - L)) * 225)),
              );
          }}
          onPointerDown={(e) => {
            const p = plotCoordinates(e);
            if (p) onMode(nearest(((p.x - L) / (right - L)) * 225));
          }}
        >
          <Grid yLabels={["100", "1", "0.01"]} right={right} />
          <path
            d={data.model}
            className="mt-signal"
            stroke="#9aaead"
            opacity={0.45}
            strokeDasharray="3 4"
          />
          <path
            d={data.measured}
            className="mt-signal"
            stroke="#bce3b8"
            strokeWidth={1.5}
          />
          {MODES.map((mode, i) => (
            <g key={i} opacity={pointed === i ? 1 : 0.42}>
              <line
                x1={fx(mode.frequency)}
                x2={fx(mode.frequency)}
                y1={T + 8}
                y2={B}
                stroke={pointed === i ? "#efbf91" : "#92c2b8"}
                strokeDasharray="2 4"
              />
              <text
                x={fx(mode.frequency) + (i === 0 ? -4 : 0)}
                y={10}
                textAnchor="middle"
                fill={pointed === i ? "#efbf91" : "#b6c7bb"}
              >
                {i + 1}
              </text>
            </g>
          ))}
          {cursor !== null && (
            <line
              x1={fx(cursor)}
              x2={fx(cursor)}
              y1={T}
              y2={B}
              stroke="#eff3dc"
              opacity={0.6}
            />
          )}
        </EngineeringPlot>
        <div className="mt-peaks" aria-label="Select a resonance">
          {MODES.map((m, i) => (
            <button
              key={i}
              aria-pressed={selected === i}
              onClick={() => onMode(i)}
            >
              <span>MODE {String(i + 1).padStart(2, "0")}</span>
              {m.frequency.toFixed(1)} <small>Hz</small>
            </button>
          ))}
        </div>
      </div>
      {quality && (
        <div className="mt-coherence">
          <div className="mt-chart-title">
            <span>
              EXPECTED COHERENCE <em>γ²</em>
            </span>
            <b>0 → 1</b>
          </div>
          <EngineeringPlot
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Expected ensemble coherence with independent response noise"
          >
            <Grid yLabels={["1", "0.5", "0"]} />
            <path
              d={path(
                m.coherence,
                (i) => x(m.frequencies[i]),
                (v) => B - v * (B - T),
              )}
              className="mt-signal"
              stroke="#b0cadd"
            />
          </EngineeringPlot>
          <p>
            Independent output noise lowers coherence where response is weak.
            This is an ensemble prediction; a single-record ratio cannot
            estimate coherence.
          </p>
        </div>
      )}
    </div>
  );
}
export default function Plots({
  measurement,
  domain,
  time,
  playing,
  selected,
  onMode,
  quality,
}: {
  measurement: Measurement | null;
  domain: Domain;
  time: number;
  playing: boolean;
  selected: number | null;
  onMode: (i: number) => void;
  quality: boolean;
}) {
  if (!measurement)
    return (
      <div className="mt-empty">
        <svg viewBox="0 0 660 90" aria-hidden="true">
          <path d="M0 60 H90 L96 58 L103 10 L110 58 L118 60 H200 M260 60 L268 35 L276 81 L284 25 L292 79 L300 36 L308 75 L316 45 L324 70 L332 52 L340 65 L348 57 L356 62 L364 59 H420 M470 60 H495 Q502 60 510 58 Q522 52 526 17 Q530 52 542 58 H558 Q570 55 574 35 Q578 56 590 60 H660" />
        </svg>
        <p>One impact. Two signals. A structure revealed.</p>
        <span>Strike the plate to begin a measurement.</span>
      </div>
    );
  return domain === "Time" ? (
    <TimePlots m={measurement} time={time} playing={playing} />
  ) : domain === "Spectra" ? (
    <Spectra m={measurement} />
  ) : (
    <FRF
      m={measurement}
      selected={selected}
      onMode={onMode}
      quality={quality}
    />
  );
}
