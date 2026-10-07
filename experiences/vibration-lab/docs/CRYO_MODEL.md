# Cryogenic tank — shell inertia, pressure prestress and slosh

This lab is a reduced energy model for explaining the matrix operations used in a wet-tank modal analysis. It solves coupled generalized eigenproblems and draws their eigenvectors. It is not an imported tank FE model, a reconstruction of the user's existing seven fluid eigenvectors, or a qualified prediction of tank frequencies.

## Nominal tank and load case

| Quantity                        | Value / convention                                                         |
| ------------------------------- | -------------------------------------------------------------------------- |
| Diameter                        | 8.4 m                                                                      |
| Total height                    | 16.8 m, including both end domes                                           |
| End geometry                    | Two 2:1 ellipsoidal domes, each 2.1 m deep                                 |
| Cylindrical barrel              | 12.6 m                                                                     |
| Wall thickness                  | 0.25 in = 6.35 mm                                                          |
| Aluminum                        | E = 69 GPa, ν = 0.33, ρ = 2700 kg/m³; fixed generic properties             |
| Elastic modal supports          | None; a restricted elastic Ritz space, with rigid-body coordinates omitted |
| LOX / LH₂ densities             | 1140 / 70.8 kg/m³, representative values held constant                     |
| Default liquid fill             | 85% of enclosed **volume**                                                 |
| Ullage pressure                 | 31 psig = 213.737 kPa differential across the shell                        |
| Effective settling acceleration | 2 × 9.80665 m/s², already including the chosen gravity contribution        |

With radius R = 4.2 m and dome depth c = 2.1 m, the enclosed volume is

\[
V = \pi R^2 L + \frac{4}{3}\pi R^2 c = 853.43249\ \mathrm{m^3}.
\]

The shell area is 485.47818 m² and nominal shell mass is 8323.52 kg, excluding insulation, fittings, rings and stiffeners. The local radius of each half-ellipsoidal dome is evaluated directly. An analytic integral of πR(z)² gives volume below elevation z, and a bracketed solve maps volume fill to liquid elevation. At 85% volume fill, the surface is 13.79 m above the bottom, inside the cylindrical barrel.

The net pressure profile is

\[
p(z)=p*u+\rho*\ell a\_{\rm eff}\max(h-z,0).
\]

Ullage pressure raises the entire profile. Acceleration changes the slope in the wetted portion. The default LOX liquid-head contribution is 308.333 kPa at the bottom, giving 522.070 kPa total differential pressure. There is no extra implicit 1 g. The incremental ullage pressure is maintained constant: a sealed gas-volume/compression spring is **omitted**, which matters especially for axisymmetric breathing.

## Structural Ritz space

Five axial trial functions are retained for each represented circumferential family n = 0–12. Cosine and sine shell partners are retained for n = 1–3; n = 4–12 uses one representative cosine orientation. This gives 80 structural coordinates, plus the same seven surface coordinates in the partial-fill coupled system. The inspector and animation expose the first three tracked elastic branches of every family through n = 12. The four lowest names remain breathing (n = 0), bending (n = 1), ovalization (n = 2) and three-lobe (n = 3); higher families use their lobe count.

For each axial polynomial Pⱼ(2z/H−1), a smooth envelope F(z) = sin²(πz/H)Pⱼ is used. Cylindrical displacement components have radial amplitude R(z)F(z)/R, near-inextensional hoop amplitude −uᵣ/n, and an axial amplitude −R(z)²F′/(Rn²) for n > 0. The n = 0 coordinates represent radial breathing without an independent axial relaxation coordinate.

The displacement field is evaluated on the barrel and both domes. Linear membrane strain follows the first variation of the surface metric; bending strain follows the first variation of surface curvature. Isotropic membrane and bending energy is integrated on the actual surface with thickness t, membrane modulus Et/(1−ν²), and bending modulus Et³/[12(1−ν²)]. The structural mass follows the same physical surface displacement field.

