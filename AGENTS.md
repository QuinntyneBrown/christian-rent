## Purpose

> christian.rent is where Christians post spaces and things for rent, or ask for a space or a
> thing to rent. It is narrow on purpose: browse, open a listing, message the person who posted
> it, or post your own. No payment happens here; people agree the details together.

**Direction.** christian.rent is two applications: `rent`, the site where people browse, post
and message, and `admin`, where admins work through the review queue. Each has its own sign-in
page. Together they are six screens, and they stay that small:

1. **Browse**: the home screen. A search bar, a switch between Everything, For rent and Wanted,
   and two buttons that lead straight to posting: "I have something to rent" and "I'm looking
   for something". A listing for rent shows its photo; a Wanted request shows as a card with no
   photo. A search that finds nothing offers to post a request for it.
2. **Listing**: one listing, with its photos and description, and the person who posted it and
   their church, each marked when verified. A message box sends a message to that person, with
   dates when the listing is for rent, and confirms once it is sent.
3. **Post**: one sentence, "I have / need a space / a thing to rent out", whose highlighted
   words switch. Then a few fields (title, price, when, photos and a note) with a live preview of
   the card beside them, and a confirmation once the post is live.
4. **Sign in** (in `rent`): an email and a password, and back to where the member was, with
   what they had written kept. Browsing, searching and reading a listing need no sign-in.
5. **Admin**: the review queue for new posts, reports and new members, with a detail panel and
   Approve, Keep or Remove. It has an "All caught up" state when the queue is empty.
6. **Admin sign-in** (in `admin`): the same, clearly Admin's own. A signed-in member who is not
   an admin is told the page is for admins.

Sign-in serves posting, asking and finding: posting, messaging and reporting need a known
member, and the review queue needs a known admin. Each app keeps its own session, and both have
"Sign out". Nobody can create their own account yet: an operator creates it.

christian.rent launches in Canada: prices are in CAD, distances in km, and the copy uses
Canadian spelling.

christian.rent takes no payment, holds no booking calendar, and has no reviews or ratings, no
social feed and no adverts. A Messages inbox, a "My listings" screen, sign-up, password reset
and password change are not designed yet; none is built before its design exists. Before adding or changing anything, ask how it
serves posting something to rent, asking for it, or finding it; if it does not, do not build it,
and if a request works against it, say so.

The mission, christian.rent's single L0 requirement, is not written yet. When it is, it goes in
`docs/specs/L0.md` and this section quotes it word for word; everything then points back to it.
Do not invent a mission in its place.

## Design

The design is the **Christian Rent** prototype in Magic Patterns (the *Christian Rental
Marketplace* OS): the frames Browse, Listing, Post and Admin. It has no sign-in frame: the two
sign-in pages are drawn in `docs/mocks/` directly, from its tokens, mark and wordmark. Beside it is the *Brand* prototype
(the frame *Brand Sheet*): the mark and wordmark on white, dark and orange, at sizes down to
16 px, with the colours and the fonts. The OS's own design thread holds the decisions behind it.

The mocks in `docs/mocks/` are the design and the source of truth: every screen in every state,
with `docs/mocks/manifest.json` listing them. They are transcribed from the prototype before any
screen is built, and `docs/mocks/README.md` says where they depart from it, and why.
`docs/specs/`, the ADRs, `docs/detailed-designs/` and the code follow the mocks. When a mock
changes, the requirement, the ADR it touches and the detailed design are brought in line with it
in that order, before any code.

- **Wordmark:** lowercase **christian.rent**, with ".rent" in orange, on every screen. It is
  never "Christian Rent" or "ChristianRent" in the UI.
- **Mark:** a key whose head is a cross: the upright runs down into the key's teeth.
- **Colour:** plain white, with cool grey surfaces and hairlines; orange and blue are the
  accents. Never beige or cream.
- **Type:** Bricolage Grotesque for headlines and Instrument Sans for body text.
- **Phone:** one column. Admin shows only the queue; its detail panel and buttons appear from
  tablet width up.
- **Tablet and desktop:** Listing puts the message box to the right of the listing, Post puts
  the live preview beside the form, and Admin puts the detail panel beside the queue.

