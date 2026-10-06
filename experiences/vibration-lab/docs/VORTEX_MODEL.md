# Booster/core attachment wakes and surface pressure

Route: `/labs/vortex`. Generic core plus two boosters. This is a prescribed educational field, not CFD, measured pressure, or a flight-load solver. The September 29 update makes the **forward booster-to-core attachment hardware** the source of the visible wake and OML pressure fluctuations. The separate forebody-vortex illustration and cylinder frequency reference are retained only in the collapsed background section.

## Mechanism and sources

NASA's [Booster Interface Loads](https://ntrs.nasa.gov/citations/20160008008) describes unsteady pressure from interaction between shocks and the wake shed by the forward booster/core attach hardware. [Sensitivity of SLS Buffet Forcing](https://ntrs.nasa.gov/citations/20160007661) reports high buffet environments behind that protuberance and sensitivity to mitigation geometry. [Parametric Study of Forward Attachment Geometry](https://ntrs.nasa.gov/citations/20220017645) examines attachment OML changes. These support the source and qualitative mechanism; none calibrates this demo's numerical pressure field. NASA's [cylinder-wake validation](https://www.grc.nasa.gov/www/wind/valid/lamcyl/Study1_files/Study1.html) explains wake-centerline frequency doubling: a centerline probe feels the alternating vortices from both sides. The September 30 update uses that symmetry as a qualitative analogy for the attachment wake, not launcher calibration. NASA's [unsteady pressure-sensitive paint](https://www.nasa.gov/centers-and-facilities/ames/fluctuating-forces-of-flight-captured-by-new-high-tech-paint/) is the visualization reference.

The golden brackets are at drawing-coordinate Y = 8.5 m (1.7 scene units), matching the original forward connection. Wake packets start there, convect aft through the core/booster gaps and continue behind the tail. Pressure is applied to the facing surfaces of the adjacent core and booster. The aft brackets remain visible but have no separate wake source in this model.

This source **remains active at zero angle of attack and sideslip**. Removing the boosters removes the forward attachments and their pressure contribution. At zero Mach all fluctuating pressures are zero. Turning surface coloring off retains the same attachment wake, hardware, taps and numerical pressure model.

## Inputs, geometry and coordinates

- Initial condition: Mach 0.3, alpha = beta = 0. Controls span Mach 0–2 and alpha/beta ±30°. These are exploration ranges, not aerodynamic validity bounds.
- Fixed air: T = 288.15 K, density = 1.225 kg/m³, viscosity = 1.7894e−5 Pa·s, gamma = 1.4, R = 287.05 J/(kg·K). No altitude trajectory.
- Core barrel: diameter 5 m, length 43 m. Boosters: diameter 3.2 m, barrel 35 m. Barrel gap 0.15–3 m, default 0.6 m. Scale = 0.2 drawing units/m. Generic geometry, not a dimensionally accurate SLS vehicle.
- Body X points noseward, Y starboard, Z down. Drawing maps body (X,Y,Z) to (Y,X,−Z). The full relative-air unit vector in drawing coordinates is `(-sin beta, -cos alpha cos beta, sin alpha cos beta)`.
- Circumferential theta starts at drawing +Z and increases toward +X (starboard). Surface points are `(body.x + r sin theta, y, r cos theta)`. The map runs nose-to-aft horizontally and theta 0–360° vertically. Pressure tap markers remain visible through geometry.

```
a = sqrt(gamma R T) = 340.2922869 m/s
U = M a
Uaxial = U cos(alpha) cos(beta)
Uperp = U sqrt(sin(beta)^2 + sin(alpha)^2 cos(beta)^2)
qInf = density U^2 / 2
Uc = 0.65 Uaxial                      [prescribed convection]
s = 8.5 - y                          [distance aft of forward attachment]
```

## Prescribed wake and pressure

Each attachment is centered in its gap, at `x = ±(2.5 + gap/2)` m. Near the body, transverse displacement uses 0.25 of the free-stream slope; lateral movement is constrained by `0.35 gap * tanh(0.25 s flow.x / (0.35 gap))` to remain in the gap. The Z slope is `0.25 flow.z / (-flow.y)`. Beyond the tail the centerline follows the full free-stream direction. These paths are illustrative, not streamlines or an interference solution.

For each source adjacent to a body, project its wake center onto that body's OML to obtain a footprint center angle. Its Gaussian angular width is `0.30 + 0.004s` radians. The downstream envelope is `(1 - exp(-s/1.5)) exp(-s/35)` for s > 0; it is zero upstream. The core receives both attachment footprints; each booster receives its own adjacent footprint. No radial inverse-square law or Bernoulli pressure inference is used.

```
CpPrime(y,theta,t) = sum_k [a_k(y,theta) cos(2 pi f_k t)
                         + b_k(y,theta) sin(2 pi f_k t)]
pPrime = qInf CpPrime = p - mean(p)
f_k = prescribedFrequency * [1, 0.73, 1.37, 1.91, 2]
phi = 2 pi f (t - s/Uc) + sign(source)*0.4
d = wrapped(theta - footprintCenter) / (0.30 + 0.004s)
F1(d) = sign(source) d exp((1-d^2)/2)   [odd, peaks at |d|=1]
F2(d) = exp(-0.5 (d/0.6)^2)            [even, peaks at d=0]
Cp_coherent = amplitude envelope(s) sqrt(c) [F1 cos(phi) + h F2 cos(2phi)]
```

The amplitude setting is a **Cp′ scale factor**, not local peak or RMS. It defaults to 0.12. Frequency defaults to 2 Hz and is prescribed independently of Mach and the cylinder Strouhal reference. The coherent fraction c defaults to 0.85. Both the 1×/2× pair are weighted by sqrt(c). The harmonic strength h defaults to 0.65 (editable 0–1), an assumed ratio of the peak spatial scales, not a local measured RMS ratio. The odd fundamental is zero on the projected centerline; the even 2× mode is strongest there, with half the convected wavelength `Uc/(2f)` and a phase exactly twice the fundamental carrier. The 0.6 width ratio is illustrative. The three secondary tones use a Gaussian footprint times sqrt(1-c) and normalized spatial weights `[cos(s/9), sin(s/9), 0.65]`, with phases `-2 pi f_k s/Uc + sign(source)*0.4 + 1.7k` for k=1,2,3. Setting c=1 removes those background tones while retaining the coherent harmonic. Setting h=0 removes only 2×. Lower c changes spatial correlation and spectral content; it is neither measured coherence nor a turbulence model.

Two adjacent surfaces share the imposed phase of their attachment source. Source-to-source phase offsets are also prescribed. This is not a solved core/booster coupling model. The animated roll-up packets are a schematic carrier cue; the pressure paint and maps resolve the 1×, 2× and three background pressure modes; their geometry, radius, decay and display count are schematic.

## Displays and diagnostics

- Blue/neutral/red is instantaneous pressure below/at/above the local mean, not absolute pressure. There is no mean-pressure solution. Surface texture, midbody map, unwrapped map and taps evaluate the same coefficients.
- Cp′ and Pa display modes have fixed user-selected color limits. Changing Mach does not automatically rescale a Pa legend; pressures can saturate. The default Cp′ color limit is ±0.1. At zero flow the inactive prescribed coefficients are zero; the code does not divide by zero dynamic pressure.
- By default A is on the starboard wake flank and B on its projected centerline, both at y=4 m. “Compare 1× flank / 2× centerline” snaps both taps on the inspected body at the same station using the current attitude. The taps subsequently stay fixed to the skin. The centerline is a wake projection onto the OML, not the launch vehicle axis. Downstream dashed map paths identify it; the spectrum labels exact f and 2f, and each tap reports both components’ RMS.
- Two movable taps support OML clicking, map dragging, body selection, axial distance and theta sliders. The unwrapped map follows the inspected body. Removing a body relocates its displayed taps to the core.
- Time traces reconstruct the previous four physical seconds using current parameters, including negative synthetic times immediately after reset. They are not recorded histories and do not simulate parameter-change transients.
- Exact infinite-time RMS is `sqrt(sum_k(a_k^2+b_k^2)/2)`. Each spectral line contains `(a_k^2+b_k^2)/2` coefficient-squared (or Pa² after qInf² scaling). The plot is **line power, not PSD per Hz**. Summed line powers equal RMS squared.
- Same-body zero-lag correlation is the analytic modal covariance divided by the RMS product; zero signal gives an em dash. Different-body taps report shared assumed forcing instead of suggesting a validated coherence result. `Delta s/Uc` is a convection reference, not a measured signal delay; spatial shape and mode mixtures also influence phase/correlation.

## Clock, rendering and controls

Physical seconds per viewing second = `playback * min(1, 28/max(28,U))`. An additional common-clock limiter caps the highest pressure tone at four cycles per viewing second at full playback. Slow motion is displayed; pause and hidden-document state suspend the clock, and reduced-motion users start paused. Pause flushes the same instant to the plots. Camera orbit remains available while paused. Flow and pressure edits reset the synthetic clock; tap moves and unit/color-limit changes do not.

The 3D surface uses a sampled DataTexture with UVs derived from physical axial coordinates, not lathe vertex index. The map uses the same pressure function and diverging RGB scale. The paint layer is offset 0.003 scene units outside the nominal OML for reliable picking and depth ordering; pressure coordinates still use the nominal surface. Mesh structural details remain visible over the paint layer. At low speed and high prescribed frequency, a warning identifies under-resolved surface wavelengths; analytic taps remain valid. The Attachment camera focuses on the hardware and downstream footprint. The tour explains the bracket source, two facing surfaces, speed/attitude, axial-flow persistence and model limits.

## Limits and separate references

Above total Mach 0.3 the app flags compressible extrapolation. **No transonic amplification curve, shock location, separation threshold, force integration, flight-load spectrum or gap-flow correction is predicted.** NASA's physical mechanism is much more complex than this prescribed field, particularly near transonic conditions. Real broadband turbulence, boundary-layer pressure, base wakes, exhaust and aeroelastic response are omitted.

The collapsed reference section retains `fref = St Uperp/D` (St editable 0.10–0.35, default 0.20; nominal Reperp < 47 cylinder gate) and the prior longitudinal forebody-path plot. They do not drive attachment frequency or pressure. The original path functions and 16 tests remain as separate geometric/reference checks. Their topology basis is [NASA TM 88332 §2.7](https://ntrs.nasa.gov/api/citations/19880004167/downloads/19880004167.pdf); the dimensional cylinder scale follows [NASA cylinder validation](https://www.grc.nasa.gov/www/wind/valid/lamcyl/Study1_files/Study1.html).

## Verification

Pressure checks additionally cover odd/even transverse symmetry, zero centerline fundamental, half-period repetition at 2×, exact doubled carrier phase/frequency, independent harmonic removal, and comparison placement at changed attitude. Existing checks cover source removal/still air, persistence in axial flow, zero upstream fluctuation, matching imposed forcing on adjacent surfaces, amplitude and dynamic-pressure scaling, angular wrap and mirrored RMS, numerical versus analytic mean/RMS, same-point correlation, independent prescribed frequency, downstream phase delay, tap projection/body removal and color saturation. These validate implementation of the prescribed model, not aerodynamic fidelity. Browser observations and portable build evidence are recorded in `VALIDATION.md`.
