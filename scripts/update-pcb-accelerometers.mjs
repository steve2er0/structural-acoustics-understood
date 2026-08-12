import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirFlag = process.argv.indexOf('--source-dir');
const sourceDir = sourceDirFlag >= 0 ? process.argv[sourceDirFlag + 1] : '';
const shouldWrite = process.argv.includes('--write');

const categories = [
  ['general-single', 'General purpose · single axis', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/general-purpose/single-axis'],
  ['general-triaxial', 'General purpose · triaxial', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/general-purpose/triaxial'],
  ['miniature-single', 'Miniature piezoelectric · single axis', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/miniature-piezoelectric/single-axis'],
  ['miniature-triaxial', 'Miniature piezoelectric · triaxial', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/miniature-piezoelectric/triaxial'],
  ['high-temp-icp', 'High temperature · ICP', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/high-temperature/icp'],
  ['high-temp-charge', 'High temperature · charge mode', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/high-temperature/charge-mode'],
  ['high-sensitivity', 'High sensitivity ICP', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/high-sensitivity-icp'],
  ['structural-test', 'Structural test', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/structural-test'],
  ['vc-3700', 'Variable capacitance MEMS · PCB 3700 series', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/variable-capacitance-mems/3700-series'],
  ['pr-damped', 'Piezoresistive shock · damped', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/piezoresistive-shock/damped'],
  ['pr-smt', 'Piezoresistive shock · surface mount', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/piezoresistive-shock/smt-surface-mount'],
  ['icp-shock', 'Piezoelectric ICP shock', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/piezoelectric-icp-shock'],
  ['thermal-stability', 'Thermal stability ICP', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/thermal-stability-icp'],
  ['cryogenic-icp', 'Cryogenic ICP', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/cryogenic-icp'],
  ['cryogenic-charge', 'Cryogenic charge mode', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/cryogenic-charge'],
  ['low-outgassing', 'Low outgassing', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/low-outgassing-accelerometers'],
  ['special-purpose', 'Special purpose', 'https://www.pcb.com/sensors-for-test-measurement/accelerometers/special-purpose']
];

const decodeHtml = value => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'");

const text = value => decodeHtml(String(value ?? '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const finite = value => Number.isFinite(value) ? value : null;
const firstNumber = value => {
  const match = String(value ?? '').replace(/,/g, '').match(/[+-]?\d*\.?\d+(?:e[+-]?\d+)?/i);
  return match ? finite(Math.abs(Number(match[0]))) : null;
};
const scaledNumber = (raw, multiplier = '') => finite(Number(raw) * (/k/i.test(multiplier) ? 1000 : 1));

function numericRange(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').replace(/[–—]/g, '-');
  const range = cleaned.match(/([+-]?\d*\.?\d+)\s*([kK]?)\s*(?:to|\s-\s)\s*([+-]?\d*\.?\d+)\s*([kK]?)/i);
  if (range) return [scaledNumber(range[1], range[2]), scaledNumber(range[3], range[4])];
  const single = cleaned.match(/([+-]?\d*\.?\d+)\s*([kK]?)/);
  return single ? [null, scaledNumber(single[1], single[2])] : [null, null];
}

function tolerance(label) {
  const match = String(label ?? '').match(/\(([^)]+%|[^)]*dB)\)/i);
  return match ? match[1].replace(/\s+/g, '') : '';
}

async function loadSource(url, fileName) {
  if (sourceDir) return readFile(path.join(sourceDir, fileName), 'utf8');
  const response = await fetch(url, { headers: { 'user-agent': 'Structural Acoustics Understood catalog refresh' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function listedProducts(html) {
  const matches = [...html.matchAll(/<span[^>]*>Model:([^<]+)<\/span>/gi)];
  return matches.map((match, index) => {
    const blockStart = html.lastIndexOf('<div class="pcbs-result product"', match.index);
    const nextStart = index + 1 < matches.length ? html.lastIndexOf('<div class="pcbs-result product"', matches[index + 1].index) : html.length;
    const block = html.slice(Math.max(0, blockStart), nextStart);
    const imageTitle = block.match(/<img[^>]+title="([^"]*)"/i);
    const specs = Object.fromEntries([...block.matchAll(/<li[^>]+class="English"[^>]*>([^:<]+):\s*([\s\S]*?)<\/li>/gi)].map(item => [text(item[1]), text(item[2])]));
    const datasheet = block.match(/href="([^"]+\.pdf)"/i);
    return { model: text(match[1]), description: text(imageTitle?.[1]), specs, datasheetUrl: datasheet ? new URL(datasheet[1], 'https://www.pcb.com').href : '' };
  }).filter(item => item.model && !/dummy|noise monitor|placebo/i.test(item.description));
}

function rowsFromProduct(html) {
  const rows = [];
  for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => text(cell[1]));
    if (cells.length >= 3 && cells[0] && !/^(Performance|Environmental|Electrical|Physical)$/i.test(cells[0])) rows.push({ label: cells[0], english: cells[1], si: cells[2] });
  }
  return rows;
}

function productMetadata(html, model) {
  const scripts = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(decodeHtml(match[1]).replace(/[\u0000-\u001f]+/g, ' '));
      if (parsed?.sku && String(parsed.sku).toUpperCase() === model.toUpperCase()) return parsed;
    } catch {}
  }
  return {};
}

const findRow = (rows, pattern) => rows.find(row => pattern.test(row.label));
const findFrequency = rows => rows.find(row => /^Frequency Range/i.test(row.label) && /±?5\s*%|\+5\s*%/i.test(row.label))
  || rows.find(row => /^Frequency Range/i.test(row.label) && /3\s*dB/i.test(row.label))
  || rows.find(row => /^Frequency Range/i.test(row.label));

function parseSensitivity(row) {
  if (!row) return { value: null, unit: '', tolerance: '' };
  const match = row.english.match(/([+-]?\d*\.?\d+)\s*(mV|pC)\s*\/\s*g/i);
  return { value: match ? finite(Number(match[1])) : null, unit: match ? `${match[2].toLowerCase() === 'mv' ? 'mV' : 'pC'}/g` : '', tolerance: tolerance(row.label) };
}

function inferOutputType(description, sensitivityUnit) {
  const value = String(description ?? '').toLowerCase();
  if (sensitivityUnit === 'pC/g' || /charge output|charge mode/.test(value)) return 'Charge';
  if (/piezoresistive/.test(value)) return 'Piezoresistive MEMS';
  if (/variable capacitance|vc mems|capacitive/.test(value)) return 'Variable capacitance MEMS';
  if (/icp|iepe|isotron/.test(value) || sensitivityUnit === 'mV/g') return 'ICP / voltage';
  return 'Voltage output';
}

function naturalModelCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

const familyMembership = new Map();
const sourceHtml = [];
for (const [key, label, url] of categories) {
  const html = await loadSource(url, `pcb-${key}.html`);
  sourceHtml.push(html);
  for (const listing of listedProducts(html)) if (!familyMembership.has(listing.model.toUpperCase())) familyMembership.set(listing.model.toUpperCase(), { key, label, url, listing });
}

const records = [];
for (const model of [...familyMembership.keys()].sort(naturalModelCompare)) {
  const family = familyMembership.get(model);
  const fileModel = model.replaceAll('/', '_');
  const productUrl = `https://www.pcb.com/products?m=${encodeURIComponent(model)}`;
  const html = await loadSource(productUrl, `pcb-product-${fileModel}.html`);
  sourceHtml.push(html);
  const rows = rowsFromProduct(html);
  const metadata = productMetadata(html, model);
  const sensitivityRow = findRow(rows, /^Sensitivity\b/i);
  const rangeRow = findRow(rows, /^(?:Max )?Measurement Range$/i);
  const frequencyRow = findFrequency(rows);
  const temperatureRow = findRow(rows, /^Temperature Range(?: \(Operating\))?$/i) || findRow(rows, /^Max Temp$/i);
  const resolutionRow = findRow(rows, /^Broadband Resolution/i);
  const massRow = findRow(rows, /^(?:Weight|Mass)$/i);
  const axesRow = findRow(rows, /^(?:Number of Axis|Number of Axes)$/i);
  const sensitivity = parseSensitivity(sensitivityRow);
  const [frequencyMinHz, frequencyMaxHz] = numericRange(frequencyRow?.english);
  const [temperatureMinC, temperatureMaxC] = numericRange(temperatureRow?.si || temperatureRow?.english);
  const description = text(metadata.description || family.listing.description || '');
  const listedRange = family.listing.specs['Measurement Range'] || description.match(/(?:±\s*)?([\d,.]+)\s*g\b/i)?.[0] || '';
  records.push({
    model,
    family: family.label,
    familyKey: family.key,
    description,
    outputType: inferOutputType(description, sensitivity.unit),
    axes: axesRow ? firstNumber(axesRow.english || axesRow.si) : /triaxial|3-axis|triax/i.test(`${family.label} ${description}`) ? 3 : 1,
    sensitivityValue: sensitivity.value,
    sensitivityUnit: sensitivity.unit,
    sensitivityTolerance: sensitivity.tolerance,
    measurementRangeGPeak: firstNumber(rangeRow?.english || listedRange),
    broadbandResolutionGRms: firstNumber(resolutionRow?.english),
    resolutionBasis: resolutionRow ? `${resolutionRow.label}: ${resolutionRow.english}` : '',
    frequencyMinHz,
    frequencyMaxHz,
    frequencyTolerance: tolerance(frequencyRow?.label),
    frequencyBasis: frequencyRow ? `${frequencyRow.label}: ${frequencyRow.english}` : '',
    temperatureMinC,
    temperatureMaxC,
    temperatureBasis: temperatureRow ? `${temperatureRow.label}: ${temperatureRow.si || temperatureRow.english}` : '',
    massGrams: firstNumber(massRow?.si),
    familyUrl: family.url,
    productUrl,
    datasheetUrl: family.listing.datasheetUrl,
    sourceStatus: 'Listed on current PCB R&D category page'
  });
}

const retrievedAt = new Date().toISOString();
const sourceDigest = createHash('sha256').update(sourceHtml.join('\n')).digest('hex');
const familyCounts = Object.fromEntries(categories.map(([, label]) => [label, records.filter(record => record.family === label).length]).filter(([, count]) => count));
const fieldCoverage = {
  sensitivity: records.filter(record => record.sensitivityValue && record.sensitivityUnit).length,
  measurementRange: records.filter(record => record.measurementRangeGPeak).length,
  frequencyRange: records.filter(record => record.frequencyMaxHz).length,
  temperatureRange: records.filter(record => record.temperatureMinC != null && record.temperatureMaxC != null).length,
  broadbandResolution: records.filter(record => record.broadbandResolutionGRms).length,
  mass: records.filter(record => record.massGrams).length
};
const meta = {
  manufacturer: 'PCB Piezotronics',
  scope: 'Test & Measurement accelerometer models exposed by PCB R&D comparison tables, including PCB and Endevco models',
  retrievedAt,
  productCount: records.length,
  sourceDigest,
  catalogUrl: 'https://www.pcb.com/sensors-for-test-measurement/accelerometers',
  familyCounts,
  fieldCoverage
};

const moduleText = `// Generated by scripts/update-pcb-accelerometers.mjs. Review the manifest before committing.\n` +
  `export const PCB_ACCELEROMETER_CATALOG_META = Object.freeze(${JSON.stringify(meta, null, 2)});\n\n` +
  `export const pcbAccelerometers = Object.freeze(${JSON.stringify(records, null, 2)});\n\n` +
  `export const pcbAccelerometerByModel = new Map(pcbAccelerometers.map(sensor => [sensor.model, sensor]));\n` +
  `export const pcbAccelerometerOptions = pcbAccelerometers.map(sensor => ({ value: sensor.model, label: \`\${sensor.model} · \${sensor.sensitivityValue ?? '—'} \${sensor.sensitivityUnit || ''} · \${sensor.measurementRangeGPeak ?? '—'} g\`, group: sensor.family }));\n`;

const manifest = { ...meta, categories: categories.map(([key, label, url]) => ({ key, label, url })), recordsWithIncompleteCoreFields: records.filter(record => !record.sensitivityValue || !record.sensitivityUnit || !record.measurementRangeGPeak || !record.frequencyMaxHz || record.temperatureMinC == null || record.temperatureMaxC == null).map(record => record.model) };

if (shouldWrite) {
  await writeFile(path.join(projectRoot, 'js/pcb-accelerometers-data.js'), moduleText);
  await writeFile(path.join(projectRoot, 'references/pcb-accelerometers-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(JSON.stringify({ ...meta, incompleteCore: manifest.recordsWithIncompleteCoreFields.length }, null, 2));
