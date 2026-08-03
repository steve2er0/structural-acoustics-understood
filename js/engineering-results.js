/**
 * @typedef {Object} ResultValue
 * @property {string} label
 * @property {number|string} value
 * @property {string} [unit]
 * @property {string} [tone]
 * @property {string} [note]
 *
 * @typedef {Object} RelatedConcept
 * @property {string} title
 * @property {string} description
 * @property {string} href
 *
 * @typedef {Object} EngineeringResult
 * @property {ResultValue[]} values
 * @property {{summary: string, physicalMeaning: string, engineeringConsiderations: string[]}} interpretation
 * @property {{satisfied: string[], warnings: string[]}} assumptions
 * @property {{regime: string, confidence: string}} validity
 * @property {RelatedConcept[]} relatedConcepts
 * @property {Array<Object>} [plots]
 * @property {Array<Object>} [heatmaps]
 * @property {Array<Object>} [tables]
 * @property {Object} [csv]
 */

const DEFAULT_ASSUMPTION = 'Inputs use the units and reference conventions shown by the calculator.';

const CATEGORY_PROFILES = {
  Acoustics: {
    section: 'acoustics-db',
    physicalMeaning: primary => `The reported ${primary} describes an acoustic field, source, or frequency-band relationship. Acoustic levels and spectra represent energy or amplitude ratios; they should not be interpreted as linear quantities unless the result explicitly reports a linear unit.`,
    considerations: [
      'Confirm the acoustic reference quantity, bandwidth, field condition, and measurement geometry before comparing this result with test data.',
      'Check whether reflections, directivity, absorption, leakage, or near-field behavior are material to the installed configuration.'
    ],
    concepts: [['Acoustic quantities and levels', 'Connect pressure, intensity, power, and logarithmic level conventions.'], ['Frequency bands', 'Review octave-band geometry, bandwidth, and energy summation.']]
  },
  Dynamics: {
    section: 'sdof',
    physicalMeaning: primary => `The reported ${primary} is the response of an idealized dynamic system in which inertia, stiffness, and damping set the magnitude and phase. Its physical importance depends on where the excitation lies relative to resonance and on how faithfully the idealized degrees of freedom represent the hardware.`,
    considerations: [
      'Check modal participation, boundary stiffness, damping uncertainty, and nearby modes before treating an ideal oscillator result as an installed-system prediction.',
      'Compare force, base-motion, relative-travel, and absolute-response quantities carefully; they are not interchangeable.'
    ],
    concepts: [['Equation of motion', 'Relate mass, damping, stiffness, forcing, and response.'], ['Resonance and transmissibility', 'Review frequency ratio, amplification, phase, and isolation.']]
  },
  'Random & Shock': {
    section: 'random-psd',
    physicalMeaning: primary => `The reported ${primary} condenses a time-varying environment or oscillator response into a spectral, RMS, peak, impulse, or damage-related measure. RMS and PSD quantities describe statistical energy, while SRS and extreme estimates describe response envelopes rather than a reconstructable time history.`,
    considerations: [
      'Verify PSD normalization, frequency range, duration, damping, sampling, and statistical basis before comparing environments or specifications.',
      'Use convergence and sensitivity checks where frequency grids, time integration, peak factors, or fatigue exponents influence the result.'
    ],
    concepts: [['PSD and GRMS', 'Connect spectral density, bandwidth, mean square, and RMS response.'], ['Shock and extremes', 'Review response spectra, duration, peak statistics, and fatigue measures.']]
  },
  Structures: {
    section: 'structures-waves',
    physicalMeaning: primary => `The reported ${primary} follows from the selected beam, plate, shell, or wave idealization. It expresses how geometry, mass, and elastic stiffness control static response, modal frequency, propagation, or numerical resolution.`,
    considerations: [
      'Confirm boundary conditions, section properties, material orientation, added mass, and attachment stiffness for the actual structure.',
      'Check the thin/slender-structure range and refine the model when shear deformation, rotary inertia, curvature, joints, or local features matter.'
    ],
    concepts: [['Structural wave families', 'Review axial, torsional, shear, and flexural propagation.'], ['Beams, plates, and shells', 'Connect stiffness, mass, boundary conditions, and modal behavior.']]
  },
  'Structural Acoustics': {
    section: 'structural-acoustics',
    physicalMeaning: primary => `The reported ${primary} characterizes the exchange between structural motion and the surrounding acoustic field. Wavenumber matching, modal shape, radiation efficiency, surface mass, and fluid loading determine whether vibration couples efficiently into sound.`,
    considerations: [
      'Compare structural and acoustic wavelengths across the full band; a single characteristic frequency marks a transition, not a complete radiation prediction.',
      'Account for finite geometry, curvature, stiffeners, damping, joints, leakage, and fluid loading before using an ideal panel or shell result for design.'
    ],
    concepts: [['Coincidence and wavenumber matching', 'Connect flexural dispersion with acoustic radiation.'], ['Radiation and transmission', 'Review radiation efficiency, sound power, mass law, and panel coupling.']]
  },
  'Aero / Distributed Loads': {
    section: 'distributed-loads',
    physicalMeaning: primary => `The reported ${primary} describes a spatially distributed, partially coherent load model. Magnitude, coherence, phase, correlation length, convection, and spatial discretization together determine the generalized force seen by a structure.`,
    considerations: [
      'Preserve complex cross-spectral phase and surface-integration weights when mapping the field into structural loads.',
      'Fit coherence and convection parameters to the applicable flow condition and check eigenvalue or pattern-truncation sensitivity.'
    ],
    concepts: [['Cross-spectral density', 'Review auto spectra, cross spectra, coherence, and phase.'], ['Spatial load representation', 'Connect correlation length, convection, matrices, and force spatial patterns.']]
  },
  'SEA & Energy': {
    section: 'sea',
    physicalMeaning: primary => `The reported ${primary} is a band-averaged energy or modal-population quantity. SEA describes average power storage, dissipation, and exchange between appropriately defined subsystems; it does not directly predict a local deterministic response.`,
    considerations: [
      'Check modes per band, modal overlap, diffuse-field behavior, subsystem definition, and weak-coupling assumptions before relying on an SEA result.',
      'Verify reciprocity, loss-factor conventions, power balance, and sensitivity to uncertain damping and coupling inputs.'
    ],
    concepts: [['Modal density and overlap', 'Assess statistical modal population and bandwidth.'], ['SEA power balance', 'Connect subsystem energy, internal loss, coupling loss, and input power.']]
  },
  'Test & Signal': {
    section: 'signal-testing',
    physicalMeaning: primary => `The reported ${primary} describes a measurement-chain or signal-processing consequence rather than the hardware alone. Sampling, filtering, calibration, dynamic range, windowing, integration, and estimator choices can change the observed result.`,
    considerations: [
      'Confirm calibration, units, anti-alias filtering, sample rate, record length, window, overlap, and channel headroom from the actual acquisition setup.',
      'Inspect the time history as well as processed spectra so clipping, dropouts, bias, drift, leakage, and nonstationarity are not hidden.'
    ],
    concepts: [['Sampling and spectral estimation', 'Review aliasing, resolution, windows, leakage, and averaging.'], ['Measurement integrity', 'Connect calibration, noise, dynamic range, bias, and integration drift.']]
  },
  'Noise Control': {
    section: 'structural-acoustics',
    physicalMeaning: primary => `The reported ${primary} is an idealized attenuation, transmission, or insertion-loss measure. Realized noise reduction depends on the complete propagation path, including modes, terminations, leakage, flanking, flow, and structural transmission.`,
    considerations: [
      'Use matched source state, bandwidth, reference locations, and operating conditions when comparing before/after or input/output levels.',
      'Check low-frequency modes, higher-order propagation, liner or panel impedance, seals, transitions, and flanking paths before design release.'
    ],
    concepts: [['Transmission and insertion loss', 'Distinguish component transmission loss from installed-system insertion loss.'], ['Propagation paths', 'Review duct modes, attenuation, resonances, leakage, and flanking.']]
  },
  Utilities: {
    section: 'signal-testing',
    physicalMeaning: primary => `The reported ${primary} is a change of engineering representation, not a change in the underlying physical quantity. A valid conversion preserves the quantity dimension and its reference convention.`,
    considerations: [
      'Carry sufficient precision through intermediate calculations and round only at the reporting boundary.',
      'Confirm whether entered quantities are peak, RMS, peak-to-peak, spectral density, level, or linear amplitude before conversion.'
    ],
    concepts: [['Units and dimensions', 'Maintain dimensional consistency through engineering calculations.'], ['Signal conventions', 'Distinguish peak, RMS, level, and spectral-density quantities.']]
  }
};

