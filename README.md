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
- [Repository structure](#repository-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [Support](#support)
- [License](#license)

## The app

Four screens:

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
4. **Admin.** The review queue for new posts, reports and new members, with a detail panel and
   Approve, Keep or Remove.

## What christian.rent leaves out

Payment, a booking calendar, reviews and ratings, a social feed and adverts. A Messages inbox, a
"My listings" screen and sign-in are not designed yet, and none is built before its design
exists.

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
member waiting in the review queue, and lets a member leave; sign-in itself is not designed, so
nobody can sign in yet ([ADR 0017](docs/adr/0017-identifying-a-person-until-sign-in.md)).
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
([ADR 0022](docs/adr/0022-sending-a-message-open-decisions.md)).

- The requirements are in `docs/specs/`, the mocks in `docs/mocks/`, the design system in
  `docs/design-system/` and the detailed designs in `docs/detailed-designs/`.
- The journeys and their slices are in `docs/journeys.md` and `docs/detailed-journeys.md`, with
  **% complete**; the architecture decisions are in `docs/adr/`.
- What comes next is journey 9, Report a listing: one slice at a time, each with its failing
  acceptance test first.

## How it works

```
Member ──▶ rent (screens) ──▶ api clients (HTTP) ──▶ backend (.NET) ──▶ database and photo storage
                │
           components (presentation)
```

| Project | Responsibility |
|---|---|
| `frontend/projects/api` (`@rent/api`) | Contracts, types, injection tokens, and the HTTP clients for the backend |
| `frontend/projects/domain` (`@rent/domain`) | Rules the browser applies itself: `listings/`, `search/`, `storage/` |
| `frontend/projects/components` (`@rent/components`) | Presentation components, named as in the design system |
| `frontend/projects/rent` | The app: pages, dialogs and the composition root |
| `backend/src/ChristianRent.*` | `Domain` ← `Application` ← `Infrastructure` ← `Api` |

The `admin` library joins these when journey 10 adds it.
Dependencies run one way, and ESLint enforces it. Every route is lazy-loaded, and the backend
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

Run the frontend alone (it needs no backend to show the shell):

```shell
cd frontend && npm ci && npm start        # http://localhost:4200
```

Run the backend against a local PostgreSQL. The connection string is a secret and never goes in
the repository; set it in your environment or with `dotnet user-secrets`:

```shell
cd backend
export ConnectionStrings__Default="Host=localhost;Database=christian_rent;Username=rent;Password=<yours>"
dotnet run --project src/ChristianRent.Cli -- migrate   # apply the schema; the API never does
dotnet run --project src/ChristianRent.Cli -- seed      # the mocks' cast: churches, members, listings, photos; safe to repeat
dotnet run --project src/ChristianRent.Cli -- purge-departed   # daily: anonymise members who left and clear the messages they sent; safe to repeat
dotnet run --project src/ChristianRent.Cli -- purge-photos     # hourly: delete photos no posted listing names after 24 hours (ADR 0021); safe to repeat
dotnet run --project src/ChristianRent.Api              # http://localhost:5080/health/ready
```

`npm start` sends `/api` to the API on port 5080. Nobody can sign in yet: sign-in is not designed
([ADR 0005](docs/adr/0005-authentication-seam.md)), so every member action answers 401.

## Build and test

| Task | Command | Scope |
|---|---|---|
| Format and lint | `cd frontend && npm run format:check && npm run lint` | Prettier, angular-eslint and its dependency boundaries, and a type check of `e2e/` |
| Unit tests | `cd frontend && npm test` | The unit tests of every frontend project, on a fake clock |
| Build | `cd frontend && npm run build` | The production build, within the `angular.json` bundle budgets |
| Behaviour specs | `cd frontend && npx playwright install chromium && npm run e2e` | Playwright on Chromium, with page objects, against fixtures, with no request off localhost |
| Backend | `cd backend && dotnet format --verify-no-changes && dotnet test` | Format, build and acceptance tests through the API on EF Core InMemory |
| Everything | `node tools/verify/verify.mjs` | All of the above, side by side; run it before you push |

No automated test uses a real backend or database, or a network beyond localhost. CI
(`.github/workflows/ci.yml`) runs lint, the builds and the critical acceptance path of each feature
(`npm run e2e:ci`, `dotnet test --filter-trait "Category=Critical"`) in under 5 minutes. Unit
tests run only locally. The visual, responsive, accessibility and heap sweeps run only when a
person asks: `cd frontend && npm run e2e:sweeps`.

## Settings

A deployed system needs these settings. Secrets come from the host's environment or a secret
store, never from the repository ([L2-027](docs/specs/L2.md), criterion 4). In environment
variables, `:` is written `__`.

| Setting | Secret | What it is |
|---|---|---|
| `ConnectionStrings:Default` | yes | The PostgreSQL connection string, read by the API and `ChristianRent.Cli` ([ADR 0003](docs/adr/0003-database-engine.md)) |
| `PhotoStorage:RootPath` | no | Where photo renditions are kept on disk, as `{photoId}/{rendition}.jpg`; default `App_Data/photos` under the content root ([ADR 0004](docs/adr/0004-file-storage.md), [ADR 0011](docs/adr/0011-photo-renditions-and-serving.md)). The production storage product is not chosen |
| `Site:Origin` | no | The origin the frontend is served from, e.g. `https://christian.rent`; a write from any other origin is refused |
| `HTTPS_PORT` | no | The public HTTPS port the API redirects HTTP to, usually `443` |
| `ForwardedHeaders:KnownProxies` | no | The addresses of the reverse proxies whose `X-Forwarded-*` headers are trusted |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | no | Where traces, metrics and logs are sent over OTLP; when unset, nothing is exported. The telemetry backend is not chosen |
| `ASPNETCORE_ENVIRONMENT` | no | `Production` when deployed: HTTPS redirection and HSTS are on outside `Development` |
| `Members:PurgeAfterDays` | no | Days after a member leaves before `ChristianRent.Cli purge-departed` makes them anonymous, deletes their listings and photos, and clears the text of the messages they sent; 0 to 30, default 30 ([L2-028](docs/specs/L2.md), criterion 2). Schedule the command daily |
| The sign-in secret | yes | Not yet: sign-in is not designed ([ADR 0005](docs/adr/0005-authentication-seam.md)) |

`ChristianRent.Cli purge-photos` needs no setting; schedule it hourly. A reverse proxy in front of
the API must accept a request body of at least 10.1 MB for `POST /api/photos`, a 10 MB photo and
its form ([ADR 0021](docs/adr/0021-uploading-photos-open-decisions.md)).

Deployment runs `ChristianRent.Cli migrate` before the new API takes traffic; the database role
it uses may create the `pg_trgm` and `unaccent` extensions, or they are created beforehand
([ADR 0015](docs/adr/0015-search-matching-and-browse-query.md)). The API and the CLI need ICU
(`libicu`) on the host, as Microsoft's non-Alpine .NET images have, because a search ignores
accents through Unicode normalisation. The host that
serves the built frontend (`frontend/dist/rent/browser`) should send the same
Content-Security-Policy as the API; hosting is not chosen yet.

## Repository structure

```
christian-rent/
├── AGENTS.md                        The purpose, the design, the architecture rules and the workflow
├── CLAUDE.md                        Points to AGENTS.md
├── frontend/                        The Angular workspace and its Playwright specs
│   ├── projects/api/                  Contracts, types, injection tokens, HTTP clients (@rent/api)
│   ├── projects/domain/               Rules the browser applies itself (@rent/domain)
│   ├── projects/components/           Presentation components, cr-* (@rent/components)
│   ├── projects/rent/                 The app: pages, shell, routes and the composition root
│   └── e2e/                           Behaviour specs, fixtures, page objects and the sweeps
├── backend/                         The .NET service
│   ├── src/ChristianRent.Domain/      Entities
│   ├── src/ChristianRent.Application/ MediatR handlers, validators, contracts
│   ├── src/ChristianRent.Infrastructure/ EF Core, migrations, storage, identity, seed
│   ├── src/ChristianRent.Api/         Controllers, middleware, error handlers, telemetry, health
│   ├── src/ChristianRent.Cli/         migrate, seed, purge-departed and purge-photos
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
├── tools/verify/                    verify.mjs: every check, side by side
├── .claude/skills/, .agents/skills/ The skills, for Claude Code and other coding agents
└── .github/                         CI workflow, issue and pull request templates
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
