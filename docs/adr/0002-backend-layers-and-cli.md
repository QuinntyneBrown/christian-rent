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
  `WebApplicationFactory`, and direct tests of an API type such as the rate limiter) and
  `tests/ChristianRent.Cli.Tests` (the CLI's commands). The first slice with a domain or handler
  rule that has a table of cases adds `tests/ChristianRent.Application.Tests` for its direct
  tests, one case per row.
- Tests run on xUnit v3 under the Microsoft Testing Platform (`backend/global.json`), which the
  .NET 10 SDK's `dotnet test` requires for it.
- Target framework `net10.0`, nullable reference types on, warnings as errors, and the
  formatting rules in `backend/.editorconfig`, checked by `dotnet format --verify-no-changes`.
- Central package management (`Directory.Packages.props`) pins every package version in one
  place, and NuGet lock files make every restore reproducible (`dotnet restore --locked-mode`
  in CI). `dotnet-ef` is a local tool (`backend/dotnet-tools.json`).

## Consequences

- A controller sends one MediatR request and checks nothing; rules live in handlers.
- Deployment runs `ChristianRent.Cli migrate` before the new API takes traffic.
- The CLI reads the same configuration (`ConnectionStrings:Default`) as the API.
