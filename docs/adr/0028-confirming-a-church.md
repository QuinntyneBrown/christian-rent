# 0028. How an admin confirms a church

**Status:** Accepted

## Context

L2-018 has an admin confirm a church, which verifies it on the listings of all its members. The
review queue holds new listings, reports and new members, Admin has no other screen, and neither
the prototype's queue nor the mocks drew a control. The verify-members-and-churches design
designed the backend half and left the screen open.

## Decision

- **The control is on the new member's detail.** While a new member's church is not verified,
  "Confirm church" stands beside the "Church status" fact. It is a secondary action, drawn as an
  outline button, so that Approve stays the main one. A church is entered by a member who is
  joining, so this is where an admin first meets it. A Churches screen was not chosen: Admin is
  the review queue (L2-019), and a church is not a review item.
- **Confirming decides nothing.** The item stays in the queue, selected. Approve and the church
  stay independent (L2-018, criterion 6).
- **No confirmation dialog.** Like Approve, one press makes it and no undo is offered. Only
  Remove asks first (L2-020, criterion 4). Removing a church's verification is not required and
  is not built.
- **One thing at a time on the panel.** While a confirmation is in flight no decision can be
  started, and while a decision is in flight, or once another admin has decided the item, a
  church cannot be confirmed from that panel. So an Approve never takes the item away from
  under a confirmation.
- **What is said.** Success is a notification titled "Church confirmed" that names the church;
  the status then reads "Verified" and takes focus, since the button that had it is gone. A
  failure of any kind is a notification titled "The church wasn't confirmed" with "Try again",
  keyed by the church. A decision's notifications are keyed by the item, so neither replaces the
  other.
- **The endpoint** is `POST /api/churches/{id}/verification`, with no body, under the `Admin`
  policy, answered 204. The policy runs first, so anyone else learns nothing of which churches
  exist. To an admin, an identifier no church has, or a malformed one, is `not_found`.
- **Confirming twice is answered as made.** `Church.Verify(adminId, now)` records
  `VerifiedBy` and `VerifiedAt` only on a church that is not verified, so "Try again" after a
  lost answer, and a second admin, change nothing. Two confirmations saved at the same instant
  may both write the record, and the later one stays; the church is verified either way, so no
  concurrency token is added. A church verified by seed data has no record.
- **Its client is `ReviewQueueApi`.** `confirmChurch` sits on the contract Admin's route
  already binds, so it loads only with Admin. `ChurchesApi` is the join dialog's list.
- **No mark on a Browse card.** The Browse mocks draw the church's name on a card and no mark.
  The marks are on Listing, which every listing of a member opens, and in Admin.

## Consequences

- A church can be confirmed only while one of its new members waits. An admin who approves
  that member first loses the way to the church until another of its members joins. This stays
  open in `docs/specs/L1.md` until a screen for it is designed.
- A listing read after the confirmation carries the church's mark, with no listing rewritten.
  A screen already open shows it on its next load.
- An admin who is a member of the church can confirm it. Nothing in the requirements forbids
  it, as with their own new-member item (ADR 0027).
