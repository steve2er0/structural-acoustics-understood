/** Snapshot of autoSEA's createFalcon9InspiredGeometry (2026-09-27).
 * Construction properties and internal stations are conceptual, not SpaceX data.
 * See docs/SEA_MODEL.md for the source files and the adaptation boundary.
 */
export const ENVELOPE = {
  height: 70,
  diameter: 3.7,
  fairingHeight: 13.1,
  fairingDiameter: 5.2,
};
export const MATERIALS = {
  aluminum: {
    name: "Assumed aluminum",
    young: 73.1e9,
    density: 2700,
    poisson: 0.33,
  },
  composite: {
    name: "Assumed CFRP equivalent",
    young: 55e9,
    density: 1600,
    poisson: 0.3,
  },
};
export const FAIRING_CONTROL_POINTS = [
  [56.9, 1.85],
  [57.8, 2.6],
  [64.5, 2.6],
  [67.2, 2.35],
  [69.1, 1.45],
  [70, 0],
] as const;
/** Clamped cubic Hermite profile, matching autoSEA's six samples per span. */
export function fairingProfile(): [number, number][] {
  const p = FAIRING_CONTROL_POINTS;
  const slopes = p.map((_, i) => {
    const a = p[Math.max(0, i - 1)],
      b = p[Math.min(p.length - 1, i + 1)];
    return (b[1] - a[1]) / (b[0] - a[0]);
  });
  const result: [number, number][] = [[...p[0]]];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i],
      b = p[i + 1],
      l = b[0] - a[0];
    for (let j = 1; j <= 6; j++) {
      const t = j / 6;
      const r =
        (2 * t ** 3 - 3 * t ** 2 + 1) * a[1] +
        (t ** 3 - 2 * t ** 2 + t) * l * slopes[i] +
        (-2 * t ** 3 + 3 * t ** 2) * b[1] +
        (t ** 3 - t ** 2) * l * slopes[i + 1];
      result.push([
        a[0] + l * t,
        Math.max(Math.min(a[1], b[1]), Math.min(Math.max(a[1], b[1]), r)),
      ]);
    }
  }
  return result;
}
const profile = fairingProfile();
export const FAIRING_AREA = profile.slice(1).reduce((sum, p, i) => {
  const a = profile[i];
  return sum + Math.PI * (a[1] + p[1]) * Math.hypot(p[0] - a[0], p[1] - a[1]);
}, 0);
export const CAVITY = {
  volume: 190,
  surfaceArea: 220,
  rt60: 1.5,
  density: 1.225,
  soundSpeed: 343,
};
export interface Subsystem {
  id: string;
  name: string;
  short: string;
  kind: "cylinder" | "disk" | "fairing" | "acoustic";
  start: number;
  end: number;
  thickness: number;
  area: number;
  material: keyof typeof MATERIALS;
  color: string;
  description: string;
}
export const SUBSYSTEMS: Subsystem[] = [
  {
    id: "aft-skirt",
    name: "Aft skirt",
    short: "Aft skirt",
    kind: "cylinder",
    start: 0,
    end: 3,
    thickness: 0.0032,
    area: 2 * Math.PI * 1.85 * 3,
    material: "aluminum",
    color: "#7ab6cc",
    description:
      "The lower shell connects to the first-stage barrel. The nine engine bells are visual context, not additional SEA subsystems.",
  },
  {
    id: "first-stage",
    name: "First-stage barrel",
    short: "Stage 1",
    kind: "cylinder",
    start: 3,
    end: 42.6,
    thickness: 0.0028,
    area: 2 * Math.PI * 1.85 * 39.6,
    material: "aluminum",
    color: "#5fc7e8",
    description:
      "The default 1 W structural source matches the autoSEA preset. Energy travels both toward the aft skirt and upward through the interstage.",
  },
  {
    id: "interstage",
    name: "Interstage",
    short: "Interstage",
    kind: "cylinder",
    start: 42.6,
    end: 47.1,
    thickness: 0.0045,
    area: 2 * Math.PI * 1.85 * 4.5,
    material: "composite",
    color: "#b5a0eb",
    description:
      "This shell bridges the stages. Its damping and two junctions control the structural path into the upper vehicle.",
  },
  {
    id: "second-stage",
    name: "Second-stage barrel",
    short: "Stage 2",
    kind: "cylinder",
    start: 47.1,
    end: 56.9,
    thickness: 0.0024,
    area: 2 * Math.PI * 1.85 * 9.8,
    material: "aluminum",
    color: "#62d7b2",
    description:
      "The upper barrel meets both the payload deck and the fairing at a shared ring. That branch is retained from the native autoSEA model.",
  },
  {
    id: "payload-deck",
    name: "Payload interface deck",
    short: "Deck",
    kind: "disk",
    start: 56.9,
    end: 56.9,
    thickness: 0.008,
    area: Math.PI * 1.85 ** 2,
    material: "aluminum",
    color: "#f1b964",
    description:
      "A circular structural deck closes the fairing base. It exchanges power with both adjacent shells and the fairing air volume.",
  },
  {
    id: "payload-fairing",
    name: "Payload fairing",
    short: "Fairing",
    kind: "fairing",
    start: 56.9,
    end: 70,
    thickness: 0.004,
    area: FAIRING_AREA,
    material: "composite",
    color: "#e1e7ee",
    description:
      "The smooth outer profile comes from autoSEA. Its shell exchanges energy with the upper structure and the enclosed acoustic cavity.",
  },
  {
    id: "ac-payload-fairing",
    name: "Fairing acoustic cavity",
    short: "Cavity",
    kind: "acoustic",
    start: 56.9,
    end: 70,
    thickness: 0,
    area: CAVITY.surfaceArea,
    material: "aluminum",
    color: "#ed99be",
    description:
      "The assumed 190 m³ air volume couples to the fairing skin and payload deck. It stores acoustic energy; it is not another structural shell.",
  },
];
export const JUNCTIONS = [
  { a: 0, b: 1, name: "Aft skirt ↔ Stage 1", kind: "structural" },
  { a: 1, b: 2, name: "Stage 1 ↔ Interstage", kind: "structural" },
  { a: 2, b: 3, name: "Interstage ↔ Stage 2", kind: "structural" },
  { a: 3, b: 4, name: "Stage 2 ↔ Deck", kind: "structural" },
  { a: 3, b: 5, name: "Stage 2 ↔ Fairing", kind: "structural" },
  { a: 4, b: 5, name: "Deck ↔ Fairing", kind: "structural" },
  { a: 4, b: 6, name: "Deck ↔ Cavity", kind: "acoustic" },
  { a: 5, b: 6, name: "Fairing ↔ Cavity", kind: "acoustic" },
] as const;
