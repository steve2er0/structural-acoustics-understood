import {
  TWO_STAGE_G0,
  analyzeTwoStageIsolation,
  complexMagnitude,
  complexPhaseDeg,
  equivalentSeriesStiffness,
  singleStageResponseAtFrequency,
  stageDampingCoefficients,
  twoStageResponseAtFrequency
} from './two-stage-isolation-physics.js';
import {
  COMPOUND_BODY_DOF_NAMES,
  analyzeCompoundIsolation,
  compoundResponseAtFrequency,
  parametricMountPositions,
  parseMountCoordinates
} from './compound-isolation-physics.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fmt = (value, digits = 3) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (number === 0) return '0';
  if (Math.abs(number) >= 10000 || Math.abs(number) < .001) return number.toExponential(2);
  return number.toFixed(digits).replace(/\.?0+$/, '');
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const db = magnitude => 20 * Math.log10(Math.max(Number(magnitude), 1e-300));
const finiteValues = values => values.filter(Number.isFinite);

export const TWO_STAGE_ISOLATION_PRESETS = Object.freeze({
  'rigid-balanced': {
    model_fidelity: 'rigid-12dof', base_axis: 'z',
    m1: 5, m2: 20,
    intermediate_cg_x: 0, intermediate_cg_y: 0, intermediate_cg_z: 0,
    payload_cg_x: 0, payload_cg_y: 0, payload_cg_z: 0,
    stage1_category: 'soft', stage1_count: 4, stage1_stiffness_basis: 'total', stage1_stiffness: 4e5, stage1_damping_mode: 'ratio', stage1_zeta: .008, stage1_c: 0,
    stage2_category: 'stiff', stage2_count: 4, stage2_stiffness_basis: 'total', stage2_stiffness: 1e7, stage2_damping_mode: 'ratio', stage2_zeta: .008, stage2_c: 0,
    stage1_geometry: 'parametric', stage2_geometry: 'parametric',
    forcing_1: 600, forcing_2: 1200, forcing_3: 1400, animation_frequency: 600
  },
  'rigid-offset': {
    model_fidelity: 'rigid-12dof', base_axis: 'z',
    m1: 5, m2: 20,
    intermediate_cg_x: .045, intermediate_cg_y: -.025, intermediate_cg_z: 0,
    payload_cg_x: -.035, payload_cg_y: .02, payload_cg_z: 0,
    stage1_category: 'soft', stage1_count: 4, stage1_stiffness_basis: 'total', stage1_stiffness: 4e5, stage1_damping_mode: 'ratio', stage1_zeta: .012, stage1_c: 0,
    stage2_category: 'stiff', stage2_count: 4, stage2_stiffness_basis: 'total', stage2_stiffness: 1e7, stage2_damping_mode: 'ratio', stage2_zeta: .012, stage2_c: 0,
    stage1_geometry: 'parametric', stage2_geometry: 'parametric',
    forcing_1: 600, forcing_2: 1200, forcing_3: 1400, animation_frequency: 600
  },
  'soft-stiff': {
    model_fidelity: 'vertical-2dof', base_axis: 'z',
    m1: 5, m2: 20,
    stage1_category: 'soft', stage1_count: 4, stage1_stiffness_basis: 'total', stage1_stiffness: 4e5, stage1_damping_mode: 'ratio', stage1_zeta: .008, stage1_c: 0,
    stage2_category: 'stiff', stage2_count: 4, stage2_stiffness_basis: 'total', stage2_stiffness: 1e7, stage2_damping_mode: 'ratio', stage2_zeta: .008, stage2_c: 0,
    forcing_1: 600, forcing_2: 1200, forcing_3: 1400, animation_frequency: 600
  },
  'massless-intermediate': {
    model_fidelity: 'vertical-2dof', base_axis: 'z',
    m1: .02, m2: 20,
    stage1_category: 'soft', stage1_count: 4, stage1_stiffness_basis: 'total', stage1_stiffness: 4e5, stage1_damping_mode: 'ratio', stage1_zeta: .02, stage1_c: 0,
    stage2_category: 'stiff', stage2_count: 4, stage2_stiffness_basis: 'total', stage2_stiffness: 1e7, stage2_damping_mode: 'ratio', stage2_zeta: .02, stage2_c: 0,
    forcing_1: 600, forcing_2: 1200, forcing_3: 1400, animation_frequency: 600
  },
  'poor-design': {
    model_fidelity: 'vertical-2dof', base_axis: 'z',
    m1: 5, m2: 20,
    stage1_category: 'soft', stage1_count: 4, stage1_stiffness_basis: 'total', stage1_stiffness: 4e5, stage1_damping_mode: 'ratio', stage1_zeta: .02, stage1_c: 0,
    stage2_category: 'stiff', stage2_count: 4, stage2_stiffness_basis: 'total', stage2_stiffness: 5.7e7, stage2_damping_mode: 'ratio', stage2_zeta: .02, stage2_c: 0,
    forcing_1: 600, forcing_2: 1200, forcing_3: 1400, animation_frequency: 600
  },
  'high-damping': {
    model_fidelity: 'vertical-2dof', base_axis: 'z',
    m1: 5, m2: 20,
    stage1_category: 'soft', stage1_count: 4, stage1_stiffness_basis: 'total', stage1_stiffness: 4e5, stage1_damping_mode: 'ratio', stage1_zeta: .2, stage1_c: 0,
    stage2_category: 'stiff', stage2_count: 4, stage2_stiffness_basis: 'total', stage2_stiffness: 1e7, stage2_damping_mode: 'ratio', stage2_zeta: .2, stage2_c: 0,
    forcing_1: 600, forcing_2: 1200, forcing_3: 1400, animation_frequency: 600
  }
});

function normalizedInputs(values) {
  const m1 = Number(values.m1);
  const m2 = Number(values.m2);
  const stage1Count = Math.max(1, Math.round(Number(values.stage1_count)));
  const stage2Count = Math.max(1, Math.round(Number(values.stage2_count)));
  const enteredK1 = Number(values.stage1_stiffness);
  const enteredK2 = Number(values.stage2_stiffness);
  const k1 = values.stage1_stiffness_basis === 'per-isolator' ? enteredK1 * stage1Count : enteredK1;
  const k2 = values.stage2_stiffness_basis === 'per-isolator' ? enteredK2 * stage2Count : enteredK2;
  const damping = stageDampingCoefficients({
    m1, m2, k1, k2,
    stage1Mode: values.stage1_damping_mode,
    stage2Mode: values.stage2_damping_mode,
    zeta1: Number(values.stage1_zeta),
    zeta2: Number(values.stage2_zeta),
    c1: Number(values.stage1_c),
    c2: Number(values.stage2_c)
  });
  const forcingFrequencies = [...new Set([values.forcing_1, values.forcing_2, values.forcing_3].map(Number).filter(frequency => frequency > 0 && Number.isFinite(frequency)))].sort((a, b) => a - b);
  if (!forcingFrequencies.length) throw new Error('Enter at least one forcing frequency greater than zero.');
  const baseAmplitudeM = Number(values.base_amplitude);
  if (!(baseAmplitudeM > 0) || !Number.isFinite(baseAmplitudeM)) throw new Error('Base displacement amplitude must be greater than zero.');
  return {
    m1, m2, k1, k2, ...damping,
    modelFidelity: values.model_fidelity === 'vertical-2dof' ? 'vertical-2dof' : 'rigid-12dof',
    baseAxis: ['x', 'y'].includes(values.base_axis) ? values.base_axis : 'z',
    stage1Count, stage2Count,
    minimumFrequencyHz: Number(values.minimum_frequency),
    maximumFrequencyHz: Number(values.maximum_frequency),
    pointsPerDecade: Number(values.points_per_decade),
    forcingFrequencies,
    baseAmplitudeM,
    animationFrequencyHz: Number(values.animation_frequency),
    magnitudeView: values.magnitude_view === 'linear' ? 'linear' : 'db',
    showAsymptotes: values.show_asymptotes !== 'no',
    comparisonType: ['none', 'user'].includes(values.comparison_type) ? values.comparison_type : 'equivalent',
    singleStiffness: Number(values.single_stiffness),
    singleDampingRatio: Number(values.single_zeta),
    stage1Category: values.stage1_category,
    stage2Category: values.stage2_category
  };
}

function rigidBodyDefinition(values, prefix, massKg, label) {
  return {
    label,
    massKg,
    dimensionsM: ['length', 'width', 'height'].map(key => Number(values[`${prefix}_${key}`])),
    inertiaMode: values[`${prefix}_inertia_mode`] === 'manual' ? 'manual' : 'auto',
    inertiaKgM2: ['ixx', 'iyy', 'izz', 'ixy', 'ixz', 'iyz'].map(key => Number(values[`${prefix}_${key}`]))
  };
}

function mountPositionsFromValues(values, prefix, count, cgOffset, side = '') {
  const geometry = values[`${prefix}_geometry`] === 'custom' ? 'custom' : 'parametric';
  const sideKey = side ? `_${side}` : '';
  if (geometry === 'custom') return parseMountCoordinates(values[`${prefix}${sideKey}_custom_points`], count, `${prefix === 'stage1' ? 'Stage 1 intermediate' : `Stage 2 ${side.replace('-', ' ')}`} coordinates`);
  return parametricMountPositions(
    count,
    Number(values[`${prefix}${sideKey}_spacing_x`]),
    Number(values[`${prefix}${sideKey}_spacing_y`]),
    Number(values[`${prefix}${sideKey}_plane_z`]),
    cgOffset
  );
}

function compoundModelInput(rawValues, values) {
  if (![3, 4].includes(values.stage1Count) || ![3, 4].includes(values.stage2Count)) throw new Error('Rigid-body mode requires exactly 3 or 4 mounts in each stage.');
  const body1Cg = [rawValues.intermediate_cg_x, rawValues.intermediate_cg_y, rawValues.intermediate_cg_z].map(Number);
  const body2Cg = [rawValues.payload_cg_x, rawValues.payload_cg_y, rawValues.payload_cg_z].map(Number);
  const stage1Positions = mountPositionsFromValues(rawValues, 'stage1', values.stage1Count, body1Cg);
  const stage2Body1Positions = mountPositionsFromValues(rawValues, 'stage2', values.stage2Count, body1Cg, 'intermediate');
  const stage2Body2Positions = mountPositionsFromValues(rawValues, 'stage2', values.stage2Count, body2Cg, 'payload');
  const axisStiffness = (total, count, xRatio, yRatio) => [total * Number(xRatio) / count, total * Number(yRatio) / count, total / count];
  const axisDamping = (total, count, xRatio, yRatio) => [total * Number(xRatio) / count, total * Number(yRatio) / count, total / count];
  const stage1Stiffness = axisStiffness(values.k1, values.stage1Count, rawValues.stage1_kx_ratio, rawValues.stage1_ky_ratio);
  const stage2Stiffness = axisStiffness(values.k2, values.stage2Count, rawValues.stage2_kx_ratio, rawValues.stage2_ky_ratio);
  const stage1Damping = axisDamping(values.c1, values.stage1Count, rawValues.stage1_cx_ratio, rawValues.stage1_cy_ratio);
  const stage2Damping = axisDamping(values.c2, values.stage2Count, rawValues.stage2_cx_ratio, rawValues.stage2_cy_ratio);
  return {
    body1: rigidBodyDefinition(rawValues, 'intermediate', values.m1, 'Intermediate body'),
    body2: rigidBodyDefinition(rawValues, 'payload', values.m2, 'Payload body'),
    stage1Mounts: stage1Positions.map(body1Position => ({ body1Position, stiffness: [...stage1Stiffness], damping: [...stage1Damping] })),
    stage2Mounts: stage2Body1Positions.map((body1Position, index) => ({ body1Position, body2Position: stage2Body2Positions[index], stiffness: [...stage2Stiffness], damping: [...stage2Damping] })),
    baseAxis: values.baseAxis,
    gravityAxis: 'z',
    minimumFrequencyHz: values.minimumFrequencyHz,
    maximumFrequencyHz: values.maximumFrequencyHz,
    pointsPerDecade: values.pointsPerDecade
  };
}

function idealSlopeTrace(frequencies, payloadMagnitudes, anchorHz, slopeDbPerDecade, name, color) {
  const startIndex = frequencies.findIndex(frequency => frequency >= anchorHz);
  if (startIndex < 0) return null;
  const anchorMagnitude = payloadMagnitudes[startIndex];
  return {
    name,
    x: frequencies.slice(startIndex),
    magnitude: frequencies.slice(startIndex).map(frequency => anchorMagnitude * (frequency / frequencies[startIndex]) ** (slopeDbPerDecade / 20)),
    color,
    dash: true
  };
}

