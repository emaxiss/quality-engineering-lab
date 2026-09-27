# Quality Engineering Lab

A hands-on Quality Engineering portfolio: test suites for a SaaS web application, covering its UI and its REST API (`/api/v1`).

**Application under test:** https://rolequeue.vercel.app (open to anyone: sign up, or use "Try the demo" for a private account with sample data).

> Status: Playwright page objects, fixtures, a UI smoke suite and an API suite are in place. The other areas below are planned.

## Planned areas

| Area | Focus |
| --- | --- |
| **Playwright** | End-to-end UI flows: auth, protected routes, CRUD, search, filters, sorting, pagination |
| **API testing** | Contract-level checks of `/api/v1`: status codes, response shapes, validation errors |
| **Pact contract testing** | Consumer-driven contracts between the UI client and the API |
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
| `pnpm test` | Runs every Playwright project |
| `pnpm test:smoke` | Runs only tests tagged `@smoke` |
| `pnpm test:headed` / `pnpm test:ui` | Headed run / Playwright UI mode |
| `pnpm report` | Opens the last HTML report |
| `pnpm typecheck` | TypeScript check |

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
  fixtures/test.ts      test.extend: page objects and API clients as fixtures
tests/
  setup/                signs in once and saves the session
  api/                  API specs, no browser
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
| `chromium`, `firefox`, `webkit`, `mobile-chrome` | the rest of `tests/ui/` | Depend on `setup` |

Sign-in is rate limited per IP, so a full run signs in four times: `setup` once, `auth-api` twice, `auth` once.

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

| Test | Defect |
| --- | --- |
| `auth api › logout with a bearer token ends the session` | Logout answers 204 for a bearer token, but the token keeps working until it expires. Logging out with the session cookie does end every session. |
