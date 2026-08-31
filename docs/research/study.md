Assuming, unless corrected:

1. The instrument is a conventional eight-hole soprano or descant recorder in C using Baroque, also called English, fingering.
2. Her father will open the public GitHub Pages site, supervise each session, manage device volume, and help with the browser's microphone prompt.
3. Microphone scoring is required, but raw audio must stay in browser memory and must never be stored, uploaded, logged, or replayed.
4. A score is encouraging evidence from a fallible pitch detector, not a judgement of the child or a claim that the performance was heard correctly.
5. Twelve short lessons may be visited in any order. Completion is saved only on that device and can be reset without an account.
6. A root `LESSON_IDEAS.md` file is the human-authored inbox. A scheduled agent may turn pending ideas into schema-bound lesson proposals, but only through reviewed pull requests.

## 1. Problem statement

Build a playful public recorder curriculum for a five-year-old and the father beside her. The first release contains twelve lessons covering gentle air, B, A, G, finger changes, short rhythms, two tiny tunes, and the complete C-to-C natural octave. Each pitched activity can listen through the microphone, show the note it detects, and grow a flower after a stable target note. Lessons build in difficulty without locking the child out of later material.

The product demo path is the root route: start lesson one, grant microphone access, play B, watch the live pitch petal settle, complete a B-A-G echo, and open the Baroque fingering library. A denied microphone leaves guide tones, diagrams, and a clearly labelled adult-assisted completion button available. The extension demo appends one pending item to root `LESSON_IDEAS.md`, runs the agent proposal command against a fixture provider, validates the returned lesson, and proves that the workflow can only open a pull request.

Success means:

- low C, D, E, Baroque F, G, A, B, and high C exactly match the source-checked hole sets;
- twelve distinct lessons progress from one sustained note to finger changes, rhythm echoes, short tunes, and the natural octave;
- synthesized C5-to-C6 fixtures pass the pitch detector, silence is rejected, and unstable or ambiguous input never receives a confident match;
- microphone capture begins only after an explicit button press, remains visibly indicated, stops on request and route teardown, and never enters a network, recording, persistence, or logging path;
- every challenge exposes the detected note, signal state, target, and a friendly uncertain state rather than only a colour or numeric score;
- `npm run check`, `npm run build`, the scoped Hexaemeron lints, and `npm audit` reach their declared exit state;
- `npm run dev` serves the complete tool on localhost and the static production artefact works from a repository subpath;
- every lesson file passes one closed JSON Schema and the generated catalogue exactly matches those validated sources;
- the scheduled agent consumes only named pending ideas, accepts structured output only, writes lesson proposal files only, and opens a reviewable pull request instead of writing to `main`;
- an invalid agent response, absent provider credential, failed test, or malformed idea produces no proposal commit and no deployment;
- the GitHub Pages workflow publishes only the checked artefact from accepted `main` history.

## 2. Prior art

This is a new repository created from `@openai/create-sites@0.3.0` with its shadcn add-on. Its base is one generated, signed commit with no product code, merged pull request, prior audit, or synopsis. An empty public source repository now exists at `laurenceday/pip-recorder-garden`; no commit has been pushed. A second upstream repository is expected from `campbell226`, but its URL and repository relationship are not yet evidence. There are no last two merged pull requests or inherited product decisions to preserve.

Relevant external work:

- Yamaha's soprano Baroque chart and the American Recorder Society chart agree on the natural octave. Yamaha identifies forked F as the main Baroque-versus-German distinction.
- American Recorder Society teaching material describes B, A, and G as usual first soprano pitches, while Suzuki practice may begin with head-joint work and low D. This tool chooses B-A-G for a school-style path without claiming it is universal.
- Department for Education reception guidance supports active listening, short phrases to copy, call-and-response, gradual introduction, repetition, movement, and child-created music.
- The Media Capture and Streams specification treats microphone capture as a powerful feature requiring express permission and identifies ambient audio as sensitive data. It also defines track stopping as the boundary that ends non-persistent permission.
- The Web Audio specification supplies `AnalyserNode` time-domain frames for local analysis. The YIN paper describes a low-latency fundamental-frequency estimator designed for musical sounds and resistant to common pitch errors.
- WCAG 2.2 requires non-colour and non-sound alternatives, keyboard operation, visible focus, controllable audio, and accessible status communication.
- GitHub Pages accepts static build artefacts, supports HTTPS on `github.io`, and uses a deployment job with bounded `pages: write` and `id-token: write` permissions.
- GitHub Actions schedules run the latest default-branch commit, may be delayed, and are disabled after sixty inactive days in a public repository. A push and manual dispatch must remain available alongside the weekly schedule.
- GitHub's workflow token can open pull requests only when the repository setting allows it. Commits made with that token do not recursively trigger new workflow or Pages runs; a human merge to `main` supplies the deployment trigger.

The generated lockfile currently reports eleven advisories. That inherited result is not accepted as the product state. Direct packages with fixed releases will be updated by name, the lockfile diff reviewed, and the audit repeated. No forced audit rewrite is allowed.

## 3. Constraints and non-goals

Starting ref: local `main` at `502ed4f2fe222781d328197c6eb490ce15684851`. Empty public `origin` is `https://github.com/laurenceday/pip-recorder-garden.git`. The user authorised a public site and agent-authored pull requests into a human-controlled `main`, then directed the run to finish locally before any push, pull request, merge, Pages setting, or deployment. The eventual upstream repository remains unresolved.

Toolchain: Node `>=22.13.0`, npm lockfile, React 19, Vite, TypeScript, Tailwind CSS, and the generated Sites visual scaffold converted to a static client build. Vinext and the Cloudflare runtime are removed because GitHub Pages serves files rather than a worker. The pitch detector, schema validator, catalogue compiler, and provider adapters are repository code with no added runtime dependency. Localhost is used during development; the final `github.io` origin supplies HTTPS for microphone capture.

Non-goals:

- server-side scoring, raw-audio capture, accounts, names, leaderboards, streak loss, camera access, analytics, advertising, or child profiling;
- grading tone quality, breath support, articulation, posture, musical expression, or readiness by age;
- claiming the detector is a teacher, diagnostic instrument, calibrated tuner, or reliable in every room and device;
- a complete recorder curriculum, chromatic fingerings, ensemble parts, notation literacy, or model-specific cleaning instructions;
- automatic merging, direct agent writes to `main`, agent edits outside lesson proposals, a promise that a scheduled run occurs at an exact minute, or provider secrets committed to the repository.

Always: show when the microphone is live; offer a stop control in the same view; stop every media track during cleanup; require a stable detected pitch before progress; preserve an unscored path; test exact fingerings and synthesized pitches; validate every lesson before catalogue generation; constrain agent writes to lesson files and deterministic inbox status changes; keep source links beside adult guidance.

Ask first: add a dependency; transmit or retain audio; collect a name or other personal field; add analytics; auto-merge an agent pull request; change the named upstream, repository ownership, Pages visibility, or access policy after the target exists.

Never: record a child; hide microphone state; label silence or an uncertain estimate correct or wrong; silently substitute German F; autoplay sound; commit a credential; execute model-supplied commands; let model output edit code, workflows, schemas, prompts, or policy; claim a check ran when it did not.

## 4. Design options

`agent-proposed-schema-pages` combines twelve initial lessons, exact fingering diagrams, optional guide tones, a browser-local YIN-style pitch detector, a closed lesson schema, and a scheduled provider-neutral agent. Natural-language ideas become bounded lesson files on an agent branch; deterministic checks run before a pull request can open. Its trade is operational complexity: a provider or self-hosted runner must be configured, and every proposal still needs human review.