This basis has no externally applied modal supports. Nevertheless, its taper fixes the pole displacements and imposes selected barrel kinematics. It is a **restricted elastic approximation**, not the complete unconstrained free-free shell space. Rigid translations and rotations are outside the retained coordinates. Dome-local modes, independent tangential/axial modes and general n = 0/1 shell behavior need a richer structural basis or actual FE matrices.

## Pressure-induced geometric stiffness

The pressure comparison uses the barrel initial-stress energy with prescribed tensile membrane resultants

\[
N\_\theta(z)=p(z)R,\qquad N_z(z)=p(z)R/2.
\]

The latter is **not inferred as the axial stress of an arbitrary flight tank under hydrostatic pressure**. The chosen static surrogate balances the pressure-head resultant using a distributed axial reaction over the wetted barrel, together with the closed-end pressure resultants. Its axial force per unit barrel length is ρaπR², which balances d(2πRN_z)/dz = −ρaπR². No modal support constraint is introduced by this bookkeeping choice. The corresponding attachment/load path, shell inertia stress and dome stress field have not been solved.

The barrel geometric stiffness is integrated from N*z and N*θ times the axial and circumferential displacement-gradient products. Both pressure contributions enter that integration. Dome prestress and the pressure **follower-load tangent** are omitted. This is therefore a barrel initial-stress surrogate, not the full linearization about the loaded equilibrium of a pressurized free-free closed tank. In particular, structural initial-stress stiffness alone does not guarantee preservation of rigid rotation modes; those coordinates are excluded from this educational reduction.

## One fluid energy model

Liquid is incompressible, inviscid and irrotational. Its potential is expanded in regular circumferential functions and polynomial radial/axial functions on the actual domed liquid domain:

\[
\psi_i=(r/R)^{n+2j}P_l(2z/h-1)\{\cos n\theta,\sin n\theta\}.
\]

Four radial orders and eight axial orders are retained per angular block. The constant n = 0 potential is removed. Angular orthogonality is integrated analytically; no coupling is introduced between different n or between cosine/sine partners.

The weak Laplace operator and wall/free-surface flux matrices are

\[
L*{ij}=\int*{\Omega*\ell}\nabla\psi_i\cdot\nabla\psi_j\,dV,
\qquad
B*{i\alpha}=\int*{\partial\Omega*\ell}\psi*i\,v*{n,\alpha}\,dS.
\]

For the tank wall, the flux uses its full cylindrical displacement components: R(z)[uᵣ−R′(z)u_z]dz dθ. On the free surface it uses the retained elevation coordinates. A shell-induced **uniform mean surface motion** compensates the wall volume change for n = 0, preserving liquid volume. The potential coefficients satisfy Lc = Bq̇.

One shared liquid kinetic-energy matrix follows:

\[
M*f=\rho*\ell B^T L^{-1}B.
\]

This symmetric nonlocal operator retains off-diagonal coupling. It does not assign all liquid mass uniformly to the wetted wall. Wall and surface motion share the same fluid matrix; adding seven independent slosh oscillators to an already complete liquid mass matrix would double-count inertia.

## Seven retained fluid coordinates

The seven free-surface coordinate shapes are the familiar circular Bessel reference families, counted as **seven vectors total**, rather than seven families with uncounted lateral partners:

| IDs |   n | First strictly positive J′ₙ root | Directions    |
| --- | --: | -------------------------------: | ------------- |
| 1–2 |   1 |                    1.84118378134 | cosine / sine |
| 3–4 |   2 |                    3.05423692823 | cosine / sine |
| 5   |   0 |                    3.83170597021 | axisymmetric  |
| 6–7 |   3 |                    4.20118894121 | cosine / sine |

