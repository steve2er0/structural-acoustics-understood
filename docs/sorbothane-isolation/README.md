# Sorbothane 6-DOF Isolation Designer

## Interface audit — 2026-10-23

The designer now follows **Setup & checks → Isolator → Modes →
Transmissibility → Design Explorer → Validation**. Component, CG, support
geometry, preload, and material inputs remain in the sidebar. On narrow screens,
**Show setup inputs** opens the controls without burying the results.

**Design requirements**, above the workspace, is the only criteria editor.
It controls the current design, catalog search, and 7 × 7 matrix together.
The sidebar and explorer link back to it. Tone criteria can still be added,
edited, or removed. Modal bounds constrain the translation-dominated modes;
the separate resonance search band defines where peak transmissibility is checked.

Audit findings and repairs:

- Literal foreground colors and incomplete light-theme surfaces made mode
  frequencies, labels, badges, and validation readouts hard to read. Semantic
  foreground/surface tokens now cover both themes, including SVG labels and
  color-matched response legends. Small interface text has a 12 px baseline.
- The oversized introduction and duplicated criteria obscured the next action.
  The header is compact, criteria are centralized, and tabs support arrow keys,
  Home/End, selected state, and connected panels.
- Every input change previously ran a complete synchronous Monte Carlo analysis.
  Nominal results now appear first; seeded uncertainty runs cooperatively with
  sample progress. New edits cancel obsolete work, remove old bands immediately,
  and publish only the envelope belonging to the current solution. The async and
  synchronous paths share the same draws and percentile reduction.
- Selected mode, animation controls, open requirement editor, criteria focus,
  and active view survive normal rerenders. Display-unit changes reuse the
  physical solution rather than running a new Monte Carlo calculation.
- Site-wide Projects navigation, capture buttons, global context hydration,
  and artifact-event handlers are retired. Old workspace links lead to Tools.
  Existing project records are not purged; named isolation configurations,
  tool-local studies, baseline comparisons, and downloads remain supported.

Validation boundary: this is a usability and numerical-regression audit, not
hardware qualification. Catalog data, preload mechanics, modal classification,
transmissibility definitions, and the BDF model contract are unchanged.

Verification: 232 automated tests pass. Browser checks covered all six panels
in both themes, a 390 px layout, saved shaker-test loading, tone editing,
keyboard tabs, unit changes, paired-search progress/cancellation, and a 49-cell
sweep. Computed text/background checks found no sub-4.5:1 text in the sampled
baseline panels after repairs; a separate SVG-cell check found at least 4.71:1
for values and 10.96:1 for status badges in the exercised matrix. These focused
checks are not a full accessibility certification. The modular route and served
standalone were checked independently; browser consoles showed no errors.
Two consecutive standalone builds were byte-identical. Print behavior has an
automated CSS contract check, not a native print-dialog/PDF acceptance test.

This workbench designs and screens a four- or eight-leg, double-sided captured Sorbothane isolation system for a rigid aerospace component. It is available at `#/tool/sorbothane-isolation` in the modular site and in `standalone.html`.

This workbench is also the behavioral and visual reference for the reusable [Engineering Tool Design Guidelines](../engineering-tool-design-guidelines/README.md). The guidelines extract shared decision, interaction, evidence, trust, and responsive patterns without treating isolation-specific tabs or physics as universal requirements.

The baseline is a 25 lbm rectangular component, 13.5 in long (X), 7.2 in wide (Y), and 9 in tall (Z), with its CG at (0, 0, 4.5) in. Eight legs form two Y-directed rows on the ±X sides. The overall mount center-to-center footprint is 12 × 5.7 in, leaving 0.75 in edge insets on both axes. Mounts lie at X = ±6 in and Y = −2.85, −0.95, +0.95, +2.85 in, giving 1.9 in spacing within each row. The mount plane remains at Z = 0.

Each leg has one upper and one lower custom 50 Shore 00 annular element by default, with 1.25 in OD, 0.50 in ID, 0.25 in free thickness, and 15% nominal precompression. Isolator and acceptance-criteria defaults are unchanged; this baseline is not a claim that all requirements pass. The result is calculated from the implemented model; no mode frequency or target transmissibility is hard-coded. A fresh design and **Reset baseline** use these dimensions in both the modular site and rebuilt standalone file. Explicit browser-saved and imported settings retain their own geometry; updating the file does not overwrite an existing design.

