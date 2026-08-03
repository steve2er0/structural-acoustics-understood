/*
 * Reusable models and traceable reference data derived from ARL Penn State
 * Technical Report TR 12-007, Rev. 1. The functions are intentionally kept
 * independent of the UI so calculators, demonstrations, tests, and the
 * self-contained build all exercise the same equations.
 */

const TAU = 2 * Math.PI;
const SOUND_SPEED = 343;

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback) => {
  const number = finite(value, fallback);
  if (!(number > 0)) throw new Error('Honeycomb-panel properties must be greater than zero.');
  return number;
};
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export const HONEYCOMB_PAPER_REFERENCE = Object.freeze({
  title: 'Modal Analysis Based Experimental Statistical Energy Analysis of Structure-borne Sound Transmission through Bolted Inhomogeneous Honeycomb Sandwich Panels',
  report: 'ARL Penn State TR 12-007, Rev. 1',
  date: '13 June 2012',
  authors: ['S.A. Hambric', 'S.C. Conlon', 'J.B. Fahnline', 'R.L. Campbell', 'A.R. Barnard'],
  sourcePath: 'references/12-007-TR-HoneycombPanels_ExpSEA_SAH.pdf'
});

export const HONEYCOMB_PANEL_PRESETS = Object.freeze({
  panel1: Object.freeze({
    id: 'panel1', name: 'TR 12-007 panel 1 - thick facesheets',
    length: 2.13, width: 1.22, totalMass: 30.5,
    faceModulus: 4.76e10, facePoisson: 0.30, faceDensity: 1603, faceThickness: 2.30e-3,
    coreThickness: 25.4e-3, coreShear: 5.88e8, coreDensity: 130,
    doublerLength: 0.305, doublerMass: 2.7
  }),
  panel2: Object.freeze({
    id: 'panel2', name: 'TR 12-007 panel 2 - thin facesheets',
    length: 2.13, width: 1.22, totalMass: 20.0,
    faceModulus: 7.10e10, facePoisson: 0.30, faceDensity: 1603, faceThickness: 1.20e-3,
    coreThickness: 25.4e-3, coreShear: 5.88e8, coreDensity: 130,
    doublerLength: 0.305, doublerMass: 1.4
  })
});

export const HONEYCOMB_MODE_DATA = Object.freeze({
  panel1: Object.freeze([
    [2,0,46,2.21,0.00,2.21,130],[3,0,128,3.68,0.00,3.68,218],[4,0,255,5.15,0.00,5.15,310],[5,0,413,6.63,0.00,6.63,391],
    [1,1,42,0.74,1.29,1.48,176],[2,1,99,2.21,1.29,2.56,244],[3,1,186,3.68,1.29,3.90,300],[4,1,306,5.15,1.29,5.31,362],
    [0,2,162,0.00,3.87,3.87,263],[1,2,186,0.74,3.87,3.93,297],[2,2,239,2.21,3.87,4.45,337],[3,2,331,3.68,3.87,5.34,390],
    [0,3,431,0.00,6.44,6.44,420],[2,3,503,2.21,6.44,6.81,464]
  ]),
  panel2: Object.freeze([
    [2,0,46,2.21,0.00,2.21,131],[3,0,130,3.68,0.00,3.68,221],[5,0,432,6.63,0.00,6.63,410],
    [1,1,50,0.74,1.29,1.48,211],[2,1,115,2.21,1.29,2.56,282],[3,1,207,3.68,1.29,3.90,333],[4,1,332,5.15,1.29,5.31,393],
    [0,2,165,0.00,3.87,3.87,268],[1,2,197,0.74,3.87,3.93,314],[2,2,275,2.21,3.87,4.45,388],[3,2,376,3.68,3.87,5.34,443],
    [0,3,445,0.00,6.44,6.44,434],[2,3,550,2.21,6.44,6.81,507]
  ])
});

/* Approximate visual digitization of Figure 48. Use for teaching and regression,
 * not as a replacement for the authors' underlying measurement files. */
export const PAPER_LAP_TRANSMISSION = Object.freeze({
  frequency: Object.freeze([400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000]),
  tau12: Object.freeze([0.47,0.31,0.12,0.30,0.13,0.16,0.24,0.16,0.13,0.098,0.091,0.083]),
  tau21: Object.freeze([0.43,0.39,0.32,0.27,0.40,0.15,0.21,0.31,0.16,0.18,0.086,0.13]),
  source: 'TR 12-007 Figure 48', extraction: 'approximate visual digitization', uncertainty: 'Use as a trend-level teaching reference.'
});

