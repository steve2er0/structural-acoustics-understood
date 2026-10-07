import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import {
  ArrowHelper,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
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
  TANK,
  radiusAt,
  shellDisplacement,
  freeSurfaceDisplacement,
  fluidDisplacement,
  pressureAt,
  type Solution,
  type Mode,
  type CaseId,
} from "./physics";

export type View = "Tank" | "Section" | "Surface";
export type Display = "Mode shape" | "Pressure" | "Fluid motion";
export const CAMERAS: CameraPresets<View> = {
  Tank: { position: [6.2, 4.6, 7], target: [0, 2.48, 0] },
  Section: { position: [5.7, 4.7, 7.7], target: [0, 2.48, 0] },
  Surface: { position: [4.4, 7.8, 5.4], target: [0, 3.1, 0] },
};
const SCALE = 0.25;
const BASE = 0.4;
// Eight circumferential samples per wavelength at the maximum animated n = 12.
const THETA = 96;
const MERIDIAN = 108;
const RADIAL = 24;
const CYAN = new Color("#69dded");
const VIOLET = new Color("#b3a4f3");
const SILVER = new Color("#b6c6c7");
const POSITIVE = new Color("#f1b879");
const NEGATIVE = new Color("#5298c6");
const PRESSURE_LOW = new Color("#83b5c3");
const PRESSURE_HIGH = new Color("#f6b875");
const PRESSURE_MAX = 1.4e6; // Fixed Pa scale across all operating-point controls.
const FLUID_HIGH = new Color("#e5faf1");
const FLUID_LOW = new Color("#4a78a2");

function framing(p: CameraPreset, _view: View, width: number): CameraPreset {
  if (width > 680) return p;
  const center = new Vector3(...p.target);
  const position = new Vector3(...p.position)
    .sub(center)
    .multiplyScalar(width < 450 ? 1.12 : 1.06)
    .add(center);
  return {
    position: position.toArray() as [number, number, number],
    target: p.target,
  };
}

