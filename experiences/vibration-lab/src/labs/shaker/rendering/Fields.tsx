import { EngineeringVectorObject } from "@engine/EngineeringVector";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sampleSolution, type Solution } from "../shaker-model/model";
import { localDirections } from "../physics/electromechanics";
import type { AnimationClock } from "../animation/motion";
import type { CameraView, Display, Lesson } from "../animation/state";
import type { MachinePose } from "./Machine";
import { radial } from "./geometry";

export const VECTOR_COLORS = {
  B: "#b6efbd",
  I: "#8fd9f2",
  F: "#ffc387",
  v: "#ceb9ff",
  suspension: "#b5c8b7",
  inertia: "#dfb4e3",
  payload: "#e5d7a7",
};
const up = new THREE.Vector3(0, 1, 0);
function fluxPath(angle: number, offset: number) {
  const points = [
    [0.39 + offset, -1.18],
    [0.39 + offset, 0.84],
    [0.52 + offset, 1.04],
    [1.75, 1.04],
    [1.98, 0.84],
    [1.98, -0.98],
    [1.8, -1.18],
  ].map(([r, y]) => new THREE.Vector3(...radial(r, y + offset * 0.2, angle)));
  return new THREE.CatmullRomCurve3(points, true, "centripetal", 0.2);
}
export default function Fields({
  solution,
  clock,
  pose,
  lesson,
  display,
  cameraView,
}: {
  solution: Solution;
  clock: RefObject<AnimationClock>;
  pose: RefObject<MachinePose>;
  lesson: Lesson;
  display: Display;
  cameraView: CameraView;
}) {
  const fluxGroup = useRef<THREE.Group>(null);
  const paths = useMemo(
    () =>
      [1.925, 6.1, 3.8].flatMap((a) =>
        [-0.075, 0, 0.075].map((o) => fluxPath(a, o)),
      ),
    [],
  );
  const tubes = useMemo(
    () => paths.map((p) => new THREE.TubeGeometry(p, 128, 0.009, 4, true)),
    [paths],
  );
  const fluxMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: VECTOR_COLORS.B,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );
  const dots = useRef<(THREE.Mesh | null)[]>([]),
    currentDots = useRef<(THREE.Mesh | null)[]>([]);
  const vectors = useMemo(
    () =>
      ["B", "I", "F", "v", "F", "S", "−mₐa", "−mₚa", "e"].map(
        (label, i) =>
          new EngineeringVectorObject(
            [
              VECTOR_COLORS.B,
              VECTOR_COLORS.I,
              VECTOR_COLORS.F,
              VECTOR_COLORS.v,
              VECTOR_COLORS.F,
              VECTOR_COLORS.suspension,
              VECTOR_COLORS.inertia,
              VECTOR_COLORS.payload,
              VECTOR_COLORS.I,
            ][i],
            label,
          ),
      ),
    [],
  );
  useEffect(
    () => () => {
      vectors.forEach((v) => v.dispose());
      tubes.forEach((t) => t.dispose());
      fluxMaterial.dispose();
    },
    [vectors, tubes, fluxMaterial],
  );
  const around = useRef(0),
    lastElapsed = useRef(0);
  useFrame((_, dt) => {
    const state = sampleSolution(solution, clock.current.theta),
      field = solution.field.B / 1.2;
    const show = display !== "assembled" && display !== "exploded";
    const showFlux = show && (lesson === "field" || display === "circuit");
    fluxMaterial.opacity = THREE.MathUtils.damp(
      fluxMaterial.opacity,
      showFlux ? field * 0.6 : 0,
      6,
      Math.min(dt, 0.05),
    );
    if (fluxGroup.current)
      fluxGroup.current.visible = fluxMaterial.opacity > 0.002;
    dots.current.forEach((dot, i) => {
      if (!dot) return;
      const path = paths[Math.floor(i / 3)];
      dot.position.copy(
        path.getPointAt((clock.current.elapsed * 0.16 + (i % 3) / 3) % 1),
      );
      dot.visible = field > 0.001;
    });
    const y = 1.02 + pose.current.displacement;
    // Positive conventional drive current travels in decreasing azimuth: tangent × outward B = +Y.
    const playbackDelta = clock.current.elapsed - lastElapsed.current;
    lastElapsed.current = clock.current.elapsed;
    around.current -= (state.current / 60) * playbackDelta * 4;
    currentDots.current.forEach((dot, i) => {
      if (!dot) return;
      dot.visible = show && Math.abs(state.current) > 0.03;
      dot.position.set(...radial(1.12, y, around.current + (i * Math.PI) / 4));
    });
    const angle = 1.55,
      dirs = localDirections(angle, state.current < 0 ? -1 : 1);
    const setArrow = (
      index: number,
      origin: THREE.Vector3,
      direction: THREE.Vector3,
      length: number,
      visible: boolean,
    ) => {
      const physicalValues = [
        solution.field.B,
        state.current,
        state.force,
        state.v,
        state.force,
        state.suspension,
        state.armatureInertia,
        state.payloadReaction,
        state.emf,
      ];
      vectors[index].sample({
        origin,
        direction,
        physicalValue: physicalValues[index],
        visualLength: length,
        visible,
      });
    };
    const bif =
      show && (lesson === "force" || lesson === "motion" || lesson === "emf");
    setArrow(
      0,
      new THREE.Vector3(...radial(0.86, y, angle)),
      new THREE.Vector3(...dirs.B),
      0.83 * field,
      bif && field > 0,
    );
    setArrow(
      1,
      new THREE.Vector3(...radial(1.13, y, angle)),
      new THREE.Vector3(...dirs.I),
      0.64,
      bif && lesson !== "emf" && Math.abs(state.current) > 0.03,
    );
    setArrow(
      2,
      new THREE.Vector3(...radial(1.34, y, angle)),
      up.clone().multiplyScalar(Math.sign(state.force) || 1),
      0.7 *
        Math.sqrt(
          Math.abs(state.force) / Math.max(1, Math.abs(solution.force)),
        ),
      bif && lesson !== "emf" && Math.abs(state.force) > 0.1,
    );
    setArrow(
      3,
      new THREE.Vector3(...radial(1.5, y, angle)),
      up.clone().multiplyScalar(Math.sign(state.v) || 1),
      (0.76 * Math.abs(state.v)) / Math.max(1e-12, solution.velocityPeak),
      show && lesson === "emf" && Math.abs(state.v) > 1e-10,
    );
    // Motional emf points along v × B, opposite positive drive-current direction for +Y velocity.
    setArrow(
      8,
      new THREE.Vector3(...radial(1.13, y - 0.23, angle)),
      new THREE.Vector3(...localDirections(angle, 1).I).multiplyScalar(
        -Math.sign(state.v) || 1,
      ),
      (0.65 * Math.abs(state.emf)) / Math.max(1e-12, solution.emfPeak),
      show && lesson === "emf" && Math.abs(state.emf) > 0.001,
    );
    const forces = [
      state.force,
      state.suspension,
      state.armatureInertia,
      state.payloadReaction,
    ];
    const maximum = Math.max(1, ...forces.map(Math.abs));
    forces.forEach((force, i) =>
      setArrow(
        i + 4,
        new THREE.Vector3(
          -0.9 + i * 0.6,
          2.57 + pose.current.displacement,
          1.05,
        ),
        up.clone().multiplyScalar(Math.sign(force) || 1),
        (0.84 * Math.abs(force)) / maximum,
        show &&
          lesson === "force" &&
          ["System", "Cutaway"].includes(cameraView) &&
          Math.abs(force) > 0.1,
      ),
    );
  });
  return (
    <group>
      <group ref={fluxGroup}>
        {tubes.map((tube, i) => (
          <mesh
            key={i}
            geometry={tube}
            material={fluxMaterial}
            renderOrder={9}
          />
        ))}
        {Array.from({ length: 27 }, (_, i) => (
          <mesh
            key={i}
            ref={(n) => {
              dots.current[i] = n;
            }}
            renderOrder={10}
          >
            <sphereGeometry args={[0.026, 7, 6]} />
            <meshBasicMaterial
              color={VECTOR_COLORS.B}
              depthTest={false}
              transparent
              opacity={0.75}
            />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          ref={(n) => {
            currentDots.current[i] = n;
          }}
          renderOrder={11}
        >
          <sphereGeometry args={[0.038, 8, 6]} />
          <meshBasicMaterial color={VECTOR_COLORS.I} depthTest={true} />
        </mesh>
      ))}
      {vectors.map((vector, i) => (
        <primitive key={i} object={vector} />
      ))}
    </group>
  );
}
