# Quality Engineering Lab

A hands-on Quality Engineering portfolio: test suites for a SaaS web application, covering its UI and its REST API (`/api/v1`).

**Application under test:** https://rolequeue.vercel.app (open to anyone: sign up, or use "Try the demo" for a private account with sample data).

> Status: Playwright page objects, fixtures, a UI smoke suite and Pact contract tests are in place. The other areas below are planned.

## Planned areas

| Area | Focus |
| --- | --- |
| **Playwright** | End-to-end UI flows: auth, protected routes, CRUD, search, filters, sorting, pagination |
| **API testing** | Contract-level checks of `/api/v1`: status codes, response shapes, validation errors |
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
| `E2E_LOGIN_USER_EMAIL` / `E2E_LOGIN_USER_PASSWORD` | A second account for the log in / log out test. Logging out ends every session of an account, so it must differ from the one above. |

| Script | What it does |
| --- | --- |
| `pnpm test` | Runs every Playwright project |
| `pnpm test:smoke` | Runs only tests tagged `@smoke` |
| `pnpm test:contract` | Generates the Pact contract, then verifies it against `BASE_URL` |
| `pnpm test:headed` / `pnpm test:ui` | Headed run / Playwright UI mode |
| `pnpm report` | Opens the last HTML report |
| `pnpm typecheck` | TypeScript check |

## Architecture

```
src/
  config/env.ts         typed access to environment variables
  pages/                page objects, one per screen, all extending BasePage
  components/           parts shared across pages: app shell, dialogs
  api/                  REST clients that arrange and clean up test data
  data/                 factories for unique test data
  contracts/            Pact consumer client, pact settings, provider states
  fixtures/test.ts      test.extend: page objects and API clients as fixtures
tests/
  setup/                signs in once and saves the session
  api/                  API specs, no browser
  contract/
    consumer/           consumer tests against the Pact mock server
    provider/           verifies the contract against the live API
  ui/                   browser specs
```

- **Page objects** expose locators and user actions. Each defines `expectLoaded()`, the one assertion it owns; every other assertion lives in the spec.
- **Locators** use roles and accessible names only, never CSS or test IDs.
- **Fixtures** hand specs ready page objects, so specs never construct them.
- **Test data** is unique per test and created through the API when a spec only needs it to exist. `applicationsApi` deletes everything a test created or tracked when the test ends, pass or fail.
- **Sessions**: the `setup` project signs in through the UI and saves the session to `playwright/.auth/` (git-ignored). Browser projects reuse it. Signed-out specs opt out with an empty `storageState`.

### Projects

| Project | Runs | Notes |
| --- | --- | --- |
| `setup` | `tests/setup/` | Signs in and saves the session |
| `api` | `tests/api/` | No browser |
| `contract-consumer` | `tests/contract/consumer/` | No network. Writes `pacts/` (git-ignored) |
| `contract-provider` | `tests/contract/provider/` | Depends on `contract-consumer`. Signs in once |
| `auth` | `tests/ui/auth.spec.ts` | Desktop Chrome, own account. Sign-in is rate limited per IP, so a full run signs in only three times. |
| `chromium`, `firefox`, `webkit`, `mobile-chrome` | the rest of `tests/ui/` | Depend on `setup` |

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

## Contract tests (Pact)

Consumer-driven contract tests for the applications API, using Pact specification v4 and no broker.

1. **Consumer** (`contract-consumer`): `src/contracts/applications.client.ts` is a small typed client, the way a front end or integration would call the API. Its tests run it against Pact's mock server and write the contract to `pacts/`. The contract names only the fields the client reads, so the provider can add fields without breaking it.
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
