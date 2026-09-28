import { useGuidedTour } from "@engine/useGuidedTour";
import { useCallback, useState } from "react";
import { DEFAULTS, type Parameters } from "../shaker-model/model";
import { TOUR, tourAt } from "./tour";
export type Display = "assembled" | "cutaway" | "exploded" | "circuit";
export type Lesson =
  "field" | "force" | "motion" | "emf" | "envelope" | "energy";
export type CameraView =
  | "Test lab"
  | "System"
  | "Cutaway"
  | "Field coil"
  | "Air gap"
  | "Drive coil"
  | "Armature"
  | "Suspension"
  | "Exploded";
export const CAMERAS: CameraView[] = [
  "Test lab",
  "System",
  "Cutaway",
  "Field coil",
  "Air gap",
  "Drive coil",
  "Armature",
  "Suspension",
  "Exploded",
];
export function useExhibit() {
  const [parameters, setParameters] = useState<Parameters>(DEFAULTS);
  const [lesson, setLesson] = useState<Lesson>("field");
  const [display, setDisplay] = useState<Display>("cutaway");
  const [camera, setCamera] = useState<CameraView>("System");
  const [revision, setRevision] = useState(0);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const playback = useGuidedTour({
    steps: TOUR,
    paused,
    onSample: (step, time, _progress, entered) => {
      setParameters(tourAt(time).parameters);
      if (entered) {
        setLesson(step.lesson);
        setDisplay(step.display);
        setCamera(step.camera);
        setRevision((r) => r + 1);
      }
    },
  });
  const stop = playback.stop;
  const update = useCallback(
    (patch: Partial<Parameters>) => {
      stop();
      setParameters((p) => ({ ...p, ...patch }));
    },
    [stop],
  );
  const chooseCamera = useCallback(
    (v: CameraView) => {
      stop();
      setCamera(v);
      setRevision((r) => r + 1);
      if (v === "Exploded") setDisplay("exploded");
      else if (v !== "System" && v !== "Test lab") setDisplay("cutaway");
    },
    [stop],
  );
  const chooseDisplay = useCallback(
    (v: Display) => {
      stop();
      setDisplay(v);
      if (v === "exploded") {
        setCamera("Exploded");
        setRevision((r) => r + 1);
      } else if (camera === "Exploded") {
        setCamera("System");
        setRevision((r) => r + 1);
      }
    },
    [camera, stop],
  );
  const chooseLesson = useCallback(
    (v: Lesson) => {
      stop();
      setLesson(v);
      setDisplay(v === "field" ? "circuit" : "cutaway");
      setCamera(v === "force" ? "Air gap" : "System");
      setRevision((r) => r + 1);
    },
    [stop],
  );
  const reset = useCallback(() => {
    stop();
    setParameters(DEFAULTS);
    setLesson("field");
    setDisplay("cutaway");
    setCamera("System");
    setRevision((r) => r + 1);
    setPaused(false);
    playback.reset();
  }, [stop]);
  const startTour = () => {
    setPaused(false);
    playback.start();
  };
  return {
    parameters,
    update,
    lesson,
    chooseLesson,
    display,
    chooseDisplay,
    camera,
    chooseCamera,
    revision,
    paused,
    setPaused,
    tour: playback.active,
    tourTime: playback.time,
    finished: playback.finished,
    startTour,
    stopTour: stop,
    jumpTour: playback.jump,
    reset,
  };
}
