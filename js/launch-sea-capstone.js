import { seaNetworkState } from './acs519-physics.js';
import { modalDensityAtlasState } from './sea-parameters-physics.js';

const TAU = 2 * Math.PI;
const G0 = 9.80665;
const THIRD_OCTAVE_FRACTION = 2 ** (1 / 6) - 2 ** (-1 / 6);
const STORAGE_KEY = 'sau-launch-sea-capstone-v3';

export const LAUNCH_SEA_BANDS = Object.freeze([63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000]);

export const LAUNCH_SEA_STEPS = Object.freeze([
  { id: 'study', number: '01', title: 'Define study', instruction: 'Choose the mission event, frequency basis, source scale, and receiver criteria before drawing the model.' },
  { id: 'geometry', number: '02', title: 'Build geometry', instruction: 'Describe the installed dimensions that control area, volume, mass, wavelength, and interface extent.' },
  { id: 'subsystems', number: '03', title: 'Partition subsystems', instruction: 'Split the vehicle where energy identity, wave family, construction, or boundary conditions change.' },
  { id: 'modal', number: '04', title: 'Check modal density', instruction: 'Evaluate modes per band and modal overlap for every subsystem before accepting an SEA average.' },
  { id: 'loss', number: '05', title: 'Set loss factors', instruction: 'Assign band-representative internal dissipation with explicit measured, empirical, analytical, or assumed provenance.' },
  { id: 'coupling', number: '06', title: 'Define couplings', instruction: 'Give every network arrow a physical point, line, area, radiation, leak, or flanking mechanism.' },
  { id: 'sources', number: '07', title: 'Apply sources', instruction: 'Convert the flight environment into the band-power vector SEA actually solves.' },
  { id: 'solve', number: '08', title: 'Solve energy flow', instruction: 'Solve stored energies, internal dissipation, gross exchange, net flow, and power closure band by band.' },
  { id: 'response', number: '09', title: 'Recover response', instruction: 'Convert average energy into pressure, velocity, acceleration, and local design margins with stated concentration.' }
]);

const deepClone = value => JSON.parse(JSON.stringify(value));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback = 1) => Math.max(1e-12, finite(value, fallback));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fmt = (value, digits = 3) => {
  if (typeof value === 'string') return value;
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (number === 0) return '0';
  if (Math.abs(number) >= 10000 || Math.abs(number) < 0.001) return number.toExponential(2);
  return number.toFixed(digits).replace(/\.?0+$/, '');
};
const db10 = ratio => 10 * Math.log10(Math.max(ratio, 1e-30));
const nearestBand = value => LAUNCH_SEA_BANDS.reduce((best, band) => Math.abs(band - value) < Math.abs(best - value) ? band : best, LAUNCH_SEA_BANDS[0]);

const defaultSubsystems = () => [
  { id: 'exterior', name: 'Exterior acoustic field', shortName: 'Exterior', kind: 'acoustic', waveFamily: 'acoustic-3d', lossFactor: 0.08, lossSource: 'environment model', geometry: { length: 10, width: 6, height: 5, volume: 300, mass: 1 }, layout: { x: 80, y: 305 } },
  { id: 'fairing-upper', name: 'Upper fairing shell bay', shortName: 'Fairing upper', kind: 'structural', waveFamily: 'honeycomb', lossFactor: 0.022, lossSource: 'empirical built-up sandwich', geometry: { length: 3.2, width: 11.3, height: 0.026, radius: 1.8, thickness: 0.026, mass: 480 }, layout: { x: 260, y: 135 } },
  { id: 'fairing-lower', name: 'Lower fairing shell bay', shortName: 'Fairing lower', kind: 'structural', waveFamily: 'honeycomb', lossFactor: 0.024, lossSource: 'empirical built-up sandwich', geometry: { length: 3.8, width: 11.3, height: 0.026, radius: 1.8, thickness: 0.026, mass: 560 }, layout: { x: 260, y: 475 } },
  { id: 'cavity-upper', name: 'Upper payload cavity', shortName: 'Cavity upper', kind: 'acoustic', waveFamily: 'acoustic-3d', lossFactor: 0.035, lossSource: 'blanket absorption estimate', geometry: { length: 3.2, width: 3.4, height: 3.4, volume: 30.8, mass: 1 }, layout: { x: 455, y: 135 } },
  { id: 'cavity-lower', name: 'Lower payload cavity', shortName: 'Cavity lower', kind: 'acoustic', waveFamily: 'acoustic-3d', lossFactor: 0.03, lossSource: 'blanket absorption estimate', geometry: { length: 3.8, width: 3.4, height: 3.4, volume: 36.6, mass: 1 }, layout: { x: 455, y: 475 } },
  { id: 'payload', name: 'Payload structure', shortName: 'Payload', kind: 'structural', waveFamily: 'plate-bending', lossFactor: 0.018, lossSource: 'assumed installed value', geometry: { length: 2.4, width: 2.2, height: 1, radius: 1.1, thickness: 0.004, mass: 920 }, layout: { x: 650, y: 135 } },
  { id: 'adapter', name: 'Payload adapter', shortName: 'Adapter', kind: 'structural', waveFamily: 'cylinder', lossFactor: 0.02, lossSource: 'empirical built-up shell', geometry: { length: 1.2, width: 6.9, height: 1, radius: 1.1, thickness: 0.006, mass: 280 }, layout: { x: 650, y: 475 } },
  { id: 'upper-stage', name: 'Upper-stage barrel', shortName: 'Upper stage', kind: 'structural', waveFamily: 'cylinder', lossFactor: 0.015, lossSource: 'empirical built-up shell', geometry: { length: 5.5, width: 11.3, height: 1, radius: 1.8, thickness: 0.004, mass: 1050 }, layout: { x: 830, y: 475 } },
  { id: 'avionics', name: 'Avionics deck', shortName: 'Avionics', kind: 'structural', waveFamily: 'plate-bending', lossFactor: 0.028, lossSource: 'assumed installed value', geometry: { length: 2.8, width: 2.8, height: 0.2, radius: 1.4, thickness: 0.008, mass: 340 }, layout: { x: 830, y: 135 } }
];

const defaultConnections = () => [
  { id: 'ext-upper', from: 'exterior', to: 'fairing-upper', mechanism: 'area radiation', forward: 0.014, exponent: 0.1 },
  { id: 'ext-lower', from: 'exterior', to: 'fairing-lower', mechanism: 'area radiation', forward: 0.017, exponent: 0.1 },
  { id: 'upper-cavity', from: 'fairing-upper', to: 'cavity-upper', mechanism: 'panel–cavity radiation', forward: 0.021, exponent: 0.18 },
  { id: 'lower-cavity', from: 'fairing-lower', to: 'cavity-lower', mechanism: 'panel–cavity radiation', forward: 0.024, exponent: 0.18 },
  { id: 'cavity-opening', from: 'cavity-upper', to: 'cavity-lower', mechanism: 'acoustic opening', forward: 0.012, exponent: 0 },
  { id: 'cavity-payload', from: 'cavity-upper', to: 'payload', mechanism: 'acoustic radiation', forward: 0.009, exponent: 0.15 },
  { id: 'payload-adapter', from: 'payload', to: 'adapter', mechanism: 'bolted line joint', forward: 0.006, exponent: -0.08 },
  { id: 'fairing-flank', from: 'fairing-lower', to: 'adapter', mechanism: 'separation-joint flank', forward: 0.003, exponent: 0.05 },
  { id: 'adapter-stage', from: 'adapter', to: 'upper-stage', mechanism: 'circumferential line joint', forward: 0.011, exponent: -0.05 },
  { id: 'stage-avionics', from: 'upper-stage', to: 'avionics', mechanism: 'deck line joint', forward: 0.007, exponent: 0.04 },
  { id: 'cavity-leak', from: 'exterior', to: 'cavity-lower', mechanism: 'direct leak / nonresonant', forward: 0.0008, exponent: 0.3 }
];

