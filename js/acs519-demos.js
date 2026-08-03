import {
  SEA_MEDIA,
  doubleWindowSeaState,
  modalRadiationState,
  drivenRadiationState,
  dynamicStressEnvironmentState,
  pistonRadiationState,
  shellAcousticsState,
  feBePlannerState,
  panelTransmissionState,
  orthotropicPanelState,
  lossFactorBudgetState,
  modalTestState,
  seaValidityState,
  seaNetworkState,
  doublePanelSeaState,
  khiePatchState,
  launchAcousticSourceState,
  pipeNoiseState,
  qualificationTestState,
  soundIntensityProbeState,
  waveMatchingState,
  wetTankDynamicsState
} from './acs519-physics.js';

const COLORS = Object.freeze({ ink: '#172027', teal: '#1e6077', dark: '#164453', rust: '#b96d37', muted: '#657176', grid: '#ada497', paper: '#faf8f2', wash: '#e7e2d8', pale: '#dce9ec', green: '#376e56' });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fmt = (value, digits = 3) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (Math.abs(number) >= 10000 || (Math.abs(number) > 0 && Math.abs(number) < 0.001)) return number.toExponential(2);
  return number.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '');
};
const linePath = (values, x, y) => values.map((value, index) => `${index ? 'L' : 'M'}${x(value, index).toFixed(2)},${y(value, index).toFixed(2)}`).join(' ');
const polarPath = (values, cx, cy, radius) => {
  const maximum = Math.max(...values.map(value => Math.abs(value)), 1e-12);
  const upper = values.map((value, index) => {
    const theta = index / Math.max(1, values.length - 1) * Math.PI / 2;
    const r = radius * Math.abs(value) / maximum;
    return [cx + r * Math.cos(theta), cy - r * Math.sin(theta)];
  });
  const points = [...upper.map(([x, y]) => [x, y]), ...upper.slice(1).reverse().map(([x, y]) => [2 * cx - x, y]), ...upper.slice(1).map(([x, y]) => [2 * cx - x, 2 * cy - y]), ...upper.slice(1).reverse().map(([x, y]) => [x, 2 * cy - y])];
  return points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + 'Z';
};

function rangeControl({ key, label, min, max, step, value, unit = '' }) {
  return `<div class="demo-control"><label for="acs-${key}">${esc(label)} <output id="acs-out-${key}">${esc(value)}${esc(unit)}</output></label><input id="acs-${key}" data-acs-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
}

function demoShell(root, controls, caption, draw) {
  root.innerHTML = `<div class="demo-controls">${controls.map(rangeControl).join('')}</div><div class="demo-canvas-wrap"><svg data-acs-svg viewBox="0 0 1000 440" role="img" aria-label="Interactive structural-acoustics visualization"></svg></div><div class="demo-caption">${caption}</div>`;
  const inputs = Object.fromEntries([...root.querySelectorAll('[data-acs-key]')].map(element => [element.dataset.acsKey, element]));
  const values = () => Object.fromEntries(Object.entries(inputs).map(([key, element]) => [key, Number(element.value)]));
  const render = () => {
    const current = values();
    controls.forEach(control => {
      const output = root.querySelector(`#acs-out-${control.key}`);
      if (output) output.textContent = `${fmt(current[control.key], control.step < 0.01 ? 3 : control.step < 1 ? 2 : 0)}${control.unit ?? ''}`;
    });
    draw(root.querySelector('[data-acs-svg]'), current);
  };
  Object.values(inputs).forEach(input => input.addEventListener('input', render));
  render();
  return () => {};
}

function axes({ x = 60, y = 40, width = 400, height = 315, xLabel = '', yLabel = '' }) {
  return `<line x1="${x}" y1="${y + height}" x2="${x + width}" y2="${y + height}" stroke="${COLORS.muted}"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y + height}" stroke="${COLORS.muted}"/><text x="${x + width / 2}" y="${y + height + 37}" text-anchor="middle" font-size="12" fill="${COLORS.muted}">${esc(xLabel)}</text><text x="${x - 42}" y="${y + height / 2}" transform="rotate(-90 ${x - 42} ${y + height / 2})" text-anchor="middle" font-size="12" fill="${COLORS.muted}">${esc(yLabel)}</text>`;
}

function previewFrame(inner) {
  return `<svg viewBox="0 0 520 180" aria-hidden="true"><rect width="520" height="180" fill="${COLORS.wash}"/>${inner}</svg>`;
}

const previewMap = {
  'modal-radiation-patterns': previewFrame('<rect x="28" y="35" width="190" height="110" fill="#164453"/><path d="M28 90 Q76 35 123 90 T218 90 M28 90 Q76 145 123 90 T218 90" fill="none" stroke="#dce9ec" stroke-width="6"/><path d="M225 90 C285 25 366 25 488 90 M225 90 C285 155 366 155 488 90" fill="none" stroke="#b96d37" stroke-width="4"/>'),
  'piston-fluid-loading': previewFrame('<ellipse cx="145" cy="90" rx="92" ry="40" fill="#164453"/><ellipse cx="145" cy="90" rx="43" ry="18" fill="#dce9ec"/><path d="M220 55 Q320 15 480 64 M220 90 Q335 55 480 90 M220 125 Q320 165 480 116" fill="none" stroke="#1e6077" stroke-width="4"/>'),
  'shell-wave-map': previewFrame('<ellipse cx="145" cy="47" rx="96" ry="30" fill="#dce9ec" stroke="#1e6077" stroke-width="4"/><path d="M49 47 V132 M241 47 V132" stroke="#1e6077" stroke-width="4"/><ellipse cx="145" cy="132" rx="96" ry="30" fill="#164453"/><path d="M70 72 C105 42 135 102 170 72 S225 102 240 72 M70 108 C105 78 135 138 170 108 S225 138 240 108" fill="none" stroke="#b96d37" stroke-width="4"/><path d="M295 145 C340 130 375 45 480 30" fill="none" stroke="#1e6077" stroke-width="5"/>'),
  'fe-be-model-trust': previewFrame('<g stroke="#1e6077" fill="none"><path d="M30 32 H230 V148 H30Z"/><path d="M30 61 H230 M30 90 H230 M30 119 H230 M80 32 V148 M130 32 V148 M180 32 V148"/></g><g stroke="#b96d37" fill="none"><path d="M286 30 H488 V150 H286Z"/><path d="M286 50 H488 M286 70 H488 M286 90 H488 M286 110 H488 M286 130 H488 M320 30 V150 M354 30 V150 M388 30 V150 M422 30 V150 M456 30 V150"/></g>'),
  'panel-tl-angle': previewFrame('<line x1="30" y1="145" x2="490" y2="145" stroke="#657176"/><path d="M35 135 C130 105 210 60 285 92 C335 112 390 45 485 30" fill="none" stroke="#1e6077" stroke-width="5"/><line x1="285" y1="28" x2="285" y2="145" stroke="#b96d37" stroke-width="3" stroke-dasharray="6 5"/><path d="M55 80 L210 112 M190 94 L210 112 L186 118" fill="none" stroke="#172027" stroke-width="4"/>'),
  'orthotropic-coincidence': previewFrame('<ellipse cx="160" cy="90" rx="112" ry="48" fill="none" stroke="#ada497"/><path d="M160 20 C205 42 238 68 270 90 C238 112 205 138 160 160 C115 138 82 112 50 90 C82 68 115 42 160 20Z" fill="#dce9ec" stroke="#1e6077" stroke-width="5"/><path d="M325 90 H485 M405 22 V158" stroke="#657176"/><path d="M335 130 C370 122 400 38 475 52" fill="none" stroke="#b96d37" stroke-width="4"/>'),
  'loss-factor-paths': previewFrame('<rect x="35" y="112" width="55" height="35" fill="#1e6077"/><rect x="110" y="84" width="55" height="63" fill="#164453"/><rect x="185" y="42" width="55" height="105" fill="#b96d37"/><rect x="260" y="122" width="55" height="25" fill="#376e56"/><rect x="335" y="100" width="55" height="47" fill="#657176"/><path d="M420 120 C438 25 468 25 488 120" fill="none" stroke="#172027" stroke-width="4"/>'),
  'modal-test-grid': previewFrame('<g transform="translate(28 25)"><rect width="250" height="130" fill="#164453"/><path d="M0 43 H250 M0 86 H250 M50 0 V130 M100 0 V130 M150 0 V130 M200 0 V130" stroke="#dce9ec" stroke-width="3"/><circle cx="61" cy="42" r="10" fill="#b96d37"/><circle cx="184" cy="87" r="10" fill="#faf8f2"/></g><path d="M330 135 C360 125 380 35 410 48 C440 60 455 115 490 106" fill="none" stroke="#1e6077" stroke-width="5"/>'),
  'sea-validity-map': previewFrame('<rect x="35" y="35" width="440" height="112" fill="#b96d37" opacity=".28"/><rect x="165" y="35" width="310" height="112" fill="#dce9ec"/><rect x="295" y="35" width="180" height="112" fill="#376e56" opacity=".55"/><path d="M35 115 C155 105 250 72 475 46" fill="none" stroke="#172027" stroke-width="4"/><circle cx="300" cy="72" r="9" fill="#1e6077"/>'),
  'double-panel-energy-paths': previewFrame('<rect x="25" y="55" width="75" height="80" fill="#1e6077"/><rect x="135" y="42" width="55" height="106" fill="#164453"/><rect x="225" y="62" width="70" height="66" fill="#b96d37"/><rect x="330" y="42" width="55" height="106" fill="#164453"/><rect x="420" y="55" width="75" height="80" fill="#1e6077"/><path d="M100 75 H132 M190 75 H222 M295 75 H327 M385 75 H417" stroke="#dce9ec" stroke-width="9"/><path d="M62 32 C190 5 340 5 458 32" fill="none" stroke="#b96d37" stroke-width="4"/>'),
  'khie-surface-contributions': previewFrame('<path d="M40 140 Q145 28 260 140" fill="#164453"/><g stroke="#dce9ec" stroke-width="4"><path d="M80 118 L62 71"/><path d="M130 78 L120 31"/><path d="M185 80 L197 34"/><path d="M230 117 L252 73"/></g><circle cx="430" cy="60" r="10" fill="#b96d37"/><path d="M80 118 L430 60 M130 78 L430 60 M185 80 L430 60 M230 117 L430 60" stroke="#1e6077" stroke-width="2" opacity=".65"/>'),
  'pipe-noise-pathways': previewFrame('<rect x="25" y="55" width="470" height="72" rx="36" fill="#164453"/><path d="M40 91 H474 M430 76 L474 91 L430 106" fill="none" stroke="#dce9ec" stroke-width="7"/><path d="M25 55 C65 22 105 88 145 55 S225 22 265 55 S345 88 385 55 S455 22 495 55" fill="none" stroke="#b96d37" stroke-width="5"/>'),
  'frequency-wavenumber-atlas': previewFrame('<path d="M38 148 H490 M38 148 V24" stroke="#657176"/><path d="M45 138 C125 128 210 105 300 72 S420 38 485 30" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M45 145 L485 45" fill="none" stroke="#b96d37" stroke-width="4"/><path d="M45 142 L485 82" fill="none" stroke="#164453" stroke-width="4"/><circle cx="315" cy="69" r="8" fill="#172027"/>'),
  'force-to-sound-power': previewFrame('<rect x="26" y="40" width="220" height="110" fill="#164453"/><circle cx="95" cy="88" r="10" fill="#b96d37"/><path d="M95 20 V78 M82 42 L95 20 L108 42" fill="none" stroke="#b96d37" stroke-width="5"/><path d="M255 95 H335 M315 80 L335 95 L315 110" fill="none" stroke="#172027" stroke-width="5"/><path d="M350 125 C380 112 400 42 430 55 C458 67 470 112 495 100" fill="none" stroke="#1e6077" stroke-width="5"/>'),
  'intensity-probe-lab': previewFrame('<path d="M35 90 C85 45 135 135 185 90 S285 45 335 90 S435 135 495 90" fill="none" stroke="#1e6077" stroke-width="5"/><circle cx="210" cy="90" r="13" fill="#164453"/><circle cx="270" cy="90" r="13" fill="#164453"/><path d="M210 125 H270" stroke="#b96d37" stroke-width="5"/><path d="M305 35 H455 M430 20 L455 35 L430 50" fill="none" stroke="#b96d37" stroke-width="6"/>'),
  'stress-environment-map': previewFrame('<rect x="28" y="35" width="205" height="112" fill="#164453"/><path d="M28 91 C62 35 96 147 130 91 S198 35 233 91" fill="none" stroke="#dce9ec" stroke-width="12"/><rect x="285" y="35" width="205" height="112" fill="#faf8f2" stroke="#657176"/><rect x="303" y="48" width="25" height="86" fill="#b96d37"/><rect x="447" y="48" width="25" height="86" fill="#b96d37"/><path d="M328 91 C365 78 410 78 447 91" fill="none" stroke="#1e6077" stroke-width="5"/>'),
  'launch-source-map': previewFrame('<path d="M35 128 H482" stroke="#657176"/><path d="M55 128 C110 40 205 50 300 112" fill="none" stroke="#b96d37" stroke-width="18" opacity=".45"/><g fill="#164453"><circle cx="72" cy="111" r="8"/><circle cx="112" cy="82" r="11"/><circle cx="160" cy="65" r="10"/><circle cx="212" cy="74" r="8"/><circle cx="270" cy="103" r="6"/></g><path d="M350 110 L440 46" stroke="#1e6077" stroke-width="4"/><circle cx="440" cy="46" r="10" fill="#b96d37"/>'),
  'wet-tank-coupling': previewFrame('<ellipse cx="130" cy="35" rx="70" ry="20" fill="#dce9ec" stroke="#164453"/><path d="M60 35 V145 M200 35 V145" stroke="#164453" stroke-width="4"/><ellipse cx="130" cy="145" rx="70" ry="20" fill="#1e6077"/><path d="M61 89 Q130 110 199 89 V145 Q130 165 61 145Z" fill="#1e6077" opacity=".7"/><path d="M255 135 L315 78 L375 118 L435 42 L485 91" fill="none" stroke="#b96d37" stroke-width="5"/>'),
  'qualification-notching': previewFrame('<path d="M35 140 H490 M35 140 V28" stroke="#657176"/><path d="M42 115 L130 86 H435 L485 105" fill="none" stroke="#ada497" stroke-width="5"/><path d="M42 94 L130 65 H235 C260 65 260 118 285 118 C310 118 310 65 335 65 H435 L485 84" fill="none" stroke="#1e6077" stroke-width="6"/><line x1="260" y1="32" x2="260" y2="138" stroke="#b96d37" stroke-width="3" stroke-dasharray="6 5"/>')
};

