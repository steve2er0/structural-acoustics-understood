# Validation performed on this Mac

Validated scope: seeded synthetic acceleration, numerical routines, actual worker lifecycle, and the module and embedded standalone browser applications over loopback HTTP. No flight data or achieved qualification history was supplied. This is a screening prototype, with no certification, fatigue, damage or safety conclusion.

## Automated checks

Node v22.22.1: `npm test` passed all 146 existing reference-site tests. `npm run test:flight-response` passed all 34 prototype tests: 22 physics/input tests, four actual-worker tests, seven streaming/resource/map tests, and one self-contained bundle test. No runtime packages were installed. Logs accompany the portable package.

The physics suite checks zero input; absolute and pseudo-acceleration sinusoidal steady-state FRFs at Q=2, 10 and 50; amplitude/sign scaling; stateful irregular blocks versus a whole-record recurrence; ringdown; sampling and nested-grid convergence; seeded swept-tone dwell and amplitude changes; physical/resource limits; timestamp/unit conversion; log interpolation; missing coverage and mismatched metadata; invalid, zero, negative and nonfinite imports; squared PSD unit normalization; the flat-PSD pseudo-acceleration closed-form integral; the two declared Rayleigh peak-factor equations; qualification duration; local-window rise/fall; monotonic running maxima; and final/reference invariance under display-window changes. A separate full-history computation agrees with the binned record's primary/residual maximax.

The worker suite executes the actual worker source via a Node bridge, checks deterministic repeated transferred results, terminates an active calculation and starts another, and rejects incompatible reference metadata and invalid settings. The bundle test parses the complete embedded JavaScript, checks the solver/Blob worker/CSP/algorithm notes are present, checks no automatic external script/style assets or module imports remain, and checks deterministic rebuilds.

In the existing convergence test at 20 samples per natural-frequency cycle, a test sinusoid had about 1.31% sampled/first-order-hold peak error; error decreases on refinement. The current permitted upper natural frequency is sample rate/2, inclusive. The 20-samples/cycle case is a convergence example and caution threshold, not the current acceptance floor. Neither example promises peak accuracy for an arbitrary imported transient. Extrema between samples are not optimized. High-Q grids require at least six points per approximate resonant bandwidth, and still require refinement.

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

## Large-flight CSV follow-up (2026-10-11)

The previous 60 MB whole-text path also imposed 2 million samples, 120 s and 350 million steps. The new worker CSV path allows 512 MB, 32 million samples and 24 hours, with a 20 billion-step / 128 MB exact-summary computation budget. The synthetic demo remains 120 s / 2 million samples. These are explicit independent guards, not a promise that every 512 MB file/grid fits. Qualified CSV shape remains `time_s,acceleration`, one axis with declared units. No decimation, skipped samples or truncated record is used.

New regression tests cover BOM/UTF-8/CRLF/comments and byte splits, malformed final rows, long lines, rounded timestamps using endpoint spacing, cancellation/restart, repeated actual-worker file loads, chunked/whole-record bit agreement for both response conventions, proactive resource guards, and heatmap envelope groups against brute-force exact local windows. Bundle tests verify both Compute and CSV-load worker creation are embedded.

The opt-in `tests/large-file-check.mjs` creates a disk-backed 225,000,020-byte CSV with 5,000,000 Float64 samples at 16,384 Hz (305.17572021484375 s). It runs two complete worker loads, cancellation in parsing and computation, a full default absolute-acceleration bank, a smaller pseudo-acceleration bank, and a nonfinite final row. It checks every sample count/duration, analytical steady sinusoidal magnitudes, primary/residual/final identities, and progress; reports process RSS, worker heap/ArrayBuffer observations and wall time. Memory RSS includes the Node harness and worker together and is not a browser heap measurement. Detailed measured results are in the accompanying `large-file-validation.json`.

Programmatic File/Blob and actual worker tests exercise the production parser/solver. They do not claim a browser chooser import of a 225 MB file. The existing chooser/file-URL permission restrictions and direct-file denial were respected. Chrome loopback synthetic source/embedded bundle QA is separate. User files were never accessed.

Measured large-file results on this Mac:

| Case | Wall time | Peak process RSS | Result |
| --- | ---: | ---: | --- |
| Complete CSV load 1 / 2 | 4.62 / 4.75 s | 240.9 / 246.3 MB | 5,000,000 rows, exact sample rate and duration; metadata only returned |
| Absolute, default 305 oscillators | 49.68 s | 290.1 MB | 1,546,975,555 steps; 30.22 MB exact summaries; max steady FRF error 0.012372% |
| Pseudo, 10 oscillators over 60–68 Hz | 5.93 s | 297.9 MB | all 5,000,000 samples; max steady FRF error 0.012204% |
| Cancel parsing / computing | worker termination 0.94 / 2.25 ms | 206.5 / 259.2 MB | no partial result; subsequent full computation succeeded |
| Nonfinite row 5,000,002 | 2.57 s | 296.7 MB | rejected before a valid result |

Peak sampled worker heap was 35.2 MB and ArrayBuffers 75.5 MB in the full bank. RSS is an observation of this Node run, not a guaranteed browser/device memory budget. The 225 MB File/Blob pipeline and full worker computation passed; browser chooser import was not performed. The routine prototype suite now passes 34 tests.

