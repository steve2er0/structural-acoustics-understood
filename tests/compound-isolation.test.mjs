import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPOUND_G0,
  analyzeCompoundIsolation,
  assembleCompoundIsolationMatrices,
  compoundResponseAtFrequency,
  mountKinematics,
  parametricMountPositions,
  parseMountCoordinates,
  solveCompoundModes,
  solveCompoundStatic
} from '../js/compound-isolation-physics.js';
import { TWO_STAGE_ISOLATION_PRESETS, twoStageIsolationCalculator } from '../js/two-stage-isolation.js';

const closeRelative = (actual, expected, tolerance, message = '') => {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1e-30);
  assert.ok(Math.abs(actual - expected) / scale <= tolerance, `${message} expected ${expected}, received ${actual}`);
};
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const multiplyVector = (matrix, vector) => matrix.map(row => dot(row, vector));
const transpose = matrix => matrix[0].map((_, column) => matrix.map(row => row[column]));

function compoundCase({ count = 4, body1Cg = [0, 0, 0], body2Cg = [0, 0, 0], damping = true } = {}) {
  const stage1Body1 = parametricMountPositions(count, .42, .32, .03, body1Cg);
  const stage2Body1 = parametricMountPositions(count, .32, .25, -.03, body1Cg);
  const stage2Body2 = parametricMountPositions(count, .28, .22, .11, body2Cg);
  const c1 = damping ? 2 * .008 * Math.sqrt(4e5 * 25) : 0;
  const c2 = damping ? 2 * .008 * Math.sqrt(1e7 * 4) : 0;
  return {
    body1: { label: 'Intermediate', massKg: 5, dimensionsM: [.5, .4, .04], inertiaMode: 'auto' },
    body2: { label: 'Payload', massKg: 20, dimensionsM: [.35, .28, .2], inertiaMode: 'auto' },
    stage1Mounts: stage1Body1.map(body1Position => ({ body1Position, stiffness: [1.2e5 / count, 1.2e5 / count, 4e5 / count], damping: [c1 / count, c1 / count, c1 / count] })),
    stage2Mounts: stage2Body1.map((body1Position, index) => ({ body1Position, body2Position: stage2Body2[index], stiffness: [3e6 / count, 3e6 / count, 1e7 / count], damping: [c2 / count, c2 / count, c2 / count] })),
    baseAxis: 'z', gravityAxis: 'z', minimumFrequencyHz: 10, maximumFrequencyHz: 2000, pointsPerDecade: 64
  };
}

test('12-DOF assembly is symmetric and its strain energy closes against mount deformation', () => {
  const model = assembleCompoundIsolationMatrices(compoundCase());
  assert.equal(model.M.length, 12);
  assert.equal(model.K.length, 12);
  for (const matrix of [model.M, model.C, model.K]) for (let row = 0; row < 12; row += 1) for (let column = 0; column < 12; column += 1) closeRelative(matrix[row][column], matrix[column][row], 1e-13, `symmetry ${row},${column}`);
  const q = [.001, -.002, .003, .004, -.003, .002, -.0015, .0025, -.0008, -.003, .002, -.004];
  const matrixEnergy = dot(q, multiplyVector(model.K, q));
  let mountEnergy = 0;
  for (const mount of model.stage1Mounts) {
    const delta = multiplyVector(mountKinematics(mount.body1Position), q.slice(0, 6));
    mountEnergy += delta.reduce((sum, value, axis) => sum + mount.stiffness[axis] * value ** 2, 0);
  }
  for (const mount of model.stage2Mounts) {
    const body1 = multiplyVector(mountKinematics(mount.body1Position), q.slice(0, 6));
    const body2 = multiplyVector(mountKinematics(mount.body2Position), q.slice(6, 12));
    mountEnergy += body2.reduce((sum, value, axis) => sum + mount.stiffness[axis] * (value - body1[axis]) ** 2, 0);
  }
  closeRelative(matrixEnergy, mountEnergy, 2e-13, 'strain-energy closure');
});

test('balanced rigid-body geometry reproduces the established axis-only 2-DOF FRF', () => {
  const analysis = analyzeCompoundIsolation(compoundCase());
  assert.ok(analysis.parityMaximumRelativeDifference < 1e-11, `parity difference ${analysis.parityMaximumRelativeDifference}`);
  const verticalModes = [...analysis.modes].sort((left, right) => (right.participation[2] + right.participation[8]) - (left.participation[2] + left.participation[8])).slice(0, 2).sort((left, right) => left.frequencyHz - right.frequencyHz);
  closeRelative(verticalModes[0].frequencyHz, analysis.reference.modes[0].frequencyHz, 2e-11, 'lower vertical mode');
  closeRelative(verticalModes[1].frequencyHz, analysis.reference.modes[1].frequencyHz, 2e-11, 'upper vertical mode');
  assert.ok(analysis.offAxisPeakRatio < 1e-12);
});

