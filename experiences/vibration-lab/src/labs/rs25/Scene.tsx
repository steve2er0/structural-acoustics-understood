import { memo, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { LabEnvironment } from "@engine/Scene";
import { CameraController, type CameraPreset } from "@engine/Camera";
import { createAnnotationProjector } from "@engine/annotations";
import {
  CAMERAS,
  PARTS,
  type Display,
  type Part,
  type Topic,
  type View,
} from "./content";
import { Engine, partPosition } from "./Engine";
import type { Playback } from "./simulation";
import { LPFTPStudy } from "./Inducer";
import { DEFAULT_LPFTP, type LPFTPSettings } from "./lpftp";
function inducerFraming(
  _p: CameraPreset,
  _view: View,
  width: number,
): CameraPreset {
  return {
    position: width < 700 ? [3, 3.2, -12.5] : [3, 2.8, -10.5],
    target: [0, 0.55, 0],
  };
}
function cavityFraming(
  _p: CameraPreset,
  _view: View,
  width: number,
): CameraPreset {
  return {
    position: width < 700 ? [1.3, 1.4, -5.8] : [0.9, 1.15, -4.7],
    target: [0, 0.18, 0],
  };
}
export const LABEL_PARTS: Part[] = [
  "lpftp",
  "lpotp",
  "hpftp",
  "hpotp",
  "pogo",
  "fp",
  "op",
  "injector",
  "nozzle",
];
function framing(p: CameraPreset, view: View, width: number): CameraPreset {
  if (width < 700)
    return view === "Plume"
      ? { position: [0, -3, 34], target: [0, -5, 0] }
      : view === "Engine" || view === "Exploded" || view === "Cutaway"
        ? { position: [5.8, 3.6, 12.8], target: [0, -0.25, 0] }
        : {
            position: [
              p.target[0] + 2,
              p.target[1] + 1.8,
              p.position[2] < 0 ? -8.5 : 8.5,
            ],
            target: p.target,
          };
  return p;
}
function World({
  live,
  display,
  topic,
  selected,
  view,
  revision,
  onSelect,
  labels,
  lpftp = DEFAULT_LPFTP,
  lpftpCloseup = true,
}: {
  live: RefObject<Playback>;
  display: Display;
  topic: Topic;
  selected: Part;
  view: View;
  revision: number;
  onSelect: (p: Part) => void;
  labels: RefObject<(HTMLButtonElement | null)[]>;
  lpftp?: LPFTPSettings;
  lpftpCloseup?: boolean;
}) {
  const project = useMemo(createAnnotationProjector, []);
  const width = useThree((s) => s.size.width);
  const horizontal = view === "Plume" && width > 700;
  useFrame(({ camera, size }) => {
    LABEL_PARTS.forEach((p, i) => {
      const point = partPosition(p, display === "Exploded");
      point[2] += 0.6;
      project(labels.current[i], point, camera, size, {
        centered: true,
        offsetX:
          p === "pogo"
            ? 140
            : ["lpftp", "lpotp", "hpftp", "hpotp"].includes(p)
              ? PARTS[p].point[0] < 0
                ? -78
                : 78
              : PARTS[p].point[0] < 0
                ? -36
                : PARTS[p].point[0] > 0
                  ? 36
                  : 0,
        offsetY: -16,
        keepInside: false,
      });
    });
  });
  return (
    <>
      <color attach="background" args={["#14242c"]} />
      <fog attach="fog" args={["#14242c", 22, 55]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[-4, 7, 5]} intensity={3.4} color="#f2e4cb" />
      <directionalLight position={[4, 3, -3]} intensity={3} color="#a1d2ed" />
      <LabEnvironment />
      <mesh rotation-x={-Math.PI / 2} position-y={horizontal ? -7 : -20}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#182e37" roughness={0.9} />
      </mesh>
      <gridHelper
        args={[50, 40, "#36535e", "#273f49"]}
        position-y={horizontal ? -6.99 : -19.99}
      />
      {!horizontal &&
        [-4.2, 4.2].map((x) => (
          <mesh key={x} position={[x, 1, -3]}>
            <boxGeometry args={[0.16, 10, 0.22]} />
            <meshStandardMaterial
              color="#2d4752"
              metalness={0.55}
              roughness={0.6}
            />
          </mesh>
        ))}
      {!horizontal && (
        <mesh position={[0, 4.9, -3]}>
          <boxGeometry args={[8.6, 0.24, 0.25]} />
          <meshStandardMaterial
            color="#36505b"
            metalness={0.6}
            roughness={0.6}
          />
        </mesh>
      )}
      {horizontal && (
        <group position={[-2.48, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.16, 3.4, 2.1]} />
            <meshStandardMaterial
              color="#223944"
              metalness={0.65}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, -2.2, 0]}>
            <boxGeometry args={[1.5, 0.8, 3.1]} />
            <meshStandardMaterial
              color="#293d46"
              metalness={0.6}
              roughness={0.5}
            />
          </mesh>
          {[-0.52, 0.52].flatMap((x) =>
            [-1.15, 1.15].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, -4.7, z]}>
                <boxGeometry args={[0.12, 4.6, 0.12]} />
                <meshStandardMaterial
                  color="#293d46"
                  metalness={0.6}
                  roughness={0.5}
                />
              </mesh>
            )),
          )}
          {[-0.7, 0.7].map((z) => (
            <mesh key={z} position={[0, -1.6, z]} rotation-z={-0.3}>
              <boxGeometry args={[0.18, 1.5, 0.16]} />
              <meshStandardMaterial
                color="#7e898b"
                metalness={0.8}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      )}
      {topic === "LPFTP dynamics" ? (
        <LPFTPStudy live={live} settings={lpftp} closeup={lpftpCloseup} />
      ) : (
        <group rotation-z={horizontal ? Math.PI / 2 : 0}>
          <Engine
            live={live}
            display={display}
            topic={topic}
            selected={selected}
            onSelect={onSelect}
          />
        </group>
      )}
      <CameraController
        presets={CAMERAS}
        view={view}
        revision={revision}
        responsive={
          topic === "LPFTP dynamics"
            ? lpftpCloseup
              ? cavityFraming
              : inducerFraming
            : framing
        }
        minDistance={3}
        maxDistance={36}
      />
    </>
  );
}
export default memo(World);
