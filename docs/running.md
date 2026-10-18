# Running the suites

## Setup

Requirements: Node.js 20.19+ (see `.nvmrc`), pnpm 10, and two accounts in the application under test (sign up at https://rolequeue.vercel.app).

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
| `pnpm test:visual` / `pnpm test:visual:update` | Screenshot comparisons, or new baselines, inside the pinned Playwright Linux image (needs Docker). See [Visual regression](suites.md#visual-regression) |
| `pnpm test:migration:seed` / `pnpm test:migration:verify` | The two phases of an upgrade test, see [Database migration tests](migrations.md) |
| `pnpm test:headed` / `pnpm test:ui` | Headed run / Playwright UI mode |
| `pnpm report` | Opens the last HTML report |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint with type-aware TypeScript rules and the Playwright plugin (missing `await`, focused tests, tests without assertions) |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm check` | Types, lint and format together. CI runs it on every pull request |
| `pnpm perf:smoke` | k6 smoke profile against `BASE_URL`, safe for production. Needs [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) |
| `pnpm perf:load` | k6 load profile; refuses to run against production |


## CI

| Workflow | When | What |
| --- | --- | --- |
| `checks.yml` | Every pull request and push to `main` | `pnpm check` (types, lint, format) and a dry `playwright test --list`. Required to merge into `main` |
| `nightly.yml` | Daily at 06:00 UTC, and on demand | The full suite against the live application, with the two test accounts from repository secrets, then the k6 smoke profile (k6 downloaded from its GitHub release and checked against a pinned SHA-256), and the screenshot comparisons in the pinned Playwright image. The HTML report is published, see below |

### Published report

Every nightly run publishes its HTML report to https://emaxiss.github.io/quality-engineering-lab/, also after a failed run. The report is public, so it is built to hold nothing that signs anyone in:

- `PUBLISH_REPORT=1` turns off traces, screenshots and videos, which record typed input and signed-in pages, and the page snapshot Playwright attaches to a failed test.
- Sign-in fields are filled without a step that names the value (`src/support/secret-input.ts`), and API checks quote a response body only when the status is wrong, with tokens and email addresses blanked out.
- `scripts/check-report.ts` then reads the whole report, including the test data zipped inside `index.html`, and fails if it finds either account's email or password, or anything shaped like a token. Only a clean report is published.

Run the same check locally with `PUBLISH_REPORT=1 pnpm test`, then `node --env-file=.env scripts/check-report.ts`.

CodeQL scans every pull request, and Dependabot watches the dependencies. The application's own pull request pipeline also runs these suites against a local build, including the upgrade test on every pull request that adds a migration.

