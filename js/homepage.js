// Data-driven homepage and generic launch-vehicle structural atlas.

export const homepageNavigation = [
  { id: 'learn', label: 'Learn', descriptor: 'Concepts & fundamentals', href: '#/cheat-sheet' },
  { id: 'solve', label: 'Solve', descriptor: 'Start with a problem', href: '#/case-notes' },
  { id: 'explore', label: 'Explore', descriptor: 'Interactive physics', href: '#/demos' },
  { id: 'hardware', label: 'Hardware', descriptor: 'Structural atlas', href: '#/cheat-sheet?section=shell-acoustics-deep-dive' },
  { id: 'workflows', label: 'Workflows', descriptor: 'Engineering paths', href: '#/cheat-sheet?section=launch-vibroacoustic-capstone' },
  { id: 'tools', label: 'Tools', descriptor: 'Calculators & demos', href: '#/tools' }
];

const hardwareSectionIds = new Set([
  'structures-waves',
  'shell-acoustics-deep-dive',
  'wet-tank-dynamics-deep-dive',
  'payload-fairing-cavities',
  'installed-fairing-sea-parameters'
]);

const workflowSectionIds = new Set([
  'model-test-correlation',
  'requirements-margin-flowdown',
  'mitigation-trade-studies',
  'launch-vibroacoustic-capstone',
  'noise-control-workflow'
]);

export function homepageNavKey(first = '', section = '') {
  if (first === 'tool' || first === 'tools') return 'tools';
  if (first === 'demo' || first === 'demos' || first === 'references') return 'explore';
  if (first === 'case-note' || first === 'case-notes') return 'solve';
  if (first === 'cheat-sheet') {
    if (hardwareSectionIds.has(section)) return 'hardware';
    if (workflowSectionIds.has(section)) return 'workflows';
    return 'learn';
  }
  return '';
}

export const atlasSections = [
  {
    id: 'engine',
    title: 'Engine section',
    shortTitle: 'Engine',
    descriptor: 'Propulsion region',
    summary: 'Broadband turbomachinery forcing, mount loads, plume acoustics, and high-frequency shock enter the vehicle here.',
    subjects: ['Turbomachinery forcing', 'Pyroshock', 'Mount loads'],
    href: '#/cheat-sheet?section=launch-acoustic-sources-deep-dive',
    accent: '#ff9b7a',
    callout: { x: 61, y: 75, align: 'right' }
  },
  {
    id: 'lower-tank',
    title: 'Lower tank barrel',
    shortTitle: 'Lower tank',
    descriptor: 'Wet shell structure',
    summary: 'Shell modes, propellant added mass, slosh, axial load, and distributed pressure couple through the lower barrel.',
    subjects: ['Wet-wall modes', 'Slosh coupling', 'Axial response'],
    href: '#/cheat-sheet?section=wet-tank-dynamics-deep-dive',
    accent: '#55b8ff',
    callout: { x: 66, y: 58, align: 'right' }
  },
  {
    id: 'intertank',
    title: 'Intertank',
    shortTitle: 'Intertank',
    descriptor: 'Transition structure',
    summary: 'A stiffness and impedance transition where shell waves, joints, concentrated load paths, and cavity fields exchange energy.',
    subjects: ['Shell vibration', 'Acoustic coupling', 'Joint transmission'],
    href: '#/cheat-sheet?section=wave-matching-deep-dive',
    accent: '#58d59b',
    callout: { x: 23, y: 42, align: 'left' }
  },
  {
    id: 'upper-tank',
    title: 'Upper tank barrel',
    shortTitle: 'Upper tank',
    descriptor: 'Cylindrical shell',
    summary: 'Curvature creates ring and lobar modes while bending-wave speed and coincidence govern structural-acoustic transfer.',
    subjects: ['Bending waves', 'Ring frequency', 'Acoustic radiation'],
    href: '#/cheat-sheet?section=shell-acoustics-deep-dive',
    accent: '#9478ff',
    callout: { x: 18, y: 23, align: 'left' }
  },
  {
    id: 'forward-skirt',
    title: 'Forward skirt',
    shortTitle: 'Forward skirt',
    descriptor: 'Upper structure',
    summary: 'Local modes, joints, avionics attachments, and shock paths bridge the tank stack to the payload region.',
    subjects: ['Structural modes', 'Shock transmission', 'Joint behavior'],
    href: '#/cheat-sheet?section=modal-testing-deep-dive',
    accent: '#f2c663',
    callout: { x: 24, y: 9, align: 'left' }
  },
  {
    id: 'fairing',
    title: 'Payload fairing',
    shortTitle: 'Fairing',
    descriptor: 'Payload region',
    summary: 'The external acoustic field drives the fairing shell, cavity modes, blankets, equipment, and payload interface through parallel paths.',
    subjects: ['Acoustic environment', 'Panel response', 'Cavity coupling'],
    href: '#/cheat-sheet?section=payload-fairing-cavities',
    accent: '#6f8cff',
    callout: { x: 72, y: 13, align: 'right' }
  }
];

