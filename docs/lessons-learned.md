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
| L14 | A change of the query alone is the same screen: what the shell does on navigation (moving focus, announcing the title) compares paths, not whole addresses. | 3 |
| L15 | A field mirrored in the address is written from the address only while it does not have focus, so a late navigation never overwrites what is being typed. | 3 |
| L16 | Before relying on Unicode text rules in the backend (normalisation, casing beyond ASCII), check `InvariantGlobalization`; test with accented text on both sides. | 3 |
| L17 | When a feature prompt and the requirements disagree, the requirements and the detailed journeys win; the same change brings the prompt in line. | 3 |
| L18 | A fixture that answers as the backend would (`answerListings` narrows by `show`, `kind` and `q`) lets each spec state one behaviour; the matching rule itself is proved once, on the backend. | 3 |

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

### 3. Search and filter listings

Slices 3.1 to 3.4, finished on Nov 26, 2026.

**What slowed it**

- The feature prompt still deferred the Spaces and Things filter for want of a requirement, but
  L2-035 had been added since, and the detailed journeys listed slice 3.3. The filter was
  built, and the prompt now says so (L17). Whether its choice is kept in the address was
  settled by ADR 0015 (it is), with a new criterion (L2-035, criterion 5) and a mock of it
  pressed on Spaces (L2).
- The backend built with `InvariantGlobalization`, so `string.Normalize` left accents in place;
  the accent tests failed for that reason, not for the matching. ICU is on now, and the README
  says a host needs `libicu` (L16).
- Typing in the search bar kept only the first character: `PageFocus` moved focus to the
  heading after every navigation, a change of the query included, and `RentTitleStrategy`
  would have announced the title at each keystroke. Both now act on a change of path only, and
  the shell's design says so (L14). Writing the address's term back into the field could
  overwrite what was being typed; `cr-search-bar` writes it only while the field is not in use
  (L15).
- The container has no PostgreSQL. The migration's SQL (the column, its backfill through
  `unaccent`, the `pg_trgm` index) was read from `dotnet ef migrations script`, not run; the
  tests run on InMemory, as ADR 0007 says.
- The unit tests of `BrowseQuery`, `formatCount`, `cr-segmented` and `cr-search-bar` were
  written in the same step as their code and passed at once, so they were not seen to fail
  first; each slice's acceptance spec was. The store's tests and `cr-kind-filter`'s were seen
  to fail before their code.
- CI's backend job failed on `dotnet format`: its SDK (10.0.404, by `rollForward:
  latestFeature`) reports an unused `using System.Diagnostics;` in `TelemetryTests.cs` that the
  container's SDK (10.0.115) does not. It had turned `main` red since journey 2's merge; this
  journey removed it. A green local `verify.mjs` does not prove CI's analyzers agree when the
  SDKs differ, so read CI's result before calling a journey done.
- `check_mocks.py` reports four errors for `error-toast`, which has no info, success, warning
  or danger state; they come from journey 1's mock and were left for that screen's owner.

**New lessons**: L14 to L18 above, and these details for later slices:

- An address the router reads with `toSignal(queryParamMap)` and a store that ignores a query
  equal to the one it shows make the address the single source of a screen's choice without
  feedback loops: a submission calls the store first and then writes the address.
- A debounced search aborts the request in flight as soon as the query changes, not when the
  wait ends, so no stale answer arrives during the wait.
- The trimmed term is what the request sends and what the screen names; the term as typed is
  what the field and the address keep, so a trailing space is never taken away while typing.

**Earlier lessons applied**

- L1: `main` was fetched first and had not moved; the requirements and designs were re-read,
  which showed L2-035 (see above).
- L2: every state the design names had a mock but Spaces pressed; `spaces.html` was drawn and
  added to the manifest before any code.
- L3: dropping `show` and then `kind` from the request made the switch's and the kind filter's
  specs fail; the store's tests failed on a missing `search` before it was written.
- L4: every commit followed a green `verify.mjs` whose counts were read (126 backend tests,
  50 behaviour specs at the end).
- L6: `MSBUILDDISABLENODEREUSE=1` held, and no dev server or API was left running.
- L8: Browse composes three new components, `cr-search-bar`, `cr-segmented` and
  `cr-kind-filter`, each with its own tests, and `cr-empty-state` for no results.
- L9: the existing specs answer `/api/listings` by path, so the new query parameters needed no
  new fixtures there; `answerListings` serves the new specs (L18).
- L10: the page objects name the switch's options by a pattern anchored at the start, and the
  kind filter's and the search bar's controls with `exact: true`.
- L11: the initial bundle grew from 309.7 kB to 313.0 kB, within ADR 0014's 315 kB warning,
  so no budget was raised and the stats were not compared. With 2 kB left, the next journey
  that grows it should compare them first.
- L12: the switch's counts are formatted by `formatCount` in `domain` and reach
  `cr-segmented` as text.
- L13: the sweeps visit the for-rent, wanted, spaces and no-results states, and a heap check
  searches and switches again and again; none was run.
