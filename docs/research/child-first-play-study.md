Assuming, unless corrected:

1. The target is `laurenceday/pip-recorder-garden`, not a different repository named `pips-recorder-garden`. This run starts from `main` at `3c215d3aa17bfe31ea6c766b38493b170c5e5ae1`.
2. The learner is five, in Reception or early Key Stage 1, and is still learning to decode print. Her exact taught grapheme-phoneme correspondences and common exception words are unknown.
3. “No words may feature that are not readable at age 5 other than in a parent mode” applies to visible child copy, control names, status text, error recovery and accessible names. Child mode therefore uses one closed, reviewed lexicon and never relies on a reading-age formula. All other prose is conditionally rendered only in grown-up mode, not merely hidden with CSS.
4. No universal word list can prove what one five-year-old can read. The Department for Education defines expected word reading against the correspondences and exception words the child has actually been taught. The repository gate can enforce the closed lexicon; only an observed read-through with the intended child can settle child-specific readability.
5. A grown-up is available to open the site, choose the lesson and sound boundary, set a comfortable volume and help with microphone permission. The child then owns the short play turn and can stop in one action.
6. “More engaging” means more doing, choosing, listening, moving and making within a short turn. It does not mean points, streaks, locks, countdowns, an infinite game shelf or more text.
7. Quiet play is an optional instrument-free route for a time when recorder sound is unsuitable. It is not bedtime encouragement, a replacement for playing the recorder or evidence that silent screen rehearsal transfers to instrumental skill.
8. The existing browser-local microphone, no-account runtime, twelve open lessons, human-reviewed lesson proposal boundary, Baroque fingering, static-host architecture and saved completed-lesson ID set remain constraints.
9. This prototype adds no dependency, backend, analytics, child identifier, recording, outbound child data or persisted interaction field. Any such change is ask-first and outside this design lock.
10. Automated checks establish copy, layout, state, audio and privacy mechanics. They do not establish learning, comfort, physical technique, accessibility with a particular assistive technology or usability for the intended child.

## 1. Problem statement

Rebuild the current mission page as a child-first recorder play turn. The grown-up first sees setup, lesson purpose, advanced copy, privacy and technique guidance. After **Start**, the child sees one large card that fills the available phone or tablet viewport, one musical or motor action, one clear response and one persistent stop. The child does not see the story, difficulty, progress fraction, four-step map, lesson trail, privacy explanation or several practice routes at once.

The existing model-copy-create idea remains useful, but it becomes progressive rather than simultaneous:

1. Pip shows or sounds one short thing.
2. The child does one thing: play, tap, match fingers or choose what she heard.
3. Pip gives descriptive feedback about the action or helper, never a grade about the child.
4. The turn stops. **More** may reveal one optional creative card; no next lesson starts by itself.

The first prototype includes a sound route and a quiet route. Sound play may model a phrase and, only after grown-up setup, optionally use the microphone. Quiet play opens no audio or microphone and uses a finger mirror, a visual pulse or a tap-back card. “Pip picks” presents one suitable card rather than making the child choose from an arcade. Existing fingering, rhythm and bounded pattern-making logic is reused where it serves this sequence. Pattern making becomes an optional extension after the core turn instead of a phase every child must pass through.

A working prototype is proved locally by `npm run verify:local && npm run dev`, then by the recorded child-flow browser path at 320 by 568, 391 by 844 and 768 by 1024 CSS pixels:

- grown-up mode selects lesson 8 and sound or quiet play;
- **Start** enters child mode with at most three approved visible words before the first action;
- one action begins the model or visual prompt;
- each later state presents one task and one-action stop without document scrolling or horizontal overflow;
- sound play can model B-A-A-B and choose one copy card without exposing the old route shelf;
- quiet play completes a finger or tap turn without constructing `AudioContext` or calling `getUserMedia`;
- optional **More** reaches a bounded creative card and **Done** stops without automatic progression;
- the lock/help affordance returns to grown-up mode without leaving parent prose in the child DOM.

Success means:

