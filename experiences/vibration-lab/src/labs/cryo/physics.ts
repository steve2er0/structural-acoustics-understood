/**
 * Cryogenic tank: a finite-dimensional shell/potential-flow energy model.
 * SI internally. Shapes are Ritz approximations, not imported tank FE modes.
 */
import { SLOSH_ROOTS } from "./sloshRoots";
export type Settings = {
  fluid: "lox" | "lh2";
  fill: number;
  ullagePsi: number;
  accelerationG: number;
  surfaceMaxOrder?: number;
  surfaceRadialOrder?: number;
};
export const DEFAULT: Settings = {
  fluid: "lox",
  fill: 0.85,
  ullagePsi: 31,
  accelerationG: 2,
  surfaceMaxOrder: 12,
  surfaceRadialOrder: 2,
};
export const LEGACY_DEFAULT: Settings = {
  ...DEFAULT,
  surfaceMaxOrder: 3,
  surfaceRadialOrder: 1,
};
export const TANK = {
  radius: 4.2,
  diameter: 8.4,
  height: 16.8,
  domeDepth: 2.1,
  barrelHeight: 12.6,
  thickness: 0.00635,
  young: 69e9,
  poisson: 0.33,
  density: 2700,
} as const;
export const FLUIDS = {
  lox: { label: "Liquid oxygen", density: 1140 },
  lh2: { label: "Liquid hydrogen", density: 70.8 },
} as const;
export const G0 = 9.80665;
export const PSI = 6894.757293168;
export type CaseId = "dry" | "mass" | "pressure" | "combined" | "coupled";
export const CASE_IDS: CaseId[] = [
  "dry",
  "mass",
  "pressure",
  "combined",
  "coupled",
];
export const CASE_LABELS: Record<CaseId, string> = {
  dry: "Dry shell",
  mass: "Added mass",
  pressure: "Pressure prestress",
  combined: "Mass + prestress",
  coupled: "Mass + prestress + slosh",
};
export type SloshMode = {
  id: number;
  n: number;
  orientation: "cos" | "sin";
  radialOrder: number;
  root: number;
  frequency: number;
  cylinderFrequency: number;
  label: string;
};
export type ModalMode = {
  id: string;
  label: string;
  kind: "shell" | "slosh";
  frequency: number;
  n: number;
  axialOrder: number;
  orientation: "cos" | "sin";
  vector: number[];
  shellFraction: number;
  sloshFraction: number;
  sloshParticipation: number;
  sloshId?: number;
  referenceId: string;
  match: number;
  /** Overlap with the previous accepted fill state, not with the dry shape. */
  trackingMAC: number;
  /** Weakest accepted overlap from the deterministic empty-tank seed. */
  trackingMinMAC: number;
  trackingAmbiguous: boolean;
  residual: number;
  eigenvalue: number;
  unstable: boolean;
  normalization: number;
};
export type Mode = ModalMode;
export type ModalCase = {
  id: CaseId;
  modes: ModalMode[];
  addedMass: boolean;
  pressure: boolean;
  slosh: boolean;
  maxResidual: number;
};
export type Solution = {
  settings: Settings;
  liquidHeight: number;
  liquidVolume: number;
  liquidMass: number;
  shellMass: number;
  tankVolume: number;
  shellArea: number;
  surfaceRadius: number;
  density: number;
  ullagePa: number;
  headPa: number;
  bottomPa: number;
  slosh: SloshMode[];
  cases: Record<CaseId, ModalCase>;
  notes: string[];
  fluidActive: boolean;
  surfaceActive: boolean;
  retainedSlosh: number;
};
export type Selection = {
  kind: "shell" | "slosh";
  n?: number;
  axialOrder?: number;
  sloshId?: number;
  orientation?: "cos" | "sin";
};

type Matrix = number[][];
type ShellBasis = {
  n: number;
  axialOrder: number;
  orientation: "cos" | "sin";
  index: number;
};
type Block = {
  n: number;
  orientation: "cos" | "sin";
  basis: ShellBasis[];
  dryMass: Matrix;
  dryStiffness: Matrix;
  geometric: Matrix;
  fluidMass: Matrix;
  gravity: Matrix;
  addedMass: Matrix;
  slosh?: SloshMode[];
  flux: number[];
};
const TAU = 2 * Math.PI;
export const STRUCTURAL_ORDER = 5;
/** Scene / comparison coverage; higher Fourier diagnostic orders remain separate. */
export const SHELL_MAX_ORDER = 12;
export const POTENTIAL_RADIAL_ORDER = 4;
export const POTENTIAL_AXIAL_ORDER = 8;
const SHAPES: ShellBasis[] = [];
for (let n = 0; n <= SHELL_MAX_ORDER; n++)
  for (const orientation of (n > 0 && n < 4 ? ["cos", "sin"] : ["cos"]) as (
    "cos" | "sin"
  )[])
    for (let axialOrder = 1; axialOrder <= STRUCTURAL_ORDER; axialOrder++)
      SHAPES.push({ n, orientation, axialOrder, index: SHAPES.length });
const NSHELL = SHAPES.length;
const SLOSH_TEMPLATE: Omit<SloshMode, "frequency" | "cylinderFrequency">[] = [
  {
    id: 1,
    n: 1,
    orientation: "cos",
    radialOrder: 1,
    root: 1.841183781340659,
    label: "Slosh 1 · lateral cosine",
  },
  {
    id: 2,
    n: 1,
    orientation: "sin",
    radialOrder: 1,
    root: 1.841183781340659,
    label: "Slosh 2 · lateral sine",
  },
  {
    id: 3,
    n: 2,
    orientation: "cos",
    radialOrder: 1,
    root: 3.05423692822714,
    label: "Slosh 3 · two-lobe cosine",
  },
  {
    id: 4,
    n: 2,
    orientation: "sin",
    radialOrder: 1,
    root: 3.05423692822714,
    label: "Slosh 4 · two-lobe sine",
  },
  {
    id: 5,
    n: 0,
    orientation: "cos",
    radialOrder: 1,
    root: 3.831705970207513,
    label: "Slosh 5 · axisymmetric",
  },
  {
    id: 6,
    n: 3,
    orientation: "cos",
    radialOrder: 1,
    root: 4.201188941210528,
    label: "Slosh 6 · three-lobe cosine",
  },
  {
    id: 7,
    n: 3,
    orientation: "sin",
    radialOrder: 1,
    root: 4.201188941210528,
    label: "Slosh 7 · three-lobe sine",
  },
];
// Stable coordinate IDs preserve the original seven while extending coverage.
for (let radialOrder = 1; radialOrder <= 4; radialOrder++)
  for (let n = 0; n <= 20; n++)
    for (const orientation of (n ? ["cos", "sin"] : ["cos"]) as (
      "cos" | "sin"
    )[])
      if (
        !SLOSH_TEMPLATE.some(
          (s) =>
            s.n === n &&
            s.orientation === orientation &&
            s.radialOrder === radialOrder,
        )
      )
        SLOSH_TEMPLATE.push({
          id: SLOSH_TEMPLATE.length + 1,
          n,
          orientation,
          radialOrder,
          root: SLOSH_ROOTS[n][radialOrder - 1],
          label: `Surface n=${n} · radial ${radialOrder} · ${orientation}`,
        });

/** Higher angular families share the shell's cosine representative convention. */
export function surfaceShapes(
  settings: Settings = DEFAULT,
  n?: number,
  orientation?: "cos" | "sin",
): SloshMode[] {
  const maximum = settings.surfaceMaxOrder ?? DEFAULT.surfaceMaxOrder!,
    radial = settings.surfaceRadialOrder ?? DEFAULT.surfaceRadialOrder!;
  return SLOSH_TEMPLATE.filter(
    (s) =>
      s.n <= maximum &&
      s.radialOrder <= radial &&
      (n === undefined ? s.n < 4 || s.orientation === "cos" : s.n === n) &&
      (orientation === undefined || s.orientation === orientation),
  ).map((s) => ({ ...s, frequency: 0, cylinderFrequency: 0 }));
}
const zero = (n: number, m = n): Matrix =>
  Array.from({ length: n }, () => Array(m).fill(0));
const identity = (n: number): Matrix =>
  zero(n).map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
const transpose = (a: Matrix): Matrix => a[0].map((_, i) => a.map((r) => r[i]));
const mul = (a: Matrix, b: Matrix): Matrix =>
  a.map((r) => b[0].map((_, j) => r.reduce((s, v, k) => s + v * b[k][j], 0)));
const quadratic = (a: Matrix, x: number[]) =>
  x.reduce(
    (v, xi, i) => v + xi * a[i].reduce((s, aij, j) => s + aij * x[j], 0),
    0,
  );
const project = (a: Matrix, t: Matrix): Matrix => mul(transpose(t), mul(a, t));
function cholesky(a: Matrix): Matrix {
  const n = a.length,
    l = zero(n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let v = a[i][j];
      for (let k = 0; k < j; k++) v -= l[i][k] * l[j][k];
      if (i === j) {
        if (v <= 0 || !Number.isFinite(v))
          throw new Error("Non-positive kinetic energy in tank reduction");
        l[i][j] = Math.sqrt(v);
      } else l[i][j] = v / l[j][j];
    }
  return l;
}
function inverseLower(l: Matrix): Matrix {
  const n = l.length,
    out = zero(n);
  for (let j = 0; j < n; j++)
    for (let i = j; i < n; i++) {
      let v = i === j ? 1 : 0;
      for (let k = j; k < i; k++) v -= l[i][k] * out[k][j];
      out[i][j] = v / l[i][i];
    }
  return out;
}
function inverseSPD(a: Matrix): Matrix {
  const li = inverseLower(cholesky(a));
  return mul(transpose(li), li);
}
/** Select independent normalized potential trials; never add an artificial energy diagonal. */
function independentPotentialTrials(gram: Matrix): number[] {
  const n = gram.length,
    factors = zero(n),
    diagonal = gram.map((r, i) => r[i]),
    selected: number[] = [],
    used = new Set<number>();
  for (let k = 0; k < n; k++) {
    let pivot = -1,
      big = 0;
    for (let i = 0; i < n; i++)
      if (!used.has(i) && diagonal[i] > big) {
        big = diagonal[i];
        pivot = i;
      }
    if (pivot < 0 || big < 1e-10) break;
    used.add(pivot);
    selected.push(pivot);
    const root = Math.sqrt(big);
    for (let i = 0; i < n; i++)
      if (!used.has(i) || i === pivot) {
        let value = gram[i][pivot];
        for (let j = 0; j < k; j++) value -= factors[i][j] * factors[pivot][j];
        factors[i][k] = value / root;
        diagonal[i] -= factors[i][k] ** 2;
      }
  }
  return selected;
}
export function symmetricEigen(a: Matrix): {
  values: number[];
  vectors: Matrix;
} {
  const d = a.map((r) => r.slice()),
    v = identity(a.length),
    n = a.length;
  for (let step = 0; step < 100 * n * n; step++) {
    let p = 0,
      q = 0,
      big = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (Math.abs(d[i][j]) > big) {
          big = Math.abs(d[i][j]);
          p = i;
          q = j;
        }
    const magnitude = Math.max(1, ...d.map((r, i) => Math.abs(r[i])));
    if (big < (n > 6 ? 1e-15 : 1e-13) * magnitude) break;
    const t = 0.5 * Math.atan2(2 * d[p][q], d[q][q] - d[p][p]),
      c = Math.cos(t),
      s = Math.sin(t);
    const pp = d[p][p],
      qq = d[q][q],
      pq = d[p][q];
    d[p][p] = c * c * pp - 2 * s * c * pq + s * s * qq;
    d[q][q] = s * s * pp + 2 * s * c * pq + c * c * qq;
    d[p][q] = d[q][p] = 0;
    for (let i = 0; i < n; i++)
      if (i !== p && i !== q) {
        const ip = d[i][p],
          iq = d[i][q];
        d[i][p] = d[p][i] = c * ip - s * iq;
        d[i][q] = d[q][i] = s * ip + c * iq;
      }
    for (let i = 0; i < n; i++) {
      const ip = v[i][p],
        iq = v[i][q];
      v[i][p] = c * ip - s * iq;
      v[i][q] = s * ip + c * iq;
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (i, j) => d[i][i] - d[j][j],
  );
  return {
    values: order.map((i) => d[i][i]),
    vectors: order.map((i) => v.map((r) => r[i])),
  };
}
export function generalizedEigen(k: Matrix, m: Matrix) {
  const li = inverseLower(cholesky(m)),
    a = mul(li, mul(k, transpose(li))),
    e = symmetricEigen(a);
  const vectors = e.vectors.map((v) =>
    transpose(li).map((r) => r.reduce((s, x, i) => s + x * v[i], 0)),
  );
  const residuals = vectors.map((v, i) => {
    const kv = k.map((r) => r.reduce((s, x, j) => s + x * v[j], 0)),
      mv = m.map((r) => r.reduce((s, x, j) => s + x * v[j], 0));
    return (
      Math.hypot(...kv.map((x, j) => x - e.values[i] * mv[j])) /
      Math.max(
        1e-30,
        Math.hypot(...kv) + Math.abs(e.values[i]) * Math.hypot(...mv),
      )
    );
  });
  return { values: e.values, vectors, residuals };
}
function gauss(n: number): { x: number; w: number }[] {
  const out: { x: number; w: number }[] = [];
  for (let i = 0; i < n; i++) {
    let x = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5)),
      dp = 0;
    for (let s = 0; s < 20; s++) {
      let p0 = 1,
        p1 = x;
      for (let j = 2; j <= n; j++) {
        const p = ((2 * j - 1) * x * p1 - (j - 1) * p0) / j;
        p0 = p1;
        p1 = p;
      }
      dp = (n * (x * p1 - p0)) / (x * x - 1);
      const dx = p1 / dp;
      x -= dx;
      if (Math.abs(dx) < 1e-15) break;
    }
    out.push({ x, w: 2 / ((1 - x * x) * dp * dp) });
  }
  return out;
}
const GZ = gauss(28),
  GR = gauss(12),
  GS = gauss(18);