const verticalTrace = (name, frequency, low, high, color, emphasis = true) => ({ name, x: [frequency, frequency], y: [low, high], color, dash: true, emphasis });

function nearestResponseSummary(model, frequency, baseAmplitudeM) {
  try {
    const response = twoStageResponseAtFrequency(model, frequency);
    const payloadMagnitude = complexMagnitude(response.x2);
    return {
      frequencyHz: frequency,
      response,
      payloadMagnitude,
      payloadDb: db(payloadMagnitude),
      stage1RelativeM: complexMagnitude(response.relative1) * baseAmplitudeM,
      stage2RelativeM: complexMagnitude(response.relative2) * baseAmplitudeM,
      stage1ForceN: complexMagnitude(response.force1PerBaseDisplacement) * baseAmplitudeM,
      stage2ForceN: complexMagnitude(response.force2PerBaseDisplacement) * baseAmplitudeM,
      phase1Deg: complexPhaseDeg(response.x1),
      phase2Deg: complexPhaseDeg(response.x2),
      phaseDifferenceDeg: complexPhaseDeg({
        re: response.x2.re * response.x1.re + response.x2.im * response.x1.im,
        im: response.x2.im * response.x1.re - response.x2.re * response.x1.im
      })
    };
  } catch {
    return { frequencyHz: frequency, payloadMagnitude: Infinity, payloadDb: Infinity, stage1RelativeM: Infinity, stage2RelativeM: Infinity, stage1ForceN: Infinity, stage2ForceN: Infinity, phase1Deg: NaN, phase2Deg: NaN, phaseDifferenceDeg: NaN };
  }
}

function resultPlot(model, comparisonMagnitudes, comparisonLabel, values) {
  const magnitudes = model.x2Magnitude;
  const inDb = values.magnitudeView === 'db';
  const payloadY = inDb ? magnitudes.map(db) : magnitudes;
  const intermediateY = inDb ? model.x1Magnitude.map(db) : model.x1Magnitude;
  const comparisonY = inDb ? comparisonMagnitudes.map(db) : comparisonMagnitudes;
  const finitePayload = finiteValues(payloadY);
  let low = inDb ? Math.max(-240, Math.floor((Math.min(...finitePayload) - 8) / 20) * 20) : Math.max(1e-12, Math.min(...finitePayload) / 3);
  let high = inDb ? Math.ceil((Math.max(...finitePayload, 1) + 5) / 10) * 10 : Math.max(...finitePayload) * 2;
  if (!(high > low)) { low = inDb ? -120 : 1e-8; high = inDb ? 20 : 10; }
  const traces = [
    { name: 'Payload |X₂/Y|', x: model.frequencies, y: payloadY, color: '#55b8ff', emphasis: true },
    { name: 'Intermediate |X₁/Y|', x: model.frequencies, y: intermediateY, color: '#52c8aa' }
  ];
  if (values.comparisonType !== 'none') traces.push({ name: comparisonLabel, x: model.frequencies, y: comparisonY, color: '#f0a34a', dash: true, emphasis: true });
  if (values.showAsymptotes) {
    const anchorHz = Math.max(model.modes[1].frequencyHz * 1.5, values.minimumFrequencyHz * 1.2);
    for (const reference of [
      idealSlopeTrace(model.frequencies, magnitudes, anchorHz, -40, 'Ideal −40 dB/dec reference', '#aa86f7'),
      idealSlopeTrace(model.frequencies, magnitudes, anchorHz, -80, 'Ideal −80 dB/dec reference', '#ff7f91')
    ]) if (reference) traces.push({ ...reference, y: inDb ? reference.magnitude.map(db) : reference.magnitude });
  }
  for (const mode of model.modes) if (mode.frequencyHz >= values.minimumFrequencyHz && mode.frequencyHz <= values.maximumFrequencyHz) traces.push(verticalTrace(`Mode ${mode.number}`, mode.frequencyHz, low, high, mode.number === 1 ? '#8ae6d2' : '#ffbe6a'));
  if (model.antiresonanceHz >= values.minimumFrequencyHz && model.antiresonanceHz <= values.maximumFrequencyHz) traces.push(verticalTrace('X₁ antiresonance', model.antiresonanceHz, low, high, '#d7a7ff'));
  values.forcingFrequencies.forEach((frequency, index) => {
    if (frequency >= values.minimumFrequencyHz && frequency <= values.maximumFrequencyHz) traces.push(verticalTrace(`Forcing ${fmt(frequency)} Hz`, frequency, low, high, ['#d9ecff', '#ffd7a2', '#f7b6c3'][index % 3]));
  });
  return {
    title: inDb ? 'Payload transmission and single-stage comparison' : 'Payload transmission — linear magnitude',
    xLabel: 'Frequency (Hz)',
    yLabel: inDb ? 'Motion transmissibility (dB re 1)' : 'Motion transmissibility |X/Y|',
    xScale: 'log',
    yScale: inDb ? 'linear' : 'log',
    xMin: values.minimumFrequencyHz,
    xMax: values.maximumFrequencyHz,
    yMin: low,
    yMax: high,
    traces,
    traceSelector: { label: 'Response, comparison, and markers', initial: 'emphasis' }
  };
}

function phasePlot(model, values) {
  return {
    title: 'Complex phase relative to base motion',
    xLabel: 'Frequency (Hz)',
    yLabel: 'Unwrapped phase (deg)',
    xScale: 'log',
    xMin: values.minimumFrequencyHz,
    xMax: values.maximumFrequencyHz,
    traces: [
      { name: 'Intermediate X₁/Y', x: model.frequencies, y: model.phase1Deg, color: '#52c8aa', emphasis: true },
      { name: 'Payload X₂/Y', x: model.frequencies, y: model.phase2Deg, color: '#55b8ff', emphasis: true },
      { name: 'Payload relative to intermediate', x: model.frequencies, y: model.phaseDifferenceDeg, color: '#f0a34a', dash: true }
    ],
    traceSelector: { label: 'Phase traces', initial: 'emphasis' }
  };
}

function modeTable(model) {
  return {
    title: 'Undamped modes and modal damping projection',
    columns: ['Mode', 'Natural frequency (Hz)', 'Damped frequency (Hz)', 'Modal damping ratio', 'Intermediate shape', 'Payload shape', 'Relative phase'],
    rows: model.modes.map(mode => [mode.number, mode.frequencyHz, mode.dampedFrequencyHz, mode.dampingRatio, mode.shape[0], mode.shape[1], mode.phaseRelation])
  };
}

function forcingTable(summaries) {
  return {
    title: 'Response at forcing frequencies',
    columns: ['Frequency (Hz)', 'Payload transmissibility', 'Attenuation (dB)', 'Stage 1 motion (µm)', 'Stage 2 motion (µm)', 'Stage 1 force (N)', 'Stage 2 force (N)', 'Phase X₁ (deg)', 'Phase X₂ (deg)', 'X₂−X₁ phase (deg)'],
    rows: summaries.map(item => [item.frequencyHz, item.payloadMagnitude, item.payloadDb, item.stage1RelativeM * 1e6, item.stage2RelativeM * 1e6, item.stage1ForceN, item.stage2ForceN, item.phase1Deg, item.phase2Deg, item.phaseDifferenceDeg])
  };
}

function staticTable(values, equivalentStiffness) {
  const stage1LoadN = (values.m1 + values.m2) * TWO_STAGE_G0;
  const stage2LoadN = values.m2 * TWO_STAGE_G0;
  const stage1DeflectionM = stage1LoadN / values.k1;
  const stage2DeflectionM = stage2LoadN / values.k2;
  return {
    stage1LoadN, stage2LoadN, stage1DeflectionM, stage2DeflectionM,
    table: {
      title: 'Static load path — distinct from dynamic order',
      columns: ['Quantity', 'Force (N)', 'Compression (mm)', 'Stiffness (N/m)', 'Physical meaning'],
      rows: [
        ['Stage 1 supported load', stage1LoadN, '', '', 'Carries intermediate plate plus payload'],
        ['Stage 2 supported load', stage2LoadN, '', '', 'Carries payload only'],
        ['Stage 1 load per isolator', stage1LoadN / values.stage1Count, '', '', `${values.stage1Count} parallel isolators`],
        ['Stage 2 load per isolator', stage2LoadN / values.stage2Count, '', '', `${values.stage2Count} parallel isolators`],
        ['Stage 1 static compression', '', stage1DeflectionM * 1000, '', 'Linear total-stage stiffness'],
        ['Stage 2 static compression', '', stage2DeflectionM * 1000, '', 'Linear total-stage stiffness'],
        ['Total static deflection', '', (stage1DeflectionM + stage2DeflectionM) * 1000, '', 'Sum of stage compressions under their actual loads'],
        ['Quasi-static series stiffness', '', '', equivalentStiffness, 'k₁k₂/(k₁+k₂); this does not describe the two dynamic poles']
      ]
    }
  };
}

function commentary(values, model, forcingSummaries, comparisonMagnitudes) {
  const massRatio = values.m1 / values.m2;
  const modeRatio = model.modes[1].frequencyHz / model.modes[0].frequencyHz;
  const comparisonFrequency = forcingSummaries[Math.min(1, forcingSummaries.length - 1)].frequencyHz;
  const selected = forcingSummaries.find(item => item.frequencyHz === comparisonFrequency);
  const comparison = complexMagnitude(singleStageResponseAtFrequency({ mass: values.m1 + values.m2, stiffness: values.comparisonType === 'user' ? values.singleStiffness : equivalentSeriesStiffness(values.k1, values.k2), dampingRatio: values.singleDampingRatio }, comparisonFrequency));
  const extraAttenuationDb = db(comparison) - selected.payloadDb;
  const slope = model.highFrequencySlopeDbPerDecade;
  const slopeMessage = slope <= -68
    ? `Across the upper analyzed band the calculated payload slope is ${fmt(slope, 1)} dB/decade, so the model is exhibiting a strong fourth-order-like attenuation region.`
    : `Across the upper analyzed band the calculated payload slope is ${fmt(slope, 1)} dB/decade; viscous damping paths and finite mode separation keep it from an ideal −80 dB/decade slope.`;
  const massMessage = massRatio < .02
    ? `The intermediate mass is only ${fmt(100 * massRatio, 2)}% of the payload mass, so the upper pole is being pushed out of band and the architecture is collapsing toward two springs in series.`
    : `The intermediate mass is ${fmt(100 * massRatio, 1)}% of the payload mass and supplies the inertia needed for a genuine second dynamic degree of freedom.`;
  const comparisonMessage = values.comparisonType === 'none'
    ? 'The optional single-stage comparison is hidden.'
    : extraAttenuationDb >= 0
      ? `At ${fmt(comparisonFrequency)} Hz the two-stage payload response provides ${fmt(extraAttenuationDb, 1)} dB more attenuation than the selected single-stage comparison.`
      : `At ${fmt(comparisonFrequency)} Hz the two-stage payload response is ${fmt(-extraAttenuationDb, 1)} dB worse than the selected single-stage comparison.`;
  return {
    summary: `Mode 1 is ${fmt(model.modes[0].frequencyHz, 1)} Hz and mode 2 is ${fmt(model.modes[1].frequencyHz, 1)} Hz, a separation ratio of ${fmt(modeRatio, 2)}. ${comparisonMessage}`,
    physicalMeaning: `${massMessage} ${slopeMessage}`,
    engineeringConsiderations: [
      'Stage 1 largely sets the low-frequency supported-mass mode; Stage 2 and intermediate inertia create the upper pole and the additional roll-off region.',
      'The marked antiresonance is a zero of intermediate motion in the undamped model. This serial base-excited chain does not generally have a finite payload transmission zero.',
      'The mode animations use normalized eigenvectors; the harmonic animation preserves calculated relative amplitude and phase but normalizes screen motion.'
    ]
  };
}

function activeWarnings(values, model, forcingSummaries, staticState) {
  const warnings = [];
  const massRatio = values.m1 / values.m2;
  const modeRatio = model.modes[1].frequencyHz / model.modes[0].frequencyHz;
  if (massRatio < .02) warnings.push(`Intermediate mass is ${fmt(100 * massRatio, 2)}% of payload mass; the system is close to the equivalent springs-in-series limit.`);
  if (modeRatio < 3) warnings.push(`The two natural frequencies are separated by only a factor of ${fmt(modeRatio, 2)}; resonant regions overlap and the compound-filter benefit is weak.`);
  for (const item of forcingSummaries) {
    const distance = Math.abs(item.frequencyHz - model.modes[1].frequencyHz) / model.modes[1].frequencyHz;
    if (distance <= .2) warnings.push(`The second resonance at ${fmt(model.modes[1].frequencyHz, 1)} Hz lies within 20% of the ${fmt(item.frequencyHz)} Hz forcing frequency${item.payloadMagnitude > 1 ? ' and causes amplification' : ''}.`);
  }
  if (model.modes.some(mode => mode.dampingRatio >= .15)) warnings.push('High projected modal damping suppresses resonance peaks but provides a direct viscous transmission path that reduces deep high-frequency isolation.');
  if (model.highFrequencySlopeDbPerDecade > -55) warnings.push(`The calculated upper-band slope is ${fmt(model.highFrequencySlopeDbPerDecade, 1)} dB/decade, so this configuration is not showing a strong fourth-order-like roll-off over the selected range.`);
  if (staticState.stage1DeflectionM + staticState.stage2DeflectionM > .025) warnings.push('Calculated total static deflection exceeds 25 mm; confirm available travel, stability, alignment, and isolator geometry before treating this linear architecture as practical.');
  return [...new Set(warnings)];
}

