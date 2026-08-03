const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const first = (state, keys, fallback) => {
  for (const key of keys) if (state[key] !== undefined && state[key] !== '') return state[key];
  return fallback;
};
const number = (state, keys, fallback) => {
  const value = Number(first(state, keys, fallback));
  return Number.isFinite(value) ? value : fallback;
};
const choice = (state, keys, fallback) => String(first(state, keys, fallback));

export const demoTakeawayRegistry = Object.freeze({
  'sdof-motion': state => {
    const ratio = number(state, ['ratio'], 1), damping = number(state, ['zeta'], 0.05);
    if (Math.abs(ratio - 1) < Math.max(0.08, 2 * damping)) return `The forcing is inside the resonance-sensitive region, so small frequency or damping changes can produce large response changes. Treat frequency uncertainty as a design variable here.`;
    return ratio > 1 ? `The response is above resonance; inertia is increasingly controlling motion. Verify force transmission separately, because low displacement does not automatically mean low interface load.` : `The response is stiffness-controlled below resonance. Added stiffness will move the resonance, but it may only relocate the amplification rather than remove it.`;
  },
  'damping-transmissibility': state => {
    const ratio = number(state, ['ratio'], 1);
    if (ratio < Math.SQRT2) return `This setting is not in the isolation region: transmitted force is still amplified or near the static load. Damping helps at resonance, but frequency separation is the stronger isolation lever.`;
    return `The mount is operating above the isolation crossover. Additional damping can reduce startup resonance yet increase high-frequency transmitted force, so size damping for the full operating sweep.`;
  },
  'two-mode': state => number(state, ['mode'], 1) < 1.5
    ? `The selected lower mode is predominantly in phase, so the coupling spring deforms less and the system moves more like one assembly. Interface loads may remain modest even when total motion is large.`
    : `The selected upper mode is predominantly out of phase, concentrating deformation and load in the coupling path. Joint stiffness and local fatigue deserve extra attention near this mode.`,
  'beam-wave': state => number(state, ['view'], 0) > 0.5
    ? `This is a traveling-wave view: phase and energy propagate along the beam, so direction and termination impedance matter. Reflections can convert this field into standing-wave hot spots.`
    : `This is a standing mode with fixed nodes. Sensor, actuator, or attachment placement near a node can hide the response even while antinodes carry large motion.`,
  'dispersion': state => {
    const stiffness = number(state, ['stiffness'], 1);
    return `Flexural components separate because group speed increases with frequency${stiffness > 1.2 ? ' and the elevated bending stiffness moves the packet faster' : stiffness < 0.8 ? ' while the reduced bending stiffness slows the packet' : ''}. For transients, arrival time and pulse shape cannot be inferred from one phase velocity.`;
  },
  'coincidence': state => {
    const thickness = number(state, ['thickness'], 3), modulus = number(state, ['modulus'], 69);
    return `The selected ${thickness.toFixed(1)} mm, ${modulus.toFixed(0)} GPa plate has a property-dependent coincidence crossing. Changes that improve low-frequency stiffness can shift the efficient-radiation band into a critical launch-acoustic range.`;
  },
  'radiation-efficiency': state => number(state, ['ratio'], 0.6) < 1
    ? `The panel is subcritical, so most bending-wave content cannot radiate as a propagating acoustic wave. Edges, discontinuities, and finite-size effects are therefore the likely radiation paths.`
    : `The panel is at or above coincidence and can radiate efficiently over its area. Reducing vibration alone may be insufficient; detuning critical frequency or adding damping near the crossing can matter.`,
  'ring': state => {
    const ratio = number(state, ['ratio'], 1);
    return ratio < 0.8 ? `The shell is below the ring-frequency scale, where curvature and membrane action strongly shape the response. A flat-plate approximation can miss both frequency and load path.` : ratio > 1.2 ? `The shell is above the ring-frequency scale and becomes progressively more plate-like locally. Curvature still controls global modes and boundary coupling, so retain it in system models.` : `The response is near the ring-frequency transition, where shell curvature changes the governing wave behavior. Expect model sensitivity and check shell theory against test or higher fidelity.`;
  },
  'psd-response': state => {
    const damping = number(state, ['zeta'], 0.05), fn = number(state, ['fn'], 250);
    return `The ${fn.toFixed(0)} Hz resonance filters the input PSD rather than responding to overall input GRMS alone. With ${(100 * damping).toFixed(1)}% damping, the local spectral level near resonance controls response and fatigue.`;
  },
  'srs-bank': state => {
    const duration = number(state, ['duration'], 4);
    return `A ${duration.toFixed(1)} ms pulse excites a bank of oscillators, so the SRS is an envelope of peak responses—not a time history. Similar SRS curves can come from very different waveforms and durations.`;
  },
  'sandwich-regimes': state => {
    const frequency = number(state, ['hc-frequency'], 1000), loss = number(state, ['hc-loss'], 0.01);
    return `At ${frequency.toFixed(0)} Hz, interpret the sandwich wave speed together with modal population and overlap. A loss factor of ${loss.toFixed(3)} does not make SEA valid if the band still contains too few modes.`;
  },
  'energy-bias': state => {
    const sensors = number(state, ['eb-sensors'], 6), mx = number(state, ['eb-modex'], 2), my = number(state, ['eb-modey'], 1);
    return `${sensors} response points are being used against a (${mx.toFixed(0)}, ${my.toFixed(0)}) spatial pattern. Energy estimates become placement-sensitive when the sensor grid cannot resolve both the mode shape and nonuniform mass.`;
  },
  'wavenumber-transmission': state => {
    const tau = number(state, ['wk-tau'], 0.2), delta = number(state, ['wk-delta'], 3);
    return `The target power transmission is ${tau.toFixed(2)}, but the recovered value also depends on the k-space filter width (${delta.toFixed(2)} 1/m). Treat aperture, leakage, and directional separation as measurement uncertainty—not joint physics.`;
  },
  'junction-transmission': state => {
    const model = choice(state, ['jt-model'], 'paper-lap');
    return `The ${model.replaceAll('-', ' ')} description makes the connection itself part of the transmission model. Do not infer joint power flow from the adjoining panel impedances without validating the actual fastener or sleeve path.`;
  },
  'joint-acceptance': state => {
    const velocity = number(state, ['ja-velocity'], 120), frequency = number(state, ['ja-frequency'], 500);
    return `At ${frequency.toFixed(0)} Hz and ${velocity.toFixed(0)} m/s convection speed, modal response depends on spatial phase matching as much as pressure level. A high point PSD can still produce weak generalized force through cancellation.`;
  },
  'spatial-field': state => {
    const model = choice(state, ['spatial-model', 'model'], 'diffuse');
    return `The ${model.replaceAll('-', ' ')} field changes coherence and phase across the panel while holding local level conceptually separate. Distributed-load predictions require the cross-spectrum, not only a single-point spectrum.`;
  },
  'sea-flow': state => {
    const coupling = number(state, ['clf-coupling'], 0.015), split = number(state, ['clf-split'], 0);
    return `With η₁₂ = ${coupling.toFixed(3)} and ${Math.round(100 * split)}% of input applied to subsystem 2, gross exchange can remain bidirectional even when net flow reverses. Use net flow for the load path and gross flow for coupling activity.`;
  },
  'modal-radiation-patterns': state => {
    const m = number(state, ['modeX'], 3), n = number(state, ['modeY'], 2);
    return `Mode (${m.toFixed(0)}, ${n.toFixed(0)}) contains positive and negative velocity regions that cancel in the far field. Surface RMS velocity alone is therefore not a reliable proxy for radiated sound power.`;
  },
  'piston-fluid-loading': state => {
    const radius = number(state, ['radius'], 0.12), frequency = number(state, ['frequency'], 800), ka = 2 * Math.PI * frequency * radius / 343;
    return ka < 1 ? `ka ≈ ${ka.toFixed(2)}: fluid loading is mainly reactive and the source is broadly radiating. Added mass can shift structural modes before acoustic power becomes efficient.` : `ka ≈ ${ka.toFixed(2)}: radiation resistance and directivity are becoming important. Receiver angle now matters when converting surface motion to acoustic load.`;
  },
  'shell-wave-map': state => {
    const order = number(state, ['circumferentialOrder'], 2);
    return `Circumferential order ${order.toFixed(0)} sits in a curvature-dependent shell family. Compare its frequency with ring, coincidence, and cavity cut-on scales before choosing a plate, beam, or shell simplification.`;
  },
  'fe-be-model-trust': state => {
    const frequency = number(state, ['maximumFrequency'], 2000), structural = number(state, ['structuralElementsPerWave'], 10), acoustic = number(state, ['acousticElementsPerWave'], 8);
    return `The model is being sized to ${frequency.toFixed(0)} Hz with ${structural.toFixed(0)} structural and ${acoustic.toFixed(0)} acoustic elements per wavelength. Convergence—not element count alone—must establish the trustworthy upper frequency.`;
  },
  'panel-tl-angle': state => {
    const angle = number(state, ['incidenceDegrees'], 45), damping = number(state, ['lossFactor'], 0.02);
    return `At ${angle.toFixed(0)}° incidence, the coincidence trough is shifted from its normal-incidence position. The ${damping.toFixed(3)} loss factor mainly fills the trough; it does not create a uniform TL increase.`;
  },
  'orthotropic-coincidence': state => {
    const direction = number(state, ['directionDegrees'], 25), scale = number(state, ['d22Scale'], 0.4);
    return `At ${direction.toFixed(0)}° with weak-axis stiffness scaled to ${scale.toFixed(2)}, the panel has a directional—not single—critical frequency. Launch acoustic incidence and laminate orientation should be assessed together.`;
  },
  'loss-factor-paths': state => {
    const internal = number(state, ['internal'], 0.012), radiation = number(state, ['radiation'], 0.006), joint = number(state, ['joint'], 0.004);
    const dominant = internal >= radiation && internal >= joint ? 'material' : radiation >= joint ? 'radiation' : 'joint';
    return `The largest selected loss path is ${dominant} damping. Because loss factors represent distinct power exits, a treatment is effective only if it changes the path controlling the assembled launch-vehicle structure.`;
  },
  'modal-test-grid': state => {
    const x = number(state, ['driveX'], 0.23), y = number(state, ['driveY'], 0.31);
    return `The drive is at (${x.toFixed(2)}L, ${y.toFixed(2)}W). If that location approaches a nodal line, a real mode can disappear from the FRF; use multiple drive and response locations before declaring it absent.`;
  },
  'sea-validity-map': state => {
    const density = number(state, ['modalDensity'], 0.04), loss = number(state, ['lossFactor'], 0.025);
    return `The selected modal density (${density.toFixed(3)} mode/Hz) and loss factor (${loss.toFixed(3)}) jointly control overlap. Use SEA only when band population, overlap, weak coupling, and spatial averaging are all credible.`;
  },
  'double-panel-energy-paths': state => {
    const medium = choice(state, ['medium'], 'air'), frequency = number(state, ['frequency'], 1000), output = choice(state, ['_summary'], '');
    const tl = output.match(/Transmission loss\s*([\d.]+)\s*dB/i)?.[1];
    return `At ${frequency.toFixed(0)} Hz with ${medium} between the panes${tl ? `, the solved network TL is ${tl} dB` : ''}. Check frames, seals, flanking paths, and low modal population before treating the ideal reciprocal chain as the installed window.`;
  },
  'khie-surface-contributions': state => {
    const frequency = number(state, ['frequency'], 800), distance = number(state, ['distance'], 1.2);
    return `At ${frequency.toFixed(0)} Hz and ${distance.toFixed(2)} m, the receiver is a coherent sum of pressure-like and velocity-like patch terms. Large individual contributions may cancel, so retain phase through the surface integration.`;
  },
  'pipe-noise-pathways': state => {
    const frequency = number(state, ['frequency'], 1000), flow = number(state, ['flowSpeed'], 60);
    return `At ${frequency.toFixed(0)} Hz and ${flow.toFixed(0)} m/s, compare convective, acoustic, and wall wavenumbers before selecting a mitigation. The dominant pressure source is not necessarily the wave family that transmits downstream.`;
  },
  'frequency-wavenumber-atlas': state => {
    const frequency = number(state, ['frequency'], 1000), convection = number(state, ['convectionSpeed'], 120);
    return `At ${frequency.toFixed(0)} Hz with ${convection.toFixed(0)} m/s convection speed, intersections identify efficient wave conversion. Near a crossing, small property or flow changes can strongly alter the launch-vehicle load path.`;
  },
  'force-to-sound-power': state => {
    const frequency = number(state, ['frequency'], 500), damping = number(state, ['lossFactor'], 0.02);
    return `At ${frequency.toFixed(0)} Hz with η = ${damping.toFixed(3)}, point mobility, modal participation, and radiation efficiency are separate filters between force and sound power. Improving only one may not control the receiver level.`;
  },
  'intensity-probe-lab': state => {
    const spacing = number(state, ['spacingMm'], 12), frequency = number(state, ['frequency'], 1000);
    return `At ${frequency.toFixed(0)} Hz with ${spacing.toFixed(1)} mm spacing, phase resolution and spatial averaging compete. Confirm the probe is inside its usable kr range before interpreting intensity direction or scan power.`;
  },
  'stress-environment-map': state => {
    const temperature = number(state, ['temperatureC'], 20), pressure = number(state, ['pressureKPa'], 0);
    return `At ${temperature.toFixed(0)}°C and ${pressure.toFixed(0)} kPa preload, curvature—not displacement alone—sets bending stress. Recompute material properties, membrane preload, fatigue, and yield margins for the actual mission environment.`;
  },
  'launch-source-map': state => {
    const frequency = number(state, ['frequency'], 250), suppression = number(state, ['suppressionDb'], 6);
    return `At ${frequency.toFixed(0)} Hz with ${suppression.toFixed(1)} dB suppression, received level is controlled by distributed plume coherence, geometry, directivity, and pad reflections. A point-source spreading law is only a screening model.`;
  },
  'wet-tank-coupling': state => {
    const fill = number(state, ['fillFraction'], 0.65), gravity = number(state, ['gravityG'], 1);
    return `At ${Math.round(100 * fill)}% fill and ${gravity.toFixed(2)} g, added mass, slosh, and liquid acoustic modes occupy different frequency scales. Track each family across flight phases instead of applying one wet-frequency correction.`;
  },
  'qualification-notching': state => {
    const margin = number(state, ['marginDb'], 3), duration = number(state, ['testDurationMinutes'], 2);
    return `The ${margin.toFixed(1)} dB margin and ${duration.toFixed(1)} minute duration must preserve damage equivalence without exceeding force, response, or workmanship limits. A notch is justified by load-path evidence, not by response discomfort alone.`;
  },
  'model-test-correlation-lab': state => {
    const test = number(state, ['testFrequency'], 436), mixing = number(state, ['shapeRotationDegrees'], 18);
    return `The test resonance is ${test.toFixed(0)} Hz with ${mixing.toFixed(0)}° of mode-shape mixing. Frequency agreement, spatial MAC, damping, and complex FRF agreement are independent evidence; update the physical parameter associated with the failed check.`;
  },
  'branching-sea-network': state => {
    const primary = number(state, ['primaryClf'], 0.018), flank = number(state, ['flankingClf'], 0.003);
    return `The primary CLF is ${primary.toFixed(3)} and the flanking CLF is ${flank.toFixed(3)}. Receiver path share comes from the solved network—not CLF size alone—so rank net arrival power while retaining gross exchange and a power-balance check.`;
  },
  'transfer-path-workbench': state => {
    const coherence = number(state, ['coherence'], 1), phase = number(state, ['phase2'], 138);
    return `At coherence ${coherence.toFixed(2)}, the shelf contribution carries ${phase.toFixed(0)}° phase. Preserve complex path phase and installation impedance: reducing one standalone path can remove favorable cancellation and raise the assembled receiver.`;
  },
  'requirements-margin-flow': state => {
    const statistical = number(state, ['statisticalMarginDb'], 3), qualification = number(state, ['qualificationMarginDb'], 3), limit = number(state, ['responseLimit'], 22);
    return `The budget carries ${statistical.toFixed(1)} dB statistical and ${qualification.toFixed(1)} dB qualification margin with a ${limit.toFixed(0)} g response limit. Keep each factor traceable and justify any notch with flight-versus-test load-path evidence.`;
  },
  'mitigation-trade-space': state => {
    const frequency = number(state, ['frequency'], 420), target = number(state, ['requiredReductionDb'], 8);
    return `At ${frequency.toFixed(0)} Hz the design needs ${target.toFixed(1)} dB reduction. Select the option whose mechanism intersects the controlling path, then trade bandwidth, mass, thermal behavior, strength, stroke, and verification risk—not dB alone.`;
  },
  'nonlinear-joint-behavior': state => {
    const amplitude = number(state, ['amplitudeMm'], 0.7), gap = number(state, ['gapMm'], 1.2);
    return `The joint is moving ${amplitude.toFixed(2)} mm against a ${gap.toFixed(2)} mm gap. Frequency and equivalent damping can change with amplitude, preload, slip, and contact, so low-level modal properties may not represent qualification response.`;
  },
  'fairing-cavity-field': state => {
    const frequency = number(state, ['frequency'], 315), receiver = number(state, ['receiverX'], 0.72);
    return `At ${frequency.toFixed(0)} Hz the payload is at ${receiver.toFixed(2)}L. In a sparse fairing cavity, source and payload position relative to modal nodes can matter more than the band-average level; earn diffuse-field assumptions with population and overlap.`;
  },
  'uncertainty-sensitivity-lab': state => {
    const frequency = number(state, ['frequencyCov'], 0.04), q = number(state, ['qCov'], 0.25), psd = number(state, ['psdCov'], 0.2);
    return `The input COVs are ${(100 * frequency).toFixed(1)}% frequency, ${(100 * q).toFixed(1)}% Q, and ${(100 * psd).toFixed(1)}% PSD. Use the response tail and sensitivity ranking to target evidence; a nominal curve plus undifferentiated margin is not a confidence bound.`;
  },
  'miles-validity': state => {
    const q = number(state, ['q'], 10), slope = number(state, ['slopeDbPerOctave'], 0), frequency = number(state, ['naturalFrequency'], 100);
    return Math.abs(slope) < 1
      ? `At ${frequency.toFixed(0)} Hz and Q=${q.toFixed(1)}, Miles samples an approximate ${Math.max(frequency / q, 0).toFixed(1)} Hz modal bandwidth. The locally flat PSD supports the approximation; still check nearby breakpoints, modes, and nonlinearities.`
      : `At ${frequency.toFixed(0)} Hz and Q=${q.toFixed(1)}, Miles samples an approximate ${Math.max(frequency / q, 0).toFixed(1)} Hz modal bandwidth. The ${slope.toFixed(1)} dB/octave local slope makes numerical VRS integration the stronger result.`;
  },
  'extreme-response-spectrum': state => {
    const duration = number(state, ['duration'], 60), bandwidth = number(state, ['bandwidth'], 12), probability = number(state, ['exceedanceProbability'], 0.01);
    return `A ${duration.toFixed(0)} s record and ${bandwidth.toFixed(1)} Hz response bandwidth create about ${Math.max(1, 2 * duration * bandwidth).toFixed(0)} peak opportunities. The ${(100 * probability).toFixed(2)}% exceedance extreme is probabilistic—not a time history, population tolerance, or universal 3σ value.`;
  },
  'nonstationary-environment-lab': state => {
    const width = number(state, ['eventWidth'], 0.75), kurtosis = number(state, ['kurtosis'], 5), exponent = number(state, ['fatigueExponent'], 6);
    return `The ${width.toFixed(2)} s burst with kurtosis ${kurtosis.toFixed(1)} concentrates peak and fatigue exposure that an average PSD can hide. With fatigue exponent ${exponent.toFixed(1)}, preserve event timing and tail statistics in the requirement.`;
  },
  'mimo-test-control-lab': state => {
    const frequency = number(state, ['frequency'], 180), fixture = number(state, ['fixtureFrequency'], 220), coupling = number(state, ['crossCoupling'], 0.22);
    return `At ${frequency.toFixed(0)} Hz versus a ${fixture.toFixed(0)} Hz fixture mode, cross-axis coupling is ${coupling.toFixed(2)}. Control the complex spectral matrix and inspect uncontrolled forces and moments; matching two diagonal PSDs is not a MIMO match.`;
  },
  'acoustic-treatment-lab': state => {
    const thickness = number(state, ['thicknessMm'], 50), gap = number(state, ['airGapMm'], 25), coverage = number(state, ['coverage'], 0.7);
    return `The ${thickness.toFixed(0)} mm absorber with a ${gap.toFixed(0)} mm gap covers ${Math.round(100 * coverage)}% of the area. Low-frequency benefit remains depth-limited, while seams and uncovered paths can set installed performance before coupon absorption does.`;
  },
  'source-identification-array-lab': state => {
    const frequency = number(state, ['frequency'], 1200), spacing = number(state, ['spacingMm'], 90), microphones = number(state, ['microphoneCount'], 12), halfWavelengthMm = 343 / frequency * 500;
    return `At ${frequency.toFixed(0)} Hz, ${microphones.toFixed(0)} microphones are spaced ${spacing.toFixed(0)} mm apart; the λ/2 limit is about ${halfWavelengthMm.toFixed(0)} mm. If spacing exceeds it, treat secondary lobes as possible aliases rather than new launch sources.`;
  },
  'hybrid-method-ladder': state => {
    const frequency = number(state, ['frequency'], 800), loss = number(state, ['lossFactor'], 0.025), volume = number(state, ['cavityVolume'], 18);
    return `At ${frequency.toFixed(0)} Hz with η=${loss.toFixed(3)} and a ${volume.toFixed(0)} m³ cavity, method credibility depends on wavelength, modal population, and overlap together. Require a conservation and convergence check at every deterministic–statistical handoff.`;
  },
  'vibroacoustic-fatigue-lab': state => {
    const stress = number(state, ['stressRmsMpa'], 12), repeats = number(state, ['missionRepeats'], 4), kurtosis = number(state, ['kurtosis'], 3);
    return `${stress.toFixed(1)} MPa RMS repeated ${repeats.toFixed(0)} times accumulates damage linearly with exposure but nonlinearly with stress range; kurtosis ${kurtosis.toFixed(1)} also changes the damaging tail. Validate spectral estimates against stress rainflow counting when margin is small.`;
  },
  'mission-environment-timeline': state => {
    const acoustic = number(state, ['acousticScale'], 1), buffet = number(state, ['buffetScale'], 1), shock = number(state, ['shockScale'], 1), thermal = number(state, ['thermalScale'], 1);
    const dominant = [['acoustic', acoustic], ['buffet', buffet], ['shock', shock], ['thermal', thermal]].sort((a, b) => b[1] - a[1])[0][0];
    return `The largest selected environment scale is ${dominant}. Do not convert that into one vehicle-wide “worst event”: fairing, payload, avionics, and tank systems weight acoustics, random vibration, shock, duration, and thermal state differently.`;
  },
  'credibility-scorecard-lab': state => {
    const validation = number(state, ['validation'], 2), configuration = number(state, ['configuration'], 2), verification = number(state, ['verification'], 4);
    return `Verification evidence is ${verification.toFixed(0)}/5, but independent validation and flight-configuration match are ${validation.toFixed(0)}/5 and ${configuration.toFixed(0)}/5. A strong code check cannot substitute for evidence that the model represents this hardware and intended decision.`;
  },
  'launch-vibroacoustic-capstone': state => {
    const source = number(state, ['sourceOaspl'], 152), tl = number(state, ['fairingTl'], 18), flanking = number(state, ['flankingPenalty'], 5), uncertainty = number(state, ['uncertaintyDb'], 3);
    return `The ${source.toFixed(1)} dB source sees ${Math.max(0, tl - flanking).toFixed(1)} dB effective installed TL after flanking, with ${uncertainty.toFixed(1)} dB carried to the payload decision. Improve the receiver-sensitive link, then verify that benefit in the assembled path.`;
  },
  'noise-control-path-lab': state => {
    const airborne = number(state, ['path1Reduction'], 8), flank = number(state, ['path2Reduction'], 3), leak = number(state, ['path3Reduction'], 0);
    return `The path treatments are ${airborne.toFixed(1)}, ${flank.toFixed(1)}, and ${leak.toFixed(1)} dB. Receiver benefit approaches the untreated-path energy floor, so recalculate path shares after every mitigation instead of extending one component's dB benefit indefinitely.`;
  },
  'binaural-localization-lab': state => {
    const frequency = number(state, ['frequency'], 1000), azimuth = number(state, ['azimuth'], 35);
    return `At ${frequency.toFixed(0)} Hz and ${azimuth.toFixed(0)}° azimuth, localization combines arrival-time and head-shadow level differences. Low frequencies emphasize timing; high frequencies emphasize level, and reflections or hearing protection can corrupt both cues.`;
  },
  'critical-band-masking-lab': state => {
    const tone = number(state, ['soundLevel'], 80), masker = number(state, ['maskerLevel'], 68), width = number(state, ['maskerBandwidth'], 160);
    return `The ${tone.toFixed(0)} dB tone is judged against a ${masker.toFixed(0)} dB masker spread over ${width.toFixed(0)} Hz. Audibility depends on masker energy inside the same auditory filter, so overall dBA alone cannot establish warning or speech detectability.`;
  },
  'noise-metrics-criteria-lab': state => {
    const event = number(state, ['eventLevel'], 92), duration = number(state, ['eventDuration'], 12), total = number(state, ['totalDuration'], 3600);
    return `A ${event.toFixed(0)} dB event lasting ${duration.toFixed(0)} s is being summarized over ${total.toFixed(0)} s. SEL preserves single-event energy while Leq dilutes it into the reporting interval; percentile and time-of-day metrics answer still different receiver questions.`;
  },
  'microphone-placement-lab': state => {
    const frequency = number(state, ['frequency'], 4000), angle = number(state, ['incidenceAngle'], 0), wind = number(state, ['windSpeed'], 4);
    return `At ${frequency.toFixed(0)} Hz, ${angle.toFixed(0)}° incidence, and ${wind.toFixed(1)} m/s wind, capsule scattering, field correction, reflection geometry, and flow contamination can exceed the change under test. Calibration sensitivity alone does not validate the setup.`;
  },
  'multipole-source-lab': state => {
    const order = Math.round(number(state, ['sourceOrder'], 1)), frequency = number(state, ['frequency'], 500), types = ['monopole', 'dipole', 'quadrupole'];
    return `The selected ${types[order] ?? 'source'} at ${frequency.toFixed(0)} Hz has a mechanism-specific directivity and velocity exponent. Use source order to guide scaling and diagnostics, then replace the ideal pattern with installed directivity and boundary effects.`;
  },
  'source-geometry-lab': state => {
    const long = number(state, ['longDimension'], 8), short = number(state, ['shortDimension'], 2), distance = number(state, ['distance'], 3);
    return `At ${distance.toFixed(1)} m from a ${long.toFixed(1)} × ${short.toFixed(1)} m source, apparent dimensionality determines whether spreading is plane-, line-, or point-like. A universal 6 dB-per-doubling rule can misstate plume, vehicle, panel, and duct-outlet benefit.`;
  },
  'fan-duct-ledger-lab': state => {
    const length = number(state, ['ductLength'], 12), rate = number(state, ['attenuationRate'], 0.45), grille = number(state, ['grilleGeneration'], 62);
    return `The liner supplies ${Math.max(0, length * rate).toFixed(1)} dB nominal duct loss, but the grille regenerates ${grille.toFixed(0)} dB sound power downstream. Keep branch division, fitting self-noise, breakout, pressure drop, and room correction in one banded network ledger.`;
  },
  'outdoor-propagation-lab': state => {
    const frequency = number(state, ['frequency'], 1000), distance = number(state, ['distance'], 500), gradient = number(state, ['effectiveGradient'], 0.002);
    return `At ${frequency.toFixed(0)} Hz and ${distance.toFixed(0)} m, a gradient of ${gradient.toFixed(4)} s⁻¹ can refract energy while atmosphere and ground reshape the band. Correlate outdoor launch noise by meteorological class rather than folding weather into source power.`;
  },
  'barrier-diffraction-lab': state => {
    const height = number(state, ['barrierHeight'], 5), panel = number(state, ['panelTl'], 25), leak = number(state, ['leakageFraction'], 0.002);
    return `The ${height.toFixed(1)} m barrier uses a ${panel.toFixed(0)} dB panel with ${(100 * leak).toFixed(2)}% open leakage. Installed insertion loss is the energy sum of top diffraction, finite ends, panel transmission, and gaps—not the best single path.`;
  },
  'room-field-lab': state => {
    const absorption = number(state, ['absorption'], 0.18), distance = number(state, ['distance'], 3);
    return `At ${distance.toFixed(1)} m with mean absorption ${absorption.toFixed(2)}, compare the direct source term with the reverberant room floor. Added absorption lowers late-field level and expands critical distance, but it does not attenuate the direct path.`;
  },
  'enclosure-weakest-link-lab': state => {
    const opening = number(state, ['openingArea'], 0.08), panel = number(state, ['panelTl'], 28), flank = number(state, ['flankingAreaFraction'], 0.015);
    return `A ${opening.toFixed(3)} m² opening and ${(100 * flank).toFixed(2)}% flanking fraction remain in parallel with the ${panel.toFixed(0)} dB panel. Improve the largest transmitted-energy share before adding mass to an already strong enclosure wall.`;
  },
  'absorber-test-resonator-lab': state => {
    const reflection = number(state, ['reflectionMagnitude'], 0.55), decay = number(state, ['loadedT60'], 3.1), volume = number(state, ['cavityVolume'], 0.03);
    return `A tube reflection magnitude of ${reflection.toFixed(2)}, loaded decay of ${decay.toFixed(1)} s, and ${volume.toFixed(3)} m³ resonator cavity describe different evidence. Absorption is method- and mounting-dependent; resonant treatment also requires tuning and tolerance checks.`;
  },
  'tuned-absorber-isolation-lab': state => {
    const mass = number(state, ['massRatio'], 0.05), tuning = number(state, ['tuningRatio'], 0.98), mount = number(state, ['isolationFrequency'], 12);
    return `The absorber uses ${(100 * mass).toFixed(1)}% mass at tuning ratio ${tuning.toFixed(3)}, while the mount resonance is ${mount.toFixed(1)} Hz. Check off-tune amplification, stroke, static deflection, temperature, and operating-speed sweep before claiming installed control.`;
  },
  'sea-parameter-chain': state => {
    const frequency = number(state, ['frequency'], 1000), preset = choice(state, ['preset'], 'honeycombFairing');
    return `At ${frequency.toFixed(0)} Hz the ${preset.replaceAll(/([A-Z])/g, ' $1').toLowerCase()} result depends on a linked modal-density, loss, radiation, coupling, power, and recovery chain. Audit the least-supported parameter before adding margin to the final response.`;
  },
  'modal-density-regime-map': state => {
    const frequency = number(state, ['frequency'], 1000), loss = number(state, ['lossFactor'], 0.02), type = choice(state, ['type'], 'plate-bending');
    return `The ${type.replaceAll('-', ' ')} population at ${frequency.toFixed(0)} Hz must be judged using both modes per band and overlap with η=${loss.toFixed(3)}. A dense bending family does not make every wave family or connected subsystem statistical.`;
  },
  'sea-driving-point-mobility': state => {
    const model = choice(state, ['model'], 'plate-center'), force = number(state, ['forceRms'], 10);
    return `The ${model.replaceAll('-', ' ')} model converts the ${force.toFixed(1)} N RMS force into power through drive-point conductance. A transfer-FRF magnitude cannot replace this real local power input without phase and impedance evidence.`;
  },
  'sea-coupling-mechanisms': state => {
    const mechanism = choice(state, ['mechanism'], 'line-joint'), ratio = number(state, ['modalDensityRatio'], 4.5);
    return `The ${mechanism.replaceAll('-', ' ')} link has n₂/n₁=${ratio.toFixed(2)}, so reciprocity requires unequal directional CLFs. Keep point, line, area, resonant, and nonresonant paths separate before ranking net receiver power.`;
  },
  'environment-to-sea-power': state => {
    const source = choice(state, ['source'], 'diffuse'), frequency = number(state, ['frequency'], 1000), velocity = number(state, ['convectionVelocity'], 220);
    return `At ${frequency.toFixed(0)} Hz the ${source.replaceAll('-', ' ')} source with Uc=${velocity.toFixed(0)} m/s is filtered by mobility, modal density, radiation, or spatial acceptance before becoming SEA watts. Equal pressure RMS does not imply equal injected power.`;
  },
  'tbl-convection-velocity-map': state => {
    const model = choice(state, ['model'], 'totaro'), frequency = number(state, ['frequency'], 1000), thickness = number(state, ['displacementThicknessMm'], 12);
    return `The ${model.replaceAll('-', ' ')} model at ${frequency.toFixed(0)} Hz and δ*=${thickness.toFixed(1)} mm changes convective wavelength, Corcos correlation length, and modal acceptance together. Select it by local attached or separated flow evidence.`;
  },
  'equipment-smearing-map': state => {
    const mass = number(state, ['equipmentMass'], 45), footprint = number(state, ['footprintArea'], 0.35);
    return `The ${mass.toFixed(0)} kg equipment item occupies ${footprint.toFixed(2)} m². Global mass smearing and local footprint loading answer different response questions; use the spread to decide where an explicit attachment or local panel model is required.`;
  },
  'sea-local-response': state => {
    const type = choice(state, ['responseType'], 'broadband'), distance = number(state, ['boundaryDistance'], 0.2), loss = number(state, ['lossFactor'], 0.02);
    return `The ${type.replaceAll('-', ' ')} concentration screen uses η=${loss.toFixed(3)} at a point ${distance.toFixed(2)} m from the boundary. Report the SEA spatial average separately from the local maximum estimate and replace boundary-critical receivers with deterministic evidence.`;
  },
  'radiation-efficiency-construction-map': state => {
    const model = choice(state, ['model'], 'baffled-panel'), frequency = number(state, ['frequency'], 1000), thickness = number(state, ['thicknessMm'], 3);
    return `The ${model.replaceAll('-', ' ')} at ${frequency.toFixed(0)} Hz and ${thickness.toFixed(1)} mm thickness has construction-specific radiation behavior. Use the same efficiency consistently when converting velocity to power, resistance, and panel-air CLF.`;
  },
  'fairing-blanket-network': state => {
    const coverage = number(state, ['blanketCoverage'], 80), insertion = number(state, ['blanketInsertionLoss'], 18), leak = number(state, ['leakAreaPercent'], 0.05);
    return `${coverage.toFixed(0)}% blanket coverage at ${insertion.toFixed(1)} dB IL still competes with ${leak.toFixed(2)}% opening area and the resonant shell path. Improve the largest solved power share; coupon IL and component TL are not installed payload-cavity reduction.`;
  }
});

