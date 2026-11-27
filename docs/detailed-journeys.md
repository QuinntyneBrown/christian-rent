# Detailed journeys

Each journey of [`journeys.md`](journeys.md) split into thin slices, taken from the detailed
designs in [`detailed-designs/`](detailed-designs/README.md). A slice is finished one at a time:
its Given-When-Then criteria, its acceptance test seen to fail, the code that makes it pass, a
refactor while green, and the regression checks (`AGENTS.md`, *Incremental implementation and
ATDD*). When a slice finishes, its entry goes in [`lessons-learned.md`](lessons-learned.md) and
the **% complete** here and in `journeys.md` is updated.

Effort is in days and matches `journeys.md`; a journey's % complete is the share of its slices
that are done, and the total is weighted by effort.

## 1. Scaffolding (Both) — 5 days — 100% complete

Designs: [present-app-shell](detailed-designs/platform/present-app-shell/README.md),
[enforce-access](detailed-designs/platform/enforce-access/README.md),
[handle-member-data](detailed-designs/platform/handle-member-data/README.md),
[fail-clearly-and-operate](detailed-designs/platform/fail-clearly-and-operate/README.md).

| # | Slice | L2 | Done |
|---|---|---|---|
| 1.1 | Frontend workspace, libraries and lint boundaries; the home page shows the christian.rent wordmark | L2-023 | Yes |
| 1.2 | Foundations (tokens, self-hosted fonts, reset); `cr-logo`, `cr-site-header`, `cr-skip-link`, light and dark, phone to desktop | L2-023, L2-031, L2-032, L2-036 | Yes |
| 1.3 | `NotFoundPage` for an unknown address, and the `TitleStrategy` | L2-033, L2-036 | Yes |
| 1.4 | `LoadState<T>`, `GlobalErrorHandler`, `ApiError` and `apiErrorInterceptor` | L2-025, L2-033 | Yes |
| 1.5 | Backend solution, health endpoints, first acceptance test through the API | L2-034 | Yes |
| 1.6 | Fallback policy (401 `not_signed_in`); ProblemDetails for validation and unhandled errors | L2-025, L2-026, L2-033 | Yes |
| 1.7 | HTTPS redirect, HSTS, CSP; cross-site writes refused | L2-026, L2-027 | Yes |
| 1.8 | Rate limits: 120 reads and 30 writes a minute, 429 with Retry-After | L2-027 | Yes |
| 1.9 | Telemetry through `TelemetryScrubber` | L2-028, L2-034 | Yes |
| 1.10 | `ChristianRent.Cli migrate` and `seed` | L2-034 | Yes |
| 1.11 | `tools/verify/verify.mjs`, CI, the README's commands | — | Yes |

## 2. Browse listings (Main) — 4 days — 100% complete

Design: [browse-listings](detailed-designs/browse/browse-listings/README.md).

| # | Slice | L2 | Done |
|---|---|---|---|
| 2.1 | `BrowseListingsQuery` returns the first page of approved listings, newest first; a page size above 50 is refused | L2-001, L2-030 | Yes |
| 2.2 | Browse shows the headline, the two posting buttons and the first page as cards (for rent with photo, wanted as a card) | L2-001, L2-005, L2-022 | Yes |
| 2.3 | Loading skeleton (none within 300 ms), error with "Try again", nothing yet | L2-033 | Yes |
| 2.4 | Loading more on scroll with a bounded `ListingWindow` | L2-006, L2-030 | Yes |
| 2.5 | Card photos sized, reserved and lazy below the fold; columns at 576, 768, 992 and 1200 px | L2-029, L2-031 | Yes |

## 3. Search and filter listings (Main) — 4 days — 100% complete

Design: [search-and-filter-listings](detailed-designs/browse/search-and-filter-listings/README.md).

