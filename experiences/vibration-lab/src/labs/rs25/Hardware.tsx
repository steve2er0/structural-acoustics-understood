import { useMemo } from "react";
import {
  CatmullRomCurve3,
  DoubleSide,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
type V = [number, number, number];

/** Photo-guided external envelopes, not dimensioned manufacturing geometry. */
export function Pipe({
  points,
  radius = 0.04,
  color = "#adb4b5",
}: {
  points: V[];
  radius?: number;
  color?: string;
}) {
  const curve = useMemo(
    () => new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
    [points],
  );
  return (
    <mesh>
      <tubeGeometry args={[curve, 40, radius, 10, false]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.34} />
    </mesh>
  );
}
export function Flange({
  center,
  axis = [0, 0, 1],
  radius,
  dark = false,
}: {
  center: V;
  axis?: V;
  radius: number;
  dark?: boolean;
}) {
  const q = new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, 1),
    new Vector3(...axis).normalize(),
  );
  return (
    <group position={center} quaternion={q}>
      <mesh>
        <torusGeometry args={[radius, 0.038, 8, 40]} />
        <meshStandardMaterial
          color={dark ? "#40474a" : "#aab1ae"}
          metalness={0.8}
          roughness={0.38}
        />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          position={[
            radius * Math.cos((i * Math.PI) / 6),
            radius * Math.sin((i * Math.PI) / 6),
            0.037,
          ]}
          rotation-x={Math.PI / 2}
        >
          <cylinderGeometry args={[0.025, 0.025, 0.05, 6]} />
          <meshStandardMaterial
            color="#c3c4ba"
            metalness={0.8}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

export function PumpHousing({
  id,
  selected,
  cut = false,
}: {
  id: "lpftp" | "hpftp" | "lpotp" | "hpotp";
  selected: boolean;
  cut?: boolean;
}) {
  const high = id.startsWith("hp"),
    fuel = id.includes("f"),
    r = high ? (fuel ? 0.39 : 0.43) : 0.32;
  const body = selected
    ? "#c9b38c"
    : id === "hpftp"
      ? "#b4b6ad"
      : high
        ? "#899291"
        : "#b0b6b3";
  const profile = (
    high
      ? fuel
        ? [
            [0.18, -0.69],
            [0.29, -0.62],
            [0.38, -0.47],
            [0.38, 0.1],
            [0.31, 0.19],
            [0.31, 0.35],
            [0.44, 0.43],
            [0.44, 0.6],
            [0.29, 0.66],
          ]
        : [
            [0.19, -0.66],
            [0.31, -0.55],
            [0.46, -0.38],
            [0.46, -0.11],
            [0.3, 0.05],
            [0.28, 0.26],
            [0.4, 0.39],
            [0.4, 0.58],
            [0.25, 0.64],
          ]
      : [
          [0.19, -0.52],
          [0.28, -0.4],
          [0.34, -0.18],
          [0.34, 0.12],
          [0.28, 0.3],
          [0.23, 0.39],
        ]
  ).map(([radius, z]) => new Vector2(radius, z));
  return (
    <group>
      <mesh rotation-x={Math.PI / 2}>
        <latheGeometry
          args={[
            profile,
            48,
            cut ? 0.7 : 0,
            cut ? Math.PI * 2 - 1.4 : Math.PI * 2,
          ]}
        />
        <meshStandardMaterial
          color={body}
          metalness={0.83}
          roughness={0.36}
          side={DoubleSide}
        />
      </mesh>
      {/* Cast volute and tangential discharge, rather than identical straight barrels. */}
      {!cut && (
        <mesh
          position={[fuel ? -0.1 : 0.11, 0.015, -0.24]}
          scale={[1.12, 0.94, 0.62]}
        >
          <sphereGeometry args={[r, 32, 20]} />
          <meshStandardMaterial color={body} metalness={0.78} roughness={0.4} />
        </mesh>
      )}
      <Pipe
        points={[
          [fuel ? -0.17 : 0.17, 0.22, -0.25],
          [fuel ? -0.38 : 0.39, 0.27, -0.22],
          [fuel ? -0.49 : 0.5, 0.05, -0.1],
        ]}
        radius={high ? 0.15 : 0.13}
        color={body}
      />
      <Flange center={[0, 0, -0.51]} radius={high ? 0.31 : 0.24} />
      <Flange center={[0, 0, -0.68]} radius={0.2} />
      <Flange
        center={[0, 0, high ? 0.58 : 0.31]}
        radius={high ? (fuel ? 0.44 : 0.4) : 0.28}
        dark
      />
      {high && <Flange center={[0, 0, 0.18]} radius={0.315} />}
      <mesh position={[0, 0, -0.59]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.19, 0.22, 0.18, 32]} />
        <meshStandardMaterial
          color="#b7bebd"
          metalness={0.86}
          roughness={0.3}
        />
      </mesh>
      {/* Stiffening webs and bearing bosses are static housing details. */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} rotation-z={(i * Math.PI) / 4}>
          <mesh position={[r * 0.85, 0, high ? 0.02 : 0]}>
            <boxGeometry args={[0.09, 0.038, high ? 0.52 : 0.32]} />
            <meshStandardMaterial
              color="#788281"
              metalness={0.78}
              roughness={0.42}
            />
          </mesh>
        </group>
      ))}
      {id === "hpotp" && (
        <group position={[0.08, -0.24, -0.58]}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.18, 0.23, 0.26, 24]} />
            <meshStandardMaterial
              color="#9fa7a5"
              metalness={0.8}
              roughness={0.38}
            />
          </mesh>
          <Flange center={[0, 0, -0.14]} radius={0.19} />
        </group>
      )}
    </group>
  );
}

