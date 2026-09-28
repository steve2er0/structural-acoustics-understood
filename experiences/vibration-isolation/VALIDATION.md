# Validation record

Validated locally on 2026-09-26 (America/New_York). This record distinguishes analytical-model checks, browser behavior, and physical validation.

## Numerical checks

`npm test`: **15 tests passed**. The physics module has no graphics dependencies.

- Baseline mass conversion, natural frequency, acceleration-to-displacement conversion, damping coefficient, and static sag.
- Square-root stiffness/mass scaling.
- Unit transmission and zero lag at zero frequency.
- Exact unity crossing at `r = √2` for several damping ratios, including the undamped case.
- Exact amplitude and phase at `r = 1`, correct phase quadrants, and the damped/undamped high-frequency limits.
- Damping reduces resonance amplification and increases high-frequency transmissibility.
- **405 parameter combinations** (3 masses × 3 stiffnesses × 3 damping ratios × 5 frequencies): substitution of the complex response into the original governing equation gives normalized residual below `1e-10`. Independently evaluated spring-plus-damper force amplitude agrees with `mω²X` to that tolerance.
- Signed time-domain force closure at 40 phases for each of four frequencies.
- Constant-acceleration force normalization, dB sign, invalid-input rejection, and explicit undamped-resonance singularity.
- Common visualization gain preserves both body motions, never alters the solution, and bounds relative display travel.
- Small-displacement formatting retains nanometer responses instead of displaying zero.
- Logarithmic frequency-control round trip and continuous, monotonic sweep with its resonance hold and 600 Hz endpoint.

Representative baseline results, also recalculated independently in Python:

| Excitation |  T = X/Y | Payload phase | Isolation dB |  Base peak Y | Payload peak X | Dynamic force, total |
| ---------- | -------: | ------------: | -----------: | -----------: | -------------: | -------------------: |
| 5 Hz       | 1.041621 |      −0.0763° |      −0.3542 |  9.936214 mm |   10.349772 mm |          46.333626 N |
| 25 Hz      | 6.329494 |     −80.9097° |     −16.0274 |  0.397449 mm |    2.515648 mm |         281.549940 N |
| 100 Hz     | 0.079079 |    −144.9376° |     +22.0388 | 24.840535 µm |    1.964367 µm |           3.517614 N |
| 600 Hz     | 0.006901 |    −104.2139° |     +43.2220 |  0.690015 µm |    4.761683 nm |           0.306965 N |

These are ideal linear harmonic-response results, not measured hardware data. In particular, the displayed assembly's spring shape is not a spring-design calculation.

## Build and browser checks

- Strict TypeScript check and Vite production build passed.
- Inspected desktop at 1440×900, compact laptop at 1280×720, and mobile at 390×844. Mobile uses vertical scrolling and had no horizontal document overflow.
- Exercised frequency preset buttons, the slider, and curve selection. Clicking the rendered 100 Hz tick position selected approximately 99.9 Hz (pixel precision), verifying the SVG coordinate mapping under its responsive aspect ratio.
- At 25 Hz, increasing damping from 0.08 to 0.40 changed transmission from 6.33× to 1.60× and phase lag from 80.9° to 51.3°.
- At 600 Hz, increased damping produced greater transmission. Softening total stiffness to 20 kN/m moved fₙ from 25.0 to 10.6 Hz and the isolation threshold from 35.4 to 14.9 Hz.
- Increasing payload mass from 10 to 30 lb moved fₙ to 14.4 Hz. Reset restored the 10 lb / 25 Hz baseline and cleared visualization toggles.
- Full sweep advanced from low frequency through resonance to 600 Hz, returned the button to “Run Sweep,” and ended at T = 0.0069.
- Verified Force Flow, Motion Envelope, signed phase readouts, physical displacement notes, and the mass control.
- Exercised orbit, zoom, System, Isolator, Side, Force path, and Exploded controls. Preset selections and scene framing changed; the Force path preset enabled Force Flow.
- Production browser checks after replacing nested DOM label roots reported **zero console errors**. A dependency emits a nonfatal `THREE.Clock` deprecation warning; no warning suppression was added.
- A two-second foreground `requestAnimationFrame` sample at the desktop viewport recorded approximately 120 callbacks/s. This is a limited local observation, not a hardware-independent GPU benchmark or sustained-performance guarantee.

Previews are in `previews/`. Browser QA was performed on this new application at its own localhost origin/port, separately from the parent reference application's routes.

## Shaker and signal generator refinement

