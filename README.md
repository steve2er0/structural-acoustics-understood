# Structural Acoustics, Understood

A complete, dependency-free engineering reference for structural acoustics, vibration, shock, modal dynamics, random response, shells, distributed pressure fields, statistical energy analysis, instrumentation, and signal processing.

The interaction model is desk-reference-first: a continuously scrollable numbered cheat sheet, dedicated calculation pages, live physics demonstrations, applied case notes, global search, and print/PDF output. All copy, graphics, code, and numerical implementations in this package are original.

## Included

- **30 cheat-sheet chapters** with **199 linked technical concepts**
- **73 working calculators** spanning acoustics, dynamics, random vibration, shock, structures, structural acoustics, distributed loads, SEA, test/signal processing, noise control, wave matching, sound intensity, launch-acoustic sources, wet-tank dynamics, qualification planning, launch-environment stress, and unit utilities
- **36 live canvas/SVG demonstrations** covering resonance, damping/transmissibility, coupled modes, beam waves, flexural and sandwich-panel dispersion, coincidence, radiation efficiency, ring behavior, PSD response, SRS construction, spatial pressure fields, panel acceptance, editable SEA networks and double-window media, structural-acoustic testing, force-to-sound-power transfer, launch-source mapping, wet-tank coupling, qualification notching, and launch-environment stress
- **27 applied engineering case notes**, including interactive launch forcing, honeycomb-panel experimental SEA, CLF interpretation/uncertainty, and eighteen ACS 519 launch-vehicle deep dives
- Global search across equations, concepts, tools, demos, case notes, and the glossary
- A shared `EngineeringResult` response contract for every calculator: numerical values, engineering interpretation, physical meaning, model assumptions, validity checks, engineering considerations, and related concepts
- Theory, worked examples, tables, charts, CSV export, SVG/PNG plot export, complete copied engineering reports, and shareable input URLs
- Local CSV/text import for time histories and spectra
- Responsive desktop/mobile layouts and a dedicated print/PDF stylesheet
- Local-only browser calculations and an offline service-worker cache
- No third-party runtime dependencies, analytics, accounts, or server-side data processing

## Open immediately

`standalone.html` is a self-contained build with the styles, content, calculators, charts, and demos embedded. It can be opened directly from the filesystem for a quick review.

For the production multi-file build, serve the directory so native browser modules and offline caching operate normally:

```bash
cd structural-acoustics-understood
npm start
```

Then open `http://localhost:4173`.

The same command without npm is:

```bash
node scripts/serve.mjs
```

## Numerical verification

```bash
npm test
```

The test suite:

- Executes the default case for all 73 calculators
- Enforces the complete engineering response schema for every calculator and checks the plain-text engineering report output
- Confirms catalog/registry completeness and unique routes
- Checks decibel summation and fractional-octave geometry
- Verifies the Miles narrowband expression
- Checks standard-gravity unit conversion
- Confirms Welch PSD/time-RMS closure
- Checks PSD root-sum-square behavior for independent sources
- Verifies three-subsystem SEA power balance
- Confirms the complete 30-chapter, 73-tool, 36-demo architecture and all internal cross-links
- Checks ACS 519 piston, panel, shell, FE/BE, editable SEA-network conservation, double-window medium coupling, wave-matching, driven-radiation, sound-intensity, launch-source, wet-tank, qualification-tailoring, and environment-dependent dynamic-stress limiting cases
- Checks the TR 12-007 honeycomb dispersion, SEA inversion, spatial energy, and wavenumber-transmission learning models against analytical invariants
- Verifies reciprocal CLF power flow, gross/net exchange, exact forward/inverse identification, deterministic uncertainty propagation, and spatial-bias sensitivity
- Validates default plot, heatmap, table, and CSV outputs for finite, dimensionally consistent arrays

## Project structure

```text
BUILD_REPORT.md            delivered scope and validation record
REFERENCE_PARITY.md        reference-experience mapping and originality boundary
README.md
index.html                 production entry point
standalone.html            self-contained single-file build
styles.css
manifest.webmanifest
service-worker.js
robots.txt
sitemap.template.xml
assets/
  favicon.svg
js/
  app.js                   routing, UI, search, forms, exports, page rendering
  data.js                  cheat sheet, base catalog, cases, references, glossary
  calculators.js           core numerical models
  extra-calculators.js     extended numerical library
  acs519-physics.js        shared ACS 519 analytical and screening models
  acs519-calculators.js    ACS 519 calculators and launch-environment expansion
  acs519-data.js           ACS 519 chapters, case notes, catalogs, and references
  acs519-demos.js          ACS 519 interactive visualization renderers
  sea-coupling.js          reciprocal CLF power-flow, identification, and uncertainty models
  honeycomb-paper.js       reusable TR 12-007 panel, SEA, energy, and junction models
  engineering-results.js   shared commentary generation, validation, and report formatting
  engineering-results.d.ts TypeScript definitions for the EngineeringResult response schema
  extra-data.js            extended tool catalog
  charts.js                dependency-free SVG charts and file exports
  demos.js                 live canvas/SVG physics demonstrations
tests/
  calculators.test.mjs
scripts/
  sync-standalone.mjs      synchronizes shared styles, content, demos, result UI, and commentary framework into standalone.html
previews/
  cheat-sheet-desktop.png
  tools-desktop.png
  sdof-calculator.png
  coincidence-demo.png
  radiation-efficiency-demo.png
  cheat-sheet-mobile.png
  ring-calculator-mobile.png
```

After changing shared content, demos, result rendering, or styles, refresh the self-contained build with:

```bash
npm run build:standalone
```

## Deploy

Upload the full directory to GitHub Pages, Netlify, Cloudflare Pages, Amazon S3/CloudFront, or any static web server. Hash routing avoids server rewrite rules. Copy `sitemap.template.xml` to `sitemap.xml` and replace the placeholder domain before public launch.

The service worker caches the application shell after the first HTTP(S) load. Increment its cache name when publishing an update that must invalidate older clients immediately.

## Engineering boundary

The calculators distinguish exact-within-model, numerical, empirical, and screening-level results. That labeling does not replace engineering verification. Before using a result for design, qualification, certification, or safety-critical work, confirm:

- The governing equation, sign convention, and PSD/FRF normalization
- Units, material properties, temperature, orientation, and manufacturing state
- Boundary conditions, damping model, load correlation, statistical basis, and duration
- FFT/SRS/VRS/FDS convergence and sample-rate requirements
- Applicable controlled standards, handbooks, program methods, and uncertainty factors

Program-specific implementations of named empirical methods must be checked against their controlled source equations rather than inferred from a similarly named public formula.
