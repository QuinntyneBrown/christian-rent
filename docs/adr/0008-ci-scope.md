# 0008. CI scope

**Status:** Accepted. [0031](0031-hosting-on-azure-and-deploying-each-commit.md) adds a deploy
workflow that runs after this one on `main`.

## Context

The pipeline must always be green and finish in under 5 minutes, running only the few
highest-value checks per feature; unit tests run locally, never in CI (`AGENTS.md`, *CI*).

## Decision

`.github/workflows/ci.yml` runs on every pull request and every push to `main`, as two parallel
jobs:

- **frontend**: `npm ci`, `npm run format:check`, `npm run lint`, `npm run build`, then the
  critical acceptance path of each feature (`npm run e2e:ci`, Playwright specs tagged
  `@critical`, Chromium only).
- **backend**: `dotnet restore --locked-mode`, `dotnet format --verify-no-changes`,
  `dotnet build`, then the critical acceptance tests
  (`dotnet test --filter-trait "Category=Critical"`).

npm, NuGet and the Playwright browser are cached between runs. A flaky or slow check is fixed or
removed, never retried. `node tools/verify/verify.mjs` runs everything, unit tests included,
locally before a push.

## Consequences

- Each feature tags one spec `@critical` and one backend test `[Trait("Category", "Critical")]`.
- Unit tests and the full suites are the author's responsibility before pushing.
