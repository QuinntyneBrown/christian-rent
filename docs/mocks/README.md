# christian.rent mocks

Static HTML mocks of every screen, dialog and notification of christian.rent, in every state. They
are the design and the source of truth for the UI: the requirements, the detailed designs, the
design system and the code follow them.

They are transcribed from the **Christian Rent** prototype in Magic Patterns (frames Browse,
Listing, Post and Admin) and the **Brand** prototype (frame Brand Sheet). Where they depart from
the prototype, the section *Departures from the prototype* says where and why.

## How to open them

Open [index.html](index.html) from disk; nothing needs a server or a network. Every mock is
responsive (try 360, 768 and 1280 px), has a light and a dark theme, and works with a keyboard.

- `?theme=dark` or `?theme=light` forces a theme; the bar at the bottom toggles it.
- `?chrome=0` hides the mock bar and the yellow notes, leaving the page as the product shows it.
- The bar at the bottom of each mock links the other states of the same screen.

| File | What it is |
|---|---|
| `manifest.json` | The list of screens, their states and the requirements each serves. |
| `../design-system/tokens/tokens.css` | The design tokens. Every colour, size and duration lives there and nowhere else. |
| `../design-system/assets/components.css` | The component stylesheet every mock links. |
| `../design-system/assets/fonts/` | Bricolage Grotesque and Instrument Sans, self-hosted (SIL Open Font License). |
| `assets/tokens.css` | One line that imports the tokens, for the generated gallery. |
| `assets/photos/` | The prototype's sample photos, resized. |
| `assets/mock.css`, `assets/mock.js` | The mock bar and notes. Not product UI. |

## The cast

The prototype's sample listings are the cast, not rules. Every mock uses the same people.

- **Today** is Monday, Jun 8, 2026. **The area** is Langley, BC, within 25 km.
- **Sarah Kim** (SK), Grace Community Church, is the signed-in member looking at the screens.
- **Naomi Friesen** is the admin.

| Listing | Kind | Price | Where | When | Posted by | Church | Verified |
|---|---|---|---|---|---|---|---|
| Sunlit fellowship hall for 80 | for rent, space | $45 / hour | Langley, 3 km | Weekdays and Saturdays | Pastor Dan Whitaker | Grace Community Church | member and church |
| Quiet guest room, month to month | for rent, space | $850 / month | Walnut Grove, Langley, 5 km | Available Jul 1, 2026 | Ruth and Caleb Moore | Willoughby Baptist | member and church |
| Pressure washer and drill kit | for rent, thing | $25 / day | Willoughby, Langley, 6 km | Most weekends | Josh Patel | Cornerstone Church | member and church |
| Vintage camper for mission trips | for rent, thing | $85 / day | Aldergrove, 14 km | Spring through fall | Hannah Brooks | Grace Community Church | member and church |
| 15-passenger van for youth camp | wanted, thing | Up to $120 / day | Murrayville, Langley, 8 km | Jul 14 to 18, 2026 | Marcus Lee | New Song Fellowship | member only |
| Small office for weekly counselling | wanted, space | Up to $300 / month | Fort Langley, 2 km | Tuesdays and Thursdays | Dr. Alicia Gomez | St. Paul's Anglican | neither |
| 120 white folding chairs | wanted, thing | no budget given | Abbotsford, 18 km | Sat, Aug 8, 2026 | Emily Carter | Christ Church | member and church |

The review queue, oldest first: *Backyard garden for gatherings* (new listing, The Okafor family,
Redeemer Presbyterian, $150 / day), *Dr. Alicia Gomez* (new member), *Party bus, cheap, DM for
details* (reported as a scam, Mike Rentals) and *Storage locker for our food bank* (new wanted
listing, Marcus Lee).

On Browse every for-rent card opens `pages/listing/default.html` (the hall) and every wanted card
opens `pages/listing/wanted.html` (the van), except the counselling office, which opens
`pages/listing/unverified.html`.

## Departures from the prototype

Each of these is deliberate. The first group follows `AGENTS.md` and `docs/specs/`; the second is
what accessibility (L2-032) required.

### What the product is