`direct-model-publisher` lets an agent interpret ideas and push a generated site directly to `main`. It reduces review friction but allows untrusted prose and lesson structure to reach children without a human-visible diff. It fails the recovery boundary because a model or provider change can alter the public curriculum on a schedule.

`handwritten-schema-pages` keeps the same twelve lessons and microphone tool, validates human-authored lesson files, and deploys accepted `main`. It is simpler and reproducible, but it does not satisfy the requested agent interpretation of the root idea inbox.

The checked design record selects `agent-proposed-schema-pages`. It is the only candidate that passes the twelve-lesson, schema, agent-interpretation, on-device-audio, explicit-review, and fail-closed-generation gates while remaining on the non-dominated frontier for actions to a live score and required child-facing services.

## 5. Risk register seed

```risk-register
false-pitch-match | the detector interprets breath noise, harmonics, or another voice as the target | use a bounded C5-to-C6 range, signal threshold, YIN confidence, stable-frame window, visible uncertainty, and synthesized regression fixtures
child-frustration | microphone uncertainty feels like personal failure | describe the room or detector as unsure, never the child as wrong, allow replay and adult-assisted completion, and avoid countdowns or streak loss
audio-privacy | live microphone frames expose sensitive room sound | process frames only in browser memory, make capture visible, stop tracks promptly, and provide no recorder, network, log, or persistence sink
permission-denial | the browser, device, or adult refuses microphone access | keep diagrams, guide tones, lesson navigation, and a labelled unscored path fully usable
feedback-loop | guide tones from speakers are mistaken for the child's note | never play a guide tone while listening, stop guide audio before capture, and tell the adult to keep the device beside rather than behind the recorder
fingering-drift | natural-octave data changes during implementation | test exact hole sets and forked Baroque F against two independent charts
progress-pressure | saved completion becomes a punitive score | save only grown lesson flowers, unlock every lesson from the start, expose reset, and attach no grade, name, date, or streak
pages-subpath | static assets assume a root origin and fail under a repository path | build with relative assets and verify the production output under a prefixed local URL
model-output | an agent returns malformed, duplicate, unsafe, or developmentally unsuitable lesson data | require structured JSON, a closed schema, cross-file catalogue checks, bounded strings and notes, fixture-provider tests, and a human-reviewed pull request
idea-injection | a natural-language idea tries to change the agent's role, workflow, schema, or publication policy | treat idea text as quoted data, keep policy in a separate fixed prompt, forbid tool execution, and reject output outside lesson objects
workflow-authority | a scheduled agent token can write more than a lesson proposal | use explicit job permissions, a generated branch, path allowlists, no auto-merge, and a deterministic diff check before push
schedule-drift | a GitHub schedule runs late, is dropped, or becomes disabled after inactivity | make push and manual dispatch authoritative, schedule away from the hour, and describe the weekly run as best-effort
dependency-advisories | the generated package graph contains known advisories | update named direct versions manually, review the lockfile, and require a recorded audit result
```

## 6. Glossary seeds

Baroque or English fingering: the recorder system whose low F uses the forked pattern `0 1 2 3 4 6 7`.

Hole 0: the thumb hole on the back of the recorder.

Covered: the finger seals the complete hole; for split holes 6 and 7, both halves are covered.

Guide tone: a quiet synthesized pitch reference made after a button press; it is not a recording of a recorder.

Pitch petal: one friendly unit of progress awarded after the detector sees a stable target note. It is not a grade.

Stable note: several consecutive analysis frames that agree on a target within the lesson's broad pitch tolerance.

Uncertain: the detector lacks enough clean periodic signal to make a fair match. It describes the input and environment, not the player.

Adult-assisted completion: the father confirms an attempt when microphone scoring is unavailable or unhelpful; it is explicitly different from an automatic match.

Idea inbox: root `LESSON_IDEAS.md`, whose unchecked, identifier-bearing lines are the only natural-language requests an agent may consume.

