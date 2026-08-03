/* Program-level chapters that complete a launch-vehicle vibroacoustic workflow. */

const modules = [
  {
    id: 'nonstationary-nongaussian-environments', number: '41', caseNumber: '38', toolId: 'nonstationary-environment', demoId: 'nonstationary-environment-lab',
    title: 'Nonstationary & Non-Gaussian Environments', eyebrow: 'Preserve when and how the energy arrives',
    summary: 'Move beyond one stationary PSD by retaining event timing, evolving spectra, heavy tails, peak opportunity, and fatigue concentration.',
    source: 'ACS 519 random-response, signal-processing, and uncertainty material; launch-event synthesis', equation: 'Gaa(f,t) → σa(t), peaks, and ∫σa(t)^b dt',
    mechanism: 'A local spectrum describes how response energy changes through an event. A kurtosis correction represents heavy-tailed peak populations, while a nonlinear fatigue exponent makes short high-level intervals disproportionately important.',
    intuition: 'A time-averaged PSD is a photograph made by stacking every frame of a movie. It can preserve total energy while erasing the burst that produced the peak load or most of the fatigue damage.',
    launch: 'Ignition, hold-down release, liftoff, transonic buffet, engine transitions, staging, pyroshock, and shutdown are not one stationary population. Vehicle configuration and load path can change within the same record.',
    findings: ['A stationary surrogate can match mean square yet underpredict an event-local peak.', 'Kurtosis changes tail probability without changing RMS, so Gaussian crest factors can be nonconservative.', 'Fatigue is more sensitive than RMS to concentrated exposure when the stress-life exponent is large.', 'Spectrograms, window statistics, and event segmentation are part of the environment definition—not optional post-processing.'],
    decisions: ['Segment by physical event and configuration before estimating spectra.', 'Report local RMS, kurtosis, duration, and confidence with the PSD.', 'Use time-domain or evolutionary-spectrum methods when timing, phase, clipping, or nonlinear response matters.'],
    limitation: 'The paired model imposes a Gaussian burst envelope, a local Miles response, and a screening kurtosis correction. It does not synthesize a unique time history or model nonlinear response.',
    references: 'Priestley evolutionary spectra; Rice peak statistics; Lalanne random vibration; NASA launch-environment practice.'
  },
  {
    id: 'multiaxis-mimo-testing', number: '42', caseNumber: '39', toolId: 'mimo-test-control', demoId: 'mimo-test-control-lab',
    title: 'Multi-Axis & MIMO Vibration Testing', eyebrow: 'Control the spectral matrix, not isolated axes',
    summary: 'Connect complex cross-spectral inputs, fixture coupling, matrix FRFs, coherence, conditioning, and uncontrolled response.',
    source: 'ACS 519 matrix dynamics, FRFs, signal estimation, and qualification concepts', equation: 'Gyy(ω)=H(ω)Gxx(ω)Hᴴ(ω)',
    mechanism: 'A multi-axis test propagates the complete input cross-spectral matrix through a complex transfer matrix. Off-diagonal fixture terms, input phase, and matrix conditioning decide whether scalar axis-by-axis control reproduces the field.',
    intuition: 'Two shakers do not merely add two tests. Together they create an evolving force direction, phase relationship, and moment that can either reproduce or cancel an interface mode.',
    launch: 'Vehicle and payload interfaces see simultaneous translations, rotations, correlated forces, and spatially distributed acoustic forcing. Sequential single-axis tests can miss coupled modes or over-accumulate fatigue.',
    findings: ['Matching diagonal PSDs does not match the cross-spectral matrix.', 'Fixture modes can turn a nominally orthogonal drive into strong cross-axis response.', 'Poor conditioning makes small model or sensor errors demand large drive corrections.', 'Control-channel agreement must be supplemented by limit channels, interface forces, moments, and uncontrolled DOFs.'],
    decisions: ['Measure the complex matrix FRF with the flight-like fixture and mass configuration.', 'Set spectral-matrix targets and tolerances only where flight coherence is credible.', 'Use regularization, axis transformation, or fixture redesign when the inverse control problem is ill conditioned.'],
    limitation: 'The lab is a linear 2×2 single-mode fixture screen. Real tests include more axes, rotational DOFs, multiple modes, controller limits, nonlinear joints, and time-varying coherence.',
    references: 'MIMO random-vibration control literature; Bendat & Piersol; NASA force/response-limited vibration guidance.'
  },
  {
    id: 'acoustic-treatments', number: '43', caseNumber: '40', toolId: 'acoustic-treatment', demoId: 'acoustic-treatment-lab',
    title: 'Acoustic Treatments, Blankets & Liners', eyebrow: 'Turn material properties into installed benefit',
    summary: 'Relate porous impedance, depth, backing gap, coverage, limp mass, cavity decay, and installed insertion loss.',
    source: 'ACS 519 p. 331 and p. 426 treatment/liner discussions plus the SEA cavity blocks', equation: 'α=1−|R|²;  R=(Zs−ρc)/(Zs+ρc)',
    mechanism: 'Porous material dissipates oscillatory flow through a complex impedance. Thickness and air gap set the useful low-frequency scale; blanket mass resists transmission; coverage and untreated paths determine installed rather than coupon performance.',
    intuition: 'Absorber depth buys interaction time with particle motion. A thin blanket may work well where wavelength is short yet look nearly invisible to the long wavelengths that dominate a large fairing cavity.',
    launch: 'Fairing acoustic blankets must survive compression, purge flow, ascent pressure change, temperature, contamination, seams, access panels, and tight mass/volume allocations while protecting spatially distributed payload receivers.',
    findings: ['Normal-incidence coupon absorption is not a diffuse-field installed insertion loss.', 'Partial coverage combines treated and untreated area in parallel, so gaps can dominate.', 'Added mass and porous absorption address different mechanisms and frequency ranges.', 'Frames, vents, penetrations, compression, and flanking often set the realized system floor.'],
    decisions: ['Match material flow resistivity and depth to the controlling band.', 'Model coverage, seams, compression, and backing cavity explicitly.', 'Verify reverberation/absorption behavior and installed before-after response in a representative configuration.'],
    limitation: 'The calculator uses Delany–Bazley normal-incidence impedance, an effective backing depth, and limp-mass screening. It omits curvature, diffuse incidence, trim resonances, purge flow, and flanking.',
    references: 'Delany & Bazley; Allard & Atalla; Beranek & Vér; SEA absorption and double-panel methods.'
  },
  {
    id: 'source-identification-arrays', number: '44', caseNumber: '41', toolId: 'source-identification-array', demoId: 'source-identification-array-lab',
    title: 'Source Identification & Array Diagnostics', eyebrow: 'Find the source before treating the path',
    summary: 'Use phase-resolved arrays to connect aperture, wavelength, spatial aliasing, resolution, dynamic range, and source localization.',
    source: 'ACS 519 acoustic measurement, intensity, wavenumber, and spatial-correlation concepts', equation: 'B(θ)=|Σm pm exp(+ikxm sinθ)|²',
    mechanism: 'Delay-and-sum beamforming steers an array by undoing the phase ramp from a candidate direction. Aperture controls angular resolution, while microphone spacing controls the first spatial alias.',
    intuition: 'An array is a spatial filter. A wider aperture sharpens its view; spacing sensors too far apart creates false directions just as sampling too slowly creates false frequencies.',
    launch: 'Arrays can separate plume regions, vent noise, protuberance sources, fairing leakage, panel radiation, machinery paths, and test-fixture contamination before mass is spent on the wrong mitigation.',
    findings: ['Angular resolution improves with aperture measured in wavelengths.', 'Spacing above λ/2 permits grating lobes that can masquerade as real sources.', 'Conventional beamforming reports a blurred source map, not literal source size.', 'Coherent sources, reflections, near-field curvature, flow, calibration error, and array self-noise bias the map.'],
    decisions: ['Design array spacing for the highest frequency and aperture for the lowest frequency of interest.', 'Validate localization with a known source and geometry.', 'Combine pressure arrays with intensity, vibration, operational deflection, or transfer-path evidence before declaring causality.'],
    limitation: 'The lab assumes a far-field uniform linear array with two monochromatic uncorrelated sources. It omits near-field steering, three-dimensional geometry, flow refraction, deconvolution, and calibration uncertainty.',
    references: 'Johnson & Dudgeon array processing; Dougherty aeroacoustic beamforming; sound-intensity and near-field holography methods.'
  },
  {
    id: 'hybrid-method-handoffs', number: '45', caseNumber: '42', toolId: 'hybrid-method-selection', demoId: 'hybrid-method-ladder',
    title: 'Hybrid Method Selection & Handoffs', eyebrow: 'Use the fidelity the physics can support',
    summary: 'Choose analytical, FE/BE, wave, hybrid, or SEA methods from wavelength, modal population, overlap, geometry, and decision need.',
    source: 'ACS 519 pp. 347–438 FE/BE material and pp. 472–586 SEA material', equation: 'Nband≈n(f)Δf;  M≈πfηn(f)',
    mechanism: 'Deterministic methods resolve phase and local response but grow with wavelength-based degrees of freedom. Statistical methods average modal populations and require enough modes, overlap, weak coupling, and diffuse behavior. Hybrid methods exchange power or blocked fields across the transition.',
    intuition: 'Model fidelity is not a ladder where higher is always better. A phase-exact model with uncertain joints at very high frequency can be less credible than a statistical model that asks only for stable band energy.',
    launch: 'Large vehicles span global low-frequency modes, mid-frequency panel/cavity interactions, and high-frequency statistical fields in one source–path–receiver chain. No single method is efficient and credible everywhere.',
    findings: ['Elements per wavelength is necessary for FE/BE but does not establish input or boundary-condition credibility.', 'Mode count and overlap are separate SEA gates.', 'The transition frequency differs by subsystem and can move with damping or configuration.', 'Every hybrid handoff must conserve compatible power, force, velocity, pressure, or modal-energy quantities.'],
    decisions: ['Draw a frequency-by-subsystem method map before building models.', 'Place handoffs where both adjacent methods have an overlap region of credibility.', 'Verify conservation, reciprocity, convergence, and sensitivity at every interface.'],
    limitation: 'The method ladder uses simple plate/cavity population and wavelength estimates. Real selection also depends on geometry, coupling strength, model-form uncertainty, available evidence, and required output locality.',
    references: 'Fahy & Gardonio; Lyon & DeJong; FE/BE convergence guidance; hybrid FE–SEA and wave-based methods.'
  },
  {
    id: 'vibroacoustic-fatigue', number: '46', caseNumber: '43', toolId: 'vibroacoustic-fatigue', demoId: 'vibroacoustic-fatigue-lab',
    title: 'Vibroacoustic & Acoustic Fatigue', eyebrow: 'Translate spectra into accumulated structural damage',
    summary: 'Connect stress PSD, spectral moments, bandwidth, non-Gaussianity, cycle rate, S–N data, Miner accumulation, and mission repeats.',
    source: 'ACS 519 dynamic-stress, PSD-response, damping, and qualification material', equation: 'D=Σ ni/Ni;  E[(Δσ)b] from response spectral moments',
    mechanism: 'A stress process creates a distribution of cycle ranges. Narrowband theory estimates those ranges from RMS and zero-crossing rate; bandwidth and kurtosis corrections alter the tail; the S–N exponent converts modest stress changes into large damage changes.',
    intuition: 'Fatigue remembers amplitude nonlinearly. Doubling exposure usually doubles damage, but doubling stress can multiply damage by tens or hundreds depending on the S–N slope.',
    launch: 'Fairing panels, brackets, welds, honeycomb facesheets, avionics boards, lines, and attachments accumulate damage across acoustic, buffet, engine, test, transport, and repeated qualification exposures.',
    findings: ['Acceleration PSD is not a fatigue input until the structural stress transfer is established.', 'Equal RMS processes can have different cycle distributions and damage.', 'Narrowband methods can bias broad or multimodal response; non-Gaussian tails further amplify error.', 'Qualification duration and margin must be evaluated together because PSD level enters damage through response amplitude.'],
    decisions: ['Compute or measure stress PSD at fatigue-critical details.', 'Use a spectral fatigue model appropriate to bandwidth and validate against rainflow counting when risk is material.', 'Maintain one cumulative mission/test damage ledger with configuration-specific S–N data and scatter factors.'],
    limitation: 'The paired model uses a narrowband range moment with empirical bandwidth and kurtosis corrections and a single power-law S–N curve. It omits mean stress, multiaxiality, nonlinear response, and crack growth.',
    references: 'Dirlik and narrowband spectral fatigue; Miner accumulation; MIL-HDBK-5/MMPDS material data; acoustic-fatigue practice.'
  },
  {
    id: 'combined-environment-timeline', number: '47', caseNumber: '44', toolId: 'mission-environment-timeline', demoId: 'mission-environment-timeline',
    title: 'Combined-Environment Mission Timeline', eyebrow: 'Map each subsystem to its controlling event',
    summary: 'Place acoustic, random, shock, thermal, pressure, and configuration changes on one timeline and rank subsystem severity and damage.',
    source: 'ACS 519 launch-source, structural response, qualification, and environmental-property material', equation: 'severitys,e = ||Ws · Ee||;  Dmission=Σe De',
    mechanism: 'Each mission event carries a different mix of environments and duration. Each subsystem weights those environments differently, so a vehicle-wide peak and a fatigue-controlling event need not be the same.',
    intuition: 'There is no single worst launch event. Liftoff may control fairing acoustics, max-Q may control buffet fatigue, separation may control shock, and coast may control thermal alignment.',
    launch: 'A credible payload environment follows the evolving vehicle: pad reflections, aerodynamics, propellant state, staging, venting, pressure, engine operation, separation shocks, coast, and changing boundary conditions.',
    findings: ['Peak response and cumulative damage can be controlled by different events.', 'A subsystem-specific weighting exposes why one vehicle-level envelope cannot govern every component.', 'Configuration changes can alter transfer paths even when source level falls.', 'Testing environments independently can miss interaction, sequencing, preload, temperature, and accumulated-damage effects.'],
    decisions: ['Create a mission-event/configuration matrix before deriving requirements.', 'Identify peak, fatigue, shock, clearance, and functional controllers separately for every critical subsystem.', 'Define where combined testing, sequential conditioning, analysis, or similarity evidence verifies the interaction.'],
    limitation: 'The timeline uses normalized scalar severities and fixed subsystem weights. It is a planning model, not a coupled multiphysics response prediction.',
    references: 'NASA and launch-provider environmental specifications; combined-environment test planning; mission load-cycle accounting.'
  },
  {
    id: 'verification-validation-evidence', number: '48', caseNumber: '45', toolId: 'credibility-scorecard', demoId: 'credibility-scorecard-lab',
    title: 'Verification, Validation & Evidence Maturity', eyebrow: 'Match model credibility to the decision consequence',
    summary: 'Organize equation/code verification, convergence, inputs, calibration, validation, uncertainty, configuration, and review as separate evidence.',
    source: 'ACS 519 pp. 376–379 model uncertainty/correlation discussion and NASA model-credibility practice', equation: 'credibility = evidence profile, not one correlation coefficient',
    mechanism: 'Verification asks whether equations and code were solved correctly; validation asks whether the model represents reality for its intended use. Calibration, input pedigree, uncertainty, configuration similarity, and independent review fill different evidence gaps.',
    intuition: 'A model is not simply valid or invalid. It is credible for a stated decision, frequency band, response, configuration, and consequence—up to the weakest important piece of evidence.',
    launch: 'Flight samples are scarce, tests use different boundaries, and predictions often flow into qualification levels or waivers. A structured evidence case prevents a beautiful correlated plot from becoming unsupported decision authority.',
    findings: ['Calibration data cannot also serve as independent validation without qualification.', 'Mesh convergence does not address wrong physics or wrong boundary conditions.', 'A high weighted score can hide a critical zero-evidence category, so floors matter.', 'Evidence must be configuration- and intended-use-specific; credibility does not automatically transfer to a new payload or environment.'],
    decisions: ['Write the intended use, decision threshold, and consequence before scoring evidence.', 'Close the weakest high-weight evidence gap that could reverse the decision.', 'Archive model version, inputs, assumptions, residuals, uncertainty, review, and acceptance rationale together.'],
    limitation: 'The scorecard is a transparent planning rubric, not a universal standard or certification. Program authorities must define weights, floors, and required artifacts.',
    references: 'NASA-STD-7009; ASME V&V 10/20/40; model-risk and uncertainty-quantification practice.'
  },
  {
    id: 'launch-vibroacoustic-capstone', number: '49', caseNumber: '46', toolId: 'launch-vibroacoustic-capstone', demoId: 'launch-vibroacoustic-capstone',
    title: 'Launch Vibroacoustic End-to-End Capstone', eyebrow: 'Keep the source–path–receiver chain auditable',
    summary: 'Close the full engineering loop from launch source through propagation, fairing, cavity, structure, payload, mitigation, uncertainty, and verification.',
    source: 'Integrated ACS 519 source, wave, structural, FE/BE, SEA, measurement, and qualification blocks', equation: 'source → propagation → installed TL → cavity → structure → payload → limit',
    mechanism: 'Compatible level and linear-amplitude operations connect each physical link. The capstone exposes where a component benefit is consumed by flanking, where cavity gain restores level, and where structural/payload transfer and uncertainty set the final margin.',
    intuition: 'A payload limit is the last link in a chain. Improving a link that is not controlling—or quoting its coupon performance as installed performance—does not guarantee receiver benefit.',
    launch: 'The same workflow supports early trades, acoustic-test planning, model correlation, treatment selection, qualification notching, flight reconstruction, anomaly diagnosis, and evidence-based acceptance.',
    findings: ['All dB operations must preserve whether the underlying quantity is power or amplitude.', 'Component transmission loss is reduced by leakage and flanking before it reaches the cavity.', 'Cavity and structural gains can erase apparently large source/path reductions at a narrow band.', 'Uncertainty belongs at traceable links; duplicated blanket margin creates hidden overtest while omitted correlation creates hidden risk.'],
    decisions: ['Maintain one banded source–path–receiver ledger with owner, model, units, uncertainty, and evidence for every link.', 'Rank sensitivities at the receiver before choosing mitigation.', 'Close the loop with representative measurements and update only physically traceable terms.'],
    limitation: 'The paired capstone is a one-band scalar screening chain. A flight prediction needs banded/spatial source fields, correlated transfer matrices, subsystem models, configuration history, and quantified uncertainty.',
    references: 'ACS519_Combined course notes; NASA vibroacoustic and qualification guidance; structural-acoustic source–path–receiver practice.'
  },
  {
    id: 'noise-control-workflow', number: '50', caseNumber: '47', toolId: 'noise-control-path', demoId: 'noise-control-path-lab',
    title: 'Noise-Control Workflow & Path Ranking', eyebrow: 'Control the receiver, not the loudest component',
    summary: 'Turn source–path–receiver thinking, path ranking, treatment selection, diminishing returns, and verification into one auditable noise-control workflow.',
    source: 'ACS 537 pp. 1–14: noise-control method, source–path–receiver logic, path treatments, and design process', equation: 'Lreceiver=10 log10(Σi 10^(Li/10));  ΔLsystem≠ΣiΔLi',
    mechanism: 'Independent airborne, structure-borne, duct-borne, leakage, and flanking contributions arrive in parallel. Reducing the dominant contribution reveals the next one, so the path ledger must be recalculated after every treatment.',
    intuition: 'Noise control is a weakest-link problem run backward. A 20 dB improvement to one path may deliver only 2 dB at the receiver when another path already carries comparable power.',
    launch: 'Launch pads, mobile launchers, purge systems, ground-support equipment, fairings, engine sections, avionics bays, and crewed spaces all contain multiple airborne and structure-borne paths whose ownership changes by operating phase.',
    findings: ['The receiver criterion and bandwidth must be stated before the source is ranked.', 'Source control generally prevents energy from entering every downstream path, while path and receiver control are more local.', 'Insertion loss is an installed before/after quantity and cannot be replaced by coupon transmission loss.', 'A treated path asymptotically approaches the energetic floor created by untreated paths.'],
    decisions: ['Build one banded source–path–receiver ledger with uncertainty and evidence for each link.', 'Treat the path with the greatest receiver sensitivity and feasible installed benefit.', 'Verify at matched operating state and retain enough instrumentation to prove which path changed.'],
    limitation: 'The paired tool uses three incoherent scalar paths. Real systems require banded levels, phase/coherence where appropriate, operating-state dependence, spatial response, and confidence bounds.',
    references: 'Beranek & Vér; Bies, Hansen & Howard; engineering noise-control source–path–receiver practice.'
  },
  {
    id: 'psychoacoustics-binaural-hearing', number: '51', caseNumber: '48', toolId: 'hearing-psychoacoustics', demoId: 'binaural-localization-lab',
    title: 'Hearing, Psychoacoustics & Binaural Cues', eyebrow: 'Connect spectra to what people detect and localize',
    summary: 'Explain anatomy, equal loudness, loudness, masking, critical bands, binaural timing and level cues, localization, speech, and hearing-protection implications.',
    source: 'ACS 537 pp. 14–51: hearing anatomy, auditory response, masking, critical bands, localization, and speech', equation: 'Δt≈(d/c)sinθ;  N≈2^((LN−40)/10);  ERB≈24.7(4.37f/1000+1)',
    mechanism: 'The ear converts pressure into a frequency-organized neural response. Auditory filters limit frequency resolution, masking raises detection threshold within a critical band, and the brain combines interaural time and level differences to infer direction.',
    intuition: 'Two spectra with equal dBA need not sound equally loud, be equally detectable, or support the same speech intelligibility. The ear is a bank of nonlinear, level-dependent filters with two spatially separated inputs.',
    launch: 'Crew habitability, launch-control communication, pad alarms, ground-crew exposure, abort cues, cabin warnings, and diagnostic listening require human-response metrics alongside the physical acoustic environment.',
    findings: ['Low-frequency localization relies mainly on timing while high-frequency head shadow creates useful level cues.', 'Masking is strongest when signal and masker occupy the same auditory filter.', 'A-weighting is useful for some broad comparisons but does not encode tonality, impulsiveness, duration, or binaural perception.', 'Hearing protectors change both received level and localization/communication performance.'],
    decisions: ['Preserve unweighted spectra and event timing before applying a human-response metric.', 'Check warning signals against the local masker in the relevant critical bands.', 'Evaluate communication, audibility, localization, and exposure as distinct requirements.'],
    limitation: 'The interactive model uses population-average duplex and ERB relations. It is not a hearing-conservation, audiology, speech-intelligibility, or regulatory compliance calculator.',
    references: 'ANSI S3.4; ISO 226; Zwicker & Fastl; Moore, An Introduction to the Psychology of Hearing.'
  },
  {
    id: 'noise-metrics-receiver-criteria', number: '52', caseNumber: '49', toolId: 'noise-metrics-criteria', demoId: 'noise-metrics-criteria-lab',
    title: 'Noise Metrics, Criteria & Receiver Meaning', eyebrow: 'Choose the metric that answers the decision',
    summary: 'Relate Leq, SEL, Ldn/CNEL, statistical levels, octave criteria, NC curves, speech interference, community response, and hardware environments.',
    source: 'ACS 537 pp. 51–92: descriptors, weighting, criteria, room curves, community noise, and speech interference', equation: 'Leq=10 log10[(1/T)∫10^(L(t)/10)dt];  SEL=Leq,T+10log10T',
    mechanism: 'Energy metrics integrate exposure; percentile metrics describe exceedance; penalty metrics encode time-of-day policy; criterion curves preserve spectral shape; speech metrics emphasize communication bands. Each deliberately discards different information.',
    intuition: 'A metric is a question compressed into a number. If the wrong question is asked, precise arithmetic still produces the wrong engineering decision.',
    launch: 'Launch and static-fire programs must distinguish community exposure, occupational hearing, control-room habitability, crew communication, payload acoustic qualification, and structural fatigue—even when they begin from the same measured waveform.',
    findings: ['SEL normalizes one event while Leq dilutes or accumulates events over a reporting duration.', 'Ldn and CNEL include policy penalties that are not physical amplification.', 'A single NC or weighted rating can hide low-frequency rumble, high-frequency hiss, tones, and impulses.', 'Percentile levels describe time distribution but do not reconstruct event sequence or source identity.'],
    decisions: ['Name the receiver and adverse effect before selecting a descriptor.', 'Report the spectrum and event history beside the summary metric.', 'Apply the controlling standard or program requirement without silently converting between incompatible descriptors.'],
    limitation: 'The paired calculator uses a single rectangular event, simplified percentile logic, and an educational NC curve fit. It does not establish regulatory compliance.',
    references: 'ANSI S12 series; ISO 1996; FAA/NASA community-noise practice; ASHRAE room criteria.'
  },
  {
    id: 'acoustic-measurement-practice', number: '53', caseNumber: '50', toolId: 'acoustic-measurement-planner', demoId: 'microphone-placement-lab',
    title: 'Acoustic Measurement Practice', eyebrow: 'Measure the intended field—not the instrument setup',
    summary: 'Connect microphone construction, free/pressure/random-incidence response, calibration, placement, reflections, wind, background, dynamic range, intensity, and sound-power methods.',
    source: 'ACS 537 pp. 92–155: microphones, instrumentation, calibration, field corrections, measurement geometry, intensity, and sound power', equation: 'pmic(f)=Hfield,type(f,θ)·pfield(f)+pwind+pbackground',
    mechanism: 'The microphone capsule scatters and averages the field; its correction assumes a field type and angle. Wind, mounting, reflections, background, electronics, and distance add biases that can exceed the change being measured.',
    intuition: 'A microphone does not read sound level directly. It participates in the field, converts pressure to voltage, and relies on a chain of geometric, frequency-response, calibration, and processing assumptions.',
    launch: 'Pad measurements face wind, heat, moisture, high level, ground reflection, long cables, telemetry limits, ignition transients, clipping, and rapidly changing source geometry; indoor tests face chamber modes, fixture radiation, and background systems.',
    findings: ['Free-field, pressure, and random-incidence corrections are not interchangeable at high frequency.', 'A good calibration tone does not validate placement, wind noise, field type, or an overloaded downstream channel.', 'Background subtraction becomes unstable when total and background levels are too close.', 'Sound pressure, intensity, and power are different observables and require different spatial sampling.'],
    decisions: ['Write the measurand, field assumption, geometry, dynamic range, and correction chain before selecting sensors.', 'Bracket reflections and wind with placement studies, coherence, windscreens, and reference channels.', 'Preserve raw time data, calibration records, overload flags, metadata, and uncertainty through final reporting.'],
    limitation: 'The planner screens capsule-size, orientation, field mismatch, wind, one reflection scale, and source range. It does not replace standards-based uncertainty or facility qualification.',
    references: 'IEC 61094; IEC 61672; ISO 3740/9614 families; ANSI microphone and sound-power standards.'
  },
  {
    id: 'canonical-acoustic-sources', number: '54', caseNumber: '51', toolId: 'canonical-source', demoId: 'multipole-source-lab',
    title: 'Canonical Acoustic Sources & Geometric Spreading', eyebrow: 'Identify what physically creates the sound',
    summary: 'Build intuition for monopoles, dipoles, quadrupoles, compactness, directivity, near/far fields, speed scaling, and plane/line/point source geometry.',
    source: 'ACS 537 pp. 155–208: source mechanisms, canonical multipoles, directivity, geometric spreading, and machinery/aerodynamic noise', equation: 'Wmono∝U⁴;  Wdipole∝U⁶;  Wquad∝U⁸;  kr and kd set field/compactness',
    mechanism: 'A monopole injects volume, a dipole applies fluctuating force, and a quadrupole represents fluctuating stress. Source order controls compact radiation efficiency, polar pattern, and velocity sensitivity; finite dimensions control range-dependent spreading.',
    intuition: 'Source identification is conservation-law diagnosis: ask whether the flow is injecting volume, pushing on a boundary, or mixing with itself before deciding how level should scale.',
    launch: 'Rocket exhaust mixing, flame acoustics, vents, purge outlets, valves, pumps, fans, turbulent boundary layers, panels, and ground interaction combine canonical mechanisms that scale and radiate differently.',
    findings: ['Higher-order compact sources radiate inefficiently but grow much faster with characteristic velocity.', 'Directivity nulls are mechanism signatures and are easily filled by reflections or secondary sources.', 'Reactive near-field pressure need not represent radiated power.', 'Finite sources transition from plane-like to line-like to point-like spreading as range exceeds successive dimensions.'],
    decisions: ['Classify the source mechanism and field region before applying a distance or speed law.', 'Measure directivity and operating-state scaling rather than assuming an isotropic point source.', 'Separate source modification from propagation and installation effects in correlation.'],
    limitation: 'The demos use ideal compact free-field sources and piecewise geometric spreading. Real launch sources include convection, distributed coherence, shocks, flames, boundaries, motion, and refraction.',
    references: 'Lighthill acoustic analogy; Curle and Ffowcs Williams–Hawkings; Morse & Ingard; aeroacoustic source scaling.'
  },
  {
    id: 'fans-duct-flow-noise', number: '55', caseNumber: '52', toolId: 'fan-duct-network', demoId: 'fan-duct-ledger-lab',
    title: 'Fans, Ducts & Flow-Generated Noise', eyebrow: 'Track both transmitted and newly generated power',
    summary: 'Follow fan tones and broadband power through outlets, branches, lined ducts, elbows, silencers, breakout, terminations, fittings, and occupied-room corrections.',
    source: 'ACS 537 pp. 208–273: fans, machinery, duct propagation, fittings, attenuation, regenerated noise, and system design', equation: 'Lw,out=Lw,in−ILduct+10log10qbranch ⊕ Lw,regen',
    mechanism: 'Fan sound propagates in duct modes, is divided at junctions, attenuated by lining and fittings, transmitted through duct walls, and supplemented by new turbulence noise at restrictions and outlets.',
    intuition: 'A silencer is not a subtraction box. It changes impedance and pressure drop, can shift the fan operating point, and may create enough self-noise to become the new source.',
    launch: 'Purge, environmental control, ground cooling, clean-room, payload conditioning, avionics ventilation, mobile-launcher exhaust, and facility systems can drive both acoustic requirements and structure-borne machinery response.',
    findings: ['Blade-passage frequency and harmonics move directly with speed and blade count.', 'Branching divides sound power, not sound-pressure level at a receiver.', 'Attenuation accumulated upstream cannot reduce noise regenerated downstream.', 'Breakout, break-in, cross-talk, terminations, and room reverberation can bypass the intended duct path.'],
    decisions: ['Create a banded network ledger from source sound power through every branch and receiver.', 'Check aerodynamic pressure drop and regenerated self-noise with acoustic attenuation.', 'Treat vibration isolation, flexible connections, duct breakout, and airborne discharge as parallel paths.'],
    limitation: 'The paired ledger is one-band and uses uniform attenuation plus two regenerated sources. It omits duct modes, impedance/reflection, breakout, fan curves, and flow-dependent vendor data.',
    references: 'ASHRAE HVAC Applications; SMACNA; AMCA fan sound standards; duct-acoustics texts.'
  },
  {
    id: 'outdoor-propagation-ground-barriers', number: '56', caseNumber: '53', toolId: 'outdoor-propagation', demoId: 'outdoor-propagation-lab',
    title: 'Outdoor Propagation, Ground & Barriers', eyebrow: 'Treat atmosphere and geometry as part of the path',
    summary: 'Combine spreading, molecular absorption, ground interference, turbulence, wind/temperature refraction, vegetation, barriers, finite ends, leakage, and meteorological variability.',
    source: 'ACS 537 pp. 273–333: outdoor propagation, atmospheric effects, ground interaction, barriers, and environmental noise control', equation: 'Lp=Lw+DI−Adiv−Aatm+Aground+Amet−Abarrier',
    mechanism: 'Direct and ground-reflected waves interfere; molecular relaxation removes high-frequency energy; effective sound-speed gradients refract rays; turbulence decorrelates paths; barriers add diffracted path length but retain end, panel, and leakage paths.',
    intuition: 'Outdoor propagation is an evolving waveguide between a moving atmosphere and an impedance ground—not a single 6 dB-per-doubling correction.',
    launch: 'Pad, static-fire, landing, engine-test, community, wildlife, and facility siting predictions depend on source directivity, terrain, water/soil, weather, atmospheric profiles, and long-range focusing or shadow zones.',
    findings: ['Atmospheric absorption is strongly frequency-, humidity-, temperature-, and distance-dependent.', 'Ground effect creates moving spectral peaks/nulls that turbulence and roughness partially wash out.', 'Downward refraction can enhance long-range levels while upward refraction creates unstable shadow-zone behavior.', 'A barrier benefit is limited by top diffraction, finite ends, panel transmission, gaps, and reverberant bypass.'],
    decisions: ['Predict and measure across representative meteorological classes rather than one standard day.', 'Use banded source directivity and site-specific ground/terrain geometry.', 'Design barrier height, length, panel mass, seals, and receiver field together.'],
    limitation: 'The outdoor demo uses flat terrain, one effective gradient, a coherent two-path ground model, and approximate absorption; the barrier demo uses one top and one end path.',
    references: 'ISO 9613-2; ANSI/ASA outdoor propagation standards; Harmonoise/CNOSSOS concepts; barrier diffraction methods.'
  },
  {
    id: 'room-fields-installed-enclosures', number: '57', caseNumber: '54', toolId: 'room-field', demoId: 'room-field-lab',
    title: 'Room Fields, Enclosures & Tuned Treatments', eyebrow: 'Design the installed system and its statistical field',
    summary: 'Connect room constant, direct/reverberant fields, critical distance, decay, enclosure weakest links, absorption tests, resonators, vibration isolation, and tuned absorbers.',
    source: 'ACS 537 pp. 333–end: room acoustics, absorption testing, enclosures, barriers, machinery isolation, and tuned absorbers', equation: 'Lp=Lw+10log10[Q/(4πr²)+4/R];  TLinstalled=−10log10ΣSiτi/S',
    mechanism: 'Direct energy decays with range while reverberant energy is controlled by room absorption. Enclosure panels, openings, seals, and structural flanks transmit in parallel. Resonant absorbers and tuned mass absorbers exchange stored energy near a designed frequency.',
    intuition: 'A room creates a level floor, and an enclosure creates a transmission floor. Once those floors dominate, improving the source-facing component produces little receiver benefit.',
    launch: 'Engine and pump enclosures, acoustic test chambers, payload processing rooms, equipment bays, mobile launchers, service structures, compressor skids, and spacecraft cavities all require installed-field rather than coupon-only design.',
    findings: ['Critical distance separates direct-field geometry from the reverberant room floor.', 'Sabine/Eyring averages are inappropriate where sparse low-frequency modes control local response.', 'Tiny openings or flanking paths can dominate a high-TL enclosure.', 'Absorber coupon method/mounting and tuned-device tolerance must match the installed frequency, field, load, temperature, and stroke.'],
    decisions: ['Partition direct and reverberant contributions before choosing barriers or absorption.', 'Design panels, openings, ventilation, seals, base isolation, and maintenance access as one enclosure.', 'Validate absorber/resonator bandwidth and tuned-device robustness under installed tolerances.'],
    limitation: 'The tools use a diffuse-room model, parallel transmission, simplified tube/chamber methods, and linear two-DOF tuning. Local modes, nonlinear mounts, self-noise, and six-DOF coupling need higher fidelity.',
    references: 'Sabine and Eyring room acoustics; ASTM C423/E1050; ISO 354/10534; Den Hartog vibration absorber theory.'
  }
];

