/* Calculators for program-level launch-vehicle vibroacoustic decisions. */
import { createEngineeringRegistry } from './engineering-results.js';
import {
  nonstationaryEnvironmentState, mimoTestState, acousticTreatmentState, sourceIdentificationState,
  hybridMethodState, vibroacousticFatigueState, missionTimelineState, credibilityState, capstoneState,
  noiseControlPathState, psychoacousticState, noiseMetricsState, acousticMeasurementState,
  canonicalSourceState, sourceGeometryState, fanDuctState, outdoorPropagationState,
  barrierDiffractionState, roomFieldState, enclosureDesignState, absorberResonatorState,
  tunedAbsorberIsolationState
} from './program-expansion-physics.js';

const stat = (label, value, unit = '', tone = '', note = '') => ({ label, value, unit, tone, note });
const trace = (name, x, y, extra = {}) => ({ name, x, y, ...extra });
const programChecks = specific => [specific, 'Carry the parent mission event, configuration, uncertainty basis, and verification evidence with the result.', 'Use this screening result to choose the next analysis or test—not as automatic flight or qualification acceptance.'];

const definitions = {
  'nonstationary-environment': {
    category: 'Random & Shock', basis: 'Time-varying local PSD, Miles response, peak opportunities, kurtosis, and fatigue exposure', confidence: 'Deterministic envelope-based screening comparison',
    inputs: [
      { key: 'duration', label: 'Record duration', unit: 's', type: 'number', default: 12, min: 0.1 },
      { key: 'event_center', label: 'Burst center', unit: 's', type: 'number', default: 4.2, min: 0 },
      { key: 'event_width', label: 'Burst width', unit: 's', type: 'number', default: 0.75, min: 0.02 },
      { key: 'background_psd', label: 'Background PSD', unit: 'g²/Hz', type: 'number', default: 0.008, min: 0 },
      { key: 'burst_psd', label: 'Burst PSD increment', unit: 'g²/Hz', type: 'number', default: 0.07, min: 0 },
      { key: 'natural_frequency', label: 'Oscillator frequency', unit: 'Hz', type: 'number', default: 180, min: 1 },
      { key: 'q', label: 'Quality factor Q', type: 'number', default: 10, min: 0.2 },
      { key: 'kurtosis', label: 'Response kurtosis', type: 'number', default: 5, min: 1 },
      { key: 'fatigue_exponent', label: 'Fatigue exponent', type: 'number', default: 6, min: 0.5 }
    ],
    theory: '<p>A stationary PSD averages away event timing. A local spectrum or envelope preserves when energy arrives; kurtosis captures heavy-tailed peaks; fatigue damage weights high-response intervals nonlinearly.</p>',
    assumptions: ['The event follows a Gaussian temporal envelope.', 'Miles response is valid locally around one resonance.', 'The kurtosis peak correction and power-law damage index are screening relations.'],
    example: 'Narrow the burst while keeping its level high: average PSD falls modestly while peak response and damage remain event-controlled.',
    compute(v) {
      const s = nonstationaryEnvironmentState({ duration: v.duration, eventCenter: v.event_center, eventWidth: v.event_width, backgroundPsd: v.background_psd, burstPsd: v.burst_psd, naturalFrequency: v.natural_frequency, q: v.q, kurtosis: v.kurtosis, fatigueExponent: v.fatigue_exponent });
      return { summary: [stat('Mean PSD', s.meanPsd, 'g²/Hz'), stat('Stationary RMS estimate', s.stationaryRms, 'g'), stat('Burst peak estimate', s.burstPeak, 'g'), stat('Peak ratio', s.peakRatio), stat('Damage ratio', s.damageRatio), stat('Regime', s.regime)], interpretation: `The time-averaged PSD predicts ${s.stationaryRms.toFixed(2)} g RMS, but the localized event produces a ${s.peakRatio.toFixed(2)}× peak and ${s.damageRatio.toFixed(2)}× damage index relative to the stationary surrogate.`, engineeringConsiderations: programChecks('Use event-resolved spectra or time histories when liftoff bursts, staging, impacts, or control transitions violate stationarity.'), warnings: [s.kurtosis > 4.5 ? 'Heavy-tailed response makes a Gaussian crest-factor assumption nonconservative.' : 'Confirm stationarity with spectrograms and window-to-window statistics.'], plots: [{ title: 'Event-resolved response', xLabel: 'Time (s)', yLabel: 'Local RMS response (g)', traces: [trace('Local RMS', s.times, s.localRms, { emphasis: true }), trace('Stationary equivalent', s.times, s.times.map(() => s.stationaryRms))] }, { title: 'Cumulative fatigue index', xLabel: 'Time (s)', yLabel: 'Relative damage index', traces: [trace('Accumulated damage', s.times, s.cumulativeDamage, { emphasis: true })] }] };
    }
  },
  'mimo-test-control': {
    category: 'Test & Signal', basis: 'Two-input/two-response complex spectral matrix through a coupled fixture mode', confidence: 'Linear 2×2 MIMO screening model',
    inputs: [
      { key: 'frequency', label: 'Control frequency', unit: 'Hz', type: 'number', default: 180, min: 1 },
      { key: 'fixture_frequency', label: 'Fixture mode', unit: 'Hz', type: 'number', default: 220, min: 1 },
      { key: 'fixture_damping', label: 'Fixture damping ratio', type: 'number', default: 0.04, min: 0.001, max: 0.5 },
      { key: 'axis1_psd', label: 'Axis 1 drive PSD', unit: 'g²/Hz', type: 'number', default: 0.04, min: 0 },
      { key: 'axis2_psd', label: 'Axis 2 drive PSD', unit: 'g²/Hz', type: 'number', default: 0.025, min: 0 },
      { key: 'input_correlation', label: 'Input correlation', type: 'number', default: 0.35, min: -0.99, max: 0.99 },
      { key: 'cross_coupling', label: 'Cross-axis coupling', type: 'number', default: 0.22, min: 0, max: 2 },
      { key: 'cross_phase', label: 'Cross-axis phase', unit: 'deg', type: 'number', default: 65, min: -180, max: 180 }
    ],
    theory: '<p>MIMO control propagates an input cross-spectral matrix through a complex transfer-function matrix. Fixture modes and off-diagonal terms determine cross-axis response, coherence, and controller conditioning.</p>',
    assumptions: ['Two linear translational axes represent the test.', 'The fixture is dominated by one mode.', 'Drive PSD correlation is frequency-local and real-valued.'],
    example: 'Move the control band onto the fixture mode and increase cross coupling to see independent-axis control become ill conditioned.',
    compute(v) {
      const s = mimoTestState({ frequency: v.frequency, fixtureFrequency: v.fixture_frequency, fixtureDamping: v.fixture_damping, axis1Psd: v.axis1_psd, axis2Psd: v.axis2_psd, inputCorrelation: v.input_correlation, crossCoupling: v.cross_coupling, crossPhaseDegrees: v.cross_phase });
      return { summary: [stat('Axis 1 response PSD', s.responsePsd1, 'g²/Hz'), stat('Axis 2 response PSD', s.responsePsd2, 'g²/Hz'), stat('Response coherence', s.responseCoherence), stat('Cross-axis response ratio', s.crossAxisRatio), stat('Condition indicator', s.conditionIndicator), stat('Control assessment', s.controlRisk)], interpretation: `The coupled fixture produces coherence ${s.responseCoherence.toFixed(2)} and a cross-axis response ratio of ${s.crossAxisRatio.toFixed(2)}. The resulting ${s.controlRisk} cannot be assessed from independent scalar spectra alone.`, engineeringConsiderations: programChecks('Use measured complex matrix FRFs, control/limit channel cross-spectra, and actual fixture boundary conditions for multi-axis qualification.'), warnings: [s.conditionIndicator > 50 ? 'The response matrix is poorly conditioned; regularization, fixture redesign, or control-band changes may be required.' : 'Check uncontrolled axes, moments, and interface forces even when both controlled axes meet tolerance.'], plots: [{ title: 'Coupled fixture response spectra', xLabel: 'Frequency (Hz)', yLabel: 'Response PSD (g²/Hz)', traces: [trace('Axis 1', s.frequencies, s.axis1Sweep, { emphasis: true }), trace('Axis 2', s.frequencies, s.axis2Sweep)] }] };
    }
  },
  'acoustic-treatment': {
    category: 'Noise Control', basis: 'Delany–Bazley porous impedance with coverage, air-gap depth, and limp-mass screening', confidence: 'Normal-incidence material and installed-area screening model',
    inputs: [
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 500, min: 20 },
      { key: 'blanket_basis', label: 'Treatment evidence basis', type: 'select', default: 'porous-model', options: [{ value: 'porous-model', label: 'Porous impedance model' }, { value: 'empirical-blanket', label: 'Empirical blanket absorption' }, { value: 'measured-il', label: 'Representative measured blanket IL' }] },
      { key: 'flow_resistivity', label: 'Flow resistivity', unit: 'Pa·s/m²', type: 'number', default: 18000, min: 100 },
      { key: 'thickness', label: 'Absorber thickness', unit: 'mm', type: 'number', default: 50, min: 1 },
      { key: 'air_gap', label: 'Backing air gap', unit: 'mm', type: 'number', default: 25, min: 0 },
      { key: 'coverage', label: 'Treated area fraction', type: 'number', default: 0.7, min: 0, max: 1 },
      { key: 'blanket_mass', label: 'Blanket surface mass', unit: 'kg/m²', type: 'number', default: 1.8, min: 0 },
      { key: 'baseline_absorption', label: 'Untreated absorption', type: 'number', default: 0.08, min: 0.001, max: 0.99 }
    ],
    theory: '<p>Porous absorption follows complex characteristic impedance and propagation constant; thickness and backing depth set the low-frequency limit. A limp blanket also adds mass impedance, while incomplete coverage leaves untreated parallel area.</p>',
    assumptions: ['Normal incidence and empirical Delany–Bazley behavior.', 'The air gap is represented through an effective depth correction.', 'Seams, compression, curvature, venting, and flanking are omitted.'],
    example: 'Hold mass fixed and increase absorber depth to move useful absorption into a lower payload-fairing band.',
    compute(v) {
      const s = acousticTreatmentState({ frequency: v.frequency, blanketBasis: v.blanket_basis, flowResistivity: v.flow_resistivity, thicknessMm: v.thickness, airGapMm: v.air_gap, coverage: v.coverage, blanketMass: v.blanket_mass, baselineAbsorption: v.baseline_absorption });
      return { summary: [stat('Selected blanket absorption', s.selectedAbsorption), stat('Installed-area absorption', s.installedAbsorption), stat('Decay reduction', s.decayReductionDb, 'dB'), stat('Limp-mass TL screen', s.massLawTl, 'dB'), stat('Representative measured blanket IL', s.measuredBlanketIl, 'dB'), stat('Coverage-corrected measured IL', s.measuredCoverageIl, 'dB'), stat('Selected insertion-loss result', s.insertionLoss, 'dB'), stat('Empirical absorption peak', s.empiricalPeakFrequency, 'Hz'), stat('Depth quarter-wave frequency', s.quarterWaveFrequency, 'Hz'), stat('Regime', s.regime)], interpretation: `At ${s.frequency.toFixed(0)} Hz, the selected ${s.blanketBasis.replaceAll('-', ' ')} basis gives ${(100 * s.selectedAbsorption).toFixed(0)}% blanket absorption and ${s.insertionLoss.toFixed(1)} dB selected IL after the applicable coverage treatment.`, engineeringConsiderations: programChecks('Fairing blankets and liners must retain acoustic impedance after compression, seams, purge flow, temperature, contamination, and flight installation.'), warnings: [s.blanketBasis === 'measured-il' ? 'The representative IL curve is an example from the SEA parameter reference; replace it with the actual blanket, mounting, compression, purge, and temperature test.' : s.frequency < 0.45 * s.quarterWaveFrequency ? 'The treatment is shallow relative to wavelength; low-frequency benefit is thickness limited.' : 'Validate diffuse-incidence absorption and installed insertion loss in a representative cavity.'], plots: [{ title: 'Selected absorption versus frequency', xLabel: 'Frequency (Hz)', yLabel: 'Absorption coefficient', xScale: 'log', traces: [trace('Selected material model', s.frequencies, s.selectedAbsorptionCurve, { emphasis: true }), trace('Installed-area average', s.frequencies, s.installedCurve)] }, { title: 'Representative measured blanket insertion loss', xLabel: 'Frequency (Hz)', yLabel: 'Insertion loss (dB)', xScale: 'log', traces: [trace('Reference blanket IL', s.frequencies, s.measuredIlCurve, { emphasis: true })] }] };
    }
  },
  'source-identification-array': {
    category: 'Test & Signal', basis: 'Conventional delay-and-sum beamforming for a uniform linear array', confidence: 'Far-field two-source array-resolution demonstration',
    inputs: [
      { key: 'frequency', label: 'Analysis frequency', unit: 'Hz', type: 'number', default: 1200, min: 10 },
      { key: 'microphones', label: 'Microphone count', type: 'number', default: 12, min: 3, max: 64, step: 1 },
      { key: 'spacing', label: 'Microphone spacing', unit: 'mm', type: 'number', default: 90, min: 1 },
      { key: 'source_angle', label: 'Primary-source angle', unit: 'deg', type: 'number', default: -18, min: -85, max: 85 },
      { key: 'secondary_angle', label: 'Secondary-source angle', unit: 'deg', type: 'number', default: 32, min: -85, max: 85 },
      { key: 'secondary_level', label: 'Secondary relative level', unit: 'dB', type: 'number', default: -7 },
      { key: 'noise_floor', label: 'Channel noise floor', unit: 'dB', type: 'number', default: -24 }
    ],
    theory: '<p>Beamforming steers measured phase delays across an array. Aperture controls angular resolution; spacing above half wavelength creates grating lobes; source coherence and near-field range complicate interpretation.</p>',
    assumptions: ['Far-field plane waves in quiescent air.', 'Uniform line array with phase-matched microphones.', 'Conventional delay-and-sum processing.'],
    example: 'Raise frequency until spacing exceeds λ/2 and watch a plausible but false grating lobe compete with the true source.',
    compute(v) {
      const s = sourceIdentificationState({ frequency: v.frequency, microphoneCount: v.microphones, spacingMm: v.spacing, sourceAngle: v.source_angle, secondaryAngle: v.secondary_angle, secondaryLevelDb: v.secondary_level, noiseFloorDb: v.noise_floor });
      return { summary: [stat('Identified dominant angle', s.identifiedAngle, 'deg'), stat('Angle error', s.angleError, 'deg'), stat('Wavelength', s.wavelength, 'm'), stat('Array aperture', s.aperture, 'm'), stat('Approximate resolution', s.resolutionDegrees, 'deg'), stat('Spatial aliasing', s.spatialAlias ? 'Active' : 'Avoided'), stat('Diagnosis', s.diagnosis)], interpretation: `The array identifies ${s.identifiedAngle.toFixed(1)}° versus the ${s.sourceAngle.toFixed(1)}° source. Its ${s.resolutionDegrees.toFixed(1)}° aperture limit and ${s.spatialAlias ? 'active spatial aliasing' : 'sub-half-wavelength spacing'} determine whether that peak is unique.`, engineeringConsiderations: programChecks('Use beamforming or holography to locate plume, vent, panel, line, and equipment sources before applying a path treatment.'), warnings: [s.spatialAlias ? 'Microphone spacing exceeds λ/2; grating lobes can masquerade as real sources.' : 'Array output is a spatial filter, not direct proof of radiated sound power.'], plots: [{ title: 'Beamformer spatial spectrum', xLabel: 'Steering angle (deg)', yLabel: 'Relative level (dB)', traces: [trace('Array output', s.steeringAngles, s.beamDb, { emphasis: true })] }] };
    }
  },
  'hybrid-method-selection': {
    category: 'Structural Acoustics', basis: 'Structural/acoustic wavelength, modal population, overlap, and FE-size method gate', confidence: 'Frequency-dependent model-architecture screening tool',
    inputs: [
      { key: 'frequency', label: 'Decision frequency', unit: 'Hz', type: 'number', default: 800, min: 20 },
      { key: 'panel_length', label: 'Panel length', unit: 'm', type: 'number', default: 2.4, min: 0.1 },
      { key: 'panel_width', label: 'Panel width', unit: 'm', type: 'number', default: 1.5, min: 0.1 },
      { key: 'thickness', label: 'Panel thickness', unit: 'mm', type: 'number', default: 3, min: 0.1 },
      { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.001 },
      { key: 'density', label: 'Panel density', unit: 'kg/m³', type: 'number', default: 2700, min: 1 },
      { key: 'loss_factor', label: 'Loss factor', type: 'number', default: 0.025, min: 0.0001 },
      { key: 'cavity_volume', label: 'Cavity volume', unit: 'm³', type: 'number', default: 18, min: 0.01 },
      { key: 'uncertainty', label: 'Frequency uncertainty', unit: '%', type: 'number', default: 5, min: 0 }
    ],
    theory: '<p>Method choice is band- and subsystem-specific. Deterministic models need wavelength resolution; statistical models need population, overlap, and diffuse fields; hybrid models exchange power across the transition.</p>',
    assumptions: ['Uniform isotropic panel and rectangularized cavity statistics.', 'Ten structural elements per bending wavelength.', 'One-third-octave population gates are heuristic.'],
    example: 'Sweep upward in frequency and watch the panel and cavity cross statistical thresholds at different bands.',
    compute(v) {
      const s = hybridMethodState({ frequency: v.frequency, panelLength: v.panel_length, panelWidth: v.panel_width, thicknessMm: v.thickness, modulusGpa: v.modulus, density: v.density, lossFactor: v.loss_factor, cavityVolume: v.cavity_volume, uncertaintyPercent: v.uncertainty });
      return { summary: [stat('Recommended architecture', s.method), stat('Structural modes / third octave', s.structuralModesPerThird), stat('Acoustic modes / third octave', s.acousticModesPerThird), stat('Modal overlap', s.overlap), stat('Estimated structural FE elements', s.feElements), stat('Bending wavelength', s.bendingWavelength, 'm'), stat('Acoustic wavelength', s.acousticWavelength, 'm')], interpretation: `At ${s.frequency.toFixed(0)} Hz the ${s.method} is the most credible screening architecture. The panel contains ${s.structuralModesPerThird.toFixed(1)} and the cavity ${s.acousticModesPerThird.toFixed(1)} modes per third octave, so their deterministic-to-statistical transitions do not occur together.`, engineeringConsiderations: programChecks('Define explicit handoff variables—mobility, impedance, modal energy, blocked force, or power—and validate them in the overlap band.'), warnings: [s.method.includes('SEA') ? 'Statistical population does not by itself prove diffuse fields or weak coupling.' : 'Bracket resonance frequency and damping uncertainty before trusting narrowband deterministic peaks.'], plots: [{ title: 'Population across the method ladder', xLabel: 'Frequency (Hz)', yLabel: 'Modes / third octave', xScale: 'log', yScale: 'log', traces: [trace('Structural', s.frequencies, s.structuralModes, { emphasis: true }), trace('Acoustic', s.frequencies, s.acousticModes)] }] };
    }
  },
  'vibroacoustic-fatigue': {
    category: 'Random & Shock', basis: 'Spectral cycle rate, narrowband stress-range moments, bandwidth, kurtosis, and Miner accumulation', confidence: 'Frequency-domain fatigue screening model',
    inputs: [
      { key: 'stress_rms', label: 'Stress RMS', unit: 'MPa', type: 'number', default: 12, min: 0.000001 },
      { key: 'crossing_rate', label: 'Zero-crossing rate', unit: 'Hz', type: 'number', default: 180, min: 0.001 },
      { key: 'duration', label: 'Event duration', unit: 's', type: 'number', default: 120, min: 0.001 },
      { key: 'fatigue_exponent', label: 'S–N exponent', type: 'number', default: 6, min: 0.5 },
      { key: 'reference_stress', label: 'Reference fatigue stress', unit: 'MPa', type: 'number', default: 95, min: 0.000001 },
      { key: 'reference_cycles', label: 'Cycles at reference stress', type: 'number', default: 1000000, min: 1 },
      { key: 'bandwidth', label: 'Spectral bandwidth parameter', type: 'number', default: 0.35, min: 0, max: 1 },
      { key: 'kurtosis', label: 'Stress kurtosis', type: 'number', default: 3, min: 1 },
      { key: 'repeats', label: 'Mission repeats', type: 'number', default: 4, min: 1, step: 1 }
    ],
    theory: '<p>Stress PSD moments set cycle rate and narrowband range statistics. Wide bandwidth and non-Gaussian peaks modify damage, while Miner summation accumulates event and mission repetitions.</p>',
    assumptions: ['Stationary stress process within the event.', 'Basquin S–N power law and linear Miner damage.', 'Bandwidth and kurtosis corrections are screening approximations.'],
    example: 'Increase kurtosis without changing RMS to see why equal PSD energy need not imply equal fatigue life.',
    compute(v) {
      const s = vibroacousticFatigueState({ stressRmsMpa: v.stress_rms, zeroCrossingRate: v.crossing_rate, duration: v.duration, fatigueExponent: v.fatigue_exponent, referenceStressMpa: v.reference_stress, referenceCycles: v.reference_cycles, bandwidth: v.bandwidth, kurtosis: v.kurtosis, missionRepeats: v.repeats });
      return { summary: [stat('Cycles per event', s.cycles), stat('Narrowband damage', s.narrowbandDamage), stat('Bandwidth correction', s.bandwidthCorrection), stat('Non-Gaussian correction', s.nonGaussianCorrection), stat('Damage per event', s.correctedDamagePerEvent), stat('Mission damage', s.missionDamage, '', s.missionDamage >= 1 ? 'warn' : 'good'), stat('Damage-equivalent stress', s.damageEquivalentStress, 'MPa'), stat('Disposition', s.regime)], interpretation: `The ${s.stressRms.toFixed(1)} MPa RMS process accumulates mission damage ${s.missionDamage.toExponential(2)} after bandwidth, kurtosis, and ${s.missionRepeats} repeats. The damage-equivalent RMS stress is ${s.damageEquivalentStress.toFixed(1)} MPa.`, engineeringConsiderations: programChecks('Recover local complex stress—not acceleration alone—and preserve parent event, duration, temperature, pressure, concentration, and material state.'), warnings: [s.kurtosis > 3.5 ? 'A Gaussian narrowband fatigue estimate is nonconservative for the entered kurtosis.' : 'Validate S–N data, mean-stress correction, weld/joint classification, and spectral fatigue method.'], plots: [{ title: 'Fatigue sensitivity to stress RMS', xLabel: 'Stress RMS (MPa)', yLabel: 'Damage per event', yScale: 'log', traces: [trace('Corrected damage', s.stressValues, s.damageCurve, { emphasis: true })] }] };
    }
  },
  'mission-environment-timeline': {
    category: 'Test & Signal', basis: 'Event-resolved acoustic, random, shock, and thermal severity map', confidence: 'Normalized launch-mission prioritization model',
    inputs: [
      { key: 'acoustic_scale', label: 'Liftoff acoustic scale', type: 'number', default: 1, min: 0 },
      { key: 'buffet_scale', label: 'Max-Q buffet scale', type: 'number', default: 1, min: 0 },
      { key: 'shock_scale', label: 'Separation shock scale', type: 'number', default: 1, min: 0 },
      { key: 'thermal_scale', label: 'Thermal/preload scale', type: 'number', default: 1, min: 0 },
      { key: 'fatigue_exponent', label: 'Fatigue exponent', type: 'number', default: 6, min: 1 }
    ],
    theory: '<p>A mission timeline preserves event duration, environment type, configuration, and subsystem sensitivity. Peak response, fatigue accumulation, and qualification ownership may be controlled by different events.</p>',
    assumptions: ['Environment amplitudes are normalized screening indices.', 'Subsystem weights are illustrative.', 'Events are treated independently for prioritization.'],
    example: 'Increase separation shock: avionics peak control may change while fairing fatigue remains liftoff-controlled.',
    compute(v) {
      const s = missionTimelineState({ acousticScale: v.acoustic_scale, buffetScale: v.buffet_scale, shockScale: v.shock_scale, thermalScale: v.thermal_scale, fatigueExponent: v.fatigue_exponent });
      return { summary: [stat('Mission duration represented', s.missionEnd, 's'), stat('Fatigue-controlling event', s.controllingFatigue), ...s.subsystemResults.map(item => stat(`${item.name} controller`, item.controllingEvent))], interpretation: `${s.controllingFatigue} controls the normalized fatigue index, but subsystem peak controllers differ. Preserve that event identity rather than enveloping every condition into one spectrum with no source traceability.`, engineeringConsiderations: programChecks('Tie every component requirement and test segment to a mission event, vehicle configuration, axis, duration, and uncertainty owner.'), warnings: ['Normalized severity supports prioritization only; replace it with controlled flight, analysis, or heritage environments before setting requirements.'], tables: [{ title: 'Mission event map', columns: ['Event', 'Start (s)', 'Duration (s)', 'Acoustic', 'Random', 'Shock', 'Thermal', 'Fatigue share'], rows: s.events.map(event => [event.name, event.start, event.duration, ...event.environment, event.fatigueShare]) }, { title: 'Subsystem controlling events', columns: ['Subsystem', 'Controlling event', 'Peak severity'], rows: s.subsystemResults.map(item => [item.name, item.controllingEvent, item.peakSeverity]) }] };
    }
  },
  'credibility-scorecard': {
    category: 'Test & Signal', basis: 'Weighted verification, validation, uncertainty, configuration, and review evidence rubric', confidence: 'Transparent decision-readiness scorecard; not a certification standard',
    inputs: [
      { key: 'verification', label: 'Code/equation verification (0–5)', type: 'number', default: 4, min: 0, max: 5 },
      { key: 'convergence', label: 'Mesh/band convergence (0–5)', type: 'number', default: 3, min: 0, max: 5 },
      { key: 'inputs', label: 'Input provenance (0–5)', type: 'number', default: 4, min: 0, max: 5 },
      { key: 'calibration', label: 'Calibration evidence (0–5)', type: 'number', default: 3, min: 0, max: 5 },
      { key: 'validation', label: 'Independent validation (0–5)', type: 'number', default: 2, min: 0, max: 5 },
      { key: 'uncertainty', label: 'Uncertainty coverage (0–5)', type: 'number', default: 3, min: 0, max: 5 },
      { key: 'configuration', label: 'Flight configuration match (0–5)', type: 'number', default: 2, min: 0, max: 5 },
      { key: 'review', label: 'Independent review (0–5)', type: 'number', default: 3, min: 0, max: 5 }
    ],
    theory: '<p>Verification asks whether equations and software are solved correctly; validation asks whether the model represents reality for its intended use. Calibration, uncertainty, configuration applicability, and independent review complete the evidence chain.</p>',
    assumptions: ['Scores are supported by linked evidence.', 'Weights reflect a prediction-oriented launch-vehicle decision.', 'No weighted average can erase a critical evidence floor.'],
    example: 'Raise calibration while leaving independent validation low: the score improves, but the model remains unvalidated for prediction.',
    compute(v) {
      const s = credibilityState(v);
      return { summary: [stat('Weighted credibility score', s.weightedScore, '/ 100', s.decisionReady ? 'good' : 'warn'), stat('Minimum evidence score', s.minimumScore, '/ 5'), stat('Weakest evidence area', s.weakest.name), stat('Decision readiness', s.maturity), stat('Open evidence gaps', s.gaps.length)], interpretation: `The evidence package scores ${s.weightedScore.toFixed(0)}/100 and is suitable for ${s.maturity}. The weakest area is ${s.weakest.name.toLowerCase()}; improving already-strong categories does not close that floor.`, engineeringConsiderations: programChecks('Attach artifacts, owners, dates, configurations, and acceptance criteria to every score so the scorecard remains auditable.'), warnings: s.gaps.length ? [`Evidence below the minimum target: ${s.gaps.join(', ')}.`] : ['No rubric gaps are below 3/5; confirm program-specific certification and independent review requirements.'], tables: [{ title: 'Evidence maturity', columns: ['Evidence area', 'Score / 5', 'Weight', 'Weighted contribution'], rows: s.evidence.map(item => [item.name, item.score, item.weight, 20 * item.weight * item.score]) }] };
    }
  },
  'launch-vibroacoustic-capstone': {
    category: 'Structural Acoustics', basis: 'Source–propagation–transmission–cavity–structure–payload–uncertainty dB chain', confidence: 'End-to-end launch-vehicle screening model',
    inputs: [
      { key: 'source_oaspl', label: 'Source OASPL', unit: 'dB', type: 'number', default: 152 },
      { key: 'propagation_loss', label: 'Propagation/geometric loss', unit: 'dB', type: 'number', default: 5, min: 0 },
      { key: 'fairing_tl', label: 'Fairing transmission loss', unit: 'dB', type: 'number', default: 18, min: 0 },
      { key: 'flanking_penalty', label: 'Flanking/leakage penalty', unit: 'dB', type: 'number', default: 5, min: 0 },
      { key: 'cavity_gain', label: 'Cavity modal gain', unit: 'dB', type: 'number', default: 3 },
      { key: 'structural_gain', label: 'Skin response gain', type: 'number', default: 2.8, min: 0 },
      { key: 'payload_transfer', label: 'Payload transfer ratio', type: 'number', default: 0.62, min: 0 },
      { key: 'mitigation', label: 'Installed mitigation', unit: 'dB', type: 'number', default: 4, min: 0 },
      { key: 'uncertainty', label: 'Response uncertainty allowance', unit: 'dB', type: 'number', default: 3, min: 0 },
      { key: 'payload_limit', label: 'Payload response limit', unit: 'g', type: 'number', default: 14, min: 0.01 }
    ],
    theory: '<p>The capstone preserves the complete source–path–receiver chain. Acoustic levels pass through propagation, fairing TL, flanking, cavity response, structural mobility, payload transfer, mitigation, and uncertainty before comparison with a limit.</p>',
    assumptions: ['Broadband levels are represented by one controlling band.', 'Structural and payload gains are linear amplitude ratios.', 'All dB adjustments refer to compatible quantities.'],
    example: 'Improve fairing TL until the response stops improving because flanking penalty consumes the component benefit.',
    compute(v) {
      const s = capstoneState({ sourceOaspl: v.source_oaspl, propagationLoss: v.propagation_loss, fairingTl: v.fairing_tl, flankingPenalty: v.flanking_penalty, cavityGain: v.cavity_gain, structuralGain: v.structural_gain, payloadTransfer: v.payload_transfer, mitigationDb: v.mitigation, uncertaintyDb: v.uncertainty, payloadLimit: v.payload_limit });
      return { summary: [stat('External level at vehicle', s.externalLevel, 'dB'), stat('Effective installed TL', s.effectiveTl, 'dB'), stat('Treated interior level', s.treatedInteriorLevel, 'dB'), stat('Interior pressure RMS', s.pressureRms, 'Pa'), stat('Skin acceleration', s.skinAcceleration, 'g'), stat('Nominal payload response', s.nominalPayloadResponse, 'g'), stat('Design payload response', s.designPayloadResponse, 'g'), stat('Margin to limit', s.marginDb, 'dB', s.marginDb >= 0 ? 'good' : 'warn'), stat('Disposition', s.disposition)], interpretation: `The ${s.sourceOaspl.toFixed(0)} dB source becomes ${s.treatedInteriorLevel.toFixed(1)} dB inside the treated fairing and ${s.designPayloadResponse.toFixed(2)} g at the payload after uncertainty. The screening margin is ${s.marginDb.toFixed(1)} dB: ${s.disposition}.`, engineeringConsiderations: programChecks('Replace every scalar link with the appropriate banded source, spatial field, installed transfer, correlated response, and evidence maturity as the design advances.'), warnings: [s.flankingPenalty > 0.4 * s.fairingTl ? 'Flanking consumes a large fraction of component TL; improving the panel alone will have diminishing installed benefit.' : 'Confirm that level, amplitude, and power dB conventions remain consistent across every handoff.'], plots: [{ title: 'Source-to-payload acoustic level chain', xLabel: 'Path stage', yLabel: 'Level (dB)', traces: [trace('Level', s.pathLabels.map((_, index) => index + 1), s.pathLevels, { emphasis: true })] }], tables: [{ title: 'One-dB sensitivity directions', columns: ['Model link', 'Payload response direction for +1 dB input'], rows: s.sensitivities.map(item => [item.name, item.deltaDb > 0 ? 'Increases' : 'Decreases']) }] };
    }
  },
  'noise-control-path': {
    category: 'Noise Control', basis: 'Energetic source–path–receiver ledger with parallel airborne, structure-borne, and leakage paths', confidence: 'Three-path engineering screening model',
    inputs: [
      { key: 'path1_level', label: 'Primary airborne path', unit: 'dB', type: 'number', default: 96 },
      { key: 'path1_reduction', label: 'Primary treatment', unit: 'dB', type: 'number', default: 8, min: 0 },
      { key: 'path2_level', label: 'Structure-borne flank', unit: 'dB', type: 'number', default: 91 },
      { key: 'path2_reduction', label: 'Flanking treatment', unit: 'dB', type: 'number', default: 3, min: 0 },
      { key: 'path3_level', label: 'Leak / secondary path', unit: 'dB', type: 'number', default: 86 },
      { key: 'path3_reduction', label: 'Leak treatment', unit: 'dB', type: 'number', default: 0, min: 0 },
      { key: 'target_level', label: 'Receiver criterion', unit: 'dB', type: 'number', default: 88 }
    ],
    theory: '<p>Noise control succeeds only at the receiver. Independent path powers add energetically, so suppressing one path eventually exposes the next path and creates a hard system floor.</p>',
    assumptions: ['Paths are mutually incoherent over the reporting band.', 'Each entered reduction is an installed path benefit.', 'Levels refer to compatible receiver quantities and bandwidths.'],
    example: 'Increase only the primary treatment until the structure-borne flank becomes dominant and additional panel treatment has little receiver benefit.',
    compute(v) {
      const s = noiseControlPathState({ path1Level: v.path1_level, path1Reduction: v.path1_reduction, path2Level: v.path2_level, path2Reduction: v.path2_reduction, path3Level: v.path3_level, path3Reduction: v.path3_reduction, targetLevel: v.target_level });
      return { summary: [stat('Untreated receiver', s.beforeLevel, 'dB'), stat('Treated receiver', s.afterLevel, 'dB'), stat('Overall reduction', s.overallReduction, 'dB'), stat('Criterion margin', s.margin, 'dB', s.margin >= 0 ? 'good' : 'warn'), stat('Dominant residual path', s.dominant.name), stat('Other-path floor', s.residualFloor, 'dB')], interpretation: `${s.dominant.name} carries ${(100 * s.dominant.share).toFixed(0)}% of the residual energy. The receiver is ${Math.abs(s.margin).toFixed(1)} dB ${s.margin >= 0 ? 'inside' : 'above'} the criterion, so the next treatment should follow the residual path—not the original source ranking.`, engineeringConsiderations: programChecks('Maintain a banded source–path–receiver ledger and update path ownership after every mitigation trade.'), warnings: [s.requiredAdditionalReduction > 0 ? `${s.requiredAdditionalReduction.toFixed(1)} dB of additional total receiver reduction is required.` : 'The screening target is met; verify installation, uncertainty, and off-design conditions.'], plots: [{ title: 'Primary-path treatment and system floor', xLabel: 'Primary-path reduction (dB)', yLabel: 'Receiver level (dB)', traces: [trace('Overall receiver', s.treatmentSweep, s.overallCurve, { emphasis: true }), trace('Criterion', s.treatmentSweep, s.treatmentSweep.map(() => s.targetLevel))] }], tables: [{ title: 'Residual path ledger', columns: ['Path', 'Treated level (dB)', 'Energy share', 'Applied reduction (dB)'], rows: s.contributions.map(item => [item.name, item.level, item.share, item.reduction]) }] };
    }
  },
  'hearing-psychoacoustics': {
    category: 'Acoustics', basis: 'Duplex localization, critical-band masking, Bark/ERB bandwidth, and equal-loudness screening', confidence: 'Human-hearing intuition model; not an audiological assessment',
    inputs: [
      { key: 'frequency', label: 'Tone frequency', unit: 'Hz', type: 'number', default: 1000, min: 20 },
      { key: 'azimuth', label: 'Source azimuth', unit: 'deg', type: 'number', default: 35, min: -90, max: 90 },
      { key: 'head_width', label: 'Ear-to-ear spacing', unit: 'm', type: 'number', default: 0.18, min: 0.08 },
      { key: 'sound_level', label: 'Tone level', unit: 'dB', type: 'number', default: 80 },
      { key: 'masker_level', label: 'Masker level', unit: 'dB', type: 'number', default: 68 },
      { key: 'masker_bandwidth', label: 'Masker bandwidth', unit: 'Hz', type: 'number', default: 160, min: 1 }
    ],
    theory: '<p>Low-frequency localization is dominated by arrival-time difference; higher-frequency localization increasingly uses head-shadow level difference. Masking is strongest when signal and noise share one auditory filter.</p>',
    assumptions: ['Free-field single-tone cues without head-related transfer functions.', 'ERB and Bark relations are population averages.', 'A-weighted phon and sone values are educational approximations.'],
    example: 'Sweep frequency at fixed azimuth to see localization move from timing to level cues while the auditory-filter bandwidth grows.',
    compute(v) {
      const s = psychoacousticState({ frequency: v.frequency, azimuth: v.azimuth, headWidth: v.head_width, soundLevel: v.sound_level, maskerLevel: v.masker_level, maskerBandwidth: v.masker_bandwidth });
      return { summary: [stat('Interaural time difference', s.itdMicroseconds, 'µs'), stat('Interaural level difference', s.ild, 'dB'), stat('ERB critical bandwidth', s.erb, 'Hz'), stat('Bark position', s.bark, 'Bark'), stat('Tone-to-masker margin', s.toneToMasker, 'dB'), stat('Audibility screen', s.audibility), stat('Dominant cue', s.localizationCue)], interpretation: `At ${s.frequency.toFixed(0)} Hz and ${s.azimuth.toFixed(0)}°, the head produces about ${Math.abs(s.itdMicroseconds).toFixed(0)} µs timing difference and ${Math.abs(s.ild).toFixed(1)} dB level difference. The tone is ${s.toneToMasker.toFixed(1)} dB relative to its screening masker.`, engineeringConsiderations: programChecks('Use human-response metrics for habitability and warning audibility, but retain physical spectra for launch hardware and control design.'), warnings: ['Short impulses, hearing protection, individual hearing loss, reverberation, and bone conduction are outside this screening model.'], plots: [{ title: 'Binaural localization cues', xLabel: 'Source azimuth (deg)', yLabel: 'Cue magnitude', traces: [trace('ITD (µs)', s.angleSweep, s.itdCurve, { emphasis: true }), trace('ILD (dB)', s.angleSweep, s.ildCurve)] }] };
    }
  },
  'noise-metrics-criteria': {
    category: 'Acoustics', basis: 'Leq, SEL, day/night penalties, statistical levels, octave-band NC screening, and speech interference', confidence: 'Educational community/workplace metric calculator',
    inputs: [
      { key: 'background_level', label: 'Background level', unit: 'dB', type: 'number', default: 64 },
      { key: 'event_level', label: 'Event level', unit: 'dB', type: 'number', default: 92 },
      { key: 'event_duration', label: 'Event duration', unit: 's', type: 'number', default: 12, min: 0.001 },
      { key: 'total_duration', label: 'Reporting duration', unit: 's', type: 'number', default: 3600, min: 0.001 },
      { key: 'day_level', label: 'Day level', unit: 'dB', type: 'number', default: 67 },
      { key: 'evening_level', label: 'Evening level', unit: 'dB', type: 'number', default: 63 },
      { key: 'night_level', label: 'Night level', unit: 'dB', type: 'number', default: 58 },
      { key: 'target_level', label: 'Leq criterion', unit: 'dB', type: 'number', default: 70 },
      { key: 'band63', label: '63 Hz octave', unit: 'dB', type: 'number', default: 63 },
      { key: 'band125', label: '125 Hz octave', unit: 'dB', type: 'number', default: 55 },
      { key: 'band250', label: '250 Hz octave', unit: 'dB', type: 'number', default: 48 },
      { key: 'band500', label: '500 Hz octave', unit: 'dB', type: 'number', default: 43 },
      { key: 'band1000', label: '1 kHz octave', unit: 'dB', type: 'number', default: 40 },
      { key: 'band2000', label: '2 kHz octave', unit: 'dB', type: 'number', default: 37 },
      { key: 'band4000', label: '4 kHz octave', unit: 'dB', type: 'number', default: 34 },
      { key: 'band8000', label: '8 kHz octave', unit: 'dB', type: 'number', default: 31 }
    ],
    theory: '<p>Energy-average, single-event, statistical, and criterion-curve metrics answer different questions. A compliant overall value can still conceal objectionable rumble, hiss, tonality, or impulsiveness.</p>',
    assumptions: ['One event level is constant over its duration.', 'Day/evening/night levels are long-term energy averages.', 'NC rating is a simplified educational curve fit.'],
    example: 'Shorten the event: SEL is unchanged for a fixed event, but hourly Leq drops as exposure is diluted.',
    compute(v) {
      const s = noiseMetricsState({ backgroundLevel: v.background_level, eventLevel: v.event_level, eventDuration: v.event_duration, totalDuration: v.total_duration, dayLevel: v.day_level, eveningLevel: v.evening_level, nightLevel: v.night_level, targetLevel: v.target_level, band63: v.band63, band125: v.band125, band250: v.band250, band500: v.band500, band1000: v.band1000, band2000: v.band2000, band4000: v.band4000, band8000: v.band8000 });
      return { summary: [stat('Leq', s.leq, 'dB', s.margin >= 0 ? 'good' : 'warn'), stat('SEL', s.sel, 'dB'), stat('Ldn', s.ldn, 'dB'), stat('CNEL', s.cnel, 'dB'), stat('L10 / L50 / L90', `${s.l10.toFixed(0)} / ${s.l50.toFixed(0)} / ${s.l90.toFixed(0)}`, 'dB'), stat('NC screen', `NC-${s.ncRating}`), stat('Speech interference level', s.speechInterferenceLevel, 'dB')], interpretation: `The ${s.eventDuration.toFixed(1)} s event produces ${s.leq.toFixed(1)} dB Leq over ${s.totalDuration.toFixed(0)} s and ${s.sel.toFixed(1)} dB SEL. The octave spectrum screens as NC-${s.ncRating}, but ${s.character}.`, engineeringConsiderations: programChecks('Choose the metric only after naming the receiver: community, crew, payload, structure, test article, or communication task.'), warnings: ['Apply the governing regulatory or program criterion directly; this educational NC screen is not a compliance determination.'], plots: [{ title: 'Event within the reporting interval', xLabel: 'Time (s)', yLabel: 'Level (dB)', traces: [trace('Level history', s.timeline, s.levelHistory, { emphasis: true })] }] };
    }
  },
  'acoustic-measurement-planner': {
    category: 'Test & Signal', basis: 'Microphone field response, incidence orientation, wind contamination, reflection geometry, and far-field validity', confidence: 'Pre-test setup screening model',
    inputs: [
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 20 },
      { key: 'microphone_diameter', label: 'Microphone diameter', unit: 'mm', type: 'number', default: 12.7, min: 1 },
      { key: 'incidence_angle', label: 'Incidence angle', unit: 'deg', type: 'number', default: 0, min: 0, max: 180 },
      { key: 'field_type', label: 'Acoustic field', type: 'select', default: 'free', options: [{ value: 'free', label: 'Free field' }, { value: 'diffuse', label: 'Diffuse field' }, { value: 'confined', label: 'Confined / pressure field' }] },
      { key: 'microphone_type', label: 'Microphone correction', type: 'select', default: 'free-field', options: [{ value: 'free-field', label: 'Free-field' }, { value: 'random-incidence', label: 'Random-incidence' }, { value: 'pressure', label: 'Pressure' }] },
      { key: 'wind_speed', label: 'Wind speed', unit: 'm/s', type: 'number', default: 4, min: 0 },
      { key: 'windscreen', label: 'Windscreen', type: 'select', default: 'yes', options: [{ value: 'yes', label: 'Installed' }, { value: 'no', label: 'None' }] },
      { key: 'wall_distance', label: 'Nearest reflecting wall', unit: 'm', type: 'number', default: 0.8, min: 0.01 },
      { key: 'source_distance', label: 'Source distance', unit: 'm', type: 'number', default: 3, min: 0.01 }
    ],
    theory: '<p>A microphone changes the sound field it samples. Diameter, incidence, calibration type, reflections, wind, mounting, and source range all affect whether measured pressure represents the desired observable.</p>',
    assumptions: ['One dominant incidence direction.', 'Simple microphone scattering and wall-notch screening.', 'No preamplifier, cable, clipping, or electronic noise model.'],
    example: 'Rotate a free-field microphone in a diffuse field at high frequency to expose orientation and field-correction bias.',
    compute(v) {
      const s = acousticMeasurementState({ frequency: v.frequency, microphoneDiameterMm: v.microphone_diameter, incidenceAngle: v.incidence_angle, fieldType: v.field_type, microphoneType: v.microphone_type, windSpeed: v.wind_speed, windscreen: v.windscreen, wallDistance: v.wall_distance, sourceDistance: v.source_distance });
      return { summary: [stat('Net response bias', s.totalBias, 'dB', Math.abs(s.totalBias) < 1.5 ? 'good' : 'warn'), stat('Orientation contribution', s.orientationError, 'dB'), stat('Field mismatch', s.fieldMismatch, 'dB'), stat('Wind contamination screen', s.windPenalty, 'dB'), stat('First reflection notch', s.reflectionNotch, 'Hz'), stat('Range / wavelength', s.farFieldRatio), stat('Setup recommendation', s.recommendation)], interpretation: `The microphone screen predicts ${s.totalBias.toFixed(1)} dB field/orientation bias at ${s.frequency.toFixed(0)} Hz. The source is ${s.farFieldRatio.toFixed(1)} wavelengths away, while a wall ${s.wallDistance.toFixed(2)} m away creates a first quarter-wave sensitivity near ${s.reflectionNotch.toFixed(0)} Hz.`, engineeringConsiderations: programChecks('Document microphone type, serial calibration, orientation, mounting, weather, geometry, background, overload margin, and corrections with every dataset.'), warnings: [s.windPenalty >= 3 ? 'Wind-induced pressure can dominate the low-frequency signal even when the acoustic source is unchanged.' : 'Verify calibration before and after the test and preserve raw unweighted data.'], plots: [{ title: 'Estimated microphone field-response bias', xLabel: 'Frequency (Hz)', yLabel: 'Bias (dB)', xScale: 'log', traces: [trace('Response bias', s.frequencies, s.responseBias, { emphasis: true })] }] };
    }
  },
  'canonical-source': {
    category: 'Acoustics', basis: 'Compact monopole, dipole, and quadrupole directivity, compactness, near/far field, and flow-speed scaling', confidence: 'Canonical-source scaling model',
    inputs: [
      { key: 'source_type', label: 'Source type', type: 'select', default: 'dipole', options: [{ value: 'monopole', label: 'Monopole' }, { value: 'dipole', label: 'Dipole' }, { value: 'quadrupole', label: 'Quadrupole' }] },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 500, min: 1 },
      { key: 'separation', label: 'Source scale / separation', unit: 'm', type: 'number', default: 0.08, min: 0.001 },
      { key: 'distance', label: 'Receiver distance', unit: 'm', type: 'number', default: 10, min: 0.01 },
      { key: 'angle', label: 'Receiver angle', unit: 'deg', type: 'number', default: 35, min: 0, max: 180 },
      { key: 'sound_power_level', label: 'Sound power level', unit: 'dB', type: 'number', default: 110 },
      { key: 'flow_speed', label: 'Characteristic flow speed', unit: 'm/s', type: 'number', default: 80, min: 0.1 }
    ],
    theory: '<p>Volume injection radiates as a monopole, fluctuating force as a dipole, and turbulent stress as a quadrupole. Each higher order is less efficient when compact and more directional.</p>',
    assumptions: ['Compact ideal source in a free field.', 'No convection, refraction, reflecting plane, or source coherence.', 'Velocity exponents are canonical low-Mach scaling laws.'],
    example: 'Compare a monopole and dipole at 90°: the dipole null is a source mechanism, not propagation loss.',
    compute(v) {
      const s = canonicalSourceState({ sourceType: v.source_type, frequency: v.frequency, separation: v.separation, distance: v.distance, angle: v.angle, soundPowerLevel: v.sound_power_level, flowSpeed: v.flow_speed });
      return { summary: [stat('Source order', s.sourceType), stat('Compactness kd', s.kd), stat('Range kr', s.kr), stat('Directivity index', s.directivityIndex, 'dB'), stat('Compact radiation efficiency', s.compactEfficiency), stat('Received level', s.receivedLevel, 'dB'), stat('10% speed-change effect', s.tenPercentSpeedChangeDb, 'dB'), stat('Field region', s.region)], interpretation: `The ${s.sourceType} has kd=${s.kd.toFixed(2)} and a ${s.directivityIndex.toFixed(1)} dB angular correction at ${s.angleDegrees.toFixed(0)}°. Its canonical U^${s.velocityExponent} law means a 10% speed change shifts power by about ${s.tenPercentSpeedChangeDb.toFixed(1)} dB.`, engineeringConsiderations: programChecks('Use canonical source order to choose diagnostic observables and scaling, then replace it with measured directivity and installed geometry.'), warnings: [s.compactEfficiency < 0.1 ? 'The higher-order source is acoustically compact and radiates inefficiently; small geometry or phase changes can matter strongly.' : 'The ideal polar pattern will be distorted by nearby structures, ground, ducts, and mean flow.'], plots: [{ title: 'Canonical source directivity', xLabel: 'Azimuth (deg)', yLabel: 'Relative level (dB)', traces: [trace(s.sourceType, s.angles, s.pattern, { emphasis: true })] }] };
    }
  },
  'source-geometry': {
    category: 'Acoustics', basis: 'Finite rectangular source transition from plane-like to line-like to point-like spreading', confidence: 'Geometric spreading intuition model',
    inputs: [
      { key: 'long_dimension', label: 'Long source dimension', unit: 'm', type: 'number', default: 8, min: 0.01 },
      { key: 'short_dimension', label: 'Short source dimension', unit: 'm', type: 'number', default: 2, min: 0.01 },
      { key: 'distance', label: 'Receiver distance', unit: 'm', type: 'number', default: 3, min: 0.01 },
      { key: 'reference_level', label: 'Near-field reference level', unit: 'dB', type: 'number', default: 105 }
    ],
    theory: '<p>A finite surface first appears infinite in two dimensions, then collapses to a line, then to a point as receiver range exceeds its two dimensions. The spreading slope therefore changes with range.</p>',
    assumptions: ['Uniform incoherent radiation over a rectangular source.', 'No atmospheric, ground, directivity, or phase effects.', 'Transition distances use dimension divided by π.'],
    example: 'Move away from a long launch vehicle or plume footprint and observe 0, 3, then 6 dB per distance doubling.',
    compute(v) {
      const s = sourceGeometryState({ longDimension: v.long_dimension, shortDimension: v.short_dimension, distance: v.distance, referenceLevel: v.reference_level });
      return { summary: [stat('Receiver level', s.level, 'dB'), stat('Plane-to-line transition', s.planeLimit, 'm'), stat('Line-to-point transition', s.lineLimit, 'm'), stat('Spreading regime', s.regime)], interpretation: `At ${s.distance.toFixed(2)} m the finite ${s.longDimension.toFixed(1)} × ${s.shortDimension.toFixed(1)} m source is in the ${s.regime}. Applying a universal 6 dB/doubling law here would misstate range benefit.`, engineeringConsiderations: programChecks('Select spreading from the source dimensions, coherence, wavelength, and receiver range before adding atmospheric and ground effects.'), warnings: ['Real plume, vent, panel, and traffic sources have nonuniform strength, directivity, coherence, and moving boundaries.'], plots: [{ title: 'Finite-source geometric spreading', xLabel: 'Distance (m)', yLabel: 'Level (dB)', xScale: 'log', traces: [trace('Received level', s.distances, s.levels, { emphasis: true })] }] };
    }
  },
  'fan-duct-network': {
    category: 'Noise Control', basis: 'Fan power, blade-passage tone, outlet division, lined-duct loss, branching, fittings, regenerated flow noise, and room correction', confidence: 'One-band duct-network ledger',
    inputs: [
      { key: 'source_power_level', label: 'Fan sound power level', unit: 'dB', type: 'number', default: 105 },
      { key: 'rpm', label: 'Fan speed', unit: 'rpm', type: 'number', default: 1800, min: 1 },
      { key: 'blades', label: 'Blade count', type: 'number', default: 12, min: 1, step: 1 },
      { key: 'duct_length', label: 'Lined duct length', unit: 'm', type: 'number', default: 12, min: 0 },
      { key: 'attenuation_rate', label: 'Duct attenuation rate', unit: 'dB/m', type: 'number', default: 0.45, min: 0 },
      { key: 'branch_fraction', label: 'Selected branch power fraction', type: 'number', default: 0.35, min: 0.01, max: 1 },
      { key: 'elbow_loss', label: 'Elbow attenuation', unit: 'dB', type: 'number', default: 3, min: 0 },
      { key: 'elbow_generation', label: 'Elbow regenerated power', unit: 'dB', type: 'number', default: 58 },
      { key: 'grille_generation', label: 'Grille regenerated power', unit: 'dB', type: 'number', default: 62 },
      { key: 'room_constant', label: 'Receiver room constant', unit: 'm²', type: 'number', default: 45, min: 0.1 },
      { key: 'receiver_distance', label: 'Receiver distance', unit: 'm', type: 'number', default: 4, min: 0.1 }
    ],
    theory: '<p>Duct losses subtract from transmitted sound power, branches divide energy, and elbows or grilles can create new flow noise. The final room level contains direct and reverberant terms.</p>',
    assumptions: ['One frequency band and steady operating point.', 'Duct attenuation is uniform per length.', 'Regenerated sources are incoherent.'],
    example: 'Add lined duct until elbow and grille self-noise set the downstream floor.',
    compute(v) {
      const s = fanDuctState({ sourcePowerLevel: v.source_power_level, rpm: v.rpm, blades: v.blades, ductLength: v.duct_length, attenuationRate: v.attenuation_rate, branchFraction: v.branch_fraction, elbowLoss: v.elbow_loss, elbowGeneration: v.elbow_generation, grilleGeneration: v.grille_generation, roomConstant: v.room_constant, receiverDistance: v.receiver_distance });
      return { summary: [stat('Blade-passage frequency', s.bladePassageFrequency, 'Hz'), stat('Power after selected branch', s.afterBranch, 'dB'), stat('Delivered duct power', s.deliveredPowerLevel, 'dB'), stat('Receiver room level', s.roomLevel, 'dB'), stat('Regenerated-noise share', 100 * s.regeneratedShare, '%'), stat('Controlling mechanism', s.controller)], interpretation: `The ${s.bladePassageFrequency.toFixed(0)} Hz blade-passage feature travels through the network, but regenerated fittings contribute ${(100 * s.regeneratedShare).toFixed(0)}% of delivered band power. More upstream silencing will not beat that downstream floor.`, engineeringConsiderations: programChecks('Build a band-by-band power ledger through every outlet, branch, fitting, silencer, breakout path, and occupied room.'), warnings: ['Pressure drop, fan operating-point shift, self-noise, breakout, end reflection, and cross-talk require supplier or measured network data.'], tables: [{ title: 'Duct sound-power ledger', columns: ['Stage', 'Sound power level (dB)'], rows: s.stageNames.map((name, index) => [name, s.stages[index]]) }] };
    }
  },
  'outdoor-propagation': {
    category: 'Noise Control', basis: 'Geometric divergence, molecular absorption, coherent ground reflection, turbulence, effective sound-speed gradient, vegetation, and directivity', confidence: 'One-band outdoor propagation screen',
    inputs: [
      { key: 'source_power_level', label: 'Source sound power level', unit: 'dB', type: 'number', default: 135 },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 20 },
      { key: 'distance', label: 'Horizontal distance', unit: 'm', type: 'number', default: 500, min: 1 },
      { key: 'source_height', label: 'Source height', unit: 'm', type: 'number', default: 8, min: 0.1 },
      { key: 'receiver_height', label: 'Receiver height', unit: 'm', type: 'number', default: 2, min: 0.1 },
      { key: 'temperature', label: 'Temperature', unit: '°C', type: 'number', default: 20 },
      { key: 'humidity', label: 'Relative humidity', unit: '%', type: 'number', default: 60, min: 1, max: 100 },
      { key: 'effective_gradient', label: 'Effective sound-speed gradient', unit: 's⁻¹', type: 'number', default: 0.002 },
      { key: 'ground_type', label: 'Ground', type: 'select', default: 'mixed', options: [{ value: 'hard', label: 'Hard' }, { value: 'mixed', label: 'Mixed' }, { value: 'soft', label: 'Soft' }] },
      { key: 'turbulence_coherence', label: 'Ground-path coherence', type: 'number', default: 0.65, min: 0, max: 1 },
      { key: 'vegetation_length', label: 'Dense vegetation path', unit: 'm', type: 'number', default: 0, min: 0 },
      { key: 'directivity', label: 'Directivity factor Q', type: 'number', default: 2, min: 0.01 }
    ],
    theory: '<p>Outdoor level is not geometric spreading alone. Molecular relaxation, coherent ground interference, turbulent decorrelation, wind and temperature refraction, vegetation, terrain, and source directivity reshape the spectrum.</p>',
    assumptions: ['Flat ground and one effective weather gradient.', 'No terrain, buildings, moving source, or frequency-band integration.', 'Atmospheric absorption is an ISO-9613-style approximation.'],
    example: 'Change gradient sign to move from downward refraction to upward-refraction shadow-zone sensitivity.',
    compute(v) {
      const s = outdoorPropagationState({ sourcePowerLevel: v.source_power_level, frequency: v.frequency, distance: v.distance, sourceHeight: v.source_height, receiverHeight: v.receiver_height, temperature: v.temperature, humidity: v.humidity, effectiveGradient: v.effective_gradient, groundType: v.ground_type, turbulenceCoherence: v.turbulence_coherence, vegetationLength: v.vegetation_length, directivity: v.directivity });
      return { summary: [stat('Free-field level', s.freeFieldLevel, 'dB'), stat('Atmospheric loss', s.atmosphericLoss, 'dB'), stat('Ground interference', s.groundEffect, 'dB'), stat('Meteorology correction', s.meteorology, 'dB'), stat('Vegetation loss', s.vegetationLoss, 'dB'), stat('Received level', s.receivedLevel, 'dB'), stat('Weather regime', s.weatherRegime)], interpretation: `At ${s.distance.toFixed(0)} m and ${s.frequency.toFixed(0)} Hz, atmospheric absorption removes ${s.atmosphericLoss.toFixed(1)} dB while coherent ground interference contributes ${s.groundEffect.toFixed(1)} dB and meteorology ${s.meteorology.toFixed(1)} dB.`, engineeringConsiderations: programChecks('Bracket pad/community predictions with measured seasonal weather profiles, source directivity, terrain, and ground impedance.'), warnings: [Math.abs(s.groundEffect) > 5 ? 'The result is phase-sensitive to source/receiver height, frequency, ground impedance, and turbulence.' : 'One weather condition is not a community-noise envelope.'], plots: [{ title: 'Outdoor level versus distance', xLabel: 'Distance (m)', yLabel: 'Level (dB)', xScale: 'log', traces: [trace('Propagation screen', s.distances, s.levelCurve, { emphasis: true })] }] };
    }
  },
  'barrier-diffraction': {
    category: 'Noise Control', basis: 'Top and finite-end diffraction in parallel with through-panel transmission and leakage', confidence: 'Fresnel-number barrier screening model',
    inputs: [
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 500, min: 20 },
      { key: 'source_distance', label: 'Source-to-barrier distance', unit: 'm', type: 'number', default: 12, min: 0.1 },
      { key: 'receiver_distance', label: 'Barrier-to-receiver distance', unit: 'm', type: 'number', default: 18, min: 0.1 },
      { key: 'source_height', label: 'Source height', unit: 'm', type: 'number', default: 2, min: 0 },
      { key: 'receiver_height', label: 'Receiver height', unit: 'm', type: 'number', default: 1.5, min: 0 },
      { key: 'barrier_height', label: 'Barrier height', unit: 'm', type: 'number', default: 5, min: 0 },
      { key: 'side_clearance', label: 'Nearest barrier end path', unit: 'm', type: 'number', default: 30, min: 0.1 },
      { key: 'panel_tl', label: 'Barrier panel TL', unit: 'dB', type: 'number', default: 25, min: 0 },
      { key: 'leakage_fraction', label: 'Open leakage fraction', type: 'number', default: 0.002, min: 0, max: 1 }
    ],
    theory: '<p>A barrier works by forcing sound around a longer path. Top diffraction, finite ends, panel transmission, gaps, ground reflection, and the reverberant field remain parallel paths.</p>',
    assumptions: ['Thin rigid screen with one top edge and one representative end path.', 'Independent transmitted path powers.', 'No multiple reflections or indoor reverberant bypass.'],
    example: 'Raise the wall until finite-end bypass or a small leak becomes the controlling path.',
    compute(v) {
      const s = barrierDiffractionState({ frequency: v.frequency, sourceDistance: v.source_distance, receiverDistance: v.receiver_distance, sourceHeight: v.source_height, receiverHeight: v.receiver_height, barrierHeight: v.barrier_height, sideClearance: v.side_clearance, panelTl: v.panel_tl, leakageFraction: v.leakage_fraction });
      return { summary: [stat('Top-path Fresnel number', s.fresnel), stat('Top diffraction attenuation', s.topAttenuation, 'dB'), stat('End-path attenuation', s.sideAttenuation, 'dB'), stat('Installed insertion loss', s.insertionLoss, 'dB'), stat('Controlling path', s.controllingPath)], interpretation: `The nominal top-edge benefit is ${s.topAttenuation.toFixed(1)} dB, but parallel end, panel, and leak paths reduce installed insertion loss to ${s.insertionLoss.toFixed(1)} dB. ${s.controllingPath} now controls.`, engineeringConsiderations: programChecks('Extend barriers beyond the line of sight, seal penetrations, and compare direct-field benefit with the receiver reverberant floor.'), warnings: [s.pathShares[3] > 0.25 ? 'Small open leakage carries a material share of transmitted energy.' : 'Low-frequency diffraction and finite barrier ends often limit broadband performance.'], plots: [{ title: 'Installed barrier insertion loss', xLabel: 'Frequency (Hz)', yLabel: 'Insertion loss (dB)', xScale: 'log', traces: [trace('Barrier system', s.frequencies, s.insertionCurve, { emphasis: true })] }], tables: [{ title: 'Transmitted-path shares', columns: ['Path', 'Energy share'], rows: ['Top diffraction', 'End bypass', 'Panel transmission', 'Leakage'].map((name, index) => [name, s.pathShares[index]]) }] };
    }
  },
  'room-field': {
    category: 'Acoustics', basis: 'Direct plus reverberant sound field, room constant, critical distance, Sabine/Eyring decay, and Schroeder transition', confidence: 'Diffuse-room one-band model',
    inputs: [
      { key: 'sound_power_level', label: 'Source sound power level', unit: 'dB', type: 'number', default: 105 },
      { key: 'length', label: 'Room length', unit: 'm', type: 'number', default: 10, min: 0.1 },
      { key: 'width', label: 'Room width', unit: 'm', type: 'number', default: 7, min: 0.1 },
      { key: 'height', label: 'Room height', unit: 'm', type: 'number', default: 4, min: 0.1 },
      { key: 'absorption', label: 'Mean absorption coefficient', type: 'number', default: 0.18, min: 0.001, max: 0.99 },
      { key: 'directivity', label: 'Source directivity Q', type: 'number', default: 2, min: 0.01 },
      { key: 'distance', label: 'Receiver distance', unit: 'm', type: 'number', default: 3, min: 0.1 }
    ],
    theory: '<p>Direct sound decays with range while the diffuse reverberant contribution approaches a room-controlled floor. Critical distance marks equal direct and reverberant energy.</p>',
    assumptions: ['Diffuse late field with uniform absorption.', 'Steady one-band source and no air absorption.', 'Sabine/Eyring statistics above the modal transition.'],
    example: 'Increase absorption: reverberant level and decay time fall while critical distance expands.',
    compute(v) {
      const s = roomFieldState({ soundPowerLevel: v.sound_power_level, length: v.length, width: v.width, height: v.height, absorption: v.absorption, directivity: v.directivity, distance: v.distance });
      return { summary: [stat('Total receiver level', s.totalLevel, 'dB'), stat('Direct contribution', s.directLevel, 'dB'), stat('Reverberant contribution', s.reverberantLevel, 'dB'), stat('Room constant', s.roomConstant, 'm²'), stat('Critical distance', s.criticalDistance, 'm'), stat('Eyring T60', s.eyringT60, 's'), stat('Schroeder frequency', s.schroederFrequency, 'Hz'), stat('Field regime', s.regime)], interpretation: `At ${s.distance.toFixed(1)} m the receiver is in the ${s.regime}. Treatment changes the reverberant floor and ${s.criticalDistance.toFixed(1)} m critical distance, but does not remove the direct source path.`, engineeringConsiderations: programChecks('Use room-constant models above the statistical transition and resolve low-frequency modes or local source geometry separately.'), warnings: [s.schroederFrequency > 300 ? 'A substantial low-frequency band is modal; diffuse-field equations will hide spatial peaks and nulls.' : 'Mean absorption conceals strongly frequency-dependent surfaces and installed coverage.'], plots: [{ title: 'Direct and total room field', xLabel: 'Receiver distance (m)', yLabel: 'Level (dB)', xScale: 'log', traces: [trace('Direct field', s.distances, s.directCurve), trace('Direct + reverberant', s.distances, s.totalCurve, { emphasis: true })] }] };
    }
  },
  'enclosure-design': {
    category: 'Noise Control', basis: 'Parallel panel, opening, and flanking transmission with internal absorption and receiver spreading', confidence: 'Installed enclosure weakest-link model',
    inputs: [
      { key: 'internal_power_level', label: 'Internal source power', unit: 'dB', type: 'number', default: 105 },
      { key: 'total_area', label: 'Enclosure area', unit: 'm²', type: 'number', default: 18, min: 0.1 },
      { key: 'opening_area', label: 'Total open area', unit: 'm²', type: 'number', default: 0.08, min: 0 },
      { key: 'panel_tl', label: 'Panel TL', unit: 'dB', type: 'number', default: 28, min: 0 },
      { key: 'opening_tl', label: 'Opening / silencer TL', unit: 'dB', type: 'number', default: 3, min: 0 },
      { key: 'flanking_area_fraction', label: 'Flanking area fraction', type: 'number', default: 0.015, min: 0, max: 1 },
      { key: 'flanking_tl', label: 'Flanking TL', unit: 'dB', type: 'number', default: 10, min: 0 },
      { key: 'internal_absorption', label: 'Internal absorption', type: 'number', default: 0.3, min: 0.01, max: 0.99 },
      { key: 'receiver_distance', label: 'Receiver distance', unit: 'm', type: 'number', default: 8, min: 0.1 },
      { key: 'target_level', label: 'Receiver target', unit: 'dB', type: 'number', default: 70 }
    ],
    theory: '<p>High-TL panels, low-TL ventilation openings, doors, seals, structure-borne flanks, and internal reverberation form one installed enclosure. Parallel transmission makes the weakest area disproportionately important.</p>',
    assumptions: ['Uniform internal field and independent paths.', 'One representative panel TL and flanking path.', 'No silencer self-noise or external reflections.'],
    example: 'Reduce a small open area and see a larger benefit than adding mass to an already high-TL panel.',
    compute(v) {
      const s = enclosureDesignState({ internalPowerLevel: v.internal_power_level, totalArea: v.total_area, openingArea: v.opening_area, panelTl: v.panel_tl, openingTl: v.opening_tl, flankingAreaFraction: v.flanking_area_fraction, flankingTl: v.flanking_tl, internalAbsorption: v.internal_absorption, receiverDistance: v.receiver_distance, targetLevel: v.target_level });
      return { summary: [stat('Effective installed TL', s.effectiveTl, 'dB'), stat('Exterior sound power', s.outsidePowerLevel, 'dB'), stat('Receiver level', s.receiverLevel, 'dB', s.receiverLevel <= s.targetLevel ? 'good' : 'warn'), stat('Additional TL needed', s.requiredAdditionalTl, 'dB'), stat('Controlling path', s.controllingPath)], interpretation: `The nominal ${s.panelTl.toFixed(1)} dB panel becomes ${s.effectiveTl.toFixed(1)} dB as an installed enclosure because ${s.controllingPath} dominates. The receiver is ${s.receiverLevel.toFixed(1)} dB versus a ${s.targetLevel.toFixed(1)} dB target.`, engineeringConsiderations: programChecks('Design ventilation, access, cable penetrations, doors, seals, cooling, maintenance, and structural isolation with the enclosure panel—not after it.'), warnings: [s.pathShares[1] > 0.4 ? 'Ventilation/open area dominates transmitted power; improve that path before upgrading panel mass.' : 'Check low-frequency panel modes and rigidly connected base/skid flanking.'], plots: [{ title: 'Opening area and effective enclosure TL', xLabel: 'Open area (m²)', yLabel: 'Effective TL (dB)', xScale: 'log', traces: [trace('Installed enclosure', s.openings, s.effectiveTlCurve, { emphasis: true })] }], tables: [{ title: 'Transmission path shares', columns: ['Path', 'Energy share'], rows: ['Panel field', 'Opening / ventilation', 'Structural flank'].map((name, index) => [name, s.pathShares[index]]) }] };
    }
  },
  'absorber-resonator': {
    category: 'Acoustics', basis: 'Impedance-tube reflection, reverberation-chamber decay, tube limits, and Helmholtz resonance', confidence: 'Absorber test and tuned-resonator screening model',
    inputs: [
      { key: 'tube_diameter', label: 'Impedance-tube diameter', unit: 'm', type: 'number', default: 0.1, min: 0.005 },
      { key: 'microphone_spacing', label: 'Tube microphone spacing', unit: 'm', type: 'number', default: 0.05, min: 0.002 },
      { key: 'reflection_magnitude', label: 'Reflection coefficient magnitude', type: 'number', default: 0.55, min: 0, max: 1 },
      { key: 'chamber_volume', label: 'Reverberation chamber volume', unit: 'm³', type: 'number', default: 180, min: 0.1 },
      { key: 'sample_area', label: 'Chamber sample area', unit: 'm²', type: 'number', default: 10, min: 0.01 },
      { key: 'empty_t60', label: 'Empty chamber T60', unit: 's', type: 'number', default: 5.2, min: 0.01 },
      { key: 'loaded_t60', label: 'Loaded chamber T60', unit: 's', type: 'number', default: 3.1, min: 0.01 },
      { key: 'neck_area', label: 'Resonator neck area', unit: 'm²', type: 'number', default: 0.006, min: 0.00001 },
      { key: 'cavity_volume', label: 'Resonator cavity volume', unit: 'm³', type: 'number', default: 0.03, min: 0.00001 },
      { key: 'neck_length', label: 'Physical neck length', unit: 'm', type: 'number', default: 0.05, min: 0.001 }
    ],
    theory: '<p>Impedance tubes estimate normal-incidence absorption from complex reflection; reverberation chambers infer diffuse-field absorption from decay change. Helmholtz resonators exchange neck inertance and cavity compliance.</p>',
    assumptions: ['Plane-wave tube operation and adequate microphone spacing.', 'Diffuse chamber decay and equivalent absorption area.', 'Linear lumped resonator without flow or detailed losses.'],
    example: 'Compare normal-incidence and chamber-derived absorption, then tune a neck/cavity resonance into the controlling band.',
    compute(v) {
      const s = absorberResonatorState({ tubeDiameter: v.tube_diameter, microphoneSpacing: v.microphone_spacing, reflectionMagnitude: v.reflection_magnitude, chamberVolume: v.chamber_volume, sampleArea: v.sample_area, emptyT60: v.empty_t60, loadedT60: v.loaded_t60, neckArea: v.neck_area, cavityVolume: v.cavity_volume, neckLength: v.neck_length });
      return { summary: [stat('Normal-incidence absorption', s.normalAbsorption), stat('Diffuse-field absorption', s.diffuseAbsorption), stat('Measurement difference', s.measurementDifference), stat('Tube plane-wave cutoff', s.tubeCutoff, 'Hz'), stat('Microphone-spacing limit', s.spacingLimit, 'Hz'), stat('Helmholtz frequency', s.helmholtzFrequency, 'Hz'), stat('Quarter-wave depth at tuning', s.quarterWaveDepth, 'm'), stat('Decay validity', s.validity)], interpretation: `The tube estimates α=${s.normalAbsorption.toFixed(2)} while the chamber decay estimates α=${s.diffuseAbsorption.toFixed(2)}. That difference is expected when incidence, mounting, edges, area, diffusion, and sample construction differ.`, engineeringConsiderations: programChecks('Match the test method, mounting, specimen size, backing, incidence distribution, and operating environment to the installed treatment decision.'), warnings: [s.diffuseAbsorption > 1 ? 'Apparent chamber absorption above one can arise from edge diffraction and equivalent-area conventions; do not clip it before interpreting the test.' : 'Keep tube analysis below both the plane-wave cutoff and microphone-spacing limit.'], plots: [{ title: 'Tuned resonator response screen', xLabel: 'Frequency (Hz)', yLabel: 'Relative response', xScale: 'log', traces: [trace('Helmholtz response', s.frequencies, s.resonanceCurve, { emphasis: true })] }] };
    }
  },
  'tuned-absorber-isolation': {
    category: 'Dynamics', basis: 'Two-DOF tuned mass absorber, force transmissibility, static deflection, and rotating unbalance', confidence: 'Linear single-mode tuning and isolation model',
    inputs: [
      { key: 'primary_mass', label: 'Primary mass', unit: 'kg', type: 'number', default: 180, min: 0.001 },
      { key: 'primary_frequency', label: 'Primary natural frequency', unit: 'Hz', type: 'number', default: 60, min: 0.1 },
      { key: 'primary_damping', label: 'Primary damping ratio', type: 'number', default: 0.02, min: 0.0001, max: 0.5 },
      { key: 'forcing_frequency', label: 'Forcing / running frequency', unit: 'Hz', type: 'number', default: 60, min: 0.1 },
      { key: 'mass_ratio', label: 'Absorber mass ratio', type: 'number', default: 0.05, min: 0.001, max: 0.5 },
      { key: 'tuning_ratio', label: 'Absorber / primary tuning ratio', type: 'number', default: 0.98, min: 0.2 },
      { key: 'absorber_damping', label: 'Absorber damping ratio', type: 'number', default: 0.08, min: 0, max: 0.5 },
      { key: 'isolation_frequency', label: 'Mount natural frequency', unit: 'Hz', type: 'number', default: 12, min: 0.1 },
      { key: 'isolation_damping', label: 'Mount damping ratio', type: 'number', default: 0.08, min: 0.001, max: 0.5 },
      { key: 'unbalance_mass', label: 'Rotating unbalance mass', unit: 'kg', type: 'number', default: 0.2, min: 0 },
      { key: 'eccentricity', label: 'Unbalance eccentricity', unit: 'mm', type: 'number', default: 3, min: 0 }
    ],
    theory: '<p>A tuned absorber creates a dynamic antiresonance near one forcing frequency, while resilient mounts reduce transmitted force only above their isolation crossover. Rotating-unbalance force rises with speed squared.</p>',
    assumptions: ['Linear single primary mode and one absorber.', 'Harmonic force and rigid foundation.', 'No stroke stops, nonlinear elastomer behavior, or multi-axis coupling.'],
    example: 'Detune the absorber a few percent and compare its narrowband sensitivity with the broader mount isolation curve.',
    compute(v) {
      const s = tunedAbsorberIsolationState({ primaryMass: v.primary_mass, primaryFrequency: v.primary_frequency, primaryDamping: v.primary_damping, forcingFrequency: v.forcing_frequency, massRatio: v.mass_ratio, tuningRatio: v.tuning_ratio, absorberDamping: v.absorber_damping, isolationFrequency: v.isolation_frequency, isolationDamping: v.isolation_damping, unbalanceMass: v.unbalance_mass, eccentricityMm: v.eccentricity });
      return { summary: [stat('Absorber mass', s.m2, 'kg'), stat('Tuned response reduction', s.reductionDb, 'dB', s.reductionDb > 0 ? 'good' : 'warn'), stat('Mount frequency ratio', s.frequencyRatio), stat('Mount transmissibility', s.transmissibility), stat('Static mount deflection', 1000 * s.staticDeflection, 'mm'), stat('Rotating unbalance force', s.unbalanceForce, 'N'), stat('Absorber travel screen', 1000 * s.absorberTravel, 'mm'), stat('Mount regime', s.regime)], interpretation: `The tuned absorber changes primary response by ${s.reductionDb.toFixed(1)} dB at ${s.forcingFrequency.toFixed(1)} Hz. The mount operates at r=${s.frequencyRatio.toFixed(2)} with transmissibility ${s.transmissibility.toFixed(2)} and requires about ${(1000 * s.staticDeflection).toFixed(1)} mm static deflection.`, engineeringConsiderations: programChecks('Treat tuning tolerance, temperature, payload mass change, absorber stroke, mount static load, snubbing, six-DOF modes, and transmitted force as coupled design requirements.'), warnings: [s.absorberTravel > 0.02 ? 'Predicted absorber travel is large; stroke, stops, stress, and nonlinear behavior may control.' : 'A tuned absorber is narrowband and can amplify response on either side of its antiresonance.'], plots: [{ title: 'Primary response with and without tuned absorber', xLabel: 'Frequency (Hz)', yLabel: 'Compliance (m/N)', traces: [trace('Baseline', s.frequencies, s.baselineCurve), trace('With absorber', s.frequencies, s.coupledCurve, { emphasis: true })] }] };
    }
  }
};

export const programExpansionCalculatorRegistry = createEngineeringRegistry(definitions);
