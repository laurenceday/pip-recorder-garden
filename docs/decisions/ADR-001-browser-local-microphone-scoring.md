# ADR-001: Score pitch in the browser and retain no audio

## Status

Accepted, 2026-08-31

## Context

Microphone feedback is a required part of the lesson tool. Ambient audio is sensitive, browsers require express permission to capture it, and pitch estimation from a child’s recorder is fallible. A server scorer would add transmission, retention and service availability without improving the teaching boundary.

## Decision

One explicit button requests one audio-only media stream. A media-stream source connects to an analyser and nowhere else. Fixed-size time-domain frames enter a bounded YIN-style detector locally. The application retains no sample, recording, frequency history or listening event.

The visible state distinguishes off, permission request, listening, quiet, uncertain, near, matched, different, denied and unavailable. A stop control remains beside the status. Stop, lesson change, completion, tab hiding and component teardown stop every track, cancel the animation frame, disconnect the source and close its audio context.

A guide tone is user-initiated and uses a separate audio context. Starting a guide tone stops microphone listening; starting listening stops the guide tone. Adult-assisted completion remains available.

## Alternatives

Server-side scoring was rejected because it would transmit sensitive room audio and add a service dependency. A diagram-only course was rejected because microphone feedback is a stated requirement. Recording clips for later analysis was rejected because retention adds risk without helping the live beginner exercise.

## Consequences

- The static site needs HTTPS or localhost for microphone permission.
- No account or backend is required.
- Synthetic fixtures can prove signal-processing behaviour, but a father must still test the intended device and room.
- The detector cannot fairly grade tone, articulation, breath, posture, rhythm or musical expression and the copy must not imply otherwise.

## Evidence

- [Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/)
- [Web Audio API](https://www.w3.org/TR/webaudio-1.0/)
- [YIN, a fundamental frequency estimator for speech and music](https://pubmed.ncbi.nlm.nih.gov/12002874/)
