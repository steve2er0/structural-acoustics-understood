import { ParameterSlider } from "@components/Controls";
import type { CSSProperties, RefObject } from "react";
import { Pause, Play } from "lucide-react";
import { frequencyPosition } from "./visualization";

export interface GeneratorProps {
  faceRef: RefObject<HTMLElement | null>;
  frequency: number;
  naturalFrequency: number;
  sweeping: boolean;
  progress: number;
  onFrequency: (frequency: number) => void;
  onSweep: () => void;
}

/** Native HTML controls, projected onto the physical instrument by Scene. */
export default function Generator(p: GeneratorProps) {
  return (
    <section
      ref={p.faceRef}
      className="generator"
      aria-label="Frequency generator"
    >
      <i className="instrument-screw screw-tl" />
      <i className="instrument-screw screw-tr" />
      <i className="instrument-screw screw-bl" />
      <i className="instrument-screw screw-br" />
      <div className="instrument-brand">
        <span>FREQUENCY GENERATOR</span>
        <b>SG–600</b>
      </div>
      <div className="generator-display">
        <div>
          <label className="eyebrow" htmlFor="frequency">
            SINE / EXCITATION
          </label>
          <div className="frequency-value">
            <input
              id="frequency"
              aria-label="Excitation frequency in hertz"
              type="number"
              min="1"
              max="600"
              step="0.1"
              value={Number(p.frequency.toFixed(1))}
              onChange={(e) => {
                const n = e.target.valueAsNumber;
                if (Number.isFinite(n) && n >= 1 && n <= 600) p.onFrequency(n);
              }}
            />
            <span>Hz</span>
          </div>
        </div>
        <div className="generator-wave" aria-hidden="true">
          <svg viewBox="0 0 108 44">
            <path className="wave-grid" d="M0 22H108M27 0V44M54 0V44M81 0V44" />
            <path d="M0 22C9 -2 18 -2 27 22S45 46 54 22S72 -2 81 22S99 46 108 22" />
          </svg>
          <span>
            <i />
            BASE · 1 g PEAK
          </span>
        </div>
      </div>
      <div className="generator-adjust">
        <span>FREQUENCY</span>
        <span>1 — 600 Hz</span>
      </div>
      <div className="frequency-track">
        <ParameterSlider
          inputOnly
          className="primary-slider"
          aria-label="Excitation frequency"
          aria-valuetext={`${p.frequency.toFixed(1)} hertz`}
          min={1}
          max={600}
          logarithmic
          step="1"
          value={p.frequency}
          onValue={(value) => p.onFrequency(value)}
          style={
            {
              "--progress": `${frequencyPosition(p.frequency) * 100}%`,
            } as CSSProperties
          }
        />
        <div className="frequency-ticks">
          {[1, 5, 25, 100, 600].map((f) => (
            <button
              key={f}
              style={{ left: `${frequencyPosition(f) * 100}%` }}
              onClick={() => p.onFrequency(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <span
          className="frequency-natural"
          style={{ left: `${frequencyPosition(p.naturalFrequency) * 100}%` }}
          title={`Natural frequency ${p.naturalFrequency.toFixed(1)} Hz`}
        />
      </div>
      <div className="generator-bottom">
        <span>
          <i className="output-jack" />
          TO SHAKER
        </span>
        <button
          className={`sweep-button ${p.sweeping ? "running" : ""}`}
          onClick={p.onSweep}
        >
          <span
            className="sweep-progress"
            style={{ width: `${p.progress * 100}%` }}
          />
          {p.sweeping ? (
            <Pause size={13} fill="currentColor" />
          ) : (
            <Play size={13} fill="currentColor" />
          )}
          <span>{p.sweeping ? "Stop sweep" : "Run Sweep"}</span>
        </button>
      </div>
    </section>
  );
}
