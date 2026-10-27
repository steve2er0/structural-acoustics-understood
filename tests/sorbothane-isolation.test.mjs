import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SORBOTHANE_CONFIG,
  NASTRAN_PLATE_MATERIALS,
  SORBOTHANE_UNITS,
  analyzeSorbothaneIsolation,
  assembleRigidBodyStiffness,
  frequencyResponse,
  isolationMountCoordinates,
  mountDynamicStiffness,
  normalizeSorbothaneConfig,
  rigidBodyMassMatrix,
  rigidBodyResponseAtFrequency,
  runDesignGrid,
  screenParkerLordCatalog,
  screenParkerLordCatalogAsync,
  screenSorbothaneCatalog,
  screenSorbothaneCatalogAsync,
  solveRigidBodyModes,
  sorbothaneDynamicProperties,
  staticPreloadState
} from '../js/sorbothane-analysis.js';
import { catalogScreenResult, engineeringReport, renderSorbothaneExplorerResult, renderSorbothaneIsolationWorkbench, responseCsv, sorbothaneExplorerSettingsAroundDesign, sorbothaneExplorerVariableDefaults, sorbothaneIsolationCalculator, updateSorbothaneCriteria } from '../js/sorbothane-isolation.js';
import { NASTRAN_IPS_UNITS, generateNastranIsolationBdf } from '../js/nastran-isolation-export.js';
import { SORBOTHANE_CATALOG, SORBOTHANE_MATERIAL, SORBOTHANE_MATERIALS, sorbothaneMaterial } from '../js/sorbothane-data.js';
import { PARKER_LORD_AM_CATALOG, PARKER_LORD_AM_FAMILIES, parkerLordCatalogItem } from '../js/parker-lord-isolators.js';

const clone = value => JSON.parse(JSON.stringify(value));
const baseline = () => {
  const config = clone(DEFAULT_SORBOTHANE_CONFIG);
  // Keep the original four-leg mechanics reference independent of UI defaults.
  const { INCH, LB } = SORBOTHANE_UNITS;
  Object.assign(config.component, { massKg: 10 * LB, dimensionsM: [10 * INCH, 8 * INCH, 4 * INCH], cgM: [0, 0, 2 * INCH] });
  Object.assign(config.mounts, { count: 4, rowAxis: 'x', spacingM: [8.5 * INCH, 6.5 * INCH] });
  config.uncertainty.enabled = false;
  return config;
};
const lordBaseline = (productNumber = 'AM-001-2') => {
  const config = baseline();
  const item = parkerLordCatalogItem(productNumber);
  config.isolator.kind = 'parker-lord-am';
  config.isolator.productNumber = item.productNumber;
  config.isolator.lordLossFactor = item.lossFactorDefault;
  config.isolator.mountsPerPoint = 1;
  return config;
};
const close = (actual, expected, relativeTolerance = 1e-9) => {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1);
  assert.ok(Math.abs(actual - expected) <= relativeTolerance * scale, `${actual} is not within ${relativeTolerance} relative tolerance of ${expected}`);
};
const tabPanelHtml = (html, id, nextId) => {
  const start = html.indexOf(`data-sorbo-panel="${id}"`);
  const end = html.indexOf(`data-sorbo-panel="${nextId}"`, start + 1);
  assert.ok(start >= 0 && end > start, `${id} panel boundaries were not found`);
  return html.slice(start, end);
};

test('default baseline is the centered 25 lbm component with eight inset supports', () => {
  const { INCH, LB, G0 } = SORBOTHANE_UNITS;
  const config = normalizeSorbothaneConfig({});
  close(config.component.massKg / LB, 25);
  config.component.dimensionsM.forEach((value, index) => close(value / INCH, [13.5, 7.2, 9][index]));
  assert.deepEqual(config.component.cgM, [0, 0, config.component.dimensionsM[2] / 2]);
  assert.equal(config.mounts.count, 8);
  assert.equal(config.mounts.rowAxis, 'y');
  config.mounts.spacingM.forEach((value, index) => {
    close(value / INCH, [12, 5.7][index]);
    close((config.component.dimensionsM[index] - value) / (2 * INCH), .75);
  });
  const mounts = isolationMountCoordinates(config);
  for (const sideX of [-6, 6]) {
    const row = mounts.filter(point => Math.abs(point[0] / INCH - sideX) < 1e-10).sort((a, b) => a[1] - b[1]);
    assert.equal(row.length, 4);
    row.forEach((point, index) => close(point[1] / INCH, [-2.85, -.95, .95, 2.85][index]));
  }
  const analysis = analyzeSorbothaneIsolation(config, { skipResponse: true, skipUncertainty: true });
  analysis.preload.mounts.forEach(mount => close(mount.payloadN, 25 * LB * G0 / 8));
  assert.equal(analysis.modes.length, 6);
  assert.ok(analysis.modes.every(mode => Number.isFinite(mode.frequencyHz) && mode.frequencyHz > 0));
  const html = renderSorbothaneIsolationWorkbench(config, {}, {}, analysis);
  for (const [path, value] of [['component.dimensionsM.0', '13.5'], ['component.dimensionsM.1', '7.2'], ['component.dimensionsM.2', '9'], ['component.cgM.2', '4.5'], ['mounts.spacingM.0', '12'], ['mounts.spacingM.1', '5.7']]) {
    assert.ok(html.includes(`data-sorbo-field="${path}" data-quantity="length" value="${value}"`));
  }
  assert.match(html, /value="8" selected/);
  assert.match(html, /value="y" selected/);
});

