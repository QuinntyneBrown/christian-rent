# 0015. How a search matches, and Browse's query in the address

**Status:** Accepted

## Context

L2-003 asks Browse's search to find approved listings by the words in their title, note and
area, without regard to letter case or accents, using at most the first 100 characters of a
term, with every query parameterised (L2-026, criterion 2) and a search answered within 300 ms
at the 95th percentile over 10,000 approved listings (L2-030, criterion 1). The database is
PostgreSQL in development and open for production ([ADR 0003](0003-database-engine.md)); every
test runs on EF Core InMemory ([ADR 0007](0007-test-approach.md)), so the matching has to mean
the same on both.

L2-002 keeps the switch and the term in the address. L2-035 adds Spaces and Things; L1 and the
search-and-filter design left open whether that choice is kept in the address too, and what
Browse shows when a choice holds nothing and no term is entered.

## Decision

- **Normalised text.** `SearchNormalizer` (`ChristianRent.Domain`) lower-cases with the
  invariant culture, decomposes to Unicode form D and drops the combining marks, so "Église"
  and "eglise" are one word. `Listing.SearchText` holds the normalised title, note and area,
  separated by spaces, and the entity sets it whenever one of the three is set. Nothing else
  writes it.
- **Words.** `SearchNormalizer.Words(term)` takes the first 100 characters of the term,
  normalises them and splits them on white space. The handler adds one
  `SearchText.Contains(word)` predicate per word, so every word has to appear, and a word
  matches inside a longer one ("park" finds "parking"). EF Core sends each word as a
  parameter; no SQL is built from the term. A term of only white space is no term.
- **Engine.** On PostgreSQL `Contains` becomes a parameterised `LIKE` (or `strpos`), which a
  `pg_trgm` GIN index on `search_text` serves; the migration enables the extension and adds the
  index. InMemory compares the same lower-cased, unaccented strings in .NET, so the tests and
  the engine agree. Measuring the 300 ms against a real engine stays outside the automated
  suites (ADR 0007).
- **The API.** `GET /api/listings` takes `show` (`for-rent` or `wanted`; absent means
  everything), `kind` (`space` or `thing`; absent means all) and `q`, beside `cursor` and
  `size`. An unknown `show` or `kind` is refused with `show_invalid` or `kind_invalid`; a term
  longer than 100 characters is cut, not refused (L2-003, criterion 4). The counts on the page
  are for the term and the kind, by offer, so the switch shows what each of its options holds.
  The keyset cursor ([ADR 0013](0013-browse-paging-and-window.md)) is unchanged: filters do
  not change the order.
- **The address.** Browse's address holds `show`, `kind` and `q`; a default is omitted, so `/`
  is Everything, All and no term. The choice of Spaces or Things is kept in the address as the
  switch and the term are (L2-035, criterion 5), so a reload, the back button or a shared link
  restores all three.
- **A choice that holds nothing.** With a term, Browse shows the no-results state (L2-004).
  Without one, it shows the empty state of `docs/mocks/pages/browse/empty.html`, with the two
  posting buttons, whatever the switch and the kind filter say; the counts on the switch show
  where the listings are.
- **Telemetry.** The route is recorded as its template, and the query string never reaches a
  log, a metric or a span ([`TelemetryScrubber`](../../backend/src/ChristianRent.Api/Telemetry/TelemetryScrubber.cs));
  an acceptance test proves it for a search.

## Consequences

- A migration adds `listings.search_text`, fills it for the listings already there, enables
  `pg_trgm` and adds the GIN index. Choosing another engine means choosing its equivalent of a
  trigram index; nothing above `Infrastructure` changes.
- Matching is by substring, not by stem or synonym: "chairs" finds "chair", "chair" finds
  "chairs", but "seat" does not find "chair". A ranked full-text search is a later decision.
- The term is cut at 100 characters in the browser (`maxlength`, `BrowseQuery.withTerm`) and
  again on the server, so an address written by hand cannot send more.
