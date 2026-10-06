import { useEffect, useMemo } from "react";
import { CanvasTexture, DoubleSide, Vector2 } from "three";
import { SCALE, type Model } from "./physics";
function Marking() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 768;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#dce4e2";
    ctx.fillRect(0, 0, 256, 768);
    ctx.fillStyle = "#253942";
    ctx.textAlign = "center";
    ctx.font = "bold 76px sans-serif";
    ["V", "L", "A", "B"].forEach((s, i) => ctx.fillText(s, 128, 150 + i * 120));
    ctx.fillStyle = "#b5774b";
    ctx.fillRect(70, 630, 116, 12);
    ctx.font = "32px monospace";
    ctx.fillText("07", 128, 712);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, -0.5, 0.503]}>
      <planeGeometry args={[0.24, 1.45]} />
      <meshStandardMaterial map={texture} roughness={0.65} />
    </mesh>
  );
}
function Bell({
  x = 0,
  z = 0,
  radius = 0.17,
}: {
  x?: number;
  z?: number;
  radius?: number;
}) {
  const profile = useMemo(
    () => [
      new Vector2(radius, 0),
      new Vector2(radius * 0.92, 0.07),
      new Vector2(radius * 0.55, 0.27),
      new Vector2(radius * 0.26, 0.34),
    ],
    [radius],
  );
  return (
    <mesh position={[x, -4.83, z]}>
      <latheGeometry args={[profile, 24]} />
      <meshStandardMaterial
        color="#34434c"
        roughness={0.36}
        metalness={0.85}
        side={DoubleSide}
      />
    </mesh>
  );
}
export function Vehicle({
  model,
  selected = -1,
  onSelect,
  slice = false,
  showMarking = true,
}: {
  model: Model;
  selected?: number;
  onSelect?: (index: number) => void;
  slice?: boolean;
  showMarking?: boolean;
}) {
  return (
    <group>
      {model.bodies.map((body) => {
        const core = body.index === 0,
          radius = (body.diameter * SCALE) / 2,
          length = body.barrel * SCALE;
        return (
          <group
            key={body.index}
            position-x={body.x * SCALE}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(body.index);
            }}
          >
            <mesh position-y={slice ? 0 : -4.4 + length / 2}>
              <cylinderGeometry
                args={[radius, radius, slice ? 0.18 : length, 64]}
              />
              <meshStandardMaterial
                color={slice ? body.color : "#dce4e2"}
                metalness={0.32}
                roughness={0.48}
                emissive={selected === body.index ? "#43636c" : "#000000"}
                emissiveIntensity={0.17}
              />
            </mesh>
            {!slice && (
              <>
                {[-4.37, -3.6, -0.5, core ? 3.15 : 1.85].map((y, i) => (
                  <mesh key={i} position-y={y}>
                    <cylinderGeometry
                      args={[
                        radius + 0.006,
                        radius + 0.006,
                        i === 3 ? 0.35 : 0.035,
                        64,
                      ]}
                    />
                    <meshStandardMaterial
                      color={i === 3 ? "#2a3b45" : "#a5b7ba"}
                      roughness={0.5}
                      metalness={0.55}
                    />
                  </mesh>
                ))}
                <mesh position={[radius * 0.56, -0.6, radius * 0.85]}>
                  <boxGeometry args={[0.045, length * 0.78, 0.055]} />
                  <meshStandardMaterial
                    color="#849b9e"
                    metalness={0.7}
                    roughness={0.4}
                  />
                </mesh>
                {core ? (
                  <>
                    <mesh position-y={4.1}>
                      <cylinderGeometry args={[0.7, 0.5, 0.6, 64]} />
                      <meshStandardMaterial
                        color="#e2e8e2"
                        roughness={0.48}
                        metalness={0.22}
                      />
                    </mesh>
                    <mesh position-y={4.85}>
                      <cylinderGeometry args={[0.7, 0.7, 0.9, 64]} />
                      <meshStandardMaterial
                        color="#e2e8e2"
                        roughness={0.48}
                        metalness={0.22}
                      />
                    </mesh>
                    <mesh position-y={5.3}>
                      <latheGeometry
                        args={[
                          [
                            new Vector2(0.7, 0),
                            new Vector2(0.68, 0.3),
                            new Vector2(0.57, 0.65),
                            new Vector2(0.38, 1),
                            new Vector2(0.13, 1.35),
                            new Vector2(0, 1.5),
                          ],
                          64,
                        ]}
                      />
                      <meshStandardMaterial
                        color="#e2e8e2"
                        roughness={0.48}
                        metalness={0.22}
                      />
                    </mesh>
                    {showMarking && <Marking />}
                    {[0, 1, 2, 3].map((i) => (
                      <Bell
                        key={i}
                        x={0.23 * Math.cos((i * Math.PI) / 2)}
                        z={0.23 * Math.sin((i * Math.PI) / 2)}
                        radius={0.14}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <mesh position-y={2.6}>
                      <latheGeometry
                        args={[
                          [
                            new Vector2(radius, 0),
                            new Vector2(radius * 0.95, 0.35),
                            new Vector2(radius * 0.65, 0.75),
                            new Vector2(radius * 0.2, 1.1),
                            new Vector2(0, 1.25),
                          ],
                          48,
                        ]}
                      />
                      <meshStandardMaterial
                        color="#d8e1df"
                        roughness={0.5}
                        metalness={0.3}
                      />
                    </mesh>
                    <mesh position-y={-3.8}>
                      <cylinderGeometry
                        args={[radius + 0.008, radius + 0.008, 0.3, 48]}
                      />
                      <meshStandardMaterial
                        color="#b27852"
                        metalness={0.35}
                        roughness={0.5}
                      />
                    </mesh>
                    <Bell radius={0.24} />
                    {[-3.2, 1.7].map((y) => (
                      <mesh
                        key={y}
                        position={[
                          -Math.sign(body.x) *
                            (radius + (model.settings.gap * SCALE) / 2),
                          y,
                          0,
                        ]}
                      >
                        <boxGeometry
                          args={[model.settings.gap * SCALE + 0.05, 0.12, 0.15]}
                        />
                        <meshStandardMaterial
                          color="#7c939b"
                          roughness={0.4}
                          metalness={0.8}
                        />
                      </mesh>
                    ))}
                  </>
                )}
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
