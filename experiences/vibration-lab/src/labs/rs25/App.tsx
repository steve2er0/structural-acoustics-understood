import { useCallback, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Pause,
  Play,
  Power,
  RotateCcw,
} from "lucide-react";
import { LabNavigation } from "@components/LabNavigation";
import { ParameterSlider, SegmentedControl } from "@components/Controls";
import { TourTransport } from "@components/TourTransport";
import { LabCanvas, SceneBoundary } from "@engine/Scene";
import { useGuidedTour } from "@engine/useGuidedTour";
import {
  CAMERAS,
  COLORS,
  DISPLAYS,
  LEGEND,
  PARTS,
  PART_VIEW,
  TOPICS,
  TOPIC_PART,
  type Display,
  type Part,
  type Topic,
  type View,
} from "./content";
import { useEngine } from "./simulation";
import { PlumeControls } from "./PlumeControls";
import { LBF } from "./physics";
import { DEFAULT_LPFTP, lpftpState } from "./lpftp";
import { CavityIndicator, LPFTPContext, LPFTPPlots } from "./LPFTPDynamics";
import World, { LABEL_PARTS } from "./Scene";
import Cycle from "./Cycle";
import { Context, Analysis } from "./Instruments";
import { TOUR } from "./tour";
import Notes from "./Notes";
import "./style.css";
function showScene(top = 215) {
  if (window.matchMedia("(max-width:700px)").matches)
    window.scrollTo({
      top,
      behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "instant"
        : "smooth",
    });
}
export default function RS25App() {
  const [power, setPower] = useState(100),
    [ambient, setAmbient] = useState(101325),
    [paused, setPaused] = useState(false),
    [display, setDisplay] = useState<Display>("Assembled"),
    [topic, setTopic] = useState<Topic>("Full engine"),
    [selected, setSelected] = useState<Part>("engine"),
    [view, setView] = useState<View>("Engine"),
    [revision, setRevision] = useState(0),
    [notes, setNotes] = useState(false),
    [labelsOn, setLabelsOn] = useState(false),
    [lpftp, setLPFTP] = useState(DEFAULT_LPFTP),
    [lpftpCloseup, setLPFTPCloseup] = useState(true);
  const engine = useEngine(power, paused, ambient, lpftp.order),
    controls = useRef<HTMLElement | null>(null),
    labels = useRef<(HTMLButtonElement | null)[]>([]);
  const camera = (v: View) => {
    setView(v);
    setRevision((n) => n + 1);
  };
  const tour = useGuidedTour({
    steps: TOUR,
    paused,
    onSample: (s, _t, _p, entered) => {
      if (!entered) return;
      setTopic(s.topic);
      setDisplay(s.display);
      setSelected(s.part);
      setPower(s.power);
      setAmbient(s.ambient ?? 0);
      setLPFTP({ ...DEFAULT_LPFTP, ...s.lpftp });
      camera(s.view);
      setLabelsOn(false);
      if (s.on) engine.settle();
      else engine.stop();
    },
  });
  const selectPart = (p: Part) => {
    tour.stop();
    setSelected(p);
    if (p === "pogo") setTopic("Pogo suppression");
    else if (
      topic === "Shock diamonds" ||
      topic === "Pogo suppression" ||
      topic === "LPFTP dynamics"
    )
      setTopic("Full engine");
    camera(PART_VIEW[p]);
    if (display !== "Cycle") {
      setDisplay(
        p === "pogo" || p.includes("tp")
          ? "Assembled"
          : p === "nozzle" ||
              p === "chamber" ||
              p === "injector" ||
              p === "cooling" ||
              p.includes("tp")
            ? "Cutaway"
            : "Flow",
      );
    }
    showScene();
  };
  const chooseRef = useRef(selectPart);
  chooseRef.current = selectPart;
  const select = useCallback((p: Part) => chooseRef.current(p), []);
  const chooseTopic = (t: Topic) => {
    tour.stop();
    setTopic(t);
    setSelected(TOPIC_PART[t]);
    setDisplay(
      t === "Full engine" || t === "Shock diamonds" || t === "Pogo suppression"
        ? "Assembled"
        : [
              "Turbopumps",
              "LPFTP dynamics",
              "Main combustion",
              "Cooling",
              "Thermal",
              "Nozzle",
              "Power flow",
            ].includes(t)
          ? "Cutaway"
          : "Flow",
    );
    camera(
      t === "Shock diamonds"
        ? "Plume"
        : t === "Follow LH₂"
          ? "Fuel side"
          : t === "Follow LOX"
            ? "Oxidizer side"
            : t === "Pressure"
              ? "Engine"
              : PART_VIEW[TOPIC_PART[t]],
    );
    if (t === "LPFTP dynamics") {
      setLPFTPCloseup(true);
      engine.settle();
      setPaused(false);
      controls.current?.scrollTo({ top: 0 });
    }
    showScene();
  };
  const reset = () => {
    showScene(0);
    controls.current?.scrollTo({ top: 0 });
    tour.reset();
    engine.stop();
    setPower(100);
    setAmbient(101325);
    setLPFTP(DEFAULT_LPFTP);
    setLPFTPCloseup(true);
    setPaused(false);
    setDisplay("Assembled");
    setTopic("Full engine");
    setSelected("engine");
    setLabelsOn(false);
    camera("Engine");
  };
  const changeDisplay = (d: Display) => {
    tour.stop();
    setDisplay(d);
    camera(
      d === "Exploded"
        ? "Exploded"
        : selected === "pogo" || selected.includes("tp")
          ? PART_VIEW[selected]
          : d === "Cutaway"
            ? "Cutaway"
            : "Engine",
    );
  };
  const inspectPlume = () => {
    chooseTopic("Shock diamonds");
    controls.current?.scrollTo({ top: 0 });
    if (!engine.snapshot.running) engine.settle();
    setPaused(false);
  };
  const closeNotes = useCallback(() => setNotes(false), []);
  const ready = engine.reveal.complete || !engine.snapshot.running;
  const studyingLPFTP = topic === "LPFTP dynamics";
  const lpState = lpftpState(
    power,
    engine.snapshot.running && engine.reveal.complete,
    lpftp,
  );
  const value = (v: number, d = 0) =>
    ready
      ? v.toLocaleString("en-US", {
          minimumFractionDigits: d,
          maximumFractionDigits: d,
        })
      : "—";
  return (
    <main
      className={`rs-lab ${studyingLPFTP ? "rs-lp-mode" : ""} ${display === "Cycle" ? "rs-cycle-mode" : ""} ${view === "Plume" ? "rs-plume-mode" : ""}`}
    >
      <LabNavigation
        active="rs25"
        onRestart={reset}
        onTour={() => {
          setPaused(false);
          tour.start();
          showScene();
        }}
        onHelp={() => setNotes(true)}
        touring={tour.active}
      />
      <section
        className="rs-stage"
        aria-label="Interactive RS-25 engine and propellant paths"
      >
        <div
          className="rs-canvas"
          style={{ visibility: display === "Cycle" ? "hidden" : "visible" }}
        >
          <SceneBoundary>
            <LabCanvas camera={{ position: CAMERAS.Engine.position, fov: 36 }}>
              <World
                live={engine.live}
                display={display}
                topic={topic}
                selected={selected}
                view={view}
                revision={revision}
                onSelect={select}
                labels={labels}
                lpftp={lpftp}
                lpftpCloseup={lpftpCloseup}
              />
            </LabCanvas>
          </SceneBoundary>
        </div>
        {display === "Cycle" ? (
          <Cycle
            selected={selected}
            onSelect={select}
            topic={topic}
            running={engine.snapshot.running}
            paused={paused}
            power={power}
          />
        ) : (
          <>
            {studyingLPFTP && (
              <CavityIndicator
                state={lpState}
                cycles={engine.snapshot.cavityCycles}
                paused={paused}
              />
            )}
            {LABEL_PARTS.map((p, i) => (
              <button
                key={p}
                ref={(el) => {
                  labels.current[i] = el;
                }}
                className={`rs-label ${selected === p ? "selected" : ""}`}
                style={{
                  display:
                    !studyingLPFTP && (labelsOn || selected === p)
                      ? "block"
                      : "none",
                }}
                onClick={() => select(p)}
                aria-label={`Inspect ${PARTS[p].short}`}
              >
                {PARTS[p].short}
                <ArrowRight size={10} />
              </button>
            ))}
            <div className="rs-scene-note">
              {studyingLPFTP
                ? "LPFTP INDUCER · VAPOR SIZE EXAGGERATED"
                : "RS-25-INSPIRED GEOMETRY"}
              <span>
                {studyingLPFTP
                  ? "Cavities pulse together · slowed 1,200× · drag to orbit"
                  : "Drag to orbit · scroll to inspect · click a component"}
              </span>
            </div>
          </>
        )}
      </section>
      <section className="rs-story">
        <p className="vl-eyebrow">
          <span>06</span> / PROPULSION SYSTEMS
        </p>
        <h1>
          {studyingLPFTP ? "Pressure." : "Power."}
          <br />
          <em>{studyingLPFTP ? "In pulses." : "In stages."}</em>
        </h1>
        <p>
          {studyingLPFTP
            ? "Inside the low-pressure fuel pump."
            : "Inside the RS-25."}
          <br />
          {studyingLPFTP
            ? "Separate blade tones from cavitation."
            : "Follow the flow. Find the thrust."}
        </p>
        <span className="rs-heritage">SHUTTLE HERITAGE → SLS</span>
      </section>
      <section
        ref={controls}
        className="rs-controls"
        aria-label="Engine controls"
      >
        <div className="rs-overline">
          THE ENGINE CYCLE <span>RS-25 / SSME</span>
        </div>
        <button
          className={`rs-start ${engine.snapshot.running ? "running" : ""}`}
          onClick={() => {
            tour.stop();
            setPaused(false);
            if (engine.snapshot.running) engine.stop();
            else {
              engine.start();
              showScene();
            }
          }}
        >
          <Power size={16} />
          {engine.snapshot.running ? "Shut down" : "Start engine"}
          <ArrowRight size={15} />
        </button>
        <div className="rs-start-status" role="status">
          <i className={engine.snapshot.running ? "on" : ""} />
          {engine.snapshot.running ? engine.reveal.stage : "Ready to explore"}
        </div>
        {engine.snapshot.running && !ready && (
          <div className="rs-start-progress">
            <i style={{ width: `${(engine.snapshot.phase / 8) * 100}%` }} />
          </div>
        )}
        <p className="rs-start-caption">
          Simplified startup reveal · not flight timing
        </p>
        <ParameterSlider
          label="Engine power level"
          min={67}
          max={109}
          step={0.5}
          value={power}
          unit="%"
          format={(n) => n.toFixed(n % 1 ? 1 : 0)}
          onValue={(v) => {
            tour.stop();
            setPower(v);
          }}
          marks={[67, 100, 109]}
        />
        <p className="rs-muted">
          % of original rated power · heritage envelope
        </p>
        <button
          className="rs-inspect-plume rs-lp-entry"
          onClick={() => chooseTopic("LPFTP dynamics")}
        >
          LPFTP tones & cavitation <span>↗</span>
        </button>
        <button className="rs-inspect-plume" onClick={inspectPlume}>
          Shock diamonds <span>↗</span>
        </button>
        <label className="rs-select-label">
          EXPLORE
          <select
            aria-label="Explore engine system"
            value={topic}
            onChange={(e) => chooseTopic(e.target.value as Topic)}
          >
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {!studyingLPFTP && (
          <>
            <div className="rs-follow">
              <button
                onClick={() => chooseTopic("Follow LH₂")}
                aria-pressed={topic === "Follow LH₂"}
              >
                ● Follow LH₂
              </button>
              <button
                onClick={() => chooseTopic("Follow LOX")}
                aria-pressed={topic === "Follow LOX"}
              >
                ◆ Follow LOX
              </button>
            </div>
            <details>
              <summary>Components & cameras</summary>
              <label className="rs-select-label">
                COMPONENT
                <select
                  aria-label="Inspect engine component"
                  value={selected}
                  onChange={(e) => select(e.target.value as Part)}
                >
                  {Object.entries(PARTS).map(([id, p]) => (
                    <option key={id} value={id}>
                      {p.short}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rs-select-label">
                CAMERA
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
                className="rs-text-button"
                aria-pressed={labelsOn}
                onClick={() => setLabelsOn(!labelsOn)}
              >
                {labelsOn ? "Hide" : "Show"} component labels
              </button>
            </details>
          </>
        )}
      </section>
      <aside className="rs-context" aria-label="Selected engine component">
        {selected === "lpftp" && !studyingLPFTP && (
          <button
            className="rs-inspect-plume"
            onClick={() => chooseTopic("LPFTP dynamics")}
          >
            Blade tones & cavitation <span>↗</span>
          </button>
        )}
        {studyingLPFTP && (
          <LPFTPContext
            state={lpState}
            settings={lpftp}
            paused={paused}
            onChange={(s) => {
              tour.stop();
              setLPFTP(s);
            }}
          />
        )}
        {topic !== "Shock diamonds" && !studyingLPFTP && (
          <Context
            selected={selected}
            state={engine.state}
            ready={ready}
            topic={topic}
          />
        )}
        {(selected === "engine" ||
          selected === "nozzle" ||
          topic === "Shock diamonds") && (
          <PlumeControls
            state={engine.state}
            ready={ready}
            ambient={ambient}
            onAmbient={(p) => {
              tour.stop();
              setAmbient(p);
            }}
            onInspect={inspectPlume}
          />
        )}
        <button className="rs-text-button" onClick={() => setNotes(true)}>
          Model & NASA references <BookOpen size={13} />
        </button>
      </aside>
      <div className="rs-display-controls">
        {studyingLPFTP ? (
          <>
            <button
              className="rs-lp-focus"
              onClick={() => {
                tour.stop();
                setLPFTPCloseup(!lpftpCloseup);
                setRevision((n) => n + 1);
              }}
            >
              {lpftpCloseup ? "Whole pump" : "Cavitation close-up"}
            </button>
            <button
              className="rs-lp-location"
              onClick={() => selectPart("lpftp")}
            >
              ← Engine location
            </button>
          </>
        ) : (
          <SegmentedControl
            label="Engine display"
            value={display}
            options={DISPLAYS.map((d) => ({ value: d, label: d }))}
            onChange={changeDisplay}
          />
        )}
        <button
          className="rs-pause"
          aria-label={paused ? "Resume animation" : "Pause animation"}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>
      <div className="rs-legend" aria-label="Flow legend">
        {LEGEND.map((l) => (
          <span key={l.key} style={{ color: COLORS[l.key] }}>
            <b>{l.symbol}</b>
            {l.label}
          </span>
        ))}
        <span style={{ color: "#ebcc96" }}>
          <b>↑</b>Thrust
        </span>
      </div>
      <section className="rs-dashboard" aria-label="Engine operating state">
        {studyingLPFTP ? (
          <LPFTPPlots
            state={lpState}
            shaftTurns={engine.snapshot.shaftTurns}
            cavityCycles={engine.snapshot.cavityCycles}
            ready={ready}
          />
        ) : (
          <>
            <div className="rs-main-metrics">
              <div className="rs-thrust">
                <span>
                  {ambient === 0
                    ? "MODELED VACUUM THRUST"
                    : "MODELED THRUST · AMBIENT"}
                </span>
                <strong>
                  {value(engine.state.thrust / 1e3)}
                  <small> kN</small>
                </strong>
                <em>{value(engine.state.thrust / LBF)} lbf</em>
              </div>
              <div className="rs-metrics">
                <div>
                  <span>CHAMBER PRESSURE</span>
                  <strong>
                    {value(engine.state.chamberPressure / 1e6, 1)}
                    <small> MPa</small>
                  </strong>
                </div>
                <div>
                  <span>LH₂ CONSUMPTION</span>
                  <strong>
                    {value(engine.state.fuel, 1)}
                    <small> kg/s</small>
                  </strong>
                </div>
                <div>
                  <span>LOX CONSUMPTION</span>
                  <strong>
                    {value(engine.state.oxidizer, 1)}
                    <small> kg/s</small>
                  </strong>
                </div>
                <p>
                  Representative operating map · readouts appear after startup
                  reveal
                </p>
              </div>
            </div>
            <Analysis topic={topic} state={engine.state} ready={ready} />
          </>
        )}
        <footer>
          <span>
            {paused
              ? "PAUSED"
              : engine.snapshot.running
                ? ready
                  ? "STEADY OPERATING MODEL"
                  : "SIMPLIFIED STARTUP REVEAL"
                : "ENGINE OFF"}
            <i />
          </span>
          <button onClick={() => setNotes(true)}>
            NASA ARCHITECTURE · MODEL ASSUMPTIONS ↗
          </button>
        </footer>
      </section>
      {tour.active && (
        <TourTransport
          title={TOUR[tour.index].title}
          copy={TOUR[tour.index].copy}
          index={tour.index}
          count={TOUR.length}
          time={tour.time}
          duration={tour.duration}
          paused={paused}
          onPause={() => setPaused(!paused)}
          onJump={tour.jump}
          onExit={tour.stop}
        />
      )}
      {tour.finished && (
        <div className="rs-tour-done">
          Tour complete · follow the propellant, or try a new power level.
        </div>
      )}
      <div className="rs-mobile-actions">
        <button onClick={reset}>
          <RotateCcw size={14} /> Reset
        </button>
        <button onClick={() => setNotes(true)}>
          <BookOpen size={14} /> Model notes
        </button>
      </div>
      {notes && <Notes close={closeNotes} />}
    </main>
  );
}
