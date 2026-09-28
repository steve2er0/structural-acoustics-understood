/** Representative, memoryless excitation curve—not an FE solution or manufacturer specification. */
export const FIELD = {
  ratedCurrent: 12,
  resistance: 5,
  turns: 600,
  nominalB: 1.2,
  saturationB: 1.6,
  activeWireLength: 200 / 3,
};
const calibration = Math.atanh(FIELD.nominalB / FIELD.saturationB);
export function gapFluxDensity(fieldCurrent: number) {
  if (!Number.isFinite(fieldCurrent) || fieldCurrent < 0)
    throw new RangeError("Field current must be nonnegative.");
  return (
    FIELD.saturationB *
    Math.tanh((calibration * fieldCurrent) / FIELD.ratedCurrent)
  );
}
export function magneticState(percent: number) {
  const current = (FIELD.ratedCurrent * percent) / 100;
  const B = gapFluxDensity(current);
  return {
    current,
    B,
    BL: B * FIELD.activeWireLength,
    mmf: FIELD.turns * current,
    heat: current * current * FIELD.resistance,
  };
}
