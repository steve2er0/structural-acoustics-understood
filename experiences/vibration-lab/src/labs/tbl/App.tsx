import { useCallback, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Wind,
} from "lucide-react";
import { LabNavigation } from "@components/LabNavigation";
import {
  EngineeringReadout,
  ParameterSlider,
  SegmentedControl,
} from "@components/Controls";
import { TourTransport } from "@components/TourTransport";
import { LabCanvas, SceneBoundary } from "@engine/Scene";
import { useGuidedTour } from "@engine/useGuidedTour";
import {
  DEFAULT,
  frequencyRange,
  modes,
  solve,
  type Field,
  type Settings,
} from "./physics";
import World, { CAMERAS, type View } from "./Scene";
import Plots, { type AnalysisTab } from "./Plots";
import Notes from "./Notes";
import { TOUR } from "./tour";
import "./style.css";

type Display = "Pressure" | "Response" | "Correlation";
const FIELD_NAMES: Record<Field, string> = {
  tbl: "Corcos turbulent boundary layer",
  daf: "Diffuse acoustic field",
  pwf: "Progressive plane wave",
};
const FIELD_COPY: Record<Field, string> = {
  tbl: "Pressure patches convect with the flow and lose coherence across the panel.",
  daf: "Many independent acoustic directions produce an isotropic spatial field.",
  pwf: "One acoustic direction. Full coherence, with a phase set by incidence.",
};
const number = (n: number) =>
  !Number.isFinite(n)
    ? "∞"
    : n === 0
      ? "0"
      : Math.abs(n) < 0.001 || Math.abs(n) >= 10000
        ? n.toExponential(2)
        : n.toLocaleString("en-US", {
            maximumFractionDigits: Math.abs(n) < 1 ? 3 : 2,
          });
const fix2 = (n: number) => n.toFixed(2);

