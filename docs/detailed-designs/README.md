# Detailed designs

Detailed software designs for christian.rent, one per vertically sliced feature. Each design
refines level-2 (L2) requirements from [`docs/specs/L2.md`](../specs/L2.md), which refine the
level-1 (L1) requirements in [`docs/specs/L1.md`](../specs/L1.md). The mocks in
[`docs/mocks/`](../mocks/README.md) are the source of truth for the UI; each design lists the
mock states it covers.

The frontend is an Angular workspace under `frontend/` with the libraries `api`, `domain`,
`components` and `admin` and the application `rent`. The backend is a .NET service under
`backend/` in four layers: `ChristianRent.Domain`, `ChristianRent.Application`,
`ChristianRent.Infrastructure` and `ChristianRent.Api`, with `ChristianRent.Cli` for commands.

Each feature folder holds a `README.md` with four sections (Overview, Description, Requirements,
Diagrams) and a `diagrams/` folder with PlantUML sources and their rendered images. A fact that
is not decided is marked `<TO SUPPLY>`.

## Features

### browse

The home screen: the list of approved listings, its paging, the switch and the search.

| Feature | L2 requirements |
|---|---|
| [Browse listings](browse/browse-listings/README.md) | `L2-001`, `L2-005`, `L2-006`, `L2-022`, `L2-029`, `L2-030`, `L2-031`, `L2-033` |
| [Search and filter listings](browse/search-and-filter-listings/README.md) | `L2-002`, `L2-003`, `L2-004`, `L2-035`, `L2-026`, `L2-030`, `L2-032` |

### listing

The Listing screen: one approved listing, who posted it and their church.

| Feature | L2 requirements |
|---|---|
| [Read a listing](listing/read-listing/README.md) | `L2-007`, `L2-008`, `L2-014`, `L2-022`, `L2-024`, `L2-025`, `L2-031`, `L2-033` |

### post

The Post screen: composing a listing, publishing it for review, and its photos.

| Feature | L2 requirements |
|---|---|
| [Compose a listing](post/compose-listing/README.md) | `L2-009`, `L2-010`, `L2-011`, `L2-022`, `L2-024`, `L2-031`, `L2-032` |
| [Publish a listing](post/publish-listing/README.md) | `L2-010`, `L2-012`, `L2-025`, `L2-026` |
| [Add photos to a listing](post/add-photos/README.md) | `L2-013`, `L2-014`, `L2-025`, `L2-029` |

### messages

The message a member sends to the person who posted a listing.

| Feature | L2 requirements |
|---|---|
| [Send a message about a listing](messages/send-message/README.md) | `L2-015`, `L2-016`, `L2-024`, `L2-025`, `L2-026` |

### members

Becoming a member, churches, and the verified marks.

| Feature | L2 requirements |
|---|---|
| [Become a member](members/become-member/README.md) | `L2-009`, `L2-015`, `L2-017`, `L2-021`, `L2-025`, `L2-028`, `L2-032` |
| [Verify members and churches](members/verify-members-and-churches/README.md) | `L2-008`, `L2-018`, `L2-025` |

### review

Admin: the review queue and the decisions Approve, Keep and Remove.

| Feature | L2 requirements |
|---|---|
| [View the review queue](review/view-review-queue/README.md) | `L2-019`, `L2-025`, `L2-030`, `L2-031`, `L2-033` |
| [Decide a review item](review/decide-review-item/README.md) | `L2-018`, `L2-019`, `L2-020`, `L2-025`, `L2-032` |

### reports

A member's report of a listing.

| Feature | L2 requirements |
|---|---|
| [Report a listing](reports/report-listing/README.md) | `L2-021`, `L2-025`, `L2-026`, `L2-032` |

### platform

What every slice shares: access rules, member data, the application shell, failure and operations.