function Annotation({
  position,
  text,
  color = "#dce8e4",
  offset = [0, 0],
}: {
  position: [number, number, number];
  text: string;
  color?: string;
  offset?: [number, number];
}) {
  const anchor = useRef<Group>(null);
  const element = useRef<HTMLSpanElement | null>(null);
  const gl = useThree((state) => state.gl);
  const point = useMemo(() => new Vector3(), []);
  const project = useMemo(createAnnotationProjector, []);
  useEffect(() => {
    const span = document.createElement("span");
    span.className = "cryo-3d-label";
    Object.assign(span.style, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "8",
      pointerEvents: "none",
      userSelect: "none",
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: "10px",
      lineHeight: "1.45",
      padding: "5px 8px",
      background: "rgba(10, 25, 31, .9)",
      border: "1px solid rgba(160, 197, 199, .22)",
      borderRadius: "5px",
      whiteSpace: "pre",
      opacity: "0",
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
    element.current.textContent = text;
    element.current.style.color = color;
  }, [text, color]);
  useFrame(({ camera, size }) => {
    if (!anchor.current) return;
    anchor.current.getWorldPosition(point);
    project(element.current, [point.x, point.y, point.z], camera, size, {
      offsetX: offset[0],
      offsetY: offset[1],
      centered: true,
      margin: 14,
      keepInside: true,
    });
  });
  return <group ref={anchor} position={position} />;
}

function Arrow({
  start,
  end,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const arrow = useMemo(() => {
    const origin = new Vector3(...start);
    const delta = new Vector3(...end).sub(origin);
    return new ArrowHelper(
      delta.clone().normalize(),
      origin,
      delta.length(),
      color,
      0.08,
      0.045,
    );
  }, [start[0], start[1], start[2], end[0], end[1], end[2], color]);
  useEffect(() => () => arrow.dispose(), [arrow]);
  return <primitive object={arrow} />;
}

function elevation(t: number) {
  const c = TANK.domeDepth;
  // More samples at the curved heads keep the pole and dome normals smooth.
  if (t < 0.2) return c * (1 - Math.cos(((t / 0.2) * Math.PI) / 2));
  if (t > 0.8)
    return TANK.height - c * (1 - Math.cos((((1 - t) / 0.2) * Math.PI) / 2));
  return c + ((t - 0.2) / 0.6) * TANK.barrelHeight;
}

function makeShell(section: boolean, top: number = TANK.height) {
  const geometry = new BufferGeometry();
  const positions = new Float32Array((MERIDIAN + 1) * (THETA + 1) * 3);
  const colors = new Float32Array(positions.length);
  const z = new Float32Array(positions.length / 3);
  const angles = new Float32Array(z.length);
  const indices: number[] = [];
  const start = section ? 1.7 : 0;
  const sweep = section ? Math.PI * 2 - 1.85 : Math.PI * 2;
  for (let j = 0; j <= MERIDIAN; j++) {
    const height =
      top < TANK.height ? (j / MERIDIAN) * top : elevation(j / MERIDIAN);
    const r = radiusAt(height);
    for (let i = 0; i <= THETA; i++) {
      const index = j * (THETA + 1) + i;
      const angle = start + (i / THETA) * sweep;
      z[index] = height;
      angles[index] = angle;
      positions[index * 3] = r * Math.cos(angle) * SCALE;
      positions[index * 3 + 1] = BASE + height * SCALE;
      positions[index * 3 + 2] = r * Math.sin(angle) * SCALE;
      if (j < MERIDIAN && i < THETA) {
        indices.push(
          index,
          index + THETA + 1,
          index + 1,
          index + 1,
          index + THETA + 1,
          index + THETA + 2,
        );
      }
    }
  }
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, z, angles, original: positions.slice() };
}

function makeSurface(radius: number, height: number) {
  const geometry = new BufferGeometry();
  const positions = new Float32Array((RADIAL + 1) * (THETA + 1) * 3);
  const colors = new Float32Array(positions.length);
  const r = new Float32Array(positions.length / 3);
  const angles = new Float32Array(r.length);
  const indices: number[] = [];
  for (let j = 0; j <= RADIAL; j++) {
    for (let i = 0; i <= THETA; i++) {
      const index = j * (THETA + 1) + i;
      const radial = (j / RADIAL) * radius;
      const theta = (i / THETA) * Math.PI * 2;
      r[index] = radial;
      angles[index] = theta;
      positions[index * 3] = radial * Math.cos(theta) * SCALE;
      positions[index * 3 + 1] = BASE + height * SCALE;
      positions[index * 3 + 2] = radial * Math.sin(theta) * SCALE;
      if (j < RADIAL && i < THETA) {
        indices.push(
          index,
          index + 1,
          index + THETA + 1,
          index + 1,
          index + THETA + 2,
          index + THETA + 1,
        );
      }
    }
  }
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, r, angles };
}

function ring(
  z: number,
  section: boolean,
  offset = 0,
): [number, number, number][] {
  const start = section ? 1.7 : 0;
  const sweep = section ? Math.PI * 2 - 1.85 : Math.PI * 2;
  const r = radiusAt(z) * SCALE + offset;
  return Array.from({ length: 97 }, (_, i) => {
    const angle = start + (i / 96) * sweep;
    return [r * Math.cos(angle), BASE + z * SCALE, r * Math.sin(angle)];
  });
}

function Ghost({ section }: { section: boolean }) {
  const rings = useMemo(
    () =>
      [TANK.domeDepth, 5.25, 8.4, 11.55, TANK.height - TANK.domeDepth].map(
        (z) => ring(z, section, 0.012),
      ),
    [section],
  );
  const ribs = useMemo(() => {
    const start = section ? 1.7 : 0;
    const sweep = section ? Math.PI * 2 - 1.85 : Math.PI * 2;
    return Array.from({ length: section ? 9 : 12 }, (_, i) => {
      const theta = start + (i / (section ? 8 : 12)) * sweep;
      return Array.from({ length: 65 }, (_, j): [number, number, number] => {
        const z = elevation(j / 64);
        const r = radiusAt(z) * SCALE + 0.012;
        return [r * Math.cos(theta), BASE + z * SCALE, r * Math.sin(theta)];
      });
    });
  }, [section]);
  return (
    <group>
      {rings.map((points, i) => (
        <Line
          key={`ring-${i}`}
          points={points}
          color="#d3e1dd"
          transparent
          opacity={0.24}
          lineWidth={1}
        />
      ))}
      {ribs.map((points, i) => (
        <Line
          key={`rib-${i}`}
          points={points}
          color="#d3e1dd"
          transparent
          opacity={i === 0 || i === ribs.length - 1 ? 0.65 : 0.17}
          lineWidth={1}
        />
      ))}
    </group>
  );
}

