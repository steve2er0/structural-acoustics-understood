import { useCallback, useEffect, useRef, useState } from "react";
import { seekStep, timelineAt, tourDuration, type TimedStep } from "./timeline";
/** Content is arbitrary lab data. The engine owns only playback and stage boundaries. */
export function useGuidedTour<S extends TimedStep>({
  steps,
  paused,
  onSample,
}: {
  steps: readonly S[];
  paused: boolean;
  onSample: (step: S, time: number, progress: number, entered: boolean) => void;
}) {
  const [active, setActive] = useState(false),
    [time, setTime] = useState(0),
    [finished, setFinished] = useState(false);
  const current = useRef({ steps, paused, onSample });
  current.current = { steps, paused, onSample };
  const elapsed = useRef(0),
    running = useRef(false),
    lastStep = useRef(-1);
  const apply = useCallback((t: number, force = false) => {
    const c = current.current,
      at = timelineAt(c.steps, t);
    c.onSample(
      c.steps[at.index],
      t,
      at.progress,
      force || lastStep.current !== at.index,
    );
    lastStep.current = at.index;
    elapsed.current = t;
    setTime(t);
  }, []);
  const stop = useCallback(() => {
    running.current = false;
    setActive(false);
    setFinished(false);
  }, []);
  const reset = useCallback(() => {
    stop();
    elapsed.current = 0;
    lastStep.current = -1;
    setTime(0);
    setFinished(false);
  }, [stop]);
  const start = useCallback(() => {
    running.current = true;
    setActive(true);
    setFinished(false);
    apply(0, true);
  }, [apply]);
  const jump = useCallback(
    (direction: number) => {
      apply(seekStep(current.current.steps, elapsed.current, direction), true);
    },
    [apply],
  );
  useEffect(() => {
    if (!active) return;
    let id = 0,
      last = performance.now(),
      published = last;
    const tick = (now: number) => {
      const c = current.current,
        duration = tourDuration(c.steps),
        dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (running.current && !c.paused && !document.hidden) {
        elapsed.current = Math.min(duration, elapsed.current + dt);
        if (now - published >= 30 || elapsed.current >= duration) {
          apply(elapsed.current);
          published = now;
        }
        if (elapsed.current >= duration) {
          stop();
          setFinished(true);
          return;
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active, apply, stop]);
  return {
    active,
    time,
    finished,
    start,
    stop,
    reset,
    jump,
    duration: tourDuration(steps),
    index: timelineAt(steps, time).index,
  };
}
