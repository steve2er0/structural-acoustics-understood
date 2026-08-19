# Reusable Component Inventory

This inventory separates existing reusable seams, Sorbothane-only reference patterns, and the proposed shared engineering-tool contract.

## Existing reusable foundations

| Foundation | Current source | What it already provides | Direction |
| --- | --- | --- | --- |
| Site components | `js/site-components.js` | Page shell, breadcrumbs, section header, callouts, link collections, component inventory | Extend; do not replace |
| Engineering results | `js/engineering-results.js` | Shared values, interpretation, assumptions, validity, related concepts, text reports | Retain as the result data contract |
| Unit system | `js/unit-system.js` | Display conversion for results and field units | Retain and extend to workbench controls |
| Charts | `js/charts.js` | Shared line, range, heatmap, and export helpers | Retain; add shared trace/selection conventions |
| Generic workbench runtime | `js/workbench-runtime.js` | Project state, steps, input rendering, baseline, import/export, evidence, warnings | Evolve into the primary runtime |
| Workbench definitions | `js/engineering-workbenches.js` | Ten configuration-driven guided workflows and domain diagrams | Migrate through the evolved runtime |
| Project workspace | `js/engineering-system.js` and `js/app.js` | Saved artifacts, shared context, cross-tool records | Retain as the evidence destination |
| Site visual tokens | `styles.css` | Canvas, surface, border, type, spacing, and accent tokens | Use as canonical tokens |

## Sorbothane reference patterns

These patterns are valuable, but their present `.sorbo-*` implementation is tool-specific. Promote the behavior into shared components before other tools use it.

| Reference pattern | Current seam | Reusable behavior | Keep tool-specific |
| --- | --- | --- | --- |
| Decision hero | `renderSorbothaneIsolationWorkbench()` | Physical decision title, live controlling metric, status, key limitation | Isolation wording and vertical-mode selection |
| Action bar | `renderSorbothaneIsolationWorkbench()` | Local-data statement, export actions, project capture | Configuration and response export formats |
| Grouped sticky sidebar | `inputSidebar()` | Units, model/library selection, collapsible physical input groups, sticky actions | Sorbothane and Parker LORD fields |
| Evidence tabs | Main tab list and panel renderer | Sticky, horizontally scrollable engineering-question navigation | Mode/isolator tab names |
| Hardware overview | `overviewPanel()` | Physical scene beside current decision and governing metrics | Six-DOF mount geometry renderer |
| Metric dashboard | Mode cards | Compact value, unit, status, physical label, secondary behavior | Mode participation and classification |
| Requirement ledger | `requirementTable()` | Explicit criteria, axis/direction, calculated result, pass/review status | Isolation-specific tone and resonance criteria |
| Physical interpretation | `commentary()` | State-driven explanation of what the design is doing | Isolation-specific prose rules |
| Active warning stack | Overview and assumptions panels | Current-state warnings adjacent to conclusions | Isolation validity conditions |
| Response-location control | `responsePointControl()` | Visible measurement definition applied consistently to plots and criteria | CG and corner choices |
| Interactive response plot | `transmissibilitySvg()` | Coordinated curves, criteria, uncertainty, supported range, tooltips | Transmissibility solver and mode markers |
| Hardware/material panel | `sorbothanePanel()` | Selected record, current geometry, property curves, installed arrangement, sources | Sorbothane/Parker data and drawings |
| Catalog screen | `catalogScreenResult()` | Visible criteria, progress, recommendation, applied-design state | Catalog records and ranking physics |
| Design explorer | `explorerPanel()` | Transparent two-variable sweep, heatmap, ranked table, current design | Isolation variables and score |
| Current configuration drawings | `currentDesignDrawings()` | Selected hardware and installed arrangement located with current hardware | Element and mount SVGs |
| Trust/validation panel | `assumptionsPanel()` | Equations, assumptions, warnings, matrices, verification, references, export | NASTRAN isolation export and equations |
| Versioned local state | `bindSorbothaneIsolationWorkbench()` | Normalize, persist, rerender, preserve active view | Isolation configuration schema |

## Proposed shared components

Names below describe responsibilities, not final JavaScript identifiers. Implement them with small semantic renderers and a configuration contract rather than one large conditional renderer.

| Component | Responsibility | Quick | Analysis | Workbench |
| --- | --- | :---: | :---: | :---: |
| `EngineeringToolShell` | Page layout, profile class, theme, breadcrumbs, responsive regions | Required | Required | Required |
| `DecisionHero` | Engineering question, scope, controlling metric, status, key limitation | Compact | Required | Required |
| `ToolActionBar` | Unit system, local-data statement, copy/export/import/reset/project actions | Compact | Required | Required |
| `InputInspector` | Grouped fields, help, validation, model-specific visibility | Form | Required | Required |
| `ToolNavigation` | Tabs or workflow steps with accessible state | Optional | Optional | Required |
| `PhysicalView` | Hardware, mechanism, field, network, or process view from live state | Optional | Required | Required |
| `CurrentDecisionCard` | Selected configuration, result state, controlling checks | Optional | Required | Required |
| `MetricGrid` | Prioritized values with units, status, and physical labels | Required | Required | Required |
| `RequirementLedger` | Requirement, basis, result, margin, and status | Optional | As needed | As needed |
| `EvidencePanel` | Plot, heatmap, table, animation, or range chart with takeaway | As needed | Required | Required |
| `TraceSelector` | Per-curve visibility, current-only/show-all, trace descriptions | As needed | As needed | As needed |
| `ComparisonPanel` | Baseline/current/alternative comparison with secondary tradeoffs | Optional | Recommended | Required |
| `InterpretationPanel` | Summary, physical meaning, engineering considerations | Required | Required | Required |
| `WarningStack` | Active warnings, severity, cause, recovery, invalidity | Required | Required | Required |
| `SourcePanel` | Provenance category, source, supported range, missing data | Compact | Required | Required |
| `HardwarePanel` | Selected record, geometry, installed configuration, drawings | No | As needed | As needed |
| `StudyExplorer` | Criteria, run/progress/cancel, sweep, recommendation, apply candidate | No | Optional | Optional |
| `TrustPanel` | Equations, assumptions, validity, verification, required testing | Compact | Required | Required |
| `ProjectStateActions` | Versioned persistence, import/export, baseline, add-to-project | Optional | Required | Required |
| `ResponsiveTable` | Dense engineering tables with units and intentional overflow | As needed | As needed | As needed |
| `AccessibleLiveStatus` | Concise completion/error announcements | Required | Required | Required |

