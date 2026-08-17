import { SORBOTHANE_CATALOG, SORBOTHANE_DATA_VERSION, SORBOTHANE_MATERIAL, SORBOTHANE_REFERENCES, sorbothaneCatalogItem } from './sorbothane-data.js';
import { PARKER_LORD_AM_CATALOG, PARKER_LORD_AM_FAMILIES, PARKER_LORD_SOURCE, parkerLordCatalogItem } from './parker-lord-isolators.js';
import {
  DEFAULT_SORBOTHANE_CONFIG,
  SORBOTHANE_UNITS,
  analyzeSorbothaneIsolation,
  isParkerLordConfig,
  normalizeSorbothaneConfig,
  rigidBodyResponseAtFrequency,
  runDesignGrid,
  screenParkerLordCatalogAsync,
  screenSorbothaneCatalogAsync,
  sorbothaneDynamicProperties
} from './sorbothane-analysis.js';
import { generateNastranIsolationBdf } from './nastran-isolation-export.js';

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

const RESPONSE_POINT_CHOICES = [
  { value: 'cg', shortLabel: 'CG', label: 'Center of gravity' },
  { value: 'corner-positive', shortLabel: 'Top +X / +Y', label: '+X / +Y top corner' },
  { value: 'corner-negative', shortLabel: 'Top −X / −Y', label: '−X / −Y top corner' }
];

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

function lordProductOptions(selected) {
  return PARKER_LORD_AM_FAMILIES.map(family => `<optgroup label="${family.family} · ${fmt(family.ratedLoadLb, 1)} lbf rated">${PARKER_LORD_AM_CATALOG.filter(item => item.family === family.family).map(item => `<option value="${item.productNumber}"${item.productNumber === selected ? ' selected' : ''}>${esc(item.productNumber)} · ${esc(item.elastomer)} · ${fmt(item.nominalNaturalFrequencyHz, 0)} Hz · ${fmt(item.ratedLoadLb, 1)} lbf</option>`).join('')}</optgroup>`).join('');
}

