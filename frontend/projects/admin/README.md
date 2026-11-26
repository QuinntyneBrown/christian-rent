# @rent/admin

Admin: what the people who review use. Its pages, their stores and their routes are here, so
that they are downloaded only by an admin: `rent` imports this library in one place, the lazy
`/admin` route behind `adminGuard` (L2-018, criterion 3; `AGENTS.md`). Never import it from
anywhere else.

Depends on `@rent/components`, `@rent/api` and `@rent/domain`, and never on `rent`.
