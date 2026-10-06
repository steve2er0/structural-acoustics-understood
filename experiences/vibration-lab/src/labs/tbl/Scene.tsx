import {
  Children,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import {
  ArrowHelper,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Quaternion,
  Vector3,
} from "three";
import { LabEnvironment } from "@engine/Scene";
import {
  CameraController,
  type CameraPreset,
  type CameraPresets,
} from "@engine/Camera";
import { createAnnotationProjector } from "@engine/annotations";
import {
  DEFAULT,
  coherence,
  createRealization,
  sampleRealization,
  type Settings,
  type Solution,
} from "./physics";

export type View = "Panel" | "Top" | "Boundary layer";
export const CAMERAS: CameraPresets<View> = {
  Panel: { position: [8.2, 7.8, 10.2], target: [0, 1.25, 0] },
  Top: { position: [0, 12.6, 0.01], target: [0, 1.2, 0] },
  "Boundary layer": { position: [1.6, 3.7, 11.3], target: [0, 1.6, 0] },
};
export const VISUAL_HZ = 0.5;
const HEIGHT = 1.22;
const NX = 80;
const NY = 52;
const COUNT = (NX + 1) * (NY + 1);
const BLUE = new Color("#388be0");
const NEUTRAL = new Color("#253f49");
const WARM = new Color("#ffc087");
const LABEL: CSSProperties = {
  color: "#dde9e6",
  background: "rgba(8, 22, 27, .87)",
  border: "1px solid rgba(153, 197, 201, .2)",
  borderRadius: 5,
  padding: "5px 8px",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  pointerEvents: "none",
  userSelect: "none",
};

function responsive(p: CameraPreset, _view: View, width: number): CameraPreset {
  if (width >= 680) return p;
  const target = new Vector3(...p.target);
  const position = new Vector3(...p.position)
    .sub(target)
    .multiplyScalar(width < 460 ? 1.06 : 1.18)
    .add(target);
  return {
    position: position.toArray() as [number, number, number],
    target: p.target,
  };
}

function scaleFor(s: Settings) {
  const scale = 6 / Math.max(s.length, s.width);
  return { scale, length: s.length * scale, width: s.width * scale };
}

function Annotation({
  position,
  children,
  color,
  selected = false,
}: {
  position: [number, number, number];
  children: React.ReactNode;
  color?: string;
  selected?: boolean;
}) {
  const anchor = useRef<Group>(null);
  const element = useRef<HTMLSpanElement | null>(null);
  const { gl } = useThree();
  const world = useMemo(() => new Vector3(), []);
  const project = useMemo(createAnnotationProjector, []);
  const label = Children.toArray(children).join("");
  // Plain text annotations share the existing DOM projector. Unlike nested
  // React roots, their cleanup also remains safe during StrictMode remounts.
  useEffect(() => {
    const span = document.createElement("span");
    span.className = "tbl-scene-label";
    Object.assign(span.style, LABEL, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "8",
      opacity: "0",
      borderRadius: "5px",
      padding: "5px 8px",
      fontSize: "10px",
    });
    gl.domElement.parentElement?.appendChild(span);
    element.current = span;
    return () => {
      span.remove();
      element.current = null;
    };
  }, [gl]);
  useEffect(() => {
    if (!element.current) return;
    element.current.textContent = label;
    element.current.style.color = color ?? String(LABEL.color);
    element.current.style.borderColor =
      selected && color ? color : "rgba(153,197,201,.2)";
    element.current.style.fontWeight = selected ? "600" : "400";
  }, [label, color, selected]);
  useFrame(({ camera, size }) => {
    if (!anchor.current || !element.current) return;
    anchor.current.getWorldPosition(world);
    project(element.current, [world.x, world.y, world.z], camera, size, {
      centered: true,
      margin: 12,
      keepInside: true,
    });
  });
  return <group ref={anchor} position={position} />;
}