export const acs519SupportedDemoIds = Object.freeze(Object.keys(previewMap));
export function acs519PreviewSvg(id) { return previewMap[id] || null; }

function mountModalRadiation(root) {
  return demoShell(root, [
    { key: 'modeX', label: 'Longitudinal mode m', min: 1, max: 7, step: 1, value: 3 },
    { key: 'modeY', label: 'Transverse mode n', min: 1, max: 7, step: 1, value: 2 },
    { key: 'frequency', label: 'Frequency', min: 60, max: 1200, step: 10, value: 350, unit: ' Hz' }
  ], 'Modal velocity is a signed spatial field. Change parity and frequency to see how cancellation, coincidence, and directivity—not RMS motion alone—control sound power.', (svg, input) => {
    const state = modalRadiationState({ length: 1.8, width: 1.1, ...input });
    const cells = [];
    for (let iy = 0; iy < 12; iy += 1) for (let ix = 0; ix < 20; ix += 1) {
      const value = Math.sin(state.modeX * Math.PI * (ix + 0.5) / 20) * Math.sin(state.modeY * Math.PI * (iy + 0.5) / 12);
      cells.push(`<rect x="${55 + ix * 19}" y="${70 + iy * 19}" width="19" height="19" fill="${value >= 0 ? COLORS.teal : COLORS.rust}" opacity="${0.2 + 0.75 * Math.abs(value)}"/>`);
    }
    const polar = polarPath(state.directivity, 735, 190, 145);
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><text x="55" y="40" font-size="15" font-weight="700" fill="${COLORS.ink}">Signed mode shape (${state.modeX}, ${state.modeY})</text>${cells.join('')}<rect x="55" y="70" width="380" height="228" fill="none" stroke="${COLORS.ink}"/><path d="${polar}" fill="${COLORS.pale}" stroke="${COLORS.teal}" stroke-width="4"/><circle cx="735" cy="190" r="4" fill="${COLORS.ink}"/><text x="735" y="374" text-anchor="middle" font-size="14" fill="${COLORS.ink}">σ = ${fmt(state.sigma)} · k₀/kₘₙ = ${fmt(state.gamma)} · ${state.parity}</text><text x="55" y="342" font-size="14" fill="${COLORS.ink}">${esc(state.regime)}</text><text x="55" y="371" font-size="12" fill="${COLORS.muted}">Opposite colors radiate out of phase; the far field sums them coherently.</text>`;
  });
}

function mountPiston(root) {
  return demoShell(root, [
    { key: 'radius', label: 'Piston radius', min: 0.02, max: 0.45, step: 0.01, value: 0.12, unit: ' m' },
    { key: 'frequency', label: 'Frequency', min: 25, max: 4000, step: 25, value: 800, unit: ' Hz' }
  ], 'The same piston moves from reactive added-mass loading to resistive radiation as ka increases. The beam narrows at the same time.', (svg, input) => {
    const state = pistonRadiationState(input);
    const polar = polarPath(state.directivity, 280, 215, 160);
    const sx = ka => 555 + (Math.log10(ka) - Math.log10(0.02)) / 3 * 380;
    const sy = value => 355 - clamp(value, 0, 1.2) / 1.2 * 285;
    const resistancePath = linePath(state.resistanceCurve, (_, index) => sx(state.kaCurve[index]), value => sy(value));
    const reactancePath = linePath(state.reactanceCurve, (_, index) => sx(state.kaCurve[index]), value => sy(value));
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><path d="${polar}" fill="${COLORS.pale}" stroke="${COLORS.teal}" stroke-width="4"/><circle cx="280" cy="215" r="10" fill="${COLORS.rust}"/><text x="280" y="407" text-anchor="middle" font-size="14" fill="${COLORS.ink}">ka = ${fmt(state.ka)} · ${esc(state.regime)}</text>${axes({ x: 555, y: 45, width: 380, height: 310, xLabel: 'ka (log)', yLabel: 'normalized impedance' })}<path d="${resistancePath}" fill="none" stroke="${COLORS.teal}" stroke-width="4"/><path d="${reactancePath}" fill="none" stroke="${COLORS.rust}" stroke-width="4"/><circle cx="${sx(state.ka)}" cy="${sy(state.resistance)}" r="7" fill="${COLORS.ink}"/><text x="770" y="70" font-size="12" fill="${COLORS.teal}">resistance R</text><text x="770" y="92" font-size="12" fill="${COLORS.rust}">reactance X</text>`;
  });
}