const FALLBACK_PROFILE = {
  section: 'acoustics-db',
  physicalMeaning: primary => `The reported ${primary} is the output of the stated engineering model. It represents the idealized quantity defined by that model rather than every behavior of the installed system.`,
  considerations: [
    'Confirm units, sign conventions, reference quantities, and input provenance before using the result.',
    'Vary uncertain inputs and compare against an independent calculation, measurement, or limiting case.'
  ],
  concepts: [['Governing relationships', 'Review the equations and physical definitions behind the result.'], ['Engineering verification', 'Use unit checks, limiting cases, sensitivity studies, and independent evidence.']]
};

const asText = value => typeof value === 'string' ? value : value?.text || value?.message || String(value ?? '');
const uniqueText = values => [...new Set(values.map(asText).map(value => value.trim()).filter(Boolean))];

const resultSubject = definition => `result set from the ${definition.basis || 'stated engineering'} model`;

function confidenceClass(confidence = '') {
  const value = confidence.toLowerCase();
  if (value.includes('exact')) return 'Exact within the stated mathematical model';
  if (value.includes('standard')) return 'Standards-based relation within the stated conventions';
  if (value.includes('numerical')) return 'Numerical model requiring discretization or convergence review';
  if (value.includes('statistical')) return 'Statistical estimate requiring confirmation of the population model';
  if (value.includes('screen') || value.includes('estimate') || value.includes('model') || value.includes('relative')) return 'Screening or model-based engineering regime';
  return 'Engineering calculation within the stated model';
}

