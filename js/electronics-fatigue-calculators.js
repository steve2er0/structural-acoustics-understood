/* Electronics vibration-fatigue calculators using the shared EngineeringResult contract. */
import { createEngineeringRegistry } from './engineering-results.js';
import {
  STEINBERG_COMPONENTS,
  STEINBERG_REFERENCE_CYCLES,
  componentPlacementState,
  parseComponentTable,
  parseDamageLedger,
  parsePsdSpectrum,
  pcbDesignTradeState,
  pcbModeCurvatureState,
  pcbRandomResponseState,
  pcbTestCorrelationState,
  pcbTestLayoutState,
  spectralFatigueComparisonState,
  synthesizedRainflowState,
  steinbergDamageLedgerState,
  steinbergDisplacementState
} from './electronics-fatigue-physics.js';

const stat = (label, value, unit = '', tone = '', note = '') => ({ label, value, unit, tone, note });
const trace = (name, x, y, extra = {}) => ({ name, x, y, ...extra });
const checks = primary => [
  primary,
  'Preserve response statistic, location, board axis, component package basis, event duration, and source provenance with the result.',
  'Use this handbook relation for screening and trade studies; close qualification with correlated strain, displacement, modal, and failure evidence.'
];
const packageOptions = [
  ...Object.entries(STEINBERG_COMPONENTS).map(([value, item]) => ({ value, label: `${item.label} · C=${item.coefficient}` })),
  { value: 'custom', label: 'Custom documented coefficient' }
];
const packageCoefficient = values => values.package === 'custom' ? Number(values.custom_coefficient) : STEINBERG_COMPONENTS[values.package]?.coefficient ?? 1;

