# 0026. What happens when two admins decide the same item

**Status:** Accepted.

## Context

L2-020, criterion 5, refuses a second decision on an item and keeps the first; criterion 13 has
the screen say which decision was made and when. A decision can also be repeated by the admin
who made it, when its answer is lost and they select "Try again" (criterion 12).

## Decision

- **The decision is on the item, and a version guards it.** `ReviewItem` has `Decision`,
  `DecidedBy`, `DecidedAt` and `Version`. `Version` starts at 0, `Decide` raises it by one, and it
  is an EF Core concurrency token. The detail of an item carries its version, and
  `POST /api/review-queue/{id}/decision` sends it back with the decision.
- **A decided item is answered `already_decided`.** The refusal is a 409 ProblemDetails with the
  `code` `already_decided`, the first `decision`, `decidedAt`, and `decidedByYou`. It names no
  admin. A save that loses the race on the token reads the item again and gives the same answer
  when it was this item that was decided. When it was another item the same decision would have
  closed that lost the race, nothing of this decision stands, the request fails, and trying
  again succeeds.
- **A decision answers the items it closed** (200, `closedItemIds`): removing a reported listing
  closes every item about it, and the screen drops them all.
- **The same admin repeating the same decision is answered as made**, with the same items, and
  nothing changes.
  Only a lost answer, or the same admin in two windows, sends that, and "Another admin approved
  it" would then be untrue.
- **The screen branches on the code.** On `already_decided` the panel keeps the item, says what
  was decided and when ("Another admin", or "You" when `decidedByYou`), turns the buttons off and
  offers "Go to the next item"; a warning toast says the decision was not applied.
- **An item nobody decided that no longer waits is `not_found`** (L2-020, criterion 18): its
  listing or member has gone since the detail was read. The panel says so, as it does when a
  detail is asked for (L2-019, criterion 21).
- **A version that is not the item's is refused** with `version_unknown` when the item is not
  decided. Only a decision raises the version, so no screen of this product sends one.
- **A pair the table does not allow** is refused with 409 `decision_not_allowed`. The detail
  carries `allowedDecisions`, so the screen draws only what is allowed.

## Consequences

- EF Core InMemory checks concurrency tokens, so the race is proved in the tests; it does not
  roll back the other rows of a refused save as PostgreSQL does, so the tests of the race assert
  the review item and the refusal.
- A decision cannot be undone or changed. Nothing in the requirements asks for it.
- `Version` would also guard any later change to a review item.
