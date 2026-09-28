import { LabNavigation } from "@components/LabNavigation";
import { TourTransport } from "@components/TourTransport";
import {
  ParameterSlider,
  EngineeringReadout,
  SegmentedControl,
} from "@components/Controls";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  CAMERAS,
  useExhibit,
  type CameraView,
  type Display,
  type Lesson,
} from "../animation/state";
import { TOUR, TOUR_DURATION, tourAt } from "../animation/tour";
import {
  displayGain,
  displacement,
  frequencyPosition,
  playbackFrequency,
  type AnimationClock,
} from "../animation/motion";
import { LIMIT_NAMES, solve } from "../shaker-model/model";
import { G } from "../physics/electromechanics";
import { Energy, Envelope, ForceBalance, Voltage, Waveform } from "./Charts";
import Notes from "./Notes";
import "./style.css";

const Scene = lazy(() => import("../rendering/Scene"));
const LESSONS: { key: Lesson; name: string; title: string; copy: string }[] = [
  {
    key: "field",
    name: "Field",
    title: "First, make a field.",
    copy: "The lower coil stays still. Feed it DC and the steel carries its magnetic flux into a narrow, circular air gap.",
  },
  {
    key: "force",
    name: "Force",
    title: "Around the coil. Along the axis.",
    copy: "Radial field meets circumferential current. Their cross product points axially. Reverse the current and the force reverses.",
  },
  {
    key: "motion",
    name: "Motion",
    title: "Alternating force. Moving mass.",
    copy: "Coil, armature and table move together. Their response depends on frequency, suspension, and everything bolted on top.",
  },
  {
    key: "emf",
    name: "Back EMF",
    title: "The motor is a generator, too.",
    copy: "Motion through the field generates voltage. Back EMF follows velocity and adds to the amplifier’s demand.",
  },
  {
    key: "envelope",
    name: "Envelope",
    title: "Every machine has its limits.",
    copy: "Each point is the first limit reached. Add mass to see how the available acceleration changes.",
  },
  {
    key: "energy",
    name: "Energy",
    title: "Motion takes power. So does heat.",
    copy: "The DC supply and amplifier power different coils. Both copper windings produce heat that cooling must remove.",
  },
];
const DISPLAYS: { key: Display; name: string }[] = [
  { key: "assembled", name: "Assembled" },
  { key: "cutaway", name: "Cutaway" },
  { key: "exploded", name: "Exploded" },
  { key: "circuit", name: "Magnetic circuit" },
];
const nice = (value: number) =>
  Math.abs(value) < 10
    ? value.toFixed(2)
    : Math.abs(value) < 100
      ? value.toFixed(1)
      : value.toFixed(0);
