import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  Plane,
  Vector3,
} from "three";
import { nearestPoint, type PlacementTarget } from "./placement";
import { LabEnvironment } from "@engine/Scene";
import {
  CameraController,
  type CameraPreset,
  type CameraPresets,
} from "@engine/Camera";
import { createAnnotationProjector } from "@engine/annotations";
import { EngineeringVector } from "@engine/EngineeringVector";
import {
  GRID,
  MODES,
  FS,
  TIPS,
  reconstruct,
  shape,
  type Measurement,
  type Settings,
  type Survey,
} from "./physics";
export const CAMERAS: CameraPresets<
  | "System"
  | "Plate"
  | "Hammer"
  | "Accelerometer"
  | "Measurement Grid"
  | "FRF"
  | "Mode Shape"
> = {
  System: { position: [9, 7.6, 11], target: [-0.65, 1.3, 0] },
  Plate: { position: [6.5, 6.4, 8.4], target: [-0.45, 1.5, 0] },
  Hammer: { position: [5, 5.7, 8], target: [-1.25, 1.8, 0.9] },
  Accelerometer: { position: [7, 5.4, 5], target: [1.2, 1.8, -0.9] },
  "Measurement Grid": { position: [0, 10, 4.5], target: [0, 1.4, 0] },
  FRF: { position: [8, 7, 10], target: [-0.65, 1.3, 0] },
  "Mode Shape": { position: [6.9, 5.5, 8.8], target: [-0.7, 1.5, 0] },
};
export type View = keyof typeof CAMERAS;
function framing(p: CameraPreset, view: View, width: number): CameraPreset {
  if (width >= 700) return p;
  return view === "Measurement Grid"
    ? { position: [0, 11.8, 6.2], target: [0, 1.6, 0] }
    : { position: [11.8, 10.7, 16], target: [0, 1.6, 0] };
}
export interface Playback {
  elapsed: number;
  playing: boolean;
  started: number;
  time: number;
}
export const CONTACT_TIME = 0.65,
  PREVIEW_TIME = 0.6,
  SLOWDOWN = 8;
const NX = 48,
  NY = 32,
  COUNT = (NX + 1) * (NY + 1),
  HEIGHT = 1.85;
