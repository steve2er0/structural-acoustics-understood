import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { loadSorbothaneConfiguration } from '../js/sorbothane-configurations.js';
import { isolationMountStiffnesses, rigidBodyResponseAtFrequency, SORBOTHANE_UNITS } from '../js/sorbothane-analysis.js';
import { generateNastranIsolationBdf, generateNastranIsolationSol111Bdf, nastranBrowserComparisonCsv, NASTRAN_IPS_UNITS } from '../js/nastran-isolation-export.js';

const close = (actual, expected, tolerance = 2e-7) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const variants = () => {
  const baseline = loadSorbothaneConfiguration('baseline');
  const shaker = loadSorbothaneConfiguration('shaker-test');
  const signed = structuredClone(baseline);
  Object.assign(signed.component, { inertiaMode: 'manual', inertiaKgM2: [.1, .2, .3, -.001, .002, -.003] });
  signed.mounts.rowAxis = 'x';
  signed.analysis.responsePoint = 'corner-positive';
  signed.damping = { mode: 'manual-q', effectiveQ: 6 };
  signed.validation.nastran.coupling = 'rbe2';
  signed.validation.nastran.plateMaterial = 'steel';
  signed.validation.nastran.massAccounting = 'preserve-browser';
  const mixed = structuredClone(baseline);
  mixed.assemblies.enabled = true;
  mixed.assemblies.assignments = ['A','B','B','A','A','B','B','A'];
  for (const group of Object.values(mixed.assemblies.groups)) Object.assign(group, {
    topProductNumber:'0510005-70-10', bottomProductNumber:'0510001-70-10',
    topCount:1, bottomCount:1, compressionPct:15,
    boltDiameterM:.25*.0254, holeDiameterM:.47*.0254, gripThicknessM:.12*.0254
  });
  Object.assign(mixed.assemblies.groups.B, {topProductNumber:'0510825-50-10', bottomProductNumber:'0510825-50-10', topCount:2});
  mixed.analysis.responsePoint = 'corner-negative';
  const mixedQ = structuredClone(mixed);
  mixedQ.damping = { mode:'manual-q', effectiveQ:6 };
  const water = structuredClone(baseline);
  water.isolator.formulation = 'water-resistant';
  const lord = structuredClone(shaker);
  Object.assign(lord.isolator, {kind:'parker-lord-am', productNumber:'AM-001-2', mountsPerPoint:2});
  const stacked = structuredClone(shaker);
  Object.assign(stacked.mounts, {stackTop:2, stackBottom:3, rowAxis:'y'});
  Object.assign(stacked.isolator, {preloadMode:'preload', preloadN:15*SORBOTHANE_UNITS.LBF});
  stacked.component.cgM[0] = .1*SORBOTHANE_UNITS.INCH;
  stacked.component.cgM[1] = -.08*SORBOTHANE_UNITS.INCH;
  const fine = structuredClone(baseline);
  fine.validation.nastran.meshX = fine.validation.nastran.meshY = 40;
  return {baseline, shaker, signed, mixed, mixedQ, water, lord, stacked, fine};
};

