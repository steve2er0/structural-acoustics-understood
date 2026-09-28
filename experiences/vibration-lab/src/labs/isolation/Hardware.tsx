import { highlightIntensity } from "@engine/highlight";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Line } from "@react-three/drei";
import * as THREE from "three";
import { sampleMotion, type Solution } from "./physics";
import { motionScale } from "./visualization";

const metal = { color: "#7e9091", metalness: 0.85, roughness: 0.28 };
export function Block({
  size,
  position = [0, 0, 0],
  color = "#29383c",
  metalness = 0.65,
  roughness = 0.3,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  color?: string;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <RoundedBox
      args={size}
      position={position}
      radius={0.045}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
      />
    </RoundedBox>
  );
}
function Bolt({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.055, 6]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.045, 0.005, 0.012]} />
        <meshBasicMaterial color="#172024" />
      </mesh>
    </group>
  );
}
function HardwareLabel() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#d1d5c9";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#182428";
    ctx.font = "bold 60px sans-serif";
    ctx.fillText("INERTIAL SYSTEMS", 32, 82);
    ctx.font = "28px monospace";
    ctx.fillText("AVIONICS PAYLOAD   /   VI–025", 34, 138);
    ctx.fillText("VERTICAL AXIS      •   4 MOUNTS", 34, 192);
    for (let i = 0; i < 40; i++)
      ctx.fillRect(590 + i * 3, 167, i % 3 ? 1 : 2, 48);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[-0.46, -0.07, 1.167]}>
      <planeGeometry args={[1.75, 0.58]} />
      <meshStandardMaterial map={texture} roughness={0.6} metalness={0.1} />
    </mesh>
  );
}
export function Payload() {
  return (
    <group>
      <Block size={[3.65, 1.18, 2.3]} color="#7c8e8e" roughness={0.31} />
      <Block
        size={[3.84, 0.13, 2.47]}
        position={[0, -0.59, 0]}
        color="#9aada9"
      />
      <Block
        size={[3.76, 0.09, 2.38]}
        position={[0, 0.59, 0]}
        color="#b8c5bb"
      />
      {/* Extruded cooling fins, captive screws, end plates, and connector sockets give the payload scale. */}
      {Array.from({ length: 16 }, (_, i) => (
        <Block
          key={i}
          size={[0.075, 0.17, 1.92]}
          position={[-1.5 + i * 0.2, 0.715, 0]}
          color="#9eafa6"
        />
      ))}
      {[-1, 1].map((x) => (
        <group key={x} position={[x * 1.85, 0, 0]}>
          <Block size={[0.055, 1.1, 2.25]} color="#3b4c50" />
          {[-0.78, 0.78].map((z) => (
            <group key={z} position={[x * 0.035, 0, z]}>
              <Block size={[0.13, 0.8, 0.08]} color="#17262c" />
            </group>
          ))}
        </group>
      ))}
      {[-1.67, 1.67].flatMap((x) =>
        [-1, 1].map((z) => <Bolt key={`${x},${z}`} position={[x, 0.655, z]} />),
      )}
      <HardwareLabel />
      {[0.85, 1.4].map((x, i) => (
        <group
          key={x}
          position={[x, 0.02, 1.18]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <mesh castShadow>
            <cylinderGeometry args={[0.17, 0.17, 0.14, 24]} />
            <meshStandardMaterial
              color="#657f7c"
              metalness={0.85}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
            <meshStandardMaterial color="#0c1418" />
          </mesh>
          {Array.from({ length: i ? 3 : 5 }, (_, n) => (
            <mesh
              key={n}
              position={[
                Math.cos(n * 2.1) * 0.06,
                -0.098,
                Math.sin(n * 2.1) * 0.06,
              ]}
            >
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshStandardMaterial
                color="#d0b876"
                metalness={0.9}
                roughness={0.3}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[-1.45, 0.28, 1.166]}>
        <circleGeometry args={[0.025, 12]} />
        <meshBasicMaterial color="#b4ffcf" />
      </mesh>
    </group>
  );
}
function Armature() {
  return (
    <group>
      <mesh position={[0, -0.44, 0]} castShadow>
        <cylinderGeometry args={[2.8, 2.8, 0.74, 64]} />
        <meshStandardMaterial
          color="#8a9b95"
          metalness={0.88}
          roughness={0.22}
        />
      </mesh>
      {/* The circular shaker table clears the fixture's 3.11-unit corner radius. */}
      <mesh position={[0, -0.13, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.35, 3.35, 0.18, 96]} />
        <meshStandardMaterial
          color="#8c9c96"
          metalness={0.86}
          roughness={0.28}
        />
      </mesh>
      <mesh position={[0, -0.038, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[3.24, 3.255, 96]} />
        <meshStandardMaterial
          color="#344c4e"
          metalness={0.7}
          roughness={0.35}
        />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * Math.PI) / 12;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 3.17, -0.035, Math.cos(a) * 3.17]}
            rotation-x={-Math.PI / 2}
          >
            <circleGeometry args={[0.035, 12]} />
            <meshStandardMaterial color="#1a2c2d" roughness={0.85} />
          </mesh>
        );
      })}
      <Block size={[4.9, 0.26, 3.75]} color="#23363c" roughness={0.26} />
      <Block
        size={[4.94, 0.025, 3.79]}
        position={[0, -0.06, 0]}
        color="#617c7f"
      />
      <Block size={[4.6, 0.1, 3.5]} position={[0, -0.17, 0]} color="#142429" />
      {[-2.2, 2.2].flatMap((x) =>
        [-1.6, 1.6].map((z) => (
          <Bolt key={`${x},${z}`} position={[x, 0.154, z]} scale={1.25} />
        )),
      )}
      {[-2.25, 2.25].map((x) => (
        <group key={x} position={[x, 0.138, 0]}>
          {Array.from({ length: 14 }, (_, i) => (
            <mesh key={i} position={[0, 0, -1.3 + i * 0.2]}>
              <boxGeometry args={[i % 5 === 0 ? 0.18 : 0.09, 0.005, 0.011]} />
              <meshBasicMaterial color="#6a8888" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.01, 1.89]}>
        <boxGeometry args={[1.15, 0.025, 0.015]} />
        <meshBasicMaterial color="#9ce2d0" />
      </mesh>
    </group>
  );
}
function Mount({
  x,
  z,
  solution,
  theta,
  exploded,
  flow,
}: {
  x: number;
  z: number;
  solution: Solution;
  theta: React.RefObject<number>;
  exploded: React.RefObject<number>;
  flow: boolean;
}) {
  const mount = useRef<THREE.Group>(null);
  const flowGroup = useRef<THREE.Group>(null);
  const spring = useMemo(() => {
    const points = Array.from({ length: 200 }, (_, i) => {
      const t = i / 199;
      const angle = t * 6 * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(angle) * 0.23,
        0.15 + t * 0.62,
        Math.sin(angle) * 0.23,
      );
    });
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      200,
      0.041,
      8,
      false,
    );
  }, []);
  useEffect(() => () => spring.dispose(), [spring]);
  useFrame(() => {
    if (!mount.current) return;
    const physical = sampleMotion(solution, theta.current);
    const scale = motionScale(solution).worldUnitsPerMeter;
    const y = physical.base * scale,
      dx = physical.payload * scale;
    mount.current.position.set(x, 0.62 + y + exploded.current * 0.68, z);
    mount.current.scale.y = (0.93 + dx - y) / 0.93;
    if (flowGroup.current) {
      // Arrows show the net force on the payload, not particle velocity or energy flow.
      const signed = physical.forceOnPayload / (solution.force || 1);
      const strength = Math.min(1, solution.T / 6.5);
      flowGroup.current.scale.setScalar(0.55 + 0.65 * Math.sqrt(strength));
      flowGroup.current.rotation.z = signed < 0 ? Math.PI : 0;
      flowGroup.current.position.y = 0.46 + Math.sin(theta.current) * 0.025;
      flowGroup.current.visible = flow && Math.abs(signed) > 0.08;
      flowGroup.current.children.forEach((child) => {
        const material = (child as THREE.Mesh)
          .material as THREE.MeshBasicMaterial;
        material.opacity =
          (0.13 + 0.87 * Math.sqrt(strength)) * Math.abs(signed);
      });
    }
  });
  return (
    <group ref={mount} position={[x, 0.62, z]}>
      {[0.06, 0.85].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <Block size={[0.7, 0.1, 0.62]} color="#415a5b" />
          <mesh castShadow position={[0, y > 0.5 ? -0.025 : 0.055, 0]}>
            <cylinderGeometry args={[0.31, 0.31, 0.08, 32]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          {[-0.26, 0.26].map((bx) => (
            <Bolt key={bx} position={[bx, 0.065, 0]} scale={0.7} />
          ))}
        </group>
      ))}
      <mesh castShadow geometry={spring}>
        <meshStandardMaterial
          color="#bfad83"
          emissive="#b5d9c0"
          emissiveIntensity={highlightIntensity(0, flow)}
          metalness={0.82}
          roughness={0.28}
        />
      </mesh>
      <mesh castShadow position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.47, 24]} />
        <meshStandardMaterial
          color="#314a4a"
          metalness={0.75}
          roughness={0.2}
        />
      </mesh>
      <mesh castShadow position={[0, 0.64, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.35, 16]} />
        <meshStandardMaterial color="#d3d8c8" metalness={1} roughness={0.1} />
      </mesh>
      <group ref={flowGroup} position={[0.38, 0.46, 0.05]} visible={flow}>
        <mesh>
          <cylinderGeometry args={[0.022, 0.022, 0.43, 8]} />
          <meshBasicMaterial color="#b4ffce" transparent depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <coneGeometry args={[0.075, 0.15, 12]} />
          <meshBasicMaterial color="#b4ffce" transparent depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
export function Assembly({
  solution,
  theta,
  explosion,
  forceFlow,
  envelope,
}: {
  solution: Solution;
  theta: React.RefObject<number>;
  explosion: React.RefObject<number>;
  forceFlow: boolean;
  envelope: boolean;
}) {
  const payload = useRef<THREE.Group>(null);
  const base = useRef<THREE.Group>(null);
  const envelopeRef = useRef<THREE.Group>(null);
  const bounds =
    solution.payloadAmplitude * motionScale(solution).worldUnitsPerMeter;
  useFrame(() => {
    const state = sampleMotion(solution, theta.current);
    const scale = motionScale(solution).worldUnitsPerMeter;
    if (payload.current)
      payload.current.position.y =
        2.14 + state.payload * scale + explosion.current * 1.7;
    if (base.current) base.current.position.y = 0.48 + state.base * scale;
    if (envelopeRef.current)
      envelopeRef.current.position.y = 2.14 + explosion.current * 1.7;
  });
  return (
    <group>
      <group ref={base} position={[0, 0.48, 0]}>
        <Armature />
      </group>
      <group ref={payload} position={[0, 2.14, 0]}>
        <Payload />
      </group>
      {[-1.5, 1.5].flatMap((x) =>
        [-0.97, 0.97].map((z) => (
          <Mount
            key={`${x},${z}`}
            x={x}
            z={z}
            solution={solution}
            theta={theta}
            exploded={explosion}
            flow={forceFlow}
          />
        )),
      )}
      {envelope && (
        <group ref={envelopeRef} position={[0, 2.14, 0]}>
          <mesh>
            <boxGeometry args={[3.92, 1.44 + 2 * bounds, 2.58]} />
            <meshBasicMaterial
              color="#b5eac9"
              transparent
              opacity={0.055}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {[-1, 1].map((sign) => (
            <Line
              key={sign}
              points={[
                [-1.96, sign * (0.72 + bounds), -1.29],
                [1.96, sign * (0.72 + bounds), -1.29],
                [1.96, sign * (0.72 + bounds), 1.29],
                [-1.96, sign * (0.72 + bounds), 1.29],
                [-1.96, sign * (0.72 + bounds), -1.29],
              ]}
              color="#b5eac9"
              lineWidth={1}
              transparent
              opacity={0.55}
            />
          ))}
        </group>
      )}
    </group>
  );
}
