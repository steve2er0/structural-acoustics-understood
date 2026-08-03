/* Cross-cutting launch-vehicle vibroacoustic workflow models. */

const TAU = 2 * Math.PI;
const G0 = 9.80665;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const linspace = (low, high, count) => Array.from({ length: count }, (_, index) => low + (high - low) * index / Math.max(1, count - 1));
const logspace = (low, high, count) => {
  const a = Math.log10(low), b = Math.log10(high);
  return Array.from({ length: count }, (_, index) => 10 ** (a + (b - a) * index / Math.max(1, count - 1)));
};
const trapz = (x, y) => y.slice(1).reduce((sum, value, index) => sum + 0.5 * (value + y[index]) * (x[index + 1] - x[index]), 0);
const db20 = value => 20 * Math.log10(Math.max(Math.abs(value), 1e-30));
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const norm2 = values => dot(values, values);

function solveLinear(matrix, vector) {
  const n = matrix.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    if (Math.abs(augmented[pivot][column]) < 1e-18) throw new Error('The workflow model matrix is singular.');
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let entry = column; entry <= n; entry += 1) augmented[column][entry] /= divisor;
    for (let row = 0; row < n; row += 1) if (row !== column) {
      const scale = augmented[row][column];
      for (let entry = column; entry <= n; entry += 1) augmented[row][entry] -= scale * augmented[column][entry];
    }
  }
  return augmented.map(row => row[n]);
}

function complexFrf(frequency, naturalFrequency, damping) {
  const real = naturalFrequency ** 2 - frequency ** 2;
  const imaginary = 2 * damping * naturalFrequency * frequency;
  const denominator = real * real + imaginary * imaginary;
  return { re: real / denominator, im: -imaginary / denominator };
}

function complexCorrelation(a, b) {
  let crossRe = 0, crossIm = 0, energyA = 0, energyB = 0;
  for (let index = 0; index < a.length; index += 1) {
    crossRe += a[index].re * b[index].re + a[index].im * b[index].im;
    crossIm += a[index].re * b[index].im - a[index].im * b[index].re;
    energyA += a[index].re ** 2 + a[index].im ** 2;
    energyB += b[index].re ** 2 + b[index].im ** 2;
  }
  return (crossRe ** 2 + crossIm ** 2) / Math.max(energyA * energyB, 1e-30);
}