| Feature | L2 requirements |
|---|---|
| [Enforce access and limit abuse](platform/enforce-access/README.md) | `L2-025`, `L2-027` |
| [Handle what members write and who they are](platform/handle-member-data/README.md) | `L2-026`, `L2-028` |
| [Present the application shell](platform/present-app-shell/README.md) | `L2-022`, `L2-023`, `L2-036`, `L2-024`, `L2-029`, `L2-031`, `L2-032`, `L2-033` |
| [Fail clearly and operate in production](platform/fail-clearly-and-operate/README.md) | `L2-033`, `L2-034`, `L2-028`, `L2-032` |

## Requirement coverage

Every L2 requirement is realized by at least one feature.

| L2 ID | Refines (L1) | Features |
|---|---|---|
| `L2-001` | `L1-001` | [browse-listings](browse/browse-listings/README.md) |
| `L2-002` | `L1-001` | [search-and-filter-listings](browse/search-and-filter-listings/README.md) |
| `L2-003` | `L1-001` | [search-and-filter-listings](browse/search-and-filter-listings/README.md) |
| `L2-004` | `L1-001` | [search-and-filter-listings](browse/search-and-filter-listings/README.md) |
| `L2-005` | `L1-001` | [browse-listings](browse/browse-listings/README.md) |
| `L2-006` | `L1-001` | [browse-listings](browse/browse-listings/README.md) |
| `L2-007` | `L1-002` | [read-listing](listing/read-listing/README.md) |
| `L2-008` | `L1-002` | [read-listing](listing/read-listing/README.md), [verify-members-and-churches](members/verify-members-and-churches/README.md) |
| `L2-009` | `L1-003` | [compose-listing](post/compose-listing/README.md), [become-member](members/become-member/README.md) |
| `L2-010` | `L1-003` | [compose-listing](post/compose-listing/README.md), [publish-listing](post/publish-listing/README.md) |
| `L2-011` | `L1-003` | [compose-listing](post/compose-listing/README.md) |
| `L2-012` | `L1-003` | [publish-listing](post/publish-listing/README.md) |
| `L2-013` | `L1-004` | [add-photos](post/add-photos/README.md) |
| `L2-014` | `L1-004` | [read-listing](listing/read-listing/README.md), [add-photos](post/add-photos/README.md) |
| `L2-015` | `L1-005` | [send-message](messages/send-message/README.md), [become-member](members/become-member/README.md) |
| `L2-016` | `L1-005` | [send-message](messages/send-message/README.md) |
| `L2-017` | `L1-006` | [become-member](members/become-member/README.md) |
| `L2-018` | `L1-006` | [verify-members-and-churches](members/verify-members-and-churches/README.md), [decide-review-item](review/decide-review-item/README.md) |
| `L2-019` | `L1-007` | [view-review-queue](review/view-review-queue/README.md), [decide-review-item](review/decide-review-item/README.md) |
| `L2-020` | `L1-007` | [decide-review-item](review/decide-review-item/README.md) |
| `L2-021` | `L1-008` | [become-member](members/become-member/README.md), [report-listing](reports/report-listing/README.md) |
| `L2-022` | `L1-009` | [browse-listings](browse/browse-listings/README.md), [read-listing](listing/read-listing/README.md), [compose-listing](post/compose-listing/README.md), [present-app-shell](platform/present-app-shell/README.md) |
| `L2-023` | `L1-009` | [present-app-shell](platform/present-app-shell/README.md) |
| `L2-024` | `L1-010` | [read-listing](listing/read-listing/README.md), [compose-listing](post/compose-listing/README.md), [send-message](messages/send-message/README.md), [present-app-shell](platform/present-app-shell/README.md) |
| `L2-025` | `L1-011` | [read-listing](listing/read-listing/README.md), [publish-listing](post/publish-listing/README.md), [add-photos](post/add-photos/README.md), [send-message](messages/send-message/README.md), [become-member](members/become-member/README.md), [verify-members-and-churches](members/verify-members-and-churches/README.md), [view-review-queue](review/view-review-queue/README.md), [decide-review-item](review/decide-review-item/README.md), [report-listing](reports/report-listing/README.md), [enforce-access](platform/enforce-access/README.md) |
| `L2-026` | `L1-011` | [search-and-filter-listings](browse/search-and-filter-listings/README.md), [publish-listing](post/publish-listing/README.md), [send-message](messages/send-message/README.md), [report-listing](reports/report-listing/README.md), [handle-member-data](platform/handle-member-data/README.md) |
| `L2-027` | `L1-011` | [enforce-access](platform/enforce-access/README.md) |
| `L2-028` | `L1-011` | [become-member](members/become-member/README.md), [handle-member-data](platform/handle-member-data/README.md), [fail-clearly-and-operate](platform/fail-clearly-and-operate/README.md) |
| `L2-029` | `L1-012` | [browse-listings](browse/browse-listings/README.md), [add-photos](post/add-photos/README.md), [present-app-shell](platform/present-app-shell/README.md) |
| `L2-030` | `L1-012` | [browse-listings](browse/browse-listings/README.md), [search-and-filter-listings](browse/search-and-filter-listings/README.md), [view-review-queue](review/view-review-queue/README.md) |
| `L2-031` | `L1-013` | [browse-listings](browse/browse-listings/README.md), [read-listing](listing/read-listing/README.md), [compose-listing](post/compose-listing/README.md), [view-review-queue](review/view-review-queue/README.md), [present-app-shell](platform/present-app-shell/README.md) |
| `L2-032` | `L1-014` | [search-and-filter-listings](browse/search-and-filter-listings/README.md), [compose-listing](post/compose-listing/README.md), [become-member](members/become-member/README.md), [decide-review-item](review/decide-review-item/README.md), [report-listing](reports/report-listing/README.md), [present-app-shell](platform/present-app-shell/README.md), [fail-clearly-and-operate](platform/fail-clearly-and-operate/README.md) |
| `L2-033` | `L1-015` | [browse-listings](browse/browse-listings/README.md), [read-listing](listing/read-listing/README.md), [view-review-queue](review/view-review-queue/README.md), [present-app-shell](platform/present-app-shell/README.md), [fail-clearly-and-operate](platform/fail-clearly-and-operate/README.md) |
| `L2-034` | `L1-015` | [fail-clearly-and-operate](platform/fail-clearly-and-operate/README.md) |
| `L2-035` | `L1-001` | [search-and-filter-listings](browse/search-and-filter-listings/README.md) |
| `L2-036` | `L1-001` | [present-app-shell](platform/present-app-shell/README.md) |

