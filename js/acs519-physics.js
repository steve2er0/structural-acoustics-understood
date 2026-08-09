/* Shared ACS 519 learning models used by calculators, demos, and tests. */

const TAU = 2 * Math.PI;
const AIR_RHO = 1.204;
const AIR_C = 343;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback) => Math.max(1e-12, number(value, fallback));
const logspace = (start, stop, count) => Array.from({ length: count }, (_, index) => start * (stop / start) ** (index / Math.max(1, count - 1)));
const phaseDegrees = ({ re, im }) => Math.atan2(im, re) * 180 / Math.PI;
const magnitude = ({ re, im }) => Math.hypot(re, im);
const multiply = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const add = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
const scale = (a, value) => ({ re: a.re * value, im: a.im * value });
const phasor = angle => ({ re: Math.cos(angle), im: Math.sin(angle) });

function simpson(fn, a, b, requested = 160) {
  const count = Math.max(2, Math.round(requested / 2) * 2);
  const step = (b - a) / count;
  let total = fn(a) + fn(b);
  for (let index = 1; index < count; index += 1) total += (index % 2 ? 4 : 2) * fn(a + index * step);
  return total * step / 3;
}

function expIntegral(wavenumber, length) {
  if (Math.abs(wavenumber * length) < 1e-7) return { re: length, im: 0 };
  return {
    re: Math.sin(wavenumber * length) / wavenumber,
    im: -(1 - Math.cos(wavenumber * length)) / wavenumber
  };
}

function sineTransform(mode, length, projectedWavenumber) {
  const modalWavenumber = mode * Math.PI / length;
  const minus = expIntegral(projectedWavenumber - modalWavenumber, length);
  const plus = expIntegral(projectedWavenumber + modalWavenumber, length);
  const difference = { re: minus.re - plus.re, im: minus.im - plus.im };
  return { re: difference.im / 2, im: -difference.re / 2 };
}

function modalRadiationEfficiency({ length, width, modeX, modeY, acousticWavenumber, thetaCount = 18, phiCount = 36 }) {
  const dTheta = (Math.PI / 2) / thetaCount;
  const dPhi = TAU / phiCount;
  let angularIntegral = 0;
  for (let ti = 0; ti < thetaCount; ti += 1) {
    const theta = (ti + 0.5) * dTheta;
    const radial = acousticWavenumber * Math.sin(theta);
    for (let pi = 0; pi < phiCount; pi += 1) {
      const phi = (pi + 0.5) * dPhi;
      const ix = sineTransform(modeX, length, radial * Math.cos(phi));
      const iy = sineTransform(modeY, width, radial * Math.sin(phi));
      angularIntegral += (ix.re * ix.re + ix.im * ix.im) * (iy.re * iy.re + iy.im * iy.im) * Math.sin(theta) * dTheta * dPhi;
    }
  }
  return acousticWavenumber ** 2 * angularIntegral / (Math.PI ** 2 * length * width);
}

export function modalRadiationState(input = {}) {
  const length = positive(input.length, 1.8);
  const width = positive(input.width, 1.1);
  const modeX = Math.max(1, Math.round(number(input.modeX, 1)));
  const modeY = Math.max(1, Math.round(number(input.modeY, 1)));
  const frequency = positive(input.frequency, 350);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const k0 = TAU * frequency / soundSpeed;
  const kx = modeX * Math.PI / length;
  const ky = modeY * Math.PI / width;
  const kmn = Math.hypot(kx, ky);
  const gamma = k0 / kmn;
  const sigma = modalRadiationEfficiency({ length, width, modeX, modeY, acousticWavenumber: k0, thetaCount: 22, phiCount: 44 });
  const parity = `${modeX % 2 ? 'odd' : 'even'}-${modeY % 2 ? 'odd' : 'even'}`;
  const theta = Array.from({ length: 91 }, (_, index) => index * Math.PI / 180);
  const phi = number(input.azimuth, 0) * Math.PI / 180;
  const directivity = theta.map(angle => {
    const projected = k0 * Math.sin(angle);
    const ix = sineTransform(modeX, length, projected * Math.cos(phi));
    const iy = sineTransform(modeY, width, projected * Math.sin(phi));
    return Math.sqrt((ix.re * ix.re + ix.im * ix.im) * (iy.re * iy.re + iy.im * iy.im));
  });
  const directivityMax = Math.max(...directivity, 1e-30);
  const gammaCurve = logspace(0.08, 3, 42);
  const curve = gammaCurve.map(value => modalRadiationEfficiency({
    length,
    width,
    modeX,
    modeY,
    acousticWavenumber: value * kmn,
    thetaCount: 12,
    phiCount: 24
  }));
  return {
    length, width, modeX, modeY, frequency, soundSpeed, k0, kx, ky, kmn, gamma, sigma, parity,
    regime: gamma < 0.85 ? 'subcritical cancellation' : gamma <= 1.2 ? 'coincidence transition' : 'supercritical radiation',
    thetaDegrees: theta.map(value => value * 180 / Math.PI),
    directivity: directivity.map(value => value / directivityMax),
    gammaCurve,
    sigmaCurve: curve
  };
}