## PSD displacement and clearance

Open **Displacement & clearance**. Paste or import 2–256 two-column breakpoints
(`frequency_hz,g2_per_hz`), enable the environment, select the detailed plot's input axis,
and apply. No demonstration PSD is assigned to a real design. The profile,
axis, peak factor, gaps and optional shared requirement are saved with the
configuration; legacy/saved baseline designs default to PSD disabled. Static
X/Y/additional-Z acceleration inputs remain separate from this random environment.

The input is a one-sided acceleration PSD in g²/Hz, coherent at every mount,
one axis per test. The comparison applies the same profile in three separate
X/Y/Z tests automatically; load different profiles when different axis
environments are required. Simultaneous-axis loading,
cross-spectral correlations, nonstationarity and non-Gaussian extremes are not
assumed. Positive PSD segments use log–log/power-law interpolation; segments
adjacent to zero use linear interpolation. No energy is extrapolated outside
the entered band, which is independent of the transmissibility display range.

The full six-DOF complex solution is used, not independently scaled mode cards:

```text
H_relative(point, f) = -(g0 / (2πf)²) B(point) qr(unit base displacement)
S_relative(point, f) = |H_relative|² S_base_g(f)       [m²/Hz]
σ_relative = sqrt(integral S_relative df)             [m RMS]
estimated one-sided peak = selected factor × σ_relative
```

`B(point)` includes translation and rocking about the CG. Complex base motion
must be subtracted before magnitudes are taken. Every response direction is
computed for the selected input axis, including cross-axis coupling. The CG,
all eight box corners and every mount are reported in inches/mils. A single
three-direction PSD chart can show any of these locations, with M1–M6 markers;
PSD peak frequencies are not independent modal RMS contributions.

Integration includes input breakpoints, 80 logarithmic samples/octave initially,
and points through ±3 modal bandwidths with 12 samples per bandwidth initially.
Grids are doubled until all non-negligible output RMS values change by less
than 0.5%, with up to three refinements and a 16,000-point limit. Nonconvergence
forces review. This is numerical refinement evidence, not a rigorous error bound.
The CSV preserves the input, frequency grid, nominal results and assumptions.
No displacement Monte Carlo uncertainty band is claimed.

The **Cumulative relative displacement** plot below the PSD accumulates
`sqrt(integral S_relative_displacement df)` from the lowest input frequency to
each plotted frequency. X/Y/Z response curves share a logarithmic frequency
axis and a linear displacement axis (inches). Each starts at zero at the first
breakpoint and ends at the location table's full-band RMS. Variances are
integrated before taking the square root; RMS increments are not added.
Steep rises show the frequency bands contributing most travel; plateaus add
little variance. M1–M6 markers locate resonances but are not independent modal
RMS contributions.

The existing **Plot location** selector updates both the PSD and cumulative
plots, including off-CG corners and each mount. **Plot scale** switches between
RMS and the configured peak-factor-times-RMS estimate; the latter is not a
guaranteed peak or a time history. Integration warnings remain visible. The
displacement CSV now also includes `cumulative_rms_in` and
`cumulative_factored_peak_in` on the same final integration grid. No new solve,
catalog criterion or additional PSD environment is introduced by this view.

### Pad compression for every excitation direction

The **Pad compression · X / Y / Z inputs** card shows upper- and lower-pad
minimum/maximum compression envelopes and the governing maximum-compression
leg for all three independent input tests. Values are **axial** compression,
including rocking caused by lateral inputs, not X/Y shear strain. The active
material-derived or manual-Q basis is explicitly shown.

Compression and box-clearance checks have separate status columns: a compression
PASS does not approve the surrounding gaps. REVIEW includes >20% compression,
predicted unloading (minimum ≤0%), existing static-model review flags or
nonconverged integration. These are nominal factor-times-RMS screens, not
material qualification, Monte Carlo bounds or guaranteed maxima. Unknown bonded
LORD pad compression is shown as unavailable, never as a compression PASS.

