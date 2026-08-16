import { SORBOTHANE_CATALOG, SORBOTHANE_DATA_VERSION, SORBOTHANE_MATERIAL, SORBOTHANE_REFERENCES, sorbothaneCatalogItem } from './sorbothane-data.js';
import {
  DEFAULT_SORBOTHANE_CONFIG,
  SORBOTHANE_UNITS,
  analyzeSorbothaneIsolation,
  normalizeSorbothaneConfig,
  rigidBodyResponseAtFrequency,
  runDesignGrid,
  screenSorbothaneCatalogAsync,
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
const fmtSignedDb = (value, digits = 1) => `${Number(value) >= 0 ? '+' : ''}${fmt(value, digits)} dB`;
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
      select(config, 'isolator.geometry', 'Geometry', [['washer', 'Catalog washer'], ['ring', 'Annular isolation ring'], ['disc', 'Solid disc']]),
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
      input(config, 'analysis.lateralModeMinimumHz.0', 'X translation mode minimum', { unit: 'Hz', min: 0.1, step: 1 }),
      input(config, 'analysis.lateralModeMinimumHz.1', 'Y translation mode minimum', { unit: 'Hz', min: 0.1, step: 1 }),
      input(config, 'analysis.modeAcceptBandHz.0', 'Z translation mode minimum', { unit: 'Hz', min: 1, step: 1 }),
      input(config, 'analysis.modeAcceptBandHz.1', 'Z translation mode maximum', { unit: 'Hz', min: 1, step: 1 }),
      input(config, 'analysis.resonanceBandHz.0', 'Resonance search band start', { unit: 'Hz', min: 1, step: 1 }),
      input(config, 'analysis.resonanceBandHz.1', 'Resonance search band end', { unit: 'Hz', min: 1, step: 1 }),
      input(config, 'analysis.resonanceLimitDb', 'Max resonance amplification', { unit: 'dB', step: 0.5 }),
      ...config.analysis.tones.map((tone, index) => input(config, `analysis.tones.${index}.maximumDb`, `${fmt(tone.frequencyHz, 0)} Hz maximum`, { unit: 'dB', step: 0.5 }))
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

function modeStatus(mode, analysis) {
  const checks = analysis.lateralModeResults
    .filter(result => result.modeNumber === mode.number)
    .map(result => ({ axis: result.axis, pass: result.pass }));
  if (analysis.verticalModeResult.modeNumber === mode.number) checks.push({ axis: 'Z', pass: analysis.verticalModeResult.pass });
  if (!checks.length) return { className: 'is-neutral', label: 'UNCONSTRAINED MODE' };
  const axes = checks.map(check => check.axis).join('/');
  const pass = checks.every(check => check.pass);
  return { className: pass ? 'is-pass' : 'is-review', label: `${axes} LIMIT ${pass ? 'PASS' : 'FAIL'}` };
}

function modeCards(analysis) {
  return analysis.modes.map(mode => {
    const status = modeStatus(mode, analysis);
    return `<button type="button" class="sorbo-mode-card ${status.className}" data-sorbo-mode="${mode.number - 1}"><span>Mode ${mode.number}<b>${status.label}</b></span><strong>${fmt(mode.frequencyHz, 1)} <small>Hz</small></strong><p>${esc(mode.dominant)}</p><em>Secondary: ${esc(mode.secondary)} · η ${fmt(mode.lossFactor, 2)}</em></button>`;
  }).join('');
}

function requirementTable(analysis) {
  const lateralRows = analysis.lateralModeResults.map(result => `<tr><td>${result.axis} translation-dominated mode</td><td>Mode ${result.modeNumber} · ${fmt(result.frequencyHz, 1)} Hz</td><td>≥ ${fmt(result.minimumHz, 1)} Hz</td><td><span class="sorbo-status ${result.pass ? 'pass' : 'fail'}">${result.pass ? 'PASS' : 'FAIL'}</span></td><td>${fmt(result.participationPct, 1)}% ${result.axis} participation</td></tr>`).join('');
  const vertical = analysis.verticalModeResult;
  const verticalRow = `<tr><td>Z translation-dominated mode</td><td>Mode ${vertical.modeNumber} · ${fmt(vertical.frequencyHz, 1)} Hz</td><td>${fmt(vertical.rangeHz[0], 1)}–${fmt(vertical.rangeHz[1], 1)} Hz</td><td><span class="sorbo-status ${vertical.pass ? 'pass' : 'fail'}">${vertical.pass ? 'PASS' : 'FAIL'}</span></td><td>${fmt(vertical.participationPct, 1)}% Z participation</td></tr>`;
  const toneRows = analysis.toneResults.flatMap(result => result.axisResults.map(axisResult => `<tr><td>${fmt(result.frequencyHz, 0)} Hz · T${axisResult.axis.toLowerCase()}${axisResult.axis.toLowerCase()}</td><td>${fmtSignedDb(axisResult.db)}</td><td>≤ ${fmtSignedDb(result.maximumDb)}</td><td><span class="sorbo-status ${axisResult.pass ? 'pass' : 'fail'}">${axisResult.pass ? 'PASS' : 'FAIL'}</span></td><td>${axisResult.axis} base → ${axisResult.axis} response · ${esc(axisResult.provenance.replaceAll('-', ' '))}</td></tr>`)).join('');
  const peakRows = analysis.peakResults.map(result => `<tr><td>${fmt(analysis.config.analysis.resonanceBandHz[0], 0)}-${fmt(analysis.config.analysis.resonanceBandHz[1], 0)} Hz · T${result.axis.toLowerCase()}${result.axis.toLowerCase()} peak</td><td>${fmtSignedDb(result.db)} @ ${fmt(result.frequencyHz, 1)} Hz</td><td>≤ ${fmtSignedDb(analysis.config.analysis.resonanceLimitDb)}</td><td><span class="sorbo-status ${result.pass ? 'pass' : 'fail'}">${result.pass ? 'PASS' : 'FAIL'}</span></td><td>Mode ${result.modeNumber} · ${esc(result.modeLabel)}</td></tr>`).join('');
  return `<div class="table-wrap"><table class="sorbo-requirements"><thead><tr><th>Target</th><th>Calculated response</th><th>Requirement</th><th>Status</th><th>Basis</th></tr></thead><tbody>${lateralRows}${verticalRow}${toneRows}${peakRows}</tbody></table></div>`;
}

function commentary(analysis) {
  const vertical = analysis.verticalModeResult;
  const paragraphs = [];
  paragraphs.push(`The mode with the greatest Z translation participation is Mode ${vertical.modeNumber} at ${fmt(vertical.frequencyHz, 1)} Hz and is ${vertical.pass ? 'inside' : 'outside'} the defined ${fmt(vertical.rangeHz[0], 0)}-${fmt(vertical.rangeHz[1], 0)} Hz acceptable region.`);
  for (const result of analysis.lateralModeResults) paragraphs.push(`The mode with the greatest ${result.axis} translation participation is Mode ${result.modeNumber} at ${fmt(result.frequencyHz, 1)} Hz (${fmt(result.participationPct, 1)}% ${result.axis}); it ${result.pass ? 'passes' : 'fails'} the ${fmt(result.minimumHz, 1)} Hz minimum.`);
  for (const result of analysis.toneResults) {
    const margin = result.maximumDb - result.db;
    const values = result.axisResults.map(axisResult => `T${axisResult.axis.toLowerCase()}${axisResult.axis.toLowerCase()} ${fmtSignedDb(axisResult.db)}`).join(', ');
    paragraphs.push(`At ${fmt(result.frequencyHz, 0)} Hz, direct translational transmissibility is ${values}. The worst direction is ${result.worstAxis}: ${result.pass ? `PASS with ${fmt(margin, 1)} dB margin` : `FAIL by ${fmt(-margin, 1)} dB`}.`);
  }
  paragraphs.push(`The largest direct-axis amplification in the resonance band is ${fmtSignedDb(analysis.peak.db)} in ${analysis.peak.axis} at ${fmt(analysis.peak.frequencyHz, 1)} Hz, associated most closely with Mode ${analysis.peak.modeNumber} (${analysis.peak.modeLabel}).`);
  if (analysis.warnings.some(warning => warning.includes('extrapolated'))) paragraphs.push('The high-frequency attenuation result depends on an explicit extrapolation beyond the 300 Hz manufacturer curve limit. Treat it as a screening prediction and validate the captured hardware with a component-level shaker test.');
  if (Math.abs(analysis.config.component.cgM[2] - analysis.config.mounts.planeZM) > 0.03) paragraphs.push('The CG is materially above the mount plane, so lateral translation and rocking couple. Increasing mount spacing primarily raises roll/pitch stiffness; lowering the CG reduces lateral-rocking coupling.');
  return paragraphs.map(text => `<p>${esc(text)}</p>`).join('');
}

function chartPath(xs, ys, xMap, yMap) {
  return ys.map((value, index) => `${index ? 'L' : 'M'}${xMap(xs[index]).toFixed(2)},${yMap(value).toFixed(2)}`).join('');
}

function transmissibilitySvg(analysis, view = 'direct') {
  const direct = view === 'direct';
  const response = direct ? analysis.directionalResponses?.x : analysis.response;
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
  const series = direct
    ? ['x', 'y', 'z'].map((axis, dof) => analysis.directionalResponses[axis].magnitude[dof])
    : Array.from({ length: 6 }, (_, dof) => response.magnitude[dof].map(value => value * (dof < 3 ? 1 : radius)));
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
  const names = direct ? ['Txx', 'Tyy', 'Tzz'] : ['Tx', 'Ty', 'Tz', 'Rx·r', 'Ry·r', 'Rz·r'];
  const legendSpacing = direct ? 128 : 94;
  const paths = displaySeries.map((values, index) => `<path class="sorbo-trace trace-${index}" d="${chartPath(response.frequencies, values, xMap, yMap)}" style="--trace:${colors[index]}"/><g class="sorbo-legend-item" transform="translate(${margin.left + index * legendSpacing},${height - 14})"><line x2="20"/><text x="27" y="4">${names[index]}</text></g>`).join('');
  const supportedX = xMap(SORBOTHANE_MATERIAL.digitizedCurveMaxHz);
  const markers = [...analysis.modes.map(mode => ({ frequency: mode.frequencyHz, label: `M${mode.number}` })), ...analysis.config.analysis.tones.map(tone => ({ frequency: tone.frequencyHz, label: `${fmt(tone.frequencyHz, 0)}` }))].filter(marker => marker.frequency >= response.frequencies[0] && marker.frequency <= response.frequencies.at(-1)).map((marker, index) => `<g class="sorbo-frequency-marker"><line x1="${xMap(marker.frequency)}" x2="${xMap(marker.frequency)}" y1="${margin.top}" y2="${height - margin.bottom}"/><text x="${xMap(marker.frequency) + 3}" y="${margin.top + 12 + (index % 3) * 12}">${marker.label}</text></g>`).join('');
  let uncertainty = '';
  if (direct && useDb && analysis.uncertainty) {
    const upper = analysis.uncertainty.upperDb.map((value, index) => [xMap(response.frequencies[index]), yMap(value)]);
    const lower = analysis.uncertainty.lowerDb.map((value, index) => [xMap(response.frequencies[index]), yMap(value)]).reverse();
    uncertainty = `<polygon class="sorbo-uncertainty-band" points="${[...upper, ...lower].map(point => point.join(',')).join(' ')}"/>`;
  }
  const ariaLabel = direct
    ? `Direct X-to-X, Y-to-Y, and Z-to-Z base-to-component transmissibility from ${fmt(response.frequencies[0], 0)} to ${fmt(response.frequencies.at(-1), 0)} hertz`
    : `Six degree of freedom response for ${analysis.config.analysis.excitationAxis.toUpperCase()} base excitation from ${fmt(response.frequencies[0], 0)} to ${fmt(response.frequencies.at(-1), 0)} hertz`;
  return `<svg class="sorbo-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}">
    <rect class="sorbo-extrapolated-region" x="${supportedX}" y="${margin.top}" width="${width - margin.right - supportedX}" height="${plotHeight}"/>
    ${xTicks.map(value => `<g class="sorbo-grid"><line x1="${xMap(value)}" x2="${xMap(value)}" y1="${margin.top}" y2="${height - margin.bottom}"/><text x="${xMap(value)}" y="${height - margin.bottom + 21}">${value}</text></g>`).join('')}
    ${yTicks.map(value => `<g class="sorbo-grid"><line x1="${margin.left}" x2="${width - margin.right}" y1="${yMap(value)}" y2="${yMap(value)}"/><text x="${margin.left - 10}" y="${yMap(value) + 4}" text-anchor="end">${fmt(value, useDb ? 0 : 2)}</text></g>`).join('')}
    ${uncertainty}${markers}${paths}
    <line class="sorbo-support-limit" x1="${supportedX}" x2="${supportedX}" y1="${margin.top}" y2="${height - margin.bottom}"/><text class="sorbo-support-label" x="${supportedX + 6}" y="${height - margin.bottom - 8}">300 Hz manufacturer curve limit</text>
    <text class="sorbo-axis-label" x="${margin.left + plotWidth / 2}" y="${height - 24}" text-anchor="middle">Frequency (Hz, logarithmic)</text><text class="sorbo-axis-label" transform="translate(18 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle">${useDb ? 'Amplitude transmissibility (dB)' : 'Linear amplitude ratio'}</text>
    <rect class="sorbo-chart-hit" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" data-sorbo-chart-hit="${view}"/><g class="sorbo-chart-tooltip" data-sorbo-tooltip="${view}" hidden><line data-tip-line/><rect width="214" height="${direct ? 76 : 120}" rx="10"/><text data-tip-text x="10" y="20"/></g>
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
  return `<p><strong>Vertical-mode 5-95% range:</strong> ${fmt(range[0], 1)}-${fmt(range[1], 1)} Hz</p><div class="sorbo-uncertainty-tones">${analysis.toneResults.map((tone, index) => `<span><b>${fmt(tone.frequencyHz, 0)} Hz · Tzz</b>${fmt(analysis.uncertainty.toneRangesDb[index][0], 1)} to ${fmt(analysis.uncertainty.toneRangesDb[index][1], 1)} dB</span>`).join('')}</div><small>${esc(analysis.uncertainty.method)}</small>`;
}

function overviewPanel(config, analysis) {
  const catalog = sorbothaneCatalogItem(config.isolator.productNumber);
  return `<section class="sorbo-tab-panel is-active" data-sorbo-panel="overview">
    <div class="sorbo-overview-grid"><section class="sorbo-card sorbo-geometry-card"><header><div><p class="eyebrow">Hardware geometry</p><h2>Component on four captured mounts</h2></div><span>Drag to rotate</span></header><div data-sorbo-overview-scene>${sceneSvg(config, analysis)}</div><p class="sorbo-caption">Coordinate origin: component footprint center on the isolated plate. +Z is upward. CG and mount offsets are rendered from the same coordinates.</p></section>
    <section class="sorbo-card sorbo-decision-card"><p class="eyebrow">Current decision</p><h2 class="${analysis.passes ? 'pass-text' : 'fail-text'}">${analysis.passes ? 'All defined criteria pass' : 'Design review required'}</h2><dl><div><dt>Isolator</dt><dd>${esc(catalog.productNumber)}</dd></div><div><dt>Shape factor</dt><dd>${fmt(analysis.geometry.shapeFactor, 3)}</dd></div><div><dt>Nominal precompression force</dt><dd>${fmt(analysis.preload.preloadN / LBF, 2)} lbf / element</dd></div><div><dt>Installed element loads</dt><dd>${analysis.preload.mounts.flatMap(mount => [mount.upperLoadN, mount.lowerLoadN]).map(value => value / LBF).reduce((range, value) => [Math.min(range[0], value), Math.max(range[1], value)], [Infinity, -Infinity]).map(value => fmt(value, 2)).join('–')} lbf</dd></div><div><dt>Opposing elements</dt><dd>${analysis.preload.allEngaged ? 'Engaged' : 'UNLOADED'}</dd></div><div><dt>Catalog load rating</dt><dd>${analysis.preload.catalogCompliant ? 'Within / not applicable' : 'Outside rating'}</dd></div><div><dt>Compression recommendation</dt><dd>${analysis.preload.compressionCompliant ? 'Within 10–20%' : 'Outside 10–20%'}</dd></div></dl></section></div>
    <section class="sorbo-mode-dashboard"><header><div><p class="eyebrow">Calculated eigenproblem</p><h2>Six rigid-body modes</h2></div><p>Modes are classified by normalized translational and characteristic-length rotational participation; coupling is retained.</p></header><div class="sorbo-mode-cards">${modeCards(analysis)}</div></section>
    <section class="sorbo-card"><header><div><p class="eyebrow">Pass / fail</p><h2>Isolation and resonance requirements</h2></div><span>Direct X / Y / Z base excitation</span></header>${requirementTable(analysis)}</section>
    <div class="sorbo-lower-grid"><section class="sorbo-card sorbo-commentary"><p class="eyebrow">Engineering interpretation</p><h2>What the design is doing physically</h2>${commentary(analysis)}</section><section class="sorbo-card"><p class="eyebrow">Sensitivity envelope</p><h2>Input uncertainty propagated</h2>${uncertaintySummary(analysis)}</section></div>
    ${analysis.warnings.length ? `<aside class="sorbo-warning-stack"><strong>Active engineering warnings</strong><ul>${analysis.warnings.map(warning => `<li>${esc(warning)}</li>`).join('')}</ul></aside>` : ''}
  </section>`;
}

function modesPanel(config, analysis) {
  return `<section class="sorbo-tab-panel" data-sorbo-panel="modes"><div class="sorbo-mode-layout"><section class="sorbo-card sorbo-mode-viewer"><header><div><p class="eyebrow">Normalized rigid-body motion</p><h2 data-sorbo-mode-title>Mode 1 · ${esc(analysis.modes[0].dominant)}</h2></div><span>Exaggerated; not absolute displacement</span></header><div data-sorbo-mode-scene>${sceneSvg(config, analysis, 0)}</div><div class="sorbo-animation-controls"><button type="button" class="button-secondary" data-sorbo-action="play-mode">Pause</button><label><span>Amplitude</span><input type="range" min="0.25" max="2" step="0.05" value="1" data-sorbo-amplitude/></label><label><span>Speed</span><input type="range" min="0.2" max="2" step="0.05" value="0.7" data-sorbo-speed/></label><label><span>Yaw</span><input type="range" min="-180" max="180" step="1" value="-32" data-sorbo-camera="yaw"/></label><label><span>Pitch</span><input type="range" min="-70" max="70" step="1" value="24" data-sorbo-camera="pitch"/></label><button type="button" class="button-quiet" data-sorbo-action="reset-camera">Reset camera</button></div><div class="sorbo-mode-selector">${analysis.modes.map(mode => `<button type="button" data-sorbo-mode-select="${mode.number - 1}"${mode.number === 1 ? ' class="active"' : ''}>M${mode.number}<span>${fmt(mode.frequencyHz, 1)} Hz</span></button>`).join('')}</div></section>
    <section class="sorbo-card"><p class="eyebrow">Mode participation</p><h2>Normalized eigenvector components</h2><div class="table-wrap"><table><thead><tr><th>Mode</th><th>Frequency</th><th>Dominant</th><th>X</th><th>Y</th><th>Z</th><th>Roll</th><th>Pitch</th><th>Yaw</th></tr></thead><tbody>${analysis.modes.map(mode => `<tr><td>M${mode.number}</td><td>${fmt(mode.frequencyHz, 2)} Hz</td><td>${esc(mode.dominant)}</td>${mode.participation.map(value => `<td>${fmt(value, 1)}%</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="sorbo-caption">Rotational DOFs are scaled by the component characteristic planform length before participation percentages are calculated.</p></section></div></section>`;
}

function transmissibilityPanel(analysis) {
  const selectedAxis = analysis.config.analysis.excitationAxis.toUpperCase();
  const responsePoint = analysis.config.analysis.responsePoint.replaceAll('-', ' ');
  return `<section class="sorbo-tab-panel" data-sorbo-panel="transmissibility"><section class="sorbo-card"><header><div><p class="eyebrow">All translational directions</p><h2>Direct-axis transmissibility · Txx, Tyy, Tzz</h2></div><span>X, Y, and Z base inputs · ${responsePoint}</span></header><p class="sorbo-caption">Each curve uses a separate unit base excitation in the named direction and reports component acceleration in that same direction. This is the direct translational comparison used by the tone and resonance criteria.</p>${transmissibilitySvg(analysis, 'direct')}<div class="sorbo-plot-notes"><span><b>Txx</b> X response from X base input</span><span><b>Tyy</b> Y response from Y base input</span><span><b>Tzz</b> Z response from Z base input</span><span><b>Uncertainty band</b> Applies to Tzz</span></div></section><section class="sorbo-card"><header><div><p class="eyebrow">Coupled response detail</p><h2>${selectedAxis}-base six-DOF response</h2></div><span>Selected in Response &amp; requirements · ${responsePoint}</span></header><p class="sorbo-caption">Use the base-excitation selector to inspect cross-axis translation and rocking generated by one input direction.</p>${transmissibilitySvg(analysis, 'coupled')}<div class="sorbo-plot-notes"><span><b>Solid support region</b> Manufacturer table / digitized data through 300 Hz</span><span><b>Shaded region</b> Selected extrapolation policy</span><span><b>Rx·r, Ry·r, Rz·r</b> Rotation multiplied by characteristic radius</span></div></section>${requirementTable(analysis)}</section>`;
}

function sorbothanePanel(config, analysis) {
  const catalog = sorbothaneCatalogItem(config.isolator.productNumber);
  const rating = catalog.ratedLoadLb ? `${catalog.ratedLoadLb.map(value => fmt(value, 2)).join('-')} lbf` : 'No catalog rating - custom geometry';
  return `<section class="sorbo-tab-panel" data-sorbo-panel="sorbothane"><div class="sorbo-lower-grid"><section class="sorbo-card"><p class="eyebrow">Selected element</p><h2>${esc(catalog.productNumber)}</h2><dl class="sorbo-detail-list"><div><dt>Geometry</dt><dd>${esc(config.isolator.geometry)}</dd></div><div><dt>OD / ID / t</dt><dd>${fmt(config.isolator.odM / INCH, 3)} / ${fmt(config.isolator.idM / INCH, 3)} / ${fmt(config.isolator.thicknessM / INCH, 3)} in</dd></div><div><dt>Durometer</dt><dd>${config.isolator.durometer} Shore 00</dd></div><div><dt>Rated load</dt><dd>${rating}</dd></div><div><dt>Free / compressed stack</dt><dd>${fmt(analysis.preload.freeThicknessM / INCH, 3)} / ${fmt(analysis.preload.compressedThicknessM / INCH, 3)} in</dd></div><div><dt>Compression</dt><dd>${fmt(analysis.preload.compressionPct, 2)}%</dd></div><div><dt>Loaded area</dt><dd>${fmt(analysis.geometry.loadedAreaIn2, 3)} in²</dd></div><div><dt>Effective area</dt><dd>${fmt(analysis.geometry.effectiveAreaM2 / INCH ** 2, 3)} in²</dd></div><div><dt>Free-to-bulge area</dt><dd>${fmt(analysis.geometry.freeBulgeAreaM2 / INCH ** 2, 3)} in²</dd></div><div><dt>Shape factor</dt><dd>${fmt(analysis.geometry.shapeFactor, 3)}</dd></div><div><dt>Equation</dt><dd>${esc(analysis.geometry.equation)}</dd></div><div><dt>Shape correction</dt><dd>1 + 2SF² = ${fmt(analysis.geometry.shapeCorrection, 3)}</dd></div></dl><p class="sorbo-caption">${esc(catalog.notes || 'Manufacturer standard product. Availability remains subject to change.')}</p></section><section class="sorbo-card"><p class="eyebrow">Dynamic material data</p><h2>E′, E″, and tan δ</h2>${materialSvg(config)}<p class="sorbo-caption">E″ = E′ tan δ. Exact manufacturer table points: 5-50 Hz. Digitized manufacturer guide curves: 75-300 Hz. Shading begins where engineering extrapolation is required.</p></section></div>
    <section class="sorbo-card"><header><div><p class="eyebrow">Static captured stack</p><h2>Upper / lower engagement and catalog checks</h2></div><span>${fmt(analysis.preload.compressionPct, 1)}% nominal compression</span></header><div class="table-wrap"><table><thead><tr><th>Mount</th><th>X</th><th>Y</th><th>Payload contribution</th><th>Upper load</th><th>Lower load</th><th>Status</th></tr></thead><tbody>${analysis.preload.mounts.map(mount => `<tr><td>${mount.index}</td><td>${fmt(mount.positionM[0] / INCH, 2)} in</td><td>${fmt(mount.positionM[1] / INCH, 2)} in</td><td>${fmt(mount.payloadN / LBF, 2)} lbf</td><td>${fmt(mount.upperLoadN / LBF, 2)} lbf</td><td>${fmt(mount.lowerLoadN / LBF, 2)} lbf</td><td>${mount.flags.length ? `<span class="sorbo-status fail">${esc(mount.flags.join('; '))}</span>` : '<span class="sorbo-status pass">ENGAGED</span>'}</td></tr>`).join('')}</tbody></table></div><p class="sorbo-caption">${esc(analysis.preload.preloadProvenance)}. Gravity and the specified quasi-static accelerations redistribute load; lower and upper forces differ by the mount payload contribution.</p></section>
  </section>`;
}

const EXPLORER_VARIABLE_CHOICES = [
  ['durometer', 'Durometer (Shore 00)'],
  ['thickness', 'Thickness (in)'],
  ['od', 'Outer diameter (in)'],
  ['id', 'Inner diameter (in)'],
  ['compression', 'Compression (%)'],
  ['mass', 'Mass (lbm)'],
  ['cgHeight', 'CG height (in)'],
  ['mountSpacing', 'X mount spacing (in)'],
  ['mountSpacingY', 'Y mount spacing (in)'],
  ['stackCount', 'Stack count / side']
];

const explorerRound = (value, step) => Number((Math.round(value / step) * step).toFixed(6));

export function sorbothaneExplorerVariableDefaults(configInput = DEFAULT_SORBOTHANE_CONFIG) {
  const config = normalizeSorbothaneConfig(configInput);
  const thicknessIn = config.isolator.thicknessM / INCH;
  const odIn = config.isolator.odM / INCH;
  const idIn = config.isolator.idM / INCH;
  const massLbm = config.component.massKg / LB;
  const cgHeightIn = config.component.cgM[2] / INCH;
  const massStep = massLbm >= 4 ? 0.5 : massLbm >= 1 ? 0.1 : 0.01;
  const thicknessMin = Math.max(0.025, explorerRound(thicknessIn * 0.5, 0.025));
  const odMin = Math.max(idIn + 0.05, explorerRound(odIn * 0.7, 0.025));
  const idMax = Math.max(0.025, Math.min(odIn - 0.05, explorerRound(Math.max(idIn * 1.25, odIn * 0.5), 0.025)));
  const massMin = Math.max(massStep, explorerRound(massLbm * 0.75, massStep));
  const cgMin = Math.max(0, explorerRound(cgHeightIn - 1, 0.25));

  return {
    durometer: { min: 30, max: 70, step: 10, note: 'Standard grades are 30, 50, and 70 Shore 00; intermediate grid points use material-property interpolation.' },
    thickness: { min: thicknessMin, max: Math.max(thicknessMin + 0.025, explorerRound(thicknessIn * 2, 0.025)), step: 0.025, note: 'Defaults span 0.5× to 2× the current element thickness.' },
    od: { min: odMin, max: Math.max(odMin + 0.05, explorerRound(odIn * 1.4, 0.025)), step: 0.025, note: 'Defaults span 0.7× to 1.4× the current OD and keep the lower bound above the current ID.' },
    id: { min: Math.max(0, explorerRound(idIn * 0.5, 0.025)), max: idMax, step: 0.025, note: 'The upper bound stays below the current OD; any ID ≥ swept OD is rejected.' },
    compression: { min: 10, max: 20, step: 1, note: 'Manufacturer-preferred screening range: 10–20% compression.' },
    mass: { min: massMin, max: Math.max(massMin + massStep, explorerRound(massLbm * 1.25, massStep)), step: massStep, note: 'Defaults span ±25% around the current component mass.' },
    cgHeight: { min: cgMin, max: Math.max(cgMin + 0.25, explorerRound(cgHeightIn + 1, 0.25)), step: 0.25, note: 'Defaults span ±1 in around the current CG height, bounded at the base plane.' },
    mountSpacing: { min: explorerRound(config.component.dimensionsM[0] / INCH * 0.6, 0.25), max: explorerRound(config.component.dimensionsM[0] / INCH * 0.95, 0.25), step: 0.25, note: 'Defaults span 60–95% of the current component X length.' },
    mountSpacingY: { min: explorerRound(config.component.dimensionsM[1] / INCH * 0.6, 0.25), max: explorerRound(config.component.dimensionsM[1] / INCH * 0.95, 0.25), step: 0.25, note: 'Defaults span 60–95% of the current component Y width.' },
    stackCount: { min: 1, max: 3, step: 1, note: 'Whole elements only; the same count is applied above and below each mount.' }
  };
}

function defaultExplorerSettings(config) {
  const ranges = sorbothaneExplorerVariableDefaults(config);
  return { xVariable: 'thickness', xMin: ranges.thickness.min, xMax: ranges.thickness.max, yVariable: 'od', yMin: ranges.od.min, yMax: ranges.od.max, output: 't1200' };
}

function normalizeExplorerSettings(config, input = {}) {
  const defaults = sorbothaneExplorerVariableDefaults(config);
  const baseline = defaultExplorerSettings(config);
  const xVariable = defaults[input.xVariable] ? input.xVariable : baseline.xVariable;
  const yVariable = defaults[input.yVariable] ? input.yVariable : baseline.yVariable;
  const numberOr = (value, fallback) => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : fallback;
  const outputs = ['t1200', 't600', 'peak', 'verticalMode'];
  return {
    xVariable,
    xMin: numberOr(input.xMin, defaults[xVariable].min),
    xMax: numberOr(input.xMax, defaults[xVariable].max),
    yVariable,
    yMin: numberOr(input.yMin, defaults[yVariable].min),
    yMax: numberOr(input.yMax, defaults[yVariable].max),
    output: outputs.includes(input.output) ? input.output : baseline.output
  };
}

function defaultCatalogScreenSettings(configInput = DEFAULT_SORBOTHANE_CONFIG) {
  const config = normalizeSorbothaneConfig(configInput);
  return {
    geometry: 'all', odMin: 0.5, odMax: 5, idMin: 0, idMax: 3.1, thicknessMin: 0.125, thicknessMax: 1, stackMin: 1, stackMax: 8,
    xTranslationMinHz: config.analysis.lateralModeMinimumHz[0], yTranslationMinHz: config.analysis.lateralModeMinimumHz[1],
    verticalMinHz: config.analysis.modeAcceptBandHz[0], verticalMaxHz: config.analysis.modeAcceptBandHz[1],
    resonanceMinHz: config.analysis.resonanceBandHz[0], resonanceMaxHz: config.analysis.resonanceBandHz[1], resonanceMaximumDb: config.analysis.resonanceLimitDb,
    toneCriteria: config.analysis.tones.map(tone => ({ frequencyHz: tone.frequencyHz, maximumDb: tone.maximumDb }))
  };
}

function normalizeCatalogScreenSettings(configInput, input = {}) {
  const defaults = defaultCatalogScreenSettings(configInput);
  const numberOr = (value, fallback) => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : fallback;
  const inputTones = Array.isArray(input.toneCriteria) ? input.toneCriteria : defaults.toneCriteria;
  const normalized = {
    geometry: ['all', 'washer', 'ring', 'disc'].includes(input.geometry) ? input.geometry : defaults.geometry,
    odMin: numberOr(input.odMin, defaults.odMin),
    odMax: numberOr(input.odMax, defaults.odMax),
    idMin: numberOr(input.idMin, defaults.idMin),
    idMax: numberOr(input.idMax, defaults.idMax),
    thicknessMin: numberOr(input.thicknessMin, defaults.thicknessMin),
    thicknessMax: numberOr(input.thicknessMax, defaults.thicknessMax),
    stackMin: clamp(Math.round(numberOr(input.stackMin, defaults.stackMin)), 1, 8),
    stackMax: clamp(Math.round(numberOr(input.stackMax, defaults.stackMax)), 1, 8),
    xTranslationMinHz: Math.max(0.1, numberOr(input.xTranslationMinHz, defaults.xTranslationMinHz)),
    yTranslationMinHz: Math.max(0.1, numberOr(input.yTranslationMinHz, defaults.yTranslationMinHz)),
    verticalMinHz: Math.max(0.1, numberOr(input.verticalMinHz, defaults.verticalMinHz)),
    verticalMaxHz: Math.max(0.1, numberOr(input.verticalMaxHz, defaults.verticalMaxHz)),
    resonanceMinHz: Math.max(0.1, numberOr(input.resonanceMinHz, defaults.resonanceMinHz)),
    resonanceMaxHz: Math.max(0.1, numberOr(input.resonanceMaxHz, defaults.resonanceMaxHz)),
    resonanceMaximumDb: numberOr(input.resonanceMaximumDb, defaults.resonanceMaximumDb),
    toneCriteria: inputTones.slice(0, 8).map((tone, index) => ({
      frequencyHz: Math.max(0.1, numberOr(tone?.frequencyHz, defaults.toneCriteria[index]?.frequencyHz ?? 600)),
      maximumDb: numberOr(tone?.maximumDb, defaults.toneCriteria[index]?.maximumDb ?? -10)
    }))
  };
  for (const prefix of ['od', 'id', 'thickness', 'stack', 'vertical', 'resonance']) {
    const suffix = prefix === 'vertical' || prefix === 'resonance' ? 'Hz' : '';
    const minimum = `${prefix}Min${suffix}`;
    const maximum = `${prefix}Max${suffix}`;
    if (normalized[minimum] > normalized[maximum]) [normalized[minimum], normalized[maximum]] = [normalized[maximum], normalized[minimum]];
  }
  return normalized;
}

function catalogScreenControls(config, settingsInput = {}) {
  const settings = normalizeCatalogScreenSettings(config, settingsInput);
  const range = (label, prefix, step) => `<label><span>${label}</span><span class="inline-inputs"><input data-catalog-screen="${prefix}Min" aria-label="${label} minimum" type="number" value="${fmt(settings[`${prefix}Min`], 4)}" min="0" step="${step}"/><input data-catalog-screen="${prefix}Max" aria-label="${label} maximum" type="number" value="${fmt(settings[`${prefix}Max`], 4)}" min="0" step="${step}"/></span></label>`;
  return `<div class="sorbo-catalog-controls"><label><span>Catalog geometry</span><select data-catalog-screen="geometry"><option value="all"${settings.geometry === 'all' ? ' selected' : ''}>All standard products</option><option value="washer"${settings.geometry === 'washer' ? ' selected' : ''}>Washers</option><option value="ring"${settings.geometry === 'ring' ? ' selected' : ''}>Isolation rings</option><option value="disc"${settings.geometry === 'disc' ? ' selected' : ''}>Discs</option></select></label>${range('OD min / max (in)', 'od', 0.025)}${range('ID min / max (in)', 'id', 0.025)}${range('Thickness min / max (in)', 'thickness', 0.025)}${range('Elements / side min / max', 'stack', 1)}<button type="button" class="button" data-sorbo-action="screen-catalog">Screen full catalog</button></div>`;
}

function catalogToneCriteriaRows(settings) {
  if (!settings.toneCriteria.length) return '<p class="sorbo-no-tone-criteria">No discrete-frequency attenuation criteria are active. Add one below if the design has a tone requirement.</p>';
  return settings.toneCriteria.map((tone, index) => `<article class="sorbo-tone-criterion"><span>T${index + 1}</span><label>Frequency <small>Hz</small><input type="number" min="0.1" max="2000" step="1" value="${fmt(tone.frequencyHz, 3)}" data-catalog-tone-index="${index}" data-catalog-tone-field="frequencyHz" aria-label="Tone ${index + 1} frequency"/></label><label>Maximum <small>dB</small><input type="number" step="0.5" value="${fmt(tone.maximumDb, 3)}" data-catalog-tone-index="${index}" data-catalog-tone-field="maximumDb" aria-label="Tone ${index + 1} maximum dB"/></label><button type="button" class="button-quiet" data-sorbo-action="remove-catalog-tone" data-catalog-tone-index="${index}" aria-label="Remove tone ${index + 1} criterion">Remove</button></article>`).join('');
}

function catalogToneCriteriaSummary(settings) {
  const count = settings.toneCriteria.length;
  return `${count} tone ${count === 1 ? 'criterion' : 'criteria'} plus resonance limit`;
}

function catalogCriteriaControls(config, settingsInput = {}) {
  const settings = normalizeCatalogScreenSettings(config, settingsInput);
  const toneRows = catalogToneCriteriaRows(settings);
  return `<section class="sorbo-catalog-criteria"><header><div><p class="eyebrow">Active screening criteria</p><h3>Edit or add requirements</h3></div><span>Applied when you use a design</span></header><p class="sorbo-caption">Tone and resonance limits apply independently to direct Txx, Tyy, and Tzz; screening uses the worst direction.</p><div class="sorbo-catalog-builtins"><label><span>X / Y translation minimum <small>Hz</small></span><span class="inline-inputs"><input data-catalog-criterion="xTranslationMinHz" aria-label="X translation mode minimum" type="number" min="0.1" step="1" value="${fmt(settings.xTranslationMinHz, 3)}"/><input data-catalog-criterion="yTranslationMinHz" aria-label="Y translation mode minimum" type="number" min="0.1" step="1" value="${fmt(settings.yTranslationMinHz, 3)}"/></span></label><label><span>Vertical mode min / max <small>Hz</small></span><span class="inline-inputs"><input data-catalog-criterion="verticalMinHz" aria-label="Vertical mode minimum" type="number" min="0.1" step="1" value="${fmt(settings.verticalMinHz, 3)}"/><input data-catalog-criterion="verticalMaxHz" aria-label="Vertical mode maximum" type="number" min="0.1" step="1" value="${fmt(settings.verticalMaxHz, 3)}"/></span></label><label><span>Resonance search band min / max <small>Hz</small></span><span class="inline-inputs"><input data-catalog-criterion="resonanceMinHz" aria-label="Resonance band minimum" type="number" min="0.1" step="1" value="${fmt(settings.resonanceMinHz, 3)}"/><input data-catalog-criterion="resonanceMaxHz" aria-label="Resonance band maximum" type="number" min="0.1" step="1" value="${fmt(settings.resonanceMaxHz, 3)}"/></span></label><label><span>Maximum resonance peak <small>dB</small></span><input data-catalog-criterion="resonanceMaximumDb" aria-label="Maximum resonance peak" type="number" step="0.5" value="${fmt(settings.resonanceMaximumDb, 3)}"/></label></div><div class="sorbo-tone-criteria" data-sorbo-tone-criteria>${toneRows}</div><div class="sorbo-add-criterion"><label><span>New tone frequency <small>Hz</small></span><input data-catalog-new-tone="frequencyHz" aria-label="New tone frequency" type="number" min="0.1" max="2000" step="1" placeholder="800"/></label><label><span>Maximum transmissibility <small>dB</small></span><input data-catalog-new-tone="maximumDb" aria-label="New tone maximum dB" type="number" step="0.5" placeholder="-15"/></label><button type="button" class="button-quiet" data-sorbo-action="add-catalog-tone">Add tone criterion</button><span data-catalog-criterion-message aria-live="polite"></span></div></section>`;
}

function catalogProgressPanel() {
  return `<div class="sorbo-catalog-progress" data-sorbo-catalog-progress hidden><div><strong data-catalog-progress-label>Preparing catalog screen…</strong><span data-catalog-progress-percent>0%</span></div><progress data-catalog-progress-bar max="100" value="0">0%</progress><small data-catalog-progress-detail>The interface remains available while combinations are evaluated.</small></div>`;
}

function catalogCandidateFailure(candidate) {
  const lateralFailures = candidate.analysis.lateralModeResults.filter(result => !result.pass).map(result => `${result.axis} translation mode`);
  const failures = candidate.analysis.toneResults.flatMap(result => result.axisResults.filter(axisResult => !axisResult.pass).map(axisResult => `${fmt(result.frequencyHz, 0)} Hz T${axisResult.axis.toLowerCase()}${axisResult.axis.toLowerCase()}`));
  failures.unshift(...lateralFailures);
  failures.push(...candidate.analysis.peakResults.filter(result => !result.pass).map(result => `${result.axis} resonance peak`));
  return failures.join(', ') || 'dynamic requirement';
}

function catalogCandidateTable(candidates, criteria, includeStatus = false) {
  const toneHeaders = criteria.tones.map(tone => `<th>Worst T @ ${fmt(tone.frequencyHz, 0)}</th>`).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Part number</th><th>Geometry</th><th>OD / ID / t</th><th>Durometer</th><th>Elements / side</th><th>Total qty</th><th>Rated / element</th><th>Installed load / element</th><th>Nominal preload</th><th>X mode</th><th>Y mode</th><th>Z mode</th>${toneHeaders}<th>Worst peak</th>${includeStatus ? '<th>Review</th>' : ''}<th></th></tr></thead><tbody>${candidates.map((candidate, index) => {
    const item = candidate.item;
    const tones = candidate.analysis.toneResults;
    const lateral = candidate.analysis.lateralModeResults;
    const vertical = candidate.analysis.verticalModeResult;
    return `<tr><td>${index + 1}</td><td><strong>${esc(item.productNumber)}</strong></td><td>${esc(item.geometry)}</td><td>${fmt(item.odIn, 3)} / ${fmt(item.idIn, 3)} / ${fmt(item.thicknessIn, 3)} in</td><td>${item.durometer} Shore 00</td><td>${candidate.stackCount}</td><td>${candidate.totalElementCount}</td><td>${item.ratedLoadLb.map(value => fmt(value, 2)).join('–')} lbf</td><td>${candidate.installedLoadRangeLb.map(value => fmt(value, 2)).join('–')} lbf</td><td>${fmt(candidate.analysis.preload.preloadN / LBF, 2)} lbf</td><td>${fmt(lateral[0].frequencyHz, 1)} Hz</td><td>${fmt(lateral[1].frequencyHz, 1)} Hz</td><td>${fmt(vertical.frequencyHz, 1)} Hz</td>${tones.map(result => `<td>${fmt(result.db, 1)} dB · ${result.worstAxis}</td>`).join('')}<td>${fmt(candidate.analysis.peak.db, 1)} dB · ${candidate.analysis.peak.axis}</td>${includeStatus ? `<td><span class="sorbo-status fail">${esc(catalogCandidateFailure(candidate))}</span></td>` : ''}<td><button type="button" class="button-quiet sorbo-use-candidate" data-sorbo-catalog-use="${esc(item.productNumber)}" data-sorbo-catalog-stack="${candidate.stackCount}">Use design</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function catalogScreenResult(screen) {
  const summary = `<div class="sorbo-catalog-summary"><span><b>${screen.catalogPartCount}</b> catalog parts</span><span><b>${screen.eligiblePartCount}</b> within geometry</span><span><b>${screen.combinationCount}</b> part/stack combinations</span><span><b>${screen.passingPartCount}</b> passing part numbers</span></div>`;
  const exclusion = `<p class="sorbo-caption">Pre-screen exclusions by combination: ${screen.exclusions.compression} compression, ${screen.exclusions.engagement} unloading, ${screen.exclusions.ratedLoad} rated load, ${screen.exclusions.xTranslation} X-mode minimum, ${screen.exclusions.yTranslation} Y-mode minimum, ${screen.exclusions.verticalMode} vertical-mode placement. Counts can overlap. ${screen.dynamicallyEvaluatedCount} combinations reached the all-direction tone and resonance evaluation.</p>`;
  if (!screen.recommendations.length) {
    const near = screen.nearMisses.length ? `<h3>Closest dynamically evaluated combinations</h3>${catalogCandidateTable(screen.nearMisses, screen.criteria, true)}` : '';
    return `${summary}<div class="sorbo-empty sorbo-catalog-empty"><strong>No catalog configuration passes every active criterion.</strong><p>Widen the geometry or stack limits, or review the X/Y translation minima, vertical-mode band, compression, tone limits, and resonance limit.</p></div>${near}${exclusion}`;
  }
  const winner = screen.recommendations[0];
  const item = winner.item;
  return `${summary}<article class="sorbo-catalog-recommendation"><div><p class="eyebrow">Recommended catalog configuration</p><h3>${esc(item.productNumber)}</h3><p>${esc(item.geometry)} · ${item.durometer} Shore 00 · ${fmt(item.odIn, 3)} OD × ${fmt(item.idIn, 3)} ID × ${fmt(item.thicknessIn, 3)} in thick</p></div><div><strong>${winner.stackCount}</strong><span>element${winner.stackCount === 1 ? '' : 's'} per side at each mount</span><small>${winner.totalElementCount} elements total for four captured mounts</small></div><button type="button" class="button" data-sorbo-catalog-use="${esc(item.productNumber)}" data-sorbo-catalog-stack="${winner.stackCount}">Use recommended design</button></article><h3>Passing part-number recommendations</h3><p class="sorbo-caption">For each part, the table keeps the smallest stack count that passes. Parts are then ranked by tone attenuation and resonance margin.</p>${catalogCandidateTable(screen.recommendations, screen.criteria)}${exclusion}`;
}

function explorerPanel(configInput = DEFAULT_SORBOTHANE_CONFIG, settingsInput = {}, catalogSettingsInput = {}) {
  const config = normalizeSorbothaneConfig(configInput);
  const ranges = sorbothaneExplorerVariableDefaults(config);
  const settings = normalizeExplorerSettings(config, settingsInput);
  const catalogSettings = normalizeCatalogScreenSettings(config, catalogSettingsInput);
  const options = selected => EXPLORER_VARIABLE_CHOICES.map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');
  const outputOptions = [['t1200', 'Worst X/Y/Z T @ 1200 Hz (dB)'], ['t600', 'Worst X/Y/Z T @ 600 Hz (dB)'], ['peak', 'Worst X/Y/Z peak (dB)'], ['verticalMode', 'Vertical mode (Hz)']];
  return `<section class="sorbo-tab-panel" data-sorbo-panel="explorer"><section class="sorbo-card"><header><div><p class="eyebrow">Catalog sizing</p><h2>Recommend a part number and stack count</h2></div><span>${SORBOTHANE_CATALOG.length - 1} manufacturer records</span></header><p class="sorbo-catalog-intro">Filter the catalog by nominal geometry. Every eligible part is checked at each allowed stack count using the current mass, CG, acceleration, compression basis, material model, and active criteria below.</p><div class="sorbo-criteria-strip"><span>Installed upper/lower load within catalog rating</span><span>10–20% recommended compression</span><span>No element unloading</span><span data-catalog-lateral-criterion>X / Y translation ≥ ${fmt(catalogSettings.xTranslationMinHz, 0)} / ${fmt(catalogSettings.yTranslationMinHz, 0)} Hz</span><span data-catalog-vertical-criterion>Vertical mode in ${fmt(catalogSettings.verticalMinHz, 0)}–${fmt(catalogSettings.verticalMaxHz, 0)} Hz</span><span data-catalog-criterion-count>${catalogToneCriteriaSummary(catalogSettings)}</span></div>${catalogCriteriaControls(config, catalogSettings)}${catalogScreenControls(config, catalogSettings)}${catalogProgressPanel()}<div data-sorbo-catalog-result><div class="sorbo-empty"><strong>Screen the manufacturer catalog.</strong><p>Stacked elements act in series: each element carries the same installed stack load, while additional elements reduce mount stiffness.</p></div></div></section><section class="sorbo-card"><header><div><p class="eyebrow">Transparent parametric sweep</p><h2>Isolation map and ranked candidates</h2></div><span>No opaque optimizer</span></header><div class="sorbo-explorer-controls"><label><span>X variable</span><select data-explorer="xVariable">${options(settings.xVariable)}</select></label><label><span>X min / max</span><span class="inline-inputs"><input data-explorer="xMin" aria-label="X minimum" type="number" value="${fmt(settings.xMin, 6)}" step="${ranges[settings.xVariable].step}"/><input data-explorer="xMax" aria-label="X maximum" type="number" value="${fmt(settings.xMax, 6)}" step="${ranges[settings.xVariable].step}"/></span><small class="sorbo-explorer-range-note" data-explorer-range-note="x">${esc(ranges[settings.xVariable].note)}</small></label><label><span>Y variable</span><select data-explorer="yVariable">${options(settings.yVariable)}</select></label><label><span>Y min / max</span><span class="inline-inputs"><input data-explorer="yMin" aria-label="Y minimum" type="number" value="${fmt(settings.yMin, 6)}" step="${ranges[settings.yVariable].step}"/><input data-explorer="yMax" aria-label="Y maximum" type="number" value="${fmt(settings.yMax, 6)}" step="${ranges[settings.yVariable].step}"/></span><small class="sorbo-explorer-range-note" data-explorer-range-note="y">${esc(ranges[settings.yVariable].note)}</small></label><label><span>Color output</span><select data-explorer="output">${outputOptions.map(([value, label]) => `<option value="${value}"${value === settings.output ? ' selected' : ''}>${label}</option>`).join('')}</select></label><button type="button" class="button" data-sorbo-action="run-explorer">Run 7 × 7 sweep</button></div><div data-sorbo-explorer-result><div class="sorbo-empty"><strong>Choose two variables.</strong><p>The app evaluates every visible grid point, applies the same mechanics and requirements, and ranks inspectable candidates.</p></div></div></section></section>`;
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
  const toneHeaders = (grid.candidates[0]?.analysis.toneResults ?? []).map(result => `<th>Worst T${fmt(result.frequencyHz, 0)}</th>`).join('');
  return `<div class="sorbo-explorer-result"><section><h3>${esc(grid.output)} isolation map</h3>${heatmapSvg(grid)}</section><section><h3>Ranked candidates</h3><div class="table-wrap"><table><thead><tr><th>Rank</th><th>${esc(grid.xVariable)}</th><th>${esc(grid.yVariable)}</th><th>Six modes (Hz)</th><th>Map value</th>${toneHeaders}<th>Worst peak</th><th>Compression</th><th>Nominal precompression</th><th>Compliance</th></tr></thead><tbody>${grid.candidates.map((candidate, index) => `<tr><td>${index + 1}</td><td>${fmt(candidate.xValue, 3)}</td><td>${fmt(candidate.yValue, 3)}</td><td>${candidate.analysis.modes.map(mode => fmt(mode.frequencyHz, 1)).join(' · ')}</td><td>${fmt(candidate.value, 2)}</td>${candidate.analysis.toneResults.map(result => `<td>${fmt(result.db, 1)} dB · ${result.worstAxis}</td>`).join('')}<td>${fmt(candidate.analysis.peak.db, 1)} dB · ${candidate.analysis.peak.axis}</td><td>${fmt(candidate.analysis.preload.compressionPct, 1)}%</td><td>${fmt(candidate.analysis.preload.preloadN / LBF, 2)} lbf / element</td><td><span class="sorbo-status ${candidate.pass ? 'pass' : 'fail'}">${candidate.pass ? 'PASS' : 'REVIEW'}</span><small>${candidate.analysis.preload.allEngaged ? 'engaged' : 'unloaded'} · ${candidate.analysis.preload.catalogCompliant ? 'catalog OK/N/A' : 'outside rating'} · ${candidate.analysis.preload.compressionCompliant ? 'compression OK' : 'compression outside'}</small></td></tr>`).join('')}</tbody></table></div></section></div>`;
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

export function renderSorbothaneIsolationWorkbench(configInput = null, explorerSettingsInput = {}, catalogSettingsInput = {}) {
  const config = normalizeSorbothaneConfig(configInput ?? DEFAULT_SORBOTHANE_CONFIG);
  const analysis = analyzeSorbothaneIsolation(config);
  return `<div class="page-shell sorbo-workbench" data-sorbothane-workbench><nav class="breadcrumbs site-breadcrumbs" aria-label="Breadcrumb"><a href="#/tools">Tools</a><span aria-hidden="true">›</span><span>Dynamics</span><span aria-hidden="true">›</span><span aria-current="page">Sorbothane 6-DOF Isolation Designer</span></nav>
    <section class="sorbo-hero"><div><p class="eyebrow">Aerospace component isolation · Engineering workbench</p><h1>Place the resonance deliberately.<br><span>See what gets through.</span></h1><p>Design a four-point captured Sorbothane system with traceable viscoelastic properties, full rigid-body coupling, complex frequency response, static engagement checks, and inspectable trade studies.</p></div><aside><strong data-sorbo-hero-mode>${fmt(analysis.modes.find(mode => mode.dominantIndex === 2)?.frequencyHz ?? analysis.modes[2].frequencyHz, 1)} Hz</strong><span>vertical bounce</span><b data-sorbo-hero-status class="${analysis.passes ? 'pass-text' : 'fail-text'}">${analysis.passes ? 'DEFINED REQUIREMENTS PASS' : 'DESIGN REVIEW REQUIRED'}</b><small>Manufacturer curves end at 300 Hz; 600-2000 Hz uses the selected visible assumption.</small></aside></section>
    ${exportControls()}
    <section class="sorbo-shell">${inputSidebar(config)}<main class="sorbo-main"><nav class="sorbo-tabs" role="tablist">${[['overview', 'Overview'], ['modes', 'Modes'], ['transmissibility', 'Transmissibility'], ['sorbothane', 'Sorbothane'], ['explorer', 'Design Explorer'], ['assumptions', 'Assumptions / Validation']].map(([id, label], index) => `<button type="button" role="tab" data-sorbo-tab="${id}" class="${index === 0 ? 'active' : ''}">${label}</button>`).join('')}</nav><div data-sorbo-panels>${overviewPanel(config, analysis)}${modesPanel(config, analysis)}${transmissibilityPanel(analysis)}${sorbothanePanel(config, analysis)}${explorerPanel(config, explorerSettingsInput, catalogSettingsInput)}${assumptionsPanel(config, analysis)}</div></main></section>
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
  const header = ['base_excitation_axis', 'frequency_hz', 'Tx_mag', 'Tx_db', 'Tx_phase_deg', 'Ty_mag', 'Ty_db', 'Ty_phase_deg', 'Tz_mag', 'Tz_db', 'Tz_phase_deg', 'Rx_rad_per_m', 'Rx_db', 'Rx_phase_deg', 'Ry_rad_per_m', 'Ry_db', 'Ry_phase_deg', 'Rz_rad_per_m', 'Rz_db', 'Rz_phase_deg', 'material_region'];
  const rows = ['x', 'y', 'z'].flatMap(axis => {
    const response = analysis.directionalResponses[axis];
    return response.frequencies.map((frequency, index) => {
      const values = [axis.toUpperCase(), frequency];
      for (let dof = 0; dof < 6; dof += 1) values.push(response.magnitude[dof][index], response.db[dof][index], response.phaseDeg[dof][index]);
      values.push(response.supported[index] ? 'manufacturer-supported-or-digitized' : 'engineering-extrapolation');
      return values.join(',');
    });
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

| Target | Calculated response | Requirement | Status |
|---|---:|---:|---|
${analysis.lateralModeResults.map(result => `| ${result.axis} translation-dominated mode | Mode ${result.modeNumber} · ${fmt(result.frequencyHz, 2)} Hz | ≥ ${fmt(result.minimumHz, 2)} Hz | ${result.pass ? 'PASS' : 'FAIL'} |`).join('\n')}
| Z translation-dominated mode | Mode ${analysis.verticalModeResult.modeNumber} · ${fmt(analysis.verticalModeResult.frequencyHz, 2)} Hz | ${fmt(analysis.verticalModeResult.rangeHz[0], 2)}–${fmt(analysis.verticalModeResult.rangeHz[1], 2)} Hz | ${analysis.verticalModeResult.pass ? 'PASS' : 'FAIL'} |
${analysis.toneResults.flatMap(result => result.axisResults.map(axisResult => `| ${fmt(result.frequencyHz, 0)} Hz · T${axisResult.axis.toLowerCase()}${axisResult.axis.toLowerCase()} | ${fmtSignedDb(axisResult.db, 2)} | ≤ ${fmtSignedDb(result.maximumDb, 2)} | ${axisResult.pass ? 'PASS' : 'FAIL'} |`)).join('\n')}
${analysis.peakResults.map(result => `| ${fmt(config.analysis.resonanceBandHz[0], 0)}-${fmt(config.analysis.resonanceBandHz[1], 0)} Hz · T${result.axis.toLowerCase()}${result.axis.toLowerCase()} peak | ${fmtSignedDb(result.db, 2)} @ ${fmt(result.frequencyHz, 2)} Hz | ≤ ${fmtSignedDb(config.analysis.resonanceLimitDb, 2)} | ${result.pass ? 'PASS' : 'FAIL'} |`).join('\n')}

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
  root.querySelectorAll('[data-sorbo-chart-hit]').forEach(hit => {
    const view = hit.dataset.sorboChartHit;
    const tooltip = hit.closest('svg')?.querySelector(`[data-sorbo-tooltip="${view}"]`);
    if (!tooltip) return;
    const line = tooltip.querySelector('[data-tip-line]');
    const text = tooltip.querySelector('[data-tip-text]');
    const response = view === 'direct' ? analysis.directionalResponses.x : analysis.response;
    hit.addEventListener('pointermove', event => {
      const svg = hit.closest('svg');
      const rect = svg.getBoundingClientRect();
      const viewX = (event.clientX - rect.left) / rect.width * 960;
      const fraction = clamp((viewX - 68) / (960 - 68 - 22), 0, 1);
      const frequency = 10 ** (Math.log10(response.frequencies[0]) + fraction * (Math.log10(response.frequencies.at(-1)) - Math.log10(response.frequencies[0])));
      let index = 0;
      for (let candidate = 1; candidate < response.frequencies.length; candidate += 1) if (Math.abs(Math.log(response.frequencies[candidate] / frequency)) < Math.abs(Math.log(response.frequencies[index] / frequency))) index = candidate;
      const x = 68 + index / (response.frequencies.length - 1) * (960 - 68 - 22);
      const boxX = x > 710 ? x - 223 : x + 9;
      tooltip.hidden = false;
      tooltip.setAttribute('transform', `translate(${boxX} 42)`);
      line.setAttribute('x1', x - boxX);
      line.setAttribute('x2', x - boxX);
      line.setAttribute('y1', -14);
      line.setAttribute('y2', 378);
      if (view === 'direct') {
        const rows = ['x', 'y', 'z'].map((axis, dof) => {
          const axisResponse = analysis.directionalResponses[axis];
          return `<tspan x="10" dy="16">T${axis}${axis}: ${fmt(axisResponse.db[dof][index], 1)} dB · ${fmt(axisResponse.phaseDeg[dof][index], 0)}°</tspan>`;
        }).join('');
        text.innerHTML = `<tspan x="10" dy="0">${fmt(response.frequencies[index], 1)} Hz</tspan>${rows}`;
      } else {
        const labels = ['Tx', 'Ty', 'Tz', 'Rx', 'Ry', 'Rz'];
        text.innerHTML = `<tspan x="10" dy="0">${fmt(response.frequencies[index], 1)} Hz · ${response.axis.toUpperCase()} base</tspan>${labels.map((label, dof) => `<tspan x="10" dy="16">${label}: ${fmt(response.db[dof][index], 1)} dB · ${fmt(response.phaseDeg[dof][index], 0)}°</tspan>`).join('')}`;
      }
    });
    hit.addEventListener('pointerleave', () => { tooltip.hidden = true; });
  });
}

export function bindSorbothaneIsolationWorkbench(root = document) {
  let shell = root.querySelector('[data-sorbothane-workbench]');
  if (!shell) return () => {};
  let config;
  try { config = normalizeSorbothaneConfig(JSON.parse(localStorage.getItem('sau-sorbothane-isolation-v1') || 'null') ?? DEFAULT_SORBOTHANE_CONFIG); }
  catch { config = normalizeSorbothaneConfig(DEFAULT_SORBOTHANE_CONFIG); }
  let analysis = analyzeSorbothaneIsolation(config);
  let explorerSettings = defaultExplorerSettings(config);
  let catalogSettings = defaultCatalogScreenSettings(config);
  let catalogRunToken = 0;
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
    catalogRunToken += 1;
    analysis = analyzeSorbothaneIsolation(config);
    const panels = shell.querySelector('[data-sorbo-panels]');
    panels.innerHTML = `${overviewPanel(config, analysis)}${modesPanel(config, analysis)}${transmissibilityPanel(analysis)}${sorbothanePanel(config, analysis)}${explorerPanel(config, explorerSettings, catalogSettings)}${assumptionsPanel(config, analysis)}`;
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
  const rerenderWorkbench = () => {
    catalogRunToken += 1;
    analysis = analyzeSorbothaneIsolation(config);
    const replacement = document.createElement('div');
    replacement.innerHTML = renderSorbothaneIsolationWorkbench(config, explorerSettings, catalogSettings);
    const next = replacement.firstElementChild;
    shell.replaceWith(next);
    shell = next;
    bindInputs();
    bindPanelControls();
    showTab(activeTab);
    updateVisibility();
    syncSidebarControls();
    save();
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
      catalogRunToken += 1;
      config.units = event.target.value;
      const replacement = document.createElement('div');
      replacement.innerHTML = renderSorbothaneIsolationWorkbench(config, explorerSettings, catalogSettings);
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
      explorerSettings = defaultExplorerSettings(config);
      catalogSettings = defaultCatalogScreenSettings(config);
      catalogRunToken += 1;
      localStorage.removeItem('sau-sorbothane-isolation-v1');
      const replacement = document.createElement('div');
      replacement.innerHTML = renderSorbothaneIsolationWorkbench(config, explorerSettings, catalogSettings);
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
    shell.querySelector('[data-sorbo-action="add-project"]')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('sau:add-artifact', { detail: { type: 'Isolation design', title: 'Sorbothane 6-DOF isolation configuration', route: location.hash, takeaway: analysis.passes ? 'Defined isolation and resonance requirements pass.' : 'The configuration requires engineering review.', validity: 'Rigid-body linear viscoelastic screening model; high-frequency properties extrapolated above 300 Hz.', warnings: analysis.warnings, inputs: config, outputs: { modes: analysis.modes, lateralModeResults: analysis.lateralModeResults, verticalModeResult: analysis.verticalModeResult, tones: analysis.toneResults, peak: analysis.peak, peakResults: analysis.peakResults } } })));
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
    const catalogResult = shell.querySelector('[data-sorbo-catalog-result]');
    const cancelCatalogScreen = () => {
      catalogRunToken += 1;
      const button = shell.querySelector('[data-sorbo-action="screen-catalog"]');
      const progress = shell.querySelector('[data-sorbo-catalog-progress]');
      if (button) {
        button.disabled = false;
        button.textContent = 'Screen full catalog';
      }
      if (progress) progress.hidden = true;
    };
    const clearCatalogResult = (title = 'Catalog limits or criteria updated.') => {
      cancelCatalogScreen();
      if (catalogResult) catalogResult.innerHTML = `<div class="sorbo-empty"><strong>${esc(title)}</strong><p>Run the catalog screen to evaluate the revised requirements.</p></div>`;
    };
    const updateModeCriteriaStrip = () => {
      const lateral = shell.querySelector('[data-catalog-lateral-criterion]');
      const vertical = shell.querySelector('[data-catalog-vertical-criterion]');
      if (lateral) lateral.textContent = `X / Y translation ≥ ${fmt(catalogSettings.xTranslationMinHz, 0)} / ${fmt(catalogSettings.yTranslationMinHz, 0)} Hz`;
      if (vertical) vertical.textContent = `Vertical mode in ${fmt(catalogSettings.verticalMinHz, 0)}–${fmt(catalogSettings.verticalMaxHz, 0)} Hz`;
    };
    shell.querySelectorAll('[data-catalog-screen]').forEach(control => control.addEventListener('change', event => {
      const key = event.target.dataset.catalogScreen;
      catalogSettings[key] = key === 'geometry' ? event.target.value : Number(event.target.value);
      clearCatalogResult();
    }));
    shell.querySelectorAll('[data-catalog-criterion]').forEach(control => control.addEventListener('change', event => {
      catalogSettings[event.target.dataset.catalogCriterion] = Number(event.target.value);
      updateModeCriteriaStrip();
      clearCatalogResult('Active criteria updated.');
    }));
    const criteriaEditor = shell.querySelector('.sorbo-catalog-criteria');
    const renderToneCriteria = () => {
      const rows = criteriaEditor?.querySelector('[data-sorbo-tone-criteria]');
      const count = shell.querySelector('[data-catalog-criterion-count]');
      if (rows) rows.innerHTML = catalogToneCriteriaRows(catalogSettings);
      if (count) count.textContent = catalogToneCriteriaSummary(catalogSettings);
    };
    criteriaEditor?.addEventListener('change', event => {
      const index = Number(event.target.dataset.catalogToneIndex);
      const field = event.target.dataset.catalogToneField;
      if (!Number.isInteger(index) || !field || !catalogSettings.toneCriteria[index]) return;
      catalogSettings.toneCriteria[index][field] = Number(event.target.value);
      clearCatalogResult('Active criteria updated.');
    });
    criteriaEditor?.addEventListener('click', event => {
      const remove = event.target.closest('[data-sorbo-action="remove-catalog-tone"]');
      if (remove) {
        const index = Number(remove.dataset.catalogToneIndex);
        if (Number.isInteger(index) && catalogSettings.toneCriteria[index]) {
          catalogSettings.toneCriteria.splice(index, 1);
          renderToneCriteria();
          clearCatalogResult('Tone criterion removed.');
        }
        return;
      }
      const add = event.target.closest('[data-sorbo-action="add-catalog-tone"]');
      if (!add) return;
      const frequencyControl = criteriaEditor.querySelector('[data-catalog-new-tone="frequencyHz"]');
      const maximumControl = criteriaEditor.querySelector('[data-catalog-new-tone="maximumDb"]');
      const message = criteriaEditor.querySelector('[data-catalog-criterion-message]');
      const frequencyHz = Number(frequencyControl?.value);
      const maximumDb = Number(maximumControl?.value);
      if (catalogSettings.toneCriteria.length >= 8) {
        if (message) message.textContent = 'A maximum of eight tone criteria can be screened.';
        return;
      }
      if (!Number.isFinite(frequencyHz) || frequencyHz <= 0 || frequencyHz > 2000 || !Number.isFinite(maximumDb)) {
        if (message) message.textContent = 'Enter a frequency from 0 to 2000 Hz and a finite dB limit.';
        return;
      }
      catalogSettings.toneCriteria.push({ frequencyHz, maximumDb });
      renderToneCriteria();
      if (frequencyControl) frequencyControl.value = '';
      if (maximumControl) maximumControl.value = '';
      if (message) message.textContent = `${fmt(frequencyHz, 0)} Hz criterion added.`;
      clearCatalogResult('Tone criterion added.');
    });
    catalogResult?.addEventListener('click', event => {
      const control = event.target.closest('[data-sorbo-catalog-use]');
      if (!control) return;
      applyCatalog(control.dataset.sorboCatalogUse);
      const stackCount = clamp(Math.round(Number(control.dataset.sorboCatalogStack)), 1, 8);
      config.mounts.stackTop = stackCount;
      config.mounts.stackBottom = stackCount;
      config.analysis.lateralModeMinimumHz = [catalogSettings.xTranslationMinHz, catalogSettings.yTranslationMinHz];
      config.analysis.modeAcceptBandHz = [catalogSettings.verticalMinHz, catalogSettings.verticalMaxHz];
      config.analysis.resonanceBandHz = [catalogSettings.resonanceMinHz, catalogSettings.resonanceMaxHz];
      config.analysis.resonanceLimitDb = catalogSettings.resonanceMaximumDb;
      config.analysis.tones = catalogSettings.toneCriteria.map(tone => ({ ...tone }));
      rerenderWorkbench();
      const live = shell.querySelector('[data-sorbo-live]');
      if (live) live.textContent = `${config.isolator.productNumber} applied with ${stackCount} elements per side at each mount and ${config.analysis.tones.length} tone criteria.`;
    });
    shell.querySelector('[data-sorbo-action="screen-catalog"]')?.addEventListener('click', async event => {
      const get = key => shell.querySelector(`[data-catalog-screen="${key}"]`)?.value;
      const criterion = key => shell.querySelector(`[data-catalog-criterion="${key}"]`)?.value;
      catalogSettings = normalizeCatalogScreenSettings(config, {
        ...catalogSettings,
        geometry: get('geometry'), odMin: get('odMin'), odMax: get('odMax'), idMin: get('idMin'), idMax: get('idMax'),
        thicknessMin: get('thicknessMin'), thicknessMax: get('thicknessMax'), stackMin: get('stackMin'), stackMax: get('stackMax'),
        xTranslationMinHz: criterion('xTranslationMinHz'), yTranslationMinHz: criterion('yTranslationMinHz'),
        verticalMinHz: criterion('verticalMinHz'), verticalMaxHz: criterion('verticalMaxHz'),
        resonanceMinHz: criterion('resonanceMinHz'), resonanceMaxHz: criterion('resonanceMaxHz'), resonanceMaximumDb: criterion('resonanceMaximumDb')
      });
      for (const key of ['geometry', 'odMin', 'odMax', 'idMin', 'idMax', 'thicknessMin', 'thicknessMax', 'stackMin', 'stackMax']) {
        const control = shell.querySelector(`[data-catalog-screen="${key}"]`);
        if (control) control.value = catalogSettings[key];
      }
      for (const key of ['xTranslationMinHz', 'yTranslationMinHz', 'verticalMinHz', 'verticalMaxHz', 'resonanceMinHz', 'resonanceMaxHz', 'resonanceMaximumDb']) {
        const control = shell.querySelector(`[data-catalog-criterion="${key}"]`);
        if (control) control.value = catalogSettings[key];
      }
      updateModeCriteriaStrip();
      renderToneCriteria();
      const button = event.currentTarget;
      const progressPanel = shell.querySelector('[data-sorbo-catalog-progress]');
      const progressBar = progressPanel?.querySelector('[data-catalog-progress-bar]');
      const progressLabel = progressPanel?.querySelector('[data-catalog-progress-label]');
      const progressPercent = progressPanel?.querySelector('[data-catalog-progress-percent]');
      const progressDetail = progressPanel?.querySelector('[data-catalog-progress-detail]');
      const runToken = ++catalogRunToken;
      button.disabled = true;
      button.textContent = 'Screening catalog · 0%';
      if (progressPanel) progressPanel.hidden = false;
      if (catalogResult) catalogResult.innerHTML = '<div class="sorbo-empty sorbo-catalog-running"><strong>Catalog evaluation is running.</strong><p>Geometry and load checks run first; frequency-response checks follow only for viable combinations.</p></div>';
      const stageLabel = stage => ({
        'pre-screen': 'Checking geometry, installed load, and mode placement',
        dynamic: 'Evaluating tone and resonance requirements',
        complete: 'Catalog screen complete'
      }[stage] ?? 'Screening catalog');
      try {
        const screen = await screenSorbothaneCatalogAsync(config, {
          geometry: catalogSettings.geometry,
          odRange: [catalogSettings.odMin, catalogSettings.odMax],
          idRange: [catalogSettings.idMin, catalogSettings.idMax],
          thicknessRange: [catalogSettings.thicknessMin, catalogSettings.thicknessMax],
          stackRange: [catalogSettings.stackMin, catalogSettings.stackMax],
          criteria: {
            lateralModeMinimumHz: [catalogSettings.xTranslationMinHz, catalogSettings.yTranslationMinHz],
            verticalModeRangeHz: [catalogSettings.verticalMinHz, catalogSettings.verticalMaxHz],
            resonanceBandHz: [catalogSettings.resonanceMinHz, catalogSettings.resonanceMaxHz],
            resonanceMaximumDb: catalogSettings.resonanceMaximumDb,
            tones: catalogSettings.toneCriteria
          }
        }, {
          batchSize: 6,
          shouldCancel: () => runToken !== catalogRunToken,
          yieldControl: () => new Promise(resolve => requestAnimationFrame(resolve)),
          onProgress: progress => {
            if (runToken !== catalogRunToken) return;
            const percent = clamp(Math.round(progress.percent), 0, 100);
            if (progressBar) {
              progressBar.value = percent;
              progressBar.textContent = `${percent}%`;
            }
            if (progressLabel) progressLabel.textContent = stageLabel(progress.stage);
            if (progressPercent) progressPercent.textContent = `${percent}%`;
            if (progressDetail) progressDetail.textContent = `${progress.completed} of ${progress.total} combinations in this stage`;
            button.textContent = `Screening catalog · ${percent}%`;
          }
        });
        if (!screen || runToken !== catalogRunToken) return;
        if (catalogResult) catalogResult.innerHTML = catalogScreenResult(screen);
        button.disabled = false;
        button.textContent = 'Screen full catalog';
      } catch (error) {
        if (runToken !== catalogRunToken) return;
        if (catalogResult) catalogResult.innerHTML = `<div class="sorbo-empty sorbo-catalog-empty"><strong>The catalog screen stopped.</strong><p>${esc(error?.message ?? 'Unexpected screening error.')}</p></div>`;
        button.disabled = false;
        button.textContent = 'Screen full catalog';
        if (progressLabel) progressLabel.textContent = 'Catalog screen stopped';
      }
    });
    const clearExplorerResult = (title = 'Ranges updated.') => {
      const result = shell.querySelector('[data-sorbo-explorer-result]');
      if (result) result.innerHTML = `<div class="sorbo-empty"><strong>${esc(title)}</strong><p>Run the sweep to evaluate the new design space.</p></div>`;
    };
    const applyExplorerVariableDefaults = axis => {
      const variable = shell.querySelector(`[data-explorer="${axis}Variable"]`)?.value;
      const range = sorbothaneExplorerVariableDefaults(config)[variable];
      if (!range) return;
      explorerSettings[`${axis}Variable`] = variable;
      explorerSettings[`${axis}Min`] = range.min;
      explorerSettings[`${axis}Max`] = range.max;
      for (const bound of ['Min', 'Max']) {
        const control = shell.querySelector(`[data-explorer="${axis}${bound}"]`);
        if (control) {
          control.value = fmt(range[bound.toLowerCase()], 6);
          control.step = range.step;
        }
      }
      const note = shell.querySelector(`[data-explorer-range-note="${axis}"]`);
      if (note) note.textContent = range.note;
      clearExplorerResult();
    };
    for (const axis of ['x', 'y']) {
      shell.querySelector(`[data-explorer="${axis}Variable"]`)?.addEventListener('change', () => applyExplorerVariableDefaults(axis));
      for (const bound of ['Min', 'Max']) shell.querySelector(`[data-explorer="${axis}${bound}"]`)?.addEventListener('change', event => {
        explorerSettings[`${axis}${bound}`] = Number(event.target.value);
        clearExplorerResult('Range edited.');
      });
    }
    shell.querySelector('[data-explorer="output"]')?.addEventListener('change', event => {
      explorerSettings.output = event.target.value;
      clearExplorerResult('Output changed.');
    });
    shell.querySelector('[data-sorbo-action="run-explorer"]')?.addEventListener('click', event => {
      const get = key => shell.querySelector(`[data-explorer="${key}"]`)?.value;
      explorerSettings = normalizeExplorerSettings(config, {
        xVariable: get('xVariable'), xMin: get('xMin'), xMax: get('xMax'),
        yVariable: get('yVariable'), yMin: get('yMin'), yMax: get('yMax'), output: get('output')
      });
      const ranges = sorbothaneExplorerVariableDefaults(config);
      for (const axis of ['x', 'y']) {
        const minimumKey = `${axis}Min`;
        const maximumKey = `${axis}Max`;
        if (!(explorerSettings[minimumKey] < explorerSettings[maximumKey])) {
          const variable = explorerSettings[`${axis}Variable`];
          explorerSettings[minimumKey] = ranges[variable].min;
          explorerSettings[maximumKey] = ranges[variable].max;
          const minimum = shell.querySelector(`[data-explorer="${minimumKey}"]`);
          const maximum = shell.querySelector(`[data-explorer="${maximumKey}"]`);
          if (minimum) minimum.value = fmt(explorerSettings[minimumKey], 6);
          if (maximum) maximum.value = fmt(explorerSettings[maximumKey], 6);
        }
      }
      event.target.disabled = true;
      event.target.textContent = 'Evaluating 49 designs…';
      requestAnimationFrame(() => {
        const grid = runDesignGrid(config, { xVariable: explorerSettings.xVariable, yVariable: explorerSettings.yVariable, xRange: [explorerSettings.xMin, explorerSettings.xMax], yRange: [explorerSettings.yMin, explorerSettings.yMax], output: explorerSettings.output, gridSize: 7 });
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
  replacement.innerHTML = renderSorbothaneIsolationWorkbench(config, explorerSettings, catalogSettings);
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
        { label: 'Worst X/Y/Z T @ 600 Hz', value: analysis.toneResults[0].db, unit: 'dB' },
        { label: 'Worst X/Y/Z T @ 1200 Hz', value: analysis.toneResults[1].db, unit: 'dB' },
        { label: 'Shape factor', value: analysis.geometry.shapeFactor },
        { label: 'Preload per element', value: analysis.preload.preloadN / LBF, unit: 'lbf' }
      ],
      interpretation: {
        summary: `The vertical rigid-body mode is ${fmt(vertical.frequencyHz, 1)} Hz. The tone results use the worst direct X, Y, or Z transmissibility. Open the guided workbench for all six coupled modes, static engagement, directional frequency response, uncertainty, and source provenance.`,
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
