import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSorbothaneConfig, parseIsolationPsd, validateIsolationPsd, isolationPsdAt, isolationRelativeDisplacement,
  randomVibrationClearance, rigidBodyResponseAtFrequency, solveRigidBodyModes, mountDynamicStiffness, analyzeSorbothaneIsolation, runDesignGrid, screenParkerLordCatalog } from '../js/sorbothane-analysis.js';
import { clearancePanel, clearanceCsv, clearancePsdSvg } from '../js/sorbothane-isolation.js';
import { generateNastranIsolationSol111Bdf, nastranBrowserComparisonCsv } from '../js/nastran-isolation-export.js';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const close = (a, b, tolerance = .005) => assert.ok(Math.abs(a - b) <= tolerance * Math.max(Math.abs(b), 1e-25), `${a} != ${b}`);
const fixture = () => {
  const c = normalizeSorbothaneConfig();
  c.uncertainty.enabled = false;
  c.isolator.kind = 'parker-lord-am'; c.isolator.productNumber = 'AM-006-1';
  c.damping = { mode: 'manual-q', effectiveQ: 6 };
  c.environment.random = { enabled: true, axis: 'z', points: [[5, .01], [1000, .01]], peakFactor: 3, gapsM: [.01, .01, .01], checkClearance: false };
  return c;
};

test('PSD parser validates units structure, ordering, zero levels and log-log interpolation without extrapolation', () => {
  assert.deepEqual(parseIsolationPsd('frequency_hz,g2_per_hz\n10, 1e-3\n100, .1'), [[10,.001],[100,.1]]);
  for (const text of ['10,1\n10,2', '0,1\n10,2', '10,-1\n20,2', '10,NaN\n20,2', '10,1,2\n20,2,3', '10,1']) assert.throws(() => parseIsolationPsd(text));
  assert.throws(() => validateIsolationPsd([[10, .1], [20, Infinity]]));
  close(isolationPsdAt([[10,.001],[100,.1]], Math.sqrt(1000)), .01);
  close(isolationPsdAt([[10,0],[100,1]], 55), .5);
  assert.equal(isolationPsdAt([[10,1],[100,1]], 1), 0);
  assert.equal(isolationPsdAt([[10,1],[100,1]], 101), 0);
});

test('relative displacement uses complex subtraction, g conversion and phase, not magnitude subtraction', () => {
  const c = fixture(), mode = solveRigidBodyModes(c).modes.find(m => m.dominantIndex === 2);
  const response = rigidBodyResponseAtFrequency(c, mode.frequencyHz, 'z');
  const transfer = isolationRelativeDisplacement(c, mode.frequencyHz, 'z')[0][2];
  const baseMPerG = 9.80665 / (2 * Math.PI * mode.frequencyHz) ** 2;
  close(Math.hypot(transfer.re, transfer.im), 6 * baseMPerG, 1e-7);
  close(transfer.im, 6 * baseMPerG, 1e-7);
  assert.ok(Math.abs(Math.hypot(transfer.re, transfer.im) - (response.magnitude[2] - 1) * baseMPerG) > baseMPerG * .5);
});

test('integrated coupled PSD matches an independent fixed-stiffness vertical SDOF quadrature', () => {
  const c = fixture(), r = randomVibrationClearance(c);
  assert.equal(r.valid, true); assert.equal(r.converged, true);
  close(r.inputGrms, Math.sqrt(.01 * 995), 1e-8);
  const k = mountDynamicStiffness(c, 100).kzNPerM * c.mounts.count, m = c.component.massKg, eta = 1/6;
  let integral = 0; const n = 100000, df = 995 / n;
  for (let i = 0; i <= n; i++) {
    const w = 2 * Math.PI * (5 + i * df);
    integral += (i === 0 || i === n ? .5 : 1) * .01 * 9.80665 ** 2 / ((k/m - w*w) ** 2 + (eta*k/m) ** 2) * df;
  }
  close(r.locations[0].rmsM[2], Math.sqrt(integral), .001);
  close(r.locations[0].peakM[2], r.locations[0].rmsM[2] * 3, 1e-12);
  assert.equal(r.locations.length, 17);
  assert.ok(r.locations[0].rmsM[0] < 1e-12);
  const stronger = structuredClone(c); stronger.environment.random.points.forEach(point => point[1] *= 4);
  close(randomVibrationClearance(stronger).locations[0].rmsM[2], r.locations[0].rmsM[2] * 2, 1e-8);
});

test('all corners/mounts include rocking, independent of the transmissibility display point and grid', () => {
  const c = fixture(); c.environment.random.axis = 'x';
  const r = randomVibrationClearance(c);
  assert.ok(r.locations.some(location => location.rmsM[2] > 1e-6));
  c.analysis.responsePoint = 'corner-negative'; c.analysis.frequencyPoints = 41; c.analysis.frequencyMinHz = 400;
  assert.deepEqual(randomVibrationClearance(c), r);
  for (const axis of ['y', 'z']) { c.environment.random.axis = axis; assert.equal(randomVibrationClearance(c).converged, true); }
});

