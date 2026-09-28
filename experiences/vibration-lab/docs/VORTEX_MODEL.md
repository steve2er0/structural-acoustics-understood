# Multi-body launch-vehicle longitudinal vortices

Route: `/labs/vortex`. Educational kinematics on a generic core with two boosters; not CFD or a flight-load solver. The September 28 correction replaces the original broadside cylinder streets with a longitudinal leeward pair on each body. There is no aerodynamic validation inherited from the SEA or RS-25 experiments.

## Topology and source basis

NASA TM 88332 §2.7 distinguishes longitudinal lee-side vortices on a slender body at incidence from a periodic broadside cylinder street. Its smoke visualization shows the flow developing along the body, with a transverse light sheet revealing the paired cores. The experiment also demonstrates that symmetry and unsteadiness depend on conditions. Its particular angle thresholds are not used as general launcher criteria here.

The demo accordingly shows two continuous, opposite-sense cores developing from forebody shoulders along each barrel. Dots move downstream on spiraling paths; the two cores are not released alternately. A midbody cut displays their cross-sections. The blue 3D lanes and arrows show the full relative-air vector, including axial velocity. Only the inset arrow represents the transverse component.

## Inputs and velocity convention

- Mach 0–2. Alpha and beta each −30° to +30°, focusing the view on forebody/ascent flow. This display range is not a claimed symmetric-flow validity range.
- Fixed air: T = 288.15 K, density = 1.225 kg/m³, viscosity = 1.7894e−5 Pa·s, gamma = 1.4, R = 287.05 J/(kg·K). No altitude trajectory.
- Core barrel: diameter 5 m, length 43 m. Two boosters: diameter 3.2 m, length 35 m. Barrel gap 0.15–3 m, default 0.6 m. Fairing and noses provide visual context. Common drawing scale 0.2 units/m.
- Default: Mach 0.3, alpha 12°, beta 0°. Presets compare pure sideslip, combined angles, negative incidence, axial flight and transonic flow.

Body X points noseward, Y starboard, Z down. Vehicle velocity is `U(cosα cosβ, sinβ, sinα cosβ)` and relative air is opposite. Drawing maps body `(X,Y,Z)` to `(Y,X,−Z)`, so the unit air vector is `(-sinβ, -cosα cosβ, sinα cosβ)`. World Y points noseward; air travels toward decreasing Y. Positive beta carries air toward port.

```
a = sqrt(gamma R T) = 340.2922869 m/s
U = M a
Uaxial = U cosα cosβ
Uperp = U sqrt(sin²β + sin²α cos²β)
incidence = acos(cosα cosβ)
Reperp = density Uperp D / viscosity
q = density U² / 2; qperp = density Uperp² / 2
```

At zero incidence, Uaxial = U: blue airflow persists even though the illustrated pair fades. At zero Mach all transport stops. Reversing angle signs reverses leeward placement while preserving axial velocity. This removes neither real base flow nor attachment wakes.

## Prescribed spatial development

`longitudinalPath` returns meters. Its station parameter s increases aft from the source shoulder, at world Y = 26.5 m for the core and 13 m for the boosters. The common barrel tail is Y = −22 m. Sources, growth, swirl and visibility are artistic assumptions, not a separation solution.

On the body, the pair lies outside the barrel on its leeward side, resolved in transverse normal and tangent directions from the full air vector. A core fairing allowance transitions over 10 m. Both cores extend monotonically toward decreasing Y. They then continue another 18 m axially behind the tail, with a tangent parallel to the **full** relative-air direction. The near-body path is prescribed to follow the body instead of being a straight freestream trajectory through solid material.

Helical tracer radius grows to 0.105D over the first 12 m; pitch is 3.2D. Orange and teal encode opposite swirl senses. Transparent tubes illustrate cores, not vorticity contours. Pair opacity varies continuously with incidence and vanishes at zero speed/incidence. It does not estimate circulation or determine a physical separation threshold. Overlap between neighboring paths is not an interaction calculation; no gap jet, shielding or merging correction is applied.

## Animation and time

Integrated axial travel is `integral(0.65 Uaxial dt)`. The 0.65 factor is an explicit visual convection assumption. Dots advance along the continuous helical paths; the core geometry does not oscillate side to side. The midbody rotation indicators and spatial-development plot use the same integrated travel. Freestream blue tracers use U, without the convection deficit. Parameter changes reconfigure the schematic immediately without modeling a transient.

Physical seconds per viewing second = `playback * min(1, 28/max(28,U))`, where playback is 0.25, 0.5 or 1. The visible multiplier documents automatic slow motion. This caps displayed freestream travel at 28 m per viewing second at full playback, including when Uperp = 0. Pause and hidden-document state suspend the clock; reduced-motion users start paused. Orbit controls remain usable while paused.

## Separate cylinder-based reference

`fref = St Uperp/D`, with prescribed St = 0.20, editable 0.10–0.35. This is a dimensional crossflow reference scale; it is **not a predicted shedding frequency for the longitudinal pair** and does not drive animation. The frequency plot is retained to explain this distinction. Reynolds number is reported; no Reynolds-dependent correlation is applied. A nominal Reperp < 47 cylinder gate suppresses only this reference frequency, never the longitudinal visualization.

Above total Mach 0.3, compressibility is flagged even if crossflow Mach remains small. The fixed-St extrapolation does not account for shocks or transonic buffet. Geometry-specific separation onset, asymmetric states, turbulent breakdown, base flow, attachments, exhaust, multi-body coupling, aeroelastic feedback and aerodynamic loads are not solved. No force or pressure waveform is shown.

## Primary references

- [NASA TM 88332, Vortical Flows Research Program of the Fluid Dynamics Research Branch (1986), §2.7 and Fig. 7](https://ntrs.nasa.gov/api/citations/19880004167/downloads/19880004167.pdf): spatial development and cross-sections of longitudinal vortices on bodies of revolution. Supports the topology distinction, not this launcher's prescribed curves.
- [NASA cylinder validation](https://www.grc.nasa.gov/www/wind/valid/lamcyl/Study1_files/Study1.html): cylinder Strouhal reference; not launcher calibration.
- [Yawed-cylinder end-condition study (2019)](https://www.mdpi.com/2076-3417/9/8/1590): limits of normal-velocity independence assumptions.
- [NASA, asymmetric flow-state switching on SLS Block 2](https://ntrs.nasa.gov/citations/20230018133): multi-body interference omitted by this illustration.
- [NASA, sensitivity of SLS buffet forcing](https://ntrs.nasa.gov/citations/20160007661): booster/core and protuberance/shock interactions.
- [NASA, SLS transonic buffet](https://www.nas.nasa.gov/SC15/demos/demo16.html): motivates explicit compressibility limits.

## Verification

The 16 vortex cases cover independent direction cosines, velocity decomposition, still-air/axial/broadside limits, mirrored angle signs, reference scale and diameter dependence, geometry and projected upstream ordering, compressibility labeling, monotonic axial development, aft alignment with the full flow vector, own-barrel clearance, axial transport with no crossflow oscillator, independence from St, and bounded display-time scaling. They validate implementation of the stated kinematics, not aerodynamic fidelity. Browser observations are recorded in `VALIDATION.md`.