const definitions = {
  'steinberg-displacement': {
    category: 'Random & Shock',
    basis: 'Steinberg 20-million-cycle printed-wiring-board relative-displacement screen',
    confidence: 'Handbook screening relation with explicit package, location, axis, statistic, and safety-factor basis',
    inputs: [
      { key: 'board_span', label: 'Board span parallel to component', unit: 'mm', type: 'number', default: 180, min: 1 },
      { key: 'board_thickness', label: 'Board thickness', unit: 'mm', type: 'number', default: 1.6, min: 0.05 },
      { key: 'component_length', label: 'Component length parallel to board span', unit: 'mm', type: 'number', default: 25, min: 0.1 },
      { key: 'package', label: 'Component package family', type: 'select', default: 'bga', options: packageOptions },
      { key: 'custom_coefficient', label: 'Custom package coefficient C', type: 'number', default: 1.75, min: 0.01, help: 'Used only when the custom package option is selected.' },
      { key: 'x_fraction', label: 'Component x / board span', type: 'number', default: 0.5, min: 0.001, max: 0.999 },
      { key: 'y_fraction', label: 'Component y / board span', type: 'number', default: 0.5, min: 0.001, max: 0.999 },
      { key: 'response', label: 'Relative displacement at stated response basis', unit: 'mm', type: 'number', default: 0.25, min: 0.000001 },
      { key: 'response_basis', label: 'Entered response location', type: 'select', default: 'center', options: [{ value: 'center', label: 'Board-center 3σ response' }, { value: 'local', label: 'Local component 3σ response' }] },
      { key: 'safety_factor', label: 'Applied response safety factor', type: 'number', default: 1, min: 0.01 }
    ],
    theory: '<p>The classic displacement criterion limits board motion near a component so solder-joint and lead strain remain below a handbook fatigue screen. In inch units, Z<sub>allow</sub>=0.00022B/(Chr√L); this calculator evaluates the identical relation in millimetres. B and L are parallel, h is board thickness, C represents package construction, and r=sin(πx)sin(πy) maps board-center motion to the component location.</p>',
    assumptions: ['The board response is dominated by a simply supported-like first bending shape.', 'The input and allowable are both 3σ relative displacement on the same center or local basis.', 'The package coefficient is applicable to the actual attachment technology and component geometry.', 'Twenty million stress reversals is the handbook reference, not a universal mission-life proof.'],
    example: 'Move a BGA away from board center, then compare the local response and center-referenced allowable without applying the location factor twice.',
    compute(values) {
      const coefficient = packageCoefficient(values);
      const state = steinbergDisplacementState({ boardSpanMm: values.board_span, boardThicknessMm: values.board_thickness, componentLengthMm: values.component_length, componentCoefficient: coefficient, xFraction: values.x_fraction, yFraction: values.y_fraction, response3SigmaMm: values.response, responseBasis: values.response_basis, safetyFactor: values.safety_factor });
      return {
        visuals: [{ kind: 'pcb-motion', title: 'Where board motion becomes attachment demand', state, boardSpanMm: Number(values.board_span), boardThicknessMm: Number(values.board_thickness), componentLengthMm: Number(values.component_length), xFraction: Number(values.x_fraction), yFraction: Number(values.y_fraction), packageLabel: values.package === 'custom' ? 'Custom package basis' : STEINBERG_COMPONENTS[values.package]?.label }],
        presentation: { primaryEvidence: { type: 'visual', index: 0 }, primaryValueCount: 5 },
        summary: [
          stat('Local allowable 3σ displacement', state.localAllowableMm, 'mm'),
          stat('Center-referenced allowable 3σ displacement', state.allowableCenterMm, 'mm'),
          stat('Local component response', state.responseLocalMm, 'mm'),
          stat('Location factor r', state.locationFactor),
          stat('Demand / allowable', state.ratio, '', state.passes ? 'good' : 'warn'),
          stat('Margin of safety', state.marginOfSafety, '', state.passes ? 'good' : 'warn'),
          stat('Screening disposition', state.passes ? 'PASS' : 'REVIEW', '', state.passes ? 'good' : 'warn')
        ],
        interpretation: `The component sees ${state.responseLocalMm.toPrecision(4)} mm at its location versus ${state.localAllowableMm.toPrecision(4)} mm allowable. The response uses ${(100 * state.locationFactor).toFixed(1)}% of the board-center first-mode amplitude and consumes ${(100 * state.ratio).toFixed(1)}% of the displacement screen.`,
        engineeringConsiderations: checks('Use measured or finite-element relative board motion at the component location; a base accelerometer or fixture-control spectrum is not the required response quantity.'),
        warnings: [
          state.locationFactor < 0.08 ? 'The component is very near an ideal modal node. Real support compliance, higher modes, and local deformation can dominate the near-zero first-mode prediction.' : 'The sine location factor represents one ideal first mode; inspect higher modes and actual boundary stiffness.',
          values.package === 'custom' ? 'The custom package coefficient must be supported by a controlled source or correlation dataset.' : 'Package labels are broad handbook families; confirm that the selected coefficient matches the actual package and lead/termination construction.'
        ],
        tables: [{ title: 'Basis ledger', columns: ['Quantity', 'Applied basis'], rows: [['Response statistic', '3σ relative displacement'], ['Response location', values.response_basis === 'center' ? 'Board center mapped once to component' : 'Local component response'], ['Board direction', 'Span and component length are parallel'], ['Package coefficient C', coefficient], ['Reference endurance', `${STEINBERG_REFERENCE_CYCLES.toLocaleString()} stress reversals`]] }]
      };
    }
  },

  'pcb-random-response': {
    category: 'Random & Shock',
    basis: 'Numerical base-excited SDOF PSD integration with Miles narrowband comparison',
    confidence: 'Auditable linear response chain from input PSD to board acceleration and relative displacement',
    inputs: [
      { key: 'spectrum', label: 'Base acceleration PSD · frequency_Hz, g²/Hz', type: 'textarea', default: '20, 0.01\n80, 0.04\n350, 0.04\n1000, 0.008\n2000, 0.008' },
      { key: 'natural_frequency', label: 'PCB mode natural frequency', unit: 'Hz', type: 'number', default: 320, min: 0.1 },
      { key: 'quality_factor', label: 'Modal quality factor Q', type: 'number', default: 10, min: 0.2 },
      { key: 'duration', label: 'Stationary exposure duration', unit: 's', type: 'number', default: 60, min: 0.001 }
    ],
    theory: '<p>The input PSD is multiplied by the absolute-acceleration and relative-displacement transfer functions of a base-excited oscillator, then integrated over frequency. Miles is shown only as a local-flat-PSD, isolated-mode check. Relative board motion—not input GRMS—is the quantity handed to the Steinberg displacement screen.</p>',
    assumptions: ['One linear mode dominates the response.', 'PSD breakpoints are connected by log-log interpolation and represent a stationary Gaussian process.', 'The mode has constant viscous damping and the entered Q applies at response level.', 'No fixture, multi-axis, notching, nonlinear contact, or component-to-board local mode is included.'],
    example: 'Move the PCB mode from the 0.04 g²/Hz plateau onto the descending segment and compare numerical integration with the Miles shortcut.',
    compute(values) {
      const spectrum = parsePsdSpectrum(values.spectrum);
      const state = pcbRandomResponseState({ spectrum, naturalFrequencyHz: values.natural_frequency, qualityFactor: values.quality_factor, durationSeconds: values.duration });
      const milesDifference = state.relativeRmsMm > 0 ? 100 * (state.milesRelativeRmsMm / state.relativeRmsMm - 1) : 0;
      return {
        visuals: [{ kind: 'response-chain', title: 'Which frequencies create PCB relative displacement?', state, naturalFrequencyHz: Number(values.natural_frequency), qualityFactor: Number(values.quality_factor) }],
        presentation: { primaryEvidence: { type: 'visual', index: 0 }, primaryValueCount: 5 },
        summary: [
          stat('Input acceleration', state.inputGrms, 'g RMS'),
          stat('PCB absolute acceleration', state.responseGrms, 'g RMS'),
          stat('Relative displacement RMS', state.relativeRmsMm, 'mm'),
          stat('Relative displacement 3σ', state.relative3SigmaMm, 'mm'),
          stat('Miles relative displacement 3σ', state.milesRelative3SigmaMm, 'mm'),
          stat('Miles difference', milesDifference, '%'),
          stat('Expected-duration peak factor', state.expectedPeakFactor, 'σ')
        ],
        interpretation: `The entered base environment integrates to ${state.inputGrms.toFixed(2)} GRMS. The ${Number(values.natural_frequency).toFixed(0)} Hz, Q=${Number(values.quality_factor).toFixed(1)} board mode produces ${state.relative3SigmaMm.toPrecision(4)} mm at 3σ; a duration-aware Gaussian peak screen is ${state.expectedPeakMm.toPrecision(4)} mm.`,
        engineeringConsiderations: checks('Hand the numerical 3σ relative displacement to the Steinberg screen, and preserve the response mode, Q, input spectrum, frequency grid, and duration.'),
        warnings: [
          state.resonanceInsideBand ? 'The resonance lies inside the input PSD band; response is sensitive to local PSD shape, damping, and frequency tolerance.' : 'The resonance lies outside the entered PSD band, so constant endpoint extrapolation is not a qualification prediction.',
          Math.abs(milesDifference) > 20 ? 'Miles differs materially from numerical integration because the local-flat, isolated, lightly damped assumptions are weak for this spectrum.' : 'Miles agrees reasonably with numerical integration for this case, but remains a narrowband approximation.'
        ],
        plots: [
          { title: 'Input and PCB acceleration PSD', xLabel: 'Frequency (Hz)', yLabel: 'Acceleration PSD (g²/Hz)', xScale: 'log', yScale: 'log', traces: [trace('Base input', state.frequencies, state.inputPsd), trace('PCB response', state.frequencies, state.accelerationPsd, { emphasis: true })] },
          { title: 'Relative-displacement response PSD', xLabel: 'Frequency (Hz)', yLabel: 'Displacement PSD (mm²/Hz)', xScale: 'log', yScale: 'log', traces: [trace('Relative displacement', state.frequencies, state.relativeDisplacementPsdMm2, { emphasis: true })] }
        ]
      };
    }
  },

  'pcb-component-placement': {
    category: 'Random & Shock',
    basis: 'Steinberg component-by-component location, package, axis, and relative-displacement screen',
    confidence: 'Traceable board map with no center/local response double counting',
    inputs: [
      { key: 'span_x', label: 'Supported board span X', unit: 'mm', type: 'number', default: 180, min: 1 },
      { key: 'span_y', label: 'Supported board span Y', unit: 'mm', type: 'number', default: 120, min: 1 },
      { key: 'thickness', label: 'Board thickness', unit: 'mm', type: 'number', default: 1.6, min: 0.05 },
      { key: 'center_response', label: 'Board-center relative displacement 3σ', unit: 'mm', type: 'number', default: 0.3, min: 0.000001 },
      { key: 'mode_x', label: 'Mode half-waves along X', type: 'number', default: 1, min: 1, max: 6 },
      { key: 'mode_y', label: 'Mode half-waves along Y', type: 'number', default: 1, min: 1, max: 6 },
      { key: 'components', label: 'Components · name, x, y, length_mm, axis, package', type: 'textarea', default: 'U1, 0.50, 0.50, 28, x, bga\nJ1, 0.18, 0.55, 42, y, ceramic\nC17, 0.76, 0.25, 12, x, axial\nU9, 0.82, 0.78, 18, y, lccc' }
    ],
    theory: '<p>Each row maps the board-center first-mode displacement to the component with r=sin(πx)sin(πy), then compares local response with a local allowable. The board span and component length must be parallel; the location factor is applied exactly once.</p>',
    assumptions: ['x and y are normalized supported-span coordinates from 0 to 1.', 'Each component axis is X or Y and selects the corresponding board span.', 'One ideal half-sine mode represents the board response field.', 'Package coefficients are broad Steinberg handbook families.'],
    example: 'Move the BGA from board center toward a support, then compare it with a smaller but more severe leadless ceramic carrier.',
    compute(values) {
      const components = parseComponentTable(values.components);
      const state = componentPlacementState({ boardSpanXMm: values.span_x, boardSpanYMm: values.span_y, boardThicknessMm: values.thickness, center3SigmaMm: values.center_response, components });
      const modeState = pcbModeCurvatureState({ boardSpanXMm: values.span_x, boardSpanYMm: values.span_y, boardThicknessMm: values.thickness, modeX: values.mode_x, modeY: values.mode_y, peakDisplacementMm: values.center_response, components });
      const controlling = state.controlling;
      return {
        visuals: [
          { kind: 'component-risk-map', title: 'Component risk on the PCB response field', state, spanXMm: Number(values.span_x), spanYMm: Number(values.span_y), modeX: Number(values.mode_x), modeY: Number(values.mode_y) },
          { kind: 'mode-curvature', title: 'Where the selected mode creates curvature and surface strain', state: modeState, field: 'surface-strain' }
        ],
        presentation: { primaryEvidence: { type: 'visual', index: 0 }, primaryEvidenceStack: [{ type: 'visual', index: 0 }, { type: 'visual', index: 1 }], primaryValueCount: 5 },
        summary: [stat('Components screened', state.totalCount), stat('Components passing', state.passCount, '', state.passCount === state.totalCount ? 'good' : 'warn'), stat('Controlling component', controlling?.name ?? 'None'), stat('Controlling demand / allowable', controlling?.ratio ?? 0, '', controlling?.passes ? 'good' : 'warn'), stat('Controlling local response', controlling?.localResponseMm ?? 0, 'mm'), stat('Controlling local allowable', controlling?.localAllowableMm ?? 0, 'mm')],
        interpretation: controlling ? `${controlling.name} controls at ${(100 * controlling.ratio).toFixed(1)}% of its local screen. Its package coefficient, ${controlling.axis.toUpperCase()}-axis span, component length, and board location act together; distance from board center alone does not rank risk.` : 'No component rows were entered.',
        engineeringConsiderations: checks('Use the map to prioritize component-specific strain instrumentation, local FE refinement, support changes, package relocation, or underfill/lead design review.'),
        warnings: [state.passCount < state.totalCount ? `${state.totalCount - state.passCount} component(s) exceed the screening relation.` : 'Every entered component passes the screen; close the result with actual package geometry and local response evidence.', 'Higher modes can move antinodes and reverse the first-mode placement ranking.'],
        plots: [{ title: 'Component local response versus local allowable', xLabel: 'Ranked component', yLabel: 'Relative displacement 3σ (mm)', traces: [trace('Local response', state.rows.map((_, index) => index + 1), state.rows.map(row => row.localResponseMm), { emphasis: true }), trace('Local allowable', state.rows.map((_, index) => index + 1), state.rows.map(row => row.localAllowableMm))] }],
        tables: [{ title: 'Component risk map', columns: ['Component', 'Package', 'Axis', 'r', 'Local response (mm)', 'Local allowable (mm)', 'Demand / allowable', 'Margin'], rows: state.rows.map(row => [row.name, row.packageLabel, row.axis.toUpperCase(), row.locationFactor, row.localResponseMm, row.localAllowableMm, row.ratio, row.marginOfSafety]) }]
      };
    }
  },

  'electronics-fatigue-methods': {
    category: 'Random & Shock',
    basis: 'Steinberg three-band cycle approximation versus narrowband Rayleigh stress-amplitude integration',
    confidence: 'Transparent method-comparison screen using the same power-law S–N curve',
    inputs: [
      { key: 'stress_rms', label: 'Alternating stress RMS', unit: 'MPa', type: 'number', default: 10, min: 0.000001 },
      { key: 'reference_stress', label: 'S–N reference alternating stress', unit: 'MPa', type: 'number', default: 40, min: 0.000001 },
      { key: 'reference_cycles', label: 'S–N reference cycles', type: 'number', default: 20000000, min: 1 },
      { key: 'fatigue_exponent', label: 'S–N fatigue exponent b', type: 'number', default: 6.4, min: 0.1 },
      { key: 'cycle_rate', label: 'Cycle / positive-peak rate', unit: 'Hz', type: 'number', default: 300, min: 0.000001 },
      { key: 'duration', label: 'Event duration', unit: 's', type: 'number', default: 60, min: 0.000001 },
      { key: 'repeats', label: 'Mission / test repeats', type: 'number', default: 4, min: 0.000001 },
      { key: 'fractional_bandwidth', label: 'Synthesized response fractional bandwidth', type: 'number', default: 0.2, min: 0.02, max: 1.2 },
      { key: 'synthesis_seed', label: 'Deterministic synthesis seed', type: 'number', default: 537, min: 1 }
    ],
    theory: '<p>The three-band approximation assigns 68.3%, 27.1%, and 4.33% of cycles to 1σ, 2σ, and 3σ stress. The narrowband model integrates a Rayleigh peak-amplitude distribution analytically. Both use N=Nref(Sref/S)<sup>b</sup> and Miner summation, making the consequence of method and S–N slope visible.</p>',
    assumptions: ['Stress is narrowband, stationary, Gaussian, and zero mean.', 'The cycle/peak rate and S–N curve apply to the same stress definition.', 'Miner damage is linear and sequence independent.', 'Mean stress, multiaxiality, solder creep, thermal cycling, and non-Gaussian peaks are omitted.'],
    example: 'Increase stress RMS by 3 dB and watch damage rise by 2^(b/2), then change b to see why modest response uncertainty dominates life.',
    compute(values) {
      const state = spectralFatigueComparisonState({ stressRms: values.stress_rms, referenceStress: values.reference_stress, referenceCycles: values.reference_cycles, fatigueExponent: values.fatigue_exponent, cycleRateHz: values.cycle_rate, durationSeconds: values.duration, repeats: values.repeats });
      const rainflowState = synthesizedRainflowState({ stressRms: values.stress_rms, dominantFrequencyHz: values.cycle_rate, fractionalBandwidth: values.fractional_bandwidth, durationSeconds: values.duration, repeats: values.repeats, referenceStress: values.reference_stress, referenceCycles: values.reference_cycles, fatigueExponent: values.fatigue_exponent, seed: values.synthesis_seed });
      return {
        visuals: [
          { kind: 'fatigue-damage', title: 'Probability density versus fatigue contribution', state, stressRms: Number(values.stress_rms), referenceStress: Number(values.reference_stress), referenceCycles: Number(values.reference_cycles) },
          { kind: 'time-rainflow', title: 'Synthesized response through rainflow and the same S–N basis', state: rainflowState }
        ],
        presentation: { primaryEvidence: { type: 'visual', index: 0 }, primaryEvidenceStack: [{ type: 'visual', index: 0 }, { type: 'visual', index: 1 }], primaryValueCount: 5 },
        summary: [stat('Exposure cycles', state.cycles), stat('Three-band Miner damage', state.threeBandDamage, '', state.threeBandDamage <= 1 ? 'good' : 'warn'), stat('Rayleigh narrowband damage', state.rayleighDamage, '', state.rayleighDamage <= 1 ? 'good' : 'warn'), stat('Rayleigh / three-band ratio', state.rayleighToThreeBandRatio), stat('+3 dB damage multiplier', state.plus3DbDamageFactor, '×')],
        interpretation: `For b=${state.fatigueExponent.toFixed(2)}, the Rayleigh integration predicts ${state.rayleighToThreeBandRatio.toFixed(2)}× the three-band damage. A +3 dB stress-PSD change multiplies damage by ${state.plus3DbDamageFactor.toFixed(1)} even before duration changes.`,
        engineeringConsiderations: checks('Use method comparison to expose approximation sensitivity; use spectral moments with a validated Dirlik or time-domain rainflow workflow when the response is broadband or non-Gaussian.'),
        warnings: ['The three-band fractions sum to 99.73% and truncate the Gaussian tail beyond 3σ.', 'Do not use displacement as stress without a validated component or board curvature-to-stress transfer relation.'],
        tables: [{ title: 'Steinberg three-band damage ledger', columns: ['Level', 'Cycle fraction', 'Stress amplitude (MPa)', 'Cycles', 'Cycles to failure', 'Damage'], rows: state.bands.map(band => [`${band.level}σ`, band.fraction, band.amplitude, band.cyclesAtLevel, band.cyclesToFailure, band.damage]) }]
      };
    }
  },

  'electronics-fatigue-ledger': {
    category: 'Random & Shock',
    basis: 'Event-by-event displacement-life power law and Palmgren–Miner accumulation',
    confidence: 'Mission ledger screen with explicit reference response, exponent, cycle rate, duration, and repeats',
    inputs: [
      { key: 'allowable', label: 'Reference allowable 3σ displacement', unit: 'mm', type: 'number', default: 0.3, min: 0.000001 },
      { key: 'reference_cycles', label: 'Reference stress reversals', type: 'number', default: 20000000, min: 1 },
      { key: 'fatigue_exponent', label: 'Response-life exponent b', type: 'number', default: 6.4, min: 0.1 },
      { key: 'events', label: 'Events · name, response_3sigma_mm, duration_s, repeats, cycle_rate_hz', type: 'textarea', default: 'Acceptance random, 0.22, 60, 1, 320\nQualification random, 0.31, 120, 1, 320\nLaunch flight, 0.18, 480, 4, 280\nGround transport, 0.08, 7200, 8, 35' }
    ],
    theory: '<p>Each event is converted to cycles and assigned life N=Nref(Zallow/Z)<sup>b</sup>. Miner fractions are added across test, handling, transport, and flight. This extends the 20-million-cycle displacement screen into a sensitivity ledger; it does not create a solder-joint S–N curve from first principles.</p>',
    assumptions: ['The response-life exponent is documented and applicable to the same failure mechanism.', 'Event cycle rate, response statistic, and repetition count are consistent.', 'Damage accumulates linearly with no load-sequence, dwell, temperature, or aging interaction.', 'The allowable response is a valid reference point for the hardware family.'],
    example: 'Reduce the qualification response a few percent or remove an unnecessary repeat and compare its damage leverage with a long low-level transport exposure.',
    compute(values) {
      const events = parseDamageLedger(values.events);
      const state = steinbergDamageLedgerState({ allowable3SigmaMm: values.allowable, referenceCycles: values.reference_cycles, fatigueExponent: values.fatigue_exponent, events });
      return {
        visuals: [{ kind: 'mission-damage', title: 'Who consumes the mission fatigue budget?', state, allowableMm: Number(values.allowable) }],
        presentation: { primaryEvidence: { type: 'visual', index: 0 }, primaryValueCount: 5 },
        summary: [stat('Total Miner damage', state.totalDamage, '', state.passes ? 'good' : 'warn'), stat('Life margin', state.lifeMargin, '', state.passes ? 'good' : 'warn'), stat('Controlling event', state.controlling?.name ?? 'None'), stat('Controlling damage share', state.controlling ? state.controlling.damage / Math.max(state.totalDamage, Number.EPSILON) * 100 : 0, '%'), stat('Ledger disposition', state.passes ? 'SCREEN PASSES' : 'REVIEW REQUIRED', '', state.passes ? 'good' : 'warn')],
        interpretation: state.controlling ? `${state.controlling.name} contributes ${(100 * state.controlling.damage / Math.max(state.totalDamage, Number.EPSILON)).toFixed(1)}% of the total displacement-life index. Level, duration, repeats, and cycle rate remain separate so test exposure is not hidden inside a single envelope.` : 'No mission events were entered.',
        engineeringConsiderations: checks('Use the ledger to negotiate test duration, qualification margin, re-test exposure, handling, transport, and flight allocation without losing event ownership.'),
        warnings: [state.passes ? 'The ledger is below unity for this response-life model; uncertainty and omitted thermal/creep mechanisms can still control.' : 'The accumulated damage index exceeds unity for the entered model.', 'A displacement-life exponent is an assumed correlation model unless supported by component-specific strain/failure data.'],
        plots: [{ title: 'Cumulative event damage', xLabel: 'Event order', yLabel: 'Miner damage', traces: [trace('Cumulative damage', state.rows.map((_, index) => index + 1), state.rows.map((_, index) => state.rows.slice(0, index + 1).reduce((sum, row) => sum + row.damage, 0)), { emphasis: true }), trace('Unity', state.rows.map((_, index) => index + 1), state.rows.map(() => 1))] }],
        tables: [{ title: 'Mission and test fatigue ledger', columns: ['Event', '3σ response (mm)', 'Duration (s)', 'Repeats', 'Cycle rate (Hz)', 'Cycles', 'Demand ratio', 'Damage'], rows: state.rows.map(row => [row.name, row.response3SigmaMm, row.durationSeconds, row.repeats, row.cycleRateHz, row.cycles, row.demandRatio, row.damage]) }]
      };
    }
  },

  'pcb-design-trade': {
    category: 'Random & Shock',
    basis: 'First-mode thin-plate scaling combined with Steinberg displacement margin',
    confidence: 'Transparent trend model for thickness and effective support span—not a detailed PCB modal solution',
    inputs: [
      { key: 'reference_span', label: 'Reference supported span', unit: 'mm', type: 'number', default: 180, min: 1 },
      { key: 'effective_span', label: 'Candidate effective supported span', unit: 'mm', type: 'number', default: 180, min: 1 },
      { key: 'reference_thickness', label: 'Reference board thickness', unit: 'mm', type: 'number', default: 1.6, min: 0.05 },
      { key: 'candidate_thickness', label: 'Candidate board thickness', unit: 'mm', type: 'number', default: 2.0, min: 0.05 },
      { key: 'reference_frequency', label: 'Measured / modeled reference mode', unit: 'Hz', type: 'number', default: 300, min: 0.1 },
      { key: 'reference_response', label: 'Reference center response 3σ', unit: 'mm', type: 'number', default: 0.3, min: 0.000001 },
      { key: 'psd_slope', label: 'Local PSD power-law slope', type: 'number', default: 0, min: -8, max: 8, help: 'Sa scales as (f/fref)^slope near the moving mode.' },
      { key: 'component_length', label: 'Component length parallel to span', unit: 'mm', type: 'number', default: 25, min: 0.1 },
      { key: 'package', label: 'Component package family', type: 'select', default: 'bga', options: packageOptions },
      { key: 'custom_coefficient', label: 'Custom package coefficient C', type: 'number', default: 1.75, min: 0.01 },
      { key: 'location_factor', label: 'First-mode location factor r', type: 'number', default: 1, min: 0.001, max: 1 }
    ],
    theory: '<p>For a uniform thin isotropic plate with unchanged material and planform, first-mode frequency scales approximately as h/B². For locally flat input PSD and fixed Q, Miles relative displacement scales as √(fSa)/f². The Steinberg allowable scales as B/h, so thickness changes both response and allowable—the response side usually improves faster.</p>',
    assumptions: ['The same first mode, mass distribution, damping, boundary family, and component remain controlling.', 'Added support is represented by an explicitly entered effective span.', 'Local PSD follows the entered power-law slope as the resonance moves.', 'Component mass, board orthotropy, cutouts, connectors, fastener compliance, and higher modes are omitted.'],
    example: 'Compare a thicker board with a center support that halves effective span; then change PSD slope to see whether the moved mode lands in a harsher band.',
    compute(values) {
      const coefficient = packageCoefficient(values);
      const state = pcbDesignTradeState({ referenceSpanMm: values.reference_span, effectiveSpanMm: values.effective_span, referenceThicknessMm: values.reference_thickness, thicknessMm: values.candidate_thickness, referenceNaturalFrequencyHz: values.reference_frequency, referenceCenter3SigmaMm: values.reference_response, localPsdSlope: values.psd_slope, componentLengthMm: values.component_length, componentCoefficient: coefficient, locationFactor: values.location_factor });
      return {
        visuals: [{ kind: 'design-space', title: 'Thickness and support-span design space', state, referenceSpanMm: Number(values.reference_span), referenceThicknessMm: Number(values.reference_thickness) }],
        presentation: { primaryEvidence: { type: 'visual', index: 0 }, primaryValueCount: 5 },
        summary: [stat('Candidate natural frequency', state.naturalFrequencyHz, 'Hz'), stat('Candidate center response 3σ', state.center3SigmaMm, 'mm'), stat('Candidate center allowable 3σ', state.allowableCenterMm, 'mm'), stat('Demand / allowable', state.demandRatio, '', state.demandRatio <= 1 ? 'good' : 'warn'), stat('Margin of safety', state.marginOfSafety, '', state.marginOfSafety >= 0 ? 'good' : 'warn')],
        interpretation: `The candidate moves the reference mode to ${state.naturalFrequencyHz.toFixed(1)} Hz and changes the center 3σ response to ${state.center3SigmaMm.toPrecision(4)} mm. The allowable also changes to ${state.allowableCenterMm.toPrecision(4)} mm; comparing response alone would miss that two-sided trade.`,
        engineeringConsiderations: checks('Use the trend to select thickness/support candidates, then recompute modes and response with actual laminate, mass loading, mounting stiffness, and PSD shape.'),
        warnings: ['A center support changes mode shapes and component location factors; an effective-span scalar cannot establish local response.', 'If the mode crosses a PSD breakpoint, replace the local power-law slope with full numerical spectrum integration.'],
        plots: [{ title: 'Thickness changes response and allowable together', xLabel: 'Board thickness (mm)', yLabel: 'Center 3σ displacement (mm)', traces: [trace('Predicted response', state.curve.map(point => point.thicknessMm), state.curve.map(point => point.center3SigmaMm), { emphasis: true }), trace('Steinberg allowable', state.curve.map(point => point.thicknessMm), state.curve.map(point => point.allowableCenterMm))] }, { title: 'Thickness and first-mode frequency', xLabel: 'Board thickness (mm)', yLabel: 'Natural frequency (Hz)', traces: [trace('First-mode scaling', state.curve.map(point => point.thicknessMm), state.curve.map(point => point.naturalFrequencyHz), { emphasis: true })] }]
      };
    }
  },

  'pcb-test-correlation': {
    category: 'Random & Shock',
    basis: 'Predicted-versus-measured first-mode frequency, damping, relative-response, and fatigue-leverage correlation screen',
    confidence: 'Correlation decision aid with explicit frequency and response tolerances',
    inputs: [
      { key: 'predicted_frequency', label: 'Predicted PCB mode frequency', unit: 'Hz', type: 'number', default: 320, min: 0.1 },
      { key: 'measured_frequency', label: 'Measured PCB mode frequency', unit: 'Hz', type: 'number', default: 295, min: 0.1 },
      { key: 'predicted_q', label: 'Predicted modal Q', type: 'number', default: 10, min: 0.2 },
      { key: 'measured_q', label: 'Measured modal Q', type: 'number', default: 7, min: 0.2 },
      { key: 'predicted_response', label: 'Predicted peak relative response 3σ', unit: 'mm', type: 'number', default: 0.24, min: 0.000001 },
      { key: 'measured_response', label: 'Measured peak relative response 3σ', unit: 'mm', type: 'number', default: 0.29, min: 0.000001 },
      { key: 'fatigue_exponent', label: 'Response-life exponent b', type: 'number', default: 6.4, min: 0.1 },
      { key: 'frequency_tolerance', label: 'Allowed mode-frequency difference', unit: '%', type: 'number', default: 10, min: 0 },
      { key: 'response_tolerance', label: 'Allowed peak-response difference', unit: 'dB', type: 'number', default: 3, min: 0 },
      { key: 'selected_channel', label: 'Highlighted correlation channel', type: 'select', default: 'SG-1', options: [
        { value: 'CTRL-1', label: 'CTRL-1 · Fixture control accelerometer' },
        { value: 'RESP-1', label: 'RESP-1 · PCB center response accelerometer' },
        { value: 'RESP-2', label: 'RESP-2 · PCB mode-shape response accelerometer' },
        { value: 'SG-1', label: 'SG-1 · Package-adjacent strain rosette' },
        { value: 'DISP-1', label: 'DISP-1 · Relative-displacement probe' },
        { value: 'E-1', label: 'E-1 · Electrical continuity monitor' }
      ] }
    ],
    theory: '<p>Correlation is evaluated on the response shape as well as the peak. Predicted and measured first-mode curves use their respective frequency, Q, and peak relative displacement; the measured-to-predicted ratio is shown across frequency. Peak-response mismatch is then raised to the entered fatigue exponent to expose its potential life leverage.</p>',
    assumptions: ['One corresponding PCB mode is correctly paired between prediction and test.', 'The displayed SDOF shapes are a correlation aid, not a replacement for measured FRFs or PSD ordinates.', 'Predicted and measured responses use the same location, direction, bandwidth, statistic, and units.', 'The response-life exponent is applicable to the failure mechanism being screened.'],
    example: 'Shift the measured mode below prediction and reduce Q, then decide whether the lower frequency, wider response, and higher peak require a model update.',
    compute(values) {
      const state = pcbTestCorrelationState({ predictedNaturalFrequencyHz: values.predicted_frequency, measuredNaturalFrequencyHz: values.measured_frequency, predictedQualityFactor: values.predicted_q, measuredQualityFactor: values.measured_q, predictedPeakResponseMm: values.predicted_response, measuredPeakResponseMm: values.measured_response, fatigueExponent: values.fatigue_exponent, frequencyTolerancePercent: values.frequency_tolerance, responseToleranceDb: values.response_tolerance });
      const layoutState = pcbTestLayoutState({ correlationState: state, selectedChannel: values.selected_channel });
      return {
        visuals: [
          { kind: 'test-correlation', title: 'Predicted versus measured PCB response shape', state },
          { kind: 'test-layout', title: 'Instrumentation that closes the model-to-failure chain', state: layoutState }
        ],
        presentation: { primaryEvidence: { type: 'visual', index: 0 }, primaryEvidenceStack: [{ type: 'visual', index: 0 }, { type: 'visual', index: 1 }], primaryValueCount: 6 },
        summary: [stat('Mode-frequency error', state.frequencyErrorPercent, '%', state.frequencyPass ? 'good' : 'warn'), stat('Peak response difference', state.peakResponseDifferenceDb, 'dB', state.responsePass ? 'good' : 'warn'), stat('Measured / predicted response', state.peakResponseRatio), stat('Fatigue damage leverage', state.damageRatio, '×', state.damageRatio <= 1 ? 'good' : 'warn'), stat('Measured mode Q', state.measuredQualityFactor), stat('Correlation disposition', state.passes ? 'CORRELATED' : 'UPDATE MODEL', '', state.passes ? 'good' : 'warn')],
        interpretation: `The measured mode is ${state.frequencyErrorPercent.toFixed(1)}% from prediction and its peak response is ${state.peakResponseDifferenceDb.toFixed(2)} dB relative to prediction. With b=${Number(values.fatigue_exponent).toFixed(2)}, that peak difference implies ${state.damageRatio.toFixed(2)}× fatigue-damage leverage before any duration change.`,
        engineeringConsiderations: checks('Compare measured and predicted response at matched PCB locations and directions, then update boundary stiffness, damping, mass loading, and local forcing before applying empirical correction factors.'),
        warnings: [state.frequencyPass ? 'The paired modal frequencies are within the entered tolerance; confirm mode shapes and sensor orientation before declaring correlation.' : 'The mode-frequency difference exceeds the entered tolerance and suggests a stiffness, mass, boundary, or mode-pairing discrepancy.', state.responsePass ? 'Peak response is within the entered dB tolerance, but curve width and off-resonance shape still need review.' : 'Peak response falls outside the entered dB tolerance and materially changes the fatigue screen.'],
        plots: [{ title: 'Predicted and measured response curves', xLabel: 'Frequency (Hz)', yLabel: 'Relative response 3σ (mm)', xScale: 'log', yScale: 'log', traces: [trace('Predicted', state.frequencies, state.predictedResponse), trace('Measured', state.frequencies, state.measuredResponse, { emphasis: true })] }]
      };
    }
  }
};

export const electronicsFatigueCalculatorRegistry = createEngineeringRegistry(definitions);
