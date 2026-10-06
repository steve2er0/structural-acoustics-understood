/** Pressure Fields on a Panel. SI units; one-sided spectra per Hz; exp(+iωt). */
export type Field = "tbl" | "daf" | "pwf";
export type Complex = { re: number; im: number };
export type Settings = {
  field: Field;
  frequency: number;
  pressurePsd: number;
  bandwidth: number;
  length: number;
  width: number;
  thickness: number;
  young: number;
  density: number;
  poisson: number;
  damping: number;
  velocity: number;
  convectionRatio: number;
  alphaX: number;
  alphaY: number;
  delta: number;
  soundSpeed: number;
  heading: number;
  incidence: number;
  azimuth: number;
  modeX: number;
  modeY: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
};
export const DEFAULT: Settings = {
  field: "tbl",
  frequency: 135,
  pressurePsd: 1,
  bandwidth: 1,
  length: 0.9,
  width: 0.6,
  thickness: 0.002,
  young: 69e9,
  density: 2700,
  poisson: 0.33,
  damping: 0.015,
  velocity: 180,
  convectionRatio: 0.7,
  alphaX: 0.12,
  alphaY: 0.7,
  delta: 0.04,
  soundSpeed: 343,
  heading: 0,
  incidence: 55,
  azimuth: 0,
  modeX: 3,
  modeY: 1,
  ax: 0.25,
  ay: 0.5,
  bx: 0.65,
  by: 0.55,
};
export type Mode = { m: number; n: number; frequency: number; mass: number };
export type Solution = {
  uc: number;
  kc: number;
  lambdaC: number;
  lx: number;
  ly: number;
  lambda0: number;
  reducedFrequency: number;
  mode: Mode;
  modes: Mode[];
  coherence: Complex;
  delay: number;
  acceptance: number;
  modalForcePsd: number;
  accelerationPsd: number;
  displacementPsd: number;
  accelerationRms: number;
  displacementRms: number;
  area: number;
  quadratureError: number;
  quadratureConverged: boolean;
  retainedModes: number;
  maxModalFrequency: number;
  notes: string[];
  modalConvergenceError: number;
  modalConverged: boolean;
  firstOmittedFrequency: number;
  recommendedMaxFrequency: number;
  minFrequency: number;
};
const TAU = 2 * Math.PI,
  DEG = Math.PI / 180;
export const MODE_ORDER = 6;
const multiply = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const polar = (phase: number, radius = 1): Complex => ({
  re: radius * Math.cos(phase),
  im: radius * Math.sin(phase),
});
export const magnitude = (z: Complex) => Math.hypot(z.re, z.im);
const sinc = (x: number) =>
  Math.abs(x) < 1e-7 ? 1 - (x * x) / 6 : Math.sin(x) / x;
const convection = (s: Settings) =>
  Math.max(1e-9, s.velocity * s.convectionRatio);

/** Γ(Δr)=E[p(r+Δr) p(r)*]/Spp; positive Δx has negative downstream phase. */
export function coherence(
  s: Settings,
  dx: number,
  dy: number,
  field = s.field,
): Complex {
  const omega = TAU * s.frequency;
  if (field === "daf")
    return { re: sinc((omega * Math.hypot(dx, dy)) / s.soundSpeed), im: 0 };
  if (field === "pwf")
    return polar(
      (-omega / s.soundSpeed) *
        Math.sin(s.incidence * DEG) *
        (dx * Math.cos(s.azimuth * DEG) + dy * Math.sin(s.azimuth * DEG)),
    );
  const c = Math.cos(s.heading * DEG),
    t = Math.sin(s.heading * DEG);
  const along = c * dx + t * dy,
    across = -t * dx + c * dy,
    kc = omega / convection(s);
  return polar(
    -kc * along,
    Math.exp(-kc * (s.alphaX * Math.abs(along) + s.alphaY * Math.abs(across))),
  );
}

