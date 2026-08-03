/* Interactive program-level labs sharing the calculator physics exactly. */
import {
  nonstationaryEnvironmentState, mimoTestState, acousticTreatmentState, sourceIdentificationState,
  hybridMethodState, vibroacousticFatigueState, missionTimelineState, credibilityState, capstoneState,
  noiseControlPathState, psychoacousticState, noiseMetricsState, acousticMeasurementState,
  canonicalSourceState, sourceGeometryState, fanDuctState, outdoorPropagationState,
  barrierDiffractionState, roomFieldState, enclosureDesignState, absorberResonatorState,
  tunedAbsorberIsolationState
} from './program-expansion-physics.js';

const C = Object.freeze({ ink: '#172027', teal: '#1e6077', dark: '#164453', rust: '#b96d37', muted: '#657176', grid: '#ada497', paper: '#faf8f2', wash: '#e7e2d8', pale: '#dce9ec', green: '#376e56' });
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fmt = (value, digits = 2) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '') : '—';

function control({ key, label, min, max, step, value, unit = '' }) {
  return `<div class="demo-control"><label for="pg-${key}">${esc(label)} <output id="pg-out-${key}">${esc(value)}${esc(unit)}</output></label><input id="pg-${key}" name="${esc(key)}" data-acs-key="${esc(key)}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
}

function shell(root, controls, caption, draw) {
  root.innerHTML = `<div class="demo-controls">${controls.map(control).join('')}</div><div class="demo-canvas-wrap"><svg data-program-svg viewBox="0 0 1000 440" role="img" aria-label="Interactive launch-vehicle program engineering visualization"></svg></div><div class="demo-caption">${caption}</div>`;
  const inputs = Object.fromEntries([...root.querySelectorAll('[data-acs-key]')].map(element => [element.dataset.acsKey, element]));
  const render = () => {
    const values = Object.fromEntries(Object.entries(inputs).map(([key, element]) => [key, Number(element.value)]));
    controls.forEach(item => { root.querySelector(`#pg-out-${item.key}`).textContent = `${fmt(values[item.key], item.step < 0.01 ? 3 : item.step < 1 ? 2 : 0)}${item.unit ?? ''}`; });
    draw(root.querySelector('[data-program-svg]'), values);
  };
  Object.values(inputs).forEach(input => input.addEventListener('input', render));
  render();
  return () => {};
}

