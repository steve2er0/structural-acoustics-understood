import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  STEINBERG_COMPONENTS,
  componentPlacementState,
  parseComponentTable,
  pcbDesignTradeState,
  pcbModeCurvatureState,
  pcbRandomResponseState,
  pcbTestCorrelationState,
  pcbTestLayoutState,
  spectralFatigueComparisonState,
  steinbergAllowableDisplacement,
  steinbergDamageLedgerState,
  steinbergDisplacementState,
  steinbergLocationFactor,
  synthesizedRainflowState,
  threeSigmaDurationState
} from '../js/electronics-fatigue-physics.js';
import { electronicsFatigueCalculatorRegistry } from '../js/electronics-fatigue-calculators.js';
import {
  electronicsFatigueCaseNotes,
  electronicsFatigueDemos,
  electronicsFatigueSections,
  electronicsFatigueToolCatalog
} from '../js/electronics-fatigue-data.js';
import { electronicsFatiguePreviewSvg, electronicsFatigueSupportedDemoIds } from '../js/electronics-fatigue-demos.js';
import { electronicsFatigueVisualKinds, electronicsFatigueVisualSvg } from '../js/electronics-fatigue-visuals.js';
import { buildDemoTakeaway } from '../js/demo-takeaways.js';

const nearly = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test('Steinberg millimetre implementation is exactly equivalent to the inch coefficient', () => {
  const displacementMm = steinbergAllowableDisplacement({ boardSpanMm: 25.4, boardThicknessMm: 25.4, componentLengthMm: 25.4, componentCoefficient: 1, locationFactor: 1 });
  nearly(displacementMm / 25.4, 0.00022, 1e-14);
});

test('location factor and center/local bases are applied once', () => {
  nearly(steinbergLocationFactor(0.5, 0.5), 1);
  nearly(steinbergLocationFactor(0.25, 0.25), 0.5, 1e-12);
  const center = steinbergDisplacementState({ xFraction: 0.25, yFraction: 0.25, response3SigmaMm: 0.4, responseBasis: 'center' });
  const local = steinbergDisplacementState({ xFraction: 0.25, yFraction: 0.25, response3SigmaMm: 0.2, responseBasis: 'local' });
  nearly(center.responseLocalMm, 0.2, 1e-12);
  nearly(center.ratio, local.ratio, 1e-12);
});

test('numerical broad flat PSD response closes to Miles narrowband result', () => {
  const state = pcbRandomResponseState({ spectrum: [{ frequency: 1, psd: 0.01 }, { frequency: 10000, psd: 0.01 }], naturalFrequencyHz: 100, qualityFactor: 10, durationSeconds: 60 });
  assert.ok(Math.abs(state.relativeRmsMm / state.milesRelativeRmsMm - 1) < 0.01);
  assert.ok(Math.abs(state.responseGrms / state.milesAccelerationGrms - 1) < 0.01);
  nearly(state.relative3SigmaMm, 3 * state.relativeRmsMm);
  assert.equal(state.accelerationH2.length, state.frequencies.length);
  nearly(state.cumulativeRelativeVarianceFraction.at(-1), 1, 1e-12);
});

test('PCB random-response calculator accepts browser-form numeric strings', () => {
  const calculator = electronicsFatigueCalculatorRegistry['pcb-random-response'];
  const defaults = Object.fromEntries(calculator.inputs.map(input => [input.key, String(input.default)]));
  const result = calculator.compute(defaults);
  assert.ok(result.values.some(value => value.label === 'Relative displacement 3σ'));
});

test('component placement ranks demand without double-counting the location factor', () => {
  const components = parseComponentTable('CENTER, 0.5, 0.5, 25, x, bga\nQUARTER, 0.25, 0.25, 25, x, bga');
  const state = componentPlacementState({ center3SigmaMm: 0.3, components });
  assert.equal(state.controlling.name, 'CENTER');
  const center = state.rows.find(row => row.name === 'CENTER');
  const quarter = state.rows.find(row => row.name === 'QUARTER');
  nearly(quarter.locationFactor, 0.5, 1e-12);
  nearly(quarter.ratio / center.ratio, 0.5, 1e-12);
});

