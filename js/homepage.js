// Data-driven subject navigation and generic launch-vehicle structural atlas.

export const homepageNavigation = [
  { id: 'subjects', label: 'Subjects', descriptor: 'Wheel of acoustics', href: '#/' },
  { id: 'hardware', label: 'Hardware', descriptor: 'Structural atlas', href: '#/hardware' },
  { id: 'workflows', label: 'Workflows', descriptor: 'Engineering paths', href: '#/pathways' }
];

export function homepageNavKey(first = '') {
  if (first === 'tool' || first === 'tools') return 'tools';
  if (first === 'hardware') return 'hardware';
  if (first === 'pathway' || first === 'pathways' || first === 'workspace' || first === 'validation') return 'workflows';
  return 'subjects';
}

export const subjectWheel = [
  {
    id: 'acoustics',
    label: 'Acoustics & Sound Control',
    shortLabel: 'Acoustics',
    symbol: 'p',
    accent: '#55b8ff',
    question: 'How is sound created, propagated, measured, perceived, and controlled?',
    summary: 'Begin with pressure, intensity, decibels, sources, propagation, receiver metrics, and installed noise-control paths.',
    chapterIds: [
      'acoustics-db', 'khie-deep-dive', 'acoustic-treatments', 'noise-control-workflow',
      'psychoacoustics-binaural-hearing', 'noise-metrics-receiver-criteria', 'canonical-acoustic-sources',
      'fans-duct-flow-noise', 'outdoor-propagation-ground-barriers', 'room-fields-installed-enclosures'
    ],
    demoIds: ['multipole-source-lab', 'noise-control-path-lab', 'acoustic-treatment-lab', 'outdoor-propagation-lab'],
    toolIds: ['db', 'sound-power', 'acoustic-field', 'noise-control-path', 'acoustic-treatment', 'acoustic-measurement-planner'],
    hardwareIds: ['fairing', 'feed-system', 'propulsion'],
    pathwayIds: ['noise-control', 'new-analyst']
  },
  {
    id: 'dynamics',
    label: 'Dynamics, Damping & Modes',
    shortLabel: 'Dynamics',
    symbol: 'fₙ',
    accent: '#7da0ff',
    question: 'What sets resonance, modal participation, damping, and isolation?',
    summary: 'Build intuition from SDOF response through coupled modes, loss mechanisms, isolation, and level-dependent joints.',
    chapterIds: ['sdof', 'damping-isolation', 'modal-dynamics', 'loss-factors-deep-dive', 'nonlinear-dynamics-joints'],
    demoIds: ['sdof-motion', 'damping-transmissibility', 'two-mode', 'nonlinear-joint-behavior'],
    toolIds: ['sdof', 'damping', 'isolation', 'two-dof', 'modal-density', 'nonlinear-joint'],
    hardwareIds: ['avionics', 'payload-deck', 'interstage'],
    pathwayIds: ['new-analyst', 'structural-dynamicist']
  },
  {
    id: 'structures-waves',
    label: 'Structures & Waves',
    shortLabel: 'Structures',
    symbol: 'kᵦ',
    accent: '#9478ff',
    question: 'How do beams, plates, shells, fluids, and joints carry wave energy?',
    summary: 'Follow bending and shell waves through anisotropy, curvature, fluid loading, wavenumber matching, and method selection.',
    chapterIds: [
      'structures-waves', 'shell-acoustics-deep-dive', 'orthotropic-panels-deep-dive',
      'pipe-flow-noise-deep-dive', 'wave-matching-deep-dive', 'wet-tank-dynamics-deep-dive',
      'hybrid-method-handoffs'
    ],
    demoIds: ['beam-wave', 'dispersion', 'ring', 'orthotropic-coincidence'],
    toolIds: ['beam', 'bending-wave', 'plate-modes', 'shell-acoustics', 'wave-matching-atlas', 'wet-tank-dynamics'],
    hardwareIds: ['tank', 'interstage', 'fairing'],
    pathwayIds: ['structural-dynamicist', 'new-analyst']
  },
  {
    id: 'random-vibration',
    label: 'Random Vibration',
    shortLabel: 'Random vibration',
    symbol: 'Gₓₓ',
    accent: '#58d59b',
    question: 'How does broadband input become RMS response and probable extremes?',
    summary: 'Connect PSD definitions, resonant filtering, statistics, duration, bandwidth, and nonstationary behavior without losing the assumptions.',
    chapterIds: ['random-psd', 'statistics-extremes', 'miles-equation', 'extreme-response-spectrum', 'nonstationary-nongaussian-environments'],
    demoIds: ['psd-response', 'miles-validity', 'extreme-response-spectrum', 'nonstationary-environment-lab'],
    toolIds: ['time-psd', 'psd-combination', 'grms', 'miles', 'vrs', 'extreme-response', 'nonstationary-environment'],
    hardwareIds: ['avionics', 'payload-deck'],
    pathwayIds: ['structural-dynamicist', 'test-engineer']
  },
  {
    id: 'shock',
    label: 'Shock',
    shortLabel: 'Shock',
    symbol: 'SRS',
    accent: '#ff8888',
    question: 'How does a short transient distribute severity across oscillator frequency?',
    summary: 'Interpret time histories, shock response spectra, pseudo-velocity, dynamic stress, and pyroshock screening as distinct views of a transient.',
    chapterIds: ['shock-fatigue'],
    demoIds: ['srs-bank', 'stress-environment-map', 'qualification-notching'],
    toolIds: ['shock-pulse', 'srs', 'pyroshock', 'dynamic-stress-environment', 'qualification-test-planner'],
    hardwareIds: ['avionics', 'payload-deck', 'propulsion'],
    pathwayIds: ['structural-dynamicist', 'test-engineer']
  },
  {
    id: 'fatigue',
    label: 'Fatigue',
    shortLabel: 'Fatigue',
    symbol: 'D',
    accent: '#f2c663',
    question: 'When does repeated vibroacoustic stress become accumulated damage?',
    summary: 'Translate stress spectra, bandwidth, duration, non-Gaussian peaks, mission repeats, and S–N assumptions into a defensible damage screen.',
    chapterIds: ['vibroacoustic-fatigue'],
    demoIds: ['vibroacoustic-fatigue-lab', 'stress-environment-map', 'mission-environment-timeline'],
    toolIds: ['vibroacoustic-fatigue', 'fds', 'duration-scaling', 'dynamic-stress-environment', 'mission-environment-timeline'],
    hardwareIds: ['avionics', 'payload-deck', 'fairing'],
    pathwayIds: ['structural-dynamicist', 'test-engineer']
  },
  {
    id: 'structural-acoustics',
    label: 'Structural–Acoustic Coupling',
    shortLabel: 'Coupling',
    symbol: 'σ',
    accent: '#6f8cff',
    question: 'When does structural motion efficiently create, transmit, or receive sound?',
    summary: 'Connect mode shape, radiation efficiency, coincidence, transmission loss, driven response, cavities, and complete source–path–receiver chains.',
    chapterIds: [
      'structural-acoustics', 'modal-radiation-deep-dive', 'piston-fluid-loading-deep-dive',
      'computational-vibroacoustics-deep-dive', 'elastic-panel-tl-deep-dive', 'driven-radiation-deep-dive',
      'transfer-path-analysis', 'mitigation-trade-studies', 'payload-fairing-cavities', 'launch-vibroacoustic-capstone'
    ],
    demoIds: ['coincidence', 'radiation-efficiency', 'modal-radiation-patterns', 'force-to-sound-power'],
    toolIds: ['critical-frequency', 'radiation-efficiency', 'modal-radiation', 'elastic-panel-tl', 'driven-radiation', 'panel-cavity'],
    hardwareIds: ['fairing', 'tank', 'feed-system'],
    pathwayIds: ['new-analyst', 'launch-integrator']
  },
  {
    id: 'distributed-loads',
    label: 'Distributed Loads & Aeroacoustics',
    shortLabel: 'Distributed loads',
    symbol: 'Γ',
    accent: '#42c7c7',
    question: 'How do spatial correlation, convection, and launch sources determine accepted load?',
    summary: 'Move beyond a point spectrum to cross-spectral fields, joint acceptance, launch source physics, and mission-event dominance.',
    chapterIds: ['distributed-loads', 'launch-acoustic-sources-deep-dive', 'combined-environment-timeline'],
    demoIds: ['spatial-field', 'joint-acceptance', 'launch-source-map', 'tbl-convection-velocity-map'],
    toolIds: ['spatial-correlation', 'tbl-convection-model', 'fsp-generator', 'launch-acoustic-source', 'equivalent-power-injection', 'vibroacoustic-scaling'],
    hardwareIds: ['propulsion', 'fairing', 'tank'],
    pathwayIds: ['launch-integrator', 'structural-dynamicist']
  },
  {
    id: 'sea',
    label: 'SEA & Energy Flow',
    shortLabel: 'SEA',
    symbol: 'ηᵢⱼ',
    accent: '#63d59e',
    question: 'When can subsystem energy replace individual-mode response?',
    summary: 'Build SEA from modal population, loss factors, mobility, radiation, coupling, equivalent power, network balance, and response recovery.',
    chapterIds: [
      'sea', 'sea-validity-deep-dive', 'double-panel-sea-deep-dive', 'general-sea-networks',
      'sea-parameter-provenance', 'modal-density-wave-regime-atlas', 'sea-mobility-radiation-coupling',
      'equivalent-sea-source-power', 'sea-response-recovery-concentration', 'installed-fairing-sea-parameters'
    ],
    demoIds: ['sea-flow', 'sea-validity-map', 'branching-sea-network', 'sea-parameter-chain'],
    toolIds: ['two-subsystem-sea', 'multi-subsystem-sea', 'modal-density-atlas', 'sea-validity-confidence', 'sea-parameter-workbench', 'launch-vibroacoustic-capstone'],
    hardwareIds: ['fairing', 'tank', 'interstage'],
    pathwayIds: ['sea-analyst', 'launch-integrator']
  },
  {
    id: 'measurement-test',
    label: 'Measurement, Test & Validation',
    shortLabel: 'Test & validation',
    symbol: 'H(ω)',
    accent: '#b58cff',
    question: 'What evidence makes a structural-acoustic conclusion credible?',
    summary: 'Plan the measurement chain, modal and intensity tests, qualification control, correlation, uncertainty, requirements, and verification evidence.',
    chapterIds: [
      'signal-testing', 'modal-testing-deep-dive', 'intensity-testing-deep-dive', 'qualification-testing-deep-dive',
      'model-test-correlation', 'requirements-margin-flowdown', 'uncertainty-sensitivity', 'multiaxis-mimo-testing',
      'source-identification-arrays', 'verification-validation-evidence', 'acoustic-measurement-practice'
    ],
    demoIds: ['modal-test-grid', 'intensity-probe-lab', 'model-test-correlation-lab', 'credibility-scorecard-lab'],
    toolIds: ['time-psd', 'accelerometer', 'modal-test-planner', 'sound-intensity-probe', 'model-test-correlation', 'qualification-test-planner', 'credibility-scorecard'],
    hardwareIds: ['payload-deck', 'avionics', 'fairing'],
    pathwayIds: ['test-engineer', 'launch-integrator']
  }
];

