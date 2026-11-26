# 0023. What reporting a listing does where its design left it open

**Status:** Accepted. Uses the gate and the dialog's title of
[0018](0018-joining-open-decisions.md) and adds to the Listing read of
[0016](0016-listing-screen-open-decisions.md).

## Context

The report-listing design and its mocks leave open what journey 9 has to settle:

- the list of reasons as the API names them (the mock draws four);
- whether a second report is allowed once an admin has closed the first with Keep
  (`<TO SUPPLY>`);
- how a member who selects Report again is told of their earlier report (L2-021, criterion 8)
  without filling in the form first: the design only learns of it from the refusal of a second
  send;
- how that date reaches the screen, which keeps only the `code`, `retryAt` and field errors of
  a refusal;
- how the note is cleaned and counted;
- what a listing that stopped being public, or turns out to be the member's own, does to an
  open dialog;
- what two reports sent at once by one member do;
- what the purge of a departed member does with reports.

## Decision

- **Reasons.** The four of the mock, with its values: `fake` ("Not a real listing"),
  `inappropriate` ("Inappropriate"), `scam` ("A scam") and `other` ("Something else"). The API
  takes and the database keeps the reason as `ReportReason` (`NotARealListing`,
  `Inappropriate`, `Scam`, `SomethingElse`); any other value is `validation_failed`. None is
  chosen in advance.
- **One report for each member and listing, whatever its status.** After a Keep the member
  cannot report the same listing again. This is the design's rule; it is the simplest, and one
  member cannot fill the review queue with one listing.
- **The Listing read says when the caller reported it.** `ListingDetailDto` gains
  `reportedAt`: the time of the caller's own report of this listing, and null for everyone
  else, including a person who is not a member. Selecting Report on a listing the member has
  reported opens the dialog in its `already` state, with no request (criterion 8). After a send
  in the visit, the screen keeps the time it was answered, so it opens the same way. No new
  endpoint is added. Nobody can read another member's report from it, so the poster still
  learns nothing (criterion 4).
- **The refusal carries the date.** A second send, from another tab or by a member who had not
  yet been recognised when the listing was read, is answered 409, `already_reported`, with a
  `reportedAt` extension. `ApiError` keeps it as `reportedAt`, beside `retryAt`. A first report
  is answered 201 with `{ reportedAt }` and nothing else: no identifier and never the note.
- **The date in words** is the browser's local date, as "Jun 6, 2026".
- **The note** is cleaned as a message is (ADR 0022): line endings as `\n`, Unicode form C,
  trimmed. It is at most 500 characters as cleaned, holds no control character but a line break
  or a tab, and is stored as null when empty. The screen's counter counts it the same way, and
  the field stops typing at 500.
- **Order of refusals.** Not signed in (401), not a member (`not_a_member`), a listing that is
  not public or does not exist (`not_found`, to its poster and an admin as well, as for a
  message), the member's own listing (`own_listing`), an earlier report (`already_reported`).
  The reason and the note are validated first, by the pipeline.
- **A listing that changed under the dialog.** On `not_found` or `own_listing` the dialog
  closes and the Listing screen reads the listing again, which says it is not there, or shows it
  without Report (criterion 12). Any other failure, the write limit included, is the `failed`
  state.
- **Two sends at once.** A unique index on `(ListingId, ReporterId)` refuses the second in a
  relational database. When saving fails and the member's report is there after all, the
  handler answers `already_reported` rather than an error.
- **Nothing typed is kept once the dialog closes.** The gate asks a person to join before the
  dialog opens, so nothing is lost to joining; closing the dialog is the member's choice to
  drop what they chose.
- **A member who leaves** (criterion 13). `purge-departed` clears the note of every report the
  departed member sent; the report stays, so the listing is still reviewed. A report about one
  of their deleted listings is deleted with its review item, which would otherwise point at
  nothing. No review item is decided yet; journey 11 keeps decided items.

## Consequences

- `GET /api/listings/{id}` reads one more row for a member.
- The "already" text says the earlier report "is with an admin" even after an admin has kept the
  listing. No mock draws another sentence; journey 11 may add one with its mock.
- Allowing a second report after a Keep needs a new record, a new rule and a change to the
  unique index.