/** Peak-normalized simply supported Kirchhoff plate modes. Default 6×6 basis. */
export function modes(s: Settings, modeOrder = MODE_ORDER): Mode[] {
  const rigidity = (s.young * s.thickness ** 3) / (12 * (1 - s.poisson ** 2));
  const mass = (s.density * s.thickness * s.length * s.width) / 4;
  const speed = Math.sqrt(rigidity / (s.density * s.thickness));
  return Array.from({ length: modeOrder ** 2 }, (_, i) => {
    const m = 1 + Math.floor(i / modeOrder),
      n = 1 + (i % modeOrder);
    return {
      m,
      n,
      mass,
      frequency:
        (Math.PI / 2) * speed * ((m / s.length) ** 2 + (n / s.width) ** 2),
    };
  });
}
/** Conservative educational frequency extent; the cursor also gets a modal refinement check. */
export function frequencyRange(s: Settings) {
  const rigidity = (s.young * s.thickness ** 3) / (12 * (1 - s.poisson ** 2));
  const factor =
    (Math.PI / 2) * Math.sqrt(rigidity / (s.density * s.thickness));
  const firstOmittedFrequency =
    factor *
    Math.min(
      ((MODE_ORDER + 1) / s.length) ** 2 + (1 / s.width) ** 2,
      (1 / s.length) ** 2 + ((MODE_ORDER + 1) / s.width) ** 2,
    );
  return {
    minFrequency: 5,
    recommendedMaxFrequency: Math.min(1200, 0.65 * firstOmittedFrequency),
    firstOmittedFrequency,
  };
}
/** Coordinates are fractions of full panel spans, each in [0,1]. */
export function shape(mode: Pick<Mode, "m" | "n">, x: number, y: number) {
  // Exact support zeros prevent roundoff sin(nπ) from appearing on log spectra.
  if (x === 0 || x === 1 || y === 0 || y === 1) return 0;
  return Math.sin(mode.m * Math.PI * x) * Math.sin(mode.n * Math.PI * y);
}
/** Modal receptance (m/N). Damping is viscous ratio ζ, not loss factor η. */
export function receptance(s: Settings, mode: Mode): Complex {
  const w = TAU * s.frequency,
    wn = TAU * mode.frequency;
  const a = mode.mass * (wn * wn - w * w),
    b = mode.mass * 2 * s.damping * wn * w;
  const d = a * a + b * b;
  return { re: a / d, im: -b / d };
}

/** Exact ∫₀ᴸ sin(mπx/L) exp(-ikx) dx, including removable k=±mπ/L poles. */
export function axisIntegral(m: number, length: number, k: number): Complex {
  const a = m * Math.PI,
    b = k * length;
  if (Math.abs(Math.abs(b) - a) > 1e-5) {
    const factor = (length * a) / (a * a - b * b),
      sign = m % 2 ? -1 : 1;
    return {
      re: factor * (1 - sign * Math.cos(b)),
      im: factor * sign * Math.sin(b),
    };
  }
  const p = polar(-(b - a) / 2, sinc((b - a) / 2));
  const q = polar(-(b + a) / 2, sinc((b + a) / 2));
  return {
    re: (length * (p.im - q.im)) / 2,
    im: (-length * (p.re - q.re)) / 2,
  };
}

type Node = { value: number; weight: number };
type Wave = { kx: number; ky: number; weight: number };
const gaussCache = new Map<number, Node[]>();
function gauss(order: number): Node[] {
  const cached = gaussCache.get(order);
  if (cached) return cached;
  const result: Node[] = [];
  for (let i = 0; i < Math.ceil(order / 2); i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (order + 0.5)),
      derivative = 0;
    for (let j = 0; j < 20; j++) {
      let p = 1,
        previous = 0;
      for (let n = 1; n <= order; n++) {
        const next = ((2 * n - 1) * z * p - (n - 1) * previous) / n;
        previous = p;
        p = next;
      }
      derivative = (order * (z * p - previous)) / (z * z - 1);
      const delta = p / derivative;
      z -= delta;
      if (Math.abs(delta) < 1e-15) break;
    }
    const weight = 2 / ((1 - z * z) * derivative * derivative);
    result.push({ value: -z, weight });
    if (i * 2 + 1 < order) result.push({ value: z, weight });
  }
  result.sort((a, b) => a.value - b.value);
  gaussCache.set(order, result);
  return result;
}

