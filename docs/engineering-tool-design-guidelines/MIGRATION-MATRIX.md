# Tool Migration Matrix

Inventory date: 2026-08-18

Catalog source: the six tool catalogs assembled in `js/app.js`

Current total: 114 tool routes

## Baseline

| Current/target profile | Count | Meaning |
| --- | ---: | --- |
| Sorbothane reference implementation | 1 | Behavioral and visual reference; do not mechanically migrate |
| Shared guided workbench | 10 | Already uses `engineeringWorkbenchDefinitions` and `workbench-runtime.js` |
| Custom guided workbench | 1 | Launch SEA capstone; integrate after the shared runtime is proven |
| Interactive analysis candidate | 48 | Advanced tools not currently registered as guided workbenches |
| Quick screen | 54 | Foundation, screening, and core tools |

Complexity metadata is a starting classification, not a permanent UX decision. Confirm each tool against the profile decision test before implementation.

## Profile decision test

Assign **quick screen** when the user can make the decision from one coherent input set and one result package.

Assign **interactive analysis** when the user must explore physical behavior, traces, response locations, alternatives, or sensitivity but does not need a persistent multi-step project.

Assign **guided workbench** when the decision requires a sequence of linked models, persisted cross-step state, evidence review, or a formal handoff.

If uncertain, choose the simpler profile and preserve a path to upgrade. Do not add workflow chrome without a workflow.

## Migration waves

| Wave | Scope | Exit gate |
| --- | --- | --- |
| 0 | Publish this standard, component inventory, visual references, and handoff rules | Documents reviewed; no runtime change yet |
| 1A pilot | `wet-tank-dynamics` through the evolved shared workbench runtime | Full workbench behavior demonstrated without tool-local shell CSS |
| 1B pilot | `modal-density` through the interactive-analysis profile | Plot/trace selection, physical interpretation, responsive behavior demonstrated |
| 2 | Remaining nine shared workbench definitions | All use the same decision, state, evidence, and accessibility contracts |
| 3 | High-value interactive analyses, one subject cohort at a time | Adapter and visual tests pass per tool; no one-off shell implementations |
| 4 | Remaining quick screens, grouped by shared input/result patterns | Focused mode remains fast; consistent trust and result layer added |
| 5 | `launch-vibroacoustic-capstone` integration | Custom behavior retained behind shared shell/contracts |
| 6 | Cross-site cleanup and deprecation of redundant tool-local shell styles | No route regressions; standalone deterministic; dead selectors audited |

Do not migrate all 113 routes in one branch. Each subject cohort should remain independently reviewable.

## Existing workbench routes

| Tool ID | Current architecture | Target action |
| --- | --- | --- |
| `sorbothane-isolation` | Custom Sorbothane workbench | Keep as reference; later consume shared primitives only when behavior is equivalent |
| `launch-vibroacoustic-capstone` | Custom launch SEA workbench | Integrate in Wave 5; preserve its specialized network/project behavior |
| `double-panel-sea` | Shared generic workbench | Migrate after pilot; emphasize cross-section, energy paths, and installed TL decision |
| `qualification-test-planner` | Shared generic workbench | Migrate after pilot; emphasize flight-to-test audit and controlling limit |
| `time-psd` | Shared generic workbench | Migrate after pilot; preserve imported-record provenance and processing chain |
| `noise-control-path` | Shared generic workbench | Migrate after pilot; emphasize parallel-path ranking and weakest surviving path |
| `model-test-correlation` | Shared generic workbench | Migrate after pilot; emphasize paired evidence, residuals, and credibility |
| `hybrid-method-selection` | Shared generic workbench | Migrate after pilot; emphasize method regions and evidence for transition choices |
| `launch-acoustic-source` | Shared generic workbench | Migrate after pilot; preserve source-to-accepted-power provenance chain |
| `wet-tank-dynamics` | Shared generic workbench | Pilot 1A |
| `mission-environment-timeline` | Shared generic workbench | Migrate after pilot; emphasize event/subsystem controller and evidence gaps |
| `wave-matching-atlas` | Shared generic workbench | Migrate after pilot; emphasize selected physical branch and radiation regime |

## Interactive analysis candidates

These 48 tools start in the interactive-analysis cohort. Reclassify to guided workbench only if the profile decision test demonstrates a real persistent workflow.

| Subject | Tool IDs |
| --- | --- |
| Acoustics | `absorber-resonator`, `khie-boundary` |
| Aero / Distributed Loads | `correlation-matrix`, `fsp-generator`, `pipe-flow-noise`, `spatial-correlation` |
| Dynamics | `nonlinear-joint`, `tuned-absorber-isolation` |
| Noise Control | `enclosure-design`, `fan-duct-network`, `outdoor-propagation` |
| Random & Shock | `extreme-response`, `fds`, `nonstationary-environment`, `pyroshock`, `srs`, `vibroacoustic-fatigue`, `vrs` |
| SEA & Energy | `branching-sea-network`, `clf-identification-uncertainty`, `clf-mechanism-library`, `equivalent-power-injection`, `experimental-sea`, `honeycomb-wave`, `installed-fairing-sea`, `junction-transmission`, `modal-density`, `multi-subsystem-sea`, `sea-parameter-workbench`, `sea-response-recovery`, `sea-validity-confidence`, `two-subsystem-sea` |
| Shock & Fatigue | `dynamic-stress-environment` |
| Structural Acoustics | `driven-radiation`, `elastic-panel-tl`, `fairing-cavity`, `fe-be-planner`, `infinite-mobility-atlas`, `modal-radiation`, `radiation-efficiency-atlas`, `shell-acoustics` |
| Structures | `orthotropic-panel` |
| Test & Signal | `inhomogeneous-energy`, `mimo-test-control`, `requirements-flowdown`, `source-identification-array`, `transfer-path-analysis`, `uncertainty-sensitivity` |

