import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Crosshair, Hammer, Pause, Play, X } from "lucide-react";
import { LabCanvas, SceneBoundary } from "@engine/Scene";
import { useGuidedTour } from "@engine/useGuidedTour";
import { LabNavigation } from "@components/LabNavigation";
import { TourTransport } from "@components/TourTransport";
import {
  ParameterSlider,
  SegmentedControl,
  Toggle,
} from "@components/Controls";
import World, {
  CAMERAS,
  CONTACT_TIME,
  PREVIEW_TIME,
  SLOWDOWN,
  type Playback,
  type View,
} from "./Scene";
import Plots, { type Domain } from "./Plots";
import {
  DEFAULT,
  GRID,
  MODES,
  TIPS,
  measure,
  surveyValues,
  type Measurement,
  type Settings,
  type Survey,
} from "./physics";
import { TOUR } from "./tour";
import type { PlacementTarget } from "./placement";
import "./style.css";
export default function ModalLab() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT });
  const [measurement, setMeasurement] = useState<Measurement | null>(null),
    [survey, setSurvey] = useState<Survey>({});
  const [domain, setDomain] = useState<Domain>("Time"),
    [selected, setSelected] = useState<number | null>(null),
    [view, setView] = useState<View>("System"),
    [revision, setRevision] = useState(0);
  const [running, setRunning] = useState(false),
    [paused, setPaused] = useState(false),
    [time, setTime] = useState(0),
    [nodes, setNodes] = useState(false),
    [grid, setGrid] = useState(false),
    [rebuilding, setRebuilding] = useState(false),
    [gain, setGain] = useState(0.55);
  const [advanced, setAdvanced] = useState(false),
    [quality, setQuality] = useState(false),
    [notes, setNotes] = useState(false),
    [pointTarget, setPointTarget] = useState<PlacementTarget>("Impact"),
    [placement, setPlacement] = useState<PlacementTarget | null>(null),
    [focus, setFocus] = useState("");
  const labels = useRef<(HTMLDivElement | null)[]>([]),
    clock = useRef<Playback>({
      elapsed: 0,
      playing: false,
      started: 0,
      time: 0,
    }),
    seed = useRef(19);
  const camera = (v: View) => {
    setView(v);
    setRevision((r) => r + 1);
  };
  const acquire = (s: Settings = settings, resume = true) => {
    const result = measure(s, ++seed.current);
    setMeasurement(result);
    setSettings({ ...s });
    setSelected(null);
    setRebuilding(false);
    setPlacement(null);
    setDomain("Time");
    if (resume) setPaused(false);
    setRunning(true);
    setTime(0);
    clock.current = {
      elapsed: 0,
      playing: true,
      started: performance.now(),
      time: 0,
    };
    return result;
  };
  const selectMode = (i: number, resume = true) => {
    setPlacement(null);
    setSelected(i);
    setDomain("FRF");
    setRunning(false);
    clock.current.playing = false;
    if (resume) setPaused(false);
    camera("Mode Shape");
    if (window.matchMedia("(max-width: 700px)").matches)
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  const reset = () => {
    setSettings({ ...DEFAULT });
    setMeasurement(null);
    setSurvey({});
    setSelected(null);
    setDomain("Time");
    setRunning(false);
    setPaused(false);
    setTime(0);
    setNodes(false);
    setGrid(false);
    setRebuilding(false);
    setQuality(false);
    setGain(0.55);
    setPointTarget("Impact");
    setPlacement(null);
    setNotes(false);
    setAdvanced(false);
    setFocus("");
    clock.current = { elapsed: 0, playing: false, time: 0, started: 0 };
    camera("System");
  };
  const tour = useGuidedTour({
    steps: TOUR,
    paused,
    onSample: (step, _t, _p, entered) => {
      if (!entered) return;
      setFocus(step.focus ?? "");
      setDomain(step.domain);
      camera(step.view);
      switch (step.action) {
        case "reset":
          reset();
          break;
        case "hit":
          acquire({ ...DEFAULT }, false);
          break;
        case "mode":
          selectMode(0, false);
          break;
        case "nodes":
          setNodes(true);
          break;
        case "grid":
          setGrid(true);
          break;
        case "rove1":
          acquire({ ...DEFAULT, input: 6 }, false);
          break;
        case "rove2":
          acquire({ ...DEFAULT, input: 0 }, false);
          break;
        case "rebuild":
          selectMode(0, false);
          setRebuilding(true);
          break;
        case "damp":
          acquire({ ...DEFAULT, input: 10, damping: 0.04 }, false);
          break;
        case "finish":
          selectMode(2, false);
          setRebuilding(false);
          break;
      }
    },
  });
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setTime(Math.min(PREVIEW_TIME, clock.current.time));
      if (clock.current.elapsed >= CONTACT_TIME + PREVIEW_TIME * SLOWDOWN) {
        clock.current.playing = false;
        setRunning(false);
        setTime(PREVIEW_TIME);
        if (measurement && !measurement.settings.double)
          setSurvey((s) => ({
            ...s,
            [measurement.settings.input]: surveyValues(measurement),
          }));
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [running, measurement]);
  const change = (patch: Partial<Settings>) => {
    tour.stop();
    const next = { ...settings, ...patch };
    setSettings(next);
    setSurvey({});
    if (measurement) setMeasurement(measure(next, seed.current));
    if (running) {
      clock.current.playing = false;
      setRunning(false);
      setTime(PREVIEW_TIME);
    }
  };
  const startPlacement = (target: PlacementTarget, reframe = true) => {
    if (running || tour.active) return;
    setPointTarget(target);
    setPlacement(target);
    setGrid(true);
    setSelected(null);
    setRebuilding(false);
    setAdvanced(false);
    if (reframe) camera("Measurement Grid");
  };
  const point = (i: number, target: PlacementTarget = pointTarget) => {
    if (running || tour.active) return;
    const key = target === "Impact" ? "input" : "output";
    if (
      i === settings[key] ||
      i === settings[target === "Impact" ? "output" : "input"]
    )
      return;
    setSettings((s) => ({ ...s, [key]: i }));
    if (target === "Reference") setSurvey({});
    setMeasurement(null);
    setSelected(null);
    setRebuilding(false);
    setDomain("Time");
    setTime(0);
    clock.current = { elapsed: 0, playing: false, time: 0, started: 0 };
  };
  const pointHandler = useRef(point);
  pointHandler.current = point;
  const choosePoint = useCallback(
    (i: number, target?: PlacementTarget) => pointHandler.current(i, target),
    [],
  );
  const placementHandler = useRef(startPlacement);
  placementHandler.current = startPlacement;
  const beginPlacement = useCallback(
    (target: PlacementTarget, reframe = true) =>
      placementHandler.current(target, reframe),
    [],
  );
  useEffect(() => {
    if (!notes) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = document.querySelector<HTMLElement>(".mt-notes");
    const close = panel?.querySelector<HTMLButtonElement>(".mt-close");
    close?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotes(false);
      if (event.key !== "Tab" || !panel) return;
      const links = Array.from(
        panel.querySelectorAll<HTMLElement>("button,a[href]"),
      );
      const first = links[0],
        last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [notes]);
  const count = Object.keys(survey).length;
  const chooseDomain = (d: Domain) => {
    tour.stop();
    setDomain(d);
    if (d !== "Time") camera("FRF");
  };
  const activeMode = selected !== null ? MODES[selected] : null;
  return (
    <main className="mt-lab">
      <LabNavigation
        active="modal"
        onRestart={() => {
          tour.reset();
          reset();
        }}
        onTour={() => {
          setPaused(false);
          tour.start();
        }}
        onHelp={() => setNotes(true)}
        touring={tour.active}
      />
      <section
        className="mt-stage"
        aria-label="Suspended plate modal experiment"
      >
        <SceneBoundary>
          <LabCanvas camera={{ position: CAMERAS.System.position, fov: 39 }}>
            <World
              settings={settings}
              measurement={measurement}
              clock={clock}
              selectedMode={selected}
              gain={gain}
              nodes={nodes}
              grid={grid || placement !== null}
              survey={survey}
              rebuilding={rebuilding}
              view={view}
              revision={revision}
              onPoint={choosePoint}
              onBeginPlacement={beginPlacement}
              placement={placement}
              movable={!running && !tour.active}
              labels={labels}
              paused={paused}
              focus={focus}
            />
          </LabCanvas>
        </SceneBoundary>
        {[
          "INSTRUMENTED HAMMER",
          "REFERENCE ACCELEROMETER",
          "SOFT SUSPENSION",
        ].map((text, i) => (
          <div
            className={`mt-annotation mt-annotation-${i}`}
            key={text}
            ref={(el) => {
              labels.current[i] = el;
            }}
          >
            {text}
            <small>
              {i === 0
                ? `Input at ${GRID[settings.input].name} · ${settings.tip.toLowerCase()} tip`
                : i === 1
                  ? `Response at ${GRID[settings.output].name} · transverse axis`
                  : "Free edges · bending model"}
            </small>
          </div>
        ))}
        {activeMode && (
          <div className="mt-scene-mode">
            MODE 0{selected! + 1}
            <strong>
              {activeMode.frequency.toFixed(1)} <small>Hz</small>
            </strong>
          </div>
        )}
        <div className="mt-stage-caption">
          <span>ALUMINIUM / 600 × 400 × 4 mm</span>
          <span>FREE-EDGE BENDING MODEL</span>
        </div>
      </section>
      <section className="mt-story">
        <p className="vl-eyebrow">
          <span>03</span> / EXPERIMENTAL MODAL TESTING
        </p>
        <h1>
          {selected === null ? (
            <>
              Strike once.
              <br />
              <em>Reveal a mode.</em>
            </>
          ) : (
            <>
              The peak
              <br />
              <em>has a shape.</em>
            </>
          )}
        </h1>
        <p>
          {tour.active
            ? TOUR[tour.index].copy
            : selected !== null
              ? "Every resonance belongs to a pattern of motion. Select a different peak and watch the plate change."
              : "How can hitting a structure tell us how it wants to vibrate?"}
        </p>
        <div className="mt-flow">
          <span className={measurement ? "done" : ""}>INPUT</span>
          <ArrowRight />
          <span className={measurement ? "done" : ""}>RESPONSE</span>
          <ArrowRight />
          <span className={domain === "FRF" ? "done" : ""}>FRF</span>
          <ArrowRight />
          <span className={selected !== null ? "done" : ""}>SHAPE</span>
        </div>
      </section>
      {placement && (
        <section
          className="mt-placement-panel"
          aria-label="Instrument placement"
          data-instrument={placement}
        >
          <div className="mt-section-label">
            <span>
              {placement === "Impact"
                ? "POSITION THE HAMMER"
                : "POSITION THE ACCELEROMETER"}
            </span>
            <button
              aria-label="Finish placing instruments"
              onClick={() => setPlacement(null)}
            >
              <X size={14} />
            </button>
          </div>
          <p>
            Click the plate or drag the instrument.
            <br />
            Positions snap to the measurement grid.
          </p>
          <div className="mt-point-grid" aria-label="Measurement locations">
            {GRID.map((p, i) => {
              const occupied =
                i === settings[placement === "Impact" ? "output" : "input"];
              return (
                <button
                  key={p.name}
                  disabled={running || occupied}
                  title={
                    occupied
                      ? `${placement === "Impact" ? "Accelerometer" : "Hammer"} occupies ${p.name}`
                      : undefined
                  }
                  aria-label={`${p.name}${i === settings.output ? ", accelerometer" : ""}${i === settings.input ? ", hammer" : ""}${survey[i] ? ", measured" : ""}`}
                  aria-pressed={
                    i === settings[placement === "Impact" ? "input" : "output"]
                  }
                  className={`${survey[i] ? "measured" : ""} ${i === settings.output ? "reference" : ""}`}
                  onClick={() => point(i, placement)}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          <div className="mt-placement-status" role="status">
            <span>
              Hammer <strong>{GRID[settings.input].name}</strong>
            </span>
            <span>
              Accelerometer <strong>{GRID[settings.output].name}</strong>
            </span>
          </div>
          <small>
            {placement === "Impact"
              ? `${count} ${count === 1 ? "location" : "locations"} measured. The accelerometer stays fixed.`
              : "Moving the accelerometer clears the previous reference survey."}
          </small>
          <button
            className="mt-placement-done"
            onClick={() => setPlacement(null)}
          >
            Done positioning <ArrowRight size={12} />
          </button>
        </section>
      )}
      <section className="mt-controls" aria-label="Experiment controls">
        <div className="mt-section-label">
          <span>01 / EXCITE THE STRUCTURE</span>
          <span>
            {GRID[settings.input].name} → {GRID[settings.output].name}
          </span>
        </div>
        <button
          className="mt-strike"
          disabled={running || tour.active}
          onClick={() => {
            tour.stop();
            acquire();
          }}
        >
          <Hammer size={18} />
          {running ? "Recording the ring-down…" : "Hit the plate"}
          <span>↗</span>
        </button>
        <SegmentedControl
          label="Hammer tip"
          value={settings.tip}
          options={Object.keys(TIPS).map((value) => ({
            value: value as Settings["tip"],
            label: value,
          }))}
          onChange={(tip) => change({ tip })}
        />
        <div className="mt-tip-detail">
          {TIPS[settings.tip].material} tip{" "}
          <span>
            {(TIPS[settings.tip].duration * 1000).toFixed(1)} ms contact
          </span>
        </div>
        <ParameterSlider
          label="Damping ratio ζ"
          value={settings.damping * 100}
          min={0.5}
          max={5}
          step={0.1}
          unit="%"
          format={(n) => n.toFixed(1)}
          onValue={(v) => change({ damping: v / 100 })}
        />
        <button
          className="mt-disclosure"
          aria-expanded={advanced}
          onClick={() => setAdvanced(!advanced)}
        >
          <Crosshair size={13} />
          Measurement quality<span>{advanced ? "−" : "+"}</span>
        </button>
        {advanced && (
          <div className="mt-advanced">
            <Toggle checked={grid} onChange={setGrid}>
              Show measurement grid
            </Toggle>
            <ParameterSlider
              label="Response noise RMS"
              value={settings.noise}
              min={0}
              max={20}
              unit="m/s²"
              format={(n) => n.toFixed(1)}
              onValue={(v) => {
                change({ noise: v });
                setQuality(true);
              }}
            />
            <Toggle checked={quality} onChange={setQuality}>
              Show expected coherence
            </Toggle>
            <Toggle
              checked={settings.double}
              onChange={(v) => change({ double: v })}
            >
              Double hit demonstration
            </Toggle>
            {settings.double && (
              <p>
                A bounce adds a second pulse and spectral notches. The linear
                model still works, but noise is amplified near those notches.
                Double hits are excluded from the survey.
              </p>
            )}
          </div>
        )}
      </section>
      <div className="mt-mobile-actions">
        <button
          onClick={() => {
            tour.reset();
            reset();
          }}
        >
          Reset experiment
        </button>
        <button onClick={() => setNotes(true)}>Model notes</button>
      </div>
      {activeMode && (
        <section className="mt-mode-card" aria-label="Selected mode shape">
          <div className="mt-section-label">
            <span>
              {rebuilding ? "MEASURED RECONSTRUCTION" : "NORMALIZED MODE SHAPE"}
            </span>
            <button
              onClick={() => {
                setSelected(null);
                setRebuilding(false);
                camera("Plate");
              }}
              aria-label="Close mode shape"
            >
              <X size={13} />
            </button>
          </div>
          <div className="mt-mode-number">
            0{selected! + 1}
            <div>
              {activeMode.frequency.toFixed(1)} <small>Hz</small>
              <span>
                ζ = {(settings.damping * 100).toFixed(1)}% · elastic mode
              </span>
            </div>
          </div>
          <div className="mt-mode-scale">
            <span>−1</span>
            <i />
            <span>+1</span>
          </div>
          <p>
            Signed, peak-normalized displacement.
            <br />
            Animation slowed to reveal the pattern.
          </p>
          <ParameterSlider
            label="Visual deformation"
            value={gain}
            min={0.15}
            max={0.9}
            step={0.05}
            unit="×"
            format={(n) => n.toFixed(2)}
            onValue={setGain}
          />
          {!rebuilding && (
            <Toggle checked={nodes} onChange={setNodes}>
              Show nodal lines
            </Toggle>
          )}
          <Toggle
            checked={rebuilding}
            onChange={(v) => {
              setRebuilding(v);
              setGrid(v || grid);
            }}
          >
            Reconstruct from {count} measured points
          </Toggle>
          {rebuilding && (
            <p>
              {count
                ? "Interpolation of fitted signed residues. Unmeasured regions remain uncertain."
                : "Collect points with the roving hammer to reveal this shape."}
            </p>
          )}
        </section>
      )}
      <div className="mt-view-tools">
        <label>
          VIEW{" "}
          <select
            aria-label="Camera preset"
            value={view}
            onChange={(e) => {
              tour.stop();
              camera(e.target.value as View);
            }}
          >
            {Object.keys(CAMERAS).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <button
          aria-label={paused ? "Resume animation" : "Pause animation"}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <div className="mt-placement-tools" aria-label="Move instruments">
          <button
            disabled={running || tour.active}
            aria-pressed={placement === "Impact"}
            onClick={() =>
              placement === "Impact"
                ? setPlacement(null)
                : startPlacement("Impact")
            }
          >
            <Hammer size={13} />
            <span>Move hammer</span>
            <b>{GRID[settings.input].name}</b>
          </button>
          <button
            disabled={running || tour.active}
            aria-pressed={placement === "Reference"}
            onClick={() =>
              placement === "Reference"
                ? setPlacement(null)
                : startPlacement("Reference")
            }
          >
            <Crosshair size={13} />
            <span>Move accelerometer</span>
            <b>{GRID[settings.output].name}</b>
          </button>
        </div>
        <span>
          {selected !== null
            ? "NORMALIZED SHAPE · VISUAL GAIN ONLY"
            : running
              ? "TRANSIENT MOTION · 80× DISPLACEMENT"
              : "DRAG TO ORBIT · SCROLL TO ZOOM"}
        </span>
      </div>
      <section className="mt-data" aria-label="Measurement signals">
        <div className="mt-data-head">
          <SegmentedControl
            label="Signal view"
            value={domain}
            options={[
              { value: "Time", label: "01  Time domain" },
              { value: "Spectra", label: "02  Frequency domain" },
              { value: "FRF", label: "03  Frequency response" },
            ]}
            onChange={chooseDomain}
          />
          <div className="mt-record-status" role="status">
            <i className={running ? "recording" : ""} />
            {running
              ? "ACQUIRING"
              : measurement
                ? `${GRID[measurement.settings.input].name} → ${GRID[measurement.settings.output].name} · 4 s / 8192 Hz`
                : "AWAITING IMPACT"}
          </div>
        </div>
        <Plots
          measurement={measurement}
          domain={domain}
          time={time}
          playing={running}
          selected={selected}
          onMode={(i) => {
            tour.stop();
            selectMode(i);
          }}
          quality={quality}
        />
        <div className="mt-data-foot">
          <span>
            {measurement
              ? domain === "FRF"
                ? "Solid: measured A/F · dashed: six-mode model · weak-input bins omitted"
                : domain === "Spectra"
                  ? "Solid: measured spectra · dashed: equal-impulse tip comparison · natural frequencies stay fixed."
                  : "Input and response share one event. Force pulse shown at a closer time scale."
              : "An instrumented hammer measures force. An accelerometer measures the response."}
          </span>
          {measurement && domain !== "FRF" && (
            <button
              disabled={running}
              onClick={() =>
                chooseDomain(domain === "Time" ? "Spectra" : "FRF")
              }
            >
              {domain === "Time"
                ? "Transform this measurement"
                : "Build the FRF"}
              <ArrowRight size={14} />
            </button>
          )}
          {measurement && domain === "FRF" && <span>SELECT A PEAK ↑</span>}
        </div>
      </section>
      {tour.active && (
        <TourTransport
          index={tour.index}
          count={TOUR.length}
          time={tour.time}
          duration={tour.duration}
          paused={paused}
          onPause={() => setPaused(!paused)}
          onJump={tour.jump}
          onExit={tour.stop}
          title={TOUR[tour.index].title}
        />
      )}
      {notes && (
        <div className="mt-notes-backdrop" onClick={() => setNotes(false)}>
          <section
            className="mt-notes"
            role="dialog"
            aria-modal="true"
            aria-label="Modal model notes"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="mt-close"
              aria-label="Close model notes"
              onClick={() => setNotes(false)}
            >
              <X size={20} />
            </button>
            <p className="vl-eyebrow">THE MODEL / ASSUMPTIONS & SOURCES</p>
            <h2>One model, every view.</h2>
            <p>
              A 600 × 400 × 4 mm aluminium plate: E = 69 GPa, ρ = 2700 kg/m³, ν
              = 0.33. Six free-edge Kirchhoff–Love bending modes are precomputed
              using a degree-8 Legendre Rayleigh–Ritz basis. Increasing the
              degree to 10 changes these frequencies by less than 0.018%.
            </p>
            <p className="mt-equation">
              Hₐ(ω) = −ω² Σ φₙ(out) φₙ(in) /<br />
              [mₙ (ωₙ² − ω² + 2iζₙωₙω)]
            </p>
            <p>
              Soft cords are a visual approximation to a free suspension.
              Rigid-body modes, cord dynamics, sensor mass, cable loading and
              modes above 183 Hz are omitted. This is a linear, small-deflection
              bending model, intended to teach modal testing rather than qualify
              hardware.
            </p>
            <p>
              Positive force and acceleration are downward (+Z) in this
              experiment. A 0.12 N·s half-sine force excites the same modal
              oscillators. RK4 integration at 8192 Hz produces a 4 s record. An
              unwindowed FFT supplies complex A/F; 0.25 Hz bins and
              finite-record leakage limit peak resolution. Plots omit bins with
              less than 2.5% of the nominal impulse spectrum. Mode labels are
              model poles, not automatically identified measured peaks.
            </p>
            <p>
              Transient surface motion uses physical displacement magnified 80×,
              slowed 8×. Mode playback uses dimensionless, peak-normalized
              eigenvectors and a separate visual scale. Its playback rate is
              illustrative, not the displayed natural frequency.
            </p>
            <p>
              Roving measurements fit real modal residues to the measured
              complex FRF using known model poles. The fixed reference shape and
              modal mass set the scale; inverse-distance interpolation reveals a
              sparse shape. This is model-assisted reconstruction, not a general
              experimental modal fitter. Moving the reference or changing test
              parameters clears the survey.
            </p>
            <p>
              Noise is independent Gaussian acceleration noise in m/s² RMS.
              Coherence is an expected ensemble value |HF|² / (|HF|² + E|N|²),
              not a single-record estimate. A point close to a mode’s reference
              node cannot reliably recover that mode. Higher damping makes
              overlapping modes harder to separate; half-power fitting is
              intentionally omitted.
            </p>
            <p>
              References:{" "}
              <a
                href="https://ntrs.nasa.gov/api/citations/19700009156/downloads/19700009156.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Leissa, Vibration of Plates, NASA SP-160
              </a>
              ;{" "}
              <a
                href="https://www.bksv.com/-/media/literature/Product-Data/bp2078.ashx"
                target="_blank"
                rel="noreferrer"
              >
                Brüel & Kjær impact hammer data
              </a>
              .
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
