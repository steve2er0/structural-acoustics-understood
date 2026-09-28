# Experimental Modal Testing — model and numerical provenance

Lab 03 lives at `/labs/modal`. It extends the shared Vibration Lab platform; there was no modal-testing implementation in this checkout when the continuation brief was inspected. Isolation and Shaker retain their models and components.

## Plate and boundary conditions

The article is an isotropic aluminium plate, 0.600 × 0.400 × 0.004 m, E = 69 GPa, density = 2700 kg/m³, Poisson ratio = 0.33; mass = 2.592 kg. The scene is drawn at 10 scene units per metre. Four cords illustrate a soft suspension. The analytical boundary is **free edge**, not simply supported. Suspension rigid-body motion, cord stiffness, sensor mass, cable loading, in-plane motion and higher modes are omitted. The six-mode bending response is a teaching model, not a calibrated test article or a broadband physical prediction outside the retained modal band.

`scripts/generate-modal-plate.py` generates `src/labs/modal/plate-data.json` using NumPy and SciPy. Runtime code only consumes that checked-in data; Python is not required to run the app.

A tensor-product Legendre basis P_i(2x/a) P_j(2y/b), degrees 0…8 in each direction, spans transverse deflection. The three transverse rigid-body functions (1, x, y) are removed. No edge displacement or slope constraints are imposed. With D = Eh³/[12(1−ν²)], the matrices are

```
M_ij = ∫ ρh ψ_i ψ_j dA
K_ij = D ∫ [ψ_i,xx ψ_j,xx + ψ_i,yy ψ_j,yy
             + ν(ψ_i,xx ψ_j,yy + ψ_i,yy ψ_j,xx)
             + 2(1−ν) ψ_i,xy ψ_j,xy] dA
K v_n = ω_n² M v_n
```

22 × 22 Gauss–Legendre quadrature exactly integrates the polynomial products. The lowest six eigenvectors are normalized to maximum absolute surface displacement 1 on a 161 × 121 grid; their modal masses are scaled consistently. A degree-10 solve checks convergence independently of the runtime data.

| Elastic mode | Frequency, Hz | Modal mass, kg | Degree 8→10 difference |
| ------------ | ------------: | -------------: | ---------------------: |
| 1            |       53.8211 |       0.362745 |              0.000311% |
| 2            |       57.9638 |       0.577480 |              0.000007% |
| 3            |      124.6281 |       0.301330 |              0.000341% |
| 4            |      136.1589 |       0.517547 |              0.000063% |
| 5            |      155.5553 |       0.342800 |              0.012484% |
| 6            |      183.0704 |       0.199181 |              0.017050% |

