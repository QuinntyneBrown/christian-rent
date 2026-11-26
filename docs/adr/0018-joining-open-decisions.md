# 0018. What joining does where its design left it open

**Status:** Accepted

## Context

The become-member design and its mocks leave a few things open that journey 5 has to settle:

- how a new church is matched with one that already exists (L2-017, criterion 2; the design
  says "a new church whose normalized name and city equal an existing one reuses it" without
  saying what normalised means);
- the longest city of a new church, which L1 lists as not yet decided;
- the dialog's title when it opens for a message or a report: the mocks draw "Become a member
  to post" only, yet one dialog serves all three (criterion 12);
- what the church field shows when the list of churches cannot be loaded;
- where the gate is driven from in the behaviour specs, since Post, the message box and Report,
  its callers, are built by journeys 6, 8 and 9.

## Decision

- **Matching a church.** `ChurchMatch.KeyOf(name, city)` (`ChristianRent.Domain`) trims each
  part, collapses runs of white space to one space and normalises it as a search does
  (`SearchNormalizer`: lower case, no accents; ADR 0015), and joins the two with a separator
  that cannot be typed. `Church.MatchKey` stores it, with a unique index in place of the one on
  `(Name, City)`. A new church whose key equals an existing church's is that church; otherwise
  a new, unverified church is entered with the name and city as typed (trimmed, single-spaced).
  Punctuation is kept: "St. Paul's" and "St Pauls" are two churches until an admin merges them,
  which is not designed.
- **Limits.** A member's name takes 1 to 60 characters, a church's name 1 to 100 and its city
  1 to 80, after trimming. `Member.MaxNameLength` and `Church.MaxNameLength` become 60 and 100,
  and the columns follow. The dialog's fields carry the same `maxlength`.
- **Title.** `MemberGate.requireMember(purpose)` takes `'post'`, `'message'` or `'report'`, and
  the dialog's title reads "Become a member to post", "Become a member to send a message" or
  "Become a member to report". Its description is the same for all three.
- **Churches that fail to load.** The dialog asks for the churches when it opens. If they
  cannot be loaded, the church field keeps "Choose a church" and "My church isn't listed", says
  "We couldn't load the list of churches. Try again, or choose “My church isn't listed” to enter
  yours." and offers "Try again" (L2-017, criterion 13; the mock
  `dialogs/join/churches-failed.html`). While they load the field offers the same two options.
- **Driving the gate in the specs.** The `e2e` build configuration of `rent` replaces
  `dev-routes.ts` (no routes) with `dev-routes.e2e.ts`, which adds `/dev/member-gate`: a host
  page with the site header and three buttons that call `MemberGate` for each purpose and say
  what it answered. Playwright serves the app with `--configuration e2e`; the production and
  development builds contain no such route. It goes once journeys 6, 8 and 9 call the gate.

## Consequences

- Two members who type the same church with different capitals, accents or spacing share it;
  an admin verifies it once (L2-018, criterion 2).
- Two people entering the same new church at the same moment can collide on the unique index;
  the second join then fails and is retried by "Try again", which finds the church.
- The host page is test code inside the app's source tree, kept out of every shipped build by a
  file replacement, as the backend's probe controller is kept in its test project.
