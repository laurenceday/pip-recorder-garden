# ADR-006: Publish Pages from the checked workflow

## Status

Accepted, 2026-09-04

## Context

The repository already contained a Pages workflow that builds and uploads `dist/`. The live repository setting still used legacy publication from the root of `main`. That publisher served `index.html` with `/src/main.tsx`; the URL returned HTTP 200, but the browser could not load the application.

## Decision

GitHub Actions owns Pages publication. The repository Pages setting uses workflow build type. The workflow runs the deterministic artifact checks against the accepted `main` tree, uploads only `dist/` and grants deployment authority only to its deploy job. The network-dependent dependency advisory query remains a required local and ordinary-CI check, but is not repeated in the Pages availability path.

Release acceptance fetches the public HTML and its one same-site hashed JavaScript asset. The fetched JavaScript must have the same name and bytes as the local production build. An HTTP 200 for source HTML is not a release result.

## Alternatives

Legacy publication from the root of `main` was rejected because the Vite source tree is not a deployable browser artifact.

Checking only the workflow result was rejected because the earlier workflow was green while a different publisher still owned the public site.

Committing `dist/` to a publication branch was rejected because it would add another generated branch and bypass the existing checked workflow.

## Consequences

- The Pages repository setting is part of the release boundary and must be checked alongside the workflow file.
- A dependency-advisory service outage can fail ordinary CI without preventing publication of a locked graph that has already passed the recorded audit; Pages still fails closed on every deterministic artifact check.
- A public deployment is accepted only when the live hashed asset matches the accepted build.
- Repository source, Actions logs and an HTTP 200 are insufficient on their own.
- Deployment proves artifact identity and browser availability. It does not prove child readability, learning, device comfort or microphone behaviour.

## Evidence

- [`pages.yml`](../../.github/workflows/pages.yml)
- [`check-live-pages.mjs`](../../scripts/check-live-pages.mjs)
- [`verification.md`](../verification.md)
