import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeSorbothaneIsolation, uncertaintyEnvelope, uncertaintyEnvelopeAsync } from '../js/sorbothane-analysis.js';
import { loadSorbothaneConfiguration } from '../js/sorbothane-configurations.js';
import { renderSorbothaneIsolationWorkbench } from '../js/sorbothane-isolation.js';

const source = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('cooperative uncertainty preserves every seeded X/Y/Z band and tone percentile', async () => {
  const config = loadSorbothaneConfiguration('shaker-test');
  config.uncertainty.samples = 8;
  config.analysis.frequencyPoints = 40;
  const snapshot = structuredClone(config);
  const nominal = analyzeSorbothaneIsolation(config, { skipUncertainty: true });
  const expected = uncertaintyEnvelope(config, nominal.directionalResponses);
  const progress = [];
  let yields = 0;
  const actual = await uncertaintyEnvelopeAsync(config, nominal.directionalResponses, {
    yieldControl: async () => { yields += 1; },
    onProgress: event => progress.push(event)
  });
  assert.deepEqual(actual, expected);
  assert.deepEqual(config, snapshot, 'neither path mutates the saved design');
  assert.equal(yields, 9, 'yield before every draw and before the percentile reduction');
  assert.deepEqual(progress.map(item => item.completed), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(progress.every(item => item.total === 8));
  for (const axis of ['x', 'y', 'z']) assert.equal(actual.directionalBands[axis].lowerDb.length, nominal.directionalResponses[axis].frequencies.length);
});

test('uncertainty cancellation stops before another draw and disabled envelopes stay disabled', async () => {
  const config = loadSorbothaneConfiguration('shaker-test');
  config.analysis.frequencyPoints = 40;
  let completed = 0;
  const cancelled = await uncertaintyEnvelopeAsync(config, null, {
    yieldControl: async () => {},
    isCancelled: () => completed === 2,
    onProgress: event => { completed = event.completed; }
  });
  assert.equal(cancelled, null);
  assert.equal(completed, 2);
  config.uncertainty.enabled = false;
  assert.equal(await uncertaintyEnvelopeAsync(config, null, { yieldControl: async () => {} }), null);
});

test('designer has one requirements editor and preserves named configurations and exports', () => {
  const config = loadSorbothaneConfiguration('shaker-test');
  const html = renderSorbothaneIsolationWorkbench(config, {}, {}, analyzeSorbothaneIsolation(config, { skipUncertainty: true }));
  assert.equal((html.match(/class="sorbo-catalog-criteria"/g) ?? []).length, 1);
  assert.equal((html.match(/data-catalog-criterion="resonanceMaximumDb"/g) ?? []).length, 1);
  assert.match(html, /data-sorbo-requirements/);
  assert.match(html, /Inputs save automatically/);
  assert.match(html, /Uncertainty bands are updating/);
  assert.match(html, /aria-controls="sorbo-panel-modes" aria-selected="false" tabindex="-1"/);
  for (const name of ['baseline', 'shaker-test']) assert.ok(html.includes(`value="${name}"`));
  for (const action of ['export-json', 'export-csv', 'export-report', 'export-nastran-bdf']) assert.ok(html.includes(`data-sorbo-action="${action}"`));
  assert.doesNotMatch(html, /Add to project|add-project/);
  const ui = source('js/sorbothane-isolation.js');
  assert.match(ui, /ArrowLeft.*ArrowRight.*Home.*End/);
  assert.match(ui, /token !== uncertaintyRunToken \|\| analysis !== currentAnalysis/);
  assert.match(ui, /shell\.querySelector\('\.sorbo-catalog-criteria'\)\.outerHTML = catalogCriteriaControls/);
});

test('website project entry points are retired without purging browser records or tool-local study state', () => {
  const app = source('js/app.js');
  const runtime = source('js/workbench-runtime.js');
  for (const file of ['js/app.js', 'js/workbench-runtime.js', 'js/sorbothane-isolation.js']) {
    assert.doesNotMatch(source(file), /Add to project|Add case to project|sau:add-artifact|href="#\/workspace"/);
  }
  assert.match(app, /if\(first==='workspace'\)return '\/tools'/);
  assert.doesNotMatch(app, /loadEngineeringProject|handoffInputs|removeItem|localStorage\.clear/);
  assert.match(runtime, />Study name<\/span>/);
  assert.match(runtime, /data-wb-action="baseline"/);
  assert.match(runtime, /data-wb-action="import"/);
  assert.match(runtime, /data-wb-action="export"/);
  assert.match(source('js/engineering-system.js'), /sau-engineering-project/);
});

test('theme tokens retain readable text, status and trace contrast and print all connected panels', () => {
  const css = source('styles.css');
  const luminance = hex => {
    let text = hex.replace('#', '');
    if (text.length === 3) text = [...text].map(value => value + value).join('');
    return [0, 2, 4].map(offset => parseInt(text.slice(offset, offset + 2), 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  };
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  for (const selector of ['html[data-theme]', 'html[data-theme="light"]']) {
    const block = css.split(`\n${selector} .sorbo-workbench {`)[1]?.split('}')[0];
    assert.ok(block, selector);
    const tokens = Object.fromEntries([...block.matchAll(/--sorbo-([\w-]+):\s*(#[\da-f]+);/g)].map(match => [match[1], match[2]]));
    for (const surface of ['surface', 'inset']) {
      for (const role of ['text', 'muted', 'cyan', 'teal', 'red', 'amber']) {
        assert.ok(contrast(tokens[role], tokens[surface]) >= 4.5, `${selector} ${role} on ${surface}`);
      }
      for (const axis of ['axis-x', 'axis-y', 'axis-z']) assert.ok(contrast(tokens[axis], tokens[surface]) >= 3, `${selector} ${axis}`);
    }
  }
  assert.match(css, /\.sorbo-workbench \.sorbo-tab-panel\[hidden\] \{ display: grid !important; \}/);
});
