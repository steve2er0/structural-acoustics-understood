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

In assembly mode the catalog screen defaults to an exhaustive **ordered
upper/lower pair search** for the selected group. Upper and lower type filters
independently include bushings, rings and washers. The same dimensional bounds
apply to each side. Series counts are independent, within the chosen range;
bushings are limited to one per side. The other group, fit dimensions, clamp
basis, material formulation and leg assignments stay fixed. The nominal default
is one element on each side; increase the count range to search flat-part stacks.
Single-side screening remains an optional mode. The full assembly catalog has
147 records, including 15 bushings; solid discs are not part of the default
floating-bolt pair search because they have no bolt bore.

Pairs are generated lazily, including both orientations and unequal part/count
combinations. Definite fit failures are rejected first, followed by the entire
system's static load, compression, contact and equilibrium checks. Every
mechanically eligible pair receives the same six-DOF modal and three-direction
tone/resonance analysis. MODEL flags are not pruned: a bushing pair can be the
best REVIEW candidate, but never an unqualified passing recommendation.

PASS results take precedence. Each ordered part-number pair retains its smallest
passing total element count, breaking count ties with the modeled tone/resonance
score. Those representatives are ranked by the same score (existing catalog
performance score: limit-exceedance penalties, sum of worst-axis tone dB and
worst-axis resonance dB). REVIEW pairs use fewer failed dynamic criteria, fewer
model flags, then that score and element count. All passing part-number pairs
are retained as compact display/application summaries from their completed
evaluations. These records omit the full matrices, static profiles and per-pair
configuration copies; applying one patches both slots/counts of the selected
group and reruns the normal installed-design analysis. REVIEW candidates retain
their full details, with the best eight displayed.

The passing-results selector offers 25 (default), 50, 100 or All for mixed pairs,
single-side Sorbothane screens and Parker LORD screens. It displays an explicit
"Showing N of M" count, both-side loads/quantities and the system BOM. Changing
this display preference only rerenders stored results: it never repeats catalog
screening, changes the design or reruns uncertainty. "All" means every retained
passing part-number pair, still with one preferred stack configuration per pair,
not every passing stack variant. The selected hardware remains highlighted when
visible; a note gives its rank when it is outside the current display limit.
Evaluation errors are counted and visibly mark the result incomplete. Progress
is based on enumerated pairs, with a separate final ranking stage; cancellation
discards partial results without applying hardware.

"Best" means nominal best within these filters and fixed settings, not a global
optimization over both groups, assignment patterns, preload or uncertainty.
Applying a result replaces both selected-group sides/counts together and retains
the other group, physical settings and uncertainty configuration. Both parts are
highlighted together, and the design can be loaded into the 7x7 matrix.

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
