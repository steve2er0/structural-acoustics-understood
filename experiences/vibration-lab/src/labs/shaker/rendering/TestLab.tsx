import { useEffect, useMemo } from "react";
import * as THREE from "three";

type Point = [number, number, number];
const NAVY = "#202e49";
const METAL = "#aab3b4";

function Box({
  at,
  size,
  color,
  metal = 0.15,
}: {
  at: Point;
  size: Point;
  color: string;
  metal?: number;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.64} metalness={metal} />
    </mesh>
  );
}

function Cable({
  points,
  radius = 0.055,
  color = "#20282b",
}: {
  points: Point[];
  radius?: number;
  color?: string;
}) {
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        48,
        radius,
        8,
        false,
      ),
    [points, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={color} roughness={0.83} />
    </mesh>
  );
}

function PrintedPanel({
  kind,
  at,
  size,
}: {
  kind: "rack" | "bay" | "base";
  at: Point;
  size: [number, number];
}) {
  const map = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = kind === "rack" ? 512 : 1024;
    canvas.height = kind === "rack" ? 1536 : 256;
    const ctx = canvas.getContext("2d")!;
    if (kind === "rack") {
      ctx.fillStyle = "#bcc5c7";
      ctx.fillRect(0, 0, 512, 1536);
      ctx.fillStyle = "#283740";
      ctx.fillRect(34, 46, 444, 260);
      ctx.fillStyle = "#a4c1bc";
      ctx.font = "26px monospace";
      ctx.fillText("POWER AMPLIFIER", 59, 104);
      ctx.font = "19px monospace";
      ctx.fillText("DRIVE / FIELD SUPPLY", 59, 155);
      ctx.strokeStyle = "#718f89";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 62; x < 448; x++) {
        const y = 230 - Math.sin((x - 62) / 38) * 24;
        if (x === 62) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#606e76";
      for (let row = 0; row < 23; row++) {
        for (let col = 0; col < 9; col++)
          ctx.fillRect(42 + col * 48, 410 + row * 39, 16, 23);
      }
      ctx.fillStyle = "#283740";
      ctx.fillRect(37, 1380, 438, 3);
      ctx.font = "20px monospace";
      ctx.fillText("SA / LAB EQUIPMENT", 50, 1450);
    } else {
      ctx.fillStyle = kind === "bay" ? "#e0e4df" : "#202e49";
      ctx.fillRect(0, 0, 1024, 256);
      ctx.fillStyle = kind === "bay" ? "#263d48" : "#bac7cc";
      ctx.font = "bold 64px sans-serif";
      ctx.fillText(
        kind === "bay" ? "02 / VIBRATION LAB" : "STRUCTURAL ACOUSTICS",
        45,
        112,
      );
      ctx.font = "29px monospace";
      ctx.fillText(
        kind === "bay"
          ? "DYNAMICS  /  VERTICAL TEST BAY"
          : "ELECTRODYNAMIC TEST SYSTEM",
        49,
        177,
      );
      ctx.fillStyle = "#c2a641";
      ctx.fillRect(46, 208, 180, 7);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [kind]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={at}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} roughness={0.77} />
    </mesh>
  );
}

function Amplifier({ at }: { at: Point }) {
  return (
    <group position={at} rotation-y={0.1}>
      <Box at={[0, 2.6, 0]} size={[1.85, 4.9, 1.85]} color={NAVY} />
      <Box at={[0, 2.63, 0.947]} size={[1.58, 4.5, 0.08]} color={METAL} />
      <PrintedPanel kind="rack" at={[0, 2.63, 0.994]} size={[1.5, 4.42]} />
      <Box at={[0.65, 1.37, 1.03]} size={[0.09, 0.37, 0.1]} color="#25343c" />
      <Box at={[0, 0.23, 0]} size={[2, 0.18, 2]} color="#162334" />
      {[-0.7, 0.7].flatMap((x) =>
        [-0.7, 0.7].map((z) => (
          <mesh
            key={`${x},${z}`}
            position={[x, 0.13, z]}
            rotation-z={Math.PI / 2}
          >
            <cylinderGeometry args={[0.13, 0.13, 0.14, 12]} />
            <meshStandardMaterial color="#1c2529" roughness={0.9} />
          </mesh>
        )),
      )}
      <Box at={[-0.66, 4.2, 1.01]} size={[0.1, 0.1, 0.04]} color="#a74334" />
    </group>
  );
}

