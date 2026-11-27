# Security policy

The security of christian.rent and of the people who use it matters. christian.rent holds
members' listings and photos, the messages they send each other and the names of their churches,
and it gives admins the power to approve and remove. We treat every report seriously.

## Supported versions

christian.rent is under active development and has no released versions yet. Security fixes are made on
the `main` branch only.

| Version | Supported |
|---|---|
| `main` | Yes |
| Anything else | No |

## Reporting a vulnerability

**Do not report a security vulnerability in a public GitHub issue, discussion or pull request.**

Report it privately through GitHub's
[private vulnerability reporting](https://github.com/QuinntyneBrown/christian-rent/security/advisories/new)
for this repository. If that is not available to you, contact the repository owner privately
through their [GitHub profile](https://github.com/QuinntyneBrown).

Include as much of the following as you can:

- the kind of issue (for example, reading or changing another member's listing or messages, reaching
  Admin without being an admin, one application's session working on the other's endpoints,
  signing someone in to an account they did not choose, learning whether an account exists,
  getting around the sign-in lockout or throttling, a malicious upload, a Content-Security-Policy
  bypass, injection or cross-site scripting);
- the affected page, endpoint or source file, with the branch or commit;
- the steps to reproduce it, and the browser and host it needs;
- a proof of concept, if you have one;
- the impact, and how an attacker could use it.

## What to expect

- We acknowledge a report within **three business days**.
- We confirm or rule out the issue and share an expected timeline within **ten business days**.
- We keep you informed until it is fixed, and credit you in the advisory unless you would rather
  stay anonymous.

Please give us reasonable time to fix an issue before you disclose it publicly.

## Scope

In scope: the code in this repository, its two applications (`rent` and Admin) and their
backend, and anything that lets one member read or change what belongs to another, reach the
review queue, take over or keep a session, or learn a member's contact details, an account's
email or its password.

Out of scope: denial-of-service testing, social engineering, physical attacks, and findings in
third-party dependencies that are already publicly known (report those to the dependency's
maintainers).

Test only against your own copy of christian.rent and your own account, and never contact,
impersonate or defraud a real member.
