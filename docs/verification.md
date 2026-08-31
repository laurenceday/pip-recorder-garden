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
- The Node test suite passed 67 of 67 tests with none skipped.
- TypeScript and oxlint completed without findings.
- The source and built-runtime boundary checks completed cleanly; the source check examined 20 files.
- The production build emitted 232.82 kB of JavaScript (72.82 kB gzip) and 19.27 kB of CSS (5.07 kB gzip). The JavaScript total was 232827 bytes, below the 300000-byte ceiling.
- The dependency audit reported no known vulnerabilities at moderate severity or above.
- Ruby parsed all three workflow files as YAML.
- A local Vite production preview returned HTTP 200.
- `git diff --check` reported no whitespace errors.

The machine-readable Node test receipt is generated at `.elenchus/node-test.json`. Its latest run records 67 executed tests, no assertion failures, no runner errors and no skipped tests.

## Guided mission evidence

- Pure tests schedule every onset, release and beat in lesson 8’s B-A-A-B model, including a quiet gap between its repeated A notes.
- Guide state tests cover natural finish, user stop, hidden tab, lesson change, completion and teardown. One shared 40 millisecond start delay now keeps Web Audio onsets and note highlighting on the same schedule. Controls lock before `AudioContext.resume()` can yield, without highlighting a note before its sound; a stop during that wait still owns the recovery path. Source checks also require a rejected resume to close its owned context and return to a visible stopped state.
- Rhythm tests accept the same broad shape at a different tempo, distinguish a clearly different shape and fail closed on malformed taps.
- Pattern-maker tests enforce two-to-four-note bounds, current-lesson notes, frozen controls during playback, an explicit stop action and a participation exit before a tune is ready. The standing decision, family flow and verification record all name **Finish without a tune** as the optional route.
- Scripted lesson, retry and garden navigation selects immediate scrolling when the learner prefers reduced motion and smooth scrolling otherwise.
- The one saved-progress key remains `pip-recorder-garden.completed.v1`; mission tunes, taps, timing, routes and attempts stay in memory only.

The local development demo was also exercised at 390 by 844 CSS pixels without requesting microphone permission. The active lesson began at 91 CSS pixels and the lesson 8 garden path began below it at 1296 CSS pixels. No visible child lesson control measured below 44 by 44 CSS pixels. Lesson 8 visibly advanced through B, A, A and B before moving from **Hear it** to **Copy it**. Fingering and rhythm both returned to the route chooser; **Play to Pip** opened the ready card without requesting permission; and the empty maker offered **Finish without a tune**. Equal rhythm taps reached the maker; its add, undo and finish controls froze while B-A sounded; **Stop my tune** restored them. Route-agnostic completion used the participation-only heading **A flower grew for this musical turn!** Finishing left the same lesson selected and offered only **Stop here for today**, **Play this mission again** and **Back to the garden path**. Lesson 12’s fingering clue, puzzle and active note advanced together from low C to D, and its copy-mode note stones were not interactive. The application console had no warning or error.

## Boundaries covered by checks

The test suite covers the complete pattern scheduler, rhythm comparison, bounded tune making, phone ordering, child target sizes, exact C5 to C6 Baroque fingerings, synthesized notes, silence, noise, adjacent-note refusal, stable holds, repeated-note releases, saved-progress filtering, schema drift, hostile idea text, agent path restrictions, workflow action pins, Pages permissions, provider-secret scope and readable accent contrast.

The source check refuses audio recording and browser network channels in the child-facing application. It also keeps microphone access, local storage and audible output in their named modules; requires microphone tracks and audio contexts to close; rejects stale state after a cancelled permission request; and prevents the microphone graph from reaching the speakers. The post-build check repeats the recorder and outbound-channel refusal against the minified production JavaScript.

## Evidence still requiring a real device

Automated checks and the microphone-free browser demo cannot establish behaviour for a particular microphone, recorder, browser or room. Before giving the site to a child, an adult still needs to run the device checklist in the README. In particular, confirm that the browser permission indicator clears after every stop path, that guide volume is comfortable and that B is recognised at a comfortable playing distance without pressuring the child to satisfy the detector.

This record does not claim that any branch has been pushed, that GitHub Pages is enabled, or that the site is deployed.
