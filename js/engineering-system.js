// Shared data and browser-local state for the engineering knowledge system.

export const engineeringSystemSchema = 'sau-engineering-project';
export const engineeringSystemVersion = 1;
export const engineeringProjectStorageKey = 'sau-engineering-project-v1';

export const materialLibrary = Object.freeze([
  { id: 'aluminum-2024', name: '2024-T3 aluminum', density: 2780, modulus: 73.1, poisson: 0.33, lossFactor: 0.004, note: 'Representative room-temperature isotropic screen; verify temper, direction, joints, and temperature.' },
  { id: 'aluminum-6061', name: '6061-T6 aluminum', density: 2700, modulus: 68.9, poisson: 0.33, lossFactor: 0.004, note: 'Useful preliminary shell and panel value; fabrication and boundary damping often dominate.' },
  { id: 'titanium-6al4v', name: 'Ti-6Al-4V', density: 4430, modulus: 114, poisson: 0.34, lossFactor: 0.003, note: 'Representative elastic properties only; verify temperature, heat treatment, and preload state.' },
  { id: 'steel', name: 'Structural steel', density: 7850, modulus: 200, poisson: 0.30, lossFactor: 0.002, note: 'Generic steel screen; welded and bolted assemblies require measured or justified damping.' },
  { id: 'cfrp-qi', name: 'Quasi-isotropic CFRP', density: 1580, modulus: 55, poisson: 0.30, lossFactor: 0.012, note: 'Equivalent isotropic screen only; retain laminate ABD properties for production analysis.' },
  { id: 'sandwich', name: 'Aluminum honeycomb sandwich', density: 480, modulus: 28, poisson: 0.28, lossFactor: 0.018, note: 'Equivalent panel screen; facesheet, core shear, inserts, bonds, and local modes require explicit treatment.' }
]);

export const environmentLibrary = Object.freeze([
  { id: 'air-20c', name: 'Air · 20 °C', density: 1.204, soundSpeed: 343, note: 'Nominal dry-air laboratory condition.' },
  { id: 'air-cold', name: 'Air · cold ascent screen', density: 0.95, soundSpeed: 325, note: 'Illustrative only; use trajectory pressure and temperature for flight.' },
  { id: 'water', name: 'Water · room temperature', density: 998, soundSpeed: 1482, note: 'Representative liquid-loading screen.' },
  { id: 'rp1', name: 'RP-1 screen', density: 810, soundSpeed: 1320, note: 'Illustrative property pair; use program-controlled propellant data at state.' },
  { id: 'lox', name: 'LOX screen', density: 1141, soundSpeed: 1120, note: 'Illustrative cryogenic screen; property and ullage state must be configuration controlled.' }
]);

export const projectTemplates = Object.freeze([
  { id: 'fairing-ascent', name: 'Payload fairing ascent', hardwareId: 'fairing', environment: 'Liftoff acoustic and ascent forcing', bandSet: 'One-third-octave', materialId: 'aluminum-6061', summary: 'Trace external forcing through fairing response, cavity energy, equipment loading, and qualification evidence.' },
  { id: 'wet-tank', name: 'Wet tank state sweep', hardwareId: 'tank', environment: 'Fill, acceleration, pressure, and thermal state', bandSet: 'Modal plus one-third-octave', materialId: 'aluminum-2195', summary: 'Track dry shell, wet shell, slosh, liquid acoustic, and hydroelastic proximity across vehicle state.' },
  { id: 'avionics', name: 'Avionics equipment response', hardwareId: 'avionics', environment: 'Base-drive random vibration and shock', bandSet: 'PSD, VRS, SRS, and FDS', materialId: 'aluminum-6061', summary: 'Connect interface environments, isolators, equipment modes, response limits, and test control.' },
  { id: 'noise-control', name: 'Installed noise-control study', hardwareId: 'feed-system', environment: 'Source-path-receiver network', bandSet: 'Octave and one-third-octave', materialId: 'steel', summary: 'Rank airborne, structure-borne, leakage, flanking, duct, and enclosure paths before treatment.' },
  { id: 'model-test', name: 'Model-test validation record', hardwareId: 'payload-deck', environment: 'Ground test and analytical correlation', bandSet: 'FRF and modal', materialId: 'aluminum-6061', summary: 'Preserve configuration, coordinate mapping, correlation metrics, residuals, uncertainty, and review evidence.' }
]);

