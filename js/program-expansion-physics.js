/* Program-level launch-vehicle vibroacoustic workflow models. */

const TAU = 2 * Math.PI;
const RHO_AIR = 1.204;
const C_AIR = 343;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const linspace = (low, high, count) => Array.from({ length: count }, (_, index) => low + (high - low) * index / Math.max(1, count - 1));
const logspace = (low, high, count) => {
  const a = Math.log10(low), b = Math.log10(high);
  return Array.from({ length: count }, (_, index) => 10 ** (a + (b - a) * index / Math.max(1, count - 1)));
};
const db10 = value => 10 * Math.log10(Math.max(value, 1e-30));
const fromDb10 = value => 10 ** (value / 10);
const db20 = value => 20 * Math.log10(Math.max(Math.abs(value), 1e-30));

const complex = (re = 0, im = 0) => ({ re, im });
const cadd = (a, b) => complex(a.re + b.re, a.im + b.im);
const cmul = (a, b) => complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cscale = (a, scale) => complex(a.re * scale, a.im * scale);
const cdiv = (a, b) => {
  const denominator = b.re ** 2 + b.im ** 2;
  return complex((a.re * b.re + a.im * b.im) / Math.max(denominator, 1e-30), (a.im * b.re - a.re * b.im) / Math.max(denominator, 1e-30));
};
const cabs = value => Math.hypot(value.re, value.im);
const cexp = phase => complex(Math.cos(phase), Math.sin(phase));
const ccot = value => {
  const denominator = Math.cosh(2 * value.im) - Math.cos(2 * value.re);
  return complex(Math.sin(2 * value.re) / Math.max(denominator, 1e-30), -Math.sinh(2 * value.im) / Math.max(denominator, 1e-30));
};

function gamma(value) {
  const coefficients = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7];
  if (value < 0.5) return Math.PI / (Math.sin(Math.PI * value) * gamma(1 - value));
  let z = value - 1, x = 0.9999999999998099;
  coefficients.forEach((coefficient, index) => { x += coefficient / (z + index + 1); });
  const t = z + coefficients.length - 0.5;
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * x;
}

export function nonstationaryEnvironmentState(input = {}) {
  const duration = Math.max(0.1, num(input.duration, 12));
  const eventCenter = clamp(num(input.eventCenter, 4.2), 0, duration);
  const eventWidth = Math.max(0.02, num(input.eventWidth, 0.75));
  const backgroundPsd = Math.max(0, num(input.backgroundPsd, 0.008));
  const burstPsd = Math.max(0, num(input.burstPsd, 0.07));
  const naturalFrequency = Math.max(1, num(input.naturalFrequency, 180));
  const q = Math.max(0.2, num(input.q, 10));
  const kurtosis = Math.max(1, num(input.kurtosis, 5));
  const fatigueExponent = Math.max(0.5, num(input.fatigueExponent, 6));
  const times = linspace(0, duration, 360);
  const envelope = times.map(time => Math.exp(-0.5 * ((time - eventCenter) / eventWidth) ** 2));
  const localPsd = envelope.map(value => backgroundPsd + burstPsd * value);
  const localRms = localPsd.map(psd => Math.sqrt(Math.PI / 2 * naturalFrequency * q * psd));
  const meanPsd = localPsd.reduce((sum, value) => sum + value, 0) / localPsd.length;
  const stationaryRms = Math.sqrt(Math.PI / 2 * naturalFrequency * q * meanPsd);
  const peakOpportunities = Math.max(1, 2 * naturalFrequency / q * duration);
  const gaussianCrest = Math.sqrt(Math.max(1, 2 * Math.log(peakOpportunities / 0.01)));
  const nonGaussianFactor = (kurtosis / 3) ** 0.18;
  const burstPeak = Math.max(...localRms) * gaussianCrest * nonGaussianFactor;
  const stationaryPeak = stationaryRms * gaussianCrest;
  const dt = duration / Math.max(1, times.length - 1);
  const burstDamageIndex = localRms.reduce((sum, value) => sum + value ** fatigueExponent * dt, 0);
  const stationaryDamageIndex = stationaryRms ** fatigueExponent * duration;
  const cumulativeDamage = [];
  localRms.reduce((sum, value) => { const next = sum + value ** fatigueExponent * dt; cumulativeDamage.push(next); return next; }, 0);
  return {
    duration, eventCenter, eventWidth, backgroundPsd, burstPsd, naturalFrequency, q, kurtosis, fatigueExponent,
    times, envelope, localPsd, localRms, cumulativeDamage, meanPsd, stationaryRms, gaussianCrest, nonGaussianFactor,
    burstPeak, stationaryPeak, peakRatio: burstPeak / Math.max(stationaryPeak, 1e-30),
    burstDamageIndex, stationaryDamageIndex, damageRatio: burstDamageIndex / Math.max(stationaryDamageIndex, 1e-30),
    regime: kurtosis > 4.5 ? 'strongly non-Gaussian transient environment' : eventWidth / duration < 0.15 ? 'nonstationary burst environment' : 'approximately stationary Gaussian environment'
  };
}

function sdofMagnitude(frequency, naturalFrequency, damping) {
  const ratio = frequency / naturalFrequency;
  return 1 / Math.sqrt((1 - ratio ** 2) ** 2 + (2 * damping * ratio) ** 2);
}

export function mimoTestState(input = {}) {
  const frequency = Math.max(1, num(input.frequency, 180));
  const fixtureFrequency = Math.max(1, num(input.fixtureFrequency, 220));
  const fixtureDamping = clamp(num(input.fixtureDamping, 0.04), 0.001, 0.5);
  const axis1Psd = Math.max(0, num(input.axis1Psd, 0.04));
  const axis2Psd = Math.max(0, num(input.axis2Psd, 0.025));
  const inputCorrelation = clamp(num(input.inputCorrelation, 0.35), -0.99, 0.99);
  const crossCoupling = clamp(num(input.crossCoupling, 0.22), 0, 2);
  const crossPhaseDegrees = num(input.crossPhaseDegrees, 65);
  const crossPhase = crossPhaseDegrees * Math.PI / 180;
  const fixtureGain = sdofMagnitude(frequency, fixtureFrequency, fixtureDamping);
  const h11 = complex(fixtureGain, 0), h22 = complex(0.86 * fixtureGain, 0);
  const h12 = cscale(cexp(crossPhase), crossCoupling * fixtureGain);
  const h21 = cscale(cexp(-0.72 * crossPhase), 0.8 * crossCoupling * fixtureGain);
  const s12 = inputCorrelation * Math.sqrt(axis1Psd * axis2Psd);
  const responsePsd1 = Math.max(0, cabs(h11) ** 2 * axis1Psd + cabs(h12) ** 2 * axis2Psd + 2 * s12 * (h11.re * h12.re + h11.im * h12.im));
  const responsePsd2 = Math.max(0, cabs(h21) ** 2 * axis1Psd + cabs(h22) ** 2 * axis2Psd + 2 * s12 * (h21.re * h22.re + h21.im * h22.im));
  const responseCross = cadd(cadd(cscale(cmul(h11, complex(h21.re, -h21.im)), axis1Psd), cscale(cmul(h12, complex(h22.re, -h22.im)), axis2Psd)), cscale(cadd(cmul(h11, complex(h22.re, -h22.im)), cmul(h12, complex(h21.re, -h21.im))), s12));
  const responseCoherence = clamp(cabs(responseCross) ** 2 / Math.max(responsePsd1 * responsePsd2, 1e-30), 0, 1);
  const determinant = cabs(cadd(cmul(h11, h22), cscale(cmul(h12, h21), -1)));
  const conditionIndicator = (cabs(h11) + cabs(h12) + cabs(h21) + cabs(h22)) ** 2 / Math.max(determinant, 1e-12);
  const crossAxisRatio = Math.sqrt(Math.max(0, cabs(h12) ** 2 * axis2Psd / Math.max(cabs(h11) ** 2 * axis1Psd, 1e-30)));
  const frequencies = linspace(0.45 * fixtureFrequency, 1.65 * fixtureFrequency, 180);
  const axis1Sweep = frequencies.map(sample => {
    const gain = sdofMagnitude(sample, fixtureFrequency, fixtureDamping);
    return gain ** 2 * (axis1Psd + crossCoupling ** 2 * axis2Psd + 2 * inputCorrelation * crossCoupling * Math.sqrt(axis1Psd * axis2Psd) * Math.cos(crossPhase));
  });
  const axis2Sweep = frequencies.map(sample => {
    const gain = sdofMagnitude(sample, fixtureFrequency, fixtureDamping);
    return gain ** 2 * (0.64 * crossCoupling ** 2 * axis1Psd + 0.86 ** 2 * axis2Psd + 2 * inputCorrelation * 0.8 * crossCoupling * 0.86 * Math.sqrt(axis1Psd * axis2Psd) * Math.cos(0.72 * crossPhase));
  });
  return {
    frequency, fixtureFrequency, fixtureDamping, axis1Psd, axis2Psd, inputCorrelation, crossCoupling, crossPhaseDegrees,
    fixtureGain, responsePsd1, responsePsd2, responseCross, responseCoherence, conditionIndicator, crossAxisRatio,
    frequencies, axis1Sweep, axis2Sweep,
    controlRisk: conditionIndicator > 50 ? 'ill-conditioned MIMO control near a coupled fixture mode' : crossAxisRatio > 0.35 ? 'cross-axis response requires matrix control' : 'axes are sufficiently separated for screening control'
  };
}

