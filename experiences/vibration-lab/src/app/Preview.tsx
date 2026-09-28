import { Engine as RS25Engine } from "../labs/rs25/Engine";
import { LongitudinalCore } from "../labs/vortex/Scene";
import { Vehicle as VortexVehicle } from "../labs/vortex/Vehicle";
import {
  DEFAULT as VORTEX_DEFAULT,
  solve as solveVortex,
} from "../labs/vortex/physics";
import type { LabDefinition } from "./labs";
import type { Playback } from "../labs/rs25/simulation";
import { Assembly as SEAAssembly } from "../labs/sea/Assembly";
import {
  DEFAULT as SEA_DEFAULT,
  createModel as createSEA,
} from "../labs/sea/physics";
import type { Simulation as SEASimulation } from "../labs/sea/simulation";
import { Sensor } from "../labs/accelerometer/Sensor";
import { PlateArticle } from "../labs/modal/Scene";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { LabCanvas, LabEnvironment, SceneBoundary } from "@engine/Scene";
import { Assembly } from "../labs/isolation/Hardware";
import { Shaker } from "../labs/isolation/Instruments";
import { ASSEMBLY } from "../labs/isolation/scene-layout";
import {
  DEFAULTS as ISOLATION,
  solve as solveIsolation,
} from "../labs/isolation/physics";
import Machine, { type MachinePose } from "../labs/shaker/rendering/Machine";
import {
  DEFAULTS as SHAKER,
  solve as solveShaker,
} from "../labs/shaker/shaker-model/model";
import type { AnimationClock } from "../labs/shaker/animation/motion";
function Model({ lab, active }: { lab: LabDefinition["id"]; active: boolean }) {
  const rsLive = useRef<Playback>({
    shaftTurns: 0,
    cavityCycles: 0,
    cavityOrder: 6.55,
    time: 0,
    phase: 8,
    running: true,
    paused: !active,
    power: 100,
    ambient: 101325,
  });
  rsLive.current.paused = !active;
  const seaModel = useMemo(() => createSEA(SEA_DEFAULT), []);
  const vortexModel = useMemo(() => solveVortex(VORTEX_DEFAULT), []);
  const seaLive = useRef<SEASimulation>({
    energy: seaModel.steady,
    time: 0,
    motionTime: 0,
    history: [],
  });
  const theta = useRef(0),
    explosion = useRef(0),
    clock = useRef<AnimationClock>({ theta: 0, elapsed: 0 });
  const pose = useRef<MachinePose>({
    displacement: 0,
    explosion: 0,
    cut: 1,
    circuit: 0,
  });
  const isolation = useMemo(
    () => solveIsolation({ ...ISOLATION, frequency: 25 }),
    [],
  );
  const shaker = useMemo(
    () => solveShaker({ ...SHAKER, fieldPercent: 100, manualPercent: 35 }),
    [],
  );
  useFrame((_, dt) => {
    if (active && !document.hidden) {
      rsLive.current.time += Math.min(dt, 0.05);
      seaLive.current.motionTime += Math.min(dt, 0.05);
      theta.current += Math.min(dt, 0.05) * 4;
      clock.current.elapsed += Math.min(dt, 0.05);
    }
  });
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 7, 5]} intensity={3} color="#fff1d9" />
      <directionalLight position={[-4, 3, 1]} intensity={2} color="#b3d1db" />
      <LabEnvironment />
      {lab === "vortex" ? (
        <group scale={0.54} position-y={0.1} rotation-z={-0.2}>
          <VortexVehicle model={vortexModel} />
          {[0, 1].map((side) => (
            <LongitudinalCore
              key={side}
              model={vortexModel}
              body={vortexModel.bodies[0]}
              side={side}
            />
          ))}
        </group>
      ) : lab === "rs25" ? (
        <group scale={0.85} position={[0, 0.1, 0]}>
          <RS25Engine live={rsLive} compact />
        </group>
      ) : lab === "sea" ? (
        <group scale={1.05} rotation-z={-Math.PI / 2}>
          <SEAAssembly model={seaModel} live={seaLive} />
        </group>
      ) : lab === "isolation" ? (
        <>
          <Shaker solution={isolation} theta={theta} />
          <group position={[0, ASSEMBLY.lift, 0]} scale={ASSEMBLY.scale}>
            <Assembly
              solution={isolation}
              theta={theta}
              explosion={explosion}
              forceFlow={false}
              envelope={false}
            />
          </group>
        </>
      ) : lab === "accelerometer" ? (
        <group position={[0, -0.7, 0]} scale={1.5}>
          <Sensor display="Cutaway" compact />
        </group>
      ) : lab === "modal" ? (
        <PlateArticle mode={2} animate={active} />
      ) : (
        <Machine
          solution={shaker}
          clock={clock}
          pose={pose}
          display="cutaway"
          lesson="field"
        />
      )}
    </>
  );
}
export default function Preview({
  lab,
  active,
}: {
  lab: LabDefinition["id"];
  active: boolean;
}) {
  return (
    <SceneBoundary>
      <LabCanvas
        frameloop={active ? "always" : "demand"}
        dpr={[1, 1.25]}
        shadows={false}
        camera={{ position: [8, 5.2, 10], fov: 32 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.7, 0)}
        aria-hidden="true"
      >
        <Model lab={lab} active={active} />
      </LabCanvas>
    </SceneBoundary>
  );
}
