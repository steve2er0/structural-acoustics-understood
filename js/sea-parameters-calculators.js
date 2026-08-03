/* Calculators for the SEA parameter handbook expansion. */
import { createEngineeringRegistry } from './engineering-results.js';
import {
  SEA_PARAMETER_PRESETS,
  clfMechanismState,
  drivingPointImpedanceState,
  equipmentLoadingState,
  equivalentPowerInjectionState,
  installedFairingSeaState,
  modalDensityAtlasState,
  radiationEfficiencyAtlasState,
  seaParameterWorkbenchState,
  seaResponseRecoveryState,
  tblConvectionState
} from './sea-parameters-physics.js';

const stat = (label, value, unit = '', tone = '', note = '') => ({ label, value, unit, tone, note });
const trace = (name, x, y, extra = {}) => ({ name, x, y, ...extra });
const mm = value => Number(value) / 1000;
const gpa = value => Number(value) * 1e9;
const launchConsiderations = primary => [
  primary,
  'Preserve the frequency-band definition, subsystem boundary, units, direction, and parameter provenance when transferring this result into an SEA model.',
  'Replace screening or handbook values with installed-configuration test data when the design decision is sensitive to the selected parameter.'
];

const materialInputs = [
  { key: 'length', label: 'Length', unit: 'm', type: 'number', default: 2.4, min: 0.05 },
  { key: 'width', label: 'Width', unit: 'm', type: 'number', default: 1.4, min: 0.05 },
  { key: 'thickness', label: 'Thickness', unit: 'mm', type: 'number', default: 3, min: 0.02 },
  { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.01 },
  { key: 'density', label: 'Material density', unit: 'kg/m³', type: 'number', default: 2700, min: 1 },
  { key: 'poisson', label: 'Poisson ratio', type: 'number', default: 0.33, min: -0.49, max: 0.49 }
];

const materialValues = values => ({ length: values.length, width: values.width, thickness: mm(values.thickness), modulus: gpa(values.modulus), density: values.density, poisson: values.poisson });