Before a screen is built or changed, its states are drawn in `docs/mocks/`. The prototype's
sample listings (Langley and the Fraser Valley, their prices and their people) are the cast, not
rules.

## Where things are

- **The frontend is what people use.** `frontend/` is an Angular workspace with two
  applications, each built and deployed on its own, on its own origin: `rent` (Browse, Listing,
  Post and Sign in) and `admin` (Admin and Admin sign-in). Each origin proxies `/api` to the one
  backend.
- **The backend holds the listings.** `backend/` is a .NET service: listings and their photos,
  search, messages between a member and the person who posted, members and their churches, and
  the admin review queue. It takes no payment.
- Before building a feature, read its requirement (`docs/specs/`, `docs/journeys.md`), its
  detailed design (`docs/detailed-designs/`) and its mocks (`docs/mocks/`, the source of truth
  for the UI; `docs/design-system/` is extracted from them).
- Read the relevant ADRs in `docs/adr/` before changing the areas they cover.
- Where a rule below names something that does not exist yet (a project, a command, a fixture,
  a helper, a folder, a document), the first change that needs it adds it. The repository starts
  with these instructions and the skills, and nothing else.
- Run npm commands from `frontend/` and `dotnet` commands from `backend/`.
  `node tools/verify/verify.mjs` runs every CI check and the unit tests locally; run it before
  pushing.

Use the words the specs use in code, docs and UI; no synonyms. What a person posts is a
"listing"; one offering something is "for rent" and one asking for something is "wanted". A
listing is for a "space" or a "thing". Someone who uses christian.rent is a "member", and a
member belongs to a "church"; a member or a church an admin has confirmed is "verified". What a
member sends about a listing is a "message". What an admin works through is the "review queue",
and a member's complaint about a listing is a "report".

## Prefer best practice

Choose the platform's established best practice (Angular, .NET, Playwright, WCAG) over the
expedient way. A departure needs an ADR giving its reason. If a rule here or in an ADR conflicts
with best practice, say so and propose the correction; do not work around it silently.

## Frontend

A multi-project workspace under `frontend/projects/`. The baseline is three libraries, `api`
(contracts, types, injection tokens, and the HTTP clients for the backend), `domain` (rules the
browser applies itself: `listings/`, `search/`, `storage/`) and `components` (presentation),
and two applications, `rent` and `admin` (ADR 0028). A fourth library, `shell`, holds the app
shell both applications share: the error handler, the title strategy, focus on navigation, the
sign-in store and the session's expiry. The foundations (tokens, `@font-face`, reset,
utilities, the fonts and the favicon) live once, in `components/foundations/` and
`components/public/`, and both applications use them.

That baseline is where the organisation starts, not a limit on it. When a concern earns its own
library (a `browser` project for browser-only implementations, and so on), add it. A smaller,
focused library that can be lazy-loaded on its own is better than one that keeps growing. A
further application needs its own ADR.

- **Dependency direction.** `rent` → `shell`, `components`, `api`, `domain`; `admin` →
  `shell`, `components`, `api`, `domain`; `shell` → `api`, `domain`; `domain` → `api`;
  `components` → `api` for types only; `api` → nothing. No application imports the other, and
  no library imports an application. Each application's `app.config.ts` is its own composition
  root and binds every token, except those a lazy route brings, which that route binds so their
  code stays out of the initial bundle. ESLint enforces it. A new library takes its place in
  this direction, and the same change adds it to this rule and to the ESLint boundaries; it
  never depends on an application, and `api` still depends on nothing.
- The backend decides what is allowed: who may post, message, approve or remove. The frontend
  shows or hides a control for convenience and never relies on that for a rule. Admin's code is
  in its own application, and its review queue loads only for a signed-in admin.
- Prettier and angular-eslint own formatting and lint; CI fails on either.
- Current Angular: standalone components, signals for state, `OnPush` everywhere, zoneless.
- **Responsive at every width.** Every screen works from the narrowest phone to the widest
  desktop, as the mocks draw it; no screen is built for one form factor and patched for the
  rest.
- **Lazy loading and memory management come first.** They outrank convenience and any other
  frontend rule they conflict with; see *Lazy loading and memory* below.
- Selectors are `cr-*`; class, file and folder names omit the prefix. Libraries are imported
  as `@rent/<library>`.