function integrateSegments(
  end: number,
  points = GZ,
): { z: number; w: number }[] {
  const ends = [0, TANK.domeDepth, TANK.height - TANK.domeDepth, end]
    .filter((z) => z >= 0 && z <= end)
    .sort((a, b) => a - b);
  const unique = [...new Set(ends)];
  if (unique[unique.length - 1] !== end) unique.push(end);
  const out: { z: number; w: number }[] = [];
  for (let s = 1; s < unique.length; s++) {
    const lo = unique[s - 1],
      hi = unique[s];
    if (hi - lo < 1e-12) continue;
    for (const q of points)
      out.push({
        z: (lo + hi) / 2 + (q.x * (hi - lo)) / 2,
        w: (q.w * (hi - lo)) / 2,
      });
  }
  return out;
}
export function radiusAt(z: number): number {
  if (z <= 0 || z >= TANK.height) return 0;
  if (z < TANK.domeDepth) {
    const x = (z - TANK.domeDepth) / TANK.domeDepth;
    return TANK.radius * Math.sqrt(Math.max(0, 1 - x * x));
  }
  if (z > TANK.height - TANK.domeDepth) {
    const x = (z - (TANK.height - TANK.domeDepth)) / TANK.domeDepth;
    return TANK.radius * Math.sqrt(Math.max(0, 1 - x * x));
  }
  return TANK.radius;
}
function radiusDerivatives(z: number) {
  let x = 0;
  if (z < TANK.domeDepth) x = (z - TANK.domeDepth) / TANK.domeDepth;
  else if (z > TANK.height - TANK.domeDepth)
    x = (z - (TANK.height - TANK.domeDepth)) / TANK.domeDepth;
  else return { r: TANK.radius, r1: 0, r2: 0 };
  const d = Math.max(1e-14, 1 - x * x),
    r = TANK.radius * Math.sqrt(d);
  return {
    r,
    r1: (-TANK.radius * x) / (TANK.domeDepth * Math.sqrt(d)),
    r2: -TANK.radius / (TANK.domeDepth * TANK.domeDepth * d ** 1.5),
  };
}
export function volumeBelow(h: number): number {
  const z = Math.max(0, Math.min(TANK.height, h)),
    c = TANK.domeDepth,
    r = TANK.radius,
    A = Math.PI * r * r;
  const dome = (u: number) => A * ((u * u) / c - (u * u * u) / (3 * c * c));
  if (z < c) return dome(z);
  if (z <= TANK.height - c) return (2 * A * c) / 3 + A * (z - c);
  return 2 * ((2 * A * c) / 3) + A * TANK.barrelHeight - dome(TANK.height - z);
}
export const TANK_VOLUME = volumeBelow(TANK.height);
export function heightForFill(fill: number): number {
  const target = TANK_VOLUME * Math.max(0, Math.min(1, fill));
  let lo = 0,
    hi: number = TANK.height;
  for (let i = 0; i < 55; i++) {
    const mid = (lo + hi) / 2;
    if (volumeBelow(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const SHELL_AREA = integrateSegments(TANK.height).reduce((sum, q) => {
  const r = radiusDerivatives(q.z);
  return sum + TAU * r.r * Math.sqrt(1 + r.r1 * r.r1) * q.w;
}, 0);
export function pressureAt(s: Solution, z: number) {
  const head =
    s.density * s.settings.accelerationG * G0 * Math.max(0, s.liquidHeight - z);
  return { ullage: s.ullagePa, head, total: s.ullagePa + head };
}
export function besselJ(n: number, x: number): number {
  // Integer-order integral avoids catastrophic series cancellation at higher roots.
  if (x > 8)
    return BESSEL_QUADRATURE.reduce((sum, q) => {
      const t = (Math.PI * (q.x + 1)) / 2;
      return sum + (q.w * Math.cos(n * t - x * Math.sin(t))) / 2;
    }, 0);
  let t = (x / 2) ** n;
  for (let k = 2; k <= n; k++) t /= k;
  let sum = t;
  for (let k = 1; k < 40; k++) {
    t *= -((x * x) / 4) / (k * (k + n));
    sum += t;
    if (Math.abs(t) < 1e-16) break;
  }
  return sum;
}
const BESSEL_QUADRATURE = gauss(64);
function sloshShape(s: SloshMode, r: number, surfaceRadius: number) {
  return surfaceRadius > 1e-9 ? besselJ(s.n, (s.root * r) / surfaceRadius) : 0;
}
/** Displacement components in cylindrical coordinates for a unit Ritz coordinate. */
function basisShape(b: ShellBasis, z: number) {
  const H = TANK.height,
    R = TANK.radius,
    zsafe = Math.max(1e-6, Math.min(H - 1e-6, z));
  const { r, r1, r2 } = radiusDerivatives(zsafe),
    k = Math.PI / H,
    j = b.axialOrder - 1;
  const x = (2 * zsafe) / H - 1,
    xp = 2 / H;
  const polynomial = legendreSecond(j, x);
  const P = polynomial.p,
    P1 = polynomial.d * xp,
    P2 = polynomial.dd * xp * xp;
  const e = Math.sin(k * zsafe) ** 2,
    e1 = k * Math.sin(2 * k * zsafe),
    e2 = 2 * k * k * Math.cos(2 * k * zsafe);
  const F = e * P,
    F1 = e1 * P + e * P1,
    F2 = e2 * P + 2 * e1 * P1 + e * P2;
  const ur = (r / R) * F,
    ur1 = (r1 * F + r * F1) / R,
    ur2 = (r2 * F + 2 * r1 * F1 + r * F2) / R;
  // Inextensional hoop/shear motion in the barrel; smooth end taper on domes.
  const vt = b.n > 0 ? -ur / b.n : 0,
    vt1 = b.n > 0 ? -ur1 / b.n : 0,
    vt2 = b.n > 0 ? -ur2 / b.n : 0;
  const zz = b.n > 0 ? ((-r * r) / (R * b.n * b.n)) * F1 : 0;
  const zz1 = b.n > 0 ? -(2 * r * r1 * F1 + r * r * F2) / (R * b.n * b.n) : 0;
  // Second axial derivative only enters curvature; stable centered difference here.
  const dz = 2e-4;
  const axialAt = (t: number) => {
    const rt = radiusAt(t),
      xt = (2 * t) / H - 1,
      lp = legendreSecond(j, xt),
      Pt = lp.p,
      Pt1 = lp.d * xp;
    return b.n > 0
      ? ((-rt * rt) / (R * b.n * b.n)) *
          (k * Math.sin(2 * k * t) * Pt + Math.sin(k * t) ** 2 * Pt1)
      : 0;
  };
  const zz2 =
    b.n > 0
      ? (axialAt(zsafe + dz) - 2 * zz + axialAt(zsafe - dz)) / (dz * dz)
      : 0;
  return { ur, vt, zz, ur1, vt1, zz1, ur2, vt2, zz2 };
}
function strain(b: ShellBasis, z: number) {
  const u = basisShape(b, z),
    { r, r1, r2 } = radiusDerivatives(z),
    g = 1 + r1 * r1,
    sg = Math.sqrt(g),
    n = b.n;
  const es = (r1 * u.ur1 + u.zz1) / g,
    et = (u.ur + n * u.vt) / r;
  const shear = (r1 * (-n * u.ur - u.vt) - n * u.zz + r * u.vt1) / (r * sg);
  const ndz = (u.ur1 - r1 * u.zz1) / sg,
    ndt = (-n * u.ur - u.vt + r1 * n * u.zz) / sg;
  const ks = ((u.ur2 - r1 * u.zz2) / sg - (ndz * r1 * r2) / g) / g;
  const kt =
    (-(n * n + 1) * u.ur - 2 * n * u.vt + r1 * n * n * u.zz) / sg / (r * r) +
    (ndz * r1) / (g * r);
  const kst =
    (2 * ((-n * u.ur1 - u.vt1 + r1 * n * u.zz1) / sg - (ndt * r1) / r)) /
    (r * sg);
  return { u, es, et, shear, ks, kt, kst, r, r1, g, sg };
}
const SHELL_CACHE = new Map<
  string,
  { mass: Matrix; stiffness: Matrix; basis: ShellBasis[] }
>();
function shellMatrices(
  n: number,
  orientation: "cos" | "sin",
  orders = STRUCTURAL_ORDER,
) {
  const key = `${n}-${orientation}-${orders}`,
    cached = SHELL_CACHE.get(key);
  if (cached) return cached;
  const existing = SHAPES.filter(
    (b) => b.n === n && b.orientation === orientation,
  );
  const basis =
      orders === STRUCTURAL_ORDER && existing.length > 0
        ? existing
        : Array.from({ length: orders }, (_, i) => ({
            n,
            orientation,
            axialOrder: i + 1,
            index: i,
          })),
    size = basis.length,
    mass = zero(size),
    stiffness = zero(size),
    angular = n === 0 ? TAU : Math.PI;
  const A = (TANK.young * TANK.thickness) / (1 - TANK.poisson * TANK.poisson),
    D = (A * TANK.thickness * TANK.thickness) / 12,
    nu = TANK.poisson;
  for (const q of integrateSegments(TANK.height)) {
    const v = basis.map((b) => strain(b, q.z)),
      dA = angular * v[0].r * v[0].sg * q.w;
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++) {
        const a = v[i],
          b = v[j];
        mass[i][j] +=
          TANK.density *
          TANK.thickness *
          dA *
          (a.u.ur * b.u.ur + a.u.vt * b.u.vt + a.u.zz * b.u.zz);
        stiffness[i][j] +=
          dA *
          (A *
            (a.es * b.es +
              a.et * b.et +
              nu * (a.es * b.et + a.et * b.es) +
              ((1 - nu) * a.shear * b.shear) / 2) +
            D *
              (a.ks * b.ks +
                a.kt * b.kt +
                nu * (a.ks * b.kt + a.kt * b.ks) +
                ((1 - nu) * a.kst * b.kst) / 2));
      }
  }
  const result = { mass, stiffness, basis };
  SHELL_CACHE.set(key, result);
  return result;
}
function pressureMatrix(
  basis: ShellBasis[],
  s: Settings,
  h: number,
  density: number,
) {
  const size = basis.length,
    out = zero(size),
    n = basis[0].n,
    angular = n === 0 ? TAU : Math.PI;
  // Barrel membrane tension. Dome bending equilibrium / attachment reactions
  // require a separate static FE model; no invented dome stress enters KG.
  const lo = TANK.domeDepth,
    hi = TANK.height - TANK.domeDepth,
    R = TANK.radius;
  for (const g of GZ) {
    const z = (lo + hi) / 2 + (g.x * (hi - lo)) / 2,
      w = (g.w * (hi - lo)) / 2,
      p =
        s.ullagePsi * PSI + density * s.accelerationG * G0 * Math.max(0, h - z),
      Ns = (p * R) / 2,
      Nt = p * R;
    const u = basis.map((b) => basisShape(b, z));
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++) {
        const a = u[i],
          b = u[j];
        const axial = a.ur1 * b.ur1 + a.vt1 * b.vt1 + a.zz1 * b.zz1;
        const hoop =
          ((n * a.ur + a.vt) * (n * b.ur + b.vt) +
            (a.ur + n * a.vt) * (b.ur + n * b.vt) +
            n * n * a.zz * b.zz) /
          (R * R);
        out[i][j] += angular * R * w * (Ns * axial + Nt * hoop);
      }
  }
  return out;
}
function legendreSecond(
  l: number,
  x: number,
): { p: number; d: number; dd: number } {
  if (l === 0) return { p: 1, d: 0, dd: 0 };
  let p0 = 1,
    p1 = x,
    d0 = 0,
    d1 = 1,
    dd0 = 0,
    dd1 = 0;
  for (let i = 2; i <= l; i++) {
    const p = ((2 * i - 1) * x * p1 - (i - 1) * p0) / i,
      d = ((2 * i - 1) * (p1 + x * d1) - (i - 1) * d0) / i,
      dd = ((2 * i - 1) * (2 * d1 + x * dd1) - (i - 1) * dd0) / i;
    p0 = p1;
    p1 = p;
    d0 = d1;
    d1 = d;
    dd0 = dd1;
    dd1 = dd;
  }
  return { p: p1, d: d1, dd: dd1 };
}
function legendre(l: number, x: number): { p: number; d: number } {
  if (l === 0) return { p: 1, d: 0 };
  let p0 = 1,
    p1 = x,
    d0 = 0,
    d1 = 1;
  for (let i = 2; i <= l; i++) {
    const p = ((2 * i - 1) * x * p1 - (i - 1) * p0) / i,
      d = ((2 * i - 1) * (p1 + x * d1) - (i - 1) * d0) / i;
    p0 = p1;
    p1 = p;
    d0 = d1;
    d1 = d;
  }
  return { p: p1, d: d1 };
}
type Potential = {
  power: number;
  axial: number;
  pressureRelease?: boolean;
  radialIndex?: number;
  angularOrder?: number;
  scaleRadius?: number;
  axialBeta?: number;
};
function potentialBasis(
  n: number,
  radial = 3,
  axial = 6,
  pressureRelease = false,
): Potential[] {
  const out: Potential[] = [];
  for (let j = 0; j < radial; j++)
    // Enforce the surface condition within the SAME polynomial degree as the
    // unconstrained space: one axial direction is removed per radial order.
    // Multiplying all axial trials would raise degree and break nested-energy bounds.
    for (let l = 0; l < axial - (pressureRelease ? 1 : 0); l++)
      if (pressureRelease || n !== 0 || j !== 0 || l !== 0)
        out.push({
          power: n + 2 * j,
          axial: l,
          pressureRelease,
          ...(radial >= 5 ? { radialIndex: j, angularOrder: n } : {}),
        });
  return out;
}
function potential(p: Potential, r: number, z: number, h: number) {
  const R = p.scaleRadius ?? TANK.radius,
    t = r / R,
    x = (2 * z) / h - 1,
    L =
      p.axialBeta === undefined
        ? legendre(p.axial, x)
        : {
            p: jacobiPolynomial(p.axial, 0, p.axialBeta, x),
            d: p.axial
              ? ((p.axial + p.axialBeta + 1) / 2) *
                jacobiPolynomial(p.axial - 1, 1, p.axialBeta + 1, x)
              : 0,
          },
    radialPolynomial =
      p.radialIndex === undefined
        ? undefined
        : {
            p: jacobiPolynomial(
              p.radialIndex,
              0,
              p.angularOrder!,
              2 * t * t - 1,
            ),
            d: p.radialIndex
              ? ((p.radialIndex + p.angularOrder! + 1) / 2) *
                jacobiPolynomial(
                  p.radialIndex - 1,
                  1,
                  p.angularOrder! + 1,
                  2 * t * t - 1,
                )
              : 0,
          },
    rn = t ** (p.angularOrder ?? p.power),
    rp = radialPolynomial ? rn * radialPolynomial.p : rn,
    derivative = radialPolynomial
      ? ((p.angularOrder!
          ? p.angularOrder! * t ** (p.angularOrder! - 1) * radialPolynomial.p
          : 0) +
          rn * radialPolynomial.d * 4 * t) /
        R
      : p.power === 0
        ? 0
        : (p.power / R) * t ** (p.power - 1),
    surfaceFactor = p.pressureRelease ? 1 - z / h : 1;
  return {
    v: rp * L.p * surfaceFactor,
    dr: derivative * L.p * surfaceFactor,
    dz:
      (rp * L.d * 2 * surfaceFactor) / h -
      (p.pressureRelease ? (rp * L.p) / h : 0),
  };
}
function jacobiPolynomial(
  order: number,
  alpha: number,
  beta: number,
  x: number,
): number {
  if (!order) return 1;
  let p0 = 1,
    p1 = (alpha - beta + (alpha + beta + 2) * x) / 2;
  for (let k = 2; k <= order; k++) {
    const t = 2 * k + alpha + beta,
      a = 2 * k * (k + alpha + beta) * (t - 2),
      b = (t - 1) * (t * (t - 2) * x + alpha * alpha - beta * beta),
      c = 2 * (k + alpha - 1) * (k + beta - 1) * t,
      p = (b * p1 - c * p0) / a;
    p0 = p1;
    p1 = p;
  }
  return p1;
}
export type SurfaceBoundary = "retained" | "rigid" | "pressure-release";
const FLUID_CACHE = new Map<
  string,
  {
    mass: Matrix;
    added: Matrix;
    gravityUnit: Matrix;
    flux: number[];
    sloshMass: number;
    potentials: Potential[];
    response: Matrix;
    potentialRank: number;
    potentialTrials: number;
  }
>();
function fluidMatrices(
  basis: ShellBasis[],
  h: number,
  slosh: SloshMode | SloshMode[] | undefined,
  full: boolean,
  radial = POTENTIAL_RADIAL_ORDER,
  axial = POTENTIAL_AXIAL_ORDER,
  cylinder = false,
  radialQuadrature = GR.length,
  energyGram = false,
  options: {
    boundary?: SurfaceBoundary;
    /** Prescribed normal wall shapes for independent cylindrical benchmarks. */
    wallNormal?: (z: number) => number[];
  } = {},
) {
  const shapes = slosh ? (Array.isArray(slosh) ? slosh : [slosh]) : [],
    boundary = options.boundary ?? "retained",
    pressureRelease = !full && boundary === "pressure-release",
    n = basis[0].n,
    size = basis.length,
    ns = !full && boundary === "retained" ? shapes.length : 0,
    total = size + ns;
  const key = `${n}-${h.toFixed(9)}-${full}-${radial}-${axial}-${size}-${cylinder}-${radialQuadrature}-${shapes.map((s) => s.id).join(",")}-${energyGram}-${boundary}`;
  const saved = options.wallNormal ? undefined : FLUID_CACHE.get(key);
  if (saved) return saved;
  const psi = potentialBasis(n, radial, axial, pressureRelease),
    np = psi.length,
    L = zero(np),
    B = zero(np, total),
    angular = n === 0 ? TAU : Math.PI;
  if (radial >= 5)
    psi.forEach((p) => {
      p.scaleRadius =
        !cylinder && h < TANK.domeDepth ? radiusAt(h) : TANK.radius;
      if (!cylinder && h < TANK.domeDepth) p.axialBeta = n;
    });
  const fluidRadius = (z: number) => (cylinder ? TANK.radius : radiusAt(z));
  const fluidDerivatives = (z: number) =>
    cylinder ? { r: TANK.radius, r1: 0, r2: 0 } : radiusDerivatives(z);
  const Rs = fluidRadius(h),
    area = Math.PI * Rs * Rs,
    flux = Array(size).fill(0),
    grav = zero(total);
  const zq = integrateSegments(h),
    rq = radialQuadrature === GR.length ? GR : gauss(radialQuadrature);
  if (radial >= 5) {
    // Separate radial and axial products before the tensor contraction. This
    // uses the same Gauss points, while avoiding a full np² loop at every r.
    for (const q of zq) {
      const r = fluidRadius(q.z),
        radialMass = zero(radial),
        radialEnergy = zero(radial),
        prototypes = Array.from({ length: radial }, (_, j) => ({
          power: n + 2 * j,
          axial: 0,
          radialIndex: j,
          angularOrder: n,
          scaleRadius: psi[0].scaleRadius,
        }));
      for (const g of rq) {
        const rr = (r * (g.x + 1)) / 2,
          w = (angular * rr * r * g.w) / 2,
          values = prototypes.map((p) => potential(p, rr, q.z, h));
        for (let i = 0; i < radial; i++)
          for (let j = 0; j <= i; j++) {
            radialMass[i][j] += w * values[i].v * values[j].v;
            radialEnergy[i][j] +=
              w *
              (values[i].dr * values[j].dr +
                (n ? (n * n * values[i].v * values[j].v) / (rr * rr) : 0));
          }
      }
      for (let i = 0; i < radial; i++)
        for (let j = 0; j < i; j++) {
          radialMass[j][i] = radialMass[i][j];
          radialEnergy[j][i] = radialEnergy[i][j];
        }
      const axialValues = psi.map((p) =>
        potential(
          {
            power: 0,
            axial: p.axial,
            pressureRelease: p.pressureRelease,
            axialBeta: p.axialBeta,
          },
          1,
          q.z,
          h,
        ),
      );
      for (let i = 0; i < np; i++)
        for (let j = 0; j <= i; j++) {
          const ri = (psi[i].power - n) / 2,
            rj = (psi[j].power - n) / 2;
          L[i][j] +=
            q.w *
            (radialEnergy[ri][rj] * axialValues[i].v * axialValues[j].v +
              radialMass[ri][rj] * axialValues[i].dz * axialValues[j].dz);
        }
    }
  } else {
    for (const q of zq) {
      const r = fluidRadius(q.z);
      for (const g of rq) {
        const rr = (r * (g.x + 1)) / 2,
          w = ((angular * rr * r) / 2) * g.w * q.w,
          p = psi.map((v) => potential(v, rr, q.z, h));
        for (let i = 0; i < np; i++)
          for (let j = 0; j <= i; j++)
            L[i][j] +=
              w *
              (p[i].dr * p[j].dr +
                p[i].dz * p[j].dz +
                (n > 0 ? (n * n * p[i].v * p[j].v) / (rr * rr) : 0));
      }
    }
  }
  for (let i = 0; i < np; i++) for (let j = 0; j < i; j++) L[j][i] = L[i][j];
  for (const q of zq) {
    const { r, r1 } = fluidDerivatives(q.z),
      normal = options.wallNormal
        ? options.wallNormal(q.z)
        : basis.map((b) => {
            const u = basisShape(b, q.z);
            return u.ur - r1 * u.zz;
          }),
      p = psi.map((v) => potential(v, r, q.z, h).v);
    for (let j = 0; j < size; j++) {
      const wallFlux = normal[j] * r * q.w * angular;
      if (n === 0) flux[j] += wallFlux;
      for (let i = 0; i < np; i++) B[i][j] += p[i] * wallFlux;
    }
  }
  if (!full && boundary === "retained" && area > 1e-10) {
    const surfaceQuadrature = shapes.some((s) => s.radialOrder > 1 || s.n > 3)
      ? gauss(
          Math.max(
            GS.length,
            Math.ceil(Math.max(...shapes.map((s) => s.root))) + 8,
          ),
        )
      : GS;
    for (const g of surfaceQuadrature) {
      const r = (Rs * (g.x + 1)) / 2,
        w = ((angular * r * Rs) / 2) * g.w,
        p = psi.map((v) => potential(v, r, h, h).v);
      const eta = shapes.map((s) => sloshShape(s, r, Rs));
      const surface = Array.from({ length: total }, (_, j) =>
        j < size ? (n === 0 ? -flux[j] / area : 0) : eta[j - size],
      );
      for (let i = 0; i < np; i++)
        for (let j = 0; j < total; j++) B[i][j] += p[i] * surface[j] * w;
      for (let i = 0; i < total; i++)
        for (let j = 0; j < total; j++)
          grav[i][j] += surface[i] * surface[j] * w;
    }
  }
  // Scaling avoids ill-conditioning from polynomial basis magnitudes.
  const d = L.map((row, i) => Math.sqrt(row[i]));
  const Ln = L.map((row, i) => row.map((v, j) => v / (d[i] * d[j]))),
    Bn = B.map((row, i) => row.map((v) => v / d[i]));
  const selected =
      radial >= 5
        ? independentPotentialTrials(Ln)
        : Array.from({ length: np }, (_, i) => i),
    reducedL = selected.map((i) => selected.map((j) => Ln[i][j])),
    reducedB = selected.map((i) => Bn[i]),
    invLn = inverseSPD(reducedL),
    solved = mul(invLn, reducedB),
    response = zero(np, total);
  selected.forEach((index, i) => {
    response[index] = solved[i].map((x) => x / d[index]);
  });
  // High-n blocks use a symmetric positive energy Gram product instead of
  // multiplying an explicit inverse into B twice. Keep n<=4 unchanged.
  const whitened = energyGram
    ? mul(inverseLower(cholesky(reducedL)), reducedB)
    : undefined;
  const mass = whitened
    ? mul(transpose(whitened), whitened)
    : mul(transpose(reducedB), mul(invLn, reducedB));
  let added = mass.slice(0, size).map((r) => r.slice(0, size));
  if (ns) {
    const msf = mass.slice(0, size).map((r) => r.slice(size)),
      correction = mul(
        msf,
        mul(
          inverseSPD(mass.slice(size).map((r) => r.slice(size))),
          transpose(msf),
        ),
      );
    added = added.map((row, i) => row.map((v, j) => v - correction[i][j]));
  }
  const result = {
    mass,
    added,
    gravityUnit: grav,
    flux,
    sloshMass: ns ? mass[size][size] : 0,
    potentials: psi,
    response,
    potentialRank: selected.length,
    potentialTrials: np,
  };
  if (FLUID_CACHE.size >= 4096)
    FLUID_CACHE.delete(FLUID_CACHE.keys().next().value!);
  if (!options.wallNormal) FLUID_CACHE.set(key, result);
  return result;
}
/** Identical potential integration for solves, tracking and liquid animation. */
function shellFluidMatrices(
  basis: ShellBasis[],
  h: number,
  slosh: SloshMode | SloshMode[] | undefined,
  full: boolean,
) {
  const n = basis[0].n,
    count = Array.isArray(slosh) ? slosh.length : slosh ? 1 : 0,
    radial = count > 1 ? count + 4 : POTENTIAL_RADIAL_ORDER,
    axial = count > 1 ? 4 + 4 * count : POTENTIAL_AXIAL_ORDER;
  return fluidMatrices(
    basis,
    h,
    slosh,
    full,
    radial,
    axial,
    false,
    n <= 4 && radial === POTENTIAL_RADIAL_ORDER
      ? GR.length
      : Math.max(GR.length, n + 2 * radial + 1),
    n > 4 || count > 1,
  );
}
function nullFlux(flux: number[]): Matrix {
  // Orthonormal coordinates satisfying zero volume change in a full,
  // closed incompressible tank. The eliminated direction is not a mode.
  const norm = Math.hypot(...flux),
    u = flux.map((v) => v / norm),
    vectors: number[][] = [];
  for (let i = 0; i < flux.length && vectors.length < flux.length - 1; i++) {
    let v: number[] = flux.map((_, j) => (i === j ? 1 : 0)),
      dot = v.reduce((a, x, j) => a + x * u[j], 0);
    v = v.map((x, j) => x - dot * u[j]);
    for (const b of vectors) {
      dot = v.reduce((a, x, j) => a + x * b[j], 0);
      v = v.map((x, j) => x - dot * b[j]);
    }
    const l = Math.hypot(...v);
    if (l > 1e-8) vectors.push(v.map((x) => x / l));
  }
  return transpose(vectors);
}
function mac(a: number[], b: number[], m: Matrix): number {
  const ab = a.reduce(
    (s, x, i) => s + x * m[i].reduce((v, y, j) => v + y * b[j], 0),
    0,
  );
  return (ab * ab) / Math.max(1e-30, quadratic(m, a) * quadratic(m, b));
}
function cleanSettings(s: Settings): Settings {
  return {
    fluid: s.fluid === "lh2" ? "lh2" : "lox",
    fill: Math.max(
      0,
      Math.min(1, Number.isFinite(s.fill) ? s.fill : DEFAULT.fill),
    ),
    ullagePsi: Math.max(
      0,
      Number.isFinite(s.ullagePsi) ? s.ullagePsi : DEFAULT.ullagePsi,
    ),
    accelerationG: Math.max(
      0,
      Number.isFinite(s.accelerationG)
        ? s.accelerationG
        : DEFAULT.accelerationG,
    ),
    surfaceMaxOrder: Math.max(
      0,
      Math.min(20, Math.round(s.surfaceMaxOrder ?? DEFAULT.surfaceMaxOrder!)),
    ),
    surfaceRadialOrder: Math.max(
      1,
      Math.min(
        4,
        Math.round(s.surfaceRadialOrder ?? DEFAULT.surfaceRadialOrder!),
      ),
    ),
  };
}

type BlockSpectrum = {
  vectors: number[][];
  values: number[];
  residuals: number[];
  mass: Matrix;
  ns: number;
  nf: number;
  surfaceReferences?: number[][];
};

/** Matrix assembly and eigenvalues are independent of display-mode identity. */
function blockSpectrum(
  b: Block,
  id: CaseId,
  full: boolean,
  surfaceActive: boolean,
  density: number,
  a: number,
): BlockSpectrum {
  const withMass = id === "mass" || id === "combined" || id === "coupled",
    withPressure = id === "pressure" || id === "combined" || id === "coupled",
    ns = b.basis.length,
    nf = id === "coupled" && surfaceActive ? (b.slosh?.length ?? 0) : 0,
    size = ns + nf,
    k = zero(size),
    mass = zero(size);
  for (let i = 0; i < ns; i++)
    for (let j = 0; j < ns; j++) {
      k[i][j] = b.dryStiffness[i][j] + (withPressure ? b.geometric[i][j] : 0);
      mass[i][j] = b.dryMass[i][j];
    }
  if (withMass) {
    const fm = nf ? b.fluidMass : b.addedMass;
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++) mass[i][j] += density * fm[i][j];
  }
  if (nf)
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++) k[i][j] += density * a * b.gravity[i][j];
  let t = identity(size);
  if (full && withMass && b.n === 0) t = nullFlux(b.flux);
  const eigen = generalizedEigen(project(k, t), project(mass, t));
  return {
    vectors: eigen.vectors.map((v) =>
      t.map((row) => row.reduce((s, x, j) => s + x * v[j], 0)),
    ),
    values: eigen.values,
    residuals: eigen.residuals,
    mass,
    ns,
    nf,
    surfaceReferences: nf
      ? generalizedEigen(
          b.gravity.slice(ns).map((row) => row.slice(ns)),
          b.fluidMass.slice(ns).map((row) => row.slice(ns)),
        ).vectors
      : [],
  };
}