test('new baseline defaults do not overwrite explicit saved component or layout settings', () => {
  const saved = baseline();
  const normalized = normalizeSorbothaneConfig(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(normalized.component, saved.component);
  assert.deepEqual(normalized.mounts, saved.mounts);
});

test('quick calculator shares the guided baseline mass, count and row direction', () => {
  const defaults = Object.fromEntries(sorbothaneIsolationCalculator.inputs.map(input => [input.key, input.default]));
  close(defaults.mass_lb, 25);
  assert.equal(defaults.leg_count, 8);
  assert.equal(defaults.row_axis, 'y');
  const quick = sorbothaneIsolationCalculator.compute(defaults);
  const guided = analyzeSorbothaneIsolation(DEFAULT_SORBOTHANE_CONFIG, { skipResponse: true, skipUncertainty: true });
  close(quick.values[0].value, guided.verticalModeResult.frequencyHz);
});

test('legacy four-leg reference vertical bounce remains in the intended 140-150 Hz region', () => {
  const result = analyzeSorbothaneIsolation(baseline(), { skipResponse: true, skipUncertainty: true });
  const vertical = result.modes.find(mode => mode.dominantIndex === 2);
  assert.ok(vertical, 'vertical mode was not classified');
  assert.ok(vertical.frequencyHz >= 140 && vertical.frequencyHz <= 150, `vertical mode was ${vertical.frequencyHz} Hz`);
  assert.equal(vertical.dominant, 'Z / bounce');
});

test('support layout preserves four corners and adds two inner legs to each Y side', () => {
  const config = baseline();
  const [x, y] = config.mounts.spacingM;
  assert.deepEqual(isolationMountCoordinates(config), [
    [-x / 2, -y / 2, 0], [x / 2, -y / 2, 0], [x / 2, y / 2, 0], [-x / 2, y / 2, 0]
  ]);
  config.mounts.count = 8;
  const points = isolationMountCoordinates(config);
  assert.equal(points.length, 8);
  const rows = [-y / 2, y / 2].map(rowY => points.filter(point => point[1] === rowY).sort((a, b) => a[0] - b[0]));
  for (const row of rows) {
    assert.equal(row.length, 4);
    row.forEach((point, index) => close(point[0], [-x / 2, -x / 6, x / 6, x / 2][index], 1e-12));
  }
  assert.equal(normalizeSorbothaneConfig({ mounts: { count: '8' } }).mounts.count, 8);
  assert.equal(normalizeSorbothaneConfig({ mounts: { count: 6 } }).mounts.count, 4);
  assert.equal(normalizeSorbothaneConfig({}).mounts.count, 8);
});

test('row direction moves the inner legs onto the other sides while retaining the X/Y footprint', () => {
  const config = baseline();
  const originalCorners = isolationMountCoordinates(config).map(point => point.join(',')).sort();
  config.mounts.rowAxis = 'y';
  assert.deepEqual(isolationMountCoordinates(config).map(point => point.join(',')).sort(), originalCorners);
  config.mounts.count = 8;
  const [x, y] = config.mounts.spacingM;
  const points = isolationMountCoordinates(config);
  for (const sideX of [-x / 2, x / 2]) {
    const row = points.filter(point => point[0] === sideX).sort((a, b) => a[1] - b[1]);
    assert.equal(row.length, 4);
    row.forEach((point, index) => close(point[1], [-y / 2, -y / 6, y / 6, y / 2][index], 1e-12));
  }
  assert.equal(normalizeSorbothaneConfig({}).mounts.rowAxis, 'y');
  assert.equal(normalizeSorbothaneConfig({mounts: {rowAxis: 'invalid'}}).mounts.rowAxis, 'x');
  assert.equal(normalizeSorbothaneConfig(config).mounts.rowAxis, 'y');
});

test('eight-leg static loads balance weight and overturning moments about an offset CG', () => {
  const config = baseline();
  config.mounts.count = 8;
  const centered = staticPreloadState(config);
  const weightN = config.component.massKg * SORBOTHANE_UNITS.G0;
  assert.equal(centered.mounts.length, 8);
  centered.mounts.forEach(mount => {
    close(mount.payloadN, weightN / 8, 1e-12);
    close(mount.lowerLoadN - mount.upperLoadN, weightN / 8, 1e-12);
  });
  config.component.cgM = [0.4, -0.25, 2].map(value => value * SORBOTHANE_UNITS.INCH);
  config.environment.accelerationG = [0.3, -0.2, 0.5];
  const z = config.mounts.planeZM - config.component.cgM[2];
  for (const rowAxis of ['x', 'y']) {
    config.mounts.rowAxis = rowAxis;
    const loaded = staticPreloadState(config);
    close(loaded.mounts.reduce((sum, mount) => sum + mount.payloadN, 0), weightN * 1.5, 1e-12);
    close(loaded.mounts.reduce((sum, mount) => sum + mount.positionM[1] * mount.payloadN, 0), z * weightN * -0.2, 1e-12);
    close(loaded.mounts.reduce((sum, mount) => sum + mount.positionM[0] * mount.payloadN, 0), z * weightN * 0.3, 1e-12);
  }
});

test('eight-leg stiffness uses the actual inner-leg moment arms and closes to analytical bounce response', () => {
  const config = baseline();
  config.mounts.count = 8;
  config.component.cgM = [0, 0, 0];
  config.isolator.extrapolation = 'user';
  const mount = mountDynamicStiffness(config, 180);
  const k = assembleRigidBodyStiffness(config, 180).matrix;
  const [x, y] = config.mounts.spacingM;
  close(k[0][0], 8 * mount.kxNPerM, 1e-12);
  close(k[1][1], 8 * mount.kyNPerM, 1e-12);
  close(k[2][2], 8 * mount.kzNPerM, 1e-12);
  close(k[3][3], 2 * mount.kzNPerM * y ** 2, 1e-12);
  close(k[4][4], 10 / 9 * mount.kzNPerM * x ** 2, 1e-12);
  close(k[5][5], 2 * mount.kxNPerM * y ** 2 + 10 / 9 * mount.kyNPerM * x ** 2, 1e-12);
  k.forEach((row, i) => row.forEach((value, j) => close(value, k[j][i], 1e-12)));
  const four = clone(config);
  four.mounts.count = 4;
  const fourBounce = solveRigidBodyModes(four).modes.find(mode => mode.dominantIndex === 2);
  const eightBounce = solveRigidBodyModes(config).modes.find(mode => mode.dominantIndex === 2);
  close(eightBounce.frequencyHz, fourBounce.frequencyHz * Math.SQRT2, 1e-8);
  const omega = 2 * Math.PI * 180;
  const eta = mount.material.tanDelta;
  const expectedT = k[2][2] * Math.hypot(1, eta) / Math.hypot(k[2][2] - omega ** 2 * config.component.massKg, k[2][2] * eta);
  close(rigidBodyResponseAtFrequency(config, 180, 'z').magnitude[2], expectedT, 1e-10);

  config.mounts.rowAxis = 'y';
  const rotated = assembleRigidBodyStiffness(config, 180).matrix;
  close(rotated[2][2], k[2][2], 1e-12);
  close(rotated[3][3], 10 / 9 * mount.kzNPerM * y ** 2, 1e-12);
  close(rotated[4][4], 2 * mount.kzNPerM * x ** 2, 1e-12);
  close(rotated[5][5], 10 / 9 * mount.kxNPerM * y ** 2 + 2 * mount.kyNPerM * x ** 2, 1e-12);
  const rotatedBounce = solveRigidBodyModes(config).modes.find(mode => mode.dominantIndex === 2);
  close(rotatedBounce.frequencyHz, eightBounce.frequencyHz, 1e-8);
});

test('eight-leg BDF connects eight distinct shell locations and constrains every base grid', () => {
  const config = baseline();
  config.mounts.count = 8;
  config.mounts.rowAxis = 'y';
  const model = generateNastranIsolationBdf(config);
  const gridLines = model.deck.split('\n').filter(line => line.startsWith('GRID,'));
  const grids = new Map(gridLines.map(line => {
    const fields = line.split(',');
    return [Number(fields[1]), fields.slice(3, 6).map(Number)];
  }));
  const bushes = model.deck.split('\n').filter(line => line.startsWith('CBUSH,')).map(line => line.split(','));
  const plateNodes = new Set(model.deck.split('\n').filter(line => line.startsWith('CQUAD4,')).flatMap(line => line.split(',').slice(3).map(Number)));
  assert.equal(model.counts.cbush, 8);
  assert.equal(bushes.length, 8);
  assert.equal(new Set(model.isolators.mountGridIds).size, 8);
  isolationMountCoordinates(config).forEach((point, index) => {
    const top = Number(bushes[index][3]);
    const base = Number(bushes[index][4]);
    assert.ok(plateNodes.has(top));
    grids.get(top).forEach((value, axis) => close(value, point[axis] / SORBOTHANE_UNITS.INCH, 1e-8));
    assert.deepEqual(grids.get(top), grids.get(base));
  });
  assert.match(model.deck, /^SPC1,1,123456,8001,8002,8003,8004,8005,8006\n\+,8007,8008$/m);
  assert.match(model.deck, /SUPPORT LAYOUT: 8 LEGS, 4 PER SIDE/);
  assert.match(model.deck, /EQUALLY SPACED ALONG Y ON THE -X AND \+X SIDES/);
  config.validation.nastran.meshX = config.validation.nastran.meshY = 40;
  const fine = generateNastranIsolationBdf(config);
  const elementIds = fine.deck.split('\n').filter(line => /^(CQUAD4|CBUSH),/.test(line)).map(line => line.split(',')[1]);
  assert.equal(new Set(elementIds).size, elementIds.length, 'shell and bush element IDs must remain unique at maximum mesh density');
});

test('eight-leg studies retain the layout and count hardware for all eight supports', () => {
  const config = baseline();
  config.mounts.count = 8;
  config.mounts.rowAxis = 'y';
  const criteria = { lateralModeMinimumHz: [0.1, 0.1], verticalModeRangeHz: [0.1, 3000], resonanceBandHz: [1, 300], resonanceMaximumDb: 100, tones: [] };
  const screen = screenSorbothaneCatalog(config, {
    geometry: 'washer', odRange: [0.99, 1.01], idRange: [0.44, 0.46], thicknessRange: [0.124, 0.126], stackRange: [1, 1], criteria
  });
  assert.equal(screen.supportCount, 8);
  assert.equal(screen.rowAxis, 'y');
  assert.ok(screen.recommendations.length > 0);
  screen.recommendations.forEach(candidate => {
    assert.equal(candidate.config.mounts.count, 8);
    assert.equal(candidate.config.mounts.rowAxis, 'y');
    assert.equal(candidate.analysis.preload.mounts.length, 8);
    assert.equal(candidate.totalElementCount, 16);
  });
  const grid = runDesignGrid(config, { xVariable: 'thickness', yVariable: 'od', xRange: [0.2, 0.3], yRange: [1.1, 1.4], gridSize: 3 });
  assert.equal(grid.candidates.length, 9);
  assert.ok(grid.candidates.every(candidate => candidate.config.mounts.count === 8 && candidate.config.mounts.rowAxis === 'y' && candidate.analysis.preload.mounts.length === 8));

  const lord = lordBaseline('AM-006-1');
  lord.mounts.count = 8;
  lord.mounts.rowAxis = 'y';
  const lordState = staticPreloadState(lord);
  assert.equal(lordState.mounts.length, 8);
  lordState.mounts.forEach(mount => close(mount.payloadN / SORBOTHANE_UNITS.LBF, 10 / 8, 1e-10));
  const lordScreen = screenParkerLordCatalog(lord, { family: 'AM-006', mountsPerPointRange: [1, 2], criteria });
  assert.ok(lordScreen.recommendations.length > 0);
  assert.equal(lordScreen.rowAxis, 'y');
  lordScreen.recommendations.forEach(candidate => assert.equal(candidate.totalMountCount, candidate.mountsPerPoint * 8));
});

test('eight-leg workbench, drawings, report, and uncertainty all reflect the selected layout', () => {
  const config = baseline();
  config.mounts.count = 8;
  const html = renderSorbothaneIsolationWorkbench(config);
  const isolator = tabPanelHtml(html, 'sorbothane', 'explorer');
  assert.match(html, /data-sorbo-field="mounts.count"/);
  assert.match(html, /data-sorbo-field="mounts.rowAxis"/);
  assert.match(html, /value="8" selected>8 legs · 4 on each side/);
  assert.match(html, /Design an 8-leg captured Sorbothane/);
  assert.match(html, /Component on 8 captured mounts/);
  assert.match(isolator, /8 legs · 4 on each side/);
  assert.match(isolator, /Captured stack · 1 of 8 mounts/);
  assert.match(isolator, /16 Sorbothane elements total/);
  assert.equal((isolator.match(/data-sorbo-support-marker=/g) ?? []).length, 8);
  assert.match(html, /SUPPORT LAYOUT: 8 LEGS, 4 PER SIDE/);

  config.uncertainty.enabled = true;
  config.uncertainty.samples = 8;
  config.analysis.frequencyPoints = 41;
  const analysis = analyzeSorbothaneIsolation(config);
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(analysis.uncertainty.directionalBands[axis].lowerDb.every(Number.isFinite));
    assert.ok(analysis.uncertainty.directionalBands[axis].upperDb.every(Number.isFinite));
  }
  const report = engineeringReport(analysis);
  assert.match(report, /Support layout: 8 legs, 4 on each Y side/);
  assert.doesNotMatch(report, /four identical mounts|four support points/);
});

