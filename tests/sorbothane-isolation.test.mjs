import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SORBOTHANE_CONFIG,
  SORBOTHANE_UNITS,
  analyzeSorbothaneIsolation,
  assembleRigidBodyStiffness,
  mountDynamicStiffness,
  normalizeSorbothaneConfig,
  rigidBodyMassMatrix,
  rigidBodyResponseAtFrequency,
  runDesignGrid,
  solveRigidBodyModes,
  sorbothaneDynamicProperties,
  staticPreloadState
} from '../js/sorbothane-analysis.js';
import { engineeringReport, renderSorbothaneIsolationWorkbench, responseCsv } from '../js/sorbothane-isolation.js';
import { SORBOTHANE_CATALOG, SORBOTHANE_MATERIAL } from '../js/sorbothane-data.js';

const clone = value => JSON.parse(JSON.stringify(value));
const baseline = () => {
  const config = clone(DEFAULT_SORBOTHANE_CONFIG);
  config.uncertainty.enabled = false;
  return config;
};
const close = (actual, expected, relativeTolerance = 1e-9) => {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1);
  assert.ok(Math.abs(actual - expected) <= relativeTolerance * scale, `${actual} is not within ${relativeTolerance} relative tolerance of ${expected}`);
};

test('baseline vertical bounce mode is calculated in the intended 140-150 Hz region', () => {
  const result = analyzeSorbothaneIsolation(baseline(), { skipResponse: true, skipUncertainty: true });
  const vertical = result.modes.find(mode => mode.dominantIndex === 2);
  assert.ok(vertical, 'vertical mode was not classified');
  assert.ok(vertical.frequencyHz >= 140 && vertical.frequencyHz <= 150, `vertical mode was ${vertical.frequencyHz} Hz`);
  assert.equal(vertical.dominant, 'Z / bounce');
});

test('centered symmetric mounts suppress bounce-rocking stiffness coupling', () => {
  const stiffness = assembleRigidBodyStiffness(baseline(), 100).matrix;
  close(stiffness[2][3], 0, 1e-11);
  close(stiffness[2][4], 0, 1e-11);
  close(stiffness[0][5], 0, 1e-11);
  close(stiffness[1][5], 0, 1e-11);
});

test('planar CG shift introduces vertical translation and rocking coupling', () => {
  const centered = baseline();
  const shifted = baseline();
  shifted.component.cgM[0] = 0.6 * SORBOTHANE_UNITS.INCH;
  shifted.component.cgM[1] = -0.4 * SORBOTHANE_UNITS.INCH;
  const k0 = assembleRigidBodyStiffness(centered, 100).matrix;
  const k1 = assembleRigidBodyStiffness(shifted, 100).matrix;
  assert.ok(Math.abs(k0[2][3]) < 1e-8 && Math.abs(k0[2][4]) < 1e-8);
  assert.ok(Math.abs(k1[2][3]) > 1e3, 'Y CG shift should couple bounce and roll');
  assert.ok(Math.abs(k1[2][4]) > 1e3, 'X CG shift should couple bounce and pitch');
});

test('increasing CG height increases lateral-rocking coupling', () => {
  const low = baseline();
  low.component.cgM[2] = 0.5 * SORBOTHANE_UNITS.INCH;
  const high = baseline();
  high.component.cgM[2] = 4 * SORBOTHANE_UNITS.INCH;
  const kLow = assembleRigidBodyStiffness(low, 100).matrix;
  const kHigh = assembleRigidBodyStiffness(high, 100).matrix;
  assert.ok(Math.abs(kHigh[0][4]) > 4 * Math.abs(kLow[0][4]));
  assert.ok(Math.abs(kHigh[1][3]) > 4 * Math.abs(kLow[1][3]));
});

test('identical elements in each physical stack combine in series', () => {
  const singlePerSide = baseline();
  const twoPerSide = baseline();
  twoPerSide.mounts.stackTop = 2;
  twoPerSide.mounts.stackBottom = 2;
  const k1 = mountDynamicStiffness(singlePerSide, 100);
  const k2 = mountDynamicStiffness(twoPerSide, 100);
  close(k2.kzNPerM, k1.kzNPerM / 2);
  close(k2.kxNPerM, k1.kxNPerM / 2);
});

test('opposing preloaded stacks add incremental sandwich stiffness', () => {
  const state = mountDynamicStiffness(baseline(), 100);
  close(state.kzNPerM, 2 * state.singleCompressionNPerM);
  close(state.kxNPerM, 2 * state.singleShearNPerM);
  assert.match(state.sandwichRule, /parallel/);
});

test('symmetric vertical response closes to analytical complex-stiffness SDOF', () => {
  const config = baseline();
  config.analysis.responsePoint = 'cg';
  const frequency = 180;
  const omega = 2 * Math.PI * frequency;
  const mass = rigidBodyMassMatrix(config).matrix[2][2];
  const assembled = assembleRigidBodyStiffness(config, frequency);
  const stiffness = assembled.matrix[2][2];
  const eta = assembled.mount.material.tanDelta;
  const numeratorMagnitude = stiffness * Math.hypot(1, eta);
  const denominatorMagnitude = Math.hypot(stiffness - omega ** 2 * mass, stiffness * eta);
  const analytical = numeratorMagnitude / denominatorMagnitude;
  const sixDof = rigidBodyResponseAtFrequency(config, frequency, 'z').magnitude[2];
  close(sixDof, analytical, 2e-9);
});