export function modelTestCorrelationState(input = {}) {
  const modelFrequency = Math.max(1, num(input.modelFrequency, 420));
  const testFrequency = Math.max(1, num(input.testFrequency, 436));
  const modelDamping = clamp(num(input.modelDamping, 0.018), 0.0001, 0.5);
  const testDamping = clamp(num(input.testDamping, 0.026), 0.0001, 0.5);
  const shapeRotationDegrees = clamp(num(input.shapeRotationDegrees, 18), 0, 90);
  const spatialNoise = clamp(num(input.spatialNoise, 0.08), 0, 0.8);
  const modeX = clamp(Math.round(num(input.modeX, 2)), 1, 8);
  const modeY = clamp(Math.round(num(input.modeY, 1)), 1, 8);
  const modelShape = [], testShape = [], labels = [];
  const angle = shapeRotationDegrees * Math.PI / 180;
  for (let iy = 0; iy < 9; iy += 1) for (let ix = 0; ix < 13; ix += 1) {
    const x = (ix + 1) / 14, y = (iy + 1) / 10;
    const base = Math.sin(modeX * Math.PI * x) * Math.sin(modeY * Math.PI * y);
    const neighbor = Math.sin((modeX + 1) * Math.PI * x) * Math.sin(modeY * Math.PI * y);
    const noise = Math.sin((modeX + 2) * Math.PI * x + 0.31) * Math.sin((modeY + 1) * Math.PI * y + 0.47);
    modelShape.push(base);
    testShape.push(Math.cos(angle) * base + Math.sin(angle) * neighbor + spatialNoise * noise);
    labels.push(`${ix + 1},${iy + 1}`);
  }
  const mac = dot(modelShape, testShape) ** 2 / Math.max(norm2(modelShape) * norm2(testShape), 1e-30);
  const lower = 0.72 * Math.min(modelFrequency, testFrequency), upper = 1.28 * Math.max(modelFrequency, testFrequency);
  const frequencies = linspace(lower, upper, 260);
  const modelFrf = frequencies.map(frequency => complexFrf(frequency, modelFrequency, modelDamping));
  const testFrf = frequencies.map(frequency => complexFrf(frequency, testFrequency, testDamping));
  const frac = complexCorrelation(modelFrf, testFrf);
  const frequencyError = 100 * (modelFrequency - testFrequency) / testFrequency;
  const dampingError = 100 * (modelDamping - testDamping) / testDamping;
  const frequencyPass = Math.abs(frequencyError) <= num(input.frequencyTolerance, 5);
  const macPass = mac >= num(input.macThreshold, 0.9);
  const fracPass = frac >= num(input.fracThreshold, 0.8);
  const confidence = [frequencyPass, macPass, fracPass].filter(Boolean).length;
  return {
    modelFrequency, testFrequency, modelDamping, testDamping, shapeRotationDegrees, spatialNoise, modeX, modeY,
    mac, frac, frequencyError, dampingError, frequencyPass, macPass, fracPass,
    disposition: confidence === 3 ? 'correlated for the selected checks' : confidence === 2 ? 'conditionally correlated; investigate the failed check' : 'not correlated for design use',
    frequencies,
    modelMagnitude: modelFrf.map(value => Math.hypot(value.re, value.im)),
    testMagnitude: testFrf.map(value => Math.hypot(value.re, value.im)),
    modelShape, testShape, labels
  };
}

function solveSeaGraph({ frequency, modalDensities, internalLosses, edges, powers }) {
  const omega = TAU * frequency, count = modalDensities.length;
  const directional = edges.map(edge => ({
    ...edge,
    reverse: edge.forward * modalDensities[edge.i] / modalDensities[edge.j]
  }));
  const matrix = Array.from({ length: count }, (_, row) => Array.from({ length: count }, (_, column) => row === column ? omega * internalLosses[row] : 0));
  directional.forEach(edge => {
    matrix[edge.i][edge.i] += omega * edge.forward;
    matrix[edge.i][edge.j] -= omega * edge.reverse;
    matrix[edge.j][edge.j] += omega * edge.reverse;
    matrix[edge.j][edge.i] -= omega * edge.forward;
  });
  const energies = solveLinear(matrix, powers);
  const flows = directional.map(edge => {
    const grossForward = omega * edge.forward * energies[edge.i];
    const grossReverse = omega * edge.reverse * energies[edge.j];
    return { ...edge, grossForward, grossReverse, net: grossForward - grossReverse };
  });
  const dissipations = energies.map((energy, index) => omega * internalLosses[index] * energy);
  return { energies, flows, dissipations, balanceError: (powers.reduce((a, b) => a + b, 0) - dissipations.reduce((a, b) => a + b, 0)) / Math.max(powers.reduce((a, b) => a + b, 0), 1e-30) };
}