| # | Slice | L2 | Done |
|---|---|---|---|
| 3.1 | Switch between Everything, For rent and Wanted, with counts, kept in the address | L2-002 | Yes |
| 3.2 | Search by words (`SearchNormalizer`), debounced, kept in the address | L2-003, L2-026 | Yes |
| 3.3 | Spaces, things or both, kept in the address | L2-035 | Yes |
| 3.4 | No results offers to post a request for the search | L2-004 | Yes |

## 4. Read a listing (Main) — 4 days — 100% complete

Design: [read-listing](detailed-designs/listing/read-listing/README.md).

| # | Slice | L2 | Done |
|---|---|---|---|
| 4.1 | `GetListingQuery` with `ListingVisibility`: an approved listing, or 404 that reveals nothing | L2-007, L2-025 | Yes |
| 4.2 | Listing screen: gallery, description, price, where and when | L2-007, L2-022, L2-024 | Yes |
| 4.3 | Who posted it and their church, each marked Verified only when verified | L2-008 | Yes |
| 4.4 | Loading, error, not found; the message box beside the listing from 768 px | L2-031, L2-033 | Yes |

## 5. Become a member (Main) — 5 days — 100% complete

Design: [become-member](detailed-designs/members/become-member/README.md).

| # | Slice | L2 | Done |
|---|---|---|---|
| 5.1 | `GET /api/churches` and `GET /api/members/me` | L2-017, L2-025 | Yes |
| 5.2 | `JoinCommand` creates an unverified member and a review item | L2-017, L2-028 | Yes |
| 5.3 | `MemberGate` and `JoinDialog` with `JoinFormValidator` | L2-009, L2-015, L2-032 | Yes |
| 5.4 | `Session` shows the member's initials in the header | L2-036 | Yes |

## 6. Post a listing (Main) — 7 days — 100% complete

Designs: [compose-listing](detailed-designs/post/compose-listing/README.md),
[publish-listing](detailed-designs/post/publish-listing/README.md).

| # | Slice | L2 | Done |
|---|---|---|---|
| 6.1 | Post screen with the plain header and the sentence's word toggles | L2-009, L2-036 | Yes |
| 6.2 | The fields and `ListingDraftValidator`; the draft kept in `DraftStore` | L2-010, L2-032 | Yes |
| 6.3 | Live preview of the card beside the form from 768 px | L2-011, L2-031 | Yes |
| 6.4 | `PostListingCommand` with its validator and `PostingLimit` | L2-010, L2-012, L2-025 | Yes |
| 6.5 | "Sent for review" confirmation; a failed publish keeps everything | L2-012, L2-033 | Yes |

## 7. Add photos to a listing (Main) — 5 days — 100% complete

Design: [add-photos](detailed-designs/post/add-photos/README.md).

| # | Slice | L2 | Done |
|---|---|---|---|
| 7.1 | `UploadPhotoCommand` with `PhotoRules`, `IPhotoInspector` and `IPhotoProcessor`: renditions without metadata stored through `IPhotoStorage` | L2-014, L2-025 | Yes |
| 7.2 | Refusals by type, size and dimensions, each with its code; a person who is not a member is refused | L2-014, L2-025 | Yes |
| 7.3 | `GetPhotoQuery` serves a photo to its uploader, its poster or an admin; `DeletePhotoCommand` for one's own unattached photo | L2-014, L2-025 | Yes |
| 7.4 | `PostListingCommand` attaches the member's own photos in order; `purge-photos` deletes unattached ones after 24 hours | L2-013, L2-014, L2-025 | Yes |
| 7.5 | Photo picker: add a photo, see it uploading, then in the picker and the preview | L2-013, L2-029 | Yes |
| 7.6 | Refused, not reached and full states; remove and cancel; object URLs and uploads released on leaving | L2-013, L2-014 | Yes |

## 8. Send a message (Main) — 4 days — 100% complete

Design: [send-message](detailed-designs/messages/send-message/README.md). Where a member reads
a message waits for the Messages inbox, which is not designed (L2-016, criterion 2; ADR 0022).

