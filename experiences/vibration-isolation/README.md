# Vibration Isolation — migrated to Vibration Lab

The authoritative source now lives in [`../vibration-lab/src/labs/isolation`](../vibration-lab/src/labs/isolation). This folder retains historical validation and screenshots. Its npm commands delegate to the unified app.

From this folder, `npm run dev` starts Vibration Lab at http://127.0.0.1:5174/ . Open `/labs/isolation`. For setup, architecture and extension instructions see the [Vibration Lab README](../vibration-lab/README.md).

<details>
<summary>Original demo documentation (historical paths and ports)</summary>

# Vibration Isolation

An original, locally runnable interactive engineering exhibit: a machined avionics payload, four parallel spring–damper mounts, a shaker with a moving armature, a separate frequency generator, and a live frequency response. Inspired by the spatial explanation and direct manipulation of [The Plane of Focus](https://sael.net/plane-of-focus/); no source code, models, textures, or designs were copied from that site.

This is a separate React/TypeScript/Vite application inside the Structural Acoustics repository. It has its own dependencies and build. It does not modify the existing single-stage, Sorbothane, two-stage, or generated standalone tools.

## Run locally

Use Node.js 22.12+ (or a supported newer LTS) and npm.

```bash
cd experiences/vibration-isolation
npm ci
npm run dev
```

Open **http://127.0.0.1:5174/**. The development server binds to loopback only. If that port is occupied, stop the existing server or explicitly change the port in `package.json`.

```bash
npm test           # independent physics and visualization tests
npm run build      # strict TypeScript check + production build
npm run preview    # serves dist on the same port; stop dev first
```

Deploying later requires only the generated `dist/` directory on a static HTTP server. The relative asset base supports subdirectory hosting. There are no accounts, analytics, external runtime fonts, remote environment maps, backend services, or API keys. Fonts are bundled from Fontsource; geometry, labeling textures, and the lighting environment are created locally. WebGL 2 is required for the scene; the chart and calculations are ordinary HTML/SVG.

## Explore

- Drag the **frequency slider on the signal generator** beside the shaker, type into its display, click a frequency tick, or drag the curve. The controls follow the instrument in perspective. Close-up views and mobile use a readable fixed instrument panel.
- **Run Sweep** traverses 2–600 Hz over 24 seconds of active playback, with a three-second hold at the natural frequency. Manual parameter changes or Pause stop the sweep.
- Vary **Mount stiffness** (20–320 kN/m total) and **Damping ratio** (0.01–0.40). The purple comparison curve holds damping at 0.40 with the same mass and stiffness.
- Toggle **Force Flow** for signed net dynamic force on the payload, and **Motion Envelope** for peak absolute payload travel. Physical peak displacements and relative mount travel appear alongside.
- Orbit by dragging the scene; zoom with the wheel; right-drag to pan. Choose System, Isolator, Force path, Side, Exploded, or Test lab for smoothly interpolated views. Orbiting interrupts the camera transition.
- **The model** contains units, equations, actual displacements, force, assumptions, and a 2–30 lb mass control. Reset experiment restores the documented baseline.
- Keyboard: **1** = 0.2 fₙ, **2** = fₙ, **3** = 4 fₙ; **Space** pauses motion; **R** resets the view. Shortcuts do not override form controls or the modal. Escape closes the modal. Native sliders support arrow keys, Home, and End.
- Reduced-motion preference starts the apparatus paused. A user can explicitly play or run the sweep.

## Test-lab environment

The shaker and procedural room are inspired by the supplied vibration-laboratory photograph: a tall cream field housing in a navy trunnion cradle, blue-gray wall panels, navy equipment foundation and amplifier cabinet, yellow floor boundary, an orange lifting jib, service lights, cooling unit, and fixed cable runs. A bench-sized signal generator sits on its own metal stand. **Test lab** pulls the camera back to show the complete bay; **System** returns to the apparatus. All geometry and printed textures are generated locally.

The room and service equipment provide visual context only. Their geometry adds no mass, support compliance, thermal behavior, amplifier characteristics, or horizontal slip-table dynamics to the model. The existing response equations are unchanged. `scene-layout.ts` keeps the resized assembly, armature boot, generator chassis, projected controls, and bench aligned. Both moving bodies use the same uniform assembly scale, which is included in the displayed displacement gain. These are inferred visual proportions, not dimensions measured from the photograph. The two independent apps each bundle their own `TestLab.tsx` so either can be built and served independently.

## Physical model

One rigid mass translates vertically about static equilibrium. Four identical linear, viscously damped mounts share load equally. Their stiffnesses and damping coefficients add in parallel. The equation is

```text
m ẍ + c(ẋ − ẏ) + k(x − y) = 0
ωₙ = √(k/m)                 fₙ = ωₙ/(2π)
ζ = c/(2√(km))              r = f/fₙ
H = X/Y = (1 + i2ζr)/(1 − r² + i2ζr)
T = |H|                    φ = arg(H)
y = Y sin θ                x = Y T sin(θ + φ)
```

Here `x` is absolute payload displacement, `y` is prescribed base displacement, and `x−y` is mount travel. All numbers are SI internally; all amplitudes are **peak**, not RMS. Phase is computed with `atan2` to preserve the correct quadrant. The screen reports positive phase lag, `−φ`.

The default is **10 lb = 4.5359237 kg**, **fₙ = 25 Hz**, **k = 111.919 kN/m total** (about 27.980 kN/m per mount), **ζ = 0.08**, and **f = 5 Hz**. These are explicit teaching assumptions, not manufacturer properties.

Base acceleration stays at **1 g peak = 9.80665 m/s²**. Therefore `Y = g/(2πf)²`: the real base displacement becomes smaller at higher frequency. Displacement and acceleration transmissibility are equal at a common harmonic frequency.

Dynamic mount-force amplitude is `F = mω²X`. Signed net force **on the payload** is `−mω²x`, consistent with `k(y−x) + c(ẏ−ẋ)`. The reaction on the base is opposite. The four equal mounts each carry one quarter of this dynamic force; static weight is excluded from Force Flow. `F/(m a_base) = T` for this input convention. High-frequency force need not fall under a constant-displacement input, which this exhibit does not use.

Isolation is `−20 log₁₀(T)` dB: positive means attenuation; negative means amplification. Isolation starts at `r > √2`, independently of damping. The shaded “resonance region” starts at `r = 0.7` as a teaching convention, not an exact physical boundary. The undamped natural frequency is not quite the frequency of maximum transmissibility at finite damping.

## Honest visualization

Physics, playback, and drawing scale are separate:

- `sampleMotion` returns actual displacements and signed force.
- `motionScale` chooses **one common linear gain** for both bodies. Neither displacement is independently clipped or normalized. The ratio, relative travel, and phase stay intact.
- The nominal drawing scale is 8 scene units/m; the displayed gain includes the assembly’s 0.62 uniform scene transform. The label shows the extra gain relative to this scale, including attenuation below 1×. The hardware geometry is schematic.
- Playback uses roughly 0.65–1.35 cycles/s so high-frequency motion remains visible without aliasing. This displayed rate is explicitly labeled. The phase difference uses the actual model.
- Force arrows reverse with calculated force sign. Their length and opacity use a compressed, bounded transmission ratio for visibility; they are not calibrated force rulers or energy-flow particles.
- The envelope is the peak **absolute payload displacement about equilibrium** at the current common display gain. Relative mount travel is reported separately.
- The shaker housing stays fixed. The former base plate is the moving armature, with a stem that remains inside the housing and a collar that spans from the fixed lip to the moving plate. Displayed base travel is at most ±0.085 scene units; the collar stays between 0.105 and 0.275 units tall, and the stem stays engaged throughout the cycle.
- The generator sets excitation frequency. An ideal drive maintains the prescribed 1 g peak acceleration; amplifier, controller, and armature dynamics are not additional degrees of freedom in this model.
- Exploded spacing is an additive illustration, independent of the physical displacements.

The sweep evaluates successive **steady harmonic solutions**. It is not time integration of a swept-frequency transient. It does not predict startup, transient buildup, random vibration, shock, rotations, nonlinear elastomer behavior, mount bottoming, temperature effects, or fatigue. Physical testing is outside this implementation.

## Architecture

| File                   | Responsibility                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/physics.ts`       | Pure SI model: `naturalFrequency`, `dampingRatio`, `transmissibility`, `phase`, `responseAmplitude`, `transmittedForce`, harmonic solution and samples. No React/Three imports. |
| `src/visualization.ts` | Common motion gain, playback rate, log frequency mapping, sweep schedule, unit formatting.                                                                                      |
| `src/state.ts`         | Parameters, scene toggles, sweep lifecycle, cancellation, and view selection.                                                                                                   |
| `src/Hardware.tsx`     | Procedural payload, cooling fins, connectors, plates, springs/dampers, bolts, force arrows, envelope.                                                                           |
| `src/Instruments.tsx`  | Fixed shaker housing, flexible collar, signal generator chassis, fallback display, and connecting cable.                                                                        |
| `src/Generator.tsx`    | Accessible native frequency input, slider, presets, and sweep button on the instrument face.                                                                                    |
| `src/Scene.tsx`        | Lighting, locally generated environment, instrument-face projection, orbit/camera interpolation, render loop.                                                                   |
| `src/Curve.tsx`        | Original SVG logarithmic response curve, comparison, thresholds and draggable operating point.                                                                                  |
| `src/App.tsx`          | Exhibit composition, controls, contextual explanations, model dialog and keyboard navigation.                                                                                   |
| `src/style.css`        | Desktop composition, compact-height layout, responsive layout and visual tokens.                                                                                                |
| `src/physics.test.ts`  | Model, force closure, singular behavior, scaling, and sweep tests.                                                                                                              |

React owns parameter state; Three.js refs handle frame-by-frame motion without rerendering the UI every frame. The 3D bundle loads separately. Lighting is generated locally, pixel ratio is capped at 1.5, geometry is reused, and the subtle contact-shadow texture is baked once. Real-time directional shadows follow the moving hardware. The instrument face uses a perspective matrix with native browser hit testing; the same controls dock when the instrument is out of view or too oblique. HTML annotations are projected from world coordinates and share the application's React root, avoiding nested label-root lifecycle issues during reloads or view changes.

## Validation

See [VALIDATION.md](VALIDATION.md) for the numerical checks, representative results, browser checks, and limitations.

## Future enhancements

- A separately labeled transient solver with ramp rate, startup and initial conditions.
- Input choices for constant displacement, velocity, or acceleration, with consistent force interpretation.
- A physical-time oscilloscope comparing base, payload, and relative travel.
- Exportable parameter studies, versioned persistence, shareable URLs, and accessible textual curve tables.
- An explicit mount-travel limit and warnings based on user-supplied qualification data.
- Further mobile interaction tuning, adaptive GPU quality, and a 2D fallback for devices without WebGL.
- Integration into the parent reference application's route registry as an optional exhibit; it currently remains a separately built application.

</details>
