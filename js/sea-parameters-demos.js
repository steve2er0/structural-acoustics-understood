import {
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

const C = Object.freeze({ ink: '#172027', teal: '#1e6077', dark: '#164453', rust: '#b96d37', muted: '#657176', grid: '#ada497', paper: '#faf8f2', wash: '#e7e2d8', pale: '#dce9ec', green: '#376e56' });
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const fmt = (value, digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e4 || (Math.abs(n) > 0 && Math.abs(n) < 1e-3)) return n.toExponential(2);
  return n.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '');
};
const logPosition = (value, low, high, x, width) => x + (Math.log10(Math.max(value, low)) - Math.log10(low)) / Math.log10(high / low) * width;

function field(control) {
  if (control.type === 'select') return `<div class="demo-control"><label for="sea-${control.key}">${esc(control.label)}</label><select id="sea-${control.key}" data-acs-key="${control.stateKey ?? control.key}">${control.options.map(option => `<option value="${esc(option.value)}" ${option.value === control.value ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}</select></div>`;
  return `<div class="demo-control"><label for="sea-${control.key}">${esc(control.label)} <output id="sea-out-${control.key}">${esc(control.value)}${esc(control.unit ?? '')}</output></label><input id="sea-${control.key}" data-acs-key="${control.stateKey ?? control.key}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}"></div>`;
}

function mountLab(root, controls, caption, draw) {
  root.innerHTML = `<div class="demo-controls">${controls.map(field).join('')}</div><div class="demo-canvas-wrap"><svg data-sea-parameters-svg viewBox="0 0 1000 440" role="img" aria-label="Interactive SEA parameter visualization"></svg></div><div class="demo-caption">${caption}</div>`;
  const inputs = Object.fromEntries(controls.map(control => [control.key, root.querySelector(`#sea-${control.key}`)]));
  const render = () => {
    const values = Object.fromEntries(Object.entries(inputs).map(([key, element]) => [key, element.type === 'range' ? Number(element.value) : element.value]));
    controls.filter(control => control.type !== 'select').forEach(control => {
      const output = root.querySelector(`#sea-out-${control.key}`);
      if (output) output.textContent = `${fmt(values[control.key], control.step < 0.01 ? 3 : control.step < 1 ? 2 : 0)}${control.unit ?? ''}`;
    });
    draw(root.querySelector('[data-sea-parameters-svg]'), values);
  };
  Object.values(inputs).forEach(input => { input.addEventListener('input', render); input.addEventListener('change', render); });
  render();
  return () => {};
}

function previewFrame(inner) { return `<svg viewBox="0 0 520 180" aria-hidden="true"><rect width="520" height="180" fill="${C.wash}"/>${inner}</svg>`; }

