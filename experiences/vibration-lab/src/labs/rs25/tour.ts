import type { Part, Display, Topic, View } from "./content";
import type { LPFTPSettings } from "./lpftp";
export interface TourStep {
  title: string;
  copy: string;
  duration: number;
  part: Part;
  display: Display;
  topic: Topic;
  view: View;
  power: number;
  on: boolean;
  ambient?: number;
  lpftp?: Partial<LPFTPSettings>;
}
const step = (
  title: string,
  copy: string,
  part: Part,
  view: View,
  topic: Topic = "Full engine",
  display: Display = "Flow",
  power = 100,
  on = true,
): TourStep => ({
  title,
  copy,
  part,
  view,
  topic,
  display,
  power,
  on,
  duration: 5,
});
export const TOUR: TourStep[] = [
  step(
    "Meet the RS-25.",
    "A compact engine with a remarkable cycle. It served on every Shuttle mission and continues in the SLS era.",
    "engine",
    "Engine",
    "Full engine",
    "Assembled",
    100,
    false,
  ),
  step(
    "Two cryogenic propellants.",
    "Hydrogen is the fuel; oxygen is the oxidizer. Follow their separate supply paths.",
    "engine",
    "Engine",
  ),
  step(
    "First, protect the inlet.",
    "Low-pressure pumps feed the high-pressure pumps. LPFTP uses warmed hydrogen; LPOTP uses recirculating pressurized oxygen.",
    "lpftp",
    "LPFTP",
    "Turbopumps",
    "Cutaway",
  ),
  {
    ...step(
      "Four blade passages per turn.",
      "The LPFTP has four main blades plus four splitters. A fixed pressure probe sees a 4N blade-passing tone and harmonics. Change power: frequencies move, shaft orders stay fixed.",
      "lpftp",
      "LPFTP",
      "LPFTP dynamics",
      "Cutaway",
    ),
    duration: 7,
    lpftp: { source: "Blade tones" },
  },
  {
    ...step(
      "A separate cavity rhythm.",
      "Higher-order surge cavitation adds an approximately 6.4–6.7N excitation. Cavities pulse in phase around the annulus. The chosen amplitude illustrates this source; it does not predict onset or damage.",
      "lpftp",
      "LPFTP",
      "LPFTP dynamics",
      "Cutaway",
    ),
    duration: 7,
    lpftp: { source: "Combined", strength: 0.85, order: 6.55 },
  },
  step(
    "Then raise the pressure.",
    "High-pressure turbopumps supply the combustion system. The hydrogen pump has multiple illustrated stages.",
    "hpftp",
    "HPFTP",
    "Turbopumps",
    "Cutaway",
  ),
  step(
    "Pumping needs power.",
    "Pressure rise times volume flow gives fluid power. Shaft power must also cover pump losses.",
    "hpftp",
    "HPFTP",
    "Power flow",
    "Cutaway",
  ),
  step(
    "Burn some propellant upstream.",
    "Both preburners are fuel-rich. The oxidizer preburner is named for the pump it drives, not an oxygen-rich mixture.",
    "op",
    "Preburners",
    "Preburners",
    "Cutaway",
  ),
  step(
    "Hot gas carries energy.",
    "The fuel preburner supplies the fuel turbine; the oxidizer preburner supplies the oxygen turbine.",
    "fp",
    "Preburners",
    "Power flow",
  ),
  step(
    "Gas energy becomes rotation.",
    "A turbine extracts work from the gas. Turbine and pump turn on a shared shaft.",
    "hpftp",
    "HPFTP",
    "Power flow",
    "Cutaway",
  ),
  step(
    "Rotation becomes pressure.",
    "The pump transfers mechanical work into the propellant. The oxygen boost stage also supplies the preburners.",
    "hpotp",
    "HPOTP",
    "Pressure",
    "Cutaway",
  ),
  step(
    "Fuel also cools the engine.",
    "Heat passes through the hot wall into hydrogen. The chamber and nozzle use distinct coolant branches.",
    "cooling",
    "Cutaway",
    "Cooling",
    "Cutaway",
  ),
  step(
    "The coolant stays in the cycle.",
    "Chamber coolant drives LPFTP and cools the powerhead. Nozzle coolant joins bypass hydrogen feeding the preburners.",
    "lpftp",
    "Fuel side",
    "Follow LH₂",
    "Flow",
  ),
  step(
    "Meet at the main injector.",
    "Turbine exhaust is routed to the main injector through the hot-gas manifold, alongside the main oxygen supply.",
    "injector",
    "Main chamber",
    "Main combustion",
    "Cutaway",
  ),
  step(
    "Complete the main combustion.",
    "Distributed streams mix and react. The readout tracks a representative chamber pressure tied to power level.",
    "chamber",
    "Main chamber",
    "Main combustion",
    "Cutaway",
  ),
  step(
    "Squeeze through the throat.",
    "High-pressure chamber gas reaches the narrow throat. The nozzle then opens out into its familiar bell.",
    "nozzle",
    "Nozzle",
    "Nozzle",
    "Cutaway",
  ),
  step(
    "Expand. Accelerate.",
    "Static pressure falls through the diverging nozzle as exhaust speed rises. This is a conceptual flow field, not CFD.",
    "nozzle",
    "Nozzle",
    "Nozzle",
    "Cutaway",
  ),
  step(
    "Momentum becomes thrust.",
    "Vacuum thrust combines exhaust momentum and exit pressure acting over the nozzle area.",
    "nozzle",
    "Engine",
    "Full engine",
    "Flow",
  ),
  step(
    "One connected machine.",
    "Trace either propellant. The hot gas that powers the high-pressure turbines continues into the main combustion system.",
    "engine",
    "Engine",
    "Full engine",
    "Cycle",
  ),
  step(
    "Turn up the power.",
    "At 109% of the original rated power, the reference vacuum thrust is about 512,000 lbf. Flow, pressure and pump work rise together.",
    "engine",
    "Engine",
    "Full engine",
    "Flow",
    109,
  ),
  {
    ...step(
      "The atmosphere squeezes back.",
      "At sea level the exhaust is overexpanded. Ambient air turns it inward, creating a train of standing compression and expansion cells.",
      "nozzle",
      "Plume",
      "Shock diamonds",
      "Assembled",
      100,
    ),
    ambient: 101325,
  },
  {
    ...step(
      "Less air. Wider exhaust.",
      "Lower the ambient pressure. The jet expands first and its shock-cell pattern stretches. These are illustrative shapes, not a CFD prediction.",
      "nozzle",
      "Plume",
      "Shock diamonds",
      "Assembled",
      100,
    ),
    ambient: 5000,
  },
  {
    ...step(
      "Vacuum changes the picture.",
      "There is no atmospheric confinement. The plume expands freely, the repeated shock diamonds disappear, and ambient pressure no longer subtracts from thrust.",
      "nozzle",
      "Plume",
      "Shock diamonds",
      "Assembled",
      109,
    ),
    ambient: 0,
  },
];