test('row direction is shown consistently in footprint dimensions, screening, report, and BDF', () => {
  const config = baseline();
  config.mounts.count = 8;
  config.mounts.rowAxis = 'y';
  const html = renderSorbothaneIsolationWorkbench(config);
  const isolator = tabPanelHtml(html, 'sorbothane', 'explorer');
  assert.match(html, /value="y" selected>Along Y · on ±X sides/);
  assert.match(isolator, /rows along Y/);
  assert.match(isolator, /Y row span 6\.5 in · Adjacent legs 2\.167 in/);
  assert.match(isolator, /X row separation 8\.5 in/);
  assert.match(isolator, /−X side/);
  assert.match(isolator, /\+X side/);
  assert.match(html, /Active support layout: 8 legs · rows along Y on the ±X sides/);
  const report = engineeringReport(analyzeSorbothaneIsolation(config, {skipUncertainty: true}));
  assert.match(report, /Support layout: 8 legs, 4 on each X side, equally spaced along Y/);
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

test('standard and water-resistant Sorbothane use distinct formulation and starting-compression datasets', () => {
  const standard = SORBOTHANE_MATERIALS.standard;
  const water = SORBOTHANE_MATERIALS['water-resistant'];
  assert.equal(sorbothaneMaterial('unknown'), standard);
  assert.deepEqual(Object.keys(standard.dynamicYoungsModulusPsi[50]).map(Number), [10, 15, 20]);
  assert.deepEqual(Object.keys(water.dynamicYoungsModulusPsi[50]).map(Number), [10, 15, 20]);
  assert.equal(water.frequencyHz[0], 1);
  assert.equal(water.bulkModulusGPa[50], 3.99);
  assert.equal(water.densityLbFt3[50], 79.78);
  assert.notDeepEqual(water.dynamicYoungsModulusPsi[50][15], standard.dynamicYoungsModulusPsi[50][15]);

  const config = baseline();
  const standardAt5 = sorbothaneDynamicProperties(config, 5);
  const standardAtStartingCompression = [10, 15, 20].map(compressionPct => {
    const state = baseline();
    state.isolator.compressionPct = compressionPct;
    return sorbothaneDynamicProperties(state, 5).storageModulusPsi;
  });
  assert.deepEqual(standardAtStartingCompression, [77, 89, 106]);
  config.isolator.formulation = 'water-resistant';
  const waterAt5 = sorbothaneDynamicProperties(config, 5);
  assert.equal(standardAt5.storageModulusPsi, 89);
  close(waterAt5.storageModulusPsi, 104, 1e-12);
  close(waterAt5.tanDelta, 0.42, 1e-12);
  assert.equal(waterAt5.formulationLabel, 'Water-resistant Sorbothane');
  assert.equal(waterAt5.provenance, 'manufacturer-digitized');
});

test('preload-driven material selection uses its calculated starting compression curve', () => {
  const tenPercent = baseline();
  tenPercent.isolator.compressionPct = 10;
  const preload = staticPreloadState(tenPercent).preloadN;
  const preloadDriven = baseline();
  preloadDriven.isolator.preloadMode = 'preload';
  preloadDriven.isolator.preloadN = preload;
  const property = sorbothaneDynamicProperties(preloadDriven, 5);
  close(property.startingCompressionPct, 10, 1e-9);
  close(property.storageModulusPsi, 77, 1e-9);
});

test('formulation propagates through preload, modal solution, and NASTRAN PBUSH export', () => {
  const standardConfig = baseline();
  const waterConfig = baseline();
  waterConfig.isolator.formulation = 'water-resistant';
  const standardPreload = staticPreloadState(standardConfig);
  const waterPreload = staticPreloadState(waterConfig);
  assert.ok(waterPreload.preloadN > standardPreload.preloadN);

  const standardModes = solveRigidBodyModes(standardConfig).modes;
  const waterModes = solveRigidBodyModes(waterConfig).modes;
  assert.notEqual(waterModes.find(mode => mode.dominantIndex === 2).frequencyHz, standardModes.find(mode => mode.dominantIndex === 2).frequencyHz);

  const standardBdf = generateNastranIsolationBdf(standardConfig);
  const waterBdf = generateNastranIsolationBdf(waterConfig);
  assert.notEqual(waterBdf.isolators.kzLbfPerIn, standardBdf.isolators.kzLbfPerIn);
  assert.match(standardBdf.deck, /CAPTURED STANDARD SORBOTHANE ELEMENT/);
  assert.match(waterBdf.deck, /CAPTURED WATER-RESISTANT SORBOTHANE ELEMENT/);
});

test('catalog includes current washer, ring, disc, and custom records', () => {
  assert.ok(SORBOTHANE_CATALOG.length >= 130);
  assert.ok(SORBOTHANE_CATALOG.some(item => item.geometry === 'washer'));
  assert.ok(SORBOTHANE_CATALOG.some(item => item.geometry === 'ring' && item.ratedLoadLb));
  assert.ok(SORBOTHANE_CATALOG.some(item => item.geometry === 'disc'));
  assert.ok(SORBOTHANE_CATALOG.some(item => item.productNumber === 'custom-ring' && item.provenance === 'engineering-assumption'));
});

test('Parker LORD AM catalog contains all nine families and 126 source-traceable part records', () => {
  assert.equal(PARKER_LORD_AM_FAMILIES.length, 9);
  assert.equal(PARKER_LORD_AM_CATALOG.length, 126);
  assert.equal(new Set(PARKER_LORD_AM_CATALOG.map(item => item.productNumber)).size, 126);
  assert.deepEqual(new Set(PARKER_LORD_AM_CATALOG.map(item => item.elastomer)), new Set(['BTR', 'BTR II', 'MEA']));
  const item = parkerLordCatalogItem('AM-001-2');
  assert.deepEqual({ rated: item.ratedLoadLb, fn: item.nominalNaturalFrequencyHz, axial: item.dynamicAxialSpringRateLbPerIn, radial: item.dynamicRadialSpringRateLbPerIn }, { rated: 3, fn: 17, axial: 89, radial: 74 });
  assert.match(item.source.url, /parker\.com/);
});

test('Parker LORD complete-mount stiffness uses published axial and radial rates directly', () => {
  const config = lordBaseline();
  const mount = mountDynamicStiffness(config, 100);
  close(mount.kzNPerM, 89 * SORBOTHANE_UNITS.LBF / SORBOTHANE_UNITS.INCH, 1e-12);
  close(mount.kxNPerM, 74 * SORBOTHANE_UNITS.LBF / SORBOTHANE_UNITS.INCH, 1e-12);
  close(mount.kyNPerM, mount.kxNPerM, 1e-12);
  assert.equal(mount.material.model, 'catalog-dynamic-spring-rate');
  assert.match(mount.sandwichRule, /complete AM mount/);
});

test('Parker LORD AM rated-load frequency closes and back-to-back installation doubles rate and capacity', () => {
  const config = lordBaseline();
  config.component.massKg = 12 * SORBOTHANE_UNITS.LB;
  const single = analyzeSorbothaneIsolation(config, { skipResponse: true, skipUncertainty: true });
  const vertical = single.modes.find(mode => mode.dominantIndex === 2);
  close(vertical.frequencyHz, 17, 0.005);
  assert.equal(single.preload.catalogCompliant, true);
  close(single.preload.capacityPerPointN, 3 * SORBOTHANE_UNITS.LBF, 1e-12);
  const pairedConfig = clone(config);
  pairedConfig.isolator.mountsPerPoint = 2;
  const paired = mountDynamicStiffness(pairedConfig, 100);
  close(paired.kzNPerM, 2 * mountDynamicStiffness(config, 100).kzNPerM, 1e-12);
  close(staticPreloadState(pairedConfig).capacityPerPointN, 6 * SORBOTHANE_UNITS.LBF, 1e-12);
});

test('NASTRAN export uses the IPS slinch contract and a four-point shell-and-bush topology', () => {
  const config = baseline();
  const model = generateNastranIsolationBdf(config);
  const expectedBoxSlinch = 10 / NASTRAN_IPS_UNITS.lbmPerSlinch;
  const expectedPlateSlinch = 10 * 8 * 0.125 * 0.00026684;
  close(model.box.massSlinch, expectedBoxSlinch, 1e-12);
  close(model.plate.physicalMassSlinch, expectedPlateSlinch, 1e-12);
  close(model.plate.includedMassSlinch, expectedPlateSlinch, 1e-12);
  close(model.totalIncludedMassSlinch, expectedBoxSlinch + expectedPlateSlinch, 1e-12);
  assert.equal(model.plate.densitySlinchPerIn3, 0.00026684);
  assert.equal(model.counts.cbush, 4);
  assert.equal(model.counts.conm2, 1);
  assert.equal(model.counts.rbe3, 1);
  assert.equal(model.counts.rbe2, 0);
  assert.ok(model.counts.cquad4 >= 48);
  assert.match(model.deck, /^SOL 103$/m);
  assert.match(model.deck, /^PARAM,WTMASS,1\.0$/m);
  assert.match(model.deck, /^MAT1,10,1\.0300000E7,,0\.33,2\.6684000E-4$/m);
  assert.match(model.deck, /^PSHELL,20,10,0\.125,/m);
  assert.match(model.deck, /^CONM2,7001,9001,0,/m);
  assert.match(model.deck, /^RBE3,6001,,9001,123456,1\.,123,/m);
  assert.doesNotMatch(model.deck, /^RBE2,/m);
  assert.equal((model.deck.match(/^CQUAD4,/gm) ?? []).length, model.counts.cquad4);
  const cbushCards = model.deck.match(/^CBUSH,.*$/gm) ?? [];
  assert.equal(cbushCards.length, 4);
  assert.ok(cbushCards.every(line => line.endsWith(',,,,0')));
  assert.match(model.deck, /^SPC1,1,123456,8001,8002,8003,8004$/m);
  assert.ok(model.isolators.mountGridIds.every(id => model.plate.xCoordinates.length && model.deck.includes(`,${id},800`)));
});

test('NASTRAN plate material presets keep density and elastic properties synchronized', () => {
  const aluminum = generateNastranIsolationBdf(baseline());
  assert.equal(aluminum.settings.plateMaterial, 'aluminum');
  assert.equal(aluminum.settings.plateDensitySlinchPerIn3, NASTRAN_PLATE_MATERIALS.aluminum.densitySlinchPerIn3);
  assert.equal(aluminum.settings.plateYoungsModulusPsi, NASTRAN_PLATE_MATERIALS.aluminum.youngsModulusPsi);

  const config = baseline();
  config.validation.nastran.plateMaterial = 'steel';
  const steel = generateNastranIsolationBdf(config);
  const preset = NASTRAN_PLATE_MATERIALS.steel;
  const expectedPlateSlinch = 10 * 8 * 0.125 * preset.densitySlinchPerIn3;
  assert.equal(steel.settings.plateMaterial, 'steel');
  assert.equal(steel.settings.plateDensitySlinchPerIn3, preset.densitySlinchPerIn3);
  assert.equal(steel.settings.plateYoungsModulusPsi, preset.youngsModulusPsi);
  assert.equal(steel.settings.platePoisson, preset.poisson);
  close(steel.plate.includedMassSlinch, expectedPlateSlinch, 1e-12);
  assert.match(steel.deck, /^\$ PLATE MATERIAL: STEEL;/m);
  assert.match(steel.deck, /^MAT1,10,2\.9000000E7,,0\.3,7\.3299000E-4$/m);

  const invalid = normalizeSorbothaneConfig({ validation: { nastran: { plateMaterial: 'titanium' } } });
  assert.equal(invalid.validation.nastran.plateMaterial, 'aluminum');
});

test('NASTRAN PBUSH stiffness follows the selected isolator and linearization frequency', () => {
  const config = lordBaseline('AM-001-2');
  config.validation.nastran.stiffnessReferenceMode = 'custom';
  config.validation.nastran.customReferenceFrequencyHz = 137;
  const single = generateNastranIsolationBdf(config);
  close(single.isolators.referenceFrequencyHz, 137, 1e-12);
  close(single.isolators.kzLbfPerIn, 89, 1e-8);
  close(single.isolators.kxLbfPerIn, 74, 1e-8);
  const pbushFields = single.deck.match(/^PBUSH,.*$/m)[0].split(',');
  close(Number(pbushFields[3]), 74, 1e-8);
  close(Number(pbushFields[4]), 74, 1e-8);
  close(Number(pbushFields[5]), 89, 1e-8);
  assert.doesNotMatch(single.warnings.join(' '), /frequency-dependent modulus/);

  config.isolator.mountsPerPoint = 2;
  const paired = generateNastranIsolationBdf(config);
  close(paired.isolators.kzLbfPerIn, 178, 1e-8);
  close(paired.isolators.kxLbfPerIn, 148, 1e-8);
});

test('NASTRAN correlation options make massless-plate and rigid-footprint assumptions explicit', () => {
  const config = baseline();
  config.validation.nastran.massAccounting = 'preserve-browser';
  config.validation.nastran.coupling = 'rbe2';
  const model = generateNastranIsolationBdf(config);
  assert.equal(model.plate.includedMassSlinch, 0);
  close(model.totalIncludedMassSlinch, model.box.massSlinch, 1e-12);
  assert.equal(model.counts.rbe2, 1);
  assert.equal(model.counts.rbe3, 0);
  assert.match(model.deck, /^MAT1,10,1\.0300000E7,,0\.33,$/m);
  assert.match(model.deck, /^RBE2,6001,9001,123456,/m);
  assert.doesNotMatch(model.deck, /^RBE3,/m);
  assert.match(model.warnings.join(' '), /plate density is omitted/i);
  assert.match(model.warnings.join(' '), /apparent plate stiffness/i);
});

test('Parker LORD catalog screening evaluates every eligible part and single/back-to-back arrangement', async () => {
  const config = lordBaseline('AM-006-1');
  const criteria = { lateralModeMinimumHz: [1, 1], verticalModeRangeHz: [1, 100], resonanceBandHz: [1, 100], resonanceMaximumDb: 100, tones: [] };
  const sync = screenParkerLordCatalog(config, { family: 'AM-006', mountsPerPointRange: [1, 2], criteria });
  assert.equal(sync.library, 'parker-lord-am');
  assert.equal(sync.eligiblePartCount, 14);
  assert.equal(sync.combinationCount, 28);
  assert.ok(sync.recommendations.length > 0);
  assert.ok(sync.recommendations.every(candidate => candidate.item.family === 'AM-006'));
  const progress = [];
  const asyncScreen = await screenParkerLordCatalogAsync(config, { family: 'AM-006', mountsPerPointRange: [1, 2], criteria }, { batchSize: 5, yieldControl: async () => {}, onProgress: update => progress.push(update) });
  assert.equal(asyncScreen.combinationCount, 28);
  assert.equal(progress.at(-1).percent, 100);
  assert.ok(progress.every((update, index) => index === 0 || update.percent >= progress[index - 1].percent));
});

test('Parker LORD workbench exposes complete-mount data, library screening, and meaningful explorer variables', () => {
  const config = lordBaseline('AM-006-1');
  const html = renderSorbothaneIsolationWorkbench(config, {}, { library: 'parker-lord-am' });
  const isolatorHtml = tabPanelHtml(html, 'sorbothane', 'explorer');
  const explorerHtml = tabPanelHtml(html, 'explorer', 'assumptions');
  assert.match(html, /Parker LORD AM mounts/);
  assert.match(html, /data-sorbo-model-choice="parker-lord-am" class="active"/);
  assert.match(html, /126 records/);
  assert.match(html, /Axial dynamic rate/);
  assert.match(html, /Radial dynamic rate/);
  assert.match(html, /Resultant load versus rated capacity/);
  assert.match(html, /Open official Parker LORD catalog/);
  assert.match(isolatorHtml, /Reference footprint/);
  assert.match(isolatorHtml, /Single complete mount · 1 of 4 points/);
  assert.doesNotMatch(explorerHtml, /Current Parker LORD mount and arrangement drawings/);
  assert.match(html, /Dynamic spring-rate scale/);
  assert.match(html, /Loss factor η/);
  assert.doesNotMatch(html, /data-explorer="xVariable">[^<]*<option value="durometer"/);
  assert.doesNotMatch(html, /Element thickness<small>/);
});

test('workbench preserves trailing-zero requirement frequencies in rendered labels', () => {
  const config = baseline();
  config.uncertainty.enabled = true;
  const html = renderSorbothaneIsolationWorkbench(config);
  const isolatorHtml = tabPanelHtml(html, 'sorbothane', 'explorer');
  const explorerHtml = tabPanelHtml(html, 'explorer', 'assumptions');
  assert.match(html, />600 Hz · Txx</);
  assert.match(html, />1200 Hz · Txx</);
  assert.match(html, />1400 Hz · Txx</);
  assert.match(html, />100-200 Hz · Txx peak</);
  assert.match(html, /data-sorbo-inset-axis="0"/);
  assert.match(html, /Mount plane relative to CG/);
  assert.match(html, /data-sorbo-field="isolator.formulation"/);
  assert.match(html, /value="standard" selected>Standard Sorbothane/);
  assert.match(html, /value="water-resistant">Water-resistant Sorbothane/);
  assert.match(html, /Durometer \(Shore 00\)/);
  assert.match(html, /data-sorbo-catalog-progress/);
  assert.match(html, /data-sorbo-action="export-nastran-bdf"/);
  assert.match(html, /data-nastran-field="plateThicknessIn"/);
  assert.match(html, /data-nastran-field="plateMaterial"/);
  assert.match(html, />Aluminum</);
  assert.match(html, />Steel</);
  assert.doesNotMatch(html, /data-nastran-field="plateDensitySlinchPerIn3"/);
  assert.doesNotMatch(html, /data-nastran-field="plateYoungsModulusPsi"|data-nastran-field="platePoisson"/);
  assert.match(html, /in · lbf · s · slinch/);
  assert.match(html, /PARAM,WTMASS,1\.0/);
  assert.match(html, /CQUAD4/);
  assert.match(html, /CBUSH/);
  assert.match(html, /CONM2/);
  assert.match(html, /RBE3 distributed/);
  assert.match(html, /data-sorbo-action="load-current-into-explorer"/);
  assert.match(html, /Current analysis design/);
  assert.match(isolatorHtml, /aria-label="Dimensioned 2D drawing of current Sorbothane element"/);
  assert.match(isolatorHtml, /aria-label="Captured mount stack configuration"/);
  assert.match(isolatorHtml, /Selected part geometry/);
  assert.match(isolatorHtml, /Captured stack · 1 of 4 mounts/);
  assert.match(isolatorHtml, /UPPER STACK · 1/);
  assert.match(isolatorHtml, /LOWER STACK · 1/);
  assert.match(isolatorHtml, /element in series/);
  assert.match(isolatorHtml, /act in parallel dynamically/);
  assert.match(isolatorHtml, /No rigid short circuit modeled/);
  assert.doesNotMatch(explorerHtml, /Current isolator and stack drawings/);
  assert.match(html, /Add tone criterion/);
  assert.match(html, /data-catalog-criterion="verticalMinHz"/);
  assert.match(html, /data-catalog-criterion="xTranslationMinHz"/);
  assert.match(html, /data-catalog-criterion="yTranslationMinHz"/);
  assert.match(html, /X translation-dominated mode/);
  assert.match(html, /Y translation-dominated mode/);
  assert.match(html, /Z translation-dominated mode/);
  assert.match(html, /X translation mode minimum/);
  assert.match(html, /Vertical mode minimum/);
  assert.match(html, /Resonance band minimum/);
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
  assert.doesNotMatch(html, /sorbo-fixed-criterion/);
  const noToneConfig = baseline();
  noToneConfig.analysis.tones = [];
  const noToneHtml = renderSorbothaneIsolationWorkbench(noToneConfig);
  assert.match(noToneHtml, /No discrete-frequency attenuation criteria are active/);
  assert.match(noToneHtml, />0 tone criteria plus resonance limit</);
});

test('shared criteria update the saved analysis and override stale catalog-only values in both libraries', () => {
  for (const original of [baseline(), lordBaseline()]) {
    const snapshot = clone(original);
    const config = updateSorbothaneCriteria(original, {
      xTranslationMinHz: 55, yTranslationMinHz: 65, verticalMinHz: 110, verticalMaxHz: 210,
      resonanceMinHz: 80, resonanceMaxHz: 350, resonanceMaximumDb: 10,
      toneCriteria: [{ frequencyHz: 900, maximumDb: -17 }]
    });
    assert.deepEqual(original, snapshot, 'updating criteria must not mutate the previous design');
    assert.deepEqual(config.analysis.lateralModeMinimumHz, [55, 65]);
    assert.deepEqual(config.analysis.modeAcceptBandHz, [110, 210]);
    assert.deepEqual(config.analysis.resonanceBandHz, [80, 350]);
    assert.equal(config.analysis.resonanceLimitDb, 10);
    assert.deepEqual(config.analysis.tones, [{ frequencyHz: 900, maximumDb: -17 }]);
    const persisted = JSON.parse(JSON.stringify(config));
    const html = renderSorbothaneIsolationWorkbench(persisted, {}, {
      geometry: 'washer', stackMin: 2, stackMax: 3,
      xTranslationMinHz: 1, yTranslationMinHz: 1, verticalMinHz: 1, verticalMaxHz: 2,
      resonanceMinHz: 1, resonanceMaxHz: 2, resonanceMaximumDb: 6, toneCriteria: []
    });
    assert.equal((html.match(/data-catalog-criterion="resonanceMaximumDb"/g) ?? []).length, 1);
    assert.doesNotMatch(html, /data-sorbo-field="analysis.resonanceLimitDb"/);
    for (const [key, value] of Object.entries({ xTranslationMinHz: 55, yTranslationMinHz: 65, verticalMinHz: 110, verticalMaxHz: 210, resonanceMinHz: 80, resonanceMaxHz: 350, resonanceMaximumDb: 10 })) {
      assert.match(html, new RegExp(`data-catalog-criterion="${key}"[^>]*value="${value}"`));
    }
    assert.match(html, /value="900" data-catalog-tone-index="0"/);
    assert.match(html, /Shared analysis criteria/);
    assert.match(html, /One shared set of requirements/);
    assert.doesNotMatch(html, /Applied when you use a design/);
    if (config.isolator.kind !== 'parker-lord-am') {
      assert.match(html, /value="washer" selected>Washers/);
      assert.match(html, /data-catalog-screen="stackMin"[^>]*value="2"/);
    }
  }
});

test('shared tone additions, edits and removals appear in the single criteria editor', () => {
  let config = updateSorbothaneCriteria(baseline(), { toneCriteria: [{ frequencyHz: 800, maximumDb: -15 }] });
  config = updateSorbothaneCriteria(config, { toneCriteria: [{ frequencyHz: 850, maximumDb: -18 }] });
  let html = renderSorbothaneIsolationWorkbench(config);
  assert.match(html, /value="-18" data-catalog-tone-index="0" data-catalog-tone-field="maximumDb"/);
  assert.doesNotMatch(html, /data-sorbo-field="analysis.tones\./);
  assert.match(html, /value="850" data-catalog-tone-index="0"/);
  config = updateSorbothaneCriteria(config, { toneCriteria: [] });
  html = renderSorbothaneIsolationWorkbench(config, {}, { toneCriteria: [{ frequencyHz: 1200, maximumDb: -20 }] });
  assert.doesNotMatch(html, /data-sorbo-field="analysis.tones\./);
  assert.equal((html.match(/data-sorbo-action="remove-catalog-tone"/g) ?? []).length, 0);
  assert.match(html, /No discrete-frequency attenuation criteria are active/);
});

test('shared criteria preserve valid values, reject blank/nonfinite edits and normalize frequency bands', () => {
  const original = baseline();
  const changed = updateSorbothaneCriteria(original, { resonanceMaximumDb: '', xTranslationMinHz: NaN, resonanceMinHz: 400, resonanceMaxHz: 80, yTranslationMinHz: -1 });
  assert.equal(changed.analysis.resonanceLimitDb, original.analysis.resonanceLimitDb);
  assert.equal(changed.analysis.lateralModeMinimumHz[0], original.analysis.lateralModeMinimumHz[0]);
  assert.equal(changed.analysis.lateralModeMinimumHz[1], 0.1);
  assert.deepEqual(changed.analysis.resonanceBandHz, [80, 400]);
  assert.equal(updateSorbothaneCriteria(changed, { resonanceMaximumDb: 0 }).analysis.resonanceLimitDb, 0);
});

test('catalog screening and design sweeps use the same saved resonance limit without a criteria override', () => {
  const config = baseline();
  config.component.massKg = 25 * SORBOTHANE_UNITS.LB;
  config.mounts.count = 8;
  config.mounts.rowAxis = 'y';
  config.mounts.stackTop = config.mounts.stackBottom = 2;
  const part = SORBOTHANE_CATALOG.find(item => item.productNumber === '0510945-70-10');
  Object.assign(config.isolator, { productNumber: part.productNumber, geometry: part.geometry, durometer: part.durometer, odM: part.odIn * SORBOTHANE_UNITS.INCH, idM: part.idIn * SORBOTHANE_UNITS.INCH, thicknessM: part.thicknessIn * SORBOTHANE_UNITS.INCH });
  const filters = { geometry: 'ring', odRange: [3.99, 4.01], idRange: [2.99, 3.01], thicknessRange: [.49, .51], stackRange: [2, 2] };
  for (const [limit, expectedPass] of [[6, false], [10, true]]) {
    const shared = updateSorbothaneCriteria(config, { resonanceMaximumDb: limit, resonanceMaxHz: 300, toneCriteria: [{ frequencyHz: 1200, maximumDb: -20 }] });
    const screen = screenSorbothaneCatalog(shared, filters);
    assert.equal(screen.criteria.resonanceMaximumDb, limit);
    assert.equal(screen.recommendations.some(candidate => candidate.item.productNumber === part.productNumber), expectedPass);
    const grid = runDesignGrid(shared, { xVariable: 'thickness', yVariable: 'od', xRange: [.49, .51], yRange: [3.99, 4.01], gridSize: 3 });
    const reference = grid.candidates.find(candidate => candidate.isReference);
    assert.ok(reference);
    assert.equal(reference.config.analysis.resonanceLimitDb, limit);
    assert.equal(reference.pass, expectedPass);
  }
});

test('changing only shared acceptance limits leaves the physical uncertainty envelopes unchanged', () => {
  const config = baseline();
  config.uncertainty.enabled = true;
  config.uncertainty.samples = 8;
  config.analysis.frequencyPoints = 41;
  const original = analyzeSorbothaneIsolation(config);
  const updated = updateSorbothaneCriteria(config, {
    resonanceMaximumDb: 12, resonanceMinHz: 50, resonanceMaxHz: 400,
    toneCriteria: config.analysis.tones.map(tone => ({ ...tone, maximumDb: 0 }))
  });
  const changed = analyzeSorbothaneIsolation(updated);
  assert.deepEqual(changed.uncertainty, original.uncertainty);
  assert.deepEqual(changed.directionalResponses, original.directionalResponses);
  assert.equal(changed.config.analysis.resonanceLimitDb, 12);
});

test('water-resistant formulation is visible in the Isolator workflow and engineering report', () => {
  const config = baseline();
  config.isolator.formulation = 'water-resistant';
  const analysis = analyzeSorbothaneIsolation(config, { skipUncertainty: true });
  const html = renderSorbothaneIsolationWorkbench(config);
  const isolatorHtml = tabPanelHtml(html, 'sorbothane', 'explorer');
  assert.match(html, /value="water-resistant" selected>Water-resistant Sorbothane/);
  assert.match(isolatorHtml, /Water-resistant Sorbothane · 15% starting compression/);
  assert.match(isolatorHtml, /1–300 Hz/);
  assert.match(isolatorHtml, /3\.99 GPa/);
  assert.match(isolatorHtml, /79\.78 lb\/ft³/);
  assert.match(html, /Confirm water-resistant availability, rated load, and the orderable part number/);
  assert.match(analysis.warnings.join(' '), /do not confirm water-resistant availability/);
  assert.match(engineeringReport(analysis), /Material formulation: Water-resistant Sorbothane/);

  const lordHtml = renderSorbothaneIsolationWorkbench(lordBaseline());
  assert.doesNotMatch(lordHtml, /data-sorbo-field="isolator.formulation"/);
});

test('selected design drawings follow catalog geometry and asymmetric stack counts', () => {
  const config = baseline();
  const item = SORBOTHANE_CATALOG.find(candidate => candidate.geometry === 'disc' && candidate.productNumber !== 'custom-ring');
  assert.ok(item, 'disc catalog item was not found');
  config.isolator.productNumber = item.productNumber;
  config.isolator.odM = item.odIn * SORBOTHANE_UNITS.INCH;
  config.isolator.idM = item.idIn * SORBOTHANE_UNITS.INCH;
  config.isolator.thicknessM = item.thicknessIn * SORBOTHANE_UNITS.INCH;
  config.isolator.durometer = item.durometer;
  config.mounts.stackTop = 2;
  config.mounts.stackBottom = 3;
  const html = renderSorbothaneIsolationWorkbench(config);
  assert.match(html, new RegExp(`${item.productNumber} · Disc`));
  assert.match(html, /Solid disc · no center bore/);
  assert.match(html, /UPPER STACK · 2/);
  assert.match(html, /LOWER STACK · 3/);
  assert.match(html, /2 upper elements and 3 lower elements capture the isolated plate/);
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

const matrixRingStudy = () => {
  const config = baseline();
  const item = SORBOTHANE_CATALOG.find(part => part.productNumber === '0510845-70-10');
  config.component.massKg = 25 * SORBOTHANE_UNITS.LB;
  config.mounts.count = 8;
  config.mounts.rowAxis = 'y';
  Object.assign(config.isolator, { productNumber: item.productNumber, geometry: item.geometry, durometer: item.durometer,
    odM: item.odIn * SORBOTHANE_UNITS.INCH, idM: item.idIn * SORBOTHANE_UNITS.INCH, thicknessM: item.thicknessIn * SORBOTHANE_UNITS.INCH });
  Object.assign(config.analysis, { lateralModeMinimumHz: [80, 80], modeAcceptBandHz: [80, 300], resonanceBandHz: [80, 300], resonanceLimitDb: 100, tones: [{ frequencyHz: 1200, maximumDb: 0 }] });
  return config;
};

test('matrix points resolve their own exact geometry and durometer load rating', () => {
  const config = matrixRingStudy();
  const snapshot = clone(config);
  const grid = runDesignGrid(config, { xVariable: 'thickness', yVariable: 'od', xRange: [.375, .625], yRange: [1.5, 2.5], gridSize: 3 });
  const cell = grid.cells[1][1];
  assert.equal(cell.config.isolator.productNumber, '0510825-70-10');
  assert.deepEqual(cell.catalogItem.ratedLoadLb, [75, 185]);
  cell.analysis.preload.ratedLoadN.forEach((value, index) => close(value / SORBOTHANE_UNITS.LBF, [75, 185][index]));
  assert.equal(cell.analysis.preload.catalogCompliant, true);
  assert.equal(cell.checks.find(check => check.id === 'rated-load').pass, true);
  assert.equal(cell.pass, false);
  assert.deepEqual(cell.failures.map(check => check.id), ['x-mode', 'y-mode']);
  assert.match(cell.failures[0].detail, /65\.2 Hz; minimum 80\.0 Hz/);
  assert.match(cell.failures[1].detail, /62\.2 Hz; minimum 80\.0 Hz/);
  assert.equal(grid.cells[2][1].config.isolator.productNumber, snapshot.isolator.productNumber);
  assert.equal(grid.cells[2][1].pass, true);
  assert.deepEqual(config, snapshot, 'a sweep must not mutate the installed design');
});

test('unmatched matrix geometries never inherit a parent rating or receive an unqualified PASS', () => {
  const config = matrixRingStudy();
  Object.assign(config.analysis, { lateralModeMinimumHz: [.1, .1], modeAcceptBandHz: [.1, 1e6], tones: [] });
  const grid = runDesignGrid(config, { xVariable: 'thickness', yVariable: 'od', xRange: [.49, .51], yRange: [2.03, 2.05], gridSize: 3 });
  const cell = grid.cells[1][1];
  assert.equal(cell.config.isolator.productNumber, 'custom-ring');
  assert.equal(cell.catalogItem, null);
  assert.equal(cell.analysis.preload.ratedLoadN, null);
  assert.equal(cell.analysis.passes, true, 'the calculated dynamic checks pass');
  assert.equal(cell.pass, false, 'catalog load verification is still required');
  assert.deepEqual(cell.failures.map(check => check.id), ['rated-load']);
  assert.equal(cell.failures[0].code, 'RATE?');
  assert.match(cell.failures[0].detail, /No exact catalog match/);
  assert.ok(grid.values.flat().every(Number.isFinite), 'removed tones must not remove the requested 1200 Hz map output');
  const expected = Math.max(...['x', 'y', 'z'].map((axis, index) => rigidBodyResponseAtFrequency(cell.config, 1200, axis).db[index]));
  close(cell.value, expected);
});

test('durometer sweeps use each published grade rating and mark interpolated grades unverified', () => {
  const config = matrixRingStudy();
  config.isolator.odM = 2 * SORBOTHANE_UNITS.INCH;
  const grid = runDesignGrid(config, { xVariable: 'durometer', yVariable: 'mass', xRange: [30, 70], yRange: [20, 30], gridSize: 3 });
  for (const [column, grade, rating] of [[0, 30, [6, 13]], [1, 50, [17, 39]], [2, 70, [75, 185]]]) {
    const cell = grid.cells[1][column];
    assert.equal(cell.config.isolator.productNumber, `0510825-${grade}-10`);
    assert.deepEqual(cell.catalogItem.ratedLoadLb, rating);
  }
  const interpolated = runDesignGrid(config, { xVariable: 'durometer', yVariable: 'mass', xRange: [40, 60], yRange: [20, 30], gridSize: 3 });
  assert.equal(interpolated.cells[1][0].catalogItem, null);
  assert.equal(interpolated.cells[1][0].pass, false);
});

test('matrix catalog matching supports annular washers and solid discs without mixing their geometry models', () => {
  const config = matrixRingStudy();
  config.isolator.odM = 1.5 * SORBOTHANE_UNITS.INCH;
  const washerGrid = runDesignGrid(config, { xVariable: 'mass', yVariable: 'compression', xRange: [20, 30], yRange: [10, 20], gridSize: 3 });
  assert.equal(washerGrid.cells[1][1].config.isolator.productNumber, '0510050-70-10');
  assert.equal(washerGrid.cells[1][1].config.isolator.geometry, 'washer');
  Object.assign(config.isolator, { geometry: 'disc', odM: SORBOTHANE_UNITS.INCH, idM: 0 });
  const discGrid = runDesignGrid(config, { xVariable: 'mass', yVariable: 'compression', xRange: [20, 30], yRange: [10, 20], gridSize: 3 });
  assert.equal(discGrid.cells[1][1].config.isolator.productNumber, '0531050-70-10');
  assert.equal(discGrid.cells[1][1].config.isolator.geometry, 'disc');
});

test('every matrix cell retains status and full modal, directional response, load, compression and contact failures', () => {
  const config = matrixRingStudy();
  config.environment.accelerationG[2] = 1000;
  Object.assign(config.analysis, { lateralModeMinimumHz: [1e6, 1e6], modeAcceptBandHz: [1e6, 2e6], resonanceLimitDb: -100, tones: [{ frequencyHz: 1200, maximumDb: -100 }] });
  const grid = runDesignGrid(config, { xVariable: 'mass', yVariable: 'compression', xRange: [20, 30], yRange: [4, 6], gridSize: 3 });
  const cell = grid.cells[1][1];
  const ids = cell.failures.map(check => check.id);
  for (const id of ['x-mode', 'y-mode', 'z-mode', 'tone-1200-X', 'tone-1200-Y', 'tone-1200-Z', 'peak-x', 'peak-y', 'peak-z', 'rated-load', 'engagement', 'compression']) assert.ok(ids.includes(id), `${id} failure missing`);
  assert.equal(grid.cells.flat().length, 9);
  assert.ok(grid.cells.flat().every(candidate => candidate.failures.length && !candidate.pass));
  const invalid = runDesignGrid(config, { xVariable: 'id', yVariable: 'od', xRange: [2, 3], yRange: [1, 2], gridSize: 3 });
  assert.equal(invalid.cells.flat().length, 9);
  assert.ok(invalid.cells.flat().every(candidate => !candidate.pass && candidate.failures[0].id === 'invalid'));
  assert.ok(invalid.values.flat().every(Number.isNaN));
  assert.match(renderSorbothaneExplorerResult(invalid), /Geometry requires OD &gt; ID/);
});

test('matrix renders a selectable PASS or REVIEW in every cell and exposes values and limits for the selected cell', () => {
  const grid = runDesignGrid(matrixRingStudy(), { xVariable: 'thickness', yVariable: 'od', xRange: [.375, .625], yRange: [1.5, 2.5], gridSize: 3 });
  const html = renderSorbothaneExplorerResult(grid);
  assert.equal((html.match(/data-explorer-row=/g) ?? []).length, 9);
  assert.equal((html.match(/class="sorbo-cell-status /g) ?? []).length, 9);
  assert.match(html, /class="sorbo-cell-status is-pass"[^>]*>PASS/);
  assert.match(html, /class="sorbo-cell-status is-review"[^>]*>REVIEW/);
  assert.match(html, /role="button" tabindex="0" aria-pressed="true"/);
  assert.match(html, /0510825-70-10 · ring · 70 Shore 00/);
  assert.match(html, /Failed or unverified criteria \(2\)/);
  assert.match(html, /65\.2 Hz; minimum 80\.0 Hz/);
  assert.match(html, /rated 75\.0–185\.0 lbf per element/);
  grid.selectedRow = 2;
  const selected = renderSorbothaneExplorerResult(grid);
  assert.match(selected, /Selected cell · thickness 0\.5 \/ od 2\.5/);
  assert.match(selected, /All active criteria and catalog load checks pass/);
});

test('Parker LORD matrix keeps the complete-mount rating and water-resistant Sorbothane flags catalog confirmation', () => {
  const lord = lordBaseline();
  const grid = runDesignGrid(lord, { xVariable: 'mass', yVariable: 'stiffnessScale', xRange: [5, 15], yRange: [.9, 1.1], gridSize: 3, output: 'peak' });
  assert.ok(grid.cells.flat().every(cell => cell.config.isolator.productNumber === lord.isolator.productNumber));
  assert.ok(grid.cells.flat().every(cell => cell.checks.find(check => check.id === 'rated-load').code === 'LOAD'));
  const water = matrixRingStudy();
  water.isolator.formulation = 'water-resistant';
  const waterGrid = runDesignGrid(water, { xVariable: 'mass', yVariable: 'compression', xRange: [20, 30], yRange: [10, 20], gridSize: 3 });
  assert.ok(waterGrid.cells.flat().every(cell => !cell.pass && cell.failures.some(check => check.id === 'formulation')));
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
  assert.equal(screen.formulation, 'standard');
  assert.equal(screen.eligiblePartCount, 9);
  assert.equal(screen.combinationCount, 18);
  assert.ok(screen.dynamicallyEvaluatedCount > 0);
  assert.ok(screen.recommendations.length > 0);
  assert.ok(screen.recommendations.every(candidate => candidate.pass));
  assert.ok(screen.recommendations.every(candidate => candidate.config.isolator.formulation === 'standard'));
  assert.ok(screen.recommendations.every(candidate => candidate.item.geometry === 'washer'));
  assert.ok(screen.recommendations.every(candidate => candidate.item.odIn === 1));
  assert.ok(screen.recommendations.every(candidate => candidate.stackCount >= 1 && candidate.stackCount <= 2));
  assert.ok(screen.recommendations.every(candidate => candidate.installedLoadRangeLb[0] >= candidate.item.ratedLoadLb[0]));
  assert.ok(screen.recommendations.every(candidate => candidate.installedLoadRangeLb[1] <= candidate.item.ratedLoadLb[1]));
  const twoStack = screen.recommendations.find(candidate => candidate.item.productNumber === '0510012-50-10');
  assert.equal(twoStack?.stackCount, 2);
  assert.equal(twoStack?.totalElementCount, 16);
});

test('Sorbothane and Parker LORD retain all passing catalog parts and share the display-only result selector', () => {
  const config = baseline();
  config.component.massKg = SORBOTHANE_UNITS.LB;
  Object.assign(config.analysis, { lateralModeMinimumHz: [.1, .1], modeAcceptBandHz: [.1, 1e6], resonanceLimitDb: 100, tones: [] });
  const sorbothane = screenSorbothaneCatalog(config, { stackRange: [1, 1] });
  const lord = clone(config);
  lord.isolator.kind = 'parker-lord-am';
  lord.isolator.productNumber = 'AM-001-2';
  const parker = screenParkerLordCatalog(lord, { ratedLoadRange: [0, 100], mountsPerPointRange: [1, 1] });
  for (const screen of [sorbothane, parker]) {
    assert.ok(screen.passingPartCount > 100);
    assert.equal(screen.recommendations.length, screen.passingPartCount);
    for (const limit of [25, 50, 100, 'all']) {
      const count = limit === 'all' ? screen.passingPartCount : limit;
      const html = catalogScreenResult(screen, null, limit);
      assert.match(html, new RegExp(`Showing ${count} of ${screen.passingPartCount} passing part numbers`));
      assert.equal((html.match(/data-sorbo-catalog-use=/g) ?? []).length, count + 1);
    }
  }
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
