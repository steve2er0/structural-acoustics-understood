// Parker LORD AM Low Profile Avionics Mounts, transcribed from catalog PC6116.
// The catalog values below are for complete bonded mounts, not bulk elastomer pads.

export const PARKER_LORD_SOURCE = {
  title: 'Parker LORD Aerospace & Defense Isolator Catalog',
  document: 'PC6116, Rev. 3 (08/17)',
  url: 'https://www.parker.com/content/dam/Parker-com/Literature/noise-vibration---harshness-division/aerospace---defense/Product-Catalogs/Product-Catalog---Aerospace--Defense-Isolator-Catalog_PC6116.pdf',
  family: 'AM Low Profile Avionics Mounts',
  accessed: '2026-08-16',
  notes: [
    'Dynamic spring rates and rated natural frequencies are catalog typical values at the listed rated load.',
    'Catalog availability and configuration should be confirmed with Parker LORD before procurement.',
    'Back-to-back installation is catalog-described when the supported load exceeds one mount; capacity and spring rate are doubled.'
  ]
};

const MATERIAL_DEFAULTS = {
  BTR: {
    temperatureRangeF: [-65, 300],
    lossFactorDefault: 0.30,
    lossFactorProvenance: 'digitized-typical-transmissibility-curve'
  },
  'BTR II': {
    temperatureRangeF: [-40, 300],
    lossFactorDefault: 0.16,
    lossFactorProvenance: 'digitized-typical-transmissibility-curve'
  },
  MEA: {
    temperatureRangeF: null,
    lossFactorDefault: 0.20,
    lossFactorProvenance: 'engineering-assumption'
  }
};

