import { memo, useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { CatmullRomCurve3, Group, Mesh, TubeGeometry, Vector3 } from "three";
import { LabEnvironment } from "@engine/Scene";
import {
  CameraController,
  type CameraPreset,
  type CameraPresets,
} from "@engine/Camera";
import {
  SCALE,
  CONVECTION,
  MIDBODY,
  longitudinalPath,
  swirlPoint,
  sourceY,
  pathLength,
  pairVisibility,
  type Body,
  type Model,
  type Point,
} from "./physics";
import type { Clock } from "./simulation";
import { Vehicle } from "./Vehicle";
export type View = "Vehicle" | "Cross-section" | "Wake";
export const CAMERAS: CameraPresets<View> = {
  Vehicle: { position: [8, 5, 24], target: [0, -0.8, 0.5] },
  "Cross-section": { position: [0, 7, 0.03], target: [0, 0, 0] },
  Wake: { position: [7, 3, 18], target: [0, -2.6, 0.7] },
};
function framing(p: CameraPreset, _view: View, width: number): CameraPreset {
  const factor = width < 500 ? 1.08 : 1;
  return {
    position: p.position.map(
      (x, i) => p.target[i] + (x - p.target[i]) * factor,
    ) as Point,
    target: p.target,
  };
}
export const COLORS = ["#efae79", "#72daca"];
const scaled = (p: Point): Point => p.map((v) => v * SCALE) as Point;
/** Continuous cores with helical tracer paths; the pattern is steady while fluid moves aft. */
export function LongitudinalCore({
  model,
  body,
  side,
  selected = true,
  live,
}: {
  model: Model;
  body: Body;
  side: number;
  selected?: boolean;
  live?: RefObject<Clock>;
}) {
  const particles = useRef<Group>(null);
  const length = pathLength(body);
  const paths = useMemo(() => {
    const center = Array.from({ length: 121 }, (_, i) =>
      scaled(longitudinalPath(model, body, side, (length * i) / 120)),
    );
    const helices = [0, Math.PI].map((offset) =>
      Array.from({ length: 241 }, (_, i) =>
        scaled(swirlPoint(model, body, side, (length * i) / 240, offset)),
      ),
    );
    const shell = new TubeGeometry(
      new CatmullRomCurve3(center.map((p) => new Vector3(...p))),
      120,
      body.diameter * SCALE * 0.1,
      12,
      false,
    );
    return { center, helices, shell };
  }, [model, body, side, length]);
  useEffect(() => () => paths.shell.dispose(), [paths]);
  useFrame(() => {
    if (!particles.current || !live) return;
    particles.current.children.forEach((child, i) => {
      const s = (live.current.travel + (i * length) / 18) % length;
      child.position.set(
        ...scaled(swirlPoint(model, body, side, s, i % 2 ? Math.PI : 0)),
      );
      child.scale.setScalar(Math.min(1, s / 3, (length - s) / 4));
    });
  });
  const strength = pairVisibility(model) * (selected ? 1 : 0.75);
  if (!strength) return null;
  return (
    <group>
      <mesh geometry={paths.shell}>
        <meshBasicMaterial
          color={COLORS[side]}
          transparent
          opacity={0.14 * strength}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={paths.center}
        color={COLORS[side]}
        transparent
        opacity={strength * 0.95}
        lineWidth={2}
      />
      {paths.helices.map((points, i) => (
        <Line
          key={i}
          points={points}
          color={COLORS[side]}
          transparent
          opacity={strength * 0.7}
          lineWidth={1.3}
        />
      ))}
      {live && (
        <group ref={particles}>
          {Array.from({ length: 18 }, (_, i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.045, 8, 6]} />
              <meshBasicMaterial
                color={COLORS[side]}
                transparent
                opacity={strength}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
function SlicePair({
  model,
  body,
  side,
  live,
  selected,
}: {
  model: Model;
  body: Body;
  side: number;
  live: RefObject<Clock>;
  selected: boolean;
}) {
  const dot = useRef<Mesh>(null);
  const center = scaled(
    longitudinalPath(model, body, side, sourceY(body) - MIDBODY),
  );
  center[1] = 0.2;
  const radius = body.diameter * SCALE * 0.105;
  const circle = useMemo(
    () =>
      Array.from({ length: 51 }, (_, i): Point => [
        center[0] + radius * Math.cos((i / 50) * Math.PI * 2),
        0.2,
        center[2] + radius * Math.sin((i / 50) * Math.PI * 2),
      ]),
    [center[0], center[2], radius],
  );
  useFrame(() => {
    const theta =
      ((side ? -1 : 1) * 2 * Math.PI * live.current.travel) /
      (body.diameter * 3.2);
    dot.current?.position.set(
      center[0] + radius * Math.cos(theta),
      0.23,
      center[2] + radius * Math.sin(theta),
    );
  });
  const strength = pairVisibility(model) * (selected ? 1 : 0.5);
  if (!strength) return null;
  return (
    <group>
      <Line
        points={circle}
        color={COLORS[side]}
        lineWidth={1.6}
        transparent
        opacity={strength}
      />
      <mesh position={center} rotation-x={Math.PI / 2}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial
          color={COLORS[side]}
          transparent
          opacity={0.12 * strength}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={dot}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshBasicMaterial color={COLORS[side]} />
      </mesh>
    </group>
  );
}
/** Free-stream lanes use the entire relative-air vector, including its axial component. */
function FlowTracers({
  model,
  live,
}: {
  model: Model;
  live: RefObject<Clock>;
}) {
  const particles = useRef<Group>(null);
  const lanes = useMemo(
    () =>
      [-1, 1].flatMap((side) =>
        [-1.1, 1.1].map((radial) => {
          const start = new Vector3(
            model.tangent[0] * side * 3.1 + model.normal[0] * radial,
            8,
            model.tangent[1] * side * 3.1 + model.normal[1] * radial,
          );
          const direction = new Vector3(...model.flow);
          return {
            start,
            direction,
            points: [
              start.toArray(),
              start.clone().addScaledVector(direction, 17).toArray(),
            ] as Point[],
          };
        }),
      ),
    [model],
  );
  useFrame(() => {
    if (!particles.current) return;
    // travel integrates axial distance; recover full-flow distance for these straight lanes.
    const fullTravel =
      (live.current.travel * SCALE) /
      (CONVECTION * Math.max(0.25, -model.flow[1]));
    particles.current.children.forEach((child, i) => {
      const lane = lanes[Math.floor(i / 6)];
      const t = (fullTravel + ((i % 6) * 17) / 6) % 17;
      child.position.copy(lane.start).addScaledVector(lane.direction, t);
    });
  });
  if (!model.speed) return null;
  return (
    <group>
      {lanes.map((lane, i) => (
        <group key={i}>
          <Line
            points={lane.points}
            color="#80baee"
            transparent
            opacity={0.14}
            lineWidth={0.7}
          />
          <arrowHelper
            args={[
              lane.direction,
              lane.start.clone().addScaledVector(lane.direction, 1),
              2.1,
              "#80baee",
              0.28,
              0.11,
            ]}
          />
        </group>
      ))}
      <group ref={particles}>
        {Array.from({ length: 24 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.025, 6, 4]} />
            <meshBasicMaterial color="#80baee" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function World({
  model,
  live,
  selected,
  onSelect,
  view,
  revision,
  wakes,
}: {
  model: Model;
  live: RefObject<Clock>;
  selected: number;
  onSelect: (index: number) => void;
  view: View;
  revision: number;
  wakes: boolean;
}) {
  const slice = view === "Cross-section";
  return (
    <>
      <color attach="background" args={["#14262e"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 10, 8]} intensity={3.5} color="#f4ead7" />
      <directionalLight
        position={[-5, 4, -4]}
        intensity={2.5}
        color="#b4d4ef"
      />
      <LabEnvironment />
      {slice && (
        <gridHelper args={[20, 20, "#2a4955", "#203a46"]} position-y={-0.13} />
      )}
      <Vehicle
        model={model}
        selected={selected}
        onSelect={onSelect}
        slice={slice}
      />
      {wakes &&
        model.bodies.flatMap((body) =>
          [0, 1].map((side) =>
            slice ? (
              <SlicePair
                key={`${body.index}-${side}`}
                model={model}
                body={body}
                side={side}
                live={live}
                selected={selected === body.index}
              />
            ) : (
              <LongitudinalCore
                key={`${body.index}-${side}`}
                model={model}
                body={body}
                side={side}
                live={live}
                selected={selected === body.index}
              />
            ),
          ),
        )}
      {!slice && <FlowTracers model={model} live={live} />}
      <CameraController
        presets={CAMERAS}
        view={view}
        revision={revision}
        responsive={framing}
        minDistance={5}
        maxDistance={44}
        minPolar={0.00001}
      />
    </>
  );
}
export default memo(World);