test('multimode PCB field keeps simple supports nodal and links curvature to surface strain', () => {
  const first = pcbModeCurvatureState({ boardSpanXMm: 180, boardSpanYMm: 120, boardThicknessMm: 1.6, modeX: 1, modeY: 1, peakDisplacementMm: 0.3, components: [{ name: 'CENTER', xFraction: 0.5, yFraction: 0.5 }] });
  nearly(first.grid[0][15].displacementMm, 0, 1e-12);
  nearly(first.grid[10][0].displacementMm, 0, 1e-12);
  nearly(first.grid[10][15].displacementMm, 0.3, 1e-12);
  assert.ok(first.maxima.surfaceStrainMicrostrain > 0);
  nearly(first.componentRows[0].modeParticipation, 1, 1e-12);
  const second = pcbModeCurvatureState({ modeX: 2, modeY: 1, components: [{ name: 'NODE', xFraction: 0.5, yFraction: 0.5 }] });
  nearly(second.componentRows[0].displacementMm, 0, 1e-12);
  assert.ok(second.modeCards.some(mode => mode.modeX === 3 && mode.modeY === 1));
});

test('three-band and Rayleigh methods share one explicit S-N basis', () => {
  const state = spectralFatigueComparisonState({ stressRms: 10, referenceStress: 40, referenceCycles: 20_000_000, fatigueExponent: 6.4, cycleRateHz: 300, durationSeconds: 60, repeats: 1 });
  nearly(state.threeBandFraction, 0.9973, 1e-12);
  nearly(state.plus3DbDamageFactor, 2 ** 3.2, 1e-12);
  assert.ok(state.threeBandDamage > 0);
  assert.ok(state.rayleighDamage > 0);
  assert.equal(state.amplitudes.length, state.damageDensity.length);
  assert.ok(state.amplitudes[state.damageDensity.indexOf(Math.max(...state.damageDensity))] > state.amplitudes[state.rayleighPdf.indexOf(Math.max(...state.rayleighPdf))]);
});

test('synthesized response is deterministic, RMS-normalized, and rainflow damage scales with stress', () => {
  const low = synthesizedRainflowState({ stressRms: 5, dominantFrequencyHz: 300, fractionalBandwidth: 0.2, durationSeconds: 60, fatigueExponent: 6, seed: 537 });
  const repeated = synthesizedRainflowState({ stressRms: 5, dominantFrequencyHz: 300, fractionalBandwidth: 0.2, durationSeconds: 60, fatigueExponent: 6, seed: 537 });
  const high = synthesizedRainflowState({ stressRms: 10, dominantFrequencyHz: 300, fractionalBandwidth: 0.2, durationSeconds: 60, fatigueExponent: 6, seed: 537 });
  nearly(low.stressRms, 5, 1e-10);
  assert.deepEqual(low.stress.slice(0, 20), repeated.stress.slice(0, 20));
  assert.ok(low.cycles.length > 10);
  nearly(high.totalDamage / low.totalDamage, 2 ** 6, 1e-8);
  nearly(low.damageByAmplitude.reduce((sum, bin) => sum + bin.damage, 0), low.totalDamage, 1e-12);
});

test('mission ledger responds nonlinearly to level and linearly to repeats', () => {
  const base = steinbergDamageLedgerState({ allowable3SigmaMm: 0.3, fatigueExponent: 6, events: [{ name: 'Event', response3SigmaMm: 0.15, durationSeconds: 10, repeats: 1, cycleRateHz: 100 }] });
  const doubledLevel = steinbergDamageLedgerState({ allowable3SigmaMm: 0.3, fatigueExponent: 6, events: [{ name: 'Event', response3SigmaMm: 0.3, durationSeconds: 10, repeats: 1, cycleRateHz: 100 }] });
  const doubledRepeats = steinbergDamageLedgerState({ allowable3SigmaMm: 0.3, fatigueExponent: 6, events: [{ name: 'Event', response3SigmaMm: 0.15, durationSeconds: 10, repeats: 2, cycleRateHz: 100 }] });
  nearly(doubledLevel.totalDamage / base.totalDamage, 64, 1e-9);
  nearly(doubledRepeats.totalDamage / base.totalDamage, 2, 1e-12);
  nearly(doubledRepeats.rows.at(-1).cumulativeDamage, doubledRepeats.totalDamage, 1e-12);
  nearly(doubledRepeats.rows.at(-1).damageShare, 1, 1e-12);
});

