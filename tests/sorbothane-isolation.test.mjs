import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SORBOTHANE_CONFIG,
  SORBOTHANE_UNITS,
  analyzeSorbothaneIsolation,
  assembleRigidBodyStiffness,
  frequencyResponse,
  mountDynamicStiffness,
  normalizeSorbothaneConfig,
  rigidBodyMassMatrix,
  rigidBodyResponseAtFrequency,
  runDesignGrid,
  screenSorbothaneCatalog,
  screenSorbothaneCatalogAsync,
  solveRigidBodyModes,
  sorbothaneDynamicProperties,
  staticPreloadState
} from '../js/sorbothane-analysis.js';
import { engineeringReport, renderSorbothaneIsolationWorkbench, responseCsv, sorbothaneExplorerSettingsAroundDesign, sorbothaneExplorerVariableDefaults } from '../js/sorbothane-isolation.js';
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

test('lateral translation criteria follow modal participation rather than mode order', () => {
  const result = analyzeSorbothaneIsolation(baseline(), { skipResponse: true, skipUncertainty: true });
  assert.deepEqual(result.lateralModeResults.map(item => item.axis), ['X', 'Y']);
  assert.deepEqual(result.lateralModeResults.map(item => item.modeNumber), [2, 1]);
  assert.ok(result.lateralModeResults.every(item => item.participationPct > 90));
  assert.ok(result.lateralModeResults.every(item => item.minimumHz === 50 && item.pass === false));
  assert.equal(result.verticalModeResult.modeNumber, 4);
  assert.equal(result.verticalModeResult.pass, true);
  const relaxed = baseline();
  relaxed.analysis.lateralModeMinimumHz = [40, 40];
  assert.ok(analyzeSorbothaneIsolation(relaxed, { skipResponse: true, skipUncertainty: true }).lateralModeResults.every(item => item.pass));
});

test('transmissibility evaluates direct X, Y, and Z base-to-response directions', () => {
  const config = baseline();
  const analysis = analyzeSorbothaneIsolation(config, { skipUncertainty: true });
  assert.deepEqual(Object.keys(analysis.directionalResponses), ['x', 'y', 'z']);
  for (const axis of ['x', 'y', 'z']) {
    assert.equal(analysis.directionalResponses[axis].axis, axis);
    assert.equal(analysis.directionalResponses[axis].frequencies.length, config.analysis.frequencyPoints);
  }
  assert.equal(frequencyResponse(config, 'x').axis, 'x');
  assert.ok(analysis.toneResults.every(result => result.axisResults.length === 3));
  assert.ok(analysis.toneResults.every(result => result.db === Math.max(...result.axisResults.map(axisResult => axisResult.db))));
  assert.deepEqual(analysis.peakResults.map(result => result.axis), ['X', 'Y', 'Z']);
  assert.equal(analysis.peak.db, Math.max(...analysis.peakResults.map(result => result.db)));

  const uncertainConfig = clone(DEFAULT_SORBOTHANE_CONFIG);
  uncertainConfig.analysis.frequencyPoints = 25;
  uncertainConfig.uncertainty.samples = 8;
  const uncertain = analyzeSorbothaneIsolation(uncertainConfig);
  assert.deepEqual(Object.keys(uncertain.uncertainty.directionalBands), ['x', 'y', 'z']);
  const expectedPoints = uncertain.directionalResponses.x.frequencies.length;
  assert.ok(Object.values(uncertain.uncertainty.directionalBands).every(band => band.lowerDb.length === expectedPoints && band.upperDb.length === expectedPoints));
  assert.ok(uncertain.uncertainty.toneRangesDbByAxis.every(results => results.length === 3));
});

