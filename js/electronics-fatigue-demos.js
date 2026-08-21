/* Interactive electronics-fatigue labs sharing the calculator physics and visual language. */
import {
  STEINBERG_COMPONENTS,
  componentPlacementState,
  pcbDesignTradeState,
  pcbModeCurvatureState,
  pcbRandomResponseState,
  pcbTestCorrelationState,
  pcbTestLayoutState,
  spectralFatigueComparisonState,
  steinbergDamageLedgerState,
  steinbergDisplacementState,
  synthesizedRainflowState,
  threeSigmaDurationState
} from './electronics-fatigue-physics.js';
import { electronicsFatigueVisualSvg } from './electronics-fatigue-visuals.js';

const C = Object.freeze({ ink: '#172027', teal: '#1e6077', dark: '#164453', rust: '#b96d37', muted: '#657176', grid: '#ada497', wash: '#e7e2d8', green: '#376e56', red: '#a64535', purple: '#744f78' });
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fmt = (value, digits = 2) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '') : '—';
const packages = Object.entries(STEINBERG_COMPONENTS).map(([value, item]) => ({ value, label: `${item.label} · C=${item.coefficient}` }));

function controlMarkup(item) {
  const id = `ef-${item.key}`;
  if (item.type === 'select') return `<div class="demo-control"><label for="${id}">${esc(item.label)}</label><select id="${id}" data-acs-key="${esc(item.key)}">${item.options.map(option => `<option value="${esc(option.value)}" ${option.value === item.value ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}</select></div>`;
  return `<div class="demo-control"><label for="${id}">${esc(item.label)} <output id="ef-out-${item.key}">${esc(item.value)}${esc(item.unit ?? '')}</output></label><input id="${id}" data-acs-key="${esc(item.key)}" type="range" min="${item.min}" max="${item.max}" step="${item.step}" value="${item.value}"></div>`;
}

function interactiveShell(root, { controls, caption, visual, directPlacement = null, animate = null }) {
  root.classList.add('electronics-fatigue-demo');
  root.innerHTML = `<div class="demo-controls">${controls.map(controlMarkup).join('')}${animate ? '<div class="demo-control"><label>Board motion</label><button type="button" class="button-secondary" data-ef-animation-toggle aria-pressed="true">Pause motion</button></div>' : ''}<div class="demo-control demo-comparison-control"><label>Scenario comparison</label><div><button type="button" class="button-secondary" data-ef-pin-baseline>Pin current</button><button type="button" class="button-quiet" data-ef-clear-baseline hidden>Clear baseline</button></div><output data-ef-baseline-status>No baseline pinned</output></div></div><div class="demo-canvas-wrap" ${directPlacement ? 'data-direct-map="true"' : ''}></div><div class="demo-caption">${caption}</div>`;
  const canvas = root.querySelector('.demo-canvas-wrap');
  const inputs = Object.fromEntries([...root.querySelectorAll('[data-acs-key]')].map(element => [element.dataset.acsKey, element]));
  const values = () => Object.fromEntries(Object.entries(inputs).map(([key, element]) => [key, element.tagName === 'SELECT' ? element.value : Number(element.value)]));
  let phase = 1;
  let baselineViews = null;
  const normalizeVisuals = output => (Array.isArray(output) ? output : [output]).filter(Boolean);
  const panel = (view, label, attributes = '') => `<section class="demo-visual-panel" ${attributes}><div class="demo-visual-panel-label">${esc(label)}</div>${electronicsFatigueVisualSvg(view)}</section>`;
  const render = () => {
    const current = values();
    controls.filter(item => item.type !== 'select').forEach(item => {
      const digits = item.step < .01 ? 3 : item.step < 1 ? 2 : 0;
      root.querySelector(`#ef-out-${item.key}`).textContent = `${fmt(current[item.key], digits)}${item.unit ?? ''}`;
    });
    const currentViews = normalizeVisuals(visual(current, phase));
    const primary = baselineViews
      ? `<div class="demo-comparison-grid">${panel(baselineViews[0], 'Pinned baseline', 'data-baseline-visual')}${panel(currentViews[0], 'Current scenario', 'data-current-visual')}</div>`
      : panel(currentViews[0], 'Current scenario', 'data-current-visual');
    const supporting = currentViews.slice(1).map((view, index) => panel(view, `Linked view ${index + 2}`, `data-linked-visual="${index + 1}"`)).join('');
    canvas.innerHTML = `<div class="demo-visual-stack">${primary}${supporting}</div>`;
    root.querySelector('[data-ef-clear-baseline]').hidden = !baselineViews;
    root.querySelector('[data-ef-baseline-status]').textContent = baselineViews ? 'Baseline held while controls change' : 'No baseline pinned';
  };
  const onInput = () => render();
  Object.values(inputs).forEach(input => { input.addEventListener('input', onInput); input.addEventListener('change', onInput); });

  let dragging = false;
  const moveComponent = event => {
    if (!directPlacement || (!dragging && event.type !== 'pointerdown')) return;
    const activePanel = canvas.querySelector('[data-current-visual]');
    if (!activePanel || !activePanel.contains(event.target)) return;
    const bounds = activePanel.getBoundingClientRect();
    const svg = activePanel.querySelector('svg'), viewBox = svg?.viewBox?.baseVal;
    const visualWidth = viewBox?.width || 1000, visualHeight = viewBox?.height || 560;
    const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1) * visualWidth;
    const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1) * visualHeight;
    const mapped = directPlacement(x, y);
    if (!mapped) return;
    for (const [key, value] of Object.entries(mapped)) if (inputs[key]) inputs[key].value = value;
    render();
  };
  const pointerDown = event => { dragging = true; canvas.setPointerCapture?.(event.pointerId); moveComponent(event); };
  const pointerMove = event => { if (dragging) moveComponent(event); };
  const pointerUp = event => { dragging = false; canvas.releasePointerCapture?.(event.pointerId); };
  if (directPlacement) {
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
  }

  let frameId = 0, running = Boolean(animate) && !matchMedia('(prefers-reduced-motion: reduce)').matches, lastFrame = 0;
  const animationButton = root.querySelector('[data-ef-animation-toggle]');
  const pinButton = root.querySelector('[data-ef-pin-baseline]');
  const clearBaselineButton = root.querySelector('[data-ef-clear-baseline]');
  const frame = time => {
    if (!running) return;
    if (time - lastFrame > 34) {
      phase = Math.sin(time * .001 * Math.max(.1, Number(values()[animate.speedKey] || 1)) * Math.PI * 2);
      render();
      lastFrame = time;
    }
    frameId = requestAnimationFrame(frame);
  };
  const setRunning = next => {
    running = next;
    if (animationButton) { animationButton.textContent = running ? 'Pause motion' : 'Play motion'; animationButton.setAttribute('aria-pressed', String(running)); }
    if (running) { cancelAnimationFrame(frameId); frameId = requestAnimationFrame(frame); }
  };
  const toggleAnimation = () => setRunning(!running);
  animationButton?.addEventListener('click', toggleAnimation);
  const pinBaseline = () => { baselineViews = normalizeVisuals(visual(values(), 1)); render(); };
  const clearBaseline = () => { baselineViews = null; render(); };
  pinButton?.addEventListener('click', pinBaseline);
  clearBaselineButton?.addEventListener('click', clearBaseline);
  render();
  if (running) frameId = requestAnimationFrame(frame); else setRunning(false);

  return () => {
    cancelAnimationFrame(frameId);
    Object.values(inputs).forEach(input => { input.removeEventListener('input', onInput); input.removeEventListener('change', onInput); });
    animationButton?.removeEventListener('click', toggleAnimation);
    pinButton?.removeEventListener('click', pinBaseline); clearBaselineButton?.removeEventListener('click', clearBaseline);
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp);
    root.classList.remove('electronics-fatigue-demo');
  };
}

