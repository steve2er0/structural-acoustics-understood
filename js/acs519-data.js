/* Curriculum, deep dives, catalogs, and references derived from ACS519_Combined. */

const modules = [
  {
    id: 'modal-radiation-deep-dive', number: '13', caseNumber: '10', toolId: 'modal-radiation', demoId: 'modal-radiation-patterns',
    title: 'Modal Plate Radiation & Cancellation', eyebrow: 'From mode shape to sound power',
    summary: 'Why equal vibration levels can radiate radically different sound power depending on modal parity, wavelength matching, edges, corners, and baffle conditions.',
    source: 'ACS 519 pp. 248–329 and 650–658', equation: 'σ<sub>mn</sub> = P<sub>mn</sub> /(ρ₀c₀S⟨v²<sub>mn</sub>⟩) &nbsp; · &nbsp; γ = k₀/k<sub>mn</sub>',
    mechanism: 'The Rayleigh integral preserves the sign and phase of every moving surface patch. Below coincidence, adjacent positive and negative lobes mostly cancel; the residual field is produced by edges and corners. Above coincidence, structural wavelength content falls inside the acoustic radiation circle and propagating sound becomes efficient.',
    intuition: 'An accelerometer measures motion at a point. Sound power measures the coherent sum of the entire surface. A high-order mode can shake hard and remain quiet because neighboring lobes cancel, while a low-order odd–odd mode can radiate strongly through in-phase corner sources.',
    launch: 'Fairing, interstage, bulkhead, and equipment-bay panels do not convert spatial RMS velocity into sound with one universal factor. Low-order global skin modes can dominate payload-cavity noise, while stiffeners, access doors, cutouts, and joints break the cancellation predicted for an ideal panel.',
    findings: [
      'Modal parity is a first-order radiation variable below coincidence: odd–odd modes retain in-phase corner radiation, odd–even modes partially cancel, and even–even modes cancel most strongly.',
      'Radiation efficiency can exceed unity near coincidence because it is normalized by the power of an equal-area baffled piston; this is not an energy-law violation.',
      'Modal-averaged radiation efficiency is appropriate for statistical bands, but it can hide the single low-order mode that controls a narrowband launch-vehicle interior tone.',
      'A baffle changes edge sources from dipole-like to monopole-like behavior, so unbaffled flight hardware can radiate much less than a baffled laboratory idealization.'
    ],
    decisions: ['Retain complex mode shape and phase when converting structural response to acoustic power.', 'Use modal efficiency for sparse low-frequency response and averaged efficiency only after modal population is justified.', 'Bracket ideal baffled and unbaffled edge behavior when the installed boundary is uncertain.'],
    limitation: 'The deep-dive tool assumes a simply supported flat rectangular mode in an infinite rigid baffle. Curvature, orthotropy, fluid loading, attachments, and nonuniform velocity require measured shapes or FE/BE radiation analysis.',
    references: 'Wallace modal radiation resistance; Maidanik modal-average radiation efficiency; Fahy & Gardonio; ACS 519 rectangular-panel and plate-radiation demonstration blocks.'
  },
  {
    id: 'piston-fluid-loading-deep-dive', number: '14', caseNumber: '11', toolId: 'piston-radiation', demoId: 'piston-fluid-loading',
    title: 'Baffled Piston Radiation & Fluid Loading', eyebrow: 'The canonical finite radiator',
    summary: 'Use the simplest finite radiator to connect ka, directivity, radiation resistance, near-field reactance, acoustic added mass, and coupled structural response.',
    source: 'ACS 519 pp. 21–69', equation: 'Z<sub>rad</sub> = ρ₀c₀S(R̄ + iX̄) &nbsp; · &nbsp; D(θ)=2J₁(ka sinθ)/(ka sinθ)',
    mechanism: 'Radiation resistance is the part of pressure in phase with velocity and carries energy away. Radiation reactance is in quadrature and stores energy near the source, appearing mechanically as added mass at low ka. The balance moves from reactive and nearly omnidirectional to resistive and directional as ka increases.',
    intuition: 'A compact piston spends most of each cycle pushing nearby fluid back and forth. A large piston launches a traveling wave before neighboring parts of the aperture can communicate acoustically, so energy escapes and the beam narrows.',
    launch: 'Local skin bays, purge diaphragms, vents, pressure-relief panels, acoustic-test exciters, and apertures can often be understood first as finite pistons. The same hardware may be compact at low frequency and highly directional at upper launch-acoustic bands.',
    findings: [
      'ka—not frequency alone—sets the radiation regime; geometric scaling changes directivity and loading even when material behavior is unchanged.',
      'Fluid loading feeds back into structural mobility. In water or dense internal fluids it can shift resonances and damping enough that an uncoupled structural solution becomes invalid.',
      'The low-ka added-mass limit is geometry-controlled and nearly frequency independent even though normalized reactance varies with ka.',
      'Radiation efficiency and radiation loss factor answer different questions: one normalizes power by surface motion, while the other normalizes power by stored structural energy.'
    ],
    decisions: ['Use resistance for radiated-power estimates and reactance for resonance/mobility corrections.', 'Compare added fluid mass with structural modal mass before selecting one-way or fully coupled analysis.', 'Use the piston only for velocity fields without the sign-changing lobes of structural modes.'],
    limitation: 'Uniform velocity, a rigid infinite baffle, a quiescent linear fluid, and far-field directivity are assumed. Neighboring radiators, cavities, mean flow, finite baffles, and flexible supports change the field.',
    references: 'Rayleigh integral; Junger & Feit; Fahy & Gardonio; ACS 519 baffled circular-piston notes.'
  },
  {
    id: 'shell-acoustics-deep-dive', number: '15', caseNumber: '12', toolId: 'shell-acoustics', demoId: 'shell-wave-map',
    title: 'Cylindrical-Shell Structural Acoustics', eyebrow: 'Curvature changes the modal story',
    summary: 'Connect helical shell wavenumbers, membrane–bending coupling, ring frequency, lobar modes, acoustic cut-on, radiation, and internal fluid coupling.',
    source: 'ACS 519 pp. 587–635', equation: 'k²<sub>s</sub> = k²<sub>m</sub> + (n/R)² &nbsp; · &nbsp; f<sub>ring</sub> = c<sub>L</sub>/(2πR)',
    mechanism: 'Cylinder curvature couples radial bending to in-plane membrane motion. Axial order m and circumferential order n form helical wave patterns. Low-order shell frequencies can fall as n increases before local bending stiffness reverses the trend—behavior opposite the monotonic intuition developed from flat plates.',
    intuition: 'A cylinder can avoid stretching by ovalizing into lobes. Low-n breathing and beam-like shapes fight membrane stiffness; higher-n lobes become locally plate-like. The cheapest deformation changes with wavelength, so one “shell frequency” cannot describe the structure.',
    launch: 'Stages, fairings, adapters, tanks, motor cases, and ducts are shells with frames, stringers, joints, internal pressure, and concentrated hardware. Global n=0/1/2 behavior can control vehicle-level motion, while local high-n bays control acoustic radiation and equipment response.',
    findings: [
      'Ring frequency is a curvature/membrane scale; critical frequency is an acoustic wavenumber-matching scale. They should appear together but never be treated as synonyms.',
      'The modes that dominate surface vibration need not dominate radiated sound: low-order circumferential modes often radiate more efficiently than dense high-order lobes.',
      'Internal acoustic modes share the shell circumferential order and couple through radial velocity; below the first non-plane cut-on, the cavity behaves primarily as a one-dimensional waveguide.',
      'Elbows, frames, and discontinuities convert axial, torsional, and bending motion, so ideal straight-shell wave families become coupled transmission paths in flight hardware.'
    ],
    decisions: ['Track both axial and circumferential orders in test and analysis correlation.', 'Compare shell mode, ring, coincidence, and internal acoustic cut-on scales before selecting a flat-panel approximation.', 'Use measured or detailed model shapes when frames, cutouts, or pressurization dominate.'],
    limitation: 'The screening model uses a thin uniform cylinder and an approximate membrane/bending frequency expression. Real boundary rings, orthotropy, pressure stiffening, fluid added mass, and joints require shell FE or validated analytical models.',
    references: 'Donnell shell theory; Leissa; Junger & Feit; Fahy & Gardonio; ACS 519 cylindrical-shell block.'
  },
  {
    id: 'computational-vibroacoustics-deep-dive', number: '16', caseNumber: '13', toolId: 'fe-be-planner', demoId: 'fe-be-model-trust',
    title: 'Computational Vibroacoustics: FE, BE & Coupling', eyebrow: 'Build a model you can trust',
    summary: 'Choose structural FE, acoustic FE, exterior BEM, modal reduction, coupling, mesh resolution, convergence evidence, and uncertainty treatment by physics rather than software habit.',
    source: 'ACS 519 pp. 347–438', equation: '[−ω²M + iωB + K + iωZ<sub>a</sub>(ω)]u = F',
    mechanism: 'Finite elements discretize the modeled volume or structure; boundary elements discretize acoustic boundaries and embed free-space propagation through Green functions. Coupling enforces compatible normal velocity and pressure traction. Accuracy depends on wavelength resolution, element order, modal truncation, solver formulation, and uncertain inputs.',
    intuition: 'A converged matrix solve is not necessarily a converged physical answer. The model can solve the wrong boundary, miss a residual high-frequency load path, or place a resonance five percent away from hardware—enough to invert a narrowband design conclusion.',
    launch: 'Launch-vehicle vibroacoustic models span global low-frequency FE, local panel response, interior acoustic FE, exterior BE, and high-frequency SEA. The best architecture is usually frequency-dependent and hybrid rather than one monolithic mesh.',
    findings: [
      'Structural and acoustic wavelengths generally differ; forcing one common mesh can make the acoustic BEM far larger than required below coincidence.',
      'Modal forced response can be much faster than direct solution, but modes well above the response band and static residual vectors may be needed to recover local load paths.',
      'Exterior direct BEM becomes nonunique at fictitious interior resonances; CHIEF or Burton–Miller-type treatments are formulation requirements, not optional numerical polish.',
      'Displacement can appear converged while stress, power, or radiation remains unconverged because each depends on higher spatial derivatives or coherent surface phase.'
    ],
    decisions: ['Document elements per wavelength and run an explicit mesh/order convergence study.', 'Bracket resonance-frequency and damping uncertainty for narrowband forcing.', 'Separate solver residual, discretization error, model-form error, and uncertain hardware properties.'],
    limitation: 'The planner estimates counts from ideal wavelengths and classical dense BEM scaling. It does not replace geometry-specific mesh-quality checks, element formulation verification, solver benchmarking, or test correlation.',
    references: 'ACS 519 FE/BE lectures; Kirchhoff–Helmholtz formulation; commercial-code verification manuals; program-specific model validation plans.'
  },
  {
    id: 'elastic-panel-tl-deep-dive', number: '17', caseNumber: '14', toolId: 'elastic-panel-tl', demoId: 'panel-tl-angle',
    title: 'Elastic-Panel Transmission Loss', eyebrow: 'Beyond the mass-law line',
    summary: 'See how incidence angle, surface mass, bending stiffness, damping, coincidence, finite modes, diffuse fields, and flanking paths shape real panel transmission.',
    source: 'ACS 519 pp. 439–471', equation: 'TL = −10 log₁₀τ &nbsp; · &nbsp; k<sub>parallel</sub> = k₀ sinφ',
    mechanism: 'An incident acoustic wave imposes an in-plane wavenumber on the panel. Transmission rises when that forced wavenumber matches a free bending wave. Below coincidence, mass dominates an infinite panel; near coincidence, damping controls the trough; above coincidence, bending stiffness and the angular ensemble matter.',
    intuition: 'Mass law is what remains when the panel cannot “choose” a resonant bending pattern. Coincidence is the special condition where the acoustic wave writes exactly the traveling structural pattern the panel already wants to support.',
    launch: 'Payload fairings and equipment enclosures receive directional liftoff waves, reverberant internal fields, structure-borne flanking, vents, blankets, and finite shell modes. A catalog mass-law number does not predict installed payload acoustic attenuation.',
    findings: [
      'Normal incidence never reaches classical bending coincidence for an infinite flat panel; diffuse fields contain oblique waves that do.',
      'Increasing damping primarily fills the coincidence trough; it does little to the mass-controlled region below coincidence.',
      'Finite panels reradiate at discrete modes below critical frequency, so measured TL can fall below infinite-panel mass law even without leakage.',
      'A treatment that improves the panel path can reveal seals, vents, attachments, and structure-borne flanking as the new limiting paths.'
    ],
    decisions: ['Report incidence and field assumptions with every TL prediction.', 'Use finite or modal models below and around sparse resonances.', 'Track all parallel paths when translating component TL into installed noise reduction.'],
    limitation: 'The paired tool is an infinite thin isotropic panel between identical fluids. It omits finite geometry, curvature, orthotropy, trim, blankets, leaks, and flanking.',
    references: 'Fahy transmission theory; Beranek mass law; ACS 519 panel-transmission block; Price & Crocker double-panel application.'
  },
  {
    id: 'orthotropic-panels-deep-dive', number: '18', caseNumber: '15', toolId: 'orthotropic-panel', demoId: 'orthotropic-coincidence',
    title: 'Orthotropic, Ribbed & Sandwich Panels', eyebrow: 'Direction is a material property',
    summary: 'Replace one bending stiffness and one critical frequency with directional rigidity, shear-corrected dispersion, local bays, stiffener coupling, and aerospace sandwich behavior.',
    source: 'ACS 519 pp. 330–346', equation: 'D(θ)=D₁₁c⁴+2(D₁₂+2D₆₆)s²c²+D₂₂s⁴',
    mechanism: 'Ribs, corrugation, laminate orientation, separated facesheets, and soft cores make bending stiffness direction dependent. Sandwich faces carry bending while the core maintains separation and carries transverse shear. At higher frequency, shear flexibility caps the bending-wave speed and alters modal density and coincidence.',
    intuition: 'A lightweight panel is not one plate—it is a map of preferred wave highways. Waves travel faster along the stiff direction, meet acoustic coincidence earlier there, and scatter at ribs, doublers, joints, and core transitions.',
    launch: 'Composite fairings, honeycomb decks, avionics panels, interstage closeouts, and grid-stiffened shells are designed for mass efficiency. That same high stiffness-to-mass ratio can raise radiation efficiency and reduce mass-law transmission loss.',
    findings: [
      'Orthotropic panels have a directional coincidence surface; quoting one isotropic critical frequency can miss the first radiating direction.',
      'Stiffeners usually raise rigidity faster than mass, reducing critical frequency and disrupting the edge/corner cancellation of an unstiffened bay.',
      'Sandwich-panel dispersion transitions from bending-controlled to shear-limited behavior, changing modal density, conductance, and SEA readiness.',
      'Global panel modes, local rib-bay modes, facesheet/core modes, and attachment modes can coexist in the same launch-acoustic band.'
    ],
    decisions: ['Use the laminate/equivalent D matrix rather than a scalar modulus for directional waves.', 'Check transverse-shear validity before extending thin-plate trends upward in frequency.', 'Treat fasteners, doublers, inserts, and cutouts as both mass/stiffness changes and wave scatterers.'],
    limitation: 'The directional tool uses a symmetric equivalent orthotropic D matrix. It does not predict local core, facesheet, rib, insert, damage, or bending–extension coupling behavior.',
    references: 'Mindlin plate theory; composite laminate theory; Hexcel sandwich data; ACS 519 anisotropic/orthotropic block; local TR 12-007 honeycomb reference.'
  },
  {
    id: 'loss-factors-deep-dive', number: '19', caseNumber: '16', toolId: 'loss-factor-budget', demoId: 'loss-factor-paths',
    title: 'Loss Factors: Sources, Tests & Budgets', eyebrow: 'Damping is an energy pathway',
    summary: 'Separate internal, radiation, joint, fluid, and coupling losses; compare measurement methods; and stop treating one damping number as a universal material constant.',
    source: 'ACS 519 pp. 175–199', equation: 'η<sub>total</sub> = η<sub>str</sub>+η<sub>rad</sub>+η<sub>joint</sub>+η<sub>fluid</sub>+η<sub>coupling</sub>',
    mechanism: 'Loss factor measures energy removed per radian relative to stored energy. Multiple paths are additive only when they are defined consistently and do not double count the same transmitted power. Half-power bandwidth, decay, and power injection interrogate different modal and spatial averages.',
    intuition: 'Damping is not a mysterious force painted onto a resonance. It is the bookkeeping label for where vibratory energy goes: heat in material, friction in a joint, sound in a fluid, or motion in another subsystem.',
    launch: 'Bolted stacks, bonded joints, blankets, purge gas, propellant state, acoustic radiation, wiring, and mounted equipment all change the loss budget between coupon, component, ground test, and flight.',
    findings: [
      'Structural loss factor can differ between longitudinal, shear, and bending strain states; a single handbook value can be wrong even for one material.',
      'Half-power methods work best for isolated modes, power injection for representative band energies, and decay methods for clean exponential band-limited ringdown.',
      'Radiation and coupling losses may dominate a lightweight panel even when its material damping is small.',
      'Constrained-layer damping is strongly frequency, temperature, geometry, and strain-distribution dependent.'
    ],
    decisions: ['Build an explicit loss budget and state whether each term is internal, radiative, or transferred.', 'Use more than one measurement method when assigning analysis damping.', 'Match damping data to configuration, amplitude, temperature, pressure, and frequency.'],
    limitation: 'The budget assumes light damping and independent paths. Nonlinear joints, amplitude-dependent damping, nonexponential decay, and strong coupling need time-, frequency-, or state-dependent models.',
    references: 'Cremer, Heckl & Ungar; modal testing practice; ACS 519 loss-factor notes; power-injection and reverberation-time methods.'
  },
  {
    id: 'modal-testing-deep-dive', number: '20', caseNumber: '17', toolId: 'modal-test-planner', demoId: 'modal-test-grid',
    title: 'Mobility & Experimental Modal Analysis', eyebrow: 'The mode exists even when the FRF hides it',
    summary: 'Design drive and response locations, resolve narrow bandwidths, interpret drive-point and transfer mobility, manage sensor loading, and separate ideal modes from support-coupled hardware behavior.',
    source: 'ACS 519 pp. 113–174, 200–226, and 636–649', equation: 'Y<sub>rf</sub>(ω)=Σ iωφ<sub>rj</sub>φ<sub>fj</sub>/[m<sub>j</sub>(ω²<sub>j</sub>−ω²+iη<sub>j</sub>ω²<sub>j</sub>)]',
    mechanism: 'Every modal contribution contains the mode shape at both the force and response points. Drive-point mobility has special passivity and conductance properties; transfer mobility can change sign and vanish at nodes. Spatial sampling and curve fitting reconstruct frequency, damping, mass, and shape from the FRF matrix.',
    intuition: 'A missing peak does not prove a missing mode. You may simply be pushing or listening where that mode cannot respond. Conversely, a support-coupled peak is not automatically bad data—it may be a real installed load path.',
    launch: 'Ground-vibration tests, fairing/panel surveys, component modal tests, and shaker qualification depend on reference placement, support simulation, force measurement, channel phase, and local sensor mass. These choices determine whether test–analysis correlation is physically meaningful.',
    findings: [
      'A mode driven at a node is absent from that drive-point FRF; multiple references are required to observe a broad mode set.',
      'Ideal simply supported boundary conditions are difficult to create, and coupled support modes can carry comparable energy to nominal panel modes.',
      'Frequency resolution must place several bins across the modal bandwidth before half-power damping or stable curve fitting is plausible.',
      'Surface-averaged mobility approaches an infinite-structure trend as modal density and damping rise, providing a useful high-frequency cross-check.'
    ],
    decisions: ['Place references away from predicted nodes and retain multiple independent drive/response combinations.', 'Check sensor mass against local modal mass, not total vehicle mass.', 'Correlate shapes, frequencies, damping, and FRF phase—not peaks alone.'],
    limitation: 'The planner uses ideal simply supported plate modes and single-mode formulas. Real supports, nonproportional damping, closely spaced modes, nonlinear joints, and spatially varying mass need multi-reference modal analysis.',
    references: 'Ewins modal testing; Bendat & Piersol FRFs; ACS 519 resonance, forced-response, damping, and plate-test demonstrations.'
  },
  {
    id: 'sea-validity-deep-dive', number: '21', caseNumber: '18', toolId: 'sea-validity-confidence', demoId: 'sea-validity-map',
    title: 'SEA Validity, Variability & Confidence', eyebrow: 'A mean needs a population',
    summary: 'Use modes per band, modal overlap, weak coupling, diffuse behavior, spatial energy estimation, and response variability to decide where SEA is credible.',
    source: 'ACS 519 pp. 472–554', equation: 'M = ηfn(f) &nbsp; · &nbsp; P<sub>i→j</sub>=ωη<sub>ij</sub>E<sub>i</sub>',
    mechanism: 'SEA replaces individual modal coordinates with band-averaged subsystem energies. That replacement needs a sufficiently sampled modal population, representative spatial averages, identifiable loss factors, and couplings that leave subsystem identity meaningful.',
    intuition: 'SEA does not make modes disappear—it averages over them. If only one or two modes are in the band, the “statistical” result is an average over a population that does not exist.',
    launch: 'Large launch vehicles mix deterministic global modes, transitional panel/cavity behavior, and dense high-frequency response. Frequency-dependent hybrid boundaries are more credible than declaring an entire vehicle “FE” or “SEA.”',
    findings: [
      'Modes per band and modal overlap measure different things: a band can contain many narrow isolated modes or a few heavily overlapping modes.',
      'SEA output is a mean; local response and unit-to-unit variability require confidence bands or explicit variance models.',
      'Weak coupling is not “small CLF” by itself; compare coupling with internal loss and verify that coupled modes remain statistically distinct.',
      'Sparse accelerometer averages can bias subsystem energy, especially on inhomogeneous sandwich panels with doublers and concentrated mass.'
    ],
    decisions: ['Gate SEA by band and subsystem using several readiness indicators.', 'Report mean, variance/confidence, and spatial-estimator assumptions together.', 'Use hybrid deterministic–statistical methods through transition regions.'],
    limitation: 'The readiness calculator uses teaching thresholds and an approximate variability relation. Program predictions need method-specific confidence models, measured parameter uncertainty, and subsystem validation.',
    references: 'Lyon & DeJong; Burroughs, Fischer & Kern; NASA-CR-161334; ACS 519 SEA block; local TR 12-007 experimental SEA study.'
  },
  {
    id: 'double-panel-sea-deep-dive', number: '22', caseNumber: '19', toolId: 'double-panel-sea', demoId: 'double-panel-energy-paths',
    title: 'Flexible Double-Window Transmission & SEA Networks', eyebrow: 'Build the energy path one subsystem at a time',
    summary: 'Build an editable SEA chain, solve energy and gross/net power flow, recover acoustic or structural velocity, and use the Price–Crocker double-window template to change the medium between flexible panes.',
    source: 'ACS 519 pp. 555–586', equation: '[η]{E} = {P}/ω &nbsp; · &nbsp; n<sub>gap</sub>(f)≈2πAf/c² below c/(2ℓ)',
    mechanism: 'A flexible double window is a five-subsystem chain: source-room acoustics, pane-1 flexure, gap acoustics, pane-2 flexure, and receiving-room acoustics. Internal loss dissipates energy; directional CLFs carry gross power in both directions; reciprocity derives the reverse CLF from modal density. The gap medium changes sound speed, density, impedance, modal density, cross-gap cut-on, mass–fluid–mass behavior, pane velocity, and received pressure.',
    intuition: 'SEA is an energy circuit, but every node is a physical population of modes. Adding a pane, cavity, liner, frame, or receiving volume creates another place to store and dissipate energy and another pair of gross exchange paths. Changing the fluid between panes rewires those exchanges because the fluid modes and impedance change.',
    launch: 'Payload windows, double-wall fairing bays, multilayer closeouts, acoustic blankets, equipment enclosures, and fluid-backed panels can be partitioned into acoustic and structural subsystems. The frame, seals, attachments, vents, and direct fields must be added as explicit paths when they bypass the nominal pane–gap chain.',
    findings: [
      'The source-to-receiver TL emerges from the complete energy balance; it cannot be obtained by simply adding two single-pane mass-law values.',
      'Gross power crosses every reciprocal link in both directions. Net flow is their difference and follows modal energy per mode rather than total energy alone.',
      'Below the first cross-gap acoustic mode, the thin cavity has a two-dimensional modal density. Above c/(2ℓ), modes across the thickness activate and the gap becomes a three-dimensional acoustic subsystem.',
      'Changing gap medium shifts density, sound speed, impedance, cavity modal population, mass–fluid–mass scale, reciprocal CLFs, pane velocity, and receiving-room level; a dense liquid can also invalidate dry-pane and weak-coupling assumptions.'
    ],
    decisions: ['Partition by stored-energy mechanism and wave type, then add only physically defensible reciprocal connections.', 'Inspect energy, energy per mode, internal dissipation, gross exchange, net flow, velocity, and TL together.', 'Add frame, seal, vent, nonresonant, and direct-field paths before crediting a pane, gap medium, damping, or absorber change.'],
    limitation: 'The editable demo is a reciprocal linear chain with one CLF per adjacent pair. The window template uses asymptotic modal densities and screened fluid-impedance coupling; it does not resolve finite pane/frame modes, coincidence, detailed radiation efficiency, seal leakage, trim, nonresonant mass-law transmission, or strong hydroelastic loading.',
    references: 'Price & Crocker double-panel SEA; ACS 519 Price–Crocker application; Maidanik radiation efficiency; Beranek mass law.'
  },
  {
    id: 'khie-deep-dive', number: '23', caseNumber: '20', toolId: 'khie-boundary', demoId: 'khie-surface-contributions',
    title: 'Green Functions & the Kirchhoff–Helmholtz Integral', eyebrow: 'Reconstruct the field from its boundary',
    summary: 'Interpret Green functions as acoustic transfer functions and see how coherent pressure and normal-velocity contributions on a surface create interior and exterior sound fields.',
    source: 'ACS 519 pp. 1–20 and 409–426', equation: 'p(r)=∫<sub>Γ</sub>[p(r₀)∂G/∂n − iωρ₀v<sub>n</sub>(r₀)G]dΓ',
    mechanism: 'A Green function is the wave-equation response between a source point and field point. Green’s identity converts the volume problem into a coherent surface integral of pressure-like dipoles and velocity-like monopoles. Normal direction, interior/exterior convention, and the pressure jump on the boundary determine the signs.',
    intuition: 'Imagine tiling the vibrating structure with tiny acoustic sources. Each tile launches a wave with its own amplitude, distance, directivity, and phase. The field is the complex sum—not the sum of tile magnitudes.',
    launch: 'KHIE underpins boundary-element predictions of fairing radiation, payload-cavity fields, exterior scattering, apertures, and pressure fields generated by structural motion when a volume acoustic mesh would be inefficient.',
    findings: [
      'Only normal structural velocity couples directly to an inviscid acoustic fluid; tangential structural motion matters through geometry and structural coupling, not direct shear traction in the fluid.',
      'Surface pressure and velocity terms can reinforce or cancel, so solving only one boundary variable requires a formulation that correctly supplies the other.',
      'The free-space Green function automatically satisfies outgoing-wave behavior but creates exterior BEM nonuniqueness at fictitious interior resonances.',
      'Far-field approximations remove reactive terms only after distance and aperture criteria are met; near launch hardware, 1/r²-like contributions can remain important.'
    ],
    decisions: ['Define the normal and time-harmonic sign convention before deriving or coding the integral.', 'Preserve complex phase throughout surface summation.', 'Select direct, indirect, or combined BEM formulations with their uniqueness and conditioning behavior in mind.'],
    limitation: 'The paired tool shows one constant patch in free space. A physical solution needs a closed converged boundary, appropriate Green function, full coupled boundary data, and a verified uniqueness treatment.',
    references: 'Kirchhoff–Helmholtz integral; Green identities; Junger & Feit; ACS 519 KHIE and BEM blocks.'
  },
  {
    id: 'pipe-flow-noise-deep-dive', number: '24', caseNumber: '21', toolId: 'pipe-flow-noise', demoId: 'pipe-noise-pathways',
    title: 'Flow-Induced Noise in Pipes & Shells', eyebrow: 'One source, several propagating paths',
    summary: 'Compare convected turbulent pressure, internal acoustic modes, wall bending and shell waves, fittings, supports, and external radiation in fluid-system noise.',
    source: 'ACS 519 pp. 619–635', equation: 'k<sub>conv</sub>=ω/U<sub>c</sub> &nbsp; · &nbsp; f<sub>cut,on</sub>=χ′<sub>np</sub>c/(2πR)',
    mechanism: 'Turbulence and discontinuities excite both the internal fluid and the pipe wall. Acoustic, convective, and structural wavenumbers determine which fields propagate and which couple efficiently. Elbows, valves, supports, and area changes scatter and convert wave families.',
    intuition: 'The fastest path is not always the loudest path. A pressure fluctuation can ride with the flow, launch an acoustic wave, bend the wall, travel through supports, or convert at an elbow—and each path reaches a different receiver with different phase and attenuation.',
    launch: 'Propellant feed lines, pressurization plumbing, purge and environmental-control ducts, vents, valves, turbomachinery, and ground-support interfaces can transmit both fluid-borne and structure-borne noise into tanks, stages, avionics, and payload cavities.',
    findings: [
      'Below the first non-plane acoustic cut-on, the internal field is dominated by the plane mode even though the wall can support several structural families.',
      'Convective pressure couples most efficiently when its axial wavenumber approaches a wall-bending or shell wavenumber; a point PSD cannot reveal this match.',
      'Elbows couple out-of-plane and in-plane motion, allowing nominally weak torsional or axial waves to become radiating bending waves.',
      'A straight-pipe prediction is a baseline; pumps, valves, cavitation, shocks, supports, and two-phase flow usually set installed hot spots.'
    ],
    decisions: ['Map acoustic, convective, and structural dispersion on the same frequency–wavenumber axes.', 'Identify discontinuities and supports as explicit wave-conversion elements.', 'Use synchronized pressure, vibration, and phase data to separate fluid-borne from structure-borne paths.'],
    limitation: 'The paired tool models a uniform straight thin pipe, one convection speed, and ideal shell scales. Mean pressure, temperature gradients, elbows, valves, supports, turbulence spectra, shocks, and multiphase behavior require dedicated models or tests.',
    references: 'Fahy & Gardonio pipe/shell acoustics; Junger & Feit; Blake flow-induced vibration; ACS 519 cylindrical-shell flow-noise block.'
  },
  {
    id: 'wave-matching-deep-dive', number: '25', caseNumber: '22', toolId: 'wave-matching-atlas', demoId: 'frequency-wavenumber-atlas',
    title: 'Frequency–Wavenumber Maps & Wave Matching', eyebrow: 'Frequency says when; wavenumber says whether',
    summary: 'Place acoustic, convective, flexural, extensional, and shear waves on one frequency–wavenumber map to expose coincidence, critical speeds, source–receiver matching, and theory limits.',
    source: 'ACS 519 pp. 227–247', equation: 'k<sub>a</sub>=ω/c₀ &nbsp; · &nbsp; k<sub>b</sub>=(m′ω²/D)<sup>1/4</sup> &nbsp; · &nbsp; k<sub>c</sub>=ω/U<sub>c</sub>',
    mechanism: 'Efficient coupling needs temporal and spatial compatibility. Two fields can share a frequency yet exchange little energy when their wavelengths and propagation directions differ. Intersections in frequency–wavenumber space reveal where an acoustic wave, convecting pressure ridge, or structural family can write a pattern that the receiving structure can support.',
    intuition: 'Frequency is the tempo; wavenumber is the choreography. A panel responds strongly only when the forcing arrives at the right tempo and with a spatial pattern that its surface can follow instead of canceling.',
    launch: 'Fairing skins under turbulent boundary layers, payload-cavity acoustics, cylindrical barrels, ducts, feedlines, and stiffened panels all carry different wave families. A shared map prevents acoustic coincidence, convective matching, shell ring behavior, and duct cut-on from being treated as unrelated special cases.',
    findings: [
      'Classical acoustic coincidence and turbulent-boundary-layer matching compare structural bending waves with different source speeds; their matching frequencies can therefore be far apart.',
      'A high stiffness-to-mass panel can reach acoustic coincidence earlier even while its static deflection and low-frequency response improve.',
      'Longitudinal and shear waves usually occupy lower-wavenumber lanes than bending waves, but joints, frames, and curvature can convert energy between them.',
      'When kh is no longer small, a classical thin-plate line can predict the wrong wavelength and move every apparent intersection; shear and rotary inertia must then enter the dispersion model.'
    ],
    decisions: ['Plot source and receiver wave families on the same axes before choosing a coupling model.', 'Distinguish acoustic sound speed from boundary-layer convection speed and mean flow speed.', 'Mark the validity boundary of each dispersion relation alongside its intersections.'],
    limitation: 'The paired atlas uses uniform isotropic thin-plate, nondispersive acoustic, extensional, shear, and single-speed convective relations. Orthotropy, shell curvature, mean-flow acoustics, finite modes, shocks, and broadband wavenumber spectra require richer models.',
    references: 'Cremer, Heckl & Ungar; Fahy & Gardonio; Blake; ACS 519 frequency–wavenumber diagrams.'
  },
  {
    id: 'driven-radiation-deep-dive', number: '26', caseNumber: '23', toolId: 'driven-radiation', demoId: 'force-to-sound-power',
    title: 'Driven Response: Force to Sound Power', eyebrow: 'Follow the complete transfer path',
    summary: 'Connect a point force to modal velocity, drive mobility, surface-averaged response, resonant and nonresonant radiation, and the final sound-power-per-force transfer function.',
    source: 'ACS 519 pp. 158–174 and 200–226', equation: 'Y<sub>rf</sub>=v<sub>r</sub>/F<sub>f</sub> &nbsp; · &nbsp; W/F²=ρ₀c₀Sσ⟨|Y|²⟩',
    mechanism: 'A point force excites each structural mode in proportion to its shape at the drive location. The modal velocities add at a response point, while their orthogonal surface energies feed radiation through mode-dependent efficiency. Damping and modal overlap gradually replace isolated finite resonances with an outgoing-wave trend.',
    intuition: 'The loudest structural resonance is not automatically the loudest acoustic contribution. The force must first see the mode, the surface must move coherently, and that spatial pattern must then couple to propagating sound.',
    launch: 'Engine, turbopump, actuator, umbilical, bracket, and shaker forces enter launch hardware at localized interfaces. Translating those forces into payload-cavity noise requires the entire force–mobility–surface-velocity–radiation chain rather than a single accelerometer FRF.',
    findings: [
      'Moving the force onto a modal node can remove that resonance from the drive mobility without removing the mode from the structure.',
      'Surface-averaged mobility is the correct bridge to radiated power; a high local transfer mobility can coexist with modest global surface motion.',
      'With increasing damping and modal overlap, finite reflections lose prominence and the average response approaches an infinite-plate traveling-wave trend.',
      'Nonresonant modes can carry an important share of sound power near and above coincidence even when a resonant mode controls the visible vibration peak.'
    ],
    decisions: ['Retain force and response locations in modal transfer calculations.', 'Separate resonant and nonresonant acoustic power instead of assigning one radiation factor to total RMS motion.', 'Use modal overlap to decide when individual modes or wave-based averages are the more credible description.'],
    limitation: 'The paired model uses a baffled simply supported isotropic plate, proportional damping, a truncated modal basis, and screening radiation efficiencies. Attachments, curvature, nonuniform force footprints, fluid loading, joints, and detailed directivity need test or coupled FE/BE analysis.',
    references: 'Ewins; Wallace; Maidanik; Fahy & Gardonio; ACS 519 forced-response and damped-plate blocks.'
  },
  {
    id: 'intensity-testing-deep-dive', number: '27', caseNumber: '24', toolId: 'sound-intensity-probe', demoId: 'intensity-probe-lab',
    title: 'Sound Intensity & Radiation Testing', eyebrow: 'Measure the energy flow, not pressure alone',
    summary: 'Use a phase-matched two-microphone probe to recover active intensity, integrate sound power, estimate radiation efficiency, and understand spacing, phase, reflection, and scan-surface errors.',
    source: 'ACS 519 pp. 33–37 and 650–658', equation: 'I<sub>n</sub>=Re{p u<sub>n</sub><sup>*</sup>} &nbsp; · &nbsp; u<sub>n</sub>≈−(p₂−p₁)/(iωρ₀d)',
    mechanism: 'The pressure difference across a short spacer estimates the pressure gradient and therefore particle velocity. Multiplying pressure by the in-phase velocity component recovers active energy flow. Finite spacing attenuates the gradient at high frequency, while tiny microphone phase mismatch can dominate at low frequency or in reactive fields.',
    intuition: 'Pressure says how hard the fluid oscillates; intensity says where acoustic energy actually goes. Two nearly identical microphones infer that direction from a very small phase difference, which is why both spacing and phase matching matter.',
    launch: 'Intensity scans can locate fairing or equipment-panel radiation hot spots, distinguish outward power from standing pressure, close acoustic test-cell power balances, and validate FE/BE radiation patterns before extrapolating to flight.',
    findings: [
      'The ACS 519 kd<0.55 rule provides an upper-frequency spacing screen; a single spacer cannot cover an unlimited band.',
      'Reducing the spacer improves high-frequency gradient accuracy but makes low-frequency results more sensitive to microphone phase mismatch and self-noise.',
      'Reflections increase reactive intensity, so a small phase error can produce a large active-intensity bias or even an apparent direction reversal.',
      'Radiation efficiency measured from scan power is credible only when the scan captures the complete outward flux and the structural velocity average represents the same radiating surface and band.'
    ],
    decisions: ['Select probe spacer and microphone pair for the actual frequency band and field reactivity.', 'Inspect signed normal intensity and tangential flow rather than integrating magnitudes.', 'Close the scan surface and carry phase, position, background, and velocity-average uncertainty into radiation efficiency.'],
    limitation: 'The paired model represents a locally planar single-frequency field with one reflection coefficient and a constant phase mismatch. Real probes require calibration, finite-difference corrections, residual-intensity qualification, background checks, spatial sampling, and a complete scan geometry.',
    references: 'Fahy sound intensity; ISO 9614 principles; Gardonio; ACS 519 piston and plate-radiation demonstrations.'
  },
  {
    id: 'launch-acoustic-sources-deep-dive', number: '28', caseNumber: '25', toolId: 'launch-acoustic-source', demoId: 'launch-source-map',
    title: 'Launch Acoustic Sources & Propagation', eyebrow: 'From plume power to vehicle pressure',
    summary: 'Follow broadband rocket-plume noise from distributed source generation through directivity, pad reflections, shielding, water suppression, atmospheric loss, and the moving launch vehicle.',
    source: 'ACS 519 source, propagation, intensity, and distributed-forcing blocks; NASA SP-8072 and modern launch-source measurements', equation: 'W<sub>a</sub>=η<sub>a</sub>FV<sub>e</sub>/2 &nbsp; · &nbsp; I(r)=∫ W′<sub>a</sub>(x)G(x,r)/(4πR²) dx',
    mechanism: 'Turbulent mixing, shocks, and plume–pad interactions convert part of the exhaust mechanical power into sound over an extended, time-dependent source region. The pressure reaching a vehicle station then depends on source position, directivity, geometric spreading, reflections, shielding, suppression water, atmospheric absorption, and vehicle trajectory.',
    intuition: 'A rocket plume is not a loudspeaker at the nozzle. It is a moving line of source regions whose loudest acoustic contribution can sit downstream and migrate with operating condition. A receiver close to that line sees different pieces at different ranges and angles, so one point-source distance can give the wrong answer even when total acoustic power is reasonable.',
    launch: 'The source map links propulsion and pad design to liftoff spectra on fairings, interstages, payload cavities, and ground equipment. It also keeps ignition overpressure separate from the later broadband plume-noise environment so the two mechanisms are not hidden inside one OASPL.',
    findings: [
      'The dominant launch-acoustic source is distributed and time dependent; phased arrays and plume measurements show that source location and directivity change with frequency, vehicle altitude, and pad interaction.',
      'NASA SP-8072 remains a useful heritage screen, but modern measurements and simulations are needed where plume geometry, clustered engines, deflectors, towers, and reflected fields depart from its empirical basis.',
      'Water suppression changes the source and propagation field rather than applying a universal decibel subtraction; injection location, flow rate, droplet field, and plume interaction determine the benefit and can introduce separate multiphase loads.',
      'OASPL alone cannot predict structural response. Spectrum, spatial correlation, incidence, trajectory, and coincidence with vehicle modes determine which panels and payloads respond.'
    ],
    decisions: ['Represent the plume as a distributed source when receiver distance is comparable with source length.', 'Maintain separate models for broadband plume noise, ignition overpressure, discrete tones, and pad-specific reflections.', 'Correlate source strength, spatial field, and suppression performance with array, microphone, and flight data before qualification use.'],
    limitation: 'The paired tool is an incoherent broadband line-source screen with an assumed acoustic efficiency and teaching spectrum. It does not predict ignition overpressure, shock-cell tones, coherent reflections, clustered-plume interference, nonlinear propagation, detailed atmospheric weather, or multiphase plume–water CFD.',
    references: 'NASA SP-8072; NASA/TM-2013-216625; Shuttle/Ares launch-plume measurements; SLS Scale Model Acoustic Test; NASA plume–water suppression studies.',
    referenceLinks: [
      ['NASA SP-8072: Acoustic Loads Generated by the Propulsion System', 'https://ntrs.nasa.gov/citations/19710023719'],
      ['Modern distributed launch-source prediction', 'https://ntrs.nasa.gov/citations/20110012036'],
      ['SLS Scale Model Acoustic Test', 'https://ntrs.nasa.gov/citations/20150021421'],
      ['Launch-plume source mapping with phased arrays', 'https://ntrs.nasa.gov/citations/20140011422']
    ]
  },
  {
    id: 'wet-tank-dynamics-deep-dive', number: '29', caseNumber: '26', toolId: 'wet-tank-dynamics', demoId: 'wet-tank-coupling',
    title: 'Fluid-Filled Tanks & Wet-Wall Coupling', eyebrow: 'The propellant becomes part of the structure',
    summary: 'Separate gravity slosh, compressible liquid acoustics, shell vibration, added mass, and two-way hydroelastic coupling as fill level and effective acceleration change.',
    source: 'ACS 519 pp. 587–635; NASA-TP-1558; NASA SP-8009', equation: 'f<sub>wet</sub>≈f<sub>dry</sub>/√(1+m′<sub>a</sub>/m′<sub>s</sub>) &nbsp; · &nbsp; ω²<sub>slosh</sub>=g<sub>eff</sub>k tanh(kh)',
    mechanism: 'Normal shell motion must accelerate nearby liquid, adding inertia and lowering structural frequencies. A free surface supports low-frequency gravity waves, while liquid compressibility supports much higher acoustic modes. When a wet shell mode approaches a liquid acoustic mode, pressure and wall velocity exchange energy in both directions and an uncoupled correction is no longer adequate.',
    intuition: 'A dry tank wall can move by itself; a wet wall must carry a neighborhood of propellant with it. Slow free-surface motion is a gravity problem, fast pressure waves are a compressibility problem, and the flexible wall sits between them. Calling all three “slosh” hides the mechanisms that drive loads and response.',
    launch: 'Propellant tanks move through changing fill, acceleration, pressure, temperature, ullage, and boundary conditions during ascent. These states shift global vehicle modes, local wet-wall vibration, feed-system pressure fields, sensor response, and the validity of dry modal-test correlations.',
    findings: [
      'Liquid added mass can move shell resonances far below their dry values; the shift depends on mode shape and wetted geometry, not liquid mass divided by total shell mass.',
      'Gravity slosh, compressible liquid acoustics, and shell modes occupy different frequency families and require different damping, forcing, and validation data.',
      'When wet-shell and liquid-acoustic scales approach one another, mode shapes become hydroelastic and two-way fluid–structure coupling is needed instead of a one-way added-mass correction.',
      'Fill fraction, effective acceleration, pressurization, temperature-dependent liquid properties, ullage gas, diaphragms, and baffles make the dynamic model trajectory dependent.'
    ],
    decisions: ['Track dry shell, wet shell, gravity-slosh, and liquid-acoustic scales separately across the flight timeline.', 'Use mode-dependent added mass only as a screening step and escalate near frequency crossings or strong pressure feedback.', 'Plan wet modal, slosh, and pressure measurements at representative fill, acceleration, pressure, and thermal states.'],
    limitation: 'The paired tool applies a local incompressible added-mass screen to a uniform thin cylinder and simplified first slosh/acoustic scales. It omits real tank domes, baffles, diaphragms, ullage compliance, pressurization stiffening, cryogenic property gradients, damping, feedline coupling, and full hydroelastic eigenvectors.',
    references: 'NASA-TP-1558 hydroelastic vibration of partially liquid-filled shells; NASA SP-8009 propellant slosh loads; ACS 519 cylindrical-shell and pipe-acoustic blocks.',
    referenceLinks: [
      ['NASA-TP-1558: Hydroelastic Vibration of Partially Liquid-Filled Shells', 'https://ntrs.nasa.gov/citations/19800011283'],
      ['NASA SP-8009: Propellant Slosh Loads', 'https://ntrs.nasa.gov/citations/19690005221'],
      ['Liquid-filled shell vibration reference', 'https://ntrs.nasa.gov/citations/19670010713']
    ]
  },
  {
    id: 'qualification-testing-deep-dive', number: '30', caseNumber: '27', toolId: 'qualification-test-planner', demoId: 'qualification-notching',
    title: 'Vibroacoustic Qualification & Test Design', eyebrow: 'Tailor the test to the objective',
    summary: 'Translate flight environments into duration-equivalent vibration and acoustic tests while managing margin, force limiting, response notching, field uniformity, damage equivalence, and method applicability.',
    source: 'ACS 519 test and response blocks; NASA-STD-7001C; NASA-HDBK-7010; NASA-HDBK-7004C; MSFC-STD-3676B', equation: 'G<sub>test</sub>/G<sub>flight</sub>=(T<sub>flight</sub>/T<sub>test</sub>)<sup>2/b</sup>10<sup>M/10</sup>',
    mechanism: 'Qualification turns uncertain flight exposure into a controlled test that demonstrates workmanship and design robustness without creating unrealistic interface forces or local responses. Duration and margin set an unlimited spectrum; force and response measurements then protect the article through justified notches while preserving the stated damage or response objective.',
    intuition: 'A qualification test is not a perfect replay of flight. The fixture, chamber, shakers, speakers, and control sensors create a different impedance and spatial field. Good tailoring asks which evidence the test must produce, then controls the ways the laboratory can overtest or undertest the hardware.',
    launch: 'Payload and launch-vehicle programs must distinguish governing applicability. NASA-STD-7001C addresses payloads and excludes launch vehicles; launch-vehicle criteria, notching authority, acceptance philosophy, and factors remain program controlled. RFAT, DFAT, shaker, and multi-axis tests must be selected and correlated for the actual hardware and objective.',
    findings: [
      'A test spectrum is a verification construct, not a claim that the laboratory reproduces every flight pressure, coherence, impedance, or load path.',
      'Force limiting and response notching can prevent fixture-driven overtest, but every limit needs pretest prediction, instrumentation, rationale, approval authority, and post-test evidence that the objective was preserved.',
      'NASA DFAT guidance warns that microphone levels within tolerance do not guarantee the same spatial field or structural response as a reverberant-field test.',
      'Applicability is part of the physics and compliance story: NASA-STD-7001C is payload-focused, while launch vehicles require their governing program standards and tailored criteria.'
    ],
    decisions: ['Define the verification objective and governing standard before setting levels, duration, margin, tolerances, or notches.', 'Design control, force, response, and field instrumentation together with the pretest model and abort logic.', 'Compare response, damage metrics, field uniformity, interface forces, and post-test health checks—not control level alone.'],
    limitation: 'The paired planner is a single-band fatigue-equivalence and notch screen. It does not prescribe qualification factors or approve notches, and it omits multi-axis sequencing, non-Gaussian response, cross-axis coupling, detailed fatigue curves, chamber modes, transducer uncertainty, workmanship floors, and program-specific acceptance rules.',
    references: 'NASA-STD-7001C; NASA-HDBK-7010; NASA-HDBK-7004C force-limited vibration testing; MSFC-STD-3676B response limiting and notching.',
    referenceLinks: [
      ['NASA-STD-7001C: Payload Vibroacoustic Test Criteria', 'https://standards.nasa.gov/standard/NASA/NASA-STD-7001'],
      ['NASA-HDBK-7010: Direct Field Acoustic Testing', 'https://standards.nasa.gov/standard/nasa/nasa-hdbk-7010'],
      ['NASA force-limited vibration testing monograph', 'https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/19970023193.pdf'],
      ['MSFC-STD-3676B: Response Limiting and Notching', 'https://standards.nasa.gov/standard/MSFC/MSFC-STD-3676']
    ]
  }
];