function porousAbsorption(frequency, flowResistivity, thickness, airGap) {
  const x = Math.max(0.01, RHO_AIR * frequency / flowResistivity);
  const zc = complex(RHO_AIR * C_AIR * (1 + 0.0571 * x ** -0.754), -RHO_AIR * C_AIR * 0.087 * x ** -0.732);
  const k0 = TAU * frequency / C_AIR;
  const kc = complex(k0 * (1 + 0.0978 * x ** -0.7), -k0 * 0.189 * x ** -0.595);
  const effectiveDepth = thickness + 0.45 * airGap;
  const porousCot = ccot(cscale(kc, effectiveDepth));
  const surfaceImpedance = cmul(complex(0, -1), cmul(zc, porousCot));
  const z0 = complex(RHO_AIR * C_AIR, 0);
  const reflection = cdiv(cadd(surfaceImpedance, cscale(z0, -1)), cadd(surfaceImpedance, z0));
  return clamp(1 - cabs(reflection) ** 2, 0, 1);
}

export function acousticTreatmentState(input = {}) {
  const frequency = Math.max(20, num(input.frequency, 500));
  const flowResistivity = Math.max(100, num(input.flowResistivity, 18000));
  const thickness = Math.max(0.001, num(input.thicknessMm, 50) / 1000);
  const airGap = Math.max(0, num(input.airGapMm, 25) / 1000);
  const coverage = clamp(num(input.coverage, 0.7), 0, 1);
  const blanketMass = Math.max(0, num(input.blanketMass, 1.8));
  const baselineAbsorption = clamp(num(input.baselineAbsorption, 0.08), 0.001, 0.99);
  const normalAbsorption = porousAbsorption(frequency, flowResistivity, thickness, airGap);
  const installedAbsorption = clamp((1 - coverage) * baselineAbsorption + coverage * normalAbsorption, 0.001, 0.99);
  const decayReductionDb = 10 * Math.log10(installedAbsorption / baselineAbsorption);
  const massLawTl = db20(TAU * frequency * blanketMass / (2 * RHO_AIR * C_AIR));
  const insertionLoss = Math.max(0, decayReductionDb + 0.35 * Math.max(0, massLawTl));
  const quarterWaveFrequency = C_AIR / (4 * Math.max(thickness + airGap, 1e-6));
  const frequencies = logspace(63, 4000, 160);
  const absorptionCurve = frequencies.map(sample => porousAbsorption(sample, flowResistivity, thickness, airGap));
  const installedCurve = absorptionCurve.map(alpha => clamp((1 - coverage) * baselineAbsorption + coverage * alpha, 0.001, 0.99));
  return {
    frequency, flowResistivity, thickness, airGap, coverage, blanketMass, baselineAbsorption,
    normalAbsorption, installedAbsorption, decayReductionDb, massLawTl, insertionLoss, quarterWaveFrequency,
    frequencies, absorptionCurve, installedCurve,
    regime: frequency < 0.45 * quarterWaveFrequency ? 'thickness-limited low-frequency treatment' : frequency < 1.8 * quarterWaveFrequency ? 'near the absorber depth resonance' : 'resistive porous absorption regime'
  };
}

export function sourceIdentificationState(input = {}) {
  const frequency = Math.max(10, num(input.frequency, 1200));
  const microphoneCount = clamp(Math.round(num(input.microphoneCount, 12)), 3, 64);
  const spacing = Math.max(0.001, num(input.spacingMm, 90) / 1000);
  const sourceAngle = clamp(num(input.sourceAngle, -18), -85, 85);
  const secondaryAngle = clamp(num(input.secondaryAngle, 32), -85, 85);
  const secondaryLevelDb = num(input.secondaryLevelDb, -7);
  const noiseFloorDb = num(input.noiseFloorDb, -24);
  const wavelength = C_AIR / frequency;
  const aperture = spacing * (microphoneCount - 1);
  const positions = Array.from({ length: microphoneCount }, (_, index) => (index - (microphoneCount - 1) / 2) * spacing);
  const steeringAngles = linspace(-85, 85, 341);
  const secondaryAmplitude = 10 ** (secondaryLevelDb / 20), noiseAmplitude = 10 ** (noiseFloorDb / 20);
  const measurements = positions.map((position, index) => cadd(cadd(cexp(-TAU * frequency * position * Math.sin(sourceAngle * Math.PI / 180) / C_AIR), cscale(cexp(-TAU * frequency * position * Math.sin(secondaryAngle * Math.PI / 180) / C_AIR), secondaryAmplitude)), cscale(cexp(0.73 * index + 0.2), noiseAmplitude)));
  const beamPower = steeringAngles.map(angle => {
    const sum = measurements.reduce((value, measurement, index) => cadd(value, cmul(measurement, cexp(TAU * frequency * positions[index] * Math.sin(angle * Math.PI / 180) / C_AIR))), complex());
    return (cabs(sum) / microphoneCount) ** 2;
  });
  const maximum = Math.max(...beamPower, 1e-30);
  const beamDb = beamPower.map(value => db10(value / maximum));
  const strongestIndex = beamPower.indexOf(maximum);
  const identifiedAngle = steeringAngles[strongestIndex];
  const resolutionDegrees = 0.886 * wavelength / Math.max(aperture, wavelength / 20) * 180 / Math.PI;
  const spatialAlias = spacing > wavelength / 2;
  return {
    frequency, microphoneCount, spacing, sourceAngle, secondaryAngle, secondaryLevelDb, noiseFloorDb,
    wavelength, aperture, positions, steeringAngles, beamPower, beamDb, identifiedAngle,
    angleError: identifiedAngle - sourceAngle, resolutionDegrees, spatialAlias,
    diagnosis: spatialAlias ? 'spatial aliasing permits grating-lobe ambiguity' : Math.abs(sourceAngle - secondaryAngle) < resolutionDegrees ? 'sources are inside the array resolution limit' : 'the dominant source is spatially resolvable'
  };
}

