import { SORBOTHANE_CATALOG, SORBOTHANE_BUSHING_CATALOG } from './sorbothane-data.js';

const INCH = .0254;
const LBF = 4.4482216152605;
const PSI = 6894.757293168;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const number = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
export const SORBOTHANE_ASSEMBLY_PARTS = [...SORBOTHANE_CATALOG.filter(item => item.productNumber !== 'custom-ring'), ...SORBOTHANE_BUSHING_CATALOG];
export const isSorbothaneAssemblyConfig = config => config?.isolator?.kind !== 'parker-lord-am' && config?.assemblies?.enabled === true;

export function normalizeSorbothaneAssemblies(config, input = {}) {
  const groups = Object.fromEntries(['A', 'B'].map(key => {
    const source = input.groups?.[key] ?? {};
    const validPart = value => value === 'current-element' || SORBOTHANE_ASSEMBLY_PARTS.some(item => item.productNumber === value);
    return [key, {
      topProductNumber: validPart(source.topProductNumber) ? source.topProductNumber : 'current-element',
      bottomProductNumber: validPart(source.bottomProductNumber) ? source.bottomProductNumber : 'current-element',
      topCount: clamp(Math.round(number(source.topCount, config.mounts.stackTop)), 1, 8),
      bottomCount: clamp(Math.round(number(source.bottomCount, config.mounts.stackBottom)), 1, 8),
      preloadMode: source.preloadMode === 'force' ? 'force' : 'compression',
      compressionPct: clamp(number(source.compressionPct, config.isolator.compressionPct), 1, 30),
      preloadN: Math.max(0, number(source.preloadN, config.isolator.preloadN)),
      boltDiameterM: Math.max(0, number(source.boltDiameterM, .25 * INCH)),
      holeDiameterM: Math.max(0, number(source.holeDiameterM, .47 * INCH)),
      gripThicknessM: Math.max(1e-6, number(source.gripThicknessM, .25 * INCH)),
      radialMode: source.radialMode === 'user' ? 'user' : 'flange-shear',
      radialRateLbfPerIn: Math.max(0, number(source.radialRateLbfPerIn, 0))
    }];
  }));
  return { enabled: input.enabled === true, groups,
    assignments: Array.from({ length: config.mounts.count }, (_, index) => input.assignments?.[index] === 'B' ? 'B' : 'A') };
}

export function sorbothaneAssemblyPart(config, productNumber) {
  if (productNumber !== 'current-element') {
    const item = SORBOTHANE_ASSEMBLY_PARTS.find(part => part.productNumber === productNumber);
    if (!item) throw new Error(`Unknown assembly part ${productNumber}`);
    return item;
  }
  const exact = SORBOTHANE_CATALOG.find(item => item.productNumber === config.isolator.productNumber
    && Math.abs(item.odIn * INCH - config.isolator.odM) < 1e-8 && Math.abs(item.idIn * INCH - config.isolator.idM) < 1e-8
    && Math.abs(item.thicknessIn * INCH - config.isolator.thicknessM) < 1e-8 && item.durometer === config.isolator.durometer
    && item.geometry === config.isolator.geometry);
  return { ...exact, productNumber: exact?.productNumber ?? 'custom-ring', geometry: config.isolator.geometry,
    odIn: config.isolator.odM / INCH, idIn: config.isolator.idM / INCH, thicknessIn: config.isolator.thicknessM / INCH,
    durometer: config.isolator.durometer, ratedLoadLb: exact?.ratedLoadLb ?? null };
}

export function sorbothaneAssemblyBillOfMaterials(config) {
  const items = new Map();
  config.assemblies.assignments.forEach(key => {
    const group = config.assemblies.groups[key];
    for (const side of ['top', 'bottom']) {
      const item = sorbothaneAssemblyPart(config, group[`${side}ProductNumber`]);
      const record = items.get(item.productNumber) ?? { ...item, quantity: 0 };
      record.quantity += group[`${side}Count`];
      items.set(item.productNumber, record);
    }
  });
  return [...items.values()];
}

