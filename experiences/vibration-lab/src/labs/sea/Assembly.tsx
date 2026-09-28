import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  CylinderGeometry,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector2,
} from "three";
import { SUBSYSTEMS, rmsVelocity, type Model } from "./physics";
import { fairingProfile } from "./falcon";
import type { Simulation } from "./simulation";
export const SCALE = 0.12;
export const stationY = (station: number) => (station - 35) * SCALE;
export const CENTERS = SUBSYSTEMS.map((p) => stationY((p.start + p.end) / 2));
export type Display =
  "Assembled" | "Average energy" | "Representative motion" | "Show modes";
function Shell({
  index,
  model,
  live,
  display,
  selected,
  onSelect,
}: {
  index: number;
  model: Model;
  live: RefObject<Simulation>;
  display: Display;
  selected: number;
  onSelect?: (i: number) => void;
}) {
  const p = SUBSYSTEMS[index],
    shell = useRef<MeshStandardMaterial>(null);
  const geometry = useMemo(() => {
    if (p.kind === "fairing")
      return new LatheGeometry(
        fairingProfile().map(([s, r]) => new Vector2(r * SCALE, stationY(s))),
        48,
      );
    if (p.kind === "disk") {
      const g = new CylinderGeometry(1.85 * SCALE, 1.85 * SCALE, 0.025, 48);
      g.translate(0, CENTERS[index], 0);
      return g;
    }
    const g = new CylinderGeometry(
      1.85 * SCALE,
      1.85 * SCALE,
      (p.end - p.start) * SCALE,
      48,
      Math.max(10, Math.round(p.end - p.start)),
      true,
    );
    g.translate(0, CENTERS[index], 0);
    return g;
  }, [p, index]);
  const base = useMemo(
    () => Float32Array.from(geometry.attributes.position.array),
    [geometry],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const e = live.current.energy[index],
      t = live.current.motionTime;
    const motion =
      display === "Representative motion" || display === "Show modes";
    const amp = motion ? Math.min(0.035, rmsVelocity(e, index) * 5) : 0;
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = base[3 * i],
        y = base[3 * i + 1],
        z = base[3 * i + 2],
        angle = Math.atan2(z, x);
      const wave =
        Math.sin(angle * 3 + y * 9 + t * (3.2 + index * 0.3)) * 0.6 +
        Math.sin(angle * 5 - y * 11 - t * 4.1) * 0.4;
      const displacement = amp * wave;
      positions.setXYZ(
        i,
        x + Math.cos(angle) * displacement,
        y,
        z + Math.sin(angle) * displacement,
      );
    }
    positions.needsUpdate = true;
    if (motion) geometry.computeVertexNormals();
    if (shell.current) {
      shell.current.emissiveIntensity =
        display === "Assembled"
          ? 0
          : 0.03 +
            0.45 *
              Math.sqrt(
                e / Math.max(1e-9, ...model.steady, ...live.current.energy),
              );
    }
  });
  const cutaway = (selected === 4 || selected === 6) && index === 5;
  const color =
    display === "Assembled"
      ? index === 2 || index === 0
        ? "#24313a"
        : "#e2e9e7"
      : p.color;
  const select = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect?.(index);
  };
  return (
    <>
      <mesh geometry={geometry} onClick={select} castShadow>
        <meshStandardMaterial
          ref={shell}
          color={color}
          emissive={p.color}
          metalness={0.28}
          roughness={0.48}
          side={2}
          transparent
          opacity={cutaway ? 0.16 : 1}
          depthWrite={!cutaway}
        />
      </mesh>
      {display === "Show modes" && (
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color={p.color}
            wireframe
            transparent
            opacity={0.23}
          />
        </mesh>
      )}
      {[p.start, p.end]
        .filter(
          (v, i, a) =>
            a.indexOf(v) === i && !(p.kind === "fairing" && v === p.end),
        )
        .map((s) => (
          <mesh key={s} position-y={stationY(s)} rotation-x={Math.PI / 2}>
            <torusGeometry args={[1.854 * SCALE, 0.008, 6, 48]} />
            <meshStandardMaterial
              color={selected === index ? p.color : "#647780"}
              metalness={0.6}
            />
          </mesh>
        ))}
    </>
  );
}
function Cavity({
  model,
  live,
  selected,
  onSelect,
}: {
  model: Model;
  live: RefObject<Simulation>;
  selected: number;
  onSelect?: (i: number) => void;
}) {
  const material = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    if (material.current)
      material.current.opacity =
        (selected === 6 ? 0.13 : 0.04) +
        0.2 *
          Math.sqrt(
            live.current.energy[6] /
              Math.max(1e-9, ...model.steady, ...live.current.energy),
          );
  });
  return (
    <group visible={selected === 4 || selected === 6}>
      <mesh
        position={[0, stationY(62), 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(6);
        }}
      >
        <cylinderGeometry args={[0.27, 0.22, 1.05, 32]} />
        <meshStandardMaterial
          ref={material}
          color="#ed99be"
          emissive="#ed99be"
          emissiveIntensity={0.6}
          transparent
          depthWrite={false}
        />
      </mesh>
      {[59, 61, 63, 65].map((s) => (
        <mesh key={s} position-y={stationY(s)} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.22, 0.006, 6, 32]} />
          <meshBasicMaterial color="#ed99be" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
export function Assembly({
  model,
  live,
  display = "Average energy",
  selected = 1,
  onSelect,
}: {
  model: Model;
  live: RefObject<Simulation>;
  display?: Display;
  selected?: number;
  perMode?: boolean;
  onSelect?: (i: number) => void;
}) {
  const source = useRef<Mesh>(null);
  useFrame(() => {
    if (source.current) source.current.visible = model.settings.power > 0;
  });
  return (
    <group>
      {SUBSYSTEMS.slice(0, 6).map((_, i) => (
        <Shell
          key={i}
          index={i}
          model={model}
          live={live}
          display={display}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
      <Cavity
        model={model}
        live={live}
        selected={selected}
        onSelect={onSelect}
      />
      {/* Nine bells and folded landing legs provide context only; they carry no extra SEA state. */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i * Math.PI) / 4,
          r = i === 8 ? 0 : 0.145;
        return (
          <mesh
            key={i}
            position={[r * Math.cos(a), stationY(0) - 0.09, r * Math.sin(a)]}
          >
            <cylinderGeometry args={[0.022, 0.055, 0.17, 16, 1, true]} />
            <meshStandardMaterial
              color="#3c4650"
              metalness={0.8}
              roughness={0.3}
              side={2}
            />
          </mesh>
        );
      })}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation-y={(i * Math.PI) / 2}>
          <mesh position={[0.235, stationY(7), 0]} rotation-z={-0.07}>
            <boxGeometry args={[0.025, 1.35, 0.063]} />
            <meshStandardMaterial color="#2d3741" metalness={0.5} />
          </mesh>
          <mesh position={[0.24, stationY(40.8), 0]}>
            <boxGeometry args={[0.018, 0.14, 0.17]} />
            <meshStandardMaterial color="#3b474e" wireframe />
          </mesh>
        </group>
      ))}
      <mesh
        ref={source}
        position={[-0.45, CENTERS[model.settings.source], 0]}
        rotation-z={-Math.PI / 2}
      >
        <coneGeometry args={[0.07, 0.22, 16]} />
        <meshStandardMaterial
          color="#e7bd86"
          emissive="#e7bd86"
          emissiveIntensity={0.7}
        />
      </mesh>
    </group>
  );
}