export function hybridMethodState(input = {}) {
  const frequency = Math.max(20, num(input.frequency, 800));
  const panelLength = Math.max(0.1, num(input.panelLength, 2.4));
  const panelWidth = Math.max(0.1, num(input.panelWidth, 1.5));
  const thickness = Math.max(0.0001, num(input.thicknessMm, 3) / 1000);
  const modulus = Math.max(1e6, num(input.modulusGpa, 70) * 1e9);
  const density = Math.max(1, num(input.density, 2700));
  const lossFactor = Math.max(0.0001, num(input.lossFactor, 0.025));
  const cavityVolume = Math.max(0.01, num(input.cavityVolume, 18));
  const uncertaintyPercent = Math.max(0, num(input.uncertaintyPercent, 5));
  const poisson = 0.33;
  const rigidity = modulus * thickness ** 3 / (12 * (1 - poisson ** 2));
  const surfaceMass = density * thickness;
  const stateAt = sample => {
    const omega = TAU * sample;
    const bendingWavelength = TAU / (surfaceMass * omega ** 2 / rigidity) ** 0.25;
    const acousticWavelength = C_AIR / sample;
    const structuralModesPerThird = panelLength * panelWidth / (4 * Math.PI) * Math.sqrt(surfaceMass / rigidity) * sample * (2 ** (1 / 6) - 2 ** (-1 / 6));
    const acousticModalDensity = 4 * Math.PI * cavityVolume * sample ** 2 / C_AIR ** 3;
    const acousticModesPerThird = acousticModalDensity * sample * (2 ** (1 / 6) - 2 ** (-1 / 6));
    const overlap = TAU * sample * lossFactor * Math.max(acousticModalDensity, structuralModesPerThird / Math.max(sample * (2 ** (1 / 6) - 2 ** (-1 / 6)), 1e-12));
    const feElements = panelLength * panelWidth / Math.max((bendingWavelength / 10) ** 2, 1e-12);
    const method = structuralModesPerThird >= 5 && acousticModesPerThird >= 5 && overlap >= 1 ? 'SEA / hybrid statistical' : structuralModesPerThird >= 3 || acousticModesPerThird >= 3 || overlap >= 0.3 ? 'hybrid deterministic–statistical' : feElements < 250000 ? 'deterministic FE / acoustic FE-BE' : 'reduced-order or hybrid model';
    return { sample, bendingWavelength, acousticWavelength, structuralModesPerThird, acousticModesPerThird, overlap, feElements, method };
  };
  const selected = stateAt(frequency), frequencies = logspace(50, 5000, 80), states = frequencies.map(stateAt);
  const firstStatistical = states.find(state => state.method === 'SEA / hybrid statistical')?.sample ?? null;
  return {
    frequency, panelLength, panelWidth, thickness, modulus, density, lossFactor, cavityVolume, uncertaintyPercent,
    ...selected, frequencies, states, firstStatistical,
    structuralModes: states.map(state => state.structuralModesPerThird), acousticModes: states.map(state => state.acousticModesPerThird), overlapCurve: states.map(state => state.overlap), elementCurve: states.map(state => state.feElements),
    bracketLow: frequency * (1 - uncertaintyPercent / 100), bracketHigh: frequency * (1 + uncertaintyPercent / 100)
  };
}

export function vibroacousticFatigueState(input = {}) {
  const stressRms = Math.max(1e-9, num(input.stressRmsMpa, 12));
  const zeroCrossingRate = Math.max(0.001, num(input.zeroCrossingRate, 180));
  const duration = Math.max(0.001, num(input.duration, 120));
  const fatigueExponent = Math.max(0.5, num(input.fatigueExponent, 6));
  const referenceStress = Math.max(1e-9, num(input.referenceStressMpa, 95));
  const referenceCycles = Math.max(1, num(input.referenceCycles, 1e6));
  const bandwidth = clamp(num(input.bandwidth, 0.35), 0, 1);
  const kurtosis = Math.max(1, num(input.kurtosis, 3));
  const missionRepeats = Math.max(1, Math.round(num(input.missionRepeats, 4)));
  const expectedRangeMoment = 2 ** fatigueExponent * stressRms ** fatigueExponent * gamma(1 + fatigueExponent / 2);
  const cycles = zeroCrossingRate * duration;
  const narrowbandDamage = cycles * expectedRangeMoment / (referenceCycles * referenceStress ** fatigueExponent);
  const bandwidthCorrection = 1 + 0.85 * bandwidth ** 1.6;
  const nonGaussianCorrection = (kurtosis / 3) ** (fatigueExponent / 4);
  const correctedDamagePerEvent = narrowbandDamage * bandwidthCorrection * nonGaussianCorrection;
  const missionDamage = correctedDamagePerEvent * missionRepeats;
  const margin = 1 / Math.max(missionDamage, 1e-30) - 1;
  const damageEquivalentStress = stressRms * (bandwidthCorrection * nonGaussianCorrection * missionRepeats) ** (1 / fatigueExponent);
  const stressValues = linspace(0.35 * stressRms, 1.8 * stressRms, 120);
  const damageCurve = stressValues.map(value => correctedDamagePerEvent * (value / stressRms) ** fatigueExponent);
  return {
    stressRms, zeroCrossingRate, duration, fatigueExponent, referenceStress, referenceCycles, bandwidth, kurtosis, missionRepeats,
    cycles, narrowbandDamage, bandwidthCorrection, nonGaussianCorrection, correctedDamagePerEvent, missionDamage, margin, damageEquivalentStress,
    stressValues, damageCurve,
    regime: missionDamage >= 1 ? 'screening fatigue failure' : missionDamage >= 0.3 ? 'fatigue life is margin-sensitive' : 'screening fatigue margin remains positive'
  };
}

const missionEvents = Object.freeze([
  { name: 'Liftoff', start: 0, duration: 18, acoustic: 1, random: 0.72, shock: 0.08, thermal: 0.18 },
  { name: 'Max-Q / buffet', start: 38, duration: 34, acoustic: 0.62, random: 1, shock: 0.05, thermal: 0.48 },
  { name: 'Sustained engine', start: 72, duration: 76, acoustic: 0.42, random: 0.68, shock: 0.04, thermal: 0.72 },
  { name: 'Stage separation', start: 148, duration: 2.5, acoustic: 0.28, random: 0.35, shock: 1, thermal: 0.62 },
  { name: 'Upper-stage coast', start: 151, duration: 110, acoustic: 0.05, random: 0.12, shock: 0.02, thermal: 1 }
]);

export function missionTimelineState(input = {}) {
  const acousticScale = Math.max(0, num(input.acousticScale, 1));
  const buffetScale = Math.max(0, num(input.buffetScale, 1));
  const shockScale = Math.max(0, num(input.shockScale, 1));
  const thermalScale = Math.max(0, num(input.thermalScale, 1));
  const fatigueExponent = Math.max(1, num(input.fatigueExponent, 6));
  const subsystems = [
    { name: 'Fairing shell', weights: [0.72, 0.25, 0.05, 0.12] },
    { name: 'Payload', weights: [0.58, 0.26, 0.12, 0.04] },
    { name: 'Avionics', weights: [0.18, 0.55, 0.22, 0.05] },
    { name: 'Tank / feed system', weights: [0.08, 0.52, 0.12, 0.28] }
  ];
  const events = missionEvents.map(event => {
    const environment = [event.acoustic * acousticScale, event.random * (event.name.includes('buffet') ? buffetScale : 1), event.shock * shockScale, event.thermal * thermalScale];
    const subsystemSeverity = subsystems.map(subsystem => subsystem.weights.reduce((sum, weight, index) => sum + weight * environment[index] ** 2, 0) ** 0.5);
    const fatigueIndex = event.duration * (0.62 * environment[0] + 0.38 * environment[1]) ** fatigueExponent;
    return { ...event, environment, subsystemSeverity, fatigueIndex };
  });
  const subsystemResults = subsystems.map((subsystem, index) => {
    const ranked = events.map(event => ({ event: event.name, severity: event.subsystemSeverity[index] })).sort((a, b) => b.severity - a.severity);
    return { name: subsystem.name, controllingEvent: ranked[0].event, peakSeverity: ranked[0].severity, ranked };
  });
  const totalFatigue = events.reduce((sum, event) => sum + event.fatigueIndex, 0);
  events.forEach(event => { event.fatigueShare = event.fatigueIndex / Math.max(totalFatigue, 1e-30); });
  const controllingFatigue = [...events].sort((a, b) => b.fatigueIndex - a.fatigueIndex)[0];
  return { acousticScale, buffetScale, shockScale, thermalScale, fatigueExponent, events, subsystems, subsystemResults, totalFatigue, controllingFatigue: controllingFatigue.name, missionEnd: Math.max(...events.map(event => event.start + event.duration)) };
}