export function honeycombPreset(id = 'panel1') {
  const preset = HONEYCOMB_PANEL_PRESETS[id] || HONEYCOMB_PANEL_PRESETS.panel1;
  return { ...preset };
}

export function honeycombProperties(input = {}) {
  const length = positive(input.length, 2.13);
  const width = positive(input.width, 1.22);
  const totalMass = positive(input.totalMass, 30.5);
  const faceModulus = positive(input.faceModulus, 4.76e10);
  const facePoisson = clamp(finite(input.facePoisson, 0.30), -0.95, 0.49);
  const faceThickness = positive(input.faceThickness, 2.30e-3);
  const coreThickness = positive(input.coreThickness, 25.4e-3);
  const coreShear = positive(input.coreShear, 5.88e8);
  const area = length * width;
  const surfaceMass = totalMass / area;
  const flexuralRigidity = faceModulus * faceThickness * (coreThickness + faceThickness) ** 2 / (2 * (1 - facePoisson ** 2));
  const shearRigidity = coreShear * coreThickness * (1 + faceThickness / coreThickness) ** 2;
  return {
    ...input, length, width, totalMass, faceModulus, facePoisson, faceThickness,
    coreThickness, coreShear, area, surfaceMass, flexuralRigidity, shearRigidity
  };
}

export function honeycombWaveState(input = {}, frequency = 1000, lossFactor = 0.01) {
  const panel = honeycombProperties(input);
  const f = positive(frequency, 1000);
  const omega = TAU * f;
  const D = panel.flexuralRigidity;
  const N = panel.shearRigidity;
  const mu = panel.surfaceMass;
  const bendingSpeed = Math.sqrt(omega) * (D / mu) ** 0.25;
  const shearSpeed = Math.sqrt(N / mu);
  const effectiveSpeedSquared = 2 * N / (mu + Math.sqrt(mu ** 2 + 4 * mu * N ** 2 / (omega ** 2 * D)));
  const effectiveSpeed = Math.sqrt(effectiveSpeedSquared);
  const wavenumber = omega / effectiveSpeed;
  const wavelength = TAU / wavenumber;
  const ratio = effectiveSpeed / bendingSpeed;
  const modalDensity = panel.area * omega / effectiveSpeed ** 2 * (1 - 0.5 * ratio ** 3);
  const thinPlateModalDensity = panel.area * omega / (2 * bendingSpeed ** 2);
  const conductance = modalDensity / (4 * panel.totalMass);
  const bandRatio = 2 ** (1 / 6);
  const modesThirdOctave = modalDensity * f * (bandRatio - 1 / bandRatio);
  const eta = Math.max(0, finite(lossFactor, 0.01));
  const modalOverlap = eta * f * modalDensity;
  return {
    ...panel, frequency: f, omega, bendingSpeed, shearSpeed, effectiveSpeed,
    wavenumber, wavelength, modalDensity, thinPlateModalDensity, conductance,
    modesThirdOctave, modalOverlap, kba: wavenumber * panel.width,
    thinPlateError: (thinPlateModalDensity / modalDensity - 1) * 100
  };
}

export function honeycombFrequencySeries(input = {}, fmin = 100, fmax = 10000, count = 160, lossFactor = 0.01) {
  const minimum = positive(fmin, 100);
  const maximum = positive(fmax, 10000);
  if (!(maximum > minimum)) throw new Error('Maximum frequency must exceed minimum frequency.');
  const sampleCount = Math.max(2, Math.round(count));
  const frequencies = Array.from({ length: sampleCount }, (_, index) =>
    10 ** (Math.log10(minimum) + (Math.log10(maximum) - Math.log10(minimum)) * index / (sampleCount - 1)));
  return { frequencies, states: frequencies.map(frequency => honeycombWaveState(input, frequency, lossFactor)) };
}

