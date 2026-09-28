import { Quaternion, Vector3 } from "three";
export type V = [number, number, number];
export type Pump = "lpftp" | "hpftp" | "lpotp" | "hpotp";
// Model Y follows the thrust axis. The HAER elevations and photos 17/18 establish
// longitudinal shafts: LP pump inlets above their turbines; HP turbines above pumps.
// Clocking/clearances are photo-derived approximations, not surveyed CAD dimensions.
export const PUMP_LAYOUT: Record<Pump, { position: V; axis: V; scale: V }> = {
  lpftp: {
    position: [0.72, 2.13, -0.62],
    axis: [0, -1, 0],
    scale: [0.9, 0.9, 0.7],
  },
  lpotp: {
    position: [-0.78, 2.16, -0.58],
    axis: [0, -1, 0],
    scale: [0.86, 0.86, 0.66],
  },
  hpftp: {
    position: [-0.76, 1.17, 0.23],
    axis: [0, 1, 0],
    scale: [1.02, 1.02, 0.84],
  },
  hpotp: {
    position: [0.73, 1.2, 0.28],
    axis: [0, 1, 0],
    scale: [0.98, 0.98, 0.88],
  },
};
export const PART_POINTS = {
  lpftp: PUMP_LAYOUT.lpftp.position,
  hpftp: PUMP_LAYOUT.hpftp.position,
  lpotp: PUMP_LAYOUT.lpotp.position,
  hpotp: PUMP_LAYOUT.hpotp.position,
  fp: [-0.76, 1.86, 0.23],
  op: [0.73, 1.92, 0.28],
  injector: [0, 1.28, 0],
  chamber: [0, 0.83, 0],
  pogo: [1.13, 1.72, 0.65],
  controller: [-1.03, 1.05, 0.84],
} satisfies Record<string, V>;
export const POGO_SCALE = 0.78;
export const OXYGEN_ACCUMULATOR_TAP: V = [1.46, 1.5, 0.03];
export function explodedPoint(p: V, exploded: boolean, upper = false): V {
  return [
    p[0] + (exploded ? Math.sign(p[0]) * 0.8 : 0),
    p[1] + (exploded && upper ? 0.45 : 0),
    p[2],
  ];
}
export function pumpRotation(id: Pump) {
  return new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, 1),
    new Vector3(...PUMP_LAYOUT[id].axis),
  );
}
export function pumpPosition(id: Pump, exploded = false): V {
  return explodedPoint(PUMP_LAYOUT[id].position, exploded, id.startsWith("lp"));
}
export function pumpLocalPoint(id: Pump, local: V, exploded = false): V {
  return new Vector3(...local)
    .multiply(new Vector3(...PUMP_LAYOUT[id].scale))
    .applyQuaternion(pumpRotation(id))
    .add(new Vector3(...pumpPosition(id, exploded)))
    .toArray() as V;
}
export type PumpPort =
  "inlet" | "discharge" | "turbineInlet" | "turbineOutlet" | "boost";
export function pumpPort(id: Pump, port: PumpPort, exploded = false): V {
  const high = id.startsWith("hp"),
    fuel = id.includes("f");
  const local: Record<PumpPort, V> = {
    inlet: [0, 0, -0.68],
    discharge: [fuel ? -0.49 : 0.5, 0.05, -0.1],
    turbineInlet: [0, 0, high ? 0.66 : 0.39],
    turbineOutlet: [fuel ? 0.27 : -0.27, 0, high ? 0.5 : 0.3],
    boost: [0.08, -0.24, -0.72],
  };
  return pumpLocalPoint(id, local[port], exploded);
}
