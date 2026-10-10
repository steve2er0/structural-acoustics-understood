# Integration and portable source

Confirmed target on this Mac: `/Users/stephenwells/Documents/DevOps/structural-acoustics-understood`. Project registry label `structural-acoustics-understood`; root README identifies Structural Acoustics, Understood. Initial Git status was clean. No applicable ancestor/project AGENTS.md or project-local SKILL.md was present. Project design guidelines were inspected. This is a new independent experience, following the existing experiences architecture; it does not migrate or replace a calculator or Vibration Lab.

Changed existing files:

- `js/homepage.js`: homepage action links to `#/tool/flight-response`.
- `js/app.js`: Tools catalog/launcher/search registration, random-vibration classification, custom route and cleanup.
- `scripts/sync-standalone.mjs`: builds and embeds the complete generated tool module before its normal standalone synchronization.
- `package.json`: add `test:flight-response` script.
- `README.md`: add prototype launch/scope section.
- `standalone.html`: regenerated using existing `scripts/sync-standalone.mjs`, never hand-edited.

New integration files: `scripts/build-flight-response.mjs`, generated `js/flight-response-tool.js`, and generated `experiences/flight-response/Flight-Response.html`.

New experience files: `index.html`, `style.css`, `app.mjs`, `physics.mjs`, `worker.mjs`, `serve.mjs`, `README.md`, `tests/*`, `docs/*`, and synthetic-only examples. No package installation/runtime dependency, service worker change or deployment or real/proprietary data access occurred. Only this confirmed project was modified. Root files were byte-checked immediately before integration to preserve concurrent edits.

Root multi-file runtime uses existing server, with its 127.0.0.1 binding and JS module MIME support. The experience imports no root numerical code. CSS uses shared site tokens with local fallback values; optional parent stylesheet provides existing tokens. No cache registration or telemetry is added. The existing standalone HTML embeds the entire tool: styles, state-space solver, worker source, controls and algorithm notes. A sandboxed srcdoc frame contains the experience, with a Blob worker and no automatic external assets. The Tools entry, launcher, subject filter and global search use the same route. Frame removal stops its worker; local frame-height messages keep the site layout responsive. Direct file:// browser verification was blocked by browser URL security policy (HTTP/HTTPS only); no workaround was attempted. The embedded standalone route was tested over localhost.

## Portable archive usage

Extract the archive; inside `sau-flight-response/experiences/flight-response` run `node serve.mjs` and open http://127.0.0.1:4186/. No npm install. The portable copy removes the optional parent stylesheet reference and uses fallback tokens. Its home link points to the local launcher root. Browser module workers require HTTP rather than file://. Windows has not been tested.

To integrate elsewhere into an existing Structural Acoustics, Understood checkout, copy the new `experiences/flight-response/`, `scripts/build-flight-response.mjs` and `js/flight-response-tool.js` files. Review the included `integration/root-integration.patch` for the five existing-source edits (app, homepage, build workflow, package and README); it excludes the generated existing standalone HTML. Apply only to a compatible checkout, then run `npm run build:standalone` and the tests. The original project's standalone generator incorporates the new module. Do not overwrite existing root files or unrelated experiences. Review applicable repository instructions first.

The archive contains only newly written prototype source, tests, documentation, synthetic fixtures, validation summaries and screenshots when available. It excludes `.git`, node_modules, browsers, Python packages, private data, user study exports, credentials and root application source. Optional SciPy is needed only to rerun the independent validation script; it is not bundled.