/** Optimal rectangular assignment. Bitmask DP bounds the six-mode search. */
function modeAssignment(score: Matrix): number[] {
  const candidates = score.length,
    references = score[0]?.length ?? 0,
    required = Math.min(candidates, references),
    memo = new Map<string, { score: number; pairs: [number, number][] }>();
  const visit = (
    ref: number,
    used: number,
    count: number,
  ): { score: number; pairs: [number, number][] } => {
    if (count === required) return { score: 0, pairs: [] };
    if (ref === references) return { score: -Infinity, pairs: [] };
    const key = `${ref}-${used}-${count}`,
      cached = memo.get(key);
    if (cached) return cached;
    let best = { score: -Infinity, pairs: [] as [number, number][] };
    for (let candidate = 0; candidate < candidates; candidate++) {
      if (used & (1 << candidate)) continue;
      const next = visit(ref + 1, used | (1 << candidate), count + 1),
        value = score[candidate][ref] + next.score;
      if (value > best.score + 1e-14)
        best = { score: value, pairs: [[candidate, ref], ...next.pairs] };
    }
    if (references - ref > required - count) {
      const skipped = visit(ref + 1, used, count);
      if (skipped.score > best.score + 1e-14) best = skipped;
    }
    memo.set(key, best);
    return best;
  };
  const assignment = Array(candidates).fill(-1);
  for (const [candidate, ref] of visit(0, 0, 0).pairs)
    assignment[candidate] = ref;
  return assignment;
}

