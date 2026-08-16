import { SORBOTHANE_CATALOG, SORBOTHANE_DATA_VERSION, SORBOTHANE_MATERIAL, SORBOTHANE_REFERENCES, sorbothaneCatalogItem } from './sorbothane-data.js';
import {
  DEFAULT_SORBOTHANE_CONFIG,
  SORBOTHANE_UNITS,
  analyzeSorbothaneIsolation,
  normalizeSorbothaneConfig,
  rigidBodyResponseAtFrequency,
  runDesignGrid,
  sorbothaneDynamicProperties
} from './sorbothane-analysis.js';

const { INCH, LB, LBF, PSI } = SORBOTHANE_UNITS;
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const fmt = (value, digits = 2) => {
  if (!Number.isFinite(Number(value))) return '—';
  const fixed = Number(value).toFixed(digits);
  return digits === 0 ? fixed : fixed.replace(/\.?0+$/, '');
};
const deepClone = value => JSON.parse(JSON.stringify(value));
const pathGet = (object, path) => path.split('.').reduce((value, key) => value?.[/^\d+$/.test(key) ? +key : key], object);
const pathSet = (object, path, value) => {
  const keys = path.split('.');
  let target = object;
  for (const key of keys.slice(0, -1)) target = target[/^\d+$/.test(key) ? +key : key];
  target[/^\d+$/.test(keys.at(-1)) ? +keys.at(-1) : keys.at(-1)] = value;
};

const unitDefinitions = {
  length: {
    English: { unit: 'in', fromSI: value => value / INCH, toSI: value => value * INCH },
    SI: { unit: 'mm', fromSI: value => value * 1000, toSI: value => value / 1000 }
  },
  mass: {
    English: { unit: 'lbm', fromSI: value => value / LB, toSI: value => value * LB },
    SI: { unit: 'kg', fromSI: value => value, toSI: value => value }
  },
  inertia: {
    English: { unit: 'lbm·in²', fromSI: value => value / (LB * INCH ** 2), toSI: value => value * LB * INCH ** 2 },
    SI: { unit: 'kg·m²', fromSI: value => value, toSI: value => value }
  },
  force: {
    English: { unit: 'lbf', fromSI: value => value / LBF, toSI: value => value * LBF },
    SI: { unit: 'N', fromSI: value => value, toSI: value => value }
  },
  modulus: {
    English: { unit: 'psi', fromSI: value => value * 1e6 / PSI, toSI: value => value * PSI / 1e6 },
    SI: { unit: 'MPa', fromSI: value => value, toSI: value => value }
  },
  temperature: {
    English: { unit: '°F', fromSI: value => value * 9 / 5 + 32, toSI: value => (value - 32) * 5 / 9 },
    SI: { unit: '°C', fromSI: value => value, toSI: value => value }
  }
};

function displayValue(config, path, quantity) {
  const value = pathGet(config, path);
  return quantity ? unitDefinitions[quantity][config.units].fromSI(value) : value;
}

function input(config, path, label, options = {}) {
  const quantity = options.quantity ?? '';
  const definition = quantity ? unitDefinitions[quantity][config.units] : null;
  const value = displayValue(config, path, quantity);
  const unit = options.unit ?? definition?.unit ?? '';
  return `<label class="sorbo-field"><span>${esc(label)}${unit ? `<small>${esc(unit)}</small>` : ''}</span><input type="${options.type ?? 'number'}" data-sorbo-field="${esc(path)}"${quantity ? ` data-quantity="${quantity}"` : ''} value="${esc(fmt(value, options.digits ?? 4))}"${options.min != null ? ` min="${options.min}"` : ''}${options.max != null ? ` max="${options.max}"` : ''}${options.step != null ? ` step="${options.step}"` : ' step="any"'}/>${options.help ? `<em>${esc(options.help)}</em>` : ''}</label>`;
}

function derivedLengthInput(config, label, valueM, attribute, help = '') {
  const definition = unitDefinitions.length[config.units];
  return `<label class="sorbo-field"><span>${esc(label)}<small>${esc(definition.unit)}</small></span><input type="number" ${attribute} data-quantity="length" value="${esc(fmt(definition.fromSI(valueM), 4))}" step="any"/>${help ? `<em>${esc(help)}</em>` : ''}</label>`;
}

function select(config, path, label, choices, options = {}) {
  const value = pathGet(config, path);
  return `<label class="sorbo-field"><span>${esc(label)}${options.unit ? `<small>${esc(options.unit)}</small>` : ''}</span><select data-sorbo-field="${esc(path)}">${choices.map(choice => {
    const item = Array.isArray(choice) ? { value: choice[0], label: choice[1] } : choice;
    return `<option value="${esc(item.value)}"${String(value) === String(item.value) ? ' selected' : ''}>${esc(item.label)}</option>`;
  }).join('')}</select>${options.help ? `<em>${esc(options.help)}</em>` : ''}</label>`;
}

function group(title, body, open = false) {
  return `<details class="sorbo-input-group"${open ? ' open' : ''}><summary>${esc(title)}<span aria-hidden="true">+</span></summary><div>${body}</div></details>`;
}

function productOptions(selected) {
  const groups = ['custom', 'washer', 'ring', 'disc'];
  return groups.map(groupName => {
    const items = groupName === 'custom' ? SORBOTHANE_CATALOG.filter(item => item.productNumber === 'custom-ring') : SORBOTHANE_CATALOG.filter(item => item.geometry === groupName && item.productNumber !== 'custom-ring');
    if (!items.length) return '';
    const label = groupName === 'custom' ? 'Custom geometry' : `${groupName[0].toUpperCase()}${groupName.slice(1)}s - 2025 catalog`;
    return `<optgroup label="${label}">${items.map(item => `<option value="${item.productNumber}"${item.productNumber === selected ? ' selected' : ''}>${esc(item.productNumber)} · ${item.durometer} Shore 00 · ${fmt(item.odIn, 3)} × ${fmt(item.thicknessIn, 3)} in</option>`).join('')}</optgroup>`;
  }).join('');
}