| The prototype | The mocks | Why |
|---|---|---|
| The header has a Messages button with an unread count, and the account's initials open Admin. | The header has the wordmark, the member's initials (not a control) and Post. Admin is reached at its own address. | A Messages inbox and sign-in are not designed yet, and Admin is shown only to an admin (L2-019). |
| On a phone the header and Post show the mark alone. | The wordmark is on every screen at every width. | `AGENTS.md`: the wordmark is on every screen (L2-023). |
| After posting: "You're live! 214 believers within 25 km can see it now." | "Sent for review. Your listing will appear on Browse once an admin has looked at it. It isn't public yet." | A listing is public only once approved (L2-012). |
| After sending a message: "We'll email you at sarah.k@gmail.com", "They usually reply within a few hours", and an "Edit message" link. | "Dan can read your message and reply to you", the message quoted back, and a way back to Browse. | How a message reaches the person is not decided, an email address is a contact detail, a reply time is not something the product knows, and a delivered message cannot be edited. |
| "Edit listing" after posting. | "Post another". | Editing one's own listing ("My listings") is not designed yet. |
| Units of hour, day, night, week and month; sample prices per evening and per chair. | Hour, day, week or month. The camper and the garden are per day; the chairs give no budget. | L2-010. It also shows a wanted listing with no price. |
| Prices as "$45/hour"; dates as "Sat, Jun 14" and "July 14 – 18". | "$45 / hour"; "Sat, Jun 13, 2026" and "Jul 14 to 18, 2026". | L2-022: the period after a spaced slash, and the month as a word with the year. |
| Post has no field for where the thing is; "when" is words only. | Post has a "Where" field (a city or neighbourhood), and "when" can be words or a start and end date. | L2-010. |
| One photo per listing; Post adds or removes one sample photo. | Listing has a gallery of up to 6 photos with thumbnails; Post shows a count, which photo is on the card, the full state, a refused file and an upload in progress. | L2-007, L2-013 and L2-014. |
| One verified tick beside the church, always shown. | "Verified" with an icon, separately for the member and for the church, and only when each is verified. | L2-008 and L2-018. |
| A Share button beside Report; a "More filters" button on Browse. | Neither. | Neither leads anywhere that has been designed. |
| Admin's navigation has Review, Reports, Members and Churches. | Review only. | The review queue is the one Admin screen (L2-019); reports and new members are items in it. |
| Admin shows "median wait 38 min · 61 approved this week" and "14 months · 6 rentals". | "4 waiting · oldest first", and "Member since". | Nothing in the requirements measures these, and no rental is recorded here: no payment and no booking happen on christian.rent. |
| Remove acts at once. | Remove opens a confirmation that names what is removed. | L2-020. |
| The queue shows the newest first. | Oldest first. | L2-019. |
| Listing puts the message box beside the listing from 1024 px. | From 768 px. | `AGENTS.md` and L2-031: beside it on tablet and desktop. The same holds for Post's preview. |
| Cards go to 2, 3 and 4 columns at 640, 1024 and 1280 px. | 1 column under 576 px, 2 from 576, 3 from 768, 4 from 1200. | L2-031 names 576, 768, 992 and 1200 px. At 992 the gutters widen. |

### What accessibility required

