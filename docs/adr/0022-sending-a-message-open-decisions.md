# 0022. What sending a message does where its design left it open

**Status:** Accepted. Fills the message box that [0016](0016-listing-screen-open-decisions.md)
built with its head only, and uses the gate and the dialog's title of
[0018](0018-joining-open-decisions.md).

## Context

The send-message design and the Listing mocks leave open what journey 8 has to settle:

- how a message reaches the person who posted while the Messages inbox is not designed
  (`<TO SUPPLY>`), and whether they are told outside christian.rent (`<TO SUPPLY>`);
- the messaging limit's window, and when sending reopens;
- whether dates are required on a message about a listing for rent, and whose "today" a start
  date is compared with;
- how the text of a message is cleaned and counted;
- what the purge of a departed member does with messages (handle-member-data left the received
  ones `<TO SUPPLY>`);
- what the box shows for a wanted listing that gave no price, which ADR 0016 left to this
  journey, and for the member's own listing, which the design and the `own` mock describe
  differently;
- where the sent confirmation is drawn: the design names `cr-confirmation`, and the `sent` mock
  draws it inside the message box;
- how the dates are read in words, and how the message is quoted back;
- how long a message that was typed and not sent is kept;
- what the screen does with a refusal other than the messaging limit, and with a message in
  flight when the member leaves.

Three mocks also disagreed with the rest: `failed.html` named its box "Try again about this
listing", `invalid.html` wrote its count as a word and listed the message before the dates, and
no mock drew a wanted listing with no price.

## Decision

- **Holding a message.** `POST /api/listings/{listingId}/messages` stores a `Message` with its
  listing, its sender, its recipient (the member who posted), its text, its dates and when it
  was sent. That is the whole delivery until the Messages inbox is designed: no endpoint returns
  a message, nothing is sent by email or any other channel, and nobody is notified. The rule for
  who may read one, `Message.CanBeReadBy`, is written and tested now, so the inbox applies it
  from its first query. `MessageDto`, the shape a reader receives, is built with the inbox
  (L2-016, criterion 2 says it waits). The answer to sending is `201` with the message's
  identifier and when it was sent, and never its text.
- **What a message may be about.** An approved listing whose poster is an active member. Any
  other listing (missing, waiting for review, removed, of a member who left or was removed, or
  an address that is not an identifier) is answered `not_found`, to its own poster and to an
  admin as well, so nothing about it is revealed. The poster of an approved listing is refused
  with `own_listing`.
- **The limit.** At most 20 messages per member in any 60 minutes, counted from the messages
  stored. The twenty-first is refused with 429, `message_limit_reached` and `retryAt`: when the
  twentieth most recent is an hour old. The screen writes it as Post writes its own limit,
  "You can send another today at 3:40 p.m." (ADR 0019), keeps the send button off, and turns it
  back on by itself at that time. A second message about the same listing is allowed; only the
  limit bounds it.
- **Dates are optional.** A message about a listing for rent may give no dates ("When is it
  free?"). When one is given the other must be; the end is on or after the start; and the start
  is not in the past. The browser compares the start with its own date. The backend, whose clock
  is UTC, accepts a start from the day before its own date: every Canadian time zone is behind
  UTC, so a member's today is the backend's date or the day before. Dates on a message about a
  wanted listing are refused with `validation_failed`. The fields start empty; the mocks' Jun 13
  is the cast.
- **The text.** Line endings become `\n`, the text is put in Unicode form C and trimmed, and is
  then 1 to 1,000 characters. A control character other than a line break or a tab is refused by
  the backend and taken out by the browser before sending, so a member never meets the refusal.
  The text is stored and rendered as text (L2-026) and appears in no log, metric or span.
- **A member who leaves.** `purge-departed` clears the text of every message the member sent
  (the message stays, empty, so the other person's side keeps its shape once there is an inbox)
  and deletes the messages about the member's listings together with those listings. That
  settles the received ones: a received message is always about one's own listing.
- **No price.** A wanted listing that gave no price shows the box without its head: the hidden
  heading, the message field, the button and the fine print (`pages/listing/no-price.html`,
  L2-015 criterion 13).
- **One's own listing.** The box is drawn as the `own` mock draws it: the price, "This is your
  listing." and "Members who are interested send you a message from here.", with no form
  (L2-015, criterion 6). `cr-message-box` has that as a mode; the page does not hide the panel.
- **The confirmation is the box's own.** The `sent` mock draws "Sent to Dan" inside the message
  box (`message-box__sent`), smaller than Post's full-screen `cr-confirmation`, so
  `cr-message-box` draws it itself as a `status` region. Focus moves to its title, which is how
  a screen reader announces it (L2-032, criterion 4); no `LiveAnnouncer` is loaded for it.
- **Dates in words.** One day reads "Sat, Jun 13, 2026 · one day"; a range reads as a card
  writes it, with the days it spans counting both ends: "Jun 13 to 15, 2026 · 3 days". The
  confirmation quotes the dates without the count, then the text in quotation marks: "Sat, Jun
  13, 2026 · “Hi Dan, …”"; with no dates, the text alone. Line breaks in the quote are kept.
- **Errors.** An empty or too-long message says "Write a message of 1 to 1,000 characters.";
  an end before the start, "The end date is before the start date. Choose Jun 13, 2026 or
  later."; a start in the past, "The start date is in the past. Choose Jun 8, 2026 or later.";
  one date without the other, "Choose a start and an end date." The summary is titled "1 thing
  needs fixing before this can be sent." or "2 things need …", as Post writes its own, and lists
  the fields in the form's order: the dates, then the message.
- **The draft.** The text and dates are kept in `sessionStorage` under
  `cr.message.draft.{listingId}`, written on every change and removed when they are empty or the
  message is sent. So they survive the join dialog and a reload, are still there when the member
  comes back to the listing in the same tab, and end with the tab (L2-015, criteria 5 and 14).
  What is stored is read as data: anything that is not three strings is ignored.
- **Other refusals.** `not_found` (the listing was taken down while the member wrote) reloads
  the listing, which shows "This listing isn't here."; the draft is still kept. Anything else,
  the general write limit (`rate_limited`, L2-027) and `validation_failed` included, is the
  failed state: "Your message wasn't sent." with "Try again".
- **Leaving while a message is in flight** aborts the request. The draft is kept. A message has
  no client request identifier, so if the request had arrived and the member sends again, the
  person who posted receives it twice; a second message is allowed anyway, and the limit counts
  both.
- **The mocks.** `failed.html` is named "Message Dan about this listing"; `invalid.html` reads
  "2 things need fixing before this can be sent." with the dates first; `no-price.html` is new.

## Consequences

- Nothing a member sends can be read by anyone through the product until the inbox is built; the
  messages wait in the database, and the sent confirmation promises only that the person "can
  read your message and reply", without saying where (the mocks' README, open question 2). The
  inbox should follow soon after launch, or the promise is empty.
- The inbox journey adds the read endpoints and `MessageDto`, and decides how a cleared message
  is shown. It changes nothing about sending.
- A start date is accepted by the backend up to a day after it has passed in the member's own
  time zone; the browser is the stricter of the two.
- The `messages` table grows without a limit of its own; how long messages are kept is decided
  with the inbox.
