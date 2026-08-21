/* Steinberg electronics vibration-fatigue curriculum, tool catalog, demos, cases, and sources. */

const commonReferences = [
  { title: 'Vibration Analysis for Electronic Equipment, 3rd ed.', author: 'Dave S. Steinberg', url: 'https://www.wiley-vch.de/en/areas-interest/engineering/vibration-analysis-for-electronic-equipment-978-0-471-37685-9', note: 'Primary handbook source for PCB displacement, component coefficients, modal response, and electronics vibration design practice.' },
  { title: 'Rigid-Flex Printed Circuit Board Fatigue Analysis', author: 'NASA / JPL', url: 'https://ntrs.nasa.gov/api/citations/20220013066/downloads/IEEE_Submission_After_Reviewer_Revisions.pdf?attachment=true', note: 'Open NASA example documenting the Steinberg displacement equation, package factors, location factor, assumptions, and limitations.' },
  { title: 'Solder Joint Fatigue Life Model Methodology', author: 'CALCE, University of Maryland', url: 'https://intranet.calce.umd.edu/articles/abstracts/2007/loading.htm', note: 'Curvature and strain-based electronics fatigue context that exposes what a global displacement screen omits.' },
  { title: 'IPC/JEDEC-9704A: Mechanical Shock and Vibration Testing', author: 'IPC / JEDEC', url: 'https://www.ipc.org/TOC/IPC-9704A.pdf', note: 'Test-method context for strain gaging, shock/vibration loading, and board-level interconnect evaluation.' }
];

