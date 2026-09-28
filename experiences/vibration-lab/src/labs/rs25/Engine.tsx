import { useMemo, useRef, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  DoubleSide,
  Group,
  MeshStandardMaterial,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import {
  COLORS,
  PARTS,
  type Display,
  type Fluid,
  type Part,
  type Topic,
} from "./content";
import { startupState } from "./physics";
import { Plume } from "./Plume";
import {
  Flange,
  NozzleJacket,
  Pipe,
  PogoAccumulator,
  PumpHousing,
} from "./Hardware";
import { Controller, Powerhead } from "./Powerhead";
import { LPFTPInducer } from "./Inducer";
import {
  PUMP_LAYOUT,
  POGO_SCALE,
  OXYGEN_ACCUMULATOR_TAP,
  explodedPoint,
  pumpPosition,
  pumpRotation,
  pumpPort,
  type Pump,
  type V,
} from "./layout";
import type { Playback } from "./simulation";
const FLOW_AXIS = new Vector3(0, 1, 0);
export function partPosition(part: Part, exploded: boolean): V {
  if (part in PUMP_LAYOUT) return pumpPosition(part as Pump, exploded);
  const point = explodedPoint(
    PARTS[part].point,
    exploded,
    part === "fp" || part === "op",
  );
  if (part === "injector" && exploded) point[1] += 0.32;
  return point;
}
function activeFluid(fluid: Fluid, topic: Topic) {
  return topic === "Follow LH₂"
    ? fluid !== "oxygen"
    : topic === "Follow LOX"
      ? ["oxygen", "hot", "main"].includes(fluid)
      : topic === "Cooling" || topic === "Thermal"
        ? ["cooling", "main"].includes(fluid)
        : topic === "Power flow"
          ? ["hot", "fuel", "oxygen"].includes(fluid)
          : true;
}
function Duct({
  points,
  fluid,
  live,
  topic,
  display,
  radius = 0.065,
}: {
  points: V[];
  fluid: Fluid;
  live: RefObject<Playback>;
  topic: Topic;
  display: Display;
  radius?: number;
}) {
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        points.map((p) => new Vector3(...p)),
        false,
        "centripetal",
      ),
    [points],
  );
  const beads = useRef<Group>(null),
    glow = useRef<MeshStandardMaterial>(null);
  const visible = activeFluid(fluid, topic),
    bright =
      display !== "Assembled" ||
      (topic !== "Full engine" &&
        topic !== "Shock diamonds" &&
        topic !== "Pogo suppression");
  const tangent = useMemo(() => curve.getTangentAt(0.64), [curve]),
    arrow = useMemo(
      () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), tangent),
      [tangent],
    );
  useFrame(() => {
    const l = live.current,
      r = startupState(l.phase),
      amount = l.running
        ? fluid === "hot"
          ? r.preburner
          : fluid === "main"
            ? r.combustion
            : r.flow
        : 0;
    if (glow.current)
      glow.current.emissiveIntensity = amount * (visible ? 0.45 : 0.03);
    if (beads.current) {
      beads.current.visible =
        amount > 0.01 && visible && bright && curve.getLength() > 0.25;
      beads.current.children.forEach((m, i) => {
        const t =
          ((l.time * ((0.22 * l.power) / 109)) /
            Math.max(0.6, curve.getLength() / 3) +
            i / 8) %
          1;
        m.position.copy(curve.getPointAt(t));
        if (fluid === "hot")
          m.quaternion.setFromUnitVectors(FLOW_AXIS, curve.getTangentAt(t));
      });
    }
  });
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 36, radius, 8, false]} />
        <meshStandardMaterial
          color={
            bright ? COLORS[fluid] : fluid === "hot" ? "#837e75" : "#a9b2b7"
          }
          metalness={bright ? 0.35 : 0.86}
          roughness={0.35}
          transparent
          opacity={
            visible
              ? bright
                ? display === "Cutaway" && radius >= 0.18
                  ? 0.16
                  : 0.52
                : 1
              : 0.09
          }
          depthWrite={visible}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[curve, 36, radius * 0.45, 6, false]} />
        <meshStandardMaterial
          ref={glow}
          color={COLORS[fluid]}
          emissive={COLORS[fluid]}
          emissiveIntensity={0}
          transparent
          opacity={
            bright
              ? visible
                ? display === "Cutaway" && radius >= 0.18
                  ? 0.2
                  : 0.8
                : 0.1
              : 0
          }
        />
      </mesh>
      {visible && bright && curve.getLength() > 0.25 && (
        <mesh position={curve.getPointAt(0.64)} quaternion={arrow}>
          <coneGeometry args={[Math.min(radius * 1.7, 0.11), 0.14, 6]} />
          <meshBasicMaterial color={COLORS[fluid]} />
        </mesh>
      )}
      {!bright &&
        curve.getLength() > 1 &&
        radius >= 0.18 &&
        [0.23, 0.67].map((t) => (
          <group
            key={t}
            position={curve.getPointAt(t)}
            quaternion={new Quaternion().setFromUnitVectors(
              new Vector3(0, 0, 1),
              curve.getTangentAt(t),
            )}
          >
            <Flange center={[0, 0, -0.06]} radius={radius * 1.13} />
            <Flange center={[0, 0, 0.06]} radius={radius * 1.13} />
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position-z={-0.045 + i * 0.03}>
                <torusGeometry args={[radius * 1.06, 0.012, 6, 24]} />
                <meshStandardMaterial
                  color="#6e7775"
                  metalness={0.8}
                  roughness={0.4}
                />
              </mesh>
            ))}
          </group>
        ))}
      <group ref={beads}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            {fluid === "oxygen" ? (
              <octahedronGeometry args={[Math.min(radius * 0.85, 0.055)]} />
            ) : fluid === "hot" ? (
              <coneGeometry args={[radius * 0.7, radius * 2.6, 5]} />
            ) : (
              <sphereGeometry args={[Math.min(radius * 0.7, 0.05), 6, 5]} />
            )}
            <meshBasicMaterial color={COLORS[fluid]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function Ring({
  r,
  y,
  thickness = 0.035,
  color = "#aabcc1",
}: {
  r: number;
  y: number;
  thickness?: number;
  color?: string;
}) {
  return (
    <mesh rotation-x={Math.PI / 2} position-y={y}>
      <torusGeometry args={[r, thickness, 8, 72]} />
      <meshStandardMaterial color={color} metalness={0.85} roughness={0.32} />
    </mesh>
  );
}
function Rotor({
  z,
  r,
  live,
  lpftp = false,
}: {
  z: number;
  r: number;
  live: RefObject<Playback>;
  lpftp?: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    if (lpftp && group.current) {
      group.current.rotation.z = live.current.shaftTurns * Math.PI * 2;
      return;
    }
    if (
      group.current &&
      !live.current.paused &&
      !document.hidden &&
      live.current.running
    )
      group.current.rotation.z +=
        Math.min(dt, 0.05) *
        Math.sqrt(live.current.power / 109) *
        startupState(live.current.phase).pumps *
        5;
  });
  return (
    <group position-z={z} ref={group}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[r * 0.48, r * 0.48, 0.055, 24]} />
        <meshStandardMaterial
          color="#e1c99c"
          metalness={0.8}
          roughness={0.32}
        />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} rotation-z={(i * Math.PI) / 6}>
          <mesh position={[r * 0.64, 0, 0]} rotation-z={0.35}>
            <boxGeometry args={[r * 0.65, 0.045, 0.08]} />
            <meshStandardMaterial
              color="#c2d0d0"
              metalness={0.9}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Turbopump({
  id,
  live,
  cut,
  exploded,
  selected,
  onSelect,
}: {
  id: Pump;
  live: RefObject<Playback>;
  cut: boolean;
  exploded: boolean;
  selected: Part;
  onSelect?: (p: Part) => void;
}) {
  const high = id.startsWith("hp"),
    r = high ? 0.34 : 0.25;
  return (
    <group
      position={pumpPosition(id, exploded)}
      quaternion={pumpRotation(id)}
      scale={PUMP_LAYOUT[id].scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(id);
      }}
    >
      <PumpHousing id={id} selected={selected === id} cut={cut} />
      {cut && (
        <>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.036, 0.036, high ? 1.3 : 0.88, 12]} />
            <meshStandardMaterial
              color="#c1a369"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          {id === "lpftp" ? (
            <LPFTPInducer live={live} />
          ) : (
            (id === "hpftp" ? [-0.36, -0.12, 0.12] : [-0.22]).map((z) => (
              <Rotor key={z} z={z} r={r} live={live} />
            ))
          )}
          <Rotor
            z={high ? 0.49 : 0.27}
            r={r * 0.9}
            live={live}
            lpftp={id === "lpftp"}
          />
          {id === "hpotp" && <Rotor z={-0.65} r={0.15} live={live} />}
        </>
      )}
    </group>
  );
}
const BELL: [number, number][] = [
  [1.5, -3],
  [1.47, -2.68],
  [1.4, -2.24],
  [1.29, -1.8],
  [1.15, -1.36],
  [0.99, -0.92],
  [0.79, -0.48],
  [0.56, -0.04],
  [0.32, 0.3],
  [0.2, 0.48],
  [0.17, 0.57],
  [0.23, 0.72],
  [0.36, 0.9],
  [0.42, 1.1],
  [0.42, 1.22],
];
export function Engine({
  live,
  display = "Assembled",
  topic = "Full engine",
  selected = "engine",
  onSelect,
  compact = false,
}: {
  live: RefObject<Playback>;
  display?: Display;
  topic?: Topic;
  selected?: Part;
  onSelect?: (p: Part) => void;
  compact?: boolean;
}) {
  const exploded = display === "Exploded",
    pogoCut = selected === "pogo" && display === "Cutaway";
  const cut =
    !pogoCut &&
    (display === "Cutaway" ||
      exploded ||
      ["Cooling", "Thermal", "Main combustion", "Nozzle"].includes(topic));
  const flowDisplay = pogoCut ? "Assembled" : display;
  const nozzle = useMemo(() => BELL.map((p) => new Vector2(...p)), []);
  const reaction = useRef<Group>(null),
    thrustArrow = useRef<Group>(null),
    chamberGlow = useRef<MeshStandardMaterial>(null);
  const preburnerGlow = useRef<(MeshStandardMaterial | null)[]>([]);
  useFrame(() => {
    const l = live.current,
      r = startupState(l.phase),
      lit = l.running ? r.combustion : 0;
    preburnerGlow.current.forEach((m) => {
      if (m)
        m.emissiveIntensity = l.running
          ? r.preburner * (0.5 + l.power / 109)
          : 0;
    });
    if (reaction.current) {
      reaction.current.visible = lit > 0;
      reaction.current.scale.setScalar(0.75 + (0.25 * l.power) / 109);
    }
    if (chamberGlow.current)
      chamberGlow.current.emissiveIntensity = lit * (0.8 + l.power / 109);
    if (thrustArrow.current) {
      thrustArrow.current.visible = l.running && r.exhaust > 0;
      thrustArrow.current.scale.y = (r.exhaust * l.power) / 109;
    }
  });
  const pick = (id: Part) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.(id);
  };
  const paths = useMemo(() => {
    const port = (id: Pump, name: Parameters<typeof pumpPort>[1]) =>
      pumpPort(id, name, exploded);
    const fp = partPosition("fp", exploded),
      op = partPosition("op", exploded);
    const shift = (p: V, x = 0, y = 0, z = 0): V => [
      p[0] + x,
      p[1] + y,
      p[2] + z,
    ];
    const j: V = [-1.18, 0.85, 0.1],
      o: V = [1.13, 0.81, 0.52],
      merge: V = [0, 1.67, -0.6];
    const ducts: { fluid: Fluid; points: V[]; radius?: number }[] = [
      // LP inlets face upward. The long cross-engine ducts begin at radial pump outlets.
      {
        fluid: "fuel",
        points: [
          shift(port("lpftp", "inlet"), 0, 0.03, 0),
          port("lpftp", "inlet"),
        ],
        radius: 0.2,
      },
      {
        fluid: "oxygen",
        points: [
          shift(port("lpotp", "inlet"), 0, 0.03, 0),
          port("lpotp", "inlet"),
        ],
        radius: 0.19,
      },
      {
        fluid: "fuel",
        points: [
          port("lpftp", "discharge"),
          [0.04, 2.18, -0.65],
          [-0.87, 2.17, -0.75],
          [-1.37, 1.93, -0.55],
          [-1.45, 1.08, -0.3],
          [-1.29, 0.54, 0.12],
          [-0.76, 0.41, 0.23],
          port("hpftp", "inlet"),
        ],
        radius: 0.21,
      },
      {
        fluid: "oxygen",
        points: [
          port("lpotp", "discharge"),
          [-0.06, 2.23, -0.51],
          [0.79, 2.23, -0.33],
          [1.32, 2.06, -0.11],
          OXYGEN_ACCUMULATOR_TAP,
          [1.38, 0.67, 0.2],
          [0.73, 0.43, 0.28],
          port("hpotp", "inlet"),
        ],
        radius: 0.185,
      },
      {
        fluid: "fuel",
        points: [port("hpftp", "discharge"), [-1.33, 1.06, 0.18], j],
        radius: 0.105,
      },
      // Chamber coolant powers the LPFTP turbine; its exhaust returns via the HGM jacket.
      {
        fluid: "cooling",
        points: [
          j,
          [-0.61, 0.67, 0.4],
          [-0.55, 0.89, 0.3],
          [-0.49, 1.22, 0.3],
          [0.47, 1.44, -0.41],
          port("lpftp", "turbineInlet"),
        ],
        radius: 0.072,
      },
      {
        fluid: "cooling",
        points: [
          port("lpftp", "turbineOutlet"),
          [1.08, 1.72, -0.66],
          [0.42, 1.6, -0.62],
          [0, 1.27, -0.32],
        ],
        radius: 0.07,
      },
      {
        fluid: "cooling",
        points: [
          j,
          [-0.66, 0.24, 0.3],
          [-0.95, -0.83, 0.53],
          [-1.25, -2.38, 0.65],
        ],
        radius: 0.058,
      },
      {
        fluid: "cooling",
        points: [[-0.38, 0.5, -0.18], [-0.55, 1.26, -0.62], merge],
        radius: 0.067,
      },
      {
        fluid: "fuel",
        points: [j, [-1.15, 0.8, -0.35], [-0.66, 1.62, -0.62], merge],
        radius: 0.078,
      },
      {
        fluid: "cooling",
        points: [merge, [-0.39, 1.98, -0.3], shift(fp, 0, 0, -0.2)],
        radius: 0.066,
      },
      {
        fluid: "cooling",
        points: [merge, [0.4, 2.03, -0.23], shift(op, 0, 0, -0.2)],
        radius: 0.066,
      },
      {
        fluid: "oxygen",
        points: [
          port("hpotp", "discharge"),
          [1.31, 0.97, 0.29],
          o,
          [0.59, 0.96, 0.66],
          [0, 1.28, 0.32],
        ],
        radius: 0.115,
      },
      {
        fluid: "oxygen",
        points: [
          port("hpotp", "boost"),
          [1.05, 0.7, -0.33],
          [1.04, 1.77, -0.43],
          shift(op, 0, 0, -0.2),
        ],
        radius: 0.058,
      },
      {
        fluid: "oxygen",
        points: [
          port("hpotp", "boost"),
          [0.61, 0.73, -0.74],
          [-0.4, 1.6, -0.73],
          shift(fp, 0, 0, -0.2),
        ],
        radius: 0.052,
      },
      {
        fluid: "oxygen",
        points: [
          o,
          [1.19, 1.08, 0.75],
          [-0.94, 1.38, 0.74],
          port("lpotp", "turbineInlet"),
        ],
        radius: 0.036,
      },
      {
        fluid: "oxygen",
        points: [
          port("lpotp", "turbineOutlet"),
          [-1.07, 1.93, -0.12],
          [-0.06, 2.23, -0.51],
        ],
        radius: 0.038,
      },
      {
        fluid: "hot",
        points: [shift(fp, 0, -0.13, 0), port("hpftp", "turbineInlet")],
        radius: 0.18,
      },
      {
        fluid: "hot",
        points: [shift(op, 0, -0.13, 0), port("hpotp", "turbineInlet")],
        radius: 0.17,
      },
      {
        fluid: "hot",
        points: [
          port("hpftp", "turbineOutlet"),
          [-0.38, 1.59, 0.32],
          [0, 1.45, 0.03],
          [0, 1.28, 0],
        ],
        radius: 0.2,
      },
      {
        fluid: "hot",
        points: [
          port("hpotp", "turbineOutlet"),
          [0.37, 1.62, 0.29],
          [0, 1.45, 0.03],
          [0, 1.28, 0],
        ],
        radius: 0.19,
      },
    ];
    return ducts;
  }, [exploded]);
  const tubes = useMemo(
    () =>
      Array.from({ length: compact ? 48 : 120 }, (_, i) => {
        const a = (i / (compact ? 48 : 120)) * Math.PI * 2;
        return new CatmullRomCurve3(
          BELL.slice(0, 12).map(
            ([r, y]) =>
              new Vector3(
                (r + 0.018) * Math.sin(a),
                y,
                (r + 0.018) * Math.cos(a),
              ),
          ),
        );
      }),
    [compact],
  );
  const pogo = partPosition("pogo", exploded);
  return (
    <group>
      <group onClick={pick("nozzle")}>
        {!cut && display !== "Flow" ? (
          <NozzleJacket />
        ) : (
          <>
            <mesh>
              <latheGeometry
                args={[
                  nozzle,
                  80,
                  cut ? 0.7 : 0,
                  cut ? Math.PI * 2 - 1.4 : Math.PI * 2,
                ]}
              />
              <meshStandardMaterial
                color={topic === "Thermal" ? "#b57450" : "#758080"}
                metalness={0.75}
                roughness={0.45}
                side={DoubleSide}
                transparent={display === "Flow"}
                opacity={display === "Flow" ? 0.2 : 1}
              />
            </mesh>
            {tubes.map((curve, i) => {
              const a = (i / tubes.length) * Math.PI * 2;
              if (cut && (a < 0.7 || a > Math.PI * 2 - 0.7)) return null;
              return (
                <mesh key={i}>
                  <tubeGeometry args={[curve, 32, 0.007, 4, false]} />
                  <meshStandardMaterial
                    color={
                      topic === "Cooling" || topic === "Thermal"
                        ? COLORS.cooling
                        : "#acb5b0"
                    }
                    metalness={0.65}
                    roughness={0.5}
                  />
                </mesh>
              );
            })}
          </>
        )}
      </group>
      <group onClick={pick("chamber")}>
        {!cut && display !== "Flow" && (
          <>
            <mesh position-y={0.81}>
              <cylinderGeometry args={[0.58, 0.63, 0.91, 48]} />
              <meshStandardMaterial
                color="#747c7a"
                metalness={0.8}
                roughness={0.43}
              />
            </mesh>
            <Ring r={0.63} y={0.38} thickness={0.04} />
            <Ring r={0.58} y={1.22} thickness={0.04} />
          </>
        )}
        <mesh position-y={0.88}>
          <cylinderGeometry
            args={[
              0.41,
              0.24,
              0.68,
              40,
              1,
              true,
              cut ? 0.7 : 0,
              cut ? Math.PI * 2 - 1.4 : Math.PI * 2,
            ]}
          />
          <meshStandardMaterial
            ref={chamberGlow}
            color="#97806c"
            emissive="#f47726"
            emissiveIntensity={0}
            metalness={0.6}
            roughness={0.4}
            side={DoubleSide}
            transparent
            opacity={display === "Flow" ? 0.3 : 1}
          />
        </mesh>
      </group>
      <group position-y={exploded ? 0.32 : 0} onClick={pick("injector")}>
        <mesh position-y={1.29}>
          <cylinderGeometry args={[0.6, 0.58, 0.2, 48]} />
          <meshStandardMaterial
            color="#a3aea9"
            metalness={0.85}
            roughness={0.35}
          />
        </mesh>
        <Flange center={[0, 1.39, 0]} axis={[0, 1, 0]} radius={0.61} />
        {cut &&
          Array.from({ length: 25 }, (_, i) => {
            const a = i * 2.4,
              r = 0.35 * Math.sqrt(i / 25);
            return (
              <mesh key={i} position={[r * Math.sin(a), 1.11, r * Math.cos(a)]}>
                <cylinderGeometry args={[0.02, 0.03, 0.2, 6]} />
                <meshStandardMaterial
                  color={COLORS.oxygen}
                  emissive={COLORS.oxygen}
                  emissiveIntensity={0.25}
                />
              </mesh>
            );
          })}
      </group>
      <Powerhead detailed={!compact && !cut} />
      {(["lpftp", "hpftp", "lpotp", "hpotp"] as const).map((id) => (
        <Turbopump
          key={id}
          id={id}
          live={live}
          cut={!pogoCut && (cut || display === "Flow")}
          exploded={exploded}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
      {(["fp", "op"] as const).map((id, i) => (
        <group
          key={id}
          position={partPosition(id, exploded)}
          onClick={pick(id)}
        >
          <mesh>
            <latheGeometry
              args={[
                [
                  [0.27, -0.13],
                  [0.27, 0],
                  [0.22, 0.13],
                  [0.15, 0.19],
                  [0.13, 0.23],
                ].map((p) => new Vector2(...p)),
                40,
                cut ? 0.7 : 0,
                cut ? Math.PI * 2 - 1.4 : Math.PI * 2,
              ]}
            />
            <meshStandardMaterial
              color={selected === id ? "#d5bc91" : "#87938b"}
              metalness={0.78}
              roughness={0.4}
              side={DoubleSide}
            />
          </mesh>
          <Flange center={[0, -0.13, 0]} axis={[0, 1, 0]} radius={0.26} />
          <Flange center={[0, 0.16, 0]} axis={[0, 1, 0]} radius={0.17} />
          {cut && (
            <mesh>
              <sphereGeometry args={[0.145, 20, 12]} />
              <meshStandardMaterial
                color={COLORS.hot}
                emissive={COLORS.hot}
                ref={(m) => {
                  preburnerGlow.current[i] = m;
                }}
                emissiveIntensity={0}
              />
            </mesh>
          )}
        </group>
      ))}
      <group position={pogo} scale={POGO_SCALE} onClick={pick("pogo")}>
        <PogoAccumulator cut={pogoCut} />
      </group>
      <Pipe
        points={[
          OXYGEN_ACCUMULATOR_TAP,
          [1.31, 1.35, 0.38],
          [pogo[0], pogo[1] - 0.41 * POGO_SCALE, pogo[2]],
        ]}
        radius={0.082}
      />
      {paths.map((p, i) => (
        <Duct key={i} {...p} live={live} topic={topic} display={flowDisplay} />
      ))}
      {!cut && (
        <group
          position={partPosition("controller", exploded)}
          onClick={pick("controller")}
        >
          <Controller />
        </group>
      )}
      <group ref={reaction} position-y={0.89} visible={false}>
        <mesh scale={[0.24, 0.32, 0.24]}>
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial
            color="#fff0b1"
            emissive="#ffbd58"
            emissiveIntensity={2}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      </group>
      <Plume live={live} compact={compact} />
      {!compact && (
        <group
          ref={thrustArrow}
          position={[1.94, -2.7, 0.1]}
          visible={false}
          onClick={pick("nozzle")}
        >
          <mesh position-y={0.8}>
            <cylinderGeometry args={[0.022, 0.022, 1.6, 10]} />
            <meshBasicMaterial color="#ebcc96" />
          </mesh>
          <mesh position-y={1.7}>
            <coneGeometry args={[0.1, 0.25, 14]} />
            <meshBasicMaterial color="#ebcc96" />
          </mesh>
        </group>
      )}
      {cut && (
        <Duct
          points={[
            [0, 1.15, 0],
            [0, 0.57, 0],
            [0, 0, 0],
            [0, -1, 0],
            [0, -3.05, 0],
          ]}
          fluid="main"
          radius={0.105}
          live={live}
          display={display}
          topic={topic}
        />
      )}
    </group>
  );
}