const previewMap = Object.freeze({
  'sea-parameter-chain': previewFrame('<rect x="18" y="64" width="82" height="52" fill="#164453"/><rect x="132" y="64" width="82" height="52" fill="#1e6077"/><rect x="246" y="64" width="82" height="52" fill="#b96d37"/><rect x="360" y="64" width="82" height="52" fill="#376e56"/><path d="M100 90 H132 M214 90 H246 M328 90 H360" stroke="#172027" stroke-width="6"/><circle cx="480" cy="90" r="24" fill="#dce9ec" stroke="#172027" stroke-width="4"/>'),
  'modal-density-regime-map': previewFrame('<path d="M35 145 C145 135 190 115 255 70 S400 35 490 24" fill="none" stroke="#1e6077" stroke-width="6"/><path d="M35 132 H490" stroke="#b96d37" stroke-width="4"/><line x1="285" y1="22" x2="285" y2="150" stroke="#172027" stroke-dasharray="6 5"/>'),
  'sea-driving-point-mobility': previewFrame('<rect x="26" y="52" width="145" height="76" fill="#164453"/><path d="M171 90 H276" stroke="#b96d37" stroke-width="7"/><circle cx="308" cy="90" r="32" fill="#dce9ec" stroke="#1e6077" stroke-width="5"/><path d="M340 90 H490" stroke="#1e6077" stroke-width="5"/><path d="M410 55 C430 75 430 105 410 125" fill="none" stroke="#b96d37" stroke-width="4"/>'),
  'sea-coupling-mechanisms': previewFrame('<rect x="24" y="47" width="150" height="88" fill="#164453"/><rect x="346" y="65" width="150" height="70" fill="#1e6077"/><path d="M182 73 H335 M320 62 L338 73 L320 84" stroke="#b96d37" stroke-width="8" fill="none"/><path d="M335 112 H182 M198 103 L180 112 L198 121" stroke="#657176" stroke-width="4" fill="none"/><circle cx="260" cy="92" r="14" fill="#172027"/>'),
  'environment-to-sea-power': previewFrame('<path d="M24 45 C75 20 110 70 156 45 S230 70 276 45" fill="none" stroke="#1e6077" stroke-width="14" opacity=".7"/><rect x="32" y="100" width="244" height="28" fill="#164453"/><path d="M292 90 H390" stroke="#b96d37" stroke-width="9"/><rect x="405" y="45" width="78" height="90" fill="#376e56"/><text x="444" y="98" text-anchor="middle" fill="#faf8f2" font-size="18">W</text>'),
  'tbl-convection-velocity-map': previewFrame('<path d="M35 38 H492" stroke="#b96d37" stroke-width="4"/><path d="M35 25 C125 30 175 65 260 90 S410 110 492 112" fill="none" stroke="#1e6077" stroke-width="6"/><path d="M35 70 C150 82 280 120 492 135" fill="none" stroke="#657176" stroke-width="4"/><path d="M55 155 H470 M450 144 L472 155 L450 166" fill="none" stroke="#172027" stroke-width="4"/>'),
  'equipment-smearing-map': previewFrame('<rect x="26" y="88" width="468" height="32" fill="#164453"/><rect x="195" y="45" width="130" height="44" fill="#b96d37"/><circle cx="220" cy="120" r="9" fill="#172027"/><circle cx="300" cy="120" r="9" fill="#172027"/><path d="M80 145 H440" stroke="#1e6077" stroke-width="5" stroke-dasharray="8 6"/>'),
  'sea-local-response': previewFrame('<rect x="28" y="35" width="464" height="112" fill="#faf8f2" stroke="#ada497"/><rect x="28" y="35" width="70" height="112" fill="#b96d37" opacity=".25"/><path d="M28 95 C82 26 140 145 198 82 S315 25 374 95 S442 120 492 52" fill="none" stroke="#1e6077" stroke-width="10" opacity=".75"/><circle cx="374" cy="95" r="9" fill="#172027"/>'),
  'radiation-efficiency-construction-map': previewFrame('<rect x="25" y="92" width="190" height="30" fill="#164453"/><path d="M215 92 C275 45 335 45 495 80 M215 108 C295 85 380 95 495 125" fill="none" stroke="#1e6077" stroke-width="5"/><line x1="345" y1="28" x2="345" y2="152" stroke="#b96d37" stroke-dasharray="6 5"/>'),
  'fairing-blanket-network': previewFrame('<rect x="18" y="44" width="115" height="92" fill="#1e6077"/><rect x="202" y="30" width="35" height="120" fill="#164453"/><rect x="246" y="30" width="28" height="120" fill="#b96d37"/><rect x="350" y="60" width="150" height="76" fill="#dce9ec"/><path d="M133 70 H200 M274 70 H350" stroke="#b96d37" stroke-width="8"/><path d="M133 118 H350" stroke="#657176" stroke-width="4" stroke-dasharray="6 5"/>')
});

export const seaParameterSupportedDemoIds = Object.freeze(Object.keys(previewMap));
export function seaParameterPreviewSvg(id) { return previewMap[id] || null; }