function modalCase(
  blocks: Block[],
  id: CaseId,
  full: boolean,
  surfaceActive: boolean,
  density: number,
  a: number,
  dryReferences: Map<string, number[][]>,
  capacity: number,
): ModalCase {
  const withMass = id === "mass" || id === "combined" || id === "coupled",
    withPressure = id === "pressure" || id === "combined" || id === "coupled",
    withSlosh = id === "coupled" && surfaceActive;
  const modes: ModalMode[] = [];
  for (const b of blocks) {
    const eigen = blockSpectrum(b, id, full, surfaceActive, density, a),
      { ns, nf, vectors } = eigen;
    const key = `${b.n}-${b.orientation}`,
      refs = dryReferences.get(key)!;
    // Provisional unweighted dry overlap; findMode resolves fill continuation
    // lazily for this angular block before any UI displays its identity.
    const score = vectors.map((v) =>
      refs.map((r) => mac(v.slice(0, ns), r, b.dryMass)),
    );
    const assignment =
      nf === 1
        ? [-1, ...modeAssignment(score.slice(1))]
        : nf > 1
          ? modeAssignment(
              vectors.map((v) =>
                [
                  ...refs.map((r) => [...r, ...Array(nf).fill(0)]),
                  ...eigen.surfaceReferences!.map((r) => [
                    ...Array(ns).fill(0),
                    ...r,
                  ]),
                ].map((r) => mac(v, r, eigen.mass)),
              ),
            )
          : modeAssignment(score);
    for (let j = 0; j < vectors.length; j++) {
      const v = vectors[j],
        dryRef = assignment[j],
        sloshMode = nf && (dryRef < 0 || dryRef >= ns),
        surfaceRank = dryRef < 0 ? 0 : dryRef - ns,
        surfaceMode = sloshMode ? b.slosh![surfaceRank] : undefined;
      const phase = sloshMode
        ? v[ns + surfaceRank]
        : v
            .slice(0, ns)
            .reduce(
              (sum, x, i) =>
                sum +
                x *
                  b.dryMass[i].reduce(
                    (ss, y, k) => ss + y * refs[Math.max(0, dryRef)][k],
                    0,
                  ),
              0,
            );
      if (phase < 0) for (let i = 0; i < v.length; i++) v[i] = -v[i];
      const global = Array(NSHELL + capacity).fill(0);
      for (let i = 0; i < ns; i++) global[b.basis[i].index] = v[i];
      if (nf)
        b.slosh!.forEach((s, i) => {
          global[NSHELL + s.id - 1] = v[ns + i];
        });
      else if (withMass && surfaceActive && b.slosh?.length) {
        const mff = b.fluidMass.slice(ns).map((row) => row.slice(ns)),
          rhs = b.fluidMass
            .slice(ns)
            .map((row) =>
              row.slice(0, ns).reduce((sum, x, i) => sum + x * v[i], 0),
            ),
          eta = mul(
            inverseSPD(mff),
            rhs.map((x) => [-x]),
          ).map((row) => row[0]);
        b.slosh.forEach((s, i) => {
          global[NSHELL + s.id - 1] = eta[i];
        });
      }
      const structural = quadratic(b.dryMass, v.slice(0, ns));
      const fluid = withMass
        ? density * quadratic(nf ? b.fluidMass : b.addedMass, v)
        : 0;
      const total = structural + fluid;
      const jref = Math.max(0, dryRef),
        referenceId = sloshMode
          ? `slosh-${surfaceMode!.id}`
          : `shell-${b.n}-${jref + 1}-${b.orientation}`;
      const mode: ModalMode = {
        id: `${id}-${referenceId}`,
        referenceId,
        label: sloshMode
          ? surfaceMode!.label
          : `Shell n=${b.n} · axial ${jref + 1}${b.orientation === "sin" ? " · sine" : ""}`,
        kind: sloshMode ? "slosh" : "shell",
        frequency: Math.sqrt(Math.max(0, eigen.values[j])) / TAU,
        n: b.n,
        axialOrder: sloshMode ? 0 : jref + 1,
        orientation: b.orientation,
        vector: global,
        shellFraction: structural / total,
        sloshFraction: fluid / total,
        sloshParticipation: nf
          ? (density *
              quadratic(
                b.fluidMass.slice(ns).map((row) => row.slice(ns)),
                v.slice(ns),
              )) /
            Math.max(1e-30, total)
          : 0,
        sloshId: sloshMode ? surfaceMode!.id : undefined,
        match: sloshMode ? 1 : score[j][jref],
        trackingMAC: 1,
        trackingMinMAC: 1,
        trackingAmbiguous: false,
        residual: eigen.residuals[j],
        eigenvalue: eigen.values[j],
        unstable: eigen.values[j] < -1e-8,
        normalization: 1,
      };
      modes.push(mode);
    }
  }
  return {
    id,
    modes: modes.sort((a, b) => a.frequency - b.frequency),
    addedMass: withMass,
    pressure: withPressure,
    slosh: withSlosh,
    maxResidual: Math.max(...modes.map((m) => m.residual)),
  };
}
export function solve(input: Settings = DEFAULT): Solution {
  const settings = cleanSettings(input),
    h = heightForFill(settings.fill),
    density = FLUIDS[settings.fluid].density,
    fluidActive = settings.fill > 1e-8,
    full = settings.fill >= 1 - 1e-8,
    surfaceActive = fluidActive && !full,
    acc = settings.accelerationG * G0;
  const slosh: SloshMode[] = surfaceActive
    ? surfaceShapes(settings).map((s) => {
        const k = s.root / Math.max(1e-8, radiusAt(h));
        return {
          ...s,
          frequency: 0,
          cylinderFrequency: Math.sqrt(acc * k * Math.tanh(k * h)) / TAU,
        };
      })
    : [];
  const blocks: Block[] = [],
    refs = new Map<string, number[][]>();
  for (let n = 0; n <= SHELL_MAX_ORDER; n++)
    for (const orientation of (n > 0 && n < 4 ? ["cos", "sin"] : ["cos"]) as (
      "cos" | "sin"
    )[]) {
      const shell = shellMatrices(n, orientation),
        size = shell.basis.length,
        sm = slosh.filter((s) => s.n === n && s.orientation === orientation);
      const f = fluidActive
        ? shellFluidMatrices(shell.basis, h, sm, full)
        : {
            mass: zero(size),
            added: zero(size),
            gravityUnit: zero(size),
            flux: Array(size).fill(0),
            sloshMass: 0,
          };
      if (sm.length) {
        const rigid = generalizedEigen(
          f.gravityUnit.slice(size).map((row) => row.slice(size)),
          f.mass.slice(size).map((row) => row.slice(size)),
        );
        sm.forEach((s, i) => {
          s.frequency = Math.sqrt(Math.max(0, acc * rigid.values[i])) / TAU;
        });
      }
      const block: Block = {
        n,
        orientation,
        basis: shell.basis,
        dryMass: shell.mass,
        dryStiffness: shell.stiffness,
        geometric: pressureMatrix(shell.basis, settings, h, density),
        fluidMass: f.mass,
        addedMass: f.added,
        gravity: f.gravityUnit,
        slosh: sm,
        flux: f.flux,
      };
      blocks.push(block);
      refs.set(
        `${n}-${orientation}`,
        generalizedEigen(shell.stiffness, shell.mass).vectors,
      );
    }
  const cases = {} as Record<CaseId, ModalCase>;
  for (const id of CASE_IDS)
    cases[id] = modalCase(
      blocks,
      id,
      full,
      surfaceActive,
      density,
      acc,
      refs,
      Math.max(0, ...surfaceShapes(settings).map((s) => s.id)),
    );
  const ullagePa = settings.ullagePsi * PSI,
    headPa = density * acc * h;
  const result: Solution = {
    settings,
    liquidHeight: h,
    liquidVolume: TANK_VOLUME * settings.fill,
    liquidMass: TANK_VOLUME * settings.fill * density,
    shellMass: SHELL_AREA * TANK.thickness * TANK.density,
    tankVolume: TANK_VOLUME,
    shellArea: SHELL_AREA,
    surfaceRadius: radiusAt(h),
    density,
    ullagePa,
    headPa,
    bottomPa: ullagePa + headPa,
    slosh,
    cases,
    fluidActive,
    surfaceActive,
    retainedSlosh: slosh.length,
    notes: [
      "Reduced shell / potential-flow model; displayed frequencies are educational estimates, not correlated tank FE predictions.",
      "Domes enter shell energy, wetted geometry and fluid potential integration. Prestress KG uses the barrel membrane resultants; dome and attachment stresses require a static FE load case.",
      "Hydrostatic axial force is balanced by a distributed axial reaction. This specified static surrogate preserves free-free elastic modal coordinates; it is not a flight thrust attachment model.",
      `Surface basis: n=0–${settings.surfaceMaxOrder}, ${settings.surfaceRadialOrder} radial shapes per represented angular orientation; ${slosh.length} active coordinates. Higher n uses cosine representatives, matching the shell space.`,
      "Fluid kinetic energy includes shell/free-surface cross terms. The high-frequency mass comparison condenses the retained slosh coordinates; the coupled case uses their shared uncondensed mass.",
      "Pressure-maintained ullage: incremental gas-compression stiffness is omitted. A sealed ullage requires a gas spring, particularly for breathing modes.",
      "Shell trial functions taper at both poles and impose near-inextensional barrel hoop/shear kinematics. Free-free means no applied modal supports; this is a restricted elastic Ritz space with rigid-body modes excluded.",
      "Barrel KG retains initial-stress energy only. Dome prestress and the pressure follower-load tangent are omitted; this is not a complete pressurized free-free tangent operator.",
      "Five axial shell trials per angular family; first three matched branches are exposed. Refinement sensitivity is about 0.03% for the baseline lowest n2 dry mode, but about 12–14% for lowest n1/n3/n4. Frequencies remain model estimates.",
      "Inspection includes n=0 through n=12. Angular orders above the selected surface cutoff use a constrained surface. Use Surface convergence to assess truncation across fill.",
      "Uniform aluminum properties; thermal contraction, insulation, stiffeners, liquid compressibility, damping and nonlinear slosh are omitted.",
    ],
  };
  if (settings.fill > 0.95 && settings.fill < 1)
    result.notes.push(
      "The free surface lies in the shrinking upper dome: potential-basis truncation becomes more sensitive near full fill. Surface modes remain approximate; at 99% the baseline n3 slosh refinement changes about 1.6%.",
    );
  if (settings.fill < 0.05 && settings.fill > 0)
    result.notes.push(
      "A shallow bottom-dome pool differs from the cylinder benchmark. These reference surface shapes need not be the lowest modes of the actual domed liquid domain.",
    );
  return result;
}

type TrackedSpectrum = BlockSpectrum & {
  fill: number;
  /** Dry shell rank, with ns reserved for the one surface coordinate. */
  labels: number[];
  quality: number[];
  minimumQuality: number[];
  ambiguous: boolean[];
};
type FillTracker = {
  settings: Settings;
  id: CaseId;
  n: number;
  nodes: TrackedSpectrum[];
};
const FILL_TRACKERS = new Map<string, FillTracker>();
const TRACKED_BLOCKS = new WeakMap<Solution, Set<string>>();
const TRACK_STEP = 0.01;
const TRACK_ACCEPT_MAC = 0.995;
const TRACK_WARNING_MAC = 0.9;
const TRACK_MIN_STEP = 1e-5;
const TRACK_MAX_REFINEMENT = 12;

function trackingSpectrum(settings: Settings, id: CaseId, n: number) {
  const h = heightForFill(settings.fill),
    shell = shellMatrices(n, "cos"),
    fluidActive = settings.fill > 1e-8,
    full = settings.fill >= 1 - 1e-8,
    surfaceActive = fluidActive && !full,
    slosh = surfaceActive ? surfaceShapes(settings, n, "cos") : [],
    size = shell.basis.length,
    density = FLUIDS[settings.fluid].density,
    f =
      fluidActive && (id === "mass" || id === "combined" || id === "coupled")
        ? shellFluidMatrices(shell.basis, h, slosh, full)
        : {
            mass: zero(size),
            added: zero(size),
            gravityUnit: zero(size),
            flux: Array(size).fill(0),
            sloshMass: 0,
          },
    b: Block = {
      n,
      orientation: "cos",
      basis: shell.basis,
      dryMass: shell.mass,
      dryStiffness: shell.stiffness,
      geometric: pressureMatrix(shell.basis, settings, h, density),
      fluidMass: f.mass,
      addedMass: f.added,
      gravity: f.gravityUnit,
      slosh,
      flux: f.flux,
    };
  return blockSpectrum(
    b,
    id,
    full,
    surfaceActive,
    density,
    settings.accelerationG * G0,
  );
}

function nearlyDegenerate(values: number[], index: number) {
  return values.some(
    (value, other) =>
      other !== index &&
      Math.abs(value - values[index]) <=
        1e-8 * Math.max(1, Math.abs(value), Math.abs(values[index])),
  );
}

function signedOverlap(a: number[], b: number[], metric: Matrix) {
  return a.reduce(
    (sum, x, i) => sum + x * metric[i].reduce((v, y, j) => v + y * b[j], 0),
    0,
  );
}

function seedTracker(
  settings: Settings,
  id: CaseId,
  n: number,
): TrackedSpectrum {
  const spectrum = trackingSpectrum({ ...settings, fill: 0 }, id, n),
    shell = shellMatrices(n, "cos"),
    dry = generalizedEigen(shell.stiffness, shell.mass),
    score = spectrum.vectors.map((v) =>
      dry.vectors.map((ref) => mac(v, ref, shell.mass)),
    ),
    labels = modeAssignment(score),
    quality = labels.map((label, i) => Math.min(1, score[i][label]));
  spectrum.vectors.forEach((v, i) => {
    if (signedOverlap(v, dry.vectors[labels[i]], shell.mass) < 0)
      for (let j = 0; j < v.length; j++) v[j] = -v[j];
  });
  return {
    ...spectrum,
    fill: 0,
    labels,
    quality,
    minimumQuality: quality.slice(),
    ambiguous: labels.map(
      (label, i) =>
        quality[i] < TRACK_WARNING_MAC ||
        nearlyDegenerate(dry.values, label) ||
        nearlyDegenerate(spectrum.values, i),
    ),
  };
}

function matchFillStep(
  previous: TrackedSpectrum,
  spectrum: BlockSpectrum,
  fill: number,
  n: number,
): TrackedSpectrum {
  if (previous.nf === 0 && spectrum.nf > 1) {
    const refs = [
        ...previous.vectors.map((v) => [...v, ...Array(spectrum.nf).fill(0)]),
        ...spectrum.surfaceReferences!.map((v) => [
          ...Array(spectrum.ns).fill(0),
          ...v,
        ]),
      ],
      scores = spectrum.vectors.map((v) =>
        refs.map((r) => mac(v, r, spectrum.mass)),
      ),
      assignment = modeAssignment(scores),
      labels = assignment.map((ref) =>
        ref < previous.vectors.length
          ? previous.labels[ref]
          : spectrum.ns + ref - previous.vectors.length,
      ),
      quality = assignment.map((ref, i) =>
        ref < previous.vectors.length
          ? Math.min(
              1,
              mac(
                spectrum.vectors[i].slice(0, spectrum.ns),
                previous.vectors[ref],
                shellMatrices(n, "cos").mass,
              ),
            )
          : 1,
      );
    const vectors = spectrum.vectors.map((v, i) =>
      signedOverlap(v, refs[assignment[i]], spectrum.mass) < 0
        ? v.map((x) => -x)
        : v.slice(),
    );
    return {
      ...spectrum,
      vectors,
      fill,
      labels,
      quality,
      minimumQuality: quality.slice(),
      ambiguous: quality.map(
        (q, i) => q < TRACK_WARNING_MAC || nearlyDegenerate(spectrum.values, i),
      ),
    };
  }
  const shell = shellMatrices(n, "cos"),
    openingSurface = previous.nf === 0 && spectrum.nf > 0,
    closingSurface = previous.nf > 0 && spectrum.nf === 0,
    topologyChange =
      openingSurface ||
      closingSurface ||
      previous.vectors.length !== spectrum.vectors.length,
    size = topologyChange ? spectrum.ns : spectrum.ns + spectrum.nf,
    metric = topologyChange
      ? shell.mass
      : spectrum.mass.map((row, i) =>
          row.map((value, j) => (value + previous.mass[i][j]) / 2),
        ),
    references = previous.vectors
      .map((v, i) => ({ vector: v.slice(0, size), index: i }))
      .filter(
        ({ index }) => !closingSurface || previous.labels[index] < previous.ns,
      ),
    // At first positive fill the isolated fluid branch is born below all
    // positive elastic branches. Later steps track its fluid coordinate too.
    newSurface = openingSurface ? 0 : -1,
    candidates = spectrum.vectors
      .map((v, i) => ({ vector: v.slice(0, size), index: i }))
      .filter(({ index }) => index !== newSurface),
    score = candidates.map((candidate) =>
      references.map((ref) =>
        Math.min(1, mac(candidate.vector, ref.vector, metric)),
      ),
    ),
    assignment = modeAssignment(score),
    labels = Array(spectrum.vectors.length).fill(-1),
    quality = Array(spectrum.vectors.length).fill(1),
    minimumQuality = Array(spectrum.vectors.length).fill(1),
    ambiguous = Array(spectrum.vectors.length).fill(false);
  if (newSurface >= 0) {
    labels[newSurface] = spectrum.ns;
    ambiguous[newSurface] = nearlyDegenerate(spectrum.values, newSurface);
    if (spectrum.vectors[newSurface][spectrum.ns] < 0)
      spectrum.vectors[newSurface] = spectrum.vectors[newSurface].map(
        (v) => -v,
      );
  }
  candidates.forEach((candidate, i) => {
    const reference = references[assignment[i]],
      current = candidate.index,
      prior = reference.index;
    labels[current] = previous.labels[prior];
    quality[current] = score[i][assignment[i]];
    minimumQuality[current] = Math.min(
      previous.minimumQuality[prior],
      quality[current],
    );
    ambiguous[current] =
      previous.ambiguous[prior] ||
      minimumQuality[current] < TRACK_WARNING_MAC ||
      nearlyDegenerate(spectrum.values, current);
    if (signedOverlap(candidate.vector, reference.vector, metric) < 0)
      spectrum.vectors[current] = spectrum.vectors[current].map((v) => -v);
  });
  return { ...spectrum, fill, labels, quality, minimumQuality, ambiguous };
}