function inputSidebar(config) {
  const [tone600, tone1200, tone1400] = config.analysis.tones;
  return `<aside class="sorbo-sidebar" aria-label="Isolation system inputs">
    <header><p class="eyebrow">Design inputs</p><h2>Four-point captured isolation</h2><label class="sorbo-unit-switch"><span>Display units</span><select data-sorbo-units><option${config.units === 'English' ? ' selected' : ''}>English</option><option${config.units === 'SI' ? ' selected' : ''}>SI</option></select></label></header>
    ${group('Component', [
      input(config, 'component.massKg', 'Mass', { quantity: 'mass', min: 0.01, step: 0.1 }),
      input(config, 'component.dimensionsM.0', 'X length', { quantity: 'length', min: 0.1, step: 0.05 }),
      input(config, 'component.dimensionsM.1', 'Y width', { quantity: 'length', min: 0.1, step: 0.05 }),
      input(config, 'component.dimensionsM.2', 'Z height', { quantity: 'length', min: 0.1, step: 0.05 })
    ].join(''), true)}
    ${group('CG & inertia', [
      input(config, 'component.cgM.0', 'CG X', { quantity: 'length', step: 0.01 }),
      input(config, 'component.cgM.1', 'CG Y', { quantity: 'length', step: 0.01 }),
      input(config, 'component.cgM.2', 'CG Z', { quantity: 'length', step: 0.01 }),
      select(config, 'component.inertiaMode', 'Inertia', [['auto', 'Uniform rectangular solid'], ['manual', 'Manual inertia tensor']]),
      `<div class="sorbo-manual-inertia" data-manual-inertia>${['Ixx', 'Iyy', 'Izz', 'Ixy', 'Ixz', 'Iyz'].map((label, index) => input(config, `component.inertiaKgM2.${index}`, label, { quantity: 'inertia', step: 0.01 })).join('')}</div>`
    ].join(''))}
    ${group('Mount geometry', [
      input(config, 'mounts.spacingM.0', 'X mount spacing', { quantity: 'length', min: 0.1, step: 0.05 }),
      input(config, 'mounts.spacingM.1', 'Y mount spacing', { quantity: 'length', min: 0.1, step: 0.05 }),
      derivedLengthInput(config, 'X edge inset', (config.component.dimensionsM[0] - config.mounts.spacingM[0]) / 2, 'data-sorbo-inset-axis="0"', 'Changing inset updates the corresponding center-to-center spacing.'),
      derivedLengthInput(config, 'Y edge inset', (config.component.dimensionsM[1] - config.mounts.spacingM[1]) / 2, 'data-sorbo-inset-axis="1"', 'Changing inset updates the corresponding center-to-center spacing.'),
      input(config, 'mounts.planeZM', 'Mount-plane Z from origin', { quantity: 'length', step: 0.01, help: 'The coordinate origin is the component footprint center on the isolated plate.' }),
      derivedLengthInput(config, 'Mount plane relative to CG', config.mounts.planeZM - config.component.cgM[2], 'data-sorbo-plane-relative', 'Negative values place the mount plane below the CG.'),
      input(config, 'mounts.stackTop', 'Upper stack count', { min: 1, max: 8, step: 1, digits: 0 }),
      input(config, 'mounts.stackBottom', 'Lower stack count', { min: 1, max: 8, step: 1, digits: 0 })
    ].join(''))}
    ${group('Sorbothane element', [
      `<label class="sorbo-field sorbo-product-field"><span>Catalog product<small>${SORBOTHANE_CATALOG.length - 1} records</small></span><input type="search" data-sorbo-product-search placeholder="Filter product number or geometry…"/><select data-sorbo-field="isolator.productNumber" data-sorbo-product>${productOptions(config.isolator.productNumber)}</select></label>`,
      select(config, 'isolator.geometry', 'Geometry', [['ring', 'Annular ring / washer'], ['disc', 'Solid disc']]),
      input(config, 'isolator.odM', 'Outer diameter', { quantity: 'length', min: 0.01, step: 0.01 }),
      input(config, 'isolator.idM', 'Inner diameter', { quantity: 'length', min: 0, step: 0.01 }),
      input(config, 'isolator.thicknessM', 'Element thickness', { quantity: 'length', min: 0.01, step: 0.01 }),
      select(config, 'isolator.durometer', 'Durometer', [[30, '30 Shore 00'], [50, '50 Shore 00'], [70, '70 Shore 00']])
    ].join(''), true)}
    ${group('Preload & acceleration', [
      select(config, 'isolator.preloadMode', 'Design basis', [['compression', 'Compression-driven'], ['preload', 'Preload-driven']]),
      input(config, 'isolator.compressionPct', 'Nominal compression', { unit: '%', min: 1, max: 30, step: 1 }),
      input(config, 'isolator.preloadN', 'Preload per element', { quantity: 'force', min: 0, step: 0.1 }),
      input(config, 'environment.accelerationG.0', 'Quasi-static X', { unit: 'g', step: 0.1 }),
      input(config, 'environment.accelerationG.1', 'Quasi-static Y', { unit: 'g', step: 0.1 }),
      input(config, 'environment.accelerationG.2', 'Additional Z', { unit: 'g', step: 0.1, help: 'Earth gravity is included; 0 g here means a total static vertical field of 1 g.' })
    ].join(''))}
    ${group('Dynamic material model', [
      select(config, 'isolator.extrapolation', 'Above 300 Hz', [
        ['log-linear', 'Log-linear modulus; hold tan δ'],
        ['hold', 'Hold last manufacturer value'],
        ['user', 'User-defined complex modulus'],
        ['constant-complex', 'Constant complex stiffness']
      ], { help: 'Manufacturer curves end at 300 Hz; this choice controls 600-2000 Hz predictions.' }),
      input(config, 'isolator.userModulusMPa', 'User storage modulus', { quantity: 'modulus', min: 0.001, step: 0.1 }),
      input(config, 'isolator.userTanDelta', 'User tan δ', { min: 0, max: 2, step: 0.01 }),
      input(config, 'isolator.poisson', 'Poisson ratio', { min: 0, max: 0.4995, step: 0.001 }),
      input(config, 'isolator.temperatureC', 'Temperature', { quantity: 'temperature', step: 1 })
    ].join(''))}
    ${group('Response & requirements', [
      select(config, 'analysis.excitationAxis', 'Base excitation', [['x', 'X translation'], ['y', 'Y translation'], ['z', 'Z translation']]),
      select(config, 'analysis.responsePoint', 'Response point', [['cg', 'Center of gravity'], ['corner-positive', '+X/+Y top corner'], ['corner-negative', '-X/-Y top corner']]),
      select(config, 'analysis.magnitudeScale', 'Plot scale', [['db', 'Amplitude dB'], ['linear', 'Linear magnitude']]),
      input(config, 'analysis.modeAvoidBandHz.0', 'Avoid band start', { unit: 'Hz', min: 1, step: 1 }),
      input(config, 'analysis.modeAvoidBandHz.1', 'Avoid band end', { unit: 'Hz', min: 1, step: 1 }),
      input(config, 'analysis.modeAcceptBandHz.0', 'Accepted band start', { unit: 'Hz', min: 1, step: 1 }),
      input(config, 'analysis.modeAcceptBandHz.1', 'Accepted band end', { unit: 'Hz', min: 1, step: 1 }),
      input(config, 'analysis.resonanceLimitDb', 'Max 100-200 Hz amplification', { unit: 'dB', step: 0.5 }),
      input(config, 'analysis.tones.0.maximumDb', `${fmt(tone600.frequencyHz, 0)} Hz maximum`, { unit: 'dB', step: 0.5 }),
      input(config, 'analysis.tones.1.maximumDb', `${fmt(tone1200.frequencyHz, 0)} Hz maximum`, { unit: 'dB', step: 0.5 }),
      input(config, 'analysis.tones.2.maximumDb', `${fmt(tone1400.frequencyHz, 0)} Hz maximum`, { unit: 'dB', step: 0.5 })
    ].join(''))}
    ${group('Uncertainty', [
      select(config, 'uncertainty.enabled', 'Envelope', [[true, 'Enabled'], [false, 'Disabled']]),
      input(config, 'uncertainty.samples', 'Monte Carlo samples', { min: 8, max: 80, step: 4, digits: 0 }),
      input(config, 'uncertainty.modulusPct', 'Dynamic modulus tolerance', { unit: '± %', min: 0, max: 100, step: 5 }),
      input(config, 'uncertainty.lossPct', 'Loss-factor tolerance', { unit: '± %', min: 0, max: 100, step: 5 }),
      input(config, 'uncertainty.massPct', 'Mass tolerance', { unit: '± %', min: 0, max: 50, step: 1 }),
      input(config, 'uncertainty.cgMm', 'CG tolerance', { unit: '± mm', min: 0, max: 50, step: 1 }),
      input(config, 'uncertainty.compressionPct', 'Compression tolerance', { unit: '± % points', min: 0, max: 10, step: 0.5 })
    ].join(''))}
    <div class="sorbo-sidebar-actions"><button class="button" type="button" data-sorbo-action="analyze">Recalculate</button><button class="button-quiet" type="button" data-sorbo-action="reset">Reset baseline</button></div>
  </aside>`;
}

function sceneSvg(config, analysis, modeIndex = null, phase = 0, camera = { yaw: -32, pitch: 24 }, amplitude = 1) {
  const [length, width, height] = config.component.dimensionsM;
  const [cgX, cgY, cgZ] = config.component.cgM;
  const plane = config.mounts.planeZM;
  const scale = 260 / Math.max(length, width, height * 2.2);
  const yaw = camera.yaw * Math.PI / 180;
  const pitch = camera.pitch * Math.PI / 180;
  const mode = modeIndex == null ? null : analysis.modes[modeIndex];
  const q = mode ? mode.vector.map(value => value * Math.sin(phase) * amplitude) : Array(6).fill(0);
  const displayTranslation = Math.max(length, width) * 0.055;
  const displayRotation = 0.12;
  const move = point => {
    const relative = [point[0] - cgX, point[1] - cgY, point[2] - cgZ];
    const translated = [
      point[0] + q[0] * displayTranslation + displayRotation * (q[4] * relative[2] - q[5] * relative[1]),
      point[1] + q[1] * displayTranslation + displayRotation * (q[5] * relative[0] - q[3] * relative[2]),
      point[2] + q[2] * displayTranslation + displayRotation * (q[3] * relative[1] - q[4] * relative[0])
    ];
    return translated;
  };
  const project = pointInput => {
    const point = move(pointInput);
    const x1 = point[0] * Math.cos(yaw) - point[1] * Math.sin(yaw);
    const y1 = point[0] * Math.sin(yaw) + point[1] * Math.cos(yaw);
    const y2 = y1 * Math.cos(pitch) - point[2] * Math.sin(pitch);
    const z2 = y1 * Math.sin(pitch) + point[2] * Math.cos(pitch);
    return [420 + x1 * scale, 250 + y2 * scale - z2 * scale * 0.18];
  };
  const baseProject = point => {
    const x1 = point[0] * Math.cos(yaw) - point[1] * Math.sin(yaw);
    const y1 = point[0] * Math.sin(yaw) + point[1] * Math.cos(yaw);
    const y2 = y1 * Math.cos(pitch) - point[2] * Math.sin(pitch);
    const z2 = y1 * Math.sin(pitch) + point[2] * Math.cos(pitch);
    return [420 + x1 * scale, 250 + y2 * scale - z2 * scale * 0.18];
  };
  const polygon = (points, className) => `<polygon class="${className}" points="${points.map(point => project(point).join(',')).join(' ')}"/>`;
  const basePolygon = (points, className) => `<polygon class="${className}" points="${points.map(point => baseProject(point).join(',')).join(' ')}"/>`;
  const corners = [
    [-length / 2, -width / 2, 0], [length / 2, -width / 2, 0], [length / 2, width / 2, 0], [-length / 2, width / 2, 0],
    [-length / 2, -width / 2, height], [length / 2, -width / 2, height], [length / 2, width / 2, height], [-length / 2, width / 2, height]
  ];
  const base = [[-length * .72, -width * .72, plane - height * .18], [length * .72, -width * .72, plane - height * .18], [length * .72, width * .72, plane - height * .18], [-length * .72, width * .72, plane - height * .18]];
  const mountXY = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [sx * config.mounts.spacingM[0] / 2, sy * config.mounts.spacingM[1] / 2]);
  const mounts = mountXY.map(([x, y], index) => {
    const bottom = baseProject([x, y, plane - height * .12]);
    const top = project([x, y, plane + height * .06]);
    return `<g class="sorbo-scene-mount"><line x1="${bottom[0]}" y1="${bottom[1]}" x2="${top[0]}" y2="${top[1]}"/><circle cx="${top[0]}" cy="${top[1]}" r="8"/><text x="${top[0] + 10}" y="${top[1] - 8}">${index + 1}</text></g>`;
  }).join('');
  const cg = project([cgX, cgY, cgZ]);
  const origin = baseProject([0, 0, plane]);
  const axis = (point, label, className) => { const end = baseProject(point); return `<g class="sorbo-axis ${className}"><line x1="${origin[0]}" y1="${origin[1]}" x2="${end[0]}" y2="${end[1]}"/><text x="${end[0] + 5}" y="${end[1] - 5}">${label}</text></g>`; };
  return `<svg class="sorbo-scene" viewBox="0 0 840 500" role="img" aria-label="Rotatable view of the component, center of gravity, isolated plate, and four captured Sorbothane mounts">
    ${basePolygon(base, 'sorbo-base-plane')}
    ${mounts}
    ${polygon([corners[0], corners[1], corners[2], corners[3]], 'sorbo-box-bottom')}
    ${polygon([corners[4], corners[5], corners[6], corners[7]], 'sorbo-box-top')}
    ${polygon([corners[0], corners[1], corners[5], corners[4]], 'sorbo-box-side side-a')}
    ${polygon([corners[1], corners[2], corners[6], corners[5]], 'sorbo-box-side side-b')}
    ${polygon([corners[2], corners[3], corners[7], corners[6]], 'sorbo-box-side side-c')}
    <g class="sorbo-cg"><circle cx="${cg[0]}" cy="${cg[1]}" r="10"/><path d="M${cg[0] - 14} ${cg[1]}h28M${cg[0]} ${cg[1] - 14}v28"/><text x="${cg[0] + 16}" y="${cg[1] - 12}">CG</text></g>
    ${axis([length * .38, 0, plane], 'X', 'axis-x')}${axis([0, width * .38, plane], 'Y', 'axis-y')}${axis([0, 0, plane + height * .5], 'Z', 'axis-z')}
  </svg>`;
}

