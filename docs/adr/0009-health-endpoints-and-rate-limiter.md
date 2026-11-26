# 0009. Health endpoints and the rate limiter

**Status:** Accepted

## Context

L2-034 requires a health endpoint; L2-025, criterion 1 lists the endpoints that answer without a
signed-in member and does not name it. L2-027, criterion 3 limits each client to 120 reads and
30 writes a minute. The enforce-access design says the limiter reads time from `TimeProvider`,
so tests can advance a fake clock instead of sleeping; the built-in
`System.Threading.RateLimiting` limiters keep their own clock.

## Decision

- `GET /health/live` and `GET /health/ready` are `[AllowAnonymous]`, return status words only,
  and are excluded from the rate limiter: a platform probe has no member, and probing must never
  be refused. They reveal nothing about a member.
- The limiter is ASP.NET Core's `AddRateLimiter` with one global `PartitionedRateLimiter`. Its
  partitions are `TimeProviderFixedWindowLimiter`, a small `RateLimiter` that counts permits in a
  fixed window measured by `TimeProvider`. The key is the member, or the remote address for an
  anonymous caller, plus `read` (GET, HEAD) or `write` (every other method). A rejection answers
  429 with `Retry-After` and the code `rate_limited`.
- The windows are fixed, as the design chose.

## Consequences

- The requirement should name the health endpoints among the anonymous ones; this record states
  the exemption until it does.
- Replacing the custom limiter with a built-in one, if .NET adds `TimeProvider` support to it, is
  a small change behind the same options.
