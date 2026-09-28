# Vibration Lab · v0.1

Interactive experiments in vibration, acoustics, structures, propulsion, and flow.

## Open without installing anything

Use the prebuilt [portable/Vibration-Lab.html](portable/Vibration-Lab.html).
Save the HTML file, then open it in Edge or Chrome. It contains all seven
experiments, fonts, styles, code and model data. No Node.js, npm, local server,
account or package download is needed to view it. Source-reference links are
optional and open external websites.

The browser must allow local HTML with JavaScript and WebGL. If workplace policy
blocks that too, ask IT to host the file on an approved internal web server.
No browser security changes or admin-setting changes are part of this setup.

To regenerate the file on a development machine with dependencies installed:

```sh
npm run build:portable
```

The build embeds all assets and uses fragment navigation (`#/labs/modal`), so
navigation stays inside the same document. The regular development/web build
continues to use pathname routes. Browser checks cover the portable file served
through HTTP; direct `file://` launch and workplace-specific policies have not
been verified on a Windows PC.

## Run locally

Requires Node.js 22.12+ (tested with 22.22.1).

```sh
cd experiences/vibration-lab
npm ci
npm run dev
```

Open http://127.0.0.1:5174/ . All seven labs live in the same app:

- `/` — visual experiment index
- `/labs/isolation` — vibration isolation, including its original sweep and a guided lesson
- `/labs/shaker` — field-coil electrodynamic shaker, including the original 76-second tour
- `/labs/modal` — experimental modal testing: impact → FFT → FRF → physical mode shape, with an 83-second tour
- `/labs/accelerometer` — annular-shear IEPE sensor: acceleration → force → charge → voltage, with sine response, sweep, and an 88-second tour
- `/labs/sea` — Falcon 9-inspired autoSEA geometry, six structural states plus a fairing acoustic cavity, reciprocal junctions, transient power balance, and a guided tour
- `/labs/rs25` — fuel-rich staged combustion, serial turbopumps, regenerative cooling, pogo suppression, pressure-dependent shock diamonds, and a 105-second tour
- `/labs/vortex` — multi-body launch vehicle, Mach/angle-of-attack/sideslip controls, lengthwise vortex pairs, full nose-to-tail airflow, a midbody cross-section, separate Strouhal reference scales, geometry comparisons, and a 67-second tour
- `/dev/lab-template` — development-only integration example

```sh
npm test
npm run build
npm run preview
```

The preview also uses port 5174. Stop the dev server before starting it, or use `npm run preview -- --port 5177`. Production serves `dist/`; configure the host to rewrite direct lab routes to `index.html`. There are no external data services, backend, accounts or remote textures.

## Engineering and platform

In Modal Testing, drag the hammer or accelerometer directly on the plate, or choose **Move hammer** / **Move accelerometer** and click the plate. Instruments snap to the nearest unoccupied measurement point. The location buttons provide a keyboard and touch alternative. Moving the hammer preserves the roving survey; moving the reference accelerometer starts a fresh survey. Acquire a new strike after either move.

The two existing demos were migrated, not recreated. Original pure SI models and all 44 regression cases are retained alongside platform regression tests. Each lab's model notes state assumptions, physical limits and the difference between real amplitude/frequency and their drawing representation.

- [Accelerometer model, assumptions, and sources](docs/ACCELEROMETER_MODEL.md)
- [Vortex shedding model, assumptions, and sources](docs/VORTEX_MODEL.md)
- [Modal model and numerical provenance](docs/MODAL_MODEL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Creating a lab](docs/CREATING_A_LAB.md)
- [Validation](VALIDATION.md)
- [Initial extraction plan](docs/REFACTOR_PLAN.md)

The surrounding repository's reference book/calculators remain a separate application.

The SEA model, SI equations, mode-count conventions and drawing policy are documented in [SEA_MODEL.md](docs/SEA_MODEL.md).

The RS-25 source audit, retained plumbing, derived operating point and explicit model assumptions are documented in [RS25_MODEL.md](docs/RS25_MODEL.md).
