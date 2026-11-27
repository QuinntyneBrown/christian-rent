# 0025. How a poster is told that their listing was removed, while there is no inbox

**Status:** Accepted.

## Context

L1-007 and L2-020 (criterion 7) require that the member who posted a removed listing is told.
The Messages inbox and sign-in are not designed, and christian.rent keeps no email address or
telephone number (L2-028), so there is nowhere to tell them. The decide-review-item design left
this `<TO SUPPLY>`, and said that the first implementation of `IMemberNotifier` records the
notice for later delivery.

## Decision

- **A notice is recorded, and nothing is sent.** `RecordedMemberNotifier`
  (`ChristianRent.Infrastructure`) implements `IMemberNotifier` by adding a
  `ListingRemovalNotice` row: its own identifier, the member who posted the listing, the listing
  and the time of the removal. It builds no email, push or other channel.
- **It holds no words and no reporter.** The listing keeps its title, so the notice needs no
  text, and it has no field that could name who reported (L2-021, criterion 4) or which admin
  removed the listing.
- **It is saved with the decision.** The notifier adds the row to the unit of work and does not
  save. A removal and its notice are stored together or not at all (L2-020, criterion 20). A
  channel that sends something must send after the save, from the stored notice.
- **One notice for each removal of a listing.** A reported listing with several reports is
  removed once, so its poster gets one notice. A removed new member gets none: no listing of
  theirs is removed; their listings stop being public with them (L2-018, criterion 4).
- **It goes with the member's data.** `purge-departed` deletes the notices of a departed member.

## Consequences

- **L2-020, criterion 7, is only partly met until something delivers the notices.** The
  confirmation of Remove says, as the mock draws it, that the member "is told"; today they can
  find out only that their listing is no longer public. The work that designs the inbox must
  deliver the recorded notices.
- That work reads `listing_removal_notices` and adds what it needs to mark one delivered.
- A new table, `listing_removal_notices`, and a migration.
