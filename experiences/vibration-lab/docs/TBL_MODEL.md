# Pressure Fields on a Panel — engineering model

Experiment 08 in Vibration Lab compares Corcos turbulent boundary layer pressure,
a three-dimensional diffuse acoustic field (DAF), and a progressive plane wave
(PWF) on the same simply supported rectangular plate. Equal point-pressure PSD
isolates spatial loading and modal coupling. Inputs are illustrative, editable
teaching values, not calibrated flight or laboratory data.

## Units and conventions

All calculations use SI. `pressurePsd` is a one-sided PSD per Hz in Pa²/Hz;
`bandwidth` is an equivalent narrow band in Hz. The phase convention is
`Re{p̂ exp(+iωt)}`. Coordinates x/L and y/W range from zero to one. Field headings
and acoustic azimuths are degrees measured from +x toward +y. Acoustic incidence
is measured from the panel normal. The applied pressure PSD already describes
surface loading: no reflection or pressure-doubling factor is applied.

The normalized pressure CSD is

```
Gpp(r,r′,f) = Φpp(f) Γ(r−r′,f)
Γ(Δr) = E[p̂(r+Δr) p̂(r)*] / E[|p̂(r)|²]
```

Negative downstream phase therefore represents downstream travel at positive
time. Magnitude coherence is `|Γ|`; magnitude-squared coherence is `|Γ|²`.

## Pressure fields

For heading ψ, resolve Δr into along-flow separation Δs and across-flow Δn.
Classical constant-coefficient Corcos uses

```
Uc = (Uc/U∞) U∞
kc = ω/Uc
ΓTBL = exp[−kc(αx|Δs| + αy|Δn|)] exp(−ikcΔs)
Lx = 1/(αx kc), Ly = 1/(αy kc), λc = Uc/f
```

The decay coefficients multiply `ωΔ/Uc`; these are not reciprocal-length
coefficient conventions. Default αx = 0.12 and αy = 0.7 are illustrative smooth-wall
values. The coherence law is an empirical representation, not a CFD solution.
It can overpredict the low/subconvective wavenumber content relevant to a panel.

For DAF, `Γ = sin(kr)/(kr)`, with `k = ω/c`, `r = |Δr|`, and the continuous limit
Γ(0) = 1. This is the direction average over a sphere. An average only around a
circle would instead give a Bessel correlation and is not the model used here.

For PWF, `Γ = exp[−ik sinθ (Δx cosφ + Δy sinφ)]`. It has unit magnitude coherence
at every separation; normal incidence gives spatially uniform phase.

δ99 denotes the mean-velocity 99% boundary-layer thickness. It changes the layer
illustration and diagnostics `ωδ99/U∞`, `Lx/δ99`, and `Ly/δ99`. It does not enter
the constant-coefficient Corcos formula or the user-prescribed point PSD. The
different displacement thickness δ* is not inferred from δ99. An absolute wall
pressure autospectrum (for example, a separately specified Goody model) would
require additional physical inputs and validation and is not included.

## Panel model and complete modal CSD

The panel is a linear, homogeneous isotropic Kirchhoff–Love plate, simply
supported at all four edges. Its modal coordinates have peak-normalized shapes:

```
D = Eh³/[12(1−ν²)],  m′ = ρh
φmn(x,y) = sin(mπx/L) sin(nπy/W)
Mmn = ρhLW/4
ωmn = √(D/m′) [(mπ/L)² + (nπ/W)²]
Hmn(ω) = 1/[Mmn(ωmn²−ω²+i2ζωmnω)]
```

The damping setting is viscous modal damping ratio ζ, not loss factor η.
Six modes in each direction (36 total) are retained. Selecting an inspected mode
only changes its joint-acceptance diagnostic; it does not select a single-mode
response approximation.

The generalized-force CSD retains complex cross-modal terms:

```
GQrQs = ∫A∫A φr(r) Gpp(r,r′) φs(r′) dA dA′
Gww(B) = ΣrΣs φr(B) Hr GQrQs Hs* φs(B)
Gaa(B) = ω⁴ Gww(B)
Jr = GQrQr / (Φpp A²)
```

Force PSD units are N²/Hz; displacement PSD is m²/Hz; acceleration PSD is
(m/s²)²/Hz. Under uniform pressure, odd/odd modes give
`Jmn = 16/(m²n²π⁴)`; modes with either index even have zero net generalized force.

RMS readouts use `√(PSD(f) Δf)` at the cursor. They are equivalent narrowband
estimates, not integrals across a changing resonance or a broadband load. A note
appears when Δf is large relative to the local frequency or damping linewidth.

## Numerical integration and limits

The pressure CSD is represented as a positive mixture of plane-wave spatial
features. The exact rectangular modal transform is used for every feature:

```
Fmn(kx,ky) = Ix(m,kx) Iy(n,ky)
Ix(m,k) = ∫₀ᴸ sin(mπx/L) exp(−ikx) dx
         = L mπ [1−(−1)^m exp(−ikL)] / [(mπ)²−(kL)²]
```

The removable poles at `kL = ±mπ` use a stable sinc expression. Modal integrals
do not depend on the graphics mesh or on a pressure-sampling grid.