const zero = () => Array.from({ length: 6 }, () => Array(6).fill(0));
const kinematics = ([x, y, z]) => [[1, 0, 0, 0, z, -y], [0, 1, 0, -z, 0, x], [0, 0, 1, y, -x, 0]];
function assemble(points, rates) {
  const matrix = zero();
  points.forEach((point, index) => {
    const B = kinematics(point);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) for (let axis = 0; axis < 3; axis++) matrix[i][j] += B[axis][i] * rates[index][axis] * B[axis][j];
  });
  return matrix;
}

function solve(matrix, force) {
  const a = matrix.map((row, i) => [...row, force[i]]);
  for (let j = 0; j < 6; j++) {
    let pivot = j;
    for (let i = j + 1; i < 6; i++) if (Math.abs(a[i][j]) > Math.abs(a[pivot][j])) pivot = i;
    if (Math.abs(a[pivot][j]) < 1e-14) throw new Error('Mixed assembly has insufficient static restraint. Check radial rates and support layout.');
    [a[j], a[pivot]] = [a[pivot], a[j]];
    const divisor = a[j][j];
    for (let k = j; k <= 6; k++) a[j][k] /= divisor;
    for (let i = 0; i < 6; i++) if (i !== j) {
      const multiplier = a[i][j];
      for (let k = j; k <= 6; k++) a[i][k] -= multiplier * a[j][k];
    }
  }
  return a.map(row => row[6]);
}

