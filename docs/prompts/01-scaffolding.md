# Feature: Scaffolding

Journey 1 of `docs/journeys.md` (Both): Angular workspace, .NET solution, app shell, test harness and CI.

## Goal

Lay the foundation every later journey builds on. Today the repository holds only the agent instructions, the
skills and `docs/` (requirements, mocks, design system and detailed designs); there is no `frontend/`,
`backend/`, `tools/` or CI. At the end, `frontend/` is an Angular workspace with the libraries `api`, `domain`
and `components` and the app `rent`, showing the application shell (header with the christian.rent wordmark,
skip link, the not-found page) at every width; `backend/` is a .NET solution in four layers plus
`ChristianRent.Cli`, with the platform cross-cuts in place; Playwright runs against fixtures; the commands in
the README's "Build and test" table all work; `node tools/verify/verify.mjs` runs them; and CI is green in under
5 minutes. No listing feature is built.

### In scope

- `frontend/` created with the `angular-new-app` skill: current Angular, standalone, zoneless, signals,
  `OnPush`; the libraries `api`, `domain` (`listings/`, `search/`, `storage/`), `components` and the app `rent`,
  imported as `@rent/<library>`; Prettier, angular-eslint with the dependency boundaries from `AGENTS.md`, and a
  rule forbidding `[innerHTML]` and `bypassSecurityTrust*`; tight `angular.json` budgets.
- Foundations from `docs/design-system/`: tokens (`docs/design-system/tokens/`), `@font-face` for the bundled
  fonts in `docs/design-system/assets/fonts/` (self-hosted, never a CDN), reset and utilities.
- The application shell from `docs/detailed-designs/platform/present-app-shell/README.md`: `app.config.ts` as
  the composition root, `app.routes.ts` with every route lazy, `App`, `NotFoundPage`, the `TitleStrategy`,
  `cr-logo`, `cr-site-header`, `cr-skip-link`.
- Frontend failure handling from `docs/detailed-designs/platform/fail-clearly-and-operate/README.md` and
  `platform/enforce-access`: `LoadState<T>`, `GlobalErrorHandler`, `ApiError` and `apiErrorInterceptor`.
- `backend/`: `ChristianRent.Domain`, `ChristianRent.Application` (MediatR, `ValidationBehavior`,
  `IAppDbContext`, `ICurrentMember`), `ChristianRent.Infrastructure` (EF Core, the first migration),
  `ChristianRent.Api`, `ChristianRent.Cli` (`migrate`, `seed`), and test projects; the API never migrates on
  startup.
- Platform cross-cuts from `platform/enforce-access`, `platform/handle-member-data` and
  `platform/fail-clearly-and-operate`: fallback authorisation policy answering 401 `not_signed_in`; HTTPS
  redirect and HSTS; refusal of cross-site writes; rate limits (120 reads, 30 writes a minute, 429 with
  Retry-After); a Content-Security-Policy with no inline or third-party script; `ProblemExceptionHandler` and
  `UnhandledExceptionHandler`; a health endpoint; OpenTelemetry through `TelemetryScrubber`, with routes as
  templates and no query string, body, token or contact detail; secrets from configuration outside the repo.
- The e2e harness in `frontend/`: Playwright on Chromium only, a shared fixture exporting `test`/`expect` that
  fails a spec on an unanswered request, a request off localhost or a page error; API fixtures; one page object
  per screen; the visual, responsive, accessibility and heap sweeps scaffolded but not run by default.
- `tools/verify/verify.mjs` running format, lint, unit tests, build, backend format and tests, and the
  behaviour specs side by side.
- `.github/workflows/` CI: lint, builds and one critical acceptance path, under 5 minutes, no unit tests.
- `docs/adr/` with the first ADRs, `docs/lessons-learned.md`, and `docs/detailed-journeys.md` (each journey of
  `docs/journeys.md` split into slices, with **% complete**).

### Deferred (not in this run)

