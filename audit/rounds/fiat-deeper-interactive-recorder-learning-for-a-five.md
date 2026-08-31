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