const preview = inner => `<svg viewBox="0 0 520 180" aria-hidden="true"><rect width="520" height="180" fill="${C.wash}"/>${inner}</svg>`;
const previewMap = {
  'electronics-relative-motion': preview('<rect x="25" y="24" width="286" height="128" rx="5" fill="#dce9ec" stroke="#164453" stroke-width="4"/><ellipse cx="168" cy="88" rx="118" ry="48" fill="#1e6077" opacity=".65"/><rect x="142" y="66" width="54" height="34" rx="4" fill="#b96d37"/><path d="M335 136C380 136 390 55 435 55S480 136 500 136" fill="none" stroke="#1e6077" stroke-width="7"/><path d="M431 53l-10-20m18 20l10-20" stroke="#a64535" stroke-width="5"/>'),
  'electronics-psd-response-chain': preview('<path d="M30 38H390M30 78H390M30 118H390M30 158H390" stroke="#ada497"/><path d="M35 34H115V20H230V31H385" fill="none" stroke="#657176" stroke-width="4"/><path d="M35 76C170 75 195 74 220 50C245 74 300 75 385 76" fill="none" stroke="#b96d37" stroke-width="4"/><path d="M35 116C170 116 200 110 220 84C245 110 300 116 385 116" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M35 156C170 156 200 150 220 125C245 150 300 156 385 156" fill="none" stroke="#744f78" stroke-width="5"/><path d="M220 12V168" stroke="#a64535" stroke-dasharray="6 4"/>'),
  'electronics-component-map': preview('<rect x="25" y="20" width="330" height="140" rx="5" fill="#dce9ec" stroke="#164453" stroke-width="4"/><path d="M190 20V160M25 90H355" stroke="#fff" stroke-width="3" stroke-dasharray="6 4"/><ellipse cx="108" cy="56" rx="70" ry="28" fill="#1e6077" opacity=".65"/><ellipse cx="270" cy="124" rx="70" ry="28" fill="#b96d37" opacity=".65"/><g stroke="#fff" stroke-width="2"><rect x="152" y="70" width="58" height="38" fill="#a64535"/><rect x="68" y="42" width="38" height="22" fill="#376e56"/></g><g transform="translate(385 28)"><rect width="48" height="42" fill="#1e6077" opacity=".7"/><rect x="58" width="48" height="42" fill="#b96d37" opacity=".7"/><rect y="55" width="48" height="42" fill="#b96d37" opacity=".7"/><rect x="58" y="55" width="48" height="42" fill="#1e6077" opacity=".7"/><rect y="110" width="48" height="25" fill="#1e6077" opacity=".5"/><rect x="58" y="110" width="48" height="25" fill="#b96d37" opacity=".5"/></g>'),
  'electronics-three-sigma-duration': preview('<path d="M25 45H330" stroke="#657176"/><path d="M28 45C45 8 63 84 82 38S119 10 139 52S177 75 196 31S235 12 254 57S294 78 326 34" fill="none" stroke="#1e6077" stroke-width="4"/><path d="M25 18H330M25 72H330" stroke="#a64535" stroke-dasharray="6 4"/><g transform="translate(25 98)"><rect width="28" height="22" fill="#e7e2d8"/><rect x="30" width="28" height="22" fill="#b96d37" opacity=".35"/><rect x="60" width="28" height="22" fill="#b96d37" opacity=".62"/><rect x="90" width="28" height="22" fill="#a64535" opacity=".88"/><rect y="24" width="28" height="22" fill="#e7e2d8"/><rect x="30" y="24" width="28" height="22" fill="#b96d37" opacity=".5"/><rect x="60" y="24" width="28" height="22" fill="#a64535" opacity=".78"/><rect x="90" y="24" width="28" height="22" fill="#a64535"/></g><g transform="translate(175 96)"><rect y="50" width="18" height="14" fill="#a64535"/><rect x="24" y="43" width="18" height="21" fill="#a64535"/><rect x="48" y="26" width="18" height="38" fill="#a64535"/><rect x="72" y="8" width="18" height="56" fill="#a64535"/><rect x="96" y="38" width="18" height="26" fill="#a64535"/><path d="M0 64H125" stroke="#657176"/></g><text x="392" y="66" font-size="17" fill="#172027">3σ → cycles</text><text x="392" y="112" font-size="17" fill="#a64535">cycles → damage</text>'),
  'electronics-fatigue-ledger': preview('<path d="M25 145H360M25 145V25" stroke="#657176"/><path d="M30 138H95V125H160V64H225V52H290V48H355" fill="none" stroke="#a64535" stroke-width="6"/><path d="M25 48H360" stroke="#a64535" stroke-dasharray="7 4"/><rect x="395" y="38" width="100" height="18" fill="#b96d37"/><rect x="395" y="80" width="58" height="18" fill="#1e6077"/><rect x="395" y="122" width="24" height="18" fill="#376e56"/>'),
  'electronics-thickness-support-trade': preview('<rect x="30" y="25" width="350" height="130" fill="#376e56" opacity=".72"/><path d="M30 52C120 66 210 91 380 142L380 25H30Z" fill="#a64535" opacity=".82"/><path d="M30 52C120 66 210 91 380 142" fill="none" stroke="#fff" stroke-width="5"/><circle cx="260" cy="104" r="10" fill="#172027" stroke="#fff" stroke-width="3"/><path d="M415 132L490 48" stroke="#172027" stroke-width="5" marker-end="url(#p-arrow)"/><defs><marker id="p-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#172027"/></marker></defs>'),
  'electronics-test-correlation': preview('<rect x="22" y="22" width="280" height="136" rx="5" fill="#dce9ec" stroke="#164453" stroke-width="4"/><ellipse cx="162" cy="90" rx="110" ry="45" fill="#1e6077" opacity=".35"/><circle cx="162" cy="90" r="10" fill="#1e6077" stroke="#fff" stroke-width="3"/><circle cx="260" cy="126" r="10" fill="#1e6077" stroke="#fff" stroke-width="3"/><path d="M195 75L207 87L195 99L183 87Z" fill="#b96d37" stroke="#fff" stroke-width="3"/><rect x="222" y="70" width="22" height="16" fill="#744f78" stroke="#fff" stroke-width="2"/><path d="M315 48H372M315 90H372M315 132H372" stroke="#657176" stroke-width="5"/><path d="M372 48L398 48V90H422V132H448" fill="none" stroke="#1e6077" stroke-width="4"/><path d="M342 148C382 146 397 55 430 52C460 58 474 140 500 144" fill="none" stroke="#b96d37" stroke-width="5"/>')
};