export function branchingSeaState(input = {}) {
  const frequency = Math.max(20, num(input.frequency, 1000));
  const sourcePower = Math.max(0, num(input.sourcePower, 1));
  const secondaryPower = Math.max(0, num(input.secondaryPower, 0.12));
  const primaryClf = Math.max(0, num(input.primaryClf, 0.018));
  const branchClf = Math.max(0, num(input.branchClf, 0.008));
  const flankingClf = Math.max(0, num(input.flankingClf, 0.003));
  const internalLoss = Math.max(0.0001, num(input.internalLoss, 0.025));
  const names = ['Source structure', 'Primary panel', 'Acoustic cavity', 'Payload', 'Flanking structure'];
  const modalDensities = [0.055, 0.042, 0.12, 0.065, 0.035];
  const internalLosses = [internalLoss, internalLoss * 1.1, internalLoss * 0.85, internalLoss * 1.2, internalLoss * 1.05];
  const edges = [
    { i: 0, j: 1, forward: primaryClf, label: 'primary injection' },
    { i: 1, j: 2, forward: branchClf, label: 'panel to cavity' },
    { i: 2, j: 3, forward: branchClf * 0.85, label: 'cavity to payload' },
    { i: 0, j: 4, forward: flankingClf, label: 'flanking launch' },
    { i: 4, j: 3, forward: flankingClf * 1.2, label: 'flanking arrival' },
    { i: 1, j: 3, forward: flankingClf * 0.35, label: 'direct attachment' }
  ];
  const powers = [sourcePower, 0, 0, secondaryPower, 0];
  const solution = solveSeaGraph({ frequency, modalDensities, internalLosses, edges, powers });
  const primaryFlow = solution.flows.filter(flow => (flow.i === 2 && flow.j === 3) || (flow.i === 1 && flow.j === 3)).reduce((sum, flow) => sum + Math.max(0, flow.net), 0);
  const flankingFlow = solution.flows.filter(flow => flow.i === 4 && flow.j === 3).reduce((sum, flow) => sum + Math.max(0, flow.net), 0);
  const pathTotal = Math.max(primaryFlow + flankingFlow, 1e-30);
  const frequencies = logspace(125, 4000, 28);
  const receiverSweep = frequencies.map(band => solveSeaGraph({ frequency: band, modalDensities, internalLosses, edges, powers }).energies[3]);
  const sourceSweep = frequencies.map(band => solveSeaGraph({ frequency: band, modalDensities, internalLosses, edges, powers }).energies[0]);
  return {
    frequency, sourcePower, secondaryPower, primaryClf, branchClf, flankingClf, internalLoss,
    names, modalDensities, internalLosses, edges: solution.flows, energies: solution.energies,
    dissipations: solution.dissipations, balanceError: solution.balanceError,
    receiverEnergy: solution.energies[3], sourceEnergy: solution.energies[0],
    primaryShare: primaryFlow / pathTotal, flankingShare: flankingFlow / pathTotal,
    dominantPath: flankingFlow > primaryFlow ? 'flanking structure' : 'panel-cavity path',
    frequencies, receiverSweep, sourceSweep,
    transferDb: 10 * Math.log10(Math.max(solution.energies[3] / solution.energies[0], 1e-30))
  };
}

export function transferPathState(input = {}) {
  const coherence = clamp(num(input.coherence, 1), 0, 1);
  const defaults = [
    { name: 'Forward skirt', blockedForce: 85, sourceMobility: 2.2e-5, receiverMobility: 4.5e-5, transferMobility: 2.8e-4, phase: 15 },
    { name: 'Avionics shelf', blockedForce: 62, sourceMobility: 3.2e-5, receiverMobility: 3.8e-5, transferMobility: 3.5e-4, phase: 138 },
    { name: 'Fluid line', blockedForce: 44, sourceMobility: 1.7e-5, receiverMobility: 5.2e-5, transferMobility: 2.1e-4, phase: -72 }
  ];
  const paths = defaults.map((path, index) => {
    const suffix = index + 1;
    const blockedForce = Math.max(0, num(input[`blockedForce${suffix}`], path.blockedForce));
    const sourceMobility = Math.max(1e-12, num(input[`sourceMobility${suffix}`], path.sourceMobility));
    const receiverMobility = Math.max(1e-12, num(input[`receiverMobility${suffix}`], path.receiverMobility));
    const transferMobility = Math.max(0, num(input[`transferMobility${suffix}`], path.transferMobility));
    const phase = num(input[`phase${suffix}`], path.phase);
    const installedForce = blockedForce * sourceMobility / (sourceMobility + receiverMobility);
    const magnitude = installedForce * transferMobility;
    const radians = phase * Math.PI / 180;
    return { ...path, blockedForce, sourceMobility, receiverMobility, transferMobility, phase, installedForce, magnitude, re: magnitude * Math.cos(radians), im: magnitude * Math.sin(radians) };
  });
  const coherent = paths.reduce((sum, path) => ({ re: sum.re + path.re, im: sum.im + path.im }), { re: 0, im: 0 });
  const coherentMagnitude = Math.hypot(coherent.re, coherent.im);
  const incoherentMagnitude = Math.sqrt(paths.reduce((sum, path) => sum + path.magnitude ** 2, 0));
  const totalResponse = Math.sqrt(coherence * coherentMagnitude ** 2 + (1 - coherence) * incoherentMagnitude ** 2);
  const scalarSum = paths.reduce((sum, path) => sum + path.magnitude, 0);
  const rankedPaths = [...paths].sort((a, b) => b.magnitude - a.magnitude);
  return {
    coherence, paths, rankedPaths, totalResponse, coherentMagnitude, incoherentMagnitude,
    cancellationDb: db20(coherentMagnitude / Math.max(scalarSum, 1e-30)),
    dominantPath: rankedPaths[0].name,
    installedToBlocked: paths.map(path => path.installedForce / Math.max(path.blockedForce, 1e-30))
  };
}

