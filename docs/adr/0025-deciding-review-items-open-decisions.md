# 0025. What deciding a review item does where its design left it open

**Status:** Accepted. Builds on [0024](0024-review-queue-open-decisions.md) and stores like
[0022](0022-sending-a-message-open-decisions.md).

## Context

The decide-review-item design and its mocks leave open what journey 11 has to settle:

- how the member who posted a removed listing is told, while neither a Messages inbox nor
  sign-in is designed (`<TO SUPPLY>`; L2-020, criterion 7);
- what happens when two admins decide the same item (L2-020, criteria 5 and 13);
- how many toasts show at once (`<TO SUPPLY>`);
- the words after each decision, when the mocks draw only Approve on a new listing, and the
  confirmation for removing a new listing or a new member, when the mocks draw only a report;
- how new items that arrive while the queue is open are noticed (L2-019, criterion 12), which
  ADR 0024 left to this journey.

## Decision

- **The poster is told by a recorded notice.** Removing a listing records a `MemberNotice`
  (`ListingRemoved`, the poster, the listing, the time) through `IMemberNotifier`, in the same
  unit of work as the decision. Nothing delivers it yet: the inbox, when it is designed, shows
  it. It names the listing and never a reporter (L2-021, criterion 4). `purge-departed` deletes
  a departed member's notices with their messages. Removing a member records no notice.
- **One decision per item, checked twice.** `ReviewItem` gains `Decision`, `DecidedById`,
  `DecidedAt` and `Version`, a concurrency token that every decision changes. The detail
  carries `version` and the `decisions` its kind allows; `POST /api/review-queue/{id}/decision`
  takes `{ decision, version }`. A decision already recorded, a stale `version` or a failed
  token check on save all answer 409 `already_decided` with `decision` and `decidedAt`, and
  change nothing. A decision the kind does not allow is 400 `decision_not_allowed`. Removing a
  reported listing decides every other waiting item about it (its reports, and a new-listing
  item) as Remove, with the same admin and time.
- **The screen after a refusal.** The item leaves the queue. The detail stays, with the warning
  "This was already decided." and "Another admin approved it at 12:14 p.m. Your decision was
  not applied.", its decision buttons off and "Go to the next item"; a warning toast says
  "Already decided" and "Another admin approved “Backyard garden for gatherings” first. Your
  decision was not applied."
- **At most three toasts.** They stack newest at the bottom. A fourth drops the oldest toast
  that is not a failure; a failure stays until it is dismissed. Every other toast dismisses
  itself after 8 s, paused while the pointer or the focus is on it.
- **Words.** After a decision the success toast says, for a new listing, "Approved" and
  "“{title}” is now public on Browse." or "Removed" and "“{title}” won’t be public, and {poster}
  is told."; for a report, "Kept" and "“{title}” stays public, and its report is closed." or
  "Removed" and "“{title}” is no longer public, and {poster} is told."; for a new member,
  "Approved" and "{name} is now verified." or "Removed" and "{name} can no longer post or
  message." The confirmation asks "Remove “{title}”?" for a new listing: "It never becomes
  public, and {poster} is told it was removed. Your name and the time are recorded.", and
  "Remove {name}?" for a new member: "They can no longer sign in, post or message, and their
  listings stop being public. Your name and the time are recorded.", each with "Remove listing"
  or "Remove member". A failed decision's toast is "Your decision wasn’t saved" and "We
  couldn’t reach christian.rent. “{title}” is still in the queue." with "Try again".
- **New items while the queue is open.** While the page is visible, the queue store asks for
  the first page again every 60 s. When the number waiting has grown past what the admin has
  seen, it pushes the info toast "2 new items are waiting" (or "1 new item is waiting") with
  "They arrived while you were reviewing." and "Show them", which loads the queue again. The
  mock's "A new listing and a report arrived" needs the kinds of the new items, which the count
  does not give; the mocks' README records the departure.

## Consequences

- A migration adds the four columns to `review_items` and the table `member_notices`.
- The queue shows only items with no decision; a decided item is never deleted, so who decided
  what and when stays recorded (L2-020, criterion 6).
- The confirm-remove mocks gain `new-listing` and `new-member` states, and the review-toast
  mocks a note with every decision's words.
- The inbox journey, when it is designed, reads `member_notices`.