/** Positive quadrature over the complete Cauchy distribution; no spectral cutoff.
 * CDF intervals resolve structural lobes and the convective ridge independently.
 * The two unbounded tails remain in the integral, using the same CDF map.
 */
function cauchyNodes(
  center: number,
  scale: number,
  extent: number,
  core: number,
  order: number,
): Node[] {
  if (scale < 1e-12) return [{ value: center, weight: 1 }];
  const points = [0, 1];
  const cdf = (k: number) => 0.5 + Math.atan((k - center) / scale) / Math.PI;
  const panels = Math.max(2, Math.ceil((2 * core * extent) / TAU));
  for (let i = 0; i <= panels; i++)
    points.push(cdf(-core + (2 * core * i) / panels));
  for (const multiple of [0, 0.25, 0.5, 1, 2, 4, 8, 16, 32]) {
    points.push(cdf(center + scale * multiple), cdf(center - scale * multiple));
  }
  points.sort((a, b) => a - b);
  const nodes: Node[] = [];
  for (let i = 1; i < points.length; i++) {
    const width = points[i] - points[i - 1];
    if (width < 1e-13) continue;
    const middle = (points[i] + points[i - 1]) / 2;
    for (const node of gauss(order)) {
      const u = middle + (node.value * width) / 2;
      nodes.push({
        value: center + scale * Math.tan(Math.PI * (u - 0.5)),
        weight: (node.weight * width) / 2,
      });
    }
  }
  return nodes;
}

function corcosNodes(s: Settings, order: number): [Node[], Node[]] {
  const kc = (TAU * s.frequency) / convection(s);
  const c = Math.abs(Math.cos(s.heading * DEG)),
    t = Math.abs(Math.sin(s.heading * DEG));
  const core = ((MODE_ORDER + 3) * Math.PI) / Math.min(s.length, s.width);
  return [
    cauchyNodes(kc, s.alphaX * kc, c * s.length + t * s.width, core, order),
    cauchyNodes(0, s.alphaY * kc, t * s.length + c * s.width, core, order),
  ];
}

/** DAF averages directions over a sphere, not a circle (which would give J₀). */
function waves(s: Settings, field: Field, order: number): Wave[] {
  const k = (TAU * s.frequency) / s.soundSpeed;
  if (field === "pwf")
    return [
      {
        kx: k * Math.sin(s.incidence * DEG) * Math.cos(s.azimuth * DEG),
        ky: k * Math.sin(s.incidence * DEG) * Math.sin(s.azimuth * DEG),
        weight: 1,
      },
    ];
  const output: Wave[] = [];
  if (field === "daf") {
    // Analytic modal transforms are smooth; angular count tracks acoustic aperture.
    const count = Math.max(
      12,
      Math.ceil(k * Math.hypot(s.length, s.width)) + 8 + order * 2,
    );
    const nz = Math.ceil(count / 2),
      na = 2 * count;
    for (const node of gauss(nz)) {
      const radius = k * Math.sqrt(1 - node.value * node.value);
      for (let i = 0; i < na; i++) {
        const angle = (TAU * (i + 0.5)) / na;
        output.push({
          kx: radius * Math.cos(angle),
          ky: radius * Math.sin(angle),
          weight: node.weight / (2 * na),
        });
      }
    }
  } else {
    const [along, across] = corcosNodes(s, order);
    const c = Math.cos(s.heading * DEG),
      t = Math.sin(s.heading * DEG);
    for (const x of along)
      for (const y of across)
        output.push({
          kx: c * x.value - t * y.value,
          ky: t * x.value + c * y.value,
          weight: x.weight * y.weight,
        });
  }
  return output;
}

