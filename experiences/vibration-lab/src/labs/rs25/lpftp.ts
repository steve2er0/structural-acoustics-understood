/** LPFTP forcing illustration. Frequencies are source-informed; amplitudes are not flight data. */
export const LPFTP_REFERENCE = {
  rpm: 15761,
  power: 104.5,
  mainBlades: 4,
  splitterBlades: 4,
  hoscOrders: [6.4, 6.7] as const,
  slowdown: 1200,
} as const;
export type SourceView = "Combined" | "Blade tones" | "Cavitation";
export interface LPFTPSettings {
  source: SourceView;
  strength: number;
  order: number;
}
export const DEFAULT_LPFTP: LPFTPSettings = {
  source: "Combined",
  strength: 0.65,
  order: 6.55,
};
const bounded = (x: number, low: number, high: number, fallback: number) =>
  Math.min(high, Math.max(low, Number.isFinite(x) ? x : fallback));
export function lpftpRpm(power: number) {
  // Extends the lab's N ∝ sqrt(RPL) teaching map through the published point.
  return (
    LPFTP_REFERENCE.rpm *
    Math.sqrt(bounded(power, 67, 109, 100) / LPFTP_REFERENCE.power)
  );
}
export function lpftpState(
  power: number,
  active: boolean,
  settings: LPFTPSettings,
) {
  const rpm = active ? lpftpRpm(power) : 0,
    shaftHz = rpm / 60,
    order = bounded(settings.order, 6.4, 6.7, 6.55),
    strength = bounded(settings.strength, 0, 1, 0.65),
    blade = active && settings.source !== "Cavitation",
    cavitation = active && settings.source !== "Blade tones" ? strength : 0;
  const lines = [
    {
      id: "bpf",
      label: "4N · blade pass",
      order: 4,
      rms: blade ? 1 : 0,
      family: "blade",
    },
    {
      id: "bpf2",
      label: "8N",
      order: 8,
      rms: blade ? 0.38 : 0,
      family: "blade",
    },
    {
      id: "bpf4",
      label: "16N",
      order: 16,
      rms: blade ? 0.16 : 0,
      family: "blade",
    },
    {
      id: "hosc",
      label: "HOSC",
      order,
      rms: cavitation * 1.15,
      family: "cavitation",
    },
  ].map((line) => ({ ...line, hz: line.order * shaftHz }));
  return {
    rpm,
    shaftHz,
    order,
    cavitation,
    lines,
    bpfHz: shaftHz * 4,
    hoscHz: shaftHz * order,
    hoscBand: [shaftHz * 6.4, shaftHz * 6.7] as const,
    rms: Math.hypot(...lines.map((line) => line.rms)),
  };
}
export type LPFTPState = ReturnType<typeof lpftpState>;
/** Actual-time synthetic pressure signal, in arbitrary common pressure units. */
export function lpftpPressure(
  state: LPFTPState,
  seconds: number,
  shaftTurns = 0,
  cavityCycles = 0,
) {
  return state.lines.reduce(
    (sum, line) =>
      sum +
      Math.SQRT2 *
        line.rms *
        Math.sin(
          2 *
            Math.PI *
            (line.hz * seconds +
              (line.family === "blade"
                ? line.order * shaftTurns
                : cavityCycles)),
        ),
    0,
  );
}
/** HOSC is circumferentially in phase: every main-blade cavity uses this same pulse. */
export function cavityPulse(cycles: number) {
  return 0.5 + 0.5 * Math.cos(2 * Math.PI * cycles);
}