export default function App() {
  const exhibit = useExhibit(),
    { parameters: p, update } = exhibit;
  const s = useMemo(() => solve(p), [p]);
  const clock = useRef<AnimationClock>({ theta: 0, elapsed: 0 });
  const labels = {
    field: useRef<HTMLDivElement>(null),
    drive: useRef<HTMLDivElement>(null),
    table: useRef<HTMLDivElement>(null),
    detail: useRef<HTMLDivElement>(null),
  };
  const [notes, setNotes] = useState(false);
  const active = LESSONS.find((l) => l.key === exhibit.lesson)!;
  const tourIndex = tourAt(exhibit.tourTime).index,
    step = TOUR[tourIndex];
  const sine = p.driveMode === "sine";
  const state = useRef({ exhibit, notes });
  state.current = { exhibit, notes };
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        state.current.notes ||
        /INPUT|TEXTAREA|SELECT|BUTTON/.test(
          (event.target as HTMLElement).tagName,
        )
      )
        return;
      const a = state.current.exhibit;
      if (event.code === "Space") {
        event.preventDefault();
        a.setPaused(!a.paused);
      }
      if (event.key.toLowerCase() === "r") a.chooseCamera("System");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const gain = displayGain(s),
    gainText =
      gain < 10
        ? gain.toFixed(2)
        : gain < 1000
          ? gain.toFixed(0)
          : `${(gain / 1000).toFixed(1)}k`;
  const sliderStyle = (value: number) =>
    ({ "--fill": `${value}%` }) as CSSProperties;
  return (
    <main
      className={`exhibit lesson-${exhibit.lesson} ${exhibit.tour ? "tour-active" : ""}`}
    >
      <h1 className="sr-only">How an Electrodynamic Shaker Works</h1>
      <div
        className="scene"
        aria-label="Interactive 3D cutaway of a field-coil electrodynamic shaker"
      >
        <Suspense
          fallback={
            <div className="scene-loading">
              <i />
              Preparing the exhibit
            </div>
          }
        >
          <Scene
            solution={s}
            clock={clock}
            cameraView={exhibit.camera}
            revision={exhibit.revision}
            display={exhibit.display}
            lesson={exhibit.lesson}
            paused={exhibit.paused}
            labels={labels}
          />
        </Suspense>
        <div className="scene-vignette" />
        <div className="annotations" aria-hidden="true">
          <div className="annotation field-label" ref={labels.field}>
            <i />
            <span>
              01 <b>FIELD COIL</b>
              <small>STATIONARY · DC</small>
            </span>
          </div>
          <div className="annotation drive-label" ref={labels.drive}>
            <i />
            <span>
              02 <b>DRIVE COIL</b>
              <small>MOVING · AMPLIFIER</small>
            </span>
          </div>
          <div className="annotation table-label" ref={labels.table}>
            <i />
            <span>
              {p.payload > 0 ? `${nice(p.payload)} kg PAYLOAD` : "MOVING TABLE"}
            </span>
          </div>
          <div className="annotation detail-label" ref={labels.detail}>
            <i />
            <span>
              {exhibit.camera === "Air gap"
                ? "ANNULAR AIR GAP"
                : exhibit.camera === "Suspension"
                  ? "AXIAL FLEXURES"
                  : exhibit.camera === "Field coil" ||
                      exhibit.camera === "Exploded"
                    ? "CENTER POLE"
                    : "STEEL RETURN PATH"}
            </span>
          </div>
        </div>
      </div>
      <LabNavigation
        active="shaker"
        onRestart={exhibit.reset}
        onTour={exhibit.startTour}
        touring={exhibit.tour}
        onHelp={() => setNotes(true)}
      />
      <section className="story" aria-label="Current explanation">
        <p className="eyebrow">
          {exhibit.tour
            ? `GUIDED TOUR / ${String(tourIndex + 1).padStart(2, "0")} OF 20`
            : `0${LESSONS.indexOf(active) + 1} / ${active.name.toUpperCase()}`}
        </p>
        <h2 key={exhibit.tour ? step.title : active.title}>
          {exhibit.tour ? step.title : active.title}
        </h2>
        <p className="story-copy">{exhibit.tour ? step.copy : active.copy}</p>
        <div className="primary-metric">
          {exhibit.lesson === "field" && (
            <>
              <span>
                {s.field.B.toFixed(2)}
                <small>T</small>
              </span>
              <p>FLUX DENSITY IN THE AIR GAP</p>
            </>
          )}
          {exhibit.lesson === "force" && (
            <>
              <span>
                {nice(s.force)}
                <small>N {sine ? "pk" : ""}</small>
              </span>
              <p>
                F = BLi <i /> BL = {nice(s.field.BL)} N/A
              </p>
            </>
          )}
          {exhibit.lesson === "motion" && (
            <>
              <span>
                {nice(s.accelerationPeak / G)}
                <small>g pk</small>
              </span>
              <p>{displacement(s.displacementPeak)} PEAK TRAVEL</p>
            </>
          )}
          {exhibit.lesson === "emf" && (
            <>
              <span>
                {nice(s.emfPeak)}
                <small>V pk</small>
              </span>
              <p>
                BACK EMF <i /> e = BLv
              </p>
            </>
          )}
          {exhibit.lesson === "envelope" && (
            <>
              <span>
                {nice(s.cap.acceleration / G)}
                <small>g pk</small>
              </span>
              <p>CAPABILITY AT {nice(p.frequency)} Hz</p>
            </>
          )}
          {exhibit.lesson === "energy" && (
            <>
              <span>
                {nice(s.field.heat + s.amplifierRealPower)}
                <small>W</small>
              </span>
              <p>TOTAL MODELED REAL INPUT POWER</p>
            </>
          )}
        </div>
        {exhibit.lesson === "field" && (
          <div className="field-chain">
            <span>
              DC current <b>{nice(s.field.current)} A</b>
            </span>
            <i>↓</i>
            <span>
              Magnetomotive force <b>{s.field.mmf.toFixed(0)} At</b>
            </span>
            <i>↓</i>
            <span>
              Steel return path <b>→ radial gap</b>
            </span>
            {p.fieldPercent === 0 && !exhibit.tour && (
              <button
                className="text-action"
                onClick={() => update({ fieldPercent: 100 })}
              >
                Energize the field <ArrowUpRight size={15} />
              </button>
            )}
            <p className="chart-note">
              {exhibit.display === "circuit"
                ? "Flux overlay follows the steel behind the windings. Tracers show direction in a settled DC field."
                : "The drive coil is a separate winding. Field current alone does not move the table."}
            </p>
          </div>
        )}
        {exhibit.lesson === "force" && (
          <>
            <div className="vector-key">
              <span className="b">
                B <small>radial</small>
              </span>
              <span className="i">
                I <small>around</small>
              </span>
              <span className="f">
                F <small>axial</small>
              </span>
            </div>
            <ForceBalance
              solution={s}
              clock={clock}
              onView={() => exhibit.chooseCamera("System")}
            />
          </>
        )}
        {exhibit.lesson === "motion" &&
          (sine ? (
            <Waveform solution={s} clock={clock} />
          ) : (
            <div className="context-prompt">
              <p>
                Manual current produces a steady offset. Switch to sine to make
                the force alternate.
              </p>
              <button
                className="text-action"
                onClick={() => update({ driveMode: "sine" })}
              >
                Start sine drive <ArrowUpRight size={15} />
              </button>
            </div>
          ))}
        {exhibit.lesson === "emf" &&
          (sine ? (
            <Voltage solution={s} />
          ) : (
            <div className="context-prompt">
              <p>
                At DC equilibrium the coil is stationary, so back EMF is zero.
                Alternate the current to turn motion into voltage.
              </p>
              <button
                className="text-action"
                onClick={() => update({ driveMode: "sine" })}
              >
                Switch to sine to generate back EMF <ArrowUpRight size={15} />
              </button>
            </div>
          ))}
        {exhibit.lesson === "envelope" && (
          <Envelope
            solution={s}
            onFrequency={(frequency) =>
              update({ frequency, driveMode: "sine" })
            }
          />
        )}
        {exhibit.lesson === "energy" && <Energy solution={s} />}
      </section>
      <div className="view-tools">
        <div
          className="segmented display-switch"
          role="group"
          aria-label="Machine display"
        >
          {DISPLAYS.map((d) => (
            <button
              key={d.key}
              className={d.key === exhibit.display ? "selected" : ""}
              aria-pressed={d.key === exhibit.display}
              onClick={() => exhibit.chooseDisplay(d.key)}
            >
              {d.name}
            </button>
          ))}
        </div>
        <label className="camera-select">
          <span>VIEW</span>
          <select
            aria-label="Camera preset"
            value={exhibit.camera}
            onChange={(e) => exhibit.chooseCamera(e.target.value as CameraView)}
          >
            {CAMERAS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="Reset camera"
            onClick={() => exhibit.chooseCamera(exhibit.camera)}
          >
            <RotateCcw size={14} />
          </button>
        </label>
      </div>
      <div className="scene-footer">
        <div className="machine-caption">
          <span>FIELD-EXCITED ELECTRODYNAMIC SHAKER</span>
          <small>
            {exhibit.display === "exploded"
              ? "Separated for inspection · calculations describe the assembled machine"
              : "Drag to orbit · scroll to inspect · R to return"}
          </small>
        </div>
        <div className="playback-controls">
          <button
            className="icon-button"
            aria-label={exhibit.paused ? "Resume animation" : "Pause animation"}
            onClick={() => exhibit.setPaused(!exhibit.paused)}
          >
            {exhibit.paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <span>
            {sine
              ? `${p.frequency.toFixed(p.frequency < 10 ? 1 : 0)} Hz → ${playbackFrequency(p.frequency).toFixed(2)} visible cycles/s`
              : "DC equilibrium · transitions eased"}
            <small>
              {sine ? "MOTION SLOWED" : "STEADY FORCE"} <i /> DISPLACEMENT{" "}
              {gainText}×
            </small>
          </span>
        </div>
      </div>
      <div className="lesson-navigation">
        <div role="group" aria-label="Learning modes">
          {LESSONS.map((l, i) => (
            <button
              key={l.key}
              className={exhibit.lesson === l.key ? "selected" : ""}
              aria-pressed={exhibit.lesson === l.key}
              onClick={() => exhibit.chooseLesson(l.key)}
            >
              <small>0{i + 1}</small>
              {l.name}
            </button>
          ))}
        </div>
        <button className="reset-button" onClick={exhibit.reset}>
          <RotateCcw size={13} />
          Reset experiment
        </button>
      </div>
      {exhibit.tour && (
        <TourTransport
          index={tourIndex}
          count={TOUR.length}
          time={exhibit.tourTime}
          duration={TOUR_DURATION}
          paused={exhibit.paused}
          onPause={() => exhibit.setPaused(!exhibit.paused)}
          onJump={exhibit.jumpTour}
          onExit={exhibit.stopTour}
        />
      )}
      {exhibit.finished && (
        <div className="tour-complete" role="status">
          Tour complete. The machine is yours to explore.
        </div>
      )}
      <section className="control-dock" aria-label="Experiment controls">
        <div className="control-block field-control">
          <div className="control-header">
            <span className="coil-number">01</span>
            <div>
              <h3>Field coil</h3>
              <p>STATIONARY · DC SUPPLY</p>
            </div>
            <EngineeringReadout
              value={s.field.current}
              unit="A DC"
              format={nice}
            />
          </div>
          <label className="range-label" htmlFor="field-current">
            Field current <span>{p.fieldPercent.toFixed(0)}%</span>
          </label>
          <ParameterSlider
            inputOnly
            id="field-current"
            aria-label="Field current"
            min={0}
            max={100}
            step="1"
            value={p.fieldPercent}
            style={sliderStyle(p.fieldPercent)}
            onValue={(value) => update({ fieldPercent: value })}
          />
          <div className="range-ends">
            <span>0</span>
            <span>12 A</span>
          </div>
          <div className="control-readings">
            <span>
              Gap <b>{s.field.B.toFixed(2)} T</b>
            </span>
            <span>
              Continuous heat <b>{s.field.heat.toFixed(0)} W</b>
            </span>
          </div>
        </div>
        <div className="control-block drive-control">
          <div className="control-header">
            <span className="coil-number">02</span>
            <div>
              <h3>Drive coil</h3>
              <p>MOVING · POWER AMPLIFIER</p>
            </div>
            <SegmentedControl
              label="Drive mode"
              className="segmented drive-switch"
              value={p.driveMode}
              options={[
                { value: "manual", label: "Manual" },
                { value: "sine", label: "Sine" },
              ]}
              onChange={(driveMode) => update({ driveMode })}
            />
          </div>
          <div className={sine ? "drive-controls sine" : "drive-controls"}>
            <div className="drive-amplitude">
              <label className="range-label" htmlFor="drive-current">
                {sine ? "Drive level" : "Drive current"}
                <span>
                  {sine
                    ? `${p.levelPercent.toFixed(0)}% · ${nice(s.current)} A pk`
                    : `${s.current > 0 ? "+" : ""}${nice(s.current)} A`}
                </span>
              </label>
              <ParameterSlider
                inputOnly
                id="drive-current"
                aria-label={sine ? "Drive level" : "Drive current"}
                min={sine ? 0 : -100}
                max={100}
                step="1"
                value={sine ? p.levelPercent : p.manualPercent}
                style={sliderStyle(
                  sine ? p.levelPercent : (p.manualPercent + 100) / 2,
                )}
                onValue={(value) =>
                  update(
                    sine ? { levelPercent: value } : { manualPercent: value },
                  )
                }
              />
              <div className="range-ends">
                <span>{sine ? "0 A" : "−8 A"}</span>
                {!sine && (
                  <button
                    onClick={() => update({ manualPercent: 0 })}
                    aria-label="Zero drive current"
                  >
                    0
                  </button>
                )}
                <span>{sine ? "60 A requested" : "+8 A"}</span>
              </div>
            </div>
            {sine && (
              <div className="frequency-control">
                <label className="range-label" htmlFor="frequency">
                  Frequency <span>{nice(p.frequency)} Hz</span>
                </label>
                <ParameterSlider
                  inputOnly
                  id="frequency"
                  aria-label="Frequency"
                  aria-valuetext={`${p.frequency.toFixed(1)} hertz`}
                  min={1}
                  max={2000}
                  logarithmic
                  step="1"
                  value={p.frequency}
                  style={sliderStyle(frequencyPosition(p.frequency) * 100)}
                  onValue={(value) =>
                    update({
                      frequency: value,
                    })
                  }
                />
                <div className="range-ends">
                  <span>1 Hz</span>
                  <span>2 kHz</span>
                </div>
              </div>
            )}
          </div>
          <div className="control-readings">
            {sine ? (
              <>
                <span className={s.limited ? "limit-active" : ""}>
                  {s.limited
                    ? `Amplitude limited · ${LIMIT_NAMES[s.cap.limiting]}`
                    : "Within modeled limits"}
                </span>
                <span>
                  Terminal <b>{nice(s.voltagePeak)} V pk</b>
                </span>
              </>
            ) : (
              <>
                <button
                  className="reverse-button"
                  onClick={() =>
                    update({
                      manualPercent:
                        p.manualPercent === 0 ? 100 : -p.manualPercent,
                    })
                  }
                >
                  <ArrowDownUp size={12} />
                  {p.manualPercent === 0
                    ? "Apply + current"
                    : "Reverse current"}
                </button>
                <span>
                  Force <b>{nice(s.force)} N</b>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="control-block payload-control">
          <div className="control-header">
            <span className="payload-symbol">m</span>
            <div>
              <h3>Test article</h3>
              <p>BOLTED TO THE TABLE</p>
            </div>
            <output>
              {nice(p.payload)}
              <small>kg</small>
            </output>
          </div>
          <label className="range-label" htmlFor="payload">
            Payload mass <span>{nice(s.mass)} kg moving</span>
          </label>
          <ParameterSlider
            inputOnly
            id="payload"
            aria-label="Payload mass"
            min={0}
            max={60}
            step="1"
            value={p.payload}
            style={sliderStyle((p.payload / 60) * 100)}
            onValue={(value) => update({ payload: value })}
          />
          <div className="range-ends">
            <span>Bare table</span>
            <span>60 kg</span>
          </div>
          <div className="control-readings">
            <span>
              {sine ? "Acceleration" : "DC offset"}
              <b>
                {sine
                  ? `${nice(s.accelerationPeak / G)} g pk`
                  : displacement(s.x.re)}
              </b>
            </span>
            <span>
              fₙ <b>{s.fn.toFixed(1)} Hz</b>
            </span>
          </div>
        </div>
      </section>
      <Notes open={notes} onClose={() => setNotes(false)} solution={s} />
    </main>
  );
}
