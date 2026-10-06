import { DEFAULT, PRESETS, type Settings } from "./physics";
import type { View } from "./Scene";
interface Step {
  duration: number;
  title: string;
  copy: string;
  settings: Settings;
  view: View;
}
export const TOUR: readonly Step[] = [
  {
    duration: 8,
    title: "Air flows from nose to tail.",
    copy: "The vehicle is fixed in this view. Blue arrows and tracers show the full relative-air velocity, dominated by its axial component during ascent.",
    settings: { ...DEFAULT, alpha: 0 },
    view: "Vehicle",
  },
  {
    duration: 9,
    title: "The forward bracket is the source.",
    copy: "The golden bracket connects the booster to the core. Its bluff-body wake sheds coherent disturbances that travel aft through the gap. It does not originate at the vehicle nose.",
    settings: { ...DEFAULT, alpha: 0 },
    view: "Attachment",
  },
  {
    duration: 9,
    title: "Pressure reaches both facing surfaces.",
    copy: "The colored midbody map shows pressure on the core and boosters downstream of the forward attachment. The alternating flanks carry 1×, while the wake centerline carries a symmetric 2× component. Use the tap comparison to see both in the pressure spectrum.",
    settings: { ...DEFAULT, alpha: 0 },
    view: "Cross-section",
  },
  {
    duration: 8,
    title: "Mach sets the travel speed.",
    copy: "Increasing Mach raises axial and transverse speed at fixed angles. Playback is slowed automatically to keep transport visible; the physical-time factor is displayed.",
    settings: { ...DEFAULT, mach: 0.6 },
    view: "Vehicle",
  },
  {
    duration: 8,
    title: "Sideslip skews the attachment wake.",
    copy: "Changing sideslip shifts the assumed wake footprint. The source stays fixed to the bracket. The constrained gap path is illustrative, not a computed interference solution.",
    settings: PRESETS[1].settings,
    view: "Cross-section",
  },
  {
    duration: 8,
    title: "Pitch and yaw combine.",
    copy: "The complete velocity vector sets the incoming flow and the direction of the aft wake. A larger gap separates the bodies geometrically; it is not a solved shielding model.",
    settings: { ...PRESETS[2].settings, gap: 1.8 },
    view: "Vehicle",
  },
  {
    duration: 8,
    title: "Axial flow still sheds from the bracket.",
    copy: "At zero angle of attack and sideslip, air still passes the forward attachment. Its wake and surface pressure remain active. Removing the boosters removes this source.",
    settings: PRESETS[4].settings,
    view: "Vehicle",
  },
  {
    duration: 9,
    title: "Know where the picture stops.",
    copy: "NASA identifies strong transonic shock–attachment-wake interactions. This demo illustrates the source and downstream footprint; it does not predict those shocks, buffet amplification or flight loads.",
    settings: PRESETS[5].settings,
    view: "Vehicle",
  },
];