function modeStatus(mode, config) {
  const [avoidStart, avoidEnd] = config.analysis.modeAvoidBandHz;
  const [acceptStart, acceptEnd] = config.analysis.modeAcceptBandHz;
  if (mode.frequencyHz >= avoidStart && mode.frequencyHz <= avoidEnd) return { className: 'is-review', label: 'AVOID BAND' };
  if (mode.frequencyHz >= acceptStart && mode.frequencyHz <= acceptEnd) return { className: 'is-pass', label: 'ACCEPTED BAND' };
  return { className: 'is-neutral', label: 'OUTSIDE DEFINED BANDS' };
}

function modeCards(analysis) {
  return analysis.modes.map(mode => {
    const status = modeStatus(mode, analysis.config);
    return `<button type="button" class="sorbo-mode-card ${status.className}" data-sorbo-mode="${mode.number - 1}"><span>Mode ${mode.number}<b>${status.label}</b></span><strong>${fmt(mode.frequencyHz, 1)} <small>Hz</small></strong><p>${esc(mode.dominant)}</p><em>Secondary: ${esc(mode.secondary)} · η ${fmt(mode.lossFactor, 2)}</em></button>`;
  }).join('');
}

function requirementTable(analysis) {
  const rows = analysis.toneResults.map(result => `<tr><td>${fmt(result.frequencyHz, 0)} Hz</td><td>${fmt(result.db, 1)} dB</td><td>≤ ${fmt(result.maximumDb, 1)} dB</td><td><span class="sorbo-status ${result.pass ? 'pass' : 'fail'}">${result.pass ? 'PASS' : 'FAIL'}</span></td><td>${esc(result.provenance.replaceAll('-', ' '))}</td></tr>`).join('');
  return `<div class="table-wrap"><table class="sorbo-requirements"><thead><tr><th>Target</th><th>Vertical T</th><th>Requirement</th><th>Status</th><th>Material basis</th></tr></thead><tbody>${rows}<tr><td>${fmt(analysis.config.analysis.resonanceBandHz[0], 0)}-${fmt(analysis.config.analysis.resonanceBandHz[1], 0)} Hz peak</td><td>+${fmt(analysis.peak.db, 1)} dB @ ${fmt(analysis.peak.frequencyHz, 1)} Hz</td><td>≤ +${fmt(analysis.config.analysis.resonanceLimitDb, 1)} dB</td><td><span class="sorbo-status ${analysis.peak.pass ? 'pass' : 'fail'}">${analysis.peak.pass ? 'PASS' : 'FAIL'}</span></td><td>Mode ${analysis.peak.modeNumber} · ${esc(analysis.peak.modeLabel)}</td></tr></tbody></table></div>`;
}

function commentary(analysis) {
  const vertical = analysis.modes.find(mode => mode.dominantIndex === 2) ?? analysis.modes[2];
  const paragraphs = [];
  const accepted = vertical.frequencyHz >= analysis.config.analysis.modeAcceptBandHz[0] && vertical.frequencyHz <= analysis.config.analysis.modeAcceptBandHz[1];
  paragraphs.push(`The dominant vertical bounce mode is ${fmt(vertical.frequencyHz, 1)} Hz and is ${accepted ? 'inside' : 'outside'} the defined ${fmt(analysis.config.analysis.modeAcceptBandHz[0], 0)}-${fmt(analysis.config.analysis.modeAcceptBandHz[1], 0)} Hz acceptable resonance region.`);
  for (const result of analysis.toneResults) {
    const margin = result.maximumDb - result.db;
    paragraphs.push(`At ${fmt(result.frequencyHz, 0)} Hz, predicted vertical transmissibility is ${fmt(result.db, 1)} dB: ${result.pass ? `PASS with ${fmt(margin, 1)} dB margin` : `FAIL by ${fmt(-margin, 1)} dB`}.`);
  }
  paragraphs.push(`The largest vertical amplification in the resonance band is +${fmt(analysis.peak.db, 1)} dB at ${fmt(analysis.peak.frequencyHz, 1)} Hz, associated most closely with Mode ${analysis.peak.modeNumber} (${analysis.peak.modeLabel}).`);
  if (analysis.warnings.some(warning => warning.includes('extrapolated'))) paragraphs.push('The high-frequency attenuation result depends on an explicit extrapolation beyond the 300 Hz manufacturer curve limit. Treat it as a screening prediction and validate the captured hardware with a component-level shaker test.');
  if (Math.abs(analysis.config.component.cgM[2] - analysis.config.mounts.planeZM) > 0.03) paragraphs.push('The CG is materially above the mount plane, so lateral translation and rocking couple. Increasing mount spacing primarily raises roll/pitch stiffness; lowering the CG reduces lateral-rocking coupling.');
  return paragraphs.map(text => `<p>${esc(text)}</p>`).join('');
}

function chartPath(xs, ys, xMap, yMap) {
  return ys.map((value, index) => `${index ? 'L' : 'M'}${xMap(xs[index]).toFixed(2)},${yMap(value).toFixed(2)}`).join('');
}