const definitions = {
  'sea-parameter-workbench': {
    category: 'SEA & Energy',
    basis: 'Traceable geometry-to-SEA-parameter-to-response synthesis',
    confidence: 'Integrated band-screening workflow with explicit input provenance',
    inputs: [
      { key: 'preset', label: 'Launch subsystem preset', type: 'select', default: 'honeycombFairing', options: Object.entries(SEA_PARAMETER_PRESETS).map(([value, item]) => ({ value, label: item.label })) },
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'source', label: 'External excitation', type: 'select', default: 'diffuse', options: [{ value: 'diffuse', label: 'Diffuse acoustic field' }, { value: 'tbl-slow', label: 'TBL: Uc > bending speed' }, { value: 'tbl-fast', label: 'TBL: Uc < bending speed' }, { value: 'corcos', label: 'Corcos TBL' }, { value: 'point-force', label: 'Point force' }] },
      { key: 'loss_source', label: 'Dissipation-loss source', type: 'select', default: 'empirical', options: [{ value: 'empirical', label: 'Empirical construction family' }, { value: 'measured', label: 'Measured installed value' }, { value: 'assumed', label: 'Assumed screening value' }] },
      { key: 'measured_loss', label: 'Measured / assumed loss factor', type: 'number', default: 0.022, min: 0.00001 },
      { key: 'pressure', label: 'Band pressure RMS', unit: 'Pa', type: 'number', default: 200, min: 0.0001 },
      { key: 'force', label: 'Point force RMS', unit: 'N', type: 'number', default: 10, min: 0.0001 },
      { key: 'conductance', label: 'Drive-point conductance', unit: 'm/(N·s)', type: 'number', default: 0.0001, min: 1e-12 },
      { key: 'external_power', label: 'Acoustic-cavity input power', unit: 'W', type: 'number', default: 1, min: 1e-12 },
      { key: 'freestream', label: 'Free-stream velocity', unit: 'm/s', type: 'number', default: 300, min: 1 },
      { key: 'displacement_thickness', label: 'Boundary-layer displacement thickness', unit: 'mm', type: 'number', default: 12, min: 0.01 }
    ],
    theory: '<p>An SEA solve is only as defensible as its parameter chain. This workbench derives modal density, damping, radiation, coupling, equivalent power, subsystem energy, and recovered response while retaining the source of each quantity.</p>',
    assumptions: ['Steady one-third-octave band energy and linear passive response.', 'Preset geometry represents one energetically homogeneous subsystem.', 'Handbook and empirical inputs are screening values until replaced by installed evidence.'],
    example: 'Compare the honeycomb fairing and cylindrical shell presets under the same 1 kHz pressure field, then change loss-factor provenance from empirical to measured.',
    compute(values) {
      const state = seaParameterWorkbenchState({ preset: values.preset, frequency: values.frequency, source: values.source, lossSource: values.loss_source, measuredLossFactor: values.measured_loss, assumedLossFactor: values.measured_loss, pressureRms: values.pressure, forceRms: values.force, conductance: values.conductance, externalPower: values.external_power, freeStreamVelocity: values.freestream, displacementThickness: mm(values.displacement_thickness) });
      const responseLabel = state.acoustic ? 'Recovered pressure' : 'Recovered velocity';
      const responseValue = state.acoustic ? state.recovery.pressureRms : state.recovery.velocityRms;
      const responseUnit = state.acoustic ? 'Pa RMS' : 'm/s RMS';
      const warnings = [];
      if (state.modal.modesInBand < 5) warnings.push(`Only ${state.modal.modesInBand.toFixed(2)} modes occupy the selected band; the parameter chain is transitional or deterministic.`);
      if (state.modal.modalOverlap < 1) warnings.push(`Modal overlap is ${state.modal.modalOverlap.toFixed(2)}; do not use M>1 as the sole validity gate, but explicitly justify averaging and subsystem diffuse behavior.`);
      if (state.lossSource !== 'measured') warnings.push('The selected dissipation loss is not an installed measurement; sweep it and retain the resulting response range.');
      return {
        values: [stat('Modal density', state.modal.modalDensity, 'modes/Hz'), stat('Modes in band', state.modal.modesInBand), stat('Modal overlap', state.modal.modalOverlap), stat('Selected loss factor', state.selectedLossFactor), stat('Radiation efficiency', state.radiation?.totalEfficiency ?? 'Not applicable'), stat('Outgoing radiation CLF', state.coupling?.forward ?? 'Not applicable'), stat('Equivalent input power', state.externalPower, 'W'), stat('Subsystem energy', state.energy, 'J'), stat(responseLabel, responseValue, responseUnit), stat('Parameter confidence score', state.confidenceScore, '/100', state.confidenceScore < 55 ? 'warn' : 'good')],
        interpretation: `${state.preset.label} stores ${state.energy.toExponential(3)} J in the selected band and produces ${responseValue.toExponential(3)} ${responseUnit}. The controlling credibility issue is ${state.modal.readiness}; the loss factor is ${state.lossSource}.`,
        engineeringConsiderations: launchConsiderations('Use this chain as the audit record for a fairing, shell bay, deck, equipment panel, or cavity: a response change must be traceable to geometry, excitation, damping, radiation, or coupling rather than an unexplained tuning factor.'),
        warnings,
        plots: [{ title: 'Modal density around the selected band', xLabel: 'Frequency (Hz)', yLabel: 'Modal density (modes/Hz)', xScale: 'log', yScale: 'log', traces: [trace(state.modal.basis, state.modal.frequencies, state.modal.curve, { emphasis: true })] }],
        tables: [{ title: 'SEA parameter provenance', columns: ['Parameter block', 'Source class', 'Selected basis'], rows: state.provenance }]
      };
    }
  },

  'modal-density-atlas': {
    category: 'SEA & Energy',
    basis: 'One-, two-, and three-dimensional acoustic and structural modal-density relations',
    confidence: 'Analytical asymptotic relations with stated boundary and wave-family assumptions',
    inputs: [
      { key: 'type', label: 'Subsystem / wave family', type: 'select', default: 'plate-bending', options: [
        { value: 'acoustic-1d', label: 'Acoustic 1D pipe' }, { value: 'acoustic-2d', label: 'Acoustic 2D cavity' }, { value: 'acoustic-3d', label: 'Acoustic 3D cavity' },
        { value: 'beam-bending', label: 'Beam bending' }, { value: 'beam-longitudinal', label: 'Beam longitudinal' }, { value: 'plate-bending', label: 'Rectangular plate bending' },
        { value: 'plate-inplane', label: 'Plate in-plane' }, { value: 'circular-plate', label: 'Circular plate bending' }, { value: 'honeycomb', label: 'Honeycomb sandwich' }, { value: 'cylinder', label: 'Unstiffened cylinder' }
      ] },
      { key: 'boundary', label: 'Plate boundary', type: 'select', default: 'simply-supported', options: [{ value: 'generic', label: 'Asymptotic / generic' }, { value: 'simply-supported', label: 'Simply supported' }, { value: 'free', label: 'Free' }, { value: 'clamped', label: 'Fully clamped' }] },
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'loss_factor', label: 'Loss factor', type: 'number', default: 0.02, min: 0.000001 },
      { key: 'height', label: 'Cavity height / depth', unit: 'm', type: 'number', default: 1.5, min: 0.001 },
      { key: 'radius', label: 'Cylinder radius', unit: 'm', type: 'number', default: 1.8, min: 0.01 },
      { key: 'sound_speed', label: 'Acoustic sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 },
      ...materialInputs,
      { key: 'face_thickness', label: 'Honeycomb face thickness', unit: 'mm', type: 'number', default: 0.6, min: 0.01 },
      { key: 'core_thickness', label: 'Honeycomb core thickness', unit: 'mm', type: 'number', default: 24.8, min: 0.1 },
      { key: 'core_shear', label: 'Core shear modulus', unit: 'MPa', type: 'number', default: 85, min: 0.01 }
    ],
    theory: '<p>Modal density counts resonances per hertz for a selected wave family. Dimensionality, boundary corrections, shear dispersion, curvature, and wave type determine whether the density is constant, rises with frequency, or changes regime.</p>',
    assumptions: ['Uniform subsystem geometry and material properties.', 'Asymptotic mode counting rather than exact low-order eigensolutions.', 'Each wave family is counted consistently and not combined without an explicit energy model.'],
    example: 'Move an acoustic gap from 2D to 3D at its cross-gap cut-on, or compare plate bending with plate in-plane density in the same fairing bay.',
    compute(values) {
      const state = modalDensityAtlasState({ ...materialValues(values), type: values.type, boundary: values.boundary, frequency: values.frequency, lossFactor: values.loss_factor, height: values.height, radius: values.radius, soundSpeed: values.sound_speed, faceThickness: mm(values.face_thickness), coreThickness: mm(values.core_thickness), coreShearModulus: Number(values.core_shear) * 1e6 });
      const warnings = [];
      if (state.modesInBand < 5) warnings.push('Fewer than five modes occupy the one-third-octave band; use exact modes or hybrid FE–SEA evidence near this frequency.');
      if (state.transitionFrequency && Math.abs(Math.log2(state.frequency / state.transitionFrequency)) < 0.5) warnings.push('The selected band lies within half an octave of a dimensional, shear, or ring-frequency transition; bracket both adjacent models.');
      return {
        values: [stat('Modal density', state.modalDensity, 'modes/Hz'), stat('Average modal spacing', state.averageSpacing, 'Hz'), stat('Modes in one-third-octave band', state.modesInBand), stat('Modal overlap', state.modalOverlap), stat('Wave speed', state.waveSpeed, 'm/s'), stat('Wavelength', state.wavelength, 'm'), stat('Dimensionality', `${state.dimension}D`), stat('Transition frequency', state.transitionFrequency ?? 'Not defined', state.transitionFrequency ? 'Hz' : '')],
        interpretation: `${state.basis} gives ${state.modalDensity.toExponential(3)} modes/Hz and ${state.modesInBand.toFixed(2)} modes in the selected band. This is a ${state.readiness}.`,
        engineeringConsiderations: launchConsiderations('Partition fairing cavities, shells, honeycomb bays, beams, decks, and in-plane junction waves separately; one subsystem can be statistically dense in bending and sparse in extension at the same frequency.'),
        warnings,
        plots: [{ title: 'Modal-density atlas', xLabel: 'Frequency (Hz)', yLabel: 'Modal density (modes/Hz)', xScale: 'log', yScale: 'log', traces: [trace(state.basis, state.frequencies, state.curve, { emphasis: true })] }]
      };
    }
  },

  'sea-impedance-library': {
    category: 'SEA & Energy',
    basis: 'Analytical driving-point impedance and high-frequency mobility relations',
    confidence: 'Closed-form infinite/member/shell screening relations',
    inputs: [
      { key: 'model', label: 'Mobility model', type: 'select', default: 'plate-center', options: [{ value: 'plate-center', label: 'Thin plate, center' }, { value: 'plate-edge', label: 'Thin plate, edge' }, { value: 'cylindrical-shell', label: 'Unstiffened cylinder' }, { value: 'rod-longitudinal', label: 'Semi-infinite rod' }, { value: 'high-frequency-general', label: 'General Y=n/(4M)' }] },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'radius', label: 'Cylinder radius', unit: 'm', type: 'number', default: 1.8, min: 0.01 },
      { key: 'modal_density', label: 'Modal density', unit: 'modes/Hz', type: 'number', default: 0.04, min: 1e-8 },
      { key: 'mass', label: 'Subsystem mass', unit: 'kg', type: 'number', default: 120, min: 0.001 },
      { key: 'force', label: 'RMS point force', unit: 'N', type: 'number', default: 10, min: 0.001 },
      ...materialInputs
    ],
    theory: '<p>Driving-point mobility converts force into velocity and its real part converts force squared into injected power. Plate center, plate edge, shell, rod, and modal-density averages represent different load-spreading mechanisms.</p>',
    assumptions: ['Real high-frequency impedance with no narrow individual resonances.', 'Uniform plate, rod, or unstiffened cylindrical shell.', 'Point attachment is small relative to wavelength and the model geometry.'],
    example: 'Compare plate center and edge mobility, then switch a fairing barrel through its fundamental and ring-frequency shell regimes.',
    compute(values) {
      const state = drivingPointImpedanceState({ ...materialValues(values), model: values.model, frequency: values.frequency, radius: values.radius, modalDensity: values.modal_density, mass: values.mass, forceRms: values.force });
      return {
        values: [stat('Mechanical impedance', state.impedance, 'N·s/m'), stat('Driving-point mobility', state.mobility, 'm/(N·s)'), stat('Conductance', state.conductance, 'm/(N·s)'), stat('Point-force input power', state.inputPower, 'W'), stat('Shell fundamental scale', state.firstFrequency ?? 'Not applicable', state.firstFrequency ? 'Hz' : ''), stat('Shell ring frequency', state.model === 'cylindrical-shell' ? state.ringFrequency : 'Not applicable', state.model === 'cylindrical-shell' ? 'Hz' : '')],
        interpretation: `${state.basis} gives Y=${state.mobility.toExponential(3)} m/(N·s). The entered force injects ${state.inputPower.toExponential(3)} W when the real-conductance assumption is valid.`,
        engineeringConsiderations: launchConsiderations('Use the mobility at engine, actuator, bracket, umbilical, or equipment interfaces to convert force into power; do not substitute a transfer FRF magnitude for drive-point conductance.'),
        warnings: ['Individual resonances, attachment compliance, finite boundaries, shell frames, and complex phase can make measured mobility depart strongly from the high-frequency real-valued screen.'],
        plots: [{ title: 'Driving-point mobility versus frequency', xLabel: 'Frequency (Hz)', yLabel: 'Mobility (m/N·s)', xScale: 'log', yScale: 'log', traces: [trace(state.basis, state.frequencies, state.mobilityCurve, { emphasis: true })] }]
      };
    }
  },

  'clf-mechanism-library': {
    category: 'SEA & Energy',
    basis: 'Mechanism-specific analytical coupling loss factors with reciprocity',
    confidence: 'Closed-form beam, plate, point, line, bolt, radiation, and mass-law screens',
    inputs: [
      { key: 'mechanism', label: 'Coupling mechanism', type: 'select', default: 'panel-air', options: [{ value: 'l-beam', label: 'L-beam wave conversion' }, { value: 'l-plates', label: 'L-shaped plates' }, { value: 'point-bridge', label: 'Point bridge' }, { value: 'bolted-plates', label: 'Bolted plates' }, { value: 'line-joint', label: 'Plate line joint' }, { value: 'panel-air', label: 'Panel-to-air radiation' }, { value: 'fairing-masslaw', label: 'Fairing nonresonant path' }] },
      { key: 'wave_conversion', label: 'L-beam conversion', type: 'select', default: 'bb', options: [{ value: 'bb', label: 'Bending → bending' }, { value: 'bl', label: 'Bending ↔ longitudinal' }, { value: 'll', label: 'Longitudinal → longitudinal' }] },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'modal_density_1', label: 'Subsystem 1 modal density', unit: 'modes/Hz', type: 'number', default: 0.04, min: 1e-8 },
      { key: 'modal_density_2', label: 'Subsystem 2 modal density', unit: 'modes/Hz', type: 'number', default: 0.18, min: 1e-8 },
      { key: 'internal_loss', label: 'Subsystem 1 internal loss', type: 'number', default: 0.02, min: 1e-8 },
      { key: 'transmission', label: 'Junction transmission coefficient', type: 'number', default: 0.15, min: 0, max: 1 },
      { key: 'junction_length', label: 'Junction length', unit: 'm', type: 'number', default: 1.4, min: 0.001 },
      { key: 'point_count', label: 'Bolts / point bridges', type: 'number', default: 12, min: 1, step: 1 },
      { key: 'impedance_1', label: 'Point impedance 1', unit: 'N·s/m', type: 'number', default: 4000, min: 0.001 },
      { key: 'impedance_2', label: 'Point impedance 2', unit: 'N·s/m', type: 'number', default: 7500, min: 0.001 },
      { key: 'radiation_efficiency', label: 'Radiation efficiency', type: 'number', default: 0.35, min: 0.000001 },
      { key: 'transmission_loss', label: 'Mass-law TL', unit: 'dB', type: 'number', default: 28 },
      { key: 'volume', label: 'Acoustic volume', unit: 'm³', type: 'number', default: 60, min: 0.001 },
      { key: 'thickness_2', label: 'Receiving-plate thickness', unit: 'mm', type: 'number', default: 4, min: 0.02 },
      ...materialInputs
    ],
    theory: '<p>A CLF is not a generic percentage. It embeds wave transmission, conductance or radiation resistance, junction extent, modal density, direction, and subsystem energy normalization.</p>',
    assumptions: ['Linear passive reciprocal junction.', 'Subsystems retain identifiable diffuse modal energy.', 'The selected ideal mechanism dominates the modeled connection.'],
    example: 'Compare a continuous frame joint with twelve discrete bolts, then convert a fairing mass-law transmission path into an acoustic CLF.',
    compute(values) {
      const state = clfMechanismState({ ...materialValues(values), mechanism: values.mechanism, waveConversion: values.wave_conversion, frequency: values.frequency, modalDensity1: values.modal_density_1, modalDensity2: values.modal_density_2, internalLossFactor: values.internal_loss, transmission: values.transmission, junctionLength: values.junction_length, pointCount: values.point_count, impedance1: values.impedance_1, impedance2: values.impedance_2, radiationEfficiency: values.radiation_efficiency, transmissionLoss: values.transmission_loss, volume: values.volume, thickness2: mm(values.thickness_2) });
      const warnings = [];
      if (state.couplingToLossRatio > 0.5) warnings.push('The forward CLF exceeds half the internal loss factor; weak-coupling and subsystem-identity assumptions need explicit validation.');
      if (values.mechanism === 'fairing-masslaw') warnings.push('The transmission coefficient is evaluated as 10^(−TL/10); a positive exponent would violate the positive-TL convention and is a known source-transcription risk.');
      return {
        values: [stat('Forward CLF η₁₂', state.forward), stat('Reciprocal reverse CLF η₂₁', state.reverse), stat('Transmission / efficiency factor', state.coefficient), stat('Forward CLF / internal loss', state.couplingToLossRatio), stat('Reciprocity residual', state.reciprocityResidual, '', Math.abs(state.reciprocityResidual) > 1e-10 ? 'warn' : 'good')],
        interpretation: `${state.basis} produces η₁₂=${state.forward.toExponential(3)} and reciprocal η₂₁=${state.reverse.toExponential(3)}. The modal-density ratio—not an assumption of equal directional CLFs—sets the reverse value.`,
        engineeringConsiderations: launchConsiderations('Assign separate mechanisms to fairing frames, longerons, bolted equipment interfaces, line joints, point bridges, panel-air radiation, and nonresonant transmission; parallel paths must remain explicit.'),
        warnings
      };
    }
  },

  'equivalent-power-injection': {
    category: 'SEA & Energy',
    basis: 'Diffuse-field, turbulent-boundary-layer, Corcos, and point-force power conversion',
    confidence: 'Analytical band-power screen with empirical TBL acceptance parameters',
    inputs: [
      { key: 'source', label: 'Excitation source', type: 'select', default: 'diffuse', options: [{ value: 'diffuse', label: 'Diffuse acoustic field' }, { value: 'tbl-slow', label: 'TBL: Uc > bending speed' }, { value: 'tbl-fast', label: 'TBL: Uc < bending speed' }, { value: 'corcos', label: 'Corcos TBL' }, { value: 'point-force', label: 'Point force' }] },
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'pressure', label: 'Band pressure RMS', unit: 'Pa', type: 'number', default: 200, min: 0.0001 },
      { key: 'modal_density', label: 'Structural modal density', unit: 'modes/Hz', type: 'number', default: 0.04, min: 1e-8 },
      { key: 'radiation_efficiency', label: 'Radiation efficiency', type: 'number', default: 0.35, min: 1e-8 },
      { key: 'convection_velocity', label: 'Convection velocity', unit: 'm/s', type: 'number', default: 220, min: 1 },
      { key: 'alpha_x', label: 'Corcos streamwise coefficient', type: 'number', default: 0.12, min: 0.001 },
      { key: 'alpha_z', label: 'Corcos lateral coefficient', type: 'number', default: 0.7, min: 0.001 },
      { key: 'force', label: 'Point force RMS', unit: 'N', type: 'number', default: 10, min: 0.001 },
      { key: 'conductance', label: 'Drive-point conductance', unit: 'm/(N·s)', type: 'number', default: 0.0001, min: 1e-12 },
      ...materialInputs
    ],
    theory: '<p>SEA requires watts per band, while environments are commonly specified as pressure, pressure PSD, or force. Equivalent-power relations apply the modal, radiation, mobility, phase-speed, and spatial-coherence filters that determine how much of the environment actually enters the subsystem.</p>',
    assumptions: ['Stationary band-limited random excitation.', 'Uniform panel or cylinder represented by plate wave properties.', 'TBL coefficients and convection velocity match the applicable flow state.'],
    example: 'Compare diffuse liftoff acoustics with attached-flow ascent TBL at the same pressure RMS; the accepted structural power need not rank the same as pressure level.',
    compute(values) {
      const state = equivalentPowerInjectionState({ ...materialValues(values), source: values.source, frequency: values.frequency, pressureRms: values.pressure, modalDensity: values.modal_density, radiationEfficiency: values.radiation_efficiency, convectionVelocity: values.convection_velocity, alphaX: values.alpha_x, alphaZ: values.alpha_z, forceRms: values.force, conductance: values.conductance });
      const warnings = [];
      if (values.source.includes('tbl') || values.source === 'corcos') warnings.push('TBL power can vary by factors of three or more with flow state, mode shape, Corcos coefficients, and convection model; carry those as explicit uncertainty.');
      if (state.acceptance > 1 && values.source !== 'point-force') warnings.push('Equivalent injected power exceeds the plane-wave incident-power reference; verify pressure convention, modal density, bandwidth, and the field model rather than clipping the result.');
      return {
        values: [stat('Equivalent injected power', state.injectedPower, 'W'), stat('Incident acoustic-power reference', state.incidentAcousticPower, 'W'), stat('Accepted / incident reference', state.acceptance), stat('Panel bending phase speed', state.phaseSpeed, 'm/s'), stat('Convection / bending speed', state.convectionVelocity / state.phaseSpeed), stat('Streamwise correlation length', state.correlationLengthX, 'm'), stat('Lateral correlation length', state.correlationLengthZ, 'm'), stat('Aerodynamic-coincidence frequency', state.coincidenceFrequency, 'Hz')],
        interpretation: `${state.basis} injects ${state.injectedPower.toExponential(3)} W into the selected band. ${state.regime}; pressure level alone therefore does not determine the structural SEA source power.`,
        engineeringConsiderations: launchConsiderations('Use diffuse acoustic conversion for liftoff/reverberant fields, Corcos or TBL relations for attached ascent flow, separated-flow bounds where applicable, and conductance for localized engine or equipment forces.'),
        warnings,
        plots: [{ title: 'Injected power versus convection velocity', xLabel: 'Convection velocity (m/s)', yLabel: 'Injected power (W)', xScale: 'log', yScale: 'log', traces: [trace(state.source, state.velocities, state.velocityCurve, { emphasis: true })] }]
      };
    }
  },

  'tbl-convection-model': {
    category: 'Aero / Distributed Loads',
    basis: 'Constant, Totaro, attached-flow, and separated-flow convection-velocity models',
    confidence: 'Exact Totaro relation plus clearly labeled screening envelopes',
    inputs: [
      { key: 'model', label: 'Convection model', type: 'select', default: 'totaro', options: [{ value: 'constant', label: 'Constant fraction' }, { value: 'totaro', label: 'Totaro frequency-dependent' }, { value: 'attached-envelope', label: 'Attached-flow envelope' }, { value: 'separated-envelope', label: 'Separated-flow envelope' }] },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'freestream', label: 'Free-stream velocity', unit: 'm/s', type: 'number', default: 300, min: 1 },
      { key: 'displacement_thickness', label: 'Displacement thickness', unit: 'mm', type: 'number', default: 12, min: 0.001 },
      { key: 'fixed_fraction', label: 'Constant Uc/U∞', type: 'number', default: 0.75, min: 0.1, max: 1.2 }
    ],
    theory: '<p>Convection velocity controls TBL phase, correlation lengths, convective wavelength, modal acceptance, and injected power. The Totaro relation moves from approximately U∞ at low reduced frequency toward 0.6U∞ at high reduced frequency.</p>',
    assumptions: ['Locally defined external velocity and displacement thickness.', 'Stationary boundary layer over the selected band.', 'Attached/separated envelopes are sensitivity models, not substitutes for flight or CFD-derived wall-pressure data.'],
    example: 'Compare the Totaro curve with a constant 0.75U∞ model, then switch to the separated-flow envelope for a shoulder or protuberance region.',
    compute(values) {
      const state = tblConvectionState({ model: values.model, frequency: values.frequency, freeStreamVelocity: values.freestream, displacementThickness: mm(values.displacement_thickness), fixedFraction: values.fixed_fraction });
      return {
        values: [stat('Convection velocity', state.convectionVelocity, 'm/s'), stat('Convection fraction Uc/U∞', state.convectionFraction), stat('Convective wavenumber', state.convectiveWavenumber, 'rad/m'), stat('Convective wavelength', state.convectiveWavelength, 'm'), stat('Reduced frequency ωδ*/U∞', state.reducedFrequency), stat('Flow-model regime', state.flowRegime)],
        interpretation: `${state.flowRegime} gives Uc=${state.convectionVelocity.toFixed(1)} m/s (${state.convectionFraction.toFixed(3)}U∞) at ${state.frequency.toFixed(0)} Hz. This value moves both the Corcos coherence lengths and the modal wavenumber match.`,
        engineeringConsiderations: launchConsiderations('Select convection behavior by vehicle station and flight event: smooth attached acreage, protuberance wakes, shoulders, separated regions, and buffet zones should not share one unqualified Uc/U∞ value.'),
        warnings: [values.model.includes('envelope') ? 'The attached/separated option is a screening envelope. Replace it with program flow data or a cited wall-pressure model for flight prediction.' : 'Even a cited convection relation does not define wall-pressure PSD or coherence coefficients; those inputs require separate evidence.'],
        plots: [{ title: 'TBL convection velocity versus frequency', xLabel: 'Frequency (Hz)', yLabel: 'Convection velocity (m/s)', xScale: 'log', traces: [trace(state.flowRegime, state.frequencies, state.velocities, { emphasis: true })] }]
      };
    }
  },

  'equipment-loading': {
    category: 'SEA & Energy',
    basis: 'Global mass-ratio and local footprint-area response corrections',
    confidence: 'Exact algebra within the added-inertial-mass screening model',
    inputs: [
      { key: 'unloaded_response', label: 'Unloaded response RMS', unit: 'g', type: 'number', default: 12, min: 0.0001 },
      { key: 'structure_mass', label: 'Bare structure mass', unit: 'kg', type: 'number', default: 180, min: 0.001 },
      { key: 'equipment_mass', label: 'Added equipment mass', unit: 'kg', type: 'number', default: 45, min: 0 },
      { key: 'surface_mass', label: 'Local structural surface mass', unit: 'kg/m²', type: 'number', default: 12, min: 0.001 },
      { key: 'footprint_area', label: 'Equipment footprint area', unit: 'm²', type: 'number', default: 0.35, min: 0.0001 }
    ],
    theory: '<p>Added equipment reduces an ideal mean-square response through either total subsystem mass or local footprint mass per area. The two corrections answer different smearing questions and can diverge dramatically.</p>',
    assumptions: ['Equipment behaves as added inertia without a local resonance.', 'Bare and loaded responses use consistent spectral or RMS conventions.', 'No attachment compliance, dynamic absorber effect, or load-path redistribution.'],
    example: 'Keep equipment mass fixed and shrink its footprint: the local-area method predicts stronger local inertial reduction while the global method is unchanged.',
    compute(values) {
      const state = equipmentLoadingState({ unloadedResponse: values.unloaded_response, bareStructureMass: values.structure_mass, equipmentMass: values.equipment_mass, structureSurfaceMass: values.surface_mass, footprintArea: values.footprint_area });
      return {
        values: [stat('Global mass-ratio response', state.globalResponse, 'g RMS'), stat('Local footprint response', state.localResponse, 'g RMS'), stat('Conservative screened response', state.conservativeResponse, 'g RMS'), stat('Global mean-square factor', state.globalMeanSquareFactor), stat('Local mean-square factor', state.localMeanSquareFactor), stat('Equipment footprint density', state.equipmentAreaDensity, 'kg/m²'), stat('Method spread', state.methodSpreadDb, 'dB')],
        interpretation: `The global and footprint methods predict ${state.globalResponse.toFixed(2)} and ${state.localResponse.toFixed(2)} g RMS. The ${state.methodSpreadDb.toFixed(1)} dB spread is a model-form decision, not random numerical scatter.`,
        engineeringConsiderations: launchConsiderations('Use the global result as the conservative smearing screen for fairing/deck averages, but resolve local equipment feet, panels, inserts, and attachment modes when footprint loading drives qualification response.'),
        warnings: [state.localMassRatio > 5 ? 'Equipment mass per footprint area greatly exceeds the panel surface mass; attachment stiffness and local modes are likely more important than a pure inertial correction.' : 'Confirm that the equipment behaves as attached mass rather than an independently resonant subsystem.']
      };
    }
  },

  'sea-response-recovery': {
    category: 'SEA & Energy',
    basis: 'Subsystem energy recovery with statistical maximum-response concentration',
    confidence: 'Exact energy recovery plus statistical concentration relations within diffuse-band assumptions',
    inputs: [
      { key: 'kind', label: 'Subsystem type', type: 'select', default: 'structural', options: [{ value: 'structural', label: 'Structural' }, { value: 'acoustic', label: 'Acoustic' }] },
      { key: 'response_type', label: 'Concentration case', type: 'select', default: 'broadband', options: [{ value: 'broadband', label: 'Broadband' }, { value: 'pure-tone', label: 'Pure tone' }] },
      { key: 'energy', label: 'Band subsystem energy', unit: 'J', type: 'number', default: 0.02, min: 1e-12 },
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'mass', label: 'Structural mass', unit: 'kg', type: 'number', default: 120, min: 0.001 },
      { key: 'volume', label: 'Acoustic volume', unit: 'm³', type: 'number', default: 45, min: 0.001 },
      { key: 'modal_density', label: 'Modal density', unit: 'modes/Hz', type: 'number', default: 0.04, min: 1e-8 },
      { key: 'loss_factor', label: 'Net loss factor', type: 'number', default: 0.02, min: 1e-8 },
      { key: 'dimension', label: 'Subsystem dimension', type: 'select', default: '2', options: [{ value: '1', label: '1D' }, { value: '2', label: '2D' }, { value: '3', label: '3D' }] },
      { key: 'wavelength', label: 'Relevant wavelength', unit: 'm', type: 'number', default: 0.5, min: 0.0001 },
      { key: 'boundary_distance', label: 'Distance from boundary', unit: 'm', type: 'number', default: 0.2, min: 0 },
      ...materialInputs
    ],
    theory: '<p>SEA solves spatially averaged band energy. Mass or acoustic compressibility recovers velocity and pressure, while statistical concentration estimates how a local maximum can exceed the subsystem average. Boundary regions remain biased within roughly one-quarter wavelength.</p>',
    assumptions: ['Diffuse statistical mode ensemble with consistent spatial averaging.', 'Broadband or pure-tone concentration relation selected correctly.', 'Structural stress recovery uses thin isotropic bending and a representative bending wavenumber.'],
    example: 'Move a payload attachment from the subsystem interior to within a quarter wavelength of a boundary and compare broadband with pure-tone concentration.',
    compute(values) {
      const state = seaResponseRecoveryState({ ...materialValues(values), kind: values.kind, responseType: values.response_type, energy: values.energy, frequency: values.frequency, mass: values.mass, volume: values.volume, modalDensity: values.modal_density, lossFactor: values.loss_factor, dimension: Number(values.dimension), wavelength: values.wavelength, boundaryDistance: values.boundary_distance });
      const warnings = [];
      if (state.boundaryRegion) warnings.push('The response location is within one-quarter wavelength of a boundary; the interior spatial-average concentration relation may be biased.');
      if (state.participatingModes < 1) warnings.push('The effective participating-mode count is below one; use deterministic modal response rather than interpreting the statistical maximum literally.');
      return {
        values: [stat('Spatial-average velocity', state.velocityRms, 'm/s RMS'), stat('Spatial-average acceleration', state.accelerationRms, 'm/s² RMS'), stat('Acoustic pressure', state.pressureRms ?? 'Not applicable', state.pressureRms === null ? '' : 'Pa RMS'), stat('Sound pressure level', state.levelDb ?? 'Not applicable', state.levelDb === null ? '' : 'dB SPL'), stat('Bending stress screen', state.bendingStressRms ?? 'Not applicable', state.bendingStressRms === null ? '' : 'Pa RMS'), stat('Concentration amplitude factor', state.concentrationAmplitudeFactor), stat('Estimated local velocity maximum', state.localVelocityEstimate, 'm/s RMS-equivalent'), stat('Effective participating modes', state.participatingModes), stat('Boundary region', state.boundaryRegion ? 'Inside λ/4' : 'Interior screen')],
        interpretation: `The spatial-average velocity is ${state.velocityRms.toExponential(3)} m/s RMS, while the ${state.responseType} concentration model gives a ${state.concentrationAmplitudeFactor.toFixed(2)}× local-amplitude factor. ${state.boundaryRegion ? 'The selected point is also inside the boundary-bias region.' : 'The selected point passes the interior-distance screen.'}`,
        engineeringConsiderations: launchConsiderations('Translate SEA averages into payload equipment, bracket, panel, and cavity design quantities explicitly; qualification limits are often local while the analysis state variable is an ensemble/spatial average.'),
        warnings
      };
    }
  },

  'radiation-efficiency-atlas': {
    category: 'Structural Acoustics',
    basis: 'Baffled, freely suspended, honeycomb, ribbed, shell, and forced radiation-efficiency relations',
    confidence: 'Analytical and heritage empirical screening models',
    inputs: [
      { key: 'model', label: 'Radiator model', type: 'select', default: 'baffled-panel', options: [{ value: 'baffled-panel', label: 'Homogeneous baffled panel' }, { value: 'free-panel', label: 'Freely suspended panel' }, { value: 'honeycomb', label: 'Honeycomb sandwich' }, { value: 'ribbed-panel', label: 'Ribbed panel' }, { value: 'cylindrical-shell', label: 'Cylindrical shell' }, { value: 'forced-field', label: 'Panel plus point-drive field' }] },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'loss_factor', label: 'Loss factor', type: 'number', default: 0.02, min: 1e-8 },
      { key: 'radius', label: 'Shell radius', unit: 'm', type: 'number', default: 1.8, min: 0.01 },
      { key: 'rib_length', label: 'Total rib length', unit: 'm', type: 'number', default: 8, min: 0 },
      { key: 'point_impedance', label: 'Point-drive impedance', unit: 'N·s/m', type: 'number', default: 5000, min: 0.001 },
      { key: 'reverberation_time', label: 'Structural reverberation time', unit: 's', type: 'number', default: 0.25, min: 0.001 },
      ...materialInputs
    ],
    theory: '<p>Radiation efficiency converts mean-square surface velocity into sound power, while radiation resistance and panel-air CLF place the same mechanism into mechanical and SEA energy language.</p>',
    assumptions: ['Uniform ideal panel or unstiffened cylinder.', 'Quiescent air and band-averaged radiation.', 'Ribbed, shell, and forced components are heritage screening models rather than full FE/BE radiation solutions.'],
    example: 'Compare a baffled homogeneous fairing bay with honeycomb, ribbed, shell, and local point-drive descriptions across ring and critical frequencies.',
    compute(values) {
      const state = radiationEfficiencyAtlasState({ ...materialValues(values), model: values.model, frequency: values.frequency, lossFactor: values.loss_factor, radius: values.radius, ribLength: values.rib_length, pointImpedance: values.point_impedance, reverberationTime: values.reverberation_time });
      return {
        values: [stat('Radiation efficiency', state.totalEfficiency), stat('Forced-field component', state.forcedEfficiency), stat('Radiation resistance', state.radiationResistance, 'N·s/m'), stat('Panel-to-air CLF', state.panelAirClf), stat('Critical frequency', state.criticalFrequency, 'Hz'), stat('Fundamental panel frequency', state.fundamentalFrequency, 'Hz'), stat('Shell ring frequency', state.model === 'cylindrical-shell' ? state.ringFrequency : 'Not applicable', state.model === 'cylindrical-shell' ? 'Hz' : ''), stat('Radiation regime', state.regime)],
        interpretation: `${state.model.replaceAll('-', ' ')} radiation gives σ=${state.totalEfficiency.toFixed(3)} and ηpanel→air=${state.panelAirClf.toExponential(3)} in the ${state.regime} regime. Motion, radiated power, and radiation loss are therefore three related but distinct quantities.`,
        engineeringConsiderations: launchConsiderations('Use shell behavior around ring frequency, honeycomb dispersion, ribs/frames, and localized drive fields when converting fairing or equipment-panel vibration into payload-cavity sound.'),
        warnings: ['Finite frames, cutouts, blankets, curvature, orthotropy, unbaffled edges, and coherent low-order modes can shift radiation by orders of magnitude; compare with measured or FE/BE radiation where the path controls design.'],
        plots: [{ title: 'Radiation-efficiency atlas', xLabel: 'Frequency (Hz)', yLabel: 'Radiation efficiency', xScale: 'log', yScale: 'log', traces: [trace(state.model, state.frequencies, state.curve, { emphasis: true })] }]
      };
    }
  },

  'installed-fairing-sea': {
    category: 'SEA & Energy',
    basis: 'Exterior–shell–payload-cavity SEA with resonant, nonresonant, blanket, leak, and equipment effects',
    confidence: 'Exact energy balance for a three-subsystem screening network with derived band parameters',
    inputs: [
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'outside_level', label: 'Exterior acoustic level', unit: 'dB SPL', type: 'number', default: 145 },
      { key: 'area', label: 'Fairing radiating area', unit: 'm²', type: 'number', default: 55, min: 0.1 },
      { key: 'volume', label: 'Payload cavity volume', unit: 'm³', type: 'number', default: 75, min: 0.1 },
      { key: 'surface_mass', label: 'Fairing surface mass', unit: 'kg/m²', type: 'number', default: 8.5, min: 0.01 },
      { key: 'shell_modal_density', label: 'Shell modal density', unit: 'modes/Hz', type: 'number', default: 0.045, min: 1e-8 },
      { key: 'shell_loss', label: 'Shell loss factor', type: 'number', default: 0.018, min: 1e-8 },
      { key: 'radiation_efficiency', label: 'Shell radiation efficiency', type: 'number', default: 0.35, min: 1e-8 },
      { key: 'blanket_coverage', label: 'Blanket coverage', unit: '%', type: 'number', default: 80, min: 0, max: 100 },
      { key: 'blanket_il', label: 'Measured blanket insertion loss', unit: 'dB', type: 'number', default: 18, min: 0 },
      { key: 'blanket_absorption', label: 'Blanket absorption coefficient', type: 'number', default: 0.65, min: 0, max: 1 },
      { key: 'equipment_mass', label: 'Installed equipment mass', unit: 'kg', type: 'number', default: 250, min: 0 },
      { key: 'leak_fraction', label: 'Leak / opening area fraction', unit: '%', type: 'number', default: 0.05, min: 0, max: 20 }
    ],
    theory: '<p>Installed payload-cavity attenuation combines resonant shell–air coupling, nonresonant mass-law transmission, blanket coverage and absorption, leakage, equipment-loaded shell velocity, and cavity loss. Component TL and installed noise reduction are deliberately reported separately.</p>',
    assumptions: ['Diffuse exterior and interior acoustic subsystems.', 'One statistically homogeneous shell subsystem.', 'Blanket IL is a power-transmission reduction and coverage is spatially uniform.'],
    example: 'Increase blanket coverage until leakage becomes dominant, then add equipment mass and observe that shell velocity and installed NR change through different mechanisms.',
    compute(values) {
      const state = installedFairingSeaState({ frequency: values.frequency, outsideLevel: values.outside_level, area: values.area, interiorVolume: values.volume, surfaceMass: values.surface_mass, shellModalDensity: values.shell_modal_density, shellLossFactor: values.shell_loss, radiationEfficiency: values.radiation_efficiency, blanketCoverage: Number(values.blanket_coverage) / 100, blanketInsertionLoss: values.blanket_il, blanketAbsorption: values.blanket_absorption, equipmentMass: values.equipment_mass, leakAreaFraction: Number(values.leak_fraction) / 100 });
      const warnings = [];
      if (state.directPower > state.resonantPower) warnings.push('The nonresonant/leak path carries more net power than the resonant shell path; further shell damping or radiation improvement will have limited installed benefit.');
      if (state.network.subsystemResults.some(item => item.modesInBand < 5)) warnings.push('At least one subsystem has fewer than five modes in band; replace it with a deterministic or hybrid representation where local response matters.');
      return {
        values: [stat('Component mass-law TL', state.componentMassLawTl, 'dB'), stat('Installed noise reduction', state.installedNoiseReduction, 'dB'), stat('Payload-cavity level', state.receiverLevel, 'dB SPL'), stat('Equipment-loaded shell velocity', state.shellVelocity, 'm/s RMS'), stat('Resonant shell-path power', state.resonantPower, 'W'), stat('Direct / nonresonant power', state.directPower, 'W'), stat('Effective blanket/opening transmission', state.effectiveTransmission), stat('Interior acoustic loss factor', state.interiorLoss), stat('Network power-balance error', 100 * state.network.balanceError, '%', Math.abs(state.network.balanceError) > 1e-6 ? 'warn' : 'good')],
        interpretation: `The fairing has ${state.componentMassLawTl.toFixed(1)} dB component mass-law TL but only ${state.installedNoiseReduction.toFixed(1)} dB installed source-to-cavity reduction. The payload cavity reaches ${state.receiverLevel.toFixed(1)} dB SPL, with ${state.directPower > state.resonantPower ? 'the direct/nonresonant path' : 'the resonant shell path'} carrying the larger net power.`,
        engineeringConsiderations: launchConsiderations('Trade blanket coverage, measured IL, absorption, openings, shell loss, radiation, modal density, and installed equipment in one power-flow model; never apply coupon blanket IL or panel TL directly as payload-cavity attenuation.'),
        warnings,
        plots: [{ title: 'Fairing subsystem band energy', xLabel: 'Subsystem', yLabel: 'Energy (J)', yScale: 'log', traces: [trace('Band energy', [1, 2, 3], state.network.subsystemResults.map(item => item.energy), { emphasis: true })] }],
        tables: [
          { title: 'Subsystem solution', columns: ['Subsystem', 'Energy (J)', 'Velocity (m/s)', 'SPL (dB)', 'Dissipation (W)'], rows: state.network.subsystemResults.map(item => [item.name, item.energy, item.velocityRms, item.levelDb ?? '—', item.dissipatedPower]) },
          { title: 'Power paths', columns: ['Path', 'Gross forward (W)', 'Gross reverse (W)', 'Net (W)'], rows: state.network.powerFlows.map(flow => [`${flow.from} → ${flow.to}`, flow.grossForward, flow.grossReverse, flow.net]) }
        ]
      };
    }
  }
};

export const seaParameterCalculatorRegistry = createEngineeringRegistry(definitions);
