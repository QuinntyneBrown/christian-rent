# Feature prompts

One ready-to-run implementation prompt per journey in [`docs/journeys.md`](../journeys.md), written with the
`writing-feature-prompts` skill (`.claude/skills/writing-feature-prompts/`). Each prompt takes its journey from
requirements, mocks and design through test-first incremental implementation to a PR, in one run.

Run them in order: each journey builds on the code the earlier ones leave. Give an agent the whole file as its
prompt, in a fresh session on a branch from `main`.

| # | App | Journey | Prompt |
|---|---|---|---|
| 1 | Both | Scaffolding | [01-scaffolding.md](01-scaffolding.md) |
| 2 | Main | Browse listings | [02-browse-listings.md](02-browse-listings.md) |
| 3 | Main | Search and filter listings | [03-search-and-filter-listings.md](03-search-and-filter-listings.md) |
| 4 | Main | Read a listing | [04-read-a-listing.md](04-read-a-listing.md) |
| 5 | Main | Become a member | [05-become-a-member.md](05-become-a-member.md) |
| 6 | Main | Post a listing | [06-post-a-listing.md](06-post-a-listing.md) |
| 7 | Main | Add photos to a listing | [07-add-photos-to-a-listing.md](07-add-photos-to-a-listing.md) |
| 8 | Main | Send a message | [08-send-a-message.md](08-send-a-message.md) |
| 9 | Main | Report a listing | [09-report-a-listing.md](09-report-a-listing.md) |
| 10 | Admin | View the review queue | [10-view-the-review-queue.md](10-view-the-review-queue.md) |
| 11 | Admin | Decide a review item | [11-decide-a-review-item.md](11-decide-a-review-item.md) |
| 12 | Admin | Verify members and churches | [12-verify-members-and-churches.md](12-verify-members-and-churches.md) |
| 13 | Both | Two applications and sign-in | [13-two-applications-and-sign-in.md](13-two-applications-and-sign-in.md) |

Where the four platform designs in `docs/detailed-designs/platform/` are realised: the shell, access rules,
failure handling and telemetry in journey 1; leaving (L2-028 criterion 2) in journey 5; the two applications,
sign-in and the sessions in journey 13. The Messages inbox, "My listings", sign-up and password reset are not
designed, so no prompt builds them. Journey 13 changed the shape the earlier prompts describe; their rules blocks
now describe the two applications, and journey 12's places its control and endpoint in Admin.

When a journey's requirement, mock or design changes, update its prompt in the same change.