function Arrow({
  start,
  end,
  color = "#b6d8d9",
}: {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
}) {
  const arrow = useMemo(() => {
    const a = new Vector3(...start);
    const v = new Vector3(...end).sub(a);
    return new ArrowHelper(
      v.clone().normalize(),
      a,
      v.length(),
      color,
      0.13,
      0.055,
    );
  }, [start[0], start[1], start[2], end[0], end[1], end[2], color]);
  useEffect(() => () => arrow.dispose(), [arrow]);
  return <primitive object={arrow} />;
}

function Bar({
  at,
  size,
  color = "#344a50",
}: {
  at: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.34} />
    </mesh>
  );
}

/** Triangular rail: the panel contacts the ridge and is free to rotate. */
function KnifeEdge({
  length,
  position,
  rotated = false,
}: {
  length: number;
  position: [number, number, number];
  rotated?: boolean;
}) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const p = new Float32Array([
      -length / 2,
      0,
      0,
      -length / 2,
      -0.17,
      -0.095,
      -length / 2,
      -0.17,
      0.095,
      length / 2,
      0,
      0,
      length / 2,
      -0.17,
      -0.095,
      length / 2,
      -0.17,
      0.095,
    ]);
    g.setAttribute("position", new BufferAttribute(p, 3));
    g.setIndex([
      0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4,
    ]);
    g.computeVertexNormals();
    return g;
  }, [length]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation-y={rotated ? Math.PI / 2 : 0}
      castShadow
    >
      <meshStandardMaterial
        color="#a5b5ae"
        metalness={0.85}
        roughness={0.26}
        side={DoubleSide}
      />
    </mesh>
  );
}

function Fixture({
  length: l,
  width: w,
  compact = false,
}: {
  length: number;
  width: number;
  compact?: boolean;
}) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Bar
            at={[0, HEIGHT - 0.25, (side * w) / 2]}
            size={[l + 0.34, 0.16, 0.24]}
          />
          <Bar
            at={[(side * l) / 2, HEIGHT - 0.25, 0]}
            size={[0.24, 0.16, w + 0.34]}
          />
          <KnifeEdge
            length={l}
            position={[0, HEIGHT - 0.024, (side * w) / 2]}
          />
          <KnifeEdge
            length={w}
            position={[(side * l) / 2, HEIGHT - 0.024, 0]}
            rotated
          />
          {!compact &&
            [-1, 1].map((end) => (
              <group key={end} position={[(end * l) / 2, 0, (side * w) / 2]}>
                <Bar
                  at={[0, 0.43, 0]}
                  size={[0.17, 0.86, 0.17]}
                  color="#23363b"
                />
                <mesh position-y={0.04} receiveShadow>
                  <cylinderGeometry args={[0.16, 0.2, 0.08, 24]} />
                  <meshStandardMaterial
                    color="#17252a"
                    metalness={0.3}
                    roughness={0.55}
                  />
                </mesh>
              </group>
            ))}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`edge-${side}`}>
          <Bar
            at={[0, HEIGHT - 0.014, (side * w) / 2]}
            size={[l, 0.028, 0.018]}
            color="#6b8a91"
          />
          <Bar
            at={[(side * l) / 2, HEIGHT - 0.014, 0]}
            size={[0.018, 0.028, w]}
            color="#6b8a91"
          />
        </group>
      ))}
    </group>
  );
}

