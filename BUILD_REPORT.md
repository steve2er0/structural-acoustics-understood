# Build Report — Structural Acoustics, Understood

## Delivered scope

- 30 continuously linked cheat-sheet chapters
- 199 technical concepts with equations, interpretation, common mistakes, and calculator links
- 73 browser-based engineering calculators
- One reusable engineering-result framework applied to all 73 calculators, with numerical values, interpretation, physical meaning, assumptions, validity checks, engineering considerations, and related concepts
- 36 live canvas/SVG physics demonstrations, including gross-versus-net CLF energy flow, an editable reciprocal SEA network and medium-dependent double window, flat-plate spatial correlation, modal joint acceptance, honeycomb-panel wave regimes, ACS 519 wave matching, force-to-sound-power transfer, sound-intensity testing, distributed launch acoustics, wet-tank coupling, qualification notching, and launch-environment stress
- 27 applied case notes, including interactive liftoff-to-ascent forcing, TR 12-007 honeycomb-panel / experimental-SEA, CLF interpretation/uncertainty, and eighteen ACS 519 launch-vehicle deep dives
- Global search, responsive navigation, print/PDF styling, shareable inputs, local file import, CSV export, SVG/PNG plot export, offline caching, and a self-contained `standalone.html` build

## Calculator coverage

Acoustics and dB math; octave bands and weighting; SDOF and two-DOF dynamics; damping and isolation; beam, plate, shell, honeycomb sandwich, and cavity calculations; random vibration, Welch PSD, GRMS, Miles, VRS, SRS, classical shock, pyroshock, ERS, and FDS; plate coincidence, radiation efficiency, transmission loss, double panels and windows, gap-medium acoustics, panel–cavity proximity, structural power flow; Corcos coherence, correlation matrices, FSP generation, environment scaling; editable N-subsystem SEA chains; two- and three-subsystem SEA; experimental SEA inversion; inhomogeneous energy sampling; bolted-junction transmission; FE/BE planning; Green-function boundary contributions; cylindrical-shell and pipe-flow noise; frequency–wavenumber matching; driven-radiation transfer; sound-intensity probes; distributed launch-acoustic sources; wet-tank hydroelastic dynamics; qualification-test tailoring; temperature/pressure-dependent dynamic stress; instrumentation, integration drift, room acoustics, silencers, insertion loss, and engineering unit conversion.

## Validation completed

- All 73 default calculator cases executed successfully.
- All 73 result payloads passed the common `EngineeringResult` contract and complete copied-report checks.
- All primary numerical metrics and plot arrays were checked for finite values.
- Benchmark tests passed for decibel summation, fractional-octave geometry, Miles response, standard gravity conversion, Welch PSD/RMS closure, independent PSD combination, and three-subsystem SEA power balance.
- Every cheat-sheet calculator link resolves to a registered calculator.
- Every demo resolves to a paired calculator and a live renderer.
- All 36 demo catalog entries resolve to live renderers, including the TR 12-007 and ACS 519 learning routes.
- The current engineering-commentary UI and standalone bundle passed static and syntax checks.
- Prior browser QA covered the TR 12-007 and CLF interactive additions at desktop and 390 px mobile widths. The current ACS 519 extension passed syntax, numerical, standalone, and HTTP checks; its new routes have not yet received a fresh visual browser-QA pass.
- CLF-specific browser QA covered the interactive gross/net energy-flow workbench, the identification-and-uncertainty calculator (including a 40% uncertainty warning case), and the embedded case-note experience in both modular and standalone routes. Desktop and 390 px mobile layouts showed no horizontal overflow, all controls and SVGs rendered, and the browser reported no console warnings or errors.
- `standalone.html` contains the current ACS 519 chapters, tools, physics, and demo renderers; repeated standalone builds produced the identical SHA-256 hash `bf2c3cde40efe73f865ea7b614b37a1105dc96eb88a2490767e1587ffd7b883e`.
- Static HTTP delivery and all core service-worker assets returned HTTP 200 successfully.
- The 25-test Node suite includes engineering commentary coverage, finite-value validation, spatial-field and joint-acceptance physics checks, honeycomb asymptotes, reciprocal CLF and editable-network power conservation, double-window medium effects, ACS 519 limiting cases, acoustic/convective wave intersections, driven-power closure, intensity-probe spacing limits, pressure-stiffened dynamic stress, and output-shape validation across every default calculator payload.

## Engineering boundary

The site is an analysis companion and preliminary calculation environment. Screening formulas and representative properties are explicitly labeled. Controlled equations, program methods, materials, boundary conditions, uncertainty, sample-rate/convergence requirements, and qualification criteria still require independent verification before safety-critical or certification use.

## Deployment note

Run `npm start`, then open `http://localhost:4173`. For public deployment, upload the entire directory to a static host and create `sitemap.xml` from `sitemap.template.xml` after the production domain is known.
