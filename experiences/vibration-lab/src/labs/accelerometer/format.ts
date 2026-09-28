export function number(n: number, digits = 2) {
  return Math.abs(n) < 0.5 * 10 ** -digits
    ? (0).toFixed(digits)
    : n.toFixed(digits);
}
export const signed = (n: number, digits = 2) =>
  `${n > 0 ? "+" : ""}${number(n, digits)}`;
export function frequency(f: number) {
  return f >= 1000
    ? `${(f / 1000).toFixed(f % 1000 === 0 ? 0 : 1)} kHz`
    : `${f < 1 ? f.toFixed(2) : f.toFixed(f < 10 ? 1 : 0)} Hz`;
}
export function voltage(v: number, signedValue = true) {
  const prefix = signedValue && v > 0 ? "+" : "";
  return Math.abs(v) < 0.9995
    ? `${prefix}${number(v * 1000, Math.abs(v) < 0.01 ? 1 : 0)} mV`
    : `${prefix}${number(v, 2)} V`;
}
