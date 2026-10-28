import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeSorbothaneConfig, randomVibrationClearance, randomVibrationDirectionalSummary, analyzeSorbothaneIsolation} from '../js/sorbothane-analysis.js';
import {directionalPadCompressionPanel, padCompressionCsv, clearancePanel} from '../js/sorbothane-isolation.js';

const I = .0254;
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a-b) < tolerance * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const scenario = () => {
  const c = normalizeSorbothaneConfig();
  Object.assign(c.isolator, {productNumber:'0510012-70-10',geometry:'washer',odM:I,idM:.45*I,thicknessM:.125*I,durometer:70,compressionPct:15});
  c.uncertainty.enabled = false;
  c.environment.random = {enabled:true,axis:'y',points:[[10,.01],[20,.02],[40,.02],[70,.2],[90,.2],[200,.01],[2000,.01]],peakFactor:3,gapsM:[.018*I,.018*I,.1*I],checkClearance:false};
  return c;
};

test('all three compression cases match independent selected-axis solves without mutating settings or retaining extra spectra', () => {
  const c = scenario(), original = structuredClone(c), selected = randomVibrationClearance(c);
  const summary = randomVibrationDirectionalSummary(c, selected);
  assert.deepEqual(c, original); assert.equal(summary.selectedAxis, 'y');
  assert.deepEqual(summary.cases.map(result => result.axis), ['x','y','z']);
  for (const [i, result] of summary.cases.entries()) {
    const comparison = result.axis === 'y' ? selected : randomVibrationClearance({...c, environment:{...c.environment,random:{...c.environment.random,axis:result.axis}}});
    const sides = comparison.locations.flatMap(location => location.sides ?? []);
    close(result.maximumPct, Math.max(...sides.map(side => side.maximumPct)));
    close(result.minimumPct, Math.min(...sides.map(side => side.minimumPct)));
    assert.equal(result.pads.length,16); assert.equal(result.converged,true);
    assert.equal(result.pads.filter(pad => pad.side === 'top').length,8);
    close(result.maximumPct,[17.764,22.52,18.013][i],.0001);
    assert.equal(result.compressionPass,[true,false,true][i]);
    assert.equal(result.boxClearancePass,[false,false,true][i]);
    assert.equal(result.displacementPsdM2PerHz, undefined);
    assert.ok(result.criticalPad.leg>=1 && result.criticalPad.leg<=8);
  }
  assert.equal(summary.allCompressionPass,false); assert.equal(summary.allBoxClearancePass,false);
});

test('comparison respects active Q and marks predicted unloading, independent of the saved inactive Q value', () => {
  const c = scenario(); c.environment.random.points = [[20,.1],[2000,.1]];
  const material = randomVibrationDirectionalSummary(c);
  c.damping = {mode:'manual-q',effectiveQ:6};
  const manual = randomVibrationDirectionalSummary(c);
  assert.ok(manual.cases[1].maximumPct > material.cases[1].maximumPct);
  assert.equal(manual.cases[1].unloading,true);
  assert.equal(manual.cases[1].compressionPass,false);
  assert.equal(c.environment.random.axis,'y');
});

test('four-leg mixed assemblies retain per-side counts, static strains and per-element travel for every input', () => {
  const c = scenario(); c.mounts.count=4; c.assemblies.enabled=true;
  c.assemblies.groups.A.topCount=2; c.assemblies.groups.A.bottomCount=3;
  c.environment.random.points = [[20,.001],[500,.001]];
  const summary = randomVibrationDirectionalSummary(c);
  for (const result of summary.cases) {
    assert.equal(result.pads.length,8);
    for (const pad of result.pads) {
      assert.equal(pad.count,pad.side==='top'?2:3);
      close(pad.axialPeakM / pad.count,pad.perElementAxialPeakM);
      close((pad.minimumPct+pad.maximumPct)/2,pad.staticPct);
    }
  }
});

test('disabled, invalid, zero-input, nonconverged and unavailable-LORD cases cannot generate misleading comparison passes', () => {
  const c = scenario(); c.environment.random.enabled=false;
  assert.equal(randomVibrationDirectionalSummary(c),null);
  c.environment.random.enabled=true; c.environment.random.points=[[20,.01],[10,.01]];
  const invalid = randomVibrationDirectionalSummary(c);
  assert.ok(invalid.cases.every(result => !result.valid));
  assert.equal(invalid.allCompressionPass,false);
  c.environment.random.points=[[20,0],[500,0]]; c.environment.random.gapsM=[0,0,0];
  const zero = randomVibrationDirectionalSummary(c);
  assert.equal(zero.allCompressionPass,true);
  assert.ok(zero.cases.every(result => result.boxClearancePass===null));
  assert.ok(zero.cases.every(result => result.pads.every(pad => pad.minimumPct===pad.staticPct && pad.maximumPct===pad.staticPct)));
  const unconverged = randomVibrationDirectionalSummary(c,{...randomVibrationClearance(c),converged:false});
  assert.equal(unconverged.cases[1].compressionPass,false);
  c.isolator.kind='parker-lord-am'; c.isolator.productNumber='AM-006-1';
  const lord = randomVibrationDirectionalSummary(c);
  assert.ok(lord.cases.every(result => result.pads.length===0 && result.compressionPass===null));
  assert.equal(lord.allCompressionPass,false);
  assert.match(directionalPadCompressionPanel({config:c,directionalClearance:lord}),/Bonded LORD/);
  assert.throws(()=>padCompressionCsv({config:c,directionalClearance:lord}),/No pad compression data/);
});

test('display and CSV separate compression from box gaps and include every pad across X/Y/Z with active damping metadata', () => {
  const c = scenario(); const analysis=analyzeSorbothaneIsolation(c,{skipUncertainty:true});
  const html=clearancePanel(analysis);
  assert.match(html,/Pad compression · X \/ Y \/ Z inputs/);
  assert.match(html,/Upper pads min–max/); assert.match(html,/Lower pads min–max/);
  assert.match(html,/Compression only/); assert.match(html,/Box clearance/);
  assert.match(html,/Material-derived damping active/);
  assert.match(html,/not simultaneously/); assert.match(html,/only the selected|Only the selected/);
  assert.equal((html.match(/data-sorbo-compression-case=/g)||[]).length,3);
  assert.match(html,/data-sorbo-compression-details/);
  const csv=padCompressionCsv(analysis),lines=csv.trim().split('\n'),metadata=JSON.parse(lines[0].slice(2));
  assert.equal(metadata.damping.mode,'material'); assert.equal(metadata.selectedAxis,'y');
  assert.equal(lines.length,50); // metadata + header + 3 * 8 legs * 2 sides
  assert.match(lines[1],/minimum_compression_pct,maximum_compression_pct/);
  for(const axis of['X','Y','Z'])assert.equal(lines.slice(2).filter(line=>line.startsWith(axis+',')).length,16);
  assert.ok(lines.slice(2).some(line=>line.startsWith('Y,')&&line.includes('REVIEW')));
  // A single-axis catalog check remains unchanged; comparison is display-only.
  const screening=analyzeSorbothaneIsolation(c,{skipResponse:true,skipUncertainty:true});
  assert.equal(screening.directionalClearance,null);
});

test('standalone embeds the comparison solver, per-pad table and download handler', () => {
  const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
  assert.match(html,/randomVibrationDirectionalSummary/);
  assert.match(html,/data-sorbo-compression-comparison/);
  assert.match(html,/data-sorbo-compression-case/);
  assert.match(html,/isolation-pad-compression-xyz.csv/);
});
