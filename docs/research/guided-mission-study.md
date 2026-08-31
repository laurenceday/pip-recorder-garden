Assuming, unless corrected:

1. The user’s “pips-recorder-garden” means the public repository whose actual origin is `https://github.com/laurenceday/pip-recorder-garden.git`; no repository named `pips-recorder-garden` was substituted.
2. The learner is around five, at Reception or early Key Stage 1, using a conventional soprano or descant recorder in C with Baroque fingering, with a grown-up available for permission, volume and shared play.
3. “More in-depth, engaging and useful” means more musical actions: listen, copy, move, choose and create. It does not mean longer screen time, more points, streaks, locked lessons or attention-capture mechanics.
4. The existing twelve open lessons, browser-local audio boundary, no-account design, adult-assisted route, static GitHub Pages deployment and human-reviewed lesson proposal boundary remain requirements.
5. The prototype may add repository-owned TypeScript, CSS, lesson data and tests, but adds no dependency, backend, analytics, recording, child identifier or new persisted field without a separate ask-first decision.
6. No learning outcome, microphone accuracy or five-year-old usability claim will be made without observation on the intended child, recorder, browser, device and room. Automated checks establish mechanics, not pedagogy in use.
7. The selected construction is one capability: a reusable guided mission loop. Whole-pattern modelling, active fingering, rhythm response, child choice and the adult route are phases of that one loop; cutting any phase breaks the stated teaching-cycle criterion rather than yielding an independent deliverable.

## 1. Problem statement

Deepen Pip’s Recorder Garden for a five-year-old and the grown-up beside her. A working prototype keeps the existing safe twelve-lesson course but turns each lesson from a mostly passive fingering card plus single-note detector into a short, predictable musical mission: hear the whole target, see it move, try it, make one small choice or variation, celebrate the attempt, then stop or continue by choice.

The root demo path is `npm run dev`, opened at the exact localhost URL Vite prints. At a phone-sized viewport, the active lesson appears before the full lesson picker. In lesson 8, one press plays the complete B-A-A-B model with the note stones and beat pulse in sync; the child can copy it with microphone help or the no-microphone route. A fingering mission lets her cover or uncover large holes to match B or A. A rhythm mission accepts large-tap echo input without microphone permission. A make-your-own turn lets her choose a bounded two-to-four-note pattern from the lesson’s known notes, hear it, and try it without recording or saving the composition. The grown-up gets one adjacent co-play prompt and a clear automatic stopping point.

Success means:

- every sequence lesson’s “listen” instruction has truthful whole-pattern audio, including beat durations and repeated-note gaps, proved by `node --experimental-strip-types --test tests/mission-loop.test.mjs`;
- the guide sequencer is user-started, exposes stop, stops on lesson change, completion, tab hiding and teardown, and never overlaps microphone capture, proved by `npm run check` and the same mission-loop tests;
- fingering-match, rhythm-echo and bounded create-a-pattern turns use only the notes already allowed for that lesson, have a no-microphone completion route and describe uncertainty without judging the child, proved by `node --experimental-strip-types --test tests/mission-loop.test.mjs tests/catalog.test.mjs`;
- every child-facing non-inline control is at least 44 by 44 CSS pixels and the active lesson precedes the full picker at 390 by 844, checked on the named `npm run dev` phone demo path with a recorded browser report;
- the child can reach the first musical response from an active lesson in one action, with no autoplay, countdown, forced repeat, infinite feed or automatic next lesson, checked on the same phone demo path;
- all twelve lessons remain open and usable with the microphone denied or unavailable, and progress still stores only validated completed lesson IDs, proved by `npm run check` plus the denial path in the device acceptance demo;
- the emitted child runtime still has no recorder, network, analytics, account, service worker, IndexedDB or additional local-storage field, proved by `npm run check:boundaries && npm run build`;
- the current catalogue, agent proposal allowlist, workflow permissions, exact Baroque fingerings, pitch fixtures and release handling remain green under `npm run verify:local`;
- the production JavaScript stays at or below 300000 bytes, measured after `npm run build` by `node -e "const fs=require('fs');const p='dist/assets';const n=fs.readdirSync(p).filter(x=>x.endsWith('.js')).reduce((s,x)=>s+fs.statSync(p+'/'+x).size,0);console.log(n);process.exit(n<=300000?0:1)"`;
- a grown-up can complete the README acceptance path on the intended device without the site retaining audio, patterns, timing, scores, attempts or identity.

