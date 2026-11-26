# 0005. The authentication seam while sign-in is not designed

**Status:** Accepted. [0017](0017-identifying-a-person-until-sign-in.md) adds how a signed-in person becomes a member, and binds `SESSION` to the backend.

## Context

Sign-in is not designed, and `AGENTS.md` forbids building it before its design exists. Yet the
fallback policy must answer 401 `not_signed_in` on every protected endpoint (L2-025,
criteria 1 and 4), and later slices need a signed-in member in their acceptance tests.

## Decision

- `ChristianRent.Api` registers authentication with one scheme, `NoSignIn`, whose handler never
  authenticates anyone. The fallback authorisation policy requires an authenticated user, so
  every endpoint without `[AllowAnonymous]` answers 401.
- `ProblemAuthorizationResultHandler` (`IAuthorizationMiddlewareResultHandler`) turns a challenge
  into a 401 ProblemDetails with the code `not_signed_in`, and a forbid into a 403 with the code
  `not_an_admin` (the only policy beyond the fallback is `Admin`).
- `ICurrentMember` (`MemberId`, `IsMember`, `IsAdmin`) is read by handlers; `HttpCurrentMember`
  reads the claims `member_id` and `role=admin` from the authenticated principal.
- The acceptance tests replace the scheme with `TestAuthHandler`, which signs in the member named
  in the `X-Test-Member` header (and an admin with `X-Test-Admin: true`). It exists only in the
  test project.
- When sign-in is designed, its scheme replaces `NoSignIn`, and its secret comes from
  configuration outside the repository (L2-027, criterion 4).

## Consequences

- Nothing in production can sign in until sign-in is designed: every member action answers 401.
- The frontend's `SESSION` token answers "nobody" today, so the header shows no member's
  initials until sign-in exists.
