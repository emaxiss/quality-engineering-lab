# Architecture

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

## Projects

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