## 2. Prior art

### Current repository and experience

The starting tree is `main` at `a26387445196aa0ea7fdcd0590c1b895bba3762d`. `npm run check && npm run build` exited zero in this study: 43 of 43 Node tests passed, TypeScript, oxlint and the 16-file static boundary check were clean, and Vite emitted 219.21 kB JavaScript and 14.29 kB CSS before the built-runtime boundary passed. The test suite is strong on catalogue validation, exact Baroque fingerings, synthetic pitch, sequence stability and releases, local progress filtering, microphone ownership, workflow permissions and hostile lesson-agent input. It has no rendered component test, whole-pattern audio scheduler test, rhythm-tap test, active fingering test, child-choice flow test, touch-target check or browser-layout regression.

The rendered app was exercised locally on desktop and a phone-sized viewport. The guide-tone button audibly enters `Playing…` and returns to `Hear D`; selecting an octave note updates its pressed state and fingering; the grown-up help opens. The dominant loop is otherwise repeated across all lessons: read one cue, inspect a passive diagram, hear only the current single note, optionally let the detector advance pitch order, then grow one flower. Lesson 8 says “Listen, then play B, A, A, B,” but `useGuideTone` can emit only one 0.92-second sine tone for the current note, so the product cannot model the phrase or its rhythm. On the phone layout, the full twelve-lesson picker appears before the active lesson. Primary practice buttons are 50 CSS pixels high, but Previous and Next render about 30 CSS pixels high, below the chosen 44-pixel child target. The octave explorer is the only lesson where note stones themselves are interactive.

The public Pages URL returned HTTP 200 during study and served the same `index-BNiHUiN8.js` and `index-Ds2cQuuk.css` asset names as the local build. A scan of the `laurenceday` account found no other recorder, music or garden repository to inherit from. `campbell226/pip-recorder-garden` still returned HTTP 404, so its relationship remains unknown rather than prior art.

### Last two merged pull requests touching the target