const concept = (title, equation, body, interpretation, mistake, toolId, tags) => ({ title, equation, body, interpretation, mistake, toolId, tags });

export const programExpansionSections = modules.map(module => ({
  id: module.id, number: module.number, title: module.title, eyebrow: module.eyebrow, summary: module.summary,
  deepDiveId: `program-${module.id}`,
  concepts: [
    concept('Governing model', module.equation, module.mechanism, module.intuition, 'Selecting an equation before defining the physical observable, event, path, or statistical population.', module.toolId, ['model', 'mechanism']),
    concept('Engineering intuition', '', module.intuition, module.mechanism, 'Treating one scalar metric as a complete physical explanation.', module.toolId, ['intuition', 'physical meaning']),
    concept('Launch-vehicle application', '', `${module.launch} Findings: ${module.findings.join(' ')}`, 'Use the mission event, configuration, and receiver to decide which finding controls.', 'Transferring coupon, component, or laboratory behavior directly to the installed flight system.', module.toolId, ['launch vehicles', 'application']),
    concept('Decision and evidence', '', module.decisions.join(' '), 'A useful analysis changes a traceable decision and names the evidence required to defend it.', 'Reporting numerical precision without sensitivity, threshold, evidence, or ownership.', module.toolId, ['decision', 'verification']),
    concept('Validity boundary', '', module.limitation, `The source trail starts with ${module.source}. Escalate fidelity when omitted physics can reverse the decision.`, 'Using the model outside its stated frequency, configuration, or statistical regime.', module.toolId, ['assumptions', 'validity'])
  ]
}));