export function honeycombCoincidenceFrequency(input = {}, soundSpeed = SOUND_SPEED) {
  const c0 = positive(soundSpeed, SOUND_SPEED);
  let lower = 1;
  let upper = 100000;
  let fl = honeycombWaveState(input, lower).effectiveSpeed - c0;
  let fu = honeycombWaveState(input, upper).effectiveSpeed - c0;
  if (fl * fu > 0) return NaN;
  for (let iteration = 0; iteration < 80; iteration++) {
    const middle = Math.sqrt(lower * upper);
    const fm = honeycombWaveState(input, middle).effectiveSpeed - c0;
    if (Math.abs(fm) < 1e-10) return middle;
    if (fl * fm <= 0) { upper = middle; fu = fm; }
    else { lower = middle; fl = fm; }
  }
  return Math.sqrt(lower * upper);
}

export function idealLineTransmission(state1, state2) {
  const psi = state1.effectiveSpeed ** 2 * state2.flexuralRigidity /
    (state2.effectiveSpeed ** 2 * state1.flexuralRigidity);
  const x = state1.effectiveSpeed / state2.effectiveSpeed;
  const numerator = 2 * Math.sqrt(Math.max(0, x * psi)) * (1 + x) * (1 + psi);
  const denominator = x * (1 + psi ** 2) + 2 * psi * (1 + x ** 2);
  return clamp((numerator / denominator) ** 2, 0, 1);
}

export function blockingMassTransmission(state1, state2, blockingMassPerLength = 15) {
  const mass = Math.max(0, finite(blockingMassPerLength, 15));
  const z1 = state1.surfaceMass * state1.effectiveSpeed;
  const z2 = state2.surfaceMass * state2.effectiveSpeed;
  return clamp(4 * z1 * z2 / ((z1 + z2) ** 2 + (state1.omega * mass) ** 2), 0, 1);
}

export function pointConnectionTransmission(state1, state2) {
  const z1 = 1 / Math.max(state1.conductance, 1e-30);
  const z2 = 1 / Math.max(state2.conductance, 1e-30);
  return clamp(4 * z1 * z2 / (z1 + z2) ** 2, 0, 1);
}

function logInterpolate(xValues, yValues, x) {
  if (x <= xValues[0]) return yValues[0];
  if (x >= xValues.at(-1)) return yValues.at(-1);
  let upper = 1;
  while (xValues[upper] < x) upper++;
  const lower = upper - 1;
  const fraction = Math.log(x / xValues[lower]) / Math.log(xValues[upper] / xValues[lower]);
  return yValues[lower] * (yValues[upper] / yValues[lower]) ** fraction;
}

export function paperLapTransmission(frequency, direction = '12') {
  const values = direction === '21' ? PAPER_LAP_TRANSMISSION.tau21 : PAPER_LAP_TRANSMISSION.tau12;
  return logInterpolate(PAPER_LAP_TRANSMISSION.frequency, values, positive(frequency, 1000));
}

export function pointCouplingLossFactor(state, transmission, connectionCount = 1) {
  const tau = clamp(finite(transmission), 0, 1 - 1e-12);
  const count = Math.max(1, Math.round(finite(connectionCount, 1)));
  return count / (Math.PI * state.frequency * state.modalDensity) * tau / (2 - tau);
}

export function lineCouplingLossFactor(state, transmission, jointLength = 1.22) {
  const tau = clamp(finite(transmission), 0, 1 - 1e-12);
  const length = positive(jointLength, 1.22);
  return state.omega * length / (Math.PI ** 2 * state.frequency * state.modalDensity * state.effectiveSpeed) * tau / (2 - tau);
}

export function junctionTransmissionState(panel1Input = {}, panel2Input = {}, frequency = 1000, options = {}) {
  const state1 = honeycombWaveState(panel1Input, frequency, options.lossFactor1 ?? 0.01);
  const state2 = honeycombWaveState(panel2Input, frequency, options.lossFactor2 ?? 0.01);
  const model = options.model || 'paper-lap';
  let tau12;
  let tau21;
  if (model === 'ideal-line') {
    tau12 = idealLineTransmission(state1, state2);
    tau21 = idealLineTransmission(state2, state1);
  } else if (model === 'blocking-mass') {
    tau12 = blockingMassTransmission(state1, state2, options.blockingMassPerLength);
    tau21 = blockingMassTransmission(state2, state1, options.blockingMassPerLength);
  } else if (model === 'point-array') {
    tau12 = pointConnectionTransmission(state1, state2);
    tau21 = pointConnectionTransmission(state2, state1);
  } else {
    tau12 = paperLapTransmission(frequency, '12');
    tau21 = paperLapTransmission(frequency, '21');
  }
  const spacing = positive(options.boltSpacing, 0.254);
  const kbd12 = state1.wavenumber * spacing;
  const kbd21 = state2.wavenumber * spacing;
  const regime = Math.max(kbd12, kbd21) < Math.PI ? 'line-like spacing' :
    Math.max(kbd12, kbd21) < 2 * Math.PI ? 'periodic-junction transition' : 'point-connection scale';
  return {
    state1, state2, model, tau12, tau21, kbd12, kbd21, regime,
    eta12Line: lineCouplingLossFactor(state1, tau12, options.jointLength),
    eta21Line: lineCouplingLossFactor(state2, tau21, options.jointLength),
    eta12Point: pointCouplingLossFactor(state1, tau12, options.connectionCount),
    eta21Point: pointCouplingLossFactor(state2, tau21, options.connectionCount),
    idealTau12: idealLineTransmission(state1, state2),
    idealTau21: idealLineTransmission(state2, state1)
  };
}

