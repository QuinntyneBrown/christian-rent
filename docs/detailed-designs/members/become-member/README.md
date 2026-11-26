# Become a member

## Overview

christian.rent is for Christians. Anyone may browse, search and read a listing. To post, to
send a message or to report a listing, a person first becomes a member: they give their
name, name their church, and declare that they are a Christian. A new member is not
verified and enters the review queue, and may post and message at once.

- **member** — person who uses christian.rent after joining
- **church** — congregation a member belongs to, with a name and a city
- **declaration** — statement "I am a Christian", required to join
- **Join dialog** — dialog titled "Become a member" that collects the three items
- **member gate** — check made before posting, messaging or reporting, which opens the Join
  dialog for a person who is not a member

How a member signs in is not designed yet. This feature designs membership itself and
isolates sign-in behind one interface on each side, so that the sign-in design can be added
without changing the slices that depend on membership.

## Description

**Frontend — `rent` application**

- **`MemberGate`** — `requireMember(): Promise<boolean>`. It reads `SESSION.member()`. For
  a member it resolves `true`. Otherwise it imports `JoinDialog` dynamically, opens it with
  the CDK `Dialog`, and resolves with the result. The dialog code stays out of the initial
  bundle. Post, the message box and the Report button each call it (L2-009 criterion 4,
  L2-015 criterion 5, L2-021 criterion 5).
- **`JoinDialog`** (`rent/src/app/join/`, selector `cr-join-dialog`) — orchestrating dialog
  with states `default`, `new-church`, `busy`, `invalid`, `failed`. Its text says that
  browsing is open to anyone, that posting, messaging and reporting need a member, and that
  what the person has filled in is kept (L2-017, criterion 7). It has three fields: "Your
  name" (`maxlength` 60), "Your church" and the checkbox "I am a Christian" (criterion 9). It
  loads churches from `CHURCHES_API.list()` and shows each as "{name}, {city}". Choosing "My
  church isn't listed" shows the church name (`maxlength` 100) and city fields and the line
  "An admin confirms a new church before it is shown as verified." (criterion 8). In
  `invalid` each missing item is marked and says why (criterion 10). In `busy` the button
  carries `aria-busy` and the fields are read-only; in `failed` an alert says the person was
  not added, the entries stay and the button reads "Try again" (criterion 11). Focus starts
  inside the dialog and returns to the opening control on close; under 640 px the dialog is
  a bottom sheet. "Not now" closes it and changes nothing. The same dialog serves posting,
  messaging and reporting (criterion 12).
- **`JoinFormValidator`** (`domain/`) — name 1 to 60 characters; a chosen church, or a new
  church name of 1 to 100 characters with a city; the declaration checked (L2-017, criteria
  1, 2 and 6).

**Frontend — `api` library**

- **`Session`** with the token **`SESSION`** — `member: Signal<MemberSummary | null>` and
  `refresh()`. `MemberSummary` is `{ id, name, initials, isAdmin, isVerified }`. The site
  header shows the initials (L2-036, criterion 2). `SESSION` is bound in `app.config.ts`, because the whole
  application shares it.
- **`MembersApi`** (`MEMBERS_API`) — `join(request)`, `me()`.
- **`ChurchesApi`** (`CHURCHES_API`) — `list()`.

**Frontend — `components` library**

- **`cr-dialog`**, **`cr-text-field`**, **`cr-select`**, **`cr-checkbox`**, **`cr-alert`**.
  Each field has a visible label and its error tied to it (L2-032, criterion 5).

**Backend**

- **`MembersController`** — `POST /api/members` sends `JoinCommand`; `GET /api/members/me`
  sends `GetCurrentMemberQuery` and returns 204 when the caller is not a member.
- **`ChurchesController`** — `GET /api/churches` sends `ListChurchesQuery` and returns
  `ChurchOptionDto { Id, Name, City }`, ordered by name.
- **`JoinCommand`** — `{ Name, ChurchId?, NewChurchName?, NewChurchCity?, DeclaresChristian }`.
- **`JoinCommandValidator`** — the rules of `JoinFormValidator`. `DeclaresChristian` false
  is refused with `validation_failed`.
- **`JoinCommandHandler`** — returns the existing member when the caller already is one.
  Otherwise it resolves the church: the existing one by `ChurchId`, or a new `Church` that
  is not verified; a new church whose normalized name and city equal an existing one reuses
  it. It creates `Member.Join(name, church, now)` with `IsVerified = false`, adds
  `ReviewItem.ForNewMember(member.Id, now)`, and saves in one unit of work (L2-017,
  criterion 3).
- **`Member`** — stores `Name`, `ChurchId`, `IsVerified`, `IsAdmin`, `Status`, `JoinedAt`
  and the sign-in identifier. It stores nothing else about the person (L2-028, criterion 1).
- **`ICurrentMember`** (`ChristianRent.Application`) — `MemberId`, `IsMember`, `IsAdmin`.
  Every handler that needs a member reads it; a missing member raises
  `ForbiddenException` with the code `not_a_member` (L2-017, criterion 5).

An unverified member posts and messages like any other member; their name shows no verified
mark (L2-017, criterion 4).

**Undecided**

- How a person is identified before and after joining (sign-in, sign-out, the sign-in
  identifier on `Member`, and the contact detail needed "to reach them"): `<TO SUPPLY>`.
  The mocks draw no credentials on purpose.