// rows: [productNumber, rated-load natural frequency (Hz), axial dynamic rate
// (lb/in), radial dynamic rate (lb/in), elastomer]
const FAMILY_DEFINITIONS = [
  {
    family: 'AM-001', ratedLoadLb: 3, maxDynamicInputDAIn: 0.036, weightOz: 0.21,
    envelopeIn: { footprint: 1.312, bodyDiameter: 0.88, height: 0.474 },
    rows: [
      ['AM-001-2', 17, 89, 74, 'BTR'], ['AM-001-3', 19, 104, 87, 'BTR'], ['AM-001-4', 20, 122, 102, 'BTR'],
      ['AM-001-5', 22, 143, 119, 'BTR'], ['AM-001-6', 23, 164, 137, 'BTR'], ['AM-001-7', 25, 187, 156, 'BTR'],
      ['AM-001-8', 27, 215, 179, 'BTR'], ['AM-001-9', 29, 247, 206, 'BTR'], ['AM-001-10', 31, 284, 237, 'BTR'],
      ['AM-001-17', 15, 68, 57, 'BTR II'], ['AM-001-18', 17, 90, 75, 'BTR II'], ['AM-001-19', 20, 117, 98, 'BTR II'],
      ['AM-001-20', 22, 146, 122, 'BTR II'], ['AM-001-21', 25, 195, 163, 'BTR II']
    ]
  },
  {
    family: 'AM-002', ratedLoadLb: 3.5, maxDynamicInputDAIn: 0.060, weightOz: 0.27,
    envelopeIn: { footprint: 1.469, bodyDiameter: 1.245, height: 0.505 },
    rows: [
      ['AM-002-2', 14, 71, 71, 'BTR'], ['AM-002-3', 15, 84, 84, 'BTR'], ['AM-002-4', 17, 98, 98, 'BTR'],
      ['AM-002-5', 18, 114, 114, 'BTR'], ['AM-002-6', 19, 131, 131, 'BTR'], ['AM-002-7', 20, 150, 150, 'BTR'],
      ['AM-002-8', 22, 173, 173, 'BTR'], ['AM-002-9', 23, 197, 197, 'BTR'], ['AM-002-10', 25, 226, 226, 'BTR'],
      ['AM-002-11', 13, 63, 63, 'BTR II'], ['AM-002-12', 15, 82, 82, 'BTR II'], ['AM-002-13', 17, 107, 107, 'BTR II'],
      ['AM-002-14', 19, 134, 134, 'BTR II'], ['AM-002-15', 22, 179, 179, 'BTR II']
    ]
  },
  {
    family: 'AM-003', ratedLoadLb: 4.5, maxDynamicInputDAIn: 0.036, weightOz: 0.34,
    envelopeIn: { footprint: 1.438, bodyDiameter: 1.23, height: 0.53 },
    rows: [
      ['AM-003-2', 18, 152, 169, 'BTR'], ['AM-003-3', 20, 178, 198, 'BTR'], ['AM-003-4', 21, 209, 232, 'BTR'],
      ['AM-003-5', 23, 244, 271, 'BTR'], ['AM-003-6', 25, 278, 309, 'BTR'], ['AM-003-7', 26, 319, 354, 'BTR'],
      ['AM-003-8', 28, 367, 408, 'BTR'], ['AM-003-9', 30, 421, 468, 'BTR'], ['AM-003-10', 33, 482, 536, 'BTR'],
      ['AM003-11', 16, 117, 130, 'BTR II'], ['AM003-12', 18, 153, 170, 'BTR II'], ['AM003-13', 21, 200, 222, 'BTR II'],
      ['AM003-14', 23, 251, 279, 'BTR II'], ['AM003-15', 27, 333, 370, 'BTR II']
    ]
  },
  {
    family: 'AM-004', ratedLoadLb: 4, maxDynamicInputDAIn: 0.10, weightOz: 0.46,
    envelopeIn: { footprint: 1.455, bodyDiameter: 1.365, height: 0.45 },
    rows: [
      ['AM-004-2', 13, 71, 79, 'BTR'], ['AM-004-3', 14, 84, 93, 'BTR'], ['AM-004-4', 15, 98, 109, 'BTR'],
      ['AM-004-5', 17, 114, 127, 'BTR'], ['AM-004-6', 18, 131, 146, 'BTR'], ['AM-004-7', 19, 150, 167, 'BTR'],
      ['AM-004-8', 21, 173, 192, 'BTR'], ['AM-004-9', 22, 197, 219, 'BTR'], ['AM-004-10', 23, 226, 251, 'BTR'],
      ['AM-004-14', 12, 61, 68, 'BTR II'], ['AM-004-15', 14, 80, 89, 'BTR II'], ['AM-004-16', 16, 104, 116, 'BTR II'],
      ['AM-004-17', 18, 130, 144, 'BTR II'], ['AM-004-18', 21, 173, 192, 'BTR II']
    ]
  },
  {
    family: 'AM-005', ratedLoadLb: 6, maxDynamicInputDAIn: 0.036, weightOz: 0.67,
    envelopeIn: { footprint: 1.95, bodyDiameter: 1.50, height: 0.515 },
    rows: [
      ['AM-005-2', 24, 353, 272, 'BTR'], ['AM-005-3', 26, 414, 318, 'BTR'], ['AM-005-4', 28, 485, 373, 'BTR'],
      ['AM-005-5', 31, 566, 435, 'BTR'], ['AM-005-6', 33, 647, 498, 'BTR'], ['AM-005-7', 35, 743, 572, 'BTR'],
      ['AM-005-8', 37, 854, 657, 'BTR'], ['AM-005-9', 40, 979, 753, 'BTR'], ['AM-005-10', 43, 1121, 862, 'BTR'],
      ['AM-005-11', 26, 426, 328, 'BTR II'], ['AM-005-12', 30, 557, 428, 'BTR II'], ['AM-005-13', 35, 726, 558, 'BTR II'],
      ['AM-005-14', 39, 905, 696, 'BTR II'], ['AM-005-15', 45, 1210, 931, 'BTR II']
    ]
  },
  {
    family: 'AM-006', ratedLoadLb: 10, maxDynamicInputDAIn: 0.036, weightOz: 0.82,
    envelopeIn: { footprint: 1.765, bodyDiameter: 1.515, height: 0.52 },
    rows: [
      ['AM-006-7', 24, 581, 528, 'BTR'], ['AM-006-8', 26, 681, 619, 'BTR'], ['AM-006-9', 28, 798, 725, 'BTR'],
      ['AM-006-10', 30, 932, 847, 'BTR'], ['AM-006-11', 32, 1065, 968, 'BTR'], ['AM-006-12', 35, 1221, 1110, 'BTR'],
      ['AM-006-13', 37, 1405, 1277, 'BTR'], ['AM-006-14', 40, 1611, 1465, 'BTR'], ['AM-006-15', 43, 1844, 1676, 'BTR'],
      ['AM-006-1', 23, 550, 500, 'BTR II'], ['AM-006-2', 27, 719, 654, 'BTR II'], ['AM-006-3', 30, 938, 853, 'BTR II'],
      ['AM-006-4', 34, 1169, 1063, 'BTR II'], ['AM-006-5', 39, 1563, 1421, 'BTR II']
    ]
  },
  {
    family: 'AM-007', ratedLoadLb: 15, maxDynamicInputDAIn: 0.036, weightOz: 1.60,
    envelopeIn: { footprint: 2.74, bodyDiameter: 1.965, height: 0.605 },
    rows: [
      ['AM-007-6', 23, 830, 830, 'BTR'], ['AM-007-7', 26, 1000, 1000, 'BTR'], ['AM-007-8', 28, 1170, 1170, 'BTR'],
      ['AM-007-9', 30, 1360, 1360, 'BTR'], ['AM-007-10', 32, 1610, 1610, 'BTR'], ['AM-007-11', 35, 1870, 1870, 'BTR'],
      ['AM-007-12', 37, 2130, 2130, 'BTR'], ['AM-007-13', 40, 2430, 2430, 'BTR'], ['AM-007-14', 43, 2800, 2800, 'BTR'],
      ['AM-007-1', 21, 700, 700, 'MEA'], ['AM-007-2', 24, 890, 890, 'BTR II'], ['AM-007-3', 26, 1060, 1060, 'BTR II'],
      ['AM-007-4', 29, 1260, 1260, 'BTR II'], ['AM-007-5', 31, 1500, 1500, 'BTR II']
    ]
  },
  {
    family: 'AM-008', ratedLoadLb: 20, maxDynamicInputDAIn: 0.036, weightOz: 2.08,
    envelopeIn: { footprint: 2.74, bodyDiameter: 1.909, height: 0.655 },
    rows: [
      ['AM-008-6', 23, 1100, 1100, 'BTR'], ['AM-008-7', 26, 1330, 1330, 'BTR'], ['AM-008-8', 28, 1560, 1560, 'BTR'],
      ['AM-008-9', 30, 1810, 1810, 'BTR'], ['AM-008-10', 32, 2150, 2150, 'BTR'], ['AM-008-11', 35, 2490, 2490, 'BTR'],
      ['AM-008-12', 37, 2840, 2840, 'BTR'], ['AM-008-13', 40, 3240, 3240, 'BTR'], ['AM-008-14', 43, 3700, 3700, 'BTR'],
      ['AM-008-1', 21, 940, 940, 'MEA'], ['AM-008-2', 24, 1180, 1180, 'BTR II'], ['AM-008-3', 26, 1410, 1410, 'BTR II'],
      ['AM-008-4', 28, 1680, 1680, 'BTR II'], ['AM-008-5', 31, 2020, 2020, 'BTR II']
    ]
  },
  {
    family: 'AM-009', ratedLoadLb: 25, maxDynamicInputDAIn: 0.036, weightOz: 2.88,
    envelopeIn: { footprint: 2.74, bodyDiameter: 2.385, height: 0.71 },
    rows: [
      ['AM-009-6', 23, 1350, 1350, 'BTR'], ['AM-009-7', 26, 1630, 1630, 'BTR'], ['AM-009-8', 28, 1910, 1910, 'BTR'],
      ['AM-009-9', 30, 2220, 2220, 'BTR'], ['AM-009-10', 32, 2640, 2640, 'BTR'], ['AM-009-11', 35, 3050, 3050, 'BTR'],
      ['AM-009-12', 37, 3480, 3480, 'BTR'], ['AM-009-13', 39, 3980, 3980, 'BTR'], ['AM-009-14', 42, 4550, 4550, 'BTR'],
      ['AM-009-1', 21, 1150, 1150, 'MEA'], ['AM-009-2', 24, 1450, 1450, 'BTR II'], ['AM-009-3', 26, 1730, 1730, 'BTR II'],
      ['AM-009-4', 28, 2060, 2060, 'BTR II'], ['AM-009-5', 31, 2470, 2470, 'BTR II']
    ]
  }
];