function Hoist({ at }: { at: Point }) {
  return (
    <group position={at}>
      <Box at={[0, 0.08, 0]} size={[1.05, 0.16, 1.1]} color="#ac582e" />
      <Box at={[0, 3.15, 0]} size={[0.27, 6.2, 0.32]} color="#c16a32" />
      <Box at={[1.24, 6.02, 0]} size={[2.65, 0.35, 0.3]} color="#d07737" />
      <Box at={[3.01, 6.07, 0]} size={[1.15, 0.2, 0.2]} color="#253039" />
      <group position={[0.57, 5.13, 0]} rotation-z={-Math.PI / 4}>
        <Box at={[0, 0, 0]} size={[0.14, 1.92, 0.16]} color="#b75d2e" />
      </group>
      <mesh position={[-0.05, 5.64, 0.28]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.34, 24]} />
        <meshStandardMaterial color="#ac4e2f" roughness={0.5} />
      </mesh>
      <Box at={[3.48, 5.53, 0]} size={[0.022, 0.86, 0.022]} color="#424b4e" />
      <Box at={[3.48, 5.06, 0]} size={[0.16, 0.2, 0.11]} color="#d6b543" />
      <mesh position={[3.48, 4.91, 0]} rotation-z={0.5}>
        <torusGeometry args={[0.12, 0.035, 8, 24, Math.PI * 1.6]} />
        <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.35} />
      </mesh>
      <Cable
        points={[
          [0.1, 5.5, 0.15],
          [0.4, 4.2, 0.15],
          [0.32, 2.5, 0.17],
        ]}
        radius={0.025}
      />
      <Box at={[0.32, 2.35, 0.17]} size={[0.14, 0.3, 0.13]} color="#d6b543" />
    </group>
  );
}

/** Static context inspired by the user's laboratory photo. No part of this
 * scenery contributes mass, stiffness, force, or new modeled test axes. */
