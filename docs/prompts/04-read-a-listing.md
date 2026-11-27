# Feature: Read a listing

Journey 4 of `docs/journeys.md` (Main): Open a listing: photos, description, poster, church and verified marks.

## Goal

Anyone opens an approved listing at `/listings/:id` from a Browse card and sees its photos, title, price in
CAD, when it is available, roughly where it is, its description, and who posted it with their church, each
marked when verified. A wanted listing shows no photo. An address with no approved listing behind it shows
the not-found state and reveals nothing. Today a Browse card links to `/listings/:id`, which falls through to
the shell's not-found page. Browse and the shell stay as they are.

### In scope

- `GET /api/listings/{id}` (anonymous): an approved listing only; a pending, removed or unknown id answers 404 with the same body, revealing nothing.
- `ListingPage` (lazy) with `cr-gallery` (photos from journey 2's photo endpoint), `cr-poster` with `cr-verified` for the member and the church, `cr-tag`, and the wanted variant.
- The loading, error and not-found states; the tablet-and-desktop layout that keeps the right column for the message box.
- The page title through the `TitleStrategy` from journey 1, with the listing's title as text.

### Deferred (not in this run)

- The message box, its states (`invalid`, `submitting`, `sent`, `failed`, `limited`) and the `own` state: journey 8.
- The Report button and dialog: journey 9.
- Setting a verified mark: journey 12 (this journey only shows the marks the API returns).
- Editing or taking down one's own listing: "My listings" is not designed.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: requirements, mocks, detailed design and ADRs, test-first implementation, lessons learned, green tests and a PR. Go through
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
  - **Scope.** christian.rent is two applications: `rent` (Browse, Listing, Post, Sign in) and `admin`
    (Admin, Admin sign-in), on two origins, using one backend (ADR 0028). No payment, booking calendar,
    reviews, ratings, social feed or adverts. A Messages inbox, "My listings", sign-up and password reset
    are not designed; build none of them. Do not invent the L0 mission.
  - **The mocks are the source of truth** (`docs/mocks/`, listed in `docs/mocks/manifest.json`). When a mock
    changes, bring the requirement (`docs/specs/L2.md`), the ADR it touches and the detailed design in line,
    in that order, before any code. Keep the mocks' BEM classes; e2e locators depend on them.
  - **Words.** listing, for rent, wanted, space, thing, member, church, verified, message, review queue,
    report. No synonyms in code, docs or UI. The wordmark is lowercase **christian.rent** with ".rent" in
    orange. Prices in CAD, distances in km, Canadian spelling.
  - **Frontend** (`frontend/`, run npm from there): libraries `api`, `domain`, `components` and `shell`, and
    the applications `rent` and `admin` (no application imports the other), libraries imported as `@rent/<library>`; the dependency direction in
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
    browsing, reading an approved listing, and signing in and out (and any exception an ADR states). Admin's
    endpoints are under `/api/admin/` and accept only the Admin session (ADR 0029). Errors are ProblemDetails
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
- Read `docs/lessons-learned.md` and apply the lessons that fit. Read this journey's row in `docs/journeys.md`
  and its slices in `docs/detailed-journeys.md`.
- Read every ADR in `docs/adr/` that covers the areas below.
- Read the code earlier journeys left in `frontend/` and `backend/`, and reuse it. This journey depends on:
  journeys 1 and 2.
- Fetch and rebase onto `main` first; another session may have pushed to it.

## Phase 2: Requirements (`engineering-requirements`)
- The requirements are in `docs/specs/L2.md`: `L2-007`, `L2-008`, `L2-014`, `L2-022`, `L2-024`, `L2-025`, `L2-031`, `L2-033`. They refine `L1-002`, `L1-004`, `L1-006`, `L1-009`, `L1-010`, `L1-011`, `L1-013` and `L1-015` in `docs/specs/L1.md`.
- Read their acceptance criteria. If anything you learn below shows a criterion is wrong, missing or
  ambiguous, fix it here first, keeping the house style and the numbering. Add no new behaviour beyond this
  journey.

## Phase 3: Mocks and design system (`writing-html-mocks`, `extracting-design-systems`)
- The mocks for this journey are:
  - `docs/mocks/pages/listing/default.html`
  - `docs/mocks/pages/listing/wanted.html`
  - `docs/mocks/pages/listing/unverified.html`
  - `docs/mocks/pages/listing/loading.html`
  - `docs/mocks/pages/listing/error.html`
  - `docs/mocks/pages/listing/not-found.html`
  - `docs/mocks/pages/listing/edge.html` (one photo, long words, no note; ADR 0016)
- Check each state you will build exists and is complete (light and dark, phone to desktop, keyboard focus,
  real copy). If a state the design or the criteria need is missing, draw it before any code, add it to
  `docs/mocks/manifest.json`, and note any departure from the prototype in `docs/mocks/README.md`.
- The components this journey uses are documented in `docs/design-system/components/`: `gallery.html`, `poster.html`, `verified.html`, `tag.html`, `skeleton.html`, `alert.html`, `layout.html`. If a mock
  changed, update the design system pages and tokens to match.

## Phase 4: Detailed design and ADRs (`writing-software-design-documents`)
- The design is [`docs/detailed-designs/listing/read-listing/README.md`](../detailed-designs/listing/read-listing/README.md). Follow it; it names the types, endpoints, tokens and files.
- Resolve every `<TO SUPPLY>` this journey needs, choosing the simplest option that fits, and record each
  decision as an ADR in `docs/adr/` (numbered, in the house style of the existing ADRs) and in the design.
  For this journey these are:
  - How "roughly where it is" is shown without a distance (area name only, while distance is open).
  - What a gallery with one photo and with none looks like, if the design leaves it open (follow the mocks).
- Re-render any diagram you change (`python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs`)
  and commit the `.png` with its `.puml`.

## Phase 5: Incremental implementation (`implementing-incrementally`, `angular-developer`, test-first)
- Plan thin vertical slices. A suggestion you may adjust:
  1. Backend: `GET /api/listings/{id}` returns an approved listing with its poster, church, verified flags and photos.
  2. Backend: pending, removed and unknown ids answer the same 404 ProblemDetails (`code` per the design).
  3. Frontend: default state from a fixture, with photos, price in CAD, dates, area, description as text, poster and church.
  4. Frontend: verified marks shown for a verified member and church, and only the member when the church is not (unverified mock); the mark carries text, not colour alone.
  5. Frontend: wanted variant with no photo.
  6. Frontend: loading, error ("Try again") and not-found states; the request is aborted on leave.
- For each slice:
  - Write the Given-When-Then criteria, citing the L2 criteria they prove.
  - Write the acceptance test first: backend through the API (`WebApplicationFactory`, EF Core InMemory);
    frontend in Playwright with a page object per screen or dialog and fixtures that answer the API.
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, with unit tests for any store, validator or helper with many
    cases. Refactor while the tests are green.
  - Run the regression checks (`node tools/verify/verify.mjs`), then commit the slice with an imperative
    subject.
- Add this journey's one critical acceptance path to CI, keeping the pipeline under 5 minutes.
- Check the initial bundle stays within the `angular.json` budgets; a raised budget needs a reason in the
  change.

## Phase 6: Lessons learned and progress
- Add this journey's entry to `docs/lessons-learned.md`: what slowed it, new lessons, and how each earlier
  lesson it applied worked.
- Set **% complete** for this journey to its true value in `docs/detailed-journeys.md` and
  `docs/journeys.md`, and update the Total row.
- Make sure requirement, mock, design system, design, ADRs, tests and code agree with what was built.

## Done means
- Opening an approved listing shows it as the default, wanted and unverified mocks draw it, on a phone and a desktop.
- Any other id shows the not-found state, and the API reveals nothing about it.
- Loading and error states match their mocks; leaving releases the request and state.
- All the new and existing tests pass: `node tools/verify/verify.mjs` (format, lint, unit tests, the
  production build within budgets, `dotnet format --verify-no-changes && dotnet test`, and the behaviour
  specs).
- Docs and design artifacts agree with the code, and `docs/lessons-learned.md`, `docs/detailed-journeys.md`
  and `docs/journeys.md` are updated.
- The work is on a branch with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md` (summary, the
  L2 requirements it satisfies, type of change, checklist, how it was tested). Fetch and rebase onto `main`
  first, because another session may have pushed to it. CI is green.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