const modules = [
  {
    id: 'electronics-vibration-failure-chain', number: '64', caseNumber: '67', toolId: 'pcb-random-response', demoId: 'electronics-relative-motion',
    title: 'How Vibration Becomes an Electronics Failure', eyebrow: 'Follow relative motion to the joint',
    summary: 'Trace base acceleration through PCB modes, board curvature, component inertia, lead or solder-joint deformation, cyclic stress, and accumulated damage.',
    equation: 'Saa(f) → H(f) → Szz(f) → curvature/strain → cycles → damage',
    mechanism: 'The fixture excites enclosure, board-support, and PCB modes. Board motion relative to the component body bends leads, terminations, solder joints, vias, and local laminate. Repetition converts alternating strain into crack initiation and growth; the vulnerable location is set by local geometry and mode shape, not by input GRMS alone.',
    intuition: 'Acceleration is the push; relative motion and curvature are what flex the connection. Two boards can see the same base spectrum and have opposite fatigue outcomes because one resonance stores far more bending energy at the component.',
    application: 'Launch random vibration, acoustic response, ground transport, acceptance retest, and qualification exposure all consume the same hardware life. A defensible workflow preserves which event produced each response and which attachment mechanism it threatens.',
    findings: ['Input GRMS is not a board-fatigue metric.', 'Package inertia, lead compliance, board curvature, mounting, and component location form one mechanical chain.', 'Solder fatigue, lead fatigue, via damage, connector fretting, and laminate cracking require different local observables.', 'A screen becomes useful when it identifies the next strain gage, modal test, support change, or detailed model.'],
    decisions: ['Name the physical failure mechanism before selecting a fatigue metric.', 'Separate fixture control, board-center response, component-local response, and attachment strain.', 'Create an event ledger before adding test and mission damage.'],
    limitation: 'The paired SDOF model represents one linear PCB mode and cannot resolve enclosure modes, local component modes, nonlinear contacts, connector loads, or detailed solder geometry.',
    references: [commonReferences[0], commonReferences[2]]
  },
  {
    id: 'pcb-modal-random-response', number: '65', caseNumber: '68', toolId: 'pcb-random-response', demoId: 'electronics-psd-response-chain',
    title: 'PCB Modes, PSD Response & Relative Displacement', eyebrow: 'GRMS is only the beginning',
    summary: 'Integrate a shaped base PSD through a damped PCB mode and compare numerical acceleration and relative displacement with the Miles shortcut.',
    equation: 'Szz=|Hz/a|²Saa;  zRMS²=∫Szzdf',
    mechanism: 'A base-excited mode amplifies absolute acceleration near resonance while relative displacement follows a different transfer function with strong inverse-frequency scaling. Numerical integration retains PSD slopes and band edges; Miles assumes locally flat input, an isolated lightly damped mode, and adequate bandwidth.',
    intuition: 'A low-frequency board mode can move farther even when its acceleration peak is modest. Moving a mode to a quieter PSD band may matter more than changing total input GRMS.',
    application: 'Board modes often sit inside launch or acceptance random-vibration plateaus and fixture resonances. Frequency tolerance and uncertain Q can move the response across a breakpoint or notch, so the PSD around the mode—not only the integrated level—must be retained.',
    findings: ['Relative displacement and absolute acceleration require different transfer functions.', 'Miles is a check, not a substitute for integrating a shaped or narrow spectrum.', 'Duration changes peak opportunity and cycle count without changing stationary RMS.', 'Modal frequency and damping uncertainty should be swept together with the PSD.'],
    decisions: ['Use numerical integration whenever the spectrum is shaped near resonance.', 'Report RMS, 3σ, and duration-aware peak estimates as different statistics.', 'Correlate board modes and Q before using response for component screening.'],
    limitation: 'The model is single-axis, stationary, Gaussian, and single-mode. Multi-axis correlation, nonstationarity, fixture coupling, response limiting, and nonlinear damping require measured FRFs or a higher-fidelity model.',
    references: [commonReferences[0], { title: 'Vibration Response Analysis of Spacecraft Structures', author: 'NASA', url: 'https://ntrs.nasa.gov/api/citations/19780024235/downloads/19780024235.pdf', note: 'NASA response-analysis context emphasizing resonance, damping, and quality-factor uncertainty.' }]
  },
  {
    id: 'steinberg-displacement-criterion', number: '66', caseNumber: '69', toolId: 'steinberg-displacement', demoId: 'electronics-relative-motion',
    title: 'Steinberg’s 20-Million-Cycle Displacement Criterion', eyebrow: 'Use the equation on the right basis',
    summary: 'Apply board span, thickness, component length, package coefficient, modal location, response statistic, and reference life without mixing center and local displacement.',
    equation: 'Zallow=0.00022B/(Chr√L) in inches',
    mechanism: 'The empirical relation limits PCB displacement near a component as a surrogate for cyclic attachment strain. B and component length L are parallel, h is board thickness, C represents package construction, and r maps board-center first-mode response to the component location.',
    intuition: 'The equation does not say that thicker is always safer or that an edge component is safe. It says a particular local relative-motion screen changes with geometry, package stiffness, and an idealized mode shape.',
    application: 'The criterion is valuable early in launch-electronics layout and support trades because it converts modal response into a component-specific screen. It is not a flight-qualification standard and should not replace strain or failure correlation for critical hardware.',
    findings: ['Use 3σ response and allowable on the same statistical and spatial basis.', 'Applying r to a local response and again in the allowable double-counts location.', 'Package coefficients are construction families, not universal part properties.', 'The 20-million-reversal reference does not automatically represent the mission or test sequence.'],
    decisions: ['Document response basis beside every margin.', 'Keep SI/Imperial conversion exact and do not mix dimensions.', 'Escalate near-margin or critical components to curvature, strain, FE, or test correlation.'],
    limitation: 'The criterion assumes an ideal board mode and empirical package family. It omits local solder geometry, board laminate orthotropy, mean stress, thermal cycling, creep, aging, manufacturing variation, and failure-mode competition.',
    references: [commonReferences[0], commonReferences[1]]
  },
  {
    id: 'component-location-curvature-strain', number: '67', caseNumber: '70', toolId: 'pcb-component-placement', demoId: 'electronics-component-map',
    title: 'Component Placement, Curvature & Strain', eyebrow: 'An antinode is not the whole answer',
    summary: 'Rank components by board axis, position, package family, component length, local response, and allowable—then identify where displacement screening must give way to strain.',
    equation: 'r=sin(πx)sin(πy);  εsurface≈(h/2)κ',
    mechanism: 'A first-mode shape maps board-center motion to each component, while board span and component length select the loading direction. Surface strain follows curvature rather than displacement alone; local package stiffness and board discontinuities can amplify or redistribute that strain.',
    intuition: 'The largest displacement occurs at an antinode, but the most fragile component is the one with the worst combination of local motion, package compliance, length, orientation, land pattern, and nearby stiffness changes.',
    application: 'A board map is a practical bridge from global random-response analysis to gage placement. It helps select corner gages, package-adjacent rosettes, high-speed video or displacement probes, and local FE regions before qualification.',
    findings: ['X- and Y-oriented components can require different supported spans.', 'A stiff leadless package may control away from board center.', 'Higher modes move nodes and antinodes, invalidating a single placement ranking.', 'Curvature/strain correlation is the preferred escalation path for critical packages.'],
    decisions: ['Store normalized location, axis, and package provenance for every screened component.', 'Rank local demand/allowable rather than location factor alone.', 'Use test or local modeling where higher modes or stiffness discontinuities control.'],
    limitation: 'The component map uses one half-sine mode, rectangular supported spans, and handbook package coefficients. It does not compute local curvature around cutouts, connectors, fasteners, copper density changes, or stiff packages.',
    references: [commonReferences[1], commonReferences[2], commonReferences[3]]
  },
  {
    id: 'steinberg-three-band-fatigue', number: '68', caseNumber: '71', toolId: 'electronics-fatigue-methods', demoId: 'electronics-three-sigma-duration',
    title: 'Three-Band Fatigue, Rayleigh Peaks & the 3σ Trap', eyebrow: 'A statistical shorthand is not a peak guarantee',
    summary: 'Compare Steinberg’s 1σ/2σ/3σ cycle bands with a narrowband Rayleigh amplitude distribution and expose how duration and S–N slope alter damage.',
    equation: 'D=Σni/Ni;  N=Nref(Sref/S)^b',
    mechanism: 'The three-band approximation assigns most cycles to 1σ, fewer to 2σ, and 4.33% to 3σ. A narrowband Gaussian response has Rayleigh-distributed peak amplitudes with a continuous tail. Both become extremely sensitive to stress RMS when the S–N exponent is steep.',
    intuition: 'Three sigma describes a point on a distribution, not the largest peak in a long test. Duration creates more chances for extremes and more cycles; a small response increase can dominate a large duration reduction.',
    application: 'Acceptance and qualification random tests often use the same PSD shape with different level and duration. Converting that difference into damage requires a stress response, cycle rate, fatigue curve, and statistical method—not a dB comparison alone.',
    findings: ['The three-band method truncates the tail beyond 3σ.', 'A +3 dB PSD change multiplies stress-amplitude damage by 2^(b/2).', 'Rayleigh, three-band, Dirlik, and rainflow methods answer different approximation questions.', 'Non-Gaussian and nonstationary response can invalidate Gaussian peak fractions.'],
    decisions: ['State peak/cycle distribution and stress definition with every fatigue result.', 'Compare at least two methods when bandwidth or tail behavior is uncertain.', 'Use time-domain rainflow when representative response histories are available.'],
    limitation: 'The paired comparison is narrowband, stationary, Gaussian, zero-mean, uniaxial, and power-law. It does not implement Dirlik spectral moments, mean-stress correction, multiaxial fatigue, solder creep, or thermal-mechanical interaction.',
    references: [commonReferences[0], { title: 'Frequency-domain methods for vibration fatigue', author: 'International Journal of Fatigue', url: 'https://www.sciencedirect.com/science/article/pii/S0026271418302385', note: 'Comparative context for spectral fatigue methods and their dependence on response bandwidth.' }]
  },
  {
    id: 'electronics-mission-damage-ledger', number: '69', caseNumber: '72', toolId: 'electronics-fatigue-ledger', demoId: 'electronics-fatigue-ledger',
    title: 'Mission, Test & Retest Damage Ledger', eyebrow: 'Keep level, time, repeats, and ownership separate',
    summary: 'Accumulate handling, transport, acceptance, qualification, retest, and flight exposure without hiding event identity inside one envelope.',
    equation: 'Dmission=Σevents nevent/Nevent',
    mechanism: 'Each event contributes cycles at its own response level. A power-law life relation converts response ratio into cycles to failure, and Miner addition creates a traceable screening ledger. The nonlinear exponent means the highest-level event often controls even when it is brief.',
    intuition: 'One extra qualification minute can consume more life than hours of transport. A ledger shows exactly which event owns that damage and whether reducing level, duration, repeats, or cycle rate is the effective lever.',
    application: 'Space hardware may see protoflight, workmanship, requalification after change, multiple vehicle-level tests, transport, pad operation, and mission ascent. Configuration differences and already-consumed test life must travel with the hardware record.',
    findings: ['Envelope spectra erase event ownership and duration.', 'Retest exposure is real damage, not administrative overhead.', 'Reference-life and exponent uncertainty can dominate calculated margin.', 'Miner unity is a model threshold, not a guarantee of no failure.'],
    decisions: ['Maintain a configuration-controlled event ledger from board test through mission.', 'Allocate damage and uncertainty rather than only acceleration level.', 'Record whether a test is qualification, acceptance, workmanship, or correlation evidence.'],
    limitation: 'The ledger extends a displacement-life power law for sensitivity. It needs component-specific response-to-failure evidence before certification and omits load sequence, temperature, dwell, creep, aging, and interaction between mechanisms.',
    references: [commonReferences[0], commonReferences[3]]
  },
  {
    id: 'electronics-test-correlation', number: '70', caseNumber: '73', toolId: 'pcb-test-correlation', demoId: 'electronics-test-correlation',
    title: 'Test Correlation: Control, Board Response, Strain & Failure', eyebrow: 'Measure the mechanical chain',
    summary: 'Design a correlation test that distinguishes fixture input, board response, local curvature/strain, package motion, and electrical intermittency.',
    equation: 'input FRF + response PSD + strain PSD + event log → correlation',
    mechanism: 'Control accelerometers establish the input, response accelerometers and displacement measurements identify modes, strain gages measure local board deformation, and electrical monitoring detects intermittent opens. Modal survey and low-level sine data separate fixture/board modes before high-level random exposure.',
    intuition: 'A test can meet the control spectrum perfectly and still fail to reproduce the board strain that matters. Correlation closes the chain from shaker table to joint—not just controller to fixture.',
    application: 'Aerospace electronics correlation should preserve axis, boundary torque, cable routing, thermal state, fixture modes, control strategy, notch/limit channels, specimen history, and inspection evidence. Sensor mass and gage reinforcement can alter a small PCB.',
    findings: ['Control-spectrum agreement is necessary but not sufficient.', 'Low-level modal evidence should precede fatigue exposure.', 'Strain-gage placement and orientation need a curvature hypothesis.', 'Electrical monitoring and post-test inspection define the observed failure boundary.'],
    decisions: ['Plan observables and acceptance logic before selecting sensors.', 'Correlate frequency, damping, shape, response, and strain—not one peak.', 'Retain raw time histories for nonstationarity, clipping, and rainflow review.'],
    limitation: 'The site tools do not model the sensor/DAQ chain or gage reinforcement for this section. Use the existing accelerometer and measurement tools and a program-specific instrumentation uncertainty budget.',
    references: [commonReferences[3], commonReferences[1]]
  },
  {
    id: 'electronics-vibration-mitigation', number: '71', caseNumber: '74', toolId: 'pcb-design-trade', demoId: 'electronics-thickness-support-trade',
    title: 'Mitigation & Capstone: Change the Mechanism', eyebrow: 'Move the mode, motion, or strain',
    summary: 'Trade board thickness, support span, location, damping, mass, package compliance, staking, underfill, isolation, and test tailoring while watching both response and allowable.',
    equation: 'fn∝h/B²;  zRMS∝√(fnSa)/fn²;  Zallow∝B/h',
    mechanism: 'Thickness and support span move modal frequency and relative response, but also change the empirical allowable. Component relocation reduces participation in one mode; damping lowers resonant response; mass and stiff packages can create local modes; staking, underfill, and isolation alter load paths and may introduce thermal or workmanship consequences.',
    intuition: 'A design change is good only if it improves the controlling failure mechanism across the actual PSD. Moving a mode upward can land it on a higher plateau; adding stiffness can reduce board motion while increasing local package strain.',
    application: 'The capstone begins with an input PSD and correlated board model, maps critical components, computes response and fatigue screens, identifies evidence gaps, trades mitigation, and ends with a qualification/correlation plan and mission ledger.',
    findings: ['Response and allowable move together in a thickness trade.', 'Effective support span is often a stronger lever than modest thickness change.', 'Damping and mode movement must be evaluated against the local PSD shape.', 'Mitigation needs thermal, manufacturability, inspectability, rework, mass, and qualification checks.'],
    decisions: ['Rank changes by verified reduction in local damage driver.', 'Recompute mode shape and placement after support changes.', 'Choose the minimum evidence needed to retire the controlling uncertainty.'],
    limitation: 'The trade tool uses thin-plate first-mode scaling and a local PSD power law. It cannot replace a loaded orthotropic PCB model, detailed package model, thermal-mechanical evaluation, or qualification test.',
    references: [commonReferences[0], { title: 'Particle Damping for Electronic Assemblies', author: 'NASA', url: 'https://ntrs.nasa.gov/api/citations/20130013858/downloads/20130013858.pdf', note: 'NASA example of electronics vibration mitigation and experimental validation.' }]
  }
];

