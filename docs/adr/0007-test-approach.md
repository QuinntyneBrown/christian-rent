# 0007. The test approach

**Status:** Accepted

## Context

`AGENTS.md` forbids a real backend or database in any automated test, any network beyond
localhost, and sleeping. Each slice is proved by an acceptance test written first.

## Decision

- **Backend acceptance tests** go through the API with `WebApplicationFactory<Program>` (xUnit
  v3). Each fixture replaces the database with EF Core InMemory under a unique store name,
  `TimeProvider` with `FakeTimeProvider`, and authentication with `TestAuthHandler`. Database
  faults are injected through `IAppDbContext`. A rule with a table of cases also gets a direct
  test, one case per row.
- **Frontend behaviour specs** run in Playwright on Chromium only, against `ng serve`. The shared
  fixture (`e2e/fixtures/test.ts`) exports `test` and `expect`; it fails a spec on a page error,
  on a request that leaves localhost, and on an API request no fixture answered. API responses
  come from `e2e/fixtures/api.ts`. One page object per screen or dialog owns the selectors.
- **Sweeps** (`e2e/sweeps/`: visual, responsive, accessibility, heap) are written and kept
  current but run only with `npm run e2e:sweeps` when a person asks.
- **Unit tests** (Vitest) cover helpers and services with many cases; time-driven rules use a
  fake clock.
- No architecture tests: ESLint enforces structure.

## Consequences

- The suites run anywhere with Node and the .NET SDK, without Docker or a database.
- What InMemory cannot show (constraints, transactions) is covered by the migration being
  applied with `ChristianRent.Cli migrate` against a real engine by a person, outside the suites.
