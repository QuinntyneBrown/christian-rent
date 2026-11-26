# 0019. What posting a listing does where its design left it open

**Status:** Accepted

## Context

The compose-listing and publish-listing designs and the Post mocks leave a few things open that
journey 6 has to settle:

- how a listing's area is entered, and where the Canadian place names it must be one of come
  from (L2-022, criterion 5; compose-listing marks the source `<TO SUPPLY>`);
- how long the draft is kept in the browser, and when it is cleared;
- whether a start date in the past is refused for "when";
- the photos field, which the design places on Post, while uploading is journey 7's;
- where the preview's church name comes from: `GET /api/members/me` answers the member's name
  but not their church (L2-011, criterion 4);
- what the preview shows in place of the church and the name of a person who is not a member yet;
- what the preview shows for a wanted listing with no budget, and which parts of a card are
  drawn as placeholders;
- what Post says when the general write limit (`rate_limited`, L2-027) refuses a post, as
  against the posting limit (`post_limit_reached`, L2-012);
- how the time posting reopens is written;
- what the screen does with a post that is in flight when the member leaves Post.

## Decision

- **The area.** A free-text field labelled "Where", 1 to 80 characters after trimming and
  single-spacing, with the hint "A city or neighbourhood in Canada. Never a street address."
  No list of Canadian place names is consulted, and no coordinates are stored (ADR 0012). The
  hint asks for a place in Canada, and an admin reads every listing before it is public
  (L2-012), so a listing whose area is not in Canada is removed in review. L2-022, criterion 5
  says so. A list of places is chosen when a person's own area and the distance are designed,
  which is what settles ADR 0012.
- **The draft.** `DraftStore` keeps the draft in `sessionStorage` under `cr.post.draft`, written
  on every change, so it survives the join dialog and a reload, and ends with the tab. It is
  cleared when the listing is sent ("Sent for review") and when the member chooses "Post
  another". A failed or limited post keeps it. Stored content is parsed as data: anything that
  is not a whole, valid draft is ignored and a new draft starts. When Post is opened with
  `offer` or `title` in the address (Browse's buttons and its no-results offer, L2-004 and
  L2-005), those are applied over the kept draft and its other fields stay.
- **Dates.** A start date in the past is not refused; only the order of the two dates is
  (L2-010, criterion 5). The fields are native date inputs.
- **Photos until journey 7.** Post draws the photos field of a listing for rent as the blank
  mock draws it, "Photos 0 of 6" with its help, and its Add button is `disabled` until journey 7
  builds uploading. The draft's photo list stays empty, the request sends no photo identifiers,
  and the backend refuses any identifier it is sent, because no upload exists to own one.
- **The member's church.** `MemberDto` gains `ChurchName`, so `GET /api/members/me` and
  `POST /api/members` answer it, and `SESSION.member()` carries it. The preview takes the church
  from there and, for a wanted listing, the member's name (L2-011, criterion 4).
- **A person who is not a member yet** is asked to join when Post opens (L2-009, criterion 4).
  If they close the dialog, Post stays, with what they chose; the preview shows "Your church"
  and, when wanted, "Your name". Publishing asks again; nothing is sent until they are a member.
- **Placeholders.** An empty title is "Your listing title", an empty area "Your area", and an
  empty price of a listing for rent "Price" (L2-011, criterion 3). The card's `--placeholder`
  modifier, which mutes the title and the price, is set while the title is a placeholder, as the
  blank mock draws it. A wanted listing with no budget shows no price, as Browse shows it
  (L2-010, criterion 4). A price is formatted as Browse formats it, with its thousands separator,
  even while invalid (the invalid mock now draws "$250,000").
- **The preview is not a link.** `cr-listing-card` draws a card with no address as a plain
  block, and takes whether its title is a heading: on Post it is not (the preview sits under the
  heading "How it'll look"); on the confirmation it is the `h2` under "Sent for review".
- **The write limit.** A `rate_limited` refusal (30 writes a minute, L2-027) is shown as the
  error state, "Your listing wasn't posted." with "Try again"; only `post_limit_reached` is the
  limited state. A `validation_failed` refusal, which happens only when the browser's rules and
  the backend's drift apart, is also shown as the error state.
- **When posting reopens** is written from `retryAt` in the browser's time zone as "today at
  3:40 p.m." or "tomorrow at 9:15 a.m." (L2-022, criterion 8); a time further away, which the
  24-hour limit never gives, is written "on Jun 10, 2026 at 9:15 a.m.".
- **Leaving while a post is in flight** aborts the request with the store's `AbortController`.
  The draft is still kept, with its `clientRequestId`, so posting it again creates nothing new if
  the first request had arrived (L2-012, criterion 4): the backend answers the same listing.

## Consequences

- L2-022, criterion 5 is met by the field's hint and the review, not by a list of places; the
  criterion says so. A list of places can be added without changing the draft or the request.
- A draft is not kept across tabs or after the tab closes. Nothing a member types leaves the
  browser until they post.
- Journey 7 enables the Add button, fills the draft's photo list and makes the backend accept
  the member's own uploads; nothing else on Post changes.
- `MemberDto` is answered by joining and by `me`; journey 5's specs and fixtures gain the church
  name.