export function assertDemoTakeaway(takeaway, id = 'demo') {
  if (!takeaway || takeaway.id !== id) throw new Error(`${id}: invalid engineering takeaway identity`);
  if (typeof takeaway.summary !== 'string' || takeaway.summary.length < 45) throw new Error(`${id}: engineering takeaway is missing or too short`);
  if (takeaway.summary.length > 420) throw new Error(`${id}: engineering takeaway must remain short`);
  return takeaway;
}

export function buildDemoTakeaway(id, state = {}) {
  const factory = demoTakeawayRegistry[id];
  if (typeof factory !== 'function') throw new Error(`${id}: no engineering takeaway is registered`);
  return assertDemoTakeaway({ id, summary: String(factory(Object.freeze({ ...state }))).trim() }, id);
}

export function assertDemoTakeawayRegistry(demos) {
  const ids = demos.map(demo => demo.id);
  const missing = ids.filter(id => typeof demoTakeawayRegistry[id] !== 'function');
  const orphaned = Object.keys(demoTakeawayRegistry).filter(id => !ids.includes(id));
  if (missing.length || orphaned.length) throw new Error(`Demo takeaway registry mismatch. Missing: ${missing.join(', ') || 'none'}. Orphaned: ${orphaned.join(', ') || 'none'}.`);
  ids.forEach(id => buildDemoTakeaway(id));
  return true;
}

