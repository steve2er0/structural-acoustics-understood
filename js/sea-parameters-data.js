/* SEA parameter and infinite-structure-mobility curriculum. */

const modules = [
  {
    id: 'sea-parameter-provenance', number: '58', caseNumber: '61', toolId: 'sea-parameter-workbench', demoId: 'sea-parameter-chain',
    title: 'SEA Parameter Definition, Provenance & Uncertainty', eyebrow: 'The solver is the easy part',
    summary: 'Turn geometry, construction, environment, and test evidence into a traceable banded SEA parameter set before solving for energy.',
    equation: 'geometry → n(f), η, σ → ηᵢⱼ, Πin → E → response',
    mechanism: 'SEA power balance needs modal density, dissipation loss, coupling loss, external power, mass or volume, and response-recovery properties. These parameters are linked: wave speed changes modal density and coincidence; radiation efficiency produces radiation resistance and a panel-air CLF; mobility converts point force into input power; energy and physical mass or compressibility recover velocity or pressure.',
    intuition: 'The SEA matrix rarely causes the largest prediction uncertainty. The fragile step is translating a real shell, joint, blanket, flow field, and payload installation into the numbers placed in that matrix. A parameter with a clear name but unknown pedigree is still an unknown.',
    launch: 'Fairing, interstage, deck, barrel, tank, and payload-cavity models often mix analytical geometry, coupon damping, empirical radiation, inferred CLFs, test-derived source power, and flight extrapolation. Each band needs an audit trail so a design change can be traced to physics rather than hidden tuning.',
    findings: ['Parameter provenance should be stored per band, not only in a model-level note.', 'Measured values are not automatically superior if their boundary, field, averaging, or installed configuration differs from flight.', 'Reciprocity, dimensional consistency, power balance, passivity, and limiting cases provide independent checks before correlation.', 'Uncertainty should be attached to the parameter-generating relationship so it propagates to every network that consumes it.'],
    decisions: ['Classify each parameter as analytical, empirical, measured, inferred, or assumed.', 'Expose the geometry and field variables that generated every banded parameter.', 'Promote a handbook value to design use only after sensitivity and applicable evidence are documented.'],
    limitation: 'The workbench synthesizes one representative subsystem at one band. Full programs need correlated uncertainty, configuration control, spatial variation, measured datasets, and batch processing across the complete network.',
    source: 'SEA_parameters_revAB introduction and Appendices A–T'
  },
  {
    id: 'modal-density-wave-regime-atlas', number: '59', caseNumber: '62', toolId: 'modal-density', demoId: 'modal-density-regime-map',
    title: 'Structural & Acoustic Modal-Density Atlas', eyebrow: 'Count the right wave family',
    summary: 'Compare one-, two-, and three-dimensional acoustic density with beam, plate, honeycomb, in-plane, circular-panel, and shell mode populations.',
    equation: 'Nband=n(f)Δf;  M=n(f)ηf',
    mechanism: 'Modal density is the derivative of mode count with frequency. Its frequency dependence reveals dimensionality and dispersion: a 1D acoustic pipe has constant density, a 2D cavity rises with frequency, a 3D cavity rises with frequency squared, plate bending is nearly constant asymptotically, and sandwich shear or shell curvature changes the structural trend.',
    intuition: 'Modal density is a traffic count, not a universal property of the hardware. The same fairing bay can carry sparse in-plane waves and dense bending waves; the same thin cavity can behave as a 2D sheet of sound below cross-gap cut-on and a 3D room above it.',
    launch: 'Large fairing skins can support many bending modes where frames remain deterministic. Payload cavities, purge ducts, interstage gaps, honeycomb decks, and barrel shells cross their statistical transition at different frequencies and should not be assigned one global SEA boundary.',
    findings: ['Modes per analysis band and modal overlap answer different questions and should be displayed together.', 'Boundary corrections matter near the transition even when the asymptotic density is simple.', 'Acoustic dimensional transitions and honeycomb shear transitions can occur inside a qualification band.', 'Cylinder ring frequency changes the structural mode-count trend and the validity of equal-area flat-plate approximations.'],
    decisions: ['Select wave family and boundary condition before quoting modal density.', 'Bracket both models within a half octave of a dimensional, shear, or ring transition.', 'Use exact eigensolutions or hybrid FE–SEA when the band population remains sparse.'],
    limitation: 'Asymptotic counting smooths individual low-order modes, degeneracy, frames, cutouts, orthotropy, and local attachments. The cylinder high-frequency continuation is a screening approximation.',
    source: 'SEA_parameters_revAB Appendices A, B, H, I, and J'
  },
  {
    id: 'infinite-structure-mobility', number: '60', caseNumber: '63', toolId: 'infinite-mobility-atlas', demoId: 'infinite-mobility-wave-atlas',
    title: 'Infinite-Structure Mobility', eyebrow: 'The mean hidden by resonances',
    summary: 'Use characteristic mobility to connect propagating waves in rods, beams, plates, sandwich panels, and cylindrical shells to the mean level of finite-structure drive-point response.',
    equation: 'Yplate=1/(8√(Dρh)) · Ybeam=1/(2ρAcB) · Πin=½F²Re{Y}',
    mechanism: 'A local force launches structural waves that carry energy away from the drive. In a sufficiently large, damped, or high-modal-overlap structure, returning waves are less important at the drive point, so the real characteristic mobility gives a useful mean response between resonant peaks and antiresonant dips. The applicable relation follows the wave family: axial and flexural member waves, two-dimensional plate bending, sandwich flexure-to-shear transition, or cylindrical-shell beam-like, curved-shell, and plate-like behavior.',
    intuition: 'Infinite does not mean the hardware has no boundaries. It means the local drive initially sees outward-traveling wave paths more than it sees their later reflections. The ideal curve is therefore a calibration ruler and a trend line, not a prediction of every narrow resonance.',
    launch: 'Fairing barrels, tanks, interstages, struts, pipe runs, payload decks, and sandwich equipment panels all use mobility to convert local force into accepted structural power. Overlaying measured drive-point mobility with the appropriate characteristic curve can expose unit, gain, force-channel, or sensor-calibration errors before a finite-element or SEA model is trusted.',
    findings: ['For a finite structure, characteristic mobility often lies near the geometric mean of the resonant and antiresonant mobility envelopes.', 'Infinite thin-plate mobility is frequency independent, while flexural-beam mobility decreases with the square root of frequency.', 'A sandwich panel transitions from a thin-plate-like mobility to a higher, shear-controlled trend as core shear limits wave speed.', 'Cylinder ring frequency and h/a identify approximate beam-like, curved-shell, and plate-like mobility regions.', 'Characteristic mobility is real conductance: it is the term that converts force squared into mean injected power.'],
    decisions: ['Plot the source-traceable characteristic curve beside every measured drive-point mobility before using it for calibration or SEA source power.', 'Use finite modal or FE response near sparse modes, boundaries, supports, cutouts, and attachments.', 'Treat shell-regime boundaries and fluid-added-mass corrections as sensitivity variables rather than fixed universal transitions.'],
    limitation: 'The paired atlas assumes uniform isotropic members, plates, symmetric sandwich construction, or thin unstiffened cylindrical shells with a point drive. It excludes local reinforcement, orthotropy, nonlinear joints, complex phase, finite boundary details, pressurization, and frequency-dependent fluid loading.',
    source: 'Hambric, “To Infinity and Beyond – the Amazing Uses of Infinite Structure Mobility Theory,” Inter-Noise 2019, equations (2)–(14); ACS 519 Combined, Cylindrical Shells slide 20.',
    sourceTrail: 'Local references: <code>references/In19_inf_panel.pdf</code> and <code>references/ACS519_Combined.pdf</code>. The paired calculator implements the published real characteristic-mobility relations and labels its screening assumptions explicitly.'
  },
  {
    id: 'sea-mobility-radiation-coupling', number: '61', caseNumber: '64', toolId: 'clf-mechanism-library', demoId: 'sea-coupling-mechanisms',
    title: 'Mobility, Radiation & CLF Mechanism Library', eyebrow: 'Derive the arrow in the network',
    summary: 'Build directional SEA couplings from point impedance, plate and shell mobility, radiation resistance, line joints, bolts, frames, and nonresonant transmission.',
    equation: 'Πᵢ→ⱼ=ωηᵢⱼEᵢ;  ηⱼᵢ=ηᵢⱼnᵢ/nⱼ',
    mechanism: 'A CLF converts stored energy into directional gross power. Mechanical junction models combine incident wave speed, transmission, junction extent, impedance, and modal normalization. Panel-air coupling uses radiation resistance. Nonresonant fairing transmission uses a transmission coefficient and acoustic-volume normalization. Reciprocity then fixes the reverse CLF for passive connections.',
    intuition: 'A network arrow is not a dial labeled “coupling.” It represents a physical gate: a point bridge samples drive mobility, a bolt array adds discrete gates, a frame behaves as a line, and a radiating panel exchanges energy over an area. The gate can transmit strongly while net flow remains small because gross power also returns.',
    launch: 'Fairing frames, longerons, bolted payload adapters, equipment feet, line joints, shell–cavity radiation, and direct mass-law paths need different coupling models. Improving one attachment can simply expose a parallel frame, leak, or nonresonant acoustic path.',
    findings: ['Equal directional CLFs generally violate reciprocity when modal densities differ.', 'A high transmission coefficient need not imply a high CLF because junction extent and stored-energy normalization matter.', 'Panel-air radiation efficiency, resistance, and CLF are three representations of the same energy path.', 'Weak-coupling checks belong after the CLF is derived, not before.'],
    decisions: ['Name the physical mechanism for every network link.', 'Preserve directional modal-density normalization and test reciprocity numerically.', 'Split point, line, area, resonant, and nonresonant paths instead of combining them into one fitted CLF.'],
    limitation: 'The library treats ideal homogeneous members and real-valued impedances. Complex joints, angle ensembles, multiple wave families, nonlinear fasteners, stiffeners, and strongly coupled interfaces need measured or higher-fidelity models.',
    source: 'SEA_parameters_revAB Appendices C, D, and G'
  },
  {
    id: 'equivalent-sea-source-power', number: '62', caseNumber: '65', toolId: 'equivalent-power-injection', demoId: 'environment-to-sea-power',
    title: 'External Environment to Equivalent SEA Power', eyebrow: 'Pressure is not watts',
    summary: 'Convert diffuse liftoff acoustics, ascent TBL pressure, Corcos coherence, and localized force into the band-power vector required by SEA.',
    equation: 'Πdiffuse∝σ⟨p²⟩n/(f²m″);  Πforce=½F²Re{Y}',
    mechanism: 'An environment does work only through the part of pressure or force that is accepted by structural motion. Diffuse acoustic injection depends on radiation reciprocity and modal density. TBL injection depends on convection speed relative to bending speed, spatial correlation, aerodynamic coincidence, and empirical coefficients. A point force injects power through drive-point conductance.',
    intuition: 'Two fields with identical pressure RMS can inject very different structural power. A pressure pattern that reverses across neighboring modal lobes can cancel, while a lower-pressure pattern moving at the accepted wavenumber can drive the structure efficiently.',
    launch: 'Liftoff produces directional and reverberant acoustic loading; atmospheric ascent adds convecting wall pressure; protuberances and separation create different coherence; engines, actuators, and equipment add local force. These sources should enter the SEA vector through different models.',
    findings: ['Converting dB SPL directly to SEA watts without modal and field information hides the dominant acceptance assumptions.', 'TBL empirical constants can change predicted power by factors of three or more.', 'Frequency-dependent convection velocity moves both correlation length and aerodynamic coincidence.', 'Point-force power must use drive-point conductance, not a transfer-FRF magnitude.'],
    decisions: ['Select source conversion by physical flight event and vehicle station.', 'Carry wall-pressure PSD, convection, coherence, modal properties, and field classification as separate inputs.', 'Compare equivalent power with measured power injection or energy balance wherever practical.'],
    limitation: 'The Corcos implementation uses a frequency-averaged acceptance screen rather than the full wavenumber integral. Separated flow, shocks, nonstationarity, curvature, and detailed shell modes require program-specific data.',
    source: 'SEA_parameters_revAB Appendices K and T'
  },
  {
    id: 'sea-response-recovery-concentration', number: '63', caseNumber: '66', toolId: 'sea-response-recovery', demoId: 'sea-local-response',
    title: 'SEA Response Recovery & Statistical Concentration', eyebrow: 'From average energy to a local design quantity',
    summary: 'Recover velocity, acceleration, pressure, SPL, and bending stress from subsystem energy, then estimate local statistical concentration and boundary risk.',
    equation: 'E=M⟨v²⟩;  E=V⟨p²⟩/(ρc²);  Vmax²/Vrms²=f(n,η,Δf,D)',
    mechanism: 'SEA solves a spatial or ensemble average. Structural mass converts energy into mean-square velocity; acoustic compressibility converts cavity energy into pressure; frequency converts velocity to acceleration; wave curvature converts displacement into a stress screen. Response concentration estimates the maximum-to-average ratio from dimensionality, modal population, loss, and bandwidth.',
    intuition: 'An average is not a location. A payload foot near a boundary, antinode, frame, or sparse dominant mode may experience more response than the subsystem mean even when the energy solution is exact.',
    launch: 'Payload equipment limits, fastener loads, bracket fatigue, panel strain, and microphone levels are local quantities. Fairing SEA often supplies only the average shell or cavity state, so the recovery and concentration step must be visible in qualification flowdown.',
    findings: ['Pure-tone concentration is more severe than broadband concentration because frequency averaging supplies fewer independent samples.', 'Dimensionality changes the expected mode-shape maximum.', 'The interior average is biased within approximately one-quarter wavelength of a boundary.', 'A local concentration factor is a statistical statement, not a deterministic certification of the maximum location.'],
    decisions: ['State whether every reported response is spatial average, ensemble average, percentile, or local maximum screen.', 'Use deterministic local models for critical receivers and boundary regions.', 'Validate stress and acceleration recovery with representative sensor placement and spatial averaging.'],
    limitation: 'The concentration equations assume ideal statistical mode shapes and diffuse energy. Attachments, local stiffness, deterministic modes, nonlinear contacts, and correlated response points require local FE or test evidence.',
    source: 'SEA_parameters_revAB introduction and Appendix S'
  },
  {
    id: 'installed-fairing-sea-parameters', number: '64', caseNumber: '67', toolId: 'installed-fairing-sea', demoId: 'fairing-blanket-network',
    title: 'Installed Fairing SEA Parameters', eyebrow: 'Component TL is not payload attenuation',
    summary: 'Combine equipment loading, shell radiation, nonresonant transmission, blanket IL and absorption, coverage, leakage, and payload-cavity loss in one auditable network.',
    equation: 'NR=10log₁₀(1+α/τ);  τinstalled=Σ(Sᵢ/S)τᵢ',
    mechanism: 'The resonant path drives the shell and reradiates into the cavity. A nonresonant mass-law path crosses the wall without waiting for resonant energy storage. Blankets reduce transmitted power and add absorption, untreated areas remain parallel paths, openings leak, installed equipment changes structural inertia, and cavity loss sets the received energy.',
    intuition: 'A 20 dB blanket does not create 20 dB payload benefit when twenty percent of the area is untreated or a small opening dominates. Once one path is reduced, the next strongest path becomes the ceiling.',
    launch: 'Payload fairings contain blankets, seams, purge paths, access doors, separation joints, vents, frames, large equipment, and changing gas conditions. Installed payload-cavity level is the result of all these power paths, not a coupon TL or absorption number.',
    findings: ['Component mass-law TL and installed noise reduction must be reported separately.', 'Blanket coverage combines in linear transmission space, not by multiplying coverage by dB.', 'Blanket absorption changes cavity loss while blanket IL changes transmission; they are different benefits.', 'Added equipment can lower shell velocity without removing direct acoustic leakage.'],
    decisions: ['Track resonant, nonresonant, leak, and flanking power separately.', 'Use measured blanket IL and absorption for the actual mounting, compression, purge, and temperature state.', 'Stop improving the shell path when the direct or opening path controls installed response.'],
    limitation: 'The paired model uses one shell and two diffuse acoustic subsystems. Real fairings may need multiple bays, frames, axial variation, payload scattering, vents with flow, spatial source fields, and measured banded blanket data.',
    source: 'SEA_parameters_revAB Appendices E, P, Q, and R'
  }
];