1. [PR #4, Record the live Pages deployment](https://github.com/laurenceday/pip-recorder-garden/pull/4), merged as `a26387445196aa0ea7fdcd0590c1b895bba3762d` on 2026-08-31, changed only `README.md`. It records the verified public URL, Actions source and HTTPS state. It has no comments or reviews and carries no product change or open implementation item.
2. [PR #3, Publish Pip’s twelve-lesson recorder garden](https://github.com/laurenceday/pip-recorder-garden/pull/3), merged as `9cf6f60a69aeebaafdf8191e7f04c902e7014e2d` on 2026-08-31, introduced the complete current course, tests, workflows, research and ADRs. It has no comments or reviews. Its Pages-live check is now closed by PR #4 and the observed HTTP 200. Three carried-forward items remain: the Campbell repository is unresolved; the intended microphone/device/room still needs the father’s manual acceptance pass; and no non-fixture lesson-provider response has been exercised. The new mission design does not pretend to close those three.

### Existing decisions and research

`docs/research/study.md`, `docs/research/runbook.md`, `docs/research/README.md` and `docs/verification.md` were read. ADR-001 keeps microphone scoring local, fallible and optional; ADR-002 keeps twelve lessons open, schema-bound and non-punitive; ADR-003 keeps model-authored lesson copy behind validation and human-reviewed pull requests. The new design preserves all three. It extends ADR-002’s learning interaction and must earn a new standing decision record rather than silently changing the old study.

### Authoritative audit inventory and read mode

Exactly one in-scope source was discovered: `audit/rounds/fiat-local-baroque-recorder-curriculum-with-microphon.md`, mapped to `audit/rounds/fiat-local-baroque-recorder-curriculum-with-microphon.synopsis.md`. From the target root, `python3 /Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/fiat/scripts/audit_synopsis.py --check <target-root>` exited zero with source lines 52, synopsis lines 4, source SHA-256 `c7a9f1c3f94ec0b949d88dff6e6272a29b0282e9438363a70493938df17fdd68`, and matching fresh/committed synopsis SHA-256 `7c43f38883ebaa47ca097aef127d29268bb773be23485e706b59d849d28aa10e`. The verified synopsis, not the authoritative source, was read. No root `audit/AUDIT.md`, other round source or plugin audit source was discovered.

The synopsis retains these obligations:

- Round 1 `Covered`: false-pitch-match, child-frustration, audio-privacy, permission-denial, feedback-loop, fingering-drift, progress-pressure, pages-subpath, model-output, idea-injection, workflow-authority, schedule-drift and dependency-advisories were all `reviewed`. `Not checked`: real microphone hardware and acoustic room behaviour; hosted GitHub Actions and Pages; live publication and cache behaviour; future agent-provider behaviour beyond fixture and protocol boundaries. `Elenchus verdict`: `guarded`. S1-R1-01 through S1-R1-05 were fixed and guarded: cancelled microphone resume, credential-redirection base URL, invisible Unicode, malformed/nonconsecutive lessons, and the module-preload fetch shim. `Leads not pursued`: real-device pitch/permission teardown, hosted schedule/cache, and future provider behaviour; no recording/outbound microphone path, mutable action or advisory was found.
- Round 2 carries the same `Covered` and `Not checked` sets. `Elenchus verdict`: `guarded`. S1-R2-01, the exact-twelve extension rejection, was fixed with an isolated parent-red reproduction; S1-R2-02, the absent `check-agent-diff` package command, was fixed and guarded. `Leads not pursued`: the fixed 13-lesson replay passed 43 tests with two allowed changed paths; hardware, hosted, cache and non-fixture provider boundaries stayed open.
- Round 3 carries the same `Covered` and `Not checked` sets. `Elenchus verdict`: `null`. It records no finding. `Leads not pursued`: no new issue remained in microphone ownership, storage, lesson validation, agent writes, workflow authority, Pages paths or emitted JavaScript; hardware acoustics, hosted runs, publication cache and future provider responses stayed external. No `[missing legacy field: ...]` marker appears in the synopsis.

### Authoritative external evidence

Department for Education early-years guidance supports attentive listening, short phrases to copy, call-and-response, gradual introduction and repetition, pitch matching, pulse tapping, movement, experiment and child-created music. The Key Stage 1 programme separately requires playing instruments, concentrated listening and experimenting with, creating, selecting and combining sounds. NAEYC’s developmentally appropriate practice centres play on choice, wonder and delight and says agency should not be withheld as a reward. Its Fred Rogers Center statement treats interactive media as useful only when intentional, developmentally appropriate, active, creative and social. The American Academy of Pediatrics’ current digital-ecosystem guidance supports high-quality child-centred content and joint caregiver use while warning against engagement-prolonging design; this supports co-play prompts and a natural stopping point, not an infinite reward loop. W3C guidance supports short separated instructions, predictable user-controlled change, explicit feedback and 44-by-44 targets. American Recorder Society and Yamaha material support gentle air, tonguing, note-combination practice, rhythm and simple songs. These sources support a model-copy-create loop; none establishes that this exact interface improves this child’s learning.

## 3. Constraints and non-goals

Starting ref: `main` at `a26387445196aa0ea7fdcd0590c1b895bba3762d`. Toolchain: Node 22.19.0 in CI and Pages, npm lockfile, React 19.2.8, TypeScript 5.9.3, Vite 8.2.2, plain CSS, no runtime service. The study baseline also passed under local Node 26.6.0, but that does not replace the pinned Node 22.19.0 gate.

Non-goals: recording or replaying the child; judging tone, posture, expression, rhythm competence or musical worth; accounts, names, scores, attempt history, streaks, leaderboards, locks, timers, ads, notifications, analytics or profiles; staff-notation mastery; a full recorder method; automatic lesson generation or publication; replacing adult teaching; claiming effectiveness without child observation; adding a general animation or game framework.

Always: run both relevant test suites before commit; run the Imprimatur gate on shipped prose; measure before keeping a performance change; preserve visible microphone and audio stop controls; retain adult/no-microphone completion; validate lesson and mission data; keep all audio local and ephemeral; use user-started sound; keep child actions reversible; verify at Node 22.19.0 and the Pages subpath.

Ask first: add a dependency; add or change a stored field; transmit or retain audio or interaction data; add analytics; widen the lesson-agent write set; change the public schema incompatibly; touch CI or Pages authority; change the microphone trust boundary; replace the current live deployment.

Never: record a child; hide capture or playback state; autoplay; punish uncertainty; lock content behind performance; create an infinite feed or forced next step; commit a credential; execute model output; weaken a check; delete a failing test; claim an unrun command or child-learning result.

## 4. Design options

`guided-mission-loop` is one predictable lesson shell with three explicit phases: Pip models the complete phrase with synchronized visual pulse; the child copies through pitch, rhythm or fingering interaction with an adult/no-microphone route; then she makes one bounded choice or tiny pattern from already-known notes. The active lesson is first on small screens, child controls meet 44 pixels, every audio action is user-started and stoppable, and the mission ends with a choice to stop, replay or return to the garden. Four reusable interaction modes (pattern model, fingering match, rhythm echo and bounded pattern maker) serve all twelve lessons without a bespoke game per lesson. Trade: the lesson schema and state machine become richer and need exact cross-mode tests, but the child learns one stable interaction grammar.

`garden-game-arcade` turns each chapter into several named mini-games: note hunt, hole puzzle, raindrop rhythm, echo bird, tune race and others. It can cover model, practice and creation and preserve privacy, but requires a child to choose a game before the first musical response and multiplies state machines, copy patterns and audit surface. Trade: more immediate novelty for less predictability and more maintenance; it risks the “bells and whistles” distraction and engagement-prolonging pattern the AAP evidence warns about.

`open-composition-studio` centres a drag-or-tap note garden where the child freely arranges, hears and plays patterns. It offers strong agency, starts in one action and needs no persistence or backend. Trade: it lacks a complete teach-practise-create progression for a beginner who does not yet know what to explore, so it fails the selection hard gate even though it remains a useful later mode inside the guided loop.

The closed record at `.hexaemeron/design-evidence.json` compares all three over seven criteria spanning correctness, time, space, compatibility and recovery. `open-composition-studio` fails `teaching-cycle`. Of the two survivors, `guided-mission-loop` reaches practice in one child action while `garden-game-arcade` needs two; both add zero persisted fields. The selected candidate is therefore the unique non-dominated frontier, not a prose preference.

## 5. Risk register seed

```risk-register
pattern-model-drift | scheduled guide audio against lesson note and beat data | every emitted onset duration highlight and repeated-note gap derives from the validated pattern and has deterministic clock tests
audio-overlap | guide pattern and microphone audio contexts | starting either stops the other and every lesson change completion hide and teardown closes owned resources
child-frustration | detector rhythm and fingering feedback presented to a five-year-old | feedback describes the helper or next action never the child and every mission has replay skip and grown-up completion
attention-capture | celebrations choices and automatic progression | no autoplay streak countdown infinite feed forced repeat or automatic next lesson and every mission presents a natural stop
false-learning-signal | successful taps or pitch matches interpreted as musical mastery | completion records participation only and copy says the tool cannot grade tone posture expression or learning
touch-miss | small controls used by a young child on a phone | every child-facing non-inline target measures at least 44 by 44 CSS pixels with visible focus and sufficient spacing
mobile-displacement | twelve-choice picker before the active task | active mission precedes the full picker at phone width and remains reachable through skip and garden controls
schema-drift | richer mission data enters catalogue and agent proposal paths | one closed versioned schema executable validator generated catalogue and hostile fixture cover every activity kind
creative-escape | child or model selected notes create unsupported data paths | creation is in-memory only bounded to the lesson vocabulary and never becomes HTML URL path command or persisted data
privacy-expansion | interaction detail becomes useful-looking telemetry or saved progress | retain only completed lesson IDs and refuse audio event timing pattern score attempt and identity storage or transmission
device-variance | browser oscillator timing microphone and room behaviour differ | deterministic pure tests establish scheduling while the intended device acceptance path remains a named manual gate
bundle-growth | extra interactions make the static phone experience slow | preserve the measured baseline and enforce the declared 300000-byte production JavaScript ceiling
```

## 6. Glossary seeds

Mission: one bounded lesson turn with model, copy, make and stop choices.

Pattern model: user-started guide playback of the whole lesson phrase, including beat durations and repeated-note releases.

Visual pulse: the non-audio indication of the currently modelled note and beat.

Fingering match: a large-target activity where the child covers or opens diagram holes to match a named note; it does not claim physical finger technique.

Rhythm echo: a microphone-free tap response compared with a broad relative pattern, with retry and skip.

Pattern maker: an in-memory two-to-four-note choice drawn only from notes already introduced in the lesson.

Participation completion: a saved lesson flower acknowledging a turn, not a grade or mastery claim.

Natural stop: the end-of-mission choice to stop, replay or return to the garden, with no automatic next lesson.

Child control: a non-inline action intended for the learner; its pointer target is at least 44 by 44 CSS pixels.

## 7. Sources

Repository evidence:

- `src/App.tsx`, `src/components/PatternStrip.tsx`, `src/components/FingeringDiagram.tsx`, `src/components/LessonTrail.tsx`, `src/hooks/useGuideTone.ts`, `src/hooks/useMicrophoneScoring.ts`, `src/lib/lesson-state.ts`, `src/styles.css`.
- `content/lessons/*.json`, especially `content/lessons/08-two-note-echo.json`; `schema/lesson.schema.json`.
- `tests/*.test.mjs`, 43 passing tests; `package.json`; `.github/workflows/ci.yml`; `.github/workflows/pages.yml`.
- `docs/research/study.md`, `docs/research/runbook.md`, `docs/research/README.md`, `docs/verification.md`.
- `docs/decisions/ADR-001-browser-local-microphone-scoring.md`, `ADR-002-twelve-open-schema-bound-lessons.md`, `ADR-003-agents-propose-lessons-by-pull-request.md`.
- Verified synopsis `audit/rounds/fiat-local-baroque-recorder-curriculum-with-microphon.synopsis.md`, source and view digests recorded in item 2.
- [PR #4](https://github.com/laurenceday/pip-recorder-garden/pull/4), [PR #3](https://github.com/laurenceday/pip-recorder-garden/pull/3), and [live Pages site](https://laurenceday.github.io/pip-recorder-garden/), accessed 2026-08-31.

External evidence:

- Department for Education, [Development Matters](https://www.gov.uk/government/publications/development-matters--2/development-matters), updated 2023-09-04.
- Department for Education, [National curriculum in England: music programmes of study](https://www.gov.uk/government/publications/national-curriculum-in-england-music-programmes-of-study), statutory guidance, updated 2021-03-26.
- NAEYC, [Developmentally Appropriate Practice](https://www.naeyc.org/sites/default/files/globally-shared/downloads/PDFs/resources/position-statements/dap_ps_final.pdf) and [principles](https://www.naeyc.org/resources/position-statements/dap/principles).
- NAEYC and Fred Rogers Center, [Technology and Interactive Media as Tools in Early Childhood Programs](https://www.naeyc.org/resources/topics/technology-and-media-0/technology-and-interactive-media-position-statement).
- American Academy of Pediatrics, [Digital Ecosystems, Children, and Adolescents: Policy Statement](https://publications.aap.org/pediatrics/article/157/2/e2025075320/206129/Digital-Ecosystems-Children-and-Adolescents-Policy) and [Technical Report](https://publications.aap.org/pediatrics/article/157/2/e2025075321/206128/Digital-Ecosystems-Children-and-Adolescents), 2026.
- W3C WAI, [Use Clear and Understandable Content](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/), [Provide Feedback](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p10-status-feedback/), [Let Users Control When Content Moves or Changes](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p01-motion/), and [Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced).
- American Recorder Society, [Instructional Videos](https://americanrecorder.org/ars_instructional_videos.php) and [How to Play Simple Songs](https://americanrecorder.org/docs/How_to_Play_Simple_Songs_on_the_Recorder_Videos_1_to_5.pdf).
- Yamaha, [How to Play the Recorder](https://www.yamaha.com/en/musical_instrument_guide/recorder/play/) and [Baroque soprano fingering chart](https://www.yamaha.com/en/musical_instrument_guide/common/images/recorder/fingering_baroque.pdf).

## 8. Signals, and the questions behind them

This answer follows the Ephoros 1.2.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/ephoros/SKILL.md`.

1. Did the accepted tree still build the closed mission catalogue with no new child-data sink? The implementation step emits `npm run verify:local` and static/built boundary conclusions in CI; no product telemetry is added.
2. Did Pages publish the exact checked static artifact? The delivery step emits the existing build job conclusion, artifact identity, deployment conclusion and URL.
3. Why can the child not continue right now: guide audio, microphone permission, uncertain pitch, or the mission state? The active lesson displays one bounded, non-retained state and one recovery action; the device demo records the observed route without a child identifier or audio.
4. Did a lesson-agent proposal change only reviewed lesson data? The existing workflow emits provider/model configuration class, consumed idea IDs, validation result, bounded changed paths, commit and pull-request URL; no new signal is needed for this runtime-only change.

The static child runtime has no unattended job, route or backend, so there is no justified product log, metric, trace or pager. CI and Pages are the unattended surfaces; visible in-session feedback answers the family-facing question and is deliberately not retained.

## 9. Boundaries, per capability

This answer follows the Phylax 1.5.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/phylax/SKILL.md`.

- Lesson and mission JSON: worth protecting is the integrity and boundedness of child-facing copy, notes, beats and activity kinds. Close it with a versioned closed schema, executable validator, size caps, text rendering only, catalogue cross-checks and hostile fixtures.
- Guide-pattern audio: worth protecting is user control, hearing comfort and separation from microphone capture. Close it with explicit start/stop, bounded gain and duration, one owned audio context, deterministic scheduling, mutual exclusion and teardown.
- Microphone: worth protecting is ambient room audio and honest feedback. Preserve ADR-001’s explicit permission, analyser-only graph, no destination/recorder/network/persistence, immediate track stop and adult fallback.
- Child taps and choices: worth protecting is predictable state and freedom from coercive loops. Accept only enumerated actions and lesson-known notes, cap pattern length, keep state in memory, make actions reversible and stop automatically at the mission boundary.
- Local progress: worth protecting is the absence of identity, score and history. Keep the existing versioned set of known completed lesson IDs; add zero fields and retain the reset path.
- Rendering: worth protecting is interface integrity. Render strings as text, add no raw HTML or runtime URL, preserve semantic controls, visible focus, reduced motion and 44-pixel child targets.
- Lesson agent: worth protecting is code, workflow and publication authority. New mission fields enter the existing strict schema and reviewed pull-request flow; model output gains no path, command, tool, merge or deployment authority.
- Dependency and static-host boundary: worth protecting is the known lockfile and no-service architecture. Add no dependency or host; install the pinned graph and deploy only the verified `dist/` artifact.

## 10. The budget, or its absence

This answer follows the Metron 1.1.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/metron/SKILL.md`.

The measured baseline is one 219.21 kB production JavaScript asset, 69.35 kB gzip, from `npm run build` on the starting tree. The prototype budget is at most 300000 total JavaScript bytes in `dist/assets`; measure it with `npm run build && node -e "const fs=require('fs');const p='dist/assets';const n=fs.readdirSync(p).filter(x=>x.endsWith('.js')).reduce((s,x)=>s+fs.statSync(p+'/'+x).size,0);console.log(n);process.exit(n<=300000?0:1)"`. This is a ceiling, not an optimisation claim. Any attempt to improve load or interaction performance requires a same-command baseline, variance and isolated re-measurement before it is kept. No learning-time or microphone-latency budget is asserted without the intended device.

## 11. The fail-closed posture

This answer follows the Elenchus 1.3.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/elenchus/SKILL.md`.

Malformed mission data, unsupported notes or modes, catalogue drift, guide scheduling that disagrees with the pattern, audio overlap, a missing stop route, a child target below 44 pixels, a new persisted field, a new outbound or recording capability, a red test, a red Node 22 build or a bundle above budget stops the step. Microphone denial, room noise or browser unavailability does not fabricate failure or success; it exposes the no-microphone path. A guide-audio failure stops playback and leaves visual/adult practice usable. No fallback silently skips validation or marks a mission mastered.

For an observed defect, preserve the exact command/output/tree, reproduce twice, localise and reduce before changing code. The fix must add a named test observed red on the unfixed parent and green on the fixed tree, using the existing Fiat runner contract `node scripts/emit-node-test-report.mjs {report}`, format `node-test-json-v1`, report `.elenchus/node-test.json`, then rerun `npm run verify:local` and the named browser demo.

## 12. Decisions and their homes

This answer follows the Hypomnema 4.6.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/hypomnema/SKILL.md`.

The guided mission grammar, its teach-practise-create cycle and the rejection of a bespoke arcade or unguided studio are expensive to reverse and belong in `docs/decisions/ADR-004-guided-mission-loop.md`. ADR-002 remains the source for twelve open schema-bound lessons and should point to ADR-004 rather than be rewritten as though the earlier decision never existed. If the richer mission schema changes what lesson agents may author, ADR-003 receives a superseding record or explicit cross-reference; the agent’s authority itself does not widen.

`README.md` owns the family-facing mission flow, automatic stop, no-microphone route and intended-device acceptance path. `docs/verification.md` owns exact Node, test, bundle and phone-demo evidence. The closed schema and TypeScript interfaces document accepted mission fields next to the boundary. Non-obvious audio ordering receives a reason comment pointing to ADR-004. No alert runbook is warranted because no product telemetry or alert is introduced. Before prose receipt, the study’s chosen design and rejected alternatives must exist in the standing ADR and the existing documentation convention must pass its pointer/shape gate.
