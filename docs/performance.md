# Performance tests (k6)

[k6](https://k6.io) scripts in TypeScript under `perf/`, run by k6 2.3.0 directly (no build step).

| Profile | Where it runs | Load | Pass criteria |
| --- | --- | --- | --- |
| `perf/smoke.ts` (`pnpm perf:smoke`) | Production, every night after the Playwright suite | 2 virtual users for 30 seconds, each browsing once a second | Under 1% failed requests, over 99% of checks passing, 95th percentile under 800 ms for the list, search and Home figures, under 600 ms for reading one record |
| `perf/load.ts` (`pnpm perf:load`) | A non-production deployment only. It aborts before signing in if `BASE_URL` is production | Ramps to 15 users browsing and 5 users adding, moving and deleting records, holds for a minute | Under 1% failed requests, over 99% of checks passing, 95th percentile under 1 s for every endpoint (800 ms for a single read) |

- **Journeys.** Browsing opens the list, searches, opens one record and loads the Home figures. Editing adds a record, moves it to Applied and deletes it. Every request is tagged with its endpoint, so each one has its own threshold.
- **Data.** `setup()` signs in once and seeds the records the run reads; `teardown()` deletes every record whose company starts with `Perf Co`, including any a failed run left behind. Virtual users never sign in: sign-in is rate limited per IP.
- **Checks, not just timings.** Every response is checked for its status, and search must find exactly the seeded records, so a fast wrong answer still fails the run.
- **CI.** The nightly workflow downloads the k6 release from GitHub and checks it against a pinned SHA-256 before running it.

## Results

| Run | list p95 | search p95 | read p95 | Home figures p95 | Failed requests |
| --- | --- | --- | --- | --- | --- |
| Smoke, production, 2026-10-09 | 274 ms | 244 ms | 256 ms | 289 ms | 0% |
| Smoke, production, 2026-10-11, after the fix below | 173 ms | 148 ms | 148 ms | 140 ms | 0% |
| Load, non-production deployment, before the fix | 79 ms | 78 ms | 90 ms | 95 ms | **58%** |
| Load, non-production deployment, after the fix | 37 ms | 27 ms | 15 ms | 23 ms | 0% |

The load profile found that valid sessions were refused under load: fast 401s that sign the user out of the web app. After the application's fix, the same profile passes every threshold and check, and every endpoint is faster, in production too. See [Findings](findings.md).