const concept = (title, equation, body, interpretation, mistake, toolId, tags) => ({ title, equation, body, interpretation, mistake, toolId, tags });

export const electronicsFatigueSections = modules.map(module => ({
  id: module.id, number: module.number, title: module.title, eyebrow: module.eyebrow, summary: module.summary,
  deepDiveId: `electronics-${module.id}`,
  concepts: [
    concept('Governing chain', module.equation, module.mechanism, module.intuition, 'Starting with a fatigue equation before naming the response quantity and physical failure mechanism.', module.toolId, ['electronics', 'fatigue', 'mechanism']),
    concept('Engineering intuition', '', module.intuition, module.mechanism, 'Treating base GRMS, board displacement, local strain, and fatigue damage as interchangeable severity measures.', module.toolId, ['intuition', 'PCB dynamics']),
    concept('Aerospace application', '', module.application, module.findings.join(' '), 'Losing event, configuration, duration, axis, or response-location provenance between analysis and test.', module.toolId, ['aerospace electronics', 'qualification']),
    concept('Deep-dive findings', '', module.findings.join(' '), 'Use these findings to choose the response model, component screen, instrumentation, and escalation path.', 'Using one coefficient or threshold as universal acceptance evidence.', module.toolId, ['findings', 'design decision']),
    concept('Engineering decisions', '', module.decisions.join(' '), 'Tie each decision to the mechanism, uncertainty, and evidence that could reverse it.', 'Reporting a large numerical margin while the response statistic or failure mode remains ambiguous.', module.toolId, ['decision', 'evidence']),
    concept('Validity boundary', '', module.limitation, 'Escalate from displacement to curvature, strain, local FE, or test when omitted physics can reverse the decision.', 'Extending the screening model beyond its package, mode-shape, statistical, material, or life basis.', module.toolId, ['assumptions', 'limitations'])
  ]
}));

