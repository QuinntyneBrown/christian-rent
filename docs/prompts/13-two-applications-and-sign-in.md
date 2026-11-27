# Feature: `rent` and `admin` as two separate applications, deployed separately, each with its own sign-in page

Journey 13 of `docs/journeys.md` (Both): Two applications, each with its own sign-in page and session.

## Goal

`frontend/projects/rent` and `frontend/projects/admin` are two Angular applications in one workspace, each with
its own `main.ts`, composition root, routes, `index.html`, production build, budgets, output folder and dev
server, deployed separately on its own origin, each proxying `/api` to the one backend. Each has its own sign-in
page, and sign-in works against the backend with ASP.NET Core Identity and one cookie session per application.
Signing in or out of one does nothing to the other; the backend refuses either session on the other's
endpoints. Browsing, searching and reading a listing need no sign-in. Everything else Browse, Listing, Post and
Admin do still works.

The decisions are recorded: ADR 0028 (two applications), ADR 0029 (sign-in and the two sessions), ADR 0030
(budgets per application); the design is `docs/detailed-designs/platform/sign-in-and-sessions/`; the
requirements are L2-037 to L2-041 and the criteria they rewrote; the mocks are `docs/mocks/pages/sign-in/`,
`pages/admin-sign-in/`, `pages/browse/signed-out.html` and Admin's rail and forbidden page.

### Deferred (not in this run)

- Sign-up, password reset and change, email confirmation, external providers, multi-factor sign-in: nobody
  can create their own account yet; an operator runs `ChristianRent.Cli create-account`.
- The Messages inbox, "My listings", journey 12, choosing hosts and any real deployment, and splitting the
  backend.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- Take the feature all the way: repository rules, requirements, mocks, design system, ADRs and designs,
  journeys and prompts, test-first implementation slice by slice, lessons learned, green tests and a PR.
- Do not end the turn until "Done means" is true. Choose the simplest option that fits the architecture,
  record it, and keep going. Stop only for a blocker outside the repository.
- Keep a todo list so nothing is lost when context is summarised.

## Rules (read first, binding)

- Follow `AGENTS.md`, `CONTRIBUTING.md` and the skills in `.claude/skills/` exactly: mocks first, then the
  requirement, the ADR and the design, then code; best practice for Angular, ASP.NET Core authentication,
  Playwright and WCAG; the product's words; "Sign in" and "Sign out"; lazy loading and memory first; Domain <-
  Application <- Infrastructure <- Api plus the Cli; the fallback policy, every `[AllowAnonymous]` explicit
  and stated in an ADR; ProblemDetails with a `code`; no email, password, token, cookie, query string or body
  in any log, metric or span; acceptance tests through the API on EF Core InMemory with `FakeTimeProvider`,
  sign-in tests on the real cookie flow; Playwright on Chromium with page objects and fixtures; no
  architecture tests; CI under 5 minutes.

## Slices

1. The split, with no behaviour change: `projects/admin` an application, the `shell` library, foundations in
   `components`, ESLint boundaries, two dev servers in Playwright, `verify.mjs` and CI.
2. Identity, the migration and `create-account`, safe to repeat.
3. Member sign-in, sign-out and who is signed in, replacing `NoSignIn`.
4. Refusals, lockout and throttling with `FakeTimeProvider`; the removed or departed member.
5. The Admin session: a table of cases proving each session is refused on the other's endpoints, that a
   non-admin gets no admin access, and that the photo rules hold for each caller.
6. Two allowed origins, cross-site refusal of sign-in and sign-out, and nothing sensitive in telemetry.
7. `rent`'s sign-in page, header controls and sign-out.
8. Returning after sign-in from Post, a message and a report with drafts kept; session expiry.
9. Admin's sign-in page, guard, forbidden page, sign-out and expiry; no queue data or code before sign-in.
10. Independent production builds, Admin's site address from `config.json`, and the hosting docs.

## Done means

- Two applications that each build, serve, test and deploy on their own; neither build holds the other's
  screens; no application imports the other, enforced by ESLint.
- A member signs in on `rent`, posts, messages, reports and signs out; an admin signs in on Admin, works the
  queue and signs out; a signed-out person reaches only Admin's sign-in page and a signed-in non-admin is told
  the page is for admins, with no queue data.
- The sessions are independent, including on `localhost`; no password, email or cookie in telemetry; no
  credential or key in the repository.
- `node tools/verify/verify.mjs` passes; the docs, mocks, designs, ADRs, README, journeys and prompts agree;
  a PR fills in the template and CI is green.
