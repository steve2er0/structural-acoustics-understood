import {
  analyzeTwoStageIsolation,
  complex,
  complexAdd,
  complexMagnitude,
  complexMultiply,
  complexPhaseDeg,
  complexSubtract,
  estimateLogSlopeDbPerDecade,
  findLocalPeaks,
  logarithmicFrequencyGrid,
  solveComplexLinearSystem,
  unwrapPhaseDegrees
} from './two-stage-isolation-physics.js';

export const COMPOUND_G0 = 9.80665;
export const COMPOUND_BODY_DOF_NAMES = Object.freeze(['X', 'Y', 'Z', 'Roll', 'Pitch', 'Yaw']);
const AXIS_INDEX = Object.freeze({ x: 0, y: 1, z: 2 });
const TAU = 2 * Math.PI;
const zeros = (rows, columns = rows) => Array.from({ length: rows }, () => Array(columns).fill(0));
const identity = size => zeros(size).map((row, index) => row.map((_, column) => index === column ? 1 : 0));
const transpose = matrix => matrix[0].map((_, column) => matrix.map(row => row[column]));
const multiply = (left, right) => left.map(row => right[0].map((_, column) => row.reduce((sum, value, index) => sum + value * right[index][column], 0)));
const multiplyVector = (matrix, vector) => matrix.map(row => row.reduce((sum, value, index) => sum + value * vector[index], 0));
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const finitePositive = (value, label) => {
  const numeric = Number(value);
  if (!(numeric > 0) || !Number.isFinite(numeric)) throw new Error(`${label} must be greater than zero.`);
  return numeric;
};
const finiteNonnegative = (value, label) => {
  const numeric = Number(value);
  if (!(numeric >= 0) || !Number.isFinite(numeric)) throw new Error(`${label} must be zero or greater.`);
  return numeric;
};
const axisIndex = axis => AXIS_INDEX[String(axis).toLowerCase()] ?? 2;

function inverse(matrix) {
  const size = matrix.length;
  const augmented = matrix.map((row, index) => [...row, ...identity(size)[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    if (Math.abs(augmented[pivot][column]) < 1e-20) throw new Error('Matrix is singular. Check body inertia, mount axes, and mount geometry.');
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    augmented[column] = augmented[column].map(value => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index]);
    }
  }
  return augmented.map(row => row.slice(size));
}

function cholesky(matrix, label = 'Matrix') {
  const size = matrix.length;
  const lower = zeros(size);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let sum = matrix[row][column];
      for (let index = 0; index < column; index += 1) sum -= lower[row][index] * lower[column][index];
      if (row === column) {
        if (!(sum > 1e-18) || !Number.isFinite(sum)) throw new Error(`${label} is not positive definite. Check inertia products, mount geometry, and nonzero stiffness in every constrained direction.`);
        lower[row][column] = Math.sqrt(sum);
      } else lower[row][column] = sum / lower[column][column];
    }
  }
  return lower;
}

function jacobiEigen(matrix) {
  const size = matrix.length;
  const values = matrix.map(row => [...row]);
  const vectors = identity(size);
  const diagonalScale = Math.max(1, ...values.map((row, index) => Math.abs(row[index])));
  for (let iteration = 0; iteration < 1600; iteration += 1) {
    let p = 0;
    let q = 1;
    let maximum = 0;
    for (let row = 0; row < size; row += 1) for (let column = row + 1; column < size; column += 1) {
      if (Math.abs(values[row][column]) > maximum) { maximum = Math.abs(values[row][column]); p = row; q = column; }
    }
    if (maximum < diagonalScale * 1e-12) break;
    const angle = .5 * Math.atan2(2 * values[p][q], values[q][q] - values[p][p]);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    for (let index = 0; index < size; index += 1) {
      const aip = values[index][p];
      const aiq = values[index][q];
      values[index][p] = cosine * aip - sine * aiq;
      values[index][q] = sine * aip + cosine * aiq;
    }
    for (let index = 0; index < size; index += 1) {
      const api = values[p][index];
      const aqi = values[q][index];
      values[p][index] = cosine * api - sine * aqi;
      values[q][index] = sine * api + cosine * aqi;
    }
    values[p][q] = values[q][p] = 0;
    for (let index = 0; index < size; index += 1) {
      const vip = vectors[index][p];
      const viq = vectors[index][q];
      vectors[index][p] = cosine * vip - sine * viq;
      vectors[index][q] = sine * vip + cosine * viq;
    }
  }
  return { values: values.map((row, index) => row[index]), vectors };
}

