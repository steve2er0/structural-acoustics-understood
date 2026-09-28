import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Block } from "./Hardware";
import { sampleMotion, type Solution } from "./physics";
import { motionScale } from "./visualization";

import { ASSEMBLY, GENERATOR, SHAKER } from "./scene-layout";

function Nameplate() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 192;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#c4cabd";
    c.fillRect(0, 0, 768, 192);
    c.fillStyle = "#1d302e";
    c.font = "bold 40px sans-serif";
    c.fillText("ELECTRODYNAMIC SHAKER", 30, 64);
    c.font = "25px monospace";
    c.fillText("VERTICAL DRIVE   /   FIXED HOUSING", 30, 119);
    c.fillStyle = "#a56435";
    c.fillRect(30, 147, 706, 6);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 0.05, 2.246]}>
      <planeGeometry args={[1.55, 0.3875]} />
      <meshStandardMaterial map={texture} roughness={0.6} />
    </mesh>
  );
}

/** A stationary field assembly and a compliant dust boot around the moving armature.
 * The boot spans the actual displayed base displacement; the housing never moves.
 */
export function Shaker({
  solution,
  theta,
}: {
  solution: Solution;
  theta: React.RefObject<number>;
}) {
  const boot = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!boot.current) return;
    const travel =
      sampleMotion(solution, theta.current).base *
      motionScale(solution).worldUnitsPerMeter *
      ASSEMBLY.scale;
    const height = SHAKER.bootHeight + travel;
    boot.current.position.y = SHAKER.lip + height / 2;
    boot.current.scale.y = height;
  });
  return (
    <group>
      <Block
        size={[5.65, 0.22, 5.1]}
        position={[0, -1.47, 0]}
        color="#202e49"
        roughness={0.55}
      />
      {[-2.37, 2.37].flatMap((x) =>
        [-2.08, 2.08].map((z) => (
          <Block
            key={`${x},${z}`}
            size={[0.5, 0.18, 0.5]}
            position={[x, -1.67, z]}
            color="#17212a"
            roughness={0.9}
          />
        )),
      )}
      {/* A tall stationary field housing and trunnion cradle, as in the reference lab. */}
      <mesh position={[0, (SHAKER.lip - 1.36) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[SHAKER.radius, SHAKER.radius + 0.025, SHAKER.lip + 1.36, 96]}
        />
        <meshStandardMaterial
          color="#c5c5ad"
          metalness={0.2}
          roughness={0.57}
        />
      </mesh>
      <mesh position={[0, -1.27, 0]} castShadow>
        <cylinderGeometry args={[2.27, 2.27, 0.16, 96]} />
        <meshStandardMaterial
          color="#a8b0a4"
          metalness={0.55}
          roughness={0.44}
        />
      </mesh>
      <mesh position={[0, SHAKER.lip - 0.05, 0]} castShadow>
        <cylinderGeometry args={[2.255, 2.255, 0.1, 96]} />
        <meshStandardMaterial
          color="#bcc4bb"
          metalness={0.75}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, SHAKER.lip + 0.012, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.82, 2.21, 96]} />
        <meshStandardMaterial color="#252f31" roughness={0.78} />
      </mesh>
      {Array.from({ length: 64 }, (_, i) => {
        const a = (i * Math.PI) / 32;
        return (
          <group
            key={i}
            position={[
              Math.sin(a) * 2.205,
              SHAKER.lip - 0.27,
              Math.cos(a) * 2.205,
            ]}
            rotation-y={a}
          >
            <mesh>
              <boxGeometry args={[0.064, 0.27, 0.025]} />
              <meshStandardMaterial color="#38423f" roughness={0.9} />
            </mesh>
          </group>
        );
      })}
      {[-1, 1].map((sign) => (
        <group key={sign}>
          <Block
            position={[sign * 2.52, -0.02, 0]}
            size={[0.32, 2.66, 2.3]}
            color="#24354f"
            roughness={0.53}
          />
          <Block
            position={[sign * 2.52, -1.25, 0]}
            size={[0.63, 0.23, 3.05]}
            color="#202e49"
            roughness={0.55}
          />
          <group position={[sign * 2.35, -0.05, 0]} rotation-z={Math.PI / 2}>
            <mesh castShadow>
              <cylinderGeometry args={[0.48, 0.48, 0.65, 32]} />
              <meshStandardMaterial
                color="#b6bcad"
                metalness={0.45}
                roughness={0.5}
              />
            </mesh>
            <mesh position={[0, -sign * 0.38, 0]}>
              <cylinderGeometry args={[0.34, 0.34, 0.14, 32]} />
              <meshStandardMaterial
                color="#33435a"
                metalness={0.5}
                roughness={0.4}
              />
            </mesh>
          </group>
          <Block
            position={[sign * 2.69, 0.82, 0.87]}
            size={[0.018, 0.36, 0.2]}
            color="#cab351"
            roughness={0.8}
          />
        </group>
      ))}
      <group
        ref={boot}
        position={[0, SHAKER.lip + SHAKER.bootHeight / 2, 0]}
        scale={[1, SHAKER.bootHeight, 1]}
      >
        <mesh castShadow>
          <cylinderGeometry
            args={[3.02 * ASSEMBLY.scale, 3.22 * ASSEMBLY.scale, 1, 64]}
          />
          <meshStandardMaterial color="#263132" roughness={0.85} />
        </mesh>
        {[-0.33, 0, 0.33].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry
              args={[
                (3.16 - y * 0.15) * ASSEMBLY.scale,
                (3.16 - y * 0.15) * ASSEMBLY.scale,
                0.08,
                64,
              ]}
            />
            <meshStandardMaterial color="#344143" roughness={0.7} />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <mesh
            key={i}
            position={[
              Math.sin(a) * 2.16,
              SHAKER.lip + 0.035,
              Math.cos(a) * 2.16,
            ]}
          >
            <cylinderGeometry args={[0.045, 0.045, 0.04, 6]} />
            <meshStandardMaterial
              color="#b9c0b9"
              metalness={0.85}
              roughness={0.3}
            />
          </mesh>
        );
      })}
      <Nameplate />
      <group position={SHAKER.socket} rotation-z={Math.PI / 2}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.13, 0.2, 24]} />
          <meshStandardMaterial
            color="#a4b0a6"
            metalness={0.7}
            roughness={0.35}
          />
        </mesh>
      </group>
    </group>
  );
}