export function requirementsFlowdownState(input = {}) {
  const flightPsd = Math.max(0, num(input.flightPsd, 0.04));
  const flightDuration = Math.max(0.001, num(input.flightDuration, 120));
  const testDuration = Math.max(0.001, num(input.testDuration, 60));
  const fatigueExponent = Math.max(0.1, num(input.fatigueExponent, 6));
  const statisticalMarginDb = num(input.statisticalMarginDb, 3);
  const qualificationMarginDb = num(input.qualificationMarginDb, 3);
  const predictedResponse = Math.max(0, num(input.predictedResponse, 18));
  const responseLimit = Math.max(0.001, num(input.responseLimit, 22));
  const statisticalFactor = 10 ** (statisticalMarginDb / 10);
  const qualificationFactor = 10 ** (qualificationMarginDb / 10);
  const durationFactor = (flightDuration / testDuration) ** (2 / fatigueExponent);
  const designPsd = flightPsd * statisticalFactor;
  const unnotchedTestPsd = designPsd * qualificationFactor * durationFactor;
  const unnotchedResponse = predictedResponse * Math.sqrt(unnotchedTestPsd / Math.max(flightPsd, 1e-30));
  const notchFactor = Math.min(1, (responseLimit / Math.max(unnotchedResponse, 1e-30)) ** 2);
  const notchedTestPsd = unnotchedTestPsd * notchFactor;
  const retainedMarginDb = 10 * Math.log10(Math.max(notchedTestPsd / Math.max(flightPsd, 1e-30), 1e-30));
  const levels = [flightPsd, designPsd, unnotchedTestPsd, notchedTestPsd];
  return {
    flightPsd, flightDuration, testDuration, fatigueExponent, statisticalMarginDb, qualificationMarginDb,
    predictedResponse, responseLimit, statisticalFactor, qualificationFactor, durationFactor,
    designPsd, unnotchedTestPsd, unnotchedResponse, notchFactor, notchedTestPsd, retainedMarginDb,
    notchRequired: notchFactor < 0.999,
    levels,
    labels: ['Flight estimate', 'Statistical design', 'Unnotched qualification', 'Response-limited test']
  };
}