function mountShell(root) {
  return demoShell(root, [
    { key: 'circumferentialOrder', label: 'Circumferential order n', min: 0, max: 12, step: 1, value: 2 },
    { key: 'thicknessMm', label: 'Wall thickness', min: 1, max: 14, step: 0.5, value: 4, unit: ' mm' }
  ], 'Curvature couples membrane and bending behavior. Compare the selected lobar mode with ring frequency, plate coincidence, and the first internal acoustic cut-on.', (svg, input) => {
    const state = shellAcousticsState({ thickness: input.thicknessMm / 1000, circumferentialOrder: input.circumferentialOrder });
    const n = state.circumferentialOrder;
    const section = Array.from({ length: 181 }, (_, index) => {
      const angle = index / 180 * 2 * Math.PI;
      const radius = 112 * (1 + 0.12 * Math.cos(n * angle));
      return `${index ? 'L' : 'M'}${(260 + radius * Math.cos(angle)).toFixed(1)},${(220 + radius * Math.sin(angle)).toFixed(1)}`;
    }).join(' ') + 'Z';
    const maximum = Math.max(...state.modeCurve, state.ringFrequency, state.criticalFrequency, state.firstAcousticCuton);
    const sx = value => 520 + value / 16 * 420;
    const sy = value => 365 - value / maximum * 305;
    const curve = linePath(state.modeCurve, (_, index) => sx(state.nValues[index]), value => sy(value));
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><circle cx="260" cy="220" r="112" fill="none" stroke="${COLORS.grid}" stroke-dasharray="6 5"/><path d="${section}" fill="${COLORS.pale}" stroke="${COLORS.teal}" stroke-width="5"/><text x="260" y="48" text-anchor="middle" font-size="15" font-weight="700" fill="${COLORS.ink}">Lobar cross-section, n = ${n}</text>${axes({ x: 520, y: 45, width: 420, height: 320, xLabel: 'circumferential order n', yLabel: 'frequency' })}<path d="${curve}" fill="none" stroke="${COLORS.teal}" stroke-width="4"/><line x1="520" x2="940" y1="${sy(state.ringFrequency)}" y2="${sy(state.ringFrequency)}" stroke="${COLORS.rust}" stroke-dasharray="7 5"/><line x1="520" x2="940" y1="${sy(state.firstAcousticCuton)}" y2="${sy(state.firstAcousticCuton)}" stroke="${COLORS.green}" stroke-dasharray="4 5"/><circle cx="${sx(n)}" cy="${sy(state.modeFrequency)}" r="7" fill="${COLORS.ink}"/><text x="540" y="67" font-size="11" fill="${COLORS.rust}">ring ${fmt(state.ringFrequency, 0)} Hz</text><text x="540" y="87" font-size="11" fill="${COLORS.green}">duct cut-on ${fmt(state.firstAcousticCuton, 0)} Hz</text>`;
  });
}

function mountFeBe(root) {
  return demoShell(root, [
    { key: 'maximumFrequency', label: 'Maximum frequency', min: 250, max: 4000, step: 50, value: 2000, unit: ' Hz' },
    { key: 'structuralElementsPerWave', label: 'Structural elements / wave', min: 4, max: 16, step: 1, value: 10 },
    { key: 'acousticElementsPerWave', label: 'Acoustic elements / wave', min: 4, max: 14, step: 1, value: 8 }
  ], 'A coupled model is only as trustworthy as its shortest resolved wavelength. Increasing frequency rapidly expands FE and especially dense BE cost.', (svg, input) => {
    const state = feBePlannerState(input);
    const structuralCols = clamp(Math.round(3.6 / state.structuralElementSize / 6), 4, 28);
    const acousticCols = clamp(Math.round(3.6 / state.acousticElementSize / 6), 4, 28);
    const grid = (x, y, width, height, cols, color) => {
      const rows = Math.max(3, Math.round(cols * height / width));
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${color}"/>${Array.from({ length: cols - 1 }, (_, index) => `<line x1="${x + width * (index + 1) / cols}" x2="${x + width * (index + 1) / cols}" y1="${y}" y2="${y + height}" stroke="${color}" opacity=".6"/>`).join('')}${Array.from({ length: rows - 1 }, (_, index) => `<line x1="${x}" x2="${x + width}" y1="${y + height * (index + 1) / rows}" y2="${y + height * (index + 1) / rows}" stroke="${color}" opacity=".6"/>`).join('')}`;
    };
    const beCost = Math.log10(Math.max(10, state.beSolveIndex));
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><text x="250" y="47" text-anchor="middle" font-size="15" font-weight="700" fill="${COLORS.ink}">Structural FE</text>${grid(55, 75, 390, 240, structuralCols, COLORS.teal)}<text x="250" y="345" text-anchor="middle" font-size="13" fill="${COLORS.ink}">h = ${fmt(state.structuralElementSize * 1000, 1)} mm · ${state.structuralElements.toLocaleString()} elements</text><text x="750" y="47" text-anchor="middle" font-size="15" font-weight="700" fill="${COLORS.ink}">Acoustic boundary element model</text>${grid(555, 75, 390, 240, acousticCols, COLORS.rust)}<text x="750" y="345" text-anchor="middle" font-size="13" fill="${COLORS.ink}">h = ${fmt(state.acousticElementSize * 1000, 1)} mm · ${state.acousticElements.toLocaleString()} elements</text><text x="500" y="399" text-anchor="middle" font-size="13" fill="${COLORS.muted}">${esc(state.regime)} · dense-solve cost index ≈ 10^${fmt(beCost, 1)}</text>`;
  });
}

function mountPanelTl(root) {
  return demoShell(root, [
    { key: 'incidenceDegrees', label: 'Incidence angle', min: 0, max: 78, step: 1, value: 45, unit: '°' },
    { key: 'lossFactor', label: 'Structural loss factor', min: 0.002, max: 0.12, step: 0.002, value: 0.02 },
    { key: 'frequency', label: 'Frequency', min: 100, max: 8000, step: 50, value: 1000, unit: ' Hz' }
  ], 'Oblique incidence shifts the coincidence condition and diffuse transmission averages energy, not decibels. Damping mainly fills in the coincidence dip.', (svg, input) => {
    const state = panelTransmissionState(input);
    const minF = state.frequencies[0], maxF = state.frequencies.at(-1), maxTl = Math.max(...state.diffuseCurve, 40);
    const sx = frequency => 515 + (Math.log10(frequency) - Math.log10(minF)) / (Math.log10(maxF) - Math.log10(minF)) * 420;
    const sy = tl => 365 - clamp(tl, 0, maxTl) / maxTl * 310;
    const curve = linePath(state.diffuseCurve, (_, index) => sx(state.frequencies[index]), value => sy(value));
    const angle = input.incidenceDegrees * Math.PI / 180;
    const x2 = 265 + 160 * Math.sin(angle), y2 = 230 - 160 * Math.cos(angle);
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><line x1="75" y1="230" x2="445" y2="230" stroke="${COLORS.dark}" stroke-width="13"/><line x1="265" y1="60" x2="265" y2="365" stroke="${COLORS.grid}" stroke-dasharray="6 5"/><path d="M${x2} ${y2} L265 230" stroke="${COLORS.rust}" stroke-width="6"/><path d="M248 205 L265 230 L278 201" fill="none" stroke="${COLORS.rust}" stroke-width="5"/><path d="M265 230 L${265 + 120 * Math.sin(angle)} ${230 + 120 * Math.cos(angle)}" stroke="${COLORS.teal}" stroke-width="5"/><text x="260" y="405" text-anchor="middle" font-size="14" fill="${COLORS.ink}">TL(θ) ${fmt(state.tlAngle, 1)} dB · diffuse TL ${fmt(state.diffuseTl, 1)} dB</text>${axes({ x: 515, y: 45, width: 420, height: 320, xLabel: 'frequency (log)', yLabel: 'diffuse TL (dB)' })}<path d="${curve}" fill="none" stroke="${COLORS.teal}" stroke-width="4"/><line x1="${sx(state.criticalFrequency)}" x2="${sx(state.criticalFrequency)}" y1="45" y2="365" stroke="${COLORS.rust}" stroke-dasharray="7 5"/><circle cx="${sx(state.frequency)}" cy="${sy(state.diffuseTl)}" r="7" fill="${COLORS.ink}"/>`;
  });
}

function mountOrthotropic(root) {
  return demoShell(root, [
    { key: 'directionDegrees', label: 'Propagation direction', min: 0, max: 180, step: 1, value: 25, unit: '°' },
    { key: 'd22Scale', label: 'Weak-axis stiffness scale', min: 0.15, max: 1.2, step: 0.05, value: 0.4, unit: '×' },
    { key: 'frequency', label: 'Frequency', min: 100, max: 4000, step: 50, value: 1000, unit: ' Hz' }
  ], 'Orthotropic panels do not have one critical frequency. Material direction reshapes the flexural slowness surface and creates a directional coincidence band.', (svg, input) => {
    const state = orthotropicPanelState({ directionDegrees: input.directionDegrees, d22: 8500 * input.d22Scale, frequency: input.frequency });
    const cx = 280, cy = 215, max = Math.max(...state.stiffnessCurve);
    const points = state.directions.map((degree, index) => {
      const theta = degree * Math.PI / 180;
      const radius = 155 * Math.sqrt(state.stiffnessCurve[index] / max);
      return [cx + radius * Math.cos(theta), cy - radius * Math.sin(theta)];
    });
    const loop = [...points, ...points.slice(1, -1).reverse().map(([x, y]) => [2 * cx - x, 2 * cy - y])].map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + 'Z';
    const angle = state.directionDegrees * Math.PI / 180;
    const minFc = state.minimumCritical, maxFc = state.maximumCritical;
    const fx = frequency => 560 + (frequency - minFc * 0.6) / (maxFc * 1.4 - minFc * 0.6) * 360;
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><circle cx="${cx}" cy="${cy}" r="155" fill="none" stroke="${COLORS.grid}"/><path d="${loop}" fill="${COLORS.pale}" stroke="${COLORS.teal}" stroke-width="4"/><line x1="${cx}" y1="${cy}" x2="${cx + 170 * Math.cos(angle)}" y2="${cy - 170 * Math.sin(angle)}" stroke="${COLORS.rust}" stroke-width="5"/><text x="280" y="407" text-anchor="middle" font-size="13" fill="${COLORS.ink}">D(θ) = ${fmt(state.selectedRigidity, 0)} N·m · anisotropy ${fmt(state.anisotropyRatio, 1)}:1</text><text x="560" y="80" font-size="15" font-weight="700" fill="${COLORS.ink}">Directional coincidence window</text><rect x="${fx(minFc)}" y="150" width="${fx(maxFc) - fx(minFc)}" height="90" fill="${COLORS.pale}"/><line x1="560" x2="920" y1="195" y2="195" stroke="${COLORS.muted}"/><line x1="${fx(state.frequency)}" x2="${fx(state.frequency)}" y1="130" y2="260" stroke="${COLORS.rust}" stroke-width="5"/><text x="560" y="295" font-size="13" fill="${COLORS.ink}">${esc(state.regime)}</text><text x="560" y="325" font-size="12" fill="${COLORS.muted}">selected f<sub>c</sub> = ${fmt(state.selectedCriticalFrequency, 0)} Hz</text>`;
  });
}

function mountLossBudget(root) {
  return demoShell(root, [
    { key: 'internal', label: 'Material loss factor', min: 0, max: 0.08, step: 0.002, value: 0.012 },
    { key: 'radiation', label: 'Radiation loss factor', min: 0, max: 0.08, step: 0.002, value: 0.006 },
    { key: 'joint', label: 'Joint loss factor', min: 0, max: 0.08, step: 0.002, value: 0.004 }
  ], 'Loss factors add through power paths, but “damping” is not one material constant. Watch Q, bandwidth, and decay time respond to the allocation.', (svg, input) => {
    const state = lossFactorBudgetState({ ...input, frequency: 500 });
    const max = Math.max(...state.components, 0.01);
    const bars = state.components.map((value, index) => {
      const x = 70 + index * 105, height = value / max * 230;
      return `<rect x="${x}" y="${330 - height}" width="68" height="${height}" fill="${[COLORS.teal, COLORS.rust, COLORS.dark, COLORS.green, COLORS.muted][index]}"/><text x="${x + 34}" y="352" text-anchor="middle" font-size="11" fill="${COLORS.muted}">${state.labels[index]}</text><text x="${x + 34}" y="${315 - height}" text-anchor="middle" font-size="11" fill="${COLORS.ink}">${fmt(value, 3)}</text>`;
    }).join('');
    const peak = clamp(180 / Math.sqrt(state.qFactor), 12, 80);
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><text x="70" y="45" font-size="15" font-weight="700" fill="${COLORS.ink}">Loss-path budget</text>${bars}<line x1="625" y1="330" x2="940" y2="330" stroke="${COLORS.muted}"/><path d="M625 325 C720 320 748 ${220 - peak} 782 ${220 - peak} C818 ${220 - peak} 842 320 940 325" fill="none" stroke="${COLORS.teal}" stroke-width="5"/><line x1="782" y1="120" x2="782" y2="330" stroke="${COLORS.rust}" stroke-dasharray="6 5"/><text x="650" y="60" font-size="15" font-weight="700" fill="${COLORS.ink}">η<sub>total</sub> = ${fmt(state.total, 3)}</text><text x="650" y="92" font-size="13" fill="${COLORS.ink}">Q ≈ ${fmt(state.qFactor, 1)}</text><text x="650" y="118" font-size="13" fill="${COLORS.ink}">half-power bandwidth ≈ ${fmt(state.halfPowerBandwidth, 1)} Hz</text><text x="650" y="144" font-size="13" fill="${COLORS.ink}">T₆₀ ≈ ${fmt(state.t60, 2)} s</text>`;
  });
}