Expand **Every pad · compression for all three input directions** for a table
of each leg's upper and lower elements, counts, installed static compression
and X/Y/Z compression envelopes. **Download X/Y/Z pad compression CSV** exports
one row per pad and test input, preserving the PSD, peak factor, damping and
integration status. The engineering summary includes the direction comparison.

This display does **not** silently change the environment selection or shared
criteria: the detailed spectrum and optional current-design/matrix clearance requirement
still use the selected input axis. The comparison reuses that axis's full solve,
computes the two other cases and retains only compact per-pad summaries. Matrix
candidate evaluations do not pay for this display-only comparison.

### Catalog X/Y/Z flags (not exclusions)

With PSD enabled, catalog screening checks **every retained recommendation and
REVIEW result** in three independent X/Y/Z tests using the saved environment,
active material/manual-Q damping, peak factor, gaps, and 20% compression screen.
Each part/pair has a **PSD CLEAR / PSD REVIEW** disclosure with axis-specific
flags, maximum corner travel in all response directions, and maximum pad
compression. Travel excess, >20% compression, unloading, static-model review,
nonconverged integration and invalid inputs are explicit flags. Unset gaps or
unavailable LORD compression are not a PASS; disabled PSD is NOT CHECKED.

These new dynamic PSD flags **never exclude, reorder or disable a catalog
result**, even when the current-design/matrix clearance requirement is enabled.
Existing geometry, fit, static preload/compression, rated-load, mode, tone and
resonance screening are unchanged. “Passing” catalog results refer to those
non-PSD checks; inspect the separate PSD flag before selecting hardware. The
preferred stack per part/pair is still chosen by the existing non-PSD ranking,
not optimized for PSD clearance. Full comparison can be inspected after applying
any result.

For efficiency, the three-axis PSD review runs after the usual part/pair ranking
and checks retained results (all results available through the 25/50/100/All
selector), not every discarded stack trial. A dedicated progress stage and
Cancel cover this work. The screen keeps compact summaries, not extra spectra
for each result. Changing the display limit does not rerun the calculations.

Peak factors (default 3, editable 1–10) are screening assumptions for a stationary,
approximately Gaussian response. Neither 3σ nor 4σ guarantees a test maximum.
No duration-dependent extreme-value probability is inferred. See the primary
[COMSOL random-vibration discussion](https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_modeling.05.201.html)
for PSD/RMS and the distinction between RMS and peak response.

Enter each axis's **minimum one-sided box gap in either sign**, measured from
the installed, statically loaded position to base-fixed hardware. Zero means
not specified. The factored dynamic excursion is subtracted from that gap at
every box corner; gravity/precompression are not subtracted twice. These are
global axis-aligned box-gap checks, not arbitrary contact geometry, bolt-hole,
cable, sleeve, or body-to-body clearance checks. Manufacturing/installation
tolerances must already be reserved in the entered gap.

Opposed upper/lower stacks have the same local stack travel and opposite axial
compression changes. Identical elements within one series stack divide that
travel by their count. Mixed-assembly installed side compression comes from
its nonlinear static equilibrium. Uniform-pad static side compression uses the
existing equal payload-split inverse static curve (limited to 20%); unequal
upper/lower uniform stack counts or loads beyond that curve force review.
Minimum compression ≤0 or maximum >20% also forces review; 20% is a material
screening boundary, not an inferred hard-stop dimension or qualified dynamic
strain allowable. Bonded LORD mount travel is reported, but unknown compression
and contact limits are not invented. The model remains linear after predicting
a possible contact/unloading event; its post-contact response is not valid.

The optional **Require clearance** checkbox applies this same environment,
factor, gap and engagement/compression checks to the current design and 7×7 matrix
(`TRAVEL`) for the selected input axis. Without it, their PSD results are informational.
An enabled requirement with a missing/disabled/invalid environment cannot pass.
Catalog PSD checks remain all-axis advisory flags regardless of this checkbox;
narrow geometry filters first to shorten the additional integration stage.

