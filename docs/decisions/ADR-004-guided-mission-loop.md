# ADR-004: Use one guided mission loop in every lesson

## Status

Accepted, 2026-08-31

## Context

The twelve lessons were open and safe, but most of the interaction repeated one passive fingering picture, one guide note and one optional pitch check. Sequence lessons asked a child to listen to a phrase even though the guide could play only the current note. On a phone, the full lesson picker also appeared before the active lesson.

A five-year-old beginner needs a short, recognisable turn with several ways to join in. More novelty alone would add decisions and maintenance without making the musical action clearer.

## Decision

Every lesson uses the same four-part mission: hear the complete lesson pattern, copy it by recorder, fingering puzzle, rhythm tap or grown-up co-play, make a two-to-four-note pattern from that lesson’s notes, then choose to stop, replay or return to the garden. The interface never advances to another lesson by itself.

Whole-pattern playback is user-started and has an adjacent stop control. Note onsets, releases and the visual pulse all come from one deterministic schedule. Playback and microphone listening stop one another before starting. Both stop on lesson change, completion, hidden tab and teardown.

Fingering and rhythm are participation routes, not claims about physical technique or musical mastery. The pattern maker stays in memory, accepts only notes already present in the lesson, and freezes while its tune sounds. Completion still stores only the validated lesson ID.

At narrow widths, the active lesson precedes the garden picker. Child-facing controls have targets of at least 44 by 44 CSS pixels.

## Alternatives

A mini-game arcade was rejected because it would make the child choose a game before making music and would multiply interaction rules. An open composition studio was rejected as the main design because it offers little guidance to a first-time player. Bounded pattern making remains the third part of the guided loop.

## Consequences

- The guide scheduler, rhythm comparison and pattern bounds are pure, tested code.
- All twelve existing lesson objects, the lesson schema and agent write boundary remain unchanged.
- The microphone remains optional; fingering, rhythm and grown-up routes need no permission.
- Tunes, taps, timing, attempts and copy-route choices are not retained or transmitted.
- Automated checks establish mechanics and boundaries, not whether a particular child learned from the activity. The intended recorder, browser, device and room still need an adult acceptance pass.

## Evidence

- [`guided-mission-study.md`](../research/guided-mission-study.md)
- [`guided-mission-runbook.md`](../research/guided-mission-runbook.md)
- [Department for Education: Development Matters](https://www.gov.uk/government/publications/development-matters--2/development-matters)
- [Department for Education: music programmes of study](https://www.gov.uk/government/publications/national-curriculum-in-england-music-programmes-of-study)
- [W3C: target size (enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)