const concept = (title, equation, body, interpretation, mistake, toolId, tags) => ({ title, equation, body, interpretation, mistake, toolId, tags });

export const seaParameterSections = modules.map(module => ({
  id: module.id,
  number: module.number,
  title: module.title,
  eyebrow: module.eyebrow,
  summary: module.summary,
  deepDiveId: `sea-parameters-${module.id}`,
  concepts: [
    concept('Governing parameter chain', module.equation, module.mechanism, module.intuition, 'Entering a plausible scalar without retaining the physical model and provenance that produced it.', module.toolId, ['SEA parameters', 'energy flow']),
    concept('Engineering intuition', '', module.intuition, module.mechanism, 'Treating a band-averaged quantity as though it were a deterministic local response.', module.toolId, ['intuition', 'statistical dynamics']),
    concept('Launch-vehicle application', '', module.launch, module.findings.join(' '), 'Transferring a coupon, room, or ideal-member parameter directly to an installed launch vehicle without a configuration check.', module.toolId, ['launch vehicles', 'fairing']),
    concept('Deep-dive findings', '', module.findings.join(' '), 'Use these findings to select source models, subsystem boundaries, sensitivity variables, and validation evidence.', 'Using one threshold or handbook curve as a universal pass/fail rule.', module.toolId, ['findings', 'model selection']),
    concept('Engineering decisions', '', module.decisions.join(' '), 'Each decision should be linked to the parameter or response that could reverse it.', 'Reporting numerical precision without decision sensitivity or uncertainty.', module.toolId, ['design', 'verification']),
    concept('Model boundary', '', module.limitation, `Source basis: ${module.source}.`, 'Extending a screening relation beyond its geometry, field, wave-family, or statistical assumptions.', module.toolId, ['assumptions', 'validity'])
  ]
}));