export function credibilityState(input = {}) {
  const evidence = [
    { key: 'verification', name: 'Code / equation verification', weight: 0.13, score: clamp(num(input.verification, 4), 0, 5) },
    { key: 'convergence', name: 'Mesh / band convergence', weight: 0.13, score: clamp(num(input.convergence, 3), 0, 5) },
    { key: 'inputs', name: 'Input provenance', weight: 0.12, score: clamp(num(input.inputs, 4), 0, 5) },
    { key: 'calibration', name: 'Calibration evidence', weight: 0.10, score: clamp(num(input.calibration, 3), 0, 5) },
    { key: 'validation', name: 'Independent validation', weight: 0.18, score: clamp(num(input.validation, 2), 0, 5) },
    { key: 'uncertainty', name: 'Uncertainty coverage', weight: 0.13, score: clamp(num(input.uncertainty, 3), 0, 5) },
    { key: 'configuration', name: 'Flight configuration match', weight: 0.14, score: clamp(num(input.configuration, 2), 0, 5) },
    { key: 'review', name: 'Independent review', weight: 0.07, score: clamp(num(input.review, 3), 0, 5) }
  ];
  const weightedScore = 20 * evidence.reduce((sum, item) => sum + item.weight * item.score, 0);
  const minimumScore = Math.min(...evidence.map(item => item.score));
  const weakest = [...evidence].sort((a, b) => a.score - b.score || b.weight - a.weight)[0];
  const maturity = weightedScore >= 85 && minimumScore >= 3 ? 'prediction-ready with documented residual risk' : weightedScore >= 65 && minimumScore >= 2 ? 'decision-support with conditions' : weightedScore >= 45 ? 'calibration or trade-study use only' : 'concept exploration only';
  const gaps = evidence.filter(item => item.score < 3).map(item => item.name);
  return { evidence, weightedScore, minimumScore, weakest, maturity, gaps, decisionReady: weightedScore >= 65 && minimumScore >= 2 };
}

export function capstoneState(input = {}) {
  const sourceOaspl = num(input.sourceOaspl, 152);
  const propagationLoss = Math.max(0, num(input.propagationLoss, 5));
  const fairingTl = Math.max(0, num(input.fairingTl, 18));
  const flankingPenalty = Math.max(0, num(input.flankingPenalty, 5));
  const cavityGain = num(input.cavityGain, 3);
  const structuralGain = Math.max(0, num(input.structuralGain, 2.8));
  const payloadTransfer = Math.max(0, num(input.payloadTransfer, 0.62));
  const mitigationDb = Math.max(0, num(input.mitigationDb, 4));
  const uncertaintyDb = Math.max(0, num(input.uncertaintyDb, 3));
  const payloadLimit = Math.max(0.01, num(input.payloadLimit, 14));
  const externalLevel = sourceOaspl - propagationLoss;
  const effectiveTl = Math.max(0, fairingTl - flankingPenalty);
  const untreatedInteriorLevel = externalLevel - effectiveTl + cavityGain;
  const treatedInteriorLevel = untreatedInteriorLevel - mitigationDb;
  const pressureRms = 20e-6 * 10 ** (treatedInteriorLevel / 20);
  const skinAcceleration = structuralGain * 10 ** ((treatedInteriorLevel - 130) / 20);
  const nominalPayloadResponse = skinAcceleration * payloadTransfer;
  const designPayloadResponse = nominalPayloadResponse * 10 ** (uncertaintyDb / 20);
  const marginDb = db20(payloadLimit / Math.max(designPayloadResponse, 1e-30));
  const pathLabels = ['Source', 'At vehicle', 'Inside fairing', 'After treatment'];
  const pathLevels = [sourceOaspl, externalLevel, untreatedInteriorLevel, treatedInteriorLevel];
  const sensitivities = [
    { name: 'Source level', deltaDb: 1 }, { name: 'Propagation loss', deltaDb: -1 }, { name: 'Fairing TL', deltaDb: -1 },
    { name: 'Flanking penalty', deltaDb: 1 }, { name: 'Cavity gain', deltaDb: 1 }, { name: 'Mitigation', deltaDb: -1 }, { name: 'Uncertainty allowance', deltaDb: 1 }
  ];
  return {
    sourceOaspl, propagationLoss, fairingTl, flankingPenalty, cavityGain, structuralGain, payloadTransfer, mitigationDb, uncertaintyDb, payloadLimit,
    externalLevel, effectiveTl, untreatedInteriorLevel, treatedInteriorLevel, pressureRms, skinAcceleration, nominalPayloadResponse, designPayloadResponse, marginDb,
    pathLabels, pathLevels, sensitivities,
    disposition: marginDb >= 6 ? 'positive design margin with room for maturation' : marginDb >= 0 ? 'positive but uncertainty-sensitive margin' : 'payload response exceeds the screening limit'
  };
}

/* ACS 537 noise-control models. These intentionally remain transparent
 * screening relationships so the paired tools can expose source, path,
 * receiver, field, and measurement assumptions instead of hiding them. */

export function noiseControlPathState(input = {}) {
  const pathLevels = [num(input.path1Level, 96), num(input.path2Level, 91), num(input.path3Level, 86)];
  const reductions = [Math.max(0, num(input.path1Reduction, 8)), Math.max(0, num(input.path2Reduction, 3)), Math.max(0, num(input.path3Reduction, 0))];
  const targetLevel = num(input.targetLevel, 88);
  const beforePowers = pathLevels.map(fromDb10);
  const afterLevels = pathLevels.map((level, index) => level - reductions[index]);
  const afterPowers = afterLevels.map(fromDb10);
  const beforePower = beforePowers.reduce((sum, value) => sum + value, 0);
  const afterPower = afterPowers.reduce((sum, value) => sum + value, 0);
  const beforeLevel = db10(beforePower), afterLevel = db10(afterPower);
  const pathNames = ['Airborne primary', 'Structure-borne flank', 'Leak / secondary'];
  const contributions = afterPowers.map((power, index) => ({ name: pathNames[index], level: afterLevels[index], share: power / afterPower, reduction: reductions[index] }));
  const dominant = [...contributions].sort((a, b) => b.share - a.share)[0];
  const residualFloor = db10(afterPowers.reduce((sum, power, index) => index === contributions.indexOf(dominant) ? sum : sum + power, 0));
  const requiredAdditionalReduction = Math.max(0, afterLevel - targetLevel);
  const treatmentSweep = linspace(0, 25, 101);
  const overallCurve = treatmentSweep.map(reduction => db10(fromDb10(pathLevels[0] - reduction) + afterPowers[1] + afterPowers[2]));
  return {
    pathLevels, reductions, targetLevel, beforeLevel, afterLevel, overallReduction: beforeLevel - afterLevel,
    margin: targetLevel - afterLevel, requiredAdditionalReduction, contributions, dominant, residualFloor,
    treatmentSweep, overallCurve,
    disposition: afterLevel <= targetLevel ? 'receiver criterion satisfied in the screening model' : 'additional receiver reduction is required'
  };
}

function aWeightApprox(frequency) {
  const f2 = frequency ** 2;
  const ra = (12200 ** 2 * f2 ** 2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12200 ** 2));
  return 20 * Math.log10(Math.max(ra, 1e-30)) + 2;
}