interface ArticleProps {
  solution: Solution;
  mode: Mode;
  caseId: CaseId;
  display: Display;
  gain: number;
  clock: RefObject<number>;
  section: boolean;
  compact?: boolean;
}

function Article({
  solution,
  mode,
  caseId,
  display,
  gain,
  clock,
  section,
  compact = false,
}: ArticleProps) {
  const shell = useMemo(() => makeShell(section), [section]);
  const liquid = useMemo(
    () => makeShell(false, solution.liquidHeight),
    [solution.liquidHeight],
  );
  const surface = useMemo(
    () => makeSurface(solution.surfaceRadius, solution.liquidHeight),
    [solution.surfaceRadius, solution.liquidHeight],
  );
  const color = useMemo(() => new Color(), []);
  const fluidColor = solution.settings.fluid === "lox" ? CYAN : VIOLET;
  const fields = useMemo(() => {
    let peak = 1e-12;
    const u = Array.from(shell.z, (z, i) => {
      const d = shellDisplacement(solution, mode, z, shell.angles[i]);
      peak = Math.max(peak, Math.hypot(d.radial, d.axial, d.tangential));
      return d;
    });
    const eta = Float32Array.from(surface.r, (r, i) => {
      const v = freeSurfaceDisplacement(solution, mode, r, surface.angles[i]);
      peak = Math.max(peak, Math.abs(v));
      return v;
    });
    const fluidWall = Array.from(liquid.z, (z, i) =>
      shellDisplacement(solution, mode, z, liquid.angles[i]),
    );
    const contact = Array.from(surface.angles, (theta) =>
      shellDisplacement(solution, mode, solution.liquidHeight, theta),
    );
    return { u, eta, peak, fluidWall, contact };
  }, [shell, liquid, surface, solution, mode]);
  useEffect(() => () => shell.geometry.dispose(), [shell]);
  useEffect(() => () => liquid.geometry.dispose(), [liquid]);
  useEffect(() => () => surface.geometry.dispose(), [surface]);
  useFrame(() => {
    // A zero drawing gain also marks an unavailable selected eigenvector.
    // The fallback mode supplies geometry only; none of its modal field is shown.
    const phase =
      gain > 0 && display !== "Pressure" ? Math.sin(clock.current) : 0;
    const amplitude =
      display === "Pressure" ? 0 : (0.55 * gain * phase) / fields.peak;
    const positions = shell.geometry.getAttribute("position");
    const colors = shell.geometry.getAttribute("color");
    for (let i = 0; i < shell.z.length; i++) {
      const d = fields.u[i];
      const theta = shell.angles[i];
      positions.setXYZ(
        i,
        shell.original[i * 3] +
          (d.radial * Math.cos(theta) - d.tangential * Math.sin(theta)) *
            amplitude *
            SCALE,
        shell.original[i * 3 + 1] + d.axial * amplitude * SCALE,
        shell.original[i * 3 + 2] +
          (d.radial * Math.sin(theta) + d.tangential * Math.cos(theta)) *
            amplitude *
            SCALE,
      );
      if (display === "Pressure") {
        const p = pressureAt(solution, shell.z[i]);
        color
          .copy(PRESSURE_LOW)
          .lerp(PRESSURE_HIGH, Math.min(1, p.total / PRESSURE_MAX));
      } else {
        color.copy(SILVER);
        if (shell.z[i] < solution.liquidHeight && caseId !== "dry")
          color.lerp(fluidColor, 0.28);
        const displacement = (d.radial / fields.peak) * phase;
        color.lerp(
          displacement >= 0 ? POSITIVE : NEGATIVE,
          Math.min(0.78, Math.abs(displacement) * 0.85),
        );
      }
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    shell.geometry.computeVertexNormals();
    const liquidPositions = liquid.geometry.getAttribute("position");
    for (let i = 0; i < liquid.z.length; i++) {
      const d = fields.fluidWall[i];
      const theta = liquid.angles[i];
      liquidPositions.setXYZ(
        i,
        liquid.original[i * 3] +
          (d.radial * Math.cos(theta) - d.tangential * Math.sin(theta)) *
            amplitude *
            SCALE,
        liquid.original[i * 3 + 1] + d.axial * amplitude * SCALE,
        liquid.original[i * 3 + 2] +
          (d.radial * Math.sin(theta) + d.tangential * Math.cos(theta)) *
            amplitude *
            SCALE,
      );
    }
    liquidPositions.needsUpdate = true;
    liquid.geometry.computeVertexNormals();
    const surfacePositions = surface.geometry.getAttribute("position");
    const surfaceColors = surface.geometry.getAttribute("color");
    for (let i = 0; i < surface.r.length; i++) {
      const eta = fields.eta[i];
      const height = Math.max(
        0,
        Math.min(TANK.height, solution.liquidHeight + eta * amplitude),
      );
      const fraction = surface.r[i] / Math.max(1e-12, solution.surfaceRadius);
      const r =
        fraction * (radiusAt(height) + fields.contact[i].radial * amplitude);
      surfacePositions.setXYZ(
        i,
        r * Math.cos(surface.angles[i]) * SCALE,
        BASE + height * SCALE,
        r * Math.sin(surface.angles[i]) * SCALE,
      );
      color
        .copy(fluidColor)
        .lerp(
          eta * phase >= 0 ? FLUID_HIGH : FLUID_LOW,
          Math.min(0.72, Math.abs((eta / fields.peak) * phase) * 0.75),
        );
      surfaceColors.setXYZ(i, color.r, color.g, color.b);
    }
    surfacePositions.needsUpdate = true;
    surfaceColors.needsUpdate = true;
    surface.geometry.computeVertexNormals();
  });
  const showLiquid = caseId !== "dry" && solution.liquidHeight > 0.001;
  return (
    <group>
      <mesh geometry={shell.geometry} castShadow receiveShadow renderOrder={2}>
        <meshStandardMaterial
          vertexColors
          metalness={0.52}
          roughness={0.37}
          side={DoubleSide}
          transparent={section || display === "Fluid motion"}
          opacity={display === "Fluid motion" ? 0.34 : section ? 0.89 : 1}
          depthWrite={display !== "Fluid motion"}
        />
      </mesh>
      {!compact && <Ghost section={section} />}
      {showLiquid && (
        <>
          <mesh geometry={liquid.geometry} renderOrder={1}>
            <meshStandardMaterial
              color={fluidColor}
              metalness={0.1}
              roughness={0.25}
              side={DoubleSide}
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>
          <mesh geometry={surface.geometry} renderOrder={3}>
            {display === "Fluid motion" ? (
              <meshBasicMaterial
                vertexColors
                side={DoubleSide}
                transparent
                opacity={0.92}
              />
            ) : (
              <meshStandardMaterial
                vertexColors
                metalness={0.1}
                roughness={0.5}
                side={DoubleSide}
                transparent
                opacity={0.83}
              />
            )}
          </mesh>
          <Line
            points={ring(solution.liquidHeight, false, 0.003)}
            color={solution.settings.fluid === "lox" ? "#9cebf3" : "#ccbfff"}
            transparent
            opacity={0.8}
            lineWidth={1.6}
          />
        </>
      )}
      {!compact && (
        <>
          <Annotation
            position={[-1.1, BASE + solution.liquidHeight * SCALE, 0]}
            text={
              caseId === "dry"
                ? "Dry reference\nFluid omitted"
                : `${(solution.settings.fill * 100).toFixed(0)}% volume fill\n${solution.liquidHeight.toFixed(2)} m liquid height`
            }
            color={solution.settings.fluid === "lox" ? "#9cebf3" : "#ccbfff"}
            offset={[-55, 0]}
          />
          <Annotation
            position={[0.7, BASE + TANK.height * SCALE + 0.22, 0]}
            text="Closed shell + domes / Ritz model"
            offset={[0, -15]}
          />
          {display !== "Pressure" && (
            <Annotation
              position={[1.2, 1.1, 0.25]}
              text={
                gain > 0
                  ? "Undeformed wire ghost\nModal motion amplified"
                  : "Undeformed wire ghost\nNo active eigenvector"
              }
              color="#c8d8d2"
              offset={[50, 5]}
            />
          )}
        </>
      )}
    </group>
  );
}

function FluidArrows({
  solution,
  mode,
  clock,
  gain,
}: {
  solution: Solution;
  mode: Mode;
  clock: RefObject<number>;
  gain: number;
}) {
  const arrows = useMemo(() => {
    const samples: {
      arrow: ArrowHelper;
      direction: Vector3;
      drawDirection: Vector3;
      length: number;
    }[] = [];
    // Four fixed angles alias high orders (all n = 12 samples had one phase).
    // Cartesian gradient components also contain n +/- 1, so use > 2(n + 1)
    // angles. Higher-n potential motion concentrates near the wetted wall.
    const highOrder = mode.n >= 4;
    const angularSamples = highOrder ? Math.max(12, 2 * mode.n + 3) : 4;
    const radialSamples = highOrder ? [0.65, 0.92] : [0.35, 0.7];
    for (const fraction of [0.28, 0.55, 0.82]) {
      const z = solution.liquidHeight * fraction;
      for (const ringFraction of radialSamples)
        for (let j = 0; j < angularSamples; j++) {
          const theta = highOrder
              ? ((j + 0.35) * Math.PI * 2) / angularSamples
              : Math.PI / 4 + (j * Math.PI) / 2,
            r = radiusAt(z) * ringFraction;
          const field = fluidDisplacement(solution, mode, r, z, theta);
          const direction = new Vector3(
            field.radial * Math.cos(theta) - field.tangential * Math.sin(theta),
            field.axial,
            field.radial * Math.sin(theta) + field.tangential * Math.cos(theta),
          );
          const length = direction.length();
          const arrow = new ArrowHelper(
            direction.clone().normalize(),
            new Vector3(
              r * Math.cos(theta) * SCALE,
              BASE + z * SCALE,
              r * Math.sin(theta) * SCALE,
            ),
            0.01,
            "#b9eef2",
            0.04,
            0.02,
          );
          arrow.visible = false;
          samples.push({
            arrow,
            direction: direction.normalize(),
            drawDirection: new Vector3(),
            length,
          });
        }
    }
    return samples;
  }, [solution, mode]);
  useEffect(
    () => () => arrows.forEach((sample) => sample.arrow.dispose()),
    [arrows],
  );
  useFrame(() => {
    const phase = Math.sin(clock.current),
      sign = phase < 0 ? -1 : 1;
    for (const sample of arrows) {
      const length = sample.length * 0.55 * gain * Math.abs(phase) * SCALE;
      sample.arrow.visible = length > 0.003;
      if (!sample.arrow.visible) continue;
      sample.arrow.setDirection(
        sample.drawDirection.copy(sample.direction).multiplyScalar(sign),
      );
      sample.arrow.setLength(
        length,
        Math.min(0.035, length * 0.4),
        Math.min(0.018, length * 0.2),
      );
    }
  });
  return (
    <group>
      {arrows.map((sample, i) => (
        <primitive key={i} object={sample.arrow} />
      ))}
      <Annotation
        position={[0, 1.5, 1.1]}
        text="Liquid modal displacement"
        color="#b9eef2"
      />
    </group>
  );
}

function PressureField({ solution }: { solution: Solution }) {
  const levels = [0.8, 4.2, 8.4, 12.6, 16.0];
  return (
    <group>
      {levels.flatMap((z, i) => {
        const r = radiusAt(z) * SCALE;
        const pressure = pressureAt(solution, z);
        const radialNormal = radiusAt(z) / (TANK.radius * TANK.radius);
        const axialNormal =
          z < TANK.domeDepth
            ? (z - TANK.domeDepth) / (TANK.domeDepth * TANK.domeDepth)
            : z > TANK.height - TANK.domeDepth
              ? (z - TANK.height + TANK.domeDepth) /
                (TANK.domeDepth * TANK.domeDepth)
              : 0;
        const normalLength = Math.hypot(radialNormal, axialNormal);
        return [
          { p: pressure.ullage, color: "#f6c58b", theta: 1.6 },
          { p: pressure.head, color: "#94dfe9", theta: 1.95 },
        ]
          .filter((component) => component.p > 0)
          .map((component, j) => {
            const { theta, color } = component;
            const length = (0.9 * component.p) / PRESSURE_MAX;
            const a: [number, number, number] = [
              r * Math.cos(theta),
              BASE + z * SCALE,
              r * Math.sin(theta),
            ];
            return (
              <Arrow
                key={`${i}-${j}`}
                start={a}
                end={[
                  a[0] +
                    ((length * radialNormal) / normalLength) * Math.cos(theta),
                  a[1] + (length * axialNormal) / normalLength,
                  a[2] +
                    ((length * radialNormal) / normalLength) * Math.sin(theta),
                ]}
                color={color}
              />
            );
          });
      })}
      {solution.settings.accelerationG > 0 && (
        <Arrow start={[2.12, 3.8, 0]} end={[2.12, 2.5, 0]} color="#a7dce2" />
      )}
      <Annotation
        position={[2.1, 4.03, 0]}
        text={`Effective liquid head\n${solution.settings.accelerationG.toFixed(2)} g ↓`}
        color="#a7dce2"
      />
      <Annotation
        position={[1.52, BASE + TANK.height * SCALE - 0.44, 0]}
        text={`Configured static pressure\nUllage: ${solution.settings.ullagePsi.toFixed(1)} psig`}
        color="#f6c58b"
        offset={[65, 0]}
      />
      <Annotation
        position={[1.3, 0.75, 0.5]}
        text={`Bottom liquid head: ${(solution.headPa / 1000).toFixed(0)} kPa\nTotal: ${(solution.bottomPa / 1000).toFixed(0)} kPa gauge`}
        color="#94dfe9"
        offset={[65, 0]}
      />
    </group>
  );
}

function Dimensions() {
  return (
    <group>
      <Line
        points={[
          [-1.72, BASE, -0.2],
          [-1.72, BASE + TANK.height * SCALE, -0.2],
        ]}
        color="#79939a"
        lineWidth={1}
      />
      {[BASE, BASE + TANK.height * SCALE].map((y) => (
        <Line
          key={y}
          points={[
            [-1.82, y, -0.2],
            [-1.6, y, -0.2],
          ]}
          color="#79939a"
          lineWidth={1}
        />
      ))}
      <Annotation
        position={[-1.78, 2.5, -0.2]}
        text={"16.8 m\ntotal height"}
        color="#abc2c5"
        offset={[-25, 0]}
      />
      <Line
        points={[
          [-1.05, 0.17, 1.32],
          [1.05, 0.17, 1.32],
        ]}
        color="#79939a"
        lineWidth={1}
      />
      <Annotation
        position={[0, 0.14, 1.34]}
        text="Ø 8.4 m · Al wall 6.35 mm"
        color="#abc2c5"
        offset={[0, 15]}
      />
    </group>
  );
}

function Laboratory() {
  return (
    <>
      <color attach="background" args={["#13262d"]} />
      <fog attach="fog" args={["#13262d", 16, 40]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[2, 8, 6]}
        intensity={3.2}
        color="#fff2db"
        castShadow
        shadow-bias={-0.001}
        shadow-normalBias={0.015}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <directionalLight
        position={[-5, 5, -3]}
        intensity={2.4}
        color="#a1d6e5"
      />
      <LabEnvironment variant="isolation" />
      <mesh position-y={-0.04} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color="#263a40" roughness={0.83} />
      </mesh>
      <gridHelper args={[40, 40, "#3a555b", "#2c4349"]} position-y={-0.025} />
      <mesh position={[0, 3.5, -6.8]} receiveShadow>
        <boxGeometry args={[28, 7, 0.16]} />
        <meshStandardMaterial color="#263a43" roughness={0.8} />
      </mesh>
      {[-9, -6, -3, 0, 3, 6, 9].map((x) => (
        <mesh key={x} position={[x, 3.5, -6.68]}>
          <boxGeometry args={[0.025, 7, 0.025]} />
          <meshStandardMaterial
            color="#486069"
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      ))}
      <mesh position={[0, 1.8, -6.66]}>
        <boxGeometry args={[24, 0.022, 0.035]} />
        <meshStandardMaterial color="#57727b" />
      </mesh>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[2.0, 2.05, 0.03, 96]} />
        <meshStandardMaterial
          color="#1b3037"
          metalness={0.45}
          roughness={0.5}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.034}>
        <ringGeometry args={[1.87, 1.89, 96]} />
        <meshBasicMaterial color="#5e7f85" side={DoubleSide} />
      </mesh>
    </>
  );
}