export const seaParameterToolCatalog = [
  { id: 'sea-parameter-workbench', title: 'SEA Parameter Workbench', category: 'SEA & Energy', description: 'Build a traceable geometry-to-modal-density-to-loss-to-coupling-to-power-to-response parameter chain.', complexity: 'Advanced', keywords: ['SEA parameters', 'provenance', 'launch vehicle', 'uncertainty'] },
  { id: 'infinite-mobility-atlas', title: 'Infinite-Structure Mobility Atlas', category: 'Structural Acoustics', description: 'Plot source-traceable characteristic mobilities for rods, flexural beams, thin and sandwich panels, and cylindrical shells.', complexity: 'Core', keywords: ['infinite mobility', 'characteristic mobility', 'Skudrzyk', 'drive-point mobility', 'shell'] },
  { id: 'sea-impedance-library', title: 'SEA Driving-Point Impedance Library', category: 'SEA & Energy', description: 'Calculate analytical plate, shell, rod, and high-frequency driving-point mobility and injected force power.', complexity: 'Core', keywords: ['mobility', 'impedance', 'conductance', 'point force'] },
  { id: 'clf-mechanism-library', title: 'CLF Mechanism Library', category: 'SEA & Energy', description: 'Derive reciprocal CLFs for beams, plates, point bridges, bolts, line joints, radiation, and fairing mass-law paths.', complexity: 'Advanced', keywords: ['CLF', 'reciprocity', 'junction', 'radiation coupling'] },
  { id: 'equivalent-power-injection', title: 'Equivalent SEA Power Injection', category: 'SEA & Energy', description: 'Convert diffuse acoustic, TBL, Corcos, and point-force environments into watts per analysis band.', complexity: 'Advanced', keywords: ['equivalent power', 'TBL', 'Corcos', 'diffuse field'] },
  { id: 'tbl-convection-model', title: 'TBL Convection-Velocity Models', category: 'Aero / Distributed Loads', description: 'Compare constant, Totaro, attached-flow, and separated-flow convection velocity and wavenumber.', complexity: 'Core', keywords: ['convection velocity', 'Totaro', 'attached flow', 'separated flow'] },
  { id: 'equipment-loading', title: 'Equipment Loading & Smearing', category: 'SEA & Energy', description: 'Compare global mass-ratio and local footprint-area response corrections for installed equipment.', complexity: 'Core', keywords: ['equipment mass', 'footprint', 'smearing', 'payload'] },
  { id: 'sea-response-recovery', title: 'SEA Response Recovery & Concentration', category: 'SEA & Energy', description: 'Recover velocity, acceleration, pressure, SPL, stress, and statistical local concentration from subsystem energy.', complexity: 'Advanced', keywords: ['SEA response', 'concentration', 'local maximum', 'boundary'] },
  { id: 'radiation-efficiency-atlas', title: 'Radiation-Efficiency Atlas', category: 'Structural Acoustics', description: 'Compare baffled, free, honeycomb, ribbed, shell, and forced-field radiation and panel-air CLF.', complexity: 'Advanced', keywords: ['radiation efficiency', 'shell', 'honeycomb', 'forced radiation'] },
  { id: 'installed-fairing-sea', title: 'Installed Fairing SEA', category: 'SEA & Energy', description: 'Trade blanket coverage, IL, absorption, leakage, equipment, resonant power, direct power, shell velocity, and cavity SPL.', complexity: 'Advanced', keywords: ['fairing', 'blanket', 'noise reduction', 'payload cavity'] }
];

