import {
  DEFAULT,
  createModel,
  zeroEnergy,
  type Settings,
  type EnergyVector,
} from "./physics";
import type { Display } from "./Assembly";
import type { View } from "./Scene";
import type { Metric, Panel } from "./Plots";
interface Stage {
  duration: number;
  title: string;
  copy: string;
  settings: Settings;
  selected: number;
  view: View;
  display: Display;
  panel: Panel;
  metric: Metric;
  seed?: "zero" | "steady" | "equal";
  hold?: boolean;
}
const step = (
  title: string,
  copy: string,
  extra: Partial<Stage> = {},
): Stage => ({
  duration: 6,
  title,
  copy,
  settings: DEFAULT,
  selected: 1,
  view: "System",
  display: "Average energy",
  panel: "Energy",
  metric: "Total energy",
  ...extra,
});
export const TOUR: readonly Stage[] = [
  step(
    "Falcon 9, through an energy lens.",
    "This autoSEA-inspired stack has six structural regions and a fairing acoustic cavity. Construction properties remain explicit assumptions.",
    { display: "Assembled", settings: { ...DEFAULT, power: 0 }, seed: "zero" },
  ),
  step(
    "A network, not a single beam.",
    "Each colored region stores its own band-averaged energy. The network preserves six structural junctions and two paths into the air.",
    { settings: { ...DEFAULT, power: 0 } },
  ),
  step(
    "Inject one watt into the first stage.",
    "The source follows your autoSEA preset. Watch power spread toward the aft skirt and upward through the interstage.",
    { seed: "zero", duration: 9 },
  ),
  step(
    "The interstage is a transfer path.",
    "Its loss and junctions control how much power reaches the upper vehicle.",
    {
      selected: 2,
      view: "Subsystem 3",
      panel: "Power balance",
      seed: "steady",
    },
  ),
  step(
    "Damping intercepts some of that power.",
    "Increasing interstage loss lowers the energy transmitted onward. The balance still accounts for every watt.",
    {
      settings: {
        ...DEFAULT,
        loss: DEFAULT.loss.map((v, i) => (i === 2 ? 0.06 : v)),
      },
      selected: 2,
      view: "Subsystem 3",
      panel: "Power balance",
    },
  ),
  step(
    "The path branches at the payload deck.",
    "Stage 2, the circular deck and the fairing share a ring. Both direct shell coupling and the deck branch are retained.",
    { selected: 4, view: "Subsystem 5", seed: "steady" },
  ),
  step(
    "The fairing encloses another subsystem.",
    "The transparent skin exposes an assumed 190 m³ acoustic volume coupled to both the skin and the deck.",
    { selected: 6, view: "Subsystem 7", seed: "steady" },
  ),
  step(
    "Excite the air instead.",
    "A 1 W acoustic input reverses some paths: the cavity can drive the shell and deck. Input power is a teaching source, not a launch spectrum.",
    {
      settings: { ...DEFAULT, source: 6 },
      selected: 6,
      view: "Subsystem 7",
      seed: "zero",
      duration: 9,
    },
  ),
  step(
    "Absorption removes acoustic energy.",
    "A shorter reverberation time increases the cavity loss rate and reduces its stored energy.",
    {
      settings: { ...DEFAULT, source: 6, cavityRT: 0.3 },
      selected: 6,
      view: "Subsystem 7",
      panel: "Power balance",
    },
  ),
  step(
    "Equal energy does not mean equal modal energy.",
    "Freeze 20 mJ in every subsystem. Their very different modal populations produce different energy per mode and net junction powers.",
    {
      settings: { ...DEFAULT, power: 0 },
      selected: 4,
      seed: "equal",
      hold: true,
      metric: "Energy per mode",
    },
  ),
  step(
    "A band is a population of modes.",
    "Cylinder modal density varies near its ring frequency; acoustic density grows with frequency squared. Small populations still need care.",
    {
      settings: { ...DEFAULT, frequency: 31.5 },
      selected: 4,
      view: "Subsystem 5",
      panel: "Modal population",
      display: "Show modes",
      seed: "steady",
    },
  ),
  step(
    "Follow the energy through your vehicle.",
    "Change the input location, damping or a junction. The seven-state solution closes the global power balance.",
    { seed: "steady", panel: "Power balance", duration: 7 },
  ),
];
export const stageEnergy = (s: Stage): EnergyVector | undefined =>
  s.seed === "zero"
    ? zeroEnergy()
    : s.seed === "equal"
      ? zeroEnergy().map(() => 0.02)
      : s.seed === "steady"
        ? createModel(s.settings).steady
        : undefined;