export function psychoacousticState(input = {}) {
  const frequency = Math.max(20, num(input.frequency, 1000));
  const azimuth = clamp(num(input.azimuth, 35), -90, 90);
  const headWidth = Math.max(0.08, num(input.headWidth, 0.18));
  const soundLevel = num(input.soundLevel, 80);
  const maskerLevel = num(input.maskerLevel, 68);
  const maskerBandwidth = Math.max(1, num(input.maskerBandwidth, 160));
  const angle = azimuth * Math.PI / 180;
  const itd = headWidth / C_AIR * Math.sin(angle);
  const ildMagnitude = 20 * Math.log10(1 + Math.abs(Math.sin(angle)) * (frequency / 700) ** 1.15);
  const ild = Math.sign(azimuth || 1) * Math.min(24, ildMagnitude);
  const erb = 24.7 * (4.37 * frequency / 1000 + 1);
  const bark = 13 * Math.atan(0.00076 * frequency) + 3.5 * Math.atan((frequency / 7500) ** 2);
  const effectiveMaskerLevel = maskerLevel - Math.max(0, 10 * Math.log10(maskerBandwidth / erb));
  const toneToMasker = soundLevel - effectiveMaskerLevel;
  const localizationCue = frequency < 750 ? 'interaural time difference dominates' : frequency > 2100 ? 'interaural level difference dominates' : 'duplex transition: use both time and level cues';
  const phonApprox = Math.max(0, soundLevel + aWeightApprox(frequency));
  const sonesApprox = 2 ** ((phonApprox - 40) / 10);
  const earCanalResonance = C_AIR / (4 * 0.025);
  const angleSweep = linspace(-90, 90, 181);
  const itdCurve = angleSweep.map(value => 1e6 * headWidth / C_AIR * Math.sin(value * Math.PI / 180));
  const ildCurve = angleSweep.map(value => Math.sign(value || 1) * Math.min(24, 20 * Math.log10(1 + Math.abs(Math.sin(value * Math.PI / 180)) * (frequency / 700) ** 1.15)));
  return {
    frequency, azimuth, headWidth, soundLevel, maskerLevel, maskerBandwidth, itd, itdMicroseconds: 1e6 * itd, ild, erb, bark,
    effectiveMaskerLevel, toneToMasker, localizationCue, phonApprox, sonesApprox, earCanalResonance, angleSweep, itdCurve, ildCurve,
    audibility: toneToMasker >= 6 ? 'clearly above the screening masker' : toneToMasker >= 0 ? 'masking-sensitive / marginally audible' : 'likely masked in the same critical band'
  };
}

export function noiseMetricsState(input = {}) {
  const backgroundLevel = num(input.backgroundLevel, 64);
  const eventLevel = num(input.eventLevel, 92);
  const eventDuration = Math.max(0.001, num(input.eventDuration, 12));
  const totalDuration = Math.max(eventDuration, num(input.totalDuration, 3600));
  const eventFraction = clamp(eventDuration / totalDuration, 0, 1);
  const leq = db10((totalDuration - eventDuration) / totalDuration * fromDb10(backgroundLevel) + eventFraction * fromDb10(eventLevel));
  const sel = eventLevel + 10 * Math.log10(eventDuration);
  const dayLevel = num(input.dayLevel, 67), eveningLevel = num(input.eveningLevel, 63), nightLevel = num(input.nightLevel, 58);
  const ldn = db10((15 * fromDb10(dayLevel) + 9 * fromDb10(nightLevel + 10)) / 24);
  const cnel = db10((12 * fromDb10(dayLevel) + 3 * fromDb10(eveningLevel + 5) + 9 * fromDb10(nightLevel + 10)) / 24);
  const l10 = eventFraction >= 0.1 ? eventLevel : backgroundLevel;
  const l50 = eventFraction >= 0.5 ? eventLevel : backgroundLevel;
  const l90 = eventFraction >= 0.9 ? eventLevel : backgroundLevel;
  const octaveLevels = [num(input.band63, 63), num(input.band125, 55), num(input.band250, 48), num(input.band500, 43), num(input.band1000, 40), num(input.band2000, 37), num(input.band4000, 34), num(input.band8000, 31)];
  const ncOffsets = [24, 15, 7, 2, 0, -2, -3, -4];
  const ncRating = 5 * Math.ceil(Math.max(...octaveLevels.map((level, index) => level - ncOffsets[index])) / 5);
  const speechInterferenceLevel = octaveLevels.slice(3, 7).reduce((sum, value) => sum + value, 0) / 4;
  const rumble = octaveLevels[0] > ncRating + 20 || octaveLevels[1] > ncRating + 12;
  const hiss = octaveLevels.slice(5).some((level, index) => level > ncRating + [0, -1, -2][index] + 4);
  const target = num(input.targetLevel, 70);
  const timeline = linspace(0, totalDuration, 240);
  const eventStart = 0.42 * totalDuration;
  const levelHistory = timeline.map(time => time >= eventStart && time <= eventStart + eventDuration ? eventLevel : backgroundLevel);
  return {
    backgroundLevel, eventLevel, eventDuration, totalDuration, eventFraction, leq, sel, ldn, cnel, l10, l50, l90,
    octaveLevels, ncRating, speechInterferenceLevel, rumble, hiss, target, margin: target - leq, timeline, levelHistory,
    character: rumble ? 'low-frequency rumble is not represented by the single NC rating' : hiss ? 'high-frequency hiss is not represented by the single NC rating' : 'spectrum is reasonably balanced for the screening NC rating'
  };
}

export function acousticMeasurementState(input = {}) {
  const frequency = Math.max(20, num(input.frequency, 1000));
  const microphoneDiameter = Math.max(0.001, num(input.microphoneDiameterMm, 12.7) / 1000);
  const incidenceAngle = clamp(num(input.incidenceAngle, 0), 0, 180);
  const fieldType = String(input.fieldType ?? 'free');
  const microphoneType = String(input.microphoneType ?? 'free-field');
  const windSpeed = Math.max(0, num(input.windSpeed, 4));
  const windscreen = String(input.windscreen ?? 'yes') === 'yes';
  const wallDistance = Math.max(0.01, num(input.wallDistance, 0.8));
  const sourceDistance = Math.max(0.01, num(input.sourceDistance, 3));
  const wavelength = C_AIR / frequency;
  const ka = Math.PI * microphoneDiameter / wavelength;
  const recommendedAngle = fieldType === 'diffuse' ? 75 : microphoneType === 'pressure' ? 90 : 0;
  const orientationError = -Math.min(12, 4.5 * ka ** 1.35 * Math.sin((incidenceAngle - recommendedAngle) * Math.PI / 180) ** 2);
  const fieldMismatch = fieldType === 'diffuse' && microphoneType !== 'random-incidence' ? -Math.min(6, 2.5 * ka) : fieldType === 'confined' && microphoneType === 'free-field' ? Math.min(4, 1.8 * ka) : 0;
  const windPenalty = Math.max(0, 20 * Math.log10(1 + windSpeed / 2) - (windscreen ? 11 : 0));
  const reflectionNotch = C_AIR / (4 * wallDistance);
  const farFieldRatio = sourceDistance / wavelength;
  const totalBias = orientationError + fieldMismatch;
  const usable = Math.abs(totalBias) < 1.5 && windPenalty < 3 && farFieldRatio > 1;
  const frequencies = logspace(31.5, 16000, 160);
  const responseBias = frequencies.map(sample => {
    const sampleKa = Math.PI * microphoneDiameter * sample / C_AIR;
    return -Math.min(12, 4.5 * sampleKa ** 1.35 * Math.sin((incidenceAngle - recommendedAngle) * Math.PI / 180) ** 2) + (fieldType === 'diffuse' && microphoneType !== 'random-incidence' ? -Math.min(6, 2.5 * sampleKa) : 0);
  });
  return {
    frequency, microphoneDiameter, incidenceAngle, fieldType, microphoneType, windSpeed, windscreen, wallDistance, sourceDistance,
    wavelength, ka, recommendedAngle, orientationError, fieldMismatch, windPenalty, reflectionNotch, farFieldRatio, totalBias, usable,
    frequencies, responseBias,
    recommendation: usable ? 'setup is credible for screening after calibration and background checks' : 'change microphone, orientation, wind protection, or geometry before trusting the result'
  };
}