export function experimentalSeaInverse(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const omega = TAU * frequency;
  const P1 = positive(input.P1, 1e-4);
  const P2 = positive(input.P2, 1e-4);
  const E11 = positive(input.E11, 1.065e-9);
  const E21 = positive(input.E21, 2.242e-10);
  const E12 = positive(input.E12, 2.802e-10);
  const E22 = positive(input.E22, 8.967e-10);
  const determinant = E21 * E12 - E11 * E22;
  const scale = Math.max(E11 * E22, E12 * E21, 1e-300);
  if (Math.abs(determinant) < 1e-12 * scale) throw new Error('The energy matrix is too close to singular for a stable E-SEA inversion.');
  const eta11 = (-E22 * P1 + E21 * P2) / (determinant * omega);
  const eta12 = -E21 * P2 / (determinant * omega);
  const eta21 = -E12 * P1 / (determinant * omega);
  const eta22 = (E12 * P1 - E11 * P2) / (determinant * omega);
  const separation = Math.abs(determinant) / (E11 * E22 + E12 * E21);
  return { frequency, omega, P1, P2, E11, E21, E12, E22, determinant, separation, eta11, eta12, eta21, eta22 };
}

function solveTwoByTwo(a, b, c, d, p, q) {
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < 1e-30) throw new Error('The SEA matrix is singular.');
  return [(p * d - b * q) / determinant, (a * q - p * c) / determinant];
}

export function seaForwardEnergies(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const omega = TAU * frequency;
  const eta11 = positive(input.eta11, 0.012);
  const eta12 = Math.max(0, finite(input.eta12, 0.004));
  const eta21 = Math.max(0, finite(input.eta21, 0.005));
  const eta22 = positive(input.eta22, 0.014);
  const P1 = positive(input.P1, 1e-4);
  const P2 = positive(input.P2, 1e-4);
  const a = omega * (eta11 + eta12);
  const b = -omega * eta21;
  const c = -omega * eta12;
  const d = omega * (eta22 + eta21);
  const [E11, E21] = solveTwoByTwo(a, b, c, d, P1, 0);
  const [E12, E22] = solveTwoByTwo(a, b, c, d, 0, P2);
  return { frequency, P1, P2, eta11, eta12, eta21, eta22, E11, E21, E12, E22 };
}

function halton(index, base) {
  let fraction = 1;
  let result = 0;
  let value = index;
  while (value > 0) {
    fraction /= base;
    result += fraction * (value % base);
    value = Math.floor(value / base);
  }
  return result;
}