test('complex rigid-body response satisfies every dynamic-stiffness row', () => {
  const model = assembleCompoundIsolationMatrices(compoundCase());
  const response = compoundResponseAtFrequency(model, 137, 'z');
  for (let row = 0; row < 12; row += 1) {
    let real = 0;
    let imaginary = 0;
    for (let column = 0; column < 12; column += 1) {
      const dReal = model.K[row][column] - response.omega ** 2 * model.M[row][column];
      const dImaginary = response.omega * model.C[row][column];
      real += dReal * response.q[column].re - dImaginary * response.q[column].im;
      imaginary += dReal * response.q[column].im + dImaginary * response.q[column].re;
    }
    const scale = Math.max(1, Math.abs(response.rhs[row].re), Math.abs(response.rhs[row].im));
    assert.ok(Math.hypot(real - response.rhs[row].re, imaginary - response.rhs[row].im) <= 2e-9 * scale, `dynamic residual row ${row}`);
  }
});

test('all twelve undamped modes satisfy Kφ = λMφ', () => {
  const model = solveCompoundModes(compoundCase(), 'z');
  assert.equal(model.modes.length, 12);
  for (const mode of model.modes) {
    const left = multiplyVector(model.K, mode.vector);
    const right = multiplyVector(model.M, mode.vector).map(value => value * mode.eigenvalue);
    const residual = Math.hypot(...left.map((value, index) => value - right[index]));
    const scale = Math.max(Math.hypot(...left), Math.hypot(...right), 1);
    assert.ok(residual / scale < 2e-9, `mode ${mode.number} residual ${residual / scale}`);
    assert.ok(mode.frequencyHz > 0);
    assert.ok(mode.dampingRatio >= 0);
  }
});

test('static rigid-body solution closes both stage load paths', () => {
  const model = assembleCompoundIsolationMatrices(compoundCase());
  const state = solveCompoundStatic(model, 'z');
  closeRelative(state.stage1.reduce((sum, mount) => sum + mount.supportedLoadN, 0), 25 * COMPOUND_G0, 2e-12, 'Stage 1 supported load');
  closeRelative(state.stage2.reduce((sum, mount) => sum + mount.supportedLoadN, 0), 20 * COMPOUND_G0, 2e-12, 'Stage 2 supported load');
  assert.ok(Math.max(...state.q.filter((_, index) => ![2, 8].includes(index)).map(Math.abs)) < 1e-12, 'balanced static case should not rotate or translate laterally');
});

test('three-point non-collinear stages remain fully constrained', () => {
  const model = solveCompoundModes(compoundCase({ count: 3 }), 'z');
  assert.equal(model.stage1Mounts.length, 3);
  assert.equal(model.stage2Mounts.length, 3);
  assert.equal(model.modes.length, 12);
  assert.ok(model.modes.every(mode => Number.isFinite(mode.frequencyHz) && mode.frequencyHz > 0));
  const response = compoundResponseAtFrequency(model, 600, 'z');
  assert.ok(response.q.every(value => Number.isFinite(value.re) && Number.isFinite(value.im)));
});

test('CG offsets create calculated translation-rotation coupling', () => {
  const analysis = analyzeCompoundIsolation(compoundCase({ body1Cg: [.045, -.025, 0], body2Cg: [-.035, .02, 0] }));
  assert.ok(analysis.parityMaximumRelativeDifference > .01);
  assert.ok(analysis.offAxisPeakRatio > .01);
  assert.ok(analysis.K.some((row, index) => row.some((value, column) => (index % 6) < 3 && (column % 6) >= 3 && Math.abs(value) > 1e-6)));
});

test('custom mount-coordinate parser accepts explicit engineering length units', () => {
  const points = parseMountCoordinates('0in, 0in, 1in; 100mm, 20cm, 0.3m; -1ft, 2in, 5cm', 3);
  closeRelative(points[0][2], .0254, 1e-14);
  closeRelative(points[1][0], .1, 1e-14);
  closeRelative(points[1][1], .2, 1e-14);
  closeRelative(points[2][0], -.3048, 1e-14);
  assert.throws(() => parseMountCoordinates('0,0,0;1,1,1', 3), /exactly 3/);
});

test('workbench exposes both 12-DOF and preserved 2-DOF result contracts', () => {
  const defaults = Object.fromEntries(twoStageIsolationCalculator.inputs.map(field => [field.key, field.default]));
  const rigid = twoStageIsolationCalculator.compute(defaults);
  assert.equal(rigid.analysis.model.kind, 'rigid-12dof');
  assert.equal(rigid.analysis.model.modes.length, 12);
  assert.match(rigid.tables[0].title, /Twelve rigid-body modes/);
  assert.match(rigid.interpretation.physicalMeaning, /12-DOF assembly passes its vertical parity gate/i);
  assert.equal(rigid.plots.length, 2);
  const vertical = twoStageIsolationCalculator.compute({ ...defaults, ...TWO_STAGE_ISOLATION_PRESETS['soft-stiff'] });
  assert.equal(vertical.analysis.model.modes.length, 2);
  assert.match(vertical.validity.regime, /2×2/);
});
