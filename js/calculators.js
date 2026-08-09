import { createEngineeringRegistry } from './engineering-results.js';

const G0 = 9.80665;
const AIR_RHO = 1.204;
const AIR_C = 343;

export const materials = {
  aluminum: { label: 'Aluminum 6061-T6', E: 68.9e9, rho: 2700, nu: 0.33 },
  steel: { label: 'Carbon steel', E: 200e9, rho: 7850, nu: 0.30 },
  inconel: { label: 'Inconel 718', E: 200e9, rho: 8190, nu: 0.29 },
  titanium: { label: 'Ti-6Al-4V', E: 114e9, rho: 4430, nu: 0.34 },
  magnesium: { label: 'Magnesium alloy', E: 45e9, rho: 1800, nu: 0.35 },
  cfrp: { label: 'Quasi-isotropic CFRP (screening)', E: 55e9, rho: 1600, nu: 0.30 },
};

const materialOptions = Object.entries(materials).map(([value, m]) => ({ value, label: m.label }));

function n(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function positive(v, name) {
  const x = n(v);
  if (!(x > 0)) throw new Error(`${name} must be greater than zero.`);
  return x;
}

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function sq(x) { return x * x; }
function rad(f) { return 2 * Math.PI * f; }
function db10(x) { return 10 * Math.log10(Math.max(x, 1e-300)); }
function db20(x) { return 20 * Math.log10(Math.max(Math.abs(x), 1e-300)); }
function fromDb10(x) { return 10 ** (x / 10); }
function deg(x) { return x * 180 / Math.PI; }
function hypot2(a, b) { return Math.sqrt(a * a + b * b); }

function logspace(lo, hi, count = 100) {
  if (!(lo > 0 && hi > lo)) return [];
  const a = Math.log10(lo), b = Math.log10(hi);
  return Array.from({ length: count }, (_, i) => 10 ** (a + (b - a) * i / (count - 1)));
}

function linspace(lo, hi, count = 100) {
  return Array.from({ length: count }, (_, i) => lo + (hi - lo) * i / Math.max(1, count - 1));
}

function parsePairs(text, label = 'data') {
  const rows = String(text ?? '')
    .split(/\n|;/)
    .map(s => s.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const parts = line.split(/[\s,\t]+/).filter(Boolean);
      if (parts.length < 2) throw new Error(`Could not read ${label} row ${idx + 1}. Use “x, y” per line.`);
      const x = Number(parts[0]), y = Number(parts[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`Non-numeric value in ${label} row ${idx + 1}.`);
      return [x, y];
    })
    .sort((a, b) => a[0] - b[0]);
  if (rows.length < 1) throw new Error(`Enter at least one ${label} row.`);
  return rows;
}

function parseNumbers(text) {
  return String(text ?? '').split(/[\s,;]+/).map(Number).filter(Number.isFinite);
}

function interpLogLog(points, x) {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points.at(-1)[0]) return points.at(-1)[1];
  let lo = 0, hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid][0] <= x) lo = mid; else hi = mid;
  }
  const [x1, y1] = points[lo], [x2, y2] = points[hi];
  if (y1 > 0 && y2 > 0 && x1 > 0 && x2 > 0) {
    const t = Math.log(x / x1) / Math.log(x2 / x1);
    return Math.exp(Math.log(y1) + t * Math.log(y2 / y1));
  }
  const t = (x - x1) / (x2 - x1);
  return y1 + t * (y2 - y1);
}

function trapz(x, y) {
  let sum = 0;
  for (let i = 1; i < x.length; i++) sum += 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]);
  return sum;
}

function materialFrom(v) {
  const preset = materials[v.material] ?? materials.aluminum;
  return {
    E: n(v.E_gpa, preset.E / 1e9) * 1e9,
    rho: n(v.rho, preset.rho),
    nu: n(v.nu, preset.nu),
    label: preset.label,
  };
}

function complexPolar(mag, phaseDeg) {
  const p = phaseDeg * Math.PI / 180;
  return { re: mag * Math.cos(p), im: mag * Math.sin(p) };
}
function cMul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
function cDiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
function cInv(a) { const d = a.re * a.re + a.im * a.im; return { re: a.re / d, im: -a.im / d }; }
function cScale(a, s) { return { re: a.re * s, im: a.im * s }; }
function cMag(a) { return hypot2(a.re, a.im); }
function cPhase(a) { return deg(Math.atan2(a.im, a.re)); }

function stat(label, value, unit = '', tone = '') { return { label, value, unit, tone }; }
function trace(name, x, y, extra = {}) { return { name, x, y, ...extra }; }
function normalizeSeries(values){const scale=Math.max(...values.map(value=>Math.abs(value)),1e-12);return values.map(value=>value/scale);}
function normalizeMatrix(matrix){const scale=Math.max(...matrix.flat().map(value=>Math.abs(value)),1e-12);return matrix.map(row=>row.map(value=>value/scale));}

const commonMaterialInputs = [
  { key: 'material', label: 'Material preset', type: 'select', default: 'aluminum', options: materialOptions, help: 'Preset values populate the defaults shown below.' },
  { key: 'E_gpa', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: 68.9, min: 0.001, step: 0.1 },
  { key: 'rho', label: 'Density', unit: 'kg/m³', type: 'number', default: 2700, min: 0.001, step: 1 },
  { key: 'nu', label: 'Poisson ratio', type: 'number', default: 0.33, min: -0.99, max: 0.49, step: 0.01 },
];

function syncMaterialDefaults(values) {
  const m = materials[values.material];
  if (!m) return values;
  return { ...values, E_gpa: m.E / 1e9, rho: m.rho, nu: m.nu };
}

function aWeight(f) {
  const f2 = f * f;
  const ra = (12200 ** 2 * f2 * f2) /
    ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12200 ** 2));
  return 20 * Math.log10(ra) + 2.0;
}
function cWeight(f) {
  const f2 = f * f;
  const rc = (12200 ** 2 * f2) / ((f2 + 20.6 ** 2) * (f2 + 12200 ** 2));
  return 20 * Math.log10(rc) + 0.06;
}

function integratePowerLaw(points) {
  if (points.length < 2) throw new Error('Enter at least two PSD breakpoints.');
  let total = 0;
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [f1, g1] = points[i], [f2, g2] = points[i + 1];
    if (!(f1 > 0 && f2 > f1 && g1 > 0 && g2 > 0)) throw new Error('PSD frequencies and levels must be positive and strictly increasing.');
    const exponent = Math.log(g2 / g1) / Math.log(f2 / f1);
    let area;
    if (Math.abs(exponent + 1) < 1e-10) area = g1 * f1 * Math.log(f2 / f1);
    else area = g1 / (f1 ** exponent) * (f2 ** (exponent + 1) - f1 ** (exponent + 1)) / (exponent + 1);
    total += area;
    segments.push([f1, f2, g1, g2, exponent, db10(2 ** exponent), area, Math.sqrt(area)]);
  }
  return { total, segments };
}

function plateD(E, h, nu) { return E * h ** 3 / (12 * (1 - nu ** 2)); }

function pulseValue(kind, t, duration, amplitude) {
  if (t < 0 || t > duration) return 0;
  const q = t / duration;
  if (kind === 'haversine') return 0.5 * amplitude * (1 - Math.cos(2 * Math.PI * q));
  if (kind === 'rectangular') return amplitude;
  if (kind === 'terminal-sawtooth') return amplitude * (1 - q);
  return amplitude * Math.sin(Math.PI * q);
}

function pulseImpulse(kind, duration, amplitude) {
  if (kind === 'haversine') return 0.5 * amplitude * duration;
  if (kind === 'rectangular') return amplitude * duration;
  if (kind === 'terminal-sawtooth') return 0.5 * amplitude * duration;
  return 2 * amplitude * duration / Math.PI;
}

function jacobiEigenvalues(input, maxIter = 100) {
  const a = input.map(row => row.slice());
  const N = a.length;
  for (let iter = 0; iter < maxIter * N * N; iter++) {
    let p = 0, q = 1, max = 0;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const v = Math.abs(a[i][j]);
      if (v > max) { max = v; p = i; q = j; }
    }
    if (max < 1e-12) break;
    const phi = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(phi), s = Math.sin(phi);
    const app = c * c * a[p][p] - 2 * s * c * a[p][q] + s * s * a[q][q];
    const aqq = s * s * a[p][p] + 2 * s * c * a[p][q] + c * c * a[q][q];
    for (let k = 0; k < N; k++) {
      if (k === p || k === q) continue;
      const akp = a[k][p], akq = a[k][q];
      a[k][p] = a[p][k] = c * akp - s * akq;
      a[k][q] = a[q][k] = s * akp + c * akq;
    }
    a[p][p] = app; a[q][q] = aqq; a[p][q] = a[q][p] = 0;
  }
  return a.map((row, i) => row[i]).sort((x, y) => x - y);
}

