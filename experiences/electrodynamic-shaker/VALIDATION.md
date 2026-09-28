# Validation — Inside the Shaker

Checked locally on 2026-09-27 with Node 22.22.1 and the Codex in-app Chromium browser.

## Automated checks

`npm test`: **29 tests passed**.

The tests cover:

- Force reversal, force scaling with current and field, and the radial/circumferential cross product around a full revolution.
- Signed back EMF and its velocity scaling; resistive/inductive voltage; field-coil `I²R` heating.
- Fixed-force acceleration versus mass; constant-acceleration displacement and velocity frequency scaling.
- Separate field and drive supplies, zero-field current heating, monotone field calibration, and DC equilibrium force balance.
- Newton's law and Kirchhoff's voltage law over multiple frequencies, payloads and instantaneous phases.
- Mean electrical power versus copper heat and mechanical damping, independently integrated over 2,048 phase samples.
- Every capability limit across 852 combinations of frequency, field and payload; the active constraint is reached, and no modeled constraint is exceeded.
- Nominal derived stroke, velocity, current and voltage regimes, without imposing their order.
- Payload acceleration at unchanged delivered force; passive electrical input impedance.
- Display gain independent of current, field and payload at a fixed frequency, and a domain sweep verifying visible winding travel stays inside the axial working gap.
- Physical versus playback frequency, reversible logarithmic slider mapping, the 76-second/20-stage tour, finite tour states, and forward/backward navigation across every exact stage boundary.

`npm run build`: **passed** (strict TypeScript and Vite production build).

`git diff --check`: **passed** for the workspace's tracked changes. The new app's source is formatted with Prettier. Existing dirty root files and the companion isolation experience were retained.

## Browser inspection

Desktop checks used **1440 × 900**, **1280 × 800**, and the native **1280 × 720** preview. Responsive checks used **390 × 844** with scrolling to the control dock; no horizontal document overflow was observed.

All eight camera presets were visually inspected: System, Cutaway, Field coil, Air gap, Drive coil, Armature, Suspension, and Exploded. The four machine displays and six learning modes were exercised. The two windings have separate persistent labels. Additional close-up labels identify the gap, center pole and flexures; the magnetic-circuit view identifies the return path.

The geometry inspection checked the stationary housing/field winding, rigidly connected moving winding/former/table, flexure attachment and motion, radial gap clearance, positive/negative axial travel, payload attachment, and separated exploded parts. Fixed suspension supports and the upper anchor ring are visible. The lower support and magnetic yoke are sectioned to keep the working gap readable.

Observed control cases included:

| Interaction                          | Observed result                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Start/reset                          | Field and drive both zero; no flux or table motion                                                         |
| Full field, zero drive               | 12 A DC, 1.20 T, 720 W field heat, zero force                                                              |
| Manual +8 A / −8 A                   | +640 N / −640 N; ±10.67 mm equilibrium offset; force and current directions reverse                        |
| Sine, 5 Hz, 35% requested level      | Stroke-limited current of 7.62 A peak, 12.50 mm peak displacement and 1.26 g peak acceleration             |
| Sine, 2 kHz, full requested level    | Voltage-limited 7.97 A peak, 120 V peak terminal demand; inductive contribution dominates                  |
| Added 60 kg payload around 95.6 Hz   | 72 kg total moving mass, 6.81 g peak capability at 60 A peak, and the bare-table comparison remains higher |
| Tour's final 40 kg payload at 100 Hz | 52 kg total moving mass, 9.44 g peak capability                                                            |
| Manual back-EMF view                 | Explains zero velocity/back EMF at DC equilibrium and offers a sine-mode transition                        |
| Model notes                          | Native modal opens with focus inside; Escape closes and returns focus                                      |

The automatic guided tour ran from its powered-off start through completion. Paused Next/Previous navigation was also tested in the production build. This found a floating-point boundary bug that could stall repeated Next clicks; it was corrected with a shared stage-seek function and a regression test traversing all 20 stages. Ten paused Next clicks now reach the reversal stage; Previous returns to the positive-current stage.

Layout fixes removed collisions between contextual charts/notes and the lesson navigation. On mobile the camera selector sits below the machine, and the field/payload controls sit above the separate drive controls.

A clean production-preview tab reported no console errors. During development, a transient hot-reload error occurred while changing scene props; it was not reproduced after a full load of the production bundle. Free orbit, camera reset, click-to-set frequency, tour exit, Explore, and complete experiment reset were also exercised.

## Test-lab environment refinement — 2026-09-27

- Added a procedural laboratory based on the user's photograph: paneled walls, navy foundation, amplifier cabinet, fixed cable runs, yellow floor outline, orange lifting jib, service lights, and wall cooling unit. The new scenery is static and does not change the electromechanical equations.
- Added the Test lab camera. Inspected Test lab, System, Exploded and Air gap, including the powered winding at 12 A field / +8 A drive / 640 N. Switching to Test lab preserves Assembled mode.
- Checked 1440×900 and 1280×720 desktop previews and 390×844 mobile. Mobile document width was 390 px with no horizontal overflow. Added contrast panels for the playback information over the brighter floor.
- All 29 tests and the TypeScript / production build passed. Changed source passed Prettier; `git diff --check` passed. The clean production preview reported no console errors.
- Saved `previews/test-lab-desktop.jpg` and `previews/test-lab-mobile.jpg`.

## Scope

This validates the stated educational equations and local browser behavior, not a manufacturer's ratings, electromagnetic finite-element model, thermal design, or physical shaker. The model's explicit limitations and primary references are in [README.md](README.md) and the in-app notes. The high-frequency rigid-armature idealization does not include real armature or fixture modes. Other browser engines and physical mobile devices were not part of this check.