export function SignalGenerator({ frequency }: { frequency: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 880;
    canvas.height = 495;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#273b3d";
    c.fillRect(0, 0, 880, 495);
    c.fillStyle = "#c2d0c3";
    c.font = "24px monospace";
    c.fillText("FREQUENCY GENERATOR          SG–600", 40, 48);
    c.fillStyle = "#0b211d";
    c.fillRect(40, 76, 800, 208);
    c.fillStyle = "#b7ebca";
    c.font = "78px monospace";
    c.fillText(`${frequency.toFixed(1)} Hz`, 72, 208);
    c.font = "21px monospace";
    c.fillText("SINE     •     1 g PEAK", 74, 254);
    c.strokeStyle = "#9fcfb6";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(60, 359);
    c.lineTo(820, 359);
    c.stroke();
    const x = 60 + (Math.log(frequency) / Math.log(600)) * 760;
    c.fillRect(x - 8, 344, 16, 30);
    c.font = "21px monospace";
    c.fillText("1        5        25       100      600", 55, 401);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [frequency]);
  useEffect(() => () => texture.dispose(), [texture]);
  const cable = useMemo(() => {
    // Fixed output socket to the stationary shaker housing: no moving cable endpoints.
    const local = new THREE.Vector3(-1.695, -0.843, 1.02)
      .multiplyScalar(GENERATOR.scale)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), GENERATOR.rotation)
      .add(new THREE.Vector3(...GENERATOR.position));
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        local,
        new THREE.Vector3(local.x - 0.15, -0.8, local.z + 0.15),
        new THREE.Vector3(3.65, -2.39, 2.55),
        new THREE.Vector3(3.28, -2.39, 2.1),
        new THREE.Vector3(3.02, -1.35, 1.02),
        new THREE.Vector3(...SHAKER.socket),
      ]),
      100,
      0.045,
      10,
      false,
    );
  }, []);
  useEffect(() => () => cable.dispose(), [cable]);
  return (
    <>
      <mesh geometry={cable} castShadow>
        <meshStandardMaterial color="#101819" roughness={0.67} />
      </mesh>
      <group
        position={GENERATOR.position}
        rotation-y={GENERATOR.rotation}
        scale={GENERATOR.scale}
      >
        <Block
          size={[4.4, 2.5, 1.7]}
          color="#7c8e88"
          metalness={0.7}
          roughness={0.38}
        />
        <Block
          size={[4.25, 2.38, 0.05]}
          position={[0, 0, 0.855]}
          color="#35494a"
        />
        <mesh position={[0, 0, GENERATOR.faceZ + 0.02]}>
          <planeGeometry args={[GENERATOR.width, GENERATOR.height]} />
          <meshBasicMaterial map={texture} />
        </mesh>
        {[-2.16, 2.16].map((x) => (
          <Block
            key={x}
            size={[0.12, 2.15, 0.22]}
            position={[x, 0, 0.95]}
            color="#223338"
          />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <Block
            key={i}
            size={[0.045, 0.018, 0.7]}
            position={[-1.6 + i * 0.14, 1.26, -0.1]}
            color="#304649"
          />
        ))}
        {[-1.7, 1.7].flatMap((x) =>
          [-0.5, 0.5].map((z) => (
            <Block
              key={`${x},${z}`}
              size={[0.38, 0.15, 0.4]}
              position={[x, -1.33, z]}
              color="#162427"
            />
          )),
        )}
      </group>
    </>
  );
}