export function besselJ1(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  if (x === 0) return 0;
  if (x <= 12) {
    let term = x / 2;
    let sum = term;
    for (let index = 1; index < 80; index += 1) {
      term *= -(x * x / 4) / (index * (index + 1));
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sign * sum;
  }
  const phase = x - 3 * Math.PI / 4;
  return sign * Math.sqrt(2 / (Math.PI * x)) * (Math.cos(phase) - 3 * Math.sin(phase) / (8 * x));
}

export function struveH1(value) {
  const z = Math.abs(value);
  const integral = simpson(t => Math.sqrt(Math.max(0, 1 - t * t)) * Math.sin(z * t), 0, 1, Math.max(180, Math.ceil(z * 36)));
  return 2 * z / Math.PI * integral;
}

export function pistonRadiationState(input = {}) {
  const radius = positive(input.radius, 0.12);
  const frequency = positive(input.frequency, 800);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const density = positive(input.density, AIR_RHO);
  const k = TAU * frequency / soundSpeed;
  const ka = k * radius;
  const area = Math.PI * radius * radius;
  const resistance = ka < 1e-8 ? 0 : 1 - besselJ1(2 * ka) / ka;
  const reactance = ka < 1e-8 ? 0 : struveH1(2 * ka) / ka;
  const radiationImpedanceMagnitude = density * soundSpeed * area * Math.hypot(resistance, reactance);
  const addedMass = reactance * density * soundSpeed * area / (TAU * frequency);
  const lowKaAddedMass = 8 * density * radius ** 3 / 3;
  const angles = Array.from({ length: 181 }, (_, index) => index * Math.PI / 360);
  const directivity = angles.map(angle => {
    const argument = ka * Math.sin(angle);
    return Math.abs(argument) < 1e-8 ? 1 : 2 * besselJ1(argument) / argument;
  });
  const kaCurve = logspace(0.02, 20, 100);
  return {
    radius, frequency, soundSpeed, density, area, k, ka,
    resistance, reactance, radiationEfficiency: resistance,
    radiationImpedanceMagnitude, addedMass, lowKaAddedMass,
    regime: ka < 0.5 ? 'compact, mass-loaded radiator' : ka < 3 ? 'directivity transition' : 'directional, resistance-dominated radiator',
    anglesDegrees: angles.map(angle => angle * 180 / Math.PI),
    directivity,
    kaCurve,
    resistanceCurve: kaCurve.map(value => 1 - besselJ1(2 * value) / value),
    reactanceCurve: kaCurve.map(value => struveH1(2 * value) / value)
  };
}

export function shellAcousticsState(input = {}) {
  const radius = positive(input.radius, 1.8);
  const length = positive(input.length, 7.5);
  const thickness = positive(input.thickness, 0.004);
  const modulus = positive(input.modulus, 70e9);
  const density = positive(input.density, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const axialOrder = Math.max(1, Math.round(number(input.axialOrder, 1)));
  const circumferentialOrder = Math.max(0, Math.round(number(input.circumferentialOrder, 2)));
  const axialBoundary = input.axialBoundary === 'clamped' ? 'clamped' : 'simply-supported';
  const clampedRoots = [4.730040745, 7.853204624, 10.99560784, 14.13716549];
  const axialFactor = axialBoundary === 'clamped' ? clampedRoots[axialOrder - 1] || (axialOrder + 0.5) * Math.PI : axialOrder * Math.PI;
  const membraneSpeed = Math.sqrt(modulus / (density * (1 - poisson ** 2)));
  const ringFrequency = membraneSpeed / (TAU * radius);
  const bendingStiffness = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const surfaceMass = density * thickness;
  const criticalFrequency = soundSpeed ** 2 / TAU * Math.sqrt(surfaceMass / bendingStiffness);
  const axialWavenumber = axialFactor / length;
  const circumferentialWavenumber = circumferentialOrder / radius;
  const shellWavenumber = Math.hypot(axialWavenumber, circumferentialWavenumber);
  const membraneTerm = (membraneSpeed / radius) ** 2 * (axialWavenumber / Math.max(shellWavenumber, 1e-12)) ** 4;
  const bendingTerm = bendingStiffness / surfaceMass * shellWavenumber ** 4;
  const modeFrequency = Math.sqrt(membraneTerm + bendingTerm) / TAU;
  const firstAcousticCuton = 1.84118 * soundSpeed / (TAU * radius);
  const nValues = Array.from({ length: 17 }, (_, index) => index);
  const modeCurve = nValues.map(order => {
    const kn = order / radius;
    const ks = Math.hypot(axialWavenumber, kn);
    const membrane = (membraneSpeed / radius) ** 2 * (axialWavenumber / Math.max(ks, 1e-12)) ** 4;
    const bending = bendingStiffness / surfaceMass * ks ** 4;
    return Math.sqrt(membrane + bending) / TAU;
  });
  const minimumIndex = modeCurve.indexOf(Math.min(...modeCurve));
  return {
    radius, length, thickness, modulus, density, poisson, soundSpeed, axialOrder, circumferentialOrder, axialBoundary, axialFactor,
    membraneSpeed, ringFrequency, bendingStiffness, surfaceMass, criticalFrequency, axialWavenumber,
    circumferentialWavenumber, shellWavenumber, modeFrequency, firstAcousticCuton,
    minimumFrequencyOrder: minimumIndex,
    nValues, modeCurve,
    regime: modeFrequency < ringFrequency ? 'curvature-dominated low-frequency shell mode' : modeFrequency < criticalFrequency ? 'shell bending below acoustic coincidence' : 'efficient-radiation candidate above coincidence'
  };
}

export function feBePlannerState(input = {}) {
  const maximumFrequency = positive(input.maximumFrequency, 2000);
  const length = positive(input.length, 4);
  const width = positive(input.width, 2);
  const depth = positive(input.depth, 1.5);
  const thickness = positive(input.thickness, 0.004);
  const modulus = positive(input.modulus, 70e9);
  const density = positive(input.density, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const structuralElementsPerWave = Math.max(4, number(input.structuralElementsPerWave, 10));
  const acousticElementsPerWave = Math.max(4, number(input.acousticElementsPerWave, 8));
  const omega = TAU * maximumFrequency;
  const bendingStiffness = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const surfaceMass = density * thickness;
  const bendingWavenumber = (surfaceMass * omega ** 2 / bendingStiffness) ** 0.25;
  const bendingWavelength = TAU / bendingWavenumber;
  const acousticWavelength = soundSpeed / maximumFrequency;
  const structuralElementSize = bendingWavelength / structuralElementsPerWave;
  const acousticElementSize = acousticWavelength / acousticElementsPerWave;
  const structuralArea = length * width;
  const acousticBoundaryArea = 2 * (length * width + length * depth + width * depth);
  const structuralElements = Math.ceil(structuralArea / structuralElementSize ** 2);
  const acousticElements = Math.ceil(acousticBoundaryArea / acousticElementSize ** 2);
  const wavelengthRatio = bendingWavelength / acousticWavelength;
  const linearDispersionBias = 100 * (bendingWavenumber * structuralElementSize) ** 2 / 12;
  const beStorageIndex = acousticElements ** 2;
  const beSolveIndex = acousticElements ** 3;
  const cavityModes = [];
  for (let nx = 1; nx <= 4; nx += 1) for (let ny = 1; ny <= 4; ny += 1) for (let nz = 1; nz <= 4; nz += 1) {
    cavityModes.push(soundSpeed / 2 * Math.sqrt((nx / length) ** 2 + (ny / width) ** 2 + (nz / depth) ** 2));
  }
  const nearestInteriorResonance = cavityModes.reduce((best, value) => Math.abs(value - maximumFrequency) < Math.abs(best - maximumFrequency) ? value : best, cavityModes[0]);
  const uniquenessSeparation = Math.abs(nearestInteriorResonance - maximumFrequency) / maximumFrequency;
  return {
    maximumFrequency, length, width, depth, thickness, modulus, density, poisson, soundSpeed,
    structuralElementsPerWave, acousticElementsPerWave, bendingStiffness, surfaceMass, bendingWavenumber,
    bendingWavelength, acousticWavelength, structuralElementSize, acousticElementSize, structuralElements,
    acousticElements, wavelengthRatio, linearDispersionBias, beStorageIndex, beSolveIndex,
    nearestInteriorResonance, uniquenessSeparation,
    regime: wavelengthRatio < 1 ? 'structural mesh controls the coupled resolution' : 'acoustic mesh controls the coupled resolution'
  };
}

function panelTauAtAngle({ frequency, angle, surfaceMass, bendingStiffness, lossFactor, density, soundSpeed }) {
  const omega = TAU * frequency;
  const cosAngle = Math.max(1e-5, Math.cos(angle));
  const parallelWavenumber = omega / soundSpeed * Math.sin(angle);
  const fluidImpedance = density * soundSpeed / cosAngle;
  const structuralReal = bendingStiffness * lossFactor * parallelWavenumber ** 4 / omega;
  const structuralImaginary = (surfaceMass * omega ** 2 - bendingStiffness * parallelWavenumber ** 4) / omega;
  const denominatorReal = 2 * fluidImpedance + structuralReal;
  const denominatorImaginary = structuralImaginary;
  return clamp((2 * fluidImpedance) ** 2 / (denominatorReal ** 2 + denominatorImaginary ** 2), 1e-14, 1);
}

export function panelTransmissionState(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const thickness = positive(input.thickness, 0.003);
  const modulus = positive(input.modulus, 70e9);
  const panelDensity = positive(input.panelDensity, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const lossFactor = positive(input.lossFactor, 0.02);
  const fluidDensity = positive(input.fluidDensity, AIR_RHO);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const incidenceDegrees = clamp(number(input.incidenceDegrees, 45), 0, 85);
  const surfaceMass = panelDensity * thickness;
  const bendingStiffness = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const criticalFrequency = soundSpeed ** 2 / TAU * Math.sqrt(surfaceMass / bendingStiffness);
  const tauAngle = panelTauAtAngle({ frequency, angle: incidenceDegrees * Math.PI / 180, surfaceMass, bendingStiffness, lossFactor, density: fluidDensity, soundSpeed });
  const tauNormal = panelTauAtAngle({ frequency, angle: 0, surfaceMass, bendingStiffness, lossFactor, density: fluidDensity, soundSpeed });
  const cutoff = 78 * Math.PI / 180;
  const diffuseNumerator = simpson(angle => panelTauAtAngle({ frequency, angle, surfaceMass, bendingStiffness, lossFactor, density: fluidDensity, soundSpeed }) * Math.sin(2 * angle), 0, cutoff, 180);
  const diffuseTau = clamp(diffuseNumerator / Math.sin(cutoff) ** 2, 1e-14, 1);
  const frequencies = logspace(Math.max(10, criticalFrequency / 20), criticalFrequency * 12, 100);
  const diffuseCurve = frequencies.map(value => {
    const integral = simpson(angle => panelTauAtAngle({ frequency: value, angle, surfaceMass, bendingStiffness, lossFactor, density: fluidDensity, soundSpeed }) * Math.sin(2 * angle), 0, cutoff, 80);
    return -10 * Math.log10(clamp(integral / Math.sin(cutoff) ** 2, 1e-14, 1));
  });
  return {
    frequency, thickness, modulus, panelDensity, poisson, lossFactor, fluidDensity, soundSpeed, incidenceDegrees,
    surfaceMass, bendingStiffness, criticalFrequency, tauAngle, tauNormal, diffuseTau,
    tlAngle: -10 * Math.log10(tauAngle), tlNormal: -10 * Math.log10(tauNormal), diffuseTl: -10 * Math.log10(diffuseTau),
    frequencies, diffuseCurve,
    regime: frequency < 0.8 * criticalFrequency ? 'mass-controlled below coincidence' : frequency < 1.5 * criticalFrequency ? 'coincidence-sensitive transition' : 'post-coincidence stiffness and damping regime'
  };
}

export function orthotropicPanelState(input = {}) {
  const d11 = positive(input.d11, 8500);
  const d22 = positive(input.d22, 2600);
  const d12 = positive(input.d12, 900);
  const d66 = positive(input.d66, 1200);
  const surfaceMass = positive(input.surfaceMass, 7.2);
  const frequency = positive(input.frequency, 1000);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const directionDegrees = clamp(number(input.directionDegrees, 0), 0, 180);
  const directions = Array.from({ length: 181 }, (_, index) => index);
  const rigidity = angleDegrees => {
    const angle = angleDegrees * Math.PI / 180;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return d11 * c ** 4 + 2 * (d12 + 2 * d66) * s ** 2 * c ** 2 + d22 * s ** 4;
  };
  const stiffnessCurve = directions.map(rigidity);
  const criticalCurve = stiffnessCurve.map(value => soundSpeed ** 2 / TAU * Math.sqrt(surfaceMass / value));
  const selectedRigidity = rigidity(directionDegrees);
  const omega = TAU * frequency;
  const bendingWavenumber = (surfaceMass * omega ** 2 / selectedRigidity) ** 0.25;
  const phaseSpeed = omega / bendingWavenumber;
  const selectedCriticalFrequency = soundSpeed ** 2 / TAU * Math.sqrt(surfaceMass / selectedRigidity);
  const minimumCritical = Math.min(...criticalCurve);
  const maximumCritical = Math.max(...criticalCurve);
  return {
    d11, d22, d12, d66, surfaceMass, frequency, soundSpeed, directionDegrees,
    directions, stiffnessCurve, criticalCurve, selectedRigidity, bendingWavenumber, phaseSpeed,
    selectedCriticalFrequency, minimumCritical, maximumCritical,
    anisotropyRatio: Math.max(...stiffnessCurve) / Math.min(...stiffnessCurve),
    regime: frequency < minimumCritical ? 'subcritical in every material direction' : frequency > maximumCritical ? 'supercritical in every material direction' : 'mixed directional coincidence'
  };
}

export function lossFactorBudgetState(input = {}) {
  const frequency = positive(input.frequency, 500);
  const internal = Math.max(0, number(input.internal, 0.012));
  const radiation = Math.max(0, number(input.radiation, 0.006));
  const joint = Math.max(0, number(input.joint, 0.004));
  const fluid = Math.max(0, number(input.fluid, 0.002));
  const coupling = Math.max(0, number(input.coupling, 0.003));
  const measuredBandwidth = Math.max(0, number(input.measuredBandwidth, 14));
  const decayTime = positive(input.decayTime, 0.35);
  const inputPower = Math.max(0, number(input.inputPower, 0.4));
  const storedEnergy = positive(input.storedEnergy, 0.018);
  const total = internal + radiation + joint + fluid + coupling;
  const halfPowerEstimate = measuredBandwidth / frequency;
  const decayEstimate = 2.2 / (frequency * decayTime);
  const powerInjectionEstimate = inputPower / (TAU * frequency * storedEnergy);
  return {
    frequency, internal, radiation, joint, fluid, coupling, total,
    dampingRatio: total / 2, qFactor: 1 / Math.max(total, 1e-12), peakMagnification: 1 / Math.max(total, 1e-12),
    halfPowerBandwidth: total * frequency, t60: 2.2 / Math.max(total * frequency, 1e-12),
    measuredBandwidth, decayTime, inputPower, storedEnergy,
    halfPowerEstimate, decayEstimate, powerInjectionEstimate,
    labels: ['Internal', 'Radiation', 'Joints', 'Fluid', 'Coupling'],
    components: [internal, radiation, joint, fluid, coupling]
  };
}

export function modalTestState(input = {}) {
  const length = positive(input.length, 1.2);
  const width = positive(input.width, 0.8);
  const thickness = positive(input.thickness, 0.003);
  const modulus = positive(input.modulus, 70e9);
  const density = positive(input.density, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const modeX = Math.max(1, Math.round(number(input.modeX, 3)));
  const modeY = Math.max(1, Math.round(number(input.modeY, 2)));
  const driveX = clamp(number(input.driveX, 0.23), 0, 1);
  const driveY = clamp(number(input.driveY, 0.31), 0, 1);
  const responseX = clamp(number(input.responseX, 0.68), 0, 1);
  const responseY = clamp(number(input.responseY, 0.57), 0, 1);
  const lossFactor = positive(input.lossFactor, 0.015);
  const sensorMass = Math.max(0, number(input.sensorMass, 0.004));
  const frequencyResolution = positive(input.frequencyResolution, 1);
  const bendingStiffness = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const surfaceMass = density * thickness;
  const modalWavenumberSquared = (modeX * Math.PI / length) ** 2 + (modeY * Math.PI / width) ** 2;
  const naturalFrequency = Math.sqrt(bendingStiffness / surfaceMass) * modalWavenumberSquared / TAU;
  const totalMass = surfaceMass * length * width;
  const modalMass = totalMass / 4;
  const driveShape = Math.sin(modeX * Math.PI * driveX) * Math.sin(modeY * Math.PI * driveY);
  const responseShape = Math.sin(modeX * Math.PI * responseX) * Math.sin(modeY * Math.PI * responseY);
  const participation = driveShape * responseShape;
  const peakMobility = Math.abs(participation) / (lossFactor * TAU * naturalFrequency * modalMass);
  const modalBandwidth = lossFactor * naturalFrequency;
  const binsAcrossBandwidth = modalBandwidth / frequencyResolution;
  const sensorMassRatio = sensorMass / modalMass;
  const minimumGridX = 2 * modeX + 1;
  const minimumGridY = 2 * modeY + 1;
  return {
    length, width, thickness, modulus, density, poisson, modeX, modeY, driveX, driveY, responseX, responseY,
    lossFactor, sensorMass, frequencyResolution, bendingStiffness, surfaceMass, naturalFrequency, totalMass,
    modalMass, driveShape, responseShape, participation, peakMobility, modalBandwidth, binsAcrossBandwidth,
    sensorMassRatio, minimumGridX, minimumGridY,
    nodeRisk: Math.abs(driveShape) < 0.15 || Math.abs(responseShape) < 0.15,
    resolutionRisk: binsAcrossBandwidth < 3,
    massLoadingRisk: sensorMassRatio > 0.01
  };
}

export function seaValidityState(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const modalDensity = positive(input.modalDensity, 0.04);
  const lossFactor = positive(input.lossFactor, 0.025);
  const bandFraction = positive(input.bandFraction, 0.2316);
  const couplingLossFactor = Math.max(0, number(input.couplingLossFactor, 0.006));
  const responsePoints = Math.max(1, Math.round(number(input.responsePoints, 8)));
  const bandwidth = frequency * bandFraction;
  const modesPerBand = modalDensity * bandwidth;
  const modalOverlap = modalDensity * lossFactor * frequency;
  const weakCouplingRatio = couplingLossFactor / lossFactor;
  const samplingFactor = Math.min(1, responsePoints / Math.max(4, 2 * modesPerBand));
  const coefficientOfVariation = Math.sqrt(2 / Math.max(modesPerBand, 0.25)) / Math.sqrt(Math.max(samplingFactor, 0.15));
  const readiness = modesPerBand >= 5 && modalOverlap >= 1 && weakCouplingRatio <= 0.5
    ? 'statistical regime supported'
    : modesPerBand >= 2 && modalOverlap >= 0.3
      ? 'transition regime; quantify sensitivity'
      : 'deterministic or hybrid treatment preferred';
  return {
    frequency, modalDensity, lossFactor, bandFraction, couplingLossFactor, responsePoints,
    bandwidth, modesPerBand, modalOverlap, weakCouplingRatio, samplingFactor, coefficientOfVariation,
    approximate95PercentDb: 20 * Math.log10(1 + 1.96 * coefficientOfVariation), readiness
  };
}

function solveLinear(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let pivot = 0; pivot < size; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < size; row += 1) if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) best = row;
    [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
    const divisor = augmented[pivot][pivot];
    if (Math.abs(divisor) < 1e-15) throw new Error('SEA matrix is singular for the entered coupling network.');
    for (let column = pivot; column <= size; column += 1) augmented[pivot][column] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let column = pivot; column <= size; column += 1) augmented[row][column] -= factor * augmented[pivot][column];
    }
  }
  return augmented.map(row => row[size]);
}

export const SEA_MEDIA = Object.freeze({
  air: Object.freeze({ key: 'air', label: 'Air', density: 1.204, soundSpeed: 343, lossFactor: 0.025 }),
  helium: Object.freeze({ key: 'helium', label: 'Helium', density: 0.164, soundSpeed: 1007, lossFactor: 0.018 }),
  argon: Object.freeze({ key: 'argon', label: 'Argon', density: 1.633, soundSpeed: 319, lossFactor: 0.02 }),
  carbonDioxide: Object.freeze({ key: 'carbonDioxide', label: 'Carbon dioxide', density: 1.842, soundSpeed: 259, lossFactor: 0.03 }),
  water: Object.freeze({ key: 'water', label: 'Water', density: 998, soundSpeed: 1482, lossFactor: 0.012 })
});

function roomAcousticModalDensity(frequency, volume, soundSpeed) {
  const length = Math.cbrt(volume);
  const surfaceArea = 6 * length ** 2;
  const edgeLength = 12 * length;
  return 4 * Math.PI * volume * frequency ** 2 / soundSpeed ** 3
    + Math.PI * surfaceArea * frequency / (2 * soundSpeed ** 2)
    + edgeLength / (8 * soundSpeed);
}

export function seaNetworkState(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const omega = TAU * frequency;
  const bandFraction = positive(input.bandFraction, 2 ** (1 / 6) - 2 ** (-1 / 6));
  const bandwidth = frequency * bandFraction;
  const source = Array.isArray(input.subsystems) && input.subsystems.length >= 2 ? input.subsystems : [
    { name: 'Source room', kind: 'acoustic', modalDensity: 0.08, lossFactor: 0.01, volume: 80, density: AIR_RHO, soundSpeed: AIR_C, inputPower: 1 },
    { name: 'Receiving room', kind: 'acoustic', modalDensity: 0.08, lossFactor: 0.01, volume: 80, density: AIR_RHO, soundSpeed: AIR_C, inputPower: 0 }
  ];
  const subsystems = source.slice(0, 24).map((item, index) => {
    const kind = String(item.kind ?? 'structural').toLowerCase() === 'acoustic' ? 'acoustic' : 'structural';
    return {
      name: String(item.name ?? `Subsystem ${index + 1}`),
      kind,
      modalDensity: positive(item.modalDensity, kind === 'acoustic' ? 0.08 : 0.04),
      lossFactor: positive(item.lossFactor, kind === 'acoustic' ? 0.025 : 0.02),
      inputPower: Math.max(0, number(item.inputPower, index === 0 ? 1 : 0)),
      mass: positive(item.mass, 25),
      volume: positive(item.volume, 1),
      density: positive(item.density, AIR_RHO),
      soundSpeed: positive(item.soundSpeed, AIR_C)
    };
  });
  const rawLinks = Array.isArray(input.links) ? input.links : subsystems.slice(1).map((_, index) => ({ i: index, j: index + 1, forward: 0.01 }));
  const links = rawLinks.map((link, index) => {
    const i = clamp(Math.round(number(link.i, index)), 0, subsystems.length - 1);
    const j = clamp(Math.round(number(link.j, index + 1)), 0, subsystems.length - 1);
    if (i === j) throw new Error('An SEA coupling link must connect two different subsystems.');
    const forward = Math.max(0, number(link.forward, 0.01));
    const reciprocalReverse = forward * subsystems[i].modalDensity / subsystems[j].modalDensity;
    const reverse = Number.isFinite(Number(link.reverse)) ? Math.max(0, Number(link.reverse)) : reciprocalReverse;
    return { i, j, forward, reverse, reciprocityRatio: reverse > 0 ? forward * subsystems[i].modalDensity / (reverse * subsystems[j].modalDensity) : forward === 0 ? 1 : Infinity };
  });
  const size = subsystems.length;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  for (let index = 0; index < size; index += 1) matrix[index][index] = subsystems[index].lossFactor;
  for (const link of links) {
    matrix[link.i][link.i] += link.forward;
    matrix[link.j][link.j] += link.reverse;
    matrix[link.i][link.j] -= link.reverse;
    matrix[link.j][link.i] -= link.forward;
  }
  const powerVector = subsystems.map(item => item.inputPower / omega);
  const energies = solveLinear(matrix, powerVector);
  const subsystemResults = subsystems.map((item, index) => {
    const energy = energies[index];
    const modesInBand = item.modalDensity * bandwidth;
    const modalEnergy = energy / Math.max(modesInBand, 1e-30);
    const dissipatedPower = omega * item.lossFactor * energy;
    const pressureRms = item.kind === 'acoustic' ? Math.sqrt(Math.max(0, energy * item.density * item.soundSpeed ** 2 / item.volume)) : null;
    const velocityRms = item.kind === 'acoustic'
      ? pressureRms / (item.density * item.soundSpeed)
      : Math.sqrt(Math.max(0, energy / item.mass));
    return {
      ...item, energy, modesInBand, modalEnergy, dissipatedPower, pressureRms, velocityRms,
      levelDb: item.kind === 'acoustic' ? 20 * Math.log10(Math.max(pressureRms, 1e-30) / 20e-6) : null,
      modalOverlap: item.lossFactor * frequency * item.modalDensity
    };
  });
  const powerFlows = links.map(link => {
    const grossForward = omega * link.forward * energies[link.i];
    const grossReverse = omega * link.reverse * energies[link.j];
    return {
      ...link,
      from: subsystems[link.i].name,
      to: subsystems[link.j].name,
      grossForward,
      grossReverse,
      net: grossForward - grossReverse
    };
  });
  const sourceIndex = clamp(Math.round(number(input.sourceIndex, 0)), 0, size - 1);
  const receiverIndex = clamp(Math.round(number(input.receiverIndex, size - 1)), 0, size - 1);
  const sourceResult = subsystemResults[sourceIndex];
  const receiverResult = subsystemResults[receiverIndex];
  const acousticEndpoints = sourceResult.kind === 'acoustic' && receiverResult.kind === 'acoustic';
  const transmissionLoss = acousticEndpoints
    ? 20 * Math.log10(Math.max(sourceResult.pressureRms, 1e-30) / Math.max(receiverResult.pressureRms, 1e-30))
    : 10 * Math.log10(Math.max(sourceResult.modalEnergy, 1e-300) / Math.max(receiverResult.modalEnergy, 1e-300));
  const totalInputPower = subsystems.reduce((sum, item) => sum + item.inputPower, 0);
  const totalDissipatedPower = subsystemResults.reduce((sum, item) => sum + item.dissipatedPower, 0);
  return {
    frequency, omega, bandFraction, bandwidth, subsystems, links, matrix, energies,
    subsystemResults, powerFlows, sourceIndex, receiverIndex, transmissionLoss,
    transmissionLossBasis: acousticEndpoints ? 'source-to-receiver acoustic pressure-level difference' : 'source-to-receiver modal-energy level difference',
    totalInputPower, totalDissipatedPower,
    balanceError: totalInputPower > 0 ? (totalDissipatedPower - totalInputPower) / totalInputPower : 0,
    strongestFlow: powerFlows.reduce((best, flow) => !best || Math.abs(flow.net) > Math.abs(best.net) ? flow : best, null)
  };
}

export function doubleWindowSeaState(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const mediumKey = Object.hasOwn(SEA_MEDIA, input.medium) ? input.medium : 'air';
  const medium = SEA_MEDIA[mediumKey];
  const paneLength = positive(input.paneLength, 1.5);
  const paneWidth = positive(input.paneWidth, 1.2);
  const paneArea = paneLength * paneWidth;
  const panePerimeter = 2 * (paneLength + paneWidth);
  const gap = positive(input.gap, 0.04);
  const pane1Thickness = positive(input.pane1Thickness, 0.006);
  const pane2Thickness = positive(input.pane2Thickness, 0.006);
  const paneDensity = positive(input.paneDensity, 2500);
  const paneModulus = positive(input.paneModulus, 70e9);
  const panePoisson = clamp(number(input.panePoisson, 0.23), -0.49, 0.49);
  const paneLossFactor = positive(input.paneLossFactor, 0.018);
  const cavityLossFactor = positive(input.cavityLossFactor, medium.lossFactor);
  const roomLossFactor = positive(input.roomLossFactor, 0.01);
  const sourceRoomVolume = positive(input.sourceRoomVolume, 80);
  const receiverRoomVolume = positive(input.receiverRoomVolume, 80);
  const sourcePower = positive(input.sourcePower, 1);
  const etaPaneRoom = positive(input.etaPaneRoom, 0.012);
  const etaPaneCavityAir = positive(input.etaPaneCavityAir, 0.018);
  const bypass = Math.max(0, number(input.bypass, 0));
  const nonresonantPath = input.nonresonantPath === true || input.nonresonantPath === 'enabled';
  const blanketCoverage = clamp(number(input.blanketCoverage, 0), 0, 1);
  const blanketInsertionLoss = Math.max(0, number(input.blanketInsertionLoss, 0));
  const pane1SurfaceMass = paneDensity * pane1Thickness;
  const pane2SurfaceMass = paneDensity * pane2Thickness;
  const pane1Mass = paneArea * pane1SurfaceMass;
  const pane2Mass = paneArea * pane2SurfaceMass;
  const pane1Rigidity = paneModulus * pane1Thickness ** 3 / (12 * (1 - panePoisson ** 2));
  const pane2Rigidity = paneModulus * pane2Thickness ** 3 / (12 * (1 - panePoisson ** 2));
  const pane1ModalDensity = paneArea / 2 * Math.sqrt(pane1SurfaceMass / pane1Rigidity);
  const pane2ModalDensity = paneArea / 2 * Math.sqrt(pane2SurfaceMass / pane2Rigidity);
  const sourceRoomModalDensity = roomAcousticModalDensity(frequency, sourceRoomVolume, AIR_C);
  const receiverRoomModalDensity = roomAcousticModalDensity(frequency, receiverRoomVolume, AIR_C);
  const cavityVolume = paneArea * gap;
  const crossGapCuton = medium.soundSpeed / (2 * gap);
  const belowCutonModalDensity = 2 * Math.PI * paneArea * frequency / medium.soundSpeed ** 2;
  const cavitySurfaceArea = 2 * paneArea + panePerimeter * gap;
  const cavityEdgeLength = 2 * panePerimeter + 8 * gap;
  const fullCavityModalDensity = 4 * Math.PI * cavityVolume * frequency ** 2 / medium.soundSpeed ** 3
    + Math.PI * cavitySurfaceArea * frequency / (2 * medium.soundSpeed ** 2)
    + cavityEdgeLength / (8 * medium.soundSpeed);
  const cavityModalDensity = frequency < crossGapCuton ? belowCutonModalDensity : fullCavityModalDensity;
  const impedanceRatio = medium.density * medium.soundSpeed / (AIR_RHO * AIR_C);
  const massFluidMassFrequency = Math.sqrt(medium.density * medium.soundSpeed ** 2 / gap * (1 / pane1SurfaceMass + 1 / pane2SurfaceMass)) / TAU;
  const massFluidMassOffset = Math.log2(frequency / massFluidMassFrequency);
  const massFluidMassGain = 1 + 8 * Math.exp(-0.5 * (massFluidMassOffset / 0.18) ** 2);
  const etaPaneCavity = clamp(etaPaneCavityAir * impedanceRatio * massFluidMassGain, 1e-8, 0.5);
  const componentMassLawTl = Math.max(0, 20 * Math.log10(Math.max(1, TAU * frequency * (pane1SurfaceMass + pane2SurfaceMass) / (2 * AIR_RHO * AIR_C))) - 5);
  const blanketTransmission = 10 ** (-blanketInsertionLoss / 10);
  const coverageTransmission = (1 - blanketCoverage) + blanketCoverage * blanketTransmission;
  const nonresonantClf = nonresonantPath
    ? AIR_C * paneArea / (8 * Math.PI * frequency * sourceRoomVolume) * 10 ** (-componentMassLawTl / 10) * coverageTransmission
    : 0;
  const effectiveBypass = bypass + nonresonantClf;
  const subsystems = [
    { name: 'Source room', kind: 'acoustic', modalDensity: sourceRoomModalDensity, lossFactor: roomLossFactor, volume: sourceRoomVolume, density: AIR_RHO, soundSpeed: AIR_C, inputPower: sourcePower },
    { name: 'Pane 1', kind: 'structural', modalDensity: pane1ModalDensity, lossFactor: paneLossFactor, mass: pane1Mass },
    { name: `${medium.label} gap`, kind: 'acoustic', modalDensity: cavityModalDensity, lossFactor: cavityLossFactor, volume: cavityVolume, density: medium.density, soundSpeed: medium.soundSpeed },
    { name: 'Pane 2', kind: 'structural', modalDensity: pane2ModalDensity, lossFactor: paneLossFactor, mass: pane2Mass },
    { name: 'Receiving room', kind: 'acoustic', modalDensity: receiverRoomModalDensity, lossFactor: roomLossFactor, volume: receiverRoomVolume, density: AIR_RHO, soundSpeed: AIR_C }
  ];
  const links = [
    { i: 0, j: 1, forward: etaPaneRoom * pane1ModalDensity / sourceRoomModalDensity },
    { i: 1, j: 2, forward: etaPaneCavity },
    { i: 2, j: 3, forward: etaPaneCavity * pane2ModalDensity / cavityModalDensity },
    { i: 3, j: 4, forward: etaPaneRoom }
  ];
  if (effectiveBypass > 0) links.push({ i: 0, j: 4, forward: effectiveBypass });
  const network = seaNetworkState({ frequency, subsystems, links, sourceIndex: 0, receiverIndex: 4 });
  return {
    frequency, mediumKey, medium, paneLength, paneWidth, paneArea, panePerimeter, gap,
    pane1Thickness, pane2Thickness, paneDensity, paneModulus, panePoisson, paneLossFactor,
    cavityLossFactor, roomLossFactor, sourceRoomVolume, receiverRoomVolume, sourcePower,
    etaPaneRoom, etaPaneCavityAir, etaPaneCavity, bypass, effectiveBypass, nonresonantPath,
    blanketCoverage, blanketInsertionLoss, blanketTransmission, coverageTransmission,
    componentMassLawTl, nonresonantClf, pane1SurfaceMass, pane2SurfaceMass,
    pane1Mass, pane2Mass, pane1Rigidity, pane2Rigidity, pane1ModalDensity, pane2ModalDensity,
    sourceRoomModalDensity, receiverRoomModalDensity, cavityVolume, crossGapCuton,
    belowCutonModalDensity, fullCavityModalDensity, cavityModalDensity, impedanceRatio,
    massFluidMassFrequency, massFluidMassOffset, massFluidMassGain, network,
    transmissionLoss: network.transmissionLoss,
    pane1Velocity: network.subsystemResults[1].velocityRms,
    pane2Velocity: network.subsystemResults[3].velocityRms,
    sourceLevel: network.subsystemResults[0].levelDb,
    receiverLevel: network.subsystemResults[4].levelDb,
    regime: frequency < crossGapCuton ? 'gap behaves as a two-dimensional acoustic subsystem below its first cross-gap mode' : 'cross-gap acoustic modes are active; treat the cavity as a full three-dimensional subsystem',
    couplingWarning: etaPaneCavity / paneLossFactor > 1 ? 'fluid coupling exceeds pane internal loss; weak-coupling SEA and dry-pane properties need scrutiny' : 'pane-to-gap coupling remains below pane internal loss in this screen'
  };
}

export function doublePanelSeaState(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const omega = TAU * frequency;
  const densities = [
    positive(input.n1, 0.18), positive(input.n2, 0.035), positive(input.n3, 0.09),
    positive(input.n4, 0.03), positive(input.n5, 0.18)
  ];
  const internal = [
    positive(input.eta1, 0.01), positive(input.eta2, 0.018), positive(input.eta3, 0.025),
    positive(input.eta4, 0.018), positive(input.eta5, 0.01)
  ];
  const forward = [
    positive(input.eta12, 0.012), positive(input.eta23, 0.02),
    positive(input.eta34, 0.018), positive(input.eta45, 0.011)
  ];
  const bypass = Math.max(0, number(input.bypass, 0.0002));
  const sourcePower = positive(input.sourcePower, 1);
  const sourceVolume = positive(input.sourceVolume, 80);
  const receiverVolume = positive(input.receiverVolume, 80);
  const links = [];
  for (let index = 0; index < 4; index += 1) {
    const reverse = forward[index] * densities[index] / densities[index + 1];
    links.push({ i: index, j: index + 1, forward: forward[index], reverse });
  }
  if (bypass > 0) links.push({ i: 0, j: 4, forward: bypass, reverse: bypass * densities[0] / densities[4] });
  const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let index = 0; index < 5; index += 1) matrix[index][index] = internal[index];
  for (const link of links) {
    matrix[link.i][link.i] += link.forward;
    matrix[link.j][link.j] += link.reverse;
    matrix[link.i][link.j] -= link.reverse;
    matrix[link.j][link.i] -= link.forward;
  }
  const powers = [sourcePower / omega, 0, 0, 0, 0];
  const energies = solveLinear(matrix, powers);
  const dissipation = energies.map((energy, index) => omega * internal[index] * energy);
  const tl = 10 * Math.log10((energies[0] / sourceVolume) / Math.max(energies[4] / receiverVolume, 1e-300));
  const bypassPower = bypass * omega * Math.max(0, energies[0] - energies[4]);
  const totalDissipation = dissipation.reduce((sum, value) => sum + value, 0);
  return {
    frequency, omega, densities, internal, forward, bypass, sourcePower, sourceVolume, receiverVolume,
    links, energies, dissipation, tl, bypassPower, totalDissipation,
    balanceError: (totalDissipation - sourcePower) / sourcePower
  };
}

