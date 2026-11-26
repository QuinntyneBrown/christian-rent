# 0006. The angular.json budget values

**Status:** Accepted

## Context

Lazy loading and memory come first (`AGENTS.md`). Browse must paint its largest content within
2.5 s on a mid-range phone on 4G (L2-029, criterion 1), and the code for Listing, Post and Admin
must not be in the initial download (criterion 2). The present-app-shell design left the budget
values `<TO SUPPLY>`, "set from the first production build and tightened from there".

## Decision

The first production build of the shell (header, skip link, not-found page, router, HTTP client,
the error interceptor, zoneless) measured BUDGET_MEASURED. The budgets are set just above it, as
errors:

| Budget | Warning | Error |
|---|---|---|
| `initial` (raw, all initial chunks) | BUDGET_INITIAL_WARN | BUDGET_INITIAL_ERROR |
| `anyComponentStyle` | 4 kB | 8 kB |
| `anyLazyChunk`… not used; each lazy route is reviewed in its own change | | |

Raising a budget needs a reason in the change that raises it (`AGENTS.md`). Browse's first
paint (journey 2) is expected to need the initial budget raised by about its own size; that
change states the new value and why.

## Consequences

- A change that pulls a heavy library into the initial chunk fails `npm run build`.
- The budgets are tightened whenever a build shows room.
