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
p(z)=p_u+\rho_\ell a_{\rm eff}\max(h-z,0).
\]

Ullage pressure raises the entire profile. Acceleration changes the slope in the wetted portion. The default LOX liquid-head contribution is 308.333 kPa at the bottom, giving 522.070 kPa total differential pressure. There is no extra implicit 1 g. The incremental ullage pressure is maintained constant: a sealed gas-volume/compression spring is **omitted**, which matters especially for axisymmetric breathing.

## Structural Ritz space

Five axial trial functions are retained for each represented circumferential family n = 0–12. Cosine and sine shell partners are retained for n = 1–3; n = 4–12 uses one representative cosine orientation. This gives 80 structural coordinates. The default partial-fill coupled system adds 32 surface coordinates: two radial shapes per represented angular orientation through n = 12. The controls allow n = 3, 6 or 12 and one to four radial shapes. The inspector and animation expose the first three tracked elastic branches of every family through n = 12. The four lowest names remain breathing (n = 0), bending (n = 1), ovalization (n = 2) and three-lobe (n = 3); higher families use their lobe count.

For each axial polynomial Pⱼ(2z/H−1), a smooth envelope F(z) = sin²(πz/H)Pⱼ is used. Cylindrical displacement components have radial amplitude R(z)F(z)/R, near-inextensional hoop amplitude −uᵣ/n, and an axial amplitude −R(z)²F′/(Rn²) for n > 0. The n = 0 coordinates represent radial breathing without an independent axial relaxation coordinate.

The displacement field is evaluated on the barrel and both domes. Linear membrane strain follows the first variation of the surface metric; bending strain follows the first variation of surface curvature. Isotropic membrane and bending energy is integrated on the actual surface with thickness t, membrane modulus Et/(1−ν²), and bending modulus Et³/[12(1−ν²)]. The structural mass follows the same physical surface displacement field.

This basis has no externally applied modal supports. Nevertheless, its taper fixes the pole displacements and imposes selected barrel kinematics. It is a **restricted elastic approximation**, not the complete unconstrained free-free shell space. Rigid translations and rotations are outside the retained coordinates. Dome-local modes, independent tangential/axial modes and general n = 0/1 shell behavior need a richer structural basis or actual FE matrices.

## Pressure-induced geometric stiffness

The pressure comparison uses the barrel initial-stress energy with prescribed tensile membrane resultants

\[
N_\theta(z)=p(z)R,\qquad N_z(z)=p(z)R/2.
\]

The latter is **not inferred as the axial stress of an arbitrary flight tank under hydrostatic pressure**. The chosen static surrogate balances the pressure-head resultant using a distributed axial reaction over the wetted barrel, together with the closed-end pressure resultants. Its axial force per unit barrel length is ρaπR², which balances d(2πRN_z)/dz = −ρaπR². No modal support constraint is introduced by this bookkeeping choice. The corresponding attachment/load path, shell inertia stress and dome stress field have not been solved.

The barrel geometric stiffness is integrated from N_z and N_θ times the axial and circumferential displacement-gradient products. Both pressure contributions enter that integration. Dome prestress and the pressure **follower-load tangent** are omitted. This is therefore a barrel initial-stress surrogate, not the full linearization about the loaded equilibrium of a pressurized free-free closed tank. In particular, structural initial-stress stiffness alone does not guarantee preservation of rigid rotation modes; those coordinates are excluded from this educational reduction.

## One fluid energy model

Liquid is incompressible, inviscid and irrotational. Its potential is expanded in regular circumferential functions and polynomial radial/axial functions on the actual domed liquid domain:

\[
\psi_i=(r/R)^{n+2j}P_l(2z/h-1)\{\cos n\theta,\sin n\theta\}.
\]

One retained radial surface shape uses the established 4×8 potential space. Two, three and four shapes use 6×12, 7×16 and 8×20 potential spaces respectively. The constant n = 0 potential is removed. Expanded spaces replace radial monomials by regular rⁿ times shifted Jacobi polynomials, spanning the same polynomial space with improved conditioning. In shallow bottom-dome fill, the radius scale is the largest wetted radius and the axial Jacobi weight accounts for high-order localization; outside it the axial polynomials are Legendre. The larger weak-operator assembly factors radial and axial products using the same Gauss points. This changes computational cost, rather than the integration rule. A pivoted factorization of the diagonally normalized weak operator discards trial directions when the remaining normalized energy pivot is below 10⁻¹⁰. The retained trial subspace is solved without an artificial stiffness diagonal; the convergence inspector reports its resolved rank and trial count. Angular orthogonality is integrated analytically; no coupling is introduced between different n or between cosine/sine partners.

