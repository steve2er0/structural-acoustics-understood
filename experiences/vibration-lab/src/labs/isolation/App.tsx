import { TOUR } from "./tour";
import { LabNavigation } from "@components/LabNavigation";
import { TourTransport } from "@components/TourTransport";
import {
  ParameterSlider,
  EngineeringReadout,
  Toggle,
} from "@components/Controls";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowDown,
  Box,
  CircleHelp,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import Curve from "./Curve";
import Generator from "./Generator";
import {
  DEFAULTS,
  GRAVITY,
  LB_TO_KG,
  regime,
  solve,
  type Regime,
} from "./physics";
import { displacement, motionScale, playbackFrequency } from "./visualization";
import { useExhibit, type View } from "./state";
import "./style.css";

const Scene = lazy(() => import("./Scene"));
const WORDS: Record<
  Regime,
  {
    name: string;
    color: string;
    headline: string;
    copy: string;
    number: string;
  }
> = {
  coupled: {
    name: "Coupled motion",
    color: "#b1d1d4",
    headline: "They move together.",
    copy: "Slow motion passes through the mounts. The payload follows the base almost as one rigid body.",
    number: "01",
  },
  resonance: {
    name: "Resonance region",
    color: "#efb47b",
    headline: "A little input. A lot of motion.",
    copy: "Near the natural frequency, energy builds with each cycle. The mounts amplify motion. Damping keeps the peak in check.",
    number: "02",
  },
  isolation: {
    name: "Isolation",
    color: "#a9edc8",
    headline: "The base moves. The payload stays quiet.",
    copy: "Above √2 times the natural frequency, the payload moves less than the base. Softer mounts bring this threshold down.",
    number: "03",
  },
};
const VIEWS: View[] = [
  "System",
  "Isolator",
  "Force path",
  "Side",
  "Exploded",
  "Test lab",
];
const precise = (n: number) =>
  n < 0.01 ? n.toFixed(4) : n < 0.1 ? n.toFixed(3) : n.toFixed(2);

