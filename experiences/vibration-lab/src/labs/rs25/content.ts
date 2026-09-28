import { PART_POINTS } from "./layout";
import type { CameraPresets } from "@engine/Camera";
export const DISPLAYS = [
  "Assembled",
  "Cutaway",
  "Flow",
  "Exploded",
  "Cycle",
] as const;
export type Display = (typeof DISPLAYS)[number];
export const TOPICS = [
  "Full engine",
  "Shock diamonds",
  "Follow LH₂",
  "Follow LOX",
  "Turbopumps",
  "LPFTP dynamics",
  "Pogo suppression",
  "Preburners",
  "Main combustion",
  "Cooling",
  "Nozzle",
  "Power flow",
  "Pressure",
  "Thermal",
] as const;
export type Topic = (typeof TOPICS)[number];
export type Part =
  | "engine"
  | "lpftp"
  | "hpftp"
  | "lpotp"
  | "hpotp"
  | "fp"
  | "op"
  | "injector"
  | "chamber"
  | "nozzle"
  | "cooling"
  | "controller"
  | "pogo";
export const PARTS: Record<
  Part,
  {
    name: string;
    short: string;
    tag: string;
    copy: string;
    chain: string;
    point: [number, number, number];
  }
> = {
  engine: {
    name: "One engine. Two burns.",
    short: "Full engine",
    tag: "FUEL-RICH STAGED COMBUSTION",
    copy: "First, preburners power the machinery. Then their turbine exhaust joins the main combustion. Follow the propellant all the way to thrust.",
    chain: "PREBURNERS → TURBINES → PUMPS → CHAMBER",
    point: [0, 1.4, 0],
  },
  lpftp: {
    name: "A better inlet.",
    short: "LPFTP",
    tag: "LOW-PRESSURE FUEL TURBOPUMP",
    copy: "The upper hydrogen inlet leads into this longitudinal pump. Its turbine sits below and runs on hydrogen warmed while cooling the main chamber. The large transfer duct feeds the high-pressure pump.",
    chain: "CHAMBER COOLANT → TURBINE → HGM JACKET → INJECTOR",
    point: PART_POINTS.lpftp,
  },
  hpftp: {
    name: "Pressure takes power.",
    short: "HPFTP",
    tag: "HIGH-PRESSURE FUEL TURBOPUMP",
    copy: "The fuel preburner sits above the turbine and multistage pump on a shared longitudinal shaft. Hydrogen enters the pump at the lower end, then leaves at high pressure for cooling and bypass paths.",
    chain: "FUEL PREBURNER → TURBINE → SHAFT → PUMP",
    point: PART_POINTS.hpftp,
  },
  lpotp: {
    name: "The oxygen booster.",
    short: "LPOTP",
    tag: "LOW-PRESSURE OXIDIZER TURBOPUMP",
    copy: "Oxygen enters at the top of this longitudinal pump. Its lower hydraulic turbine uses oxygen tapped from the HPOTP, then returns it to the low-pressure pump outlet.",
    chain: "HPOTP TAP → HYDRAULIC TURBINE → LPOTP OUTLET",
    point: PART_POINTS.lpotp,
  },
  hpotp: {
    name: "Two pressure duties.",
    short: "HPOTP",
    tag: "HIGH-PRESSURE OXIDIZER TURBOPUMP",
    copy: "The oxidizer preburner drives the upper turbine on this longitudinal shaft. The pump below sends most oxygen to the main injector; a boost stage raises the preburner supply pressure further.",
    chain: "MAIN PUMP → MAIN INJECTOR / BOOST → PREBURNERS",
    point: PART_POINTS.hpotp,
  },
  fp: {
    name: "Burn once to pump.",
    short: "Fuel preburner",
    tag: "HYDROGEN-RICH TURBINE GAS",
    copy: "A small oxygen supply reacts with excess hydrogen. Fuel-rich gas provides turbine work at a lower temperature than a near-stoichiometric burn.",
    chain: "H₂ + SOME O₂ → HOT GAS → HPFTP TURBINE",
    point: PART_POINTS.fp,
  },
  op: {
    name: "Also fuel-rich.",
    short: "Oxidizer preburner",
    tag: "THE NAME IDENTIFIES THE PUMP IT DRIVES",
    copy: "The oxidizer preburner is fuel-rich too. Its hot gas powers the high-pressure oxygen turbopump, then travels through the hot-gas manifold toward the main injector.",
    chain: "HOT GAS → HPOTP TURBINE → HGM → INJECTOR",
    point: PART_POINTS.op,
  },
  injector: {
    name: "Distribute. Mix. Burn.",
    short: "Main injector",
    tag: "MANY SMALL STREAMS",
    copy: "Oxygen enters through distributed injector elements. Fuel-rich turbine exhaust and the warmed hydrogen cooling stream meet it here. These illustrated jets are conceptual, not blade or injector CAD.",
    chain: "MAIN LOX + FUEL-RICH GAS + WARM H₂ → COMBUSTION",
    point: PART_POINTS.injector,
  },
  chamber: {
    name: "The main release.",
    short: "Main chamber",
    tag: "HIGH PRESSURE · HIGH TEMPERATURE",
    copy: "The remaining oxygen reacts with hydrogen in the main chamber. The chamber contains the high-pressure gas that will accelerate through the throat.",
    chain: "CHEMICAL ENERGY → HOT, PRESSURIZED GAS",
    point: PART_POINTS.chamber,
  },
  nozzle: {
    name: "Pressure into velocity.",
    short: "Nozzle",
    tag: "EXPAND THE GAS · ACCELERATE THE EXHAUST",
    copy: "Gas passes a narrow throat and accelerates in the diverging nozzle. Static pressure falls as directed exhaust speed rises. Ambient pressure changes the exit pressure contribution to thrust.",
    chain: "ṁVe + (Pe − Pa)Ae = THRUST",
    point: [0, -0.75, 0],
  },
  cooling: {
    name: "The fuel protects the wall.",
    short: "Cooling circuits",
    tag: "REGENERATIVE COOLING",
    copy: "Hydrogen absorbs heat through the chamber and nozzle walls. The chamber branch powers the LPFTP; nozzle coolant joins bypass hydrogen before reaching both preburners.",
    chain: "HOT GAS → WALL → HYDROGEN → ENGINE CYCLE",
    point: [-0.8, -0.1, 0.6],
  },
  pogo: {
    name: "A cushion in the oxygen line.",
    short: "Pogo accumulator",
    tag: "PASSIVE POGO SUPPRESSION",
    copy: "The spherical accumulator connects to the low-pressure oxygen discharge duct, ahead of the HPOTP. A compressible gas volume cushions pressure variations and helps interrupt the coupling between propellant flow, engine thrust and the vehicle’s longitudinal vibration.",
    chain: "LPOTP → OXYGEN DUCT + ACCUMULATOR → HPOTP",
    point: PART_POINTS.pogo,
  },
  controller: {
    name: "Command and observe.",
    short: "Controller & valves",
    tag: "SENSORS → CONTROLLER → ACTUATORS",
    copy: "The engine controller monitors conditions and commands actuators. MFV and MOV admit the main flows; FPOV and OPOV regulate preburner oxygen; CCV meters the fuel bypass/cooling distribution. Valve timing is not simulated.",
    chain: "MFV · MOV · FPOV · OPOV · CCV",
    point: PART_POINTS.controller,
  },
};
export const TOPIC_PART: Record<Topic, Part> = {
  "Full engine": "engine",
  "Shock diamonds": "nozzle",
  "Follow LH₂": "hpftp",
  "Follow LOX": "hpotp",
  Turbopumps: "hpftp",
  "LPFTP dynamics": "lpftp",
  "Pogo suppression": "pogo",
  Preburners: "fp",
  "Main combustion": "injector",
  Cooling: "cooling",
  Nozzle: "nozzle",
  "Power flow": "hpftp",
  Pressure: "engine",
  Thermal: "cooling",
};
export const CAMERAS: CameraPresets<
  | "Engine"
  | "Plume"
  | "Fuel side"
  | "Oxidizer side"
  | "LPFTP"
  | "HPFTP"
  | "LPOTP"
  | "HPOTP"
  | "Pogo accumulator"
  | "Preburners"
  | "Main chamber"
  | "Nozzle"
  | "Cutaway"
  | "Exploded"
