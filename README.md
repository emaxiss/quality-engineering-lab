# Quality Engineering Lab

[![Nightly](https://github.com/emaxiss/quality-engineering-lab/actions/workflows/nightly.yml/badge.svg)](https://github.com/emaxiss/quality-engineering-lab/actions/workflows/nightly.yml) [![Checks](https://github.com/emaxiss/quality-engineering-lab/actions/workflows/checks.yml/badge.svg)](https://github.com/emaxiss/quality-engineering-lab/actions/workflows/checks.yml)

Playwright and TypeScript test suites for a live SaaS web application, a job application tracker, through its UI and its REST API (`/api/v1`). The full suite runs every night against production.

**Application under test:** https://rolequeue.vercel.app. Anyone can sign up, or use "Try the demo" for a private account with sample data.

## What this demonstrates

| Area | What is here | Start with |
| --- | --- | --- |
| **UI automation** | Page objects and fixtures, locators by role and accessible name only, one shared signed-in session, Chromium by default with Firefox, WebKit and a mobile viewport on demand | `src/pages/`, `src/fixtures/test.ts`, `tests/ui/` |
| **API automation** | Endpoint clients that return raw responses, so status codes and error envelopes are part of every check; validation errors, pagination, filters, sorting | `src/api/`, `tests/api/` |
| **Response schemas** | A strict Zod schema for every response body: a field that appears, disappears or changes type fails the test. The TypeScript types are inferred from the same schemas | `src/api/schemas.ts` |
| **Authorization** | A second account tries to read, search for, export, update and delete another account's record: every attempt must answer 404 and leave the owner's copy unchanged | `tests/api/isolation.spec.ts` |
| **Security** | OWASP Top 10 checks through the API and the browser: mass assignment, forged and malformed tokens, malformed bodies, CSV formula injection in the export, cross-site writes, session cookie flags, security headers, and an open redirect after login | `tests/api/security.spec.ts`, `tests/api/auth.spec.ts`, `tests/ui/auth.spec.ts` |
| **Contract testing** | Pact v4: a consumer client writes the contract, and provider verification replays it against the live API with state handlers | `tests/contract/` |
| **Accessibility** | axe scans against WCAG 2.2 AA, with a known-issue list that fails when an issue is fixed, so the list cannot go stale; keyboard-only flows: adding, opening, moving and sorting applications with Tab, Enter, Space, Escape and typing, with focus checked at every step | `tests/a11y/`, `src/a11y/`, `tests/ui/keyboard.spec.ts` |
| **Database migrations** | Upgrade tests: seed and snapshot before a release, verify after it (every record, timestamps, dashboard figures, access rules), with expected value rewrites declared up front | `tests/migration/`, `src/migration/` |
| **CI quality gates** | Types, type-aware ESLint with the Playwright plugin, and Prettier required on every pull request; the full suite nightly against production; CodeQL | `.github/workflows/` |
| **Defects to regressions** | A logout defect caught by a `test.fail()` test that flipped to a guard once the fix shipped; three contrast failures tracked as known issues until they were fixed; three security defects tracked the same way until they were fixed | [Findings](#findings-and-decisions) |

## Findings and decisions

What testing this application surfaced, and how it shaped the suites.

| Finding | How the suites handle it |
| --- | --- |
| **Logging out with a bearer token did not end the session (fixed).** `POST /api/v1/auth/logout` answered 204, but the token kept authorizing requests until it expired, about an hour later. Logging out with the session cookie did end the session. | Found by `tests/api/auth.spec.ts`, which asserted the correct behavior under a `test.fail()` marker. When the fix shipped, the marked test passed, the run reported "expected to fail, but passed", and the marker was removed. The test now guards against the defect coming back. |
| **Logging out ends every session of the account**, not just the current one, with the session cookie or a bearer token. | The log in and log out tests use a dedicated account, so they can never sign out the session the rest of the suite shares, and the tests on that account run one after the other. Once bearer logout was fixed, a parallel run let the logout test end the token another test was still using: that test had only passed because of the defect. |
| **Three color contrast failures (WCAG 2.2 AA, 1.4.3), fixed.** The current page in the sidebar (3.74:1), the date line on Home (4.36:1) and the High priority badge (4.22:1) were below 4.5:1. The badge failed on every High priority card and list row too, which the scans missed while the test account held no High priority records. | Found by the accessibility scans and listed as known issues: reported on every run, anything new failed the scan, and a known issue that stopped reproducing failed it too. The board and list scans now create a High priority record, so the badge is always checked. When the fix shipped, the entries were removed and the scans run with none. Scanning before animations finish reports around 30 false contrast failures on Home, so the scans wait for animations to finish. |
| **Two releases changed the database**: a table rename that moved the API to new paths, and a rewrite of every stored priority value. | Both were checked with the upgrade test before they shipped: seed on the old version, migrate the same database, verify on the new one. The second declared its value rewrite (`P0` to `HIGH` and so on), so verify required exactly that change and nothing else. |
| **Keys pressed before the page is interactive do nothing.** The Add button needs its script, so an Enter pressed while the page is still loading is lost, and the text typed after it goes nowhere. A first keyboard run looked like the Add dialog closing by itself. | The keyboard helper presses Enter until the dialog opens and never while it is open. Clicks wait for this on their own; key presses do not. |
| **Open redirect after login (fixed, OWASP A01).** The login page sends you to its `next` parameter after you sign in. It refuses `//other.site` and `/\other.site`, but browsers remove tabs and line breaks from URLs, so `/login?next=%2F%09%2Fexample.com` (a tab between the slashes) signs you in and then opens example.com. A genuine login link for the application can deliver the user to a page that only looks like it. | `tests/ui/auth.spec.ts` signs in through that link and asserts the user stays on the application. It ran under `test.fail()` until the fix shipped, then the marker was removed. |
| **The session cookie was readable by page scripts and had no Secure flag (fixed, OWASP A05).** It was `SameSite=Lax` but had no `HttpOnly` or `Secure`, so a script injected into the page could have read the session. | `tests/api/auth.spec.ts` checks the cookie attributes on login, without ever logging the cookie's value. It ran under `test.fail()` until the fix shipped. |
| **Cookie-signed writes were not checked for origin (fixed, defense in depth).** A write sent with the session cookie and `Origin: https://attacker.example` created a record, also with a `text/plain` body, which a cross-site form can send. Browsers did not attach the `SameSite=Lax` cookie to such requests, so it was not exploitable; the application now answers 403 regardless. | `tests/api/security.spec.ts`. It ran under `test.fail()` until the fix shipped. |
| **Forged tokens are refused at two layers.** The API answers 401 to a changed signature, claims for another user under the real signature, an empty or malformed bearer, and other schemes. On production, the hosting firewall drops an unsigned (`alg: none`) token with a 403 before it reaches the API. | The token test accepts 401 or 403 and fails only if a forged token is ever authorized. |
| **Sign-in is rate limited per IP.** | The suite signs in once and reuses the session. Only the log in, log out, isolation and contract provider tests sign in on their own, so a full run stays well inside the limit. |

Design decisions:

- **Tests run against the live application**, so every test creates uniquely named data and deletes it when it ends, pass or fail. The test accounts hold no records after a run.
- **Locators use roles and accessible names only**, never CSS or test IDs. A locator that stops matching often points at an accessibility regression, not just a markup change.
- **Chromium by default, other browsers on demand.** Firefox, WebKit and a mobile viewport run with `pnpm test:cross-browser`, which keeps the everyday run fast and inside the sign-in limit.
- **Suites are independent**: each runs on its own, locally or in CI.

## Status

**In place:** UI smoke suite, keyboard-only flows, API suite with response schemas, security checks, cross-user isolation, Pact contracts, WCAG scans, database upgrade tests, pull request checks, and the nightly run against production.

**Planned** (not implemented yet):

- **UI flows beyond the smoke suite**: editing, stage changes, search, filters, sorting and pagination through the UI.
- **Performance testing** with k6: load and stress profiles for the list, detail and dashboard endpoints.
- **Visual regression**: screenshot comparison for key pages and states.
- **Screen reader flows**, beyond what the automated WCAG rules and the keyboard flows cover.
- **More security cases**: session expiry and refresh, stored script injection through the UI, and request rate limits.
- **AI evaluations**: evaluation harnesses for the AI features planned for the application.

## CI

| Workflow | When | What |
| --- | --- | --- |
| `checks.yml` | Every pull request and push to `main` | `pnpm check` (types, lint, format) and a dry `playwright test --list`. Required to merge into `main` |
| `nightly.yml` | Daily at 06:00 UTC, and on demand | The full suite against the live application, with the two test accounts from repository secrets. No report artifacts: traces record typed input, and artifacts of a public repository can be downloaded by anyone |

CodeQL scans every pull request, and Dependabot watches the dependencies. The application's own pull request pipeline also runs these suites against a local build, including the upgrade test on every pull request that adds a migration.

## Setup

Requirements: Node.js 20.19+ (see `.nvmrc`), pnpm 10, and two accounts in the application under test (sign up at the live URL above).

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
| `pnpm test:unit` | Unit tests for helpers, no network |
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
    schemas.ts          Zod schemas for every response body
    assertions.ts       status, JSON and error-envelope checks, validated against the schemas
    types.ts            types inferred from the schemas, plus request types
  data/                 factories for unique test data
  contracts/            Pact consumer client, pact settings, provider states
  a11y/                 axe scan helper and the known accessibility issues
  migration/            upgrade-test dataset and account snapshots
  fixtures/test.ts      test.extend: page objects and API clients as fixtures
  support/keyboard.ts   Tab-to-control and focus helpers for keyboard-only flows
tests/
  setup/                signs in once and saves the session
  api/                  API specs, no browser
  contract/
    consumer/           consumer tests against the Pact mock server
    provider/           verifies the contract against the live API
  migration/            seed and verify phases of an upgrade test
  ui/                   browser specs
  a11y/                 accessibility scans
```

- **Page objects** expose locators and user actions. Each defines `expectLoaded()`, the one assertion it owns; every other assertion lives in the spec.
- **Locators** use roles and accessible names only, never CSS or test IDs.
- **Fixtures** hand specs ready page objects, so specs never construct them.
- **API specs** call endpoint clients and assert on the raw response, so status codes and error envelopes are part of every check. Every JSON body is also parsed with its Zod schema: objects are strict, so a field that appears, disappears or changes type fails the test that received it, with a message naming the field. The TypeScript types come from the same schemas, so they cannot drift from what the tests check. The `userRequest` fixture is an API context signed in with the saved session; the built-in `request` fixture stays anonymous.
- **Test data** is unique per test and created through the API when a spec only needs it to exist. `applicationsApi` deletes everything a test created or tracked when the test ends, pass or fail.
- **Sessions**: the `setup` project signs in through the UI and saves the session to `playwright/.auth/` (git-ignored). Browser projects reuse it. Signed-out specs opt out with an empty `storageState`.

### Projects

| Project | Runs | Notes |
| --- | --- | --- |
| `setup` | `tests/setup/` | Signs in and saves the session |
| `unit` | `tests/unit/` | Plain functions, no browser, no network |
| `api` | `tests/api/` except `auth.spec.ts` and `isolation.spec.ts` | No browser. Depends on `setup` |
| `auth-api` | `tests/api/auth.spec.ts` | Login account, no browser |
| `auth` | `tests/ui/auth.spec.ts` | Login account, desktop Chrome. Runs after `auth-api`: logging out ends every session of the account, so the two must not overlap |
| `isolation-api` | `tests/api/isolation.spec.ts` | Main account plus the login account as a second user. Runs after `auth`, so no logout can end its session mid-test |
| `a11y` | `tests/a11y/` | Desktop Chrome. Depends on `setup` |
| `chromium` | the rest of `tests/ui/` | Depends on `setup` |
| `firefox`, `webkit`, `mobile-chrome` | the rest of `tests/ui/` | Only with `CROSS_BROWSER` set. Depend on `setup` |
| `contract-consumer` | `tests/contract/consumer/` | No network. Writes `pacts/` (git-ignored) |
| `contract-provider` | `tests/contract/provider/` | Depends on `contract-consumer`. Signs in once |
| `migration-seed`, `migration-verify` | `tests/migration/` | Only with `MIGRATION` set, through the migration scripts. Depend on `setup` |

Sign-in is rate limited per IP, so a full run signs in eight times: `setup` once, `auth-api` three times, `auth` twice, `isolation-api` once, `contract-provider` once.

Traces are kept on first retry, and screenshots and videos only for failures. Locale is `en-US` and the time zone `UTC`. Setting `CI` turns on retries, `forbidOnly`, and the GitHub and JUnit reporters.

## Smoke suite

Happy paths only. Negative and edge cases come later.

| Spec | Covers |
| --- | --- |
| `api/health.spec.ts` | Health endpoint reports the service and database as ok |
| `ui/public.spec.ts` | Landing page, links to the login form and the privacy page |
| `ui/auth.spec.ts` | Log in, log out |
| `ui/navigation.spec.ts` | Home loads, primary navigation reaches every section |
| `ui/applications.spec.ts` | Board and list views, add an application, open its details |

## API suite

| Spec | Covers |
| --- | --- |
| `api/auth.spec.ts` | Login returns a bearer token that authorizes requests and the same token altered is refused; the session cookie flags; logout with that token ends the session |
| `api/account.spec.ts` | Signed-in account, 401 without a session, JSON and CSV export |
| `api/isolation.spec.ts` | A second account cannot read, search for, export, update or delete another account's application: every attempt answers 404, and the owner's copy stays unchanged |
| `api/dashboard.spec.ts` | Summary counts an application in its stage, source and due follow-ups; 401 without a session |
| `api/applications.spec.ts` | Create with defaults, read, partial update, applied and closed dates on stage changes, delete |
| `api/applications-list.spec.ts` | Search with pagination meta, stage filter, sort, empty page past the end |
| `api/security.spec.ts` | Server-owned fields refused on create and update, a prototype pollution payload, malformed and oversized bodies, forged and malformed bearer tokens, CSV formula injection, cross-site cookie writes, security headers and HSTS |
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

## Accessibility

`tests/a11y/pages.spec.ts` scans the landing, login and privacy pages signed out, and Home, the applications board and list, the add application dialog and settings signed in, with [axe](https://github.com/dequelabs/axe-core) against WCAG 2.2 A and AA.

- Scans wait for running animations to finish, so colors are measured as the user sees them once the page settles.
- Every violation, with the failing elements, is attached to the HTML report as `axe-violations.json`.
- Known issues (`src/a11y/known-issues.ts`) are matched by rule and the element's visible text, not by CSS classes, and show up as annotations on the test. A new violation fails the scan, and so does a known issue that no longer reproduces.

Automated rules cover only part of WCAG, so `tests/ui/keyboard.spec.ts` runs the main flows with the keyboard only: add an application, close the Add dialog with Escape, open a card with Enter and Space, move an application to another stage, and sort the list. Each step checks where focus is: inside a dialog when it opens, back on the control that opened it when it closes. Controls are reached with Tab, so one that drops out of the tab order fails the flow. Screen reader flows come next.

## Database migration tests

An upgrade test proves that a release with a database migration keeps every record, keeps derived figures and access rules, and that the application still works on migrated data. It runs in two phases, through the API only:

1. **Seed**, against the version before the upgrade: creates a fixed dataset in two accounts and saves a snapshot of everything the API reports about each account.
2. **Verify**, against the version after the upgrade: compares both accounts with the snapshot, then exercises the migrated records.

The dataset covers what a migration can break: every stage and priority, every enum value, empty optional fields, maximum lengths (200-character text, a 10,000-character description, 10 tags of 40 characters), Unicode and emoji, the lowest and highest salary and a minimum equal to the maximum, all three dates set and unset, follow-ups due and not due, several pages of records, and records in a second account.

| Check | Protects against |
| --- | --- |
| Keeps every record, and adds none | Rows lost or duplicated while tables, keys or types are rewritten |
| Leaves every record as it was, apart from the expected changes, timestamps included | Truncated text, mangled Unicode, lost values, value rewrites that go further than intended, and backfills that touch `createdAt` or `updatedAt` |
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
| `MIGRATION_EXPECTED_CHANGES` | Values the upgrade rewrites, as JSON per field, for example `{"status":{"WITHDRAWN":"DECLINED"}}`. Verify applies them to the snapshot before comparing, including the keys of per-stage counts, so it checks that the migration rewrote exactly those values and nothing else |

Each phase signs in twice (both accounts).
