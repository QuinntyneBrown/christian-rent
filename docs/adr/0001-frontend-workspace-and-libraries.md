# 0001. The frontend workspace and its libraries

**Status:** Accepted

## Context

`AGENTS.md` sets the frontend's shape: a multi-project Angular workspace under `frontend/`, with
the libraries `api`, `domain` and `components` and one application, `rent`, imported as
`@rent/<library>`, with a fixed dependency direction that ESLint enforces. The first change that
needs each part adds it; the scaffold is that change for all four.

## Decision

- `frontend/` is created with the Angular CLI (`ng new --create-application=false`), at the
  current Angular major (22). Projects live in `frontend/projects/`: `api`, `domain` and
  `components` are libraries generated with `ng generate library`; `rent` is the application.
- Libraries are consumed from source through `tsconfig.json` `paths` (`@rent/api` →
  `projects/api/src/public-api.ts`, and so on), not built to `dist/` first. The app compiles them
  in one pass, so tree-shaking and lazy chunks work across library boundaries. Libraries keep an
  `ng-package.json` so they can still be built on their own.
- `rent` is standalone, zoneless (`provideZonelessChangeDetection()`), `OnPush` everywhere,
  signals for state, `cr` as the selector prefix, SCSS, no SSR (the host is open; see the
  present-app-shell design).
- **Dependency direction**: `rent` → `components`, `api`, `domain`; `domain` → `api`;
  `components` → `api` for types only; `api` → nothing. No library imports `rent`.
  `eslint-plugin-boundaries` enforces it, and `@typescript-eslint/consistent-type-imports` plus
  a `no-restricted-imports` rule (`allowTypeImports`) keeps `components` → `api` to types.
- A further ESLint rule forbids `[innerHTML]` in templates and `bypassSecurityTrust*` in code
  (L2-026, criterion 1).
- Prettier formats and angular-eslint lints; `npm run format:check` and `npm run lint` fail on
  either.
- Unit tests run on Vitest, the Angular CLI's default test runner (`ng test`), with a fake clock
  (`vi.useFakeTimers()`) wherever time matters.
- The `admin` library is added by journey 10, which adds it to the dependency rule and to the
  ESLint boundaries in the same change.

## Consequences

- One `npm ci` installs everything; `ng build rent` builds the app and its libraries together.
- The boundaries are a lint error, not a test: the repository writes no architecture tests.
- A library cannot be published on its own without its `ng-package.json` build, which nothing
  needs today.
