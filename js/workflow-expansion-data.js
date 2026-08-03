/* Ten cross-cutting workflow chapters, including dedicated Miles and ERS deep dives. */

const modules = [
  {
    id: 'model-test-correlation', number: '31', caseNumber: '28', toolId: 'model-test-correlation', demoId: 'model-test-correlation-lab',
    title: 'Model–Test Correlation & Model Updating', eyebrow: 'Earn confidence in the prediction',
    summary: 'Combine frequency, damping, shape, FRF, load-path, and response correlation into an evidence-based model update.',
    source: 'ACS 519 pp. 347–438, especially pp. 376–377', equation: 'MAC(φₐ,φᵦ)=|φₐᴴφᵦ|²/[(φₐᴴφₐ)(φᵦᴴφᵦ)]',
    mechanism: 'Correlation compares different observables. Frequency error tests eigenvalue placement, MAC tests spatial shape, FRAC tests complex response, damping controls peak width, and cross-orthogonality tests whether the mass model and measured basis are mutually consistent.',
    intuition: 'A model can place a resonance correctly for the wrong reason. Matching the note produced by a bell does not prove the same shape, damping, or force path produced it.',
    launch: 'Launch-vehicle FE and vibroacoustic models are assembled from uncertain materials, joints, boundary stiffness, payload mass properties, propellant state, and test fixtures. The ACS notes warn that a five-percent frequency error can materially change sinusoidal response; the update must therefore preserve physical parameters and prediction intent.',
    findings: ['Frequency, MAC, and FRAC failures diagnose different errors and should not be collapsed into one score.', 'Sensor/drive placement, mass loading, fixture modes, and coordinate pairing can make good hardware look poorly correlated.', 'Updating many unconstrained parameters can fit test data while destroying extrapolation to flight boundary conditions.', 'Correlation must be repeated for the response or load path used in the design decision, not stopped at eigenfrequency agreement.'],
    decisions: ['Define pass criteria and validation observables before updating.', 'Update physically traceable parameter families with bounds and regularization.', 'Reserve independent responses, configurations, or flight data for validation after calibration.'],
    limitation: 'The paired model synthesizes one isolated plate mode and FRF. Real correlation requires complex mode pairing, coordinate transformations, residual modes, uncertainty, and configuration control.',
    references: 'Ewins, Modal Testing; NASA-STD-7009; ACS 519 FE/model-uncertainty block.'
  },
  {
    id: 'general-sea-networks', number: '32', caseNumber: '29', toolId: 'branching-sea-network', demoId: 'branching-sea-network',
    title: 'General SEA Networks & Path Ranking', eyebrow: 'Beyond a linear subsystem chain',
    summary: 'Solve branched, reciprocal, multi-source SEA systems and distinguish subsystem energy, dissipation, gross exchange, net flow, and receiver path share.',
    source: 'ACS 519 pp. 472–586, especially pp. 477–478 and p. 555', equation: 'Pᵢ=ωηᵢEᵢ+Σⱼω(ηᵢⱼEᵢ−ηⱼᵢEⱼ)',
    mechanism: 'An SEA conductance matrix balances injected power against internal and coupling loss. Reciprocity connects directional CLFs through modal density. Branches and local sources allow flow to bypass an apparently dominant source–receiver chain.',
    intuition: 'Energy chooses every connected path. A quiet-looking branch can still be the bridge carrying power to the payload, while a high-energy subsystem may simply store energy and dissipate it locally.',
    launch: 'Fairings, cavities, payloads, decks, rings, adapters, blankets, and flanking structures form a graph with multiple acoustic and structural injections. The Price–Crocker double-panel example in the notes is a five-subsystem chain; installed vehicles add parallel attachments, leaks, and secondary sources.',
    findings: ['Gross coupling can be large in both directions even when net flow is small.', 'Receiver path shares depend on the solved network state, not on CLF magnitude alone.', 'A local payload-side source can reverse net flow and invalidate a one-source interpretation.', 'Power balance is a necessary numerical check; statistical validity and CLF credibility are separate physical checks.'],
    decisions: ['Draw the energy graph before estimating CLFs.', 'Report bandwise path shares and power balance with subsystem energies.', 'Add or remove paths through sensitivity studies tied to physical interfaces.'],
    limitation: 'The demo fixes five ideal diffuse subsystems and reciprocal weak coupling. Strong coupling, sparse modes, nonstationarity, and deterministic paths need hybrid or wave-based treatment.',
    references: 'Lyon & DeJong; Price & Crocker; SEA conductance methods; ACS 519 SEA notes.'
  },
  {
    id: 'transfer-path-analysis', number: '33', caseNumber: '30', toolId: 'transfer-path-analysis', demoId: 'transfer-path-workbench',
    title: 'Transfer Path Analysis', eyebrow: 'Find the path that controls the receiver',
    summary: 'Separate source strength, installation impedance, transfer mobility, phase, coherence, and receiver contribution before selecting a fix.',
    source: 'ACS 519 mobility, power-flow, and coupled-response blocks', equation: 'vᵣ(ω)=ΣⱼHᵣⱼ(ω)Fⱼ,installed(ω)',
    mechanism: 'A transfer path contribution is the product of an installed interface force and an operational transfer function. Blocked force describes source strength independently; source and receiver mobility determine the installed load; complex summation determines the receiver.',
    intuition: 'The strongest source is not always the strongest path. A stiff receiver can suppress installed force, a weak transfer can isolate it, and phase can make two individually large paths cancel.',
    launch: 'Engines, pumps, fluid lines, thrust structures, brackets, harnesses, fairing panels, adapters, and airborne fields converge at sensitive payload and avionics receivers. TPA turns a vague “vibration problem” into ranked physical interfaces.',
    findings: ['Blocked and installed force are different quantities and should not be interchanged.', 'Path ranking changes with frequency because source and receiver mobilities both change.', 'Scalar contribution sums conceal favorable or unfavorable phase cancellation.', 'Modifying one path changes system impedance and can invalidate transfer functions measured before the modification.'],
    decisions: ['Choose operational, blocked-force, or power-based TPA to match accessible measurements.', 'Preserve complex phase and cross-path coherence.', 'Verify the predicted total by summing paths back to an independently measured receiver.'],
    limitation: 'The lab uses three single-axis harmonic paths and a scalar coherence blend. Real systems require multi-axis interface matrices, cross-spectra, rotational DOFs, and uncertainty.',
    references: 'Mobility/impedance methods; blocked-force TPA; operational path analysis; ACS 519 power-flow concepts.'
  },
  {
    id: 'requirements-margin-flowdown', number: '34', caseNumber: '31', toolId: 'requirements-flowdown', demoId: 'requirements-margin-flow',
    title: 'Requirements, Margins & Verification Flow-Down', eyebrow: 'Trace flight physics into a test level',
    summary: 'Keep environment statistics, modeling uncertainty, qualification margin, duration, workmanship, and response limits visible in one auditable chain.',
    source: 'ACS 519 qualification and dynamic-environment blocks; NASA and MSFC test standards', equation: 'Gtest=Gflight·Mstat·Mqual·(Tflight/Ttest)²ᐟᵇ',
    mechanism: 'A qualification requirement is built from a flight estimate plus separately justified statistical coverage, qualification philosophy, duration equivalence, and minimum-test rules. Force or response limiting protects against laboratory boundary-condition overtest.',
    intuition: 'Margin is not free safety. Every dB injects energy and fatigue damage; duplicated margins can break hardware for a condition it will never see, while hidden assumptions can leave real flight risk uncovered.',
    launch: 'Vehicle-level data are converted into component random vibration, acoustic, shock, and combined-environment tests. Traceability is essential when interfaces, payload configurations, flight events, and heritage data differ.',
    findings: ['Statistical coverage and qualification margin answer different questions and should remain separate.', 'Duration equivalence depends strongly on fatigue exponent and cannot be replaced by equal RMS.', 'Response limiting is defensible when supported by interface-load evidence and flight/test boundary differences.', 'A notch can preserve a controlled response yet reduce retained input margin below a program minimum.'],
    decisions: ['Maintain a requirement ledger from source data through every factor.', 'Check force, response, fatigue, workmanship, and minimum-level criteria together.', 'Record who owns uncertainty and avoid adding the same allowance at multiple hierarchy levels.'],
    limitation: 'The calculator scales one PSD band with a single fatigue exponent and square-root response law. Real specifications require spectral, multi-axis, event, and test-control detail.',
    references: 'NASA-HDBK-7005; NASA force-limited vibration guidance; MSFC-STD-3676; ACS 519 qualification notes.'
  },
  {
    id: 'mitigation-trade-studies', number: '35', caseNumber: '32', toolId: 'mitigation-trade', demoId: 'mitigation-trade-space',
    title: 'Mitigation Trade Studies', eyebrow: 'Treat the controlling mechanism',
    summary: 'Compare damping, tuned absorbers, isolation, acoustic absorption, barriers, and structural changes using effect, mass, bandwidth, and integration risk.',
    source: 'ACS 519 pp. 517–518 and noise-control/SEA treatment blocks', equation: 'Benefit = receiver reduction across mission band; cost = mass + volume + integration + uncertainty',
    mechanism: 'Each treatment changes a different term: damping removes stored resonant energy, a tuned mass splits a mode, isolation changes force transmission, absorption changes cavity decay, and mass or stiffness changes wave impedance and coincidence.',
    intuition: 'A treatment succeeds only when it touches the bottleneck. Adding absorber to an enclosure controlled by a rigid flanking path is like drying the floor without closing the pipe.',
    launch: 'Mass and volume are scarce, treatments see temperature/vacuum/contamination constraints, isolators carry static and launch loads, and added stiffness can move coincidence or create a new interface path.',
    findings: ['Constrained-layer damping effectiveness depends on shear parameter, temperature, strain, and bondline quality.', 'Isolation amplifies near its resonance before reducing transmission above crossover.', 'A tuned mass damper can be mass-efficient but loses benefit with mistuning and changing boundary conditions.', 'Treating one path can reveal leakage, attachments, or flanking as the next limit; system benefit is not the sum of component insertion losses.'],
    decisions: ['Rank options on mission-integrated receiver benefit, not peak component dB.', 'Include mass, thermal, strength, stroke, contamination, reliability, and verification burden.', 'Prototype the highest-uncertainty mechanism early and update the trade with measured properties.'],
    limitation: 'The paired tool is a one-frequency independent-option screen. It does not couple treatments or predict detailed installed performance.',
    references: 'Ross–Kerwin–Ungar damping; Den Hartog absorbers; vibration isolation; Sabine absorption; ACS 519 damping-treatment notes.'
  },
  {
    id: 'nonlinear-dynamics-joints', number: '36', caseNumber: '33', toolId: 'nonlinear-joint', demoId: 'nonlinear-joint-behavior',
    title: 'Nonlinear Dynamics & Joints', eyebrow: 'When modal properties depend on level',
    summary: 'Recognize amplitude-dependent stiffness, microslip, friction damping, gaps, hard stops, harmonics, jumps, and test-to-flight changes.',
    source: 'ACS 519 model-uncertainty, damping, and joint-transmission blocks', equation: 'mẍ+cẋ+kx+αx³+Ff·sgn(ẋ)=F(t)',
    mechanism: 'Cubic stiffness bends the resonance backbone, friction dissipates a roughly fixed energy per cycle, and gaps create piecewise contact. Effective frequency and damping therefore change with response amplitude and preload.',
    intuition: 'A bolted joint is a field of microscopic contacts, not a perfect line. As load grows, contacts stick, slip, separate, and reclose—changing both the spring and the damper while the test is running.',
    launch: 'Stage joints, fairing separations, payload adapters, avionics brackets, inserts, plumbing supports, cable restraints, snubbers, and launch locks can move between linear, microslip, gross-slip, and impact regimes.',
    findings: ['Low-level modal-test frequency and damping may not apply at qualification amplitude.', 'Friction damping can decrease in equivalent percentage as amplitude grows even while dissipated energy per cycle remains high.', 'Hardening or softening can move a resonance into or out of an excitation line and produce jump phenomena.', 'Preload, temperature, wear, assembly sequence, and repeated cycling can change joint behavior between nominally identical tests.'],
    decisions: ['Run stepped-sine or amplitude-swept tests at representative preload.', 'Track backbone, harmonics, coherence, and hysteresis rather than fitting one linear FRF.', 'Use nonlinear or bounded piecewise models when regime changes affect a limit load.'],
    limitation: 'The demo uses one equivalent coordinate, Duffing stiffness, Coulomb friction, and a gap flag. It does not integrate impacts or identify joint parameters.',
    references: 'Nonlinear normal modes; Iwan joint models; Duffing response; ACS 519 loss and connection concepts.'
  },
  {
    id: 'payload-fairing-cavities', number: '37', caseNumber: '34', toolId: 'fairing-cavity', demoId: 'fairing-cavity-field',
    title: 'Payload-Fairing & Cavity Acoustics', eyebrow: 'The payload lives inside a modal enclosure',
    summary: 'Connect fairing transmission, cavity modes, payload blockage, spatial pressure, modal overlap, absorption, leakage, and structural detuning.',
    source: 'ACS 519 double-wall, cavity, shell, and SEA blocks; p. 555 system example', equation: 'fₙₓₙᵧₙ𝓏=c₀/2·√[(nₓ/Lx)²+(nᵧ/Ly)²+(n𝓏/Lz)²]',
    mechanism: 'Below the statistical transition, discrete pressure modes depend on enclosure geometry and source/receiver position. Fairing and payload structural modes exchange energy selectively with those acoustic shapes; absorption changes decay and modal overlap.',
    intuition: 'A band-average sound level does not tell you where the pressure is. In a sparse cavity, moving a component from an antinode to a node can matter more than changing the overall source by a few decibels.',
    launch: 'The payload cavity contains the fairing shell, blankets, vents, purge medium, payload, adapter, access doors, and discontinuities. Liftoff forcing can be directional outside while the inside transitions from individual modes to an approximately diffuse field.',
    findings: ['Low-frequency cavity pressure is spatially nonuniform and cannot be represented by one microphone or diffuse-field level.', 'Payload blockage shifts modes and creates sub-cavities, so empty-fairing tests may not transfer directly.', 'Structural-acoustic near-coincidence increases energy exchange, but mode-shape compatibility still determines coupling.', 'Absorber area shortens decay and increases overlap; leakage and flanking can limit the installed benefit.'],
    decisions: ['Map pressure at payload-critical locations and modes.', 'Compare cavity mode, fairing/payload mode, ring, and coincidence frequencies.', 'Use deterministic FE/BE at sparse modes and SEA or diffuse methods only after overlap/population checks.'],
    limitation: 'The lab rectangularizes the fairing and assumes rigid boundaries with one T60. It omits curvature, blockage, leakage, trim, flow, and coupled flexible boundaries.',
    references: 'Morse & Ingard; Fahy & Gardonio; Price & Crocker; ACS 519 cavity and double-panel notes.'
  },
  {
    id: 'uncertainty-sensitivity', number: '38', caseNumber: '35', toolId: 'uncertainty-sensitivity', demoId: 'uncertainty-sensitivity-lab',
    title: 'Uncertainty, Sensitivity & Robust Decisions', eyebrow: 'A nominal curve is not a confidence bound',
    summary: 'Propagate input variability, separate uncertainty classes, rank sensitivities, and choose margins or tests that reduce decision risk.',
    source: 'ACS 519 pp. 376–377 and SEA confidence discussions around p. 477', equation: 'p(y)=∫p(y|x)p(x)dx;  Sᵢ≈Var[E(y|xᵢ)]/Var(y)',
    mechanism: 'Uncertain environment, geometry, material, joint, damping, boundary, and model form propagate through nonlinear response. Sensitivity measures identify which uncertainties control output variance or threshold-crossing probability.',
    intuition: 'A precise answer to uncertain inputs is still uncertain. The useful question is not only “what is the response?” but “what could change the decision, and which measurement would reduce that risk most?”',
    launch: 'Vehicle configurations are few, flight samples are scarce, damping and joints vary, and narrow resonances amplify small frequency changes. Robust design needs distributions, bounds, model discrepancy, and configuration traceability.',
    findings: ['Response percentiles are not obtained by adding the same margin to every input.', 'Frequency uncertainty can dominate narrowband response even when its coefficient of variation is small.', 'Damping and PSD uncertainty act multiplicatively and often produce a skewed upper tail.', 'Global sensitivity can rank test investment, while local derivatives can miss regime changes and interactions.'],
    decisions: ['Separate aleatory variability, epistemic uncertainty, and model-form discrepancy.', 'Use reproducible sampling and convergence checks.', 'Report probability of exceeding the actual decision threshold and target tests at dominant uncertainties.'],
    limitation: 'The calculator uses independent lognormal variables and a Miles response. Correlation, multimodal dynamics, non-Gaussian inputs, and model discrepancy require broader uncertainty models.',
    references: 'Monte Carlo and polynomial-chaos methods; NASA model credibility guidance; ACS 519 FE and SEA confidence notes.'
  },
  {
    id: 'miles-equation', number: '39', caseNumber: '36', toolId: 'miles', demoId: 'miles-validity',
    title: 'Miles Equation: Use, Validity & Failure Modes', eyebrow: 'A powerful narrowband screening relation',
    summary: 'Derive the familiar GRMS estimate, compare it with numerical VRS integration, and expose the locally flat PSD, light damping, and isolated-mode assumptions.',
    source: 'Random-vibration course material and the ACS 519 response/uncertainty framework', equation: 'aᵣₘₛ≈√[(π/2)fₙQGaa(fₙ)]',
    mechanism: 'A lightly damped base-excited SDOF concentrates response in a narrow bandwidth around resonance. If the input PSD is locally flat, the integral of the resonant transfer function reduces to the Miles expression.',
    intuition: 'Miles equation samples the PSD at one frequency because the oscillator behaves like a narrow spectral magnifying glass. If the landscape changes across that lens, one sampled height no longer represents the area underneath.',
    launch: 'Miles is useful for fast equipment-response, isolation, and component-screening estimates from launch random-vibration PSDs. It becomes risky near specification corners, narrow notches, neighboring modes, strong damping, nonlinear joints, or coupled acoustic/structural resonances.',
    findings: ['The relevant flatness scale is modal bandwidth fₙ/Q, not the width of the entire specification.', 'Using overall input GRMS in Miles equation is dimensionally and physically wrong; the input is PSD at resonance.', 'Velocity and displacement follow by frequency scaling only for the assumed narrowband oscillator response.', 'Duration does not change stationary RMS but changes expected peak and fatigue opportunity.'],
    decisions: ['Use Miles for transparent screening and numerical VRS integration for final shaped spectra.', 'Evaluate PSD slope and nearby breakpoints across several modal bandwidths.', 'Keep modal mass, force response, non-Gaussianity, and uncertainty outside claims the equation does not make.'],
    limitation: 'The lab integrates a linear base-excited SDOF over a power-law PSD. Multi-mode, nonstationary, nonlinear, and non-Gaussian response require other methods.',
    references: 'Miles narrowband random-vibration relation; Crandall & Mark; Steinberg; standard vibration-response-spectrum integration.'
  },
  {
    id: 'extreme-response-spectrum', number: '40', caseNumber: '37', toolId: 'extreme-response', demoId: 'extreme-response-spectrum',
    title: 'Extreme Response Spectrum', eyebrow: 'From RMS response to probable maxima',
    summary: 'Build peak response across oscillator frequency using spectral bandwidth, record duration, exceedance probability, and Gaussian peak statistics.',
    source: 'Random-vibration statistics and ACS 519 confidence/qualification concepts', equation: 'xext(fₙ,p)≈σx(fₙ)√{2ln[Npeaks(fₙ)/p]}',
    mechanism: 'An ERS first computes each oscillator RMS response, then applies a peak factor derived from effective independent peaks, duration, bandwidth, and exceedance probability. It preserves frequency-dependent response and peak opportunity.',
    intuition: 'RMS describes typical energy; extreme response asks how many chances the process has to produce a rare crest. A longer or broader record rolls the statistical dice more times, so the expected maximum grows slowly.',
    launch: 'ERS supports clearance, stroke, impact, yield, and sensor-range screening where the peak of a random launch environment matters. It complements—not replaces—SRS for deterministic transients and statistical tolerance limits for population variability.',
    findings: ['A universal 3σ multiplier cannot represent changing duration and response bandwidth.', 'ERS is a spectrum of oscillator peaks, not a time history and not a guarantee that all peaks occur simultaneously.', 'Gaussian peak statistics do not cover clipping, intermittent events, nonstationarity, or heavy tails.', 'Environment-to-environment scatter and model uncertainty are separate from within-record peak probability.'],
    decisions: ['State duration, bandwidth estimator, and exceedance convention with every ERS.', 'Compare ERS with clearance/yield limits and with SRS for discrete transients.', 'Validate Gaussian stationarity and inspect time records for clipping, bursts, and mixed events.'],
    limitation: 'The demo uses a simple independent-peak approximation. The paired calculator uses response spectral moments, but neither adds population tolerance or non-Gaussian corrections automatically.',
    references: 'Rice level-crossing theory; Vanmarcke peak factors; Lalanne; random-vibration response-spectrum practice.'
  }
];