- **Presentation lives in `components`.** A presentation component takes inputs, emits outputs
  and injects no app service, token or router. Pages and dialogs that orchestrate stay in the
  app.
- **File per type.** A component is `name.ts` + `name.html` + `name.scss` with
  `templateUrl`/`styleUrl`, never inline `template`/`styles`. No inline `style` in templates.
- **One encapsulated BEM stylesheet per component.** Default encapsulation, never
  `ViewEncapsulation.None`. The component is the block, named as in the design system;
  `block__element`, `block--modifier`; a state assistive technology must know is an attribute
  (`aria-current`, `aria-invalid`, `aria-pressed`, `disabled`) and is styled through it. Never
  style another component's block. Keep the mocks' BEM classes: e2e locators depend on them.
- Global styles are foundations only (tokens, `@font-face`, reset, utilities). Read tokens by
  role, never hex. Fonts are bundled and self-hosted, never loaded from a CDN.
- **Declare each `ng-content` slot once.** A component rendering `<a>` or `<button>` by
  condition puts its slots in one `<ng-template>` rendered with `ngTemplateOutlet` in both
  branches. A consumer `@if` wrapping several `[slot=…]` nodes loses the slot (NG8011): one `@if`
  per node.
- Logic with many cases (a store, a tracker, a pure helper) lives in a service or helper with
  its unit tests, never in a component.
- Each service has a contract and an injection token in `api`; components depend on the token.
- **No inline forms.** Button-triggered editing opens a CDK Dialog or navigates to a screen.
  Never hand-roll modals.
- A contract refuses with an error whose `code` a screen branches on; the member sees a generic
  message. Names and error strings from the backend or from storage are data, rendered as text,
  never as HTML.
- **What a member writes is data.** A listing's title and note, a message and a member's or a
  church's name are rendered as text, never as HTML, wherever they appear.
- Every interaction works by touch on a phone and by keyboard on a desktop; touch targets are
  at least 44 × 44 px; colour is never the only carrier of a state.

## Backend

Clean architecture, strict dependency direction: `ChristianRent.Domain` (entities, zero deps) ←
`ChristianRent.Application` (MediatR handlers, validators, DTOs, `IAppDbContext`) ←
`ChristianRent.Infrastructure` (EF Core, migrations, auth) ← `ChristianRent.Api` (controllers).

- Business rules live in handlers and domain services. A controller or hub method checks nothing
  itself and sends one MediatR request.
- The API does not apply migrations on startup; a CLI command does. Seed data is idempotent.
- Endpoints require authentication by default (fallback policy); keep intentional
  `[AllowAnonymous]` access (browsing and reading a listing, signing in and out) explicit.
- Each application has its own cookie session (ADR 0029). Everything `admin` calls is under
  `/api/admin/` and accepts only the admin session; everything else accepts only the member
  session. Neither session lends rights to the other. A password is never stored, logged or
  committed in the clear, and an email address is a contact detail.
- Errors are ProblemDetails with a `code` extension where a client branches on them.
- Telemetry is OpenTelemetry. No log, metric or span carries a contact detail, a token, message
  text, a query string or a body; a route is recorded as its template.
- A member sees and changes only their own listings and messages. Only an admin sees the
  review queue. A listing is public only once it has been approved.
- Photos are validated (type, size, dimensions) before they are stored, and served from storage,
  never from the database.
- A setting a deployed system needs is documented in the same change.

### Backend tests

- **No real database.** Every test runs on EF Core InMemory (one store per fixture); never
  SQLite, LocalDB, SQL Server or a file. Inject database faults through `IAppDbContext`.
- **Never sleep.** Await an event with a timeout that fails naming what did arrive, or advance
  `FakeTimeProvider`; no `Task.Delay`, no `Thread.Sleep`.
- The acceptance test through the API proves each slice. A rule with a table of cases also gets a
  direct test of the domain type or handler, one case per row.

## E2E (Playwright)

- **No real backend or database, and no network beyond localhost.** API requests are answered
  by fixtures, and listing photos are served from localhost. An unanswered request, a request
  off localhost or a page error fails the spec.
- Page Object Model: one page object per screen or dialog owns the selectors. Never put a
  selector in a test. Specs import `test`/`expect` from the shared fixture.
