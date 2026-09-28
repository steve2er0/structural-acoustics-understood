import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ParameterSlider, SegmentedControl } from "@components/Controls";
import {
  cavityPulse,
  lpftpPressure,
  LPFTP_REFERENCE,
  type LPFTPSettings,
  type LPFTPState,
  type SourceView,
} from "./lpftp";
const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const color = (family: string) => (family === "blade" ? "#8bdef0" : "#b7baff");

export function CavityIndicator({
  state,
  cycles,
  paused,
}: {
  state: LPFTPState;
  cycles: number;
  paused: boolean;
}) {
  const active = state.cavitation > 0,
    size = active ? cavityPulse(cycles) * state.cavitation : 0,
    phase = !active
      ? "No vapor shown"
      : cycles % 1 < 0.5
        ? "Collapsing"
        : "Growing";
  return (
    <div
      className="rs-cavity-indicator"
      aria-label="Illustrative vapor cavity cycle"
    >
      <div>
        <span>VAPOR CAVITIES</span>
        <strong>
          {paused && active ? "Paused · " : ""}
          {phase}
        </strong>
      </div>
      <div className="rs-cavity-meter" aria-hidden="true">
        <i style={{ transform: `scaleX(${size})` }} />
      </div>
      <p>Violet pockets = vapor · rings = pressure waves</p>
    </div>
  );
}