test('duration and support trade states move in the physically expected direction', () => {
  const short = threeSigmaDurationState({ durationSeconds: 1, independentPeakRateHz: 100 });
  const long = threeSigmaDurationState({ durationSeconds: 100, independentPeakRateHz: 100 });
  assert.ok(long.expectedPeakFactor > short.expectedPeakFactor);
  assert.ok(long.exceedanceProbability > short.exceedanceProbability);
  const baseline = pcbDesignTradeState({ effectiveSpanMm: 180, thicknessMm: 1.6 });
  const supported = pcbDesignTradeState({ effectiveSpanMm: 90, thicknessMm: 1.6 });
  assert.ok(supported.naturalFrequencyHz > baseline.naturalFrequencyHz);
  assert.ok(supported.center3SigmaMm < baseline.center3SigmaMm);
  assert.equal(baseline.designGrid.length, 31);
  assert.equal(baseline.designGrid[0].length, 41);
});

test('PCB model-to-test correlation exposes frequency, response, and fatigue leverage', () => {
  const matched = pcbTestCorrelationState({ predictedNaturalFrequencyHz: 300, measuredNaturalFrequencyHz: 300, predictedQualityFactor: 8, measuredQualityFactor: 8, predictedPeakResponseMm: 0.2, measuredPeakResponseMm: 0.2 });
  nearly(matched.frequencyErrorPercent, 0);
  nearly(matched.peakResponseDifferenceDb, 0);
  nearly(matched.damageRatio, 1);
  assert.equal(matched.passes, true);
  const high = pcbTestCorrelationState({ predictedPeakResponseMm: 0.2, measuredPeakResponseMm: 0.3, fatigueExponent: 6 });
  nearly(high.damageRatio, 1.5 ** 6, 1e-10);
  const layout = pcbTestLayoutState({ correlationState: matched, selectedChannel: 'DISP-1' });
  assert.equal(layout.selected.id, 'DISP-1');
  assert.equal(layout.channels.length, 6);
  assert.equal(layout.correlationPass, true);
});

test('electronics curriculum, calculators, demos, and takeaways remain in registry parity', () => {
  assert.equal(electronicsFatigueSections.length, 8);
  assert.equal(electronicsFatigueCaseNotes.length, 8);
  assert.equal(electronicsFatigueToolCatalog.length, 7);
  assert.equal(Object.keys(electronicsFatigueCalculatorRegistry).length, 7);
  assert.deepEqual(electronicsFatigueDemos.map(item => item.id), [...electronicsFatigueSupportedDemoIds]);
  for (const demo of electronicsFatigueDemos) {
    assert.match(electronicsFatiguePreviewSvg(demo.id), /^<svg/);
    assert.equal(buildDemoTakeaway(demo.id).id, demo.id);
  }
  const demoSource = readFileSync(new URL('../js/electronics-fatigue-demos.js', import.meta.url), 'utf8');
  assert.match(demoSource, /item\.unit \?\? ''/, 'unitless demo sliders must not render an undefined suffix');
  assert.match(demoSource, /data-ef-pin-baseline/, 'electronics labs expose reusable pinned-baseline comparison');
  assert.match(demoSource, /demo-comparison-grid/, 'pinned baselines render beside the current scenario');
  for (const key of Object.keys(STEINBERG_COMPONENTS)) assert.ok(Number.isFinite(STEINBERG_COMPONENTS[key].coefficient));
});

test('every electronics calculator leads with a reusable decision visual', () => {
  for (const [id, calculator] of Object.entries(electronicsFatigueCalculatorRegistry)) {
    const defaults = Object.fromEntries(calculator.inputs.map(input => [input.key, input.default]));
    const result = calculator.compute(defaults);
    assert.equal(result.presentation.primaryEvidence.type, 'visual', `${id} primary evidence`);
    assert.ok(result.visuals?.length, `${id} visual payload`);
    for (const visual of result.visuals) {
      const svg = electronicsFatigueVisualSvg(visual);
      assert.match(svg, /^<svg/);
      assert.doesNotMatch(svg, /NaN|undefined/);
    }
  }
  assert.deepEqual(new Set(electronicsFatigueVisualKinds), new Set(['pcb-motion', 'response-chain', 'component-risk-map', 'fatigue-damage', 'peak-duration', 'mission-damage', 'design-space', 'test-correlation', 'mode-curvature', 'time-rainflow', 'test-layout']));
});