function advanceFill(
  tracker: FillTracker,
  previous: TrackedSpectrum,
  fill: number,
  depth = 0,
): TrackedSpectrum {
  const spectrum = trackingSpectrum(
      { ...tracker.settings, fill },
      tracker.id,
      tracker.n,
    ),
    next = matchFillStep(previous, spectrum, fill, tracker.n),
    refinableTopology =
      (previous.nf === spectrum.nf &&
        previous.vectors.length === spectrum.vectors.length) ||
      (previous.nf === 0 && spectrum.nf === 1);
  if (
    fill < 1 &&
    refinableTopology &&
    Math.min(...next.quality) < TRACK_ACCEPT_MAC &&
    fill - previous.fill > TRACK_MIN_STEP &&
    depth < TRACK_MAX_REFINEMENT
  ) {
    try {
      const middle = (previous.fill + fill) / 2,
        intermediate = advanceFill(tracker, previous, middle, depth + 1);
      return advanceFill(tracker, intermediate, fill, depth + 1);
    } catch {
      // Preserve the valid target eigensolve, but do not claim a verified path
      // through an intermediate fill that the finite potential space cannot solve.
      return { ...next, ambiguous: next.ambiguous.map(() => true) };
    }
  }
  return next;
}

function trackedAt(settings: Settings, id: CaseId, n: number): TrackedSpectrum {
  // With no retained surface coordinate, these operators are identical.
  // Share their continuation instead of solving the same high-n path twice.
  if (id === "coupled" && !surfaceShapes(settings, n, "cos").length)
    id = "combined";
  const pressure = id === "pressure" || id === "combined" || id === "coupled",
    key = `${id}-${n}-${settings.fluid}-${settings.surfaceMaxOrder}-${settings.surfaceRadialOrder}-${pressure ? `${settings.ullagePsi}-${settings.accelerationG}` : "mass"}`;
  let tracker = FILL_TRACKERS.get(key);
  if (!tracker) {
    tracker = {
      settings: { ...settings },
      id,
      n,
      nodes: [seedTracker(settings, id, n)],
    };
    if (FILL_TRACKERS.size >= 64)
      FILL_TRACKERS.delete(FILL_TRACKERS.keys().next().value!);
    FILL_TRACKERS.set(key, tracker);
  }
  const index = Math.min(100, Math.floor(settings.fill / TRACK_STEP + 1e-10));
  while (tracker.nodes.length <= index) {
    const fill = tracker.nodes.length * TRACK_STEP,
      previous = tracker.nodes[tracker.nodes.length - 1];
    tracker.nodes.push(advanceFill(tracker, previous, Math.min(1, fill)));
  }
  const previous = tracker.nodes[index];
  return Math.abs(settings.fill - previous.fill) < 1e-12
    ? previous
    : advanceFill(tracker, previous, settings.fill);
}

/** Warm the deterministic continuation one canonical fill step at a time. */
export function* prepareTrackedModes(
  solution: Solution,
  n: number,
  orientation: "cos" | "sin" = "cos",
) {
  const steps = Math.floor(solution.settings.fill / TRACK_STEP + 1e-10),
    total = CASE_IDS.length * (steps + 2);
  let completed = 0;
  for (const id of CASE_IDS) {
    if (id !== "dry")
      for (let i = 0; i <= steps; i++) {
        trackedAt({ ...solution.settings, fill: i * TRACK_STEP }, id, n);
        yield ++completed / total;
      }
    else completed += steps + 1;
    resolveTrackedBlock(solution, id, n, orientation);
    yield ++completed / total;
  }
}

/** Identity is resolved only for angular blocks inspected by the UI. */
function resolveTrackedBlock(
  solution: Solution,
  caseId: CaseId,
  n: number,
  orientation: "cos" | "sin",
) {
  let resolved = TRACKED_BLOCKS.get(solution);
  if (!resolved) {
    resolved = new Set();
    TRACKED_BLOCKS.set(solution, resolved);
  }
  const key = `${caseId}-${n}-${orientation}`;
  if (resolved.has(key)) return;
  const shell = shellMatrices(n, orientation),
    dry = generalizedEigen(shell.stiffness, shell.mass),
    tracked =
      caseId === "dry"
        ? seedTracker(solution.settings, caseId, n)
        : trackedAt(solution.settings, caseId, n),
    modes = solution.cases[caseId].modes
      .filter((mode) => mode.n === n && mode.orientation === orientation)
      .sort((a, b) => a.eigenvalue - b.eigenvalue),
    slosh = solution.slosh.filter(
      (s) => s.n === n && s.orientation === orientation,
    );
  modes.forEach((mode, i) => {
    const label = tracked.labels[i],
      isSlosh = label >= tracked.ns,
      surfaceMode = isSlosh ? slosh[label - tracked.ns] : undefined,
      local = shell.basis.map((b) => mode.vector[b.index]);
    if (tracked.nf)
      local.push(...slosh.map((s) => mode.vector[NSHELL + s.id - 1]));
    if (signedOverlap(local, tracked.vectors[i], tracked.mass) < 0)
      mode.vector = mode.vector.map((value) => -value);
    mode.kind = isSlosh ? "slosh" : "shell";
    mode.axialOrder = isSlosh ? 0 : label + 1;
    mode.sloshId = surfaceMode?.id;
    mode.referenceId = isSlosh
      ? `slosh-${surfaceMode!.id}`
      : `shell-${n}-${label + 1}-${orientation}`;
    mode.id = `${caseId}-${mode.referenceId}`;
    mode.label = isSlosh
      ? surfaceMode!.label
      : `Shell n=${n} · branch ${label + 1}${orientation === "sin" ? " · sine" : ""}`;
    mode.match = isSlosh
      ? 1
      : Math.min(
          1,
          mac(local.slice(0, tracked.ns), dry.vectors[label], shell.mass),
        );
    mode.trackingMAC = tracked.quality[i];
    mode.trackingMinMAC = tracked.minimumQuality[i];
    mode.trackingAmbiguous = tracked.ambiguous[i];
    NORMALIZED_MODES.delete(mode);
    SURFACE_MEAN.delete(mode);
    FLUID_MODE_RESPONSE.delete(mode);
    mode.normalization = 1;
  });
  resolved.add(key);
}

function rawShell(mode: ModalMode, z: number, theta: number) {
  let radial = 0,
    axial = 0,
    tangential = 0;
  for (const b of shellMatrices(mode.n, mode.orientation).basis) {
    const coeff = mode.vector[b.index];
    if (!coeff) continue;
    const u = basisShape(b, z),
      c =
        b.orientation === "cos" ? Math.cos(b.n * theta) : Math.sin(b.n * theta),
      s =
        b.orientation === "cos"
          ? Math.sin(b.n * theta)
          : -Math.cos(b.n * theta);
    radial += coeff * u.ur * c;
    axial += coeff * u.zz * c;
    tangential += coeff * u.vt * s;
  }
  return { radial, axial, tangential };
}
const SURFACE_MEAN = new WeakMap<ModalMode, number>();
function rawSurface(
  solution: Solution,
  mode: ModalMode,
  r: number,
  theta: number,
) {
  if (!solution.surfaceActive) return 0;
  let displacement = 0;
  for (const s of solution.slosh) {
    const c = mode.vector[NSHELL + s.id - 1];
    if (c)
      displacement +=
        c *
        sloshShape(s, r, solution.surfaceRadius) *
        (s.orientation === "cos"
          ? Math.cos(s.n * theta)
          : Math.sin(s.n * theta));
  }
  if (mode.n === 0) {
    let mean = SURFACE_MEAN.get(mode);
    if (mean === undefined) {
      let flux = 0;
      for (const q of integrateSegments(solution.liquidHeight)) {
        const d = radiusDerivatives(q.z),
          u = rawShell(mode, q.z, 0);
        flux += (u.radial - d.r1 * u.axial) * d.r * q.w * TAU;
      }
      mean =
        -flux / (Math.PI * solution.surfaceRadius * solution.surfaceRadius);
      SURFACE_MEAN.set(mode, mean);
    }
    displacement += mean;
  }
  return displacement;
}
const PEAK_SHAPES = new Map<string, ReturnType<typeof basisShape>[][]>();
function modalPeak(solution: Solution, mode: ModalMode) {
  const basis = shellMatrices(mode.n, mode.orientation).basis,
    key = `${mode.n}-${mode.orientation}`;
  let samples = PEAK_SHAPES.get(key);
  if (!samples) {
    samples = Array.from({ length: 41 }, (_, i) =>
      basis.map((b) => basisShape(b, (TANK.height * i) / 40)),
    );
    PEAK_SHAPES.set(key, samples);
  }
  let peak = 1e-30;
  for (const sample of samples) {
    let radial = 0,
      axial = 0,
      tangential = 0;
    for (let j = 0; j < basis.length; j++) {
      const q = mode.vector[basis[j].index],
        u = sample[j];
      radial += q * u.ur;
      axial += q * u.zz;
      tangential += q * u.vt;
    }
    peak = Math.max(peak, Math.hypot(radial, axial), Math.abs(tangential));
  }
  if (
    solution.surfaceActive &&
    (mode.id.startsWith("coupled-") ||
      mode.id.startsWith("combined-") ||
      mode.id.startsWith("mass-"))
  ) {
    const theta = mode.orientation === "cos" ? 0 : Math.PI / (2 * mode.n);
    for (let i = 0; i <= 12; i++)
      peak = Math.max(
        peak,
        Math.abs(
          rawSurface(solution, mode, (solution.surfaceRadius * i) / 12, theta),
        ),
      );
  }
  return peak;
}
const NORMALIZED_MODES = new WeakSet<ModalMode>();
function ensureNormalized(solution: Solution, mode: ModalMode) {
  if (!NORMALIZED_MODES.has(mode)) {
    mode.normalization = modalPeak(solution, mode);
    NORMALIZED_MODES.add(mode);
  }
}
/** One common modal scale for shell and surface preserves their amplitude ratio. */
export function shellDisplacement(
  solution: Solution,
  mode: ModalMode,
  z: number,
  theta: number,
) {
  ensureNormalized(solution, mode);
  const u = rawShell(mode, z, theta),
    s = mode.normalization;
  return {
    radial: u.radial / s,
    axial: u.axial / s,
    tangential: u.tangential / s,
  };
}
export function freeSurfaceDisplacement(
  solution: Solution,
  mode: ModalMode,
  r: number,
  theta: number,
) {
  if (mode.id.startsWith("dry-") || mode.id.startsWith("pressure-")) return 0;
  ensureNormalized(solution, mode);
  return rawSurface(solution, mode, r, theta) / mode.normalization;
}
export function findMode(
  solution: Solution,
  caseId: CaseId,
  selection: Selection,
): ModalMode | undefined {
  const modes = solution.cases[caseId].modes;
  if (selection.kind === "slosh") {
    if (!solution.surfaceActive) return undefined;
    const template = solution.slosh.find(
      (s) => s.id === (selection.sloshId ?? 1),
    );
    if (!template) return undefined;
    resolveTrackedBlock(solution, caseId, template.n, template.orientation);
    return modes.find(
      (m) => m.kind === "slosh" && m.sloshId === (selection.sloshId ?? 1),
    );
  }
  const n = selection.n ?? 2,
    orientation = selection.orientation ?? "cos";
  if (!modes.some((m) => m.n === n && m.orientation === orientation))
    return undefined;
  resolveTrackedBlock(solution, caseId, n, orientation);
  return modes.find(
    (m) =>
      m.kind === "shell" &&
      m.n === (selection.n ?? 2) &&
      m.axialOrder === (selection.axialOrder ?? 1) &&
      m.orientation === (selection.orientation ?? "cos"),
  );
}
/** Resolve identities for callers enumerating a whole case instead of using findMode. */
export function resolveCaseModes(
  solution: Solution,
  caseId: CaseId,
): ModalMode[] {
  const blocks = new Set(
    solution.cases[caseId].modes.map((mode) => `${mode.n}-${mode.orientation}`),
  );
  for (const key of blocks) {
    const [n, orientation] = key.split("-");
    resolveTrackedBlock(
      solution,
      caseId,
      Number(n),
      orientation as "cos" | "sin",
    );
  }
  return solution.cases[caseId].modes;
}
/** MAC across solutions uses the common dry structural mass metric. */
export function structuralMAC(a: ModalMode, b: ModalMode): number {
  if (a.n !== b.n || a.orientation !== b.orientation) return 0;
  const s = shellMatrices(a.n, a.orientation),
    av = s.basis.map((x) => a.vector[x.index]),
    bv = s.basis.map((x) => b.vector[x.index]);
  return mac(av, bv, s.mass);
}
/** Diagnostic rigid-cylinder frequency, excluding the constant volume mode. */
export function cylinderSloshFrequency(
  n: number,
  depth: number,
  accelerationG: number,
  radius = TANK.radius,
  radialOrder = 1,
): number {
  const root = SLOSH_ROOTS[n][radialOrder - 1],
    k = root / radius;
  return (
    Math.sqrt(
      Math.max(0, accelerationG) * G0 * k * Math.tanh(k * Math.max(0, depth)),
    ) / TAU
  );
}

