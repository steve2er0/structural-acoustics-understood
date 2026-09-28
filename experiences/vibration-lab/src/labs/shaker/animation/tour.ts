import { timelineAt, seekStep } from "@engine/timeline";
import { DEFAULTS, type Parameters } from "../shaker-model/model";
import type { CameraView, Display, Lesson } from "./state";
interface Step {
  duration: number;
  title: string;
  copy: string;
  lesson: Lesson;
  display: Display;
  camera: CameraView;
  parameters: Partial<Parameters>;
  ramp?: "fieldPercent" | "payload";
}
export const TOUR: Step[] = [
  {
    duration: 3.8,
    title: "Two circuits. One moving table.",
    copy: "A stationary field coil and a moving drive coil do different jobs. Start with both switched off.",
    lesson: "field",
    display: "assembled",
    camera: "System",
    parameters: {
      fieldPercent: 0,
      manualPercent: 0,
      driveMode: "manual",
      payload: 0,
    },
  },
  {
    duration: 3.8,
    title: "Look through the housing.",
    copy: "The cutaway reveals copper windings inside a continuous steel magnetic circuit.",
    lesson: "field",
    display: "cutaway",
    camera: "Cutaway",
    parameters: {},
  },
  {
    duration: 3.8,
    title: "This coil stays still.",
    copy: "The large lower winding is the DC field coil. It does not travel with the table.",
    lesson: "field",
    display: "cutaway",
    camera: "Field coil",
    parameters: {},
  },
  {
    duration: 3.8,
    title: "Energize the field.",
    copy: "DC current creates magnetomotive force. Flux builds in the steel and crosses the narrow air gap.",
    lesson: "field",
    display: "cutaway",
    camera: "Field coil",
    parameters: { fieldPercent: 100 },
    ramp: "fieldPercent",
  },
  {
    duration: 3.8,
    title: "A closed magnetic path.",
    copy: "Up the center pole, radially through the gap, down the outer return, and back through the base.",
    lesson: "field",
    display: "circuit",
    camera: "System",
    parameters: {},
  },
  {
    duration: 3.8,
    title: "A small gap does the work.",
    copy: "The moving winding sits between the center pole and the outer pole. Flux crosses it radially.",
    lesson: "force",
    display: "cutaway",
    camera: "Air gap",
    parameters: {},
  },
  {
    duration: 3.8,
    title: "B points across the gap.",
    copy: "The green arrows point outward from the center pole. There is still no force without drive current.",
    lesson: "force",
    display: "cutaway",
    camera: "Air gap",
    parameters: {},
  },
  {
    duration: 3.8,
    title: "Current goes around the coil.",
    copy: "The blue markers follow circumferential conventional current. Current and field are perpendicular.",
    lesson: "force",
    display: "cutaway",
    camera: "Drive coil",
    parameters: { manualPercent: 25 },
  },
  {
    duration: 3.8,
    title: "The cross product points up.",
    copy: "I × B produces axial force on every active turn. Together, the turns give F = BLi.",
    lesson: "force",
    display: "cutaway",
    camera: "Air gap",
    parameters: { manualPercent: 100 },
  },
  {
    duration: 3.8,
    title: "The table follows the drive coil.",
    copy: "The coil, armature ribs, and table move together. Suspension flexures guide the axial motion.",
    lesson: "force",
    display: "cutaway",
    camera: "Armature",
    parameters: {},
  },
  {
    duration: 3.8,
    title: "Reverse current. Reverse force.",
    copy: "The magnetic field stays the same. Reversing drive current reverses the electromagnetic force.",
    lesson: "force",
    display: "cutaway",
    camera: "Air gap",
    parameters: { manualPercent: -100 },
  },
  {
    duration: 3.8,
    title: "Now alternate the current.",
    copy: "A sinusoidal current makes the force alternate. Motion follows the mass–spring–damper response.",
    lesson: "motion",
    display: "cutaway",
    camera: "Armature",
    parameters: { driveMode: "sine", frequency: 5, levelPercent: 35 },
  },
  {
    duration: 3.8,
    title: "One degree of freedom.",
    copy: "The suspension bends axially while resisting lateral motion. The whole moving assembly shares one displacement.",
    lesson: "motion",
    display: "cutaway",
    camera: "Suspension",
    parameters: { frequency: 100, levelPercent: 35 },
  },
  {
    duration: 3.8,
    title: "Field strength changes force factor.",
    copy: "At unchanged drive current, reducing the field reduces BL and therefore force.",
    lesson: "force",
    display: "cutaway",
    camera: "System",
    parameters: { fieldPercent: 50 },
  },
  {
    duration: 3.8,
    title: "Restore the full field.",
    copy: "The same current now produces more force. Field excitation and armature excitation are separate controls.",
    lesson: "force",
    display: "cutaway",
    camera: "System",
    parameters: { fieldPercent: 100 },
  },
  {
    duration: 3.8,
    title: "A moving coil is also a generator.",
    copy: "Motion through the field generates back EMF: e = BLv. It is in phase with velocity, not displacement.",
    lesson: "emf",
    display: "cutaway",
    camera: "Drive coil",
    parameters: { frequency: 20, levelPercent: 60 },
  },
  {
    duration: 3.8,
    title: "The amplifier has finite voltage.",
    copy: "Resistance, inductance and back EMF add with phase. At high frequency, inductance consumes voltage headroom.",
    lesson: "emf",
    display: "cutaway",
    camera: "System",
    parameters: { frequency: 2000, levelPercent: 100 },
  },
  {
    duration: 3.8,
    title: "Every limit shapes the envelope.",
    copy: "The curve is computed from stroke, velocity, current, voltage and continuous copper-heating limits.",
    lesson: "envelope",
    display: "cutaway",
    camera: "System",
    parameters: { frequency: 100 },
  },
  {
    duration: 3.8,
    title: "Add a payload.",
    copy: "More moving mass reduces acceleration capability in the mass-controlled region. The envelope changes with it.",
    lesson: "envelope",
    display: "cutaway",
    camera: "System",
    parameters: { payload: 40 },
    ramp: "payload",
  },
  {
    duration: 3.8,
    title: "You control the whole chain.",
    copy: "Field → flux. Drive current → force. Motion → back EMF. Keep exploring the tradeoffs.",
    lesson: "envelope",
    display: "cutaway",
    camera: "System",
    parameters: {},
  },
];
export const TOUR_DURATION = TOUR.length * 3.8;
export function tourAt(time: number) {
  const { index, progress } = timelineAt(TOUR, time);
  let parameters = { ...DEFAULTS };
  for (let i = 0; i <= index; i++) {
    const step = TOUR[i],
      previous = { ...parameters };
    parameters = { ...parameters, ...step.parameters };
    if (i === index && step.ramp) {
      const t = progress * progress * (3 - 2 * progress);
      parameters[step.ramp] =
        previous[step.ramp] + (parameters[step.ramp] - previous[step.ramp]) * t;
    }
  }
  return { index, progress, parameters };
}

export const seekTour = (time: number, direction: number) =>
  seekStep(TOUR, time, direction);
