import { memo, useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { LabEnvironment } from "@engine/Scene";
import {
  CameraController,
  type CameraPreset,
  type CameraPresets,
} from "@engine/Camera";
import { createAnnotationProjector } from "@engine/annotations";
import { Assembly, CENTERS, type Display } from "./Assembly";
import { SUBSYSTEMS, type Model } from "./physics";
import type { Simulation } from "./simulation";
export type View =
  | "System"
  | "Subsystem 1"
  | "Subsystem 2"
  | "Subsystem 3"
  | "Subsystem 4"
  | "Subsystem 5"
  | "Subsystem 6"
  | "Subsystem 7"
  | "Energy flow"
  | "Power balance";
const overview: CameraPreset = {
  position: [2.8, 1.1, 17.5],
  target: [0, -0.35, 0],
};
export const CAMERAS: CameraPresets<View> = {
  System: overview,
  "Energy flow": overview,
  "Power balance": overview,
  "Subsystem 1": { position: [1, -3, 3.2], target: [0, CENTERS[0], 0] },
  "Subsystem 2": { position: [2.3, -0.5, 8.5], target: [0, CENTERS[1], 0] },
  "Subsystem 3": { position: [1.4, 2.2, 3.5], target: [0, CENTERS[2], 0] },
  "Subsystem 4": { position: [1.5, 3, 4], target: [0, CENTERS[3], 0] },
  "Subsystem 5": { position: [1.8, 3.8, 3.4], target: [0, 2.9, 0] },
  "Subsystem 6": { position: [1.4, 3.7, 4.4], target: [0, CENTERS[5], 0] },
  "Subsystem 7": { position: [1.4, 3.7, 4.4], target: [0, CENTERS[6], 0] },
};
function framing(p: CameraPreset, view: View, width: number): CameraPreset {
  if (width >= 700) return p;
  if (view === "System" || view === "Energy flow" || view === "Power balance")
    return { position: [2.5, 1.2, 19.5], target: [0, -0.5, 0] };
  return {
    position: [p.position[0] * 1.25, p.position[1], p.position[2] * 1.25],
    target: p.target,
  };
}
function World({
  model,
  live,
  display,
  selected,
  perMode,
  onSelect,
  view,
  revision,
  labels,
}: {
  model: Model;
  live: RefObject<Simulation>;
  display: Display;
  selected: number;
  perMode: boolean;
  onSelect: (i: number) => void;
  view: View;
  revision: number;
  labels: RefObject<(HTMLButtonElement | null)[]>;
}) {
  const project = useMemo(createAnnotationProjector, []);
  useFrame(({ camera, size }) =>
    SUBSYSTEMS.forEach((_, i) =>
      project(labels.current[i], [0.32, CENTERS[i], 0], camera, size, {
        centered: false,
        offsetX: 28,
        offsetY: -16,
        keepInside: true,
        margin: 12,
      }),
    ),
  );
  return (
    <>
      <color attach="background" args={["#17272e"]} />
      <fog attach="fog" args={["#17272e", 26, 65]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[-3, 8, 5]} intensity={3} color="#f5efdc" />
      <directionalLight position={[3, 4, -2]} intensity={2.5} color="#aecfd9" />
      <LabEnvironment />
      <mesh rotation-x={-Math.PI / 2} position-y={-4.48}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#233c46" roughness={0.8} />
      </mesh>
      <gridHelper args={[40, 40, "#34505b", "#2c444f"]} position-y={-4.47} />
      <Assembly
        model={model}
        live={live}
        display={display}
        selected={selected}
        perMode={perMode}
        onSelect={onSelect}
      />
      <CameraController
        presets={CAMERAS}
        view={view}
        revision={revision}
        responsive={framing}
        minDistance={1.5}
        maxDistance={30}
      />
    </>
  );
}
export default memo(World);
