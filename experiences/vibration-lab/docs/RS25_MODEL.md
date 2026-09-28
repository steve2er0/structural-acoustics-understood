# RS-25: architecture, model, and provenance

Independent teaching demo at `/labs/rs25`. Pure SI calculations live in `src/labs/rs25/physics.ts`; the startup choreography is separate from the operating solution. No other lab's state or solver is imported.

## Source audit, 27 September 2026

The architecture was checked **before implementation** against:

1. [NASA / Van Hooser and Bradley, _Space Shuttle Main Engine — The Relentless Pursuit of Improvement_, 2011](https://ntrs.nasa.gov/citations/20120001539), pp. 2–3 / Figures 1–2. Primary detailed cycle and heritage reference point.
2. [NASA's public HAER SSME drawing, sheet 2](https://www.nasa.gov/wp-content/uploads/2024/12/space-shuttle-main-engine-drawings.pdf?emrc=e914d4). External form, assembly proportions, five major valves, simplified flow schematic. Read visually as a PDF; no CAD or raster assets copied into the demo.
3. [NASA/TM-20205000446, 2020, §3.1](https://ntrs.nasa.gov/citations/20205000446). RS-25 component roles and serial pressure stages. Its condensed fuel-routing prose differs from the detailed heritage account. The implementation follows the detailed 2011 routing for LPFTP turbine discharge through powerhead cooling to the main injector; it does not reroute that flow into the preburners.
4. [NASA's current SLS RS-25 overview](https://www.nasa.gov/reference/space-launch-system-rs-25-core-stage-engine/). Confirms Shuttle heritage, SLS use and distinction between 109% heritage-engine operation and newer 111% configurations. This exhibit stays within the heritage 67–109% envelope.
5. [NASA's cryogenic prechill explanation](https://www.nasa.gov/centers-and-facilities/marshall/engineers-chill-space-launch-system-rocket-engines-before-launch/). Cryogenic inlet temperatures. The display's approximately −253°C fuel and 3,316°C combustion references describe a temperature contrast, not computed local temperatures.

## Retained topology

- LH₂ inlet → LPFTP pump → HPFTP pump → MFV → fuel distribution.
- Chamber-wall coolant → LPFTP turbine → powerhead/hot-gas-manifold coolant jacket → main injector.
- Nozzle coolant + CCV-metered bypass → both preburners.
- LOX inlet → LPOTP pump → HPOTP pump → MOV → main injector (major net branch).
- HPOTP boost stage → FPOV / OPOV → respective preburners.
- HPOTP oxygen tap → LPOTP hydraulic turbine → LPOTP pump outlet. This is a recirculation loop, not additional engine consumption.
- Fuel preburner → HPFTP turbine; oxidizer preburner → HPOTP turbine. **Both are fuel-rich.** Each turbine shares its pump shaft.
- HP turbine exhaust → hot-gas manifold → main injector → main chamber → nozzle → exhaust.

Secondary seals, bleeds, purge, tank pressurization, detailed cooling passages and controller timing are omitted. Geometry is a procedural spatial illustration; the Cycle view unfolds the topology. Tubes need not follow flight-hardware centerlines, and representative pump blades/injector jets are not production geometry. LP pumps have distinct driving fluids; fuel and oxygen high-pressure hardware is visibly different. The HPOTP boost stage is included in its shaft load.

## Operating map and units

All values below that are not explicitly designated NASA references are **chosen educational assumptions**.

NASA upper anchor: 109% RPL, altitude/vacuum thrust 512,271 lbf; chamber pressure 2,994 psia; altitude specific impulse 452 s. Conversions: 1 lbf = 4.4482216152605 N; g₀ = 9.80665 m/s². Nominal total mass flow is derived as F/(g₀ Isp), approximately 514 kg/s, not claimed to be a measured point flow. A fixed assumed O/F mass ratio of 6 gives roughly 73.4 kg/s hydrogen and 440.6 kg/s oxygen.

For s = RPL/109, total consumption and chamber pressure scale linearly with s. Normalized pump speed is √s; a quadratic head law makes pressure rise proportional to s. There is no unsupported exact rpm readout. Rotors are slowed for legibility.

| Assumption              |         LH₂ |         LOX |
| ----------------------- | ----------: | ----------: |
| Liquid density          |    71 kg/m³ | 1,141 kg/m³ |
| Feed pressure           |     0.2 MPa |     0.2 MPa |
| LP rise at reference    |     1.6 MPa |     2.6 MPa |
| HP rise at reference    |    42.2 MPa |    27.2 MPa |
| LP / HP pump efficiency | 0.72 / 0.82 | 0.75 / 0.80 |

The oxygen preburner boost adds 15 MPa at reference with efficiency 0.75. Shaft power = Δp Q / ηpump; the HPOTP load includes its boost stage. Turbine work = shaft load / 0.98, with the remainder explicitly represented as mechanical loss. LPOTP hydraulic efficiency is 0.78; its recycle flow is solved from required turbine work and the available HP-to-LP pressure drop. HPOTP handles net consumption **plus** recycle flow.

## Branch mass closure

Illustrative hydrogen split: 20% chamber cooling, 45% nozzle cooling, 35% bypass. Nozzle and bypass streams feed the preburners. Eight percent of net oxygen feeds the preburners; 92% goes directly to the injector. Preburner supply is divided 65:35 between fuel and oxidizer units for both species. These are not sourced RS-25 split percentages and are explicitly labeled as assumptions in the UI model notes.

Main injector inlet mass = warmed chamber-coolant hydrogen + both preburner product streams + direct oxygen = external hydrogen + external oxygen = nozzle exhaust. Preburner products include remaining H₂ and reaction products; their total mass, not just unburned hydrogen, is conserved. Oxygen recirculation is internal and cancels globally.

## Energy bookkeeping

Assumed hydrogen LHV: 120 MJ/kg. At fixed overall fuel-rich mixture, reacted hydrogen = available O₂ / 8. Preburner heat plus main-chamber heat equals the modeled total chemical release. HP turbine work is withdrawn from preburner gas; the positive remainder continues downstream. LPFTP is powered by internally recovered chamber cooling heat, represented by a 3% chemical-release transfer; its remaining enthalpy returns to the combustion system.

External closure: chemical release = exhaust kinetic power + residual exhaust enthalpy + an assumed 2% external heat loss. Kinetic power = ½ṁVe². Pump work and regenerative heat are internal transfers, not added sources or extra losses in this global balance. This bookkeeping demonstrates a feasible energy allocation; it is not a thermochemical equilibrium solution or a detailed enthalpy-state cycle analysis.

## Nozzle / thrust

F = ṁVe + (Pe − Pa)Ae. Pa is adjustable from 0 to 101.325 kPa; the default is sea level. The original vacuum reference remains the upper calibration anchor. Ve = 4,300 m/s is assumed constant. Exit diameter = 2.29 m. The reference Pe is derived so momentum and pressure terms sum to the documented upper vacuum thrust; it scales with s. Thus this deliberately fixed-geometry, fixed-mixture map makes vacuum thrust proportional to RPL. It does not assert that relationship for arbitrary engines, transients or ambient pressures. The reference at 100% is the derived linear map, not a separately measured performance point.

The nozzle's pressure/velocity drawing shows trends, not a solved local Mach field. No flight trajectory is included. Ambient pressure is an independent environment control; it does not alter chamber pressure, consumption or the assumed exhaust velocity.

## Interaction and startup

Start runs an eight-second **ordered reveal of a steady solution**. Flow, rotors, preburner gas, chamber reaction and exhaust become visible in sequence. Numeric operating readouts remain withheld until completion. There is no claim about actual ignition order/timing, startup inventory, valve sequencing or certified control logic. Shutdown returns directly to an unpowered display. Pause freezes reveal and motion; camera inspection remains available.

Flow-marker speed scales with power command; rotor display speed scales with the model's normalized speed. Lit chamber/preburner/plume intensity and extent are tied to playback state. Particle number, arrow size, travel time and pipe radius are illustrative, not extra flow calculations. Fuel/oxygen use different marker shapes and all categories have text legends. Flow, cutaway, exploded and schematic modes explain the same retained topology.

The 21-step tour is 105 seconds and assigns complete stage settings, including operating state, command, component, display and camera. It can be paused, stepped, exited and restarted. The original cycle lessons use vacuum conditions; the last three lessons compare sea level, thin air and vacuum explicitly. Notes support Escape, trapped tab navigation and focus return.

## Validation

The lab tests check upper-anchor conversion, head/speed relation, ΔpQ pump work, turbine/shaft balance, hydraulic recycle, mass closure, fuel-rich preburner mixtures, energy partition, increasing commanded power, bounds, zero state and startup reveal order. These are educational-model checks, not RS-25 qualification. Browser evidence and production checks are recorded in `../VALIDATION.md`.

## RS-25 form and shock-diamond update

The public HAER elevations informed a longer bell, a narrower throat, an opaque assembled nozzle jacket, exposed cooling channels in cutaway, reinforcement hoops, conformal straps, a tighter asymmetric powerhead, larger primary ducts, pump flange bolts and a gimbal mount. The same engine is rotated into a horizontal inspection fixture for the plume lesson. This is an illustrative model, not a replica CAD assembly. The small harnesses, fasteners and identification plate are representative. No external imagery or copied reference code is embedded.

The interaction was studied at [Airsup's rocket-engine exhibit](https://www.airsup.ai/lab/rocket-engine): following propellants, changing throttle and comparing ambient conditions. That exhibit represents a Raptor; its geometry and propellant cycle were not used as RS-25 authority. [NASA's Shuttle image](https://www.nasa.gov/image-article/into-blue-sky/) confirms visible shock diamonds in the main-engine exhaust. [NASA Glenn's nozzle explanation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/nozzle-design/) supports the expansion and thrust relationships, and [NASA's imperfectly expanded jet study](https://ntrs.nasa.gov/citations/19850067203) describes the quasi-periodic cell structure. No claim is made that the visual law below was fitted to these sources or to RS-25 plume measurements.

### Shared plume state

`engineState(power, activity, ambientPressure)` retains the calibrated exit pressure Pe and uses F = ṁVe + (Pe − Pa)Ae. Turning an engine off sets its thrust to zero, even when Pa is nonzero. At 100% power, modeled sea-level thrust is about 1,673 kN, versus 2,091 kN in vacuum. These are outputs of the existing chosen map, not additional NASA calibration points. Ambient pressure affects external expansion and pressure thrust, not internal engine flow in this model.

For a fixed assumed γ = 1.22, an ideal-gas pressure relation estimates fully expanded Mach number Mj from Pc/Pa. The isentropic area–Mach relation maps Mj relative to Me into an effective jet diameter Dj. The characteristic display cell length is 0.67 Dj √(Mj² − 1), converted to model coordinates, compressed longitudinally to 64%, and bounded to 1.2–7 scene units. This is a qualitative trend law; it is not an RS-25 spacing correlation or a solution for a strongly overexpanded nozzle. There is no numeric claim for the observed distance to any individual diamond.

The pressure mismatch log(Pe/Pa) controls contraction, spread and cell contrast. At matched pressure, contrast is exactly zero. A Pa/(Pa + 1,500 Pa) confinement factor fades the cells as ambient pressure approaches zero. The vacuum branch avoids division by zero, removes the periodic pattern and increases plume spread. Sea level, thin air (5 kPa), vacuum and exact pressure match are available as shortcuts; the slider changes ambient pressure continuously.

The plume is a ray-marched emissive volume, not a textured cone or flat image. Cell locations stand in the flow; small turbulent intensity variations use the shared playback clock. Pause freezes the fluctuations without disabling parameter comparison or camera inspection. Color, luminosity, decay, shape and cell spacing are schematic. The display does not solve nozzle separation, side loads, Mach disks, detailed shock angles, mixing/afterburning chemistry or radiative emission. In particular, strong overexpansion is shown only as a qualitative contraction-and-cell trend.

### Photo-guided hardware refinement

The user supplied hot-fire and detailed external-engine images. Their visual cues inform a substantial solid nozzle jacket, pronounced circumferential hoops and clamps, larger looping feed ducts, a dense powerhead, stepped and cast turbopump housings, and controller connectors. The exterior housing envelopes differ between LP pumps, multistage HPFTP and HPOTP with its boost stage. Existing cutaway rotors remain conceptual. Red protective caps in reference imagery are not generalized into operational component colors. No user image is embedded in the shipped app.

The spherical heritage pogo accumulator is specifically identified in [NASA's HAER photograph, Library of Congress](https://www.loc.gov/pictures/item/tx1115.photos.579969p/). Its connection is a side branch of the low-pressure oxidizer discharge duct between LPOTP and HPOTP. The cycle schematic shows a non-through-flow gas compliance branch. [NASA's Ares I accumulator design analysis](https://ntrs.nasa.gov/citations/20090034946) describes the heritage SSME helium precharge, subsequent gaseous-oxygen supply and liquid-level management; those heritage details support the explanatory text, not Ares I hardware geometry. The selectable accumulator has an inspection camera and a conceptual gas/liquid cutaway. Its baffles, operating liquid level, volume, resistance, inertance and coupled engine/vehicle pogo stability are not calculated.

### Pump orientation and powerhead reconstruction

The earlier exterior made all four pump shafts face forward. A fresh visual inspection of **HAER sheet 2's two labeled elevations and exploded isometric**, plus [HAER photo 17 (fuel-side machinery with nozzle removed)](https://www.loc.gov/pictures/item/tx1115.photos.579973p/) and [HAER photo 18 (opposite side)](https://www.loc.gov/pictures/collection/hh/item/tx1115.photos.579974p/), prompted a structural layout correction:

- Shafts now run longitudinally. LP inlet ends face upward and their turbines sit below; HP turbine ends face upward beneath the preburners, with pump inlets below. The educational model idealizes these axes as parallel to the engine axis; precise clocking and tilts are not surveyed.
- High-pressure pumps flank the chamber. Transfer ducts cross the upper powerhead and wrap down to the HP inlet ends. Port endpoints, exterior housings, cutaway rotors and exploded positions share the same transforms in `layout.ts`.
- The powerhead is shorter, with a compact gimbal bearing, low preburner caps, hot-gas manifold, pneumatic blocks, separate oxidizer-side heat-exchanger bulge, controller and perimeter harnesses. Photo 17's central actuator-replacement ground-support strut is not treated as an engine shaft.
- Overall height relative to nozzle exit diameter follows the drawing's approximately 4.27 m / 2.29 m envelope. These two published dimensions constrain the silhouette; small parts, wall thicknesses, clearances and decorative tubing are not dimensioned reproductions.
- The pogo sphere remains a side branch of the LP oxidizer transfer duct, separate from the heat exchanger. Its relative size and surrounding machinery were reduced to match the compact reference powerhead.

No reference raster or third-party CAD asset is embedded. The procedural reconstruction preserves the conceptual cycle and deliberately exposed cutaways; it does not claim manufacturing fidelity or identical external hardware across all Shuttle/SLS RS-25 variants.

## LPFTP pressure excitation study

### Evidence and scope

- [Dorney, Griffin, Marcu & Williams, NASA NTRS 20060050367 (2006)](https://ntrs.nasa.gov/citations/20060050367), PDF pp. 3 and 7: four main inducer blades plus four splitters; nominal 15,761 rpm at 104.5% RPL; 4N blade passage and 8N / 16N components in the reported test/simulation comparisons. This does not establish their amplitudes for every operating condition.
- [Brown, DeLessio & Wray, NTRS 20205011295, introduction](https://ntrs.nasa.gov/citations/20205011295): HOSC excitation around 6.4–6.7 times shaft frequency and its relevance to compatible structural modes.
- [Brown & DeLessio, NTRS 20200001729, pp. 2–3](https://ntrs.nasa.gov/citations/20200001729): HOSC is the circumferentially in-phase case of higher-order cavitation. Fluid-added mass, tight clearance, cryogenic material properties, hydroelasticity and structural/acoustic coupling complicate the structural response.

The study isolates sources in an educational LPFTP cutaway. It is not a cavitation onset model, engine health monitor, spectral reconstruction of test data, acoustic propagation solver, or fatigue assessment. It makes no operating-limit claim. The steady cycle model is unaffected by the excitation controls.

### Frequency, amplitude and time conventions

`lpftp.ts` extends the existing square-root speed law through the sourced anchor:

- rpm = 15,761 × √(RPL / 104.5), with the existing 67–109% command bounds.
- N = rpm / 60 Hz; blade tones are 4N, 8N, 16N.
- HOSC frequency = selected order × N. Order is independently adjustable from 6.4 to 6.7, default 6.55. This range is shown as a shaded reference band, not a broadband PSD.
- Relative pressure RMS amplitudes are explicitly chosen: 1, 0.38, 0.16 for the blade tones; 1.15 × excitation strength for HOSC. These do not scale into measured pressure or vibration units. Power moves frequencies; source strength controls amplitude independently.
- The synthetic waveform is the sum of √2 Aᵣₘₛ sin(2π f t + phase) for the enabled lines. Total long-record RMS is the square root of the sum of squared line RMS values. The eight-millisecond viewing window is not used to estimate RMS or PSD.
- Frequency view uses a fixed 0–5,000 Hz axis; order view uses 0–18N. Frequencies move with power, while the blade orders remain fixed. Engine-off and incomplete-startup states show no forcing.

The shared playback clock integrates shaft turns from the same frequency map, divided by 1,200 for legible motion, and separately integrates HOSC phase using the selected order. Parameter changes preserve phase continuity; pause freezes the rotor, cavities, travel markers and time-trace phase. Four main blades plus four shorter splitters replace the previous generic LPFTP pump rotor in the engine cutaway. Cavities on the main blades share one growth/collapse pulse to illustrate in-phase HOSC. Blade profiles, cavity volume, probe position and wave travel distances are schematic; no propagation speed or attenuation is inferred from the moving rings.

The study opens with an inducer close-up; Whole pump restores the surrounding hardware. Bright violet vapor envelopes follow the main blades from their inlet edges, lengthening and thickening with the common cavity pulse. Small trailing specks follow that same pulse and do not represent an independently modeled shedding process. Cavity dimensions are exaggerated for visibility and are not calibrated vapor volume or void fraction. The on-scene growth/collapse indicator uses the same phase and excitation strength; rings are separately identified as pressure-wave markers. Zero excitation, blade-only mode and shutdown remove the vapor. Neither the camera nor these visibility changes affect the frequency or pressure models.

Optional Web Audio uses four sine oscillators at the displayed line frequencies and the same relative amplitudes, at a fixed low playback gain. Audio is opt-in, muted while paused or engine-off, and its context closes on leaving the LPFTP study. It is neither a recording nor a calibrated sound-pressure prediction; it is not synchronized to the deliberately slowed visual clock.

Two guided-tour stages compare blade tones alone with combined HOSC. The normal LPFTP component panel links to the study; Engine location returns to the assembled pump in the full engine.