export function khiePatchState(input = {}) {
  const frequency = positive(input.frequency, 500);
  const distance = positive(input.distance, 3);
  const area = positive(input.area, 0.02);
  const surfacePressure = number(input.surfacePressure, 1);
  const normalVelocity = number(input.normalVelocity, 0.001);
  const normalCosine = clamp(number(input.normalCosine, 0.7), -1, 1);
  const density = positive(input.density, AIR_RHO);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const omega = TAU * frequency;
  const k = omega / soundSpeed;
  const propagation = phasor(-k * distance);
  const common = area / (4 * Math.PI * distance);
  const pressureKernel = { re: normalCosine / distance, im: k * normalCosine };
  const pressureContribution = scale(multiply(propagation, pressureKernel), common * surfacePressure);
  const velocityContribution = scale(multiply(propagation, { re: 0, im: 1 }), common * omega * density * normalVelocity);
  const total = add(pressureContribution, velocityContribution);
  const distances = logspace(Math.max(0.05, distance / 20), distance * 8, 80);
  const pressureCurve = distances.map(value => {
    const state = khiePatchStateNoCurve({ frequency, distance: value, area, surfacePressure, normalVelocity, normalCosine, density, soundSpeed });
    return state.totalMagnitude;
  });
  return {
    frequency, distance, area, surfacePressure, normalVelocity, normalCosine, density, soundSpeed, omega, k,
    pressureContribution, velocityContribution, total,
    pressureMagnitude: magnitude(pressureContribution), velocityMagnitude: magnitude(velocityContribution), totalMagnitude: magnitude(total),
    pressurePhase: phaseDegrees(pressureContribution), velocityPhase: phaseDegrees(velocityContribution), totalPhase: phaseDegrees(total),
    distances, pressureCurve
  };
}