export const quickStartItems = [
  { id: 'learn', title: 'I want to learn', descriptor: 'Start with the fundamentals', href: '#/cheat-sheet', icon: 'book' },
  { id: 'solve', title: 'I have a problem', descriptor: 'Diagnose an observed issue', href: '#/case-notes', icon: 'alert' },
  { id: 'explore', title: 'Explore the map', descriptor: 'Watch the physics connect', href: '#/demos', icon: 'network' },
  { id: 'hardware', title: 'Browse by hardware', descriptor: 'Select a vehicle region', href: '#/cheat-sheet?section=shell-acoustics-deep-dive', icon: 'cube' },
  { id: 'workflows', title: 'Follow a workflow', descriptor: 'Complete an engineering task', href: '#/cheat-sheet?section=launch-vibroacoustic-capstone', icon: 'workflow' },
  { id: 'tools', title: 'Use a tool', descriptor: 'Calculate, visualize, export', href: '#/tools', icon: 'calculator' }
];

export const navigationCards = [
  { id: 'learn', title: 'Learn', descriptor: 'Build understanding step by step.', action: 'Browse topics', href: '#/cheat-sheet', motif: 'wave' },
  { id: 'solve', title: 'Solve', descriptor: 'Begin with an observed engineering problem.', action: 'Diagnose now', href: '#/case-notes', motif: 'psd' },
  { id: 'explore', title: 'Explore', descriptor: 'See how concepts and physical regimes connect.', action: 'Open demos', href: '#/demos', motif: 'network' },
  { id: 'hardware', title: 'Hardware', descriptor: 'Explore vehicle components and their physics.', action: 'Browse atlas', href: '#/cheat-sheet?section=shell-acoustics-deep-dive', motif: 'shell' },
  { id: 'workflows', title: 'Workflows', descriptor: 'Follow proven analysis and test paths.', action: 'View workflows', href: '#/cheat-sheet?section=requirements-margin-flowdown', motif: 'workflow' },
  { id: 'tools', title: 'Tools', descriptor: 'Calculate, visualize, and experiment.', action: 'Open tools', href: '#/tools', motif: 'surface' }
];

export const featuredItems = [
  { title: 'Bending-wave dispersion', purpose: 'See why different frequencies travel at different speeds.', href: '#/demo/dispersion', motif: 'dispersion' },
  { title: 'Critical-frequency calculator', purpose: 'Find coincidence frequency for plate and shell materials.', href: '#/tool/critical-frequency', motif: 'critical' },
  { title: 'Ring-frequency explorer', purpose: 'Connect cylinder geometry to breathing-mode behavior.', href: '#/demo/ring', motif: 'ring' },
  { title: 'Transmission-loss explorer', purpose: 'Track mass law and coincidence through an elastic panel.', href: '#/tool/elastic-panel-tl', motif: 'transmission' },
  { title: 'PSD combiner', purpose: 'Combine environments with explicit correlation assumptions.', href: '#/tool/psd-combination', motif: 'spectrum' },
  { title: 'Modal-density visualizer', purpose: 'See when modes overlap and SEA becomes credible.', href: '#/demo/modal-density-regime-map', motif: 'density' }
];

const defaultAtlasSectionId = 'fairing';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

