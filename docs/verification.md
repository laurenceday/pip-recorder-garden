# Local verification record

Verified on 31 August 2026 on macOS arm64.

## Supported runtime proof

The test run uses the official Node.js 22.19.0 macOS arm64 archive. Its SHA-256 digest was checked against the release `SHASUMS256.txt` before extraction:

```text
c59006db713c770d6ec63ae16cb3edc11f49ee093b5c415d667bb4f436c6526d  node-v22.19.0-darwin-arm64.tar.gz
```

With that binary first on `PATH`, a clean `npm ci` installed 28 packages and reported no known vulnerabilities. `npm run verify:local` then completed with exit code 0.

## Automated evidence

- Catalogue generation and the stale-output check both reported 12 lessons.
- The Node test suite passed 104 of 104 tests with none skipped.
- TypeScript and oxlint completed without findings.
- The source and built-runtime boundary checks completed cleanly; the source check examined 23 files.
- The production build emitted 238.51 kB of JavaScript and 21.98 kB of CSS. The JavaScript total remains below the 300000-byte ceiling.
- The dependency audit reported no known vulnerabilities at moderate severity or above.
- Ruby parsed all three workflow files as YAML.
- A local Vite production preview returned HTTP 200.
- `git diff --check` reported no whitespace errors.

The machine-readable Node test receipt is generated at `.elenchus/node-test.json`. Its latest accepted run records the executed tests, assertion failures, runner errors and skipped tests.

## Guided mission evidence

- Pure tests schedule every onset, release and beat in lesson 8’s B-A-A-B model, including a quiet gap between its repeated A notes.
- Guide state tests cover natural finish, user stop, hidden tab, lesson change, completion and teardown. One shared 40 millisecond start delay now keeps Web Audio onsets and note highlighting on the same schedule. Controls lock before `AudioContext.resume()` can yield, without highlighting a note before its sound; a stop during that wait still owns the recovery path. Source checks also require a rejected resume to close its owned context and return to a visible stopped state.
- Rhythm tests accept the same broad shape at a different tempo, distinguish a clearly different shape and fail closed on malformed taps.
- Pattern-maker tests enforce two-to-four-note bounds, current-lesson notes, frozen controls during playback, an explicit stop action and a participation exit before a tune is ready. The standing decision, family flow and verification record all name **Finish without a tune** as the optional route.
- Scripted lesson, retry and garden navigation selects immediate scrolling when the learner prefers reduced motion and smooth scrolling otherwise.
- The one saved-progress key remains `pip-recorder-garden.completed.v1`; mission tunes, taps, timing, routes and attempts stay in memory only.

The earlier guided-mission demo was exercised at 390 by 844 CSS pixels without requesting microphone permission. The current browser replay covers ready, playing, tap, done, more and error at 320 by 568, 391 by 844 and 768 by 1024 CSS pixels. It also checks a 568 by 320 wide view, 320 by 568 with 200% text and reduced motion, and 320 by 568 with 44-pixel top and 34-pixel bottom safe areas. Each scenario opens the eight-note octave pattern in ready and more states. The resulting 48 measurements are synthetic Chrome evidence, not a real-device comfort claim.

## Boundaries covered by checks

The test suite covers the complete pattern scheduler, rhythm comparison, bounded tune making, phone ordering, child target sizes, exact C5 to C6 Baroque fingerings, synthesized notes, silence, noise, adjacent-note refusal, stable holds, repeated-note releases, saved-progress filtering, schema drift, hostile idea text, agent path restrictions, workflow action pins, Pages permissions, provider-secret scope and readable accent contrast.

The source check refuses audio recording and browser network channels in the child-facing application. It also keeps microphone access, local storage and audible output in their named modules; requires microphone tracks and audio contexts to close; rejects stale state after a cancelled permission request; and prevents the microphone graph from reaching the speakers. The post-build check repeats the recorder and outbound-channel refusal against the minified production JavaScript.

## Evidence still requiring a real device