export default function PanelFieldsLab() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT });
  const [view, setView] = useState<View>("Panel"),
    [revision, setRevision] = useState(0);
  const [display, setDisplay] = useState<Display>("Pressure"),
    [tab, setTab] = useState<AnalysisTab>("Coherence");
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [activeTap, setActiveTap] = useState<"A" | "B">("B"),
    [seed, setSeed] = useState(19);
  const [gain, setGain] = useState(2000),
    [notes, setNotes] = useState(false);
  const solution = useMemo(() => solve(settings), [settings]);
  const camera = (next: View) => {
    setView(next);
    setRevision((r) => r + 1);
  };
  const tour = useGuidedTour({
    steps: TOUR,
    paused,
    onSample(step, _time, _progress, entered) {
      if (!entered) return;
      const next = { ...DEFAULT, ...step.settings };
      if (step.resonance) {
        next.frequency = modes(next).find(
          (m) => m.m === next.modeX && m.n === next.modeY,
        )!.frequency;
        next.velocity =
          (2 * next.frequency * next.length) /
          next.modeX /
          next.convectionRatio;
      }
      setSettings(next);
      camera(step.view);
      setDisplay(step.display);
      setTab(step.tab);
      setSeed(19);
      setGain(2000);
    },
  });
  const change = (patch: Partial<Settings>) => {
    tour.stop();
    setSettings((s) => {
      const next = { ...s, ...patch };
      const range = frequencyRange(next);
      next.frequency = Math.max(
        range.minFrequency,
        Math.min(range.recommendedMaxFrequency, next.frequency),
      );
      next.bandwidth = Math.min(next.bandwidth, next.frequency * 0.1);
      return next;
    });
  };
  const restart = () => {
    tour.reset();
    setSettings({ ...DEFAULT });
    camera("Panel");
    setDisplay("Pressure");
    setTab("Coherence");
    setActiveTap("B");
    setSeed(19);
    setGain(2000);
    setNotes(false);
    setPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };
  const closeNotes = useCallback(() => setNotes(false), []);
  const place = (x: number, y: number) =>
    change(activeTap === "A" ? { ax: x, ay: y } : { bx: x, by: y });
  const mag = Math.hypot(solution.coherence.re, solution.coherence.im);
  const phase =
    (Math.atan2(solution.coherence.im, solution.coherence.re) * 180) / Math.PI;
  const detuning = (settings.frequency / solution.mode.frequency - 1) * 100;
  const wavelength = (2 * settings.length) / settings.modeX;
  const pressureRms = Math.sqrt(settings.pressurePsd * settings.bandwidth);
  const colorLimit =
    display === "Correlation"
      ? 1
      : display === "Pressure"
        ? 3 * pressureRms
        : 3e6 * solution.displacementRms;
  const unit =
    display === "Correlation" ? "Re Γ" : display === "Pressure" ? "Pa" : "µm";
  const currentCopy =
    settings.pressurePsd === 0
      ? "No pressure input: the panel response is zero. Coherence remains a normalized property of the chosen field."
      : settings.field === "tbl"
        ? `Convective wavelength ${number(solution.lambdaC)} m; panel-x modal wavelength ${number(wavelength)} m${settings.heading ? `, with flow rotated ${number(settings.heading)}°` : " along the flow"}. This mode accepts ${number(solution.acceptance * 100)}% of Φpp A²; excitation is ${number(Math.abs(detuning))}% ${detuning < 0 ? "below" : "above"} its resonance.`
        : settings.field === "daf"
          ? `The first correlation zero is ${number(solution.lambda0 / 2)} m from A. Directions combine statistically; the selected mode's accepted force PSD is ${number(solution.modalForcePsd)} N²/Hz.`
          : `The pressure remains fully coherent. ${settings.incidence === 0 ? "At normal incidence, surface pressure is in phase everywhere." : `At ${number(settings.incidence)}° incidence, its phase varies across the panel.`} Mode (${settings.modeX},${settings.modeY}) accepts ${number(solution.acceptance * 100)}% of Φpp A².`;

  return (
    <div className="tbl-lab">
      <LabNavigation
        active="tbl"
        onRestart={restart}
        onTour={() => {
          setPaused(false);
          tour.start();
        }}
        onHelp={() => setNotes(true)}
        touring={tour.active}
      />
      <main>
        <header className="tbl-heading">
          <div>
            <p className="vl-eyebrow">EXPERIMENT 08 / DISTRIBUTED PRESSURE</p>
            <h1>
              Same pressure.
              <br className="tbl-phone-break" /> <em>Different response.</em>
            </h1>
          </div>
          <p>
            A turbulent boundary layer, a diffuse field, a plane wave.
            <br />
            Discover which patterns this panel accepts.
          </p>
        </header>
        <div className="tbl-workbench">
          <aside className="tbl-controls" aria-label="Pressure field controls">
            <p className="tbl-section-title">
              <Wind size={15} /> SET THE FIELD
            </p>
            <SegmentedControl<Field>
              label="Pressure field"
              value={settings.field}
              options={[
                { value: "tbl", label: "Corcos" },
                { value: "daf", label: "DAF" },
                { value: "pwf", label: "PWF" },
              ]}
              onChange={(field) => change({ field })}
            />
            <p className="tbl-field-copy">{FIELD_COPY[settings.field]}</p>
            <ParameterSlider
              label="Frequency"
              value={settings.frequency}
              min={solution.minFrequency}
              max={solution.recommendedMaxFrequency}
              logarithmic
              unit="Hz"
              onValue={(frequency) => change({ frequency })}
              format={number}
            />
            <p className="tbl-control-hint">
              {number(solution.minFrequency)}–
              {number(solution.recommendedMaxFrequency)} Hz · range follows the
              panel's retained modes
            </p>
            {settings.field === "tbl" ? (
              <>
                <ParameterSlider
                  label="Convection velocity Uc"
                  value={solution.uc}
                  min={settings.velocity * 0.3}
                  max={settings.velocity * 0.95}
                  unit="m/s"
                  onValue={(uc) =>
                    change({ convectionRatio: uc / settings.velocity })
                  }
                  format={number}
                />
                <p className="tbl-control-hint">
                  {number(settings.convectionRatio)} U∞ · outer flow{" "}
                  {number(settings.velocity)} m/s
                </p>
                <div className="tbl-coefficients">
                  <ParameterSlider
                    label="Streamwise αx"
                    value={settings.alphaX}
                    min={0.06}
                    max={0.5}
                    step={0.01}
                    format={fix2}
                    onValue={(alphaX) => change({ alphaX })}
                  />
                  <ParameterSlider
                    label="Spanwise αy"
                    value={settings.alphaY}
                    min={0.2}
                    max={1.5}
                    step={0.01}
                    format={fix2}
                    onValue={(alphaY) => change({ alphaY })}
                  />
                </div>
                <ParameterSlider
                  label="Layer thickness δ99"
                  value={settings.delta * 1000}
                  min={5}
                  max={150}
                  step={1}
                  unit="mm"
                  onValue={(delta) => change({ delta: delta / 1000 })}
                />
                <details>
                  <summary>Outer flow & direction</summary>
                  <ParameterSlider
                    label="Outer velocity U∞"
                    value={settings.velocity}
                    min={40}
                    max={350}
                    step={1}
                    unit="m/s"
                    onValue={(velocity) => change({ velocity })}
                  />
                  <ParameterSlider
                    label="Flow heading"
                    value={settings.heading}
                    min={-90}
                    max={90}
                    step={1}
                    unit="°"
                    onValue={(heading) => change({ heading })}
                  />
                  <p>
                    δ99 provides a length scale and the layer drawing. Corcos
                    coherence depends on Uc, αx, αy and frequency.
                  </p>
                </details>
              </>
            ) : (
              <>
                <ParameterSlider
                  label="Sound speed"
                  value={settings.soundSpeed}
                  min={280}
                  max={380}
                  step={1}
                  unit="m/s"
                  onValue={(soundSpeed) => change({ soundSpeed })}
                />
                {settings.field === "pwf" && (
                  <>
                    <ParameterSlider
                      label="Incidence from normal"
                      value={settings.incidence}
                      min={0}
                      max={90}
                      step={1}
                      unit="°"
                      onValue={(incidence) => change({ incidence })}
                    />
                    <ParameterSlider
                      label="Wave azimuth"
                      value={settings.azimuth}
                      min={-180}
                      max={180}
                      step={1}
                      unit="°"
                      onValue={(azimuth) => change({ azimuth })}
                    />
                  </>
                )}
              </>
            )}
            <details>
              <summary>Pressure level & bandwidth</summary>
              <ParameterSlider
                label="Point-pressure PSD"
                value={settings.pressurePsd}
                min={0}
                max={10}
                step={0.1}
                unit="Pa²/Hz"
                onValue={(pressurePsd) => change({ pressurePsd })}
              />
              <ParameterSlider
                label="Equivalent narrow band Δf"
                value={settings.bandwidth}
                min={0.1}
                max={Math.min(20, settings.frequency * 0.1)}
                step={0.1}
                unit="Hz"
                onValue={(bandwidth) => change({ bandwidth })}
              />
              <p>
                Equal point PSD in all three fields. This band has{" "}
                {number(pressureRms)} Pa RMS. The band estimate assumes a
                locally constant spectrum.
              </p>
            </details>
            <button className="tbl-notes-link" onClick={() => setNotes(true)}>
              <BookOpen size={14} /> Equations & model notes{" "}
              <ArrowRight size={13} />
            </button>
          </aside>

          <section
            className="tbl-visual"
            aria-label="Three-dimensional panel experiment"
          >
            <div className="tbl-scene-heading">
              <span>{FIELD_NAMES[settings.field]}</span>
              <span>
                <i className={paused ? "" : "vl-status-dot"} />
                {paused ? "PAUSED" : "LIVE MODEL"}
              </span>
            </div>
            <div className="tbl-scene">
              <SceneBoundary>
                <LabCanvas
                  camera={{ position: CAMERAS.Panel.position, fov: 38 }}
                >
                  <World
                    settings={settings}
                    solution={solution}
                    paused={paused}
                    view={view}
                    revision={revision}
                    display={display}
                    activeTap={activeTap}
                    onPlace={place}
                    gain={gain}
                    seed={seed}
                  />
                </LabCanvas>
              </SceneBoundary>
            </div>
            <div className="tbl-scene-tools">
              <SegmentedControl<View>
                label="Panel camera"
                value={view}
                options={[
                  { value: "Panel", label: "Panel" },
                  { value: "Top", label: "Top" },
                  { value: "Boundary layer", label: "Layer" },
                ]}
                onChange={(next) => {
                  tour.stop();
                  camera(next);
                }}
              />
              <button
                aria-label={paused ? "Play animation" : "Pause animation"}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? <Play size={15} /> : <Pause size={15} />}
              </button>
              <button
                aria-label="Reset camera"
                onClick={() => setRevision((r) => r + 1)}
              >
                <RotateCcw size={15} />
              </button>
            </div>
            <div className="tbl-display-row">
              <SegmentedControl<Display>
                label="Surface display"
                value={display}
                options={[
                  { value: "Pressure", label: "Pressure" },
                  { value: "Response", label: "Response" },
                  { value: "Correlation", label: "Correlation" },
                ]}
                onChange={(next) => {
                  tour.stop();
                  setDisplay(next);
                }}
              />
              <div
                className="tbl-legend"
                aria-label={`Surface color range minus to plus ${number(colorLimit)} ${unit}`}
              >
                <span>−{number(colorLimit)}</span>
                <i />
                <span>
                  +{number(colorLimit)} {unit}
                </span>
              </div>
            </div>
            <p className="tbl-scene-caption">
              {display === "Correlation"
                ? "Real coherence relative to A · negative means opposite phase."
                : `Seeded narrowband realization ${seed} · color clips at the stated limits.`}{" "}
              <span>
                0.5 viewing cycles/s · {number(settings.frequency / 0.5)}×
                slower than physical time
              </span>
            </p>
            <div className="tbl-drawing-controls">
              <label htmlFor="tbl-gain">
                Displacement gain
                <select
                  id="tbl-gain"
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                >
                  {[1, 100, 500, 2000, 10000].map((value) => (
                    <option key={value} value={value}>
                      {value.toLocaleString()}×
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => {
                  tour.stop();
                  setSeed((n) => n + 1);
                }}
              >
                <Shuffle size={13} /> New realization
              </button>
            </div>
            {tour.active && (
              <TourTransport
                index={tour.index}
                count={TOUR.length}
                time={tour.time}
                duration={tour.duration}
                paused={paused}
                onPause={() => setPaused((p) => !p)}
                onJump={tour.jump}
                onExit={tour.stop}
                title={TOUR[tour.index].title}
                copy={TOUR[tour.index].copy}
              />
            )}
            {tour.finished && (
              <p className="tbl-tour-complete" role="status">
                Tour complete. Move a tap or change the field to continue
                exploring.
              </p>
            )}
          </section>

          <aside
            className="tbl-insight"
            aria-label="Calculated field and response"
          >
            <p className="tbl-section-title">READ THE COUPLING</p>
            <div className="tbl-hero-readout">
              <span>Acceleration at B</span>
              <strong>
                {number(solution.accelerationRms)}
                <small>m/s² RMS</small>
              </strong>
              <span>{number(settings.bandwidth)} Hz equivalent band</span>
            </div>
            <div className="tbl-stat-list" aria-live="polite">
              <EngineeringReadout
                label="A → B coherence |Γ|"
                value={mag}
                format={fix2}
              />
              <div className="tbl-mini-stat">
                <span>A → B phase</span>
                <b>{mag < 1e-7 ? "Undefined" : `${number(phase)}°`}</b>
              </div>
              {settings.field === "tbl" ? (
                <>
                  <EngineeringReadout
                    label="Convective wavelength λc"
                    value={solution.lambdaC}
                    unit="m"
                    format={number}
                  />
                  <EngineeringReadout
                    label="Streamwise e-fold length Lx"
                    value={solution.lx}
                    unit="m"
                    format={number}
                  />
                  <EngineeringReadout
                    label="Spanwise e-fold length Ly"
                    value={solution.ly}
                    unit="m"
                    format={number}
                  />
                  <EngineeringReadout
                    label="Convective delay Δs/Uc"
                    value={solution.delay * 1000}
                    unit="ms"
                    format={number}
                  />
                </>
              ) : (
                <EngineeringReadout
                  label="Acoustic wavelength λ0"
                  value={solution.lambda0}
                  unit="m"
                  format={number}
                />
              )}
            </div>
            <div className="tbl-mode-select">
              <span>INSPECT A PANEL MODE</span>
              <div>
                {["modeX", "modeY"].map((key, i) => (
                  <label key={key}>
                    {i ? "n" : "m"}
                    <select
                      aria-label={i ? "Spanwise mode n" : "Streamwise mode m"}
                      value={settings[key as "modeX" | "modeY"]}
                      onChange={(e) =>
                        change({ [key]: Number(e.target.value) })
                      }
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
            <p className="tbl-mode-note">
              ({settings.modeX},{settings.modeY}) ·{" "}
              {number(solution.mode.frequency)} Hz{" "}
              <button
                disabled={
                  solution.mode.frequency > solution.recommendedMaxFrequency ||
                  solution.mode.frequency < solution.minFrequency
                }
                title={
                  solution.mode.frequency > solution.recommendedMaxFrequency
                    ? "This resonance is outside the retained model's recommended range."
                    : "Set excitation to this resonance"
                }
                onClick={() => {
                  change({ frequency: solution.mode.frequency });
                  setTab("Response");
                  setDisplay("Response");
                }}
              >
                Tune to mode <ArrowRight size={12} />
              </button>
            </p>
            <div className="tbl-stat-list">
              <EngineeringReadout
                label="Joint acceptance J"
                value={solution.acceptance}
                format={number}
              />
              <EngineeringReadout
                label="Modal-force PSD"
                value={solution.modalForcePsd}
                unit="N²/Hz"
                format={number}
              />
            </div>
            <p className="tbl-interpretation" aria-live="polite">
              {currentCopy}
            </p>
            {settings.field === "tbl" && (
              <p className="tbl-scale-note">
                Lx/δ99 = {number(solution.lx / settings.delta)} · Ly/δ99 ={" "}
                {number(solution.ly / settings.delta)}
                <br />
                Reduced frequency ωδ99/U∞ = {number(solution.reducedFrequency)}
              </p>
            )}
            <details className="tbl-numerical" open={solution.notes.length > 0}>
              <summary>
                {solution.quadratureConverged && solution.modalConverged
                  ? "Numerical checks"
                  : "Approximation warning"}{" "}
                · {solution.retainedModes} modes
              </summary>
              <p>
                Spatial refinement: {number(solution.quadratureError * 100)}%
                change.
                <br />
                36 → 64 modes: {number(solution.modalConvergenceError * 100)}%
                response change.
                <br />
                First omitted mode: {number(solution.firstOmittedFrequency)} Hz.
              </p>
              {solution.notes.map((note) => (
                <p key={note} role="status">
                  {note}
                </p>
              ))}
            </details>
          </aside>
        </div>

        <section
          className="tbl-bench-settings"
          aria-label="Panel and pressure taps"
        >
          <details>
            <summary>
              Panel geometry & material{" "}
              <span>
                {number(settings.length)} × {number(settings.width)} m ·{" "}
                {number(settings.thickness * 1000)} mm · simply supported
              </span>
            </summary>
            <div className="tbl-input-grid">
              <label className="tbl-material">
                Material
                <select
                  aria-label="Panel material"
                  value={settings.young === 200e9 ? "Steel" : "Aluminum"}
                  onChange={(e) =>
                    change(
                      e.target.value === "Steel"
                        ? { young: 200e9, density: 7850, poisson: 0.3 }
                        : { young: 69e9, density: 2700, poisson: 0.33 },
                    )
                  }
                >
                  <option>Aluminum</option>
                  <option>Steel</option>
                </select>
                <small>
                  E {number(settings.young / 1e9)} GPa · ρ{" "}
                  {number(settings.density)} kg/m³ · ν {settings.poisson}
                </small>
              </label>
              <ParameterSlider
                label="Panel length L"
                value={settings.length}
                min={0.4}
                max={1.6}
                step={0.01}
                unit="m"
                format={fix2}
                onValue={(length) => change({ length })}
              />
              <ParameterSlider
                label="Panel width W"
                value={settings.width}
                min={0.3}
                max={1}
                step={0.01}
                unit="m"
                format={fix2}
                onValue={(width) => change({ width })}
              />
              <ParameterSlider
                label="Panel thickness h"
                value={settings.thickness * 1000}
                min={1}
                max={6}
                step={0.1}
                unit="mm"
                onValue={(thickness) => change({ thickness: thickness / 1000 })}
              />
              <ParameterSlider
                label="Damping ratio ζ"
                value={settings.damping}
                min={0.005}
                max={0.06}
                step={0.001}
                format={(n) => `${number(n * 100)}%`}
                onValue={(damping) => change({ damping })}
              />
            </div>
          </details>
          <details>
            <summary>
              Move the pressure taps{" "}
              <span>Click the panel or use the position controls</span>
            </summary>
            <div className="tbl-tap-controls">
              <SegmentedControl<"A" | "B">
                label="Active pressure tap"
                value={activeTap}
                options={[
                  { value: "A", label: "Move A · reference" },
                  { value: "B", label: "Move B · response" },
                ]}
                onChange={setActiveTap}
              />
              <ParameterSlider
                label={`Tap ${activeTap} x / L`}
                value={activeTap === "A" ? settings.ax : settings.bx}
                min={0}
                max={1}
                step={0.01}
                format={fix2}
                onValue={(value) =>
                  change(activeTap === "A" ? { ax: value } : { bx: value })
                }
              />
              <ParameterSlider
                label={`Tap ${activeTap} y / W`}
                value={activeTap === "A" ? settings.ay : settings.by}
                min={0}
                max={1}
                step={0.01}
                format={fix2}
                onValue={(value) =>
                  change(activeTap === "A" ? { ay: value } : { by: value })
                }
              />
            </div>
            <p>
              Tap A defines the correlation reference. Tap B is also the
              response observation point; moving it changes which modal nodes
              and antinodes are sampled.
            </p>
          </details>
        </section>

        <section className="tbl-analysis" aria-label="Field analysis">
          <header>
            <div>
              <p className="vl-eyebrow">FOLLOW THE MECHANISM</p>
              <h2>From pressure to panel motion.</h2>
            </div>
            <SegmentedControl<AnalysisTab>
              label="Analysis view"
              value={tab}
              options={[
                { value: "Coherence", label: "01 Coherence" },
                { value: "Wavenumber", label: "02 Wavenumber" },
                { value: "Response", label: "03 Response" },
              ]}
              onChange={(next) => {
                tour.stop();
                setTab(next);
              }}
            />
          </header>
          <Plots
            settings={settings}
            solution={solution}
            onChange={change}
            tab={tab}
          />
        </section>
        <footer className="tbl-footer">
          <span>
            Linear thin panel · equal point-pressure PSD · one-way excitation
          </span>
          <button onClick={() => setNotes(true)}>
            Assumptions, numerical limits & references <ArrowRight size={13} />
          </button>
        </footer>
      </main>
      {notes && <Notes close={closeNotes} />}
    </div>
  );
}
