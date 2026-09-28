# Vibration Lab v0.1 validation

Validated locally on 2026-09-27 using Node 22.22.1 and the Codex in-app Chromium browser. Browser checks used both the development app and a clean Vite production preview, separately from automated tests.

## Automated checks

- `npm test` in Vibration Lab: **136 passed** (44 original lab regressions + 11 platform cases + 22 modal physics cases + 3 placement cases + 15 accelerometer cases + 20 SEA cases + 21 RS-25 cases).
- `npm run build`: TypeScript strict checking and Vite production build pass.
- Existing repository `npm test`: **146 passed**.
- Prettier source/docs check and `git diff --check`: pass.
- Template-specific copy is absent from the production asset output. Direct navigation to the template route in production displays the intended 404.

New platform cases cover dimensional conversions (including lbf/in and rad/s), incompatible dimensions, logarithmic mapping across both frequency ranges and stiffness, preservation of amplitude ratios under a shared drawing gain, corrected isolation table clearance, variable-duration tour boundaries/seeking, isolation tour physics, and native control accessibility text.

## Browser evidence

Desktop views inspected at 1440 × 900 and 1440 × 1000. Phone views inspected at 390 × 844. The original apps were run and inspected at 1280 × 720 before migration.

| Area                    | Observed result                                                                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                    | All three cards render the lab hardware or deforming test article. Home → lab and common lab-switch links load without a full page application change. Direct-route reload and browser back/forward work. Typography, wave graphic and stacked phone cards inspected. |
| Isolation frequency     | Default 5 Hz → T ≈ 1.0416. At 25 Hz, T ≈ 6.3295. At 600 Hz, T ≈ 0.006901. Native generator control and physical generator-face projection remain usable.                                                                                                              |
| Isolation tuning        | Minimum total stiffness 20 kN/m changes natural frequency to 10.6 Hz. Damping slider reaches 0.40. Raising payload from 10 to 30 lb in model notes changes natural frequency to 14.43 Hz. Reset restores default state.                                               |
| Isolation sweep         | Autoplay advances from 2 Hz, crosses resonance and finishes at 600 Hz, returning the control to “Run Sweep.”                                                                                                                                                          |
| Isolation overlays      | Force Flow, Motion Envelope and damping comparison toggle correctly; physical force and travel readouts update. Exploded geometry, system and lab views inspected.                                                                                                    |
| Isolation tour          | Pause, next, previous and exit work. The resonance step gives 6.33×, the damping step lowers it to 1.60×. Camera/overlay changes accompany the lesson.                                                                                                                |
| Plot mapping            | Pointer selection near the 100 Hz grid location gives approximately 99.6 Hz in each plot (screen-pixel rounding), including the SVG's responsive coordinate mapping.                                                                                                  |
| Shaker DC               | Full field gives 12.0 A DC, 1.20 T and BL = 80 N/A. +8 A drive gives +640 N; reversal gives −640 N and reverses the vector.                                                                                                                                           |
| Shaker sine / EMF       | At the default 5 Hz sine setting, the displayed back EMF is 31.4 V peak and terminal demand 33.2 V peak. Stroke limiting is identified.                                                                                                                               |
| Shaker limits / payload | At 2000 Hz with 60 kg payload, terminal demand is capped at 120 V and capability is about 0.90 g peak; voltage is identified as controlling. Selecting ~100 Hz restores the corresponding lower demand and updates the envelope point.                                |
| Shaker displays         | Assembled, cutaway, exploded and camera-selected closeups preserve geometry and annotations. Air-gap B/I/F vectors and force-balance terms were visually inspected. Energy breakdown updates consistently.                                                            |
| Camera behavior         | Dragging during a transition interrupts it; the camera settles at the interacted pose. Reset returns to the preset.                                                                                                                                                   |
| Shared tours            | Shaker retains all 20 stages and the original 76-second timeline. Pause/next/previous/exit and restart were exercised. The full production autoplay reached “Tour complete” with the expected final 40 kg payload and 100 Hz state.                                   |
| Development template    | Three tour stages set force to 0, +8 and −5 N, change camera/focus, and update the shared vector and readout. Slider, highlight, label and camera work on desktop and phone.                                                                                          |

## Preserved mechanics and geometry

The original SDOF and electromechanical equations, constraints and model notes remain authoritative. Numerical tests still check force/power balance and operating constraints. Isolation's corrected scale/lift, tall cream shaker in navy cradle, larger armature table, smaller generator and bench are preserved. No new substantive physical experiment was introduced by the development template.