export const atlasSections = [
  {
    id: 'engine', title: 'Engine section', shortTitle: 'Engine', descriptor: 'Propulsion region',
    summary: 'Broadband turbomachinery forcing, mount loads, plume acoustics, and high-frequency shock enter the vehicle here.',
    subjects: ['Turbomachinery forcing', 'Pyroshock', 'Mount loads'], href: '#/hardware/propulsion', accent: '#ff9b7a',
    hotspot: 'M95 790 390 650 585 665 525 955 165 1010 95 940Z', callout: { x: 41, y: 80, align: 'right', line: 235 }
  },
  {
    id: 'lower-tank', title: 'Lower tank barrel', shortTitle: 'Lower tank', descriptor: 'Wet shell structure',
    summary: 'Shell modes, propellant added mass, slosh, axial load, and distributed pressure couple through the lower barrel.',
    subjects: ['Wet-wall modes', 'Slosh coupling', 'Axial response'], href: '#/hardware/tank', accent: '#55b8ff',
    hotspot: 'M390 555 745 390 925 505 600 800 445 830Z', callout: { x: 20, y: 57, align: 'left', line: 0 }
  },
  {
    id: 'intertank', title: 'Intertank', shortTitle: 'Intertank', descriptor: 'Transition structure',
    summary: 'A stiffness and impedance transition where shell waves, joints, concentrated load paths, and cavity fields exchange energy.',
    subjects: ['Shell vibration', 'Acoustic coupling', 'Joint transmission'], href: '#/hardware/interstage', accent: '#58d59b',
    hotspot: 'M740 390 905 315 1018 455 885 585 760 535Z', callout: { x: 22, y: 40, align: 'left', line: 55 }
  },
  {
    id: 'upper-tank', title: 'Upper tank barrel', shortTitle: 'Upper tank', descriptor: 'Cylindrical shell',
    summary: 'Curvature creates ring and lobar modes while bending-wave speed and coincidence govern structural-acoustic transfer.',
    subjects: ['Bending waves', 'Ring frequency', 'Acoustic radiation'], href: '#/hardware/tank', accent: '#9478ff',
    hotspot: 'M900 255 1115 165 1260 315 1030 475 930 415Z', callout: { x: 30, y: 25, align: 'left', line: 105 }
  },
  {
    id: 'forward-skirt', title: 'Forward skirt', shortTitle: 'Forward skirt', descriptor: 'Upper structure',
    summary: 'Local modes, joints, avionics attachments, and shock paths bridge the tank stack to the payload region.',
    subjects: ['Structural modes', 'Shock transmission', 'Joint behavior'], href: '#/hardware/avionics', accent: '#f2c663',
    hotspot: 'M1085 160 1265 95 1360 255 1215 355 1115 305Z', callout: { x: 42, y: 8, align: 'left', line: 85 }
  },
  {
    id: 'fairing', title: 'Payload fairing', shortTitle: 'Fairing', descriptor: 'Payload region',
    summary: 'The external acoustic field drives the fairing shell, cavity modes, blankets, equipment, and payload interface through parallel paths.',
    subjects: ['Acoustic environment', 'Panel response', 'Cavity coupling'], href: '#/hardware/fairing', accent: '#6f8cff',
    hotspot: 'M1050 170 1175 55 1450 15 1485 55 1370 205 1240 305 1110 345 1185 245Z', callout: { x: 83, y: 9, align: 'right', line: 108 }
  }
];

