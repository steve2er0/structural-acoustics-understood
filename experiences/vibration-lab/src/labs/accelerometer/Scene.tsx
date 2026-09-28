import { memo, useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { LabEnvironment } from "@engine/Scene";
import {
  CameraController,
  type CameraPresets,
  type CameraPreset,
} from "@engine/Camera";
import { EngineeringVectorObject } from "@engine/EngineeringVector";
import { createAnnotationProjector } from "@engine/annotations";
import { Vector3 } from "three";
import {
  Sensor,
  samplePose,
  type Display,
  type Focus,
  type Pose,
} from "./Sensor";
import { G, sample, type Solution } from "./physics";
export const CAMERAS: CameraPresets<
  | "System"
  | "Sensor"
  | "Cutaway"
  | "Seismic Mass"
  | "Piezoelectric Element"
  | "Electronics"
  | "Exploded"
  | "Frequency Response"
> = {
  System: { position: [7, 5.5, 9], target: [-0.6, 1.6, 0] },
  Sensor: { position: [5.3, 3.7, 7.2], target: [0, 1.65, 0] },
  Cutaway: { position: [5.5, 4.3, 7.4], target: [-0.4, 1.6, 0] },
  "Seismic Mass": { position: [3.5, 2.8, 4.5], target: [0, 1.3, 0] },
  "Piezoelectric Element": { position: [2.6, 2.2, 3.7], target: [0.1, 1.3, 0] },
  Electronics: { position: [3.5, 5.0, 4.8], target: [0, 2.3, 0] },
  Exploded: { position: [10, 8.7, 13], target: [-0.6, 3.9, 0] },
  "Frequency Response": { position: [6.5, 5, 9], target: [-0.5, 1.7, 0] },
};
export type View = keyof typeof CAMERAS;
export interface Clock {
  phase: number;
  elapsed: number;
}
function framing(p: CameraPreset, view: View, width: number): CameraPreset {
  if (width >= 700) return p;
  if (view === "Piezoelectric Element")
    return { position: [3.2, 2.6, 5.8], target: [0, 1.3, 0] };
  if (view === "Seismic Mass")
    return { position: [4.5, 3.7, 7], target: [0, 1.4, 0] };
  if (view === "Electronics")
    return { position: [4, 5.3, 6], target: [0, 2.3, 0] };
  return view === "Exploded"
    ? { position: [12, 9, 16], target: [0, 3.7, 0] }
    : { position: [7, 5.2, 10], target: [0, 1.6, 0] };
}
function World({
  solution,
  clock,
  display,
  view,
  revision,
  focus,
  paused,
  labels,
  onFocus,
}: {
  solution: Solution;
  clock: RefObject<Clock>;
  display: Display;
  view: View;
  revision: number;
  focus: Focus;
  paused: boolean;
  labels: RefObject<(HTMLDivElement | null)[]>;
  onFocus: (f: Focus) => void;
}) {
  const pose = useRef<Pose>({ base: 0, relative: 0, explosion: 0, charge: 0 });
  const project = useMemo(createAnnotationProjector, []);
  const acceleration = useMemo(
      () => new EngineeringVectorObject("#b9e2d3", "a"),
      [],
    ),
    force = useMemo(() => new EngineeringVectorObject("#efc08a", "F"), []);
  useEffect(
    () => () => {
      acceleration.dispose();
      force.dispose();
    },
    [acceleration, force],
  );
  const origin = useMemo(() => new Vector3(), []),
    direction = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }, dt) => {
    if (!paused && !document.hidden) {
      clock.current.phase +=
        Math.min(dt, 0.05) * 2 * Math.PI * solution.visualFrequency;
      clock.current.elapsed += Math.min(dt, 0.05);
    }
    const state = sample(solution, clock.current.phase),
      p = samplePose(state, solution.manual);
    Object.assign(pose.current, p);
    acceleration.sample({
      origin: origin.set(-1.8, 0.65 + p.base, 0.5),
      direction: direction.set(0, Math.sign(state.acceleration) || 1, 0),
      physicalValue: state.acceleration,
      visualLength: (Math.abs(state.acceleration) / (10 * G)) * 1.3,
      visible: true,
    });
    force.sample({
      origin: origin.set(
        0.94,
        1.25 + p.base + pose.current.explosion * 2.65,
        0.2,
      ),
      direction: direction.set(0, Math.sign(state.drive) || 1, 0),
      physicalValue: state.drive,
      visualLength: (Math.abs(state.drive) / (0.003 * 10 * G)) * 1.0,
      visible: display !== "Assembled",
    });
    const ex = pose.current.explosion,
      by = p.base;
    project(labels.current[0], [1, 1.35 + by + 2.65 * ex, 0], camera, size, {
      offsetX: 45,
      offsetY: -10,
      visible:
        display !== "Assembled" && (focus === "mass" || focus === "housing"),
      keepInside: true,
    });
    project(
      labels.current[1],
      [0.5, 1.22 + by + 1.25 * ex, 0.05],
      camera,
      size,
      {
        offsetX: 38,
        offsetY: size.height < 420 ? -25 : 40,
        visible:
          display !== "Assembled" && (focus === "piezo" || focus === "preload"),
        keepInside: true,
      },
    );
    project(
      labels.current[2],
      [-0.4, 2.5 + by + 4.1 * ex, -0.2],
      camera,
      size,
      {
        offsetX: 35,
        offsetY: -40,
        visible: display !== "Assembled" && focus === "electronics",
        keepInside: true,
      },
    );
  }, -1);
  return (
    <>
      <color attach="background" args={["#15272b"]} />
      <fog attach="fog" args={["#15272b", 24, 55]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[0, 8, 5]}
        color="#faf0d9"
        intensity={3}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-normalBias={0.025}
      />
      <directionalLight position={[-4, 3, 2]} color="#b6e5e5" intensity={2} />
      <LabEnvironment />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.59} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#203c40" roughness={0.72} />
      </mesh>
      <gridHelper args={[32, 32, "#355155", "#2b464b"]} position-y={-0.585} />
      <Sensor display={display} focus={focus} pose={pose} onFocus={onFocus} />
      <primitive object={acceleration} />
      <primitive object={force} />
      <CameraController
        presets={CAMERAS}
        view={view}
        revision={revision}
        responsive={framing}
        minDistance={3}
      />
    </>
  );
}
export default memo(World);
