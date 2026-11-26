# 0024. What viewing the review queue does where its design left it open

**Status:** Accepted. Uses the identity of [0017](0017-identifying-a-person-until-sign-in.md)
and the paging window of [0013](0013-browse-paging-and-window.md).

## Context

The view-review-queue design and the admin mocks leave open what journey 10 has to settle:

- how a member becomes an admin while sign-in is not designed (`<TO SUPPLY>`);
- how `/admin` keeps Admin's code out of the download of anyone who is not an admin;
- which review items still wait, when a listing or a member has gone since the item was made
  (`purge-departed` deletes a departed member's listings and leaves their new-listing items);
- who entered a church, which a new member's detail has to say (L2-019, criterion 9);
- what the queue does under 768 px, where there is no detail panel;
- how the next page is asked for: the design says as the end of the list is reached, and the
  `long` mock draws a "Load 13 more" button;
- how `ReviewQueueStore` learns that new items arrived (`<TO SUPPLY>`).

## Decision

- **The operator makes an admin.** `ChristianRent.Cli grant-admin <member-id>` sends
  `GrantAdminCommand`, which sets `Member.IsAdmin` on an active member. Running it again changes
  nothing. An unknown member, or one who has left or been removed, is refused with exit code 1.
  No screen and no endpoint grants it, and the sample data makes nobody an admin. Taking the role
  away is not built; nothing requires it yet.
- **The route asks before it loads.** `adminGuard` is a `CanMatchFn` that awaits
  `SESSION.refresh()`, so the answer is current, and matches only when
  `member()?.isAdmin === true`. Only then does the router call `loadChildren` for
  `@rent/admin`. Otherwise the next route, the same path, loads `ForbiddenPage` from `rent`.
  A direct visit therefore asks `GET /api/members/me` twice, once at start and once here.
- **Not known is not an admin.** `SESSION` is null for nobody signed in, for a person who is not
  a member and when the backend cannot be reached. `ForbiddenPage` then says "You aren't signed
  in as an admin of christian.rent.", which is true in all three; it cannot name anyone.
- **An item waits while its subject does.** A new-listing item waits while the listing is waiting
  for review and its poster is active; a report item while the report is open and its listing is
  approved and its poster active; a new-member item while the member is active. Anything else is
  not listed, not counted, and `not_found` when asked for (L2-019, criterion 18). Nothing is
  deleted by a read. Journey 11, which adds the decision, also leaves decided items out.
- **No decision fields yet.** `ReviewItem` gains no `Decision`, `DecidedBy`, `DecidedAt` or
  `Version`, and the detail carries no `allowedDecisions`: journey 11 adds them with the code
  that writes and reads them.
- **A church records who entered it.** `Church` gains `EnteredById`, set when a join creates a
  new church. It is null for the sample churches and for any entered before this.
- **Under 768 px the queue is read-only.** No row is a button, none is current, and no detail is
  requested, so a phone downloads no photos it cannot show. The page watches the same width the
  stylesheet uses, with `matchMedia`, and stops watching when it is left.
- **The selection is not in the address.** `/admin` is the whole screen; the selected row is a
  button with `aria-current`.
- **Both ways to the next page.** The end of the list loads the next page when it comes into
  view, and the same block holds the "Load N more" button, for a keyboard and for a list too
  short to scroll. At most 3 pages of 50 are held, in the `ListingWindow` that Browse uses;
  spacers keep the scroll position of released pages.
- **The new-items notification waits for journey 11** (L2-019, criterion 12), which builds the
  review toasts and `ToastQueue`. How the store learns of new items is decided there.

## Consequences

- The first admin of a deployed system needs the operator to know that member's identifier,
  which they read from the database. The README says so.
- A queue read joins each item to its subject, so `WaitingCount` counts only what waits.
- Orphaned review items stay in the table and are never shown.
- Admin shows no way to decide until journey 11.