function addProgramConcept(sectionId, item) {
  const section = programExpansionSections.find(candidate => candidate.id === sectionId);
  if (section) section.concepts.push(item);
}

addProgramConcept('acoustic-treatments', concept('Absorption test method and mounting', 'αn=1−|R|²;  αs∝(1/Tloaded−1/Tempty)', 'Impedance tubes measure normal-incidence reflection on a small specimen; reverberation chambers infer equivalent diffuse absorption from decay change. Mounting, edges, area, backing, diffusion, and sample construction are part of the result.', 'A material does not own one universal absorption coefficient. It has a method-, mounting-, field-, frequency-, and installation-dependent response.', 'Using a tube coefficient as diffuse installed blanket performance without checking incidence and mounting.', 'absorber-resonator', ['absorption test', 'impedance tube', 'reverberation chamber']));
addProgramConcept('launch-vibroacoustic-capstone', concept('Seven-step noise-control closure', 'receiver criterion → source → path → treatment → prediction → verification → update', 'Start with the adverse receiver effect, quantify every contributing path, rank receiver sensitivity, select mechanism-specific control, predict installed benefit, verify under matched operation, and update the path ledger.', 'Closure is an evidence loop, not a one-time attenuation calculation.', 'Declaring success from component data before measuring installed receiver benefit.', 'noise-control-path', ['noise control', 'workflow', 'verification']));
addProgramConcept('source-identification-arrays', concept('Microphone field validity before localization', 'pmic=Hfield,type·pfield+contamination', 'Array phase and level are only meaningful when microphone type, incidence, mounting, calibration, wind, reflection geometry, timing, and channel headroom preserve the desired acoustic field.', 'A beautifully focused map can be a precise picture of measurement bias.', 'Treating calibration amplitude as proof that the array geometry and field corrections are valid.', 'acoustic-measurement-planner', ['microphone', 'field correction', 'array validity']));
addProgramConcept('canonical-acoustic-sources', concept('Finite-source spreading transitions', '0 → 3 → 6 dB per distance doubling', 'A receiver close to both source dimensions sees plane-like spreading; beyond the short dimension the source becomes line-like; beyond the long dimension it becomes point-like.', 'Distance law follows apparent source dimensionality, not a universal rule.', 'Applying 6 dB per doubling beside a long vehicle, distributed plume, or panel source.', 'source-geometry', ['geometric spreading', 'finite source', 'range']));
addProgramConcept('outdoor-propagation-ground-barriers', concept('Barrier diffraction and bypass paths', 'IL=−10log10(τtop+τend+τpanel+τleak)', 'Top-edge diffraction, finite ends, through-panel transmission, gaps, and receiver reverberation remain parallel paths. Raising one edge helps only until another path controls.', 'A barrier is a path-length device bounded by its shortest acoustic bypass.', 'Quoting an infinite-screen diffraction value as installed insertion loss.', 'barrier-diffraction', ['barrier', 'diffraction', 'leakage']));
addProgramConcept('room-fields-installed-enclosures', concept('Installed enclosure weakest link', 'TLinstalled=−10log10Σ(Si/S)τi', 'Panel fields, doors, seals, vents, cable penetrations, cooling paths, and structure-borne flanks transmit in parallel; internal absorption changes the level incident on those paths.', 'A tiny low-TL area can dominate a large high-TL enclosure.', 'Upgrading panel mass while leaving ventilation and rigid base connections unchanged.', 'enclosure-design', ['enclosure', 'opening', 'flanking']));
addProgramConcept('room-fields-installed-enclosures', concept('Absorber and resonator test evidence', 'fH=(c/2π)√[S/(VLeff)]', 'Porous and resonant treatments need test evidence in the intended field and mounting. A tuned cavity/neck device adds narrowband absorption where broadband porous depth is impractical.', 'Treat the controlling particle-velocity or pressure region, not simply the visually available surface.', 'Assuming a resonator remains tuned after temperature, flow, manufacturing, and installation changes.', 'absorber-resonator', ['absorber', 'Helmholtz', 'test method']));
addProgramConcept('room-fields-installed-enclosures', concept('Tuned absorber and resilient isolation', 'T=√[(1+(2ζr)²)/((1−r²)²+(2ζr)²)]', 'A dynamic absorber creates a narrow antiresonance while resilient mounts reduce transmitted force above √2 times mount resonance. Mass, damping, tuning, static deflection, stroke, and unbalance must close together.', 'Tuning attacks one tone; isolation changes the path over a broader high-frequency region.', 'Assuming soft mounts isolate below resonance or a tuned device is insensitive to mass and temperature.', 'tuned-absorber-isolation', ['tuned absorber', 'isolation', 'unbalance']));