function lineIcon(name) {
  const paths = {
    book: '<path d="M4 5.5c3-1 5-.5 8 1.5v12c-3-2-5-2.5-8-1.5zM20 5.5c-3-1-5-.5-8 1.5v12c3-2 5-2.5 8-1.5z"/>',
    alert: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 8v5m0 3.5v.2"/>',
    network: '<circle cx="12" cy="4" r="2"/><circle cx="4" cy="17" r="2"/><circle cx="20" cy="17" r="2"/><circle cx="12" cy="20" r="2"/><path d="m10.8 5.7-5.5 9.6m7.9-9.6 5.5 9.6M6 17h4m4 0h4"/>',
    cube: '<path d="m12 2.8 8 4.4v9.6l-8 4.4-8-4.4V7.2zM4 7.2l8 4.5 8-4.5M12 11.7v9.5"/>',
    workflow: '<path d="M4 5h7m2 0h7M4 12h4m2 0h10M4 19h10m2 0h4"/><circle cx="12" cy="5" r="1.5"/><circle cx="8.5" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/>',
    calculator: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8v3H8zm0 7h.1m3.9 0h.1m3.9 0h.1M8 17h.1m3.9 0h.1m3.9 0h.1"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.network}</svg>`;
}

function motifSvg(name) {
  const common = 'viewBox="0 0 260 130" aria-hidden="true" preserveAspectRatio="none"';
  if (name === 'wave') return `<svg ${common}><defs><linearGradient id="learn-field" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9478ff"/><stop offset="1" stop-color="#55b8ff"/></linearGradient></defs><g class="motif-grid"><path d="M15 25h230M15 55h230M15 85h230M15 115h230M45 12v110M90 12v110M135 12v110M180 12v110M225 12v110"/></g><path class="motif-field" d="M18 100c22-4 31-28 54-24 19 3 24 29 46 24 22-4 25-68 49-66 25 2 23 62 47 60 14-1 20-18 30-27v45H18z" fill="url(#learn-field)"/><path class="motif-line" d="M18 100c22-4 31-28 54-24 19 3 24 29 46 24 22-4 25-68 49-66 25 2 23 62 47 60 14-1 20-18 30-27"/></svg>`;
  if (name === 'psd') return `<svg ${common}><g class="motif-grid"><path d="M15 25h230M15 55h230M15 85h230M15 115h230M45 12v110M90 12v110M135 12v110M180 12v110M225 12v110"/></g><path class="motif-line" d="M15 108 29 99 40 103 51 88 62 95 75 74 87 89 98 53 106 82 116 70 124 16 132 73 142 48 151 93 165 64 175 104 190 72 202 92 215 59 226 96 245 82"/><path class="motif-line motif-warm" d="M15 112 40 108 62 110 83 101 106 106 127 92 148 100 168 78 188 95 208 65 226 88 245 81"/></svg>`;
  if (name === 'network') return `<svg ${common}><g class="motif-network"><path d="M25 92 69 52 112 86 151 35 195 68 236 26M69 52l34-24 48 7 44 33 41 31M112 86l39-51 9 72 35-39M25 92l78-64 57 79 76-81"/><g><circle cx="25" cy="92" r="5"/><circle cx="69" cy="52" r="5"/><circle cx="103" cy="28" r="5"/><circle cx="112" cy="86" r="5"/><circle cx="151" cy="35" r="5"/><circle cx="160" cy="107" r="5"/><circle cx="195" cy="68" r="5"/><circle cx="236" cy="26" r="5"/><circle cx="236" cy="99" r="5"/></g></g></svg>`;
  if (name === 'shell') return `<svg ${common}><defs><linearGradient id="shell-metal" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#172f4d"/><stop offset=".45" stop-color="#6f8cff"/><stop offset="1" stop-color="#142841"/></linearGradient></defs><g class="motif-shell"><ellipse cx="45" cy="70" rx="28" ry="43"/><path d="M45 27h150c18 0 30 19 30 43s-12 43-30 43H45c17-5 28-20 28-43S62 32 45 27z" fill="url(#shell-metal)"/><ellipse cx="195" cy="70" rx="30" ry="43"/><path d="M85 31v78m42-78v78m42-78v78M45 52h173M45 88h173"/></g></svg>`;
  if (name === 'workflow') return `<svg ${common}><g class="motif-flow"><rect x="10" y="18" width="55" height="26"/><rect x="102" y="18" width="55" height="26"/><rect x="194" y="18" width="55" height="26"/><rect x="56" y="86" width="55" height="26"/><rect x="148" y="86" width="55" height="26"/><path d="M65 31h37m55 0h37M221 44v20h-45v22M129 44v42m-27 13H82"/><path d="m96 27 6 4-6 4m92-8 6 4-6 4m-63 45 4 6 4-6m37 2 6 4-6 4"/></g></svg>`;
  return `<svg ${common}><g class="motif-grid"><path d="M15 25h230M15 55h230M15 85h230M15 115h230M45 12v110M90 12v110M135 12v110M180 12v110M225 12v110"/></g><g class="motif-surface"><path d="M18 104c30-2 40-13 63-15 29-3 35 15 62 9 31-7 37-61 66-55 17 4 21 29 34 37"/><path d="M18 93c28-1 42-15 65-13 30 2 38 25 67 13 24-10 34-52 59-44 17 5 22 24 34 29"/><path d="M18 82c25 1 39-12 63-10 28 2 43 25 70 14 26-11 33-45 58-35 16 7 21 20 34 25"/><path d="M18 71c25 3 40-9 63-7 27 3 43 23 70 15 25-7 36-37 58-26 15 7 22 17 34 21"/></g></svg>`;
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

function segmentMarkup(section) {
  const common = `class="atlas-region atlas-region-${section.id}" data-atlas-section="${section.id}" href="${section.href}" tabindex="0" aria-label="${esc(section.title)}. ${esc(section.summary)}" style="--region-accent:${section.accent}"`;
  const internals = {
    engine: '<path class="atlas-segment-shell" d="M56-54h160v108H56z"/><path class="atlas-structure" d="M74-47v94m34-94v94m36-94v94m36-94v94M56-26h160M56 0h160M56 26h160"/><path class="atlas-engine-bell" d="M58-43 4-61v42l54-11zm0 13L6-20v40l52-10zm0 13L4 19v42l54-18zm0 27L6 20v40l52-10z"/>',
    'lower-tank': '<path class="atlas-segment-shell" d="M216-62h218v124H216z"/><ellipse class="atlas-tank" cx="325" cy="0" rx="98" ry="50"/><path class="atlas-fluid" d="M235 4c42 9 77 13 105 8 31-6 48-11 76-2v38H235z"/><path class="atlas-structure" d="M242-58v116m48-120v124m48-124v124m48-120v116M216-35h218M216 35h218"/>',
    intertank: '<path class="atlas-segment-shell" d="M434-68h76v136h-76z"/><path class="atlas-structure atlas-truss" d="M438-62 506 62m0-124L438 62m34-126V64M438-34h68M438 0h68M438 34h68"/>',
    'upper-tank': '<path class="atlas-segment-shell" d="M510-63h202v126H510z"/><ellipse class="atlas-tank atlas-tank-upper" cx="611" cy="0" rx="88" ry="48"/><path class="atlas-structure" d="M535-59v118m48-122v126m48-126v126m52-122v118M510-34h202M510 34h202"/>',
    'forward-skirt': '<path class="atlas-segment-shell" d="M712-58 790-48v96l-78 10z"/><path class="atlas-structure" d="m718-52 64 96m2-89-66 96m26-106v110M714-29l72-8M712 0h76m-74 29 72 8"/>',
    fairing: '<path class="atlas-segment-shell atlas-fairing-shell" d="M790-54c74-17 145 6 191 54-46 48-117 71-191 54z"/><path class="atlas-payload" d="M810-29h63l45 29-45 29h-63z"/><path class="atlas-structure" d="M812-48v96m31-101v106m31-99v92M790 0h188"/><path class="atlas-fairing-seam" d="M794-50c70-14 135 8 181 50M794 50c70 14 135-8 181-50"/>'
  };
  return `<a ${common}>${internals[section.id]}</a>`;
}

function launchVehicleSvg() {
  return `<svg class="launch-vehicle-svg" viewBox="0 0 1040 620" role="img" aria-labelledby="atlas-svg-title atlas-svg-description">
    <title id="atlas-svg-title">Interactive generic launch-vehicle structural atlas</title>
    <desc id="atlas-svg-description">A sectioned launch vehicle shown diagonally with interactive engine, lower tank, intertank, upper tank, forward skirt, and payload fairing regions.</desc>
    <defs>
      <linearGradient id="atlas-shell" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dbe7f5" stop-opacity=".5"/><stop offset=".35" stop-color="#294767" stop-opacity=".76"/><stop offset=".65" stop-color="#0b1d31" stop-opacity=".9"/><stop offset="1" stop-color="#9bb5d1" stop-opacity=".36"/></linearGradient>
      <linearGradient id="atlas-tank" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6f8cff" stop-opacity=".18"/><stop offset=".5" stop-color="#c2d1e6" stop-opacity=".3"/><stop offset="1" stop-color="#102943" stop-opacity=".5"/></linearGradient>
      <linearGradient id="atlas-fluid" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#55b8ff" stop-opacity=".2"/><stop offset="1" stop-color="#55b8ff" stop-opacity=".55"/></linearGradient>
      <radialGradient id="atlas-plume" cx="1" cy=".5" r="1"><stop stop-color="#fff" stop-opacity=".9"/><stop offset=".18" stop-color="#f2c663" stop-opacity=".8"/><stop offset=".52" stop-color="#9478ff" stop-opacity=".38"/><stop offset="1" stop-color="#55b8ff" stop-opacity="0"/></radialGradient>
      <filter id="atlas-glow"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <g class="atlas-orbit-lines" aria-hidden="true"><path d="M85 501C303 356 533 186 967 95"/><path d="M62 529C348 426 560 211 996 124"/><path d="M131 548C347 460 643 255 1001 192"/></g>
    <g class="atlas-plume" transform="translate(145 455) rotate(-29)"><ellipse cx="-70" cy="0" rx="112" ry="58" fill="url(#atlas-plume)" filter="url(#atlas-glow)"/><path d="M0-36C-48-42-97-31-153 0-97 31-48 42 0 36z" fill="url(#atlas-plume)"/></g>
    <g class="atlas-vehicle" transform="translate(86 445) rotate(-29)">
      ${atlasSections.map(segmentMarkup).join('')}
      <path class="atlas-centerline" d="M-10 0h1000" aria-hidden="true"/>
      <g class="atlas-fasteners" aria-hidden="true">${Array.from({length: 22}, (_, index) => `<circle cx="${205 + index * 31}" cy="${index % 2 ? 57 : -57}" r="2"/>`).join('')}</g>
    </g>
  </svg>`;
}

function renderAtlasDetails() {
  return atlasSections.map(section => `<article class="atlas-detail" data-atlas-detail="${section.id}" ${section.id === defaultAtlasSectionId ? '' : 'hidden'}>
    <p class="atlas-detail-kicker">${esc(section.descriptor)}</p>
    <h3>${esc(section.title)}</h3>
    <p>${esc(section.summary)}</p>
    <ul>${section.subjects.map(subject => `<li>${esc(subject)}</li>`).join('')}</ul>
    <a href="${section.href}">Open related physics <span aria-hidden="true">→</span></a>
  </article>`).join('');
}

function renderAtlas() {
  return `<section class="vehicle-atlas" id="vehicle-atlas" data-launch-atlas data-selected="${defaultAtlasSectionId}" aria-labelledby="atlas-heading">
    <div class="atlas-heading-row"><div><p class="home-kicker">Interactive structural atlas</p><h2 id="atlas-heading">Follow energy through the vehicle.</h2></div><p>Hover, focus, or tap a region.</p></div>
    <div class="atlas-visual">
      ${launchVehicleSvg()}
      <div class="atlas-callouts" aria-label="Launch vehicle regions">${atlasSections.map(section => `<a class="atlas-callout atlas-callout-${section.callout.align}" data-atlas-section="${section.id}" href="${section.href}" style="--callout-x:${section.callout.x}%;--callout-y:${section.callout.y}%;--region-accent:${section.accent}"><strong>${esc(section.title)}</strong><span>${esc(section.subjects.join(' · '))}</span></a>`).join('')}</div>
      <div class="atlas-detail-stack" aria-live="polite">${renderAtlasDetails()}</div>
    </div>
    <div class="atlas-region-key" aria-label="Select vehicle region">${atlasSections.map(section => `<button type="button" data-atlas-section="${section.id}" class="${section.id === defaultAtlasSectionId ? 'is-active' : ''}" style="--region-accent:${section.accent}">${esc(section.shortTitle)}</button>`).join('')}</div>
  </section>`;
}

function renderQuickStart() {
  return `<aside class="quick-start" aria-labelledby="quick-start-title"><header><p class="home-kicker">Choose an entry point</p><h2 id="quick-start-title">Quick start</h2></header><div class="quick-start-list">${quickStartItems.map(item => `<a href="${item.href}" class="quick-start-item quick-start-${item.id}"><span class="quick-start-icon">${lineIcon(item.icon)}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.descriptor)}</small></span><span class="quick-start-arrow" aria-hidden="true">›</span></a>`).join('')}</div></aside>`;
}