const concept = (title, equation, body, interpretation, mistake, toolId, tags) => ({ title, equation, body, interpretation, mistake, toolId, tags });

export const workflowExpansionSections = modules.map(module => ({
  id: module.id, number: module.number, title: module.title, eyebrow: module.eyebrow, summary: module.summary,
  deepDiveId: `workflow-${module.id}`,
  concepts: [
    concept('Governing mechanism', module.equation, module.mechanism, module.intuition, 'Using the equation before identifying the energy path, statistical population, or physical observable it represents.', module.toolId, ['governing model', 'workflow']),
    concept('Engineering intuition', '', module.intuition, module.mechanism, 'Treating a local or nominal result as a complete system description.', module.toolId, ['intuition', 'physical meaning']),
    concept('Launch-vehicle findings', '', `${module.launch} Findings: ${module.findings.join(' ')}`, 'Use these findings to choose fidelity, instrumentation, and design action for the actual vehicle configuration and frequency band.', 'Transferring a laboratory idealization directly to flight without checking configuration, interfaces, spatial forcing, and uncertainty.', module.toolId, ['launch vehicles', 'deep dive']),
    concept('Decision workflow', '', module.decisions.join(' '), 'A model is useful when it changes a traceable engineering decision and identifies the evidence needed to defend that decision.', 'Reporting a result without the associated choice, threshold, sensitivity, or verification evidence.', module.toolId, ['design', 'verification']),
    concept('Validity boundary', '', module.limitation, `The source trail begins with ${module.source}. Use a higher-fidelity or measured model when the omitted physics can change the decision.`, 'Equating numerical precision with physical validity.', module.toolId, ['assumptions', 'validity'])
  ]
}));