export const featuredItems = [
  { title: 'Bending-wave dispersion', purpose: 'See why different frequencies travel at different speeds.', href: '#/demo/dispersion', motif: 'dispersion' },
  { title: 'Critical-frequency calculator', purpose: 'Find coincidence frequency for plate and shell materials.', href: '#/tool/critical-frequency', motif: 'critical' },
  { title: 'Ring-frequency explorer', purpose: 'Connect cylinder geometry to breathing-mode behavior.', href: '#/demo/ring', motif: 'ring' },
  { title: 'Transmission-loss explorer', purpose: 'Track mass law and coincidence through an elastic panel.', href: '#/tool/elastic-panel-tl', motif: 'transmission' },
  { title: 'PSD combiner', purpose: 'Combine environments with explicit correlation assumptions.', href: '#/tool/psd-combination', motif: 'spectrum' },
  { title: 'Modal-density visualizer', purpose: 'See when modes overlap and SEA becomes credible.', href: '#/demo/modal-density-regime-map', motif: 'density' }
];

const defaultSubjectId = 'structural-acoustics';
const defaultAtlasSectionId = 'fairing';
const launchVehicleAsset = './assets/homepage/launch-vehicle-cutaway.png';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const polarPoint = (radius, angle, center = 320) => {
  const radians = angle * Math.PI / 180;
  return { x: center + radius * Math.cos(radians), y: center + radius * Math.sin(radians) };
};

function donutSegmentPath(index, total = subjectWheel.length) {
  const step = 360 / total;
  const middle = -90 + index * step;
  const start = middle - step / 2 + 1.15;
  const end = middle + step / 2 - 1.15;
  const outerStart = polarPoint(278, start);
  const outerEnd = polarPoint(278, end);
  const innerEnd = polarPoint(151, end);
  const innerStart = polarPoint(151, start);
  return `M${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}A278 278 0 0 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}L${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}A151 151 0 0 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}Z`;
}

function wheelLabelPosition(index, total = subjectWheel.length) {
  const point = polarPoint(232, -90 + index * (360 / total));
  return { x: point.x / 6.4, y: point.y / 6.4 };
}

