# 0002. The backend layers and the CLI

**Status:** Accepted

## Context

`AGENTS.md` sets clean architecture with a strict direction: `ChristianRent.Domain` ←
`ChristianRent.Application` ← `ChristianRent.Infrastructure` ← `ChristianRent.Api`. The API must
not apply migrations as it starts (L2-034, criterion 3); a command must.

## Decision

- `backend/ChristianRent.slnx` holds `src/ChristianRent.Domain` (entities, no package
  references), `src/ChristianRent.Application` (MediatR requests and handlers, FluentValidation
  validators, `ValidationBehavior`, `IAppDbContext`, `ICurrentMember`, `IPhotoStorage`, the
  exceptions), `src/ChristianRent.Infrastructure` (EF Core `AppDbContext`, the migrations,
  `HttpCurrentMember`, `LocalDiskPhotoStorage`, the seed), `src/ChristianRent.Api` (controllers,
  middleware, exception handlers, telemetry) and `src/ChristianRent.Cli`.
- `ChristianRent.Cli` references `Application` and `Infrastructure`. It has two commands today:
  `migrate` applies pending EF Core migrations and `seed` inserts the seed data, which is
  idempotent. `purge-departed` arrives with the member-data journey.
- Tests: `tests/ChristianRent.Api.Tests` (acceptance tests through the API with
  `WebApplicationFactory`) and `tests/ChristianRent.Application.Tests` (direct tests of a
  domain type or handler, one case per row of a rule's table).
- Target framework `net10.0`, nullable reference types on, warnings as errors, and the
  formatting rules in `backend/.editorconfig`, checked by `dotnet format --verify-no-changes`.
- Central package management (`Directory.Packages.props`) pins every package version in one
  place.

## Consequences

- A controller sends one MediatR request and checks nothing; rules live in handlers.
- Deployment runs `ChristianRent.Cli migrate` before the new API takes traffic.
- The CLI reads the same configuration (`ConnectionStrings:Default`) as the API.
