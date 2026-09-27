# Quality Engineering Lab

A hands-on Quality Engineering portfolio: test suites for a SaaS web application, covering its UI and its REST API (`/api/v1`).

**Application under test:** https://rolequeue.vercel.app (open to anyone: sign up, or use "Try the demo" for a private account with sample data).

> Status: Playwright page objects, fixtures, a UI smoke suite, an API suite, Pact contract tests and database migration tests are in place. The other areas below are planned.

## Findings and decisions

What testing this application surfaced, and how it shaped the suites.

| Finding | How the suites handle it |
| --- | --- |
| **Logging out with a bearer token did not end the session (fixed).** `POST /api/v1/auth/logout` answered 204, but the token kept authorizing requests until it expired, about an hour later. Logging out with the session cookie did end the session. | Found by `tests/api/auth.spec.ts`, which asserted the correct behavior under a `test.fail()` marker. When the fix shipped, the marked test passed, the run reported "expected to fail, but passed", and the marker was removed. The test now guards against the defect coming back. |
| **Logging out ends every session of the account**, not just the current one, with the session cookie or a bearer token. | The log in and log out tests use a dedicated account, so they can never sign out the session the rest of the suite shares, and the tests on that account run one after the other. Once bearer logout was fixed, a parallel run let the logout test end the token another test was still using. |
| **Sign-in is rate limited per IP.** | The suite signs in once and reuses the session. Only the log in and log out tests sign in on their own, so a full run stays well inside the limit. |

Design decisions:

- **Tests run against the live application**, so every test creates uniquely named data and deletes it when it ends, pass or fail. The test account holds no records after a run.
- **Locators use roles and accessible names only.** A locator that stops matching often points at an accessibility regression, not just a markup change.
- **Chromium by default, other browsers on demand.** Firefox, WebKit and a mobile viewport run with `pnpm test:cross-browser`, which keeps the everyday run fast and inside the sign-in limit.

## Planned areas

| Area | Focus |
| --- | --- |
| **Playwright** | End-to-end UI flows: auth, protected routes, CRUD, search, filters, sorting, pagination |
| **API testing** | Contract-level checks of `/api/v1`: status codes, response shapes, validation errors (in place, see below) |
| **Pact contract testing** | Consumer-driven contracts between an API client and the API (in place, see below) |
| **Performance testing** | Load and stress profiles with k6 against list, detail and dashboard endpoints |
| **Accessibility** | Automated WCAG checks with axe, plus keyboard and screen reader flows |
| **Visual testing** | Screenshot comparison for key pages and states |
| **CI/CD** | Pipelines that boot the app and its dependencies and run every suite on each change |
| **Security-oriented testing** | Authorization and tenant isolation (cross-user access), auth edge cases, input handling |
| **AI evaluations** | Evaluation harnesses for AI features, once the product has them |

## Approach

- Prefer accessible, semantic selectors over test IDs.
- Keep each suite independent, reproducible, and runnable locally and in CI.

## Setup

Requirements: Node.js 20.12+ (see `.nvmrc`), pnpm 10, and two accounts in the application under test (sign up at the live URL above).

```bash
pnpm install
pnpm browsers                # installs Chromium, Firefox and WebKit
cp .env.example .env         # then fill in both accounts
```

| Variable | Used for |
| --- | --- |
| `BASE_URL` | Where the application runs. Defaults to the live URL above. |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | The account every signed-in test uses. The setup project signs in once and shares the session. |
| `E2E_LOGIN_USER_EMAIL` / `E2E_LOGIN_USER_PASSWORD` | A second account for the log in / log out tests (UI and API). Logging out ends every session of an account, so it must differ from the one above. |