function concept(title, equation, body, interpretation, mistake, toolId, tags) {
  return { title, equation, body, interpretation, mistake, toolId, tags };
}

export const acs519Sections = modules.map(module => ({
  id: module.id,
  number: module.number,
  title: module.title,
  eyebrow: module.eyebrow,
  summary: module.summary,
  deepDiveId: `acs519-${module.id}`,
  concepts: [
    concept('Governing mechanism', module.equation, module.mechanism, module.intuition, 'Starting from the equation without first identifying the energy, wave, or coupling mechanism it represents.', module.toolId, ['ACS 519', 'governing model']),
    concept('Physical intuition', '', module.intuition, module.mechanism, 'Using one local response amplitude as though it described the coherent behavior of the complete system.', module.toolId, ['intuition', 'wave physics']),
    concept('Launch-vehicle deep-dive findings', '', `${module.launch} Findings: ${module.findings.join(' ')}`, `The launch-vehicle implication is configuration- and band-dependent; use the findings to select the next fidelity level rather than as universal correction factors.`, 'Transferring a laboratory idealization directly to flight hardware without accounting for joints, curvature, cavities, spatial forcing, and uncertainty.', module.toolId, ['launch vehicles', 'aerospace']),
    concept('Engineering decisions', '', module.decisions.join(' '), `These decisions turn the model into an analysis plan with explicit verification and sensitivity checks.`, 'Reporting a nominal result without stating which design choice it supports or which uncertainty could reverse that choice.', module.toolId, ['design', 'verification']),
    concept('Model boundaries', '', module.limitation, `A useful screening model narrows the question; it does not expand its own validity. Source block: ${module.source}.`, 'Treating numerical precision as evidence that omitted physics are negligible.', module.toolId, ['assumptions', 'validity'])
  ]
}));