/** Numerical potential-flow calculation in a flat-bottom rigid cylinder. */
export function cylinderGalerkinFrequency(
  n: number,
  depth: number,
  accelerationG: number,
  radial = POTENTIAL_RADIAL_ORDER,
  axial = POTENTIAL_AXIAL_ORDER,
): number {
  const template = SLOSH_TEMPLATE.find((s) => s.n === n)!;
  const sm = { ...template, frequency: 0, cylinderFrequency: 0 };
  const f = fluidMatrices(
      shellMatrices(n, "cos").basis,
      depth,
      sm,
      false,
      radial,
      axial,
      true,
    ),
    i = STRUCTURAL_ORDER;
  return (
    Math.sqrt(
      (Math.max(0, accelerationG) * G0 * f.gravityUnit[i][i]) / f.sloshMass,
    ) / TAU
  );
}
export function convergenceDiagnostics(settings: Settings = DEFAULT) {
  const s = cleanSettings(settings),
    h = heightForFill(s.fill),
    rho = FLUIDS[s.fluid].density;
  const partial = s.fill > 1e-8 && s.fill < 1 - 1e-8;
  const rows = [];
  for (let n = 0; n <= 4; n++) {
    const shell = shellMatrices(n, "cos"),
      refinedShell = shellMatrices(n, "cos", 7);
    const template = surfaceShapes(s, n, "cos")[0],
      sm =
        partial && template
          ? { ...template, frequency: 0, cylinderFrequency: 0 }
          : undefined;
    const base = fluidMatrices(shell.basis, h, sm, !partial),
      refined = fluidMatrices(shell.basis, h, sm, !partial, 5, 10);
    const kg = pressureMatrix(shell.basis, s, h, rho);
    const k = shell.stiffness.map((row, i) => row.map((v, j) => v + kg[i][j]));
    const f = (added: Matrix) =>
      Math.sqrt(
        Math.max(
          0,
          generalizedEigen(
            k,
            shell.mass.map((row, i) =>
              row.map((v, j) => v + rho * added[i][j]),
            ),
          ).values[0],
        ),
      ) / TAU;
    const coarseFrequency = f(base.added),
      refinedFrequency = f(refined.added);
    const dry =
        Math.sqrt(generalizedEigen(shell.stiffness, shell.mass).values[0]) /
        TAU,
      dryRefined =
        Math.sqrt(
          generalizedEigen(refinedShell.stiffness, refinedShell.mass).values[0],
        ) / TAU;
    const sloshBase = sm
        ? Math.sqrt(
            (s.accelerationG *
              G0 *
              base.gravityUnit[STRUCTURAL_ORDER][STRUCTURAL_ORDER]) /
              base.sloshMass,
          ) / TAU
        : 0,
      sloshRefined = sm
        ? Math.sqrt(
            (s.accelerationG *
              G0 *
              refined.gravityUnit[STRUCTURAL_ORDER][STRUCTURAL_ORDER]) /
              refined.sloshMass,
          ) / TAU
        : 0;
    rows.push({
      n,
      coarseFrequency,
      refinedFrequency,
      fluidRelativeDifference:
        Math.abs(coarseFrequency - refinedFrequency) / refinedFrequency,
      dry,
      dryRefined,
      shellRelativeDifference: Math.abs(dry - dryRefined) / dryRefined,
      sloshBase,
      sloshRefined,
      sloshRelativeDifference: sm
        ? Math.abs(sloshBase - sloshRefined) / sloshRefined
        : 0,
    });
  }
  return rows;
}
/** Structural Ritz refinement diagnostic; rigid body modes are outside this space. */
export function dryRitzFrequencies(
  n: number,
  orders = STRUCTURAL_ORDER,
): number[] {
  const s = shellMatrices(n, "cos", orders);
  return generalizedEigen(s.stiffness, s.mass).values.map(
    (v) => Math.sqrt(Math.max(0, v)) / TAU,
  );
}

export type SurfaceBoundaryRow = {
  boundary: SurfaceBoundary;
  frequencies: number[];
  addedMassRatios: number[];
  maxResidual: number;
  /** Density-scaled matrix in the common five-coordinate shell space. */
  addedMass: Matrix;
  constrainedVolume: boolean;
  available: boolean;
  error?: string;
};
export function surfacePotentialOrders(
  settings: Settings,
  n: number,
): [number, number] {
  const count =
    settings.fill > 1e-8 && settings.fill < 1 - 1e-8
      ? surfaceShapes(settings, n, "cos").length
      : 0;
  return count > 1
    ? [count + 4, 4 + 4 * count]
    : [POTENTIAL_RADIAL_ORDER, POTENTIAL_AXIAL_ORDER];
}
const SURFACE_BOUNDARY_CACHE = new Map<string, SurfaceBoundaryRow[]>();

/**
 * Re-solves each boundary model in the same shell space and with the same K.
 * Eigenvalues are sorted independently, not assigned a common tracked identity.
 * The scene's retained-surface model and continuation remain separate.
 */
export function surfaceBoundaryComparison(
  input: Settings = DEFAULT,
  n = 2,
  withPrestress = true,
  radial = surfacePotentialOrders(input, n)[0],
  axial = surfacePotentialOrders(input, n)[1],
): SurfaceBoundaryRow[] {
  if (!Number.isInteger(n) || n < 0 || n > 20)
    throw new Error(
      "Surface comparison requires an integer angular order from 0 to 20",
    );
  const settings = cleanSettings(input),
    key = `${settings.fluid}-${settings.fill}-${settings.ullagePsi}-${settings.accelerationG}-${settings.surfaceMaxOrder}-${settings.surfaceRadialOrder}-${n}-${withPrestress}-${radial}-${axial}`,
    cached = SURFACE_BOUNDARY_CACHE.get(key);
  if (cached) return cached;
  const shell = shellMatrices(n, "cos"),
    size = shell.basis.length,
    h = heightForFill(settings.fill),
    density = FLUIDS[settings.fluid].density,
    active = settings.fill > 1e-8,
    full = settings.fill >= 1 - 1e-8,
    slosh = active && !full ? surfaceShapes(settings, n, "cos") : [],
    kg = withPrestress
      ? pressureMatrix(shell.basis, settings, h, density)
      : zero(size),
    stiffness = shell.stiffness.map((row, i) =>
      row.map((v, j) => v + kg[i][j]),
    );
  const rows = (["retained", "rigid", "pressure-release"] as const).map(
    (boundary): SurfaceBoundaryRow => {
      const constrainedVolume =
        active && n === 0 && (full || boundary === "rigid");
      try {
        const f = active
            ? fluidMatrices(
                shell.basis,
                h,
                slosh,
                full,
                radial,
                axial,
                false,
                Math.max(GR.length, n + 2 * radial + 1),
                true,
                { boundary },
              )
            : { added: zero(size), flux: Array(size).fill(0) },
          addedMass = f.added.map((row) => row.map((v) => density * v)),
          mass = shell.mass.map((row, i) =>
            row.map((v, j) => v + addedMass[i][j]),
          ),
          t = constrainedVolume ? nullFlux(f.flux) : identity(size),
          eigen = generalizedEigen(project(stiffness, t), project(mass, t)),
          vectors = eigen.vectors.map((v) =>
            t.map((row) => row.reduce((sum, x, i) => sum + x * v[i], 0)),
          );
        return {
          boundary,
          frequencies: eigen.values.map((v) => {
            if (v < -1e-8)
              throw new Error("Unstable stiffness in surface comparison");
            return Math.sqrt(Math.max(0, v)) / TAU;
          }),
          addedMassRatios: vectors.map(
            (v) => quadratic(addedMass, v) / quadratic(shell.mass, v),
          ),
          maxResidual: Math.max(...eigen.residuals),
          addedMass,
          constrainedVolume,
          available: true,
        };
      } catch (error) {
        return {
          boundary,
          frequencies: [],
          addedMassRatios: [],
          maxResidual: Infinity,
          addedMass: [],
          constrainedVolume,
          available: false,
          error: error instanceof Error ? error.message : "Fluid solve failed",
        };
      }
    },
  );
  if (SURFACE_BOUNDARY_CACHE.size >= 128) SURFACE_BOUNDARY_CACHE.clear();
  SURFACE_BOUNDARY_CACHE.set(key, rows);
  return rows;
}

// Independent special-function solution, not the Galerkin trial/quadrature code.
// Only modest x is needed by the two fixed cylinder depths in the benchmark.
function modifiedBesselI(n: number, x: number): number {
  let term = 1;
  for (let j = 1; j <= n; j++) term *= x / (2 * j);
  let sum = term;
  for (let j = 1; j < 200; j++) {
    term *= (x * x) / (4 * j * (n + j));
    sum += term;
    if (Math.abs(term) <= Math.abs(sum) * 1e-16) break;
  }
  return sum;
}

/**
 * Exact flat-cylinder kinetic-energy benchmarks for u_r(R,z,theta)=qdot*w(z)*cos(n theta).
 * Rigid lid: w=1, psi=(R/n)(r/R)^n cos(n theta), MA=rho*pi*R^2*h/n.
 * Pressure release: w=cos(kz), k=pi/(2h), psi=I_n(kr)cos(kz)cos(n theta)/(k I'_n(kR)).
 * Both have a rigid bottom. Different wall patterns are tested, not compared as equal forcing.
 * The numerical column calls the SAME fluid assembly as the tank diagnostic.
 */
export function cylinderAddedMassBenchmark(
  n = 1,
  depth = 12,
  density: number = FLUIDS.lox.density,
  radial = POTENTIAL_RADIAL_ORDER,
  axial = POTENTIAL_AXIAL_ORDER,
) {
  if (
    !Number.isInteger(n) ||
    n < 1 ||
    n > 20 ||
    ![2, 12].includes(depth) ||
    density <= 0
  )
    throw new Error(
      "Benchmark requires n=1–20, depth 2 or 12 m, and positive density",
    );
  const R = TANK.radius,
    k = Math.PI / (2 * depth),
    x = k * R,
    derivative = (modifiedBesselI(n - 1, x) + modifiedBesselI(n + 1, x)) / 2,
    basis: ShellBasis[] = [{ n, orientation: "cos", axialOrder: 1, index: 0 }];
  return (["rigid", "pressure-release"] as const).map((boundary) => {
    const analytic =
        boundary === "rigid"
          ? (density * Math.PI * R * R * depth) / n
          : (density * Math.PI * R * depth * modifiedBesselI(n, x)) /
            (2 * k * derivative),
      f = fluidMatrices(
        basis,
        depth,
        undefined,
        false,
        radial,
        axial,
        true,
        Math.max(GR.length, n + 2 * radial + 1),
        true,
        {
          boundary,
          wallNormal: (z) => [boundary === "rigid" ? 1 : Math.cos(k * z)],
        },
      ),
      numerical = density * f.added[0][0];
    return {
      boundary,
      n,
      depth,
      density,
      analytic,
      numerical,
      relativeError: Math.abs(numerical - analytic) / analytic,
    };
  });
}

/** The common potential space isolates surface truncation from fluid refinement. */
export function surfaceSpectrum(
  input: Settings,
  n: number,
  radialCount: number,
  potentialRadial = 8,
  potentialAxial = 20,
  cylinderDepth?: number,
) {
  const settings = cleanSettings({ ...input, surfaceRadialOrder: radialCount }),
    shell = shellMatrices(n, "cos"),
    ns = shell.basis.length,
    h = cylinderDepth ?? heightForFill(settings.fill),
    active = cylinderDepth !== undefined || settings.fill > 1e-8,
    full = cylinderDepth === undefined && settings.fill >= 1 - 1e-8,
    shapes = active && !full ? surfaceShapes(settings, n, "cos") : [],
    density = FLUIDS[settings.fluid].density,
    fullShapes =
      active && !full
        ? surfaceShapes({ ...settings, surfaceRadialOrder: 4 }, n, "cos")
        : [],
    fullFluid = active
      ? fluidMatrices(
          shell.basis,
          h,
          fullShapes,
          full,
          potentialRadial,
          potentialAxial,
          cylinderDepth !== undefined,
          Math.max(GR.length, n + 2 * potentialRadial + 1),
          true,
        )
      : {
          mass: zero(ns),
          added: zero(ns),
          gravityUnit: zero(ns),
          flux: Array(ns).fill(0),
        },
    indices = Array.from({ length: ns + shapes.length }, (_, i) => i),
    f = {
      ...fullFluid,
      mass: indices.map((i) => indices.map((j) => fullFluid.mass[i][j])),
      gravityUnit: indices.map((i) =>
        indices.map((j) => fullFluid.gravityUnit[i][j]),
      ),
    },
    block: Block = {
      n,
      orientation: "cos",
      basis: shell.basis,
      dryMass: shell.mass,
      dryStiffness: shell.stiffness,
      geometric:
        cylinderDepth === undefined
          ? pressureMatrix(shell.basis, settings, h, density)
          : zero(ns),
      fluidMass: f.mass,
      addedMass: f.added,
      gravity: f.gravityUnit,
      flux: f.flux,
      slosh: shapes,
    },
    spectrum = blockSpectrum(
      block,
      "coupled",
      full,
      active && !full,
      density,
      settings.accelerationG * G0,
    );
  return {
    ...spectrum,
    n,
    shellMass: shell.mass,
    shapes,
    density,
    fluidMass: f.mass,
    potentialRank:
      "potentialRank" in fullFluid ? (fullFluid.potentialRank as number) : 0,
    potentialTrials:
      "potentialTrials" in fullFluid
        ? (fullFluid.potentialTrials as number)
        : 0,
    frequencies: spectrum.values.map((v) => Math.sqrt(Math.max(0, v)) / TAU),
  };
}
export function cylinderSloshSpectrum(
  n: number,
  depth: number,
  accelerationG: number,
  radialCount = 4,
  potentialRadial = 8,
  potentialAxial = 20,
) {
  const s = surfaceSpectrum(
      { ...DEFAULT, surfaceMaxOrder: 20, accelerationG },
      n,
      radialCount,
      potentialRadial,
      potentialAxial,
      depth,
    ),
    ns = s.ns;
  const e = generalizedEigen(
    spectrumGravity(n, radialCount, depth, potentialRadial, potentialAxial),
    s.fluidMass.slice(ns).map((r) => r.slice(ns)),
  );
  return e.values.map(
    (v) => Math.sqrt(Math.max(0, accelerationG * G0 * v)) / TAU,
  );
}
function spectrumGravity(
  n: number,
  radialCount: number,
  depth: number,
  radial: number,
  axial: number,
) {
  const shell = shellMatrices(n, "cos"),
    shapes = surfaceShapes(
      { ...DEFAULT, surfaceMaxOrder: 20, surfaceRadialOrder: radialCount },
      n,
      "cos",
    ),
    ns = shell.basis.length;
  return fluidMatrices(
    shell.basis,
    depth,
    shapes,
    false,
    radial,
    axial,
    true,
    Math.max(GR.length, n + 2 * radial + 1),
    true,
  )
    .gravityUnit.slice(ns)
    .map((r) => r.slice(ns));
}
export type SurfaceMatch = {
  radial: number;
  frequencyError: number;
  energyError: number;
  minimumMAC: number;
  missing: number;
  reliable: boolean;
};
export type SurfaceConvergenceRow = {
  fill: number;
  n: number;
  noSurface: boolean;
  matches: SurfaceMatch[];
  recommended: number | null;
  potentialError: number | null;
  referenceResidual: number;
  potentialRank?: number;
  potentialTrials?: number;
  error?: string;
};
export type SurfaceConvergenceOptions = {
  maxOrder?: number;
  branches?: number;
  maxHz?: number;
  tolerance?: number;
  energyTolerance?: number;
  fills?: number[];
};
export const SURFACE_FILL_GRID = [
  0, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95,
  0.975, 0.99, 1,
];
const SURFACE_CONVERGENCE_CACHE = new Map<string, SurfaceConvergenceRow>();
function surfaceTargets(
  reference: ReturnType<typeof surfaceSpectrum>,
  branches: number,
  maxHz: number,
  gravity: boolean,
) {
  const dry = generalizedEigen(
      shellMatrices(reference.n, "cos").stiffness,
      reference.shellMass,
    ),
    refs = reference.nf
      ? [
          ...dry.vectors.map((r) => [...r, ...Array(reference.nf).fill(0)]),
          ...reference.surfaceReferences!.map((r) => [
            ...Array(reference.ns).fill(0),
            ...r,
          ]),
        ]
      : dry.vectors,
    assignment = modeAssignment(
      reference.vectors.map((v) => refs.map((r) => mac(v, r, reference.mass))),
    );
  const targets = assignment
    .map((rank, i) => ({ rank, i }))
    .filter(
      ({ rank, i }) =>
        rank >= 0 && rank < branches && reference.frequencies[i] <= maxHz,
    )
    .map(({ i }) => i);
  const shellCount = targets.length;
  if (gravity && reference.nf) {
    const first = assignment.findIndex((rank) => rank >= reference.ns);
    if (first >= 0 && reference.frequencies[first] <= maxHz)
      targets.push(first);
  }
  return { indices: targets, shellCount };
}
function surfaceMatch(
  reference: ReturnType<typeof surfaceSpectrum>,
  coarse: ReturnType<typeof surfaceSpectrum>,
  target: { indices: number[]; shellCount: number },
  radial: number,
): SurfaceMatch {
  const targets = target.indices;
  const padded = coarse.vectors.map((v) => [
      ...v,
      ...Array(reference.mass.length - v.length).fill(0),
    ]),
    scores = padded.map((v) =>
      targets.map((i) =>
        Math.min(1, mac(v, reference.vectors[i], reference.mass)),
      ),
    ),
    assignment = modeAssignment(scores),
    pairs = assignment.map((j, i) => ({ i, j })).filter(({ j }) => j >= 0);
  let frequencyError = 0,
    energyError = 0,
    minimumMAC = 1;
  const ratio = (s: ReturnType<typeof surfaceSpectrum>, v: number[]) =>
    quadratic(s.mass, v) / quadratic(s.shellMass, v.slice(0, s.ns)) - 1;
  for (const { i, j } of pairs) {
    const index = targets[j],
      f = reference.frequencies[index];
    frequencyError = Math.max(
      frequencyError,
      Math.abs(coarse.frequencies[i] - f) / Math.max(1e-8, f),
    );
    minimumMAC = Math.min(minimumMAC, scores[i][j]);
    // Fluid/shell kinetic ratio is assessed only for shell-dominated target identities.
    if (j < target.shellCount) {
      const mu = ratio(reference, reference.vectors[index]),
        cmu = ratio(coarse, coarse.vectors[i]);
      energyError = Math.max(
        energyError,
        Math.abs(cmu - mu) / Math.max(1, Math.abs(mu)),
      );
    }
  }
  return {
    radial,
    frequencyError,
    energyError,
    minimumMAC,
    missing: targets.length - pairs.length,
    reliable:
      targets.length > 0 &&
      minimumMAC >= 0.9 &&
      Math.max(...coarse.residuals, ...reference.residuals) < 1e-5 &&
      targets.every((i) => !nearlyDegenerate(reference.values, i)),
  };
}
/** Each yield is one angular/fill sample; consumers can cancel and keep the UI responsive. */
export function* surfaceConvergenceSteps(
  input: Settings = DEFAULT,
  options: SurfaceConvergenceOptions = {},
) {
  const settings = cleanSettings(input),
    maxOrder = Math.max(0, Math.min(12, options.maxOrder ?? 12)),
    branches = options.branches ?? 3,
    maxHz = options.maxHz ?? 100,
    tolerance = options.tolerance ?? 0.01,
    energyTolerance = options.energyTolerance ?? 0.05,
    fills = [...new Set(options.fills ?? SURFACE_FILL_GRID)].sort(
      (a, b) => a - b,
    );
  for (const fill of fills)
    for (let n = 0; n <= maxOrder; n++) {
      const key = JSON.stringify([
        settings.fluid,
        settings.ullagePsi,
        settings.accelerationG,
        fill,
        n,
        branches,
        maxHz,
        tolerance,
        energyTolerance,
      ]);
      let row = SURFACE_CONVERGENCE_CACHE.get(key);
      if (!row) {
        try {
          const operating = { ...settings, fill, surfaceMaxOrder: 20 },
            reference = surfaceSpectrum(operating, n, 4),
            targets = surfaceTargets(
              reference,
              branches,
              maxHz,
              settings.accelerationG > 0,
            ),
            noSurface = fill <= 1e-8 || fill >= 1 - 1e-8,
            matches = [1, 2, 3, 4].map((p) =>
              surfaceMatch(
                reference,
                surfaceSpectrum(operating, n, p),
                targets,
                p,
              ),
            ),
            refined = surfaceSpectrum(operating, n, 4, 9, 22),
            check = surfaceMatch(reference, refined, targets, 4),
            potentialError =
              check.reliable && !check.missing ? check.frequencyError : null,
            recommended = noSurface
              ? 0
              : (matches.find(
                  (m) =>
                    m.radial < 4 &&
                    m.reliable &&
                    !m.missing &&
                    m.frequencyError <= tolerance &&
                    m.energyError <= energyTolerance &&
                    potentialError !== null &&
                    potentialError <= tolerance,
                )?.radial ?? null);
          row = {
            fill,
            n,
            noSurface,
            matches,
            recommended,
            potentialError,
            referenceResidual: Math.max(...reference.residuals),
            potentialRank: reference.potentialRank,
            potentialTrials: reference.potentialTrials,
          };
        } catch (error) {
          row = {
            fill,
            n,
            noSurface: fill === 0 || fill === 1,
            matches: [],
            recommended: null,
            potentialError: null,
            referenceResidual: Infinity,
            error:
              error instanceof Error ? error.message : "Surface solve failed",
          };
        }
        if (SURFACE_CONVERGENCE_CACHE.size > 1024)
          SURFACE_CONVERGENCE_CACHE.clear();
        SURFACE_CONVERGENCE_CACHE.set(key, row);
      }
      yield row;
    }
}

