# Other-Agent Handoff

Use this document when another agent or computer performs the bulk tool migrations.

## Required reading

Before editing, read completely:

1. `docs/engineering-tool-design-guidelines/README.md`
2. `docs/engineering-tool-design-guidelines/COMPONENT-INVENTORY.md`
3. `docs/engineering-tool-design-guidelines/MIGRATION-MATRIX.md`
4. `docs/sorbothane-isolation/README.md`
5. `js/workbench-runtime.js`
6. `js/engineering-workbenches.js`
7. `js/engineering-results.js`
8. The calculator, data, visualization, and tests for the assigned tool

Inspect the current checkout before relying on line numbers in these documents.

## Authority and boundaries

The migration author may:

- Adapt an assigned tool to approved shared components.
- Add or update the tool's adapter, domain visual, and focused tests.
- Propose a missing shared primitive in a separate foundation commit.
- Preserve and improve engineering interpretation, validity, and provenance.

The migration author must not:

- Copy `.sorbo-*` markup or CSS into another tool.
- Create another parallel workbench runtime.
- Rewrite stable numerical methods without a separate, evidence-backed reason.
- Invent manufacturer data, limits, allowables, or missing specifications.
- Remove quick routes, exports, project capture, or traceability without approval.
- Hand-edit `standalone.html`.
- Publish, deploy, upload source, or push unrelated changes.

## Ownership model

Use one integration owner for shared runtime, shared CSS, service worker, and generated standalone changes.

The bulk-migration agent should own:

- Tool definitions
- Result/state adapters
- Domain-specific SVG/canvas renderers
- Tool-local data/provenance presentation
- Tool-specific tests

When a tool needs a missing shared component:

1. Stop the tool-local implementation at that seam.
2. Describe the reusable responsibility and at least two likely consumers.
3. Add the primitive to the shared foundation in its own commit or request the integration owner to do so.
4. Resume the tool migration only after the shared contract is stable.

Do not disguise shared shell behavior as a tool-local exception to avoid coordination.

## Git coordination across computers

1. Start from the foundation commit hash supplied by the integration owner.
2. Confirm the worktree is clean or identify existing user changes before editing.
3. Create one branch per pilot, subject cohort, or narrowly related migration batch.
4. Keep shared-framework changes separate from tool-adapter changes.
5. Rebase or merge the latest foundation before generating `standalone.html`.
6. Let the integration owner resolve shared CSS/runtime/generated-file conflicts.
7. Report the exact tested commit hash and changed-file list at handoff.

Recommended branch shapes:

- `design-system/wet-tank-pilot`
- `design-system/modal-density-pilot`
- `design-system/sea-analysis-wave`
- `design-system/random-shock-wave`

Avoid one branch spanning all tools.

## Implementation sequence for one tool

### 1. Inventory before editing

Record:

- Current route and alternate modes
- Current inputs and canonical units
- Calculation and result contracts
- Existing plots, tables, downloads, persistence, and project actions
- Assumptions, validity logic, sources, and missing-data behavior
- Existing tests and browser-visible behaviors

### 2. Assign the profile

Use the decision test in `MIGRATION-MATRIX.md`. Write the one-sentence justification in the commit or migration record.

### 3. Define the engineering question

Identify:

- Decision statement
- Controlling metric
- Status logic
- Key limitation
- Required physical visual
- Evidence needed to defend the decision

Do this before choosing tabs or laying out cards.

### 4. Build the adapter

- Preserve the existing solver and canonical units.
- Normalize inputs through a versioned state contract where the profile requires persistence.
- Adapt output to `EngineeringResult` rather than rendering parallel explanatory HTML.
- Keep plots/tables/downloads structured.
- Preserve provenance and explicit missing-data limitations.

### 5. Compose shared components

Use the shared shell, decision, input, visual, evidence, warning, source, and state components appropriate to the profile.

Tool-local markup is acceptable for the domain visual, specialized table, or export configuration. Tool-local markup is not acceptable for reimplementing generic tabs, cards, buttons, warnings, persistence, or responsive layout.

### 6. Verify behavior

Check at minimum:

- Default state
- Representative valid state
- Requirement failure or active warning
- Unit-system change
- Rerender preserves current selection/view
- Reset and persistence
- Import/export when applicable
- Add to Project when applicable
- Quick route when applicable
- Desktop and mobile layout
- Keyboard navigation and visible focus
- Print view
- Zero unexpected browser warnings/errors

### 7. Synchronize generated output

After runtime, style, catalog, demo, or tool changes:

1. Run `npm run build:standalone`.
2. Run `npm test`.
3. Run `npm run build:standalone` again.
4. Compare the two `standalone.html` hashes.
5. Run `git diff --check`.
6. Inspect the generated module boundaries rather than assuming their names.

Report browser QA separately from automated tests and standalone determinism.

## Review checklist

Reject or revise a migration when any answer is “no”:

- Does the first screen state the engineering decision?
- Is the controlling result visually dominant?
- Can the user connect a changed input to physical behavior?
- Are controls grouped by physical meaning?
- Does every visible value have a unit or clear dimensionless label?
- Are requirements distinct from assumptions?
- Are published, digitized, interpolated, assumed, extrapolated, and calculated values distinguishable?
- Are selected hardware details located with the current configuration?
- Is exploration separated from the current-design explanation?
- Are warnings driven by current state and located near conclusions?
- Does copied/exported evidence use the same result contract as the screen?
- Does mobile preserve the engineering sequence and physical view?
- Does the implementation primarily use shared components?
- Are the original route and focused capability preserved?

## First two assignments

### Pilot 1: Wet-Tank Dynamics

Goal: prove the full guided-workbench profile with an existing definition and physical diagram.

Focus on:

- Decision hero and live controlling proximity/coupling result
- Persistent workflow state
- Geometry and fill-state visualization
- Dry/wet shell, slosh, and liquid-acoustic evidence
- Explicit reduced-order limitations and higher-fidelity handoff

### Pilot 2: Modal Density

Goal: prove the design system scales to an interactive analysis without artificial workflow steps.

Focus on:

- Current wave family and frequency-band decision
- Explicit per-curve controls, current selected initially
- Physical interpretation of population, overlap, and method validity
- Source-traceable comparison curves
- A compact trust panel rather than the full workbench workflow

Do not begin bulk migration until both pilots have been reviewed together.

## Copyable kickoff prompt

```text
Implement the assigned Structural Acoustics, Understood tool migration using the pinned foundation commit and the documents under docs/engineering-tool-design-guidelines/.

Before editing, inventory the current route, solver, units, result contract, persistence, exports, project actions, sources, limitations, tests, and responsive behavior. Assign the simplest justified tool profile. Preserve numerical methods and route compatibility.

Use shared engineering-tool components and EngineeringResult adapters. Keep only solver, catalog, export, and domain-visual logic tool-specific. Do not copy .sorbo-* CSS, create a parallel runtime, invent missing specifications, hand-edit standalone.html, publish, or push unrelated changes.

Validate the assigned tool's default, valid, warning/failure, units, state, export/project, responsive, keyboard, print, and quick-route behaviors. Then build standalone, run the full tests, rebuild standalone, compare hashes, run git diff --check, and report browser QA separately.
```

## Handoff report format

```text
Foundation commit:
Migration commit:
Tool IDs/routes:
Assigned profiles and rationale:
Shared components used:
New shared components proposed:
Tool-local logic retained:
Numerical behavior changed: yes/no (explain if yes)
Tests:
Browser QA:
Standalone hashes:
git diff --check:
Known limitations/open decisions:
```

