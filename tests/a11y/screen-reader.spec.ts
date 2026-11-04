import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { headingOutline, skippedLevels } from "@/a11y/outline";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

// What a screen reader user navigates by: one main landmark, one top-level heading, and a heading
// outline without gaps. axe runs only WCAG rules here, and these are best practices it leaves out.
async function expectStructure(page: Page): Promise<void> {
  await expect(page.getByRole("main")).toHaveCount(1);
  const outline = await headingOutline(page);
  expect(outline[0]?.level, "the first heading in main is the page's level 1 heading").toBe(1);
  expect(
    outline.filter((h) => h.level === 1),
    "one level 1 heading",
  ).toHaveLength(1);
  expect(skippedLevels(outline), "no heading skips a level").toEqual([]);
}

/** Resolves once the app has prefetched the page at `path` for a client-side visit. */
function prefetchOf(page: Page, path: string): Promise<unknown> {
  return page.waitForResponse((response) => {
    const headers = response.request().headers();
    return (
      new URL(response.url()).pathname === path &&
      headers["next-router-prefetch"] === "1" &&
      headers["next-router-segment-prefetch"] === undefined
    );
  });
}

test.describe("screen reader structure, signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("landing page", async ({ page, landingPage }) => {
    await landingPage.goto();
    await landingPage.expectLoaded();
    await expectStructure(page);
  });

  test("login page", async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.expectLoaded();
    await expectStructure(page);
  });

  test("privacy page", async ({ page, privacyPage }) => {
    await privacyPage.goto();
    await privacyPage.expectLoaded();
    await expectStructure(page);
  });
});

test.describe("screen reader structure, signed in", () => {
  test("home", async ({ page, homePage }) => {
    await homePage.goto();
    await homePage.expectLoaded();
    await expectStructure(page);
  });

  test("applications board", async ({ page, applicationsPage, applicationsApi }) => {
    const application = await applicationsApi.create(buildApplication());
    await applicationsPage.goto();
    await expect(applicationsPage.card(application.company)).toBeVisible();
    await expectStructure(page);
  });

  test("settings", async ({ page, settingsPage }) => {
    await settingsPage.goto();
    await settingsPage.expectLoaded();
    await expectStructure(page);
  });
});

test.describe("screen reader announcements", () => {
  test("moving between pages announces the new page title", async ({ page, homePage, appShell }) => {
    // The title streams in after the page content. A click before the link is prefetched
    // announced nothing in 3 of 5 runs, so this waits for both prefetches and checks the announcer.
    const prefetched = Promise.all(["/applications", "/settings"].map((path) => prefetchOf(page, path)));
    await homePage.goto();
    await homePage.expectLoaded();
    await prefetched;

    await appShell.goTo("Applications");
    await expect(page.getByRole("alert")).toHaveText("Applications · RoleQueue");

    await appShell.goTo("Settings");
    await expect(page.getByRole("alert")).toHaveText("Settings · RoleQueue");
  });

  test("a search announces how many applications match", async ({ applicationsPage, applicationsApi }) => {
    const marker = randomUUID().slice(0, 8);
    await applicationsApi.create(buildApplication({ company: `Announce Co ${marker}` }));
    await applicationsApi.create(buildApplication({ company: `Announce Co ${marker} Two` }));
    await applicationsPage.goto();

    await applicationsPage.searchInput.fill(marker);
    await expect(applicationsPage.resultCount).toHaveText("2 applications");
    await expect(applicationsPage.resultCount).toHaveAttribute("aria-live", "polite");

    await applicationsPage.searchInput.fill(`${marker} Two`);
    await expect(applicationsPage.resultCount).toHaveText("1 application");
  });
});