## Limits of this verification

These are idealized educational models, with the physical assumptions and visualization amplification explained in each lab. Browser inspection confirms behavior and visual layout, not physical machine qualification. No benchmark FPS claim is made. The dependency stack emits a development deprecation warning for Three.Clock; the clean production checks had no runtime errors. Static hosting must support SPA rewrites for direct lab URLs. Lab state intentionally resets when leaving and re-entering its route.

Screenshots in `previews/` record the home, production labs and development template. Historical demo screenshots and validation remain in the two former experience folders.

## Lab 03 continuation — Experimental Modal Testing

The starting checkout contained the shared platform and Labs 01/02 but no modal source. Lab 03 was added using that existing platform. Its governing equations, generated modal dataset, convergence evidence and reconstruction limits are documented in [MODAL_MODEL.md](docs/MODAL_MODEL.md).

Production browser verification at 1440 × 900 and 390 × 844:

- Hit → synchronized finite pulse and acceleration ring-down → frequency spectra → accelerance FRF → mode selection completed using the visible controls.
- Clicking the plot at approximately 136.1 Hz selected Mode 04, 136.2 Hz, and moved the camera to its deformed surface. Mode buttons selected other eigenvectors and nodal shading followed the selection.
- The full 83-second, 17-stage tour reached its final Mode 03 / 124.6 Hz / 4% damping state, with three acquired locations. Tour transport then completed normally.
- A manual A2 strike retained the fixed A5 reference and increased the survey to four locations. Reconstruction showed an interpolated, incomplete surface from the measured residues.
- Raising independent response noise to 20 m/s² RMS visibly corrupted A/F and lowered expected ensemble coherence away from well-excited resonances. Changing test conditions cleared the survey as documented.
- Double-hit mode produced two distinct force pulses 35 ms apart, with a smaller second pulse; these strikes were excluded from the survey.
- Phone workflow reached Mode 03, with the actual surface deforming. The page returns to the structure after peak selection; signal panels stack and all six mode buttons remain accessible. Model notes open and Escape closes them, restoring focus.
- Home lists all three labs. Shared navigation still opens Isolation and Shaker. Isolation at 25 Hz retains 6.33× transmissibility. Shaker at full field and +8 A retains 1.20 T, +640 N and 10.67 mm DC offset.
- Clean production console error logs were empty for Modal, phone Modal, and the existing-lab navigation checks.

Browser refinements included removing plate shadow acne, aligning FRF paths with the responsive axes/cursor, keeping suspension ends and the sensor attached to the deforming surface, preventing control/camera overlap, and separating phone camera tools from the specimen caption.

Optional half-power and reciprocity interface lessons were not added; complex mathematical reciprocity is tested. There is no hardware acquisition, arbitrary-geometry solver, general modal identification or physical test qualification claim. No FPS benchmark was performed. The model uses six converged free-edge bending approximations and explicitly omits suspension/rigid-body dynamics and transducer mass.

Final previews: `previews/modal-desktop.jpg`, `previews/modal-mobile.jpg`, and `previews/modal-spectra.jpg`. Paused tour seeking was additionally verified at the impact step: it retained the paused state and showed “Play guided tour.” The normal app viewport was inspected after the final compact-height control adjustment.

## Direct instrument placement

Validated on 2026-09-27 at 1440 × 900, 935 × 725, and 390 × 844. Production build, 80 lab tests, formatting, and diff whitespace checks pass.

- Directly dragging the hammer changed C1 to C4 without rotating the camera; dragging the accelerometer changed A5 to A2. The production acquisition used C4 → A2.
- Selecting a move control opens the measurement-grid camera. Clicking the plate between markers snaps to the nearest available point. Grid buttons also work by keyboard and at phone width.
- A measured B2 point remained in the survey after moving the hammer to C2; moving the accelerometer cleared that survey and the obsolete current record.
- Instrument placement is disabled during acquisition. Occupied grid points are disabled; snapping excludes the other instrument and respects the 600:400 plate aspect ratio.
- Hardware, cables, and annotations follow the new positions. Orbit controls resume after instrument dragging. Small desktop placement controls remain above the signal panels; the phone placement picker appears directly below the scene.

- The clean production FRF retained the relocated C4 → A2 input/output pair. Runtime error logs were empty.