Automated checks and the microphone-free browser demo cannot establish behaviour for a particular microphone, recorder, browser or room. Before giving the site to a child, an adult still needs to run the device checklist in the README. In particular, confirm that the browser permission indicator clears after every stop path, that guide volume is comfortable and that B is recognised at a comfortable playing distance without pressuring the child to satisfy the detector.

Local evidence alone is not a release claim. Release acceptance requires the live check below to pass against the accepted `main` build.

## Release artifact checks

Run the JavaScript budget gate after `npm run verify:local` has built `dist/`:

```sh
node scripts/check-bundle-budget.mjs \
  --candidate one-screen-play-loop \
  --criterion production-javascript-bytes \
  --report .hexaemeron/reports/conformance/one-screen-play-loop--production-javascript-bytes.json
```

After the accepted commit is deployed, run the live gate against the same checked-out tree:

```sh
node scripts/check-live-pages.mjs \
  --candidate one-screen-play-loop \
  --criterion live-pages-boots-built-artifact \
  --report .hexaemeron/reports/conformance/one-screen-play-loop--live-pages-boots-built-artifact.json
```

The live check accepts only the expected HTTPS site path, one relative hashed JavaScript entry and an application root. It rejects a development source entry, redirects outside the site, missing or oversized responses, an asset name from another build and live bytes that differ from the local accepted build. [ADR-006](decisions/ADR-006-publish-pages-from-the-checked-workflow.md) records why the checked Actions workflow is the only publishing authority.

Each conformance command writes the closed seven-field report consumed by the design gate and a neighbouring `.evidence.json` record with the check-specific digests and measurements. Keeping those two records separate prevents detailed evidence from changing the controller contract.

The Pages build has a twenty-minute job limit. The previous ten-minute limit was too short when a cold dependency install consumed almost five minutes and the complete verification gate then reached the job deadline. The deploy job keeps its separate ten-minute limit.

## Child-layout check

Run the layout gate after `npm run verify:local` has built `dist/`:

```sh
node scripts/check-child-layout.mjs \
  --candidate one-screen-play-loop \
  --criterion small-phone-no-scroll \
  --report .hexaemeron/reports/conformance/one-screen-play-loop--small-phone-no-scroll.json
```

The report binds the layout checker, package contract, `App`, child component and CSS to one commit. It retains the viewport, scroll size, smallest text, smallest action, exit count, clipping result and focus result for every state and scenario. The checker serves only bounded files from `dist/` over loopback, launches a fresh local Chrome profile without shell evaluation, and removes that profile when it stops.

## Child-copy role check

Run the copy gate after `npm run verify:local`:

```sh
node scripts/check-child-copy.mjs \
  --candidate one-screen-play-loop \
  --criterion rendered-child-copy-approved \
  --report .hexaemeron/reports/conformance/one-screen-play-loop--rendered-child-copy-approved.json
```

The report records a commit-bound digest for its checker, `package.json`, `package-lock.json`, `App`, the grown-up wrapper, the copy contract, global CSS and every transitive child TSX render source, plus the Node and TypeScript versions, six declared child states, 25 visible-and-accessible manifest entries and the exact 15-token lexicon. `App` must import the two role roots under their exact names and return only the child tree from its child-mode branch and only the grown-up tree afterwards. Raw JSX text, visible or accessible string attributes, open or composite child expressions, generated CSS copy, uninspectable artwork paths, open error text, opposite-role imports and an unlisted state fail the check. Source bytes that differ from the report’s named commit fail before a report is written. Existing output files and every report-path directory are checked as regular, non-symlink filesystem entries before an atomic replacement.

The check establishes conformance to the reviewed list. It does not establish that the intended child has been taught every admitted word. Before family use, ask her to read or act on Pip, Play, Stop, Tap, More, Try, Done and Back on both the intended phone and tablet. Record any word that needs a picture, spoken model or replacement. Keep recorder, room, comfortable volume, microphone behaviour and learning response in the real-device checklist above.