function computeVerticalTwoStageIsolation(valuesInput) {
  const values = normalizedInputs(valuesInput);
  const model = analyzeTwoStageIsolation(values);
  const equivalentStiffness = equivalentSeriesStiffness(values.k1, values.k2);
  const comparisonStiffness = values.comparisonType === 'user' ? values.singleStiffness : equivalentStiffness;
  if (values.comparisonType === 'user' && (!(comparisonStiffness > 0) || !Number.isFinite(comparisonStiffness))) throw new Error('User-defined single-stage stiffness must be greater than zero.');
  const comparisonMagnitudes = model.frequencies.map(frequency => complexMagnitude(singleStageResponseAtFrequency({ mass: values.m1 + values.m2, stiffness: comparisonStiffness, dampingRatio: values.singleDampingRatio }, frequency)));
  const comparisonLabel = values.comparisonType === 'user' ? 'User-defined single stage' : 'Equivalent-static-stiffness single stage';
  const forcingSummaries = values.forcingFrequencies.map(frequency => nearestResponseSummary(model, frequency, values.baseAmplitudeM));
  const staticState = staticTable(values, equivalentStiffness);
  const interpretation = commentary(values, model, forcingSummaries, comparisonMagnitudes);
  const warnings = activeWarnings(values, model, forcingSummaries, staticState);
  const allRelative1 = finiteValues(model.relative1Magnitude).map(magnitude => magnitude * values.baseAmplitudeM);
  const allRelative2 = finiteValues(model.relative2Magnitude).map(magnitude => magnitude * values.baseAmplitudeM);
  const force1 = finiteValues(model.responses.map(response => response ? complexMagnitude(response.force1PerBaseDisplacement) * values.baseAmplitudeM : NaN));
  const force2 = finiteValues(model.responses.map(response => response ? complexMagnitude(response.force2PerBaseDisplacement) * values.baseAmplitudeM : NaN));
  let harmonicResponse = null;
  try { harmonicResponse = twoStageResponseAtFrequency(model, values.animationFrequencyHz); } catch {}
  const peak = model.payloadPeaks.reduce((best, item) => !best || item.magnitude > best.magnitude ? item : best, null);
  const valuesOut = [
    { label: 'Mode 1 frequency', value: model.modes[0].frequencyHz, unit: 'Hz', note: 'Lower coupled mode' },
    { label: 'Mode 2 frequency', value: model.modes[1].frequencyHz, unit: 'Hz', note: 'Upper coupled mode' },
    { label: 'Upper-band slope', value: model.highFrequencySlopeDbPerDecade, unit: 'dB/decade', note: 'Regressed from calculated response' },
    { label: 'Peak payload transmissibility', value: peak?.magnitude ?? Math.max(...finiteValues(model.x2Magnitude)), unit: '', note: peak ? `Near ${fmt(peak.frequencyHz, 1)} Hz` : 'Largest sampled response' },
    { label: 'Intermediate-motion antiresonance', value: model.antiresonanceHz, unit: 'Hz', note: 'Undamped X₁ zero; not a payload zero' },
    { label: 'Quasi-static series stiffness', value: equivalentStiffness, unit: 'N/m' },
    { label: 'Sustained payload T < 1', value: model.thresholdFrequencies.unity ?? 'Not reached', unit: model.thresholdFrequencies.unity ? 'Hz' : '' },
    { label: 'Sustained payload T < −10 dB', value: model.thresholdFrequencies.minus10 ?? 'Not reached', unit: model.thresholdFrequencies.minus10 ? 'Hz' : '' },
    { label: 'Sustained payload T < −20 dB', value: model.thresholdFrequencies.minus20 ?? 'Not reached', unit: model.thresholdFrequencies.minus20 ? 'Hz' : '' },
    { label: 'Sustained payload T < −30 dB', value: model.thresholdFrequencies.minus30 ?? 'Not reached', unit: model.thresholdFrequencies.minus30 ? 'Hz' : '' },
    { label: 'Maximum Stage 1 relative motion', value: Math.max(...allRelative1) * 1e6, unit: 'µm' },
    { label: 'Maximum Stage 2 relative motion', value: Math.max(...allRelative2) * 1e6, unit: 'µm' },
    { label: 'Maximum Stage 1 dynamic force', value: Math.max(...force1), unit: 'N' },
    { label: 'Maximum Stage 2 dynamic force', value: Math.max(...force2), unit: 'N' }
  ];
  return {
    values: valuesOut,
    interpretation,
    assumptions: {
      satisfied: [
        'Two rigid translating masses and a rigid prescribed base; vertical motion only.',
        'Linear time-invariant springs and viscous dampers; all calculations use coherent SI units internally.',
        'Stage stiffness and damping are installed totals after applying isolator count and stiffness basis.',
        'A stage damping-ratio input is converted with total supported mass for Stage 1 and the m1–m2 reduced mass for Stage 2.',
        'Modal damping ratios are projected onto undamped real mode shapes; damped frequencies use the lightly damped modal approximation.'
      ],
      warnings,
      alerts: warnings,
      limitations: [
        'No isolator travel, free thickness, load-deflection nonlinearity, buckling, contact loss, or compression allowable is modeled in Phase 1.',
        'The masses, intermediate plate, base, attachments, and payload are rigid; flexible-body modes and bypass paths are omitted.',
        'Ideal −40 and −80 dB/decade lines are visual references only. The reported slope is regressed from the calculated coupled response.',
        'This is an architecture and screening model, not a qualification result. Correlate stiffness, damping, modes, phase, force, and travel with installed hardware tests.'
      ]
    },
    validity: {
      regime: 'Exact complex harmonic solution of the stated linear 2×2 dynamic-stiffness system, with analytical undamped eigenvalues and projected modal damping.',
      confidence: warnings.length ? `${warnings.length} configuration-specific review item${warnings.length === 1 ? '' : 's'} active. Numerical results remain valid for the implemented linear model.` : 'No configuration-specific numerical warnings are active; hardware validity still requires measured installed properties and test correlation.'
    },
    relatedConcepts: [
      { title: 'Single-stage isolation designer', description: 'Use the existing 6-DOF rigid-body tool when the architecture has one physical isolation stage.', href: '#/tool/sorbothane-isolation' },
      { title: 'Two coupled modes', description: 'Review eigenvalues, eigenvectors, participation, and mode separation.', href: '#/tool/two-dof' },
      { title: 'Damping and transmissibility', description: 'Connect resonance suppression with the viscous high-frequency transmission path.', href: '#/tool/damping' }
    ],
    plots: [resultPlot(model, comparisonMagnitudes, comparisonLabel, values), phasePlot(model, values)],
    tables: [modeTable(model), forcingTable(forcingSummaries), staticState.table, {
      title: 'Sampled payload resonance peaks',
      columns: ['Peak', 'Frequency (Hz)', 'Payload transmissibility', 'Level (dB)'],
      rows: model.payloadPeaks.length ? model.payloadPeaks.map((item, index) => [index + 1, item.frequencyHz, item.magnitude, db(item.magnitude)]) : [['—', 'No sampled local peak', 'Increase frequency coverage or reduce damping', '—']]
    }],
    csv: {
      filename: 'two-stage-isolation-frequency-response.csv',
      columns: ['frequency_hz', 'x1_over_y_magnitude', 'x2_over_y_magnitude', 'x1_phase_deg', 'x2_phase_deg', 'x2_minus_x1_phase_deg', 'stage1_relative_per_base', 'stage2_relative_per_base'],
      rows: model.frequencies.map((frequency, index) => [frequency, model.x1Magnitude[index], model.x2Magnitude[index], model.phase1Deg[index], model.phase2Deg[index], model.phaseDifferenceDeg[index], model.relative1Magnitude[index], model.relative2Magnitude[index]])
    },
    presentation: { primaryEvidence: { type: 'plot', index: 0 }, primaryEvidenceStack: [{ type: 'plot', index: 0 }], primaryEvidenceCount: 1, primaryValueCount: 6, animation: null },
    analysis: { values, model, forcingSummaries, comparisonMagnitudes, comparisonLabel, staticState, harmonicResponse }
  };
}

function rigidAxisModes(model) {
  const indices = [model.axis, 6 + model.axis];
  return [...model.modes]
    .sort((left, right) => indices.reduce((sum, index) => sum + right.participation[index], 0) - indices.reduce((sum, index) => sum + left.participation[index], 0))
    .slice(0, 2)
    .sort((left, right) => left.frequencyHz - right.frequencyHz);
}

function rigidForcingSummary(model, frequencyHz, values) {
  const response = compoundResponseAtFrequency(model, frequencyHz, values.baseAxis);
  const payloadMagnitude = complexMagnitude(response.body2Q[model.axis]);
  const offAxisTranslation = Math.sqrt(response.body2Q.slice(0, 3).reduce((sum, item, index) => sum + (index === model.axis ? 0 : complexMagnitude(item) ** 2), 0));
  const payloadRotation = Math.sqrt(response.body2Q.slice(3, 6).reduce((sum, item) => sum + complexMagnitude(item) ** 2, 0));
  const phase1Deg = complexPhaseDeg(response.body1Q[model.axis]);
  const phase2Deg = complexPhaseDeg(response.body2Q[model.axis]);
  const relativePhase = complexPhaseDeg({
    re: response.body2Q[model.axis].re * response.body1Q[model.axis].re + response.body2Q[model.axis].im * response.body1Q[model.axis].im,
    im: response.body2Q[model.axis].im * response.body1Q[model.axis].re - response.body2Q[model.axis].re * response.body1Q[model.axis].im
  });
  return {
    frequencyHz,
    response,
    payloadMagnitude,
    payloadDb: db(payloadMagnitude),
    offAxisTranslationM: offAxisTranslation * values.baseAmplitudeM,
    payloadRotationRad: payloadRotation * values.baseAmplitudeM,
    stage1RelativeM: Math.max(...response.stage1.map(item => item.relativeMagnitude)) * values.baseAmplitudeM,
    stage2RelativeM: Math.max(...response.stage2.map(item => item.relativeMagnitude)) * values.baseAmplitudeM,
    stage1ForceN: Math.max(...response.stage1.map(item => item.forceMagnitude)) * values.baseAmplitudeM,
    stage2ForceN: Math.max(...response.stage2.map(item => item.forceMagnitude)) * values.baseAmplitudeM,
    phase1Deg,
    phase2Deg,
    phaseDifferenceDeg: relativePhase
  };
}

