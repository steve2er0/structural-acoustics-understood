export const SORBOTHANE_DATA_VERSION = '2026-08-16';

export const SORBOTHANE_REFERENCES = [
  {
    id: 'sorbothane-edg-2018',
    title: 'Sorbothane Engineering Design Guide',
    organization: 'Sorbothane, Inc.',
    revision: '2018',
    url: 'https://www.sorbothane.com/wp-content/uploads/Sorbothane-EDG.pdf',
    local: 'references/Sorbothane-Engineering-Design-Guide.pdf',
    use: 'Shape factor, static deflection, dynamic modulus, tan delta, transmissibility, and design limits.'
  },
  {
    id: 'sorbothane-ds101-2021',
    title: 'Data Sheet 101 - Material Properties of Sorbothane',
    organization: 'Sorbothane, Inc.',
    revision: 'Effective 2021-08-17',
    url: 'https://www.sorbothane.com/wp-content/uploads/101-sorbothane-material-properties.pdf',
    local: 'references/Sorbothane-Data-Sheet-101.pdf',
    use: 'Published static stress, dynamic Young modulus, tan delta, bulk modulus, density, and temperature limits.'
  },
  {
    id: 'sorbothane-spg-2025',
    title: 'Sorbothane Standard Products Guide',
    organization: 'Sorbothane, Inc.',
    revision: 'Revised 2025-06',
    url: 'https://www.sorbothane.com/wp-content/uploads/Sorbothane-SPG.pdf',
    local: 'references/Sorbothane-Standard-Products-Guide-2025.pdf',
    use: 'Current washer, isolation-ring, and isolation-disc geometry and rated-load records.'
  },
  {
    id: 'sorbothane-ds102-2015',
    title: 'Data Sheet 102 - Performance Curves',
    organization: 'Sorbothane, Inc.',
    revision: '2015',
    url: 'https://www.sorbothane.com/wp-content/uploads/102-Sorbothane-performance-curves.pdf',
    local: 'references/Sorbothane-Data-Sheet-102.pdf',
    use: 'Qualitative shock, vibration, transmissibility, and hysteresis context.'
  },
  {
    id: 'sorbothane-ds105-2015',
    title: 'Data Sheet 105 - Shock and Vibration FAQs',
    organization: 'Sorbothane, Inc.',
    revision: '2015',
    url: 'https://www.sorbothane.com/wp-content/uploads/105-Sorbothane-FAQs.pdf',
    local: 'references/Sorbothane-Data-Sheet-105.pdf',
    use: 'Manufacturer definitions of viscoelasticity, isolation, damping, tan delta, and durometer.'
  },
  {
    id: 'nasa-20040020088',
    title: 'Passive Isolators for Use on the International Space Station',
    organization: 'NASA Marshall Space Flight Center / AIAA',
    revision: 'AIAA 2004-0787',
    url: 'https://ntrs.nasa.gov/citations/20040020088',
    local: 'references/NASA-20040020088-Passive-Isolators-ISS.pdf',
    use: 'Aerospace test evidence using Sorbothane 30 and 50 at an equipment interface; also states the limits of passive materials near strong forces and structural resonances.'
  },
  {
    id: 'nasa-19770012197',
    title: 'HEAO-B Attitude Control and Structural Dynamics Assessment',
    organization: 'NASA',
    revision: '1977',
    url: 'https://ntrs.nasa.gov/api/citations/19770012197/downloads/19770012197.pdf',
    local: 'references/NASA-19770012197-HEAO-B-Elastomeric-Isolator-Assessment.pdf',
    use: 'Aerospace warning that an elastomer isolator represented by one stiffness at all conditions and frequencies can differ materially from actual hardware.'
  }
];

const frequencyHz = [5, 15, 30, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];
const provenance = frequencyHz.map(frequency => frequency <= 50 ? 'manufacturer-published' : 'manufacturer-digitized');

