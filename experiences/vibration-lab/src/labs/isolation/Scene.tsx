import { LabCanvas, LabEnvironment, SceneBoundary } from "@engine/Scene";
import { CameraController, type CameraPreset } from "@engine/Camera";
import { createAnnotationProjector } from "@engine/annotations";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Assembly } from "./Hardware";
import TestLab from "./TestLab";
import { Shaker, SignalGenerator } from "./Instruments";
import { ASSEMBLY, GENERATOR } from "./scene-layout";
import { regime, TAU, type Solution } from "./physics";
import { playbackFrequency } from "./visualization";
import type { View } from "./state";

const COLORS = {
  coupled: "#a4c6cc",
  resonance: "#efb47b",
  isolation: "#a9edc8",
};
const VIEWS: Record<
  View,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  "Test lab": { position: [12.8, 7.5, 16.5], target: [1.1, 0.3, -1] },
  System: { position: [8.8, 5.6, 11.3], target: [0.2, 0.9, 0] },
  Isolator: { position: [2.85, 3.29, 2.79], target: [0.28, 2.23, 0.53] },
  "Force path": { position: [3.4, 3.66, 4.7], target: [-0.34, 2.5, 0] },
  Side: { position: [0.1, 3.9, 12.5], target: [-0.45, 1, 0] },
  Exploded: { position: [9.5, 7, 12.8], target: [0.1, 1.5, 0] },
};

function isolationFraming(
  preset: CameraPreset,
  view: View,
  width: number,
): CameraPreset {
  const p = new THREE.Vector3(...preset.position),
    t = new THREE.Vector3(...preset.target);
  if (width <= 800) {
    if (["System", "Exploded", "Test lab"].includes(view)) {
      t.set(1.3, 1.3, 0);
      p.multiplyScalar(1.3);
      p.x += 1.3;
    } else {
      t.x = 0;
      p.multiplyScalar(1.18);
    }
  }
  return { position: p.toArray(), target: t.toArray() };
}

/** Project native controls onto the generator's front plane. Offscreen or
 * back-facing instruments use a fixed panel so the controls remain accessible. */
function GeneratorProjection({
  element,
  view,
}: {
  element: RefObject<HTMLElement | null>;
  view: View;
}) {
  const matrices = useMemo(() => {
    const face = new THREE.Matrix4().compose(
      new THREE.Vector3(...GENERATOR.position),
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        GENERATOR.rotation,
      ),
      new THREE.Vector3().setScalar(GENERATOR.scale),
    );
    const units = GENERATOR.width / GENERATOR.pixels;
    face.multiply(
      new THREE.Matrix4().set(
        units,
        0,
        0,
        -GENERATOR.width / 2,
        0,
        -units,
        0,
        GENERATOR.height / 2,
        0,
        0,
        1,
        GENERATOR.faceZ + 0.023,
        0,
        0,
        0,
        1,
      ),
    );
    return {
      face,
      pixel: new THREE.Matrix4(),
      result: new THREE.Matrix4(),
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(
        Math.sin(GENERATOR.rotation),
        0,
        Math.cos(GENERATOR.rotation),
      ),
      direction: new THREE.Vector3(),
    };
  }, []);
  useFrame(({ camera, size }) => {
    const dom = element.current;
    if (!dom) return;
    const center = matrices.point.set(...GENERATOR.position);
    const front =
      matrices.normal.dot(
        matrices.direction.copy(camera.position).sub(center).normalize(),
      ) > 0.5;
    center.project(camera);
    const projected =
      size.width > 800 &&
      (view === "System" || view === "Exploded" || view === "Test lab") &&
      front &&
      camera.position.x > 3 &&
      camera.position.z > 5 &&
      Math.abs(center.x) < 0.78 &&
      Math.abs(center.y) < 0.76;
    dom.dataset.projected = String(projected);
    if (!projected) {
      dom.style.transform = "";
      return;
    }
    matrices.pixel.set(
      size.width / 2,
      0,
      0,
      size.width / 2,
      0,
      -size.height / 2,
      0,
      size.height / 2,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
    );
    matrices.result
      .copy(matrices.pixel)
      .multiply(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse)
      .multiply(matrices.face);
    const e = matrices.result.elements;
    // Keep the complete face above the control dock and large enough to use.
    const width = GENERATOR.pixels;
    const height = (width * GENERATOR.height) / GENERATOR.width;
    const corners = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ].map(([x, y]) => {
      const w = e[3] * x + e[7] * y + e[15];
      return [
        (e[0] * x + e[4] * y + e[12]) / w,
        (e[1] * x + e[5] * y + e[13]) / w,
      ];
    });
    const left = Math.min(...corners.map((p) => p[0]));
    const right = Math.max(...corners.map((p) => p[0]));
    const fits =
      left > size.width * 0.35 &&
      right < size.width - 20 &&
      right - left >= 135 &&
      right - left <= 540 &&
      corners.every((p) => p[1] > 145 && p[1] < size.height - 30);
    if (!fits) {
      dom.dataset.projected = "false";
      dom.style.transform = "";
      return;
    }
    const denominator = e[15];
    for (let i = 0; i < 16; i++) e[i] /= denominator;
    e[2] = e[6] = e[8] = e[9] = e[11] = e[14] = 0;
    e[10] = 1;
    dom.style.transform = `matrix3d(${e.join(",")})`;
  });
  useEffect(
    () => () => {
      if (element.current) {
        element.current.dataset.projected = "false";
        element.current.style.transform = "";
      }
    },
    [element],
  );
  return null;
}