function rigidResultPlot(model, comparisonMagnitudes, comparisonLabel, values) {
  const inDb = values.magnitudeView === 'db';
  const mapMagnitude = magnitudes => inDb ? magnitudes.map(db) : magnitudes;
  const payloadY = mapMagnitude(model.payloadAxis);
  const finitePayload = finiteValues(payloadY);
  let low = inDb ? Math.max(-240, Math.floor((Math.min(...finitePayload) - 8) / 20) * 20) : Math.max(1e-12, Math.min(...finitePayload) / 3);
  let high = inDb ? Math.ceil((Math.max(...finitePayload, 1) + 5) / 10) * 10 : Math.max(...finitePayload) * 2;
  if (!(high > low)) { low = inDb ? -120 : 1e-8; high = inDb ? 20 : 10; }
  const axis = values.baseAxis.toUpperCase();
  const traces = [
    { name: `12-DOF payload ${axis}/base`, x: model.frequencies, y: payloadY, color: '#55b8ff', emphasis: true },
    { name: `12-DOF intermediate ${axis}/base`, x: model.frequencies, y: mapMagnitude(model.intermediateAxis), color: '#52c8aa' },
    { name: 'Off-axis payload motion · length scaled', x: model.frequencies, y: mapMagnitude(model.offAxisMagnitude), color: '#d7a7ff' },
    { name: `Axis-aligned 2-DOF reference`, x: model.frequencies, y: mapMagnitude(model.referencePayloadMagnitude), color: '#f0a34a', dash: true, emphasis: true }
  ];
  if (values.comparisonType !== 'none') traces.push({ name: comparisonLabel, x: model.frequencies, y: mapMagnitude(comparisonMagnitudes), color: '#ff8999', dash: true });
  if (values.showAsymptotes) {
    const anchor = Math.max(model.selectedModes.at(-1)?.frequencyHz * 1.5 || 0, values.minimumFrequencyHz * 1.2);
    for (const reference of [
      idealSlopeTrace(model.frequencies, model.payloadAxis, anchor, -40, 'Ideal −40 dB/dec reference', '#aa86f7'),
      idealSlopeTrace(model.frequencies, model.payloadAxis, anchor, -80, 'Ideal −80 dB/dec reference', '#ffbe6a')
    ]) if (reference) traces.push({ ...reference, y: mapMagnitude(reference.magnitude) });
  }
  for (const mode of model.selectedModes) if (mode.frequencyHz >= values.minimumFrequencyHz && mode.frequencyHz <= values.maximumFrequencyHz) traces.push(verticalTrace(`M${mode.number} · ${mode.dominant}`, mode.frequencyHz, low, high, '#d9ecff', false));
  values.forcingFrequencies.forEach((frequency, index) => {
    if (frequency >= values.minimumFrequencyHz && frequency <= values.maximumFrequencyHz) traces.push(verticalTrace(`Forcing ${fmt(frequency)} Hz`, frequency, low, high, ['#d9ecff', '#ffd7a2', '#f7b6c3'][index % 3]));
  });
  return {
    title: `Rigid-body compound response · ${axis}-axis base excitation`,
    xLabel: 'Frequency (Hz)',
    yLabel: inDb ? 'Motion transmissibility (dB re 1)' : 'Motion transmissibility |X/Y|',
    xScale: 'log',
    yScale: inDb ? 'linear' : 'log',
    xMin: values.minimumFrequencyHz,
    xMax: values.maximumFrequencyHz,
    yMin: low,
    yMax: high,
    traces,
    traceSelector: { label: 'Rigid-body response, parity, and markers', initial: 'emphasis' }
  };
}

function rigidPhasePlot(model, values) {
  const axis = values.baseAxis.toUpperCase();
  return {
    title: `Rigid-body complex phase · ${axis}-axis response`,
    xLabel: 'Frequency (Hz)',
    yLabel: 'Unwrapped phase (deg)',
    xScale: 'log',
    xMin: values.minimumFrequencyHz,
    xMax: values.maximumFrequencyHz,
    traces: [
      { name: `Intermediate ${axis}/base`, x: model.frequencies, y: model.intermediatePhaseDeg, color: '#52c8aa', emphasis: true },
      { name: `Payload ${axis}/base`, x: model.frequencies, y: model.payloadPhaseDeg, color: '#55b8ff', emphasis: true },
      { name: 'Payload relative to intermediate', x: model.frequencies, y: model.phaseDifferenceDeg, color: '#f0a34a', dash: true }
    ],
    traceSelector: { label: 'Rigid-body phase traces', initial: 'emphasis' }
  };
}

function rigidModeTable(model) {
  return {
    title: 'Twelve rigid-body modes and modal damping projection',
    columns: ['Mode', 'Natural frequency (Hz)', 'Damped frequency (Hz)', 'Modal damping ratio', 'Base participation (%)', 'Dominant DOF', 'Secondary DOF'],
    rows: model.modes.map(mode => [mode.number, mode.frequencyHz, mode.dampedFrequencyHz, mode.dampingRatio, mode.baseParticipationPct, mode.dominant, mode.secondary])
  };
}

function rigidForcingTable(summaries) {
  return {
    title: 'Rigid-body response at forcing frequencies',
    columns: ['Frequency (Hz)', 'Payload transmissibility', 'Attenuation (dB)', 'Off-axis translation (µm)', 'Payload rotation (mrad)', 'Max Stage 1 motion (µm)', 'Max Stage 2 motion (µm)', 'Max Stage 1 force (N)', 'Max Stage 2 force (N)', 'Payload phase (deg)'],
    rows: summaries.map(item => [item.frequencyHz, item.payloadMagnitude, item.payloadDb, item.offAxisTranslationM * 1e6, item.payloadRotationRad * 1e3, item.stage1RelativeM * 1e6, item.stage2RelativeM * 1e6, item.stage1ForceN, item.stage2ForceN, item.phase2Deg])
  };
}

function rigidMountTable(model) {
  const row = (stage, index, mount, body1Position, body2Position = null) => [
    stage, index + 1,
    body1Position[0], body1Position[1], body1Position[2],
    body2Position?.[0] ?? 'Base', body2Position?.[1] ?? 'Base', body2Position?.[2] ?? 'Base',
    mount.stiffness[0], mount.stiffness[1], mount.stiffness[2], mount.damping[0], mount.damping[1], mount.damping[2]
  ];
  return {
    title: 'Assembled mount attachment vectors and local properties',
    columns: ['Stage', 'Mount', 'Intermediate x (m)', 'Intermediate y (m)', 'Intermediate z (m)', 'Other-side x (m)', 'Other-side y (m)', 'Other-side z (m)', 'Kx (N/m)', 'Ky (N/m)', 'Kz (N/m)', 'Cx (N·s/m)', 'Cy (N·s/m)', 'Cz (N·s/m)'],
    rows: [
      ...model.stage1Mounts.map((mount, index) => row('Stage 1', index, mount, mount.body1Position)),
      ...model.stage2Mounts.map((mount, index) => row('Stage 2', index, mount, mount.body1Position, mount.body2Position))
    ]
  };
}

function rigidStaticTable(model) {
  const rows = [];
  model.staticState.stage1.forEach((mount, index) => rows.push(['Stage 1', index + 1, mount.supportedLoadN, mount.relative[0] * 1000, mount.relative[1] * 1000, mount.relative[2] * 1000, mount.forceMagnitude]));
  model.staticState.stage2.forEach((mount, index) => rows.push(['Stage 2', index + 1, mount.supportedLoadN, mount.relative[0] * 1000, mount.relative[1] * 1000, mount.relative[2] * 1000, mount.forceMagnitude]));
  return { title: 'Static rigid-body equilibrium by mount', columns: ['Stage', 'Mount', 'Vertical supported load (N)', 'Relative X (mm)', 'Relative Y (mm)', 'Relative Z (mm)', 'Resultant force (N)'], rows };
}

function rigidWarnings(values, model, forcingSummaries) {
  const warnings = [];
  if (model.parityMaximumRelativeDifference > .05) warnings.push(`The 12-DOF payload response differs from the axis-aligned 2-DOF reference by as much as ${fmt(100 * model.parityMaximumRelativeDifference, 1)}%; translation–rotation coupling is dynamically important.`);
  else if (model.parityMaximumRelativeDifference > .001) warnings.push(`The 12-DOF response departs from the axis-aligned 2-DOF reference by ${fmt(100 * model.parityMaximumRelativeDifference, 2)}%; inspect CG and mount-pattern offsets.`);
  if (model.offAxisPeakRatio > .1) warnings.push(`Peak off-axis payload motion is ${fmt(100 * model.offAxisPeakRatio, 1)}% of the peak primary-axis response after rotational length scaling.`);
  for (const forcing of forcingSummaries) for (const mode of model.selectedModes) {
    if (Math.abs(forcing.frequencyHz - mode.frequencyHz) / mode.frequencyHz <= .2) warnings.push(`Participating mode M${mode.number} at ${fmt(mode.frequencyHz, 1)} Hz lies within 20% of the ${fmt(forcing.frequencyHz)} Hz forcing frequency${forcing.payloadMagnitude > 1 ? ' and the payload is amplified' : ''}.`);
  }
  const negativeLoads = [...model.staticState.stage1, ...model.staticState.stage2].filter(mount => mount.supportedLoadN < -1e-6).length;
  if (negativeLoads) warnings.push(`${negativeLoads} mount${negativeLoads === 1 ? '' : 's'} carry negative vertical static load in the linear solution; confirm capture, preload, and contact.`);
  if (model.highFrequencySlopeDbPerDecade > -55) warnings.push(`The calculated upper-band slope is ${fmt(model.highFrequencySlopeDbPerDecade, 1)} dB/decade; coupling or viscous transmission prevents a strong fourth-order-like region over the selected band.`);
  return [...new Set(warnings)];
}