export const electronicsFatigueSupportedDemoIds = Object.freeze(Object.keys(previewMap));
export function electronicsFatiguePreviewSvg(id) { return previewMap[id] || ''; }

function mountRelativeMotion(root) {
  return interactiveShell(root, {
    controls: [
      { key: 'response', label: 'Board-center response 3σ', min: .03, max: .8, step: .01, value: .28, unit: ' mm' },
      { key: 'x_fraction', label: 'Component position x/L', min: .04, max: .96, step: .01, value: .5 },
      { key: 'y_fraction', label: 'Component position y/W', min: .04, max: .96, step: .01, value: .5 },
      { key: 'thickness', label: 'Board thickness', min: .8, max: 3.2, step: .1, value: 1.6, unit: ' mm' },
      { key: 'package', label: 'Package family', type: 'select', value: 'bga', options: packages },
      { key: 'speed', label: 'Visual motion speed', min: .1, max: 1.5, step: .1, value: .45, unit: '×' }
    ],
    animate: { speedKey: 'speed' },
    directPlacement: (x, y) => x >= 58 && x <= 598 && y >= 92 && y <= 368 ? { x_fraction: (x - 58) / 540, y_fraction: (y - 92) / 276 } : null,
    caption: 'Drag the component directly across the plan view. The side section exaggerates a common visual phase so attachment deformation is visible; the numerical displacement remains the entered 3σ response.',
    visual: (values, phase) => {
      const component = STEINBERG_COMPONENTS[values.package];
      const state = steinbergDisplacementState({ boardSpanMm: 180, boardThicknessMm: values.thickness, componentLengthMm: 25, componentCoefficient: component.coefficient, xFraction: values.x_fraction, yFraction: values.y_fraction, response3SigmaMm: values.response });
      return { kind: 'pcb-motion', title: 'Drag the package through the board response field', state, xFraction: values.x_fraction, yFraction: values.y_fraction, packageLabel: component.label, phase };
    }
  });
}