| # | Slice | L2 | Done |
|---|---|---|---|
| 8.1 | `SendMessageCommand` and its handler store a `Message` for the sender and the person who posted, and change nothing on the listing | L2-015, L2-016, L2-024, L2-025 | Yes |
| 8.2 | `SendMessageCommandValidator`: text of 1 to 1,000 characters; optional dates, both, in order and not past; none on a wanted listing | L2-015, L2-026 | Yes |
| 8.3 | Refusals: a non-member, one's own listing, a listing that is not public, and `MessagingLimit`'s 20 an hour; no text in telemetry; `purge-departed` clears a departed member's messages | L2-015, L2-016, L2-025, L2-028 | Yes |
| 8.4 | `cr-message-box` and `MessageComposer`: dates for a listing for rent, busy while sending, and "Sent to" quoting the message as text | L2-015, L2-022, L2-024, L2-026 | Yes |
| 8.5 | Invalid, failed and limited states keep the text and dates; the draft in `sessionStorage`; a listing taken down | L2-015, L2-016, L2-033 | Yes |
| 8.6 | One's own listing shows no message box; a person who is not a member joins and their message is sent | L2-015, L2-017 | Yes |

## 9. Report a listing (Main) — 3 days — 100% complete

Design: [report-listing](detailed-designs/reports/report-listing/README.md). An admin sees and
decides a report in journeys 10 and 11.

| # | Slice | L2 | Done |
|---|---|---|---|
| 9.1 | `ReportListingCommand` adds a report to the review queue, with its refusals; already reported, told only to the reporter by the Listing read; `purge-departed` and reports | L2-021, L2-025, L2-026, L2-028 | Yes |
| 9.2 | `ReportListingDialog` with its reasons and note, invalid, busy, failed and already states, announced confirmation, and the join dialog first for a person who is not a member | L2-021, L2-032 | Yes |

## 10. View the review queue (Admin) — 4 days — 100% complete

Design: [view-review-queue](detailed-designs/review/view-review-queue/README.md). L2-019
criterion 12, new items while the queue is open, is slice 11.4, with the review toast (ADR 0024).

| # | Slice | L2 | Done |
|---|---|---|---|
| 10.1 | `GET /api/review-queue` and `/{id}`, oldest first, admin only, pages of 50; `grant-admin` | L2-019, L2-025, L2-030 | Yes |
| 10.2 | The `admin` library, `adminGuard` and `ForbiddenPage` | L2-019, L2-025 | Yes |
| 10.3 | `ReviewPage` with the queue, its loading, error and "All caught up" states, held in 3 pages | L2-019, L2-030, L2-033 | Yes |
| 10.4 | The detail panel from 768 px, by kind, with its failed and gone states; the queue only, with a note, below it | L2-019, L2-031, L2-033 | Yes |

## 11. Decide a review item (Admin) — 4 days — 100% complete

Design: [decide-review-item](detailed-designs/review/decide-review-item/README.md).

| # | Slice | L2 |
|---|---|---|
| 11.1 | `DecideReviewItemCommand`: Approve, Keep, Remove, by item kind | L2-019, L2-020 |
| 11.2 | Approve, Keep and Remove in the detail panel; `ConfirmRemoveDialog` | L2-020, L2-032 |
| 11.3 | Toasts after a decision, announced, with `ToastQueue` | L2-032 |
| 11.4 | New items while the queue is open: "2 new items are waiting" with "Show them" | L2-019 |

## 12. Verify members and churches (Admin) — 3 days — 0% complete

Design: [verify-members-and-churches](detailed-designs/members/verify-members-and-churches/README.md).

| # | Slice | L2 |
|---|---|---|
| 12.1 | Approving a new member verifies them | L2-018 |
| 12.2 | `VerifyChurchCommand` confirms a church | L2-018, L2-025 |
| 12.3 | Verified marks follow on Browse and Listing | L2-008, L2-018 |

## Total

| Journeys | Effort (days) | % complete |
|---|---|---|
| 12 | 52 | 94 |