These are computed Ritz approximations, not a digitized experimental dataset. See [Leissa, _Vibration of Plates_, NASA SP-160](https://ntrs.nasa.gov/api/citations/19700009156/downloads/19700009156.pdf) for classical plate vibration and Ritz methodology.

## One model, two domains

```
m_n q̈_n + 2 ζ ω_n m_n q̇_n + m_n ω_n² q_n = φ_n(input) F(t)
x(output,t) = Σ φ_n(output) q_n(t)
a(output,t) = Σ φ_n(output) q̈_n(t)
H_x(ω) = Σ [φ_n(output) φ_n(input)] /
            [m_n(ω_n² − ω² + 2iζω_nω)]
H_v = iω H_x
H_a = −ω² H_x
```

The same damping ratio applies to all six modes. Positive measured force and acceleration point downward (+Z); Three.js uses Y-up, so transient deflection is sign-converted for rendering. Mode eigenvectors have arbitrary global sign.

Each tip produces a half-sine pulse of fixed impulse J = 0.12 N·s: F(t) = Jπ/(2T) sin(πt/T) for 0<t<T. Soft, Medium and Hard durations are 12, 3 and 0.8 ms. These are explicit educational assumptions, not a prediction for a particular commercial hammer. The optional bounce adds a 0.65-amplitude pulse delayed 35 ms.

RK4 at 8192 Hz integrates the finite pulse and each modal oscillator. A 4 s record (32768 samples) supplies the force FFT and acceleration FFT. The unwindowed complex ratio A/F is the plotted synthetic measurement; the analytical H_a is separately shown as a dashed reference. Frequency spacing is 0.25 Hz. A small finite-record error remains, especially at minimum damping; hard-tip pulse sampling also limits accuracy. Bins below 2.5% of J in the force-transform magnitude are suppressed rather than reporting unstable ratios.

The first 600 ms are replayed eight times slower, synchronizing the hammer contact, visible transient surface and waveform reveal. The force panel explicitly zooms to 20 ms (65 ms for a double hit). The full synthetic 4 s record is calculated up front; this is an educational replay, not real-time acquisition hardware.

Force spectrum units are N·s. The continuous-transform acceleration amplitude has units m/s. Accelerance has units (m/s²)/N. The spectrum charts use explicit dB references and are not PSDs. The spectra tab compares all three tip force spectra at equal impulse. See [Brüel & Kjær impact hammer data](https://www.bksv.com/-/media/literature/Product-Data/bp2078.ashx) for the relationship between tip, pulse shape and excitation bandwidth.

## Surface animation and reconstruction

The rendered solid surface has 48 × 32 cells per side. Precomputed modal shape values drive actual vertex displacements, the attached sensor and the suspended attachment positions. The transient is physical modal displacement magnified 80×. The selected-mode animation uses the peak-normalized eigenvector and a separate 0.15–0.90 scene-unit visual scale, with illustrative slow playback. It does not assert that the real plate moves by that displayed amount. Near-zero normalized displacement is shaded when nodal bands are enabled.

A 5 × 3 grid supports a roving hammer with fixed reference. At each completed clean strike, a linear complex least-squares fit of **real modal residues** to the measured A/F uses known model frequencies and damping. Dividing the residue by the known reference amplitude and multiplying by modal mass gives signed spatial samples. An inverse-distance interpolation with local confidence falloff fills nearby surface regions. It is intentionally sparse at first and preserves the samples exactly.

This is **model-assisted reconstruction**, not a general-purpose modal estimator: the poles, reference normalization and modal masses are known. A reference amplitude below 0.025 is treated as unobservable for that mode. Noise and weak excitation can contaminate the fit. Changing reference or test parameters clears the survey; choosing another impact point retains it. Double-hit demonstrations do not enter the clean survey.

Instrument placement is discrete on the 5 × 3 measurement grid. Dragging or clicking the plate snaps using distances in the plate's physical aspect ratio; the point occupied by the other instrument is excluded. The reference therefore occupies one of the 15 points, leaving 14 available hammer positions for a fixed-reference survey. Cables and annotations follow placement. Moving either instrument invalidates the current record so the next impact is evaluated at the new input/output pair. Placement is locked during acquisition and the guided tour.

## Noise, coherence and limits

Deterministic seeded independent Gaussian acceleration noise is specified in m/s² RMS. The noisy FFT feeds A/F. Expected ensemble coherence is

```
γ²(f) = |H(f) F(f)|² / (|H(f) F(f)|² + E|N(f)|²)
E|N_k|² = σ² N       (unnormalized FFT)
```

This is explicitly an ensemble prediction, not a coherence estimate from a single FFT ratio (which would misleadingly be unity). Weak excitation, antiresonances and reference nodes can reduce signal-to-noise even when the system is linear. A deterministic double pulse alone does not make an ideal linear FRF incorrect; the spectral notches make division vulnerable to noise and encourage rejecting the strike in practice.

The adjacent 53.8/58.0 Hz modes also illustrate why an isolated-mode half-power damping estimate may be unreliable. Optional half-power and reciprocity UI are deliberately omitted; mathematical reciprocity is covered by a regression test.

## Shared platform and verification

LabCanvas, SceneBoundary, LabEnvironment, CameraController, EngineeringPlot, projected annotations, EngineeringVector, ParameterSlider, SegmentedControl, Toggle, LabNavigation and useGuidedTour are reused. Physics has no React or Three imports. Rendering reuses typed arrays; World is memoized and receives a stable grid callback. Camera and mode transitions are interpolated.

`physics.test.ts` verifies modal integrity/normalization, convergence metadata, location/nodal dependence, reciprocity, response-type relationships, resonance frequency, damping bandwidth and decay, pulse impulse and bandwidth, double hits, FFT sign, time/frequency parity, noise/coherence, fitted signed residues and sparse interpolation. Browser checks are recorded in `VALIDATION.md`.