The surface functions are Jₙ(βr/R_surface), so the n = 0 shape has zero area mean. The constant volume-change mode is excluded. These are model-generated Ritz surface coordinates. In the seven-dimensional rigid-wall projection, the orthogonal angular blocks yield seven projected fluid eigenvectors. They are **not** the user's extracted FE fluid eigenvectors, and at every fill they need not be the lowest seven eigenvectors of the actual domed fluid domain. Radial overtones and other angular families are omitted.

For an actual flat-bottom rigid cylinder, the benchmark is

\[
f=\frac{1}{2\pi}\sqrt{a k\tanh(kh)},\qquad k=\beta/R.
\]

Density cancels in this rigid-wall gravity-only result. LOX and LH₂ can therefore have similar gravity-slosh frequencies at fixed geometry and acceleration while generating very different shell added inertia and pressure head. The lab's domed-domain rigid-wall values come from its potential-flow energy calculation, not by applying a frequency multiplier to this formula.

The free-surface gravitational stiffness is

\[
K*g=\rho*\ell a\int*{A_s}\eta*\alpha\eta\_\beta\,dA.
\]

It includes the volume-conserving mean motion induced by axisymmetric shell deformation. Surface-tension restoring force, nonlinear slosh and gas compression are omitted. At zero acceleration, ideal gravity-slosh restoring stiffness vanishes; the lab does not claim the free surface remains settled in a real microgravity tank.

## Five comparisons and mode identity

1. **Dry:** K_dry φ = ω²M_dry φ.
2. **Mass:** K_dry with a retained-space high-frequency apparent mass.
3. **Pressure:** K_dry + K_G with M_dry.
4. **Mass + pressure:** both operators, without gravitational surface dynamics.
5. **Coupled:** the uncondensed shell/surface kinetic matrix and gravitational stiffness.

In the coupled case,

\[
\begin{bmatrix}K*{\rm dry}+K_G&0\\0&0\end{bmatrix}+K_g
\quad\text{and}\quad
\begin{bmatrix}M*{\rm dry}&0\\0&0\end{bmatrix}+M_f
\]

form the generalized eigenproblem. Zero off-block entries here do not remove coupling: M_f contains shell/surface cross terms, and K_g contains any mean-surface contributions.

The mass comparisons condense the retained free-surface coordinates in the zero-gravity/high-frequency limit:

\[
M*A=M*{ss}-M*{sf}M*{ff}^{-1}M*{fs},\qquad
\eta=-M*{ff}^{-1}M\_{fs}q_s.
\]

This is a **seven-coordinate condensation**, not the complete exact pressure-release free-surface operator. Angular blocks without a retained surface coordinate, n = 4–12 in the animation, retain the rigid-surface approximation. For those blocks, the coupled and combined eigenproblems coincide: the seven lower-order free-surface coordinates remain orthogonal to their shell motion. Where a surface coordinate is retained, the condensed surface motion is used in its visualization; the coupled case uses its solved η. Fluid arrows come from the gradient of the same Galerkin potential used for kinetic energy.

Shell labels are anchored to dry references and continued through small fill increments within each angular block, using MAC and one-to-one assignment. The empty-tank seed includes the selected ullage pressure and is mapped to the dry shell with the dry structural mass metric. At fixed topology, successive states use the mean of their total kinetic mass matrices; the coupled case includes the retained surface coordinate. At surface opening/closing or a change in dimension, matching uses the shared structural coordinates with the dry mass metric. A liquid-heavy shell mode is not penalized for its small structural kinetic-energy fraction. Independently matching every fill to the original dry shape can jump between distinct eigenvectors as shapes evolve; that comparison is no longer used to define branch identity. Frequencies, eigen residuals and modal energy fractions remain outputs of the unchanged generalized eigenproblem, with no smoothing of eigenvalues.

The canonical continuation grid uses 1% volume-fill increments, with adaptive bisection when an adjacent assignment has MAC below 99.5%. Refinement is bounded by a minimum fill step of 0.001 percentage point and twelve bisection levels. An accepted path containing MAC below 90% or a numerically degenerate pair is flagged as uncertain. The path starts from empty fill at fixed liquid, ullage and acceleration, so jumping the slider directly to a fill gives the same result as reaching it incrementally. Changing another operating parameter creates a new fill path; the demo does not track a multidimensional parameter path.

