# 0020. The angular.json budget values after Post

**Status:** Accepted. Supersedes the values of [0014](0014-bundle-budgets-after-browse.md); the
rules of [0006](0006-bundle-budgets.md) stand.

## Context

Journey 5 left the initial chunks at 314.85 kB raw, just under ADR 0014's 315 kB warning, and
said that the next journey to grow them needs a record. Journey 6 builds Post, whose code is a
lazy chunk (`post-routes`, 47.8 kB raw, 11.0 kB transferred). Two things grew the initial
chunks anyway:

- **The join dialog became reachable.** Until journey 6 nothing in a production build called
  `MemberGate`, so the join dialog and `@angular/cdk/dialog` were removed as unused. Post calls
  the gate, so they are built, lazily. The dialog makes the CDK's focus trap, focus monitor and
  observers live, and because `RentTitleStrategy` imported `LiveAnnouncer` from
  `@angular/cdk/a11y` statically, the bundler kept that code in `main`: the build measured
  345.9 kB, over the 330 kB error budget. `RentTitleStrategy` now imports `LiveAnnouncer` when
  it first announces a title, which moves all of `@angular/cdk/a11y` out of the initial chunks:
  22.7 kB raw saved, and 3.1 kB less than before the journey for that package.
- **Runtime the lazy code shares.** What remains is the part of Angular (8.5 kB: the dialog's
  dynamic components, `model()`, `viewChild()`, `@let`, `afterNextRender`) and of RxJS (3.5 kB:
  the schedulers behind the CDK's `debounceTime` and `audit`) that lazy chunks use and that live
  in modules `main` already loads. As ADR 0014 found for Browse, the bundler keeps a module in one
  chunk, so this code joins `main`. `cr-icon`'s new `xl` size (0.3 kB) and Post's route entry
  (0.1 kB) are the rest.

The two were measured by comparing the build stats of this journey with `main` (lesson L11).

## Decision

The production build with Post measures 323.2 kB raw (85.7 kB transferred) for all initial
chunks. The budgets are set just above it, as before:

| Budget | Warning | Error |
|---|---|---|
| `initial` (raw, all initial chunks) | 325 kB | 340 kB |
| `anyComponentStyle` | 4 kB | 8 kB |

A static import of a CDK entry point from code the shell loads is avoided: the shell imports a
CDK service when it first needs it, so a lazy feature that uses the same entry point does not
move its code into the initial chunks.

## Consequences

- The first announcement of a new screen's title waits for a small lazy chunk; later ones do
  not.
- Journeys 8 and 9 call the gate too and add no dialog code; journey 10's Admin library is lazy.
  A journey that moves code into the initial chunk states the new value and why, as this record
  does.
