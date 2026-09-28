import { DEFAULTS, type Parameters } from "./physics";
import type { View } from "./state";
export interface IsolationStep {
  duration: number;
  title: string;
  copy: string;
  camera: View;
  parameters: Partial<Parameters>;
  forceFlow?: boolean;
  envelope?: boolean;
}
export const TOUR: readonly IsolationStep[] = [
  {
    duration: 6,
    title: "A moving base. A protected payload.",
    copy: "The shaker drives the lower fixture. Four parallel mounts connect it to the equipment above.",
    camera: "System",
    parameters: { ...DEFAULTS },
  },
  {
    duration: 6,
    title: "At low frequency, both move together.",
    copy: "At 5 Hz the payload follows the base. The mounts provide almost no isolation.",
    camera: "Side",
    parameters: { frequency: 5 },
  },
  {
    duration: 7,
    title: "Resonance amplifies the motion.",
    copy: "At the 25 Hz natural frequency, a small base input produces a much larger payload response.",
    camera: "System",
    parameters: { frequency: 25 },
    envelope: true,
  },
  {
    duration: 7,
    title: "Damping controls the peak.",
    copy: "Increase damping at resonance. The mounts dissipate more energy and the payload response falls.",
    camera: "Isolator",
    parameters: { frequency: 25, zeta: 0.4 },
    forceFlow: true,
  },
  {
    duration: 7,
    title: "Above the threshold, isolation begins.",
    copy: "Return to low damping at 100 Hz. The payload now moves much less than the base. Motion is magnified for visibility; the ratio remains physical.",
    camera: "System",
    parameters: { frequency: 100, zeta: 0.08 },
    envelope: true,
  },
];
export function tourParameters(index: number) {
  return TOUR.slice(0, index + 1).reduce(
    (p, s) => ({ ...p, ...s.parameters }),
    { ...DEFAULTS },
  );
}