function featuredMotif(name) {
  const base = 'viewBox="0 0 210 92" aria-hidden="true" preserveAspectRatio="none"';
  if (name === 'dispersion') return `<svg ${base}><g class="featured-grid"><path d="M8 20h194M8 46h194M8 72h194M45 8v76M87 8v76M129 8v76M171 8v76"/></g><path class="featured-primary" d="M8 49c12-26 24-26 36 0s24 26 36 0 24-26 36 0 24 26 36 0 24-26 36 0 12 13 18 10"/><path class="featured-secondary" d="M8 53c20-11 29-11 48 0s28 11 47 0 28-11 47 0 28 11 47 0"/></svg>`;
  if (name === 'critical') return `<svg ${base}><g class="featured-wire"><ellipse cx="105" cy="47" rx="72" ry="31" transform="rotate(-12 105 47)"/><ellipse cx="105" cy="47" rx="53" ry="23" transform="rotate(-12 105 47)"/><ellipse cx="105" cy="47" rx="30" ry="13" transform="rotate(-12 105 47)"/><path d="M36 33 174 61M42 21l126 52M64 13l85 70M89 11l36 74"/></g></svg>`;
  if (name === 'ring') return `<svg ${base}><g class="featured-rings" transform="translate(105 46)"><circle r="34"/><circle r="25"/><circle r="15"/><path d="M0-38V38M-38 0h76M-27-27l54 54M27-27l-54 54"/><circle r="5" class="featured-core"/></g></svg>`;
  if (name === 'transmission') return `<svg ${base}><g class="featured-grid"><path d="M8 20h194M8 46h194M8 72h194M45 8v76M87 8v76M129 8v76M171 8v76"/></g><path class="featured-primary" d="M8 80 29 74 50 66 72 58 92 48 110 42 126 60 140 35 158 28 177 23 202 14"/><path class="featured-limit" d="M8 72 202 20"/></svg>`;
  if (name === 'spectrum') return `<svg ${base}><g class="featured-grid"><path d="M8 20h194M8 46h194M8 72h194M45 8v76M87 8v76M129 8v76M171 8v76"/></g><path class="featured-spectrum" d="M8 78 13 68 18 73 23 54 28 69 34 30 40 64 47 42 52 72 58 60 63 78 69 39 74 66 80 51 88 76 95 26 103 70 110 58 117 75 124 48 132 68 140 34 147 73 155 57 162 78 169 45 176 61 183 39 191 70 202 55"/></svg>`;
  return `<svg ${base}><g class="featured-grid"><path d="M8 20h194M8 46h194M8 72h194M45 8v76M87 8v76M129 8v76M171 8v76"/></g><path class="featured-primary" d="M8 81c35-1 54-6 76-15 24-10 37-15 58-30 21-14 38-22 60-25"/><path class="featured-secondary" d="M8 82c37-2 66-8 90-18 29-12 52-26 71-42 15-12 23-16 33-18"/></svg>`;
}

function renderSubjectPanel(subject, sectionMap, demoMap) {
  const chapters = subject.chapterIds.map(id => sectionMap.get(id)).filter(Boolean);
  const demos = subject.demoIds.map(id => demoMap.get(id)).filter(Boolean);
  return `<article class="subject-detail" data-subject-detail="${subject.id}" style="--subject-color:${subject.accent}" ${subject.id === defaultSubjectId ? '' : 'hidden'}>
    <header class="subject-detail-heading">
      <p class="subject-detail-index">Subject ${String(subjectWheel.indexOf(subject) + 1).padStart(2, '0')} · ${chapters.length} chapters</p>
      <h2>${esc(subject.label)}</h2>
      <p class="subject-question">${esc(subject.question)}</p>
      <p>${esc(subject.summary)}</p>
    </header>
    <div class="subject-detail-groups">
      <section aria-labelledby="${subject.id}-chapters"><h3 id="${subject.id}-chapters">Learn the subject</h3><div class="subject-chapter-list">${chapters.map(chapter => `<a href="#/cheat-sheet?section=${encodeURIComponent(chapter.id)}"><span>${esc(chapter.number)}</span><strong>${esc(chapter.title)}</strong><b aria-hidden="true">→</b></a>`).join('')}</div></section>
      <section aria-labelledby="${subject.id}-demos"><h3 id="${subject.id}-demos">Explore the behavior</h3><div class="subject-demo-list">${demos.map(demo => `<a href="#/demo/${encodeURIComponent(demo.id)}"><span>Interactive lab</span><strong>${esc(demo.title)}</strong></a>`).join('')}</div></section>
    </div>
    <footer><a class="home-primary-action" href="#/subject/${encodeURIComponent(subject.id)}">Explore the subject guide <span aria-hidden="true">→</span></a><a href="#/cheat-sheet?section=${encodeURIComponent(chapters[0]?.id || '')}">Start the first chapter</a></footer>
  </article>`;
}

function renderSubjectWheel(sectionMap, demoMap) {
  return `<div class="subject-explorer" data-subject-explorer data-selected="${defaultSubjectId}">
    <div class="subject-wheel-visual" aria-label="Wheel of acoustics subject selector">
      <svg class="subject-wheel-svg" viewBox="0 0 640 640" aria-hidden="true">
        <circle class="subject-wheel-orbit" cx="320" cy="320" r="298"/>
        ${subjectWheel.map((subject, index) => `<path class="subject-wheel-segment ${subject.id === defaultSubjectId ? 'is-active' : ''}" data-subject-segment="${subject.id}" style="--subject-color:${subject.accent}" d="${donutSegmentPath(index)}"/>`).join('')}
        <circle class="subject-wheel-inner" cx="320" cy="320" r="137"/>
      </svg>
      <div class="subject-wheel-center" aria-hidden="true"><span data-subject-center-symbol>σ</span><strong data-subject-center-label>Structural–Acoustic<br>Coupling</strong><small>Choose a subject</small></div>
      <div class="subject-wheel-labels">${subjectWheel.map((subject, index) => { const position = wheelLabelPosition(index); return `<button type="button" data-subject-select="${subject.id}" aria-pressed="${subject.id === defaultSubjectId}" class="${subject.id === defaultSubjectId ? 'is-active' : ''}" style="--subject-x:${position.x.toFixed(2)}%;--subject-y:${position.y.toFixed(2)}%;--subject-color:${subject.accent}"><span>${esc(subject.symbol)}</span><strong>${esc(subject.shortLabel)}</strong></button>`; }).join('')}</div>
    </div>
    <div class="subject-mobile-list" aria-label="Acoustics subjects">${subjectWheel.map(subject => `<button type="button" data-subject-select="${subject.id}" aria-pressed="${subject.id === defaultSubjectId}" class="${subject.id === defaultSubjectId ? 'is-active' : ''}" style="--subject-color:${subject.accent}"><span>${esc(subject.symbol)}</span><strong>${esc(subject.label)}</strong></button>`).join('')}</div>
    <div class="subject-detail-stack" aria-live="polite">${subjectWheel.map(subject => renderSubjectPanel(subject, sectionMap, demoMap)).join('')}</div>
  </div>`;
}