export const FOURIER_CUTOFFS = [8, 12, 16, 20] as const;
export const FOURIER_MAX_ORDER = 20;
export type FourierCutoff = (typeof FOURIER_CUTOFFS)[number];
export type FourierCaseId = "mass" | "pressure" | "combined";
export type FourierSurfaceModel =
  | "empty"
  | "condensed-retained-shape"
  | "rigid-surface"
  | "closed-liquid"
  | "not-applied";
export type FourierMode = {
  /** Dry shape identity; a sweep uses adjacent-fill matching from its empty seed. */
  branch: number;
  frequency: number;
  dryFrequency: number;
  /** Dry-stiffness Rayleigh frequency evaluated on THIS wet vector. */
  structuralRayleighFrequency: number;
  /** Actual wet-vector quadratic ratio phi^T MA phi / phi^T Ms phi. */
  addedMassRatio: number;
  residual: number;
  dryMAC: number;
  stepMAC: number | null;
  trackingAmbiguous: boolean;
  unstable: boolean;
};
export type FourierFamily = {
  n: number;
  wavelength: number | null;
  retained: boolean;
  freeSurfaceModel: FourierSurfaceModel;
  dryFrequencies: number[];
  modes: FourierMode[];
  /** Counts cosine representatives, with degenerate sine partners omitted. */
  inBandCount: number;
  maxResidual: number;
  available: boolean;
  error?: string;
};
export type FourierCoverage = {
  settings: Settings;
  cutoff: FourierCutoff;
  maxOrder: number;
  band: [number, number];
  caseId: FourierCaseId;
  families: FourierFamily[];
  retainedInBandModes: number;
  omittedInBandModes: number;
  omittedFamilies: number[];
  maxResidual: number;
};
export type FourierSweepPoint = {
  fill: number;
  liquidHeight: number;
  modes: FourierMode[];
  available: boolean;
  freeSurfaceModel: FourierSurfaceModel;
  error?: string;
};
export type FourierSweep = {
  settings: Settings;
  n: number;
  caseId: FourierCaseId;
  points: FourierSweepPoint[];
  minTrackingMAC: number;
  trackingAmbiguous: boolean;
};
type FourierSpectrum = {
  shellMass: Matrix;
  shellStiffness: Matrix;
  addedMass: Matrix;
  dry: ReturnType<typeof generalizedEigen>;
  wet: BlockSpectrum;
  freeSurfaceModel: FourierSurfaceModel;
};
const FOURIER_SPECTRA = new Map<string, FourierSpectrum>();

/**
 * Separate angular coverage calculation, extending beyond the scene's n<=12.
 * Each n has the same five restricted meridional shell trials. Independent
 * axisymmetric Fourier blocks cannot alter lower-n eigenvalues when extended.
 * This is an angular coverage screen, not a complete 10–2000 Hz FE spectrum.
 */
function fourierSpectrum(
  settings: Settings,
  n: number,
  caseId: FourierCaseId,
  quadratureExtra = 0,
  potentialRadial = POTENTIAL_RADIAL_ORDER,
  potentialAxial = POTENTIAL_AXIAL_ORDER,
): FourierSpectrum {
  const [requiredRadial, requiredAxial] = surfacePotentialOrders(settings, n);
  potentialRadial = Math.max(potentialRadial, requiredRadial);
  potentialAxial = Math.max(potentialAxial, requiredAxial);
  const pressureKey =
      caseId === "mass"
        ? "mass"
        : `${settings.ullagePsi}-${settings.accelerationG}`,
    key = `${settings.fluid}-${settings.fill}-${pressureKey}-${settings.surfaceMaxOrder}-${settings.surfaceRadialOrder}-${n}-${caseId}-${quadratureExtra}-${potentialRadial}-${potentialAxial}`,
    saved = FOURIER_SPECTRA.get(key);
  if (saved) return saved;
  const shell = shellMatrices(n, "cos"),
    h = heightForFill(settings.fill),
    density = FLUIDS[settings.fluid].density,
    fluidActive = settings.fill > 1e-8,
    full = settings.fill >= 1 - 1e-8,
    slosh = fluidActive && !full ? surfaceShapes(settings, n, "cos") : [],
    size = shell.basis.length,
    // At fixed z, fluid kinetic integrands have degree <= 2n+4(radial-1)+1.
    // A q-point Gauss rule integrates through degree 2q-1. This scales q with n;
    // the baseline n<=4 quadrature is preserved byte for byte.
    radialQuadrature =
      (n <= 4 && potentialRadial === POTENTIAL_RADIAL_ORDER
        ? GR.length
        : Math.max(GR.length, n + 2 * potentialRadial + 1)) + quadratureExtra,
    f =
      fluidActive && caseId !== "pressure"
        ? fluidMatrices(
            shell.basis,
            h,
            slosh,
            full,
            potentialRadial,
            potentialAxial,
            false,
            radialQuadrature,
            n > 4 || slosh.length > 1,
          )
        : {
            mass: zero(size),
            added: zero(size),
            gravityUnit: zero(size),
            flux: Array(size).fill(0),
          },
    b: Block = {
      n,
      orientation: "cos",
      basis: shell.basis,
      dryMass: shell.mass,
      dryStiffness: shell.stiffness,
      geometric: pressureMatrix(shell.basis, settings, h, density),
      fluidMass: f.mass,
      addedMass: f.added,
      gravity: f.gravityUnit,
      slosh,
      flux: f.flux,
    },
    result: FourierSpectrum = {
      shellMass: shell.mass,
      shellStiffness: shell.stiffness,
      addedMass: f.added.map((row) => row.map((v) => density * v)),
      dry: generalizedEigen(shell.stiffness, shell.mass),
      wet: blockSpectrum(
        b,
        caseId,
        full,
        fluidActive && !full,
        density,
        settings.accelerationG * G0,
      ),
      freeSurfaceModel:
        caseId === "pressure"
          ? "not-applied"
          : !fluidActive
            ? "empty"
            : full
              ? "closed-liquid"
              : slosh.length
                ? "condensed-retained-shape"
                : "rigid-surface",
    };
  if (FOURIER_SPECTRA.size > 1024) FOURIER_SPECTRA.clear();
  FOURIER_SPECTRA.set(key, result);
  return result;
}

function fourierModes(spectrum: FourierSpectrum): FourierMode[] {
  const { dry, wet, shellMass, shellStiffness, addedMass } = spectrum,
    scores = wet.vectors.map((v) =>
      dry.vectors.map((reference) => Math.min(1, mac(v, reference, shellMass))),
    ),
    assignment = modeAssignment(scores);
  return wet.vectors.map((v, i) => {
    const reference = assignment[i];
    return {
      branch: reference + 1,
      frequency: Math.sqrt(Math.max(0, wet.values[i])) / TAU,
      dryFrequency: Math.sqrt(Math.max(0, dry.values[reference])) / TAU,
      structuralRayleighFrequency:
        Math.sqrt(
          Math.max(
            0,
            quadratic(shellStiffness, v) /
              Math.max(1e-30, quadratic(shellMass, v)),
          ),
        ) / TAU,
      addedMassRatio:
        quadratic(addedMass, v) / Math.max(1e-30, quadratic(shellMass, v)),
      residual: wet.residuals[i],
      dryMAC: scores[i][reference],
      stepMAC: null,
      trackingAmbiguous: nearlyDegenerate(wet.values, i),
      unstable: wet.values[i] < -1e-8,
    };
  });
}

function fourierSurface(
  settings: Settings,
  n: number,
  caseId: FourierCaseId = "mass",
): FourierSurfaceModel {
  if (caseId === "pressure") return "not-applied";
  return settings.fill <= 1e-8
    ? "empty"
    : settings.fill >= 1 - 1e-8
      ? "closed-liquid"
      : surfaceShapes(settings, n, "cos").length > 0
        ? "condensed-retained-shape"
        : "rigid-surface";
}

export type FourierCoverageOptions = {
  cutoff?: FourierCutoff;
  minHz?: number;
  maxHz?: number;
  caseId?: FourierCaseId;
  trackedBranch?: number;
};

/**
 * All n=0..20 are solved with five shell trials. By default all five modes use
 * snapshot dry-MAC labels. trackedBranch requests one dry-seeded branch with
 * the same canonical fill continuation used by fourierFillSweep; the trial
 * space and operators are unchanged. Cutoff only distinguishes angular coverage.
 */