const calculatorDefinitions = {
  db: {
    category: 'Acoustics', basis: 'Exact level arithmetic', confidence: 'Exact within inputs',
    inputs: [
      { key: 'levels', label: 'Independent levels', unit: 'dB', type: 'text', default: '92, 88, 84', help: 'Comma- or space-separated power-like levels.' },
      { key: 'coherent_sources', label: 'Coherent tones', unit: 'level dB, phase deg', type: 'textarea', default: '86, 0\n86, 90', help: 'One pressure level and relative phase per line.' },
      { key: 'amplitude_ratio', label: 'Amplitude ratio', type: 'number', default: 2, step: 0.1 },
      { key: 'power_ratio', label: 'Power ratio', type: 'number', default: 2, step: 0.1 },
      { key: 'total_level', label: 'Measured total', unit: 'dB', type: 'number', default: 95, step: 0.1 },
      { key: 'known_level', label: 'Known contribution', unit: 'dB', type: 'number', default: 90, step: 0.1 },
    ],
    theory: '<p>Use 20 log for amplitude ratios and 10 log for power-like ratios. Independent levels sum in mean-square space; phase-locked tones sum as complex pressure amplitudes.</p>',
    assumptions: ['The independent list contains mutually incoherent contributions.', 'The coherent-tone phases refer to the same frequency, position, and time reference.', 'Subtraction is meaningful only when the known contribution is an independent part of the measured total.'],
    example: 'Three independent levels of 92, 88, and 84 dB sum to slightly more than 94 dB—not 264 dB.',
    compute(v) {
      const levels = parseNumbers(v.levels);
      if (!levels.length) throw new Error('Enter at least one level.');
      const total = db10(levels.reduce((s, L) => s + fromDb10(L), 0));
      const coherent = parsePairs(v.coherent_sources, 'coherent tone');
      const coherentPressure = coherent.reduce((sum, [level, phase]) => {
        const component = complexPolar(10 ** (level / 20), phase);
        return { re: sum.re + component.re, im: sum.im + component.im };
      }, { re: 0, im: 0 });
      const coherentTotal = db20(cMag(coherentPressure));
      const ar = positive(v.amplitude_ratio, 'Amplitude ratio');
      const pr = positive(v.power_ratio, 'Power ratio');
      const Lt = n(v.total_level), Lk = n(v.known_level);
      const residualPower = fromDb10(Lt) - fromDb10(Lk);
      const residual = residualPower > 0 ? db10(residualPower) : NaN;
      const backgroundGap = Lt - Lk;
      const backgroundWarning = residualPower <= 0
        ? 'The known contribution is equal to or greater than the measured total, so a physical residual cannot be computed.'
        : backgroundGap < 3
          ? 'Total and background differ by less than 3 dB; the corrected residual is highly uncertainty-sensitive and normally should not be reported as a reliable source level.'
          : backgroundGap < 10
            ? 'The background correction is material; carry measurement uncertainty and state the correction explicitly.'
            : '';
      return {
        summary: [stat('Combined level', total, 'dB'), stat('Coherent-tone combined level', coherentTotal, 'dB'), stat('Amplitude-ratio change', db20(ar), 'dB'), stat('Power-ratio change', db10(pr), 'dB'), stat('Residual level', residual, 'dB', Number.isFinite(residual) ? '' : 'danger'), stat('Total–background separation', backgroundGap, 'dB', backgroundGap < 3 ? 'danger' : backgroundGap < 10 ? 'warn' : 'good')],
        interpretation: `The independent set is ${(total - Math.max(...levels)).toFixed(2)} dB above its strongest contribution. The coherent tones combine to ${coherentTotal.toFixed(2)} dB because their pressure phase is retained; changing geometry or phase can reverse reinforcement into cancellation.`,
        warnings: backgroundWarning ? [backgroundWarning] : [],
        tables: [{ title: 'Independent level contributions', columns: ['Item', 'Level (dB)', 'Linear fraction of total'], rows: levels.map((L, i) => [`L${i + 1}`, L, fromDb10(L) / fromDb10(total)]) }, { title: 'Coherent tonal pressures', columns: ['Tone', 'Level (dB)', 'Relative phase (deg)'], rows: coherent.map(([level, phase], index) => [`Tone ${index + 1}`, level, phase]) }],
      };
    },
  },

  octave: {
    category: 'Acoustics', basis: 'IEC-style geometric bands', confidence: 'Exact geometric definition',
    inputs: [
      { key: 'fraction', label: 'Bands per octave', type: 'select', default: '3', options: [{value:'1',label:'1/1 octave'},{value:'3',label:'1/3 octave'},{value:'6',label:'1/6 octave'},{value:'12',label:'1/12 octave'}] },
      { key: 'fmin', label: 'Minimum center frequency', unit: 'Hz', type: 'number', default: 10, min: 0.001 },
      { key: 'fmax', label: 'Maximum center frequency', unit: 'Hz', type: 'number', default: 20000, min: 0.001 },
      { key: 'reference', label: 'Reference center', unit: 'Hz', type: 'number', default: 1000, min: 0.001 },
    ],
    theory: '<p>Exact constant-percentage centers are generated as f<sub>c</sub> = f<sub>ref</sub>2<sup>k/N</sup>. Band edges are one half-band ratio above and below the center.</p>',
    assumptions: ['Geometric base-2 band definition.', 'Displayed engineering preferred numbers may be rounded differently by a standard or instrument.'],
    example: 'A one-third-octave band centered at 1 kHz has exact edges near 891 and 1122 Hz.',
    compute(v) {
      const N = positive(v.fraction, 'Bands per octave');
      const fmin = positive(v.fmin, 'Minimum frequency'), fmax = positive(v.fmax, 'Maximum frequency'), ref = positive(v.reference, 'Reference frequency');
      if (fmax <= fmin) throw new Error('Maximum frequency must exceed minimum frequency.');
      const k0 = Math.ceil(N * Math.log2(fmin / ref));
      const k1 = Math.floor(N * Math.log2(fmax / ref));
      const ratio = 2 ** (1 / (2 * N));
      const rows = [];
      for (let k = k0; k <= k1; k++) {
        const fc = ref * 2 ** (k / N);
        rows.push([k, fc / ratio, fc, fc * ratio, fc * (ratio - 1 / ratio)]);
      }
      return {
        summary: [stat('Band count', rows.length), stat('Upper/lower ratio', 2 ** (1 / N)), stat('Percent bandwidth', 100 * (ratio - 1 / ratio), '%')],
        interpretation: `${N} band${N === 1 ? '' : 's'} per octave produces a constant upper-to-lower edge ratio of ${(2 ** (1 / N)).toFixed(4)}.`,
        tables: [{ title: 'Exact bands', columns: ['Index k', 'Lower (Hz)', 'Center (Hz)', 'Upper (Hz)', 'Bandwidth (Hz)'], rows }],
        csv: { filename: `fractional-octave-${N}.csv`, columns: ['index','lower_hz','center_hz','upper_hz','bandwidth_hz'], rows },
      };
    },
  },

  weighting: {
    category: 'Acoustics', basis: 'Analytic A/C weighting curves', confidence: 'Standard curve implementation',
    inputs: [
      { key: 'spectrum', label: 'Band spectrum', unit: 'Hz, dB', type: 'textarea', default: '31.5, 92\n63, 95\n125, 99\n250, 101\n500, 103\n1000, 104\n2000, 101\n4000, 97\n8000, 91', help: 'One frequency and unweighted level per line.' },
      { key: 'weighting', label: 'Weighting', type: 'select', default: 'A', options: [{value:'A',label:'A-weighting'},{value:'C',label:'C-weighting'},{value:'Z',label:'Z-weighting (flat)'}] },
    ],
    theory: '<p>The analytic A and C weighting functions are evaluated at each entered band center. Weighted OASPL is the energy sum of the corrected band levels.</p>',
    assumptions: ['Entered levels represent non-overlapping bands.', 'The analytic weighting value is applied at the band center.'],
    example: 'Low-frequency bands receive a strong negative A-weighting correction but a much smaller C-weighting correction.',
    compute(v) {
      const rowsIn = parsePairs(v.spectrum, 'spectrum');
      const kind = v.weighting;
      const rows = rowsIn.map(([f, L]) => {
        if (!(f > 0)) throw new Error('Frequencies must be positive.');
        const corr = kind === 'A' ? aWeight(f) : kind === 'C' ? cWeight(f) : 0;
        return [f, L, corr, L + corr];
      });
      const unweighted = db10(rows.reduce((s, r) => s + fromDb10(r[1]), 0));
      const weighted = db10(rows.reduce((s, r) => s + fromDb10(r[3]), 0));
      return {
        summary: [stat('Unweighted overall', unweighted, 'dB'), stat(`${kind}-weighted overall`, weighted, `dB${kind}`), stat('Weighting change', weighted - unweighted, 'dB')],
        interpretation: `${kind}-weighting changes the energy-summed overall level by ${(weighted - unweighted).toFixed(2)} dB for this spectrum.`,
        plots: [{ title: 'Band spectrum', xLabel: 'Frequency (Hz)', yLabel: 'Level (dB)', xScale: 'log', traces: [trace('Unweighted', rows.map(r=>r[0]), rows.map(r=>r[1])), trace(`${kind}-weighted`, rows.map(r=>r[0]), rows.map(r=>r[3]))] }],
        tables: [{ title: 'Weighted bands', columns: ['Frequency (Hz)','Input (dB)','Correction (dB)','Weighted (dB)'], rows }],
        csv: { filename: `${kind.toLowerCase()}-weighted-spectrum.csv`, columns: ['frequency_hz','input_db','correction_db','weighted_db'], rows },
      };
    },
  },

  'sound-power': {
    category: 'Acoustics', basis: 'Free-field spreading', confidence: 'Screening estimate',
    inputs: [
      { key: 'Lp', label: 'Measured SPL', unit: 'dB re 20 μPa', type: 'number', default: 92, step: 0.1 },
      { key: 'r', label: 'Measurement distance', unit: 'm', type: 'number', default: 2, min: 0.001 },
      { key: 'Q', label: 'Directivity factor Q', type: 'number', default: 2, min: 0.01, help: 'Q=1 full sphere, Q=2 hemispherical radiation.' },
      { key: 'rho', label: 'Air density', unit: 'kg/m³', type: 'number', default: AIR_RHO, min: 0.1 },
      { key: 'c', label: 'Sound speed', unit: 'm/s', type: 'number', default: AIR_C, min: 1 },
    ],
    theory: '<p>Pressure is converted to intensity using the plane progressive-wave relation and multiplied by the effective radiation area 4πr²/Q.</p>',
    assumptions: ['Free-field far-field measurement.', 'Compact source relative to distance.', 'Negligible reflections and atmospheric absorption.'],
    example: 'A source over a rigid plane is often screened with Q≈2, corresponding to hemispherical spreading.',
    compute(v) {
      const Lp = n(v.Lp), r = positive(v.r,'Distance'), Q = positive(v.Q,'Q'), rho = positive(v.rho,'Density'), c = positive(v.c,'Sound speed');
      const p = 20e-6 * 10 ** (Lp / 20);
      const I = p * p / (rho * c);
      const area = 4 * Math.PI * r * r / Q;
      const W = I * area;
      const Lw = db10(W / 1e-12);
      return {
        summary: [stat('Estimated sound power level', Lw, 'dB re 1 pW'), stat('RMS pressure', p, 'Pa'), stat('Intensity', I, 'W/m²'), stat('Effective area', area, 'm²')],
        interpretation: `Under the stated free-field assumptions, ${Lp.toFixed(1)} dB at ${r} m corresponds to an estimated source level of ${Lw.toFixed(1)} dB re 1 pW.`,
        warnings: ['Room reflections, near-field reactance, source extent, and unknown directivity can dominate the uncertainty.'],
      };
    },
  },

  sdof: {
    category: 'Dynamics', basis: 'Linear viscously damped SDOF', confidence: 'Exact within model',
    inputs: [
      { key: 'mass', label: 'Mass', unit: 'kg', type: 'number', default: 10, min: 1e-9 },
      { key: 'fn', label: 'Natural frequency', unit: 'Hz', type: 'number', default: 50, min: 1e-6 },
      { key: 'zeta', label: 'Damping ratio', type: 'number', default: 0.05, min: 0.00001, max: 2, step: 0.005 },
      { key: 'force', label: 'Harmonic force amplitude', unit: 'N peak', type: 'number', default: 100, step: 1 },
      { key: 'forcing_frequency', label: 'Forcing frequency', unit: 'Hz', type: 'number', default: 45, min: 0 },
      { key: 'base_accel', label: 'Base acceleration amplitude', unit: 'g peak', type: 'number', default: 1, min: 0, step: 0.1 },
    ],
    theory: '<p>The force response uses receptance of m ẍ + c ẋ + kx = F. Base-excitation outputs use relative displacement and absolute-acceleration transmissibility.</p>',
    assumptions: ['Linear stiffness and viscous damping.', 'One dominant mode and no nonlinear travel limits.', 'Harmonic steady state.'],
    example: 'At r=1 and ζ=0.05, the normalized force-response magnification is approximately 1/(2ζ)=10.',
    compute(v) {
      const m = positive(v.mass,'Mass'), fn = positive(v.fn,'Natural frequency'), z = positive(v.zeta,'Damping ratio');
      const F = n(v.force), f = Math.max(0, n(v.forcing_frequency)), baseG = Math.max(0,n(v.base_accel));
      const wn = rad(fn), k = m * wn * wn, c = 2 * z * m * wn, r = f / fn;
      const den = Math.sqrt((1-r*r)**2 + (2*z*r)**2);
      const mag = 1 / den;
      const xForce = (F / k) * mag;
      const phase = -deg(Math.atan2(2*z*r, 1-r*r));
      const Tabs = Math.sqrt((1 + (2*z*r)**2) / ((1-r*r)**2 + (2*z*r)**2));
      const relPerBase = r*r / den;
      const baseDisp = f > 0 ? baseG * G0 / rad(f)**2 : 0;
      const relDisp = baseDisp * relPerBase;
      const absAccel = baseG * Tabs;
      const freqs = logspace(fn/10, fn*10, 180);
      const forceCurve = [], transCurve = [], phaseCurve = [];
      for (const ff of freqs) {
        const rr = ff/fn;
        const dd = Math.sqrt((1-rr*rr)**2+(2*z*rr)**2);
        forceCurve.push(1/dd);
        transCurve.push(Math.sqrt((1+(2*z*rr)**2)/((1-rr*rr)**2+(2*z*rr)**2)));
        phaseCurve.push(-deg(Math.atan2(2*z*rr,1-rr*rr)));
      }
      return {
        summary: [stat('Stiffness', k, 'N/m'), stat('Viscous damping', c, 'N·s/m'), stat('Force-response displacement', xForce, 'm peak'), stat('Force-response phase', phase, 'deg'), stat('Base absolute acceleration', absAccel, 'g peak'), stat('Relative travel', relDisp, 'm peak')],
        interpretation: r < 0.8 ? 'The selected forcing point is primarily stiffness-controlled.' : r <= 1.2 ? 'The selected forcing point is in the resonance region; damping controls the amplification.' : 'The selected forcing point is above resonance; force response is increasingly mass-controlled and base motion may enter isolation.',
        warnings: z > 0.3 ? ['The familiar light-damping approximations and a sharp resonance interpretation are weak at this damping level.'] : [],
        plots: [
          { title: 'Normalized response', xLabel:'Frequency (Hz)', yLabel:'Magnitude', xScale:'log', yScale:'log', traces:[trace('Force magnification',freqs,forceCurve),trace('Base absolute transmissibility',freqs,transCurve)] },
          { title: 'Force-response phase', xLabel:'Frequency (Hz)', yLabel:'Phase (deg)', xScale:'log', traces:[trace('Phase',freqs,phaseCurve)] }
        ],
      };
    },
  },

  damping: {
    category: 'Dynamics', basis: 'Linear SDOF conversions', confidence: 'Exact / light-damping noted',
    inputs: [
      { key: 'zeta', label: 'Damping ratio ζ', type: 'number', default: 0.03, min: 0.000001, max: 0.999, step: 0.001 },
      { key: 'fn', label: 'Natural frequency', unit: 'Hz', type: 'number', default: 100, min: 0.001 },
      { key: 'decay_db', label: 'Target decay', unit: 'dB amplitude', type: 'number', default: 60, min: 0.1 },
    ],
    theory: '<p>Q=1/(2ζ) is the conventional oscillator quality factor. η≈2ζ and half-power bandwidth are light-damping relations. Logarithmic decrement is exact for underdamped viscous decay.</p>',
    assumptions: ['Underdamped linear viscous SDOF.', 'η≈2ζ is a near-resonance light-damping equivalence.'],
    example: 'ζ=0.025 corresponds to Q=20 and η≈0.05.',
    compute(v) {
      const z = positive(v.zeta,'Damping ratio'), fn = positive(v.fn,'Natural frequency'), decayDb = positive(v.decay_db,'Decay target');
      if (z >= 1) throw new Error('This converter is limited to underdamped ζ < 1.');
      const Q = 1/(2*z), eta = 2*z, delta = 2*Math.PI*z/Math.sqrt(1-z*z), bw = 2*z*fn;
      const wd = rad(fn)*Math.sqrt(1-z*z);
      const cyclesPerE = 1/delta;
      const amplitudeRatio = 10**(-decayDb/20);
      const time = -Math.log(amplitudeRatio)/(z*rad(fn));
      const cycles = time*fn*Math.sqrt(1-z*z);
      return {
        summary: [stat('Quality factor Q',Q),stat('Loss factor η ≈',eta),stat('Log decrement δ',delta),stat('3 dB bandwidth',bw,'Hz'),stat(`Time to −${decayDb} dB`,time,'s'),stat('Damped cycles to target',cycles,'cycles')],
        interpretation: `The free-decay envelope loses a factor e every ${(cyclesPerE).toFixed(2)} damped cycles and reaches −${decayDb} dB in about ${cycles.toFixed(1)} cycles.`,
        warnings: z > 0.1 ? ['η≈2ζ and the simple half-power bandwidth formula become increasingly approximate as damping rises.'] : [],
      };
    },
  },

  miles: {
    category: 'Random & Shock', basis: 'Miles narrowband approximation', confidence: 'Screening estimate',
    inputs: [
      { key: 'fn', label: 'Natural frequency', unit: 'Hz', type: 'number', default: 100, min: 0.001 },
      { key: 'Q', label: 'Quality factor Q', type: 'number', default: 10, min: 0.01 },
      { key: 'psd', label: 'Input PSD at resonance', unit: 'g²/Hz', type: 'number', default: 0.04, min: 0 },
      { key: 'duration', label: 'Environment duration', unit: 's', type: 'number', default: 60, min: 0.001 },
    ],
    theory: '<p>Miles’ equation integrates the resonant response of a lightly damped SDOF under a locally flat, sufficiently broadband base-acceleration PSD.</p>',
    assumptions: ['Input PSD is approximately flat across the modal bandwidth.', 'Light damping and one isolated resonance.', 'Stationary Gaussian random input.'],
    example: 'At 100 Hz, Q=10, and 0.04 g²/Hz, the estimated acceleration is about 7.9 GRMS.',
    compute(v) {
      const fn = positive(v.fn,'Natural frequency'), Q = positive(v.Q,'Q'), G = Math.max(0,n(v.psd)), duration=positive(v.duration,'Duration');
      const armsG = Math.sqrt(Math.PI/2 * fn * Q * G);
      const arms = armsG*G0;
      const vrms = arms/rad(fn), xrms=arms/rad(fn)**2;
      const z = 1/(2*Q), bandwidth=fn/Q;
      const neff=Math.max(1,2*bandwidth*duration);
      const expectedPeak=armsG*Math.sqrt(2*Math.log(neff));
      const frequencies=logspace(Math.max(0.1,fn/10),fn*10,100),responses=frequencies.map(frequency=>Math.sqrt(Math.PI/2*frequency*Q*G));
      return {
        summary:[stat('Acceleration response',armsG,'GRMS'),stat('Velocity response',vrms,'m/s RMS'),stat('Displacement response',xrms,'m RMS'),stat('Damping ratio',z),stat('Modal bandwidth',bandwidth,'Hz'),stat('Screening expected peak',expectedPeak,'g')],
        interpretation:`The response is concentrated in a modal bandwidth of roughly ${bandwidth.toFixed(2)} Hz around ${fn} Hz.`,
        warnings:['The expected-peak estimate is a bandwidth-duration screening relation, not a tolerance limit.','Use numerical VRS integration when the PSD changes appreciably across the modal bandwidth.'],
        plots:[{title:'Miles response for locally flat input PSD',xLabel:'Natural frequency (Hz)',yLabel:'Acceleration response (g RMS)',xScale:'log',yScale:'log',traces:[trace('Miles response',frequencies,responses,{emphasis:true})]}]
      };
    },
  },

  grms: {
    category:'Random & Shock', basis:'Analytic piecewise power-law integration', confidence:'Exact for log-log interpolation',
    inputs:[
      {key:'psd_points',label:'PSD breakpoints',unit:'Hz, g²/Hz',type:'textarea',default:'20, 0.01\n80, 0.04\n350, 0.04\n2000, 0.006',help:'One frequency and PSD level per line.'},
      {key:'mass',label:'Driven component mass',unit:'kg',type:'number',default:10,min:0.001,help:'Used for the rigid-body inertial-force estimate.'}
    ],
    theory:'<p>Between breakpoints the PSD is modeled as G(f)=C fⁿ. Each segment is integrated analytically, including the logarithmic n=−1 case.</p>',
    assumptions:['The input is a one-sided acceleration PSD in g²/Hz.','The PSD represents a stationary random process over the analysis duration.','Breakpoints are joined by power-law segments on log-log axes.','Displacement uses ideal frequency-domain double integration; drift and energy outside the entered frequency range are excluded.','The force estimate assumes the full entered mass accelerates rigidly and in phase with the PSD input.'],
    example:'A flat 0.04 g²/Hz segment from 80 to 350 Hz contributes √(0.04×270)=3.29 GRMS.',
    compute(v){
      const points=parsePairs(v.psd_points,'PSD');
      const massKg=positive(v.mass,'Driven component mass');
      const {total,segments}=integratePowerLaw(points);
      const grms=Math.sqrt(total);
      const displacementPoints=points.map(([f,g])=>[f,g*G0**2/(2*Math.PI*f)**4]);
      const {total:displacementMeanSquare}=integratePowerLaw(displacementPoints);
      const displacementRmsM=Math.sqrt(displacementMeanSquare);
      const displacementValue=1000*displacementRmsM;
      const displacementUnit='mm RMS';
      const forceRmsN=massKg*G0*grms;
      const forceValue=forceRmsN;
      const forceUnit='N RMS';
      const dominantSegment=segments.reduce((largest,segment)=>segment[6]>largest[6]?segment:largest);
      const maxShare=100*dominantSegment[6]/total;
      const frequencyRange=`${points[0][0]}–${points.at(-1)[0]}`;
      const dominantRange=`${dominantSegment[0]}–${dominantSegment[1]}`;
      const dense=[];
      for(let i=0;i<points.length-1;i++){
        const fs=logspace(points[i][0],points[i+1][0],40);
        for(const f of fs) dense.push([f,interpLogLog(points,f)]);
      }
      return{
        summary:[stat('Integrated acceleration',grms,'g RMS'),stat('RMS displacement',displacementValue,displacementUnit),stat('Rigid-body force estimate',forceValue,forceUnit),stat('Frequency range',frequencyRange,'Hz'),stat('Dominant PSD segment',dominantRange,'Hz'),stat('PSD area from dominant segment',maxShare,'%')],
        interpretation:{
          summary:`Integrating the PSD over ${frequencyRange} Hz produces the acceleration, displacement, and rigid-body inertial-force results shown above. The ${dominantRange} Hz segment supplies ${maxShare.toFixed(1)}% of the integrated acceleration PSD area.`,
          physicalMeaning:`The integrated g RMS result is the standard deviation of the acceleration represented by this PSD over ${frequencyRange} Hz. It is the square root of the area under the acceleration PSD—not a peak acceleration or the largest value expected in a test. The RMS displacement is the motion implied by double-integrating that spectrum, so it is especially sensitive to low-frequency content. The force result is only the rigid-body inertial force estimate m·a for the entered mass; actual drive force depends on fixture dynamics, component flexibility, resonances, and control strategy.`
        },
        plots:[{title:'Input PSD',xLabel:'Frequency (Hz)',yLabel:'PSD (g²/Hz)',xScale:'log',yScale:'log',traces:[trace('PSD',dense.map(r=>r[0]),dense.map(r=>r[1]))]}],
        tables:[{title:'Segment integration',columns:['f1 (Hz)','f2 (Hz)','G1','G2','Exponent n','dB/oct','Area (g²)','Segment GRMS'],rows:segments}],
        csv:{filename:'integrated-psd.csv',columns:['frequency_hz','psd_g2_per_hz'],rows:dense}
      };
    }
  },

  vrs: {
    category:'Random & Shock', basis:'Numerical SDOF PSD integration', confidence:'Numerical linear response',
    inputs:[
      {key:'psd_points',label:'Base acceleration PSD',unit:'Hz, g²/Hz',type:'textarea',default:'20, 0.01\n80, 0.04\n350, 0.04\n2000, 0.006'},
      {key:'Q',label:'Quality factor Q',type:'number',default:10,min:0.05},
      {key:'response_min',label:'Minimum natural frequency',unit:'Hz',type:'number',default:20,min:0.01},
      {key:'response_max',label:'Maximum natural frequency',unit:'Hz',type:'number',default:2000,min:0.02},
      {key:'points',label:'Response points',type:'number',default:80,min:20,max:200,step:1}
    ],
    theory:'<p>The absolute-acceleration transfer function for base excitation is integrated against the input PSD for each oscillator natural frequency.</p>',
    assumptions:['Linear SDOF bank.','One-sided base-acceleration PSD.','Log-log interpolation of the input PSD and zero energy outside the entered frequency range.'],
    example:'The VRS rises where a resonance samples the high plateau and falls when the natural frequency moves beyond the input bandwidth.',
    compute(v){
      const pts=parsePairs(v.psd_points,'PSD');
      const Q=positive(v.Q,'Q'), z=1/(2*Q), fmin=positive(v.response_min,'Minimum frequency'), fmax=positive(v.response_max,'Maximum frequency');
      if(fmax<=fmin) throw new Error('Maximum natural frequency must exceed minimum.');
      const count=clamp(Math.round(n(v.points,80)),20,200);
      const inputF=logspace(pts[0][0],pts.at(-1)[0],700);
      const inputG=inputF.map(f=>interpLogLog(pts,f));
      const nat=logspace(fmin,fmax,count);
      const resp=[];
      for(const fn of nat){
        const out=inputF.map((f,i)=>{
          const r=f/fn;
          const h2=(1+(2*z*r)**2)/((1-r*r)**2+(2*z*r)**2);
          return h2*inputG[i];
        });
        resp.push(Math.sqrt(trapz(inputF,out)));
      }
      const maxVal=Math.max(...resp), idx=resp.indexOf(maxVal);
      return{
        summary:[stat('Peak VRS',maxVal,'GRMS'),stat('Peak natural frequency',nat[idx],'Hz'),stat('Damping ratio',z),stat('Q',Q)],
        interpretation:`The largest calculated RMS response occurs for an oscillator near ${nat[idx].toFixed(1)} Hz. Compare the input PSD shape with the modal bandwidth before using a narrowband approximation.`,
        plots:[{title:'Vibration response spectrum',xLabel:'Natural frequency (Hz)',yLabel:'Absolute acceleration (GRMS)',xScale:'log',yScale:'log',traces:[trace('VRS',nat,resp)]},{title:'Input PSD',xLabel:'Frequency (Hz)',yLabel:'PSD (g²/Hz)',xScale:'log',yScale:'log',traces:[trace('Input',inputF,inputG)]}],
        tables:[{title:'VRS values',columns:['Natural frequency (Hz)','Response (GRMS)'],rows:nat.map((f,i)=>[f,resp[i]])}],
        csv:{filename:'vrs.csv',columns:['natural_frequency_hz','response_grms'],rows:nat.map((f,i)=>[f,resp[i]])}
      };
    }
  },

  'shock-pulse': {
    category:'Random & Shock', basis:'Ideal classical pulse', confidence:'Exact generated waveform',
    inputs:[
      {key:'kind',label:'Pulse shape',type:'select',default:'half-sine',options:[{value:'half-sine',label:'Half sine'},{value:'haversine',label:'Haversine'},{value:'rectangular',label:'Rectangular'},{value:'terminal-sawtooth',label:'Terminal sawtooth'}]},
      {key:'amplitude',label:'Peak acceleration',unit:'g',type:'number',default:50,min:0},
      {key:'duration_ms',label:'Pulse duration',unit:'ms',type:'number',default:10,min:0.001},
      {key:'samples',label:'Plot samples',type:'number',default:501,min:101,max:5001,step:100}
    ],
    theory:'<p>Pulse impulse is the area under acceleration versus time. Velocity change equals the acceleration impulse after converting g to m/s².</p>',
    assumptions:['Ideal mathematical pulse with no pre- or post-event ringing.','Acceleration is the commanded base motion.'],
    example:'A 50 g, 10 ms half-sine produces Δv = 2AT/π ≈ 3.12 m/s.',
    compute(v){
      const kind=v.kind,A=positive(v.amplitude,'Amplitude'),T=positive(v.duration_ms,'Duration')/1000,count=clamp(Math.round(n(v.samples,501)),101,5001);
      const t=linspace(-0.2*T,1.5*T,count), a=t.map(tt=>pulseValue(kind,tt,T,A));
      const impulseG=pulseImpulse(kind,T,A),dv=impulseG*G0;
      const shapeFactor=impulseG/(A*T);
      return{
        summary:[stat('Acceleration impulse',impulseG,'g·s'),stat('Velocity change',dv,'m/s'),stat('Shape factor',shapeFactor),stat('Characteristic frequency',1/T,'Hz')],
        interpretation:`The ${kind.replaceAll('-',' ')} pulse has an area equal to ${(shapeFactor).toFixed(4)} times peak acceleration × duration.`,
        plots:[{title:'Generated acceleration pulse',xLabel:'Time (s)',yLabel:'Acceleration (g)',traces:[trace(kind,t,a)]}],
        csv:{filename:`${kind}-pulse.csv`,columns:['time_s','acceleration_g'],rows:t.map((tt,i)=>[tt,a[i]])}
      };
    }
  },

  srs: {
    category:'Random & Shock', basis:'Numerical time integration of SDOF bank', confidence:'Numerical screening implementation',
    inputs:[
      {key:'kind',label:'Pulse shape',type:'select',default:'half-sine',options:[{value:'half-sine',label:'Half sine'},{value:'haversine',label:'Haversine'},{value:'rectangular',label:'Rectangular'},{value:'terminal-sawtooth',label:'Terminal sawtooth'}]},
      {key:'amplitude',label:'Peak base acceleration',unit:'g',type:'number',default:100,min:0},
      {key:'duration_ms',label:'Pulse duration',unit:'ms',type:'number',default:2,min:0.001},
      {key:'Q',label:'Quality factor Q',type:'number',default:10,min:0.1},
      {key:'fmin',label:'Minimum SRS frequency',unit:'Hz',type:'number',default:10,min:0.1},
      {key:'fmax',label:'Maximum SRS frequency',unit:'Hz',type:'number',default:5000,min:1},
      {key:'points',label:'SRS points',type:'number',default:70,min:20,max:120,step:1}
    ],
    theory:'<p>Relative displacement is integrated from ẍ+2ζωₙẋ+ωₙ²x=−ÿ. Absolute response acceleration is −2ζωₙẋ−ωₙ²x.</p>',
    assumptions:['Linear SDOF bank and ideal classical base pulse.','Time step is selected automatically for the entered pulse and maximum frequency.','This implementation is intended for education and screening; qualified shock software should be used for acceptance data.'],
    example:'Below the reciprocal pulse duration the oscillators respond to velocity change; far above it the absolute-acceleration SRS approaches the pulse peak.',
    compute(v){
      const kind=v.kind,A=positive(v.amplitude,'Amplitude'),T=positive(v.duration_ms,'Duration')/1000,Q=positive(v.Q,'Q'),z=1/(2*Q);
      const fmin=positive(v.fmin,'Minimum frequency'),fmax=positive(v.fmax,'Maximum frequency');
      if(fmax<=fmin) throw new Error('Maximum SRS frequency must exceed minimum.');
      const count=clamp(Math.round(n(v.points,70)),20,120), fns=logspace(fmin,fmax,count);
      const dt=Math.min(T/220,1/(55*fmax));
      const total=Math.max(18*T,5/fmin);
      const steps=Math.min(250000,Math.ceil(total/dt));
      const actualDt=total/steps;
      const pos=[],neg=[],maximax=[];
      const abase=(t)=>pulseValue(kind,t,T,A)*G0;
      for(const fn of fns){
        const w=rad(fn); let x=0,xd=0,pmax=-Infinity,nmin=Infinity;
        const deriv=(tt,xx,vv)=>[vv,-2*z*w*vv-w*w*xx-abase(tt)];
        for(let i=0;i<=steps;i++){
          const t=i*actualDt;
          const aa=(-2*z*w*xd-w*w*x)/G0;
          if(aa>pmax)pmax=aa;if(aa<nmin)nmin=aa;
          if(i===steps)break;
          const [k1x,k1v]=deriv(t,x,xd);
          const [k2x,k2v]=deriv(t+actualDt/2,x+k1x*actualDt/2,xd+k1v*actualDt/2);
          const [k3x,k3v]=deriv(t+actualDt/2,x+k2x*actualDt/2,xd+k2v*actualDt/2);
          const [k4x,k4v]=deriv(t+actualDt,x+k3x*actualDt,xd+k3v*actualDt);
          x+=actualDt*(k1x+2*k2x+2*k3x+k4x)/6;
          xd+=actualDt*(k1v+2*k2v+2*k3v+k4v)/6;
        }
        pos.push(Math.max(0,pmax));neg.push(Math.min(0,nmin));maximax.push(Math.max(Math.abs(pmax),Math.abs(nmin)));
      }
      const peak=Math.max(...maximax),idx=maximax.indexOf(peak);
      return{
        summary:[stat('Peak maximax SRS',peak,'g'),stat('Frequency at peak',fns[idx],'Hz'),stat('Damping ratio',z),stat('Time step',actualDt,'s'),stat('Integration steps',steps)],
        interpretation:`The oscillator bank peaks near ${fns[idx].toFixed(1)} Hz for this ideal ${kind.replaceAll('-',' ')} pulse. The reciprocal pulse duration is ${(1/T).toFixed(1)} Hz.`,
        warnings:steps>=250000?['The automatic time grid reached its safety cap; reduce frequency range or use a longer pulse for a more refined screening calculation.']:[],
        plots:[{title:'Absolute acceleration SRS',xLabel:'Natural frequency (Hz)',yLabel:'Response acceleration (g)',xScale:'log',yScale:'log',traces:[trace('Positive',fns,pos),trace('Negative magnitude',fns,neg.map(Math.abs)),trace('Maximax',fns,maximax,{emphasis:true})]}],
        tables:[{title:'SRS values',columns:['Frequency (Hz)','Positive (g)','Negative (g)','Maximax (g)'],rows:fns.map((f,i)=>[f,pos[i],neg[i],maximax[i]])}],
        csv:{filename:'srs.csv',columns:['frequency_hz','positive_g','negative_g','maximax_g'],rows:fns.map((f,i)=>[f,pos[i],neg[i],maximax[i]])}
      };
    }
  },

  beam: {
    category:'Structures', basis:'Euler–Bernoulli uniform beam', confidence:'Exact ideal beam formulas',
    inputs:[
      {key:'boundary',label:'Boundary / load case',type:'select',default:'simply-supported',options:[{value:'simply-supported',label:'Simply supported, center point load'},{value:'cantilever',label:'Cantilever, tip point load'},{value:'fixed-fixed',label:'Fixed–fixed, center point load'}]},
      {key:'length',label:'Beam length',unit:'m',type:'number',default:1,min:0.001},
      {key:'width',label:'Rectangular width',unit:'m',type:'number',default:0.05,min:0.0001},
      {key:'height',label:'Rectangular height',unit:'m',type:'number',default:0.01,min:0.0001},
      {key:'E_gpa',label:'Young’s modulus',unit:'GPa',type:'number',default:68.9,min:0.001},
      {key:'rho',label:'Density',unit:'kg/m³',type:'number',default:2700,min:0.001},
      {key:'load',label:'Point load',unit:'N',type:'number',default:1000}
    ],
    theory:'<p>Static response and modal frequencies use a prismatic Euler–Bernoulli beam with small deflection. The first four β values and their exact normalized bending shapes are selected by boundary condition.</p>',
    assumptions:['Uniform rectangular section.','Small deflection and linear elastic material.','Shear deformation and rotary inertia neglected.'],
    example:'A simply supported beam under a center point load has δ<sub>max</sub>=PL³/(48EI).',
    compute(v){
      const L=positive(v.length,'Length'),b=positive(v.width,'Width'),h=positive(v.height,'Height'),E=positive(v.E_gpa,'Modulus')*1e9,rho=positive(v.rho,'Density'),P=n(v.load);
      const A=b*h,I=b*h**3/12,mass=rho*A*L;
      let defl,Mmax,betas,label;
      if(v.boundary==='cantilever') {defl=P*L**3/(3*E*I);Mmax=P*L;betas=[1.875104,4.694091,7.854757,10.995541];label='Cantilever';}
      else if(v.boundary==='fixed-fixed'){defl=P*L**3/(192*E*I);Mmax=Math.abs(P*L/8);betas=[4.730041,7.853205,10.995608,14.137165];label='Fixed–fixed';}
      else {defl=P*L**3/(48*E*I);Mmax=Math.abs(P*L/4);betas=[Math.PI,2*Math.PI,3*Math.PI,4*Math.PI];label='Simply supported';}
      const stress=Mmax*(h/2)/I;
      const freqs=betas.map(beta=>beta**2/(2*Math.PI*L**2)*Math.sqrt(E*I/(rho*A)));
      const positions=linspace(0,L,121),normalizedPositions=positions.map(position=>position/L);
      const modeShapes=betas.map((beta,index)=>{
        let values;
        if(v.boundary==='simply-supported')values=normalizedPositions.map(position=>Math.sin((index+1)*Math.PI*position));
        else{
          const sigma=v.boundary==='cantilever'?(Math.cosh(beta)+Math.cos(beta))/(Math.sinh(beta)+Math.sin(beta)):(Math.cosh(beta)-Math.cos(beta))/(Math.sinh(beta)-Math.sin(beta));
          values=normalizedPositions.map(position=>Math.cosh(beta*position)-Math.cos(beta*position)-sigma*(Math.sinh(beta*position)-Math.sin(beta*position)));
        }
        values[0]=0;if(v.boundary!=='cantilever')values[values.length-1]=0;
        return normalizeSeries(values);
      });
      return{
        summary:[stat('Area',A,'m²'),stat('Second moment I',I,'m⁴'),stat('Beam mass',mass,'kg'),stat('Maximum deflection',defl,'m'),stat('Maximum bending stress',stress/1e6,'MPa'),stat('First natural frequency',freqs[0],'Hz')],
        interpretation:{summary:`The ${label.toLowerCase()} idealization predicts a first bending mode at ${freqs[0].toFixed(2)} Hz. Boundary flexibility usually lowers this value.`,physicalMeaning:'Each displayed curve is a unit-normalized transverse bending shape; its sign is arbitrary, while its nodes and curvature show where motion reverses and where bending strain concentrates. Higher modes add internal nodes and are more sensitive to local attachments and non-ideal boundaries.'},
        warnings:['Check slenderness, local section behavior, stress concentrations, and actual joint stiffness before design use.'],
        tables:[{title:'Ideal bending modes',columns:['Mode','β','Frequency (Hz)'],rows:freqs.map((f,i)=>[i+1,betas[i],f])}],
        plots:[{title:`${label} beam · first four normalized mode shapes`,xLabel:'Position along beam (m)',yLabel:'Normalized transverse displacement',animation:{type:'harmonic'},traces:modeShapes.map((shape,index)=>trace(`Mode ${index+1} · ${freqs[index].toFixed(1)} Hz`,positions,shape,{emphasis:index===0}))},{title:'First four modal frequencies',xLabel:'Mode',yLabel:'Frequency (Hz)',traces:[trace('Frequency',[1,2,3,4],freqs,{emphasis:true})]}],
        presentation:{primaryEvidence:{type:'plot',index:0},primaryValueCount:6,animation:{type:'harmonic',defaultRateHz:.5,note:'All four beam shapes use one slowed visual phase so their nodes remain comparable; the animation does not reproduce their different natural frequencies or physical amplitudes.'}}
      };
    }
  },

  'plate-modes': {
    category:'Structures', basis:'Kirchhoff thin simply supported plate', confidence:'Exact ideal boundary formula',
    inputs:[
      ...commonMaterialInputs,
      {key:'thickness_mm',label:'Plate thickness',unit:'mm',type:'number',default:3,min:0.001},
      {key:'a',label:'Plate dimension a',unit:'m',type:'number',default:1,min:0.001},
      {key:'b',label:'Plate dimension b',unit:'m',type:'number',default:0.6,min:0.001},
      {key:'max_order',label:'Maximum m,n order',type:'number',default:6,min:1,max:20,step:1}
    ],
    syncPreset:syncMaterialDefaults,
    theory:'<p>For a simply supported isotropic plate, each mode is the exact product shape sin(mπx/a)sin(nπy/b), and its frequency depends on (m/a)²+(n/b)².</p>',
    assumptions:['Thin, flat, homogeneous isotropic plate.','All four edges simply supported.','No added mass, stiffeners, prestress, or fluid loading.'],
    example:'A nearly square plate produces closely spaced (1,2) and (2,1) modes.',
    compute(v){
      const {E,rho,nu}=materialFrom(v),h=positive(v.thickness_mm,'Thickness')/1000,a=positive(v.a,'a'),b=positive(v.b,'b'),N=clamp(Math.round(n(v.max_order,6)),1,20),D=plateD(E,h,nu);
      const modes=[];
      for(let m=1;m<=N;m++)for(let nn=1;nn<=N;nn++){
        const f=Math.PI/2*Math.sqrt(D/(rho*h))*((m/a)**2+(nn/b)**2);
        modes.push([m,nn,f]);
      }
      modes.sort((x,y)=>x[2]-y[2]);
      const first=modes.slice(0,Math.min(30,modes.length));
      const shapeModes=first.slice(0,4),xNormalized=linspace(0,1,25),yNormalized=linspace(0,1,25),surfaceX=linspace(0,1,21),surfaceY=linspace(0,1,21),axisLabels=values=>values.map(value=>value.toFixed(2));
      const heatmaps=shapeModes.map(([m,nn,frequency])=>({title:`Plate mode (${m},${nn}) · ${frequency.toFixed(1)} Hz`,matrix:normalizeMatrix(yNormalized.map(y=>xNormalized.map(x=>Math.sin(m*Math.PI*x)*Math.sin(nn*Math.PI*y)))),min:-1,max:1,diverging:true,animation:{type:'harmonic'},aspectRatio:a/b,xValues:xNormalized,yValues:yNormalized,xLabels:axisLabels(xNormalized),yLabels:axisLabels(yNormalized),xLabel:'Normalized position x/a',yLabel:'Normalized position y/b'}));
      const surfaces3d=shapeModes.map(([m,nn,frequency])=>({title:`3D plate mode (${m},${nn}) · ${frequency.toFixed(1)} Hz`,geometry:'plate',matrix:normalizeMatrix(surfaceY.map(y=>surfaceX.map(x=>Math.sin(m*Math.PI*x)*Math.sin(nn*Math.PI*y)))),animation:{type:'harmonic'},aspectRatio:a/b,deformationScale:.34,xValues:surfaceX,yValues:surfaceY,zLabel:'transverse motion'}));
      const warnings=[];
      for(let i=1;i<Math.min(12,first.length);i++) if((first[i][2]-first[i-1][2])/first[i][2]<0.01){warnings.push(`Modes (${first[i-1][0]},${first[i-1][1]}) and (${first[i][0]},${first[i][1]}) are within 1%; small asymmetry may split or mix them.`);break;}
      return{
        summary:[stat('Bending stiffness D',D,'N·m'),stat('Surface mass',rho*h,'kg/m²'),stat('Fundamental mode',first[0][2],'Hz'),stat('Modes calculated',modes.length)],
        interpretation:{summary:`The lowest ideal mode is (${first[0][0]},${first[0][1]}). The result is especially sensitive to boundary restraint and thickness because D scales with h³.`,physicalMeaning:'The animated 3D surfaces show exaggerated, normalized transverse deformation; their signed colors distinguish regions moving in opposite phase. Nodal lines remain stationary while the surface passes through the undeformed plane. The m and n indices count half-waves along dimensions a and b, and closely spaced modes can mix when small asymmetries, attachments, or boundary flexibility are introduced.'},
        warnings,
        tables:[{title:'Lowest plate modes',columns:['m','n','Frequency (Hz)'],rows:first}],
        plots:[{title:'Ordered plate modes',xLabel:'Ordered mode index',yLabel:'Frequency (Hz)',traces:[trace('Modes',first.map((_,i)=>i+1),first.map(r=>r[2]))]}],
        surfaces3d,
        heatmaps,
        presentation:{primaryEvidence:{type:'surface3d',index:0},primaryEvidenceCount:4,primaryValueCount:4,animation:{type:'harmonic',defaultRateHz:.5,note:'The four 3D plate shapes share a slowed visual phase. Deformation is exaggerated and normalized so nodes and opposite-phase regions remain easy to compare; this is not physical amplitude or real-time frequency.'}},
        csv:{filename:'plate-modes.csv',columns:['m','n','frequency_hz'],rows:modes}
      };
    }
  },

  'bending-wave': {
    category:'Structures', basis:'Isotropic extensional, shear, and Kirchhoff thin-plate wave relations', confidence:'Exact within the stated ideal wave models',
    inputs:[
      ...commonMaterialInputs,
      {key:'thickness_mm',label:'Plate thickness',unit:'mm',type:'number',default:3,min:0.001},
      {key:'sound_speed',label:'Surrounding-fluid sound speed',unit:'m/s',type:'number',default:AIR_C,min:1,help:'Used to locate plate coincidence (critical frequency).'},
      {key:'fmin',label:'Minimum frequency',unit:'Hz',type:'number',default:10,min:0.001},
      {key:'fmax',label:'Maximum frequency',unit:'Hz',type:'number',default:5000,min:0.002},
      {key:'distance',label:'Propagation distance',unit:'m',type:'number',default:1,min:0}
    ],
    syncPreset:syncMaterialDefaults,
    theory:'<p>The longitudinal extensional screen uses c<sub>L</sub>=√(E/ρ). The isotropic shear speed is c<sub>S</sub>=√(G/ρ), with G=E/[2(1+ν)]. Kirchhoff plate bending has k<sub>b</sub>=(ρhω²/D)<sup>1/4</sup>, phase speed c<sub>b</sub>=ω/k<sub>b</sub>, and group speed c<sub>g</sub>=2c<sub>b</sub>. Acoustic coincidence occurs where c<sub>b</sub>=c₀, giving f<sub>c</sub>=c₀²√(ρh/D)/(2π).</p>',
    assumptions:['Homogeneous isotropic material; the longitudinal value is the one-dimensional extensional speed √(E/ρ).','Thin Kirchhoff plate with bending wavelengths long relative to thickness.','Critical frequency represents an infinite flat plate in the entered surrounding fluid.','No curvature, stiffeners, joints, reflections, orthotropy, or strong fluid loading.'],
    example:'Longitudinal and shear speeds remain nearly constant in this idealization, while bending-wave speed rises with √f and reaches the surrounding-fluid sound speed at the thickness-dependent critical frequency.',
    references:[
      {title:'Graff — Wave Motion in Elastic Solids',note:'Longitudinal, shear, flexural, and guided elastic-wave definitions and propagation behavior.'},
      {title:'Cremer, Heckl & Petersson — Structure-Borne Sound',note:'Structural-wave propagation, dispersion, mobility, junction behavior, and coincidence.'},
      {title:'Fahy & Gardonio — Sound and Structural Vibration',note:'Bending waves, phase and group velocity, acoustic coincidence, radiation, and fluid loading.'},
      {title:'Leissa — Vibration of Plates (NASA SP-160)',note:'Classical thin-plate theory, assumptions, modal behavior, and applicability limits.'}
    ],
    compute(v){
      const {E,rho,nu}=materialFrom(v),h=positive(v.thickness_mm,'Thickness')/1000,c0=positive(v.sound_speed,'Sound speed'),fmin=positive(v.fmin,'Minimum frequency'),fmax=positive(v.fmax,'Maximum frequency'),dist=Math.max(0,n(v.distance));
      if(fmax<=fmin) throw new Error('Maximum frequency must exceed minimum.');
      const D=plateD(E,h,nu),G=E/(2*(1+nu)),cLongitudinal=Math.sqrt(E/rho),cShear=Math.sqrt(G/rho),criticalFrequency=c0*c0/(2*Math.PI)*Math.sqrt(rho*h/D),fs=logspace(fmin,fmax,160),k=[],lambda=[],cp=[],cg=[],delay=[];
      for(const f of fs){const w=rad(f),kk=(rho*h*w*w/D)**0.25;k.push(kk);lambda.push(2*Math.PI/kk);cp.push(w/kk);cg.push(2*w/kk);delay.push(dist/(2*w/kk));}
      const mid=Math.floor(fs.length/2),reportFrequency=fs[mid],criticalLocation=criticalFrequency<fmin?'below':criticalFrequency>fmax?'above':'inside',speedMin=Math.min(cp[0],c0,cShear,cLongitudinal)*0.75,speedMax=Math.max(cg.at(-1),c0,cShear,cLongitudinal)*1.25,constant=value=>fs.map(()=>value),selectedIndices=fs.map((_,index)=>index).filter(index=>index%16===0||index===fs.length-1),mpsToFps=3.280839895;
      const physicalMeaning='Longitudinal and shear waves move through the material by extensional and distortional deformation and are treated as nondispersive here. Plate bending motion is much slower at low frequency and becomes faster as frequency rises. At the critical frequency, the bending phase speed equals the surrounding-fluid sound speed, allowing classical infinite-plate acoustic coincidence; finite edges can still radiate below this frequency.';
      return{
        summary:[stat('Longitudinal extensional speed',cLongitudinal,'m/s'),stat('Shear wave speed',cShear,'m/s'),stat(`Bending phase speed at ${reportFrequency.toFixed(0)} Hz`,cp[mid],'m/s'),stat(`Bending group speed at ${reportFrequency.toFixed(0)} Hz`,cg[mid],'m/s'),stat('Plate critical frequency',criticalFrequency,'Hz'),stat('Bending stiffness D',D,'N·m')],
        interpretation:{summary:`The ideal longitudinal and shear speeds are ${cLongitudinal.toFixed(0)} and ${cShear.toFixed(0)} m/s. Bending phase speed is dispersive and reaches the entered fluid sound speed of ${c0.toFixed(1)} m/s at the ${criticalFrequency.toFixed(1)} Hz plate critical frequency, which lies ${criticalLocation} the requested ${fmin}–${fmax} Hz band.`,physicalMeaning},
        interpretationByUnit:{English:{summary:`The ideal longitudinal and shear speeds are ${(cLongitudinal*mpsToFps).toFixed(0)} and ${(cShear*mpsToFps).toFixed(0)} ft/s. Bending phase speed is dispersive and reaches the entered fluid sound speed of ${(c0*mpsToFps).toFixed(1)} ft/s at the ${criticalFrequency.toFixed(1)} Hz plate critical frequency, which lies ${criticalLocation} the requested ${fmin}–${fmax} Hz band.`,physicalMeaning}},
        warnings:['Use a shell, Mindlin plate, or guided-wave model when curvature, ribs, joints, short wavelengths, or thickness effects are important.'],
        plots:[{title:'Structural wave speeds and acoustic coincidence',xLabel:'Frequency (Hz)',yLabel:'Wave speed (m/s)',xScale:'log',yScale:'log',traces:[trace('Bending phase',fs,cp,{emphasis:true}),trace('Bending group',fs,cg),trace(`Longitudinal · ${(cLongitudinal/1000).toFixed(2)} km/s`,fs,constant(cLongitudinal),{emphasis:true,displayNameByUnit:{English:`Longitudinal · ${(cLongitudinal*mpsToFps/1000).toFixed(2)} kft/s`}}),trace(`Shear · ${(cShear/1000).toFixed(2)} km/s`,fs,constant(cShear),{emphasis:true,displayNameByUnit:{English:`Shear · ${(cShear*mpsToFps/1000).toFixed(2)} kft/s`}}),trace(`Fluid · ${c0.toFixed(0)} m/s`,fs,constant(c0),{dash:true,displayNameByUnit:{English:`Fluid · ${(c0*mpsToFps).toFixed(0)} ft/s`}}),trace(`Critical f = ${criticalFrequency.toFixed(1)} Hz`,[criticalFrequency,criticalFrequency],[speedMin,speedMax],{dash:true})]},{title:'Bending wavelength',xLabel:'Frequency (Hz)',yLabel:'Wavelength (m)',xScale:'log',yScale:'log',traces:[trace('Bending wavelength',fs,lambda,{emphasis:true})]},{title:`Group transit delay over ${dist} m`,xLabel:'Frequency (Hz)',yLabel:'Delay (s)',xScale:'log',yScale:dist>0?'log':'linear',traces:[trace('Bending group delay',fs,delay,{emphasis:true})]}],
        tables:[{title:'Selected wave values',columns:['Frequency (Hz)','Bending k (rad/m)','Bending wavelength (m)','Bending phase speed (m/s)','Bending group speed (m/s)','Longitudinal speed (m/s)','Shear speed (m/s)','Fluid sound speed (m/s)','Group delay (s)'],rows:selectedIndices.map(i=>[fs[i],k[i],lambda[i],cp[i],cg[i],cLongitudinal,cShear,c0,delay[i]])}],
        csv:{filename:'structural-wave-speeds.csv',columns:['frequency_hz','bending_wavenumber_rad_per_m','bending_wavelength_m','bending_phase_speed_mps','bending_group_speed_mps','longitudinal_extensional_speed_mps','shear_speed_mps','fluid_sound_speed_mps','group_delay_s'],rows:fs.map((f,i)=>[f,k[i],lambda[i],cp[i],cg[i],cLongitudinal,cShear,c0,delay[i]])}
      };
    }
  },

  'ring-frequency': {
    category:'Structural Acoustics', basis:'Thin isotropic cylindrical shell scale', confidence:'Screening formula',
    inputs:[
      ...commonMaterialInputs,
      {key:'diameter_m',label:'Cylinder diameter',unit:'m',type:'number',default:0.4064,min:0.001},
      {key:'thickness_mm',label:'Wall thickness',unit:'mm',type:'number',default:9.525,min:0.001},
      {key:'length_m',label:'Cylinder length',unit:'m',type:'number',default:1,min:0.001},
      {key:'axial_order',label:'Axial half-waves m',type:'number',default:1,min:1,max:8,step:1},
      {key:'circumferential_start',label:'Starting circumferential order n',type:'number',default:2,min:0,max:12,step:1,help:'Displays this order and the next three circumferential shapes.'}
    ],
    syncPreset:syncMaterialDefaults,
    theory:'<p>The ring-frequency scale is f<sub>r</sub>=[1/(2πR)]√[E/(ρ(1−ν²))]. Thickness does not enter this thin-shell scale directly but controls bending stiffness and local modes. The displayed shape basis uses w(θ,z)=cos(nθ)sin(mπz/L).</p>',
    assumptions:['Thin, isotropic, uniform circular cylinder.','Displayed mode-shape maps use a simply supported axial sinusoid and circumferential harmonics.','No stiffeners, cutouts, prestress, fluid loading, or detailed end constraints.'],
    example:'For a 16 inch aluminum cylinder, the ring-frequency scale is several kilohertz and differs strongly from the plate coincidence frequency.',
    compute(v){
      const {E,rho,nu}=materialFrom(v),DIA=positive(v.diameter_m,'Diameter'),h=positive(v.thickness_mm,'Thickness')/1000,L=positive(v.length_m,'Length'),R=DIA/2,mOrder=clamp(Math.round(n(v.axial_order,1)),1,8),nStart=clamp(Math.round(n(v.circumferential_start,2)),0,12);
      const cRing=Math.sqrt(E/(rho*(1-nu*nu))),fr=cRing/(2*Math.PI*R),circ=Math.PI*DIA,surfaceMass=rho*h,slender=L/DIA;
      const Dp=plateD(E,h,nu),fc=AIR_C**2/(2*Math.PI)*Math.sqrt(rho*h/Dp);
      const theta=linspace(0,2*Math.PI,49),thetaDegrees=theta.map(value=>deg(value)),zNormalized=linspace(0,1,25),orders=Array.from({length:4},(_,index)=>nStart+index),labelEvery=(values,suffix='')=>values.map(value=>`${value.toFixed(value>=10?0:2)}${suffix}`);
      const heatmaps=orders.map(order=>({title:`Cylinder shape basis · m=${mOrder}, n=${order}`,matrix:normalizeMatrix(zNormalized.map(z=>theta.map(angle=>Math.sin(mOrder*Math.PI*z)*Math.cos(order*angle)))),min:-1,max:1,diverging:true,animation:{type:'harmonic'},aspectRatio:Math.min(2.4,Math.max(.8,circ/L)),xValues:thetaDegrees,yValues:zNormalized,xLabels:labelEvery(thetaDegrees,'°'),yLabels:labelEvery(zNormalized),xLabel:'Circumferential angle θ',yLabel:'Normalized axial position z/L'}));
      const surfaces3d=orders.map(order=>{const surfaceTheta=linspace(0,2*Math.PI,Math.max(37,order*4+1)),surfaceZ=linspace(0,1,Math.max(17,mOrder*4+1));return{title:`3D cylinder basis · m=${mOrder}, n=${order}`,geometry:'cylinder',matrix:normalizeMatrix(surfaceZ.map(z=>surfaceTheta.map(angle=>Math.sin(mOrder*Math.PI*z)*Math.cos(order*angle)))),animation:{type:'harmonic'},lengthToDiameter:slender,deformationScale:.18,xValues:surfaceTheta.map(value=>deg(value)),yValues:surfaceZ,zLabel:'radial motion'};});
      return{
        summary:[stat('Ring frequency',fr,'Hz'),stat('Ring wave speed',cRing,'m/s'),stat('Circumference',circ,'m'),stat('Surface mass',surfaceMass,'kg/m²'),stat('Plate critical frequency',fc,'Hz'),stat('Length / diameter',slender)],
        interpretation:{summary:`The ring-frequency scale is ${fr.toFixed(1)} Hz. The flat-plate coincidence estimate is ${fc.toFixed(1)} Hz, demonstrating that the two frequencies describe different physics.`,physicalMeaning:`The animated 3D cylinders show exaggerated, normalized radial displacement for axial order m=${mOrder} and circumferential orders n=${nStart}–${nStart+3}. Order n counts waves around the circumference; shape and alternating colors identify inward and outward lobes. These are shell basis shapes, not frequency-tagged eigenmodes of the finite installed cylinder.`},
        warnings:[h/R>0.1?'The wall is not especially thin relative to radius; a thick-shell model may be more appropriate.':'Finite length, stiffeners, attachments, and boundary conditions create discrete shell modes around this scale.','Use a shell eigenvalue model to attach frequencies to these basis shapes for the actual end constraints and installed mass.'],
        plots:[{title:`Circumferential shapes at an axial antinode · m=${mOrder}`,xLabel:'Circumferential angle (deg)',yLabel:'Normalized radial displacement',traces:orders.map((order,index)=>trace(`n = ${order}`,thetaDegrees,theta.map(angle=>Math.cos(order*angle)),{emphasis:index===0}))}],
        surfaces3d,
        heatmaps,
        tables:[{title:'Displayed cylinder shape basis',columns:['Axial half-waves m','Circumferential order n','Circumferential lobes'],rows:orders.map(order=>[mOrder,order,order===0?1:2*order])}],
        presentation:{primaryEvidence:{type:'surface3d',index:0},primaryEvidenceCount:4,primaryValueCount:6,animation:{type:'harmonic',defaultRateHz:.5,note:'The 3D cylinder basis shapes use one slowed visual phase. Radial deformation is exaggerated and normalized to show inward and outward lobes, not actual finite-shell amplitude or frequency response.'}}
      };
    }
  },

  'critical-frequency': {
    category:'Structural Acoustics', basis:'Thin isotropic plate coincidence', confidence:'Exact within ideal plate model',
    inputs:[
      ...commonMaterialInputs,
      {key:'thickness_mm',label:'Plate thickness',unit:'mm',type:'number',default:3,min:0.001},
      {key:'sound_speed',label:'Fluid sound speed',unit:'m/s',type:'number',default:AIR_C,min:1},
      {key:'f_check',label:'Frequency to classify',unit:'Hz',type:'number',default:2000,min:0.001}
    ],
    syncPreset:syncMaterialDefaults,
    theory:'<p>Coincidence occurs when the flexural phase speed equals fluid sound speed. For a Kirchhoff plate, f<sub>c</sub>=c₀²/(2π)√(ρh/D).</p>',
    assumptions:['Infinite thin isotropic plate for the coincidence relation.','No curvature or orthotropy.','Fluid loading does not strongly modify structural dispersion.'],
    example:'Increasing an isotropic plate thickness lowers critical frequency because bending stiffness grows faster than surface mass.',
    compute(v){
      const {E,rho,nu}=materialFrom(v),h=positive(v.thickness_mm,'Thickness')/1000,c0=positive(v.sound_speed,'Sound speed'),f=positive(v.f_check,'Check frequency'),D=plateD(E,h,nu),fc=c0*c0/(2*Math.PI)*Math.sqrt(rho*h/D);
      const w=rad(f),k=(rho*h*w*w/D)**0.25,cp=w/k,ratio=f/fc;
      const regime=ratio<0.8?'Subcritical':ratio<1.25?'Near coincidence':'Supercritical';
      return{
        summary:[stat('Critical frequency',fc,'Hz'),stat('Bending stiffness D',D,'N·m'),stat('Flexural phase speed at check',cp,'m/s'),stat('f / fc',ratio),stat('Regime',regime,'',regime==='Near coincidence'?'warn':'')],
        interpretation:`At ${f} Hz the ideal plate is ${regime.toLowerCase()}; its flexural phase speed is ${cp.toFixed(1)} m/s versus ${c0.toFixed(1)} m/s in the fluid.`,
        warnings:['Finite-panel edges allow subcritical radiation, and orthotropic or curved structures require directional dispersion.']
      };
    }
  },

  'radiation-efficiency': {
    category:'Structural Acoustics', basis:'Finite-panel regime screening', confidence:'Screening—not a radiation solver',
    inputs:[
      ...commonMaterialInputs,
      {key:'thickness_mm',label:'Plate thickness',unit:'mm',type:'number',default:3,min:0.001},
      {key:'length',label:'Panel length',unit:'m',type:'number',default:1,min:0.001},
      {key:'width',label:'Panel width',unit:'m',type:'number',default:0.6,min:0.001},
      {key:'sound_speed',label:'Sound speed',unit:'m/s',type:'number',default:AIR_C,min:1},
      {key:'fmin',label:'Minimum frequency',unit:'Hz',type:'number',default:20,min:0.001},
      {key:'fmax',label:'Maximum frequency',unit:'Hz',type:'number',default:10000,min:0.002}
    ],
    syncPreset:syncMaterialDefaults,
    theory:'<p>This tool emphasizes regimes rather than claiming a universal closed-form finite-panel efficiency. It uses flexural and acoustic wavenumbers, panel dimensions, and a smoothed screening curve.</p>',
    assumptions:['Flat, baffled, isotropic panel.','The numeric efficiency curve is a qualitative screening approximation.', 'Use BEM, analytic modal radiation, or validated SEA radiation CLFs for design prediction.'],
    example:'Efficiency is generally low when structural waves are deeply subsonic, rises around finite-panel edge/radiation scales, and changes rapidly near coincidence.',
    compute(v){
      const {E,rho,nu}=materialFrom(v),h=positive(v.thickness_mm,'Thickness')/1000,L=positive(v.length,'Length'),W=positive(v.width,'Width'),c0=positive(v.sound_speed,'Sound speed'),fmin=positive(v.fmin,'Minimum frequency'),fmax=positive(v.fmax,'Maximum frequency');
      if(fmax<=fmin) throw new Error('Maximum frequency must exceed minimum.');
      const D=plateD(E,h,nu),fc=c0*c0/(2*Math.PI)*Math.sqrt(rho*h/D),aEq=Math.sqrt(L*W/Math.PI),fs=logspace(fmin,fmax,180),sigma=[],ratio=[];
      for(const f of fs){
        const w=rad(f),kb=(rho*h*w*w/D)**0.25,k0=w/c0,ka=k0*aEq;
        const r=k0/kb; ratio.push(r);
        let s;
        if(f<0.75*fc) s=Math.min(0.35,0.015*ka*ka + 0.08*Math.sqrt(f/fc));
        else if(f<=1.4*fc){const x=Math.log(f/fc);s=0.35+1.65*Math.exp(-sq(x/0.22));}
        else s=1+0.4*Math.exp(-(f/fc-1.4));
        sigma.push(Math.max(1e-4,s));
      }
      const atFc=sigma.reduce((best,s,i)=>Math.abs(fs[i]-fc)<Math.abs(fs[best]-fc)?i:best,0);
      return{
        summary:[stat('Critical frequency',fc,'Hz'),stat('Equivalent panel radius',aEq,'m'),stat('Screening σ near fc',sigma[atFc]),stat('Panel area',L*W,'m²')],
        interpretation:`The ideal coincidence scale is ${fc.toFixed(1)} Hz. Treat the plotted σ as a regime visualization; finite geometry and modal shape determine actual radiation.`,
        warnings:['The radiation-efficiency values are intentionally labeled screening estimates and should not be used as acceptance predictions.'],
        plots:[{title:'Radiation-regime screening',xLabel:'Frequency (Hz)',yLabel:'Radiation efficiency σ',xScale:'log',yScale:'log',traces:[trace('σ screening',fs,sigma)]},{title:'Acoustic / flexural wavenumber ratio',xLabel:'Frequency (Hz)',yLabel:'k₀/kb',xScale:'log',yScale:'log',traces:[trace('k₀/kb',fs,ratio),trace('Coincidence',[fmin,fmax],[1,1],{dash:true})]}]
      };
    }
  },

  'mass-law': {
    category:'Structural Acoustics', basis:'Limp-panel mass-law screening', confidence:'Screening trend',
    inputs:[
      ...commonMaterialInputs,
      {key:'thickness_mm',label:'Panel thickness',unit:'mm',type:'number',default:3,min:0.001},
      {key:'fmin',label:'Minimum frequency',unit:'Hz',type:'number',default:20,min:0.001},
      {key:'fmax',label:'Maximum frequency',unit:'Hz',type:'number',default:10000,min:0.002},
      {key:'field',label:'Mass-law convention',type:'select',default:'diffuse',options:[{value:'diffuse',label:'Common diffuse-field screening: 20log(m′f)−47'},{value:'normal',label:'Normal incidence from fluid impedance'}]},
      {key:'rho_air',label:'Fluid density',unit:'kg/m³',type:'number',default:AIR_RHO,min:0.01},
      {key:'sound_speed',label:'Sound speed',unit:'m/s',type:'number',default:AIR_C,min:1}
    ],
    syncPreset:syncMaterialDefaults,
    theory:'<p>A limp mass reacts against acoustic pressure. The normal-incidence relation is TL=10log₁₀[1+(ωm′/(2ρc))²]. The common diffuse-field engineering trend is approximately 20log₁₀(m′f)−47 dB in SI units.</p>',
    assumptions:['Infinite, limp, airtight single panel.','No resonances, coincidence dip, leakage, flanking, or structural bridges.'],
    example:'Doubling surface mass or frequency increases the mass-law trend by about 6 dB.',
    compute(v){
      const {E,rho,nu}=materialFrom(v),h=positive(v.thickness_mm,'Thickness')/1000,fmin=positive(v.fmin,'Minimum frequency'),fmax=positive(v.fmax,'Maximum frequency'),rho0=positive(v.rho_air,'Fluid density'),c0=positive(v.sound_speed,'Sound speed');
      if(fmax<=fmin) throw new Error('Maximum frequency must exceed minimum.');
      const mp=rho*h,D=plateD(E,h,nu),fc=c0*c0/(2*Math.PI)*Math.sqrt(rho*h/D),fs=logspace(fmin,fmax,180),tl=[];
      for(const f of fs){
        const val=v.field==='normal'?10*Math.log10(1+(rad(f)*mp/(2*rho0*c0))**2):20*Math.log10(mp*f)-47;
        tl.push(Math.max(0,val));
      }
      const fref=1000,tlref=v.field==='normal'?10*Math.log10(1+(rad(fref)*mp/(2*rho0*c0))**2):20*Math.log10(mp*fref)-47;
      return{
        summary:[stat('Surface mass',mp,'kg/m²'),stat('Mass-law TL at 1 kHz',tlref,'dB'),stat('Critical frequency',fc,'Hz'),stat('Bending stiffness D',D,'N·m')],
        interpretation:`The ideal mass-law line rises 6 dB/octave. The predicted plate coincidence scale is ${fc.toFixed(0)} Hz, where a real panel commonly departs from the trend.`,
        warnings:['This curve intentionally omits low-frequency modes, coincidence reduction, damping recovery, seals, flanking, and finite-panel effects.'],
        plots:[{title:'Mass-law transmission-loss trend',xLabel:'Frequency (Hz)',yLabel:'TL (dB)',xScale:'log',traces:[trace('Mass law',fs,tl),trace('Critical frequency',[fc,fc],[0,Math.max(...tl)*1.08],{dash:true})]}],
        csv:{filename:'mass-law-tl.csv',columns:['frequency_hz','tl_db'],rows:fs.map((f,i)=>[f,tl[i]])}
      };
    }
  },

  'double-panel': {
    category:'Structural Acoustics', basis:'Mass–air–mass and screening TL trend', confidence:'Screening estimate',
    inputs:[
      {key:'m1',label:'Panel 1 surface mass',unit:'kg/m²',type:'number',default:8.1,min:0.001},
      {key:'m2',label:'Panel 2 surface mass',unit:'kg/m²',type:'number',default:8.1,min:0.001},
      {key:'gap_mm',label:'Air gap',unit:'mm',type:'number',default:75,min:0.1},
      {key:'rho_air',label:'Air density',unit:'kg/m³',type:'number',default:AIR_RHO,min:0.01},
      {key:'sound_speed',label:'Sound speed',unit:'m/s',type:'number',default:AIR_C,min:1},
      {key:'fmin',label:'Minimum frequency',unit:'Hz',type:'number',default:20,min:0.001},
      {key:'fmax',label:'Maximum frequency',unit:'Hz',type:'number',default:10000,min:0.002}
    ],
    theory:'<p>The cavity acts as an acoustic spring between two surface masses. Above the mass–air–mass resonance, an ideal decoupled system can gain additional slope; real bridges, cavity modes, and leakage limit performance.</p>',
    assumptions:['Parallel limp panels, sealed air cavity, and no structural bridges.','The plotted TL is a qualitative trend, not a standardized laboratory rating.'],
    example:'Increasing cavity depth lowers the mass–air–mass resonance and usually improves high-frequency decoupling when bridging is controlled.',
    compute(v){
      const m1=positive(v.m1,'Panel 1 mass'),m2=positive(v.m2,'Panel 2 mass'),d=positive(v.gap_mm,'Gap')/1000,rho0=positive(v.rho_air,'Air density'),c0=positive(v.sound_speed,'Sound speed'),fmin=positive(v.fmin,'Minimum frequency'),fmax=positive(v.fmax,'Maximum frequency');
      const fmam=c0/(2*Math.PI)*Math.sqrt(rho0/d*(1/m1+1/m2)),fs=logspace(fmin,fmax,180),tl=[];
      for(const f of fs){
        const tl1=Math.max(0,20*Math.log10(m1*f)-47),tl2=Math.max(0,20*Math.log10(m2*f)-47);
        const cavityGain=20*Math.log10(Math.max(1,2*Math.PI*f*d/c0));
        const dip=18*Math.exp(-sq(Math.log(f/fmam)/0.28));
        tl.push(Math.max(0,tl1+tl2+cavityGain-dip));
      }
      return{
        summary:[stat('Mass–air–mass resonance',fmam,'Hz'),stat('Cavity quarter-wave',c0/(4*d),'Hz'),stat('Total surface mass',m1+m2,'kg/m²'),stat('Gap',d,'m')],
        interpretation:`The ideal mass–air–mass resonance is ${fmam.toFixed(1)} Hz. Keep the operating band well above it and minimize rigid bridges to realize double-panel benefit.`,
        warnings:['The plotted TL omits exact incidence averaging, cavity absorption, panel modes, studs, fasteners, leakage, and flanking.'],
        plots:[{title:'Double-panel screening trend',xLabel:'Frequency (Hz)',yLabel:'TL (dB)',xScale:'log',traces:[trace('Double panel',fs,tl),trace('M–A–M resonance',[fmam,fmam],[0,Math.max(...tl)*1.05],{dash:true})]}]
      };
    }
  },

  'cavity-modes': {
    category:'Acoustics', basis:'Rigid rectangular cavity modes', confidence:'Exact ideal geometry',
    inputs:[
      {key:'Lx',label:'Length x',unit:'m',type:'number',default:3,min:0.001},
      {key:'Ly',label:'Length y',unit:'m',type:'number',default:2.4,min:0.001},
      {key:'Lz',label:'Height z',unit:'m',type:'number',default:2.2,min:0.001},
      {key:'sound_speed',label:'Sound speed',unit:'m/s',type:'number',default:AIR_C,min:1},
      {key:'max_order',label:'Maximum index',type:'number',default:8,min:1,max:30,step:1},
      {key:'count',label:'Modes to display',type:'number',default:30,min:5,max:200,step:5}
    ],
    theory:'<p>Rigid-wall rectangular cavity frequencies are f=(c/2)√[(n<sub>x</sub>/L<sub>x</sub>)²+(n<sub>y</sub>/L<sub>y</sub>)²+(n<sub>z</sub>/L<sub>z</sub>)²].</p>',
    assumptions:['Rectangular cavity with rigid boundaries.','Uniform fluid and no damping or mean flow.'],
    example:'A mode with only one nonzero index is axial; two is tangential; three is oblique.',
    compute(v){
      const Lx=positive(v.Lx,'Lx'),Ly=positive(v.Ly,'Ly'),Lz=positive(v.Lz,'Lz'),c0=positive(v.sound_speed,'Sound speed'),N=clamp(Math.round(n(v.max_order,8)),1,30),count=clamp(Math.round(n(v.count,30)),5,200),modes=[];
      for(let i=0;i<=N;i++)for(let j=0;j<=N;j++)for(let k=0;k<=N;k++){
        if(i+j+k===0)continue;
        const f=c0/2*Math.sqrt((i/Lx)**2+(j/Ly)**2+(k/Lz)**2),nonzero=[i,j,k].filter(Boolean).length,type=nonzero===1?'Axial':nonzero===2?'Tangential':'Oblique';
        modes.push([i,j,k,type,f]);
      }
      modes.sort((a,b)=>a[4]-b[4]);const shown=modes.slice(0,count);
      let minSpacing=Infinity,pair='';for(let i=1;i<shown.length;i++){const d=shown[i][4]-shown[i-1][4];if(d<minSpacing){minSpacing=d;pair=`(${shown[i-1].slice(0,3).join(',')}) / (${shown[i].slice(0,3).join(',')})`;}}
      return{
        summary:[stat('First mode',shown[0][4],'Hz'),stat('Modes listed',shown.length),stat('Closest spacing',minSpacing,'Hz'),stat('Closest pair',pair)],
        interpretation:`The first rigid-cavity mode is (${shown[0][0]},${shown[0][1]},${shown[0][2]}) at ${shown[0][4].toFixed(2)} Hz.`,
        tables:[{title:'Lowest cavity modes',columns:['nx','ny','nz','Type','Frequency (Hz)'],rows:shown}],
        plots:[{title:'Ordered cavity modes',xLabel:'Ordered mode index',yLabel:'Frequency (Hz)',traces:[trace('Modes',shown.map((_,i)=>i+1),shown.map(r=>r[4]))]}],
        csv:{filename:'cavity-modes.csv',columns:['nx','ny','nz','type','frequency_hz'],rows:shown}
      };
    }
  },

  'room-t60': {
    category:'Acoustics', basis:'Sabine and Eyring diffuse-field formulas', confidence:'Room-acoustic screening',
    inputs:[
      {key:'volume',label:'Room volume',unit:'m³',type:'number',default:150,min:0.001},
      {key:'surface_area',label:'Total surface area',unit:'m²',type:'number',default:190,min:0.001},
      {key:'alpha',label:'Average absorption coefficient',type:'number',default:0.18,min:0.0001,max:0.9999,step:0.01}
    ],
    theory:'<p>Sabine uses T60=0.161V/A with A=ᾱS. Eyring replaces A with −S ln(1−ᾱ) and behaves better at higher average absorption.</p>',
    assumptions:['Diffuse sound field and spatially distributed absorption.','Air absorption and nonuniform decay neglected.'],
    example:'Sabine and Eyring agree closely for low absorption and diverge as average absorption rises.',
    compute(v){
      const V=positive(v.volume,'Volume'),S=positive(v.surface_area,'Surface area'),alpha=n(v.alpha);if(!(alpha>0&&alpha<1))throw new Error('Absorption coefficient must be between zero and one.');
      const A=alpha*S,sabine=0.161*V/A,eyring=0.161*V/(-S*Math.log(1-alpha)),mfp=4*V/S;
      return{
        summary:[stat('Sabine T60',sabine,'s'),stat('Eyring T60',eyring,'s'),stat('Equivalent absorption area',A,'m² sabins'),stat('Mean free path',mfp,'m'),stat('Method difference',100*(sabine-eyring)/eyring,'%')],
        interpretation:`At ᾱ=${alpha.toFixed(2)}, Eyring predicts a ${eyring.toFixed(2)} s decay and is generally the more appropriate of the two simple formulas as absorption rises.`,
        warnings:['Strongly non-diffuse rooms, coupled volumes, low modal density, and localized absorption require more detailed treatment.']
      };
    }
  },

  'modal-density': {
    category:'SEA & Energy', basis:'Euler–Bernoulli beam / asymptotic Kirchhoff plate', confidence:'Asymptotic screening',
    inputs:[
      {key:'structure',label:'Structure type',type:'select',default:'plate',options:[{value:'plate',label:'Thin plate'},{value:'beam',label:'Uniform simply supported beam'}]},
      {key:'E_gpa',label:'Young’s modulus',unit:'GPa',type:'number',default:68.9,min:0.001},
      {key:'rho',label:'Density',unit:'kg/m³',type:'number',default:2700,min:0.001},
      {key:'nu',label:'Poisson ratio',type:'number',default:0.33,min:-0.99,max:0.49},
      {key:'length',label:'Length',unit:'m',type:'number',default:1,min:0.001},
      {key:'width',label:'Width / beam width',unit:'m',type:'number',default:0.6,min:0.001},
      {key:'thickness_mm',label:'Thickness / beam height',unit:'mm',type:'number',default:3,min:0.001},
      {key:'frequency',label:'Evaluation frequency',unit:'Hz',type:'number',default:1000,min:0.001},
      {key:'band_fraction',label:'Band type',type:'select',default:'3',options:[{value:'1',label:'Octave'},{value:'3',label:'Third octave'},{value:'6',label:'Sixth octave'}]}
    ],
    theory:'<p>Plate Weyl count is N(f)≈Af√(ρh/D)/2. A simply supported beam has f<sub>n</sub>=Cn², giving N≈√(f/C) and n=dN/df.</p>',
    assumptions:['High enough frequency for smooth asymptotic counting.', 'Uniform ideal structure and one bending-wave family.'],
    example:'Thin, large panels often reach high modal density much earlier than short stiff beams.',
    compute(v){
      const E=positive(v.E_gpa,'Modulus')*1e9,rho=positive(v.rho,'Density'),nu=n(v.nu),L=positive(v.length,'Length'),W=positive(v.width,'Width'),h=positive(v.thickness_mm,'Thickness')/1000,f=positive(v.frequency,'Frequency'),Nband=positive(v.band_fraction,'Band fraction');
      let count,density,spacing,description;
      if(v.structure==='beam'){
        const A=W*h,I=W*h**3/12,C=Math.PI/(2*L**2)*Math.sqrt(E*I/(rho*A));
        count=Math.sqrt(f/C);density=1/(2*Math.sqrt(C*f));spacing=1/density;description='Euler–Bernoulli beam';
      }else{
        const D=plateD(E,h,nu),area=L*W;density=area/2*Math.sqrt(rho*h/D);count=density*f;spacing=1/density;description='Kirchhoff plate';
      }
      const ratio=2**(1/(2*Nband)),flo=f/ratio,fhi=f*ratio,modesBand=density*(fhi-flo);
      const frequencies=logspace(Math.max(0.1,f/20),f*20,100),counts=[],bandModes=[];
      for(const frequency of frequencies){let localDensity,localCount;if(v.structure==='beam'){const A=W*h,I=W*h**3/12,C=Math.PI/(2*L**2)*Math.sqrt(E*I/(rho*A));localCount=Math.sqrt(frequency/C);localDensity=1/(2*Math.sqrt(C*frequency));}else{localDensity=density;localCount=localDensity*frequency;}const localLo=frequency/ratio,localHi=frequency*ratio;counts.push(localCount);bandModes.push(localDensity*(localHi-localLo));}
      return{
        summary:[stat('Mode count below f',count,'modes'),stat('Modal density',density,'modes/Hz'),stat('Average spacing',spacing,'Hz'),stat('Modes in selected band',modesBand,'modes'),stat('Band limits',`${flo.toFixed(1)}–${fhi.toFixed(1)}`,'Hz')],
        interpretation:`The ${description} approximation predicts about ${modesBand.toFixed(1)} bending modes in the selected band around ${f} Hz.`,
        warnings:['Boundary corrections and low-order discreteness are omitted; count exact modes when the predicted band population is small.'],
        plots:[{title:'Modal population versus frequency',xLabel:'Frequency (Hz)',yLabel:'Mode count',xScale:'log',yScale:'log',traces:[trace('Modes below frequency',frequencies,counts),trace('Modes in selected band',frequencies,bandModes,{emphasis:true})]}]
      };
    }
  },

  'modal-overlap': {
    category:'SEA & Energy', basis:'Modal bandwidth / spacing ratio', confidence:'Diagnostic screening',
    inputs:[
      {key:'frequency',label:'Band center frequency',unit:'Hz',type:'number',default:1000,min:0.001},
      {key:'modal_density',label:'Modal density',unit:'modes/Hz',type:'number',default:0.05,min:0.000001},
      {key:'loss_factor',label:'Loss factor η',type:'number',default:0.03,min:0.000001},
      {key:'band_fraction',label:'Bands per octave',type:'select',default:'3',options:[{value:'1',label:'Octave'},{value:'3',label:'Third octave'},{value:'6',label:'Sixth octave'}]}
    ],
    theory:'<p>The overlap factor M≈ηfn(f) compares a typical modal half-power bandwidth ηf with average spacing 1/n. Conventions differ slightly; this tool states its definition explicitly.</p>',
    assumptions:['Loss factor and modal density represent the same subsystem and wave family.', 'Modes are statistically distributed enough for an average-spacing interpretation.'],
    example:'M much less than one indicates isolated modes; M near one is transitional; M well above one indicates overlapping resonances.',
    compute(v){
      const f=positive(v.frequency,'Frequency'),md=positive(v.modal_density,'Modal density'),eta=positive(v.loss_factor,'Loss factor'),N=positive(v.band_fraction,'Band fraction');
      const M=eta*f*md,spacing=1/md,bw=eta*f,ratio=2**(1/(2*N)),modes=md*f*(ratio-1/ratio);
      const regime=M<0.3?'Isolated':M<1?'Low overlap':M<3?'Transitional':'Overlapping';
      const frequencies=logspace(Math.max(0.1,f/20),f*20,100),overlap=frequencies.map(frequency=>eta*frequency*md);
      return{
        summary:[stat('Overlap factor M',M,'',regime==='Transitional'?'warn':''),stat('Regime',regime),stat('Modal bandwidth',bw,'Hz'),stat('Mean spacing',spacing,'Hz'),stat('Modes in band',modes,'modes')],
        interpretation:`The estimated modal bandwidth is ${bw.toFixed(2)} Hz versus ${spacing.toFixed(2)} Hz average spacing, giving ${regime.toLowerCase()} behavior.`,
        warnings:['SEA validity also requires appropriate subsystem definition, diffuse fields, and statistically describable coupling; overlap is not a pass/fail criterion by itself.'],
        plots:[{title:'Modal overlap versus frequency',xLabel:'Frequency (Hz)',yLabel:'Overlap factor M',xScale:'log',yScale:'log',traces:[trace('Overlap factor',frequencies,overlap,{emphasis:true}),trace('M = 1 transition',frequencies,frequencies.map(()=>1),{dash:true})]}]
      };
    }
  },

  'two-subsystem-sea': {
    category:'SEA & Energy', basis:'Reciprocal two-subsystem SEA power balance', confidence:'Exact within SEA model',
    inputs:[
      {key:'frequency',label:'Band center frequency',unit:'Hz',type:'number',default:1000,min:0.001},
      {key:'n1',label:'Subsystem 1 modal density',unit:'modes/Hz',type:'number',default:0.08,min:0.000001},
      {key:'n2',label:'Subsystem 2 modal density',unit:'modes/Hz',type:'number',default:0.04,min:0.000001},
      {key:'eta1',label:'Subsystem 1 internal loss factor',type:'number',default:0.03,min:0.000001},
      {key:'eta2',label:'Subsystem 2 internal loss factor',type:'number',default:0.05,min:0.000001},
      {key:'eta12',label:'Coupling loss factor η12',type:'number',default:0.02,min:0},
      {key:'power1',label:'Input power to subsystem 1',unit:'W',type:'number',default:1,min:0},
      {key:'power2',label:'Input power to subsystem 2',unit:'W',type:'number',default:0,min:0}
    ],
    theory:'<p>Reciprocity enforces n₁η₁₂=n₂η₂₁. The two linear power-balance equations are solved for subsystem energies, then dissipation and coupling powers are reconstructed.</p>',
    assumptions:['SEA subsystem energies and band-averaged loss factors are valid.', 'Passive reciprocal coupling.', 'Steady-state band power balance.'],
    example:'When subsystem 2 has lower modal density, the reciprocal η21 is larger than η12 for the same junction.',
    compute(v){
      const f=positive(v.frequency,'Frequency'),w=rad(f),n1=positive(v.n1,'n1'),n2=positive(v.n2,'n2'),e1=positive(v.eta1,'η1'),e2=positive(v.eta2,'η2'),e12=Math.max(0,n(v.eta12)),P1=Math.max(0,n(v.power1)),P2=Math.max(0,n(v.power2)),e21=e12*n1/n2;
      const a=w*(e1+e12),b=-w*e21,c=-w*e12,d=w*(e2+e21),det=a*d-b*c;
      if(Math.abs(det)<1e-30) throw new Error('The SEA balance matrix is singular. Increase internal loss or revise coupling.');
      const E1=(P1*d-b*P2)/det,E2=(a*P2-c*P1)/det;
      const diss1=w*e1*E1,diss2=w*e2*E2,p12=w*e12*E1,p21=w*e21*E2,net=p12-p21;
      return{
        summary:[stat('Subsystem 1 energy',E1,'J'),stat('Subsystem 2 energy',E2,'J'),stat('Reciprocal η21',e21),stat('Net power 1→2',net,'W',net<0?'warn':''),stat('Dissipation 1',diss1,'W'),stat('Dissipation 2',diss2,'W')],
        interpretation:`The net coupling flow is ${Math.abs(net).toFixed(4)} W ${net>=0?'from subsystem 1 to 2':'from subsystem 2 to 1'}. Input and dissipation close to ${(diss1+diss2).toFixed(4)} W.`,
        warnings:[E1<0||E2<0?'Negative energy indicates inconsistent loss factors or numerical inputs.':'SEA energy is band averaged; local nodal response requires additional reconstruction.'],
        tables:[{title:'Power balance',columns:['Path','Power (W)'],rows:[['Input 1',P1],['Input 2',P2],['Dissipation 1',diss1],['Dissipation 2',diss2],['Gross 1→2',p12],['Gross 2→1',p21],['Net 1→2',net]]}]
      };
    }
  },

  mobility: {
    category:'Dynamics', basis:'Complex frequency-domain differentiation', confidence:'Exact complex conversion',
    inputs:[
      {key:'input_type',label:'Known FRF type',type:'select',default:'receptance',options:[{value:'receptance',label:'Receptance X/F (m/N)'},{value:'mobility',label:'Mobility V/F ((m/s)/N)'},{value:'accelerance',label:'Accelerance A/F ((m/s²)/N)'},{value:'impedance',label:'Mechanical impedance F/V (N/(m/s))'}]},
      {key:'frequency',label:'Frequency',unit:'Hz',type:'number',default:100,min:0.000001},
      {key:'magnitude',label:'Known magnitude',type:'number',default:1e-6,min:0},
      {key:'phase',label:'Known phase',unit:'deg',type:'number',default:-30,step:1}
    ],
    theory:'<p>With e<sup>iωt</sup>, velocity is iω times displacement and acceleration is −ω² times displacement. Impedance is the reciprocal of mobility.</p>',
    assumptions:['Consistent e^{iωt} Fourier sign convention.', 'Linear complex FRFs at one frequency.'],
    example:'An accelerance FRF differs from receptance by −ω², adding 180° phase under this convention.',
    compute(v){
      const f=positive(v.frequency,'Frequency'),w=rad(f),known=complexPolar(Math.max(0,n(v.magnitude)),n(v.phase));
      let Hx,Hv,Ha,Z;
      if(v.input_type==='mobility'){Hv=known;Hx=cScale(cMul(Hv,{re:0,im:-1}),1/w);Ha=cMul(Hv,{re:0,im:w});Z=cInv(Hv);}
      else if(v.input_type==='accelerance'){Ha=known;Hx=cScale(Ha,-1/(w*w));Hv=cMul(Hx,{re:0,im:w});Z=cInv(Hv);}
      else if(v.input_type==='impedance'){Z=known;Hv=cInv(Z);Hx=cScale(cMul(Hv,{re:0,im:-1}),1/w);Ha=cMul(Hv,{re:0,im:w});}
      else {Hx=known;Hv=cMul(Hx,{re:0,im:w});Ha=cScale(Hx,-w*w);Z=cInv(Hv);}
      const rows=[['Receptance X/F',cMag(Hx),cPhase(Hx),'m/N'],['Mobility V/F',cMag(Hv),cPhase(Hv),'(m/s)/N'],['Accelerance A/F',cMag(Ha),cPhase(Ha),'(m/s²)/N'],['Impedance F/V',cMag(Z),cPhase(Z),'N/(m/s)']];
      return{
        summary:[stat('Receptance magnitude',cMag(Hx),'m/N'),stat('Mobility magnitude',cMag(Hv),'(m/s)/N'),stat('Accelerance magnitude',cMag(Ha),'(m/s²)/N'),stat('Impedance magnitude',cMag(Z),'N/(m/s)')],
        interpretation:`All four forms describe the same complex response at ${f} Hz; choose the form whose slope and physical units best support the task.`,
        tables:[{title:'Complex FRF forms',columns:['Quantity','Magnitude','Phase (deg)','Units'],rows}]
      };
    }
  },

  'spatial-correlation': {
    category:'Aero / Distributed Loads', basis:'Corcos-type convective coherence', confidence:'Model visualization',
    inputs:[
      {key:'frequency',label:'Frequency of interest',unit:'Hz',type:'number',default:500,min:0.001},
      {key:'Uc',label:'Convection velocity',unit:'m/s',type:'number',default:200,min:0.001},
      {key:'alpha_x',label:'Streamwise decay αx',type:'number',default:0.12,min:0},
      {key:'alpha_y',label:'Cross-stream decay αy',type:'number',default:0.72,min:0},
      {key:'dx',label:'Streamwise separation',unit:'m',type:'number',default:0.15,min:0},
      {key:'dy',label:'Cross-stream separation',unit:'m',type:'number',default:0.05,min:0},
      {key:'fmax',label:'Maximum plot frequency',unit:'Hz',type:'number',default:2000,min:0.01}
    ],
    theory:'<p>Complex coherence is Γ=e<sup>−αxω|Δx|/Uc−αyω|Δy|/Uc</sup>e<sup>−iωΔx/Uc</sup>. Magnitude-squared coherence is |Γ|².</p>',
    assumptions:['Stationary homogeneous convecting pressure field.', 'Constant convection speed and decay coefficients.', 'Coordinate directions align with mean flow.'],
    example:'Increasing frequency shortens coherent length and increases phase accumulation across a fixed streamwise separation.',
    compute(v){
      const f=positive(v.frequency,'Frequency'),Uc=positive(v.Uc,'Convection velocity'),ax=Math.max(0,n(v.alpha_x)),ay=Math.max(0,n(v.alpha_y)),dx=Math.max(0,n(v.dx)),dy=Math.max(0,n(v.dy)),fmax=positive(v.fmax,'Maximum frequency');
      const evalAt=(ff)=>{const w=rad(ff),mag=Math.exp(-ax*w*dx/Uc-ay*w*dy/Uc),phase=-w*dx/Uc;return{mag,gamma2:mag*mag,phase};};
      const e=evalAt(f),fx=logspace(Math.max(0.1,fmax/1000),fmax,180),coh=fx.map(ff=>evalAt(ff).gamma2),phase=fx.map(ff=>deg(evalAt(ff).phase));
      const Lx=ax>0?Uc/(ax*rad(f)):Infinity,Ly=ay>0?Uc/(ay*rad(f)):Infinity,delay=dx/Uc;
      return{
        summary:[stat('Coherence magnitude |Γ|',e.mag),stat('Magnitude-squared coherence',e.gamma2),stat('Convective phase',deg(e.phase),'deg'),stat('Convective delay',delay,'s'),stat('Streamwise e-fold length',Lx,'m'),stat('Cross-stream e-fold length',Ly,'m')],
        interpretation:`At ${f} Hz the model predicts ${e.gamma2.toFixed(3)} magnitude-squared coherence and ${deg(e.phase).toFixed(1)}° streamwise phase across the selected separation.`,
        warnings:['Corcos coefficients and convection velocity are flow-condition and convention dependent; fit them to measured cross spectra when possible.'],
        plots:[{title:'Coherence versus frequency',xLabel:'Frequency (Hz)',yLabel:'Magnitude-squared coherence',xScale:'log',traces:[trace('γ²',fx,coh)]},{title:'Convective phase versus frequency',xLabel:'Frequency (Hz)',yLabel:'Phase (deg)',xScale:'log',traces:[trace('Phase',fx,phase)]}],
        csv:{filename:'corcos-coherence.csv',columns:['frequency_hz','coherence_squared','phase_deg'],rows:fx.map((ff,i)=>[ff,coh[i],phase[i]])}
      };
    }
  },

  'correlation-matrix': {
    category:'Aero / Distributed Loads', basis:'Exponential spatial correlation matrix', confidence:'Matrix diagnostic',
    inputs:[
      {key:'sensors',label:'Number of sensors',type:'number',default:8,min:2,max:30,step:1},
      {key:'spacing',label:'Uniform spacing',unit:'m',type:'number',default:0.1,min:0.000001},
      {key:'correlation_length',label:'Correlation length',unit:'m',type:'number',default:0.25,min:0.000001},
      {key:'nugget',label:'Independent nugget fraction',type:'number',default:0,min:0,max:0.99,step:0.01,help:'Adds independent variance to the diagonal and scales correlated off-diagonal content.'}
    ],
    theory:'<p>The real symmetric screening matrix uses R<sub>ij</sub>=(1−ε)e<sup>−|xᵢ−xⱼ|/Lc</sup> for i≠j and one on the diagonal. Eigenvalues reveal rank and conditioning.</p>',
    assumptions:['One-dimensional uniform array and real zero-phase correlation.', 'Exponential kernel, which is positive definite for positive correlation length.'],
    example:'When sensor spacing is much smaller than correlation length, the matrix becomes strongly correlated and nearly low rank.',
    compute(v){
      const N=clamp(Math.round(n(v.sensors,8)),2,30),dx=positive(v.spacing,'Spacing'),Lc=positive(v.correlation_length,'Correlation length'),eps=clamp(n(v.nugget),0,0.99),x=Array.from({length:N},(_,i)=>i*dx),R=[];
      for(let i=0;i<N;i++){R[i]=[];for(let j=0;j<N;j++)R[i][j]=i===j?1:(1-eps)*Math.exp(-Math.abs(x[i]-x[j])/Lc);}
      const eig=jacobiEigenvalues(R),minEig=eig[0],maxEig=eig.at(-1),cond=maxEig/Math.max(minEig,1e-15),effRank=eig.reduce((s,e)=>s+(e/maxEig>1e-3?1:0),0);
      return{
        summary:[stat('Minimum eigenvalue',minEig,'',minEig< -1e-9?'danger':minEig<1e-5?'warn':''),stat('Maximum eigenvalue',maxEig),stat('Condition estimate',cond),stat('Effective rank',effRank),stat('Array aperture',x.at(-1),'m')],
        interpretation:`The ${N}×${N} matrix is ${minEig>=-1e-9?'positive semidefinite':'not positive semidefinite'} within numerical tolerance. Strong correlation concentrates energy into ${effRank} eigen-directions above 0.1% of the largest eigenvalue.`,
        warnings:cond>1e8?['The matrix is nearly singular. Sampling a random field or inverting this matrix may require regularization.']:[],
        heatmaps:[{title:'Spatial correlation matrix',matrix:R,labels:x.map(xx=>xx.toFixed(2))}],
        plots:[{title:'Correlation-matrix eigenvalues',xLabel:'Ordered eigenvalue',yLabel:'Eigenvalue',yScale:'log',traces:[trace('Eigenvalues',eig.map((_,i)=>i+1),eig.map(e=>Math.max(e,1e-15)))]}],
        tables:[{title:'Eigenvalues',columns:['Index','Eigenvalue'],rows:eig.map((e,i)=>[i+1,e])}]
      };
    }
  },

  'dynamic-scaling': {
    category:'Aero / Distributed Loads', basis:'User-defined power-law environment scaling', confidence:'Exact stated scaling',
    inputs:[
      {key:'q1',label:'Reference dynamic pressure',unit:'Pa',type:'number',default:20000,min:0.000001},
      {key:'q2',label:'Target dynamic pressure',unit:'Pa',type:'number',default:30000,min:0.000001},
      {key:'exponent',label:'PSD scaling exponent n',type:'number',default:2,step:0.1,help:'G₂/G₁ = (q₂/q₁)ⁿ.'},
      {key:'reference_psd',label:'Reference PSD level',unit:'units²/Hz',type:'number',default:0.02,min:0},
      {key:'reference_rms',label:'Reference RMS',unit:'units RMS',type:'number',default:5,min:0}
    ],
    theory:'<p>The tool applies G₂/G₁=(q₂/q₁)ⁿ. RMS scales with the square root of the PSD factor. Enter the exponent justified by the physical or empirical model.</p>',
    assumptions:['Same structural configuration, frequency shape, and response regime.', 'The chosen exponent is valid across the pressure range.'],
    example:'If PSD scales with q², a 50% increase in q multiplies PSD by 2.25 and RMS by 1.5.',
    compute(v){
      const q1=positive(v.q1,'Reference q'),q2=positive(v.q2,'Target q'),exp=n(v.exponent),G=Math.max(0,n(v.reference_psd)),R=Math.max(0,n(v.reference_rms)),ratio=q2/q1,factor=ratio**exp,rmsFactor=Math.sqrt(factor);
      return{
        summary:[stat('Dynamic-pressure ratio',ratio),stat('PSD scale factor',factor),stat('PSD change',db10(factor),'dB'),stat('RMS scale factor',rmsFactor),stat('Scaled PSD',G*factor,'units²/Hz'),stat('Scaled RMS',R*rmsFactor,'units RMS')],
        interpretation:`With exponent n=${exp}, changing q by a factor ${ratio.toFixed(3)} changes PSD by ${factor.toFixed(3)} and RMS by ${rmsFactor.toFixed(3)}.`,
        warnings:['Pressure scaling does not automatically preserve forcing coherence, structural transfer functions, Mach-dependent tones, or statistical confidence.']
      };
    }
  },

  'fea-mesh': {
    category:'Structures', basis:'Elements per wavelength', confidence:'Mesh-planning estimate',
    inputs:[
      {key:'wave_type',label:'Wave type',type:'select',default:'plate-bending',options:[{value:'acoustic',label:'Acoustic fluid wave'},{value:'longitudinal',label:'Longitudinal structural wave'},{value:'shear',label:'Shear structural wave'},{value:'plate-bending',label:'Thin-plate bending wave'}]},
      {key:'frequency',label:'Maximum analysis frequency',unit:'Hz',type:'number',default:2000,min:0.001},
      {key:'elements',label:'Target elements per wavelength',type:'number',default:8,min:2,max:40,step:1},
      {key:'sound_speed',label:'Acoustic sound speed',unit:'m/s',type:'number',default:AIR_C,min:1},
      {key:'E_gpa',label:'Young’s modulus',unit:'GPa',type:'number',default:68.9,min:0.001},
      {key:'rho',label:'Density',unit:'kg/m³',type:'number',default:2700,min:0.001},
      {key:'nu',label:'Poisson ratio',type:'number',default:0.33,min:-0.99,max:0.49},
      {key:'thickness_mm',label:'Plate thickness',unit:'mm',type:'number',default:3,min:0.001}
    ],
    theory:'<p>Maximum element length is λ/N. For plate bending, wavelength is frequency dependent and often much shorter than the corresponding acoustic wavelength.</p>',
    assumptions:['Uniform medium and the selected ideal wave relation.', 'Element quality, interpolation order, curvature, and local geometry remain acceptable.'],
    example:'Phase-sensitive wave propagation may require more elements per wavelength than a rough modal-frequency estimate.',
    compute(v){
      const f=positive(v.frequency,'Frequency'),Ne=positive(v.elements,'Elements per wavelength'),E=positive(v.E_gpa,'Modulus')*1e9,rho=positive(v.rho,'Density'),nu=n(v.nu),h=positive(v.thickness_mm,'Thickness')/1000,c0=positive(v.sound_speed,'Sound speed');
      let speed,wavelength,label;
      if(v.wave_type==='acoustic'){speed=c0;wavelength=speed/f;label='Acoustic';}
      else if(v.wave_type==='longitudinal'){speed=Math.sqrt(E/rho);wavelength=speed/f;label='Longitudinal';}
      else if(v.wave_type==='shear'){const G=E/(2*(1+nu));speed=Math.sqrt(G/rho);wavelength=speed/f;label='Shear';}
      else {const D=plateD(E,h,nu),w=rad(f),k=(rho*h*w*w/D)**0.25;speed=w/k;wavelength=2*Math.PI/k;label='Plate bending';}
      const le=wavelength/Ne,nodesPerMeter=1/le;
      const frequencies=logspace(Math.max(0.1,f/100),f,100),elementLengths=frequencies.map(frequency=>{if(v.wave_type==='acoustic')return c0/frequency/Ne;if(v.wave_type==='longitudinal')return Math.sqrt(E/rho)/frequency/Ne;if(v.wave_type==='shear')return Math.sqrt(E/(2*(1+nu))/rho)/frequency/Ne;const D=plateD(E,h,nu),k=(rho*h*rad(frequency)**2/D)**0.25;return 2*Math.PI/k/Ne;});
      return{
        summary:[stat('Wave speed at f',speed,'m/s'),stat('Wavelength',wavelength,'m'),stat('Maximum element length',le,'m'),stat('Elements per meter',nodesPerMeter,'1/m'),stat('Wave model',label)],
        interpretation:`At ${f} Hz, ${Ne} elements per ${label.toLowerCase()} wavelength gives a target element length no larger than ${(le*1000).toFixed(2)} mm.`,
        warnings:['Use solver-specific convergence studies. Quadratic elements, distorted elements, stress recovery, joints, and evanescent fields change the required mesh.'],
        plots:[{title:'Element-size requirement versus frequency',xLabel:'Frequency (Hz)',yLabel:'Maximum element length (m)',xScale:'log',yScale:'log',traces:[trace(`${label}, ${Ne} elements/λ`,frequencies,elementLengths,{emphasis:true})]}]
      };
    }
  },

  accelerometer: {
    category:'Test & Signal', basis:'Measurement-chain headroom and noise screening', confidence:'Screening estimate',
    inputs:[
      {key:'sensitivity',label:'Sensor sensitivity',unit:'mV/g',type:'number',default:10,min:0.000001},
      {key:'range_g',label:'Rated acceleration range',unit:'±g peak',type:'number',default:500,min:0.001},
      {key:'expected_peak',label:'Expected peak acceleration',unit:'g',type:'number',default:250,min:0},
      {key:'daq_range',label:'DAQ input range',unit:'±V peak',type:'number',default:10,min:0.001},
      {key:'noise_density',label:'Sensor noise density',unit:'μg/√Hz',type:'number',default:30,min:0},
      {key:'bandwidth',label:'Measurement bandwidth',unit:'Hz',type:'number',default:2000,min:0.001},
      {key:'low_cutoff',label:'Sensor low-frequency cutoff',unit:'Hz',type:'number',default:0.5,min:0},
      {key:'required_low',label:'Required minimum frequency',unit:'Hz',type:'number',default:2,min:0},
      {key:'sensor_mass_g',label:'Sensor mass',unit:'g',type:'number',default:5,min:0},
      {key:'local_modal_mass_g',label:'Estimated local modal mass',unit:'g',type:'number',default:500,min:0.001}
    ],
    theory:'<p>Peak output voltage is sensitivity × acceleration. White-noise RMS scales with √bandwidth. Local mass loading is judged against local modal mass, not total assembly mass.</p>',
    assumptions:['Flat sensitivity and white noise across the entered bandwidth.', 'DAQ range is symmetric and conditioner limits are not more restrictive.'],
    example:'A 10 mV/g sensor at 250 g produces 2.5 V peak, leaving comfortable room on a ±10 V input.',
    compute(v){
      const S=positive(v.sensitivity,'Sensitivity')/1000,range=positive(v.range_g,'Sensor range'),peak=Math.max(0,n(v.expected_peak)),daq=positive(v.daq_range,'DAQ range'),noise=Math.max(0,n(v.noise_density))*1e-6,bw=positive(v.bandwidth,'Bandwidth'),low=Math.max(0,n(v.low_cutoff)),req=Math.max(0,n(v.required_low)),ms=Math.max(0,n(v.sensor_mass_g)),mm=positive(v.local_modal_mass_g,'Local modal mass');
      const volts=S*peak,daqUse=100*volts/daq,sensorUse=100*peak/range,noiseRms=noise*Math.sqrt(bw),loading=100*ms/mm;
      const warnings=[];
      if(daqUse>80)warnings.push('DAQ voltage headroom is below 20%; include uncertainty, bias, and unexpected peaks.');
      if(sensorUse>80)warnings.push('Expected acceleration uses more than 80% of sensor range.');
      if(low>req)warnings.push('The sensor low-frequency cutoff is above the required minimum frequency.');
      if(loading>5)warnings.push('Sensor mass exceeds 5% of estimated local modal mass and may shift the response.');
      return{
        summary:[stat('Peak sensor output',volts,'V'),stat('DAQ range used',daqUse,'%',daqUse>80?'warn':''),stat('Sensor range used',sensorUse,'%',sensorUse>80?'warn':''),stat('Integrated noise',noiseRms,'g RMS'),stat('Local mass loading',loading,'%',loading>5?'warn':''),stat('Low-frequency margin',req-low,'Hz',req-low<0?'danger':'')],
        interpretation:`The chain produces ${volts.toFixed(3)} V peak at the expected event and an ideal white-noise floor of ${(noiseRms*1e6).toFixed(1)} μg RMS over ${bw} Hz.`,
        warnings
      };
    }
  },

  'integration-drift': {
    category:'Test & Signal', basis:'Kinematic bias and sinusoidal integration', confidence:'Exact simplified relations',
    inputs:[
      {key:'bias_mg',label:'Constant acceleration bias',unit:'mg',type:'number',default:1,step:0.1},
      {key:'duration',label:'Integration duration',unit:'s',type:'number',default:10,min:0.001},
      {key:'accel_g',label:'Sinusoidal acceleration amplitude',unit:'g peak',type:'number',default:1,min:0},
      {key:'frequency',label:'Sinusoidal frequency',unit:'Hz',type:'number',default:5,min:0.001},
      {key:'hp_cutoff',label:'Candidate high-pass cutoff',unit:'Hz',type:'number',default:0.5,min:0.0001}
    ],
    theory:'<p>A constant bias integrates to velocity a<sub>b</sub>T and displacement ½a<sub>b</sub>T². A sinusoidal acceleration amplitude maps to displacement a/(2πf)².</p>',
    assumptions:['Bias is constant and initial velocity/displacement are zero.', 'Sinusoidal component is steady state.', 'High-pass cutoff is shown as a physical time-scale diagnostic, not simulated filtering.'],
    example:'Only 1 mg of bias integrated for 10 s creates about 0.49 m of false displacement.',
    compute(v){
      const bias=n(v.bias_mg)*1e-3*G0,T=positive(v.duration,'Duration'),a=Math.max(0,n(v.accel_g))*G0,f=positive(v.frequency,'Frequency'),hp=positive(v.hp_cutoff,'High-pass cutoff');
      const vdrift=bias*T,xdrift=0.5*bias*T*T,xamp=a/rad(f)**2,vamp=a/rad(f),hpPeriod=1/hp;
      const times=Array.from({length:101},(_,index)=>T*index/100),drift=times.map(time=>0.5*Math.abs(bias)*time*time),signal=times.map(()=>xamp);
      return{
        summary:[stat('Bias velocity drift',vdrift,'m/s'),stat('Bias displacement drift',xdrift,'m'),stat('Sinusoidal displacement amplitude',xamp,'m'),stat('Sinusoidal velocity amplitude',vamp,'m/s'),stat('High-pass period',hpPeriod,'s'),stat('Drift / signal displacement',Math.abs(xdrift)/Math.max(xamp,1e-30))],
        interpretation:`The constant bias creates ${xdrift.toFixed(4)} m of apparent travel in ${T} s, compared with ${(xamp*1000).toFixed(3)} mm from the ${f} Hz sinusoidal acceleration.`,
        warnings:['A high-pass filter can remove real low-frequency motion as well as bias. Compare integrated velocity change and an independent displacement measurement.'],
        plots:[{title:'Integrated bias drift versus real sinusoidal motion',xLabel:'Integration time (s)',yLabel:'Displacement magnitude (m)',traces:[trace('Bias drift',times,drift,{emphasis:true}),trace('Sinusoidal amplitude',times,signal,{dash:true})]}]
      };
    }
  },

  'expansion-chamber': {
    category:'Noise Control', basis:'Lossless plane-wave expansion chamber', confidence:'Exact ideal 1D formula',
    inputs:[
      {key:'diameter_in',label:'Inlet duct diameter',unit:'m',type:'number',default:0.1,min:0.0001},
      {key:'diameter_chamber',label:'Chamber diameter',unit:'m',type:'number',default:0.25,min:0.0001},
      {key:'length',label:'Chamber length',unit:'m',type:'number',default:0.4,min:0.0001},
      {key:'sound_speed',label:'Sound speed',unit:'m/s',type:'number',default:AIR_C,min:1},
      {key:'fmax',label:'Maximum frequency',unit:'Hz',type:'number',default:1500,min:1}
    ],
    theory:'<p>For a simple symmetric chamber, TL=10log₁₀[1+¼(m−1/m)²sin²(kL)], where m is area ratio.</p>',
    assumptions:['Plane waves, no mean flow, no losses, rigid walls, and equal inlet/outlet ducts.', 'Valid below the first significant higher-order chamber mode.'],
    example:'Transmission loss peaks when chamber length is an odd quarter wavelength and returns toward zero at half-wave multiples.',
    compute(v){
      const d1=positive(v.diameter_in,'Inlet diameter'),d2=positive(v.diameter_chamber,'Chamber diameter'),L=positive(v.length,'Length'),c0=positive(v.sound_speed,'Sound speed'),fmax=positive(v.fmax,'Maximum frequency'),m=(d2/d1)**2,fs=linspace(1,fmax,300),tl=fs.map(f=>10*Math.log10(1+0.25*(m-1/m)**2*Math.sin(rad(f)/c0*L)**2)),fPeak=c0/(4*L),cutoff=1.841*c0/(Math.PI*d2);
      return{
        summary:[stat('Area ratio',m),stat('First ideal TL peak',fPeak,'Hz'),stat('Peak TL',10*Math.log10(1+0.25*(m-1/m)**2),'dB'),stat('Approx. chamber mode cutoff',cutoff,'Hz')],
        interpretation:`The first ideal attenuation peak occurs near ${fPeak.toFixed(1)} Hz. Keep plane-wave use below the chamber’s first transverse-mode scale near ${cutoff.toFixed(1)} Hz.`,
        warnings:['Mean flow, perforates, absorption, temperature gradients, end corrections, and higher modes can substantially change measured insertion loss.'],
        plots:[{title:'Ideal expansion-chamber transmission loss',xLabel:'Frequency (Hz)',yLabel:'TL (dB)',traces:[trace('TL',fs,tl)]}],
        csv:{filename:'expansion-chamber-tl.csv',columns:['frequency_hz','tl_db'],rows:fs.map((f,i)=>[f,tl[i]])}
      };
    }
  }
};