export const hardwareTopics = Object.freeze([
  {
    id: 'fairing', title: 'Payload fairing & cavity', eyebrow: 'External field to payload response', accent: '#6f8cff',
    summary: 'Follow liftoff acoustics and boundary-layer forcing through the fairing shell, blankets, leakage, cavity field, payload deck, and equipment interfaces.',
    sources: ['Distributed plume acoustics', 'Turbulent boundary layer', 'Aerodynamic buffet', 'Separation shock'],
    paths: ['Shell resonant transmission', 'Direct nonresonant transmission', 'Blanket and trim paths', 'Leaks, vents, and flanking structure'],
    responses: ['Fairing panel velocity and stress', 'Cavity energy and SPL', 'Payload-deck acceleration', 'Equipment local response'],
    measurements: ['External and internal microphones', 'Fairing accelerometers and strain', 'Intensity or array source maps', 'Interface-control channels'],
    mitigations: ['Blanket coverage and installation', 'Leak and vent control', 'Panel/joint damping', 'Payload isolation and response limiting'],
    models: [
      { title: 'Installed Fairing SEA', href: '#/tool/installed-fairing-sea' },
      { title: 'Launch Excitation Workbench', href: '#/tool/launch-acoustic-source' },
      { title: 'Double-Panel SEA', href: '#/tool/double-panel-sea' },
      { title: 'Fairing Cavity Screen', href: '#/tool/fairing-cavity' }
    ],
    chapters: ['payload-fairing-cavities', 'installed-fairing-sea-parameters', 'launch-acoustic-sources-deep-dive']
  },
  {
    id: 'tank', title: 'Propellant tank barrel', eyebrow: 'Wet shell and hydroacoustic state', accent: '#55b8ff',
    summary: 'Separate shell modes, liquid added mass, gravity slosh, compressible liquid acoustics, pressurization, and state-dependent coupling.',
    sources: ['Axial and lateral base motion', 'Distributed aerodynamic pressure', 'Engine and feed-system forcing', 'Pressure transients'],
    paths: ['Global shell modes', 'Local barrel and dome modes', 'Liquid pressure coupling', 'Interfaces, baffles, and feedline attachments'],
    responses: ['Wet-shell frequency shifts', 'Slosh and ullage motion', 'Liquid acoustic pressure', 'Dynamic stress and interface load'],
    measurements: ['Dry and wet modal surveys', 'Wall acceleration and strain', 'Internal pressure sensors', 'Fill, pressure, and temperature state'],
    mitigations: ['Baffles and propellant management', 'Local stiffening and joint control', 'Feedline decoupling', 'State-aware flight and test limits'],
    models: [
      { title: 'Wet-Tank Hydroacoustic Atlas', href: '#/tool/wet-tank-dynamics' },
      { title: 'Shell Acoustics', href: '#/tool/shell-acoustics' },
      { title: 'Dynamic Stress Environment', href: '#/tool/dynamic-stress-environment' },
      { title: 'Modal Density & Wave-Family Atlas', href: '#/tool/modal-density' }
    ],
    chapters: ['wet-tank-dynamics-deep-dive', 'shell-acoustics-deep-dive', 'structures-waves']
  },
  {
    id: 'interstage', title: 'Interstage, skirts & joints', eyebrow: 'Impedance transitions and structural paths', accent: '#58d59b',
    summary: 'Treat joints and stiffness transitions as wave filters whose preload, nonlinear contact, and local geometry can control vehicle-wide transmission.',
    sources: ['Stage and engine interface loads', 'Shell-wave arrival', 'Separation transients', 'Local equipment and line forcing'],
    paths: ['Bolted and bonded joints', 'Ring frames and longerons', 'Shell-wave conversion', 'Cavity and vent coupling'],
    responses: ['Joint slip and local stress', 'Transmitted force and mobility', 'Downstream shell response', 'Energy branching between paths'],
    measurements: ['Interface force and acceleration', 'Operational deflection shapes', 'Joint preload and torque records', 'Transfer-mobility and intensity scans'],
    mitigations: ['Preload and interface control', 'Impedance transition shaping', 'Damping and isolation', 'Alternate load-path management'],
    models: [
      { title: 'Wave Matching Atlas', href: '#/tool/wave-matching-atlas' },
      { title: 'Nonlinear Joint Screen', href: '#/tool/nonlinear-joint' },
      { title: 'Junction Transmission', href: '#/tool/junction-transmission' },
      { title: 'Transfer-Path Analysis', href: '#/tool/transfer-path-analysis' }
    ],
    chapters: ['wave-matching-deep-dive', 'nonlinear-dynamics-joints', 'general-sea-networks']
  },
  {
    id: 'avionics', title: 'Avionics bay & equipment', eyebrow: 'Interface environment to local response', accent: '#f2c663',
    summary: 'Connect vehicle-level environments to racks, isolators, circuit cards, sensors, and qualification controls without hiding local amplification.',
    sources: ['Base-drive random vibration', 'Acoustic cavity forcing', 'Mechanical shock and pyroshock', 'Fan, pump, and line forcing'],
    paths: ['Rack and bracket modes', 'Mount and isolator paths', 'Harness and line bypasses', 'Local panel and card modes'],
    responses: ['Equipment acceleration and displacement', 'Fastener and solder fatigue', 'Connector relative motion', 'Control-channel force or response'],
    measurements: ['Interface and response accelerometers', 'Force transducers and impedance heads', 'MIMO control channels', 'Modal and operational surveys'],
    mitigations: ['Isolation and tuned absorbers', 'Bracket and board stiffening', 'Notching and response limiting', 'Harness and connector control'],
    models: [
      { title: 'Qualification Test Planner', href: '#/tool/qualification-test-planner' },
      { title: 'Random & Shock Workbench', href: '#/tool/time-psd' },
      { title: 'Equipment Loading', href: '#/tool/equipment-loading' },
      { title: 'MIMO Test Control', href: '#/tool/mimo-test-control' }
    ],
    chapters: ['qualification-testing-deep-dive', 'signal-testing', 'random-psd']
  },
  {
    id: 'feed-system', title: 'Feedlines, ducts & cavities', eyebrow: 'Internal flow and acoustic networks', accent: '#9478ff',
    summary: 'Trace fluid-borne, airborne, and structure-borne paths through lines, bends, supports, ducts, cavities, valves, and rotating equipment.',
    sources: ['Turbulent flow and separation', 'Pumps, fans, and valves', 'Combustion and pressure ripple', 'Structure-borne support motion'],
    paths: ['Plane and higher-order duct modes', 'Pipe-wall waves', 'Support and clamp transmission', 'Cavity, opening, and breakout paths'],
    responses: ['Internal pressure spectra', 'Pipe and duct wall vibration', 'Breakout noise', 'Support and equipment loads'],
    measurements: ['Pressure and intensity probes', 'Wall acceleration and strain', 'Flow state and operating point', 'Array or source-identification measurements'],
    mitigations: ['Liners and expansion elements', 'Support and clamp redesign', 'Flow-path smoothing', 'Isolation and enclosure control'],
    models: [
      { title: 'Fan & Duct Network', href: '#/tool/fan-duct-network' },
      { title: 'Pipe Flow Noise', href: '#/tool/pipe-flow-noise' },
      { title: 'Expansion Chamber', href: '#/tool/expansion-chamber' },
      { title: 'Source Identification Array', href: '#/tool/source-identification-array' }
    ],
    chapters: ['pipe-flow-noise-deep-dive', 'fans-duct-flow-noise', 'noise-control-workflow']
  },
  {
    id: 'propulsion', title: 'Engine, plume & pad region', eyebrow: 'Distributed source to vehicle forcing', accent: '#ff8888',
    summary: 'Keep broadband plume noise, discrete tones, ignition overpressure, pad reflections, suppression, directivity, and trajectory as separate mechanisms.',
    sources: ['Turbulent plume mixing', 'Shock-associated noise', 'Turbomachinery and combustion tones', 'Ignition and pad interaction'],
    paths: ['Distributed-source radiation', 'Pad reflection and shielding', 'Atmospheric propagation', 'Vehicle skin acceptance'],
    responses: ['Station external pressure', 'Panel accepted power', 'Global and local vehicle response', 'Ground-equipment exposure'],
    measurements: ['Phased microphone arrays', 'Near- and far-field pressure', 'Vehicle-station microphones', 'Trajectory and meteorology'],
    mitigations: ['Water suppression and placement', 'Deflector and pad geometry', 'Shielding and stand-off', 'Vehicle treatment and qualification'],
    models: [
      { title: 'Launch Excitation Definition', href: '#/tool/launch-acoustic-source' },
      { title: 'Spatial Correlation', href: '#/tool/spatial-correlation' },
      { title: 'Equivalent Power Injection', href: '#/tool/equivalent-power-injection' },
      { title: 'Outdoor Propagation', href: '#/tool/outdoor-propagation' }
    ],
    chapters: ['launch-acoustic-sources-deep-dive', 'distributed-loads', 'source-identification-arrays']
  },
  {
    id: 'payload-deck', title: 'Payload deck & interfaces', eyebrow: 'Vehicle response to payload evidence', accent: '#8fc7f2',
    summary: 'Close the chain from vehicle forcing through deck motion, payload modes, interface requirements, uncertainty, model correlation, and acceptance evidence.',
    sources: ['Fairing cavity field', 'Vehicle structural response', 'Stage and separation events', 'Ground handling and test inputs'],
    paths: ['Deck and adapter modes', 'Payload interface stiffness', 'Isolation systems', 'Harness, purge, and secondary paths'],
    responses: ['Interface acceleration and force', 'Payload modal response', 'Alignment and relative motion', 'Fatigue and extreme response'],
    measurements: ['Interface control accelerometers', 'Payload response channels', 'Modal correlation data', 'Force limits and abort channels'],
    mitigations: ['Interface isolation', 'Notching and force limiting', 'Adapter or deck redesign', 'Requirement and uncertainty control'],
    models: [
      { title: 'Mission Environment Center', href: '#/tool/mission-environment-timeline' },
      { title: 'Model–Test Correlation Lab', href: '#/tool/model-test-correlation' },
      { title: 'Requirements Flowdown', href: '#/tool/requirements-flowdown' },
      { title: 'Uncertainty & Sensitivity', href: '#/tool/uncertainty-sensitivity' }
    ],
    chapters: ['launch-vibroacoustic-capstone', 'model-test-correlation', 'requirements-margin-flowdown']
  }
]);