function appendAcs537Concept(sectionId, item) {
  const section = acs519Sections.find(candidate => candidate.id === sectionId);
  if (section) section.concepts.push(item);
}

appendAcs537Concept('intensity-testing-deep-dive', concept('Active and reactive acoustic intensity', 'I=½Re{pu*};  Q=½Im{pu*}', 'Active intensity represents net time-average acoustic power flow. Reactive intensity represents stored, oscillating energy near sources, standing waves, and boundaries; large pressure alone can coexist with little outward power.', 'Use pressure–velocity phase to distinguish radiation from locally stored acoustic energy.', 'Converting pressure to intensity with p²/ρc inside a reactive or strongly reflected field.', 'sound-intensity-probe', ['active intensity', 'reactive intensity', 'near field']));
appendAcs537Concept('launch-acoustic-sources-deep-dive', concept('Atmosphere, ground, and weather after source prediction', 'Lp=Lw+DI−Adiv−Aatm+Aground+Amet', 'Once plume source strength and directivity are estimated, receiver level still depends on molecular absorption, ground impedance/interference, turbulence, terrain, and effective sound-speed profiles.', 'Source correlation and propagation correlation must remain separate so weather is not absorbed into an empirical source level.', 'Calibrating plume acoustic power to one long-range measurement without its meteorology.', 'outdoor-propagation', ['launch acoustics', 'weather', 'ground effect']));
appendAcs537Concept('elastic-panel-tl-deep-dive', concept('Laboratory TL versus installed enclosure performance', 'TLinstalled=−10log10Σ(Si/S)τi', 'Coupon TL describes transmission through the specimen under a stated field and mounting. Installed benefit includes seals, doors, openings, ventilation, joints, finite size, flanking, internal absorption, and receiver geometry.', 'Installed insertion loss follows the full parallel path, not the best panel coupon.', 'Applying mass-law or laboratory TL directly to a fairing, enclosure, or equipment bay with penetrations.', 'enclosure-design', ['installed TL', 'flanking', 'openings']));

