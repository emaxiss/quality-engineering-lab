# Test suites

## Smoke suite

Happy paths only. Negative and edge cases are in the API suite below.

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