function mountParameterChain(root) {
  return mountLab(root, [
    { key: 'preset', stateKey: 'preset', label: 'Subsystem', type: 'select', value: 'honeycombFairing', options: [{ value: 'aluminumPlate', label: 'Aluminum skin' }, { value: 'honeycombFairing', label: 'Honeycomb fairing' }, { value: 'cylindricalShell', label: 'Cylindrical shell' }, { value: 'acousticCavity', label: 'Payload cavity' }] },
    { key: 'frequency', stateKey: 'frequency', label: 'Band center', min: 80, max: 8000, step: 20, value: 1000, unit: ' Hz' },
    { key: 'pressure', stateKey: 'pressureRms', label: 'Pressure RMS', min: 2, max: 600, step: 2, value: 200, unit: ' Pa' }
  ], 'Every block is a derived engineering input with a provenance class. Follow the chain from hardware and environment to stored energy and response.', (svg, v) => {
    const state = seaParameterWorkbenchState({ preset: v.preset, frequency: v.frequency, pressureRms: v.pressure, source: 'diffuse', lossSource: 'empirical' });
    const blocks = [
      ['Modal density', state.modal.modalDensity, 'mode/Hz'],
      ['Loss factor', state.selectedLossFactor, ''],
      ['Input power', state.externalPower, 'W'],
      ['Band energy', state.energy, 'J'],
      [state.acoustic ? 'Pressure' : 'Velocity', state.acoustic ? state.recovery.pressureRms : state.recovery.velocityRms, state.acoustic ? 'Pa' : 'm/s']
    ];
    const rectangles = blocks.map((item, index) => {
      const x = 35 + index * 190;
      const color = [C.dark, C.teal, C.rust, C.green, C.ink][index];
      return `<rect x="${x}" y="145" width="145" height="105" rx="7" fill="${color}"/><text x="${x + 72}" y="178" text-anchor="middle" font-size="12" fill="${C.paper}">${item[0]}</text><text x="${x + 72}" y="213" text-anchor="middle" font-size="20" font-weight="700" fill="${C.paper}">${fmt(item[1])}</text><text x="${x + 72}" y="235" text-anchor="middle" font-size="11" fill="${C.paper}">${item[2]}</text>${index < blocks.length - 1 ? `<path d="M${x + 145} 198 H${x + 186}" stroke="${C.grid}" stroke-width="6"/>` : ''}`;
    }).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><text x="35" y="42" font-size="18" font-weight="700" fill="${C.ink}">${esc(state.preset.label)} · ${fmt(state.frequency, 0)} Hz</text><text x="35" y="76" font-size="13" fill="${C.muted}">${esc(state.modal.readiness)} · confidence ${fmt(state.confidenceScore, 0)}/100</text>${rectangles}<text x="35" y="330" font-size="13" fill="${C.ink}">Engineering takeaway</text><text x="35" y="360" font-size="12" fill="${C.muted}">The response is only as traceable as the least-defensible parameter in this chain.</text>`;
  });
}

function mountModalDensity(root) {
  return mountLab(root, [
    { key: 'type', stateKey: 'type', label: 'Wave family', type: 'select', value: 'plate-bending', options: [{ value: 'acoustic-1d', label: 'Acoustic 1D' }, { value: 'acoustic-2d', label: 'Acoustic 2D' }, { value: 'acoustic-3d', label: 'Acoustic 3D' }, { value: 'beam-bending', label: 'Beam bending' }, { value: 'plate-bending', label: 'Plate bending' }, { value: 'plate-inplane', label: 'Plate in-plane' }, { value: 'honeycomb', label: 'Honeycomb' }, { value: 'cylinder', label: 'Cylinder' }] },
    { key: 'frequency', stateKey: 'frequency', label: 'Frequency', min: 40, max: 10000, step: 20, value: 1000, unit: ' Hz' },
    { key: 'loss', stateKey: 'lossFactor', label: 'Loss factor', min: 0.002, max: 0.1, step: 0.001, value: 0.02 }
  ], 'Modal density, modes per band, and overlap are separate readiness measures. Switch wave family without changing the hardware dimensions.', (svg, v) => {
    const state = modalDensityAtlasState({ type: v.type, frequency: v.frequency, lossFactor: v.loss, length: 2.4, width: 1.4, height: 0.3, thickness: v.type === 'honeycomb' ? 0.026 : 0.003, density: v.type === 'honeycomb' ? 520 : 2700, modulus: 70e9, radius: 1.8 });
    const x0 = 70, y0 = 60, width = 610, height = 285;
    const minF = state.frequencies[0], maxF = state.frequencies.at(-1), minY = Math.max(1e-6, Math.min(...state.curve) / 1.4), maxY = Math.max(...state.curve) * 1.4;
    const sx = f => logPosition(f, minF, maxF, x0, width);
    const sy = value => y0 + height - (Math.log10(value) - Math.log10(minY)) / Math.log10(maxY / minY) * height;
    const path = state.frequencies.map((f, i) => `${i ? 'L' : 'M'}${sx(f).toFixed(1)},${sy(state.curve[i]).toFixed(1)}`).join(' ');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><line x1="${x0}" y1="${y0 + height}" x2="${x0 + width}" y2="${y0 + height}" stroke="${C.muted}"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + height}" stroke="${C.muted}"/><path d="${path}" fill="none" stroke="${C.teal}" stroke-width="6"/><line x1="${sx(state.frequency)}" y1="${y0}" x2="${sx(state.frequency)}" y2="${y0 + height}" stroke="${C.rust}" stroke-dasharray="6 5"/><circle cx="${sx(state.frequency)}" cy="${sy(state.modalDensity)}" r="8" fill="${C.rust}"/><text x="725" y="82" font-size="13" fill="${C.muted}">modal density</text><text x="725" y="114" font-size="25" font-weight="700" fill="${C.ink}">${fmt(state.modalDensity, 3)}</text><text x="725" y="158" font-size="13" fill="${C.muted}">modes / band</text><text x="725" y="190" font-size="25" font-weight="700" fill="${C.teal}">${fmt(state.modesInBand, 2)}</text><text x="725" y="234" font-size="13" fill="${C.muted}">modal overlap</text><text x="725" y="266" font-size="25" font-weight="700" fill="${C.rust}">${fmt(state.modalOverlap, 2)}</text><text x="725" y="326" font-size="12" fill="${C.ink}">${esc(state.readiness)}</text>`;
  });
}