function nextPowerOfTwo(value) {
  let n2 = 1;
  while (n2 < value) n2 <<= 1;
  return n2;
}

function fftReal(signal) {
  const N = signal.length;
  const re = signal.slice();
  const im = new Array(N).fill(0);
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const angle = -2 * Math.PI / len;
    const wLenRe = Math.cos(angle), wLenIm = Math.sin(angle);
    for (let i = 0; i < N; i += len) {
      let wr = 1, wi = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const k = i + j + len / 2;
        const vRe = re[k] * wr - im[k] * wi;
        const vIm = re[k] * wi + im[k] * wr;
        re[i + j] = uRe + vRe; im[i + j] = uIm + vIm;
        re[k] = uRe - vRe; im[k] = uIm - vIm;
        const nextWr = wr * wLenRe - wi * wLenIm;
        wi = wr * wLenIm + wi * wLenRe; wr = nextWr;
      }
    }
  }
  return { re, im };
}

function welchPsd(signal, sampleRate, requestedNfft, overlapFraction) {
  let N = 1;
  const maxN = Math.max(8, Math.min(signal.length, Math.round(requestedNfft)));
  while ((N << 1) <= maxN) N <<= 1;
  if (N < 8) throw new Error('At least 8 time samples are required.');
  const overlap = clamp(overlapFraction, 0, 0.95);
  const step = Math.max(1, Math.round(N * (1 - overlap)));
  const starts = [];
  for (let start = 0; start + N <= signal.length; start += step) starts.push(start);
  if (!starts.length) starts.push(0);
  const window = Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  const sumW2 = window.reduce((sum, w) => sum + w * w, 0);
  const bins = N / 2 + 1;
  const psd = new Array(bins).fill(0);
  for (const start of starts) {
    const raw = Array.from({ length: N }, (_, i) => signal[start + i] ?? 0);
    const mean = raw.reduce((sum, x) => sum + x, 0) / N;
    const segment = raw.map((x, i) => (x - mean) * window[i]);
    const { re, im } = fftReal(segment);
    for (let k = 0; k < bins; k++) {
      let value = (re[k] * re[k] + im[k] * im[k]) / (sampleRate * sumW2);
      if (k > 0 && k < N / 2) value *= 2;
      psd[k] += value / starts.length;
    }
  }
  return { frequency: Array.from({ length: bins }, (_, k) => k * sampleRate / N), psd, N, segments: starts.length, df: sampleRate / N };
}