export function defaultLaunchSeaProject() {
  return {
    version: 1,
    name: 'Generic launch-vehicle upper stack',
    activeStep: 'study',
    selectedBand: 500,
    selectedSubsystemId: 'fairing-upper',
    selectedConnectionId: 'upper-cavity',
    study: { scenario: 'liftoff', sourceOaspl: 152, sourcePowerScale: 1, localEquipmentPower: 0.02 },
    response: { receiverId: 'payload', cavityId: 'cavity-upper', accelerationLimitG: 14, cavityLimitDb: 132, concentrationFactor: 1.8 },
    subsystems: defaultSubsystems(),
    connections: defaultConnections()
  };
}

function normalizedProject(project = {}) {
  const base = defaultLaunchSeaProject();
  const result = { ...base, ...deepClone(project) };
  result.study = { ...base.study, ...(project.study ?? {}) };
  result.response = { ...base.response, ...(project.response ?? {}) };
  result.subsystems = Array.isArray(project.subsystems) && project.subsystems.length >= 2 ? deepClone(project.subsystems) : base.subsystems;
  result.subsystems = result.subsystems.slice(0, 24).map((item, index) => ({
    ...item,
    id: String(item.id || `subsystem-${index + 1}`),
    name: String(item.name || `Subsystem ${index + 1}`),
    shortName: String(item.shortName || item.name || `Subsystem ${index + 1}`).slice(0, 24),
    kind: item.kind === 'acoustic' ? 'acoustic' : 'structural',
    waveFamily: item.waveFamily || (item.kind === 'acoustic' ? 'acoustic-3d' : 'plate-bending'),
    lossFactor: positive(item.lossFactor, item.kind === 'acoustic' ? 0.025 : 0.02),
    lossSource: String(item.lossSource || 'assumed screening value'),
    geometry: { length: 1, width: 1, height: 1, mass: 25, volume: 1, ...(item.geometry ?? {}) },
    layout: {
      x: finite(item.layout?.x, 100 + (index % 5) * 180),
      y: finite(item.layout?.y, 95 + Math.floor(index / 5) * 105)
    }
  }));
  const subsystemIds = new Set(result.subsystems.map(item => item.id));
  result.connections = (Array.isArray(project.connections) ? deepClone(project.connections) : base.connections)
    .filter(item => subsystemIds.has(item.from) && subsystemIds.has(item.to) && item.from !== item.to)
    .map((item, index) => ({
      ...item,
      id: String(item.id || `connection-${index + 1}`),
      mechanism: String(item.mechanism || 'point bridge'),
      forward: Math.max(0, finite(item.forward, 0.004)),
      exponent: finite(item.exponent, 0)
    }));
  result.selectedBand = nearestBand(positive(result.selectedBand, 500));
  if (!result.subsystems.some(item => item.id === result.selectedSubsystemId)) result.selectedSubsystemId = result.subsystems[0].id;
  if (!result.connections.some(item => item.id === result.selectedConnectionId)) result.selectedConnectionId = result.connections[0]?.id ?? '';
  return result;
}

function sourcePower(project, frequency) {
  const scenario = project.study.scenario;
  const logRatio = Math.log2(frequency / (scenario === 'ascent' ? 630 : scenario === 'equipment' ? 250 : 250));
  const shape = scenario === 'ascent'
    ? Math.exp(-0.5 * (logRatio / 1.55) ** 2)
    : scenario === 'equipment'
      ? 0.14 * Math.exp(-0.5 * (logRatio / 0.75) ** 2)
      : Math.exp(-0.5 * (logRatio / 2.25) ** 2);
  const eventScale = scenario === 'ascent' ? 0.62 : scenario === 'equipment' ? 0.12 : 1;
  const levelScale = 10 ** ((finite(project.study.sourceOaspl, 152) - 152) / 10);
  return Math.max(0, finite(project.study.sourcePowerScale, 1)) * eventScale * levelScale * Math.max(shape, 0.002);
}

function modalStateFor(subsystem, frequency) {
  const geometry = subsystem.geometry ?? {};
  const acoustic = subsystem.kind === 'acoustic';
  const volume = positive(geometry.volume, positive(geometry.length, 1) * positive(geometry.width, 1) * positive(geometry.height, 1));
  const length = positive(geometry.length, Math.cbrt(volume));
  const width = positive(geometry.width, Math.sqrt(volume / length));
  const height = positive(geometry.height, volume / (length * width));
  const type = acoustic
    ? (String(subsystem.waveFamily).startsWith('acoustic-') ? subsystem.waveFamily : 'acoustic-3d')
    : subsystem.waveFamily ?? 'plate-bending';
  return modalDensityAtlasState({
    type,
    boundary: subsystem.boundary ?? 'generic',
    frequency,
    lossFactor: positive(subsystem.lossFactor, 0.02),
    bandFraction: THIRD_OCTAVE_FRACTION,
    length,
    width,
    height,
    radius: positive(geometry.radius, width / (2 * Math.PI)),
    thickness: positive(geometry.thickness, type === 'honeycomb' ? 0.026 : 0.004),
    density: positive(subsystem.materialDensity, type === 'honeycomb' ? 520 : 2700),
    modulus: positive(subsystem.modulus, 70e9),
    poisson: finite(subsystem.poisson, 0.33),
    faceThickness: positive(subsystem.faceThickness, 0.0006),
    coreThickness: positive(subsystem.coreThickness, 0.0248),
    coreShearModulus: positive(subsystem.coreShearModulus, 85e6)
  });
}