function relatedConcepts(profile, definition) {
  const href = `#/cheat-sheet?section=${encodeURIComponent(profile.section)}`;
  return [
    ...profile.concepts.map(([title, description]) => ({ title, description, href })),
    {
      title: definition.basis || 'Governing model',
      description: 'Review the governing equation, variable definitions, and stated use limitations for this calculation.',
      href: '#/references'
    }
  ];
}

/**
 * Convert a calculator's numerical payload and model metadata to the common response schema.
 * Existing plots, tables, heatmaps, and CSV exports pass through unchanged.
 *
 * @param {{id: string, definition: Object, inputs: Object, result: Object}} options
 * @returns {EngineeringResult}
 */
export function buildEngineeringResult({ id, definition, inputs, result }) {
  if (!result || typeof result !== 'object') throw new Error(`${id} returned an invalid result payload.`);

  const values = result.values || result.summary || result.metrics || [];
  if (!Array.isArray(values) || values.length === 0) throw new Error(`${id} returned no numerical result values.`);

  const profile = CATEGORY_PROFILES[definition.category] || FALLBACK_PROFILE;
  const priorInterpretation = typeof result.interpretation === 'object' ? result.interpretation : {};
  const summaryBase = typeof result.interpretation === 'string'
    ? result.interpretation
    : priorInterpretation.summary || `This calculation evaluates ${definition.basis || 'the stated engineering relationship'} for the entered conditions.`;
  const summary = summaryBase.trim().length >= 20
    ? summaryBase
    : `${summaryBase.trim()} This conclusion applies within the ${definition.basis || 'stated engineering'} model.`;
  const warnings = uniqueText([
    ...(result.assumptions?.warnings || []),
    ...(result.warnings || [])
  ]);
  const satisfied = uniqueText(result.assumptions?.satisfied || definition.assumptions || [DEFAULT_ASSUMPTION]);
  const considerations = uniqueText([
    ...(priorInterpretation.engineeringConsiderations || result.engineeringConsiderations || []),
    ...profile.considerations
  ]);
  const confidence = result.validity?.confidence || definition.confidence || 'Engineering calculation';
  const checkStatement = warnings.length
    ? `${warnings.length} result-specific ${warnings.length === 1 ? 'warning is' : 'warnings are'} active; resolve or bound ${warnings.length === 1 ? 'it' : 'them'} before relying on the result.`
    : 'No automatic result-specific warnings were triggered. The model assumptions still require confirmation against the real system.';
  const {
    summary: _summary,
    metrics: _metrics,
    values: _values,
    interpretation: _interpretation,
    warnings: _warnings,
    assumptions: _assumptions,
    validity: _validity,
    relatedConcepts: _relatedConcepts,
    engineeringConsiderations: _engineeringConsiderations,
    physicalMeaning: _physicalMeaning,
    ...supportingOutputs
  } = result;

  const engineeringResult = {
    values,
    interpretation: {
      summary,
      physicalMeaning: priorInterpretation.physicalMeaning || result.physicalMeaning || profile.physicalMeaning(resultSubject(definition), values, inputs),
      engineeringConsiderations: considerations
    },
    assumptions: { satisfied, warnings },
    validity: {
      regime: result.validity?.regime || `${confidenceClass(confidence)} — ${definition.basis || 'documented engineering relation'}.`,
      confidence: `${confidence}. ${checkStatement}`
    },
    relatedConcepts: result.relatedConcepts || relatedConcepts(profile, definition),
    ...supportingOutputs
  };

  assertEngineeringResult(engineeringResult, id);
  return engineeringResult;
}