- every child-rendered word and accessible name is emitted into a manifest and admitted by the closed child lexicon, while all other product prose renders only in grown-up mode, proved by `node scripts/check-child-copy.mjs --candidate one-screen-play-loop --criterion rendered-child-copy-approved --report .hexaemeron/reports/conformance/one-screen-play-loop--rendered-child-copy-approved.json`;
- every child state at the three named viewports has `scrollHeight <= innerHeight`, no horizontal overflow, no child instruction or action text below 20 CSS pixels and no child action target below 64 by 64 CSS pixels, proved by `node scripts/check-child-layout.mjs --candidate one-screen-play-loop --criterion small-phone-no-scroll --report .hexaemeron/reports/conformance/one-screen-play-loop--small-phone-no-scroll.json`;
- the child starts the first modeled or visual musical response in one action and every child state has a stop/back route in at most one action, proved by the two `node scripts/check-child-flow.mjs` resolvers held in `.hexaemeron/design-evidence.json`;
- quiet play completes with no microphone request, audio context, oscillator or audible output, proved by `node scripts/check-child-quiet.mjs --candidate one-screen-play-loop --criterion quiet-mode-opens-no-audio --report .hexaemeron/reports/conformance/one-screen-play-loop--quiet-mode-opens-no-audio.json`;
- the model-response-stop state machine keeps user-started audio, mutual exclusion, neutral participation feedback, optional creation and no automatic next lesson, proved by `node --experimental-strip-types --test tests/mission-loop.test.mjs tests/child-flow.test.mjs`;
- all twelve lessons remain open and the existing catalogue, Baroque fingering, pitch, permission teardown, agent, workflow and saved-progress guards remain green under `npm run verify:local`;
- the child runtime still has no recorder, network, account, analytics, IndexedDB, service worker or added local-storage field, proved by `npm run check:boundaries && npm run build`;
- production JavaScript remains at or below 300000 bytes, proved by the design record’s `check-bundle-budget.mjs` integration resolver;
- the public Pages URL boots the accepted built asset rather than repository source, proved by the design record’s `check-live-pages.mjs` integration resolver;
- the intended child and grown-up can complete one sound turn and one quiet turn on the intended phone and tablet without help from copy she cannot read. This remains a named manual acceptance path and no learning or readability claim is made before it runs.

The topic decomposes into dependent modules rather than unrelated features:

| Module id | Responsibility | Depends on |
| --- | --- | --- |
| `copy-boundary` | Separate grown-up and child render trees; create the reviewed child lexicon and exhaustive copy manifest | none |
| `one-screen-stage` | Replace the document mission with a no-scroll, one-task child stage and large controls | `copy-boundary` |
| `play-cards` | Reframe model, finger, tap and optional maker interactions; add quiet play and one-card “Pip picks” sequencing | `one-screen-stage` |
| `acceptance` | Prove all child states, legacy boundaries, built Pages artifact and named family checks | `copy-boundary`, `one-screen-stage`, `play-cards` |

Build order is `copy-boundary`, `one-screen-stage`, `play-cards`, then `acceptance`. A module may not bypass a gate established by an earlier module.

## 2. Prior art

### The child’s current path

The current implementation is technically careful and pedagogically over-presented. `src/App.tsx` renders lesson number, saved state, chapter, difficulty, title, story, a written child cue, four named phases and a note strip before the model card. Copy then presents a fingering diagram, three route cards, grown-up co-play and a return link. Make presents four note slots and up to four actions. Completion presents three actions. The lesson picker, grown-up corner, navigation and footer remain in the same document throughout.

The exact starting tree was inspected in the in-app browser and retained at `.hexaemeron/reports/current-phone-baseline.json`. At an effective 391 by 844 CSS pixels, the initial document measured 2323 pixels high. The first full action card was below the fold; story, cue, four-step map and note tile came first. The rendered body contained 164 word tokens and 102 unique words while adult footer and trail content remained mounted. After **Copy without sound**, the document measured 2892 pixels and scripted navigation moved to about y=643; recorder, fingering, rhythm, co-play and return choices were all present. The fingering activity itself fit one viewport, but the document remained 2656 pixels high. At an effective 768 by 1024 tablet viewport, the default document remained 1639 pixels high with 194 body-word tokens. This is operator-observed evidence from ephemeral browser evaluations, not a standalone shell replay or a child/device test.

The user’s saved family observation is stronger than a synthetic viewport: “Looks good thanks. Tried on a phone screen, too small and have to scroll. First impression too complicated and too much text for 5 yo. Will try it tomorrow on the tablet. Can't do recorder once they're in bed...” It came from `/Users/c0rtexzer0/.codex/memories/extensions/ad_hoc/notes/2026-08-31T19-01-11+0100-pip-recorder-garden-future-fiat-feedback.md`; its future-only boundary applied to the earlier run and the user explicitly brought it into this new Fiat run. The deferred tablet try is unknown, not a tablet pass. The bedtime sentence motivates an optional quiet route but does not establish that the child should use a screen in bed.

What should survive:

- all lessons are open and completion is participation-only;
- the child may stop, replay or return without automatic progression;
- model audio is user-started, visible, synchronized and stoppable;
- microphone permission is explicit and optional;
- fingering and rhythm provide microphone-free participation;
- pattern making is bounded, local and skippable;
- no tune, tap, route, attempt, score, time or child identity is retained.

