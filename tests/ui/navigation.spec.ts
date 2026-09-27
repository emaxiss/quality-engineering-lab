import { expect, test } from "@/fixtures/test";

test.describe("navigation", { tag: "@smoke" }, () => {
  test("signed-in user lands on the dashboard", async ({ dashboardPage }) => {
    await dashboardPage.goto();

    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.focusSection).toBeVisible();
  });

  test("primary navigation reaches every section", async ({
    dashboardPage,
    applicationsPage,
    settingsPage,
    appShell,
  }) => {
    await dashboardPage.goto();

    await appShell.goTo("Applications");
    await applicationsPage.expectLoaded();

    await appShell.goTo("Settings");
    await settingsPage.expectLoaded();

    await appShell.goTo("Home");
    await dashboardPage.expectLoaded();
  });
});
