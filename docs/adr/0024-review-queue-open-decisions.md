# 0024. What viewing the review queue does where its design left it open

**Status:** Accepted. Reuses the window of [0013](0013-browse-paging-and-window.md) and the
identity of [0017](0017-identifying-a-person-until-sign-in.md).

## Context

The view-review-queue design and its mocks leave open what journey 10 has to settle:

- how a member becomes an admin while sign-in is not designed (`<TO SUPPLY>`);
- how the `/admin` route keeps Admin's code out of the download of anyone who is not an admin,
  when the session is asked for at start without holding up the screen;
- how new items that arrive while the queue is open are noticed (`<TO SUPPLY>`; L2-019,
  criterion 12);
- which item is selected, and how a selection is kept;
- what the queue does with an item whose subject has gone (journey 9 noted that
  `purge-departed` deletes a departed member's listings but not their new-listing items);
- how the new-member detail knows who entered a church (L2-019, criterion 9), which nothing
  records;
- the words for how long an item has waited, for a report's reason, and for the dates;
- what the forbidden page says to a person who is not a member at all.

## Decision

- **An operator makes an admin.** `ChristianRent.Cli grant-admin <sign-in-id>` sets
  `Member.IsAdmin` on the active member with that sign-in identifier, and says so; run again it
  changes nothing. With no such member it changes nothing and exits 1. No endpoint makes an
  admin, so nobody can make themselves one (L2-025, criterion 3). The seed data's cast signs in
  as nobody and has no admin.
- **The route asks the session first.** `Session` gains `ready()`, a promise that settles once
  the first answer of `GET /api/members/me` has been taken (or failed). `adminGuard`, a
  `CanMatchFn`, awaits it and matches only for `member()?.isAdmin`. When it does not match, the
  next route with the path `admin` renders `ForbiddenPage`, from `rent`, and `@rent/admin` is
  never requested. The guard is a convenience: the API refuses everyone else (`not_an_admin`,
  403; `not_signed_in`, 401).
- **The address holds the selection.** Each queue item is a link to `/admin?item={id}`
  (`aria-current="true"` on the selected one). With no `item`, or one that is not loaded, the
  first item is selected. The detail is asked for only from 768 px, where it is shown; on a
  phone no detail request is made (L2-031, criteria 5 and 7). A newer selection aborts the
  detail request of the one before.
- **Paging.** `GET /api/review-queue?cursor=` answers pages of 50, oldest first by `CreatedAt`
  then `Id`, with a keyset cursor encoded as Browse's is, the number waiting, and the next
  cursor. The page size is not a parameter. The screen keeps the pages in a `ListingWindow` of
  3 pages (150 items), which is generic, with a sentinel above and below the list.
- **An item whose subject has gone** is neither listed nor counted, and its detail is
  `not_found`. Only items with no decision wait; journey 11 adds the decision.
- **Who entered a church.** `Church` gains `EnteredById`, the member who entered it when
  joining, null for a church entered by seed data. The new-member detail says "Verified" for a
  verified church; otherwise "New to christian.rent, entered by this member", "New to
  christian.rent, entered by {name}", or "New to christian.rent" when nobody entered it. The
  name is the admin's to see; no member-facing answer carries it.
- **Words.**
  - How long an item has waited, and how long ago a report was made: under a minute "just
    now", then "12 min", "3 hr", "2 days", by whole units, rounded down.
  - A report's reason: "Reported as a scam", "Reported as not a real listing", "Reported as
    inappropriate", "Reported for something else", then "by a member, 40 min ago" and the note
    in quotation marks when there is one.
  - "Member since" is the month and year ("Apr 2025") wherever it is shown; "Posted" is the
    date and time ("Jun 8, 2026, 9:12 a.m."); "Public since" and "Joined" are as the mocks
    draw them. The report mock drew "Member since Jun 6, 2026" and now reads "Jun 2026".
  - A new member's listings: "None", or by offer and whether they are public, such as "1
    wanted listing, public" or "2 listings for rent, 1 public"; their messages: "None", "1
    message", "3 messages".
- **The forbidden page names who is signed in.** For a member: "You’re signed in as {name},
  who isn’t an admin of christian.rent." For a person who is not a member, or is not signed in:
  "You’re not signed in as an admin of christian.rent." The forbidden
  mock's note gives this sentence.
- **New items while the queue is open (L2-019, criterion 12)** need the review toast and its
  queue, which journey 11 builds. Journey 11 asks for the first page again every 60 s while the
  page is visible and, when the waiting count has grown, pushes the info toast "2 new items are
  waiting" whose action "Show them" reloads the queue. Until then criterion 12 is not met, and
  `docs/detailed-journeys.md` says so.

## Consequences

- An admin exists only after an operator runs `grant-admin` with that person's sign-in
  identifier; the operations guide documents it with the other commands.
- A migration adds `churches.entered_by_id`; existing churches have none.
- Admin's chunk is never part of a non-admin's download, which a behaviour spec checks.
- A phone that opens Admin asks for the queue and never for a detail.