Screenshot: `previews/modal-placement.jpg`.

## Lab 04 — Piezoelectric Accelerometer

Added as an independent route at `/labs/accelerometer`, with the existing lab renderer and navigation. The annular-shear architecture, representative parameters, complex mechanical/electrical response, polarity conventions, and visualization scales are documented in [ACCELEROMETER_MODEL.md](docs/ACCELEROMETER_MODEL.md).

Automated checks pass: 95 lab tests, 146 repository tests, and the TypeScript/Vite production build. The 15 new cases check signed inertial force and piezo charge; 1, 5, and 10 g sensitivity; coupled instantaneous readouts; peak/RMS consistency; physical versus visual frequency; low-frequency and true-DC behavior; resonance amplitude/phase; dynamic force balance; the contiguous usable band; sweep endpoints; and IEPE headroom across the frequency range.

Browser checks used the development app at 1440 × 900, 935 × 725, and 390 × 844, plus a clean production preview:

- Manual +10 g gives −0.294 N inertial drive, −73.5 pC charge, +1.00 V AC output and 4.31 nm relative motion. Negative input reverses the force, electrode polarity and voltage. The frozen-dynamic-instant explanation remains visible.
- Assembled, cutaway, exploded and component camera views were visually inspected. The assembled housing has the IEPE sensitivity/axis marking; the exposed crystal and inner/outer charge polarities are visible in the closeup.
- Sine input at 100 Hz and 10 g peak gives approximately 1 V peak. The two waveform plots share the phase cursor and actual-frequency time axis.
- At 24 kHz and the same 10 g peak input, the response is 6.667× nominal, 6.67 V peak, 490.3 pC peak and 28.75 nm peak relative motion. Phase is approximately −90°.
- At 0.05 Hz, elastic loading and source charge remain approximately 0.294 N and 73.5 pC peak while the electrical path attenuates output to approximately 0.100 V peak.
- Selecting the visible 1 kHz plot tick gives approximately 996 Hz after screen-pixel rounding. The plot marker, controls and output update together.
- The 26-second steady-state sweep pauses without advancing, resumes from the held frequency and completes at 60 kHz, restoring “Run frequency sweep.”
- The full 88-second, 21-stage production tour completed at the intended manual +1 g / cutaway / signal-chain state. Paused next/previous controls were exercised across the manual/sine boundary; backward seeking restores the manual +10 g state. Exit and reset work.
- Phone signal-chain, waveform and response panels were inspected. Model notes open, Escape closes them, and focus returns to the invoking control.
- The dashboard shows four working lab links and a rendered accelerometer cutaway preview. Shared navigation preserves Isolation's 6.33× response at 25 Hz and Shaker's +640 N force at full field / +8 A. Moving the modal hammer to C4 completes a C4 → A5 acquisition.
- Final production console error logs were empty across the new lab, phone component inspection and existing-lab navigation checks.

Refinements included compact-height control scrolling, legible phone plots, phone navigation labels, component camera framing, and deterministic guided-tour seeking. Optional compliant mounting and transverse sensitivity were left outside this focused core demo. This is a representative educational model with an ideal stud mount, not a commercial sensor qualification or calibration tool.

Final previews: `previews/accelerometer-cutaway.jpg`, `previews/accelerometer-response.jpg`, and `previews/accelerometer-mobile.jpg`.

## Lab 05 — Statistical Energy Analysis

Validated on 2026-09-27 with 115 lab tests, 146 repository tests, a TypeScript/Vite production build, and separate development/production browser checks. The physics, SI units, loss-matrix signs, numerical integration, modal-population conventions and sources are documented in [SEA_MODEL.md](docs/SEA_MODEL.md).

The 20 new tests cover zero input; input scaling; the uncoupled analytic steady and transient cases; zero transmission; directional reciprocity; zero flow at equal modal energy; reversed net flow; coupling redistribution; damping treatment; all eight frequency bands' local/global steady balance; transient conservation; convergence to the independent steady solution; nonnegative energies across extreme allowed combinations; and modal density/band unit consistency.

Observed browser behavior:

