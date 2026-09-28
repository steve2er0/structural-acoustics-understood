import { Flange, Pipe } from "./Hardware";
import type { V } from "./layout";

/** External casting/bracket/harness envelopes from NASA HAER elevations and photos. */
export function Powerhead({ detailed = true }: { detailed?: boolean }) {
  return (
    <group>
      {/* Short gimbal bearing directly over the injector/HGM, not a tall open pedestal. */}
      <mesh position={[0, 2.22, -0.16]}>
        <cylinderGeometry args={[0.32, 0.43, 0.28, 40]} />
        <meshStandardMaterial color="#a5aaa5" metalness={0.8} roughness={0.4} />
      </mesh>
      <Flange center={[0, 2.38, -0.16]} axis={[0, 1, 0]} radius={0.35} />
      <mesh position={[0, 1.96, -0.16]} scale={[1, 0.72, 1]}>
        <sphereGeometry args={[0.33, 32, 20]} />
        <meshStandardMaterial
          color="#697473"
          metalness={0.8}
          roughness={0.38}
        />
      </mesh>
      <mesh position={[0, 1.53, 0]} scale={[1, 0.42, 1]}>
        <sphereGeometry args={[0.66, 36, 24]} />
        <meshStandardMaterial
          color="#737c7a"
          metalness={0.75}
          roughness={0.43}
        />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + 0.5;
        return (
          <Pipe
            key={i}
            points={[
              [0.48 * Math.sin(a), 1.46, 0.48 * Math.cos(a)],
              [0.3 * Math.sin(a), 1.92, 0.3 * Math.cos(a) - 0.16],
              [0.25 * Math.sin(a), 2.2, 0.25 * Math.cos(a) - 0.16],
            ]}
            radius={0.075}
            color="#737b78"
          />
        );
      })}
      {/* Compact pneumatic/control blocks between the two HP pump bodies. */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-0.19, 1.74 - i * 0.22, 0.83]}>
          <mesh>
            <boxGeometry args={[0.32, 0.16, 0.22]} />
            <meshStandardMaterial
              color="#a0a6a1"
              metalness={0.65}
              roughness={0.43}
            />
          </mesh>
          <mesh rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.06, 0.06, 0.53, 16]} />
            <meshStandardMaterial
              color="#bdc0b7"
              metalness={0.7}
              roughness={0.35}
            />
          </mesh>
          <Flange center={[0.27, 0, 0]} axis={[1, 0, 0]} radius={0.072} />
          <Pipe
            points={[
              [0.25, 0, 0.04],
              [0.35, -0.06, 0.08],
              [0.35, -0.19, 0.08],
            ]}
            radius={0.021}
          />
        </group>
      ))}
      {/* Heat exchanger bulge on the oxidizer side of the hot-gas manifold. */}
      <mesh position={[0.64, 1.79, 0.03]} scale={[1, 0.77, 1]}>
        <sphereGeometry args={[0.34, 28, 18]} />
        <meshStandardMaterial
          color="#92978e"
          metalness={0.77}
          roughness={0.4}
        />
      </mesh>
      <Pipe
        points={[
          [0.68, 1.98, 0.1],
          [0.99, 1.99, 0.29],
          [1.2, 1.82, 0.53],
        ]}
        radius={0.028}
      />
      {detailed && (
        <>
          {/* Tubing follows the powerhead perimeter. It does not imply new modeled cycle branches. */}
          {Array.from({ length: 8 }, (_, i) => (
            <Pipe
              key={i}
              points={[
                [-0.94, 1.68, 0.7 + i * 0.018],
                [-0.55, 1.39, 0.99 + i * 0.018],
                [0.2, 1.0, 1.03 + i * 0.018],
                [0.84, 1.07, 0.78 + i * 0.018],
                [1.13, 1.55, 0.58 + i * 0.018],
              ]}
              radius={0.009}
              color={i % 3 ? "#a6aca7" : "#595e5c"}
            />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <Pipe
              key={i}
              points={[
                [0.3, 2.12, -0.35 + i * 0.023],
                [0.03, 2.14, 0.22 + i * 0.023],
                [0.01, 1.73, 0.76 + i * 0.023],
                [-0.72, 1.1, 0.89 + i * 0.023],
              ]}
              radius={0.012}
              color="#b5b6aa"
            />
          ))}
          {([-1, 1] as const).map((side) => (
            <group key={side}>
              <Pipe
                points={[
                  [side * 0.4, 0.45, 0.47],
                  [side * 0.86, 0.57, 0.69],
                  [side * 1.02, 1.09, 0.69],
                ]}
                radius={0.031}
              />
              <Pipe
                points={[
                  [side * 0.4, 1.35, -0.4],
                  [side * 0.68, 1.78, -0.7],
                  [side * 0.68, 2.05, -0.75],
                ]}
                radius={0.039}
                color="#646e6e"
              />
            </group>
          ))}
          {[
            [0.47, 0.63, 0.7],
            [-0.49, 0.7, 0.7],
            [0.12, 1.33, 0.76],
          ].map((p, i) => (
            <group key={i} position={p as V}>
              <mesh>
                <boxGeometry args={[0.13, 0.17, 0.14]} />
                <meshStandardMaterial
                  color="#8e8d76"
                  metalness={0.6}
                  roughness={0.48}
                />
              </mesh>
              <mesh position-y={0.13}>
                <cylinderGeometry args={[0.055, 0.055, 0.14, 12]} />
                <meshStandardMaterial
                  color="#858c84"
                  metalness={0.7}
                  roughness={0.4}
                />
              </mesh>
            </group>
          ))}
        </>
      )}
    </group>
  );
}

export function Controller() {
  return (
    <group rotation-y={-0.25}>
      <mesh>
        <boxGeometry args={[0.55, 0.68, 0.28]} />
        <meshStandardMaterial
          color="#333c3c"
          metalness={0.45}
          roughness={0.6}
        />
      </mesh>
      {[-0.22, -0.11, 0, 0.11, 0.22].map((x) => (
        <mesh key={x} position={[x, 0, 0.16]}>
          <boxGeometry args={[0.017, 0.64, 0.045]} />
          <meshStandardMaterial
            color="#79837d"
            metalness={0.7}
            roughness={0.4}
          />
        </mesh>
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <group
          key={i}
          position={[
            -0.17 + (i % 2) * 0.32,
            0.25 - Math.floor(i / 2) * 0.125,
            0.2,
          ]}
        >
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.034, 0.042, 0.07, 12]} />
            <meshStandardMaterial
              color={i % 3 ? "#b5b7a9" : "#a28d54"}
              metalness={0.65}
              roughness={0.42}
            />
          </mesh>
          <Pipe
            points={[
              [0, 0, 0.02],
              [0.1, 0, 0.09],
              [0.3, -0.15, 0.09],
              [0.35, -0.23, -0.15],
            ]}
            radius={0.01}
          />
        </group>
      ))}
    </group>
  );
}