export const electronicsFatigueToolCatalog = [
  { id: 'steinberg-displacement', title: 'Steinberg PCB Displacement Screen', category: 'Random & Shock', description: 'Evaluate the 20-million-cycle displacement criterion with package, axis, location, statistic, and center/local response basis visible.', complexity: 'Core', keywords: ['Steinberg', 'PCB', 'electronics', 'relative displacement', '20 million cycles'] },
  { id: 'pcb-random-response', title: 'PCB Random-Response Chain', category: 'Random & Shock', description: 'Integrate a shaped base PSD through a PCB mode to acceleration, relative displacement, 3σ, duration peak, and Miles comparison.', complexity: 'Advanced', keywords: ['PCB response', 'PSD', 'Miles', 'relative displacement', 'random vibration'] },
  { id: 'pcb-component-placement', title: 'PCB Component Placement Map', category: 'Random & Shock', description: 'Rank components, then inspect the selected mode’s displacement, curvature, principal surface strain, nodes, and local package locations.', complexity: 'Advanced', keywords: ['component placement', 'mode shape', 'curvature', 'surface strain', 'BGA', 'LCCC', 'solder joint'] },
  { id: 'electronics-fatigue-methods', title: 'Electronics Fatigue Method Comparator', category: 'Random & Shock', description: 'Compare three-band and Rayleigh fatigue, then follow a deterministic synthesized response through turning points, rainflow, and S–N damage.', complexity: 'Advanced', keywords: ['three band', 'Rayleigh', 'rainflow', 'time history', 'Miner', 'fatigue', '3 sigma'] },
  { id: 'electronics-fatigue-ledger', title: 'Electronics Mission Damage Ledger', category: 'Random & Shock', description: 'Accumulate test, retest, transport, handling, and flight displacement-life damage without losing event ownership.', complexity: 'Advanced', keywords: ['damage ledger', 'mission', 'test duration', 'Miner', 'retest'] },
  { id: 'pcb-design-trade', title: 'PCB Thickness & Support Trade', category: 'Random & Shock', description: 'Move thickness and effective support span while natural frequency, random response, allowable, and margin change together.', complexity: 'Core', keywords: ['PCB thickness', 'support span', 'stiffness', 'mitigation', 'mode'] },
  { id: 'pcb-test-correlation', title: 'PCB Model-to-Test Correlation', category: 'Random & Shock', description: 'Overlay predicted and measured response while an instrumented PCB layout connects fixture control, board dynamics, local strain, displacement, and electrical evidence.', complexity: 'Advanced', keywords: ['PCB test', 'correlation', 'instrumentation', 'strain gage', 'FRF', 'modal frequency', 'Q', 'fatigue validation'] }
];

