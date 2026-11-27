<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
    <img src="docs/assets/logo.svg" alt="christian.rent" width="444">
  </picture>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Angular-frontend-DD0031.svg" alt="Angular">
  <img src="https://img.shields.io/badge/.NET-backend-512BD4.svg" alt=".NET">
</p>

# christian.rent

christian.rent is where Christians post spaces and things for rent, or ask for a space or a
thing to rent. It is **narrow on purpose**: browse, open a listing, message the person who
posted it, or post your own. No payment happens here; people agree the details together.

It is a responsive web application: an Angular frontend and a .NET backend. It launches in
Canada.

## Contents

- [The app](#the-app)
- [What christian.rent leaves out](#what-christianrent-leaves-out)
- [Design](#design)
- [Project status](#project-status)
- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Build and test](#build-and-test)
- [Settings](#settings)
- [Deploying](#deploying)
- [Repository structure](#repository-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [Support](#support)
- [License](#license)

## The app

Two applications, each built and deployed on its own origin, and one backend. `rent`, the site,
has four screens:

1. **Browse.** "Rent it from your church family." A search bar, a switch between Everything,
   For rent and Wanted, and two buttons that lead straight to posting: *I have something to
   rent* and *I'm looking for something*. A listing for rent shows its photo; a Wanted request
   shows as a card. A search that finds nothing offers to post a request for it.
2. **Listing.** A large photo and the description, with the person who posted it and their
   church, each marked when verified. A message box sends a message to that person, with dates
   when the listing is for rent.
3. **Post.** One sentence, "I **have / need** **a space / a thing** to rent out", whose
   highlighted words switch. A few fields follow (title, price, when, photos and a note), with a
   live preview of the card beside them.
4. **Sign in.** An email and a password, and back to where the member was, with what they wrote
   kept. Browsing, searching and reading a listing need no sign-in.

`admin` has two:

1. **Admin.** The review queue for new posts, reports and new members, with a detail panel and
   Approve, Keep or Remove.
2. **Admin sign-in.** Admin's own sign-in page, on its own ink page. A signed-in member who is not
   an admin is told the page is for admins.

Each application has its own session and its own "Sign out". **Nobody can create their own
account yet**: an operator creates each account with `ChristianRent.Cli create-account`.
Sign-up, password reset and password change are not designed.

## What christian.rent leaves out

Payment, a booking calendar, reviews and ratings, a social feed and adverts. A Messages inbox, a
"My listings" screen, sign-up, password reset and password change are not designed yet, and none
is built before its design exists.

## Design

The design is the **Christian Rent** prototype in Magic Patterns (the *Christian Rental
Marketplace* OS), with a *Brand* sheet beside it.

- **Wordmark:** lowercase **christian.rent**, with ".rent" in orange.
- **Mark:** a key whose head is a cross.
- **Look:** plain white with cool grey surfaces and hairlines; orange and blue are the accents.
  Bricolage Grotesque for headlines, Instrument Sans for body text.
- **Phone:** one column; Admin shows only the queue.
- **Tablet and desktop:** the message box sits beside the listing, the live preview beside the
  Post form, and Admin's detail panel beside the queue.
- **Canada:** prices in CAD, distances in km, Canadian spelling.

Before a screen is built, its states are transcribed from the prototype into `docs/mocks/`, the
source of truth for the code.

## Project status

christian.rent is designed, and its scaffold is built: the Angular workspace with the application
shell (the header with the wordmark, the skip link and the "not found" page), the .NET solution
with the platform's cross-cuts (access, refusals, security headers, rate limits, telemetry, health,
migrations and seed), the test harness and CI. Browse is built (journey 2): approved listings,
newest first, loaded a page at a time as the list is scrolled, with their photos served from file
storage. Search and filter is built (journey 3): the search bar, the switch between Everything,
For rent and Wanted, and the Spaces and Things filter, all kept in the address, and the offer to
ask for what a search did not find. Reading a listing is built (journey 4): its photos, what it
is, who posted it and their church, each marked when verified. Becoming a member is built (journey 5): the join dialog and
the gate that opens it, the backend that lists churches, makes a signed-in person an unverified
member waiting in the review queue, and lets a member leave
([ADR 0017](docs/adr/0017-identifying-a-person-until-sign-in.md)).
Posting is built (journey 6): Post's sentence, its fields with their rules, the live preview,
the draft kept in the tab, and the backend that saves a listing as waiting for review, once per
client request and at most 10 a member in 24 hours. Adding photos is built (journey 7): up to 6
on a listing for rent, each checked by its content, size and sides, stored as renditions without
its metadata, removable while posting, and deleted after 24 hours if no listing is posted with it
([ADR 0021](docs/adr/0021-uploading-photos-open-decisions.md)). Sending a message is built
(journey 8): the message box beside a listing, with optional dates when it is for rent, its
invalid, failed and limited states that keep what was written, and the backend that stores a
message for the two people, at most 20 a member in an hour. Nobody can read a message yet: the
Messages inbox is not designed, so a message waits in the database
([ADR 0022](docs/adr/0022-sending-a-message-open-decisions.md)). Reporting a listing is built
(journey 9): the Report button and its dialog, with a reason from a fixed list and an optional
note, and the backend that files one report for each member and listing in the review queue and
never says who filed it
([ADR 0023](docs/adr/0023-reporting-a-listing-open-decisions.md)). Viewing the review queue is
built (journey 10): Admin, with the new listings, reports and
new members that wait, oldest first, a page at a time, and from tablet width the selected item's
detail beside them. The operator makes an admin with the CLI
([ADR 0024](docs/adr/0024-viewing-the-review-queue-open-decisions.md)). Deciding an item is built
(journey 11): from tablet width an admin approves, keeps or removes the selected item, with a
confirmation before a removal; each decision records who made it and when, a second one is
refused, notifications say what came of it, and the screen says when new items arrive. A
removal records a notice for the poster, but nothing is sent yet
([ADR 0025](docs/adr/0025-telling-a-poster-their-listing-was-removed.md),
[ADR 0026](docs/adr/0026-two-admins-deciding-one-item.md),
[ADR 0027](docs/adr/0027-deciding-a-review-item-open-decisions.md)). Two applications and
sign-in are built (journey 13): `rent` and `admin` are separate Angular applications, each with
its own build, origin, sign-in page and cookie session, using one backend; accounts are ASP.NET
Core Identity's, made by the operator; sign-in refuses alike, locks out and throttles, and a
removed member's session stops
([ADR 0028](docs/adr/0028-two-applications-deployed-separately.md),
[ADR 0029](docs/adr/0029-sign-in-and-two-sessions.md),
[ADR 0030](docs/adr/0030-bundle-budgets-per-application.md)). Verifying members and churches
is built (journey 12): approving a new member verifies them, and "Confirm church" on the detail
of a new member verifies their church, whose mark then shows on the listings of all its
members; only an admin can set either mark
([ADR 0031](docs/adr/0031-confirming-a-church.md)). Nothing is deployed: the hosts are
not chosen.
[ADR 0030](docs/adr/0030-bundle-budgets-per-application.md)). It is deployed to Azure, and
every commit to `main` that passes CI is released ([ADR 0031](docs/adr/0031-hosting-on-azure-and-deploying-each-commit.md));
christian.rent's own domains are not bound yet.

- The requirements are in `docs/specs/`, the mocks in `docs/mocks/`, the design system in
  `docs/design-system/` and the detailed designs in `docs/detailed-designs/`.
- The journeys and their slices are in `docs/journeys.md` and `docs/detailed-journeys.md`, with
  **% complete**; the architecture decisions are in `docs/adr/`.
- Every journey in `docs/journeys.md` is built. What comes next needs its design first: a
  Messages inbox, "My listings", sign-up and password reset have none yet.

## How it works

```
Member ──▶ rent  (its own origin, /api/ proxied) ──┐
                                                   ├─▶ backend (.NET) ──▶ database and photo storage
Admin  ──▶ admin (its own origin, /api/admin/ proxied) ┘
           both built from shell, components, domain and api
```

| Project | Responsibility |
|---|---|
| `frontend/projects/api` (`@rent/api`) | Contracts, types, injection tokens, and the HTTP clients for the backend |
| `frontend/projects/domain` (`@rent/domain`) | Rules the browser applies itself: `listings/`, `search/`, `storage/` |
| `frontend/projects/components` (`@rent/components`) | Presentation components, named as in the design system; the foundations and fonts both applications use |
| `frontend/projects/shell` (`@rent/shell`) | The app shell both applications share: errors, focus, titles, the session, the sign-in store |
| `frontend/projects/rent` | The site: Browse, Listing, Post, Sign in, its dialogs and composition root |
| `frontend/projects/admin` | Admin: the review queue, Admin's sign-in and forbidden pages, its composition root |
| `backend/src/ChristianRent.*` | `Domain` ← `Application` ← `Infrastructure` ← `Api` |

No application imports the other. Dependencies run one way, and ESLint enforces it. Every route is lazy-loaded, and the backend
decides what a member or an admin may do. The full rules are in [`AGENTS.md`](AGENTS.md).

## Prerequisites

- [Node.js](https://nodejs.org) 24 (or 22.12 and later), with npm, for the frontend
- The [.NET SDK](https://dotnet.microsoft.com/download) 10, for the backend
- [PostgreSQL](https://www.postgresql.org) 16 or later, to run the API against a database
  ([ADR 0003](docs/adr/0003-database-engine.md)); no test needs it
- A current Chrome or Edge

## Getting started

```shell
git clone https://github.com/QuinntyneBrown/christian-rent.git
cd christian-rent
```

Run each application alone (neither needs a backend to show its first screen):

```shell
cd frontend && npm ci && npm start        # rent, http://localhost:4200
```

```shell
cd frontend && npm run start:admin        # admin, http://localhost:4300
```

Run the backend against a local PostgreSQL. The connection string is a secret and never goes in
the repository; set it in your environment or with `dotnet user-secrets`:

```shell
cd backend
export ConnectionStrings__Default="Host=localhost;Database=christian_rent;Username=rent;Password=<yours>"
dotnet run --project src/ChristianRent.Cli -- migrate   # apply the schema; the API never does
dotnet run --project src/ChristianRent.Cli -- seed      # the mocks' cast: churches, members, listings, photos; safe to repeat
dotnet run --project src/ChristianRent.Cli -- purge-departed   # daily: anonymise members who left and clear the messages and report notes they wrote; safe to repeat
dotnet run --project src/ChristianRent.Cli -- purge-photos     # hourly: delete photos no posted listing names after 24 hours (ADR 0021); safe to repeat
dotnet run --project src/ChristianRent.Cli -- create-account <email> [<member-id>]   # reads the password from standard input; safe to repeat
dotnet run --project src/ChristianRent.Cli -- grant-admin <member-id>   # make an active member an admin; safe to repeat
dotnet run --project src/ChristianRent.Api              # http://localhost:5080/health/ready
```

**Creating an account.** Nobody can create their own account yet. The operator creates one, and
may link it to an existing member so that person signs in as that member; the password is read
from standard input, never from an argument, so it stays out of the shell's history
([ADR 0029](docs/adr/0029-sign-in-and-two-sessions.md)). A password has at least 12 characters.
For example, to let the seeded admin-to-be sign in:

```shell
read -rs PASSWORD && printf '%s\n' "$PASSWORD" | dotnet run --project src/ChristianRent.Cli -- create-account naomi@example.ca <member-id>
```

Running it again changes nothing: an account that exists keeps its password. An account with no
member signs in and is asked to join.

Only `grant-admin` makes someone an admin: no screen or endpoint does, the seed makes nobody one,
and nothing takes it back yet ([ADR 0024](docs/adr/0024-viewing-the-review-queue-open-decisions.md)).
It prints the member's identifier, never a name. An admin signs in to Admin with their account;
signing in to `rent` with it is a separate session.

`npm start` and `npm run start:admin` send `/api` to the API on port 5080.

## Build and test

| Task | Command | Scope |
|---|---|---|
| Format and lint | `cd frontend && npm run format:check && npm run lint` | Prettier, angular-eslint and its dependency boundaries, and a type check of `e2e/` |
| Unit tests | `cd frontend && npm test` | The unit tests of every frontend project, on a fake clock |
| Build | `cd frontend && npm run build` | Both production builds, each within its own `angular.json` budgets (`build:rent`, `build:admin` for one) |
| Behaviour specs | `cd frontend && npx playwright install chromium && npm run e2e` | Playwright on Chromium, with page objects, against fixtures, with no request off localhost; `rent`'s and `admin`'s specs against their own dev servers |
| Backend | `cd backend && dotnet format --verify-no-changes && dotnet test` | Format, build and acceptance tests through the API on EF Core InMemory |
| Everything | `node tools/verify/verify.mjs` | All of the above, side by side; run it before you push |

No automated test uses a real backend or database, or a network beyond localhost. CI
(`.github/workflows/ci.yml`) runs lint, the builds and the critical acceptance path of each feature
(`npm run e2e:ci`, `dotnet test --filter-trait "Category=Critical"`) in under 5 minutes. Unit
tests run only locally. Once CI passes on `main`, `.github/workflows/deploy.yml` releases that
commit to Azure ([Deploying](#deploying)). The visual, responsive, accessibility and heap sweeps run only when a
person asks: `cd frontend && npm run e2e:sweeps`.

## Settings

A deployed system needs these settings. Secrets come from the host's environment or a secret
store, never from the repository ([L2-027](docs/specs/L2.md), criterion 4). In environment
variables, `:` is written `__`.

| Setting | Secret | What it is |
|---|---|---|
| `ConnectionStrings:Default` | yes | The PostgreSQL connection string, read by the API and `ChristianRent.Cli` ([ADR 0003](docs/adr/0003-database-engine.md)) |
| `PhotoStorage:RootPath` | no | Where photo renditions are kept on disk, as `{photoId}/{rendition}.jpg`; default `App_Data/photos` under the content root ([ADR 0004](docs/adr/0004-file-storage.md), [ADR 0011](docs/adr/0011-photo-renditions-and-serving.md)). In Azure it is `/data/photos`, where the Azure Files share is mounted |
| `Site:Origin` | no | The origin `rent` is served from, e.g. `https://christian.rent`; a write to `rent`'s endpoints from any other origin is refused |
| `Site:AdminOrigin` | no | The origin Admin is served from, e.g. `https://admin.christian.rent`; a write under `/api/admin/` from any other origin is refused ([ADR 0029](docs/adr/0029-sign-in-and-two-sessions.md)) |
| `AllowedHosts` | no | The public hosts the API answers, separated by `;`, e.g. `christian.rent;admin.christian.rent`; each static host forwards its own `Host` |
| `Sessions:MemberLifetime` | no | How long a member session lasts without a request, each request extending it; default `14.00:00:00` (L2-040) |
| `Sessions:AdminLifetime` | no | How long an Admin session lasts from sign-in; default `08:00:00` (L2-040) |
| Data protection keys | no | The keys that protect the session cookies are kept in the database (`DataProtectionKeys`), so they survive a restart and every instance shares them; nothing to set |
| Admin's `config.json` | no | `{ "siteUrl": "https://christian.rent" }`, written beside Admin's files when it is deployed: where "Back to site", "View on site" and "Go to christian.rent" lead. Only an absolute `http` or `https` origin is used ([ADR 0028](docs/adr/0028-two-applications-deployed-separately.md)) |
| `HTTPS_PORT` | no | The public HTTPS port the API redirects HTTP to, usually `443`. Not set in Azure, whose ingress redirects ([ADR 0031](docs/adr/0031-hosting-on-azure-and-deploying-each-commit.md)) |
| `ForwardedHeaders:KnownProxies` | no | The addresses of the reverse proxies whose `X-Forwarded-*` headers are trusted, besides loopback, which always is. Not set in Azure: each static host reaches the API on loopback |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | no | Where traces, metrics and logs are sent over OTLP; when unset, nothing is exported. The telemetry backend is not chosen |
| `ASPNETCORE_ENVIRONMENT` | no | `Production` when deployed: HTTPS redirection and HSTS are on outside `Development` |
| `Members:PurgeAfterDays` | no | Days after a member leaves before `ChristianRent.Cli purge-departed` makes them anonymous, deletes their listings and photos and the reports about them, and clears the text of the messages they sent and the notes of their reports; 0 to 30, default 30 ([L2-028](docs/specs/L2.md), criterion 2). Schedule the command daily |

In Azure every one of these is set by `infra/deploy.sh`, and the connection string is a key vault
secret that `infra/provision.sh` writes.

`ChristianRent.Cli purge-photos` needs no setting; schedule it hourly. A reverse proxy in front of
the API must accept a request body of at least 10.1 MB for `POST /api/photos`, a 10 MB photo and
its form ([ADR 0021](docs/adr/0021-uploading-photos-open-decisions.md)).

Deployment runs `ChristianRent.Cli migrate` before the new API takes traffic; the database role
it uses may create the `pg_trgm` and `unaccent` extensions, or they are created beforehand
([ADR 0015](docs/adr/0015-search-matching-and-browse-query.md)). The API and the CLI need ICU
(`libicu`) on the host, as Microsoft's non-Alpine .NET images have, because a search ignores
accents through Unicode normalisation.

## Deploying

christian.rent runs on Azure Container Apps in Canada Central, and **every commit to `main` is
deployed** once CI has passed on it ([ADR 0031](docs/adr/0031-hosting-on-azure-and-deploying-each-commit.md)).

| | `rent` | `admin` |
|---|---|---|
| Container app | `ca-christian-rent` | `ca-christian-rent-admin` |
| Address | <https://ca-christian-rent.ambitioustree-c8dfdd8c.canadacentral.azurecontainerapps.io> | <https://ca-christian-rent-admin.ambitioustree-c8dfdd8c.canadacentral.azurecontainerapps.io> |

Each container app holds the application's static host (nginx) and the API beside it. The
database is Azure Database for PostgreSQL, with no public address; photos are on an Azure Files
share; `ChristianRent.Cli` runs as three jobs (`migrate` on every release, `purge-departed`
daily and `purge-photos` hourly). Everything is in the resource group `rg-christian-rent` and is
made with the Azure CLI:

| | When | What it does |
|---|---|---|
| `bash infra/provision.sh` | Once, by an operator signed in with `az login` as an owner of the subscription; safe to repeat | Creates the registry, the network, the Container Apps environment, the database, the photo share, the key vault with the database's password and connection string, and the two identities; lets this repository's `main` deploy with GitHub's OIDC token; sets the repository variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and `AZURE_SUBSCRIPTION_ID` (identifiers, not secrets) |
| `.github/workflows/deploy.yml` | Every commit to `main`, after CI passes; or by hand from the Actions tab | Builds and pushes the `backend`, `rent` and `admin` images, tagged with the commit, then runs `infra/deploy.sh` |
| `bash infra/deploy.sh <commit>` | By the workflow; by an operator to go back to an earlier commit | Runs `migrate` and stops if it fails; releases both applications and the scheduled jobs; waits until both are ready; asks each origin for its first screen and for the API |

A release that fails leaves the last one serving. Going back does not undo a migration, so a
migration stays compatible with the release before it. A setting of a container app is changed
in `infra/deploy.sh`, not in the portal: the next release overwrites what the portal changed.

**After the first release** the database is empty and nobody has an account. An operator runs
the CLI in a running API container, for example:

```shell
az containerapp exec -g rg-christian-rent -n ca-christian-rent --container api --command "dotnet /app/cli/ChristianRent.Cli.dll seed"
az containerapp exec -g rg-christian-rent -n ca-christian-rent --container api --command "dotnet /app/cli/ChristianRent.Cli.dll create-account <email> <member-id>"   # type the password, then Enter
az containerapp exec -g rg-christian-rent -n ca-christian-rent --container api --command "dotnet /app/cli/ChristianRent.Cli.dll grant-admin <member-id>"
```

`seed` enters the mocks' cast, which is sample data: leave it out of a system real members use.

**christian.rent's own domains** are not bound yet. To bind them, add each domain to its
container app with a managed certificate, and release with `RENT_HOST` and `ADMIN_HOST` set to
them in `infra/deploy.sh`, which derives `Site:Origin`, `Site:AdminOrigin`, `AllowedHosts` and
Admin's `config.json` from the two.

Still open: a backup of the photo share to a separate store, the telemetry backend and the
restore drill. The database is backed up by Azure daily, kept 14 days.

What any host of the two applications has to do is below
([ADR 0028](docs/adr/0028-two-applications-deployed-separately.md)); `infra/host.Dockerfile` and
`infra/nginx/` are how Azure's do it:

| | `rent` | `admin` |
|---|---|---|
| Build | `cd frontend && npm run build:rent` | `cd frontend && npm run build:admin` |
| Output folder | `frontend/dist/rent/browser` | `frontend/dist/admin/browser` |
| Origin | e.g. `https://christian.rent` | e.g. `https://admin.christian.rent` |
| Proxy to the API | `/api/` | `/api/admin/` |
| Written at deploy | nothing | `config.json` with `siteUrl` |
| Indexing | indexed | `X-Robots-Tag: noindex, nofollow` (and its meta tag and `robots.txt`) |

Each static host:

- serves its output folder, and answers any path that is not a file with `index.html` (the SPA
  fallback), with `Cache-Control: no-cache` on `index.html` and a long cache on hashed files;
- proxies its `/api` paths to the one API on the same origin, forwarding `Host`,
  `X-Forwarded-For` and `X-Forwarded-Proto`, and its address is in `ForwardedHeaders:KnownProxies`;
- sends `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'
  'unsafe-inline'; img-src 'self' blob:; font-src 'self'; connect-src 'self'; object-src 'none';
  base-uri 'self'; frame-ancestors 'none'; form-action 'self'`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin` and HSTS.

The API is one image with `Site:Origin`, `Site:AdminOrigin` and `AllowedHosts` naming both
origins; in Azure it runs beside each static host. Release order does not matter between the two applications; the API's migrations run
first.

## Repository structure

```
christian-rent/
├── AGENTS.md                        The purpose, the design, the architecture rules and the workflow
├── CLAUDE.md                        Points to AGENTS.md
├── frontend/                        The Angular workspace and its Playwright specs
│   ├── projects/api/                  Contracts, types, injection tokens, HTTP clients (@rent/api)
│   ├── projects/domain/               Rules the browser applies itself (@rent/domain)
│   ├── projects/components/           Presentation components, cr-*, and the foundations (@rent/components)
│   ├── projects/shell/                The app shell both applications share (@rent/shell)
│   ├── projects/rent/                 The site: pages, routes and its composition root
│   ├── projects/admin/                Admin: its pages, routes and composition root, on its own origin
│   └── e2e/                           Behaviour specs, fixtures, page objects and the sweeps
├── backend/                         The .NET service
│   ├── src/ChristianRent.Domain/      Entities
│   ├── src/ChristianRent.Application/ MediatR handlers, validators, contracts
│   ├── src/ChristianRent.Infrastructure/ EF Core, migrations, storage, identity, seed
│   ├── src/ChristianRent.Api/         Controllers, middleware, error handlers, telemetry, health
│   ├── src/ChristianRent.Cli/         migrate, seed, create-account, grant-admin, purge-departed and purge-photos
│   └── tests/                         Acceptance tests through the API, and the CLI's tests
├── docs/
│   ├── journeys.md                  The journeys, by value added, with % complete
│   ├── detailed-journeys.md         Each journey split into slices
│   ├── lessons-learned.md           What each slice taught
│   ├── specs/                       Requirements: L1 (high level), L2 (acceptance criteria)
│   ├── detailed-designs/            One design per feature, grouped by subsystem
│   ├── mocks/                       HTML mocks, the source of truth for the UI
│   ├── design-system/               Tokens and components extracted from the mocks
│   └── adr/                         Architecture decision records
├── infra/                           Azure: the images' Dockerfiles, the nginx hosts, provision.sh and deploy.sh
├── tools/verify/                    verify.mjs: every check, side by side
├── .claude/skills/, .agents/skills/ The skills, for Claude Code and other coding agents
└── .github/                         CI and deploy workflows, issue and pull request templates
```

## Documentation

| Document | Description |
|---|---|
| [AGENTS.md](AGENTS.md) | christian.rent's purpose and scope, its design, the architecture rules and the required workflow |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How a change is proposed and made |
| [docs/specs/](docs/specs/L2.md) | The requirements: L1 and L2 with acceptance criteria |
| [docs/mocks/](docs/mocks/README.md) | The mocks of every screen in every state, the source of truth for the UI |
| [docs/design-system/](docs/design-system/README.md) | Tokens, foundations and components, extracted from the mocks |
| [docs/detailed-designs/](docs/detailed-designs/README.md) | One design per feature, with its open decisions |
| [docs/journeys.md](docs/journeys.md) | The journeys of the main app and Admin, with effort and % complete |
| [docs/detailed-journeys.md](docs/detailed-journeys.md) | Each journey's slices |
| [docs/lessons-learned.md](docs/lessons-learned.md) | What each journey taught |
| [docs/adr/](docs/adr/README.md) | The architecture decisions |
| Skills (`.claude/skills/`, `.agents/skills/`) | Requirements, mocks, the design system, detailed designs, estimates, feature prompts, Angular and incremental implementation |

## Contributing

Contributions are welcome. Before you open a pull request, read
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow and [`AGENTS.md`](AGENTS.md) for the
architecture rules. In summary:

- If it does not serve posting something to rent, asking for it, or finding it, it does not belong in christian.rent.
- Every change to product code needs a requirement, a detailed design and a mock before any code
  is written.
- Work in small slices, and write the failing acceptance test first.
- Keep the requirements, designs, mocks, tests and code consistent with each other.
- Lazy loading and memory come first: a change that grows the initial bundle or leaks memory is
  not done.

## Code of conduct

This project has adopted the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are
expected to uphold this code.

## Security

Do not report security vulnerabilities through public GitHub issues. See [`SECURITY.md`](SECURITY.md)
for how to report one privately.

## Support

See [`SUPPORT.md`](SUPPORT.md) for how to ask a question, report a bug or request a feature.

## License

Copyright (c) 2026 Quinntyne Brown. Licensed under the [MIT License](LICENSE).