export const PARKER_LORD_AM_FAMILIES = FAMILY_DEFINITIONS.map(({ rows, ...family }) => ({ ...family, recordCount: rows.length }));

export const PARKER_LORD_AM_CATALOG = FAMILY_DEFINITIONS.flatMap(family => family.rows.map(row => {
  const [productNumber, nominalNaturalFrequencyHz, dynamicAxialSpringRateLbPerIn, dynamicRadialSpringRateLbPerIn, elastomer] = row;
  const material = MATERIAL_DEFAULTS[elastomer];
  return Object.freeze({
    manufacturer: 'Parker LORD',
    mountModel: 'parker-lord-am',
    series: 'AM Low Profile Avionics Mounts',
    family: family.family,
    productNumber,
    elastomer,
    ratedLoadLb: family.ratedLoadLb,
    nominalNaturalFrequencyHz,
    dynamicAxialSpringRateLbPerIn,
    dynamicRadialSpringRateLbPerIn,
    maxDynamicInputDAIn: family.maxDynamicInputDAIn,
    weightOz: family.weightOz,
    envelopeIn: { ...family.envelopeIn },
    temperatureRangeF: material.temperatureRangeF ? [...material.temperatureRangeF] : null,
    lossFactorDefault: material.lossFactorDefault,
    lossFactorProvenance: material.lossFactorProvenance,
    source: PARKER_LORD_SOURCE
  });
}));

const PRODUCT_INDEX = new Map(PARKER_LORD_AM_CATALOG.map(item => [item.productNumber, item]));

export function parkerLordCatalogItem(productNumber) {
  return PRODUCT_INDEX.get(productNumber) ?? PRODUCT_INDEX.get('AM-006-1');
}

export function parkerLordLossFactorForProduct(productNumber) {
  return parkerLordCatalogItem(productNumber).lossFactorDefault;
}
