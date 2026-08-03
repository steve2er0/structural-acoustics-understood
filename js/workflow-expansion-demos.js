/* Interactive workflow labs for correlation, paths, requirements, uncertainty, Miles, and ERS. */
import {
  modelTestCorrelationState,
  branchingSeaState,
  transferPathState,
  requirementsFlowdownState,
  mitigationTradeState,
  nonlinearJointState,
  fairingCavityState,
  uncertaintySensitivityState,
  milesValidityState,
  extremeResponseState
} from './workflow-expansion-physics.js';

const C = Object.freeze({ ink: '#172027', teal: '#1e6077', dark: '#164453', rust: '#b96d37', muted: '#657176', grid: '#ada497', paper: '#faf8f2', wash: '#e7e2d8', pale: '#dce9ec', green: '#376e56' });
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fmt = (value, digits = 2) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '') : '—';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function control({ key, label, min, max, step, value, unit = '' }) {
  return `<div class="demo-control"><label for="wf-${key}">${esc(label)} <output id="wf-out-${key}">${esc(value)}${esc(unit)}</output></label><input id="wf-${key}" name="${esc(key)}" data-acs-key="${esc(key)}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
}

function shell(root, controls, caption, draw) {
  root.innerHTML = `<div class="demo-controls">${controls.map(control).join('')}</div><div class="demo-canvas-wrap"><svg data-workflow-svg viewBox="0 0 1000 440" role="img" aria-label="Interactive launch-vehicle engineering visualization"></svg></div><div class="demo-caption">${caption}</div>`;
  const inputs = Object.fromEntries([...root.querySelectorAll('[data-acs-key]')].map(element => [element.dataset.acsKey, element]));
  const render = () => {
    const values = Object.fromEntries(Object.entries(inputs).map(([key, element]) => [key, Number(element.value)]));
    controls.forEach(item => { root.querySelector(`#wf-out-${item.key}`).textContent = `${fmt(values[item.key], item.step < 0.01 ? 3 : item.step < 1 ? 2 : 0)}${item.unit ?? ''}`; });
    draw(root.querySelector('[data-workflow-svg]'), values);
  };
  Object.values(inputs).forEach(input => input.addEventListener('input', render));
  render();
  return () => {};
}