With PSD enabled, the SOL 111 deck also includes all box-corner/mount/base output
grids and a PSD-resolved excitation frequency grid. It remains a **unit-g FRF
deck**, not a RANDPS random-response solve. Export a matching Browser comparison
CSV, run the solver separately, then fold complex displacement FRFs through the
PSD using:

```sh
python3 scripts/nastran-transmissibility.py solver.op2 \
  --browser-csv isolation-sol111-browser-reference.csv \
  --output transmissibility.csv --clearance-output clearance-comparison.csv
```

The converter computes `(U_point - U_base) / (A_base / 386.088582677)` in in/g,
then integrates the same PSD for RMS and factored peak. Browser CSV includes
the PSD, selected axis/factor, grid mapping and relative complex displacement
transfers. Only matching frequency grids are accepted; no silent interpolation.
The comparison is nominal, on that common grid; check solver modal/mesh and
frequency-grid convergence separately. Flexible plate motion/mass can make
solver results differ from the rigid-box browser prediction. Synthetic OP2
round-trip and full-deck parser tests do not constitute a solver run or test
correlation.

## Modal damping readouts

Each of the six mode cards shows effective Q, modal loss factor η, and equivalent
percent critical damping. Q is defined here as 1/η; percent critical damping
uses the solver's existing damping ratio, 100ζ ≈ 50η. Values are evaluated for
each mode at its calculated frequency, including the existing strain-energy
weighting for mixed assemblies. They are equivalent loss-factor-based estimates,
not measured decay damping or the peak transmissibility at a response location.
Zero modal loss is displayed as Q = ∞; very small nonzero values use scientific
notation rather than rounding to zero.

### Manual Q design assumption

In **Damping / effective Q**, choose **Manual effective Q** and enter a finite
positive Q (for example, 6). This sets a constant structural loss factor
η = 1/Q for all supports, axes, frequencies and modes. Q = 6 gives η = 0.1667
and equivalent critical damping ≈ 8.33%. It replaces the system's material-derived
loss, including any nominal loss-scale setting, but leaves storage stiffness,
static equilibrium and real natural frequencies unchanged. Manufacturer material
curves remain unchanged. This is a user engineering assumption, not measured
damping or a guarantee that peak transmissibility equals Q.

The response curves, tone/resonance requirements, catalog candidates, 7×7 matrix,
engineering summary and PBUSH GE export all use the same override. SOL 103 real
eigenvalues do not use PBUSH damping. The active basis is visible beside the
mode cards; **Edit damping / Q** opens the control. Configuration JSON and local
saved state retain the override. Older configurations default to **Material-derived**,
which restores the original damping model.

Monte Carlo loss-factor tolerance acts on η around the nominal 1/Q, so sampled Q
also varies. Set loss-factor tolerance to 0% to keep Q fixed across samples;
other tolerances still affect the response. Invalid Q inputs are rejected.

## NASTRAN correlation exports — SOL 103 and SOL 111

In **Validation**, the two BDF downloads share the current component, CG, four/eight
support coordinates and row direction, upper/lower stacks, per-leg mixed assemblies,
Sorbothane formulation or Parker LORD rates, manual-Q assumption, and plate settings.
The unit system is **in · lbf · s · slinch**, with `WTMASS=1.0`.
Real-valued fields are written as reals, integer IDs/coordinate-system fields as
integers. PBUSH GE continuation alignment is explicit. Signed manual products of
inertia are preserved in CONM2 (not converted to absolute values).

- **Download SOL 103 BDF:** CQUAD4/PSHELL plate, CBUSH/PBUSH isolators, CONM2 box and
  RBE3/RBE2 coupling. Isolator stiffness is frozen at the selected reference
  frequency. This is a real normal-modes calculation, not a damping or response
  calculation.
- **Download SOL 111 BDF:** three modal frequency-response subcases, 1=X, 2=Y,
  3=Z. SPCD + RLOAD2 (ACCE) + DLOAD apply **coherent 1 g = 386.088582677 in/s²** to
  every base grid in that subcase's direction. This is enforced base motion,
  not a force applied to the isolated mass. All ground DOFs remain in SPC1.
  FREQ samples follow the browser logarithmic grid, with additional modal and tone
  frequencies. Frequency-dependent PBUSHT K and GE tables contain actual stiffness
  and loss values at every excitation frequency. No TABDMP1/global damping is
  added on top of element GE. Q=6 therefore sets isolator GE=1/6 exactly once.
