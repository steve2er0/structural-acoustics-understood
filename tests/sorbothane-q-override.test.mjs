import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeSorbothaneConfig, analyzeSorbothaneIsolation, isolationMountStiffnesses,
  sorbothaneDynamicProperties, isolatorDynamicProperties, rigidBodyResponseAtFrequency,
  runDesignGrid, screenSorbothaneCatalog, uncertaintyEnvelope, uncertaintyEnvelopeAsync
} from '../js/sorbothane-analysis.js';
import { loadSorbothaneConfiguration } from '../js/sorbothane-configurations.js';
import { renderSorbothaneIsolationWorkbench, engineeringReport, applySorbothaneCatalogCandidate } from '../js/sorbothane-isolation.js';
import { generateNastranIsolationBdf } from '../js/nastran-isolation-export.js';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const fixture = () => {
  const config = loadSorbothaneConfiguration('shaker-test');
  config.uncertainty.enabled = false;
  config.analysis.frequencyPoints = 41;
  return config;
};
const manual = config => ({ ...config, damping: { mode: 'manual-q', effectiveQ: 6 } });
const mixed = () => {
  const config = fixture();
  config.assemblies.enabled = true;
  config.assemblies.assignments = ['A', 'A', 'B', 'B'];
  for (const group of Object.values(config.assemblies.groups)) Object.assign(group, {
    topProductNumber: '0510005-70-10', bottomProductNumber: '0510001-70-10',
    topCount: 1, bottomCount: 1, compressionPct: 15,
    boltDiameterM: .25 * .0254, holeDiameterM: .47 * .0254, gripThicknessM: .12 * .0254
  });
  config.assemblies.groups.B.bottomProductNumber = '0510001-30-10';
  return config;
};

for (const library of ['uniform Sorbothane', 'mixed assemblies', 'Parker LORD']) {
  test(`manual Q controls all six modes and each support direction without changing real mechanics: ${library}`, () => {
    const config = library === 'mixed assemblies' ? mixed() : fixture();
    if (library === 'Parker LORD') Object.assign(config.isolator, { kind: 'parker-lord-am', productNumber: 'AM-006-1' });
    config.analysis.resonanceBandHz = [1, 500];
    config.isolator.lossScale = 1.5; // Must not scale the explicitly requested Q.
    const automatic = analyzeSorbothaneIsolation(config, { skipResponse: true });
    const override = manual(config);
    const result = analyzeSorbothaneIsolation(override, { skipResponse: true });
    assert.deepEqual(result.preload, automatic.preload);
    assert.deepEqual(result.stiffnessAt100Hz, automatic.stiffnessAt100Hz);
    assert.deepEqual(result.modes.map(m => m.frequencyHz), automatic.modes.map(m => m.frequencyHz));
    result.modes.forEach(mode => { close(1 / mode.lossFactor, 6); close(mode.dampingRatio, 1 / 12); });
    for (const frequency of [10, 75, 500, 1200]) {
      isolationMountStiffnesses(override, frequency).forEach(mount => {
        close(mount.material.tanDelta, 1 / 6);
        if (mount.lossNPerM) mount.lossNPerM.forEach((loss, index) => close(loss / [mount.kxNPerM, mount.kyNPerM, mount.kzNPerM][index], 1 / 6));
      });
    }
    assert.ok(result.warnings.some(w => /Manual damping assumption/.test(w)));
    assert.ok(result.peak.db > automatic.peak.db, 'lower damping increases the resonance response');
    assert.deepEqual(analyzeSorbothaneIsolation({ ...override, damping: { ...override.damping, mode: 'material' } }, { skipResponse: true }), automatic);
  });
}

test('Q = 6 changes actual FRFs and resonance pass/fail, not just mode card labels', () => {
  const config = fixture();
  Object.assign(config.analysis, { resonanceBandHz: [10, 500], resonanceLimitDb: 12 });
  const automatic = analyzeSorbothaneIsolation(config);
  const result = analyzeSorbothaneIsolation(manual(config));
  assert.ok(automatic.peakResults.every(p => p.pass));
  assert.ok(result.peakResults.every(p => !p.pass));
  for (const axis of ['x', 'y', 'z']) assert.notDeepEqual(result.directionalResponses[axis].db, automatic.directionalResponses[axis].db);
  const bounce = result.modes.find(mode => mode.dominantIndex === 2);
  assert.ok(bounce);
  // An uncoupled structural-damping SDOF has |T(fn)| = sqrt(1 + Q²), not Q.
  close(rigidBodyResponseAtFrequency(manual(config), bounce.frequencyHz, 'z').magnitude[2], Math.sqrt(37), .002);
  assert.deepEqual(sorbothaneDynamicProperties(manual(config), 75), sorbothaneDynamicProperties(config, 75), 'manufacturer material curves are not rewritten');
  assert.equal(isolatorDynamicProperties(manual(config), 75).dampingProvenance, 'engineering-assumption-manual-q');
});