function generalizedModes(mass, stiffness) {
  const lower = cholesky(mass, 'Mass/inertia matrix');
  const inverseLower = inverse(lower);
  const transformed = multiply(inverseLower, multiply(stiffness, transpose(inverseLower)));
  const eigen = jacobiEigen(transformed);
  const physicalVectors = multiply(transpose(inverseLower), eigen.vectors);
  return eigen.values.map((value, index) => {
    const vector = physicalVectors.map(row => row[index]);
    const modalMass = dot(vector, multiplyVector(mass, vector));
    const scale = 1 / Math.sqrt(Math.max(modalMass, 1e-30));
    return { eigenvalue: value, vector: vector.map(component => component * scale) };
  }).sort((left, right) => left.eigenvalue - right.eigenvalue);
}

function lengthToken(token) {
  const match = String(token).trim().toLowerCase().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(mm|cm|m|in|ft)?$/);
  if (!match) throw new Error(`Could not parse mount-coordinate value “${token}”. Use metres or an explicit mm, cm, in, or ft suffix.`);
  const scale = { mm: 1e-3, cm: 1e-2, m: 1, in: .0254, ft: .3048 }[match[2] ?? 'm'];
  return Number(match[1]) * scale;
}

export function parseMountCoordinates(text, expectedCount, label = 'Mount coordinates') {
  const rows = String(text ?? '').split(/[;\n]+/).map(row => row.trim()).filter(Boolean);
  if (rows.length !== expectedCount) throw new Error(`${label} must contain exactly ${expectedCount} coordinate rows.`);
  return rows.map((row, index) => {
    const tokens = row.split(/\s*,\s*|\s+/).filter(Boolean);
    if (tokens.length !== 3) throw new Error(`${label} row ${index + 1} must contain x, y, and z.`);
    return tokens.map(lengthToken);
  });
}

export function parametricMountPositions(countInput, spacingXInput, spacingYInput, planeZInput, cgOffset = [0, 0, 0]) {
  const count = Math.round(Number(countInput));
  if (![3, 4].includes(count)) throw new Error('The rigid-body model currently supports exactly 3 or 4 mounts per stage.');
  const spacingX = finitePositive(spacingXInput, 'Mount spacing X');
  const spacingY = finitePositive(spacingYInput, 'Mount spacing Y');
  const planeZ = Number(planeZInput);
  const [cgX, cgY, cgZ] = cgOffset.map(Number);
  const plan = count === 4
    ? [[-spacingX / 2, -spacingY / 2], [spacingX / 2, -spacingY / 2], [spacingX / 2, spacingY / 2], [-spacingX / 2, spacingY / 2]]
    : [[-spacingX / 2, -spacingY / 3], [spacingX / 2, -spacingY / 3], [0, 2 * spacingY / 3]];
  return plan.map(([x, y]) => [x - cgX, y - cgY, planeZ - cgZ]);
}

export function mountKinematics(position) {
  const [x, y, z] = position.map(Number);
  return [
    [1, 0, 0, 0, z, -y],
    [0, 1, 0, -z, 0, x],
    [0, 0, 1, y, -x, 0]
  ];
}