function segmentMarkup(section) {
  const common = `class="atlas-region atlas-region-${section.id}" data-atlas-section="${section.id}" href="${section.href}" tabindex="0" aria-label="${esc(section.title)}. ${esc(section.summary)}" style="--region-accent:${section.accent}"`;
  return `<a ${common}><path class="atlas-hit-region" d="${section.hotspot}" vector-effect="non-scaling-stroke"/></a>`;
}

function launchVehicleSvg() {
  return `<svg class="launch-vehicle-svg" viewBox="0 0 1536 1024" preserveAspectRatio="none" role="img" aria-labelledby="atlas-svg-title atlas-svg-description">
    <title id="atlas-svg-title">Interactive generic launch-vehicle structural atlas</title>
    <desc id="atlas-svg-description">A sectioned launch vehicle shown diagonally with interactive engine, lower tank, intertank, upper tank, forward skirt, and payload fairing regions.</desc>
    <defs><radialGradient id="atlas-plume" cx="1" cy=".5" r="1"><stop stop-color="#fff" stop-opacity=".82"/><stop offset=".16" stop-color="#f2c663" stop-opacity=".72"/><stop offset=".48" stop-color="#9478ff" stop-opacity=".32"/><stop offset="1" stop-color="#55b8ff" stop-opacity="0"/></radialGradient><radialGradient id="atlas-plume-core" cx="1" cy=".5" r="1"><stop stop-color="#fff"/><stop offset=".24" stop-color="#fff0c7" stop-opacity=".92"/><stop offset=".55" stop-color="#f2c663" stop-opacity=".48"/><stop offset="1" stop-color="#9478ff" stop-opacity="0"/></radialGradient><filter id="atlas-glow"><feGaussianBlur stdDeviation="8"/></filter></defs>
    <g class="atlas-orbit-lines" aria-hidden="true"><path d="M90 935C420 670 860 300 1450 65"/><path d="M35 980C470 790 880 330 1510 115"/><path d="M170 1010C530 845 980 425 1500 225"/></g>
    <g class="atlas-plume" aria-hidden="true"><ellipse cx="42" cy="930" rx="185" ry="82" fill="url(#atlas-plume)" filter="url(#atlas-glow)"/><path d="M155 860C95 872 22 899-85 952 34 974 102 967 180 930Z" fill="url(#atlas-plume)"/><ellipse class="atlas-plume-core" cx="86" cy="922" rx="118" ry="38" fill="url(#atlas-plume-core)"/><path class="atlas-plume-core" d="M180 878C118 886 52 907-24 946c83 7 145-2 216-32Z" fill="url(#atlas-plume-core)"/></g>
    <image class="atlas-generated-vehicle" href="${launchVehicleAsset}" x="0" y="0" width="1536" height="1024" preserveAspectRatio="none"/>
    <g class="atlas-hotspots">${atlasSections.map(segmentMarkup).join('')}</g>
  </svg>`;
}

function renderAtlasDetails() {
  return atlasSections.map(section => `<article class="atlas-detail" data-atlas-detail="${section.id}" ${section.id === defaultAtlasSectionId ? '' : 'hidden'}><p class="atlas-detail-kicker">Structural atlas · ${esc(section.descriptor)}</p><h3>${esc(section.title)}</h3><p>${esc(section.summary)}</p><ul>${section.subjects.map(subject => `<li>${esc(subject)}</li>`).join('')}</ul><a href="${section.href}">Open related physics <span aria-hidden="true">→</span></a></article>`).join('');
}

function renderAtlasMiniature() {
  return `<svg class="atlas-detail-silhouette" viewBox="0 0 52 184" aria-hidden="true"><path d="M26 4c-8 12-12 29-12 48v36l-5 14v54h34v-54l-5-14V52C38 33 34 16 26 4Z"/><path d="M14 52h24M14 72h24M14 88h24M9 112h34M9 132h34M9 150h34M16 102v54m10-68v68m10-54v54M14 52l24 20M38 52 14 72M14 72l24 16M38 72 14 88"/><path d="m14 156-7 20h12l7-20 7 20h12l-7-20"/></svg>`;
}

