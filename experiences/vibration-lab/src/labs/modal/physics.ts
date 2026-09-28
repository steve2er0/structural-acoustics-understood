import data from "./plate-data.json";
export const PLATE = data;
export const MODES = data.modes;
export const FS = 8192,
  RECORD_SECONDS = 4,
  N = FS * RECORD_SECONDS;
export const TIPS = {
  Soft: { duration: 0.012, color: "#c2d8ad", material: "Rubber" },
  Medium: { duration: 0.003, color: "#e9bd88", material: "Polymer" },
  Hard: { duration: 0.0008, color: "#a8d9ed", material: "Steel" },
} as const;
export type Tip = keyof typeof TIPS;
export type Point = { x: number; y: number };
export const GRID = Array.from({ length: 15 }, (_, i) => ({
  x: -0.8 + (i % 5) * 0.4,
  y: -0.85 + Math.floor(i / 5) * 0.85,
  name: `${"ABC"[Math.floor(i / 5)]}${(i % 5) + 1}`,
}));
export const DEFAULT = {
  input: 10,
  output: 4,
  damping: 0.012,
  tip: "Medium" as Tip,
  noise: 0,
  double: false,
};
export type Settings = typeof DEFAULT;
export type Complex = { re: number; im: number };
export const magnitude = (z: Complex) => Math.hypot(z.re, z.im);
function legendre(x: number) {
  const p = [1, x];
  for (let n = 2; n <= data.degree; n++)
    p.push(((2 * n - 1) * x * p[n - 1] - (n - 1) * p[n - 2]) / n);
  return p;
}
/** Peak-normalized transverse displacement; x,y are dimensionless half-span coordinates. */
export function shape(mode: number, x: number, y: number) {
  const px = legendre(x),
    py = legendre(y);
  return MODES[mode].coefficients.reduce(
    (s, c, k) => s + c * px[data.basis[k][0]] * py[data.basis[k][1]],
    0,
  );
}
export function modalTerm(
  mode: number,
  f: number,
  damping: number,
  type: "receptance" | "mobility" | "accelerance" = "accelerance",
): Complex {
  const w = 2 * Math.PI * f,
    wn = 2 * Math.PI * MODES[mode].frequency;
  const a = wn * wn - w * w,
    b = 2 * damping * wn * w,
    den = a * a + b * b;
  if (type === "receptance") return { re: a / den, im: -b / den };
  if (type === "mobility") return { re: (w * b) / den, im: (w * a) / den };
  return { re: (-w * w * a) / den, im: (w * w * b) / den };
}
export function frf(
  f: number,
  input: Point,
  output: Point,
  damping: number,
  type: "receptance" | "mobility" | "accelerance" = "accelerance",
): Complex {
  let re = 0,
    im = 0;
  MODES.forEach((mode, i) => {
    const p =
      (shape(i, input.x, input.y) * shape(i, output.x, output.y)) / mode.mass;
    const term = modalTerm(i, f, damping, type);
    re += p * term.re;
    im += p * term.im;
  });
  return { re, im };
}
export const IMPULSE = 0.12; // N s, held fixed to isolate the effect of tip duration
export const BOUNCE_DELAY = 0.035;
export function force(t: number, tip: Tip, double = false) {
  const duration = TIPS[tip].duration;
  const pulse = (time: number) =>
    time > 0 && time < duration
      ? ((IMPULSE * Math.PI) / (2 * duration)) *
        Math.sin((Math.PI * time) / duration)
      : 0;
  return pulse(t) + (double ? 0.65 * pulse(t - BOUNCE_DELAY) : 0);
}
/** Continuous transform of a half-sine pulse; numerical quadrature avoids the removable singularity. */
export function forceSpectrum(f: number, tip: Tip) {
  const dt = TIPS[tip].duration / 128;
  let re = 0,
    im = 0;
  for (let i = 0; i < 128; i++) {
    const t = (i + 0.5) * dt,
      v = force(t, tip) * dt;
    re += v * Math.cos(2 * Math.PI * f * t);
    im -= v * Math.sin(2 * Math.PI * f * t);
  }
  return { re, im };
}
/** In-place radix-2 FFT, unnormalized forward transform. */
export function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len,
      c = Math.cos(angle),
      s = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wr = 1,
        wi = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j,
          b = a + len / 2,
          tr = wr * re[b] - wi * im[b],
          ti = wr * im[b] + wi * re[b];
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const next = wr * c - wi * s;
        wi = wr * s + wi * c;
        wr = next;
      }
    }
  }
}
export interface Measurement {
  settings: Settings;
  force: Float32Array;
  acceleration: Float32Array;
  q: Float32Array[];
  frequencies: Float64Array;
  inputSpectrum: Float64Array;
  responseSpectrum: Float64Array;
  measured: Complex[];
  model: Complex[];
  coherence: Float64Array;
  valid: boolean[];
  residues: number[];
  peakAcceleration: number;
  peakDisplacement: number;
}
/** Expected ensemble coherence for independent, white output noise; not a single-record estimator. */
export function expectedCoherence(signalPower: number, noisePower: number) {
  return signalPower > 1e-24 ? signalPower / (signalPower + noisePower) : 0;
}
function randomNormal(seed: number) {
  let state = seed >>> 0;
  const uniform = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return (state + 1) / 4294967297;
  };
  return () =>
    Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
}
export function measure(settings: Settings, seed = 19): Measurement {
  const input = GRID[settings.input],
    output = GRID[settings.output],
    dt = 1 / FS;
  const forces = new Float32Array(N),
    acceleration = new Float32Array(N),
    q = MODES.map(() => new Float32Array(N));
  const displacement = MODES.map(() => 0),
    velocity = MODES.map(() => 0);
  const coeff = MODES.map((m, i) => ({
    w2: (2 * Math.PI * m.frequency) ** 2,
    c: 4 * Math.PI * settings.damping * m.frequency,
    gain: shape(i, input.x, input.y) / m.mass,
    out: shape(i, output.x, output.y),
  }));
  const noise = randomNormal(seed);
  let peakAcceleration = 0,
    peakDisplacement = 0;
  for (let j = 0; j < N; j++) {
    const t = j * dt,
      f0 = force(t, settings.tip, settings.double),
      fh = force(t + dt / 2, settings.tip, settings.double),
      f1 = force(t + dt, settings.tip, settings.double);
    forces[j] = f0;
    let a = 0;
    for (let k = 0; k < MODES.length; k++) {
      const { w2, c, gain, out } = coeff[k],
        x = displacement[k],
        v = velocity[k];
      q[k][j] = x;
      const a1 = gain * f0 - c * v - w2 * x;
      a += out * a1;
      // RK4 integrates the actual finite-duration pulse, rather than an ideal impulse.
      const v2 = v + (a1 * dt) / 2,
        a2 = gain * fh - c * v2 - w2 * (x + (v * dt) / 2);
      const v3 = v + (a2 * dt) / 2,
        a3 = gain * fh - c * v3 - w2 * (x + (v2 * dt) / 2);
      const v4 = v + a3 * dt,
        a4 = gain * f1 - c * v4 - w2 * (x + v3 * dt);
      displacement[k] += (dt / 6) * (v + 2 * v2 + 2 * v3 + v4);
      velocity[k] += (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
      peakDisplacement = Math.max(peakDisplacement, Math.abs(x));
    }
    acceleration[j] = a + settings.noise * noise();
    peakAcceleration = Math.max(peakAcceleration, Math.abs(acceleration[j]));
  }
  const fr = Float64Array.from(forces),
    fi = new Float64Array(N),
    ar = Float64Array.from(acceleration),
    ai = new Float64Array(N);
  fft(fr, fi);
  fft(ar, ai);
  const count = 901,
    frequencies = new Float64Array(count),
    inputSpectrum = new Float64Array(count),
    responseSpectrum = new Float64Array(count),
    coherence = new Float64Array(count);
  const measured: Complex[] = [],
    model: Complex[] = [],
    valid: boolean[] = [];
  for (let i = 0; i < count; i++) {
    const f = i / RECORD_SECONDS,
      den = fr[i] ** 2 + fi[i] ** 2,
      h = frf(f, input, output, settings.damping);
    frequencies[i] = f;
    inputSpectrum[i] = Math.sqrt(den) / FS;
    responseSpectrum[i] = Math.hypot(ar[i], ai[i]) / FS;
    measured.push(
      den > 1e-18
        ? {
            re: (ar[i] * fr[i] + ai[i] * fi[i]) / den,
            im: (ai[i] * fr[i] - ar[i] * fi[i]) / den,
          }
        : { re: 0, im: 0 },
    );
    model.push(h);
    valid.push(inputSpectrum[i] > IMPULSE * 0.025);
    coherence[i] = expectedCoherence(
      magnitude(h) ** 2 * den,
      settings.noise ** 2 * N,
    );
  }
  return {
    settings: { ...settings },
    force: forces,
    acceleration,
    q,
    frequencies,
    inputSpectrum,
    responseSpectrum,
    measured,
    model,
    coherence,
    valid,
    residues: fitResidues(frequencies, measured, valid, settings.damping),
    peakAcceleration,
    peakDisplacement,
  };
}
/** Linear complex least squares of real modal residues, with known model poles.
 * This teaching reconstruction uses measured FRFs, not stored shape values. */
function fitResidues(
  frequencies: Float64Array,
  values: Complex[],
  valid: boolean[],
  damping: number,
) {
  const a = Array.from({ length: 6 }, () => Array(7).fill(0));
  frequencies.forEach((f, k) => {
    if (
      !valid[k] ||
      !MODES.some(
        (m) =>
          Math.abs(f - m.frequency) < Math.max(1.5, 2 * damping * m.frequency),
      )
    )
      return;
    const terms = MODES.map((_, j) => modalTerm(j, f, damping));
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++)
        a[i][j] += terms[i].re * terms[j].re + terms[i].im * terms[j].im;
      a[i][6] += terms[i].re * values[k].re + terms[i].im * values[k].im;
    }
  });
  for (let i = 0; i < 6; i++) {
    let pivot = i;
    for (let j = i + 1; j < 6; j++)
      if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    const scale = a[i][i];
    if (Math.abs(scale) < 1e-12) return Array(6).fill(0);
    for (let k = i; k < 7; k++) a[i][k] /= scale;
    for (let j = 0; j < 6; j++)
      if (i !== j) {
        const r = a[j][i];
        for (let k = i; k < 7; k++) a[j][k] -= r * a[i][k];
      }
  }
  return a.map((row) => row[6]);
}
export type Survey = Record<number, number[]>;
export function surveyValues(measurement: Measurement) {
  return MODES.map((m, k) => {
    const ref = GRID[measurement.settings.output],
      phi = shape(k, ref.x, ref.y);
    return Math.abs(phi) < 0.025
      ? NaN
      : (measurement.residues[k] * m.mass) / phi;
  });
}
export function reconstruct(
  mode: number,
  x: number,
  y: number,
  survey: Survey,
) {
  let value = 0,
    weights = 0,
    nearest = Infinity;
  for (const [id, modes] of Object.entries(survey)) {
    if (!Number.isFinite(modes[mode])) continue;
    const p = GRID[+id],
      distance = (x - p.x) ** 2 + (y - p.y) ** 2;
    if (distance < 1e-10) return modes[mode];
    const weight = 1 / (distance * distance);
    value += modes[mode] * weight;
    weights += weight;
    nearest = Math.min(nearest, distance);
  }
  // Compact confidence falloff: sparse observations do not pretend to cover the whole plate.
  return weights ? (value / weights) * Math.exp(-nearest / 0.7) : 0;
}
