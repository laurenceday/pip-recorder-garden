# ADR-005: Use a child-first one-screen play loop

## Status

Accepted, 2026-08-31

## Context

The guided mission put the story, four-step map, note pattern, route choice, grown-up help, lesson trail and privacy text in one document. A family check on a phone found it too small, too complex and too long for a five-year-old. The first useful action began below the first screen.

A repository rule cannot prove which words one child can read. Early reading depends on the letter-sound links and exception words she has been taught. The interface can still make its boundary testable: admit a tiny reviewed list, inventory every child string and keep all other prose in a grown-up view.

## Decision

Use `one-screen-play-loop`. `App` conditionally mounts one of two React trees. `GrownUpSetup` owns lesson selection, teaching notes, privacy, progress and the existing detailed mission. `ChildStage` receives only a closed state, validated note letters and actions. The grown-up tree is not hidden with CSS; it is absent from the child tree.

The first child-copy contract admits exactly `a`, `b`, `back`, `c`, `d`, `done`, `e`, `f`, `g`, `pip`, `play`, `stop` and `try`. Case does not widen the list. Visible copy and accessible names share one deterministic 19-entry manifest over four states: `ready`, `playing`, `done` and `error`. Lesson note names become the letters A to G before they cross into the child tree. No lesson title, story, cue, error message or other open string may cross that interface.

The child entry models the chosen note pattern with **Play**, gives **Stop** while sound runs, gives **Try** after a guide failure and uses **Done** or **Back** to return to grown-up mode. This step establishes the copy boundary without changing the lesson schema, saved progress or audio ownership.

## Alternatives

`trimmed-mission-page` kept the document and shortened its sentences. It was rejected because the child and grown-up roles would still share one tree, and the task and route shelf would still scroll together.

`game-arcade` put pitch, rhythm, fingers and listening behind large game tiles. It was rejected because it asked the child to choose a game before making music, added several state machines and exposed more words at entry.

Keeping the old interface unchanged was rejected because it did not answer the family’s phone report or the child-copy rule.

## Consequences

- Child copy additions require a reviewed lexicon and manifest change. The checker follows the child component import closure, includes CSS in the commit-bound source digest and rejects unknown tokens, punctuation disguises, generated copy, uninspectable artwork, dynamic accessible names, open error text, opposite-role imports and undeclared states.
- Grown-up prose remains unrestricted inside its separately mounted tree.
- The existing twelve lessons, progress key, microphone boundary, guide-tone lifecycle and full mission remain available in grown-up mode.
- The repository proves conformance to the declared list, not readability for one child. A real child read-through remains required.
- The selected one-screen presentation and complete model-response-stop turn are governed by the accepted runbook’s later steps.

## Evidence

- [`child-first-play-study.md`](../research/child-first-play-study.md)
- [`child-first-play-runbook.md`](../research/child-first-play-runbook.md)
- [`child-copy.ts`](../../src/lib/child-copy.ts)
- [`check-child-copy.mjs`](../../scripts/check-child-copy.mjs)
- [Department for Education: Development Matters](https://www.gov.uk/government/publications/development-matters--2/development-matters)
- [Department for Education: ELG Word Reading](https://help-for-early-years-providers.education.gov.uk/support-for-practitioners/eyfs-profile-assessment-support/word-reading-early-learning-goal)