test('top-corner response options add rigid-body rotation to CG translation', () => {
  const cgConfig = baseline();
  cgConfig.analysis.responsePoint = 'cg';
  const frequency = 190;
  const cg = rigidBodyResponseAtFrequency(cgConfig, frequency, 'y');
  const cornerConfig = clone(cgConfig);
  cornerConfig.analysis.responsePoint = 'corner-positive';
  const corner = rigidBodyResponseAtFrequency(cornerConfig, frequency, 'y');
  const [length, width, height] = cornerConfig.component.dimensionsM;
  const [cgX, cgY, cgZ] = cornerConfig.component.cgM;
  const [px, py, pz] = [length / 2 - cgX, width / 2 - cgY, height - cgZ];
  const expected = [
    { re: cg.complex[0].re + cg.complex[4].re * pz - cg.complex[5].re * py, im: cg.complex[0].im + cg.complex[4].im * pz - cg.complex[5].im * py },
    { re: cg.complex[1].re - cg.complex[3].re * pz + cg.complex[5].re * px, im: cg.complex[1].im - cg.complex[3].im * pz + cg.complex[5].im * px },
    { re: cg.complex[2].re + cg.complex[3].re * py - cg.complex[4].re * px, im: cg.complex[2].im + cg.complex[3].im * py - cg.complex[4].im * px }
  ];
  expected.forEach((value, axis) => {
    close(corner.complex[axis].re, value.re, 1e-12);
    close(corner.complex[axis].im, value.im, 1e-12);
  });
  assert.notEqual(corner.db[1], cg.db[1]);
  assert.equal(normalizeSorbothaneConfig({ analysis: { responsePoint: 'not-a-real-point' } }).analysis.responsePoint, 'cg');
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
  assert.match(html, />600 Hz · Txx</);
  assert.match(html, />1200 Hz · Txx</);
  assert.match(html, />1400 Hz · Txx</);
  assert.match(html, />100-200 Hz · Txx peak</);
  assert.match(html, /data-sorbo-inset-axis="0"/);
  assert.match(html, /Mount plane relative to CG/);
  assert.match(html, /Durometer \(Shore 00\)/);
  assert.match(html, /data-sorbo-catalog-progress/);
  assert.match(html, /data-sorbo-action="load-current-into-explorer"/);
  assert.match(html, /Current analysis design/);
  assert.match(html, /Add tone criterion/);
  assert.match(html, /data-catalog-criterion="verticalMinHz"/);
  assert.match(html, /data-catalog-criterion="xTranslationMinHz"/);
  assert.match(html, /data-catalog-criterion="yTranslationMinHz"/);
  assert.match(html, /X translation-dominated mode/);
  assert.match(html, /Y translation-dominated mode/);
  assert.match(html, /Z translation-dominated mode/);
  assert.match(html, /X translation mode minimum/);
  assert.match(html, /Z translation mode minimum/);
  assert.match(html, /Resonance search band start/);
  assert.doesNotMatch(html, /Avoid band start|Accepted band start/);
  assert.match(html, /X LIMIT FAIL/);
  assert.match(html, /Y LIMIT FAIL/);
  assert.match(html, /Z LIMIT PASS/);
  assert.match(html, /Direct-axis transmissibility · Txx, Tyy, Tzz/);
  assert.equal((html.match(/data-sorbo-response-point=/g) ?? []).length, 3);
  assert.match(html, /data-sorbo-response-point="cg" class="active" aria-pressed="true"/);
  assert.match(html, /Offset from CG: \(\+0, \+0, \+0\) in/);
  assert.match(html, /This location also governs the tone and resonance checks below/);
  assert.doesNotMatch(html, /Coupled response detail|six-DOF response|data-sorbo-field="analysis.excitationAxis"/);
  assert.equal((html.match(/data-sorbo-chart-hit/g) ?? []).length, 1);
  assert.equal((html.match(/class="sorbo-uncertainty-band band-/g) ?? []).length, 3);
  assert.equal((html.match(/class="sorbo-mode-point/g) ?? []).length, 18);
  assert.match(html, /M5 · Txx/);
  assert.match(html, /M6 · Tyy/);
  assert.match(html, />600 Hz · Tyy</);
  assert.match(html, />600 Hz · Tzz</);
  assert.equal((html.match(/data-sorbo-action="remove-catalog-tone"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /sorbo-fixed-criterion|>Baseline</);
  const noToneHtml = renderSorbothaneIsolationWorkbench(DEFAULT_SORBOTHANE_CONFIG, {}, { toneCriteria: [] });
  assert.match(noToneHtml, /No discrete-frequency attenuation criteria are active/);
  assert.match(noToneHtml, />0 tone criteria plus resonance limit</);
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

test('design explorer gives each variable a physically meaningful default range', () => {
  const ranges = sorbothaneExplorerVariableDefaults(baseline());
  assert.deepEqual(ranges.durometer, {
    min: 30,
    max: 70,
    step: 10,
    note: 'Standard grades are 30, 50, and 70 Shore 00; intermediate grid points use material-property interpolation.'
  });
  assert.deepEqual([ranges.thickness.min, ranges.thickness.max, ranges.thickness.step], [0.125, 0.5, 0.025]);
  assert.deepEqual([ranges.od.min, ranges.od.max, ranges.od.step], [0.875, 1.75, 0.025]);
  assert.deepEqual([ranges.compression.min, ranges.compression.max, ranges.compression.step], [10, 20, 1]);
  assert.deepEqual([ranges.mass.min, ranges.mass.max, ranges.mass.step], [7.5, 12.5, 0.5]);
  assert.deepEqual([ranges.mountSpacing.min, ranges.mountSpacing.max], [6, 9.5]);
  assert.deepEqual([ranges.mountSpacingY.min, ranges.mountSpacingY.max], [4.75, 7.5]);
  assert.notDeepEqual([ranges.durometer.min, ranges.durometer.max], [ranges.thickness.min, ranges.thickness.max]);
});

test('design explorer centers a seven-by-seven study on the applied design', () => {
  const config = baseline();
  config.isolator.productNumber = 'custom-ring';
  const settings = sorbothaneExplorerSettingsAroundDesign(config, { xVariable: 'thickness', yVariable: 'od', output: 't1200' });
  close((settings.xMin + settings.xMax) / 2, 0.25, 1e-12);
  close((settings.yMin + settings.yMax) / 2, 1.25, 1e-12);
  const grid = runDesignGrid(config, {
    xVariable: settings.xVariable,
    yVariable: settings.yVariable,
    xRange: [settings.xMin, settings.xMax],
    yRange: [settings.yMin, settings.yMax],
    output: settings.output,
    gridSize: 7
  });
  close(grid.xValues[3], 0.25, 1e-12);
  close(grid.yValues[3], 1.25, 1e-12);
  assert.deepEqual(grid.reference, { xValue: 0.25, yValue: 1.25 });
  assert.equal(grid.candidates.filter(candidate => candidate.isReference).length, 1);
});

test('catalog screening filters nominal geometry and selects the minimum passing stack count per part', () => {
  const screen = screenSorbothaneCatalog(baseline(), {
    geometry: 'washer',
    odRange: [0.99, 1.01],
    idRange: [0.44, 0.46],
    thicknessRange: [0.12, 0.39],
    stackRange: [1, 2],
    criteria: { lateralModeMinimumHz: [30, 30] }
  });
  assert.equal(screen.eligiblePartCount, 9);
  assert.equal(screen.combinationCount, 18);
  assert.ok(screen.dynamicallyEvaluatedCount > 0);
  assert.ok(screen.recommendations.length > 0);
  assert.ok(screen.recommendations.every(candidate => candidate.pass));
  assert.ok(screen.recommendations.every(candidate => candidate.item.geometry === 'washer'));
  assert.ok(screen.recommendations.every(candidate => candidate.item.odIn === 1));
  assert.ok(screen.recommendations.every(candidate => candidate.stackCount >= 1 && candidate.stackCount <= 2));
  assert.ok(screen.recommendations.every(candidate => candidate.installedLoadRangeLb[0] >= candidate.item.ratedLoadLb[0]));
  assert.ok(screen.recommendations.every(candidate => candidate.installedLoadRangeLb[1] <= candidate.item.ratedLoadLb[1]));
  const twoStack = screen.recommendations.find(candidate => candidate.item.productNumber === '0510012-50-10');
  assert.equal(twoStack?.stackCount, 2);
  assert.equal(twoStack?.totalElementCount, 16);
});

test('asynchronous catalog screening yields monotonic staged progress and uses added criteria', async () => {
  const tones = [...baseline().analysis.tones, { frequencyHz: 800, maximumDb: 100 }];
  const progress = [];
  const screen = await screenSorbothaneCatalogAsync(baseline(), {
    geometry: 'washer',
    odRange: [0.99, 1.01],
    idRange: [0.44, 0.46],
    thicknessRange: [0.12, 0.39],
    stackRange: [1, 2],
    criteria: { tones }
  }, {
    batchSize: 3,
    yieldControl: async () => {},
    onProgress: update => progress.push(update)
  });
  assert.ok(screen);
  assert.equal(screen.criteria.tones.length, 4);
  assert.deepEqual(screen.criteria.lateralModeMinimumHz, [50, 50]);
  assert.ok(screen.exclusions.xTranslation > 0);
  assert.ok(screen.exclusions.yTranslation > 0);
  assert.equal(screen.criteria.tones[3].frequencyHz, 800);
  assert.equal(progress[0].stage, 'pre-screen');
  assert.equal(progress[0].percent, 0);
  assert.ok(progress.some(update => update.stage === 'dynamic'));
  assert.equal(progress.at(-1).stage, 'complete');
  assert.equal(progress.at(-1).percent, 100);
  assert.ok(progress.every((update, index) => index === 0 || update.percent >= progress[index - 1].percent));
});

test('catalog screening supports removing every discrete tone criterion', () => {
  const screen = screenSorbothaneCatalog(baseline(), {
    geometry: 'washer',
    odRange: [0.99, 1.01],
    idRange: [0.44, 0.46],
    thicknessRange: [0.12, 0.39],
    stackRange: [1, 2],
    criteria: { tones: [] }
  });
  assert.deepEqual(screen.criteria.tones, []);
  assert.ok(screen.dynamicallyEvaluatedCount > 0);
  assert.ok(screen.recommendations.every(candidate => candidate.analysis.toneResults.length === 0));
});

test('recommended compression is an explicit design criterion', () => {
  const preferred = staticPreloadState(baseline());
  const lowCompression = baseline();
  lowCompression.isolator.compressionPct = 5;
  assert.equal(preferred.compressionCompliant, true);
  assert.equal(staticPreloadState(lowCompression).compressionCompliant, false);
  assert.equal(analyzeSorbothaneIsolation(lowCompression, { skipResponse: true, skipUncertainty: true }).passes, false);
});

test('CSV and Markdown exports retain response phase, provenance, modes, and sources', () => {
  const analysis = analyzeSorbothaneIsolation(baseline(), { skipUncertainty: true });
  const csv = responseCsv(analysis);
  const report = engineeringReport(analysis);
  assert.match(csv, /^base_excitation_axis,frequency_hz,Tx_mag,Tx_db,Tx_phase_deg/);
  assert.equal(csv.trim().split('\n').length, analysis.response.frequencies.length * 3 + 1);
  assert.match(csv, /engineering-extrapolation/);
  assert.match(report, /## Rigid-body modes/);
  assert.match(report, /Transmissibility response location: Center of gravity/);
  assert.match(report, /## Sources/);
  assert.match(report, /600 Hz/);
  assert.match(report, /1200 Hz/);
  assert.match(report, /600 Hz · Txx/);
  assert.match(report, /600 Hz · Tyy/);
  assert.match(report, /600 Hz · Tzz/);
});