export const programExpansionToolCatalog = [
  { id: 'nonstationary-environment', title: 'Nonstationary Environment Analyzer', category: 'Random & Shock', description: 'Compare event-local RMS, peaks, kurtosis, fatigue, and a stationary PSD surrogate.', complexity: 'Advanced', keywords: ['evolutionary PSD', 'kurtosis', 'burst', 'fatigue'] },
  { id: 'mimo-test-control', title: 'MIMO Test-Control Matrix', category: 'Test & Signal', description: 'Propagate a two-axis cross-spectral matrix through a coupled fixture and inspect coherence and conditioning.', complexity: 'Advanced', keywords: ['MIMO', 'multi-axis', 'cross spectrum', 'fixture'] },
  { id: 'acoustic-treatment', title: 'Acoustic Blanket & Liner', category: 'Noise Control', description: 'Screen porous absorption, backing depth, coverage, limp mass, and installed insertion loss.', complexity: 'Core', keywords: ['blanket', 'liner', 'porous absorber', 'Delany Bazley'] },
  { id: 'source-identification-array', title: 'Source-Identification Array', category: 'Test & Signal', description: 'Explore array beam width, spatial aliasing, two-source localization, and diagnostic limits.', complexity: 'Advanced', keywords: ['beamforming', 'array', 'source localization', 'aliasing'] },
  { id: 'hybrid-method-selection', title: 'Hybrid Method Selector', category: 'Structural Acoustics', description: 'Map wavelength, mode count, overlap, and FE size into a frequency-dependent method ladder.', complexity: 'Advanced', keywords: ['FE', 'BE', 'SEA', 'hybrid', 'method selection'] },
  { id: 'vibroacoustic-fatigue', title: 'Vibroacoustic Fatigue Screener', category: 'Random & Shock', description: 'Estimate spectral fatigue from stress RMS, bandwidth, kurtosis, duration, repeats, and an S–N slope.', complexity: 'Advanced', keywords: ['acoustic fatigue', 'spectral fatigue', 'Miner', 'S-N'] },
  { id: 'mission-environment-timeline', title: 'Mission Environment Timeline', category: 'Test & Signal', description: 'Rank acoustic, buffet, shock, thermal, peak-severity, and fatigue controllers by subsystem and event.', complexity: 'Core', keywords: ['mission timeline', 'combined environment', 'load cycle', 'event'] },
  { id: 'credibility-scorecard', title: 'Model Credibility Scorecard', category: 'Test & Signal', description: 'Expose verification, validation, uncertainty, configuration, provenance, and review evidence gaps.', complexity: 'Core', keywords: ['V&V', 'credibility', 'validation', 'evidence'] },
  { id: 'launch-vibroacoustic-capstone', title: 'Launch Vibroacoustic Capstone', category: 'Structural Acoustics', description: 'Carry a launch acoustic source through installed TL, cavity, structure, payload, mitigation, uncertainty, and limit.', complexity: 'Advanced', keywords: ['launch vehicle', 'source path receiver', 'fairing', 'payload'] },
  { id: 'noise-control-path', title: 'Noise-Control Path Ranker', category: 'Noise Control', description: 'Add parallel airborne, structure-borne, leakage, and treated receiver paths to expose diminishing returns.', complexity: 'Core', keywords: ['source path receiver', 'path ranking', 'insertion loss', 'flanking'] },
  { id: 'hearing-psychoacoustics', title: 'Hearing & Binaural Cue Explorer', category: 'Acoustics', description: 'Screen interaural timing/level cues, critical-band masking, Bark/ERB position, and loudness.', complexity: 'Core', keywords: ['hearing', 'psychoacoustics', 'masking', 'binaural'] },
  { id: 'noise-metrics-criteria', title: 'Noise Metrics & Criteria', category: 'Acoustics', description: 'Compare Leq, SEL, Ldn, CNEL, percentile levels, octave NC rating, and spectral character.', complexity: 'Core', keywords: ['Leq', 'SEL', 'NC curves', 'community noise'] },
  { id: 'acoustic-measurement-planner', title: 'Acoustic Measurement Planner', category: 'Test & Signal', description: 'Screen microphone type, orientation, field mismatch, wind, reflection, and source-range validity.', complexity: 'Core', keywords: ['microphone', 'calibration', 'free field', 'wind noise'] },
  { id: 'canonical-source', title: 'Canonical Acoustic Source', category: 'Acoustics', description: 'Explore monopole, dipole, and quadrupole directivity, compactness, field region, and speed scaling.', complexity: 'Core', keywords: ['monopole', 'dipole', 'quadrupole', 'directivity'] },
  { id: 'source-geometry', title: 'Finite-Source Spreading', category: 'Acoustics', description: 'Move from plane-like to line-like to point-like propagation as range exceeds source dimensions.', complexity: 'Core', keywords: ['geometric spreading', 'line source', 'plane source', 'distance'] },
  { id: 'fan-duct-network', title: 'Fan & Duct Power Ledger', category: 'Noise Control', description: 'Track fan power, branch division, duct loss, regenerated flow noise, and receiver-room level.', complexity: 'Advanced', keywords: ['fan', 'duct', 'blade passage', 'regenerated noise'] },
  { id: 'outdoor-propagation', title: 'Outdoor Propagation Predictor', category: 'Noise Control', description: 'Combine spreading, atmosphere, ground interference, meteorology, vegetation, and directivity.', complexity: 'Advanced', keywords: ['outdoor noise', 'ground effect', 'refraction', 'atmospheric absorption'] },
  { id: 'barrier-diffraction', title: 'Barrier Diffraction & Bypass', category: 'Noise Control', description: 'Combine top diffraction, finite ends, panel transmission, and leakage into installed insertion loss.', complexity: 'Core', keywords: ['barrier', 'diffraction', 'Fresnel', 'leakage'] },
  { id: 'room-field', title: 'Direct–Reverberant Room Field', category: 'Acoustics', description: 'Calculate room constant, critical distance, Sabine/Eyring decay, and the direct/reverberant level floor.', complexity: 'Core', keywords: ['room acoustics', 'critical distance', 'reverberation', 'T60'] },
  { id: 'enclosure-design', title: 'Installed Enclosure Designer', category: 'Noise Control', description: 'Expose how openings, panels, flanking, absorption, and distance set installed enclosure benefit.', complexity: 'Advanced', keywords: ['enclosure', 'opening', 'flanking', 'transmission loss'] },
  { id: 'absorber-resonator', title: 'Absorber Test & Resonator', category: 'Acoustics', description: 'Compare tube and chamber absorption, test limits, and Helmholtz resonator tuning.', complexity: 'Advanced', keywords: ['impedance tube', 'reverberation chamber', 'Helmholtz', 'absorption'] },
  { id: 'tuned-absorber-isolation', title: 'Tuned Absorber & Isolation', category: 'Dynamics', description: 'Trade tuned-mass response reduction, mount isolation, static deflection, unbalance force, and stroke.', complexity: 'Advanced', keywords: ['tuned mass absorber', 'isolation', 'unbalance', 'transmissibility'] }
];

