import { useGuidedTour } from "@engine/useGuidedTour";
import { TOUR, tourParameters } from "./tour";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULTS, naturalFrequency, type Parameters } from "./physics";
import { SWEEP_DURATION, sweepFrequency } from "./visualization";

export type View =
  "System" | "Isolator" | "Force path" | "Side" | "Exploded" | "Test lab";
export function useExhibit() {
  const [parameters, setParameters] = useState<Parameters>({ ...DEFAULTS });
  const [forceFlow, setForceFlow] = useState(false);
  const [envelope, setEnvelope] = useState(false);
  const [view, setView] = useState<View>("System");
  const [cameraRevision, setCameraRevision] = useState(0);
  const [paused, setPaused] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [sweeping, setSweeping] = useState(false);
  const [sweepProgress, setSweepProgress] = useState(0);
  const playback = useGuidedTour({
    steps: TOUR,
    paused,
    onSample: (step, _time, _progress, entered) => {
      if (!entered) return;
      setParameters(tourParameters(TOUR.indexOf(step)));
      setView(step.camera);
      setCameraRevision((n) => n + 1);
      setForceFlow(!!step.forceFlow);
      setEnvelope(!!step.envelope);
    },
  });
  const current = useRef(parameters);
  current.current = parameters;
  const update = useCallback(
    (patch: Partial<Parameters>) => {
      playback.stop();
      setSweeping(false);
      setParameters((previous) => ({ ...previous, ...patch }));
    },
    [playback.stop],
  );
  const chooseView = (next: View) => {
    playback.stop();
    setView(next);
    setCameraRevision((n) => n + 1);
  };
  const runSweep = () => {
    playback.stop();
    if (sweeping) {
      setSweeping(false);
      return;
    }
    setPaused(false);
    setSweepProgress(0);
    chooseView("System");
    setSweeping(true);
  };
  useEffect(() => {
    if (!sweeping) return;
    let request = 0;
    let previous = performance.now();
    let elapsed = 0;
    let lastPublish = 0;
    const fn = naturalFrequency(
      current.current.mass,
      current.current.stiffness,
    );
    const frame = (now: number) => {
      // Do not jump over the lesson when a tab is in the background.
      if (!document.hidden) elapsed += Math.min((now - previous) / 1000, 0.1);
      previous = now;
      if (now - lastPublish > 30 || elapsed >= SWEEP_DURATION) {
        lastPublish = now;
        setParameters((p) => ({
          ...p,
          frequency: sweepFrequency(elapsed, fn),
        }));
        setSweepProgress(Math.min(1, elapsed / SWEEP_DURATION));
      }
      if (elapsed >= SWEEP_DURATION) setSweeping(false);
      else request = requestAnimationFrame(frame);
    };
    request = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(request);
  }, [sweeping]);
  const togglePause = () => {
    setSweeping(false);
    setPaused((p) => !p);
  };
  const reset = () => {
    playback.reset();
    setSweeping(false);
    setParameters({ ...DEFAULTS });
    setForceFlow(false);
    setEnvelope(false);
    setPaused(false);
    setSweepProgress(0);
    chooseView("System");
  };
  return {
    tour: playback.active,
    tourTime: playback.time,
    tourIndex: playback.index,
    tourDuration: playback.duration,
    startTour: () => {
      setSweeping(false);
      setPaused(false);
      playback.start();
    },
    stopTour: playback.stop,
    jumpTour: playback.jump,
    parameters,
    update,
    forceFlow,
    setForceFlow,
    envelope,
    setEnvelope,
    view,
    chooseView,
    cameraRevision,
    paused,
    togglePause,
    sweeping,
    sweepProgress,
    runSweep,
    reset,
  };
}