export function rigidBodyMassMatrix(bodyInput) {
  const massKg = finitePositive(bodyInput.massKg, `${bodyInput.label ?? 'Body'} mass`);
  const dimensionsM = (bodyInput.dimensionsM ?? []).map((value, index) => finitePositive(value, `${bodyInput.label ?? 'Body'} dimension ${index + 1}`));
  if (dimensionsM.length !== 3) throw new Error(`${bodyInput.label ?? 'Body'} requires length, width, and height.`);
  const [length, width, height] = dimensionsM;
  const inertia = bodyInput.inertiaMode === 'manual'
    ? [...(bodyInput.inertiaKgM2 ?? [])].map(Number)
    : [
        massKg * (width ** 2 + height ** 2) / 12,
        massKg * (length ** 2 + height ** 2) / 12,
        massKg * (length ** 2 + width ** 2) / 12,
        0, 0, 0
      ];
  if (inertia.length !== 6 || inertia.some(value => !Number.isFinite(value))) throw new Error(`${bodyInput.label ?? 'Body'} manual inertia requires Ixx, Iyy, Izz, Ixy, Ixz, and Iyz.`);
  const [ixx, iyy, izz, ixy, ixz, iyz] = inertia;
  const matrix = zeros(6);
  matrix[0][0] = matrix[1][1] = matrix[2][2] = massKg;
  matrix[3][3] = ixx;
  matrix[4][4] = iyy;
  matrix[5][5] = izz;
  matrix[3][4] = matrix[4][3] = -ixy;
  matrix[3][5] = matrix[5][3] = -ixz;
  matrix[4][5] = matrix[5][4] = -iyz;
  cholesky(matrix, `${bodyInput.label ?? 'Body'} mass/inertia matrix`);
  return { matrix, massKg, dimensionsM, inertiaKgM2: inertia };
}

function validateMount(mount, label) {
  const positionKeys = label === 'Stage 1' ? ['body1Position'] : ['body1Position', 'body2Position'];
  for (const key of positionKeys) if (!Array.isArray(mount[key]) || mount[key].length !== 3 || mount[key].some(value => !Number.isFinite(Number(value)))) throw new Error(`${label} mount positions must be finite XYZ vectors.`);
  const stiffness = (mount.stiffness ?? []).map((value, index) => finitePositive(value, `${label} mount ${COMPOUND_BODY_DOF_NAMES[index]} stiffness`));
  const damping = (mount.damping ?? []).map((value, index) => finiteNonnegative(value, `${label} mount ${COMPOUND_BODY_DOF_NAMES[index]} damping`));
  if (stiffness.length !== 3 || damping.length !== 3) throw new Error(`${label} mounts require Kx, Ky, Kz and Cx, Cy, Cz.`);
  return { ...mount, stiffness, damping };
}

function addBtDB(target, rowOffset, columnOffset, leftB, diagonal, rightB, scale = 1) {
  for (let row = 0; row < 6; row += 1) for (let column = 0; column < 6; column += 1) {
    let value = 0;
    for (let axis = 0; axis < 3; axis += 1) value += leftB[axis][row] * diagonal[axis] * rightB[axis][column];
    target[rowOffset + row][columnOffset + column] += scale * value;
  }
}

export function assembleCompoundIsolationMatrices(input) {
  const body1 = rigidBodyMassMatrix({ ...input.body1, label: input.body1?.label ?? 'Intermediate body' });
  const body2 = rigidBodyMassMatrix({ ...input.body2, label: input.body2?.label ?? 'Payload body' });
  const stage1Mounts = (input.stage1Mounts ?? []).map(mount => validateMount(mount, 'Stage 1'));
  const stage2Mounts = (input.stage2Mounts ?? []).map(mount => validateMount(mount, 'Stage 2'));
  if (![3, 4].includes(stage1Mounts.length) || ![3, 4].includes(stage2Mounts.length)) throw new Error('Each rigid-body isolation stage requires 3 or 4 mounts.');
  const M = zeros(12);
  for (let row = 0; row < 6; row += 1) for (let column = 0; column < 6; column += 1) {
    M[row][column] = body1.matrix[row][column];
    M[row + 6][column + 6] = body2.matrix[row][column];
  }
  const K = zeros(12);
  const C = zeros(12);
  const baseK = zeros(12, 3);
  const baseC = zeros(12, 3);
  for (const mount of stage1Mounts) {
    const B1 = mountKinematics(mount.body1Position);
    mount.B1 = B1;
    addBtDB(K, 0, 0, B1, mount.stiffness, B1);
    addBtDB(C, 0, 0, B1, mount.damping, B1);
    for (let row = 0; row < 6; row += 1) for (let axis = 0; axis < 3; axis += 1) {
      baseK[row][axis] += B1[axis][row] * mount.stiffness[axis];
      baseC[row][axis] += B1[axis][row] * mount.damping[axis];
    }
  }
  for (const mount of stage2Mounts) {
    const B1 = mountKinematics(mount.body1Position);
    const B2 = mountKinematics(mount.body2Position);
    mount.B1 = B1;
    mount.B2 = B2;
    addBtDB(K, 0, 0, B1, mount.stiffness, B1);
    addBtDB(K, 0, 6, B1, mount.stiffness, B2, -1);
    addBtDB(K, 6, 0, B2, mount.stiffness, B1, -1);
    addBtDB(K, 6, 6, B2, mount.stiffness, B2);
    addBtDB(C, 0, 0, B1, mount.damping, B1);
    addBtDB(C, 0, 6, B1, mount.damping, B2, -1);
    addBtDB(C, 6, 0, B2, mount.damping, B1, -1);
    addBtDB(C, 6, 6, B2, mount.damping, B2);
  }
  cholesky(K, 'Assembled stiffness matrix');
  return { M, C, K, baseK, baseC, body1, body2, stage1Mounts, stage2Mounts };
}

