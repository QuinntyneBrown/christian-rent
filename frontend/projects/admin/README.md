# @rent/admin

Admin: the review queue (view-review-queue design). `rent` loads it only through the lazy
`/admin` route, after `adminGuard` has matched, so its code is downloaded by an admin alone
(L2-019, criterion 5; ADR 0024). It depends on `@rent/components`, `@rent/api` and
`@rent/domain` (`AGENTS.md`).
