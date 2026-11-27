# 0031. How an admin confirms a church

**Status:** Accepted. Settles open question 4 of the mocks and the `<TO SUPPLY>` control of the
verify-members-and-churches design.

## Context

L2-018, criterion 2, has an admin confirm a church, so that its mark shows on the listings of all
its members. Admin is one screen, the review queue, which holds new listings, reports and new
members ([0024](0024-viewing-the-review-queue-open-decisions.md)); the prototype and the mocks
drew no control for a church, and L2-019, criterion 9, said the detail of a new member offered
none. Approving a new member verifies the member and leaves their church as it is (L2-018,
criterion 6). The verify-members-and-churches design left open:

- where the control is, and what it says while it works, when it has worked and when it fails;
- what the endpoint answers, to an admin and to anyone else;
- what a second confirmation of the same church does;
- what is recorded.

## Decision

- **"Confirm church" is in the detail of a new member**, beside the church's status, while the
  church is not verified. That is where an admin first meets a church a member entered, and
  where its status, its city and who entered it are already shown. It is a button of its own,
  apart from the decision bar: it changes the church, not the item, and the new member still
  waits. Once the church is verified the status reads "Verified" and no control is offered.
  No new item kind and no second Admin screen were added: either is a design of its own, for a
  church that is confirmed once.
- **It acts at once, with no confirmation dialog**, as Approve does. It takes nothing away from
  anyone, and Remove alone asks first (L2-020, criterion 4).
- **One change at a time.** While the confirmation is in flight the button is busy and Approve
  and Remove are off; while a decision is in flight "Confirm church" is off. On success a
  notification titled "Church confirmed" says "<church> is now marked Verified on its members'
  listings.", and focus moves to the selected row, since the button that had it is gone. On
  failure a notification titled "The church wasn't confirmed" says the church is still not
  verified, offers "Try again" and stays until dismissed or until the church is confirmed. Both
  use Admin's notifications ([0027](0027-deciding-a-review-item-open-decisions.md)). Leaving
  Admin aborts a confirmation on its way; selecting another item does not.
- **`POST /api/admin/churches/{id}/verification`**, with no body, under `/api/admin/` and the
  `Admin` policy, so only the Admin session of an admin reaches it
  ([0029](0029-sign-in-and-two-sessions.md)). It answers 204. Nobody signed in, and a member
  session, are answered 401 `not_signed_in`; an Admin session that is not an admin's 403
  `not_an_admin`; each alike whether the church exists or not. To an admin, a church that does
  not exist, or an identifier that is not one, is 404 `not_found`.
- **Confirming is idempotent.** A church already verified is answered 204 and nothing changes,
  so "Try again" after a lost answer is safe and two admins need no version.
- **The church records who confirmed it and when** (`VerifiedBy`, `VerifiedAt`), set once.
  Sample churches entered as verified have neither. `VerifiedBy` is not a foreign key, as
  `EnteredById` is not ([0024](0024-viewing-the-review-queue-open-decisions.md)).
- **The detail of a new member carries the church's identifier**, which the control sends. It is
  not in any answer to a member.
- **The marks are read, never copied.** The Listing screen and Admin's detail read
  `Member.IsVerified` and `Church.IsVerified` on every request, so a confirmation marks every
  listing of every member of the church on its next load, and the two marks stay independent
  (L2-018, criterion 3). A card on Browse names the church and draws no mark, as its mocks do.

## Consequences

- A church none of whose members waits as a new member cannot be confirmed from Admin: its
  members were all decided before anyone confirmed it. Until a screen for churches is designed,
  the next new member of that church offers the control again.
- Nothing takes a church's mark away. Removing a verification has no requirement and is not
  built.
- An admin who presses "Confirm church" by mistake cannot undo it from Admin.
- The database gains two nullable columns on `churches`, in the migration `ChurchVerification`.