function mountPsdResponse(root) {
  return interactiveShell(root, {
    controls: [
      { key: 'natural_frequency', label: 'PCB natural frequency', min: 40, max: 1200, step: 5, value: 320, unit: ' Hz' },
      { key: 'quality_factor', label: 'Modal Q', min: 2, max: 30, step: .5, value: 10 },
      { key: 'level', label: 'PSD level scale', min: .25, max: 3, step: .05, value: 1, unit: '×' }
    ],
    caption: 'The red cursor aligns the input, transfer function, acceleration response, and relative-displacement response. Move the mode across PSD breakpoints and watch where displacement variance accumulates.',
    visual: values => {
      const spectrum = [[20,.01],[80,.04],[350,.04],[1000,.008],[2000,.008]].map(([frequency,psd])=>({frequency,psd:psd*values.level}));
      const state = pcbRandomResponseState({ spectrum, naturalFrequencyHz: values.natural_frequency, qualityFactor: values.quality_factor, durationSeconds: 60 });
      return { kind: 'response-chain', title: 'Move one PCB mode through the input spectrum', state, naturalFrequencyHz: values.natural_frequency, qualityFactor: values.quality_factor };
    }
  });
}

function mountComponentMap(root) {
  return interactiveShell(root, {
    controls: [
      { key: 'x_fraction', label: 'Selected component x/L', min: .04, max: .96, step: .01, value: .5 },
      { key: 'y_fraction', label: 'Selected component y/W', min: .04, max: .96, step: .01, value: .5 },
      { key: 'package', label: 'Selected package', type: 'select', value: 'lccc', options: packages },
      { key: 'center_response', label: 'Center response 3σ', min: .03, max: .8, step: .01, value: .3, unit: ' mm' },
      { key: 'mode', label: 'Mode-shape overlay', type: 'select', value: '1,1', options: [{value:'1,1',label:'Mode 1 × 1 · screening basis'},{value:'2,1',label:'Mode 2 × 1 · sensitivity overlay'},{value:'1,2',label:'Mode 1 × 2 · sensitivity overlay'},{value:'2,2',label:'Mode 2 × 2 · sensitivity overlay'},{value:'3,1',label:'Mode 3 × 1 · sensitivity overlay'},{value:'1,3',label:'Mode 1 × 3 · sensitivity overlay'}] },
      { key: 'field', label: 'Linked mechanics field', type: 'select', value: 'surface-strain', options: [{value:'displacement',label:'Transverse displacement'},{value:'curvature-x',label:'X curvature'},{value:'curvature-y',label:'Y curvature'},{value:'surface-strain',label:'Governing surface strain'}] }
    ],
    directPlacement: (x, y) => x >= 55 && x <= 665 && y >= 90 && y <= 450 ? { x_fraction: (x - 55) / 610, y_fraction: (y - 90) / 360 } : null,
    caption: 'Drag SELECTED around the board and compare it with fixed components. Higher-mode overlays are shape-sensitivity warnings; the demand ratios remain the documented first-mode Steinberg screen.',
    visual: values => {
      const components = [
        { name: 'SELECTED', xFraction: values.x_fraction, yFraction: values.y_fraction, lengthMm: 25, axis: 'x', package: values.package },
        { name: 'J1', xFraction: .16, yFraction: .52, lengthMm: 42, axis: 'y', package: 'ceramic' },
        { name: 'C17', xFraction: .76, yFraction: .23, lengthMm: 12, axis: 'x', package: 'axial' },
        { name: 'U9', xFraction: .82, yFraction: .78, lengthMm: 18, axis: 'y', package: 'lccc' }
      ];
      const state = componentPlacementState({ boardSpanXMm: 180, boardSpanYMm: 120, boardThicknessMm: 1.6, center3SigmaMm: values.center_response, components });
      const [modeX,modeY]=values.mode.split(',').map(Number);
      const modeState = pcbModeCurvatureState({ boardSpanXMm: 180, boardSpanYMm: 120, boardThicknessMm: 1.6, peakDisplacementMm: values.center_response, modeX, modeY, components });
      return [
        { kind: 'component-risk-map', title: 'Drag a component and watch the risk ranking change', state, modeX, modeY, selectedName: 'SELECTED' },
        { kind: 'mode-curvature', title: 'Switch from displacement to the curvature and strain fields', state: modeState, field: values.field }
      ];
    }
  });
}

