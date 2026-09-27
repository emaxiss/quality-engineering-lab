import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { AUTH_STATE_PATH, env } from "./src/config/env";

// Local overrides (BASE_URL and friends) live in an untracked .env file. CI sets real env vars.
if (existsSync(".env")) process.loadEnvFile(".env");

const isCI = !!process.env.CI;

const authSpec = /ui\/auth\.spec\.ts/;
const apiAuthSpec = /api\/auth\.spec\.ts/;

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
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    { name: "setup", testMatch: /setup\/.*\.setup\.ts/ },
    { name: "api", testMatch: /api\/.*\.spec\.ts/, testIgnore: apiAuthSpec, dependencies: ["setup"] },
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
