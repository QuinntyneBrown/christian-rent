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

The production builds were measured on `main` before the split, after it, and with sign-in, and
their build stats compared (lesson L11):

| Build | `rent` initial (raw / transferred) | `admin` initial |
|---|---|---|
| `main`, Admin a lazy library in `rent` | 324.29 kB / 85.96 kB | — |
| After the split (slice 13.1) | 324.22 kB / 85.95 kB | 311.42 kB |
| With sign-in (slice 13.9) | 326.76 kB / 86.48 kB | 314.49 kB / 83.14 kB |

Removing Admin did not grow `rent`. Sign-in added 2.5 kB to `rent`'s initial chunks: the session's
state, sign-in and sign-out (`ApiSession`, 0.5 kB), the session's HTTP client (1.0 kB), the
expiry interceptor (0.2 kB), forgetting the kept drafts on sign-out (0.3 kB), the `login` icon
and the route of the sign-in page (0.3 kB), and the runtime they share. Each of these runs on the
first screen: the header says who is signed in, and any request may find the session ended. The
sign-in page itself is a lazy chunk. A first build put 2.5 kB more in, because forgetting the
drafts imported their keys from the two draft stores, which brought both stores into `main`; the
keys now live in a module of their own (`storage/draft-keys.ts`).

The budgets, as errors, with the `anyComponentStyle` budget unchanged:

| Application | Budget | Warning | Error |
|---|---|---|---|
| `rent` | `initial` (raw, all initial chunks) | 330 kB | 340 kB |
| `admin` | `initial` (raw, all initial chunks) | 320 kB | 335 kB |
| both | `anyComponentStyle` | 4 kB | 8 kB |

`rent`'s warning moves from 325 kB to 330 kB for the 2.5 kB above; its error stays ADR 0020's.
Admin's are its own measure, with the same headroom. Each change to either measures both builds,
as lesson L11 says, and a change that raises either budget says why in an ADR.

## Consequences

- `npm run build` fails when either application breaks its budget; CI builds both.
- Admin's initial chunks hold the shell, its guard and the sign-in route's entry; its review
  queue, with the CDK dialog, is a lazy chunk.
