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

## Modal damping readouts

Each of the six mode cards shows effective Q, modal loss factor η, and equivalent
percent critical damping. Q is defined here as 1/η; percent critical damping
uses the solver's existing damping ratio, 100ζ ≈ 50η. Values are evaluated for
each mode at its calculated frequency, including the existing strain-energy
weighting for mixed assemblies. They are equivalent loss-factor-based estimates,
not measured decay damping or the peak transmissibility at a response location.
Zero modal loss is displayed as Q = ∞; very small nonzero values use scientific
notation rather than rounding to zero. These readouts do not change the solver,
design criteria, saved configurations, or frequency response.

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