export default function World({
  solution,
  caseId,
  mode,
  display,
  paused,
  gain,
  view,
  revision,
}: {
  solution: Solution;
  caseId: CaseId;
  mode: Mode;
  display: Display;
  paused: boolean;
  gain: number;
  view: View;
  revision: number;
}) {
  const clock = useRef(Math.PI / 3);
  useFrame((_, dt) => {
    if (!paused && !document.hidden)
      clock.current += Math.min(dt, 0.05) * Math.PI * 0.8;
  });
  return (
    <>
      <Laboratory />
      <Article
        solution={solution}
        caseId={caseId}
        mode={mode}
        display={display}
        gain={gain}
        clock={clock}
        section={view === "Section" || display === "Fluid motion"}
      />
      <Dimensions />
      {display === "Fluid motion" &&
        gain > 0 &&
        solution.fluidActive &&
        (caseId === "mass" ||
          caseId === "combined" ||
          caseId === "coupled") && (
          <FluidArrows
            solution={solution}
            mode={mode}
            gain={gain}
            clock={clock}
          />
        )}
      {display === "Pressure" && <PressureField solution={solution} />}
      <CameraController
        presets={CAMERAS}
        view={view}
        revision={revision}
        responsive={framing}
        minDistance={4.4}
        maxDistance={15}
      />
    </>
  );
}

