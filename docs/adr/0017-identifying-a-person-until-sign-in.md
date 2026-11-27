# 0017. How a person is identified before and after joining, until sign-in is designed

**Status:** Accepted. Builds on [0005](0005-authentication-seam.md), which it does not replace. Amended by [0029](0029-sign-in-and-two-sessions.md): sign-in exists, with its screens and a sign-in control in the header; the rest stands.

## Context

Becoming a member (journey 5, `docs/detailed-designs/members/become-member/`) needs to know who
is joining: a person who is signed in but not yet a member asks to join, and from then on is the
member they became. Sign-in is not designed, and `AGENTS.md` forbids building it before its
design exists. The design left three things `<TO SUPPLY>`:

- how a person is identified before and after joining, and what the sign-in identifier on
  `Member` is;
- whether listing the churches (`GET /api/churches`) and joining (`POST /api/members`) are
  exceptions to L2-025 criterion 1, which answers 401 to anyone not signed in;
- the test authentication handler the acceptance tests use for a person who is not a member.

ADR 0005 already gives one scheme, `NoSignIn`, that signs nobody in, and an `ICurrentMember`
that reads the claim `member_id`. It assumed that whoever is signed in is a member.

## Decision

- **No sign-in screen is built.** No sign-up, sign-in, sign-out or password screen, no contact
  field, and no sign-in control in the header (L2-036, criterion 5). Production keeps
  `NoSignIn`: nobody can sign in, so joining answers 401 until sign-in is designed.
- **A signed-in person is a principal with a `sub` claim.** Whatever scheme sign-in brings, it
  identifies the person with an opaque sign-in identifier in the claim `sub` (up to 200
  characters). That identifier is all the backend learns from sign-in.
- **`Member.SignInId`.** Joining stores the caller's `sub` on the new member, as the one field
  "needed to sign in" (L2-028, criterion 1). It is unique among members. The contact detail
  "needed to reach them" waits for sign-in and the Messages inbox; nothing else is stored.
- **From sign-in to member.** `MemberClaimsTransformation` (`ChristianRent.Infrastructure`, an
  `IClaimsTransformation`) runs once a principal is authenticated. For a `sub` with no
  `member_id` yet, it looks up the **active** member with that `SignInId` and adds the claim
  `member_id` and, when `Member.IsAdmin` is set, the role `admin`. `HttpCurrentMember` keeps
  reading those claims (ADR 0005) and adds `SignInId`, read from `sub`. So `IsMember` means an
  active member, and a member who left or was removed is no longer one (403 `not_a_member`
  where a member is needed).
- **Not exceptions to L2-025 criterion 1.** `GET /api/churches`, `POST /api/members` and
  `GET /api/members/me` need a signed-in person, as every endpoint does under the fallback
  policy, and do not need a member (L2-025, criterion 5). Without sign-in they answer 401
  `not_signed_in`; `GET /api/members/me` answers 204 to a signed-in person who is not a member.
  The church list is not opened to anyone: it holds names that members typed and that no admin
  has looked at yet.
- **Leaving unlinks sign-in at once.** `Member.Depart(now)` sets `Status = Departed`,
  `DepartedAt` and clears `SignInId`, so the person is no longer this member from that moment
  and may join again as a new one; the purge later anonymises the departed row
  (handle-member-data design). A removed member keeps `SignInId`, so the same person cannot
  join again: `POST /api/members` refuses them with 403 `not_a_member` (L2-018, criterion 4).
- **Joining twice** returns the existing active member with 200 and creates nothing (L2-017,
  criterion 14); a first join answers 201.
- **Tests.** `TestAuthHandler` (test project only) signs in a person with the header
  `X-Test-Sign-In: <id>`, as a principal with only `sub`, which is the path real sign-in will
  take, so membership is resolved by `MemberClaimsTransformation`. The headers of ADR 0005,
  `X-Test-Member` and `X-Test-Admin`, stay for the tests of cross-cuts that need a member and
  not its row; they put `member_id` and the role on the principal directly, and the
  transformation leaves such a principal alone.
- **Frontend.** `SESSION` is bound in `app.config.ts` to `AppSession`, which asks
  `GET /api/members/me` when the app starts (without holding up the first screen) and on
  `refresh()`. A 204, a 401 or a failure leave `member()` null. `MemberGate` asks again before
  it opens the join dialog, so a person who became a member elsewhere is not asked twice.

## Consequences

- When sign-in is designed, its scheme replaces `NoSignIn` and puts the identifier in `sub`;
  nothing else in the backend changes. Its screens, the contact detail, and what the header
  shows to someone not signed in are designed then.
- Until then the join dialog, though built and tested, ends in its failed state in production,
  because joining answers 401.
- Every authenticated request costs one lookup of the member by `SignInId`, served by a unique
  index.
- `MemberClaimsTransformation` may run more than once per request; it does nothing when
  `member_id` is already present.
