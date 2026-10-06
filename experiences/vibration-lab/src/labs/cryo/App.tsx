import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Droplets,
  Pause,
  Play,
  RotateCcw,
  Waves,
} from "lucide-react";
import { LabNavigation } from "@components/LabNavigation";
import { ParameterSlider, SegmentedControl } from "@components/Controls";
import { TourTransport } from "@components/TourTransport";
import { LabCanvas, SceneBoundary } from "@engine/Scene";
import { useGuidedTour } from "@engine/useGuidedTour";
import {
  DEFAULT,
  findMode,
  solve,
  type Settings,
  type CaseId,
} from "./physics";
import World, { CAMERAS, type View } from "./Scene";
import Plots, { CASES, type Selection } from "./Plots";
import Notes from "./Notes";
import Equations from "./Equations";
import { TOUR, type Display, type AnalysisTab } from "./tour";
import "./style.css";
const format = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { maximumFractionDigits: digits });
const INITIAL: Selection = { kind: "shell", n: 2, axialOrder: 1, sloshId: 1 };
const SHELL_NAMES = [
  "Breathing",
  "Bending",
  "Ovalization",
  "Three-lobe",
  "Four-lobe",
];
export default function CryoLab() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT });
  const [caseId, setCase] = useState<CaseId>("coupled");
  const [selection, setSelection] = useState<Selection>({ ...INITIAL });
  const [display, setDisplay] = useState<Display>("Mode shape");
  const [view, setView] = useState<View>("Section"),
    [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<AnalysisTab>("Compare");
  const [notes, setNotes] = useState(false),
    [gain, setGain] = useState(1);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const solution = useMemo(() => solve(settings), [settings]);
  const selected = findMode(solution, caseId, selection);
  const availableOrders = [1, 2, 3].filter(
    (axialOrder) =>
      !!findMode(solution, caseId, {
        kind: "shell",
        n: selection.n,
        axialOrder,
      }),
  );
  const mode = selected ?? findMode(solution, "coupled", INITIAL)!;
  const active =
    !!selected &&
    (selection.kind !== "slosh" || (settings.fill > 0 && settings.fill < 1));
  useEffect(() => {
    if (selection.kind === "shell" && !selected && availableOrders.length)
      setSelection((s) => ({ ...s, axialOrder: availableOrders[0] }));
  }, [selected, selection.kind]);
  const caseData = CASES.find((c) => c.id === caseId)!;
  const dry = findMode(solution, "dry", { ...selection, kind: "shell" });
  const frequencyChange =
    selected && dry ? (selected.frequency / dry.frequency - 1) * 100 : 0;
  const camera = (v: View) => {
    setView(v);
    setRevision((r) => r + 1);
  };
  const tour = useGuidedTour({
    steps: TOUR,
    paused,
    onSample(step, _time, _progress, entered) {
      if (!entered) return;
      setSettings({ ...DEFAULT, ...step.settings });
      setCase(step.caseId);
      setDisplay(step.display);
      setTab(step.tab);
      setSelection({
        ...INITIAL,
        kind: step.kind,
        n: step.n,
        sloshId: step.sloshId,
      });
      setGain(1);
      camera(step.view);
    },
  });
  const change = (patch: Partial<Settings>) => {
    tour.stop();
    setSettings((s) => ({ ...s, ...patch }));
  };
  const chooseCase = (id: CaseId) => {
    tour.stop();
    setCase(id);
    if (selection.kind === "slosh" && id !== "coupled")
      setSelection((s) => ({ ...s, kind: "shell" }));
  };
  const chooseSlosh = (id: number) => {
    tour.stop();
    setCase("coupled");
    setSelection((s) => ({ ...s, kind: "slosh", sloshId: id }));
    setDisplay("Fluid motion");
  };
  const restart = () => {
    tour.reset();
    setSettings({ ...DEFAULT });
    setCase("coupled");
    setSelection({ ...INITIAL });
    setDisplay("Mode shape");
    setTab("Compare");
    setGain(1);
    setPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    camera("Section");
  };
  const liquidName =
    settings.fluid === "lox" ? "Liquid oxygen" : "Liquid hydrogen";
  return (
    <div className="cryo-lab">
      <LabNavigation
        active="cryo"
        onRestart={restart}
        onTour={() => {
          setPaused(false);
          tour.start();
        }}
        onHelp={() => setNotes(true)}
        touring={tour.active}
      />
      <main>
        <header className="cryo-heading">
          <div>
            <p className="vl-eyebrow">
              EXPERIMENT 09 / FLUID–STRUCTURE DYNAMICS
            </p>
            <h1>
              Fill the tank.
              <br className="cryo-phone-break" /> <em>Change the mode.</em>
            </h1>
          </div>
          <p>
            Liquid inertia. Pressure prestress. A moving free surface.
            <br />
            Explore how a thin aluminum shell and its cryogenic liquid move
            together.
          </p>
        </header>
        <div className="cryo-workbench">
          <aside className="cryo-controls" aria-label="Cryogenic tank controls">
            <p className="cryo-section-title">
              <Droplets size={15} /> SET THE OPERATING POINT
            </p>
            <SegmentedControl<Settings["fluid"]>
              label="Cryogenic liquid"
              value={settings.fluid}
              options={[
                { value: "lox", label: "LOX" },
                { value: "lh2", label: <>LH₂</> },
              ]}
              onChange={(fluid) => change({ fluid })}
            />
            <p className="cryo-liquid-copy">
              {liquidName}
              <span>
                {settings.fluid === "lox" ? "1140" : "70.8"} kg/m³ ·
                representative density
              </span>
            </p>
            <ParameterSlider
              label="Fill by volume"
              value={settings.fill * 100}
              min={0}
              max={100}
              step={1}
              unit="%"
              marks={[25, 50, 85]}
              format={(v) => format(v, 0)}
              onValue={(fill) => change({ fill: fill / 100 })}
            />
            <p className="cryo-control-hint">
              Surface elevation {format(solution.liquidHeight)} m<br />
              Fill follows the volume of the barrel and domes.
            </p>
            <div className="cryo-pressure-controls">
              <ParameterSlider
                label="Ullage pressure"
                value={settings.ullagePsi}
                min={0}
                max={60}
                step={1}
                unit="psig"
                marks={[0, 31]}
                format={(v) => format(v, 0)}
                onValue={(ullagePsi) => change({ ullagePsi })}
              />
              <p className="cryo-control-hint">
                Uniform pressure relative to the exterior
              </p>
              <ParameterSlider
                label="Effective axial acceleration"
                value={settings.accelerationG}
                min={0}
                max={5}
                step={0.1}
                unit="g"
                marks={[1, 2, 3]}
                format={(v) => format(v, 1)}
                onValue={(accelerationG) => change({ accelerationG })}
              />
              <p className="cryo-control-hint">
                Includes the intended gravity contribution.
                <br />
                Liquid head = ρ × a × depth.
              </p>
            </div>
            <div className="cryo-geometry">
              <span>THE FIXED TANK</span>
              <dl>
                <div>
                  <dt>Diameter</dt>
                  <dd>8.4 m</dd>
                </div>
                <div>
                  <dt>Total height</dt>
                  <dd>16.8 m</dd>
                </div>
                <div>
                  <dt>Wall thickness</dt>
                  <dd>0.25 in / 6.35 mm</dd>
                </div>
                <div>
                  <dt>Ends</dt>
                  <dd>2:1 ellipsoidal</dd>
                </div>
                <div>
                  <dt>Elastic condition</dt>
                  <dd>Free-free target / Ritz</dd>
                </div>
              </dl>
              <small>Aluminum · E 69 GPa · ν 0.33</small>
            </div>
            <button className="cryo-notes-link" onClick={() => setNotes(true)}>
              <BookOpen size={14} /> Equations & assumptions{" "}
              <ArrowRight size={13} />
            </button>
          </aside>
          <section
            className="cryo-visual"
            aria-label="Three dimensional cryogenic tank experiment"
          >
            <div className="cryo-scene-heading">
              <span>{caseData.label}</span>
              <span>
                <i className={paused ? "" : "vl-status-dot"} />
                {display === "Pressure"
                  ? "STATIC PRESSURE"
                  : paused
                    ? "PAUSED"
                    : "MODE SHAPE / SLOWED"}
              </span>
            </div>
            <div className="cryo-scene">
              <SceneBoundary>
                <LabCanvas
                  camera={{ position: CAMERAS.Section.position, fov: 38 }}
                >
                  <World
                    solution={solution}
                    caseId={caseId}
                    mode={mode}
                    display={display}
                    paused={paused || !active}
                    gain={active ? gain : 0}
                    view={view}
                    revision={revision}
                  />
                </LabCanvas>
              </SceneBoundary>
              <div className="cryo-scene-badge">
                8.4 m × 16.8 m <span>6.35 mm aluminum</span>
              </div>
            </div>
            <div className="cryo-scene-tools">
              <SegmentedControl<View>
                label="Tank camera"
                value={view}
                options={[
                  { value: "Tank", label: "Tank" },
                  { value: "Section", label: "Section" },
                  { value: "Surface", label: "Surface" },
                ]}
                onChange={(v) => {
                  tour.stop();
                  camera(v);
                }}
              />
              <button
                onClick={() => setPaused((p) => !p)}
                aria-label={
                  paused ? "Play tank animation" : "Pause tank animation"
                }
                title={paused ? "Play tank animation" : "Pause tank animation"}
              >
                {paused ? <Play size={15} /> : <Pause size={15} />}
              </button>
              <button
                onClick={() => camera(view)}
                aria-label="Reset tank camera"
                title="Reset tank camera"
              >
                <RotateCcw size={15} />
              </button>
            </div>
            <div className="cryo-display-row">
              <SegmentedControl<Display>
                label="Tank visualization"
                value={display}
                options={[
                  { value: "Mode shape", label: "Shell mode" },
                  { value: "Pressure", label: "Pressure" },
                  { value: "Fluid motion", label: "Fluid motion" },
                ]}
                onChange={(d) => {
                  tour.stop();
                  setDisplay(d);
                  if (d === "Pressure") {
                    setTab("Pressure");
                    if (caseId === "dry" || caseId === "mass")
                      setCase("pressure");
                  }
                }}
              />
              <span
                className={`cryo-legend ${display === "Pressure" ? "pressure" : ""}`}
              >
                <i />
                {display === "Pressure"
                  ? "0 → 1.4 MPa gauge"
                  : "− displacement → +"}
              </span>
            </div>
            <p className="cryo-scene-caption">
              {display === "Pressure"
                ? `Configured static load: ${format(settings.ullagePsi)} psig ullage + ${format(solution.headPa / 6894.757)} psi liquid head at the bottom.${caseId === "dry" || caseId === "mass" ? " This selected eigenproblem excludes pressure stiffness." : ""}`
                : active
                  ? "Displacements are amplified. The silver ghost marks the undeformed shell; shell and surface motion share one eigenvector scale."
                  : "Free-surface slosh is inactive in an empty or completely full tank."}
              <span>
                Reduced shell / potential-flow model · frequencies illustrate
                this model.
              </span>
            </p>
            <div className="cryo-motion-gain">
              <label htmlFor="cryo-gain">Drawing amplitude</label>
              <input
                id="cryo-gain"
                aria-label="Drawing amplitude"
                type="range"
                min={0.1}
                max={1.5}
                step={0.1}
                value={gain}
                onChange={(e) => setGain(Number(e.target.value))}
              />
              <span>{format(gain, 1)}×</span>
              <small>Eigenmode amplitude is arbitrary.</small>
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
              <p className="cryo-tour-complete">
                Tour complete. Change the fill, fluid, pressure, or acceleration
                to explore.
              </p>
            )}
          </section>
          <aside className="cryo-insight" aria-label="Selected mode results">
            <p className="cryo-section-title">
              <Waves size={15} /> INSPECT THE MODE
            </p>
            <SegmentedControl<"shell" | "slosh">
              label="Mode family"
              value={selection.kind}
              options={[
                { value: "shell", label: "Shell" },
                { value: "slosh", label: "Slosh × 7" },
              ]}
              onChange={(kind) => {
                tour.stop();
                setSelection((s) => ({ ...s, kind }));
                if (kind === "slosh") {
                  setCase("coupled");
                  setDisplay("Fluid motion");
                  setTab("Slosh");
                } else setTab("Compare");
              }}
            />
            {selection.kind === "shell" ? (
              <div className="cryo-mode-select">
                <label>
                  Circumferential family
                  <select
                    aria-label="Circumferential shell family"
                    value={selection.n}
                    onChange={(e) => {
                      tour.stop();
                      setSelection((s) => ({
                        ...s,
                        n: Number(e.target.value),
                      }));
                    }}
                  >
                    {SHELL_NAMES.map((name, n) => (
                      <option key={n} value={n}>
                        n = {n} · {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Axial reference
                  <select
                    aria-label="Axial shell reference"
                    value={selection.axialOrder}
                    onChange={(e) => {
                      tour.stop();
                      setSelection((s) => ({
                        ...s,
                        axialOrder: Number(e.target.value),
                      }));
                    }}
                  >
                    {availableOrders.map((j) => (
                      <option key={j} value={j}>
                        Basis {j}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="cryo-mode-select">
                <label>
                  Retained fluid eigenvector
                  <select
                    aria-label="Slosh eigenvector"
                    value={selection.sloshId}
                    onChange={(e) => chooseSlosh(Number(e.target.value))}
                  >
                    {Array.from({ length: 7 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        S{String(i + 1).padStart(2, "0")} ·{" "}
                        {i < 2
                          ? "n=1, lateral"
                          : i < 4
                            ? "n=2, two-lobe"
                            : i === 4
                              ? "n=0, axisymmetric"
                              : "n=3, three-lobe"}
                        {i !== 4
                          ? i === 0 || i === 2 || i === 5
                            ? " cosine"
                            : " sine"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="cryo-hero-readout">
              <span>{active ? caseData.label : "Fluid mode inactive"}</span>
              <strong>
                {active && selected
                  ? format(selected.frequency, selected.frequency < 1 ? 3 : 2)
                  : "—"}{" "}
                <small>Hz</small>
              </strong>
              <p>
                {selection.kind === "shell"
                  ? `n = ${selection.n} · ${SHELL_NAMES[selection.n]}`
                  : `Fluid eigenvector S${String(selection.sloshId).padStart(2, "0")}`}
              </p>
              {selection.kind === "shell" && selected && (
                <span className="cryo-frequency-delta">
                  {frequencyChange >= 0 ? "+" : ""}
                  {format(frequencyChange, 1)}% from matched dry reference
                </span>
              )}
            </div>
            <div className="cryo-stat-list">
              <div>
                <span>Liquid mass</span>
                <b>
                  {format(solution.liquidMass / 1000, 1)} <small>t</small>
                </b>
              </div>
              <div>
                <span>Shell mass</span>
                <b>
                  {format(solution.shellMass / 1000, 2)} <small>t</small>
                </b>
              </div>
              <div>
                <span>Ullage differential</span>
                <b>
                  {format(solution.ullagePa / 1000, 1)} <small>kPa</small>
                </b>
              </div>
              <div>
                <span>Bottom liquid head</span>
                <b>
                  {format(solution.headPa / 1000, 1)} <small>kPa</small>
                </b>
              </div>
              <div className="cryo-total-pressure">
                <span>Bottom total pressure</span>
                <b>
                  {format(solution.bottomPa / 6894.757, 1)} <small>psig</small>
                </b>
              </div>
            </div>
            {active && selected && (
              <div className="cryo-energy">
                <span>MODAL KINETIC ENERGY</span>
                <div>
                  <i style={{ width: `${selected.shellFraction * 100}%` }} />
                  <i style={{ width: `${selected.sloshFraction * 100}%` }} />
                </div>
                <p>
                  <span>Shell {format(selected.shellFraction * 100, 1)}%</span>
                  <span>Liquid {format(selected.sloshFraction * 100, 1)}%</span>
                </p>
                <small>
                  Liquid energy includes coupled fluid motion; total liquid mass
                  is not modal added mass.
                </small>
              </div>
            )}
            {selected && selection.kind === "shell" && (
              <div className="cryo-match">
                <span>
                  Dry reference MAC <b>{format(selected.match * 100, 1)}%</b>
                </span>
                <small>
                  Eigen residual {selected.residual.toExponential(1)}
                </small>
                {selected.match < 0.8 && (
                  <p>
                    Weak shape match: this eigenvector mixes the reference
                    shapes. Inspect the mode before interpreting the frequency
                    comparison.
                  </p>
                )}
              </div>
            )}
            <p className="cryo-interpretation">
              {selection.kind === "slosh"
                ? "The seven fluid eigenvectors contain three directional pairs and one axisymmetric shape. Shell coupling follows spatial overlap."
                : caseId === "dry"
                  ? "The dry reference isolates the elastic shell basis. Match this shape across the other operating models."
                  : caseId === "mass"
                    ? "Liquid contributes dynamic inertia through a coupled matrix. The wetted wall accelerates a mode-dependent portion of the liquid."
                    : caseId === "pressure"
                      ? "The geometric stiffness contribution comes from uniform ullage pressure and the acceleration-induced liquid pressure field."
                      : caseId === "combined"
                        ? "The condensed fluid inertia and pressure prestress act in the same eigensolve. Their balance sets the resulting shape and frequency."
                        : "The elastic shell and seven retained free-surface coordinates are solved together. Different circumferential harmonics remain orthogonal."}
            </p>
            {selection.kind === "shell" && [1, 3, 4].includes(selection.n) && (
              <p className="cryo-inline-note">
                This family's lowest dry frequency changes about 12–14% with
                nominal basis refinement. Its frequency remains an illustrative
                estimate.
              </p>
            )}
            {settings.fill > 0 &&
              (settings.fill < 0.09 || settings.fill > 0.95) &&
              settings.fill < 1 && (
                <p className="cryo-inline-note">
                  The free surface is in a dome region. Frequencies are more
                  sensitive to the retained fluid and shell basis here.
                </p>
              )}
            {settings.accelerationG === 0 && (
              <p className="cryo-inline-note">
                At 0 g the gravity-only slosh restoring force vanishes.
                Capillary and meniscus effects are outside this reduction.
              </p>
            )}
          </aside>
        </div>
        <section className="cryo-analysis" aria-label="Tank mode analysis">
          <header>
            <div>
              <p className="vl-eyebrow">SEPARATE THE MECHANISMS</p>
              <h2>What changes, and why?</h2>
            </div>
            <SegmentedControl<AnalysisTab>
              label="Tank analysis"
              value={tab}
              options={(
                ["Compare", "Pressure", "Slosh", "Fill sweep"] as const
              ).map((value) => ({ value, label: value }))}
              onChange={(t) => {
                tour.stop();
                setTab(t);
                if (t === "Fill sweep" && selection.kind === "slosh")
                  setSelection((s) => ({ ...s, kind: "shell" }));
              }}
            />
          </header>
          <Plots
            solution={solution}
            selection={selection}
            caseId={caseId}
            tab={tab}
            onCase={chooseCase}
            onSlosh={chooseSlosh}
          />
        </section>
        <Equations solution={solution} />
        <footer className="cryo-footer">
          <p>
            Small-amplitude, inviscid fluid reduction · uniform aluminum
            properties
            <br />
            Pressure stiffness uses barrel membrane resultants with an
            equivalent distributed balancing load. Dome and attachment prestress
            require a static model.
          </p>
          <button onClick={() => setNotes(true)}>
            <BookOpen size={14} /> Model, limits & references{" "}
            <ArrowRight size={13} />
          </button>
        </footer>
      </main>
      {notes && <Notes close={() => setNotes(false)} />}
    </div>
  );
}