function makeGeometry(length: number, width: number) {
  const g = new BufferGeometry();
  const p = new Float32Array(COUNT * 3);
  const c = new Float32Array(COUNT * 3);
  const indices: number[] = [];
  for (let j = 0; j <= NY; j++) {
    for (let i = 0; i <= NX; i++) {
      const n = j * (NX + 1) + i;
      p[n * 3] = (i / NX - 0.5) * length;
      p[n * 3 + 1] = HEIGHT;
      p[n * 3 + 2] = (j / NY - 0.5) * width;
      if (i < NX && j < NY) {
        indices.push(n, n + NX + 1, n + 1, n + 1, n + NX + 1, n + NX + 2);
      }
    }
  }
  g.setAttribute("position", new BufferAttribute(p, 3));
  g.setAttribute("color", new BufferAttribute(c, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

interface SurfaceProps {
  settings: Settings;
  clock: RefObject<number>;
  seed: number;
  gain: number;
  display: "Pressure" | "Response" | "Correlation";
  responseScale: number;
  onPlace?: (x: number, y: number) => void;
  activeTap?: "A" | "B";
  taps?: boolean;
}

function Surface({
  settings: s,
  clock,
  seed,
  gain,
  display,
  responseScale,
  onPlace,
  activeTap = "A",
  taps = true,
}: SurfaceProps) {
  const { scale, length: l, width: w } = scaleFor(s);
  const geometry = useMemo(() => makeGeometry(l, w), [l, w]);
  const a = useRef<Group>(null);
  const b = useRef<Group>(null);
  const previous = useRef({
    phase: NaN,
    gain: NaN,
    display: "",
    values: null as unknown,
  });
  const values = useMemo(() => {
    const realization = createRealization(s, seed);
    const p0 = new Float32Array(COUNT);
    const p90 = new Float32Array(COUNT);
    const d0 = new Float32Array(COUNT);
    const d90 = new Float32Array(COUNT);
    const correlation = new Float32Array(COUNT);
    for (let j = 0; j <= NY; j++) {
      for (let i = 0; i <= NX; i++) {
        const n = j * (NX + 1) + i;
        const x = i / NX;
        const y = j / NY;
        const v0 = sampleRealization(realization, x, y, 0);
        const v90 = sampleRealization(realization, x, y, Math.PI / 2);
        p0[n] = v0.pressure;
        p90[n] = v90.pressure;
        d0[n] = v0.displacement;
        d90[n] = v90.displacement;
        correlation[n] = coherence(
          s,
          (x - s.ax) * s.length,
          (y - s.ay) * s.width,
        ).re;
      }
    }
    return {
      p0,
      p90,
      d0,
      d90,
      correlation,
      tapA0: sampleRealization(realization, s.ax, s.ay, 0).displacement,
      tapA90: sampleRealization(realization, s.ax, s.ay, Math.PI / 2)
        .displacement,
      tapB0: sampleRealization(realization, s.bx, s.by, 0).displacement,
      tapB90: sampleRealization(realization, s.bx, s.by, Math.PI / 2)
        .displacement,
    };
  }, [s, seed]);
  const color = useMemo(() => new Color(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const phase = clock.current;
    const last = previous.current;
    if (
      phase === last.phase &&
      gain === last.gain &&
      display === last.display &&
      values === last.values
    )
      return;
    previous.current = { phase, gain, display, values };
    const positions = geometry.getAttribute("position");
    const colors = geometry.getAttribute("color");
    const c = Math.cos(phase);
    const sn = Math.sin(phase);
    const pressureScale = 3 * Math.sqrt(s.pressurePsd * s.bandwidth);
    for (let n = 0; n < COUNT; n++) {
      const displacement = values.d0[n] * c + values.d90[n] * sn;
      const pressure = values.p0[n] * c + values.p90[n] * sn;
      const value =
        display === "Correlation"
          ? values.correlation[n]
          : display === "Response"
            ? displacement / Math.max(1e-20, responseScale)
            : pressure / Math.max(1e-20, pressureScale);
      color
        .copy(NEUTRAL)
        .lerp(value < 0 ? BLUE : WARM, Math.min(1, Math.abs(value)));
      colors.setXYZ(n, color.r, color.g, color.b);
      positions.setY(n, HEIGHT + displacement * gain * scale);
    }
    if (a.current)
      a.current.position.y =
        HEIGHT + (values.tapA0 * c + values.tapA90 * sn) * gain * scale + 0.055;
    if (b.current)
      b.current.position.y =
        HEIGHT + (values.tapB0 * c + values.tapB90 * sn) * gain * scale + 0.055;
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  });
  function place(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (e.delta > 5 || !onPlace) return;
    onPlace(
      Math.max(0, Math.min(1, e.point.x / l + 0.5)),
      Math.max(0, Math.min(1, e.point.z / w + 0.5)),
    );
  }
  return (
    <group>
      <mesh geometry={geometry} onClick={place} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          metalness={0.28}
          roughness={0.45}
          side={DoubleSide}
        />
      </mesh>
      {taps &&
        (
          [
            { ref: a, x: s.ax, y: s.ay, id: "A", color: "#ffe3a3" },
            { ref: b, x: s.bx, y: s.by, id: "B", color: "#c4b5ff" },
          ] as const
        ).map((tap) => (
          <group
            key={tap.id}
            ref={tap.ref}
            position={[(tap.x - 0.5) * l, HEIGHT + 0.055, (tap.y - 0.5) * w]}
          >
            <mesh rotation-x={-Math.PI / 2}>
              <ringGeometry
                args={[0.068, activeTap === tap.id ? 0.098 : 0.082, 32]}
              />
              <meshBasicMaterial
                color={tap.color}
                side={DoubleSide}
                toneMapped={false}
                depthTest={false}
              />
            </mesh>
            <mesh position-y={0.07}>
              <cylinderGeometry args={[0.018, 0.018, 0.14, 12]} />
              <meshBasicMaterial color={tap.color} />
            </mesh>
            <mesh position-y={0.15}>
              <sphereGeometry args={[0.045, 12, 8]} />
              <meshBasicMaterial color={tap.color} toneMapped={false} />
            </mesh>
            <Annotation
              position={[0, 0.36, 0]}
              color={tap.color}
              selected={activeTap === tap.id}
            >
              {tap.id}
              {activeTap === tap.id ? " · placing" : ""}
            </Annotation>
          </group>
        ))}
    </group>
  );
}

function Dimensions({ s }: { s: Settings }) {
  const compact = useThree((state) => state.size.width < 460);
  const { length: l, width: w } = scaleFor(s);
  const z = w / 2 + 0.48;
  const x = -l / 2 - 0.48;
  const y = HEIGHT - 0.14;
  return (
    <group>
      <Line
        points={[
          [-l / 2, y, z],
          [l / 2, y, z],
        ]}
        color="#62808a"
        lineWidth={0.8}
      />
      <Line
        points={[
          [x, y, -w / 2],
          [x, y, w / 2],
        ]}
        color="#62808a"
        lineWidth={0.8}
      />
      {[-1, 1].map((sign) => (
        <group key={sign}>
          <Line
            points={[
              [(sign * l) / 2, y, z - 0.07],
              [(sign * l) / 2, y, z + 0.07],
            ]}
            color="#76949c"
            lineWidth={1}
          />
          <Line
            points={[
              [x - 0.07, y, (sign * w) / 2],
              [x + 0.07, y, (sign * w) / 2],
            ]}
            color="#76949c"
            lineWidth={1}
          />
        </group>
      ))}
      <Annotation position={[0, y - 0.05, z + 0.08]}>
        {(s.length * 1000).toFixed(0)} mm · x
      </Annotation>
      {!compact && (
        <Annotation position={[x - 0.12, y, 0]}>
          {(s.width * 1000).toFixed(0)} mm · y
        </Annotation>
      )}
    </group>
  );
}

function BoundaryLayer({
  s,
  clock,
  side,
}: {
  s: Settings;
  clock: RefObject<number>;
  side: boolean;
}) {
  const compact = useThree((state) => state.size.width < 460);
  const { scale, length: l, width: w } = scaleFor(s);
  const h = s.delta * scale * 4;
  const heading = (s.heading * Math.PI) / 180;
  const particles = useRef<Group>(null);
  const span = Math.hypot(l, w);
  const profile = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const fraction = i / 29;
        return [Math.pow(fraction, 1 / 7) * 1.15, h * fraction, 0] as [
          number,
          number,
          number,
        ];
      }),
    [h],
  );
  useFrame(() => {
    if (!particles.current) return;
    particles.current.children.forEach((child, i) => {
      const across = (((i * 0.61803398875) % 1) - 0.5) * span * 0.9;
      const convectiveWavelength =
        (s.velocity * s.convectionRatio) / s.frequency;
      const along =
        (((((clock.current / (2 * Math.PI)) * convectiveWavelength * scale) /
          span +
          i * 0.137) %
          1) -
          0.5) *
        span;
      const x = along * Math.cos(heading) - across * Math.sin(heading);
      const z = along * Math.sin(heading) + across * Math.cos(heading);
      child.position.set(x, HEIGHT + h * (0.26 + (i % 4) * 0.14), z);
      child.visible = Math.abs(x) < l / 2 && Math.abs(z) < w / 2;
    });
  });
  return (
    <group>
      <mesh position={[0, HEIGHT + h / 2, 0]} raycast={() => {}}>
        <boxGeometry args={[l, h, w]} />
        <meshBasicMaterial
          color="#71c7d1"
          opacity={side ? 0.06 : 0.035}
          transparent
          depthWrite={false}
          side={DoubleSide}
        />
        <Edges color="#70afba" transparent opacity={0.3} />
      </mesh>
      <group ref={particles}>
        {Array.from({ length: 32 }, (_, i) => (
          <mesh key={i} rotation-y={-heading} raycast={() => {}}>
            <boxGeometry args={[0.12, 0.014, 0.014]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? "#f4c99b" : "#9ee6e6"}
              transparent
              opacity={0.5}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <Arrow
        start={[
          -0.85 * Math.cos(heading),
          HEIGHT + h + 0.28,
          -0.85 * Math.sin(heading),
        ]}
        end={[
          0.85 * Math.cos(heading),
          HEIGHT + h + 0.28,
          0.85 * Math.sin(heading),
        ]}
        color="#bce7e3"
      />
      <Annotation position={[0, HEIGHT + h + 0.67, 0]} color="#bce7e3">
        U∞ {s.velocity.toFixed(0)} m/s
      </Annotation>
      {side && (
        <>
          <group position={[-l / 2 - 0.7, HEIGHT, -w / 2 - 0.05]}>
            <Line
              points={[
                [0, 0, 0],
                [0, h, 0],
              ]}
              color="#79a7b2"
              lineWidth={1}
            />
            <Line points={profile} color="#bce7e3" lineWidth={1.5} />
            {[0.12, 0.34, 0.6, 0.84, 1].map((fraction) => (
              <Arrow
                key={fraction}
                start={[0, h * fraction, 0]}
                end={[Math.pow(fraction, 1 / 7) * 1.15, h * fraction, 0]}
                color="#84b8c2"
              />
            ))}
          </group>
          <Annotation
            position={[
              -l / 2 - 0.1,
              HEIGHT + h + (compact ? 1.6 : 0.3),
              -w / 2 - 0.1,
            ]}
          >
            {compact
              ? "1/7 profile · schematic"
              : "schematic profile · 1/7 law"}
          </Annotation>
          <Line
            points={[
              [l / 2 + 0.32, HEIGHT, w / 2],
              [l / 2 + 0.32, HEIGHT + h, w / 2],
            ]}
            color="#8bd1d7"
            lineWidth={1}
          />
          <Annotation
            position={[l / 2 + 0.42, HEIGHT + h / 2, w / 2]}
            color="#bce7e3"
          >
            δ₉₉ {(s.delta * 1000).toFixed(0)} mm · height ×4
          </Annotation>
          <Arrow
            start={[
              -0.6 * Math.cos(heading),
              HEIGHT + h * 0.45,
              -0.6 * Math.sin(heading) + w / 2 + 0.17,
            ]}
            end={[
              0.6 * Math.cos(heading),
              HEIGHT + h * 0.45,
              0.6 * Math.sin(heading) + w / 2 + 0.17,
            ]}
            color="#ffca95"
          />
          <Annotation
            position={[0, HEIGHT + h * 0.45, w / 2 + 0.85]}
            color="#ffca95"
          >
            Uc {(s.velocity * s.convectionRatio).toFixed(1)} m/s
          </Annotation>
        </>
      )}
    </group>
  );
}

function AcousticField({
  s,
  clock,
}: {
  s: Settings;
  clock: RefObject<number>;
}) {
  const { length: l, width: w } = scaleFor(s);
  const phaseFronts = useRef<Group>(null);
  const theta = (s.incidence * Math.PI) / 180;
  const phi = (s.azimuth * Math.PI) / 180;
  const direction = useMemo(
    () =>
      new Vector3(
        Math.sin(theta) * Math.cos(phi),
        -Math.cos(theta),
        Math.sin(theta) * Math.sin(phi),
      ),
    [theta, phi],
  );
  const orientation = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), direction),
    [direction],
  );
  useFrame(() => {
    if (!phaseFronts.current) return;
    phaseFronts.current.children.forEach((child, i) => {
      const offset =
        ((((clock.current / (2 * Math.PI)) * 0.25 + i / 3) % 1) - 0.5) * 2.25;
      child.position.set(
        direction.x * offset,
        HEIGHT + 1.6 + direction.y * offset,
        direction.z * offset,
      );
    });
  });
  if (s.field === "daf") {
    return (
      <group>
        {Array.from({ length: 12 }, (_, i) => {
          const angle = i * 2.39996322973;
          const elevation = 0.28 + (i % 4) * 0.15;
          const tx = Math.cos(angle) * l * 0.22;
          const tz = Math.sin(angle) * w * 0.22;
          const distance = 1.6;
          return (
            <Arrow
              key={i}
              start={[
                tx + Math.cos(angle) * distance * Math.cos(elevation),
                HEIGHT + 0.55 + distance * Math.sin(elevation),
                tz + Math.sin(angle) * distance * Math.cos(elevation),
              ]}
              end={[tx, HEIGHT + 0.3, tz]}
              color={i % 2 ? "#91bbc6" : "#c2d8ce"}
            />
          );
        })}
        <Annotation position={[0, HEIGHT + 2.3, 0]}>
          Diffuse arrivals · schematic
        </Annotation>
      </group>
    );
  }
  return (
    <group>
      <group ref={phaseFronts}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} quaternion={orientation} raycast={() => {}}>
            <planeGeometry
              args={[Math.max(l, w) * 0.95, Math.min(l, w) * 0.55]}
            />
            <meshBasicMaterial
              color="#a1d9db"
              transparent
              opacity={0.055}
              side={DoubleSide}
              depthWrite={false}
            />
            <Edges color="#8cc2ca" transparent opacity={0.2} />
          </mesh>
        ))}
      </group>
      <Arrow
        start={[
          -direction.x * 1.5,
          HEIGHT + 1.3 - direction.y * 1.5,
          -direction.z * 1.5,
        ]}
        end={[
          direction.x * 0.15,
          HEIGHT + 1.3 + direction.y * 0.15,
          direction.z * 0.15,
        ]}
        color="#c3e8de"
      />
      <Annotation
        position={[
          -direction.x * 1.2,
          HEIGHT + 1.75 - direction.y * 1.2,
          -direction.z * 1.2,
        ]}
      >
        Arrival schematic · θ {s.incidence.toFixed(0)}°
      </Annotation>
    </group>
  );
}

