# Lessons learned

What each slice of [`detailed-journeys.md`](detailed-journeys.md) taught. Read this before
starting a slice and apply the lessons that fit (`AGENTS.md`, *Lessons learned and progress*).

Each journey's entry has three parts:

- **What slowed it**: what took longer than it should have, and why.
- **New lessons**: what the next slice should do differently, each numbered `L<n>` so later
  entries can refer to it.
- **Earlier lessons applied**: for each earlier lesson the journey used, how it worked.

## Index of lessons

| # | Lesson | From |
|---|---|---|
| L1 | Fetch `main` and branch from it before the first change, then re-read the designs and requirements the slice touches: they move between sessions. | 1 |
| L2 | Before building a slice, check that every UI state its design names has a mock and a criterion; when one is missing, add the criterion, then the mock, then the design, before any code. | 1 |
| L3 | Prove a test is not vacuous by removing the code it is meant to prove and watching it fail. | 1 |
| L4 | Read the test summary's counts before committing; a commit follows a green run, never a run that was not read. | 1 |
| L5 | OpenTelemetry span listeners are process-wide: telemetry tests run in their own non-parallel xUnit collection, and await a span through a processor with a timeout that names what did arrive, because a server span can end after the response. | 1 |
| L6 | In the shared container, MSBuild node reuse and leftover dev servers exhaust memory: set `MSBUILDDISABLENODEREUSE=1` (verify.mjs and CI do) and stop any `ng serve` or API you start. | 1 |
| L7 | Pin `@playwright/test` to the version of the installed browser, and override `playwright-core` so that tools such as `@axe-core/playwright` use the same one. | 1 |
| L8 | Before building a screen, map every design-system block it renders to a component in `@rent/components`, built to its full design-system spec (variants, sizes, states), and compose the page from those; a page that writes a design-system class itself is not done. | 1 |
| L9 | When a screen starts calling the API, every existing spec that opens it needs a fixture answer: add a helper (such as `answerNoListings`) and use it in those specs in the same change. | 2 |
| L10 | Page objects match accessible names exactly (`exact: true`) wherever names share a prefix ("Listing 1", "Listing 10"). | 2 |
| L11 | Before raising a bundle budget, build with `--stats-json` at the change and at the last commit and compare the initial chunk's inputs; say in an ADR what grew and why. | 2 |
| L12 | A presentation component that shows formatted data takes a view type from `@rent/api`; the formatting is a `@rent/domain` helper with a test per case, because `components` cannot import `domain`. | 2 |
| L13 | The visual, responsive, accessibility and heap sweeps are written, type-checked and linted with each journey, and never run by an agent. | 2 |

## Journeys

### 1. Scaffolding

Slices 1.1 to 1.11, finished on Nov 26, 2026.

**What slowed it**

- The container had no .NET SDK, and Microsoft's download hosts were not reachable; Ubuntu's
  `dotnet-sdk-10.0` package from the package mirror worked.
- The first attempt started on a branch cut before `main` had moved, and created the workspace
  before the ADRs, out of the prompt's order. It was thrown away, and the branch restarted from
  the new `main`, which had added L2-036 (the header) and changed the platform designs (L1).
- The fail-clearly design named a generic error toast that had no requirement and no mock.
  L2-033 criterion 7, `docs/mocks/notifications/error-toast/default.html` and the design came
  first (L2).
- `ng add angular-eslint` writes no configuration for a workspace with several projects; the
  flat config, with `eslint-plugin-boundaries`, was written by hand, and each rule was proved to
  fire by adding a deliberate violation (L3).
- The .NET 10 SDK refuses VSTest for xUnit v3: `backend/global.json` opts into the Microsoft
  Testing Platform, and the CI filter is `--filter-trait`.
- The telemetry tests raced the other test classes and the end of the server span; one commit
  was made on a run with two failures before the counts were read, and was corrected before
  anything was pushed (L4, L5).
- Memory ran out once while builds, a dev server and the tests shared the container (L6).