export function solveLaunchSeaProject(projectInput = {}) {
  const project = normalizedProject(projectInput);
  const bands = LAUNCH_SEA_BANDS.map(frequency => {
    const modalStates = project.subsystems.map(item => modalStateFor(item, frequency));
    const indexById = new Map(project.subsystems.map((item, index) => [item.id, index]));
    const exteriorIndex = indexById.get('exterior') ?? 0;
    const avionicsIndex = indexById.get('avionics');
    const subsystems = project.subsystems.map((item, index) => {
      const geometry = item.geometry ?? {};
      const modal = modalStates[index];
      const inputPower = index === exteriorIndex ? sourcePower(project, frequency) : index === avionicsIndex ? Math.max(0, finite(project.study.localEquipmentPower, 0.02)) : Math.max(0, finite(item.inputPower, 0));
      return {
        name: item.name,
        kind: item.kind,
        modalDensity: modal.modalDensity,
        lossFactor: positive(item.lossFactor, 0.02),
        inputPower,
        mass: positive(geometry.mass, modal.properties?.mass ?? 25),
        volume: positive(geometry.volume, positive(geometry.length, 1) * positive(geometry.width, 1) * positive(geometry.height, 1)),
        density: 1.204,
        soundSpeed: 343
      };
    });
    const connections = project.connections.filter(item => indexById.has(item.from) && indexById.has(item.to) && item.from !== item.to);
    const links = connections.map(item => ({
      i: indexById.get(item.from),
      j: indexById.get(item.to),
      forward: clamp(Math.max(0, finite(item.forward, 0.005)) * (frequency / 1000) ** finite(item.exponent, 0), 0, 0.45)
    }));
    const receiverIndex = indexById.get(project.response.receiverId) ?? Math.min(1, subsystems.length - 1);
    const cavityIndex = indexById.get(project.response.cavityId) ?? project.subsystems.findIndex(item => item.kind === 'acoustic' && item.id !== 'exterior');
    const network = seaNetworkState({ frequency, bandFraction: THIRD_OCTAVE_FRACTION, subsystems, links, sourceIndex: exteriorIndex, receiverIndex });
    const resultById = Object.fromEntries(project.subsystems.map((item, index) => [item.id, {
      ...network.subsystemResults[index],
      id: item.id,
      modal: modalStates[index],
      outgoingClf: network.links.reduce((sum, link) => sum + (link.i === index ? link.forward : link.j === index ? link.reverse : 0), 0)
    }]));
    const receiver = network.subsystemResults[receiverIndex];
    const cavity = network.subsystemResults[Math.max(0, cavityIndex)] ?? null;
    const receiverAccelerationG = receiver.kind === 'structural' ? TAU * frequency * receiver.velocityRms / G0 : 0;
    const localAccelerationG = receiverAccelerationG * Math.max(1, finite(project.response.concentrationFactor, 1.8));
    const accelerationMarginDb = 20 * Math.log10(positive(project.response.accelerationLimitG, 14) / Math.max(localAccelerationG, 1e-30));
    const cavityLevel = cavity?.levelDb ?? null;
    const cavityMarginDb = cavityLevel == null ? null : finite(project.response.cavityLimitDb, 132) - cavityLevel;
    const validity = project.subsystems.map((item, index) => {
      const modal = modalStates[index];
      const outgoing = resultById[item.id].outgoingClf;
      const weakRatio = outgoing / positive(item.lossFactor, 0.02);
      const status = modal.modesInBand >= 5 && modal.modalOverlap >= 1 && weakRatio <= 0.75 ? 'supported' : modal.modesInBand >= 2 && modal.modalOverlap >= 0.3 && weakRatio <= 1.5 ? 'transition' : 'hybrid';
      return { id: item.id, modesInBand: modal.modesInBand, modalOverlap: modal.modalOverlap, weakRatio, status };
    });
    const powerFlows = network.powerFlows.map((flow, index) => ({ ...flow, id: connections[index]?.id ?? `link-${index}`, mechanism: connections[index]?.mechanism ?? 'coupling' }));
    return {
      frequency,
      modalStates,
      network,
      resultById,
      validity,
      sourcePower: subsystems.reduce((sum, item) => sum + item.inputPower, 0),
      receiverAccelerationG,
      localAccelerationG,
      accelerationMarginDb,
      cavityLevel,
      cavityMarginDb,
      powerFlows
    };
  });
  const selected = bands.find(item => item.frequency === project.selectedBand) ?? bands[0];
  const strongestFlow = selected.powerFlows.reduce((best, flow) => !best || Math.abs(flow.net) > Math.abs(best.net) ? flow : best, null);
  const statusCounts = selected.validity.reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] ?? 0) + 1 }), { supported: 0, transition: 0, hybrid: 0 });
  return {
    project,
    bands,
    selected,
    strongestFlow,
    statusCounts,
    maxBalanceError: Math.max(...bands.map(item => Math.abs(item.network.balanceError))),
    accelerationControllingBand: bands.reduce((best, item) => item.localAccelerationG > best.localAccelerationG ? item : best, bands[0]),
    cavityControllingBand: bands.reduce((best, item) => (item.cavityLevel ?? -Infinity) > (best.cavityLevel ?? -Infinity) ? item : best, bands[0])
  };
}

function workflowHtml(activeStep) {
  return LAUNCH_SEA_STEPS.map(step => `<button type="button" class="capstone-step${step.id === activeStep ? ' is-active' : ''}" data-capstone-step="${step.id}" aria-current="${step.id === activeStep ? 'step' : 'false'}"><span>${step.number}</span><strong>${esc(step.title)}</strong></button>`).join('');
}

function selectedStep(project) { return LAUNCH_SEA_STEPS.find(step => step.id === project.activeStep) ?? LAUNCH_SEA_STEPS[0]; }

function geometrySvg(project, solution) {
  const selected = project.selectedSubsystemId;
  const region = (id, markup) => `<g class="capstone-geom-region${id === selected ? ' is-selected' : ''}" data-capstone-subsystem="${id}" role="button" tabindex="0" aria-label="Select ${esc(project.subsystems.find(item => item.id === id)?.name ?? id)}">${markup}</g>`;
  const validity = Object.fromEntries(solution.selected.validity.map(item => [item.id, item.status]));
  const statusClass = id => ` status-${validity[id] ?? 'transition'}`;
  return `<svg class="capstone-vehicle-svg" viewBox="0 0 420 670" role="img" aria-labelledby="capstone-vehicle-title capstone-vehicle-desc"><title id="capstone-vehicle-title">Launch vehicle SEA subsystem atlas</title><desc id="capstone-vehicle-desc">Selectable fairing, cavity, payload, adapter, upper-stage, avionics, and exterior-field subsystems.</desc>
    <defs><linearGradient id="capstone-body-gradient" x1="0" x2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".18"/><stop offset=".5" stop-color="currentColor" stop-opacity=".04"/><stop offset="1" stop-color="currentColor" stop-opacity=".18"/></linearGradient></defs>
    <g class="capstone-field-lines"><ellipse cx="210" cy="290" rx="180" ry="265"/><ellipse cx="210" cy="290" rx="155" ry="235"/><path d="M25 260 H395 M40 340 H380 M55 420 H365"/></g>
    ${region('exterior', '<path class="capstone-hit-field" d="M20 38 H400 V620 H20Z" fill="transparent"/>')}
    <g class="capstone-vehicle-outline"><path d="M142 235 Q148 105 210 38 Q272 105 278 235Z"/><path d="M142 235 H278 V438 H142Z"/><path d="M151 438 H269 V530 H151Z"/><path d="M142 530 H278 V628 H142Z"/><path d="M142 628 H278"/></g>
    ${region('fairing-upper', `<path class="capstone-shell${statusClass('fairing-upper')}" d="M142 235 Q148 105 210 38 Q272 105 278 235 L264 235 Q255 118 210 65 Q165 118 156 235Z"/>`)}
    ${region('fairing-lower', `<path class="capstone-shell${statusClass('fairing-lower')}" d="M142 235 H156 V438 H142Z M264 235 H278 V438 H264Z"/>`)}
    ${region('cavity-upper', `<path class="capstone-cavity${statusClass('cavity-upper')}" d="M157 235 Q165 119 210 66 Q255 119 263 235Z"/>`)}
    ${region('cavity-lower', `<rect class="capstone-cavity${statusClass('cavity-lower')}" x="157" y="235" width="106" height="203"/>`)}
    ${region('payload', `<path class="capstone-payload${statusClass('payload')}" d="M177 182 H243 V335 H177Z M166 335 H254 V350 H166Z"/><path class="capstone-payload-detail" d="M210 182 V132 M190 150 H230"/>`)}
    ${region('adapter', `<path class="capstone-structure${statusClass('adapter')}" d="M166 350 H254 L264 438 H156Z"/>`)}
    ${region('avionics', `<path class="capstone-structure${statusClass('avionics')}" d="M151 438 H269 V462 H151Z"/>`)}
    ${region('upper-stage', `<path class="capstone-stage${statusClass('upper-stage')}" d="M151 462 H269 V530 H278 V628 H142 V530 H151Z"/><path class="capstone-stage-detail" d="M151 510 H269 M151 548 H269 M151 590 H269"/>`)}
    <g class="capstone-atlas-labels"><path d="M278 130 H345"/><text x="350" y="134">Upper fairing</text><path d="M278 274 H345"/><text x="350" y="278">Payload + cavity</text><path d="M278 394 H345"/><text x="350" y="398">Adapter / flank</text><path d="M269 448 H345"/><text x="350" y="452">Avionics deck</text><path d="M278 558 H345"/><text x="350" y="562">Upper stage</text></g>
  </svg>`;
}

