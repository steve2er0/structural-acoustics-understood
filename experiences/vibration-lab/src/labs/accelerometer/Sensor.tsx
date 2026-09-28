import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  CanvasTexture,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  SpriteMaterial,
  Vector3,
} from "three";
import type { Sample } from "./physics";
export type Display = "Assembled" | "Cutaway" | "Exploded";
export type Focus = "housing" | "mass" | "piezo" | "electronics" | "preload";
export interface Pose {
  base: number;
  relative: number;
  explosion: number;
  charge: number;
}
export function annulus(
  inner: number,
  outer: number,
  height: number,
  cut = false,
) {
  const shape = new Shape(),
    end = cut ? 1.5 * Math.PI : 2 * Math.PI;
  shape.absarc(0, 0, outer, 0, end, false);
  if (cut) {
    shape.lineTo(inner * Math.cos(end), inner * Math.sin(end));
    shape.absarc(0, 0, inner, end, 0, true);
    shape.closePath();
  } else {
    const hole = new Path();
    hole.absarc(0, 0, inner, 0, 2 * Math.PI, true);
    shape.holes.push(hole);
  }
  const g = new ExtrudeGeometry(shape, {
    depth: height,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 64,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -height / 2, 0);
  return g;
}
function Ring({
  inner,
  outer,
  height,
  y = 0,
  color = "#bcc6c5",
  cut = false,
  emissive = false,
}: {
  inner: number;
  outer: number;
  height: number;
  y?: number;
  color?: string;
  cut?: boolean;
  emissive?: boolean;
}) {
  const g = useMemo(
    () => annulus(inner, outer, height, cut),
    [inner, outer, height, cut],
  );
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh geometry={g} position-y={y} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        metalness={0.78}
        roughness={0.27}
        emissive={emissive ? "#c09b55" : "#000000"}
        emissiveIntensity={0.16}
      />
    </mesh>
  );
}
function Cylinder({
  radius,
  height,
  y = 0,
  color = "#bac4c6",
  segments = 64,
}: {
  radius: number;
  height: number;
  y?: number;
  color?: string;
  segments?: number;
}) {
  return (
    <mesh position-y={y} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, segments]} />
      <meshStandardMaterial color={color} metalness={0.82} roughness={0.25} />
    </mesh>
  );
}
function chargeTexture(sign: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  x.font = "500 50px monospace";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(sign, 32, 32);
  return new CanvasTexture(c);
}
function ElectrodeCharges({ pose }: { pose: RefObject<Pose> }) {
  const textures = useMemo(
    () => [chargeTexture("+", "#f5d496"), chargeTexture("−", "#b2e5f2")],
    [],
  );
  const positive = useRef<Group>(null),
    negative = useRef<Group>(null);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  useFrame(() => {
    [positive.current, negative.current].forEach((g, i) => {
      if (!g) return;
      const sign = pose.current.charge >= 0 ? 1 : -1;
      g.position.x = (i === 0 ? sign : -sign) > 0 ? 0.61 : 0.37;
      g.position.y =
        pose.current.explosion * 1.25 +
        (g.position.x > 0.5 ? pose.current.relative : 0);
      g.visible = Math.abs(pose.current.charge) > 1e-15;
      g.children.forEach((m) => {
        ((m as Mesh).material as SpriteMaterial).opacity =
          0.28 + 0.72 * Math.min(1, Math.abs(pose.current.charge) / 75e-12);
      });
    });
  });
  return (
    <>
      {[positive, negative].map((ref, i) => (
        <group ref={ref} key={i}>
          {[0.88, 1.13, 1.38, 1.63].map((y) => (
            <sprite
              key={y}
              position={[0, y, 0.045]}
              scale={[0.12, 0.12, 1]}
              renderOrder={5}
            >
              <spriteMaterial map={textures[i]} transparent depthTest={false} />
            </sprite>
          ))}
        </group>
      ))}
    </>
  );
}
export function Sensor({
  display = "Cutaway",
  focus = "piezo",
  pose,
  onFocus,
  compact = false,
}: {
  display?: Display;
  focus?: Focus;
  pose?: RefObject<Pose>;
  onFocus?: (f: Focus) => void;
  compact?: boolean;
}) {
  const fallback = useRef<Pose>({
    base: 0,
    relative: 0,
    explosion: 0,
    charge: -25e-12,
  });
  const motion = pose ?? fallback;
  const body = useRef<Group>(null),
    mass = useRef<Group>(null),
    collar = useRef<Group>(null),
    crystal = useRef<Group>(null),
    board = useRef<Group>(null),
    lid = useRef<Group>(null),
    shell = useRef<Group>(null);
  const cut = display !== "Assembled";
  const crystalGeometry = useMemo(
    () => annulus(0.385, 0.595, 0.92, cut),
    [cut],
  );
  const original = useMemo(
    () => Float32Array.from(crystalGeometry.attributes.position.array),
    [crystalGeometry],
  );
  useEffect(() => () => crystalGeometry.dispose(), [crystalGeometry]);
  const crystalMaterial = useRef<MeshStandardMaterial>(null);
  const badge = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#25494f";
    ctx.textAlign = "center";
    ctx.font = "500 29px monospace";
    ctx.fillText("VIBRATION LAB", 256, 62);
    ctx.font = "500 64px sans-serif";
    ctx.fillText("IEPE", 256, 153);
    ctx.font = "31px monospace";
    ctx.fillText("100 mV/g", 256, 216);
    ctx.font = "30px sans-serif";
    ctx.fillText("Z ↑", 256, 277);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => badge.dispose(), [badge]);
  const cable = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0, 3.95, 0),
        new Vector3(0.5, 4.5, -0.2),
        new Vector3(2.7, 3.6, -0.7),
        new Vector3(3.4, 0.3, -1.2),
        new Vector3(5, 0.02, -0.4),
      ]),
    [],
  );
  useFrame((_, dt) => {
    const p = motion.current;
    p.explosion +=
      (Number(display === "Exploded") - p.explosion) *
      (1 - Math.exp(-Math.min(dt, 0.05) * 5));
    if (body.current) body.current.position.y = p.base;
    if (mass.current) mass.current.position.y = p.relative + 2.65 * p.explosion;
    if (collar.current)
      collar.current.position.y = p.relative + 4.05 * p.explosion;
    if (crystal.current) crystal.current.position.y = 1.25 * p.explosion;
    if (board.current) board.current.position.y = 4.1 * p.explosion;
    if (lid.current) lid.current.position.y = 4.9 * p.explosion;
    if (shell.current) {
      shell.current.position.x = -3 * p.explosion;
      shell.current.position.y = 0.25 * p.explosion;
    }
    const v = crystalGeometry.attributes.position as BufferAttribute;
    for (let i = 0; i < v.count; i++) {
      const r = Math.hypot(original[i * 3], original[i * 3 + 2]);
      v.setY(
        i,
        original[i * 3 + 1] +
          p.relative * Math.max(0, Math.min(1, (r - 0.385) / (0.595 - 0.385))),
      );
    }
    v.needsUpdate = true;
    crystalGeometry.computeVertexNormals();
    if (crystalMaterial.current)
      crystalMaterial.current.emissiveIntensity =
        0.08 + 0.23 * Math.min(1, Math.abs(p.charge) / 75e-12);
  });
  const events = (f: Focus) => ({
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onFocus?.(f);
    },
  });
  return (
    <group ref={body}>
      {!compact && (
        <>
          <mesh position={[0, -0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[5, 0.5, 4]} />
            <meshStandardMaterial
              color="#849b9f"
              metalness={0.8}
              roughness={0.32}
            />
          </mesh>
          {[-2.05, 2.05].flatMap((x) =>
            [-1.55, 1.55].map((z) => (
              <group key={`${x},${z}`} position={[x, -0.048, z]}>
                <mesh rotation-x={-Math.PI / 2}>
                  <torusGeometry args={[0.12, 0.022, 8, 28]} />
                  <meshStandardMaterial
                    color="#d1d8d1"
                    metalness={0.9}
                    roughness={0.25}
                  />
                </mesh>
                <mesh rotation-x={-Math.PI / 2}>
                  <circleGeometry args={[0.1, 6]} />
                  <meshStandardMaterial color="#233b40" metalness={0.7} />
                </mesh>
              </group>
            )),
          )}
        </>
      )}
      <group {...events("housing")}>
        <Cylinder radius={0.21} height={0.45} y={-0.12} color="#839295" />
        {[-0.28, -0.2, -0.12, -0.04].map((y) => (
          <mesh key={y} position-y={y} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.21, 0.024, 6, 32]} />
            <meshStandardMaterial color="#d2d8d5" metalness={0.85} />
          </mesh>
        ))}
        <Cylinder radius={1.35} height={0.25} y={0.13} segments={6} />
        <Cylinder radius={1.22} height={0.13} y={0.32} />
        <Cylinder radius={0.37} height={1.68} y={1.2} color="#a1b3b3" />
        <Cylinder radius={0.41} height={0.12} y={1.99} color="#d0b479" />
      </group>
      <group ref={crystal} {...events("piezo")}>
        <mesh geometry={crystalGeometry} position-y={1.25} castShadow>
          <meshStandardMaterial
            ref={crystalMaterial}
            color="#88cfc9"
            metalness={0.16}
            roughness={0.3}
            emissive="#72c8bc"
            emissiveIntensity={0.1}
          />
        </mesh>
        <Ring
          inner={0.375}
          outer={0.385}
          height={0.94}
          y={1.25}
          color="#e3be77"
          cut={cut}
        />
        <Ring
          inner={0.595}
          outer={0.61}
          height={0.94}
          y={1.25}
          color="#e3be77"
          cut={cut}
        />
      </group>
      <group ref={mass} {...events("mass")}>
        <Ring
          inner={0.61}
          outer={1.08}
          height={0.99}
          y={1.25}
          color={focus === "mass" ? "#e9c187" : "#aebbbd"}
          cut={cut}
        />
        <Ring
          inner={0.64}
          outer={1.06}
          height={0.05}
          y={1.79}
          color="#e2c18c"
          cut={cut}
        />
      </group>
      <group ref={collar} {...events("preload")}>
        <Ring
          inner={1.08}
          outer={1.16}
          height={1.06}
          y={1.25}
          color={focus === "preload" ? "#e9c187" : "#667b80"}
          cut={cut}
        />
      </group>
      <group ref={board} {...events("electronics")}>
        <Ring
          inner={0.04}
          outer={1.06}
          height={0.08}
          y={2.34}
          color="#285e54"
          cut={cut}
        />
        <Cylinder radius={0.09} height={0.3} y={2.12} color="#ddd2ae" />
        {[
          [-0.6, 0.25],
          [-0.3, -0.5],
          [0.4, -0.55],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 2.47, z]}>
            <mesh>
              <boxGeometry args={[0.34, 0.14, 0.27]} />
              <meshStandardMaterial
                color={focus === "electronics" ? "#35494c" : "#182426"}
                roughness={0.6}
              />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.19, -0.025, 0]}>
                <boxGeometry args={[0.05, 0.06, 0.28]} />
                <meshStandardMaterial color="#d5c59b" metalness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
        {Array.from({ length: 8 }, (_, i) => {
          const a = 0.3 + i * 0.48;
          return (
            <mesh
              key={i}
              position={[0.88 * Math.cos(a), 2.396, -0.88 * Math.sin(a)]}
            >
              <boxGeometry args={[0.12, 0.02, 0.05]} />
              <meshStandardMaterial color="#d9bc79" metalness={0.8} />
            </mesh>
          );
        })}
        <mesh position={[-0.18, 2.55, -0.7]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#b7eac2" />
        </mesh>
      </group>
      <group ref={shell} {...events("housing")}>
        {display === "Assembled" && (
          <mesh position-y={1.68}>
            <cylinderGeometry
              args={[1.336, 1.336, 1.05, 48, 1, true, 0.1, 1.05]}
            />
            <meshStandardMaterial
              map={badge}
              transparent
              depthWrite={false}
              roughness={0.7}
            />
          </mesh>
        )}
        <Ring
          inner={1.23}
          outer={1.33}
          height={2.49}
          y={1.66}
          color="#b0bfc0"
          cut={cut}
        />
        {[0.48, 0.55, 2.75, 2.83].map((y) => (
          <Ring
            key={y}
            inner={1.325}
            outer={1.345}
            height={0.025}
            y={y}
            color="#697f83"
            cut={cut}
          />
        ))}
      </group>
      <group ref={lid} {...events("housing")}>
        <Ring
          inner={0.22}
          outer={1.33}
          height={0.14}
          y={2.98}
          color="#bbc8c6"
          cut={cut}
        />
        <Cylinder radius={0.4} height={0.26} y={3.17} color="#c4bc9c" />
        <Cylinder radius={0.29} height={0.42} y={3.51} color="#b2bdbc" />
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position-y={3.35 + i * 0.05} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.292, 0.018, 6, 36]} />
            <meshStandardMaterial
              color="#7f9091"
              metalness={0.9}
              roughness={0.28}
            />
          </mesh>
        ))}
        <Cylinder radius={0.2} height={0.24} y={3.82} color="#31434a" />
      </group>
      {!compact && display !== "Exploded" && (
        <mesh>
          <tubeGeometry args={[cable, 64, 0.048, 10, false]} />
          <meshStandardMaterial color="#223b40" roughness={0.6} />
        </mesh>
      )}
      {cut && !compact && <ElectrodeCharges pose={motion} />}
    </group>
  );
}
export function samplePose(
  value: Sample,
  manual: boolean,
): Pick<Pose, "base" | "relative" | "charge"> {
  return {
    base: (((manual ? 1 : -1) * value.acceleration) / 98.0665) * 0.15,
    relative: value.relative * 4e6,
    charge: value.charge,
  };
}