function computeRigidBodyTwoStageIsolation(valuesInput) {
  const values = normalizedInputs(valuesInput);
  const input = compoundModelInput(valuesInput, values);
  const model = analyzeCompoundIsolation(input);
  const axisModes = rigidAxisModes(model);
  const equivalentStiffness = equivalentSeriesStiffness(model.stage1AxisStiffness, model.stage2AxisStiffness);
  const comparisonStiffness = values.comparisonType === 'user' ? values.singleStiffness : equivalentStiffness;
  if (values.comparisonType === 'user' && (!(comparisonStiffness > 0) || !Number.isFinite(comparisonStiffness))) throw new Error('User-defined single-stage stiffness must be greater than zero.');
  const comparisonMagnitudes = model.frequencies.map(frequency => complexMagnitude(singleStageResponseAtFrequency({ mass: values.m1 + values.m2, stiffness: comparisonStiffness, dampingRatio: values.singleDampingRatio }, frequency)));
  const comparisonLabel = values.comparisonType === 'user' ? 'User-defined single stage' : 'Equivalent-static-stiffness single stage';
  const forcingSummaries = values.forcingFrequencies.map(frequency => rigidForcingSummary(model, frequency, values));
  const warnings = rigidWarnings(values, model, forcingSummaries);
  const comparisonFrequency = forcingSummaries[Math.min(1, forcingSummaries.length - 1)].frequencyHz;
  const selectedForcing = forcingSummaries.find(item => item.frequencyHz === comparisonFrequency);
  const singleAtComparison = complexMagnitude(singleStageResponseAtFrequency({ mass: values.m1 + values.m2, stiffness: comparisonStiffness, dampingRatio: values.singleDampingRatio }, comparisonFrequency));
  const additionalAttenuation = db(singleAtComparison) - selectedForcing.payloadDb;
  const symmetryStatement = model.parityMaximumRelativeDifference < 1e-6
    ? 'The symmetric geometry reproduces the axis-aligned 2-DOF payload FRF to numerical precision, so the 12-DOF assembly passes its vertical parity gate.'
    : `The maximum difference from the axis-aligned 2-DOF reference is ${fmt(100 * model.parityMaximumRelativeDifference, 2)}%, quantifying the effect of CG offset and translation–rotation coupling.`;
  let harmonicResponse = null;
  try { harmonicResponse = compoundResponseAtFrequency(model, values.animationFrequencyHz, values.baseAxis); } catch {}
  const peak = model.payloadPeaks.reduce((best, item) => !best || item.magnitude > best.magnitude ? item : best, null);
  const maximumStage1Force = Math.max(...forcingSummaries.map(item => item.stage1ForceN));
  const maximumStage2Force = Math.max(...forcingSummaries.map(item => item.stage2ForceN));
  return {
    values: [
      { label: 'Lower axis-coupled mode', value: axisModes[0].frequencyHz, unit: 'Hz', note: `M${axisModes[0].number} · ${axisModes[0].dominant}` },
      { label: 'Upper axis-coupled mode', value: axisModes[1].frequencyHz, unit: 'Hz', note: `M${axisModes[1].number} · ${axisModes[1].dominant}` },
      { label: 'Lowest rigid-body mode', value: model.modes[0].frequencyHz, unit: 'Hz', note: model.modes[0].dominant },
      { label: 'Upper-band slope', value: model.highFrequencySlopeDbPerDecade, unit: 'dB/decade', note: 'Regressed from the 12-DOF payload FRF' },
      { label: '2-DOF parity difference', value: 100 * model.parityMaximumRelativeDifference, unit: '%', note: 'Maximum complex FRF difference over the selected band' },
      { label: 'Peak off-axis coupling', value: 100 * model.offAxisPeakRatio, unit: '%', note: 'Translation plus length-scaled rotation' },
      { label: 'Peak payload transmissibility', value: peak?.magnitude ?? Math.max(...model.payloadAxis), unit: '', note: peak ? `Near ${fmt(peak.frequencyHz, 1)} Hz` : 'Largest sampled response' },
      { label: 'Maximum Stage 1 mount force', value: maximumStage1Force, unit: 'N', note: 'At entered forcing frequencies' },
      { label: 'Maximum Stage 2 mount force', value: maximumStage2Force, unit: 'N', note: 'At entered forcing frequencies' },
      { label: 'Quasi-static axis stiffness', value: equivalentStiffness, unit: 'N/m', note: 'Series combination along the excitation axis' }
    ],
    interpretation: {
      summary: `The selected ${values.baseAxis.toUpperCase()}-axis dynamics are carried primarily by M${axisModes[0].number} at ${fmt(axisModes[0].frequencyHz, 1)} Hz and M${axisModes[1].number} at ${fmt(axisModes[1].frequencyHz, 1)} Hz. At ${fmt(comparisonFrequency)} Hz the rigid-body two-stage design provides ${fmt(additionalAttenuation, 1)} dB ${additionalAttenuation >= 0 ? 'more' : 'less'} attenuation than the selected single-stage comparison.`,
      physicalMeaning: `${symmetryStatement} The mount attachment vectors convert local three-axis mount motion into body forces and moments; off-axis response is therefore calculated rather than inferred.`,
      engineeringConsiderations: [
        'The 12×12 matrices retain translation–rotation coupling within each body and the cross-body Stage 2 coupling blocks.',
        'The axis-aligned 2-DOF curve is a live reduction of the same installed axis stiffness and damping, making symmetry breaking and CG-offset effects directly visible.',
        'Static mount loads come from a full rigid-body equilibrium solve; negative load requires captured or preloaded hardware rather than a tension-incapable pad.'
      ]
    },
    assumptions: {
      satisfied: [
        'Intermediate plate and payload are rigid bodies with six small-motion coordinates defined at their CGs.',
        'Every mount is a linear three-axis spring and viscous damper aligned with the global axes.',
        'Stage 2 attachment-point compatibility is assembled on both bodies; its off-diagonal matrix blocks are retained.',
        'The base undergoes prescribed rigid translation along the selected axis with zero base rotation.',
        'All matrix assembly and complex harmonic calculations use coherent SI units internally.'
      ],
      warnings,
      alerts: warnings,
      limitations: [
        'Bodies remain rigid; flexible plate, payload, bracket, joint, and base modes are omitted.',
        'Mount axes are globally aligned and properties are uniform within each stage; arbitrary attachment coordinates are supported, but arbitrary mount orientation and mount-to-mount property variation are not yet exposed in the UI.',
        'Springs and viscous dampers are linear and frequency independent; preload, compression-dependent modulus, contact loss, travel limits, buckling, and hysteresis require hardware-specific models.',
        'A 12-DOF screening result is not qualification. Correlate modes, damping, FRFs, phase, static load, relative motion, and mount force with installed tests.'
      ]
    },
    validity: {
      regime: 'Direct complex solution of the assembled 12×12 rigid-body dynamic-stiffness system with analytical matrix assembly, generalized undamped modes, and projected modal damping.',
      confidence: warnings.length ? `${warnings.length} configuration-specific review item${warnings.length === 1 ? '' : 's'} active; the numerical solution remains exact for the stated linear rigid-body model.` : 'The configuration passes the current coupling and static-contact screens; installed-property and test correlation remain required.'
    },
    relatedConcepts: [
      { title: 'Vertical 2-DOF parity model', description: 'Switch fidelity in this tool to isolate the axis-only dynamics.', href: '#/tool/two-stage-isolation' },
      { title: 'Single-stage isolation designer', description: 'Use the separate 6-DOF tool for a single physical mount stage.', href: '#/tool/sorbothane-isolation' },
      { title: 'Model–test correlation', description: 'Compare frequency, MAC, and complex FRF evidence before updating properties.', href: '#/tool/model-test-correlation' }
    ],
    plots: [rigidResultPlot(model, comparisonMagnitudes, comparisonLabel, values), rigidPhasePlot(model, values)],
    tables: [rigidModeTable(model), rigidForcingTable(forcingSummaries), rigidStaticTable(model), rigidMountTable(model), {
      title: 'Body mass properties used in [M]',
      columns: ['Body', 'Mass (kg)', 'Length (m)', 'Width (m)', 'Height (m)', 'Ixx (kg·m²)', 'Iyy (kg·m²)', 'Izz (kg·m²)', 'Ixy (kg·m²)', 'Ixz (kg·m²)', 'Iyz (kg·m²)'],
      rows: [
        ['Intermediate', model.body1.massKg, ...model.body1.dimensionsM, ...model.body1.inertiaKgM2],
        ['Payload', model.body2.massKg, ...model.body2.dimensionsM, ...model.body2.inertiaKgM2]
      ]
    }],
    csv: {
      filename: 'compound-isolation-12dof-frequency-response.csv',
      columns: ['frequency_hz', 'intermediate_axis_magnitude', 'payload_axis_magnitude', 'payload_off_axis_length_scaled', 'two_dof_reference_magnitude', 'intermediate_phase_deg', 'payload_phase_deg'],
      rows: model.frequencies.map((frequency, index) => [frequency, model.intermediateAxis[index], model.payloadAxis[index], model.offAxisMagnitude[index], model.referencePayloadMagnitude[index], model.intermediatePhaseDeg[index], model.payloadPhaseDeg[index]])
    },
    presentation: { primaryEvidence: { type: 'plot', index: 0 }, primaryEvidenceStack: [{ type: 'plot', index: 0 }], primaryEvidenceCount: 1, primaryValueCount: 6, animation: null },
    analysis: { values, model, axisModes, forcingSummaries, comparisonMagnitudes, comparisonLabel, harmonicResponse, rigidInput: input }
  };
}

function computeTwoStageIsolation(valuesInput) {
  return valuesInput.model_fidelity === 'vertical-2dof' ? computeVerticalTwoStageIsolation(valuesInput) : computeRigidBodyTwoStageIsolation(valuesInput);
}