function realTimesComplex(matrix, vector) {
  return matrix.map(row => row.reduce((sum, coefficient, index) => complexAdd(sum, complex(coefficient * vector[index].re, coefficient * vector[index].im)), complex()));
}

function complexVectorSubtract(left, right) {
  return left.map((value, index) => complexSubtract(value, right[index]));
}

function complexVectorMagnitude(vector) {
  return Math.sqrt(vector.reduce((sum, value) => sum + complexMagnitude(value) ** 2, 0));
}

function mountComplexForce(relative, mount, omega) {
  return relative.map((value, axis) => complexMultiply(complex(mount.stiffness[axis], omega * mount.damping[axis]), value));
}

export function compoundResponseAtFrequency(input, frequencyHz, baseAxisInput = 'z') {
  const model = input.M ? input : assembleCompoundIsolationMatrices(input);
  const frequency = finitePositive(frequencyHz, 'Frequency');
  const omega = TAU * frequency;
  const axis = axisIndex(baseAxisInput);
  const dynamic = model.K.map((row, rowIndex) => row.map((stiffness, columnIndex) => complex(stiffness - omega ** 2 * model.M[rowIndex][columnIndex], omega * model.C[rowIndex][columnIndex])));
  const rhs = model.baseK.map((row, rowIndex) => complex(row[axis], omega * model.baseC[rowIndex][axis]));
  const q = solveComplexLinearSystem(dynamic, rhs);
  const body1Q = q.slice(0, 6);
  const body2Q = q.slice(6, 12);
  const baseTranslation = [complex(), complex(), complex()];
  baseTranslation[axis] = complex(1, 0);
  const stage1 = model.stage1Mounts.map(mount => {
    const relative = complexVectorSubtract(realTimesComplex(mount.B1, body1Q), baseTranslation);
    const force = mountComplexForce(relative, mount, omega);
    return { relative, force, relativeMagnitude: complexVectorMagnitude(relative), forceMagnitude: complexVectorMagnitude(force) };
  });
  const stage2 = model.stage2Mounts.map(mount => {
    const relative = complexVectorSubtract(realTimesComplex(mount.B2, body2Q), realTimesComplex(mount.B1, body1Q));
    const force = mountComplexForce(relative, mount, omega);
    return { relative, force, relativeMagnitude: complexVectorMagnitude(relative), forceMagnitude: complexVectorMagnitude(force) };
  });
  return { frequencyHz: frequency, omega, axis, q, body1Q, body2Q, stage1, stage2, dynamic, rhs };
}

function classifyCompoundMode(vector, lengthScale) {
  const scaled = vector.map((value, index) => Math.abs(value) * ((index % 6) < 3 ? 1 : lengthScale));
  const total = scaled.reduce((sum, value) => sum + value ** 2, 0) || 1;
  const participation = scaled.map(value => 100 * value ** 2 / total);
  const order = participation.map((value, index) => ({ index, value })).sort((left, right) => right.value - left.value);
  const name = index => `${index < 6 ? 'Intermediate' : 'Payload'} ${COMPOUND_BODY_DOF_NAMES[index % 6]}`;
  return { dominant: name(order[0].index), secondary: name(order[1].index), participation, dominantIndex: order[0].index };
}

