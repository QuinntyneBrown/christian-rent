# 0012. A listing's area, shown without a distance

**Status:** Open. The area is stored as its name; how a person's own area is set, and so the
distance, is not decided.

## Context

L2-001, criterion 9 puts the distance from the person's area after a card's area, for example
"Langley · 3 km". How a person sets their area, and so how the distance is measured, is an open
decision (`docs/detailed-designs/README.md`; mocks, open question 5). L2-010 asks only for an
area, labelled "Where": a city or neighbourhood in Canada, never a street address (L2-022,
criterion 5).

## Decision

- `Listing.Area` is the place's name as the member wrote it, at most 80 characters, for example
  "Walnut Grove, Langley". No coordinates are stored; nothing exact about where a listing is
  can leak through the API.
- `ListingCardDto.DistanceKm` is part of the contract and is always null until this record is
  settled. `cr-listing-card` shows the area alone when the distance is null ("Walnut Grove,
  Langley"), and "Walnut Grove, Langley · 5 km" once a distance is given.
- The copy that names the launch area ("near Langley, BC" in Browse's headline and empty state)
  stays as the mocks write it.

## Consequences

- L2-001, criterion 9 is met only once this record is settled; the requirement says so.
- What settles this record: how a person's area is set (a choice, the browser's location, a
  member's church), the source of Canadian place names and their coordinates, and how a
  listing's area becomes a point to measure from. The card needs no change then.