export const twoStageIsolationCalculator = {
  basis: 'Selectable exact 2×2 vertical or assembled 12×12 two-rigid-body dynamic-stiffness solution; no cascaded SDOF approximation',
  confidence: 'Exact for the selected linear rigid-body model; installed mount properties and flexible-body boundaries require correlation',
  presetKeys: ['preset'],
  inputs: [
    { key: 'preset', label: 'Architecture preset', type: 'select', default: 'rigid-balanced', options: [['rigid-balanced', '12-DOF · Balanced geometry'], ['rigid-offset', '12-DOF · Offset CG coupling'], ['soft-stiff', '2-DOF · Soft + Stiff Demo'], ['massless-intermediate', '2-DOF · Nearly Massless Intermediate'], ['poor-design', '2-DOF · Poor Design near 600 Hz'], ['high-damping', '2-DOF · High Damping']] },
    { key: 'model_fidelity', label: 'Dynamic model', type: 'select', default: 'rigid-12dof', options: [['rigid-12dof', 'Rigid-body 12-DOF'], ['vertical-2dof', 'Vertical 2-DOF parity model']], help: 'The 12-DOF model retains two bodies × six rigid-body coordinates. The 2-DOF model remains the transparent axis-only reference.' },
    { key: 'base_axis', label: 'Base-excitation axis', type: 'select', default: 'z', options: [['z', 'Z · vertical'], ['x', 'X · lateral'], ['y', 'Y · lateral']] },
    { key: 'm2', label: 'Payload mass', unit: 'kg', type: 'number', default: 20, min: .001, help: 'Upper rigid mass m₂.' },
    { key: 'm1', label: 'Intermediate plate mass', unit: 'kg', type: 'number', default: 5, min: .000001, help: 'The inertia that creates the second dynamic degree of freedom.' },
    { key: 'intermediate_inertia_mode', label: 'Intermediate inertia', type: 'select', default: 'auto', options: [['auto', 'Uniform rectangular body'], ['manual', 'Manual inertia tensor']] },
    { key: 'intermediate_length', label: 'Intermediate length', unit: 'm', type: 'number', default: .5, min: .001 },
    { key: 'intermediate_width', label: 'Intermediate width', unit: 'm', type: 'number', default: .4, min: .001 },
    { key: 'intermediate_height', label: 'Intermediate height', unit: 'm', type: 'number', default: .04, min: .001 },
    { key: 'intermediate_cg_x', label: 'Intermediate CG offset X', unit: 'm', type: 'number', default: 0, help: 'CG offset from the parametric mount-pattern centroid.' },
    { key: 'intermediate_cg_y', label: 'Intermediate CG offset Y', unit: 'm', type: 'number', default: 0 },
    { key: 'intermediate_cg_z', label: 'Intermediate CG offset Z', unit: 'm', type: 'number', default: 0 },
    { key: 'intermediate_ixx', label: 'Intermediate Ixx', unit: 'kg·m²', type: 'number', default: .067333, min: 1e-9 },
    { key: 'intermediate_iyy', label: 'Intermediate Iyy', unit: 'kg·m²', type: 'number', default: .104833, min: 1e-9 },
    { key: 'intermediate_izz', label: 'Intermediate Izz', unit: 'kg·m²', type: 'number', default: .170833, min: 1e-9 },
    { key: 'intermediate_ixy', label: 'Intermediate Ixy', unit: 'kg·m²', type: 'number', default: 0 },
    { key: 'intermediate_ixz', label: 'Intermediate Ixz', unit: 'kg·m²', type: 'number', default: 0 },
    { key: 'intermediate_iyz', label: 'Intermediate Iyz', unit: 'kg·m²', type: 'number', default: 0 },
    { key: 'payload_inertia_mode', label: 'Payload inertia', type: 'select', default: 'auto', options: [['auto', 'Uniform rectangular body'], ['manual', 'Manual inertia tensor']] },
    { key: 'payload_length', label: 'Payload length', unit: 'm', type: 'number', default: .35, min: .001 },
    { key: 'payload_width', label: 'Payload width', unit: 'm', type: 'number', default: .28, min: .001 },
    { key: 'payload_height', label: 'Payload height', unit: 'm', type: 'number', default: .2, min: .001 },
    { key: 'payload_cg_x', label: 'Payload CG offset X', unit: 'm', type: 'number', default: 0, help: 'CG offset from the parametric payload-side Stage 2 pattern centroid.' },
    { key: 'payload_cg_y', label: 'Payload CG offset Y', unit: 'm', type: 'number', default: 0 },
    { key: 'payload_cg_z', label: 'Payload CG offset Z', unit: 'm', type: 'number', default: 0 },
    { key: 'payload_ixx', label: 'Payload Ixx', unit: 'kg·m²', type: 'number', default: .197333, min: 1e-9 },
    { key: 'payload_iyy', label: 'Payload Iyy', unit: 'kg·m²', type: 'number', default: .270833, min: 1e-9 },
    { key: 'payload_izz', label: 'Payload Izz', unit: 'kg·m²', type: 'number', default: .334833, min: 1e-9 },
    { key: 'payload_ixy', label: 'Payload Ixy', unit: 'kg·m²', type: 'number', default: 0 },
    { key: 'payload_ixz', label: 'Payload Ixz', unit: 'kg·m²', type: 'number', default: 0 },
    { key: 'payload_iyz', label: 'Payload Iyz', unit: 'kg·m²', type: 'number', default: 0 },
    { key: 'stage1_category', label: 'Stage 1 character', type: 'select', default: 'soft', options: [['soft', 'Soft'], ['medium', 'Medium'], ['stiff', 'Stiff'], ['custom', 'Custom']], help: 'Descriptive label only; the entered stiffness controls the model.' },
    { key: 'stage1_count', label: 'Stage 1 isolator count', type: 'number', default: 4, min: 1, max: 100 },
    { key: 'stage1_stiffness_basis', label: 'Stage 1 stiffness basis', type: 'select', default: 'total', options: [['total', 'Total installed stage'], ['per-isolator', 'Per isolator']] },
    { key: 'stage1_stiffness', label: 'Stage 1 stiffness', unit: 'N/m', type: 'number', default: 4e5, min: .001 },
    { key: 'stage1_damping_mode', label: 'Stage 1 damping input', type: 'select', default: 'ratio', options: [['ratio', 'Stage damping ratio ζ₁'], ['coefficient', 'Total damping coefficient c₁']] },
    { key: 'stage1_zeta', label: 'Stage 1 damping ratio ζ₁', type: 'number', default: .008, min: 0, max: 2, help: 'Active when damping input is ratio; referenced to m₁+m₂.' },
    { key: 'stage1_c', label: 'Stage 1 total damping c₁', unit: 'N·s/m', type: 'number', default: 0, min: 0, help: 'Active when damping input is coefficient.' },
    { key: 'stage1_kx_ratio', label: 'Stage 1 Kx/Kz', type: 'number', default: .3, min: .000001, help: 'Rigid-body mode: per-mount lateral-to-vertical stiffness ratio.' },
    { key: 'stage1_ky_ratio', label: 'Stage 1 Ky/Kz', type: 'number', default: .3, min: .000001 },
    { key: 'stage1_cx_ratio', label: 'Stage 1 Cx/Cz', type: 'number', default: 1, min: 0 },
    { key: 'stage1_cy_ratio', label: 'Stage 1 Cy/Cz', type: 'number', default: 1, min: 0 },
    { key: 'stage2_category', label: 'Stage 2 character', type: 'select', default: 'stiff', options: [['soft', 'Soft'], ['medium', 'Medium'], ['stiff', 'Stiff'], ['custom', 'Custom']], help: 'Descriptive label only; either stage may be soft or stiff.' },
    { key: 'stage2_count', label: 'Stage 2 isolator count', type: 'number', default: 4, min: 1, max: 100 },
    { key: 'stage2_stiffness_basis', label: 'Stage 2 stiffness basis', type: 'select', default: 'total', options: [['total', 'Total installed stage'], ['per-isolator', 'Per isolator']] },
    { key: 'stage2_stiffness', label: 'Stage 2 stiffness', unit: 'N/m', type: 'number', default: 1e7, min: .001 },
    { key: 'stage2_damping_mode', label: 'Stage 2 damping input', type: 'select', default: 'ratio', options: [['ratio', 'Stage damping ratio ζ₂'], ['coefficient', 'Total damping coefficient c₂']] },
    { key: 'stage2_zeta', label: 'Stage 2 damping ratio ζ₂', type: 'number', default: .008, min: 0, max: 2, help: 'Active when damping input is ratio; referenced to the m₁–m₂ reduced mass.' },
    { key: 'stage2_c', label: 'Stage 2 total damping c₂', unit: 'N·s/m', type: 'number', default: 0, min: 0, help: 'Active when damping input is coefficient.' },
    { key: 'stage2_kx_ratio', label: 'Stage 2 Kx/Kz', type: 'number', default: .3, min: .000001, help: 'Rigid-body mode: per-mount lateral-to-vertical stiffness ratio.' },
    { key: 'stage2_ky_ratio', label: 'Stage 2 Ky/Kz', type: 'number', default: .3, min: .000001 },
    { key: 'stage2_cx_ratio', label: 'Stage 2 Cx/Cz', type: 'number', default: 1, min: 0 },
    { key: 'stage2_cy_ratio', label: 'Stage 2 Cy/Cz', type: 'number', default: 1, min: 0 },
    { key: 'stage1_geometry', label: 'Stage 1 mount coordinates', type: 'select', default: 'parametric', options: [['parametric', 'Parametric 3/4-point pattern'], ['custom', 'Custom coordinates']] },
    { key: 'stage1_spacing_x', label: 'Stage 1 spacing X', unit: 'm', type: 'number', default: .42, min: .001 },
    { key: 'stage1_spacing_y', label: 'Stage 1 spacing Y', unit: 'm', type: 'number', default: .32, min: .001 },
    { key: 'stage1_plane_z', label: 'Stage 1 plane Z', unit: 'm', type: 'number', default: .03, help: 'Plane coordinate before subtracting the intermediate CG offset.' },
    { key: 'stage1_custom_points', label: 'Stage 1 custom intermediate points', type: 'textarea', default: '-0.21m,-0.16m,0.03m; 0.21m,-0.16m,0.03m; 0.21m,0.16m,0.03m; -0.21m,0.16m,0.03m', help: 'One x,y,z row per mount, separated by semicolons or new lines. Coordinates are relative to the intermediate CG; use m, mm, cm, in, or ft suffixes.' },
    { key: 'stage2_geometry', label: 'Stage 2 mount coordinates', type: 'select', default: 'parametric', options: [['parametric', 'Parametric 3/4-point patterns'], ['custom', 'Custom paired coordinates']] },
    { key: 'stage2_intermediate_spacing_x', label: 'Stage 2 intermediate spacing X', unit: 'm', type: 'number', default: .32, min: .001 },
    { key: 'stage2_intermediate_spacing_y', label: 'Stage 2 intermediate spacing Y', unit: 'm', type: 'number', default: .25, min: .001 },
    { key: 'stage2_intermediate_plane_z', label: 'Stage 2 intermediate plane Z', unit: 'm', type: 'number', default: -.03 },
    { key: 'stage2_payload_spacing_x', label: 'Stage 2 payload spacing X', unit: 'm', type: 'number', default: .28, min: .001 },
    { key: 'stage2_payload_spacing_y', label: 'Stage 2 payload spacing Y', unit: 'm', type: 'number', default: .22, min: .001 },
    { key: 'stage2_payload_plane_z', label: 'Stage 2 payload plane Z', unit: 'm', type: 'number', default: .11 },
    { key: 'stage2_intermediate_custom_points', label: 'Stage 2 custom intermediate points', type: 'textarea', default: '-0.16m,-0.125m,-0.03m; 0.16m,-0.125m,-0.03m; 0.16m,0.125m,-0.03m; -0.16m,0.125m,-0.03m', help: 'Coordinates relative to the intermediate CG.' },
    { key: 'stage2_payload_custom_points', label: 'Stage 2 custom payload points', type: 'textarea', default: '-0.14m,-0.11m,0.11m; 0.14m,-0.11m,0.11m; 0.14m,0.11m,0.11m; -0.14m,0.11m,0.11m', help: 'Paired coordinates relative to the payload CG; row order must match the intermediate list.' },
    { key: 'comparison_type', label: 'Single-stage comparison', type: 'select', default: 'equivalent', options: [['equivalent', 'Equivalent static series stiffness'], ['user', 'User-defined stiffness'], ['none', 'Hide comparison']] },
    { key: 'single_stiffness', label: 'User single-stage stiffness', unit: 'N/m', type: 'number', default: 4e5, min: .001, help: 'Used only for the user-defined comparison; supported mass is m₁+m₂.' },
    { key: 'single_zeta', label: 'Single-stage damping ratio', type: 'number', default: .03, min: 0, max: 2 },
    { key: 'minimum_frequency', label: 'Minimum frequency', unit: 'Hz', type: 'number', default: 10, min: .01 },
    { key: 'maximum_frequency', label: 'Maximum frequency', unit: 'Hz', type: 'number', default: 2000, min: .02 },
    { key: 'points_per_decade', label: 'Frequency resolution', type: 'select', default: 64, options: [[24, '24 points/decade'], [48, '48 points/decade'], [64, '64 points/decade'], [96, '96 points/decade']] },
    { key: 'magnitude_view', label: 'Magnitude display', type: 'select', default: 'db', options: [['db', 'dB amplitude ratio'], ['linear', 'Linear |X/Y|']] },
    { key: 'show_asymptotes', label: 'Asymptotic references', type: 'select', default: 'yes', options: [['yes', 'Show ideal −40/−80 dB/dec lines'], ['no', 'Hide reference lines']] },
    { key: 'forcing_1', label: 'Forcing frequency 1', unit: 'Hz', type: 'number', default: 600, min: .01 },
    { key: 'forcing_2', label: 'Forcing frequency 2', unit: 'Hz', type: 'number', default: 1200, min: .01 },
    { key: 'forcing_3', label: 'Forcing frequency 3', unit: 'Hz', type: 'number', default: 1400, min: .01 },
    { key: 'base_amplitude', label: 'Base displacement amplitude', unit: 'm peak', type: 'number', default: 1e-6, min: 1e-12, help: 'Scales relative displacement and dynamic-force results; transmissibility is amplitude-independent.' },
    { key: 'animation_frequency', label: 'Harmonic animation frequency', unit: 'Hz', type: 'number', default: 600, min: .01 }
  ],
  syncPreset(values) {
    return { ...(TWO_STAGE_ISOLATION_PRESETS[values.preset] ?? TWO_STAGE_ISOLATION_PRESETS['rigid-balanced']) };
  },
  compute: computeTwoStageIsolation,
  theory: '<p>The selected model solves <strong>[K + jωC − ω²M]{X} = {Bᵀ(Km+jωCm)u<sub>base</sub>}</strong> directly. In rigid-body mode, each mount uses attachment kinematics δ = [I −[r]×]q and Stage 2 contributes the full cross-body coupling blocks.</p>',
  assumptions: ['Linear springs and viscous dampers.', 'Rigid prescribed base plus rigid intermediate and payload bodies.', 'Small translations and rotations about body CG coordinates.'],
  references: [
    { title: 'Den Hartog, Mechanical Vibrations', note: 'Classical vibration-isolation and coupled-system foundations.' },
    { title: 'Inman, Engineering Vibration', note: 'Matrix equations, modal projection, and harmonic response.' }
  ]
};

function springPath(x, top, bottom) {
  const lead = 10;
  const span = Math.max(12, bottom - top - 2 * lead);
  const turns = 6;
  let path = `M${x},${top} L${x},${top + lead}`;
  for (let index = 0; index <= turns * 2; index++) {
    const y = top + lead + span * index / (turns * 2);
    const offset = index === 0 || index === turns * 2 ? 0 : (index % 2 ? 11 : -11);
    path += ` L${x + offset},${y}`;
  }
  return `${path} L${x},${bottom}`;
}

function renderRigidBodyIsolationDiagram(analysis) {
  const { model, values, harmonicResponse, axisModes } = analysis;
  const modeButtons = model.modes.map(mode => `<button type="button" class="button-secondary${mode.number === axisModes[0].number ? ' is-active' : ''}" data-compound-case="mode-${mode.number}" aria-pressed="${mode.number === axisModes[0].number}">M${mode.number}</button>`).join('');
  const mountDots = (mounts, y, colorClass) => mounts.map((mount, index) => {
    const x = 260 + clamp(mount.body1Position[0] / .5, -.48, .48) * 230;
    return `<g class="compound-mount ${colorClass}"><circle cx="${x}" cy="${y}" r="8"/><text x="${x}" y="${y + 25}">${index + 1}</text></g>`;
  }).join('');
  const primaryMode = axisModes[0];
  const modeCards = model.modes.map(mode => `<article class="${mode.baseParticipationPct >= 1 ? 'is-participating' : ''}"><span>M${mode.number} · ${esc(mode.dominant)}</span><strong>${esc(fmt(mode.frequencyHz, 2))} Hz</strong><small>ζᵣ ${esc(fmt(mode.dampingRatio, 4))} · base ${esc(fmt(mode.baseParticipationPct, 1))}%</small></article>`).join('');
  const harmonicText = harmonicResponse
    ? `At ${fmt(values.animationFrequencyHz)} Hz: payload ${values.baseAxis.toUpperCase()}/base = ${fmt(complexMagnitude(harmonicResponse.body2Q[model.axis]), 3)}; max Stage 2 mount force per unit base displacement = ${fmt(Math.max(...harmonicResponse.stage2.map(item => item.forceMagnitude)), 3)} N/m.`
    : 'The selected harmonic case is singular.';
  return `<div class="two-stage-visual compound-12dof-visual" data-compound-visual>
    <div class="two-stage-animation-controls compound-mode-controls" role="group" aria-label="Rigid-body animation case">${modeButtons}<button type="button" class="button-secondary" data-compound-case="harmonic" aria-pressed="false">${esc(fmt(values.animationFrequencyHz))} Hz</button><button type="button" class="button-quiet" data-compound-play aria-pressed="true">Pause</button></div>
    <svg viewBox="0 0 900 520" role="img" aria-label="Animated 12-degree-of-freedom compound isolation system">
      <title>Two rigid bodies connected by discrete three-axis isolation mounts</title>
      <desc>The base, intermediate rigid body, payload rigid body, CG locations, and discrete Stage 1 and Stage 2 mount points are shown. Animation is a normalized oblique projection.</desc>
      <g class="compound-base" data-compound-body="base"><rect x="90" y="445" width="350" height="28" rx="5"/><path d="M105 483h320m-295 0-18 22m72-22-18 22m72-22-18 22m72-22-18 22m72-22-18 22"/></g>
      <g class="compound-stage-lines stage-one">${model.stage1Mounts.map((mount, index) => { const x = 260 + clamp(mount.body1Position[0] / .5, -.48, .48) * 230; return `<path d="M${x} 350V445"/><text x="${x}" y="410">S1-${index + 1}</text>`; }).join('')}</g>
      <g data-compound-body="body1"><rect class="compound-body intermediate" x="100" y="315" width="330" height="48" rx="8"/>${mountDots(model.stage1Mounts, 350, 'stage-one')}${mountDots(model.stage2Mounts, 326, 'stage-two')}<path class="compound-cg" d="M255 329h18m-9-9v18"/><text x="265" y="304">INTERMEDIATE · 6 DOF</text></g>
      <g class="compound-stage-lines stage-two">${model.stage2Mounts.map((mount, index) => { const x = 260 + clamp(mount.body2Position[0] / .5, -.48, .48) * 180; return `<path d="M${x} 210V315"/><text x="${x}" y="270">S2-${index + 1}</text>`; }).join('')}</g>
      <g data-compound-body="body2"><rect class="compound-body payload" x="140" y="150" width="250" height="75" rx="10"/>${model.stage2Mounts.map((mount, index) => { const x = 260 + clamp(mount.body2Position[0] / .5, -.48, .48) * 180; return `<g class="compound-mount stage-two"><circle cx="${x}" cy="210" r="8"/><text x="${x}" y="135">${index + 1}</text></g>`; }).join('')}<path class="compound-cg" d="M251 184h18m-9-9v18"/><text x="265" y="120">PAYLOAD · 6 DOF</text></g>
      <g class="compound-coordinate-key"><rect x="520" y="110" width="320" height="300" rx="12"/><text x="550" y="145">ASSEMBLED COORDINATES</text><text x="550" y="180">q₁ = [X Y Z Rₓ Rᵧ Rz]ᵀ</text><text x="550" y="210">q₂ = [X Y Z Rₓ Rᵧ Rz]ᵀ</text><path d="M550 240h260"/><text x="550" y="275">Stage 1: B₁ᵀ K B₁</text><text x="550" y="310">Stage 2: [−B₁  B₂]ᵀ K [−B₁  B₂]</text><text x="550" y="350">Selected base axis: ${esc(values.baseAxis.toUpperCase())}</text><text x="550" y="380">2-DOF parity: ${esc(fmt(100 * model.parityMaximumRelativeDifference, 4))}%</text></g>
      <text x="450" y="42" class="two-stage-animation-title" data-compound-animation-title>M${primaryMode.number} · ${esc(primaryMode.dominant.toUpperCase())}</text>
      <text x="450" y="70" class="two-stage-animation-readout" data-compound-animation-readout>${esc(fmt(primaryMode.frequencyHz, 2))} Hz · ζᵣ ${esc(fmt(primaryMode.dampingRatio, 4))}</text>
    </svg>
    <p class="two-stage-animation-note"><strong>Animation frequency is scaled for visualization.</strong> Translation and rotation are normalized together using the largest body dimension. The oblique screen projection preserves modal sign or harmonic complex phase; drawn mount lines remain the nominal reference geometry. ${esc(harmonicText)}</p>
    <div class="two-stage-mode-cards compound-mode-cards">${modeCards}</div>
    <details class="two-stage-how"><summary>How the 12-DOF assembly works</summary><div><h4>Attachment kinematics</h4><p>Small motion at a mount is δ = u + θ × r = [I − [r]×]q. Off-center mount forces therefore create moments automatically.</p><h4>Stage 2 coupling</h4><p>Relative motion is B₂q₂ − B₁q₁. Expanding its energy produces both body-diagonal terms and the negative cross-body blocks. Omitting those blocks would incorrectly decouple the stages.</p><h4>Parity gate</h4><p>With symmetric mount patterns, centered CGs, and axis-aligned properties, the selected translational FRF must reproduce the established 2-DOF solution. Offsets then reveal the additional rocking, pitching, yawing, and cross-axis paths.</p><h4>Interpretation boundary</h4><p>The bodies are still rigid and mount properties are linear. Flexible brackets, plates, payload modes, joint compliance, property scatter, and measured frequency dependence belong in later fidelity or test correlation.</p></div></details>
  </div>`;
}

