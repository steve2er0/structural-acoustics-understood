import { clamp01 } from "./scaling";
export interface TimedStep {
  duration: number;
}
export const tourDuration = (steps: readonly TimedStep[]) =>
  steps.reduce((t, step) => t + step.duration, 0);
export function timelineAt(steps: readonly TimedStep[], time: number) {
  if (!steps.length || steps.some((s) => !(s.duration > 0)))
    throw new Error("A tour needs positive step durations");
  let start = 0,
    index = 0;
  const t = Math.max(0, time);
  while (index < steps.length - 1 && t + 1e-9 >= start + steps[index].duration)
    start += steps[index++].duration;
  return {
    index,
    progress: clamp01((t - start) / steps[index].duration),
    start,
    step: steps[index],
  };
}
export function seekStep(
  steps: readonly TimedStep[],
  time: number,
  direction: number,
) {
  const index = Math.max(
    0,
    Math.min(steps.length - 1, timelineAt(steps, time).index + direction),
  );
  return steps.slice(0, index).reduce((t, step) => t + step.duration, 0);
}
