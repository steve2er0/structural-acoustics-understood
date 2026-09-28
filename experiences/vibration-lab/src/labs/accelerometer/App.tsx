import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { LabCanvas, SceneBoundary } from "@engine/Scene";
import { LabNavigation } from "@components/LabNavigation";
import { ParameterSlider, SegmentedControl } from "@components/Controls";
import { TourTransport } from "@components/TourTransport";
import { useGuidedTour } from "@engine/useGuidedTour";
import World, { CAMERAS, type Clock, type View } from "./Scene";
import { type Display, type Focus } from "./Sensor";
import {
  DEFAULT,
  FREQUENCY_RANGE,
  G,
  USABLE_BAND,
  magnitude,
  sample,
  solve,
  sweepFrequency,
  type Settings,
} from "./physics";
import { frequency, signed, voltage } from "./format";
import { Waveforms, FrequencyResponse } from "./Plots";
import { TOUR } from "./tour";
import Notes from "./Notes";
import "./style.css";
const PARTS: {
  id: Focus;
  title: string;
  label: string;
  copy: string;
  camera: View;
}[] = [
  {
    id: "mass",
    title: "A mass that loads the crystal.",
    label: "Seismic mass",
    copy: "The housing follows the structure. The 3 g mass creates an opposing inertial drive in the housing frame.",
    camera: "Seismic Mass",
  },
  {
    id: "piezo",
    title: "Mechanical stress. Electrical charge.",
    label: "Shear element",
    copy: "The annular ceramic is sheared between the post and mass. Opposite electrode charges follow the signed load.",
    camera: "Piezoelectric Element",
  },
  {
    id: "electronics",
    title: "A useful voltage, over one cable.",
    label: "IEPE electronics",
    copy: "A high-impedance piezo signal becomes a low-impedance voltage. Constant-current power shares the signal cable.",
    camera: "Electronics",
  },
  {
    id: "preload",
    title: "A tight radial connection.",
    label: "Preload collar",
    copy: "A shrink-fit collar holds the mass and ceramic against the central post. The dynamic sensing load acts axially, in shear.",
    camera: "Cutaway",
  },
];
type Panel = "Chain" | "Waveforms" | "Response";
export default function AccelerometerApp() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT }),
    [display, setDisplay] = useState<Display>("Cutaway"),
    [view, setView] = useState<View>("Cutaway"),
    [revision, setRevision] = useState(0),
    [focus, setFocus] = useState<Focus>("piezo"),
    [panel, setPanel] = useState<Panel>("Chain"),
    [paused, setPaused] = useState(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [notes, setNotes] = useState(false),
    [sweeping, setSweeping] = useState(false);
  const sweepElapsed = useRef(0);
  const controlsPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (controlsPanel.current) controlsPanel.current.scrollTop = 0;
  }, [settings.mode]);
  const clock = useRef<Clock>({ phase: Math.PI / 2, elapsed: 0 }),
    labels = useRef<(HTMLDivElement | null)[]>([]);
  const solution = useMemo(() => solve(settings), [settings]);
  const [live, setLive] = useState(() => ({
    ...sample(solution, clock.current.phase),
    phase: clock.current.phase,
  }));
  const currentSolution = useRef(solution);
  currentSolution.current = solution;
  useEffect(() => {
    setLive({
      ...sample(solution, clock.current.phase),
      phase: clock.current.phase,
    });
  }, [solution]);
  useEffect(() => {
    const id = window.setInterval(
      () =>
        setLive({
          ...sample(currentSolution.current, clock.current.phase),
          phase: clock.current.phase,
        }),
      50,
    );
    return () => clearInterval(id);
  }, []);
  const camera = (next: View) => {
    setView(next);
    setRevision((n) => n + 1);
  };
  const tour = useGuidedTour({
    steps: TOUR,
    paused,
    onSample: (s, _t, progress, entered) => {
      if (entered) {
        setSettings((old) => ({ ...old, ...s.settings }));
        setDisplay(s.display);
        setFocus(s.focus);
        setPanel(s.panel);
        camera(s.view);
      }
      if (s.sweep)
        setSettings((old) => ({ ...old, frequency: sweepFrequency(progress) }));
    },
  });
  const stop = () => {
    tour.stop();
    setSweeping(false);
  };
  const change = (patch: Partial<Settings>) => {
    stop();
    setSettings((old) => ({ ...old, ...patch }));
  };
  const changeHandler = useRef(change);
  changeHandler.current = change;
  const changeFrequency = useCallback((f: number) => {
    changeHandler.current({ mode: "Sine", frequency: f });
    setPanel("Response");
  }, []);
  const chooseFocus = (part: Focus) => {
    stop();
    if (window.matchMedia("(max-width:700px)").matches)
      window.scrollTo({
        top: 225,
        behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches
          ? "instant"
          : "smooth",
      });
    setFocus(part);
    if (part === "housing") {
      camera("Sensor");
      return;
    }
    setDisplay("Cutaway");
    camera(PARTS.find((p) => p.id === part)!.camera);
  };
  const focusHandler = useRef(chooseFocus);
  focusHandler.current = chooseFocus;
  const selectPart = useCallback(
    (part: Focus) => focusHandler.current(part),
    [],
  );
  const closeNotes = useCallback(() => setNotes(false), []);
  useEffect(() => {
    if (!sweeping) return;
    let id = 0,
      last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!paused && !document.hidden) {
        sweepElapsed.current += dt;
        setSettings((s) => ({
          ...s,
          frequency: sweepFrequency(sweepElapsed.current / 26),
        }));
      }
      if (sweepElapsed.current >= 26) {
        setSweeping(false);
        return;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [sweeping, paused]);
  const reset = () => {
    if (controlsPanel.current) controlsPanel.current.scrollTop = 0;
    tour.reset();
    setSweeping(false);
    setSettings({ ...DEFAULT });
    setDisplay("Cutaway");
    setFocus("piezo");
    setPanel("Chain");
    setPaused(false);
    clock.current = { phase: Math.PI / 2, elapsed: 0 };
    camera("Cutaway");
  };
  const choosePanel = (next: Panel) => {
    stop();
    setPanel(next);
    if (next !== "Chain") {
      setSettings((s) => ({ ...s, mode: "Sine" }));
      if (next === "Response") camera("Frequency Response");
    }
  };
  const part = PARTS.find((p) => p.id === focus) ?? PARTS[0];
  const manual = solution.manual;
  const state = manual ? sample(solution, 0) : live;
  const bodyCopy =
    settings.frequency < USABLE_BAND[0]
      ? "Inertia remains. The electrical path is losing the slowly changing signal."
      : settings.frequency > USABLE_BAND[1]
        ? "The sensing core has dynamics of its own. Output amplitude and phase are no longer faithful to acceleration."
        : "In the flat band, output voltage closely follows acceleration.";
  return (
    <main className="ac-lab">
      <LabNavigation
        active="accelerometer"
        onRestart={reset}
        onTour={() => {
          reset();
          setPaused(false);
          tour.start();
        }}
        onHelp={() => setNotes(true)}
        touring={tour.active}
      />
      <section
        className="ac-stage"
        aria-label="Annular shear IEPE accelerometer experiment"
      >
        <SceneBoundary>
          <LabCanvas camera={{ position: CAMERAS.Cutaway.position, fov: 36 }}>
            <World
              solution={solution}
              clock={clock}
              display={display}
              view={view}
              revision={revision}
              focus={focus}
              paused={paused}
              labels={labels}
              onFocus={selectPart}
            />
          </LabCanvas>
        </SceneBoundary>
        {[
          ["SEISMIC MASS", "3.00 g · inertia loads the sensing element"],
          [
            "PIEZOELECTRIC SHEAR RING",
            `${manual ? signed(state.charge * 1e12, 1) : (magnitude(solution.charge) * 1e12).toFixed(1)} pC${manual ? "" : " peak"} · opposite electrode polarities`,
          ],
          ["IEPE CONDITIONING", "High impedance → low impedance"],
        ].map(([title, detail], i) => (
          <div
            className="ac-annotation"
            key={title}
            ref={(el) => {
              labels.current[i] = el;
            }}
          >
            {title}
            <small>{detail}</small>
          </div>
        ))}
        <div className="ac-scale-note">
          <span>ENLARGED SENSOR / REPRESENTATIVE GEOMETRY</span>
          <span className="ac-vector-key">
            Green a: housing acceleration · amber F: inertial drive
          </span>
          <span>
            {display === "Exploded"
              ? "Parts separated for inspection · calculations use the assembled sensor"
              : "Internal deformation ×40,000 · housing travel is a direction cue"}
          </span>
        </div>
      </section>
      <section className="ac-story">
        <p className="vl-eyebrow">
          <span>04</span> / PIEZOELECTRIC ACCELEROMETER
        </p>
        <h1>
          Motion in.
          <br />
          <em>Voltage out.</em>
        </h1>
        <p>How does a tiny sensor turn vibration into voltage?</p>
        <div className="ac-story-line">
          <span>INERTIA</span>
          <ArrowRight />
          <span>CHARGE</span>
          <ArrowRight />
          <span>SIGNAL</span>
        </div>
      </section>
      <section
        ref={controlsPanel}
        className="ac-controls"
        aria-label="Accelerometer controls"
      >
        <div className="ac-section-label">
          <span>APPLY ACCELERATION</span>
          <b>100 mV/g</b>
        </div>
        <SegmentedControl
          label="Input mode"
          value={settings.mode}
          options={[
            { value: "Manual", label: "Manual" },
            { value: "Sine", label: "Sine" },
          ]}
          onChange={(mode) => {
            change({ mode });
            setPanel(mode === "Manual" ? "Chain" : "Waveforms");
          }}
        />
        {manual ? (
          <>
            <ParameterSlider
              label="Acceleration"
              value={settings.acceleration / G}
              min={-10}
              max={10}
              step={0.1}
              unit="g"
              format={(n) => signed(n, 1)}
              onValue={(g) => change({ acceleration: g * G })}
            />
            <div className="ac-presets">
              {[-10, 0, 1, 5, 10].map((g) => (
                <button
                  key={g}
                  aria-pressed={Math.abs(settings.acceleration / G - g) < 0.01}
                  onClick={() => change({ acceleration: g * G })}
                >
                  {g > 0 ? "+" : ""}
                  {g} g
                </button>
              ))}
            </div>
            <p className="ac-control-note">
              Frozen dynamic instant · flat-band sensitivity.
              <br />A piezoelectric sensor does not sustain DC output.
            </p>
          </>
        ) : (
          <>
            <ParameterSlider
              label="Acceleration amplitude"
              value={settings.amplitude / G}
              min={0}
              max={10}
              step={0.1}
              unit="g peak"
              format={(n) => n.toFixed(1)}
              onValue={(g) => change({ amplitude: g * G })}
            />
            <ParameterSlider
              label="Actual frequency"
              value={settings.frequency}
              min={FREQUENCY_RANGE[0]}
              max={FREQUENCY_RANGE[1]}
              logarithmic
              format={frequency}
              onValue={(f) => change({ frequency: f })}
            />
            <div className="ac-frequency-presets">
              {[0.05, 100, 24000].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    change({ frequency: f });
                    setPanel("Response");
                  }}
                >
                  {frequency(f)}
                </button>
              ))}
            </div>
            <p className="ac-control-note">
              Actual: {frequency(settings.frequency)} · viewed at{" "}
              {frequency(solution.visualFrequency)}
              <br />
              All sinusoidal amplitudes are peak.
            </p>
          </>
        )}
        <button
          className={`ac-sweep ${sweeping ? "active" : ""}`}
          onClick={() => {
            if (sweeping) setSweeping(false);
            else {
              tour.stop();
              sweepElapsed.current = 0;
              setSettings((s) => ({
                ...s,
                mode: "Sine",
                frequency: FREQUENCY_RANGE[0],
              }));
              setPanel("Response");
              setPaused(false);
              camera("Frequency Response");
              setSweeping(true);
            }
          }}
        >
          {sweeping ? <Pause size={12} /> : <Play size={12} />}{" "}
          {sweeping ? "Stop frequency sweep" : "Run frequency sweep"}
          <ArrowUpRight size={13} />
        </button>
      </section>
      <aside className="ac-insight" aria-label="Inside the accelerometer">
        <div className="ac-section-label">FOLLOW THE SIGNAL</div>
        <div className="ac-parts">
          {PARTS.map((p) => (
            <button
              key={p.id}
              aria-pressed={focus === p.id}
              onClick={() => chooseFocus(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <h2>{part.title}</h2>
        <p>{part.copy}</p>
        {!manual && panel === "Response" && (
          <p className="ac-band-note">{bodyCopy}</p>
        )}
        <div className="ac-detail">
          <span>Internal relative motion</span>
          <strong>
            {(solution.relativePeak * 1e9).toFixed(2)}{" "}
            <small>nm{manual ? "" : " peak"}</small>
          </strong>
        </div>
        {focus === "electronics" ? (
          <div className="ac-iepe">
            <div>
              <span>CONSTANT CURRENT</span>
              <b>4.0 mA ↓</b>
            </div>
            <div>
              <span>WIRE VOLTAGE</span>
              <b>{state.wireVoltage.toFixed(3)} V</b>
            </div>
            <p>
              12 V bias + {voltage(state.voltage)} AC
              <br />
              One cable carries power and signal.
            </p>
          </div>
        ) : (
          <div className="ac-detail">
            <span>
              {manual ? "Elastic piezo load" : "Elastic piezo load · peak"}
            </span>
            <strong>
              {(manual
                ? state.piezoLoad
                : magnitude(solution.piezoLoad)
              ).toFixed(3)}{" "}
              <small>N</small>
            </strong>
          </div>
        )}
        <div className="ac-detail ac-voltage-detail">
          <span>{manual ? "AC output" : "AC output · peak"}</span>
          <strong>
            {voltage(manual ? state.voltage : solution.voltagePeak, manual)}
          </strong>
        </div>
        <button className="ac-explain" onClick={() => setNotes(true)}>
          Model & assumptions <BookOpen size={12} />
        </button>
      </aside>
      <div className="ac-view-tools">
        <SegmentedControl
          label="Sensor view"
          value={display}
          options={(["Assembled", "Cutaway", "Exploded"] as const).map((v) => ({
            value: v,
            label: v,
          }))}
          onChange={(d) => {
            stop();
            setDisplay(d);
            camera(d === "Assembled" ? "System" : d);
          }}
        />
        <label>
          <span>CAMERA</span>
          <select
            aria-label="Camera preset"
            value={view}
            onChange={(e) => {
              stop();
              const v = e.target.value as View;
              camera(v);
              if (v === "Exploded") setDisplay("Exploded");
              else if (v !== "System" && v !== "Sensor") setDisplay("Cutaway");
              const p = PARTS.find((p) => p.camera === v && p.id !== "preload");
              if (p) setFocus(p.id);
            }}
          >
            {Object.keys(CAMERAS).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Resume animation" : "Pause animation"}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <span>DRAG TO ORBIT · SCROLL TO ZOOM</span>
      </div>
      <section className="ac-data" aria-label="Acceleration to voltage">
        <div className="ac-data-head">
          <SegmentedControl
            label="Signal view"
            value={panel}
            options={[
              { value: "Chain", label: "01  The signal chain" },
              { value: "Waveforms", label: "02  Waveforms" },
              { value: "Response", label: "03  Frequency response" },
            ]}
            onChange={choosePanel}
          />
          <span>
            {manual
              ? "FROZEN DYNAMIC INSTANT"
              : `${frequency(settings.frequency)} · ${(settings.amplitude / G).toFixed(1)} g PEAK`}
          </span>
        </div>
        {panel === "Chain" ? (
          <>
            <div className="ac-chain">
              {[
                [
                  "HOUSING ACCELERATION",
                  signed(state.acceleration / G, 1),
                  "g",
                  "aᵦ",
                ],
                ["INERTIAL DRIVE", signed(state.drive, 3), "N", "−maᵦ"],
                [
                  "GENERATED CHARGE",
                  signed(state.charge * 1e12, 1),
                  "pC",
                  "d × piezo load",
                ],
                [
                  "AC OUTPUT",
                  voltage(state.voltage),
                  "",
                  "S × a in the flat band",
                ],
              ].map(([label, value, unit, equation], i) => (
                <div key={label} className={i === 3 ? "ac-output" : ""}>
                  <span>{label}</span>
                  <strong>
                    {value}
                    <small> {unit}</small>
                  </strong>
                  <p>{equation}</p>
                  {i < 3 && <ArrowRight className="ac-chain-arrow" size={16} />}
                </div>
              ))}
            </div>
            <div className="ac-chain-foot">
              <span>
                {manual
                  ? "Frozen dynamic sample · a piezoelectric sensor does not sustain DC output."
                  : `Instantaneous samples · ${bodyCopy}`}
              </span>
              <button onClick={() => choosePanel("Waveforms")}>
                Try sine vibration <ArrowRight size={12} />
              </button>
            </div>
          </>
        ) : panel === "Waveforms" ? (
          <Waveforms
            solution={solution}
            phase={live.phase}
            actualFrequency={settings.frequency}
          />
        ) : (
          <FrequencyResponse
            solution={solution}
            actualFrequency={settings.frequency}
            onFrequency={changeFrequency}
          />
        )}
      </section>
      <div className="ac-mobile-actions">
        <button onClick={reset}>
          <RotateCcw size={12} /> Reset
        </button>
        <button onClick={() => setNotes(true)}>
          <BookOpen size={12} /> Model notes
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
        <div className="ac-tour-complete" role="status">
          Tour complete · change the input and follow the signal.
        </div>
      )}
      {notes && <Notes close={closeNotes} />}
    </main>
  );
}