## Proposed definition contract

The evolved runtime should accept a declarative definition that is rich enough to compose the shell but leaves the physics in adapters.

```js
{
  id,
  profile: 'quick' | 'analysis' | 'workbench',
  title,
  category,
  decision: {
    eyebrow,
    question,
    scope,
    metric(context),
    status(context),
    keyLimitation(context)
  },
  state: {
    schema,
    version,
    defaults(),
    normalize(input),
    storageKey
  },
  inputs: {
    groups,
    unitSystems,
    validate(context)
  },
  navigation: {
    items,
    initial,
    preserveSelection: true
  },
  views: {
    overview(context),
    physical(context),
    evidence(context),
    hardware(context),
    study(context),
    trust(context)
  },
  result: {
    compute(state),
    toEngineeringResult(result),
    primaryMetrics(result),
    requirements(result)
  },
  actions: {
    exports,
    import,
    addToProject
  }
}
```

The exact syntax can change during implementation. Preserve these separations:

- The definition says what the tool contains.
- The adapter maps existing inputs/results into shared contracts.
- The runtime owns generic layout, state, navigation, actions, and accessible interaction.
- The tool owns solvers, catalogs, ranking logic, and domain visuals.

## State contract

At minimum, persistent analysis/workbench state should include:

```js
{
  schema: 'sau-engineering-tool',
  version: 1,
  toolId,
  profile,
  name,
  activeView,
  unitSystem,
  inputs,
  selections,
  studySettings,
  baseline,
  provenance
}
```

Guidelines:

- Normalize every imported or stored object against defaults.
- Reject another tool's state rather than coercing it.
- Migrate old versions explicitly.
- Persist lightweight state; large imported records may require separate storage policy.
- Do not persist transient progress, animation frames, focus, or tooltip state.
- Preserve active view, selected library, selected trace, and applied candidate across normal rerenders.

## Result adapter contract

Every migrated tool should produce or adapt to `EngineeringResult`. Additional evidence remains structured:

```js
{
  values,
  interpretation,
  assumptions,
  validity,
  relatedConcepts,
  plots,
  heatmaps,
  rangeCharts,
  tables,
  downloads,
  provenance
}
```

Do not generate interpretation by scraping rendered HTML. It must originate in the tool's calculation or adapter so copied reports, project artifacts, browser views, and standalone builds use the same content.

## Status model

Use a small shared status vocabulary:

| Status | Meaning | UI behavior |
| --- | --- | --- |
| `pass` | All defined checks pass within the implemented model | Positive text plus semantic color |
| `review` | A requirement fails or a validity warning affects the decision | Review text plus warning/failure treatment |
| `incomplete` | Required inputs or criteria are missing | Identify the missing decision input |
| `running` | A long calculation is in progress | Progress, stage, cancel, previous stable result |
| `error` | Calculation or import failed | Specific cause and recovery; preserve usable state |
| `informational` | No pass/fail criterion was defined | Neutral result; never imply approval |

Do not map every warning to `fail`. Distinguish requirement failure, model invalidity, missing data, and caution.

## Input component rules

- Field definitions contain key, label, unit/quantity, type, default, range/step, help, and provenance when relevant.
- Units appear in labels and respond to the shared unit system.
- Searchable selects are used for long catalogs.
- Related paired controls stay synchronized through a single canonical value.
- Model/library selection determines which groups render; hidden fields must not silently affect a different model.
- Invalid values are reported at the field and in the current decision state.
- Controls that trigger expensive work say so before the user runs them.

## Evidence component rules

Each evidence panel contains:

1. Engineering title
2. Current state or source label
3. The visual/table
4. Units and legend
5. One concise physical takeaway
6. Relevant limitation or supported range
7. Download/copy action when useful

Avoid repeating the same generic takeaway below every plot. The takeaway must describe the mechanism or decision shown in that particular evidence panel.

## CSS ownership

Recommended ownership:

- `--site-*`: global site tokens.
- `--engineering-tool-*`: shared tool semantics such as success, caution, review, dense surface, chart grid, and focus.
- `.engineering-tool-*` or existing `.workbench-*`: reusable structural components.
- `.tool-<id>-*`: domain-specific diagrams and exceptional layouts only.

Do not add a new private color system, card system, or input system for every migrated tool. Do not rename all existing selectors in the same change as a behavioral migration; separate mechanical cleanup from design adoption.

## Testable component invariants

Shared tests should verify:

- Every definition references a real tool and valid profile.
- Required decision fields and state schema exist.
- Every result satisfies `EngineeringResult`.
- Workbench navigation references valid views/steps.
- Unit conversion covers visible fields and results.
- Status always has visible text.
- Tabs and panels have connected accessibility attributes.
- Import rejects the wrong tool/schema.
- Reset returns normalized defaults.
- Current selection survives rerender.
- Expensive studies expose progress and cancellation contracts.
- Quick mode remains routable when a guided workbench wraps an existing calculator.

