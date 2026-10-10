# Flight response playback

Local browser engineering prototype for Structural Acoustics, Understood. Synthetic only on startup; no actual flight or achieved qualification data was used.

From the project root:

```sh
npm start
```

Open http://localhost:4173/#/tool/flight-response or choose Flight response / qualification coverage in Tools. The existing `standalone.html` now embeds the complete tool at `#/tool/flight-response`; no companion files are needed for that tool. The separate experience remains at http://localhost:4173/experiences/flight-response/. Numerical tests: `npm run test:flight-response`.

The generated `Flight-Response.html` also embeds this prototype alone. Direct file:// verification was blocked by browser security policy; the same embedded code was browser-tested over localhost. Portable module source: from this directory run `node serve.mjs`, then open http://127.0.0.1:4186/ . Node 22 was used on this Mac; no npm installation or runtime packages are needed. Serve the module source over HTTP; the generated single-file variants use an embedded Blob worker instead of module imports. The optional parent stylesheet may 404 when portable; tool-local CSS provides all necessary styling. Windows/browser behavior on other systems has not been verified.

Use Compute after changing physical inputs. Play/pause, speed, time scrub and map seeking control playback. Display windows alter only presentation. Running maxima retain previous response peaks; final maximax includes the entire record and appended zero-input residual. 50 ms display bins allow efficient playback; sampled whole-record maxima remain independent of the window.

Flight CSV: header `time_s,acceleration`; choose g or m/s² before loading. Uniform timestamps within 0.1% dt, one axis, up to 120 s, 2 million samples, 200 kHz. No DC removal, detrending, filtering or resampling occurs. Prehistory and acquisition anti-alias filtering must be established separately. Oscillators require fₛ ≥20 fₙ,max; this is a screening floor, not guaranteed peak accuracy. At exactly 20 samples/cycle the test sinusoid showed about 1.31% sampled/FOH peak error. Refine sampling and grid.

Reference CSV: `frequency_hz,ers` with strictly positive values, declared units/Q/response and primary+residual maximax. It must span the complete grid. No extrapolation, zero denominator or incompatible metadata is allowed. The program validates declarations, not their truth.

PSD CSV/textarea: `frequency_hz,psd`, one-sided PSD in g²/Hz or (m/s²)²/Hz. Positive, increasing frequencies; piecewise log-log interpolation; zero outside the entered band is explicitly assumed. Duration enters the visible statistical peak model and never changes with the display window. The selected transfer function, Q and natural-frequency grid apply to both sides. This estimate is a stationary peak model with no known qualification startup/shutdown record. It is not achieved-test evidence.

Settings automatically persist locally; imported acceleration stays in memory. Export study JSON to retain all inputs including imported samples; Import study restores them. Export evidence JSON captures units, response/Q, numerical method, raw reference specification, peak model, durations, maxima, ratios and limitations. The CSV includes final, primary and residual maxima. Reset restores the seeded baseline. No telemetry, fetch, XHR or data upload exists; CSP blocks connection APIs. User-initiated source links leave the tool.

See [algorithm](docs/ALGORITHM.md), [validation](docs/VALIDATION.md), and [integration](docs/INTEGRATION.md). This compares peak responses, not fatigue or damage. Screening only; no certification or safety conclusions.
