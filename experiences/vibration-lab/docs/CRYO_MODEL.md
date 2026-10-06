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

Five axial trial functions are retained for each represented circumferential family n = 0–4. Cosine and sine shell partners are retained for n = 1–3; n = 4 uses one representative orientation. This gives 40 structural coordinates. The UI exposes the first three matched elastic branches of each family.

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

This is a **seven-coordinate condensation**, not the complete exact pressure-release free-surface operator. Angular blocks without a retained surface coordinate, including n = 4, retain the rigid-surface approximation. The same condensed surface motion is used in their visualization; the coupled case uses its solved η. Fluid arrows come from the gradient of the same Galerkin potential used for kinetic energy.

Mode labels are assigned by maximizing common dry-structural-mass MAC across the candidates within an angular block. Shell comparisons share the phase of their dry reference. A small MAC signals a poor branch correspondence; frequency ordering alone is not a mode identity. At complete fill, the incompressible sealed fluid imposes zero wall-volume change, eliminating one n = 0 direction. Matching then considers any subset of dry references; an eliminated branch is left unavailable. Empty and completely full tanks have no free-surface coordinates.

“Structural kinetic energy” and “fluid kinetic energy” sum to 100%. Fluid energy includes shell/surface cross terms; it is not a pure slosh-coordinate participation percentage. A single visual scale is applied to shell, surface and liquid displacement to preserve their relative amplitudes. Playback is slowed and deformation amplified.

## Numerical evidence and practical limits

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
