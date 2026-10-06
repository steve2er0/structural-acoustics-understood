import type { Settings } from "./physics";
import type { View } from "./Scene";
import type { AnalysisTab } from "./Plots";

export interface TourStep {
  duration: number;
  title: string;
  copy: string;
  settings: Partial<Settings>;
  view: View;
  tab: AnalysisTab;
  display: "Pressure" | "Response" | "Correlation";
  resonance?: boolean;
}

export const TOUR: readonly TourStep[] = [
  {
    duration: 9,
    title: "Pressure has a spatial pattern.",
    copy: "This panel sees 1 Pa²/Hz at every point. Follow the colored pressure patches downstream; their phase and spatial persistence determine the force accepted by the panel.",
    settings: { field: "tbl" },
    view: "Panel",
    tab: "Coherence",
    display: "Pressure",
  },
  {
    duration: 10,
    title: "Downstream: delayed, then decorrelated.",
    copy: "Tap B lies downstream of A. The phase follows −ωΔx/Uc, while the correlation envelope decays exponentially. A traveling pattern can have negative real correlation without being incoherent.",
    settings: { field: "tbl", ax: 0.2, ay: 0.5, bx: 0.75, by: 0.5 },
    view: "Top",
    tab: "Coherence",
    display: "Correlation",
  },
  {
    duration: 9,
    title: "Across the flow: a shorter memory.",
    copy: "The taps now share a streamwise station. There is no convective phase delay between them, but the larger spanwise coefficient makes their coherence decay faster.",
    settings: { field: "tbl", ax: 0.35, ay: 0.25, bx: 0.35, by: 0.75 },
    view: "Top",
    tab: "Coherence",
    display: "Correlation",
  },
  {
    duration: 10,
    title: "The boundary layer sets the context.",
    copy: "Uc is a fraction of the outer flow speed. δ99 marks the boundary-layer thickness; the ratios Lx/δ99 and Ly/δ99 reveal the pressure scales. Classical Corcos does not itself depend on thickness.",
    settings: { field: "tbl", delta: 0.08, convectionRatio: 0.8 },
    view: "Boundary layer",
    tab: "Coherence",
    display: "Pressure",
  },
  {
    duration: 10,
    title: "Find the wavelength the mode accepts.",
    copy: "The convective ridge sits at kx = ω/Uc. Moving it toward the selected mode's streamwise wavenumber strengthens the spatial overlap. Finite panel size and lateral decay also matter.",
    settings: { field: "tbl", velocity: 135, convectionRatio: 0.6 },
    view: "Panel",
    tab: "Wavenumber",
    display: "Response",
  },
  {
    duration: 10,
    title: "Diffuse acoustics arrive from many directions.",
    copy: "The same local pressure PSD now belongs to a three-dimensional isotropic acoustic field. Correlation depends only on separation distance and first crosses zero at half the acoustic wavelength.",
    settings: { field: "daf" },
    view: "Panel",
    tab: "Coherence",
    display: "Pressure",
  },
  {
    duration: 10,
    title: "A plane wave stays coherent.",
    copy: "PWF is one ideal progressive plane wave. Its coherence magnitude is one everywhere. Incidence and azimuth set its phase across the panel; at normal incidence the surface pressure is in phase.",
    settings: { field: "pwf", incidence: 55, azimuth: 30 },
    view: "Panel",
    tab: "Wavenumber",
    display: "Pressure",
  },
  {
    duration: 11,
    title: "Spatial match meets resonance.",
    copy: "The frequency is now the selected panel resonance. The response curves compare all three fields at the same point-pressure PSD. Strong local pressure is only effective when the structure accepts its spatial pattern.",
    settings: { field: "tbl" },
    view: "Panel",
    tab: "Response",
    display: "Response",
    resonance: true,
  },
];