export const acs519ToolCatalog = [
  { id: 'modal-radiation', title: 'Modal Plate Radiation', category: 'Structural Acoustics', description: 'Integrate baffled simply supported panel-mode radiation, directivity, parity cancellation, and coincidence behavior.', complexity: 'Advanced', keywords: ['Wallace', 'modal radiation', 'corner radiation', 'parity'] },
  { id: 'piston-radiation', title: 'Baffled Piston & Fluid Loading', category: 'Structural Acoustics', description: 'Calculate ka, directivity, radiation resistance/reactance, efficiency, and acoustic added mass for a circular piston.', complexity: 'Core', keywords: ['Rayleigh integral', 'radiation impedance', 'added mass', 'directivity'] },
  { id: 'shell-acoustics', title: 'Cylindrical Shell Acoustics', category: 'Structural Acoustics', description: 'Compare shell-mode, ring, coincidence, and internal acoustic cut-on scales across circumferential order.', complexity: 'Advanced', keywords: ['shell modes', 'ring frequency', 'lobar', 'fairing'] },
  { id: 'fe-be-planner', title: 'FE–BE Vibroacoustic Model Planner', category: 'Structural Acoustics', description: 'Plan structural and acoustic mesh resolution, coupled model size, convergence checks, and BEM uniqueness safeguards.', complexity: 'Advanced', keywords: ['finite element', 'boundary element', 'CHIEF', 'mesh convergence'] },
  { id: 'elastic-panel-tl', title: 'Elastic Panel Transmission Loss', category: 'Structural Acoustics', description: 'Calculate angle-dependent and diffuse thin-panel transmission through mass, coincidence, stiffness, and damping regions.', complexity: 'Advanced', keywords: ['TL', 'coincidence dip', 'diffuse incidence', 'mass law'] },
  { id: 'orthotropic-panel', title: 'Orthotropic Panel Coincidence', category: 'Structures', description: 'Explore directional rigidity, bending phase speed, and critical-frequency variation for ribbed, composite, and sandwich panels.', complexity: 'Advanced', keywords: ['orthotropic', 'sandwich', 'directional coincidence', 'D matrix'] },
  { id: 'loss-factor-budget', title: 'Loss-Factor Budget & Test Cross-Check', category: 'Dynamics', description: 'Combine structural, radiation, joint, fluid, and coupling losses and compare bandwidth, decay, and power-injection estimates.', complexity: 'Core', keywords: ['damping', 'loss factor', 'power injection', 'T60'] },
  { id: 'modal-test-planner', title: 'Mobility & Modal-Test Planner', category: 'Test & Signal', description: 'Screen modal participation, node placement, spatial grid density, frequency resolution, and accelerometer mass loading.', complexity: 'Core', keywords: ['mobility', 'FRF', 'modal node', 'sensor mass'] },
  { id: 'sea-validity-confidence', title: 'SEA Validity & Confidence', category: 'SEA & Energy', description: 'Assess modes per band, modal overlap, weak coupling, spatial sampling, and approximate response variability.', complexity: 'Advanced', keywords: ['SEA validity', 'modal overlap', 'confidence', 'variability'] },
  { id: 'double-panel-sea', title: 'Double-Window SEA & Network Builder', category: 'SEA & Energy', description: 'Solve editable reciprocal subsystem chains and a medium-dependent source-room–pane–gap–pane–receiver window model for energy, power flow, velocity, and TL.', complexity: 'Advanced', keywords: ['double window', 'SEA network', 'gap medium', 'power flow', 'transmission loss'] },
  { id: 'khie-boundary', title: 'KHIE Boundary Contribution', category: 'Acoustics', description: 'Resolve coherent surface-pressure and normal-velocity contributions from a boundary patch using a free-space Green function.', complexity: 'Advanced', keywords: ['Kirchhoff Helmholtz', 'Green function', 'BEM', 'boundary integral'] },
  { id: 'pipe-flow-noise', title: 'Pipe Flow-Noise Pathway Screener', category: 'Aero / Distributed Loads', description: 'Compare convective pressure, internal acoustic cut-on, wall bending, shell modes, and wavenumber matching in pipes.', complexity: 'Advanced', keywords: ['pipe noise', 'flow induced', 'cut-on', 'convective wavenumber'] },
  { id: 'wave-matching-atlas', title: 'Frequency–Wavenumber Matching Atlas', category: 'Waves & Structures', description: 'Compare acoustic, convective, bending, extensional, and shear dispersion with coincidence, critical-speed, and theory-validity checks.', complexity: 'Advanced', keywords: ['dispersion', 'wave matching', 'critical speed', 'frequency wavenumber'] },
  { id: 'driven-radiation', title: 'Force-to-Sound-Power Transfer', category: 'Structural Acoustics', description: 'Calculate point-force mobility, surface response, modal overlap, radiation efficiency, and resonant/nonresonant sound power.', complexity: 'Advanced', keywords: ['driven response', 'surface mobility', 'sound power', 'point force'] },
  { id: 'sound-intensity-probe', title: 'Sound-Intensity Probe & Scan Planner', category: 'Test & Signal', description: 'Screen probe spacing, phase mismatch, reflection bias, signed intensity, scan power, and measured radiation efficiency.', complexity: 'Core', keywords: ['sound intensity', 'two microphone', 'probe spacing', 'radiation efficiency'] },
  { id: 'dynamic-stress-environment', title: 'Dynamic Stress & Launch-Environment Margin', category: 'Shock & Fatigue', description: 'Convert modal displacement to curvature stress while applying temperature-dependent properties, pressure preload, fatigue, and yield screens.', complexity: 'Advanced', keywords: ['dynamic stress', 'temperature', 'pressure preload', 'fatigue margin'] },
  { id: 'launch-acoustic-source', title: 'Distributed Launch-Acoustic Source', category: 'Aero / Distributed Loads', description: 'Screen plume acoustic power, distributed-source geometry, directivity, pad gain, suppression, spreading, and spectrum.', complexity: 'Advanced', keywords: ['launch acoustics', 'rocket plume', 'water suppression', 'source map'] },
  { id: 'wet-tank-dynamics', title: 'Wet-Tank Hydroelastic Dynamics', category: 'Structures', description: 'Compare dry and wet shell modes, mode-dependent added mass, gravity slosh, and liquid acoustic frequencies across fill level.', complexity: 'Advanced', keywords: ['propellant tank', 'hydroelastic', 'slosh', 'added mass'] },
  { id: 'qualification-test-planner', title: 'Vibroacoustic Qualification Planner', category: 'Test & Signal', description: 'Tailor duration-equivalent vibration and acoustic tests with margins, force/response limits, notching, and field-uniformity screens.', complexity: 'Advanced', keywords: ['qualification', 'force limiting', 'DFAT', 'notching'] }
];

