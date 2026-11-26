# 0014. The angular.json budget values after Browse

**Status:** Accepted; its values are superseded by [0020](0020-bundle-budgets-after-post.md).
Supersedes the values of [0006](0006-bundle-budgets.md); its rules stand.

## Context

ADR 0006 set the initial budget just above the shell's first build (280.5 kB raw, then 285.1 kB
after the scaffold's follow-up), as errors at 320 kB and warnings at 300 kB, and expected Browse
(journey 2) to raise it "by about its own size", stating the new value and why.

Browse's own code is a lazy chunk (`browse-routes`, 29.8 kB raw, 7.9 kB transferred): the page,
`BrowseStore`, `ListingWindow`, the formatters, `HttpListingsApi` and the card components. What
grew the initial chunk is the part of Angular that this chunk uses and that lives in modules the
shell already loads: the runtime instructions for `@for`, `@switch`, templates and host style
bindings, `afterNextRender`, `effect` and `viewChild`, `NgTemplateOutlet` and `NgOptimizedImage`
from `@angular/common`. The bundler keeps a module in one chunk, so these join `main` rather than
the lazy chunk. Browse is the screen every visit opens first, so this code is downloaded for the
first paint either way.

## Decision

The production build with Browse measures 309.7 kB raw (82.3 kB transferred) for all initial
chunks. The budgets are set just above it, as before:

| Budget | Warning | Error |
|---|---|---|
| `initial` (raw, all initial chunks) | 315 kB | 330 kB |
| `anyComponentStyle` | 4 kB | 8 kB |

## Consequences

- Listing, Post and Admin still load lazily (L2-029, criterion 2); a journey that moves code into
  the initial chunk states the new value and why, as this record does.
- The budgets are tightened whenever a build shows room.
