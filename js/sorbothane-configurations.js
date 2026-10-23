import { DEFAULT_SORBOTHANE_CONFIG, normalizeSorbothaneConfig } from './sorbothane-analysis.js';

// Owner-provided Configuration JSON, saved as "shaker test". Keep the complete
// snapshot: loading it must restore criteria/uncertainty/BDF settings as well as
// hardware. The separate baseline continues to follow DEFAULT_SORBOTHANE_CONFIG.
const SHAKER_TEST_CONFIG = {
  schema: 'sau-sorbothane-isolation', version: 1, units: 'English',
  component: {
    massKg: 5.4431084400000005,
    dimensionsM: [0.08889999999999999, 0.08889999999999999, 0.1016],
    cgM: [0, 0, 0.0508], inertiaMode: 'auto',
    inertiaKgM2: [0.0136, 0.0219, 0.0338, 0, 0, 0]
  },
  mounts: { count: 4, rowAxis: 'y', spacingM: [0.0508, 0.0508], planeZM: 0, stackTop: 1, stackBottom: 1 },
  isolator: {
    kind: 'sorbothane-element', formulation: 'standard', productNumber: '0510012-70-10', geometry: 'washer',
    odM: 0.0254, idM: 0.01143, thicknessM: 0.003175, durometer: 70, compressionPct: 15,
    preloadMode: 'compression', preloadN: 43.5925718295529, poisson: 0.49, temperatureC: 23,
    extrapolation: 'log-linear', userModulusMPa: 2, userTanDelta: 0.65, modulusScale: 1,
    lossScale: 1, mountsPerPoint: 1, lordLossFactor: 0.3
  },
  environment: { accelerationG: [0, 0, 0] },
  assemblies: {
    enabled: false,
    groups: {
      A: {
        topProductNumber: 'current-element', bottomProductNumber: 'current-element', topCount: 1, bottomCount: 1,
        preloadMode: 'compression', compressionPct: 15, preloadN: 43.5925718295529, boltDiameterM: 0.00635,
        holeDiameterM: 0.011937999999999999, gripThicknessM: 0.00635, radialMode: 'flange-shear', radialRateLbfPerIn: 0
      },
      B: {
        topProductNumber: 'current-element', bottomProductNumber: 'current-element', topCount: 1, bottomCount: 1,
        preloadMode: 'compression', compressionPct: 15, preloadN: 43.5925718295529, boltDiameterM: 0.00635,
        holeDiameterM: 0.011937999999999999, gripThicknessM: 0.00635, radialMode: 'flange-shear', radialRateLbfPerIn: 0
      }
    },
    assignments: ['A', 'A', 'A', 'A']
  },
  analysis: {
    excitationAxis: 'z', responsePoint: 'cg', magnitudeScale: 'db', frequencyMinHz: 10, frequencyMaxHz: 2000,
    frequencyPoints: 181, modeAvoidBandHz: [10, 100], modeAcceptBandHz: [100, 200], lateralModeMinimumHz: [50, 50],
    resonanceBandHz: [100, 200], resonanceLimitDb: 6, tones: [{ frequencyHz: 1200, maximumDb: -20 }]
  },
  uncertainty: { enabled: true, samples: 24, modulusPct: 20, lossPct: 20, massPct: 5, cgMm: 3, compressionPct: 2, seed: 519 },
  validation: {
    nastran: {
      plateThicknessIn: 0.125, plateMaterial: 'aluminum', plateYoungsModulusPsi: 10300000,
      platePoisson: 0.33, plateDensitySlinchPerIn3: 0.00026684, meshX: 8, meshY: 6,
      attachmentSpacingIn: [3.4299999999999997, 3.4299999999999997], coupling: 'rbe3', massAccounting: 'box-plus-plate',
      stiffnessReferenceMode: 'vertical-mode', customReferenceFrequencyHz: 100, modeCount: 20, maximumFrequencyHz: 2000
    }
  }
};

export const SORBOTHANE_SAVED_CONFIGURATIONS = Object.freeze([
  Object.freeze({ id: 'baseline', name: 'Baseline', description: '25 lbm · 13.5 × 7.2 × 9 in · centered CG · 8 legs' }),
  Object.freeze({ id: 'shaker-test', name: 'shaker test', description: '12 lbm · 3.5 × 3.5 × 4 in · 4 legs · 0510012-70-10' })
]);

export function loadSorbothaneConfiguration(id) {
  if (id === 'baseline') return normalizeSorbothaneConfig(DEFAULT_SORBOTHANE_CONFIG);
  if (id === 'shaker-test') return normalizeSorbothaneConfig(SHAKER_TEST_CONFIG);
  throw new Error(`Unknown saved isolation configuration: ${id}`);
}

export function matchingSorbothaneConfiguration(configInput) {
  const current = JSON.stringify(normalizeSorbothaneConfig(configInput));
  return SORBOTHANE_SAVED_CONFIGURATIONS.find(item => JSON.stringify(loadSorbothaneConfiguration(item.id)) === current) ?? null;
}