export const programExpansionDemos = [
  { id: 'nonstationary-environment-lab', title: 'Watch a Burst Disappear into an Average', description: 'Change event width and kurtosis while local response, stationary response, and damage separate.', topic: 'Nonstationary Response', toolId: 'nonstationary-environment' },
  { id: 'mimo-test-control-lab', title: 'Couple Two Test Axes Through a Fixture', description: 'Move across a fixture mode and alter cross-axis coupling and drive correlation.', topic: 'MIMO Testing', toolId: 'mimo-test-control' },
  { id: 'acoustic-treatment-lab', title: 'Make a Fairing Blanket Work in Band', description: 'Trade thickness, gap, flow resistivity, and coverage while absorption and installed benefit update.', topic: 'Acoustic Treatment', toolId: 'acoustic-treatment' },
  { id: 'source-identification-array-lab', title: 'Resolve—or Alias—Two Launch Sources', description: 'Change frequency, sensor spacing, aperture, and source angle to reveal the array validity boundary.', topic: 'Source Identification', toolId: 'source-identification-array' },
  { id: 'hybrid-method-ladder', title: 'Choose a Method Across Frequency', description: 'Watch deterministic, hybrid, and statistical regimes move with damping, subsystem size, and modal population.', topic: 'Method Selection', toolId: 'hybrid-method-selection' },
  { id: 'vibroacoustic-fatigue-lab', title: 'Turn Stress Spectra into Mission Damage', description: 'Change RMS stress, duration, bandwidth, kurtosis, and repeats to expose nonlinear damage growth.', topic: 'Fatigue', toolId: 'vibroacoustic-fatigue' },
  { id: 'mission-environment-timeline', title: 'Find the Controlling Event for Each Subsystem', description: 'Scale acoustic, buffet, shock, and thermal environments on a shared mission timeline.', topic: 'Mission Environments', toolId: 'mission-environment-timeline' },
  { id: 'credibility-scorecard-lab', title: 'Find the Evidence Gap That Limits a Decision', description: 'Raise or lower verification, validation, uncertainty, and configuration evidence while readiness changes.', topic: 'Model Credibility', toolId: 'credibility-scorecard' },
  { id: 'launch-vibroacoustic-capstone', title: 'Close the Source–Path–Receiver Chain', description: 'Change source, installed TL, flanking, treatment, and uncertainty while payload margin updates.', topic: 'Launch Capstone', toolId: 'launch-vibroacoustic-capstone' },
  { id: 'noise-control-path-lab', title: 'Treat the Path That Reaches the Receiver', description: 'Suppress one of three parallel paths and watch another become the installed noise floor.', topic: 'Noise-Control Workflow', toolId: 'noise-control-path' },
  { id: 'binaural-localization-lab', title: 'Hear Direction Through Time and Level Cues', description: 'Sweep source angle and frequency while interaural timing and head-shadow cues change roles.', topic: 'Binaural Hearing', toolId: 'hearing-psychoacoustics' },
  { id: 'critical-band-masking-lab', title: 'Move a Tone Through an Auditory Filter', description: 'Trade signal level, masker level, and masker bandwidth to expose critical-band audibility.', topic: 'Masking', toolId: 'hearing-psychoacoustics' },
  { id: 'noise-metrics-criteria-lab', title: 'Describe One Event Four Different Ways', description: 'Change event level and duration while Leq, SEL, percentile levels, and criteria separate.', topic: 'Noise Metrics', toolId: 'noise-metrics-criteria' },
  { id: 'microphone-placement-lab', title: 'Place and Orient a Microphone Credibly', description: 'Vary frequency, angle, diameter, wind, wall range, and source range to reveal measurement bias.', topic: 'Acoustic Measurement', toolId: 'acoustic-measurement-planner' },
  { id: 'multipole-source-lab', title: 'Compare Monopole, Dipole & Quadrupole Radiation', description: 'Change source order, angle, compactness, and speed scaling while directivity updates.', topic: 'Acoustic Sources', toolId: 'canonical-source' },
  { id: 'source-geometry-lab', title: 'Walk from a Plane Source to a Point Source', description: 'Move away from a finite source and watch the spreading slope change at each dimension.', topic: 'Source Geometry', toolId: 'source-geometry' },
  { id: 'fan-duct-ledger-lab', title: 'Follow Fan Noise Through a Duct Network', description: 'Add lining and branching until fittings and grille self-noise set the delivered floor.', topic: 'Fan & Duct Noise', toolId: 'fan-duct-network' },
  { id: 'outdoor-propagation-lab', title: 'Propagate Launch Noise Through Weather and Ground', description: 'Change range, frequency, ground, humidity, and sound-speed gradient to reshape received level.', topic: 'Outdoor Propagation', toolId: 'outdoor-propagation' },
  { id: 'barrier-diffraction-lab', title: 'Raise a Barrier Until Another Path Wins', description: 'Trade height, length, panel TL, and leakage while top and end diffraction compete.', topic: 'Barrier Design', toolId: 'barrier-diffraction' },
  { id: 'room-field-lab', title: 'Cross the Critical Distance', description: 'Move a receiver and add absorption while direct sound meets the reverberant room floor.', topic: 'Room Acoustics', toolId: 'room-field' },
  { id: 'enclosure-weakest-link-lab', title: 'Find the Enclosure Weakest Link', description: 'Shrink openings and improve panels until flanking or ventilation controls installed TL.', topic: 'Enclosures', toolId: 'enclosure-design' },
  { id: 'absorber-test-resonator-lab', title: 'Compare Absorption Tests and Tune a Resonator', description: 'Relate tube reflection, chamber decay, method validity, and Helmholtz tuning.', topic: 'Absorption & Resonators', toolId: 'absorber-resonator' },
  { id: 'tuned-absorber-isolation-lab', title: 'Tune an Absorber Without Losing Isolation', description: 'Trade mass, tuning, damping, mount frequency, unbalance force, and absorber stroke.', topic: 'Vibration Control', toolId: 'tuned-absorber-isolation' }
];