## Open decisions

The requirements and the mocks leave these undecided. Each design marks where it depends on one.

| Decision | Affects |
|---|---|
| How a member signs in, and how a person is identified before joining | become-member, enforce-access, every member action |
| Whether `POST /api/members` and `GET /api/churches` need an identified person (`L2-025` criterion 5 exempts them from membership only), and where `L2-025` exempts the health endpoints | become-member, enforce-access |
| Where a member reads messages and replies (the Messages inbox) | send-message, decide-review-item |
| How a poster is told that their listing was removed | decide-review-item |
| How a member manages their own listings ("My listings") | read-listing |
| The Admin control that confirms a church, and the one that removes a member who has left the review queue | verify-members-and-churches |
| How a person's area is set and a distance measured; the source of Canadian place names | browse-listings, search-and-filter-listings, compose-listing |
| Who writes the description that is a photo's text alternative | read-listing, add-photos |
| How the short name in the message box is derived from a member's name | send-message |
| How Admin learns that new items arrived while the queue is open | view-review-queue |
| The control that reorders photos (no mock) | add-photos |
| The database engine, the file storage product, the image library | every backend slice, add-photos |
| Hosting, the telemetry backend, backups and their retention | fail-clearly-and-operate, handle-member-data |
| The `angular.json` budget values | present-app-shell |

## Rendering the diagrams

```sh
python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs
```

The script needs PlantUML and Graphviz. Edit a `.puml`, render, and commit the `.png` with it.
