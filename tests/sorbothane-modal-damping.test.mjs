import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeSorbothaneIsolation } from '../js/sorbothane-analysis.js';
import { loadSorbothaneConfiguration } from '../js/sorbothane-configurations.js';
import { renderSorbothaneIsolationWorkbench } from '../js/sorbothane-isolation.js';

const fixture = () => {
  const config = loadSorbothaneConfiguration('shaker-test');
  config.uncertainty.enabled = false;
  config.analysis.frequencyPoints = 40;
  return config;
};
const cards = html => [...html.matchAll(/<button\b[^>]*class="sorbo-mode-card\b[^>]*>[\s\S]*?<\/button>/g)].map(match => match[0]);
const metric = (card, key) => card.match(new RegExp(`data-mode-metric="${key}">([^<]+)</span>`))?.[1];
const formatted = (value, digits) => Number(value.toFixed(digits)).toString();

for (const library of ['uniform Sorbothane', 'mixed bushing/washer assemblies', 'Parker LORD']) {
  test(`all six mode cards report their own damping values for ${library}`, () => {
    const config = fixture();
    if (library === 'mixed bushing/washer assemblies') {
      config.assemblies.enabled = true;
      config.assemblies.assignments = ['A', 'A', 'B', 'B'];
      for (const group of Object.values(config.assemblies.groups)) Object.assign(group, {
        topProductNumber: '0510005-70-10', bottomProductNumber: '0510001-70-10',
        topCount: 1, bottomCount: 1, compressionPct: 15,
        boltDiameterM: .25 * .0254, holeDiameterM: .47 * .0254, gripThicknessM: .12 * .0254
      });
      config.assemblies.groups.B.bottomProductNumber = '0510001-30-10';
    } else if (library === 'Parker LORD') {
      Object.assign(config.isolator, { kind: 'parker-lord-am', productNumber: 'AM-006-1', lordLossFactor: .2, mountsPerPoint: 1 });
    }
    const analysis = analyzeSorbothaneIsolation(config, { skipUncertainty: true });
    const snapshot = structuredClone(analysis.modes);
    const html = renderSorbothaneIsolationWorkbench(config, {}, {}, analysis);
    const rendered = cards(html);
    assert.equal(rendered.length, 6);
    analysis.modes.forEach((mode, index) => {
      assert.ok(mode.lossFactor > 0 && Number.isFinite(mode.lossFactor));
      assert.equal(metric(rendered[index], 'effective-q'), formatted(1 / mode.lossFactor, 2));
      assert.equal(metric(rendered[index], 'loss-factor'), formatted(mode.lossFactor, 3));
      assert.equal(metric(rendered[index], 'critical-damping'), formatted(mode.dampingRatio * 100, 1) + '%');
      assert.ok(rendered[index].includes(`data-sorbo-mode="${index}"`), 'mode selection target is retained');
      assert.match(rendered[index], /Critical damping \(eq\.\)/);
    });
    assert.deepEqual(analysis.modes, snapshot, 'displaying damping must not mutate solver results');
    assert.match(html, /not the plotted peak transmissibility or measured ringdown damping/);
  });
}

test('mode damping readouts handle zero, invalid and very small damping without misleading rounding', () => {
  const config = fixture();
  const analysis = analyzeSorbothaneIsolation(config, { skipUncertainty: true });
  const values = [[0, 0], [NaN, NaN], [-.1, -.05], [1e-8, 5e-9], [.4, .2], [1, .5]];
  analysis.modes = analysis.modes.map((mode, index) => ({ ...mode, lossFactor: values[index][0], dampingRatio: values[index][1] }));
  const rendered = cards(renderSorbothaneIsolationWorkbench(config, {}, {}, analysis));
  const actual = rendered.map(card => ['effective-q', 'loss-factor', 'critical-damping'].map(key => metric(card, key)));
  assert.deepEqual(actual, [
    ['∞', '0', '0%'], ['—', '—', '—'], ['—', '—', '—'],
    ['1.00e+8', '1.00e-8', '5.00e-7%'], ['2.5', '0.4', '20%'], ['1', '1', '50%']
  ]);
  assert.ok(rendered.every(card => !/NaN|Infinity/.test(card)));
});

test('standalone includes the modal damping readouts, theme styles and equivalent-value explanation', () => {
  const standalone = readFileSync(new URL('../standalone.html', import.meta.url), 'utf8');
  for (const label of ['Effective Q', 'Loss factor η', 'Critical damping (eq.)', 'sorbo-mode-damping-value', 'not the plotted peak transmissibility']) assert.ok(standalone.includes(label), label);
  const worker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.match(worker, /sau-v161-directional-pad-compression/);
});