function mountModalTest(root) {
  return demoShell(root, [
    { key: 'modeX', label: 'Mode order m', min: 1, max: 6, step: 1, value: 3 },
    { key: 'modeY', label: 'Mode order n', min: 1, max: 6, step: 1, value: 2 },
    { key: 'driveX', label: 'Drive x / L', min: 0.02, max: 0.98, step: 0.01, value: 0.23 },
    { key: 'driveY', label: 'Drive y / W', min: 0.02, max: 0.98, step: 0.01, value: 0.31 }
  ], 'Moving the exciter onto a nodal line can make a real mode disappear from the FRF. The spatial grid must also resolve the target mode shape.', (svg, input) => {
    const state = modalTestState(input);
    const cells = [];
    for (let iy = 0; iy < 16; iy += 1) for (let ix = 0; ix < 24; ix += 1) {
      const value = Math.sin(state.modeX * Math.PI * (ix + 0.5) / 24) * Math.sin(state.modeY * Math.PI * (iy + 0.5) / 16);
      cells.push(`<rect x="${50 + ix * 20}" y="${55 + iy * 18}" width="20" height="18" fill="${value >= 0 ? COLORS.teal : COLORS.rust}" opacity="${0.16 + 0.78 * Math.abs(value)}"/>`);
    }
    const driveX = 50 + state.driveX * 480, driveY = 55 + state.driveY * 288;
    const responseX = 50 + state.responseX * 480, responseY = 55 + state.responseY * 288;
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/>${cells.join('')}<rect x="50" y="55" width="480" height="288" fill="none" stroke="${COLORS.ink}"/><circle cx="${driveX}" cy="${driveY}" r="11" fill="${COLORS.ink}" stroke="${COLORS.paper}" stroke-width="3"/><path d="M${driveX - 15} ${driveY - 22} L${driveX} ${driveY - 5} L${driveX + 15} ${driveY - 22}" fill="none" stroke="${COLORS.ink}" stroke-width="5"/><circle cx="${responseX}" cy="${responseY}" r="10" fill="${COLORS.paper}" stroke="${COLORS.ink}" stroke-width="4"/><text x="595" y="70" font-size="15" font-weight="700" fill="${COLORS.ink}">Test observability</text><text x="595" y="112" font-size="13" fill="${state.nodeRisk ? COLORS.rust : COLORS.green}">drive shape = ${fmt(state.driveShape)} · ${state.nodeRisk ? 'node risk' : 'good participation'}</text><text x="595" y="142" font-size="13" fill="${COLORS.ink}">minimum grid = ${state.minimumGridX} × ${state.minimumGridY}</text><text x="595" y="172" font-size="13" fill="${COLORS.ink}">f<sub>mn</sub> = ${fmt(state.naturalFrequency, 1)} Hz</text><text x="595" y="202" font-size="13" fill="${COLORS.ink}">modal bandwidth = ${fmt(state.modalBandwidth, 2)} Hz</text><text x="595" y="250" font-size="12" fill="${COLORS.muted}">Black marker: exciter</text><text x="595" y="276" font-size="12" fill="${COLORS.muted}">White marker: response sensor</text>`;
  });
}

function mountSeaValidity(root) {
  return demoShell(root, [
    { key: 'modalDensity', label: 'Modal density', min: 0.002, max: 0.12, step: 0.002, value: 0.04, unit: ' mode/Hz' },
    { key: 'lossFactor', label: 'Loss factor', min: 0.003, max: 0.12, step: 0.002, value: 0.025 },
    { key: 'couplingLossFactor', label: 'Coupling loss factor', min: 0, max: 0.05, step: 0.001, value: 0.006 }
  ], 'SEA validity is a map, not a label. Modal population, overlap, coupling strength, and response sampling each control confidence.', (svg, input) => {
    const state = seaValidityState(input);
    const x = clamp(state.modesPerBand / 12, 0, 1), y = clamp(state.modalOverlap / 4, 0, 1);
    const px = 80 + x * 520, py = 360 - y * 290;
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><rect x="80" y="70" width="520" height="290" fill="${COLORS.rust}" opacity=".22"/><path d="M80 360 L600 360 L600 70 C420 95 280 190 80 330Z" fill="${COLORS.pale}"/><path d="M270 320 C390 220 475 135 600 95 L600 70 L420 70 C350 125 300 195 270 320Z" fill="${COLORS.green}" opacity=".48"/><line x1="80" y1="360" x2="600" y2="360" stroke="${COLORS.muted}"/><line x1="80" y1="70" x2="80" y2="360" stroke="${COLORS.muted}"/><circle cx="${px}" cy="${py}" r="10" fill="${COLORS.teal}" stroke="${COLORS.paper}" stroke-width="3"/><text x="340" y="405" text-anchor="middle" font-size="12" fill="${COLORS.muted}">modes per band →</text><text x="30" y="215" transform="rotate(-90 30 215)" text-anchor="middle" font-size="12" fill="${COLORS.muted}">modal overlap →</text><text x="670" y="82" font-size="15" font-weight="700" fill="${COLORS.ink}">${esc(state.readiness)}</text><text x="670" y="125" font-size="13" fill="${COLORS.ink}">modes / band = ${fmt(state.modesPerBand, 1)}</text><text x="670" y="155" font-size="13" fill="${COLORS.ink}">overlap = ${fmt(state.modalOverlap, 2)}</text><text x="670" y="185" font-size="13" fill="${COLORS.ink}">η<sub>coupling</sub>/η = ${fmt(state.weakCouplingRatio, 2)}</text><text x="670" y="215" font-size="13" fill="${COLORS.ink}">response COV ≈ ${fmt(100 * state.coefficientOfVariation, 0)}%</text>`;
  });
}

function windowNetworkTemplate(frequency = 1000, medium = 'air', sourcePower = 1) {
  const state = doubleWindowSeaState({ frequency, medium, sourcePower, bypass: 0 });
  const chainLinks = state.network.links.filter(link => Math.abs(link.i - link.j) === 1);
  return state.network.subsystems.map((item, index) => ({
    ...item,
    id: `sea-node-${index}-${Math.random().toString(36).slice(2, 8)}`,
    role: ['source', 'pane1', 'gap', 'pane2', 'receiver'][index],
    couplingFromPrevious: index ? chainLinks.find(link => link.i === index - 1 && link.j === index)?.forward ?? 0.01 : 0,
    autoModal: true,
    autoCoupling: index === 2 || index === 3
  }));
}

