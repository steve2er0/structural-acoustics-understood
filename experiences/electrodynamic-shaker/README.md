# Electrodynamic Shaker — migrated to Vibration Lab

The authoritative source now lives in [`../vibration-lab/src/labs/shaker`](../vibration-lab/src/labs/shaker). This folder retains historical validation and screenshots. Its npm commands delegate to the unified app.

From this folder, `npm run dev` starts Vibration Lab at http://127.0.0.1:5174/ . Open `/labs/shaker`. For setup, architecture and extension instructions see the [Vibration Lab README](../vibration-lab/README.md).

<details>
<summary>Original demo documentation (historical paths and ports)</summary>

# Inside the Shaker

A locally runnable, interactive 3D explanation of **how a field-coil electrodynamic shaker works**. A companion to `experiences/vibration-isolation`, with original procedural geometry, local fonts, and no backend or runtime CDN assets.

## Run

Requires a current Node release supported by Vite 8 (Node 22.12+ or 24+ recommended).

```sh
cd experiences/electrodynamic-shaker
npm ci
npm run dev
```

Open **http://127.0.0.1:5175/**. To serve a production build instead, stop the dev server, run `npm run build`, then `npm run preview`.

```sh
npm test
npm run build
```

This independent Vite app does not change the repository's existing calculators, standalone bundle, or isolation exhibit. Production files are generated in `dist/`.

## Explore

- Start with both coils off. Increase **Field current**: the stationary winding establishes flux, but produces no table motion by itself.
- Select **Force** and apply positive or negative manual drive current. Radial **B**, circumferential **I**, and axial **F** are labeled on the moving coil. Reverse the current to reverse force.
- Switch to **Sine**. Frequency and requested drive level set a steady harmonic response. If a modeled limit is reached, an ideal controller reduces the delivered current amplitude without clipping the sine wave.
- **Back EMF** shows `e = BLv`, velocity and induced-voltage directions, and head-to-tail voltage phasors. The terminal voltage is the vector sum; the peak magnitudes do not add arithmetically.
- **Envelope** computes the maximum sinusoidal acceleration at every frequency. Add a payload to compare with the dashed bare-table curve. Clicking the plot sets frequency.
- **Energy** separates field-supply heat from amplifier input, drive-coil heat, and mechanical damping loss.
- The **76-second guided tour** runs through 20 stages. Pause, move between stages, or edit a control to return to exploration.
- Inspect **Assembled**, **Cutaway**, **Exploded**, and **Magnetic circuit** modes. Nine camera presets cover the lab, the system, cutaway, field winding, air gap, drive winding, armature, suspension, and exploded assembly.

Drag to orbit, scroll to zoom, use **R** to return to the system camera, and **Space** to pause/resume when focus is outside a control. Native sliders, buttons, select controls, and the notes dialog support keyboard use. Reduced-motion preference starts the simulation paused.

## Test-lab environment

The procedural room is inspired by the supplied vibration-laboratory photograph: blue-gray wall panels, navy equipment foundation and amplifier cabinet, yellow floor boundary, an orange lifting jib, service lights, cooling unit, and fixed cable runs. **Test lab** pulls the camera back to show the complete bay; **System** returns to the apparatus. All geometry and printed textures are generated locally.

The room and service equipment provide visual context only. Their geometry adds no mass, support compliance, thermal behavior, amplifier characteristics, or horizontal slip-table dynamics to the model. The existing shaker motion and equations are unchanged. The two independent apps each bundle their own `TestLab.tsx` so either can be built and served independently.

## Architecture checked before geometry

The chosen generalized single-field-winding layout has a lower DC field coil around the center pole, a ferromagnetic base and outer return yoke, an upper outer pole, a radial annular working gap, and a moving cylindrical drive winding in that gap. Two levels of flexures guide the armature axially. The table, former, drive coil, and payload move as one assembly. The field coil, poles and housing remain fixed in operating views.

This architecture was checked against the conventional section drawing in **Gomes et al., Fig. 1b**, and the electrodynamic shaker description/model in **Tiwari et al.** before constructing the geometry. The removed sector, enlarged gap, small number of visible winding turns, flexure shape, and cooling port are schematic. Exploded mode separates parts for inspection while the equations continue to describe the assembled machine.

Sources:

1. [Tiwari, Puri & Saraswat (2017), “Lumped parameter modelling and methodology for extraction of model parameters for an electrodynamic shaker”](https://journals.sagepub.com/doi/pdf/10.1177/0263092317693511), DOI 10.1177/0263092317693511. Field/armature separation, suspension, back EMF, and real armature flexibility.
2. [Gomes et al. (2007), “An automatic system for electrodynamic shaker control by acceleration power spectral density”](https://abcm.org.br/app/webroot/anais/cobem/2007/pdf/COBEM2007-2522.pdf), COBEM 2007, Fig. 1b. Conventional electrodynamic shaker section.
3. [Data Physics, “Understanding Voltage-Current Curves and Their Significance”](https://dataphysics.com/blog/amplifiers/understanding-voltage-current-curves-and-their-significance/). Amplifier and electromechanical operating limits.
4. [Data Physics, “How to Choose the Right Size Shaker”](https://dataphysics.com/blog/shakers/how-to-choose-the-right-size-shaker/). Total moving mass, displacement, velocity, and force capability.

Visual references: [Plane of Focus](https://sael.net/plane-of-focus/) for spatial teaching and cinematic interaction, and the repository's Vibration Isolation exhibit for typography, materials, palette, and controls. No reference-site code, geometry, or graphics are copied.

## Physics and assumptions

Internal values use SI units. For a fixed housing and a rigid moving mass:

```text
m = armature mass + payload mass
F = BL i
m a + c v + k x = F
e = BL v
V = R i + Le di/dt + e
```

The harmonic convention is `q(t) = Im[Q exp(jωt)]`, with drive current `Ipk sin(ωt)`. The response per ampere is:

```text
X/I = BL / (k − mω² + j cω)
Vvelocity/I = jω X/I
Z = R + jωLe + BL Vvelocity/I
```

At each frequency, the envelope selects the smallest allowed current from stroke, velocity, peak current, terminal voltage, and continuous copper heating. It then multiplies that current by the acceleration response per ampere. Limit order can change with payload and field strength. A limit can remain inactive; for example the nominal 1,600 W drive-heating ceiling is above the 1,440 W copper loss at the 60 A sine-current ceiling.

Representative values are **assumed educational parameters**, not specifications for any manufacturer:

| Property                          |                        Value |
| --------------------------------- | ---------------------------: |
| Armature mass / payload           |              12 kg / 0–60 kg |
| Suspension stiffness / damping    |       60,000 N/m / 250 N·s/m |
| Drive resistance / inductance     |               0.8 Ω / 1.2 mH |
| Active drive-wire length          |                    66.6667 m |
| Nominal gap flux / force factor   |               1.2 T / 80 N/A |
| Field coil                        |      12 A DC, 5 Ω, 600 turns |
| Peak current / voltage limits     |                 60 A / 120 V |
| Peak stroke / velocity limits     | ±12.5 mm (25 mm p-p) / 1 m/s |
| Continuous drive-coil copper heat |                      1,600 W |
| Manual drive range / sine range   |         ±8 A DC / 1–2,000 Hz |

`B = 1.6 tanh[atanh(0.75) Ifield/12]` tesla provides a monotone saturation illustration calibrated to 1.2 T at 12 A. It is not a magnetostatic field solution. The model omits fringing, hysteresis, eddy currents, field-current transients, and position-dependent BL. Flux tracers show the direction of an already established field, not literal magnetic particles. Portions of the magnetic path are drawn as an overlay through otherwise opaque components.

Manual drive shows DC equilibrium, `x = BLi/k`, with zero steady velocity and back EMF. Eased motion between DC equilibria is illustrative, not a transient calculation. Static weight is removed about a supported equilibrium, so adding payload does not calculate static sag.

The force view displays `BLi`, `−kx−cv`, `−ma a`, and payload reaction `−mp a`, which sum to zero. The armature inertia term is a D'Alembert balance term, not an additional applied force. Simple `F = ma` using electromagnetic force alone is only an approximation away from suspension effects.

Sine copper heating is `Ipk²R/2`; field/DC heating is `I²R`. Mean mechanical dissipation is `c vpk²/2`. The ideal spring and rigid payload store and return energy. The model does not predict temperatures, cooling capacity, amplifier losses, or dissipation within a real test article.

The single rigid moving mass omits armature, fixture and payload flexibility, rocking, body isolation, and other structural modes. The 2 kHz endpoint demonstrates the electrical trend of this idealization; it is not a validated usable bandwidth for a real shaker.

## Drawing and time scales

The numeric results remain physical. Geometry uses a reference scale of 10 scene units per metre and a separately disclosed displacement gain. Sine gain depends only on frequency and a fixed, fully excited bare-table reference; it never changes with the user's field, drive level, or payload at that frequency. Thus those changes retain their calculated amplitude ratios. A control-domain sweep verifies that visible drive-coil travel remains inside the drawn axial gap.

Playback runs at 0.62–1.25 visible cycles/s, while physical frequency is 1–2,000 Hz. Current, force, motion and back EMF share a common phase clock. Arrow lengths are compressed for visibility; labels and readouts carry the quantitative result. Conventional drive current reverses around the circumference, with `I × B = +Y` for positive drive current and outward radial flux. For positive axial velocity, the motional EMF direction is `v × B`, opposite positive conventional drive current.

## Source organization

| Directory          | Responsibility                                                                         |
| ------------------ | -------------------------------------------------------------------------------------- |
| `src/physics`      | Pure SI operations, complex arithmetic, cross products, and regression tests           |
| `src/magnetics`    | Field-current calibration and field-coil heat                                          |
| `src/shaker-model` | Coupled harmonic response, manual equilibrium, power and capability limits             |
| `src/rendering`    | Original procedural cutaway geometry, flexures, lighting, vectors, flux and camera rig |
| `src/ui`           | Native controls, contextual plots, responsive layout, model/source notes               |
| `src/animation`    | Shared clock, drawing gain, state and deterministic guided tour                        |

See [VALIDATION.md](VALIDATION.md) for the delivered checks and scope.

</details>