For Corcos, along-flow wavenumbers have a Cauchy distribution centered at kc
with scale αx kc; across-flow wavenumbers have a Cauchy distribution centered
at zero with scale αy kc. Their independent product, rotated into panel
coordinates, is exactly the spectrum of the stated coherence. Gauss–Legendre
quadrature is performed in Cauchy CDF coordinates. Integration intervals
resolve both the panel's spatial lobes and the convective ridge. The complete
Cauchy distribution, including both unbounded tails, remains in the integral.
For aligned flow, separable axis covariance integrals accelerate the calculation.

For DAF, positive spherical angular quadrature integrates uniformly over solid
angle, with its order increasing with acoustic aperture. PWF needs one feature.
Response integrates `Φpp Σk wk |Σn φn(B) Hn Fn(k)|²`. This is algebraically the
full cross-modal CSD contraction and is nonnegative by construction.

The cursor compares quadrature orders 4 and 8 and, when necessary, 8 and 12.
The reported error is the largest relative change of displacement PSD, selected
force PSD, and total retained modal-force PSD. A change over 1% triggers a visible
approximation note. This is a numerical refinement indicator, not a certified
error bound.

The cursor also compares 36-mode response with an 8×8 (64-mode) expansion; a
change over 5% triggers a modal truncation note. Quadrature refinement and modal
refinement are separate diagnostics. The normal frequency range is 5 Hz through
the smaller of 1200 Hz and 65% of the first omitted modal frequency:

```
first omitted = min(f7,1, f1,7)
```

This conservative range avoids omitted resonances but cannot guarantee small
truncation error at every observation point or spatial cancellation. The local
36-to-64 comparison remains necessary. A direct caller may evaluate outside the
range; `solve` reports that extrapolation explicitly.

The response plot keeps Φpp constant across its frequency sweep and inserts the
exact retained modal frequencies plus samples at fractions/multiples of damping
width. Its Corcos quadrature is lower-order (6 for aligned flow, 3 for rotated
flow) to keep interaction responsive; the cursor is independently refined.
Representative rotation/frequency tests compare the coarse spectrum quadrature
with order 8. A sparse curve is a teaching view, not a certified peak envelope.

## Animated realization

The animation uses one seeded set of random-phase waves at the selected physical
frequency: 64 waves for Corcos or DAF and one for PWF. Corcos samples the full
Cauchy wavenumber law; DAF samples directions uniformly on the sphere. Each wave
has peak amplitude `√(2 Φpp Δf/N)` and an independent phase. Therefore
`E[time-mean p²] = Φpp Δf`. It is a narrowband spatial sample, not fake broadband
noise or an animation of coherence presented as random pressure.

Every sampled wave's exact modal load drives the same plate receptances used in
the statistical response. Pressure and displacement share a physical phase.
The frontend may precompute phase-zero and phase-π/2 samples and animate their
linear combination. Changing the seed changes the realization, while ensemble
PSD predictions remain fixed. A single realization's RMS generally differs from
the ensemble estimate. Large Cauchy-tail wavenumbers can exceed the finite display
mesh's spatial resolution; the finite pressure texture is illustrative, while
modal projection still uses the exact transforms.

No aerodynamic feedback, acoustic radiation loading, cavities, prestress,
geometric nonlinearity, shock/buffet/separated-flow physics, or installed boundary
conditions are included. Numerical agreement does not validate those omissions.

## Verification

`experiences/vibration-lab/src/labs/tbl/physics.test.ts` checks:

- Direct parity with legacy Corcos/DAF/PWF coherence and refined joint acceptance.
- Hermitian/positive pressure and generalized-force CSD, Corcos phase and e-fold
  lengths, spherical DAF first zero, and plane-wave coherence.
- Analytical plate frequencies, modal mass, mode orthogonality, stable exact
  spatial transforms, uniform-pressure cancellation, and cross-modal interference.
- Receptance phase and damping scaling, PSD units, pressure/bandwidth scaling,
  zero input, quadrature refinement at control-box extremes, modal refinement,
  and first-omitted-frequency limits.
- Resonance-aware spectral samples, reproducible random fields, exact PWF
  realization response, and 1200-seed Corcos ensemble covariance/response.

## Primary references

- G. M. Corcos (1963), [Resolution of Pressure in Turbulence](https://doi.org/10.1121/1.1918431).
- W. J. Chyu and M. K. Au-Yang (1972), [Random response of rectangular panels to
  the pressure field beneath a turbulent boundary layer in subsonic flows,
  NASA TN D-6970](https://ntrs.nasa.gov/citations/19730004207). Normal-mode spectral
  response and structural acceptance provide the panel-model context.
- B. Rafaely (2000), [Spatial-temporal correlation of a diffuse sound
  field](https://pubmed.ncbi.nlm.nih.gov/10875370/), JASA 107, 3254–3258,
  DOI 10.1121/1.429397. Diffuse-field correlation and plane-wave simulation.
- [Measurement and analysis of sub-convective wall pressure fluctuations in
  turbulent boundary layer flows](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/measurement-and-analysis-of-subconvective-wall-pressure-fluctuations-in-turbulent-boundary-layer-flows/ED354937BE880DF512C7588CC30F4CA3),
  Journal of Fluid Mechanics. Equations 2.1–2.2 state the Corcos space-frequency
  and wavenumber-frequency forms; the discussion identifies low-wavenumber
  overprediction. Its transform phase convention differs in sign from this demo.
