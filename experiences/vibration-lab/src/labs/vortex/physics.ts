/** Kinematic longitudinal-vortex illustration; not CFD or a launch-load solver. */
export interface Settings {
  mach: number;
  alpha: number;
  beta: number;
  gap: number;
  strouhal: number;
  boosters: boolean;
}
export const DEFAULT: Settings = {
  mach: 0.3,
  alpha: 12,
  beta: 0,
  gap: 0.6,
  strouhal: 0.2,
  boosters: true,
};
export const AIR = {
  temperature: 288.15,
  density: 1.225,
  viscosity: 1.7894e-5,
  gamma: 1.4,
  gasConstant: 287.05,
};
export const SOUND_SPEED = Math.sqrt(
  AIR.gamma * AIR.gasConstant * AIR.temperature,
);
export const SCALE = 0.2; // drawing units per meter; all geometry uses the same scale
export const BODY_INFO = [
  { name: "Core", diameter: 5, barrel: 43, color: "#f0d8ad" },
  { name: "Port booster", diameter: 3.2, barrel: 35, color: "#b2cce4" },
  { name: "Starboard booster", diameter: 3.2, barrel: 35, color: "#d0c5ed" },
] as const;
export type Body = {
  index: number;
  name: string;
  diameter: number;
  barrel: number;
  color: string;
  x: number;
  frequency: number;
  reynolds: number;
  upstream: string[];
};
export interface Model {
  settings: Settings;
  speed: number;
  crossSpeed: number;
  axialSpeed: number;
  crossMach: number;
  incidence: number;
  dynamicPressure: number;
  crossPressure: number;
  /** Air motion in drawing coordinates: +Y points to the nose, +X to starboard. */
  flow: [number, number, number];
  normal: [number, number];
  tangent: [number, number];
  bodies: Body[];
  regime:
    | "Still air"
    | "Axial flow"
    | "Subsonic analogy"
    | "Compressible extrapolation";
}
const radians = (v: number) => (v * Math.PI) / 180;
export function solve(settings: Settings): Model {
  const a = radians(settings.alpha),
    b = radians(settings.beta);
  // Conventional aircraft velocity angles mapped to the *opposite*, relative-air direction.
  // Body axes: X noseward, Y starboard, Z down. Drawing: (Y, X, -Z).
  const flow: Model["flow"] = [
    -Math.sin(b),
    -Math.cos(a) * Math.cos(b),
    Math.sin(a) * Math.cos(b),
  ];
  const crossFraction = Math.hypot(flow[0], flow[2]);
  const speed = settings.mach * SOUND_SPEED;
  const crossSpeed = speed * crossFraction;
  const normal: Model["normal"] =
    crossFraction > 1e-10
      ? [flow[0] / crossFraction, flow[2] / crossFraction]
      : [0, 1];
  const tangent: Model["tangent"] = [normal[1], -normal[0]];
  const offset = (5 + 3.2) / 2 + settings.gap;
  const bodies: Body[] = BODY_INFO.slice(0, settings.boosters ? 3 : 1).map(
    (body, index) => {
      const reynolds =
        (AIR.density * crossSpeed * body.diameter) / AIR.viscosity;
      return {
        ...body,
        index,
        x: index === 0 ? 0 : index === 1 ? -offset : offset,
        reynolds,
        // The Re gate only removes a periodic-cylinder analogy below its nominal onset.
        // St is user-prescribed, not a Reynolds/Mach-dependent empirical correlation.
        frequency:
          reynolds < 47 ? 0 : (settings.strouhal * crossSpeed) / body.diameter,
        upstream: [],
      };
    },
  );
  for (const body of bodies) {
    if (crossSpeed < 1e-8) continue;
    body.upstream = bodies
      .filter((other) => {
        const dx = body.x - other.x;
        return (
          other.index !== body.index &&
          dx * normal[0] > 1e-8 &&
          Math.abs(dx * tangent[0]) < (body.diameter + other.diameter) / 2
        );
      })
      .map((other) => other.name);
  }
  return {
    settings,
    speed,
    crossSpeed,
    axialSpeed: speed * -flow[1],
    crossMach: settings.mach * crossFraction,
    incidence: (Math.acos(Math.min(1, Math.max(-1, -flow[1]))) * 180) / Math.PI,
    dynamicPressure: 0.5 * AIR.density * speed ** 2,
    crossPressure: 0.5 * AIR.density * crossSpeed ** 2,
    flow,
    normal,
    tangent,
    bodies,
    regime:
      speed === 0
        ? "Still air"
        : crossSpeed < 1e-8
          ? "Axial flow"
          : settings.mach <= 0.3
            ? "Subsonic analogy"
            : "Compressible extrapolation",
  };
}
export const PRESETS = [
  {
    name: "Ascent at incidence",
    copy: "Vortices develop from forebody to aft",
    settings: DEFAULT,
  },
  {
    name: "Sideslip",
    copy: "Rotate the leeward pair around each body",
    settings: { ...DEFAULT, alpha: 0, beta: 12 },
  },
  {
    name: "Oblique flow",
    copy: "Pitch and yaw together",
    settings: { ...DEFAULT, alpha: 12, beta: 12 },
  },
  {
    name: "Negative incidence",
    copy: "Move the pair to the opposite side",
    settings: { ...DEFAULT, alpha: -12, beta: 0 },
  },
  {
    name: "Axial flight",
    copy: "Nose-to-tail flow at zero incidence",
    settings: { ...DEFAULT, alpha: 0, beta: 0 },
  },
  {
    name: "Transonic",
    copy: "Explore the model limit",
    settings: { ...DEFAULT, mach: 1, alpha: 8, beta: 4 },
  },
] as const;
export const CONVECTION = 0.65; // prescribed fraction, not a measured velocity deficit
export const TAIL = -22; // meters in drawing coordinates
export const MIDBODY = 0;
export const sourceY = (body: Body) => (body.index === 0 ? 26.5 : 13);
export const pathLength = (body: Body) => sourceY(body) - TAIL + 18;
export const pairVisibility = (model: Model) =>
  model.speed === 0 ? 0 : Math.min(1, model.incidence / 10);
