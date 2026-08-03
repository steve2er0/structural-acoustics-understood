/* Calculators for cross-cutting launch-vehicle vibroacoustic workflows. */
import { createEngineeringRegistry } from './engineering-results.js';
import {
  modelTestCorrelationState,
  branchingSeaState,
  transferPathState,
  requirementsFlowdownState,
  mitigationTradeState,
  nonlinearJointState,
  fairingCavityState,
  uncertaintySensitivityState
} from './workflow-expansion-physics.js';

const stat = (label, value, unit = '', tone = '', note = '') => ({ label, value, unit, tone, note });
const trace = (name, x, y, extra = {}) => ({ name, x, y, ...extra });
const launchChecks = specific => [
  specific,
  'Carry configuration, frequency-band, and uncertainty assumptions into the launch-vehicle verification plan.',
  'Use correlated test or flight data before converting the screening result into a qualification or acceptance limit.'
];

const workflowExpansionCalculatorDefinitions = {
  'model-test-correlation': {
    category: 'Test & Signal', basis: 'Frequency error, modal assurance criterion, and frequency-response assurance criterion', confidence: 'Synthetic paired-mode correlation screening model',
    inputs: [
      { key: 'model_frequency', label: 'Model frequency', unit: 'Hz', type: 'number', default: 420, min: 1 },
      { key: 'test_frequency', label: 'Test frequency', unit: 'Hz', type: 'number', default: 436, min: 1 },
      { key: 'model_damping', label: 'Model damping ratio', type: 'number', default: 0.018, min: 0.0001, max: 0.5 },
      { key: 'test_damping', label: 'Test damping ratio', type: 'number', default: 0.026, min: 0.0001, max: 0.5 },
      { key: 'shape_rotation', label: 'Mode-shape mixing angle', unit: 'deg', type: 'number', default: 18, min: 0, max: 90 },
      { key: 'spatial_noise', label: 'Spatial test noise', type: 'number', default: 0.08, min: 0, max: 0.8 },
      { key: 'mode_x', label: 'Mode order m', type: 'number', default: 2, min: 1, max: 8, step: 1 },
      { key: 'mode_y', label: 'Mode order n', type: 'number', default: 1, min: 1, max: 8, step: 1 }
    ],
    theory: '<p>Frequency error checks eigenvalue placement, MAC checks spatial similarity, and FRAC checks complex frequency-response similarity. Passing only one metric cannot establish that the model reproduces the same physical load path.</p>',
    assumptions: ['Model and test coordinates are paired with consistent signs and units.', 'The displayed shapes and FRFs represent one isolated mode.', 'Correlation thresholds are project decisions, not universal constants.'],
    example: 'Increase mode-shape mixing without changing frequency to see a frequency pass coexist with a spatial-correlation failure.',
    compute(v) {
      const state = modelTestCorrelationState({ modelFrequency: v.model_frequency, testFrequency: v.test_frequency, modelDamping: v.model_damping, testDamping: v.test_damping, shapeRotationDegrees: v.shape_rotation, spatialNoise: v.spatial_noise, modeX: v.mode_x, modeY: v.mode_y });
      return {
        summary: [stat('Frequency error', state.frequencyError, '%', state.frequencyPass ? 'good' : 'warn'), stat('MAC', state.mac, '', state.macPass ? 'good' : 'warn'), stat('FRAC', state.frac, '', state.fracPass ? 'good' : 'warn'), stat('Damping error', state.dampingError, '%'), stat('Disposition', state.disposition)],
        interpretation: `The paired mode is ${state.disposition}. Frequency, spatial shape, and complex response are independent evidence streams; the failed metric identifies what the model update must address.`,
        engineeringConsiderations: launchChecks('For fairings, tanks, adapters, and payload structures, correlate the actual observables used for load prediction—not only a visually similar mode shape.'),
        warnings: [!state.frequencyPass && 'The natural-frequency mismatch exceeds 5%.', !state.macPass && 'MAC is below 0.90.', !state.fracPass && 'FRAC is below 0.80.'].filter(Boolean),
        plots: [{ title: 'Model and test FRF magnitude', xLabel: 'Frequency (Hz)', yLabel: 'Relative magnitude', traces: [trace('Model', state.frequencies, state.modelMagnitude), trace('Test', state.frequencies, state.testMagnitude, { emphasis: true })] }]
      };
    }
  },

  'branching-sea-network': {
    category: 'SEA & Energy', basis: 'Reciprocal multi-input five-subsystem SEA power balance', confidence: 'Exact steady-state solution of the displayed lumped SEA network',
    inputs: [
      { key: 'frequency', label: 'Band center', unit: 'Hz', type: 'number', default: 1000, min: 20 },
      { key: 'source_power', label: 'Primary input power', unit: 'W', type: 'number', default: 1, min: 0 },
      { key: 'secondary_power', label: 'Payload-side input power', unit: 'W', type: 'number', default: 0.12, min: 0 },
      { key: 'primary_clf', label: 'Source-to-panel CLF', type: 'number', default: 0.018, min: 0 },
      { key: 'branch_clf', label: 'Panel/cavity branch CLF', type: 'number', default: 0.008, min: 0 },
      { key: 'flanking_clf', label: 'Flanking-path CLF', type: 'number', default: 0.003, min: 0 },
      { key: 'internal_loss', label: 'Baseline internal loss factor', type: 'number', default: 0.025, min: 0.0001 }
    ],
    theory: '<p>SEA solves subsystem energies from input power, internal dissipation, and reciprocal coupling. A branched network exposes parallel paths, local sources, gross exchange, and net power direction that a single source–receiver chain hides.</p>',
    assumptions: ['Each subsystem has adequate modal population and diffuse energy.', 'Coupling is linear, weak, and reciprocal.', 'Loss factors and modal densities represent the selected band.'],
    example: 'Raise the flanking CLF until the payload is controlled by the structural branch even though the panel–cavity path remains strongly active.',
    compute(v) {
      const state = branchingSeaState({ frequency: v.frequency, sourcePower: v.source_power, secondaryPower: v.secondary_power, primaryClf: v.primary_clf, branchClf: v.branch_clf, flankingClf: v.flanking_clf, internalLoss: v.internal_loss });
      return {
        summary: [stat('Payload energy', state.receiverEnergy, 'J'), stat('Source energy', state.sourceEnergy, 'J'), stat('Energy transfer', state.transferDb, 'dB'), stat('Primary-path share', 100 * state.primaryShare, '%'), stat('Flanking-path share', 100 * state.flankingShare, '%'), stat('Power balance error', 100 * state.balanceError, '%')],
        interpretation: `The ${state.dominantPath} controls the positive power arriving at the payload in this band. The other branch can still carry substantial gross exchange and should not be removed solely because its net flow is smaller.`,
        engineeringConsiderations: launchChecks('Use path shares to decide where damping, isolation, or acoustic treatment belongs; applying treatment to the loudest subsystem is not necessarily treatment of the controlling path.'),
        warnings: ['SEA confidence still requires modes-per-band, overlap, weak-coupling, and spatial-uniformity checks for every subsystem.'],
        plots: [{ title: 'Source and payload energy across frequency', xLabel: 'Frequency (Hz)', yLabel: 'Modal energy (J)', xScale: 'log', yScale: 'log', traces: [trace('Source', state.frequencies, state.sourceSweep), trace('Payload', state.frequencies, state.receiverSweep, { emphasis: true })] }],
        tables: [{ title: 'Subsystem energy and dissipation', columns: ['Subsystem', 'Energy (J)', 'Dissipated power (W)'], rows: state.names.map((name, index) => [name, state.energies[index], state.dissipations[index]]) }]
      };
    }
  },

  'transfer-path-analysis': {
    category: 'Test & Signal', basis: 'Blocked-force installation correction and complex operational transfer-path summation', confidence: 'Three-path harmonic screening model',
    inputs: [
      { key: 'coherence', label: 'Cross-path coherence', type: 'number', default: 1, min: 0, max: 1 },
      { key: 'blocked_force_1', label: 'Forward-skirt blocked force', unit: 'N', type: 'number', default: 85, min: 0 },
      { key: 'blocked_force_2', label: 'Avionics-shelf blocked force', unit: 'N', type: 'number', default: 62, min: 0 },
      { key: 'blocked_force_3', label: 'Fluid-line blocked force', unit: 'N', type: 'number', default: 44, min: 0 },
      { key: 'phase_1', label: 'Path 1 phase', unit: 'deg', type: 'number', default: 15 },
      { key: 'phase_2', label: 'Path 2 phase', unit: 'deg', type: 'number', default: 138 },
      { key: 'phase_3', label: 'Path 3 phase', unit: 'deg', type: 'number', default: -72 }
    ],
    theory: '<p>Installed force depends on the source and receiver mobility match. Each path contribution is then a complex installed force times transfer mobility; phases determine reinforcement or cancellation at the receiver.</p>',
    assumptions: ['Linear time-invariant interfaces and one-axis mobilities.', 'Blocked forces are identified independently of the receiver.', 'The coherence slider is a screening blend, not a complete cross-spectral matrix.'],
    example: 'Rotate the dominant paths toward opposite phase and compare the coherent result with the scalar sum.',
    compute(v) {
      const state = transferPathState({ coherence: v.coherence, blockedForce1: v.blocked_force_1, blockedForce2: v.blocked_force_2, blockedForce3: v.blocked_force_3, phase1: v.phase_1, phase2: v.phase_2, phase3: v.phase_3 });
      return {
        summary: [stat('Total receiver response', state.totalResponse, 'm/s'), stat('Coherent result', state.coherentMagnitude, 'm/s'), stat('Incoherent result', state.incoherentMagnitude, 'm/s'), stat('Cancellation relative to scalar sum', state.cancellationDb, 'dB'), stat('Dominant path', state.dominantPath)],
        interpretation: `${state.dominantPath} has the largest individual contribution, while the assembled receiver is ${Math.abs(state.cancellationDb) > 3 ? 'strongly phase-sensitive' : 'close to the scalar path sum'}. Rank both magnitudes and complex contributions before selecting a modification.`,
        engineeringConsiderations: launchChecks('Separate engine, line, bracket, skirt, payload-adapter, and airborne paths using consistent interface coordinates and installed impedances.'),
        warnings: ['Changing one path can remove favorable cancellation and raise the total response even when its standalone contribution decreases.'],
        tables: [{ title: 'Ranked transfer paths', columns: ['Path', 'Blocked force (N)', 'Installed force (N)', 'Contribution (m/s)', 'Phase (deg)'], rows: state.rankedPaths.map(path => [path.name, path.blockedForce, path.installedForce, path.magnitude, path.phase]) }]
      };
    }
  },

  'requirements-flowdown': {
    category: 'Test & Signal', basis: 'Statistical and qualification margins, fatigue-equivalent duration, and response-limited notching', confidence: 'Transparent qualification-level screening budget',
    inputs: [
      { key: 'flight_psd', label: 'Flight PSD', unit: 'g²/Hz', type: 'number', default: 0.04, min: 0 },
      { key: 'flight_duration', label: 'Flight duration', unit: 's', type: 'number', default: 120, min: 0.001 },
      { key: 'test_duration', label: 'Test duration', unit: 's', type: 'number', default: 60, min: 0.001 },
      { key: 'fatigue_exponent', label: 'Fatigue exponent', type: 'number', default: 6, min: 0.1 },
      { key: 'statistical_margin', label: 'Statistical margin', unit: 'dB', type: 'number', default: 3 },
      { key: 'qualification_margin', label: 'Qualification margin', unit: 'dB', type: 'number', default: 3 },
      { key: 'predicted_response', label: 'Predicted flight response', unit: 'g RMS', type: 'number', default: 18, min: 0 },
      { key: 'response_limit', label: 'Allowable test response', unit: 'g RMS', type: 'number', default: 22, min: 0.001 }
    ],
    theory: '<p>Environment statistics, model uncertainty, test philosophy, duration equivalence, and hardware response limits are different pieces of a requirements budget. Response limiting modifies the drive only where interface evidence shows laboratory overtest.</p>',
    assumptions: ['PSD level scaling represents the selected controlling band.', 'A single fatigue exponent approximates damage equivalence.', 'Response scales with the square root of input PSD.'],
    example: 'Increase qualification margin until the response limit forces a notch, then inspect how much total margin remains above flight.',
    compute(v) {
      const state = requirementsFlowdownState({ flightPsd: v.flight_psd, flightDuration: v.flight_duration, testDuration: v.test_duration, fatigueExponent: v.fatigue_exponent, statisticalMarginDb: v.statistical_margin, qualificationMarginDb: v.qualification_margin, predictedResponse: v.predicted_response, responseLimit: v.response_limit });
      return {
        summary: [stat('Statistical design PSD', state.designPsd, 'g²/Hz'), stat('Unnotched test PSD', state.unnotchedTestPsd, 'g²/Hz'), stat('Notched test PSD', state.notchedTestPsd, 'g²/Hz'), stat('Unnotched response', state.unnotchedResponse, 'g RMS'), stat('Notch depth', -10 * Math.log10(state.notchFactor), 'dB'), stat('Retained margin above flight', state.retainedMarginDb, 'dB')],
        interpretation: state.notchRequired ? `The unnotched test would exceed the response limit, so a ${(-10 * Math.log10(state.notchFactor)).toFixed(1)} dB response-limited notch is indicated. The notched level retains ${state.retainedMarginDb.toFixed(1)} dB above the flight PSD.` : 'No response-limit notch is required for the current margin and duration budget.',
        engineeringConsiderations: launchChecks('Maintain traceability from flight data and uncertainty statistics through component input, control strategy, interface force, and response limits.'),
        warnings: [state.notchRequired ? 'A notch requires load-path evidence and approval; it is not justified solely by a high accelerometer reading.' : 'Confirm workmanship and minimum-test-level rules even when analytical response does not require a notch.'],
        tables: [{ title: 'Requirement flow-down', columns: ['Stage', 'PSD (g²/Hz)'], rows: state.labels.map((label, index) => [label, state.levels[index]]) }]
      };
    }
  },

  'mitigation-trade': {
    category: 'Noise Control', basis: 'Mechanism-based damping, tuned absorber, isolation, absorption, and mass-barrier screening models', confidence: 'Comparative early-design trade study',
    inputs: [
      { key: 'frequency', label: 'Problem frequency', unit: 'Hz', type: 'number', default: 420, min: 1 },
      { key: 'baseline_response', label: 'Baseline response', unit: 'g', type: 'number', default: 24, min: 0.0001 },
      { key: 'required_reduction', label: 'Required reduction', unit: 'dB', type: 'number', default: 8, min: 0 },
      { key: 'base_loss', label: 'Baseline loss factor', type: 'number', default: 0.02, min: 0.0001 },
      { key: 'added_loss', label: 'Added treatment loss factor', type: 'number', default: 0.06, min: 0 },
      { key: 'tmd_mass_ratio', label: 'TMD mass ratio', type: 'number', default: 0.04, min: 0 },
      { key: 'isolation_frequency', label: 'Isolation natural frequency', unit: 'Hz', type: 'number', default: 120, min: 0.1 },
      { key: 'absorption_ratio', label: 'Added absorption-area ratio', type: 'number', default: 2, min: 0 },
      { key: 'barrier_mass_ratio', label: 'Barrier surface-mass ratio', type: 'number', default: 1.5, min: 1 }
    ],
    theory: '<p>Mitigations act on different terms in the energy path. Damping changes resonant loss, a TMD redistributes a narrow resonance, isolation changes transmitted force above crossover, absorption changes cavity decay, and a barrier changes impedance.</p>',
    assumptions: ['Each option is evaluated independently at one representative frequency.', 'Mass fractions are screening estimates.', 'Installation details do not degrade the ideal mechanism.'],
    example: 'Move frequency toward the isolator resonance and see an otherwise attractive isolation option lose benefit.',
    compute(v) {
      const state = mitigationTradeState({ frequency: v.frequency, baselineResponse: v.baseline_response, requiredReductionDb: v.required_reduction, baseLossFactor: v.base_loss, addedLossFactor: v.added_loss, tmdMassRatio: v.tmd_mass_ratio, isolationFrequency: v.isolation_frequency, absorptionRatio: v.absorption_ratio, barrierMassRatio: v.barrier_mass_ratio });
      return {
        summary: [stat('Recommended screening option', state.recommended.name), stat('Recommended reduction', state.recommended.reductionDb, 'dB'), stat('Recommended mass fraction', state.recommended.massFraction), stat('Predicted response', state.recommended.predictedResponse, 'g'), stat('Options meeting target', state.targetCount)],
        interpretation: `${state.recommended.name} gives the best reduction-per-added-mass score in this narrow screening comparison. It should advance only if its mechanism intersects the path controlling the actual launch-vehicle response.`,
        engineeringConsiderations: launchChecks('Trade treatment mass, volume, thermal behavior, static load capacity, launch clearance, contamination, manufacturability, and verification access together with dB reduction.'),
        warnings: ['Do not combine the tabulated reductions by arithmetic addition without a coupled model; one treatment can change the path seen by another.'],
        tables: [{ title: 'Mitigation trade space', columns: ['Option', 'Reduction (dB)', 'Added mass fraction', 'Predicted response', 'Target met', 'Primary caveat'], rows: state.ranked.map(option => [option.name, option.reductionDb, option.massFraction, option.predictedResponse, option.targetMet ? 'Yes' : 'No', option.caveat]) }]
      };
    }
  },

  'nonlinear-joint': {
    category: 'Dynamics', basis: 'Equivalent Duffing stiffness and Coulomb-friction energy loss', confidence: 'Amplitude-dependent single-joint screening model',
    inputs: [
      { key: 'mass', label: 'Effective modal mass', unit: 'kg', type: 'number', default: 18, min: 0.001 },
      { key: 'linear_frequency', label: 'Small-signal frequency', unit: 'Hz', type: 'number', default: 180, min: 0.1 },
      { key: 'amplitude', label: 'Response amplitude', unit: 'mm', type: 'number', default: 0.7, min: 0.001 },
      { key: 'cubic_ratio', label: 'Cubic stiffness ratio', type: 'number', default: 0.45, min: -0.9, max: 3 },
      { key: 'friction_force', label: 'Friction force', unit: 'N', type: 'number', default: 16, min: 0 },
      { key: 'gap', label: 'Contact gap', unit: 'mm', type: 'number', default: 1.2, min: 0.001 },
      { key: 'preload', label: 'Joint preload', unit: 'N', type: 'number', default: 2200, min: 0.001 },
      { key: 'friction_coefficient', label: 'Friction coefficient', type: 'number', default: 0.25, min: 0 }
    ],
    theory: '<p>Nonlinear joints can shift resonance with amplitude, dissipate energy through microslip, and introduce contact or hard-stop regimes. A low-level modal test therefore need not predict qualification-level frequency or damping.</p>',
    assumptions: ['One effective coordinate represents the jointed mode.', 'Friction is idealized as amplitude-independent Coulomb force.', 'The cubic stiffness and gap are phenomenological parameters.'],
    example: 'Sweep amplitude through the slip and gap thresholds to see why fixed modal properties can fail at qualification level.',
    compute(v) {
      const state = nonlinearJointState({ mass: v.mass, linearFrequency: v.linear_frequency, amplitudeMm: v.amplitude, cubicRatio: v.cubic_ratio, frictionForce: v.friction_force, gapMm: v.gap, preload: v.preload, frictionCoefficient: v.friction_coefficient });
      return {
        summary: [stat('Effective frequency', state.effectiveFrequency, 'Hz'), stat('Frequency shift', state.frequencyShift, '%'), stat('Equivalent damping ratio', state.equivalentDamping), stat('Dynamic joint force', state.dynamicForce, 'N'), stat('Slip threshold', state.slipThreshold, 'N'), stat('Regime', state.regime)],
        interpretation: `The selected amplitude is in the ${state.regime}. A ${state.frequencyShift.toFixed(1)}% backbone shift and amplitude-dependent friction loss mean linear properties from another excitation level may not transfer.`,
        engineeringConsiderations: launchChecks('Bolted rings, separation joints, brackets, inserts, cable supports, and hard stops should be characterized at representative preload and response amplitude.'),
        warnings: [state.contactActive && 'The gap is closed; contact impact and higher harmonics are outside the equivalent-linear model.', state.slipActive && 'The dynamic force exceeds the friction threshold; preload and wear can change the response between tests.'].filter(Boolean),
        plots: [{ title: 'Amplitude-dependent joint properties', xLabel: 'Amplitude (mm)', yLabel: 'Frequency (Hz)', traces: [trace('Backbone frequency', state.amplitudesMm, state.backbone, { emphasis: true })] }]
      };
    }
  },

  'fairing-cavity': {
    category: 'Structural Acoustics', basis: 'Rectangularized cavity modes, Sabine decay, modal density, overlap, and panel detuning', confidence: 'Low-to-mid-frequency fairing-cavity screening model',
    inputs: [
      { key: 'length', label: 'Cavity length', unit: 'm', type: 'number', default: 8, min: 0.1 },
      { key: 'radius', label: 'Fairing radius', unit: 'm', type: 'number', default: 2.2, min: 0.05 },
      { key: 'frequency', label: 'Excitation frequency', unit: 'Hz', type: 'number', default: 315, min: 1 },
      { key: 't60', label: 'Reverberation time', unit: 's', type: 'number', default: 2.4, min: 0.02 },
      { key: 'source_x', label: 'Source axial position x/L', type: 'number', default: 0.18, min: 0, max: 1 },
      { key: 'receiver_x', label: 'Payload axial position x/L', type: 'number', default: 0.72, min: 0, max: 1 },
      { key: 'panel_frequency', label: 'Nearby panel frequency', unit: 'Hz', type: 'number', default: 330, min: 1 }
    ],
    theory: '<p>Below the diffuse-field transition, cavity modes create spatial hot and cold spots and couple selectively to payload and fairing shapes. Modal density, overlap, decay, and structural detuning determine when statistical descriptions become credible.</p>',
    assumptions: ['The fairing cavity is rectangularized with rigid acoustic boundaries.', 'One reverberation time represents distributed absorption.', 'Mean flow, leakage, curvature, payload blockage, and trim geometry are omitted.'],
    example: 'Move the payload from a pressure antinode toward a node while holding the source level fixed.',
    compute(v) {
      const state = fairingCavityState({ length: v.length, radius: v.radius, frequency: v.frequency, t60: v.t60, sourceX: v.source_x, receiverX: v.receiver_x, panelFrequency: v.panel_frequency });
      return {
        summary: [stat('Nearest cavity mode', `${state.nearest.id} at ${state.nearest.frequency.toFixed(1)} Hz`), stat('Modes per third octave', state.modesPerBand), stat('Modal overlap', state.modalOverlap), stat('Schroeder frequency', state.schroederFrequency, 'Hz'), stat('Equivalent absorption area', state.absorptionArea, 'm²'), stat('Panel-to-cavity detuning', state.panelDetuning, '%'), stat('Regime', state.regime)],
        interpretation: `At ${state.frequency.toFixed(0)} Hz the enclosure is in the ${state.regime}. The nearest ${state.nearest.id} mode is shaped differently at the source and payload, so spatial placement can matter as much as the band-average level.`,
        engineeringConsiderations: launchChecks('Include payload blockage, blankets, vents, purge state, fairing structural modes, and source spatial coherence before setting installed acoustic attenuation.'),
        warnings: ['A diffuse-field reverberation or SEA model is unreliable when band modal population and overlap are low.'],
        plots: [{ title: 'Cavity response at payload location', xLabel: 'Frequency (Hz)', yLabel: 'Relative pressure', traces: [trace('Modal response', state.frequencies, state.response, { emphasis: true })] }],
        tables: [{ title: 'Nearest cavity modes', columns: ['Mode', 'Frequency (Hz)', 'Source shape', 'Payload shape', 'Participation'], rows: [...state.modes].sort((a, b) => Math.abs(a.frequency - state.frequency) - Math.abs(b.frequency - state.frequency)).slice(0, 8).map(mode => [mode.id, mode.frequency, mode.sourceShape, mode.receiverShape, mode.participation]) }]
      };
    }
  },

  'uncertainty-sensitivity': {
    category: 'Test & Signal', basis: 'Reproducible lognormal Monte Carlo around a Miles-response screening model', confidence: 'Parametric uncertainty and first-order sensitivity study',
    inputs: [
      { key: 'frequency_mean', label: 'Mean natural frequency', unit: 'Hz', type: 'number', default: 180, min: 1 },
      { key: 'q_mean', label: 'Mean Q', type: 'number', default: 12, min: 0.1 },
      { key: 'psd_mean', label: 'Mean input PSD', unit: 'g²/Hz', type: 'number', default: 0.03, min: 0.000000001 },
      { key: 'frequency_cov', label: 'Frequency coefficient of variation', type: 'number', default: 0.04, min: 0 },
      { key: 'q_cov', label: 'Q coefficient of variation', type: 'number', default: 0.25, min: 0 },
      { key: 'psd_cov', label: 'PSD coefficient of variation', type: 'number', default: 0.2, min: 0 },
      { key: 'trials', label: 'Monte Carlo trials', type: 'number', default: 1600, min: 50, max: 10000, step: 50 },
      { key: 'seed', label: 'Reproducible seed', type: 'number', default: 519, step: 1 }
    ],
    theory: '<p>A nominal response is not a confidence bound. Monte Carlo propagates distributions for environment, frequency, and damping; sensitivity shares identify which evidence or design variable most effectively narrows the response distribution.</p>',
    assumptions: ['Frequency, Q, and PSD are independent lognormal variables.', 'Miles-equation assumptions hold for each sample.', 'Input coefficients of variation represent epistemic and aleatory uncertainty consistently.'],
    example: 'Double Q uncertainty and see the upper response tail widen even when the nominal result is unchanged.',
    compute(v) {
      const state = uncertaintySensitivityState({ frequencyMean: v.frequency_mean, qMean: v.q_mean, psdMean: v.psd_mean, frequencyCov: v.frequency_cov, qCov: v.q_cov, psdCov: v.psd_cov, trials: v.trials, seed: v.seed });
      return {
        summary: [stat('Mean response', state.mean, 'g RMS'), stat('P05 response', state.p05, 'g RMS'), stat('Median response', state.p50, 'g RMS'), stat('P95 response', state.p95, 'g RMS'), stat('P99 response', state.p99, 'g RMS'), stat('Response coefficient of variation', state.coefficientOfVariation), stat('Dominant uncertainty', state.sensitivities[0].name)],
        interpretation: `The P95/P50 ratio is ${(state.p95 / state.p50).toFixed(2)} and ${state.sensitivities[0].name.toLowerCase()} is the largest first-order uncertainty contributor. Reduce that input uncertainty before adding undifferentiated margin everywhere.`,
        engineeringConsiderations: launchChecks('Keep environment scatter, model-form bias, hardware variability, and test uncertainty separate so program margins remain traceable and nonduplicative.'),
        warnings: ['Correlation between uncertain inputs and model-form discrepancy can materially change the upper tail.'],
        tables: [{ title: 'First-order sensitivity shares', columns: ['Input', 'Variance share', 'Elasticity'], rows: state.sensitivities.map(item => [item.name, item.share, item.elasticity]) }],
        csv: { filename: 'uncertainty-response-samples.csv', columns: ['sample', 'response_g_rms'], rows: state.samples.map((value, index) => [index + 1, value]) }
      };
    }
  }
};

export const workflowExpansionCalculatorRegistry = createEngineeringRegistry(workflowExpansionCalculatorDefinitions);