export function canonicalSourceState(input = {}) {
  const sourceType = String(input.sourceType ?? 'dipole');
  const order = sourceType === 'monopole' ? 0 : sourceType === 'dipole' ? 1 : 2;
  const frequency = Math.max(1, num(input.frequency, 500));
  const separation = Math.max(0.001, num(input.separation, 0.08));
  const distance = Math.max(0.01, num(input.distance, 10));
  const angleDegrees = clamp(num(input.angle, 35), 0, 180);
  const soundPowerLevel = num(input.soundPowerLevel, 110);
  const flowSpeed = Math.max(0.1, num(input.flowSpeed, 80));
  const wavelength = C_AIR / frequency, k = TAU * frequency / C_AIR, kd = k * separation, kr = k * distance;
  const angle = angleDegrees * Math.PI / 180;
  const rawPattern = order === 0 ? 1 : order === 1 ? Math.cos(angle) ** 2 : Math.cos(angle) ** 4;
  const normalization = [1, 3, 5][order];
  const directionalFactor = Math.max(1e-12, normalization * rawPattern);
  const directivityIndex = db10(directionalFactor);
  const compactEfficiency = order === 0 ? 1 : Math.min(1, kd ** (2 * order));
  const receivedLevel = soundPowerLevel + directivityIndex - 10 * Math.log10(4 * Math.PI * distance ** 2);
  const velocityExponent = [4, 6, 8][order];
  const tenPercentSpeedChangeDb = 10 * velocityExponent * Math.log10(1.1);
  const angles = linspace(0, 360, 361);
  const pattern = angles.map(value => {
    const theta = value * Math.PI / 180;
    const intensity = order === 0 ? 1 : order === 1 ? Math.cos(theta) ** 2 : Math.cos(theta) ** 4;
    return db10(Math.max(1e-6, intensity));
  });
  return {
    sourceType, order, frequency, separation, distance, angleDegrees, soundPowerLevel, flowSpeed, wavelength, k, kd, kr,
    directionalFactor, directivityIndex, compactEfficiency, receivedLevel, velocityExponent, tenPercentSpeedChangeDb, angles, pattern,
    region: kr < 1 ? 'hydrodynamic / reactive near field' : kr < 10 ? 'geometric near field with phase-sensitive interference' : 'geometric far field'
  };
}

export function sourceGeometryState(input = {}) {
  const longDimension = Math.max(0.01, num(input.longDimension, 8));
  const shortDimension = Math.max(0.01, Math.min(longDimension, num(input.shortDimension, 2)));
  const distance = Math.max(0.01, num(input.distance, 3));
  const referenceLevel = num(input.referenceLevel, 105);
  const planeLimit = shortDimension / Math.PI, lineLimit = longDimension / Math.PI;
  const levelAt = range => {
    if (range <= planeLimit) return referenceLevel;
    if (range <= lineLimit) return referenceLevel - 10 * Math.log10(range / planeLimit);
    return referenceLevel - 10 * Math.log10(lineLimit / planeLimit) - 20 * Math.log10(range / lineLimit);
  };
  const level = levelAt(distance);
  const regime = distance <= planeLimit ? 'plane-source region: approximately 0 dB per doubling' : distance <= lineLimit ? 'line-source region: approximately 3 dB per doubling' : 'point-source region: approximately 6 dB per doubling';
  const distances = logspace(Math.max(0.02, planeLimit / 20), Math.max(100, lineLimit * 20), 180);
  const levels = distances.map(levelAt);
  return { longDimension, shortDimension, distance, referenceLevel, planeLimit, lineLimit, level, regime, distances, levels };
}

export function fanDuctState(input = {}) {
  const sourcePowerLevel = num(input.sourcePowerLevel, 105);
  const rpm = Math.max(1, num(input.rpm, 1800));
  const blades = Math.max(1, Math.round(num(input.blades, 12)));
  const ductLength = Math.max(0, num(input.ductLength, 12));
  const attenuationRate = Math.max(0, num(input.attenuationRate, 0.45));
  const branchFraction = clamp(num(input.branchFraction, 0.35), 0.01, 1);
  const elbowLoss = Math.max(0, num(input.elbowLoss, 3));
  const elbowGeneration = num(input.elbowGeneration, 58);
  const grilleGeneration = num(input.grilleGeneration, 62);
  const roomConstant = Math.max(0.1, num(input.roomConstant, 45));
  const receiverDistance = Math.max(0.1, num(input.receiverDistance, 4));
  const bladePassageFrequency = rpm / 60 * blades;
  const outletLevel = sourcePowerLevel - 3;
  const afterDuct = outletLevel - attenuationRate * ductLength;
  const afterBranch = afterDuct + 10 * Math.log10(branchFraction);
  const afterElbow = afterBranch - elbowLoss;
  const deliveredPowerLevel = db10(fromDb10(afterElbow) + fromDb10(elbowGeneration) + fromDb10(grilleGeneration));
  const roomLevel = deliveredPowerLevel + 10 * Math.log10(1 / (4 * Math.PI * receiverDistance ** 2) + 4 / roomConstant);
  const stages = [sourcePowerLevel, outletLevel, afterDuct, afterBranch, afterElbow, deliveredPowerLevel];
  const stageNames = ['Fan total', 'One outlet', 'After duct', 'Selected branch', 'After elbow loss', 'After regenerated noise'];
  return {
    sourcePowerLevel, rpm, blades, ductLength, attenuationRate, branchFraction, elbowLoss, elbowGeneration, grilleGeneration,
    roomConstant, receiverDistance, bladePassageFrequency, outletLevel, afterDuct, afterBranch, afterElbow, deliveredPowerLevel, roomLevel,
    stages, stageNames, regeneratedShare: (fromDb10(elbowGeneration) + fromDb10(grilleGeneration)) / fromDb10(deliveredPowerLevel),
    controller: deliveredPowerLevel - afterElbow > 1 ? 'flow-generated fitting and grille noise controls the delivered spectrum' : 'transmitted fan power remains dominant'
  };
}

function atmosphericAbsorptionDbPerMeter(frequency, temperatureC, relativeHumidity) {
  const T = temperatureC + 273.15, T0 = 293.15, Tr = T / T0;
  const saturation = 10 ** (-6.8346 * (273.16 / T) ** 1.261 + 4.6151);
  const h = clamp(relativeHumidity, 0, 100) * saturation / 101.325;
  const frO = 24 + 4.04e4 * h * (0.02 + h) / (0.391 + h);
  const frN = Tr ** -0.5 * (9 + 280 * h * Math.exp(-4.17 * (Tr ** (-1 / 3) - 1)));
  return 8.686 * frequency ** 2 * (1.84e-11 * Tr ** 0.5 + Tr ** -2.5 * (
    0.01275 * Math.exp(-2239.1 / T) / (frO + frequency ** 2 / frO) +
    0.1068 * Math.exp(-3352 / T) / (frN + frequency ** 2 / frN)
  ));
}

export function outdoorPropagationState(input = {}) {
  const sourcePowerLevel = num(input.sourcePowerLevel, 135);
  const frequency = Math.max(20, num(input.frequency, 1000));
  const distance = Math.max(1, num(input.distance, 500));
  const sourceHeight = Math.max(0.1, num(input.sourceHeight, 8));
  const receiverHeight = Math.max(0.1, num(input.receiverHeight, 2));
  const temperature = num(input.temperature, 20);
  const humidity = clamp(num(input.humidity, 60), 1, 100);
  const effectiveGradient = num(input.effectiveGradient, 0.002);
  const groundType = String(input.groundType ?? 'mixed');
  const turbulenceCoherence = clamp(num(input.turbulenceCoherence, 0.65), 0, 1);
  const vegetationLength = Math.max(0, num(input.vegetationLength, 0));
  const directivity = Math.max(0.01, num(input.directivity, 2));
  const directRange = Math.hypot(distance, receiverHeight - sourceHeight);
  const reflectedRange = Math.hypot(distance, receiverHeight + sourceHeight);
  const wavelength = C_AIR / frequency;
  const absorptionRate = atmosphericAbsorptionDbPerMeter(frequency, temperature, humidity);
  const atmosphericLoss = absorptionRate * directRange;
  const reflectionMagnitude = groundType === 'hard' ? 0.92 : groundType === 'soft' ? 0.32 : 0.62;
  const phase = TAU * (reflectedRange - directRange) / wavelength;
  const groundFactor = Math.max(1e-6, 1 + reflectionMagnitude ** 2 + 2 * turbulenceCoherence * reflectionMagnitude * Math.cos(phase));
  const groundEffect = db10(groundFactor);
  const meteorology = clamp(3.2 * Math.tanh(effectiveGradient * distance / 1.5), -10, 6);
  const vegetationLoss = Math.min(12, vegetationLength * (0.0015 * Math.sqrt(frequency) + 0.003));
  const freeFieldLevel = sourcePowerLevel + db10(directivity) - 10 * Math.log10(4 * Math.PI * directRange ** 2);
  const receivedLevel = freeFieldLevel - atmosphericLoss + groundEffect + meteorology - vegetationLoss;
  const distances = logspace(10, Math.max(5000, distance * 2), 180);
  const levelCurve = distances.map(sample => {
    const r = Math.hypot(sample, receiverHeight - sourceHeight);
    return sourcePowerLevel + db10(directivity) - 10 * Math.log10(4 * Math.PI * r ** 2) - absorptionRate * r + clamp(3.2 * Math.tanh(effectiveGradient * sample / 1.5), -10, 6);
  });
  return {
    sourcePowerLevel, frequency, distance, sourceHeight, receiverHeight, temperature, humidity, effectiveGradient, groundType,
    turbulenceCoherence, vegetationLength, directivity, directRange, reflectedRange, wavelength, absorptionRate, atmosphericLoss,
    reflectionMagnitude, phase, groundEffect, meteorology, vegetationLoss, freeFieldLevel, receivedLevel, distances, levelCurve,
    weatherRegime: effectiveGradient < -0.001 ? 'upward refraction / possible shadow-zone sensitivity' : effectiveGradient > 0.001 ? 'downward refraction / enhanced long-range propagation' : 'approximately neutral effective sound-speed gradient'
  };
}