export default function App() {
  const exhibit = useExhibit();
  const { parameters: p, update } = exhibit;
  const s = solve(p);
  const current = regime(s.r),
    words = WORDS[current];
  const [compare, setCompare] = useState(false);
  const [notes, setNotes] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const generator = useRef<HTMLElement>(null);
  const currentRef = useRef({ exhibit, s });
  currentRef.current = { exhibit, s };
  useEffect(() => {
    if (notes) dialog.current?.showModal();
    else dialog.current?.close();
  }, [notes]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        /INPUT|TEXTAREA|SELECT|BUTTON/.test(
          (e.target as HTMLElement).tagName,
        ) ||
        dialog.current?.open
      )
        return;
      const { exhibit: a, s: solution } = currentRef.current;
      if (e.key === " ") {
        e.preventDefault();
        a.togglePause();
      }
      if (e.key === "1")
        a.update({ frequency: Math.max(1, solution.fn * 0.2) });
      if (e.key === "2") a.update({ frequency: solution.fn });
      if (e.key === "3")
        a.update({ frequency: Math.min(600, solution.fn * 4) });
      if (e.key.toLowerCase() === "r") a.chooseView("System");
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const scale = motionScale(s);
  const gain =
    scale.gain < 1
      ? scale.gain.toPrecision(2)
      : scale.gain < 100
        ? scale.gain.toFixed(1)
        : Math.round(scale.gain).toLocaleString();
  const chooseView = (v: View) => {
    exhibit.chooseView(v);
    if (v === "Force path") exhibit.setForceFlow(true);
  };
  return (
    <main
      className={`exhibit regime-${current}`}
      style={{ "--accent": words.color } as CSSProperties}
    >
      <div
        className="scene"
        aria-label="Interactive three-dimensional base-excited payload"
      >
        <Suspense
          fallback={
            <div className="scene-loading">
              <span />
              Preparing the exhibit
            </div>
          }
        >
          <Scene
            generatorFace={generator}
            solution={s}
            frequency={p.frequency}
            massLb={p.mass / LB_TO_KG}
            paused={exhibit.paused}
            forceFlow={exhibit.forceFlow}
            envelope={exhibit.envelope}
            view={exhibit.view}
            revision={exhibit.cameraRevision}
            onView={chooseView}
          />
        </Suspense>
      </div>
      <div className="ambient-vignette" />
      <Generator
        faceRef={generator}
        frequency={p.frequency}
        naturalFrequency={s.fn}
        sweeping={exhibit.sweeping}
        progress={exhibit.sweepProgress}
        onFrequency={(frequency) => update({ frequency })}
        onSweep={exhibit.runSweep}
      />
      <LabNavigation
        active="isolation"
        onRestart={exhibit.reset}
        onTour={exhibit.startTour}
        touring={exhibit.tour}
        onHelp={() => setNotes(true)}
      />

      <section className="introduction" aria-labelledby="title">
        <div className="eyebrow">DYNAMICS, MADE VISIBLE</div>
        <h1 id="title" aria-label="Vibration Isolation">
          Vibration
          <br />
          <span>Isolation.</span>
        </h1>
        <p className="subtitle">
          Why does a soft mount protect
          <br className="desktop-break" /> equipment from vibration?
        </p>
        <div className="regime-story">
          <div className="regime-label">
            <span className="status-dot" />
            <span>
              {words.number} / {words.name}
            </span>
          </div>
          <h2>
            {exhibit.tour ? TOUR[exhibit.tourIndex].title : words.headline}
          </h2>
          <p>{exhibit.tour ? TOUR[exhibit.tourIndex].copy : words.copy}</p>
        </div>
        <div className="transmission-result">
          <span className="eyebrow">MOTION TRANSMITTED</span>
          <div className="result-line">
            <strong data-testid="transmissibility">
              {precise(s.T)}
              <em>×</em>
            </strong>
            <div className="db-result">
              <span>
                {Math.abs(s.isolationDb).toFixed(1)} <small>dB</small>
              </span>
              <small>
                {s.isolationDb >= 0 ? "attenuation" : "amplification"}
              </small>
            </div>
          </div>
          <div className="small-results">
            <span>
              f / fₙ <b data-testid="ratio">{s.r.toFixed(2)}</b>
            </span>
            <span>
              Phase lag{" "}
              <b data-testid="phase">
                {((-s.phase * 180) / Math.PI).toFixed(1)}°
              </b>
            </span>
          </div>
        </div>
      </section>

      {exhibit.tour && (
        <TourTransport
          index={exhibit.tourIndex}
          count={TOUR.length}
          time={exhibit.tourTime}
          duration={exhibit.tourDuration}
          paused={exhibit.paused}
          onPause={exhibit.togglePause}
          onJump={exhibit.jumpTour}
          onExit={exhibit.stopTour}
        />
      )}

      <nav className="camera-views" aria-label="Camera views">
        <span className="camera-caption">
          <Box size={13} /> VIEW
        </span>
        {VIEWS.map((view) => (
          <button
            key={view}
            className={exhibit.view === view ? "active" : ""}
            aria-pressed={exhibit.view === view}
            onClick={() => chooseView(view)}
          >
            {view}
          </button>
        ))}
        <button
          className="icon-button"
          title="Reset view (R)"
          aria-label="Reset view"
          onClick={() => exhibit.chooseView("System")}
        >
          <RotateCcw size={13} />
        </button>
      </nav>

      <div className="scene-bottom">
        <div className="scene-tools">
          <Toggle
            className={exhibit.forceFlow ? "active" : ""}
            checked={exhibit.forceFlow}
            onChange={exhibit.setForceFlow}
          >
            <ArrowDown size={14} />
            Force Flow
            <span className="toggle-dot" />
          </Toggle>
          <Toggle
            className={exhibit.envelope ? "active" : ""}
            checked={exhibit.envelope}
            onChange={exhibit.setEnvelope}
          >
            <Layers3 size={14} />
            Motion Envelope
            <span className="toggle-dot" />
          </Toggle>
          <button
            className="pause-button"
            aria-label={exhibit.paused ? "Play motion" : "Pause motion"}
            title="Pause / play (Space)"
            onClick={exhibit.togglePause}
          >
            {exhibit.paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
        <div className="render-note">
          <span>
            {exhibit.view === "Exploded"
              ? "EXPLODED SPACING"
              : exhibit.paused
                ? "MOTION PAUSED"
                : "SLOW MOTION"}
          </span>
          <button onClick={() => setNotes(true)}>
            {playbackFrequency(p.frequency).toFixed(2)} cycles/s · displacement{" "}
            {gain}× <CircleHelp size={11} />
          </button>
        </div>
      </div>
      {(exhibit.forceFlow || exhibit.envelope) && (
        <aside className="overlay-readout">
          {exhibit.forceFlow && (
            <div>
              <span>Dynamic mount force</span>
              <b>
                {s.force.toFixed(2)} N <small>peak, total</small>
              </b>
              <em>On payload · {precise(s.T)} × m aᵦ</em>
            </div>
          )}
          {exhibit.envelope && (
            <div>
              <span>Payload motion envelope</span>
              <b>±{displacement(s.payloadAmplitude)}</b>
              <em>Mount travel ±{displacement(s.relativeAmplitude)}</em>
            </div>
          )}
        </aside>
      )}

      <section className="console" aria-label="Experiment controls">
        <div className="response-panel">
          <div className="panel-heading">
            <span>THE FREQUENCY RESPONSE</span>
            <button
              className={compare ? "comparison active" : "comparison"}
              aria-pressed={compare}
              onClick={() => setCompare(!compare)}
            >
              <span />
              Compare ζ = 0.40
            </button>
          </div>
          <Curve
            parameters={p}
            solution={s}
            compare={compare}
            onChange={(frequency) => update({ frequency })}
          />
          <div className="plot-foot">
            <span>
              <i className="natural-dot" />
              fₙ <b data-testid="natural-frequency">{s.fn.toFixed(1)} Hz</b>
            </span>
            <span>
              <i className="isolation-dot" />
              Isolation above <b>{s.isolationThreshold.toFixed(1)} Hz</b>
            </span>
            <span className="plot-hint">drag to explore ↔</span>
          </div>
        </div>
        <div className="controls-panel">
          <div className="mount-panel-heading">
            <div>
              <span className="eyebrow">ISOLATOR PROPERTIES</span>
              <h3>Tune the suspension.</h3>
            </div>
            <span>
              4 MOUNTS
              <br />
              IN PARALLEL
            </span>
          </div>
          <div className="secondary-controls">
            <div className="parameter">
              <div className="parameter-heading">
                <label htmlFor="stiffness">Mount stiffness</label>
                <output>
                  {(p.stiffness / 1000).toFixed(1)} <span>kN/m</span>
                </output>
              </div>
              <ParameterSlider
                inputOnly
                id="stiffness"
                aria-label="Total isolator stiffness"
                aria-valuetext={`${(p.stiffness / 1000).toFixed(1)} kilonewtons per meter, total`}
                min={20000}
                max={320000}
                logarithmic
                value={p.stiffness}
                onValue={(value) => update({ stiffness: value })}
              />
              <div className="parameter-endpoints">
                <span>Softer</span>
                <span>4 mounts · total</span>
                <span>Stiffer</span>
              </div>
            </div>
            <div className="parameter">
              <div className="parameter-heading">
                <label htmlFor="damping">
                  Damping ratio <em>ζ</em>
                </label>
                <EngineeringReadout
                  value={p.zeta}
                  format={(n) => n.toFixed(2)}
                />
              </div>
              <ParameterSlider
                inputOnly
                id="damping"
                min={0.01}
                max={0.4}
                step="0.005"
                value={p.zeta}
                onValue={(value) => update({ zeta: value })}
              />
              <div className="parameter-endpoints">
                <span>Less damping</span>
                <span>More damping</span>
              </div>
            </div>
          </div>
          <p className="damping-insight">
            {compare
              ? "Dashed: ζ = 0.40. Damping lowers the resonance peak, but increases high-frequency transmission."
              : "Try this: sweep through resonance, then add damping to tame the peak."}
          </p>
        </div>
      </section>
      <footer className="footer">
        <span>
          <i />
          {(p.mass / LB_TO_KG).toFixed(1)} lb payload <b>·</b> 4 parallel mounts{" "}
          <b>·</b> 1 g peak base input
        </span>
        <span className="interaction-hint">
          Drag to orbit <b>·</b> Scroll to zoom <b>·</b> 1 / 2 / 3 to explore
        </span>
        <button
          onClick={() => {
            exhibit.reset();
            setCompare(false);
          }}
        >
          <RotateCcw size={11} />
          Reset experiment
        </button>
      </footer>

      <dialog
        ref={dialog}
        className="model-dialog"
        aria-labelledby="model-title"
        onClose={() => setNotes(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setNotes(false);
        }}
      >
        <article onClick={(e) => e.stopPropagation()}>
          <button
            className="dialog-close icon-button"
            aria-label="Close model notes"
            onClick={() => setNotes(false)}
          >
            <X size={20} />
          </button>
          <div className="eyebrow">BEHIND THE EXHIBIT</div>
          <h2 id="model-title">
            One mass.
            <br />
            One direction of motion.
          </h2>
          <p>
            A rigid payload sits on four identical, linear spring–damper mounts.
            They share the load equally and act in parallel. We model vertical
            translation about static equilibrium; rotation, rocking, mount
            nonlinearity, and travel stops are excluded.
          </p>
          <div className="equation">m ẍ + c (ẋ − ẏ) + k (x − y) = 0</div>
          <p>
            The harmonic solution is <b>X/Y = (1 + i 2ζr) / (1 − r² + i 2ζr)</b>
            , where r = f/fₙ. Its magnitude controls motion and its angle
            controls phase. All amplitudes are <b>peak</b>, not RMS.
          </p>
          <dl className="physics-values">
            <div>
              <dt>Natural frequency</dt>
              <dd>{s.fn.toFixed(2)} Hz</dd>
            </div>
            <div>
              <dt>Stiffness / mount</dt>
              <dd>{(p.stiffness / 4000).toFixed(2)} kN/m</dd>
            </div>
            <div>
              <dt>Total viscous damping</dt>
              <dd>{s.damping.toFixed(1)} N·s/m</dd>
            </div>
            <div>
              <dt>Static sag</dt>
              <dd>{displacement(s.staticDeflection)}</dd>
            </div>
            <div>
              <dt>Base displacement, Y</dt>
              <dd>{displacement(s.baseAmplitude)}</dd>
            </div>
            <div>
              <dt>Payload displacement, X</dt>
              <dd>{displacement(s.payloadAmplitude)}</dd>
            </div>
            <div>
              <dt>Relative mount travel</dt>
              <dd>{displacement(s.relativeAmplitude)}</dd>
            </div>
            <div>
              <dt>Payload acceleration</dt>
              <dd>{(s.payloadAcceleration / GRAVITY).toFixed(4)} g</dd>
            </div>
            <div>
              <dt>Dynamic transmitted force</dt>
              <dd>{s.force.toFixed(3)} N</dd>
            </div>
            <div>
              <dt>Isolation, −20 log₁₀(T)</dt>
              <dd>{s.isolationDb.toFixed(2)} dB</dd>
            </div>
          </dl>
          <h3>The shaker and signal generator</h3>
          <p>
            The shaker housing is fixed. Its moving armature is the base, y,
            beneath the isolators. The generator sets excitation frequency; an
            ideal drive maintains <b>1 g peak base acceleration</b>. The shaker
            drive, amplifier, and armature dynamics are not simulated.
          </p>
          <h3>What the animation changes</h3>
          <p>
            Displacements share one linear display gain ({gain}× relative to an
            8 scene-units/m drawing scale). The gain adjusts to keep the
            apparatus legible; <b>X/Y and phase are always preserved</b>. Motion
            plays at {playbackFrequency(p.frequency).toFixed(2)} cycles/s
            instead of {p.frequency.toFixed(1)} Hz. The numerical displacements
            above remain physical.
          </p>
          <h3>What the sweep means</h3>
          <p>
            Base acceleration stays at 1 g peak, so Y = g/(2πf)² decreases with
            frequency. This is a sequence of steady harmonic responses, not a
            transient run-up simulation. The three-second hold demonstrates
            resonance; it does not calculate energy buildup over time.
          </p>
          <h3>Read the force arrows carefully</h3>
          <p>
            Arrows reverse with the signed net dynamic force on the payload: F =
            −mω²x. The reaction on the base is opposite. Size and brightness
            compress F/(m aᵦ) = T for visibility; the readout gives force in
            newtons. Static weight is excluded. At a fixed displacement input,
            high-frequency force need not decrease.
          </p>
          <h3>The useful thresholds</h3>
          <p>
            Isolation begins at r &gt; √2 for this model, independent of
            damping. The “resonance region” begins at r = 0.7 as a teaching
            guide. fₙ is the undamped natural frequency; with damping, the exact
            maximum transmissibility lies slightly below it.
          </p>
          <label className="mass-control" htmlFor="mass">
            Payload mass <output>{(p.mass / LB_TO_KG).toFixed(1)} lb</output>
            <ParameterSlider
              inputOnly
              id="mass"
              min={2}
              max={30}
              step="0.5"
              value={p.mass / LB_TO_KG}
              onValue={(value) => update({ mass: value * LB_TO_KG })}
            />
          </label>
          <p className="model-footnote">
            Default: 10 lb (4.536 kg), {(DEFAULTS.stiffness / 1000).toFixed(2)}{" "}
            kN/m total, 25 Hz natural frequency, ζ = 0.08. An idealized exhibit,
            not a mount sizing or qualification tool. Spring-and-damper geometry
            is schematic.
          </p>
        </article>
      </dialog>
    </main>
  );
}