const fairingCavitySection = workflowExpansionSections.find(section => section.id === 'payload-fairing-cavities');
if (fairingCavitySection) fairingCavitySection.concepts.push(concept(
  'Room constant, critical distance, and the statistical transition',
  'R=Sα/(1−α);  rc=√(QR/16π);  fS≈2000√(T60/V)',
  'Room constant sets the reverberant energy floor, critical distance compares direct and diffuse contributions, and the Schroeder scale screens where individual cavity modes stop behaving like a smooth statistical field.',
  'A payload can sit in a local modal hot spot below the statistical transition even when a diffuse-field average is correct above it.',
  'Using one reverberant-room correction across sparse low-frequency fairing modes.',
  'room-field',
  ['critical distance', 'room constant', 'Schroeder frequency']
));

export const workflowExpansionToolCatalog = [
  { id: 'model-test-correlation', title: 'Model–Test Correlation Lab', category: 'Test & Signal', description: 'Compare frequency, damping, MAC, and FRAC before selecting a physically traceable model update.', complexity: 'Advanced', keywords: ['MAC', 'FRAC', 'model updating', 'validation'] },
  { id: 'branching-sea-network', title: 'Branching SEA Network', category: 'SEA & Energy', description: 'Solve reciprocal multi-source structural/acoustic branches, power balance, and payload path shares.', complexity: 'Advanced', keywords: ['SEA graph', 'flanking', 'power flow', 'path analysis'] },
  { id: 'transfer-path-analysis', title: 'Transfer Path Analysis', category: 'Test & Signal', description: 'Rank blocked-force, installation, transfer-mobility, phase, and coherence contributions at a receiver.', complexity: 'Advanced', keywords: ['TPA', 'blocked force', 'mobility', 'path ranking'] },
  { id: 'requirements-flowdown', title: 'Requirements & Margin Flow-Down', category: 'Test & Signal', description: 'Trace flight PSD through statistical/qualification margins, duration equivalence, and response limiting.', complexity: 'Advanced', keywords: ['requirements', 'margin', 'qualification', 'notching'] },
  { id: 'mitigation-trade', title: 'Vibroacoustic Mitigation Trade', category: 'Noise Control', description: 'Compare damping, TMD, isolation, absorption, and barrier concepts by reduction, mass, and mechanism.', complexity: 'Core', keywords: ['mitigation', 'trade study', 'damping', 'isolation'] },
  { id: 'nonlinear-joint', title: 'Nonlinear Joint Screener', category: 'Dynamics', description: 'Explore amplitude-dependent stiffness, friction loss, slip, gaps, and frequency backbone shift.', complexity: 'Advanced', keywords: ['joint', 'nonlinear', 'Duffing', 'friction'] },
  { id: 'fairing-cavity', title: 'Payload-Fairing Cavity', category: 'Structural Acoustics', description: 'Resolve cavity modes, spatial participation, overlap, absorption, and panel detuning.', complexity: 'Advanced', keywords: ['fairing', 'cavity modes', 'payload acoustics', 'Schroeder'] },
  { id: 'uncertainty-sensitivity', title: 'Uncertainty & Sensitivity', category: 'Test & Signal', description: 'Propagate frequency, damping, and environment distributions into response percentiles and sensitivity shares.', complexity: 'Advanced', keywords: ['Monte Carlo', 'uncertainty', 'sensitivity', 'percentile'] }
];

