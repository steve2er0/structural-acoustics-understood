/* Calculators for the SEA parameter handbook expansion. */
import { createEngineeringRegistry } from './engineering-results.js';
import { materials } from './calculators.js';
import {
  SEA_PARAMETER_PRESETS,
  clfMechanismState,
  drivingPointImpedanceState,
  equipmentLoadingState,
  equivalentPowerInjectionState,
  infiniteMobilityAtlasState,
  installedFairingSeaState,
  modalDensityAtlasState,
  radiationEfficiencyAtlasState,
  seaParameterWorkbenchState,
  seaResponseRecoveryState,
  tblConvectionState
} from './sea-parameters-physics.js';

const stat = (label, value, unit = '', tone = '', note = '') => ({ label, value, unit, tone, note });
const trace = (name, x, y, extra = {}) => ({ name, x, y, ...extra });
const mm = value => Number(value) / 1000;
const gpa = value => Number(value) * 1e9;
const mpa = value => Number(value) * 1e6;
const launchConsiderations = primary => [
  primary,
  'Preserve the frequency-band definition, subsystem boundary, units, direction, and parameter provenance when transferring this result into an SEA model.',
  'Replace screening or handbook values with installed-configuration test data when the design decision is sensitive to the selected parameter.'
];

const materialInputs = [
  { key: 'length', label: 'Length', unit: 'm', type: 'number', default: 2.4, min: 0.05 },
  { key: 'width', label: 'Width', unit: 'm', type: 'number', default: 1.4, min: 0.05 },
  { key: 'thickness', label: 'Thickness', unit: 'mm', type: 'number', default: 3, min: 0.02 },
  { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: 70, min: 0.01 },
  { key: 'density', label: 'Material density', unit: 'kg/m³', type: 'number', default: 2700, min: 1 },
  { key: 'poisson', label: 'Poisson ratio', type: 'number', default: 0.33, min: -0.49, max: 0.49 }
];

const materialValues = values => ({ length: values.length, width: values.width, thickness: mm(values.thickness), modulus: gpa(values.modulus), density: values.density, poisson: values.poisson });
const materialOptions = Object.entries(materials).map(([value, material]) => ({ value, label: material.label }));
const modalDensityMaterialInputs = materialInputs.map(input => ({ ...input, default: input.key === 'modulus' ? materials.aluminum.E / 1e9 : input.key === 'density' ? materials.aluminum.rho : input.key === 'poisson' ? materials.aluminum.nu : input.default }));
const syncModalDensityMaterial = values => {
  const material = materials[values.material] || materials.aluminum;
  return { ...values, modulus: material.E / 1e9, density: material.rho, poisson: material.nu };
};
const syncInfiniteMobilityMaterial = values => {
  const material = materials[values.material] || materials.aluminum;
  return { ...values, modulus: material.E / 1e9, density: material.rho, poisson: material.nu };
};
const infiniteMobilityFocus = values => {
  const geometry = String(values.geometry ?? 'cylindrical-shell');
  if (geometry === 'beam') return String(values.beam_geometry ?? 'beam-flexural');
  if (geometry === 'flat-panel') return 'thin-plate';
  if (geometry === 'sandwich-panel') return 'sandwich-panel';
  return 'cylindrical-shell';
};
const infiniteMobilityGeometryLabel = values => {
  const geometry = String(values.geometry ?? 'cylindrical-shell');
  if (geometry === 'beam') {
    const labels = {
      'rod-axial': 'Axial rod',
      'beam-flexural': 'Infinite flexural beam, center drive',
      'beam-free-end': 'Semi-infinite flexural beam, free-end drive'
    };
    return labels[String(values.beam_geometry)] ?? labels['beam-flexural'];
  }
  if (geometry === 'flat-panel') return 'Infinite thin isotropic flat panel';
  if (geometry === 'sandwich-panel') return 'Symmetric sandwich panel, flexural-to-shear screen';
  if (geometry === 'curved-panel') return 'Open curved cylindrical panel / shell segment';
  return 'Unstiffened thin circular cylindrical shell';
};
const svgEsc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const schematicNumber = (value, digits = 3) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const magnitude = Math.abs(number);
  if (magnitude >= 1e4 || (magnitude > 0 && magnitude < 1e-3)) return number.toExponential(2);
  return String(Number(number.toFixed(digits)));
};
const schematicLength = (meters, system, compact = false) => {
  const value = Number(meters);
  if (system === 'English') return compact ? `${schematicNumber(value * 39.37007874)} in` : `${schematicNumber(value * 3.280839895)} ft`;
  return compact ? `${schematicNumber(value * 1000)} mm` : `${schematicNumber(value)} m`;
};
const schematicArea = (squareMeters, system) => system === 'English'
  ? `${schematicNumber(squareMeters * 10.76391042)} ft²`
  : `${schematicNumber(squareMeters)} m²`;
