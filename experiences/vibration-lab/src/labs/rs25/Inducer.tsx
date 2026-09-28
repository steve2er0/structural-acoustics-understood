import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";
import { Flange, Pipe } from "./Hardware";
import { cavityPulse, type LPFTPSettings } from "./lpftp";
import type { Playback } from "./simulation";

/** Four helical main blades + four shorter splitters; profiles are illustrative. */
function bladeGeometry(splitter: boolean) {
  const vertices: number[] = [],
    indices: number[] = [],
    steps = 28;
  for (let j = 0; j <= steps; j++) {
    const t = j / steps,
      z = (splitter ? -0.15 : -0.5) + t * (splitter ? 0.27 : 0.62);
    const angle = (z + 0.5) * 2.7;
    for (const r of [0.095, 0.286])
      vertices.push(
        r * Math.cos(angle),
        r * Math.sin(angle),
        z + (r - 0.095) * 0.2,
      );
    if (j < steps) {
      const k = j * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function LPFTPInducer({
  live,
  strength = 0,
}: {
  live: RefObject<Playback>;
  strength?: number;
}) {
  const rotor = useRef<Group>(null),
    clouds = useRef<Group>(null);
  const main = useMemo(() => bladeGeometry(false), []),
    splitter = useMemo(() => bladeGeometry(true), []),
    vapor = useMemo(() => new SphereGeometry(1, 16, 24), []);
  useEffect(() => () => vapor.dispose(), [vapor]);
  useFrame(() => {
    const l = live.current;
    if (rotor.current) rotor.current.rotation.z = l.shaftTurns * Math.PI * 2;
    if (clouds.current) {
      clouds.current.visible = l.running && l.phase >= 8 && strength > 0;
      if (!clouds.current.visible) return;
      const pulse = cavityPulse(l.cavityCycles),
        length = 0.025 + strength * pulse * 0.42,
        thickness = 0.009 + Math.sqrt(strength) * pulse * 0.055,
        positions = vapor.attributes.position,
        uv = vapor.attributes.uv;
      // A closed vapor sheet follows each main blade from its inlet edge.
      // The exaggerated envelope is schematic, not a computed vapor fraction.
      for (let i = 0; i < positions.count; i++) {
        const t = 1 - uv.getY(i),
          around = uv.getX(i) * Math.PI * 2,
          envelope = Math.sin(Math.PI * t),
          z = -0.495 + length * t,
          r = 0.217 + thickness * envelope * Math.cos(around),
          angle = (z + 0.5) * 2.7 + 0.15 + envelope * Math.sin(around) * 0.16;
        positions.setXYZ(i, r * Math.cos(angle), r * Math.sin(angle), z);
      }
      positions.needsUpdate = true;
      vapor.computeVertexNormals();
      // Detached specks at the trailing edge make collapse legible without
      // implying an independently simulated cloud-shedding frequency.
      clouds.current.children.forEach((g) => {
        g.children.slice(1).forEach((bubble, j) => {
          const t = (j + 1) / 13,
            z = -0.495 + length + t * 0.11 * pulse,
            angle = (z + 0.5) * 2.7 + 0.15 + Math.sin(j * 2.4) * 0.13,
            r = 0.216 + Math.cos(j * 1.7) * 0.04;
          bubble.position.set(r * Math.cos(angle), r * Math.sin(angle), z);
          bubble.scale.setScalar(
            (0.006 + (j % 3) * 0.003) * pulse * Math.sqrt(strength),
          );
        });
      });
    }
  });
  return (
    <group ref={rotor}>
      <mesh position-z={-0.23} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.11, 0.68, 32]} />
        <meshStandardMaterial
          color="#b9c7c7"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation-z={(i * Math.PI) / 2}>
          <mesh geometry={main}>
            <meshStandardMaterial
              color="#e1caa1"
              metalness={0.78}
              roughness={0.27}
              side={DoubleSide}
            />
          </mesh>
          <mesh geometry={splitter} rotation-z={Math.PI / 4}>
            <meshStandardMaterial
              color="#a0cbd5"
              metalness={0.8}
              roughness={0.3}
              side={DoubleSide}
            />
          </mesh>
        </group>
      ))}
      <group ref={clouds}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation-z={(i * Math.PI) / 2}>
            <mesh geometry={vapor} frustumCulled={false}>
              <meshStandardMaterial
                color="#e2d6ff"
                emissive="#9b72ea"
                emissiveIntensity={0.85}
                roughness={0.26}
                transparent
                opacity={0.82}
                depthWrite={false}
              />
            </mesh>
            {Array.from({ length: 12 }, (_, j) => (
              <mesh key={j}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                  color="#f0eaff"
                  emissive="#aa8ae9"
                  emissiveIntensity={0.8}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}
export function LPFTPStudy({
  live,
  settings,
  closeup = false,
}: {
  live: RefObject<Playback>;
  settings: LPFTPSettings;
  closeup?: boolean;
}) {
  const waves = useRef<Group>(null),
    probe = useRef<Mesh>(null);
  const strength = settings.source === "Blade tones" ? 0 : settings.strength;
  useFrame(() => {
    const l = live.current,
      active = l.running && l.phase >= 8;
    if (waves.current) {
      waves.current.visible = active && strength > 0;
      waves.current.children.forEach((wave, i) => {
        const upstream = i < 5,
          t = (l.cavityCycles * 0.35 + (i % 5) / 5) % 1;
        wave.position.z = upstream ? -0.54 - t * 0.95 : 0.15 + t * 0.65;
        (
          wave as Mesh<Mesh["geometry"], MeshStandardMaterial>
        ).material.opacity = strength * (1 - t) * 0.22;
      });
    }
    if (probe.current)
      (probe.current.material as MeshStandardMaterial).emissiveIntensity =
        active
          ? 0.4 +
            Math.max(
              0,
              (settings.source === "Cavitation"
                ? 0
                : Math.sin(l.shaftTurns * 8 * Math.PI)) +
                strength * Math.sin(l.cavityCycles * 2 * Math.PI),
            )
          : 0;
  });
  return (
    <group rotation-x={Math.PI / 2} scale={2.8} position-y={-0.6}>
      <LPFTPInducer live={live} strength={strength} />
      {/* Transparent upper casing exposes the inducer; lower case indicates the turbine end. */}
      <mesh rotation-x={Math.PI / 2} position-z={-0.22}>
        <cylinderGeometry args={[0.33, 0.33, 0.78, 48, 1, true]} />
        <meshPhysicalMaterial
          color="#8ed2e3"
          transparent
          opacity={closeup ? 0.025 : 0.065}
          roughness={0.2}
          metalness={0.2}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-z={-1.02}>
        <cylinderGeometry args={[0.3, 0.3, 0.83, 48, 1, true]} />
        <meshStandardMaterial
          color="#82bed0"
          transparent
          opacity={closeup ? 0.035 : 0.1}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-z={0.36}>
        <cylinderGeometry args={[0.26, 0.29, 0.35, 48]} />
        <meshStandardMaterial
          color="#718789"
          metalness={0.8}
          roughness={0.33}
        />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-z={0.03}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 16]} />
        <meshStandardMaterial color="#cdb183" metalness={0.8} roughness={0.3} />
      </mesh>
      {[-1.4, -0.61, 0.17, 0.55].map((z) => (
        <Flange key={z} center={[0, 0, z]} radius={z === 0.55 ? 0.26 : 0.34} />
      ))}
      <Pipe
        points={[
          [0.27, 0, 0.03],
          [0.5, 0, 0.02],
          [0.55, -0.2, 0.18],
        ]}
        radius={0.09}
      />
      <group ref={waves}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i}>
            <torusGeometry args={[0.266, 0.013, 8, 48]} />
            <meshStandardMaterial
              color="#b7baff"
              emissive="#747bd2"
              emissiveIntensity={0.8}
              transparent
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <group position={[0, -0.36, -0.86]} rotation-z={Math.PI}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.04, 0.04, 0.16, 12]} />
          <meshStandardMaterial color="#b5bec0" metalness={0.8} />
        </mesh>
        <mesh position-y={0.1}>
          <boxGeometry args={[0.13, 0.1, 0.13]} />
          <meshStandardMaterial color="#284751" metalness={0.6} />
        </mesh>
        <mesh ref={probe} position={[0, 0.16, 0]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.035, 16]} />
          <meshStandardMaterial
            color="#e9c496"
            emissive="#e9c496"
            side={DoubleSide}
          />
        </mesh>
      </group>
      <Pipe
        points={[
          [0, -0.46, -0.86],
          [-0.1, -0.55, -0.8],
          [-0.43, -0.55, -0.45],
          [-0.5, -0.48, 0.25],
        ]}
        radius={0.014}
        color="#516e77"
      />
    </group>
  );
}