export const workflowExpansionDemos = [
  { id: 'model-test-correlation-lab', title: 'Can This Model Predict the Test?', description: 'Separate frequency, mode-shape, damping, and complex-FRF agreement while the correlation disposition updates.', topic: 'Model Credibility', toolId: 'model-test-correlation' },
  { id: 'branching-sea-network', title: 'Energy Chooses More Than One Path', description: 'Tune primary and flanking coupling and watch payload path share, net flow, and energy change.', topic: 'SEA', toolId: 'branching-sea-network' },
  { id: 'transfer-path-workbench', title: 'Rank the Installed Transfer Paths', description: 'Change source strength, phase, and coherence to reveal reinforcement, cancellation, and the controlling interface.', topic: 'Transfer Paths', toolId: 'transfer-path-analysis' },
  { id: 'requirements-margin-flow', title: 'From Flight Estimate to Qualification Test', description: 'Add margins and duration equivalence, then see when a response limit forces a justified notch.', topic: 'Requirements', toolId: 'requirements-flowdown' },
  { id: 'mitigation-trade-space', title: 'Choose the Mechanism, Not the Favorite Treatment', description: 'Compare damping, tuned mass, isolation, absorption, and mass by reduction and mass efficiency.', topic: 'Mitigation', toolId: 'mitigation-trade' },
  { id: 'nonlinear-joint-behavior', title: 'When the Joint Changes the Mode', description: 'Sweep amplitude through stiffness shift, microslip, and contact thresholds.', topic: 'Nonlinear Dynamics', toolId: 'nonlinear-joint' },
  { id: 'fairing-cavity-field', title: 'Move the Payload Through a Cavity Mode', description: 'Change frequency and axial location to expose modal hot spots, overlap, and structural detuning.', topic: 'Payload Acoustics', toolId: 'fairing-cavity' },
  { id: 'uncertainty-sensitivity-lab', title: 'Turn a Nominal Response into a Distribution', description: 'Widen input uncertainty and watch P95 response and the dominant sensitivity change.', topic: 'Uncertainty', toolId: 'uncertainty-sensitivity' },
  { id: 'miles-validity', title: 'When Miles Equation Works—and When It Does Not', description: 'Tilt the PSD across the modal bandwidth and compare Miles with numerical VRS integration.', topic: 'Random Vibration', toolId: 'miles' },
  { id: 'extreme-response-spectrum', title: 'How Duration and Bandwidth Create Extremes', description: 'Change peak opportunities and exceedance probability while the probable extreme grows above RMS.', topic: 'Random Vibration', toolId: 'extreme-response' }
];

