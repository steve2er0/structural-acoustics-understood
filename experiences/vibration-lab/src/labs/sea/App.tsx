import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowRight, Pause, Play, RotateCcw, BookOpen } from "lucide-react";
import { LabNavigation } from "@components/LabNavigation";
import { ParameterSlider, SegmentedControl } from "@components/Controls";
import { TourTransport } from "@components/TourTransport";
import { LabCanvas, SceneBoundary } from "@engine/Scene";
import { useGuidedTour } from "@engine/useGuidedTour";
import {
  BANDS,
  JUNCTIONS,
  cavityPressure,
  zeroEnergy,
  DEFAULT,
  SUBSYSTEMS,
  PRESETS,
  balance,
  createModel,
  physicalTimeRate,
  presetSettings,
  settlingError,
  type Settings,
  type EnergyVector,
  type Preset,
} from "./physics";
import { useEnergy } from "./simulation";
import World, { CAMERAS, type View } from "./Scene";
import type { Display } from "./Assembly";
import {
  EnergyPlot,
  ModalPopulation,
  PowerBalance,
  energyText,
  frequencyText,
  powerText,
  type Metric,
  type Panel,
} from "./Plots";
import { TOUR, stageEnergy } from "./tour";
import Notes from "./Notes";
import { Network } from "./Network";
import { MATERIALS, CAVITY } from "./falcon";
import "./style.css";
const showScene = (top = 205) => {
  if (window.matchMedia("(max-width:700px)").matches)
    window.scrollTo({
      top,
      behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "instant"
        : "smooth",
    });
};
export default function SEAApp() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT }),
    [selected, setSelected] = useState(1),
    [view, setView] = useState<View>("System"),
    [revision, setRevision] = useState(0),
    [display, setDisplay] = useState<Display>("Average energy"),
    [panel, setPanel] = useState<Panel>("Energy"),
    [metric, setMetric] = useState<Metric>("Total energy"),
    [paused, setPaused] = useState(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [hold, setHold] = useState(false),
    [notes, setNotes] = useState(false),
    [preset, setPreset] = useState<string>("Baseline"),
    [junction, setJunction] = useState(1);
  const model = useMemo(() => createModel(settings), [settings]);
  const {
    live,
    snapshot,
    reset: resetEnergy,
  } = useEnergy(model, paused || hold);
  const labels = useRef<(HTMLButtonElement | null)[]>([]),
    controls = useRef<HTMLElement>(null);
  const energy = snapshot.energy,
    b = balance(model, energy),
    steady = settlingError(model, energy) < 0.002;
  const camera = (v: View) => {
    setView(v);
    setRevision((n) => n + 1);
  };
  const tour = useGuidedTour({
    steps: TOUR,
    paused,
    onSample: (s, _t, _p, entered) => {
      if (!entered) return;
      setSettings(s.settings);
      setSelected(s.selected);
      setDisplay(s.display);
      setPanel(s.panel);
      setMetric(s.metric);
      setHold(!!s.hold);
      camera(s.view);
      const e = stageEnergy(s);
      if (e) resetEnergy(e);
    },
  });
  const stop = () => {
    tour.stop();
    setHold(false);
  };
  const change = (patch: Partial<Settings>) => {
    stop();
    setPreset("Custom");
    if (patch.frequency !== undefined && patch.frequency !== settings.frequency)
      resetEnergy();
    if (patch.densityScale) resetEnergy([...live.current.energy]);
    setSettings((s) => ({ ...s, ...patch }));
  };
  const applyPreset = (name: Preset) => {
    stop();
    const next = presetSettings(name);
    if (next.frequency !== settings.frequency) resetEnergy();
    setSettings(next);
    setPreset(name);
    setPaused(false);
  };
  const choose = (i: number) => {
    stop();
    setSelected(i);
    camera(`Subsystem ${i + 1}` as View);
    showScene();
  };
  const chooseRef = useRef(choose);
  chooseRef.current = choose;
  const selectBay = useCallback((i: number) => chooseRef.current(i), []);
  const reset = () => {
    showScene(0);
    tour.reset();
    setSettings({ ...DEFAULT });
    resetEnergy();
    setSelected(1);
    setDisplay("Average energy");
    setPanel("Energy");
    setMetric("Total energy");
    setPaused(false);
    setHold(false);
    setPreset("Baseline");
    camera("System");
    if (controls.current) controls.current.scrollTop = 0;
  };
  const stepInput = () => {
    showScene();
    stop();
    setSettings((s) => ({ ...s, power: settings.power || 1 }));
    resetEnergy();
    setPaused(false);
    setPanel("Energy");
  };
  const equalEnergy = () => {
    stop();
    setSettings({ ...DEFAULT, power: 0 });
    resetEnergy(zeroEnergy().map(() => 0.02));
    setPaused(true);
    setSelected(4);
    setMetric("Energy per mode");
    setPanel("Energy");
    setDisplay("Average energy");
    setPreset("Equal total energy");
    camera("Energy flow");
  };
  const closeNotes = useCallback(() => setNotes(false), []);
  const loss = (v: number) => {
    const values: EnergyVector = [...settings.loss];
    values[selected] = v;
    change({ loss: values });
  };
  const density = (v: number) => {
    const values: EnergyVector = [...settings.densityScale];
    values[selected] = v;
    change({ densityScale: values });
  };
  return (
    <main className="sea-lab">
      <LabNavigation
        active="sea"
        onRestart={reset}
        onTour={() => {
          reset();
          tour.start();
        }}
        onHelp={() => setNotes(true)}
        touring={tour.active}
      />
      <section
        className="sea-stage"
        aria-label="Falcon 9 launch vehicle, six structural subsystems and a fairing acoustic cavity"
      >
        <SceneBoundary>
          <LabCanvas camera={{ position: CAMERAS.System.position, fov: 37 }}>
            <World
              model={model}
              live={live}
              display={display}
              selected={selected}
              perMode={metric === "Energy per mode"}
              onSelect={selectBay}
              view={view}
              revision={revision}
              labels={labels}
            />
          </LabCanvas>
        </SceneBoundary>
        {SUBSYSTEMS.map((p, i) => (
          <button
            key={i}
            className={`sea-label ${selected === i ? "selected" : ""}`}
            ref={(el) => {
              labels.current[i] = el;
            }}
            onClick={() => choose(i)}
            aria-label={`Select subsystem ${i + 1}: ${p.name}`}
            style={{
              color: p.color,
              display: selected === i ? "flex" : "none",
            }}
          >
            <span>
              0{i + 1} / {p.name.toUpperCase()}
            </span>
            <b>
              {energyText(
                metric === "Energy per mode"
                  ? energy[i] / model.count[i]
                  : energy[i],
              )}
            </b>
            <small>
              {metric === "Energy per mode"
                ? `PER MODE · N=${model.count[i].toFixed(0)}`
                : `${model.count[i].toFixed(0)} modes in band`}
            </small>
          </button>
        ))}
        {(view === "System" ||
          view === "Energy flow" ||
          view === "Power balance") && (
          <Network
            model={model}
            energy={energy}
            selected={selected}
            onSelect={choose}
          />
        )}
        <div className="sea-scene-caption">
          <b>
            {display === "Assembled"
              ? "FALCON 9 · VEHICLE OVERVIEW"
              : display === "Representative motion"
                ? "REPRESENTATIVE VIBRATION REALIZATION"
                : display === "Show modes"
                  ? "ILLUSTRATIVE MODAL COMPONENTS"
                  : "AVERAGE VIBRATIONAL ENERGY"}
          </b>
          <span>Falcon 9 · autoSEA geometry · colors identify subsystems</span>
          <span>
            SEA predicts averaged energy, not exact displacement or phase.
          </span>
        </div>
      </section>
      <section className="sea-story">
        <p className="vl-eyebrow">
          <span>05</span> / STATISTICAL ENERGY ANALYSIS
        </p>
        <h1>
          Falcon 9.
          <br />
          <em>Energy flows.</em>
        </h1>
        <p>Six structures. One acoustic cavity.</p>
        <div>
          INPUT <ArrowRight /> STORAGE <ArrowRight /> FLOW <ArrowRight /> LOSS
        </div>
      </section>
      <section
        ref={controls}
        className="sea-controls"
        aria-label="SEA experiment controls"
      >
        <div className="sea-section-label">
          EXCITE THE VEHICLE <span>FALCON 9</span>
        </div>
        <label className="sea-select-label">
          SOURCE
          <select
            aria-label="Input subsystem"
            value={settings.source}
            onChange={(e) => change({ source: Number(e.target.value) })}
          >
            {SUBSYSTEMS.map((p, i) => (
              <option key={p.id} value={i}>
                {i + 1} · {p.short}
              </option>
            ))}
          </select>
        </label>
        <ParameterSlider
          label="Input power"
          value={settings.power}
          min={0}
          max={2}
          step={0.05}
          unit="W"
          format={(v) => v.toFixed(2)}
          onValue={(power) => change({ power })}
        />
        <div className="sea-input-buttons">
          <button onClick={stepInput}>
            <Play size={12} /> Step input
          </button>
          <button onClick={() => change({ power: settings.power ? 0 : 1 })}>
            {settings.power ? "Power off" : "Inject 1 W"}
          </button>
        </div>
        <label className="sea-select-label">
          FREQUENCY BAND
          <select
            aria-label="Frequency band"
            value={settings.frequency}
            onChange={(e) => change({ frequency: Number(e.target.value) })}
          >
            {BANDS.map((f) => (
              <option key={f} value={f}>
                {frequencyText(f)}
              </option>
            ))}
          </select>
        </label>
        <small className="sea-muted">
          One-third-octave band · {model.bandwidth.toFixed(1)} Hz wide
        </small>
        <details>
          <summary>Junctions & experiments</summary>
          <label className="sea-select-label">
            PATH
            <select
              aria-label="Junction path"
              value={junction}
              onChange={(e) => setJunction(Number(e.target.value))}
            >
              {JUNCTIONS.map((j, i) => (
                <option key={i} value={i}>
                  {j.name}
                </option>
              ))}
            </select>
          </label>
          <ParameterSlider
            label={`Forward coupling η${JUNCTIONS[junction].a + 1}${JUNCTIONS[junction].b + 1}`}
            value={settings.coupling[junction]}
            min={0}
            max={0.04}
            step={0.0005}
            format={(v) => v.toFixed(4)}
            onValue={(v) =>
              change({
                coupling: settings.coupling.map((eta, i) =>
                  i === junction ? v : eta,
                ),
              })
            }
          />
          <small className="sea-muted">
            Illustrative CLFs · reverse factors follow modal-density
            reciprocity.
          </small>
          <label className="sea-select-label">
            EXPERIMENT
            <select
              aria-label="Experiment preset"
              value={preset}
              onChange={(e) => applyPreset(e.target.value as Preset)}
            >
              {!Object.keys(PRESETS).includes(preset) && (
                <option>{preset}</option>
              )}
              {Object.keys(PRESETS).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <button className="sea-text-button" onClick={equalEnergy}>
            Same energy, different modal populations ↗
          </button>
        </details>
      </section>
      <aside className="sea-insight" aria-label="Selected subsystem properties">
        <div className="sea-section-label">INSPECT A SUBSYSTEM</div>
        <label className="sea-select-label sea-subsystem-select">
          <select
            aria-label="Selected subsystem"
            value={selected}
            onChange={(e) => choose(Number(e.target.value))}
          >
            {SUBSYSTEMS.map((p, i) => (
              <option key={p.id} value={i}>
                {i + 1} · {p.name}
              </option>
            ))}
          </select>
          <button className="sea-text-button" onClick={() => camera("System")}>
            Whole vehicle ↗
          </button>
        </label>
        <h2>{SUBSYSTEMS[selected].name}.</h2>
        <p>{SUBSYSTEMS[selected].description}</p>
        <small className="sea-muted">
          {selected === 6
            ? `${CAVITY.volume} m³ · air · assumed interior`
            : `${SUBSYSTEMS[selected].area.toFixed(1)} m² · ${SUBSYSTEMS[selected].thickness * 1000} mm · ${MATERIALS[SUBSYSTEMS[selected].material].name}`}
        </small>
        <div
          className="sea-energy-readout"
          style={{ color: SUBSYSTEMS[selected].color }}
        >
          <span>
            STORED {selected === 6 ? "ACOUSTIC" : "VIBRATIONAL"} ENERGY
          </span>
          <strong>{energyText(energy[selected])}</strong>
          <small>Steady target {energyText(model.steady[selected])}</small>
          {selected === 6 && (
            <small>
              Diffuse-field pressure {cavityPressure(energy[6]).toFixed(3)} Pa
              RMS
            </small>
          )}
        </div>
        <div className="sea-mini-flows">
          <div>
            <span>Received</span>
            <b>{powerText(b.incoming[selected])}</b>
          </div>
          <div>
            <span>Dissipated ↓</span>
            <b>{powerText(b.dissipation[selected])}</b>
          </div>
          <div>
            <span>Sent onward</span>
            <b>{powerText(b.outgoing[selected])}</b>
          </div>
        </div>
        {selected === 6 ? (
          <ParameterSlider
            label="Cavity reverberation time"
            value={settings.cavityRT}
            min={0.2}
            max={3}
            step={0.1}
            unit="s"
            format={(v) => v.toFixed(1)}
            onValue={(cavityRT) => change({ cavityRT })}
          />
        ) : (
          <ParameterSlider
            label={`Internal loss η${selected + 1}`}
            value={settings.loss[selected]}
            min={0.001}
            max={0.08}
            step={0.001}
            format={(v) => v.toFixed(3)}
            onValue={loss}
          />
        )}
        <details>
          <summary>Modal population</summary>
          <ParameterSlider
            label={`Modal density scale ${selected + 1}`}
            value={settings.densityScale[selected]}
            min={0.25}
            max={4}
            step={0.25}
            unit="×"
            format={(v) => v.toFixed(2)}
            onValue={density}
          />
          <p className="sea-muted">
            n = {model.n[selected].toFixed(3)} modes/Hz
            <br />N ≈ {model.count[selected].toFixed(1)} modes in band
            <br />
            Overlap M ≈ {model.overlap[selected].toFixed(2)}
          </p>
          <button
            className="sea-text-button"
            onClick={() => {
              stop();
              setPanel("Modal population");
              setDisplay("Show modes");
            }}
          >
            See the modal population ↗
          </button>
        </details>
        <button className="sea-text-button" onClick={() => setNotes(true)}>
          Model & assumptions <BookOpen size={12} />
        </button>
      </aside>
      <div className="sea-view-tools">
        <SegmentedControl
          label="Structure visualization"
          value={display}
          options={(
            [
              "Assembled",
              "Average energy",
              "Representative motion",
              "Show modes",
            ] as const
          ).map((value) => ({
            value,
            label:
              value === "Assembled"
                ? "Vehicle"
                : value === "Representative motion"
                  ? "Motion"
                  : value === "Average energy"
                    ? "Energy"
                    : "Modes",
          }))}
          onChange={(v) => {
            stop();
            setDisplay(v);
            if (v === "Show modes") setPanel("Modal population");
          }}
        />
        <select
          aria-label="Camera preset"
          value={view}
          onChange={(e) => {
            stop();
            camera(e.target.value as View);
            if (e.target.value.startsWith("Subsystem"))
              setSelected(Number(e.target.value.split(" ")[1]) - 1);
          }}
        >
          {Object.keys(CAMERAS).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <button
          aria-label={paused || hold ? "Resume simulation" : "Pause simulation"}
          onClick={() => {
            if (hold) stop();
            setPaused(!(paused || hold));
          }}
        >
          {paused || hold ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <span>
          {Number((1 / physicalTimeRate(settings.frequency)).toFixed(1))}×
          SLOWER · {(snapshot.time * 1000).toFixed(0)} ms physical
        </span>
      </div>
      <section
        className="sea-data"
        aria-label="SEA energy and power accounting"
      >
        <div className="sea-data-head">
          <SegmentedControl
            label="Analysis view"
            value={panel}
            options={(
              ["Energy", "Power balance", "Modal population"] as const
            ).map((value, i) => ({ value, label: `0${i + 1} ${value}` }))}
            onChange={(v) => {
              stop();
              setPanel(v);
            }}
          />
          <span>
            {hold || paused
              ? "PAUSED"
              : steady
                ? "STEADY STATE"
                : "ENERGY BUILDING / REDISTRIBUTING"}{" "}
            <i />
          </span>
        </div>
        <div className="sea-global-balance">
          <span>
            INPUT <b>{powerText(settings.power)}</b>
          </span>
          <ArrowRight />
          <span>
            DISSIPATED <b>{powerText(b.dissipated)}</b>
          </span>
          <span>
            {b.storedPower >= 0 ? "+" : "−"} STORED / s{" "}
            <b>{powerText(Math.abs(b.storedPower))}</b>
          </span>
          <em
            title={`Input minus losses minus storage rate: ${b.residual.toExponential(2)} W`}
          >
            POWER BALANCE ✓
          </em>
        </div>
        {panel === "Energy" ? (
          <>
            <div className="sea-metric">
              <SegmentedControl
                label="Energy metric"
                value={metric}
                options={(["Total energy", "Energy per mode"] as const).map(
                  (value) => ({ value, label: value }),
                )}
                onChange={(v) => {
                  stop();
                  setMetric(v);
                }}
              />
              <span>solid: transient · dashed: steady target</span>
            </div>
            <EnergyPlot
              model={model}
              energy={energy}
              history={snapshot.history}
              metric={metric}
            />
          </>
        ) : panel === "Power balance" ? (
          <PowerBalance model={model} energy={energy} selected={selected} />
        ) : (
          <ModalPopulation model={model} energy={energy} selected={selected} />
        )}
        <div className="sea-data-foot">
          <span>
            SELECTED PATH: {JUNCTIONS[junction].a + 1}{" "}
            {b.flows[junction] < 0 ? "←" : "→"} {JUNCTIONS[junction].b + 1}{" "}
            <b>{powerText(Math.abs(b.flows[junction]))}</b> ·{" "}
            {JUNCTIONS[junction].name}
          </span>
          <button onClick={() => setNotes(true)}>
            {model.count.some((n) => n < 5)
              ? "FEW MODES · READ THE LIMITS"
              : "BAND-AVERAGED MODEL · ASSUMPTIONS ↗"}
          </button>
        </div>
      </section>
      {tour.active && (
        <TourTransport
          index={tour.index}
          count={TOUR.length}
          time={tour.time}
          duration={tour.duration}
          paused={paused}
          onPause={() => setPaused((p) => !p)}
          onJump={tour.jump}
          onExit={() => {
            stop();
            setPaused(false);
          }}
          title={TOUR[tour.index].title}
          copy={TOUR[tour.index].copy}
        />
      )}
      {tour.finished && (
        <div className="sea-tour-finished" role="status">
          Tour complete · follow the energy through your own experiment.
        </div>
      )}
      <div className="sea-mobile-footer">
        <button onClick={reset}>
          <RotateCcw size={13} /> Reset
        </button>
        <button onClick={() => setNotes(true)}>Model notes</button>
      </div>
      {notes && <Notes close={closeNotes} />}
    </main>
  );
}
