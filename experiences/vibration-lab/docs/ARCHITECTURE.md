# Vibration Lab v0.1 architecture

Vibration Lab is one React 19 / TypeScript / React Three Fiber application. Its source of truth is `experiences/vibration-lab`. The repository's existing plain-JavaScript reference book and calculators keep their own runtime. The former experience folders retain their historical validation/previews and commands that delegate here.

## Boundaries

```
src/
  app/                  home, metadata, lazy routes, History API navigation
  components/           engineering controls, navigation, tour transport
  engine/               canvas, camera, annotation, vector, plot, tour, units
  design/platform.css   tokens and shared/product styling
  labs/rs25/            independent propulsion map, startup reveal, procedural engine, cycle schematic
  labs/sea/             independent coupled energy solver, transient state, panel assembly, modal populations
  labs/accelerometer/   independent shear sensor model, geometry, IEPE signal chain, frequency response
  labs/isolation/       SDOF model, geometry, lab state, controls, narrative
  labs/modal/           free-edge Ritz modes, transient/FFT, roving measurements, deforming mesh
  labs/shaker/          electromechanics, magnetics, constraints, geometry, lessons
  dev/LabTemplate.tsx   small development-only integration example
```

`LabDefinition` contains identity, title, description, route, subject labels and accent. React components remain ordinary components. It is intentionally not a schema describing controls, geometry or physics.

Routes `/`, `/labs/isolation`, `/labs/shaker`, `/labs/modal`, `/labs/accelerometer`, `/labs/sea`, `/labs/rs25` share one renderer dependency graph and lazy-load their application/scene code. `/dev/lab-template` is imported only when `import.meta.env.DEV` is true; production removes the import and renders a 404 for this path. Browser back/forward and direct routes work; deployment must rewrite unknown paths to `index.html`.

## State and physics

Each lab owns its parameter state and derives an explicit solution from pure functions. There is no global physics store or hidden simulation state shared between labs. Leaving a lab unmounts its scene and animation/tour loops; re-entering starts its default experiment. This is deliberate in v0.1.

Isolation's `physics.ts` remains a pure, SI, base-excited SDOF solution. Shaker's `physics/electromechanics.ts`, `magnetics/field.ts` and `shaker-model/model.ts` retain the validated phasor, force, voltage, power and capability calculations. They import no React or Three. Their original 44 regression tests are retained. Gravity and conversions now come from the pure shared units module; the equations were not rewritten.

## Rendering and camera

`LabCanvas` supplies the common renderer defaults, capped device pixel ratio and Suspense handling. `SceneBoundary` preserves the engineering controls when WebGL fails. `LabEnvironment` supplies local light cards without remote HDR files. Each lab retains its own key lights, shadow settings, backdrop, cutaway geometry and materials. Shaker uses up to 1.75 DPR; Isolation 1.5; home previews 1.25.

`CameraController` accepts a typed preset map, selected view and a revision counter (to reset an already selected view). It owns frame-rate-independent exponential position/target interpolation, damped orbit controls, travel bounds and interruption on pointer interaction. A small responsive adapter preserves each lab's existing mobile framing. Scene-specific motion clocks remain independent of camera motion.

Home cards render the actual `Assembly`/`Shaker` and `Machine` components. Idle previews render on demand. Pointer/focus interaction animates the isolation preview unless reduced motion is requested. Navigating away disposes their canvases. No embedded lab iframes, duplicated scene models or stock thumbnails are used.

## Visualization versus engineering values

`scaling.ts` provides logarithmic slider mappings, bounded linear displacement gains, vector length and slowed playback mappings. The lab chooses the policy; the utility only maps a physical value into drawing space. Isolation applies one gain to both bodies, preserving amplitude ratio and phase. Shaker keeps its existing fixed-reference gain. Disclosed isolation gain includes the assembly's uniform 0.62 scene transform.