export const seaParameterDemos = [
  { id: 'sea-parameter-chain', title: 'Build the SEA Parameter Chain', description: 'Move from launch-vehicle construction and environment through derived parameters, stored energy, and recovered response.', topic: 'SEA Parameters', toolId: 'sea-parameter-workbench' },
  { id: 'modal-density-regime-map', title: 'Watch Modal Density Change Regime', description: 'Switch wave family and frequency while modes per band, overlap, and dimensional transitions move together.', topic: 'Modal Density', toolId: 'modal-density' },
  { id: 'infinite-mobility-wave-atlas', title: 'Find the Mean Hidden by Resonances', description: 'Compare rod, beam, plate, sandwich, and shell characteristic mobilities while cylinder regime transitions move with ring frequency.', topic: 'Infinite Mobility', toolId: 'infinite-mobility-atlas' },
  { id: 'sea-driving-point-mobility', title: 'Where a Force Enters the SEA Model', description: 'Compare plate center, edge, shell, rod, and high-frequency conductance as force becomes band power.', topic: 'Mobility', toolId: 'sea-impedance-library' },
  { id: 'sea-coupling-mechanisms', title: 'Build a CLF from the Physical Junction', description: 'Change point, line, bolt, frame, radiation, and mass-law mechanisms while reciprocal directional CLFs update.', topic: 'SEA Coupling', toolId: 'clf-mechanism-library' },
  { id: 'environment-to-sea-power', title: 'Turn Pressure and Force into SEA Watts', description: 'Compare diffuse, TBL, Corcos, and point-force power accepted by the same launch-vehicle panel.', topic: 'SEA Excitation', toolId: 'equivalent-power-injection' },
  { id: 'tbl-convection-velocity-map', title: 'Convection Velocity Is Not One Constant', description: 'Compare Totaro, constant, attached, and separated flow models while wavenumber and coherence scales move.', topic: 'TBL', toolId: 'tbl-convection-model' },
  { id: 'equipment-smearing-map', title: 'Global Mass or Local Footprint?', description: 'Change equipment mass and footprint to see when smearing hides a local payload-interface response.', topic: 'Equipment Loading', toolId: 'equipment-loading' },
  { id: 'sea-local-response', title: 'From SEA Average to Local Response', description: 'Recover response from energy and compare broadband, pure-tone, interior, and boundary concentration.', topic: 'Response Recovery', toolId: 'sea-response-recovery' },
  { id: 'radiation-efficiency-construction-map', title: 'Which Radiation Model Fits the Hardware?', description: 'Move across fundamental, ring, critical, and forced-field regions for panel, honeycomb, ribbed, and shell construction.', topic: 'Radiation', toolId: 'radiation-efficiency-atlas' },
  { id: 'fairing-blanket-network', title: 'Make a Blanket Work in the Full Fairing Network', description: 'Trade coverage, IL, absorption, openings, and equipment while resonant and direct power set payload-cavity level.', topic: 'Fairing SEA', toolId: 'installed-fairing-sea' }
];