### Recommended subject order

1. **SEA & Energy:** richest reuse with existing workbenches and `EngineeringResult` plots/tables.
2. **Random & Shock:** shared spectral controls, duration, Q/damping, trace selectors, and exports.
3. **Structural Acoustics:** strong physical visuals and method-validity needs.
4. **Test & Signal:** measurement-chain provenance, uncertainty, and credibility.
5. **Aero / Distributed Loads:** spatial-field and source-acceptance visuals.
6. **Noise Control, Dynamics, Acoustics, Structures:** smaller cohorts after shared patterns stabilize.

## Quick screens

These 54 routes should receive the common visual/trust/result treatment without forced tabs or project workflow.

| Subject | Tool IDs |
| --- | --- |
| Acoustics | `acoustic-field`, `canonical-source`, `cavity-modes`, `db`, `hearing-psychoacoustics`, `noise-metrics-criteria`, `octave`, `room-field`, `room-t60`, `sound-power`, `source-geometry`, `weighting` |
| Aero / Distributed Loads | `dynamic-scaling`, `tbl-convection-model`, `vibroacoustic-scaling` |
| Dynamics | `damping`, `isolation`, `loss-factor-budget`, `mobility`, `sdof`, `two-dof` |
| Noise Control | `acoustic-treatment`, `barrier-diffraction`, `expansion-chamber`, `insertion-loss`, `lined-duct`, `mitigation-trade` |
| Random & Shock | `duration-scaling`, `grms`, `miles`, `psd-combination`, `shock-pulse` |
| SEA & Energy | `equipment-loading`, `modal-overlap`, `sea-impedance-library` |
| Structural Acoustics | `critical-frequency`, `double-panel`, `mass-law`, `panel-cavity`, `piston-radiation`, `radiation-efficiency`, `ring-frequency`, `structural-intensity` |
| Structures | `beam`, `bending-wave`, `fea-mesh`, `plate-modes` |
| Test & Signal | `accelerometer`, `acoustic-measurement-planner`, `credibility-scorecard`, `integration-drift`, `modal-test-planner`, `sound-intensity-probe` |
| Utilities | `unit-converter` |

## Per-tool migration record

Add one row to the working migration tracker for each tool branch:

| Field | Required entry |
| --- | --- |
| Tool ID and route | Stable ID and URL, including quick-mode route if wrapped |
| Assigned profile | Quick, analysis, or workbench, with one-sentence justification |
| Engineering decision | The actual question the user is answering |
| Controlling metric/status | Primary result and status logic |
| Input groups | Physical grouping and unit quantities |
| Physical visual | Existing, adapted, new, or explicitly not required |
| Evidence views | Values, plots, tables, comparisons, downloads |
| Trust layer | Assumptions, validity, sources, supported range, required test |
| State behavior | Persistence, schema, import/export, reset, baseline |
| Shared components used | List; any new shared component requires foundation review |
| Tool-local code retained | Solver, adapter, domain visual, catalog, special export |
| Automated verification | Unit, rendering, contract, routing, state tests |
| Browser verification | Desktop, tablet/mobile, keyboard, print, diagnostics |
| Standalone verification | Build, test, rebuild, matching hashes |

## Active migration records

| Tool ID / route | Assigned profile and rationale | Decision / controlling metric | State and evidence | Trust boundary |
| --- | --- | --- | --- | --- |
| `infinite-mobility-atlas` / `#/tool/infinite-mobility-atlas` | Interactive analysis: users compare structural families, constituent traces, curved-panel alternatives, and transition regions without a multi-step handoff workflow. Focused calculator remains at `?mode=quick`. | Which characteristic constituent governs mean drive-point mobility? Selected `Re{Y}` and active branch/regime. | Versioned browser-local study state, SI/English controls, trace selection, baseline, import/export, Add-to-Project, geometry view, constituent plot, and source-traceable tables. | Published Hambric/ACS 519 relations; explicit review for transition proximity, thick shell ratio, sandwich transition, and open curved-panel strip proxy. |

## Pilot acceptance criteria

### Wet-Tank Dynamics

- Uses shared decision hero, action bar, workflow, input inspector, physical view, metric/evidence panels, warnings, and state actions.
- Keeps fill, shell family, slosh, liquid acoustics, and coupling behavior physically visible.
- Retains the original quick screen.
- Does not introduce a private card/input/theme system.

### Modal Density

- Uses the interactive-analysis profile without artificial workflow steps.
- Exposes explicit per-curve controls with the current curve selected initially.
- Organizes results by physical wave family and validity meaning.
- Preserves existing plots, source traceability, units, and report output.
- Demonstrates that the shared design system scales down from a full workbench.

## Cross-tool dependencies to protect

- Tool IDs and hash routes
- Shared calculator registries
- `EngineeringResult` shape
- Unit-system conversion
- Project artifact events and stored evidence
- Cross-tool handoff inputs
- Existing quick-mode routes
- Generated standalone module boundaries
- Service-worker cache revision when runtime/style removals must invalidate old assets
