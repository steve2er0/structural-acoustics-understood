import type { EngineState } from "./physics";
export function PlumeControls({
  state,
  ready,
  ambient,
  onAmbient,
  onInspect,
}: {
  state: EngineState;
  ready: boolean;
  ambient: number;
  onAmbient: (p: number) => void;
  onInspect: () => void;
}) {
  const p = state.plume;
  return (
    <div className="rs-plume-panel">
      <div className="rs-plume-title">
        <span>EXHAUST / AMBIENT</span>
        <button onClick={onInspect}>Inspect plume ↗</button>
      </div>
      <label htmlFor="rs-ambient">
        Ambient pressure{" "}
        <strong>
          {(ambient / 1000).toFixed(1)} <small>kPa</small>
        </strong>
      </label>
      <input
        id="rs-ambient"
        aria-label="Ambient pressure"
        type="range"
        min="0"
        max="101.325"
        step="0.1"
        value={ambient / 1000}
        onChange={(e) => onAmbient(Number(e.target.value) * 1000)}
      />
      <div className="rs-ambient-presets">
        <button
          aria-pressed={ambient > 101000}
          onClick={() => onAmbient(101325)}
        >
          Sea level
        </button>
        <button aria-pressed={ambient === 5000} onClick={() => onAmbient(5000)}>
          Thin air
        </button>
        <button aria-pressed={ambient === 0} onClick={() => onAmbient(0)}>
          Vacuum
        </button>
      </div>
      <div className="rs-plume-state">
        <i />
        <b>{ready ? p.regime : "Startup reveal"}</b>
      </div>
      <p>
        {!state.activity
          ? "Start the engine, then change the air around the exhaust."
          : p.vacuum
            ? "With no surrounding air to confine it, the plume fans outward. The repeating atmospheric shock-cell pattern disappears."
            : p.regime === "Pressure matched"
              ? "Exit and ambient pressure nearly match. There is little external recompression, so the diamonds fade."
              : p.regime === "Overexpanded"
                ? "The exhaust exits below ambient pressure. Air squeezes it inward; repeated compression and expansion form standing shock cells."
                : "The exhaust exits above ambient pressure. It expands first, then recompresses. Lower ambient pressure stretches the cells apart."}
      </p>
      <dl>
        <div>
          <dt>Exit pressure</dt>
          <dd>{ready ? (state.exitPressure / 1000).toFixed(1) : "—"} kPa</dd>
        </div>
        <div>
          <dt>Pe / Pa</dt>
          <dd>
            {ready
              ? !state.activity
                ? "—"
                : p.vacuum
                  ? "vacuum"
                  : p.ratio.toFixed(2)
              : "—"}
          </dd>
        </div>
      </dl>
      {state.activity > 0 && (
        <button
          className="rs-match-pressure"
          onClick={() => onAmbient(state.exitPressure)}
        >
          Match ambient to exit pressure
        </button>
      )}
      <small className="rs-plume-limit">
        Illustrative shock-cell pattern · longitudinal spacing compressed · no
        separation or CFD solution
      </small>
    </div>
  );
}