interface ProjectedLabels {
  payload: RefObject<HTMLDivElement | null>;
  mount: RefObject<HTMLButtonElement | null>;
}
function World({
  solution,
  frequency,
  paused,
  forceFlow,
  envelope,
  view,
  revision,
  labels,
  generatorFace,
}: SceneProps & { labels: ProjectedLabels }) {
  const theta = useRef(0);
  const explosion = useRef(view === "Exploded" ? 1 : 0);
  const spotlight = useRef<THREE.PointLight>(null);
  const color = COLORS[regime(solution.r)];
  const lightColor = useMemo(() => new THREE.Color(color), [color]);
  const projectLabel = useMemo(createAnnotationProjector, []);
  useFrame((state, dt) => {
    if (!paused && !document.hidden)
      theta.current =
        (theta.current +
          Math.min(dt, 0.05) * TAU * playbackFrequency(frequency)) %
        TAU;
    explosion.current = THREE.MathUtils.damp(
      explosion.current,
      view === "Exploded" ? 1 : 0,
      4,
      Math.min(dt, 0.05),
    );
    if (spotlight.current) spotlight.current.color.lerp(lightColor, 0.07);
    const showLabels =
      state.size.width >= 800 && (view === "System" || view === "Exploded");
    const project = (
      element: HTMLElement | null,
      x: number,
      y: number,
      z: number,
    ) => {
      projectLabel(element, [x, y, z], state.camera, state.size, {
        centered: true,
        visible: showLabels,
        margin: 30,
      });
    };
    project(
      labels.payload.current,
      2.7 * ASSEMBLY.scale,
      ASSEMBLY.lift + (2.9 + explosion.current * 1.7) * ASSEMBLY.scale,
      -0.5 * ASSEMBLY.scale,
    );
    project(
      labels.mount.current,
      -2.9 * ASSEMBLY.scale,
      ASSEMBLY.lift + (0.6 + explosion.current * 0.68) * ASSEMBLY.scale,
      1.1 * ASSEMBLY.scale,
    );
  });
  return (
    <>
      <color attach="background" args={["#101719"]} />
      <fog attach="fog" args={["#283940", 26, 62]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#cde2e4", "#253030", 0.8]} />
      <directionalLight
        position={[-3, 8, 5]}
        color="#f4eddb"
        intensity={2.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.025}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-far={40}
      />
      <directionalLight position={[5, 4, -4]} color="#b5ced3" intensity={1.6} />
      <pointLight
        ref={spotlight}
        position={[-1.4, 1.5, 3]}
        color={color}
        intensity={2.3}
        distance={7}
      />
      <LabEnvironment variant="isolation" />
      <TestLab isolation />
      <Shaker solution={solution} theta={theta} />
      <SignalGenerator frequency={frequency} />
      <GeneratorProjection element={generatorFace} view={view} />
      <group position={[0, ASSEMBLY.lift, 0]} scale={ASSEMBLY.scale}>
        <Assembly
          solution={solution}
          theta={theta}
          explosion={explosion}
          forceFlow={forceFlow}
          envelope={envelope}
        />
      </group>
      <CameraController
        presets={VIEWS}
        view={view}
        revision={revision}
        responsive={isolationFraming}
      />
    </>
  );
}
export interface SceneProps {
  generatorFace: RefObject<HTMLElement | null>;
  solution: Solution;
  frequency: number;
  massLb: number;
  paused: boolean;
  forceFlow: boolean;
  envelope: boolean;
  view: View;
  revision: number;
  onView: (view: View) => void;
}
export default function Scene(props: SceneProps) {
  const payload = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLButtonElement>(null);
  const labels = useMemo(() => ({ payload, mount }), []);
  return (
    <SceneBoundary>
      <LabCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.5]}
        camera={{ position: [8.8, 5.6, 11.3], fov: 36, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        aria-label="3D payload on four spring-damper mounts, a stationary shaker housing with moving armature, and a connected frequency generator"
      >
        <World {...props} labels={labels} />
      </LabCanvas>
      <div ref={payload} className="scene-label payload-label projected-label">
        <span className="label-line" />
        <span>01 / PAYLOAD</span>
        <strong>
          {props.massLb.toFixed(1)} lb <em>rigid body</em>
        </strong>
      </div>
      <button
        ref={mount}
        className="scene-label mount-label projected-label"
        onClick={() => props.onView("Isolator")}
      >
        <span className="label-line" />
        <span>02 / ISOLATORS ↗</span>
        <strong>
          4 mounts <em>in parallel</em>
        </strong>
      </button>
    </SceneBoundary>
  );
}