const pathStep = (title, kind, href, why) => ({ title, kind, href, why });

export const learningPathways = Object.freeze([
  { id: 'new-analyst', title: 'New structural-acoustics analyst', role: 'Foundation', summary: 'Build physical intuition before moving into coupled response and energy methods.', steps: [
    pathStep('SDOF response and damping', 'Chapter', '#/cheat-sheet?section=sdof', 'Anchor resonance, bandwidth, phase, and energy dissipation.'),
    pathStep('Waves in structures', 'Chapter', '#/cheat-sheet?section=structures-waves', 'Connect modes to propagating wave behavior.'),
    pathStep('Coincidence explorer', 'Lab', '#/demo/coincidence', 'See structural and acoustic wavenumber matching.'),
    pathStep('Structural acoustics', 'Chapter', '#/cheat-sheet?section=structural-acoustics', 'Connect force, velocity, pressure, and radiated power.'),
    pathStep('Launch vibroacoustic capstone', 'Capstone', '#/tool/launch-vibroacoustic-capstone', 'Apply the full source-path-response chain.')
  ] },
  { id: 'sea-analyst', title: 'SEA analyst', role: 'High-frequency analysis', summary: 'Move from modal population and damping through coupling, power balance, response recovery, and validation.', steps: [
    pathStep('SEA foundations', 'Chapter', '#/cheat-sheet?section=sea', 'Establish energy, modal density, damping, and coupling definitions.'),
    pathStep('Modal density atlas', 'Lab', '#/demo/modal-density-regime-map', 'Inspect modes per band and overlap.'),
    pathStep('SEA validity screen', 'Tool', '#/tool/sea-validity-confidence', 'Check population, weak coupling, and variability.'),
    pathStep('Launch vehicle SEA capstone', 'Capstone', '#/tool/launch-vibroacoustic-capstone', 'Build and review a traceable subsystem network.'),
    pathStep('Experimental SEA', 'Tool', '#/tool/experimental-sea', 'Plan power injection and identify coupling evidence.')
  ] },
  { id: 'structural-dynamicist', title: 'Structural dynamicist', role: 'Modes, loads, and stress', summary: 'Connect modal response, wave behavior, joints, random environments, and dynamic stress.', steps: [
    pathStep('Modal response', 'Chapter', '#/cheat-sheet?section=modal-dynamics', 'Review modal coordinates, effective mass, and truncation.'),
    pathStep('Wave matching atlas', 'Workbench', '#/tool/wave-matching-atlas', 'Relate mode families to propagating branches.'),
    pathStep('Random and shock workbench', 'Workbench', '#/tool/time-psd', 'Move from record to PSD, VRS, SRS, FDS, and extremes.'),
    pathStep('Dynamic stress environment', 'Tool', '#/tool/dynamic-stress-environment', 'Combine dynamic response, preload, temperature, and fatigue.'),
    pathStep('Model–test correlation', 'Workbench', '#/tool/model-test-correlation', 'Close the loop with test evidence.')
  ] },
  { id: 'test-engineer', title: 'Acoustic & vibration test engineer', role: 'Measurement and qualification', summary: 'Plan measurements, preserve signal integrity, control tests, and defend model-to-test evidence.', steps: [
    pathStep('Signal and testing', 'Chapter', '#/cheat-sheet?section=signal-testing', 'Establish sampling, windows, resolution, and calibration.'),
    pathStep('Time-to-PSD workbench', 'Workbench', '#/tool/time-psd', 'Preserve processing provenance and closure.'),
    pathStep('Acoustic measurement planner', 'Tool', '#/tool/acoustic-measurement-planner', 'Select microphones, fields, bandwidth, and corrections.'),
    pathStep('Qualification planner', 'Workbench', '#/tool/qualification-test-planner', 'Define control, notching, force limits, and abort logic.'),
    pathStep('Model–test validation lab', 'Workbench', '#/tool/model-test-correlation', 'Document correlation and residual evidence.')
  ] },
  { id: 'launch-integrator', title: 'Launch-vehicle integrator', role: 'Program-level vibroacoustics', summary: 'Follow mission events from propulsion and aerodynamics to vehicle, payload, test, and credibility decisions.', steps: [
    pathStep('Launch-vehicle subjects', 'Subject hub', '#/subject/distributed-loads', 'Connect physical sources, paths, and receivers through the subject-first curriculum.'),
    pathStep('Launch excitation workbench', 'Workbench', '#/tool/launch-acoustic-source', 'Define distributed forcing and accepted power.'),
    pathStep('Launch SEA capstone', 'Capstone', '#/tool/launch-vibroacoustic-capstone', 'Solve subsystem energy, coupling, and response.'),
    pathStep('Mission environment center', 'Workbench', '#/tool/mission-environment-timeline', 'Map event controllers and evidence maturity.'),
    pathStep('Engineering project workspace', 'Project', '#/workspace', 'Package assumptions, results, provenance, and open actions.')
  ] },
  { id: 'noise-control', title: 'Noise-control engineer', role: 'Installed source–path–receiver design', summary: 'Rank parallel paths before selecting treatments and verify the installed weakest link.', steps: [
    pathStep('Noise-control foundations', 'Chapter', '#/cheat-sheet?section=noise-control-workflow', 'Separate source, path, receiver, and metric.'),
    pathStep('Canonical source lab', 'Tool', '#/tool/canonical-source', 'Identify source type, geometry, and directivity.'),
    pathStep('Installed noise-control workbench', 'Workbench', '#/tool/noise-control-path', 'Rank airborne, duct, structure, leakage, and flanking paths.'),
    pathStep('Treatment design', 'Tool', '#/tool/acoustic-treatment', 'Trade absorption, coverage, backing, and mass.'),
    pathStep('Measurement planner', 'Tool', '#/tool/acoustic-measurement-planner', 'Define verification metrics and field conditions.')
  ] }
]);

