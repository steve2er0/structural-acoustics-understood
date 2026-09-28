/** Visual mappings never mutate physical values. Lab policies choose their own limits. */
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export function logPosition(value: number, min: number, max: number) {
  if (!(min > 0 && max > min))
    throw new Error("Log scale requires 0 < min < max");
  return Math.log(value / min) / Math.log(max / min);
}
export const fromLogPosition = (position: number, min: number, max: number) =>
  min * (max / min) ** clamp01(position);
export const slowPlayback = (
  frequency: number,
  base: number,
  slope: number,
  cap: number,
) => Math.min(cap, base + slope * Math.log10(frequency));
export const visualLength = (physical: number, gain: number, max = Infinity) =>
  Math.min(max, Math.abs(physical) * gain);
export const smoothstep = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export function sharedMotionGain(
  referenceAmplitude: number,
  preferredTravel: number,
  maximumAmplitude: number,
  maximumTravel: number,
) {
  return Math.min(
    preferredTravel / Math.max(referenceAmplitude, 1e-20),
    maximumTravel / Math.max(maximumAmplitude, 1e-20),
  );
}