export function barrierDiffractionState(input = {}) {
  const frequency = Math.max(20, num(input.frequency, 500));
  const sourceDistance = Math.max(0.1, num(input.sourceDistance, 12));
  const receiverDistance = Math.max(0.1, num(input.receiverDistance, 18));
  const sourceHeight = Math.max(0, num(input.sourceHeight, 2));
  const receiverHeight = Math.max(0, num(input.receiverHeight, 1.5));
  const barrierHeight = Math.max(0, num(input.barrierHeight, 5));
  const sideClearance = Math.max(0.1, num(input.sideClearance, 30));
  const panelTl = Math.max(0, num(input.panelTl, 25));
  const leakageFraction = clamp(num(input.leakageFraction, 0.002), 0, 1);
  const wavelength = C_AIR / frequency;
  const direct = Math.hypot(sourceDistance + receiverDistance, sourceHeight - receiverHeight);
  const topPath = Math.hypot(sourceDistance, barrierHeight - sourceHeight) + Math.hypot(receiverDistance, barrierHeight - receiverHeight);
  const sidePath = Math.hypot(sourceDistance + receiverDistance, sideClearance);
  const fresnel = Math.max(0, 2 * (topPath - direct) / wavelength);
  const sideFresnel = Math.max(0, 2 * (sidePath - direct) / wavelength);
  const attenuation = value => {
    if (value <= 0) return 0;
    const root = Math.sqrt(2 * Math.PI * value);
    return Math.min(30, 5 + 20 * Math.log10(root / Math.max(Math.tanh(root), 1e-12)));
  };
  const topAttenuation = attenuation(fresnel), sideAttenuation = attenuation(sideFresnel);
  const fractions = [fromDb10(-topAttenuation), fromDb10(-sideAttenuation), fromDb10(-panelTl), leakageFraction];
  const totalFraction = Math.min(1, fractions.reduce((sum, value) => sum + value, 0));
  const insertionLoss = -db10(totalFraction);
  const pathShares = fractions.map(value => value / Math.max(totalFraction, 1e-30));
  const frequencies = logspace(31.5, 8000, 150);
  const insertionCurve = frequencies.map(sample => {
    const n = Math.max(0, 2 * (topPath - direct) / (C_AIR / sample));
    const ns = Math.max(0, 2 * (sidePath - direct) / (C_AIR / sample));
    return -db10(Math.min(1, fromDb10(-attenuation(n)) + fromDb10(-attenuation(ns)) + fromDb10(-panelTl) + leakageFraction));
  });
  return {
    frequency, sourceDistance, receiverDistance, sourceHeight, receiverHeight, barrierHeight, sideClearance, panelTl, leakageFraction,
    wavelength, direct, topPath, sidePath, fresnel, sideFresnel, topAttenuation, sideAttenuation, insertionLoss, pathShares,
    frequencies, insertionCurve,
    controllingPath: ['top diffraction', 'finite-end bypass', 'through-panel transmission', 'leakage'][pathShares.indexOf(Math.max(...pathShares))]
  };
}

export function roomFieldState(input = {}) {
  const soundPowerLevel = num(input.soundPowerLevel, 105);
  const length = Math.max(0.1, num(input.length, 10)), width = Math.max(0.1, num(input.width, 7)), height = Math.max(0.1, num(input.height, 4));
  const absorption = clamp(num(input.absorption, 0.18), 0.001, 0.99);
  const directivity = Math.max(0.01, num(input.directivity, 2));
  const distance = Math.max(0.1, num(input.distance, 3));
  const volume = length * width * height;
  const surfaceArea = 2 * (length * width + length * height + width * height);
  const roomConstant = surfaceArea * absorption / (1 - absorption);
  const directTerm = directivity / (4 * Math.PI * distance ** 2), reverberantTerm = 4 / roomConstant;
  const totalLevel = soundPowerLevel + db10(directTerm + reverberantTerm);
  const directLevel = soundPowerLevel + db10(directTerm), reverberantLevel = soundPowerLevel + db10(reverberantTerm);
  const criticalDistance = Math.sqrt(directivity * roomConstant / (16 * Math.PI));
  const sabineT60 = 0.161 * volume / (surfaceArea * absorption);
  const eyringT60 = 0.161 * volume / (-surfaceArea * Math.log(1 - absorption));
  const schroederFrequency = 2000 * Math.sqrt(eyringT60 / volume);
  const meanFreePath = 4 * volume / surfaceArea;
  const timeConstant = eyringT60 / 13.8;
  const distances = logspace(0.1, Math.max(30, Math.hypot(length, width)), 160);
  const directCurve = distances.map(sample => soundPowerLevel + db10(directivity / (4 * Math.PI * sample ** 2)));
  const totalCurve = distances.map(sample => soundPowerLevel + db10(directivity / (4 * Math.PI * sample ** 2) + reverberantTerm));
  return {
    soundPowerLevel, length, width, height, absorption, directivity, distance, volume, surfaceArea, roomConstant, directTerm,
    reverberantTerm, totalLevel, directLevel, reverberantLevel, criticalDistance, sabineT60, eyringT60, schroederFrequency,
    meanFreePath, timeConstant, distances, directCurve, totalCurve,
    regime: distance < criticalDistance ? 'direct field dominates at the receiver' : 'reverberant field dominates at the receiver'
  };
}

export function enclosureDesignState(input = {}) {
  const internalPowerLevel = num(input.internalPowerLevel, 105);
  const totalArea = Math.max(0.1, num(input.totalArea, 18));
  const openingArea = clamp(num(input.openingArea, 0.08), 0, totalArea);
  const panelTl = Math.max(0, num(input.panelTl, 28));
  const openingTl = Math.max(0, num(input.openingTl, 3));
  const flankingAreaFraction = clamp(num(input.flankingAreaFraction, 0.015), 0, 1);
  const flankingTl = Math.max(0, num(input.flankingTl, 10));
  const internalAbsorption = clamp(num(input.internalAbsorption, 0.3), 0.01, 0.99);
  const receiverDistance = Math.max(0.1, num(input.receiverDistance, 8));
  const targetLevel = num(input.targetLevel, 70);
  const solidArea = Math.max(0, totalArea - openingArea);
  const normalized = totalArea;
  const panelFraction = solidArea / normalized * fromDb10(-panelTl);
  const openingFraction = openingArea / normalized * fromDb10(-openingTl);
  const flankFraction = flankingAreaFraction * fromDb10(-flankingTl);
  const effectiveTransmission = Math.max(1e-30, panelFraction + openingFraction + flankFraction);
  const effectiveTl = -db10(effectiveTransmission);
  const correction = 10 * Math.log10(0.3 + (1 - internalAbsorption) / internalAbsorption);
  const outsidePowerLevel = internalPowerLevel - effectiveTl + correction;
  const receiverLevel = outsidePowerLevel - 10 * Math.log10(4 * Math.PI * receiverDistance ** 2);
  const requiredAdditionalTl = Math.max(0, receiverLevel - targetLevel);
  const pathShares = [panelFraction, openingFraction, flankFraction].map(value => value / effectiveTransmission);
  const openings = logspace(1e-4, Math.min(totalArea * 0.2, 2), 150);
  const effectiveTlCurve = openings.map(area => -db10((totalArea - area) / totalArea * fromDb10(-panelTl) + area / totalArea * fromDb10(-openingTl) + flankFraction));
  return {
    internalPowerLevel, totalArea, openingArea, panelTl, openingTl, flankingAreaFraction, flankingTl, internalAbsorption,
    receiverDistance, targetLevel, solidArea, effectiveTransmission, effectiveTl, correction, outsidePowerLevel, receiverLevel,
    requiredAdditionalTl, pathShares, openings, effectiveTlCurve,
    controllingPath: ['panel field', 'opening / ventilation', 'structure-borne flank'][pathShares.indexOf(Math.max(...pathShares))]
  };
}