export function mitigationTradeState(input = {}) {
  const frequency = Math.max(1, num(input.frequency, 420));
  const baselineResponse = Math.max(1e-12, num(input.baselineResponse, 24));
  const requiredReductionDb = Math.max(0, num(input.requiredReductionDb, 8));
  const baseLossFactor = Math.max(0.0001, num(input.baseLossFactor, 0.02));
  const addedLossFactor = Math.max(0, num(input.addedLossFactor, 0.06));
  const dampingMassFraction = Math.max(0, num(input.dampingMassFraction, 0.06));
  const tmdMassRatio = Math.max(0, num(input.tmdMassRatio, 0.04));
  const isolationFrequency = Math.max(0.1, num(input.isolationFrequency, 120));
  const isolationDamping = clamp(num(input.isolationDamping, 0.08), 0.001, 1);
  const absorptionRatio = Math.max(0, num(input.absorptionRatio, 2));
  const barrierMassRatio = Math.max(1, num(input.barrierMassRatio, 1.5));
  const dampingReduction = Math.max(0, 20 * Math.log10((baseLossFactor + addedLossFactor) / baseLossFactor));
  const tmdReduction = Math.max(0, 20 * Math.log10(1 + tmdMassRatio / Math.max(baseLossFactor, 0.002)));
  const ratio = frequency / isolationFrequency;
  const transmissibility = Math.sqrt((1 + (2 * isolationDamping * ratio) ** 2) / ((1 - ratio ** 2) ** 2 + (2 * isolationDamping * ratio) ** 2));
  const isolationReduction = Math.max(0, -20 * Math.log10(transmissibility));
  const absorberReduction = 10 * Math.log10(1 + absorptionRatio);
  const barrierReduction = 20 * Math.log10(barrierMassRatio);
  const options = [
    { name: 'Constrained-layer damping', reductionDb: dampingReduction, massFraction: dampingMassFraction, mechanism: 'raises resonant loss factor', caveat: 'temperature, strain, and bondline dependent' },
    { name: 'Tuned mass damper', reductionDb: tmdReduction, massFraction: tmdMassRatio, mechanism: 'splits and limits a narrow resonance', caveat: 'sensitive to mistuning and attachment stiffness' },
    { name: 'Isolation', reductionDb: isolationReduction, massFraction: 0.025, mechanism: 'creates frequency separation above the isolation crossover', caveat: 'adds travel and amplifies near mount resonance' },
    { name: 'Acoustic absorption', reductionDb: absorberReduction, massFraction: 0.02 * absorptionRatio, mechanism: 'increases cavity absorption area', caveat: 'weak below absorber thickness and cavity-modal limits' },
    { name: 'Mass barrier', reductionDb: barrierReduction, massFraction: barrierMassRatio - 1, mechanism: 'raises mass-law impedance', caveat: 'inefficient against leaks, coincidence, and flanking' }
  ].map(option => ({
    ...option,
    predictedResponse: baselineResponse * 10 ** (-option.reductionDb / 20),
    targetMet: option.reductionDb >= requiredReductionDb,
    score: option.reductionDb / Math.max(option.massFraction + 0.02, 0.02)
  }));
  const ranked = [...options].sort((a, b) => b.score - a.score);
  return { frequency, baselineResponse, requiredReductionDb, options, ranked, recommended: ranked[0], targetCount: options.filter(option => option.targetMet).length };
}