- **Browser comparison CSV:** nominal rigid-body complex Txx/Tyy/Tzz at exactly
  the SOL 111 excitation frequencies. The metadata records response/base grids,
  damping basis, mass accounting and coupling. This is explicitly browser data,
  not simulated NASTRAN output or uncertainty bands.

SOL 111 extracts **all modes through at least twice the highest response
frequency**, or the larger selected modal cutoff; the SOL 103 mode-count cap is
not used. `RESVEC=YES` requests residual augmentation. Raise the cutoff and refine
the plate mesh to check convergence. A finite modal basis and interpolated material
tables are not proof of exact direct-response equivalence.

Complex acceleration output is requested in OP2, F06 and PUNCH for CG GRID 9001,
all base grids (reference 8001), and the selected top corner (GRID 9002 when used).
A massless RBE2 offset to the box CG gives corner response the same translational
and rotational contributions as the browser response-point selection.

### Run and compare

1. Download the SOL 111 deck and browser comparison CSV from the **same settings**.
2. Run the BDF with your NASTRAN installation; retain its OP2 output. The web app
   prepares files but does not contain or execute a licensed NASTRAN solver.
3. Install the converter/parser dependency and optionally matplotlib:

   ```sh
   python3 -m pip install -r tests/requirements-nastran.txt
   python3 -m pip install matplotlib
   ```

4. Convert the solver output to ratios and a single three-direction plot:

   ```sh
   python3 scripts/nastran-transmissibility.py isolation-sol111.op2 \
     --browser-csv isolation-sol111-browser-reference.csv \
     --output nastran-transmissibility.csv --plot comparison.png
   ```

   Substitute the actual downloaded filenames. Response/base grid IDs are read
   from the browser CSV metadata; without a CSV, defaults are 9001/8001 and can
   be changed with `--response-grid` / `--base-grid`. The converter divides
   **complex response acceleration by complex base acceleration** in the same
   axis. Magnitude is dimensionless, dB is `20 log10(|T|)`, and phase is the ratio's
   phase. Raw acceleration in in/s² is not transmissibility. CSV comparison includes
   dB and wrapped phase differences; mismatched frequency grids are rejected rather
   than silently interpolated. Both CLI inputs must belong to the same exported
   configuration; matching grids alone cannot prove that configuration identity.

The NASTRAN model has a **flexible plate**, whereas the browser is rigid-body only.
By default, physical plate mass is added to the box mass. **Preserve browser mass**
removes plate density but does not remove plate flexibility. RBE2/RBE3 footprint
choices also affect correlation. Isolator Q=6 does not force every extra flexible-
plate mode to Q=6: its effective damping depends on how much strain energy is in
the damped isolators. Preload/contact validity, bushing confinement/sleeve assumptions,
manufacturer high-frequency extrapolation and hardware short circuits still need
review. This deck does not solve Monte Carlo envelopes or evaluate browser criteria.

### Parser regression boundary

`npm run test:nastran` (also included in `npm test`) generates eighteen full decks:
both solution sequences across baseline, shaker, signed manual inertia/steel/RBE2,
mixed assemblies, mixed Q=6, water-resistant material, Parker LORD, unequal stacks/
offset CG/preload, and fine-mesh cases. The
tests require pyNastran 1.4.1 and **fail**, rather than silently skip, if unavailable.
Set `NASTRAN_TEST_PYTHON` if a different Python executable holds that dependency.
They parse, validate and cross-reference complete decks, inspect actual parsed
inertia, loss, dynamic-load chains and property tables, and compare sampled table
values to the browser stiffness functions. Synthetic OP2-array arithmetic tests
check units, phase, normalization and error handling; they are not solver results.
The converter also round-trips synthetic acceleration data through a genuine OP2
file and its CLI (and PNG plotting when matplotlib is installed), still without
claiming a NASTRAN solve.
An independent rigid-box surrogate reconstructed from parsed CONM2/CBUSH/PBUSHT
cards also reproduces the browser's complex response at sampled frequencies.
That surrogate deliberately excludes shell mass/flexibility and is not a finite-
element solution of the exported plate or a NASTRAN execution.