const mobilitySchematicDefs = `
  <defs>
    <linearGradient id="ims-shell" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#102d49"/><stop offset=".5" stop-color="#1b6382"/><stop offset="1" stop-color="#0c263f"/></linearGradient>
    <linearGradient id="ims-metal" x1="0" x2="1"><stop stop-color="#58bfff"/><stop offset=".48" stop-color="#173b60"/><stop offset="1" stop-color="#76d9ff"/></linearGradient>
    <linearGradient id="ims-core" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#2c7b76"/><stop offset="1" stop-color="#103e4a"/></linearGradient>
    <marker id="ims-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#ffcf66"/></marker>
    <marker id="ims-dim" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#9eb7d3" stroke-width="1.7"/></marker>
    <filter id="ims-glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;

function infiniteMobilitySchematic(values, state) {
  const geometry = String(values.geometry ?? 'cylindrical-shell');
  const material = materials[values.material] || materials.aluminum;
  const title = infiniteMobilityGeometryLabel(values);
  const shell = state.shell;
  const makeSvg = system => {
    const head = `<rect width="1000" height="520" fill="#061a2c"/><path d="M0 74 H1000" stroke="#21435f"/><text x="42" y="39" fill="#edf7ff" font-family="ui-sans-serif,system-ui" font-size="22" font-weight="700">${svgEsc(title)}</text><text x="42" y="61" fill="#8ba9c5" font-family="ui-monospace,monospace" font-size="12">${svgEsc(material.label)} · characteristic-mobility geometry</text>`;
    const card = (x, y, accent, eyebrow, line1, line2 = '') => `<g><rect x="${x}" y="${y}" width="286" height="67" rx="7" fill="#0a2238" stroke="${accent}" stroke-opacity=".62"/><rect x="${x}" y="${y}" width="5" height="67" rx="2" fill="${accent}"/><text x="${x + 18}" y="${y + 21}" fill="${accent}" font-family="ui-monospace,monospace" font-size="10" font-weight="700">${svgEsc(eyebrow)}</text><text x="${x + 18}" y="${y + 42}" fill="#edf7ff" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="650">${svgEsc(line1)}</text>${line2 ? `<text x="${x + 18}" y="${y + 58}" fill="#a5bad1" font-family="ui-monospace,monospace" font-size="11">${svgEsc(line2)}</text>` : ''}</g>`;
    const footer = `<text x="42" y="492" fill="#8ba9c5" font-family="ui-sans-serif,system-ui" font-size="12">Geometry is schematic and dimensions follow the active inputs. The mobility plot above shows which constituent relation is active by frequency.</text>`;
    if (geometry === 'curved-panel') {
      const selectedColor = shell.regime.startsWith('strip-like') ? '#55b8ff' : shell.regime === 'curved-shell' ? '#ffcf66' : '#65d9a0';
      return `<svg viewBox="0 0 1000 520" role="img" aria-label="Open curved cylindrical panel geometry">${mobilitySchematicDefs}${head}<g>
        <path d="M150 370 C170 210 300 125 450 170 C535 196 580 268 590 338" fill="none" stroke="#214c68" stroke-width="34"/>
        <path d="M150 354 C170 194 300 109 450 154 C535 180 580 252 590 322" fill="none" stroke="#8bdcff" stroke-width="6"/>
        <path d="M180 354 C200 226 304 158 440 198 C498 216 534 263 545 320" fill="none" stroke="url(#ims-shell)" stroke-width="18"/>
        <line x1="385" y1="354" x2="385" y2="165" stroke="#9eb7d3" stroke-width="1.5" marker-start="url(#ims-dim)" marker-end="url(#ims-dim)"/><text x="398" y="263" fill="#d4e5f5" font-family="ui-monospace,monospace" font-size="13">R = ${svgEsc(schematicLength(shell.radius, system))}</text>
        <path d="M385 104 V214" stroke="#ffcf66" stroke-width="4" marker-end="url(#ims-arrow)"/><text x="398" y="122" fill="#ffdf91" font-family="ui-monospace,monospace" font-size="13">F</text>
        <path d="M145 410 H590" stroke="#9eb7d3" stroke-width="1.5" marker-start="url(#ims-dim)" marker-end="url(#ims-dim)"/><text x="368" y="435" text-anchor="middle" fill="#d4e5f5" font-family="ui-monospace,monospace" font-size="13">arc = ${svgEsc(schematicLength(shell.arcLength, system))} · θ = ${schematicNumber(shell.arcAngleDeg, 0)}°</text>
        <text x="694" y="175" fill="#edf7ff" font-family="ui-sans-serif,system-ui" font-size="18" font-weight="700">Open curved panel</text>
        <text x="694" y="209" fill="#a5bad1" font-family="ui-monospace,monospace" font-size="13">L = ${svgEsc(schematicLength(shell.axialLength, system))}</text>
        <text x="694" y="235" fill="#a5bad1" font-family="ui-monospace,monospace" font-size="13">t = ${svgEsc(schematicLength(shell.thickness, system, true))}</text>
        <circle cx="700" cy="284" r="8" fill="${selectedColor}"/><text x="720" y="289" fill="#edf7ff" font-family="ui-sans-serif,system-ui" font-size="14">Active: ${svgEsc(shell.regime)}</text>
      </g>${footer}</svg>`;
    }
    if (geometry === 'cylindrical-shell') {
      const selectedColor = shell.regime.startsWith('beam-like') ? '#55b8ff' : shell.regime === 'curved-shell' ? '#ffcf66' : '#65d9a0';
      return `<svg viewBox="0 0 1000 520" role="img" aria-label="Closed cylindrical shell geometry">${mobilitySchematicDefs}${head}<g>
        <ellipse cx="224" cy="268" rx="102" ry="132" fill="#0b2a43" stroke="#8bdcff" stroke-width="3"/>
        <path d="M224 136 H560 V400 H224z" fill="url(#ims-shell)" stroke="#8bdcff" stroke-width="3"/>
        <ellipse cx="560" cy="268" rx="102" ry="132" fill="url(#ims-shell)" stroke="#8bdcff" stroke-width="3"/>
        <ellipse cx="224" cy="268" rx="86" ry="112" fill="none" stroke="#9eb7d3" stroke-dasharray="7 7"/>
        <line x1="224" y1="268" x2="224" y2="136" stroke="#9eb7d3" stroke-width="1.5" marker-start="url(#ims-dim)" marker-end="url(#ims-dim)"/><text x="238" y="203" fill="#d4e5f5" font-family="ui-monospace,monospace" font-size="13">R = ${svgEsc(schematicLength(shell.radius, system))}</text>
        <path d="M394 96 V180" stroke="#ffcf66" stroke-width="4" marker-end="url(#ims-arrow)"/><text x="408" y="115" fill="#ffdf91" font-family="ui-monospace,monospace" font-size="13">F</text>
        <line x1="101" y1="132" x2="130" y2="150" stroke="#9eb7d3" stroke-width="1.5" marker-start="url(#ims-dim)" marker-end="url(#ims-dim)"/><text x="72" y="116" fill="#d4e5f5" font-family="ui-monospace,monospace" font-size="13">t = ${svgEsc(schematicLength(shell.thickness, system, true))}</text>
        <text x="704" y="175" fill="#edf7ff" font-family="ui-sans-serif,system-ui" font-size="18" font-weight="700">Closed cylindrical shell</text>
        <text x="704" y="210" fill="#a5bad1" font-family="ui-monospace,monospace" font-size="13">circumference = ${svgEsc(schematicLength(shell.circumference, system))}</text>
        <text x="704" y="236" fill="#a5bad1" font-family="ui-monospace,monospace" font-size="13">h/R = ${schematicNumber(shell.thicknessToRadius, 4)}</text>
        <circle cx="710" cy="284" r="8" fill="${selectedColor}"/><text x="730" y="289" fill="#edf7ff" font-family="ui-sans-serif,system-ui" font-size="14">Active: ${svgEsc(shell.regime)}</text>
      </g>${footer}</svg>`;
    }
    if (geometry === 'beam') {
      const beam = String(values.beam_geometry ?? 'beam-flexural');
      const axial = beam === 'rod-axial';
      const freeEnd = beam === 'beam-free-end';
      const xForce = freeEnd ? 154 : 386;
      const forcePath = axial ? `<path d="M80 250 H${xForce + 30}" stroke="#ffcf66" stroke-width="4" marker-end="url(#ims-arrow)"/><text x="82" y="232" fill="#ffdf91" font-family="ui-monospace,monospace" font-size="13">AXIAL F</text>` : `<path d="M${xForce} 128 V203" stroke="#ffcf66" stroke-width="4" marker-end="url(#ims-arrow)"/><text x="${xForce + 12}" y="143" fill="#ffdf91" font-family="ui-monospace,monospace" font-size="13">TRANSVERSE F</text>`;
      const driveLabel = axial ? 'Longitudinal wave' : freeEnd ? 'Free-end flexural drive' : 'Center flexural drive';
      return `<svg viewBox="0 0 1000 520" role="img" aria-label="Beam or rod geometry with selected characteristic-mobility drive condition">${mobilitySchematicDefs}${head}<g><path d="M150 210 H575 V300 H150z" fill="url(#ims-metal)" stroke="#8bdcff" stroke-width="2"/><path d="M150 210 L205 170 H630 L575 210z" fill="#2f7397" stroke="#8bdcff" stroke-width="2"/><path d="M575 210 L630 170 V260 L575 300z" fill="#103450" stroke="#8bdcff" stroke-width="2"/><line x1="150" y1="255" x2="575" y2="255" stroke="#d8f1ff" stroke-dasharray="6 5"/><rect x="690" y="196" width="150" height="120" fill="#10334d" stroke="#8bdcff" stroke-width="2"/><line x1="690" y1="256" x2="840" y2="256" stroke="#8ba9c5" stroke-dasharray="5 4"/><line x1="765" y1="196" x2="765" y2="316" stroke="#8ba9c5" stroke-dasharray="5 4"/><line x1="690" y1="340" x2="840" y2="340" stroke="#9eb7d3" marker-start="url(#ims-dim)" marker-end="url(#ims-dim)"/><text x="765" y="361" text-anchor="middle" fill="#d4e5f5" font-family="ui-monospace,monospace" font-size="12">b = ${svgEsc(schematicLength(state.member.width, system, true))}</text><line x1="864" y1="196" x2="864" y2="316" stroke="#9eb7d3" marker-start="url(#ims-dim)" marker-end="url(#ims-dim)"/><text x="885" y="258" fill="#d4e5f5" font-family="ui-monospace,monospace" font-size="12">h = ${svgEsc(schematicLength(state.member.height, system, true))}</text>${forcePath}<text x="150" y="390" fill="#55b8ff" font-family="ui-monospace,monospace" font-size="13">${svgEsc(driveLabel)}</text><text x="150" y="414" fill="#a5bad1" font-family="ui-monospace,monospace" font-size="12">A = ${svgEsc(schematicArea(state.member.area, system))} · I = ${schematicNumber(state.member.inertia, 4)} m⁴</text></g>${card(650, 100, axial ? '#ffcf66' : '#55b8ff', 'SELECTED WAVE FAMILY', axial ? 'Axial characteristic mobility' : 'Flexural characteristic mobility', axial ? 'Y = 1/(ρAcL)' : freeEnd ? 'Y = 2/(ρAcB)' : 'Y = 1/(2ρAcB)')}${footer}</svg>`;
    }
    if (geometry === 'flat-panel') {
      return `<svg viewBox="0 0 1000 520" role="img" aria-label="Infinite thin plate geometry with point drive and outward flexural waves">${mobilitySchematicDefs}${head}<g><path d="M155 168 H628 L730 228 H258z" fill="#2e7195" stroke="#8bdcff" stroke-width="2"/><path d="M258 228 H730 V355 H258z" fill="url(#ims-metal)" stroke="#8bdcff" stroke-width="2"/><path d="M258 355 L730 355 L628 414 H155z" fill="#10334d" stroke="#8bdcff" stroke-width="2"/><circle cx="494" cy="288" r="16" fill="#ffcf66" filter="url(#ims-glow)"/><path d="M494 111 V266" stroke="#ffcf66" stroke-width="4" marker-end="url(#ims-arrow)"/><text x="507" y="128" fill="#ffdf91" font-family="ui-monospace,monospace" font-size="13">POINT FORCE F</text><ellipse cx="494" cy="288" rx="70" ry="34" fill="none" stroke="#65d9a0" stroke-width="2"/><ellipse cx="494" cy="288" rx="125" ry="61" fill="none" stroke="#65d9a0" stroke-width="2" stroke-dasharray="7 5"/><ellipse cx="494" cy="288" rx="180" ry="88" fill="none" stroke="#65d9a0" stroke-width="2" stroke-dasharray="7 5"/><line x1="760" y1="228" x2="760" y2="355" stroke="#9eb7d3" marker-start="url(#ims-dim)" marker-end="url(#ims-dim)"/><text x="778" y="294" fill="#d4e5f5" font-family="ui-monospace,monospace" font-size="12">t = ${svgEsc(schematicLength(state.properties.thickness, system, true))}</text><text x="262" y="456" fill="#a5bad1" font-family="ui-monospace,monospace" font-size="12">Two-dimensional bending waves spread radially from the local point drive.</text></g>${card(650, 100, '#65d9a0', 'INFINITE THIN PLATE', 'Local material + thickness set the mean level', `Y = 1/(8√(Dρt)) · D = ${schematicNumber(state.properties.bendingStiffness, 2)} N·m`)}${footer}</svg>`;
    }
    const sandwich = state.sandwich;
    return `<svg viewBox="0 0 1000 520" role="img" aria-label="Symmetric sandwich panel geometry showing face sheets and shear core">${mobilitySchematicDefs}${head}<g><path d="M140 174 H700 L762 208 H202z" fill="#56bfff" fill-opacity=".8" stroke="#a8e4ff" stroke-width="2"/><path d="M202 208 H762 V237 H202z" fill="#1f6190" stroke="#a8e4ff" stroke-width="2"/><path d="M202 237 H762 V346 H202z" fill="url(#ims-core)" stroke="#65d9a0" stroke-width="2"/><path d="M202 346 H762 V375 H202z" fill="#1f6190" stroke="#a8e4ff" stroke-width="2"/><path d="M202 375 H762 L700 409 H140z" fill="#56bfff" fill-opacity=".8" stroke="#a8e4ff" stroke-width="2"/><path d="M470 105 V194" stroke="#ffcf66" stroke-width="4" marker-end="url(#ims-arrow)"/><text x="482" y="122" fill="#ffdf91" font-family="ui-monospace,monospace" font-size="13">POINT FORCE F</text><path d="M306 275 C338 245 370 305 402 275 S466 245 498 275" fill="none" stroke="#ffcf66" stroke-width="3" marker-end="url(#ims-arrow)"/><text x="278" y="246" fill="#ffdf91" font-family="ui-monospace,monospace" font-size="11">LOW f · FACE-SHEET FLEXURE</text><path d="M597 266 V326 M624 266 V326 M651 266 V326" stroke="#65d9a0" stroke-width="4" marker-end="url(#ims-arrow)"/><text x="572" y="246" fill="#b8f3d2" font-family="ui-monospace,monospace" font-size="11">HIGH f · CORE SHEAR</text><line x1="798" y1="208" x2="798" y2="237" stroke="#9eb7d3" marker-start="url(#ims-dim)" marker-end="url(#ims-dim)"/><text x="816" y="225" fill="#d4e5f5" font-family="ui-monospace,monospace" font-size="11">tf ${svgEsc(schematicLength(sandwich.faceThickness, system, true))}</text><line x1="852" y1="237" x2="852" y2="346" stroke="#9eb7d3" marker-start="url(#ims-dim)" marker-end="url(#ims-dim)"/><text x="870" y="294" fill="#d4e5f5" font-family="ui-monospace,monospace" font-size="11">tc ${svgEsc(schematicLength(sandwich.coreThickness, system, true))}</text></g>${card(650, 100, '#65d9a0', 'SYMMETRIC SANDWICH', 'Face-sheet flexure transitions toward core shear', `f shear scale = ${schematicNumber(sandwich.transitionFrequency, 0)} Hz`)}${footer}</svg>`;
  };
  return { title, svg: makeSvg('SI'), svgByUnit: { English: makeSvg('English') } };
}
const modalDensityTypeOptions = [
  { value: 'acoustic-1d', label: 'Acoustic 1D pipe' }, { value: 'acoustic-2d', label: 'Acoustic 2D cavity' }, { value: 'acoustic-3d', label: 'Acoustic 3D cavity' },
  { value: 'beam-bending', label: 'Beam transverse bending' }, { value: 'beam-torsion', label: 'Beam torsion' }, { value: 'beam-longitudinal', label: 'Beam longitudinal · supplementary' }, { value: 'grid-bending', label: 'Grid structure bending' },
  { value: 'plate-bending', label: 'Rectangular flat panel' }, { value: 'circular-plate', label: 'Circular flat panel' }, { value: 'irregular-plate', label: 'Irregular flat panel' }, { value: 'stiffened-panel', label: 'Stiffened panel' }, { value: 'honeycomb', label: 'Flat honeycomb panel' }, { value: 'plate-inplane', label: 'Plate in-plane · supplementary' },
  { value: 'cylinder', label: 'Unstiffened cylinder' }, { value: 'stiffened-cylinder', label: 'Stiffened cylinder' }, { value: 'hoop-frame', label: 'Hoop / frame' }
];
const modalDensityLabels = Object.fromEntries(modalDensityTypeOptions.map(option => [option.value, option.label]));
const modalDensityComparisonGroups = {
  acoustic: ['acoustic-1d', 'acoustic-2d', 'acoustic-3d'],
  beam: ['beam-bending', 'beam-torsion', 'beam-longitudinal', 'grid-bending'],
  panel: ['plate-bending', 'circular-plate', 'irregular-plate', 'stiffened-panel', 'honeycomb', 'plate-inplane'],
  shell: ['cylinder', 'stiffened-cylinder', 'hoop-frame']
};
const modalDensityGroup = type => type.startsWith('acoustic-') ? 'acoustic' : type.startsWith('beam-') || type === 'grid-bending' ? 'beam' : type.includes('cylinder') || type === 'hoop-frame' ? 'shell' : 'panel';
const modalDensityGroupLabel = group => group === 'acoustic' ? 'Acoustic' : group === 'beam' ? 'Beam and grid' : group === 'shell' ? 'Cylinder and frame' : 'Panel';

const definitions = {
  'sea-parameter-workbench': {
    category: 'SEA & Energy',
    basis: 'Traceable geometry-to-SEA-parameter-to-response synthesis',
    confidence: 'Integrated band-screening workflow with explicit input provenance',
    inputs: [
      { key: 'preset', label: 'Launch subsystem preset', type: 'select', default: 'honeycombFairing', options: Object.entries(SEA_PARAMETER_PRESETS).map(([value, item]) => ({ value, label: item.label })) },
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'source', label: 'External excitation', type: 'select', default: 'diffuse', options: [{ value: 'diffuse', label: 'Diffuse acoustic field' }, { value: 'tbl-slow', label: 'TBL: Uc > bending speed' }, { value: 'tbl-fast', label: 'TBL: Uc < bending speed' }, { value: 'corcos', label: 'Corcos TBL' }, { value: 'point-force', label: 'Point force' }] },
      { key: 'loss_source', label: 'Dissipation-loss source', type: 'select', default: 'empirical', options: [{ value: 'empirical', label: 'Empirical construction family' }, { value: 'measured', label: 'Measured installed value' }, { value: 'assumed', label: 'Assumed screening value' }] },
      { key: 'measured_loss', label: 'Measured / assumed loss factor', type: 'number', default: 0.022, min: 0.00001 },
      { key: 'pressure', label: 'Band pressure RMS', unit: 'Pa', type: 'number', default: 200, min: 0.0001 },
      { key: 'force', label: 'Point force RMS', unit: 'N', type: 'number', default: 10, min: 0.0001 },
      { key: 'conductance', label: 'Drive-point conductance', unit: 'm/(N·s)', type: 'number', default: 0.0001, min: 1e-12 },
      { key: 'external_power', label: 'Acoustic-cavity input power', unit: 'W', type: 'number', default: 1, min: 1e-12 },
      { key: 'freestream', label: 'Free-stream velocity', unit: 'm/s', type: 'number', default: 300, min: 1 },
      { key: 'displacement_thickness', label: 'Boundary-layer displacement thickness', unit: 'mm', type: 'number', default: 12, min: 0.01 }
    ],
    theory: '<p>An SEA solve is only as defensible as its parameter chain. This workbench derives modal density, damping, radiation, coupling, equivalent power, subsystem energy, and recovered response while retaining the source of each quantity.</p>',
    assumptions: ['Steady one-third-octave band energy and linear passive response.', 'Preset geometry represents one energetically homogeneous subsystem.', 'Handbook and empirical inputs are screening values until replaced by installed evidence.'],
    example: 'Compare the honeycomb fairing and cylindrical shell presets under the same 1 kHz pressure field, then change loss-factor provenance from empirical to measured.',
    compute(values) {
      const state = seaParameterWorkbenchState({ preset: values.preset, frequency: values.frequency, source: values.source, lossSource: values.loss_source, measuredLossFactor: values.measured_loss, assumedLossFactor: values.measured_loss, pressureRms: values.pressure, forceRms: values.force, conductance: values.conductance, externalPower: values.external_power, freeStreamVelocity: values.freestream, displacementThickness: mm(values.displacement_thickness) });
      const responseLabel = state.acoustic ? 'Recovered pressure' : 'Recovered velocity';
      const responseValue = state.acoustic ? state.recovery.pressureRms : state.recovery.velocityRms;
      const responseUnit = state.acoustic ? 'Pa RMS' : 'm/s RMS';
      const warnings = [];
      if (state.modal.modesInBand < 5) warnings.push(`Only ${state.modal.modesInBand.toFixed(2)} modes occupy the selected band; the parameter chain is transitional or deterministic.`);
      if (state.modal.modalOverlap < 1) warnings.push(`Modal overlap is ${state.modal.modalOverlap.toFixed(2)}; do not use M>1 as the sole validity gate, but explicitly justify averaging and subsystem diffuse behavior.`);
      if (state.lossSource !== 'measured') warnings.push('The selected dissipation loss is not an installed measurement; sweep it and retain the resulting response range.');
      return {
        values: [stat('Modal density', state.modal.modalDensity, 'modes/Hz'), stat('Modes in band', state.modal.modesInBand), stat('Modal overlap', state.modal.modalOverlap), stat('Selected loss factor', state.selectedLossFactor), stat('Radiation efficiency', state.radiation?.totalEfficiency ?? 'Not applicable'), stat('Outgoing radiation CLF', state.coupling?.forward ?? 'Not applicable'), stat('Equivalent input power', state.externalPower, 'W'), stat('Subsystem energy', state.energy, 'J'), stat(responseLabel, responseValue, responseUnit), stat('Parameter confidence score', state.confidenceScore, '/100', state.confidenceScore < 55 ? 'warn' : 'good')],
        interpretation: `${state.preset.label} stores ${state.energy.toExponential(3)} J in the selected band and produces ${responseValue.toExponential(3)} ${responseUnit}. The controlling credibility issue is ${state.modal.readiness}; the loss factor is ${state.lossSource}.`,
        engineeringConsiderations: launchConsiderations('Use this chain as the audit record for a fairing, shell bay, deck, equipment panel, or cavity: a response change must be traceable to geometry, excitation, damping, radiation, or coupling rather than an unexplained tuning factor.'),
        warnings,
        plots: [{ title: 'Modal density around the selected band', xLabel: 'Frequency (Hz)', yLabel: 'Modal density (modes/Hz)', xScale: 'log', yScale: 'log', traces: [trace(state.modal.basis, state.modal.frequencies, state.modal.curve, { emphasis: true })] }],
        tables: [{ title: 'SEA parameter provenance', columns: ['Parameter block', 'Source class', 'Selected basis'], rows: state.provenance }]
      };
    }
  },

  'modal-density': {
    category: 'SEA & Energy',
    basis: 'ESA PSS-03-204 Appendix A modal-density formulations and integrated modal population',
    confidence: 'Source-traceable analytical relations with explicit specializations',
    relatedLinks: [
      { title: 'Modal Overlap & SEA Check', description: 'Use the calculated density with damping to interpret isolated, transitional, and overlapping response.', href: '#/tool/modal-overlap' },
      { title: 'SEA Validity & Confidence', description: 'Place modal population and overlap inside a broader SEA applicability screen.', href: '#/tool/sea-validity-confidence' },
      { title: 'Vibroacoustic Method Planner', description: 'Choose deterministic, hybrid, or statistical treatment by frequency.', href: '#/tool/hybrid-method-selection' }
    ],
    inputs: [
      { key: 'type', label: 'Subsystem / wave family', type: 'select', default: 'plate-bending', options: modalDensityTypeOptions },
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'band_fraction', label: 'Analysis band', type: 'select', default: '3', options: [{ value: '1', label: 'Octave' }, { value: '3', label: 'Third octave' }, { value: '6', label: 'Sixth octave' }] },
      { key: 'loss_factor', label: 'Loss factor', type: 'number', default: 0.02, min: 0.000001 },
      { key: 'height', label: 'Cavity height / depth', unit: 'm', type: 'number', default: 1.5, min: 0.001 },
      { key: 'radius', label: 'Cylinder radius', unit: 'm', type: 'number', default: 1.8, min: 0.01 },
      { key: 'sound_speed', label: 'Acoustic sound speed', unit: 'm/s', type: 'number', default: 343, min: 1 },
      { key: 'material', label: 'Material preset', type: 'select', default: 'aluminum', options: materialOptions, help: 'Preset values populate the editable elastic properties below.' },
      ...modalDensityMaterialInputs,
      { key: 'member_width', label: 'Beam / stiffener section width', unit: 'mm', type: 'number', default: 25, min: 0.01 },
      { key: 'member_height', label: 'Beam / stiffener section height', unit: 'mm', type: 'number', default: 25, min: 0.01 },
      { key: 'total_member_length', label: 'Total stringer / grid-member length', unit: 'm', type: 'number', default: 12, min: 0 },
      { key: 'frame_count', label: 'Number of identical hoop frames', type: 'number', default: 4, min: 0 },
      { key: 'face_thickness', label: 'Honeycomb face thickness', unit: 'mm', type: 'number', default: 0.6, min: 0.01 },
      { key: 'core_thickness', label: 'Honeycomb core thickness', unit: 'mm', type: 'number', default: 24.8, min: 0.1 },
      { key: 'core_shear', label: 'Core shear modulus', unit: 'MPa', type: 'number', default: 85, min: 0.01 },
      { key: 'core_density', label: 'Honeycomb core density', unit: 'kg/m³', type: 'number', default: 48, min: 0.01 }
    ],
    syncPreset: syncModalDensityMaterial,
    theory: '<p>The selected relations are extracted from ESA PSS-03-204 Issue 1 (1996), Appendix A, Topics A.03–A.09 and A.13–A.14. Modal density n(f)=dN/df counts resonances per hertz, N(f) counts modes below a frequency, and n(f)Δf estimates the population inside the selected fractional-octave band. The cylinder relation is piecewise about ring frequency and its high-frequency branch uses the selected bandwidth factor F. Stiffened panels and cylinders sum the constituent skin, stringer, and frame densities exactly as prescribed by Topics A.07–A.08.</p><p>Topics A.10–A.12 describe curved sandwich shells through specialist numerical integrations and refer to the manual’s Ref. [10] for the full model. They are retained in the source coverage below but are not exposed as calculators until their additional material directions, curvature terms, and singularity treatment can be represented without guessing.</p>',
    assumptions: ['Uniform geometry and material properties within every constituent.', 'Asymptotic mode counting rather than exact low-order eigensolutions.', 'Beam, stiffener, grid, and frame members use one solid rectangular section.', 'The honeycomb implementation specializes the orthotropic-core relation to identical isotropic faces and Gx=Gy.', 'Each wave family is counted consistently and constituent densities are combined only where Appendix A explicitly prescribes a sum.'],
    example: 'Compare an unstiffened panel with the same panel plus 12 m of stringer, then compare an unstiffened cylinder with the constituent-sum stiffened cylinder near its ring frequency.',
    references: [
      { title: 'ESA PSS-03-204 Issue 1 (1996) — Structural Acoustics Design Manual, Appendix A', note: 'Topics A.03–A.09 and A.13–A.14 provide the implemented GENSTEP3 modal-density relations for panels, members, frames, cylinders, honeycomb construction, grids, and acoustic cavities.' },
      { title: 'ESA PSS-03-204 Appendix A, Topics A.10–A.12', note: 'Curved and double-curved sandwich-shell relations require the specialist numerical models and definitions cited by the manual as Ref. [10]; they are documented here but intentionally not approximated as selectable cases.' }
    ],
    compute(values) {
      const bandsPerOctave = Number(values.band_fraction) || 3;
      const common = { ...materialValues(values), frequency: values.frequency, bandsPerOctave, lossFactor: values.loss_factor, height: values.height, radius: values.radius, soundSpeed: values.sound_speed, memberWidth: mm(values.member_width), memberHeight: mm(values.member_height), totalMemberLength: values.total_member_length, frameCount: values.frame_count, faceThickness: mm(values.face_thickness), coreThickness: mm(values.core_thickness), coreShearModulus: Number(values.core_shear) * 1e6, coreDensity: values.core_density };
      const state = modalDensityAtlasState({ ...common, type: values.type });
      const group = modalDensityGroup(state.type);
      const comparisonTypes = modalDensityComparisonGroups[group];
      const comparisonStates = comparisonTypes.map(type => type === state.type ? state : modalDensityAtlasState({ ...common, type }));
      const warnings = [];
      if (state.modesInBand < 5) warnings.push(`Fewer than five modes occupy the selected ${bandsPerOctave===1?'octave':bandsPerOctave===6?'sixth-octave':'third-octave'} band; use exact modes or hybrid FE–SEA evidence near this frequency.`);
      if (state.transitionFrequency && Math.abs(Math.log2(state.frequency / state.transitionFrequency)) < 0.5) warnings.push('The selected band lies within half an octave of a dimensional, shear, or ring-frequency transition; bracket both adjacent models.');
      if (state.sourceTopic === 'Supplementary wave family') warnings.push('This comparison family is retained from the earlier atlas; it is not presented as an ESA Appendix A formulation.');
      const tables = [{ title: 'ESA Appendix A formulation used', columns: ['Source topic', 'Implemented relation', 'Model specialization'], rows: [[state.sourceTopic, state.sourceRelation, state.specialization]] }];
      if (state.components.length) tables.push({ title: 'Constituent modal-density sum', columns: ['Constituent', 'Modal density (modes/Hz)', 'Share of total'], rows: state.components.map(([name, density]) => [name, density, density / state.modalDensity]) });
      return {
        values: [stat('Mode count below f', state.modeCountBelow, 'modes'), stat('Modal density', state.modalDensity, 'modes/Hz'), stat('Average modal spacing', state.averageSpacing, 'Hz'), stat('Modes in selected band', state.modesInBand, 'modes'), stat('Modal overlap', state.modalOverlap), stat('Band limits', `${state.bandLow.toFixed(1)}–${state.bandHigh.toFixed(1)}`, 'Hz'), stat('Wave speed', state.waveSpeed, 'm/s'), stat('Wavelength', state.wavelength, 'm'), stat('Dimensionality', `${state.dimension}D`), stat('Transition frequency', state.transitionFrequency ?? 'Not defined', state.transitionFrequency ? 'Hz' : '')],
        interpretation: { summary: `${state.sourceTopic}: ${state.basis} gives ${state.modalDensity.toExponential(3)} modes/Hz, approximately ${state.modeCountBelow.toFixed(1)} modes below ${state.frequency.toFixed(0)} Hz, and ${state.modesInBand.toFixed(2)} modes in the selected band. This is a ${state.readiness}.`, physicalMeaning: `The first plot compares the selected ${modalDensityLabels[state.type].toLowerCase()} family with the closest structural or acoustic cases using the same nominal inputs. The second plot separates cumulative population N(f) from local band population n(f)Δf. Modal density measures average spectral crowding; it does not predict individual resonance locations or response amplitude. The formulation table records exactly which ESA appendix topic and specialization produced the curve.` },
        engineeringConsiderations: launchConsiderations('Use the ESA relation that matches the actual subsystem construction, and retain separate constituent densities where the manual prescribes a stiffened-panel or stiffened-cylinder sum.'),
        warnings,
        plots: [
          { title: `${modalDensityGroupLabel(group)} modal-density atlas`, xLabel: 'Frequency (Hz)', yLabel: 'Modal density (modes/Hz)', xScale: 'log', yScale: 'log', traceSelector: { label: 'Modal densities to display', initial: 'emphasis' }, traces: comparisonStates.map(item => trace(modalDensityLabels[item.type], item.frequencies, item.curve, { emphasis: item.type === state.type })) },
          { title: `${modalDensityLabels[state.type]} modal population`, xLabel: 'Frequency (Hz)', yLabel: 'Mode count', xScale: 'log', yScale: 'log', traces: [trace('Modes below frequency N(f)', state.frequencies, state.countCurve), trace('Modes in selected band n(f)Δf', state.frequencies, state.modesInBandCurve, { emphasis: true })] }
        ],
        tables,
        presentation: { primaryEvidence: { type: 'plot', index: 0 }, primaryEvidenceCount: 1, primaryValueCount: 6 }
      };
    }
  },

  'infinite-mobility-atlas': {
    category: 'Structural Acoustics',
    basis: 'Infinite-structure characteristic mobility relations for rods, beams, panels, sandwich panels, and cylindrical shells',
    confidence: 'Closed-form mean-response and high-frequency screening relations; not a finite-FRF resonance model',
    inputs: [
      { key: 'geometry', label: 'Structure family', type: 'select', default: 'cylindrical-shell', group: '1. Structure family', groupOpen: true, options: [{ value: 'cylindrical-shell', label: 'Cylindrical shell' }, { value: 'curved-panel', label: 'Curved cylindrical panel' }, { value: 'beam', label: 'Beam or rod' }, { value: 'flat-panel', label: 'Flat panel' }, { value: 'sandwich-panel', label: 'Sandwich panel' }], help: 'Choose the structural family first. The next section exposes only that family’s applicable geometry definition.' },

      { key: 'material', label: 'Material preset', type: 'select', default: 'aluminum', group: '2. Material', groupOpen: true, options: materialOptions, help: 'Selecting a preset populates the editable modulus, density, and Poisson-ratio fields below.' },
      { key: 'modulus', label: 'Young’s modulus', unit: 'GPa', type: 'number', default: materials.aluminum.E / 1e9, min: 0.01, group: '2. Material' },
      { key: 'density', label: 'Structural density', unit: 'kg/m³', type: 'number', default: materials.aluminum.rho, min: 1, group: '2. Material' },
      { key: 'poisson', label: 'Poisson ratio', type: 'number', default: materials.aluminum.nu, min: -0.49, max: 0.49, group: '2. Material' },

      { key: 'shell_geometry', label: 'Specific geometry', type: 'select', default: 'unstiffened-thin-circular', group: '3. Specific geometry', groupOpen: true, visibleWhen: { geometry: 'cylindrical-shell' }, options: [{ value: 'unstiffened-thin-circular', label: 'Unstiffened thin circular shell' }], help: 'Applies the published beam-like, curved-shell, and plate-like characteristic-mobility regimes.' },
      { key: 'shell_radius', label: 'Mean shell radius', unit: 'm', type: 'number', default: 1.8, min: 0.001, group: '3. Specific geometry', visibleWhen: { geometry: 'cylindrical-shell' } },
      { key: 'shell_thickness', label: 'Shell-wall thickness', unit: 'mm', type: 'number', default: 4, min: 0.02, group: '3. Specific geometry', visibleWhen: { geometry: 'cylindrical-shell' } },

      { key: 'curved_panel_geometry', label: 'Specific geometry', type: 'select', default: 'open-cylindrical-segment', group: '3. Specific geometry', groupOpen: true, visibleWhen: { geometry: 'curved-panel' }, options: [{ value: 'open-cylindrical-segment', label: 'Open thin cylindrical shell segment' }], help: 'Uses the cylindrical ring, curved-shell, and local flat-plate relations. Its low-frequency relation is an explicit arc-width strip proxy, not a closed-cylinder beam equivalent.' },
      { key: 'curved_panel_radius', label: 'Radius of curvature', unit: 'm', type: 'number', default: 1.8, min: 0.001, group: '3. Specific geometry', visibleWhen: { geometry: 'curved-panel' } },
      { key: 'curved_panel_arc_angle', label: 'Subtended arc angle', unit: 'deg', type: 'number', default: 120, min: 5, max: 355, group: '3. Specific geometry', visibleWhen: { geometry: 'curved-panel' } },
      { key: 'curved_panel_axial_length', label: 'Axial panel length', unit: 'm', type: 'number', default: 2.4, min: 0.01, group: '3. Specific geometry', visibleWhen: { geometry: 'curved-panel' } },
      { key: 'curved_panel_thickness', label: 'Panel-wall thickness', unit: 'mm', type: 'number', default: 4, min: 0.02, group: '3. Specific geometry', visibleWhen: { geometry: 'curved-panel' } },

      { key: 'beam_geometry', label: 'Specific geometry', type: 'select', default: 'beam-flexural', group: '3. Specific geometry', groupOpen: true, visibleWhen: { geometry: 'beam' }, options: [{ value: 'rod-axial', label: 'Axial rod' }, { value: 'beam-flexural', label: 'Infinite flexural beam, center drive' }, { value: 'beam-free-end', label: 'Semi-infinite flexural beam, free-end drive' }], help: 'Choose the wave family and drive condition before entering the rectangular member section.' },
      { key: 'member_width', label: 'Rectangular-section width', unit: 'mm', type: 'number', default: 25, min: 0.1, group: '3. Specific geometry', visibleWhen: { geometry: 'beam' } },
      { key: 'member_height', label: 'Rectangular-section height', unit: 'mm', type: 'number', default: 40, min: 0.1, group: '3. Specific geometry', visibleWhen: { geometry: 'beam' } },

      { key: 'panel_geometry', label: 'Specific geometry', type: 'select', default: 'infinite-thin-isotropic', group: '3. Specific geometry', groupOpen: true, visibleWhen: { geometry: 'flat-panel' }, options: [{ value: 'infinite-thin-isotropic', label: 'Infinite thin isotropic flat panel' }], help: 'The paired relation is the propagating-wave thin-plate characteristic mobility.' },
      { key: 'plate_thickness', label: 'Panel thickness', unit: 'mm', type: 'number', default: 3, min: 0.02, group: '3. Specific geometry', visibleWhen: { geometry: 'flat-panel' } },

      { key: 'sandwich_geometry', label: 'Specific geometry', type: 'select', default: 'symmetric-shear-core', group: '3. Specific geometry', groupOpen: true, visibleWhen: { geometry: 'sandwich-panel' }, options: [{ value: 'symmetric-shear-core', label: 'Symmetric face sheets with shear core' }], help: 'The selected material applies to both isotropic face sheets; enter the core properties below.' },
      { key: 'face_thickness', label: 'Face-sheet thickness', unit: 'mm', type: 'number', default: 0.6, min: 0.01, group: '3. Specific geometry', visibleWhen: { geometry: 'sandwich-panel' } },
      { key: 'core_thickness', label: 'Core thickness', unit: 'mm', type: 'number', default: 24.8, min: 0.1, group: '3. Specific geometry', visibleWhen: { geometry: 'sandwich-panel' } },
      { key: 'core_density', label: 'Core density', unit: 'kg/m³', type: 'number', default: 48, min: 0.1, group: '3. Specific geometry', visibleWhen: { geometry: 'sandwich-panel' } },
      { key: 'core_shear_modulus', label: 'Core shear modulus', unit: 'MPa', type: 'number', default: 85, min: 0.001, group: '3. Specific geometry', visibleWhen: { geometry: 'sandwich-panel' } },

      { key: 'frequency', label: 'Selected frequency', unit: 'Hz', type: 'number', default: 1000, min: 0.1, group: '4. Excitation & plot' },
      { key: 'frequency_min', label: 'Plot minimum frequency', unit: 'Hz', type: 'number', default: 10, min: 0.01, group: '4. Excitation & plot' },
      { key: 'frequency_max', label: 'Plot maximum frequency', unit: 'Hz', type: 'number', default: 50000, min: 0.1, group: '4. Excitation & plot' },
      { key: 'force', label: 'Reference RMS point force', unit: 'N', type: 'number', default: 10, min: 0.0001, group: '4. Excitation & plot' }
    ],
    syncPreset: syncInfiniteMobilityMaterial,
    theory: '<p>Characteristic mobility represents energy carried away by propagating structural waves. For a finite structure it is a mean-response reference—often near the geometric mean of resonant and antiresonant mobility—not a replacement for a complex measured or modal FRF.</p>',
    assumptions: ['Uniform, unbounded or weakly reflecting member, plate, sandwich panel, or shell.', 'Point drive is small relative to the active structural wavelength.', 'Curves show real propagating-wave conductance; finite boundaries, individual modes, joints, and attachment compliance are excluded.', 'The sandwich relation uses a symmetric face-sheet / shear-core approximation; the closed-shell relation is a thin, unstiffened-cylinder screen. An open curved panel retains the local cylindrical shell and plate relations but replaces the full-cylinder low-frequency branch with an arc-width strip proxy.'],
    references: [
      { title: 'Published relation — Hambric: To Infinity and Beyond', note: 'Authoritative published source for the real characteristic-mobility relations implemented here: rod, beam, thin plate, sandwich panel, and cylindrical shell. Local file: references/In19_inf_panel.pdf.' },
      { title: 'Published corroboration — ACS 519 Combined: Cylindrical Shells', note: 'Course source reproducing the beam-like, curved-shell, and local flat-plate shell limits. Local file: references/ACS519_Combined.pdf.' },
      { title: 'Engineering screening input — material preset library', note: 'Editable shared-library starting values. Confirm temperature, direction, heat treatment, fabrication, damping, and installed mass before consequential use.' }
    ],
    example: 'Overlay an acquired drive-point mobility with the appropriate curve to check units and high-frequency mean level, then use the cylindrical-shell plot to identify beam-like, curved-shell, and plate-like regions.',
    compute(values) {
      const state = infiniteMobilityAtlasState({
        focus: infiniteMobilityFocus(values),
        frequency: values.frequency,
        frequencyMin: values.frequency_min,
        frequencyMax: values.frequency_max,
        forceRms: values.force,
        modulus: gpa(values.modulus),
        density: values.density,
        poisson: values.poisson,
        thickness: mm(values.plate_thickness),
        memberWidth: mm(values.member_width),
        memberHeight: mm(values.member_height),
        faceThickness: mm(values.face_thickness),
        coreThickness: mm(values.core_thickness),
        coreDensity: values.core_density,
        coreShearModulus: mpa(values.core_shear_modulus),
        shellRadius: values.geometry === 'curved-panel' ? values.curved_panel_radius : values.shell_radius,
        shellThickness: mm(values.geometry === 'curved-panel' ? values.curved_panel_thickness : values.shell_thickness),
        shellArcAngleDeg: values.curved_panel_arc_angle,
        shellAxialLength: values.curved_panel_axial_length,
        shellClosed: values.geometry !== 'curved-panel'
      });
      const curves = state.curves;
      const highlighted = state.selected.focus;
      const emphasis = key => highlighted === key;
      const geometryLabel = infiniteMobilityGeometryLabel(values);
      const geometrySchematic = infiniteMobilitySchematic(values, state);
      const shellTransitionNote = state.shell.hasCurvedRegime
        ? `${state.shell.lowTransitionFrequency.toFixed(1)} Hz beam→shell; ${state.shell.plateTransitionFrequency.toFixed(1)} Hz shell→plate`
        : 'h/a compresses the source-model curved-shell interval; treat the result as a rough thin-shell screen.';
      const shellSelected = values.geometry === 'cylindrical-shell' || values.geometry === 'curved-panel';
      const dynamicAlerts = [];
      if (shellSelected && state.shell.thicknessToRadius > 0.1) dynamicAlerts.push('Shell h/R exceeds 0.1, outside the thin-shell screening range; use a shell model that includes thick-wall effects.');
      const transitionFrequency = state.shell.normalizedFrequency < state.shell.plateTransitionRatio
        ? state.shell.lowTransitionFrequency
        : state.shell.plateTransitionFrequency;
      if (shellSelected && transitionFrequency > 0 && Math.abs(Math.log2(state.frequency / transitionFrequency)) < 0.25) dynamicAlerts.push('Selected frequency is within one-quarter octave of a constituent-regime transition; bracket both neighboring relations or use finite/FE evidence.');
      if (values.geometry === 'curved-panel') dynamicAlerts.push('Open curved panel uses an arc-width strip proxy at low frequency; validate boundaries, panel aspect ratio, and edge reflection with a finite curved-panel model or test.');
      if (values.geometry === 'sandwich-panel' && state.frequency >= 0.7 * state.sandwich.transitionFrequency && state.frequency <= 1.4 * state.sandwich.transitionFrequency) dynamicAlerts.push('Selected sandwich-panel frequency lies near the flexural-to-shear transition; verify core shear properties and face-sheet construction.');
      const shellValues = [
        stat('Selected shell mobility', state.shell.mobility, 'm/(N·s)'),
        stat(state.shell.closed ? 'Beam-like shell mobility' : 'Curved-panel strip-proxy mobility', state.shell.beamMobility, 'm/(N·s)'),
        stat('Curved-shell mobility', state.shell.curvedMobility, 'm/(N·s)'),
        stat('Flat-plate limit mobility', state.shell.plateMobility, 'm/(N·s)'),
        stat('Shell ring frequency', state.shell.ringFrequency, 'Hz'),
        stat('Shell regime', state.shell.regime),
        stat('Shell h/R', state.shell.thicknessToRadius),
        stat(state.shell.closed ? 'Beam-equivalent section area' : 'Arc-strip proxy area', state.shell.beamEquivalentArea, 'm²'),
        stat(state.shell.closed ? 'Beam-equivalent bending speed' : 'Arc-strip proxy bending speed', state.shell.beamEquivalentSpeed, 'm/s'),
        stat('Flat-plate flexural rigidity', state.shell.bendingStiffness, 'N·m'),
        stat('Characteristic impedance', state.selected.impedance, 'N·s/m'),
        stat('Reference input power', state.selected.inputPower, 'W')
      ];
      const generalValues = [
        stat('Highlighted real mobility', state.selected.mobility, 'm/(N·s)'),
        stat('Characteristic impedance', state.selected.impedance, 'N·s/m'),
        stat('Reference input power', state.selected.inputPower, 'W'),
        stat('Thin-plate mobility', state.thinPlateMobility, 'm/(N·s)'),
        stat('Shell ring frequency', state.shell.ringFrequency, 'Hz'),
        stat('Shell regime', state.shell.regime),
        stat('Sandwich shear-transition scale', state.sandwich.transitionFrequency, 'Hz')
      ];
      const shellRelationTable = {
        title: values.geometry === 'curved-panel' ? 'Curved-panel constituent mobility relations' : 'Cylindrical-shell constituent mobility relations',
        columns: ['Constituent model', 'Applicable normalized-frequency range', 'Re{Y} (m/N·s)'],
        rows: [
          [state.shell.beamEquivalentBasis, `Ω < 0.77h/R = ${state.shell.lowTransitionRatio.toExponential(3)}`, state.shell.beamMobility],
          ['Curved-shell relation', state.shell.hasCurvedRegime ? `${state.shell.lowTransitionRatio.toExponential(3)} < Ω < 0.6` : 'Compressed for this h/R; screening only', state.shell.curvedMobility],
          ['Flat-plate limit', 'Ω > 0.6', state.shell.plateMobility],
          [`Selected piecewise relation (${state.shell.regime})`, `Ω = ${state.shell.normalizedFrequency.toExponential(3)}`, state.shell.mobility]
        ]
      };
      const generalTable = {
        title: 'Mobility models at the selected frequency',
        columns: ['Structure / drive', 'Re{Y} (m/N·s)', 'Characteristic impedance (N·s/m)'],
        rows: [
          ['Axial rod', state.axialRodMobility, 1 / state.axialRodMobility],
          ['Infinite flexural beam, center', state.beamCenterMobility, 1 / state.beamCenterMobility],
          ['Semi-infinite flexural beam, free end', state.beamFreeEndMobility, 1 / state.beamFreeEndMobility],
          ['Infinite thin plate', state.thinPlateMobility, 1 / state.thinPlateMobility],
          ['Sandwich panel', state.sandwich.mobility, 1 / state.sandwich.mobility],
          [`Cylindrical shell (${state.shell.regime})`, state.shell.mobility, 1 / state.shell.mobility]
        ]
      };
      const shellConstituentKind = frequency => {
        const ratio = frequency / state.shell.ringFrequency;
        if (state.shell.hasCurvedRegime) {
          if (ratio < state.shell.lowTransitionRatio) return 'low';
          if (ratio < state.shell.plateTransitionRatio) return 'curved';
          return 'plate';
        }
        return ratio < state.shell.plateTransitionRatio ? 'low' : 'plate';
      };
      const activeConstituentTrace = (kind, source) => {
        const pairs = state.frequencies.map((frequency, index) => ({ frequency, value: source[index] })).filter(({ frequency }) => shellConstituentKind(frequency) === kind);
        return { x: pairs.map(pair => pair.frequency), y: pairs.map(pair => pair.value) };
      };
      const lowConstituentLabel = state.shell.closed ? 'Beam-like active constituent' : 'Arc-strip proxy active constituent';
      const lowExtensionLabel = state.shell.closed ? 'Beam-like relation extension' : 'Arc-strip proxy extension';
      const currentConstituentKind = shellConstituentKind(state.frequency);
      const constituentColors = Object.freeze({ low: '#55b8ff', curved: '#ffcf66', plate: '#65d9a0' });
      const currentConstituentLabel = currentConstituentKind === 'low' ? lowConstituentLabel : currentConstituentKind === 'curved' ? 'Curved-shell active constituent' : 'Flat-plate active constituent';
      const lowActive = activeConstituentTrace('low', curves.shellBeam);
      const curvedActive = activeConstituentTrace('curved', curves.shellCurved);
      const plateActive = activeConstituentTrace('plate', curves.shellPlate);
      const activeConstituentTraces = [
        lowActive.x.length ? trace(lowConstituentLabel, lowActive.x, lowActive.y, { color: constituentColors.low, emphasis: true }) : null,
        curvedActive.x.length ? trace('Curved-shell active constituent', curvedActive.x, curvedActive.y, { color: constituentColors.curved, emphasis: true }) : null,
        plateActive.x.length ? trace('Flat-plate active constituent', plateActive.x, plateActive.y, { color: constituentColors.plate, emphasis: true }) : null
      ].filter(Boolean);
      const shellConstituentPlot = {
        title: values.geometry === 'curved-panel' ? 'Curved-panel constituent mobility response' : 'Cylindrical-shell constituent mobility response',
        xLabel: 'Frequency (Hz)',
        yLabel: 'Real characteristic mobility (m/N·s)',
        xScale: 'log',
        yScale: 'log',
        traceSelector: { label: 'Constituent relations to display', initial: 'emphasis' },
        traces: [
          trace('Resulting piecewise response', state.frequencies, curves.shellApplicable, { color: '#c1d0df', dash: true }),
          ...activeConstituentTraces,
          trace(`Selected point · ${currentConstituentLabel}`, [state.frequency], [state.shell.mobility], { color: constituentColors[currentConstituentKind], emphasis: true, showPoints: true, pointRadius: 8, hideLine: true }),
          trace(lowExtensionLabel, state.frequencies, curves.shellBeam, { color: constituentColors.low, dash: true }),
          trace('Curved-shell relation extension', state.frequencies, curves.shellCurved, { color: constituentColors.curved, dash: true }),
          trace('Flat-plate relation extension', state.frequencies, curves.shellPlate, { color: constituentColors.plate, dash: true })
        ]
      };
      const generalAtlasPlot = {
        title: 'Infinite-structure mobility atlas',
        xLabel: 'Frequency (Hz)',
        yLabel: 'Real characteristic mobility (m/N·s)',
        xScale: 'log',
        yScale: 'log',
        traceSelector: { label: 'Structure mobilities to display', initial: 'emphasis' },
        traces: [
          trace('Axial rod', state.frequencies, curves.rodAxial, { emphasis: emphasis('rod-axial') }),
          trace('Infinite flexural beam, center drive', state.frequencies, curves.beamCenter, { emphasis: emphasis('beam-flexural') }),
          trace('Semi-infinite beam, free-end drive', state.frequencies, curves.beamFreeEnd, { emphasis: emphasis('beam-free-end') }),
          trace('Infinite thin plate', state.frequencies, curves.thinPlate, { emphasis: emphasis('thin-plate') }),
          trace('Sandwich panel', state.frequencies, curves.sandwich, { emphasis: emphasis('sandwich-panel') }),
          trace('Cylindrical-shell applicable relation', state.frequencies, curves.shellApplicable, { emphasis: emphasis('cylindrical-shell') })
        ]
      };
      const fullShellExtensionsPlot = {
        title: values.geometry === 'curved-panel' ? 'Curved-panel full constituent-relation extensions' : 'Cylindrical-shell full constituent-relation extensions',
        xLabel: 'Frequency (Hz)',
        yLabel: 'Real characteristic mobility (m/N·s)',
        xScale: 'log',
        yScale: 'log',
        traceSelector: { label: 'Shell relations to display', initial: 'emphasis' },
        traces: [
          trace('Applicable piecewise shell relation', state.frequencies, curves.shellApplicable, { emphasis: true }),
          trace(lowExtensionLabel, state.frequencies, curves.shellBeam),
          trace('Curved-shell relation', state.frequencies, curves.shellCurved),
          trace('Plate-like shell relation', state.frequencies, curves.shellPlate)
        ]
      };
      return {
        values: shellSelected ? shellValues : generalValues,
        interpretation: `${geometryLabel} at ${state.frequency.toFixed(1)} Hz gives Re{Y}=${state.selected.mobility.toExponential(3)} m/(N·s) from ${state.selected.basis}. The shell screen is in its ${state.shell.regime} regime; ${shellTransitionNote}`,
        engineeringConsiderations: launchConsiderations('Use the appropriate infinite-structure curve as a high-frequency mean and calibration check for fairing barrels, decks, struts, pipes, and sandwich equipment panels; then retain finite-model or measured FRFs where modes, interfaces, or installed fluid loading decide the result.'),
        warnings: [
          'Do not interpret a characteristic mobility as the value at every resonance or antiresonance. It is a real mean-response conductance, not a complex finite-structure FRF.',
          'The cylindrical-shell regime boundaries are approximate. Frames, orthotropy, pressure, local reinforcements, end conditions, and fluid loading can move them materially.',
          'The reference input-power result uses ½F²Re{Y}; do not substitute transfer mobility for drive-point conductance.',
          ...(values.geometry === 'curved-panel' ? ['An open curved panel is not a closed cylinder: its low-frequency branch is an explicit arc-width strip proxy. Boundary restraints, panel aspect ratio, curvature coupling, and edge reflection require a finite-panel or shell model when they control the response.'] : [])
        ],
        alerts: dynamicAlerts,
        plots: shellSelected ? [shellConstituentPlot, fullShellExtensionsPlot] : [generalAtlasPlot, fullShellExtensionsPlot],
        schematics: [geometrySchematic],
        tables: shellSelected ? [shellRelationTable, generalTable] : [generalTable],
        presentation: shellSelected
          ? { primaryEvidenceStack: [{ type: 'plot', index: 0 }, { type: 'schematic', index: 0 }, { type: 'table', index: 0 }], primaryValueCount: 11 }
          : { primaryEvidenceStack: [{ type: 'plot', index: 0 }, { type: 'schematic', index: 0 }], primaryValueCount: 7 }
      };
    }
  },

  'sea-impedance-library': {
    category: 'SEA & Energy',
    basis: 'Analytical driving-point impedance and high-frequency mobility relations',
    confidence: 'Closed-form infinite/member/shell screening relations',
    inputs: [
      { key: 'model', label: 'Mobility model', type: 'select', default: 'plate-center', options: [{ value: 'plate-center', label: 'Thin plate, center' }, { value: 'plate-edge', label: 'Thin plate, edge' }, { value: 'cylindrical-shell', label: 'Unstiffened cylinder' }, { value: 'rod-longitudinal', label: 'Semi-infinite rod' }, { value: 'high-frequency-general', label: 'General Y=n/(4M)' }] },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'radius', label: 'Cylinder radius', unit: 'm', type: 'number', default: 1.8, min: 0.01 },
      { key: 'modal_density', label: 'Modal density', unit: 'modes/Hz', type: 'number', default: 0.04, min: 1e-8 },
      { key: 'mass', label: 'Subsystem mass', unit: 'kg', type: 'number', default: 120, min: 0.001 },
      { key: 'force', label: 'RMS point force', unit: 'N', type: 'number', default: 10, min: 0.001 },
      ...materialInputs
    ],
    theory: '<p>Driving-point mobility converts force into velocity and its real part converts force squared into injected power. Plate center, plate edge, shell, rod, and modal-density averages represent different load-spreading mechanisms.</p>',
    assumptions: ['Real high-frequency impedance with no narrow individual resonances.', 'Uniform plate, rod, or unstiffened cylindrical shell.', 'Point attachment is small relative to wavelength and the model geometry.'],
    example: 'Compare plate center and edge mobility, then switch a fairing barrel through its fundamental and ring-frequency shell regimes.',
    compute(values) {
      const state = drivingPointImpedanceState({ ...materialValues(values), model: values.model, frequency: values.frequency, radius: values.radius, modalDensity: values.modal_density, mass: values.mass, forceRms: values.force });
      return {
        values: [stat('Mechanical impedance', state.impedance, 'N·s/m'), stat('Driving-point mobility', state.mobility, 'm/(N·s)'), stat('Conductance', state.conductance, 'm/(N·s)'), stat('Point-force input power', state.inputPower, 'W'), stat('Shell fundamental scale', state.firstFrequency ?? 'Not applicable', state.firstFrequency ? 'Hz' : ''), stat('Shell ring frequency', state.model === 'cylindrical-shell' ? state.ringFrequency : 'Not applicable', state.model === 'cylindrical-shell' ? 'Hz' : '')],
        interpretation: `${state.basis} gives Y=${state.mobility.toExponential(3)} m/(N·s). The entered force injects ${state.inputPower.toExponential(3)} W when the real-conductance assumption is valid.`,
        engineeringConsiderations: launchConsiderations('Use the mobility at engine, actuator, bracket, umbilical, or equipment interfaces to convert force into power; do not substitute a transfer FRF magnitude for drive-point conductance.'),
        warnings: ['Individual resonances, attachment compliance, finite boundaries, shell frames, and complex phase can make measured mobility depart strongly from the high-frequency real-valued screen.'],
        plots: [{ title: 'Driving-point mobility versus frequency', xLabel: 'Frequency (Hz)', yLabel: 'Mobility (m/N·s)', xScale: 'log', yScale: 'log', traces: [trace(state.basis, state.frequencies, state.mobilityCurve, { emphasis: true })] }]
      };
    }
  },

  'clf-mechanism-library': {
    category: 'SEA & Energy',
    basis: 'Mechanism-specific analytical coupling loss factors with reciprocity',
    confidence: 'Closed-form beam, plate, point, line, bolt, radiation, and mass-law screens',
    inputs: [
      { key: 'mechanism', label: 'Coupling mechanism', type: 'select', default: 'panel-air', options: [{ value: 'l-beam', label: 'L-beam wave conversion' }, { value: 'l-plates', label: 'L-shaped plates' }, { value: 'point-bridge', label: 'Point bridge' }, { value: 'bolted-plates', label: 'Bolted plates' }, { value: 'line-joint', label: 'Plate line joint' }, { value: 'panel-air', label: 'Panel-to-air radiation' }, { value: 'fairing-masslaw', label: 'Fairing nonresonant path' }] },
      { key: 'wave_conversion', label: 'L-beam conversion', type: 'select', default: 'bb', options: [{ value: 'bb', label: 'Bending → bending' }, { value: 'bl', label: 'Bending ↔ longitudinal' }, { value: 'll', label: 'Longitudinal → longitudinal' }] },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'modal_density_1', label: 'Subsystem 1 modal density', unit: 'modes/Hz', type: 'number', default: 0.04, min: 1e-8 },
      { key: 'modal_density_2', label: 'Subsystem 2 modal density', unit: 'modes/Hz', type: 'number', default: 0.18, min: 1e-8 },
      { key: 'internal_loss', label: 'Subsystem 1 internal loss', type: 'number', default: 0.02, min: 1e-8 },
      { key: 'transmission', label: 'Junction transmission coefficient', type: 'number', default: 0.15, min: 0, max: 1 },
      { key: 'junction_length', label: 'Junction length', unit: 'm', type: 'number', default: 1.4, min: 0.001 },
      { key: 'point_count', label: 'Bolts / point bridges', type: 'number', default: 12, min: 1, step: 1 },
      { key: 'impedance_1', label: 'Point impedance 1', unit: 'N·s/m', type: 'number', default: 4000, min: 0.001 },
      { key: 'impedance_2', label: 'Point impedance 2', unit: 'N·s/m', type: 'number', default: 7500, min: 0.001 },
      { key: 'radiation_efficiency', label: 'Radiation efficiency', type: 'number', default: 0.35, min: 0.000001 },
      { key: 'transmission_loss', label: 'Mass-law TL', unit: 'dB', type: 'number', default: 28 },
      { key: 'volume', label: 'Acoustic volume', unit: 'm³', type: 'number', default: 60, min: 0.001 },
      { key: 'thickness_2', label: 'Receiving-plate thickness', unit: 'mm', type: 'number', default: 4, min: 0.02 },
      ...materialInputs
    ],
    theory: '<p>A CLF is not a generic percentage. It embeds wave transmission, conductance or radiation resistance, junction extent, modal density, direction, and subsystem energy normalization.</p>',
    assumptions: ['Linear passive reciprocal junction.', 'Subsystems retain identifiable diffuse modal energy.', 'The selected ideal mechanism dominates the modeled connection.'],
    example: 'Compare a continuous frame joint with twelve discrete bolts, then convert a fairing mass-law transmission path into an acoustic CLF.',
    compute(values) {
      const stateInputs={ ...materialValues(values), mechanism: values.mechanism, waveConversion: values.wave_conversion, modalDensity1: values.modal_density_1, modalDensity2: values.modal_density_2, internalLossFactor: values.internal_loss, transmission: values.transmission, junctionLength: values.junction_length, pointCount: values.point_count, impedance1: values.impedance_1, impedance2: values.impedance_2, radiationEfficiency: values.radiation_efficiency, transmissionLoss: values.transmission_loss, volume: values.volume, thickness2: mm(values.thickness_2) };
      const state = clfMechanismState({ ...stateInputs,frequency: values.frequency });
      const warnings = [];
      if (state.couplingToLossRatio > 0.5) warnings.push('The forward CLF exceeds half the internal loss factor; weak-coupling and subsystem-identity assumptions need explicit validation.');
      if (values.mechanism === 'fairing-masslaw') warnings.push('The transmission coefficient is evaluated as 10^(−TL/10); a positive exponent would violate the positive-TL convention and is a known source-transcription risk.');
      const frequencies=Array.from({length:90},(_,index)=>Number(values.frequency)/20*(400**(index/89))),forward=[],reverse=[];
      for(const frequency of frequencies){const point=clfMechanismState({...stateInputs,frequency});forward.push(point.forward);reverse.push(point.reverse);}
      return {
        values: [stat('Forward CLF η₁₂', state.forward), stat('Reciprocal reverse CLF η₂₁', state.reverse), stat('Transmission / efficiency factor', state.coefficient), stat('Forward CLF / internal loss', state.couplingToLossRatio), stat('Reciprocity residual', state.reciprocityResidual, '', Math.abs(state.reciprocityResidual) > 1e-10 ? 'warn' : 'good')],
        interpretation: `${state.basis} produces η₁₂=${state.forward.toExponential(3)} and reciprocal η₂₁=${state.reverse.toExponential(3)}. The modal-density ratio—not an assumption of equal directional CLFs—sets the reverse value.`,
        engineeringConsiderations: launchConsiderations('Assign separate mechanisms to fairing frames, longerons, bolted equipment interfaces, line joints, point bridges, panel-air radiation, and nonresonant transmission; parallel paths must remain explicit.'),
        warnings,
        plots:[{title:'Reciprocal coupling loss factors versus frequency',xLabel:'Frequency (Hz)',yLabel:'Coupling loss factor',xScale:'log',yScale:'log',traces:[trace('Forward η₁₂',frequencies,forward,{emphasis:true}),trace('Reverse η₂₁',frequencies,reverse)]}]
      };
    }
  },

  'equivalent-power-injection': {
    category: 'SEA & Energy',
    basis: 'Diffuse-field, turbulent-boundary-layer, Corcos, and point-force power conversion',
    confidence: 'Analytical band-power screen with empirical TBL acceptance parameters',
    inputs: [
      { key: 'source', label: 'Excitation source', type: 'select', default: 'diffuse', options: [{ value: 'diffuse', label: 'Diffuse acoustic field' }, { value: 'tbl-slow', label: 'TBL: Uc > bending speed' }, { value: 'tbl-fast', label: 'TBL: Uc < bending speed' }, { value: 'corcos', label: 'Corcos TBL' }, { value: 'point-force', label: 'Point force' }] },
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'pressure', label: 'Band pressure RMS', unit: 'Pa', type: 'number', default: 200, min: 0.0001 },
      { key: 'modal_density', label: 'Structural modal density', unit: 'modes/Hz', type: 'number', default: 0.04, min: 1e-8 },
      { key: 'radiation_efficiency', label: 'Radiation efficiency', type: 'number', default: 0.35, min: 1e-8 },
      { key: 'convection_velocity', label: 'Convection velocity', unit: 'm/s', type: 'number', default: 220, min: 1 },
      { key: 'alpha_x', label: 'Corcos streamwise coefficient', type: 'number', default: 0.12, min: 0.001 },
      { key: 'alpha_z', label: 'Corcos lateral coefficient', type: 'number', default: 0.7, min: 0.001 },
      { key: 'force', label: 'Point force RMS', unit: 'N', type: 'number', default: 10, min: 0.001 },
      { key: 'conductance', label: 'Drive-point conductance', unit: 'm/(N·s)', type: 'number', default: 0.0001, min: 1e-12 },
      ...materialInputs
    ],
    theory: '<p>SEA requires watts per band, while environments are commonly specified as pressure, pressure PSD, or force. Equivalent-power relations apply the modal, radiation, mobility, phase-speed, and spatial-coherence filters that determine how much of the environment actually enters the subsystem.</p>',
    assumptions: ['Stationary band-limited random excitation.', 'Uniform panel or cylinder represented by plate wave properties.', 'TBL coefficients and convection velocity match the applicable flow state.'],
    example: 'Compare diffuse liftoff acoustics with attached-flow ascent TBL at the same pressure RMS; the accepted structural power need not rank the same as pressure level.',
    compute(values) {
      const state = equivalentPowerInjectionState({ ...materialValues(values), source: values.source, frequency: values.frequency, pressureRms: values.pressure, modalDensity: values.modal_density, radiationEfficiency: values.radiation_efficiency, convectionVelocity: values.convection_velocity, alphaX: values.alpha_x, alphaZ: values.alpha_z, forceRms: values.force, conductance: values.conductance });
      const warnings = [];
      if (values.source.includes('tbl') || values.source === 'corcos') warnings.push('TBL power can vary by factors of three or more with flow state, mode shape, Corcos coefficients, and convection model; carry those as explicit uncertainty.');
      if (state.acceptance > 1 && values.source !== 'point-force') warnings.push('Equivalent injected power exceeds the plane-wave incident-power reference; verify pressure convention, modal density, bandwidth, and the field model rather than clipping the result.');
      return {
        values: [stat('Equivalent injected power', state.injectedPower, 'W'), stat('Incident acoustic-power reference', state.incidentAcousticPower, 'W'), stat('Accepted / incident reference', state.acceptance), stat('Panel bending phase speed', state.phaseSpeed, 'm/s'), stat('Convection / bending speed', state.convectionVelocity / state.phaseSpeed), stat('Streamwise correlation length', state.correlationLengthX, 'm'), stat('Lateral correlation length', state.correlationLengthZ, 'm'), stat('Aerodynamic-coincidence frequency', state.coincidenceFrequency, 'Hz')],
        interpretation: `${state.basis} injects ${state.injectedPower.toExponential(3)} W into the selected band. ${state.regime}; pressure level alone therefore does not determine the structural SEA source power.`,
        engineeringConsiderations: launchConsiderations('Use diffuse acoustic conversion for liftoff/reverberant fields, Corcos or TBL relations for attached ascent flow, separated-flow bounds where applicable, and conductance for localized engine or equipment forces.'),
        warnings,
        plots: [{ title: 'Injected power versus convection velocity', xLabel: 'Convection velocity (m/s)', yLabel: 'Injected power (W)', xScale: 'log', yScale: 'log', traces: [trace(state.source, state.velocities, state.velocityCurve, { emphasis: true })] }]
      };
    }
  },

  'tbl-convection-model': {
    category: 'Aero / Distributed Loads',
    basis: 'Constant, Totaro, attached-flow, and separated-flow convection-velocity models',
    confidence: 'Exact Totaro relation plus clearly labeled screening envelopes',
    inputs: [
      { key: 'model', label: 'Convection model', type: 'select', default: 'totaro', options: [{ value: 'constant', label: 'Constant fraction' }, { value: 'totaro', label: 'Totaro frequency-dependent' }, { value: 'attached-envelope', label: 'Attached-flow envelope' }, { value: 'separated-envelope', label: 'Separated-flow envelope' }] },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'freestream', label: 'Free-stream velocity', unit: 'm/s', type: 'number', default: 300, min: 1 },
      { key: 'displacement_thickness', label: 'Displacement thickness', unit: 'mm', type: 'number', default: 12, min: 0.001 },
      { key: 'fixed_fraction', label: 'Constant Uc/U∞', type: 'number', default: 0.75, min: 0.1, max: 1.2 }
    ],
    theory: '<p>Convection velocity controls TBL phase, correlation lengths, convective wavelength, modal acceptance, and injected power. The Totaro relation moves from approximately U∞ at low reduced frequency toward 0.6U∞ at high reduced frequency.</p>',
    assumptions: ['Locally defined external velocity and displacement thickness.', 'Stationary boundary layer over the selected band.', 'Attached/separated envelopes are sensitivity models, not substitutes for flight or CFD-derived wall-pressure data.'],
    example: 'Compare the Totaro curve with a constant 0.75U∞ model, then switch to the separated-flow envelope for a shoulder or protuberance region.',
    compute(values) {
      const state = tblConvectionState({ model: values.model, frequency: values.frequency, freeStreamVelocity: values.freestream, displacementThickness: mm(values.displacement_thickness), fixedFraction: values.fixed_fraction });
      return {
        values: [stat('Convection velocity', state.convectionVelocity, 'm/s'), stat('Convection fraction Uc/U∞', state.convectionFraction), stat('Convective wavenumber', state.convectiveWavenumber, 'rad/m'), stat('Convective wavelength', state.convectiveWavelength, 'm'), stat('Reduced frequency ωδ*/U∞', state.reducedFrequency), stat('Flow-model regime', state.flowRegime)],
        interpretation: `${state.flowRegime} gives Uc=${state.convectionVelocity.toFixed(1)} m/s (${state.convectionFraction.toFixed(3)}U∞) at ${state.frequency.toFixed(0)} Hz. This value moves both the Corcos coherence lengths and the modal wavenumber match.`,
        engineeringConsiderations: launchConsiderations('Select convection behavior by vehicle station and flight event: smooth attached acreage, protuberance wakes, shoulders, separated regions, and buffet zones should not share one unqualified Uc/U∞ value.'),
        warnings: [values.model.includes('envelope') ? 'The attached/separated option is a screening envelope. Replace it with program flow data or a cited wall-pressure model for flight prediction.' : 'Even a cited convection relation does not define wall-pressure PSD or coherence coefficients; those inputs require separate evidence.'],
        plots: [{ title: 'TBL convection velocity versus frequency', xLabel: 'Frequency (Hz)', yLabel: 'Convection velocity (m/s)', xScale: 'log', traces: [trace(state.flowRegime, state.frequencies, state.velocities, { emphasis: true })] }]
      };
    }
  },

  'equipment-loading': {
    category: 'SEA & Energy',
    basis: 'Global mass-ratio and local footprint-area response corrections',
    confidence: 'Exact algebra within the added-inertial-mass screening model',
    inputs: [
      { key: 'unloaded_response', label: 'Unloaded response RMS', unit: 'g', type: 'number', default: 12, min: 0.0001 },
      { key: 'structure_mass', label: 'Bare structure mass', unit: 'kg', type: 'number', default: 180, min: 0.001 },
      { key: 'equipment_mass', label: 'Added equipment mass', unit: 'kg', type: 'number', default: 45, min: 0 },
      { key: 'surface_mass', label: 'Local structural surface mass', unit: 'kg/m²', type: 'number', default: 12, min: 0.001 },
      { key: 'footprint_area', label: 'Equipment footprint area', unit: 'm²', type: 'number', default: 0.35, min: 0.0001 }
    ],
    theory: '<p>Added equipment reduces an ideal mean-square response through either total subsystem mass or local footprint mass per area. The two corrections answer different smearing questions and can diverge dramatically.</p>',
    assumptions: ['Equipment behaves as added inertia without a local resonance.', 'Bare and loaded responses use consistent spectral or RMS conventions.', 'No attachment compliance, dynamic absorber effect, or load-path redistribution.'],
    example: 'Keep equipment mass fixed and shrink its footprint: the local-area method predicts stronger local inertial reduction while the global method is unchanged.',
    compute(values) {
      const state = equipmentLoadingState({ unloadedResponse: values.unloaded_response, bareStructureMass: values.structure_mass, equipmentMass: values.equipment_mass, structureSurfaceMass: values.surface_mass, footprintArea: values.footprint_area });
      const maximumMass=Math.max(1,Number(values.structure_mass)*2,Number(values.equipment_mass)*2),masses=Array.from({length:81},(_,index)=>maximumMass*index/80),global=[],local=[];
      for(const equipmentMass of masses){const point=equipmentLoadingState({unloadedResponse:values.unloaded_response,bareStructureMass:values.structure_mass,equipmentMass,structureSurfaceMass:values.surface_mass,footprintArea:values.footprint_area});global.push(point.globalResponse);local.push(point.localResponse);}
      return {
        values: [stat('Global mass-ratio response', state.globalResponse, 'g RMS'), stat('Local footprint response', state.localResponse, 'g RMS'), stat('Conservative screened response', state.conservativeResponse, 'g RMS'), stat('Global mean-square factor', state.globalMeanSquareFactor), stat('Local mean-square factor', state.localMeanSquareFactor), stat('Equipment footprint density', state.equipmentAreaDensity, 'kg/m²'), stat('Method spread', state.methodSpreadDb, 'dB')],
        interpretation: `The global and footprint methods predict ${state.globalResponse.toFixed(2)} and ${state.localResponse.toFixed(2)} g RMS. The ${state.methodSpreadDb.toFixed(1)} dB spread is a model-form decision, not random numerical scatter.`,
        engineeringConsiderations: launchConsiderations('Use the global result as the conservative smearing screen for fairing/deck averages, but resolve local equipment feet, panels, inserts, and attachment modes when footprint loading drives qualification response.'),
        warnings: [state.localMassRatio > 5 ? 'Equipment mass per footprint area greatly exceeds the panel surface mass; attachment stiffness and local modes are likely more important than a pure inertial correction.' : 'Confirm that the equipment behaves as attached mass rather than an independently resonant subsystem.'],
        plots:[{title:'Loaded response versus equipment mass',xLabel:'Equipment mass (kg)',yLabel:'Response (g RMS)',traces:[trace('Global mass-ratio method',masses,global,{emphasis:true}),trace('Local footprint method',masses,local)]}]
      };
    }
  },

  'sea-response-recovery': {
    category: 'SEA & Energy',
    basis: 'Subsystem energy recovery with statistical maximum-response concentration',
    confidence: 'Exact energy recovery plus statistical concentration relations within diffuse-band assumptions',
    inputs: [
      { key: 'kind', label: 'Subsystem type', type: 'select', default: 'structural', options: [{ value: 'structural', label: 'Structural' }, { value: 'acoustic', label: 'Acoustic' }] },
      { key: 'response_type', label: 'Concentration case', type: 'select', default: 'broadband', options: [{ value: 'broadband', label: 'Broadband' }, { value: 'pure-tone', label: 'Pure tone' }] },
      { key: 'energy', label: 'Band subsystem energy', unit: 'J', type: 'number', default: 0.02, min: 1e-12 },
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'mass', label: 'Structural mass', unit: 'kg', type: 'number', default: 120, min: 0.001 },
      { key: 'volume', label: 'Acoustic volume', unit: 'm³', type: 'number', default: 45, min: 0.001 },
      { key: 'modal_density', label: 'Modal density', unit: 'modes/Hz', type: 'number', default: 0.04, min: 1e-8 },
      { key: 'loss_factor', label: 'Net loss factor', type: 'number', default: 0.02, min: 1e-8 },
      { key: 'dimension', label: 'Subsystem dimension', type: 'select', default: '2', options: [{ value: '1', label: '1D' }, { value: '2', label: '2D' }, { value: '3', label: '3D' }] },
      { key: 'wavelength', label: 'Relevant wavelength', unit: 'm', type: 'number', default: 0.5, min: 0.0001 },
      { key: 'boundary_distance', label: 'Distance from boundary', unit: 'm', type: 'number', default: 0.2, min: 0 },
      ...materialInputs
    ],
    theory: '<p>SEA solves spatially averaged band energy. Mass or acoustic compressibility recovers velocity and pressure, while statistical concentration estimates how a local maximum can exceed the subsystem average. Boundary regions remain biased within roughly one-quarter wavelength.</p>',
    assumptions: ['Diffuse statistical mode ensemble with consistent spatial averaging.', 'Broadband or pure-tone concentration relation selected correctly.', 'Structural stress recovery uses thin isotropic bending and a representative bending wavenumber.'],
    example: 'Move a payload attachment from the subsystem interior to within a quarter wavelength of a boundary and compare broadband with pure-tone concentration.',
    compute(values) {
      const state = seaResponseRecoveryState({ ...materialValues(values), kind: values.kind, responseType: values.response_type, energy: values.energy, frequency: values.frequency, mass: values.mass, volume: values.volume, modalDensity: values.modal_density, lossFactor: values.loss_factor, dimension: Number(values.dimension), wavelength: values.wavelength, boundaryDistance: values.boundary_distance });
      const warnings = [];
      if (state.boundaryRegion) warnings.push('The response location is within one-quarter wavelength of a boundary; the interior spatial-average concentration relation may be biased.');
      if (state.participatingModes < 1) warnings.push('The effective participating-mode count is below one; use deterministic modal response rather than interpreting the statistical maximum literally.');
      const energies=Array.from({length:90},(_,index)=>Number(values.energy)/100*(10000**(index/89))),average=[],local=[];
      for(const energy of energies){const point=seaResponseRecoveryState({ ...materialValues(values), kind: values.kind, responseType: values.response_type, energy, frequency: values.frequency, mass: values.mass, volume: values.volume, modalDensity: values.modal_density, lossFactor: values.loss_factor, dimension: Number(values.dimension), wavelength: values.wavelength, boundaryDistance: values.boundary_distance });average.push(point.velocityRms);local.push(point.localVelocityEstimate);}
      return {
        values: [stat('Spatial-average velocity', state.velocityRms, 'm/s RMS'), stat('Spatial-average acceleration', state.accelerationRms, 'm/s² RMS'), stat('Acoustic pressure', state.pressureRms ?? 'Not applicable', state.pressureRms === null ? '' : 'Pa RMS'), stat('Sound pressure level', state.levelDb ?? 'Not applicable', state.levelDb === null ? '' : 'dB SPL'), stat('Bending stress screen', state.bendingStressRms ?? 'Not applicable', state.bendingStressRms === null ? '' : 'Pa RMS'), stat('Concentration amplitude factor', state.concentrationAmplitudeFactor), stat('Estimated local velocity maximum', state.localVelocityEstimate, 'm/s RMS-equivalent'), stat('Effective participating modes', state.participatingModes), stat('Boundary region', state.boundaryRegion ? 'Inside λ/4' : 'Interior screen')],
        interpretation: `The spatial-average velocity is ${state.velocityRms.toExponential(3)} m/s RMS, while the ${state.responseType} concentration model gives a ${state.concentrationAmplitudeFactor.toFixed(2)}× local-amplitude factor. ${state.boundaryRegion ? 'The selected point is also inside the boundary-bias region.' : 'The selected point passes the interior-distance screen.'}`,
        engineeringConsiderations: launchConsiderations('Translate SEA averages into payload equipment, bracket, panel, and cavity design quantities explicitly; qualification limits are often local while the analysis state variable is an ensemble/spatial average.'),
        warnings,
        plots:[{title:'Average and local velocity versus subsystem energy',xLabel:'Subsystem energy (J)',yLabel:'Velocity (m/s RMS)',xScale:'log',yScale:'log',traces:[trace('Spatial average',energies,average),trace('Estimated local maximum',energies,local,{emphasis:true})]}]
      };
    }
  },

  'radiation-efficiency-atlas': {
    category: 'Structural Acoustics',
    basis: 'Baffled, freely suspended, honeycomb, ribbed, shell, and forced radiation-efficiency relations',
    confidence: 'Analytical and heritage empirical screening models',
    inputs: [
      { key: 'model', label: 'Radiator model', type: 'select', default: 'baffled-panel', options: [{ value: 'baffled-panel', label: 'Homogeneous baffled panel' }, { value: 'free-panel', label: 'Freely suspended panel' }, { value: 'honeycomb', label: 'Honeycomb sandwich' }, { value: 'ribbed-panel', label: 'Ribbed panel' }, { value: 'cylindrical-shell', label: 'Cylindrical shell' }, { value: 'forced-field', label: 'Panel plus point-drive field' }] },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'loss_factor', label: 'Loss factor', type: 'number', default: 0.02, min: 1e-8 },
      { key: 'radius', label: 'Shell radius', unit: 'm', type: 'number', default: 1.8, min: 0.01 },
      { key: 'rib_length', label: 'Total rib length', unit: 'm', type: 'number', default: 8, min: 0 },
      { key: 'point_impedance', label: 'Point-drive impedance', unit: 'N·s/m', type: 'number', default: 5000, min: 0.001 },
      { key: 'reverberation_time', label: 'Structural reverberation time', unit: 's', type: 'number', default: 0.25, min: 0.001 },
      ...materialInputs
    ],
    theory: '<p>Radiation efficiency converts mean-square surface velocity into sound power, while radiation resistance and panel-air CLF place the same mechanism into mechanical and SEA energy language.</p>',
    assumptions: ['Uniform ideal panel or unstiffened cylinder.', 'Quiescent air and band-averaged radiation.', 'Ribbed, shell, and forced components are heritage screening models rather than full FE/BE radiation solutions.'],
    example: 'Compare a baffled homogeneous fairing bay with honeycomb, ribbed, shell, and local point-drive descriptions across ring and critical frequencies.',
    compute(values) {
      const state = radiationEfficiencyAtlasState({ ...materialValues(values), model: values.model, frequency: values.frequency, lossFactor: values.loss_factor, radius: values.radius, ribLength: values.rib_length, pointImpedance: values.point_impedance, reverberationTime: values.reverberation_time });
      return {
        values: [stat('Radiation efficiency', state.totalEfficiency), stat('Forced-field component', state.forcedEfficiency), stat('Radiation resistance', state.radiationResistance, 'N·s/m'), stat('Panel-to-air CLF', state.panelAirClf), stat('Critical frequency', state.criticalFrequency, 'Hz'), stat('Fundamental panel frequency', state.fundamentalFrequency, 'Hz'), stat('Shell ring frequency', state.model === 'cylindrical-shell' ? state.ringFrequency : 'Not applicable', state.model === 'cylindrical-shell' ? 'Hz' : ''), stat('Radiation regime', state.regime)],
        interpretation: `${state.model.replaceAll('-', ' ')} radiation gives σ=${state.totalEfficiency.toFixed(3)} and ηpanel→air=${state.panelAirClf.toExponential(3)} in the ${state.regime} regime. Motion, radiated power, and radiation loss are therefore three related but distinct quantities.`,
        engineeringConsiderations: launchConsiderations('Use shell behavior around ring frequency, honeycomb dispersion, ribs/frames, and localized drive fields when converting fairing or equipment-panel vibration into payload-cavity sound.'),
        warnings: ['Finite frames, cutouts, blankets, curvature, orthotropy, unbaffled edges, and coherent low-order modes can shift radiation by orders of magnitude; compare with measured or FE/BE radiation where the path controls design.'],
        plots: [{ title: 'Radiation-efficiency atlas', xLabel: 'Frequency (Hz)', yLabel: 'Radiation efficiency', xScale: 'log', yScale: 'log', traces: [trace(state.model, state.frequencies, state.curve, { emphasis: true })] }]
      };
    }
  },

  'installed-fairing-sea': {
    category: 'SEA & Energy',
    basis: 'Exterior–shell–payload-cavity SEA with resonant, nonresonant, blanket, leak, and equipment effects',
    confidence: 'Exact energy balance for a three-subsystem screening network with derived band parameters',
    inputs: [
      { key: 'frequency', label: 'Band center frequency', unit: 'Hz', type: 'number', default: 1000, min: 1 },
      { key: 'outside_level', label: 'Exterior acoustic level', unit: 'dB SPL', type: 'number', default: 145 },
      { key: 'area', label: 'Fairing radiating area', unit: 'm²', type: 'number', default: 55, min: 0.1 },
      { key: 'volume', label: 'Payload cavity volume', unit: 'm³', type: 'number', default: 75, min: 0.1 },
      { key: 'surface_mass', label: 'Fairing surface mass', unit: 'kg/m²', type: 'number', default: 8.5, min: 0.01 },
      { key: 'shell_modal_density', label: 'Shell modal density', unit: 'modes/Hz', type: 'number', default: 0.045, min: 1e-8 },
      { key: 'shell_loss', label: 'Shell loss factor', type: 'number', default: 0.018, min: 1e-8 },
      { key: 'radiation_efficiency', label: 'Shell radiation efficiency', type: 'number', default: 0.35, min: 1e-8 },
      { key: 'blanket_coverage', label: 'Blanket coverage', unit: '%', type: 'number', default: 80, min: 0, max: 100 },
      { key: 'blanket_il', label: 'Measured blanket insertion loss', unit: 'dB', type: 'number', default: 18, min: 0 },
      { key: 'blanket_absorption', label: 'Blanket absorption coefficient', type: 'number', default: 0.65, min: 0, max: 1 },
      { key: 'equipment_mass', label: 'Installed equipment mass', unit: 'kg', type: 'number', default: 250, min: 0 },
      { key: 'leak_fraction', label: 'Leak / opening area fraction', unit: '%', type: 'number', default: 0.05, min: 0, max: 20 }
    ],
    theory: '<p>Installed payload-cavity attenuation combines resonant shell–air coupling, nonresonant mass-law transmission, blanket coverage and absorption, leakage, equipment-loaded shell velocity, and cavity loss. Component TL and installed noise reduction are deliberately reported separately.</p>',
    assumptions: ['Diffuse exterior and interior acoustic subsystems.', 'One statistically homogeneous shell subsystem.', 'Blanket IL is a power-transmission reduction and coverage is spatially uniform.'],
    example: 'Increase blanket coverage until leakage becomes dominant, then add equipment mass and observe that shell velocity and installed NR change through different mechanisms.',
    compute(values) {
      const state = installedFairingSeaState({ frequency: values.frequency, outsideLevel: values.outside_level, area: values.area, interiorVolume: values.volume, surfaceMass: values.surface_mass, shellModalDensity: values.shell_modal_density, shellLossFactor: values.shell_loss, radiationEfficiency: values.radiation_efficiency, blanketCoverage: Number(values.blanket_coverage) / 100, blanketInsertionLoss: values.blanket_il, blanketAbsorption: values.blanket_absorption, equipmentMass: values.equipment_mass, leakAreaFraction: Number(values.leak_fraction) / 100 });
      const warnings = [];
      if (state.directPower > state.resonantPower) warnings.push('The nonresonant/leak path carries more net power than the resonant shell path; further shell damping or radiation improvement will have limited installed benefit.');
      if (state.network.subsystemResults.some(item => item.modesInBand < 5)) warnings.push('At least one subsystem has fewer than five modes in band; replace it with a deterministic or hybrid representation where local response matters.');
      return {
        values: [stat('Component mass-law TL', state.componentMassLawTl, 'dB'), stat('Installed noise reduction', state.installedNoiseReduction, 'dB'), stat('Payload-cavity level', state.receiverLevel, 'dB SPL'), stat('Equipment-loaded shell velocity', state.shellVelocity, 'm/s RMS'), stat('Resonant shell-path power', state.resonantPower, 'W'), stat('Direct / nonresonant power', state.directPower, 'W'), stat('Effective blanket/opening transmission', state.effectiveTransmission), stat('Interior acoustic loss factor', state.interiorLoss), stat('Network power-balance error', 100 * state.network.balanceError, '%', Math.abs(state.network.balanceError) > 1e-6 ? 'warn' : 'good')],
        interpretation: `The fairing has ${state.componentMassLawTl.toFixed(1)} dB component mass-law TL but only ${state.installedNoiseReduction.toFixed(1)} dB installed source-to-cavity reduction. The payload cavity reaches ${state.receiverLevel.toFixed(1)} dB SPL, with ${state.directPower > state.resonantPower ? 'the direct/nonresonant path' : 'the resonant shell path'} carrying the larger net power.`,
        engineeringConsiderations: launchConsiderations('Trade blanket coverage, measured IL, absorption, openings, shell loss, radiation, modal density, and installed equipment in one power-flow model; never apply coupon blanket IL or panel TL directly as payload-cavity attenuation.'),
        warnings,
        plots: [{ title: 'Fairing subsystem band energy', xLabel: 'Subsystem', yLabel: 'Energy (J)', yScale: 'log', traces: [trace('Band energy', [1, 2, 3], state.network.subsystemResults.map(item => item.energy), { emphasis: true })] }],
        tables: [
          { title: 'Subsystem solution', columns: ['Subsystem', 'Energy (J)', 'Velocity (m/s)', 'SPL (dB)', 'Dissipation (W)'], rows: state.network.subsystemResults.map(item => [item.name, item.energy, item.velocityRms, item.levelDb ?? '—', item.dissipatedPower]) },
          { title: 'Power paths', columns: ['Path', 'Gross forward (W)', 'Gross reverse (W)', 'Net (W)'], rows: state.network.powerFlows.map(flow => [`${flow.from} → ${flow.to}`, flow.grossForward, flow.grossReverse, flow.net]) }
        ]
      };
    }
  }
};

export const seaParameterCalculatorRegistry = createEngineeringRegistry(definitions);