function renderNavigationCards() {
  return `<section class="home-section nav-ways" aria-labelledby="navigation-ways-title"><div class="home-section-heading"><p class="home-kicker">Choose the shape of your question</p><h2 id="navigation-ways-title">Six ways to navigate</h2></div><div class="navigation-card-grid">${navigationCards.map(card => `<a class="navigation-card navigation-${card.id}" href="${card.href}"><div><h3>${esc(card.title)}</h3><p>${esc(card.descriptor)}</p></div><div class="navigation-motif">${motifSvg(card.motif)}</div><span>${esc(card.action)} <b aria-hidden="true">→</b></span></a>`).join('')}</div></section>`;
}

function renderFeaturedItems() {
  return `<section class="home-section featured-library" aria-labelledby="featured-library-title"><div class="featured-heading"><div><p class="home-kicker">Real calculators and live models</p><h2 id="featured-library-title">Featured demos & tools</h2></div><a href="#/demos">View the full interactive library <span aria-hidden="true">→</span></a></div><div class="featured-strip">${featuredItems.map(item => `<a class="featured-item" href="${item.href}"><div><h3>${esc(item.title)}</h3><p>${esc(item.purpose)}</p></div><div class="featured-visual">${featuredMotif(item.motif)}</div></a>`).join('')}</div></section>`;
}