export function inhomogeneousEnergyStudy(input = {}) {
  const panel = honeycombProperties(input.panel || input);
  const modeX = Math.max(1, Math.round(finite(input.modeX, 2)));
  const modeY = Math.max(0, Math.round(finite(input.modeY, 1)));
  const sensorCount = clamp(Math.round(finite(input.sensorCount, 6)), 3, 126);
  const layout = input.layout || 'paper-six';
  const shift = clamp(finite(input.shift, 0), -0.45, 0.45);
  const nx = 121;
  const ny = 73;
  const baseMass = Math.max(0, panel.totalMass - finite(panel.doublerMass, 0));
  const baseSurfaceMass = baseMass / panel.area;
  const doublerLength = clamp(finite(panel.doublerLength, 0.305), 0, panel.length / 2);
  const doublerArea = 2 * doublerLength * panel.width;
  const doublerSurfaceMass = doublerArea > 0 ? Math.max(0, finite(panel.doublerMass, 0)) / doublerArea : 0;
  const modeMatrix = [];
  const massMatrix = [];
  const contributionMatrix = [];
  let exactNumerator = 0;
  let massSum = 0;
  let uniformMean = 0;
  for (let iy = 0; iy < ny; iy++) {
    const y = panel.width * iy / (ny - 1);
    const modeRow = [];
    const massRow = [];
    const contributionRow = [];
    for (let ix = 0; ix < nx; ix++) {
      const x = panel.length * ix / (nx - 1);
      const mode = Math.cos(modeX * Math.PI * x / panel.length) *
        (modeY === 0 ? 1 : Math.cos(modeY * Math.PI * y / panel.width));
      const modeSquared = mode ** 2;
      const mass = baseSurfaceMass + ((x <= doublerLength || x >= panel.length - doublerLength) ? doublerSurfaceMass : 0);
      modeRow.push(mode);
      massRow.push(mass);
      contributionRow.push(mass * modeSquared);
      exactNumerator += mass * modeSquared;
      massSum += mass;
      uniformMean += modeSquared;
    }
    modeMatrix.push(modeRow);
    massMatrix.push(massRow);
    contributionMatrix.push(contributionRow);
  }
  const exactEnergy = panel.totalMass * exactNumerator / massSum;
  const uniformEnergy = panel.totalMass * uniformMean / (nx * ny);
  const paperSix = [[.14,.22],[.28,.72],[.43,.38],[.58,.82],[.73,.18],[.88,.61]];
  const sensors = [];
  if (layout === 'regular') {
    const columns = Math.ceil(Math.sqrt(sensorCount * panel.length / panel.width));
    const rows = Math.ceil(sensorCount / columns);
    for (let row = 0; row < rows && sensors.length < sensorCount; row++) {
      for (let column = 0; column < columns && sensors.length < sensorCount; column++) {
        sensors.push({
          x: clamp((column + 0.5 + shift) / columns, 0.01, 0.99),
          y: clamp((row + 0.5 - shift) / rows, 0.01, 0.99)
        });
      }
    }
  } else if (layout === 'paper-six' && sensorCount <= 6) {
    paperSix.slice(0, sensorCount).forEach(([x, y]) => sensors.push({ x, y }));
  } else {
    for (let index = 1; index <= sensorCount; index++) sensors.push({ x: halton(index, 2), y: halton(index, 3) });
  }
  const sensorValues = sensors.map(sensor => {
    const mode = Math.cos(modeX * Math.PI * sensor.x) * (modeY === 0 ? 1 : Math.cos(modeY * Math.PI * sensor.y));
    return { ...sensor, mode, modeSquared: mode ** 2 };
  });
  const sparseEnergy = panel.totalMass * sensorValues.reduce((sum, sensor) => sum + sensor.modeSquared, 0) / sensorValues.length;
  const effectiveColumns = layout === 'regular' ? Math.ceil(Math.sqrt(sensorCount * panel.length / panel.width)) : Math.sqrt(sensorCount * panel.length / panel.width);
  const samplesPerHalfWave = effectiveColumns / modeX;
  return {
    panel, modeX, modeY, sensorCount, layout, sensors: sensorValues,
    exactEnergy, uniformEnergy, sparseEnergy,
    uniformBias: 100 * (uniformEnergy / exactEnergy - 1),
    sparseBias: 100 * (sparseEnergy / exactEnergy - 1),
    samplesPerHalfWave, modeMatrix, massMatrix, contributionMatrix
  };
}

function hann(index, count) {
  return count <= 1 ? 1 : 0.5 * (1 - Math.cos(TAU * index / (count - 1)));
}

function complexFieldValue(kx, ky, x, y, reflectedAmplitude = 0) {
  const incidentPhase = kx * x + ky * y;
  const reflectedPhase = -kx * x + ky * y;
  return {
    re: Math.cos(incidentPhase) + reflectedAmplitude * Math.cos(reflectedPhase),
    im: Math.sin(incidentPhase) + reflectedAmplitude * Math.sin(reflectedPhase)
  };
}

