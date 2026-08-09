/* Calculators paired with the ACS 519 deep-dive modules and chapter expansions. */
import { createEngineeringRegistry } from './engineering-results.js';
import { materials } from './calculators.js';
import { empiricalLossFactorState } from './sea-parameters-physics.js';
import {
  SEA_MEDIA,
  doublePanelSeaState,
  doubleWindowSeaState,
  drivenRadiationState,
  dynamicStressEnvironmentState,
  feBePlannerState,
  khiePatchState,
  launchAcousticSourceState,
  lossFactorBudgetState,
  modalRadiationState,
  modalTestState,
  orthotropicPanelState,
  panelTransmissionState,
  pipeNoiseState,
  pistonRadiationState,
  seaValidityState,
  shellAcousticsState,
  soundIntensityProbeState,
  qualificationTestState,
  waveMatchingState,
  wetTankDynamicsState
} from './acs519-physics.js';

const stat = (label, value, unit = '', tone = '', note = '') => ({ label, value, unit, tone, note });
const trace = (name, x, y, extra = {}) => ({ name, x, y, ...extra });
const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const mm = value => num(value, 0) / 1000;
const gpa = value => num(value, 0) * 1e9;
const linspace = (start, end, count) => Array.from({ length: count }, (_, index) => start + (end - start) * index / Math.max(1, count - 1));
const normalizeMatrix = matrix => {
  const scale = Math.max(...matrix.flat().map(value => Math.abs(value)), 1e-12);
  return matrix.map(row => row.map(value => value / scale));
};
const materialOptions = Object.entries(materials).map(([value, material]) => ({ value, label: material.label }));
const syncShellMaterial = values => {
  const material = materials[values.material] || materials.aluminum;
  return { ...values, modulus: material.E / 1e9, density: material.rho, poisson: material.nu };
};
const syncFeBeMaterial = values => {
  const material = materials[values.material] || materials.aluminum;
  return { ...values, modulus: material.E / 1e9, density: material.rho, poisson: material.nu };
};
const syncPanelTlMaterial = values => {
  const material = materials[values.material] || materials.aluminum;
  return { ...values, modulus: material.E / 1e9, panel_density: material.rho, poisson: material.nu };
};

const launchConsideration = text => [
  text,
  'For launch-vehicle use, sweep uncertain geometry, damping, boundary stiffness, and environment parameters rather than reporting only the nominal result.',
  'Correlate the screening model with test, flight, or higher-fidelity analysis before using it for qualification or flight acceptance.'
];