export function nonlinearJointState(input = {}) {
  const mass = Math.max(0.001, num(input.mass, 18));
  const linearFrequency = Math.max(0.1, num(input.linearFrequency, 180));
  const amplitudeMm = Math.max(0.001, num(input.amplitudeMm, 0.7));
  const cubicRatio = num(input.cubicRatio, 0.45);
  const frictionForce = Math.max(0, num(input.frictionForce, 16));
  const gapMm = Math.max(0.001, num(input.gapMm, 1.2));
  const preload = Math.max(0.001, num(input.preload, 2200));
  const frictionCoefficient = Math.max(0, num(input.frictionCoefficient, 0.25));
  const amplitude = amplitudeMm / 1000, referenceAmplitude = 0.001;
  const linearStiffness = mass * (TAU * linearFrequency) ** 2;
  const stiffnessScale = Math.max(0.05, 1 + 0.75 * cubicRatio * (amplitude / referenceAmplitude) ** 2);
  const effectiveStiffness = linearStiffness * stiffnessScale;
  const effectiveFrequency = Math.sqrt(effectiveStiffness / mass) / TAU;
  const frictionLossFactor = 4 * frictionForce / Math.max(Math.PI * effectiveStiffness * amplitude, 1e-30);
  const equivalentDamping = 0.5 * frictionLossFactor;
  const dynamicForce = effectiveStiffness * amplitude;
  const slipThreshold = frictionCoefficient * preload;
  const slipActive = dynamicForce > slipThreshold;
  const contactActive = amplitudeMm >= gapMm;
  const amplitudesMm = linspace(0.05, Math.max(2.2 * gapMm, 2.5), 100);
  const backbone = amplitudesMm.map(value => linearFrequency * Math.sqrt(Math.max(0.05, 1 + 0.75 * cubicRatio * value ** 2)));
  const dampingCurve = amplitudesMm.map(value => 0.5 * 4 * frictionForce / Math.max(Math.PI * linearStiffness * (value / 1000), 1e-30));
  return {
    mass, linearFrequency, amplitudeMm, cubicRatio, frictionForce, gapMm, preload, frictionCoefficient,
    linearStiffness, effectiveStiffness, effectiveFrequency, frequencyShift: 100 * (effectiveFrequency / linearFrequency - 1),
    frictionLossFactor, equivalentDamping, dynamicForce, slipThreshold, slipActive, contactActive,
    regime: contactActive ? 'hard-stop/contact regime' : slipActive ? 'joint microslip or gross-slip regime' : Math.abs(cubicRatio) > 0.05 ? 'amplitude-dependent stiffness regime' : 'approximately linear regime',
    amplitudesMm, backbone, dampingCurve
  };
}

export function fairingCavityState(input = {}) {
  const length = Math.max(0.1, num(input.length, 8));
  const radius = Math.max(0.05, num(input.radius, 2.2));
  const soundSpeed = Math.max(1, num(input.soundSpeed, 343));
  const frequency = Math.max(1, num(input.frequency, 315));
  const t60 = Math.max(0.02, num(input.t60, 2.4));
  const sourceX = clamp(num(input.sourceX, 0.18), 0, 1);
  const receiverX = clamp(num(input.receiverX, 0.72), 0, 1);
  const panelFrequency = Math.max(1, num(input.panelFrequency, 330));
  const width = 2 * radius, height = 1.8 * radius, volume = length * width * height;
  const surfaceArea = 2 * (length * width + length * height + width * height);
  const modes = [];
  for (let nx = 0; nx <= 8; nx += 1) for (let ny = 0; ny <= 5; ny += 1) for (let nz = 0; nz <= 5; nz += 1) {
    if (nx + ny + nz === 0) continue;
    const modeFrequency = soundSpeed / 2 * Math.sqrt((nx / length) ** 2 + (ny / width) ** 2 + (nz / height) ** 2);
    if (modeFrequency > 2.2 * frequency + 400) continue;
    const sourceShape = Math.cos(nx * Math.PI * sourceX) * Math.cos(ny * Math.PI * 0.37) * Math.cos(nz * Math.PI * 0.43);
    const receiverShape = Math.cos(nx * Math.PI * receiverX) * Math.cos(ny * Math.PI * 0.61) * Math.cos(nz * Math.PI * 0.52);
    modes.push({ id: `(${nx},${ny},${nz})`, nx, ny, nz, frequency: modeFrequency, sourceShape, receiverShape, participation: sourceShape * receiverShape });
  }
  modes.sort((a, b) => a.frequency - b.frequency);
  const nearest = [...modes].sort((a, b) => Math.abs(a.frequency - frequency) - Math.abs(b.frequency - frequency))[0];
  const acousticLossFactor = 2.2 / (frequency * t60);
  const modalDensity = 4 * Math.PI * volume * frequency ** 2 / soundSpeed ** 3 + Math.PI * surfaceArea * frequency / (2 * soundSpeed ** 2);
  const thirdOctaveBandwidth = frequency * (2 ** (1 / 6) - 2 ** (-1 / 6));
  const modesPerBand = modalDensity * thirdOctaveBandwidth;
  const modalOverlap = TAU * frequency * modalDensity * acousticLossFactor;
  const absorptionArea = 0.161 * volume / t60;
  const schroederFrequency = 2000 * Math.sqrt(t60 / volume);
  const frequencies = linspace(Math.max(20, 0.35 * frequency), 1.75 * frequency, 260);
  const response = frequencies.map(sample => {
    const sum = modes.reduce((value, mode) => {
      const ratio = sample / Math.max(mode.frequency, 1e-9);
      const denominator = Math.sqrt((1 - ratio ** 2) ** 2 + (acousticLossFactor * ratio) ** 2);
      return value + mode.participation / Math.max(denominator, 1e-6);
    }, 0);
    return Math.abs(sum);
  });
  const panelDetuning = 100 * (panelFrequency - nearest.frequency) / nearest.frequency;
  return {
    length, radius, soundSpeed, frequency, t60, sourceX, receiverX, panelFrequency, width, height, volume,
    modes, nearest, acousticLossFactor, modalDensity, modesPerBand, modalOverlap, absorptionArea, schroederFrequency,
    panelDetuning, frequencies, response,
    regime: frequency < schroederFrequency || modesPerBand < 5 ? 'modal / spatially nonuniform cavity' : 'statistical / approximately diffuse cavity'
  };
}