| The prototype | The mocks | Why |
|---|---|---|
| "church family." and the Sunrise orange (#FF6B3D) used as text on white, 2.8:1. | Large display text uses a deeper orange (#EB4F1A, 3.7:1) and small orange text #C8431A (4.9:1). The mark and ".rent" in the wordmark keep #FF6B3D. | WCAG 1.4.3. A logo is exempt; a headline is not. |
| Approve is white on #1F8A5B, 4.3:1. | Approve is white on #18744C, 5.8:1. | WCAG 1.4.3. |
| Inputs are edged with the hairline #E3E6EE; placeholders are 50 to 70% opacity. | Inputs are edged with #6F788C (4.4:1); placeholders use the secondary text colour. | WCAG 1.4.11 and 1.4.3. |
| In Post's sentence one highlighted word shows, and pressing it swaps it for the other. | Both words show ("have / need", "a space / a thing") and the chosen one is highlighted; each pair is a radio group. | L2-009: each is a control whose state says which choice is selected. |
| Header buttons are 36 to 40 px; the photo's remove button is 24 px. | Every control is at least 44 × 44 px. | `AGENTS.md` and L2-031. |
| No dark theme. | A dark theme, from the same tokens. | The mock and design-system skills require both themes. Light is the design; dark follows it. |

## Open questions

These are not decided by the prototype or the requirements. The mocks take the most conservative
reading and mark each with a note on the page.

1. **Sign-in.** Not designed. `dialogs/join` asks only for what L2-017 names (a name, a church and
   the declaration) and has no credentials. Sign up, sign in, reset password and sign out have no
   mocks, on purpose.
2. **Where a member reads messages.** Not designed. The sent confirmation does not say where the
   reply arrives, and the member's own listing (`pages/listing/own.html`) says only that messages
   come to them. Until it is designed a message is stored for the two people and shown to
   nobody (ADR 0022). The message box's dates are optional and start empty; Jun 13 is the cast.
   `pages/listing/no-price.html` draws the box of a wanted listing that gave no budget.
3. **Managing one's own listing.** Not designed: no edit, no take down.
4. **Confirming a church.** L2-018 has an admin confirm a church, but the queue holds listings,
   reports and new members. `pages/admin/new-member.html` shows the church's status and no control
   for it.
5. **The area and its distance.** The search bar shows "Langley, BC · within 25 km" as text. How a
   person sets their area, and so how "3 km" is measured, is not designed. The mocks draw the
   distance; until it is designed the product shows the area alone (ADR 0012): "Langley" on a
   card and "Langley, BC" in the search bar.
6. **The Spaces and Things filter** on Browse is in the prototype and the mocks; L2-035 covers it.
   Its choice is kept in the address with the switch and the search term (ADR 0015), and
   `pages/browse/spaces.html` draws it pressed on Spaces.
7. **Admin on a phone** shows the queue only, as `AGENTS.md` says; an admin cannot decide there. The
   mock says so on the page.
8. **Offline** has no mock: nothing in the requirements keeps content for use without a connection.
   A failed request is the error state of each screen.

## Checking and looking

```sh
python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write   # coverage, links, labels; rewrites index.html and the table below
python .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks      # PNGs in docs/mocks/.cache/ (never committed)
```

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | for-rent | wanted | spaces | no-results | more-loading | more-error | edge | no-price | unverified | own | not-found | invalid | submitting | sent | failed | limited | blank | need | dates | success | success-wanted | photos-full | photo-refused | photo-failed | photo-uploading | report | new-member | decided | forbidden | long | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Browse (`browse`) | [✅](pages/browse/default.html) | [✅](pages/browse/loading.html) | [✅](pages/browse/empty.html) | [✅](pages/browse/error.html) | [✅](pages/browse/for-rent.html) | [✅](pages/browse/wanted.html) | [✅](pages/browse/spaces.html) | [✅](pages/browse/no-results.html) | [✅](pages/browse/more-loading.html) | [✅](pages/browse/more-error.html) | [✅](pages/browse/edge.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-001`, `L2-002`, `L2-003`, `L2-004`, `L2-005`, `L2-006`, `L2-022`, `L2-023`, `L2-029`, `L2-031`, `L2-033`, `L2-035` |
| Listing (`listing`) | [✅](pages/listing/default.html) | [✅](pages/listing/loading.html) | ➖ | [✅](pages/listing/error.html) |  | [✅](pages/listing/wanted.html) |  |  |  |  | [✅](pages/listing/edge.html) | [✅](pages/listing/no-price.html) | [✅](pages/listing/unverified.html) | [✅](pages/listing/own.html) | [✅](pages/listing/not-found.html) | [✅](pages/listing/invalid.html) | [✅](pages/listing/submitting.html) | [✅](pages/listing/sent.html) | [✅](pages/listing/failed.html) | [✅](pages/listing/limited.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-007`, `L2-008`, `L2-015`, `L2-016`, `L2-021`, `L2-022`, `L2-024`, `L2-031`, `L2-033` |
| Post (`post`) | [✅](pages/post/default.html) | ➖ | ➖ | [✅](pages/post/error.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/post/invalid.html) | [✅](pages/post/submitting.html) |  |  | [✅](pages/post/limited.html) | [✅](pages/post/blank.html) | [✅](pages/post/need.html) | [✅](pages/post/dates.html) | [✅](pages/post/success.html) | [✅](pages/post/success-wanted.html) | [✅](pages/post/photos-full.html) | [✅](pages/post/photo-refused.html) | [✅](pages/post/photo-failed.html) | [✅](pages/post/photo-uploading.html) |  |  |  |  |  | `L2-009`, `L2-010`, `L2-011`, `L2-012`, `L2-013`, `L2-014`, `L2-022`, `L2-031` |
| Not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-033`, `L2-007` |
| Brand sheet (`brand`) | [✅](pages/brand/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-023` |
| Admin (`admin`) | [✅](pages/admin/default.html) | [✅](pages/admin/loading.html) | [✅](pages/admin/empty.html) | [✅](pages/admin/error.html) |  | [✅](pages/admin/wanted.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin/report.html) | [✅](pages/admin/new-member.html) | [✅](pages/admin/decided.html) | [✅](pages/admin/forbidden.html) | [✅](pages/admin/long.html) | `L2-018`, `L2-019`, `L2-020`, `L2-031` |

### Dialogs

| Screen | default | busy | invalid | failed | success | already | new-church | churches-failed | Requirements |
|---|---|---|---|---|---|---|---|---|---|
| Report a listing (`report-listing`) | [✅](dialogs/report-listing/default.html) | [✅](dialogs/report-listing/busy.html) | [✅](dialogs/report-listing/invalid.html) | [✅](dialogs/report-listing/failed.html) | [✅](dialogs/report-listing/success.html) | [✅](dialogs/report-listing/already.html) |  |  | `L2-021` |
| Confirm Remove (`confirm-remove`) | [✅](dialogs/confirm-remove/default.html) | [✅](dialogs/confirm-remove/busy.html) | ➖ | [✅](dialogs/confirm-remove/failed.html) |  |  |  |  | `L2-020` |
| Become a member (`join`) | [✅](dialogs/join/default.html) | [✅](dialogs/join/busy.html) | [✅](dialogs/join/invalid.html) | [✅](dialogs/join/failed.html) |  |  | [✅](dialogs/join/new-church.html) | [✅](dialogs/join/churches-failed.html) | `L2-009`, `L2-015`, `L2-017`, `L2-021` |

### Notifications

| Screen | info | success | warning | danger | stacked | default | Requirements |
|---|---|---|---|---|---|---|---|
| Review toast (`review-toast`) | [✅](notifications/review-toast/info.html) | [✅](notifications/review-toast/success.html) | [✅](notifications/review-toast/warning.html) | [✅](notifications/review-toast/danger.html) | [✅](notifications/review-toast/stacked.html) |  | `L2-019`, `L2-020` |
| Error toast (`error-toast`) | ➖ | ➖ | ➖ | ➖ |  | [✅](notifications/error-toast/default.html) | `L2-032`, `L2-033` |

<!-- coverage:end -->
9. **Joining.** `dialogs/join` asks only for the name, the church and the declaration. Its title names
   what the person was doing ("Become a member to post", "… to send a message", "… to report"),
   and `churches-failed.html` draws the church field when the list of churches cannot be loaded
   (L2-017, criteria 12 and 13; ADR 0018). In the mocks a dialog's title is the page's `h1`, because the
   page behind it is drawn inert; in the app it is an `h2` over the screen's own `h1`, as the
   design system's dialog page says. The heading and its description use `dialog__heading` and
   `dialog__description` rather than inline styles.
10. **Posting.** The area is free text with its hint; no list of Canadian places is consulted
   yet, and an admin reviews every listing (ADR 0019). Behind the join dialog, the preview of a
   person who is not a member yet shows "Your church" (and "Your name" when wanted), since they
   have no church until they join. The preview formats a price as Browse does, so the invalid
   state draws "$250,000", and the dates state reads its range as a card does, "Jun 20 to Aug
   30, 2026" (L2-022).
11. **Photos.** A photo is added one at a time, and the photos stay in the order they were added:
   the prototype draws no control to reorder them, so none is built until one is drawn (an open
   decision, ADR 0021). The count is of the photos added; one still uploading is not counted
   until it is in. `photo-failed.html` draws what the prototype leaves out: a photo that could not be
   uploaded because christian.rent could not be reached is named, with the advice to try adding
   it again, where a refused one is named with the limits (L2-013, criterion 8). A photo's
   description is an open decision (ADR 0016), so an uploaded photo's text alternative is its
   position, "Photo 1".
