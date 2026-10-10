# Validation performed on this Mac

Validated scope: seeded synthetic acceleration, numerical routines, actual worker lifecycle, and the module and embedded standalone browser applications over loopback HTTP. No flight data or achieved qualification history was supplied. This is a screening prototype, with no certification, fatigue, damage or safety conclusion.

## Automated checks

Node v22.22.1: `npm test` passed all 146 existing reference-site tests. `npm run test:flight-response` passed all 26 prototype tests: 22 physics/input tests, three actual-worker tests, and one self-contained bundle test. No runtime packages were installed. Logs accompany the portable package.

The physics suite checks zero input; absolute and pseudo-acceleration sinusoidal steady-state FRFs at Q=2, 10 and 50; amplitude/sign scaling; stateful irregular blocks versus a whole-record recurrence; ringdown; sampling and nested-grid convergence; seeded swept-tone dwell and amplitude changes; physical/resource limits; timestamp/unit conversion; log interpolation; missing coverage and mismatched metadata; invalid, zero, negative and nonfinite imports; squared PSD unit normalization; the flat-PSD pseudo-acceleration closed-form integral; the two declared Rayleigh peak-factor equations; qualification duration; local-window rise/fall; monotonic running maxima; and final/reference invariance under display-window changes. A separate full-history computation agrees with the binned record's primary/residual maximax.

The worker suite executes the actual worker source via a Node bridge, checks deterministic repeated transferred results, terminates an active calculation and starts another, and rejects incompatible reference metadata and invalid settings. The bundle test parses the complete embedded JavaScript, checks the solver/Blob worker/CSP/algorithm notes are present, checks no automatic external script/style assets or module imports remain, and checks deterministic rebuilds.

At the allowed sample-rate floor of 20 samples per highest natural-frequency cycle, a test sinusoid had about 1.31% sampled/first-order-hold peak error; error decreases on refinement. This floor does not promise equivalent accuracy for an arbitrary imported transient. Extrema between samples are not optimized. High-Q grids require at least six points per approximate resonant bandwidth, and still require refinement.

## Independent mathematical checks

`python3 tests/independent-check.py` with Python 3.9.6 and SciPy 1.13.1 produced:

| Check | Cases | Result |
| --- | ---: | --- |
| First-order-hold state transition against augmented `scipy.linalg.expm` | 32 | maximum absolute error 2.153e-12 |
| PSD moments against adaptive `scipy.integrate.quad`, with resonance/breakpoint subdivisions | 24 | maximum relative error 7.769e-6 (0.000777%) |
| Independent Rayleigh envelope maximum, target probability 0.95 | 100,000 trials | observed probability 0.95026 |
| One-expected-exceedance model | 100,000 trials | observed mean exceedances 0.98967 |

The report is `independent-validation.json`. These checks validate numerical integration and mathematical peak assumptions. They cannot establish Gaussianity, stationarity, peak independence, narrowband response or achieved qualification in a real test. Cho's equations 11–14 were inspected in the primary ISMA paper. The supplied NASA report is modal-test context, not an ERS algorithm source.

## Browser QA and screenshots

Chrome on this Mac, loopback only: both the separate module experience and the existing `standalone.html#/tool/flight-response` compute the default 305 continuous oscillators successfully, including 4.40 s of residual decay. The standalone Tools catalog/search contains the new entry among 122 tools. Navigating away and reopening starts a fresh worker and computes successfully.

Browser interaction checks covered compute, play/pause, scrub to start/end and arrow stepping, speeds 1x/5x, 0.25 s/4 s display windows, running/final overlays, g/m/s² output, map seeking/hover, final residual time, repeated actions, cancellation/restart, and invalid zero PSD entered in the UI. Invalid reference clears the comparison, plots and export availability. The embedded page was captured at 13.55 s with both overlays. Screenshots accompany the package:

- `standalone-flight-response.jpg`: computed tool inside the existing standalone Tools route.
- `standalone-tools-catalog.jpg`: filtered Tools entry.
- `flight-response-desktop.jpg`: separate module experience and swept/dithering response/map.
- `flight-response-invalid-reference.jpg`: rejected zero PSD and unavailable comparison.

No application-origin console error was observed; unrelated installed-extension messages were excluded from application results. Export started a browser download and received bytes, but completion/saved-file confirmation was unavailable; a completed browser export is not claimed.

## Remaining verification limits

- Direct `file://` navigation was denied by browser security policy, which allows HTTP/HTTPS only. No bypass or alternate route was used. The same complete embedded code was tested over localhost, and structural self-contained-bundle checks pass. Opening the standalone HTML directly from disk remains a manual browser check.
- Browser file chooser automation requires Chrome's broader file-URL permission, which was not enabled. CSV/study file selection through the browser is unverified. Automated CSV, ERS, units, metadata and invalid-input tests pass.
- Windows, other browsers and mobile/device breakpoints were not tested.
- User conventions, flight prehistory, acquisition anti-aliasing/calibration, actual qualification startup/shutdown and achieved PSD are unknown. Declared metadata is validated for consistency, not truth. Precomputed matching primary+residual ERS is the supported reference path when a known finite-test convention is needed.
- Statistical PSD references use visible, editable and exported assumptions. The UI reports response spectral irregularity and warns when the narrowband Rayleigh model is questionable. A ratio below one is only lower peak magnitude under those assumptions.

## Reproduce

From the integrated project root: `npm test`, `npm run test:flight-response`, `npm run build:standalone`, then `npm start` and visit `http://127.0.0.1:4173/standalone.html#/tool/flight-response`.

For the portable source archive: `node --test experiences/flight-response/tests/*.test.mjs`; then `node experiences/flight-response/serve.mjs` and visit `http://127.0.0.1:4186/`. Optional independent validation requires locally installed SciPy; it is not a runtime dependency or bundled package.