function networkSvg(project, solution) {
  const selectedSubsystem = project.selectedSubsystemId;
  const selectedConnection = project.selectedConnectionId;
  const byId = new Map(project.subsystems.map(item => [item.id, item]));
  const maxFlow = Math.max(...solution.selected.powerFlows.map(item => Math.abs(item.net)), 1e-12);
  const links = solution.selected.powerFlows.map(flow => {
    const connection = project.connections.find(item => item.id === flow.id);
    const from = byId.get(connection?.from), to = byId.get(connection?.to);
    if (!from || !to) return '';
    const width = 1.5 + 8 * Math.sqrt(Math.abs(flow.net) / maxFlow);
    const reverse = flow.net < 0;
    const x1 = reverse ? to.layout.x : from.layout.x, y1 = reverse ? to.layout.y : from.layout.y;
    const x2 = reverse ? from.layout.x : to.layout.x, y2 = reverse ? from.layout.y : to.layout.y;
    return `<g class="capstone-network-link${flow.id === selectedConnection ? ' is-selected' : ''}" data-capstone-connection="${esc(flow.id)}" role="button" tabindex="0" aria-label="Select ${esc(flow.from)} to ${esc(flow.to)} coupling"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="--flow-width:${width}px" marker-end="url(#capstone-arrow)"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 7}">${fmt(Math.abs(flow.net), 2)} W</text></g>`;
  }).join('');
  const nodes = project.subsystems.map(item => {
    const result = solution.selected.resultById[item.id];
    const validity = solution.selected.validity.find(entry => entry.id === item.id)?.status ?? 'transition';
    return `<g class="capstone-network-node kind-${item.kind} status-${validity}${item.id === selectedSubsystem ? ' is-selected' : ''}" data-capstone-subsystem="${esc(item.id)}" role="button" tabindex="0" aria-label="Select ${esc(item.name)}"><rect x="${item.layout.x - 62}" y="${item.layout.y - 31}" width="124" height="62" rx="5"/><text class="node-title" x="${item.layout.x}" y="${item.layout.y - 7}">${esc(item.shortName ?? item.name)}</text><text class="node-value" x="${item.layout.x}" y="${item.layout.y + 14}">${fmt(result?.energy ?? 0, 2)} J</text></g>`;
  }).join('');
  const viewHeight = Math.max(610, ...project.subsystems.map(item => item.layout.y + 80));
  return `<svg class="capstone-network-svg" viewBox="0 0 930 ${viewHeight}" role="img" aria-labelledby="capstone-network-title capstone-network-desc"><title id="capstone-network-title">SEA energy-flow network</title><desc id="capstone-network-desc">Subsystem node values show stored energy. Arrow widths show selected-band net coupling power.</desc><defs><marker id="capstone-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z"/></marker></defs>${links}${nodes}</svg>`;
}

function field(label, path, value, { type = 'number', unit = '', step = 'any', min = '', options = [] } = {}) {
  const control = type === 'select'
    ? `<select data-capstone-field="${path}">${options.map(option => `<option value="${esc(option.value)}"${String(option.value) === String(value) ? ' selected' : ''}>${esc(option.label)}</option>`).join('')}</select>`
    : `<input data-capstone-field="${path}" type="${type}" value="${esc(value)}" step="${step}"${min !== '' ? ` min="${min}"` : ''}/>`;
  return `<label class="capstone-field"><span>${esc(label)}${unit ? `<small>${esc(unit)}</small>` : ''}</span>${control}</label>`;
}