Tracking is resolved lazily by `findMode` for the inspected angular block, with bounded operating-point caches. `solve` first returns the actual spectrum with provisional pointwise labels. Programmatic callers that enumerate an entire case should call `resolveCaseModes` to resolve all of that case's identities. This keeps slider interaction responsive without changing the spectrum.

The UI separates **fill-step MAC** (overlap with the preceding continuation state) from **dry-shape overlap** (overlap with the original reference). A shape can evolve far from its dry reference while remaining continuously tracked. Uncertain continuation is flagged, and the fill plot breaks rather than joining an uncertain correspondence. Each current-fill plot marker uses the exact same eigenvector as the numerical readout and 3D scene.

At complete fill, the incompressible sealed fluid imposes zero wall-volume change, eliminating one n = 0 direction. An eliminated branch is left unavailable. The user's selection remains on that branch with no frequency or modal animation, rather than silently switching to another eigenvector. Empty and completely full tanks have no free-surface coordinates.

“Structural kinetic energy” and “fluid kinetic energy” sum to 100%. Fluid energy includes shell/surface cross terms; it is not a pure slosh-coordinate participation percentage. A single visual scale is applied to shell, surface and liquid displacement to preserve their relative amplitudes. Playback is slowed and deformation amplified.

The shell mesh retains 96 circumferential segments, giving eight samples per angular wavelength at n = 12. Fluid-arrow sampling increases for n ≥ 4 to more than 2(n + 1) angles, avoiding the repeated-phase alias of the previous four fixed angular locations. The high-order radial sample rings are at 0.65 and 0.92 of the local tank radius because the potential motion concentrates near the wetted wall. This changes only visual sampling, not the fluid matrix, modal amplitudes or calculated frequencies.

## Numerical evidence and practical limits

### Fourier coverage across a fill sweep

The **Fourier coverage** analysis is an additional diagnostic, separate from the
n = 0–12 animation and its seven-coordinate coupled solve. It evaluates the same
shell-energy and potential-flow formulation in representative cosine blocks
n = 0–20. The controls compare retained cutoffs of 8, 12, 16 and 20, with a
user-selected frequency band (default 10–2000 Hz) and mass-only, pressure-only
or mass plus pressure stiffness. Frequency is on the horizontal logarithmic
axis and circumferential order n is on the vertical axis. The spectrum plot,
selected-family fill sweep and current-fill readout show only **m = 1**, defined
as the first tracked dry shell branch of each angular family. Its eigenvector
mixes the five axial shell trials retained in every solve; m does not identify
one literal axial Fourier wave or Ritz trial coordinate. Higher solved shell
branches remain hidden in this panel.

In an exactly axisymmetric tank, angular orthogonality makes these independent
blocks. Raising the angular cutoff does **not** alter any already-retained
block. Consequently, unchanged low-order frequencies or a weak dependence on
fill cannot establish angular completeness. The diagnostic instead reports
additional **m = 1** branches above the chosen cutoff that fall inside the
analysis band. Counts include only the first tracked dry branch in one cosine
orientation per n; higher shell branches and the degenerate sine partner are
not counted. Frequencies outside the entered band are hidden and their counts
are stated above the plot. An m = 1 frequency below 10 Hz can coexist with
higher in-band branches of the same angular family, so the absence of plotted
m = 1 points is not evidence of complete angular coverage. No modes above n = 20 are
searched, and the five-trial axial space cannot represent every high-frequency
shell mode.

For each wet eigenvector, the mode-dependent added-mass ratio is

\[
\mu_j=\frac{\phi_j^T M_A\phi_j}{\phi_j^T M_{\rm dry}\phi_j}.
\]