function planeIntegrals(
  s: Settings,
  kx: number,
  ky: number,
  modeOrder = MODE_ORDER,
): Complex[] {
  const xs = Array.from({ length: modeOrder }, (_, i) =>
    axisIntegral(i + 1, s.length, kx),
  );
  const ys = Array.from({ length: modeOrder }, (_, i) =>
    axisIntegral(i + 1, s.width, ky),
  );
  return xs.flatMap((x) => ys.map((y) => multiply(x, y)));
}

export type ModalMatrix = { re: Float64Array; im: Float64Array; modes: Mode[] };
/** Full G_QQ, row-major, units N²/Hz. Useful for independent covariance diagnostics. */
export function modalForceMatrix(
  s: Settings,
  field = s.field,
  order = 8,
  modeOrder = MODE_ORDER,
): ModalMatrix {
  const basis = modes(s, modeOrder),
    count = basis.length;
  const re = new Float64Array(count * count),
    im = new Float64Array(count * count);
  if (field === "tbl" && Math.abs(Math.sin(s.heading * DEG)) < 1e-10) {
    const [xs, ys] = corcosNodes(s, order),
      sign = Math.cos(s.heading * DEG);
    const axis = (nodes: Node[], length: number) => {
      const real = new Float64Array(modeOrder ** 2),
        imag = new Float64Array(modeOrder ** 2);
      for (const node of nodes) {
        const integrals = Array.from({ length: modeOrder }, (_, i) =>
          axisIntegral(i + 1, length, sign * node.value),
        );
        for (let a = 0; a < modeOrder; a++)
          for (let b = 0; b < modeOrder; b++) {
            const x = integrals[a],
              y = integrals[b],
              index = a * modeOrder + b;
            real[index] += node.weight * (x.re * y.re + x.im * y.im);
            imag[index] += node.weight * (x.im * y.re - x.re * y.im);
          }
      }
      return { real, imag };
    };
    const x = axis(xs, s.length),
      y = axis(ys, s.width);
    for (let a = 0; a < count; a++)
      for (let b = 0; b < count; b++) {
        const ix = (basis[a].m - 1) * modeOrder + basis[b].m - 1;
        const iy = (basis[a].n - 1) * modeOrder + basis[b].n - 1;
        re[a * count + b] =
          s.pressurePsd * (x.real[ix] * y.real[iy] - x.imag[ix] * y.imag[iy]);
        im[a * count + b] =
          s.pressurePsd * (x.imag[ix] * y.real[iy] + x.real[ix] * y.imag[iy]);
      }
  } else {
    for (const wave of waves(s, field, order)) {
      const integrals = planeIntegrals(s, wave.kx, wave.ky, modeOrder),
        weight = s.pressurePsd * wave.weight;
      for (let a = 0; a < count; a++)
        for (let b = 0; b <= a; b++) {
          const x = integrals[a],
            y = integrals[b],
            index = a * count + b;
          re[index] += weight * (x.re * y.re + x.im * y.im);
          im[index] += weight * (x.im * y.re - x.re * y.im);
        }
    }
    for (let a = 0; a < count; a++)
      for (let b = a + 1; b < count; b++) {
        re[a * count + b] = re[b * count + a];
        im[a * count + b] = -im[b * count + a];
      }
  }
  return { re, im, modes: basis };
}

