import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTwoStageIsolation,
  assembleTwoStageMatrices,
  complexMagnitude,
  equivalentSeriesStiffness,
  singleStageResponseAtFrequency,
  stageDampingCoefficients,
  twoStageResponseAtFrequency,
  twoStageUndampedModes
} from '../js/two-stage-isolation-physics.js';
import { TWO_STAGE_ISOLATION_PRESETS, twoStageIsolationCalculator } from '../js/two-stage-isolation.js';

const closeRelative = (actual, expected, tolerance, message = '') => {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1e-30);
  assert.ok(Math.abs(actual - expected) / scale <= tolerance, `${message} expected ${expected}, received ${actual}`);
};

const base = { m1: 5, m2: 20, k1: 4e5, k2: 1e7, c1: 0, c2: 0 };

test('complex frequency response satisfies the assembled dynamic-stiffness equations', () => {
  const input = { ...base, c1: 55, c2: 90 };
  const matrices = assembleTwoStageMatrices(input);
  const response = twoStageResponseAtFrequency(input, 137);
  const omega = response.omega;
  const x = [response.x1, response.x2];
  for (let row = 0; row < 2; row++) {
    let real = 0;
    let imaginary = 0;
    for (let column = 0; column < 2; column++) {
      const realDynamic = matrices.K[row][column] - omega * omega * matrices.M[row][column];
      const imaginaryDynamic = omega * matrices.C[row][column];
      real += realDynamic * x[column].re - imaginaryDynamic * x[column].im;
      imaginary += realDynamic * x[column].im + imaginaryDynamic * x[column].re;
    }
    const expectedReal = row === 0 ? matrices.k1 : 0;
    const expectedImaginary = row === 0 ? omega * matrices.c1 : 0;
    assert.ok(Math.abs(real - expectedReal) <= 1e-8 * Math.max(1, matrices.k1), `row ${row} real residual`);
    assert.ok(Math.abs(imaginary - expectedImaginary) <= 1e-8 * Math.max(1, omega * matrices.c1), `row ${row} imaginary residual`);
  }
});

test('k2 approaching infinity makes both masses follow the Stage 1 supported-mass SDOF', () => {
  const input = { ...base, k2: 1e14, c1: 30, c2: 0 };
  const response = twoStageResponseAtFrequency(input, 55);
  const combined = singleStageResponseAtFrequency({ mass: input.m1 + input.m2, stiffness: input.k1, dampingRatio: input.c1 / (2 * Math.sqrt(input.k1 * (input.m1 + input.m2))) }, 55);
  closeRelative(complexMagnitude(response.x1), complexMagnitude(combined), 2e-6, 'intermediate response');
  closeRelative(complexMagnitude(response.x2), complexMagnitude(combined), 2e-6, 'payload response');
  closeRelative(complexMagnitude(response.x2), complexMagnitude(response.x1), 2e-6, 'rigid combined motion');
});

test('k1 approaching infinity reduces payload response to the Stage 2 SDOF', () => {
  const input = { ...base, k1: 1e14, c1: 0, c2: 75 };
  const response = twoStageResponseAtFrequency(input, 180);
  const zeta = input.c2 / (2 * Math.sqrt(input.k2 * input.m2));
  const expected = singleStageResponseAtFrequency({ mass: input.m2, stiffness: input.k2, dampingRatio: zeta }, 180);
  closeRelative(complexMagnitude(response.x1), 1, 2e-6, 'intermediate follows base');
  closeRelative(complexMagnitude(response.x2), complexMagnitude(expected), 3e-6, 'payload Stage 2 response');
});

test('m1 approaching zero recovers the series-stiffness single dynamic mode', () => {
  const input = { ...base, m1: 1e-7 };
  const modes = twoStageUndampedModes(input);
  const expectedLowFrequency = Math.sqrt(equivalentSeriesStiffness(input.k1, input.k2) / input.m2) / (2 * Math.PI);
  closeRelative(modes[0].frequencyHz, expectedLowFrequency, 2e-7, 'series-stiffness low mode');
  assert.ok(modes[1].frequencyHz > 1e6, 'upper mode should move far above the design band');
});

test('equal masses and stiffnesses match the closed-form eigenvalues', () => {
  const mass = 3.2;
  const stiffness = 8.4e5;
  const modes = twoStageUndampedModes({ m1: mass, m2: mass, k1: stiffness, k2: stiffness, c1: 0, c2: 0 });
  const expected = [(3 - Math.sqrt(5)) / 2, (3 + Math.sqrt(5)) / 2].map(multiplier => stiffness / mass * multiplier);
  closeRelative(modes[0].eigenvalue, expected[0], 1e-12, 'lower eigenvalue');
  closeRelative(modes[1].eigenvalue, expected[1], 1e-12, 'upper eigenvalue');
});

test('zero damping places singular dynamic stiffness at both undamped natural frequencies', () => {
  const matrices = assembleTwoStageMatrices(base);
  const modes = twoStageUndampedModes(base);
  for (const mode of modes) {
    const lambda = mode.eigenvalue;
    const d11 = matrices.K[0][0] - lambda * matrices.M[0][0];
    const d12 = matrices.K[0][1];
    const d21 = matrices.K[1][0];
    const d22 = matrices.K[1][1] - lambda * matrices.M[1][1];
    assert.ok(Math.abs(d11 * d22 - d12 * d21) <= 1e-12 * Math.max(matrices.k1, matrices.k2) ** 2, `mode ${mode.number} determinant`);
    assert.equal(mode.dampingRatio, 0);
  }
});

test('zero-damping payload response approaches fourth-order roll-off at high frequency', () => {
  const analysis = analyzeTwoStageIsolation({ ...base, minimumFrequencyHz: 1e4, maximumFrequencyHz: 1e6, pointsPerDecade: 64 });
  closeRelative(analysis.highFrequencySlopeDbPerDecade, -80, .001, 'high-frequency slope');
});

test('stage damping-ratio inputs use explicit supported and reduced reference masses', () => {
  const damping = stageDampingCoefficients({ ...base, stage1Mode: 'ratio', stage2Mode: 'ratio', zeta1: .05, zeta2: .08 });
  closeRelative(damping.stage1ReferenceMass, 25, 1e-14);
  closeRelative(damping.stage2ReferenceMass, 4, 1e-14);
  closeRelative(damping.c1, 2 * .05 * Math.sqrt(base.k1 * 25), 1e-14);
  closeRelative(damping.c2, 2 * .08 * Math.sqrt(base.k2 * 4), 1e-14);
});

test('default workbench result exposes modes, response, phase, static load, and calculated commentary', () => {
  const defaults = Object.fromEntries(twoStageIsolationCalculator.inputs.map(field => [field.key, field.default]));
  const result = twoStageIsolationCalculator.compute({ ...defaults, ...TWO_STAGE_ISOLATION_PRESETS['soft-stiff'] });
  assert.equal(result.plots.length, 2);
  assert.match(result.plots[0].title, /Payload transmission/);
  assert.match(result.plots[1].title, /phase/i);
  assert.ok(result.tables.some(table => /Static load path/.test(table.title)));
  assert.ok(result.tables.some(table => /forcing frequencies/.test(table.title)));
  assert.equal(result.analysis.model.modes.length, 2);
  assert.ok(Number.isFinite(result.analysis.model.highFrequencySlopeDbPerDecade));
  assert.match(result.interpretation.physicalMeaning, /intermediate mass/i);
  assert.match(result.interpretation.engineeringConsiderations.join(' '), /does not generally have a finite payload transmission zero/i);
});