const includesAny = (value, terms) => terms.some(term => value.includes(term));

export function classifyTool(tool, workbenchIds = [], analysisIds = []) {
  const text = `${tool.id} ${tool.title} ${tool.description} ${tool.category} ${(tool.keywords ?? []).join(' ')}`.toLowerCase();
  const analysis = analysisIds.includes(tool.id);
  const workbench = !analysis && (workbenchIds.includes(tool.id) || tool.id === 'launch-vibroacoustic-capstone');
  let task = 'Response & loads';
  if (includesAny(text, ['sea', 'energy', 'modal density', 'coupling loss'])) task = 'SEA & energy';
  else if (includesAny(text, ['test', 'measurement', 'signal', 'correlation', 'qualification', 'credibility'])) task = 'Test & validation';
  else if (includesAny(text, ['noise control', 'transmission', 'tl', 'insertion', 'barrier', 'enclosure', 'treatment'])) task = 'Transmission & control';
  else if (includesAny(text, ['source', 'plume', 'field', 'propagation', 'psd combination'])) task = 'Sources & environments';
  else if (includesAny(text, ['wave', 'radiation', 'coincidence', 'critical frequency', 'ring frequency'])) task = 'Waves & radiation';

  let hardware = 'General system';
  if (includesAny(text, ['tank', 'shell', 'cylinder', 'slosh'])) hardware = 'Tanks & shells';
  else if (includesAny(text, ['fairing', 'panel', 'plate', 'cavity', 'transmission loss'])) hardware = 'Fairing & panels';
  else if (includesAny(text, ['pipe', 'duct', 'fan', 'flow noise'])) hardware = 'Ducts & feedlines';
  else if (includesAny(text, ['joint', 'junction', 'interface', 'mobility', 'isolation'])) hardware = 'Joints & interfaces';
  else if (includesAny(text, ['launch', 'plume', 'outdoor propagation'])) hardware = 'Propulsion & ascent';
  else if (includesAny(text, ['equipment', 'payload', 'qualification', 'test control'])) hardware = 'Payload & equipment';

  let input = 'Geometry & properties';
  if (includesAny(text, ['time history', 'time-to-psd', 'integration drift'])) input = 'Time history';
  else if (includesAny(text, ['psd', 'srs', 'vrs', 'fds', 'spectrum', 'octave'])) input = 'Spectrum or bands';
  else if (includesAny(text, ['correlation', 'modal test', 'measurement', 'source identification', 'mimo'])) input = 'Measurement or model data';
  else if (includesAny(text, ['sea', 'network', 'path analysis'])) input = 'System network';
  else if (includesAny(text, ['source', 'propagation', 'field'])) input = 'Source and path data';

  return {
    level: analysis ? 'Interactive analysis' : workbench ? 'Guided workbench' : tool.complexity === 'Advanced' ? 'Advanced calculator' : 'Quick screen',
    task,
    hardware,
    input,
    workbench,
    analysis
  };
}