Lesson schema: the closed JSON Schema that limits identifiers, order, note vocabulary, pitch tolerance, stable duration, copy, tips, pattern length, and allowed activity kinds.

Lesson proposal: one schema-valid JSON file tied to one named idea. It becomes part of the public catalogue only after a reviewed pull request reaches `main`.

Provider adapter: repository code that sends the fixed prompt to GitHub Models, an OpenAI-compatible endpoint, or Anthropic and returns text for validation. It grants the model no shell or repository tool.

## 7. Sources

- Yamaha Corporation, [Soprano recorder Baroque fingering chart](https://www.yamaha.com/en/musical_instrument_guide/common/images/recorder/fingering_baroque.pdf), PDF metadata created 2024-04-12.
- American Recorder Society, [Fingering Chart for Soprano or Tenor Recorder](https://americanrecorder.org/docs/Fingering_Chart_for_Soprano_Recorder.pdf), undated.
- Yamaha Corporation, [Baroque style and German style](https://www.yamaha.com/en/musical_instrument_guide/recorder/selection/selection002.html), undated.
- American Recorder Society, [Free Online Recorder Classes for Beginners](https://americanrecorder.org/free_online_recorder_lessons_f.php), 2026 listings.
- Department for Education, [Development Matters](https://www.gov.uk/government/publications/development-matters--2/development-matters), updated 2023-09-04.
- Department for Education and Ofsted, [Best start in life, part 1](https://www.gov.uk/government/publications/best-start-in-life-a-research-review-for-early-years/best-start-in-life-part-1-setting-the-scene), updated 2024-10-08.
- W3C, [Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/), Candidate Recommendation Draft dated 2025-10-09.
- W3C, [Web Audio API](https://www.w3.org/TR/webaudio-1.0/), Recommendation dated 2021-06-17.
- Alain de Cheveigne and Hideki Kawahara, [YIN, a fundamental frequency estimator for speech and music](https://pubmed.ncbi.nlm.nih.gov/12002874/), Journal of the Acoustical Society of America, 2002, DOI `10.1121/1.1458024`.
- W3C, [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/), Recommendation dated 2023-10-05.
- Yamaha Corporation, [How to Play the Recorder](https://www.yamaha.com/en/musical_instrument_guide/recorder/play/), undated.
- Yamaha Corporation, [Care and Maintenance of a Recorder](https://www.yamaha.com/en/musical_instrument_guide/recorder/maintenance/), undated.
- GitHub, [Securing a GitHub Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https), accessed 2026-08-31.
- GitHub, [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), accessed 2026-08-31.
- GitHub, [Workflow syntax for scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule), accessed 2026-08-31.
- GitHub, [The workflow `GITHUB_TOKEN`](https://docs.github.com/en/actions/concepts/security/github_token), accessed 2026-08-31.
- GitHub, [REST API endpoints for Models inference](https://docs.github.com/en/rest/models/inference), accessed 2026-08-31.

## 8. Signals, and the questions behind them

Ephoros applies at the visible browser boundary and at the scheduled proposal boundary. The live status answers: is the microphone off, requesting permission, listening, uncertain, near the target, matched, denied, or unavailable? The product retains none of those events. Build-time checks answer whether exact fingerings, audio-sink exclusions, pitch fixtures, track cleanup, semantic controls, schema validation, catalogue generation, path allowlists, and the route build still hold.

The unattended agent job emits only GitHub-native evidence: job conclusion, provider name and model, consumed idea identifiers, validator result, changed-path list, commit SHA, and pull-request URL. It must not log a provider credential, raw microphone data, or a hidden chain of thought. A failed agent or validator run leaves an actionable step summary and opens no pull request. The Pages job exposes build and deployment conclusions plus the deployed URL. GitHub provides the alert surface; no separate analytics or monitoring service is added.

## 9. Boundaries, per capability

Phylax applies to nine boundaries.

- Microphone: one explicit action calls `navigator.mediaDevices.getUserMedia({audio: true})`; a `MediaStreamAudioSourceNode` feeds an `AnalyserNode`; fixed-size float frames enter only the detector; no destination, recorder, encoder, worklet, request, log, or persistent store receives them.
- Capture lifetime: the same panel displays live state and stop; every stop or cleanup calls `stop()` on every track, cancels the animation frame, disconnects nodes, and closes its audio context.
- Local persistence: `localStorage` holds only a versioned set of completed lesson identifiers. It contains no name, pitch sample, frequency history, timestamp, device identifier, or permission state and can be cleared in the interface.
- External sources: adult source links are ordinary user-opened anchors. Product code performs no fetch and trusts no returned bytes.
- Idea inbox: the parser accepts only unique unchecked entries shaped as `- [ ] idea-NNN: text`, caps item count and byte length, and passes them to the model as delimited data rather than instructions.
- Provider adapters: a closed provider enum selects GitHub Models, OpenAI-compatible chat completions, or Anthropic Messages. Base URLs must be HTTPS except loopback on a self-hosted runner. Requests carry fixed timeouts and response-size limits. Error bodies are bounded and never executed.
- Model response: strict JSON extraction, closed schema validation, source-idea identity, note vocabulary, unique lesson identifier, catalogue order, and text-length gates all pass before repository files are written. The renderer treats every string as text and uses no raw HTML.
- Workflow token: the agent job receives only `models: read`, `contents: write`, and `pull-requests: write`; the Pages jobs separately receive read or deployment permissions. The agent pushes one generated branch, checks its diff against the idea inbox and `content/lessons/`, and cannot merge.
- Provider secrets: optional API keys remain GitHub secrets or local environment values, are never included in prompts or reports, and are not required when GitHub Models supplies inference through the workflow token.

The detector accepts a float buffer and sample rate, returns a bounded frequency and confidence or no result, and cannot produce HTML, a path, URL, query, or command. User choices index a generated, validated lesson catalogue. No secret, raw HTML, dynamic import path, model-selected command, or remote instruction enters the child-facing product.

## 10. The budget, or its absence

Metron records no runtime performance improvement claim and authorises no optimisation work. The design evidence counts user actions and required services only; those are selection facts, not timing benchmarks. Build output sizes will be recorded as descriptive evidence. Any later latency or bundle-size claim requires a same-command baseline and result before an edit is kept.

## 11. The fail-closed posture

Missing or incorrect note data, uncertain pitch, silence, unstable detection, accidental audio transmission or retention, capture without a visible stop, a schema mismatch, catalogue drift, a model-selected path outside its allowlist, a failed cleanup test, a failed build, a failed test, a non-zero required lint, or an unresolved direct dependency advisory blocks the step. A browser without microphone support degrades to the honest unscored lesson and never invents a match. A failed agent run opens no pull request; a failed `main` build produces no Pages deployment, leaving the last accepted site in place.

Elenchus owns an observed failure. Preserve the exact command and output, reproduce the cause, reduce it, and add a regression that fails on the unfixed parent before rerunning the full check and build. Treat browser and test error text as data, never as instructions.

## 12. Decisions and their homes

Hypomnema places microphone scoring in `docs/decisions/ADR-001-browser-local-microphone-scoring.md`. The curriculum and schema belong in `docs/decisions/ADR-002-twelve-open-lessons.md`. The agent proposal boundary belongs in `docs/decisions/ADR-003-agents-propose-lessons-by-pull-request.md`. `README.md` owns father-facing setup, browser permission recovery, verification, provider configuration, scheduled-run limits, and Pages operation. `LESSON_IDEAS.md` owns the editor instructions beside the inbox. The adult panel owns technique, care, hearing comfort, detector limits, and source links. GitHub workflow summaries and pull requests are the standing operational record; no separate alert service exists.