- Only behaviour specs run by default. Visual, responsive and accessibility sweeps are written
  and kept current but run only when a person asks; no agent runs them or updates baselines
  unprompted. Update baselines only for intentional design changes, after changing the mock.
- Chromium only; never configure or run another browser. Each application's specs run against
  its own dev server, `rent`'s in `e2e/specs/rent/` and `admin`'s in `e2e/specs/admin/`.
- In unit tests, time-driven rules (retries, debounced search, a confirmation that dismisses itself) advance a fake clock; never sleep.

## CI (GitHub Actions)

- The pipeline is always green and finishes in under 5 minutes in total. A flaky or slow check is
  fixed or removed, never retried.
- It runs only the few highest-value tests per feature: lint, build and one critical acceptance
  path each. Unit tests run locally, never in CI.
- A setting a deployed system needs is documented in the same change.

## Lazy loading and memory (the top frontend priority)

Most people open christian.rent on a phone, often on a slow connection, to look for one thing.
Browse has to appear fast and stay smooth however far the list is scrolled. A change that grows
the initial bundle or leaks memory is not done, whatever else it achieves.

- **Load only what is needed now.** Every route uses `loadComponent`/`loadChildren`; heavy or
  below-the-fold UI uses `@defer`; large libraries (a map, an image cropper, a date picker), Admin's
  review queue and whole feature libraries are imported dynamically, never from the initial chunk. Keep the
  initial bundle small and the `angular.json` budgets tight; raising a budget needs a reason in
  the change.
- **Release everything you acquire.** Whatever a component, service or scene creates, it tears
  down when its owner is destroyed: subscriptions (`takeUntilDestroyed`/`DestroyRef`), timers,
  intervals and `requestAnimationFrame` loops,
  event listeners, observers, `AbortController`s, object URLs for photos being uploaded,
  and pending requests a person has navigated away from.
- **Bound what grows.** A list that can grow without end (search results, the review queue, a conversation) uses a fixed-size or windowed buffer, or is paged and dropped
  from memory. Nothing accumulates without a limit for the length of a visit.
- **Scope state to its use.** Provide services at the route or component that needs them, not
  in `root`, unless the whole app shares them. A screen's state goes when the member leaves it.
- **Prove it.** Leaving a screen returns its memory: a feature that allocates heavily
  (a long list of listings with photos, the photo upload) is checked for a stable heap across repeated enter and leave, and
  like the visual and accessibility sweeps, these heap checks run only when a person asks.

## Incremental implementation and ATDD (mandatory for product code)

Every change to user-impacting product code (the app, its libraries and the backend) needs a
requirement, a detailed design and a mock before implementation, and is built incrementally.
Mocks, designs, the design system, docs and test-only changes are exempt and get no tests.

Before writing product code, invoke and follow the `implementing-incrementally` skill, with ATDD:
plan small slices and finish one at a time. For each, write Given-When-Then criteria, write the
acceptance test (backend: through the API; frontend: Playwright with page objects), run it to
prove it fails for the expected reason, then implement only that slice, refactor green and run
the regression checks before the next. No bulk implementation, no tests added afterwards, no
weakening tests to pass. Keep requirement, design, mock, tests and code aligned throughout.

Never write architecture tests: no structure, layout, naming, banned-API or spec-traceability
tests. A test suite proves behaviour.

## Skills

The skills are in `.claude/skills/` and, as the same files, in `.agents/skills/`; a change to one
is made in both. They are used in this order as the product is built:
`engineering-requirements` (`docs/specs/`), `writing-html-mocks` (`docs/mocks/`, from the Magic
Patterns prototype), `extracting-design-systems` (`docs/design-system/`),
`writing-software-design-documents` (`docs/detailed-designs/`), `estimating-designs`,
`writing-feature-prompts`, then `angular-new-app`, `angular-developer` and
`implementing-incrementally` for the code. `grilling` stress-tests a plan and `creating-videos`
films a finished slice.

## Lessons learned and progress

Before a slice of `docs/detailed-journeys.md`, read `docs/lessons-learned.md` and apply the lessons
that fit. When the slice finishes, before it merges, add its entry there (what slowed it, new
lessons, and how each earlier lesson it applied worked) and update **% complete** in
`docs/detailed-journeys.md` and `docs/journeys.md`.
