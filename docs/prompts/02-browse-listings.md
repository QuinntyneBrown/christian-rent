# Feature: Browse listings

Journey 2 of `docs/journeys.md` (Main): See approved listings on the home screen, loading more on scroll.

## Goal

Anyone, member or not, opens christian.rent at `/` and sees the approved listings, newest first. A listing for
rent shows as a card with its first photo, title, price in CAD and area; a wanted listing shows as a card with
no photo, labelled "Wanted" in text. More listings load as the person scrolls, and the list stays bounded in
memory however far they go. Two buttons, "I have something to rent" and "I'm looking for something", lead
straight to Post. Today the route `/` renders only the shell built by journey 1; the backend has no listings.
The header, the not-found page and the platform cross-cuts stay as journey 1 left them.

### In scope

- `GET /api/listings` (anonymous): approved listings only, newest first, keyset-paged, with the fields the design names.
- The `Listing`, `ListingPhoto` and `Church`/`Member` data Browse reads, their EF Core configuration and migration, and idempotent seed data from the prototype's cast (Langley and the Fraser Valley) via `ChristianRent.Cli seed`.
- Serving a photo from storage, `GET /api/photos/{id}/{rendition}` (anonymous for an approved listing's photo), behind a file-storage abstraction; uploading is journey 7.
- `BrowsePage` (lazy) with `cr-listing-card` (for rent and `listing-card--wanted`), the photo placeholder, loading skeletons, empty, error, more-loading, more-error and edge states.
- A windowed buffer (`ListingWindow` in the design) that keeps a fixed number of pages in memory, an `AbortController` per request, and photos through `NgOptimizedImage` sized to the card, lazy below the fold.
- The two posting buttons (L2-005), which navigate to `/post` with the choice in the address. Post itself is journey 6.

### Deferred (not in this run)

- The search bar, the Everything / For rent / Wanted switch and the no-results offer: journey 3.
- Opening a listing: journey 4 (a card links to `/listings/:id`).
- The Spaces / Things filter and distance from the person's area: open decisions in `docs/detailed-designs/README.md`.

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
- Read `docs/lessons-learned.md` and apply the lessons that fit. Read this journey's row in `docs/journeys.md`
  and its slices in `docs/detailed-journeys.md`.
- Read every ADR in `docs/adr/` that covers the areas below.
- Read the code earlier journeys left in `frontend/` and `backend/`, and reuse it. This journey depends on:
  journey 1 (Scaffolding).
- Fetch and rebase onto `main` first; another session may have pushed to it.

## Phase 2: Requirements (`engineering-requirements`)
- The requirements are in `docs/specs/L2.md`: `L2-001`, `L2-005`, `L2-006`, `L2-022`, `L2-029`, `L2-030`, `L2-031`, `L2-033`. They refine `L1-001`, `L1-009`, `L1-012`, `L1-013` and `L1-015` in `docs/specs/L1.md`.
- Read their acceptance criteria. If anything you learn below shows a criterion is wrong, missing or
  ambiguous, fix it here first, keeping the house style and the numbering. Add no new behaviour beyond this
  journey.

## Phase 3: Mocks and design system (`writing-html-mocks`, `extracting-design-systems`)
- The mocks for this journey are:
  - `docs/mocks/pages/browse/default.html`
  - `docs/mocks/pages/browse/loading.html`
  - `docs/mocks/pages/browse/empty.html`
  - `docs/mocks/pages/browse/error.html`
  - `docs/mocks/pages/browse/more-loading.html`
  - `docs/mocks/pages/browse/more-error.html`
  - `docs/mocks/pages/browse/edge.html`
- Check each state you will build exists and is complete (light and dark, phone to desktop, keyboard focus,
  real copy). If a state the design or the criteria need is missing, draw it before any code, add it to
  `docs/mocks/manifest.json`, and note any departure from the prototype in `docs/mocks/README.md`.
- The components this journey uses are documented in `docs/design-system/components/`: `hero.html`, `listing-card.html`, `skeleton.html`, `empty-state.html`, `alert.html`, `button.html`, `site-header.html`, `layout.html`. If a mock
  changed, update the design system pages and tokens to match.

## Phase 4: Detailed design and ADRs (`writing-software-design-documents`)
- The design is [`docs/detailed-designs/browse/browse-listings/README.md`](../detailed-designs/browse/browse-listings/README.md). Follow it; it names the types, endpoints, tokens and files.
- Resolve every `<TO SUPPLY>` this journey needs, choosing the simplest option that fits, and record each
  decision as an ADR in `docs/adr/` (numbered, in the house style of the existing ADRs) and in the design.
  For this journey these are:
  - The file storage product for photos and how a rendition is produced (local disk in development and tests is fine).
  - How a listing's area is stored and shown without a distance (distance is an open decision; show the area name only).
  - The page size and the number of pages the window keeps, if the design leaves them open.
- Re-render any diagram you change (`python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs`)
  and commit the `.png` with its `.puml`.

## Phase 5: Incremental implementation (`implementing-incrementally`, `angular-developer`, test-first)
- Plan thin vertical slices. A suggestion you may adjust:
  1. Backend: `GET /api/listings` returns the first page of approved listings, newest first, and never a pending or removed one (acceptance test through the API).
  2. Backend: keyset paging with a cursor; validation of the page parameters; the 120-per-minute read limit still applies.
  3. Backend: photo rendition served from storage, never from the database; a non-approved listing's photo is not served.
  4. Frontend: Browse default state renders cards from a fixture: for-rent card with photo, wanted card with no photo and "Wanted" text, CAD price formatting.
  5. Frontend: loading, empty and error states, with "Try again".
  6. Frontend: load more on scroll (`IntersectionObserver`), more-loading and more-error states, bounded window, requests aborted on leave.
  7. Frontend: edge state (long titles, no photo, no price) with member-written text rendered as text.
  8. Frontend: the two posting buttons navigate to `/post` with the choice in the address.
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
- A person who is not signed in opens `/` and sees approved listings, newest first, as the mocks draw them, on a phone and a desktop.
- Scrolling loads more listings; the list never holds more than the window's pages; leaving Browse releases its requests, observers and state.
- A pending or removed listing never appears and its photo is never served.
- Loading, empty, error, more-loading, more-error and edge states match their mocks.
- The posting buttons lead to `/post` with the choice kept.
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
