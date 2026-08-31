# ADR-003: Agents propose lesson data by pull request

## Status

Accepted, 2026-08-31

## Context

The root idea file should support periodic interpretation by Qwen, Claude, Shoggoth or a later agent. Model text is untrusted, provider behaviour changes, and the public audience includes a child. Direct publication would hide the most important review boundary.

GitHub Models cannot be a provider: GitHub retired the service on 30 July 2026.

## Decision

`LESSON_IDEAS.md` is the only natural-language inbox. A provider-neutral command selects at most three pending IDs, supplies their text inside explicit untrusted-data markers and accepts one bare JSON response. The live adapters are OpenAI-compatible chat completions and Anthropic Messages. Remote URLs require HTTPS; loopback HTTP is accepted only for a local or self-hosted runner.

Before any write, the response must pass the closed lesson contract, source-idea binding, unique ID and order checks, non-decreasing difficulty, bounded plain-text fields and the complete catalogue validator. The write set is limited to new numbered lesson JSON files and deterministic checkbox changes. The workflow runs repository checks, creates one branch and opens a pull request. It cannot merge or deploy.

## Alternatives

Direct model writes to `main` were rejected because they remove human review from child-facing material. A human-only inbox was rejected because it does not meet the requested periodic agent interpretation. GitHub Models was considered during study and removed when current documentation confirmed that the service had retired.

## Consequences

- A human reviews child-facing language, progression, fingering and adult guidance before merge.
- Invalid output, missing configuration, disallowed paths or failed checks open no pull request.
- Remote credentials remain local environment values or GitHub secrets.
- Loopback Qwen or Shoggoth needs a self-hosted runner; a GitHub-hosted runner cannot reach a family computer.
- Schedules are best-effort and may be disabled after 60 inactive days in a public repository. Manual dispatch remains available.

## Evidence

- [GitHub Models retirement](https://docs.github.com/en/github-models)
- [GitHub Actions schedule behaviour](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Using `GITHUB_TOKEN` in workflows](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)