The weak Laplace operator and wall/free-surface flux matrices are

\[
L_{ij}=\int_{\Omega_\ell}\nabla\psi_i\cdot\nabla\psi_j\,dV,
\qquad
B_{i\alpha}=\int_{\partial\Omega_\ell}\psi_i\,v_{n,\alpha}\,dS.
\]

For the tank wall, the flux uses its full cylindrical displacement components: R(z)[uᵣ−R′(z)u_z]dz dθ. On the free surface it uses the retained elevation coordinates. A shell-induced **uniform mean surface motion** compensates the wall volume change for n = 0, preserving liquid volume. The potential coefficients satisfy Lc = Bq̇.

One shared liquid kinetic-energy matrix follows:

\[
M_f=\rho_\ell B^T L^{-1}B.
\]

This symmetric nonlocal operator retains off-diagonal coupling. It does not assign all liquid mass uniformly to the wetted wall. Wall and surface motion share the same fluid matrix; adding independent slosh oscillators to an already complete liquid mass matrix would double-count inertia.

## Angular families and radial surface shapes

The surface trial functions are

\[
\eta_{n,p}=J_n(\beta_{n,p}r/R_{\rm surface})\{\cos n\theta,\sin n\theta\},\qquad J'_n(\beta_{n,p})=0.
\]

The first four **strictly positive** derivative roots are tabulated for n = 0–20. Main animation and convergence controls cover the shell families n = 0–12; the boundary/Fourier diagnostics can use the extended catalog through n = 20. The constant axisymmetric shape is excluded. All n = 0 shapes have zero area mean; shell-induced mean surface motion enforces volume conservation separately. For n = 1–3 the main model retains both lateral orientations. Higher n uses one cosine representative, matching the structural space; its sine partner is degenerate in this axisymmetric geometry and is not an additional computed coordinate.

The default is two radial shapes through n = 12: **32 active surface coordinates**. Selecting four gives 64; selecting n ≤ 3 and one shape reproduces the original seven-coordinate baseline. Original coordinate IDs 1–7 remain stable:

| IDs | n | First strictly positive J′ₙ root | Directions |
| --- | --: | ---: | --- |
| 1–2 | 1 | 1.84118378134 | cosine / sine |
| 3–4 | 2 | 3.05423692823 | cosine / sine |
| 5 | 0 | 3.83170597021 | axisymmetric |
| 6–7 | 3 | 4.20118894121 | cosine / sine |

Each additional radial shape adds an independent elevation coordinate, kinetic coupling and gravitational stiffness. The rigid-wall surface modes are eigenvectors of the complete within-family surface mass and gravity matrices; individual Bessel trial shapes need not be eigenvectors of the actual domed liquid. These are generated Ritz coordinates, not imported FE eigenvectors. Stable vector slots preserve coordinate identity when cutoffs change; the number of allocated slots can exceed the active coordinate count. Bessel values at larger arguments use the integer-order integral representation in NIST DLMF §10.9 rather than a cancellation-prone power series.

For an actual flat-bottom rigid cylinder, the benchmark is

\[
f=\frac{1}{2\pi}\sqrt{a k\tanh(kh)},\qquad k=\beta/R.
\]

Density cancels in this rigid-wall gravity-only result. LOX and LH₂ can therefore have similar gravity-slosh frequencies at fixed geometry and acceleration while generating very different shell added inertia and pressure head. The lab's domed-domain rigid-wall values come from its potential-flow energy calculation, not by applying a frequency multiplier to this formula.

The free-surface gravitational stiffness is

\[
K_g=\rho_\ell a\int_{A_s}\eta_\alpha\eta_\beta\,dA.
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
\begin{bmatrix}K_{\rm dry}+K_G&0\\0&0\end{bmatrix}+K_g
\quad\text{and}\quad
\begin{bmatrix}M_{\rm dry}&0\\0&0\end{bmatrix}+M_f
\]

form the generalized eigenproblem. Zero off-block entries here do not remove coupling: M_f contains shell/surface cross terms, and K_g contains any mean-surface contributions.

