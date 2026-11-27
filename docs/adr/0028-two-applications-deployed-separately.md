# 0028. `rent` and `admin` are two applications, deployed separately

**Status:** Accepted. Supersedes the parts of [0001](0001-frontend-workspace-and-libraries.md)
that make `rent` the one application and add an `admin` library, and the part of
[0024](0024-viewing-the-review-queue-open-decisions.md) on how `/admin` keeps Admin's code out of
`rent` (`adminGuard`, `ForbiddenPage` in `rent`). The hosts it leaves unchosen are named by
[0031](0031-hosting-on-azure-and-deploying-each-commit.md).

## Context

Admin was a library, `@rent/admin`, that `rent` loaded at `/admin` behind `adminGuard`. The
request is for two Angular applications, each with its own sign-in page, deployed separately
(L1-017, L2-041). `AGENTS.md` asks for an ADR for a further application. Both applications use
the one backend and the libraries `api`, `domain` and `components`.

Things both applications need lived in `rent`: the foundations (tokens, `@font-face`, reset,
utilities, the fonts and the favicon) and the shell services (`GlobalErrorHandler`,
`ClientErrors`, `PageFocus`, the title strategy, `screenPath`). `components` linked to `rent`'s
routes with `routerLink` (`cr-logo`, `cr-admin-nav`, `cr-review-detail`).

## Decision

- **Two applications** in the one workspace, `projects/rent` and `projects/admin`, each with its
  own `main.ts`, `app.config.ts` (its composition root), routes, `index.html`, production
  build, budgets ([0030](0030-bundle-budgets-per-application.md)), output folder
  (`dist/rent/browser`, `dist/admin/browser`), dev server (`rent` on 4200, `admin` on 4300) and
  proxy configuration. `npm start` serves `rent`, `npm run start:admin` serves `admin`;
  `npm run build` builds both, `build:rent` and `build:admin` one each.
- **Admin owns its origin.** Its review queue is at `/`, its sign-in page at `/sign-in`, its
  forbidden page at `/` for a signed-in person who is not an admin, and any other address leads
  back to `/`, which shows whichever of the three applies: Admin has one screen, so a "not
  found" page there would only offer the way back. `rent` has no `/admin`; it is "not found"
  there.
- **Each origin proxies `/api`** to the one backend, so each application is same-origin with
  its API: no CORS, and the Content-Security-Policy keeps `connect-src 'self'`. Admin's host
  proxies only `/api/admin/`, because Admin calls nothing else
  ([0029](0029-sign-in-and-two-sessions.md)); `rent`'s host proxies `/api/`.
- **A static host per application** serves its output folder, answers any path that is not a
  file with `index.html` (the SPA fallback), and sends the security headers: the
  Content-Security-Policy of L2-026 criterion 3 (`default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline'; img-src 'self' blob:; font-src 'self'; connect-src 'self';
  object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and
  HSTS. Admin's host also sends `X-Robots-Tag: noindex, nofollow`, and Admin's `index.html`
  has `<meta name="robots" content="noindex, nofollow">` and a `robots.txt` that disallows
  everything. `index.html` is served with `Cache-Control: no-cache`, hashed files with a year.
  The README's *Deploying* section gives the steps; no host is chosen.
- **Admin learns the site's address at deploy time.** `admin` reads `/config.json`
  (`{ "siteUrl": "https://christian.rent" }`) from its own origin before the first screen,
  through `SITE_LINKS` in `api`. The file is written by the deployment, so the address changes
  without a rebuild. `parseSiteUrl` (`domain`) accepts only an absolute `http` or `https`
  origin with no path, query or credentials; anything else, or a file that cannot be read,
  leaves the cross-origin links out ("Back to site", "View on site", "Go to christian.rent")
  rather than following an unchecked address. Nothing a person enters reaches it. `rent` needs
  no address of Admin's.
- **A `shell` library** (`@rent/shell`) holds the app shell both applications share: the error
  handler and `ClientErrors`, `PageFocus`, the title strategy, `screenPath`, the sign-in store
  and the session's expiry. It depends on `api` and `domain`; both applications depend on it.
  Only what both use moves there.
- **Foundations live once.** `projects/components/foundations/` holds `foundations.scss` and its
  partials, and `projects/components/public/` the fonts and the favicon. Both applications'
  `angular.json` entries name them; neither keeps a copy.
- **`components` links are inputs.** `cr-logo` takes `label` (its accessible name) and keeps
  `routerLink="/"`, which is home in either application. `cr-admin-nav` takes `siteUrl` for
  "Back to site" as a plain link and emits `signOut`; its Review link is `/`. `cr-review-detail`
  takes `siteUrl` and builds "View on site" as `${siteUrl}/listings/{id}`, opened in a new tab.
- **The dependency direction** becomes `rent` → `shell`, `components`, `api`, `domain`;
  `admin` → the same; `shell` → `api`, `domain`; `domain` → `api`; `components` → `api` for
  types only; `api` → nothing. No application imports the other. `eslint-plugin-boundaries`
  enforces it, with `shell` as an element.
- **The behaviour specs** run as two Playwright projects, `rent` (`e2e/specs/rent/`, base URL
  4200) and `admin` (`e2e/specs/admin/`, base URL 4300), each against its own `ng serve`;
  `webServer` starts both. Page objects are shared, in `e2e/pages/`. The sweeps cover both.
- **CI** builds both applications and runs the `@critical` specs of both projects.

## Consequences

- Either application can be built, hosted and released without the other; neither build holds
  the other's screens (checked once by hand, not by a test).
- Two dev servers start for the behaviour specs; they start in parallel.
- A deployment writes Admin's `config.json`. An Admin with no valid site address works, without
  its three links to the site.
- `ADMIN_ROUTES`, `adminGuard` and `ForbiddenPage` leave `rent`; Admin's guard and forbidden
  page are Admin's own ([0029](0029-sign-in-and-two-sessions.md)).