The density-scaled added-mass matrix enters every retained mass-only or combined eigenproblem;
there is no 100 Hz frequency gate. A small ratio indicates little added liquid
inertia for that particular shape, rather than an extractor-frequency cutoff.
The angular wavelength is \(\lambda_\theta=\pi D/n\), approximately 2.20 m at
n = 12 for this tank. This length alone does not establish a suitable cutoff.

The pressure-only case solves \((K_s+K_G)\phi=\omega^2M_s\phi\), omitting fluid
added mass and giving μ = 0. Fill, liquid density and axial acceleration still
affect its geometric stiffness through the hydrostatic pressure field. It
does not apply the condensed/rigid surface treatment or full-liquid volume
constraint and keeps all five structural directions at complete fill. The
fluid-basis refinement button is not applicable to this case and is hidden.

Partial-fill n = 0–3 uses the original retained-surface condensation. No
additional slosh coordinates are introduced for n ≥ 4: these animated and diagnostic blocks
use the **rigid-surface approximation**, not a complete pressure-release boundary
condition. Empty fill has zero fluid added mass. At complete fill, the n = 0
zero-volume-change constraint removes one structural direction. Thus the
diagnostic remains useful for showing angular coverage and modal inertia, but
cannot certify the user's FEM or full-band convergence.

The selected-family fill plot shows only m = 1 at 5% volume samples with the exact operating
fill inserted. Families n = 0–4 retain the established canonical 1% fill grid
and refinement across all five branches. Families n = 5–20 use a canonical 5%
seed grid, adaptively refined for the inspected m = 1 branch. The main
animation's all-branch tracker retains its canonical 1% grid through n = 12.
The upper plot requests this same tracked branch at the current fill, rather
than rematching independently to the original dry shape.
Adjacent matching uses the mean total kinetic mass metric at fixed topology
and the dry structural metric when a full-tank constraint changes dimension,
with one-to-one assignment across all five solved eigenvectors. Adaptive
bisection refines steps where the inspected branch (or any branch for n = 0–4) has MAC below 99.5%, with
the same bounded minimum step and refinement depth as the main
animated fill plot. Accepted correspondences below 90% MAC or numerical
degeneracy are flagged and the affected plot connection is broken. Inserting
a current-fill point does not change the canonical branch assignment at other
samples.

High-order potential products require additional radial integration points.
The animated and diagnostic blocks increase Gauss quadrature with n and radial basis order while
preserving the original low-order integration. For blocks above
n = 4, fluid inertia is assembled as a Cholesky energy Gram matrix to avoid
the roundoff and asymmetry of explicit inverse multiplication. Failed numerical
blocks are marked unavailable and coverage is reported incomplete; they are
never treated as evidence of no in-band modes. An optional fixed-n fluid-basis
check compares 4×8 and 5×10 potential trial spaces at the exact current fill,
separately reporting frequency and modal-inertia sensitivity and solve quality
across all five solved branches; its scope is stated separately from the
single-branch plots.
This is not angular-cutoff convergence or a structural-basis refinement.
Radial quadrature refinement addresses polynomial integration, not axial/dome
discretization or basis convergence. Algebraic residuals alone do not establish
discretization accuracy. A useful FEM audit
checks higher-n in-band families, refines the meridional/potential space, and
assesses liquid acoustic interaction separately. An incompressible potential
model continues to apply added mass at high frequency but does not contain
compressible liquid acoustic modes.

The tests exercise geometry/fill inversion, gauge pressure and total effective acceleration, empty/full tank limits, volume constraint, density scaling, gravity-slosh √a scaling, degeneracy, angular orthogonality, coupled eigen residuals, positive energy fractions, common displacement scale and phase, and an independent volume integration of the displayed liquid kinetic energy.

