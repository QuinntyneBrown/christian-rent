# 0030. A budget for each application

**Status:** Accepted. Amends [0020](0020-bundle-budgets-after-post.md): its values stay `rent`'s;
the rules of [0006](0006-bundle-budgets.md) stand.

## Context

`rent` and `admin` are built on their own ([0028](0028-two-applications-deployed-separately.md)),
so each needs its own budgets (L2-029, criterion 5). Admin's code left `rent`: it was a lazy
chunk there and never in `rent`'s initial chunks, so removing it should not change them.
Sign-in adds a lazy page to each application and a little shared code to each shell (the
session's state, `signIn` and `signOut`, and the expiry interceptor). The sign-in page is lazy,
and in Admin the review queue is lazy behind its guard, so the sign-in page downloads none of it.

## Decision

The budgets are set just above the first production builds of each, as errors, with the
`anyComponentStyle` budget unchanged:

| Application | Budget | Warning | Error | Measured |
|---|---|---|---|---|
| `rent` | `initial` (raw, all initial chunks) | 325 kB | 340 kB | MEASURED_RENT |
| `admin` | `initial` (raw, all initial chunks) | ADMIN_WARN | ADMIN_ERROR | MEASURED_ADMIN |
| both | `anyComponentStyle` | 4 kB | 8 kB | |

`rent`'s values stay those of ADR 0020: its initial chunks did not grow beyond them. Admin's are
its own measure, with the same headroom. Each change to either measures both builds, as lesson
L11 says, and a change that raises either budget says why in an ADR.

## Consequences

- `npm run build` fails when either application breaks its budget; CI builds both.
- Admin's initial chunks hold the shell, its guard and the sign-in route's entry; its review
  queue, with the CDK dialog, is a lazy chunk.
