# 0029. Sign-in with ASP.NET Core Identity, and one cookie session per application

**Status:** Accepted. Supersedes [0005](0005-authentication-seam.md). Amends
[0017](0017-identifying-a-person-until-sign-in.md): sign-in now exists, and everything else it
says stands (`sub`, `Member.SignInId`, `MemberClaimsTransformation`, leaving unlinks sign-in).

## Context

Nobody could sign in: the backend's one scheme, `NoSignIn`, signed nobody in (ADR 0005). Now
`rent` and `admin` each need a sign-in page that works against the backend (L2-037, L2-038),
sign-out (L2-039) and a session of their own that neither lends to the other (L2-040). Both are
served from their own origins and proxy `/api` to the one backend
([0028](0028-two-applications-deployed-separately.md)); on `localhost` both origins share
cookies, because cookies ignore the port.

What the design had to settle: which scheme authenticates a request, given that
`UseAuthentication` runs before the rate limiter, which partitions by `member_id`; the photo
endpoint both applications read; who is signed in, per application; two allowed origins for the
cross-site guard; CSRF on sign-in and sign-out; data protection keys; lockout with a fake clock;
how accounts are made; and what the tests sign in with.

## Decision

- **Accounts are ASP.NET Core Identity's.** `Account` (`ChristianRent.Infrastructure`) is an
  `IdentityUser`; `AppDbContext` is an `IdentityUserContext<Account>`, so the account tables
  (`AspNetUsers` and Identity's claims, logins and tokens) join the one database in a migration.
  No roles table: the admin role comes from `Member.IsAdmin`, as before. The user name is the
  email, unique. Passwords are hashed by Identity's `PasswordHasher` (PBKDF2); the rules are at
  least 12 characters and no composition rules (NIST SP 800-63B). No external identity
  provider, no email sending.
- **The account's id is `sub`.** A session's principal carries `sub` (the account's id) and
  Identity's security stamp, nothing else. `MemberClaimsTransformation` adds `member_id` and the
  role, as ADR 0017 says. `Member.SignInId` holds the account id.
- **Two cookie schemes.** `Member` (cookie `cr-member`) and `Admin` (cookie `cr-admin`), each
  `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` outside development, and named with the
  `__Host-` prefix outside development (`__Host-cr-member`, `__Host-cr-admin`), so a sub-domain
  cannot set them. A member session is persistent and lasts 14 days, sliding; an Admin session
  is a browser session that ends 8 hours after sign-in, not sliding (L2-040, criterion 1;
  settings `Sessions:MemberLifetime`, `Sessions:AdminLifetime`). The cookie never redirects: a
  challenge is the 401 `not_signed_in` ProblemDetails and a forbid the 403 `not_an_admin`, as
  before.
- **The path chooses the scheme.** Everything Admin calls is under `/api/admin/`:
  `/api/admin/session`, `/api/admin/review-queue` (formerly `/api/review-queue`) and
  `/api/admin/photos/{id}/{rendition}`. The default scheme is a policy scheme, `Session`, whose
  selector forwards a request under `/api/admin/` to `Admin` and any other to `Member`. So
  `UseAuthentication` sets the principal of the right application before the rate limiter,
  which keeps partitioning by `member_id`, and a request that carries both cookies is
  authenticated by one of them only. Every policy also names its scheme: the fallback policy
  requires an authenticated user of `Member`; `AdminSession` an authenticated user of `Admin`;
  `Admin` that and the role. A cookie of one application never satisfies the other's policy.
- **Endpoints.** Signing in, `POST /api/session` and `POST /api/admin/session`, and signing out,
  `DELETE /api/session` and `DELETE /api/admin/session`, are `[AllowAnonymous]` (signing out
  with no session succeeds and changes nothing). Who is signed in is `GET /api/members/me` for
  `rent` (200 the member, 204 signed in and not a member, 401 not signed in) and
  `GET /api/admin/session` for Admin (the same answers, under `AdminSession`). Signing in answers
  as the matching "who" does. Admin reads a photo through `GET /api/admin/photos/...`, under
  `Admin`, which sends the same `GetPhotoQuery`; `GET /api/photos/...` stays anonymous for
  `rent`, where its poster or uploader reads one that is not public with the member session.
  The review queue's DTOs name Admin's photo addresses.
- **One generic refusal.** A wrong password, an email with no account, a locked-out account and
  a removed member's account are all answered 401 `sign_in_failed` (L2-037, criterion 2). An
  email with no account is still checked against a fixed hash, so the time taken does not tell
  them apart.
- **Lockout reads `TimeProvider`.** Identity's `UserManager` reads the system clock for
  lockout, so it cannot be tested without sleeping. Lockout uses Identity's columns
  (`AccessFailedCount`, `LockoutEnd`) and a domain rule, `SignInLockout`, that reads
  `TimeProvider`: 5 refusals in a row lock the account for 15 minutes; a successful sign-in sets
  the count to zero. Identity's own lockout is turned off. This departs from using
  `SignInManager.CheckPasswordSignInAsync`, for the reason given.
- **Throttling per address,** on top of L2-027 criterion 3: the global limiter is chained with
  a second partitioned limiter that counts the two sign-in endpoints only, 10 attempts per
  remote address per 15 minutes, answered 429 `rate_limited` with `Retry-After`.
- **Sessions that stop.** Each cookie is validated on every request (`SessionCookieEvents`,
  `OnValidatePrincipal`): the account must exist with the same security stamp, and must not
  belong to a removed member; otherwise the cookie is rejected and cleared, so a removed member
  is not signed in from their next request (L2-018, criterion 4). Leaving renews the account's
  security stamp, so every session of that account ends; the account can sign in again and
  join as a new member (ADR 0017).
- **Business rules in handlers.** `SignInCommand(Kind, Email, Password)`, `SignOutCommand(Kind)`
  and `CreateAccountCommand` are MediatR requests in `ChristianRent.Application`; they use
  `IAccounts` (find, check a password, record a refusal or a success, create, link, end
  sessions) and `ISessionCookies` (issue or clear the cookie of a kind), implemented in
  `ChristianRent.Infrastructure` with `UserManager` and `HttpContext.SignInAsync`. Each
  controller action sends one request.
- **Accounts are made by the operator.** `ChristianRent.Cli create-account <email> [<member-id>]`
  reads the password from standard input, never from an argument, so it is not in the shell's
  history or the process list. It creates the account, or says it exists and changes nothing,
  and links it to the given active member when that member has no account or this one. A member
  linked to another account, a member who is not active and a password that breaks the rules
  are refused with exit code 1. `grant-admin` is still the only way to make an admin. Nobody can
  create their own account.
- **Two allowed origins.** `Site:Origin` is `rent`'s origin and `Site:AdminOrigin` Admin's.
  `CrossSiteRequestGuard` refuses a data-changing request whose `Sec-Fetch-Site` is not
  `same-origin` or `none`, and, whenever `Origin` is sent, one whose `Origin` is not the origin
  of the application the path belongs to (`/api/admin/` to Admin, any other to `rent`). Sign-in
  and sign-out are data-changing requests, so login CSRF is refused too (L2-027, criterion 5).
  `SameSite=Strict` is the second line.
- **Behind two proxies.** Each static host forwards `Host` as its own public host, and
  `X-Forwarded-For` and `X-Forwarded-Proto`, which the API honours from
  `ForwardedHeaders:KnownProxies` only, as before. `X-Forwarded-Host` is not honoured.
  `AllowedHosts` lists both public hosts, for example `christian.rent;admin.christian.rent`.
- **Data protection keys are in the database** (`DataProtectionKeys`, through
  `PersistKeysToDbContext`), with the application name `christian-rent`, so cookies survive a
  restart and work on a second instance (L2-040, criterion 7). Nothing needs setting.
- **Telemetry.** Bodies, query strings, cookies and headers are never recorded (ADR 0005's
  scrubber stands); the sign-in handlers log nothing about the email. The telemetry tests send a
  sign-in and assert that neither the email, the password nor the cookie appears in any log,
  span or metric.
- **Frontend.** `SESSION` (in `api`) answers `state` (`unknown`, `signed-out`, `signed-in`),
  `member`, and `refresh`, `signIn` and `signOut`; each application binds it to its own
  implementation over `SESSION_API` (`HttpMemberSessionApi` or `HttpAdminSessionApi`). The
  return address is checked by `safeReturn` (`domain`): a relative path starting with one `/`,
  else `/`. In `rent`, `MemberGate` sends a person who is not signed in to
  `/sign-in?return=<this screen>`; Post's draft and the message are already kept in the tab
  (ADR 0019, ADR 0022). A signed-in person who is not a member gets the join dialog, as before.
  Signing out clears the drafts kept in the tab. `sessionExpiryInterceptor` (`shell`) turns a
  401 `not_signed_in` on a request made while signed in into the sign-in page with
  `expired=1`. In Admin, `adminGuard` (a `CanMatchFn`) awaits `SESSION.refresh()`: signed out,
  it redirects to `/sign-in?return=…` before the review queue's chunk is requested; signed in
  and not an admin, it does not match and the forbidden page loads.
- **Tests.** The sign-in acceptance tests use the real cookie flow through `WebApplicationFactory`
  with the cookies each response sets. `TestAuthHandler` stays in the test project for the
  tests of other slices: `ProbeApiFactory` makes it the handler of both `Member` and `Admin`,
  and it keeps them apart. As `Member` it reads the `X-Test-*` headers of ADR 0005 and ADR 0017
  unless `X-Test-Session: admin` is sent; as `Admin` it reads them only when it is. So a test
  says which session a caller holds, and a member session on an Admin endpoint is not signed
  in there.

## Consequences

- A deployment sets `Site:AdminOrigin` and `AllowedHosts`, and creates the first accounts with
  the CLI; the README's Settings table lists them.
- Every authenticated request costs one account lookup (the stamp) and one member lookup, both
  by unique index.
- On `localhost`, both cookies reach both applications' requests; the scheme each endpoint
  accepts keeps them apart. In production each cookie is host-only to its own origin.
- Sign-up, password reset and change, email confirmation, external providers and multi-factor
  sign-in are not built. A person who forgets their password asks the operator.