`EngineeringVectorObject` is an imperative Three group for frequent animation. `sample()` accepts **both** `physicalValue` and `visualLength`; current direction, force direction and visible length can animate without React renders. Glyphs and GPU resources are disposed by the owner. `EngineeringVector` is the compact React wrapper for the template or low-rate changes. Shaker uses the same primitive for B/I/F/velocity/EMF and force-balance arrows. Isolation's existing small mount arrows remain custom meshes to preserve their appearance.

`createAnnotationProjector()` reuses projection storage and positions native DOM labels in screen space. It hides clipped, off-camera and lab-disabled annotations; an optional inset clamp keeps a label inside a narrow viewport. Labs choose visibility and semantic content. The generator's perspective CSS projection remains isolation-specific because a native interactive instrument face has different requirements than a label.

`highlightIntensity()` adds explanatory emphasis to a material's physical-state emission. It is used by the shaker windings, isolation springs and template. It never overwrites the current/field/heat signal. The shaker's existing magnetic-circuit opacity is still a lab-specific explanatory display.

## Controls, units and plots

`ParameterSlider` preserves native keyboard/touch accessibility, engineering value text, optional marks, formatting and disabled state. Log sliders use a normalized native thumb and report the physical value to their callback. Its `inputOnly` option allows established lab layouts to retain their exact labels/endpoints. `EngineeringReadout`, `Toggle` and `SegmentedControl` provide shared semantics without a component framework.

`units.ts` centralizes dimensional conversions and display formatting. Internal model state remains SI. `toSI`/`fromSI` convert at the boundary; `convert` rejects incompatible dimensions (e.g. N to kg). Hz and rad/s share a frequency dimension with the explicit 2π conversion. Peak/RMS and percentages are _meaning_, not conversion shortcuts; lab labels must specify them. Historical lb labels in Isolation mean payload mass, not force.

`EngineeringPlot` supplies the SVG surface and pointer capture. Coordinates use the SVG's inverse screen transform, so letterboxing and responsive resizing do not change the selected physical frequency. Both transmissibility and capability plots use it. The plotted physics, thresholds, current points, region shading and limit colors remain lab-specific SVG children. `logScale` is available for new axes. This is not a general charting package.

## Tours and motion

`timeline.ts` provides pure duration, sampling and previous/next behavior for positive, variable-duration steps. Exact decimal boundaries have a tolerance. `useGuidedTour` owns autoplay, pause, start/restart, step seeking, exit and completion. It pauses elapsed time in background tabs, caps elapsed increments and publishes at about 30 Hz only while active. Cleanup cancels its frame callback.

Content is arbitrary typed lab data. The `onSample(step,time,progress,entered)` callback applies parameters, camera, display/visibility, focus, equation/lesson and text. Stage changes apply once; a lab can interpolate selected parameters during a stage. Shaker keeps its 20 original stages, cumulative parameters and smooth ramps. Isolation defines a five-stage lesson. Its original 24-second sweep remains a separate experiment control and is mutually exclusive with the guided tour. `TourTransport` supplies consistent pause/previous/next/exit controls.

Tokens define UI, camera and tour timing vocabulary. UI uses `--vl-fast`, `--vl-normal` and `--vl-ease`; camera convergence uses its established exponential easing rather than pretending to have a fixed duration. Both labs honor reduced motion for their initial animation state. A user can explicitly start a tour or motion.

## Styling and performance

`platform.css` defines shared colors, typography, spacing, surfaces, numbers, navigation, motion and home design. Existing lab CSS is scoped under `.lab-isolation` or `.lab-shaker`; route loading cannot leak global selectors into the other lab or home. Lab layouts are intentionally retained.

Frame animation updates Three objects and DOM transforms directly. It does not set React state for every rendered frame. New code should avoid repeated vector/material allocations in frame callbacks and dispose manually created geometries, textures and materials. No postprocessing, backend, account state, content management or speculative cross-lab simulation infrastructure is included.