const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function deepDiveBody(module) {
  const infiniteMobility = module.id === 'infinite-structure-mobility';
  const findingsHeading = infiniteMobility ? 'Findings from the infinite-mobility lesson' : 'Findings from the SEA parameter deep dive';
  const laboratoryLabel = infiniteMobility ? 'Infinite-structure mobility laboratory' : 'SEA parameter laboratory';
  const takeaway = infiniteMobility
    ? 'A characteristic mobility is a source-traceable mean-response reference: use it to understand wave regime, validate measured drive-point data, and bound power input before resolving finite-structure details.'
    : 'A credible SEA prediction retains the origin, direction, bandwidth, field assumption, configuration, and uncertainty of every parameter—not only the solved energy.';
  return `<p>${esc(module.mechanism)}</p>
<h2>Engineering intuition</h2><p>${esc(module.intuition)}</p>
<div class="callout"><strong>Launch-vehicle application.</strong> ${esc(module.launch)}</div>
<h2>${findingsHeading}</h2><ol>${module.findings.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
<h2>Interactive engineering model</h2><div class="case-demo"><div class="case-demo-header"><div><p class="eyebrow">${laboratoryLabel}</p><h3>${esc(module.title)}</h3></div><a class="concept-tool-link" href="#/tool/${encodeURIComponent(module.toolId)}">Open paired calculator →</a></div><div data-embedded-demo="${esc(module.demoId)}"></div></div>
<h2>Design and analysis decisions</h2><ul>${module.decisions.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
<h2>Assumptions and model boundary</h2><p>${esc(module.limitation)}</p>
<div class="callout"><strong>Engineering takeaway.</strong> ${takeaway}</div>
<h2>Source trail</h2><p>${esc(module.source)}. ${module.sourceTrail || 'Local reference: <code>references/SEA_parameters_revAB.pdf</code>. Source equations were independently screened for units, limiting behavior, reciprocity, and typographical risk before implementation.'}</p>`;
}