export function CryoPreview({ active = false }: { active?: boolean }) {
  const geometry = useMemo(() => makeShell(true), []);
  const surface = useMemo(() => makeSurface(4.2, 13.79), []);
  const color = useMemo(() => new Color("#adc8c9"), []);
  useEffect(() => () => geometry.geometry.dispose(), [geometry]);
  useEffect(() => () => surface.geometry.dispose(), [surface]);
  useMemo(() => {
    const c = geometry.geometry.getAttribute("color");
    for (let i = 0; i < c.count; i++) c.setXYZ(i, color.r, color.g, color.b);
  }, [geometry, color]);
  return (
    <group position-y={-2.5} rotation-y={active ? -0.06 : 0}>
      <mesh geometry={geometry.geometry}>
        <meshStandardMaterial
          vertexColors
          metalness={0.6}
          roughness={0.32}
          side={DoubleSide}
        />
      </mesh>
      <mesh geometry={surface.geometry}>
        <meshStandardMaterial
          color="#75dce8"
          metalness={0.25}
          roughness={0.15}
          side={DoubleSide}
        />
      </mesh>
      {[2.1, 8.4, 14.7].map((z) => (
        <Line
          key={z}
          points={ring(z, true, 0.005)}
          color="#dae8df"
          transparent
          opacity={0.37}
          lineWidth={1}
        />
      ))}
    </group>
  );
}