const acs519CalculatorDefinitions = {
  'modal-radiation': {
    category: 'Structural Acoustics',
    basis: 'Rayleigh-integral radiation from a baffled simply supported rectangular mode',
    confidence: 'Numerical hemispherical quadrature within the baffled-panel model',
    inputs: [
      { key: 'length', label: 'Panel length', unit: 'm', type: 'number', default: 1.8, min: 0.05 },
      { key: 'width', label: 'Panel width', unit: 'm', type: 'number', default: 1.1, min: 0.05 },
      { key: 'mode_x', label: 'Mode order m', type: 'number', default: 1, min: 1, max: 16, step: 1 },
      { key: 'mode_y', label: 'Mode order n', type: 'number', default: 1, min: 1, max: 16, step: 1 },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 350, min: 1 },
      { key: 'sound_speed', label: 'Fluid sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 },
      { key: 'azimuth', label: 'Directivity cut azimuth', unit: 'deg', type: 'number', default: 0, min: 0, max: 90 }
    ],
    theory: '<p>The Rayleigh integral converts a baffled surface-velocity mode into far-field pressure. Hemispherical power integration gives modal radiation efficiency without assuming that all modes radiate alike. The ratio γ=k₀/kₘₙ organizes subcritical cancellation, coincidence, and supercritical radiation.</p>',
    assumptions: ['Simply supported sine mode on a flat rectangular panel.', 'Rigid infinite baffle prevents rear-surface cancellation.', 'Uniform fluid properties and harmonic normal velocity.'],
    example: 'Compare (1,1), (1,2), and (2,2) at the same γ to see how modal parity changes low-frequency cancellation by orders of magnitude.',
    compute(values) {
      const state = modalRadiationState({ length: values.length, width: values.width, modeX: values.mode_x, modeY: values.mode_y, frequency: values.frequency, soundSpeed: values.sound_speed, azimuth: values.azimuth });
      const warning = state.gamma < 1 && state.parity !== 'odd-odd'
        ? `${state.parity} symmetry produces strong subcritical cancellation; a surface-average velocity alone will overstate radiated sound.`
        : 'Finite baffle size, curvature, stiffeners, cutouts, and attachments can break the ideal parity cancellation.';
      return {
        values: [stat('Modal radiation efficiency', state.sigma), stat('Wavenumber ratio γ', state.gamma), stat('Acoustic wavenumber', state.k0, 'rad/m'), stat('Modal wavenumber', state.kmn, 'rad/m'), stat('Parity family', state.parity), stat('Radiation regime', state.regime)],
        interpretation: `The (${state.modeX},${state.modeY}) ${state.parity} mode is in the ${state.regime} regime. Its baffled modal radiation efficiency is ${state.sigma.toFixed(3)}, so vibration amplitude alone is not a sufficient sound-power metric.`,
        engineeringConsiderations: launchConsideration('On launch-vehicle skins, low-order fairing or interstage modes can dominate interior sound even when higher-order modes dominate the accelerometer RMS; preserve mode shape and phase when mapping vibration to acoustic power.'),
        warnings: [warning],
        plots: [
          { title: 'Modal radiation efficiency versus wavenumber ratio', xLabel: 'γ = k₀ / kₘₙ', yLabel: 'Radiation efficiency', xScale: 'log', yScale: 'log', traces: [trace(`Mode (${state.modeX},${state.modeY})`, state.gammaCurve, state.sigmaCurve, { emphasis: true })] },
          { title: 'Normalized far-field directivity cut', xLabel: 'Polar angle (deg)', yLabel: 'Normalized pressure amplitude', traces: [trace(`${num(values.azimuth, 0)}° azimuth`, state.thetaDegrees, state.directivity)] }
        ],
        csv: { filename: 'modal-radiation-efficiency.csv', columns: ['gamma', 'radiation_efficiency'], rows: state.gammaCurve.map((gamma, index) => [gamma, state.sigmaCurve[index]]) }
      };
    }
  },

  'piston-radiation': {
    category: 'Structural Acoustics',
    basis: 'Exact baffled circular-piston resistance, reactance, and far-field directivity',
    confidence: 'Exact within the uniform baffled-piston model; numerical Struve-function quadrature',
    inputs: [
      { key: 'radius', label: 'Piston radius', unit: 'm', type: 'number', default: 0.12, min: 0.001 },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 800, min: 0.1 },
      { key: 'density', label: 'Fluid density', unit: 'kg/m³', type: 'number', default: 1.204, min: 0.001 },
      { key: 'sound_speed', label: 'Fluid sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 }
    ],
    theory: '<p>The nondimensional size ka controls the piston. Radiation resistance represents irreversible sound-power loss; reactance represents stored near-field energy and added mass. Directivity follows 2J₁(ka sinθ)/(ka sinθ).</p>',
    assumptions: ['Uniform piston velocity.', 'Rigid infinite baffle and linear inviscid fluid.', 'Far-field directivity; no enclosure, neighboring radiator, or reflecting surface.'],
    example: 'Change from air to water without changing geometry: radiation impedance and added mass increase dramatically even though ka changes only through sound speed.',
    compute(values) {
      const state = pistonRadiationState({ radius: values.radius, frequency: values.frequency, density: values.density, soundSpeed: values.sound_speed });
      return {
        values: [stat('ka', state.ka), stat('Normalized resistance', state.resistance), stat('Normalized reactance', state.reactance), stat('Added fluid mass', state.addedMass, 'kg'), stat('Low-ka added-mass limit', state.lowKaAddedMass, 'kg'), stat('Regime', state.regime)],
        interpretation: `At ka=${state.ka.toFixed(2)}, the piston is a ${state.regime}. Resistance ${state.resistance.toFixed(3)} controls radiated power while reactance ${state.reactance.toFixed(3)} shifts the mechanical impedance and resonance.`,
        engineeringConsiderations: launchConsideration('Treat local launch-vehicle skin patches, vents, diaphragms, and acoustic-test exciters as finite radiators: ka determines whether they act like compact volume sources or directional apertures.'),
        warnings: ['Do not apply the uniform-piston impedance directly to a multi-lobed structural mode; modal cancellation changes both resistance and directivity.'],
        plots: [
          { title: 'Piston radiation impedance', xLabel: 'ka', yLabel: 'Normalized impedance component', xScale: 'log', traces: [trace('Resistance', state.kaCurve, state.resistanceCurve, { emphasis: true }), trace('Reactance', state.kaCurve, state.reactanceCurve)] },
          { title: 'Far-field pressure directivity', xLabel: 'Polar angle (deg)', yLabel: 'Relative pressure', traces: [trace('Piston', state.anglesDegrees, state.directivity)] }
        ]
      };
    }
  },

  'shell-acoustics': {
    category: 'Structural Acoustics',
    basis: 'Donnell-type membrane/bending shell estimate with ideal simply supported or clamped axial restraint',
    confidence: 'Screening estimate; clamped-end frequencies use an axial admissible-function wavenumber approximation',
    inputs: [
      { key: 'material', label: 'Material preset', type: 'select', default: 'aluminum', options: materialOptions, help: 'Preset values populate the editable elastic properties below.' },
      { key: 'radius', label: 'Shell radius', unit: 'm', type: 'number', default: 1.8, min: 0.01 },
      { key: 'length', label: 'Shell length', unit: 'm', type: 'number', default: 7.5, min: 0.05 },
      { key: 'thickness', label: 'Wall thickness', unit: 'mm', type: 'number', default: 4, min: 0.05 },
      { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: materials.aluminum.E / 1e9, min: 0.01 },
      { key: 'density', label: 'Material density', unit: 'kg/m³', type: 'number', default: materials.aluminum.rho, min: 1 },
      { key: 'poisson', label: 'Poisson ratio', type: 'number', default: materials.aluminum.nu, min: -0.49, max: 0.49 },
      { key: 'sound_speed', label: 'Internal sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 },
      { key: 'axial_boundary', label: 'Axial end restraint', type: 'select', default: 'simply-supported', options: [{ value: 'simply-supported', label: 'Simply supported ends · SS' }, { value: 'clamped', label: 'Clamped ends · CC' }], help: 'Clamped ends enforce zero radial displacement and zero axial slope in the displayed basis; frequency remains a screening estimate.' },
      { key: 'axial_order', label: 'Axial order m', type: 'number', default: 1, min: 1, max: 20, step: 1 },
      { key: 'circ_order', label: 'Circumferential order n', type: 'number', default: 2, min: 0, max: 20, step: 1 }
    ],
    syncPreset: syncShellMaterial,
    theory: '<p>Curvature couples membrane and radial bending motion. The selected end restraint sets the axial wavenumber and admissible axial shape; the shell relation then combines curvature-controlled membrane behavior with local plate-bending stiffness. Ring frequency, plate-like critical frequency, and internal acoustic cut-on answer different questions.</p>',
    assumptions: ['Thin, uniform circular cylinder with small motion.', 'Ends follow the selected ideal simply supported or clamped axial restraint.', 'No rings, stringers, joints, payload attachments, pressurization, or fluid added mass.'],
    example: 'Compare simply supported and clamped ends, then sweep circumferential order: restraint raises axial curvature while local shell bending can still make the n-family turn upward.',
    compute(values) {
      const shellInput = { radius: values.radius, length: values.length, thickness: mm(values.thickness), modulus: gpa(values.modulus), density: values.density, poisson: values.poisson, soundSpeed: values.sound_speed, axialBoundary: values.axial_boundary, axialOrder: values.axial_order, circumferentialOrder: values.circ_order };
      const state = shellAcousticsState(shellInput);
      const thinRatio = state.thickness / state.radius;
      const boundaryCode = state.axialBoundary === 'clamped' ? 'CC' : 'SS';
      const axialShape = z => state.axialBoundary === 'clamped' ? Math.sin(state.axialOrder * Math.PI * z) * Math.sin(Math.PI * z) : Math.sin(state.axialOrder * Math.PI * z);
      const surfaceTheta = linspace(0, 2 * Math.PI, Math.max(37, state.circumferentialOrder * 3 + 1));
      const surfaceZ = linspace(0, 1, Math.max(17, state.axialOrder * 3 + 1));
      const selectedModeSurface = {
        title: `3D ${boundaryCode} shell mode · (m=${state.axialOrder}, n=${state.circumferentialOrder}) · ${state.modeFrequency.toFixed(1)} Hz`,
        geometry: 'cylinder',
        matrix: normalizeMatrix(surfaceZ.map(z => surfaceTheta.map(angle => axialShape(z) * Math.cos(state.circumferentialOrder * angle)))),
        animation: { type: 'harmonic' },
        lengthToDiameter: state.length / (2 * state.radius),
        deformationScale: .18,
        xValues: surfaceTheta.map(angle => angle * 180 / Math.PI),
        yValues: surfaceZ,
        zLabel: 'radial motion'
      };
      const axialFamilyOrders = [...new Set([1, 2, 3, 4, 5, 6, state.axialOrder])].sort((a, b) => a - b);
      const axialFamilyTraces = axialFamilyOrders.map(order => {
        const family = order === state.axialOrder ? state : shellAcousticsState({ ...shellInput, axialOrder: order });
        return trace(`m=${order}`, family.modeCurve, family.nValues, { emphasis: order === state.axialOrder });
      });
      const ringFrequencyTrace = trace(`Ring frequency · ${state.ringFrequency.toFixed(1)} Hz`, [state.ringFrequency, state.ringFrequency], [0, 16], { color: '#9ca6ae', dash: true });
      const selectedModeTrace = trace(`Selected (m=${state.axialOrder}, n=${state.circumferentialOrder})`, [state.modeFrequency], [state.circumferentialOrder], { color: '#d56b43', showPoints: true, pointRadius: 5.5, emphasis: true });
      return {
        values: [stat('Estimated shell-mode frequency', state.modeFrequency, 'Hz'), stat('Ring frequency', state.ringFrequency, 'Hz'), stat('Plate-like critical frequency', state.criticalFrequency, 'Hz'), stat('First internal acoustic cut-on', state.firstAcousticCuton, 'Hz'), stat('Minimum-frequency n', state.minimumFrequencyOrder), stat('h / R', thinRatio)],
        interpretation: {
          summary: `The selected ${boundaryCode} (${state.axialOrder},${state.circumferentialOrder}) shell mode is estimated at ${state.modeFrequency.toFixed(1)} Hz and lies in the ${state.regime}. Ring frequency (${state.ringFrequency.toFixed(0)} Hz) and acoustic coincidence (${state.criticalFrequency.toFixed(0)} Hz) are separate scales.`,
          physicalMeaning: `The animated 3D cylinder shows exaggerated, normalized radial deformation for the selected ${boundaryCode} axial basis multiplied by cos(nθ). Axial order m=${state.axialOrder} indexes the axial family; circumferential order n=${state.circumferentialOrder} counts waves around the shell. The displayed frequency comes from the Donnell-type screening relation, while the shape is an ideal admissible basis—not a physical-amplitude eigenvector of the installed shell.`
        },
        engineeringConsiderations: launchConsideration('Launch-vehicle barrels, fairings, adapters, and tanks support axial/circumferential families; low circumferential orders can control global motion and cabin acoustics while dense local modes dominate high-frequency skin response.'),
        warnings: [thinRatio > 0.1 ? 'h/R exceeds 0.1; thin-shell screening relations are not appropriate.' : 'Real frames, longerons, cutouts, joints, internal pressure, and payload interfaces split and shift ideal shell modes.', ...(state.axialBoundary === 'clamped' ? ['CC frequencies use an axial admissible-function wavenumber approximation; confirm restraint-sensitive modes with a converged shell or finite-element eigenvalue model.'] : [])],
        surfaces3d: [selectedModeSurface],
        plots: [{ title: 'Cylindrical-shell axial family map', xLabel: 'Estimated frequency (Hz)', yLabel: 'Circumferential order n', xScale: 'log', xMax: state.ringFrequency * 1.1, yMin: 0, yMax: 16, traces: [...axialFamilyTraces, ringFrequencyTrace, selectedModeTrace] }],
        presentation: { primaryEvidence: { type: 'surface3d', index: 0 }, primaryEvidenceStack: [{ type: 'surface3d', index: 0 }, { type: 'plot', index: 0 }], primaryEvidenceCount: 1, primaryValueCount: 6, animation: { type: 'harmonic', defaultRateHz: .5, note: 'The selected 3D shell basis shape moves through one slowed visual phase. Radial deformation is exaggerated and normalized to show inward and outward lobes rather than physical modal amplitude or real-time frequency.' } }
      };
    }
  },

  'fe-be-planner': {
    category: 'Structural Acoustics',
    basis: 'Wavelength-based structural FE and acoustic BE discretization planner',
    confidence: 'Screening mesh and computational-size estimate',
    inputs: [
      { key: 'material', label: 'Panel material preset', type: 'select', default: 'aluminum', options: materialOptions, help: 'Preset values populate the editable panel properties below.' },
      { key: 'maximum_frequency', label: 'Maximum analysis frequency', unit: 'Hz', type: 'number', default: 2000, min: 1 },
      { key: 'length', label: 'Model length', unit: 'm', type: 'number', default: 4, min: 0.05 },
      { key: 'width', label: 'Model width', unit: 'm', type: 'number', default: 2, min: 0.05 },
      { key: 'depth', label: 'Acoustic depth', unit: 'm', type: 'number', default: 1.5, min: 0.05 },
      { key: 'thickness', label: 'Panel thickness', unit: 'mm', type: 'number', default: 4, min: 0.05 },
      { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: materials.aluminum.E / 1e9, min: 0.01 },
      { key: 'density', label: 'Panel density', unit: 'kg/m³', type: 'number', default: materials.aluminum.rho, min: 1 },
      { key: 'poisson', label: 'Poisson ratio', type: 'number', default: materials.aluminum.nu, min: -0.49, max: 0.49 },
      { key: 'sound_speed', label: 'Sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 },
      { key: 'structural_epw', label: 'Structural elements / wavelength', type: 'number', default: 10, min: 4, max: 30 },
      { key: 'acoustic_epw', label: 'Acoustic elements / wavelength', type: 'number', default: 8, min: 4, max: 30 }
    ],
    syncPreset: syncFeBeMaterial,
    theory: '<p>Structural and acoustic meshes resolve different wavelengths. Below coincidence, bending wavelengths can be shorter than acoustic wavelengths, so a shared interface mesh may be unnecessarily expensive for BEM. Exterior BEM also carries internal-resonance nonuniqueness and dense-matrix cost.</p>',
    assumptions: ['Uniform isotropic thin-panel bending controls structural wavelength.', 'Surface-area element counts neglect geometry features and mesh-quality constraints.', 'Classical dense BEM storage and direct-solve indices are relative, not wall-clock predictions.'],
    example: 'Increase maximum frequency by two: surface element count grows roughly with frequency squared, while a classical dense BEM direct-solve index grows roughly with the sixth power.',
    compute(values) {
      const state = feBePlannerState({ maximumFrequency: values.maximum_frequency, length: values.length, width: values.width, depth: values.depth, thickness: mm(values.thickness), modulus: gpa(values.modulus), density: values.density, soundSpeed: values.sound_speed, structuralElementsPerWave: values.structural_epw, acousticElementsPerWave: values.acoustic_epw, poisson: values.poisson });
      const warnings = [];
      if (state.linearDispersionBias > 3) warnings.push(`The linear-element dispersion indicator is ${state.linearDispersionBias.toFixed(1)}%; refine the structural mesh or use verified higher-order elements.`);
      if (state.uniquenessSeparation < 0.03) warnings.push('The evaluation ceiling lies near an internal pressure-release cavity frequency; an exterior direct BEM formulation needs a uniqueness treatment such as CHIEF or Burton–Miller.');
      return {
        values: [stat('Structural element size', state.structuralElementSize, 'm'), stat('Acoustic element size', state.acousticElementSize, 'm'), stat('Estimated structural elements', state.structuralElements), stat('Estimated acoustic elements', state.acousticElements), stat('Bending / acoustic wavelength', state.wavelengthRatio), stat('Linear dispersion indicator', state.linearDispersionBias, '%', state.linearDispersionBias > 3 ? 'warn' : 'good')],
        interpretation: `At ${state.maximumFrequency.toFixed(0)} Hz, the ${state.regime}. The surface counts are approximately ${state.structuralElements.toLocaleString()} structural and ${state.acousticElements.toLocaleString()} acoustic elements before local refinement.`,
        engineeringConsiderations: launchConsideration('For launch-vehicle FE/BE models, separate structural and acoustic resolution, retain residual flexibility in modal reductions, and bracket frequency uncertainty where narrow resonances drive qualification loads.'),
        warnings,
        tables: [{ title: 'Discretization and solver indicators', columns: ['Quantity', 'Value', 'Interpretation'], rows: [
          ['Bending wavelength', state.bendingWavelength, 'Controls structural wave resolution'],
          ['Acoustic wavelength', state.acousticWavelength, 'Controls acoustic boundary resolution'],
          ['Nearest interior resonance', state.nearestInteriorResonance, 'Exterior BEM nonuniqueness check'],
          ['BEM storage index', state.beStorageIndex, 'Scales with N²'],
          ['BEM direct-solve index', state.beSolveIndex, 'Scales with N³']
        ] }]
      };
    }
  },

  'elastic-panel-tl': {
    category: 'Structural Acoustics',
    basis: 'Thin elastic-panel impedance with angle-dependent and diffuse-field transmission',
    confidence: 'Numerical infinite-panel screening model',
    inputs: [
      { key: 'material', label: 'Panel material preset', type: 'select', default: 'aluminum', options: materialOptions, help: 'Preset values populate the editable panel properties below.' },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'thickness', label: 'Panel thickness', unit: 'mm', type: 'number', default: 3, min: 0.02 },
      { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: materials.aluminum.E / 1e9, min: 0.01 },
      { key: 'panel_density', label: 'Panel density', unit: 'kg/m³', type: 'number', default: materials.aluminum.rho, min: 1 },
      { key: 'poisson', label: 'Poisson ratio', type: 'number', default: materials.aluminum.nu, min: -0.49, max: 0.49 },
      { key: 'loss_factor', label: 'Structural loss factor', type: 'number', default: 0.02, min: 0.0001, max: 0.5 },
      { key: 'incidence', label: 'Incidence angle', unit: 'deg', type: 'number', default: 45, min: 0, max: 85 },
      { key: 'fluid_density', label: 'Fluid density', unit: 'kg/m³', type: 'number', default: 1.204, min: 0.001 },
      { key: 'sound_speed', label: 'Sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 }
    ],
    syncPreset: syncPanelTlMaterial,
    theory: '<p>Panel transmission follows the balance of two fluid impedances and the complex structural impedance induced by the incident in-plane wavenumber. Coincidence occurs at different frequencies for different angles, so diffuse TL averages many narrow transmission dips.</p>',
    assumptions: ['Infinite, uniform, isotropic thin panel between identical fluids.', 'No finite-panel modes, seals, flanking, curvature, stiffeners, or leakage.', 'Diffuse integration is truncated at 78 degrees to avoid grazing-field singular behavior.'],
    example: 'Increase damping: TL below coincidence barely changes, while the diffuse coincidence trough becomes shallower.',
    compute(values) {
      const state = panelTransmissionState({ frequency: values.frequency, thickness: mm(values.thickness), modulus: gpa(values.modulus), panelDensity: values.panel_density, lossFactor: values.loss_factor, incidenceDegrees: values.incidence, fluidDensity: values.fluid_density, soundSpeed: values.sound_speed, poisson: values.poisson });
      return {
        values: [stat('Diffuse-field TL', state.diffuseTl, 'dB'), stat('Selected-angle TL', state.tlAngle, 'dB'), stat('Normal-incidence TL', state.tlNormal, 'dB'), stat('Critical frequency', state.criticalFrequency, 'Hz'), stat('Surface mass', state.surfaceMass, 'kg/m²'), stat('Regime', state.regime)],
        interpretation: `At ${state.frequency.toFixed(0)} Hz the panel is in the ${state.regime}. The diffuse-field result (${state.diffuseTl.toFixed(1)} dB) includes a continuum of incidence angles and should not be replaced by the normal-incidence value.`,
        engineeringConsiderations: launchConsideration('Fairings, payload enclosures, and equipment-bay closeouts experience diffuse, directional, and locally reverberant fields; finite modes, joints, vents, blankets, and flanking paths usually set the installed noise reduction.'),
        warnings: ['Mass-law TL is a baseline, not an installed launch-vehicle acoustic attenuation guarantee.'],
        plots: [{ title: 'Diffuse transmission loss through coincidence', xLabel: 'Frequency (Hz)', yLabel: 'Transmission loss (dB)', xScale: 'log', traces: [trace('Diffuse TL', state.frequencies, state.diffuseCurve, { emphasis: true })] }]
      };
    }
  },

  'orthotropic-panel': {
    category: 'Structures',
    basis: 'Directional orthotropic plate rigidity and coincidence',
    confidence: 'Exact directional rigidity for the entered equivalent D-matrix; thin-plate screening',
    inputs: [
      { key: 'd11', label: 'D11', unit: 'N·m', type: 'number', default: 8500, min: 0.001 },
      { key: 'd22', label: 'D22', unit: 'N·m', type: 'number', default: 2600, min: 0.001 },
      { key: 'd12', label: 'D12', unit: 'N·m', type: 'number', default: 900, min: 0 },
      { key: 'd66', label: 'D66', unit: 'N·m', type: 'number', default: 1200, min: 0 },
      { key: 'surface_mass', label: 'Surface mass', unit: 'kg/m²', type: 'number', default: 7.2, min: 0.001 },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'direction', label: 'Propagation direction', unit: 'deg', type: 'number', default: 25, min: 0, max: 180 },
      { key: 'sound_speed', label: 'Sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 }
    ],
    theory: '<p>Equivalent bending rigidity depends on propagation direction: D(θ)=D₁₁c⁴+2(D₁₂+2D₆₆)s²c²+D₂₂s⁴. Directional phase speed and coincidence therefore form a surface rather than one scalar critical frequency.</p>',
    assumptions: ['Symmetric orthotropic laminate or equivalent smeared panel.', 'No bending-extension coupling, local rib modes, core crushing, or facesheet wrinkling.', 'Thin-plate behavior; transverse shear requires a sandwich correction at higher frequency.'],
    example: 'A ribbed or honeycomb panel can become acoustically supercritical in its stiff direction while remaining subcritical in the weak direction.',
    compute(values) {
      const state = orthotropicPanelState({ d11: values.d11, d22: values.d22, d12: values.d12, d66: values.d66, surfaceMass: values.surface_mass, frequency: values.frequency, directionDegrees: values.direction, soundSpeed: values.sound_speed });
      return {
        values: [stat('Directional rigidity', state.selectedRigidity, 'N·m'), stat('Directional critical frequency', state.selectedCriticalFrequency, 'Hz'), stat('Directional phase speed', state.phaseSpeed, 'm/s'), stat('Minimum critical frequency', state.minimumCritical, 'Hz'), stat('Maximum critical frequency', state.maximumCritical, 'Hz'), stat('Rigidity anisotropy', state.anisotropyRatio, '×')],
        interpretation: `The panel is in a ${state.regime}. At ${state.directionDegrees.toFixed(0)}°, the equivalent rigidity is ${state.selectedRigidity.toFixed(0)} N·m and the directional coincidence frequency is ${state.selectedCriticalFrequency.toFixed(0)} Hz.`,
        engineeringConsiderations: launchConsideration('Launch-vehicle sandwich panels, grid-stiffened barrels, and composite fairings need direction-resolved wave and coincidence checks; an isotropic equivalent can hide the first efficient-radiation direction.'),
        warnings: ['Equivalent D-matrices do not resolve local facesheet, core, rib-bay, fastener, or joint modes.'],
        plots: [{ title: 'Directional coincidence surface', xLabel: 'Propagation direction (deg)', yLabel: 'Critical frequency (Hz)', traces: [trace('Directional fc', state.directions, state.criticalCurve, { emphasis: true })] }]
      };
    }
  },

  'loss-factor-budget': {
    category: 'Dynamics',
    basis: 'Additive loss-factor budget with half-power, decay, and power-injection estimates',
    confidence: 'Exact conversions within light-damping single-band assumptions',
    inputs: [
      { key: 'frequency', label: 'Band or modal frequency', unit: 'Hz', type: 'number', default: 500, min: 0.1 },
      { key: 'construction', label: 'Reference construction family', type: 'select', default: 'homogeneous-panel', options: [{ value: 'homogeneous-panel', label: 'Bare homogeneous panel' }, { value: 'bare-sandwich', label: 'Bare sandwich panel' }, { value: 'built-up-sandwich', label: 'Built-up sandwich panel' }, { value: 'stowed-solar-array', label: 'Stowed solar array' }, { value: 'cylindrical-shell', label: 'Built-up cylindrical shell' }] },
      { key: 'internal', label: 'Internal material loss factor', type: 'number', default: 0.012, min: 0 },
      { key: 'radiation', label: 'Radiation loss factor', type: 'number', default: 0.006, min: 0 },
      { key: 'joint', label: 'Joint / interface loss factor', type: 'number', default: 0.004, min: 0 },
      { key: 'fluid', label: 'Fluid / aero loss factor', type: 'number', default: 0.002, min: 0 },
      { key: 'coupling', label: 'Coupling loss factor', type: 'number', default: 0.003, min: 0 },
      { key: 'measured_bandwidth', label: 'Measured half-power bandwidth', unit: 'Hz', type: 'number', default: 14, min: 0 },
      { key: 'decay_time', label: 'Measured T60 decay time', unit: 's', type: 'number', default: 0.35, min: 0.0001 },
      { key: 'input_power', label: 'Band input power', unit: 'W', type: 'number', default: 0.4, min: 0 },
      { key: 'stored_energy', label: 'Band stored energy', unit: 'J', type: 'number', default: 0.018, min: 0.000001 }
    ],
    theory: '<p>Independent dissipative paths contribute to total loss factor. Modal bandwidth is approximately ηfₙ; T60≈2.2/(ηf); and the power-injection estimate is η=P/(ωE). Agreement among methods is evidence, not an identity, because they average different spatial and frequency behavior.</p>',
    assumptions: ['Light damping and locally isolated or band-averaged response.', 'Entered loss paths are independent and not double counted.', 'Decay is exponential and power/energy estimates use consistent spatial weighting.'],
    example: 'If the total damping measured in air greatly exceeds the material-only estimate, radiation, joints, and attachments may dominate the flight configuration.',
    compute(values) {
      const state = lossFactorBudgetState({ frequency: values.frequency, internal: values.internal, radiation: values.radiation, joint: values.joint, fluid: values.fluid, coupling: values.coupling, measuredBandwidth: values.measured_bandwidth, decayTime: values.decay_time, inputPower: values.input_power, storedEnergy: values.stored_energy });
      const reference = empiricalLossFactorState({ frequency: values.frequency, construction: values.construction });
      const estimates = [state.halfPowerEstimate, state.decayEstimate, state.powerInjectionEstimate];
      const spread = Math.max(...estimates) / Math.max(Math.min(...estimates), 1e-12);
      const referenceRatio = state.internal / reference.lossFactor;
      const warnings = [spread > 2 ? 'Half-power, decay, and power-injection estimates disagree by more than 2×; check modal overlap, spatial energy estimation, leakage, and non-exponential decay.' : 'Measurement methods are reasonably consistent, but the total still depends on the tested boundary and installation state.'];
      if (referenceRatio > 2.5 || referenceRatio < 0.4) warnings.push(`The entered internal loss differs from the ${reference.label.toLowerCase()} reference by ${Math.max(referenceRatio, 1 / referenceRatio).toFixed(1)}×. Treat the empirical family as a sensitivity bound, not a replacement for installed data.`);
      return {
        values: [stat('Total loss factor', state.total), stat('Reference construction loss', reference.lossFactor), stat('Equivalent damping ratio', state.dampingRatio), stat('Equivalent Q', state.qFactor), stat('Predicted half-power bandwidth', state.halfPowerBandwidth, 'Hz'), stat('Predicted T60', state.t60, 's'), stat('Measurement-method spread', spread, '×', spread > 2 ? 'warn' : 'good')],
        interpretation: `The entered loss paths sum to η=${state.total.toFixed(4)}. The independent measurement estimates span ${Math.min(...estimates).toFixed(4)} to ${Math.max(...estimates).toFixed(4)}, while the ${reference.label.toLowerCase()} screen gives η=${reference.lossFactor.toFixed(4)} at this frequency.`,
        engineeringConsiderations: launchConsideration('Launch-vehicle damping is configuration- and environment-dependent: joints, purge gas, acoustic radiation, tank fill state, blankets, and installed hardware can outweigh coupon material damping.'),
        warnings,
        tables: [{ title: 'Loss-factor budget and measurement cross-check', columns: ['Item', 'Loss factor', 'Role'], rows: [
          ...state.labels.map((label, index) => [label, state.components[index], 'Budget contribution']),
          [reference.label, reference.lossFactor, 'Empirical construction-family sensitivity reference'],
          ['Half-power estimate', state.halfPowerEstimate, 'Δf / fn'],
          ['Decay estimate', state.decayEstimate, '2.2 / (f T60)'],
          ['Power-injection estimate', state.powerInjectionEstimate, 'P / (ω E)']
        ] }]
      };
    }
  },

  'modal-test-planner': {
    category: 'Test & Signal',
    basis: 'Simply supported plate modal participation, bandwidth, grid density, and sensor mass loading',
    confidence: 'Screening test-design model',
    inputs: [
      { key: 'length', label: 'Plate length', unit: 'm', type: 'number', default: 1.2, min: 0.05 },
      { key: 'width', label: 'Plate width', unit: 'm', type: 'number', default: 0.8, min: 0.05 },
      { key: 'thickness', label: 'Plate thickness', unit: 'mm', type: 'number', default: 3, min: 0.05 },
      { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.01 },
      { key: 'density', label: 'Density', unit: 'kg/m³', type: 'number', default: 2700, min: 1 },
      { key: 'mode_x', label: 'Mode order m', type: 'number', default: 3, min: 1, max: 20, step: 1 },
      { key: 'mode_y', label: 'Mode order n', type: 'number', default: 2, min: 1, max: 20, step: 1 },
      { key: 'drive_x', label: 'Drive x / L', type: 'number', default: 0.23, min: 0, max: 1 },
      { key: 'drive_y', label: 'Drive y / W', type: 'number', default: 0.31, min: 0, max: 1 },
      { key: 'response_x', label: 'Response x / L', type: 'number', default: 0.68, min: 0, max: 1 },
      { key: 'response_y', label: 'Response y / W', type: 'number', default: 0.57, min: 0, max: 1 },
      { key: 'loss_factor', label: 'Modal loss factor', type: 'number', default: 0.015, min: 0.0001 },
      { key: 'sensor_mass', label: 'Sensor mass', unit: 'g', type: 'number', default: 4, min: 0 },
      { key: 'df', label: 'Frequency resolution', unit: 'Hz', type: 'number', default: 1, min: 0.001 }
    ],
    theory: '<p>A measured FRF contains the product of the mode shape at the drive and response locations. A mode can disappear when either point lies near a node. Bandwidth and local modal mass set the frequency-resolution and sensor-loading requirements.</p>',
    assumptions: ['Thin simply supported isotropic plate.', 'Single-mode resonance estimate with uniform surface mass.', 'Sensor mass is treated as a screening fraction of modal mass, not a local perturbation solution.'],
    example: 'Move the drive onto a modal node and the predicted participation collapses even though the structural mode still exists.',
    compute(values) {
      const state = modalTestState({ length: values.length, width: values.width, thickness: mm(values.thickness), modulus: gpa(values.modulus), density: values.density, modeX: values.mode_x, modeY: values.mode_y, driveX: values.drive_x, driveY: values.drive_y, responseX: values.response_x, responseY: values.response_y, lossFactor: values.loss_factor, sensorMass: num(values.sensor_mass, 0) / 1000, frequencyResolution: values.df, poisson: 0.33 });
      const warnings = [];
      if (state.nodeRisk) warnings.push('The drive or response lies near a modal node; this mode can be absent or poorly conditioned in the measured FRF.');
      if (state.resolutionRisk) warnings.push('Fewer than three spectral bins span the expected half-power bandwidth; damping extraction will be fragile.');
      if (state.massLoadingRisk) warnings.push('Sensor mass exceeds 1% of the ideal modal mass; check the local frequency shift with a lighter sensor or noncontact measurement.');
      return {
        values: [stat('Natural frequency', state.naturalFrequency, 'Hz'), stat('Drive shape amplitude', state.driveShape), stat('Response shape amplitude', state.responseShape), stat('FRF participation product', state.participation), stat('Bins across bandwidth', state.binsAcrossBandwidth, '', state.resolutionRisk ? 'warn' : 'good'), stat('Sensor / modal mass', 100 * state.sensorMassRatio, '%', state.massLoadingRisk ? 'warn' : 'good')],
        interpretation: `The (${state.modeX},${state.modeY}) mode is estimated at ${state.naturalFrequency.toFixed(1)} Hz. The selected drive/response pair has a participation product of ${state.participation.toFixed(3)} and needs at least a ${state.minimumGridX}×${state.minimumGridY} spatial grid for basic shape resolution.`,
        engineeringConsiderations: launchConsideration('Ground-vibration and panel-modal surveys for launch vehicles should place references away from expected nodes, preserve phase, resolve narrow bandwidths, and treat attachment/support modes as real configuration behavior rather than automatically deleting them.'),
        warnings,
        tables: [{ title: 'Modal test plan', columns: ['Quantity', 'Value', 'Use'], rows: [
          ['Minimum x grid', state.minimumGridX, 'At least two samples per modal half-wave'],
          ['Minimum y grid', state.minimumGridY, 'At least two samples per modal half-wave'],
          ['Modal bandwidth (Hz)', state.modalBandwidth, 'Resolution target'],
          ['Peak transfer mobility (s/kg)', state.peakMobility, 'Single-mode screening magnitude']
        ] }]
      };
    }
  },

  'sea-validity-confidence': {
    category: 'SEA & Energy',
    basis: 'Modes-per-band, modal-overlap, weak-coupling, and spatial-sampling readiness checks',
    confidence: 'Statistical screening indicators, not a universal confidence interval',
    inputs: [
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'modal_density', label: 'Modal density', unit: 'modes/Hz', type: 'number', default: 0.04, min: 0.000001 },
      { key: 'loss_factor', label: 'Internal / effective loss factor', type: 'number', default: 0.025, min: 0.000001 },
      { key: 'band_fraction', label: 'Fractional bandwidth Δf/f', type: 'number', default: 0.2316, min: 0.001, max: 1 },
      { key: 'coupling_loss', label: 'Largest outgoing CLF', type: 'number', default: 0.006, min: 0 },
      { key: 'response_points', label: 'Independent response points', type: 'number', default: 8, min: 1, max: 200, step: 1 }
    ],
    theory: '<p>SEA needs enough modes in the analysis band, sufficient modal overlap or ensemble averaging, representative spatial energy estimates, and coupling that does not destroy subsystem identity. Passing one indicator does not compensate for failing the others.</p>',
    assumptions: ['Broadband stationary excitation over the selected band.', 'Modal density and loss factor represent the installed subsystem.', 'The displayed variability estimate is a teaching approximation based on independent modal samples.'],
    example: 'A large honeycomb panel can have many modes per one-third-octave band but low overlap if its loss factor is very small; the mean may be usable while local variance remains large.',
    compute(values) {
      const state = seaValidityState({ frequency: values.frequency, modalDensity: values.modal_density, lossFactor: values.loss_factor, bandFraction: values.band_fraction, couplingLossFactor: values.coupling_loss, responsePoints: values.response_points });
      const warnings = [];
      if (state.modesPerBand < 5) warnings.push('Fewer than five modes occupy the band; ensemble averages may depend strongly on individual resonances.');
      if (state.modalOverlap < 1) warnings.push('Modal overlap is below one; isolated or transitional resonances remain important.');
      if (state.weakCouplingRatio > 0.5) warnings.push('Coupling is large relative to internal loss; verify that the chosen subsystems retain distinct modal populations.');
      const frequencies=Array.from({length:90},(_,index)=>Number(values.frequency)/20*(400**(index/89))),modes=[],overlap=[];
      for(const frequency of frequencies){const point=seaValidityState({frequency,modalDensity:values.modal_density,lossFactor:values.loss_factor,bandFraction:values.band_fraction,couplingLossFactor:values.coupling_loss,responsePoints:values.response_points});modes.push(point.modesPerBand);overlap.push(point.modalOverlap);}
      return {
        values: [stat('Modes per band', state.modesPerBand, '', state.modesPerBand < 5 ? 'warn' : 'good'), stat('Modal overlap', state.modalOverlap, '', state.modalOverlap < 1 ? 'warn' : 'good'), stat('CLF / internal loss', state.weakCouplingRatio, '', state.weakCouplingRatio > 0.5 ? 'warn' : 'good'), stat('Approximate response COV', state.coefficientOfVariation), stat('Approximate ±95% spread', state.approximate95PercentDb, 'dB'), stat('Readiness', state.readiness)],
        interpretation: `This band is classified as “${state.readiness}.” It contains ${state.modesPerBand.toFixed(2)} modes with overlap ${state.modalOverlap.toFixed(2)}; the mean response should be reported with variability rather than as a deterministic local level.`,
        engineeringConsiderations: launchConsideration('High-frequency launch-vehicle response often justifies SEA only in selected bands and subsystems; use hybrid FE–SEA through transition regions and report confidence/variability with the band mean.'),
        warnings,
        plots:[{title:'SEA readiness indicators versus frequency',xLabel:'Frequency (Hz)',yLabel:'Indicator value',xScale:'log',yScale:'log',traces:[trace('Modes per band',frequencies,modes,{emphasis:true}),trace('Modal overlap',frequencies,overlap),trace('Readiness threshold',frequencies,frequencies.map(()=>1),{dash:true})]}]
      };
    }
  },

  'double-panel-sea': {
    category: 'SEA & Energy',
    basis: 'Price–Crocker five-subsystem double-window SEA chain with reciprocal coupling and medium-dependent gap acoustics',
    confidence: 'Exact energy balance for the entered screening network; modal densities and coupling models remain idealized',
    inputs: [
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'medium', label: 'Medium between panes', type: 'select', default: 'air', options: Object.values(SEA_MEDIA).map(item => ({ value: item.key, label: item.label })) },
      { key: 'pane_length', label: 'Pane length', unit: 'm', type: 'number', default: 1.5, min: 0.05 },
      { key: 'pane_width', label: 'Pane width', unit: 'm', type: 'number', default: 1.2, min: 0.05 },
      { key: 'gap', label: 'Inter-pane gap', unit: 'mm', type: 'number', default: 40, min: 0.1 },
      { key: 'pane1_thickness', label: 'Pane 1 thickness', unit: 'mm', type: 'number', default: 6, min: 0.1 },
      { key: 'pane2_thickness', label: 'Pane 2 thickness', unit: 'mm', type: 'number', default: 6, min: 0.1 },
      { key: 'pane_density', label: 'Pane material density', unit: 'kg/m³', type: 'number', default: 2500, min: 1 },
      { key: 'pane_modulus', label: 'Pane Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.01 },
      { key: 'panel_loss', label: 'Pane internal loss factor', type: 'number', default: 0.018, min: 0.000001 },
      { key: 'cavity_loss', label: 'Gap-medium loss factor', type: 'number', default: 0.025, min: 0.000001 },
      { key: 'room_loss', label: 'Room acoustic loss factor', type: 'number', default: 0.01, min: 0.000001 },
      { key: 'pane_room_coupling', label: 'Pane → room reference CLF', type: 'number', default: 0.012, min: 0.000001 },
      { key: 'pane_gap_air_coupling', label: 'Pane → air-gap reference CLF', type: 'number', default: 0.018, min: 0.000001 },
      { key: 'nonresonant_path', label: 'Derived nonresonant mass-law path', type: 'select', default: 'enabled', options: [{ value: 'enabled', label: 'Enabled' }, { value: 'disabled', label: 'Disabled' }] },
      { key: 'blanket_coverage', label: 'Receiver-side blanket coverage', unit: '%', type: 'number', default: 0, min: 0, max: 100 },
      { key: 'blanket_il', label: 'Measured blanket insertion loss', unit: 'dB', type: 'number', default: 0, min: 0 },
      { key: 'bypass', label: 'Direct / flanking CLF', type: 'number', default: 0, min: 0 },
      { key: 'source_power', label: 'Source-room input power', unit: 'W', type: 'number', default: 1, min: 0.000001 },
      { key: 'source_volume', label: 'Source-room volume', unit: 'm³', type: 'number', default: 80, min: 0.01 },
      { key: 'receiver_volume', label: 'Receiver-room volume', unit: 'm³', type: 'number', default: 80, min: 0.01 }
    ],
    theory: '<p>The Price–Crocker application divides the path into five SEA subsystems: transmitting room, pane 1, gap cavity, pane 2, and receiving room. Reciprocity derives reverse CLFs from modal density. The gap is treated as a two-dimensional acoustic subsystem below its first cross-gap mode and a three-dimensional cavity above it. Changing the medium changes density, sound speed, impedance, modal density, mass–fluid–mass resonance, reciprocal coupling, pane velocity, and received pressure.</p>',
    assumptions: ['Steady band-averaged diffuse energy and reciprocal passive coupling.', 'Thin isotropic panes with asymptotic flexural modal density and dry structural mass.', 'The medium is homogeneous and quiescent; seals, frame paths, leaks, trim, and detailed radiation efficiency are not resolved.', 'The displayed TL is the source-to-receiver pressure-level difference; room-absorption corrections must be added when the test definition requires them.'],
    example: 'Switch the gap from air to helium, argon, carbon dioxide, or water. Watch the gap modal density, impedance-scaled coupling, mass–fluid–mass resonance, pane velocity, and received level change together.',
    compute(values) {
      const baseInput = { frequency: values.frequency, medium: values.medium, paneLength: values.pane_length, paneWidth: values.pane_width, gap: mm(values.gap), pane1Thickness: mm(values.pane1_thickness), pane2Thickness: mm(values.pane2_thickness), paneDensity: values.pane_density, paneModulus: gpa(values.pane_modulus), paneLossFactor: values.panel_loss, cavityLossFactor: values.cavity_loss, roomLossFactor: values.room_loss, etaPaneRoom: values.pane_room_coupling, etaPaneCavityAir: values.pane_gap_air_coupling, nonresonantPath: values.nonresonant_path, blanketCoverage: num(values.blanket_coverage, 0) / 100, blanketInsertionLoss: values.blanket_il, bypass: values.bypass, sourcePower: values.source_power, sourceRoomVolume: values.source_volume, receiverRoomVolume: values.receiver_volume };
      const state = doubleWindowSeaState(baseInput);
      const network = state.network;
      const frequencies = Array.from({ length: 100 }, (_, index) => 10 ** (Math.log10(50) + index / 99 * (Math.log10(16000) - Math.log10(50))));
      const mediumCurves = Object.values(SEA_MEDIA).map(medium => trace(medium.label, frequencies, frequencies.map(frequency => doubleWindowSeaState({ ...baseInput, frequency, medium: medium.key }).transmissionLoss), { emphasis: medium.key === state.mediumKey }));
      const warnings = [];
      const sparse = network.subsystemResults.filter(item => item.modesInBand < 5).map(item => item.name);
      if (sparse.length) warnings.push(`Fewer than five modes occupy the selected band in: ${sparse.join(', ')}. Treat their SEA averages as transitional or replace them with deterministic subsystems.`);
      if (state.impedanceRatio > 10) warnings.push('The inter-pane fluid impedance is far above air. Fluid-added mass and two-way hydroelastic loading can invalidate dry-pane modal density and weak-coupling assumptions.');
      if (state.etaPaneCavity / state.paneLossFactor > 1) warnings.push(state.couplingWarning);
      if (state.effectiveBypass > 0) warnings.push('The direct/flanking path bypasses both panes and the gap; it can cap TL even when the resonant chain is improved.');
      warnings.push('The derived nonresonant path is a mass-law screen; finite pane coincidence, frame modes, seals, and measured room-absorption corrections still require separate evidence.');
      return {
        values: [stat('Installed SEA level reduction', state.transmissionLoss, 'dB'), stat('Component mass-law TL', state.componentMassLawTl, 'dB'), stat('Derived nonresonant CLF', state.nonresonantClf), stat('Source-room level', state.sourceLevel, 'dB SPL'), stat('Receiving-room level', state.receiverLevel, 'dB SPL'), stat('Pane 1 velocity', state.pane1Velocity * 1000, 'mm/s RMS'), stat('Pane 2 velocity', state.pane2Velocity * 1000, 'mm/s RMS'), stat('Mass–fluid–mass resonance', state.massFluidMassFrequency, 'Hz'), stat('First cross-gap mode', state.crossGapCuton, 'Hz'), stat('Gap modal density', state.cavityModalDensity, 'modes/Hz'), stat('Medium impedance / air', state.impedanceRatio), stat('Power-balance error', 100 * network.balanceError, '%', Math.abs(network.balanceError) > 1e-6 ? 'warn' : 'good')],
        interpretation: `The ${state.medium.label.toLowerCase()}-filled gap produces ${state.transmissionLoss.toFixed(1)} dB source-to-receiver pressure-level difference at ${state.frequency.toFixed(0)} Hz. Pane velocities are ${(state.pane1Velocity * 1000).toFixed(3)} and ${(state.pane2Velocity * 1000).toFixed(3)} mm/s RMS. ${state.regime}; the mass–fluid–mass scale is ${state.massFluidMassFrequency.toFixed(1)} Hz.`,
        engineeringConsiderations: launchConsideration('Use the editable demo to partition payload windows, fairing liners, double walls, equipment enclosures, and cavities by stored-energy mechanism. Carry explicit frame, seal, vent, attachment, and direct-field paths when they bypass the nominal pane–gap chain.'),
        warnings,
        plots: [
          { title: 'Double-window TL versus gap medium', xLabel: 'Frequency (Hz)', yLabel: 'Source-to-receiver level difference (dB)', xScale: 'log', traces: mediumCurves },
          { title: 'Subsystem band energy', xLabel: 'Subsystem number', yLabel: 'Energy (J)', yScale: 'log', traces: [trace('Band energy', network.subsystemResults.map((_, index) => index + 1), network.subsystemResults.map(item => Math.max(item.energy, 1e-30)), { emphasis: true })] }
        ],
        tables: [
          { title: 'Subsystem solution', columns: ['Subsystem', 'Type', 'Energy (J)', 'Energy / mode (J)', 'Dissipation (W)', 'Velocity RMS (m/s)', 'Level (dB SPL)'], rows: network.subsystemResults.map(item => [item.name, item.kind, item.energy, item.modalEnergy, item.dissipatedPower, item.velocityRms, item.levelDb ?? '—']) },
          { title: 'Gross and net coupling power', columns: ['Connection', 'Forward gross (W)', 'Reverse gross (W)', 'Net forward (W)'], rows: network.powerFlows.map(flow => [`${flow.from} → ${flow.to}`, flow.grossForward, flow.grossReverse, flow.net]) },
          { title: 'Medium and cavity scales', columns: ['Quantity', 'Value', 'Engineering meaning'], rows: [
            ['Density (kg/m³)', state.medium.density, 'Acoustic impedance and fluid loading'],
            ['Sound speed (m/s)', state.medium.soundSpeed, 'Modal density and cross-gap cut-on'],
            ['Pane-to-gap CLF', state.etaPaneCavity, 'Air-reference coupling scaled by impedance and mass–fluid–mass proximity'],
            ['Component mass-law TL (dB)', state.componentMassLawTl, 'Nonresonant panel-pair transmission screen'],
            ['Blanket/open-area transmission', state.coverageTransmission, 'Coverage combined in linear power space'],
            ['Gap regime', state.regime, 'Price–Crocker cavity modal-density selection']
          ] }
        ],
        csv: { filename: 'double-window-sea-medium-study.csv', columns: ['frequency_hz', ...Object.values(SEA_MEDIA).map(item => `${item.key}_tl_db`)], rows: frequencies.map((frequency, index) => [frequency, ...mediumCurves.map(item => item.y[index])]) }
      };
    }
  },

  'khie-boundary': {
    category: 'Acoustics',
    basis: 'Single-boundary-patch Kirchhoff–Helmholtz pressure and velocity contributions',
    confidence: 'Exact patch contribution for the entered free-space Green function',
    inputs: [
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 500, min: 0.1 },
      { key: 'distance', label: 'Patch-to-field distance', unit: 'm', type: 'number', default: 3, min: 0.001 },
      { key: 'area', label: 'Patch area', unit: 'm²', type: 'number', default: 0.02, min: 0.000001 },
      { key: 'surface_pressure', label: 'Surface pressure amplitude', unit: 'Pa', type: 'number', default: 1 },
      { key: 'normal_velocity', label: 'Normal velocity amplitude', unit: 'm/s', type: 'number', default: 0.001 },
      { key: 'normal_cosine', label: 'cos β', type: 'number', default: 0.7, min: -1, max: 1 },
      { key: 'density', label: 'Fluid density', unit: 'kg/m³', type: 'number', default: 1.204, min: 0.001 },
      { key: 'sound_speed', label: 'Sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 }
    ],
    theory: '<p>The Kirchhoff–Helmholtz equation reconstructs a field from pressure-like dipole and normal-velocity monopole contributions on a closed boundary. Their phases matter: magnitudes cannot be summed independently.</p>',
    assumptions: ['One sufficiently small constant boundary element in an unbounded uniform fluid.', 'Entered pressure and velocity phasors have zero relative input phase.', 'A complete field requires coherent summation over the closed boundary.'],
    example: 'Reverse the surface normal: the pressure-gradient contribution changes sign while the velocity contribution follows the chosen velocity convention.',
    compute(values) {
      const state = khiePatchState({ frequency: values.frequency, distance: values.distance, area: values.area, surfacePressure: values.surface_pressure, normalVelocity: values.normal_velocity, normalCosine: values.normal_cosine, density: values.density, soundSpeed: values.sound_speed });
      return {
        values: [stat('Total field pressure', state.totalMagnitude, 'Pa'), stat('Pressure-term magnitude', state.pressureMagnitude, 'Pa'), stat('Velocity-term magnitude', state.velocityMagnitude, 'Pa'), stat('Total phase', state.totalPhase, 'deg'), stat('Pressure-term phase', state.pressurePhase, 'deg'), stat('Velocity-term phase', state.velocityPhase, 'deg')],
        interpretation: `This patch contributes ${state.totalMagnitude.toExponential(3)} Pa at the field point after coherent addition. The pressure and velocity terms differ in magnitude and phase; surface integration can therefore reinforce or cancel them.`,
        engineeringConsiderations: launchConsideration('KHIE/BEM is useful for predicting payload-fairing radiation, plume-acoustic scattering, and exterior fields from structural surface motion, but mesh phase accuracy and exterior uniqueness checks are essential.'),
        warnings: ['One patch is not a radiating structure. Use a closed, converged boundary and consistent outward-normal convention for a physical field solution.'],
        plots: [{ title: 'Patch contribution versus distance', xLabel: 'Distance (m)', yLabel: 'Pressure magnitude (Pa)', xScale: 'log', yScale: 'log', traces: [trace('Coherent total', state.distances, state.pressureCurve.map(value => Math.max(value, 1e-15)), { emphasis: true })] }]
      };
    }
  },

  'pipe-flow-noise': {
    category: 'Aero / Distributed Loads',
    basis: 'Pipe acoustic cut-on, convective forcing, wall bending, and shell-frequency pathway screen',
    confidence: 'Wave-scale screening model',
    inputs: [
      { key: 'radius', label: 'Pipe / shell radius', unit: 'm', type: 'number', default: 0.18, min: 0.005 },
      { key: 'length', label: 'Modeled length', unit: 'm', type: 'number', default: 3, min: 0.05 },
      { key: 'thickness', label: 'Wall thickness', unit: 'mm', type: 'number', default: 4, min: 0.05 },
      { key: 'modulus', label: 'Wall Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.01 },
      { key: 'density', label: 'Wall density', unit: 'kg/m³', type: 'number', default: 2700, min: 1 },
      { key: 'sound_speed', label: 'Internal sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 },
      { key: 'flow_speed', label: 'Mean flow speed', unit: 'm/s', type: 'number', default: 90, min: 0.1 },
      { key: 'convection_fraction', label: 'Convection speed / mean speed', type: 'number', default: 0.7, min: 0.2, max: 1 },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 700, min: 0.1 },
      { key: 'axial_order', label: 'Axial shell order m', type: 'number', default: 2, min: 1, max: 20, step: 1 },
      { key: 'circ_order', label: 'Circumferential order n', type: 'number', default: 1, min: 0, max: 20, step: 1 }
    ],
    theory: '<p>Flow systems carry several competing paths: convected wall pressure, internal acoustic modes, shell/pipe waves, and external radiation. Wavenumber and cut-on comparisons show which paths can propagate and which forcing can efficiently match wall bending.</p>',
    assumptions: ['Uniform straight circular pipe with a thin isotropic wall.', 'Single convection speed represents the turbulent forcing ridge.', 'No elbows, valves, pumps, shocks, mean-pressure stiffness, or two-phase flow.'],
    example: 'An elbow can convert otherwise weak axial or torsional motion into strong bending and radiation; use this straight-pipe model as the baseline, not the installed answer.',
    compute(values) {
      const state = pipeNoiseState({ radius: values.radius, length: values.length, thickness: mm(values.thickness), modulus: gpa(values.modulus), density: values.density, soundSpeed: values.sound_speed, flowSpeed: values.flow_speed, convectionFraction: values.convection_fraction, frequency: values.frequency, axialOrder: values.axial_order, circumferentialOrder: values.circ_order, poisson: 0.33 });
      const matchError = Math.abs(Math.log(state.convectiveMatchRatio));
      return {
        values: [stat('First higher-order acoustic cut-on', state.higherOrderCuton, 'Hz'), stat('Shell ring frequency', state.ringFrequency, 'Hz'), stat('Selected shell-mode estimate', state.shellModeFrequency, 'Hz'), stat('Convective / wall k', state.convectiveMatchRatio, '', matchError < 0.25 ? 'warn' : ''), stat('Flow Mach number', state.machNumber), stat('Acoustic regime', state.acousticRegime)],
        interpretation: `At ${state.frequency.toFixed(0)} Hz the pipe is in the “${state.acousticRegime}” acoustic range and the “${state.structuralRegime}” structural range. The convective-to-wall wavenumber ratio is ${state.convectiveMatchRatio.toFixed(2)}.`,
        engineeringConsiderations: launchConsideration('Propellant lines, ECS ducts, purge plumbing, feed systems, and vent paths can transfer pump/valve turbulence into both internal sound and wall vibration; bends and supports convert wave families and create unexpected radiation hot spots.'),
        warnings: [matchError < 0.25 ? 'Convective and wall-bending wavenumbers are closely matched; distributed forcing can couple efficiently to the wall.' : 'A poor straight-pipe wavenumber match does not eliminate excitation at fittings, supports, valves, or discontinuities.'],
        tables: [{ title: 'Competing wave scales', columns: ['Path', 'Wavenumber (rad/m)', 'Wavelength (m)'], rows: [
          ['Internal acoustic', state.acousticWavenumber, state.acousticWavelength],
          ['Convected pressure', state.convectiveWavenumber, state.convectiveWavelength],
          ['Wall bending', state.wallBendingWavenumber, state.wallBendingWavelength]
        ] }]
      };
    }
  },

  'wave-matching-atlas': {
    category: 'Waves & Structures',
    basis: 'Isotropic thin-plate, acoustic, convective, extensional, and shear dispersion relations on common frequency–wavenumber axes',
    confidence: 'Analytical screening model with an explicit classical thin-plate validity indicator',
    inputs: [
      { key: 'frequency', label: 'Evaluation frequency', unit: 'Hz', type: 'number', default: 650, min: 1 },
      { key: 'thickness', label: 'Panel thickness', unit: 'mm', type: 'number', default: 4, min: 0.05 },
      { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.01 },
      { key: 'density', label: 'Material density', unit: 'kg/m³', type: 'number', default: 2700, min: 1 },
      { key: 'poisson', label: 'Poisson ratio', type: 'number', default: 0.33, min: -0.49, max: 0.49 },
      { key: 'sound_speed', label: 'Sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 },
      { key: 'convection_speed', label: 'Pressure convection speed', unit: 'm/s', type: 'number', default: 180, min: 1 }
    ],
    theory: '<p>Wave coupling requires compatible frequency, wavenumber, and direction. The acoustic and convective lines are nondispersive, while thin-plate bending follows k∝√ω. Their intersections mark acoustic coincidence and convective critical-speed matching—not interchangeable phenomena.</p>',
    assumptions: ['Uniform isotropic classical thin plate.', 'One nondispersive acoustic speed and one convection speed.', 'No shell curvature, orthotropy, mean-flow acoustic refraction, or finite-boundary modal discreteness.'],
    example: 'Use the same aluminum skin with c₀=343 m/s and Uc=180 m/s: the acoustic and convective intersections occur at very different frequencies even though both are wavenumber matches.',
    compute(values) {
      const state = waveMatchingState({ frequency: values.frequency, thickness: mm(values.thickness), modulus: gpa(values.modulus), density: values.density, poisson: values.poisson, soundSpeed: values.sound_speed, convectionSpeed: values.convection_speed });
      const warnings = [];
      if (state.thicknessParameter > 0.5) warnings.push('kh exceeds 0.5 at the selected point; replace the classical thin-plate line with a shear/rotary-inertia or sandwich dispersion model.');
      if (Math.abs(Math.log(state.acousticMatchRatio)) < 0.2) warnings.push('The selected point is close to acoustic coincidence; small stiffness, mass, temperature, or incidence changes can strongly alter radiation.');
      if (Math.abs(Math.log(state.convectiveMatchRatio)) < 0.2) warnings.push('The convective ridge is close to the bending-wave wavenumber; use a distributed pressure CSD rather than a point PSD.');
      return {
        values: [stat('Acoustic critical frequency', state.criticalFrequency, 'Hz'), stat('Convective match frequency', state.convectiveMatchFrequency, 'Hz'), stat('Acoustic / bending k', state.acousticMatchRatio), stat('Convective / bending k', state.convectiveMatchRatio), stat('Bending phase speed', state.bendingPhaseSpeed, 'm/s'), stat('Bending wavelength / thickness', state.wavelengthThicknessRatio), stat('Selected regime', state.regime)],
        interpretation: `At ${state.frequency.toFixed(0)} Hz the plate is in the ${state.regime}. The nearest spatial intersection is the ${state.nearestMatch}; acoustic and convective matching must remain separate because their source speeds differ.`,
        engineeringConsiderations: launchConsideration('Use a common frequency–wavenumber map for launch-vehicle fairing TBL response, interior acoustic coincidence, shell/duct paths, and joint wave conversion; mark each relation’s validity boundary directly on the map.'),
        warnings,
        plots: [{ title: 'Frequency–wavenumber atlas', xLabel: 'Frequency (Hz)', yLabel: 'Wavenumber (rad/m)', xScale: 'log', yScale: 'log', traces: [
          trace('Plate bending', state.frequencies, state.bendingCurve, { emphasis: true }),
          trace('Acoustic', state.frequencies, state.acousticCurve),
          trace('Convective pressure', state.frequencies, state.convectiveCurve),
          trace('Extensional', state.frequencies, state.longitudinalCurve),
          trace('Shear', state.frequencies, state.shearCurve)
        ] }],
        tables: [{ title: 'Wave scales at the selected frequency', columns: ['Wave family', 'Wavenumber (rad/m)', 'Phase speed (m/s)'], rows: [
          ['Acoustic', state.acousticWavenumber, state.soundSpeed],
          ['Convective pressure', state.convectiveWavenumber, state.convectionSpeed],
          ['Plate bending', state.bendingWavenumber, state.bendingPhaseSpeed],
          ['Extensional', state.longitudinalWavenumber, state.longitudinalSpeed],
          ['Shear', state.shearWavenumber, state.shearSpeed]
        ] }],
        csv: { filename: 'frequency-wavenumber-atlas.csv', columns: ['frequency_hz', 'bending_k', 'acoustic_k', 'convective_k', 'extensional_k', 'shear_k'], rows: state.frequencies.map((frequency, index) => [frequency, state.bendingCurve[index], state.acousticCurve[index], state.convectiveCurve[index], state.longitudinalCurve[index], state.shearCurve[index]]) }
      };
    }
  },

  'driven-radiation': {
    category: 'Structural Acoustics',
    basis: 'Point-force modal summation for a simply supported baffled plate with surface-averaged radiation screening',
    confidence: 'Deterministic finite-mode screening estimate; radiation efficiency uses parity-aware asymptotic relations',
    inputs: [
      { key: 'length', label: 'Panel length', unit: 'm', type: 'number', default: 1.8, min: 0.05 },
      { key: 'width', label: 'Panel width', unit: 'm', type: 'number', default: 1.1, min: 0.05 },
      { key: 'thickness', label: 'Panel thickness', unit: 'mm', type: 'number', default: 4, min: 0.05 },
      { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.01 },
      { key: 'density', label: 'Panel density', unit: 'kg/m³', type: 'number', default: 2700, min: 1 },
      { key: 'frequency', label: 'Forcing frequency', unit: 'Hz', type: 'number', default: 420, min: 1 },
      { key: 'force', label: 'Point-force RMS', unit: 'N', type: 'number', default: 1, min: 0.000001 },
      { key: 'loss_factor', label: 'Structural loss factor', type: 'number', default: 0.02, min: 0.000001 },
      { key: 'drive_x', label: 'Drive x / L', type: 'number', default: 0.27, min: 0.01, max: 0.99 },
      { key: 'drive_y', label: 'Drive y / W', type: 'number', default: 0.34, min: 0.01, max: 0.99 },
      { key: 'maximum_mode', label: 'Modes per direction', type: 'number', default: 6, min: 2, max: 10, step: 1 }
    ],
    theory: '<p>Each mode receives force through its shape at the drive location. Modal velocities determine point mobility and orthogonal surface-mean-square velocity; the latter combines with modal radiation efficiency to produce sound power and W/F².</p>',
    assumptions: ['Flat simply supported isotropic panel in an infinite rigid baffle.', 'RMS harmonic force, proportional modal loss factor, and an orthogonal truncated mode set.', 'Screening radiation efficiency; no acoustic loading feedback or detailed directivity.'],
    example: 'Move the drive toward a node of the acoustically dominant mode: the structural and acoustic transfer can collapse even though the natural frequency is unchanged.',
    compute(values) {
      const state = drivenRadiationState({ length: values.length, width: values.width, thickness: mm(values.thickness), modulus: gpa(values.modulus), density: values.density, frequency: values.frequency, forceRms: values.force, lossFactor: values.loss_factor, driveX: values.drive_x, driveY: values.drive_y, maximumMode: values.maximum_mode });
      const dominant = state.dominant;
      const highestFrequency = Math.max(...state.modes.map(mode => mode.naturalFrequency));
      const warnings = [];
      if (state.frequency > 0.8 * highestFrequency) warnings.push('The forcing frequency approaches the highest retained mode; increase modal truncation or add residual/static correction before using local response.');
      if (dominant && Math.abs(dominant.driveShape) < 0.15) warnings.push('The acoustically dominant retained mode is driven near a node; small drive-location uncertainty can change the result greatly.');
      warnings.push('The sound-power split uses a baffled flat-plate radiation screen; installed curvature, joints, apertures, blankets, and cavity loading can reorder the dominant modes.');
      return {
        values: [stat('Drive-point mobility', state.driveMobility, 'm/(N·s)'), stat('Surface-averaged mobility', state.surfaceAveragedMobility, 'm/(N·s)'), stat('Radiated sound power', state.soundPower, 'W'), stat('Sound power / force²', state.soundPowerPerForceSquared, 'W/N²'), stat('Effective radiation efficiency', state.radiationEfficiency), stat('Modal overlap', state.modalOverlap), stat('Dominant radiating mode', dominant ? `(${dominant.modeX},${dominant.modeY})` : '—'), stat('Structural regime', state.finiteStructureRegime)],
        interpretation: `The ${values.force} N RMS point force produces ${state.surfaceRmsVelocity.toExponential(3)} m/s surface RMS velocity and ${state.soundPower.toExponential(3)} W radiated power. ${dominant ? `Mode (${dominant.modeX},${dominant.modeY}) near ${dominant.naturalFrequency.toFixed(1)} Hz is the largest retained acoustic contributor.` : ''}`,
        engineeringConsiderations: launchConsideration('For engine, turbopump, actuator, bracket, umbilical, and shaker inputs, preserve force location and phase, use surface response rather than one accelerometer, and separate resonant from nonresonant radiation.'),
        warnings,
        plots: [
          { title: 'Surface-averaged mobility', xLabel: 'Frequency (Hz)', yLabel: 'Mobility (m/N·s)', xScale: 'log', yScale: 'log', traces: [trace('Surface average', state.frequencies, state.mobilityCurve, { emphasis: true })] },
          { title: 'Force-to-sound-power transfer', xLabel: 'Frequency (Hz)', yLabel: 'W/F² (W/N²)', xScale: 'log', yScale: 'log', traces: [trace('Radiated transfer', state.frequencies, state.soundPowerTransferCurve.map(value => Math.max(value, 1e-30)), { emphasis: true })] }
        ],
        tables: [{ title: 'Acoustic power split', columns: ['Contribution', 'Power (W)', 'Fraction'], rows: [
          ['Resonant retained modes', state.resonantPower, state.resonantPower / Math.max(state.soundPower, 1e-30)],
          ['Nonresonant retained modes', state.nonresonantPower, state.nonresonantPower / Math.max(state.soundPower, 1e-30)]
        ] }]
      };
    }
  },

  'sound-intensity-probe': {
    category: 'Test & Signal',
    basis: 'Two-microphone pressure-gradient sound-intensity probe with finite-spacing and residual-phase screening',
    confidence: 'Single-frequency locally planar-field uncertainty screen',
    inputs: [
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'spacer', label: 'Microphone spacer', unit: 'mm', type: 'number', default: 12, min: 0.1 },
      { key: 'sound_speed', label: 'Sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 },
      { key: 'density', label: 'Air density', unit: 'kg/m³', type: 'number', default: 1.204, min: 0.001 },
      { key: 'pressure', label: 'Incident pressure RMS', unit: 'Pa', type: 'number', default: 2, min: 0.000001 },
      { key: 'reflection', label: 'Pressure reflection coefficient', type: 'number', default: 0.35, min: 0, max: 0.98 },
      { key: 'incidence', label: 'Incidence from probe axis', unit: 'deg', type: 'number', default: 20, min: 0, max: 80 },
      { key: 'phase_mismatch', label: 'Residual channel phase mismatch', unit: 'deg', type: 'number', default: 0.15, min: -5, max: 5 },
      { key: 'scan_area', label: 'Integrated scan area', unit: 'm²', type: 'number', default: 1.8, min: 0.001 },
      { key: 'radiating_area', label: 'Radiating structural area', unit: 'm²', type: 'number', default: 1.8, min: 0.001 },
      { key: 'surface_velocity', label: 'Surface velocity RMS', unit: 'mm/s', type: 'number', default: 2, min: 0.000001 }
    ],
    theory: '<p>A pressure-gradient probe estimates particle velocity from the complex pressure difference between two phase-matched microphones. Finite spacing limits the upper band; residual phase and field reactivity limit the lower band.</p>',
    assumptions: ['Locally planar single-frequency field with one incidence angle.', 'One pressure reflection coefficient represents field reactivity.', 'Uniform signed normal intensity over the entered scan area.'],
    example: 'Shrink the spacer to extend the kd upper limit, then increase reflection or phase mismatch and watch the low-frequency bias grow or reverse the apparent intensity direction.',
    compute(values) {
      const state = soundIntensityProbeState({ frequency: values.frequency, spacer: mm(values.spacer), soundSpeed: values.sound_speed, density: values.density, incidentPressureRms: values.pressure, reflectionCoefficient: values.reflection, incidenceDegrees: values.incidence, phaseMismatchDegrees: values.phase_mismatch, scanArea: values.scan_area, radiatingArea: values.radiating_area, surfaceVelocityRms: mm(values.surface_velocity) });
      const warnings = [];
      if (state.kd >= 0.55) warnings.push('kd is at or above 0.55; finite-spacing gradient error exceeds the ACS 519 screening range.');
      if (Math.abs(state.totalBiasPercent) > 5) warnings.push('The combined spacing and phase screen exceeds 5%; change spacer, band, microphone pair, or measurement geometry.');
      if (state.estimatedIntensity < 0) warnings.push('The probe reports apparent inward active intensity; verify orientation, phase calibration, reflections, and residual intensity before accepting a direction reversal.');
      return {
        values: [stat('Estimated normal intensity', state.estimatedIntensity, 'W/m²', state.estimatedIntensity < 0 ? 'warn' : ''), stat('Ideal normal intensity', state.trueNormalIntensity, 'W/m²'), stat('Integrated acoustic power', state.estimatedPower, 'W'), stat('Measured radiation efficiency', state.measuredRadiationEfficiency), stat('kd', state.kd, '', state.kd >= 0.55 ? 'warn' : 'good'), stat('kd=0.55 upper frequency', state.maximumFrequencyKd055, 'Hz'), stat('Approx. 5% phase-error lower frequency', state.minimumFrequencyFivePercentPhase, 'Hz'), stat('Combined bias', state.totalBiasPercent, '%')],
        interpretation: `The ${values.spacer} mm spacer at ${values.frequency} Hz has kd=${state.kd.toFixed(3)} and is ${state.spacingRegime}. The signed result indicates ${state.direction}; the combined teaching-model bias is ${state.totalBiasPercent.toFixed(1)}%.`,
        engineeringConsiderations: launchConsideration('Use signed intensity scans to identify launch-vehicle panel radiation hot spots and validate acoustic power paths, but qualify probe residual intensity, scan closure, background, tangential flow, and structural velocity averaging.'),
        warnings,
        plots: [{ title: 'Probe bias versus frequency', xLabel: 'Frequency (Hz)', yLabel: 'Estimated intensity bias (%)', xScale: 'log', traces: [trace('Spacing + phase screen', state.frequencies, state.biasCurve, { emphasis: true })] }],
        tables: [{ title: 'Bias decomposition', columns: ['Mechanism', 'Estimated bias (%)', 'Physical control'], rows: [
          ['Finite spacing', state.spacingBiasPercent, 'kd and incidence'],
          ['Residual phase in reactive field', state.phaseBiasPercent, 'phase mismatch, reflection, and projected kd'],
          ['Combined', state.totalBiasPercent, 'signed sum in this screening model']
        ] }]
      };
    }
  },

  'dynamic-stress-environment': {
    category: 'Shock & Fatigue',
    basis: 'Modal curvature stress with temperature-dependent properties, thin-shell pressure preload, Goodman, yield, and Miner screens',
    confidence: 'Launch-environment screening model; local stress transfer and material allowables must be supplied by validated analysis or test',
    inputs: [
      { key: 'length', label: 'Panel / bay length', unit: 'm', type: 'number', default: 1.6, min: 0.02 },
      { key: 'width', label: 'Panel / bay width', unit: 'm', type: 'number', default: 1.0, min: 0.02 },
      { key: 'thickness', label: 'Wall thickness', unit: 'mm', type: 'number', default: 3, min: 0.05 },
      { key: 'radius', label: 'Shell radius', unit: 'm', type: 'number', default: 1.8, min: 0.01 },
      { key: 'mode_x', label: 'Mode order m', type: 'number', default: 3, min: 1, max: 20, step: 1 },
      { key: 'mode_y', label: 'Mode order n', type: 'number', default: 1, min: 1, max: 20, step: 1 },
      { key: 'displacement', label: 'Modal displacement RMS', unit: 'µm', type: 'number', default: 150, min: 0.001 },
      { key: 'modulus', label: 'Reference Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.01 },
      { key: 'density', label: 'Material density', unit: 'kg/m³', type: 'number', default: 2700, min: 1 },
      { key: 'temperature', label: 'Environment temperature', unit: '°C', type: 'number', default: 80 },
      { key: 'modulus_slope', label: 'Modulus change per 100°C', unit: '%', type: 'number', default: -3 },
      { key: 'strength_slope', label: 'Strength change per 100°C', unit: '%', type: 'number', default: -5 },
      { key: 'pressure', label: 'Internal pressure', unit: 'kPa', type: 'number', default: 180, min: 0 },
      { key: 'yield_strength', label: 'Reference yield strength', unit: 'MPa', type: 'number', default: 275, min: 0.1 },
      { key: 'ultimate_strength', label: 'Reference ultimate strength', unit: 'MPa', type: 'number', default: 330, min: 0.1 },
      { key: 'fatigue_strength', label: 'Reference fatigue strength at 10⁶ cycles', unit: 'MPa', type: 'number', default: 95, min: 0.1 },
      { key: 'stress_concentration', label: 'Dynamic stress concentration Kt', type: 'number', default: 1.6, min: 1 },
      { key: 'frequency', label: 'Cycle / response frequency', unit: 'Hz', type: 'number', default: 320, min: 0.001 },
      { key: 'duration', label: 'Exposure duration', unit: 's', type: 'number', default: 120, min: 0.001 },
      { key: 'sn_exponent', label: 'Stress-life exponent', type: 'number', default: 6, min: 0.1 }
    ],
    theory: '<p>Surface bending stress follows modal curvature, not displacement alone. Temperature changes both stiffness and allowables; pressure adds membrane mean stress and geometric stiffness. The same environment can therefore reduce displacement while consuming fatigue or yield margin.</p>',
    assumptions: ['One simply supported modal curvature scale and linear elastic response.', 'Thin cylindrical hoop stress pR/h represents the pressure mean stress.', 'Linear temperature-property slopes, Goodman mean-stress correction, Basquin power law, and Miner accumulation.'],
    example: 'Increase pressure: the screened modal frequency rises, but hoop mean stress also rises and can erase the apparent benefit in dynamic response.',
    compute(values) {
      const baseInput = { length: values.length, width: values.width, thickness: mm(values.thickness), radius: values.radius, modeX: values.mode_x, modeY: values.mode_y, displacementRms: num(values.displacement, 0) * 1e-6, referenceModulus: gpa(values.modulus), density: values.density, temperature: values.temperature, modulusPercentPer100C: values.modulus_slope, strengthPercentPer100C: values.strength_slope, pressure: num(values.pressure, 0) * 1000, yieldStrengthReference: num(values.yield_strength, 0) * 1e6, ultimateStrengthReference: num(values.ultimate_strength, 0) * 1e6, fatigueStrengthReference: num(values.fatigue_strength, 0) * 1e6, stressConcentration: values.stress_concentration, frequency: values.frequency, duration: values.duration, snExponent: values.sn_exponent };
      const state = dynamicStressEnvironmentState(baseInput);
      const temperatures = Array.from({ length: 61 }, (_, index) => -100 + index * 5);
      const temperatureStates = temperatures.map(temperature => dynamicStressEnvironmentState({ ...baseInput, temperature }));
      const warnings = [];
      if (state.goodmanUtilization >= 1) warnings.push('The Goodman screening utilization exceeds one; the entered alternating and mean stress combination has no positive fatigue margin.');
      if (state.yieldUtilization >= 1) warnings.push('Peak mean-plus-alternating stress exceeds the temperature-adjusted yield screen.');
      if (state.thickness / state.radius > 0.1) warnings.push('h/R exceeds 0.1; thin-shell hoop stress and membrane-stiffness relations are not appropriate.');
      warnings.push('The modal curvature, Kt, material slopes, and fatigue strength are screening inputs; use local FE strain, configuration-specific allowables, and parent flight-case histories for design acceptance.');
      return {
        values: [stat('Alternating peak stress', state.alternatingStressPeak / 1e6, 'MPa'), stat('Pressure mean hoop stress', state.meanHoopStress / 1e6, 'MPa'), stat('Temperature-adjusted modulus', state.modulus / 1e9, 'GPa'), stat('Pressurized modal-frequency estimate', state.pressurizedFrequency, 'Hz'), stat('Pressure frequency shift', state.pressureFrequencyShiftPercent, '%'), stat('Goodman utilization', state.goodmanUtilization, '', state.goodmanUtilization >= 1 ? 'warn' : 'good'), stat('Fatigue margin', state.fatigueMargin), stat('Yield utilization', state.yieldUtilization, '', state.yieldUtilization >= 1 ? 'warn' : 'good'), stat('Miner damage for entered exposure', state.minerDamage)],
        interpretation: `The entered ${values.displacement} µm RMS modal displacement produces ${state.alternatingStressPeak.toExponential(3)} Pa alternating peak stress after Kt. At ${values.temperature}°C and ${values.pressure} kPa, the model is in the “${state.regime}” regime; pressure shifts the modal scale by ${state.pressureFrequencyShiftPercent.toFixed(1)}% while adding ${ (state.meanHoopStress / 1e6).toFixed(1) } MPa mean hoop stress.`,
        engineeringConsiderations: launchConsideration('Evaluate fairings, interstages, tanks, and pressurized barrels by parent trajectory condition: dynamic response, curvature stress, temperature, pressure preload, duration, mean-stress correction, local concentration, and uncertainty must describe the same physical case.'),
        warnings,
        plots: [{ title: 'Environment sensitivity', xLabel: 'Temperature (°C)', yLabel: 'Utilization', traces: [
          trace('Goodman fatigue utilization', temperatures, temperatureStates.map(item => item.goodmanUtilization), { emphasis: true }),
          trace('Yield utilization', temperatures, temperatureStates.map(item => item.yieldUtilization))
        ] }],
        tables: [{ title: 'Environment-adjusted properties and response', columns: ['Quantity', 'Reference / unpressurized', 'Entered environment'], rows: [
          ['Young’s modulus (GPa)', state.referenceModulus / 1e9, state.modulus / 1e9],
          ['Yield strength (MPa)', state.yieldStrengthReference / 1e6, state.yieldStrength / 1e6],
          ['Fatigue strength at 10⁶ cycles (MPa)', state.fatigueStrengthReference / 1e6, state.fatigueStrength / 1e6],
          ['Modal-frequency scale (Hz)', state.unpressurizedFrequency, state.pressurizedFrequency]
        ] }]
      };
    }
  },

  'launch-acoustic-source': {
    category: 'Aero / Distributed Loads',
    basis: 'Distributed incoherent plume-source power with directivity, reflection, suppression, spreading, and atmospheric-loss screens',
    confidence: 'Mechanism and sensitivity screen; source efficiency and pad effects require vehicle-specific correlation',
    inputs: [
      { key: 'thrust', label: 'Total thrust', unit: 'MN', type: 'number', default: 8, min: 0.001 },
      { key: 'exhaust_velocity', label: 'Effective exhaust velocity', unit: 'm/s', type: 'number', default: 3200, min: 1 },
      { key: 'efficiency', label: 'Acoustic power efficiency', unit: '%', type: 'number', default: 0.5, min: 0.00001, max: 20 },
      { key: 'nozzle_diameter', label: 'Equivalent nozzle diameter', unit: 'm', type: 'number', default: 3, min: 0.01 },
      { key: 'frequency', label: 'Evaluation band center', unit: 'Hz', type: 'number', default: 250, min: 1 },
      { key: 'radial_distance', label: 'Receiver radial distance', unit: 'm', type: 'number', default: 120, min: 1 },
      { key: 'observer_axial', label: 'Receiver axial station', unit: 'm', type: 'number', default: 0 },
      { key: 'plume_length', label: 'Effective source length', unit: 'm', type: 'number', default: 80, min: 0.1 },
      { key: 'directivity', label: 'Directional gain', unit: 'dB', type: 'number', default: 3 },
      { key: 'reflection', label: 'Pad / ground gain', unit: 'dB', type: 'number', default: 2 },
      { key: 'suppression', label: 'Water-suppression reduction', unit: 'dB', type: 'number', default: 6, min: 0 },
      { key: 'atmosphere', label: 'Atmospheric attenuation', unit: 'dB/km', type: 'number', default: 0.8, min: 0 }
    ],
    theory: '<p>The plume converts an uncertain fraction of exhaust mechanical power into broadband sound over an extended source region. Each source element spreads over its own range to the receiver; direction, reflections, water suppression, and atmosphere modify the path. The Strouhal peak is an organizing scale, not a substitute for a measured spectrum.</p>',
    assumptions: ['Incoherent broadband source elements distributed along one plume centerline.', 'One acoustic efficiency and teaching spectral envelope represent all engines and operating conditions.', 'Entered gains and losses are power-level corrections without coherent interference.'],
    example: 'Compare a receiver at one and ten effective plume lengths. The near receiver sees source geometry; only the farther receiver approaches the familiar point-source spreading trend.',
    compute(values) {
      const state = launchAcousticSourceState({ thrust: num(values.thrust, 0) * 1e6, exhaustVelocity: values.exhaust_velocity, acousticEfficiency: num(values.efficiency, 0) / 100, nozzleDiameter: values.nozzle_diameter, frequency: values.frequency, radialDistance: values.radial_distance, observerAxial: values.observer_axial, plumeLength: values.plume_length, directivityGainDb: values.directivity, reflectionGainDb: values.reflection, suppressionDb: values.suppression, atmosphereDbPerKm: values.atmosphere });
      const warnings = [];
      if (state.distanceToPlumeRatio < 2) warnings.push('Receiver distance is less than two source lengths; a point-source 6 dB-per-doubling rule is not a reliable local geometry model.');
      warnings.push('Acoustic efficiency, source distribution, pad gain, and water reduction are correlation inputs—not universal engine constants.');
      warnings.push('Treat ignition overpressure, discrete/shock-cell tones, coherent reflections, and plume–water multiphase loads as separate analyses.');
      const contributionSum = state.contributionIntensity.reduce((sum, value) => sum + value, 0);
      return {
        values: [stat('Mechanical jet power', state.mechanicalJetPower / 1e9, 'GW'), stat('Broadband acoustic power', state.acousticPower / 1e6, 'MW'), stat('Acoustic sound-power level', state.soundPowerLevel, 'dB re 1 pW'), stat('Received overall level', state.overallLevel, 'dB re 20 µPa'), stat('Selected band level', state.bandLevel, 'dB re 20 µPa'), stat('Strouhal peak scale', state.peakFrequency, 'Hz'), stat('Source-power centroid', state.sourceCentroid, 'm'), stat('Distance / plume length', state.distanceToPlumeRatio, '', state.distanceToPlumeRatio < 2 ? 'warn' : 'good')],
        interpretation: `The entered plume converts ${(100 * state.acousticEfficiency).toFixed(3)}% of a ${(state.mechanicalJetPower / 1e9).toFixed(2)} GW mechanical-power screen into ${(state.acousticPower / 1e6).toFixed(2)} MW broadband acoustic power. At the receiver, the distributed model gives ${state.overallLevel.toFixed(1)} dB overall and ${state.bandLevel.toFixed(1)} dB in the selected teaching band; ${state.regime}.`,
        engineeringConsiderations: launchConsideration('Use this source screen to organize plume, pad, tower, deflector, suppression, trajectory, and vehicle-station sensitivities. Preserve spectrum and spatial field when mapping pressure into fairing, interstage, tank, equipment, and payload response.'),
        warnings,
        plots: [
          { title: 'Received level versus radial distance', xLabel: 'Radial distance (m)', yLabel: 'Overall level (dB re 20 µPa)', xScale: 'log', traces: [trace('Distributed plume screen', state.distances, state.levelCurve, { emphasis: true })] },
          { title: 'Teaching broadband spectrum', xLabel: 'Frequency (Hz)', yLabel: 'Band level (dB re 20 µPa)', xScale: 'log', traces: [trace('Plume spectrum', state.frequencies, state.spectrumCurve, { emphasis: true })] }
        ],
        tables: [{ title: 'Source and path budget', columns: ['Quantity', 'Value', 'Interpretation'], rows: [
          ['Directivity + reflection − suppression (dB)', state.gainDb, 'Entered net power-level correction before atmosphere'],
          ['Integrated received intensity (W/m²)', contributionSum, 'Incoherent sum of all source elements'],
          ['Spectral offset from peak (octaves)', state.spectralOffsetOctaves, 'Selected band relative to Strouhal scale'],
          ['Model boundary', state.sourceModelBoundary, 'Required separation of mechanisms']
        ] }],
        csv: { filename: 'launch-acoustic-source-screen.csv', columns: ['distance_m', 'overall_level_db'], rows: state.distances.map((distance, index) => [distance, state.levelCurve[index]]) }
      };
    }
  },

  'wet-tank-dynamics': {
    category: 'Structures',
    basis: 'Mode-dependent liquid added-mass screen with gravity-slosh and compressible liquid-acoustic scales',
    confidence: 'Hydroelastic screening model; frequency crossings and real tank geometry require coupled analysis or test',
    inputs: [
      { key: 'radius', label: 'Tank radius', unit: 'm', type: 'number', default: 2.2, min: 0.05 },
      { key: 'length', label: 'Tank barrel / liquid length', unit: 'm', type: 'number', default: 8, min: 0.1 },
      { key: 'thickness', label: 'Shell thickness', unit: 'mm', type: 'number', default: 6, min: 0.05 },
      { key: 'modulus', label: 'Shell Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.01 },
      { key: 'shell_density', label: 'Shell density', unit: 'kg/m³', type: 'number', default: 2700, min: 1 },
      { key: 'liquid_density', label: 'Liquid density', unit: 'kg/m³', type: 'number', default: 1000, min: 0.1 },
      { key: 'liquid_speed', label: 'Liquid sound speed', unit: 'm/s', type: 'number', default: 1200, min: 1 },
      { key: 'fill', label: 'Fill fraction', unit: '%', type: 'number', default: 72, min: 1, max: 100 },
      { key: 'acceleration', label: 'Effective acceleration', unit: 'm/s²', type: 'number', default: 9.80665, min: 0 },
      { key: 'axial_order', label: 'Axial shell order m', type: 'number', default: 2, min: 1, max: 20, step: 1 },
      { key: 'circ_order', label: 'Circumferential shell order n', type: 'number', default: 2, min: 0, max: 20, step: 1 }
    ],
    theory: '<p>Normal wall motion accelerates a mode-dependent neighborhood of liquid, lowering the dry shell frequency. A free surface adds a low-frequency gravity family, while liquid compressibility creates acoustic modes. Close wet-shell and liquid-acoustic scales signal two-way hydroelastic coupling.</p>',
    assumptions: ['Uniform thin cylindrical shell with an idealized axial liquid depth.', 'Local incompressible added mass is projected onto one shell wavenumber.', 'First lateral slosh and simple axial/radial liquid acoustic scales; no ullage, baffle, dome, or feedline coupling.'],
    example: 'Reduce effective acceleration toward coast: the gravity-slosh scale collapses while wet-shell added mass and compressible liquid-acoustic scales remain.',
    compute(values) {
      const state = wetTankDynamicsState({ radius: values.radius, length: values.length, thickness: mm(values.thickness), modulus: gpa(values.modulus), shellDensity: values.shell_density, liquidDensity: values.liquid_density, liquidSoundSpeed: values.liquid_speed, fillFraction: num(values.fill, 0) / 100, effectiveAcceleration: values.acceleration, axialOrder: values.axial_order, circumferentialOrder: values.circ_order });
      const shift = 100 * (state.wetShellFrequency / state.dryShellFrequency - 1);
      const warnings = [];
      if (state.addedMassRatio > 1) warnings.push('Modal liquid added mass exceeds shell surface mass in this screen; dry-test modal properties are unlikely to transfer without a wet correlation model.');
      if (Math.abs(Math.log(Math.max(state.hydroelasticFrequencyRatio, 1e-12))) < 0.22) warnings.push('Wet-shell and liquid-acoustic scales are close; use a two-way compressible fluid–structure eigenproblem rather than an added-mass-only correction.');
      if (state.effectiveAcceleration < 0.1) warnings.push('Near-microgravity conditions collapse the classical gravity-slosh scale; surface tension, ullage, capillarity, vehicle motion, and control inputs can become first-order.');
      warnings.push('Cryogenic properties, pressurization, domes, baffles, diaphragms, ullage, feedlines, and damping are outside this screen.');
      return {
        values: [stat('Dry shell-mode estimate', state.dryShellFrequency, 'Hz'), stat('Wet shell-mode estimate', state.wetShellFrequency, 'Hz'), stat('Wet frequency shift', shift, '%'), stat('Modal added-mass ratio', state.addedMassRatio), stat('First gravity-slosh scale', state.firstSloshFrequency, 'Hz'), stat('First liquid-acoustic scale', state.firstLiquidAcousticFrequency, 'Hz'), stat('Wet shell / liquid acoustic', state.hydroelasticFrequencyRatio), stat('Coupling screen', state.couplingRegime)],
        interpretation: `At ${values.fill}% fill, the mode-dependent liquid inertia is ${state.addedMassRatio.toFixed(2)} times the shell surface mass and shifts the selected shell estimate from ${state.dryShellFrequency.toFixed(1)} to ${state.wetShellFrequency.toFixed(1)} Hz (${shift.toFixed(1)}%). The first slosh and liquid-acoustic screens are ${state.firstSloshFrequency.toFixed(2)} and ${state.firstLiquidAcousticFrequency.toFixed(1)} Hz, respectively.`,
        engineeringConsiderations: launchConsideration('Carry tank fill, effective acceleration, pressure, temperature, liquid properties, ullage, and boundary configuration as a trajectory-dependent state. Separate slosh-control, hydroelastic, acoustic, and global vehicle-mode verification objectives.'),
        warnings,
        plots: [{ title: 'Tank dynamic families versus fill', xLabel: 'Fill fraction', yLabel: 'Frequency (Hz)', yScale: 'log', traces: [
          trace('Wet shell mode', state.fills, state.wetFrequencyCurve, { emphasis: true }),
          trace('First gravity slosh', state.fills, state.sloshCurve.map(value => Math.max(value, 1e-6))),
          trace('First liquid acoustic', state.fills, state.acousticCurve)
        ] }],
        tables: [{ title: 'Separated dynamic families', columns: ['Family', 'Frequency (Hz)', 'Dominant restoring / inertial physics'], rows: [
          ['Dry shell', state.dryShellFrequency, 'Shell membrane and bending stiffness / shell mass'],
          ['Wet shell', state.wetShellFrequency, 'Shell stiffness / shell plus entrained liquid inertia'],
          ['Free-surface slosh', state.firstSloshFrequency, 'Effective gravity / bulk liquid motion'],
          ['Liquid acoustic', state.firstLiquidAcousticFrequency, 'Liquid compressibility / liquid inertia']
        ] }]
      };
    }
  },

  'qualification-test-planner': {
    category: 'Test & Signal',
    basis: 'Single-band duration equivalence with vibration margin, force/response limiting, notch shape, and acoustic field checks',
    confidence: 'Planning aid only; governing criteria, tolerances, and notch authority remain program controlled',
    inputs: [
      { key: 'flight_psd', label: 'Flight acceleration PSD', unit: 'g²/Hz', type: 'number', default: 0.01, min: 0.000000001 },
      { key: 'flight_duration', label: 'Flight duration', unit: 's', type: 'number', default: 180, min: 0.001 },
      { key: 'test_duration', label: 'Test duration', unit: 's', type: 'number', default: 120, min: 0.001 },
      { key: 'fatigue_exponent', label: 'S–N exponent b', type: 'number', default: 6, min: 0.1 },
      { key: 'margin', label: 'Vibration margin', unit: 'dB', type: 'number', default: 3 },
      { key: 'article_mass', label: 'Test-article mass', unit: 'kg', type: 'number', default: 100, min: 0.01 },
      { key: 'apparent_fraction', label: 'Apparent-mass fraction', type: 'number', default: 0.5, min: 0.01, max: 2 },
      { key: 'force_limit', label: 'Interface force ASD limit', unit: 'N/√Hz', type: 'number', default: 100, min: 0.001 },
      { key: 'response_gain', label: 'Response RMS gain screen', type: 'number', default: 8, min: 0.001 },
      { key: 'response_bandwidth', label: 'Effective response bandwidth', unit: 'Hz', type: 'number', default: 20, min: 0.001 },
      { key: 'response_limit', label: 'Response limit', unit: 'g RMS', type: 'number', default: 4.5, min: 0.001 },
      { key: 'notch_center', label: 'Notch center', unit: 'Hz', type: 'number', default: 280, min: 1 },
      { key: 'notch_width', label: 'Notch width', unit: 'octaves', type: 'number', default: 0.3, min: 0.01 },
      { key: 'flight_oaspl', label: 'Flight acoustic level', unit: 'dB OASPL', type: 'number', default: 142 },
      { key: 'acoustic_margin', label: 'Acoustic margin', unit: 'dB', type: 'number', default: 3 },
      { key: 'mic_min', label: 'Minimum control microphone', unit: 'dB', type: 'number', default: 144.5 },
      { key: 'mic_max', label: 'Maximum control microphone', unit: 'dB', type: 'number', default: 146.5 },
      { key: 'allowed_spread', label: 'Allowed field spread', unit: 'dB', type: 'number', default: 3, min: 0.01 },
      { key: 'method', label: 'Acoustic method', type: 'select', default: 'dfat', options: [{ value: 'dfat', label: 'Direct field (DFAT)' }, { value: 'rfat', label: 'Reverberant field (RFAT)' }, { value: 'program', label: 'Program-specific method' }] }
    ],
    theory: '<p>A Basquin narrowband screen scales PSD with duration so the idealized fatigue damage is preserved, then applies margin. Interface-force and response limits cap fixture-driven overtest through a localized notch. Acoustic control adds target level and spatial-spread checks but cannot prove structural-response equivalence by microphone tolerance alone.</p>',
    assumptions: ['Stationary Gaussian narrowband vibration and one S–N exponent.', 'One apparent-mass and response-gain screen represent the notch location.', 'Acoustic minimum/maximum microphones summarize field control; coherence and response equivalence are not modeled.'],
    example: 'Shorten the test and add margin, then lower the force limit. The unlimited spectrum rises, while a justified local notch protects an interface—but the retained damage objective must still be demonstrated.',
    compute(values) {
      const state = qualificationTestState({ flightPsd: values.flight_psd, flightDuration: values.flight_duration, testDuration: values.test_duration, fatigueExponent: values.fatigue_exponent, marginDb: values.margin, testArticleMass: values.article_mass, apparentMassFraction: values.apparent_fraction, forceLimitAsd: values.force_limit, responseGain: values.response_gain, responseBandwidth: values.response_bandwidth, responseLimitRms: values.response_limit, notchCenter: values.notch_center, notchWidthOctaves: values.notch_width, flightOaspl: values.flight_oaspl, acousticMarginDb: values.acoustic_margin, microphoneMinimum: values.mic_min, microphoneMaximum: values.mic_max, allowedFieldSpread: values.allowed_spread, acousticMethod: values.method });
      const warnings = [];
      if (state.controlScale < 0.999) warnings.push(`A ${Math.abs(state.centerNotchDb).toFixed(1)} dB center notch is active because ${state.limitingMechanism}; verify it with pretest apparent-mass/response predictions, authority approval, and post-test response evidence.`);
      if (!state.fieldUniformityPass) warnings.push(`The ${state.fieldSpread.toFixed(1)} dB microphone spread exceeds the entered ${state.allowedFieldSpread.toFixed(1)} dB field limit.`);
      if (Math.abs(state.fieldControlError) > 1) warnings.push(`The mean control microphone differs from target by ${state.fieldControlError.toFixed(1)} dB; inspect channel tolerances and spatial coverage.`);
      warnings.push('NASA-STD-7001C is payload-focused and excludes launch vehicles; use the governing launch-vehicle program criteria, factors, and approval process.');
      warnings.push('Control-level compliance does not prove response or damage equivalence between flight, RFAT, DFAT, and shaker configurations.');
      return {
        values: [stat('Unlimited test PSD', state.unlimitedTestPsd, 'g²/Hz'), stat('Controlled PSD at notch', state.controlledTestPsd, 'g²/Hz'), stat('Equivalent level above flight', state.equivalentTestFactorDb, 'dB'), stat('Predicted interface force ASD', state.predictedForceAsd, 'N/√Hz'), stat('Predicted unlimited response', state.predictedResponseRms, 'g RMS'), stat('Center notch', state.centerNotchDb, 'dB', state.controlScale < 0.999 ? 'warn' : 'good'), stat('Local controlled damage / flight', state.controlledDamageRatio), stat('Acoustic target', state.targetAcousticLevel, 'dB OASPL'), stat('Microphone field spread', state.fieldSpread, 'dB', state.fieldUniformityPass ? 'good' : 'warn')],
        interpretation: `Duration and the entered margin raise the flight PSD to ${state.unlimitedTestPsd.toExponential(3)} g²/Hz before limiting. ${state.limitingMechanism}; the center-controlled value is ${state.controlledTestPsd.toExponential(3)} g²/Hz with a local damage ratio of ${state.controlledDamageRatio.toFixed(2)} relative to the entered flight exposure. ${state.methodGuidance}`,
        engineeringConsiderations: launchConsideration('Tie every test level, tolerance, notch, abort, duration, control channel, and response limit to a named verification objective and governing authority. Retain interface force, local response, field mapping, and post-test health evidence in the qualification record.'),
        warnings,
        plots: [{ title: 'Flight, unlimited test, and controlled notch', xLabel: 'Frequency (Hz)', yLabel: 'Acceleration PSD (g²/Hz)', xScale: 'log', yScale: 'log', traces: [
          trace('Flight environment', state.frequencies, state.flightCurve),
          trace('Unlimited test', state.frequencies, state.unlimitedCurve),
          trace('Controlled test', state.frequencies, state.controlledCurve, { emphasis: true })
        ] }],
        tables: [{ title: 'Tailoring audit', columns: ['Check', 'Result', 'Meaning'], rows: [
          ['Duration PSD factor', state.durationPsdFactor, 'Equal-damage screen before margin'],
          ['Force control scale', state.forceControlScale, 'PSD scale allowed by interface-force limit'],
          ['Response control scale', state.responseControlScale, 'PSD scale allowed by response limit'],
          ['Acoustic field uniformity', state.fieldUniformityPass ? 'Pass screen' : 'Outside entered screen', `${state.fieldSpread.toFixed(1)} dB spread`],
          ['Applicability boundary', state.qualificationBoundary, 'Program authority governs']
        ] }]
      };
    }
  }
};

export const acs519CalculatorRegistry = createEngineeringRegistry(acs519CalculatorDefinitions);