export function* fourierCoverageSteps(
  input: Settings = DEFAULT,
  options: FourierCoverageOptions = {},
): Generator<number, FourierCoverage, void> {
  const settings = cleanSettings(input),
    cutoff = FOURIER_CUTOFFS.includes(options.cutoff ?? 12)
      ? (options.cutoff ?? 12)
      : 12,
    caseId =
      options.caseId === "combined" || options.caseId === "pressure"
        ? options.caseId
        : "mass",
    trackedBranch = Number.isFinite(options.trackedBranch)
      ? Math.max(
          1,
          Math.min(STRUCTURAL_ORDER, Math.round(options.trackedBranch!)),
        )
      : null,
    minHz = Number.isFinite(options.minHz) ? Math.max(0, options.minHz!) : 10,
    maxHz = Number.isFinite(options.maxHz)
      ? Math.max(minHz, options.maxHz!)
      : Math.max(minHz, 2000),
    families: FourierFamily[] = [];
  for (let n = 0; n <= FOURIER_MAX_ORDER; n++) {
    try {
      const sample =
        trackedBranch !== null
          ? fourierTrackedSample(
              settings,
              n,
              caseId,
              settings.fill,
              undefined,
              trackedBranch,
            )
          : undefined;
      if (sample && !sample.node) throw new Error(sample.error);
      const spectrum =
          sample?.node?.spectrum ?? fourierSpectrum(settings, n, caseId),
        modes = sample?.node
          ? trackedFourierModes(sample.node).filter(
              (mode) => mode.branch === trackedBranch,
            )
          : fourierModes(spectrum),
        inBandCount = modes.filter(
          (mode) =>
            !mode.unstable &&
            mode.frequency >= minHz &&
            mode.frequency <= maxHz,
        ).length;
      families.push({
        n,
        wavelength: n > 0 ? (TAU * TANK.radius) / n : null,
        retained: n <= cutoff,
        freeSurfaceModel: spectrum.freeSurfaceModel,
        dryFrequencies: spectrum.dry.values.map(
          (value) => Math.sqrt(Math.max(0, value)) / TAU,
        ),
        modes,
        inBandCount,
        maxResidual: Math.max(...spectrum.wet.residuals),
        available: true,
      });
    } catch (error) {
      families.push({
        n,
        wavelength: n > 0 ? (TAU * TANK.radius) / n : null,
        retained: n <= cutoff,
        freeSurfaceModel: fourierSurface(settings, n, caseId),
        dryFrequencies: [],
        modes: [],
        inBandCount: 0,
        maxResidual: 0,
        available: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // A browser can schedule the next family on another event-loop turn.
    yield n;
  }
  return {
    settings,
    cutoff,
    maxOrder: FOURIER_MAX_ORDER,
    band: [minHz, maxHz],
    caseId,
    families,
    retainedInBandModes: families
      .filter((f) => f.retained)
      .reduce((sum, f) => sum + f.inBandCount, 0),
    omittedInBandModes: families
      .filter((f) => !f.retained)
      .reduce((sum, f) => sum + f.inBandCount, 0),
    omittedFamilies: families
      .filter((f) => !f.retained && f.inBandCount > 0)
      .map((f) => f.n),
    maxResidual: Math.max(
      ...families.filter((f) => f.available).map((f) => f.maxResidual),
      0,
    ),
  };
}

/** Synchronous counterpart; browser UI can use fourierCoverageSteps to yield. */
export function fourierCoverage(
  input: Settings = DEFAULT,
  options: FourierCoverageOptions = {},
): FourierCoverage {
  const steps = fourierCoverageSteps(input, options);
  let result = steps.next();
  while (!result.done) result = steps.next();
  return result.value;
}

type FourierTrackedNode = {
  spectrum: FourierSpectrum;
  tracked: TrackedSpectrum;
};
type FourierTrackingSample = { node?: FourierTrackedNode; error?: string };
const FOURIER_TRACKERS = new Map<string, Map<number, FourierTrackingSample>>();

function seedFourierNode(
  settings: Settings,
  n: number,
  caseId: FourierCaseId,
): FourierTrackedNode {
  const spectrum = fourierSpectrum({ ...settings, fill: 0 }, n, caseId),
    modes = fourierModes(spectrum),
    vectors = spectrum.wet.vectors.map((vector) => vector.slice()),
    labels = modes.map((mode) => mode.branch - 1),
    quality = modes.map((mode) => mode.dryMAC);
  return {
    spectrum,
    tracked: {
      ...spectrum.wet,
      vectors,
      fill: 0,
      labels,
      quality,
      minimumQuality: quality.slice(),
      ambiguous: modes.map(
        (mode) => mode.trackingAmbiguous || mode.dryMAC < TRACK_WARNING_MAC,
      ),
    },
  };
}

function advanceFourierNode(
  settings: Settings,
  n: number,
  caseId: FourierCaseId,
  previous: FourierTrackedNode,
  fill: number,
  depth = 0,
  trackedBranch?: number,
): FourierTrackedNode {
  // The low-order families include densely spaced breathing/slosh-coupled
  // seeds. Preserve their established all-mode continuation before filtering.
  if (n <= 4) trackedBranch = undefined;
  const spectrum = fourierSpectrum({ ...settings, fill }, n, caseId),
    wet = {
      ...spectrum.wet,
      vectors: spectrum.wet.vectors.map((vector) => vector.slice()),
    },
    tracked = matchFillStep(previous.tracked, wet, fill, n),
    sameTopology = previous.tracked.vectors.length === tracked.vectors.length,
    inspectedQuality = tracked.quality.filter(
      (_, i) =>
        trackedBranch === undefined || tracked.labels[i] === trackedBranch - 1,
    );
  if (
    fill < 1 &&
    sameTopology &&
    Math.min(...inspectedQuality) < TRACK_ACCEPT_MAC &&
    fill - previous.tracked.fill > TRACK_MIN_STEP &&
    depth < TRACK_MAX_REFINEMENT
  ) {
    const middle = advanceFourierNode(
      settings,
      n,
      caseId,
      previous,
      (previous.tracked.fill + fill) / 2,
      depth + 1,
      trackedBranch,
    );
    return advanceFourierNode(
      settings,
      n,
      caseId,
      middle,
      fill,
      depth + 1,
      trackedBranch,
    );
  }
  return { spectrum, tracked };
}

function fourierCanonicalTrack(
  settings: Settings,
  n: number,
  caseId: FourierCaseId,
  throughFill = 1,
  trackedBranch?: number,
) {
  if (n <= 4) trackedBranch = undefined;
  const pressureKey =
      caseId === "mass"
        ? "mass"
        : `${settings.ullagePsi}-${settings.accelerationG}`,
    key = `${settings.fluid}-${pressureKey}-${settings.surfaceMaxOrder}-${settings.surfaceRadialOrder}-${n}-${caseId}-${trackedBranch ?? "all"}`,
    saved = FOURIER_TRACKERS.get(key);
  const samples = saved ?? new Map<number, FourierTrackingSample>();
  if (!samples.size)
    samples.set(0, { node: seedFourierNode(settings, n, caseId) });
  const lastFill = [...samples.keys()].at(-1)!,
    steps = trackedBranch === undefined ? 100 : 20,
    start = Math.round(lastFill * steps) + 1,
    target = Math.min(steps, Math.ceil(throughFill * steps - 1e-10));
  let previous = [...samples.values()]
    .reverse()
    .find((sample) => sample.node)!.node!;
  for (let i = start; i <= target; i++) {
    const fill = i / steps;
    try {
      previous = advanceFourierNode(
        settings,
        n,
        caseId,
        previous,
        fill,
        0,
        trackedBranch,
      );
      samples.set(fill, { node: previous });
    } catch (error) {
      // Preserve the last valid seed: a failed shallow-pool solve is a gap,
      // rather than fabricated zero mass or a silent change of branch identity.
      samples.set(fill, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  // Keep all 21 angular families for each of the three comparison cases.
  if (!saved && FOURIER_TRACKERS.size >= 96)
    FOURIER_TRACKERS.delete(FOURIER_TRACKERS.keys().next().value!);
  FOURIER_TRACKERS.set(key, samples);
  return samples;
}

/** Exact-fill sample from the same lazy canonical grid as coverage and sweeps. */
function fourierTrackedSample(
  settings: Settings,
  n: number,
  caseId: FourierCaseId,
  fill: number,
  canonical?: Map<number, FourierTrackingSample>,
  trackedBranch?: number,
): FourierTrackingSample {
  canonical ??= fourierCanonicalTrack(settings, n, caseId, fill, trackedBranch);
  const exact = canonical.get(fill);
  if (exact) return exact;
  const preceding = [...canonical.entries()]
    .filter(([value, sample]) => value < fill && sample.node)
    .at(-1)![1].node!;
  try {
    return {
      node: advanceFourierNode(
        settings,
        n,
        caseId,
        preceding,
        fill,
        0,
        trackedBranch,
      ),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function trackedFourierModes(node: FourierTrackedNode): FourierMode[] {
  const modes = fourierModes(node.spectrum);
  modes.forEach((mode, i) => {
    const reference = node.tracked.labels[i];
    mode.branch = reference + 1;
    mode.dryFrequency =
      Math.sqrt(Math.max(0, node.spectrum.dry.values[reference])) / TAU;
    mode.dryMAC = Math.min(
      1,
      mac(
        node.tracked.vectors[i],
        node.spectrum.dry.vectors[reference],
        node.spectrum.shellMass,
      ),
    );
    mode.stepMAC = node.tracked.fill === 0 ? null : node.tracked.quality[i];
    mode.trackingAmbiguous = node.tracked.ambiguous[i];
  });
  return modes;
}

/**
 * Selected-family fill sweep. All-mode labels follow a deterministic 1% grid;
 * a requested n>=5 branch uses a 5% seed grid refined on that branch's overlap.
 * Orders n<=4 preserve their established all-mode 1% continuation.
 * bounded MAC refinement; displayed samples remain 5% plus exact current fill.
 * Exact markers are matched from canonical nodes and never alter later labels.
 * MAC<0.90/degeneracy breaks plotted branches. A flat curve cannot establish
 * angular completeness.
 */
export function fourierFillSweep(
  input: Settings = DEFAULT,
  requestedN = 12,
  caseId: FourierCaseId = "mass",
  optionsOrFills: number[] | { fills?: number[]; trackedBranch?: number } = {},
): FourierSweep {
  const fills = Array.isArray(optionsOrFills)
      ? optionsOrFills
      : (optionsOrFills.fills ?? Array.from({ length: 21 }, (_, i) => i / 20)),
    requestedBranch = Array.isArray(optionsOrFills)
      ? undefined
      : optionsOrFills.trackedBranch,
    trackedBranch = Number.isFinite(requestedBranch)
      ? Math.max(1, Math.min(STRUCTURAL_ORDER, Math.round(requestedBranch!)))
      : undefined,
    settings = cleanSettings(input),
    n = Math.max(
      0,
      Math.min(
        FOURIER_MAX_ORDER,
        Math.round(Number.isFinite(requestedN) ? requestedN : 12),
      ),
    ),
    sampleFills = [
      ...new Set([
        0,
        settings.fill,
        ...fills
          .filter(Number.isFinite)
          .map((fill) => Math.max(0, Math.min(1, fill))),
      ]),
    ].sort((a, b) => a - b),
    canonical = fourierCanonicalTrack(
      settings,
      n,
      caseId,
      Math.max(...sampleFills),
      trackedBranch,
    ),
    points: FourierSweepPoint[] = [];
  const accepted: FourierTrackedNode[] = [];
  for (const fill of sampleFills) {
    const sample = fourierTrackedSample(
      settings,
      n,
      caseId,
      fill,
      canonical,
      trackedBranch,
    );
    if (!sample.node) {
      points.push({
        fill,
        liquidHeight: heightForFill(fill),
        modes: [],
        available: false,
        freeSurfaceModel: fourierSurface({ ...settings, fill }, n, caseId),
        error: sample.error,
      });
      continue;
    }
    const node = sample.node,
      modes = trackedFourierModes(node).filter(
        (mode) => trackedBranch === undefined || mode.branch === trackedBranch,
      );
    accepted.push(node);
    points.push({
      fill,
      liquidHeight: heightForFill(fill),
      modes,
      available: true,
      freeSurfaceModel: node.spectrum.freeSurfaceModel,
    });
  }
  return {
    settings,
    n,
    caseId,
    points,
    minTrackingMAC: Math.min(
      1,
      ...accepted.flatMap((node) =>
        node.tracked.minimumQuality.filter(
          (_, i) =>
            trackedBranch === undefined ||
            node.tracked.labels[i] === trackedBranch - 1,
        ),
      ),
    ),
    trackingAmbiguous: points.some(
      (p) => !p.available || p.modes.some((mode) => mode.trackingAmbiguous),
    ),
  };
}

function fourierSensitivity(coarse: FourierSpectrum, refined: FourierSpectrum) {
  const coarseModes = fourierModes(coarse),
    refinedModes = fourierModes(refined),
    score = coarse.wet.vectors.map((vector) =>
      refined.wet.vectors.map((reference) =>
        Math.min(1, mac(vector, reference, coarse.shellMass)),
      ),
    ),
    assignment = modeAssignment(score),
    minMAC = Math.min(...assignment.map((reference, i) => score[i][reference]));
  return {
    maxFrequencyRelativeDifference: Math.max(
      ...coarseModes.map((mode, i) => {
        const reference = refinedModes[assignment[i]];
        return (
          Math.abs(mode.frequency - reference.frequency) /
          Math.max(1e-30, reference.frequency)
        );
      }),
    ),
    maxMassRatioRelativeDifference: Math.max(
      ...coarseModes.map((mode, i) => {
        const reference = refinedModes[assignment[i]];
        return (
          Math.abs(mode.addedMassRatio - reference.addedMassRatio) /
          Math.max(1e-30, reference.addedMassRatio)
        );
      }),
    ),
    minMAC,
    matchingAmbiguous:
      minMAC < TRACK_WARNING_MAC ||
      coarseModes.some((mode) => mode.trackingAmbiguous) ||
      refinedModes.some((mode) => mode.trackingAmbiguous),
  };
}

/** Radial integration sensitivity only; does not test Ritz/potential basis completeness. */
export function fourierQuadratureDiagnostics(
  input: Settings = DEFAULT,
  n = 12,
  caseId: FourierCaseId = "mass",
) {
  const settings = cleanSettings(input),
    [radial] = surfacePotentialOrders(settings, n),
    points =
      n <= 4 && radial === POTENTIAL_RADIAL_ORDER
        ? GR.length
        : Math.max(GR.length, n + 2 * radial + 1),
    coarse = fourierSpectrum(settings, n, caseId),
    refined = fourierSpectrum(settings, n, caseId, 4);
  return {
    n,
    radialPoints: points,
    refinedRadialPoints: points + 4,
    ...fourierSensitivity(coarse, refined),
  };
}

/** Potential trial refinement; reports sensitivity rather than certifying completeness. */
export function fourierBasisDiagnostics(
  input: Settings = DEFAULT,
  n = 12,
  caseId: FourierCaseId = "mass",
) {
  const settings = cleanSettings(input),
    [radial, axial] = surfacePotentialOrders(settings, n),
    coarse = fourierSpectrum(settings, n, caseId),
    refined = fourierSpectrum(settings, n, caseId, 0, radial + 1, axial + 2);
  return {
    n,
    potentialRadialOrder: radial,
    potentialAxialOrder: axial,
    refinedPotentialRadialOrder: radial + 1,
    refinedPotentialAxialOrder: axial + 2,
    ...fourierSensitivity(coarse, refined),
    maxResidual: Math.max(...coarse.wet.residuals, ...refined.wet.residuals),
  };
}

const FLUID_MODE_RESPONSE = new WeakMap<
  ModalMode,
  { potentials: Potential[]; coefficients: number[] }
>();
/** Potential-flow liquid displacement, using the SAME scale as shell / surface. */
export function fluidDisplacement(
  solution: Solution,
  mode: ModalMode,
  r: number,
  z: number,
  theta: number,
) {
  const empty = { radial: 0, axial: 0, tangential: 0 };
  if (
    !solution.fluidActive ||
    mode.id.startsWith("dry-") ||
    mode.id.startsWith("pressure-") ||
    z > solution.liquidHeight ||
    r > radiusAt(z)
  )
    return empty;
  ensureNormalized(solution, mode);
  let cached = FLUID_MODE_RESPONSE.get(mode);
  if (!cached) {
    const shell = shellMatrices(mode.n, mode.orientation),
      sm = solution.slosh.filter(
        (s) => s.n === mode.n && s.orientation === mode.orientation,
      );
    const f = shellFluidMatrices(
      shell.basis,
      solution.liquidHeight,
      sm,
      !solution.surfaceActive,
    );
    const q = shell.basis.map((b) => mode.vector[b.index]);
    q.push(...sm.map((s) => mode.vector[NSHELL + s.id - 1]));
    cached = {
      potentials: f.potentials,
      coefficients: f.response.map((row) =>
        row.reduce((sum, x, i) => sum + x * q[i], 0),
      ),
    };
    FLUID_MODE_RESPONSE.set(mode, cached);
  }
  const n = mode.n,
    c = mode.orientation === "cos" ? Math.cos(n * theta) : Math.sin(n * theta),
    d = mode.orientation === "cos" ? -Math.sin(n * theta) : Math.cos(n * theta);
  let radial = 0,
    axial = 0,
    tangential = 0;
  for (let i = 0; i < cached.potentials.length; i++) {
    const p = potential(cached.potentials[i], r, z, solution.liquidHeight),
      q = cached.coefficients[i] / mode.normalization;
    radial += q * p.dr * c;
    axial += q * p.dz * c;
    if (r > 1e-8) tangential += ((q * n * p.v) / r) * d;
    else if (n === 1) tangential += q * p.dr * d;
  }
  return { radial, axial, tangential };
}