export function solveCompoundModes(input, baseAxisInput = 'z') {
  const model = input.M ? input : assembleCompoundIsolationMatrices(input);
  const axis = axisIndex(baseAxisInput);
  const lengthScale = Math.max(...model.body1.dimensionsM, ...model.body2.dimensionsM);
  const modes = generalizedModes(model.M, model.K).map((mode, index) => {
    if (!(mode.eigenvalue > 0)) throw new Error('The assembled system contains a zero or negative stiffness mode. Check lateral stiffness and mount geometry.');
    const omega = Math.sqrt(mode.eigenvalue);
    const modalMass = dot(mode.vector, multiplyVector(model.M, mode.vector));
    const modalDamping = dot(mode.vector, multiplyVector(model.C, mode.vector));
    const dampingRatio = modalDamping / (2 * omega * modalMass);
    const displayScale = Math.max(...mode.vector.map((value, dof) => Math.abs(value) * ((dof % 6) < 3 ? 1 : lengthScale))) || 1;
    const displayVector = mode.vector.map((value, dof) => value * ((dof % 6) < 3 ? 1 : lengthScale) / displayScale);
    const classification = classifyCompoundMode(mode.vector, lengthScale);
    const modalBaseForce = dot(mode.vector, model.baseK.map(row => row[axis]));
    return {
      number: index + 1,
      eigenvalue: mode.eigenvalue,
      frequencyHz: omega / TAU,
      dampedFrequencyHz: omega / TAU * Math.sqrt(Math.max(0, 1 - dampingRatio ** 2)),
      dampingRatio,
      vector: mode.vector,
      displayVector,
      modalMass,
      modalBaseForce,
      ...classification
    };
  });
  const maximumForce = Math.max(...modes.map(mode => Math.abs(mode.modalBaseForce)), 1e-30);
  modes.forEach(mode => { mode.baseParticipationPct = 100 * Math.abs(mode.modalBaseForce) / maximumForce; });
  return { ...model, modes, lengthScale, axis };
}

function realMountState(model, q, gravityAxis) {
  const base = [0, 0, 0];
  const stage1 = model.stage1Mounts.map(mount => {
    const relative = multiplyVector(mount.B1, q.slice(0, 6)).map((value, axis) => value - base[axis]);
    const force = relative.map((value, axis) => mount.stiffness[axis] * value);
    return { relative, force, forceMagnitude: Math.hypot(...force), supportedLoadN: force[gravityAxis] };
  });
  const stage2 = model.stage2Mounts.map(mount => {
    const relative = multiplyVector(mount.B2, q.slice(6, 12)).map((value, axis) => value - multiplyVector(mount.B1, q.slice(0, 6))[axis]);
    const force = relative.map((value, axis) => mount.stiffness[axis] * value);
    return { relative, force, forceMagnitude: Math.hypot(...force), supportedLoadN: force[gravityAxis] };
  });
  return { stage1, stage2 };
}

export function solveCompoundStatic(input, gravityAxisInput = 'z') {
  const model = input.M ? input : assembleCompoundIsolationMatrices(input);
  const gravityAxis = axisIndex(gravityAxisInput);
  const load = Array(12).fill(0);
  load[gravityAxis] = model.body1.massKg * COMPOUND_G0;
  load[6 + gravityAxis] = model.body2.massKg * COMPOUND_G0;
  const qComplex = solveComplexLinearSystem(model.K.map(row => row.map(value => complex(value, 0))), load.map(value => complex(value, 0)));
  const q = qComplex.map(value => value.re);
  return { q, load, gravityAxis, ...realMountState(model, q, gravityAxis) };
}

