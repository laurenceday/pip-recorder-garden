# Research record

`study.md` and `runbook.md` preserve the receipted design snapshot that preceded implementation. They are evidence of what was known and chosen at that gate, not a substitute for current operating documentation.

Two facts changed during the build:

- GitHub’s live documentation now states that GitHub Models was fully retired on 30 July 2026. The implementation therefore supports only OpenAI-compatible and Anthropic provider protocols.
- The generated dependency graph was replaced. The final application uses React and Vite without Tailwind, Vinext or a Cloudflare runtime, and the locked graph is checked again during verification.

Current operation belongs in the root `README.md`. Durable product choices belong in `docs/decisions/`.