The mass comparisons condense the retained free-surface coordinates in the zero-gravity/high-frequency limit:

\[
M_A=M_{ss}-M_{sf}M_{ff}^{-1}M_{fs},\qquad
\eta=-M_{ff}^{-1}M_{fs}q_s.
\]

This is a **finite-coordinate condensation**, rather than the complete exact pressure-release operator. Every selected angular family uses all its retained radial surface shapes in the Schur complement. Orders above the selected surface cutoff retain the constrained-surface approximation; their coupled and combined eigenproblems coincide. The default now includes the animated n = 4–12 families. The condensed surface motion is used in the mass/combined visualization; the coupled case uses its solved η. Fluid arrows come from the same Galerkin potential as the kinetic energy.

### Surface convergence across fill

The **Surface convergence** analysis compares one, two and three radial shapes with a four-shape reference, for every selected angular family. Its 17 volume-fill samples are 0, 1, 2.5, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 97.5, 99 and 100%. Empty/full samples have no surface coordinates. Controls set the maximum angular order, first one/three/all five dry-shell branches, upper frequency, and frequency tolerance. The current operating fill does not change this fixed sample grid; liquid, ullage pressure and acceleration do.

A common 8×20 potential space isolates surface-shape truncation. Coupled reference modes are assigned one-to-one to padded dry-shell and rigid-wall surface eigenvectors by complete kinetic-energy MAC, matching the main coupled solver. Using only the normalized small wall displacement of a surface wave could otherwise steal a shell identity. Targets include the requested shell identities in the band plus the lowest surface-labelled branch when gravitational stiffness is present. Coarse vectors are padded into the reference coordinate space and matched one-to-one by complete kinetic-energy MAC; equal eigenvalue ranks are not assumed to have the same identity. This is comparison between basis sizes at each fill, distinct from continuation through fill.

A supported minimum requires all targets to be present, MAC ≥0.90, unambiguous reference eigenvalues, relative eigen residual <10⁻⁵, frequency change within the selected tolerance, and liquid/shell kinetic-ratio change ≤0.05 × max(1, |reference ratio|) for shell targets. A separate 9×22 potential calculation must match those targets reliably and satisfy the frequency tolerance. Thus a small algebraic residual cannot hide liquid-potential sensitivity. The inspector reports frequency error, energy-ratio error, MAC, correspondence, potential frequency sensitivity and resolved potential rank.

Cells show the minimum supported count from one to three, **!** for unresolved, or **—** when no surface exists. Excluded angular families have dashed borders; amber borders identify samples requiring more radial shapes than the active basis. A uniform count can be applied only if every partial-fill sample passes. Four shapes are a **reference cap**, never a demonstrated converged count. Unresolved cells can reflect radial truncation, potential-space sensitivity, missing targets or ambiguous correspondence; the inspector preserves that evidence. A sampled grid does not prove convergence at intervening fills, and changing angular cutoff cannot test convergence of an already retained orthogonal block. Shell-basis refinement and physical correlation remain separate work.

### Explicit surface boundary comparison

The **Surface boundary** analysis is a separate diagnostic for n = 0–20. It
re-solves the full five-trial shell eigenproblem at the selected operating
point, using either dry stiffness or the same barrel pressure-prestress
approximation. The scene, original comparisons, fill continuation and Fourier
coverage use the selected angular/radial retained-surface model. The three
diagnostic boundaries are:

| Boundary                | Partial-fill condition              | Inertia treatment                                                                                                       |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Current reduced surface | Selected finite surface reduction | All selected radial shapes in this angular block are condensed; orders above the selected cutoff have no retained shape |
| Constrained surface     | Zero normal velocity at the top     | Surface coordinates are omitted; n = 0 requires zero wall-volume flux                                                   |
| Pressure release        | Zero velocity potential at the top  | A mixed Dirichlet/Neumann weak Laplace solve allows implicit surface motion, without retained gravity-slosh coordinates |

For harmonic motion with gravity-wave dynamics and incremental gas pressure
omitted, zero potential at the surface gives zero incremental fluid pressure.
This is a high-frequency approximation, not the finite-frequency gravity-slosh
boundary. Polynomial potentials are multiplied by (1 − z/h), which enforces the
top boundary exactly. One axial direction per radial order is removed so that
the constrained and pressure-release calculations have the **same maximum
polynomial degree**. This nesting preserves the kinetic-energy ordering of
the two boundary models. The bottom/wetted-wall boundary remains natural in
the weak form; the wall flux uses the same shell displacements and actual
domed geometry as the original model. Pressure release permits volume-
conserving surface motion without imposing a prescribed surface profile.