export const acs519Demos = [
  { id: 'modal-radiation-patterns', title: 'Why Some Plate Modes Sound Loud', description: 'Change mode order and wavenumber ratio to watch lobe cancellation, edge/corner sources, directivity, and modal radiation efficiency change together.', topic: 'Structural Acoustics', toolId: 'modal-radiation' },
  { id: 'piston-fluid-loading', title: 'Piston Directivity & Added Mass', description: 'Sweep ka from a compact reactive source to a directional resistance-dominated radiator.', topic: 'Structural Acoustics', toolId: 'piston-radiation' },
  { id: 'shell-wave-map', title: 'Shell Mode Families', description: 'Sweep circumferential order to see curvature lower shell frequencies before local bending turns the family upward.', topic: 'Shells', toolId: 'shell-acoustics' },
  { id: 'fe-be-model-trust', title: 'When the Mesh Stops Telling the Truth', description: 'Raise frequency and watch structural/acoustic wavelengths, element counts, dispersion risk, and BEM cost separate.', topic: 'Computational Vibroacoustics', toolId: 'fe-be-planner' },
  { id: 'panel-tl-angle', title: 'The Coincidence Trough Moves with Angle', description: 'Change incidence and damping while the elastic-panel transmission trough sweeps through frequency.', topic: 'Transmission', toolId: 'elastic-panel-tl' },
  { id: 'orthotropic-coincidence', title: 'Directional Coincidence', description: 'Rotate propagation across an orthotropic panel and watch stiffness, wave speed, and critical frequency change.', topic: 'Aerospace Panels', toolId: 'orthotropic-panel' },
  { id: 'loss-factor-paths', title: 'Where the Vibration Energy Goes', description: 'Reallocate internal, radiation, joint, fluid, and coupling losses and watch Q, bandwidth, and decay respond.', topic: 'Damping', toolId: 'loss-factor-budget' },
  { id: 'modal-test-grid', title: 'Hide and Reveal a Mode', description: 'Move the drive point across a plate mode to see nodes erase an FRF contribution and change the required test grid.', topic: 'Modal Testing', toolId: 'modal-test-planner' },
  { id: 'sea-validity-map', title: 'From Individual Modes to SEA', description: 'Move through modes-per-band and overlap space to see deterministic, transitional, and statistical regimes.', topic: 'SEA', toolId: 'sea-validity-confidence' },
  { id: 'double-panel-energy-paths', title: 'Build an SEA Network Through a Double Window', description: 'Add acoustic or structural subsystems, edit reciprocal couplings, change the medium between panes, and solve energy, gross/net power, TL, pressure, and velocity.', topic: 'SEA / Transmission', toolId: 'double-panel-sea' },
  { id: 'khie-surface-contributions', title: 'Build a Sound Field from Boundary Patches', description: 'Move a field point and watch pressure-like and velocity-like patch contributions add with phase.', topic: 'Boundary Integrals', toolId: 'khie-boundary' },
  { id: 'pipe-noise-pathways', title: 'Competing Pipe-Noise Paths', description: 'Sweep frequency through convective, acoustic, wall-bending, and shell scales to identify propagation and matching.', topic: 'Flow-Induced Noise', toolId: 'pipe-flow-noise' },
  { id: 'frequency-wavenumber-atlas', title: 'One Map for Every Wave Family', description: 'Move acoustic, convective, flexural, extensional, and shear curves until their intersections reveal coincidence and critical speeds.', topic: 'Wave Matching', toolId: 'wave-matching-atlas' },
  { id: 'force-to-sound-power', title: 'Follow a Point Force into Sound', description: 'Move the drive, frequency, and damping while local mobility, surface response, modal overlap, and acoustic power separate.', topic: 'Driven Radiation', toolId: 'driven-radiation' },
  { id: 'intensity-probe-lab', title: 'Virtual Two-Microphone Intensity Probe', description: 'Change spacer, frequency, phase mismatch, and reflection to expose useful bandwidth, bias, and direction reversals.', topic: 'Structural-Acoustic Testing', toolId: 'sound-intensity-probe' },
  { id: 'stress-environment-map', title: 'Displacement Is Not Stress', description: 'Compare displacement and curvature-stress fields while temperature and pressure preload change properties, frequencies, and fatigue margin.', topic: 'Shock & Fatigue', toolId: 'dynamic-stress-environment' },
  { id: 'launch-source-map', title: 'Where Launch Noise Actually Comes From', description: 'Move a receiver around a distributed plume while source length, suppression, and frequency change the contributing region and received level.', topic: 'Launch Acoustics', toolId: 'launch-acoustic-source' },
  { id: 'wet-tank-coupling', title: 'Dry Shell, Wet Shell, Slosh, or Acoustic Mode?', description: 'Change fill and effective gravity to separate structural added mass, free-surface slosh, and liquid compressibility.', topic: 'Propellant Tanks', toolId: 'wet-tank-dynamics' },
  { id: 'qualification-notching', title: 'Protect the Article Without Losing the Test', description: 'Raise margin and change force or response limits to see when a justified notch prevents laboratory overtest and changes damage equivalence.', topic: 'Qualification Testing', toolId: 'qualification-test-planner' }
];