export const SORBOTHANE_MATERIAL = {
  source: 'sorbothane-ds101-2021 + sorbothane-edg-2018',
  publishedTableMaxHz: 50,
  digitizedCurveMaxHz: 300,
  frequencyHz,
  provenance,
  notes: [
    'Values at 5, 15, 30, and 50 Hz are transcribed from Data Sheet 101.',
    'Values from 75 through 300 Hz are engineering digitizations of Engineering Design Guide Figures 1-3 and 5; use the source figures for controlled work.',
    'No manufacturer complex-modulus table was found above 300 Hz. Predictions at 600-2000 Hz require an explicit extrapolation selection and test validation.'
  ],
  dynamicYoungsModulusPsi: {
    30: {
      10: [36, 57, 76, 95, 114, 127, 139, 150, 160, 168, 177, 183, 189, 195],
      15: [41, 64, 86, 105, 130, 150, 161, 171, 181, 190, 199, 207, 214, 221],
      20: [48, 75, 100, 119, 150, 169, 181, 192, 204, 214, 223, 231, 238, 245]
    },
    50: {
      10: [77, 113, 145, 175, 207, 228, 246, 263, 276, 287, 296, 303, 308, 313],
      15: [89, 129, 165, 199, 239, 263, 282, 299, 310, 318, 325, 330, 334, 337],
      20: [106, 154, 195, 231, 261, 282, 297, 310, 321, 330, 338, 346, 352, 358]
    },
    70: {
      10: [186, 186, 266, 298, 332, 354, 371, 386, 399, 410, 421, 430, 438, 445],
      15: [209, 258, 299, 334, 369, 394, 416, 435, 451, 464, 475, 484, 491, 497],
      20: [240, 295, 342, 382, 420, 445, 465, 481, 495, 507, 518, 526, 532, 538]
    }
  },
  tanDelta: {
    30: [0.72, 0.78, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.79, 0.79, 0.80, 0.78, 0.78],
    50: [0.57, 0.62, 0.64, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65],
    70: [0.28, 0.33, 0.36, 0.37, 0.38, 0.39, 0.40, 0.40, 0.40, 0.40, 0.40, 0.40, 0.40, 0.40]
  },
  staticCompressiveStressPsi: {
    30: { 10: 0.9, 20: 2.1 },
    50: { 10: 2.7, 20: 6.4 },
    70: { 10: 11.8, 20: 30.0 }
  },
  bulkModulusGPa: { 30: 4.5, 50: 5.0, 70: 4.3 },
  densityLbFt3: { 30: 83, 50: 84, 70: 85 },
  temperatureRangeF: { 30: [-20, 140], 50: [-20, 150], 70: [-20, 160] }
};

const row = (productNumber, geometry, odIn, idIn, thicknessIn, durometer, ratedLoadLb, notes = '') => ({
  productNumber, geometry, odIn, idIn, thicknessIn, durometer,
  ratedLoadLb, recommendedCompressionPct: [10, 20], notes,
  source: 'sorbothane-spg-2025', provenance: 'manufacturer-published'
});

const washerRows = `
0510020 0.50 0.13 0.13 0.40 0.75
0510010 0.50 0.22 0.19 0.20 0.40
0510012 1.00 0.45 0.125 2.0 4.5
0510001 1.00 0.45 0.19 1.0 2.0
0510015 1.00 0.45 0.38 0.70 1.50
0510045 1.25 0.50 0.38 2.0 3.0
0510050 1.50 0.50 0.50 2.0 4.0`.trim().split('\n').map(line => line.trim().split(/\s+/).map(Number));

const ringRows = `
0510802 1.75 0.63 0.25 7 15
0510823 2.00 0.50 0.375 8 18
0510825 2.00 0.50 0.50 6 13
0510845 2.50 0.50 0.50 13 29
0510865 3.00 1.00 0.50 17 39
0510867 3.00 1.00 0.75 11 24
0510882 3.00 2.00 0.25 11 24
0510885 3.00 2.00 0.50 5 12
0510907 4.00 1.00 0.75 32 74
0510909 4.00 1.00 1.00 25 50
0510925 4.00 2.00 0.50 26 59
0510929 4.00 2.00 1.00 13 29
0510942 4.00 3.00 0.25 15 34
0510945 4.00 3.00 0.50 7.5 17
0572155 5.00 3.10 0.50 31 70
0572157 5.00 3.10 0.75 20 45
0572160 5.00 3.10 1.00 16 36
0572175 5.00 2.50 0.50 55 125
0572177 5.00 2.50 0.75 35 70
0572170 5.00 2.50 1.00 25 50
0572185 5.00 2.00 0.50 85 185
0572187 5.00 2.00 0.75 45 100
0572180 5.00 2.00 1.00 32 70`.trim().split('\n').map(line => line.trim().split(/\s+/).map(Number));

const discRows = `
0531025 1.00 0.25 2.5 4.5
0531050 1.00 0.50 1 2.4
0531525 1.50 0.25 9 20
0531550 1.50 0.50 3.5 7.5
0510435 2.25 0.25 40 90
0532350 2.25 0.50 13 29
0532525 2.50 0.25 60 130
0532550 2.50 0.50 19 42
0533025 3.00 0.25 125 275
0533050 3.00 0.50 35 80
0534025 4.00 0.25 375 865
0534050 4.00 0.50 100 235
0534075 4.00 0.75 52 120
0534100 4.00 1.00 34 79`.trim().split('\n').map(line => line.trim().split(/\s+/).map(Number));

const durometerLoadMultiplier = {
  30: [1, 1],
  50: [3, 3],
  70: [13.1, 27.8]
};

