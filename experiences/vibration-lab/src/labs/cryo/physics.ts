/**
 * Cryogenic tank: a finite-dimensional shell/potential-flow energy model.
 * SI internally. Shapes are Ritz approximations, not imported tank FE modes.
 */
export type Settings = {
  fluid: "lox" | "lh2";
  fill: number;
  ullagePsi: number;
  accelerationG: number;
};
export const DEFAULT: Settings = {
  fluid: "lox",
  fill: 0.85,
  ullagePsi: 31,
  accelerationG: 2,
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
  slosh?: SloshMode;
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
    if (big < 1e-13 * magnitude) break;
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
  // Power series is accurate over this demo's first-root interval, x≤4.21.
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
type Potential = { power: number; axial: number };
function potentialBasis(n: number, radial = 3, axial = 6): Potential[] {
  const out: Potential[] = [];
  for (let j = 0; j < radial; j++)
    for (let l = 0; l < axial; l++)
      if (n !== 0 || j !== 0 || l !== 0)
        out.push({ power: n + 2 * j, axial: l });
  return out;
}
function potential(p: Potential, r: number, z: number, h: number) {
  const R = TANK.radius,
    t = r / R,
    x = (2 * z) / h - 1,
    L = legendre(p.axial, x),
    rp = t ** p.power;
  return {
    v: rp * L.p,
    dr: p.power === 0 ? 0 : (p.power / R) * t ** (p.power - 1) * L.p,
    dz: (rp * L.d * 2) / h,
  };
}
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
  }