function readDemoState(root) {
  const state = {};
  root.querySelectorAll('input, select, textarea').forEach(element => {
    const key = element.dataset.acsKey || element.dataset.seaGlobal || element.name || element.id
      ?.replace(/^(demo-|acs-|sea-)/, '');
    if (!key) return;
    const raw = element.type === 'checkbox' ? element.checked : element.value;
    const numeric = element.type === 'range' || element.type === 'number';
    state[key] = numeric && Number.isFinite(Number(raw)) ? Number(raw) : raw;
  });
  const summary = root.querySelector('.sea-builder-summary');
  if (summary) state._summary = summary.textContent.replace(/\s+/g, ' ').trim();
  return state;
}

export function mountDemoTakeaway(root, id) {
  const region = document.createElement('aside');
  region.className = 'demo-takeaway';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  root.append(region);
  const render = () => {
    if (region.parentElement !== root) root.append(region);
    const takeaway = buildDemoTakeaway(id, readDemoState(root));
    region.innerHTML = `<p class="demo-takeaway-label">Engineering takeaway <span>Updates with the model</span></p><p>${esc(takeaway.summary)}</p>`;
  };
  const schedule = () => queueMicrotask(render);
  root.addEventListener('input', schedule);
  root.addEventListener('change', schedule);
  root.addEventListener('click', schedule);
  render();
  return () => {
    root.removeEventListener('input', schedule);
    root.removeEventListener('change', schedule);
    root.removeEventListener('click', schedule);
    region.remove();
  };
}