function transmissibilitySvg(analysis) {
  const response = analysis.response;
  if (!response) return '';
  const width = 960;
  const height = 470;
  const margin = { left: 68, right: 22, top: 28, bottom: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xMin = Math.log10(response.frequencies[0]);
  const xMax = Math.log10(response.frequencies.at(-1));
  const radius = Math.hypot(analysis.config.component.dimensionsM[0], analysis.config.component.dimensionsM[1]) / 2;
  const useDb = analysis.config.analysis.magnitudeScale === 'db';
  const series = Array.from({ length: 6 }, (_, dof) => response.magnitude[dof].map(value => value * (dof < 3 ? 1 : radius)));
  const displaySeries = useDb ? series.map(values => values.map(value => 20 * Math.log10(Math.max(value, 1e-10)))) : series;
  const all = displaySeries.flat().filter(Number.isFinite);
  const yMin = useDb ? Math.floor(Math.max(-80, Math.min(...all, -30)) / 10) * 10 : 0;
  const yMax = useDb ? Math.ceil(Math.min(60, Math.max(...all, 10)) / 10) * 10 : Math.max(...all, 1) * 1.05;
  const xMap = value => margin.left + (Math.log10(value) - xMin) / (xMax - xMin) * plotWidth;
  const yMap = value => margin.top + (yMax - value) / Math.max(yMax - yMin, 1e-12) * plotHeight;
  const xTicks = [10, 20, 50, 100, 200, 300, 600, 1000, 2000].filter(value => value >= response.frequencies[0] && value <= response.frequencies.at(-1));
  const yStep = useDb ? 10 : yMax / 5;
  const yTicks = Array.from({ length: 6 }, (_, index) => yMin + index * (yMax - yMin) / 5);
  const colors = ['#58b9ff', '#f6b94a', '#64d7a1', '#b49cff', '#ff82b3', '#ff795f'];
  const names = ['Tx', 'Ty', 'Tz', 'Rx·r', 'Ry·r', 'Rz·r'];
  const paths = displaySeries.map((values, index) => `<path class="sorbo-trace trace-${index}" d="${chartPath(response.frequencies, values, xMap, yMap)}" style="--trace:${colors[index]}"/><g class="sorbo-legend-item" transform="translate(${margin.left + index * 94},${height - 14})"><line x2="20"/><text x="27" y="4">${names[index]}</text></g>`).join('');
  const supportedX = xMap(SORBOTHANE_MATERIAL.digitizedCurveMaxHz);
  const markers = [...analysis.modes.map(mode => ({ frequency: mode.frequencyHz, label: `M${mode.number}` })), ...analysis.config.analysis.tones.map(tone => ({ frequency: tone.frequencyHz, label: `${fmt(tone.frequencyHz, 0)}` }))].filter(marker => marker.frequency >= response.frequencies[0] && marker.frequency <= response.frequencies.at(-1)).map((marker, index) => `<g class="sorbo-frequency-marker"><line x1="${xMap(marker.frequency)}" x2="${xMap(marker.frequency)}" y1="${margin.top}" y2="${height - margin.bottom}"/><text x="${xMap(marker.frequency) + 3}" y="${margin.top + 12 + (index % 3) * 12}">${marker.label}</text></g>`).join('');
  let uncertainty = '';
  if (useDb && analysis.uncertainty) {
    const upper = analysis.uncertainty.upperDb.map((value, index) => [xMap(response.frequencies[index]), yMap(value)]);
    const lower = analysis.uncertainty.lowerDb.map((value, index) => [xMap(response.frequencies[index]), yMap(value)]).reverse();
    uncertainty = `<polygon class="sorbo-uncertainty-band" points="${[...upper, ...lower].map(point => point.join(',')).join(' ')}"/>`;
  }
  return `<svg class="sorbo-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Six degree of freedom base-to-component transmissibility from ${fmt(response.frequencies[0], 0)} to ${fmt(response.frequencies.at(-1), 0)} hertz">
    <rect class="sorbo-extrapolated-region" x="${supportedX}" y="${margin.top}" width="${width - margin.right - supportedX}" height="${plotHeight}"/>
    ${xTicks.map(value => `<g class="sorbo-grid"><line x1="${xMap(value)}" x2="${xMap(value)}" y1="${margin.top}" y2="${height - margin.bottom}"/><text x="${xMap(value)}" y="${height - margin.bottom + 21}">${value}</text></g>`).join('')}
    ${yTicks.map(value => `<g class="sorbo-grid"><line x1="${margin.left}" x2="${width - margin.right}" y1="${yMap(value)}" y2="${yMap(value)}"/><text x="${margin.left - 10}" y="${yMap(value) + 4}" text-anchor="end">${fmt(value, useDb ? 0 : 2)}</text></g>`).join('')}
    ${uncertainty}${markers}${paths}
    <line class="sorbo-support-limit" x1="${supportedX}" x2="${supportedX}" y1="${margin.top}" y2="${height - margin.bottom}"/><text class="sorbo-support-label" x="${supportedX + 6}" y="${height - margin.bottom - 8}">300 Hz manufacturer curve limit</text>
    <text class="sorbo-axis-label" x="${margin.left + plotWidth / 2}" y="${height - 24}" text-anchor="middle">Frequency (Hz, logarithmic)</text><text class="sorbo-axis-label" transform="translate(18 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle">${useDb ? 'Amplitude transmissibility (dB)' : 'Linear amplitude ratio'}</text>
    <rect class="sorbo-chart-hit" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" data-sorbo-chart-hit/><g class="sorbo-chart-tooltip" data-sorbo-tooltip hidden><line data-tip-line/><rect width="196" height="120" rx="10"/><text data-tip-text x="10" y="20"/></g>
  </svg>`;
}

function materialSvg(config) {
  const frequencies = [5, 10, 15, 30, 50, 75, 100, 150, 200, 300, 600, 1200, 1400, 2000];
  const properties = frequencies.map(frequency => sorbothaneDynamicProperties(config, frequency));
  const width = 800;
  const height = 330;
  const margin = { left: 62, right: 60, top: 24, bottom: 48 };
  const xMap = value => margin.left + (Math.log10(value) - Math.log10(5)) / (Math.log10(2000) - Math.log10(5)) * (width - margin.left - margin.right);
  const maxModulus = Math.max(...properties.map(property => property.storageModulusPsi)) * 1.08;
  const yModulus = value => height - margin.bottom - value / maxModulus * (height - margin.top - margin.bottom);
  const yTan = value => height - margin.bottom - value / 1.0 * (height - margin.top - margin.bottom);
  const measured = properties.map((property, index) => property.frequencyHz <= 300 ? index : -1).filter(index => index >= 0);
  const extrapolated = properties.map((_, index) => index).filter(index => index >= measured.at(-1));
  return `<svg class="sorbo-chart sorbo-material-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Storage modulus and loss factor versus frequency with extrapolated region">
    <rect class="sorbo-extrapolated-region" x="${xMap(300)}" y="${margin.top}" width="${width - margin.right - xMap(300)}" height="${height - margin.top - margin.bottom}"/>
    ${[5, 10, 30, 100, 300, 600, 1200, 2000].map(value => `<g class="sorbo-grid"><line x1="${xMap(value)}" x2="${xMap(value)}" y1="${margin.top}" y2="${height - margin.bottom}"/><text x="${xMap(value)}" y="${height - 24}">${value}</text></g>`).join('')}
    <path class="sorbo-property-trace modulus" d="${chartPath(measured.map(index => frequencies[index]), measured.map(index => properties[index].storageModulusPsi), xMap, yModulus)}"/>
    <path class="sorbo-property-trace modulus extrapolated" d="${chartPath(extrapolated.map(index => frequencies[index]), extrapolated.map(index => properties[index].storageModulusPsi), xMap, yModulus)}"/>
    <path class="sorbo-property-trace tan" d="${chartPath(measured.map(index => frequencies[index]), measured.map(index => properties[index].tanDelta), xMap, yTan)}"/>
    <path class="sorbo-property-trace tan extrapolated" d="${chartPath(extrapolated.map(index => frequencies[index]), extrapolated.map(index => properties[index].tanDelta), xMap, yTan)}"/>
    <text class="sorbo-axis-label" x="${margin.left}" y="16">E′ (psi)</text><text class="sorbo-axis-label" x="${width - margin.right}" y="16" text-anchor="end">tan δ</text><text class="sorbo-axis-label" x="${width / 2}" y="${height - 6}" text-anchor="middle">Frequency (Hz, logarithmic)</text>
    <g class="sorbo-material-legend"><line x1="${margin.left}" x2="${margin.left + 24}" y1="${height - 12}" y2="${height - 12}" class="modulus"/><text x="${margin.left + 30}" y="${height - 8}">Storage modulus</text><line x1="${margin.left + 160}" x2="${margin.left + 184}" y1="${height - 12}" y2="${height - 12}" class="tan"/><text x="${margin.left + 190}" y="${height - 8}">tan δ</text></g>
  </svg>`;
}

function matrixTable(matrix, label) {
  return `<section class="sorbo-matrix"><h3>${esc(label)}</h3><div class="table-wrap"><table><tbody>${matrix.map(row => `<tr>${row.map(value => `<td>${Number(value).toExponential(3)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}

function uncertaintySummary(analysis) {
  if (!analysis.uncertainty) return '<p>Uncertainty envelope disabled.</p>';
  const verticalIndex = analysis.modes.findIndex(mode => mode.dominantIndex === 2);
  const range = analysis.uncertainty.modeRangesHz[Math.max(verticalIndex, 0)];
  return `<p><strong>Vertical-mode 5-95% range:</strong> ${fmt(range[0], 1)}-${fmt(range[1], 1)} Hz</p><div class="sorbo-uncertainty-tones">${analysis.toneResults.map((tone, index) => `<span><b>${fmt(tone.frequencyHz, 0)} Hz</b>${fmt(analysis.uncertainty.toneRangesDb[index][0], 1)} to ${fmt(analysis.uncertainty.toneRangesDb[index][1], 1)} dB</span>`).join('')}</div><small>${esc(analysis.uncertainty.method)}</small>`;
}

function overviewPanel(config, analysis) {
  const catalog = sorbothaneCatalogItem(config.isolator.productNumber);
  return `<section class="sorbo-tab-panel is-active" data-sorbo-panel="overview">
    <div class="sorbo-overview-grid"><section class="sorbo-card sorbo-geometry-card"><header><div><p class="eyebrow">Hardware geometry</p><h2>Component on four captured mounts</h2></div><span>Drag to rotate</span></header><div data-sorbo-overview-scene>${sceneSvg(config, analysis)}</div><p class="sorbo-caption">Coordinate origin: component footprint center on the isolated plate. +Z is upward. CG and mount offsets are rendered from the same coordinates.</p></section>
    <section class="sorbo-card sorbo-decision-card"><p class="eyebrow">Current decision</p><h2 class="${analysis.passes ? 'pass-text' : 'fail-text'}">${analysis.passes ? 'All defined criteria pass' : 'Design review required'}</h2><dl><div><dt>Isolator</dt><dd>${esc(catalog.productNumber)}</dd></div><div><dt>Shape factor</dt><dd>${fmt(analysis.geometry.shapeFactor, 3)}</dd></div><div><dt>Preload / element</dt><dd>${fmt(analysis.preload.preloadN / LBF, 2)} lbf</dd></div><div><dt>Opposing elements</dt><dd>${analysis.preload.allEngaged ? 'Engaged' : 'UNLOADED'}</dd></div><div><dt>Catalog loads</dt><dd>${analysis.preload.catalogCompliant ? 'Within / not applicable' : 'Outside rating'}</dd></div></dl></section></div>
    <section class="sorbo-mode-dashboard"><header><div><p class="eyebrow">Calculated eigenproblem</p><h2>Six rigid-body modes</h2></div><p>Modes are classified by normalized translational and characteristic-length rotational participation; coupling is retained.</p></header><div class="sorbo-mode-cards">${modeCards(analysis)}</div></section>
    <section class="sorbo-card"><header><div><p class="eyebrow">Pass / fail</p><h2>Isolation and resonance requirements</h2></div><span>Vertical base excitation at CG</span></header>${requirementTable(analysis)}</section>
    <div class="sorbo-lower-grid"><section class="sorbo-card sorbo-commentary"><p class="eyebrow">Engineering interpretation</p><h2>What the design is doing physically</h2>${commentary(analysis)}</section><section class="sorbo-card"><p class="eyebrow">Sensitivity envelope</p><h2>Input uncertainty propagated</h2>${uncertaintySummary(analysis)}</section></div>
    ${analysis.warnings.length ? `<aside class="sorbo-warning-stack"><strong>Active engineering warnings</strong><ul>${analysis.warnings.map(warning => `<li>${esc(warning)}</li>`).join('')}</ul></aside>` : ''}
  </section>`;
}

function modesPanel(config, analysis) {
  return `<section class="sorbo-tab-panel" data-sorbo-panel="modes"><div class="sorbo-mode-layout"><section class="sorbo-card sorbo-mode-viewer"><header><div><p class="eyebrow">Normalized rigid-body motion</p><h2 data-sorbo-mode-title>Mode 1 · ${esc(analysis.modes[0].dominant)}</h2></div><span>Exaggerated; not absolute displacement</span></header><div data-sorbo-mode-scene>${sceneSvg(config, analysis, 0)}</div><div class="sorbo-animation-controls"><button type="button" class="button-secondary" data-sorbo-action="play-mode">Pause</button><label><span>Amplitude</span><input type="range" min="0.25" max="2" step="0.05" value="1" data-sorbo-amplitude/></label><label><span>Speed</span><input type="range" min="0.2" max="2" step="0.05" value="0.7" data-sorbo-speed/></label><label><span>Yaw</span><input type="range" min="-180" max="180" step="1" value="-32" data-sorbo-camera="yaw"/></label><label><span>Pitch</span><input type="range" min="-70" max="70" step="1" value="24" data-sorbo-camera="pitch"/></label><button type="button" class="button-quiet" data-sorbo-action="reset-camera">Reset camera</button></div><div class="sorbo-mode-selector">${analysis.modes.map(mode => `<button type="button" data-sorbo-mode-select="${mode.number - 1}"${mode.number === 1 ? ' class="active"' : ''}>M${mode.number}<span>${fmt(mode.frequencyHz, 1)} Hz</span></button>`).join('')}</div></section>
    <section class="sorbo-card"><p class="eyebrow">Mode participation</p><h2>Normalized eigenvector components</h2><div class="table-wrap"><table><thead><tr><th>Mode</th><th>Frequency</th><th>Dominant</th><th>X</th><th>Y</th><th>Z</th><th>Roll</th><th>Pitch</th><th>Yaw</th></tr></thead><tbody>${analysis.modes.map(mode => `<tr><td>M${mode.number}</td><td>${fmt(mode.frequencyHz, 2)} Hz</td><td>${esc(mode.dominant)}</td>${mode.participation.map(value => `<td>${fmt(value, 1)}%</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="sorbo-caption">Rotational DOFs are scaled by the component characteristic planform length before participation percentages are calculated.</p></section></div></section>`;
}

function transmissibilityPanel(analysis) {
  return `<section class="sorbo-tab-panel" data-sorbo-panel="transmissibility"><section class="sorbo-card"><header><div><p class="eyebrow">Complex base response</p><h2>10-2000 Hz transmissibility</h2></div><span>${analysis.config.analysis.excitationAxis.toUpperCase()} base excitation · ${analysis.config.analysis.responsePoint.replaceAll('-', ' ')}</span></header>${transmissibilitySvg(analysis)}<div class="sorbo-plot-notes"><span><b>Solid support region</b> Manufacturer table / digitized data through 300 Hz</span><span><b>Shaded region</b> Selected extrapolation policy</span><span><b>Rx·r, Ry·r, Rz·r</b> Rotation multiplied by characteristic radius</span></div></section>${requirementTable(analysis)}</section>`;
}

function sorbothanePanel(config, analysis) {
  const catalog = sorbothaneCatalogItem(config.isolator.productNumber);
  const rating = catalog.ratedLoadLb ? `${catalog.ratedLoadLb.map(value => fmt(value, 2)).join('-')} lbf` : 'No catalog rating - custom geometry';
  return `<section class="sorbo-tab-panel" data-sorbo-panel="sorbothane"><div class="sorbo-lower-grid"><section class="sorbo-card"><p class="eyebrow">Selected element</p><h2>${esc(catalog.productNumber)}</h2><dl class="sorbo-detail-list"><div><dt>Geometry</dt><dd>${esc(config.isolator.geometry)}</dd></div><div><dt>OD / ID / t</dt><dd>${fmt(config.isolator.odM / INCH, 3)} / ${fmt(config.isolator.idM / INCH, 3)} / ${fmt(config.isolator.thicknessM / INCH, 3)} in</dd></div><div><dt>Durometer</dt><dd>${config.isolator.durometer} Shore 00</dd></div><div><dt>Rated load</dt><dd>${rating}</dd></div><div><dt>Free / compressed stack</dt><dd>${fmt(analysis.preload.freeThicknessM / INCH, 3)} / ${fmt(analysis.preload.compressedThicknessM / INCH, 3)} in</dd></div><div><dt>Compression</dt><dd>${fmt(analysis.preload.compressionPct, 2)}%</dd></div><div><dt>Loaded area</dt><dd>${fmt(analysis.geometry.loadedAreaIn2, 3)} in²</dd></div><div><dt>Effective area</dt><dd>${fmt(analysis.geometry.effectiveAreaM2 / INCH ** 2, 3)} in²</dd></div><div><dt>Free-to-bulge area</dt><dd>${fmt(analysis.geometry.freeBulgeAreaM2 / INCH ** 2, 3)} in²</dd></div><div><dt>Shape factor</dt><dd>${fmt(analysis.geometry.shapeFactor, 3)}</dd></div><div><dt>Equation</dt><dd>${esc(analysis.geometry.equation)}</dd></div><div><dt>Shape correction</dt><dd>1 + 2SF² = ${fmt(analysis.geometry.shapeCorrection, 3)}</dd></div></dl><p class="sorbo-caption">${esc(catalog.notes || 'Manufacturer standard product. Availability remains subject to change.')}</p></section><section class="sorbo-card"><p class="eyebrow">Dynamic material data</p><h2>E′, E″, and tan δ</h2>${materialSvg(config)}<p class="sorbo-caption">E″ = E′ tan δ. Exact manufacturer table points: 5-50 Hz. Digitized manufacturer guide curves: 75-300 Hz. Shading begins where engineering extrapolation is required.</p></section></div>
    <section class="sorbo-card"><header><div><p class="eyebrow">Static captured stack</p><h2>Upper / lower engagement and catalog checks</h2></div><span>${fmt(analysis.preload.compressionPct, 1)}% nominal compression</span></header><div class="table-wrap"><table><thead><tr><th>Mount</th><th>X</th><th>Y</th><th>Payload contribution</th><th>Upper load</th><th>Lower load</th><th>Status</th></tr></thead><tbody>${analysis.preload.mounts.map(mount => `<tr><td>${mount.index}</td><td>${fmt(mount.positionM[0] / INCH, 2)} in</td><td>${fmt(mount.positionM[1] / INCH, 2)} in</td><td>${fmt(mount.payloadN / LBF, 2)} lbf</td><td>${fmt(mount.upperLoadN / LBF, 2)} lbf</td><td>${fmt(mount.lowerLoadN / LBF, 2)} lbf</td><td>${mount.flags.length ? `<span class="sorbo-status fail">${esc(mount.flags.join('; '))}</span>` : '<span class="sorbo-status pass">ENGAGED</span>'}</td></tr>`).join('')}</tbody></table></div><p class="sorbo-caption">${esc(analysis.preload.preloadProvenance)}. Gravity and the specified quasi-static accelerations redistribute load; lower and upper forces differ by the mount payload contribution.</p></section>
  </section>`;
}

function explorerPanel() {
  const choices = [['durometer', 'Durometer (Shore 00)'], ['thickness', 'Thickness (in)'], ['od', 'Outer diameter (in)'], ['id', 'Inner diameter (in)'], ['compression', 'Compression (%)'], ['mass', 'Mass (lbm)'], ['cgHeight', 'CG height (in)'], ['mountSpacing', 'X mount spacing (in)'], ['mountSpacingY', 'Y mount spacing (in)'], ['stackCount', 'Stack count / side']];
  return `<section class="sorbo-tab-panel" data-sorbo-panel="explorer"><section class="sorbo-card"><header><div><p class="eyebrow">Transparent parametric sweep</p><h2>Isolation map and ranked candidates</h2></div><span>No opaque optimizer</span></header><div class="sorbo-explorer-controls"><label><span>X variable</span><select data-explorer="xVariable">${choices.map(([value, label]) => `<option value="${value}"${value === 'thickness' ? ' selected' : ''}>${label}</option>`).join('')}</select></label><label><span>X min / max</span><span class="inline-inputs"><input data-explorer="xMin" type="number" value="0.15" step="0.05"/><input data-explorer="xMax" type="number" value="0.5" step="0.05"/></span></label><label><span>Y variable</span><select data-explorer="yVariable">${choices.map(([value, label]) => `<option value="${value}"${value === 'od' ? ' selected' : ''}>${label}</option>`).join('')}</select></label><label><span>Y min / max</span><span class="inline-inputs"><input data-explorer="yMin" type="number" value="0.9" step="0.1"/><input data-explorer="yMax" type="number" value="1.8" step="0.1"/></span></label><label><span>Color output</span><select data-explorer="output"><option value="t1200">T @ 1200 Hz (dB)</option><option value="t600">T @ 600 Hz (dB)</option><option value="peak">Peak 100-200 Hz (dB)</option><option value="verticalMode">Vertical mode (Hz)</option></select></label><button type="button" class="button" data-sorbo-action="run-explorer">Run 7 × 7 sweep</button></div><div data-sorbo-explorer-result><div class="sorbo-empty"><strong>Choose two variables.</strong><p>The app evaluates every visible grid point, applies the same mechanics and requirements, and ranks inspectable candidates.</p></div></div></section></section>`;
}

function heatmapSvg(grid) {
  const width = 760;
  const height = 430;
  const margin = { left: 80, right: 24, top: 28, bottom: 62 };
  const values = grid.values.flat().filter(Number.isFinite);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const cellWidth = (width - margin.left - margin.right) / grid.xValues.length;
  const cellHeight = (height - margin.top - margin.bottom) / grid.yValues.length;
  const color = value => {
    if (!Number.isFinite(value)) return '#263747';
    const t = (value - minimum) / Math.max(maximum - minimum, 1e-12);
    const hue = 195 - 165 * t;
    return `hsl(${hue} 72% ${42 + 9 * (1 - Math.abs(t - .5) * 2)}%)`;
  };
  return `<svg class="sorbo-heatmap" viewBox="0 0 ${width} ${height}" role="img" aria-label="Design sweep heatmap for ${grid.output}">${grid.values.map((row, rowIndex) => row.map((value, columnIndex) => `<g><rect x="${margin.left + columnIndex * cellWidth}" y="${margin.top + (grid.yValues.length - 1 - rowIndex) * cellHeight}" width="${cellWidth + .5}" height="${cellHeight + .5}" fill="${color(value)}"/><text x="${margin.left + (columnIndex + .5) * cellWidth}" y="${margin.top + (grid.yValues.length - rowIndex - .5) * cellHeight + 4}">${Number.isFinite(value) ? fmt(value, 1) : '—'}</text></g>`).join('')).join('')}${grid.xValues.map((value, index) => `<text class="axis-tick" x="${margin.left + (index + .5) * cellWidth}" y="${height - margin.bottom + 22}">${fmt(value, 2)}</text>`).join('')}${grid.yValues.map((value, index) => `<text class="axis-tick" x="${margin.left - 12}" y="${margin.top + (grid.yValues.length - index - .5) * cellHeight + 4}" text-anchor="end">${fmt(value, 2)}</text>`).join('')}<text class="sorbo-axis-label" x="${margin.left + (width - margin.left - margin.right) / 2}" y="${height - 16}" text-anchor="middle">${esc(grid.xVariable)}</text><text class="sorbo-axis-label" transform="translate(18 ${margin.top + (height - margin.top - margin.bottom) / 2}) rotate(-90)" text-anchor="middle">${esc(grid.yVariable)}</text></svg>`;
}

function explorerResult(grid) {
  return `<div class="sorbo-explorer-result"><section><h3>${esc(grid.output)} isolation map</h3>${heatmapSvg(grid)}</section><section><h3>Ranked candidates</h3><div class="table-wrap"><table><thead><tr><th>Rank</th><th>${esc(grid.xVariable)}</th><th>${esc(grid.yVariable)}</th><th>Six modes (Hz)</th><th>Map value</th><th>T600</th><th>T1200</th><th>T1400</th><th>Peak</th><th>Compression</th><th>Preload / element</th><th>Compliance</th></tr></thead><tbody>${grid.candidates.map((candidate, index) => `<tr><td>${index + 1}</td><td>${fmt(candidate.xValue, 3)}</td><td>${fmt(candidate.yValue, 3)}</td><td>${candidate.analysis.modes.map(mode => fmt(mode.frequencyHz, 1)).join(' · ')}</td><td>${fmt(candidate.value, 2)}</td>${candidate.analysis.toneResults.map(result => `<td>${fmt(result.db, 1)} dB</td>`).join('')}<td>${fmt(candidate.analysis.peak.db, 1)} dB</td><td>${fmt(candidate.analysis.preload.compressionPct, 1)}%</td><td>${fmt(candidate.analysis.preload.preloadN / LBF, 2)} lbf</td><td><span class="sorbo-status ${candidate.pass ? 'pass' : 'fail'}">${candidate.pass ? 'PASS' : 'REVIEW'}</span><small>${candidate.analysis.preload.allEngaged ? 'engaged' : 'unloaded'} · ${candidate.analysis.preload.catalogCompliant ? 'catalog OK/N/A' : 'outside rating'}</small></td></tr>`).join('')}</tbody></table></div></section></div>`;
}

function assumptionsPanel(config, analysis) {
  const assumptions = [
    'Rigid component and isolated plate; rigid source/base plane.',
    'Linear, small-displacement six-DOF rigid-body response about the preloaded equilibrium.',
    'Four nominally identical mount locations; mount stiffness axes align with component X/Y/Z.',
    'No bolt, sleeve, washer, or capture-hardware short circuit across the isolated plate.',
    'Upper and lower Sorbothane stacks remain engaged; contact loss invalidates the linear sandwich model.',
    'Storage modulus and tan delta are frequency dependent. Static load/deflection is kept separate from incremental dynamic stiffness.',
    `Compression correction follows the manufacturer guide: Ecorrected = E(1 + 2SF²). Shear uses G = E/[2(1+ν)] with ν = ${fmt(config.isolator.poisson, 3)}.`,
    'No amplitude-dependent nonlinearity, Mullins effect, creep, aging, radiation, vacuum, contamination, temperature shift, or mounting-plate flexibility is modeled.',
    'Frequency response is absolute component acceleration divided by base acceleration; phase is retained internally.',
    'Rotation traces are multiplied by a characteristic component radius only for dimensionless plot comparison.'
  ];
  return `<section class="sorbo-tab-panel" data-sorbo-panel="assumptions"><div class="sorbo-lower-grid"><section class="sorbo-card"><p class="eyebrow">Always visible model boundary</p><h2>Assumptions and failure modes</h2><ul class="sorbo-assumption-list">${assumptions.map(item => `<li>${esc(item)}</li>`).join('')}</ul>${analysis.warnings.length ? `<h3>Active warnings</h3><ul class="sorbo-warning-list">${analysis.warnings.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}</section><section class="sorbo-card"><p class="eyebrow">Governing equations</p><h2>Mechanics implemented</h2><div class="sorbo-equations"><p><span>Mount kinematics</span>uᵢ = [I − [rᵢ]×] q</p><p><span>Assembled stiffness</span>K*(ω) = Σ Bᵢᵀ diag(kx*, ky*, kz*) Bᵢ</p><p><span>Rigid-body modes</span>K′(fₙ) φ = (2πfₙ)² M φ</p><p><span>Base excitation</span>[−ω²M + K*(ω)] qᵣ = ω²MΓ y</p><p><span>Absolute response</span>qₐ = qᵣ + Γy</p><p><span>Complex material</span>E* = E′ + jE″; E″ = E′ tan δ</p><p><span>Captured sandwich</span>k_mount = k_top-stack + k_bottom-stack</p></div></section></div>
    <section class="sorbo-card"><p class="eyebrow">Numerical transparency</p><h2>M and K′(100 Hz)</h2><div class="sorbo-matrix-grid">${matrixTable(analysis.massMatrix, 'Mass matrix M (SI)')}${matrixTable(analysis.stiffnessAt100Hz, 'Storage stiffness K′ (SI)')}</div></section>
    <section class="sorbo-card"><p class="eyebrow">Validation suite</p><h2>Implemented checks</h2><div class="sorbo-validation-grid"><article><strong>SDOF closure</strong><p>Symmetric vertical response is compared with the analytical base-excited complex-stiffness SDOF solution.</p></article><article><strong>Symmetry</strong><p>Centered CG and symmetric mounts suppress the expected translation/rotation cross terms.</p></article><article><strong>CG shift / height</strong><p>Planar CG offsets and mount-plane separation introduce the expected coupling terms.</p></article><article><strong>Series & sandwich</strong><p>Elements in a stack divide stiffness; opposing preloaded stacks add incremental stiffness.</p></article><article><strong>Units</strong><p>All mechanics use SI; English and SI controls convert only at the UI boundary.</p></article></div></section>
    <section class="sorbo-card"><p class="eyebrow">Authoritative sources</p><h2>References and data provenance</h2><div class="sorbo-reference-grid">${SORBOTHANE_REFERENCES.map(reference => `<article><span>${esc(reference.organization)} · ${esc(reference.revision)}</span><h3>${esc(reference.title)}</h3><p>${esc(reference.use)}</p><div><a href="${esc(reference.url)}" target="_blank" rel="noreferrer">Open source ↗</a><code>${esc(reference.local)}</code></div></article>`).join('')}</div><p class="sorbo-caption">Research snapshot ${SORBOTHANE_DATA_VERSION}. Catalog availability is explicitly subject to change; verify current product pages before procurement.</p></section>
  </section>`;
}

function exportControls() {
  return `<div class="sorbo-export-bar"><span>Browser-local · no data uploaded</span><button type="button" class="button-quiet" data-sorbo-action="export-json">Configuration JSON</button><button type="button" class="button-quiet" data-sorbo-action="export-csv">Response CSV</button><button type="button" class="button-quiet" data-sorbo-action="export-report">Engineering summary</button><button type="button" class="button-quiet" data-sorbo-action="add-project">Add to project</button></div>`;
}

export function renderSorbothaneIsolationWorkbench(configInput = null) {
  const config = normalizeSorbothaneConfig(configInput ?? DEFAULT_SORBOTHANE_CONFIG);
  const analysis = analyzeSorbothaneIsolation(config);
  return `<div class="page-shell sorbo-workbench" data-sorbothane-workbench><nav class="breadcrumbs site-breadcrumbs" aria-label="Breadcrumb"><a href="#/tools">Tools</a><span aria-hidden="true">›</span><span>Dynamics</span><span aria-hidden="true">›</span><span aria-current="page">Sorbothane 6-DOF Isolation Designer</span></nav>
    <section class="sorbo-hero"><div><p class="eyebrow">Aerospace component isolation · Engineering workbench</p><h1>Place the resonance deliberately.<br><span>See what gets through.</span></h1><p>Design a four-point captured Sorbothane system with traceable viscoelastic properties, full rigid-body coupling, complex frequency response, static engagement checks, and inspectable trade studies.</p></div><aside><strong data-sorbo-hero-mode>${fmt(analysis.modes.find(mode => mode.dominantIndex === 2)?.frequencyHz ?? analysis.modes[2].frequencyHz, 1)} Hz</strong><span>vertical bounce</span><b data-sorbo-hero-status class="${analysis.passes ? 'pass-text' : 'fail-text'}">${analysis.passes ? 'DEFINED REQUIREMENTS PASS' : 'DESIGN REVIEW REQUIRED'}</b><small>Manufacturer curves end at 300 Hz; 600-2000 Hz uses the selected visible assumption.</small></aside></section>
    ${exportControls()}
    <section class="sorbo-shell">${inputSidebar(config)}<main class="sorbo-main"><nav class="sorbo-tabs" role="tablist">${[['overview', 'Overview'], ['modes', 'Modes'], ['transmissibility', 'Transmissibility'], ['sorbothane', 'Sorbothane'], ['explorer', 'Design Explorer'], ['assumptions', 'Assumptions / Validation']].map(([id, label], index) => `<button type="button" role="tab" data-sorbo-tab="${id}" class="${index === 0 ? 'active' : ''}">${label}</button>`).join('')}</nav><div data-sorbo-panels>${overviewPanel(config, analysis)}${modesPanel(config, analysis)}${transmissibilityPanel(analysis)}${sorbothanePanel(config, analysis)}${explorerPanel()}${assumptionsPanel(config, analysis)}</div></main></section>
    <div class="sorbo-live" aria-live="polite" data-sorbo-live></div></div>`;
}

function download(name, text, type = 'text/plain;charset=utf-8') {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

export function responseCsv(analysis) {
  const header = ['frequency_hz', 'Tx_mag', 'Tx_db', 'Tx_phase_deg', 'Ty_mag', 'Ty_db', 'Ty_phase_deg', 'Tz_mag', 'Tz_db', 'Tz_phase_deg', 'Rx_rad_per_m', 'Rx_db', 'Rx_phase_deg', 'Ry_rad_per_m', 'Ry_db', 'Ry_phase_deg', 'Rz_rad_per_m', 'Rz_db', 'Rz_phase_deg', 'material_region'];
  const rows = analysis.response.frequencies.map((frequency, index) => {
    const values = [frequency];
    for (let dof = 0; dof < 6; dof += 1) values.push(analysis.response.magnitude[dof][index], analysis.response.db[dof][index], analysis.response.phaseDeg[dof][index]);
    values.push(analysis.response.supported[index] ? 'manufacturer-supported-or-digitized' : 'engineering-extrapolation');
    return values.join(',');
  });
  return [header.join(','), ...rows].join('\n');
}

export function engineeringReport(analysis) {
  const config = analysis.config;
  return `# Sorbothane 6-DOF Isolation Engineering Summary

Generated: ${new Date().toISOString()}

## Configuration

- Mass: ${fmt(config.component.massKg / LB, 3)} lbm (${fmt(config.component.massKg, 3)} kg)
- Component: ${config.component.dimensionsM.map(value => fmt(value / INCH, 3)).join(' × ')} in
- CG: ${config.component.cgM.map(value => fmt(value / INCH, 3)).join(', ')} in from the component footprint-center / plate coordinate origin
- Isolator: ${config.isolator.productNumber}; ${config.isolator.durometer} Shore 00; OD ${fmt(config.isolator.odM / INCH, 3)} in; ID ${fmt(config.isolator.idM / INCH, 3)} in; t ${fmt(config.isolator.thicknessM / INCH, 3)} in
- Stack: ${config.mounts.stackTop} upper / ${config.mounts.stackBottom} lower elements per mount; four mounts
- Nominal compression: ${fmt(analysis.preload.compressionPct, 2)}%; preload ${fmt(analysis.preload.preloadN / LBF, 3)} lbf per element
- Shape factor: ${fmt(analysis.geometry.shapeFactor, 4)}; ${analysis.geometry.equation}
- Above-300-Hz material assumption: ${config.isolator.extrapolation}

## Rigid-body modes

| Mode | Frequency | Dominant | Secondary | Loss factor |
|---|---:|---|---|---:|
${analysis.modes.map(mode => `| ${mode.number} | ${fmt(mode.frequencyHz, 3)} Hz | ${mode.dominant} | ${mode.secondary} | ${fmt(mode.lossFactor, 3)} |`).join('\n')}

## Requirements

| Target | Predicted vertical T | Requirement | Status |
|---|---:|---:|---|
${analysis.toneResults.map(result => `| ${fmt(result.frequencyHz, 0)} Hz | ${fmt(result.db, 2)} dB | ≤ ${fmt(result.maximumDb, 2)} dB | ${result.pass ? 'PASS' : 'FAIL'} |`).join('\n')}
| ${fmt(config.analysis.resonanceBandHz[0], 0)}-${fmt(config.analysis.resonanceBandHz[1], 0)} Hz peak | +${fmt(analysis.peak.db, 2)} dB @ ${fmt(analysis.peak.frequencyHz, 2)} Hz | ≤ +${fmt(config.analysis.resonanceLimitDb, 2)} dB | ${analysis.peak.pass ? 'PASS' : 'FAIL'} |

## Interpretation

${commentary(analysis).replaceAll(/<\/?p>/g, '').split('\n').join('\n\n')}

## Assumptions and warnings

${analysis.warnings.length ? analysis.warnings.map(warning => `- ${warning}`).join('\n') : '- No active numerical warnings. The stated model limitations still apply.'}

- Rigid component and base, linear small motion, four identical mounts, no hardware short circuit.
- Static load/deflection, preload, storage modulus, loss modulus, dynamic stiffness, modal frequency, and base transmissibility remain separate quantities.
- The 600-2000 Hz predictions require component-level test validation because manufacturer property curves end at 300 Hz.

## Sources

${SORBOTHANE_REFERENCES.map(reference => `- ${reference.title} (${reference.revision}): ${reference.url}`).join('\n')}
`;
}

function bindChartTooltip(root, analysis) {
  const hit = root.querySelector('[data-sorbo-chart-hit]');
  const tooltip = root.querySelector('[data-sorbo-tooltip]');
  if (!hit || !tooltip) return;
  const line = tooltip.querySelector('[data-tip-line]');
  const text = tooltip.querySelector('[data-tip-text]');
  hit.addEventListener('pointermove', event => {
    const svg = hit.closest('svg');
    const rect = svg.getBoundingClientRect();
    const viewX = (event.clientX - rect.left) / rect.width * 960;
    const fraction = clamp((viewX - 68) / (960 - 68 - 22), 0, 1);
    const frequency = 10 ** (Math.log10(analysis.response.frequencies[0]) + fraction * (Math.log10(analysis.response.frequencies.at(-1)) - Math.log10(analysis.response.frequencies[0])));
    let index = 0;
    for (let candidate = 1; candidate < analysis.response.frequencies.length; candidate += 1) if (Math.abs(Math.log(analysis.response.frequencies[candidate] / frequency)) < Math.abs(Math.log(analysis.response.frequencies[index] / frequency))) index = candidate;
    const x = 68 + index / (analysis.response.frequencies.length - 1) * (960 - 68 - 22);
    const boxX = x > 730 ? x - 205 : x + 9;
    tooltip.hidden = false;
    tooltip.setAttribute('transform', `translate(${boxX} 42)`);
    line.setAttribute('x1', x - boxX);
    line.setAttribute('x2', x - boxX);
    line.setAttribute('y1', -14);
    line.setAttribute('y2', 378);
    const labels = ['Tx', 'Ty', 'Tz', 'Rx', 'Ry', 'Rz'];
    text.innerHTML = `<tspan x="10" dy="0">${fmt(analysis.response.frequencies[index], 1)} Hz</tspan>${labels.map((label, dof) => `<tspan x="10" dy="16">${label}: ${fmt(analysis.response.db[dof][index], 1)} dB · ${fmt(analysis.response.phaseDeg[dof][index], 0)}°</tspan>`).join('')}`;
  });
  hit.addEventListener('pointerleave', () => { tooltip.hidden = true; });
}

export function bindSorbothaneIsolationWorkbench(root = document) {
  let shell = root.querySelector('[data-sorbothane-workbench]');
  if (!shell) return () => {};
  let config;
  try { config = normalizeSorbothaneConfig(JSON.parse(localStorage.getItem('sau-sorbothane-isolation-v1') || 'null') ?? DEFAULT_SORBOTHANE_CONFIG); }
  catch { config = normalizeSorbothaneConfig(DEFAULT_SORBOTHANE_CONFIG); }
  let analysis = analyzeSorbothaneIsolation(config);
  let activeTab = 'overview';
  let selectedMode = 0;
  let playing = true;
  let amplitude = 1;
  let speed = 0.7;
  let camera = { yaw: -32, pitch: 24 };
  let phase = 0;
  let animationFrame = 0;
  let lastTime = performance.now();

  const updateVisibility = () => {
    shell.querySelector('[data-manual-inertia]')?.classList.toggle('is-visible', config.component.inertiaMode === 'manual');
  };
  const showTab = id => {
    activeTab = id;
    shell.querySelectorAll('[data-sorbo-tab]').forEach(button => button.classList.toggle('active', button.dataset.sorboTab === id));
    shell.querySelectorAll('[data-sorbo-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.sorboPanel === id));
  };
  const save = () => localStorage.setItem('sau-sorbothane-isolation-v1', JSON.stringify(config));
  const syncSidebarControls = () => {
    shell.querySelectorAll('[data-sorbo-field]').forEach(control => {
      const path = control.dataset.sorboField;
      let value = pathGet(config, path);
      if (control.dataset.quantity) value = unitDefinitions[control.dataset.quantity][config.units].fromSI(Number(value));
      control.value = typeof value === 'number' ? fmt(value, 4) : String(value);
    });
    shell.querySelectorAll('[data-sorbo-inset-axis]').forEach(control => {
      const axis = Number(control.dataset.sorboInsetAxis);
      const insetM = (config.component.dimensionsM[axis] - config.mounts.spacingM[axis]) / 2;
      control.value = fmt(unitDefinitions.length[config.units].fromSI(insetM), 4);
    });
    const relativePlane = shell.querySelector('[data-sorbo-plane-relative]');
    if (relativePlane) relativePlane.value = fmt(unitDefinitions.length[config.units].fromSI(config.mounts.planeZM - config.component.cgM[2]), 4);
  };
  const redrawAnalysis = () => {
    analysis = analyzeSorbothaneIsolation(config);
    const panels = shell.querySelector('[data-sorbo-panels]');
    panels.innerHTML = `${overviewPanel(config, analysis)}${modesPanel(config, analysis)}${transmissibilityPanel(analysis)}${sorbothanePanel(config, analysis)}${explorerPanel()}${assumptionsPanel(config, analysis)}`;
    showTab(activeTab);
    bindPanelControls();
    updateVisibility();
    syncSidebarControls();
    const heroMode = shell.querySelector('[data-sorbo-hero-mode]');
    const heroStatus = shell.querySelector('[data-sorbo-hero-status]');
    if (heroMode) heroMode.textContent = `${fmt(analysis.modes.find(mode => mode.dominantIndex === 2)?.frequencyHz ?? analysis.modes[2].frequencyHz, 1)} Hz`;
    if (heroStatus) {
      heroStatus.textContent = analysis.passes ? 'DEFINED REQUIREMENTS PASS' : 'DESIGN REVIEW REQUIRED';
      heroStatus.className = analysis.passes ? 'pass-text' : 'fail-text';
    }
    save();
    const live = shell.querySelector('[data-sorbo-live]');
    if (live) live.textContent = `Analysis updated. Vertical mode ${fmt(analysis.modes.find(mode => mode.dominantIndex === 2)?.frequencyHz, 1)} hertz.`;
  };
  const applyCatalog = productNumber => {
    const item = sorbothaneCatalogItem(productNumber);
    config.isolator.productNumber = item.productNumber;
    if (item.productNumber !== 'custom-ring') {
      config.isolator.geometry = item.geometry;
      config.isolator.odM = item.odIn * INCH;
      config.isolator.idM = item.idIn * INCH;
      config.isolator.thicknessM = item.thicknessIn * INCH;
      config.isolator.durometer = item.durometer;
    }
  };
  const bindInputs = () => {
    shell.querySelector('[data-sorbo-units]')?.addEventListener('change', event => {
      config.units = event.target.value;
      const replacement = document.createElement('div');
      replacement.innerHTML = renderSorbothaneIsolationWorkbench(config);
      const next = replacement.firstElementChild;
      shell.replaceWith(next);
      shell = next;
      bindInputs();
      bindPanelControls();
      showTab(activeTab);
      updateVisibility();
    });
    shell.querySelectorAll('[data-sorbo-field]').forEach(control => control.addEventListener('change', event => {
      const path = control.dataset.sorboField;
      let value = control.value;
      const current = pathGet(config, path);
      if (typeof current === 'number') value = Number(value);
      if (typeof current === 'boolean') value = value === 'true';
      if (control.dataset.quantity) value = unitDefinitions[control.dataset.quantity][config.units].toSI(Number(value));
      if (path === 'isolator.productNumber') applyCatalog(value);
      else pathSet(config, path, value);
      redrawAnalysis();
    }));
    shell.querySelectorAll('[data-sorbo-inset-axis]').forEach(control => control.addEventListener('change', event => {
      const axis = Number(control.dataset.sorboInsetAxis);
      const insetM = unitDefinitions.length[config.units].toSI(Number(event.target.value));
      config.mounts.spacingM[axis] = Math.max(1e-5, config.component.dimensionsM[axis] - 2 * insetM);
      redrawAnalysis();
    }));
    shell.querySelector('[data-sorbo-plane-relative]')?.addEventListener('change', event => {
      const relativeM = unitDefinitions.length[config.units].toSI(Number(event.target.value));
      config.mounts.planeZM = config.component.cgM[2] + relativeM;
      redrawAnalysis();
    });
    shell.querySelector('[data-sorbo-product-search]')?.addEventListener('input', event => {
      const query = event.target.value.trim().toLowerCase();
      const product = shell.querySelector('[data-sorbo-product]');
      product.querySelectorAll('option').forEach(option => { option.hidden = Boolean(query) && !option.textContent.toLowerCase().includes(query); });
    });
    shell.querySelector('[data-sorbo-action="analyze"]')?.addEventListener('click', redrawAnalysis);
    shell.querySelector('[data-sorbo-action="reset"]')?.addEventListener('click', () => {
      config = normalizeSorbothaneConfig(DEFAULT_SORBOTHANE_CONFIG);
      localStorage.removeItem('sau-sorbothane-isolation-v1');
      const replacement = document.createElement('div');
      replacement.innerHTML = renderSorbothaneIsolationWorkbench(config);
      const next = replacement.firstElementChild;
      shell.replaceWith(next);
      shell = next;
      activeTab = 'overview';
      bindInputs();
      bindPanelControls();
      updateVisibility();
    });
    shell.querySelector('[data-sorbo-action="export-json"]')?.addEventListener('click', () => download('sorbothane-isolation-configuration.json', JSON.stringify(config, null, 2), 'application/json;charset=utf-8'));
    shell.querySelector('[data-sorbo-action="export-csv"]')?.addEventListener('click', () => download('sorbothane-isolation-response.csv', responseCsv(analysis), 'text/csv;charset=utf-8'));
    shell.querySelector('[data-sorbo-action="export-report"]')?.addEventListener('click', () => download('sorbothane-isolation-engineering-summary.md', engineeringReport(analysis), 'text/markdown;charset=utf-8'));
    shell.querySelector('[data-sorbo-action="add-project"]')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('sau:add-artifact', { detail: { type: 'Isolation design', title: 'Sorbothane 6-DOF isolation configuration', route: location.hash, takeaway: analysis.passes ? 'Defined isolation and resonance requirements pass.' : 'The configuration requires engineering review.', validity: 'Rigid-body linear viscoelastic screening model; high-frequency properties extrapolated above 300 Hz.', warnings: analysis.warnings, inputs: config, outputs: { modes: analysis.modes, tones: analysis.toneResults, peak: analysis.peak } } })));
  };
  const updateModeScene = () => {
    const mount = shell.querySelector('[data-sorbo-mode-scene]');
    if (mount) mount.innerHTML = sceneSvg(config, analysis, selectedMode, phase, camera, amplitude);
  };
  const animate = time => {
    if (playing) phase += (time - lastTime) / 1000 * speed * Math.PI * 2;
    lastTime = time;
    if (activeTab === 'modes') updateModeScene();
    animationFrame = requestAnimationFrame(animate);
  };
  const bindPanelControls = () => {
    shell.querySelectorAll('[data-sorbo-tab]').forEach(button => button.addEventListener('click', () => showTab(button.dataset.sorboTab)));
    shell.querySelectorAll('[data-sorbo-mode]').forEach(button => button.addEventListener('click', () => {
      selectedMode = +button.dataset.sorboMode;
      showTab('modes');
      shell.querySelectorAll('[data-sorbo-mode-select]').forEach(item => item.classList.toggle('active', +item.dataset.sorboModeSelect === selectedMode));
      const title = shell.querySelector('[data-sorbo-mode-title]');
      if (title) title.textContent = `Mode ${selectedMode + 1} · ${analysis.modes[selectedMode].dominant}`;
      updateModeScene();
    }));
    shell.querySelectorAll('[data-sorbo-mode-select]').forEach(button => button.addEventListener('click', () => {
      selectedMode = +button.dataset.sorboModeSelect;
      shell.querySelectorAll('[data-sorbo-mode-select]').forEach(item => item.classList.toggle('active', item === button));
      const title = shell.querySelector('[data-sorbo-mode-title]');
      if (title) title.textContent = `Mode ${selectedMode + 1} · ${analysis.modes[selectedMode].dominant}`;
      updateModeScene();
    }));
    shell.querySelector('[data-sorbo-action="play-mode"]')?.addEventListener('click', event => { playing = !playing; event.target.textContent = playing ? 'Pause' : 'Play'; });
    shell.querySelector('[data-sorbo-amplitude]')?.addEventListener('input', event => { amplitude = +event.target.value; });
    shell.querySelector('[data-sorbo-speed]')?.addEventListener('input', event => { speed = +event.target.value; });
    shell.querySelectorAll('[data-sorbo-camera]').forEach(control => control.addEventListener('input', event => { camera[event.target.dataset.sorboCamera] = +event.target.value; }));
    shell.querySelector('[data-sorbo-action="reset-camera"]')?.addEventListener('click', () => { camera = { yaw: -32, pitch: 24 }; const yaw = shell.querySelector('[data-sorbo-camera="yaw"]'); const pitch = shell.querySelector('[data-sorbo-camera="pitch"]'); if (yaw) yaw.value = -32; if (pitch) pitch.value = 24; });
    shell.querySelector('[data-sorbo-action="run-explorer"]')?.addEventListener('click', event => {
      const get = key => shell.querySelector(`[data-explorer="${key}"]`)?.value;
      event.target.disabled = true;
      event.target.textContent = 'Evaluating 49 designs…';
      requestAnimationFrame(() => {
        const grid = runDesignGrid(config, { xVariable: get('xVariable'), yVariable: get('yVariable'), xRange: [+get('xMin'), +get('xMax')], yRange: [+get('yMin'), +get('yMax')], output: get('output'), gridSize: 7 });
        shell.querySelector('[data-sorbo-explorer-result]').innerHTML = explorerResult(grid);
        event.target.disabled = false;
        event.target.textContent = 'Run 7 × 7 sweep';
      });
    });
    bindChartTooltip(shell, analysis);
    const scene = shell.querySelector('[data-sorbo-overview-scene]');
    if (scene) {
      let pointer = null;
      let start = null;
      scene.addEventListener('pointerdown', event => { pointer = event.pointerId; start = [event.clientX, event.clientY, camera.yaw, camera.pitch]; scene.setPointerCapture(pointer); });
      scene.addEventListener('pointermove', event => { if (event.pointerId !== pointer || !start) return; camera.yaw = start[2] + (event.clientX - start[0]) * .45; camera.pitch = clamp(start[3] - (event.clientY - start[1]) * .35, -70, 70); scene.innerHTML = sceneSvg(config, analysis, null, 0, camera); });
      scene.addEventListener('pointerup', event => { if (event.pointerId === pointer) { pointer = null; start = null; } });
    }
  };

  const replacement = document.createElement('div');
  replacement.innerHTML = renderSorbothaneIsolationWorkbench(config);
  const next = replacement.firstElementChild;
  shell.replaceWith(next);
  shell = next;
  bindInputs();
  bindPanelControls();
  updateVisibility();
  animationFrame = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationFrame);
}

export const sorbothaneIsolationCalculator = {
  basis: 'Frequency-dependent complex Sorbothane stiffness assembled into a six-DOF rigid-body model',
  confidence: 'Source-traceable screening model requiring hardware test correlation',
  inputs: [
    { key: 'mass_lb', label: 'Component mass', unit: 'lbm', type: 'number', default: 10, min: 0.1 },
    { key: 'od_in', label: 'Ring OD', unit: 'in', type: 'number', default: 1.25, min: 0.1 },
    { key: 'id_in', label: 'Ring ID', unit: 'in', type: 'number', default: 0.50, min: 0 },
    { key: 'thickness_in', label: 'Element thickness', unit: 'in', type: 'number', default: 0.25, min: 0.01 },
    { key: 'durometer', label: 'Shore 00 durometer', type: 'select', default: 50, options: [[30, '30'], [50, '50'], [70, '70']] },
    { key: 'compression_pct', label: 'Nominal compression', unit: '%', type: 'number', default: 15, min: 1, max: 30 }
  ],
  compute(values) {
    const config = deepClone(DEFAULT_SORBOTHANE_CONFIG);
    config.component.massKg = Number(values.mass_lb) * LB;
    config.isolator.odM = Number(values.od_in) * INCH;
    config.isolator.idM = Number(values.id_in) * INCH;
    config.isolator.thicknessM = Number(values.thickness_in) * INCH;
    config.isolator.durometer = Number(values.durometer);
    config.isolator.compressionPct = Number(values.compression_pct);
    config.uncertainty.enabled = false;
    const analysis = analyzeSorbothaneIsolation(config, { skipResponse: true, skipUncertainty: true });
    const vertical = analysis.modes.find(mode => mode.dominantIndex === 2) ?? analysis.modes[2];
    const alerts = analysis.warnings;
    return {
      values: [
        { label: 'Vertical mode', value: vertical.frequencyHz, unit: 'Hz' },
        { label: 'T @ 600 Hz', value: analysis.toneResults[0].db, unit: 'dB' },
        { label: 'T @ 1200 Hz', value: analysis.toneResults[1].db, unit: 'dB' },
        { label: 'Shape factor', value: analysis.geometry.shapeFactor },
        { label: 'Preload per element', value: analysis.preload.preloadN / LBF, unit: 'lbf' }
      ],
      interpretation: {
        summary: `The vertical rigid-body mode is ${fmt(vertical.frequencyHz, 1)} Hz. Open the guided workbench for all six coupled modes, static engagement, frequency response, uncertainty, and source provenance.`,
        physicalMeaning: 'The captured upper and lower elements add incremental stiffness, while stacked elements on one side act in series.',
        engineeringConsiderations: ['Manufacturer dynamic-property curves end at 300 Hz; high-frequency attenuation requires an explicit extrapolation and shaker-test validation.']
      },
      assumptions: {
        satisfied: ['Rigid component and base.', 'Four symmetric mounts.', 'Linear viscoelastic small-motion response.'],
        warnings: alerts,
        alerts,
        limitations: [
          'Manufacturer dynamic-property curves are used only through their 300 Hz published boundary; tones above it depend on the selected extrapolation.',
          'The screen omits fastener, bracket, base, and component flexibility and does not replace a shaker-correlated hardware model.'
        ]
      },
      validity: {
        regime: 'Linear, small-motion, rigid-body isolation screening with the configured captured-element preload and source-bounded viscoelastic properties.',
        confidence: 'Useful for architecture trades and resonance placement; verify temperature, preload, installed interfaces, and extrapolated high-frequency attenuation by test.'
      },
      relatedConcepts: [
        { title: 'SDOF isolation', description: 'Compare the coupled solution with the classical frequency-ratio and damping picture.', href: '#/tool/sdof' },
        { title: 'Modal overlap', description: 'Relate mode separation and damping to whether distinct resonances remain meaningful.', href: '#/tool/modal-overlap' },
        { title: 'Test planning', description: 'Turn analytical uncertainty into a shaker-test and correlation plan.', href: '#/tool/qualification-test' }
      ],
      presentation: {
        primaryEvidence: null,
        primaryEvidenceStack: [],
        primaryEvidenceCount: 0,
        primaryValueCount: 5,
        animation: null
      }
    };
  },
  theory: '<p>The full workbench assembles frequency-dependent complex mount stiffness into a 6×6 rigid-body model. This quick screen exposes only the baseline geometry; use the guided view for complete design work.</p>',
  assumptions: ['Rigid component and base.', 'Four identical captured sandwich mounts.', 'Manufacturer curves through 300 Hz; explicit assumptions above that limit.'],
  references: SORBOTHANE_REFERENCES.map(reference => ({ title: reference.title, note: `${reference.organization} · ${reference.revision} · ${reference.url}` }))
};

export const sorbothaneIsolationWorkbench = {
  render: () => renderSorbothaneIsolationWorkbench(),
  bind: root => bindSorbothaneIsolationWorkbench(root)
};
