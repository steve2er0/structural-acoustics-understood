import { useCallback, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Pause,
  Play,
  RotateCcw,
  Wind,
} from "lucide-react";
import { LabNavigation } from "@components/LabNavigation";
import {
  ParameterSlider,
  SegmentedControl,
  Toggle,
} from "@components/Controls";
import { TourTransport } from "@components/TourTransport";
import { LabCanvas, SceneBoundary } from "@engine/Scene";
import { useGuidedTour } from "@engine/useGuidedTour";
import {
  DEFAULT,
  PRESETS,
  physicalTimeRate,
  pathLength,
  solve,
  type Settings,
} from "./physics";
import { useWakeClock } from "./simulation";
import World, { CAMERAS, type View } from "./Scene";
import { FrequencyPlot, ConvectionPlot } from "./Plots";
import { TOUR } from "./tour";
import Notes from "./Notes";
import PressurePanel, { PressureLegend, AttachmentMap } from "./PressurePanel";
import {
  clampTap,
  DEFAULT_TAPS,
  MAX_MODE_RATIO,
  harmonicComparisonTaps,
  PRESSURE_DEFAULT,
  type PressureSettings,
  type PressureTap,
  type PressureUnit,
} from "./pressure";
import "./style.css";
const fixed = (n: number) => n.toFixed(2);
const angle = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(0)}`;
export default function VortexApp() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT, alpha: 0 });
  const [view, setView] = useState<View>("Vehicle"),
    [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(0),
    [wakes, setWakes] = useState(true),
    [notes, setNotes] = useState(false);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [playback, setPlayback] = useState(0.5),
    [preset, setPreset] = useState("Axial flight");
  const model = useMemo(() => solve(settings), [settings]);
  const [pressureEnabled, setPressureEnabled] = useState(true);
  const [pressureSettings, setPressureSettings] = useState<PressureSettings>({
    ...PRESSURE_DEFAULT,
  });
  const [taps, setTaps] = useState<[PressureTap, PressureTap]>(DEFAULT_TAPS);
  const [activeTap, setActiveTap] = useState(0);
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>("cp");
  const [pressureLimit, setPressureLimit] = useState(0.1);
  const pressureTaps = useMemo(
    () => taps.map((t) => clampTap(t, model)) as [PressureTap, PressureTap],
    [taps, model],
  );
  const clockPlayback =
    playback *
    Math.min(
      1,
      4 /
        (physicalTimeRate(model, 1) *
          pressureSettings.frequency *
          MAX_MODE_RATIO),
    );
  const clock = useWakeClock(model, paused, clockPlayback);
  const placeTap = (tap: PressureTap) => {
    tour.stop();
    const next = clampTap(tap, model);
    setTaps(
      (current) =>
        current.map((t, i) => (i === activeTap ? next : t)) as [
          PressureTap,
          PressureTap,
        ],
    );
    setSelected(next.body);
  };
  const changePressure = (patch: Partial<PressureSettings>) => {
    tour.stop();
    setPressureSettings((s) => ({ ...s, ...patch }));
    clock.reset();
  };
  const camera = (v: View) => {
    setView(v);
    setRevision((n) => n + 1);
  };
  const tour = useGuidedTour({
    steps: TOUR,
    paused,
    onSample: (step, _t, _p, entered) => {
      if (!entered) return;
      setSettings(step.settings);
      camera(step.view);
      setSelected(0);
      setWakes(true);
      setPreset("Tour");
      clock.reset();
    },
  });
  const change = (patch: Partial<Settings>) => {
    tour.stop();
    setPreset("Custom");
    setSettings((s) => ({ ...s, ...patch }));
    clock.reset();
    if (patch.boosters === false) setSelected(0);
  };
  const pick = (i: number) => {
    tour.stop();
    setSelected(i);
  };
  const applyPreset = (name: string) => {
    const p = PRESETS.find((p) => p.name === name);
    if (!p) return;
    tour.stop();
    setSettings({ ...p.settings });
    setPreset(p.name);
    setSelected(0);
    clock.reset();
  };
  const reset = () => {
    tour.reset();
    setSettings({ ...DEFAULT, alpha: 0 });
    setSelected(0);
    camera("Vehicle");
    setWakes(true);
    setPressureEnabled(true);
    setPressureSettings({ ...PRESSURE_DEFAULT });
    setTaps(DEFAULT_TAPS);
    setActiveTap(0);
    setPressureUnit("cp");
    setPressureLimit(0.1);
    setPreset("Axial flight");
    setPlayback(0.5);
    setPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    clock.reset();
  };
  const closeNotes = useCallback(() => setNotes(false), []);
  const body =
    model.bodies.find((b) => b.index === selected) ?? model.bodies[0];
  const noWake = model.speed === 0 || !settings.boosters;
  const phase = (clock.snapshot.travel % pathLength(body)) / pathLength(body);
  const compressed = settings.mach > 0.3;
  return (
    <div className="vx-lab">
      <LabNavigation
        active="vortex"
        onRestart={reset}
        onHelp={() => setNotes(true)}
        onTour={() => {
          setPaused(false);
          tour.start();
        }}
        touring={tour.active}
      />
      <main>
        <header className="vx-heading">
          <div>
            <p className="vl-eyebrow">
              EXPERIMENT 07 / AERODYNAMIC UNSTEADINESS
            </p>
            <h1>
              See the pressure <em>take shape.</em>
            </h1>
          </div>
          <p>
            Attachment wakes on a multi-body launch vehicle.
            <br />
            Forward bracket → shed wake → pressure on the core and boosters.
          </p>
        </header>
        <div className="vx-workbench">
          <aside className="vx-controls" aria-label="Flow controls">
            <div className="vx-section-title">
              <Wind size={15} />
              <span>SET THE FLOW</span>
              <b>{preset === "Custom" ? "CUSTOM" : "PRESET"}</b>
            </div>
            <ParameterSlider
              label="Mach number"
              value={settings.mach}
              min={0}
              max={2}
              step={0.01}
              format={fixed}
              onValue={(mach) => change({ mach })}
            />
            <div className="vx-range-label">
              <span>0 · still air</span>
              <span>2 · supersonic</span>
            </div>
            <ParameterSlider
              label="Angle of attack · α"
              aria-label="Angle of attack"
              value={settings.alpha}
              min={-30}
              max={30}
              step={1}
              unit="°"
              format={angle}
              onValue={(alpha) => change({ alpha })}
            />
            <div className="vx-range-label">
              <span>−30°</span>
              <span>pitch</span>
              <span>+30°</span>
            </div>
            <ParameterSlider
              label="Sideslip · β"
              aria-label="Sideslip"
              value={settings.beta}
              min={-30}
              max={30}
              step={1}
              unit="°"
              format={angle}
              onValue={(beta) => change({ beta })}
            />
            <div className="vx-range-label">
              <span>−30°</span>
              <span>yaw</span>
              <span>+30°</span>
            </div>
            <label className="vx-select-label" htmlFor="vx-preset">
              COMPARE A FLOW CONDITION
            </label>
            <select
              id="vx-preset"
              value={preset}
              onChange={(e) => applyPreset(e.target.value)}
            >
              {(preset === "Custom" || preset === "Tour") && (
                <option value={preset}>{preset}</option>
              )}
              {PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="vx-preset-copy">
              {PRESETS.find((p) => p.name === preset)?.copy ??
                "Explore your own combination."}
            </p>
            <details>
              <summary>Geometry & assumptions</summary>
              <Toggle
                checked={settings.boosters}
                onChange={(boosters) => change({ boosters })}
                className="vx-toggle"
              >
                {settings.boosters ? "●" : "○"} Two strap-on boosters
              </Toggle>
              <ParameterSlider
                label="Barrel gap"
                value={settings.gap}
                min={0.15}
                max={3}
                step={0.05}
                format={fixed}
                unit="m"
                disabled={!settings.boosters}
                onValue={(gap) => change({ gap })}
              />
              <ParameterSlider
                label="Assumed Strouhal · St"
                value={settings.strouhal}
                min={0.1}
                max={0.35}
                step={0.01}
                format={fixed}
                onValue={(strouhal) => change({ strouhal })}
              />
              <p>
                Generic geometry. Fixed air at 15 °C. St is prescribed, not
                fitted to this launcher.
              </p>
            </details>
            <button className="vx-notes-link" onClick={() => setNotes(true)}>
              <BookOpen size={13} /> Equations & model limits{" "}
              <ArrowUpRight size={13} />
            </button>
          </aside>
          <section
            className="vx-visual"
            aria-label="Interactive launch vehicle wake"
          >
            <div className="vx-scene-header">
              <span>
                <i />
                {view === "Cross-section"
                  ? "MIDBODY CUT / LOOKING AFT"
                  : settings.boosters
                    ? "MULTI-BODY LAUNCH VEHICLE"
                    : "ISOLATED CORE"}
              </span>
              <span>{paused ? "PAUSED" : "LIVE"} / 3D</span>
            </div>
            <div className="vx-stage">
              <SceneBoundary>
                <LabCanvas
                  camera={{ position: CAMERAS.Vehicle.position, fov: 37 }}
                  shadows={false}
                  aria-label={
                    settings.boosters
                      ? "Three-dimensional core and two boosters with forward attachment wakes and surface pressure"
                      : "Three-dimensional isolated core with no attachment wake source"
                  }
                >
                  <World
                    model={model}
                    live={clock.live}
                    selected={selected}
                    onSelect={pick}
                    view={view}
                    revision={revision}
                    wakes={wakes}
                    paintPressure={pressureEnabled}
                    pressure={{
                      settings: pressureSettings,
                      unit: pressureUnit,
                      limit: pressureLimit,
                      taps: pressureTaps,
                      activeTap,
                      onPlace: placeTap,
                    }}
                  />
                </LabCanvas>
              </SceneBoundary>
              <div className="vx-scene-legend">
                <span>
                  <i className="vx-orange" />
                  One rotation sense
                </span>
                <span>
                  <i className="vx-teal" />
                  Opposite rotation
                </span>
                <span>
                  <i className="vx-blue" />
                  Relative air · nose → aft
                </span>
              </div>
              {pressureEnabled && view !== "Cross-section" && (
                <div className="vx-skin-legend">
                  <b>SURFACE FLUCTUATION · ASSUMED FIELD</b>
                  <PressureLegend unit={pressureUnit} limit={pressureLimit} />
                  <span>Click skin → Tap {activeTap ? "B" : "A"}</span>
                </div>
              )}
              {view === "Cross-section" && !noWake && (
                <div className="vx-cut-label">
                  ⊗ AXIAL FLOW INTO PAGE · {model.axialSpeed.toFixed(1)} m/s
                </div>
              )}
              {noWake && (
                <div className="vx-no-wake">
                  <Wind size={22} />
                  <strong>
                    {model.speed === 0
                      ? "Still air."
                      : model.crossSpeed < 1e-8
                        ? "No attachment source."
                        : "No attachment source."}
                  </strong>
                  <p>
                    {model.speed === 0
                      ? "Increase Mach to introduce flow."
                      : "Restore the boosters to restore the forward attachments and their wake."}
                  </p>
                </div>
              )}
              <div className="vx-scene-foot">
                <span>
                  {pressureEnabled
                    ? "PRESCRIBED PRESSURE · NOT CFD"
                    : "ILLUSTRATIVE WAKE · NOT CFD"}
                </span>
                <span>DRAG TO ORBIT · SCROLL TO ZOOM</span>
              </div>
            </div>
            <div className="vx-scene-tools">
              <Toggle checked={pressureEnabled} onChange={setPressureEnabled}>
                Surface pressure
              </Toggle>
              <SegmentedControl
                label="Camera view"
                value={view}
                options={(
                  ["Vehicle", "Attachment", "Cross-section", "Wake"] as View[]
                ).map((v) => ({ value: v, label: v }))}
                onChange={(v) => {
                  tour.stop();
                  camera(v);
                }}
              />
              <button
                onClick={() => camera(view)}
                aria-label="Reset camera"
                title="Reset camera"
              >
                <RotateCcw size={14} />
              </button>
              <Toggle checked={wakes} onChange={setWakes}>
                Attachment wake
              </Toggle>
            </div>
            <div className="vx-transport">
              <button
                className="vx-play"
                onClick={() => setPaused((v) => !v)}
                aria-label={paused ? "Play wake" : "Pause wake"}
              >
                {paused ? <Play size={13} /> : <Pause size={13} />}
                {paused ? "Play" : "Pause"}
              </button>
              <label>
                Playback
                <select
                  aria-label="Playback speed"
                  value={playback}
                  onChange={(e) => setPlayback(Number(e.target.value))}
                >
                  <option value={0.25}>¼ speed</option>
                  <option value={0.5}>½ speed</option>
                  <option value={1}>Full speed</option>
                </select>
              </label>
              <span>
                {physicalTimeRate(model, clockPlayback).toFixed(3)}× PHYSICAL
                TIME
              </span>
            </div>
          </section>
          <aside className="vx-insight" aria-label="Wake diagnostics">
            <div className="vx-section-title">
              <span>READ THE WAKE</span>
              <b>AXIAL CUT</b>
            </div>
            <AttachmentMap
              model={model}
              settings={pressureSettings}
              time={clock.snapshot.time}
              unit={pressureUnit}
              limit={pressureLimit}
              selected={selected}
              onSelect={pick}
            />
            <label className="vx-select-label" htmlFor="vx-body">
              INSPECT A BODY
            </label>
            <select
              id="vx-body"
              value={selected}
              onChange={(e) => pick(Number(e.target.value))}
            >
              {model.bodies.map((b) => (
                <option key={b.index} value={b.index}>
                  {b.name} · Ø {b.diameter.toFixed(1)} m
                </option>
              ))}
            </select>
            <div className="vx-frequency">
              <span>AXIAL AIR VELOCITY</span>
              <output>
                {model.axialSpeed.toFixed(1)}
                <small> m/s</small>
              </output>
              <p>Uaxial = U · cos α · cos β</p>
            </div>
            <div className="vx-phase-track">
              <span
                style={{
                  left: `${phase * 100}%`,
                  background: "#80baee",
                }}
              />
            </div>
            <div className="vx-facts">
              <div>
                <span>Crossflow speed</span>
                <b>{model.crossSpeed.toFixed(1)} m/s</b>
              </div>
              <div>
                <span>Total air speed</span>
                <b>{model.speed.toFixed(1)} m/s</b>
              </div>
              <div>
                <span>Resultant incidence</span>
                <b>{model.incidence.toFixed(1)}°</b>
              </div>
              <div>
                <span>Crossflow Mach</span>
                <b>{model.crossMach.toFixed(3)}</b>
              </div>
              <div>
                <span>Reynolds · Re⊥</span>
                <b>{body.reynolds.toExponential(2)}</b>
              </div>
            </div>
            <p className="vx-context">
              {model.speed === 0
                ? "No air motion at zero Mach. Increase speed to restore the attachment wake and its pressure fluctuations."
                : noWake
                  ? "No forward attachment hardware remains with the boosters removed. Its pressure contribution is zero."
                  : "The golden forward attachments are the wake sources. Roll-up packets convect aft through each gap and load the facing surfaces. This mechanism persists at zero incidence. The 1× flank mode changes sign across the wake; 2× is strongest on its centerline. Amplitudes are prescribed."}
            </p>
          </aside>
        </div>
        {
          <PressurePanel
            model={model}
            settings={pressureSettings}
            onSettings={changePressure}
            time={clock.snapshot.time}
            selected={selected}
            taps={pressureTaps}
            activeTap={activeTap}
            onActive={setActiveTap}
            onCompare={() => {
              tour.stop();
              setTaps(harmonicComparisonTaps(model, selected));
              setActiveTap(1);
            }}
            onPlace={placeTap}
            unit={pressureUnit}
            onUnit={(unit) => {
              setPressureUnit(unit);
              setPressureLimit(unit === "cp" ? 0.1 : 2000);
            }}
            limit={pressureLimit}
            onLimit={setPressureLimit}
          />
        }
        <section
          className={`vx-model-strip ${compressed ? "vx-extrapolated" : ""}`}
          aria-live="polite"
        >
          <span>{compressed ? "EXTRAPOLATION" : "ATTACHMENT WAKE"}</span>
          <p>
            {compressed
              ? "Above Mach 0.3, compressible effects need a different model. Paths remain illustrative; shocks and transonic buffet are not solved."
              : "Forward booster/core attachments generate the illustrated wake. Its pressure field is prescribed; shock interaction, gap amplification and aerodynamic loads are not solved."}
          </p>
          <button onClick={() => setNotes(true)}>
            Model notes <ArrowUpRight size={12} />
          </button>
        </section>
        <details className="vx-background-models">
          <summary>
            Separate reference models · cylinder scale and forebody vortices
          </summary>
          <section
            className="vx-plots"
            aria-label="Separate background reference models"
          >
            <article>
              <div className="vx-plot-title">
                <div>
                  <p className="vl-eyebrow">01 / CROSSFLOW REFERENCE</p>
                  <h2>A reference scale, not a prediction.</h2>
                </div>
                <div className="vx-plot-key">
                  <span>— Core</span>
                  {settings.boosters && <span>┄ Boosters</span>}
                </div>
              </div>
              <FrequencyPlot model={model} />
              <p>
                St · U⊥ / D is a cylinder-based frequency scale. It does not
                imply periodic shedding of these longitudinal vortices.
              </p>
            </article>
            <article>
              <div className="vx-plot-title">
                <div>
                  <p className="vl-eyebrow">02 / SPATIAL DEVELOPMENT</p>
                  <h2>Along the vehicle, then aft.</h2>
                </div>
                <span className="vx-plot-key">
                  {`${(0.65 * model.axialSpeed).toFixed(1)} m/s convection`}
                </span>
              </div>
              <ConvectionPlot
                model={model}
                clock={clock.snapshot}
                selected={selected}
              />
              <p>
                Both vortices coexist along the barrel. Tracers travel
                downstream on a shared clock; the paths do not alternate from
                side to side.
              </p>
            </article>
          </section>
        </details>
        <footer className="vx-footer">
          <span>VORTEX SHEDDING / EXPERIMENT 07</span>
          <span>
            Generic launcher · Three-dimensional illustration · Explicit
            assumptions
          </span>
        </footer>
      </main>
      {tour.active && (
        <TourTransport
          index={tour.index}
          count={TOUR.length}
          time={tour.time}
          duration={tour.duration}
          paused={paused}
          onPause={() => setPaused((v) => !v)}
          onJump={tour.jump}
          onExit={tour.stop}
          title={TOUR[tour.index].title}
          copy={TOUR[tour.index].copy}
        />
      )}
      {notes && <Notes close={closeNotes} />}
    </div>
  );
}