At partial fill, the constrained n = 0 model removes one shell direction,
because a sealed rigid top cannot accommodate net wall-volume change. The
current and pressure-release models allow the surface to compensate that
change. Empty fill has no fluid inertia. Complete fill has no free surface;
all three models use the same closed-liquid operator and n = 0 volume
constraint. A failed numerical row is unavailable, never interpreted as zero
added mass.

The cards show the lowest elastic eigenfrequency of each reduced model and
its actual wet-vector added-mass ratio. The expandable table shows all sorted
eigenfrequencies. Equal eigenvalue rank **does not imply a common tracked
mode**, particularly when a constraint changes dimension. The optional fluid
refinement adds one radial and two axial potential orders to the current space and checks the lowest eigenfrequency in each row; it
does not establish mode identity or structural convergence. It also does not
alter the animated eigenvector.

### Independent cylinder added-mass benchmark

The numerical benchmark calls the **same fluid matrix assembly** as the tank
diagnostic, with a flat cylinder and prescribed wall motion in place of the
shell trial shapes. Its analytical reference is obtained from exact harmonic
potentials, independently of the polynomial trial matrices and quadrature.
Radius is R = 4.2 m; depths are 2 and 12 m; density follows the selected
liquid. The UI shows n = 1; tests also cover n = 2, 4, 12 and 20.

Let normal wall velocity be q̇ w(z) cos(nθ), with n ≥ 1. The generalized added
mass is defined by T = ½ Mₐ q̇². For a harmonic potential Ψ, Green's identity
gives Mₐ = ρ ∫wall Ψ w(z) cos(nθ) dS, since the bottom has zero normal flux
and the top has either zero flux or zero potential.

1. **Rigid lid, w(z) = 1.** The exact potential is
   Ψ = (R/n)(r/R)ⁿ cos(nθ), giving Mₐ = ρπR²h/n. At n = 1 the entire liquid
   translates laterally, so added mass equals the total liquid mass.
2. **Pressure release, w(z) = cos(kz), k = π/(2h).** The exact potential is
   Ψ = Iₙ(kr) cos(kz) cos(nθ) / [k I′ₙ(kR)]. It is regular at r = 0, satisfies
   Laplace's equation, has zero bottom flux, vanishes at z = h, and has the
   prescribed wall-normal derivative. Integration gives
   Mₐ = ρπRh Iₙ(kR) / [2k I′ₙ(kR)].

These two checks prescribe **different wall patterns**. Their mass difference
cannot isolate a boundary effect; the tank diagnostic uses a common wall trial
space for that comparison. The modified-Bessel reference uses its independent
power series and derivative recurrence from NIST DLMF §§10.25 and 10.29. This
is a check of incompressible cylinder added inertia, not validation of domed
tank frequencies, prestress, a DCI-HYDRO implementation, or physical test
correlation.

The DCI-HYDRO Theoretical Manual v1.0 (DCI-TR-2010-1033-01, September 2010,
§§2.3–3.2) derives liquid kinetic-energy mass and gravitational surface
stiffness separately, and describes omitting relative slosh coordinates while
retaining its transformed wall-mass block. This is not the same operation as
our retained-space high-frequency surface condensation. The diagnostic is
labelled by its physical boundary conditions rather than claiming a DCI
compatibility mode. Structural pressure prestress remains a separate supplied
or approximated stiffness contribution; thermal property changes remain
excluded.

Shell labels are anchored to dry references and continued through small fill increments within each angular block, using MAC and one-to-one assignment. The empty-tank seed includes the selected ullage pressure and is mapped to the dry shell with the dry structural mass metric. At fixed topology, successive states use the mean of their total kinetic mass matrices; the coupled case includes all retained surface coordinates. Expanded blocks use rigid-wall surface eigenvectors as surface identity references; radial identity follows that reference rank within its angular block. At surface opening/closing or a change in dimension, matching uses the shared structural coordinates with the dry mass metric. A liquid-heavy shell mode is not penalized for its small structural kinetic-energy fraction. Independently matching every fill to the original dry shape can jump between distinct eigenvectors as shapes evolve; that comparison is no longer used to define branch identity. Frequencies, eigen residuals and modal energy fractions remain outputs of the unchanged generalized eigenproblem, with no smoothing of eigenvalues.

