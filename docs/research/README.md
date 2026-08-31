# Research record

`study.md` and `runbook.md` preserve the receipted design snapshot that preceded implementation. They are evidence of what was known and chosen at that gate, not a substitute for current operating documentation.

Two facts changed during the build:

- GitHub’s live documentation now states that GitHub Models was fully retired on 30 July 2026. The implementation therefore supports only OpenAI-compatible and Anthropic provider protocols.
- The generated dependency graph was replaced. The final application uses React and Vite without Tailwind, Vinext or a Cloudflare runtime, and the locked graph is checked again during verification.

Current operation belongs in the root `README.md`. Durable product choices belong in `docs/decisions/`.

`guided-mission-study.md` and `guided-mission-runbook.md` preserve the later design gate for the reusable hear, copy, make and stop lesson loop. [ADR-004](../decisions/ADR-004-guided-mission-loop.md) is the standing decision derived from that record.

`child-first-play-study.md` and `child-first-play-runbook.md` preserve the design gate prompted by the family’s phone check and the age-five copy rule. They select a separate child and grown-up render boundary followed by a one-screen model, response and stop turn. [ADR-005](../decisions/ADR-005-use-a-child-first-one-screen-play-loop.md) records the selected design, its closed first lexicon and the rejected trimmed-page and game-arcade options.