export const seaParameterCaseNotes = modules.map(module => ({
  id: `sea-parameters-${module.id}`,
  number: module.caseNumber,
  title: module.title,
  summary: `${module.summary} Includes launch-vehicle applications and findings from the complete ${module.id === 'infinite-structure-mobility' ? 'infinite-mobility lesson' : 'parameter-note review'}.`,
  readTime: module.id === 'infinite-structure-mobility' ? '10 min' : '11 min',
  tags: module.id === 'infinite-structure-mobility' ? ['infinite mobility', 'structural waves', module.eyebrow] : ['SEA parameters', 'launch vehicles', module.eyebrow],
  body: deepDiveBody(module)
}));

export const seaParameterReferenceGroups = [{
  group: 'SEA parameter handbook expansion',
  items: [
    { title: 'Statistical Energy Analysis Parameters, Revision AB', author: 'Tom Irvine', note: 'Local 62-page reference covering SEA inputs, excitation conversion, response recovery, blankets, and TBL convection velocity.' },
    { title: 'Theory and Application of Statistical Energy Analysis', author: 'Lyon & DeJong', note: 'Primary SEA theory source cited throughout the parameter handbook.' },
    { title: 'Random Vibrations in Spacecraft Structure Design', author: 'Jaap Wijker', note: 'Aerospace SEA, modal density, equipment loading, radiation, and qualification context.' },
    { title: 'To Infinity and Beyond – the Amazing Uses of Infinite Structure Mobility Theory', author: 'Stephen Hambric', note: 'Local Inter-Noise 2019 paper; characteristic-mobility formulas and their rod, beam, plate, sandwich-panel, and cylindrical-shell applications. File: references/In19_inf_panel.pdf.' },
    { title: 'ACS 519 Combined – Cylindrical Shells', author: 'Stephen Hambric', note: 'Local course reference; reproduces the beam, curved-shell, and infinite-plate shell-mobility regime relations. File: references/ACS519_Combined.pdf.' }
  ]
}];
