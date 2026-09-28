import { displacement as formatDisplacement } from "@engine/units";
import { slowPlayback, logPosition, fromLogPosition } from "@engine/scaling";
import { capability, MACHINE, type Solution } from "../shaker-model/model";
import { FIELD } from "../magnetics/field";
export const DRAWING_SCALE = 10;
/** Gain depends on frequency and a fixed bare-table reference, never on the user's field, current or payload. */
export function displayGain(s: Solution) {
  if (s.parameters.driveMode === "manual") return 1.8;
  const reference = capability(
    s.parameters.frequency,
    0,
    FIELD.nominalB * FIELD.activeWireLength,
  );
  return 0.16 / Math.max(1e-10, reference.displacement) / DRAWING_SCALE;
}
export const playbackFrequency = (frequency: number) =>
  slowPlayback(frequency, 0.62, 0.22, 1.25);
export const frequencyPosition = (frequency: number) =>
  logPosition(frequency, 1, MACHINE.maxFrequency);
export const positionFrequency = (position: number) =>
  fromLogPosition(position, 1, MACHINE.maxFrequency);
export const displacement = (value: number) =>
  formatDisplacement(value, "shaker");
export interface AnimationClock {
  theta: number;
  elapsed: number;
}
