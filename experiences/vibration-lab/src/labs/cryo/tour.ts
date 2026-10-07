import type { CaseId, Settings } from "./physics";
import type { View } from "./Scene";
export type Display = "Mode shape" | "Pressure" | "Fluid motion";
export type AnalysisTab =
  "Compare" | "Pressure" | "Slosh" | "Fill sweep" | "Fourier coverage";
export const TOUR: readonly {
  duration: number;
  title: string;
  copy: string;
  settings: Partial<Settings>;
  caseId: CaseId;
  display: Display;
  view: View;
  tab: AnalysisTab;
  kind: "shell" | "slosh";
  n: number;
  sloshId: number;
}[] = [
  {
    duration: 10,
    title: "Start with the empty elastic shell.",
    copy: "The silver outline marks the undeformed tank. The dry comparison removes liquid inertia and pressure prestress. Mode amplitude is enlarged for visibility.",
    settings: {},
    caseId: "dry",
    display: "Mode shape",
    view: "Section",
    tab: "Compare",
    kind: "shell",
    n: 2,
    sloshId: 1,
  },
  {
    duration: 11,
    title: "The wetted wall accelerates liquid.",
    copy: "At 85% fill, much of the wall is in contact with LOX. The fluid mass matrix couples wall motions through the liquid; its dynamic inertia depends on the mode shape.",
    settings: {},
    caseId: "mass",
    display: "Fluid motion",
    view: "Section",
    tab: "Compare",
    kind: "shell",
    n: 2,
    sloshId: 1,
  },
  {
    duration: 11,
    title: "Pressure changes the loaded stiffness.",
    copy: "31 psig supplies a uniform differential pressure. At 2 g, the LOX head increases with depth. The pressure-only comparison isolates the reduced geometric stiffness contribution.",
    settings: {},
    caseId: "pressure",
    display: "Pressure",
    view: "Section",
    tab: "Pressure",
    kind: "shell",
    n: 2,
    sloshId: 1,
  },
  {
    duration: 10,
    title: "Inertia and prestress act together.",
    copy: "The same generalized eigenproblem now contains structural stiffness plus pressure stiffness, and structural mass plus liquid inertia. The net frequency change depends on their balance.",
    settings: {},
    caseId: "combined",
    display: "Mode shape",
    view: "Tank",
    tab: "Compare",
    kind: "shell",
    n: 2,
    sloshId: 1,
  },
  {
    duration: 12,
    title: "Retain seven free-surface eigenvectors.",
    copy: "The slosh basis includes directional pairs and one axisymmetric mode. The free surface and shell exchange motion only where their spatial patterns overlap. They are solved together.",
    settings: {},
    caseId: "coupled",
    display: "Fluid motion",
    view: "Surface",
    tab: "Slosh",
    kind: "slosh",
    n: 1,
    sloshId: 1,
  },
  {
    duration: 11,
    title: "Acceleration sets the slosh restoring force.",
    copy: "Reducing effective acceleration from 2 g to 0.5 g halves ideal gravity-slosh frequencies. It also reduces liquid head, while the uniform ullage pressure stays at 31 psig.",
    settings: { accelerationG: 0.5 },
    caseId: "coupled",
    display: "Fluid motion",
    view: "Surface",
    tab: "Pressure",
    kind: "slosh",
    n: 1,
    sloshId: 1,
  },
  {
    duration: 10,
    title: "LH₂ is much less dense.",
    copy: "At the same fill and effective acceleration, ideal gravity-slosh frequencies are similar. LH₂ contributes much less fluid inertia and liquid pressure head. The coupled shell result changes.",
    settings: { fluid: "lh2" },
    caseId: "coupled",
    display: "Mode shape",
    view: "Section",
    tab: "Compare",
    kind: "shell",
    n: 2,
    sloshId: 1,
  },
  {
    duration: 11,
    title: "Follow the mode as the liquid level changes.",
    copy: "Move the fill slider to change the wetted geometry. Follow one shell branch through small fill steps. Its shape can evolve away from the dry shape; inspect continuation quality near mixed modes.",
    settings: {},
    caseId: "coupled",
    display: "Mode shape",
    view: "Section",
    tab: "Fill sweep",
    kind: "shell",
    n: 2,
    sloshId: 1,
  },
  {
    duration: 11,
    title: "Inspect a shorter angular wavelength.",
    copy: "n = 12 makes twelve circumferential lobes. The wetted shell still accelerates liquid. This order has a rigid free surface in the reduction; the seven retained lower-order slosh shapes do not couple to it. The inspector reaches n = 12, while Fourier coverage searches additional families through n = 20.",
    settings: {},
    caseId: "mass",
    display: "Mode shape",
    view: "Surface",
    tab: "Compare",
    kind: "shell",
    n: 12,
    sloshId: 1,
  },
];
