# Quality Engineering Lab

A hands-on Quality Engineering portfolio: test suites for a SaaS web application, covering its UI and its REST API (`/api/v1`).

> Status: placeholder. The test suites below are planned and not built yet.

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