function mountMobility(root) {
  return mountLab(root, [
    { key: 'model', stateKey: 'model', label: 'Driving-point model', type: 'select', value: 'plate-center', options: [{ value: 'plate-center', label: 'Plate center' }, { value: 'plate-edge', label: 'Plate edge' }, { value: 'cylindrical-shell', label: 'Cylinder shell' }, { value: 'rod-longitudinal', label: 'Rod' }, { value: 'high-frequency-general', label: 'Y=n/(4M)' }] },
    { key: 'frequency', stateKey: 'frequency', label: 'Frequency', min: 40, max: 8000, step: 20, value: 1000, unit: ' Hz' },
    { key: 'force', stateKey: 'forceRms', label: 'Force RMS', min: 1, max: 100, step: 1, value: 10, unit: ' N' }
  ], 'Conductance—not transfer-FRF magnitude—converts a localized force into SEA source power.', (svg, v) => {
    const state = drivingPointImpedanceState({ model: v.model, frequency: v.frequency, forceRms: v.force, length: 7.5, width: 1.4, radius: 1.8, thickness: 0.004, modulus: 70e9, density: 2700, modalDensity: 0.04, mass: 120 });
    const arrow = clamp(25 + 95 * Math.log10(1 + state.inputPower * 100), 25, 145);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><rect x="70" y="142" width="260" height="128" rx="8" fill="${C.dark}"/><text x="200" y="193" text-anchor="middle" font-size="15" fill="${C.paper}">${esc(state.basis)}</text><text x="200" y="235" text-anchor="middle" font-size="24" font-weight="700" fill="${C.paper}">Y=${fmt(state.mobility, 4)}</text><path d="M350 206 H${350 + arrow}" stroke="${C.rust}" stroke-width="14"/><path d="M${340 + arrow} 190 L${365 + arrow} 206 L${340 + arrow} 222" fill="${C.rust}"/><rect x="555" y="132" width="330" height="150" rx="8" fill="${C.pale}"/><text x="720" y="178" text-anchor="middle" font-size="13" fill="${C.muted}">equivalent band input power</text><text x="720" y="225" text-anchor="middle" font-size="34" font-weight="700" fill="${C.ink}">${fmt(state.inputPower, 4)} W</text><text x="70" y="345" font-size="12" fill="${C.muted}">${fmt(v.force, 0)} N RMS × real drive mobility at ${fmt(v.frequency, 0)} Hz</text>`;
  });
}

function mountClf(root) {
  return mountLab(root, [
    { key: 'mechanism', stateKey: 'mechanism', label: 'Junction mechanism', type: 'select', value: 'line-joint', options: [{ value: 'l-beam', label: 'L-beam' }, { value: 'l-plates', label: 'L-plates' }, { value: 'point-bridge', label: 'Point bridge' }, { value: 'bolted-plates', label: 'Bolted plates' }, { value: 'line-joint', label: 'Line joint' }, { value: 'panel-air', label: 'Panel-air' }, { value: 'fairing-masslaw', label: 'Mass-law path' }] },
    { key: 'frequency', stateKey: 'frequency', label: 'Frequency', min: 80, max: 8000, step: 20, value: 1000, unit: ' Hz' },
    { key: 'ratio', stateKey: 'modalDensityRatio', label: 'n₂ / n₁', min: 0.2, max: 8, step: 0.1, value: 4.5 }
  ], 'The reverse CLF follows modal-density-weighted reciprocity. Gross coupling can remain strong even when net power is small.', (svg, v) => {
    const state = clfMechanismState({ mechanism: v.mechanism, frequency: v.frequency, modalDensity1: 0.04, modalDensity2: 0.04 * v.ratio, length: 2.4, width: 1.4, thickness: 0.003, thickness2: 0.004, modulus: 70e9, density: 2700, pointCount: 12, junctionLength: 1.4, transmissionLoss: 28, volume: 60 });
    const forwardWidth = clamp(4 + 20 * Math.log10(1 + state.forward * 1e4), 4, 24);
    const reverseWidth = clamp(4 + 20 * Math.log10(1 + state.reverse * 1e4), 4, 24);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><rect x="65" y="115" width="250" height="190" rx="8" fill="${C.dark}"/><rect x="685" y="145" width="250" height="160" rx="8" fill="${C.teal}"/><text x="190" y="182" text-anchor="middle" font-size="15" fill="${C.paper}">Subsystem 1</text><text x="190" y="224" text-anchor="middle" font-size="24" font-weight="700" fill="${C.paper}">n₁=0.04</text><text x="810" y="202" text-anchor="middle" font-size="15" fill="${C.paper}">Subsystem 2</text><text x="810" y="244" text-anchor="middle" font-size="24" font-weight="700" fill="${C.paper}">n₂=${fmt(0.04 * v.ratio, 3)}</text><path d="M335 165 H665" stroke="${C.rust}" stroke-width="${forwardWidth}"/><path d="M650 148 L676 165 L650 182" fill="${C.rust}"/><path d="M665 265 H335" stroke="${C.grid}" stroke-width="${reverseWidth}"/><path d="M350 248 L324 265 L350 282" fill="${C.grid}"/><text x="500" y="128" text-anchor="middle" font-size="13" fill="${C.rust}">η₁₂ ${fmt(state.forward, 5)}</text><text x="500" y="305" text-anchor="middle" font-size="13" fill="${C.muted}">η₂₁ ${fmt(state.reverse, 5)}</text><text x="500" y="374" text-anchor="middle" font-size="13" fill="${C.ink}">${esc(state.basis)}</text>`;
  });
}