const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
function deepDiveBody(module) {
  const localSource = Number(module.number) >= 50 ? 'references/(2012) ACS537 Notes Noise Control.pdf' : 'references/ACS519_Combined.pdf';
  return `<p>${esc(module.mechanism)}</p><h2>Physical intuition</h2><p>${esc(module.intuition)}</p><div class="callout"><strong>Launch-vehicle application.</strong> ${esc(module.launch)}</div><h2>Findings from the deep dive</h2><ol>${module.findings.map(item => `<li>${esc(item)}</li>`).join('')}</ol><h2>Interactive model</h2><div class="case-demo"><div class="case-demo-header"><div><p class="eyebrow">Program-level deep dive</p><h3>${esc(module.title)}</h3></div><a class="concept-tool-link" href="#/tool/${encodeURIComponent(module.toolId)}">Open paired calculator →</a></div><div data-embedded-demo="${esc(module.demoId)}"></div></div><h2>Engineering decisions</h2><ul>${module.decisions.map(item => `<li>${esc(item)}</li>`).join('')}</ul><h2>Assumptions and model boundary</h2><p>${esc(module.limitation)}</p><div class="callout"><strong>Engineering takeaway.</strong> Carry the controlling mechanism, mission event, configuration, uncertainty, and verification evidence with every reported result.</div><h2>Source trail</h2><p><strong>Course-note connection:</strong> ${esc(module.source)}. <strong>Supporting references:</strong> ${esc(module.references)} Local source: <code>${esc(localSource)}</code>.</p>`;
}