function renderAtlas() {
  return `<section class="vehicle-atlas" id="vehicle-atlas" data-launch-atlas data-selected="${defaultAtlasSectionId}" aria-labelledby="atlas-heading"><div class="atlas-heading-row"><div><p class="home-kicker">Interactive structural atlas</p><h2 id="atlas-heading">Follow energy through the vehicle.</h2></div><p>Hover, focus, or tap a region.</p></div><div class="atlas-visual">${launchVehicleSvg()}<div class="atlas-callouts" aria-label="Launch vehicle regions">${atlasSections.map(section => `<a class="atlas-callout atlas-callout-${section.id} atlas-callout-${section.callout.align}" data-atlas-section="${section.id}" href="${section.href}" style="--callout-x:${section.callout.x}%;--callout-y:${section.callout.y}%;--line-width:${section.callout.line}px;--region-accent:${section.accent}"><strong>${esc(section.title)}</strong><span>${esc(section.subjects.join(' · '))}</span></a>`).join('')}</div><div class="atlas-detail-stack" aria-live="polite">${renderAtlasDetails()}${renderAtlasMiniature()}</div></div><div class="atlas-region-key" aria-label="Select vehicle region">${atlasSections.map(section => `<button type="button" data-atlas-section="${section.id}" class="${section.id === defaultAtlasSectionId ? 'is-active' : ''}" style="--region-accent:${section.accent}">${esc(section.shortTitle)}</button>`).join('')}</div></section>`;
}

function renderFeaturedItems() {
  return `<section class="home-section featured-library" aria-labelledby="featured-library-title"><div class="featured-heading"><h2 id="featured-library-title">Featured demos & tools</h2><a href="#/demos">View the full interactive library <span aria-hidden="true">→</span></a></div><div class="featured-strip">${featuredItems.map(item => `<a class="featured-item" href="${item.href}"><div><h3>${esc(item.title)}</h3><p>${esc(item.purpose)}</p></div><div class="featured-visual">${featuredMotif(item.motif)}</div></a>`).join('')}</div></section>`;
}

const resolveMappedItems = (ids = [], map = new Map()) => ids.map(id => map.get(id)).filter(Boolean);

function subjectLearningStage(index, total) {
  if (total === 1) return 'Core subject guide';
  if (index === 0) return 'Foundation';
  if (index === total - 1) return 'Application & verification';
  return index < Math.ceil(total / 2) ? 'Build the model' : 'Deepen the analysis';
}

function subjectTools(subject, chapters, demos, toolMap) {
  const linkedIds = [
    ...(subject.toolIds || []),
    ...chapters.flatMap(chapter => (chapter.concepts || []).map(concept => concept.toolId).filter(Boolean)),
    ...demos.map(demo => demo.toolId).filter(Boolean)
  ];
  return [...new Set(linkedIds)].map(id => toolMap.get(id)).filter(Boolean).slice(0, 8);
}

function renderSubjectNotFound() {
  return `<div class="subject-page subject-page-missing"><nav class="subject-page-breadcrumbs" aria-label="Breadcrumb"><a href="#/">Wheel of Acoustics</a><span aria-hidden="true">/</span><span aria-current="page">Subject not found</span></nav><section><p class="home-kicker">Subject guide</p><h1>That subject is not on the wheel.</h1><p>Return to the subject hub and choose one of the ten physical domains.</p><a class="home-primary-action" href="#/">Open the Wheel of Acoustics <span aria-hidden="true">→</span></a></section></div>`;
}

