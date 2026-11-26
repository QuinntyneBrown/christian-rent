# 0003. The database engine

**Status:** Open. Development uses PostgreSQL; the production service is not chosen.

## Context

The detailed designs leave the database engine open (`docs/detailed-designs/README.md`, *Open
decisions*). The first migration has to target a provider, and `ChristianRent.Cli migrate` has to
run against something. Tests never use a real database: they run on EF Core InMemory, one store
per fixture (`AGENTS.md`, *Backend tests*).

## Decision

- The first migration targets **PostgreSQL** through `Npgsql.EntityFrameworkCore.PostgreSQL`.
  It is open source, runs on every hosting platform under consideration, and has first-class EF
  Core support. A developer runs PostgreSQL locally; nothing in the repository holds its
  password.
- All access goes through `IAppDbContext` with LINQ; no handler builds SQL from strings
  (L2-026, criterion 2). The provider is chosen in `ChristianRent.Infrastructure` only.
- EF Core sensitive-data logging stays off in every environment.

## Consequences

- Choosing another engine later means regenerating the migrations for it; the code above
  `Infrastructure` does not change.
- What settles this record: the hosting platform and its managed database, and the backup
  mechanism that goes with it (L2-034, criterion 4). Until then the backup job has no
  implementation.
