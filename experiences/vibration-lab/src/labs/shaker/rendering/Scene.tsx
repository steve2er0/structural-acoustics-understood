import { LabCanvas, LabEnvironment, SceneBoundary } from "@engine/Scene";
import { CameraController, type CameraPreset } from "@engine/Camera";
import { createAnnotationProjector } from "@engine/annotations";
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Machine, { type MachinePose } from "./Machine";
import Fields from "./Fields";
import TestLab from "./TestLab";
import type { Solution } from "../shaker-model/model";
import { playbackFrequency, type AnimationClock } from "../animation/motion";
import type { CameraView, Display, Lesson } from "../animation/state";

const VIEWS: Record<
  CameraView,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  "Test lab": { position: [11.5, 6.7, 15.3], target: [-0.6, 0.8, -1.1] },
  System: { position: [7.6, 5.1, 9.8], target: [-1.08, 0.5, 0] },
  Cutaway: { position: [6.7, 3.7, 8.5], target: [-0.82, 0.65, 0] },
  "Field coil": { position: [4.9, 1.35, 5.9], target: [-0.55, -0.2, 0.25] },
  "Air gap": { position: [4.5, 2.75, 5.1], target: [-0.12, 1.19, 0.4] },
  "Drive coil": { position: [4.2, 2.7, 4.9], target: [0.03, 1.4, 0.38] },
  Armature: { position: [5.4, 4.6, 6.3], target: [-0.58, 2.05, 0.18] },
  Suspension: { position: [4.5, 4.2, 5.0], target: [-0.15, 1.91, 0.18] },
  Exploded: { position: [8.4, 6.4, 10.1], target: [-1.0, 1.12, 0] },
};
function shakerFraming(
  preset: CameraPreset,
  _view: CameraView,
  width: number,
): CameraPreset {
  const p = new THREE.Vector3(...preset.position),
    t = new THREE.Vector3(...preset.target);
  if (width < 720) {
    t.x = 0;
    p.sub(t).multiplyScalar(1.38).add(t);
  }
  return { position: p.toArray(), target: t.toArray() };
}
export interface LabelRefs {
  field: RefObject<HTMLDivElement | null>;
  drive: RefObject<HTMLDivElement | null>;
  table: RefObject<HTMLDivElement | null>;
  detail: RefObject<HTMLDivElement | null>;
}
interface Props {
  solution: Solution;
  clock: RefObject<AnimationClock>;
  cameraView: CameraView;
  revision: number;
  display: Display;
  lesson: Lesson;
  paused: boolean;
  labels: LabelRefs;
}
function Rig({
  cameraView,
  revision,
  paused,
  solution,
  clock,
  labels,
  pose,
  display,
  stage,
}: Props & {
  pose: RefObject<MachinePose>;
  stage: RefObject<HTMLDivElement | null>;
}) {
  const projectLabel = useMemo(createAnnotationProjector, []);
  useFrame(({ camera, size }, dt) => {
    if (!paused && !document.hidden) {
      clock.current.elapsed += Math.min(dt, 0.05);
      clock.current.theta +=
        Math.min(dt, 0.05) *
        Math.PI *
        2 *
        playbackFrequency(solution.parameters.frequency);
    }
    const refs = [labels.field, labels.drive, labels.table, labels.detail];
    const detailPosition: [number, number, number] =
      cameraView === "Air gap"
        ? [1.08, 1.49, -0.28]
        : cameraView === "Suspension"
          ? [1.59, 1.93, 0.18]
          : cameraView === "Field coil" || cameraView === "Exploded"
            ? [0.66, 0.56 + pose.current.explosion * 0.5, 0.55]
            : [1.95, 0.42, -0.55];
    const points = [
      new THREE.Vector3(1.39, -0.39 - pose.current.explosion * 0.35, 1.21),
      new THREE.Vector3(
        -0.3,
        1.04 + pose.current.displacement + pose.current.explosion * 1.65,
        1.05,
      ),
      new THREE.Vector3(
        1.3,
        2.46 + pose.current.displacement + pose.current.explosion * 1.65,
        0.58,
      ),
      new THREE.Vector3(...detailPosition),
    ];
    refs.forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      const p = points[i].clone().project(camera),
        x = (p.x * 0.5 + 0.5) * size.width,
        y = (-p.y * 0.5 + 0.5) * size.height;
      const hide =
        (i === 3 &&
          !["Air gap", "Suspension", "Field coil", "Exploded"].includes(
            cameraView,
          ) &&
          display !== "circuit") ||
        (i !== 2 && display === "assembled") ||
        p.z > 1 ||
        x < 0 ||
        x > size.width - 40 ||
        y < 30 ||
        y > size.height - 25;
      projectLabel(el, points[i].toArray(), camera, size, {
        visible: !hide,
        offsetX: i === 1 ? -172 : 0,
        margin: 25,
      });
    });
  });
  return (
    <CameraController
      presets={VIEWS}
      view={cameraView}
      revision={revision}
      responsive={shakerFraming}
      speed={3.5}
      damping={0.07}
      minDistance={3.1}
      maxDistance={25}
      minPolar={0.12}
      stage={stage}
    />
  );
}
function World(props: Props & { stage: RefObject<HTMLDivElement | null> }) {
  const pose = useRef<MachinePose>({
    displacement: 0,
    explosion: 0,
    cut: 1,
    circuit: 0,
  });
  return (
    <>
      <color attach="background" args={["#101b20"]} />
      <fog attach="fog" args={["#283940", 22, 58]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#dee9e9", "#3a4652", 0.6]} />
      <directionalLight position={[4, 3, 7]} intensity={1.3} color="#dbe5dc" />
      <directionalLight
        position={[2, 8, 5]}
        intensity={2.6}
        color="#fff3dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={12}
        shadow-camera-bottom={-10}
        shadow-normalBias={0.03}
      />
      <directionalLight
        position={[-5, 2, 1]}
        intensity={0.85}
        color="#9ac7d2"
      />
      <directionalLight position={[2, 5, -4]} intensity={1.5} color="#d9e2dd" />
      <LabEnvironment variant="shaker" />
      <Machine {...props} pose={pose} />
      <Fields {...props} pose={pose} />
      <TestLab />
      <Rig {...props} pose={pose} />
    </>
  );
}
export default function Scene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <SceneBoundary>
      <div className="webgl-stage" ref={stage} data-camera-settled="false">
        <LabCanvas
          shadows="percentage"
          dpr={[1, 1.75]}
          camera={{
            position: VIEWS.System.position,
            fov: 38,
            near: 0.05,
            far: 100,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
        >
          <World {...props} stage={stage} />
        </LabCanvas>
      </div>
    </SceneBoundary>
  );
}