function khiePatchStateNoCurve({ frequency, distance, area, surfacePressure, normalVelocity, normalCosine, density, soundSpeed }) {
  const omega = TAU * frequency;
  const k = omega / soundSpeed;
  const propagation = phasor(-k * distance);
  const common = area / (4 * Math.PI * distance);
  const pressureContribution = scale(multiply(propagation, { re: normalCosine / distance, im: k * normalCosine }), common * surfacePressure);
  const velocityContribution = scale(multiply(propagation, { re: 0, im: 1 }), common * omega * density * normalVelocity);
  return { totalMagnitude: magnitude(add(pressureContribution, velocityContribution)) };
}

export function pipeNoiseState(input = {}) {
  const radius = positive(input.radius, 0.18);
  const length = positive(input.length, 3);
  const thickness = positive(input.thickness, 0.004);
  const modulus = positive(input.modulus, 70e9);
  const density = positive(input.density, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const soundSpeed = positive(input.soundSpeed, 343);
  const flowSpeed = positive(input.flowSpeed, 90);
  const convectionFraction = clamp(number(input.convectionFraction, 0.7), 0.2, 1);
  const frequency = positive(input.frequency, 700);
  const axialOrder = Math.max(1, Math.round(number(input.axialOrder, 2)));
  const circumferentialOrder = Math.max(0, Math.round(number(input.circumferentialOrder, 1)));
  const convectiveSpeed = flowSpeed * convectionFraction;
  const acousticWavenumber = TAU * frequency / soundSpeed;
  const convectiveWavenumber = TAU * frequency / convectiveSpeed;
  const bendingStiffness = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const surfaceMass = density * thickness;
  const wallBendingWavenumber = (surfaceMass * (TAU * frequency) ** 2 / bendingStiffness) ** 0.25;
  const shell = shellAcousticsState({ radius, length, thickness, modulus, density, poisson, soundSpeed, axialOrder, circumferentialOrder });
  const higherOrderCuton = 1.84118 * soundSpeed / (TAU * radius);
  return {
    radius, length, thickness, modulus, density, poisson, soundSpeed, flowSpeed, convectionFraction, frequency,
    axialOrder, circumferentialOrder, convectiveSpeed, acousticWavenumber, convectiveWavenumber, wallBendingWavenumber,
    acousticWavelength: TAU / acousticWavenumber, convectiveWavelength: TAU / convectiveWavenumber,
    wallBendingWavelength: TAU / wallBendingWavenumber, higherOrderCuton,
    ringFrequency: shell.ringFrequency, shellModeFrequency: shell.modeFrequency,
    convectiveMatchRatio: convectiveWavenumber / wallBendingWavenumber,
    machNumber: flowSpeed / soundSpeed,
    acousticRegime: frequency < higherOrderCuton ? 'plane acoustic mode only' : 'higher-order duct modes can propagate',
    structuralRegime: frequency < shell.ringFrequency ? 'beam/shell curvature range' : 'local shell bending range'
  };
}

export function waveMatchingState(input = {}) {
  const frequency = positive(input.frequency, 650);
  const thickness = positive(input.thickness, 0.004);
  const modulus = positive(input.modulus, 70e9);
  const density = positive(input.density, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const convectionSpeed = positive(input.convectionSpeed, 180);
  const omega = TAU * frequency;
  const surfaceMass = density * thickness;
  const bendingStiffness = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const longitudinalSpeed = Math.sqrt(modulus / (density * (1 - poisson ** 2)));
  const shearSpeed = Math.sqrt(modulus / (2 * density * (1 + poisson)));
  const acousticWavenumber = omega / soundSpeed;
  const bendingWavenumber = (surfaceMass * omega ** 2 / bendingStiffness) ** 0.25;
  const convectiveWavenumber = omega / convectionSpeed;
  const longitudinalWavenumber = omega / longitudinalSpeed;
  const shearWavenumber = omega / shearSpeed;
  const criticalFrequency = soundSpeed ** 2 / TAU * Math.sqrt(surfaceMass / bendingStiffness);
  const convectiveMatchFrequency = convectionSpeed ** 2 / TAU * Math.sqrt(surfaceMass / bendingStiffness);
  const bendingPhaseSpeed = omega / bendingWavenumber;
  const thicknessParameter = bendingWavenumber * thickness;
  const wavelengthThicknessRatio = TAU / Math.max(thicknessParameter, 1e-12);
  const frequencies = logspace(20, 12000, 120);
  const bendingCurve = frequencies.map(value => (surfaceMass * (TAU * value) ** 2 / bendingStiffness) ** 0.25);
  const acousticCurve = frequencies.map(value => TAU * value / soundSpeed);
  const convectiveCurve = frequencies.map(value => TAU * value / convectionSpeed);
  const longitudinalCurve = frequencies.map(value => TAU * value / longitudinalSpeed);
  const shearCurve = frequencies.map(value => TAU * value / shearSpeed);
  const acousticMatchRatio = acousticWavenumber / bendingWavenumber;
  const convectiveMatchRatio = convectiveWavenumber / bendingWavenumber;
  const nearestMatch = Math.abs(Math.log(acousticMatchRatio)) <= Math.abs(Math.log(convectiveMatchRatio)) ? 'acoustic coincidence' : 'convective forcing match';
  return {
    frequency, thickness, modulus, density, poisson, soundSpeed, convectionSpeed, omega, surfaceMass,
    bendingStiffness, longitudinalSpeed, shearSpeed, acousticWavenumber, bendingWavenumber,
    convectiveWavenumber, longitudinalWavenumber, shearWavenumber, criticalFrequency,
    convectiveMatchFrequency, bendingPhaseSpeed, thicknessParameter, wavelengthThicknessRatio,
    acousticMatchRatio, convectiveMatchRatio, nearestMatch, frequencies, bendingCurve, acousticCurve,
    convectiveCurve, longitudinalCurve, shearCurve,
    plateValidity: thicknessParameter <= 0.5 ? 'classical thin-plate dispersion is a reasonable screen' : 'transverse shear and rotary inertia should be included',
    regime: acousticMatchRatio < 0.8 ? 'subcritical bending wave' : acousticMatchRatio <= 1.25 ? 'acoustic coincidence transition' : 'supercritical bending wave'
  };
}

function screeningRadiationEfficiency(gamma, modeX, modeY) {
  const parityFactor = modeX % 2 && modeY % 2 ? 1 : modeX % 2 || modeY % 2 ? 0.28 : 0.08;
  if (gamma < 1) return Math.max(1e-7, parityFactor * gamma ** 4);
  return clamp(1 + 0.3 * Math.log(gamma), 0.05, 2.5);
}

function drivenResponseAtFrequency({ frequency, forceRms, lossFactor, area, fluidDensity, soundSpeed, modes }) {
  const omega = TAU * frequency;
  const acousticWavenumber = omega / soundSpeed;
  let driveVelocity = { re: 0, im: 0 };
  let surfaceMeanSquareVelocity = 0;
  let soundPower = 0;
  let resonantPower = 0;
  let nonresonantPower = 0;
  let dominant = null;
  for (const mode of modes) {
    const denominatorReal = mode.modalMass * (mode.omega ** 2 - omega ** 2);
    const denominatorImaginary = mode.modalMass * lossFactor * mode.omega ** 2;
    const denominatorMagnitudeSquared = denominatorReal ** 2 + denominatorImaginary ** 2;
    const numerator = omega * forceRms * mode.driveShape;
    const modalVelocity = {
      re: numerator * denominatorImaginary / denominatorMagnitudeSquared,
      im: numerator * denominatorReal / denominatorMagnitudeSquared
    };
    driveVelocity = add(driveVelocity, scale(modalVelocity, mode.driveShape));
    const modalMeanSquareVelocity = (modalVelocity.re ** 2 + modalVelocity.im ** 2) / 4;
    surfaceMeanSquareVelocity += modalMeanSquareVelocity;
    const gamma = acousticWavenumber / mode.wavenumber;
    const radiationEfficiency = screeningRadiationEfficiency(gamma, mode.modeX, mode.modeY);
    const modalPower = fluidDensity * soundSpeed * area * radiationEfficiency * modalMeanSquareVelocity;
    const resonant = Math.abs(frequency - mode.naturalFrequency) <= Math.max(0.5 * lossFactor * mode.naturalFrequency, 0.5);
    soundPower += modalPower;
    if (resonant) resonantPower += modalPower;
    else nonresonantPower += modalPower;
    if (!dominant || modalPower > dominant.power) dominant = { ...mode, power: modalPower, gamma, radiationEfficiency, resonant };
  }
  const surfaceRmsVelocity = Math.sqrt(surfaceMeanSquareVelocity);
  return {
    frequency, acousticWavenumber, driveMobility: magnitude(driveVelocity) / forceRms,
    surfaceRmsVelocity, surfaceAveragedMobility: surfaceRmsVelocity / forceRms,
    soundPower, soundPowerPerForceSquared: soundPower / forceRms ** 2,
    radiationEfficiency: soundPower / Math.max(fluidDensity * soundSpeed * area * surfaceMeanSquareVelocity, 1e-30),
    resonantPower, nonresonantPower, dominant
  };
}

export function drivenRadiationState(input = {}) {
  const length = positive(input.length, 1.8);
  const width = positive(input.width, 1.1);
  const thickness = positive(input.thickness, 0.004);
  const modulus = positive(input.modulus, 70e9);
  const density = positive(input.density, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const frequency = positive(input.frequency, 420);
  const forceRms = positive(input.forceRms, 1);
  const lossFactor = positive(input.lossFactor, 0.02);
  const driveX = clamp(number(input.driveX, 0.27), 0.01, 0.99);
  const driveY = clamp(number(input.driveY, 0.34), 0.01, 0.99);
  const maximumMode = Math.max(2, Math.min(10, Math.round(number(input.maximumMode, 6))));
  const fluidDensity = positive(input.fluidDensity, AIR_RHO);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const area = length * width;
  const surfaceMass = density * thickness;
  const totalMass = surfaceMass * area;
  const modalMass = totalMass / 4;
  const bendingStiffness = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const modes = [];
  for (let modeX = 1; modeX <= maximumMode; modeX += 1) for (let modeY = 1; modeY <= maximumMode; modeY += 1) {
    const wavenumber = Math.hypot(modeX * Math.PI / length, modeY * Math.PI / width);
    const omega = Math.sqrt(bendingStiffness / surfaceMass) * wavenumber ** 2;
    modes.push({
      modeX, modeY, wavenumber, omega, naturalFrequency: omega / TAU, modalMass,
      driveShape: Math.sin(modeX * Math.PI * driveX) * Math.sin(modeY * Math.PI * driveY)
    });
  }
  const selected = drivenResponseAtFrequency({ frequency, forceRms, lossFactor, area, fluidDensity, soundSpeed, modes });
  const modalDensity = area / 2 * Math.sqrt(surfaceMass / bendingStiffness);
  const modalOverlap = modalDensity * lossFactor * frequency;
  const frequencies = logspace(20, 5000, 110);
  const curve = frequencies.map(value => drivenResponseAtFrequency({ frequency: value, forceRms, lossFactor, area, fluidDensity, soundSpeed, modes }));
  return {
    length, width, thickness, modulus, density, poisson, frequency, forceRms, lossFactor, driveX, driveY,
    maximumMode, fluidDensity, soundSpeed, area, surfaceMass, totalMass, modalMass, bendingStiffness,
    modalDensity, modalOverlap, modes, ...selected, frequencies,
    mobilityCurve: curve.map(value => value.surfaceAveragedMobility),
    soundPowerTransferCurve: curve.map(value => value.soundPowerPerForceSquared),
    finiteStructureRegime: modalOverlap < 0.3 ? 'sparse finite-structure resonances' : modalOverlap < 1 ? 'finite-to-wave transition' : 'overlapping modes approaching an infinite-plate trend'
  };
}

export function soundIntensityProbeState(input = {}) {
  const frequency = positive(input.frequency, 1000);
  const spacer = positive(input.spacer, 0.012);
  const soundSpeed = positive(input.soundSpeed, AIR_C);
  const density = positive(input.density, AIR_RHO);
  const incidentPressureRms = positive(input.incidentPressureRms, 2);
  const reflectionCoefficient = clamp(number(input.reflectionCoefficient, 0.35), 0, 0.98);
  const incidenceDegrees = clamp(number(input.incidenceDegrees, 20), 0, 80);
  const phaseMismatchDegrees = number(input.phaseMismatchDegrees, 0.15);
  const scanArea = positive(input.scanArea, 1.8);
  const radiatingArea = positive(input.radiatingArea, 1.8);
  const surfaceVelocityRms = positive(input.surfaceVelocityRms, 0.002);
  const incidenceCosine = Math.cos(incidenceDegrees * Math.PI / 180);
  const wavenumber = TAU * frequency / soundSpeed;
  const kd = wavenumber * spacer;
  const projectedKd = kd * incidenceCosine;
  const spacingFactor = Math.abs(projectedKd) < 1e-8 ? 1 : 2 * Math.sin(projectedKd / 2) / projectedKd;
  const reflectionPowerRatio = reflectionCoefficient ** 2;
  const trueNormalIntensity = incidentPressureRms ** 2 / (density * soundSpeed) * (1 - reflectionPowerRatio) * incidenceCosine;
  const reactiveToActiveRatio = 2 * reflectionCoefficient / Math.max(1 - reflectionPowerRatio, 1e-8);
  const phaseMismatchRadians = phaseMismatchDegrees * Math.PI / 180;
  const phaseErrorFraction = phaseMismatchRadians * reactiveToActiveRatio / Math.max(Math.abs(projectedKd), 1e-8);
  const estimatedIntensity = trueNormalIntensity * (spacingFactor + phaseErrorFraction);
  const spacingBiasPercent = 100 * (spacingFactor - 1);
  const phaseBiasPercent = 100 * phaseErrorFraction;
  const totalBiasPercent = 100 * (estimatedIntensity / Math.max(trueNormalIntensity, 1e-30) - 1);
  const maximumFrequencyKd055 = 0.55 * soundSpeed / (TAU * spacer);
  const minimumFrequencyFivePercentPhase = Math.abs(phaseMismatchRadians) * reactiveToActiveRatio * soundSpeed / (0.05 * TAU * spacer * Math.max(incidenceCosine, 0.1));
  const estimatedPower = estimatedIntensity * scanArea;
  const measuredRadiationEfficiency = Math.abs(estimatedPower) / (density * soundSpeed * radiatingArea * surfaceVelocityRms ** 2);
  const frequencies = logspace(20, Math.max(20000, maximumFrequencyKd055 * 3), 100);
  const biasCurve = frequencies.map(value => {
    const localKd = TAU * value / soundSpeed * spacer * incidenceCosine;
    const localSpacing = Math.abs(localKd) < 1e-8 ? 1 : 2 * Math.sin(localKd / 2) / localKd;
    const localPhase = phaseMismatchRadians * reactiveToActiveRatio / Math.max(Math.abs(localKd), 1e-8);
    return 100 * (localSpacing + localPhase - 1);
  });
  return {
    frequency, spacer, soundSpeed, density, incidentPressureRms, reflectionCoefficient, incidenceDegrees,
    phaseMismatchDegrees, scanArea, radiatingArea, surfaceVelocityRms, wavenumber, kd, projectedKd,
    spacingFactor, reflectionPowerRatio, trueNormalIntensity, reactiveToActiveRatio, phaseErrorFraction,
    estimatedIntensity, spacingBiasPercent, phaseBiasPercent, totalBiasPercent, maximumFrequencyKd055,
    minimumFrequencyFivePercentPhase, estimatedPower, measuredRadiationEfficiency, frequencies, biasCurve,
    direction: estimatedIntensity >= 0 ? 'outward active intensity' : 'apparent inward intensity; phase error or field reactivity dominates',
    spacingRegime: kd < 0.55 ? 'within the ACS 519 kd < 0.55 spacing screen' : 'above the ACS 519 kd < 0.55 spacing screen'
  };
}

export function dynamicStressEnvironmentState(input = {}) {
  const length = positive(input.length, 1.6);
  const width = positive(input.width, 1.0);
  const thickness = positive(input.thickness, 0.003);
  const radius = positive(input.radius, 1.8);
  const modeX = Math.max(1, Math.round(number(input.modeX, 3)));
  const modeY = Math.max(1, Math.round(number(input.modeY, 1)));
  const displacementRms = positive(input.displacementRms, 0.00015);
  const referenceModulus = positive(input.referenceModulus, 70e9);
  const density = positive(input.density, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const temperature = number(input.temperature, 80);
  const referenceTemperature = number(input.referenceTemperature, 20);
  const modulusPercentPer100C = number(input.modulusPercentPer100C, -3);
  const strengthPercentPer100C = number(input.strengthPercentPer100C, -5);
  const pressure = Math.max(0, number(input.pressure, 180000));
  const yieldStrengthReference = positive(input.yieldStrengthReference, 275e6);
  const ultimateStrengthReference = positive(input.ultimateStrengthReference, 330e6);
  const fatigueStrengthReference = positive(input.fatigueStrengthReference, 95e6);
  const stressConcentration = Math.max(1, number(input.stressConcentration, 1.6));
  const frequency = positive(input.frequency, 320);
  const duration = positive(input.duration, 120);
  const snExponent = positive(input.snExponent, 6);
  const temperatureDelta = temperature - referenceTemperature;
  const modulusFactor = Math.max(0.05, 1 + modulusPercentPer100C * temperatureDelta / 10000);
  const strengthFactor = Math.max(0.05, 1 + strengthPercentPer100C * temperatureDelta / 10000);
  const modulus = referenceModulus * modulusFactor;
  const yieldStrength = yieldStrengthReference * strengthFactor;
  const ultimateStrength = ultimateStrengthReference * strengthFactor;
  const fatigueStrength = fatigueStrengthReference * strengthFactor;
  const kx = modeX * Math.PI / length;
  const ky = modeY * Math.PI / width;
  const modalWavenumber = Math.hypot(kx, ky);
  const curvatureRms = modalWavenumber ** 2 * displacementRms;
  const surfaceStrainRms = thickness * curvatureRms / 2;
  const alternatingStressPeak = Math.SQRT2 * stressConcentration * modulus * surfaceStrainRms;
  const meanHoopStress = pressure * radius / thickness;
  const bendingStiffness = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const surfaceMass = density * thickness;
  const unpressurizedFrequency = Math.sqrt(bendingStiffness / surfaceMass) * modalWavenumber ** 2 / TAU;
  const membraneForce = pressure * radius;
  const pressurizedFrequency = Math.sqrt((bendingStiffness * modalWavenumber ** 4 + membraneForce * modalWavenumber ** 2) / surfaceMass) / TAU;
  const pressureFrequencyShiftPercent = 100 * (pressurizedFrequency / unpressurizedFrequency - 1);
  const goodmanUtilization = alternatingStressPeak / fatigueStrength + meanHoopStress / ultimateStrength;
  const fatigueMargin = 1 / Math.max(goodmanUtilization, 1e-12) - 1;
  const yieldUtilization = (meanHoopStress + alternatingStressPeak) / yieldStrength;
  const cycles = frequency * duration;
  const allowableCycles = 1e6 * (fatigueStrength / Math.max(alternatingStressPeak, 1e-12)) ** snExponent;
  const minerDamage = cycles / allowableCycles;
  return {
    length, width, thickness, radius, modeX, modeY, displacementRms, referenceModulus, density, poisson,
    temperature, referenceTemperature, modulusPercentPer100C, strengthPercentPer100C, pressure,
    yieldStrengthReference, ultimateStrengthReference, fatigueStrengthReference, stressConcentration,
    frequency, duration, snExponent, temperatureDelta, modulusFactor, strengthFactor, modulus,
    yieldStrength, ultimateStrength, fatigueStrength, kx, ky, modalWavenumber, curvatureRms,
    surfaceStrainRms, alternatingStressPeak, meanHoopStress, bendingStiffness, surfaceMass,
    unpressurizedFrequency, pressurizedFrequency, pressureFrequencyShiftPercent, goodmanUtilization,
    fatigueMargin, yieldUtilization, cycles, allowableCycles, minerDamage,
    regime: goodmanUtilization >= 1 || yieldUtilization >= 1 ? 'screening margin exceeded' : goodmanUtilization >= 0.7 || yieldUtilization >= 0.7 ? 'margin sensitive to environment and local detail' : 'positive screening margin within the entered model'
  };
}

function launchAcousticIntensityAtDistance({ radialDistance, observerAxial, sourcePositions, sourceWeights, acousticPower, gainDb, atmosphereDbPerKm }) {
  const gain = 10 ** (gainDb / 10);
  let intensity = 0;
  for (let index = 0; index < sourcePositions.length; index += 1) {
    const distance = Math.hypot(radialDistance, sourcePositions[index] - observerAxial);
    const atmosphere = 10 ** (-atmosphereDbPerKm * distance / 1000 / 10);
    intensity += acousticPower * sourceWeights[index] * gain * atmosphere / (4 * Math.PI * distance ** 2);
  }
  return intensity;
}

export function launchAcousticSourceState(input = {}) {
  const thrust = positive(input.thrust, 8e6);
  const exhaustVelocity = positive(input.exhaustVelocity, 3200);
  const acousticEfficiency = clamp(number(input.acousticEfficiency, 0.005), 1e-7, 0.2);
  const nozzleDiameter = positive(input.nozzleDiameter, 3);
  const strouhalNumber = positive(input.strouhalNumber, 0.2);
  const frequency = positive(input.frequency, 250);
  const radialDistance = positive(input.radialDistance, 120);
  const observerAxial = number(input.observerAxial, 0);
  const plumeLength = positive(input.plumeLength, 80);
  const directivityGainDb = number(input.directivityGainDb, 3);
  const reflectionGainDb = number(input.reflectionGainDb, 2);
  const suppressionDb = Math.max(0, number(input.suppressionDb, 6));
  const atmosphereDbPerKm = Math.max(0, number(input.atmosphereDbPerKm, 0.8));
  const sourceCount = 80;
  const sourcePositions = Array.from({ length: sourceCount }, (_, index) => plumeLength * (index + 0.5) / sourceCount);
  const rawWeights = sourcePositions.map(position => {
    const normalized = position / plumeLength;
    return (normalized + 0.04) * Math.exp(-3.2 * normalized);
  });
  const weightSum = rawWeights.reduce((sum, value) => sum + value, 0);
  const sourceWeights = rawWeights.map(value => value / weightSum);
  const sourceCentroid = sourcePositions.reduce((sum, value, index) => sum + value * sourceWeights[index], 0);
  const mechanicalJetPower = 0.5 * thrust * exhaustVelocity;
  const acousticPower = mechanicalJetPower * acousticEfficiency;
  const soundPowerLevel = 10 * Math.log10(acousticPower / 1e-12);
  const gainDb = directivityGainDb + reflectionGainDb - suppressionDb;
  const overallIntensity = launchAcousticIntensityAtDistance({ radialDistance, observerAxial, sourcePositions, sourceWeights, acousticPower, gainDb, atmosphereDbPerKm });
  const overallLevel = 10 * Math.log10(overallIntensity / 1e-12);
  const peakFrequency = strouhalNumber * exhaustVelocity / nozzleDiameter;
  const spectralOffsetOctaves = Math.log2(frequency / peakFrequency);
  const bandPowerFraction = clamp(0.16 * Math.exp(-0.5 * (spectralOffsetOctaves / 1.15) ** 2), 1e-8, 0.2);
  const bandLevel = overallLevel + 10 * Math.log10(bandPowerFraction);
  const distances = logspace(20, 2500, 110);
  const levelCurve = distances.map(distance => 10 * Math.log10(launchAcousticIntensityAtDistance({ radialDistance: distance, observerAxial, sourcePositions, sourceWeights, acousticPower, gainDb, atmosphereDbPerKm }) / 1e-12));
  const frequencies = logspace(10, 20000, 120);
  const spectrumCurve = frequencies.map(value => {
    const offset = Math.log2(value / peakFrequency);
    const fraction = clamp(0.16 * Math.exp(-0.5 * (offset / 1.15) ** 2), 1e-8, 0.2);
    return overallLevel + 10 * Math.log10(fraction);
  });
  const contributionIntensity = sourcePositions.map((position, index) => {
    const distance = Math.hypot(radialDistance, position - observerAxial);
    const atmosphere = 10 ** (-atmosphereDbPerKm * distance / 1000 / 10);
    return acousticPower * sourceWeights[index] * 10 ** (gainDb / 10) * atmosphere / (4 * Math.PI * distance ** 2);
  });
  return {
    thrust, exhaustVelocity, acousticEfficiency, nozzleDiameter, strouhalNumber, frequency, radialDistance,
    observerAxial, plumeLength, directivityGainDb, reflectionGainDb, suppressionDb, atmosphereDbPerKm,
    sourcePositions, sourceWeights, sourceCentroid, contributionIntensity, mechanicalJetPower, acousticPower,
    soundPowerLevel, gainDb, overallIntensity, overallLevel, peakFrequency, spectralOffsetOctaves,
    bandPowerFraction, bandLevel, distances, levelCurve, frequencies, spectrumCurve,
    distanceToPlumeRatio: radialDistance / plumeLength,
    regime: radialDistance / plumeLength < 2 ? 'distributed-source near-field geometry matters' : 'farther-field spreading dominates the geometry',
    sourceModelBoundary: 'broadband distributed plume-noise screen; ignition overpressure, coherent reflections, shock-cell tones, and pad-specific CFD are separate problems'
  };
}

export function wetTankDynamicsState(input = {}) {
  const radius = positive(input.radius, 2.2);
  const length = positive(input.length, 8);
  const thickness = positive(input.thickness, 0.006);
  const modulus = positive(input.modulus, 70e9);
  const shellDensity = positive(input.shellDensity, 2700);
  const poisson = clamp(number(input.poisson, 0.33), -0.49, 0.49);
  const liquidDensity = positive(input.liquidDensity, 1000);
  const liquidSoundSpeed = positive(input.liquidSoundSpeed, 1200);
  const fillFraction = clamp(number(input.fillFraction, 0.72), 0.01, 1);
  const effectiveAcceleration = Math.max(0, number(input.effectiveAcceleration, 9.80665));
  const axialOrder = Math.max(1, Math.round(number(input.axialOrder, 2)));
  const circumferentialOrder = Math.max(0, Math.round(number(input.circumferentialOrder, 2)));
  const shell = shellAcousticsState({ radius, length, thickness, modulus, density: shellDensity, poisson, axialOrder, circumferentialOrder, soundSpeed: AIR_C });
  const axialWavenumber = axialOrder * Math.PI / length;
  const circumferentialWavenumber = circumferentialOrder / radius;
  const structuralWavenumber = Math.max(Math.hypot(axialWavenumber, circumferentialWavenumber), Math.PI / length);
  const wettedDepth = length * fillFraction;
  const effectiveNormalDepth = Math.min(radius, wettedDepth);
  const localAddedMass = liquidDensity / structuralWavenumber * Math.tanh(structuralWavenumber * effectiveNormalDepth);
  const modalAddedMass = localAddedMass * fillFraction;
  const addedMassRatio = modalAddedMass / shell.surfaceMass;
  const dryShellFrequency = shell.modeFrequency;
  const wetShellFrequency = dryShellFrequency / Math.sqrt(1 + addedMassRatio);
  const sloshWavenumber = 1.84118 / radius;
  const firstSloshFrequency = Math.sqrt(effectiveAcceleration * sloshWavenumber * Math.tanh(sloshWavenumber * wettedDepth)) / TAU;
  const axialLiquidAcousticFrequency = fillFraction < 0.98 ? liquidSoundSpeed / (4 * wettedDepth) : liquidSoundSpeed / (2 * length);
  const radialLiquidAcousticFrequency = 1.84118 * liquidSoundSpeed / (TAU * radius);
  const firstLiquidAcousticFrequency = Math.min(axialLiquidAcousticFrequency, radialLiquidAcousticFrequency);
  const hydroelasticFrequencyRatio = wetShellFrequency / firstLiquidAcousticFrequency;
  const fills = Array.from({ length: 80 }, (_, index) => 0.02 + 0.98 * index / 79);
  const wetFrequencyCurve = fills.map(fill => {
    const depth = Math.min(radius, length * fill);
    const added = liquidDensity / structuralWavenumber * Math.tanh(structuralWavenumber * depth) * fill;
    return dryShellFrequency / Math.sqrt(1 + added / shell.surfaceMass);
  });
  const sloshCurve = fills.map(fill => Math.sqrt(effectiveAcceleration * sloshWavenumber * Math.tanh(sloshWavenumber * length * fill)) / TAU);
  const acousticCurve = fills.map(fill => {
    const axial = fill < 0.98 ? liquidSoundSpeed / (4 * length * fill) : liquidSoundSpeed / (2 * length);
    return Math.min(axial, radialLiquidAcousticFrequency);
  });
  return {
    radius, length, thickness, modulus, shellDensity, poisson, liquidDensity, liquidSoundSpeed,
    fillFraction, effectiveAcceleration, axialOrder, circumferentialOrder, axialWavenumber,
    circumferentialWavenumber, structuralWavenumber, wettedDepth, effectiveNormalDepth, localAddedMass,
    modalAddedMass, addedMassRatio, dryShellFrequency, wetShellFrequency, sloshWavenumber,
    firstSloshFrequency, axialLiquidAcousticFrequency, radialLiquidAcousticFrequency,
    firstLiquidAcousticFrequency, hydroelasticFrequencyRatio, fills, wetFrequencyCurve, sloshCurve,
    acousticCurve, surfaceMass: shell.surfaceMass, ringFrequency: shell.ringFrequency,
    couplingRegime: Math.abs(Math.log(Math.max(hydroelasticFrequencyRatio, 1e-12))) < 0.22 ? 'wet shell and liquid acoustic scales are close; two-way coupling is likely important' : 'wet shell and first liquid acoustic scales are separated in this screen',
    gravityRegime: effectiveAcceleration < 0.1 ? 'near-microgravity: classical gravity-slosh frequency collapses' : 'effective-gravity slosh is active'
  };
}

export function qualificationTestState(input = {}) {
  const flightPsd = positive(input.flightPsd, 0.01);
  const flightDuration = positive(input.flightDuration, 180);
  const testDuration = positive(input.testDuration, 120);
  const fatigueExponent = positive(input.fatigueExponent, 6);
  const marginDb = number(input.marginDb, 3);
  const testArticleMass = positive(input.testArticleMass, 100);
  const apparentMassFraction = clamp(number(input.apparentMassFraction, 0.5), 0.01, 2);
  const forceLimitAsd = positive(input.forceLimitAsd, 100);
  const responseGain = positive(input.responseGain, 8);
  const responseBandwidth = positive(input.responseBandwidth, 20);
  const responseLimitRms = positive(input.responseLimitRms, 4.5);
  const notchCenter = positive(input.notchCenter, 280);
  const notchWidthOctaves = positive(input.notchWidthOctaves, 0.3);
  const flightOaspl = number(input.flightOaspl, 142);
  const acousticMarginDb = number(input.acousticMarginDb, 3);
  const microphoneMinimum = number(input.microphoneMinimum, 144.5);
  const microphoneMaximum = number(input.microphoneMaximum, 146.5);
  const allowedFieldSpread = positive(input.allowedFieldSpread, 3);
  const acousticMethod = String(input.acousticMethod ?? 'dfat').toLowerCase();
  const durationPsdFactor = (flightDuration / testDuration) ** (2 / fatigueExponent);
  const marginPsdFactor = 10 ** (marginDb / 10);
  const unlimitedTestPsd = flightPsd * durationPsdFactor * marginPsdFactor;
  const inputAccelerationAsd = Math.sqrt(unlimitedTestPsd);
  const apparentMass = testArticleMass * apparentMassFraction;
  const predictedForceAsd = apparentMass * inputAccelerationAsd * 9.80665;
  const forceControlScale = clamp((forceLimitAsd / predictedForceAsd) ** 2, 0, 1);
  const predictedResponseRms = responseGain * Math.sqrt(unlimitedTestPsd * responseBandwidth);
  const responseControlScale = clamp((responseLimitRms / predictedResponseRms) ** 2, 0, 1);
  const controlScale = Math.min(1, forceControlScale, responseControlScale);
  const controlledTestPsd = unlimitedTestPsd * controlScale;
  const centerNotchDb = 10 * Math.log10(controlScale);
  const equivalentTestFactorDb = 10 * Math.log10(unlimitedTestPsd / flightPsd);
  const controlledDamageRatio = (controlledTestPsd / flightPsd) ** (fatigueExponent / 2) * testDuration / flightDuration;
  const targetAcousticLevel = flightOaspl + acousticMarginDb;
  const microphoneAverage = (microphoneMinimum + microphoneMaximum) / 2;
  const fieldSpread = microphoneMaximum - microphoneMinimum;
  const fieldControlError = microphoneAverage - targetAcousticLevel;
  const fieldUniformityPass = fieldSpread <= allowedFieldSpread;
  const frequencies = logspace(20, 2000, 120);
  const flightCurve = frequencies.map(value => flightPsd * (value < 60 ? (value / 60) ** 1.5 : value > 900 ? (900 / value) ** 1.2 : 1));
  const unlimitedCurve = flightCurve.map(value => value * durationPsdFactor * marginPsdFactor);
  const controlledCurve = frequencies.map((value, index) => {
    const offset = Math.log2(value / notchCenter);
    const localScale = 1 - (1 - controlScale) * Math.exp(-0.5 * (offset / notchWidthOctaves) ** 2);
    return unlimitedCurve[index] * localScale;
  });
  const limitingMechanism = controlScale >= 0.999 ? 'no force or response notch is active' : forceControlScale <= responseControlScale ? 'interface-force limit controls the notch' : 'response limit controls the notch';
  const methodGuidance = acousticMethod === 'rfat'
    ? 'RFAT can approximate a diffuse reverberant field, but low-frequency modal structure and chamber loading still require spatial control evidence.'
    : acousticMethod === 'dfat'
      ? 'DFAT is portable but can have spatial variation and structural response differences from RFAT even when control microphones meet level tolerances.'
      : 'The entered acoustic method is program-specific; document field coherence, spatial uniformity, control strategy, and response equivalence.';
  return {
    flightPsd, flightDuration, testDuration, fatigueExponent, marginDb, testArticleMass,
    apparentMassFraction, forceLimitAsd, responseGain, responseBandwidth, responseLimitRms,
    notchCenter, notchWidthOctaves, flightOaspl, acousticMarginDb, microphoneMinimum,
    microphoneMaximum, allowedFieldSpread, acousticMethod, durationPsdFactor, marginPsdFactor,
    unlimitedTestPsd, inputAccelerationAsd, apparentMass, predictedForceAsd, forceControlScale,
    predictedResponseRms, responseControlScale, controlScale, controlledTestPsd, centerNotchDb,
    equivalentTestFactorDb, controlledDamageRatio, targetAcousticLevel, microphoneAverage,
    fieldSpread, fieldControlError, fieldUniformityPass, frequencies, flightCurve, unlimitedCurve,
    controlledCurve, limitingMechanism, methodGuidance,
    qualificationBoundary: 'screening-level tailoring aid; governing qualification factors, durations, tolerances, notches, and applicability remain program-controlled requirements'
  };
}

export const ACS519_DEFAULTS = Object.freeze({
  modalRadiation: { length: 1.8, width: 1.1, modeX: 1, modeY: 1, frequency: 350, soundSpeed: AIR_C },
  piston: { radius: 0.12, frequency: 800, soundSpeed: AIR_C, density: AIR_RHO },
  shell: { radius: 1.8, length: 7.5, thickness: 0.004, modulus: 70e9, density: 2700, poisson: 0.33, soundSpeed: AIR_C, axialOrder: 1, circumferentialOrder: 2 }
});