function chartPath(xs, ys, box, logX = false, logY = false) {
  const tx = value => logX ? Math.log10(Math.max(value, 1e-30)) : value;
  const ty = value => logY ? Math.log10(Math.max(value, 1e-30)) : value;
  const xx = xs.map(tx), yy = ys.map(ty), xmin = Math.min(...xx), xmax = Math.max(...xx), ymin = Math.min(...yy), ymax = Math.max(...yy);
  return xx.map((value, index) => {
    const x = box.x + (value - xmin) / Math.max(xmax - xmin, 1e-30) * box.w;
    const y = box.y + box.h - (yy[index] - ymin) / Math.max(ymax - ymin, 1e-30) * box.h;
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}
const axes = (box, xLabel, yLabel) => `<path d="M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}" fill="none" stroke="${C.muted}"/><text x="${box.x + box.w / 2}" y="${box.y + box.h + 34}" text-anchor="middle" font-size="12" fill="${C.muted}">${esc(xLabel)}</text><text x="${box.x - 40}" y="${box.y + box.h / 2}" transform="rotate(-90 ${box.x - 40} ${box.y + box.h / 2})" text-anchor="middle" font-size="12" fill="${C.muted}">${esc(yLabel)}</text>`;
const title = text => `<text x="48" y="38" font-size="16" font-weight="700" fill="${C.ink}">${esc(text)}</text>`;
const preview = inner => `<svg viewBox="0 0 520 180" aria-hidden="true"><rect width="520" height="180" fill="${C.wash}"/>${inner}</svg>`;

const previewMap = {
  'model-test-correlation-lab': preview('<path d="M35 138 H490 M35 138 V30" stroke="#657176"/><path d="M42 125 C110 118 145 36 205 54 C265 72 300 124 488 120" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M42 126 C125 120 168 42 222 60 C280 78 320 126 488 121" fill="none" stroke="#b96d37" stroke-width="4"/><circle cx="170" cy="42" r="9" fill="#164453"/><circle cx="218" cy="60" r="9" fill="#b96d37"/>'),
  'branching-sea-network': preview('<rect x="25" y="64" width="76" height="52" fill="#164453"/><rect x="160" y="28" width="76" height="52" fill="#1e6077"/><rect x="160" y="102" width="76" height="52" fill="#657176"/><rect x="300" y="28" width="76" height="52" fill="#b96d37"/><rect x="420" y="64" width="76" height="52" fill="#164453"/><path d="M101 90 L160 54 M101 90 L160 128 M236 54 H300 M236 128 L420 90 M376 54 L420 90 M236 54 L420 90" stroke="#ada497" stroke-width="7"/>'),
  'transfer-path-workbench': preview('<circle cx="70" cy="38" r="18" fill="#164453"/><circle cx="70" cy="90" r="18" fill="#1e6077"/><circle cx="70" cy="142" r="18" fill="#b96d37"/><path d="M88 38 C220 38 260 90 430 90 M88 90 H430 M88 142 C220 142 260 90 430 90" fill="none" stroke="#657176" stroke-width="5"/><rect x="430" y="58" width="60" height="64" fill="#164453"/>'),
  'requirements-margin-flow': preview('<rect x="40" y="118" width="75" height="32" fill="#657176"/><rect x="155" y="92" width="75" height="58" fill="#1e6077"/><rect x="270" y="40" width="75" height="110" fill="#b96d37"/><rect x="385" y="70" width="75" height="80" fill="#164453"/><path d="M115 134 H155 M230 121 H270 M345 95 H385" stroke="#172027" stroke-width="5"/>'),
  'mitigation-trade-space': preview('<path d="M45 145 H490 M45 145 V25" stroke="#657176"/><circle cx="120" cy="70" r="14" fill="#1e6077"/><circle cx="190" cy="44" r="13" fill="#b96d37"/><circle cx="250" cy="116" r="12" fill="#164453"/><circle cx="340" cy="91" r="15" fill="#376e56"/><circle cx="440" cy="54" r="18" fill="#657176"/><path d="M60 132 L465 38" stroke="#ada497" stroke-dasharray="7 5"/>'),
  'nonlinear-joint-behavior': preview('<path d="M35 145 H490 M35 145 V25" stroke="#657176"/><path d="M42 132 C135 125 185 108 245 84 C315 56 380 36 485 31" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M42 55 L100 115 L158 55 L216 115 L274 55 L332 115 L390 55 L448 115" fill="none" stroke="#b96d37" stroke-width="4"/>'),
  'fairing-cavity-field': preview('<path d="M35 42 Q145 10 255 42 V138 Q145 170 35 138Z" fill="#164453"/><path d="M35 90 C80 35 125 145 170 90 S220 35 255 90" fill="none" stroke="#dce9ec" stroke-width="9"/><rect x="205" y="70" width="34" height="40" fill="#b96d37"/><path d="M300 140 C345 132 365 45 405 55 C445 65 462 125 490 105" fill="none" stroke="#1e6077" stroke-width="5"/>'),
  'uncertainty-sensitivity-lab': preview('<path d="M35 145 H490 M35 145 V25" stroke="#657176"/><path d="M65 145 C110 142 130 60 190 36 C250 12 305 75 340 112 C375 143 420 145 480 145" fill="#dce9ec" stroke="#1e6077" stroke-width="4"/><line x1="360" y1="28" x2="360" y2="145" stroke="#b96d37" stroke-width="4" stroke-dasharray="6 5"/>'),
  'miles-validity': preview('<path d="M35 145 H490 M35 145 V25" stroke="#657176"/><path d="M42 126 L488 47" fill="none" stroke="#ada497" stroke-width="4"/><path d="M42 140 C190 138 228 132 255 40 C280 130 330 138 488 140" fill="none" stroke="#1e6077" stroke-width="5"/><circle cx="255" cy="40" r="8" fill="#b96d37"/>'),
  'extreme-response-spectrum': preview('<path d="M35 145 H490 M35 145 V25" stroke="#657176"/><path d="M42 132 C120 120 145 80 210 98 C280 116 300 52 360 65 C410 78 445 48 488 44" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M42 112 C120 98 145 52 210 72 C280 92 300 26 360 38 C410 52 445 25 488 22" fill="none" stroke="#b96d37" stroke-width="5"/>')
};

export const workflowExpansionSupportedDemoIds = Object.freeze(Object.keys(previewMap));
export function workflowExpansionPreviewSvg(id) { return previewMap[id] || null; }

function mountCorrelation(root) {
  return shell(root, [
    { key: 'testFrequency', label: 'Test frequency', min: 360, max: 500, step: 1, value: 436, unit: ' Hz' },
    { key: 'shapeRotationDegrees', label: 'Shape mixing', min: 0, max: 75, step: 1, value: 18, unit: '°' },
    { key: 'spatialNoise', label: 'Spatial noise', min: 0, max: 0.5, step: 0.01, value: 0.08 }
  ], 'Frequency, spatial shape, and complex response are separate correlation checks. A pass in one column does not erase a failure in another.', (svg, input) => {
    const state = modelTestCorrelationState(input), box = { x: 55, y: 65, w: 555, h: 275 };
    const model = chartPath(state.frequencies, state.modelMagnitude, box, false, true), test = chartPath(state.frequencies, state.testMagnitude, box, false, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Model–test correlation evidence')}${axes(box, 'frequency (Hz)', 'FRF magnitude (log)')}<path d="${model}" fill="none" stroke="${C.teal}" stroke-width="4"/><path d="${test}" fill="none" stroke="${C.rust}" stroke-width="4"/><text x="680" y="92" font-size="14" font-weight="700" fill="${C.ink}">Frequency error ${fmt(state.frequencyError, 1)}%</text><text x="680" y="130" font-size="14" fill="${state.macPass ? C.green : C.rust}">MAC ${fmt(state.mac, 3)}</text><text x="680" y="165" font-size="14" fill="${state.fracPass ? C.green : C.rust}">FRAC ${fmt(state.frac, 3)}</text><text x="680" y="225" font-size="14" font-weight="700" fill="${C.ink}">${esc(state.disposition)}</text><text x="680" y="262" font-size="12" fill="${C.muted}">Blue: model · Rust: test</text>`;
  });
}

function mountSea(root) {
  return shell(root, [
    { key: 'primaryClf', label: 'Primary CLF', min: 0.002, max: 0.04, step: 0.001, value: 0.018 },
    { key: 'branchClf', label: 'Cavity branch CLF', min: 0.001, max: 0.025, step: 0.001, value: 0.008 },
    { key: 'flankingClf', label: 'Flanking CLF', min: 0, max: 0.02, step: 0.001, value: 0.003 },
    { key: 'secondaryPower', label: 'Payload-side input', min: 0, max: 0.5, step: 0.01, value: 0.12, unit: ' W' }
  ], 'The solved receiver path share depends on the entire energy graph. Gross exchange, net flow, and stored energy answer different engineering questions.', (svg, input) => {
    const state = branchingSeaState(input), positions = [[90, 210], [290, 105], [500, 105], [830, 210], [395, 315]];
    const edges = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 3], [1, 3]].map(([a, b], index) => `<line x1="${positions[a][0]}" y1="${positions[a][1]}" x2="${positions[b][0]}" y2="${positions[b][1]}" stroke="${index === 3 || index === 4 ? C.rust : C.teal}" stroke-width="${3 + 90 * Math.abs(state.edges[index].net)}" opacity=".72"/>`).join('');
    const nodes = positions.map(([x, y], index) => `<circle cx="${x}" cy="${y}" r="${32 + 9 * Math.log10(1 + state.energies[index] / Math.max(Math.min(...state.energies), 1e-20))}" fill="${index === 3 ? C.rust : C.dark}"/><text x="${x}" y="${y + 57}" text-anchor="middle" font-size="12" fill="${C.ink}">${esc(state.names[index])}</text>`).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Branched SEA power-flow network')}${edges}${nodes}<text x="660" y="70" font-size="14" fill="${C.ink}">Payload transfer ${fmt(state.transferDb, 1)} dB</text><text x="660" y="95" font-size="14" fill="${C.teal}">Primary ${fmt(100 * state.primaryShare, 0)}%</text><text x="660" y="120" font-size="14" fill="${C.rust}">Flanking ${fmt(100 * state.flankingShare, 0)}%</text><text x="660" y="145" font-size="12" fill="${C.muted}">Power balance error ${fmt(100 * state.balanceError, 6)}%</text>`;
  });
}

function mountTpa(root) {
  return shell(root, [
    { key: 'blockedForce1', label: 'Forward-skirt force', min: 0, max: 150, step: 1, value: 85, unit: ' N' },
    { key: 'blockedForce2', label: 'Shelf force', min: 0, max: 150, step: 1, value: 62, unit: ' N' },
    { key: 'phase2', label: 'Shelf-path phase', min: -180, max: 180, step: 2, value: 138, unit: '°' },
    { key: 'coherence', label: 'Cross-path coherence', min: 0, max: 1, step: 0.02, value: 1 }
  ], 'A path is source strength × installation correction × transfer function. Complex phase can make the receiver smaller—or larger—than the scalar path sum.', (svg, input) => {
    const state = transferPathState(input), max = Math.max(...state.paths.map(path => path.magnitude), 1e-12);
    const bars = state.paths.map((path, index) => { const width = 440 * path.magnitude / max, y = 100 + 85 * index; return `<text x="55" y="${y + 20}" font-size="13" fill="${C.ink}">${esc(path.name)}</text><rect x="220" y="${y}" width="${width}" height="30" fill="${[C.teal, C.rust, C.green][index]}"/><text x="${230 + width}" y="${y + 20}" font-size="12" fill="${C.ink}">${fmt(path.magnitude, 4)} m/s · ${fmt(path.phase, 0)}°</text>`; }).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Operational transfer-path contributions')}${bars}<text x="710" y="105" font-size="15" font-weight="700" fill="${C.ink}">Total ${fmt(state.totalResponse, 4)} m/s</text><text x="710" y="145" font-size="13" fill="${C.rust}">Cancellation ${fmt(state.cancellationDb, 1)} dB</text><text x="710" y="185" font-size="13" fill="${C.ink}">Dominant: ${esc(state.dominantPath)}</text>`;
  });
}

function mountRequirements(root) {
  return shell(root, [
    { key: 'statisticalMarginDb', label: 'Statistical margin', min: 0, max: 9, step: 0.25, value: 3, unit: ' dB' },
    { key: 'qualificationMarginDb', label: 'Qualification margin', min: 0, max: 9, step: 0.25, value: 3, unit: ' dB' },
    { key: 'testDuration', label: 'Test duration', min: 15, max: 240, step: 5, value: 60, unit: ' s' },
    { key: 'responseLimit', label: 'Response limit', min: 12, max: 50, step: 1, value: 22, unit: ' g' }
  ], 'Statistical coverage, qualification margin, duration, and response limits are separate budget entries. A notch is an evidence-based test-control action.', (svg, input) => {
    const state = requirementsFlowdownState(input), max = Math.max(...state.levels), barW = 120;
    const bars = state.levels.map((level, index) => { const height = 245 * level / max, x = 100 + index * 195; return `<rect x="${x}" y="${350 - height}" width="${barW}" height="${height}" fill="${[C.muted, C.teal, C.rust, C.dark][index]}"/><text x="${x + barW / 2}" y="375" text-anchor="middle" font-size="11" fill="${C.ink}">${esc(state.labels[index])}</text><text x="${x + barW / 2}" y="${338 - height}" text-anchor="middle" font-size="12" fill="${C.ink}">${fmt(level, 3)}</text>`; }).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Qualification requirement flow-down')}${bars}<text x="825" y="92" font-size="14" fill="${state.notchRequired ? C.rust : C.green}">${state.notchRequired ? `Notch ${fmt(-10 * Math.log10(state.notchFactor), 1)} dB` : 'No notch required'}</text><text x="825" y="125" font-size="12" fill="${C.muted}">Retained margin ${fmt(state.retainedMarginDb, 1)} dB</text>`;
  });
}

function mountTrade(root) {
  return shell(root, [
    { key: 'frequency', label: 'Problem frequency', min: 60, max: 1200, step: 10, value: 420, unit: ' Hz' },
    { key: 'requiredReductionDb', label: 'Required reduction', min: 1, max: 20, step: 0.5, value: 8, unit: ' dB' },
    { key: 'addedLossFactor', label: 'Added damping loss', min: 0, max: 0.18, step: 0.005, value: 0.06 },
    { key: 'isolationFrequency', label: 'Isolation frequency', min: 30, max: 300, step: 5, value: 120, unit: ' Hz' }
  ], 'Each treatment acts on a different mechanism. Reduction per mass is a screening axis—not permission to ignore bandwidth, thermal, structural, or integration constraints.', (svg, input) => {
    const state = mitigationTradeState(input), maxMass = Math.max(...state.options.map(o => o.massFraction), 0.01), maxReduction = Math.max(...state.options.map(o => o.reductionDb), input.requiredReductionDb);
    const points = state.options.map((option, index) => { const x = 100 + 680 * option.massFraction / maxMass, y = 350 - 250 * option.reductionDb / maxReduction; return `<circle cx="${x}" cy="${y}" r="${option === state.recommended ? 15 : 10}" fill="${option.targetMet ? C.green : C.rust}"/><text x="${x + 13}" y="${y - 10}" font-size="11" fill="${C.ink}">${esc(option.name)}</text>`; }).join('');
    const targetY = 350 - 250 * input.requiredReductionDb / maxReduction;
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Mitigation reduction versus added mass')}${axes({ x: 100, y: 70, w: 680, h: 280 }, 'added mass fraction', 'predicted reduction (dB)')}<line x1="100" y1="${targetY}" x2="780" y2="${targetY}" stroke="${C.rust}" stroke-dasharray="7 5"/>${points}<text x="820" y="100" font-size="14" font-weight="700" fill="${C.ink}">Screening choice</text><text x="820" y="130" font-size="13" fill="${C.teal}">${esc(state.recommended.name)}</text>`;
  });
}

function mountJoint(root) {
  return shell(root, [
    { key: 'amplitudeMm', label: 'Response amplitude', min: 0.05, max: 2.5, step: 0.05, value: 0.7, unit: ' mm' },
    { key: 'cubicRatio', label: 'Cubic stiffness ratio', min: -0.6, max: 1.5, step: 0.05, value: 0.45 },
    { key: 'frictionForce', label: 'Friction force', min: 0, max: 60, step: 1, value: 16, unit: ' N' },
    { key: 'gapMm', label: 'Contact gap', min: 0.2, max: 2.5, step: 0.05, value: 1.2, unit: ' mm' }
  ], 'Amplitude changes the effective spring, friction loss, and contact state. Modal properties identified at low level may not survive qualification amplitude.', (svg, input) => {
    const state = nonlinearJointState(input), box = { x: 70, y: 65, w: 590, h: 285 }, path = chartPath(state.amplitudesMm, state.backbone, box);
    const markerX = box.x + input.amplitudeMm / Math.max(...state.amplitudesMm) * box.w;
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Amplitude-dependent resonance backbone')}${axes(box, 'amplitude (mm)', 'effective frequency (Hz)')}<path d="${path}" fill="none" stroke="${C.teal}" stroke-width="5"/><line x1="${markerX}" y1="${box.y}" x2="${markerX}" y2="${box.y + box.h}" stroke="${C.rust}" stroke-dasharray="7 5"/><text x="715" y="95" font-size="14" font-weight="700" fill="${C.ink}">${esc(state.regime)}</text><text x="715" y="137" font-size="13" fill="${C.teal}">f = ${fmt(state.effectiveFrequency, 1)} Hz</text><text x="715" y="170" font-size="13" fill="${C.rust}">shift = ${fmt(state.frequencyShift, 1)}%</text><text x="715" y="203" font-size="13" fill="${C.ink}">ζeq = ${fmt(state.equivalentDamping, 3)}</text>`;
  });
}

function mountCavity(root) {
  return shell(root, [
    { key: 'frequency', label: 'Excitation frequency', min: 60, max: 900, step: 5, value: 315, unit: ' Hz' },
    { key: 'receiverX', label: 'Payload axial position', min: 0, max: 1, step: 0.01, value: 0.72, unit: ' L' },
    { key: 'sourceX', label: 'Source axial position', min: 0, max: 1, step: 0.01, value: 0.18, unit: ' L' },
    { key: 't60', label: 'Reverberation time', min: 0.2, max: 5, step: 0.1, value: 2.4, unit: ' s' }
  ], 'Sparse cavity modes create hot and cold locations. Diffuse-field averages become credible only after modal population and overlap grow.', (svg, input) => {
    const state = fairingCavityState(input), nx = state.nearest.nx, samples = Array.from({ length: 180 }, (_, index) => index / 179), pressure = samples.map(x => Math.cos(nx * Math.PI * x));
    const field = samples.slice(0, -1).map((x, index) => `<rect x="${65 + 620 * x}" y="115" width="4" height="180" fill="${pressure[index] >= 0 ? C.teal : C.rust}" opacity="${0.22 + 0.72 * Math.abs(pressure[index])}"/>`).join('');
    const payloadX = 65 + 620 * input.receiverX, sourceX = 65 + 620 * input.sourceX;
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Payload location inside the nearest axial cavity pattern')}<rect x="65" y="115" width="620" height="180" rx="90" fill="${C.pale}"/>${field}<line x1="${sourceX}" y1="85" x2="${sourceX}" y2="325" stroke="${C.ink}" stroke-width="4"/><circle cx="${payloadX}" cy="205" r="16" fill="${C.paper}" stroke="${C.ink}" stroke-width="4"/><text x="725" y="110" font-size="14" font-weight="700" fill="${C.ink}">Mode ${esc(state.nearest.id)}</text><text x="725" y="145" font-size="13" fill="${C.ink}">${fmt(state.nearest.frequency, 1)} Hz</text><text x="725" y="185" font-size="13" fill="${C.teal}">${fmt(state.modesPerBand, 1)} modes / ⅓ octave</text><text x="725" y="225" font-size="13" fill="${C.rust}">${esc(state.regime)}</text><text x="65" y="335" font-size="11" fill="${C.muted}">Black line: source · circle: payload</text>`;
  });
}

function mountUncertainty(root) {
  return shell(root, [
    { key: 'frequencyCov', label: 'Frequency COV', min: 0, max: 0.2, step: 0.005, value: 0.04 },
    { key: 'qCov', label: 'Q COV', min: 0, max: 0.8, step: 0.01, value: 0.25 },
    { key: 'psdCov', label: 'PSD COV', min: 0, max: 0.8, step: 0.01, value: 0.2 },
    { key: 'trials', label: 'Monte Carlo trials', min: 200, max: 3000, step: 100, value: 1600 }
  ], 'A nominal result is one point. The upper tail and sensitivity ranking show which uncertainty can reverse a clearance, margin, or qualification decision.', (svg, input) => {
    const state = uncertaintySensitivityState(input), max = Math.max(...state.histogram.map(bin => bin.count), 1), width = 560 / state.histogram.length;
    const bars = state.histogram.map((bin, index) => `<rect x="${70 + index * width}" y="${350 - 250 * bin.count / max}" width="${Math.max(1, width - 1)}" height="${250 * bin.count / max}" fill="${C.teal}"/>`).join('');
    const range = state.histogram.at(-1).high - state.histogram[0].low, p95x = 70 + 560 * (state.p95 - state.histogram[0].low) / Math.max(range, 1e-12);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Response distribution and decision tail')}<path d="M70 80V350H630" fill="none" stroke="${C.muted}"/>${bars}<line x1="${p95x}" y1="75" x2="${p95x}" y2="350" stroke="${C.rust}" stroke-width="4" stroke-dasharray="7 5"/><text x="680" y="100" font-size="14" fill="${C.ink}">P50 ${fmt(state.p50, 2)} g</text><text x="680" y="138" font-size="14" fill="${C.rust}">P95 ${fmt(state.p95, 2)} g</text><text x="680" y="178" font-size="13" fill="${C.teal}">Dominant: ${esc(state.sensitivities[0].name)}</text><text x="680" y="215" font-size="12" fill="${C.muted}">COV ${fmt(state.coefficientOfVariation, 3)}</text>`;
  });
}

function mountMiles(root) {
  return shell(root, [
    { key: 'naturalFrequency', label: 'Natural frequency', min: 30, max: 600, step: 5, value: 100, unit: ' Hz' },
    { key: 'q', label: 'Quality factor Q', min: 2, max: 40, step: 0.5, value: 10 },
    { key: 'psdAtResonance', label: 'PSD at resonance', min: 0.002, max: 0.1, step: 0.002, value: 0.04, unit: ' g²/Hz' },
    { key: 'slopeDbPerOctave', label: 'Local PSD slope', min: -12, max: 12, step: 0.5, value: 0, unit: ' dB/oct' }
  ], 'Miles equation is the area under a narrow resonant response when the input PSD is locally flat. Tilt the PSD to see that assumption become visible.', (svg, input) => {
    const state = milesValidityState(input), box = { x: 70, y: 65, w: 590, h: 285 }, inputPath = chartPath(state.frequencies, state.inputPsd, box, true, true), responsePath = chartPath(state.frequencies, state.responsePsd, box, true, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Miles approximation versus numerical VRS integration')}${axes(box, 'frequency (Hz, log)', 'PSD (log)')}<path d="${inputPath}" fill="none" stroke="${C.grid}" stroke-width="4"/><path d="${responsePath}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="710" y="95" font-size="14" fill="${C.ink}">Miles ${fmt(state.milesRms, 2)} g RMS</text><text x="710" y="135" font-size="14" fill="${C.teal}">Numerical ${fmt(state.numericalRms, 2)} g RMS</text><text x="710" y="175" font-size="14" fill="${Math.abs(state.error) < 5 ? C.green : C.rust}">Error ${fmt(state.error, 1)}%</text><text x="710" y="225" font-size="12" fill="${C.muted}">${esc(state.regime)}</text>`;
  });
}

function mountExtreme(root) {
  return shell(root, [
    { key: 'rms', label: 'Oscillator RMS response', min: 0.5, max: 30, step: 0.5, value: 8, unit: ' g' },
    { key: 'duration', label: 'Record duration', min: 1, max: 600, step: 1, value: 60, unit: ' s' },
    { key: 'bandwidth', label: 'Response bandwidth', min: 0.5, max: 80, step: 0.5, value: 12, unit: ' Hz' },
    { key: 'exceedanceProbability', label: 'Exceedance probability', min: 0.001, max: 0.1, step: 0.001, value: 0.01 }
  ], 'Extreme response grows with RMS and with the number of statistically independent peak opportunities. It is a probability model, not a deterministic time history.', (svg, input) => {
    const state = extremeResponseState(input), box = { x: 70, y: 65, w: 590, h: 285 }, path = chartPath(state.durations, state.durationExtremes, box, true, false);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Extreme response versus exposure duration')}${axes(box, 'duration (s, log)', 'estimated extreme (g)')}<path d="${path}" fill="none" stroke="${C.rust}" stroke-width="5"/><line x1="70" y1="${350 - 285 * input.rms / Math.max(...state.durationExtremes)}" x2="660" y2="${350 - 285 * input.rms / Math.max(...state.durationExtremes)}" stroke="${C.teal}" stroke-dasharray="7 5"/><text x="710" y="95" font-size="14" fill="${C.teal}">RMS ${fmt(state.rms, 2)} g</text><text x="710" y="135" font-size="15" font-weight="700" fill="${C.rust}">Extreme ${fmt(state.extreme, 2)} g</text><text x="710" y="175" font-size="13" fill="${C.ink}">Crest factor ${fmt(state.crestFactor, 2)}</text><text x="710" y="212" font-size="12" fill="${C.muted}">${Math.round(state.opportunities).toLocaleString()} peak opportunities</text>`;
  });
}

const mounts = {
  'model-test-correlation-lab': mountCorrelation,
  'branching-sea-network': mountSea,
  'transfer-path-workbench': mountTpa,
  'requirements-margin-flow': mountRequirements,
  'mitigation-trade-space': mountTrade,
  'nonlinear-joint-behavior': mountJoint,
  'fairing-cavity-field': mountCavity,
  'uncertainty-sensitivity-lab': mountUncertainty,
  'miles-validity': mountMiles,
  'extreme-response-spectrum': mountExtreme
};

export function mountWorkflowExpansionDemo(root, id) {
  return mounts[id] ? mounts[id](root) : null;
}