function randomGenerator(seedValue) {
  let seed = (Math.round(seedValue) >>> 0) || 123456789;
  const uniform = () => ((seed = (1664525 * seed + 1013904223) >>> 0) + 0.5) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(Math.max(uniform(), 1e-12))) * Math.cos(TAU * uniform());
}

function lognormalSample(mean, cov, normal) {
  if (!(cov > 0)) return mean;
  const sigma = Math.sqrt(Math.log(1 + cov ** 2));
  return Math.exp(Math.log(mean) - 0.5 * sigma ** 2 + sigma * normal());
}

const quantile = (sorted, probability) => {
  const position = clamp(probability, 0, 1) * (sorted.length - 1), lower = Math.floor(position), upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};

export function uncertaintySensitivityState(input = {}) {
  const frequencyMean = Math.max(1, num(input.frequencyMean, 180));
  const qMean = Math.max(0.1, num(input.qMean, 12));
  const psdMean = Math.max(1e-12, num(input.psdMean, 0.03));
  const frequencyCov = Math.max(0, num(input.frequencyCov, 0.04));
  const qCov = Math.max(0, num(input.qCov, 0.25));
  const psdCov = Math.max(0, num(input.psdCov, 0.2));
  const trials = clamp(Math.round(num(input.trials, 1600)), 50, 10000);
  const seed = Math.round(num(input.seed, 519));
  const normal = randomGenerator(seed), samples = [];
  for (let index = 0; index < trials; index += 1) {
    const naturalFrequency = lognormalSample(frequencyMean, frequencyCov, normal);
    const q = lognormalSample(qMean, qCov, normal);
    const psd = lognormalSample(psdMean, psdCov, normal);
    samples.push(Math.sqrt(Math.PI / 2 * naturalFrequency * q * psd));
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const standardDeviation = Math.sqrt(samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, samples.length - 1));
  const rawContributions = [frequencyCov, qCov, psdCov].map(cov => (0.5 * cov) ** 2);
  const contributionTotal = rawContributions.reduce((a, b) => a + b, 0);
  const sensitivities = ['Natural frequency', 'Q / damping', 'Input PSD'].map((name, index) => ({ name, share: contributionTotal > 0 ? rawContributions[index] / contributionTotal : 0, elasticity: 0.5 }));
  const bins = 24, minimum = samples[0], maximum = samples.at(-1), width = Math.max((maximum - minimum) / bins, 1e-12);
  const counts = Array(bins).fill(0);
  samples.forEach(value => { counts[Math.min(bins - 1, Math.floor((value - minimum) / width))] += 1; });
  const histogram = counts.map((count, index) => ({ low: minimum + index * width, high: minimum + (index + 1) * width, count, probability: count / samples.length }));
  return {
    frequencyMean, qMean, psdMean, frequencyCov, qCov, psdCov, trials, seed, samples, mean, standardDeviation,
    coefficientOfVariation: standardDeviation / Math.max(mean, 1e-30),
    p05: quantile(samples, 0.05), p50: quantile(samples, 0.5), p95: quantile(samples, 0.95), p99: quantile(samples, 0.99),
    sensitivities: sensitivities.sort((a, b) => b.share - a.share), histogram
  };
}