function expandFamily(rows, geometry) {
  return rows.flatMap(values => {
    const [baseNumber, odIn, idOrThickness, thicknessOrMin, min30, max30] = geometry === 'disc'
      ? [values[0], values[1], 0, values[2], values[3], values[4]]
      : values;
    const idIn = geometry === 'disc' ? 0 : idOrThickness;
    const thicknessIn = geometry === 'disc' ? thicknessOrMin : thicknessOrMin;
    return [30, 50, 70].map(durometer => {
      const multiplier = durometerLoadMultiplier[durometer];
      const min = durometer === 30 ? min30 : +(min30 * multiplier[0]).toPrecision(3);
      const max = durometer === 30 ? max30 : +(max30 * multiplier[1]).toPrecision(3);
      return row(`${String(Math.trunc(baseNumber)).padStart(7, '0')}-${durometer}-10`, geometry, odIn, idIn, thicknessIn, durometer, [min, max]);
    });
  });
}

// Current catalog values are explicitly overridden below where the 2025 guide is not a simple durometer scaling.
const catalog = [
  ...expandFamily(washerRows, 'washer'),
  ...expandFamily(ringRows, 'ring'),
  ...expandFamily(discRows, 'disc')
];

const publishedLoads = new Map(`
0510020 30 .40 .75 50 1 2 70 4 10
0510010 30 .20 .40 50 .50 1.25 70 2.5 6
0510012 30 2 4.5 50 5.75 13.5 70 25.25 64
0510001 30 1 2 50 3.5 8 70 15 35
0510015 30 .70 1.50 50 2.25 5 70 9.5 23.5
0510045 30 2 3 50 4.5 9 70 20 40
0510050 30 2 4 50 6 14 70 30 65
0510802 30 7 15 50 20 45 70 90 215
0510823 30 8 18 50 24 55 70 105 260
0510825 30 6 13 50 17 39 70 75 185
0510845 30 13 29 50 38 88 70 170 420
0510865 30 17 39 50 51 118 70 220 560
0510867 30 11 24 50 32 74 70 140 356
0510882 30 11 24 50 32 74 70 139 350
0510885 30 5 12 50 16 37 70 70 175
0510907 30 32 74 50 96 222 70 420 1000
0510909 30 25 50 50 70 150 70 300 750
0510925 30 26 59 50 80 175 70 340 840
0510929 30 13 29 50 40 85 70 170 420
0510942 30 15 34 50 45 100 70 200 490
0510945 30 7.5 17 50 23 50 70 100 240
0572155 30 31 70 50 92 210 70 400 1000
0572157 30 20 45 50 60 135 70 260 650
0572160 30 16 36 50 50 110 70 210 520
0572175 30 55 125 50 165 375 70 720 1800
0572177 30 35 70 50 100 200 70 410 1050
0572170 30 25 50 50 75 160 70 310 780
0572185 30 85 185 50 245 570 70 1075 2720
0572187 30 45 100 50 135 310 70 590 1480
0572180 30 32 70 50 95 215 70 420 1040
0531025 30 2.5 4.5 50 6.6 14.5 70 30 65
0531050 30 1 2.4 50 3.5 7 70 14 35
0531525 30 9 20 50 27 60 70 120 180
0531550 30 3.5 7.5 50 10 23 70 45 110
0510435 30 40 90 50 120 270 70 530 1320
0532350 30 13 29 50 40 85 70 170 415
0532525 30 60 130 50 180 400 70 790 1980
0532550 30 19 42 50 55 125 70 240 600
0533025 30 125 275 50 370 840 70 920 2000
0533050 30 35 80 50 105 240 70 460 1160
0534025 30 375 865 50 1120 2600 70 4900 12440
0534050 30 100 235 50 305 712 70 1335 3390
0534075 30 52 120 50 155 360 70 675 1700
0534100 30 34 79 50 102 237 70 445 1130`.trim().split('\n').flatMap(line => {
  const tokens = line.trim().split(/\s+/);
  const base = tokens.shift();
  const entries = [];
  while (tokens.length) entries.push([`${base}-${tokens.shift()}-10`, [+tokens.shift(), +tokens.shift()]]);
  return entries;
}));

for (const item of catalog) if (publishedLoads.has(item.productNumber)) item.ratedLoadLb = publishedLoads.get(item.productNumber);

export const SORBOTHANE_CATALOG = [
  {
    productNumber: 'custom-ring', geometry: 'ring', odIn: 1.25, idIn: 0.50, thicknessIn: 0.25,
    durometer: 50, ratedLoadLb: null, recommendedCompressionPct: [10, 20],
    notes: 'User-defined annular element. No manufacturer product load rating applies.',
    source: 'engineering-assumption', provenance: 'engineering-assumption'
  },
  ...catalog
];

export function sorbothaneCatalogItem(productNumber) {
  return SORBOTHANE_CATALOG.find(item => item.productNumber === productNumber) ?? SORBOTHANE_CATALOG[0];
}