type Integrated = {
  displacement: number;
  selectedForce: number;
  forceTrace: number;
};
/** Integrate |Σ φ_j(B) H_j F_j(k)|². This retains every cross-modal term. */
function integrate(
  s: Settings,
  field: Field,
  order: number,
  modeOrder = MODE_ORDER,
): Integrated {
  const basis = modes(s, modeOrder),
    selected = (Math.round(s.modeX) - 1) * modeOrder + Math.round(s.modeY) - 1;
  const transfers = basis.map((mode) => {
    const h = receptance(s, mode),
      value = shape(mode, s.bx, s.by);
    return { re: value * h.re, im: value * h.im };
  });
  let displacement = 0,
    selectedForce = 0,
    forceTrace = 0;
  if (field === "tbl" && Math.abs(Math.sin(s.heading * DEG)) < 1e-10) {
    const matrix = modalForceMatrix(s, field, order, modeOrder),
      count = basis.length;
    for (let a = 0; a < count; a++) {
      forceTrace += matrix.re[a * count + a];
      for (let b = 0; b < count; b++) {
        const ha = transfers[a],
          hb = transfers[b],
          index = a * count + b;
        displacement +=
          (ha.re * hb.re + ha.im * hb.im) * matrix.re[index] -
          (ha.im * hb.re - ha.re * hb.im) * matrix.im[index];
      }
    }
    selectedForce = matrix.re[selected * count + selected];
  } else {
    const xr = new Float64Array(modeOrder),
      xi = new Float64Array(modeOrder);
    const yr = new Float64Array(modeOrder),
      yi = new Float64Array(modeOrder);
    const fill = (
      length: number,
      k: number,
      re: Float64Array,
      im: Float64Array,
    ) => {
      const b = k * length,
        c = Math.cos(b),
        t = Math.sin(b);
      for (let i = 0; i < modeOrder; i++) {
        const a = (i + 1) * Math.PI,
          sign = i % 2 ? 1 : -1;
        if (Math.abs(Math.abs(b) - a) < 1e-5) {
          const value = axisIntegral(i + 1, length, k);
          re[i] = value.re;
          im[i] = value.im;
        } else {
          const factor = (length * a) / (a * a - b * b);
          re[i] = factor * (1 - sign * c);
          im[i] = factor * sign * t;
        }
      }
    };
    for (const wave of waves(s, field, order)) {
      fill(s.length, wave.kx, xr, xi);
      fill(s.width, wave.ky, yr, yi);
      let re = 0,
        im = 0,
        trace = 0,
        selectedValue = 0;
      for (let a = 0; a < modeOrder; a++)
        for (let b = 0; b < modeOrder; b++) {
          const i = a * modeOrder + b,
            h = transfers[i];
          const pr = xr[a] * yr[b] - xi[a] * yi[b],
            pi = xi[a] * yr[b] + xr[a] * yi[b];
          re += h.re * pr - h.im * pi;
          im += h.im * pr + h.re * pi;
          const power = pr * pr + pi * pi;
          trace += power;
          if (i === selected) selectedValue = power;
        }
      const weight = s.pressurePsd * wave.weight;
      displacement += weight * (re * re + im * im);
      selectedForce += weight * selectedValue;
      forceTrace += weight * trace;
    }
  }
  return { displacement: Math.max(0, displacement), selectedForce, forceTrace };
}

/** Numerical diagnostic entry point: vary spatial quadrature or retained mode order. */
export function integratedResponse(
  s: Settings,
  field = s.field,
  quadratureOrder = 8,
  modeOrder = MODE_ORDER,
) {
  return integrate(s, field, quadratureOrder, modeOrder);
}

function relativeChange(a: Integrated, b: Integrated) {
  return Math.max(
    Math.abs(a.displacement - b.displacement) / Math.max(1e-35, b.displacement),
    Math.abs(a.selectedForce - b.selectedForce) /
      Math.max(1e-20, b.selectedForce),
    Math.abs(a.forceTrace - b.forceTrace) / Math.max(1e-20, b.forceTrace),
  );
}

