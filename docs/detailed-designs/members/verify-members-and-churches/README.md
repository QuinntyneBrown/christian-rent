# Verify members and churches

## Overview

A member or a church that an admin has confirmed is **verified**. The mark "Verified", an
icon with the word, appears beside the member and beside the church wherever a listing shows
who posted it. The two marks are independent: a verified member of an unverified church
shows one mark, on the member.

- **verified member** — member an admin approved from the review queue
- **verified church** — church an admin confirmed
- **removed member** — member an admin removed; they can no longer sign in, post or
  message, and their listings are no longer public

This feature designs where the two flags live, how they reach every screen, what removal
does, and who may change them. The admin's Approve and Remove buttons are designed in
[decide-review-item](../../review/decide-review-item/README.md).

## Description

**Backend**

- **`Member.IsVerified`**, **`Church.IsVerified`** — the two flags. Each is set only by a
  method on its entity: `Member.Verify()` and `Church.Verify()`. No request DTO from a
  member has a property that maps to either flag, so a member cannot set one through
  `JoinCommand` or `PostListingCommand` (L2-018, criterion 5).
- **`Member.Remove()`** — sets `Status = Removed`.
- **`DecideReviewItemCommandHandler`** — calls `Member.Verify()` on Approve and
  `Member.Remove()` on Remove for a new-member item. Approve leaves the flag of the member's
  church unchanged (L2-018, criterion 6); see
  [decide-review-item](../../review/decide-review-item/README.md).
- **`VerifyChurchCommand`** — `{ ChurchId }`, sent by
  `POST /api/admin/churches/{id}/verification` on an Admin controller (under `/api/admin/`, so only the Admin session reaches it; ADR 0029), restricted to the `Admin`
  policy. Its handler calls `Church.Verify()` and records the admin and the time on the
  church (`VerifiedBy`, `VerifiedAt`).
- **`ListingVisibility.CanBeSeenBy`** — treats a listing as public only when its poster's
  `Status` is `Active`. A removal therefore hides every listing of the member at once,
  without rewriting the listings (L2-018, criterion 4). `BrowseListingsQueryHandler`,
  `GetListingQueryHandler` and `GetPhotoQueryHandler` share the rule.
- **`ICurrentMember`** — reports `IsMember = false` for a removed member, so every handler
  that requires a member refuses with `not_a_member`. From their next request their
  session stops working and signing in is refused
  ([sign-in-and-sessions](../../platform/sign-in-and-sessions/README.md)).
- **`PosterDto.IsVerified`**, **`ChurchDto.IsVerified`** — projected from the entities at
  read time by `GetListingQueryHandler` and `GetReviewItemQueryHandler`. Because the flags
  are read on every request, a church confirmed today marks the listings of all its members
  on their next load (L2-018, criterion 2).

**Frontend**

- **`cr-verified`** (`components`) — an icon with `aria-hidden` and the visible word
  "Verified"; the state is text, never colour alone (L2-008, criteria 2 and 3).
- **`cr-poster`** — renders `cr-verified` beside the member name when
  `poster.isVerified`, and beside the church name when `poster.church.isVerified`. When a
  flag is false nothing is rendered in its place (L2-008, criterion 4).
- **`cr-review-detail`** — shows the same marks to the admin. For a new member it shows the
  row "Church status" ("New to christian.rent, entered by this member") and no control for
  the church (L2-019, criterion 9).

**Undecided**

- The Admin control that confirms a church. L2-018 has an admin confirm a church; the
  review queue holds listings, reports and new members, and the mocks draw no control
  (mocks open question 4). The endpoint above is the backend half; its screen is
  `<TO SUPPLY>`, and is not built before its mock exists.
- How an admin removes a member who has left the review queue: `<TO SUPPLY>`. Admin has no
  screen other than the queue, so `Member.Remove()` is reached only from a new-member item.
- Whether removing a member also closes the open review items about their listings:
  `<TO SUPPLY>`.
- Whether a removed member is told, and how: `<TO SUPPLY>`.

### Mocks

The mocks are the source of truth for the UI of this feature. The states this design covers are:

- [`docs/mocks/pages/listing/default.html`](../../../mocks/pages/listing/default.html): member and church both verified
- [`docs/mocks/pages/listing/wanted.html`](../../../mocks/pages/listing/wanted.html): member verified, church not
- [`docs/mocks/pages/listing/unverified.html`](../../../mocks/pages/listing/unverified.html): neither verified
- [`docs/mocks/pages/admin/new-member.html`](../../../mocks/pages/admin/new-member.html): a new member with the church's status

## Requirements

The feature realizes the following level-2 (L2) requirements from
[`docs/specs/L2.md`](../../../specs/L2.md). Each L2 requirement refines a level-1 (L1)
requirement, cited by identifier. The table restates each requirement in `shall` form; the
acceptance criteria in the specification remain authoritative.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-008` | `L1-002` | A listing shall show the name of the member who posted it and the name of their church. The member and the church shall each be marked "Verified" with text and an icon only when verified. The member's initials and the year they became a member shall be shown. The member's email address, phone number and street address shall not be in the response. |
| `L2-018` | `L1-006` | An admin's approval shall make a member verified. An admin's confirmation shall make a church verified for the listings of all its members. The two marks shall be independent, and approving a new member shall not verify their church. A removed member shall no longer sign in, post or message, and their listings shall no longer be public. The backend shall refuse anyone but an admin who sets a verified mark. |
| `L2-025` | `L1-011` | Every endpoint other than browsing, searching, reading an approved listing and serving its photos shall respond 401 to anyone not signed in. Listing the churches, joining and asking who is signed in shall not be refused for want of membership. The backend shall refuse a request for, or a change to, anything that is not the member's own, and shall reveal nothing about it. A refusal a screen branches on shall be a ProblemDetails with a `code`. |

## Diagrams

### System context

The people involved are: admin, anyone, member. Each reaches the feature through christian.rent, which takes no payment and holds no booking calendar.

![C4 system context for Verify members and churches](diagrams/c4-context.png)

### Containers

The rent application calls `ChristianRent.Api` over JSON/HTTPS. The API persists state through EF Core.

![C4 container view for Verify members and churches](diagrams/c4-container.png)

### Components

Two handlers change the flags, both restricted to an admin. `GetListingQueryHandler` reads
the flags at request time, and `ListingVisibility` reads the member's status, so both
changes take effect without touching any listing.

![C4 component view for Verify members and churches](diagrams/c4-component.png)

### Class structure

`Member` and `Church` each own their flag and the method that sets it. The DTOs project the
flags; `ListingVisibility` depends on `MemberStatus`.

![Class diagram for Verify members and churches](diagrams/class-structure.png)

### Behaviour — show the verified marks

Approving a new member sets the flag once; the next read of any of the member's listings
carries it, and `cr-poster` renders each mark only when its flag is true (`L2-018`,
`L2-008`).

![Sequence diagram for show the verified marks](diagrams/sequence-show-marks.png)

### Behaviour — remove a member

Removal changes the member's status. `ListingVisibility` then hides every listing of the
member, and `ICurrentMember` stops treating them as a member (`L2-018`, criterion 4).

![Sequence diagram for remove a member](diagrams/sequence-remove-member.png)
