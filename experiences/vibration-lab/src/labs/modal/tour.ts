import type { View } from "./Scene";
import type { Domain } from "./Plots";
export interface TourStep {
  duration: number;
  title: string;
  copy: string;
  view: View;
  domain: Domain;
  action?:
    | "reset"
    | "hit"
    | "mode"
    | "nodes"
    | "grid"
    | "rove1"
    | "rove2"
    | "rebuild"
    | "damp"
    | "finish";
  focus?: string;
}
export const TOUR: readonly TourStep[] = [
  {
    duration: 4,
    title: "One plate. Many ways to move.",
    copy: "A thin aluminium plate holds a family of bending modes. One impact can excite several at once.",
    view: "System",
    domain: "Time",
    action: "reset",
  },
  {
    duration: 4,
    title: "Let the edges move.",
    copy: "Soft cords approximate free edges above the suspension resonances. Our model retains six bending modes and omits suspension motion.",
    view: "Plate",
    domain: "Time",
    focus: "suspension",
  },
  {
    duration: 4,
    title: "Measure the input.",
    copy: "The force transducer inside the hammer records the actual contact pulse. Tip hardness sets its duration.",
    view: "Hammer",
    domain: "Time",
  },
  {
    duration: 4,
    title: "Keep a fixed reference.",
    copy: "This accelerometer measures transverse acceleration. It stays at A5 while the hammer moves.",
    view: "Accelerometer",
    domain: "Time",
  },
  {
    duration: 6,
    title: "Strike. Then listen.",
    copy: "The force pulse starts the motion. Both traces and the deformed surface follow the same event clock, slowed eight times.",
    view: "Plate",
    domain: "Time",
    action: "hit",
  },
  {
    duration: 4,
    title: "The force has ended. The response has not.",
    copy: "The plate rings down as its modes lose energy. Beating comes from the nearby 53.8 and 58.0 Hz modes.",
    view: "Plate",
    domain: "Time",
  },
  {
    duration: 5,
    title: "The same event, by frequency.",
    copy: "A softer tip spreads contact over time and loses high-frequency content. The response spectrum includes both that input and the structure.",
    view: "FRF",
    domain: "Spectra",
  },
  {
    duration: 5,
    title: "Divide response by input.",
    copy: "Complex A(f) / F(f) reveals accelerance. The solid trace is the synthetic measurement; the dashed trace is the modal model.",
    view: "FRF",
    domain: "FRF",
  },
  {
    duration: 5,
    title: "This peak has a shape.",
    copy: "Mode 1 is the first elastic bending mode. Its pole in the FRF and its deformation come from the same eigenvector.",
    view: "Mode Shape",
    domain: "FRF",
    action: "mode",
  },
  {
    duration: 4,
    title: "Some places barely move.",
    copy: "Pale nodal bands mark near-zero displacement. A hammer or sensor on a nodal line cannot see that mode well.",
    view: "Mode Shape",
    domain: "FRF",
    action: "nodes",
  },
  {
    duration: 4,
    title: "One location is only one sample.",
    copy: "To reveal the spatial pattern, strike several grid points while keeping the reference accelerometer fixed.",
    view: "Measurement Grid",
    domain: "FRF",
    action: "grid",
  },
  {
    duration: 6,
    title: "Rove the hammer to B2.",
    copy: "The second impact samples a different modal amplitude and sign. Green points indicate acquired locations.",
    view: "Plate",
    domain: "Time",
    action: "rove1",
  },
  {
    duration: 6,
    title: "Now measure A1.",
    copy: "The resonance frequencies stay fixed. The peaks change because the input location has changed.",
    view: "Plate",
    domain: "Time",
    action: "rove2",
  },
  {
    duration: 5,
    title: "Discrete measurements become a shape.",
    copy: "Measured complex residues provide signed samples. Interpolation fills nearby regions; sparse coverage is deliberately incomplete.",
    view: "Mode Shape",
    domain: "FRF",
    action: "rebuild",
  },
  {
    duration: 6,
    title: "Add damping. Watch energy disappear.",
    copy: "At 4% damping, the same plate rings for less time. The model uses that damping in both the transient and the FRF.",
    view: "Plate",
    domain: "Time",
    action: "damp",
  },
  {
    duration: 5,
    title: "Broader peaks. A shorter ring.",
    copy: "Higher damping lowers and broadens the resonance peaks. Nearby modes can overlap; peak width alone is then a poor damping estimate.",
    view: "FRF",
    domain: "FRF",
  },
  {
    duration: 6,
    title: "A peak is a physical pattern.",
    copy: "Input force → response → FRF → resonance → mode shape. Explore another peak, or collect more locations to refine your reconstruction.",
    view: "Mode Shape",
    domain: "FRF",
    action: "finish",
  },
];