const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function deepDiveBody(module) {
  const linkedReferences = module.referenceLinks?.length
    ? `<ul>${module.referenceLinks.map(([title, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(title)}</a></li>`).join('')}</ul>`
    : '';
  return `<p>${esc(module.mechanism)}</p>
<h2>Physical intuition</h2><p>${esc(module.intuition)}</p>
<div class="callout"><strong>Launch-vehicle application.</strong> ${esc(module.launch)}</div>
<h2>Findings from the deep dive</h2><ol>${module.findings.map(finding => `<li>${esc(finding)}</li>`).join('')}</ol>
<h2>Interactive model</h2><div class="case-demo"><div class="case-demo-header"><div><p class="eyebrow">ACS 519 interactive deep dive</p><h3>${esc(module.title)}</h3></div><a class="concept-tool-link" href="#/tool/${encodeURIComponent(module.toolId)}">Open paired calculator →</a></div><div data-embedded-demo="${esc(module.demoId)}"></div></div>
<h2>Engineering decisions</h2><ul>${module.decisions.map(decision => `<li>${esc(decision)}</li>`).join('')}</ul>
<h2>Assumptions and model boundary</h2><p>${esc(module.limitation)}</p>
<div class="callout"><strong>Deep-dive conclusion.</strong> Use this model to identify the controlling mechanism, the necessary next fidelity level, and the measurement or convergence evidence needed to support a launch-vehicle design decision.</div>
<h2>Source trail</h2><p><strong>Course-note block:</strong> ${esc(module.source)}. <strong>Supporting references:</strong> ${esc(module.references)} The combined local source is <code>references/ACS519_Combined.pdf</code>.</p>${linkedReferences}`;
}

export const acs519CaseNotes = modules.map(module => ({
  id: `acs519-${module.id}`,
  number: module.caseNumber,
  title: module.title,
  summary: `${module.summary} Includes launch-vehicle applications and the findings from the full ACS 519 deep dive.`,
  readTime: '10 min',
  tags: ['ACS 519', 'launch vehicles', module.eyebrow],
  body: deepDiveBody(module)
}));

export const acs519ReferenceGroups = [
  {
    group: 'ACS 519 course deep dives',
    items: [
      ...modules.map(module => ({
        title: `${module.title} — ${module.source}`,
        note: `${module.summary} Local source: references/ACS519_Combined.pdf.`
      })),
      {
        title: 'Dynamic Stress, Fatigue & Launch Environment — ACS 519 pp. 104–112',
        note: 'Dynamic strain and stress recovery, temperature-dependent properties, and pressure/preload effects added to Chapter 08. Local source: references/ACS519_Combined.pdf.'
      }
    ]
  }
];
