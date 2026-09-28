/** Physics inputs remain SI. These are display conversions, never model state. */
export const GRAVITY = 9.80665;
export const LB_TO_KG = 0.45359237;
export const TAU = 2 * Math.PI;
const INCH = 0.0254;
export const UNITS = {
  Hz: ["frequency", 1],
  "rad/s": ["frequency", 1 / TAU],
  N: ["force", 1],
  lbf: ["force", LB_TO_KG * GRAVITY],
  kg: ["mass", 1],
  lbm: ["mass", LB_TO_KG],
  m: ["length", 1],
  mm: ["length", 1e-3],
  µm: ["length", 1e-6],
  nm: ["length", 1e-9],
  in: ["length", INCH],
  "m/s": ["velocity", 1],
  "in/s": ["velocity", INCH],
  "m/s²": ["acceleration", 1],
  g: ["acceleration", GRAVITY],
  V: ["voltage", 1],
  A: ["current", 1],
  Ω: ["resistance", 1],
  W: ["power", 1],
  "N/m": ["stiffness", 1],
  "kN/m": ["stiffness", 1000],
  "lbf/in": ["stiffness", (LB_TO_KG * GRAVITY) / INCH],
  T: ["flux", 1],
} as const;
export type Unit = keyof typeof UNITS;
export const fromSI = (value: number, unit: Unit) => value / UNITS[unit][1];
export const toSI = (value: number, unit: Unit) => value * UNITS[unit][1];
export function convert(value: number, from: Unit, to: Unit) {
  if (UNITS[from][0] !== UNITS[to][0])
    throw new Error(`Incompatible units: ${from} / ${to}`);
  return fromSI(toSI(value, from), to);
}
export function engineeringNumber(value: number, significant = 3) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const rounded = Number(value.toPrecision(significant));
  return Math.abs(rounded) >= 1e6 || Math.abs(rounded) < 1e-3
    ? rounded.toExponential(significant - 1)
    : String(rounded);
}
export const formatSI = (value: number, unit: Unit, significant = 3) =>
  `${engineeringNumber(fromSI(value, unit), significant)} ${unit}`;
export function displacement(
  value: number,
  profile: "isolation" | "shaker" = "shaker",
) {
  const a = Math.abs(value);
  const unit: Unit =
    profile === "shaker"
      ? a >= 0.001
        ? "mm"
        : a >= 1e-6
          ? "µm"
          : "nm"
      : a >= 1e-5
        ? "mm"
        : a >= 1e-8
          ? "µm"
          : "nm";
  const digits =
    profile === "shaker"
      ? unit === "mm"
        ? 2
        : 1
      : unit === "mm" && a < 0.001
        ? 3
        : 2;
  return `${fromSI(value, unit).toFixed(digits)} ${unit}`;
}