const applicationCases = [
  {
    id: 'indoor-barrier-direct-reverberant', number: '55', title: 'Why an Indoor Barrier Stops Working', toolId: 'room-field', demoId: 'room-field-lab',
    summary: 'Separate direct-field attenuation from the reverberant floor before placing a barrier around indoor ground-support equipment.',
    situation: 'A partial barrier is proposed between a noisy hydraulic power unit and a technician station in a large integration bay.',
    findings: ['The barrier can reduce only the direct path that crosses it.', 'Once the receiver lies outside critical distance, untreated ceiling and wall reflections can dominate.', 'Absorption near the source or receiver can restore barrier benefit by lowering the reverberant floor.'],
    takeaway: 'Predict the direct and reverberant contributions separately; an indoor barrier cannot attenuate sound that arrives around it through the room field.'
  },
  {
    id: 'purge-fan-duct-network', number: '56', title: 'Payload Purge Fan and Duct Network', toolId: 'fan-duct-network', demoId: 'fan-duct-ledger-lab',
    summary: 'Trace a fan blade-passage tone and broadband power through a branched conditioning system without losing regenerated fitting noise.',
    situation: 'A payload purge fan meets its catalog sound-power target, but a fairing branch remains tonal after a long lined duct is installed.',
    findings: ['Branch power division and duct attenuation reduce transmitted fan noise.', 'A high-velocity elbow and terminal grille can regenerate the controlling band downstream of the liner.', 'The acoustic fix must be checked against pressure drop, delivered flow, cleanliness, and fan operating-point shift.'],
    takeaway: 'Carry a banded power ledger through the full network and add regenerated sources where they occur; upstream attenuation cannot erase downstream self-noise.'
  },
  {
    id: 'compressor-enclosure-weakest-link', number: '57', title: 'Compressor Enclosure Weakest Link', toolId: 'enclosure-design', demoId: 'enclosure-weakest-link-lab',
    summary: 'Design panel mass, ventilation, doors, seals, internal absorption, and skid isolation as one installed enclosure.',
    situation: 'A compressor panel is upgraded from 25 to 40 dB laboratory TL, but the nearby receiver improves by less than 2 dB.',
    findings: ['Open cooling area and door seals transmit far more power per square metre than the upgraded panel.', 'Rigid skid connections create a structure-borne flank that airborne panel TL cannot address.', 'Internal absorption lowers incident field and can improve every airborne leakage path simultaneously.'],
    takeaway: 'Rank opening, panel, and flanking energy shares before adding mass; the installed enclosure follows its strongest parallel path.'
  },
  {
    id: 'microphone-placement-trap', number: '58', title: 'The Microphone Placement Trap', toolId: 'acoustic-measurement-planner', demoId: 'microphone-placement-lab',
    summary: 'Diagnose an apparent launch-pad spectral notch created by microphone orientation, ground reflection, wind, and range.',
    situation: 'Two calibrated pad microphones disagree above 4 kHz and one shows a narrow notch that moves between test days.',
    findings: ['Calibration checks sensitivity but not field correction, orientation, scattering, or placement.', 'Ground and nearby-surface path differences move interference notches with geometry and atmosphere.', 'Wind contamination can dominate low-frequency pressure while high-frequency incidence error biases the opposite end of the band.'],
    takeaway: 'Treat the measurement chain and geometry as a model: record type, angle, height, range, wind, background, overload, and corrections with the acoustic data.'
  },
  {
    id: 'pad-weather-ground-propagation', number: '59', title: 'Pad Weather and Ground Change the Community Result', toolId: 'outdoor-propagation', demoId: 'outdoor-propagation-lab',
    summary: 'Bracket a launch or static-fire receiver with source directivity, atmospheric absorption, ground interference, and effective sound-speed gradients.',
    situation: 'A community monitor is quieter during one daytime test but louder during a lower-thrust evening operation.',
    findings: ['Downward refraction can offset source-level reduction at long range.', 'High-frequency atmospheric absorption and ground interference reshape the spectrum rather than applying one broadband loss.', 'A single nominal weather condition cannot represent seasonal or time-of-day exposure.'],
    takeaway: 'Correlate outdoor noise by band and meteorological class; do not assign every long-range discrepancy to the source model.'
  },
  {
    id: 'pump-line-tuned-absorber', number: '60', title: 'Tuned Absorber for a Pump-Line Tone', toolId: 'tuned-absorber-isolation', demoId: 'tuned-absorber-isolation-lab',
    summary: 'Use a tuned absorber to suppress a persistent running-speed resonance while checking mount isolation, static load, stroke, and detuning.',
    situation: 'A ground-support pump excites a line-support mode near running speed, but moving the support or softening the entire line is impractical.',
    findings: ['A tuned absorber can create a deep local antiresonance with modest added mass.', 'The two split resonances can amplify adjacent operating speeds if damping and tuning are poor.', 'Temperature, fluid mass, fill state, manufacturing tolerance, and absorber stroke determine whether the notch survives installation.'],
    takeaway: 'Use a tuned absorber only for a stable narrowband problem and verify the full operating envelope; retain resilient isolation for broadband transmitted-force control.'
  }
];

