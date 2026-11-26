# 0004. The file storage for photos

**Status:** Open. Development uses local disk; the production product is not chosen.

## Context

Photos are validated before they are stored and served from storage, never from the database
(`AGENTS.md`). The readiness check must say whether file storage is reachable (L2-034,
criterion 1). The product (an object store, a file share) is an open decision.

## Decision

- `IPhotoStorage` (`ChristianRent.Application`) is the seam. Today it has one member,
  `IsReachableAsync`; the add-photos journey adds saving, reading and deleting.
- `LocalDiskPhotoStorage` (`ChristianRent.Infrastructure`) stores under the directory in
  `PhotoStorage:RootPath` (default `App_Data/photos`, relative to the content root). It is
  reachable when the directory exists or can be created and written.
- Tests replace it with a fake whose reachability a test sets.

## Consequences

- The production product needs only a new `IPhotoStorage` implementation and its settings.
- When photos come from another origin, the CSP's `img-src` names it (handle-member-data).