- Step input builds source energy first and then downstream energies. Pause freezes the current state; reset restarts at zero. Power off retains stored energy and produces decay, with released energy included in the global power balance.
- At 1 kHz and 1 W, baseline energies settle to approximately 13.38, 3.13 and 1.45 mJ; dissipation sums to 1.000 W. Interface net powers are approximately 0.328 and 0.091 W.
- Weak η12 = 0.0005 gives bay 2 approximately 0.530 mJ and first-junction transfer 0.055 W. Stronger η12 = 0.03 gives bay 2 approximately 4.12 mJ and transfer 0.431 W. Transition readouts include energy storage/release.
- Selecting the damping treatment changes η2 to 0.060, gives a 1.08 mJ steady target for bay 2, and initially dissipates stored energy faster. Numerical tests independently verify reduced onward power and increased dissipation relative to baseline.
- Equal total energies of 20 mJ give 0.264, 0.579 and 0.282 mJ per mode. Scene labels, bars and the comparison plot change with the metric. The first arrow reverses: P12 ≈ −1.197 W; P23 ≈ +0.387 W. Zero input balances 3.770 W dissipation against −3.770 W storage rate.
- Frequency-band and modal-density controls change mode counts and overlap. The low-band tour stage shows approximately 2.4 expected modes in bay 1 with the sparse-mode limitation visible. The high-band view crowds the illustrative resonance markers without claiming solved eigenfrequencies.
- The complete 88-second, 20-stage production tour reached its baseline 1 kHz / 1 W / Energy flow final state and “Tour complete.” Pause, next, previous, exit and restart were exercised separately.
- Model notes open, Escape dismisses them, and focus returns to the invoking control.
- Layouts inspected at 1440 × 900, 935 × 725 and 390 × 844. Refinements enlarged the panel assembly, prevented story/control overlap, exposed the compact-height damping control, separated phone labels, made phone plot text larger, and kept all five navigation links visible.
- The dashboard has five lab links and a live SEA panel preview. Shared navigation retains Isolation's 6.33× response at 25 Hz, Shaker's +640 N at full field / +8 A, modal hammer relocation from C1 to C4, and accelerometer +10 g → +1.00 V.
- Production console error logs were empty. A development hot-reload hook-order error after editing the custom simulation hook cleared on reload and did not occur in the clean production build.

This verification does not qualify SEA applicability for a real assembly. The example intentionally omits acoustic populations, deterministic local response, measured CLFs and additional transmission paths. There is no FPS benchmark claim.

Previews: `previews/sea-buildup.jpg`, `previews/sea-equal-energy.jpg`, and `previews/sea-mobile.jpg`.

## Lab 06 — Inside the RS-25

Validated on 2026-09-27 with 130 lab tests, 146 repository tests, a TypeScript/Vite production build, and separate browser checks. NASA source reconciliation, retained flow topology, representative operating assumptions and conservation equations are documented in [RS25_MODEL.md](docs/RS25_MODEL.md).

The 15 new tests check the 109% reference point; pump head versus normalized speed; pressure/flow/shaft work; turbine load balance; thrust sensitivity; command bounds and the off state; mass and energy closure at five power levels; oxygen hydraulic-drive recirculation; nonnegative finite states; and the educational startup reveal order.

Observed browser behavior:

- Startup progressively reveals propellant flow, rotation, preburners, main combustion and exhaust. Numerical readouts remain withheld until the eight-second reveal finishes. The interface explicitly identifies this as a simplified reveal, not flight timing.
- At 109%, the upper reference gives 2,279 kN / 512,271 lbf vacuum thrust, 20.6 MPa chamber pressure, and derived consumptions of 73.4 kg/s hydrogen and 440.6 kg/s oxygen. The chosen map gives 2,091 kN at 100% and 1,401 kN at 67%.
- HPFTP shaft power changes from 44.8 MW at 100% to 20.1 MW at 67%; normalized speed and pressure rise change with the same operating state. These pump values are explicitly representative assumptions.
- Assembled, cutaway, flow, exploded and selectable cycle views were inspected. Following LH₂ or LOX highlights the appropriate network; component selection updates camera and contextual information. Pressure and thermal views show the pressure cascade and the approximate cryogenic/hot-gas contrast.
- The corrected cycle diagram shows parallel preburner hydrogen feeds, the separate chamber-coolant/LPFTP drive route, and the internal LPOTP hydraulic-drive return. Flow arrows and particles follow their path tangents.
- The complete 90-second, 18-stage production tour reached its final 109% state and “Tour complete,” including the schematic-to-3D transition. Pause, next, previous, exit and restart were exercised. Manual animation pause/resume works independently of camera inspection.
- Model notes trap keyboard focus, close with Escape, and return focus to the invoking control.
- Layouts were inspected at 1440 × 900, 935 × 725 and 390 × 844. All six phone navigation links fit. Phone start returns to the scene; reset returns to the page top and restores the control panel's scroll position. Compact controls and contextual panels remain scrollable.
- The dashboard has six working lab links and a live RS-25 engine preview. Existing-lab checks retain Isolation's 6.33× response at 25 Hz, Shaker's +640 N at full field / +8 A, modal hammer relocation from C1 to C4, accelerometer +10 g → +1.00 V, and SEA energy buildup followed by stored-energy release after power-off.
- Production console error logs were empty across the tour, mobile checks and all six routes. A blank development canvas during hot reload cleared on reload and did not recur in the clean production checks.