Parser success is not a NASTRAN solve. A real solver run, dialect/version acceptance,
mesh/modal convergence and physical/test correlation remain separate validation gates.

References: [RLOAD2 enforced acceleration](https://help.autodesk.com/cloudhelp/2025/DEU/NSTRN-Reference/files/GUID-35C6EC65-9C22-4BCC-ADDF-A546EFD6F943.htm),
[PBUSH format and damping](https://help.altair.com/hwsolvers/os/topics/solvers/os/pbush_bulk_r.htm),
[PBUSHT frequency-dependent properties](https://2022.help.altair.com/2022/simulation/pdfs/os/Altair_OptiStruct_2022_Reference_Guide.pdf),
[residual vectors](https://nexus.hexagon.com/documentationcenter/en-US/bundle/MSC_Nastran_2025.2/page/Nastran/ACMS_User_Guide/11_Residual_Vectors.htm).

## Saved configurations

The **Saved configuration** selector above the export controls includes the
eight-leg **Baseline** and **shaker test**, a separate snapshot provided through
the owner's Configuration JSON export. Choose a name, then press **Load
configuration** to replace all inputs together. Selection alone does not change
the design. Loading clears old catalog/sweep results and recalculates modes,
responses and uncertainty with the saved requirements.

The shaker test snapshot is 12 lbm, 3.5 × 3.5 × 4 in, with CG at (0, 0, 2) in,
four legs on a 2 × 2 in footprint, and one 0510012-70-10 washer on each side of
each leg. It preserves the 15% compression basis, 1200 Hz ≤ −20 dB tone,
50 Hz X/Y mode minimums, 100–200 Hz vertical/resonance bands, +6 dB resonance
limit, seeded uncertainty and NASTRAN settings from the export. It is an input
configuration, not a measured shaker-test result or qualification claim.

Both snapshots are embedded in the rebuilt `standalone.html`; no network fetch
or JSON import is required. Edits change only the current browser-local design,
not a saved snapshot. The selector indicates modified settings until an exact
saved configuration is restored. **Reset baseline** continues to restore only
the eight-leg baseline. **Configuration JSON** exports the current inputs,
using `shaker-test.json` when they exactly match the saved shaker configuration.

## Coordinate system

The component coordinate origin is the center of its footprint on the isolated plate. +X and +Y lie in the plate. +Z points upward. Component dimensions extend from `-Lx/2` to `+Lx/2`, `-Ly/2` to `+Ly/2`, and from the plate (`z = 0`) to the entered height. CG and mount-plane coordinates use this common system.

All mechanics are performed in coherent SI units. English inputs are converted at the UI boundary:

- lbm to kg uses exactly 0.45359237 kg/lbm.
- lbf to N uses 4.4482216152605 N/lbf.
- inches to metres uses exactly 0.0254 m/in.
- Static Earth gravity is 9.80665 m/s².

## Sorbothane data model

The central material and catalog tables are in `js/sorbothane-data.js`. The source manifest is `references/sorbothane-isolation-manifest.json`.

Every property is presented as one of these categories:

1. Manufacturer published - directly transcribed from a table or catalog.
2. Manufacturer digitized - read from a manufacturer figure and stored as a table.
3. Manufacturer interpolated - calculated between supported points.
4. Engineering assumption or extrapolation - selected and visibly labeled.
5. Calculated - derived by the application.

Data Sheet 101 provides exact dynamic Young modulus and tan-delta values at 5, 15, 30, and 50 Hz for 30, 50, and 70 Shore 00. Engineering Design Guide Figures 1-3 and 5 extend the manufacturer curves to 300 Hz; the Version 1 table stores digitized values at 75-300 Hz. Above 300 Hz, the user must choose one of four visible policies:

- Hold the final manufacturer-curve value.
- Log-linear storage-modulus extrapolation while holding tan delta.
- User-defined storage modulus and tan delta.
- Constant complex stiffness based on the 300 Hz value.

The 600-2000 Hz results are therefore screening estimates. They require test correlation with the selected material lot, temperature, preload, geometry, capture hardware, and response amplitude.

## Geometry and static preload

For a ring or washer,

```text
Aloaded = π(OD² - ID²)/4
Afree = π(OD + ID)t
SF = Aloaded / Afree = (OD - ID)/(4t)
```

For a solid disc, `SF = OD/(4t)`. The manufacturer shape correction used in compression is

```text
Ecorrected = E(1 + 2 SF²)
```

Static compressive stress at 10% and 20% strain comes from Data Sheet 101. Intermediate compression is interpolated. Compression-driven design calculates the preload per element from the corrected static stress and loaded area. Preload-driven design solves the inverse relationship for compression.

For the uniform-element model, the static vertical reaction distribution is the minimum-norm four- or eight-mount solution satisfying net vertical force and roll/pitch moment equilibrium. Gravity is always included; user accelerations are added in g. The mount-plane-to-CG offset converts lateral quasi-static load into a vertical reaction redistribution. Mixed assemblies use the stiffness-dependent equilibrium model described in [Mixed Sorbothane assemblies](../sorbothane-mixed-assemblies.md).

For a symmetric upper/lower captured pair, the payload contribution changes the two element forces by equal and opposite halves:

```text
Flower = Fpreload + Fpayload/2
Fupper = Fpreload - Fpayload/2
```

An element with non-positive compression load is flagged as unloaded. Once contact is lost, the linear sandwich model is invalid.

## Incremental dynamic mount stiffness

The material is represented by complex modulus:

```text
E*(f) = E′(f) + j E″(f)
E″(f) = E′(f) tan δ(f)
```

For one compression element,

```text
kz′ = E′(1 + 2SF²) Aloaded/t
```

Lateral stiffness is kept separate from compression stiffness. With the user-exposed Poisson-ratio assumption,

```text
G′ = E′/[2(1 + ν)]
kx′ = ky′ = G′ Aloaded/t
```

Elements in one physical stack act in series. The preloaded upper and lower stacks oppose finite motion but act in parallel for small incremental plate motion:

```text
ktop-stack = kelement/ntop
kbottom-stack = kelement/nbottom
kmount = ktop-stack + kbottom-stack
```

The same loss factor multiplies the storage-stiffness contribution to form the mount complex stiffness. This is a linear viscoelastic approximation, not a nonlinear constitutive model.

## Six-degree-of-freedom model

Generalized coordinates are

```text
q = [x, y, z, θx, θy, θz]ᵀ
```

The mass matrix is formed at the CG. Automatic inertia uses a uniform rectangular solid. Manual inertia accepts the full symmetric inertia tensor, including products of inertia.

The four Version 1 mounts remain a symmetric rectangle. X/Y center-to-center spacing and X/Y edge inset are synchronized descriptions of the same geometry, so either can be edited without creating a contradictory layout. The mount-plane coordinate can likewise be entered from the plate origin or relative to the CG. These paired controls keep the moment arms used by the stiffness assembly visible.

For mount `i` at vector `ri` from the CG,

```text
ui = Bi q
Bi = [I  -[ri]×]
K*(f) = Σ Biᵀ ki*(f) Bi
```

The full coupling terms are retained. The storage-stiffness generalized eigenproblem is solved iteratively because `K′` depends on each mode frequency:

```text
K′(fn) φ = (2πfn)² M φ
```

The solver uses a Cholesky transformation followed by a symmetric Jacobi eigensolution. Mode labels are descriptive only: each mode is classified by its dominant normalized DOF after rotational components are multiplied by a characteristic planform length. The displayed eigenvector percentages show coupling; the solver never forces uncoupled X/Y/Z/roll/pitch/yaw modes.

## Base-excitation frequency response

Frequency response is solved from 10-2000 Hz on a logarithmic grid. For unit base displacement `y` along the selected excitation axis,

```text
[-ω²M + K*(ω)] qr = ω²MΓy
qa = qr + Γy
```

`qr` is relative motion and `qa` is absolute component motion. Acceleration transmissibility equals the corresponding displacement ratio for harmonic motion because both numerator and denominator are multiplied by `-ω²`.

At an arbitrary component point `p` relative to the CG,

```text
upoint = uCG + θ × p
```

The transmissibility panel starts at the CG and offers two opposite top-corner measurement locations (`+X/+Y` and `-X/-Y`). The corner offsets follow the entered component dimensions and CG location. The selected point applies consistently to the plotted Txx/Tyy/Tzz responses, tone limits, and resonance-band checks.

Complex phase is retained. dB results use `20 log10(|T|)` because they are amplitude ratios. Rotation traces are reported internally in rad/m of base displacement. For a common dimensionless plot, the app multiplies rotation by the component characteristic radius and labels those traces `Rx·r`, `Ry·r`, and `Rz·r`.

## Design explorer and uncertainty

The design explorer evaluates every visible point on a two-variable grid. It does not hide the sampled candidates behind an optimizer. Sweep axes include durometer, annular dimensions, compression, mass, CG height, both mount spacings, and stack count. Each ranked candidate reports all six modes, target-frequency transmissibility, resonance-band peak, compression, preload, engagement, catalog compliance, and a transparent score used only for ranking.

Applying a catalog recommendation preserves the completed catalog screen and highlights the selected part number and stack count. The current-design banner can then center and run the 7 × 7 sweep around that applied configuration. The applied design is outlined in the heatmap and retained in the ranked table even when it falls outside the first twelve candidates by score.

The optional uncertainty calculation is a seeded Monte Carlo screen. It varies dynamic modulus, loss factor, mass, three CG coordinates, and nominal compression. Mode and target-frequency intervals are the 5th and 95th percentiles. Independent Txx, Tyy, and Tzz transmissibility bands use the same samples at the selected response point. This is a sensitivity envelope, not a material allowables distribution or qualification confidence statement.

## Validation cases

Automated tests cover:

- Symmetric vertical closure against the analytical complex-stiffness SDOF solution.
- Centered-CG symmetric stiffness cross-term suppression.
- X/Y CG shifts introducing bounce/rocking coupling.
- CG height changing lateral/rocking coupling.
- Identical elements in series dividing stiffness by the stack count.
- Preloaded upper/lower stacks adding incremental stiffness.
- English and SI representations producing the same physical answer.
- Baseline vertical mode placement near 140-150 Hz without a hard-coded answer.

## Known limitations

- The component, plate, and source are rigid. Structural plate or bracket modes can create additional transmission paths and invalidate a rigid-body-only interpretation.
- No bolt, sleeve, washer, capture plate, or cable is allowed to short-circuit the isolation path in the model. Real hardware must be inspected for contact through the full displacement and tolerance envelope.
- Sorbothane temperature dependence is warned but not shifted numerically in Version 1.
- Vacuum, outgassing, radiation, fluids, contamination, aging, creep, compression set, manufacturing lot variation, and amplitude dependence are not predicted.
- Catalog rated loads are manufacturer product-selection ranges, not aerospace qualification allowables.
- Load/deflection and dynamic material data are for the manufacturer test basis; the exact captured annulus should be characterized if the decision depends on 600-1400 Hz attenuation.
- A linear complex modulus does not capture contact loss, nonlinear preload dependence, large deflection, or harmonics.
- The design explorer is a screening sweep, not a formal constrained optimizer.

## Required hardware validation

Before using a selected design for qualification or flight, correlate the model with component-level testing that measures:

- Static load versus compression for the actual annulus and capture geometry.
- Dynamic complex stiffness in compression and shear over the operating temperature, preload, amplitude, and 10-2000 Hz range.
- Six rigid-body modes and mode shapes on the integrated plate/component assembly.
- Base-to-component transmissibility at the CG and accelerometer locations of interest.
- Quasi-static acceleration engagement margin, travel, clearances, and absence of metallic contact.

The application is an engineering decision aid. It does not replace manufacturer consultation, controlled material characterization, detailed structural analysis, or qualification testing.