test('complete SOL 103 and SOL 111 decks parse, validate and cross-reference across all supported hardware/configuration paths', () => {
  const fixtures = Object.entries(variants()).flatMap(([name, config]) => [103, 111].map(solution => {
    config.analysis.frequencyPoints = 41;
    const model = solution === 111 ? generateNastranIsolationSol111Bdf(config) : generateNastranIsolationBdf(config);
    return { name:`${name}-${solution}`, config, model, deck:model.deck, responseGrid:model.response?.responseGridId,
      groundGrids:model.isolators.groundGridIds, g0:NASTRAN_IPS_UNITS.gravityInPerSec2 };
  }));
  const result = spawnSync(process.env.NASTRAN_TEST_PYTHON || 'python3', [fileURLToPath(new URL('./nastran-parser-check.py', import.meta.url))], {
    input:JSON.stringify(fixtures), encoding:'utf8', maxBuffer:20*1024*1024
  });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.length, 18);
  parsed.forEach((actual, index) => {
    const {config, model} = fixtures[index];
    assert.equal(actual.solution, model.solution);
    assert.equal(actual.cbush, config.mounts.count);
    assert.equal(actual.cquad4, model.counts.cquad4);
    assert.equal(actual.grids, model.counts.grids);
    assert.equal(actual.pbush, model.counts.pbush);
    close(actual.mass, model.box.massSlinch);
    const inertia = model.box.inertiaSlinchIn2;
    [inertia[0],inertia[3],inertia[1],inertia[4],inertia[5],inertia[2]].forEach((value, i) => close(actual.inertia[i], value));
    for (const property of model.isolators.supportProperties) property.lossFactors.forEach((value, axis) => close(actual.loss[property.id][axis], value));
    if (model.solution !== 111) return;
    assert.deepEqual(actual.subcases, [1,2,3]);
    assert.equal(actual.modeCount, null, 'SOL 111 must not inherit a 20-mode truncation cap');
    close(actual.cutoff, Math.max(model.settings.maximumFrequencyHz, 2*config.analysis.frequencyMaxHz));
    actual.frequencies.forEach((value, i) => close(value, model.response.frequencies[i]));
    assert.equal(model.response.frequencies[0], config.analysis.frequencyMinHz);
    assert.equal(model.response.frequencies.at(-1), config.analysis.frequencyMaxHz);
    for (const sample of actual.rigidSurrogate) for (const [axis, axisIndex] of [['x',0],['y',1],['z',2]]) {
      const expected = rigidBodyResponseAtFrequency(config, sample.frequency, axis).complex[axisIndex];
      close(sample.diagonal[axisIndex][0], expected.re, 2e-5);
      close(sample.diagonal[axisIndex][1], expected.im, 2e-5);
    }
    const sign = config.analysis.responsePoint === 'corner-negative' ? -1 : 1;
    const point = config.analysis.responsePoint === 'cg' ? config.component.cgM : [sign*config.component.dimensionsM[0]/2,sign*config.component.dimensionsM[1]/2,config.component.dimensionsM[2]];
    point.forEach((value, i) => close(actual.point[i], value/SORBOTHANE_UNITS.INCH));
    for (let sample = 0; sample < actual.frequencies.length; sample += 7) {
      const mounts = isolationMountStiffnesses(config, model.response.frequencies[sample]);
      for (const [pid, tables] of Object.entries(actual.tables)) {
        const supportIndex = model.isolators.supportProperties.findIndex(property => String(property.id) === pid);
        const mount = mounts[supportIndex];
        [mount.kxNPerM,mount.kyNPerM,mount.kzNPerM].forEach((rate, axis) => {
          close(tables.rates[axis][sample], rate*SORBOTHANE_UNITS.INCH/SORBOTHANE_UNITS.LBF);
          close(tables.loss[axis][sample], mount.lossNPerM ? mount.lossNPerM[axis]/rate : mount.material.tanDelta);
          if (config.damping.mode === 'manual-q') close(tables.loss[axis][sample], 1/6);
        });
      }
    }
  });
});

test('SOL 111 reference CSV uses matching frequencies, selected response location and complex diagonal acceleration ratios', () => {
  const config = variants().signed;
  const model = generateNastranIsolationSol111Bdf(config);
  const csv = nastranBrowserComparisonCsv(config, model);
  const [metadataLine, headerLine, ...rows] = csv.trim().split('\n');
  const metadata = JSON.parse(metadataLine.slice(2));
  assert.equal(metadata.responseGrid,9002);
  assert.equal(metadata.source,'browser rigid-body prediction, not NASTRAN results');
  const headers=headerLine.split(',');
  assert.equal(rows.length,model.response.frequencies.length);
  for (const index of [0,30,rows.length-1]) {
    const values=rows[index].split(',').map(Number);
    const frequency=values[0];
    for (const [axisIndex,axis] of ['x','y','z'].entries()) {
      const response=rigidBodyResponseAtFrequency(config,frequency,axis);
      close(values[headers.indexOf(`T${axis}${axis}_real`)],response.complex[axisIndex].re);
      close(values[headers.indexOf(`T${axis}${axis}_imag`)],response.complex[axisIndex].im);
    }
  }
  assert.match(model.deck,/RESVEC = YES/);
  assert.match(model.deck,/ACCELERATION\(SORT1,REAL,PRINT,PLOT,PUNCH\)/);
  assert.doesNotMatch(model.deck,/TABDMP1|SDAMPING/,'manual element loss must not be counted again as modal damping');
});

test('SOL 111 rejects invalid frequency ranges and standalone includes both exports', () => {
  const config=loadSorbothaneConfiguration('baseline');
  config.analysis.frequencyMinHz=0;
  assert.throws(()=>generateNastranIsolationSol111Bdf(config),/positive frequency minimum/);
  const standalone=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
  for (const marker of ['generateNastranIsolationSol111Bdf','nastranBrowserComparisonCsv','export-nastran-sol111','PBUSHT']) assert.ok(standalone.includes(marker),marker);
});

test('OP2 curve conversion is unit/phase invariant and rejects zero or missing base response', () => {
  const result=spawnSync(process.env.NASTRAN_TEST_PYTHON || 'python3',[fileURLToPath(new URL('./nastran-transmissibility-check.py',import.meta.url))],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});
