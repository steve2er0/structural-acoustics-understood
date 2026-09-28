import { displacement as formatDisplacement } from "@engine/units";
import {
  slowPlayback,
  logPosition,
  fromLogPosition,
  sharedMotionGain,
} from "@engine/scaling";
import { sampleMotion, type Solution } from "./physics";
import { ASSEMBLY } from "./scene-layout";

export const MOTION = {
  nominalWorldUnitsPerMeter: 8,
  preferredBaseTravel: 0.085,
  maximumTravel: 0.46,
};
/** One linear gain for both bodies, never independent clamping: ratio, relative travel, phase stay correct. */
export function motionScale(s: Solution) {
  const worldUnitsPerMeter = sharedMotionGain(
    s.baseAmplitude,
    MOTION.preferredBaseTravel,
    Math.max(s.baseAmplitude, s.payloadAmplitude, s.relativeAmplitude),
    MOTION.maximumTravel,
  );
  return {
    worldUnitsPerMeter,
    // Include the uniform assembly transform in the disclosed world-space gain.
    gain:
      (worldUnitsPerMeter * ASSEMBLY.scale) / MOTION.nominalWorldUnitsPerMeter,
  };
}
export function visualMotion(s: Solution, theta: number) {
  const physical = sampleMotion(s, theta);
  const { worldUnitsPerMeter } = motionScale(s);
  return {
    physical,
    base: physical.base * worldUnitsPerMeter,
    payload: physical.payload * worldUnitsPerMeter,
  };
}
/** Time dilation is pedagogical; the phase difference and amplitude ratio use the physical solution. */
export const playbackFrequency = (frequency: number) =>
  slowPlayback(frequency, 0.65, 0.27, 1.35);
export const frequencyPosition = (frequency: number) =>
  logPosition(frequency, 1, 600);
export const positionFrequency = (position: number) =>
  fromLogPosition(position, 1, 600);
export const SWEEP_DURATION = 24;
export function sweepFrequency(seconds: number, fn: number) {
  const t = Math.max(0, Math.min(SWEEP_DURATION, seconds));
  const lerpLog = (a: number, b: number, progress: number) =>
    a * (b / a) ** progress;
  if (t < 7) return lerpLog(2, fn, t / 7);
  if (t < 10) return fn;
  return lerpLog(fn, 600, (t - 10) / 14);
}
export const displacement = (value: number) =>
  formatDisplacement(value, "isolation");