function gammaLanczos(z) {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaLanczos(1 - z));
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
  const t = z + p.length - 0.5;
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * x;
}

function sdofBaseRms(points, zeta, naturalFrequencies, integrationPoints = 700) {
  const inputF = logspace(points[0][0], points.at(-1)[0], integrationPoints);
  const inputG = inputF.map(f => interpLogLog(points, f));
  const response = naturalFrequencies.map(fn => {
    const output = inputF.map((f, i) => {
      const r = f / fn;
      const h2 = (1 + (2 * zeta * r) ** 2) / ((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
      return h2 * inputG[i];
    });
    return Math.sqrt(Math.max(0, trapz(inputF, output)));
  });
  return { inputF, inputG, response };
}

function solveLinearSystem(matrix, rhs) {
  const N = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < N; col++) {
    let pivot = col;
    for (let row = col + 1; row < N; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-18) throw new Error('The system matrix is singular or ill-conditioned.');
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const scale = a[col][col];
    for (let j = col; j <= N; j++) a[col][j] /= scale;
    for (let row = 0; row < N; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= N; j++) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map(row => row[N]);
}

const unitDefinitions = {
  'g': { dimension: 'Acceleration', factor: G0 },
  'm/s²': { dimension: 'Acceleration', factor: 1 },
  'in/s²': { dimension: 'Acceleration', factor: 0.0254 },
  'm': { dimension: 'Length', factor: 1 },
  'mm': { dimension: 'Length', factor: 1e-3 },
  'in': { dimension: 'Length', factor: 0.0254 },
  'ft': { dimension: 'Length', factor: 0.3048 },
  'Pa': { dimension: 'Pressure', factor: 1 },
  'kPa': { dimension: 'Pressure', factor: 1e3 },
  'MPa': { dimension: 'Pressure', factor: 1e6 },
  'psi': { dimension: 'Pressure', factor: 6894.757293168 },
  'psf': { dimension: 'Pressure', factor: 47.88025898 },
  'kg/m³': { dimension: 'Density', factor: 1 },
  'lbm/ft³': { dimension: 'Density', factor: 16.01846337 },
  'N/m': { dimension: 'Stiffness', factor: 1 },
  'lbf/in': { dimension: 'Stiffness', factor: 175.12683525 },
  'lbf/ft': { dimension: 'Stiffness', factor: 14.59390294 },
  'Hz': { dimension: 'Frequency', factor: 1 },
  'rad/s': { dimension: 'Frequency', factor: 1 / (2 * Math.PI) },
  'rpm': { dimension: 'Frequency', factor: 1 / 60 },
  'kg': { dimension: 'Mass', factor: 1 },
  'lbm': { dimension: 'Mass', factor: 0.45359237 },
  'slug': { dimension: 'Mass', factor: 14.59390294 },
};
const allUnitOptions = Object.keys(unitDefinitions).map(value => ({ value, label: `${value} — ${unitDefinitions[value].dimension}` }));

export const calculatorRegistry = createEngineeringRegistry(calculatorDefinitions);

export function getCalculator(id){ return calculatorRegistry[id]; }