function mountDoublePanel(root) {
  let frequency = 1000;
  let medium = 'air';
  let sourcePower = 1;
  let nodes = windowNetworkTemplate(frequency, medium, sourcePower);

  const synchronizeTemplatePhysics = (resetCoupling = false) => {
    const template = doubleWindowSeaState({ frequency, medium, sourcePower, bypass: 0 });
    const byRole = Object.fromEntries(nodes.filter(node => node.role).map(node => [node.role, node]));
    for (const [index, role] of ['source', 'pane1', 'gap', 'pane2', 'receiver'].entries()) {
      const node = byRole[role];
      if (!node) continue;
      const source = template.network.subsystems[index];
      if (node.autoModal || (resetCoupling && role === 'gap')) node.modalDensity = source.modalDensity;
      if (role === 'gap') {
        node.name = source.name;
        node.density = source.density;
        node.soundSpeed = source.soundSpeed;
        node.volume = source.volume;
        if (resetCoupling) node.lossFactor = source.lossFactor;
      }
    }
    if (byRole.source) byRole.source.inputPower = sourcePower;
    if (byRole.gap && (byRole.gap.autoCoupling || resetCoupling)) byRole.gap.couplingFromPrevious = template.network.links[1].forward;
    if (byRole.pane2 && (byRole.pane2.autoCoupling || resetCoupling)) byRole.pane2.couplingFromPrevious = template.network.links[2].forward;
  };

  const solve = () => {
    synchronizeTemplatePhysics(false);
    const subsystems = nodes.map(node => ({ name: node.name, kind: node.kind, modalDensity: node.modalDensity, lossFactor: node.lossFactor, inputPower: node.inputPower, mass: node.mass, volume: node.volume, density: node.density, soundSpeed: node.soundSpeed }));
    const links = nodes.slice(1).map((node, index) => ({ i: index, j: index + 1, forward: node.couplingFromPrevious }));
    return seaNetworkState({ frequency, subsystems, links, sourceIndex: 0, receiverIndex: nodes.length - 1 });
  };

  const editorCard = (node, index) => {
    const resultLabel = node.kind === 'acoustic' ? 'Volume (m³)' : 'Mass (kg)';
    const resultKey = node.kind === 'acoustic' ? 'volume' : 'mass';
    return `<article class="sea-node-editor" data-node-card="${index}">
      <header><span>${index + 1}</span><strong>${esc(node.name)}</strong>${index > 0 && index < nodes.length - 1 ? `<button type="button" data-remove-node="${index}" aria-label="Remove ${esc(node.name)}">Remove</button>` : ''}</header>
      <label>Name<input data-node-index="${index}" data-node-key="name" type="text" value="${esc(node.name)}"></label>
      <div class="sea-editor-pair"><label>Type<select data-node-index="${index}" data-node-key="kind"><option value="acoustic"${node.kind === 'acoustic' ? ' selected' : ''}>Acoustic</option><option value="structural"${node.kind === 'structural' ? ' selected' : ''}>Structural</option></select></label><label>Input power (W)<input data-node-index="${index}" data-node-key="inputPower" type="number" min="0" step="0.01" value="${node.inputPower}"></label></div>
      <div class="sea-editor-pair"><label>Modal density (modes/Hz)<input data-node-index="${index}" data-node-key="modalDensity" type="number" min="0.000001" step="0.001" value="${node.modalDensity}"></label><label>Internal loss factor<input data-node-index="${index}" data-node-key="lossFactor" type="number" min="0.000001" step="0.001" value="${node.lossFactor}"></label></div>
      <label>${resultLabel}<input data-node-index="${index}" data-node-key="${resultKey}" type="number" min="0.000001" step="0.1" value="${node[resultKey]}"></label>
      ${index ? `<label class="sea-coupling-input">CLF from ${esc(nodes[index - 1].name)}<input data-node-index="${index}" data-node-key="couplingFromPrevious" type="number" min="0" step="0.001" value="${node.couplingFromPrevious}"></label>` : '<p class="sea-source-note">The first subsystem is the TL source endpoint.</p>'}
    </article>`;
  };

  const render = () => {
    let state;
    try {
      state = solve();
    } catch (error) {
      root.innerHTML = `<div class="calc-error">${esc(error.message)}</div>`;
      return;
    }
    const windowPhysics = nodes.some(node => node.role === 'gap') ? doubleWindowSeaState({ frequency, medium, sourcePower, bypass: 0 }) : null;
    const maximumEnergy = Math.max(...state.energies, 1e-30);
    const width = Math.max(1000, 170 * nodes.length + 100);
    const x = index => 75 + index * (width - 150) / Math.max(1, nodes.length - 1);
    const flowMaximum = Math.max(...state.powerFlows.map(flow => Math.abs(flow.net)), 1e-12);
    const links = state.powerFlows.map((flow, index) => {
      const x1 = x(index) + 54, x2 = x(index + 1) - 54;
      const rightward = flow.net >= 0;
      const strokeWidth = 2 + 10 * Math.sqrt(Math.abs(flow.net) / flowMaximum);
      const arrow = rightward ? `${x2 - 14},198 ${x2},206 ${x2 - 14},214` : `${x1 + 14},198 ${x1},206 ${x1 + 14},214`;
      return `<line x1="${x1}" y1="206" x2="${x2}" y2="206" stroke="${flow.net >= 0 ? COLORS.teal : COLORS.rust}" stroke-width="${strokeWidth}"/><polyline points="${arrow}" fill="none" stroke="${flow.net >= 0 ? COLORS.teal : COLORS.rust}" stroke-width="4"/><text x="${(x1 + x2) / 2}" y="184" text-anchor="middle" font-size="11" fill="${COLORS.muted}">${fmt(Math.abs(flow.net), 3)} W net</text>`;
    }).join('');
    const nodeGraphic = state.subsystemResults.map((item, index) => {
      const energyRatio = Math.sqrt(item.energy / maximumEnergy);
      const height = 65 + 105 * energyRatio;
      const color = item.kind === 'acoustic' ? COLORS.teal : COLORS.dark;
      return `<rect x="${x(index) - 52}" y="${236 - height / 2}" width="104" height="${height}" rx="5" fill="${color}" opacity="${0.42 + 0.55 * energyRatio}"/><text x="${x(index)}" y="274" text-anchor="middle" font-size="11" font-weight="700" fill="${COLORS.ink}">${esc(item.name)}</text><text x="${x(index)}" y="294" text-anchor="middle" font-size="10" fill="${COLORS.muted}">E ${fmt(item.energy, 3)} J</text><text x="${x(index)}" y="311" text-anchor="middle" font-size="10" fill="${COLORS.muted}">v ${fmt(item.velocityRms, 3)} m/s</text>`;
    }).join('');
    const mediumOptions = Object.values(SEA_MEDIA).map(item => `<option value="${item.key}"${item.key === medium ? ' selected' : ''}>${esc(item.label)}</option>`).join('');
    const strongest = state.strongestFlow ? `${state.strongestFlow.from} → ${state.strongestFlow.to}` : '—';
    root.innerHTML = `<div class="sea-builder">
      <div class="sea-builder-toolbar">
        <div class="demo-control"><label for="sea-frequency">Band center <output>${fmt(frequency, 0)} Hz</output></label><input id="sea-frequency" data-sea-global="frequency" type="range" min="50" max="8000" step="25" value="${frequency}"></div>
        <div class="demo-control"><label for="sea-medium">Window-gap medium</label><select id="sea-medium" data-sea-global="medium">${mediumOptions}</select></div>
        <div class="demo-control"><label for="sea-power">Source power <output>${fmt(sourcePower, 2)} W</output></label><input id="sea-power" data-sea-global="sourcePower" type="range" min="0.1" max="5" step="0.1" value="${sourcePower}"></div>
        <div class="sea-builder-actions"><button type="button" data-add-node="structural"${nodes.length >= 8 ? ' disabled' : ''}>+ Structural subsystem</button><button type="button" data-add-node="acoustic"${nodes.length >= 8 ? ' disabled' : ''}>+ Acoustic subsystem</button><button type="button" data-reset-window>Reset double window</button></div>
      </div>
      <div class="sea-builder-summary"><div><span>Transmission loss</span><strong>${fmt(state.transmissionLoss, 1)} dB</strong><small>${windowPhysics ? `${esc(SEA_MEDIA[medium].label)} gap · ρ ${fmt(SEA_MEDIA[medium].density, 3)} kg/m³ · c ${fmt(SEA_MEDIA[medium].soundSpeed, 0)} m/s` : 'Custom source-to-receiver chain'}</small></div><div><span>Power balance error</span><strong>${fmt(100 * state.balanceError, 4)}%</strong><small>${fmt(state.totalDissipatedPower, 3)} W dissipated</small></div><div><span>Strongest net path</span><strong>${esc(strongest)}</strong><small>${state.strongestFlow ? `${fmt(Math.abs(state.strongestFlow.net), 3)} W` : 'No link'}</small></div><div><span>Network size</span><strong>${nodes.length} subsystems</strong><small>${windowPhysics ? `fₘ𝒻ₘ ${fmt(windowPhysics.massFluidMassFrequency, 1)} Hz · gap cut-on ${fmt(windowPhysics.crossGapCuton, 0)} Hz` : `${nodes.length - 1} reciprocal links`}</small></div></div>
      <div class="sea-network-graphic"><svg viewBox="0 0 ${width} 350" style="min-width:${width}px" role="img" aria-label="SEA subsystem energies and net power-flow directions"><rect width="${width}" height="350" fill="${COLORS.paper}"/><text x="${width / 2}" y="42" text-anchor="middle" font-size="16" font-weight="700" fill="${COLORS.ink}">Editable SEA energy network</text><text x="${width / 2}" y="66" text-anchor="middle" font-size="12" fill="${COLORS.muted}">Box height follows band energy; arrow width follows net coupling power.</text>${links}${nodeGraphic}</svg></div>
      <details class="sea-builder-editor" open><summary>Edit subsystem definitions and coupling</summary><div class="sea-node-editor-grid">${nodes.map(editorCard).join('')}</div></details>
      <div class="sea-builder-tables">
        <section><h3>Subsystem solution</h3><div class="table-wrap"><table><thead><tr><th>Subsystem</th><th>Type</th><th>Energy (J)</th><th>Energy/mode (J)</th><th>Dissipation (W)</th><th>Velocity RMS (m/s)</th><th>Level (dB SPL)</th></tr></thead><tbody>${state.subsystemResults.map(item => `<tr><td>${esc(item.name)}</td><td>${item.kind}</td><td>${fmt(item.energy, 4)}</td><td>${fmt(item.modalEnergy, 4)}</td><td>${fmt(item.dissipatedPower, 4)}</td><td>${fmt(item.velocityRms, 4)}</td><td>${item.levelDb === null ? '—' : fmt(item.levelDb, 1)}</td></tr>`).join('')}</tbody></table></div></section>
        <section><h3>Gross and net coupling power</h3><div class="table-wrap"><table><thead><tr><th>Connection</th><th>Forward gross (W)</th><th>Reverse gross (W)</th><th>Net forward (W)</th><th>Reverse CLF</th></tr></thead><tbody>${state.powerFlows.map(flow => `<tr><td>${esc(flow.from)} → ${esc(flow.to)}</td><td>${fmt(flow.grossForward, 4)}</td><td>${fmt(flow.grossReverse, 4)}</td><td>${fmt(flow.net, 4)}</td><td>${fmt(flow.reverse, 4)}</td></tr>`).join('')}</tbody></table></div></section>
      </div>
      <div class="demo-caption">The default template follows ACS 519’s Price–Crocker five-subsystem path: source room → pane 1 → inter-pane medium → pane 2 → receiving room. Added subsystems remain a reciprocal linear chain. Structural velocity uses E≈Mv²; acoustic velocity is the equivalent diffuse-field particle-velocity scale. Low modal population, strong coupling, frames, seals, and direct paths require deterministic or hybrid treatment.</div>
    </div>`;
  };

  root.addEventListener('change', event => {
    const global = event.target.dataset.seaGlobal;
    if (global === 'frequency') frequency = Number(event.target.value);
    if (global === 'sourcePower') sourcePower = Number(event.target.value);
    if (global === 'medium') {
      medium = event.target.value;
      synchronizeTemplatePhysics(true);
    }
    const index = Number(event.target.dataset.nodeIndex);
    const key = event.target.dataset.nodeKey;
    if (Number.isInteger(index) && nodes[index] && key) {
      nodes[index][key] = key === 'name' || key === 'kind' ? event.target.value : Number(event.target.value);
      if (index === 0 && key === 'inputPower') sourcePower = Number(event.target.value);
      if (key === 'modalDensity') nodes[index].autoModal = false;
      if (key === 'couplingFromPrevious') nodes[index].autoCoupling = false;
      if (key === 'kind') {
        if (event.target.value === 'acoustic') Object.assign(nodes[index], { volume: nodes[index].volume || 1, density: SEA_MEDIA.air.density, soundSpeed: SEA_MEDIA.air.soundSpeed });
        else Object.assign(nodes[index], { mass: nodes[index].mass || 25 });
      }
    }
    render();
  });
  root.addEventListener('click', event => {
    const addKind = event.target.dataset.addNode;
    if (addKind && nodes.length < 8) {
      const count = nodes.filter(node => node.kind === addKind).length + 1;
      nodes.splice(nodes.length - 1, 0, {
        id: `sea-node-${Date.now()}`,
        name: addKind === 'acoustic' ? `Added cavity ${count}` : `Added panel ${count}`,
        kind: addKind,
        modalDensity: addKind === 'acoustic' ? 0.06 : 0.04,
        lossFactor: addKind === 'acoustic' ? 0.03 : 0.02,
        inputPower: 0,
        mass: 25,
        volume: 1,
        density: SEA_MEDIA.air.density,
        soundSpeed: SEA_MEDIA.air.soundSpeed,
        couplingFromPrevious: 0.01,
        autoModal: false,
        autoCoupling: false
      });
      render();
    }
    if (event.target.dataset.removeNode !== undefined) {
      const index = Number(event.target.dataset.removeNode);
      if (index > 0 && index < nodes.length - 1) nodes.splice(index, 1);
      render();
    }
    if (event.target.hasAttribute('data-reset-window')) {
      frequency = 1000;
      medium = 'air';
      sourcePower = 1;
      nodes = windowNetworkTemplate(frequency, medium, sourcePower);
      render();
    }
  });
  render();
  return () => {};
}