What should change from the child’s point of view:

- the app currently asks a beginning reader to understand the plan before making music;
- the first actionable card is not visible on the tested phone viewport;
- text between roughly 10 and 14 CSS pixels appears in child-adjacent labels, below the new 20-pixel floor;
- four phases, three copy routes, co-play, maker and navigation turn adult flexibility into child decision load;
- the mandatory transition into **Make**, even with an escape, interrupts a child whose immediate goal was to copy one sound;
- rhythm feedback is separated from the model the child must remember; a call-and-response card should place model and tap response together;
- the fingering puzzle can prove a screen pattern, not seal, hand shape or physical transfer; grown-up mode must keep that distinction visible;
- `0/12`, difficulty dots and “level” read like a course score even though lessons are intentionally open;
- lessons 1 to 11 work mainly with B, A and G, then lesson 12 exposes the full C-to-C octave. It is an assisted explorer, not evidence that low C, D, E, F and high C have been scaffolded. This run does not silently claim otherwise.

### Last two merged pull requests touching the target

1. [PR #7, Deepen Pip’s recorder lessons with guided musical missions](https://github.com/laurenceday/pip-recorder-garden/pull/7), merged to `main` as `3c215d3aa17bfe31ea6c766b38493b170c5e5ae1`, carried four explicit items. Intended-device acceptance remains open. Non-fixture provider responses remain open and out of this runtime-only scope. `campbell226/pip-recorder-garden` remains a recorded 404 and its relationship is unknown. Hosted Pages verification was open at merge and is now a concrete defect: on 2026-08-31 the public URL returned HTTP 200 but served `<script type="module" src="/src/main.tsx">` instead of a built `assets/index-*.js` entry. GitHub runs 33431397749, 33431397837 and 33431397312 all reported success for the accepted SHA, so successful workflow conclusions alone do not close publication.
2. [PR #6, Turn every recorder lesson into a guided musical mission](https://github.com/laurenceday/pip-recorder-garden/pull/6), merged to the prior run branch as `1e9eb7bc9f411cd2691cdf49c6944beac2ac7274`, recorded 67 of 67 tests, the four-round audit and the microphone-free 390 by 844 flow. It explicitly did not establish five-year-old learning or usability, intended recorder/microphone/device/room behaviour, screen-reader behaviour, live provider responses or hosted publication. This study accepts those limits rather than treating the previous green browser script as child acceptance.

Both pull requests were read through GitHub, including bodies, files, commits and comments. Neither had review comments. Their child-observation and device carryovers are answered here as manual boundaries; the provider and Campbell items remain named non-goals; the Pages item becomes an integration gate.

### Authoritative audit inventory and read mode

Two in-scope audit sources and their two committed synopses were discovered. From the target root, `python3 /Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/fiat/scripts/audit_synopsis.py --check .` exited zero for the whole set. The verified synopses, not the authoritative sources, were read.

- `audit/rounds/fiat-deeper-interactive-recorder-learning-for-a-five.md` has source SHA-256 `26da98fb998d684afb40a640744d6a66336fc976cf8e7563744ff2227eb66152a`. Its verified synopsis is `audit/rounds/fiat-deeper-interactive-recorder-learning-for-a-five.synopsis.md`, SHA-256 `f6a374b252c4c3d2af17638eb8f47c92345a3ecc7e0367366e4890733745ceb9`.
- `audit/rounds/fiat-local-baroque-recorder-curriculum-with-microphon.md` has source SHA-256 `c7a9f1c3f94ec0b949d88dff6e6272a29b0282e9438363a70493938df17fdd68`. Its verified synopsis is `audit/rounds/fiat-local-baroque-recorder-curriculum-with-microphon.synopsis.md`, SHA-256 `7c43f38883ebaa47ca097aef127d29268bb773be23485e706b59d849d28aa10e`.

The newer mission audit retains `Covered`: pattern-model-drift, audio-overlap, child-frustration, attention-capture, false-learning-signal, touch-miss, mobile-displacement, schema-drift, creative-escape, privacy-expansion, device-variance and bundle-growth, all `reviewed` in every round. `Not checked` in every round: real microphone permission prompts, recorder hardware and room acoustics; guide comfort and timing on the intended device; hosted Actions, Pages and cache; five-year-old observation and pedagogical outcomes; screen-reader and assistive-technology behaviour; and future non-fixture providers. Round 1’s Elenchus verdict was `guarded`: S1-R1-01 fingering/display drift, S1-R1-02 premature microphone permission, S1-R1-03 trapped no-microphone routes, S1-R1-04 maker with no escape and S1-R1-05 false performance completion were `fixed and guarded in this commit`; S1-R1-06 detached-parent runner failure was `fixed in this commit; exact runner changed from inconclusive to guarded`. Round 2’s verdict was `guarded`: S1-R2-01 sound/highlight offset, S1-R2-02 delayed audio-resume state and S1-R2-03 reduced-motion navigation were `fixed and guarded in this commit`; S1-R2-04 mandatory-maker ADR text was `fixed and guarded in this commit`. Round 3’s verdict was `guarded`: S1-R3-01 false moving-note recovery and S1-R3-02 README conflict were `fixed and guarded in this commit`. Round 4’s verdict was `null` and recorded no finding. Its leads not pursued preserve every manual boundary above and report no new dependency, workflow authority, schema, persisted field, recorder or outbound child-data path.

The original recorder-garden audit retains `Covered`: false-pitch-match, child-frustration, audio-privacy, permission-denial, feedback-loop, fingering-drift, progress-pressure, pages-subpath, model-output, idea-injection, workflow-authority, schedule-drift and dependency-advisories, all `reviewed` in every round. `Not checked` in every round: real microphone hardware and room acoustics; hosted Actions and Pages; live publication/cache; future non-fixture providers. Round 1’s Elenchus verdict was `guarded`: S1-R1-01 cancelled microphone resume was `fixed and guarded in this commit`; S1-R1-02 arbitrary secret-bearing provider URL, S1-R1-03 invisible Unicode, S1-R1-04 malformed/nonconsecutive lesson entries and S1-R1-05 built-runtime fetch were each `fixed and guarded in this commit`. Round 2’s verdict was `guarded`: S1-R2-01 exact-twelve extension rejection was `fixed in this commit; isolated parent-red fixture reproduced`; S1-R2-02 missing proposal command was `fixed and guarded in this commit`. Round 3’s verdict was `null` and recorded no finding. Its leads not pursued preserve hardware, hosted/cache and future-provider boundaries and report no recording or outbound microphone path.

No root `audit/AUDIT.md`, other direct-child round source or plugin audit source was discovered. Neither synopsis contains `[missing legacy field: ...]`.

### External pedagogical evidence

Department for Education `Development Matters` says the child’s experience should remain central, combines independent play with just-enough adult scaffolding and, for Reception music, recommends short call-and-response, gradual introduction and repetition, pitch matching, steady beat, tapping, movement and child-created music. That supports a model-response-play turn and adult setup, not a document-sized lesson plan.

The Department for Education Word Reading early-learning-goal guidance says expected readers decode words consistent with their current phonic knowledge and read only some common exception words. The Reading Framework likewise says beginner text should match taught correspondences rather than require guessing unfamiliar words. There is therefore no honest universal “age five” list. The conservative product response is a closed child lexicon, minimal print, pictures and modelling, with harder language in grown-up mode and a child-specific read-through still required.

W3C cognitive-accessibility guidance supports common words, short sentences, short blocks, clear images and separated instructions. NAEYC’s developmentally appropriate practice identifies choice, wonder and delight as core properties of play while pairing agency with planned adult support. The Education Endowment Foundation describes promising early-years self-regulation practice as explicit modelling plus supported practice, but rates the evidence base low; no efficacy claim follows. The American Academy of Pediatrics’ 2026 policy supports child-centred, caregiver-shared media and explicit stopping while warning against autoplay, endless scroll and frequent reward loops. These sources inform the design; none proves this app improves this child’s recorder learning.

## 3. Constraints and non-goals

Starting ref: `main` at `3c215d3aa17bfe31ea6c766b38493b170c5e5ae1`. Toolchain: Node 22.19.0 in CI, npm lockfile, React 19.2.8, TypeScript 5.9.3, Vite 8.2.2 and plain CSS. The starting tree’s supported-runtime proof is green: 67 of 67 tests, TypeScript, oxlint, source and built boundaries, build and dependency audit; production JavaScript is 232827 bytes.

The user’s age-five wording is a hard copy boundary. An unknown token, a hard lesson word in child mode or parent prose mounted in the child tree is a failure. Flesch scores, syllable counts and an AI readability judgement do not admit a word. The initial lexicon is deliberately tiny; additions need one explicit human review and a checked manifest diff. Musical vocabulary may be spoken or explained by a grown-up but does not appear as unreviewed child print.

Non-goals: proving a learning gain; testing or grading reading; replacing a recorder teacher; diagnosing pitch, posture, grip, breath, articulation or hearing; recording or replaying the child; profiles, names, scores, streaks, time-on-task, attempt history, leaderboards, locks, timers, ads, notifications or analytics; a large game catalogue; a chatbot; an automatic recommendation engine; a full curriculum rewrite; staff notation; a new backend; a new lesson provider; or claiming that lesson 12 scaffolds every natural note.

High-value additions in this prototype are bounded to one-screen presentation, one-card sequencing, quiet finger/tap play, an immediate model beside every response, optional creation and one grown-up observation prompt. Familiar public-domain three-note tunes, licensed human recorder samples, movement cards and a same-or-different listening game are promising later additions only after the intended child shows that the shell is calm and readable. Adding them now would make feature count outrun the feedback.

Always: run the complete relevant tests before a commit; run Imprimatur on shipped prose; measure before keeping a performance-motivated change; render child and parent copy from declared roles; keep user-started sound and visible stop; keep microphone optional; validate every lesson/action; preserve local ephemeral child actions; respect reduced motion; verify the three named viewports; install from the lockfile; verify the built Pages artifact.

Ask first: add a dependency or media licence; add or change a persisted field; transmit or retain child action/audio data; add analytics; widen agent write authority; change a public schema incompatibly; touch CI or Pages authority beyond the recorded deployment repair; change microphone trust; replace the live deployment; or add a source of narrated speech.

Never: record a child; hide capture or playback state; autoplay; punish uncertainty; make content conditional on measured performance; use an unreadable child-mode word; hide parent prose with CSS while leaving it exposed to the child accessibility tree; create an infinite feed or forced next step; commit a credential; execute model output; weaken a check; delete a failing test; or claim an unrun command, deployment, learning result or child acceptance.

## 4. Design options

### `one-screen-play-loop` (selected)

A grown-up setup screen owns lesson selection, all advanced prose, reading detail, privacy, sound/microphone choice and one technique observation. **Start** mounts a separate child tree. The child tree contains one full-viewport card, picture/animation, a closed tiny lexicon, one primary action and an always-available stop/help affordance. Pip models, the child responds, then the app stops or reveals one optional **More** card. Quiet mode selects finger/tap cards and statically refuses audio/microphone construction. “Pip picks” preserves varied practice without presenting a shelf of decisions.

Pedagogical trade: progressive disclosure reduces print and decision load while preserving model, imitation, embodied practice, agency and creation. It makes grown-up setup more important and requires a real render-role boundary, exhaustive state tests and careful viewport work. This is the worthwhile complexity.

### `trimmed-mission-page`

Keep the existing story/map/pattern/card document, shorten sentences, enlarge controls and hide secondary prose at phone widths. It is the smallest code change and keeps all current flexibility visible.

Trade: trimming does not change the interaction grammar. The child still receives the lesson plan, route choice and document scroll together; parent and child copy remain interleaved. The candidate therefore fails both selection gates tied directly to the user’s report.

### `game-arcade`

Open on large tiles for pitch, rhythm, fingers, listening and tune games. Each tile can fit a viewport, keep copy short and provide novelty.

Trade: the child chooses a game before making music, the app gains several state machines and the shelf invites continued screen engagement. Its wireframe passes the hard gates but takes two actions to reach a musical response and exposes 13 initial child words versus three. `one-screen-play-loop` dominates it on both checked metrics while preserving the same recovery and persistence bounds.

### Mechanical selection

The closed record is `.hexaemeron/design-evidence.json`, schema `protasis-design-evidence/v1`, SHA-256 `14dccd4d03d38fd0f847b74d9e5b0cb92120d6d230d26d7a65a9b9cb880ae38c`. Its design-lock check consumed 18 digest-bound selection reports and exited zero with no finding.

The wireframe matrix is intentionally narrow: it compares initial child copy and actions, not unbuilt implementation quality.

| Candidate | Child/parent copy separated | Taps to first response | Initial visible child words | Phone mission one viewport | Exit actions | Persisted fields added |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `one-screen-play-loop` | true | 1 | 3 | true | 1 | 0 |
| `trimmed-mission-page` | false | 1 | 22 | false | 1 | 0 |
| `game-arcade` | true | 2 | 13 | true | 1 | 0 |

`trimmed-mission-page` is ineligible. Of the two survivors, `one-screen-play-loop` is no worse on any selection metric and better on both, so the mechanically computed frontier is unique. Six implementation truths remain scheduled integration refusals: exhaustive rendered copy, actual no-scroll layouts, one-action first response, JavaScript ceiling, quiet-mode audio refusal, one-action exit, plus the public built-artifact boot check. The record does not predict them.

## 5. Risk register seed

```risk-register
child-copy-leak | every visible and accessible string in the child render tree including dynamic errors and lesson data | the exhaustive render-state manifest contains only tokens admitted by the reviewed child lexicon
phonics-overclaim | the label age-five-readable applied without knowing this child’s taught correspondences | repository checks claim lexicon conformance only and family acceptance records every word the intended child could or could not read
parent-mode-leak | grown-up prose retained in hidden child DOM | child and grown-up modes conditionally mount separate trees and accessibility snapshots find no opposite-role copy
child-overload | task map route shelf maker and navigation shown together | every child state has one learning action one response and at most one extra stop or help action
mobile-scroll | dynamic phone viewport browser chrome or stacked cards push the task away | every child state is replayed at 320x568 391x844 and 768x1024 with no document overflow
text-scale-crop | fixed viewport layout clips essential action or feedback | browser checks cover supported text sizing orientation and safe-area insets with a reachable stop
quiet-audio-leak | quiet play accidentally constructs sound or asks for microphone permission | quiet-mode guards fail on AudioContext oscillator mediaDevices or audible-output use
pattern-model-drift | model note beat and visual schedule diverge from validated lesson data | one schedule still owns every onset duration highlight release and completion
audio-overlap | guide microphone and maker own sound at once | starting one closes the other and every mode lesson hide completion and teardown path releases ownership
screen-fingering-transfer | a correct hole puzzle is treated as physical recorder technique | child feedback names a picture match only and grown-up mode owns seal hand and recorder checks
false-learning-signal | pitch rhythm or completion is described as mastery | feedback describes the tool action or participation and never grades musical worth
attention-capture | flowers More replay or game variety prolong use | no autoplay streak variable reward feed forced next lesson or hidden exit and every turn ends at Done
progress-pressure | lesson count difficulty and saved flowers feel like a score | numerical progress and difficulty live in grown-up mode and child completion remains unranked
privacy-expansion | new play choices become retained or transmitted child history | only the existing validated completed-lesson IDs persist and built runtime still refuses outbound channels and recording
agent-copy-bypass | lesson proposals inject advanced child copy outside the lexicon | generated catalogue and proposal diff pass the same role and lexicon validator before review
deployment-overwrite | a green Pages workflow serves repository source instead of built output | integration fetches the public entry and its hashed asset and binds both to the accepted main tree
bundle-growth | new state and art make the static app heavy | production JavaScript remains at or below 300000 bytes and any future media receives a separate measured budget
```

## 6. Glossary seeds

Child mode: the separately mounted one-card learner interface whose complete copy surface is lexicon-gated.

Grown-up mode: setup, teaching purpose, privacy, technique, lesson navigation and all prose not admitted to child mode.

Child lexicon: the closed reviewed set of tokens allowed in child mode; it is a repository control, not proof of one child’s reading.

Copy manifest: the deterministic inventory of visible and accessible text from every child render state.

Play card: one full-viewport model, response, feedback or optional creation state.

Pip picks: deterministic selection of one suitable play card so variety does not become a game shelf.

Quiet play: an explicit no-audio, no-microphone finger, visual or tap route that makes no instrumental-transfer claim.

Sound play: user-started guide audio and an optional grown-up-enabled microphone route.

Participation completion: a flower for taking a turn, not a score, test result or mastery claim.

Natural stop: a visible end after one short turn, with no automatic next lesson or engagement prompt.

Parent entry: the icon/help route that leaves child mode and mounts grown-up mode; advanced copy appears only after the transition.

## 7. Sources

Repository and run evidence:

- `src/App.tsx`, `src/styles.css`, `src/components/FingeringDiagram.tsx`, `src/components/FingeringMission.tsx`, `src/components/LessonTrail.tsx`, `src/components/PatternMaker.tsx`, `src/components/PatternStrip.tsx`, `src/components/RhythmEcho.tsx`.
- `src/hooks/useGuideTone.ts`, `src/hooks/useMicrophoneScoring.ts`, `src/hooks/useProgress.ts`, `src/lib/lesson-state.ts`, `src/lib/mission-loop.ts`, `src/lib/recorder.ts`.
- `content/lessons/*.json`, `src/generated/lessons.json`, `schema/lesson.schema.json`, `scripts/build-catalog.mjs`, `scripts/check-static-boundaries.mjs`, `scripts/check-built-boundaries.mjs`, `tests/*.test.mjs`, `package.json`, `package-lock.json`.
- `docs/research/study.md`, `docs/research/runbook.md`, `docs/research/guided-mission-study.md`, `docs/research/guided-mission-runbook.md`, `docs/verification.md`, `README.md`.
- `docs/decisions/ADR-001-browser-local-microphone-scoring.md` through `ADR-004-guided-mission-loop.md`.
- The two verified audit synopses and exact source/view digests recorded in item 2.
- `.hexaemeron/reports/current-phone-baseline.json`, the 18 selection reports under `.hexaemeron/reports/selection/` and `.hexaemeron/design-evidence.json`.
- [PR #7](https://github.com/laurenceday/pip-recorder-garden/pull/7), [PR #6](https://github.com/laurenceday/pip-recorder-garden/pull/6), [main Actions runs](https://github.com/laurenceday/pip-recorder-garden/actions) and the [public Pages URL](https://laurenceday.github.io/pip-recorder-garden/), inspected 2026-08-31.
- `/Users/c0rtexzer0/.codex/memories/extensions/ad_hoc/notes/2026-08-31T19-01-11+0100-pip-recorder-garden-future-fiat-feedback.md`, used only after the user activated this next run.

External evidence:

- Department for Education, [Development Matters](https://www.gov.uk/government/publications/development-matters--2/development-matters), non-statutory early-years guidance.
- Department for Education, [ELG: Word Reading](https://help-for-early-years-providers.education.gov.uk/support-for-practitioners/eyfs-profile-assessment-support/word-reading-early-learning-goal), published 2026-03-11 and updated 2026-07-23.
- Department for Education, [The Reading Framework](https://www.gov.uk/government/publications/the-reading-framework-teaching-the-foundations-of-literacy).
- Department for Education, [National curriculum in England: music programmes of study](https://www.gov.uk/government/publications/national-curriculum-in-england-music-programmes-of-study).
- W3C WAI, [Use Clear and Understandable Content](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/), [Separate Each Instruction](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p03-instructions/) and [Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced).
- NAEYC, [Principles of Child Development and Learning](https://www.naeyc.org/resources/position-statements/dap/principles) and [Developmentally Appropriate Practice](https://www.naeyc.org/resources/position-statements/dap).
- Education Endowment Foundation, [Self-regulation strategies](https://educationendowmentfoundation.org.uk/early-years/toolkit/self-regulation-strategies/), including its low-evidence-strength caveat.
- American Academy of Pediatrics, [Digital Ecosystems, Children, and Adolescents: Policy Statement](https://publications.aap.org/pediatrics/article/157/2/e2025075320/206129/Digital-Ecosystems-Children-and-Adolescents-Policy), 2026.

## 8. Signals, and the questions behind them

This answer cites the Ephoros 1.2.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/ephoros/SKILL.md`.

1. Did a change introduce an unapproved child word or mount grown-up prose in child mode? The copy-boundary step emits the copy-manifest count, rejected tokens, role result, commit and exact checker version in CI.
2. Which child state or viewport cannot fit, cannot stop or exposes more than one learning task? The child-stage step emits state id, viewport, scroll dimensions, smallest text, smallest target and exit-action count in a bounded browser report.
3. Did quiet play remain actually quiet and did sound ownership close? The play-card step emits mode, requested capability classes, teardown result and test conclusion without retaining child actions or audio.
4. Did Pages serve the accepted built app or merely report a green workflow? Integration emits accepted SHA, build asset digest, deployment id, public entry digest, fetched asset digest and boot result.

The product remains a static child runtime with no justified logging, metric, trace, identifier or pager. CI, audit and Pages are the unattended surfaces. In-session feedback is visible, bounded and not retained.

## 9. Boundaries, per capability

This answer cites the Phylax 1.5.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/phylax/SKILL.md`.

- Child copy: worth protecting is the user’s reading boundary and the child accessibility tree. Close it with declared copy roles, a closed lexicon, exhaustive render-state manifest, unknown-token refusal and no raw HTML.
- Grown-up mode: worth protecting is a real separation rather than visual hiding. Close it with conditional mounting, a simple return, component and accessibility-tree checks and no persisted mode history.
- Child stage: worth protecting is the reachable action and stop across device geometry. Close it with bounded state, dynamic viewport units, safe-area handling, target/text floors, no document scroll and named browser replay.
- Lesson data: worth protecting is copy, pattern and fingering integrity. Preserve the strict schema, generated catalogue, text rendering, bounds, hostile fixtures and human-reviewed proposal path. Dynamic child copy must pass the same lexicon gate.
- Guide audio and maker audio: worth protecting is user control and comfortable separation from listening. Preserve explicit start/stop, one owned context, bounded gain/duration, deterministic scheduling, mutual exclusion and teardown.
- Microphone: worth protecting is ambient room audio and honest uncertainty. Preserve explicit grown-up enablement, analyser-only graph, no recorder/destination/network/persistence and immediate track/context stop.
- Quiet play: worth protecting is the promise of silence and no permission prompt. The mode refuses every sound or microphone construction in code and tests rather than muting after construction.
- Child taps and choices: worth protecting is agency without coercive retention. Accept enumerated bounded actions, keep them in memory, expose undo/stop and persist no route, timing, attempt or choice.
- Local progress: worth protecting is absence of identity, score and history. Retain only `pip-recorder-garden.completed.v1` with validated lesson IDs and the reset path.
- Lesson agent: worth protecting is code and publication authority. It may propose bounded lesson data through review; it gains no child copy bypass, command, arbitrary file, merge or deploy capability.
- Dependency and deployment: worth protecting is the known lockfile and exact static artifact. Add no dependency; build with the pinned graph; deploy only verified `dist/`; verify the public hashed asset rather than trusting a green run.

## 10. The budget, or its absence

This answer cites the Metron 1.1.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/metron/SKILL.md`.

The supported baseline is 232827 production JavaScript bytes from the Node 22.19.0 proof. The ceiling remains 300000 bytes, measured after `npm run build` by the design record’s `check-bundle-budget.mjs` resolver. This is a guardrail, not an optimisation claim. A future narrated-audio or recorder-sample addition needs a separate media-byte and load measurement before selection.

The interaction budget is one action to the first model/visual response, at most three approved visible words before that action, one learning task per child state and a one-action exit. The layout budget is zero document overflow for every child state at 320 by 568, 391 by 844 and 768 by 1024 CSS pixels. These are exact conformance checks, not claims about attention span or learning speed.

No audio-latency, microphone-accuracy, child-reading-time or session-duration budget is asserted without the intended device and child. Performance-motivated work beyond the declared ceilings needs its own same-method baseline and re-measurement.

## 11. The fail-closed posture

This answer cites the Elenchus 1.3.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/elenchus/SKILL.md`.

An unknown child token, missing render state, grown-up string in the child tree, scroll or horizontal overflow, clipped stop, child text below 20 pixels, child target below 64 pixels, quiet-mode audio/microphone access, overlapping sound ownership, automatic next lesson, retained new field, outbound runtime capability, false mastery cue, stale generated catalogue, red test, bundle over 300000 bytes or public source-entry deployment stops the run. A machine readability score cannot waive the lexicon. A green workflow cannot waive a public artifact mismatch.

Microphone denial, room noise, sound unavailability or child refusal does not fabricate failure or success. It leaves a quiet or grown-up recovery route. The child-specific read-through, tablet comfort, physical fingering, guide volume, microphone teardown and learning outcome remain unknown until observed; the repository may be mechanically conformant without claiming those facts.

For any observed defect, preserve the exact command/output/tree, reproduce, localise and reduce before changing code. A fix adds a named test observed red on the unfixed parent and green on the fixed tree using the run’s declared Elenchus report contract, then reruns `npm run verify:local`, the complete child-state browser report and the public Pages check when deployment is involved.

## 12. Decisions and their homes

This answer cites the Hypomnema 4.6.0 contract at `/Users/c0rtexzer0/.codex/plugins/cache/wildcat-labs/hexaemeron/1.6.20/skills/hypomnema/SKILL.md`.

The separate child/grown-up render boundary, closed child lexicon, one-screen progressive loop and rejection of both a trimmed long page and game arcade are expensive to reverse. They belong in a new `docs/decisions/ADR-005-use-a-child-first-one-screen-play-loop.md`. ADR-004 remains historical but its mandatory four-part child presentation is superseded where ADR-005 makes creation optional and moves planning/prose to grown-up mode; mark that relationship rather than rewriting history.

The shipped study belongs at `docs/research/child-first-play-study.md` and the derived runbook at `docs/research/child-first-play-runbook.md`, with pointers from `docs/research/README.md`. `README.md` owns the family-facing setup, sound/quiet choice, manual word/device checklist and honest learning boundary. `docs/verification.md` owns exact Node, copy, viewport, quiet, bundle, audit, deployment and manual evidence. The copy-role interface and lexicon schema document accepted fields beside their validator; non-obvious mode and audio ordering receives a reason comment pointing to ADR-005.

No alert runbook or product telemetry record is warranted. The current public Pages overwrite is a deployment defect and verification obligation, not a reason to create a second documentation system. Any later decision to add human narration, recorder samples, a known tune, a new persisted recommendation or a broader curriculum earns its own source/licence/privacy and pedagogical decision before code.
