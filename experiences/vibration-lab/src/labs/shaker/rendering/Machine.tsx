import { highlightIntensity } from "@engine/highlight";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  annulus,
  FRONT_ARC,
  FRONT_START,
  KEEP_ARC,
  OPEN_START,
  radial,
  ribbonGeometry,
  updateRibbon,
} from "./geometry";
import { sampleSolution, type Solution } from "../shaker-model/model";
import {
  displayGain,
  DRAWING_SCALE,
  type AnimationClock,
} from "../animation/motion";
import type { Display, Lesson } from "../animation/state";

export interface MachinePose {
  displacement: number;
  explosion: number;
  cut: number;
  circuit: number;
}
export const METALS = {
  steel: "#80958f",
  housing: "#253f41",
  copper: "#c77e4f",
  drive: "#d49c7d",
  silver: "#bbc8bd",
  insulator: "#43382d",
};
export function Block({
  size,
  position = [0, 0, 0],
  color = METALS.housing,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  color?: string;
}) {
  return (
    <RoundedBox
      args={size}
      position={position}
      radius={0.035}
      smoothness={2}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} metalness={0.72} roughness={0.31} />
    </RoundedBox>
  );
}
function Ring({
  inner,
  outer,
  height,
  y = 0,
  start = 0,
  arc = Math.PI * 2,
  material,
}: {
  inner: number;
  outer: number;
  height: number;
  y?: number;
  start?: number;
  arc?: number;
  material: THREE.Material;
}) {
  const g = useMemo(
    () => annulus(inner, outer, height, start, arc),
    [inner, outer, height, start, arc],
  );
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh
      geometry={g}
      position={[0, y, 0]}
      material={material}
      castShadow
      receiveShadow
    />
  );
}
function SteelPart({
  inner,
  outer,
  height,
  y,
  back,
  front,
}: {
  inner: number;
  outer: number;
  height: number;
  y: number;
  back: THREE.Material;
  front: THREE.Material;
}) {
  return (
    <>
      <Ring
        {...{ inner, outer, height, y }}
        start={OPEN_START}
        arc={KEEP_ARC}
        material={back}
      />
      <Ring
        {...{ inner, outer, height, y }}
        start={FRONT_START}
        arc={FRONT_ARC}
        material={front}
      />
    </>
  );
}
function Badge() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#c3cbbb";
    ctx.fillRect(0, 0, 768, 128);
    ctx.fillStyle = "#1c3835";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("ED / FIELD EXCITED", 25, 51);
    ctx.font = "19px monospace";
    ctx.fillText("TWO CIRCUITS     •     ONE AXIS", 26, 89);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, -1.39, 2.356]}>
      <planeGeometry args={[2.05, 0.34]} />
      <meshStandardMaterial map={texture} roughness={0.55} />
    </mesh>
  );
}
function Flexures({
  pose,
  material,
}: {
  pose: RefObject<MachinePose>;
  material: THREE.Material;
}) {
  const geometry = useMemo(
    () => Array.from({ length: 12 }, () => ribbonGeometry()),
    [],
  );
  useEffect(() => () => geometry.forEach((g) => g.dispose()), [geometry]);
  useFrame(() =>
    geometry.forEach((g, i) =>
      updateRibbon(
        g,
        ((i % 6) * Math.PI) / 3,
        1.84 + Math.floor(i / 6) * 0.17 + pose.current.explosion * 0.5,
        pose.current.displacement,
      ),
    ),
  );
  return (
    <group>
      {geometry.map((g, i) => (
        <mesh key={i} geometry={g} material={material} castShadow />
      ))}
    </group>
  );
}
export default function Machine({
  solution,
  clock,
  pose,
  display,
  lesson,
}: {
  solution: Solution;
  clock: RefObject<AnimationClock>;
  pose: RefObject<MachinePose>;
  display: Display;
  lesson: Lesson;
}) {
  const moving = useRef<THREE.Group>(null),
    field = useRef<THREE.Group>(null),
    pole = useRef<THREE.Group>(null),
    bottom = useRef<THREE.Group>(null),
    payload = useRef<THREE.Group>(null);
  const materials = useMemo(
    () => ({
      steel: new THREE.MeshStandardMaterial({
        color: METALS.steel,
        metalness: 0.83,
        roughness: 0.32,
        side: THREE.DoubleSide,
      }),
      frontSteel: new THREE.MeshStandardMaterial({
        color: METALS.steel,
        metalness: 0.83,
        roughness: 0.32,
        side: THREE.DoubleSide,
        transparent: true,
      }),
      housing: new THREE.MeshStandardMaterial({
        color: METALS.housing,
        metalness: 0.62,
        roughness: 0.36,
      }),
      frontHousing: new THREE.MeshStandardMaterial({
        color: METALS.housing,
        metalness: 0.62,
        roughness: 0.36,
        transparent: true,
      }),
      core: new THREE.MeshStandardMaterial({
        color: "#7c8987",
        metalness: 0.85,
        roughness: 0.26,
      }),
      copper: new THREE.MeshStandardMaterial({
        color: METALS.copper,
        metalness: 0.78,
        roughness: 0.28,
        emissive: "#a05022",
        emissiveIntensity: 0,
      }),
      drive: new THREE.MeshStandardMaterial({
        color: METALS.drive,
        metalness: 0.78,
        roughness: 0.23,
        emissive: "#68c1d8",
        emissiveIntensity: 0,
      }),
      silver: new THREE.MeshStandardMaterial({
        color: METALS.silver,
        metalness: 0.9,
        roughness: 0.23,
      }),
      insulator: new THREE.MeshStandardMaterial({
        color: METALS.insulator,
        metalness: 0.2,
        roughness: 0.64,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: "#142629",
        metalness: 0.65,
        roughness: 0.4,
      }),
      leaf: new THREE.MeshStandardMaterial({
        color: "#afb7a8",
        metalness: 0.92,
        roughness: 0.22,
        side: THREE.DoubleSide,
      }),
    }),
    [],
  );
  useEffect(
    () => () => Object.values(materials).forEach((m) => m.dispose()),
    [materials],
  );
  const fieldTurn = useMemo(
    () => new THREE.TorusGeometry(1.628, 0.021, 7, 128),
    [],
  );
  const driveTurn = useMemo(
    () => new THREE.TorusGeometry(1.079, 0.022, 8, 112),
    [],
  );
  useEffect(
    () => () => {
      fieldTurn.dispose();
      driveTurn.dispose();
    },
    [fieldTurn, driveTurn],
  );
  useFrame((_, dt) => {
    const blend = 1 - Math.exp(-Math.min(dt, 0.05) * 5);
    pose.current.cut = THREE.MathUtils.lerp(
      pose.current.cut,
      display === "assembled" ? 0 : 1,
      blend,
    );
    pose.current.circuit = THREE.MathUtils.lerp(
      pose.current.circuit,
      display === "circuit" ? 1 : 0,
      blend,
    );
    pose.current.explosion = THREE.MathUtils.lerp(
      pose.current.explosion,
      display === "exploded" ? 1 : 0,
      blend,
    );
    const s = sampleSolution(solution, clock.current.theta);
    const desired = s.x * DRAWING_SCALE * displayGain(solution);
    pose.current.displacement =
      solution.parameters.driveMode === "manual"
        ? THREE.MathUtils.lerp(pose.current.displacement, desired, blend)
        : desired;
    if (moving.current)
      moving.current.position.y =
        pose.current.displacement + pose.current.explosion * 1.65;
    if (field.current)
      field.current.position.y = -pose.current.explosion * 0.35;
    if (pole.current) pole.current.position.y = pose.current.explosion * 0.5;
    if (bottom.current)
      bottom.current.position.y = -pose.current.explosion * 0.22;
    const alpha = 1 - pose.current.cut;
    materials.frontSteel.opacity = alpha;
    materials.frontSteel.depthWrite = alpha > 0.98;
    materials.frontHousing.opacity = alpha;
    materials.frontHousing.depthWrite = alpha > 0.98;
    materials.steel.transparent = pose.current.circuit > 0.001;
    materials.steel.opacity = 1 - pose.current.circuit * 0.88;
    materials.steel.depthWrite = pose.current.circuit < 0.01;
    materials.housing.transparent = pose.current.circuit > 0.001;
    materials.housing.opacity = 1 - pose.current.circuit * 0.93;
    materials.housing.depthWrite = pose.current.circuit < 0.01;
    materials.core.transparent = pose.current.circuit > 0.001;
    materials.core.opacity = 1 - pose.current.circuit * 0.87;
    materials.core.depthWrite = pose.current.circuit < 0.01;
    materials.copper.transparent = pose.current.circuit > 0.001;
    materials.copper.opacity = 1 - pose.current.circuit * 0.6;
    materials.copper.depthWrite = pose.current.circuit < 0.01;
    materials.copper.emissiveIntensity = highlightIntensity(
      (solution.parameters.fieldPercent / 100) *
        (lesson === "energy" ? 0.45 : 0.12),
      lesson === "field",
      0.055,
    );
    materials.drive.emissiveIntensity = highlightIntensity(
      (Math.abs(s.current) / 60) * 0.28,
      lesson === "force",
      0.055,
    );
    if (payload.current) {
      const target = solution.parameters.payload > 0 ? 1 : 0;
      const visible = THREE.MathUtils.lerp(
        payload.current.scale.y,
        target,
        blend,
      );
      payload.current.scale.set(1, Math.max(0.001, visible), 1);
      payload.current.visible = visible > 0.002;
    }
  });
  return (
    <group>
      <Block size={[5.2, 0.22, 4.7]} position={[0, -1.55, 0]} color="#20383b" />
      {[-2.1, 2.1].flatMap((x) =>
        [-1.8, 1.8].map((z) => (
          <Block
            key={`${x},${z}`}
            size={[0.62, 0.2, 0.62]}
            position={[x, -1.75, z]}
            color="#132329"
          />
        )),
      )}
      <Badge />
      <group ref={bottom}>
        <SteelPart
          inner={0}
          outer={2.15}
          height={0.26}
          y={-1.22}
          back={materials.steel}
          front={materials.frontSteel}
        />
        <SteelPart
          inner={1.85}
          outer={2.14}
          height={2.45}
          y={0.08}
          back={materials.steel}
          front={materials.frontSteel}
        />
        <SteelPart
          inner={2.145}
          outer={2.27}
          height={2.88}
          y={0.11}
          back={materials.housing}
          front={materials.frontHousing}
        />
        {Array.from({ length: 10 }, (_, i) => (
          <SteelPart
            key={i}
            inner={2.265}
            outer={2.34}
            height={0.048}
            y={-0.97 + i * 0.16}
            back={materials.housing}
            front={materials.frontHousing}
          />
        ))}
      </group>
      <Ring
        inner={0}
        outer={0.7}
        height={1.95}
        y={-0.25}
        material={materials.core}
      />
      <group ref={pole}>
        <Ring
          inner={0}
          outer={0.97}
          height={1.1}
          y={0.95}
          material={materials.core}
        />
        <SteelPart
          inner={1.2}
          outer={2.15}
          height={1.1}
          y={0.95}
          back={materials.steel}
          front={materials.frontSteel}
        />
        <SteelPart
          inner={1.78}
          outer={2.3}
          height={0.13}
          y={1.64}
          back={materials.silver}
          front={materials.frontSteel}
        />
        <Ring
          inner={1.84}
          outer={2.23}
          height={0.1}
          y={1.99}
          material={materials.dark}
        />
        {Array.from({ length: 6 }, (_, i) => (
          <mesh
            key={`support-${i}`}
            position={radial(2.07, 1.845, (i * Math.PI) / 3)}
            material={materials.silver}
            castShadow
          >
            <cylinderGeometry args={[0.085, 0.085, 0.29, 12]} />
          </mesh>
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={`bolt-${i}`}
            position={radial(2.07, 2.06, (i * Math.PI) / 6)}
            material={materials.silver}
            castShadow
          >
            <cylinderGeometry args={[0.07, 0.07, 0.07, 6]} />
          </mesh>
        ))}
      </group>
      <group ref={field}>
        <Ring
          inner={0.73}
          outer={1.615}
          height={1.12}
          y={-0.35}
          material={materials.copper}
        />
        {[-0.94, 0.24].map((y) => (
          <Ring
            key={y}
            inner={0.72}
            outer={1.66}
            height={0.075}
            y={y}
            material={materials.insulator}
          />
        ))}
        {Array.from({ length: 35 }, (_, i) => (
          <mesh
            key={i}
            geometry={fieldTurn}
            position={[0, -0.87 + i * 0.031, 0]}
            rotation-x={Math.PI / 2}
            material={materials.copper}
          />
        ))}
        {[0.82, 0.96, 1.1, 1.24, 1.38, 1.52].map((r) => (
          <mesh key={r} position={[0, 0.214, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[r, 0.025, 7, 96]} />
            <primitive object={materials.copper} attach="material" />
          </mesh>
        ))}
      </group>
      <Flexures pose={pose} material={materials.leaf} />
      <group ref={moving}>
        <Ring
          inner={1.013}
          outer={1.045}
          height={1.5}
          y={1.55}
          material={materials.insulator}
        />
        {Array.from({ length: 10 }, (_, i) => (
          <mesh
            key={i}
            geometry={driveTurn}
            position={[0, 0.865 + i * 0.031, 0]}
            rotation-x={Math.PI / 2}
            material={materials.drive}
            castShadow
          />
        ))}
        {[1.83, 2.0].map((y) => (
          <Ring
            key={y}
            inner={1.04}
            outer={1.27}
            height={0.075}
            y={y}
            material={materials.silver}
          />
        ))}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <group key={i} position={radial(1.24, 2.2, a)} rotation-y={a}>
              <Block size={[0.1, 0.38, 0.52]} color={METALS.silver} />
            </group>
          );
        })}
        <Ring
          inner={0}
          outer={1.68}
          height={0.22}
          y={2.44}
          material={materials.silver}
        />
        <Ring
          inner={1.62}
          outer={1.71}
          height={0.045}
          y={2.39}
          material={materials.dark}
        />
        {[-1, -0.5, 0, 0.5, 1].flatMap((x) =>
          [-1, -0.5, 0, 0.5, 1]
            .filter((z) => Math.hypot(x, z) < 1.4)
            .map((z) => (
              <mesh
                key={`${x},${z}`}
                position={[x, 2.553, z]}
                rotation-x={-Math.PI / 2}
              >
                <circleGeometry args={[0.045, 12]} />
                <meshStandardMaterial
                  color="#203739"
                  metalness={0.5}
                  roughness={0.3}
                />
              </mesh>
            )),
        )}
        <group ref={payload} position={[0, 2.565, 0]} scale={[1, 0.001, 1]}>
          <Block
            size={[1.9, 0.67, 1.45]}
            position={[0, 0.355, 0]}
            color="#667f7e"
          />
          <Block
            size={[2.1, 0.1, 1.6]}
            position={[0, 0.05, 0]}
            color="#a5b5a9"
          />
          {[-0.7, 0.7].map((x) => (
            <Block
              key={x}
              size={[0.12, 0.11, 1.1]}
              position={[x, 0.74, 0]}
              color="#a9b9ab"
            />
          ))}
        </group>
      </group>
      <group position={[-2.36, -0.95, -0.4]} rotation-z={Math.PI / 2}>
        <mesh castShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.45, 32]} />
          <meshStandardMaterial
            color="#344e4f"
            metalness={0.75}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.23, 0]}>
          <cylinderGeometry args={[0.29, 0.29, 0.02, 32]} />
          <meshStandardMaterial color="#0a161b" />
        </mesh>
      </group>
    </group>
  );
}