export function analyzeCompoundIsolation(input) {
  const model = solveCompoundModes(input, input.baseAxis);
  const axis = model.axis;
  const frequencies = logarithmicFrequencyGrid(input.minimumFrequencyHz, input.maximumFrequencyHz, input.pointsPerDecade);
  const responses = frequencies.map(frequency => compoundResponseAtFrequency(model, frequency, input.baseAxis));
  const intermediateAxis = responses.map(response => complexMagnitude(response.body1Q[axis]));
  const payloadAxis = responses.map(response => complexMagnitude(response.body2Q[axis]));
  const intermediatePhaseDeg = unwrapPhaseDegrees(responses.map(response => complexPhaseDeg(response.body1Q[axis])));
  const payloadPhaseDeg = unwrapPhaseDegrees(responses.map(response => complexPhaseDeg(response.body2Q[axis])));
  const phaseDifferenceDeg = unwrapPhaseDegrees(responses.map(response => complexPhaseDeg(complexMultiply(response.body2Q[axis], complex(response.body1Q[axis].re, -response.body1Q[axis].im)))));
  const offAxisMagnitude = responses.map(response => {
    const translation = response.body2Q.slice(0, 3).reduce((sum, value, index) => sum + (index === axis ? 0 : complexMagnitude(value) ** 2), 0);
    const rotation = response.body2Q.slice(3, 6).reduce((sum, value) => sum + (model.lengthScale * complexMagnitude(value)) ** 2, 0);
    return Math.sqrt(translation + rotation);
  });
  const stage1AxisStiffness = model.stage1Mounts.reduce((sum, mount) => sum + mount.stiffness[axis], 0);
  const stage2AxisStiffness = model.stage2Mounts.reduce((sum, mount) => sum + mount.stiffness[axis], 0);
  const stage1AxisDamping = model.stage1Mounts.reduce((sum, mount) => sum + mount.damping[axis], 0);
  const stage2AxisDamping = model.stage2Mounts.reduce((sum, mount) => sum + mount.damping[axis], 0);
  const reference = analyzeTwoStageIsolation({
    m1: model.body1.massKg,
    m2: model.body2.massKg,
    k1: stage1AxisStiffness,
    k2: stage2AxisStiffness,
    c1: stage1AxisDamping,
    c2: stage2AxisDamping,
    minimumFrequencyHz: input.minimumFrequencyHz,
    maximumFrequencyHz: input.maximumFrequencyHz,
    pointsPerDecade: input.pointsPerDecade
  });
  const parityDifferences = responses.map((response, index) => complexMagnitude(complexSubtract(response.body2Q[axis], reference.responses[index].x2)));
  const referenceScale = Math.max(...reference.x2Magnitude, 1e-12);
  const staticState = solveCompoundStatic(model, input.gravityAxis ?? 'z');
  const maximumResponse = Math.max(...payloadAxis, 1e-30);
  const maximumOffAxis = Math.max(...offAxisMagnitude, 0);
  const selectedModes = model.modes.filter(mode => mode.baseParticipationPct >= 1);
  let highFrequencySlopeDbPerDecade = estimateLogSlopeDbPerDecade(frequencies, payloadAxis, Math.max(input.maximumFrequencyHz / 5, selectedModes.at(-1)?.frequencyHz * 1.5 || 0));
  if (!Number.isFinite(highFrequencySlopeDbPerDecade)) highFrequencySlopeDbPerDecade = estimateLogSlopeDbPerDecade(frequencies, payloadAxis, input.maximumFrequencyHz / 3);
  return {
    ...model,
    kind: 'rigid-12dof',
    frequencies,
    responses,
    intermediateAxis,
    payloadAxis,
    intermediatePhaseDeg,
    payloadPhaseDeg,
    phaseDifferenceDeg,
    offAxisMagnitude,
    reference,
    referencePayloadMagnitude: reference.x2Magnitude,
    parityMaximumRelativeDifference: Math.max(...parityDifferences) / referenceScale,
    offAxisPeakRatio: maximumOffAxis / maximumResponse,
    highFrequencySlopeDbPerDecade,
    payloadPeaks: findLocalPeaks(frequencies, payloadAxis, 12),
    selectedModes,
    staticState,
    stage1AxisStiffness,
    stage2AxisStiffness,
    stage1AxisDamping,
    stage2AxisDamping
  };
}