export default function TestLab({
  isolation = false,
}: {
  isolation?: boolean;
}) {
  const floor = isolation ? -2.46 : -2.56;
  const width = isolation ? 8.1 : 5.7;
  const depth = isolation ? 7.9 : 5.3;
  const rackX = isolation ? 6.1 : 4.65;
  return (
    <group position={[0, floor, 0]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#626e72"
          roughness={0.9}
          metalness={0.08}
        />
      </mesh>
      {/* Open front and right sides keep every teaching camera unobstructed. */}
      <Box at={[14.5, 2.65, -7.1]} size={[51, 5.3, 0.14]} color="#5a7183" />
      <Box at={[14.5, 10.65, -7.1]} size={[51, 10.7, 0.14]} color="#a8aea9" />
      <Box at={[-10.95, 2.65, 17.9]} size={[0.14, 5.3, 50]} color="#526979" />
      <Box at={[-10.95, 10.65, 17.9]} size={[0.14, 10.7, 50]} color="#9fa7a3" />
      {Array.from({ length: 22 }, (_, i) => (
        <Box
          key={i}
          at={[-10.9 + i * 2.35, 8, -6.998]}
          size={[0.042, 16, 0.045]}
          color="#bac5c5"
        />
      ))}
      {[
        -6.9, -4.5, -2.1, 0.3, 2.7, 5.1, 7.5, 9.9, 12.3, 14.7, 17.1, 19.5, 21.9,
      ].map((z) => (
        <Box
          key={z}
          at={[-10.848, 8, z]}
          size={[0.045, 16, 0.042]}
          color="#afbcbf"
        />
      ))}
      <Box at={[14.5, 5.32, -6.996]} size={[51, 0.08, 0.05]} color="#c0c9c7" />
      <Box at={[-10.848, 5.32, 17.9]} size={[0.05, 0.08, 50]} color="#bbc6c6" />
      <Box at={[14.5, 0.2, -6.98]} size={[51, 0.4, 0.09]} color="#34454f" />
      <Box at={[-10.83, 0.2, 17.9]} size={[0.09, 0.4, 50]} color="#34454f" />
      <PrintedPanel kind="bay" at={[-1.6, 5.75, -6.98]} size={[3.9, 0.975]} />
      {/* Recessed service-light fixtures and a wall-mounted cooling unit. */}
      {[-6, 2, 9].map((x) => (
        <group key={x} position={[x, 7.5, -6.83]}>
          <Box at={[0, 0, 0]} size={[3.4, 0.24, 0.24]} color="#71818b" />
          <mesh position={[0, -0.04, 0.13]}>
            <boxGeometry args={[3.16, 0.1, 0.035]} />
            <meshStandardMaterial
              color="#e4edeb"
              emissive="#c7ddd9"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      ))}
      <Box at={[6.9, 6.2, -6.6]} size={[2.8, 0.83, 0.72]} color="#c3c9c5" />
      <Box at={[6.9, 5.91, -6.21]} size={[2.5, 0.12, 0.025]} color="#425462" />
      {[0, 0.08, 0.16].map((d) => (
        <Box
          key={d}
          at={[6.9, 6.03 + d, -6.23]}
          size={[2.5, 0.02, 0.04]}
          color="#99a6a6"
        />
      ))}
      {/* Thin floor joints and a yellow equipment clearance boundary. */}
      {[-8, -4, 0, 4, 8, 12].map((x) => (
        <Box
          key={x}
          at={[x, 0.003, 2]}
          size={[0.015, 0.006, 28]}
          color="#546165"
        />
      ))}
      {[-6, -2, 2, 6, 10].map((z) => (
        <Box
          key={z}
          at={[1, 0.003, z]}
          size={[30, 0.006, 0.015]}
          color="#546165"
        />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            at={[s * (width / 2 + 0.32), 0.012, 0]}
            size={[0.085, 0.012, depth + 0.72]}
            color="#d5b535"
          />
          <Box
            at={[0, 0.012, s * (depth / 2 + 0.32)]}
            size={[width + 0.72, 0.012, 0.085]}
            color="#d5b535"
          />
        </group>
      ))}
      <Box at={[0, 0.36, 0]} size={[width, 0.62, depth]} color={NAVY} />
      <Box
        at={[0, 0.685, 0]}
        size={[width + 0.06, 0.03, depth + 0.06]}
        color="#66777c"
        metal={0.5}
      />
      <PrintedPanel
        kind="base"
        at={[-width * 0.16, 0.38, depth / 2 + 0.004]}
        size={[width * 0.54, 0.34]}
      />
      {[-1, 0, 1].map((n) => (
        <Box
          key={n}
          at={[width * 0.38, 0.25 + n * 0.07, depth / 2 + 0.009]}
          size={[0.44, 0.018, 0.02]}
          color="#111f2d"
        />
      ))}
      <Amplifier at={[rackX, 0, -4.5]} />
      <Hoist at={[-6.3 - (isolation ? 1 : 0), 0, -3.8]} />
      <Cable
        points={[
          [rackX - 0.8, 0.5, -4.5],
          [rackX - 1.2, 0.12, -4.2],
          [width / 2 + 0.65, 0.1, -3],
          [width / 2 + 0.68, 0.15, -1],
          [width / 2 - 0.1, 0.38, -0.8],
        ]}
      />
      <Cable
        points={[
          [rackX - 0.6, 0.32, -4.5],
          [rackX - 0.9, 0.085, -4.1],
          [width / 2 + 0.87, 0.085, -2.8],
          [width / 2 + 0.8, 0.14, -0.8],
          [width / 2 - 0.1, 0.32, -0.6],
        ]}
        radius={0.035}
        color="#38434a"
      />
      {isolation && (
        <group position={[6.4, 0, -0.1]} rotation-y={0.38}>
          <Box at={[0, 0.49, 0]} size={[4.5, 0.42, 2.3]} color={NAVY} />
          {[-1.85, 1.85].flatMap((x) =>
            [-0.85, 0.85].map((z) => (
              <Box
                key={`${x},${z}`}
                at={[x, 0.18, z]}
                size={[0.14, 0.36, 0.14]}
                color="#7d8c90"
                metal={0.65}
              />
            )),
          )}
        </group>
      )}
    </group>
  );
}