The canonical continuation grid uses 1% volume-fill increments, with adaptive bisection when an adjacent assignment has MAC below 99.5%. Refinement is bounded by a minimum fill step of 0.001 percentage point and twelve bisection levels. An accepted path containing MAC below 90% or a numerically degenerate pair is flagged as uncertain. The path starts from empty fill at fixed liquid, ullage and acceleration, so jumping the slider directly to a fill gives the same result as reaching it incrementally. Changing another operating parameter creates a new fill path; the demo does not track a multidimensional parameter path.

Tracking is resolved lazily by `findMode` for the inspected angular block, with bounded operating-point caches. The UI warms the five comparison histories one canonical fill step per scheduled task, reports progress, and publishes tracked results only when the selected block is ready. Changing settings or angular family cancels that preparation. `solve` first returns the actual spectrum with provisional pointwise labels. Programmatic callers that enumerate an entire case should call `resolveCaseModes` to resolve all of that case's identities. This keeps slider interaction responsive without changing the spectrum.

The UI separates **fill-step MAC** (overlap with the preceding continuation state) from **dry-shape overlap** (overlap with the original reference). A shape can evolve far from its dry reference while remaining continuously tracked. Uncertain continuation is flagged, and the fill plot breaks rather than joining an uncertain correspondence. Each current-fill plot marker uses the exact same eigenvector as the numerical readout and 3D scene.

At complete fill, the incompressible sealed fluid imposes zero wall-volume change, eliminating one n = 0 direction. An eliminated branch is left unavailable. The user's selection remains on that branch with no frequency or modal animation, rather than silently switching to another eigenvector. Empty and completely full tanks have no free-surface coordinates.

“Structural kinetic energy” and “fluid kinetic energy” sum to 100%. Fluid energy includes shell/surface cross terms; it is not a pure slosh-coordinate participation percentage. A single visual scale is applied to shell, surface and liquid displacement to preserve their relative amplitudes. Playback is slowed and deformation amplified.

The shell mesh retains 96 circumferential segments, giving eight samples per angular wavelength at n = 12. Fluid-arrow sampling increases for n ≥ 4 to more than 2(n + 1) angles, avoiding the repeated-phase alias of the previous four fixed angular locations. The high-order radial sample rings are at 0.65 and 0.92 of the local tank radius because the potential motion concentrates near the wetted wall. This changes only visual sampling, not the fluid matrix, modal amplitudes or calculated frequencies.

## Numerical evidence and practical limits

### Fourier coverage across a fill sweep

The **Fourier coverage** analysis is an additional diagnostic, separate from the
n = 0–12 animation and its configurable coupled solve. It evaluates the same
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

Partial-fill families through the selected surface cutoff use all retained radial shapes in the surface condensation. Higher angular orders use the **constrained-surface approximation**. Neither a finite surface reduction nor a constrained surface establishes the complete pressure-release operator. Empty fill has zero fluid added mass. At complete fill, the n = 0
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
n = 4 or with multiple radial surface shapes, fluid inertia is assembled as a Cholesky energy Gram matrix to avoid
the roundoff and asymmetry of explicit inverse multiplication. Failed numerical
blocks are marked unavailable and coverage is reported incomplete; they are
never treated as evidence of no in-band modes. An optional fixed-n fluid-basis
check adds one radial and two axial potential orders to the current space at the exact current fill (4×8 → 5×10 for the original single-shape basis, 6×12 → 7×14 for the default two-shape basis),
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

The **actual numerical potential-flow reduction** is benchmarked against cylindrical gravity slosh at depths 2 and 12 m for n = 0–3. The original 4×8 single-surface-shape calculation agrees with the analytic cylinder frequencies within 0.015%. The expanded four-wave benchmark exercises the actual surface mass/gravity matrices for n = 0, 1, 4 and 12 at both depths against the corresponding analytic roots, with a 2.5% bound across those tests. Higher waves, especially high n at large depth, are harder for the finite polynomial potential space; this benchmark does not establish domed-domain convergence. This is a meaningful fluid-reduction benchmark, not a comparison of a closed-form helper against itself.