| Script | What it does |
| --- | --- |
| `pnpm test` | Runs every project, with Chromium as the only browser |
| `pnpm test:smoke` | Runs only tests tagged `@smoke` |
| `pnpm test:cross-browser` | Runs everything in Chromium, Firefox, WebKit and a Pixel 7 viewport |
| `pnpm test:contract` | Generates the Pact contract, then verifies it against `BASE_URL` |
| `pnpm test:migration:seed` / `pnpm test:migration:verify` | The two phases of an upgrade test, see [Database migration tests](#database-migration-tests) |
| `pnpm test:headed` / `pnpm test:ui` | Headed run / Playwright UI mode |
| `pnpm report` | Opens the last HTML report |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint with type-aware TypeScript rules and the Playwright plugin (missing `await`, focused tests, tests without assertions) |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm check` | Types, lint and format together. CI runs it on every pull request |

## Architecture

```
src/
  config/env.ts         typed access to environment variables
  pages/                page objects, one per screen, all extending BasePage
  components/           parts shared across pages: app shell, dialogs
  api/
    endpoints/          one client per resource, returning raw responses
    applications.api.ts arranges and cleans up test data
    assertions.ts       status, JSON and error-envelope checks
    types.ts            response and request types
  data/                 factories for unique test data
  contracts/            Pact consumer client, pact settings, provider states
  migration/            upgrade-test dataset and account snapshots
  fixtures/test.ts      test.extend: page objects and API clients as fixtures
tests/
  setup/                signs in once and saves the session
  api/                  API specs, no browser
  contract/
    consumer/           consumer tests against the Pact mock server
    provider/           verifies the contract against the live API
  migration/            seed and verify phases of an upgrade test
  ui/                   browser specs
```

- **Page objects** expose locators and user actions. Each defines `expectLoaded()`, the one assertion it owns; every other assertion lives in the spec.
- **Locators** use roles and accessible names only, never CSS or test IDs.
- **Fixtures** hand specs ready page objects, so specs never construct them.
- **API specs** call endpoint clients and assert on the raw response, so status codes and error envelopes are part of every check. The `userRequest` fixture is an API context signed in with the saved session; the built-in `request` fixture stays anonymous.
- **Test data** is unique per test and created through the API when a spec only needs it to exist. `applicationsApi` deletes everything a test created or tracked when the test ends, pass or fail.
- **Sessions**: the `setup` project signs in through the UI and saves the session to `playwright/.auth/` (git-ignored). Browser projects reuse it. Signed-out specs opt out with an empty `storageState`.

### Projects

| Project | Runs | Notes |
| --- | --- | --- |
| `setup` | `tests/setup/` | Signs in and saves the session |
| `api` | `tests/api/` except `auth.spec.ts` | No browser. Depends on `setup` |
| `auth-api` | `tests/api/auth.spec.ts` | Login account, no browser |
| `auth` | `tests/ui/auth.spec.ts` | Login account, desktop Chrome. Runs after `auth-api`: logging out ends every session of the account, so the two must not overlap |
| `chromium` | the rest of `tests/ui/` | Depends on `setup` |
| `firefox`, `webkit`, `mobile-chrome` | the rest of `tests/ui/` | Only with `CROSS_BROWSER` set. Depend on `setup` |
| `contract-consumer` | `tests/contract/consumer/` | No network. Writes `pacts/` (git-ignored) |
| `contract-provider` | `tests/contract/provider/` | Depends on `contract-consumer`. Signs in once |
| `migration-seed`, `migration-verify` | `tests/migration/` | Only with `MIGRATION` set, through the migration scripts. Depend on `setup` |

Sign-in is rate limited per IP, so a full run signs in five times: `setup` once, `auth-api` twice, `auth` once, `contract-provider` once.

Traces are kept on first retry, and screenshots and videos only for failures. Locale is `en-US` and the time zone `UTC`. Setting `CI` turns on retries, `forbidOnly`, and the GitHub and JUnit reporters.

## Smoke suite

Happy paths only. Negative and edge cases come later.

| Spec | Covers |
| --- | --- |
| `api/health.spec.ts` | Health endpoint reports the service and database as ok |
| `ui/public.spec.ts` | Landing page, link to the login form |
| `ui/auth.spec.ts` | Log in, log out |
| `ui/navigation.spec.ts` | Dashboard loads, primary navigation reaches every section |
| `ui/applications.spec.ts` | Board and list views, add an application, open its details |

## API suite

| Spec | Covers |
| --- | --- |
| `api/auth.spec.ts` | Login returns a bearer token that authorizes requests; logout with that token ends the session |
| `api/account.spec.ts` | Signed-in account, 401 without a session, JSON and CSV export |
| `api/applications.spec.ts` | Create with defaults, read, partial update, applied and closed dates on stage changes, delete |
| `api/applications-list.spec.ts` | Search with pagination meta, stage filter, sort, empty page past the end |
| `api/applications-errors.spec.ts` | Validation errors with field paths, malformed and unknown ids, 401 on every call without a session |

### Known issues

Tests for known defects assert the correct behavior and are marked `test.fail()`, so the suite stays green while the defect exists and turns red once it is fixed, as a reminder to remove the marker.

None open.

## Contract tests (Pact)

Consumer-driven contract tests for the applications API, using Pact specification v4 and no broker.

1. **Consumer** (`contract-consumer`): `src/contracts/applications.client.ts` is a small typed client that serves as a reference consumer, the way a front end or integration would call the API. Its tests run it against Pact's mock server and write the contract to `pacts/`. The contract names only the fields the client reads, so the provider can add fields without breaking it.
2. **Provider** (`contract-provider`): replays every interaction against `BASE_URL`. State handlers create the records an interaction needs through the public API and inject their ids into the request path. A request filter swaps the contract's placeholder token for a real one. Every record the run creates is deleted after each interaction.

| Interaction | Provider state | Expected |
| --- | --- | --- |
| First page of applications | the user has applications | 200, list with pagination meta |
| Read one application | an application exists | 200 |
| Create an application | none | 201 |
| Mark an application as applied | an application exists | 200, `appliedAt` set |
| Delete an application | an application exists | 204 |
| Read an application that does not exist | none | 404 `NOT_FOUND` |
| Create without a company | none | 400 `VALIDATION_ERROR` |
| List without a token | none | 401 `UNAUTHORIZED` |

## Database migration tests

An upgrade test proves that a release with a database migration keeps every record, keeps derived figures and access rules, and that the application still works on migrated data. It runs in two phases, through the API only:

1. **Seed**, against the version before the upgrade: creates a fixed dataset in two accounts and saves a snapshot of everything the API reports about each account.
2. **Verify**, against the version after the upgrade: compares both accounts with the snapshot, then exercises the migrated records.

The dataset covers what a migration can break: every stage and priority, every enum value, empty optional fields, maximum lengths (200-character text, a 10,000-character description, 10 tags of 40 characters), Unicode and emoji, the lowest and highest salary and a minimum equal to the maximum, all three dates set and unset, follow-ups due and not due, several pages of records, and records in a second account.

| Check | Protects against |
| --- | --- |
| Keeps every record, and adds none | Rows lost or duplicated while tables, keys or types are rewritten |
| Leaves every record unchanged, timestamps included | Truncated text, mangled Unicode, lost values, and backfills that touch `createdAt` or `updatedAt` |
| Keeps the dashboard figures | Enum or status mappings that shift records into the wrong stage or priority |
| Keeps each account's records private | Ownership or access rules lost or rebuilt wrongly |
| Migrated records can still be updated, filtered, sorted and deleted | Broken indexes, constraints or defaults that only show up on writes |
| Paths the upgrade removed answer 404 | Old endpoints left serving after a rename (set `MIGRATION_REMOVED_PATHS`) |

### Run an upgrade test

1. Start the version before the upgrade and point `BASE_URL` at it.
2. `pnpm test:migration:seed` writes the snapshot to `MIGRATION_SNAPSHOT_DIR` (default `migration-snapshots/`, git-ignored).
3. Apply the migration and start the new version, with the same database and accounts.
4. `pnpm test:migration:verify` runs the checks, then deletes the seeded records. If verify cannot start, for example because sign-in is rate limited, it keeps the data so it can simply run again.

| Variable | Used for |
| --- | --- |
| `APPLICATIONS_API_PATH` | Base path of the applications API, when one version serves it somewhere else |
| `MIGRATION_SNAPSHOT_DIR` | Where the snapshot is written and read |
| `MIGRATION_REMOVED_PATHS` | Comma-separated paths the upgrade removed; each must answer 404 |

Each phase signs in twice (both accounts).