const explicitHandoffs = Object.freeze({
  'launch-acoustic-source': ['equivalent-power-injection', 'installed-fairing-sea', 'launch-vibroacoustic-capstone'],
  'equivalent-power-injection': ['launch-vibroacoustic-capstone', 'sea-response-recovery', 'qualification-test-planner'],
  'launch-vibroacoustic-capstone': ['sea-response-recovery', 'qualification-test-planner', 'model-test-correlation'],
  'time-psd': ['vrs', 'extreme-response', 'fds'],
  'vrs': ['extreme-response', 'qualification-test-planner', 'dynamic-stress-environment'],
  'srs': ['pyroshock', 'qualification-test-planner', 'dynamic-stress-environment'],
  'critical-frequency': ['elastic-panel-tl', 'radiation-efficiency-atlas', 'wave-matching-atlas'],
  'modal-density': ['sea-validity-confidence', 'launch-vibroacoustic-capstone', 'hybrid-method-selection'],
  'sea-validity-confidence': ['launch-vibroacoustic-capstone', 'experimental-sea', 'model-test-correlation'],
  'model-test-correlation': ['uncertainty-sensitivity', 'credibility-scorecard', 'mission-environment-timeline'],
  'qualification-test-planner': ['mimo-test-control', 'model-test-correlation', 'credibility-scorecard'],
  'noise-control-path': ['acoustic-treatment', 'enclosure-design', 'acoustic-measurement-planner']
});

