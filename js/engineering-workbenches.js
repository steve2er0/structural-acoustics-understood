import { calculatorRegistry as baseCalculatorRegistry } from './calculators.js';
import { extraCalculatorRegistry } from './extra-calculators.js';
import { acs519CalculatorRegistry } from './acs519-calculators.js';
import { workflowExpansionCalculatorRegistry } from './workflow-expansion-calculators.js';
import { programExpansionCalculatorRegistry } from './program-expansion-calculators.js';
import { seaParameterCalculatorRegistry } from './sea-parameters-calculators.js';
import { createEngineeringWorkbenchRegistry, resultValue, workbenchEsc, workbenchFmt } from './workbench-runtime.js';

const calculators = {
  ...baseCalculatorRegistry,
  ...extraCalculatorRegistry,
  ...acs519CalculatorRegistry,
  ...workflowExpansionCalculatorRegistry,
  ...programExpansionCalculatorRegistry,
  ...seaParameterCalculatorRegistry
};

const clamp = (value, low, high) => Math.max(low, Math.min(high, Number(value) || 0));
const numeric = (context, key, fallback = 0) => Number.isFinite(Number(context.inputs?.[key])) ? Number(context.inputs[key]) : fallback;
const valueText = (context, label, fallback = '—') => {
  const item = context.result?.values?.find(value => value.label === label);
  return item ? `${workbenchFmt(item.value)}${item.unit ? ` ${item.unit}` : ''}` : fallback;
};
const svg = (className, title, description, content, viewBox = '0 0 920 520') => `<svg class="workbench-domain-svg ${className}" viewBox="${viewBox}" role="img" aria-label="${workbenchEsc(title)}"><title>${workbenchEsc(title)}</title><desc>${workbenchEsc(description)}</desc>${content}</svg>`;
const arrow = (x1, y1, x2, y2, label = '') => `<g class="wb-flow"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#wb-arrow)"/>${label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 9}">${workbenchEsc(label)}</text>` : ''}</g>`;
const arrowDefs = '<defs><marker id="wb-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z"/></marker></defs>';

function windowDiagram(context) {
  const gap = numeric(context, 'gap', 40);
  const t1 = numeric(context, 'pane1_thickness', 6);
  const t2 = numeric(context, 'pane2_thickness', 6);
  const medium = context.inputs.medium ?? 'air';
  const pane1Velocity = valueText(context, 'Pane 1 velocity');
  const pane2Velocity = valueText(context, 'Pane 2 velocity');
  const reduction = valueText(context, 'Installed SEA level reduction');
  return svg('wb-window-svg', 'Double-window SEA cross-section and energy path', 'Source room, two panes, inter-pane medium, and receiving room connected by reciprocal energy-flow paths.', `${arrowDefs}
    <g class="wb-room source"><rect x="35" y="85" width="175" height="350"/><text x="122" y="120">SOURCE ROOM</text><path d="M75 210q35-55 70 0t70 0"/></g>
    <g class="wb-pane"><rect x="255" y="70" width="${16 + t1}" height="380"/><text x="265" y="470">Pane 1 · ${t1} mm</text><text x="265" y="495">${workbenchEsc(pane1Velocity)}</text></g>
    <g class="wb-gap"><rect x="${290 + t1}" y="70" width="230" height="380"/><text x="${405 + t1}" y="230">${workbenchEsc(String(medium).toUpperCase())}</text><text x="${405 + t1}" y="255">${workbenchEsc(workbenchFmt(gap))} mm gap</text><path d="M${325 + t1} 315h150M${345 + t1} 340h110M${365 + t1} 365h70"/></g>
    <g class="wb-pane"><rect x="${545 + t1}" y="70" width="${16 + t2}" height="380"/><text x="${550 + t1}" y="470">Pane 2 · ${t2} mm</text><text x="${550 + t1}" y="495">${workbenchEsc(pane2Velocity)}</text></g>
    <g class="wb-room receiver"><rect x="${620 + t1 + t2}" y="85" width="210" height="350"/><text x="${725 + t1 + t2}" y="120">RECEIVER</text><text x="${725 + t1 + t2}" y="250">${workbenchEsc(reduction)}</text><text x="${725 + t1 + t2}" y="275">installed reduction</text></g>
    ${arrow(180, 175, 250, 175, 'incident power')}${arrow(290 + t1, 175, 540 + t1, 175, 'reciprocal gap exchange')}${arrow(580 + t1 + t2, 175, 650 + t1 + t2, 175, 'transmitted power')}`);
}

function qualificationDiagram(context) {
  const notch = clamp(numeric(context, 'notch_center', numeric(context, 'frequency', 280)), 20, 2000);
  const notchX = 100 + Math.log10(notch / 20) / Math.log10(2000 / 20) * 700;
  const margin = numeric(context, 'margin', numeric(context, 'qualification_margin', 3));
  const force = valueText(context, 'Predicted interface force ASD', valueText(context, 'Unnotched response'));
  return svg('wb-qualification-svg', 'Qualification spectrum tailoring and constraint chain', 'Flight, unlimited qualification, and controlled spectra with a frequency-local notch and force or response constraint.', `${arrowDefs}
    <g class="wb-axis"><path d="M85 410V70M85 410H835"/><text x="460" y="485">FREQUENCY</text><text transform="translate(30 280) rotate(-90)">PSD / RESPONSE LEVEL</text></g>
    <path class="wb-curve secondary" d="M90 340C190 315 270 260 360 270S540 230 650 255S760 200 830 220"/>
    <path class="wb-curve primary" d="M90 290C190 265 270 210 360 220S540 180 650 205S760 150 830 170"/>
    <path class="wb-curve controlled" d="M90 290C190 265 270 210 360 220S${notchX - 45} 180 ${notchX} 330S${notchX + 55} 205 650 205S760 150 830 170"/>
    <line class="wb-cursor" x1="${notchX}" x2="${notchX}" y1="90" y2="410"/><text x="${notchX + 9}" y="110">${workbenchEsc(workbenchFmt(notch))} Hz notch</text>
    <g class="wb-legend"><text x="110" y="95">FLIGHT</text><text x="245" y="95">UNLIMITED +${workbenchEsc(workbenchFmt(margin))} dB</text><text x="445" y="95">CONTROLLED</text></g>
    <g class="wb-schematic"><rect x="120" y="430" width="150" height="42"/><text x="195" y="456">FLIGHT BASIS</text>${arrow(270, 451, 355, 451)}<rect x="365" y="430" width="165" height="42"/><text x="447" y="456">TEST ARTICLE</text>${arrow(530, 451, 615, 451)}<rect x="625" y="430" width="160" height="42"/><text x="705" y="448">LIMIT SCREEN</text><text x="705" y="464">${workbenchEsc(force)}</text></g>`);
}

function randomDiagram(context) {
  const duration = numeric(context, 'duration', numeric(context, 'duration_ms', 60));
  const q = numeric(context, 'q', numeric(context, 'Q', 10));
  const samples = Array.from({ length: 120 }, (_, index) => {
    const x = 60 + index * 4.9;
    const envelope = .45 + .55 * Math.exp(-(((index - 62) / 25) ** 2));
    const y = 130 + envelope * (30 * Math.sin(index * .62) + 17 * Math.sin(index * 1.77));
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return svg('wb-random-svg', 'Random vibration and shock analysis chain', 'A time record feeds preprocessing, PSD estimation, oscillator response, extreme response, and fatigue damage analyses.', `${arrowDefs}<path class="wb-waveform" d="${samples}"/><text x="60" y="70">TIME RECORD · ${workbenchEsc(workbenchFmt(duration))} ${context.step.toolId === 'srs' ? 'ms' : 's'}</text>
    <g class="wb-process"><rect x="60" y="220" width="145" height="74"/><text x="132" y="250">PREPROCESS</text><text x="132" y="270">window · detrend</text>${arrow(205, 257, 275, 257)}<rect x="285" y="220" width="145" height="74"/><text x="357" y="250">PSD / SRS</text><text x="357" y="270">closure check</text>${arrow(430, 257, 500, 257)}<rect x="510" y="220" width="145" height="74"/><text x="582" y="250">SDOF BANK</text><text x="582" y="270">Q = ${workbenchEsc(workbenchFmt(q))}</text>${arrow(655, 257, 725, 257)}<rect x="735" y="220" width="130" height="74"/><text x="800" y="248">EXTREME</text><text x="800" y="269">&amp; DAMAGE</text></g>
    <g class="wb-oscillators"><path d="M110 390h85m-65 0v-35m-20 0h40m-20 35v35"/><path d="M335 390h85m-65 0v-55m-20 0h40m-20 55v35"/><path d="M560 390h85m-65 0v-75m-20 0h40m-20 75v35"/><path d="M785 390h55m-40 0v-95m-15 0h30m-15 95v35"/><text x="475" y="480">OSCILLATOR FREQUENCY →</text></g>`);
}

function noiseDiagram(context) {
  const receiver = valueText(context, 'Receiver level', valueText(context, 'Total receiver level', valueText(context, 'Receiver room level')));
  const controlling = valueText(context, 'Controlling path', valueText(context, 'Controlling mechanism', valueText(context, 'Dominant path')));
  return svg('wb-noise-svg', 'Installed source-path-receiver network', 'Parallel airborne, structure-borne, duct, leakage, flanking, and treatment paths feed one receiver.', `${arrowDefs}<g class="wb-source"><circle cx="95" cy="255" r="58"/><path d="M65 255q30-50 60 0t60 0"/><text x="95" y="345">SOURCE</text></g>
    <g class="wb-paths"><rect x="255" y="60" width="240" height="70"/><text x="375" y="90">AIRBORNE / BARRIER</text><text x="375" y="111">diffraction · panel · leak</text><rect x="255" y="170" width="240" height="70"/><text x="375" y="200">DUCT NETWORK</text><text x="375" y="221">liner · elbows · regenerated</text><rect x="255" y="280" width="240" height="70"/><text x="375" y="310">STRUCTURE / FLANK</text><text x="375" y="331">mobility · isolation · bridges</text><rect x="255" y="390" width="240" height="70"/><text x="375" y="420">ENCLOSURE / OPENING</text><text x="375" y="441">TL · absorption · bypass</text></g>
    ${arrow(150, 225, 250, 95)}${arrow(155, 245, 250, 205)}${arrow(155, 270, 250, 315)}${arrow(145, 290, 250, 425)}
    <g class="wb-receiver"><rect x="690" y="150" width="185" height="210"/><circle cx="782" cy="235" r="28"/><path d="M782 263v55m-35-10h70"/><text x="782" y="185">RECEIVER</text><text x="782" y="345">${workbenchEsc(receiver)}</text></g>${arrow(495, 95, 690, 205)}${arrow(495, 205, 690, 235)}${arrow(495, 315, 690, 270)}${arrow(495, 425, 690, 305)}<text x="570" y="490">CONTROLLER · ${workbenchEsc(controlling)}</text>`);
}

function correlationDiagram(context) {
  const angle = numeric(context, 'shape_rotation', 18) * Math.PI / 180;
  const noise = clamp(numeric(context, 'spatial_noise', .08), 0, .8);
  const cells = Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, column) => {
    const value = clamp(Math.exp(-Math.abs(row - column) * (.55 + noise)) * (1 - .35 * Math.abs(Math.sin(angle + row * .3 - column * .2))), 0, 1);
    return `<rect x="${80 + column * 64}" y="${85 + row * 64}" width="58" height="58" style="--cell:${value}"/><text x="${109 + column * 64}" y="${119 + row * 64}">${value.toFixed(2)}</text>`;
  }).join('')).join('');
  return svg('wb-correlation-svg', 'Model-test correlation and evidence map', 'A multi-mode correlation matrix is paired with FRF comparison, path evidence, uncertainty, and validation readiness.', `${arrowDefs}<g class="wb-matrix"><text x="80" y="58">CORRELATION MATRIX</text>${cells}</g><g class="wb-frf"><path class="wb-axis" d="M470 405V85M470 405H860"/><path class="wb-curve primary" d="M480 380C560 370 600 340 625 150S670 350 850 370"/><path class="wb-curve secondary" d="M480 380C570 372 620 345 650 175S700 345 850 370"/><text x="655" y="58">MODEL / TEST FRF</text><line class="wb-cursor" x1="625" x2="625" y1="100" y2="405"/><line class="wb-cursor secondary" x1="650" x2="650" y1="100" y2="405"/></g><g class="wb-correlation-chain"><rect x="90" y="445" width="170" height="46"/><text x="175" y="473">PAIR MODES</text>${arrow(260, 468, 340, 468)}<rect x="350" y="445" width="170" height="46"/><text x="435" y="473">TRACE RESIDUAL</text>${arrow(520, 468, 600, 468)}<rect x="610" y="445" width="200" height="46"/><text x="710" y="473">VALIDATE UPDATE</text></g>`);
}

function methodDiagram(context) {
  const frequency = numeric(context, 'frequency', numeric(context, 'maximum_frequency', 800));
  const method = valueText(context, 'Recommended architecture', 'method screen');
  const cursor = clamp(120 + Math.log10(Math.max(frequency, 20) / 20) / Math.log10(10000 / 20) * 680, 120, 800);
  return svg('wb-method-svg', 'Frequency-dependent vibroacoustic method architecture', 'Deterministic, transition, hybrid, and statistical analysis regions derived from wavelength, mode count, overlap, and model size.', `${arrowDefs}<g class="wb-method-ladder"><rect class="deterministic" x="90" y="90" width="210" height="95"/><text x="195" y="125">DETERMINISTIC</text><text x="195" y="150">FE · modal · BE</text><rect class="transition" x="300" y="90" width="260" height="95"/><text x="430" y="125">TRANSITION</text><text x="430" y="150">hybrid · test informed</text><rect class="statistical" x="560" y="90" width="280" height="95"/><text x="700" y="125">STATISTICAL</text><text x="700" y="150">SEA · energy methods</text><line class="wb-cursor" x1="${cursor}" x2="${cursor}" y1="65" y2="415"/><text x="${Math.min(cursor + 8, 760)}" y="55">${workbenchEsc(workbenchFmt(frequency))} Hz</text></g>
    <g class="wb-method-scales"><path d="M100 260H830M100 325H830M100 390H830"/><path class="wb-curve primary" d="M100 390Q300 330 470 250T830 155"/><path class="wb-curve secondary" d="M100 340Q350 300 520 220T830 115"/><text x="105" y="245">MODAL POPULATION</text><text x="105" y="310">WAVELENGTH / MESH</text><text x="105" y="375">OVERLAP / UNCERTAINTY</text></g><g class="wb-method-decision"><rect x="275" y="435" width="370" height="55"/><text x="460" y="458">RECOMMENDED ARCHITECTURE</text><text x="460" y="480">${workbenchEsc(method)}</text></g>`);
}

function launchDiagram(context) {
  const axial = numeric(context, 'observer_axial', 0);
  const radial = numeric(context, 'radial_distance', 120);
  const level = valueText(context, 'Selected band level', valueText(context, 'Equivalent injected power'));
  return svg('wb-launch-svg', 'Distributed launch excitation and accepted power', 'A distributed plume or boundary-layer source creates a spatial field that is filtered by structural acceptance before entering the vehicle model.', `${arrowDefs}<g class="wb-rocket"><path d="M690 105Q755 165 755 300V410H625V300Q625 165 690 105Z"/><path d="M625 345H755M625 390H755"/><text x="690" y="75">VEHICLE</text></g><g class="wb-plume"><path d="M150 420Q310 250 590 355Q350 380 185 490Z"/><path d="M170 435Q325 315 565 360"/><path d="M190 460Q335 350 530 370"/><text x="290" y="495">DISTRIBUTED PLUME SOURCE</text></g><g class="wb-rays"><path d="M250 390Q465 210 635 230"/><path d="M300 420Q500 310 625 325"/><path d="M370 430Q535 390 625 410"/></g><circle class="wb-observer" cx="${clamp(690 + axial / 3, 600, 820)}" cy="${clamp(250 - radial / 3, 120, 350)}" r="10"/><text x="760" y="130">${workbenchEsc(level)}</text><text x="760" y="152">selected response</text><g class="wb-launch-chain"><rect x="85" y="75" width="160" height="55"/><text x="165" y="107">SOURCE POWER</text>${arrow(245, 102, 335, 102)}<rect x="345" y="75" width="170" height="55"/><text x="430" y="98">SPATIAL FIELD</text><text x="430" y="118">correlation · phase</text>${arrow(515, 102, 590, 102)}<rect x="600" y="75" width="180" height="55"/><text x="690" y="98">ACCEPTED POWER</text><text x="690" y="118">export to SEA</text></g>`);
}

function tankDiagram(context) {
  const fill = clamp(numeric(context, 'fill', 72), 0, 100);
  const liquidTop = 440 - fill * 3.15;
  const coupling = valueText(context, 'Coupling screen');
  return svg('wb-tank-svg', 'Wet-tank hydroacoustic mode atlas', 'A selectable liquid fill level controls shell added mass, gravity slosh, and liquid acoustic mode families.', `<defs><clipPath id="wb-tank-clip"><path d="M260 90Q455 20 650 90V420Q455 490 260 420Z"/></clipPath></defs><g class="wb-tank"><path d="M260 90Q455 20 650 90V420Q455 490 260 420Z"/><rect class="wb-liquid" x="245" y="${liquidTop}" width="425" height="${470 - liquidTop}" clip-path="url(#wb-tank-clip)"/><path class="wb-slosh" d="M270 ${liquidTop + 8}Q365 ${liquidTop - 16} 455 ${liquidTop + 8}T640 ${liquidTop + 8}"/><path class="wb-shell-mode" d="M275 120Q235 160 275 200T275 280T275 360"/><path class="wb-shell-mode" d="M635 120Q675 160 635 200T635 280T635 360"/><path class="wb-acoustic-mode" d="M325 140V410M390 110V440M455 95V455M520 110V440M585 140V410"/></g><text x="455" y="265">${workbenchEsc(workbenchFmt(fill))}% FILL</text><g class="wb-tank-legend"><text x="80" y="120">SHELL MODE</text><path class="wb-shell-mode" d="M80 145h110"/><text x="80" y="220">GRAVITY SLOSH</text><path class="wb-slosh" d="M80 245q55-25 110 0"/><text x="80" y="320">LIQUID ACOUSTIC</text><path class="wb-acoustic-mode" d="M80 345h110"/></g><g class="wb-tank-status"><rect x="700" y="160" width="165" height="150"/><text x="782" y="195">COUPLING SCREEN</text><text x="782" y="235">${workbenchEsc(coupling)}</text><text x="782" y="275">reduced-order</text></g>`);
}

function missionDiagram(context) {
  const scales = [numeric(context, 'acoustic_scale', 1), numeric(context, 'buffet_scale', 1), numeric(context, 'shock_scale', 1), numeric(context, 'thermal_scale', 1)];
  const labels = ['LIFTOFF', 'MAX-Q', 'SEPARATION', 'THERMAL / PRELOAD'];
  const colors = ['source', 'transition', 'hybrid', 'secondary'];
  const events = labels.map((label, index) => `<g class="wb-mission-event ${colors[index]}"><rect x="${90 + index * 195}" y="90" width="165" height="95" style="--severity:${clamp(scales[index] / 2, .1, 1)}"/><text x="${172 + index * 195}" y="125">${label}</text><text x="${172 + index * 195}" y="153">scale ${workbenchEsc(workbenchFmt(scales[index]))}</text></g>`).join('');
  const rows = ['Fairing shell', 'Payload', 'Avionics', 'Tank / feed'].map((label, row) => `<text x="80" y="${250 + row * 60}">${label}</text>${labels.map((_, column) => `<rect class="wb-mission-cell" x="${270 + column * 145}" y="${220 + row * 60}" width="130" height="42" style="--cell:${clamp((scales[column] * (1 + ((row + column) % 3) * .22)) / 2.4, .08, 1)}"/>`).join('')}`).join('');
  return svg('wb-mission-svg', 'Mission environment and credibility matrix', 'Mission events are crossed with vehicle subsystems to identify controlling environments, evidence gaps, and analysis ownership.', `<g class="wb-mission-events">${events}</g><path class="wb-timeline" d="M95 205H840"/>${rows}<g class="wb-mission-columns">${labels.map((label, index) => `<text x="${335 + index * 145}" y="205">${label}</text>`).join('')}</g><text x="475" y="490">EVENT × SUBSYSTEM CONTROL MAP</text>`);
}

function waveDiagram(context) {
  const frequency = numeric(context, 'frequency', 650);
  const cursor = clamp(100 + Math.log10(Math.max(frequency, 20) / 20) / Math.log10(10000 / 20) * 730, 100, 830);
  const regime = valueText(context, 'Selected regime', valueText(context, 'Recommended architecture'));
  return svg('wb-wave-svg', 'Frequency-wavenumber and radiation canvas', 'Acoustic, convective, flexural, shell, and forced-field wave branches expose coincidence, matching, and radiation regimes.', `<g class="wb-axis"><path d="M85 430V70M85 430H850"/><text x="455" y="495">FREQUENCY</text><text transform="translate(28 285) rotate(-90)">WAVENUMBER</text></g><path class="wb-curve acoustic" d="M95 400L840 100"/><path class="wb-curve convection" d="M95 420L840 205"/><path class="wb-curve bending" d="M95 390Q300 365 475 285T840 80"/><path class="wb-curve shell" d="M95 350Q290 250 430 270T840 150"/><line class="wb-cursor" x1="${cursor}" x2="${cursor}" y1="70" y2="430"/><circle class="wb-match" cx="${cursor}" cy="${clamp(390 - (cursor - 95) * .3, 90, 390)}" r="9"/><g class="wb-wave-legend"><text x="125" y="95">ACOUSTIC</text><text x="265" y="95">CONVECTIVE</text><text x="425" y="95">BENDING</text><text x="555" y="95">SHELL / BUILT-UP</text></g><g class="wb-wave-status"><rect x="610" y="365" width="225" height="52"/><text x="722" y="387">${workbenchEsc(workbenchFmt(frequency))} Hz</text><text x="722" y="406">${workbenchEsc(regime)}</text></g>`);
}

const step = (id, title, toolId, instruction, fieldKeys = null, visualTitle = '') => ({ id, title, toolId, instruction, fieldKeys, visualTitle });
const link = (toolId, key) => ({ toolId, key });

export const engineeringWorkbenchDefinitions = [
  {
    id: 'double-panel-sea', title: 'Double-Window SEA Designer', category: 'SEA & Energy', eyebrow: 'Transmission · Guided reciprocal-energy workflow', projectName: 'Double-window transmission study', summary: 'Build the window cross-section, choose the gap medium, review modal scales, solve reciprocal energy flow, and inspect installed transmission loss.', visualLabel: 'Window hardware atlas', visualTitle: 'Cross-section and reciprocal energy path', visualLegend: 'pane velocity · gap energy · installed TL', defaultTakeaway: 'Treat component mass law, resonant exchange, leakage, and flanking as separate installed paths.', renderDiagram: windowDiagram,
    steps: [
      step('spaces', 'Define spaces', 'double-panel-sea', 'Establish source and receiver volumes, loss, and input power.', ['source_power', 'source_volume', 'receiver_volume', 'room_loss']),
      step('geometry', 'Build cross-section', 'double-panel-sea', 'Set pane dimensions, thicknesses, and the installed gap.', ['pane_length', 'pane_width', 'pane1_thickness', 'pane2_thickness', 'gap']),
      step('medium', 'Choose gap medium', 'double-panel-sea', 'Change the inter-pane medium and review impedance, resonance, and cross-gap modes.', ['medium', 'gap', 'cavity_loss']),
      step('materials', 'Set pane properties', 'double-panel-sea', 'Define pane density, stiffness, and internal loss.', ['pane_density', 'pane_modulus', 'panel_loss']),
      step('couplings', 'Define paths', 'double-panel-sea', 'Set resonant pane-room, pane-gap, nonresonant, blanket, and bypass paths.', ['pane_room_coupling', 'pane_gap_air_coupling', 'nonresonant_path', 'blanket_coverage', 'blanket_il', 'bypass']),
      step('solve', 'Solve energy flow', 'double-panel-sea', 'Inspect subsystem energy, gross exchange, net flow, and power closure.'),
      step('transmission', 'Recover TL & velocity', 'double-panel-sea', 'Interpret installed TL, pane velocity, cavity scales, and controlling paths.', ['frequency'])
    ]
  },
  {
    id: 'qualification-test-planner', title: 'Qualification Test Design Center', category: 'Test & Signal', eyebrow: 'Qualification · Flight-to-test workflow', projectName: 'Launch-vehicle qualification campaign', summary: 'Carry a flight environment through margins, duration equivalence, force and response limiting, MIMO control, uncertainty, and a traceable test audit.', visualLabel: 'Test-control atlas', visualTitle: 'Flight, unlimited test, and controlled environment', visualLegend: 'constraint-local notch · retained margin', defaultTakeaway: 'A test is equivalent only when response, force, duration, damage, and control-field assumptions all remain consistent.', renderDiagram: qualificationDiagram,
    steps: [
      step('flight', 'Define flight basis', 'qualification-test-planner', 'Enter the flight vibration and acoustic environments and their durations.', ['flight_psd', 'flight_duration', 'flight_oaspl']),
      step('margins', 'Flow down margins', 'requirements-flowdown', 'Apply statistical and qualification margins without losing the flight reference.', ['flight_psd', 'statistical_margin', 'qualification_margin']),
      step('duration', 'Match duration & damage', 'qualification-test-planner', 'Set test duration and fatigue exponent for damage-equivalent scaling.', ['flight_duration', 'test_duration', 'fatigue_exponent', 'margin']),
      step('limits', 'Apply force & response limits', 'qualification-test-planner', 'Define apparent mass, force ASD, response gain, bandwidth, and response limit.', ['article_mass', 'apparent_fraction', 'force_limit', 'response_gain', 'response_bandwidth', 'response_limit']),
      step('notch', 'Shape the notch', 'qualification-test-planner', 'Place the screening notch and inspect which constraint controls it.', ['notch_center', 'notch_width']),
      step('mimo', 'Check MIMO control', 'mimo-test-control', 'Inspect cross-axis coherence, fixture dynamics, and control-matrix conditioning.'),
      step('acoustic', 'Set acoustic field', 'qualification-test-planner', 'Define acoustic method, target, microphones, and allowed field spread.', ['flight_oaspl', 'acoustic_margin', 'mic_min', 'mic_max', 'allowed_spread', 'method']),
      step('uncertainty', 'Bracket uncertainty', 'uncertainty-sensitivity', 'Propagate frequency, damping, and environment uncertainty into response.'),
      step('audit', 'Review qualification audit', 'requirements-flowdown', 'Confirm retained margins, response limiting, and damage equivalence before test authorization.')
    ],
    syncGroups: [[link('qualification-test-planner', 'flight_psd'), link('requirements-flowdown', 'flight_psd')], [link('qualification-test-planner', 'flight_duration'), link('requirements-flowdown', 'flight_duration')], [link('qualification-test-planner', 'test_duration'), link('requirements-flowdown', 'test_duration')], [link('qualification-test-planner', 'fatigue_exponent'), link('requirements-flowdown', 'fatigue_exponent')], [link('qualification-test-planner', 'response_limit'), link('requirements-flowdown', 'response_limit')]]
  },
  {
    id: 'time-psd', title: 'Random Vibration & Shock Studio', category: 'Random & Shock', eyebrow: 'Signal-to-response · Persistent analysis studio', projectName: 'Random vibration and shock analysis', summary: 'Import one record, verify preprocessing and PSD closure, sweep oscillator response, estimate extremes and fatigue, and compare shock response in one project.', visualLabel: 'Signal analysis chain', visualTitle: 'Record, spectrum, response bank, and damage', visualLegend: 'one source record · linked response models', defaultTakeaway: 'Preserve the sampling, preprocessing, duration, and statistical basis when moving from a record to response or damage.', renderDiagram: randomDiagram,
    steps: [
      step('record', 'Import or generate record', 'time-psd', 'Load the source record or generate a controlled teaching signal.', ['series', 'sample_rate', 'duration']),
      step('preprocess', 'Set preprocessing', 'time-psd', 'Choose segment length, overlap, window, and detrending.', ['segment_length', 'overlap', 'window', 'detrend']),
      step('stationarity', 'Inspect nonstationarity', 'nonstationary-environment', 'Compare event-local response, peaks, kurtosis, and accumulated fatigue.'),
      step('vrs', 'Sweep random response', 'vrs', 'Run an SDOF bank through the input PSD and inspect RMS response.', ['psd_points', 'Q', 'response_min', 'response_max', 'points']),
      step('extremes', 'Estimate extreme response', 'extreme-response', 'Apply duration and bandwidth-sensitive peak factors.', ['psd', 'q', 'duration', 'tail_probability', 'points']),
      step('fatigue', 'Calculate fatigue damage', 'fds', 'Evaluate relative fatigue damage across oscillator frequency.', ['psd', 'q', 'duration', 'b', 'points']),
      step('shock', 'Evaluate shock response', 'srs', 'Generate a classical pulse and compute positive, negative, and maximax SRS.'),
      step('pyroshock', 'Screen pyroshock', 'pyroshock', 'Compare decaying high-frequency response with pseudo-velocity guidance.'),
      step('review', 'Compare controlling metrics', 'nonstationary-environment', 'Identify whether stationary RMS, local peaks, shock, or fatigue controls the decision.')
    ],
    syncGroups: [[link('vrs', 'Q'), link('extreme-response', 'q'), link('fds', 'q'), link('nonstationary-environment', 'q'), link('srs', 'Q'), link('pyroshock', 'q')], [link('time-psd', 'duration'), link('extreme-response', 'duration'), link('fds', 'duration'), link('nonstationary-environment', 'duration')]]
  },
  {
    id: 'noise-control-path', title: 'Installed Noise-Control System Designer', category: 'Noise Control', eyebrow: 'Source–path–receiver · Installed-system workflow', projectName: 'Installed noise-control concept', summary: 'Assemble airborne, duct, structure-borne, leakage, flanking, enclosure, and propagation paths, then identify the installed weakest link and treatment trade.', visualLabel: 'Noise path network', visualTitle: 'Source, treatment, bypass, and receiver contributions', visualLegend: 'path contribution · controlling mechanism', defaultTakeaway: 'Installed performance is limited by the strongest surviving parallel path, not the best component rating.', renderDiagram: noiseDiagram,
    steps: [
      step('paths', 'Rank baseline paths', 'noise-control-path', 'Enter parallel path levels and reductions to expose diminishing returns.'),
      step('duct', 'Build fan & duct ledger', 'fan-duct-network', 'Track source power, branching, attenuation, and regenerated flow noise.'),
      step('enclosure', 'Design enclosure', 'enclosure-design', 'Trade panels, openings, absorption, flanking, and receiver distance.'),
      step('barrier', 'Check barrier & bypass', 'barrier-diffraction', 'Combine top diffraction, finite ends, panel transmission, and leakage.'),
      step('treatment', 'Select acoustic treatment', 'acoustic-treatment', 'Set blanket or liner absorption, coverage, backing, and mass.'),
      step('propagation', 'Propagate outdoors', 'outdoor-propagation', 'Apply spreading, atmosphere, ground, meteorology, and directivity.'),
      step('installed', 'Review installed benefit', 'enclosure-design', 'Confirm receiver level, additional TL needed, and the controlling path.')
    ]
  },
  {
    id: 'model-test-correlation', title: 'Model–Test Correlation & Validation Lab', category: 'Test & Signal', eyebrow: 'Verification & validation · Evidence workflow', projectName: 'Model-test validation study', summary: 'Pair analytical and measured dynamics, inspect correlation and residuals, rank transfer paths, bracket uncertainty, and record decision credibility.', visualLabel: 'Correlation evidence atlas', visualTitle: 'Mode pairing, FRF agreement, and validation chain', visualLegend: 'matrix agreement · residual traceability', defaultTakeaway: 'A numerical match is only useful when coordinate mapping, mode identity, residual physics, and update provenance remain defensible.', renderDiagram: correlationDiagram,
    steps: [
      step('plan', 'Plan the measurement', 'modal-test-planner', 'Set modal participation, grid density, resolution, and sensor loading.'),
      step('pair', 'Pair model & test modes', 'model-test-correlation', 'Compare frequency, damping, MAC, and FRAC for the selected mode pair.'),
      step('residual', 'Inspect residual behavior', 'model-test-correlation', 'Use FRF mismatch and mode identity before proposing an update.'),
      step('paths', 'Trace transfer paths', 'transfer-path-analysis', 'Rank blocked-force and transfer-mobility contributors with phase and coherence.'),
      step('sources', 'Check source identification', 'source-identification-array', 'Review array aperture, aliasing, source separation, and noise limits.'),
      step('uncertainty', 'Bracket uncertainty', 'uncertainty-sensitivity', 'Separate model bias from expected input and parameter variability.'),
      step('credibility', 'Record credibility', 'credibility-scorecard', 'Score verification, validation, inputs, uncertainty, configuration, and review evidence.')
    ]
  },
  {
    id: 'hybrid-method-selection', title: 'Vibroacoustic Method Architecture Planner', category: 'Structural Acoustics', eyebrow: 'Analysis planning · Frequency-dependent method ladder', projectName: 'Vibroacoustic analysis architecture', summary: 'Use geometry, wave scales, modal population, overlap, FE/BE resolution, and uncertainty to assign the right method by frequency.', visualLabel: 'Method architecture atlas', visualTitle: 'Deterministic, transition, hybrid, and statistical regions', visualLegend: 'wavelength · population · model size', defaultTakeaway: 'Choose methods by wave physics and statistical population, not by a single global frequency cutoff.', renderDiagram: methodDiagram,
    steps: [
      step('geometry', 'Define geometry & material', 'hybrid-method-selection', 'Set the representative panel and cavity geometry, material, and damping.', ['panel_length', 'panel_width', 'thickness', 'modulus', 'density', 'loss_factor', 'cavity_volume']),
      step('waves', 'Inspect wave matching', 'wave-matching-atlas', 'Compare acoustic, convective, bending, and shell-relevant wavenumbers.'),
      step('population', 'Check modal population', 'modal-density-atlas', 'Calculate structural and acoustic modes per band and overlap.'),
      step('validity', 'Screen SEA validity', 'sea-validity-confidence', 'Review modes per band, weak coupling, sampling, and variability.'),
      step('method', 'Select method ladder', 'hybrid-method-selection', 'Assign deterministic, hybrid, or statistical treatment at the decision frequency.'),
      step('mesh', 'Plan FE–BE resolution', 'fe-be-planner', 'Estimate structural and acoustic element size, model scale, and BEM risk.'),
      step('validation', 'Plan convergence evidence', 'fe-be-planner', 'Define frequency, mesh, coupling, and solver convergence checks before production use.')
    ],
    syncGroups: [[link('hybrid-method-selection', 'frequency'), link('wave-matching-atlas', 'frequency'), link('modal-density-atlas', 'frequency'), link('sea-validity-confidence', 'frequency')], [link('hybrid-method-selection', 'panel_length'), link('modal-density-atlas', 'length')], [link('hybrid-method-selection', 'panel_width'), link('modal-density-atlas', 'width')], [link('hybrid-method-selection', 'thickness'), link('wave-matching-atlas', 'thickness'), link('modal-density-atlas', 'thickness'), link('fe-be-planner', 'thickness')], [link('hybrid-method-selection', 'modulus'), link('wave-matching-atlas', 'modulus'), link('modal-density-atlas', 'modulus'), link('fe-be-planner', 'modulus')], [link('hybrid-method-selection', 'density'), link('wave-matching-atlas', 'density'), link('modal-density-atlas', 'density'), link('fe-be-planner', 'density')], [link('hybrid-method-selection', 'loss_factor'), link('modal-density-atlas', 'loss_factor')]]
  },
  {
    id: 'launch-acoustic-source', title: 'Launch Excitation Definition Workbench', category: 'Aero / Distributed Loads', eyebrow: 'Flight forcing · Environment-to-SEA workflow', projectName: 'Launch excitation definition', summary: 'Define plume, diffuse, TBL, or equipment forcing, resolve spatial coherence and acceptance, convert the field into band power, and hand the source to SEA.', visualLabel: 'Launch excitation atlas', visualTitle: 'Distributed source, spatial field, and accepted power', visualLegend: 'source geometry · acceptance · SEA watts', defaultTakeaway: 'SEA input power must represent the portion of the forcing field accepted by the structure, not pressure level alone.', renderDiagram: launchDiagram,
    steps: [
      step('plume', 'Define plume source', 'launch-acoustic-source', 'Set thrust, exhaust, efficiency, source length, spectrum, and suppression.'),
      step('observer', 'Place vehicle receiver', 'launch-acoustic-source', 'Set radial and axial position, directivity, pad gain, and atmospheric loss.', ['radial_distance', 'observer_axial', 'directivity', 'reflection', 'suppression', 'atmosphere']),
      step('correlation', 'Build spatial field', 'spatial-correlation', 'Resolve coherence decay, convective phase, and array or panel spacing.'),
      step('patterns', 'Resolve spatial patterns', 'fsp-generator', 'Decompose the cross-spectral field and review truncation energy.'),
      step('convection', 'Set convection model', 'tbl-convection-model', 'Compare fixed and boundary-layer-based convection velocity.'),
      step('acceptance', 'Calculate accepted power', 'equivalent-power-injection', 'Convert diffuse, TBL, Corcos, or point-force excitation into band power.'),
      step('fairing', 'Screen installed fairing', 'installed-fairing-sea', 'Check resonant, direct, leakage, blanket, and equipment-loaded paths.'),
      step('handoff', 'Review SEA handoff', 'equivalent-power-injection', 'Confirm frequency basis, accepted power, uncertainty, and source provenance before SEA import.')
    ],
    syncGroups: [[link('launch-acoustic-source', 'frequency'), link('spatial-correlation', 'frequency'), link('fsp-generator', 'frequency'), link('tbl-convection-model', 'frequency'), link('equivalent-power-injection', 'frequency'), link('installed-fairing-sea', 'frequency')], [link('spatial-correlation', 'Uc'), link('fsp-generator', 'convection'), link('equivalent-power-injection', 'convection_velocity')], [link('spatial-correlation', 'alpha_x'), link('equivalent-power-injection', 'alpha_x')], [link('spatial-correlation', 'alpha_y'), link('equivalent-power-injection', 'alpha_z')]]
  },
  {
    id: 'wet-tank-dynamics', title: 'Wet-Tank Hydroacoustic Atlas', category: 'Structures', eyebrow: 'Propellant tanks · Coupled mode-family atlas', projectName: 'Wet-tank reduced-order study', summary: 'Sweep fill level, shell orders, added mass, slosh, and liquid acoustics while keeping the reduced-order assumptions visible.', visualLabel: 'Tank hardware atlas', visualTitle: 'Shell, slosh, and liquid acoustic families', visualLegend: 'fill level · mode proximity · coupling screen', defaultTakeaway: 'Frequency proximity is a coupling screen; domes, baffles, ullage, feedlines, and full fluid-structure interaction require higher-fidelity treatment.', renderDiagram: tankDiagram,
    steps: [
      step('geometry', 'Define tank geometry', 'wet-tank-dynamics', 'Set radius, barrel length, shell thickness, stiffness, and density.', ['radius', 'length', 'thickness', 'modulus', 'shell_density']),
      step('fluid', 'Define propellant state', 'wet-tank-dynamics', 'Set liquid density, sound speed, fill fraction, and effective acceleration.', ['liquid_density', 'liquid_speed', 'fill', 'acceleration']),
      step('shell', 'Select shell family', 'wet-tank-dynamics', 'Choose axial and circumferential shell orders.', ['axial_order', 'circ_order']),
      step('added-mass', 'Compare dry and wet modes', 'wet-tank-dynamics', 'Inspect modal added mass and the wet frequency shift.'),
      step('slosh', 'Inspect gravity slosh', 'wet-tank-dynamics', 'Compare gravity-wave scales with shell response across fill.'),
      step('acoustics', 'Inspect liquid acoustics', 'wet-tank-dynamics', 'Compare liquid acoustic modes with the wet shell family.'),
      step('coupling', 'Review coupling screen', 'wet-tank-dynamics', 'Identify proximity and state the reduced-order validity boundary.')
    ]
  },
  {
    id: 'mission-environment-timeline', title: 'Mission Environment & Credibility Center', category: 'Test & Signal', eyebrow: 'Program integration · Event-by-subsystem control map', projectName: 'Mission environment evidence record', summary: 'Map mission events to controlling subsystems, flow requirements and margins, propagate uncertainty, and expose credibility evidence gaps.', visualLabel: 'Mission control atlas', visualTitle: 'Event, subsystem, margin, and evidence matrix', visualLegend: 'severity · controller · evidence maturity', defaultTakeaway: 'The controlling environment changes by subsystem and metric; one global worst-case event is rarely a defensible program basis.', renderDiagram: missionDiagram,
    steps: [
      step('events', 'Scale mission events', 'mission-environment-timeline', 'Set liftoff acoustic, Max-Q buffet, separation shock, and thermal/preload severity.'),
      step('controllers', 'Map subsystem controllers', 'mission-environment-timeline', 'Identify the event controlling fairing, payload, avionics, tank, and feed systems.'),
      step('requirements', 'Flow requirements down', 'requirements-flowdown', 'Carry flight levels through statistical margin, qualification margin, and response limiting.'),
      step('stress', 'Check stress margin', 'dynamic-stress-environment', 'Connect modal displacement, preload, temperature, fatigue, and strength.'),
      step('uncertainty', 'Propagate uncertainty', 'uncertainty-sensitivity', 'Quantify response percentiles and sensitivity shares.'),
      step('credibility', 'Score evidence maturity', 'credibility-scorecard', 'Record verification, validation, input provenance, configuration, uncertainty, and review.'),
      step('actions', 'Review open actions', 'credibility-scorecard', 'Prioritize the lowest evidence areas before using the model for a consequential decision.')
    ]
  },
  {
    id: 'wave-matching-atlas', title: 'Wave Matching & Radiation Canvas', category: 'Waves & Structures', eyebrow: 'Dispersion · Coincidence · Radiation', projectName: 'Wave and radiation regime study', summary: 'Synchronize frequency–wavenumber matching, modal population, shell and sandwich behavior, radiation efficiency, and driven sound power.', visualLabel: 'Frequency–wavenumber canvas', visualTitle: 'Wave branches, matching, and radiation regime', visualLegend: 'select frequency · inspect physical branch', defaultTakeaway: 'Coincidence, convection matching, shell curvature, and modal radiation are related but distinct mechanisms.', renderDiagram: waveDiagram,
    steps: [
      step('matching', 'Map wave branches', 'wave-matching-atlas', 'Compare acoustic, convective, bending, extensional, and shear scales.'),
      step('plate', 'Inspect plate radiation', 'modal-radiation', 'Resolve modal parity, cancellation, directivity, and coincidence.'),
      step('shell', 'Inspect shell families', 'shell-acoustics', 'Compare circumferential modes, ring scale, local bending, and acoustic cut-on.'),
      step('sandwich', 'Inspect sandwich dispersion', 'honeycomb-wave', 'Review shear-corrected dispersion, coincidence, modal density, and conductance.'),
      step('efficiency', 'Compare radiation models', 'radiation-efficiency-atlas', 'Compare baffled, free, ribbed, honeycomb, shell, and forced-field efficiency.'),
      step('forcing', 'Apply driven forcing', 'driven-radiation', 'Convert point force through mobility, response, overlap, and radiation efficiency.'),
      step('validity', 'Review theory validity', 'wave-matching-atlas', 'Check thin-structure, finite-boundary, curvature, orthotropy, and forcing assumptions.')
    ],
    syncGroups: [[link('wave-matching-atlas', 'frequency'), link('modal-radiation', 'frequency'), link('shell-acoustics', 'frequency'), link('honeycomb-wave', 'frequency'), link('radiation-efficiency-atlas', 'frequency'), link('driven-radiation', 'frequency')]]
  }
];

export const engineeringWorkbenchRegistry = createEngineeringWorkbenchRegistry(engineeringWorkbenchDefinitions, calculators);
export const engineeringWorkbenchIds = Object.freeze(engineeringWorkbenchDefinitions.map(definition => definition.id));