export function milesValidityState(input = {}) {
  const naturalFrequency = Math.max(1, num(input.naturalFrequency, 100));
  const q = Math.max(0.2, num(input.q, 10));
  const psdAtResonance = Math.max(0, num(input.psdAtResonance, 0.04));
  const slopeDbPerOctave = num(input.slopeDbPerOctave, 0);
  const exponent = slopeDbPerOctave / (10 * Math.log10(2));
  const damping = 1 / (2 * q);
  const frequencies = logspace(0.1 * naturalFrequency, 10 * naturalFrequency, 800);
  const inputPsd = frequencies.map(frequency => psdAtResonance * (frequency / naturalFrequency) ** exponent);
  const responsePsd = frequencies.map((frequency, index) => {
    const ratio = frequency / naturalFrequency;
    const transmissibilitySquared = (1 + (2 * damping * ratio) ** 2) / ((1 - ratio ** 2) ** 2 + (2 * damping * ratio) ** 2);
    return inputPsd[index] * transmissibilitySquared;
  });
  const numericalRms = Math.sqrt(Math.max(0, trapz(frequencies, responsePsd)));
  const milesRms = Math.sqrt(Math.PI / 2 * naturalFrequency * q * psdAtResonance);
  const error = 100 * (milesRms / Math.max(numericalRms, 1e-30) - 1);
  const bandwidth = naturalFrequency / q;
  return {
    naturalFrequency, q, psdAtResonance, slopeDbPerOctave, exponent, damping, bandwidth,
    milesRms, numericalRms, error, frequencies, inputPsd, responsePsd,
    regime: Math.abs(error) < 5 ? 'Miles approximation agrees with numerical integration' : Math.abs(error) < 15 ? 'Miles approximation is a screening estimate' : 'PSD slope or bandwidth invalidates the locally flat approximation'
  };
}

export function extremeResponseState(input = {}) {
  const rms = Math.max(1e-12, num(input.rms, 8));
  const duration = Math.max(0.001, num(input.duration, 60));
  const bandwidth = Math.max(0.001, num(input.bandwidth, 12));
  const exceedanceProbability = clamp(num(input.exceedanceProbability, 0.01), 1e-8, 0.5);
  const opportunities = Math.max(1, 2 * bandwidth * duration);
  const crestFactor = Math.sqrt(Math.max(1, 2 * Math.log(opportunities / exceedanceProbability)));
  const extreme = rms * crestFactor;
  const amplitudes = linspace(1.5 * rms, 1.25 * extreme, 180);
  const exceedance = amplitudes.map(amplitude => 1 - Math.exp(-opportunities * Math.exp(-0.5 * (amplitude / rms) ** 2)));
  const durations = logspace(Math.max(0.2, duration / 30), duration * 30, 120);
  const durationExtremes = durations.map(value => rms * Math.sqrt(Math.max(1, 2 * Math.log(Math.max(1, 2 * bandwidth * value) / exceedanceProbability))));
  return { rms, duration, bandwidth, exceedanceProbability, opportunities, crestFactor, extreme, amplitudes, exceedance, durations, durationExtremes };
}

export const WORKFLOW_DEFAULTS = Object.freeze({
  modelTestCorrelation: modelTestCorrelationState(), branchingSea: branchingSeaState(), transferPath: transferPathState(),
  requirementsFlowdown: requirementsFlowdownState(), mitigationTrade: mitigationTradeState(), nonlinearJoint: nonlinearJointState(),
  fairingCavity: fairingCavityState(), uncertaintySensitivity: uncertaintySensitivityState(), milesValidity: milesValidityState(),
  extremeResponse: extremeResponseState()
});

export { G0 };