function sideDefinition(config, group, side, stress) {
  const item = sorbothaneAssemblyPart(config, group[`${side}ProductNumber`]);
  const bushing = item.geometry === 'bushing';
  // Explicit flange-only annulus approximation. Sleeve confinement/bearing is
  // NOT represented by this shape factor and remains an engineering REVIEW.
  const odM = item.odIn * INCH;
  const idM = (bushing ? item.sleeveOdIn : item.geometry === 'disc' ? 0 : item.idIn) * INCH;
  const thicknessM = item.thicknessIn * INCH;
  const area = Math.PI * (odM ** 2 - idM ** 2) / 4;
  const sf = (odM - idM) / (4 * thicknessM);
  const correction = 1 + 2 * sf ** 2;
  const elementConfig = { ...config, assemblies: { enabled: false }, isolator: { ...config.isolator, geometry: item.geometry === 'disc' ? 'disc' : 'ring',
    productNumber: item.productNumber, odM, idM, thicknessM, durometer: item.durometer, preloadMode: 'compression' } };
  const forceAt = pct => {
    if (pct <= 0) return 0;
    const stressPsi = pct <= 20 ? stress(elementConfig, pct)
      : stress(elementConfig, 20) + (pct - 20) * (stress(elementConfig, 20) - stress(elementConfig, 15)) / 5;
    return stressPsi * PSI * area * correction;
  };
  const compressionAt = load => {
    if (load <= 0) return 0;
    let lo = 0, hi = 100;
    for (let i = 0; i < 35; i++) { const mid = (lo + hi) / 2; if (forceAt(mid) < load) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  const tangentAt = pct => (forceAt(pct + .001) - forceAt(pct - .001)) / (.002 * thicknessM / 100) / group[`${side}Count`];
  return { item, bushing, area, sf, correction, thicknessM, count: group[`${side}Count`], elementConfig, forceAt, compressionAt, tangentAt };
}

const stateCache = new Map();
export function sorbothaneAssemblyStaticState(config, points, stress) {
  const cacheKey = JSON.stringify([config.assemblies, config.isolator, config.component.massKg, config.component.cgM, config.environment, points]);
  if (stateCache.has(cacheKey)) return stateCache.get(cacheKey);
  const groups = Object.fromEntries(['A', 'B'].map(key => {
    const group = config.assemblies.groups[key];
    const top = sideDefinition(config, group, 'top', stress), bottom = sideDefinition(config, group, 'bottom', stress);
    const preloadN = group.preloadMode === 'force' ? group.preloadN : bottom.forceAt(group.compressionPct);
    top.nominalPct = top.compressionAt(preloadN);
    bottom.nominalPct = bottom.compressionAt(preloadN);
    const staticShear = [top, bottom].reduce((sum, side) => sum + side.tangentAt(side.nominalPct) / side.correction / (2 * (1 + config.isolator.poisson)), 0);
    return [key, { group, top, bottom, preloadN, radial: group.radialMode === 'user' && group.radialRateLbfPerIn > 0 ? group.radialRateLbfPerIn * LBF / INCH : staticShear }];
  }));
  const local = config.assemblies.assignments.map(key => groups[key]);
  const weight = config.component.massKg * 9.80665;
  const target = [weight * config.environment.accelerationG[0], weight * config.environment.accelerationG[1], weight * (1 + config.environment.accelerationG[2]), 0, 0, 0];
  let q = Array(6).fill(0), residual = target, converged = false, evaluated;
  const evaluate = displacement => {
    const forces = Array(6).fill(0), rates = [], states = [];
    points.forEach((point, index) => {
      const profile = local[index], B = kinematics(point);
      const delta = B.map(row => row.reduce((sum, value, i) => sum + value * displacement[i], 0));
      const bottomPct = profile.bottom.nominalPct + delta[2] / (profile.bottom.thicknessM * profile.bottom.count) * 100;
      const topPct = profile.top.nominalPct - delta[2] / (profile.top.thicknessM * profile.top.count) * 100;
      const lowerLoadN = profile.bottom.forceAt(bottomPct), upperLoadN = profile.top.forceAt(topPct);
      const reaction = [profile.radial * delta[0], profile.radial * delta[1], lowerLoadN - upperLoadN];
      for (let i = 0; i < 6; i++) for (let axis = 0; axis < 3; axis++) forces[i] += B[axis][i] * reaction[axis];
      rates.push([profile.radial, profile.radial, profile.top.tangentAt(topPct) + profile.bottom.tangentAt(bottomPct)]);
      states.push({ profile, delta, topPct, bottomPct, upperLoadN, lowerLoadN, reaction });
    });
    return { forces, rates, states };
  };
  for (let iteration = 0; iteration < 35; iteration++) {
    evaluated = evaluate(q);
    residual = target.map((value, index) => value - evaluated.forces[index]);
    if (Math.max(...residual.map(Math.abs)) < Math.max(1, weight) * 1e-7) { converged = true; break; }
    const step = solve(assemble(points, evaluated.rates), residual);
    let scale = 1;
    const norm = Math.hypot(...residual);
    while (scale > 1 / 128) {
      const trial = evaluate(q.map((value, index) => value + step[index] * scale));
      if (Math.hypot(...target.map((value, index) => value - trial.forces[index])) < norm) break;
      scale /= 2;
    }
    q = q.map((value, index) => value + step[index] * scale);
  }
  evaluated = evaluate(q);
  const checks = [];
  const check = (id, code, label, pass, detail) => checks.push({ id, code, label, pass, detail });
  check('assembly-equilibrium', 'STATIC', 'Mixed-support static equilibrium', converged, converged ? 'Six-DOF force/moment equilibrium solved with each side’s static load–deflection law.' : 'Static equilibrium did not converge; response is not a valid installed-state prediction.');
  const used = [...new Set(config.assemblies.assignments)];
  for (const key of used) {
    const { group, top, bottom } = groups[key];
    check(`fit-${key}-bolt-hole`, 'FIT', `Group ${key} bolt / mounting-hole clearance`, group.boltDiameterM > 0 && group.holeDiameterM > group.boltDiameterM,
      `Bolt Ø ${(group.boltDiameterM / INCH).toFixed(4)} in; mounting hole Ø ${(group.holeDiameterM / INCH).toFixed(4)} in. Metal-to-metal contact can bypass isolation.`);
    for (const [name, side] of [['upper', top], ['lower', bottom]]) {
      const item = side.item;
      check(`fit-${key}-${name}-bolt`, 'FIT', `Group ${key} ${name} bolt clearance`, group.boltDiameterM > 0 && group.boltDiameterM < item.idIn * INCH,
        `Bolt Ø ${(group.boltDiameterM / INCH).toFixed(4)} in; bore Ø ${item.idIn.toFixed(4)} in. Positive clearance required.`);
      if (side.bushing) {
        check(`fit-${key}-${name}-hole`, 'FIT', `Group ${key} ${name} flange / hole fit`, group.holeDiameterM > item.sleeveOdIn * INCH && group.holeDiameterM < item.odIn * INCH,
          `Sleeve Ø ${item.sleeveOdIn} in < hole Ø ${(group.holeDiameterM / INCH).toFixed(4)} in < flange Ø ${item.odIn} in required.`);
        check(`fit-${key}-${name}-stack`, 'FIT', `Group ${key} ${name} bushing stack`, side.count === 1, 'Flanged bushings are one per side; arbitrary sleeve-on-flange series stacks are not supported.');
      } else {
        check(`fit-${key}-${name}-footprint`, 'FIT', `Group ${key} ${name} bearing footprint`, group.holeDiameterM < item.odIn * INCH,
          `Mounting hole Ø ${(group.holeDiameterM / INCH).toFixed(4)} in must be smaller than element OD ${item.odIn} in to leave a supporting footprint. Actual contact area still requires installation review.`);
        if (group.holeDiameterM > item.idIn * INCH + 1e-9) check(`bearing-face-${key}-${name}`, 'MODEL', `Group ${key} ${name} partial-face bearing`, false,
          `Mounting hole exceeds the ${item.idIn} in element bore. The full-face annular stiffness and published load range are not confirmed for this reduced contact area; installation/FE/test correlation required.`);
      }
    }
    const sleeveReach = [top, bottom].filter(side => side.bushing).reduce((sum, side) => sum + (side.item.overallHeightIn - side.item.thicknessIn) * INCH, 0);
    if (sleeveReach > 0) {
      check(`fit-${key}-sleeves`, 'FIT', `Group ${key} sleeve coverage / collision`, Math.abs(sleeveReach - group.gripThicknessM) < .002 * INCH,
        `Combined free sleeve reach ${(sleeveReach / INCH).toFixed(4)} in; grip ${(group.gripThicknessM / INCH).toFixed(4)} in. Outside ±0.002 in requires installation review (gap or interference).`);
      check(`model-${key}`, 'MODEL', `Group ${key} bushing model`, false, 'Flange-only axial/shear approximation; sleeve confinement, radial bearing/contact, friction and bolt torque are not validated. No catalog radial rate is assumed.');
    }
    if (group.radialMode === 'user') check(`radial-${key}`, 'MODEL', `Group ${key} user radial rate`, false, group.radialRateLbfPerIn > 0
      ? `User total radial rate ${group.radialRateLbfPerIn} lbf/in per axis per assembly; constant storage rate with the modeled effective loss factor. Requires test/source correlation.`
      : 'A positive user radial rate is required. The flange estimate is used temporarily to keep the preview inspectable; this is not a valid user-rate design.');
  }
  const mounts = evaluated.states.map((state, index) => {
    const { profile, topPct, bottomPct, upperLoadN, lowerLoadN } = state;
    const key = config.assemblies.assignments[index];
    for (const [sideName, side, load, pct] of [['upper', profile.top, upperLoadN, topPct], ['lower', profile.bottom, lowerLoadN, bottomPct]]) {
      const rated = side.item.ratedLoadLb;
      check(`load-${index}-${sideName}`, rated ? 'LOAD' : 'RATE?', `Leg ${index + 1} ${sideName} load`, Boolean(rated) && load >= rated[0] * LBF && load <= rated[1] * LBF,
        `${(load / LBF).toFixed(2)} lbf per element; ${side.item.productNumber}, ${rated ? `rated ${rated.join('–')} lbf` : 'no verified catalog rating'}. Stack count does not multiply capacity.`);
      check(`compression-${index}-${sideName}`, 'COMP', `Leg ${index + 1} ${sideName} installed compression`, pct >= 10 && pct <= 20, `${pct.toFixed(2)}%; required 10–20%. Outside this range, material response requires review.`);
    }
    check(`contact-${index}`, 'CONTACT', `Leg ${index + 1} contact`, upperLoadN > 0 && lowerLoadN > 0, `Upper ${(upperLoadN / LBF).toFixed(2)} / lower ${(lowerLoadN / LBF).toFixed(2)} lbf; both must remain positive.`);
    const flags = checks.filter(item => !item.pass && (item.id.startsWith(`load-${index}-`) || item.id.startsWith(`compression-${index}-`) || item.id === `contact-${index}`)).map(item => item.label);
    return { index: index + 1, group: key, positionM: points[index], payloadN: lowerLoadN - upperLoadN, upperLoadN, lowerLoadN,
      topCompressionPct: topPct, bottomCompressionPct: bottomPct, topItem: profile.top.item, bottomItem: profile.bottom.item,
      reactionN: state.reaction, flags, profile };
  });
  if (config.isolator.formulation === 'water-resistant') check('assembly-formulation', 'FORM?', 'Water-resistant catalog confirmation', false, 'Standard part numbers and axial ratings do not establish water-resistant availability or ratings.');
  const result = { compressionPct: local[0].bottom.nominalPct, preloadN: local[0].preloadN,
    freeThicknessM: Math.max(...local.flatMap(p => [p.top.thicknessM * p.top.count, p.bottom.thicknessM * p.bottom.count])),
    compressedThicknessM: Math.max(...evaluated.states.flatMap(s => [s.profile.top.thicknessM * s.profile.top.count * (1 - s.topPct / 100), s.profile.bottom.thicknessM * s.profile.bottom.count * (1 - s.bottomPct / 100)])),
    preloadProvenance: 'Per-group common clamp force; nonlinear static equilibrium across assigned assemblies',
    mounts, payloadContributionsN: mounts.map(mount => mount.payloadN), allEngaged: mounts.every(m => m.upperLoadN > 0 && m.lowerLoadN > 0),
    compressionCompliant: checks.filter(c => c.code === 'COMP').every(c => c.pass),
    catalogCompliant: checks.filter(c => ['LOAD', 'RATE?'].includes(c.code)).every(c => c.pass),
    recommendedCompressionPct: [10, 20], ratedLoadN: null, assemblyChecks: checks, converged, displacement: q,
    residual: target.map((value, index) => value - evaluated.forces[index]), billOfMaterials: sorbothaneAssemblyBillOfMaterials(config) };
  if (stateCache.size >= 64) stateCache.delete(stateCache.keys().next().value);
  stateCache.set(cacheKey, result);
  return result;
}

export function sorbothaneAssemblyDynamicMounts(config, state, frequencyHz, materialAt) {
  return state.mounts.map(mount => {
    const sides = ['top', 'bottom'].map(sideName => {
      const side = mount.profile[sideName];
      const pct = sideName === 'top' ? mount.topCompressionPct : mount.bottomCompressionPct;
      const material = materialAt({ ...side.elementConfig, isolator: { ...side.elementConfig.isolator, compressionPct: pct } }, frequencyHz);
      const factor = side.area / side.thicknessM / side.count;
      return { axial: material.storageModulusPa * side.correction * factor, radial: material.storageModulusPa / (2 * (1 + config.isolator.poisson)) * factor, material };
    });
    const axial = sides.reduce((sum, side) => sum + side.axial, 0);
    const axialLoss = sides.reduce((sum, side) => sum + side.axial * side.material.tanDelta, 0);
    const estimatedRadial = sides.reduce((sum, side) => sum + side.radial, 0);
    const etaRadial = sides.reduce((sum, side) => sum + side.radial * side.material.tanDelta, 0) / estimatedRadial;
    const radial = mount.profile.group.radialMode === 'user' && mount.profile.group.radialRateLbfPerIn > 0 ? mount.profile.group.radialRateLbfPerIn * LBF / INCH * config.isolator.modulusScale : estimatedRadial;
    return { kxNPerM: radial, kyNPerM: radial, kzNPerM: axial,
      lossNPerM: [radial * etaRadial, radial * etaRadial, axialLoss],
      material: { ...sides[0].material, tanDelta: axialLoss / axial, provenance: 'engineering-assumption-mixed-assembly', supported: sides.every(side => side.material.supported) },
      group: mount.group, topItem: mount.topItem, bottomItem: mount.bottomItem };
  });
}

export function assembleSorbothaneMountMatrices(points, mounts) {
  return { matrix: assemble(points, mounts.map(m => [m.kxNPerM, m.kyNPerM, m.kzNPerM])),
    lossMatrix: assemble(points, mounts.map(m => m.lossNPerM)) };
}
