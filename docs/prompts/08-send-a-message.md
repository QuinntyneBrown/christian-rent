# Feature: Send a message

Journey 8 of `docs/journeys.md` (Main): Message the person who posted, with dates when for rent.

## Goal

On the Listing screen, a member writes a message of 1 to 1,000 characters to the person who posted, with
optional start and end dates when the listing is for rent, and sends it. A confirmation replaces the message box. A
non-member is asked to join and keeps their message and dates. A failed send keeps them too. A member's own
listing shows no message box. The message is private to the two people. Today the Listing screen (journey 4)
shows the listing with no message box.

### In scope

- `POST /api/listings/{listingId}/messages`: member only; refuses a hidden or removed listing, the listing's own poster (`own_listing`) and a sender over the limit (429 and the limited state); stored so that only the two members may read it.
- `cr-message-box` (presentation) and `MessageComposer` (owns the draft and the request) on the Listing screen, to the right of the listing from tablet up.
- The invalid, submitting, sent, failed, limited and own states; `MemberGate` before sending.

### Deferred (not in this run)

- Where the person who posted reads and answers messages: the Messages inbox is not designed. Build no inbox and no notification; record in the ADR how the message is held until it is designed.

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
  journeys 1 to 5.
- Fetch and rebase onto `main` first; another session may have pushed to it.

## Phase 2: Requirements (`engineering-requirements`)
- The requirements are in `docs/specs/L2.md`: `L2-015`, `L2-016`, `L2-024`, `L2-025`, `L2-026`. They refine `L1-005`, `L1-010` and `L1-011` in `docs/specs/L1.md`.
- Read their acceptance criteria. If anything you learn below shows a criterion is wrong, missing or
  ambiguous, fix it here first, keeping the house style and the numbering. Add no new behaviour beyond this
  journey.

## Phase 3: Mocks and design system (`writing-html-mocks`, `extracting-design-systems`)
- The mocks for this journey are:
  - `docs/mocks/pages/listing/default.html`
  - `docs/mocks/pages/listing/wanted.html`
  - `docs/mocks/pages/listing/no-price.html`
  - `docs/mocks/pages/listing/own.html`
  - `docs/mocks/pages/listing/invalid.html`
  - `docs/mocks/pages/listing/submitting.html`
  - `docs/mocks/pages/listing/sent.html`
  - `docs/mocks/pages/listing/failed.html`
  - `docs/mocks/pages/listing/limited.html`
  - `docs/mocks/dialogs/join/default.html`
- Check each state you will build exists and is complete (light and dark, phone to desktop, keyboard focus,
  real copy). If a state the design or the criteria need is missing, draw it before any code, add it to
  `docs/mocks/manifest.json`, and note any departure from the prototype in `docs/mocks/README.md`.
- The components this journey uses are documented in `docs/design-system/components/`: `message-box.html`, `date-range.html`, `textarea.html`, `confirmation.html`, `alert.html`, `button.html`. If a mock
  changed, update the design system pages and tokens to match.

## Phase 4: Detailed design and ADRs (`writing-software-design-documents`)
- The design is [`docs/detailed-designs/messages/send-message/README.md`](../detailed-designs/messages/send-message/README.md). Follow it; it names the types, endpoints, tokens and files.
- Resolve every `<TO SUPPLY>` this journey needs, choosing the simplest option that fits, and record each
  decision as an ADR in `docs/adr/` (numbered, in the house style of the existing ADRs) and in the design.
  For this journey these are:
  - How a message reaches the person who posted while the Messages inbox is not designed (it is stored and delivered to that person only; nothing is sent elsewhere).
  - The per-member message limit, if the design leaves it open.
  ADR 0022 records these and the other points the design left open.
- Re-render any diagram you change (`python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs`)
  and commit the `.png` with its `.puml`.

## Phase 5: Incremental implementation (`implementing-incrementally`, `angular-developer`, test-first)
- Plan thin vertical slices. A suggestion you may adjust:
  1. Backend: a member sends a message about an approved listing; it is stored for the two people only.
  2. Backend: validation (1 to 1,000 characters; dates optional for a listing for rent, both or neither, in order and not in the past; none for wanted), one test per row.
  3. Backend: refusals: non-member, own listing (`own_listing`), hidden or removed listing (revealing nothing), over the limit (429 with Retry-After).
  4. Frontend: send from the default state; submitting then sent; the wanted variant has no dates.
  5. Frontend: invalid, failed and limited states keep the text and dates.
  6. Frontend: own state shows no message box (needs `SESSION` from journey 5).
  7. Frontend: a non-member is asked to join and the message and dates are kept.
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
- A member messages the person who posted, with dates when for rent, and sees the confirmation, as the listing mocks draw it.
- No message text appears in telemetry; only the two members may read it.
- Own listing, invalid, failed and limited states match their mocks, and nothing a member wrote is lost.
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