- Every listing feature: journeys 2 to 12.
- The `admin` library: journey 10 adds it.
- Sign-in: not designed. Register the authentication seam and a test authentication handler only.
- Hosting, the telemetry backend and backups: open decisions; document the settings a deployed system needs,
  without deploying.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: ADRs, test-first implementation of the workspace, shell, backend and harness, docs, lessons learned, green tests and a PR. Go through
  every phase and every slice in one continuous run. Do not pause between phases to report, ask for approval,
  or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where the repo's instructions say "stop and ask", treat this prompt as the confirmation in advance for
  everything in scope here. Choose the simplest option that fits the existing architecture, record it (an ADR
  in `docs/adr/` or the design's open-questions section), and keep going.
- If a shared library, component or design asset lacks something, that is not a reason to stop. Update it
  first, as the repo's rules require, then go on.
- When a test, build or command fails, find the root cause and fix it, then go on. Never weaken a test to make
  it pass, and never skip a step quietly.
- Only stop for a real blocker you cannot resolve yourself, such as missing credentials, or an action outside
  this repo that can't be undone, such as production deploys or data changes. If that happens, finish
  everything else first, then report the blocker clearly.
- Keep track of progress (a todo list), so that nothing gets left out after context is summarised.

## Rules (read first, binding)

- Follow the repo's agent instructions exactly (`AGENTS.md`, which `CLAUDE.md` points to, and
  `CONTRIBUTING.md`), especially:
  - **Scope.** christian.rent is four screens: Browse, Listing, Post and Admin. No payment, booking calendar,
    reviews, ratings, social feed or adverts. A Messages inbox, "My listings" and sign-in are not designed;
    build none of them. Do not invent the L0 mission.
  - **The mocks are the source of truth** (`docs/mocks/`, listed in `docs/mocks/manifest.json`). When a mock
    changes, bring the requirement (`docs/specs/L2.md`), the ADR it touches and the detailed design in line,
    in that order, before any code. Keep the mocks' BEM classes; e2e locators depend on them.
  - **Words.** listing, for rent, wanted, space, thing, member, church, verified, message, review queue,
    report. No synonyms in code, docs or UI. The wordmark is lowercase **christian.rent** with ".rent" in
    orange. Prices in CAD, distances in km, Canadian spelling.
  - **Frontend** (`frontend/`, run npm from there): libraries `api`, `domain`, `components` (plus `admin`
    once journey 10 adds it) and the app `rent`, imported as `@rent/<library>`; the dependency direction in
    `AGENTS.md`, enforced by ESLint. Standalone, signals, `OnPush`, zoneless. `cr-*` selectors. File per
    type (`name.ts` + `name.html` + `name.scss`), one encapsulated BEM stylesheet per component, tokens read
    by role, no inline styles. Presentation components in `components` inject no app service, token or
    router. Each service has a contract and an injection token in `api`. No inline forms: CDK Dialog or a
    screen. Member-written text is rendered as text, never HTML. Touch targets at least 44 x 44 px; colour
    is never the only carrier of a state.
  - **Lazy loading and memory come first.** Every route lazy; heavy UI behind `@defer`; tight
    `angular.json` budgets; release every subscription, timer, listener, observer, `AbortController` and
    object URL; bound every list that can grow; scope state to its route.
  - **Backend** (`backend/`, run dotnet from there): `ChristianRent.Domain` <- `ChristianRent.Application`
    <- `ChristianRent.Infrastructure` <- `ChristianRent.Api`, plus `ChristianRent.Cli`. Controllers send one
    MediatR request and check nothing. Authentication by fallback policy; `[AllowAnonymous]` only for
    browsing and reading an approved listing (and any exception an ADR states). Errors are ProblemDetails
    with a `code`. No contact detail, token, message text, query string or body in telemetry.
  - **Tests.** Backend: acceptance tests through the API on EF Core InMemory (one store per fixture), a
    direct test per row for a rule with a table of cases, never a real database, never sleep (use
    `FakeTimeProvider`). E2E: Playwright on Chromium only, Page Object Model, specs import `test`/`expect`
    from the shared fixture, every API request answered by a fixture, nothing off localhost. Unit tests use a
    fake clock. Never write architecture tests. Do not run the visual, responsive, accessibility or heap
    sweeps, or update baselines, unless a person asks; do keep them current.
  - **CI** runs lint, build and one critical acceptance path per feature, under 5 minutes in total. Unit
    tests run locally only. Run `node tools/verify/verify.mjs` before every push.
- Work through the phases below **in order**, using the repo skill each phase names (skills are in
  `.claude/skills/`; a change to a skill is made in `.agents/skills/` too).
- Copy the house style of each folder. Read the existing neighbours before you write anything new.

