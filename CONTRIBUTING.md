# Contributing to christian.rent

Thank you for your interest in christian.rent. This guide explains how to propose a change and what a
pull request needs before it can be merged.

By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).

## Contents

- [Ways to contribute](#ways-to-contribute)
- [Before you start](#before-you-start)
- [How a change is made](#how-a-change-is-made)
- [Development setup](#development-setup)
- [Coding conventions](#coding-conventions)
- [Testing](#testing)
- [Commits and pull requests](#commits-and-pull-requests)
- [Licensing of contributions](#licensing-of-contributions)

## Ways to contribute

- **Report a bug.** Open an issue with the steps, what you expected and what happened.
  Include the device, the browser and its version.
- **Suggest a feature.** Open an issue saying who it is for and how it helps someone posting or looking for something to rent.
- **Improve the documentation.** Requirements, designs and mocks go in `docs/` and welcome
  corrections.
- **Implement a feature.** Once the detailed designs exist they are listed in
  `docs/detailed-designs/README.md`; each traces to its requirements in `docs/specs/L2.md`.

Security vulnerabilities are never reported in a public issue; see [`SECURITY.md`](SECURITY.md).

## Before you start

1. Read [`AGENTS.md`](AGENTS.md). It is the single source of the repository's rules, and it applies
   to people and coding agents alike.
2. Read the architecture decision records in `docs/adr/` for the area you will change.
3. For anything larger than a small fix, open an issue first so the approach can be agreed before
   you write code.

Every change serves what christian.rent is for: posting a space or a thing for rent, asking for
one, or finding one. A change that cannot be traced back to that does not belong here.

Use the words the requirements use (`docs/specs/`, and until they exist, `AGENTS.md`) in code,
docs and UI; do not invent synonyms.

## How a change is made

christian.rent is built requirement first and test first.

1. **Requirement.** Every change to production behaviour has a requirement with acceptance
   criteria in `docs/specs/`.
2. **Detailed design.** The feature has a design in `docs/detailed-designs/`.
3. **Mock.** Every screen and state the change touches has a mock in `docs/mocks/`, transcribed
   from the Magic Patterns prototype. The mocks are the source of truth for the UI.
4. **Slices.** The work is planned as small, reviewable slices.
5. **Acceptance test first.** For each slice, write the Given-When-Then criteria and the
   acceptance test, and run it to prove it fails for the expected reason before writing production
   code.
6. **Implement, then refactor** with the tests green, and run the regression checks before the
   next slice.

Documentation-only, mock-only, design-system-only and test-only changes do not need steps 1 to 3
unless they are part of a production behaviour change. Do not write tests for mocks or the design
system, and never add architecture tests (tests that assert the shape of the code rather than its
behaviour).

## Development setup

Follow [Getting started](README.md#getting-started) in the README. You need Node.js 24 with npm,
the .NET SDK 10 and a current Chrome or Edge.

## Coding conventions

Frontend:

- Prettier owns formatting and angular-eslint owns lint; CI fails on either.
- Standalone components, signals and OnPush change detection, zoneless.
- One type per file, and no single-file components: `name.ts` + `name.html` + `name.scss`.
- Selectors use `cr-*`; class, file and folder names omit the prefix.
- Presentation components go in the `components` library, named as in the design system, and
  take inputs and emit outputs; the contracts, their types and the backend's clients go in the
  `api` library; the rules the browser applies go in `domain`; everything else is the `rent`
  app (`frontend/projects/`).
- A contract refuses with an error whose `code` a screen branches on.
- Read design tokens by role, never hex values.
- Button-triggered editing opens a CDK Dialog or navigates to a screen; no inline forms.
- Every screen works at every width, with touch and with the keyboard; colour is never the only
  carrier of a state, and motion respects `prefers-reduced-motion`.
- The backend decides what a member or an admin may do; the frontend never relies on a hidden
  control for a rule.
- What a member writes (a title, a note, a message, a name) is rendered as text, never as HTML.

Backend:

- Clean architecture: `ChristianRent.Domain` ← `ChristianRent.Application` ← `ChristianRent.Infrastructure` ← `ChristianRent.Api`.
- Business rules live in handlers and domain services; a controller or hub method sends one
  MediatR request and checks nothing itself.
- Errors are ProblemDetails, with a `code` where a client branches on them.
- No log, metric or span carries a contact detail, a token, message text, a query string or a
  body.

## Testing

- **No automated test uses a real backend or database.** Behaviour specs run against fixtures
  that answer the API; backend tests run on EF Core InMemory.
- Tests never sleep: unit tests advance a fake clock, and backend tests advance
  `FakeTimeProvider` or await an event with a timeout.
- Use the Page Object Model: selectors live in page objects, never in a spec.
- Run frontend tests in Chromium only.
- Do not run the visual, responsive or accessibility sweeps or update baselines unless the
  repository owner asks; do keep them current.

The commands for each suite are in the README under
[Build and test](README.md#build-and-test). A change is done when format, lint, unit tests, the
production build, the backend tests and the behaviour specs pass
(`node tools/verify/verify.mjs`).

## Commits and pull requests

- Branch from `main`; never commit to `main` directly.
- Keep each pull request to one concern, and each commit to one slice.
- Write commit subjects in the imperative mood, as a sentence that says what the change does
  (for example, "Offer to post a request when a search finds nothing").
- Fill in the pull request template: what changed, why, the requirement it satisfies and how it
  was tested.
- Keep the requirement, detailed design, mock, tests and code in agreement within the same pull
  request.
- CI must be green before review.

## Licensing of contributions

christian.rent is licensed under the [MIT License](LICENSE). By submitting a contribution you agree that
it is licensed under the same terms, and you confirm that you have the right to submit it.