export function renderTwoStageIsolationDiagram(context) {
  const analysis = context.nativeResult?.analysis ?? context.result?.analysis;
  if (!analysis) return '<div class="calc-error">Complete the inputs to render the physical model.</div>';
  if (analysis.model?.kind === 'rigid-12dof') return renderRigidBodyIsolationDiagram(analysis);
  const { model, values, harmonicResponse } = analysis;
  const modeCards = model.modes.map(mode => `<article><span>Mode ${mode.number} · ${esc(mode.phaseRelation)}</span><strong>${esc(fmt(mode.frequencyHz, 2))} Hz</strong><small>ζᵣ ${esc(fmt(mode.dampingRatio, 4))} · φ = [${esc(fmt(mode.shape[0], 3))}, ${esc(fmt(mode.shape[1], 3))}]</small></article>`).join('');
  const harmonicText = harmonicResponse ? `At ${fmt(values.animationFrequencyHz)} Hz: |X₁/Y| ${fmt(complexMagnitude(harmonicResponse.x1), 3)}, |X₂/Y| ${fmt(complexMagnitude(harmonicResponse.x2), 3)}` : 'The selected frequency is an exact undamped singularity.';
  return `<div class="two-stage-visual" data-two-stage-visual>
    <div class="two-stage-animation-controls" role="group" aria-label="Animation case">
      <button type="button" class="button-secondary is-active" data-two-stage-case="mode-1" aria-pressed="true">Mode 1</button>
      <button type="button" class="button-secondary" data-two-stage-case="mode-2" aria-pressed="false">Mode 2</button>
      <button type="button" class="button-secondary" data-two-stage-case="harmonic" aria-pressed="false">${esc(fmt(values.animationFrequencyHz))} Hz response</button>
      <button type="button" class="button-quiet" data-two-stage-play aria-pressed="true">Pause</button>
    </div>
    <svg viewBox="0 0 760 500" role="img" aria-label="Animated two-stage base-isolation system">
      <title>Two-stage isolation mode and harmonic-response animation</title>
      <desc>A vibrating base supports an intermediate plate through Stage 1, and the intermediate plate supports a payload through Stage 2. Screen displacement is normalized.</desc>
      <defs><marker id="two-stage-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z"/></marker></defs>
      <g class="two-stage-base" data-two-stage-body="base"><rect x="210" y="420" width="340" height="28" rx="5"/><path d="M220 458h320M235 458l-18 24m60-24-18 24m60-24-18 24m60-24-18 24m60-24-18 24m60-24-18 24m60-24-18 24"/></g>
      <g class="two-stage-springs stage-one"><path data-two-stage-spring="1a" d="${springPath(300, 330, 420)}"/><path data-two-stage-spring="1b" d="${springPath(460, 330, 420)}"/></g>
      <g class="two-stage-plate" data-two-stage-body="m1"><rect x="190" y="292" width="380" height="38" rx="7"/><text x="380" y="316">INTERMEDIATE PLATE · m₁ = ${esc(fmt(values.m1))} kg</text></g>
      <g class="two-stage-springs stage-two"><path data-two-stage-spring="2a" d="${springPath(300, 190, 292)}"/><path data-two-stage-spring="2b" d="${springPath(460, 190, 292)}"/></g>
      <g class="two-stage-payload" data-two-stage-body="m2"><rect x="245" y="115" width="270" height="75" rx="10"/><text x="380" y="148">PAYLOAD · m₂ = ${esc(fmt(values.m2))} kg</text><text x="380" y="171">X₂ / Y</text></g>
      <g class="two-stage-label stage-one-label"><text x="105" y="377">STAGE 1</text><text x="105" y="397">${esc(String(values.stage1Category).toUpperCase())} · ${esc(fmt(values.k1))} N/m</text></g>
      <g class="two-stage-label stage-two-label"><text x="105" y="238">STAGE 2</text><text x="105" y="258">${esc(String(values.stage2Category).toUpperCase())} · ${esc(fmt(values.k2))} N/m</text></g>
      <g class="two-stage-motion-arrows"><path data-two-stage-arrow="m1" d="M610 311v-38" marker-end="url(#two-stage-arrow)"/><path data-two-stage-arrow="m2" d="M610 152v-38" marker-end="url(#two-stage-arrow)"/></g>
      <text x="380" y="35" class="two-stage-animation-title" data-two-stage-animation-title>MODE 1 · ${esc(model.modes[0].phaseRelation.toUpperCase())}</text>
      <text x="380" y="60" class="two-stage-animation-readout" data-two-stage-animation-readout>Normalized φ = [${esc(fmt(model.modes[0].shape[0], 3))}, ${esc(fmt(model.modes[0].shape[1], 3))}]</text>
    </svg>
    <p class="two-stage-animation-note"><strong>Animation frequency is scaled for visualization.</strong> Motion is exaggerated. Mode views use normalized eigenvectors; harmonic response preserves relative amplitude and complex phase after a common normalization. ${esc(harmonicText)}</p>
    <div class="two-stage-mode-cards">${modeCards}</div>
    <details class="two-stage-how"><summary>How two-stage isolation works</summary><div><h4>Single stage</h4><p>One mass, spring, and damper form one dynamic degree of freedom. Above resonance, a stiffness-dominated displacement path can approach second-order roll-off.</p><h4>Two springs in series</h4><p>When m₁ approaches zero, the springs reduce to k<sub>eq</sub> = k₁k₂/(k₁+k₂). The high mode moves out of band, leaving essentially one dynamic degree of freedom.</p><h4>True compound isolation</h4><p>A meaningful m₁ supplies a second inertia, producing two modes and an additional pole. An ideal stiffness-only response can show a fourth-order-like region above both modes, while viscous damping can create shallower eventual asymptotes.</p><h4>Transmission zeros</h4><p>The undamped serial chain has an intermediate-motion zero at √(k₂/m₂)/(2π). It does not generally have a finite payload-motion zero under base excitation; a true payload notch requires a different forcing or alternate-path topology.</p></div></details>
  </div>`;
}

