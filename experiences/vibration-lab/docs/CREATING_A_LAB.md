# Creating a New Vibration Lab Experiment

Start with `src/dev/LabTemplate.tsx`. It is a working small scene, not a copy of either production lab. Run `npm run dev` and visit `/dev/lab-template` to inspect its slider, readout, vector, camera transition, projected label, highlight and three-step tour. This route is deliberately unavailable in production.

## 1. Write a pure model first

Create `src/labs/your-lab/physics.ts`. Accept explicit SI values and return an explicit solution. Do not import React or Three here. Add meaningful regression cases for limiting behavior, units, sign/phase and the governing balances.

```ts
// Illustrative statics, not a new production lab.
export function equilibrium(forceN: number, stiffnessNPerM: number) {
  if (!(stiffnessNPerM > 0))
    throw new RangeError("Positive stiffness required");
  return { displacementM: forceN / stiffnessNPerM };
}
```

Do not change a solution to make its animation easier to see. Choose a display gain in a separate visualization module and disclose it in the UI.

## 2. Assemble a scene from shared tools

```tsx
import { useState } from "react";
import { LabCanvas, LabEnvironment, SceneBoundary } from "@engine/Scene";
import { CameraController, type CameraPresets } from "@engine/Camera";
import { EngineeringVector } from "@engine/EngineeringVector";
import { ParameterSlider, EngineeringReadout } from "@components/Controls";

const presets: CameraPresets<"System" | "Closeup"> = {
  System: { position: [4, 3, 6], target: [0, 0.7, 0] },
  Closeup: { position: [2, 2, 3], target: [0, 0.7, 0] },
};

export default function SmallScene() {
  const [force, setForce] = useState(3);
  return (
    <>
      <div style={{ height: 420 }}>
        <SceneBoundary>
          <LabCanvas camera={{ position: presets.System.position, fov: 40 }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[3, 6, 4]} intensity={3} />
            <LabEnvironment />
            <mesh>
              <boxGeometry args={[1, 0.5, 1]} />
              <meshStandardMaterial color="#6d9390" />
            </mesh>
            <EngineeringVector
              origin={[0, 0.3, 0]}
              magnitude={force}
              gain={0.18}
              maxLength={2}
              label="F"
            />
            <CameraController presets={presets} view="System" />
          </LabCanvas>
        </SceneBoundary>
      </div>
      <ParameterSlider
        label="Applied force"
        unit="N"
        min={-10}
        max={10}
        value={force}
        onValue={setForce}
      />
      <EngineeringReadout label="Physical force" value={force} unit="N" />
    </>
  );
}
```

Set a scene container height. Camera controls automatically interpolate to the preset, and dragging interrupts that transition. Change `view` to select another preset. Increment `revision` to restore the current preset after orbiting. Supply a stable `responsive(preset, view, width)` function if mobile composition needs different framing.

For frame-rate animation, instantiate `EngineeringVectorObject` once and call `sample({ origin, direction, physicalValue, visualLength })` in `useFrame`. Reuse vectors rather than allocating them in the loop; call `dispose()` on unmount. The physical value remains available independently of arrow length. Pulse controls glyph opacity; sign/direction belongs to the physical model.

## 3. Add a tour as content

```tsx
import { useGuidedTour } from "@engine/useGuidedTour";
import { TourTransport } from "@components/TourTransport";

const steps = [
  { duration: 5, title: "Start at zero.", force: 0, camera: "System" },
  { duration: 5, title: "Apply a force.", force: 8, camera: "Closeup" },
  { duration: 5, title: "Reverse it.", force: -5, camera: "System" },
] as const;

// Inside the lab component, with its own state setters:
const tour = useGuidedTour({
  steps,
  paused,
  onSample(step, time, progress, entered) {
    if (entered) {
      setForce(step.force);
      setView(step.camera);
      setRevision((n) => n + 1);
    }
    // Optional: use progress to interpolate selected parameters.
    // time is total tour time; progress is normalized within this stage.
  },
});
```

Call `tour.start()` to start/restart, `tour.stop()` for manual exploration, `tour.reset()` for a complete reset, and `tour.jump(-1 | 1)` to step even while paused. Supply `paused` from lab state so the same pause button can pause both physical animation and tour time. Starting a tour should explicitly clear that pause.

Render `TourTransport` with `index`, `count`, `time`, `duration`, `paused`, `onPause`, `onJump`, and `onExit`. Narrative can live in the lab's existing story panel or in the transport's `title`/`copy`. Steps may contain arbitrary typed fields such as `focus`, `annotation`, `display`, or `equation`; apply those through your own state setters on entry. Keep shared playback behavior out of the content module.

## 4. Add labels and focus

Create a native DOM element outside the Canvas, inside a relatively positioned scene container. Keep a ref to it and a memoized `createAnnotationProjector()` inside the scene. From `useFrame`, call the projector with the ref, world coordinates, camera and size. Options include `visible`, `offsetX`, `offsetY`, `centered`, `margin` and `keepInside`. Use `keepInside` for narrow-screen labels and hide secondary labels in closeups. See the template's `World` component for the complete pattern.

Apply `highlightIntensity(physicalGlow, focused)` to `meshStandardMaterial.emissiveIntensity`; choose the emissive color in your lab. Do not encode focus by overwriting a physical current/temperature signal. Never dim controls needed to exit the focus state.

## 5. Use units and plots at the display boundary

Use `fromSI`, `toSI`, `convert`, `formatSI`, `engineeringNumber`, and `displacement` from `@engine/units`. Specify peak/RMS conventions in labels. Do not mistake lbm for lbf or map degrees to radians without an explicit boundary. Native logarithmic controls need positive `min` and `max`, for example:

```tsx
<ParameterSlider
  label="Frequency"
  value={frequency}
  min={1}
  max={600}
  logarithmic
  unit="Hz"
  marks={[1, 25, 100, 600]}
  onValue={setFrequency}
/>
```

For an interactive logarithmic SVG curve:

```tsx
<EngineeringPlot
  viewBox="0 0 520 172"
  domain={[1, 600]}
  plotLeft={37}
  plotWidth={467}
  onSelect={setFrequency}
  role="img"
  aria-label="Frequency response; use the frequency slider to adjust"
>
  {/* your axes, curve, operating point and thresholds */}
</EngineeringPlot>
```

`onSelect` receives engineering frequency, mapped with the SVG's actual screen transform. Provide a labeled native slider as the keyboard equivalent. SVG curve generation remains your model's responsibility.

## 6. Register only the finished production lab

Add its metadata to `src/app/labs.ts`, extend the `LabDefinition.id` union, lazy import its entry component in `src/app/App.tsx`, and add the route branch. Add an actual model preview in `Preview.tsx` when appropriate. The navigation reads the registry. Keep development prototypes out of that registry.

Scope new CSS below a unique `.lab-your-name` wrapper. Use tokens in `design/platform.css` for surfaces, typography, spacing, opacity, borders and motion. Keep navigation and controls legible at 390 px. The template has no dependencies on the two production labs; a third lab should not need to import their state hooks or UI.

## 7. Qualify the result

Run `npm test` and `npm run build`. Then use the actual page at desktop and phone widths. Check direct-route reload, home/back navigation, slider endpoints, camera interruption/reset, tour pause/next/previous/exit/restart, and the model's physical limits. Check console errors on a clean production load separately from hot-reload diagnostics. Add a concise validation record describing what was observed, plus remaining model limits.
