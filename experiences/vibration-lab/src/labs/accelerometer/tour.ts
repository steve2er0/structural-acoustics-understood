import { DEFAULT, G, type Settings } from "./physics";
import type { Display, Focus } from "./Sensor";
import type { View } from "./Scene";
export interface TourStep {
  duration: number;
  title: string;
  copy: string;
  view: View;
  display: Display;
  focus: Focus;
  settings: Partial<Settings>;
  panel: "Chain" | "Waveforms" | "Response";
  sweep?: boolean;
}
const step = (
  title: string,
  copy: string,
  view: View,
  focus: Focus,
  settings: Partial<Settings> = {},
  extra: Partial<TourStep> = {},
): TourStep => ({
  duration: 4,
  title,
  copy,
  view,
  focus,
  settings,
  display: "Cutaway",
  panel: "Chain",
  ...extra,
});
const STEPS: readonly TourStep[] = [
  step(
    "A small sensor. A moving structure.",
    "The mounting stud makes the housing follow the surface beneath it.",
    "System",
    "housing",
    { mode: "Manual", acceleration: 0 },
    { display: "Assembled" },
  ),
  step(
    "Look beneath the housing.",
    "A central post, a shear element, and an annular seismic mass form the sensing core.",
    "Cutaway",
    "mass",
  ),
  step(
    "The housing accelerates.",
    "Apply positive axial acceleration. The green arrow follows the housing acceleration.",
    "Cutaway",
    "housing",
    { acceleration: 5 * G },
  ),
  step(
    "The mass resists the change.",
    "In the moving housing frame, the inertial drive points the other way.",
    "Seismic Mass",
    "mass",
  ),
  step(
    "Force follows acceleration.",
    "A 3 g seismic mass at 5 g produces a 0.147 N inertial drive: F = −ma.",
    "Seismic Mass",
    "mass",
  ),
  step(
    "The ring is loaded in shear.",
    "The post follows the base. The mass loads the ceramic along the measurement axis.",
    "Piezoelectric Element",
    "piezo",
  ),
  step(
    "Stress becomes charge.",
    "Opposite electrode charges appear. Q = dF is our effective single-axis approximation.",
    "Piezoelectric Element",
    "piezo",
  ),
  step(
    "Twice the acceleration. Twice the charge.",
    "At 10 g, the flat-band load is 0.294 N and the generated charge magnitude is 73.5 pC.",
    "Cutaway",
    "piezo",
    { acceleration: 10 * G },
  ),
  step(
    "Reverse it.",
    "Negative acceleration reverses the load, electrode polarity, and conditioned signal.",
    "Piezoelectric Element",
    "piezo",
    { acceleration: -10 * G },
  ),
  step(
    "Condition the signal.",
    "IEPE electronics convert a high-impedance piezo signal to a low-impedance voltage.",
    "Electronics",
    "electronics",
    { acceleration: G },
  ),
  step(
    "One cable carries power and signal.",
    "A 4 mA constant-current supply powers this example. The signal rides on a 12 V bias.",
    "Electronics",
    "electronics",
  ),
  step(
    "Read the sensitivity.",
    "100 mV/g means that a 1 g dynamic acceleration produces a 100 mV AC signal.",
    "Cutaway",
    "piezo",
    { acceleration: G },
  ),
  step(
    "Ten g. One volt.",
    "10 g × 100 mV/g = 1.00 V. Manual mode freezes a dynamic instant; it does not simulate DC output.",
    "Cutaway",
    "piezo",
    { acceleration: 10 * G },
  ),
  step(
    "Make it sinusoidal.",
    "The actual input is 100 Hz, 10 g peak. The visual clock slows it to 0.75 Hz.",
    "Cutaway",
    "mass",
    { mode: "Sine", frequency: 100, amplitude: 10 * G },
    { panel: "Waveforms" },
  ),
  step(
    "Two signals. One event.",
    "Acceleration and voltage use the same phase clock. In the flat band, their shapes closely match.",
    "System",
    "electronics",
    {},
    { panel: "Waveforms" },
  ),
  step(
    "Explore the frequency response.",
    "A steady-state sweep holds acceleration amplitude fixed while changing physical frequency.",
    "Frequency Response",
    "mass",
    {},
    { panel: "Response", duration: 7, sweep: true },
  ),
  step(
    "The useful region.",
    "Well above the electrical corner and below mechanical resonance, sensitivity stays nearly constant.",
    "Frequency Response",
    "mass",
    { frequency: 1000 },
    { panel: "Response" },
  ),
  step(
    "The sensor has its own resonance.",
    "At 24 kHz the internal mass motion amplifies. The same 10 g can produce about 6.67 V.",
    "Seismic Mass",
    "mass",
    { frequency: 24000 },
    { panel: "Response" },
  ),
  step(
    "More motion. More measurement error.",
    "This is the accelerometer responding to its own dynamics. Its phase is now about −90°.",
    "Piezoelectric Element",
    "piezo",
    { frequency: 24000 },
    { panel: "Waveforms" },
  ),
  step(
    "At very low frequency, charge leaks away.",
    "Inertial loading remains, but electrical conditioning attenuates the changing signal. True DC output is zero.",
    "Electronics",
    "electronics",
    { frequency: 0.05 },
    { panel: "Response" },
  ),
  step(
    "From motion to a measurement.",
    "Acceleration → inertial loading → piezoelectric charge → voltage. A useful measurement also needs a useful frequency band.",
    "Cutaway",
    "piezo",
    { mode: "Manual", acceleration: G },
    { panel: "Chain", duration: 5 },
  ),
];

// Every stop owns its full input state, so backward seeking restores the same
// experiment as forward playback, including across the manual/sine boundary.
let cumulativeSettings: Settings = { ...DEFAULT };
export const TOUR: readonly TourStep[] = STEPS.map((stage) => {
  cumulativeSettings = { ...cumulativeSettings, ...stage.settings };
  return { ...stage, settings: cumulativeSettings };
});