function bindRigidBodyIsolationAnimation(shell, analysis) {
  const host = shell.querySelector('[data-compound-visual]');
  if (!host) return () => {};
  const { model, values, harmonicResponse, axisModes } = analysis;
  const buttons = [...host.querySelectorAll('[data-compound-case]')];
  const play = host.querySelector('[data-compound-play]');
  const bodies = {
    base: host.querySelector('[data-compound-body="base"]'),
    body1: host.querySelector('[data-compound-body="body1"]'),
    body2: host.querySelector('[data-compound-body="body2"]')
  };
  const title = host.querySelector('[data-compound-animation-title]');
  const readout = host.querySelector('[data-compound-animation-readout]');
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let selected = `mode-${axisModes[0].number}`;
  let running = !reducedMotion?.matches;
  let frame = 0;
  let start = performance.now();
  const amplitude = 24;
  const weightedHarmonic = harmonicResponse ? harmonicResponse.q.map((value, index) => complexMagnitude(value) * ((index % 6) < 3 ? 1 : model.lengthScale)) : [];
  const harmonicScale = 1 / Math.max(1, ...weightedHarmonic);
  const harmonicReal = (value, angle, rotational = false) => value ? (value.re * Math.cos(angle) - value.im * Math.sin(angle)) * harmonicScale * (rotational ? model.lengthScale : 1) : 0;
  const transform = (element, vector, center) => {
    if (!element) return;
    const dx = amplitude * (vector[0] + .35 * vector[1]);
    const dy = -amplitude * vector[2];
    const rotation = 9 * (vector[5] + .45 * vector[3] + .45 * vector[4]);
    element.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${rotation.toFixed(2)} ${center[0]} ${center[1]})`);
  };
  const draw = now => {
    const angle = 2 * Math.PI * .34 * (now - start) / 1000;
    const wave = Math.cos(angle);
    let base = [0, 0, 0, 0, 0, 0];
    let body1 = [0, 0, 0, 0, 0, 0];
    let body2 = [0, 0, 0, 0, 0, 0];
    if (selected === 'harmonic') {
      base[model.axis] = wave * harmonicScale;
      body1 = harmonicResponse ? harmonicResponse.body1Q.map((value, index) => harmonicReal(value, angle, index >= 3)) : body1;
      body2 = harmonicResponse ? harmonicResponse.body2Q.map((value, index) => harmonicReal(value, angle, index >= 3)) : body2;
      title.textContent = `12-DOF HARMONIC RESPONSE · ${fmt(values.animationFrequencyHz)} HZ`;
      readout.textContent = harmonicResponse ? `Payload ${values.baseAxis.toUpperCase()} phase ${fmt(complexPhaseDeg(harmonicResponse.body2Q[model.axis]), 1)}° · off-axis motion retained` : 'Exact undamped singularity';
    } else {
      const number = Number(selected.split('-')[1]);
      const mode = model.modes[number - 1] ?? model.modes[0];
      body1 = mode.displayVector.slice(0, 6).map(value => value * wave);
      body2 = mode.displayVector.slice(6, 12).map(value => value * wave);
      title.textContent = `M${mode.number} · ${mode.dominant.toUpperCase()}`;
      readout.textContent = `${fmt(mode.frequencyHz, 2)} Hz · ζᵣ ${fmt(mode.dampingRatio, 4)} · base participation ${fmt(mode.baseParticipationPct, 1)}%`;
    }
    transform(bodies.base, base, [265, 460]);
    transform(bodies.body1, body1, [265, 340]);
    transform(bodies.body2, body2, [265, 188]);
    if (running) frame = requestAnimationFrame(draw);
  };
  const selectCase = event => {
    selected = event.currentTarget.dataset.compoundCase;
    buttons.forEach(button => { const active = button === event.currentTarget; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
    start = performance.now();
    if (!running) draw(start);
  };
  const toggle = () => {
    running = !running;
    play.textContent = running ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', String(running));
    if (running) { start = performance.now(); frame = requestAnimationFrame(draw); }
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  };
  buttons.forEach(button => button.addEventListener('click', selectCase));
  play?.addEventListener('click', toggle);
  if (running) frame = requestAnimationFrame(draw); else draw(start);
  return () => { if (frame) cancelAnimationFrame(frame); buttons.forEach(button => button.removeEventListener('click', selectCase)); play?.removeEventListener('click', toggle); };
}

export function bindTwoStageIsolationAnimation(shell, context) {
  const analysis = context.nativeResult?.analysis ?? context.result?.analysis;
  if (analysis?.model?.kind === 'rigid-12dof') return bindRigidBodyIsolationAnimation(shell, analysis);
  const host = shell.querySelector('[data-two-stage-visual]');
  if (!host || !analysis) return () => {};
  const { model, values, harmonicResponse } = analysis;
  const buttons = [...host.querySelectorAll('[data-two-stage-case]')];
  const play = host.querySelector('[data-two-stage-play]');
  const bodies = Object.fromEntries(['base', 'm1', 'm2'].map(key => [key, host.querySelector(`[data-two-stage-body="${key}"]`)]));
  const springs = Object.fromEntries(['1a', '1b', '2a', '2b'].map(key => [key, host.querySelector(`[data-two-stage-spring="${key}"]`)]));
  const arrows = Object.fromEntries(['m1', 'm2'].map(key => [key, host.querySelector(`[data-two-stage-arrow="${key}"]`)]));
  const title = host.querySelector('[data-two-stage-animation-title]');
  const readout = host.querySelector('[data-two-stage-animation-readout]');
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let selected = 'mode-1';
  let running = !reducedMotion?.matches;
  let frame = 0;
  let start = performance.now();
  const amplitudePx = 28;
  const responseScale = harmonicResponse ? 1 / Math.max(1, complexMagnitude(harmonicResponse.x1), complexMagnitude(harmonicResponse.x2)) : 1;
  const harmonicReal = (value, angle) => value ? (value.re * Math.cos(angle) - value.im * Math.sin(angle)) * responseScale : 0;
  const setArrow = (arrow, x, y, displacement) => {
    const direction = displacement >= 0 ? -1 : 1;
    arrow.setAttribute('d', `M${x} ${y + (direction > 0 ? -18 : 18)}v${direction * 36}`);
  };
  const draw = now => {
    const angle = 2 * Math.PI * .38 * (now - start) / 1000;
    let base = 0, m1 = 0, m2 = 0;
    if (selected === 'harmonic') {
      base = Math.cos(angle) * responseScale;
      m1 = harmonicReal(harmonicResponse?.x1, angle);
      m2 = harmonicReal(harmonicResponse?.x2, angle);
      title.textContent = `HARMONIC RESPONSE · ${fmt(values.animationFrequencyHz)} HZ`;
      readout.textContent = harmonicResponse ? `φ₁ ${fmt(complexPhaseDeg(harmonicResponse.x1), 1)}° · φ₂ ${fmt(complexPhaseDeg(harmonicResponse.x2), 1)}°` : 'Exact undamped singularity';
    } else {
      const mode = model.modes[selected === 'mode-2' ? 1 : 0];
      m1 = mode.shape[0] * Math.cos(angle);
      m2 = mode.shape[1] * Math.cos(angle);
      title.textContent = `MODE ${mode.number} · ${mode.phaseRelation.toUpperCase()}`;
      readout.textContent = `Normalized φ = [${fmt(mode.shape[0], 3)}, ${fmt(mode.shape[1], 3)}]`;
    }
    const shift = { base: -base * amplitudePx, m1: -m1 * amplitudePx, m2: -m2 * amplitudePx };
    for (const key of Object.keys(bodies)) bodies[key]?.setAttribute('transform', `translate(0 ${shift[key].toFixed(2)})`);
    const baseTop = 420 + shift.base, plateBottom = 330 + shift.m1, plateTop = 292 + shift.m1, payloadBottom = 190 + shift.m2;
    springs['1a']?.setAttribute('d', springPath(300, plateBottom, baseTop));
    springs['1b']?.setAttribute('d', springPath(460, plateBottom, baseTop));
    springs['2a']?.setAttribute('d', springPath(300, payloadBottom, plateTop));
    springs['2b']?.setAttribute('d', springPath(460, payloadBottom, plateTop));
    setArrow(arrows.m1, 610, 311 + shift.m1, m1);
    setArrow(arrows.m2, 610, 152 + shift.m2, m2);
    if (running) frame = requestAnimationFrame(draw);
  };
  const selectCase = event => {
    selected = event.currentTarget.dataset.twoStageCase;
    buttons.forEach(button => { const active = button === event.currentTarget; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
    start = performance.now();
    if (!running) draw(start);
  };
  const toggle = () => {
    running = !running;
    play.textContent = running ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', String(running));
    if (running) { start = performance.now(); frame = requestAnimationFrame(draw); }
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  };
  buttons.forEach(button => button.addEventListener('click', selectCase));
  play?.addEventListener('click', toggle);
  if (running) frame = requestAnimationFrame(draw); else draw(start);
  return () => { if (frame) cancelAnimationFrame(frame); buttons.forEach(button => button.removeEventListener('click', selectCase)); play?.removeEventListener('click', toggle); };
}

export const twoStageIsolationWorkbenchDefinition = {
  id: 'two-stage-isolation',
  toolId: 'two-stage-isolation',
  profile: 'analysis',
  quickRoute: false,
  title: 'Two-Stage Isolation Designer',
  category: 'Dynamics',
  eyebrow: 'Compound isolation · Interactive analysis',
  projectName: 'Two-stage isolation study',
  summary: 'Place two coupled resonances deliberately, quantify travel and transmitted force, and test whether intermediate inertia creates useful higher-order attenuation.',
  instruction: 'Define both installed isolation stages, the intermediate inertia, forcing frequencies, and base-motion amplitude. The solver recalculates the full complex coupled response.',
  inputTitle: 'Define the physical isolation stack',
  evidenceTitle: 'Coupled modes, transmission, phase, and static load path',
  visualLabel: 'Physical architecture and motion',
  visualTitle: 'Base → Stage 1 → intermediate mass → Stage 2 → payload',
  visualLegend: 'normalized motion · complex phase preserved',
  defaultTakeaway: 'Two springs do not create two dynamic poles unless meaningful intermediate inertia participates.',
  renderDiagram: renderTwoStageIsolationDiagram,
  bindInteractive: bindTwoStageIsolationAnimation,
  inputGroups: [
    { title: 'Architecture & masses', fieldKeys: ['preset', 'model_fidelity', 'base_axis', 'm2', 'm1'], open: true },
    { title: 'Intermediate rigid-body properties', fieldKeys: ['intermediate_inertia_mode', 'intermediate_length', 'intermediate_width', 'intermediate_height', 'intermediate_cg_x', 'intermediate_cg_y', 'intermediate_cg_z', 'intermediate_ixx', 'intermediate_iyy', 'intermediate_izz', 'intermediate_ixy', 'intermediate_ixz', 'intermediate_iyz'] },
    { title: 'Payload rigid-body properties', fieldKeys: ['payload_inertia_mode', 'payload_length', 'payload_width', 'payload_height', 'payload_cg_x', 'payload_cg_y', 'payload_cg_z', 'payload_ixx', 'payload_iyy', 'payload_izz', 'payload_ixy', 'payload_ixz', 'payload_iyz'] },
    { title: 'Stage 1 · base to intermediate', fieldKeys: ['stage1_category', 'stage1_count', 'stage1_stiffness_basis', 'stage1_stiffness', 'stage1_damping_mode', 'stage1_zeta', 'stage1_c', 'stage1_kx_ratio', 'stage1_ky_ratio', 'stage1_cx_ratio', 'stage1_cy_ratio'], open: true },
    { title: 'Stage 1 · mount geometry', fieldKeys: ['stage1_geometry', 'stage1_spacing_x', 'stage1_spacing_y', 'stage1_plane_z', 'stage1_custom_points'] },
    { title: 'Stage 2 · intermediate to payload', fieldKeys: ['stage2_category', 'stage2_count', 'stage2_stiffness_basis', 'stage2_stiffness', 'stage2_damping_mode', 'stage2_zeta', 'stage2_c', 'stage2_kx_ratio', 'stage2_ky_ratio', 'stage2_cx_ratio', 'stage2_cy_ratio'], open: true },
    { title: 'Stage 2 · paired mount geometry', fieldKeys: ['stage2_geometry', 'stage2_intermediate_spacing_x', 'stage2_intermediate_spacing_y', 'stage2_intermediate_plane_z', 'stage2_payload_spacing_x', 'stage2_payload_spacing_y', 'stage2_payload_plane_z', 'stage2_intermediate_custom_points', 'stage2_payload_custom_points'] },
    { title: 'Single-stage comparison', fieldKeys: ['comparison_type', 'single_stiffness', 'single_zeta'] },
    { title: 'Frequency grid & plot', fieldKeys: ['minimum_frequency', 'maximum_frequency', 'points_per_decade', 'magnitude_view', 'show_asymptotes'] },
    { title: 'Forcing markers & motion scale', fieldKeys: ['forcing_1', 'forcing_2', 'forcing_3', 'base_amplitude', 'animation_frequency'] }
  ],
  decision: context => {
    const analysis = context.nativeResult?.analysis;
    const slope = analysis?.model?.highFrequencySlopeDbPerDecade;
    const warnings = context.nativeResult?.assumptions?.alerts ?? [];
    return {
      question: 'Does the intermediate inertia create useful two-stage filtering without placing an upper resonance on the forcing?',
      scope: 'Compare the exact coupled payload response with a conventional single stage while watching mode placement, phase, travel, force, and the measured upper-band slope.',
      metric: { label: 'Calculated upper-band slope', value: slope, unit: 'dB/decade' },
      status: warnings.length ? 'review' : 'pass',
      statusLabel: warnings.length ? `${warnings.length} design review item${warnings.length === 1 ? '' : 's'}` : 'Compound response behaving as intended',
      keyLimitation: analysis?.model?.kind === 'rigid-12dof'
        ? 'The 12-DOF model retains rigid-body coupling but not flexible bodies, nonlinear mounts, arbitrary mount orientation, bypass paths, or measured property uncertainty.'
        : 'The 2-DOF parity model retains only the selected translational axis; use the 12-DOF model to expose CG-offset and mount-geometry coupling.'
    };
  },
  diagramTakeaway: context => context.nativeResult?.interpretation?.physicalMeaning,
  evidenceTakeaway: (context, evidence) => {
    if (evidence.type === 'plot' && evidence.index === 0) return `The payload curve, coupled-mode markers, forcing markers, single-stage comparison, and ideal slope guides share one frequency domain. The calculated slope is ${fmt(context.nativeResult?.analysis?.model?.highFrequencySlopeDbPerDecade, 1)} dB/decade.`;
    if (evidence.type === 'plot') return context.nativeResult?.analysis?.model?.kind === 'rigid-12dof' ? 'Complex phase is solved at the body CGs while the mount kinematics retain the corresponding force and moment paths.' : 'Phase rotation distinguishes in-phase rigid following, modal exchange, the intermediate-motion zero, and out-of-phase upper-mode behavior.';
    if (evidence.item?.title?.includes('Static')) return context.nativeResult?.analysis?.model?.kind === 'rigid-12dof' ? 'Static load is distributed by the assembled rigid-body equilibrium, so CG offsets can unload or reverse individual mount reactions.' : 'Static compression uses the actual gravity load carried by each stage; k₁k₂/(k₁+k₂) is a quasi-static quantity, not the dynamic system order.';
    return context.nativeResult?.interpretation?.engineeringConsiderations?.[0];
  },
  sources: [
    { title: 'Implemented equations', note: 'Direct complex solve of either the 2×2 axis model or the geometry-assembled 12×12 rigid-body dynamic-stiffness matrix.' },
    { title: 'Independent checks', note: 'Matrix symmetry and energy, modal residuals, static equilibrium, 3/4-point geometry, complex dynamic residual, and exact symmetric 2-DOF parity.' }
  ],
  relatedLinks: [
    { title: 'Single-Stage Isolation Designer', description: 'Existing 6-DOF rigid-body mount design; preserved as a separate tool.', href: '#/tool/sorbothane-isolation' },
    { title: 'Two-DOF modal calculator', description: 'Focused eigenvalue and mode-shape fundamentals.', href: '#/tool/two-dof' },
    { title: 'Damping & isolation', description: 'Classical resonance-versus-roll-off intuition.', href: '#/cheat-sheet?section=damping-isolation' }
  ]
};