export function renderHomepage(stats = {}) {
  const counts = [
    `${stats.chapters ?? '60+'} chapters`,
    `${stats.tools ?? '100+'} tools`,
    `${stats.demos ?? '70+'} demos`
  ];
  return `<div class="atlas-home">
    <section class="atlas-hero" aria-labelledby="homepage-title">
      <div class="home-message">
        <p class="home-kicker">Structural acoustics · launch vibroacoustics</p>
        <h1 id="homepage-title">Understand how vibration and sound move through structures.</h1>
        <p class="home-lede">A visual, connected knowledge base linking acoustics fundamentals and launch-vehicle practice with engineering judgment, interactive demos, and real-world workflows.</p>
        <div class="home-actions"><a class="home-primary-action" href="#/cheat-sheet">Start exploring <span aria-hidden="true">→</span></a><button type="button" class="home-search-action" data-action="search">Search the knowledge base</button></div>
        <p class="home-counts">${counts.map(count => `<span>${esc(count)}</span>`).join('')}</p>
      </div>
      ${renderAtlas()}
      ${renderQuickStart()}
    </section>
    ${renderNavigationCards()}
    ${renderFeaturedItems()}
  </div>`;
}

export function bindHomepage(root = document) {
  const atlas = root.querySelector('[data-launch-atlas]');
  if (!atlas) return () => {};
  const targets = [...atlas.querySelectorAll('[data-atlas-section]')];
  const details = [...atlas.querySelectorAll('[data-atlas-detail]')];
  let selected = atlas.dataset.selected || defaultAtlasSectionId;

  const select = id => {
    if (!atlasSections.some(section => section.id === id)) return;
    selected = id;
    atlas.dataset.selected = id;
    targets.forEach(target => target.classList.toggle('is-active', target.dataset.atlasSection === id));
    details.forEach(detail => { detail.hidden = detail.dataset.atlasDetail !== id; });
  };

  const controllers = [];
  targets.forEach(target => {
    const activate = () => select(target.dataset.atlasSection);
    target.addEventListener('pointerenter', activate);
    target.addEventListener('focus', activate);
    controllers.push(() => {
      target.removeEventListener('pointerenter', activate);
      target.removeEventListener('focus', activate);
    });
    if (target.tagName === 'BUTTON') {
      target.addEventListener('click', activate);
      controllers.push(() => target.removeEventListener('click', activate));
    }
  });
  select(selected);
  return () => controllers.forEach(cleanup => cleanup());
}