function inspectorHtml(project, solution) {
  const step = selectedStep(project);
  const subsystem = project.subsystems.find(item => item.id === project.selectedSubsystemId) ?? project.subsystems[0];
  const connection = project.connections.find(item => item.id === project.selectedConnectionId) ?? project.connections[0];
  const result = solution.selected.resultById[subsystem.id];
  const validity = solution.selected.validity.find(item => item.id === subsystem.id);
  let controls = '';
  if (step.id === 'study' || step.id === 'sources') controls = `
    ${field('Mission event', 'study.scenario', project.study.scenario, { type: 'select', options: [{ value: 'liftoff', label: 'Liftoff acoustic field' }, { value: 'ascent', label: 'Ascent TBL screen' }, { value: 'equipment', label: 'Equipment-dominated event' }] })}
    ${field('Source OASPL reference', 'study.sourceOaspl', project.study.sourceOaspl, { unit: 'dB', min: 100 })}
    ${field('Equivalent power scale', 'study.sourcePowerScale', project.study.sourcePowerScale, { unit: '×', min: 0, step: 0.05 })}
    ${field('Local avionics input power', 'study.localEquipmentPower', project.study.localEquipmentPower, { unit: 'W', min: 0, step: 0.005 })}`;
  else if (step.id === 'geometry') controls = `
    ${field('Selected subsystem', 'selectedSubsystemId', subsystem.id, { type: 'select', options: project.subsystems.map(item => ({ value: item.id, label: item.name })) })}
    ${field('Length', 'sub.geometry.length', subsystem.geometry.length, { unit: 'm', min: 0.01 })}
    ${field('Width / circumference', 'sub.geometry.width', subsystem.geometry.width, { unit: 'm', min: 0.01 })}
    ${field('Depth / height', 'sub.geometry.height', subsystem.geometry.height, { unit: 'm', min: 0.001 })}
    ${field('Radius', 'sub.geometry.radius', subsystem.geometry.radius ?? 1, { unit: 'm', min: 0.001 })}
    ${field('Thickness', 'sub.geometry.thickness', subsystem.geometry.thickness ?? 0.004, { unit: 'm', min: 0.00001, step: 0.0001 })}
    ${field(subsystem.kind === 'acoustic' ? 'Volume' : 'Installed mass', subsystem.kind === 'acoustic' ? 'sub.geometry.volume' : 'sub.geometry.mass', subsystem.kind === 'acoustic' ? subsystem.geometry.volume : subsystem.geometry.mass, { unit: subsystem.kind === 'acoustic' ? 'm³' : 'kg', min: 0.001 })}`;
  else if (step.id === 'subsystems') controls = `
    ${field('Subsystem', 'selectedSubsystemId', subsystem.id, { type: 'select', options: project.subsystems.map(item => ({ value: item.id, label: item.name })) })}
    ${field('Subsystem name', 'sub.name', subsystem.name, { type: 'text' })}
    ${field('Energy domain', 'sub.kind', subsystem.kind, { type: 'select', options: [{ value: 'structural', label: 'Structural' }, { value: 'acoustic', label: 'Acoustic' }] })}
    ${field('Wave family', 'sub.waveFamily', subsystem.waveFamily, { type: 'select', options: [{ value: 'plate-bending', label: 'Plate bending' }, { value: 'honeycomb', label: 'Honeycomb sandwich' }, { value: 'cylinder', label: 'Cylindrical shell' }, { value: 'acoustic-3d', label: 'Three-dimensional acoustic' }, { value: 'acoustic-2d', label: 'Two-dimensional acoustic' }] })}
    <button type="button" class="button-secondary" data-capstone-action="add-subsystem">Add connected subsystem</button>`;
  else if (step.id === 'modal') controls = `<dl class="capstone-readout"><div><dt>Modal density</dt><dd>${fmt(result.modal.modalDensity)} modes/Hz</dd></div><div><dt>Modes in band</dt><dd>${fmt(validity.modesInBand)}</dd></div><div><dt>Modal overlap</dt><dd>${fmt(validity.modalOverlap)}</dd></div><div><dt>Coupling / DLF</dt><dd>${fmt(validity.weakRatio)}</dd></div><div><dt>Readiness</dt><dd class="status-${validity.status}">${validity.status}</dd></div></dl>`;
  else if (step.id === 'loss') controls = `
    ${field('Subsystem', 'selectedSubsystemId', subsystem.id, { type: 'select', options: project.subsystems.map(item => ({ value: item.id, label: item.name })) })}
    ${field('Internal loss factor', 'sub.lossFactor', subsystem.lossFactor, { min: 0.000001, step: 0.001 })}
    ${field('Loss-factor provenance', 'sub.lossSource', subsystem.lossSource, { type: 'select', options: [{ value: 'measured installed value', label: 'Measured installed' }, { value: 'empirical construction family', label: 'Empirical construction' }, { value: 'analytical estimate', label: 'Analytical estimate' }, { value: 'assumed screening value', label: 'Assumed screen' }] })}
    <p class="capstone-inspector-note">Internal DLF removes energy inside this subsystem. Do not fold outgoing CLFs into this value or count radiation twice.</p>`;
  else if (step.id === 'coupling') controls = connection ? `
    ${field('Connection', 'selectedConnectionId', connection.id, { type: 'select', options: project.connections.map(item => ({ value: item.id, label: `${project.subsystems.find(s => s.id === item.from)?.shortName} → ${project.subsystems.find(s => s.id === item.to)?.shortName}` })) })}
    ${field('From subsystem', 'conn.from', connection.from, { type: 'select', options: project.subsystems.filter(item => item.id !== connection.to).map(item => ({ value: item.id, label: item.name })) })}
    ${field('To subsystem', 'conn.to', connection.to, { type: 'select', options: project.subsystems.filter(item => item.id !== connection.from).map(item => ({ value: item.id, label: item.name })) })}
    ${field('Physical mechanism', 'conn.mechanism', connection.mechanism, { type: 'select', options: ['area radiation', 'panel–cavity radiation', 'point bridge', 'bolted line joint', 'circumferential line joint', 'acoustic opening', 'direct leak / nonresonant', 'separation-joint flank', 'measured coupling'].map(value => ({ value, label: value })) })}
    ${field('Forward CLF at 1 kHz', 'conn.forward', connection.forward, { min: 0, step: 0.001 })}
    ${field('Frequency exponent', 'conn.exponent', connection.exponent, { step: 0.05 })}
    <dl class="capstone-readout"><div><dt>Forward CLF</dt><dd>${fmt(solution.selected.powerFlows.find(item => item.id === connection.id)?.forward ?? 0)}</dd></div><div><dt>Reciprocal reverse</dt><dd>${fmt(solution.selected.powerFlows.find(item => item.id === connection.id)?.reverse ?? 0)}</dd></div></dl>
    <button type="button" class="button-secondary" data-capstone-action="add-connection">Add connection from selected subsystem</button>` : '<p>No valid connection is selected.</p>';
  else if (step.id === 'solve') controls = `<dl class="capstone-readout"><div><dt>Selected band</dt><dd>${solution.selected.frequency} Hz</dd></div><div><dt>Total input</dt><dd>${fmt(solution.selected.network.totalInputPower)} W</dd></div><div><dt>Total dissipation</dt><dd>${fmt(solution.selected.network.totalDissipatedPower)} W</dd></div><div><dt>Power closure error</dt><dd>${fmt(100 * solution.selected.network.balanceError, 5)}%</dd></div><div><dt>Strongest net path</dt><dd>${esc(solution.strongestFlow ? `${solution.strongestFlow.from} → ${solution.strongestFlow.to}` : 'None')}</dd></div></dl>`;
  else controls = `
    ${field('Structural receiver', 'response.receiverId', project.response.receiverId, { type: 'select', options: project.subsystems.filter(item => item.kind === 'structural').map(item => ({ value: item.id, label: item.name })) })}
    ${field('Acoustic receiver', 'response.cavityId', project.response.cavityId, { type: 'select', options: project.subsystems.filter(item => item.kind === 'acoustic' && item.id !== 'exterior').map(item => ({ value: item.id, label: item.name })) })}
    ${field('Acceleration limit', 'response.accelerationLimitG', project.response.accelerationLimitG, { unit: 'g', min: 0.001 })}
    ${field('Cavity SPL limit', 'response.cavityLimitDb', project.response.cavityLimitDb, { unit: 'dB', min: 0 })}
    ${field('Local concentration', 'response.concentrationFactor', project.response.concentrationFactor, { unit: '×', min: 1, step: 0.1 })}`;
  return `<div class="capstone-inspector-heading"><p class="eyebrow">${step.number} · ${esc(step.title)}</p><h2>${esc(subsystem.name)}</h2><p>${esc(step.instruction)}</p></div><div class="capstone-inspector-fields">${controls}</div>`;
}

function logPosition(value, min, max, low, high) { return low + Math.log(value / min) / Math.log(max / min) * (high - low); }

function linePath(values, xFor, yFor) { return values.map((value, index) => `${index ? 'L' : 'M'}${xFor(index).toFixed(2)},${yFor(value).toFixed(2)}`).join(' '); }