function mountPower(root) {
  return mountLab(root, [
    { key: 'source', stateKey: 'source', label: 'Source model', type: 'select', value: 'diffuse', options: [{ value: 'diffuse', label: 'Diffuse acoustic' }, { value: 'tbl-slow', label: 'TBL Uc>cp' }, { value: 'tbl-fast', label: 'TBL Uc<cp' }, { value: 'corcos', label: 'Corcos' }, { value: 'point-force', label: 'Point force' }] },
    { key: 'frequency', stateKey: 'frequency', label: 'Frequency', min: 80, max: 8000, step: 20, value: 1000, unit: ' Hz' },
    { key: 'velocity', stateKey: 'convectionVelocity', label: 'Convection velocity', min: 40, max: 450, step: 5, value: 220, unit: ' m/s' }
  ], 'Hold the local pressure conceptually fixed and change the field model: accepted structural power can move by orders of magnitude.', (svg, v) => {
    const sources = ['diffuse', 'tbl-slow', 'tbl-fast', 'corcos', 'point-force'];
    const values = sources.map(source => equivalentPowerInjectionState({ source, frequency: v.frequency, pressureRms: 200, convectionVelocity: v.velocity, modalDensity: 0.04, radiationEfficiency: 0.35, forceRms: 10, conductance: 1e-4, length: 2.4, width: 1.4, thickness: 0.003, modulus: 70e9, density: 2700 }).injectedPower);
    const max = Math.max(...values, 1e-12), selected = sources.indexOf(v.source);
    const bars = values.map((value, index) => { const height = 245 * Math.log10(1 + 9 * value / max); const x = 80 + index * 150; return `<rect x="${x}" y="${340 - height}" width="92" height="${height}" fill="${index === selected ? C.rust : C.teal}"/><text x="${x + 46}" y="365" text-anchor="middle" font-size="11" fill="${C.muted}">${sources[index]}</text><text x="${x + 46}" y="${325 - height}" text-anchor="middle" font-size="11" fill="${C.ink}">${fmt(value, 4)} W</text>`; }).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><line x1="55" y1="340" x2="900" y2="340" stroke="${C.muted}"/>${bars}<text x="80" y="50" font-size="16" font-weight="700" fill="${C.ink}">Equivalent power into the same panel</text><text x="80" y="78" font-size="12" fill="${C.muted}">Selected: ${esc(v.source)} · ${fmt(v.frequency, 0)} Hz · Uc ${fmt(v.velocity, 0)} m/s</text>`;
  });
}

function mountConvection(root) {
  return mountLab(root, [
    { key: 'model', stateKey: 'model', label: 'Convection model', type: 'select', value: 'totaro', options: [{ value: 'constant', label: 'Constant 0.75' }, { value: 'totaro', label: 'Totaro' }, { value: 'attached-envelope', label: 'Attached envelope' }, { value: 'separated-envelope', label: 'Separated envelope' }] },
    { key: 'frequency', stateKey: 'frequency', label: 'Frequency', min: 20, max: 10000, step: 20, value: 1000, unit: ' Hz' },
    { key: 'thickness', stateKey: 'displacementThicknessMm', label: 'Displacement thickness', min: 1, max: 50, step: 1, value: 12, unit: ' mm' }
  ], 'Convection velocity controls phase, coherence length, modal acceptance, and equivalent power. Flow state and frequency belong in the model.', (svg, v) => {
    const models = ['constant', 'totaro', 'attached-envelope', 'separated-envelope'];
    const colors = [C.grid, C.teal, C.green, C.rust];
    const states = models.map(model => tblConvectionState({ model, frequency: v.frequency, freeStreamVelocity: 300, displacementThickness: v.thickness / 1000, fixedFraction: 0.75 }));
    const x0 = 70, y0 = 45, width = 650, height = 300, minF = 20, maxF = 10000;
    const sx = f => logPosition(f, minF, maxF, x0, width), sy = velocity => y0 + height - (velocity - 90) / (320 - 90) * height;
    const paths = states.map((state, index) => `<path d="${state.frequencies.map((f, i) => `${i ? 'L' : 'M'}${sx(f).toFixed(1)},${sy(state.velocities[i]).toFixed(1)}`).join(' ')}" fill="none" stroke="${colors[index]}" stroke-width="${models[index] === v.model ? 7 : 3}"/>`).join('');
    const selected = states[models.indexOf(v.model)];
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><line x1="${x0}" y1="${y0 + height}" x2="${x0 + width}" y2="${y0 + height}" stroke="${C.muted}"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + height}" stroke="${C.muted}"/>${paths}<line x1="${sx(v.frequency)}" y1="${y0}" x2="${sx(v.frequency)}" y2="${y0 + height}" stroke="${C.ink}" stroke-dasharray="6 5"/><circle cx="${sx(v.frequency)}" cy="${sy(selected.convectionVelocity)}" r="8" fill="${C.ink}"/><text x="770" y="92" font-size="13" fill="${C.muted}">selected Uc</text><text x="770" y="132" font-size="30" font-weight="700" fill="${C.ink}">${fmt(selected.convectionVelocity, 1)} m/s</text><text x="770" y="184" font-size="13" fill="${C.muted}">Uc/U∞</text><text x="770" y="220" font-size="25" font-weight="700" fill="${C.teal}">${fmt(selected.convectionFraction, 3)}</text><text x="770" y="285" font-size="12" fill="${C.ink}">${esc(selected.flowRegime)}</text>`;
  });
}