function chartPath(xs, ys, box, logX = false, logY = false) {
  const tx = value => logX ? Math.log10(Math.max(value, 1e-30)) : value;
  const ty = value => logY ? Math.log10(Math.max(value, 1e-30)) : value;
  const xx = xs.map(tx), yy = ys.map(ty), xmin = Math.min(...xx), xmax = Math.max(...xx), ymin = Math.min(...yy), ymax = Math.max(...yy);
  return xx.map((value, index) => {
    const x = box.x + (value - xmin) / Math.max(xmax - xmin, 1e-30) * box.w;
    const y = box.y + box.h - (yy[index] - ymin) / Math.max(ymax - ymin, 1e-30) * box.h;
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}
function chartPaths(series, box, logX = false, logY = false) {
  const tx = value => logX ? Math.log10(Math.max(value, 1e-30)) : value;
  const ty = value => logY ? Math.log10(Math.max(value, 1e-30)) : value;
  const allX = series.flatMap(item => item.x.map(tx)), allY = series.flatMap(item => item.y.map(ty));
  const xmin = Math.min(...allX), xmax = Math.max(...allX), ymin = Math.min(...allY), ymax = Math.max(...allY);
  return series.map(item => item.x.map((value, index) => {
    const x = box.x + (tx(value) - xmin) / Math.max(xmax - xmin, 1e-30) * box.w;
    const y = box.y + box.h - (ty(item.y[index]) - ymin) / Math.max(ymax - ymin, 1e-30) * box.h;
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' '));
}
const axes = (box, xLabel, yLabel) => `<path d="M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}" fill="none" stroke="${C.muted}"/><text x="${box.x + box.w / 2}" y="${box.y + box.h + 34}" text-anchor="middle" font-size="12" fill="${C.muted}">${esc(xLabel)}</text><text x="${box.x - 40}" y="${box.y + box.h / 2}" transform="rotate(-90 ${box.x - 40} ${box.y + box.h / 2})" text-anchor="middle" font-size="12" fill="${C.muted}">${esc(yLabel)}</text>`;
const title = text => `<text x="48" y="38" font-size="16" font-weight="700" fill="${C.ink}">${esc(text)}</text>`;
const preview = inner => `<svg viewBox="0 0 520 180" aria-hidden="true"><rect width="520" height="180" fill="${C.wash}"/>${inner}</svg>`;

const previewMap = {
  'nonstationary-environment-lab': preview('<path d="M28 145 H495 M28 145 V25" stroke="#657176"/><path d="M35 130 C140 130 185 128 220 48 C245 9 276 128 330 130 S430 130 490 130" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M35 112 H490" stroke="#b96d37" stroke-width="4" stroke-dasharray="7 5"/>'),
  'mimo-test-control-lab': preview('<circle cx="85" cy="52" r="25" fill="#164453"/><circle cx="85" cy="128" r="25" fill="#1e6077"/><rect x="235" y="44" width="90" height="92" fill="#b96d37"/><circle cx="450" cy="52" r="25" fill="#164453"/><circle cx="450" cy="128" r="25" fill="#1e6077"/><path d="M110 52 H235 M110 128 H235 M325 52 H425 M325 128 H425 M110 52 L235 128 M110 128 L235 52" stroke="#657176" stroke-width="5"/>'),
  'acoustic-treatment-lab': preview('<path d="M30 145 H495 M30 145 V25" stroke="#657176"/><path d="M38 138 C110 137 135 115 180 70 S280 25 490 38" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M38 140 C150 138 220 120 280 92 S390 68 490 73" fill="none" stroke="#b96d37" stroke-width="4"/><rect x="350" y="110" width="120" height="25" fill="#164453" opacity=".55"/>'),
  'source-identification-array-lab': preview('<path d="M25 145 H495 M25 145 V25" stroke="#657176"/><path d="M35 142 C125 140 150 120 190 34 C230 118 265 138 330 128 C360 122 375 76 405 82 C435 89 455 132 490 138" fill="none" stroke="#1e6077" stroke-width="5"/><g fill="#b96d37">'+Array.from({length:12},(_,i)=>`<circle cx="${42+i*37}" cy="158" r="4"/>`).join('')+'</g>'),
  'hybrid-method-ladder': preview('<rect x="35" y="38" width="130" height="92" fill="#164453"/><rect x="165" y="38" width="165" height="92" fill="#1e6077"/><rect x="330" y="38" width="155" height="92" fill="#b96d37"/><path d="M165 25 V145 M330 25 V145" stroke="#faf8f2" stroke-width="4"/><text x="100" y="157" text-anchor="middle" fill="#657176" font-size="11">deterministic</text><text x="247" y="157" text-anchor="middle" fill="#657176" font-size="11">hybrid</text><text x="408" y="157" text-anchor="middle" fill="#657176" font-size="11">statistical</text>'),
  'vibroacoustic-fatigue-lab': preview('<path d="M30 145 H495 M30 145 V25" stroke="#657176"/><path d="M38 141 C145 140 220 132 285 109 C350 86 405 49 490 27" fill="none" stroke="#b96d37" stroke-width="6"/><path d="M38 128 H490" stroke="#1e6077" stroke-width="3" stroke-dasharray="7 5"/>'),
  'mission-environment-timeline': preview('<path d="M28 150 H495" stroke="#657176"/><rect x="35" y="38" width="70" height="92" fill="#b96d37"/><rect x="125" y="65" width="130" height="65" fill="#1e6077"/><rect x="255" y="84" width="110" height="46" fill="#164453"/><rect x="374" y="28" width="16" height="102" fill="#657176"/><rect x="400" y="102" width="86" height="28" fill="#376e56"/>'),
  'credibility-scorecard-lab': preview('<g>'+[90,65,118,52,35,76,42,68].map((h,i)=>`<rect x="${32+i*59}" y="${145-h}" width="34" height="${h}" fill="${h<50?'#b96d37':'#1e6077'}"/>`).join('')+'</g><path d="M25 145 H500" stroke="#657176"/>'),
  'launch-vibroacoustic-capstone': preview('<g fill="#164453"><rect x="15" y="62" width="72" height="55"/><rect x="118" y="62" width="72" height="55"/><rect x="221" y="62" width="72" height="55"/><rect x="324" y="62" width="72" height="55"/><rect x="427" y="62" width="72" height="55"/></g><g stroke="#b96d37" stroke-width="8"><path d="M87 89 H118"/><path d="M190 89 H221"/><path d="M293 89 H324"/><path d="M396 89 H427"/></g>'),
  'noise-control-path-lab': preview('<path d="M25 145H495" stroke="#657176"/><g stroke-width="12"><path d="M40 45H230" stroke="#1e6077"/><path d="M40 90H230" stroke="#b96d37"/><path d="M40 135H230" stroke="#657176"/></g><path d="M230 45L360 90M230 90H360M230 135L360 90" stroke="#164453" stroke-width="5"/><circle cx="405" cy="90" r="32" fill="#376e56"/>'),
  'binaural-localization-lab': preview('<circle cx="260" cy="90" r="58" fill="#dce9ec" stroke="#164453" stroke-width="5"/><circle cx="196" cy="90" r="13" fill="#b96d37"/><circle cx="324" cy="90" r="13" fill="#1e6077"/><path d="M45 35C120 48 140 77 185 86M45 145C120 132 140 103 185 94" fill="none" stroke="#657176" stroke-width="5"/>'),
  'critical-band-masking-lab': preview('<path d="M25 145H495M25 145V25" stroke="#657176"/><path d="M45 135C120 132 150 92 205 55C260 92 290 132 475 135" fill="#b96d37" opacity=".55"/><path d="M310 145V45" stroke="#164453" stroke-width="7"/>'),
  'noise-metrics-criteria-lab': preview('<path d="M25 145H495M25 145V25" stroke="#657176"/><path d="M35 130H220V45H275V130H490" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M35 100H490" stroke="#b96d37" stroke-width="4" stroke-dasharray="8 6"/>'),
  'microphone-placement-lab': preview('<circle cx="100" cy="90" r="42" fill="#b96d37"/><path d="M150 90H330" stroke="#657176" stroke-width="5" stroke-dasharray="8 7"/><rect x="335" y="70" width="28" height="40" rx="8" fill="#164453"/><path d="M365 90L475 35M365 90L475 145" stroke="#1e6077" stroke-width="4"/>'),
  'multipole-source-lab': preview('<circle cx="260" cy="90" r="13" fill="#164453"/><path d="M260 90C370 5 500 45 500 90C500 135 370 175 260 90C150 175 20 135 20 90C20 45 150 5 260 90Z" fill="#1e6077" opacity=".7"/>'),
  'source-geometry-lab': preview('<rect x="35" y="48" width="120" height="84" fill="#164453"/><path d="M155 48L260 70V110L155 132ZM260 70L480 84V96L260 110Z" fill="#1e6077" opacity=".55"/><circle cx="470" cy="90" r="8" fill="#b96d37"/>'),
  'fan-duct-ledger-lab': preview('<circle cx="65" cy="90" r="38" fill="#164453"/><path d="M103 90H250V48H480M250 90V135H480" fill="none" stroke="#1e6077" stroke-width="18"/><rect x="320" y="35" width="52" height="28" fill="#b96d37"/>'),
  'outdoor-propagation-lab': preview('<path d="M20 145H500" stroke="#376e56" stroke-width="8"/><path d="M45 130V72" stroke="#164453" stroke-width="15"/><path d="M53 70C180 25 320 45 475 92M53 76C180 145 320 135 475 98" fill="none" stroke="#1e6077" stroke-width="4"/>'),
  'barrier-diffraction-lab': preview('<circle cx="70" cy="130" r="18" fill="#b96d37"/><rect x="250" y="42" width="20" height="105" fill="#164453"/><circle cx="455" cy="130" r="16" fill="#376e56"/><path d="M88 130L250 42L455 130" fill="none" stroke="#1e6077" stroke-width="5"/>'),
  'room-field-lab': preview('<rect x="30" y="30" width="460" height="120" fill="none" stroke="#164453" stroke-width="5"/><circle cx="95" cy="90" r="20" fill="#b96d37"/><path d="M115 90H455M115 90C210 15 360 20 455 90M115 90C210 165 360 160 455 90" fill="none" stroke="#1e6077" stroke-width="4"/>'),
  'enclosure-weakest-link-lab': preview('<rect x="90" y="32" width="330" height="115" fill="#164453"/><rect x="335" y="102" width="55" height="45" fill="#b96d37"/><circle cx="230" cy="90" r="25" fill="#faf8f2"/><path d="M390 124H485" stroke="#b96d37" stroke-width="10"/>'),
  'absorber-test-resonator-lab': preview('<path d="M25 145H495M25 145V25" stroke="#657176"/><path d="M35 140C185 137 210 40 260 35C310 40 335 137 490 140" fill="none" stroke="#1e6077" stroke-width="5"/><rect x="70" y="95" width="85" height="38" fill="#b96d37" opacity=".7"/>'),
  'tuned-absorber-isolation-lab': preview('<path d="M25 145H495M25 145V25" stroke="#657176"/><path d="M35 135C170 132 205 22 260 130C315 22 350 132 490 135" fill="none" stroke="#1e6077" stroke-width="5"/><path d="M35 138C180 136 220 45 260 35C300 45 340 136 490 138" fill="none" stroke="#b96d37" stroke-width="4"/>')
};

export const programExpansionSupportedDemoIds = Object.freeze(Object.keys(previewMap));
export function programExpansionPreviewSvg(id) { return previewMap[id] || null; }

function mountNonstationary(root) {
  return shell(root, [
    { key: 'eventWidth', label: 'Burst width', min: 0.15, max: 2.5, step: 0.05, value: 0.75, unit: ' s' },
    { key: 'burstPsd', label: 'Burst PSD increment', min: 0, max: 0.14, step: 0.005, value: 0.07, unit: ' g²/Hz' },
    { key: 'kurtosis', label: 'Response kurtosis', min: 3, max: 9, step: 0.1, value: 5 },
    { key: 'fatigueExponent', label: 'Fatigue exponent', min: 3, max: 10, step: 0.5, value: 6 }
  ], 'The local response preserves the launch-event burst. The stationary surrogate preserves average energy but loses when peaks and fatigue are created.', (svg, input) => {
    const state = nonstationaryEnvironmentState(input), box = { x: 65, y: 65, w: 600, h: 285 };
    const [local, stationary] = chartPaths([{ x: state.times, y: state.localRms }, { x: state.times, y: state.times.map(() => state.stationaryRms) }], box);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Event-local response versus stationary surrogate')}${axes(box, 'mission time (s)', 'local RMS (g)')}<path d="${local}" fill="none" stroke="${C.teal}" stroke-width="5"/><path d="${stationary}" fill="none" stroke="${C.rust}" stroke-width="4" stroke-dasharray="8 6"/><text x="715" y="95" font-size="14" fill="${C.ink}">Peak ratio ${fmt(state.peakRatio, 2)}×</text><text x="715" y="135" font-size="14" fill="${C.rust}">Damage ratio ${fmt(state.damageRatio, 2)}×</text><text x="715" y="177" font-size="13" fill="${C.ink}">Kurtosis factor ${fmt(state.nonGaussianFactor, 2)}×</text><text x="715" y="230" font-size="12" fill="${C.muted}">${esc(state.regime)}</text>`;
  });
}

function mountMimo(root) {
  return shell(root, [
    { key: 'frequency', label: 'Control frequency', min: 100, max: 360, step: 2, value: 180, unit: ' Hz' },
    { key: 'fixtureFrequency', label: 'Fixture mode', min: 140, max: 300, step: 2, value: 220, unit: ' Hz' },
    { key: 'crossCoupling', label: 'Cross-axis coupling', min: 0, max: 0.8, step: 0.01, value: 0.22 },
    { key: 'inputCorrelation', label: 'Drive correlation', min: -0.9, max: 0.9, step: 0.05, value: 0.35 }
  ], 'The controlled axes are a complex matrix problem. Near the fixture mode, coupling and drive correlation change both response axes together.', (svg, input) => {
    const state = mimoTestState(input), box = { x: 65, y: 65, w: 600, h: 285 };
    const [p1, p2] = chartPaths([{ x: state.frequencies, y: state.axis1Sweep }, { x: state.frequencies, y: state.axis2Sweep }], box, false, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Two-axis response through a coupled fixture')}${axes(box, 'frequency (Hz)', 'response PSD (log)')}<path d="${p1}" fill="none" stroke="${C.teal}" stroke-width="5"/><path d="${p2}" fill="none" stroke="${C.rust}" stroke-width="4"/><text x="715" y="90" font-size="13" fill="${C.teal}">Axis 1 ${fmt(state.responsePsd1, 3)} g²/Hz</text><text x="715" y="125" font-size="13" fill="${C.rust}">Axis 2 ${fmt(state.responsePsd2, 3)} g²/Hz</text><text x="715" y="165" font-size="13" fill="${C.ink}">Coherence ${fmt(state.responseCoherence, 2)}</text><text x="715" y="202" font-size="13" fill="${C.ink}">Condition ${fmt(state.conditionIndicator, 1)}</text><text x="715" y="250" font-size="12" fill="${C.muted}">${esc(state.controlRisk)}</text>`;
  });
}

function mountTreatment(root) {
  return shell(root, [
    { key: 'thicknessMm', label: 'Absorber thickness', min: 5, max: 150, step: 1, value: 50, unit: ' mm' },
    { key: 'airGapMm', label: 'Backing air gap', min: 0, max: 100, step: 1, value: 25, unit: ' mm' },
    { key: 'flowResistivity', label: 'Flow resistivity', min: 3000, max: 50000, step: 500, value: 18000, unit: ' Pa·s/m²' },
    { key: 'coverage', label: 'Installed coverage', min: 0, max: 1, step: 0.01, value: 0.7 }
  ], 'Material absorption and installed-area absorption are different curves. Thickness moves the useful band; incomplete coverage leaves an untreated parallel path.', (svg, input) => {
    const state = acousticTreatmentState(input), box = { x: 65, y: 65, w: 600, h: 285 };
    const [material, installed] = chartPaths([{ x: state.frequencies, y: state.absorptionCurve }, { x: state.frequencies, y: state.installedCurve }], box, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Material versus installed acoustic absorption')}${axes(box, 'frequency (Hz, log)', 'absorption coefficient')}<path d="${material}" fill="none" stroke="${C.teal}" stroke-width="5"/><path d="${installed}" fill="none" stroke="${C.rust}" stroke-width="4"/><text x="715" y="95" font-size="14" fill="${C.teal}">Material α ${fmt(state.normalAbsorption, 2)}</text><text x="715" y="135" font-size="14" fill="${C.rust}">Installed α ${fmt(state.installedAbsorption, 2)}</text><text x="715" y="175" font-size="13" fill="${C.ink}">Depth scale ${fmt(state.quarterWaveFrequency, 0)} Hz</text><text x="715" y="215" font-size="13" fill="${C.ink}">IL screen ${fmt(state.insertionLoss, 1)} dB</text><text x="715" y="255" font-size="12" fill="${C.muted}">${esc(state.regime)}</text>`;
  });
}

function mountSourceArray(root) {
  return shell(root, [
    { key: 'frequency', label: 'Analysis frequency', min: 200, max: 4000, step: 50, value: 1200, unit: ' Hz' },
    { key: 'microphoneCount', label: 'Microphone count', min: 4, max: 32, step: 1, value: 12 },
    { key: 'spacingMm', label: 'Microphone spacing', min: 20, max: 250, step: 5, value: 90, unit: ' mm' },
    { key: 'sourceAngle', label: 'Primary-source angle', min: -65, max: 20, step: 1, value: -18, unit: '°' }
  ], 'Aperture sharpens the main lobe, but spacing above half a wavelength creates ambiguous grating lobes. The map is a spatial-filter output, not a photograph.', (svg, input) => {
    const state = sourceIdentificationState(input), box = { x: 65, y: 65, w: 600, h: 285 }, beam = chartPath(state.steeringAngles, state.beamDb, box);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Delay-and-sum source map')}${axes(box, 'steering angle (deg)', 'normalized level (dB)')}<path d="${beam}" fill="none" stroke="${state.spatialAlias ? C.rust : C.teal}" stroke-width="5"/><line x1="${65 + (state.sourceAngle + 85) / 170 * 600}" y1="65" x2="${65 + (state.sourceAngle + 85) / 170 * 600}" y2="350" stroke="${C.green}" stroke-dasharray="7 5"/><text x="715" y="92" font-size="14" fill="${C.ink}">Identified ${fmt(state.identifiedAngle, 1)}°</text><text x="715" y="132" font-size="13" fill="${C.ink}">Resolution ≈ ${fmt(state.resolutionDegrees, 1)}°</text><text x="715" y="172" font-size="13" fill="${state.spatialAlias ? C.rust : C.green}">${state.spatialAlias ? 'Spatial aliasing active' : 'Spacing below λ/2'}</text><text x="715" y="225" font-size="12" fill="${C.muted}">${esc(state.diagnosis)}</text>`;
  });
}

function mountHybrid(root) {
  return shell(root, [
    { key: 'frequency', label: 'Decision frequency', min: 50, max: 5000, step: 25, value: 800, unit: ' Hz' },
    { key: 'lossFactor', label: 'Loss factor', min: 0.002, max: 0.12, step: 0.002, value: 0.025 },
    { key: 'cavityVolume', label: 'Cavity volume', min: 2, max: 80, step: 1, value: 18, unit: ' m³' },
    { key: 'panelLength', label: 'Panel length', min: 0.5, max: 6, step: 0.1, value: 2.4, unit: ' m' }
  ], 'Method boundaries are subsystem- and frequency-dependent. Mode population and overlap earn statistical treatment; wavelength and convergence govern deterministic cost.', (svg, input) => {
    const state = hybridMethodState(input), box = { x: 65, y: 65, w: 600, h: 285 };
    const [structure, acoustic] = chartPaths([{ x: state.frequencies, y: state.structuralModes }, { x: state.frequencies, y: state.acousticModes }], box, true, true);
    const markerX = 65 + (Math.log10(state.frequency) - Math.log10(state.frequencies[0])) / (Math.log10(state.frequencies.at(-1)) - Math.log10(state.frequencies[0])) * 600;
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Frequency-dependent method ladder')}${axes(box, 'frequency (Hz, log)', 'modes per third octave (log)')}<path d="${structure}" fill="none" stroke="${C.teal}" stroke-width="5"/><path d="${acoustic}" fill="none" stroke="${C.rust}" stroke-width="4"/><line x1="${markerX}" y1="65" x2="${markerX}" y2="350" stroke="${C.ink}" stroke-dasharray="7 5"/><text x="715" y="92" font-size="14" font-weight="700" fill="${C.ink}">${esc(state.method)}</text><text x="715" y="138" font-size="13" fill="${C.teal}">Structure ${fmt(state.structuralModesPerThird, 2)} modes/band</text><text x="715" y="174" font-size="13" fill="${C.rust}">Cavity ${fmt(state.acousticModesPerThird, 2)} modes/band</text><text x="715" y="210" font-size="13" fill="${C.ink}">Overlap ${fmt(state.overlap, 2)}</text><text x="715" y="246" font-size="12" fill="${C.muted}">FE screen ${fmt(state.feElements, 0)} elements</text>`;
  });
}

function mountFatigue(root) {
  return shell(root, [
    { key: 'stressRmsMpa', label: 'Stress RMS', min: 2, max: 35, step: 0.5, value: 12, unit: ' MPa' },
    { key: 'duration', label: 'Event duration', min: 10, max: 600, step: 10, value: 120, unit: ' s' },
    { key: 'kurtosis', label: 'Stress kurtosis', min: 3, max: 9, step: 0.1, value: 3 },
    { key: 'missionRepeats', label: 'Mission / test repeats', min: 1, max: 20, step: 1, value: 4 }
  ], 'Damage grows linearly with repeated exposure but nonlinearly with stress amplitude and heavy tails. RMS alone does not define fatigue severity.', (svg, input) => {
    const state = vibroacousticFatigueState(input), box = { x: 65, y: 65, w: 600, h: 285 }, damage = chartPath(state.stressValues, state.damageCurve, box, false, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Spectral fatigue sensitivity to stress level')}${axes(box, 'stress RMS (MPa)', 'damage per event (log)')}<path d="${damage}" fill="none" stroke="${C.rust}" stroke-width="5"/><text x="715" y="92" font-size="14" fill="${C.ink}">Cycles ${Math.round(state.cycles).toLocaleString()}</text><text x="715" y="132" font-size="14" fill="${C.rust}">Mission damage ${state.missionDamage.toExponential(2)}</text><text x="715" y="172" font-size="13" fill="${C.ink}">Tail correction ${fmt(state.nonGaussianCorrection, 2)}×</text><text x="715" y="212" font-size="13" fill="${C.ink}">Damage-equivalent stress ${fmt(state.damageEquivalentStress, 1)} MPa</text><text x="715" y="252" font-size="12" fill="${C.muted}">${esc(state.regime)}</text>`;
  });
}

function mountMission(root) {
  return shell(root, [
    { key: 'acousticScale', label: 'Liftoff acoustics', min: 0.4, max: 1.8, step: 0.05, value: 1 },
    { key: 'buffetScale', label: 'Max-Q buffet', min: 0.4, max: 1.8, step: 0.05, value: 1 },
    { key: 'shockScale', label: 'Separation shock', min: 0.4, max: 1.8, step: 0.05, value: 1 },
    { key: 'thermalScale', label: 'Thermal environment', min: 0.4, max: 1.8, step: 0.05, value: 1 }
  ], 'Different subsystems select different controlling events. Peak severity, fatigue share, shock, and thermal control should remain separate in requirements and verification.', (svg, input) => {
    const state = missionTimelineState(input), x = time => 55 + time / state.missionEnd * 610;
    const colors = [C.rust, C.teal, C.dark, C.muted, C.green];
    const events = state.events.map((event, index) => `<rect x="${x(event.start)}" y="${85 + index * 45}" width="${Math.max(5, event.duration / state.missionEnd * 610)}" height="27" fill="${colors[index]}" opacity=".85"/><text x="${x(event.start) + 5}" y="${104 + index * 45}" font-size="11" fill="${index === 3 ? C.paper : C.paper}">${esc(event.name)}</text>`).join('');
    const subsystem = state.subsystemResults.map((item, index) => `<text x="715" y="${90 + index * 43}" font-size="13" fill="${C.ink}">${esc(item.name)}: <tspan font-weight="700">${esc(item.controllingEvent)}</tspan></text>`).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Combined-environment mission timeline')}<line x1="55" y1="330" x2="665" y2="330" stroke="${C.muted}"/>${events}<text x="55" y="365" font-size="12" fill="${C.muted}">0 s</text><text x="635" y="365" font-size="12" fill="${C.muted}">${fmt(state.missionEnd, 0)} s</text>${subsystem}<text x="715" y="290" font-size="13" fill="${C.rust}">Fatigue controller: ${esc(state.controllingFatigue)}</text>`;
  });
}

function mountCredibility(root) {
  return shell(root, [
    { key: 'verification', label: 'Equation / code verification', min: 0, max: 5, step: 1, value: 4 },
    { key: 'convergence', label: 'Convergence evidence', min: 0, max: 5, step: 1, value: 3 },
    { key: 'validation', label: 'Independent validation', min: 0, max: 5, step: 1, value: 2 },
    { key: 'uncertainty', label: 'Uncertainty coverage', min: 0, max: 5, step: 1, value: 3 },
    { key: 'configuration', label: 'Flight configuration match', min: 0, max: 5, step: 1, value: 2 }
  ], 'Credibility is an evidence profile tied to intended use. A high average cannot hide a missing high-consequence category.', (svg, input) => {
    const state = credibilityState(input), x0 = 55, y0 = 78, row = 39;
    const bars = state.evidence.map((item, index) => `<text x="${x0}" y="${y0 + index * row + 16}" font-size="11" fill="${C.ink}">${esc(item.name)}</text><rect x="300" y="${y0 + index * row}" width="300" height="21" fill="${C.wash}"/><rect x="300" y="${y0 + index * row}" width="${60 * item.score}" height="21" fill="${item.score < 3 ? C.rust : C.teal}"/><text x="615" y="${y0 + index * row + 16}" font-size="12" fill="${C.ink}">${fmt(item.score, 0)}/5</text>`).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Decision-specific model credibility profile')}${bars}<text x="700" y="100" font-size="25" font-weight="700" fill="${state.decisionReady ? C.green : C.rust}">${fmt(state.weightedScore, 0)}/100</text><text x="700" y="145" font-size="13" fill="${C.ink}">Weakest: ${esc(state.weakest.name)}</text><text x="700" y="202" font-size="13" fill="${C.ink}">${esc(state.maturity)}</text>`;
  });
}

function mountCapstone(root) {
  return shell(root, [
    { key: 'sourceOaspl', label: 'Launch source OASPL', min: 135, max: 170, step: 0.5, value: 152, unit: ' dB' },
    { key: 'fairingTl', label: 'Fairing component TL', min: 5, max: 35, step: 0.5, value: 18, unit: ' dB' },
    { key: 'flankingPenalty', label: 'Flanking penalty', min: 0, max: 15, step: 0.5, value: 5, unit: ' dB' },
    { key: 'mitigationDb', label: 'Treatment benefit', min: 0, max: 15, step: 0.5, value: 4, unit: ' dB' },
    { key: 'uncertaintyDb', label: 'Response uncertainty', min: 0, max: 10, step: 0.5, value: 3, unit: ' dB' }
  ], 'Every block is a traceable physical handoff. Component TL, installed TL, cavity gain, structural transfer, mitigation, and uncertainty all remain visible at the payload decision.', (svg, input) => {
    const state = capstoneState(input), xs = [70, 260, 450, 640], labels = state.pathLabels;
    const boxes = xs.map((x, index) => `<rect x="${x}" y="105" width="140" height="90" rx="5" fill="${index === 3 ? (state.marginDb >= 0 ? C.green : C.rust) : C.dark}"/><text x="${x + 70}" y="135" text-anchor="middle" font-size="12" fill="${C.paper}">${esc(labels[index])}</text><text x="${x + 70}" y="172" text-anchor="middle" font-size="20" font-weight="700" fill="${C.paper}">${fmt(state.pathLevels[index], 1)} dB</text>`).join('');
    const arrows = xs.slice(0, -1).map(x => `<path d="M${x + 142} 150 H${x + 184}" stroke="${C.rust}" stroke-width="8"/><path d="M${x + 174} 139 L${x + 188} 150 L${x + 174} 161" fill="none" stroke="${C.rust}" stroke-width="5"/>`).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Launch source–path–receiver decision chain')}${boxes}${arrows}<rect x="830" y="105" width="130" height="90" rx="5" fill="${state.marginDb >= 0 ? C.green : C.rust}"/><text x="895" y="135" text-anchor="middle" font-size="12" fill="${C.paper}">Payload design</text><text x="895" y="172" text-anchor="middle" font-size="20" font-weight="700" fill="${C.paper}">${fmt(state.designPayloadResponse, 2)} g</text><path d="M780 150 H825" stroke="${C.rust}" stroke-width="8"/><text x="70" y="260" font-size="14" fill="${C.ink}">Effective installed TL ${fmt(state.effectiveTl, 1)} dB</text><text x="360" y="260" font-size="14" fill="${C.ink}">Interior pressure ${fmt(state.pressureRms, 1)} Pa RMS</text><text x="700" y="260" font-size="16" font-weight="700" fill="${state.marginDb >= 0 ? C.green : C.rust}">Margin ${fmt(state.marginDb, 1)} dB</text><text x="70" y="325" font-size="13" fill="${C.muted}">${esc(state.disposition)}</text>`;
  });
}

function mountNoiseControlPath(root) {
  return shell(root, [
    { key: 'path1Reduction', label: 'Airborne treatment', min: 0, max: 25, step: 0.5, value: 8, unit: ' dB' },
    { key: 'path2Reduction', label: 'Flanking treatment', min: 0, max: 20, step: 0.5, value: 3, unit: ' dB' },
    { key: 'path3Reduction', label: 'Leak treatment', min: 0, max: 20, step: 0.5, value: 0, unit: ' dB' },
    { key: 'targetLevel', label: 'Receiver criterion', min: 78, max: 100, step: 0.5, value: 88, unit: ' dB' }
  ], 'Engineering takeaway: treatment benefit stops at the energetic floor created by untreated paths. Re-rank the receiver paths after every design change.', (svg, input) => {
    const state = noiseControlPathState(input), box = { x: 65, y: 75, w: 590, h: 270 };
    const curve = chartPath(state.treatmentSweep, state.overallCurve, box);
    const shares = state.contributions.map((item, index) => `<rect x="715" y="${92 + 58 * index}" width="${210 * item.share}" height="25" fill="${[C.teal, C.rust, C.muted][index]}"/><text x="715" y="${82 + 58 * index}" font-size="12" fill="${C.ink}">${esc(item.name)} · ${fmt(100 * item.share, 0)}%</text>`).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Parallel receiver paths and diminishing return')}${axes(box, 'airborne-path reduction (dB)', 'receiver level (dB)')}<path d="${curve}" fill="none" stroke="${C.teal}" stroke-width="5"/>${shares}<text x="715" y="292" font-size="14" font-weight="700" fill="${state.margin >= 0 ? C.green : C.rust}">${fmt(state.afterLevel, 1)} dB · margin ${fmt(state.margin, 1)} dB</text><text x="715" y="335" font-size="12" fill="${C.muted}">Controller: ${esc(state.dominant.name)}</text>`;
  });
}

function mountBinaural(root) {
  return shell(root, [
    { key: 'frequency', label: 'Tone frequency', min: 100, max: 6000, step: 50, value: 1000, unit: ' Hz' },
    { key: 'azimuth', label: 'Source azimuth', min: -90, max: 90, step: 1, value: 35, unit: '°' },
    { key: 'headWidth', label: 'Ear spacing', min: 0.12, max: 0.24, step: 0.005, value: 0.18, unit: ' m' },
    { key: 'soundLevel', label: 'Tone level', min: 30, max: 110, step: 1, value: 80, unit: ' dB' }
  ], 'Engineering takeaway: low-frequency direction is mainly a timing problem; high-frequency direction is increasingly a head-shadow level problem.', (svg, input) => {
    const state = psychoacousticState(input), angle = state.azimuth * Math.PI / 180, sx = 250 - 150 * Math.sin(angle), sy = 210 - 150 * Math.cos(angle);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Duplex binaural localization cues')}<circle cx="250" cy="225" r="78" fill="${C.pale}" stroke="${C.dark}" stroke-width="5"/><circle cx="165" cy="225" r="14" fill="${C.rust}"/><circle cx="335" cy="225" r="14" fill="${C.teal}"/><circle cx="${sx}" cy="${sy}" r="18" fill="${C.ink}"/><path d="M${sx} ${sy}L165 225M${sx} ${sy}L335 225" stroke="${C.muted}" stroke-width="3" stroke-dasharray="7 5"/><text x="470" y="105" font-size="18" fill="${C.ink}">ITD ${fmt(state.itdMicroseconds, 0)} µs</text><text x="470" y="155" font-size="18" fill="${C.ink}">ILD ${fmt(state.ild, 1)} dB</text><text x="470" y="205" font-size="14" fill="${C.teal}">ERB ${fmt(state.erb, 0)} Hz · ${fmt(state.bark, 1)} Bark</text><text x="470" y="260" font-size="13" fill="${C.ink}">${esc(state.localizationCue)}</text><text x="470" y="315" font-size="12" fill="${C.muted}">Ear-canal quarter-wave scale ≈ ${fmt(state.earCanalResonance, 0)} Hz</text>`;
  });
}

function mountMasking(root) {
  return shell(root, [
    { key: 'frequency', label: 'Tone frequency', min: 100, max: 6000, step: 50, value: 1000, unit: ' Hz' },
    { key: 'soundLevel', label: 'Tone level', min: 20, max: 110, step: 1, value: 80, unit: ' dB' },
    { key: 'maskerLevel', label: 'Masker level', min: 20, max: 110, step: 1, value: 68, unit: ' dB' },
    { key: 'maskerBandwidth', label: 'Masker bandwidth', min: 10, max: 2000, step: 10, value: 160, unit: ' Hz' }
  ], 'Engineering takeaway: audibility depends on masker energy inside the same auditory filter, not simply the overall noise level.', (svg, input) => {
    const state = psychoacousticState(input), box = { x: 70, y: 75, w: 600, h: 275 }, center = 370, width = Math.min(520, 80 + 420 * state.erb / Math.max(state.maskerBandwidth, state.erb));
    const toneY = 330 - 2.4 * (state.soundLevel - 20), maskerY = 330 - 2.4 * (state.effectiveMaskerLevel - 20);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Tone audibility inside a critical band')}${axes(box, 'relative frequency around tone', 'level (dB)')}<rect x="${center - width / 2}" y="${maskerY}" width="${width}" height="${350 - maskerY}" fill="${C.rust}" opacity=".45"/><line x1="${center}" y1="${toneY}" x2="${center}" y2="350" stroke="${C.dark}" stroke-width="8"/><text x="720" y="110" font-size="16" fill="${C.ink}">Critical band ${fmt(state.erb, 0)} Hz</text><text x="720" y="160" font-size="16" fill="${state.toneToMasker >= 0 ? C.green : C.rust}">Tone margin ${fmt(state.toneToMasker, 1)} dB</text><text x="720" y="215" font-size="13" fill="${C.ink}">${esc(state.audibility)}</text><text x="720" y="275" font-size="12" fill="${C.muted}">Masker energy outside the auditory filter contributes less to masking.</text>`;
  });
}

function mountNoiseMetrics(root) {
  return shell(root, [
    { key: 'eventLevel', label: 'Event level', min: 65, max: 130, step: 1, value: 92, unit: ' dB' },
    { key: 'eventDuration', label: 'Event duration', min: 1, max: 300, step: 1, value: 12, unit: ' s' },
    { key: 'totalDuration', label: 'Reporting duration', min: 300, max: 7200, step: 60, value: 3600, unit: ' s' },
    { key: 'target', label: 'Leq criterion', min: 50, max: 90, step: 1, value: 70, unit: ' dB' }
  ], 'Engineering takeaway: Leq, SEL, percentile levels, and time-of-day metrics preserve different information; choose the descriptor from the receiver effect.', (svg, input) => {
    const state = noiseMetricsState({ ...input, targetLevel: input.target }), box = { x: 65, y: 70, w: 600, h: 280 }, history = chartPath(state.timeline, state.levelHistory, box);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('One acoustic event, several decision metrics')}${axes(box, 'reporting time (s)', 'level (dB)')}<path d="${history}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="720" y="90" font-size="17" fill="${C.ink}">Leq ${fmt(state.leq, 1)} dB</text><text x="720" y="135" font-size="17" fill="${C.rust}">SEL ${fmt(state.sel, 1)} dB</text><text x="720" y="180" font-size="14" fill="${C.ink}">L10 / L50 / L90</text><text x="720" y="210" font-size="14" fill="${C.ink}">${fmt(state.l10, 0)} / ${fmt(state.l50, 0)} / ${fmt(state.l90, 0)} dB</text><text x="720" y="265" font-size="14" fill="${state.margin >= 0 ? C.green : C.rust}">Criterion margin ${fmt(state.margin, 1)} dB</text>`;
  });
}

function mountMicrophone(root) {
  return shell(root, [
    { key: 'frequency', label: 'Frequency', min: 100, max: 16000, step: 100, value: 4000, unit: ' Hz' },
    { key: 'microphoneDiameterMm', label: 'Capsule diameter', min: 3, max: 25.4, step: 0.1, value: 12.7, unit: ' mm' },
    { key: 'incidenceAngle', label: 'Incidence angle', min: 0, max: 180, step: 1, value: 0, unit: '°' },
    { key: 'windSpeed', label: 'Wind speed', min: 0, max: 15, step: 0.5, value: 4, unit: ' m/s' },
    { key: 'wallDistance', label: 'Wall distance', min: 0.05, max: 3, step: 0.05, value: 0.8, unit: ' m' }
  ], 'Engineering takeaway: calibration sensitivity is only one link; field type, orientation, scattering, wind, reflection geometry, and range decide what pressure is actually measured.', (svg, input) => {
    const state = acousticMeasurementState({ ...input, fieldType: 'free', microphoneType: 'free-field', windscreen: 'yes' }), box = { x: 65, y: 65, w: 600, h: 285 }, bias = chartPath(state.frequencies, state.responseBias, box, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Microphone field-response and placement screen')}${axes(box, 'frequency (Hz, log)', 'response bias (dB)')}<path d="${bias}" fill="none" stroke="${Math.abs(state.totalBias) < 1.5 ? C.teal : C.rust}" stroke-width="5"/><text x="715" y="92" font-size="16" fill="${C.ink}">Bias ${fmt(state.totalBias, 1)} dB</text><text x="715" y="137" font-size="14" fill="${C.ink}">Wind screen ${fmt(state.windPenalty, 1)} dB</text><text x="715" y="182" font-size="14" fill="${C.ink}">Reflection scale ${fmt(state.reflectionNotch, 0)} Hz</text><text x="715" y="232" font-size="13" fill="${state.usable ? C.green : C.rust}">${esc(state.recommendation)}</text>`;
  });
}

function mountMultipole(root) {
  return shell(root, [
    { key: 'sourceOrder', label: 'Source order (0/1/2)', min: 0, max: 2, step: 1, value: 1 },
    { key: 'frequency', label: 'Frequency', min: 50, max: 5000, step: 50, value: 500, unit: ' Hz' },
    { key: 'angle', label: 'Receiver angle', min: 0, max: 180, step: 1, value: 35, unit: '°' },
    { key: 'separation', label: 'Source scale', min: 0.01, max: 0.5, step: 0.01, value: 0.08, unit: ' m' },
    { key: 'flowSpeed', label: 'Flow speed', min: 10, max: 250, step: 5, value: 80, unit: ' m/s' }
  ], 'Engineering takeaway: source order identifies the physical mechanism and controls compactness, directivity, and the steepness of velocity scaling.', (svg, input) => {
    const sourceType = ['monopole', 'dipole', 'quadrupole'][Math.round(input.sourceOrder)], state = canonicalSourceState({ ...input, sourceType }), box = { x: 65, y: 65, w: 600, h: 285 }, pattern = chartPath(state.angles, state.pattern, box);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Canonical acoustic multipole directivity')}${axes(box, 'azimuth (deg)', 'relative level (dB)')}<path d="${pattern}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="715" y="90" font-size="20" font-weight="700" fill="${C.ink}">${esc(sourceType)}</text><text x="715" y="137" font-size="14" fill="${C.ink}">kd ${fmt(state.kd, 2)} · efficiency ${fmt(state.compactEfficiency, 3)}</text><text x="715" y="182" font-size="14" fill="${C.rust}">U^${state.velocityExponent} · +10% → ${fmt(state.tenPercentSpeedChangeDb, 1)} dB</text><text x="715" y="232" font-size="12" fill="${C.muted}">${esc(state.region)}</text>`;
  });
}

function mountSourceGeometry(root) {
  return shell(root, [
    { key: 'longDimension', label: 'Long dimension', min: 0.5, max: 30, step: 0.5, value: 8, unit: ' m' },
    { key: 'shortDimension', label: 'Short dimension', min: 0.2, max: 10, step: 0.2, value: 2, unit: ' m' },
    { key: 'distance', label: 'Receiver distance', min: 0.1, max: 100, step: 0.5, value: 3, unit: ' m' },
    { key: 'referenceLevel', label: 'Near-field level', min: 80, max: 150, step: 1, value: 105, unit: ' dB' }
  ], 'Engineering takeaway: the distance law changes as the receiver resolves fewer source dimensions; point-source spreading is not universal.', (svg, input) => {
    const state = sourceGeometryState(input), box = { x: 65, y: 65, w: 600, h: 285 }, path = chartPath(state.distances, state.levels, box, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Finite source: plane → line → point spreading')}${axes(box, 'distance (m, log)', 'level (dB)')}<path d="${path}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="715" y="92" font-size="16" fill="${C.ink}">${fmt(state.level, 1)} dB at ${fmt(state.distance, 1)} m</text><text x="715" y="138" font-size="13" fill="${C.ink}">Plane → line: ${fmt(state.planeLimit, 2)} m</text><text x="715" y="178" font-size="13" fill="${C.ink}">Line → point: ${fmt(state.lineLimit, 2)} m</text><text x="715" y="235" font-size="12" fill="${C.muted}">${esc(state.regime)}</text>`;
  });
}

function mountFanDuct(root) {
  return shell(root, [
    { key: 'ductLength', label: 'Lined duct length', min: 0, max: 30, step: 0.5, value: 12, unit: ' m' },
    { key: 'attenuationRate', label: 'Attenuation rate', min: 0, max: 1.5, step: 0.05, value: 0.45, unit: ' dB/m' },
    { key: 'branchFraction', label: 'Branch power fraction', min: 0.05, max: 1, step: 0.05, value: 0.35 },
    { key: 'grilleGeneration', label: 'Grille self-noise', min: 35, max: 90, step: 1, value: 62, unit: ' dB' },
    { key: 'rpm', label: 'Fan speed', min: 300, max: 6000, step: 100, value: 1800, unit: ' rpm' }
  ], 'Engineering takeaway: a duct network contains both attenuators and new sources; once fitting self-noise controls, more upstream liner gives diminishing receiver benefit.', (svg, input) => {
    const state = fanDuctState(input), min = Math.min(...state.stages) - 5, bars = state.stages.map((level, index) => { const h = 7 * (level - min); return `<rect x="${65 + 95 * index}" y="${350 - h}" width="58" height="${h}" fill="${index === state.stages.length - 1 ? C.rust : C.teal}"/><text x="${94 + 95 * index}" y="375" text-anchor="middle" font-size="10" fill="${C.muted}">${esc(state.stageNames[index].split(' ')[0])}</text>`; }).join('');
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Fan-to-receiver sound-power ledger')}<line x1="55" y1="350" x2="665" y2="350" stroke="${C.muted}"/>${bars}<text x="715" y="95" font-size="17" fill="${C.ink}">BPF ${fmt(state.bladePassageFrequency, 0)} Hz</text><text x="715" y="145" font-size="15" fill="${C.rust}">Regenerated share ${fmt(100 * state.regeneratedShare, 0)}%</text><text x="715" y="198" font-size="14" fill="${C.ink}">Room level ${fmt(state.roomLevel, 1)} dB</text><text x="715" y="255" font-size="12" fill="${C.muted}">${esc(state.controller)}</text>`;
  });
}

function mountOutdoor(root) {
  return shell(root, [
    { key: 'frequency', label: 'Frequency', min: 31.5, max: 8000, step: 31.5, value: 1000, unit: ' Hz' },
    { key: 'distance', label: 'Receiver distance', min: 50, max: 3000, step: 25, value: 500, unit: ' m' },
    { key: 'effectiveGradient', label: 'Sound-speed gradient', min: -0.01, max: 0.01, step: 0.0005, value: 0.002, unit: ' s⁻¹' },
    { key: 'humidity', label: 'Relative humidity', min: 5, max: 100, step: 1, value: 60, unit: '%' },
    { key: 'groundCode', label: 'Ground (0 soft / 1 mixed / 2 hard)', min: 0, max: 2, step: 1, value: 1 }
  ], 'Engineering takeaway: long-range launch noise is a banded source–atmosphere–ground problem; weather can reverse the benefit expected from source level alone.', (svg, input) => {
    const groundType = ['soft', 'mixed', 'hard'][Math.round(input.groundCode)], state = outdoorPropagationState({ ...input, groundType }), box = { x: 65, y: 65, w: 600, h: 285 }, path = chartPath(state.distances, state.levelCurve, box, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Outdoor propagation through atmosphere and ground')}${axes(box, 'distance (m, log)', 'level (dB)')}<path d="${path}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="715" y="90" font-size="18" fill="${C.ink}">${fmt(state.receivedLevel, 1)} dB received</text><text x="715" y="137" font-size="13" fill="${C.ink}">Atmosphere −${fmt(state.atmosphericLoss, 1)} dB</text><text x="715" y="177" font-size="13" fill="${C.ink}">Ground ${fmt(state.groundEffect, 1)} dB · met ${fmt(state.meteorology, 1)} dB</text><text x="715" y="232" font-size="12" fill="${C.muted}">${esc(state.weatherRegime)}</text>`;
  });
}

function mountBarrier(root) {
  return shell(root, [
    { key: 'frequency', label: 'Frequency', min: 63, max: 4000, step: 31.5, value: 500, unit: ' Hz' },
    { key: 'barrierHeight', label: 'Barrier height', min: 1, max: 12, step: 0.25, value: 5, unit: ' m' },
    { key: 'sideClearance', label: 'End bypass distance', min: 5, max: 80, step: 1, value: 30, unit: ' m' },
    { key: 'panelTl', label: 'Panel TL', min: 5, max: 45, step: 1, value: 25, unit: ' dB' },
    { key: 'leakageFraction', label: 'Open leakage fraction', min: 0, max: 0.02, step: 0.0005, value: 0.002 }
  ], 'Engineering takeaway: top-edge diffraction is only one path; a finite wall stops improving when end bypass, panel transmission, or leakage becomes dominant.', (svg, input) => {
    const state = barrierDiffractionState(input), box = { x: 65, y: 65, w: 600, h: 285 }, path = chartPath(state.frequencies, state.insertionCurve, box, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Barrier diffraction and installed bypass floor')}${axes(box, 'frequency (Hz, log)', 'insertion loss (dB)')}<path d="${path}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="715" y="92" font-size="18" fill="${C.ink}">Installed IL ${fmt(state.insertionLoss, 1)} dB</text><text x="715" y="138" font-size="13" fill="${C.ink}">Top edge ${fmt(state.topAttenuation, 1)} dB</text><text x="715" y="178" font-size="13" fill="${C.ink}">Finite end ${fmt(state.sideAttenuation, 1)} dB</text><text x="715" y="230" font-size="13" fill="${C.rust}">Controller: ${esc(state.controllingPath)}</text>`;
  });
}

function mountRoom(root) {
  return shell(root, [
    { key: 'absorption', label: 'Mean absorption', min: 0.03, max: 0.8, step: 0.01, value: 0.18 },
    { key: 'distance', label: 'Receiver distance', min: 0.2, max: 15, step: 0.1, value: 3, unit: ' m' },
    { key: 'length', label: 'Room length', min: 3, max: 30, step: 0.5, value: 10, unit: ' m' },
    { key: 'width', label: 'Room width', min: 3, max: 20, step: 0.5, value: 7, unit: ' m' },
    { key: 'height', label: 'Room height', min: 2, max: 12, step: 0.25, value: 4, unit: ' m' }
  ], 'Engineering takeaway: absorption lowers the reverberant floor and pushes critical distance outward, but it does not attenuate the direct path between source and receiver.', (svg, input) => {
    const state = roomFieldState(input), box = { x: 65, y: 65, w: 600, h: 285 }, [direct, total] = chartPaths([{ x: state.distances, y: state.directCurve }, { x: state.distances, y: state.totalCurve }], box, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Direct field meets the reverberant room floor')}${axes(box, 'distance (m, log)', 'level (dB)')}<path d="${direct}" fill="none" stroke="${C.rust}" stroke-width="4"/><path d="${total}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="715" y="90" font-size="17" fill="${C.ink}">Critical distance ${fmt(state.criticalDistance, 2)} m</text><text x="715" y="137" font-size="14" fill="${C.ink}">T60 ${fmt(state.eyringT60, 2)} s</text><text x="715" y="177" font-size="14" fill="${C.ink}">Schroeder ${fmt(state.schroederFrequency, 0)} Hz</text><text x="715" y="230" font-size="12" fill="${C.muted}">${esc(state.regime)}</text>`;
  });
}

function mountEnclosure(root) {
  return shell(root, [
    { key: 'openingArea', label: 'Open / vent area', min: 0.001, max: 1.5, step: 0.005, value: 0.08, unit: ' m²' },
    { key: 'panelTl', label: 'Panel TL', min: 10, max: 50, step: 1, value: 28, unit: ' dB' },
    { key: 'openingTl', label: 'Opening / silencer TL', min: 0, max: 25, step: 0.5, value: 3, unit: ' dB' },
    { key: 'flankingAreaFraction', label: 'Flanking fraction', min: 0, max: 0.08, step: 0.001, value: 0.015 },
    { key: 'internalAbsorption', label: 'Internal absorption', min: 0.05, max: 0.8, step: 0.01, value: 0.3 }
  ], 'Engineering takeaway: enclosure performance is the energy sum of panels, vents, seals, and flanks; improve the largest share rather than the highest-TL component.', (svg, input) => {
    const state = enclosureDesignState(input), box = { x: 65, y: 65, w: 600, h: 285 }, path = chartPath(state.openings, state.effectiveTlCurve, box, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Installed enclosure weakest-link trade')}${axes(box, 'open area (m², log)', 'effective TL (dB)')}<path d="${path}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="715" y="90" font-size="18" fill="${C.ink}">Installed TL ${fmt(state.effectiveTl, 1)} dB</text><text x="715" y="137" font-size="14" fill="${C.ink}">Receiver ${fmt(state.receiverLevel, 1)} dB</text><text x="715" y="182" font-size="14" fill="${C.rust}">Controller: ${esc(state.controllingPath)}</text><text x="715" y="232" font-size="12" fill="${C.muted}">Panel / opening / flank shares: ${state.pathShares.map(value => fmt(100 * value, 0)).join(' / ')}%</text>`;
  });
}

function mountAbsorberResonator(root) {
  return shell(root, [
    { key: 'reflectionMagnitude', label: 'Tube reflection magnitude', min: 0, max: 1, step: 0.01, value: 0.55 },
    { key: 'loadedT60', label: 'Loaded chamber T60', min: 0.5, max: 6, step: 0.1, value: 3.1, unit: ' s' },
    { key: 'neckArea', label: 'Resonator neck area', min: 0.0005, max: 0.02, step: 0.0005, value: 0.006, unit: ' m²' },
    { key: 'cavityVolume', label: 'Resonator cavity volume', min: 0.005, max: 0.15, step: 0.005, value: 0.03, unit: ' m³' },
    { key: 'neckLength', label: 'Neck length', min: 0.01, max: 0.2, step: 0.005, value: 0.05, unit: ' m' }
  ], 'Engineering takeaway: absorption is test- and mounting-dependent, while resonant treatment trades narrowband depth for tuning and tolerance sensitivity.', (svg, input) => {
    const state = absorberResonatorState(input), box = { x: 65, y: 65, w: 600, h: 285 }, path = chartPath(state.frequencies, state.resonanceCurve, box, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Absorption test methods and Helmholtz tuning')}${axes(box, 'frequency (Hz, log)', 'relative resonator response')}<path d="${path}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="715" y="90" font-size="15" fill="${C.ink}">Tube α ${fmt(state.normalAbsorption, 2)}</text><text x="715" y="133" font-size="15" fill="${C.rust}">Chamber α ${fmt(state.diffuseAbsorption, 2)}</text><text x="715" y="178" font-size="15" fill="${C.ink}">Helmholtz ${fmt(state.helmholtzFrequency, 0)} Hz</text><text x="715" y="225" font-size="12" fill="${C.muted}">Tube validity below ${fmt(Math.min(state.tubeCutoff, state.spacingLimit), 0)} Hz</text>`;
  });
}

function mountTunedAbsorber(root) {
  return shell(root, [
    { key: 'massRatio', label: 'Absorber mass ratio', min: 0.01, max: 0.2, step: 0.005, value: 0.05 },
    { key: 'tuningRatio', label: 'Tuning ratio', min: 0.75, max: 1.2, step: 0.005, value: 0.98 },
    { key: 'absorberDamping', label: 'Absorber damping', min: 0, max: 0.3, step: 0.005, value: 0.08 },
    { key: 'forcingFrequency', label: 'Running frequency', min: 30, max: 100, step: 0.5, value: 60, unit: ' Hz' },
    { key: 'isolationFrequency', label: 'Mount frequency', min: 4, max: 35, step: 0.5, value: 12, unit: ' Hz' }
  ], 'Engineering takeaway: tuned absorbers create a narrow antiresonance; resilient mounts provide broadband high-frequency isolation only above their crossover and require static travel.', (svg, input) => {
    const state = tunedAbsorberIsolationState(input), box = { x: 65, y: 65, w: 600, h: 285 }, [baseline, coupled] = chartPaths([{ x: state.frequencies, y: state.baselineCurve }, { x: state.frequencies, y: state.coupledCurve }], box, false, true);
    svg.innerHTML = `<rect width="1000" height="440" fill="${C.paper}"/>${title('Tuned absorber and mount isolation trade')}${axes(box, 'frequency (Hz)', 'compliance (log)')}<path d="${baseline}" fill="none" stroke="${C.rust}" stroke-width="4"/><path d="${coupled}" fill="none" stroke="${C.teal}" stroke-width="5"/><text x="715" y="90" font-size="17" fill="${C.ink}">Tuned reduction ${fmt(state.reductionDb, 1)} dB</text><text x="715" y="137" font-size="14" fill="${C.ink}">Mount T ${fmt(state.transmissibility, 2)}</text><text x="715" y="177" font-size="14" fill="${C.ink}">Static deflection ${fmt(1000 * state.staticDeflection, 1)} mm</text><text x="715" y="225" font-size="12" fill="${C.muted}">${esc(state.regime)}</text>`;
  });
}

const mounts = {
  'nonstationary-environment-lab': mountNonstationary,
  'mimo-test-control-lab': mountMimo,
  'acoustic-treatment-lab': mountTreatment,
  'source-identification-array-lab': mountSourceArray,
  'hybrid-method-ladder': mountHybrid,
  'vibroacoustic-fatigue-lab': mountFatigue,
  'mission-environment-timeline': mountMission,
  'credibility-scorecard-lab': mountCredibility,
  'launch-vibroacoustic-capstone': mountCapstone,
  'noise-control-path-lab': mountNoiseControlPath,
  'binaural-localization-lab': mountBinaural,
  'critical-band-masking-lab': mountMasking,
  'noise-metrics-criteria-lab': mountNoiseMetrics,
  'microphone-placement-lab': mountMicrophone,
  'multipole-source-lab': mountMultipole,
  'source-geometry-lab': mountSourceGeometry,
  'fan-duct-ledger-lab': mountFanDuct,
  'outdoor-propagation-lab': mountOutdoor,
  'barrier-diffraction-lab': mountBarrier,
  'room-field-lab': mountRoom,
  'enclosure-weakest-link-lab': mountEnclosure,
  'absorber-test-resonator-lab': mountAbsorberResonator,
  'tuned-absorber-isolation-lab': mountTunedAbsorber
};

export function mountProgramExpansionDemo(root, id) {
  return mounts[id] ? mounts[id](root) : null;
}