export function toolHandoffs(tool, catalog) {
  const ids = explicitHandoffs[tool.id] ?? [];
  const explicit = ids.map(id => catalog.find(candidate => candidate.id === id)).filter(Boolean);
  if (explicit.length) return explicit;
  const related = catalog.filter(candidate => candidate.id !== tool.id && candidate.category === tool.category).slice(0, 3);
  return related.length ? related : ['db', 'octave', 'time-psd'].map(id => catalog.find(candidate => candidate.id === id)).filter(candidate => candidate && candidate.id !== tool.id);
}

const metric = (result, label) => result?.values?.find(value => value.label === label)?.value;
const defaults = calculator => Object.fromEntries((calculator?.inputs ?? []).map(field => [field.key, field.default]));

export const validationBenchmarks = Object.freeze([
  {
    id: 'db-equal-source', title: 'Equal independent source addition', principle: 'Two equal uncorrelated levels add 3.0103 dB.', toolId: 'db', expected: 93.0103, tolerance: 0.0002, unit: 'dB',
    evaluate(registry) { const input = { ...defaults(registry.db), levels: '90, 90' }; return metric(registry.db.compute(input), 'Combined level'); }
  },
  {
    id: 'miles-narrowband', title: 'Miles narrowband response', principle: 'The calculator must reproduce √(πQfₙSₐ/2) for a flat local PSD.', toolId: 'miles', expected: Math.sqrt(Math.PI / 2), tolerance: 0.000002, unit: 'GRMS',
    evaluate(registry) { const input = { ...defaults(registry.miles), fn: 1, Q: 1, psd: 1 }; return metric(registry.miles.compute(input), 'Acceleration response'); }
  },
  {
    id: 'sea-power-balance', title: 'SEA steady-state power closure', principle: 'Input power must equal dissipated power for the solved network.', toolId: 'multi-subsystem-sea', expected: 0, tolerance: 0.000001, unit: '%',
    evaluate(registry) { return Math.abs(metric(registry['multi-subsystem-sea'].compute(defaults(registry['multi-subsystem-sea'])), 'Power balance error')); }
  },
  {
    id: 'coincidence-thickness', title: 'Plate coincidence thickness scaling', principle: 'For fixed isotropic material and fluid, critical frequency varies inversely with thickness.', toolId: 'critical-frequency', expected: 0.5, tolerance: 0.00001, unit: 'ratio',
    evaluate(registry) { const calculator = registry['critical-frequency']; const base = defaults(calculator); const first = metric(calculator.compute({ ...base, thickness_mm: 3 }), 'Critical frequency'); const second = metric(calculator.compute({ ...base, thickness_mm: 6 }), 'Critical frequency'); return second / first; }
  },
  {
    id: 'mass-law-octave', title: 'Mass-law octave slope', principle: 'Below coincidence, doubling frequency raises normal-incidence mass-law TL by approximately 6.0206 dB.', toolId: 'elastic-panel-tl', expected: 6.0206, tolerance: 0.08, unit: 'dB/octave',
    evaluate(registry) { const calculator = registry['elastic-panel-tl']; const base = defaults(calculator); const low = metric(calculator.compute({ ...base, frequency: 500 }), 'Normal-incidence TL'); const high = metric(calculator.compute({ ...base, frequency: 1000 }), 'Normal-incidence TL'); return high - low; }
  }
]);

