## Step 1, round 1 -- 2026-08-31T18:00:42Z

Audit schema: fiat-audit-round/v2

Covered: pattern-model-drift=reviewed; audio-overlap=reviewed; child-frustration=reviewed; attention-capture=reviewed; false-learning-signal=reviewed; touch-miss=reviewed; mobile-displacement=reviewed; schema-drift=reviewed; creative-escape=reviewed; privacy-expansion=reviewed; device-variance=reviewed; bundle-growth=reviewed

Not checked: real microphone permission prompts, recorder hardware and acoustic room behaviour; audible guide comfort and timing on the intended child device; hosted GitHub Actions, Pages publication and cache behaviour; five-year-old learner observation and pedagogical outcomes; screen-reader and assistive-technology behaviour across supported browsers; future non-fixture lesson-provider behaviour

Elenchus verdict: guarded

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |
| S1-R1-01 | medium | `src/App.tsx` | Fingering used `fingeringIndex`, while the visible pattern stayed on the microphone sequence or explorer target; lesson 12 also left note stones selectable during fingering and rhythm, so the highlighted note could disagree with the clue and puzzle. | fixed and guarded in this commit |
| S1-R1-02 | medium | `src/App.tsx` | Choosing **Play to Pip** called `startListening()` immediately, requesting microphone permission before the separate **Let Pip listen** action promised by the family checklist. | fixed and guarded in this commit |
| S1-R1-03 | medium | `src/components/FingeringMission.tsx`, `src/components/RhythmEcho.tsx` | Fingering and rhythm replaced the route chooser without a return control, and rhythm advised **Listen again** without providing that action. | fixed and guarded in this commit |
| S1-R1-04 | medium | `src/components/PatternMaker.tsx` | The maker disabled every mission-action exit until two notes were chosen, so a child could not stop the phase without abandoning it through global navigation. | fixed and guarded in this commit |
| S1-R1-05 | medium | `src/App.tsx` | All completion routes rendered `lesson.successCue`; after a no-play route, lesson 10 still claimed **You played the whole raindrop walk!**, turning participation into a false performance claim. | fixed and guarded in this commit |
| S1-R1-06 | medium | `tests/mission-loop.test.mjs` | The exact Elenchus runner imported ignored `src/generated/lessons.json`; that file is absent in a detached parent, so the first guard check reported an infrastructure error instead of the expected assertions. | fixed in this commit; exact runner changed from inconclusive to guarded |

Leads not pursued: real-device audio and permission teardown, child observation, hosted publication and cache behaviour, assistive-technology behaviour and non-fixture provider responses remain external evidence boundaries; no new dependency, workflow authority, schema field, persisted field, recorder or outbound child-data path was found; `successCue` remains validated for compatibility but is no longer rendered as route-agnostic completion, because removing it would be an incompatible schema change outside this step.

## Step 1, round 2 -- 2026-08-31T18:38:29Z

Audit schema: fiat-audit-round/v2

Covered: pattern-model-drift=reviewed; audio-overlap=reviewed; child-frustration=reviewed; attention-capture=reviewed; false-learning-signal=reviewed; touch-miss=reviewed; mobile-displacement=reviewed; schema-drift=reviewed; creative-escape=reviewed; privacy-expansion=reviewed; device-variance=reviewed; bundle-growth=reviewed

Not checked: real microphone permission prompts, recorder hardware and acoustic room behaviour; audible guide comfort and timing on the intended child device; hosted GitHub Actions, Pages publication and cache behaviour; five-year-old learner observation and pedagogical outcomes; screen-reader and assistive-technology behaviour across supported browsers; future non-fixture lesson-provider behaviour

