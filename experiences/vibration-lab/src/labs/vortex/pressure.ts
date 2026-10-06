import { CONVECTION, TAIL, type Body, type Model, type Point } from "./physics";

/** Prescribed, linearized surface fluctuation modes. No mean-pressure or CFD solution. */
export interface PressureSettings {
  amplitude: number;
  frequency: number;
  coherence: number;
  harmonic: number;
}
export const PRESSURE_DEFAULT: PressureSettings = {
  amplitude: 0.12,
  frequency: 2,
  coherence: 0.85,
  harmonic: 0.65,
};
export type PressureUnit = "cp" | "pa";
export interface PressureTap {
  body: number;
  y: number;
  theta: number;
}
export const DEFAULT_TAPS: [PressureTap, PressureTap] = [
  { body: 0, y: 4, theta: Math.PI / 2 + 0.318 },
  { body: 0, y: 4, theta: Math.PI / 2 },
];
/** Forward attachment matches the visible bracket at drawing Y=1.7. */
export const ATTACHMENT_Y = 8.5;
export interface Attachment {
  booster: number;
  sign: number;
  x: number;
}
export const attachments = (model: Model): Attachment[] =>
  model.bodies.slice(1).map((body) => ({
    booster: body.index,
    sign: Math.sign(body.x),
    x: Math.sign(body.x) * (2.5 + model.settings.gap / 2),
  }));
/** Prescribed near-body wake stays in the gap, then leaves along the full airflow. */
export function attachmentWakeCenter(
  model: Model,
  source: Attachment,
  s: number,
): Point {
  const onBody = Math.min(Math.max(0, s), ATTACHMENT_Y - TAIL),
    aft = Math.max(0, s - (ATTACHMENT_Y - TAIL));
  const axial = Math.max(0.25, -model.flow[1]),
    halfGap = model.settings.gap * 0.35;
  return [
    source.x +
      halfGap * Math.tanh((onBody * model.flow[0] * 0.25) / halfGap) +
      (aft * model.flow[0]) / axial,
    ATTACHMENT_Y - s,
    (onBody * model.flow[2] * 0.25) / axial + (aft * model.flow[2]) / axial,
  ];
}
export const MODE_RATIOS = [1, 0.73, 1.37, 1.91, 2];
export const HARMONIC_INDEX = 4;
export const MODE_STRIDE = MODE_RATIOS.length * 2;
export const MAX_MODE_RATIO = Math.max(...MODE_RATIOS);
export const footprintWidth = (s: number) => 0.3 + 0.004 * s;
/** Flank and projected wake centerline on one OML at the same axial station. */
export function harmonicComparisonTaps(
  model: Model,
  bodyIndex = 0,
): [PressureTap, PressureTap] {
  const body =
    model.bodies.find((b) => b.index === bodyIndex) ?? model.bodies[0];
  const source = attachments(model).find(
    (a) => a.booster === (body.index || 2),
  );
  const y = 4,
    s = ATTACHMENT_Y - y;
  const p = source ? attachmentWakeCenter(model, source, s) : null;
  const center = p ? Math.atan2(p[0] - body.x, p[2]) : Math.PI / 2;
  return [
    { body: body.index, y, theta: wrapAngle(center + footprintWidth(s)) },
    { body: body.index, y, theta: wrapAngle(center) },
  ];
}
export interface PressureMode {
  frequency: number;
  cosine: number;
  sine: number;
}
export const wrapAngle = (a: number) =>
  ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const signedAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Radius and axial position in physical meters, matching the visible OML. */
export function omlProfile(body: Body): [number, number][] {
  return body.index === 0
    ? [
        [2.5, TAIL],
        [2.5, 19],
        [3.5, 22],
        [3.5, 26.5],
        [3.4, 28],
        [2.85, 29.75],
        [1.9, 31.5],
        [0.65, 33.25],
        [0, 34],
      ]
    : [
        [1.6, TAIL],
        [1.6, 13],
        [1.52, 14.75],
        [1.04, 16.75],
        [0.32, 18.5],
        [0, 19.25],
      ];
}
export const noseY = (body: Body) => (body.index === 0 ? 34 : 19.25);
export function omlRadius(body: Body, y: number) {
  const profile = omlProfile(body);
  for (let i = 1; i < profile.length; i++) {
    const [r, z] = profile[i],
      [r0, z0] = profile[i - 1];
    if (y <= z)
      return r0 + (r - r0) * Math.max(0, Math.min(1, (y - z0) / (z - z0)));
  }
  return 0;
}
export function tapPoint(body: Body, tap: PressureTap): Point {
  const r = omlRadius(body, tap.y) + 0.08;
  return [body.x + r * Math.sin(tap.theta), tap.y, r * Math.cos(tap.theta)];
}
export function clampTap(tap: PressureTap, model: Model): PressureTap {
  const body =
    model.bodies.find((b) => b.index === tap.body) ?? model.bodies[0];
  return {
    body: body.index,
    y: Math.max(TAIL, Math.min(noseY(body) - 0.1, tap.y)),
    theta: wrapAngle(tap.theta),
  };
}
export const convectionSpeed = (model: Model) => CONVECTION * model.axialSpeed;
export const pressureScale = (model: Model, unit: PressureUnit) =>
  unit === "pa" ? model.dynamicPressure : 1;