function Listen({ state, paused }: { state: LPFTPState; paused: boolean }) {
  const [listening, setListening] = useState(false),
    [error, setError] = useState("");
  const audio = useRef<{
    context: AudioContext;
    voices: { osc: OscillatorNode; gain: GainNode }[];
  } | null>(null);
  useEffect(
    () => () => {
      void audio.current?.context.close();
    },
    [],
  );
  useEffect(() => {
    if (!audio.current) return;
    const { context, voices } = audio.current;
    voices.forEach(({ osc, gain }, i) => {
      osc.frequency.setTargetAtTime(
        Math.max(1, state.lines[i].hz),
        context.currentTime,
        0.04,
      );
      gain.gain.setTargetAtTime(
        listening && !paused ? state.lines[i].rms * 0.012 : 0,
        context.currentTime,
        0.04,
      );
    });
  }, [state, listening, paused]);
  const toggle = async () => {
    try {
      if (!audio.current) {
        const context = new AudioContext();
        const voices = state.lines.map(() => {
          const osc = context.createOscillator(),
            gain = context.createGain();
          gain.gain.value = 0;
          osc.connect(gain);
          gain.connect(context.destination);
          osc.start();
          return { osc, gain };
        });
        audio.current = { context, voices };
      }
      await audio.current.context.resume();
      setListening((v) => !v);
      setError("");
    } catch {
      setError("Audio is unavailable in this browser.");
    }
  };
  return (
    <>
      <button
        className="rs-lp-listen"
        aria-pressed={listening}
        onClick={() => void toggle()}
      >
        {listening ? <VolumeX size={14} /> : <Volume2 size={14} />}
        {listening ? "Mute synthesized tones" : "Listen to synthesized tones"}
      </button>
      <small>
        {error ||
          (listening && paused
            ? "Audio paused with the animation."
            : "Sine-tone synthesis at the displayed frequencies; not an engine recording.")}
      </small>
    </>
  );
}
export function LPFTPContext({
  state,
  settings,
  onChange,
  paused,
}: {
  state: LPFTPState;
  settings: LPFTPSettings;
  onChange: (s: LPFTPSettings) => void;
  paused: boolean;
}) {
  return (
    <div className="rs-lp-context">
      <span className="rs-overline">LPFTP / UNSTEADY PRESSURE</span>
      <h2>
        Blade passage.
        <br />
        <em>Cavity pulsation.</em>
      </h2>
      <p>
        Four main blades set the 4N tone. Higher-order surge cavitation adds a
        separate, non-integer order near 6.55N.
      </p>
      <dl className="rs-lp-values">
        <div>
          <dt>Illustrative speed</dt>
          <dd>
            {fmt(state.rpm)} <small>rpm</small>
          </dd>
        </div>
        <div>
          <dt>Blade pass · 4N</dt>
          <dd className="blade">
            {fmt(state.bpfHz)} <small>Hz</small>
          </dd>
        </div>
        <div>
          <dt>HOSC · {state.order.toFixed(2)}N</dt>
          <dd className="cavitation">
            {fmt(state.hoscHz)} <small>Hz</small>
          </dd>
        </div>
      </dl>
      <SegmentedControl<SourceView>
        label="LPFTP excitation sources"
        value={settings.source}
        onChange={(source) => onChange({ ...settings, source })}
        options={[
          { value: "Combined", label: "Both" },
          { value: "Blade tones", label: "Blade tones" },
          { value: "Cavitation", label: "HOSC only" },
        ]}
      />
      <ParameterSlider
        label="Cavitation excitation"
        value={settings.strength * 100}
        min={0}
        max={100}
        step={5}
        unit="%"
        format={(n) => n.toFixed(0)}
        onValue={(v) => onChange({ ...settings, strength: v / 100 })}
      />
      <small>
        Illustrative amplitude, not a cavitation threshold or damage prediction.
      </small>
      <ParameterSlider
        label="HOSC order"
        value={settings.order}
        min={6.4}
        max={6.7}
        step={0.01}
        unit="N"
        format={(n) => n.toFixed(2)}
        onValue={(order) => onChange({ ...settings, order })}
      />
      <p className="rs-lp-insight">
        HOSC cavities pulse together around the annulus. Their pressure wave
        travels upstream and downstream. This is distinct from successive blades
        passing a fixed sensor.
      </p>
      <Listen state={state} paused={paused} />
    </div>
  );
}
export function LPFTPPlots({
  state,
  shaftTurns,
  cavityCycles,
  ready,
}: {
  state: LPFTPState;
  shaftTurns: number;
  cavityCycles: number;
  ready: boolean;
}) {
  const [axis, setAxis] = useState<"Frequency" | "Order">("Frequency");
  const width = 560,
    left = 42,
    right = 535,
    base = 141,
    top = 29,
    x = (n: number) =>
      left + (n / (axis === "Frequency" ? 5000 : 18)) * (right - left),
    y = (r: number) => base - (r / 1.3) * (base - top),
    at = (order: number) =>
      axis === "Frequency" ? order * state.shaftHz : order;
  const wave = Array.from({ length: 801 }, (_, i) => {
    const t = (i / 800) * 0.008,
      p = lpftpPressure(state, t, shaftTurns, cavityCycles);
    return `${i ? "L" : "M"}${(left + (i / 800) * (right - left)).toFixed(2)},${(88 - (p / 4.2) * 48).toFixed(2)}`;
  }).join(" ");
  const band = state.rpm > 0 || axis === "Order";
  return (
    <div className="rs-lp-plots">
      <div className="rs-lp-plot">
        <div className="rs-lp-plot-heading">
          <div>
            <span>PRESSURE LINE SPECTRUM</span>
            <small>Relative RMS amplitude · not PSD</small>
          </div>
          <SegmentedControl
            label="LPFTP spectrum axis"
            value={axis}
            options={[
              { value: "Frequency", label: "Hz" },
              { value: "Order", label: "Order" },
            ]}
            onChange={setAxis}
          />
        </div>
        <svg
          viewBox={`0 0 ${width} 181`}
          role="img"
          aria-label={`LPFTP ${axis.toLowerCase()} spectrum: shaft ${fmt(state.shaftHz)} Hz, blade pass ${fmt(state.bpfHz)} Hz, HOSC ${fmt(state.hoscHz)} Hz. Relative pressure amplitudes.`}
        >
          {[0, 0.5, 1].map((r) => (
            <g key={r}>
              <line
                x1={left}
                x2={right}
                y1={y(r)}
                y2={y(r)}
                className="rs-lp-grid"
              />
              <text x={left - 9} y={y(r) + 3} textAnchor="end">
                {r.toFixed(1)}
              </text>
            </g>
          ))}
          {(axis === "Frequency"
            ? [0, 1000, 2000, 3000, 4000, 5000]
            : [0, 4, 8, 12, 16]
          ).map((t) => (
            <g key={t}>
              <line
                x1={x(t)}
                x2={x(t)}
                y1={top}
                y2={base}
                className="rs-lp-grid"
              />
              <text x={x(t)} y={162} textAnchor="middle">
                {axis === "Frequency" ? fmt(t) : `${t}N`}
              </text>
            </g>
          ))}
          {band && (
            <>
              <rect
                x={x(at(6.4))}
                y={top}
                width={Math.max(2, x(at(6.7)) - x(at(6.4)))}
                height={base - top}
                fill="#b7baff"
                opacity={0.12}
              />
              <text x={x(at(6.55))} y={17} fill="#b7baff" textAnchor="middle">
                6.4–6.7N
              </text>
            </>
          )}
          {state.rpm > 0 && (
            <>
              <line
                x1={x(at(1))}
                x2={x(at(1))}
                y1={top}
                y2={base}
                stroke="#8daba6"
                strokeDasharray="3 4"
              />
              <text x={x(at(1))} y={22} textAnchor="middle">
                1N
              </text>
            </>
          )}
          {state.lines
            .filter((l) => l.rms > 0)
            .map((l) => (
              <g key={l.id}>
                <line
                  x1={x(at(l.order))}
                  x2={x(at(l.order))}
                  y1={base}
                  y2={y(l.rms)}
                  stroke={color(l.family)}
                  strokeWidth={3}
                />
                <circle
                  cx={x(at(l.order))}
                  cy={y(l.rms)}
                  r={3.5}
                  fill={color(l.family)}
                />
                <text
                  x={x(at(l.order)) + (l.id === "hosc" ? -6 : 0)}
                  y={y(l.rms) - 9}
                  textAnchor={l.id === "hosc" ? "end" : "middle"}
                  fill={color(l.family)}
                >
                  {l.id === "bpf" ? "4N" : l.label}
                </text>
              </g>
            ))}
          {!state.rpm && (
            <text x={280} y={85} textAnchor="middle">
              {ready
                ? "Engine off · no pressure forcing"
                : "Startup reveal · steady spectrum follows"}
            </text>
          )}
          <text x={right} y={178} textAnchor="end">
            {axis === "Frequency"
              ? "Frequency [Hz]"
              : "Shaft order f / (rpm ÷ 60)"}
          </text>
        </svg>
      </div>
      <div className="rs-lp-plot">
        <div className="rs-lp-plot-heading">
          <div>
            <span>SYNTHETIC PRESSURE TRACE</span>
            <small>Same tones, summed in time · relative units</small>
          </div>
          <b>{state.rms.toFixed(2)} RMS</b>
        </div>
        <svg
          viewBox={`0 0 ${width} 181`}
          role="img"
          aria-label="Synthetic dynamic pressure waveform over eight milliseconds, using the spectrum line amplitudes."
        >
          {[0, 2, 4, 6, 8].map((ms) => (
            <g key={ms}>
              <line
                x1={left + (ms / 8) * (right - left)}
                x2={left + (ms / 8) * (right - left)}
                y1={29}
                y2={141}
                className="rs-lp-grid"
              />
              <text
                x={left + (ms / 8) * (right - left)}
                y={162}
                textAnchor="middle"
              >
                {ms}
              </text>
            </g>
          ))}
          {[-4, 0, 4].map((a) => (
            <g key={a}>
              <line
                x1={left}
                x2={right}
                y1={88 - (a / 4.2) * 48}
                y2={88 - (a / 4.2) * 48}
                className="rs-lp-grid"
              />
              <text x={left - 9} y={91 - (a / 4.2) * 48} textAnchor="end">
                {a}
              </text>
            </g>
          ))}
          <path d={wave} fill="none" stroke="#e9d3b1" strokeWidth={1.5} />
          <text x={right} y={178} textAnchor="end">
            Physical time window [ms]
          </text>
        </svg>
      </div>
      <div className="rs-lp-plot-foot">
        <span>
          <i /> 4N, 8N, 16N blade tones <i className="cavitation" /> HOSC band
          and selected tone
        </span>
        <span>
          N = {fmt(state.shaftHz)} Hz · motion slowed{" "}
          {LPFTP_REFERENCE.slowdown.toLocaleString()}×
        </span>
      </div>
    </div>
  );
}
