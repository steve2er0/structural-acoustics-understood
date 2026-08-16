# Sorbothane 6-DOF Isolation Designer

This workbench designs and screens a four-point, double-sided captured Sorbothane isolation system for a rigid aerospace component. It is available at `#/tool/sorbothane-isolation` in the modular site and in `standalone.html`.

The baseline is a 10 lbm rectangular component on four custom 50 Shore 00 annular elements per side. Each element has a 1.25 in OD, 0.50 in ID, 0.25 in free thickness, and 15% nominal precompression. The result is calculated from the implemented model; no mode frequency or target transmissibility is hard-coded.

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

The static vertical reaction distribution is the minimum-norm four-mount solution satisfying net vertical force and roll/pitch moment equilibrium. Gravity is always included; user accelerations are added in g. The mount-plane-to-CG offset converts lateral quasi-static load into a vertical reaction redistribution.

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