function mountKhie(root) {
  return demoShell(root, [
    { key: 'distance', label: 'Observer distance', min: 0.2, max: 12, step: 0.1, value: 3, unit: ' m' },
    { key: 'normalCosine', label: 'Patch normal · observer', min: -1, max: 1, step: 0.05, value: 0.7 },
    { key: 'frequency', label: 'Frequency', min: 50, max: 2500, step: 25, value: 500, unit: ' Hz' }
  ], 'The Helmholtz surface integral adds pressure and normal-velocity kernels as complex phasors. Patch orientation and phase can reinforce or cancel.', (svg, input) => {
    const state = khiePatchState(input);
    const observerX = 820, observerY = 105 + 190 * (1 - state.normalCosine) / 2;
    const patches = Array.from({ length: 7 }, (_, index) => {
      const x = 90 + index * 64, y = 300 - 95 * Math.sin(index / 6 * Math.PI);
      return `<rect x="${x}" y="${y}" width="48" height="16" transform="rotate(${-35 + index * 12} ${x + 24} ${y + 8})" fill="${index % 2 ? COLORS.teal : COLORS.dark}"/><path d="M${x + 24} ${y} L${observerX} ${observerY}" stroke="${COLORS.grid}" opacity=".55"/>`;
    }).join('');
    const pLength = clamp(120 * state.pressureMagnitude / Math.max(state.pressureMagnitude, state.velocityMagnitude, 1e-12), 15, 120);
    const vLength = clamp(120 * state.velocityMagnitude / Math.max(state.pressureMagnitude, state.velocityMagnitude, 1e-12), 15, 120);
    const vector = (x, y, length, phase, color, label) => {
      const angle = -phase * Math.PI / 180;
      const x2 = x + length * Math.cos(angle), y2 = y + length * Math.sin(angle);
      return `<path d="M${x} ${y} L${x2} ${y2}" stroke="${color}" stroke-width="6"/><circle cx="${x2}" cy="${y2}" r="6" fill="${color}"/><text x="${x}" y="${y + 28}" font-size="11" fill="${color}">${label}</text>`;
    };
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/>${patches}<circle cx="${observerX}" cy="${observerY}" r="12" fill="${COLORS.rust}"/><text x="${observerX}" y="${observerY - 22}" text-anchor="middle" font-size="12" fill="${COLORS.ink}">observer</text>${vector(600, 345, pLength, state.pressurePhase, COLORS.teal, 'pressure kernel')}${vector(765, 345, vLength, state.velocityPhase, COLORS.rust, 'velocity kernel')}<text x="70" y="45" font-size="15" font-weight="700" fill="${COLORS.ink}">Surface patches → complex observer pressure</text><text x="600" y="55" font-size="13" fill="${COLORS.ink}">|p| = ${fmt(state.totalMagnitude, 4)} Pa · phase ${fmt(state.totalPhase, 1)}°</text>`;
  });
}

function mountPipe(root) {
  return demoShell(root, [
    { key: 'flowSpeed', label: 'Mean flow speed', min: 10, max: 240, step: 5, value: 90, unit: ' m/s' },
    { key: 'frequency', label: 'Frequency', min: 50, max: 3000, step: 25, value: 700, unit: ' Hz' },
    { key: 'radius', label: 'Pipe radius', min: 0.05, max: 0.6, step: 0.01, value: 0.18, unit: ' m' }
  ], 'Flow structures, acoustic duct modes, and wall bending waves occupy different wavenumber lanes. Strong response appears when source and receiver scales approach one another.', (svg, input) => {
    const state = pipeNoiseState(input);
    const values = [state.convectiveWavenumber, state.acousticWavenumber, state.wallBendingWavenumber];
    const maximum = Math.max(...values) * 1.1;
    const sx = value => 180 + value / maximum * 720;
    const lanes = [120, 220, 320];
    const labels = ['Convective pressure', 'Duct acoustic wave', 'Wall bending wave'];
    const colors = [COLORS.rust, COLORS.teal, COLORS.dark];
    const waves = values.map((value, index) => {
      const wavelengthPx = clamp(2 * Math.PI / value / (2 * Math.PI / maximum) * 28, 22, 155);
      const path = Array.from({ length: 181 }, (_, point) => {
        const x = 180 + point * 4, y = lanes[index] + 22 * Math.sin(2 * Math.PI * (point * 4) / wavelengthPx);
        return `${point ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return `<text x="45" y="${lanes[index] + 5}" font-size="12" fill="${COLORS.ink}">${labels[index]}</text><path d="${path}" fill="none" stroke="${colors[index]}" stroke-width="4"/><circle cx="${sx(value)}" cy="${lanes[index]}" r="7" fill="${COLORS.ink}"/>`;
    }).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><text x="45" y="45" font-size="15" font-weight="700" fill="${COLORS.ink}">Competing axial/spatial scales</text>${waves}<line x1="180" y1="380" x2="900" y2="380" stroke="${COLORS.muted}"/><text x="540" y="414" text-anchor="middle" font-size="12" fill="${COLORS.muted}">wavenumber →</text><text x="650" y="47" font-size="12" fill="${COLORS.ink}">M = ${fmt(state.machNumber, 2)} · duct cut-on ${fmt(state.higherOrderCuton, 0)} Hz</text><text x="650" y="70" font-size="12" fill="${COLORS.ink}">${esc(state.acousticRegime)}</text><text x="650" y="92" font-size="12" fill="${COLORS.ink}">${esc(state.structuralRegime)}</text>`;
  });
}

function mountWaveMatching(root) {
  return demoShell(root, [
    { key: 'frequency', label: 'Evaluation frequency', min: 50, max: 5000, step: 25, value: 650, unit: ' Hz' },
    { key: 'thicknessMm', label: 'Panel thickness', min: 0.5, max: 14, step: 0.5, value: 4, unit: ' mm' },
    { key: 'convectionSpeed', label: 'Convection speed', min: 40, max: 320, step: 5, value: 180, unit: ' m/s' }
  ], 'Frequency identifies the tempo; wavenumber identifies the spatial fit. Curve intersections mark acoustic coincidence and convective forcing matches, while kh marks where the plate line itself stops being trustworthy.', (svg, input) => {
    const state = waveMatchingState({ frequency: input.frequency, thickness: input.thicknessMm / 1000, convectionSpeed: input.convectionSpeed });
    const x0 = 70, y0 = 42, width = 650, height = 320;
    const sx = value => x0 + (Math.log10(value) - Math.log10(20)) / (Math.log10(12000) - Math.log10(20)) * width;
    const allValues = [...state.bendingCurve, ...state.acousticCurve, ...state.convectiveCurve, ...state.longitudinalCurve, ...state.shearCurve];
    const minK = Math.min(...allValues), maxK = Math.max(...allValues);
    const sy = value => y0 + height - (Math.log10(value) - Math.log10(minK)) / (Math.log10(maxK) - Math.log10(minK)) * height;
    const path = values => linePath(values, (_, index) => sx(state.frequencies[index]), value => sy(value));
    const selectedX = sx(state.frequency);
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/>${axes({ x: x0, y: y0, width, height, xLabel: 'frequency (Hz, log)', yLabel: 'wavenumber (rad/m, log)' })}<path d="${path(state.bendingCurve)}" fill="none" stroke="${COLORS.teal}" stroke-width="5"/><path d="${path(state.acousticCurve)}" fill="none" stroke="${COLORS.rust}" stroke-width="4"/><path d="${path(state.convectiveCurve)}" fill="none" stroke="${COLORS.dark}" stroke-width="4"/><path d="${path(state.longitudinalCurve)}" fill="none" stroke="${COLORS.green}" stroke-width="3"/><path d="${path(state.shearCurve)}" fill="none" stroke="${COLORS.muted}" stroke-width="3"/><line x1="${selectedX}" x2="${selectedX}" y1="${y0}" y2="${y0 + height}" stroke="${COLORS.ink}" stroke-dasharray="6 5"/><circle cx="${selectedX}" cy="${sy(state.bendingWavenumber)}" r="8" fill="${COLORS.ink}"/><text x="755" y="55" font-size="15" font-weight="700" fill="${COLORS.ink}">Two different matches</text><text x="755" y="92" font-size="12" fill="${COLORS.rust}">acoustic f<tspan baseline-shift="sub">c</tspan> ${fmt(state.criticalFrequency, 0)} Hz</text><text x="755" y="120" font-size="12" fill="${COLORS.dark}">convective match ${fmt(state.convectiveMatchFrequency, 0)} Hz</text><text x="755" y="164" font-size="12" fill="${COLORS.teal}">bending k</text><text x="755" y="188" font-size="12" fill="${COLORS.rust}">acoustic k</text><text x="755" y="212" font-size="12" fill="${COLORS.dark}">convective k</text><text x="755" y="236" font-size="12" fill="${COLORS.green}">extensional k</text><text x="755" y="260" font-size="12" fill="${COLORS.muted}">shear k</text><text x="755" y="312" font-size="13" fill="${state.thicknessParameter > 0.5 ? COLORS.rust : COLORS.green}">kh = ${fmt(state.thicknessParameter, 3)}</text><text x="755" y="340" font-size="11" fill="${COLORS.muted}">${esc(state.plateValidity)}</text>`;
  });
}