This is a reduced-order teaching model, not an engine performance or transient certification tool. Detailed thermochemistry, local wall temperatures, flight valve timing, production blade geometry, gimbal motion and flight dynamics are outside its scope. No FPS benchmark is claimed.

Previews: `previews/rs25-running.jpg`, `previews/rs25-cutaway.jpg`, `previews/rs25-cycle.jpg`, and `previews/rs25-mobile.jpg`.

## RS-25 hardware and plume refinement — 2026-09-27

- Photo-guided external geometry now includes a solid ribbed nozzle jacket, longitudinal lines and clamps, larger feed ducts, differentiated LP/HP turbopump housings, controller connectors and a spherical pogo accumulator on the LPOTP discharge branch. Cutaway and assembled views retain separate exterior/interior geometry.
- Pogo suppression is selectable from Explore, the component menu, the 3D label and the cycle schematic. The schematic uses a static compliance branch instead of showing steady through-flow into the gas space. Accumulator and pump cutaways preserve their inspection camera.
- Production plume comparisons: at 100% and sea level the model reports 1,673 kN, Pe 15.2 kPa and Pe/Pa 0.15. At 67%, sea-level thrust is 983 kN and cells are shorter; 109% gives 1,861 kN with longer cells. At 67% / 5 kPa the plume broadens with fewer, more widely spaced cells. Exact pressure match gives Pe/Pa 1.00 and no repeating bright pattern. Vacuum produces a broad smooth expansion without repeated atmospheric cells.
- Two screenshots taken while paused were byte-identical. Orbit inspection remains active while paused; the plume remains attached to the nozzle under camera rotation.
- Tour steps 19, 20 and 21 were checked through the visible previous/next controls: sea level at 100%, thin air at 100%, and vacuum at 109%. The final stage reaches “Tour complete.” This supplements the earlier full 18-stage playback check.
- `npm test`: 136 passing cases. `npm run build`: passes. The six added plume cases cover ambient-pressure thrust, regime changes, matched/vacuum suppression, power dependence, off state and finite boundary values. The plume is a qualitative visual trend model; these checks do not validate RS-25 shock locations or vehicle pogo stability.
- Final desktop checks at 1440 × 900 confirmed the assembled engine, selected HPFTP exterior, close-up rotor cutaway and accumulator gas/liquid cutaway. A 390 × 844 viewport has no horizontal overflow; revised vertical plume framing keeps the complete powerhead and several cells visible. The production dashboard's updated RS-25 card renders without clipping. Production console reports no errors.
- Saved evidence: `previews/rs25-photo-guided-engine.jpg`, `previews/rs25-pogo-accumulator.jpg`, `previews/rs25-shock-diamonds.jpg`, and `previews/rs25-plume-mobile.png`.

## RS-25 pump orientation and powerhead reconstruction — 2026-09-27