function mountThreeSigma(root) {
  return interactiveShell(root, {
    controls: [
      { key: 'duration', label: 'Exposure duration', min: 1, max: 3600, step: 1, value: 60, unit: ' s' },
      { key: 'peak_rate', label: 'Independent peak rate', min: 1, max: 800, step: 1, value: 300, unit: ' Hz' },
      { key: 'stress_rms', label: 'Alternating stress RMS', min: 2, max: 25, step: .5, value: 10, unit: ' MPa' },
      { key: 'bandwidth', label: 'Fractional response bandwidth', min: .04, max: 1, step: .02, value: .2 }
    ],
    caption: 'The first view shows why duration invalidates a fixed 3σ maximum. The linked deterministic synthesis then exposes turning points, rainflow cycles, and which amplitudes consume the S–N damage budget.',
    visual: values => [
      { kind: 'peak-duration', title: 'Watch 3σ lose its maximum interpretation', ...threeSigmaDurationState({ durationSeconds: values.duration, independentPeakRateHz: values.peak_rate }), durationSeconds: values.duration, peakRateHz: values.peak_rate },
      { kind: 'time-rainflow', title: 'Follow a synthesized response through rainflow damage', state: synthesizedRainflowState({ stressRms: values.stress_rms, dominantFrequencyHz: values.peak_rate, fractionalBandwidth: values.bandwidth, durationSeconds: values.duration, repeats: 1, referenceStress: 40, referenceCycles: 20_000_000, fatigueExponent: 6.4, seed: 537 }) }
    ]
  });
}

