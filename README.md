# Quality Engineering Lab

A hands-on Quality Engineering portfolio: test suites for a SaaS web application, covering its UI and its REST API (`/api/v1`).

> Status: Playwright is configured. No tests or page objects yet; the suites below are planned.

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

Requirements: Node.js 20.12+ (see `.nvmrc`), pnpm 10, and the application under test running (by default `http://localhost:3000`).

```bash
pnpm install
pnpm browsers                # installs Chromium, Firefox and WebKit
cp .env.example .env         # optional: point BASE_URL at another environment
```

| Script | What it does |
| --- | --- |
| `pnpm test` | Runs every Playwright project |
| `pnpm test:headed` / `pnpm test:ui` | Headed run / Playwright UI mode |
| `pnpm report` | Opens the last HTML report |
| `pnpm typecheck` | TypeScript check |

### Playwright configuration

`playwright.config.ts` sets `BASE_URL` (default `http://localhost:3000`), four projects (Chromium, Firefox, WebKit, Pixel 7), traces on first retry, screenshots and videos kept only for failures, a fixed `en-US` locale and `UTC` time zone, and CI behavior (retries, `forbidOnly`, GitHub and JUnit reporters) switched on by the `CI` variable. Tests go in `tests/`.
