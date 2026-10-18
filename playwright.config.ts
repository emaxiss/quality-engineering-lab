import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { AUTH_STATE_PATH, env } from "./src/config/env";

// Local overrides (BASE_URL and friends) live in an untracked .env file. CI sets real env vars.
if (existsSync(".env")) process.loadEnvFile(".env");

const isCI = !!process.env.CI;
const publishReport = !!process.env.PUBLISH_REPORT;
// Playwright attaches a snapshot of the page to a failed test; on a signed-in page that includes
// the account's email. A published report leaves it out.
if (publishReport) process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

const authSpec = /ui\/auth\.spec\.ts/;
const apiAuthSpec = /api\/auth\.spec\.ts/;
const isolationSpec = /api\/isolation\.spec\.ts/;

// Chromium runs by default. Set CROSS_BROWSER to add Firefox, WebKit and a mobile viewport.
const browserProjects = [
  { name: "chromium", device: "Desktop Chrome" },
  ...(process.env.CROSS_BROWSER
    ? [
        { name: "firefox", device: "Desktop Firefox" },
        { name: "webkit", device: "Desktop Safari" },
        { name: "mobile-chrome", device: "Pixel 7" },
      ]
    : []),
];

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: isCI
    ? [["github"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/junit.xml" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: env.baseURL,
    // A published report keeps no traces, screenshots or videos: they record typed input and the
    // signed-in pages. scripts/check-report.mjs checks the result before it goes out.
    trace: publishReport ? "off" : "on-first-retry",
    screenshot: publishReport ? "off" : "only-on-failure",
    video: publishReport ? "off" : "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    { name: "setup", testMatch: /setup\/.*\.setup\.ts/ },
    // Plain functions, no browser and no network.
    { name: "unit", testMatch: /unit\/.*\.spec\.ts/ },
    { name: "api", testMatch: /api\/.*\.spec\.ts/, testIgnore: [apiAuthSpec, isolationSpec], dependencies: ["setup"] },
    { name: "contract-consumer", testMatch: /contract\/consumer\/.*\.spec\.ts/ },
    {
      name: "contract-provider",
      testMatch: /contract\/provider\/.*\.spec\.ts/,
      dependencies: ["contract-consumer"],
    },
    // Both auth projects sign in and out with their own account. Logging out ends every
    // session of that account, so they run one after the other, never in parallel.
    // Sign-in is rate limited per IP, so each runs once.
    { name: "auth-api", testMatch: apiAuthSpec },
    { name: "auth", testMatch: authSpec, dependencies: ["auth-api"], use: { ...devices["Desktop Chrome"] } },
    // Uses the login account as the second user, so it waits until both auth projects are done.
    { name: "isolation-api", testMatch: isolationSpec, dependencies: ["setup", "auth"] },
    // WCAG 2.2 AA scans with axe. Desktop Chrome only: the rules check markup, not the engine.
    {
      name: "a11y",
      testMatch: /a11y\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE_PATH },
    },
    // Screenshot comparisons against fixed, fictional data. Baselines are Linux renders, so this
    // project only exists inside the pinned Playwright image (scripts/visual.sh) and in CI.
    ...(process.env.VISUAL
      ? [
          {
            name: "visual",
            testMatch: /visual\/.*\.spec\.ts/,
            dependencies: ["setup"],
            snapshotPathTemplate: "{testDir}/{testFileDir}/__screenshots__/{projectName}/{arg}{ext}",
            expect: { toHaveScreenshot: { maxDiffPixels: 0 } },
            use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE_PATH },
          },
        ]
      : []),
    // Upgrade tests: seed runs against the version before an upgrade, verify against the one after.
    // Only defined for the migration scripts, so they never join a normal run.
    ...(process.env.MIGRATION
      ? [
          { name: "migration-seed", testMatch: /migration\/seed\.spec\.ts/, dependencies: ["setup"] },
          { name: "migration-verify", testMatch: /migration\/verify\.spec\.ts/, dependencies: ["setup"] },
        ]
      : []),
    ...browserProjects.map(({ name, device }) => ({
      name,
      testMatch: /ui\/.*\.spec\.ts/,
      testIgnore: authSpec,
      dependencies: ["setup"],
      use: { ...devices[device], storageState: AUTH_STATE_PATH },
    })),
  ],
});