export default function World({
  settings,
  solution,
  paused,
  view,
  revision,
  display,
  activeTap,
  onPlace,
  gain,
  seed,
  onPhase,
}: {
  settings: Settings;
  solution: Solution;
  paused: boolean;
  view: View;
  revision: number;
  display: "Pressure" | "Response" | "Correlation";
  activeTap: "A" | "B";
  onPlace: (x: number, y: number) => void;
  gain: number;
  seed: number;
  onPhase?: (phase: number) => void;
}) {
  const clock = useRef(0.7);
  const compact = useThree((state) => state.size.width < 460);
  const lastPhaseUpdate = useRef(-Infinity);
  const { length, width, scale } = scaleFor(settings);
  const layerHeadroom =
    settings.field === "tbl"
      ? Math.max(0, settings.delta * scale * 4 - 1.2)
      : 0;
  const sceneCameras = useMemo<CameraPresets<View>>(
    () => ({
      Panel: {
        position: [
          8.2 + layerHeadroom * 0.3,
          7.8 + layerHeadroom * 0.5,
          10.2 + layerHeadroom * 0.4,
        ],
        target: [0, 1.25 + layerHeadroom * 0.45, 0],
      },
      Top: CAMERAS.Top,
      "Boundary layer": {
        position: [1.6, 3.7 + layerHeadroom * 0.6, 11.3 + layerHeadroom],
        target: [0, 1.6 + layerHeadroom * 0.5, 0],
      },
    }),
    [layerHeadroom],
  );
  useFrame((state, dt) => {
    if (!paused && !document.hidden)
      clock.current += Math.min(dt, 0.05) * Math.PI * 2 * VISUAL_HZ;
    if (state.clock.elapsedTime - lastPhaseUpdate.current > 0.1) {
      onPhase?.(clock.current);
      lastPhaseUpdate.current = state.clock.elapsedTime;
    }
  });
  return (
    <>
      <color attach="background" args={["#09161b"]} />
      <fog attach="fog" args={["#09161b", 17, 36]} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[-4, 9, 5]}
        intensity={2.3}
        color="#dbead8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[5, 5, -5]} intensity={1.8} color="#79b7ce" />
      <LabEnvironment variant="isolation" />
      <CameraController
        presets={sceneCameras}
        view={view}
        revision={revision}
        responsive={responsive}
        minDistance={5}
        maxDistance={30}
        minPolar={0.0001}
      />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.025} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#122329"
          metalness={0.15}
          roughness={0.65}
        />
      </mesh>
      <gridHelper args={[36, 36, "#274047", "#1c3037"]} position-y={-0.012} />
      <Fixture length={length} width={width} />
      <Surface
        settings={settings}
        seed={seed}
        clock={clock}
        gain={gain}
        display={display}
        responseScale={3 * solution.displacementRms}
        activeTap={activeTap}
        onPlace={onPlace}
      />
      {view !== "Top" &&
        (settings.field === "tbl" ? (
          <BoundaryLayer
            s={settings}
            clock={clock}
            side={view === "Boundary layer"}
          />
        ) : (
          <AcousticField s={settings} clock={clock} />
        ))}
      <Dimensions s={settings} />
      {view === "Boundary layer" && !compact && (
        <Annotation position={[0, 0.47, width / 2 + 0.1]}>
          Simply supported · knife-edge rails
        </Annotation>
      )}
    </>
  );
}

/** Compact live pressure specimen for the experiment directory. */
export function PanelPreview({ active = true }: { active?: boolean }) {
  const clock = useRef(0.7);
  const { length, width } = scaleFor(DEFAULT);
  useFrame((_, dt) => {
    if (active && !document.hidden)
      clock.current += Math.min(dt, 0.05) * Math.PI * 2 * VISUAL_HZ;
  });
  return (
    <group scale={0.82} position-y={-0.35} rotation-y={-0.1}>
      <Fixture length={length} width={width} compact />
      <Surface
        settings={DEFAULT}
        seed={17}
        clock={clock}
        gain={1800}
        display="Pressure"
        responseScale={1}
        taps={false}
      />
      <Arrow
        start={[-2.2, HEIGHT + 1, -1.2]}
        end={[1.8, HEIGHT + 1, -1.2]}
        color="#b9ddca"
      />
      <mesh position={[0, HEIGHT + 0.47, 0]} raycast={() => {}}>
        <boxGeometry args={[length, 0.9, width]} />
        <meshBasicMaterial
          color="#7aaeb8"
          transparent
          opacity={0.035}
          depthWrite={false}
        />
        <Edges color="#8fbcc1" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}
