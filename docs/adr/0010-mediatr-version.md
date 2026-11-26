# 0010. MediatR version

**Status:** Accepted

## Context

`AGENTS.md` names MediatR for handlers. MediatR 13 and later are published under a commercial
licence that needs a key; 12.5 is the last release under Apache 2.0.

## Decision

The backend pins MediatR 12.5.0 in `Directory.Packages.props`. Pipeline behaviours
(`ValidationBehavior`) and handlers use only the 12.x API.

## Consequences

- Upgrading past 12.x needs a licence decision by the project owner, recorded in a new ADR.
- If the 12.x line ever needs a security fix that is not published, the replacement (a licensed
  MediatR, or a small in-house mediator) is decided then.
