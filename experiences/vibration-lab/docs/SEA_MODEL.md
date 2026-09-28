# Falcon 9 SEA teaching model

This replaces the original three-panel example with the Falcon 9-inspired native preset from the user's autoSEA workspace. It preserves the vehicle geometry, subsystem identities and connection topology while retaining a compact educational energy solver.

## Source snapshot and boundaries

Read-only source, captured 2026-09-27:

- `/Users/stephenwells/Documents/DevOps/autoSEA/lib/geometry/native.ts`: `createFalcon9InspiredGeometry`, `smoothProfile`, `surfaceMetrics`, and the first-stage 1 W default source.
- `autoSEA/app/components/SeaWorkbench.tsx`: the 190 m³ fairing cavity, 220 m² surface area, 1.5 s RT60, and deck/fairing attachments.
- `autoSEA/lib/sea/model.ts`: material/air defaults and the NASA/plate-convergent cylindrical-shell modal-density branch.
- `autoSEA/docs/validation/native-launch-vehicle.md` and `cylindrical-shell.md`: assumptions and validation anchors.
- The original machine-readable case is copied without modification into [FALCON9_AUTOSEA_REFERENCE.json](FALCON9_AUTOSEA_REFERENCE.json).

The source preset cites the [SpaceX Falcon 9 page](https://www.spacex.com/vehicles/falcon-9/) for its public envelope. This adaptation preserves its 70 m height, 3.7 m body diameter and 13.1 m × 5.2 m fairing envelope. These are the preset's dimensional conventions, not newly reverse-engineered hardware dimensions. SpaceX's payload user's guide uses a different overall fairing-height convention (13.2 m); this exhibit does not silently revise the user's saved model.

Only the public outer envelope is asserted as sourced vehicle information. Internal stations, thicknesses, equivalent materials and acoustic properties are conceptual assumptions. The geometry is a midsurface model, not production CAD. There is no measured Falcon launch load spectrum or calibrated response in this demo. The autoSEA checkout is unchanged.

## Canonical geometry and topology

`src/labs/sea/falcon.ts` contains the self-contained parameter snapshot. A clamped cubic Hermite fairing profile uses the same six samples per span as autoSEA. Its integrated frustum-strip area and the five other surface areas sum to **875.843523040011 m²**, matching the source validation case.

| State | Region                  |   Stations (m) | Thickness (mm) | Material                |
| ----- | ----------------------- | -------------: | -------------: | ----------------------- |
| 1     | Aft skirt               |          0–3.0 |            3.2 | Assumed aluminum        |
| 2     | First-stage barrel      |       3.0–42.6 |            2.8 | Assumed aluminum        |
| 3     | Interstage              |      42.6–47.1 |            4.5 | Assumed CFRP equivalent |
| 4     | Second-stage barrel     |      47.1–56.9 |            2.4 | Assumed aluminum        |
| 5     | Payload deck            |           56.9 |            8.0 | Assumed aluminum        |
| 6     | Fairing shell           |      56.9–70.0 |            4.0 | Assumed CFRP equivalent |
| 7     | Fairing acoustic cavity | inside fairing |              — | Assumed air             |

Aluminum: E = 73.1 GPa, ρ = 2700 kg/m³, ν = 0.33. Equivalent CFRP: E = 55 GPa, ρ = 1600 kg/m³, ν = 0.30. Deck radius is 1.85 m. Cavity air: ρ = 1.225 kg/m³, c = 343 m/s.

Structural edges, using the one-based state numbers: **1–2, 2–3, 3–4, 4–5, 4–6, 5–6**. The last three form the shared-ring deck T junction. Acoustic edges: **5–7 and 6–7**. These preserve the source side attachments (fairing negative normal, deck positive normal), although the educational network does not resolve directional radiation geometry.

Nine engine bells, folded landing legs and grid fins are schematic visual identifiers only. They add no mass, energy state or external-loss path. The fairing becomes transparent for the deck/cavity inspection. Geometry uses one common scale, with no selective widening of the rocket.

## Power and loss model

Seven simultaneous equations in SI units:

`dE/dt = P − ωLE`, with `ω = 2πfc`.

`Pij = ω(ηij Ei − ηji Ej)`, `Pdiss,i = ωηi Ei`.

The matrix diagonal adds internal and all outgoing CLFs; off-diagonals contain negative incoming CLFs. The reverse CLF is `ηji = ηij ni/nj`, so all eight edges obey reciprocity. Every signed internal exchange cancels in the global balance. Steady energies solve `ωLE = P` by pivoted Gaussian elimination.

The input is a prescribed band power, initially **1 W into the first-stage barrel**, matching the native preset. It can be moved to any state. It is not inferred from thrust, flight phase, acoustic SPL or random-vibration spectra.

Structural internal loss defaults `[.008, .008, .012, .008, .010, .015]` and forward CLFs `[.008, .008, .008, .006, .006, .004, .001, .003]` are **new illustrative teaching assumptions**, not copied/calibrated autoSEA solver results. They are editable. The full autoSEA wave-field junction/radiation solver is not imported. This distinction is visible in model notes and the junction controls.

The cavity loss is `ln(10^6)/(ωT60)`, initially T60 = 1.5 s; its density is the 3D asymptote `n = 4πVf²/c³`. The 220 m² area remains metadata; it is not used as an extra absorption sink. The diffuse-field pressure relation is `prms = sqrt(Eρc²/V)`.

## Structural modal populations

Flat-plate asymptote: `nplate = A/2 sqrt(ρh/D)`, `D = Eh³/[12(1−ν²)]`, in modes/Hz. Used for the deck and the equivalent-unrolled fairing.

Cylinders use the source's NASA/plate-convergent screening interpolation. Let `r=f/fr`, `fr=sqrt(E/[ρ(1−ν²)])/(2πR)`:

- r ≤ .48: `n/nplate = 2.5 sqrt(r)/2.6`;
- .48 < r ≤ .83: `n/nplate = 3.6 r/2.6`;
- above .83: smoothstep from the .83 value to 1 at r = 2, then the plate asymptote.

This is the autoSEA implementation choice, not a claim that the smoothing polynomial is an exact NASA equation. The source's first-stage ring-frequency anchor is **474.2004784233287 Hz**. [NASA/TM-2011-217171](https://ntrs.nasa.gov/citations/20110014791) provides the underlying cylinder/SEA context.

One-third-octave edges are `fc 2^(±1/6)`. Expected band count is `N=nΔf`; modal energy is `E/N`, not E/n. Overlap uses `M=n fc Lii`. No band or overlap threshold guarantees validity. Density multipliers are controlled statistical experiments and do not change geometry.

## Time, visuals and limitations

The substepped RK4 integrator limits step × maximum escape rate to 0.2. Physical time advances at 5/fc seconds per viewing second. Pause freezes all state and representative motion. New bands reset energy; source/loss/coupling changes retain it and approach the new equilibrium.

The network uses computed signed net powers; arrows disappear at zero flow and their widths scale with square-root power. Node fill and shell glow indicate total energy on a common linear-energy/square-root-brightness scale. The plotted total-energy and energy-per-mode values share the seven-state solution. Surface motion is a bounded synthetic realization whose amplitude follows sqrt(E/m), never a predicted mode shape or local displacement.

This demo omits autoSEA's exterior SIF/radiation sinks, full B/L/S junction solver, orthotropic/stiffened-shell physics, preload, propellant loading, payload response, detailed acoustic radiation and test correlation. Low-band acoustic asymptotes and shell approximations can be unreliable. Its numerical checks establish geometry parity, reciprocity and energy accounting, not vehicle qualification or autoSEA response parity.