export function solve(s: Settings): Solution {
  const low = integrate(s, s.field, 4);
  let result = integrate(s, s.field, 8),
    error = relativeChange(low, result);
  if (error > 0.01 && s.field === "tbl") {
    const fine = integrate(s, s.field, 12);
    error = relativeChange(result, fine);
    result = fine;
  }
  const basis = modes(s),
    mode = basis.find((m) => m.m === s.modeX && m.n === s.modeY) ?? basis[0];
  const area = s.length * s.width,
    omega = TAU * s.frequency,
    uc = convection(s),
    kc = omega / uc;
  const accelerationPsd = result.displacement * omega ** 4;
  const expanded = integrate(s, s.field, 8, MODE_ORDER + 2);
  const modalConvergenceError =
    Math.abs(result.displacement - expanded.displacement) /
    Math.max(1e-35, expanded.displacement);
  const maxModalFrequency = Math.max(...basis.map((m) => m.frequency));
  // First omitted frequencies, rather than highest retained mode, identify the truncation risk.
  const range = frequencyRange(s),
    firstOmitted = range.firstOmittedFrequency;
  const notes: string[] = [];
  if (s.frequency > 0.65 * firstOmitted)
    notes.push(
      `36-mode illustration: omitted modes begin near ${firstOmitted.toFixed(0)} Hz; cursor exceeds the recommended modal range.`,
    );
  if (modalConvergenceError > 0.05)
    notes.push(
      `Response changes by ${(100 * modalConvergenceError).toFixed(1)}% with 64 rather than 36 modes; modal truncation matters at this point.`,
    );
  if (error > 0.01)
    notes.push(
      `Spatial quadrature changes by ${(100 * error).toFixed(1)}% on refinement; treat response as approximate.`,
    );
  if (
    s.bandwidth > 0.1 * s.frequency ||
    basis.some(
      (m) =>
        Math.abs(m.frequency - s.frequency) < s.bandwidth &&
        s.bandwidth > s.damping * m.frequency,
    )
  )
    notes.push(
      "RMS uses PSD at the cursor × bandwidth. Near a narrow resonance this is a local narrowband estimate, not an integrated band response.",
    );
  if (s.thickness / Math.min(s.length, s.width) > 0.02)
    notes.push(
      "Thin-plate assumption is weak at this thickness-to-span ratio.",
    );
  return {
    uc,
    kc,
    lambdaC: s.frequency > 0 ? uc / s.frequency : Infinity,
    lx: s.alphaX * kc > 0 ? 1 / (s.alphaX * kc) : Infinity,
    ly: s.alphaY * kc > 0 ? 1 / (s.alphaY * kc) : Infinity,
    lambda0: s.frequency > 0 ? s.soundSpeed / s.frequency : Infinity,
    reducedFrequency: (omega * s.delta) / s.velocity,
    mode,
    modes: basis,
    coherence: coherence(s, (s.bx - s.ax) * s.length, (s.by - s.ay) * s.width),
    delay:
      ((s.bx - s.ax) * s.length * Math.cos(s.heading * DEG) +
        (s.by - s.ay) * s.width * Math.sin(s.heading * DEG)) /
      uc,
    acceptance:
      s.pressurePsd > 0
        ? result.selectedForce / (s.pressurePsd * area * area)
        : integrate({ ...s, pressurePsd: 1 }, s.field, 8).selectedForce /
          (area * area),
    modalForcePsd: result.selectedForce,
    accelerationPsd,
    displacementPsd: result.displacement,
    accelerationRms: Math.sqrt(accelerationPsd * s.bandwidth),
    displacementRms: Math.sqrt(result.displacement * s.bandwidth),
    area,
    quadratureError: error,
    quadratureConverged: error <= 0.01,
    retainedModes: basis.length,
    maxModalFrequency,
    notes,
    modalConvergenceError,
    modalConverged: modalConvergenceError <= 0.05,
    ...range,
  };
}

/** Constant one-point PSD comparison. Exact retained resonances and damping widths are sampled. */
export function spectrum(
  s: Settings,
): { frequency: number; tbl: number; daf: number; pwf: number }[] {
  const last = frequencyRange(s).recommendedMaxFrequency;
  const points = new Set<number>();
  for (let i = 0; i < 64; i++) points.add(5 * (last / 5) ** (i / 63));
  for (const mode of modes(s))
    for (const width of [-4, -2, -1, -0.5, 0, 0.5, 1, 2, 4]) {
      const f = mode.frequency * (1 + width * s.damping);
      if (f >= 5 && f <= last) points.add(f);
    }
  return [...points]
    .sort((a, b) => a - b)
    .map((frequency) => {
      const state = { ...s, frequency },
        factor = (TAU * frequency) ** 4;
      return {
        frequency,
        tbl:
          integrate(
            state,
            "tbl",
            Math.abs(Math.sin(s.heading * DEG)) < 1e-10 ? 6 : 3,
          ).displacement * factor,
        daf: integrate(state, "daf", 6).displacement * factor,
        pwf: integrate(state, "pwf", 6).displacement * factor,
      };
    });
}