## Phase 1: Prepare
- Read `AGENTS.md`, `CONTRIBUTING.md`, `README.md` ("Getting started", "Build and test", "Repository
  structure"), `docs/journeys.md`, `docs/detailed-designs/README.md` (especially "Open decisions"), and the four
  designs in `docs/detailed-designs/platform/`.
- Read `docs/mocks/README.md`, `docs/mocks/pages/brand/default.html`, `docs/mocks/pages/not-found/default.html`
  and the header of `docs/mocks/pages/browse/default.html`, and `docs/design-system/README.md`.
- Note the requirements this journey realises in `docs/specs/L2.md`: `L2-022`, `L2-023`, `L2-024`, `L2-025`,
  `L2-026`, `L2-027`, `L2-028` (criterion 3), `L2-029`, `L2-031`, `L2-032`, `L2-033`, `L2-034`. If anything
  below shows a criterion is wrong or missing, fix it first (`engineering-requirements`).
- Work on a fresh branch from `main` after fetching it.

## Phase 2: ADRs and progress docs
- Create `docs/adr/` with a short README and numbered ADRs, one decision each, for: the frontend workspace and
  its libraries; the backend layers and the CLI; the database engine (open decision; tests always use EF Core
  InMemory); the file storage product (open decision; local disk in development); the authentication seam while
  sign-in is not designed; the `angular.json` budget values (open decision) with their reasons; the test
  approach (fixtures, InMemory, no sleeping); CI scope. Update the designs' `<TO SUPPLY>` markers these settle.
- Create `docs/detailed-journeys.md`: for each of the 12 journeys in `docs/journeys.md`, its slices (take them
  from the designs), effort and **% complete**.
- Create `docs/lessons-learned.md` with its structure and this journey's entry (filled in at the end).

## Phase 3: Incremental implementation (`angular-new-app`, `implementing-incrementally`, `angular-developer`, test-first)
- Plan thin vertical slices. A suggestion you may adjust:
  1. Frontend workspace, libraries and lint boundaries; the first behaviour spec, "the home page shows the
     christian.rent wordmark", written first and seen to fail, then the minimal shell that passes it.
  2. Foundations: tokens, self-hosted fonts, reset; `cr-logo`, `cr-site-header`, `cr-skip-link` matching the
     brand mock and the Browse header, light and dark, phone to desktop.
  3. `NotFoundPage` for an unknown address and the `TitleStrategy`.
  4. `LoadState<T>`, `GlobalErrorHandler`, `ApiError` and `apiErrorInterceptor`, with unit tests.
  5. Backend solution, health endpoint and the first acceptance test through the API on EF Core InMemory.
  6. Fallback policy: a protected test endpoint answers 401 ProblemDetails `not_signed_in`; ProblemDetails for
     validation (`ValidationBehavior`) and unhandled errors.
  7. Security headers: HTTPS redirect, HSTS, CSP; cross-site write refused.
  8. Rate limits: the 121st read and the 31st write in a minute answer 429 with Retry-After (advance
     `FakeTimeProvider`, never sleep).
  9. Telemetry through `TelemetryScrubber`: a test proves a query string, body and token never reach a span or
     log.
  10. `ChristianRent.Cli migrate` and `seed` (idempotent: seeding twice changes nothing).
  11. `tools/verify/verify.mjs`, the CI workflow, and the README's commands made true.
- For each slice:
  - Write the Given-When-Then criteria, citing the L2 criteria they prove.
  - Write the acceptance test first (backend through the API; frontend in Playwright with page objects and
    fixtures). Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, with unit tests for helpers with many cases. Refactor while green.
  - Run the regression checks, then commit the slice with an imperative subject.
- Never write architecture tests; ESLint, not tests, enforces the boundaries.

## Phase 4: Docs, lessons learned and progress
- Update `README.md` ("Getting started", "Build and test", "Repository structure") and document every setting
  a deployed system needs (connection string, file storage, sign-in secret, telemetry endpoint) in the same
  change, with no secret in the repo.
- Add this journey's entry to `docs/lessons-learned.md` and set its **% complete** in
  `docs/detailed-journeys.md` and `docs/journeys.md`, updating the Total row.
- Make sure the designs in `docs/detailed-designs/platform/` agree with what was built.

## Done means
- `cd frontend && npm ci && npm start` serves the shell at http://localhost:4200 with the christian.rent
  wordmark, skip link and not-found page, matching the mocks from phone to desktop, light and dark.
- `cd backend && dotnet run --project src/ChristianRent.Api` starts the API; the health endpoint answers; a
  protected endpoint answers 401 ProblemDetails; HSTS, CSP, cross-site refusal and rate limits are proven by
  acceptance tests; `ChristianRent.Cli migrate` and `seed` work.
- Every command in the README's "Build and test" table works, and `node tools/verify/verify.mjs` passes.
- CI runs lint, builds and one acceptance path, green, in under 5 minutes.
- `docs/adr/`, `docs/detailed-journeys.md` and `docs/lessons-learned.md` exist and agree with the code.
- The work is on a branch with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`. Fetch and rebase
  onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