const development = (s: number) =>
  (1 - Math.exp(-Math.max(0, s) / 1.5)) * Math.exp(-Math.max(0, s) / 35);

/** Odd 1x flank mode, even phase-locked 2x centerline mode, and three background tones. */
export function pressureModes(
  model: Model,
  body: Body,
  settings: PressureSettings,
  y: number,
  theta: number,
): PressureMode[] {
  const s = ATTACHMENT_Y - y,
    uc = convectionSpeed(model);
  const modes = MODE_RATIOS.map((ratio) => ({
    frequency: settings.frequency * ratio,
    cosine: 0,
    sine: 0,
  }));
  if (s <= 0 || uc <= 0 || !model.settings.boosters || settings.amplitude === 0)
    return modes;
  const amplitude = settings.amplitude * development(s);
  const fraction = Math.max(0, Math.min(1, settings.coherence));
  const spatial = [Math.cos(s / 9), Math.sin(s / 9), 0.65];
  const norm = Math.hypot(...spatial);
  for (const source of attachments(model).filter(
    (source) => body.index === 0 || body.index === source.booster,
  )) {
    const p = attachmentWakeCenter(model, source, s),
      center = Math.atan2(p[0] - body.x, p[2]);
    const d = signedAngle(theta - center) / footprintWidth(s),
      footprint = Math.exp(-0.5 * d * d),
      flank = source.sign * d * Math.exp(0.5) * footprint;
    for (let i = 0; i < modes.length; i++) {
      const harmonic = i === HARMONIC_INDEX;
      const phase =
        (-2 * Math.PI * modes[i].frequency * s) / uc +
        source.sign * 0.4 * (harmonic ? 2 : 1) +
        (i && !harmonic ? i * 1.7 : 0);
      const a =
        amplitude *
        (harmonic
          ? settings.harmonic *
            Math.sqrt(fraction) *
            Math.exp(-0.5 * (d / 0.6) ** 2)
          : i === 0
            ? Math.sqrt(fraction) * flank
            : (footprint * (Math.sqrt(1 - fraction) * spatial[i - 1])) / norm);
      modes[i].cosine += a * Math.cos(phase);
      modes[i].sine += -a * Math.sin(phase);
    }
  }
  return modes;
}
export const evaluateModes = (modes: PressureMode[], time: number) =>
  modes.reduce((v, mode) => {
    const phase = 2 * Math.PI * mode.frequency * time;
    return v + mode.cosine * Math.cos(phase) + mode.sine * Math.sin(phase);
  }, 0);
export const modeRms = (modes: PressureMode[]) =>
  Math.sqrt(modes.reduce((v, m) => v + (m.cosine ** 2 + m.sine ** 2) / 2, 0));
export function modeCorrelation(a: PressureMode[], b: PressureMode[]) {
  const divisor = modeRms(a) * modeRms(b);
  if (divisor < 1e-15) return null;
  const covariance = a.reduce(
    (sum, m, i) =>
      sum +
      (m.frequency === b[i]?.frequency
        ? (m.cosine * b[i].cosine + m.sine * b[i].sine) / 2
        : 0),
    0,
  );
  return Math.max(-1, Math.min(1, covariance / divisor));
}
export function pressureRgb(
  value: number,
  limit: number,
): [number, number, number] {
  const t = Math.min(1, Math.abs(value) / Math.max(limit, 1e-12));
  const edge = value < 0 ? [48, 111, 209] : [219, 68, 46],
    neutral = [231, 236, 225];
  return neutral.map((c, i) => Math.round(c + (edge[i] - c) * t)) as [
    number,
    number,
    number,
  ];
}