function transformField(field, nx, ny, dx, dy, useWindow) {
  const kx = Array.from({ length: nx }, (_, index) => TAU * (index - Math.floor(nx / 2)) / (nx * dx));
  const ky = Array.from({ length: ny }, (_, index) => TAU * (index - Math.floor(ny / 2)) / (ny * dy));
  const power = ky.map((kyValue) => kx.map((kxValue) => {
    let re = 0;
    let im = 0;
    for (let iy = 0; iy < ny; iy++) {
      const wy = useWindow ? hann(iy, ny) : 1;
      for (let ix = 0; ix < nx; ix++) {
        const wx = useWindow ? hann(ix, nx) : 1;
        const phase = -(kxValue * ix * dx + kyValue * iy * dy);
        const cosine = Math.cos(phase);
        const sine = Math.sin(phase);
        const value = field[iy][ix];
        const weight = wx * wy;
        re += weight * (value.re * cosine - value.im * sine);
        im += weight * (value.re * sine + value.im * cosine);
      }
    }
    return re ** 2 + im ** 2;
  }));
  return { kx, ky, power };
}

export function wavenumberTransmissionStudy(input = {}) {
  const panel1 = honeycombProperties(input.panel1 || honeycombPreset('panel1'));
  const panel2 = honeycombProperties(input.panel2 || honeycombPreset('panel2'));
  const frequency = positive(input.frequency, 1000);
  const incidence = clamp(finite(input.incidence, 20), 0, 75) * Math.PI / 180;
  const transmission = clamp(finite(input.transmission, 0.2), 1e-6, 0.999999);
  const deltaK = positive(input.deltaK, 2);
  const nx = clamp(Math.round(finite(input.nx, 18)), 8, 28);
  const ny = clamp(Math.round(finite(input.ny, 12)), 8, 22);
  const state1 = honeycombWaveState(panel1, frequency);
  const state2 = honeycombWaveState(panel2, frequency);
  const k1 = state1.wavenumber;
  const k2 = state2.wavenumber;
  const kx1 = k1 * Math.cos(incidence);
  const ky1 = k1 * Math.sin(incidence);
  const kx2 = k2 * Math.cos(incidence);
  const ky2 = k2 * Math.sin(incidence);
  const reflectedAmplitude = Math.sqrt(1 - transmission);
  const transmittedAmplitude = Math.sqrt(transmission * state1.flexuralRigidity / state2.flexuralRigidity);
  const dx = panel1.length / (nx - 1);
  const dy = panel1.width / (ny - 1);
  const spatial1 = [];
  const spatial2 = [];
  for (let iy = 0; iy < ny; iy++) {
    const row1 = [];
    const row2 = [];
    for (let ix = 0; ix < nx; ix++) {
      const first = complexFieldValue(kx1, ky1, ix * dx, iy * dy, reflectedAmplitude);
      const phase2 = kx2 * ix * dx + ky2 * iy * dy;
      row1.push(first);
      row2.push({ re: transmittedAmplitude * Math.cos(phase2), im: transmittedAmplitude * Math.sin(phase2) });
    }
    spatial1.push(row1);
    spatial2.push(row2);
  }
  const spectrum1 = transformField(spatial1, nx, ny, dx, dy, input.window !== 'rectangular');
  const spectrum2 = transformField(spatial2, nx, ny, dx, dy, input.window !== 'rectangular');
  let incidentPower = 0;
  let transmittedPower = 0;
  for (let iy = 0; iy < spectrum1.ky.length; iy++) {
    for (let ix = 0; ix < spectrum1.kx.length; ix++) {
      const kMagnitude = Math.hypot(spectrum1.kx[ix], spectrum1.ky[iy]);
      if (spectrum1.kx[ix] > 0 && Math.abs(kMagnitude - k1) <= deltaK) incidentPower += spectrum1.power[iy][ix];
      const kMagnitude2 = Math.hypot(spectrum2.kx[ix], spectrum2.ky[iy]);
      if (spectrum2.kx[ix] > 0 && Math.abs(kMagnitude2 - k2) <= deltaK) transmittedPower += spectrum2.power[iy][ix];
    }
  }
  const recoveredTransmission = clamp(state2.flexuralRigidity * transmittedPower /
    Math.max(state1.flexuralRigidity * incidentPower, 1e-300), 0, 1);
  return {
    panel1, panel2, state1, state2, frequency, incidence, transmission, recoveredTransmission,
    deltaK, nx, ny, dx, dy, kNyquistX: Math.PI / dx, kNyquistY: Math.PI / dy,
    spatial1, spatial2, spectrum1, spectrum2
  };
}
