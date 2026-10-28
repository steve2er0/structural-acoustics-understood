import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SORBOTHANE_SAVED_CONFIGURATIONS, loadSorbothaneConfiguration, matchingSorbothaneConfiguration } from '../js/sorbothane-configurations.js';
import { DEFAULT_SORBOTHANE_CONFIG, SORBOTHANE_UNITS, normalizeSorbothaneConfig, analyzeSorbothaneIsolation } from '../js/sorbothane-analysis.js';
import { renderSorbothaneIsolationWorkbench } from '../js/sorbothane-isolation.js';

const exported = JSON.parse(readFileSync(new URL('../docs/sorbothane-isolation/configurations/shaker-test.json', import.meta.url), 'utf8'));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const migratedExport = () => ({ ...exported, damping: { mode: 'material', effectiveQ: 6 }, environment: { ...exported.environment, random: structuredClone(DEFAULT_SORBOTHANE_CONFIG.environment.random) } });

test('shaker test exactly retains every field of the owner-provided configuration export', () => {
  const config = loadSorbothaneConfiguration('shaker-test');
  assert.deepEqual(config, migratedExport(), 'all owner-provided fields are retained; optional Q and PSD features default off');
  assert.equal(matchingSorbothaneConfiguration(config)?.name, 'shaker test');
  const { LB, INCH } = SORBOTHANE_UNITS;
  close(config.component.massKg / LB, 12);
  config.component.dimensionsM.forEach((value, i) => close(value / INCH, [3.5, 3.5, 4][i]));
  close(config.component.cgM[2] / INCH, 2);
  config.mounts.spacingM.forEach(value => close(value / INCH, 2));
  assert.equal(config.mounts.count, 4);
  assert.equal(config.isolator.productNumber, '0510012-70-10');
  assert.deepEqual(config.analysis.tones, [{ frequencyHz: 1200, maximumDb: -20 }]);
  assert.deepEqual(config.uncertainty, exported.uncertainty);
  assert.deepEqual(config.validation, exported.validation);
});

test('named configurations are independent copies and never overwrite the separate baseline', () => {
  const baselineBefore = JSON.stringify(DEFAULT_SORBOTHANE_CONFIG);
  const shaker = loadSorbothaneConfiguration('shaker-test');
  shaker.component.massKg = 999;
  shaker.analysis.tones[0].maximumDb = 500;
  shaker.uncertainty.seed = 1;
  shaker.assemblies.assignments[0] = 'B';
  assert.equal(matchingSorbothaneConfiguration(shaker), null);
  assert.deepEqual(loadSorbothaneConfiguration('shaker-test'), migratedExport());
  assert.deepEqual(loadSorbothaneConfiguration('baseline'), normalizeSorbothaneConfig(DEFAULT_SORBOTHANE_CONFIG));
  assert.equal(loadSorbothaneConfiguration('baseline').mounts.count, 8);
  assert.equal(matchingSorbothaneConfiguration(loadSorbothaneConfiguration('baseline'))?.id, 'baseline');
  assert.equal(JSON.stringify(DEFAULT_SORBOTHANE_CONFIG), baselineBefore);
  assert.throws(() => loadSorbothaneConfiguration('not-a-configuration'), /Unknown saved isolation configuration/);
});

test('saved shaker test reproduces the exported design mechanics and all-direction criteria', () => {
  const expected = analyzeSorbothaneIsolation(exported, { skipResponse: true, skipUncertainty: true });
  const actual = analyzeSorbothaneIsolation(loadSorbothaneConfiguration('shaker-test'), { skipResponse: true, skipUncertainty: true });
  for (const key of ['modes', 'preload', 'toneResults', 'peakResults', 'lateralModeResults', 'verticalModeResult', 'passes']) assert.deepEqual(actual[key], expected[key]);
  assert.equal(actual.preload.mounts.length, 4);
  assert.equal(actual.toneResults[0].axisResults.length, 3);
});

test('workbench lists both named configurations and distinguishes changed current settings', () => {
  assert.deepEqual(SORBOTHANE_SAVED_CONFIGURATIONS.map(item => item.name), ['Baseline', 'shaker test']);
  for (const id of ['baseline', 'shaker-test']) {
    const config = loadSorbothaneConfiguration(id);
    const analysis = analyzeSorbothaneIsolation(config, { skipUncertainty: true });
    const html = renderSorbothaneIsolationWorkbench(config, {}, {}, analysis);
    assert.match(html, /aria-label="Saved configuration"/);
    assert.match(html, /data-sorbo-action="load-configuration"/);
    assert.match(html, new RegExp(`<option value="${id}" selected>`));
    assert.match(html, /Loading replaces all design inputs, requirements, uncertainty and validation settings/);
    assert.match(html, /Reset baseline always restores the separate eight-leg baseline/);
    assert.doesNotMatch(html, /data-sorbo-action="load-configuration" disabled/);
  }
  const edited = loadSorbothaneConfiguration('shaker-test');
  edited.component.massKg *= 1.1;
  const html = renderSorbothaneIsolationWorkbench(edited, {}, {}, analyzeSorbothaneIsolation(edited, { skipUncertainty: true }));
  assert.match(html, /<option value="" disabled selected>Current design · modified settings/);
  assert.match(html, /Current inputs differ from the saved configurations/);
  assert.match(html, /data-sorbo-action="load-configuration" disabled/);
});

test('standalone embeds named configurations without runtime fetches and offline cache includes their module', () => {
  const standalone = readFileSync(new URL('../standalone.html', import.meta.url), 'utf8');
  const worker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../js/sorbothane-configurations.js', import.meta.url), 'utf8');
  assert.match(standalone, /const __sorbothaneConfigurations=/);
  assert.match(standalone, /name: 'shaker test'/);
  assert.match(standalone, /data-sorbo-saved-configuration/);
  assert.ok(worker.includes('./js/sorbothane-configurations.js'));
  assert.doesNotMatch(source, /fetch\(|localStorage|document\./);
});