test('SI boundary conversions preserve the same physical configuration and modes', () => {
  const englishBoundary = baseline();
  englishBoundary.component.massKg = 10 * SORBOTHANE_UNITS.LB;
  englishBoundary.component.dimensionsM = [10, 8, 4].map(value => value * SORBOTHANE_UNITS.INCH);
  englishBoundary.isolator.odM = 1.25 * SORBOTHANE_UNITS.INCH;
  englishBoundary.isolator.idM = 0.50 * SORBOTHANE_UNITS.INCH;
  englishBoundary.isolator.thicknessM = 0.25 * SORBOTHANE_UNITS.INCH;
  const siBoundary = baseline();
  siBoundary.component.massKg = 4.5359237;
  siBoundary.component.dimensionsM = [0.254, 0.2032, 0.1016];
  siBoundary.isolator.odM = 0.03175;
  siBoundary.isolator.idM = 0.0127;
  siBoundary.isolator.thicknessM = 0.00635;
  const englishModes = solveRigidBodyModes(normalizeSorbothaneConfig(englishBoundary)).modes;
  const siModes = solveRigidBodyModes(normalizeSorbothaneConfig(siBoundary)).modes;
  englishModes.forEach((mode, index) => close(mode.frequencyHz, siModes[index].frequencyHz, 1e-12));
});

test('static equilibrium keeps upper and lower element loads distinct and balanced', () => {
  const state = staticPreloadState(baseline());
  assert.equal(state.allEngaged, true);
  for (const mount of state.mounts) {
    close(mount.lowerLoadN - mount.upperLoadN, mount.payloadN, 1e-12);
    assert.ok(mount.upperLoadN > 0);
  }
  close(state.payloadContributionsN.reduce((sum, value) => sum + value, 0), 10 * SORBOTHANE_UNITS.LB * SORBOTHANE_UNITS.G0, 1e-12);
});

test('material provenance changes at published, digitized, and extrapolated boundaries', () => {
  const config = baseline();
  assert.equal(sorbothaneDynamicProperties(config, 50).provenance, 'manufacturer-published');
  assert.match(sorbothaneDynamicProperties(config, 200).provenance, /manufacturer-digitized/);
  assert.match(sorbothaneDynamicProperties(config, 600).provenance, /engineering-extrapolation/);
  assert.equal(SORBOTHANE_MATERIAL.digitizedCurveMaxHz, 300);
});

test('catalog includes current washer, ring, disc, and custom records', () => {
  assert.ok(SORBOTHANE_CATALOG.length >= 130);
  assert.ok(SORBOTHANE_CATALOG.some(item => item.geometry === 'washer'));
  assert.ok(SORBOTHANE_CATALOG.some(item => item.geometry === 'ring' && item.ratedLoadLb));
  assert.ok(SORBOTHANE_CATALOG.some(item => item.geometry === 'disc'));
  assert.ok(SORBOTHANE_CATALOG.some(item => item.productNumber === 'custom-ring' && item.provenance === 'engineering-assumption'));
});

test('workbench preserves trailing-zero requirement frequencies in rendered labels', () => {
  const html = renderSorbothaneIsolationWorkbench(DEFAULT_SORBOTHANE_CONFIG);
  assert.match(html, />600 Hz</);
  assert.match(html, />1200 Hz</);
  assert.match(html, />1400 Hz</);
  assert.match(html, />100-200 Hz peak</);
  assert.match(html, /data-sorbo-inset-axis="0"/);
  assert.match(html, /Mount plane relative to CG/);
  assert.match(html, /Durometer \(Shore 00\)/);
});

test('design explorer supports durometer and both mount-spacing axes', () => {
  const grid = runDesignGrid(baseline(), {
    xVariable: 'durometer',
    yVariable: 'mountSpacingY',
    xRange: [30, 70],
    yRange: [5.5, 7.5],
    gridSize: 3,
    output: 'verticalMode'
  });
  assert.deepEqual(grid.xValues, [30, 50, 70]);
  assert.deepEqual(grid.yValues, [5.5, 6.5, 7.5]);
  assert.equal(grid.values.length, 3);
  assert.equal(grid.values[0].length, 3);
  assert.ok(grid.candidates.every(candidate => candidate.analysis.modes.length === 6));
});

test('CSV and Markdown exports retain response phase, provenance, modes, and sources', () => {
  const analysis = analyzeSorbothaneIsolation(baseline(), { skipUncertainty: true });
  const csv = responseCsv(analysis);
  const report = engineeringReport(analysis);
  assert.match(csv, /^frequency_hz,Tx_mag,Tx_db,Tx_phase_deg/);
  assert.equal(csv.trim().split('\n').length, analysis.response.frequencies.length + 1);
  assert.match(csv, /engineering-extrapolation/);
  assert.match(report, /## Rigid-body modes/);
  assert.match(report, /## Sources/);
  assert.match(report, /600 Hz/);
  assert.match(report, /1200 Hz/);
});