> = {
  Engine: { position: [4.8, 2.3, 11.5], target: [0, -0.55, 0] },
  Plume: { position: [4.5, 2.0, 20], target: [4.5, 0, 0] },
  "Fuel side": { position: [-5.5, 2.9, -6.2], target: [-0.45, 1.5, 0] },
  "Oxidizer side": { position: [4.5, 2.9, 6.5], target: [0.35, 1.5, 0] },
  LPFTP: { position: [3.3, 3.5, -4.8], target: [0.72, 2.13, -0.62] },
  HPFTP: { position: [-3.7, 2.6, 4.8], target: [-0.76, 1.2, 0.23] },
  LPOTP: { position: [-1.5, 3.5, -5.5], target: [-0.78, 2.16, -0.58] },
  HPOTP: { position: [1.5, 2.6, 5.6], target: [0.73, 1.2, 0.28] },
  "Pogo accumulator": { position: [3.5, 2.7, 5.2], target: [0.85, 1.7, 0.4] },
  Preburners: { position: [2.8, 3.8, 5.9], target: [0, 1.96, 0.23] },
  "Main chamber": { position: [2, 2.5, 5.8], target: [0, 1.0, 0] },
  Nozzle: { position: [3.8, 1.7, 9.3], target: [0, -1.1, 0] },
  Cutaway: { position: [0.7, 2.7, 13.5], target: [0, -0.2, 0] },
  Exploded: { position: [5.8, 4, 13.5], target: [0, 0, 0] },
};
export type View = keyof typeof CAMERAS;
export const PART_VIEW: Record<Part, View> = {
  engine: "Engine",
  lpftp: "LPFTP",
  hpftp: "HPFTP",
  lpotp: "LPOTP",
  hpotp: "HPOTP",
  fp: "Preburners",
  op: "Preburners",
  injector: "Main chamber",
  chamber: "Main chamber",
  nozzle: "Nozzle",
  cooling: "Cutaway",
  controller: "Fuel side",
  pogo: "Pogo accumulator",
};
export const COLORS = {
  fuel: "#85dcf1",
  oxygen: "#b3baff",
  hot: "#f3b665",
  main: "#fff0bd",
  cooling: "#8ee1b3",
  metal: "#a9b8be",
};
export type Fluid = "fuel" | "oxygen" | "hot" | "main" | "cooling";
export const LEGEND: { key: Fluid; label: string; symbol: string }[] = [
  { key: "fuel", label: "LH₂ / hydrogen", symbol: "●" },
  { key: "oxygen", label: "LOX / oxygen", symbol: "◆" },
  { key: "hot", label: "Fuel-rich hot gas", symbol: "››" },
  { key: "cooling", label: "H₂ cooling", symbol: "┆" },
  { key: "main", label: "Combustion gas", symbol: "▸" },
];