export const electronicsFatigueDemos = [
  { id: 'electronics-relative-motion', title: 'Watch Board Motion Flex the Attachment', description: 'Move a package across a vibrating PCB while local relative motion and Steinberg margin update.', topic: 'Electronics Fatigue', toolId: 'steinberg-displacement' },
  { id: 'electronics-psd-response-chain', title: 'Follow PSD into PCB Relative Displacement', description: 'Move the PCB resonance and Q through a shaped input spectrum and compare response with the Miles shortcut.', topic: 'PCB Random Response', toolId: 'pcb-random-response' },
  { id: 'electronics-component-map', title: 'Find the Component That Controls', description: 'Move a package, switch among six ideal modes, and compare displacement with curvature and governing surface strain.', topic: 'Component Placement', toolId: 'pcb-component-placement' },
  { id: 'electronics-three-sigma-duration', title: 'Watch 3σ Lose Its Peak Meaning with Duration', description: 'Increase peak opportunities, then inspect the synchronized synthetic time history, rainflow matrix, and amplitude-resolved damage.', topic: 'Random Peaks', toolId: 'electronics-fatigue-methods' },
  { id: 'electronics-fatigue-ledger', title: 'See One Event Consume the Mission Life', description: 'Trade test level, duration, repeats, and fatigue exponent while the controlling damage event changes.', topic: 'Damage Accumulation', toolId: 'electronics-fatigue-ledger' },
  { id: 'electronics-thickness-support-trade', title: 'Trade Thickness and Support Span', description: 'Change stiffness and supported span while modal frequency, response, allowable, and margin move together.', topic: 'PCB Mitigation', toolId: 'pcb-design-trade' },
  { id: 'electronics-test-correlation', title: 'Correlate the PCB Model with Test', description: 'Select channels on an instrumented PCB and move measured frequency, damping, and response while the complete evidence chain remains visible.', topic: 'Test Correlation', toolId: 'pcb-test-correlation' }
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const sourceList = references => references.map(reference => `<li><a href="${esc(reference.url)}" target="_blank" rel="noreferrer">${esc(reference.title)}</a> — ${esc(reference.author)}. ${esc(reference.note)}</li>`).join('');

function deepDiveBody(module) {
  return `<p>${esc(module.mechanism)}</p>
<h2>Physical intuition</h2><p>${esc(module.intuition)}</p>
<div class="callout"><strong>Aerospace electronics application.</strong> ${esc(module.application)}</div>
<h2>Findings from the deep dive</h2><ol>${module.findings.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
<h2>Interactive engineering model</h2><div class="case-demo"><div class="case-demo-header"><div><p class="eyebrow">Electronics fatigue laboratory</p><h3>${esc(module.title)}</h3></div><a class="concept-tool-link" href="#/tool/${encodeURIComponent(module.toolId)}">Open paired calculator →</a></div><div data-embedded-demo="${esc(module.demoId)}"></div></div>
<h2>Engineering decisions</h2><ul>${module.decisions.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
<h2>Assumptions and escalation boundary</h2><p>${esc(module.limitation)}</p>
<div class="callout"><strong>Engineering takeaway.</strong> Carry the physical failure mechanism, response statistic, component location, board axis, package basis, mission event, and evidence maturity with every margin.</div>
<h2>Source trail</h2><ul>${sourceList(module.references)}</ul>`;
}

export const electronicsFatigueCaseNotes = modules.map(module => ({
  id: `electronics-${module.id}`, number: module.caseNumber, title: module.title,
  summary: `${module.summary} Includes engineering intuition, a paired interactive model, explicit validity limits, and source links.`,
  readTime: '12 min', tags: ['Steinberg', 'electronics fatigue', module.eyebrow], body: deepDiveBody(module)
}));

export const electronicsFatigueReferenceGroups = [{
  group: 'Electronics vibration fatigue and Steinberg screening',
  items: commonReferences.map(reference => ({ title: reference.title, author: reference.author, note: `${reference.note} ${reference.url}` }))
}];
