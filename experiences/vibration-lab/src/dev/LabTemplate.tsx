import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { LabCanvas, LabEnvironment, SceneBoundary } from "@engine/Scene";
import {
  CameraController,
  type CameraPresets,
  type CameraPreset,
} from "@engine/Camera";
import { EngineeringVector } from "@engine/EngineeringVector";
import { createAnnotationProjector } from "@engine/annotations";
import { highlightIntensity } from "@engine/highlight";
import { useGuidedTour } from "@engine/useGuidedTour";
import {
  EngineeringReadout,
  ParameterSlider,
  SegmentedControl,
  Toggle,
} from "@components/Controls";
import { TourTransport } from "@components/TourTransport";
import { LabNavigation } from "@components/LabNavigation";
const CAMERAS: CameraPresets<"System" | "Closeup"> = {
  System: { position: [4, 3, 6], target: [0, 0.7, 0] },
  Closeup: { position: [2, 1.9, 3.2], target: [0, 0.8, 0] },
};
function framing(
  preset: CameraPreset,
  view: keyof typeof CAMERAS,
  width: number,
): CameraPreset {
  if (width > 600) return preset;
  return {
    position: view === "Closeup" ? [4, 3.4, 6.5] : [6.5, 4, 9],
    target: [0, 1.8, 0],
  };
}
const TOUR = [
  {
    duration: 5,
    title: "Start with one object.",
    copy: "A small development scene built from the shared platform.",
    force: 0,
    view: "System" as const,
    focus: false,
  },
  {
    duration: 5,
    title: "Separate value from drawing.",
    copy: "The arrow retains 8 N. A display gain of 0.18 scene units per newton sets its length.",
    force: 8,
    view: "Closeup" as const,
    focus: true,
  },
  {
    duration: 5,
    title: "Reverse the direction.",
    copy: "A negative force reverses the vector. The same camera, annotation and tour systems work here.",
    force: -5,
    view: "System" as const,
    focus: true,
  },
];
function World({
  force,
  view,
  revision,
  focus,
  label,
}: {
  force: number;
  view: keyof typeof CAMERAS;
  revision: number;
  focus: boolean;
  label: RefObject<HTMLDivElement | null>;
}) {
  const project = useMemo(createAnnotationProjector, []);
  useFrame(({ camera, size }) =>
    project(label.current, [0.8, 0.6, 0], camera, size, {
      visible: focus,
      offsetX: 15,
      keepInside: true,
    }),
  );
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 6, 4]} intensity={3} />
      <LabEnvironment />
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.4, 0.6, 1.4]} />
        <meshStandardMaterial
          color="#6d9390"
          metalness={0.65}
          roughness={0.28}
          emissive="#c2efd0"
          emissiveIntensity={highlightIntensity(0, focus)}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#152529" roughness={0.8} />
      </mesh>
      <EngineeringVector
        origin={[0, 0.65, 0]}
        magnitude={force}
        gain={0.18}
        maxLength={2}
        label="F"
      />
      <CameraController
        presets={CAMERAS}
        view={view}
        revision={revision}
        responsive={framing}
      />
    </>
  );
}
export default function LabTemplate() {
  const [force, setForce] = useState(3),
    [view, setView] = useState<keyof typeof CAMERAS>("System"),
    [revision, setRevision] = useState(0),
    [focus, setFocus] = useState(true),
    [paused, setPaused] = useState(false),
    [help, setHelp] = useState(false);
  const label = useRef<HTMLDivElement>(null);
  const tour = useGuidedTour({
    steps: TOUR,
    paused,
    onSample: (step, _t, _p, entered) => {
      if (entered) {
        setForce(step.force);
        setView(step.view);
        setFocus(step.focus);
        setRevision((r) => r + 1);
      }
    },
  });
  const reset = () => {
    tour.reset();
    setForce(3);
    setView("System");
    setFocus(true);
    setRevision((r) => r + 1);
  };
  return (
    <main className="vl-template">
      <LabNavigation
        active="template"
        onRestart={reset}
        onTour={() => {
          setPaused(false);
          tour.start();
        }}
        onHelp={() => setHelp(!help)}
        touring={tour.active}
      />
      <section className="vl-template-story">
        <p className="vl-eyebrow">DEVELOPMENT / PLATFORM PROOF</p>
        <h1>
          One object.
          <br />
          Shared tools.
        </h1>
        <p>
          {tour.active
            ? TOUR[tour.index].copy
            : "A tiny scene, one physical value, and the same infrastructure as the production labs."}
        </p>
        {help && (
          <p>
            This development route is excluded from the production bundle. The
            object is a drawing target, not an additional dynamics model.
          </p>
        )}
      </section>
      <div className="vl-template-scene">
        <SceneBoundary>
          <LabCanvas camera={{ position: CAMERAS.System.position, fov: 40 }}>
            <World
              force={force}
              view={view}
              revision={revision}
              focus={focus}
              label={label}
            />
          </LabCanvas>
        </SceneBoundary>
        <div className="vl-annotation" ref={label}>
          TEST OBJECT<small>Shared highlight + projection</small>
        </div>
      </div>
      <section className="vl-template-controls">
        <ParameterSlider
          label="Applied force"
          value={force}
          min={-10}
          max={10}
          unit="N"
          onValue={(n) => {
            tour.stop();
            setForce(n);
          }}
          marks={[-10, 0, 10]}
        />
        <EngineeringReadout label="Physical force" value={force} unit="N" />
        <SegmentedControl
          label="Camera preset"
          value={view}
          options={[
            { value: "System", label: "System" },
            { value: "Closeup", label: "Closeup" },
          ]}
          onChange={(v) => {
            tour.stop();
            setView(v);
            setRevision((r) => r + 1);
          }}
        />
        <Toggle checked={focus} onChange={setFocus}>
          Highlight object
        </Toggle>
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
    </main>
  );
}