>();
function fluidMatrices(
  basis: ShellBasis[],
  h: number,
  slosh: SloshMode | undefined,
  full: boolean,
  radial = POTENTIAL_RADIAL_ORDER,
  axial = POTENTIAL_AXIAL_ORDER,
  cylinder = false,
  radialQuadrature = GR.length,
  energyGram = false,
) {
  const n = basis[0].n,
    size = basis.length,
    ns = slosh && !full ? 1 : 0,
    total = size + ns;
  const key = `${n}-${h.toFixed(9)}-${full}-${radial}-${axial}-${size}-${cylinder}-${radialQuadrature}-${ns}-${energyGram}`;
  const saved = FLUID_CACHE.get(key);
  if (saved) return saved;
  const psi = potentialBasis(n, radial, axial),
    np = psi.length,
    L = zero(np),
    B = zero(np, total),
    angular = n === 0 ? TAU : Math.PI;
  const fluidRadius = (z: number) => (cylinder ? TANK.radius : radiusAt(z));
  const fluidDerivatives = (z: number) =>
    cylinder ? { r: TANK.radius, r1: 0, r2: 0 } : radiusDerivatives(z);
  const Rs = fluidRadius(h),
    area = Math.PI * Rs * Rs,
    flux = Array(size).fill(0),
    grav = zero(total);
  const zq = integrateSegments(h),
    rq = radialQuadrature === GR.length ? GR : gauss(radialQuadrature);
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
  for (let i = 0; i < np; i++) for (let j = 0; j < i; j++) L[j][i] = L[i][j];
  for (const q of zq) {
    const { r, r1 } = fluidDerivatives(q.z),
      u = basis.map((b) => basisShape(b, q.z)),
      p = psi.map((v) => potential(v, r, q.z, h).v);
    for (let j = 0; j < size; j++) {
      const boundary = (u[j].ur - r1 * u[j].zz) * r * q.w * angular;
      if (n === 0) flux[j] += boundary;
      for (let i = 0; i < np; i++) B[i][j] += p[i] * boundary;
    }
  }
  if (!full && area > 1e-10) {
    for (const g of GS) {
      const r = (Rs * (g.x + 1)) / 2,
        w = ((angular * r * Rs) / 2) * g.w,
        p = psi.map((v) => potential(v, r, h, h).v);
      const eta = slosh ? sloshShape(slosh, r, Rs) : 0;
      const surface = Array.from({ length: total }, (_, j) =>
        j < size ? (n === 0 ? -flux[j] / area : 0) : eta,
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
  const invLn = inverseSPD(Ln),
    response = mul(invLn, Bn).map((row, i) => row.map((x) => x / d[i]));
  // High-n blocks use a symmetric positive energy Gram product instead of
  // multiplying an explicit inverse into B twice. Keep n<=4 unchanged.
  const whitened = energyGram ? mul(inverseLower(cholesky(Ln)), Bn) : undefined;
  const mass = whitened
    ? mul(transpose(whitened), whitened)
    : mul(transpose(Bn), mul(invLn, Bn));
  let added = mass.slice(0, size).map((r) => r.slice(0, size));
  if (ns) {
    const mff = mass[size][size];
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++)
        added[i][j] -= (mass[i][size] * mass[size][j]) / mff;
  }
  const result = {
    mass,
    added,
    gravityUnit: grav,
    flux,
    sloshMass: ns ? mass[size][size] : 0,
    potentials: psi,
    response,
  };
  if (FLUID_CACHE.size >= 4096)
    FLUID_CACHE.delete(FLUID_CACHE.keys().next().value!);
  FLUID_CACHE.set(key, result);
  return result;
}
/** Identical potential integration for solves, tracking and liquid animation. */
function shellFluidMatrices(
  basis: ShellBasis[],
  h: number,
  slosh: SloshMode | undefined,
  full: boolean,
) {
  const n = basis[0].n;
  return fluidMatrices(
    basis,
    h,
    slosh,
    full,
    POTENTIAL_RADIAL_ORDER,
    POTENTIAL_AXIAL_ORDER,
    false,
    n <= 4
      ? GR.length
      : Math.max(GR.length, n + 2 * POTENTIAL_RADIAL_ORDER + 1),
    n > 4,
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
  };
}

type BlockSpectrum = {
  vectors: number[][];
  values: number[];
  residuals: number[];
  mass: Matrix;
  ns: number;
  nf: number;
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
    nf = id === "coupled" && surfaceActive && b.slosh ? 1 : 0,
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
    const assignment = nf
      ? [-1, ...modeAssignment(score.slice(1))]
      : modeAssignment(score);
    for (let j = 0; j < vectors.length; j++) {
      const v = vectors[j],
        dryRef = assignment[j],
        sloshMode = nf && dryRef < 0;
      const phase = sloshMode
        ? v[ns]
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
      const global = Array(NSHELL + 7).fill(0);
      for (let i = 0; i < ns; i++) global[b.basis[i].index] = v[i];
      if (nf && b.slosh) global[NSHELL + b.slosh.id - 1] = v[ns];
      else if (withMass && surfaceActive && b.slosh)
        global[NSHELL + b.slosh.id - 1] =
          -b.fluidMass[ns]
            .slice(0, ns)
            .reduce((sum, x, i) => sum + x * v[i], 0) / b.fluidMass[ns][ns];
      const structural = quadratic(b.dryMass, v.slice(0, ns));
      const fluid = withMass
        ? density * quadratic(nf ? b.fluidMass : b.addedMass, v)
        : 0;
      const total = structural + fluid;
      const jref = Math.max(0, dryRef),
        referenceId = sloshMode
          ? `slosh-${b.slosh!.id}`
          : `shell-${b.n}-${jref + 1}-${b.orientation}`;
      const mode: ModalMode = {
        id: `${id}-${referenceId}`,
        referenceId,
        label: sloshMode
          ? b.slosh!.label
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
          ? (density * b.fluidMass[ns][ns] * v[ns] * v[ns]) /
            Math.max(1e-30, total)
          : 0,
        sloshId: sloshMode ? b.slosh!.id : undefined,
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
    ? SLOSH_TEMPLATE.map((s) => {
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
        sm = slosh.find((s) => s.n === n && s.orientation === orientation);
      const f = fluidActive
        ? shellFluidMatrices(shell.basis, h, sm, full)
        : {
            mass: zero(size),
            added: zero(size),
            gravityUnit: zero(size),
            flux: Array(size).fill(0),
            sloshMass: 0,
          };
      if (sm)
        sm.frequency =
          acc > 0
            ? Math.sqrt((acc * f.gravityUnit[size][size]) / f.sloshMass) / TAU
            : 0;
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
    cases[id] = modalCase(blocks, id, full, surfaceActive, density, acc, refs);
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
      "The seven retained free-surface coordinates count lateral sine/cosine partners separately. Seven fluid modes are a truncation, not the complete slosh spectrum.",
      "Fluid kinetic energy includes shell/free-surface cross terms. The high-frequency mass comparison condenses the retained slosh coordinates; the coupled case uses their shared uncondensed mass.",
      "Pressure-maintained ullage: incremental gas-compression stiffness is omitted. A sealed ullage requires a gas spring, particularly for breathing modes.",
      "Shell trial functions taper at both poles and impose near-inextensional barrel hoop/shear kinematics. Free-free means no applied modal supports; this is a restricted elastic Ritz space with rigid-body modes excluded.",
      "Barrel KG retains initial-stress energy only. Dome prestress and the pressure follower-load tangent are omitted; this is not a complete pressurized free-free tangent operator.",
      "Five axial shell trials per angular family; first three matched branches are exposed. Refinement sensitivity is about 0.03% for the baseline lowest n2 dry mode, but about 12–14% for lowest n1/n3/n4. Frequencies remain model estimates.",
      "Inspection includes n=0 through n=12. Orders n>=4 have rigid free-surface loading in partial fill because no free-surface coordinates are retained for those families; extending shell coverage does not add slosh eigenvectors.",
      "Uniform aluminum properties; thermal contraction, insulation, stiffeners, liquid compressibility, damping and nonlinear slosh are omitted.",
    ],
  };
  if (settings.fill > 0.95 && settings.fill < 1)
    result.notes.push(
      "The free surface lies in the shrinking upper dome: potential-basis truncation becomes more sensitive near full fill. Surface modes remain approximate; at 99% the baseline n3 slosh refinement changes about 1.6%.",
    );
  if (settings.fill < 0.05 && settings.fill > 0)
    result.notes.push(
      "A shallow bottom-dome liquid pool is outside the cylindrical slosh benchmark geometry. These seven fixed surface families need not be the lowest seven modes at this fill.",
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
    template = surfaceActive
      ? SLOSH_TEMPLATE.find((s) => s.n === n)
      : undefined,
    slosh = template
      ? { ...template, frequency: 0, cylinderFrequency: 0 }
      : undefined,
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
  const shell = shellMatrices(n, "cos"),
    openingSurface = previous.nf === 0 && spectrum.nf === 1,
    closingSurface = previous.nf === 1 && spectrum.nf === 0,
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
    const middle = (previous.fill + fill) / 2,
      intermediate = advanceFill(tracker, previous, middle, depth + 1);
    return advanceFill(tracker, intermediate, fill, depth + 1);
  }
  return next;
}

function trackedAt(settings: Settings, id: CaseId, n: number): TrackedSpectrum {
  // With no retained surface coordinate, these operators are identical.
  // Share their continuation instead of solving the same high-n path twice.
  if (id === "coupled" && n >= 4) id = "combined";
  const pressure = id === "pressure" || id === "combined" || id === "coupled",
    key = `${id}-${n}-${settings.fluid}-${pressure ? `${settings.ullagePsi}-${settings.accelerationG}` : "mass"}`;
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
    slosh = solution.slosh.find(
      (s) => s.n === n && s.orientation === orientation,
    );
  modes.forEach((mode, i) => {
    const label = tracked.labels[i],
      isSlosh = label === tracked.ns,
      local = shell.basis.map((b) => mode.vector[b.index]);
    if (tracked.nf && slosh) local.push(mode.vector[NSHELL + slosh.id - 1]);
    if (signedOverlap(local, tracked.vectors[i], tracked.mass) < 0)
      mode.vector = mode.vector.map((value) => -value);
    mode.kind = isSlosh ? "slosh" : "shell";
    mode.axialOrder = isSlosh ? 0 : label + 1;
    mode.sloshId = isSlosh ? slosh!.id : undefined;
    mode.referenceId = isSlosh
      ? `slosh-${slosh!.id}`
      : `shell-${n}-${label + 1}-${orientation}`;
    mode.id = `${caseId}-${mode.referenceId}`;
    mode.label = isSlosh
      ? slosh!.label
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
    const template = SLOSH_TEMPLATE.find(
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
): number {
  const root =
      n === 0
        ? 3.831705970207513
        : n === 1
          ? 1.841183781340659
          : n === 2
            ? 3.05423692822714
            : 4.201188941210528,
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
    const template = SLOSH_TEMPLATE.find((x) => x.n === n),
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
  const pressureKey =
      caseId === "mass"
        ? "mass"
        : `${settings.ullagePsi}-${settings.accelerationG}`,
    key = `${settings.fluid}-${settings.fill}-${pressureKey}-${n}-${caseId}-${quadratureExtra}-${potentialRadial}-${potentialAxial}`,
    saved = FOURIER_SPECTRA.get(key);
  if (saved) return saved;
  const shell = shellMatrices(n, "cos"),
    h = heightForFill(settings.fill),
    density = FLUIDS[settings.fluid].density,
    fluidActive = settings.fill > 1e-8,
    full = settings.fill >= 1 - 1e-8,
    template =
      fluidActive && !full
        ? SLOSH_TEMPLATE.find((s) => s.n === n && s.orientation === "cos")
        : undefined,
    slosh = template
      ? { ...template, frequency: 0, cylinderFrequency: 0 }
      : undefined,
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
            n > 4,
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
              : slosh
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
      : n <= 3
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
    key = `${settings.fluid}-${pressureKey}-${n}-${caseId}-${trackedBranch ?? "all"}`,
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
    coarse = fourierSpectrum(settings, n, caseId),
    refined = fourierSpectrum(settings, n, caseId, 4);
  return {
    n,
    radialPoints:
      n <= 4
        ? GR.length
        : Math.max(GR.length, n + 2 * POTENTIAL_RADIAL_ORDER + 1),
    refinedRadialPoints:
      (n <= 4
        ? GR.length
        : Math.max(GR.length, n + 2 * POTENTIAL_RADIAL_ORDER + 1)) + 4,
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
    coarse = fourierSpectrum(settings, n, caseId),
    refined = fourierSpectrum(settings, n, caseId, 0, 5, 10);
  return {
    n,
    potentialRadialOrder: POTENTIAL_RADIAL_ORDER,
    potentialAxialOrder: POTENTIAL_AXIAL_ORDER,
    refinedPotentialRadialOrder: 5,
    refinedPotentialAxialOrder: 10,
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
      sm = solution.slosh.find(
        (s) => s.n === mode.n && s.orientation === mode.orientation,
      );
    const f = shellFluidMatrices(
        shell.basis,
        solution.liquidHeight,
        sm,
        !solution.surfaceActive,
      ),
      ns = shell.basis.length;
    const q = shell.basis.map((b) => mode.vector[b.index]);
    if (sm) {
      if (mode.id.startsWith("coupled-"))
        q.push(mode.vector[NSHELL + sm.id - 1]);
      else
        q.push(
          -f.mass[ns].slice(0, ns).reduce((sum, x, i) => sum + x * q[i], 0) /
            f.mass[ns][ns],
        );
    }
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
    else if (n === 1 && cached.potentials[i].power === 1)
      tangential +=
        (q / TANK.radius) *
        legendre(
          cached.potentials[i].axial,
          (2 * z) / solution.liquidHeight - 1,
        ).p *
        d;
  }
  return { radial, axial, tangential };
}
