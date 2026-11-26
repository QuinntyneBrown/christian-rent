# 0016. What the Listing screen shows where its design left it open

**Status:** Accepted. Leaves [0012](0012-area-without-distance.md) Open: the distance still waits
for it.

## Context

The read-listing design (`docs/detailed-designs/listing/read-listing/`) and its mocks leave a few
things open that the Listing screen (journey 4) has to show one way or another:

- The distance after the area ("Langley · 3 km", L2-007 criterion 6) needs a person's area, which
  ADR 0012 leaves open.
- The mocks draw a gallery of three photos and a wanted listing with none. They do not draw a
  listing for rent with one photo, or with none (Post lets a listing for rent go without a photo
  until journey 7 says otherwise).
- The large photo's text alternative is the photo's description (L2-007 criterion 7), and who
  writes that description is `<TO SUPPLY>`: Post has no field for one yet.
- "Posted 2 days ago" needs a moment to count from, and words for each span.
- The avatar's initials and tint: the design system says a member keeps the same tint
  everywhere, but not how it is chosen.
- The price sits in the message box's head (L2-022 criterion 9), and the message box is journey 8.
- The page title should name the listing, which is known only once it has loaded.

## Decision

- **Distance.** The listing shows its area alone, as Browse's card does, while ADR 0012 is Open.
  `ListingDetailDto.DistanceKm` is part of the contract and is null; `formatPlace` adds
  "· 3 km" once it is not. L2-007 criterion 6 says so.
- **One photo, or none.** With one photo the gallery shows it large, with no thumbnails and no
  count, because there is nothing to step through. A listing for rent with no photo shows
  "No photo yet" in the photo's 16:10 place, as its card does on Browse. The mock
  `pages/listing/edge.html` and the gallery's design-system page draw both.
- **Renditions.** The large photo is the `gallery` rendition (1600 × 1200) and is loaded first,
  because it is the screen's largest content; each thumbnail is the `thumb` rendition
  (240 × 180) (ADR 0011). `ChristianRent.Cli seed` now writes the `gallery` and `thumb`
  renditions of the sample photos too, and gives the hall the three photos of the mock's
  gallery. The mocks' photos are 800 px wide, so a sample photo's `gallery` rendition is its
  800 × 600 card file; its thumb is made once at 240 × 180 and embedded beside it.
- **Text alternative.** The large photo's `alt` is the photo's description. While nobody can
  write one (journey 7 decides who does), a photo without one is described by the listing's
  title and its position: "Sunlit fellowship hall for 80, photo 2 of 3". Thumbnails keep an empty
  `alt` and the name "Photo 2 of 3".
- **Posted.** "Posted" counts from `Listing.CreatedAt`, the moment the member posted it, which
  the response carries as `postedAt`. `formatAge` in `@rent/domain` writes "just now" under a
  minute, then minutes, hours, days (under 7), weeks (under 30 days), months (under 365 days)
  and years, each "1 day" or "2 days", always rounded down: "Posted 2 days ago".
- **Initials and tint.** `initialsOf` in `@rent/domain` takes the first letters of the first two
  words of the member's name, skipping "Pastor", "Dr." and "The", as the avatar page says.
  `avatarTint` picks one of the three tints from a stable hash of the name, so the same name has
  the same tint on every screen. Neither is sent by the API: both follow from the name it sends.
- **Price.** `cr-message-box` is built now with its head only: the visually hidden heading,
  "Rent for" or "They'll pay", and the price with its currency ("$45" and "CAD / hour", "Up to
  $120" and "CAD / day", "Free"). Journey 8 adds the form and its states. A wanted listing that
  gave no price has nothing in the box yet, so the box is not shown until journey 8 gives it a
  form.
- **Title.** The route's title is "Listing" while the listing loads. Once it has loaded,
  `ListingPage` sets the document title to the listing's title through `RentTitleStrategy`
  ("Sunlit fellowship hall for 80 · christian.rent"); an unknown listing's title is
  "Listing not found". The title is set as text.
- **An address that is not an identifier.** `/api/listings/{id}` answers an id that is not a
  GUID with the same 404 `not_found` ProblemDetails as an unknown one, so the API's answer never
  depends on what the address looks like.

## Consequences

- When ADR 0012 is settled, the listing gains its distance with no change to the screen.
- Journey 7 decides who writes a photo's description; the fallback text goes once every photo
  has one.
- Journey 8 fills `cr-message-box` below its head and shows it for a wanted listing with no
  price.
- A member's tint depends on their name: a member who changes their name may change tint.
  Nothing else depends on it.