export function PogoAccumulator({ cut }: { cut: boolean }) {
  return (
    <group>
      <mesh>
        <sphereGeometry
          args={[
            0.32,
            40,
            28,
            cut ? Math.PI / 2 + 0.65 : 0,
            cut ? Math.PI * 2 - 1.3 : Math.PI * 2,
          ]}
        />
        <meshStandardMaterial
          color="#bec2b8"
          metalness={0.82}
          roughness={0.32}
          side={DoubleSide}
        />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.32, 0.012, 8, 48]} />
        <meshStandardMaterial
          color="#696f6b"
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>
      <mesh position-y={-0.33}>
        <cylinderGeometry args={[0.13, 0.105, 0.2, 24]} />
        <meshStandardMaterial
          color="#abb1aa"
          metalness={0.8}
          roughness={0.35}
        />
      </mesh>
      <Flange center={[0, -0.41, 0]} axis={[0, 1, 0]} radius={0.15} />
      <Pipe
        points={[
          [0, 0.29, 0],
          [0.05, 0.41, 0],
          [0.28, 0.41, -0.12],
        ]}
        radius={0.028}
      />
      {cut && (
        <>
          <mesh>
            <sphereGeometry
              args={[
                0.285,
                24,
                16,
                0,
                Math.PI * 2,
                0,
                Math.acos(-0.09 / 0.285),
              ]}
            />
            <meshBasicMaterial
              color="#cdbd84"
              transparent
              opacity={0.32}
              side={DoubleSide}
            />
          </mesh>
          <mesh position-y={-0.09} rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.26, 32]} />
            <meshBasicMaterial
              color="#a7b9fc"
              transparent
              opacity={0.75}
              side={DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

export const JACKET: [number, number][] = [
  [1.51, -3],
  [1.49, -2.66],
  [1.43, -2.22],
  [1.34, -1.78],
  [1.23, -1.34],
  [1.11, -0.9],
  [0.98, -0.46],
  [0.83, -0.02],
  [0.69, 0.43],
  [0.63, 0.72],
];
export function NozzleJacket() {
  const heightRatio = 3.35 / 3.72;
  return (
    <group scale-y={heightRatio} position-y={-3 + 3 * heightRatio}>
      <mesh>
        <latheGeometry args={[JACKET.map((p) => new Vector2(...p)), 96]} />
        <meshStandardMaterial
          color="#6d7476"
          metalness={0.65}
          roughness={0.55}
          side={DoubleSide}
        />
      </mesh>
      {JACKET.map(([r, y], i) => (
        <mesh key={i} position-y={y} rotation-x={Math.PI / 2}>
          <torusGeometry args={[r + 0.025, i === 0 ? 0.05 : 0.034, 10, 80]} />
          <meshStandardMaterial
            color={i === 0 ? "#a0a6a4" : "#4c565b"}
            metalness={0.65}
            roughness={0.45}
          />
        </mesh>
      ))}
      {[0.18, 1.6, 3.1, 4.75].map((a, i) => (
        <group key={a}>
          <Pipe
            points={JACKET.map(([r, y]) => [
              (r + 0.065) * Math.sin(a),
              y,
              (r + 0.065) * Math.cos(a),
            ])}
            radius={i === 0 ? 0.035 : 0.043}
            color={i === 0 ? "#9d9386" : "#454f53"}
          />
          {JACKET.slice(1, -1).map(([r, y]) => (
            <mesh
              key={y}
              position={[
                (r + 0.063) * Math.sin(a),
                y,
                (r + 0.063) * Math.cos(a),
              ]}
              rotation-y={a}
            >
              <boxGeometry args={[0.13, 0.095, 0.1]} />
              <meshStandardMaterial
                color="#697477"
                metalness={0.75}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      ))}
      <Pipe
        points={[
          [0.1, 0.7, 0.67],
          [0.13, 0.15, 0.84],
          [0.18, -0.7, 1.12],
          [0.12, -1.1, 1.28],
          [-0.16, -1.28, 1.31],
          [-0.14, -1.53, 1.4],
          [0.13, -1.75, 1.45],
          [0.16, -2.3, 1.52],
          [0.16, -2.91, 1.58],
        ]}
        radius={0.035}
        color="#b2aba0"
      />
      <Flange center={[0, 0.72, 0]} axis={[0, 1, 0]} radius={0.64} />
    </group>
  );
}