type RandomWave = { kx: number; ky: number; amplitude: Complex };
export type Realization = {
  settings: Settings;
  waves: RandomWave[];
  modes: Mode[];
  modalDisplacement: Complex[];
};
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let b = a;
    b = Math.imul(b ^ (b >>> 15), b | 1);
    b ^= b + Math.imul(b ^ (b >>> 7), b | 61);
    return ((b ^ (b >>> 14)) >>> 0) / 4294967296;
  };
}

/** One seeded random-phase, single-frequency pressure realization. Each wave's exact
 * panel integral drives the same 36 modes with their complex dynamic receptance.
 * E[time mean p²]=Spp Δf. Finite-realization RMS need not equal the ensemble readout.
 */
export function createRealization(s: Settings, seed = 19): Realization {
  const rng = random(seed),
    basis = modes(s),
    count = s.field === "pwf" ? 1 : 64;
  const samples: RandomWave[] = [],
    displacement = basis.map(() => ({ re: 0, im: 0 }));
  const kc = (TAU * s.frequency) / convection(s),
    k = (TAU * s.frequency) / s.soundSpeed;
  const c = Math.cos(s.heading * DEG),
    t = Math.sin(s.heading * DEG);
  for (let i = 0; i < count; i++) {
    let kx: number, ky: number;
    if (s.field === "tbl") {
      const along = kc + s.alphaX * kc * Math.tan(Math.PI * (rng() - 0.5));
      const across = s.alphaY * kc * Math.tan(Math.PI * (rng() - 0.5));
      kx = c * along - t * across;
      ky = t * along + c * across;
    } else if (s.field === "daf") {
      const z = 2 * rng() - 1,
        angle = TAU * rng(),
        radius = k * Math.sqrt(1 - z * z);
      kx = radius * Math.cos(angle);
      ky = radius * Math.sin(angle);
    } else {
      kx = k * Math.sin(s.incidence * DEG) * Math.cos(s.azimuth * DEG);
      ky = k * Math.sin(s.incidence * DEG) * Math.sin(s.azimuth * DEG);
    }
    const amplitude = polar(
      TAU * rng(),
      Math.sqrt((2 * s.pressurePsd * s.bandwidth) / count),
    );
    samples.push({ kx, ky, amplitude });
    const integrals = planeIntegrals(s, kx, ky);
    basis.forEach((mode, j) => {
      const value = multiply(
        receptance(s, mode),
        multiply(integrals[j], amplitude),
      );
      displacement[j].re += value.re;
      displacement[j].im += value.im;
    });
  }
  return {
    settings: { ...s },
    waves: samples,
    modes: basis,
    modalDisplacement: displacement,
  };
}

/** phase=ωt; positive time convects pressure in the +heading direction. */
export function sampleRealization(
  realization: Realization,
  x: number,
  y: number,
  phase: number,
) {
  const s = realization.settings;
  let pressure = 0,
    re = 0,
    im = 0;
  for (const wave of realization.waves) {
    const angle = phase - wave.kx * x * s.length - wave.ky * y * s.width;
    pressure +=
      wave.amplitude.re * Math.cos(angle) - wave.amplitude.im * Math.sin(angle);
  }
  realization.modes.forEach((mode, i) => {
    const phi = shape(mode, x, y);
    re += phi * realization.modalDisplacement[i].re;
    im += phi * realization.modalDisplacement[i].im;
  });
  return {
    pressure,
    displacement: re * Math.cos(phase) - im * Math.sin(phase),
  };
}
