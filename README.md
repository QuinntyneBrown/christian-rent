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

christian.rent is designed and not yet built. The repository holds the agent instructions
([`AGENTS.md`](AGENTS.md)), the skills that drive the work (`.claude/skills/`, `.agents/skills/`)
and the community files. What comes next, in order:

1. The requirements in `docs/specs/`, from the prototype.
2. The mocks in `docs/mocks/`, transcribed from the prototype, and the design system extracted
   from them.
3. The detailed designs, the journeys and their slices.
4. The scaffold: the Angular workspace, the .NET solution, the test harness and CI.
5. The app, one slice at a time, each with its failing acceptance test first.

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

This is the planned structure; each project is added by the first change that needs it.
Dependencies run one way, and ESLint enforces it. Every route is lazy-loaded, and the backend
decides what a member or an admin may do. The full rules are in [`AGENTS.md`](AGENTS.md).

## Prerequisites

- [Node.js](https://nodejs.org) 24 or later, with npm, for the frontend
- The [.NET SDK](https://dotnet.microsoft.com/download) 10, for the backend
- A current browser

## Getting started

```shell
git clone https://github.com/QuinntyneBrown/christian-rent.git
cd christian-rent
```

There is nothing to run yet. The scaffold adds `frontend/` and `backend/`, and from then on:

```shell
cd frontend && npm ci && npm start        # http://localhost:4200
cd backend && dotnet run --project src/ChristianRent.Api
```

## Build and test

These commands arrive with the scaffold; the table is what the project holds itself to.

| Task | Command | Scope |
|---|---|---|
| Format and lint | `cd frontend && npm run format:check && npm run lint` | Prettier, angular-eslint and its dependency boundaries |
| Unit tests | `cd frontend && npm test` | The unit tests of every frontend project, on a fake clock |
| Build | `cd frontend && npm run build` | The production build, within the `angular.json` bundle budgets |
| Behaviour specs | `cd frontend && npx playwright install chromium && npm run e2e` | Playwright on Chromium, with page objects, against fixtures, with no request off localhost |
| Backend | `cd backend && dotnet format --verify-no-changes && dotnet test` | Format, build and acceptance tests through the API on EF Core InMemory |
| Everything | `node tools/verify/verify.mjs` | All of the above, side by side; run it before you push |

No automated test uses a real backend or database, or a network beyond localhost. CI runs lint,
the builds and one critical acceptance path per feature in under 5 minutes. Unit tests run only
locally.

## Repository structure

Today:

```
christian-rent/
├── AGENTS.md                        The purpose, the design, the architecture rules and the workflow
├── CLAUDE.md                        Points to AGENTS.md
├── .claude/skills/                  The skills, for Claude Code
├── .agents/skills/                  The same skills, for other coding agents
├── .github/                         Issue and pull request templates
└── README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, SUPPORT.md, LICENSE
```

As it is built:

```
christian-rent/
├── frontend/                        The Angular workspace and its Playwright specs
│   ├── projects/                      The libraries and the app
│   └── e2e/                           Behaviour specs, fixtures and page objects
├── backend/                         The .NET service: Domain, Application, Infrastructure, Api, tests
├── docs/
│   ├── journeys.md                  The journeys, by value added, with % complete
│   ├── detailed-journeys.md         Each journey split into slices
│   ├── lessons-learned.md           What each slice taught
│   ├── specs/                       Requirements: L1 (high level), L2 (acceptance criteria)
│   ├── detailed-designs/            One design per feature, grouped by subsystem
│   ├── mocks/                       HTML mocks, the source of truth for the UI
│   ├── design-system/               Tokens and components extracted from the mocks
│   └── adr/                         Architecture decision records
├── tools/                           verify
└── .github/                         CI workflow, issue and pull request templates
```

## Documentation

| Document | Description |
|---|---|
| [AGENTS.md](AGENTS.md) | christian.rent's purpose and scope, its design, the architecture rules and the required workflow |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How a change is proposed and made |
| [docs/journeys.md](docs/journeys.md) | The journeys of the main app and Admin, with effort and % complete |
| Skills (`.claude/skills/`, `.agents/skills/`) | Requirements, mocks, the design system, detailed designs, estimates, feature prompts, Angular and incremental implementation |

Requirements, mocks, the design system, the detailed designs, the journeys and the architecture
decisions are written into `docs/` as the work reaches them, and are listed here when they are.

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
