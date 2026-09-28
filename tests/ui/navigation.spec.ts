import { expect, test } from "@/fixtures/test";

test.describe("navigation", { tag: "@smoke" }, () => {
  test("signed-in user lands on Home", async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.heading).toBeVisible();
    await expect(homePage.focusSection).toBeVisible();
  });

  test("primary navigation reaches every section", async ({ homePage, applicationsPage, settingsPage, appShell }) => {
    await homePage.goto();

    await appShell.goTo("Applications");
    await applicationsPage.expectLoaded();

    await appShell.goTo("Settings");
    await settingsPage.expectLoaded();

    await appShell.goTo("Home");
    await homePage.expectLoaded();
  });
});