export function runValidationBenchmarks(registry) {
  return validationBenchmarks.map(benchmark => {
    try {
      const actual = Number(benchmark.evaluate(registry));
      const error = Math.abs(actual - benchmark.expected);
      return { ...benchmark, actual, error, pass: Number.isFinite(actual) && error <= benchmark.tolerance };
    } catch (caught) {
      return { ...benchmark, actual: NaN, error: NaN, pass: false, message: caught?.message ?? String(caught) };
    }
  });
}

export function createEngineeringProject(templateId = projectTemplates[0].id) {
  const template = projectTemplates.find(item => item.id === templateId) ?? projectTemplates[0];
  const material = materialLibrary.find(item => item.id === template.materialId) ?? materialLibrary[0];
  return {
    schema: engineeringSystemSchema,
    version: engineeringSystemVersion,
    name: template.name,
    templateId: template.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    context: {
      hardwareId: template.hardwareId,
      environment: template.environment,
      bandSet: template.bandSet,
      units: 'SI',
      materialId: material.id,
      fluidId: environmentLibrary[0].id,
      analyst: '',
      configuration: 'Teaching / screening configuration',
      geometry: 'Record representative dimensions, area, volume, joints, and boundary conditions.',
      assumptions: 'Record the assumptions shared across tools and the evidence needed to confirm them.'
    },
    artifacts: [],
    notes: '',
    completedPathSteps: {}
  };
}