function inputSidebar(config) {
  const lord = isParkerLordConfig(config);
  const isolatorFields = lord ? [
    `<label class="sorbo-field sorbo-product-field"><span>AM catalog mount<small>${PARKER_LORD_AM_CATALOG.length} records</small></span><input type="search" data-sorbo-product-search placeholder="Filter part, family, or elastomer…"/><select data-sorbo-field="isolator.productNumber" data-sorbo-product>${lordProductOptions(config.isolator.productNumber)}</select></label>`,
    `<p class="sorbo-caption">Complete bonded mounts with catalog axial/radial dynamic rates. Other Parker LORD families require their own model adapter.</p>`
  ].join('') : [
    `<label class="sorbo-field sorbo-product-field"><span>Catalog product<small>${SORBOTHANE_CATALOG.length - 1} records</small></span><input type="search" data-sorbo-product-search placeholder="Filter product number or geometry…"/><select data-sorbo-field="isolator.productNumber" data-sorbo-product>${productOptions(config.isolator.productNumber)}</select></label>`,
    select(config, 'isolator.geometry', 'Geometry', [['washer', 'Catalog washer'], ['ring', 'Annular isolation ring'], ['disc', 'Solid disc']]),
    input(config, 'isolator.odM', 'Outer diameter', { quantity: 'length', min: 0.01, step: 0.01 }),
    input(config, 'isolator.idM', 'Inner diameter', { quantity: 'length', min: 0, step: 0.01 }),
    input(config, 'isolator.thicknessM', 'Element thickness', { quantity: 'length', min: 0.01, step: 0.01 }),
    select(config, 'isolator.durometer', 'Durometer', [[30, '30 Shore 00'], [50, '50 Shore 00'], [70, '70 Shore 00']])
  ].join('');
  const arrangementFields = lord
    ? select(config, 'isolator.mountsPerPoint', 'Mount arrangement', [[1, '1 mount / support point'], [2, '2 mounts back-to-back / point']], { help: 'The catalog states that a back-to-back pair doubles load capacity and spring rate.' })
    : [input(config, 'mounts.stackTop', 'Upper stack count', { min: 1, max: 8, step: 1, digits: 0 }), input(config, 'mounts.stackBottom', 'Lower stack count', { min: 1, max: 8, step: 1, digits: 0 })].join('');
  const dynamicFields = lord ? [
    input(config, 'isolator.lordLossFactor', 'Screening loss factor η', { min: 0.01, max: 1, step: 0.01, help: 'Editable estimate; see the Isolator tab for provenance.' }),
    input(config, 'isolator.modulusScale', 'Spring-rate scale', { min: 0.05, max: 20, step: 0.05, help: '1.0 uses the catalog axial and radial dynamic spring rates.' })
  ].join('') : [
    select(config, 'isolator.extrapolation', 'Above 300 Hz', [['log-linear', 'Log-linear modulus; hold tan δ'], ['hold', 'Hold last manufacturer value'], ['user', 'User-defined complex modulus'], ['constant-complex', 'Constant complex stiffness']], { help: 'Manufacturer curves end at 300 Hz; this choice controls 600-2000 Hz predictions.' }),
    input(config, 'isolator.userModulusMPa', 'User storage modulus', { quantity: 'modulus', min: 0.001, step: 0.1 }),
    input(config, 'isolator.userTanDelta', 'User tan δ', { min: 0, max: 2, step: 0.01 }),
    input(config, 'isolator.poisson', 'Poisson ratio', { min: 0, max: 0.4995, step: 0.001 }),
    input(config, 'isolator.temperatureC', 'Temperature', { quantity: 'temperature', step: 1 })
  ].join('');
  return `<aside class="sorbo-sidebar" aria-label="Isolation system inputs">
    <header><p class="eyebrow">Design inputs</p><h2>Four-point component isolation</h2><label class="sorbo-unit-switch"><span>Display units</span><select data-sorbo-units><option${config.units === 'English' ? ' selected' : ''}>English</option><option${config.units === 'SI' ? ' selected' : ''}>SI</option></select></label></header>
    ${group('Isolator model', `<div class="sorbo-model-select">${select(config, 'isolator.kind', 'Hardware library', [['sorbothane-element', 'Sorbothane captured elements'], ['parker-lord-am', 'Parker LORD AM mounts']], { help: 'Each library uses its own catalog data and stiffness model.' })}</div><div class="sorbo-response-options sorbo-model-options" role="group" aria-label="Choose isolator hardware library"><button type="button" data-sorbo-model-choice="sorbothane-element" class="${lord ? '' : 'active'}" aria-pressed="${lord ? 'false' : 'true'}"><b>Sorbothane</b><span>Captured pad elements</span></button><button type="button" data-sorbo-model-choice="parker-lord-am" class="${lord ? 'active' : ''}" aria-pressed="${lord ? 'true' : 'false'}"><b>Parker LORD</b><span>Complete AM mounts</span></button></div>`, true)}
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
      arrangementFields
    ].join(''))}
    ${group(lord ? 'Parker LORD AM mount' : 'Sorbothane element', isolatorFields, true)}
    ${group('Preload & acceleration', [
      lord ? '' : select(config, 'isolator.preloadMode', 'Design basis', [['compression', 'Compression-driven'], ['preload', 'Preload-driven']]),
      lord ? '' : input(config, 'isolator.compressionPct', 'Nominal compression', { unit: '%', min: 1, max: 30, step: 1 }),
      lord ? '' : input(config, 'isolator.preloadN', 'Preload per element', { quantity: 'force', min: 0, step: 0.1 }),
      input(config, 'environment.accelerationG.0', 'Quasi-static X', { unit: 'g', step: 0.1 }),
      input(config, 'environment.accelerationG.1', 'Quasi-static Y', { unit: 'g', step: 0.1 }),
      input(config, 'environment.accelerationG.2', 'Additional Z', { unit: 'g', step: 0.1, help: 'Earth gravity is included; 0 g here means a total static vertical field of 1 g.' })
    ].join(''))}
    ${group(lord ? 'Catalog dynamic mount model' : 'Dynamic material model', dynamicFields)}
    ${group('Response & requirements', [
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
      lord ? '' : input(config, 'uncertainty.compressionPct', 'Compression tolerance', { unit: '± % points', min: 0, max: 10, step: 0.5 })
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
  return `<svg class="sorbo-scene" viewBox="0 0 840 500" role="img" aria-label="Rotatable view of the component, center of gravity, isolated plate, and four isolation mounts">
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

function transmissibilitySvg(analysis) {
  const response = analysis.directionalResponses?.x;
  if (!response) return '';
  const width = 960;
  const height = 470;
  const margin = { left: 68, right: 22, top: 28, bottom: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xMin = Math.log10(response.frequencies[0]);
  const xMax = Math.log10(response.frequencies.at(-1));
  const useDb = analysis.config.analysis.magnitudeScale === 'db';
  const axes = ['x', 'y', 'z'];
  const series = axes.map((axis, dof) => analysis.directionalResponses[axis].magnitude[dof]);
  const displaySeries = useDb ? series.map(values => values.map(value => 20 * Math.log10(Math.max(value, 1e-10)))) : series;
  const all = displaySeries.flat().filter(Number.isFinite);
  const yMin = useDb ? Math.floor(Math.max(-80, Math.min(...all, -30)) / 10) * 10 : 0;
  const yMax = useDb ? Math.ceil(Math.min(60, Math.max(...all, 10)) / 10) * 10 : Math.max(...all, 1) * 1.05;
  const xMap = value => margin.left + (Math.log10(value) - xMin) / (xMax - xMin) * plotWidth;
  const yMap = value => margin.top + (yMax - value) / Math.max(yMax - yMin, 1e-12) * plotHeight;
  const xTicks = [10, 20, 50, 100, 200, 300, 600, 1000, 2000].filter(value => value >= response.frequencies[0] && value <= response.frequencies.at(-1));
  const yTicks = Array.from({ length: 6 }, (_, index) => yMin + index * (yMax - yMin) / 5);
  const colors = ['#58b9ff', '#f6b94a', '#64d7a1'];
  const names = ['Txx', 'Tyy', 'Tzz'];
  const paths = displaySeries.map((values, index) => `<path class="sorbo-trace trace-${index}" d="${chartPath(response.frequencies, values, xMap, yMap)}" style="--trace:${colors[index]}"/><g class="sorbo-legend-item" transform="translate(${margin.left + index * 128},${height - 14})"><line x2="20"/><text x="27" y="4">${names[index]}</text></g>`).join('');
  const supportedX = xMap(SORBOTHANE_MATERIAL.digitizedCurveMaxHz);
  const modeMarkers = analysis.modes.filter(mode => mode.frequencyHz >= response.frequencies[0] && mode.frequencyHz <= response.frequencies.at(-1)).map((mode, index) => `<g class="sorbo-frequency-marker sorbo-mode-marker${mode.number >= 5 ? ' is-rotation' : ''}"><line x1="${xMap(mode.frequencyHz)}" x2="${xMap(mode.frequencyHz)}" y1="${margin.top}" y2="${height - margin.bottom}"/><text x="${xMap(mode.frequencyHz) + 3}" y="${margin.top + 12 + (index % 3) * 12}">M${mode.number}</text></g>`).join('');
  const toneMarkers = analysis.config.analysis.tones.filter(tone => tone.frequencyHz >= response.frequencies[0] && tone.frequencyHz <= response.frequencies.at(-1)).map((tone, index) => `<g class="sorbo-frequency-marker sorbo-tone-marker"><line x1="${xMap(tone.frequencyHz)}" x2="${xMap(tone.frequencyHz)}" y1="${margin.top}" y2="${height - margin.bottom}"/><text x="${xMap(tone.frequencyHz) + 3}" y="${margin.top + 12 + (index % 3) * 12}">${fmt(tone.frequencyHz, 0)}</text></g>`).join('');
  const modePoints = analysis.modes.flatMap(mode => axes.map((axis, axisIndex) => {
    const exact = rigidBodyResponseAtFrequency(analysis.config, mode.frequencyHz, axis);
    const value = useDb ? exact.db[axisIndex] : exact.magnitude[axisIndex];
    return `<circle class="sorbo-mode-point point-${axisIndex}${mode.number >= 5 ? ' is-rotation' : ''}" cx="${xMap(mode.frequencyHz)}" cy="${yMap(clamp(value, yMin, yMax))}" r="${mode.number >= 5 ? 4 : 3}" style="--trace:${colors[axisIndex]}"><title>M${mode.number} · ${names[axisIndex]} · ${useDb ? fmtSignedDb(value) : fmt(value, 3)}</title></circle>`;
  })).join('');
  let uncertainty = '';
  if (useDb && analysis.uncertainty) uncertainty = axes.map((axis, axisIndex) => {
    const band = analysis.uncertainty.directionalBands[axis];
    const upper = band.upperDb.map((value, index) => [xMap(response.frequencies[index]), yMap(value)]);
    const lower = band.lowerDb.map((value, index) => [xMap(response.frequencies[index]), yMap(value)]).reverse();
    return `<polygon class="sorbo-uncertainty-band band-${axisIndex}" points="${[...upper, ...lower].map(point => point.join(',')).join(' ')}"/>`;
  }).join('');
  return `<svg class="sorbo-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Direct X-to-X, Y-to-Y, and Z-to-Z base-to-component transmissibility from ${fmt(response.frequencies[0], 0)} to ${fmt(response.frequencies.at(-1), 0)} hertz">
    <rect class="sorbo-extrapolated-region" x="${supportedX}" y="${margin.top}" width="${width - margin.right - supportedX}" height="${plotHeight}"/>
    ${xTicks.map(value => `<g class="sorbo-grid"><line x1="${xMap(value)}" x2="${xMap(value)}" y1="${margin.top}" y2="${height - margin.bottom}"/><text x="${xMap(value)}" y="${height - margin.bottom + 21}">${value}</text></g>`).join('')}
    ${yTicks.map(value => `<g class="sorbo-grid"><line x1="${margin.left}" x2="${width - margin.right}" y1="${yMap(value)}" y2="${yMap(value)}"/><text x="${margin.left - 10}" y="${yMap(value) + 4}" text-anchor="end">${fmt(value, useDb ? 0 : 2)}</text></g>`).join('')}
    ${uncertainty}${modeMarkers}${toneMarkers}${paths}${modePoints}
    <line class="sorbo-support-limit" x1="${supportedX}" x2="${supportedX}" y1="${margin.top}" y2="${height - margin.bottom}"/><text class="sorbo-support-label" x="${supportedX + 6}" y="${height - margin.bottom - 8}">300 Hz manufacturer curve limit</text>
    <text class="sorbo-axis-label" x="${margin.left + plotWidth / 2}" y="${height - 24}" text-anchor="middle">Frequency (Hz, logarithmic)</text><text class="sorbo-axis-label" transform="translate(18 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle">${useDb ? 'Amplitude transmissibility (dB)' : 'Linear amplitude ratio'}</text>
    <rect class="sorbo-chart-hit" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" data-sorbo-chart-hit/><g class="sorbo-chart-tooltip" data-sorbo-tooltip hidden><line data-tip-line/><rect width="214" height="76" rx="10"/><text data-tip-text x="10" y="20"/></g>
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
  const toneRanges = analysis.toneResults.flatMap((tone, toneIndex) => analysis.uncertainty.toneRangesDbByAxis[toneIndex].map(result => `<span><b>${fmt(tone.frequencyHz, 0)} Hz · T${result.axis.toLowerCase()}${result.axis.toLowerCase()}</b>${fmt(result.rangeDb[0], 1)} to ${fmt(result.rangeDb[1], 1)} dB</span>`)).join('');
  return `<p><strong>Vertical-mode 5-95% range:</strong> ${fmt(range[0], 1)}-${fmt(range[1], 1)} Hz</p><div class="sorbo-uncertainty-tones">${toneRanges}</div><small>${esc(analysis.uncertainty.method)}</small>`;
}

function overviewPanel(config, analysis) {
  const lord = isParkerLordConfig(config);
  const catalog = lord ? parkerLordCatalogItem(config.isolator.productNumber) : sorbothaneCatalogItem(config.isolator.productNumber);
  const loadRange = lord
    ? analysis.preload.mounts.map(mount => mount.resultantLoadN / LBF)
    : analysis.preload.mounts.flatMap(mount => [mount.upperLoadN, mount.lowerLoadN]).map(value => value / LBF);
  const decisionDetails = lord
    ? `<div><dt>Mount model</dt><dd>Parker LORD ${esc(catalog.family)}</dd></div><div><dt>Arrangement</dt><dd>${config.isolator.mountsPerPoint === 2 ? 'Back-to-back pair' : 'Single mount'} / support point</dd></div><div><dt>Published rates</dt><dd>${fmt(catalog.dynamicAxialSpringRateLbPerIn, 0)} axial / ${fmt(catalog.dynamicRadialSpringRateLbPerIn, 0)} radial lb/in</dd></div><div><dt>Installed resultant load</dt><dd>${[Math.min(...loadRange), Math.max(...loadRange)].map(value => fmt(value, 2)).join('–')} lbf / support point</dd></div><div><dt>Rated capacity</dt><dd>${fmt(catalog.ratedLoadLb * config.isolator.mountsPerPoint, 1)} lbf / support point</dd></div><div><dt>Catalog load check</dt><dd>${analysis.preload.catalogCompliant ? 'Within rating' : 'Outside rating'}</dd></div>`
    : `<div><dt>Shape factor</dt><dd>${fmt(analysis.geometry.shapeFactor, 3)}</dd></div><div><dt>Nominal precompression force</dt><dd>${fmt(analysis.preload.preloadN / LBF, 2)} lbf / element</dd></div><div><dt>Installed element loads</dt><dd>${[Math.min(...loadRange), Math.max(...loadRange)].map(value => fmt(value, 2)).join('–')} lbf</dd></div><div><dt>Opposing elements</dt><dd>${analysis.preload.allEngaged ? 'Engaged' : 'UNLOADED'}</dd></div><div><dt>Catalog load rating</dt><dd>${analysis.preload.catalogCompliant ? 'Within / not applicable' : 'Outside rating'}</dd></div><div><dt>Compression recommendation</dt><dd>${analysis.preload.compressionCompliant ? 'Within 10–20%' : 'Outside 10–20%'}</dd></div>`;
  return `<section class="sorbo-tab-panel is-active" data-sorbo-panel="overview">
    <div class="sorbo-overview-grid"><section class="sorbo-card sorbo-geometry-card"><header><div><p class="eyebrow">Hardware geometry</p><h2>Component on four ${lord ? 'complete mounts' : 'captured mounts'}</h2></div><span>Drag to rotate</span></header><div data-sorbo-overview-scene>${sceneSvg(config, analysis)}</div><p class="sorbo-caption">Coordinate origin: component footprint center on the isolated plate. +Z is upward. CG and mount offsets are rendered from the same coordinates.</p></section>
    <section class="sorbo-card sorbo-decision-card"><p class="eyebrow">Current decision</p><h2 class="${analysis.passes ? 'pass-text' : 'fail-text'}">${analysis.passes ? 'All defined criteria pass' : 'Design review required'}</h2><dl><div><dt>Isolator</dt><dd>${esc(catalog.productNumber)}</dd></div>${decisionDetails}</dl></section></div>
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

function responsePointControl(config) {
  const selected = RESPONSE_POINT_CHOICES.find(choice => choice.value === config.analysis.responsePoint) ?? RESPONSE_POINT_CHOICES[0];
  const [length, width, height] = config.component.dimensionsM;
  const [cgX, cgY, cgZ] = config.component.cgM;
  const signs = selected.value === 'corner-negative' ? [-1, -1] : [1, 1];
  const offsetM = selected.value === 'cg' ? [0, 0, 0] : [signs[0] * length / 2 - cgX, signs[1] * width / 2 - cgY, height - cgZ];
  const lengthUnit = unitDefinitions.length[config.units];
  const signed = value => `${value >= 0 ? '+' : '−'}${fmt(Math.abs(lengthUnit.fromSI(value)), 2)}`;
  const offset = offsetM.map(signed).join(', ');
  return `<section class="sorbo-response-location" aria-label="Transmissibility response location"><div><span>Measurement location</span><strong>${esc(selected.label)}</strong><small>Offset from CG: (${offset}) ${lengthUnit.unit}</small></div><div class="sorbo-response-options" role="group" aria-label="Choose response location">${RESPONSE_POINT_CHOICES.map(choice => `<button type="button" data-sorbo-response-point="${choice.value}" class="${choice.value === selected.value ? 'active' : ''}" aria-pressed="${choice.value === selected.value}"><b>${esc(choice.shortLabel)}</b><span>${choice.value === 'cg' ? 'Translation at mass center' : 'Includes rigid-body rocking'}</span></button>`).join('')}</div></section>`;
}

function transmissibilityPanel(analysis) {
  const selected = RESPONSE_POINT_CHOICES.find(choice => choice.value === analysis.config.analysis.responsePoint) ?? RESPONSE_POINT_CHOICES[0];
  return `<section class="sorbo-tab-panel" data-sorbo-panel="transmissibility"><section class="sorbo-card"><header><div><p class="eyebrow">All translational directions</p><h2>Direct-axis transmissibility · Txx, Tyy, Tzz</h2></div><span>Response at ${esc(selected.label)}</span></header>${responsePointControl(analysis.config)}<p class="sorbo-caption">Each curve uses a separate unit base excitation in the named direction and reports acceleration at the selected measurement location in that same direction. Off-CG locations include the rigid-body rocking contribution, u<sub>point</sub> = u<sub>CG</sub> + θ × r. This location also governs the tone and resonance checks below. The three colored envelopes are independent Monte Carlo uncertainty bands.</p>${transmissibilitySvg(analysis)}<div class="sorbo-plot-notes"><span><b>Txx</b> X response from X base input</span><span><b>Tyy</b> Y response from Y base input</span><span><b>Tzz</b> Z response from Z base input</span><span><b>Mode dots</b> Exact response at M1–M6</span><span><b>M5 / M6</b> Roll/pitch-dominated modes may be shoulders rather than peaks when translational participation is weak</span></div></section>${requirementTable(analysis)}</section>`;
}

function parkerLordPanel(config, analysis) {
  const item = parkerLordCatalogItem(config.isolator.productNumber);
  const arrangement = config.isolator.mountsPerPoint === 2 ? 'Back-to-back pair at each support point' : 'Single mount at each support point';
  const temperature = item.temperatureRangeF ? `${item.temperatureRangeF[0]} to +${item.temperatureRangeF[1]} °F` : 'Not tabulated in the AM selection table';
  const lossBasis = item.lossFactorProvenance === 'engineering-assumption'
    ? 'Editable engineering assumption; no catalog damping value was found for this MEA record.'
    : 'Editable estimate digitized from the catalog typical transmissibility curve; not a tabulated manufacturer value.';
  return `<section class="sorbo-tab-panel" data-sorbo-panel="sorbothane"><div class="sorbo-lower-grid"><section class="sorbo-card"><p class="eyebrow">Selected complete mount</p><h2>${esc(item.productNumber)}</h2><dl class="sorbo-detail-list"><div><dt>Manufacturer / family</dt><dd>Parker LORD · ${esc(item.family)}</dd></div><div><dt>Elastomer</dt><dd>${esc(item.elastomer)}</dd></div><div><dt>Rated load</dt><dd>${fmt(item.ratedLoadLb, 1)} lbf / mount</dd></div><div><dt>Rated-load natural frequency</dt><dd>${fmt(item.nominalNaturalFrequencyHz, 0)} Hz</dd></div><div><dt>Axial dynamic rate</dt><dd>${fmt(item.dynamicAxialSpringRateLbPerIn, 0)} lb/in</dd></div><div><dt>Radial dynamic rate</dt><dd>${fmt(item.dynamicRadialSpringRateLbPerIn, 0)} lb/in</dd></div><div><dt>Maximum dynamic input</dt><dd>${fmt(item.maxDynamicInputDAIn, 3)} in double amplitude</dd></div><div><dt>Weight</dt><dd>${fmt(item.weightOz, 2)} oz / mount</dd></div><div><dt>Temperature range</dt><dd>${esc(temperature)}</dd></div><div><dt>Reference envelope</dt><dd>${fmt(item.envelopeIn.footprint, 3)} in footprint · Ø ${fmt(item.envelopeIn.bodyDiameter, 3)} × ${fmt(item.envelopeIn.height, 3)} in body</dd></div></dl></section><section class="sorbo-card"><p class="eyebrow">Installed screening model</p><h2>${esc(arrangement)}</h2><dl class="sorbo-detail-list"><div><dt>Mounts / point</dt><dd>${config.isolator.mountsPerPoint}</dd></div><div><dt>Total mount quantity</dt><dd>${config.isolator.mountsPerPoint * 4}</dd></div><div><dt>Capacity / point</dt><dd>${fmt(item.ratedLoadLb * config.isolator.mountsPerPoint, 1)} lbf</dd></div><div><dt>Axial rate / point</dt><dd>${fmt(item.dynamicAxialSpringRateLbPerIn * config.isolator.mountsPerPoint * config.isolator.modulusScale, 0)} lb/in</dd></div><div><dt>Radial rate / point</dt><dd>${fmt(item.dynamicRadialSpringRateLbPerIn * config.isolator.mountsPerPoint * config.isolator.modulusScale, 0)} lb/in</dd></div><div><dt>Loss factor η</dt><dd>${fmt(config.isolator.lordLossFactor * config.isolator.lossScale, 3)}</dd></div><div><dt>Loss-factor basis</dt><dd>${esc(lossBasis)}</dd></div></dl><p class="sorbo-caption">The solver uses the published complete-mount axial and radial dynamic rates directly. It does not apply Sorbothane pad shape-factor, durometer, compression, or stack-series equations.</p></section></div>
    ${currentDesignDrawings(config, analysis)}
    <section class="sorbo-card"><header><div><p class="eyebrow">Static load screen</p><h2>Resultant load versus rated capacity</h2></div><span>Four support points</span></header><div class="table-wrap"><table><thead><tr><th>Support</th><th>X</th><th>Y</th><th>Vertical load</th><th>Lateral load</th><th>Resultant</th><th>Rated capacity</th><th>Status</th></tr></thead><tbody>${analysis.preload.mounts.map(mount => `<tr><td>${mount.index}</td><td>${fmt(mount.positionM[0] / INCH, 2)} in</td><td>${fmt(mount.positionM[1] / INCH, 2)} in</td><td>${fmt(mount.payloadN / LBF, 2)} lbf</td><td>${fmt(mount.lateralLoadN / LBF, 2)} lbf</td><td>${fmt(mount.resultantLoadN / LBF, 2)} lbf</td><td>${fmt(mount.ratedLoadN / LBF, 2)} lbf</td><td>${mount.flags.length ? `<span class="sorbo-status fail">${esc(mount.flags.join('; '))}</span>` : '<span class="sorbo-status pass">WITHIN RATING</span>'}</td></tr>`).join('')}</tbody></table></div><p class="sorbo-caption">Preliminary vector-load screen using the distributed static acceleration field. Confirm allowable combined axial/radial loading and installation orientation with Parker LORD.</p></section>
    <section class="sorbo-card"><p class="eyebrow">Primary source</p><h2>${esc(PARKER_LORD_SOURCE.title)}</h2><p>${esc(PARKER_LORD_SOURCE.document)} · AM Low Profile Avionics Mounts. Catalog values were transcribed per part number; configuration and availability remain subject to confirmation.</p><a class="button-quiet" href="${esc(PARKER_LORD_SOURCE.url)}" target="_blank" rel="noreferrer">Open official Parker LORD catalog ↗</a></section>
  </section>`;
}

function sorbothanePanel(config, analysis) {
  if (isParkerLordConfig(config)) return parkerLordPanel(config, analysis);
  const catalog = sorbothaneCatalogItem(config.isolator.productNumber);
  const rating = catalog.ratedLoadLb ? `${catalog.ratedLoadLb.map(value => fmt(value, 2)).join('-')} lbf` : 'No catalog rating - custom geometry';
  return `<section class="sorbo-tab-panel" data-sorbo-panel="sorbothane"><div class="sorbo-lower-grid"><section class="sorbo-card"><p class="eyebrow">Selected element</p><h2>${esc(catalog.productNumber)}</h2><dl class="sorbo-detail-list"><div><dt>Geometry</dt><dd>${esc(config.isolator.geometry)}</dd></div><div><dt>OD / ID / t</dt><dd>${fmt(config.isolator.odM / INCH, 3)} / ${fmt(config.isolator.idM / INCH, 3)} / ${fmt(config.isolator.thicknessM / INCH, 3)} in</dd></div><div><dt>Durometer</dt><dd>${config.isolator.durometer} Shore 00</dd></div><div><dt>Rated load</dt><dd>${rating}</dd></div><div><dt>Free / compressed stack</dt><dd>${fmt(analysis.preload.freeThicknessM / INCH, 3)} / ${fmt(analysis.preload.compressedThicknessM / INCH, 3)} in</dd></div><div><dt>Compression</dt><dd>${fmt(analysis.preload.compressionPct, 2)}%</dd></div><div><dt>Loaded area</dt><dd>${fmt(analysis.geometry.loadedAreaIn2, 3)} in²</dd></div><div><dt>Effective area</dt><dd>${fmt(analysis.geometry.effectiveAreaM2 / INCH ** 2, 3)} in²</dd></div><div><dt>Free-to-bulge area</dt><dd>${fmt(analysis.geometry.freeBulgeAreaM2 / INCH ** 2, 3)} in²</dd></div><div><dt>Shape factor</dt><dd>${fmt(analysis.geometry.shapeFactor, 3)}</dd></div><div><dt>Equation</dt><dd>${esc(analysis.geometry.equation)}</dd></div><div><dt>Shape correction</dt><dd>1 + 2SF² = ${fmt(analysis.geometry.shapeCorrection, 3)}</dd></div></dl><p class="sorbo-caption">${esc(catalog.notes || 'Manufacturer standard product. Availability remains subject to change.')}</p></section><section class="sorbo-card"><p class="eyebrow">Dynamic material data</p><h2>E′, E″, and tan δ</h2>${materialSvg(config)}<p class="sorbo-caption">E″ = E′ tan δ. Exact manufacturer table points: 5-50 Hz. Digitized manufacturer guide curves: 75-300 Hz. Shading begins where engineering extrapolation is required.</p></section></div>
    ${currentDesignDrawings(config, analysis)}
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

const LORD_EXPLORER_VARIABLE_CHOICES = [
  ['stiffnessScale', 'Dynamic spring-rate scale'],
  ['lossFactor', 'Loss factor η'],
  ['mass', 'Mass (lbm)'],
  ['cgHeight', 'CG height (in)'],
  ['mountSpacing', 'X mount spacing (in)'],
  ['mountSpacingY', 'Y mount spacing (in)'],
  ['mountsPerPoint', 'Mounts / support point']
];

const explorerVariableChoices = config => isParkerLordConfig(config) ? LORD_EXPLORER_VARIABLE_CHOICES : EXPLORER_VARIABLE_CHOICES;

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

  const shared = {
    mass: { min: massMin, max: Math.max(massMin + massStep, explorerRound(massLbm * 1.25, massStep)), step: massStep, note: 'Defaults span ±25% around the current component mass.' },
    cgHeight: { min: cgMin, max: Math.max(cgMin + 0.25, explorerRound(cgHeightIn + 1, 0.25)), step: 0.25, note: 'Defaults span ±1 in around the current CG height, bounded at the base plane.' },
    mountSpacing: { min: explorerRound(config.component.dimensionsM[0] / INCH * 0.6, 0.25), max: explorerRound(config.component.dimensionsM[0] / INCH * 0.95, 0.25), step: 0.25, note: 'Defaults span 60–95% of the current component X length.' },
    mountSpacingY: { min: explorerRound(config.component.dimensionsM[1] / INCH * 0.6, 0.25), max: explorerRound(config.component.dimensionsM[1] / INCH * 0.95, 0.25), step: 0.25, note: 'Defaults span 60–95% of the current component Y width.' }
  };
  if (isParkerLordConfig(config)) return {
    stiffnessScale: { min: 0.7, max: 1.3, step: 0.05, note: 'Scales both published axial and radial dynamic spring rates for sensitivity screening; 1.0 is the catalog value.' },
    lossFactor: { min: Math.max(0.02, explorerRound(config.isolator.lordLossFactor * 0.5, 0.01)), max: explorerRound(config.isolator.lordLossFactor * 1.5, 0.01), step: 0.01, note: 'Sweeps the editable complete-mount loss factor used for complex stiffness.' },
    ...shared,
    mountsPerPoint: { min: 1, max: 2, step: 1, note: 'One complete mount or the catalog-described back-to-back pair at each support point.' }
  };
  return {
    durometer: { min: 30, max: 70, step: 10, note: 'Standard grades are 30, 50, and 70 Shore 00; intermediate grid points use material-property interpolation.' },
    thickness: { min: thicknessMin, max: Math.max(thicknessMin + 0.025, explorerRound(thicknessIn * 2, 0.025)), step: 0.025, note: 'Defaults span 0.5× to 2× the current element thickness.' },
    od: { min: odMin, max: Math.max(odMin + 0.05, explorerRound(odIn * 1.4, 0.025)), step: 0.025, note: 'Defaults span 0.7× to 1.4× the current OD and keep the lower bound above the current ID.' },
    id: { min: Math.max(0, explorerRound(idIn * 0.5, 0.025)), max: idMax, step: 0.025, note: 'The upper bound stays below the current OD; any ID ≥ swept OD is rejected.' },
    compression: { min: 10, max: 20, step: 1, note: 'Manufacturer-preferred screening range: 10–20% compression.' },
    ...shared,
    stackCount: { min: 1, max: 3, step: 1, note: 'Whole elements only; the same count is applied above and below each mount.' }
  };
}

function defaultExplorerSettings(config) {
  const ranges = sorbothaneExplorerVariableDefaults(config);
  if (isParkerLordConfig(config)) return { xVariable: 'stiffnessScale', xMin: ranges.stiffnessScale.min, xMax: ranges.stiffnessScale.max, yVariable: 'lossFactor', yMin: ranges.lossFactor.min, yMax: ranges.lossFactor.max, output: 't1200' };
  return { xVariable: 'thickness', xMin: ranges.thickness.min, xMax: ranges.thickness.max, yVariable: 'od', yMin: ranges.od.min, yMax: ranges.od.max, output: 't1200' };
}

function explorerVariableValue(config, variable) {
  const values = {
    durometer: config.isolator.durometer,
    thickness: config.isolator.thicknessM / INCH,
    od: config.isolator.odM / INCH,
    id: config.isolator.idM / INCH,
    compression: config.isolator.compressionPct,
    mass: config.component.massKg / LB,
    cgHeight: config.component.cgM[2] / INCH,
    mountSpacing: config.mounts.spacingM[0] / INCH,
    mountSpacingY: config.mounts.spacingM[1] / INCH,
    stackCount: config.mounts.stackTop,
    stiffnessScale: config.isolator.modulusScale,
    lossFactor: config.isolator.lordLossFactor,
    mountsPerPoint: config.isolator.mountsPerPoint
  };
  return values[variable];
}

function centeredExplorerRange(config, variable) {
  const defaults = sorbothaneExplorerVariableDefaults(config)[variable];
  const center = explorerVariableValue(config, variable);
  const bounds = {
    durometer: [30, 70], thickness: [0.025, Infinity], od: [0.05, Infinity], id: [0, Infinity],
    compression: [1, 30], mass: [0.01, Infinity], cgHeight: [0, Infinity],
    mountSpacing: [0.05, config.component.dimensionsM[0] / INCH * 0.99],
    mountSpacingY: [0.05, config.component.dimensionsM[1] / INCH * 0.99], stackCount: [1, 8],
    stiffnessScale: [0.05, 20], lossFactor: [0.01, 1], mountsPerPoint: [1, 2]
  }[variable] ?? [-Infinity, Infinity];
  const halfSpan = variable === 'stackCount' ? 3 : variable === 'mountsPerPoint' ? 1 : Math.max((defaults.max - defaults.min) / 2, defaults.step * 3);
  let min = center - halfSpan;
  let max = center + halfSpan;
  if (min < bounds[0]) { max += bounds[0] - min; min = bounds[0]; }
  if (max > bounds[1]) { min -= max - bounds[1]; max = bounds[1]; }
  min = Math.max(bounds[0], min);
  max = Math.min(bounds[1], max);
  if (variable === 'stackCount' || variable === 'mountsPerPoint') {
    min = Math.max(1, Math.round(min));
    max = Math.min(variable === 'mountsPerPoint' ? 2 : 8, Math.round(max));
  }
  return { min: Number(min.toFixed(6)), max: Number(max.toFixed(6)), center, step: defaults.step };
}

export function sorbothaneExplorerSettingsAroundDesign(configInput = DEFAULT_SORBOTHANE_CONFIG, settingsInput = {}) {
  const config = normalizeSorbothaneConfig(configInput);
  const settings = normalizeExplorerSettings(config, settingsInput);
  const x = centeredExplorerRange(config, settings.xVariable);
  const y = centeredExplorerRange(config, settings.yVariable);
  return { ...settings, xMin: x.min, xMax: x.max, yMin: y.min, yMax: y.max };
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
    library: isParkerLordConfig(config) ? 'parker-lord-am' : 'sorbothane',
    geometry: 'all', odMin: 0.5, odMax: 5, idMin: 0, idMax: 3.1, thicknessMin: 0.125, thicknessMax: 1, stackMin: 1, stackMax: 8,
    lordFamily: 'all', lordElastomer: 'all', lordRatedLoadMin: 0, lordRatedLoadMax: 25, lordMountsMin: 1, lordMountsMax: 2,
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
    library: ['sorbothane', 'parker-lord-am'].includes(input.library) ? input.library : defaults.library,
    geometry: ['all', 'washer', 'ring', 'disc'].includes(input.geometry) ? input.geometry : defaults.geometry,
    odMin: numberOr(input.odMin, defaults.odMin),
    odMax: numberOr(input.odMax, defaults.odMax),
    idMin: numberOr(input.idMin, defaults.idMin),
    idMax: numberOr(input.idMax, defaults.idMax),
    thicknessMin: numberOr(input.thicknessMin, defaults.thicknessMin),
    thicknessMax: numberOr(input.thicknessMax, defaults.thicknessMax),
    stackMin: clamp(Math.round(numberOr(input.stackMin, defaults.stackMin)), 1, 8),
    stackMax: clamp(Math.round(numberOr(input.stackMax, defaults.stackMax)), 1, 8),
    lordFamily: input.lordFamily === 'all' || /^AM-00[1-9]$/.test(input.lordFamily ?? '') ? input.lordFamily : defaults.lordFamily,
    lordElastomer: ['all', 'BTR', 'BTR II', 'MEA'].includes(input.lordElastomer) ? input.lordElastomer : defaults.lordElastomer,
    lordRatedLoadMin: Math.max(0, numberOr(input.lordRatedLoadMin, defaults.lordRatedLoadMin)),
    lordRatedLoadMax: Math.max(0, numberOr(input.lordRatedLoadMax, defaults.lordRatedLoadMax)),
    lordMountsMin: clamp(Math.round(numberOr(input.lordMountsMin, defaults.lordMountsMin)), 1, 2),
    lordMountsMax: clamp(Math.round(numberOr(input.lordMountsMax, defaults.lordMountsMax)), 1, 2),
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
  for (const prefix of ['lordRatedLoad', 'lordMounts']) if (normalized[`${prefix}Min`] > normalized[`${prefix}Max`]) [normalized[`${prefix}Min`], normalized[`${prefix}Max`]] = [normalized[`${prefix}Max`], normalized[`${prefix}Min`]];
  return normalized;
}

function catalogScreenControls(config, settingsInput = {}) {
  const settings = normalizeCatalogScreenSettings(config, settingsInput);
  const range = (label, prefix, step) => `<label><span>${label}</span><span class="inline-inputs"><input data-catalog-screen="${prefix}Min" aria-label="${label} minimum" type="number" value="${fmt(settings[`${prefix}Min`], 4)}" min="0" step="${step}"/><input data-catalog-screen="${prefix}Max" aria-label="${label} maximum" type="number" value="${fmt(settings[`${prefix}Max`], 4)}" min="0" step="${step}"/></span></label>`;
  const library = `<label><span>Isolator library</span><select data-catalog-screen="library"><option value="sorbothane"${settings.library === 'sorbothane' ? ' selected' : ''}>Sorbothane standard products</option><option value="parker-lord-am"${settings.library === 'parker-lord-am' ? ' selected' : ''}>Parker LORD AM mounts</option></select></label>`;
  const filters = settings.library === 'parker-lord-am'
    ? `<label><span>AM family</span><select data-catalog-screen="lordFamily"><option value="all"${settings.lordFamily === 'all' ? ' selected' : ''}>All AM families</option>${PARKER_LORD_AM_FAMILIES.map(family => `<option value="${family.family}"${settings.lordFamily === family.family ? ' selected' : ''}>${family.family} · ${fmt(family.ratedLoadLb, 1)} lbf</option>`).join('')}</select></label><label><span>Elastomer</span><select data-catalog-screen="lordElastomer"><option value="all"${settings.lordElastomer === 'all' ? ' selected' : ''}>All elastomers</option>${['BTR', 'BTR II', 'MEA'].map(value => `<option value="${value}"${settings.lordElastomer === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>${range('Rated load / mount (lbf)', 'lordRatedLoad', 0.5)}${range('Mounts / support point', 'lordMounts', 1)}`
    : `<label><span>Catalog geometry</span><select data-catalog-screen="geometry"><option value="all"${settings.geometry === 'all' ? ' selected' : ''}>All standard products</option><option value="washer"${settings.geometry === 'washer' ? ' selected' : ''}>Washers</option><option value="ring"${settings.geometry === 'ring' ? ' selected' : ''}>Isolation rings</option><option value="disc"${settings.geometry === 'disc' ? ' selected' : ''}>Discs</option></select></label>${range('OD min / max (in)', 'od', 0.025)}${range('ID min / max (in)', 'id', 0.025)}${range('Thickness min / max (in)', 'thickness', 0.025)}${range('Elements / side min / max', 'stack', 1)}`;
  return `<div class="sorbo-catalog-controls">${library}${filters}<button type="button" class="button" data-sorbo-action="screen-catalog">Screen full catalog</button></div>`;
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

function catalogSelectionMatches(candidate, selection) {
  const library = candidate.item.mountModel === 'parker-lord-am' ? 'parker-lord-am' : 'sorbothane';
  return Boolean(selection) && library === selection.library && candidate.item.productNumber === selection.productNumber && candidate.stackCount === selection.stackCount;
}

function parkerLordCandidateTable(candidates, criteria, includeStatus = false, selection = null) {
  const toneHeaders = criteria.tones.map(tone => `<th>Worst T @ ${fmt(tone.frequencyHz, 0)}</th>`).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Part number</th><th>Family</th><th>Elastomer</th><th>Rated / mount</th><th>Rated-load fₙ</th><th>Axial / radial rate</th><th>Mounts / point</th><th>Total qty</th><th>Installed resultant / point</th><th>X mode</th><th>Y mode</th><th>Z mode</th>${toneHeaders}<th>Worst peak</th>${includeStatus ? '<th>Review</th>' : ''}<th></th></tr></thead><tbody>${candidates.map((candidate, index) => {
    const item = candidate.item;
    const lateral = candidate.analysis.lateralModeResults;
    const vertical = candidate.analysis.verticalModeResult;
    const selected = catalogSelectionMatches(candidate, selection);
    return `<tr${selected ? ' class="is-selected-design" data-sorbo-selected-design' : ''}><td>${index + 1}${selected ? '<span class="sorbo-selected-tag">Selected</span>' : ''}</td><td><strong>${esc(item.productNumber)}</strong></td><td>${esc(item.family)}</td><td>${esc(item.elastomer)}</td><td>${fmt(item.ratedLoadLb, 1)} lbf</td><td>${fmt(item.nominalNaturalFrequencyHz, 0)} Hz</td><td>${fmt(item.dynamicAxialSpringRateLbPerIn, 0)} / ${fmt(item.dynamicRadialSpringRateLbPerIn, 0)} lb/in</td><td>${candidate.mountsPerPoint}</td><td>${candidate.totalMountCount}</td><td>${candidate.installedLoadRangeLb.map(value => fmt(value, 2)).join('–')} lbf</td><td>${fmt(lateral[0].frequencyHz, 1)} Hz</td><td>${fmt(lateral[1].frequencyHz, 1)} Hz</td><td>${fmt(vertical.frequencyHz, 1)} Hz</td>${candidate.analysis.toneResults.map(result => `<td>${fmt(result.db, 1)} dB · ${result.worstAxis}</td>`).join('')}<td>${fmt(candidate.analysis.peak.db, 1)} dB · ${candidate.analysis.peak.axis}</td>${includeStatus ? `<td><span class="sorbo-status fail">${esc(catalogCandidateFailure(candidate))}</span></td>` : ''}<td><button type="button" class="button-quiet sorbo-use-candidate" data-sorbo-catalog-use="${esc(item.productNumber)}" data-sorbo-catalog-kind="parker-lord-am" data-sorbo-catalog-stack="${candidate.mountsPerPoint}"${selected ? ' disabled' : ''}>${selected ? 'Selected design' : 'Use design'}</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function parkerLordScreenResult(screen, selection = null) {
  const summary = `<div class="sorbo-catalog-summary"><span><b>${screen.catalogPartCount}</b> AM part numbers</span><span><b>${screen.eligiblePartCount}</b> within filters</span><span><b>${screen.combinationCount}</b> part/arrangement combinations</span><span><b>${screen.passingPartCount}</b> passing part numbers</span></div>`;
  const exclusion = `<p class="sorbo-caption">Pre-screen exclusions by combination: ${screen.exclusions.ratedLoad} rated load, ${screen.exclusions.xTranslation} X-mode minimum, ${screen.exclusions.yTranslation} Y-mode minimum, ${screen.exclusions.verticalMode} vertical-mode placement. Counts can overlap. ${screen.dynamicallyEvaluatedCount} combinations reached the all-direction tone and resonance evaluation.</p>`;
  if (!screen.recommendations.length) {
    const near = screen.nearMisses.length ? `<h3>Closest dynamically evaluated combinations</h3>${parkerLordCandidateTable(screen.nearMisses, screen.criteria, true, selection)}` : '';
    return `${summary}<div class="sorbo-empty sorbo-catalog-empty"><strong>No Parker LORD AM configuration passes every active criterion.</strong><p>Review rated load, the translation-mode bands, tone limits, and resonance limit. A back-to-back pair is evaluated only when allowed by the arrangement filter.</p></div>${near}${exclusion}`;
  }
  const winner = screen.recommendations[0];
  const item = winner.item;
  const selected = catalogSelectionMatches(winner, selection);
  return `${summary}<article class="sorbo-catalog-recommendation${selected ? ' is-selected-design' : ''}"${selected ? ' data-sorbo-selected-design' : ''}><div><p class="eyebrow">${selected ? 'Selected catalog configuration' : 'Recommended Parker LORD configuration'}</p><h3>${esc(item.productNumber)}</h3><p>${esc(item.family)} · ${esc(item.elastomer)} · ${fmt(item.ratedLoadLb, 1)} lbf rated · ${fmt(item.nominalNaturalFrequencyHz, 0)} Hz catalog fₙ</p></div><div><strong>${winner.mountsPerPoint}</strong><span>mount${winner.mountsPerPoint === 1 ? '' : 's'} per support point</span><small>${winner.totalMountCount} complete mounts total</small></div><button type="button" class="button" data-sorbo-catalog-use="${esc(item.productNumber)}" data-sorbo-catalog-kind="parker-lord-am" data-sorbo-catalog-stack="${winner.mountsPerPoint}"${selected ? ' disabled' : ''}>${selected ? 'Selected design' : 'Use recommended design'}</button></article><h3>Passing part-number recommendations</h3><p class="sorbo-caption">For each part, the table keeps the smallest passing mount arrangement, then ranks by attenuation and resonance margin. Published catalog rates are used without Sorbothane shape-factor corrections.</p>${parkerLordCandidateTable(screen.recommendations, screen.criteria, false, selection)}${exclusion}`;
}

function catalogCandidateTable(candidates, criteria, includeStatus = false, selection = null) {
  const toneHeaders = criteria.tones.map(tone => `<th>Worst T @ ${fmt(tone.frequencyHz, 0)}</th>`).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Part number</th><th>Geometry</th><th>OD / ID / t</th><th>Durometer</th><th>Elements / side</th><th>Total qty</th><th>Rated / element</th><th>Installed load / element</th><th>Nominal preload</th><th>X mode</th><th>Y mode</th><th>Z mode</th>${toneHeaders}<th>Worst peak</th>${includeStatus ? '<th>Review</th>' : ''}<th></th></tr></thead><tbody>${candidates.map((candidate, index) => {
    const item = candidate.item;
    const tones = candidate.analysis.toneResults;
    const lateral = candidate.analysis.lateralModeResults;
    const vertical = candidate.analysis.verticalModeResult;
    const selected = catalogSelectionMatches(candidate, selection);
    return `<tr${selected ? ' class="is-selected-design" data-sorbo-selected-design' : ''}><td>${index + 1}${selected ? '<span class="sorbo-selected-tag">Selected</span>' : ''}</td><td><strong>${esc(item.productNumber)}</strong></td><td>${esc(item.geometry)}</td><td>${fmt(item.odIn, 3)} / ${fmt(item.idIn, 3)} / ${fmt(item.thicknessIn, 3)} in</td><td>${item.durometer} Shore 00</td><td>${candidate.stackCount}</td><td>${candidate.totalElementCount}</td><td>${item.ratedLoadLb.map(value => fmt(value, 2)).join('–')} lbf</td><td>${candidate.installedLoadRangeLb.map(value => fmt(value, 2)).join('–')} lbf</td><td>${fmt(candidate.analysis.preload.preloadN / LBF, 2)} lbf</td><td>${fmt(lateral[0].frequencyHz, 1)} Hz</td><td>${fmt(lateral[1].frequencyHz, 1)} Hz</td><td>${fmt(vertical.frequencyHz, 1)} Hz</td>${tones.map(result => `<td>${fmt(result.db, 1)} dB · ${result.worstAxis}</td>`).join('')}<td>${fmt(candidate.analysis.peak.db, 1)} dB · ${candidate.analysis.peak.axis}</td>${includeStatus ? `<td><span class="sorbo-status fail">${esc(catalogCandidateFailure(candidate))}</span></td>` : ''}<td><button type="button" class="button-quiet sorbo-use-candidate" data-sorbo-catalog-use="${esc(item.productNumber)}" data-sorbo-catalog-kind="sorbothane-element" data-sorbo-catalog-stack="${candidate.stackCount}"${selected ? ' disabled' : ''}>${selected ? 'Selected design' : 'Use design'}</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function catalogScreenResult(screen, selection = null) {
  if (screen.library === 'parker-lord-am') return parkerLordScreenResult(screen, selection);
  const summary = `<div class="sorbo-catalog-summary"><span><b>${screen.catalogPartCount}</b> catalog parts</span><span><b>${screen.eligiblePartCount}</b> within geometry</span><span><b>${screen.combinationCount}</b> part/stack combinations</span><span><b>${screen.passingPartCount}</b> passing part numbers</span></div>`;
  const exclusion = `<p class="sorbo-caption">Pre-screen exclusions by combination: ${screen.exclusions.compression} compression, ${screen.exclusions.engagement} unloading, ${screen.exclusions.ratedLoad} rated load, ${screen.exclusions.xTranslation} X-mode minimum, ${screen.exclusions.yTranslation} Y-mode minimum, ${screen.exclusions.verticalMode} vertical-mode placement. Counts can overlap. ${screen.dynamicallyEvaluatedCount} combinations reached the all-direction tone and resonance evaluation.</p>`;
  if (!screen.recommendations.length) {
    const near = screen.nearMisses.length ? `<h3>Closest dynamically evaluated combinations</h3>${catalogCandidateTable(screen.nearMisses, screen.criteria, true, selection)}` : '';
    return `${summary}<div class="sorbo-empty sorbo-catalog-empty"><strong>No catalog configuration passes every active criterion.</strong><p>Widen the geometry or stack limits, or review the X/Y translation minima, vertical-mode band, compression, tone limits, and resonance limit.</p></div>${near}${exclusion}`;
  }
  const winner = screen.recommendations[0];
  const item = winner.item;
  const selected = catalogSelectionMatches(winner, selection);
  return `${summary}<article class="sorbo-catalog-recommendation${selected ? ' is-selected-design' : ''}"${selected ? ' data-sorbo-selected-design' : ''}><div><p class="eyebrow">${selected ? 'Selected catalog configuration' : 'Recommended catalog configuration'}</p><h3>${esc(item.productNumber)}</h3><p>${esc(item.geometry)} · ${item.durometer} Shore 00 · ${fmt(item.odIn, 3)} OD × ${fmt(item.idIn, 3)} ID × ${fmt(item.thicknessIn, 3)} in thick</p></div><div><strong>${winner.stackCount}</strong><span>element${winner.stackCount === 1 ? '' : 's'} per side at each mount</span><small>${winner.totalElementCount} elements total for four captured mounts</small></div><button type="button" class="button" data-sorbo-catalog-use="${esc(item.productNumber)}" data-sorbo-catalog-kind="sorbothane-element" data-sorbo-catalog-stack="${winner.stackCount}"${selected ? ' disabled' : ''}>${selected ? 'Selected design' : 'Use recommended design'}</button></article><h3>Passing part-number recommendations</h3><p class="sorbo-caption">For each part, the table keeps the smallest stack count that passes. Parts are then ranked by tone attenuation and resonance margin.</p>${catalogCandidateTable(screen.recommendations, screen.criteria, false, selection)}${exclusion}`;
}

function currentDesignPanel(config, settings) {
  const lord = isParkerLordConfig(config);
  const item = lord ? parkerLordCatalogItem(config.isolator.productNumber) : sorbothaneCatalogItem(config.isolator.productNumber);
  const arrangement = lord
    ? `${item.family} · ${item.elastomer} · ${config.isolator.mountsPerPoint === 2 ? 'back-to-back pair' : 'single mount'} / support point`
    : `${config.isolator.durometer} Shore 00 · ${fmt(config.isolator.odM / INCH, 3)} OD × ${fmt(config.isolator.idM / INCH, 3)} ID × ${fmt(config.isolator.thicknessM / INCH, 3)} in thick · ${config.mounts.stackTop === config.mounts.stackBottom ? `${config.mounts.stackTop} / side` : `${config.mounts.stackTop} upper · ${config.mounts.stackBottom} lower`}`;
  const choices = explorerVariableChoices(config);
  const xLabel = choices.find(([value]) => value === settings.xVariable)?.[1] ?? settings.xVariable;
  const yLabel = choices.find(([value]) => value === settings.yVariable)?.[1] ?? settings.yVariable;
  return `<aside class="sorbo-current-design"><div><p class="eyebrow">Current analysis design</p><h3>${esc(item.productNumber)}</h3><span>${esc(arrangement)}</span></div><div><strong>Explore around this design</strong><small>The selected part becomes the reference point for ${esc(xLabel)} versus ${esc(yLabel)}.</small></div><button type="button" class="button-secondary" data-sorbo-action="load-current-into-explorer">Load into 7 × 7 matrix</button></aside>`;
}

function elementSectionSvg(x, y, width, height, boreRatio, className = '') {
  const safeBoreRatio = clamp(boreRatio, 0, .82);
  if (safeBoreRatio <= .01) return `<rect class="sorbo-drawing-element ${className}" x="${fmt(x, 2)}" y="${fmt(y, 2)}" width="${fmt(width, 2)}" height="${fmt(height, 2)}" rx="2"/>`;
  const boreWidth = width * safeBoreRatio;
  const lobeWidth = (width - boreWidth) / 2;
  return `<rect class="sorbo-drawing-element ${className}" x="${fmt(x, 2)}" y="${fmt(y, 2)}" width="${fmt(lobeWidth, 2)}" height="${fmt(height, 2)}" rx="2"/><rect class="sorbo-drawing-element ${className}" x="${fmt(x + lobeWidth + boreWidth, 2)}" y="${fmt(y, 2)}" width="${fmt(lobeWidth, 2)}" height="${fmt(height, 2)}" rx="2"/>`;
}

function isolatorElementDrawing(config) {
  const item = sorbothaneCatalogItem(config.isolator.productNumber);
  const odIn = config.isolator.odM / INCH;
  const idIn = config.isolator.idM / INCH;
  const thicknessIn = config.isolator.thicknessM / INCH;
  const boreRatio = odIn > 0 ? idIn / odIn : 0;
  const innerRadius = 66 * clamp(boreRatio, 0, .82);
  const geometry = item.geometry[0].toUpperCase() + item.geometry.slice(1);
  const planBore = innerRadius > 1 ? `<circle class="sorbo-drawing-bore" cx="140" cy="130" r="${fmt(innerRadius, 2)}"/><line class="sorbo-drawing-dimension" x1="${fmt(140 - innerRadius, 2)}" y1="130" x2="${fmt(140 + innerRadius, 2)}" y2="130"/><line class="sorbo-drawing-tick" x1="${fmt(140 - innerRadius, 2)}" y1="124" x2="${fmt(140 - innerRadius, 2)}" y2="136"/><line class="sorbo-drawing-tick" x1="${fmt(140 + innerRadius, 2)}" y1="124" x2="${fmt(140 + innerRadius, 2)}" y2="136"/><text class="sorbo-drawing-dim-label" x="140" y="116">ID ${fmt(idIn, 3)} in</text>` : '<circle class="sorbo-drawing-center" cx="140" cy="130" r="2.5"/>';
  const section = elementSectionSvg(338, 111, 148, 38, boreRatio);
  return `<figure class="sorbo-design-drawing"><header><div><p class="eyebrow">Selected part geometry</p><h3>${esc(item.productNumber)} · ${esc(geometry)}</h3></div><span>${config.isolator.durometer} Shore 00</span></header><svg viewBox="0 0 560 270" role="img" aria-label="Dimensioned 2D drawing of current Sorbothane element">
    <text class="sorbo-drawing-view-label" x="140" y="28">PLAN</text><text class="sorbo-drawing-view-label" x="412" y="28">SECTION</text>
    <line class="sorbo-drawing-centerline" x1="48" y1="130" x2="232" y2="130"/><line class="sorbo-drawing-centerline" x1="140" y1="38" x2="140" y2="222"/>
    <circle class="sorbo-drawing-element" cx="140" cy="130" r="66"/>${planBore}
    <line class="sorbo-drawing-extension" x1="74" y1="199" x2="74" y2="229"/><line class="sorbo-drawing-extension" x1="206" y1="199" x2="206" y2="229"/><line class="sorbo-drawing-dimension" x1="74" y1="218" x2="206" y2="218"/><line class="sorbo-drawing-tick" x1="74" y1="212" x2="74" y2="224"/><line class="sorbo-drawing-tick" x1="206" y1="212" x2="206" y2="224"/><text class="sorbo-drawing-dim-label" x="140" y="243">OD ${fmt(odIn, 3)} in</text>
    <line class="sorbo-drawing-centerline" x1="316" y1="130" x2="508" y2="130"/>${section}
    <line class="sorbo-drawing-extension" x1="486" y1="111" x2="526" y2="111"/><line class="sorbo-drawing-extension" x1="486" y1="149" x2="526" y2="149"/><line class="sorbo-drawing-dimension" x1="516" y1="111" x2="516" y2="149"/><line class="sorbo-drawing-tick" x1="510" y1="111" x2="522" y2="111"/><line class="sorbo-drawing-tick" x1="510" y1="149" x2="522" y2="149"/><text class="sorbo-drawing-dim-label sorbo-drawing-vertical-label" x="538" y="130">t ${fmt(thicknessIn, 3)} in</text>
    <text class="sorbo-drawing-note" x="412" y="184">${idIn > 0 ? `Through-bore · Ø ${fmt(idIn, 3)} in` : 'Solid disc · no center bore'}</text><text class="sorbo-drawing-note" x="412" y="204">Nominal dimensions · not to scale</text>
  </svg><figcaption>${esc(geometry)} element shown in plan and section. The dimensions follow the active catalog record and update with the selected design.</figcaption></figure>`;
}

function stackElementsSvg(countInput, top, bottom, boreRatio, className) {
  const count = Math.max(1, Math.round(countInput));
  const gap = 3;
  const availableHeight = bottom - top;
  const elementHeight = Math.min(15, (availableHeight - gap * (count - 1)) / count);
  const stackHeight = elementHeight * count + gap * (count - 1);
  const startY = top + (availableHeight - stackHeight) / 2;
  return Array.from({ length: count }, (_, index) => elementSectionSvg(214, startY + index * (elementHeight + gap), 124, elementHeight, boreRatio, className)).join('');
}

function isolatorStackDrawing(config, analysis) {
  const topCount = Math.max(1, Math.round(config.mounts.stackTop));
  const bottomCount = Math.max(1, Math.round(config.mounts.stackBottom));
  const odIn = config.isolator.odM / INCH;
  const idIn = config.isolator.idM / INCH;
  const boreRatio = odIn > 0 ? idIn / odIn : 0;
  const compressionPct = analysis?.preload?.compressionPct ?? config.isolator.compressionPct;
  const installedElementIn = config.isolator.thicknessM * (1 - compressionPct / 100) / INCH;
  const topInstalledIn = installedElementIn * topCount;
  const bottomInstalledIn = installedElementIn * bottomCount;
  const topPlural = topCount === 1 ? 'element' : 'elements';
  const bottomPlural = bottomCount === 1 ? 'element' : 'elements';
  return `<figure class="sorbo-design-drawing"><header><div><p class="eyebrow">Installed mount section</p><h3>Captured stack · 1 of 4 mounts</h3></div><span>${fmt(compressionPct, 1)}% compression</span></header><svg viewBox="0 0 560 300" role="img" aria-label="Captured mount stack configuration">
    <line class="sorbo-drawing-centerline" x1="276" y1="18" x2="276" y2="282"/><text class="sorbo-drawing-view-label" x="276" y="18">ONE MOUNT LOCATION · SECTION</text>
    <rect class="sorbo-drawing-capture" x="182" y="32" width="188" height="13" rx="2"/><text class="sorbo-drawing-hardware-label" x="386" y="42">Upper capture plate</text>
    ${stackElementsSvg(topCount, 54, 121, boreRatio, 'upper')}
    <rect class="sorbo-drawing-component" x="154" y="132" width="244" height="30" rx="2"/><text class="sorbo-drawing-component-label" x="276" y="151">ISOLATED COMPONENT PLATE</text>
    ${stackElementsSvg(bottomCount, 173, 240, boreRatio, 'lower')}
    <rect class="sorbo-drawing-capture" x="182" y="253" width="188" height="13" rx="2"/><text class="sorbo-drawing-hardware-label" x="386" y="264">Lower capture / base</text>
    <line class="sorbo-drawing-leader" x1="214" y1="87" x2="144" y2="87"/><text class="sorbo-drawing-stack-label" x="136" y="82" text-anchor="end">UPPER STACK · ${topCount}</text><text class="sorbo-drawing-stack-detail" x="136" y="98" text-anchor="end">${topPlural} in series · ${fmt(topInstalledIn, 3)} in</text>
    <line class="sorbo-drawing-leader" x1="214" y1="207" x2="144" y2="207"/><text class="sorbo-drawing-stack-label" x="136" y="202" text-anchor="end">LOWER STACK · ${bottomCount}</text><text class="sorbo-drawing-stack-detail" x="136" y="218" text-anchor="end">${bottomPlural} in series · ${fmt(bottomInstalledIn, 3)} in</text>
    <text class="sorbo-drawing-note" x="386" y="92">Upper + lower stacks</text><text class="sorbo-drawing-note" x="386" y="108">act in parallel dynamically</text><text class="sorbo-drawing-note" x="386" y="202">Each element: ${fmt(installedElementIn, 3)} in installed</text><text class="sorbo-drawing-note" x="386" y="218">Dashed line: mount axis only</text><text class="sorbo-drawing-note" x="386" y="234">No rigid short circuit modeled</text>
  </svg><figcaption>At each of the four mount posts, ${topCount} upper ${topPlural} and ${bottomCount} lower ${bottomPlural} capture the isolated plate. Elements within each physical stack act in series; the opposing stacks act in parallel for small incremental motion.</figcaption></figure>`;
}

function currentDesignDrawings(config, analysis) {
  if (isParkerLordConfig(config)) return parkerLordDesignDrawings(config);
  return `<section class="sorbo-design-drawings" aria-label="Current isolator and stack drawings">${isolatorElementDrawing(config)}${isolatorStackDrawing(config, analysis)}</section>`;
}

function parkerLordDesignDrawings(config) {
  const item = parkerLordCatalogItem(config.isolator.productNumber);
  const envelope = item.envelopeIn;
  const pair = config.isolator.mountsPerPoint === 2;
  const mount = (centerY, flipped = false) => `<g transform="translate(0 ${centerY})${flipped ? ' scale(1 -1)' : ''}"><rect class="sorbo-drawing-capture" x="190" y="-38" width="180" height="12" rx="3"/><path class="sorbo-drawing-element" d="M220,-26 C225,-4 238,4 250,8 L310,8 C322,4 335,-4 340,-26 Z"/><rect class="sorbo-drawing-capture" x="258" y="8" width="44" height="18" rx="3"/></g>`;
  return `<section class="sorbo-design-drawings" aria-label="Current Parker LORD mount and arrangement drawings"><figure class="sorbo-design-drawing"><header><div><p class="eyebrow">Selected complete mount</p><h3>${esc(item.productNumber)} · ${esc(item.family)}</h3></div><span>${esc(item.elastomer)}</span></header><svg viewBox="0 0 560 270" role="img" aria-label="Schematic plan and section of Parker LORD AM mount"><text class="sorbo-drawing-view-label" x="140" y="28">PLAN</text><text class="sorbo-drawing-view-label" x="412" y="28">SECTION</text><line class="sorbo-drawing-centerline" x1="45" y1="130" x2="235" y2="130"/><line class="sorbo-drawing-centerline" x1="140" y1="38" x2="140" y2="222"/><circle class="sorbo-drawing-element" cx="140" cy="130" r="57"/><circle class="sorbo-drawing-bore" cx="140" cy="130" r="19"/><path class="sorbo-drawing-capture" d="M66 80 H214 V102 H192 V158 H214 V180 H66 V158 H88 V102 H66 Z"/><line class="sorbo-drawing-dimension" x1="66" y1="218" x2="214" y2="218"/><text class="sorbo-drawing-dim-label" x="140" y="243">Reference footprint ${fmt(envelope.footprint, 3)} in</text><rect class="sorbo-drawing-capture" x="336" y="85" width="152" height="14" rx="3"/><path class="sorbo-drawing-element" d="M356 99 C362 124 378 139 394 145 H430 C446 139 462 124 468 99 Z"/><rect class="sorbo-drawing-capture" x="390" y="145" width="44" height="30" rx="3"/><line class="sorbo-drawing-dimension" x1="516" y1="85" x2="516" y2="175"/><text class="sorbo-drawing-dim-label sorbo-drawing-vertical-label" x="540" y="130">H ${fmt(envelope.height, 3)} in</text><text class="sorbo-drawing-note" x="412" y="205">Body Ø ${fmt(envelope.bodyDiameter, 3)} in</text><text class="sorbo-drawing-note" x="412" y="224">Family envelope · schematic only</text></svg><figcaption>Reference-envelope schematic based on the catalog family drawing. Use the current Parker LORD procurement drawing for interfaces and tolerances.</figcaption></figure><figure class="sorbo-design-drawing"><header><div><p class="eyebrow">Installed support arrangement</p><h3>${pair ? 'Back-to-back pair' : 'Single complete mount'} · 1 of 4 points</h3></div><span>${pair ? '2 mounts / point' : '1 mount / point'}</span></header><svg viewBox="0 0 560 300" role="img" aria-label="Parker LORD mount installation arrangement"><line class="sorbo-drawing-centerline" x1="280" y1="20" x2="280" y2="280"/><rect class="sorbo-drawing-component" x="145" y="135" width="270" height="30" rx="3"/><text class="sorbo-drawing-component-label" x="280" y="154">ISOLATED COMPONENT PLATE</text>${pair ? `${mount(127, true)}${mount(173, false)}<rect class="sorbo-drawing-capture" x="170" y="52" width="220" height="14" rx="3"/><rect class="sorbo-drawing-capture" x="170" y="234" width="220" height="14" rx="3"/>` : `${mount(127, true)}<rect class="sorbo-drawing-capture" x="170" y="52" width="220" height="14" rx="3"/>`}<text class="sorbo-drawing-note" x="430" y="92">${pair ? 'Catalog-described pair:' : 'One complete bonded mount'}</text><text class="sorbo-drawing-note" x="430" y="110">${pair ? '2× capacity and rate' : 'per support point'}</text><text class="sorbo-drawing-note" x="430" y="228">${pair ? '8 mounts total' : '4 mounts total'}</text></svg><figcaption>${pair ? 'Two complete AM mounts are arranged back-to-back at each support point; the screening model doubles both rated capacity and dynamic spring rate.' : 'One complete AM mount supports each of the four component locations.'}</figcaption></figure></section>`;
}

function explorerPanel(configInput = DEFAULT_SORBOTHANE_CONFIG, settingsInput = {}, catalogSettingsInput = {}) {
  const config = normalizeSorbothaneConfig(configInput);
  const ranges = sorbothaneExplorerVariableDefaults(config);
  const settings = normalizeExplorerSettings(config, settingsInput);
  const catalogSettings = normalizeCatalogScreenSettings(config, catalogSettingsInput);
  const options = selected => explorerVariableChoices(config).map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');
  const outputOptions = [['t1200', 'Worst X/Y/Z T @ 1200 Hz (dB)'], ['t600', 'Worst X/Y/Z T @ 600 Hz (dB)'], ['peak', 'Worst X/Y/Z peak (dB)'], ['verticalMode', 'Vertical mode (Hz)']];
  const catalogIsLord = catalogSettings.library === 'parker-lord-am';
  const catalogCount = catalogIsLord ? PARKER_LORD_AM_CATALOG.length : SORBOTHANE_CATALOG.length - 1;
  const catalogHeading = catalogIsLord ? 'Recommend a Parker LORD AM part and arrangement' : 'Recommend a Sorbothane part number and stack count';
  const catalogIntro = catalogIsLord ? 'Filter all AM Low Profile Avionics Mount part numbers by family, elastomer, rated load, and single/back-to-back arrangement. Each eligible complete mount is evaluated using its published axial and radial dynamic spring rates.' : 'Filter the Sorbothane catalog by nominal geometry. Every eligible part is checked at each allowed stack count using the current mass, CG, acceleration, compression basis, material model, and active criteria below.';
  const catalogMechanicalCriteria = catalogIsLord ? '<span>Resultant support-point load within rated capacity</span><span>Published axial / radial mount rates</span><span>Single or catalog-described back-to-back pair</span>' : '<span>Installed upper/lower load within catalog rating</span><span>10–20% recommended compression</span><span>No element unloading</span>';
  const catalogEmpty = catalogIsLord ? 'A back-to-back pair doubles both rated capacity and dynamic spring rate; it is not treated as a series pad stack.' : 'Stacked elements act in series: each element carries the same installed stack load, while additional elements reduce mount stiffness.';
  return `<section class="sorbo-tab-panel" data-sorbo-panel="explorer"><section class="sorbo-card"><header><div><p class="eyebrow">Catalog sizing</p><h2>${catalogHeading}</h2></div><span>${catalogCount} manufacturer records</span></header><p class="sorbo-catalog-intro">${catalogIntro}</p><div class="sorbo-criteria-strip">${catalogMechanicalCriteria}<span data-catalog-lateral-criterion>X / Y translation ≥ ${fmt(catalogSettings.xTranslationMinHz, 0)} / ${fmt(catalogSettings.yTranslationMinHz, 0)} Hz</span><span data-catalog-vertical-criterion>Vertical mode in ${fmt(catalogSettings.verticalMinHz, 0)}–${fmt(catalogSettings.verticalMaxHz, 0)} Hz</span><span data-catalog-criterion-count>${catalogToneCriteriaSummary(catalogSettings)}</span></div>${catalogCriteriaControls(config, catalogSettings)}${catalogScreenControls(config, catalogSettings)}${catalogProgressPanel()}<div data-sorbo-catalog-result><div class="sorbo-empty"><strong>Screen the manufacturer catalog.</strong><p>${catalogEmpty}</p></div></div></section><section class="sorbo-card"><header><div><p class="eyebrow">Transparent parametric sweep</p><h2>Isolation map and ranked candidates</h2></div><span>No opaque optimizer</span></header>${currentDesignPanel(config, settings)}<div class="sorbo-explorer-controls"><label><span>X variable</span><select data-explorer="xVariable">${options(settings.xVariable)}</select></label><label><span>X min / max</span><span class="inline-inputs"><input data-explorer="xMin" aria-label="X minimum" type="number" value="${fmt(settings.xMin, 6)}" step="${ranges[settings.xVariable].step}"/><input data-explorer="xMax" aria-label="X maximum" type="number" value="${fmt(settings.xMax, 6)}" step="${ranges[settings.xVariable].step}"/></span><small class="sorbo-explorer-range-note" data-explorer-range-note="x">${esc(ranges[settings.xVariable].note)}</small></label><label><span>Y variable</span><select data-explorer="yVariable">${options(settings.yVariable)}</select></label><label><span>Y min / max</span><span class="inline-inputs"><input data-explorer="yMin" aria-label="Y minimum" type="number" value="${fmt(settings.yMin, 6)}" step="${ranges[settings.yVariable].step}"/><input data-explorer="yMax" aria-label="Y maximum" type="number" value="${fmt(settings.yMax, 6)}" step="${ranges[settings.yVariable].step}"/></span><small class="sorbo-explorer-range-note" data-explorer-range-note="y">${esc(ranges[settings.yVariable].note)}</small></label><label><span>Color output</span><select data-explorer="output">${outputOptions.map(([value, label]) => `<option value="${value}"${value === settings.output ? ' selected' : ''}>${label}</option>`).join('')}</select></label><button type="button" class="button" data-sorbo-action="run-explorer">Run 7 × 7 sweep</button></div><div data-sorbo-explorer-result><div class="sorbo-empty"><strong>Choose two variables.</strong><p>The app evaluates every visible grid point, applies the same mechanics and requirements, and ranks inspectable candidates.</p></div></div></section></section>`;
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
  return `<svg class="sorbo-heatmap" viewBox="0 0 ${width} ${height}" role="img" aria-label="Design sweep heatmap for ${grid.output}">${grid.values.map((row, rowIndex) => row.map((value, columnIndex) => {
    const isReference = Math.abs(grid.xValues[columnIndex] - grid.reference.xValue) < 1e-8 && Math.abs(grid.yValues[rowIndex] - grid.reference.yValue) < 1e-8;
    return `<g><rect${isReference ? ' class="is-current-design"' : ''} x="${margin.left + columnIndex * cellWidth}" y="${margin.top + (grid.yValues.length - 1 - rowIndex) * cellHeight}" width="${cellWidth + .5}" height="${cellHeight + .5}" fill="${color(value)}"/>${isReference ? `<text class="current-design-label" x="${margin.left + (columnIndex + .5) * cellWidth}" y="${margin.top + (grid.yValues.length - rowIndex - .5) * cellHeight - 10}">CURRENT</text>` : ''}<text x="${margin.left + (columnIndex + .5) * cellWidth}" y="${margin.top + (grid.yValues.length - rowIndex - .5) * cellHeight + 4}">${Number.isFinite(value) ? fmt(value, 1) : '—'}</text></g>`;
  }).join('')).join('')}${grid.xValues.map((value, index) => `<text class="axis-tick" x="${margin.left + (index + .5) * cellWidth}" y="${height - margin.bottom + 22}">${fmt(value, 2)}</text>`).join('')}${grid.yValues.map((value, index) => `<text class="axis-tick" x="${margin.left - 12}" y="${margin.top + (grid.yValues.length - index - .5) * cellHeight + 4}" text-anchor="end">${fmt(value, 2)}</text>`).join('')}<text class="sorbo-axis-label" x="${margin.left + (width - margin.left - margin.right) / 2}" y="${height - 16}" text-anchor="middle">${esc(grid.xVariable)}</text><text class="sorbo-axis-label" transform="translate(18 ${margin.top + (height - margin.top - margin.bottom) / 2}) rotate(-90)" text-anchor="middle">${esc(grid.yVariable)}</text></svg>`;
}

function explorerResult(grid) {
  const toneHeaders = (grid.candidates[0]?.analysis.toneResults ?? []).map(result => `<th>Worst T${fmt(result.frequencyHz, 0)}</th>`).join('');
  const lord = isParkerLordConfig(grid.candidates[0]?.config);
  const mechanicalHeaders = lord ? '<th>Mount arrangement</th><th>Max resultant load</th>' : '<th>Compression</th><th>Nominal precompression</th>';
  const mechanicalCells = candidate => lord
    ? `<td>${candidate.config.isolator.mountsPerPoint === 2 ? 'Back-to-back pair' : 'Single'} / point</td><td>${fmt(Math.max(...candidate.analysis.preload.mounts.map(mount => mount.resultantLoadN / LBF)), 2)} lbf</td>`
    : `<td>${fmt(candidate.analysis.preload.compressionPct, 1)}%</td><td>${fmt(candidate.analysis.preload.preloadN / LBF, 2)} lbf / element</td>`;
  const compliance = candidate => lord
    ? `${candidate.analysis.preload.catalogCompliant ? 'rated load OK' : 'outside rating'} · catalog spring rates`
    : `${candidate.analysis.preload.allEngaged ? 'engaged' : 'unloaded'} · ${candidate.analysis.preload.catalogCompliant ? 'catalog OK/N/A' : 'outside rating'} · ${candidate.analysis.preload.compressionCompliant ? 'compression OK' : 'compression outside'}`;
  return `<div class="sorbo-explorer-result"><section><h3>${esc(grid.output)} isolation map</h3>${heatmapSvg(grid)}</section><section><h3>Ranked candidates</h3><div class="table-wrap"><table><thead><tr><th>Rank</th><th>${esc(grid.xVariable)}</th><th>${esc(grid.yVariable)}</th><th>Six modes (Hz)</th><th>Map value</th>${toneHeaders}<th>Worst peak</th>${mechanicalHeaders}<th>Compliance</th></tr></thead><tbody>${grid.candidates.map((candidate, index) => `<tr${candidate.isReference ? ' class="is-current-design"' : ''}><td>${index + 1}${candidate.isReference ? '<span class="sorbo-selected-tag">Current</span>' : ''}</td><td>${fmt(candidate.xValue, 3)}</td><td>${fmt(candidate.yValue, 3)}</td><td>${candidate.analysis.modes.map(mode => fmt(mode.frequencyHz, 1)).join(' · ')}</td><td>${fmt(candidate.value, 2)}</td>${candidate.analysis.toneResults.map(result => `<td>${fmt(result.db, 1)} dB · ${result.worstAxis}</td>`).join('')}<td>${fmt(candidate.analysis.peak.db, 1)} dB · ${candidate.analysis.peak.axis}</td>${mechanicalCells(candidate)}<td><span class="sorbo-status ${candidate.pass ? 'pass' : 'fail'}">${candidate.pass ? 'PASS' : 'REVIEW'}</span><small>${compliance(candidate)}</small></td></tr>`).join('')}</tbody></table></div></section></div>`;
}

function nastranField(path, label, value, options = {}) {
  const unit = options.unit ? `<small>${esc(options.unit)}</small>` : '';
  if (options.options) return `<label><span>${esc(label)}${unit}</span><select data-nastran-field="${esc(path)}">${options.options.map(([optionValue, optionLabel]) => `<option value="${esc(optionValue)}"${optionValue === value ? ' selected' : ''}>${esc(optionLabel)}</option>`).join('')}</select>${options.help ? `<em>${esc(options.help)}</em>` : ''}</label>`;
  return `<label><span>${esc(label)}${unit}</span><input data-nastran-field="${esc(path)}" type="number" value="${esc(value)}"${options.min != null ? ` min="${options.min}"` : ''}${options.max != null ? ` max="${options.max}"` : ''} step="${options.step ?? 'any'}"/>${options.help ? `<em>${esc(options.help)}</em>` : ''}</label>`;
}

function nastranExportOutput(model) {
  const coupling = model.counts.rbe3 ? 'RBE3 distributed coupling' : 'RBE2 rigid coupling';
  const massBasis = model.settings.massAccounting === 'box-plus-plate' ? 'Box CONM2 + physical plate mass' : 'Browser mass preserved; massless plate';
  return `<div class="sorbo-nastran-summary"><article><span>Plate mesh</span><strong>${model.counts.cquad4} CQUAD4</strong><small>${model.counts.grids} total grids · ${fmt(model.plate.thicknessIn, 4)} in PSHELL</small></article><article><span>Mass model</span><strong>${fmt(model.totalIncludedMassLbm, 4)} lbm</strong><small>${fmt(model.totalIncludedMassSlinch, 7)} slinch · ${esc(massBasis)}</small></article><article><span>Box CONM2</span><strong>${fmt(model.box.massSlinch, 7)} slinch</strong><small>${fmt(model.box.massLbm, 4)} lbm at the current CG</small></article><article><span>Plate contribution</span><strong>${fmt(model.plate.includedMassSlinch, 7)} slinch</strong><small>${fmt(model.plate.includedMassLbm, 4)} lbm included · ρ ${model.settings.plateDensitySlinchPerIn3.toExponential(7)}</small></article><article><span>Coupling</span><strong>${esc(coupling)}</strong><small>${model.counts.cbush} CBUSH · ${model.settings.attachmentSpacingIn.map(value => `${fmt(value, 3)} in`).join(' × ')}</small></article><article><span>Equivalent PBUSH</span><strong>${fmt(model.isolators.kzLbfPerIn, 2)} lbf/in axial</strong><small>${fmt(model.isolators.kxLbfPerIn, 2)} / ${fmt(model.isolators.kyLbfPerIn, 2)} lbf/in radial · η ${fmt(model.isolators.lossFactor, 3)}</small></article><article><span>Linearization</span><strong>${fmt(model.isolators.referenceFrequencyHz, 3)} Hz</strong><small>${model.settings.stiffnessReferenceMode === 'vertical-mode' ? 'Calculated vertical-mode frequency' : 'User-defined reference frequency'}</small></article><article><span>Deck</span><strong>SOL 103 · ${model.settings.modeCount} modes</strong><small>0–${fmt(model.settings.maximumFrequencyHz, 0)} Hz · WTMASS = 1.0</small></article></div>${model.warnings.length ? `<aside class="sorbo-nastran-warnings"><strong>Export-model differences to review</strong><ul>${model.warnings.map(warning => `<li>${esc(warning)}</li>`).join('')}</ul></aside>` : ''}<details class="sorbo-nastran-preview"><summary>Preview generated BDF</summary><pre data-nastran-preview>${esc(model.deck)}</pre></details>`;
}

function nastranExportPanel(config, analysis) {
  const model = generateNastranIsolationBdf(config, analysis);
  const settings = model.settings;
  return `<section class="sorbo-card sorbo-nastran-card" data-nastran-export><header><div><p class="eyebrow">NASTRAN correlation model</p><h2>Export the isolation system as a SOL 103 BDF</h2></div><button type="button" class="button" data-sorbo-action="export-nastran-bdf">Download BDF</button></header><div class="sorbo-nastran-unit-contract"><strong>IPS mass-unit contract</strong><span>in · lbf · s · slinch</span><p>CONM2 mass is converted from lbm to slinch. MAT1 density is slinch/in³, inertia is slinch·in², CBUSH stiffness is lbf/in, and <code>PARAM,WTMASS,1.0</code> prevents a second mass conversion.</p></div><div class="sorbo-nastran-controls">${nastranField('plateThicknessIn', 'Plate thickness', settings.plateThicknessIn, { unit: 'in', min: 0.005, max: 5, step: 0.005 })}${nastranField('plateDensitySlinchPerIn3', 'Aluminum mass density', settings.plateDensitySlinchPerIn3, { unit: 'slinch/in³', min: 0, max: 0.01, step: 0.00000001, help: `${fmt(settings.plateDensitySlinchPerIn3 * 386.088582677, 5)} lbm/in³ equivalent.` })}${nastranField('massAccounting', 'Mass accounting', settings.massAccounting, { options: [['box-plus-plate', 'Box CONM2 + physical plate'], ['preserve-browser', 'Preserve browser mass']] })}${nastranField('coupling', 'Box-to-plate coupling', settings.coupling, { options: [['rbe3', 'RBE3 distributed'], ['rbe2', 'RBE2 rigid footprint']] })}${nastranField('stiffnessReferenceMode', 'CBUSH stiffness basis', settings.stiffnessReferenceMode, { options: [['vertical-mode', 'Calculated vertical mode'], ['custom', 'Custom frequency']] })}<span data-nastran-custom-frequency${settings.stiffnessReferenceMode === 'custom' ? '' : ' hidden'}>${nastranField('customReferenceFrequencyHz', 'Custom reference', settings.customReferenceFrequencyHz, { unit: 'Hz', min: 0.1, max: 100000, step: 1 })}</span></div><details class="sorbo-nastran-advanced"><summary>Mesh, attachment, and material controls</summary><div class="sorbo-nastran-controls">${nastranField('meshX', 'Nominal X divisions', settings.meshX, { min: 2, max: 40, step: 1 })}${nastranField('meshY', 'Nominal Y divisions', settings.meshY, { min: 2, max: 40, step: 1 })}${nastranField('attachmentSpacingIn.0', 'Box attachment X spacing', settings.attachmentSpacingIn[0], { unit: 'in', min: 0.01, step: 0.05 })}${nastranField('attachmentSpacingIn.1', 'Box attachment Y spacing', settings.attachmentSpacingIn[1], { unit: 'in', min: 0.01, step: 0.05 })}${nastranField('plateYoungsModulusPsi', "Plate Young's modulus", settings.plateYoungsModulusPsi, { unit: 'psi', min: 1, step: 100000 })}${nastranField('platePoisson', "Plate Poisson's ratio", settings.platePoisson, { min: -0.99, max: 0.499, step: 0.01 })}${nastranField('modeCount', 'Requested modes', settings.modeCount, { min: 6, max: 200, step: 1 })}${nastranField('maximumFrequencyHz', 'Maximum extraction frequency', settings.maximumFrequencyHz, { unit: 'Hz', min: 1, step: 100 })}</div></details><div data-nastran-output>${nastranExportOutput(model)}</div></section>`;
}

function assumptionsPanel(config, analysis) {
  const lord = isParkerLordConfig(config);
  const assumptions = lord ? [
    'Rigid component and base; linear, small-displacement six-DOF rigid-body response.',
    'Four nominally identical support points with mount axial direction aligned to component Z and radial directions aligned to X/Y.',
    'Published Parker LORD axial and radial dynamic spring rates are used directly as frequency-independent complex stiffness for preliminary screening.',
    'The catalog rated-load natural frequency and spring rates are typical values at rated load, not guaranteed application-specific curves.',
    'The editable loss factor is either estimated from a typical catalog transmissibility curve or explicitly marked as an engineering assumption.',
    'A back-to-back pair at one support point doubles capacity and spring rate per the catalog description; no other series or stack rule is assumed.',
    'Combined static acceleration is screened using resultant support-point load; allowable combined axial/radial loading requires manufacturer confirmation.',
    'No amplitude-dependent nonlinearity, shock excursion, aging, radiation, vacuum, contamination, plate flexibility, fastener short circuit, or installation tolerance is modeled.',
    'Confirm current availability, procurement drawing, environmental qualification, and installation orientation with Parker LORD.'
  ] : [
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
  const sourceCards = lord
    ? `<article><span>Parker LORD · ${esc(PARKER_LORD_SOURCE.document)}</span><h3>${esc(PARKER_LORD_SOURCE.title)}</h3><p>AM part numbers, rated loads, natural frequencies, axial/radial dynamic spring rates, elastomers, dynamic input, weight, and family reference geometry.</p><div><a href="${esc(PARKER_LORD_SOURCE.url)}" target="_blank" rel="noreferrer">Open source ↗</a><code>Official Parker catalog PC6116</code></div></article>`
    : SORBOTHANE_REFERENCES.map(reference => `<article><span>${esc(reference.organization)} · ${esc(reference.revision)}</span><h3>${esc(reference.title)}</h3><p>${esc(reference.use)}</p><div><a href="${esc(reference.url)}" target="_blank" rel="noreferrer">Open source ↗</a><code>${esc(reference.local)}</code></div></article>`).join('');
  const modelEquations = lord
    ? '<p><span>Complete mount</span>kz = kaxial,catalog; kx = ky = kradial,catalog</p><p><span>Complex mount rate</span>k* = k′(1 + jη)</p><p><span>Back-to-back pair</span>kpoint = 2 kmount; Frated,point = 2 Frated,mount</p>'
    : '<p><span>Complex material</span>E* = E′ + jE″; E″ = E′ tan δ</p><p><span>Captured sandwich</span>k_mount = k_top-stack + k_bottom-stack</p>';
  return `<section class="sorbo-tab-panel" data-sorbo-panel="assumptions"><div class="sorbo-lower-grid"><section class="sorbo-card"><p class="eyebrow">Always visible model boundary</p><h2>Assumptions and failure modes</h2><ul class="sorbo-assumption-list">${assumptions.map(item => `<li>${esc(item)}</li>`).join('')}</ul>${analysis.warnings.length ? `<h3>Active warnings</h3><ul class="sorbo-warning-list">${analysis.warnings.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}</section><section class="sorbo-card"><p class="eyebrow">Governing equations</p><h2>Mechanics implemented</h2><div class="sorbo-equations"><p><span>Mount kinematics</span>uᵢ = [I − [rᵢ]×] q</p><p><span>Assembled stiffness</span>K*(ω) = Σ Bᵢᵀ diag(kx*, ky*, kz*) Bᵢ</p><p><span>Rigid-body modes</span>K′(fₙ) φ = (2πfₙ)² M φ</p><p><span>Base excitation</span>[−ω²M + K*(ω)] qᵣ = ω²MΓ y</p><p><span>Absolute response</span>qₐ = qᵣ + Γy</p>${modelEquations}</div></section></div>
    <section class="sorbo-card"><p class="eyebrow">Numerical transparency</p><h2>M and K′(100 Hz)</h2><div class="sorbo-matrix-grid">${matrixTable(analysis.massMatrix, 'Mass matrix M (SI)')}${matrixTable(analysis.stiffnessAt100Hz, 'Storage stiffness K′ (SI)')}</div></section>
    ${nastranExportPanel(config, analysis)}
    <section class="sorbo-card"><p class="eyebrow">Validation suite</p><h2>Implemented checks</h2><div class="sorbo-validation-grid"><article><strong>SDOF closure</strong><p>Symmetric vertical response is compared with the analytical base-excited complex-stiffness SDOF solution.</p></article><article><strong>Symmetry</strong><p>Centered CG and symmetric mounts suppress the expected translation/rotation cross terms.</p></article><article><strong>CG shift / height</strong><p>Planar CG offsets and mount-plane separation introduce the expected coupling terms.</p></article><article><strong>Series & sandwich</strong><p>Elements in a stack divide stiffness; opposing preloaded stacks add incremental stiffness.</p></article><article><strong>Units</strong><p>The browser mechanics use SI internally; the BDF exporter explicitly converts to a consistent inch–lbf–second–slinch contract.</p></article></div></section>
    <section class="sorbo-card"><p class="eyebrow">Authoritative sources</p><h2>References and data provenance</h2><div class="sorbo-reference-grid">${sourceCards}</div><p class="sorbo-caption">${lord ? `Parker LORD catalog accessed ${PARKER_LORD_SOURCE.accessed}. The AM series is integrated; Plate Form, Multiplane, Miniature, High Deflection, and other catalog families require separate model adapters.` : `Research snapshot ${SORBOTHANE_DATA_VERSION}. Catalog availability is explicitly subject to change; verify current product pages before procurement.`}</p></section>
  </section>`;
}

function exportControls() {
  return `<div class="sorbo-export-bar"><span>Browser-local · no data uploaded</span><button type="button" class="button-quiet" data-sorbo-action="export-json">Configuration JSON</button><button type="button" class="button-quiet" data-sorbo-action="export-csv">Response CSV</button><button type="button" class="button-quiet" data-sorbo-action="export-report">Engineering summary</button><button type="button" class="button-quiet" data-sorbo-action="add-project">Add to project</button></div>`;
}

export function renderSorbothaneIsolationWorkbench(configInput = null, explorerSettingsInput = {}, catalogSettingsInput = {}) {
  const config = normalizeSorbothaneConfig(configInput ?? DEFAULT_SORBOTHANE_CONFIG);
  const analysis = analyzeSorbothaneIsolation(config);
  const lord = isParkerLordConfig(config);
  return `<div class="page-shell sorbo-workbench" data-sorbothane-workbench><nav class="breadcrumbs site-breadcrumbs" aria-label="Breadcrumb"><a href="#/tools">Tools</a><span aria-hidden="true">›</span><span>Dynamics</span><span aria-hidden="true">›</span><span aria-current="page">6-DOF Isolation Designer</span></nav>
    <section class="sorbo-hero"><div><p class="eyebrow">Aerospace component isolation · Engineering workbench</p><h1>Place the resonance deliberately.<br><span>See what gets through.</span></h1><p>Design a four-point ${lord ? 'Parker LORD complete-mount' : 'captured Sorbothane'} system with source-traceable catalog properties, full rigid-body coupling, complex frequency response, static load checks, and inspectable trade studies.</p></div><aside><strong data-sorbo-hero-mode>${fmt(analysis.modes.find(mode => mode.dominantIndex === 2)?.frequencyHz ?? analysis.modes[2].frequencyHz, 1)} Hz</strong><span>vertical bounce</span><b data-sorbo-hero-status class="${analysis.passes ? 'pass-text' : 'fail-text'}">${analysis.passes ? 'DEFINED REQUIREMENTS PASS' : 'DESIGN REVIEW REQUIRED'}</b><small>${lord ? 'Catalog spring rates are typical; damping and frequency dependence remain visible screening assumptions.' : 'Manufacturer curves end at 300 Hz; 600-2000 Hz uses the selected visible assumption.'}</small></aside></section>
    ${exportControls()}
    <section class="sorbo-shell">${inputSidebar(config)}<main class="sorbo-main"><nav class="sorbo-tabs" role="tablist">${[['overview', 'Overview'], ['modes', 'Modes'], ['transmissibility', 'Transmissibility'], ['sorbothane', 'Isolator'], ['explorer', 'Design Explorer'], ['assumptions', 'Assumptions / Validation']].map(([id, label], index) => `<button type="button" role="tab" data-sorbo-tab="${id}" class="${index === 0 ? 'active' : ''}">${label}</button>`).join('')}</nav><div data-sorbo-panels>${overviewPanel(config, analysis)}${modesPanel(config, analysis)}${transmissibilityPanel(analysis)}${sorbothanePanel(config, analysis)}${explorerPanel(config, explorerSettingsInput, catalogSettingsInput)}${assumptionsPanel(config, analysis)}</div></main></section>
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
  const lord = isParkerLordConfig(config);
  const responsePoint = RESPONSE_POINT_CHOICES.find(choice => choice.value === config.analysis.responsePoint) ?? RESPONSE_POINT_CHOICES[0];
  const hardware = lord ? parkerLordCatalogItem(config.isolator.productNumber) : sorbothaneCatalogItem(config.isolator.productNumber);
  const hardwareSummary = lord
    ? `- Isolator: Parker LORD ${hardware.productNumber}; ${hardware.family}; ${hardware.elastomer}\n- Catalog rates: ${hardware.dynamicAxialSpringRateLbPerIn} lb/in axial; ${hardware.dynamicRadialSpringRateLbPerIn} lb/in radial; rated load ${hardware.ratedLoadLb} lbf / mount\n- Arrangement: ${config.isolator.mountsPerPoint === 2 ? 'back-to-back pair' : 'single mount'} at each of four support points\n- Screening loss factor: ${fmt(config.isolator.lordLossFactor * config.isolator.lossScale, 3)} (${hardware.lossFactorProvenance})`
    : `- Isolator: ${config.isolator.productNumber}; ${config.isolator.durometer} Shore 00; OD ${fmt(config.isolator.odM / INCH, 3)} in; ID ${fmt(config.isolator.idM / INCH, 3)} in; t ${fmt(config.isolator.thicknessM / INCH, 3)} in\n- Stack: ${config.mounts.stackTop} upper / ${config.mounts.stackBottom} lower elements per mount; four mounts\n- Nominal compression: ${fmt(analysis.preload.compressionPct, 2)}%; preload ${fmt(analysis.preload.preloadN / LBF, 3)} lbf per element\n- Shape factor: ${fmt(analysis.geometry.shapeFactor, 4)}; ${analysis.geometry.equation}\n- Above-300-Hz material assumption: ${config.isolator.extrapolation}`;
  const reportSources = lord
    ? `- ${PARKER_LORD_SOURCE.title} (${PARKER_LORD_SOURCE.document}): ${PARKER_LORD_SOURCE.url}`
    : SORBOTHANE_REFERENCES.map(reference => `- ${reference.title} (${reference.revision}): ${reference.url}`).join('\n');
  return `# 6-DOF Isolation Engineering Summary

Generated: ${new Date().toISOString()}

## Configuration

- Mass: ${fmt(config.component.massKg / LB, 3)} lbm (${fmt(config.component.massKg, 3)} kg)
- Component: ${config.component.dimensionsM.map(value => fmt(value / INCH, 3)).join(' × ')} in
- CG: ${config.component.cgM.map(value => fmt(value / INCH, 3)).join(', ')} in from the component footprint-center / plate coordinate origin
${hardwareSummary}
- Transmissibility response location: ${responsePoint.label}

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
- Static load, dynamic stiffness, modal frequency, damping, and base transmissibility remain separate quantities.
- ${lord ? 'Published mount spring rates and estimated loss factor require application-level test correlation.' : 'The 600-2000 Hz predictions require component-level test validation because manufacturer property curves end at 300 Hz.'}

## Sources

${reportSources}
`;
}

function bindChartTooltip(root, analysis) {
  const hit = root.querySelector('[data-sorbo-chart-hit]');
  const tooltip = hit?.closest('svg')?.querySelector('[data-sorbo-tooltip]');
  if (!hit || !tooltip) return;
  const line = tooltip.querySelector('[data-tip-line]');
  const text = tooltip.querySelector('[data-tip-text]');
  const response = analysis.directionalResponses.x;
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
    const rows = ['x', 'y', 'z'].map((axis, dof) => {
      const axisResponse = analysis.directionalResponses[axis];
      return `<tspan x="10" dy="16">T${axis}${axis}: ${fmt(axisResponse.db[dof][index], 1)} dB · ${fmt(axisResponse.phaseDeg[dof][index], 0)}°</tspan>`;
    }).join('');
    text.innerHTML = `<tspan x="10" dy="0">${fmt(response.frequencies[index], 1)} Hz</tspan>${rows}`;
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
  let explorerSettings = defaultExplorerSettings(config);
  let catalogSettings = defaultCatalogScreenSettings(config);
  let catalogScreen = null;
  let explorerGrid = null;
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
  const currentCatalogSelection = () => config.isolator.productNumber === 'custom-ring' ? null : {
    library: isParkerLordConfig(config) ? 'parker-lord-am' : 'sorbothane',
    productNumber: config.isolator.productNumber,
    stackCount: isParkerLordConfig(config) ? config.isolator.mountsPerPoint : config.mounts.stackTop
  };
  const restoreStudyResults = () => {
    const catalogResult = shell.querySelector('[data-sorbo-catalog-result]');
    if (catalogScreen && catalogResult) catalogResult.innerHTML = catalogScreenResult(catalogScreen, currentCatalogSelection());
    const explorerResultMount = shell.querySelector('[data-sorbo-explorer-result]');
    if (explorerGrid && explorerResultMount) explorerResultMount.innerHTML = explorerResult(explorerGrid);
  };
  const redrawAnalysis = () => {
    catalogRunToken += 1;
    catalogScreen = null;
    explorerGrid = null;
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
    restoreStudyResults();
    bindInputs();
    bindPanelControls();
    showTab(activeTab);
    updateVisibility();
    syncSidebarControls();
    save();
  };
  const applyCatalog = (productNumber, kind = config.isolator.kind) => {
    if (kind === 'parker-lord-am') {
      const item = parkerLordCatalogItem(productNumber);
      config.isolator.kind = 'parker-lord-am';
      config.isolator.productNumber = item.productNumber;
      config.isolator.lordLossFactor = item.lossFactorDefault;
      config.isolator.modulusScale = 1;
      config.isolator.lossScale = 1;
      return;
    }
    const item = sorbothaneCatalogItem(productNumber);
    config.isolator.kind = 'sorbothane-element';
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
    const changeIsolatorKind = value => {
      if (value === config.isolator.kind) return;
      if (value === 'parker-lord-am') applyCatalog('AM-006-1', 'parker-lord-am');
      else applyCatalog('custom-ring', 'sorbothane-element');
      catalogSettings = { ...defaultCatalogScreenSettings(config), library: value === 'parker-lord-am' ? 'parker-lord-am' : 'sorbothane' };
      explorerSettings = defaultExplorerSettings(config);
      catalogScreen = null;
      explorerGrid = null;
      requestAnimationFrame(rerenderWorkbench);
    };
    shell.querySelectorAll('[data-sorbo-model-choice]').forEach(button => button.addEventListener('click', () => changeIsolatorKind(button.dataset.sorboModelChoice)));
    shell.querySelector('[data-sorbo-units]')?.addEventListener('change', event => {
      catalogRunToken += 1;
      config.units = event.target.value;
      const replacement = document.createElement('div');
      replacement.innerHTML = renderSorbothaneIsolationWorkbench(config, explorerSettings, catalogSettings);
      const next = replacement.firstElementChild;
      shell.replaceWith(next);
      shell = next;
      restoreStudyResults();
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
      if (path === 'isolator.kind') {
        changeIsolatorKind(value);
        return;
      }
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
      catalogScreen = null;
      explorerGrid = null;
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
    shell.querySelectorAll('[data-sorbo-response-point]').forEach(button => button.addEventListener('click', () => {
      const responsePoint = button.dataset.sorboResponsePoint;
      if (responsePoint === config.analysis.responsePoint) return;
      config.analysis.responsePoint = responsePoint;
      redrawAnalysis();
    }));
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
    const refreshNastranExport = () => {
      const model = generateNastranIsolationBdf(config, analysis);
      const output = shell.querySelector('[data-nastran-output]');
      if (output) output.innerHTML = nastranExportOutput(model);
      shell.querySelectorAll('[data-nastran-field]').forEach(control => {
        const value = pathGet(config.validation.nastran, control.dataset.nastranField);
        control.value = String(value);
      });
      const customFrequency = shell.querySelector('[data-nastran-custom-frequency]');
      if (customFrequency) customFrequency.hidden = config.validation.nastran.stiffnessReferenceMode !== 'custom';
      return model;
    };
    shell.querySelectorAll('[data-nastran-field]').forEach(control => control.addEventListener('change', event => {
      const field = event.target.dataset.nastranField;
      const value = event.target.tagName === 'SELECT' ? event.target.value : Number(event.target.value);
      pathSet(config.validation.nastran, field, value);
      config = normalizeSorbothaneConfig(config);
      save();
      const model = refreshNastranExport();
      const live = shell.querySelector('[data-sorbo-live]');
      if (live) live.textContent = `NASTRAN export updated. ${model.counts.cquad4} CQUAD4 elements and four CBUSH isolators.`;
    }));
    shell.querySelector('[data-sorbo-action="export-nastran-bdf"]')?.addEventListener('click', () => {
      const model = refreshNastranExport();
      download(model.filename, model.deck, 'text/plain;charset=utf-8');
      const live = shell.querySelector('[data-sorbo-live]');
      if (live) live.textContent = `Downloaded ${model.filename}.`;
    });
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
      catalogScreen = null;
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
      const stringKeys = ['library', 'geometry', 'lordFamily', 'lordElastomer'];
      catalogSettings[key] = stringKeys.includes(key) ? event.target.value : Number(event.target.value);
      clearCatalogResult();
      if (key === 'library') {
        catalogSettings = normalizeCatalogScreenSettings(config, catalogSettings);
        requestAnimationFrame(rerenderWorkbench);
      }
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
      const kind = control.dataset.sorboCatalogKind ?? 'sorbothane-element';
      applyCatalog(control.dataset.sorboCatalogUse, kind);
      const arrangementCount = clamp(Math.round(Number(control.dataset.sorboCatalogStack)), 1, kind === 'parker-lord-am' ? 2 : 8);
      if (kind === 'parker-lord-am') config.isolator.mountsPerPoint = arrangementCount;
      else {
        config.mounts.stackTop = arrangementCount;
        config.mounts.stackBottom = arrangementCount;
      }
      config.analysis.lateralModeMinimumHz = [catalogSettings.xTranslationMinHz, catalogSettings.yTranslationMinHz];
      config.analysis.modeAcceptBandHz = [catalogSettings.verticalMinHz, catalogSettings.verticalMaxHz];
      config.analysis.resonanceBandHz = [catalogSettings.resonanceMinHz, catalogSettings.resonanceMaxHz];
      config.analysis.resonanceLimitDb = catalogSettings.resonanceMaximumDb;
      config.analysis.tones = catalogSettings.toneCriteria.map(tone => ({ ...tone }));
      explorerSettings = defaultExplorerSettings(config);
      explorerSettings = sorbothaneExplorerSettingsAroundDesign(config, explorerSettings);
      explorerGrid = null;
      requestAnimationFrame(() => {
        rerenderWorkbench();
        const live = shell.querySelector('[data-sorbo-live]');
        if (live) live.textContent = `${config.isolator.productNumber} applied with ${arrangementCount} ${kind === 'parker-lord-am' ? 'mounts per support point' : 'elements per side at each mount'} and ${config.analysis.tones.length} tone criteria.`;
      });
    });
    shell.querySelector('[data-sorbo-action="screen-catalog"]')?.addEventListener('click', async event => {
      const get = key => shell.querySelector(`[data-catalog-screen="${key}"]`)?.value;
      const criterion = key => shell.querySelector(`[data-catalog-criterion="${key}"]`)?.value;
      catalogSettings = normalizeCatalogScreenSettings(config, {
        ...catalogSettings,
        library: get('library'),
        geometry: get('geometry'), odMin: get('odMin'), odMax: get('odMax'), idMin: get('idMin'), idMax: get('idMax'),
        thicknessMin: get('thicknessMin'), thicknessMax: get('thicknessMax'), stackMin: get('stackMin'), stackMax: get('stackMax'),
        lordFamily: get('lordFamily'), lordElastomer: get('lordElastomer'), lordRatedLoadMin: get('lordRatedLoadMin'), lordRatedLoadMax: get('lordRatedLoadMax'),
        lordMountsMin: get('lordMountsMin'), lordMountsMax: get('lordMountsMax'),
        xTranslationMinHz: criterion('xTranslationMinHz'), yTranslationMinHz: criterion('yTranslationMinHz'),
        verticalMinHz: criterion('verticalMinHz'), verticalMaxHz: criterion('verticalMaxHz'),
        resonanceMinHz: criterion('resonanceMinHz'), resonanceMaxHz: criterion('resonanceMaxHz'), resonanceMaximumDb: criterion('resonanceMaximumDb')
      });
      for (const key of ['library', 'geometry', 'odMin', 'odMax', 'idMin', 'idMax', 'thicknessMin', 'thicknessMax', 'stackMin', 'stackMax', 'lordFamily', 'lordElastomer', 'lordRatedLoadMin', 'lordRatedLoadMax', 'lordMountsMin', 'lordMountsMax']) {
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
        const criteria = {
          lateralModeMinimumHz: [catalogSettings.xTranslationMinHz, catalogSettings.yTranslationMinHz],
          verticalModeRangeHz: [catalogSettings.verticalMinHz, catalogSettings.verticalMaxHz],
          resonanceBandHz: [catalogSettings.resonanceMinHz, catalogSettings.resonanceMaxHz],
          resonanceMaximumDb: catalogSettings.resonanceMaximumDb,
          tones: catalogSettings.toneCriteria
        };
        const screenFunction = catalogSettings.library === 'parker-lord-am' ? screenParkerLordCatalogAsync : screenSorbothaneCatalogAsync;
        const screenSettings = catalogSettings.library === 'parker-lord-am' ? {
          family: catalogSettings.lordFamily,
          elastomer: catalogSettings.lordElastomer,
          ratedLoadRange: [catalogSettings.lordRatedLoadMin, catalogSettings.lordRatedLoadMax],
          mountsPerPointRange: [catalogSettings.lordMountsMin, catalogSettings.lordMountsMax],
          criteria
        } : {
          geometry: catalogSettings.geometry,
          odRange: [catalogSettings.odMin, catalogSettings.odMax],
          idRange: [catalogSettings.idMin, catalogSettings.idMax],
          thicknessRange: [catalogSettings.thicknessMin, catalogSettings.thicknessMax],
          stackRange: [catalogSettings.stackMin, catalogSettings.stackMax],
          criteria
        };
        const screen = await screenFunction(config, screenSettings, {
          batchSize: 6,
          shouldCancel: () => runToken !== catalogRunToken,
          yieldControl: () => new Promise(resolve => requestAnimationFrame(resolve)),
          onProgress: progress => {
            if (runToken !== catalogRunToken) return;
            const percent = clamp(Math.round(progress.percent), 0, 100);
            if (progressBar) {
              progressBar.value = percent;
              progressBar.setAttribute('value', String(percent));
              progressBar.textContent = `${percent}%`;
            }
            if (progressLabel) progressLabel.textContent = stageLabel(progress.stage);
            if (progressPercent) progressPercent.textContent = `${percent}%`;
            if (progressDetail) progressDetail.textContent = `${progress.completed} of ${progress.total} combinations in this stage`;
            button.textContent = `Screening catalog · ${percent}%`;
          }
        });
        if (!screen || runToken !== catalogRunToken) return;
        catalogScreen = screen;
        if (catalogResult) catalogResult.innerHTML = catalogScreenResult(screen, currentCatalogSelection());
        button.disabled = false;
        button.textContent = 'Screen full catalog';
      } catch (error) {
        if (runToken !== catalogRunToken) return;
        catalogScreen = null;
        if (catalogResult) catalogResult.innerHTML = `<div class="sorbo-empty sorbo-catalog-empty"><strong>The catalog screen stopped.</strong><p>${esc(error?.message ?? 'Unexpected screening error.')}</p></div>`;
        button.disabled = false;
        button.textContent = 'Screen full catalog';
        if (progressLabel) progressLabel.textContent = 'Catalog screen stopped';
      }
    });
    const clearExplorerResult = (title = 'Ranges updated.') => {
      explorerGrid = null;
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
    const syncExplorerControls = () => {
      for (const key of ['xVariable', 'xMin', 'xMax', 'yVariable', 'yMin', 'yMax', 'output']) {
        const control = shell.querySelector(`[data-explorer="${key}"]`);
        if (control) control.value = typeof explorerSettings[key] === 'number' ? fmt(explorerSettings[key], 6) : explorerSettings[key];
      }
      for (const axis of ['x', 'y']) {
        const variable = explorerSettings[`${axis}Variable`];
        const range = sorbothaneExplorerVariableDefaults(config)[variable];
        const note = shell.querySelector(`[data-explorer-range-note="${axis}"]`);
        if (note) note.textContent = `${range.note} Current design value: ${fmt(explorerVariableValue(config, variable), 4)}.`;
      }
    };
    const runExplorerSweep = trigger => {
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
      const runButton = shell.querySelector('[data-sorbo-action="run-explorer"]');
      if (runButton) {
        runButton.disabled = true;
        runButton.textContent = 'Evaluating 49 designs…';
      }
      if (trigger && trigger !== runButton) trigger.disabled = true;
      requestAnimationFrame(() => {
        explorerGrid = runDesignGrid(config, { xVariable: explorerSettings.xVariable, yVariable: explorerSettings.yVariable, xRange: [explorerSettings.xMin, explorerSettings.xMax], yRange: [explorerSettings.yMin, explorerSettings.yMax], output: explorerSettings.output, gridSize: 7 });
        shell.querySelector('[data-sorbo-explorer-result]').innerHTML = explorerResult(explorerGrid);
        if (runButton) {
          runButton.disabled = false;
          runButton.textContent = 'Run 7 × 7 sweep';
        }
        if (trigger && trigger !== runButton) trigger.disabled = false;
        const live = shell.querySelector('[data-sorbo-live]');
        if (live) live.textContent = `Seven by seven design sweep complete around ${config.isolator.productNumber}.`;
      });
    };
    shell.querySelector('[data-sorbo-action="run-explorer"]')?.addEventListener('click', event => runExplorerSweep(event.currentTarget));
    shell.querySelector('[data-sorbo-action="load-current-into-explorer"]')?.addEventListener('click', event => {
      explorerSettings = sorbothaneExplorerSettingsAroundDesign(config, explorerSettings);
      syncExplorerControls();
      clearExplorerResult('Current design centered in the 7 × 7 matrix.');
      runExplorerSweep(event.currentTarget);
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