- Visually researched NASA HAER sheet 2 elevations/exploded isometric and NASA/Library of Congress nozzle-removed photographs 17 and 18. Source links and the specific layout corrections are recorded in `docs/RS25_MODEL.md` and the in-app model notes.
- Rotated the four shafts into longitudinal orientations, moved HP pumps under their preburners, rebuilt their shared port transforms and rerouted the large LP-to-HP transfer ducts. Shortened the powerhead and gimbal assembly, corrected overall proportions, and separated the oxidizer heat exchanger from the pogo sphere.
- `npm test`: all 136 cases pass. Final TypeScript/Vite production build passes. Prettier and `git diff --check` pass. The operating model and plume equations were unchanged.
- Production browser checks at 1280 × 720: all four component selections and cutaway cameras, assembled engine, exploded assembly, model notes/source links, startup, sea-level shock cells and vacuum expansion. Pump shafts remain longitudinal inside their exterior housings and pipe endpoints follow the exploded parts. Cutaway ducts were made more transparent and oxygen-side cameras adjusted after visual inspection showed rotor occlusion.
- Sea-level operation at 100% still reports 1,673 kN, 15.2 kPa exit pressure and Pe/Pa 0.15, with visible shock cells. Vacuum gives 2,091 kN and no repeating cells. The horizontal fixture was moved to meet the shorter powerhead. Production console error logs were empty.
- At a 390 px CSS viewport, document width is 390 px with no horizontal overflow. Mobile pump cameras retain the appropriate front/rear viewing side. Browser screenshot scaling was inconsistent under viewport emulation, so this run does not claim a complete fresh phone visual review.
- Updated preview evidence: `previews/rs25-longitudinal-pumps.png` and `previews/rs25-longitudinal-pump-cutaway.png`. These establish the revised spatial arrangement, not production-CAD dimensional accuracy.

## LPFTP blade tones and higher-order surge cavitation — 2026-09-27

- Added the LPFTP dynamics topic, a link from the normal LPFTP component panel, and two guided-tour stages. The study includes four helical main blades plus four shorter splitters, synchronized cavity pulsation, schematic upstream/downstream wave markers, a fixed pressure probe, line spectrum and synthetic pressure waveform. The full-engine LPFTP cutaway uses the same inducer; its turbine uses the same shaft phase.
- Research and assumptions are documented in `docs/RS25_MODEL.md` and the model-notes dialog. The published 15,761 rpm / 104.5% point anchors an explicitly illustrative square-root speed map. Blade tones are 4N, 8N and 16N; the independent HOSC order is adjustable within the reported 6.4–6.7N range. Relative amplitudes and excitation strength are teaching assumptions, not flight data or a cavitation-onset prediction.
- `npm test`: **145 tests pass**, including nine new tests for the source speed anchor, Hz/order scaling, separation of HOSC from blade harmonics, isolated source families, amplitude independence, off state, invalid inputs, independent phase and RMS recovered by numerical integration of an integer-period record. Final TypeScript/Vite build and formatting checks pass; `git diff --check` passes.
- Production browser: at 100% the display reports 15,418 rpm, 1,028 Hz blade pass and 1,683 Hz HOSC at 6.55N. At 67% and 6.70N it reports 12,620 rpm, 841 Hz blade pass and 1,409 Hz HOSC. Frequency and Order views work; blade-only removes the HOSC line/cavities, and HOSC-only gives one spectral line and a sinusoidal trace. Zero excitation removes that contribution without changing its reference frequency. At 109% / 6.40N, the reference HOSC frequency is 1,717 Hz.
- Two screenshots while paused were byte-identical, and the waveform SVG path was unchanged. Shutdown clears all forcing, rpm and frequency readouts. Opt-in audio starts without console errors; the visible control switches to mute, pause reports audio paused, and leaving the section removes the audio controls/context. These checks exercise synthesis/control behavior; they are not calibrated acoustic measurements.
- Tour stages 4 and 5 were checked using the visible transport: blade tones alone, then combined HOSC with 85% illustrative excitation. Engine location returns to the assembled LPFTP with its regular power and flow readouts. The complete 23-stage tour was not replayed; the two new stages and transitions were checked directly.
- Layouts inspected at 1280 × 720 and 390 × 844. Phone plots stack vertically with readable axes; document width equals viewport width, and the scene, spectrum, waveform and controls remain accessible by scrolling. Temporary viewport overrides were reset and the temporary phone tab closed. Production console error logs were empty.
- Evidence: `previews/rs25-lpftp-dynamics.png`, `previews/rs25-lpftp-mobile.png`.

## LPFTP cavitation visibility — 2026-09-27

- The study now opens on the inducer close-up. Larger violet vapor sheets follow each main blade, changing length and thickness with the existing common HOSC phase. Trailing specks, a growth/collapse indicator and a vapor/pressure-wave legend make the motion easier to distinguish. Whole pump restores the surrounding assembly. Vapor dimensions are explicitly exaggerated; forcing equations and frequencies are unchanged.
- All 145 tests pass; the final TypeScript/Vite build passes. Production desktop and phone views were inspected at 1280 × 720 and 390 × 844; the phone has no horizontal overflow. Browser console errors were empty.
- Whole-pump/close-up camera switching works. Blade-only and zero excitation remove the vapor and show “No vapor shown.” Two paused production screenshots were byte-identical, and the phase meter was unchanged. These are visual/control checks, not fluid-physics validation.
- Evidence: `previews/rs25-cavitation-closeup.png`, `previews/rs25-cavitation-closeup-mobile.png`.

