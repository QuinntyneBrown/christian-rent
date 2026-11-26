# 0027. What deciding a review item does where its design left it open

**Status:** Accepted. Settles what [0024](0024-viewing-the-review-queue-open-decisions.md) left
to journey 11, and supersedes the "already reported" wording of
[0023](0023-reporting-a-listing-open-decisions.md). Telling a poster is
[0025](0025-telling-a-poster-their-listing-was-removed.md) and two admins are
[0026](0026-two-admins-deciding-one-item.md).

## Context

The decide-review-item design, its mocks and ADR 0024 leave open:

- the largest number of toasts shown at once (`<TO SUPPLY>`);
- how `ReviewQueueStore` learns that new items arrived (L2-019, criterion 12);
- what the confirmation of Remove says for a new listing and for a new member, which no mock
  drew, and where a failed removal is said;
- what the screen does with focus, and with a second decision, while one is in flight;
- what "already reported" says once an admin can close a report.

## Decision

- **At most 3 toasts**, as the design system's toast page says. A fourth takes the place of the
  oldest that would have dismissed itself; when all three are failures, of the oldest. A toast
  about an item replaces the one already shown about it, so a decided item leaves no "Try
  again" behind.
- **Admin polls for arrivals.** The first page of the queue says `asOf`, the backend's time
  when it was read. While Admin is open and its page visible, every 60 s the store asks
  `GET /api/review-queue/arrivals?since=<asOf>`, which counts the waiting items made after
  then by kind. One request is in flight at a time, and the next is timed from its answer. The
  toast is replaced when the total grows, and not shown again for a total already shown, so a
  dismissed one stays away. A failed look is silent and the next one tries again. "Show them"
  reads the queue from its oldest item, which starts a new `asOf`. A push channel was not
  chosen: it needs a connection to hold and a hub, for a queue a few people read.
- **One confirmation, three wordings** (L2-020, criterion 9), drawn in
  `docs/mocks/dialogs/confirm-remove/`. A new listing was never public, so its confirmation
  does not say that it stops being public.
- **A removal fails in its confirmation; Approve and Keep fail in a toast.** The confirmation
  is open while a removal is in flight and cannot be closed until it is answered. It closes on
  success, on `already_decided` and on `not_found`, which the panel then shows.
- **One decision at a time.** While one is in flight the button pressed is busy and the others
  are off, whichever item is selected.
- **Focus follows the queue.** After a decision, and after "Go to the next item", focus moves
  to the row then selected: the one that followed the decided item, or the one before it when
  it was the last. With no row left it moves to the heading "Review". If the admin has selected
  another item while a decision was in flight, that selection stays.
- **A removed member** keeps their rows. Their status is `Removed`, so they get no member
  claims: they can neither post, message nor report, joining again is refused, their listings
  are not public, and what waited about them or their listings no longer waits (L2-018,
  criterion 4). Sign-in is not designed, so "can no longer sign in" is met by treating them as
  no member.
- **"Already reported" says only what is always true:** "You reported this listing on
  Jun 6, 2026. There's no need to send it again." An admin may since have kept the listing, so
  "is with an admin" could be false, and a reporter is not told what was decided. Allowing a
  second report after Keep still waits for a requirement.

## Consequences

- An open Admin makes one small request a minute, well within the 120 reads a minute of
  L2-027.
- An item made at the same instant as a first page was read, and not on it, is not counted as
  an arrival. It appears when the queue is next read.
- Admin's toasts have their own region, beside the shell's for an unexpected error. Should the
  two show at once, they overlap.
- An admin can remove their own membership if their new-member item still waits. Nothing in
  the requirements forbids it, and no admin made with `grant-admin` is stopped from it.