export function normalizeEngineeringProject(input) {
  const source = input && typeof input === 'object' ? input : {};
  const base = createEngineeringProject(source.templateId);
  return {
    ...base,
    ...source,
    schema: engineeringSystemSchema,
    version: engineeringSystemVersion,
    context: { ...base.context, ...(source.context ?? {}) },
    artifacts: Array.isArray(source.artifacts) ? source.artifacts : [],
    completedPathSteps: source.completedPathSteps && typeof source.completedPathSteps === 'object' ? source.completedPathSteps : {}
  };
}

export function loadEngineeringProject() {
  if (typeof localStorage === 'undefined') return createEngineeringProject();
  try { return normalizeEngineeringProject(JSON.parse(localStorage.getItem(engineeringProjectStorageKey) || 'null')); }
  catch { return createEngineeringProject(); }
}

export function saveEngineeringProject(project) {
  const normalized = normalizeEngineeringProject({ ...project, updatedAt: new Date().toISOString() });
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(engineeringProjectStorageKey, JSON.stringify(normalized)); } catch {}
  }
  return normalized;
}

export function addEngineeringArtifact(artifact) {
  const project = loadEngineeringProject();
  const normalized = {
    id: artifact.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: artifact.type || 'Engineering record',
    title: artifact.title || 'Untitled record',
    route: artifact.route || '',
    createdAt: artifact.createdAt || new Date().toISOString(),
    takeaway: artifact.takeaway || '',
    validity: artifact.validity || '',
    assumptions: Array.isArray(artifact.assumptions) ? artifact.assumptions : [],
    warnings: Array.isArray(artifact.warnings) ? artifact.warnings : [],
    values: Array.isArray(artifact.values) ? artifact.values : [],
    notes: artifact.notes || '',
    provenance: artifact.provenance || 'Structural Acoustics, Understood browser-local model',
    sourceToolId: artifact.sourceToolId || '',
    inputs: artifact.inputs && typeof artifact.inputs === 'object' ? artifact.inputs : {},
    nextTools: Array.isArray(artifact.nextTools) ? artifact.nextTools : []
  };
  project.artifacts.unshift(normalized);
  project.artifacts = project.artifacts.slice(0, 80);
  return saveEngineeringProject(project);
}

export function handoffInputs(toolId) {
  const project = loadEngineeringProject();
  const artifact = project.artifacts.find(item => item.nextTools?.includes(toolId) && item.inputs && Object.keys(item.inputs).length);
  return artifact ? { source: artifact.title, sourceToolId: artifact.sourceToolId, inputs: { ...artifact.inputs } } : null;
}

export function engineeringProjectReport(projectInput) {
  const project = normalizeEngineeringProject(projectInput);
  const lines = [
    project.name,
    `Configuration: ${project.context.configuration}`,
    `Analyst: ${project.context.analyst || 'Not recorded'}`,
    `Environment: ${project.context.environment}`,
    `Band convention: ${project.context.bandSet}`,
    `Units: ${project.context.units}`,
    `Shared geometry: ${project.context.geometry}`,
    `Shared assumptions: ${project.context.assumptions}`,
    '',
    'ENGINEERING RECORDS'
  ];
  project.artifacts.forEach((artifact, index) => {
    lines.push('', `${index + 1}. ${artifact.title}`, `Type: ${artifact.type}`, `Route: ${artifact.route || 'Not recorded'}`, `Takeaway: ${artifact.takeaway || 'Not recorded'}`, `Validity: ${artifact.validity || 'Not recorded'}`);
    artifact.values.forEach(value => lines.push(`- ${value.label}: ${value.value}${value.unit ? ` ${value.unit}` : ''}`));
    if (Object.keys(artifact.inputs || {}).length) lines.push(`Transferred inputs: ${Object.keys(artifact.inputs).join(', ')}`);
    if (artifact.assumptions.length) lines.push('Assumptions:', ...artifact.assumptions.map(item => `- ${item}`));
    if (artifact.warnings.length) lines.push('Warnings:', ...artifact.warnings.map(item => `- ${item}`));
    if (artifact.notes) lines.push(`Analyst note: ${artifact.notes}`);
    lines.push(`Provenance: ${artifact.provenance}`);
  });
  lines.push('', 'PROJECT NOTES', project.notes || 'None recorded.', '', 'MODEL-USE STATEMENT', 'This report preserves screening calculations and analyst notes. Verify controlled methods, inputs, configuration, and review evidence before consequential design or qualification use.');
  return lines.join('\n');
}
