# 0013. Browse's paging and its window of pages

**Status:** Accepted

## Context

Browse loads 24 listings at a time and more as the person reaches the end of the list (L2-006);
a list endpoint refuses a page size above 50 (L2-030, criterion 3), and memory in the browser
stays bounded while a person scrolls 500 listings (criterion 4). The browse-listings design names
the page size (24), the window (3 pages) and a keyset cursor; L1 leaves open whether "newest
first" counts from posting or from approval.

## Decision

- **Order.** Newest first counts from approval: `ApprovedAt` descending, then `Id` descending.
  A listing that waited in the review queue enters at the head of the list when it is approved,
  and the order never changes under a person who is scrolling.
- **Keyset paging.** `GET /api/listings?cursor=&size=` takes `size` from 1 to 50 (default 24)
  and refuses anything else with `page_size_out_of_range`. The cursor is `ListingCursor`, the
  `(ApprovedAt, Id)` of the last listing of a page, base64url-encoded; a cursor that does not
  decode is refused with `cursor_invalid`. The handler reads `size + 1` rows to learn whether a
  next page exists, so it never counts the table to page it. Each page also carries the counts
  of approved listings (everything, for rent, wanted), which the status line announces.
- **The window.** `ListingWindow` (`@rent/domain`) keeps the items of at most 3 consecutive
  pages, 72 cards. Every page it has seen is a slot that keeps only the cursor that requested it
  and, once released, its measured height. When a fourth page arrives at one end, the page at
  the other end is released and a spacer of its height takes its place, so the scroll position
  holds. Reaching a spacer requests that page again by its cursor. The slots grow by a cursor
  and a number per 24 listings; the listings, their DOM and their photos stay bounded.
- **Requests.** Each request has its own `AbortController`; leaving Browse aborts the request in
  flight and disconnects the observers.

## Consequences

- The database needs an index on `(Status, ApprovedAt, Id)`; the migration adds it.
- A listing approved while a person scrolls appears only when they reload Browse.
- Scrolling back over released pages costs a request per page, which the 120 reads a minute
  (L2-027) allow for.