function mountDrivenRadiation(root) {
  return demoShell(root, [
    { key: 'frequency', label: 'Forcing frequency', min: 40, max: 1800, step: 10, value: 420, unit: ' Hz' },
    { key: 'lossFactor', label: 'Loss factor', min: 0.003, max: 0.12, step: 0.002, value: 0.02 },
    { key: 'driveX', label: 'Drive x / L', min: 0.03, max: 0.97, step: 0.01, value: 0.27 },
    { key: 'driveY', label: 'Drive y / W', min: 0.03, max: 0.97, step: 0.01, value: 0.34 }
  ], 'A point force first sees modal participation, then surface mobility, then radiation efficiency. Move the force onto a node or cross coincidence and the largest structural and acoustic contributors can separate.', (svg, input) => {
    const state = drivenRadiationState(input);
    const dominant = state.dominant;
    const modeX = dominant?.modeX ?? 1, modeY = dominant?.modeY ?? 1;
    const cells = [];
    for (let iy = 0; iy < 13; iy += 1) for (let ix = 0; ix < 21; ix += 1) {
      const value = Math.sin(modeX * Math.PI * (ix + 0.5) / 21) * Math.sin(modeY * Math.PI * (iy + 0.5) / 13);
      cells.push(`<rect x="${50 + ix * 20}" y="${68 + iy * 20}" width="20" height="20" fill="${value >= 0 ? COLORS.teal : COLORS.rust}" opacity="${0.18 + 0.77 * Math.abs(value)}"/>`);
    }
    const driveX = 50 + state.driveX * 420, driveY = 68 + state.driveY * 260;
    const total = Math.max(state.soundPower, 1e-30);
    const resonantWidth = 300 * state.resonantPower / total;
    const nonresonantWidth = 300 - resonantWidth;
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/>${cells.join('')}<rect x="50" y="68" width="420" height="260" fill="none" stroke="${COLORS.ink}"/><circle cx="${driveX}" cy="${driveY}" r="10" fill="${COLORS.ink}" stroke="${COLORS.paper}" stroke-width="3"/><path d="M${driveX} ${driveY - 12} V${driveY - 48} M${driveX - 12} ${driveY - 31} L${driveX} ${driveY - 49} L${driveX + 12} ${driveY - 31}" fill="none" stroke="${COLORS.ink}" stroke-width="4"/><text x="50" y="42" font-size="15" font-weight="700" fill="${COLORS.ink}">Dominant acoustic mode (${modeX},${modeY})</text><text x="540" y="60" font-size="15" font-weight="700" fill="${COLORS.ink}">Force → surface → sound</text><text x="540" y="102" font-size="12" fill="${COLORS.muted}">drive mobility</text><text x="540" y="128" font-size="21" font-weight="700" fill="${COLORS.ink}">${fmt(state.driveMobility)} m/(N·s)</text><text x="540" y="172" font-size="12" fill="${COLORS.muted}">surface-averaged mobility</text><text x="540" y="198" font-size="21" font-weight="700" fill="${COLORS.ink}">${fmt(state.surfaceAveragedMobility)} m/(N·s)</text><text x="540" y="242" font-size="12" fill="${COLORS.muted}">sound power / force²</text><text x="540" y="268" font-size="21" font-weight="700" fill="${COLORS.ink}">${fmt(state.soundPowerPerForceSquared)} W/N²</text><rect x="540" y="310" width="${resonantWidth}" height="28" fill="${COLORS.rust}"/><rect x="${540 + resonantWidth}" y="310" width="${nonresonantWidth}" height="28" fill="${COLORS.teal}"/><text x="540" y="365" font-size="12" fill="${COLORS.rust}">resonant ${fmt(100 * state.resonantPower / total, 0)}%</text><text x="700" y="365" font-size="12" fill="${COLORS.teal}">nonresonant ${fmt(100 * state.nonresonantPower / total, 0)}%</text><text x="540" y="402" font-size="12" fill="${COLORS.muted}">${esc(state.finiteStructureRegime)}</text>`;
  });
}

function mountIntensityProbe(root) {
  return demoShell(root, [
    { key: 'frequency', label: 'Frequency', min: 50, max: 8000, step: 50, value: 1000, unit: ' Hz' },
    { key: 'spacerMm', label: 'Microphone spacer', min: 2, max: 50, step: 1, value: 12, unit: ' mm' },
    { key: 'phaseMismatchDegrees', label: 'Phase mismatch', min: -1, max: 1, step: 0.02, value: 0.15, unit: '°' },
    { key: 'reflectionCoefficient', label: 'Reflection coefficient', min: 0, max: 0.95, step: 0.01, value: 0.35 }
  ], 'Large spacing causes high-frequency finite-difference error; small spacing makes low-frequency phase mismatch visible. Reflections amplify that residual-phase sensitivity because pressure can be high while net power is small.', (svg, input) => {
    const state = soundIntensityProbeState({ frequency: input.frequency, spacer: input.spacerMm / 1000, phaseMismatchDegrees: input.phaseMismatchDegrees, reflectionCoefficient: input.reflectionCoefficient });
    const micGap = clamp(70 + input.spacerMm * 4, 78, 260);
    const left = 330 - micGap / 2, right = 330 + micGap / 2;
    const biasX = clamp(770 + state.totalBiasPercent * 2, 625, 925);
    const arrowRight = state.estimatedIntensity >= 0;
    const arrow = arrowRight ? `M${right + 35} 188 H530 M510 171 L532 188 L510 205` : `M${left - 35} 188 H95 M115 171 L93 188 L115 205`;
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><path d="M30 188 C75 130 120 246 165 188 S255 130 300 188 S390 246 435 188 S525 130 570 188" fill="none" stroke="${COLORS.teal}" stroke-width="5"/><circle cx="${left}" cy="188" r="18" fill="${COLORS.dark}"/><circle cx="${right}" cy="188" r="18" fill="${COLORS.dark}"/><line x1="${left}" x2="${right}" y1="235" y2="235" stroke="${COLORS.rust}" stroke-width="5"/><text x="330" y="266" text-anchor="middle" font-size="13" fill="${COLORS.ink}">${fmt(input.spacerMm, 0)} mm · kd ${fmt(state.kd, 3)}</text><path d="${arrow}" fill="none" stroke="${state.estimatedIntensity >= 0 ? COLORS.green : COLORS.rust}" stroke-width="7"/><text x="70" y="58" font-size="15" font-weight="700" fill="${COLORS.ink}">Signed active intensity</text><text x="70" y="91" font-size="13" fill="${state.estimatedIntensity >= 0 ? COLORS.green : COLORS.rust}">${esc(state.direction)}</text><line x1="625" x2="925" y1="205" y2="205" stroke="${COLORS.muted}" stroke-width="4"/><line x1="770" x2="770" y1="178" y2="232" stroke="${COLORS.ink}"/><circle cx="${biasX}" cy="205" r="10" fill="${Math.abs(state.totalBiasPercent) > 5 ? COLORS.rust : COLORS.green}"/><text x="625" y="155" font-size="15" font-weight="700" fill="${COLORS.ink}">Combined bias ${fmt(state.totalBiasPercent, 1)}%</text><text x="625" y="257" font-size="12" fill="${COLORS.muted}">−75% <tspan x="748">0</tspan><tspan x="895">+75%</tspan></text><text x="625" y="307" font-size="12" fill="${COLORS.ink}">kd=0.55 upper band ${fmt(state.maximumFrequencyKd055, 0)} Hz</text><text x="625" y="337" font-size="12" fill="${COLORS.ink}">phase-error lower band ${fmt(state.minimumFrequencyFivePercentPhase, 0)} Hz</text><text x="625" y="382" font-size="12" fill="${COLORS.muted}">Useful band exists only when the lower limit stays below the upper limit.</text>`;
  });
}

function mountStressEnvironment(root) {
  return demoShell(root, [
    { key: 'displacementMicrons', label: 'Displacement RMS', min: 20, max: 500, step: 10, value: 150, unit: ' µm' },
    { key: 'temperature', label: 'Temperature', min: -100, max: 200, step: 5, value: 80, unit: '°C' },
    { key: 'pressureKpa', label: 'Internal pressure', min: 0, max: 500, step: 10, value: 180, unit: ' kPa' },
    { key: 'stressConcentration', label: 'Stress concentration Kt', min: 1, max: 4, step: 0.1, value: 1.6 }
  ], 'Displacement is a shape; stress is its curvature filtered through stiffness and local detail. Temperature changes both response and strength, while pressure can stiffen the shell and consume mean-stress margin at the same time.', (svg, input) => {
    const state = dynamicStressEnvironmentState({ displacementRms: input.displacementMicrons * 1e-6, temperature: input.temperature, pressure: input.pressureKpa * 1000, stressConcentration: input.stressConcentration });
    const displacementCells = [], stressCells = [];
    const raw = [], stressRaw = [];
    for (let iy = 0; iy < 12; iy += 1) for (let ix = 0; ix < 18; ix += 1) {
      const x = (ix + 0.5) / 18, y = (iy + 0.5) / 12;
      const primary = Math.sin(3 * Math.PI * x) * Math.sin(Math.PI * y);
      const secondary = 0.28 * Math.sin(5 * Math.PI * x) * Math.sin(2 * Math.PI * y);
      raw.push(primary + secondary);
      stressRaw.push(10 * primary + 29 * secondary);
    }
    const maxDisp = Math.max(...raw.map(Math.abs)), maxStress = Math.max(...stressRaw.map(Math.abs));
    raw.forEach((value, index) => {
      const ix = index % 18, iy = Math.floor(index / 18);
      displacementCells.push(`<rect x="${40 + ix * 20}" y="${75 + iy * 20}" width="20" height="20" fill="${value >= 0 ? COLORS.teal : COLORS.rust}" opacity="${0.15 + 0.8 * Math.abs(value) / maxDisp}"/>`);
      const stressValue = stressRaw[index];
      stressCells.push(`<rect x="${480 + ix * 20}" y="${75 + iy * 20}" width="20" height="20" fill="${stressValue >= 0 ? COLORS.rust : COLORS.dark}" opacity="${0.15 + 0.8 * Math.abs(stressValue) / maxStress}"/>`);
    });
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><text x="40" y="48" font-size="15" font-weight="700" fill="${COLORS.ink}">Displacement field</text>${displacementCells.join('')}<text x="480" y="48" font-size="15" font-weight="700" fill="${COLORS.ink}">Curvature / stress field</text>${stressCells.join('')}<text x="40" y="350" font-size="12" fill="${COLORS.muted}">The small high-order component is modest in displacement but amplified by curvature.</text><text x="40" y="386" font-size="13" fill="${COLORS.ink}">alternating peak ${fmt(state.alternatingStressPeak / 1e6, 1)} MPa</text><text x="305" y="386" font-size="13" fill="${COLORS.ink}">mean hoop ${fmt(state.meanHoopStress / 1e6, 1)} MPa</text><text x="555" y="386" font-size="13" fill="${state.goodmanUtilization >= 1 ? COLORS.rust : COLORS.green}">Goodman use ${fmt(state.goodmanUtilization, 2)}</text><text x="780" y="386" font-size="13" fill="${COLORS.ink}">Δf ${fmt(state.pressureFrequencyShiftPercent, 1)}%</text><text x="40" y="419" font-size="12" fill="${COLORS.muted}">${esc(state.regime)}</text>`;
  });
}

function mountLaunchSource(root) {
  return demoShell(root, [
    { key: 'radialDistance', label: 'Receiver radial distance', min: 30, max: 600, step: 10, value: 120, unit: ' m' },
    { key: 'plumeLength', label: 'Effective source length', min: 15, max: 180, step: 5, value: 80, unit: ' m' },
    { key: 'suppressionDb', label: 'Water-suppression reduction', min: 0, max: 15, step: 0.5, value: 6, unit: ' dB' },
    { key: 'frequency', label: 'Evaluation band', min: 25, max: 4000, step: 25, value: 250, unit: ' Hz' }
  ], 'A launch plume is a distributed source. The receiver sees every source region at a different range and angle; suppression and spectrum alter level, but ignition overpressure remains a separate mechanism.', (svg, input) => {
    const state = launchAcousticSourceState(input);
    const x0 = 70, sourceWidth = 470, groundY = 332;
    const sx = position => x0 + position / state.plumeLength * sourceWidth;
    const maximumContribution = Math.max(...state.contributionIntensity, 1e-20);
    const sources = state.sourcePositions.filter((_, index) => index % 3 === 1).map((position, visualIndex) => {
      const index = visualIndex * 3 + 1;
      const weight = state.sourceWeights[index] / Math.max(...state.sourceWeights);
      const contribution = state.contributionIntensity[index] / maximumContribution;
      const y = groundY - 30 - 70 * Math.sin(Math.PI * position / state.plumeLength);
      return `<circle cx="${sx(position)}" cy="${y}" r="${3 + 8 * Math.sqrt(weight)}" fill="${COLORS.rust}" opacity="${0.18 + 0.8 * contribution}"/>`;
    }).join('');
    const receiverX = 790, receiverY = clamp(315 - state.radialDistance * 0.35, 55, 280);
    const centroidX = sx(state.sourceCentroid);
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><line x1="35" y1="${groundY}" x2="955" y2="${groundY}" stroke="${COLORS.grid}" stroke-width="4"/><rect x="35" y="210" width="34" height="122" fill="${COLORS.dark}"/><path d="M69 260 C155 150 330 180 ${x0 + sourceWidth} ${groundY - 20}" fill="none" stroke="${COLORS.rust}" stroke-width="22" opacity=".18"/>${sources}<line x1="${centroidX}" y1="200" x2="${centroidX}" y2="${groundY}" stroke="${COLORS.teal}" stroke-dasharray="6 5"/><text x="${centroidX}" y="188" text-anchor="middle" font-size="12" fill="${COLORS.teal}">power centroid ${fmt(state.sourceCentroid, 1)} m</text><path d="M${centroidX} 260 L${receiverX} ${receiverY}" stroke="${COLORS.grid}" stroke-dasharray="5 5"/><circle cx="${receiverX}" cy="${receiverY}" r="12" fill="${COLORS.teal}"/><text x="${receiverX}" y="${receiverY - 20}" text-anchor="middle" font-size="12" fill="${COLORS.ink}">vehicle station</text><text x="635" y="345" font-size="20" font-weight="700" fill="${COLORS.ink}">${fmt(state.overallLevel, 1)} dB overall</text><text x="635" y="375" font-size="13" fill="${COLORS.rust}">${fmt(state.bandLevel, 1)} dB at ${fmt(state.frequency, 0)} Hz</text><text x="635" y="405" font-size="12" fill="${COLORS.muted}">${esc(state.regime)}</text><text x="55" y="48" font-size="15" font-weight="700" fill="${COLORS.ink}">Distributed plume contribution map</text>`;
  });
}