- Replaced the display plinth with a fixed shaker housing, cooling ribs, a mounting foot, and a moving armature stem. A flexible collar follows the same calculated base motion as the plate; no independent body-motion scaling was introduced.
- Geometry check: base travel is bounded by ±0.085 scene units. The collar height is 0.19 plus base travel, so it remains positive (0.105–0.275); the armature stem remains inside the housing at both extremes. These are display-connectivity checks, not hardware stroke specifications.
- Moved frequency input, logarithmic slider, presets, and Run Sweep to a native HTML instrument face projected onto the separate generator chassis. The cable terminates at the fixed housing. Model notes identify the ideal prescribed-acceleration drive assumption.
- Pointer-dragged the slider directly on the angled face from 25 Hz to about 166.9 Hz; the scene and response curve updated together. Clicking Run Sweep on the face completed at 600 Hz / T = 0.0069.
- Checked numeric entry at 1 Hz, resonance at 25 Hz, and the 600 Hz endpoint. Isolator and Side close-ups retained usable generator controls; System and Exploded framed both instruments. Orbiting retained access through the fixed-panel fallback when needed.
- Inspected 1440×900 desktop, 1280×720 laptop, and 390×844 mobile. Both instruments fit in the mobile scene; the generator controls stack below it. Mobile slider keyboard input selected 600 Hz, the footer cleared the chart, and document width equaled the viewport width.
- All **15 numerical tests** and the strict TypeScript / production build passed. Browser console inspection reported **zero errors** during the refinement checks.
- Updated desktop preview: `previews/shaker-generator-desktop.png`.

## Larger shaker table

- Enlarged the circular moving table to radius 3.35 scene units, larger than the mounting fixture's 3.113-unit corner radius. Every corner has at least 0.237 units of radial clearance; the payload and fixture dimensions are unchanged.
- Resized the surrounding housing, collar, stem, foot, and cable connection to match. Vertical motion and the physical response equations are unchanged.
- Production build passed; desktop and mobile visual checks confirmed the larger table surrounds the assembly. The mobile camera was widened slightly to include the larger foot.

## Test-lab environment refinement — 2026-09-27

- Added the photograph-inspired laboratory room, navy shaker foundation, amplifier cabinet, yellow floor boundary, orange lifting jib, service lights, cooling unit, and fixed cabling. A matching low stand supports the existing frequency generator. All additions are static scenery; the physical response and moving-aperture geometry are unchanged.
- Added Test lab to the camera strip. At 1440×900 its frequency controls remain projected onto the physical generator face; mobile and smaller views retain the existing readable fixed-panel fallback.
- Inspected System, Test lab and Isolator views. At 390×844 all six camera buttons fit, document width stayed 390 px, and selecting 25 Hz on the generator produced 6.33× transmission. Refined the mobile text backdrop for the brighter room.
- All 15 tests and the TypeScript / production build passed. Changed source passed Prettier; `git diff --check` passed. Production preview console errors were empty.
- Saved `previews/test-lab-desktop.jpg`, `previews/test-lab-wide.jpg`, and `previews/test-lab-mobile.jpg`.

## Shaker proportions correction — 2026-09-27

- Replaced the squat housing with a taller cream cylinder, vent band, navy trunnion supports, and matching foundation, using the supplied lab photo for visual proportions. Reduced the payload/fixture/table together to 62% of their prior drawing size and raised them to the new housing lip. The generator is 58% of its prior size on a metal bench; the amplifier and hoist now provide consistent room scale.
- Checked the scaled table radius (2.077 scene units) against the fixture corner radius (1.9302): all corners remain inside the table with 0.1468 units of radial clearance. The compliant boot is 0.0651–0.1705 units tall over the full displayed base travel and joins the table underside exactly. Generator feet meet the bench top at y = −0.2649.
- Included the uniform assembly scale in the reported displacement gain. The physical solution, shared motion ratio/phase, spring connections, and prescribed acceleration remain unchanged. All 15 numerical tests and the strict TypeScript / production build passed.
- Desktop checks covered System, Test lab, Isolator and Exploded, with 25 Hz still showing 6.33× transmission. Checked the projected generator face on the 1440×900 desktop and the native compact preview; numeric input and the frequency slider remain attached to the resized instrument. Slider keyboard input reached 600 Hz / T = 0.0069. At 390×844 the complete shaker, fixture, and generator remain visible, with no horizontal overflow; the context cabinet can be inspected with Test lab. The production console reported no errors. Saved `previews/corrected-lab-proportions.jpg` and `previews/corrected-lab-mobile.jpg`.

## Limits and remaining validation

No physical shaker test, isolator manufacturer qualification, Safari/Firefox matrix, extended thermal/performance soak, or transient-response validation was performed. Mobile received a usability/layout pass; touch gesture and low-end mobile GPU qualification remain future work. The sweep is explicitly quasi-steady, and playback/displacement scaling are labeled in the interface and README.

The parent application's existing working changes were preserved. Its standalone bundle was not regenerated because this exhibit is a separate Vite application and changes no parent runtime modules.