The following historical refinement table uses `LEGACY_DEFAULT`: the original seven-coordinate basis at 85% LOX / 31 psig / 2g. It remains a regression baseline, rather than numerical evidence for the expanded default:

| Family n | Dry lowest mode, Hz | Five → seven shell trials | 4×8 → 5×10 potential: combined lowest mode | Rigid-wall slosh potential refinement |
| -------: | ------------------: | ------------------------: | -----------------------------------------: | ------------------------------------: |
|        0 |             202.933 |                  0.00052% |                                   0.00021% |                               0.0161% |
|        1 |             102.056 |                    11.94% |                                   0.00174% |                             0.000014% |
|        2 |              34.883 |                   0.0310% |                                   0.00101% |                              0.00168% |
|        3 |              24.547 |                    13.80% |                                   0.00142% |                               0.0188% |
|        4 |              17.331 |                    12.65% |                                   0.00028% |                                     — |

These refinement differences establish the scope of numerical evidence. The lowest n = 2 structural example is stable to the tested refinement, but n = 1/3/4 families are substantially sensitive to the structural truncation. There is **no general claim that all displayed shell modes are converged**, even when the algebraic eigen residual is small.

For that historical lowest n = 2 comparison, the model estimates approximately 34.883 Hz dry, 3.503 Hz with mass, 38.208 Hz with barrel prestress, 3.838 Hz with both and 3.841 Hz with retained slosh. These numbers explain competing mechanisms; they have not been correlated with a tank FE model or test.

Near-full top-dome fill is harder for the fixed potential basis because the free surface shrinks. At 95% volume fill the largest tested slosh refinement is about 0.18%; at 99% it is about 1.63% for n = 3 and 0.96% for n = 0. Shallow bottom-dome fill also differs from the cylinder benchmark geometry. The expanded basis and fill-range check expose these domain/truncation limits. Still higher radial fluid orders, gas/liquid compressibility, thermal-property changes, damping, insulation/stiffeners, physical modal correlation and a fully equilibrated static FE tangent remain additional work.

## Primary references

- [Housner, Herr & Sewall, NASA TP-1558 (1980), _Hydroelastic Vibration Analysis of Partially Liquid-Filled Shells Using a Series Representation of the Liquid_](https://ntrs.nasa.gov/api/citations/19800011283/downloads/19800011283.pdf): potential-flow wall continuity, gravitational stiffness, apparent fluid mass and pressure/longitudinal-acceleration prestress. Printed pages 5–8, 13–18.
- [Kuznetsov & Motygin, _Sloshing in a Vertical Cylinder with a Vertical Baffle_ (2021), cylinder-without-baffle discussion](https://arxiv.org/html/2107.09501): derivative Bessel roots, circular eigenfunctions, frequency ordering and double multiplicities. Section 3.1.
- [NIST DLMF §10.9](https://dlmf.nist.gov/10.9#E2): integer-order Bessel integral used for stable evaluation at the larger radial roots.
- [NIST Digital Library of Mathematical Functions, §10.21](https://dlmf.nist.gov/10.21): Bessel zeros and derivative-zero notation. Here “first root” always means first strictly positive root; the n = 0 zero/constant mode is excluded.
- [NIST DLMF §10.25](https://dlmf.nist.gov/10.25) and [§10.29](https://dlmf.nist.gov/10.29): modified-Bessel equation, independent power-series definition and derivative recurrence for the exact pressure-release added-mass benchmark. The benchmark mass formula is derived above from the exact potential, rather than quoted from these references.
- [Cooper, NASA TN D-3831 (1967)](https://ntrs.nasa.gov/api/citations/19670009308/downloads/19670009308.pdf): infinitesimal vibrations about a prestressed shell equilibrium. Printed pages 9–12.
- [NASA cryogenic-propellant density reference](https://ntrs.nasa.gov/api/citations/19950006283/downloads/19950006283.pdf): representative normal-boiling-point liquid hydrogen and liquid oxygen densities, rounded here to 70.8 and 1140 kg/m³.
- [Brown & DeLessio, NASA (2020), _Test-Analysis Modal Correlation of Rocket Engine Structures in Liquid Hydrogen—Phase II_](https://ntrs.nasa.gov/api/citations/20200001729/downloads/20200001729.pdf): structural–acoustic interaction in a compressible liquid; this is evidence for an omitted mechanism, not validation of this tank model.