function mountWetTank(root) {
  return demoShell(root, [
    { key: 'fillFraction', label: 'Fill fraction', min: 0.05, max: 1, step: 0.01, value: 0.72 },
    { key: 'liquidDensity', label: 'Liquid density', min: 60, max: 1400, step: 20, value: 1000, unit: ' kg/m³' },
    { key: 'effectiveAcceleration', label: 'Effective acceleration', min: 0, max: 30, step: 0.1, value: 9.8, unit: ' m/s²' },
    { key: 'circumferentialOrder', label: 'Shell order n', min: 0, max: 10, step: 1, value: 2 }
  ], 'Wet-wall inertia lowers shell modes, free-surface gravity sets slosh, and liquid compressibility sets a separate acoustic family. Change acceleration to see which scale collapses and which remains.', (svg, input) => {
    const state = wetTankDynamicsState(input);
    const left = 90, top = 58, width = 250, height = 310;
    const surfaceY = top + height * (1 - state.fillFraction);
    const n = state.circumferentialOrder;
    const wallPath = Array.from({ length: 101 }, (_, index) => {
      const y = top + index / 100 * height;
      const x = left + width / 2 + 13 * Math.sin(2 * Math.PI * n * index / 100);
      return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const frequencies = [state.firstSloshFrequency, state.wetShellFrequency, state.dryShellFrequency, state.firstLiquidAcousticFrequency].map(value => Math.max(value, 0.001));
    const minLog = Math.log10(Math.min(...frequencies) / 1.4), maxLog = Math.log10(Math.max(...frequencies) * 1.4);
    const sx = value => 495 + (Math.log10(Math.max(value, 0.001)) - minLog) / Math.max(maxLog - minLog, 1e-6) * 430;
    const labels = ['slosh', 'wet shell', 'dry shell', 'liquid acoustic'];
    const colors = [COLORS.green, COLORS.teal, COLORS.dark, COLORS.rust];
    const markers = frequencies.map((value, index) => `<line x1="${sx(value)}" y1="${112 + index * 66}" x2="${sx(value)}" y2="${145 + index * 66}" stroke="${colors[index]}" stroke-width="7"/><text x="470" y="${135 + index * 66}" text-anchor="end" font-size="12" fill="${colors[index]}">${labels[index]} ${fmt(value, value < 10 ? 2 : 1)} Hz</text>`).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/><rect x="${left}" y="${surfaceY}" width="${width}" height="${top + height - surfaceY}" fill="${COLORS.teal}" opacity=".58"/><ellipse cx="${left + width / 2}" cy="${surfaceY}" rx="${width / 2}" ry="20" fill="${COLORS.pale}" stroke="${COLORS.teal}"/><path d="M${left} ${top + 18} V${top + height - 18} M${left + width} ${top + 18} V${top + height - 18}" stroke="${COLORS.dark}" stroke-width="5"/><ellipse cx="${left + width / 2}" cy="${top + 18}" rx="${width / 2}" ry="28" fill="none" stroke="${COLORS.dark}" stroke-width="5"/><ellipse cx="${left + width / 2}" cy="${top + height - 18}" rx="${width / 2}" ry="28" fill="${COLORS.teal}" opacity=".72" stroke="${COLORS.dark}" stroke-width="5"/><path d="${wallPath}" fill="none" stroke="${COLORS.rust}" stroke-width="3" opacity=".8"/><text x="${left + width / 2}" y="32" text-anchor="middle" font-size="15" font-weight="700" fill="${COLORS.ink}">${fmt(100 * state.fillFraction, 0)}% wet tank</text><line x1="495" y1="365" x2="925" y2="365" stroke="${COLORS.muted}"/>${markers}<text x="710" y="405" text-anchor="middle" font-size="12" fill="${COLORS.muted}">frequency family (log scale) · added-mass ratio ${fmt(state.addedMassRatio, 2)}</text>`;
  });
}

function mountQualification(root) {
  return demoShell(root, [
    { key: 'marginDb', label: 'Vibration margin', min: 0, max: 9, step: 0.5, value: 3, unit: ' dB' },
    { key: 'testDuration', label: 'Test duration', min: 30, max: 360, step: 10, value: 120, unit: ' s' },
    { key: 'forceLimitAsd', label: 'Interface force limit', min: 25, max: 800, step: 5, value: 100, unit: ' N/√Hz' },
    { key: 'responseLimitRms', label: 'Response limit', min: 1, max: 14, step: 0.25, value: 4.5, unit: ' g RMS' }
  ], 'The unlimited test carries duration and margin. A force- or response-limited notch can protect the article, but it must preserve a stated verification objective and remain under program authority.', (svg, input) => {
    const state = qualificationTestState(input);
    const x0 = 70, y0 = 52, width = 620, height = 300;
    const minF = state.frequencies[0], maxF = state.frequencies.at(-1);
    const all = [...state.flightCurve, ...state.unlimitedCurve, ...state.controlledCurve];
    const minP = Math.min(...all) / 1.4, maxP = Math.max(...all) * 1.4;
    const sx = value => x0 + (Math.log10(value) - Math.log10(minF)) / (Math.log10(maxF) - Math.log10(minF)) * width;
    const sy = value => y0 + height - (Math.log10(value) - Math.log10(minP)) / (Math.log10(maxP) - Math.log10(minP)) * height;
    const path = values => linePath(values, (_, index) => sx(state.frequencies[index]), value => sy(value));
    const notchX = sx(state.notchCenter);
    svg.innerHTML = `<rect width="1000" height="440" fill="${COLORS.paper}"/>${axes({ x: x0, y: y0, width, height, xLabel: 'frequency (log)', yLabel: 'PSD (log)' })}<path d="${path(state.flightCurve)}" fill="none" stroke="${COLORS.grid}" stroke-width="4"/><path d="${path(state.unlimitedCurve)}" fill="none" stroke="${COLORS.rust}" stroke-width="4"/><path d="${path(state.controlledCurve)}" fill="none" stroke="${COLORS.teal}" stroke-width="6"/><line x1="${notchX}" y1="${y0}" x2="${notchX}" y2="${y0 + height}" stroke="${COLORS.dark}" stroke-dasharray="6 5"/><text x="735" y="65" font-size="15" font-weight="700" fill="${COLORS.ink}">Test-tailoring screen</text><text x="735" y="108" font-size="12" fill="${COLORS.grid}">flight environment</text><text x="735" y="135" font-size="12" fill="${COLORS.rust}">unlimited test</text><text x="735" y="162" font-size="12" fill="${COLORS.teal}">controlled test</text><text x="735" y="218" font-size="12" fill="${COLORS.muted}">center notch</text><text x="735" y="248" font-size="23" font-weight="700" fill="${state.controlScale < 0.999 ? COLORS.rust : COLORS.green}">${fmt(state.centerNotchDb, 1)} dB</text><text x="735" y="292" font-size="12" fill="${COLORS.muted}">local damage / flight</text><text x="735" y="322" font-size="20" font-weight="700" fill="${COLORS.ink}">${fmt(state.controlledDamageRatio, 2)}</text><text x="735" y="370" font-size="12" fill="${COLORS.ink}">${esc(state.limitingMechanism)}</text><text x="735" y="402" font-size="11" fill="${COLORS.muted}">A notch is evidence-based tailoring, not an automatic entitlement.</text>`;
  });
}

const mounts = Object.freeze({
  'modal-radiation-patterns': mountModalRadiation,
  'piston-fluid-loading': mountPiston,
  'shell-wave-map': mountShell,
  'fe-be-model-trust': mountFeBe,
  'panel-tl-angle': mountPanelTl,
  'orthotropic-coincidence': mountOrthotropic,
  'loss-factor-paths': mountLossBudget,
  'modal-test-grid': mountModalTest,
  'sea-validity-map': mountSeaValidity,
  'double-panel-energy-paths': mountDoublePanel,
  'khie-surface-contributions': mountKhie,
  'pipe-noise-pathways': mountPipe,
  'frequency-wavenumber-atlas': mountWaveMatching,
  'force-to-sound-power': mountDrivenRadiation,
  'intensity-probe-lab': mountIntensityProbe,
  'stress-environment-map': mountStressEnvironment,
  'launch-source-map': mountLaunchSource,
  'wet-tank-coupling': mountWetTank,
  'qualification-notching': mountQualification
});

export function mountAcs519Demo(root, id) {
  const mount = mounts[id];
  return mount ? mount(root) : null;
}