function analyticsHtml(project, solution) {
  const step = selectedStep(project).id;
  const width = 920, height = 300, left = 68, right = 24, top = 25, bottom = 48;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const selectedX = logPosition(project.selectedBand, LAUNCH_SEA_BANDS[0], LAUNCH_SEA_BANDS.at(-1), left, left + plotWidth);
  if (step === 'study') {
    const max = Math.max(...solution.bands.map(item => item.sourcePower));
    return `<div class="capstone-study-grid"><section><span>Mission event</span><strong>${project.study.scenario === 'liftoff' ? 'Liftoff acoustics' : project.study.scenario === 'ascent' ? 'Ascent TBL' : 'Equipment forcing'}</strong><p>Source OASPL reference ${fmt(project.study.sourceOaspl, 1)} dB · equivalent power scale ${fmt(project.study.sourcePowerScale, 2)}×</p></section><section><span>Frequency basis</span><strong>19 one-third-octave bands</strong><p>63–4000 Hz with ${project.selectedBand} Hz active for atlas inspection.</p></section><section><span>Structural receiver</span><strong>${esc(project.subsystems.find(item => item.id === project.response.receiverId)?.name ?? project.response.receiverId)}</strong><p>${fmt(project.response.accelerationLimitG, 2)} g limit · ${fmt(project.response.concentrationFactor, 2)}× local concentration.</p></section><section><span>Acoustic receiver</span><strong>${esc(project.subsystems.find(item => item.id === project.response.cavityId)?.name ?? project.response.cavityId)}</strong><p>${fmt(project.response.cavityLimitDb, 1)} dB SPL screening limit.</p></section></div><div class="capstone-band-bars capstone-study-spectrum" aria-label="Equivalent source power basis by frequency band">${solution.bands.map(item => `<button type="button" data-capstone-band="${item.frequency}" class="${item.frequency === project.selectedBand ? 'is-selected' : ''}"><i style="--bar:${item.sourcePower / max}"></i><span>${item.frequency}</span></button>`).join('')}</div>`;
  }
  if (step === 'modal' || step === 'subsystems' || step === 'geometry') {
    const all = solution.bands.flatMap(band => project.subsystems.map(item => band.resultById[item.id].modal.modalDensity));
    const ymin = Math.max(1e-5, Math.min(...all) / 1.5), ymax = Math.max(...all) * 1.5;
    const xFor = index => logPosition(LAUNCH_SEA_BANDS[index], LAUNCH_SEA_BANDS[0], LAUNCH_SEA_BANDS.at(-1), left, left + plotWidth);
    const yFor = value => top + plotHeight - Math.log(value / ymin) / Math.log(ymax / ymin) * plotHeight;
    const paths = project.subsystems.map((item, subsystemIndex) => `<path class="${item.id === project.selectedSubsystemId ? 'is-primary' : ''}" d="${linePath(solution.bands.map(band => band.modalStates[subsystemIndex].modalDensity), xFor, yFor)}"/><text x="${left + plotWidth - 4}" y="${yFor(solution.bands.at(-1).modalStates[subsystemIndex].modalDensity)}">${esc(item.shortName)}</text>`).join('');
    const tableRows = project.subsystems.map(item => { const result = solution.selected.resultById[item.id], validity = solution.selected.validity.find(entry => entry.id === item.id); return `<tr><td><button type="button" data-capstone-subsystem="${item.id}">${esc(item.name)}</button></td><td>${fmt(result.modal.modalDensity)}</td><td>${fmt(validity.modesInBand)}</td><td>${fmt(validity.modalOverlap)}</td><td><span class="capstone-status status-${validity.status}">${validity.status}</span></td></tr>`; }).join('');
    return `<div class="capstone-chart"><h3>Modal density across the analysis range</h3><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Modal-density curves for all launch-vehicle SEA subsystems"><g class="capstone-chart-grid"><path d="M${left} ${top}V${top + plotHeight}H${left + plotWidth}"/><line x1="${selectedX}" x2="${selectedX}" y1="${top}" y2="${top + plotHeight}"/></g><g class="capstone-chart-series">${paths}</g><text class="axis-label" x="${left + plotWidth / 2}" y="${height - 10}">One-third-octave band center (Hz)</text></svg></div><div class="table-wrap"><table><thead><tr><th>Subsystem</th><th>modes/Hz</th><th>modes/band</th><th>overlap</th><th>readiness</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
  }
  if (step === 'loss') {
    const rows = project.subsystems.map(item => `<tr><td><button type="button" data-capstone-subsystem="${item.id}">${esc(item.name)}</button></td><td>${fmt(item.lossFactor)}</td><td>${esc(item.lossSource)}</td><td>${fmt(solution.selected.resultById[item.id].dissipatedPower)} W</td></tr>`).join('');
    return `<div class="capstone-loss-bars">${project.subsystems.map(item => `<button type="button" data-capstone-subsystem="${item.id}" class="${item.id === project.selectedSubsystemId ? 'is-selected' : ''}"><span>${esc(item.shortName)}</span><i style="--loss:${clamp(item.lossFactor / 0.08, 0, 1)}"></i><strong>η = ${fmt(item.lossFactor)}</strong></button>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>Subsystem</th><th>Internal DLF</th><th>Provenance</th><th>Dissipation at ${project.selectedBand} Hz</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  if (step === 'coupling') {
    const rows = solution.selected.powerFlows.map(flow => `<tr><td><button type="button" data-capstone-connection="${flow.id}">${esc(flow.from)} → ${esc(flow.to)}</button></td><td>${esc(flow.mechanism)}</td><td>${fmt(flow.forward)}</td><td>${fmt(flow.reverse)}</td><td>${fmt(flow.grossForward)}</td><td>${fmt(flow.grossReverse)}</td><td>${fmt(flow.net)}</td></tr>`).join('');
    return `<div class="table-wrap"><table><thead><tr><th>Connection</th><th>Mechanism</th><th>η forward</th><th>η reverse</th><th>gross → W</th><th>gross ← W</th><th>net → W</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  if (step === 'sources') {
    const max = Math.max(...solution.bands.map(item => item.sourcePower));
    return `<div class="capstone-band-bars" aria-label="Equivalent input power by frequency band">${solution.bands.map(item => `<button type="button" data-capstone-band="${item.frequency}" class="${item.frequency === project.selectedBand ? 'is-selected' : ''}"><i style="--bar:${item.sourcePower / max}"></i><span>${item.frequency}</span></button>`).join('')}</div><p class="capstone-analytics-copy">The displayed watts are the equivalent band powers accepted by the modeled source subsystem. They are deliberately separate from the entered pressure-level reference.</p>`;
  }
  if (step === 'response') {
    const maxAcceleration = Math.max(...solution.bands.map(item => item.localAccelerationG), 1e-12);
    return `<div class="capstone-response-plots"><section><h3>Local receiver acceleration</h3><div class="capstone-band-bars response-bars">${solution.bands.map(item => `<button type="button" data-capstone-band="${item.frequency}" class="${item.frequency === project.selectedBand ? 'is-selected' : ''}"><i style="--bar:${item.localAccelerationG / maxAcceleration}"></i><span>${item.frequency}</span><small>${fmt(item.localAccelerationG, 2)} g</small></button>`).join('')}</div></section><section class="capstone-margin-panel"><dl><div><dt>Selected-band local acceleration</dt><dd>${fmt(solution.selected.localAccelerationG, 2)} g</dd></div><div><dt>Acceleration margin</dt><dd class="${solution.selected.accelerationMarginDb >= 0 ? 'status-supported' : 'status-hybrid'}">${fmt(solution.selected.accelerationMarginDb, 2)} dB</dd></div><div><dt>Selected cavity level</dt><dd>${fmt(solution.selected.cavityLevel, 1)} dB SPL</dd></div><div><dt>Cavity margin</dt><dd class="${solution.selected.cavityMarginDb >= 0 ? 'status-supported' : 'status-hybrid'}">${fmt(solution.selected.cavityMarginDb, 2)} dB</dd></div></dl></section></div>`;
  }
  const maxEnergy = Math.max(...solution.selected.network.energies, 1e-30);
  const rows = [...solution.selected.powerFlows].sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).map(flow => `<tr><td>${esc(flow.from)} → ${esc(flow.to)}</td><td>${esc(flow.mechanism)}</td><td>${fmt(flow.grossForward)}</td><td>${fmt(flow.grossReverse)}</td><td>${fmt(flow.net)}</td></tr>`).join('');
  return `<div class="capstone-energy-bars">${project.subsystems.map((item, index) => `<button type="button" data-capstone-subsystem="${item.id}" class="${item.id === project.selectedSubsystemId ? 'is-selected' : ''}"><span>${esc(item.shortName)}</span><i style="--energy:${solution.selected.network.energies[index] / maxEnergy}"></i><strong>${fmt(solution.selected.network.energies[index], 2)} J</strong></button>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>Power path</th><th>Mechanism</th><th>gross → W</th><th>gross ← W</th><th>net → W</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function takeaways(project, solution) {
  const step = selectedStep(project).id;
  const subsystem = project.subsystems.find(item => item.id === project.selectedSubsystemId) ?? project.subsystems[0];
  const validity = solution.selected.validity.find(item => item.id === subsystem.id);
  const base = {
    study: `${project.study.scenario === 'liftoff' ? 'Liftoff acoustics' : project.study.scenario === 'ascent' ? 'Ascent boundary-layer forcing' : 'Local equipment forcing'} controls the present source shape. Confirm that every input refers to the same event, bandwidth, and statistical basis.`,
    geometry: `${subsystem.name} uses its installed geometry to set modal population and response recovery. Split it if construction, boundary conditions, loading, or wave behavior change materially along the hardware.`,
    subsystems: `${project.subsystems.length} subsystems and ${project.connections.length} physical connections are active. A subsystem is justified by independent energy identity—not by visual convenience.`,
    modal: `${subsystem.name} is ${validity.status} at ${project.selectedBand} Hz with ${fmt(validity.modesInBand)} modes per band and ${fmt(validity.modalOverlap)} modal overlap.`,
    loss: `${subsystem.name} uses η=${fmt(subsystem.lossFactor)} from ${subsystem.lossSource}. Increasing damping lowers its stored energy but can expose a different receiver path.`,
    coupling: solution.strongestFlow ? `${solution.strongestFlow.from} → ${solution.strongestFlow.to} is the largest selected-band net flow. Gross exchange remains active in both directions, so path ranking must use the solved state rather than CLF magnitude alone.` : 'No coupling power is present in the selected band.',
    sources: `${fmt(solution.selected.sourcePower)} W enters the network at ${project.selectedBand} Hz. Pressure level is not SEA power until spatial acceptance and mobility have been represented.`,
    solve: `The ${project.selectedBand} Hz solution closes power to ${fmt(100 * Math.abs(solution.selected.network.balanceError), 5)}%. Numerical closure is necessary, but ${solution.statusCounts.hybrid} subsystems still require hybrid or deterministic treatment.`,
    response: `The recovered local receiver response is ${fmt(solution.selected.localAccelerationG, 2)} g with ${fmt(solution.selected.accelerationMarginDb, 2)} dB margin. The concentration factor converts an SEA average into a screening local quantity, not a certified maximum.`
  };
  return base[step] ?? base.solve;
}

function panelTakeaway(kind, project, solution) {
  const subsystem = project.subsystems.find(item => item.id === project.selectedSubsystemId) ?? project.subsystems[0];
  const result = solution.selected.resultById[subsystem.id];
  const validity = solution.selected.validity.find(item => item.id === subsystem.id);
  if (kind === 'geometry') return `${subsystem.name} is the active ${subsystem.kind} energy store. Its installed dimensions produce ${fmt(validity.modesInBand)} modes in the ${project.selectedBand} Hz band and a ${validity.status} SEA-readiness classification.`;
  const totalEnergy = solution.selected.network.energies.reduce((sum, value) => sum + value, 0);
  const share = 100 * result.energy / Math.max(totalEnergy, 1e-30);
  return solution.strongestFlow
    ? `${subsystem.name} contains ${fmt(share, 1)}% of selected-band stored energy. The dominant net path is ${solution.strongestFlow.from} → ${solution.strongestFlow.to} at ${fmt(Math.abs(solution.strongestFlow.net), 3)} W.`
    : `${subsystem.name} contains ${fmt(share, 1)}% of selected-band stored energy; no coupling path is active.`;
}

function warningHtml(solution) {
  const warnings = [];
  if (solution.statusCounts.hybrid) warnings.push(`${solution.statusCounts.hybrid} subsystem${solution.statusCounts.hybrid === 1 ? '' : 's'} fail the selected-band statistical-readiness screen.`);
  if (solution.statusCounts.transition) warnings.push(`${solution.statusCounts.transition} subsystem${solution.statusCounts.transition === 1 ? '' : 's'} are transitional and should be sensitivity-bracketed.`);
  if (solution.maxBalanceError > 1e-8) warnings.push(`Maximum band power-balance error is ${fmt(100 * solution.maxBalanceError, 5)}%.`);
  if (solution.selected.accelerationMarginDb < 0) warnings.push('The selected-band local acceleration exceeds its screening limit.');
  if (solution.selected.cavityMarginDb != null && solution.selected.cavityMarginDb < 0) warnings.push('The selected cavity SPL exceeds its screening limit.');
  return warnings.length ? warnings.map(item => `<li>${esc(item)}</li>`).join('') : '<li>No active numerical or selected-band screening warnings.</li>';
}

export function renderLaunchSeaCapstone(projectInput = {}) {
  const project = normalizedProject(projectInput);
  const solution = solveLaunchSeaProject(project);
  const step = selectedStep(project);
  return `<div class="page-shell site-page-shell site-page-shell-capstone"><nav class="breadcrumbs site-breadcrumbs" aria-label="Breadcrumb"><a href="#/tools">Tools</a><span aria-hidden="true">›</span><span>SEA &amp; Energy</span><span aria-hidden="true">›</span><span aria-current="page">Launch-Vehicle SEA Capstone</span></nav>
    <section class="capstone-hero site-page-header"><div><p class="eyebrow">SEA &amp; Energy · Guided launch-vehicle workflow</p><h1>Launch-Vehicle SEA Capstone</h1><p>Build the geometry, partition subsystems, derive band parameters, solve reciprocal energy flow, and recover payload response in one auditable model.</p><div class="button-row"><a class="button-secondary" href="#/tool/launch-vibroacoustic-capstone?mode=quick">Open legacy quick screen</a><a class="button-secondary" href="#/cheat-sheet?section=launch-vibroacoustic-capstone">Read workflow chapter</a></div></div><aside class="capstone-hero-status site-status-panel"><dl><div><dt>Project</dt><dd>${esc(project.name)}</dd></div><div><dt>Model</dt><dd>${project.subsystems.length} subsystems · ${project.connections.length} links</dd></div><div><dt>Band</dt><dd>${project.selectedBand} Hz · one-third octave</dd></div><div><dt>Closure</dt><dd>${fmt(100 * solution.maxBalanceError, 5)}% max error</dd></div></dl></aside></section>
    <section class="capstone-workbench" id="launch-sea-capstone" data-capstone-version="1">
      <nav class="capstone-workflow" aria-label="SEA modeling workflow"><p class="capstone-kicker">Model workflow</p>${workflowHtml(project.activeStep)}</nav>
      <div class="capstone-main">
        <div class="capstone-commandbar"><label><span>Mission event</span><select data-capstone-field="study.scenario"><option value="liftoff"${project.study.scenario === 'liftoff' ? ' selected' : ''}>Liftoff acoustics</option><option value="ascent"${project.study.scenario === 'ascent' ? ' selected' : ''}>Ascent TBL</option><option value="equipment"${project.study.scenario === 'equipment' ? ' selected' : ''}>Equipment forcing</option></select></label><label><span>Active band</span><select data-capstone-field="selectedBand">${LAUNCH_SEA_BANDS.map(band => `<option value="${band}"${band === project.selectedBand ? ' selected' : ''}>${band} Hz</option>`).join('')}</select></label><div class="capstone-command-actions"><button type="button" class="button-quiet" data-capstone-action="import">Import project</button><input type="file" accept="application/json,.json" data-capstone-import hidden/><button type="button" class="button-quiet" data-capstone-action="export">Export project</button><button type="button" class="button-quiet" data-capstone-action="reset">Reset template</button></div></div>
        <header class="capstone-stage-header"><div><p class="eyebrow">${step.number} · Current task</p><h2>${esc(step.title)}</h2><p>${esc(step.instruction)}</p></div><div class="capstone-stage-metrics"><span><strong>${solution.statusCounts.supported}</strong> supported</span><span><strong>${solution.statusCounts.transition}</strong> transition</span><span><strong>${solution.statusCounts.hybrid}</strong> hybrid</span></div></header>
        <div class="capstone-visuals"><section class="capstone-visual-panel"><header><div><p class="eyebrow">Hardware atlas</p><h3>Geometry and subsystem boundaries</h3></div><span>select hardware</span></header>${geometrySvg(project, solution)}<p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${esc(panelTakeaway('geometry', project, solution))}</p></section><section class="capstone-visual-panel"><header><div><p class="eyebrow">Energy network · ${project.selectedBand} Hz</p><h3>Stored energy and net power flow</h3></div><span>arrow width = net W</span></header>${networkSvg(project, solution)}<p class="capstone-panel-takeaway"><strong>Engineering takeaway</strong>${esc(panelTakeaway('network', project, solution))}</p></section></div>
      </div>
      <aside class="capstone-inspector" aria-label="Selected SEA model item">${inspectorHtml(project, solution)}</aside>
      <section class="capstone-analytics"><header><div><p class="eyebrow">${step.number} · Banded evidence</p><h2>${esc(step.title)} results</h2></div><p>Every table and plot is derived from the same saved project state.</p></header>${analyticsHtml(project, solution)}<aside class="capstone-engineering-note"><div><strong>Engineering takeaway</strong><p>${esc(takeaways(project, solution))}</p></div><div><strong>Active checks</strong><ul>${warningHtml(solution)}</ul></div></aside></section>
    </section>
  </div>`;
}

function setPath(project, path, value) {
  const numeric = value !== '' && Number.isFinite(Number(value)) ? Number(value) : value;
  if (path === 'selectedBand') project.selectedBand = nearestBand(numeric);
  else if (path === 'selectedSubsystemId') project.selectedSubsystemId = String(value);
  else if (path === 'selectedConnectionId') project.selectedConnectionId = String(value);
  else if (path.startsWith('study.')) project.study[path.slice(6)] = numeric;
  else if (path.startsWith('response.')) project.response[path.slice(9)] = numeric;
  else if (path.startsWith('sub.')) {
    const subsystem = project.subsystems.find(item => item.id === project.selectedSubsystemId);
    const key = path.slice(4);
    if (!subsystem) return;
    if (key.startsWith('geometry.')) subsystem.geometry[key.slice(9)] = numeric;
    else subsystem[key] = numeric;
    if (key === 'name') subsystem.shortName = String(value).split(/\s+/).slice(0, 2).join(' ');
    if (key === 'kind' && value === 'acoustic') subsystem.waveFamily = 'acoustic-3d';
  } else if (path.startsWith('conn.')) {
    const connection = project.connections.find(item => item.id === project.selectedConnectionId);
    if (connection) {
      const key = path.slice(5);
      if ((key === 'from' && value === connection.to) || (key === 'to' && value === connection.from)) return;
      connection[key] = numeric;
    }
  }
}

function downloadProject(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'launch-vehicle-sea-project.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

export function bindLaunchSeaCapstone(root = document, initialProject = null) {
  let project;
  try { project = normalizedProject(initialProject ?? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') ?? defaultLaunchSeaProject()); }
  catch { project = defaultLaunchSeaProject(); }
  const host = root.querySelector ? root : document;
  const render = () => {
    const shell = host.querySelector('#launch-sea-capstone')?.closest('.site-page-shell-capstone');
    if (!shell) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderLaunchSeaCapstone(project);
    const replacement = wrapper.firstElementChild;
    shell.replaceWith(replacement);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch {}
  };
  const change = event => {
    const input = event.target.closest('[data-capstone-field]');
    if (!input) return;
    setPath(project, input.dataset.capstoneField, input.value);
    render();
  };
  const click = event => {
    const step = event.target.closest('[data-capstone-step]');
    if (step) { project.activeStep = step.dataset.capstoneStep; render(); return; }
    const subsystem = event.target.closest('[data-capstone-subsystem]');
    if (subsystem) { project.selectedSubsystemId = subsystem.dataset.capstoneSubsystem; render(); return; }
    const connection = event.target.closest('[data-capstone-connection]');
    if (connection) { project.selectedConnectionId = connection.dataset.capstoneConnection; project.activeStep = 'coupling'; render(); return; }
    const band = event.target.closest('[data-capstone-band]');
    if (band) { project.selectedBand = nearestBand(band.dataset.capstoneBand); render(); return; }
    const action = event.target.closest('[data-capstone-action]')?.dataset.capstoneAction;
    if (action === 'export') downloadProject(project);
    else if (action === 'import') host.querySelector('[data-capstone-import]')?.click();
    else if (action === 'reset' && confirm('Reset the capstone to the generic upper-stack template?')) { project = defaultLaunchSeaProject(); render(); }
    else if (action === 'add-subsystem') {
      const number = project.subsystems.length + 1, id = `custom-${number}`;
      const customIndex = Math.max(0, project.subsystems.length - 9);
      project.subsystems.push({ id, name: `Custom structural subsystem ${number}`, shortName: `Custom ${number}`, kind: 'structural', waveFamily: 'plate-bending', lossFactor: 0.02, lossSource: 'assumed screening value', geometry: { length: 1.5, width: 1.2, height: 0.2, radius: 0.6, thickness: 0.004, mass: 120 }, layout: { x: 100 + (customIndex % 5) * 180, y: 560 + Math.floor(customIndex / 5) * 100 } });
      project.connections.push({ id: `link-${Date.now()}`, from: project.selectedSubsystemId, to: id, mechanism: 'point bridge', forward: 0.004, exponent: 0 });
      project.selectedSubsystemId = id;
      render();
    } else if (action === 'add-connection') {
      const target = project.subsystems.find(item => item.id !== project.selectedSubsystemId && !project.connections.some(link => link.from === project.selectedSubsystemId && link.to === item.id));
      if (!target) return;
      const item = { id: `link-${Date.now()}`, from: project.selectedSubsystemId, to: target.id, mechanism: 'point bridge', forward: 0.004, exponent: 0 };
      project.connections.push(item); project.selectedConnectionId = item.id; render();
    }
  };
  const importChange = async event => {
    if (!event.target.matches('[data-capstone-import]')) return;
    const file = event.target.files?.[0]; if (!file) return;
    try { project = normalizedProject(JSON.parse(await file.text())); render(); }
    catch { alert('The selected file is not a valid launch-vehicle SEA project.'); }
  };
  const keydown = event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const target = event.target.closest('[data-capstone-step], [data-capstone-subsystem], [data-capstone-connection], [data-capstone-band]');
    if (!target) return;
    event.preventDefault();
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };
  document.addEventListener('change', change);
  document.addEventListener('click', click);
  document.addEventListener('change', importChange);
  document.addEventListener('keydown', keydown);
  render();
  return () => {
    document.removeEventListener('change', change);
    document.removeEventListener('click', click);
    document.removeEventListener('change', importChange);
    document.removeEventListener('keydown', keydown);
  };
}
