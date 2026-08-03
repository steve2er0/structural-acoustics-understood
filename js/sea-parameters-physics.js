/* Reusable SEA parameter models derived from SEA_parameters_revAB.
 * These are band-screening relations. Every exported state reports the
 * quantities needed to audit how an SEA input was obtained.
 */
import { seaNetworkState } from './acs519-physics.js';

const TAU = 2 * Math.PI;
const AIR_RHO = 1.204;
const AIR_C = 343;
const PREF = 20e-6;
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback) => Math.max(1e-12, number(value, fallback));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const logspace = (low, high, count = 96) => Array.from({ length: count }, (_, index) => low * (high / low) ** (index / Math.max(1, count - 1)));

function interpolateLog(points, frequency) {
  const f = positive(frequency, points[0][0]);
  if (f <= points[0][0]) return points[0][1];
  if (f >= points.at(-1)[0]) return points.at(-1)[1];
  const upper = points.findIndex(point => point[0] >= f);
  const [f0, y0] = points[upper - 1];
  const [f1, y1] = points[upper];
  const ratio = Math.log(f / f0) / Math.log(f1 / f0);
  return y0 + ratio * (y1 - y0);
}

function plateProperties(input = {}) {
  const length = positive(input.length, 2.4);
  const width = positive(input.width, 1.4);
  const thickness = positive(input.thickness, 0.003);
  const modulus = positive(input.modulus, 70e9);
  const density = positive(input.density, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const area = length * width;
  const perimeter = 2 * (length + width);
  const surfaceMass = density * thickness;
  const bendingStiffness = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const longitudinalSpeed = Math.sqrt(modulus / (density * (1 - poisson ** 2)));
  const shearSpeed = Math.sqrt(modulus / (2 * density * (1 + poisson)));
  return { length, width, thickness, modulus, density, poisson, area, perimeter, surfaceMass, bendingStiffness, longitudinalSpeed, shearSpeed, mass: surfaceMass * area };
}

export const SEA_PARAMETER_PRESETS = Object.freeze({
  aluminumPlate: Object.freeze({ label: 'Aluminum skin panel', subsystem: 'plate-bending', construction: 'homogeneous-panel', length: 2.4, width: 1.4, thickness: 0.003, modulus: 70e9, density: 2700, poisson: 0.33 }),
  honeycombFairing: Object.freeze({ label: 'Honeycomb fairing bay', subsystem: 'honeycomb', construction: 'built-up-sandwich', length: 2.4, width: 1.4, thickness: 0.026, modulus: 70e9, density: 520, poisson: 0.31, faceThickness: 0.0006, coreThickness: 0.0248, coreShearModulus: 85e6 }),
  cylindricalShell: Object.freeze({ label: 'Unstiffened cylindrical shell', subsystem: 'cylinder', construction: 'cylindrical-shell', length: 7.5, width: 11.3, radius: 1.8, thickness: 0.004, modulus: 70e9, density: 2700, poisson: 0.33 }),
  acousticCavity: Object.freeze({ label: 'Payload acoustic cavity', subsystem: 'acoustic-3d', construction: 'acoustic-room', length: 7.5, width: 3.6, height: 3.6, soundSpeed: AIR_C, fluidDensity: AIR_RHO })
});

const LOSS_FACTOR_FAMILIES = Object.freeze({
  'homogeneous-panel': { label: 'Bare homogeneous panel', points: [[63, 0.018], [125, 0.014], [250, 0.011], [500, 0.009], [1000, 0.007], [2000, 0.0055], [4000, 0.0045], [8000, 0.004]] },
  'bare-sandwich': { label: 'Bare sandwich panel', points: [[63, 0.016], [125, 0.013], [250, 0.011], [500, 0.009], [1000, 0.008], [2000, 0.007], [4000, 0.006], [8000, 0.006]] },
  'built-up-sandwich': { label: 'Built-up sandwich panel', points: [[63, 0.045], [125, 0.038], [250, 0.032], [500, 0.027], [1000, 0.023], [2000, 0.020], [4000, 0.018], [8000, 0.017]] },
  'stowed-solar-array': { label: 'Stowed solar array', points: [[63, 0.090], [125, 0.080], [250, 0.068], [500, 0.058], [1000, 0.050], [2000, 0.043], [4000, 0.038], [8000, 0.035]] },
  'cylindrical-shell': { label: 'Built-up cylindrical shell', points: [[63, 0.030], [125, 0.025], [250, 0.021], [500, 0.018], [1000, 0.015], [2000, 0.012], [4000, 0.010], [8000, 0.009]] }
});

export function empiricalLossFactorState(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const construction = Object.hasOwn(LOSS_FACTOR_FAMILIES, input.construction) ? input.construction : 'homogeneous-panel';
  const family = LOSS_FACTOR_FAMILIES[construction];
  const frequencies = logspace(63, 8000, 96);
  const lossFactor = interpolateLog(family.points, frequency);
  return {
    frequency, construction, label: family.label, lossFactor,
    dampingRatio: lossFactor / 2,
    qFactor: 1 / lossFactor,
    frequencies,
    curve: frequencies.map(value => interpolateLog(family.points, value)),
    provenance: 'Empirical construction-family screen digitized as representative octave-band trends; replace with configuration-specific test data when available.'
  };
}

export function modalDensityAtlasState(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const lossFactor = positive(input.lossFactor, 0.02);
  const bandFraction = positive(input.bandFraction, 2 ** (1 / 6) - 2 ** (-1 / 6));
  const type = String(input.type ?? 'plate-bending');
  const boundary = String(input.boundary ?? 'simply-supported');
  const properties = plateProperties(input);
  const height = positive(input.height, 1.5);
  const radius = positive(input.radius, properties.width / (2 * Math.PI));
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const omega = TAU * frequency;
  let modalDensity = 0;
  let waveSpeed = properties.longitudinalSpeed;
  let dimension = 2;
  let basis = '';
  let transitionFrequency = null;

  if (type === 'acoustic-1d') {
    modalDensity = 2 * properties.length / soundSpeed;
    waveSpeed = soundSpeed;
    dimension = 1;
    transitionFrequency = soundSpeed / (2 * Math.max(properties.width, height));
    basis = 'One-dimensional pipe density n=2L/c';
  } else if (type === 'acoustic-2d') {
    modalDensity = 2 * Math.PI * frequency * properties.area / soundSpeed ** 2 + properties.perimeter / soundSpeed;
    waveSpeed = soundSpeed;
    dimension = 2;
    transitionFrequency = soundSpeed / (2 * height);
    basis = 'Two-dimensional rectangular acoustic Weyl density';
  } else if (type === 'acoustic-3d') {
    const volume = properties.area * height;
    const surfaceArea = 2 * (properties.area + properties.length * height + properties.width * height);
    const totalEdges = 4 * (properties.length + properties.width + height);
    modalDensity = 4 * Math.PI * frequency ** 2 * volume / soundSpeed ** 3 + Math.PI * frequency * surfaceArea / (2 * soundSpeed ** 2) + totalEdges / (8 * soundSpeed);
    waveSpeed = soundSpeed;
    dimension = 3;
    basis = 'Three-dimensional rectangular acoustic Weyl density with surface and edge corrections';
  } else if (type === 'beam-bending') {
    const crossWidth = positive(input.beamWidth, properties.width);
    const area = crossWidth * properties.thickness;
    const inertia = crossWidth * properties.thickness ** 3 / 12;
    const radiusGyration = Math.sqrt(inertia / area);
    modalDensity = properties.length / Math.sqrt(2 * Math.PI * frequency * radiusGyration * Math.sqrt(properties.modulus / properties.density));
    const k = (properties.density * area * omega ** 2 / (properties.modulus * inertia)) ** 0.25;
    waveSpeed = omega / k;
    dimension = 1;
    basis = 'Euler–Bernoulli beam bending modal density';
  } else if (type === 'beam-longitudinal') {
    modalDensity = 2 * properties.length / Math.sqrt(properties.modulus / properties.density);
    waveSpeed = Math.sqrt(properties.modulus / properties.density);
    dimension = 1;
    basis = 'Longitudinal beam mode spacing';
  } else if (type === 'plate-inplane') {
    modalDensity = properties.area * omega * (1 / properties.longitudinalSpeed ** 2 + 1 / properties.shearSpeed ** 2);
    waveSpeed = properties.longitudinalSpeed;
    dimension = 2;
    basis = 'Two-dimensional in-plane longitudinal-plus-shear Weyl density';
  } else if (type === 'circular-plate') {
    const rectangular = properties.area / 2 * Math.sqrt(properties.surfaceMass / properties.bendingStiffness);
    modalDensity = 8 / Math.PI ** 2 * rectangular;
    const k = (properties.surfaceMass * omega ** 2 / properties.bendingStiffness) ** 0.25;
    waveSpeed = omega / k;
    basis = 'Equal-area circular-plate correction applied to bending density';
  } else if (type === 'honeycomb') {
    const faceThickness = positive(input.faceThickness, 0.0006);
    const coreThickness = positive(input.coreThickness, Math.max(properties.thickness - 2 * faceThickness, 0.001));
    const coreShearModulus = positive(input.coreShearModulus, 85e6);
    const shearStiffness = coreShearModulus * coreThickness * (1 + faceThickness / coreThickness) ** 2;
    const sandwichBending = properties.modulus * faceThickness * (coreThickness + faceThickness) ** 2 / (2 * (1 - properties.poisson ** 2));
    const term = (properties.surfaceMass ** 2 * omega ** 4 + 4 * properties.surfaceMass * omega ** 2 * shearStiffness ** 2 / sandwichBending) ** -0.5;
    modalDensity = Math.PI * properties.area * properties.surfaceMass * frequency / shearStiffness * (1 + term * (properties.surfaceMass * omega ** 2 + 2 * shearStiffness ** 2 / sandwichBending));
    const bendingK = (properties.surfaceMass * omega ** 2 / sandwichBending) ** 0.25;
    const shearSpeed = Math.sqrt(shearStiffness / properties.surfaceMass);
    waveSpeed = Math.min(omega / bendingK, shearSpeed);
    transitionFrequency = shearStiffness / (TAU * Math.sqrt(properties.surfaceMass * sandwichBending));
    basis = 'Shear-corrected honeycomb sandwich modal density';
  } else if (type === 'cylinder') {
    const longitudinalSpeed = properties.longitudinalSpeed;
    const ringFrequency = longitudinalSpeed / (TAU * radius);
    const ratio = frequency / ringFrequency;
    const bandShape = ratio <= 0.48 ? 2.5 * Math.sqrt(ratio) : ratio <= 0.83 ? 3.6 * ratio : 2.4 * Math.sqrt(ratio) + 0.8 * ratio;
    modalDensity = Math.max(1e-12, bandShape * properties.length / (Math.PI * properties.thickness * ringFrequency));
    const k = (properties.surfaceMass * omega ** 2 / properties.bendingStiffness) ** 0.25;
    waveSpeed = omega / k;
    transitionFrequency = ringFrequency;
    basis = 'Unstiffened-cylinder band-density screen referenced to ring frequency';
  } else {
    const baseOmegaDensity = properties.area / (4 * Math.PI) * Math.sqrt(properties.surfaceMass / properties.bendingStiffness);
    const edgeScale = (properties.surfaceMass / properties.bendingStiffness) ** 0.25 * ((properties.length + properties.width) / Math.PI) / Math.sqrt(omega);
    const coefficient = boundary === 'free' ? 0.5 : boundary === 'clamped' ? -0.5 : boundary === 'generic' ? 0 : -0.25;
    modalDensity = TAU * Math.max(1e-12, baseOmegaDensity + coefficient * edgeScale);
    const k = (properties.surfaceMass * omega ** 2 / properties.bendingStiffness) ** 0.25;
    waveSpeed = omega / k;
    basis = `${boundary.replaceAll('-', ' ')} rectangular-plate bending density with boundary correction`;
  }

  const bandwidth = frequency * bandFraction;
  const averageSpacing = 1 / modalDensity;
  const modesInBand = modalDensity * bandwidth;
  const modalOverlap = modalDensity * lossFactor * frequency;
  const wavelength = waveSpeed / frequency;
  const frequencies = logspace(Math.max(10, frequency / 16), frequency * 16, 100);
  const curve = frequencies.map(value => modalDensityAtlasStateNoCurve({ ...input, type, frequency: value }).modalDensity);
  return {
    type, boundary, frequency, lossFactor, bandFraction, bandwidth, modalDensity, averageSpacing,
    modesInBand, modalOverlap, waveSpeed, wavelength, dimension, basis, transitionFrequency,
    properties, frequencies, curve,
    readiness: modesInBand >= 5 && modalOverlap >= 1 ? 'well-populated statistical band' : modesInBand >= 2 && modalOverlap >= 0.3 ? 'transitional statistical band' : 'sparse or weakly overlapping band'
  };
}

function modalDensityAtlasStateNoCurve(input) {
  const state = modalDensityAtlasStateCore(input);
  return state;
}

function modalDensityAtlasStateCore(input = {}) {
  /* Avoid recursive curve construction by asking the public model at one
     frequency through the same equations with a private sentinel. */
  if (input.__core) return input.__core;
  const copy = { ...input };
  const originalLogspace = copy.frequency;
  // Re-evaluate with a compact inline call by temporarily using the public
  // model's selected-frequency result and suppressing further curve creation.
  return modalDensityScalar(copy, originalLogspace);
}

function modalDensityScalar(input, frequency) {
  const stateInput = { ...input, frequency };
  const properties = plateProperties(stateInput);
  const type = String(stateInput.type ?? 'plate-bending');
  const boundary = String(stateInput.boundary ?? 'simply-supported');
  const f = positive(frequency, 1000);
  const omega = TAU * f;
  const height = positive(stateInput.height, 1.5);
  const radius = positive(stateInput.radius, properties.width / (2 * Math.PI));
  const soundSpeed = positive(stateInput.soundSpeed, AIR_C);
  let modalDensity;
  if (type === 'acoustic-1d') modalDensity = 2 * properties.length / soundSpeed;
  else if (type === 'acoustic-2d') modalDensity = 2 * Math.PI * f * properties.area / soundSpeed ** 2 + properties.perimeter / soundSpeed;
  else if (type === 'acoustic-3d') {
    const volume = properties.area * height;
    const surfaceArea = 2 * (properties.area + properties.length * height + properties.width * height);
    const totalEdges = 4 * (properties.length + properties.width + height);
    modalDensity = 4 * Math.PI * f ** 2 * volume / soundSpeed ** 3 + Math.PI * f * surfaceArea / (2 * soundSpeed ** 2) + totalEdges / (8 * soundSpeed);
  } else if (type === 'beam-bending') {
    const crossWidth = positive(stateInput.beamWidth, properties.width);
    const area = crossWidth * properties.thickness;
    const inertia = crossWidth * properties.thickness ** 3 / 12;
    modalDensity = properties.length / Math.sqrt(2 * Math.PI * f * Math.sqrt(inertia / area) * Math.sqrt(properties.modulus / properties.density));
  } else if (type === 'beam-longitudinal') modalDensity = 2 * properties.length / Math.sqrt(properties.modulus / properties.density);
  else if (type === 'plate-inplane') modalDensity = properties.area * omega * (1 / properties.longitudinalSpeed ** 2 + 1 / properties.shearSpeed ** 2);
  else if (type === 'circular-plate') modalDensity = 8 / Math.PI ** 2 * properties.area / 2 * Math.sqrt(properties.surfaceMass / properties.bendingStiffness);
  else if (type === 'honeycomb') {
    const faceThickness = positive(stateInput.faceThickness, 0.0006);
    const coreThickness = positive(stateInput.coreThickness, Math.max(properties.thickness - 2 * faceThickness, 0.001));
    const shearStiffness = positive(stateInput.coreShearModulus, 85e6) * coreThickness * (1 + faceThickness / coreThickness) ** 2;
    const bending = properties.modulus * faceThickness * (coreThickness + faceThickness) ** 2 / (2 * (1 - properties.poisson ** 2));
    const term = (properties.surfaceMass ** 2 * omega ** 4 + 4 * properties.surfaceMass * omega ** 2 * shearStiffness ** 2 / bending) ** -0.5;
    modalDensity = Math.PI * properties.area * properties.surfaceMass * f / shearStiffness * (1 + term * (properties.surfaceMass * omega ** 2 + 2 * shearStiffness ** 2 / bending));
  } else if (type === 'cylinder') {
    const ringFrequency = properties.longitudinalSpeed / (TAU * radius);
    const ratio = f / ringFrequency;
    const bandShape = ratio <= 0.48 ? 2.5 * Math.sqrt(ratio) : ratio <= 0.83 ? 3.6 * ratio : 2.4 * Math.sqrt(ratio) + 0.8 * ratio;
    modalDensity = bandShape * properties.length / (Math.PI * properties.thickness * ringFrequency);
  } else {
    const base = properties.area / (4 * Math.PI) * Math.sqrt(properties.surfaceMass / properties.bendingStiffness);
    const edge = (properties.surfaceMass / properties.bendingStiffness) ** 0.25 * ((properties.length + properties.width) / Math.PI) / Math.sqrt(omega);
    const coefficient = boundary === 'free' ? 0.5 : boundary === 'clamped' ? -0.5 : boundary === 'generic' ? 0 : -0.25;
    modalDensity = TAU * Math.max(1e-12, base + coefficient * edge);
  }
  return { modalDensity: Math.max(1e-12, modalDensity) };
}

export function radiationEfficiencyAtlasState(input = {}) {
  const model = String(input.model ?? 'baffled-panel');
  const frequency = positive(input.frequency, 1000);
  const fluidDensity = positive(input.fluidDensity, AIR_RHO);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const lossFactor = positive(input.lossFactor, 0.02);
  const properties = plateProperties(input);
  const omega = TAU * frequency;
  const criticalFrequency = soundSpeed ** 2 / TAU * Math.sqrt(properties.surfaceMass / properties.bendingStiffness);
  const fundamentalFrequency = Math.sqrt(properties.bendingStiffness / properties.surfaceMass) * ((Math.PI / properties.length) ** 2 + (Math.PI / properties.width) ** 2) / TAU;
  const ringFrequency = properties.longitudinalSpeed / (TAU * positive(input.radius, 1.8));
  const boundaryFactor = String(input.boundary ?? 'simply-supported') === 'clamped' ? 2 : 1;

  const baffled = f => {
    const xi = Math.sqrt(Math.min(f / criticalFrequency, 0.999999));
    if (f < fundamentalFrequency) return 4 * properties.area * f ** 2 / soundSpeed ** 2;
    if (f < 0.99 * criticalFrequency) {
      const root = Math.sqrt(Math.max(1e-12, 1 - xi ** 2));
      const delta1 = (((1 - xi ** 2) * Math.log((1 + xi) / Math.max(1e-12, 1 - xi)) + 2 * xi) / Math.max(root ** 3, 1e-12)) / (4 * Math.PI ** 2);
      const delta2 = f < criticalFrequency / 2 ? Math.max(0, 4 / Math.PI ** 4 * (1 - 2 * xi ** 2) / Math.max(xi * root, 1e-12)) : 0;
      return boundaryFactor * (properties.perimeter * soundSpeed / (criticalFrequency * properties.area) * delta1 + 2 * soundSpeed ** 2 / (criticalFrequency ** 2 * properties.area) * delta2);
    }
    if (f <= 1.01 * criticalFrequency) return Math.sqrt(properties.length * criticalFrequency / soundSpeed) + Math.sqrt(properties.width * criticalFrequency / soundSpeed);
    return 1 / Math.sqrt(Math.max(1e-12, 1 - criticalFrequency / f));
  };

  const free = f => {
    const breakFrequency = criticalFrequency + 5 * soundSpeed / properties.perimeter;
    if (f <= breakFrequency) return properties.perimeter * soundSpeed / (Math.PI ** 2 * properties.area * criticalFrequency) * Math.sqrt(f / criticalFrequency);
    return 1 / Math.sqrt(Math.max(1e-12, 1 - criticalFrequency / f));
  };

  const evaluate = f => {
    const modal = model === 'free-panel' ? free(f) : baffled(f);
    if (model === 'honeycomb') {
      const phaseSpeed = (properties.bendingStiffness / properties.surfaceMass) ** 0.25 * Math.sqrt(TAU * f);
      const ratio = phaseSpeed / soundSpeed;
      return ratio < 1.5 ? 0.47 * ratio ** 2.24 : 1;
    }
    if (model === 'ribbed-panel') {
      const ribLength = Math.max(0, number(input.ribLength, 8));
      const ratio = f / criticalFrequency;
      const g3 = ratio ** 2 / (1 + ratio ** 2);
      const panelResistance = fluidDensity * soundSpeed * properties.area * modal;
      const ribResistance = fluidDensity * soundSpeed * Math.sqrt(soundSpeed ** 2 / (criticalFrequency * f)) * g3 * ribLength;
      return (panelResistance + ribResistance) / (fluidDensity * soundSpeed * properties.area);
    }
    if (model === 'cylindrical-shell') {
      const base = Math.max(0.1, baffled(f));
      const ringPeak = 1.8 * Math.exp(-0.5 * (Math.log2(f / ringFrequency) / 0.32) ** 2);
      const criticalPeak = 1.2 * Math.exp(-0.5 * (Math.log2(f / criticalFrequency) / 0.28) ** 2);
      const lowSlope = f < ringFrequency ? 0.1 * (f / ringFrequency) ** (5 / 6) : 0;
      return Math.max(lowSlope, base + ringPeak + criticalPeak);
    }
    if (model === 'forced-field') {
      const pointImpedance = positive(input.pointImpedance, 5000);
      const reverberationTime = positive(input.reverberationTime, 0.25);
      const forced = 13.8 * pointImpedance / (TAU * soundSpeed ** 2 * properties.surfaceMass * reverberationTime);
      return modal + forced;
    }
    return modal;
  };

  const modalEfficiency = Math.max(1e-9, evaluate(frequency));
  const baseModal = Math.max(1e-9, model === 'free-panel' ? free(frequency) : baffled(frequency));
  const forcedEfficiency = model === 'forced-field' ? Math.max(0, modalEfficiency - baseModal) : 0;
  const radiationResistance = fluidDensity * soundSpeed * properties.area * modalEfficiency;
  const panelAirClf = radiationResistance / (properties.mass * omega);
  const frequencies = logspace(Math.max(10, frequency / 16), frequency * 16, 120);
  return {
    model, frequency, fluidDensity, soundSpeed, lossFactor, properties, criticalFrequency, fundamentalFrequency,
    ringFrequency, modalEfficiency, forcedEfficiency, totalEfficiency: modalEfficiency, radiationResistance,
    panelAirClf, frequencies, curve: frequencies.map(evaluate),
    regime: frequency < fundamentalFrequency ? 'below the first panel mode' : frequency < 0.99 * criticalFrequency ? 'subcritical radiation' : frequency <= 1.01 * criticalFrequency ? 'coincidence transition' : 'supercritical radiation'
  };
}

export function drivingPointImpedanceState(input = {}) {
  const model = String(input.model ?? 'plate-center');
  const frequency = positive(input.frequency, 1000);
  const properties = plateProperties(input);
  const radius = positive(input.radius, 1.8);
  const omega = TAU * frequency;
  const modalDensity = positive(input.modalDensity, properties.area / 2 * Math.sqrt(properties.surfaceMass / properties.bendingStiffness));
  let impedance;
  let basis;
  let firstFrequency = null;
  let ringFrequency = properties.longitudinalSpeed / (TAU * radius);
  if (model === 'plate-edge') {
    impedance = 3.5 * Math.sqrt(properties.bendingStiffness * properties.surfaceMass);
    basis = 'Thin plate, force at an edge';
  } else if (model === 'rod-longitudinal') {
    const sectionArea = positive(input.sectionArea, properties.width * properties.thickness);
    impedance = sectionArea * Math.sqrt(properties.modulus * properties.density);
    basis = 'Semi-infinite rod longitudinal impedance';
  } else if (model === 'cylindrical-shell') {
    firstFrequency = 0.375 / properties.length * Math.sqrt(properties.modulus * properties.thickness / (properties.density * radius));
    if (frequency <= firstFrequency) impedance = 2.5 * properties.modulus * properties.thickness * Math.sqrt(radius / properties.length) * (properties.thickness / radius) ** 1.25 / omega;
    else if (frequency <= ringFrequency) impedance = 4 / Math.sqrt(3) * properties.density * properties.thickness ** 2 * Math.sqrt(properties.modulus / (properties.density * radius)) * (properties.modulus / properties.density) ** 0.25 / Math.sqrt(omega);
    else impedance = 4 / Math.sqrt(3) * properties.thickness ** 2 * Math.sqrt(properties.modulus * properties.density);
    basis = 'Unstiffened cylindrical-shell piecewise point impedance';
  } else if (model === 'high-frequency-general') {
    const mass = positive(input.mass, properties.mass);
    const mobility = modalDensity / (4 * mass);
    impedance = 1 / mobility;
    basis = 'General high-frequency mobility Y=n/(4M)';
  } else {
    impedance = 8 * Math.sqrt(properties.bendingStiffness * properties.surfaceMass);
    basis = 'Thin plate, force at the middle point';
  }
  const mobility = 1 / positive(impedance, 1);
  const inputForce = positive(input.forceRms, 10);
  const inputPower = 0.5 * inputForce ** 2 * mobility;
  const frequencies = logspace(Math.max(10, frequency / 16), frequency * 16, 100);
  const mobilityCurve = frequencies.map(value => {
    if (model !== 'cylindrical-shell') return mobility;
    return drivingPointImpedanceStateNoCurve({ ...input, model, frequency: value }).mobility;
  });
  return { model, frequency, properties, radius, modalDensity, impedance, mobility, conductance: mobility, inputForce, inputPower, basis, firstFrequency, ringFrequency, frequencies, mobilityCurve };
}

function drivingPointImpedanceStateNoCurve(input = {}) {
  const model = String(input.model ?? 'plate-center');
  const frequency = positive(input.frequency, 1000);
  const properties = plateProperties(input);
  const radius = positive(input.radius, 1.8);
  const omega = TAU * frequency;
  const ringFrequency = properties.longitudinalSpeed / (TAU * radius);
  let impedance;
  if (model === 'cylindrical-shell') {
    const first = 0.375 / properties.length * Math.sqrt(properties.modulus * properties.thickness / (properties.density * radius));
    if (frequency <= first) impedance = 2.5 * properties.modulus * properties.thickness * Math.sqrt(radius / properties.length) * (properties.thickness / radius) ** 1.25 / omega;
    else if (frequency <= ringFrequency) impedance = 4 / Math.sqrt(3) * properties.density * properties.thickness ** 2 * Math.sqrt(properties.modulus / (properties.density * radius)) * (properties.modulus / properties.density) ** 0.25 / Math.sqrt(omega);
    else impedance = 4 / Math.sqrt(3) * properties.thickness ** 2 * Math.sqrt(properties.modulus * properties.density);
  } else impedance = 1;
  return { mobility: 1 / positive(impedance, 1) };
}

export function clfMechanismState(input = {}) {
  const mechanism = String(input.mechanism ?? 'panel-air');
  const frequency = positive(input.frequency, 1000);
  const omega = TAU * frequency;
  const n1 = positive(input.modalDensity1, 0.04);
  const n2 = positive(input.modalDensity2, 0.18);
  const properties = plateProperties(input);
  const properties2 = plateProperties({ ...input, thickness: positive(input.thickness2, 0.004), density: positive(input.density2, 2700), modulus: positive(input.modulus2, 70e9) });
  const transmission = clamp(number(input.transmission, 0.15), 0, 1);
  const junctionLength = positive(input.junctionLength, properties.width);
  const points = Math.max(1, Math.round(number(input.pointCount, 12)));
  const angle = clamp(number(input.junctionAngle, 90), 0, 180) * Math.PI / 180;
  let forward;
  let coefficient = transmission;
  let basis;

  if (mechanism === 'l-beam') {
    const phaseSpeed = (properties.bendingStiffness / properties.surfaceMass) ** 0.25 * Math.sqrt(omega);
    const beta = phaseSpeed / properties.longitudinalSpeed;
    const family = String(input.waveConversion ?? 'bb');
    const denominator = 9 * beta ** 2 + 6 * beta + 2;
    coefficient = family === 'll' ? beta ** 2 / denominator : family === 'bl' ? (8 * beta ** 2 + 5 * beta) / denominator : (2 * beta ** 2 + 1) / denominator;
    forward = phaseSpeed * coefficient / (omega * properties.length);
    basis = `L-beam ${family.toUpperCase()} wave conversion`;
  } else if (mechanism === 'l-plates') {
    const phaseSpeed = (properties.bendingStiffness / properties.surfaceMass) ** 0.25 * Math.sqrt(omega);
    const psi = properties.density * properties.longitudinalSpeed ** 1.5 * properties.thickness ** 2.5 / (properties2.density * properties2.longitudinalSpeed ** 1.5 * properties2.thickness ** 2.5);
    const normal = 2 / (Math.sqrt(psi) + 1 / Math.sqrt(psi)) ** 2;
    const thicknessRatio = properties.thickness / properties2.thickness;
    coefficient = normal * 2.754 * thicknessRatio / (1 + 3.24 * thicknessRatio) * Math.sin(angle) ** 2;
    forward = 2 / Math.PI * phaseSpeed * junctionLength / (omega * properties.area) * coefficient;
    basis = 'L-shaped plate junction with thickness/impedance mismatch';
  } else if (mechanism === 'point-bridge') {
    const z1 = positive(input.impedance1, 4000);
    const z2 = positive(input.impedance2, 7500);
    const nOmega = n1 / TAU;
    coefficient = 4 * z1 * z2 / (z1 + z2) ** 2;
    forward = points * 2 / (Math.PI * omega * nOmega) * z1 * z2 / (z1 + z2) ** 2;
    basis = 'Point bridge between real mechanical impedances';
  } else if (mechanism === 'bolted-plates') {
    const cL1 = properties.longitudinalSpeed;
    const cL2 = properties2.longitudinalSpeed;
    const a = properties2.density * properties2.thickness ** 2 * cL2;
    const b = properties.density * properties.thickness ** 2 * cL1;
    forward = 4 * points / (properties.area * Math.sqrt(3)) * (properties.thickness * cL1 / omega) * (a * b) / (a + b) ** 2;
    coefficient = 4 * a * b / (a + b) ** 2;
    basis = 'Discrete bolted plate junction';
  } else if (mechanism === 'line-joint') {
    const phaseSpeed = (properties.bendingStiffness / properties.surfaceMass) ** 0.25 * Math.sqrt(omega);
    const groupSpeed = 2 * phaseSpeed;
    const thicknessRatio = properties2.thickness / properties.thickness;
    coefficient = 2 / (thicknessRatio ** -1.25 + thicknessRatio ** 1.25);
    forward = groupSpeed * junctionLength / (omega * Math.PI * properties.area) * coefficient;
    basis = 'Same-material plate line joint';
  } else if (mechanism === 'fairing-masslaw') {
    const volume = positive(input.volume, 60);
    const transmissionLoss = number(input.transmissionLoss, 28);
    coefficient = 10 ** (-transmissionLoss / 10);
    forward = AIR_C * properties.area / (8 * Math.PI * frequency * volume) * coefficient;
    basis = 'Nonresonant fairing mass-law acoustic path';
  } else {
    const radiationEfficiency = positive(input.radiationEfficiency, 0.35);
    const resistance = AIR_RHO * AIR_C * properties.area * radiationEfficiency;
    forward = resistance / (properties.mass * omega);
    coefficient = radiationEfficiency;
    basis = 'Panel-to-acoustic-space radiation coupling';
  }
  forward = Math.max(0, forward);
  const reverse = forward * n1 / n2;
  const reciprocityResidual = forward * n1 / Math.max(reverse * n2, 1e-30) - 1;
  return { mechanism, frequency, n1, n2, forward, reverse, coefficient, basis, properties, properties2, junctionLength, points, reciprocityResidual, couplingToLossRatio: forward / positive(input.internalLossFactor, 0.02) };
}

export function tblConvectionState(input = {}) {
  const model = String(input.model ?? 'totaro');
  const frequency = positive(input.frequency, 1000);
  const freeStreamVelocity = positive(input.freeStreamVelocity, 300);
  const displacementThickness = positive(input.displacementThickness, 0.012);
  const fixedFraction = clamp(number(input.fixedFraction, 0.75), 0.1, 1.2);
  const evaluateFraction = f => {
    const reducedFrequency = TAU * f * displacementThickness / freeStreamVelocity;
    if (model === 'constant') return fixedFraction;
    if (model === 'attached-envelope') return clamp(0.68 + 0.12 * Math.exp(-0.7 * reducedFrequency), 0.55, 0.82);
    if (model === 'separated-envelope') return clamp(0.42 + 0.16 * Math.exp(-0.35 * reducedFrequency), 0.35, 0.62);
    return 0.6 + 0.4 * Math.exp(-2.2 * reducedFrequency);
  };
  const convectionFraction = evaluateFraction(frequency);
  const convectionVelocity = convectionFraction * freeStreamVelocity;
  const convectiveWavenumber = TAU * frequency / convectionVelocity;
  const frequencies = logspace(20, 10000, 120);
  const fractions = frequencies.map(evaluateFraction);
  return { model, frequency, freeStreamVelocity, displacementThickness, fixedFraction, convectionFraction, convectionVelocity, convectiveWavenumber, convectiveWavelength: convectionVelocity / frequency, reducedFrequency: TAU * frequency * displacementThickness / freeStreamVelocity, frequencies, fractions, velocities: fractions.map(value => value * freeStreamVelocity), flowRegime: model.includes('separated') ? 'separated-flow screening envelope' : model.includes('attached') ? 'attached-boundary-layer screening envelope' : model === 'totaro' ? 'Totaro frequency-dependent relation' : 'constant convection fraction' };
}

export function equivalentPowerInjectionState(input = {}) {
  const source = String(input.source ?? 'diffuse');
  const frequency = positive(input.frequency, 1000);
  const bandwidth = positive(input.bandwidth, frequency * (2 ** (1 / 6) - 2 ** (-1 / 6)));
  const pressureRms = positive(input.pressureRms, 200);
  const pressureSquared = pressureRms ** 2;
  const properties = plateProperties(input);
  const modalDensity = positive(input.modalDensity, properties.area / 2 * Math.sqrt(properties.surfaceMass / properties.bendingStiffness));
  const radiationEfficiency = positive(input.radiationEfficiency, 0.3);
  const convectionVelocity = positive(input.convectionVelocity, 220);
  const phaseSpeed = (properties.bendingStiffness / properties.surfaceMass) ** 0.25 * Math.sqrt(TAU * frequency);
  const supportLength = positive(input.supportLength, properties.length);
  const a1 = positive(input.a1, 1);
  const a2 = positive(input.a2, 1);
  const alphaX = positive(input.alphaX, 0.12);
  const alphaZ = positive(input.alphaZ, 0.7);
  const omega = TAU * frequency;
  const correlationLengthX = convectionVelocity / (alphaX * omega);
  const correlationLengthZ = convectionVelocity / (alphaZ * omega);
  const coincidenceFrequency = convectionVelocity ** 2 / TAU * Math.sqrt(properties.surfaceMass / properties.bendingStiffness);
  const coincidenceRatio = frequency / coincidenceFrequency;
  const corcosAcceptance = 1 / (1 + (Math.log(Math.max(coincidenceRatio, 1e-12)) / 0.65) ** 2);
  let injectedPower;
  let basis;
  if (source === 'tbl-slow') {
    injectedPower = properties.area * pressureSquared / (Math.PI ** 2 * frequency * properties.surfaceMass) * (convectionVelocity / phaseSpeed);
    basis = 'Lyon–DeJong hydrodynamically slow TBL power';
  } else if (source === 'tbl-fast') {
    injectedPower = properties.area * pressureSquared / (TAU * frequency * properties.surfaceMass) * (convectionVelocity / phaseSpeed) ** 3 * (a1 / 6 + a2 * (convectionVelocity / (TAU * frequency * supportLength)) ** 2);
    basis = 'Lyon–DeJong hydrodynamically fast TBL power';
  } else if (source === 'corcos') {
    const pressurePsd = pressureSquared / bandwidth;
    injectedPower = convectionVelocity ** 2 * properties.area * pressurePsd * bandwidth / (2 * alphaX * alphaZ * Math.PI * Math.sqrt(properties.surfaceMass * properties.bendingStiffness) * omega ** 2) * corcosAcceptance;
    basis = 'Corcos frequency-averaged injected-power screen';
  } else if (source === 'point-force') {
    const forceRms = positive(input.forceRms, 10);
    const conductance = positive(input.conductance, 1e-4);
    injectedPower = 0.5 * forceRms ** 2 * conductance;
    basis = 'Point-force input power from drive-point conductance';
  } else {
    const modalSpacing = 1 / modalDensity;
    injectedPower = AIR_C ** 2 * radiationEfficiency * pressureSquared / (4 * Math.PI * frequency ** 2 * modalSpacing * properties.surfaceMass);
    basis = 'Diffuse acoustic field equivalent power';
  }
  const incidentAcousticPower = pressureSquared * properties.area / (4 * AIR_RHO * AIR_C);
  const acceptance = injectedPower / Math.max(incidentAcousticPower, 1e-30);
  const velocities = logspace(40, 500, 100);
  const velocityCurve = velocities.map(value => {
    if (source === 'corcos') {
      const fc = value ** 2 / TAU * Math.sqrt(properties.surfaceMass / properties.bendingStiffness);
      const accept = 1 / (1 + (Math.log(Math.max(frequency / fc, 1e-12)) / 0.65) ** 2);
      return value ** 2 * properties.area * (pressureSquared / bandwidth) * bandwidth / (2 * alphaX * alphaZ * Math.PI * Math.sqrt(properties.surfaceMass * properties.bendingStiffness) * omega ** 2) * accept;
    }
    return injectedPower;
  });
  return { source, frequency, bandwidth, pressureRms, pressureSquared, properties, modalDensity, radiationEfficiency, convectionVelocity, phaseSpeed, supportLength, a1, a2, alphaX, alphaZ, correlationLengthX, correlationLengthZ, coincidenceFrequency, coincidenceRatio, corcosAcceptance, injectedPower, incidentAcousticPower, acceptance, basis, velocities, velocityCurve, regime: source.startsWith('tbl') || source === 'corcos' ? (convectionVelocity > phaseSpeed ? 'convective field is faster than the selected bending phase speed' : 'convective field is slower than the selected bending phase speed') : source === 'point-force' ? 'localized mechanical power input' : 'diffuse-field resonant power input' };
}

export function equipmentLoadingState(input = {}) {
  const unloadedResponse = positive(input.unloadedResponse, 12);
  const bareStructureMass = positive(input.bareStructureMass, 180);
  const equipmentMass = Math.max(0, number(input.equipmentMass, 45));
  const structureSurfaceMass = positive(input.structureSurfaceMass, 12);
  const footprintArea = positive(input.footprintArea, 0.35);
  const equipmentAreaDensity = equipmentMass / footprintArea;
  const globalMeanSquareFactor = bareStructureMass / (bareStructureMass + equipmentMass);
  const localMeanSquareFactor = structureSurfaceMass / (structureSurfaceMass + equipmentAreaDensity);
  const globalResponse = unloadedResponse * Math.sqrt(globalMeanSquareFactor);
  const localResponse = unloadedResponse * Math.sqrt(localMeanSquareFactor);
  return { unloadedResponse, bareStructureMass, equipmentMass, structureSurfaceMass, footprintArea, equipmentAreaDensity, globalMeanSquareFactor, localMeanSquareFactor, globalResponse, localResponse, conservativeResponse: Math.max(globalResponse, localResponse), methodSpreadDb: 20 * Math.log10(Math.max(globalResponse, localResponse) / Math.max(Math.min(globalResponse, localResponse), 1e-30)), localMassRatio: equipmentAreaDensity / structureSurfaceMass, globalMassRatio: equipmentMass / bareStructureMass };
}

export function seaResponseRecoveryState(input = {}) {
  const kind = String(input.kind ?? 'structural');
  const responseType = String(input.responseType ?? 'broadband');
  const frequency = positive(input.frequency, 1000);
  const energy = positive(input.energy, 0.02);
  const mass = positive(input.mass, 120);
  const volume = positive(input.volume, 45);
  const fluidDensity = positive(input.fluidDensity, AIR_RHO);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const modalDensity = positive(input.modalDensity, 0.04);
  const lossFactor = positive(input.lossFactor, 0.02);
  const bandwidth = positive(input.bandwidth, frequency * (2 ** (1 / 6) - 2 ** (-1 / 6)));
  const dimension = clamp(Math.round(number(input.dimension, 2)), 1, 3);
  const wavelength = positive(input.wavelength, soundSpeed / frequency);
  const boundaryDistance = Math.max(0, number(input.boundaryDistance, wavelength));
  const omega = TAU * frequency;
  const velocityRms = kind === 'structural' ? Math.sqrt(energy / mass) : Math.sqrt(energy / (fluidDensity * volume));
  const accelerationRms = omega * velocityRms;
  const pressureRms = kind === 'acoustic' ? Math.sqrt(energy * fluidDensity * soundSpeed ** 2 / volume) : null;
  const levelDb = pressureRms === null ? null : 20 * Math.log10(pressureRms / PREF);
  const properties = plateProperties(input);
  const bendingWavenumber = (properties.surfaceMass * omega ** 2 / properties.bendingStiffness) ** 0.25;
  const displacementRms = velocityRms / omega;
  const bendingStressRms = kind === 'structural' ? properties.modulus * properties.thickness / 2 * bendingWavenumber ** 2 * displacementRms : null;
  const modalSpacing = 1 / modalDensity;
  const participatingModes = Math.PI / 2 * frequency * lossFactor / modalSpacing;
  const modeShapeMaximumSquared = 2 * dimension;
  const pureToneMeanSquareRatio = Math.max(1, participatingModes * modeShapeMaximumSquared);
  const broadbandMeanSquareRatio = Math.max(1, 1 + (Math.PI * lossFactor * frequency / (2 * modalSpacing) * modeShapeMaximumSquared - 1) * Math.PI * lossFactor * frequency / (2 * bandwidth));
  const concentrationMeanSquareRatio = responseType === 'pure-tone' ? pureToneMeanSquareRatio : broadbandMeanSquareRatio;
  const concentrationAmplitudeFactor = Math.sqrt(concentrationMeanSquareRatio);
  const boundaryRegion = boundaryDistance < wavelength / 4;
  return { kind, responseType, frequency, energy, mass, volume, fluidDensity, soundSpeed, modalDensity, lossFactor, bandwidth, dimension, wavelength, boundaryDistance, velocityRms, accelerationRms, pressureRms, levelDb, displacementRms, bendingStressRms, bendingWavenumber, modalSpacing, participatingModes, modeShapeMaximumSquared, pureToneMeanSquareRatio, broadbandMeanSquareRatio, concentrationMeanSquareRatio, concentrationAmplitudeFactor, localVelocityEstimate: velocityRms * concentrationAmplitudeFactor, localAccelerationEstimate: accelerationRms * concentrationAmplitudeFactor, localPressureEstimate: pressureRms === null ? null : pressureRms * concentrationAmplitudeFactor, boundaryRegion };
}

export function installedFairingSeaState(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const outsideLevel = number(input.outsideLevel, 145);
  const area = positive(input.area, 55);
  const interiorVolume = positive(input.interiorVolume, 75);
  const exteriorVolume = positive(input.exteriorVolume, 150);
  const surfaceMass = positive(input.surfaceMass, 8.5);
  const shellModalDensity = positive(input.shellModalDensity, 0.045);
  const shellLossFactor = positive(input.shellLossFactor, 0.018);
  const radiationEfficiency = positive(input.radiationEfficiency, 0.35);
  const blanketCoverage = clamp(number(input.blanketCoverage, 0.8), 0, 1);
  const blanketInsertionLoss = Math.max(0, number(input.blanketInsertionLoss, 18));
  const blanketAbsorption = clamp(number(input.blanketAbsorption, 0.65), 0, 1);
  const equipmentMass = Math.max(0, number(input.equipmentMass, 250));
  const leakAreaFraction = clamp(number(input.leakAreaFraction, 0.0005), 0, 0.2);
  const omega = TAU * frequency;
  const shellMass = surfaceMass * area + equipmentMass;
  const exteriorLength = Math.cbrt(exteriorVolume);
  const interiorLength = Math.cbrt(interiorVolume);
  const acousticDensity = length => 4 * Math.PI * length ** 3 * frequency ** 2 / AIR_C ** 3 + 3 * Math.PI * length ** 2 * frequency / AIR_C ** 2 + 12 * length / (8 * AIR_C);
  const exteriorModalDensity = acousticDensity(exteriorLength);
  const interiorModalDensity = acousticDensity(interiorLength);
  const exteriorLoss = positive(input.exteriorLossFactor, 0.04);
  const baselineInteriorLoss = positive(input.interiorLossFactor, 0.018);
  const addedAbsorptionLoss = AIR_C * blanketCoverage * area * blanketAbsorption / (4 * omega * interiorVolume);
  const interiorLoss = baselineInteriorLoss + addedAbsorptionLoss;
  const panelAirClf = AIR_RHO * AIR_C * area * radiationEfficiency / (shellMass * omega);
  const componentMassLawTl = Math.max(0, 20 * Math.log10(Math.max(1, omega * surfaceMass / (2 * AIR_RHO * AIR_C))) - 5);
  const blanketTransmission = 10 ** (-blanketInsertionLoss / 10);
  const coverageTransmission = (1 - blanketCoverage) + blanketCoverage * blanketTransmission;
  const panelTransmission = 10 ** (-componentMassLawTl / 10);
  const effectiveTransmission = panelTransmission * coverageTransmission + leakAreaFraction;
  const directClf = AIR_C * area / (8 * Math.PI * frequency * exteriorVolume) * effectiveTransmission;
  const outsidePressure = PREF * 10 ** (outsideLevel / 20);
  const targetExteriorEnergy = exteriorVolume * outsidePressure ** 2 / (AIR_RHO * AIR_C ** 2);
  const sourcePower = omega * exteriorLoss * targetExteriorEnergy;
  const subsystems = [
    { name: 'Exterior acoustic field', kind: 'acoustic', modalDensity: exteriorModalDensity, lossFactor: exteriorLoss, volume: exteriorVolume, density: AIR_RHO, soundSpeed: AIR_C, inputPower: sourcePower },
    { name: 'Fairing shell and installed equipment', kind: 'structural', modalDensity: shellModalDensity, lossFactor: shellLossFactor, mass: shellMass, inputPower: 0 },
    { name: 'Blanketed payload cavity', kind: 'acoustic', modalDensity: interiorModalDensity, lossFactor: interiorLoss, volume: interiorVolume, density: AIR_RHO, soundSpeed: AIR_C, inputPower: 0 }
  ];
  const links = [
    { i: 0, j: 1, forward: panelAirClf * shellModalDensity / exteriorModalDensity },
    { i: 1, j: 2, forward: panelAirClf },
    { i: 0, j: 2, forward: directClf }
  ];
  const network = seaNetworkState({ frequency, subsystems, links, sourceIndex: 0, receiverIndex: 2 });
  const sourceLevel = network.subsystemResults[0].levelDb;
  const receiverLevel = network.subsystemResults[2].levelDb;
  const installedNoiseReduction = sourceLevel - receiverLevel;
  return { frequency, outsideLevel, area, interiorVolume, exteriorVolume, surfaceMass, shellModalDensity, shellLossFactor, radiationEfficiency, blanketCoverage, blanketInsertionLoss, blanketAbsorption, equipmentMass, leakAreaFraction, shellMass, exteriorModalDensity, interiorModalDensity, exteriorLoss, baselineInteriorLoss, addedAbsorptionLoss, interiorLoss, panelAirClf, componentMassLawTl, blanketTransmission, coverageTransmission, panelTransmission, effectiveTransmission, directClf, sourcePower, network, sourceLevel, receiverLevel, installedNoiseReduction, shellVelocity: network.subsystemResults[1].velocityRms, directPower: network.powerFlows.find(flow => flow.i === 0 && flow.j === 2)?.net ?? 0, resonantPower: network.powerFlows.find(flow => flow.i === 0 && flow.j === 1)?.net ?? 0 };
}

export function seaParameterWorkbenchState(input = {}) {
  const presetKey = Object.hasOwn(SEA_PARAMETER_PRESETS, input.preset) ? input.preset : 'honeycombFairing';
  const preset = SEA_PARAMETER_PRESETS[presetKey];
  const frequency = positive(input.frequency, 1000);
  const lossSource = String(input.lossSource ?? 'empirical');
  const source = String(input.source ?? 'diffuse');
  const common = { ...preset, ...input, type: input.type ?? preset.subsystem, frequency };
  const modal = modalDensityAtlasState(common);
  const empirical = empiricalLossFactorState({ frequency, construction: input.construction ?? preset.construction });
  const selectedLossFactor = lossSource === 'measured' ? positive(input.measuredLossFactor, empirical.lossFactor) : lossSource === 'assumed' ? positive(input.assumedLossFactor, 0.02) : empirical.lossFactor;
  const acoustic = preset.subsystem === 'acoustic-3d';
  let radiation = null;
  let coupling = null;
  let injection = null;
  if (!acoustic) {
    const radiationModel = preset.subsystem === 'honeycomb' ? 'honeycomb' : preset.subsystem === 'cylinder' ? 'cylindrical-shell' : 'baffled-panel';
    radiation = radiationEfficiencyAtlasState({ ...common, model: radiationModel, lossFactor: selectedLossFactor });
    coupling = clfMechanismState({ ...common, mechanism: 'panel-air', modalDensity1: modal.modalDensity, modalDensity2: positive(input.acousticModalDensity, 0.18), radiationEfficiency: radiation.totalEfficiency, internalLossFactor: selectedLossFactor });
    const convection = tblConvectionState({ frequency, model: input.convectionModel ?? 'totaro', freeStreamVelocity: input.freeStreamVelocity, displacementThickness: input.displacementThickness });
    injection = equivalentPowerInjectionState({ ...common, source, modalDensity: modal.modalDensity, radiationEfficiency: radiation.totalEfficiency, pressureRms: input.pressureRms, forceRms: input.forceRms, conductance: input.conductance, convectionVelocity: convection.convectionVelocity });
  }
  const externalPower = acoustic ? positive(input.externalPower, 1) : injection.injectedPower;
  const totalLoss = selectedLossFactor + (coupling?.forward ?? 0);
  const energy = externalPower / (TAU * frequency * Math.max(totalLoss, 1e-12));
  const recovery = seaResponseRecoveryState({ ...common, kind: acoustic ? 'acoustic' : 'structural', energy, mass: modal.properties.mass, volume: positive(input.height, preset.height ?? 1.5) * modal.properties.area, modalDensity: modal.modalDensity, lossFactor: totalLoss, wavelength: modal.wavelength, responseType: input.responseType ?? 'broadband' });
  const sourceScores = { measured: 0.92, empirical: 0.7, assumed: 0.45 };
  const confidenceScore = 100 * sourceScores[lossSource in sourceScores ? lossSource : 'empirical'] * (modal.modesInBand >= 5 ? 1 : modal.modesInBand >= 2 ? 0.75 : 0.5) * (modal.modalOverlap >= 1 ? 1 : modal.modalOverlap >= 0.3 ? 0.8 : 0.55);
  return { presetKey, preset, frequency, lossSource, source, modal, empirical, selectedLossFactor, acoustic, radiation, coupling, injection, externalPower, totalLoss, energy, recovery, confidenceScore, provenance: [
    ['Geometry and material', 'Entered or launch-vehicle preset', preset.label],
    ['Modal density', 'Analytical', modal.basis],
    ['Dissipation loss', lossSource, lossSource === 'empirical' ? empirical.label : `${lossSource} value`],
    ['Radiation efficiency', acoustic ? 'Not applicable' : 'Analytical/empirical screen', acoustic ? 'Acoustic subsystem' : radiation.model],
    ['Coupling loss factor', acoustic ? 'Not applicable' : 'Derived', acoustic ? 'Acoustic subsystem' : coupling.basis],
    ['External power', acoustic ? 'Entered' : 'Derived', acoustic ? 'Direct band power' : injection.basis],
    ['Recovered response', 'Derived from subsystem energy', acoustic ? 'Pressure and SPL' : 'Velocity, acceleration, stress, concentration']
  ] };
}