export function absorberResonatorState(input = {}) {
  const tubeDiameter = Math.max(0.005, num(input.tubeDiameter, 0.1));
  const microphoneSpacing = Math.max(0.002, num(input.microphoneSpacing, 0.05));
  const reflectionMagnitude = clamp(num(input.reflectionMagnitude, 0.55), 0, 1);
  const chamberVolume = Math.max(0.1, num(input.chamberVolume, 180));
  const sampleArea = Math.max(0.01, num(input.sampleArea, 10));
  const emptyT60 = Math.max(0.01, num(input.emptyT60, 5.2));
  const loadedT60 = Math.max(0.01, num(input.loadedT60, 3.1));
  const neckArea = Math.max(1e-5, num(input.neckArea, 0.006));
  const cavityVolume = Math.max(1e-5, num(input.cavityVolume, 0.03));
  const neckLength = Math.max(0.001, num(input.neckLength, 0.05));
  const neckRadius = Math.sqrt(neckArea / Math.PI), effectiveNeck = neckLength + 1.7 * neckRadius;
  const normalAbsorption = 1 - reflectionMagnitude ** 2;
  const diffuseAbsorption = clamp(55.3 * chamberVolume / (C_AIR * sampleArea) * (1 / loadedT60 - 1 / emptyT60), 0, 1.5);
  const tubeCutoff = 1.84 * C_AIR / (Math.PI * tubeDiameter);
  const spacingLimit = 0.8 * C_AIR / (2 * microphoneSpacing);
  const helmholtzFrequency = C_AIR / TAU * Math.sqrt(neckArea / (cavityVolume * effectiveNeck));
  const quarterWaveDepth = C_AIR / (4 * helmholtzFrequency);
  const frequencies = logspace(31.5, 4000, 180);
  const resonanceCurve = frequencies.map(sample => 1 / Math.sqrt(1 + ((sample / helmholtzFrequency - helmholtzFrequency / sample) / 0.22) ** 2));
  return {
    tubeDiameter, microphoneSpacing, reflectionMagnitude, chamberVolume, sampleArea, emptyT60, loadedT60, neckArea, cavityVolume,
    neckLength, effectiveNeck, normalAbsorption, diffuseAbsorption, tubeCutoff, spacingLimit, helmholtzFrequency, quarterWaveDepth,
    frequencies, resonanceCurve,
    measurementDifference: diffuseAbsorption - normalAbsorption,
    validity: loadedT60 < emptyT60 ? 'loaded chamber decay is shorter, so positive absorption is measurable' : 'loaded decay is not shorter; background or measurement validity must be checked'
  };
}

export function tunedAbsorberIsolationState(input = {}) {
  const primaryMass = Math.max(0.001, num(input.primaryMass, 180));
  const primaryFrequency = Math.max(0.1, num(input.primaryFrequency, 60));
  const primaryDamping = clamp(num(input.primaryDamping, 0.02), 0.0001, 0.5);
  const forcingFrequency = Math.max(0.1, num(input.forcingFrequency, 60));
  const massRatio = clamp(num(input.massRatio, 0.05), 0.001, 0.5);
  const tuningRatio = Math.max(0.2, num(input.tuningRatio, 0.98));
  const absorberDamping = clamp(num(input.absorberDamping, 0.08), 0, 0.5);
  const isolationFrequency = Math.max(0.1, num(input.isolationFrequency, 12));
  const isolationDamping = clamp(num(input.isolationDamping, 0.08), 0.001, 0.5);
  const unbalanceMass = Math.max(0, num(input.unbalanceMass, 0.2));
  const eccentricity = Math.max(0, num(input.eccentricityMm, 3) / 1000);
  const omega1 = TAU * primaryFrequency, omega = TAU * forcingFrequency;
  const m1 = primaryMass, m2 = massRatio * m1;
  const k1 = m1 * omega1 ** 2, c1 = 2 * primaryDamping * m1 * omega1;
  const omega2 = tuningRatio * omega1, k2 = m2 * omega2 ** 2, c2 = 2 * absorberDamping * m2 * omega2;
  const impedance = (mass, stiffness, damping, sampleOmega) => complex(stiffness - mass * sampleOmega ** 2, damping * sampleOmega);
  const responseAt = sampleFrequency => {
    const w = TAU * sampleFrequency;
    const z2 = impedance(m2, k2, c2, w);
    const a11 = cadd(impedance(m1, k1, c1, w), complex(k2, c2 * w));
    const a12 = complex(-k2, -c2 * w);
    const determinant = cadd(cmul(a11, z2), cscale(cmul(a12, a12), -1));
    const coupled = cdiv(z2, determinant);
    const baseline = cdiv(complex(1, 0), impedance(m1, k1, c1, w));
    return { coupled: cabs(coupled), baseline: cabs(baseline) };
  };
  const response = responseAt(forcingFrequency);
  const reductionDb = db20(response.baseline / Math.max(response.coupled, 1e-30));
  const frequencyRatio = forcingFrequency / isolationFrequency;
  const transmissibility = Math.sqrt((1 + (2 * isolationDamping * frequencyRatio) ** 2) / ((1 - frequencyRatio ** 2) ** 2 + (2 * isolationDamping * frequencyRatio) ** 2));
  const staticDeflection = 9.80665 / (TAU * isolationFrequency) ** 2;
  const unbalanceForce = unbalanceMass * eccentricity * omega ** 2;
  const absorberTravel = unbalanceForce * cabs(cdiv(complex(1, 0), impedance(m2, k2, c2, omega)));
  const frequencies = linspace(0.35 * primaryFrequency, 1.7 * primaryFrequency, 180);
  const baselineCurve = frequencies.map(sample => responseAt(sample).baseline);
  const coupledCurve = frequencies.map(sample => responseAt(sample).coupled);
  return {
    primaryMass, primaryFrequency, primaryDamping, forcingFrequency, massRatio, tuningRatio, absorberDamping, isolationFrequency,
    isolationDamping, unbalanceMass, eccentricity, m2, k2, c2, response, reductionDb, frequencyRatio, transmissibility,
    staticDeflection, unbalanceForce, absorberTravel, frequencies, baselineCurve, coupledCurve,
    regime: frequencyRatio < Math.SQRT2 ? 'mount is below the isolation crossover' : 'mount is operating in the isolation region'
  };
}

export const PROGRAM_DEFAULTS = Object.freeze({
  nonstationary: nonstationaryEnvironmentState(), mimo: mimoTestState(), treatment: acousticTreatmentState(),
  sourceIdentification: sourceIdentificationState(), hybrid: hybridMethodState(), fatigue: vibroacousticFatigueState(),
  mission: missionTimelineState(), credibility: credibilityState(), capstone: capstoneState(),
  noiseControlPath: noiseControlPathState(), psychoacoustics: psychoacousticState(), noiseMetrics: noiseMetricsState(),
  acousticMeasurement: acousticMeasurementState(), canonicalSource: canonicalSourceState(), sourceGeometry: sourceGeometryState(),
  fanDuct: fanDuctState(), outdoorPropagation: outdoorPropagationState(), barrierDiffraction: barrierDiffractionState(),
  roomField: roomFieldState(), enclosureDesign: enclosureDesignState(), absorberResonator: absorberResonatorState(),
  tunedAbsorberIsolation: tunedAbsorberIsolationState()
});