export type Point = [number, number, number];
/** Distance s runs aft from the forebody shoulder. Returns meters, before SCALE.
 * The near-body path is prescribed. Past the tail its tangent is the full air vector.
 * This spatial roll-up is not an alternating temporal cylinder street. */
export function longitudinalPath(
  model: Model,
  body: Body,
  side: number,
  s: number,
): Point {
  const length = sourceY(body) - TAIL;
  const onBody = Math.min(Math.max(s, 0), length);
  const t = onBody / length;
  const r = body.diameter / 2;
  // The core starts outside the wider payload fairing; transition to barrel radius.
  const shoulder = body.index === 0 ? Math.max(0, 1 - onBody / 10) : 0;
  const growth = (0.35 + Math.sin((model.incidence * Math.PI) / 180)) * t;
  const normal = (r + shoulder) * (0.94 + growth);
  const lateral = (side ? -1 : 1) * (r + shoulder) * (0.7 + 0.16 * t);
  const aft = Math.max(0, s - length);
  const axial = Math.max(0.25, -model.flow[1]);
  return [
    body.x +
      model.normal[0] * normal +
      model.tangent[0] * lateral +
      (aft * model.flow[0]) / axial,
    sourceY(body) - s,
    model.normal[1] * normal +
      model.tangent[1] * lateral +
      (aft * model.flow[2]) / axial,
  ];
}
/** Artistic swirl radius and pitch: neither circulation nor instability frequency. */
export function swirlPoint(
  model: Model,
  body: Body,
  side: number,
  s: number,
  offset = 0,
): Point {
  const p = longitudinalPath(model, body, side, s);
  const growth = Math.min(1, Math.max(0, s) / 12);
  const radius = body.diameter * 0.105 * growth;
  const theta =
    ((side ? -1 : 1) * 2 * Math.PI * s) / (body.diameter * 3.2) + offset;
  p[0] +=
    radius *
    (model.tangent[0] * Math.cos(theta) + model.normal[0] * Math.sin(theta));
  p[2] +=
    radius *
    (model.tangent[1] * Math.cos(theta) + model.normal[1] * Math.sin(theta));
  return p;
}
/** Physical seconds per viewing second. Cap full-flow travel, including axial flight. */
export const physicalTimeRate = (model: Model, playback: number) =>
  playback * Math.min(1, 28 / Math.max(28, model.speed));
export const axialTravel = (model: Model, seconds: number) =>
  CONVECTION * model.axialSpeed * seconds;