const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
function deepDiveBody(module) {
  return `<p>${esc(module.mechanism)}</p><h2>Physical intuition</h2><p>${esc(module.intuition)}</p><div class="callout"><strong>Launch-vehicle application.</strong> ${esc(module.launch)}</div><h2>Findings from the deep dive</h2><ol>${module.findings.map(item => `<li>${esc(item)}</li>`).join('')}</ol><h2>Interactive model</h2><div class="case-demo"><div class="case-demo-header"><div><p class="eyebrow">Workflow deep dive</p><h3>${esc(module.title)}</h3></div><a class="concept-tool-link" href="#/tool/${encodeURIComponent(module.toolId)}">Open paired calculator →</a></div><div data-embedded-demo="${esc(module.demoId)}"></div></div><h2>Engineering decisions</h2><ul>${module.decisions.map(item => `<li>${esc(item)}</li>`).join('')}</ul><h2>Assumptions and model boundary</h2><p>${esc(module.limitation)}</p><div class="callout"><strong>Engineering takeaway.</strong> Use the result to name the controlling mechanism, the decision it supports, the uncertainty that could reverse it, and the verification evidence still required.</div><h2>Source trail</h2><p><strong>Course-note connection:</strong> ${esc(module.source)}. <strong>Supporting references:</strong> ${esc(module.references)} Local combined notes: <code>references/ACS519_Combined.pdf</code>.</p>`;
}

export const workflowExpansionCaseNotes = modules.map(module => ({
  id: `workflow-${module.id}`, number: module.caseNumber, title: module.title,
  summary: `${module.summary} Includes launch-vehicle applications, deep-dive findings, and an interactive engineering model.`,
  readTime: '11 min', tags: ['launch vehicles', 'workflow', module.eyebrow], body: deepDiveBody(module)
}));

export const workflowExpansionReferenceGroups = [{
  group: 'Cross-cutting launch-vehicle workflows',
  items: modules.map(module => ({ title: `${module.title} — ${module.source}`, note: `${module.summary} Supporting references: ${module.references}` }))
}];
