# v0.1 extraction plan

Baseline: Isolation 15 tests and Shaker 29 tests pass. Both running production experiences were exercised before modification: Isolation at 25 Hz gives T = 6.329; Shaker with 12 A field and +8 A drive gives 1.20 T and +640 N. Screens inspected at 1280 × 720.

## Preserve

- Existing pure SI solvers, regression cases, physical constraints, narrative and controls.
- Isolation assembly scale 0.62 and lift 1.55, tall shaker housing, table clearance, generator scale 0.58 and bench. Its perspective-projected native controls and fallback remain lab-specific.
- Shaker mesh sections, winding direction, material updates, flexures, force balance and current/voltage limiting. Existing 20-stage / 76-second tour content stays intact.
- Specialist plots and field geometry. Extract their surfaces and interaction, not their engineering meaning.

## Extract

1. Move the two source trees into one Vite application; keep the reference/calculator application untouched. Scope lab CSS to prevent collisions. Add lazy routes and a common navigation bar.
2. Share canvas defaults/loading/fallback, camera transitions and environment lighting. Preserve each lab's preset coordinates and responsive framing.
3. Share engineering controls, SI/display units, logarithmic/scaling utilities, plot pointer mapping, vector glyphs, projected annotations and focus emphasis.
4. Introduce a small pure tour timeline plus React playback hook. Labs own content and application of step state. Retain the isolation sweep separately as a distinct experiment control.
5. Build a cinematic home with previews from actual lab models and a development-only template using the same primitives.
6. Verify original regressions plus new platform invariants; production build, direct routes, navigation, both labs and template at desktop/mobile; document source authority and extension workflow.

No central store, schema DSL, new experiments, backend, physics rewrite or rendering framework migration is needed.
