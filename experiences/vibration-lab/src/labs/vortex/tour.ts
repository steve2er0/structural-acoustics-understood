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
    settings: DEFAULT,
    view: "Vehicle",
  },
  {
    duration: 9,
    title: "Vortices develop along the length.",
    copy: "The orange and teal cores begin at the forebody shoulders and extend down the leeward side. Both are present together; the dots follow prescribed spiraling paths aft.",
    settings: DEFAULT,
    view: "Wake",
  },
  {
    duration: 9,
    title: "Cut across the two cores.",
    copy: "Looking aft at midbody reveals two opposite rotation senses. This is a slice of lengthwise vortices, with axial air traveling into the page.",
    settings: DEFAULT,
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
    title: "Sideslip rotates the leeward side.",
    copy: "With sideslip, the pair moves around each body. Its downstream direction remains aft; local interference between the core and boosters is not solved.",
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
    title: "Zero incidence still has axial flow.",
    copy: "Set both angles to zero. The leeward pair fades but blue tracers continue nose to tail. Real base wakes and attachment disturbances remain outside this illustration.",
    settings: PRESETS[4].settings,
    view: "Vehicle",
  },
  {
    duration: 9,
    title: "Know where the picture stops.",
    copy: "These are prescribed longitudinal paths, not CFD. Strouhal gives a separate crossflow reference scale; shocks, asymmetric separation, gap jets and buffet require other models.",
    settings: PRESETS[5].settings,
    view: "Vehicle",
  },
];