/** @param {unknown} result @param {string} [id] @returns {asserts result is EngineeringResult} */
export function assertEngineeringResult(result, id = 'Calculator') {
  const fail = message => { throw new Error(`${id} engineering result: ${message}`); };
  if (!result || typeof result !== 'object') fail('payload must be an object.');
  if (!Array.isArray(result.values) || result.values.length === 0) fail('values must be a non-empty array.');
  if (!result.values.every(value => value && typeof value.label === 'string' && 'value' in value)) fail('each result value needs a label and value.');
  if (!result.interpretation || typeof result.interpretation.summary !== 'string' || typeof result.interpretation.physicalMeaning !== 'string') fail('interpretation is incomplete.');
  if (!Array.isArray(result.interpretation.engineeringConsiderations) || result.interpretation.engineeringConsiderations.length === 0) fail('engineering considerations are required.');
  if (!result.assumptions || !Array.isArray(result.assumptions.satisfied) || !Array.isArray(result.assumptions.warnings) || result.assumptions.satisfied.length === 0) fail('assumptions are incomplete.');
  if (!result.validity || typeof result.validity.regime !== 'string' || typeof result.validity.confidence !== 'string') fail('validity is incomplete.');
  if (!Array.isArray(result.relatedConcepts) || result.relatedConcepts.length === 0) fail('related concepts are required.');
}

/** Wrap a calculator definition so every compute call returns an EngineeringResult. */
export function createEngineeringCalculator(id, definition) {
  if (!definition || typeof definition.compute !== 'function') throw new Error(`${id} is missing a compute function.`);
  const computeNumericalResult = definition.compute.bind(definition);
  return {
    ...definition,
    compute(inputs) {
      return buildEngineeringResult({ id, definition, inputs, result: computeNumericalResult(inputs) });
    }
  };
}

/** Wrap every calculator in a registry with the common engineering response contract. */
export function createEngineeringRegistry(definitions) {
  return Object.fromEntries(
    Object.entries(definitions).map(([id, definition]) => [id, createEngineeringCalculator(id, definition)])
  );
}

/** Create a complete plain-text engineering record for clipboard or report use. */
export function engineeringResultToText(title, result, formatValue = String) {
  assertEngineeringResult(result, title);
  const lines = [title, '', 'NUMERICAL RESULTS'];
  result.values.forEach(value => lines.push(`${value.label}: ${formatValue(value.value)}${value.unit ? ` ${value.unit}` : ''}`));
  lines.push(
    '', 'ENGINEERING INTERPRETATION', result.interpretation.summary,
    '', 'PHYSICAL MEANING', result.interpretation.physicalMeaning,
    '', 'MODEL ASSUMPTIONS', ...result.assumptions.satisfied.map(item => `- ${item}`),
    '', 'VALIDITY CHECKS', `Regime: ${result.validity.regime}`, `Confidence: ${result.validity.confidence}`,
    '', 'ENGINEERING CONSIDERATIONS', ...result.interpretation.engineeringConsiderations.map(item => `- ${item}`)
  );
  if (result.assumptions.warnings.length) lines.push('', 'WARNINGS', ...result.assumptions.warnings.map(item => `- ${item}`));
  lines.push('', 'RELATED CONCEPTS', ...result.relatedConcepts.map(item => `- ${item.title}: ${item.description}`));
  return lines.join('\n');
}
