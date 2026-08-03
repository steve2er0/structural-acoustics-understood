# Reference-Experience Parity Matrix

The target product pattern was the engineer-first workflow used by VS&A All Day: a cheat-sheet home experience, standalone technical tools, compact theory beside calculation, visual demonstrations, and practical notes. This implementation preserves that workflow while using original writing, graphics, numerical code, information architecture, and branding.

Public reference reviewed: `https://vsa-all-day.com/` and its linked cheat-sheet/tool pages. Review date: 2026-07-31.

| Experience element | Delivered implementation |
|---|---|
| Cheat sheet as the primary destination | 30 numbered, continuously scrollable chapters with a sticky chapter rail and 199 concept cards |
| Dense formula reference | Equations, definitions, physical interpretation, common errors, tags, and direct tool links |
| Standalone calculator workspaces | 73 dedicated hash-routed calculation pages with consistent inputs/results/theory/assumptions/examples |
| Engineering result commentary | Shared response schema and renderer provide interpretation, physical meaning, assumptions, validity checks, considerations, and linked concepts for every calculator |
| Core VSA utility coverage | dB, octave bands, weighting, SDOF, damping, Miles, GRMS, beam response, VRS, SRS, and scaling |
| Structural-acoustic depth | bending dispersion, shell ring frequency, critical frequency, radiation efficiency, TL, cavities, panel–cavity proximity, and structural power flow |
| Distributed-load depth | Corcos coherence, correlation matrices, FSPs, dynamic-pressure/environment scaling, and spatial-field visualization |
| SEA coverage | modal-overlap checks, editable reciprocal subsystem chains with energy/power/TL/velocity outputs, a medium-dependent double-window template, two- and three-subsystem steady-state energy balance, gross/net CLF workbench, uncertainty-propagated CLF identification, experimental SEA inversion, honeycomb-panel readiness, inhomogeneous energy sampling, and junction CLF tools |
| Data workflows | local CSV/text import, Welch PSD, shock/SRS, PSD combination, and exportable result data |
| Interactive physics | 36 original live canvas/SVG demonstrations, including pressure-field and panel-mode acceptance, TR 12-007 honeycomb/junction studies, ACS 519 wave and radiation models, sound-intensity testing, distributed launch acoustics, wet-tank coupling, qualification notching, and launch-environment stress |
| Practical engineering articles | 27 applied case notes linked back to tools and concepts, including a long-form TR 12-007 guide, a CLF interpretation/uncertainty article, and eighteen ACS 519 launch-vehicle deep dives |
| Search and navigation | global search across concepts, symbols, tools, demos, cases, and glossary; category filters; responsive menu |
| Output and reuse | print/PDF layout, CSV exports, SVG/PNG plots, copied engineering reports, and shareable input-state URLs |
| Privacy | all calculations and imported data remain local in the browser |
| Offline use | service-worker application-shell cache |

## Deliberate enhancements

The build gives structural acoustics more weight than a broad general vibration reference: plate coincidence, shell behavior, radiation, spatial correlation, cross-spectral matrices, force spatial patterns, panel–cavity interaction, and SEA are first-class sections rather than scattered add-ons.

## Deliberate non-copying boundary

No source-page prose, illustrations, source code, branding, or exact visual identity was copied. Common equations and engineering terminology are presented through an original implementation and a distinct design system.