function mountLedger(root) {
  return interactiveShell(root, {
    controls: [
      { key: 'qualification_response', label: 'Qualification response 3σ', min: .12, max: .5, step: .005, value: .31, unit: ' mm' },
      { key: 'flight_response', label: 'Flight response 3σ', min: .08, max: .4, step: .005, value: .18, unit: ' mm' },
      { key: 'qualification_repeats', label: 'Qualification / retest repeats', min: 1, max: 6, step: 1, value: 1 },
      { key: 'fatigue_exponent', label: 'Response-life exponent b', min: 3, max: 10, step: .1, value: 6.4 }
    ],
    caption: 'The log cumulative staircase keeps small contributions visible while the Pareto view identifies the event that controls. Add a retest repeat and see exactly where it enters the budget.',
    visual: values => {
      const state = steinbergDamageLedgerState({ allowable3SigmaMm: .3, fatigueExponent: values.fatigue_exponent, events: [
        { name: 'Acceptance', response3SigmaMm: .22, durationSeconds: 60, repeats: 1, cycleRateHz: 320 },
        { name: values.qualification_repeats > 1 ? `Qualification ×${values.qualification_repeats}` : 'Qualification', response3SigmaMm: values.qualification_response, durationSeconds: 120, repeats: values.qualification_repeats, cycleRateHz: 320 },
        { name: 'Flight ×4', response3SigmaMm: values.flight_response, durationSeconds: 480, repeats: 4, cycleRateHz: 280 },
        { name: 'Transport', response3SigmaMm: .08, durationSeconds: 7200, repeats: 8, cycleRateHz: 35 }
      ] });
      return { kind: 'mission-damage', title: 'See where test and mission life are consumed', state };
    }
  });
}