test('manual Q survives configuration round-trip; old and invalid configurations have safe defaults', () => {
  const config = manual(fixture());
  assert.deepEqual(normalizeSorbothaneConfig(JSON.parse(JSON.stringify(config))), config);
  const legacy = fixture();
  delete legacy.damping;
  assert.deepEqual(normalizeSorbothaneConfig(legacy).damping, { mode: 'material', effectiveQ: 6 });
  for (const effectiveQ of [0, -6, NaN, Infinity, '', 1e-320]) assert.equal(normalizeSorbothaneConfig({ damping: { mode: 'manual-q', effectiveQ } }).damping.effectiveQ, 6);
  assert.equal(normalizeSorbothaneConfig({ damping: { mode: 'bogus' } }).damping.mode, 'material');
});

test('catalog recommendations, paired assemblies, selection and matrix candidates retain the active Q', () => {
  const config = manual(fixture());
  const grid = runDesignGrid(config, { xVariable: 'mass', yVariable: 'compression', xRange: [20, 30], yRange: [12, 18], gridSize: 3 });
  const cells = grid.cells.flat().filter(cell => cell.analysis);
  assert.equal(cells.length, 9);
  for (const cell of cells) cell.analysis.modes.forEach(mode => close(1 / mode.lossFactor, 6));
  const screen = screenSorbothaneCatalog(config, { geometry: 'washer', odRange: [.99, 1.01], idRange: [.44, .46], thicknessRange: [.12, .39], stackRange: [1, 2], criteria: { lateralModeMinimumHz: [.1, .1], verticalModeRangeHz: [.1, 1000], resonanceLimitDb: 30, tones: [] } });
  const candidates = [...screen.recommendations, ...screen.nearMisses];
  assert.ok(candidates.length > 0);
  candidates.forEach(candidate => candidate.analysis.modes.forEach(mode => close(1 / mode.lossFactor, 6)));
  const applied = applySorbothaneCatalogCandidate(config, candidates[0]);
  assert.deepEqual(applied.damping, config.damping);
  const pairedConfig = manual(mixed());
  pairedConfig.component.massKg = 25 * .45359237;
  pairedConfig.mounts.count = 8;
  pairedConfig.assemblies.assignments = Array(8).fill('A');
  const pairs = screenSorbothaneCatalog(pairedConfig, { topGeometry: 'bushing', bottomGeometry: 'washer', odRange: [.99, 1.01], idRange: [.1, .51], thicknessRange: [.189, .191], stackRange: [1, 2], assemblyGroup: 'A', assemblySide: 'both' });
  const pairedCandidates = [...pairs.recommendations, ...pairs.nearMisses];
  assert.ok(pairedCandidates.length > 0);
  pairedCandidates.forEach(candidate => candidate.analysis.modes.forEach(mode => close(1 / mode.lossFactor, 6)));
});

test('loss uncertainty acts around the manual eta and sync/async envelopes agree', async () => {
  const config = manual(fixture());
  Object.assign(config.uncertainty, { enabled: true, samples: 8, modulusPct: 0, lossPct: 0, massPct: 0, cgMm: 0, compressionPct: 0 });
  const nominal = analyzeSorbothaneIsolation(config, { skipUncertainty: true });
  const fixed = uncertaintyEnvelope(config, nominal.directionalResponses);
  for (const axis of ['x', 'y', 'z']) fixed.directionalBands[axis].lowerDb.forEach((value, index) => {
    close(value, nominal.directionalResponses[axis].db[['x', 'y', 'z'].indexOf(axis)][index]);
    close(fixed.directionalBands[axis].upperDb[index], value);
  });
  config.uncertainty.lossPct = 30;
  const varied = uncertaintyEnvelope(config, nominal.directionalResponses);
  assert.ok(varied.lowerDb.some((value, index) => varied.upperDb[index] - value > .01));
  assert.deepEqual(varied.modeRangesHz, fixed.modeRangesHz, 'loss alone cannot change real modes');
  assert.deepEqual(await uncertaintyEnvelopeAsync(config, nominal.directionalResponses, { yieldControl: async () => {} }), varied);
});

test('UI, engineering summary, BDF and standalone expose the same manual damping assumption', () => {
  const config = manual(fixture());
  const analysis = analyzeSorbothaneIsolation(config, { skipUncertainty: true });
  const html = renderSorbothaneIsolationWorkbench(config, {}, {}, analysis);
  assert.match(html, /data-sorbo-field="damping.mode"/);
  assert.match(html, /data-sorbo-field="damping.effectiveQ"[^>]*value="6"/);
  assert.match(html, /Manual Q = 6 active/);
  assert.match(html, /0% loss-factor tolerance/);
  assert.match(engineeringReport(analysis), /Damping basis: Manual Q = 6 active/);
  const bdf = generateNastranIsolationBdf(config, analysis);
  bdf.isolators.supportProperties.forEach(support => support.lossFactors.forEach(loss => close(loss, 1 / 6)));
  assert.ok(bdf.warnings.some(w => /Manual effective Q = 6/.test(w)));
  assert.match(readFileSync(new URL('../standalone.html', import.meta.url), 'utf8'), /data-sorbo-field="damping.mode"|select\(config, 'damping.mode'/);
});