function applicationCaseBody(item) {
  return `<p>${esc(item.situation)}</p><h2>Engineering findings</h2><ol>${item.findings.map(finding => `<li>${esc(finding)}</li>`).join('')}</ol><h2>Interactive application</h2><div class="case-demo"><div class="case-demo-header"><div><p class="eyebrow">Applied noise-control case</p><h3>${esc(item.title)}</h3></div><a class="concept-tool-link" href="#/tool/${encodeURIComponent(item.toolId)}">Open paired calculator →</a></div><div data-embedded-demo="${esc(item.demoId)}"></div></div><div class="callout"><strong>Engineering takeaway.</strong> ${esc(item.takeaway)}</div>`;
}

export const programExpansionCaseNotes = [
  ...modules.map(module => ({
    id: `program-${module.id}`, number: module.caseNumber, title: module.title,
    summary: `${module.summary} Includes launch-vehicle applications, deep-dive findings, and an interactive engineering model.`,
    readTime: '12 min', tags: ['launch vehicles', 'program workflow', module.eyebrow], body: deepDiveBody(module)
  })),
  ...applicationCases.map(item => ({ ...item, readTime: '8 min', tags: ['noise control', 'applied case', 'launch support'], body: applicationCaseBody(item) }))
];

export const programExpansionReferenceGroups = [{
  group: 'Program-level launch-vehicle vibroacoustics',
  items: modules.map(module => ({ title: `${module.title} — ${module.source}`, note: `${module.summary} Supporting references: ${module.references} Local source: ${Number(module.number) >= 50 ? 'references/(2012) ACS537 Notes Noise Control.pdf' : 'references/ACS519_Combined.pdf'}.` }))
}];