test('opposed stack travel is equal and identical series elements divide it, including mixed assemblies', () => {
  const c = fixture(); c.isolator.kind = 'sorbothane-element'; c.isolator.productNumber = 'custom-ring';
  c.mounts.stackTop = 2; c.mounts.stackBottom = 3;
  const check = result => {
    assert.equal(result.valid, true, result.error);
    for (const mount of result.locations.filter(location => location.sides)) {
      const [top, bottom] = mount.sides;
      close(top.stackPeakM[2], bottom.stackPeakM[2], 1e-12);
      close(top.perElementPeakM[2] * top.count, mount.peakM[2], 1e-12);
      close(bottom.perElementPeakM[2] * bottom.count, mount.peakM[2], 1e-12);
      assert.ok(top.maximumPct >= top.minimumPct);
    }
  };
  check(randomVibrationClearance(c));
  c.assemblies.enabled = true;
  c.assemblies.groups.A.topCount = 2; c.assemblies.groups.A.bottomCount = 3;
  check(randomVibrationClearance(c));
  c.mounts.count = 4;
  Object.assign(c.assemblies.groups.A, { topProductNumber:'0510005-70-10', bottomProductNumber:'0510001-70-10', topCount:1, bottomCount:1 });
  const bushWasher = randomVibrationClearance(c);
  check(bushWasher);
  assert.equal(bushWasher.locations.length, 13);
  assert.notEqual(bushWasher.locations.find(location => location.sides).sides[0].staticPct, bushWasher.locations.find(location => location.sides).sides[1].staticPct);
});

test('invalid/disabled environments cannot silently pass an enabled shared clearance criterion', () => {
  const c = fixture();
  c.environment.random.gapsM = [1e-9, 1e-9, 1e-9]; c.environment.random.checkClearance = true;
  const a = analyzeSorbothaneIsolation(c, { skipResponse:true, skipUncertainty:true });
  assert.equal(a.clearance.pass, false); assert.equal(a.passes, false);
  const grid = runDesignGrid(c, { xVariable:'mass', yVariable:'cgHeight', xRange:[20,21], yRange:[4,5], gridSize:3 });
  assert.equal(grid.cells.flat().filter(cell => cell.analysis).length, 9);
  grid.cells.flat().filter(cell => cell.analysis).forEach(cell => assert.ok(cell.checks.some(check => check.code === 'TRAVEL' && !check.pass)));
  const screen = screenParkerLordCatalog(c, { family:'AM-006', mountsPerPointRange:[1,1], criteria: { lateralModeMinimumHz:[.1,.1], verticalModeRangeHz:[.1,1000], resonanceLimitDb:80, tones:[] } });
  assert.equal(screen.recommendations.length, 0);
  assert.ok(screen.nearMisses.length > 0);
  screen.nearMisses.forEach(candidate => { assert.equal(candidate.config.environment.random.checkClearance, true); assert.equal(candidate.analysis.clearance.pass, false); });
  c.environment.random.enabled = false;
  assert.equal(analyzeSorbothaneIsolation(c, {skipResponse:true}).passes, false);
  c.environment.random.enabled = true;
  for (const change of [{axis:'xyz'}, {peakFactor:0}, {gapsM:[-1,0,0]}, {points:[[10,1],[5,1]]}, {gapsM:[0,0,0]}]) {
    const config = structuredClone(c); Object.assign(config.environment.random, change);
    assert.equal(randomVibrationClearance(config).valid, false);
  }
});

test('environment saves round-trip; panel/CSV use physical units and statistical labels; zero PSD plots remain finite', () => {
  const c = fixture();
  assert.deepEqual(normalizeSorbothaneConfig(JSON.parse(JSON.stringify(c))), c);
  assert.equal(normalizeSorbothaneConfig({environment:{accelerationG:[1,2,3]}}).environment.random.enabled, false);
  const analysis = analyzeSorbothaneIsolation(c, {skipUncertainty:true});
  assert.match(clearancePanel(analysis), /Not a guaranteed maximum/);
  assert.match(clearancePanel(analysis), /Remaining gap/);
  assert.match(clearanceCsv(analysis), /displacement_psd_in2_per_hz/);
  c.environment.random.points = [[5,0],[1000,0]];
  const zero = randomVibrationClearance(c);
  assert.equal(zero.inputGrms, 0); assert.equal(zero.locations[0].rmsM[2], 0);
  assert.doesNotMatch(clearancePsdSvg(zero), /NaN|Infinity/);
});

test('PSD SOL 111 deck parses fully; corner and mount displacement outputs round-trip through a synthetic complex OP2 and CLI', () => {
  const c = fixture(); c.analysis.responsePoint = 'corner-positive';
  const model = generateNastranIsolationSol111Bdf(c);
  const csv = nastranBrowserComparisonCsv(c, model);
  const result = spawnSync(process.env.NASTRAN_TEST_PYTHON || 'python3', [fileURLToPath(new URL('./nastran-clearance-check.py', import.meta.url))], {
    input: JSON.stringify({ model, csv }), encoding:'utf8', maxBuffer: 4 * 1024 * 1024
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Synthetic clearance OP2 checks passed/);
});