**New lessons**: L1 to L7 above, and these details for later backend slices:

- ASP.NET Core's ProblemDetails writer replaces a `traceId` extension with the full W3C
  `traceparent`; `CustomizeProblemDetails` sets it, once, for every ProblemDetails.
- HTTPS redirection does nothing without the `https_port` setting, and HSTS skips `localhost`:
  tests use a real host name.
- A product endpoint is not needed to prove a cross-cut: the acceptance tests add a test-only
  probe controller to the API, so nothing test-shaped ships.

**Earlier lessons applied**: none; this is the first journey.

**Follow-up review**: the first pass hand-coded the "not found" page's plain-page block, Browse's
headline and the toast region in `rent`, gave `cr-button` 3 of its 10 variants, and drew icons
as inline SVG (two of the toast's from outside the set, and the error-toast mock too). Each became a
component in `@rent/components` with its own tests, and the pages now compose them (L8). L4
slipped once more in that pass: a commit followed a lint failure in a test-only host component,
and was amended before anything was pushed. Since then every commit follows a green
`verify.mjs`.

### 2. Browse listings

Slices 2.1 to 2.5, finished on Nov 26, 2026.

**What slowed it**

- The container again had no .NET SDK; Ubuntu's `dotnet-sdk-10.0` package installed it at once,
  as journey 1 found. PlantUML and Graphviz came from the same mirror to re-render the class
  diagram.
- The design named `formatPrice` in `domain` and the card in `components`, which may not import
  `domain`. The card now takes a `ListingCardView` from `api`, and `toListingCardView` in
  `domain` writes every word (L12).
- Once Browse fetched `/api/listings`, nine existing specs failed on an unanswered request
  (L9).
- The window's spec failed on "Listing 1" matching "Listing 10" to "Listing 19" (L10).
- The initial bundle passed its warning budget although Browse's code is lazy: the Angular
  runtime it uses (`@for`, `afterNextRender`, `effect`, `NgOptimizedImage`) joins `main`. A
  comparison of the build stats with the last commit showed it, and ADR 0014 sets the new
  values (L11).
- An attempt to run the heap and responsive sweeps after changing them was refused; the
  sweeps are only type-checked and linted (L13).
- In slice 2.3 the `BrowseStore` unit tests were written just after its first code
  rather than before it; its acceptance spec had been seen to fail first.

**New lessons**: L9 to L13 above, and these details for later slices:

- A keyset over `(ApprovedAt, Id)` with `Guid.CompareTo` is consistent within each provider:
  InMemory compares as .NET does, PostgreSQL as `uuid` does; nothing compares across them.
- A FluentValidation rule's own snake_case `WithErrorCode` becomes the ProblemDetails `code`
  when every failure shares it; otherwise the code stays `validation_failed`.
- A spacer of a released page keeps the scroll position only if pages fill whole rows: 24 is a
  multiple of 1, 2, 3 and 4 columns. A change of page size or columns must keep that.
- Re-observing a sentinel (`disconnect` and `observe`) after a page is drawn makes the observer
  report whether it is still in reach, so a tall screen keeps loading without a scroll event.

**Earlier lessons applied**

- L1: `main` was fetched first and had not moved; the branch started from it.
- L2: all seven Browse mocks existed. The one gap was the distance in criterion 9, which no
  screen can measure yet; the criterion, ADR 0012 and the design say so before any code.
- L3: the exclusion of a waiting listing, the four-column rule, "Free" and the posting choice
  were each removed and their tests seen to fail; the edge and posting specs passed on their
  first run because slice 2.2 had built the components to their full spec.
- L4: every commit followed a green `verify.mjs` whose counts were read.
- L6: `MSBUILDDISABLENODEREUSE=1` held, and no dev server or API was left running; memory never
  ran out.
- L8: Browse composes `cr-tag`, `cr-listing-grid`, `cr-skeleton`, `cr-spinner`,
  `cr-empty-state` and `cr-feed-status`, each new with its own tests, beside `cr-listing-card`.