## Falcon 9 SEA example — 2026-09-27

- Replaced the three-panel example with the user's autoSEA native Falcon 9 geometry: six structural regions and the fairing acoustic cavity. Geometry/material/station source files, copied reference case, retained assumptions and solver differences are documented in `docs/SEA_MODEL.md`. The autoSEA checkout was only read.
- Geometry checks reproduce the saved 70 m / 3.7 m body envelope, 13.1 m × 5.2 m fairing convention, six structural connections including the deck T junction, two cavity attachments, and the source's 875.843523040011 m² midsurface-area sum.
- `npm test`: **152 tests pass**. The generalized SEA cases verify an independent linear-system solution, all seven isolated-source limits, reciprocity and subsystem/global conservation in all eight frequency bands, reverse acoustic power, damping/RT effects, transient convergence, an analytical uncoupled exponential, nonnegative energies at control extremes, and the autoSEA ring-frequency anchor. These validate the educational implementation, not Falcon response correlation or full autoSEA solver parity.
- Final TypeScript/Vite production build passes. Formatting and `git diff --check` pass. Production console error logs were empty. Structural loss factors and junction CLFs are explicit illustrative values; the full autoSEA B/L/S and exterior-radiation solver is not ported.
- Desktop browser checks: first-stage and cavity source selection, selected-subsystem/camera synchronization, fairing transparency, structural/acoustic readouts, whole-vehicle return, assembled/energy views, power-accounting panel, a zeroed fairing-to-cavity coupling, and RT60 set to 0.2 s. A paused pair of production screenshots was byte-identical. Acoustic input reverses the two paths from the cavity into the structure. Zero forward coupling shows zero net power on that path.
- All twelve guided-tour stages were stepped through with visible previous/next transport and finite readouts; final stage and exit worked. This is a transition check, not a claim that the complete timed animation was replayed.
- Layouts inspected at 1280 × 720 and 390 × 844. The final phone overview, cavity camera, controls and seven-entry energy plot were inspected; document width equals viewport width. The dashboard displays the complete vehicle thumbnail and the revised SEA description. Temporary viewport overrides were reset.
- Evidence: `previews/sea-falcon9.png`, `previews/sea-falcon9-cavity.png`, `previews/sea-falcon9-mobile.png`.

## Multi-body launch-vehicle vortex shedding — 2026-09-27

- Added experiment 07 at `/labs/vortex`, with a generic central core and two strap-on boosters. Mach, angle of attack and sideslip drive one resolved air vector, crossflow reference frequencies, wake positions, a body-fixed nose-on map, and a normalized phase trace. The overview, flow-aligned cross-section and wake camera remain orbitable. Geometry comparisons include booster removal and surface-gap adjustment.
- The source audit and explicit assumptions are in `docs/VORTEX_MODEL.md` and the model-notes dialog. This is a kinematic, prescribed-Strouhal crossflow analogy; it does not solve gap-flow coupling, aerodynamic loads or transonic buffet. The fixed-St result is marked as an extrapolation above freestream Mach 0.3. Small-incidence ascent and Reynolds effects remain limitations even below that threshold.
- **164 tests pass** across 10 files. Twelve new cases check independent direction cosines, sound speed, velocity decomposition, still-air and axial limits, broadside limits, sign reversal, Mach/diameter scaling, gap geometry and upstream ordering, model-regime labeling, half-cycle alternation, convection spacing and the explicit display time scale. These verify implementation of the stated model, not launcher aerodynamic correlation.
- TypeScript/Vite production build, changed-file formatting and `git diff --check` pass. Production desktop and phone console error logs were empty.
- Browser checks: default core reference 0.86 Hz and booster 1.35 Hz at M = 0.15, α = 25°, β = 0°. Increasing St to 0.35 raises core reference to 1.51 Hz. Axial flight gives 0.00 Hz with 102.1 m/s axial airspeed; Mach zero shows still air. M = 2 / α = 90° gives 680.6 m/s crossflow, 27.22 Hz core reference and the extrapolation notice. Pure sideslip creates the expected projected upstream ordering; reversing β reverses it. Booster removal leaves one selection and disables the gap control. The 3 m gap and camera/view controls were exercised.
- All eight tour stages, previous/next transport, disabled terminal next button, pause and exit were checked. This records manual stage transitions, not a replay of the complete 67-second timed tour. Model notes opened with keyboard focus and closed with Escape.
- A pair of paused screenshots from the final production build was byte-identical. The 3D roll positions, separating sheets, map and phase trace share a paused clock; camera motion is intentionally independent.
- Layouts inspected at 1280 × 720 and 390 × 844. Both document widths equal viewport widths. Phone controls, diagnostics, model-limit notice and stacked plots are reachable by scrolling; Mach/angle presets were exercised on the phone layout. Plot type size was increased for mobile readability. Temporary viewport overrides were reset.
- Preview evidence: `previews/vortex-overview.png`, `previews/vortex-cross-section.png`, `previews/vortex-mobile.png`.