function mountEquipment(root) {
  return mountLab(root, [
    { key: 'mass', stateKey: 'equipmentMass', label: 'Equipment mass', min: 0, max: 180, step: 2, value: 45, unit: ' kg' },
    { key: 'footprint', stateKey: 'footprintArea', label: 'Footprint area', min: 0.05, max: 2, step: 0.05, value: 0.35, unit: ' m²' },
    { key: 'surface', stateKey: 'structureSurfaceMass', label: 'Panel surface mass', min: 2, max: 45, step: 1, value: 12, unit: ' kg/m²' }
  ], 'Global smearing and local footprint loading answer different questions. Their spread is a model-form uncertainty to resolve at critical equipment.', (svg, v) => {
    const state = equipmentLoadingState({ unloadedResponse: 12, bareStructureMass: 180, equipmentMass: v.mass, footprintArea: v.footprint, structureSurfaceMass: v.surface });
    const max = 12, globalHeight = 240 * state.globalResponse / max, localHeight = 240 * state.localResponse / max;
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><rect x="90" y="${340 - globalHeight}" width="220" height="${globalHeight}" fill="${C.teal}"/><rect x="390" y="${340 - localHeight}" width="220" height="${localHeight}" fill="${C.rust}"/><line x1="55" y1="340" x2="670" y2="340" stroke="${C.muted}"/><line x1="55" y1="100" x2="670" y2="100" stroke="${C.grid}" stroke-dasharray="6 5"/><text x="200" y="375" text-anchor="middle" font-size="13" fill="${C.muted}">global mass ratio</text><text x="500" y="375" text-anchor="middle" font-size="13" fill="${C.muted}">local footprint ratio</text><text x="200" y="${320 - globalHeight}" text-anchor="middle" font-size="22" font-weight="700" fill="${C.ink}">${fmt(state.globalResponse, 2)} g</text><text x="500" y="${320 - localHeight}" text-anchor="middle" font-size="22" font-weight="700" fill="${C.ink}">${fmt(state.localResponse, 2)} g</text><text x="735" y="118" font-size="13" fill="${C.muted}">method spread</text><text x="735" y="162" font-size="32" font-weight="700" fill="${C.ink}">${fmt(state.methodSpreadDb, 1)} dB</text><text x="735" y="220" font-size="12" fill="${C.muted}">equipment / panel area density</text><text x="735" y="252" font-size="23" font-weight="700" fill="${C.rust}">${fmt(state.localMassRatio, 1)}×</text>`;
  });
}

function mountResponse(root) {
  return mountLab(root, [
    { key: 'responseType', stateKey: 'responseType', label: 'Response population', type: 'select', value: 'broadband', options: [{ value: 'broadband', label: 'Broadband' }, { value: 'pure-tone', label: 'Pure tone' }] },
    { key: 'distance', stateKey: 'boundaryDistance', label: 'Distance from boundary', min: 0, max: 0.5, step: 0.01, value: 0.2, unit: ' m' },
    { key: 'loss', stateKey: 'lossFactor', label: 'Net loss factor', min: 0.002, max: 0.1, step: 0.001, value: 0.02 }
  ], 'SEA energy is a spatial average. Concentration and a quarter-wavelength boundary screen translate it toward a local engineering response.', (svg, v) => {
    const state = seaResponseRecoveryState({ kind: 'structural', responseType: v.responseType, energy: 0.02, frequency: 1000, mass: 120, modalDensity: 0.04, lossFactor: v.loss, dimension: 2, wavelength: 0.5, boundaryDistance: v.distance, length: 2.4, width: 1.4, thickness: 0.003, modulus: 70e9, density: 2700 });
    const points = Array.from({ length: 140 }, (_, index) => { const x = index / 139; const envelope = 0.35 + 0.65 * Math.sin(Math.PI * x) ** 2; return [70 + x * 650, 225 - 78 * envelope * Math.sin(5 * Math.PI * x)]; });
    const path = points.map((point, index) => `${index ? 'L' : 'M'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ');
    const locationX = 70 + clamp(v.distance / 0.5, 0, 1) * 650;
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><rect x="70" y="95" width="162" height="245" fill="${C.rust}" opacity=".18"/><rect x="70" y="95" width="650" height="245" fill="none" stroke="${C.grid}"/><path d="${path}" fill="none" stroke="${C.teal}" stroke-width="10" opacity=".75"/><line x1="${locationX}" y1="75" x2="${locationX}" y2="350" stroke="${C.ink}" stroke-dasharray="6 5"/><circle cx="${locationX}" cy="225" r="9" fill="${state.boundaryRegion ? C.rust : C.green}"/><text x="775" y="92" font-size="13" fill="${C.muted}">average velocity</text><text x="775" y="125" font-size="22" font-weight="700" fill="${C.ink}">${fmt(state.velocityRms, 4)} m/s</text><text x="775" y="180" font-size="13" fill="${C.muted}">local concentration</text><text x="775" y="218" font-size="30" font-weight="700" fill="${C.rust}">${fmt(state.concentrationAmplitudeFactor, 2)}×</text><text x="775" y="275" font-size="13" fill="${state.boundaryRegion ? C.rust : C.green}">${state.boundaryRegion ? 'inside λ/4 boundary region' : 'interior-distance screen'}</text>`;
  });
}

function mountRadiation(root) {
  return mountLab(root, [
    { key: 'model', stateKey: 'model', label: 'Radiator construction', type: 'select', value: 'baffled-panel', options: [{ value: 'baffled-panel', label: 'Baffled panel' }, { value: 'free-panel', label: 'Free panel' }, { value: 'honeycomb', label: 'Honeycomb' }, { value: 'ribbed-panel', label: 'Ribbed panel' }, { value: 'cylindrical-shell', label: 'Cylinder shell' }, { value: 'forced-field', label: 'Point-drive field' }] },
    { key: 'frequency', stateKey: 'frequency', label: 'Frequency', min: 50, max: 10000, step: 20, value: 1000, unit: ' Hz' },
    { key: 'thickness', stateKey: 'thicknessMm', label: 'Panel thickness', min: 0.5, max: 12, step: 0.1, value: 3, unit: ' mm' }
  ], 'Radiation efficiency, resistance, and panel-air CLF express the same energy path with different normalizations.', (svg, v) => {
    const state = radiationEfficiencyAtlasState({ model: v.model, frequency: v.frequency, length: 2.4, width: 1.4, thickness: v.thickness / 1000, modulus: 70e9, density: 2700, radius: 1.8, ribLength: 8, pointImpedance: 5000, reverberationTime: 0.25 });
    const x0 = 70, y0 = 55, width = 610, height = 290, minF = state.frequencies[0], maxF = state.frequencies.at(-1), minY = Math.max(1e-5, Math.min(...state.curve) / 2), maxY = Math.max(...state.curve) * 1.5;
    const sx = f => logPosition(f, minF, maxF, x0, width), sy = value => y0 + height - (Math.log10(Math.max(value, minY)) - Math.log10(minY)) / Math.log10(maxY / minY) * height;
    const path = state.frequencies.map((f, i) => `${i ? 'L' : 'M'}${sx(f).toFixed(1)},${sy(state.curve[i]).toFixed(1)}`).join(' ');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><line x1="${x0}" y1="${y0 + height}" x2="${x0 + width}" y2="${y0 + height}" stroke="${C.muted}"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + height}" stroke="${C.muted}"/><path d="${path}" fill="none" stroke="${C.teal}" stroke-width="6"/><line x1="${sx(state.criticalFrequency)}" y1="${y0}" x2="${sx(state.criticalFrequency)}" y2="${y0 + height}" stroke="${C.rust}" stroke-dasharray="6 5"/><circle cx="${sx(state.frequency)}" cy="${sy(state.totalEfficiency)}" r="8" fill="${C.ink}"/><text x="735" y="92" font-size="13" fill="${C.muted}">radiation efficiency</text><text x="735" y="132" font-size="30" font-weight="700" fill="${C.ink}">${fmt(state.totalEfficiency, 3)}</text><text x="735" y="190" font-size="13" fill="${C.muted}">panel → air CLF</text><text x="735" y="228" font-size="24" font-weight="700" fill="${C.teal}">${fmt(state.panelAirClf, 5)}</text><text x="735" y="285" font-size="12" fill="${C.rust}">fc ${fmt(state.criticalFrequency, 0)} Hz</text><text x="735" y="320" font-size="12" fill="${C.ink}">${esc(state.regime)}</text>`;
  });
}

function mountFairing(root) {
  return mountLab(root, [
    { key: 'coverage', stateKey: 'blanketCoverage', label: 'Blanket coverage', min: 0, max: 100, step: 1, value: 80, unit: '%' },
    { key: 'il', stateKey: 'blanketInsertionLoss', label: 'Blanket IL', min: 0, max: 35, step: 1, value: 18, unit: ' dB' },
    { key: 'leak', stateKey: 'leakAreaPercent', label: 'Leak / opening area', min: 0, max: 2, step: 0.02, value: 0.05, unit: '%' },
    { key: 'equipment', stateKey: 'equipmentMass', label: 'Installed equipment', min: 0, max: 800, step: 10, value: 250, unit: ' kg' }
  ], 'Coverage and openings combine in linear transmission space. Watch the direct path become the installed-performance ceiling.', (svg, v) => {
    const state = installedFairingSeaState({ frequency: 1000, outsideLevel: 145, area: 55, interiorVolume: 75, surfaceMass: 8.5, shellModalDensity: 0.045, shellLossFactor: 0.018, radiationEfficiency: 0.35, blanketCoverage: v.coverage / 100, blanketInsertionLoss: v.il, blanketAbsorption: 0.65, equipmentMass: v.equipment, leakAreaFraction: v.leak / 100 });
    const resonant = Math.max(state.resonantPower, 0), direct = Math.max(state.directPower, 0), max = Math.max(resonant, direct, 1e-12), rW = 20 + 26 * Math.log10(1 + 9 * resonant / max), dW = 20 + 26 * Math.log10(1 + 9 * direct / max);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/><rect x="45" y="120" width="190" height="190" rx="8" fill="${C.teal}"/><rect x="430" y="90" width="55" height="250" fill="${C.dark}"/><rect x="495" y="90" width="45" height="250" fill="${C.rust}"/><rect x="760" y="150" width="195" height="160" rx="8" fill="${C.pale}"/><text x="140" y="206" text-anchor="middle" font-size="15" fill="${C.paper}">exterior field</text><text x="140" y="242" text-anchor="middle" font-size="24" font-weight="700" fill="${C.paper}">${fmt(state.sourceLevel, 1)} dB</text><text x="858" y="215" text-anchor="middle" font-size="15" fill="${C.ink}">payload cavity</text><text x="858" y="255" text-anchor="middle" font-size="25" font-weight="700" fill="${C.ink}">${fmt(state.receiverLevel, 1)} dB</text><path d="M245 160 H420" stroke="${C.rust}" stroke-width="${rW}"/><path d="M540 160 H750" stroke="${C.rust}" stroke-width="${rW}"/><path d="M245 285 C400 390 620 390 750 285" fill="none" stroke="${C.grid}" stroke-width="${dW}"/><text x="340" y="125" font-size="12" fill="${C.rust}">resonant ${fmt(resonant, 4)} W</text><text x="500" y="405" text-anchor="middle" font-size="12" fill="${C.muted}">direct / opening ${fmt(direct, 4)} W</text><text x="585" y="58" text-anchor="middle" font-size="17" font-weight="700" fill="${C.ink}">Installed NR ${fmt(state.installedNoiseReduction, 1)} dB · component TL ${fmt(state.componentMassLawTl, 1)} dB</text>`;
  });
}

const mounts = Object.freeze({
  'sea-parameter-chain': mountParameterChain,
  'modal-density-regime-map': mountModalDensity,
  'sea-driving-point-mobility': mountMobility,
  'sea-coupling-mechanisms': mountClf,
  'environment-to-sea-power': mountPower,
  'tbl-convection-velocity-map': mountConvection,
  'equipment-smearing-map': mountEquipment,
  'sea-local-response': mountResponse,
  'radiation-efficiency-construction-map': mountRadiation,
  'fairing-blanket-network': mountFairing
});

export function mountSeaParameterDemo(root, id) {
  const mount = mounts[id];
  return mount ? mount(root) : null;
}