function mountTrade(root) {
  return interactiveShell(root, {
    controls: [
      { key: 'thickness', label: 'Candidate thickness', min: .8, max: 3.6, step: .1, value: 2, unit: ' mm' },
      { key: 'effective_span', label: 'Effective support span', min: 60, max: 180, step: 2, value: 180, unit: ' mm' },
      { key: 'psd_slope', label: 'Local PSD slope', min: -4, max: 4, step: .1, value: 0 }
    ],
    caption: 'The map exposes the pass/fail boundary in two design variables. The reference-to-candidate arrow shows whether a thickness or support change is moving into a viable region.',
    visual: values => {
      const state = pcbDesignTradeState({ referenceSpanMm: 180, effectiveSpanMm: values.effective_span, referenceThicknessMm: 1.6, thicknessMm: values.thickness, referenceNaturalFrequencyHz: 300, referenceCenter3SigmaMm: .3, localPsdSlope: values.psd_slope, componentLengthMm: 25, componentCoefficient: 1.75, locationFactor: 1 });
      return { kind: 'design-space', title: 'Explore the board design space, not one thickness slice', state, referenceSpanMm: 180, referenceThicknessMm: 1.6 };
    }
  });
}

function mountCorrelation(root) {
  return interactiveShell(root, {
    controls: [
      { key: 'measured_frequency', label: 'Measured mode frequency', min: 220, max: 390, step: 1, value: 295, unit: ' Hz' },
      { key: 'measured_q', label: 'Measured modal Q', min: 2, max: 20, step: .25, value: 7 },
      { key: 'measured_response', label: 'Measured peak response 3σ', min: .12, max: .42, step: .005, value: .29, unit: ' mm' },
      { key: 'fatigue_exponent', label: 'Response-life exponent b', min: 3, max: 10, step: .1, value: 6.4 },
      { key: 'channel', label: 'Highlighted correlation channel', type: 'select', value: 'SG-1', options: [
        { value: 'CTRL-1', label: 'CTRL-1 · Fixture control' }, { value: 'RESP-1', label: 'RESP-1 · PCB center response' },
        { value: 'RESP-2', label: 'RESP-2 · Mode-shape response' }, { value: 'SG-1', label: 'SG-1 · Strain rosette' },
        { value: 'DISP-1', label: 'DISP-1 · Relative displacement' }, { value: 'E-1', label: 'E-1 · Electrical continuity' }
      ] }
    ],
    directPlacement: (x, y) => {
      const sensors = [{id:'CTRL-1',x:84,y:458},{id:'RESP-1',x:322.5,y:262},{id:'RESP-2',x:493.7,y:328},{id:'SG-1',x:365.3,y:247},{id:'DISP-1',x:418.8,y:238},{id:'E-1',x:413.5,y:238}];
      const closest = sensors.map(sensor => ({ ...sensor, distance: Math.hypot(x - sensor.x, y - sensor.y) })).sort((a,b)=>a.distance-b.distance)[0];
      return closest?.distance <= 38 ? { channel: closest.id } : null;
    },
    caption: 'Click a planned channel on the PCB, then change the measured mode, damping, and response. The layout shows which part of the mechanical chain each channel closes; the linked curves show whether the evidence agrees.',
    visual: values => {
      const state = pcbTestCorrelationState({ predictedNaturalFrequencyHz: 320, measuredNaturalFrequencyHz: values.measured_frequency, predictedQualityFactor: 10, measuredQualityFactor: values.measured_q, predictedPeakResponseMm: .24, measuredPeakResponseMm: values.measured_response, fatigueExponent: values.fatigue_exponent, frequencyTolerancePercent: 10, responseToleranceDb: 3 });
      return [
        { kind: 'test-layout', title: 'Instrument the path from fixture control to observed failure', state: pcbTestLayoutState({ correlationState: state, selectedChannel: values.channel }) },
        { kind: 'test-correlation', title: 'Correlate response shape before accepting the fatigue prediction', state }
      ];
    }
  });
}

const mounts = {
  'electronics-relative-motion': mountRelativeMotion,
  'electronics-psd-response-chain': mountPsdResponse,
  'electronics-component-map': mountComponentMap,
  'electronics-three-sigma-duration': mountThreeSigma,
  'electronics-fatigue-ledger': mountLedger,
  'electronics-thickness-support-trade': mountTrade,
  'electronics-test-correlation': mountCorrelation
};

export function mountElectronicsFatigueDemo(root, id) { return mounts[id] ? mounts[id](root) : null; }