function plateGeometry() {
  const g = new BufferGeometry(),
    p = new Float32Array(COUNT * 6),
    colors = new Float32Array(COUNT * 6),
    indices: number[] = [];
  for (let layer = 0; layer < 2; layer++)
    for (let j = 0; j <= NY; j++)
      for (let i = 0; i <= NX; i++) {
        const k = (layer * COUNT + j * (NX + 1) + i) * 3;
        p[k] = (i / NX - 0.5) * 6;
        p[k + 1] = -layer * 0.04;
        p[k + 2] = (j / NY - 0.5) * 4;
        colors[k] = 0.35;
        colors[k + 1] = 0.55;
        colors[k + 2] = 0.61;
      }
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i,
        b = a + 1,
        c = a + NX + 1,
        d = c + 1;
      indices.push(
        a,
        c,
        b,
        b,
        c,
        d,
        a + COUNT,
        b + COUNT,
        c + COUNT,
        b + COUNT,
        d + COUNT,
        c + COUNT,
      );
    }
  const edge = [
    ...Array.from({ length: NX + 1 }, (_, i) => i),
    ...Array.from({ length: NY }, (_, j) => (j + 1) * (NX + 1) + NX),
    ...Array.from({ length: NX }, (_, i) => NY * (NX + 1) + NX - i - 1),
    ...Array.from({ length: NY - 1 }, (_, j) => (NY - j - 1) * (NX + 1)),
  ];
  edge.forEach((a, i) => {
    const b = edge[(i + 1) % edge.length];
    indices.push(a, b, b + COUNT, a, b + COUNT, a + COUNT);
  });
  g.setAttribute("position", new BufferAttribute(p, 3));
  g.setAttribute("color", new BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function Bar({
  position,
  size,
  color = "#465b60",
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={0.65} roughness={0.35} />
    </mesh>
  );
}
export function PlateArticle({
  mode = 0,
  animate = true,
}: {
  mode?: number;
  animate?: boolean;
}) {
  const geometry = useMemo(plateGeometry, []),
    phase = useRef(1.1);
  const values = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, k) =>
        shape(
          mode,
          ((k % (NX + 1)) / NX) * 2 - 1,
          (Math.floor(k / (NX + 1)) / NY) * 2 - 1,
        ),
      ),
    [mode],
  );
  useEffect(() => {
    const colors = geometry.attributes.color,
      positive = new Color("#b9ddb9"),
      negative = new Color("#6297be"),
      neutral = new Color("#638389"),
      c = new Color();
    for (let k = 0; k < COUNT * 2; k++) {
      const v = values[k % COUNT];
      c.copy(neutral).lerp(
        v >= 0 ? positive : negative,
        Math.min(1, Math.abs(v) * 1.6),
      );
      colors.setXYZ(k, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
  }, [geometry, values]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, dt) => {
    if (animate) phase.current += dt * 3;
    const p = geometry.attributes.position;
    for (let k = 0; k < COUNT * 2; k++)
      p.setY(
        k,
        values[k % COUNT] * Math.sin(phase.current) * 0.4 -
          (k >= COUNT ? 0.04 : 0),
      );
    p.needsUpdate = true;
    geometry.computeVertexNormals();
  });
  return (
    <mesh geometry={geometry} position={[0, 0.7, 0]}>
      <meshStandardMaterial
        vertexColors
        metalness={0.5}
        roughness={0.3}
        side={DoubleSide}
      />
    </mesh>
  );
}
function World({
  settings,
  measurement,
  clock,
  selectedMode,
  gain,
  nodes,
  grid,
  survey,
  rebuilding,
  view,
  revision,
  onPoint,
  onBeginPlacement,
  placement,
  movable,
  labels,
  paused,
  focus,
}: {
  settings: Settings;
  measurement: Measurement | null;
  clock: RefObject<Playback>;
  selectedMode: number | null;
  gain: number;
  nodes: boolean;
  grid: boolean;
  survey: Survey;
  rebuilding: boolean;
  view: View;
  revision: number;
  onPoint: (i: number, target?: PlacementTarget) => void;
  onBeginPlacement: (target: PlacementTarget, reframe?: boolean) => void;
  placement: PlacementTarget | null;
  movable: boolean;
  labels: RefObject<(HTMLDivElement | null)[]>;
  paused: boolean;
  focus: string;
}) {
  const controls = useThree((s) => s.controls) as OrbitImpl | null;
  const canvas = useThree((s) => s.gl.domElement);
  const drag = useRef<{
    target: PlacementTarget;
    index: number;
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetZ: number;
    moved: boolean;
    capture: Element;
    controls: OrbitImpl | null;
    wasEnabled: boolean;
  } | null>(null);
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -HEIGHT), []);
  const hit = useMemo(() => new Vector3(), []);
  const endDrag = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    if (active) {
      if (active.controls) active.controls.enabled = active.wasEnabled;
      if (active.capture.hasPointerCapture(active.pointerId))
        active.capture.releasePointerCapture(active.pointerId);
    }
    canvas.style.cursor = "";
    return active;
  }, [canvas]);
  useEffect(
    () => () => {
      endDrag();
    },
    [endDrag],
  );
  useEffect(() => {
    if (!movable) endDrag();
  }, [movable, endDrag]);
  const dragHandlers = (target: PlacementTarget) => ({
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (
        !movable ||
        e.button !== 0 ||
        drag.current ||
        !e.ray.intersectPlane(plane, hit)
      )
        return;
      e.stopPropagation();
      const index = settings[target === "Impact" ? "input" : "output"];
      drag.current = {
        target,
        index,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: hit.x - GRID[index].x * 3,
        offsetZ: hit.z - GRID[index].y * 2,
        moved: false,
        capture: e.target as Element,
        controls,
        wasEnabled: controls?.enabled ?? true,
      };
      if (controls) {
        controls.dispatchEvent({ type: "start", target: controls });
        controls.enabled = false;
      }
      (e.target as Element).setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      onBeginPlacement(target, false);
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      const active = drag.current;
      if (!active || active.pointerId !== e.pointerId) return;
      e.stopPropagation();
      if (!e.ray.intersectPlane(plane, hit)) return;
      active.moved ||=
        Math.hypot(e.clientX - active.startX, e.clientY - active.startY) > 4;
      if (active.moved)
        active.index = nearestPoint(
          (hit.x - active.offsetX) / 3,
          (hit.z - active.offsetZ) / 2,
          settings[active.target === "Impact" ? "output" : "input"],
        );
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      if (drag.current?.pointerId !== e.pointerId) return;
      e.stopPropagation();
      const active = endDrag();
      if (active?.moved) onPoint(active.index, active.target);
    },
    onPointerCancel: () => {
      endDrag();
    },
    onLostPointerCapture: () => {
      endDrag();
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
    },
    onPointerOver: () => {
      if (movable && !drag.current) canvas.style.cursor = "grab";
    },
    onPointerOut: () => {
      if (!drag.current) canvas.style.cursor = "";
    },
  });
  const geometry = useMemo(plateGeometry, []),
    hammer = useRef<Group>(null),
    sensor = useRef<Group>(null),
    markers = useRef<(Mesh | null)[]>([]),
    phase = useRef(0),
    mix = useRef(0);
  const project = useMemo(createAnnotationProjector, []);
  const modalValues = useMemo(
    () =>
      MODES.map((_, mode) =>
        Float32Array.from({ length: COUNT }, (_, k) =>
          shape(
            mode,
            ((k % (NX + 1)) / NX) * 2 - 1,
            (Math.floor(k / (NX + 1)) / NY) * 2 - 1,
          ),
        ),
      ),
    [],
  );
  const reconstructed = useMemo(
    () =>
      Float32Array.from({ length: COUNT }, (_, k) =>
        reconstruct(
          selectedMode ?? 0,
          ((k % (NX + 1)) / NX) * 2 - 1,
          (Math.floor(k / (NX + 1)) / NY) * 2 - 1,
          survey,
        ),
      ),
    [selectedMode, survey],
  );
  const smooth = useMemo(() => new Float32Array(COUNT), []),
    qs = useMemo(() => new Float64Array(6), []);
  const positive = useMemo(() => new Color("#b9ddb9"), []),
    negative = useMemo(() => new Color("#6297be"), []),
    neutral = useMemo(() => new Color("#638389"), []),
    nodeColor = useMemo(() => new Color("#ecedcf"), []),
    color = useMemo(() => new Color(), []);
  const input = GRID[settings.input],
    output = GRID[settings.output];
  const cords = useMemo(
    () =>
      [-3.5, 3.5].flatMap((x) =>
        [-2.25, 2.25].map((z) => {
          const g = new BufferGeometry();
          g.setAttribute(
            "position",
            new BufferAttribute(
              new Float32Array([
                x,
                4.29,
                z,
                Math.sign(x) * 2.72,
                HEIGHT,
                Math.sign(z) * 1.78,
              ]),
              3,
            ),
          );
          return g;
        }),
      ),
    [],
  );
  useEffect(() => () => cords.forEach((g) => g.dispose()), [cords]);
  const wires = useMemo(
    () =>
      [
        [
          [output.x * 3, HEIGHT + 0.18, output.y * 2],
          [output.x * 3 + 0.3, HEIGHT + 0.22, output.y * 2 - 0.25],
          [3.1, HEIGHT + 0.3, -2.25],
          [4.1, 1, -2.6],
          [4.6, 0.65, -1.5],
        ],
        [
          [input.x * 3 + 1.45, HEIGHT + 0.4, input.y * 2],
          [input.x * 3 + 1.9, 1.2, input.y * 2],
          [3.7, 0.18, 2.1],
          [4.7, 0.5, -0.9],
        ],
      ] as [number, number, number][][],
    [input, output],
  );
  const wireGeometry = useMemo(
    () =>
      wires.map((points) => {
        const g = new BufferGeometry();
        g.setAttribute(
          "position",
          new BufferAttribute(new Float32Array(points.flat()), 3),
        );
        g.setIndex(points.slice(1).flatMap((_, i) => [i, i + 1]));
        return g;
      }),
    [wires],
  );
  useEffect(
    () => () => wireGeometry.forEach((g) => g.dispose()),
    [wireGeometry],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ camera, size }, dt) => {
    const preview = drag.current;
    const input =
      GRID[preview?.target === "Impact" ? preview.index : settings.input];
    const output =
      GRID[preview?.target === "Reference" ? preview.index : settings.output];
    const safeDt = Math.min(dt, 0.05);
    if (!paused && !document.hidden) {
      phase.current += safeDt * 3.3;
      if (clock.current.playing) clock.current.elapsed += safeDt;
    }
    const physical = Math.max(
      0,
      (clock.current.elapsed - CONTACT_TIME) / SLOWDOWN,
    );
    clock.current.time = physical;
    const sample = Math.min(N_SAFE, Math.floor(physical * FS)),
      fraction = physical * FS - sample;
    qs.fill(0);
    if (measurement && clock.current.playing && physical <= PREVIEW_TIME)
      for (let m = 0; m < 6; m++)
        qs[m] =
          (measurement.q[m][sample] * (1 - fraction) +
            measurement.q[m][sample + 1] * fraction) *
          10 *
          80;
    const modeBlend = selectedMode === null ? 0 : 1;
    mix.current += (modeBlend - mix.current) * (1 - Math.exp(-safeDt * 5));
    const p = geometry.attributes.position,
      c = geometry.attributes.color,
      blend = 1 - Math.exp(-safeDt * 6);
    for (let k = 0; k < COUNT; k++) {
      let transient = 0;
      for (let m = 0; m < 6; m++) transient -= modalValues[m][k] * qs[m];
      const phi =
        selectedMode === null
          ? 0
          : rebuilding
            ? reconstructed[k]
            : modalValues[selectedMode][k];
      smooth[k] += (phi - smooth[k]) * blend;
      const y =
        transient * (1 - mix.current) +
        smooth[k] * Math.sin(phase.current) * gain * mix.current;
      p.setY(k, y);
      p.setY(k + COUNT, y - 0.04);
      color
        .copy(neutral)
        .lerp(
          phi >= 0 ? positive : negative,
          Math.min(1, Math.abs(phi) * 1.6) * mix.current,
        );
      if (
        nodes &&
        selectedMode !== null &&
        Math.abs(phi) < 0.045 &&
        !rebuilding
      )
        color.copy(nodeColor);
      c.setXYZ(k, color.r, color.g, color.b);
      c.setXYZ(k + COUNT, color.r * 0.7, color.g * 0.7, color.b * 0.7);
    }
    p.needsUpdate = true;
    c.needsUpdate = true;
    geometry.computeVertexNormals();
    const at = (x: number, y: number) => {
      const i = Math.round(((x + 1) / 2) * NX),
        j = Math.round(((y + 1) / 2) * NY);
      return p.getY(j * (NX + 1) + i);
    };
    cords.forEach((g) => {
      const v = g.attributes.position;
      v.setY(1, HEIGHT + 0.035 + at(v.getX(1) / 3, v.getZ(1) / 2));
      v.needsUpdate = true;
    });
    markers.current.forEach((marker, i) => {
      if (marker) {
        marker.position.y = HEIGHT + 0.025 + at(GRID[i].x, GRID[i].y);
        marker.scale.setScalar(preview?.index === i ? 1.7 : 1);
      }
    });
    if (sensor.current)
      sensor.current.position.set(
        output.x * 3,
        HEIGHT + at(output.x, output.y),
        output.y * 2,
      );
    const sensorWire = wireGeometry[0].attributes.position;
    sensorWire.setXYZ(
      0,
      output.x * 3,
      HEIGHT + 0.18 + at(output.x, output.y),
      output.y * 2,
    );
    sensorWire.setXYZ(
      1,
      output.x * 3 + 0.3,
      HEIGHT + 0.22 + at(output.x, output.y),
      output.y * 2 - 0.25,
    );
    sensorWire.needsUpdate = true;
    const hammerWire = wireGeometry[1].attributes.position;
    hammerWire.setXYZ(0, input.x * 3 + 1.45, HEIGHT + 0.275, input.y * 2);
    hammerWire.setXYZ(1, input.x * 3 + 1.9, 1.2, input.y * 2);
    hammerWire.needsUpdate = true;
    if (hammer.current) {
      const t = clock.current.elapsed;
      let angle = -0.62;
      if (clock.current.playing) {
        if (t < CONTACT_TIME)
          angle = -0.8 * (1 - Math.pow(t / CONTACT_TIME, 2));
        else if (settings.double && t < CONTACT_TIME + 0.035 * SLOWDOWN)
          angle =
            -0.3 *
            Math.sin((Math.PI * (t - CONTACT_TIME)) / (0.035 * SLOWDOWN));
        else
          angle =
            -0.65 *
            (1 -
              Math.exp(
                -Math.max(
                  0,
                  t - CONTACT_TIME - (settings.double ? 0.035 * SLOWDOWN : 0),
                ) * 7,
              ));
      }
      hammer.current.rotation.z = angle;
      hammer.current.position.set(
        input.x * 3 + 1.45,
        HEIGHT + 0.275,
        input.y * 2,
      );
    }
    project(
      labels.current[0],
      [input.x * 3, HEIGHT + 0.55, input.y * 2],
      camera,
      size,
      {
        offsetX: -125,
        offsetY: -38,
        visible: selectedMode === null,
        keepInside: true,
      },
    );
    project(
      labels.current[1],
      [output.x * 3, HEIGHT + 0.55, output.y * 2],
      camera,
      size,
      { offsetX: 25, offsetY: -12, keepInside: true },
    );
    project(labels.current[2], [-3.12, 3.6, -2.25], camera, size, {
      offsetX: 12,
      visible: focus === "suspension",
      keepInside: true,
    });
  });
  return (
    <>
      <color attach="background" args={["#132329"]} />
      <fog attach="fog" args={["#132329", 18, 40]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[1, 10, 5]}
        intensity={3.1}
        color="#f7e7cf"
        castShadow
        shadow-bias={-0.001}
        shadow-normalBias={0.02}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-6, 5, -1]} intensity={2} color="#a4d6e3" />
      <LabEnvironment />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#26383d" roughness={0.87} />
      </mesh>
      <gridHelper
        args={[36, 24, "#31474c", "#2d4247"]}
        position={[0, -0.035, 0]}
      />
      <Bar position={[0, 0.03, 0]} size={[8, 0.12, 6.5]} color="#2b3b40" />
      {[-3.5, 3.5].map((x) => (
        <group key={x}>
          <Bar position={[x, 2.15, -2.5]} size={[0.13, 4.3, 0.16]} />
          <Bar position={[x, 4.3, 0]} size={[0.13, 0.16, 5.1]} />
          <Bar position={[x, 0.18, 0]} size={[0.32, 0.2, 5.6]} />
          {[-2.25, 2.25].map((z) => (
            <group key={z}>
              <mesh position={[x, 0.18, z]}>
                <cylinderGeometry args={[0.2, 0.24, 0.25, 24]} />
                <meshStandardMaterial color="#101b20" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {cords.map((g, i) => (
        <lineSegments key={i} geometry={g}>
          <lineBasicMaterial
            color={focus === "suspension" ? "#e8c397" : "#a5b1aa"}
          />
        </lineSegments>
      ))}
      <Bar position={[0, 4.3, -2.5]} size={[7.15, 0.16, 0.16]} />
      <mesh
        geometry={geometry}
        position={[0, HEIGHT, 0]}
        castShadow
        onClick={(e) => {
          if (!movable || !placement || e.delta > 4) return;
          e.stopPropagation();
          onPoint(
            nearestPoint(
              e.point.x / 3,
              e.point.z / 2,
              settings[placement === "Impact" ? "output" : "input"],
            ),
            placement,
          );
        }}
        onPointerOver={() => {
          if (movable && placement && !drag.current)
            canvas.style.cursor = "crosshair";
        }}
        onPointerOut={() => {
          if (!drag.current) canvas.style.cursor = "";
        }}
      >
        <meshStandardMaterial
          vertexColors
          metalness={0.48}
          roughness={0.36}
          side={DoubleSide}
        />
      </mesh>
      {GRID.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            markers.current[i] = el;
          }}
          position={[p.x * 3, HEIGHT + 0.025, p.y * 2]}
          rotation-x={-Math.PI / 2}
          visible={grid || i === settings.input || i === settings.output}
          onClick={(e) => {
            e.stopPropagation();
            if (movable && placement && e.delta <= 4) onPoint(i, placement);
          }}
        >
          <ringGeometry
            args={[
              i === settings.input ? 0.09 : 0.065,
              i === settings.input ? 0.14 : 0.1,
              24,
            ]}
          />
          <meshBasicMaterial
            color={
              i === settings.output
                ? "#9eddf2"
                : i === settings.input
                  ? "#eaba83"
                  : survey[i]
                    ? "#b9e9b9"
                    : "#284b50"
            }
            transparent
            opacity={
              survey[i] || i === settings.input || i === settings.output
                ? 1
                : 0.85
            }
            side={DoubleSide}
            depthTest={false}
          />
        </mesh>
      ))}
      <group
        ref={sensor}
        position={[output.x * 3, HEIGHT, output.y * 2]}
        {...dragHandlers("Reference")}
      >
        <mesh position={[0, 0.15, 0]}>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.085, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.17, 6]} />
          <meshStandardMaterial
            color="#e6cda7"
            metalness={0.85}
            roughness={0.24}
          />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
          <meshStandardMaterial color="#7b9398" metalness={0.8} />
        </mesh>
        <EngineeringVector
          origin={[0, 0.85, 0]}
          direction={[0, -1, 0]}
          magnitude={1}
          gain={0.47}
          label="a"
          color="#a8daec"
        />
      </group>
      <group ref={hammer} {...dragHandlers("Impact")}>
        <mesh position={[-1.45, 0, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 0.44, 28]} />
          <meshStandardMaterial
            color="#c0cace"
            metalness={0.88}
            roughness={0.21}
          />
        </mesh>
        <mesh position={[-1.45, -0.245, 0]}>
          <cylinderGeometry args={[0.105, 0.105, 0.06, 24]} />
          <meshStandardMaterial
            color={TIPS[settings.tip].color}
            metalness={settings.tip === "Hard" ? 0.8 : 0.1}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[-0.68, 0.02, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.075, 0.075, 1.36, 20]} />
          <meshStandardMaterial
            color="#293439"
            metalness={0.2}
            roughness={0.7}
          />
        </mesh>
        <mesh position={[-0.13, 0.02, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.105, 0.105, 0.58, 20]} />
          <meshStandardMaterial color="#171e23" roughness={0.85} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh
            key={i}
            position={[-0.38 + i * 0.085, 0.02, 0]}
            rotation-y={Math.PI / 2}
          >
            <torusGeometry args={[0.106, 0.009, 5, 16]} />
            <meshStandardMaterial color="#4e5658" />
          </mesh>
        ))}
      </group>
      {wireGeometry.map((g, i) => (
        <lineSegments key={i} geometry={g}>
          <lineBasicMaterial color={i === 0 ? "#9db09b" : "#c8a06e"} />
        </lineSegments>
      ))}
      <group position={[4.7, 0.6, -1.3]} rotation-y={-0.18}>
        <Bar position={[0, 0, 0]} size={[1.6, 0.85, 1.5]} color="#1b2933" />
        <Bar
          position={[0, 0.08, 0.765]}
          size={[1.42, 0.5, 0.025]}
          color="#52676d"
        />
        {[0, 1].map((i) => (
          <mesh
            key={i}
            position={[-0.46 + i * 0.38, 0.06, 0.8]}
            rotation-x={Math.PI / 2}
          >
            <cylinderGeometry args={[0.07, 0.07, 0.07, 20]} />
            <meshStandardMaterial color="#c1a873" metalness={0.8} />
          </mesh>
        ))}
        <mesh position={[0.47, 0.18, 0.79]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#b7edc1" />
        </mesh>
      </group>
      <CameraController
        presets={CAMERAS}
        view={view}
        revision={revision}
        responsive={framing}
        minDistance={4.5}
      />
    </>
  );
}
const N_SAFE = FS * 4 - 2;

export default memo(World);