export function renderSubjectPage(subjectId, stats = {}) {
  const subject = subjectWheel.find(item => item.id === subjectId);
  if (!subject) return renderSubjectNotFound();
  const sections = Array.isArray(stats.sections) ? stats.sections : [];
  const demos = Array.isArray(stats.demos) ? stats.demos : [];
  const tools = Array.isArray(stats.tools) ? stats.tools : [];
  const hardware = Array.isArray(stats.hardware) ? stats.hardware : [];
  const pathways = Array.isArray(stats.pathways) ? stats.pathways : [];
  const sectionMap = new Map(sections.map(section => [section.id, section]));
  const demoMap = new Map(demos.map(demo => [demo.id, demo]));
  const toolMap = new Map(tools.map(tool => [tool.id, tool]));
  const hardwareMap = new Map(hardware.map(topic => [topic.id, topic]));
  const pathwayMap = new Map(pathways.map(pathway => [pathway.id, pathway]));
  const chapters = resolveMappedItems(subject.chapterIds, sectionMap);
  const subjectDemos = resolveMappedItems(subject.demoIds, demoMap);
  const subjectToolset = subjectTools(subject, chapters, subjectDemos, toolMap);
  const subjectHardware = resolveMappedItems(subject.hardwareIds, hardwareMap);
  const subjectPathways = resolveMappedItems(subject.pathwayIds, pathwayMap);
  const subjectIndex = subjectWheel.indexOf(subject);
  const previous = subjectWheel[(subjectIndex - 1 + subjectWheel.length) % subjectWheel.length];
  const next = subjectWheel[(subjectIndex + 1) % subjectWheel.length];
  const firstChapter = chapters[0];
  const firstDemo = subjectDemos[0];
  return `<div class="subject-page" style="--subject-color:${subject.accent}">
    <nav class="subject-page-breadcrumbs" aria-label="Breadcrumb"><a href="#/">Wheel of Acoustics</a><span aria-hidden="true">/</span><span aria-current="page">${esc(subject.label)}</span></nav>
    <header class="subject-page-hero">
      <div class="subject-page-hero-copy"><p class="home-kicker">Subject ${String(subjectIndex + 1).padStart(2, '0')} · Wheel of Acoustics</p><h1>${esc(subject.label)}</h1><p class="subject-page-question">${esc(subject.question)}</p><p class="subject-page-summary">${esc(subject.summary)}</p><div class="subject-page-actions">${firstChapter ? `<a class="home-primary-action" href="#/cheat-sheet?section=${encodeURIComponent(firstChapter.id)}">Start learning <span aria-hidden="true">→</span></a>` : ''}${firstDemo ? `<a class="home-search-action" href="#/demo/${encodeURIComponent(firstDemo.id)}">Open the first lab</a>` : ''}</div></div>
      <aside class="subject-page-signal" aria-label="Subject contents"><span class="subject-page-symbol">${esc(subject.symbol)}</span><div><strong>${chapters.length}</strong><span>chapters</span></div><div><strong>${subjectDemos.length}</strong><span>interactive labs</span></div><div><strong>${subjectToolset.length}</strong><span>selected tools</span></div></aside>
    </header>
    <nav class="subject-page-local" aria-label="On this subject page"><a href="#subject-learning">Learning route</a><a href="#subject-labs">Interactive labs</a><a href="#subject-tools">Engineering tools</a><a href="#subject-hardware">Hardware context</a></nav>
    <div class="subject-page-content">
      <section class="subject-page-intuition" aria-labelledby="subject-intuition-title"><div><p class="subject-section-index">01 · Physical intuition</p><h2 id="subject-intuition-title">Begin with the engineering question.</h2></div><div class="subject-intuition-grid"><article><span>Observe</span><h3>${esc(subject.question)}</h3><p>Identify the physical quantities, frequency range, boundary conditions, and energy paths before choosing a model.</p></article><article><span>Model</span><h3>Move from mechanism to response.</h3><p>Use the ordered chapters to connect governing behavior, assumptions, screening equations, and higher-fidelity methods.</p></article><article><span>Verify</span><h3>Challenge the result with evidence.</h3><p>Use the labs, tools, hardware applications, and test context to expose limits before making a design decision.</p></article></div></section>
      <section class="subject-page-section" id="subject-learning" aria-labelledby="subject-learning-title"><header><div><p class="subject-section-index">02 · Learning route</p><h2 id="subject-learning-title">Follow the subject from foundation to application.</h2></div><p>${chapters.length} curated chapters, ordered to preserve the physical story.</p></header><div class="subject-learning-grid">${chapters.map((chapter, index) => `<a href="#/cheat-sheet?section=${encodeURIComponent(chapter.id)}" class="subject-learning-card"><span class="subject-card-step">${String(index + 1).padStart(2, '0')} · ${subjectLearningStage(index, chapters.length)}</span><p>${esc(chapter.eyebrow)}</p><h3>${esc(chapter.title)}</h3><small>${esc(chapter.summary)}</small><footer><span>${chapter.concepts?.length || 0} concepts</span><b aria-hidden="true">→</b></footer></a>`).join('')}</div></section>
      <section class="subject-page-pair">
        <section class="subject-page-section" id="subject-labs" aria-labelledby="subject-labs-title"><header><div><p class="subject-section-index">03 · Interactive behavior</p><h2 id="subject-labs-title">See the physics move.</h2></div><a href="#/demos">All labs →</a></header><div class="subject-resource-list">${subjectDemos.map(demo => `<a href="#/demo/${encodeURIComponent(demo.id)}"><span>Interactive lab</span><div><h3>${esc(demo.title)}</h3><p>${esc(demo.description)}</p></div><b aria-hidden="true">↗</b></a>`).join('')}</div></section>
        <section class="subject-page-section" id="subject-tools" aria-labelledby="subject-tools-title"><header><div><p class="subject-section-index">04 · Engineering models</p><h2 id="subject-tools-title">Calculate and interpret.</h2></div><a href="#/tools">All tools →</a></header><div class="subject-resource-list subject-tool-list">${subjectToolset.map(tool => `<a href="#/tool/${encodeURIComponent(tool.id)}"><span>${esc(tool.complexity || 'Engineering tool')} · ${esc(tool.category)}</span><div><h3>${esc(tool.title)}</h3><p>${esc(tool.description)}</p></div><b aria-hidden="true">↗</b></a>`).join('')}</div></section>
      </section>
      <section class="subject-page-section subject-hardware-section" id="subject-hardware" aria-labelledby="subject-hardware-title"><header><div><p class="subject-section-index">05 · Hardware application</p><h2 id="subject-hardware-title">Put the subject on real structure.</h2></div><a href="#/hardware">Complete hardware atlas →</a></header><div class="subject-hardware-grid">${subjectHardware.map(topic => `<a href="#/hardware/${encodeURIComponent(topic.id)}" style="--hardware-color:${topic.accent || subject.accent}"><span>${esc(topic.eyebrow)}</span><h3>${esc(topic.title)}</h3><p>${esc(topic.summary)}</p><dl><div><dt>Typical source</dt><dd>${esc(topic.sources?.[0] || 'Configuration dependent')}</dd></div><div><dt>Response evidence</dt><dd>${esc(topic.responses?.[0] || 'Model and test dependent')}</dd></div></dl><b>Open hardware guide <i aria-hidden="true">→</i></b></a>`).join('')}</div></section>
      ${subjectPathways.length ? `<section class="subject-page-section subject-pathways-section" aria-labelledby="subject-pathways-title"><header><div><p class="subject-section-index">06 · Guided workflows</p><h2 id="subject-pathways-title">Continue through an analyst pathway.</h2></div><a href="#/pathways">All workflows →</a></header><div class="subject-pathway-grid">${subjectPathways.map(pathway => `<a href="#/pathway/${encodeURIComponent(pathway.id)}"><span>${esc(pathway.role)}</span><h3>${esc(pathway.title)}</h3><p>${esc(pathway.summary)}</p><small>${pathway.steps?.length || 0} guided steps <b aria-hidden="true">→</b></small></a>`).join('')}</div></section>` : ''}
    </div>
    <nav class="subject-page-pagination" aria-label="Adjacent subjects"><a href="#/subject/${encodeURIComponent(previous.id)}"><small>Previous subject</small><strong>${esc(previous.label)}</strong></a><a class="subject-page-wheel-link" href="#/">Back to wheel</a><a href="#/subject/${encodeURIComponent(next.id)}"><small>Next subject</small><strong>${esc(next.label)}</strong></a></nav>
  </div>`;
}

