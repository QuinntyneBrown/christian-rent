# Architecture decision records

One decision per record, numbered in the order they were made. A record is never rewritten
once accepted: a later record supersedes it, and the earlier one's status says so.

Each record has four parts: **Status** (Proposed, Accepted, Open or Superseded by NNNN),
**Context**, **Decision** and **Consequences**. An *Open* record names a decision the
requirements and the designs leave undecided, says what the code does until it is made, and
lists what would settle it. A departure from a platform's established best practice needs a
record giving its reason (`AGENTS.md`, *Prefer best practice*).

| # | Decision | Status |
|---|---|---|
| [0001](0001-frontend-workspace-and-libraries.md) | The frontend is one Angular workspace: the libraries `api`, `domain` and `components` and the app `rent` | Accepted |
| [0002](0002-backend-layers-and-cli.md) | The backend is four layers plus `ChristianRent.Cli`, which alone migrates and seeds | Accepted |
| [0003](0003-database-engine.md) | PostgreSQL for development and the first migration; the production service is open | Open |
| [0004](0004-file-storage.md) | Photos behind `IPhotoStorage`, on local disk in development; the production product is open | Open |
| [0005](0005-authentication-seam.md) | An authentication seam that signs nobody in until sign-in is designed | Accepted; extended by 0017 |
| [0006](0006-bundle-budgets.md) | The `angular.json` budget values | Accepted; values superseded by 0014 |
| [0007](0007-test-approach.md) | Tests use fixtures, EF Core InMemory and fake clocks, never a real backend, database or sleep | Accepted |
| [0008](0008-ci-scope.md) | CI runs lint, the builds and one acceptance path per feature, in under 5 minutes | Accepted |
| [0009](0009-health-endpoints-and-rate-limiter.md) | The health endpoints are anonymous and outside the rate limiter; the limiter reads `TimeProvider` | Accepted |
| [0010](0010-mediatr-version.md) | MediatR stays on the 12.x line, the last under the Apache 2.0 licence | Accepted |
| [0011](0011-photo-renditions-and-serving.md) | Photos are stored as `card`, `gallery` and `thumb` JPEG renditions and served anonymously only for an approved listing | Accepted |
| [0012](0012-area-without-distance.md) | A listing's area is stored as its name and shown without a distance until a person's area is designed | Open |
| [0013](0013-browse-paging-and-window.md) | Browse orders by approval, pages by a keyset cursor, and keeps a window of 3 pages | Accepted |
| [0014](0014-bundle-budgets-after-browse.md) | The initial budget after Browse: 315 kB warning, 330 kB error | Accepted; values superseded by 0020 |
| [0015](0015-search-matching-and-browse-query.md) | A search matches every word in a listing's normalised text; Browse's address holds `show`, `kind` and `q` | Accepted |
| [0016](0016-listing-screen-open-decisions.md) | The Listing screen: area without distance, a gallery of one photo or none, the fallback text alternative, "Posted", the avatar, the price in the message box's head, and the title | Accepted |
| [0017](0017-identifying-a-person-until-sign-in.md) | A signed-in person is a `sub` claim; joining stores it on `Member` and no sign-in screen is built | Accepted |
| [0018](0018-joining-open-decisions.md) | Joining: how a new church is matched, the limits, the dialog's title by purpose, churches that fail to load, and the gate's host page | Accepted |
| [0019](0019-posting-open-decisions.md) | Posting: the area as free text, the draft in `sessionStorage`, past dates, the photos field until journey 7, the member's church, placeholders, the write limit, and when posting reopens | Accepted |
| [0020](0020-bundle-budgets-after-post.md) | The initial budget after Post: 325 kB warning, 340 kB error; the shell imports CDK services lazily | Accepted |
| [0021](0021-uploading-photos-open-decisions.md) | Uploading photos: SkiaSharp, the rules' order, renditions without metadata, who may read and delete an unattached photo, 24 hours before `purge-photos` deletes it, no reordering yet, and Post's picker | Accepted |
| [0022](0022-sending-a-message-open-decisions.md) | Sending a message: stored for the two people until the inbox is designed, 20 an hour, optional dates, the text, a member who leaves, no price, one's own listing, the box's own confirmation, and the draft in `sessionStorage` | Accepted |
| [0023](0023-reporting-a-listing-open-decisions.md) | Reporting a listing: the mock's four reasons, one report per member and listing, `reportedAt` on the Listing read and on the refusal, the note, a listing that changed, and a member who leaves | Accepted |
| [0024](0024-viewing-the-review-queue-open-decisions.md) | Viewing the review queue: `grant-admin` makes an admin, `adminGuard` asks before Admin loads, an item waits while its subject does, a church records who entered it, and a phone asks for no detail | Accepted |
| [0025](0025-telling-a-poster-their-listing-was-removed.md) | A removal records a notice for the poster in the same unit of work; nothing is sent until a channel is designed | Accepted |
| [0026](0026-two-admins-deciding-one-item.md) | A review item's version is a concurrency token; a second decision is refused as `already_decided`, unless the same admin repeats the same one | Accepted |
| [0027](0027-deciding-a-review-item-open-decisions.md) | Deciding: 3 toasts at most, arrivals polled every 60 s, the three confirmations, focus, a removed member, and what "already reported" says | Accepted |
| [0028](0028-confirming-a-church.md) | Confirming a church: "Confirm church" on a new member's detail, no dialog, idempotent, `not_found` for an admin alone, and no mark on a Browse card | Accepted |