## Longitudinal vortex orientation correction — 2026-09-28

- Replaced the original broadside, barrel-extruded vortex street with continuous opposite-sense leeward cores. Paths develop from forebody shoulders toward the tail, then continue parallel to the full relative-air vector. Blue arrows/tracers use the full nose-to-aft flow; the midbody inset explicitly separates axial flow into the page from its crossflow arrow. Core radius, pitch, convection fraction and separation geometry remain prescribed, not CFD.
- Source basis: NASA TM 88332 §2.7, documented in `docs/VORTEX_MODEL.md` and the in-app notes. Removed the alternating temporal phase trace and replaced it with spatial development and downstream transport. Strouhal remains a separately labeled cylinder reference scale and no longer drives the animation. Controls focus on alpha/beta ±30°, without claiming that symmetric flow is validated throughout that range.
- **168 tests pass** across 10 files, including 16 vortex cases. New checks cover monotonic nose-to-tail development, independent source/tail anchors, aft tangent alignment with the resolved full-flow vector, own-barrel clearance, mirrored placement, persistent axial transport with zero crossflow frequency, independence from prescribed St, and bounded display-time scaling. TypeScript/Vite build, changed-file formatting and `git diff --check` pass.
- Production browser: default M = 0.3, alpha = 12°, beta = 0° gives axial 99.9 m/s, crossflow 21.2 m/s and total 102.1 m/s. Axial flight shows 102.1 m/s axial and zero crossflow, with moving blue tracers and no colored pair. Zero Mach shows still air. M = 2 / alpha = 8° / beta = 4° gives axial 672.3 m/s and crossflow 105.7 m/s with the compressibility notice. Negative incidence reverses the leeward side; sideslip rotates the cut-plane pair. Camera transitions and the revised midbody view were inspected.
- Two paused production screenshots were byte-identical. Unpaused axial-flight frames and the transport indicator changed despite zero crossflow frequency. All eight tour stages were manually stepped with the new settings and text; the last Next control is disabled and Exit works. This is a transition check, not a complete timed replay. Updated notes open and close with Escape and include the NASA longitudinal-vortex source.
- Layouts inspected at 1280 × 720 and 390 × 844; document width equals viewport width. Phone overview, combined-angle preset and stacked reference/development plots were inspected. Console error logs were empty in desktop and phone production tabs. Final still-air copy/overlay cleanup received a separate production spot-check. Temporary viewport overrides were reset.
- Updated evidence: `previews/vortex-overview.png`, `previews/vortex-cross-section.png`, `previews/vortex-mobile.png`. These supersede the original broadside preview images; the preceding September 27 entry records the earlier implementation.

## Git portability delivery — 2026-09-28

- Exported only the Git index to a fresh temporary directory, excluding the original working tree's ignored files and local `node_modules`. `npm ci --no-audit --no-fund` installed 111 locked packages successfully. The exported Vibration Lab passed all **168 tests** and its TypeScript/Vite production build. The exported reference-book app passed its **128 tests**; separate local two-stage-isolation edits were excluded from this delivery.
- All seven lab routes, procedural geometry, local fonts, model data, source notes, previews and the dependency lockfile are included. There are no staged dependency/build directories or symlink dependencies. Root README setup lists all seven experiments and the Node.js 22.12+ prerequisite.
- Full lab source/document/config formatting and staged whitespace checks pass. The portability test ran on this Mac using a clean directory and fresh dependency installation; a Windows execution was not performed. Desktop/mobile browser behavior was checked in the preceding feature entries.