The **actual numerical potential-flow reduction** is benchmarked against cylindrical gravity slosh at depths 2 and 12 m for n = 0–3. The 4×8 potential basis agrees with the analytic cylinder frequencies within 0.015%. This is a meaningful fluid-reduction benchmark, not a comparison of a closed-form helper against itself.

At the nominal 85% LOX / 31 psig / 2g case:

| Family n | Dry lowest mode, Hz | Five → seven shell trials | 4×8 → 5×10 potential: combined lowest mode | Rigid-wall slosh potential refinement |
| -------: | ------------------: | ------------------------: | -----------------------------------------: | ------------------------------------: |
|        0 |             202.933 |                  0.00052% |                                   0.00021% |                               0.0161% |
|        1 |             102.056 |                    11.94% |                                   0.00174% |                             0.000014% |
|        2 |              34.883 |                   0.0310% |                                   0.00101% |                              0.00168% |
|        3 |              24.547 |                    13.80% |                                   0.00142% |                               0.0188% |
|        4 |              17.331 |                    12.65% |                                   0.00028% |                                     — |

These refinement differences establish the scope of numerical evidence. The lowest n = 2 structural example is stable to the tested refinement, but n = 1/3/4 families are substantially sensitive to the structural truncation. There is **no general claim that all displayed shell modes are converged**, even when the algebraic eigen residual is small.

For the default lowest n = 2 comparison, the model estimates approximately 34.883 Hz dry, 3.503 Hz with mass, 38.208 Hz with barrel prestress, 3.838 Hz with both and 3.841 Hz with retained slosh. These numbers explain competing mechanisms; they have not been correlated with a tank FE model or test.

Near-full top-dome fill is harder for the fixed potential basis because the free surface shrinks. At 95% volume fill the largest tested slosh refinement is about 0.18%; at 99% it is about 1.63% for n = 3 and 0.96% for n = 0. Shallow bottom-dome fill also differs from the cylinder benchmark geometry. The UI reports these domain/truncation limits. Higher radial fluid orders, gas/liquid compressibility, thermal-property changes, damping, insulation/stiffeners, physical modal correlation and a fully equilibrated static FE tangent remain additional work.

## Primary references

- [Housner, Herr & Sewall, NASA TP-1558 (1980), _Hydroelastic Vibration Analysis of Partially Liquid-Filled Shells Using a Series Representation of the Liquid_](https://ntrs.nasa.gov/api/citations/19800011283/downloads/19800011283.pdf): potential-flow wall continuity, gravitational stiffness, apparent fluid mass and pressure/longitudinal-acceleration prestress. Printed pages 5–8, 13–18.
- [Kuznetsov & Motygin, _Sloshing in a Vertical Cylinder with a Vertical Baffle_ (2021), cylinder-without-baffle discussion](https://arxiv.org/html/2107.09501): derivative Bessel roots, circular eigenfunctions, frequency ordering and double multiplicities. Section 3.1.
- [NIST Digital Library of Mathematical Functions, §10.21](https://dlmf.nist.gov/10.21): Bessel zeros and derivative-zero notation. Here “first root” always means first strictly positive root; the n = 0 zero/constant mode is excluded.
- [Cooper, NASA TN D-3831 (1967)](https://ntrs.nasa.gov/api/citations/19670009308/downloads/19670009308.pdf): infinitesimal vibrations about a prestressed shell equilibrium. Printed pages 9–12.
- [NASA cryogenic-propellant density reference](https://ntrs.nasa.gov/api/citations/19950006283/downloads/19950006283.pdf): representative normal-boiling-point liquid hydrogen and liquid oxygen densities, rounded here to 70.8 and 1140 kg/m³.
- [Brown & DeLessio, NASA (2020), _Test-Analysis Modal Correlation of Rocket Engine Structures in Liquid Hydrogen—Phase II_](https://ntrs.nasa.gov/api/citations/20200001729/downloads/20200001729.pdf): structural–acoustic interaction in a compressible liquid; this is evidence for an omitted mechanism, not validation of this tank model.
