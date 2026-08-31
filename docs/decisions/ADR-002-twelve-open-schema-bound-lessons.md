# ADR-002: Ship twelve open, schema-bound lessons

## Status

Accepted, 2026-08-31

## Context

The first release must feel substantial, progress gently and remain extendable. Young learners vary too much for a timer, lockout or single mandatory route to be honest. Recorder methods also disagree on one universal first-note sequence.

## Decision

Ship twelve lessons, all open from the start. The main path uses the common school sequence B, A and G, then finger changes, repeated notes, short echoes, two original tunes and a C5-to-C6 natural-octave explorer. Difficulty never decreases with catalogue order.

Each lesson is one closed JSON object validated against `schema/lesson.schema.json` and an executable cross-catalogue contract. Natural notes are limited to C5, D5, E5, Baroque F5, G5, A5, B5 and C6. Baroque F covers holes 0, 1, 2, 3, 4, 6 and 7. The interface also states every fingering in words so colour is never the only carrier.

Completion stores only lesson IDs on the current device. There are no names, grades, dates, streaks or locked lessons.

## Alternatives

A short three-lesson demonstration was rejected because the requested result is a substantial first course. A locked linear path was rejected because it turns varied readiness into a gate. Free-form lesson objects were rejected because they would let agent and renderer behaviour drift without one enforceable contract.

## Consequences

- B, A and G is a chosen teaching path, not a claim of universal superiority.
- No fixed session length is imposed; the child may stop or choose another lesson.
- New lesson fields require a deliberate schema, validator, renderer and documentation change.
- Exact fingerings, ordering and difficulty remain executable regression evidence.
- [ADR-004](ADR-004-guided-mission-loop.md) defines the shared hear, copy, make and stop interaction without changing the lesson catalogue contract.

## Evidence

- [Yamaha Baroque soprano fingering chart](https://www.yamaha.com/en/musical_instrument_guide/common/images/recorder/fingering_baroque.pdf)
- [American Recorder Society soprano fingering chart](https://americanrecorder.org/docs/Fingering_Chart_for_Soprano_Recorder.pdf)
- [Development Matters](https://www.gov.uk/government/publications/development-matters--2/development-matters)