export function renderHomepage(stats = {}) {
  const sections = Array.isArray(stats.sections) ? stats.sections : [];
  const tools = Array.isArray(stats.tools) ? stats.tools : [];
  const demos = Array.isArray(stats.demos) ? stats.demos : [];
  const sectionMap = new Map(sections.map(section => [section.id, section]));
  const demoMap = new Map(demos.map(demo => [demo.id, demo]));
  const counts = [
    `${stats.chapters ?? (sections.length || '60+')} chapters`,
    `${Array.isArray(stats.tools) ? tools.length : stats.tools ?? '100+'} tools`,
    `${Array.isArray(stats.demos) ? demos.length : stats.demos ?? '70+'} demos`
  ];
  return `<div class="atlas-home wheel-home">
    <section class="subject-home-hero" id="subjects" aria-labelledby="homepage-title">
      <header class="subject-home-copy"><p class="home-kicker">Structural acoustics · subject-first navigation</p><h1 id="homepage-title">Navigate the wheel of acoustics.</h1><p class="home-lede">Choose the physical subject first. Then move directly into its chapters, interactive behavior, hardware applications, or engineering tools.</p><div class="home-actions"><button type="button" class="home-primary-action" data-action="search">Search the knowledge base <span aria-hidden="true">⌘K</span></button><a class="home-search-action" href="#/cheat-sheet">Browse every chapter</a></div><p class="home-counts">${counts.map(count => `<span>${esc(count)}</span>`).join('')}</p></header>
      ${renderSubjectWheel(sectionMap, demoMap)}
    </section>
    <section class="home-entry-strip" aria-label="Other ways to navigate"><a href="#/hardware"><span>Apply it</span><strong>Browse by hardware</strong><p>Trace sources, paths, responses, measurements, and models through the launch vehicle.</p></a><a href="#/pathways"><span>Do the work</span><strong>Follow a workflow</strong><p>Move through analysis, test, verification, and handoff decisions in sequence.</p></a><a href="#/case-notes"><span>Use judgment</span><strong>Read applied case notes</strong><p>See where assumptions, shortcuts, and model boundaries change the conclusion.</p></a></section>
    <section class="home-section home-hardware-section" aria-labelledby="home-hardware-title"><div class="home-content-heading"><div><p class="home-kicker">Hardware application</p><h2 id="home-hardware-title">Then follow the energy through the vehicle.</h2></div><a href="#/hardware">Open the complete hardware atlas <span aria-hidden="true">→</span></a></div>${renderAtlas()}</section>
    ${renderFeaturedItems()}
  </div>`;
}

export function bindHomepage(root = document) {
  const controllers = [];
  const explorer = root.querySelector('[data-subject-explorer]');
  if (explorer) {
    const targets = [...explorer.querySelectorAll('[data-subject-select]')];
    const segments = [...explorer.querySelectorAll('[data-subject-segment]')];
    const details = [...explorer.querySelectorAll('[data-subject-detail]')];
    const centerSymbol = explorer.querySelector('[data-subject-center-symbol]');
    const centerLabel = explorer.querySelector('[data-subject-center-label]');
    const selectSubject = id => {
      const subject = subjectWheel.find(item => item.id === id);
      if (!subject) return;
      explorer.dataset.selected = id;
      targets.forEach(target => { const active = target.dataset.subjectSelect === id; target.classList.toggle('is-active', active); target.setAttribute('aria-pressed', String(active)); });
      segments.forEach(segment => segment.classList.toggle('is-active', segment.dataset.subjectSegment === id));
      details.forEach(detail => { detail.hidden = detail.dataset.subjectDetail !== id; });
      if (centerSymbol) centerSymbol.textContent = subject.symbol;
      if (centerLabel) centerLabel.innerHTML = esc(subject.label).replace(' & ', ' &<br>').replace('–', '–<br>');
    };
    targets.forEach(target => {
      const activate = () => selectSubject(target.dataset.subjectSelect);
      const keydown = event => {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        const group = [...target.parentElement.querySelectorAll('[data-subject-select]')];
        const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
        const next = group[(group.indexOf(target) + direction + group.length) % group.length];
        next.focus();
      };
      target.addEventListener('click', activate);
      target.addEventListener('pointerenter', activate);
      target.addEventListener('focus', activate);
      target.addEventListener('keydown', keydown);
      controllers.push(() => { target.removeEventListener('click', activate); target.removeEventListener('pointerenter', activate); target.removeEventListener('focus', activate); target.removeEventListener('keydown', keydown); });
    });
    selectSubject(explorer.dataset.selected || defaultSubjectId);
  }

  const atlas = root.querySelector('[data-launch-atlas]');
  if (atlas) {
    const targets = [...atlas.querySelectorAll('[data-atlas-section]')];
    const details = [...atlas.querySelectorAll('[data-atlas-detail]')];
    const selectAtlas = id => {
      if (!atlasSections.some(section => section.id === id)) return;
      atlas.dataset.selected = id;
      targets.forEach(target => target.classList.toggle('is-active', target.dataset.atlasSection === id));
      details.forEach(detail => { detail.hidden = detail.dataset.atlasDetail !== id; });
    };
    targets.forEach(target => {
      const activate = () => selectAtlas(target.dataset.atlasSection);
      target.addEventListener('pointerenter', activate);
      target.addEventListener('focus', activate);
      controllers.push(() => { target.removeEventListener('pointerenter', activate); target.removeEventListener('focus', activate); });
      if (target.tagName === 'BUTTON') { target.addEventListener('click', activate); controllers.push(() => target.removeEventListener('click', activate)); }
    });
    selectAtlas(atlas.dataset.selected || defaultAtlasSectionId);
  }
  return () => controllers.forEach(cleanup => cleanup());
}
