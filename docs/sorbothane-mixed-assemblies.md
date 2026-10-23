# Mixed Sorbothane assemblies

The Isolator tab can opt into independently selected upper/lower catalog parts.
Assembly A or B is assigned to each of four or eight support legs. Existing
uniform-element designs and Parker LORD complete-mount behavior are unchanged
while this mode is disabled. Config JSON retains the groups and assignments.

## Source and load-rating contract

`js/sorbothane-data.js` transcribes the 15 bushing records on page 6 of the
Sorbothane Standard Products Guide, revised June 2025. Drawing dimensions are
A (flange OD), B (sleeve OD), C (flange thickness), D (bore), and E (overall
height), in inches. Ratings are individual-part axial load ranges at 10-20%
deflection. They are not radial rates, and capacities are not added across
opposing parts or multiplied by a series stack count. Water-resistant ordering
and ratings remain unconfirmed by the standard catalog.

## Static and dynamic model

Each group has one common nominal bolt clamp force. It is either specified
directly or calculated from a lower-element starting-compression target. Upper
and lower compression can therefore differ when the parts differ. Per-side
stack counts affect deflection/stiffness, not the force carried by an element.

Static force and moment equilibrium is solved in six rigid-body DOFs by Newton
iteration with a residual-reducing step search. Upper/lower force follows each
part's static stress curve and its local compression. Contact forces are zero
after opening. The stress slope from 15-20% is extended only to keep out-of-range
previews numerically inspectable: installed compression outside 10-20% is REVIEW,
not a manufacturer-supported prediction. The solver reports convergence and
force/moment residuals; it does not prescribe equal payload load per leg.

Dynamic response is a small-motion linearization about the installed state.
Each side uses its own material/durometer and installed starting compression;
its storage and loss stiffness are assembled at every leg and every frequency.
Mixed modes are iterated using the assembled matrices rather than scaled by a
single parent material modulus. All three direct-axis responses, off-CG response
locations, and uncertainty envelopes use these matrices.

## Explicit bushing limitations

The initial bushing adapter is a **flange-only annular approximation** using
outer diameter A, inner contact diameter B, and flange thickness C. This is an
engineering assumption, not a manufacturer bushing stiffness model. It omits
sleeve confinement, radial bearing/contact, friction, torque and hardware
bridging. A bushing assembly always carries a MODEL REVIEW until this adapter is
replaced or correlated with suitable test/FE/manufacturer data. Passing axial
load/fit checks does not remove that flag.

The radial option either estimates flange shear or replaces the entire
assembly's X/Y storage rate with a user-entered value in lbf/in. The latter uses
the effective modeled flange shear loss factor, remains REVIEW, and does not add
a second sleeve spring. A zero user rate is invalid; the preview explicitly
falls back to the flange estimate rather than claiming that zero is a usable
restraint. Bushings are not automatically stacked: catalog screening allows one
per side, and manually requested multiple bushings produce FIT REVIEW.

Geometric checks compare bolt/bore diameters, sleeve/hole/flange diameters and
combined free sleeve reach against the specified hole grip. The +/-0.002 inch
sleeve comparison band is an engineering preview threshold, **not** a catalog
manufacturing tolerance or installation acceptance criterion. Washers, bolt head,
shank, nuts, support plates and sleeves still need an installation-level review.
All mount axes remain Z axial, X/Y radial; arbitrary tilted bushings are not
represented.
Flat elements also retain MODEL REVIEW when a mounting hole exceeds the element
bore, because the full-face annular stiffness and catalog load range have not
been established for that partial bearing footprint.

## Screening and export

In assembly mode the existing catalog screen varies one selected group and side
while keeping other parts, fit dimensions, clamp settings and leg assignments
fixed. It is not an unconstrained combinatorial search over every part at every
leg. The 147 candidate records include 15 bushings plus 132 existing flat parts.
Every candidate reruns the installed mixed-system analysis. Unverified bushing
models appear as REVIEW candidates rather than passing recommendations.

The 7x7 matrix can vary group compression or a user radial rate, as well as
mass/CG/mount spacing. Every cell includes modal, response, fit, load, compression,
contact and model-review checks. Parts/leg assignments are preserved.

The BOM counts Sorbothane parts only. The NASTRAN export writes a separate PBUSH
for every mixed-system leg, with direction-specific storage/loss values at the
chosen reference frequency, and maps each CBUSH to the corresponding property.
These zero-length CBUSHes align with basic X/Y/Z. SOL 103 does not validate sleeve
contact or reproduce full frequency-dependent viscoelastic behavior.

## Verification boundaries

Automated checks cover catalog transcription, opt-in legacy parity, JSON state,
static force/moment residuals, nonuniform load sharing, distinct side ratings,
fit/model-review flags, matrix symmetry, complex FRF equilibrium, independent
uncertainty bands, BOM quantities, catalog target retention, and per-leg PBUSH
mapping. Browser checks separately verify the modular and standalone controls.
None of these checks is physical hardware qualification.