Follow-up Chrome QA used a freshly started loopback server on port 4184 for both source and regenerated standalone. Source checks covered 0.25 s / 4 s windows, running/final overlays, scrub, 5x playback through residual decay, visible 512 MB CSV limits, and cancel/restart. The embedded source restored a saved 0.25 s window after reload and recomputed 305 oscillators; numeric window values now select matching option values (and supported custom windows can be restored). The qualification duration stayed at 120 s through display changes. Screenshots: `large-flight-source-playback.jpg`, `large-flight-csv-limits.jpg`, `large-flight-standalone-limits.jpg`, and `large-flight-standalone-playback.jpg`. No application-origin browser error was observed. Browser chooser/file:// and Windows verification remain unperformed.

Embedded manual Compute initially failed because the iframe omitted `allow-forms`, which prevented the submit event. The frame now permits that event; CSP `form-action none` prevents actual form navigation. Browser checks confirmed manual Compute and Cancel/restart after regeneration. This corrects an integration issue that automatic startup computation did not exercise. Bundle regression checks cover both frame permission and the navigation restriction.

## Nyquist display-range follow-up

The requested natural-frequency range is now allowed through fₛ/2, inclusive: a 5,000 Hz record supports a 2,500 Hz grid endpoint. The 200 kHz sample-rate cap remains. This changes the range guard, not the exact FOH recurrence, sample retention or oscillator continuity. Frequencies above Nyquist still reject before comparison. A visible coarse-sampling note appears below 20 samples per highest-frequency cycle; 20 is a caution threshold, not a hard minimum or validated accuracy criterion. The comparison readout and evidence/CSV exports explicitly state that ratios in this range do not establish qualification coverage. JSON includes the per-frequency caution mask and sample-rate/Nyquist metadata. No upsampling or invented measurement information is introduced.

Current tests: 37 prototype tests and 146 existing project tests pass. New tests cover the inclusive 5 kHz/2.5 kHz endpoint, rejection just above it, both response conventions in the actual worker, and the production CSV worker deriving 5 kHz from two-column synthetic timestamps while retaining all 5,001 samples. Phase tests demonstrate that a unit sine at exactly Nyquist samples effectively to zero while cosine-phase samples alternate ±1. Both are finite/stable in the filter, but neither behavior proves accurate recovery of the original continuous response peaks.

Independent SciPy checks now include 44 state-transition cases, with 12 additional cases at fₙ = 2000, 2499 and 2500 Hz for fₛ = 5000 Hz and Q = 1, 10, 50 and 100. Maximum absolute state error is 2.153×10⁻¹². Sixteen complete 513-sample histories at 2499/2500 Hz, both response conventions and all four Q values agree with an independently constructed augmented matrix-exponential integration to 1.085×10⁻¹² maximum absolute output error. This validates integration of the chosen piecewise-linear interpolant, not reconstruction of acquisition information or unsampled extrema. The 24 independent spectral-integration cases remain within 7.769×10⁻⁶ relative error. Reports accompany the refreshed portable package.

Chrome QA over local HTTP verified the integrated standalone and source experience at 5 kHz sampling, 10–2500 Hz natural-frequency range, 90,001 synthetic samples and 384 continuously integrated oscillators. The displayed sampling note correctly reports a 2500 Hz Nyquist endpoint and two samples per highest-frequency cycle; the coarse-range caution begins above 250 Hz. Source UI rejection at 2500.01 Hz cleared plots and disabled evidence export. Compute cancellation cleared partial results and a restart completed. Display-window changes between 0.25 s and 4 s retained the 120 s qualification duration. Five-times playback and final/running overlays were checked. The integrated screenshot is `flight-response-nyquist-2500hz.jpg`; the source screenshot is `flight-response-nyquist-source.jpg`.

Evidence export initiated a browser action, but a completed download/saved path was not confirmed. Browser chooser imports, direct file:// use, Windows and other browser platforms remain unverified. The earlier 225 MB production-worker benchmark was not repeated for this guard/UI follow-up; its recorded results remain historical large-file evidence. No real user CSV was accessed, and no qualification, damage or safety conclusion is made.

## Editable map time axis

Map start/end controls now select a visible interval and snap outward to the stored 50 ms bin boundaries, retaining the true partial residual endpoint. Playback, scrub, map clicks, hover lookup and keyboard Home/End use the corresponding original-record bin indices. Full record restores the full axis. Zoom does not restart oscillators, change local-window history, truncate computation, alter qualification duration or recalculate final maxima. Range-aware heatmap aggregation retains the trailing local-window history before the visible start but excludes display bins after the visible end. Narrow views rebuild pixels from the selected bins, preserving available time detail rather than stretching the full-record envelope.

All 40 prototype checks and 146 project checks pass. New focused checks compare cropped heatmap pixels against brute-force exact local windows over multiple display-window lengths and aggregation strides, including an early lookback peak and a large post-range outlier. They also check fractional bounds, invalid/nonfinite/reversed bounds, a final partial ringdown bin and absolute-time seeking at both edges. Existing continuity, final/reference invariance and numerical validation cases still pass.

Chrome source QA on a fresh loopback origin (port 4187) verified 10–14 s zoom at 5000 Hz sampling and a 2500 Hz natural-frequency endpoint. A map-center click sought 12.30 s, Home/End sought 10.05/14.00 s, invalid reversed limits preserved the 10–14 s view, and Full record restored 0–22.3978 s. Requested 0.213–0.887 s snapped to 0.20–0.90 s. Five-times playback stopped at 14.00 s, and qualification duration stayed at 120 s after display-window changes. The integrated standalone controls were also checked over local HTTP. No application-origin browser error was observed. Screenshots accompany the updated delivery. The user's report confirmed the previous standalone worked by direct file opening; automated direct-file testing remains unavailable. No real user CSV was accessed.