Elenchus verdict: guarded

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |
| S1-R2-01 | medium | `src/hooks/useGuideTone.ts`, `src/lib/mission-loop.ts` | Audible onsets used a 40 millisecond Web Audio lookahead, but visual timers omitted it, so every highlighted note led its sound instead of sharing one schedule. | fixed and guarded in this commit |
| S1-R2-02 | medium | `src/hooks/useGuideTone.ts`, `src/App.tsx`, `src/components/PatternStrip.tsx` | Guide playback stayed visibly idle until `AudioContext.resume()` returned. During a delayed resume, copy or maker controls could change before the selected pattern began; locking immediately would also have highlighted the first note before sound without a nullable pending state. | fixed and guarded in this commit |
| S1-R2-03 | medium | `src/App.tsx`, `src/lib/mission-loop.ts` | Lesson, retry and garden navigation always requested smooth scrolling instead of respecting `prefers-reduced-motion`. | fixed and guarded in this commit |
| S1-R2-04 | low | `docs/decisions/ADR-004-guided-mission-loop.md` | The standing decision described a two-to-four-note tune as mandatory even though **Finish without a tune** is an approved participation route. | fixed and guarded in this commit |

Leads not pursued: all six round 1 fixes were rechecked in source, focused guards and a 390 by 844 browser flow; **Play to Pip** did not request permission, microphone-free routes returned to the chooser, lesson 12 fingering stayed aligned, the optional maker exit reached neutral completion, and no application console warning or error appeared. The parent-red focused run failed four assertions for these four findings; the fixed Node 22.19.0 tree passed 65 of 65 tests. No new dependency, workflow authority, lesson or schema change, persisted field, recorder or outbound child-data path was found. Production JavaScript measured 232798 bytes against the 300000-byte ceiling. Real-device audio and permission teardown, child observation, hosted publication and cache behaviour, assistive-technology behaviour and non-fixture provider responses remain external evidence boundaries.

## Step 1, round 3 -- 2026-08-31T18:58:11Z

Audit schema: fiat-audit-round/v2

Covered: pattern-model-drift=reviewed; audio-overlap=reviewed; child-frustration=reviewed; attention-capture=reviewed; false-learning-signal=reviewed; touch-miss=reviewed; mobile-displacement=reviewed; schema-drift=reviewed; creative-escape=reviewed; privacy-expansion=reviewed; device-variance=reviewed; bundle-growth=reviewed

Not checked: real microphone permission prompts, recorder hardware and acoustic room behaviour; audible guide comfort and timing on the intended child device; hosted GitHub Actions, Pages publication and cache behaviour; five-year-old learner observation and pedagogical outcomes; screen-reader and assistive-technology behaviour across supported browsers; future non-fixture lesson-provider behaviour

Elenchus verdict: guarded

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |
| S1-R3-01 | low | `src/App.tsx` | Guide audio construction or resume failure returned playback to stopped state, but the recovery message told the child to follow “moving note stones,” which did not move on that path. | fixed and guarded in this commit |
| S1-R3-02 | low | `README.md` | The opening family description said every lesson would “make a tiny tune,” contradicting the approved **Finish without a tune** participation route named later in the detailed flow. | fixed and guarded in this commit |

Leads not pursued: All six round 1 and four round 2 fixes were rechecked in source, focused guards and the 390 by 844 browser replay. Lesson 12 fingering and visible progress advanced together; copy routes returned to the chooser; **Play to Pip** stopped at the ready card; the optional maker exit reached neutral completion; guide playback locked controls, shared its start delay, stopped explicitly and recovered; and reduced-motion navigation remained deterministic in source and pure tests. The exact Node 22.19.0 Elenchus parent-red run executed 67 tests with 2 assertion failures, no runner errors and no skips; the fixed report executed 67 with no failures, errors or skips. Full `verify:local` passed and production JavaScript measured 232827 bytes against the 300000-byte ceiling. No new dependency, workflow authority, lesson or schema change, persisted field, recorder or outbound child-data path was found. Real-device audio and permission teardown, child observation, hosted publication and cache behaviour, assistive-technology behaviour and non-fixture provider responses remain external evidence boundaries.
