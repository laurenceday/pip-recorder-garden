# Local verification record

Verified on 31 August 2026 on macOS arm64.

## Supported runtime proof

The test run used the official Node.js 22.19.0 macOS arm64 archive. Its SHA-256 digest was checked against the release `SHASUMS256.txt` before extraction:

```text
c59006db713c770d6ec63ae16cb3edc11f49ee093b5c415d667bb4f436c6526d  node-v22.19.0-darwin-arm64.tar.gz
```

With that binary first on `PATH`, a clean `npm ci` installed 28 packages and reported no known vulnerabilities. `npm run verify:local` then completed with exit code 0.

## Automated evidence

- Catalogue generation and the stale-output check both reported 12 lessons.
- The Node test suite passed 38 of 38 tests with none skipped.
- TypeScript and oxlint completed without findings.
- The runtime boundary check examined 16 source files and completed cleanly.
- The production build emitted 219.86 kB of JavaScript (69.63 kB gzip) and 14.29 kB of CSS (4.19 kB gzip).
- The dependency audit reported no known vulnerabilities at moderate severity or above.
- Ruby parsed all three workflow files as YAML.
- The local preview returned HTTP 200 at `http://127.0.0.1:4173/`.
- `git diff --check` reported no whitespace errors.

The machine-readable Node test receipt is generated at `.elenchus/node-test.json`. Its latest run records exit code 0, 38 passes, no failures and no skipped tests.

## Boundaries covered by checks

The test suite covers the exact C5 to C6 Baroque fingerings, synthesized notes, silence, noise, adjacent-note refusal, stable holds, repeated-note releases, saved-progress filtering, schema drift, hostile idea text, agent path restrictions, workflow action pins, Pages permissions, provider-secret scope and readable accent contrast.

The static check refuses audio recording and browser network channels in the child-facing runtime. It also keeps microphone access, local storage and audible output in their named modules; requires microphone tracks and audio contexts to close; rejects stale state after a cancelled permission request; and prevents the microphone graph from reaching the speakers.

## Evidence still requiring a real device

Automated checks cannot establish behaviour for a particular microphone, recorder, browser or room. Before giving the site to a child, an adult still needs to run the device checklist in the README. In particular, confirm that the browser permission indicator clears after every stop path and that B is recognised at a comfortable playing distance without pressuring the child to satisfy the detector.

This record does not claim that any branch has been pushed, that GitHub Pages is enabled, or that the site is deployed.