- `POST /api/members` and `GET /api/churches` are called by a person who is not yet a
  member. L2-025, criterion 5 states that they are not refused for want of membership.
  Whether they require an identified person or are anonymous depends on sign-in:
  `<TO SUPPLY>`.
- The longest city of a new church: the field shows no limit, and L1 lists it as not yet
  decided.
- How a member asks to leave (L2-028, criterion 2): the backend part is designed in
  [handle-member-data](../../platform/handle-member-data/README.md); its screen is
  `<TO SUPPLY>`.

### Mocks

The mocks are the source of truth for the UI of this feature. The states this design covers are:

- [`docs/mocks/dialogs/join/default.html`](../../../mocks/dialogs/join/default.html): name, church and declaration
- [`docs/mocks/dialogs/join/new-church.html`](../../../mocks/dialogs/join/new-church.html): a new church with its name and city
- [`docs/mocks/dialogs/join/busy.html`](../../../mocks/dialogs/join/busy.html): the request is in flight
- [`docs/mocks/dialogs/join/invalid.html`](../../../mocks/dialogs/join/invalid.html): missing name, church or declaration
- [`docs/mocks/dialogs/join/failed.html`](../../../mocks/dialogs/join/failed.html): the request failed; "Try again"

## Requirements

The feature realizes the following level-2 (L2) requirements from
[`docs/specs/L2.md`](../../../specs/L2.md). Each L2 requirement refines a level-1 (L1)
requirement, cited by identifier. The table restates each requirement in `shall` form; the
acceptance criteria in the specification remain authoritative.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-009` | `L1-003` | Post shall open with the sentence "I have / need a space / a thing to rent out", with both words of each pair shown and the chosen one highlighted. Switching "have" to "need" shall make a wanted listing, remove the photos field and change the sentence, the field labels and the button. Each word shall be a named control with a selected state. "A thing" shall be chosen when no kind is given. A person who is not a member shall be asked to become a member or sign in and shall return to Post with their choices kept. |
| `L2-015` | `L1-005` | The Listing screen shall have a message box that sends a message of 1 to 1,000 characters to the person who posted, with start and end dates when the listing is for rent. The box shall name the person who posted, show the price with "CAD" and state that no payment happens here. Invalid fields shall be listed in a summary that takes focus. A confirmation shall replace the message box once sent; it shall quote the message back and shall not say where the reply arrives. A non-member's message and dates shall be kept while they become a member. The message box shall not be offered on a member's own listing. A failed send shall keep the text and dates. |
| `L2-017` | `L1-006` | A person shall become a member by giving their name and their church and declaring that they are a Christian. The church shall be an existing church or a new one with its name and city. A new member shall enter the review queue and shall not be verified. A member who is not verified may post and message. A name longer than 60 characters or a church name longer than 100 shall be refused. One join dialog shall serve posting, messaging and reporting; it shall mark each missing item and keep what was entered when joining fails. |
| `L2-021` | `L1-008` | A member shall be able to report a listing with a reason from a fixed list and an optional note of up to 500 characters. A report with no reason shall not be sent. The report shall enter the review queue and the member shall see a confirmation. A second report by the same member on the same listing shall not be created. The member who posted shall never be told who reported. Report shall not be offered on a member's own listing. |
| `L2-025` | `L1-011` | Every endpoint other than browsing, searching, reading an approved listing and serving its photos shall respond 401 without a signed-in member. Listing the churches and joining shall not be refused for want of membership. The backend shall refuse a request for, or a change to, anything that is not the member's own, and shall reveal nothing about it. A refusal a screen branches on shall be a ProblemDetails with a `code`. |
| `L2-028` | `L1-011` | Only the member's name, church and what is needed to sign in and reach them shall be collected. When a membership is deleted, the member's listings and photos shall no longer be public and their personal data shall be deleted or made anonymous within 30 days. No log, metric or trace shall hold a contact detail, token, message text, query string or request body. |
| `L2-032` | `L1-014` | Every screen shall meet WCAG 2.2 level AA. Every action shall be completable by keyboard with visible focus. A state shall be carried by text or an announced attribute, never by colour alone. Confirmations and errors shall be announced. Every field shall have a visible label with its error tied to it. Reduced motion shall be honoured, and text at 200% shall lose nothing. "Skip to content" shall be the first control, and a dialog shall hold focus and return it on close. |

## Diagrams

### System context

The people involved are: person who is not a member, admin. Each reaches the feature through christian.rent, which takes no payment and holds no booking calendar.

![C4 system context for Become a member](diagrams/c4-context.png)

### Containers

The rent application calls `ChristianRent.Api` over JSON/HTTPS. The API persists state through EF Core.

![C4 container view for Become a member](diagrams/c4-container.png)

### Components

`MemberGate` is the single entry to the Join dialog. `JoinCommandHandler` creates the
`Member`, a `Church` when new, and the `ReviewItem` together. `ICurrentMember` hides how the
caller is identified.

![C4 component view for Become a member](diagrams/c4-component.png)

### Class structure

`Member` belongs to one `Church`; both start unverified. `ICurrentMember` on the backend and
`Session` on the frontend are the two seams behind which sign-in will sit.

![Class diagram for Become a member](diagrams/class-structure.png)

### Behaviour — become a member

The dialog collects the name, the church and the declaration (`L2-017`). The handler
creates the member unverified and adds the review item in the same unit of work.

![Sequence diagram for become a member](diagrams/sequence-join.png)
