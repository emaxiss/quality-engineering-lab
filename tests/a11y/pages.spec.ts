import { expectAccessible } from "@/a11y/axe";
import { buildApplication } from "@/data/application.factory";
import { test } from "@/fixtures/test";

test.describe("accessibility, signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("landing page", async ({ page, landingPage }, testInfo) => {
    await landingPage.goto();
    await expectAccessible(page, testInfo);
  });

  test("login page", async ({ page, loginPage }, testInfo) => {
    await loginPage.goto();
    await expectAccessible(page, testInfo);
  });

  test("privacy page", async ({ page, privacyPage }, testInfo) => {
    await privacyPage.goto();
    await expectAccessible(page, testInfo);
  });
});

test.describe("accessibility, signed in", () => {
  test("home", async ({ page, homePage }, testInfo) => {
    await homePage.goto();
    await expectAccessible(page, testInfo);
  });

  test("applications board and list", async ({ page, applicationsPage, applicationsApi }, testInfo) => {
    // High priority, so the scans cover the priority badge on a card and in a list row.
    const application = await applicationsApi.create(buildApplication({ priority: "HIGH" }));
    await applicationsPage.goto();
    await applicationsPage.card(application.company).waitFor();
    await expectAccessible(page, testInfo);

    await applicationsPage.switchTo("List");
    await applicationsPage.table.waitFor();
    await expectAccessible(page, testInfo);
  });

  test("add application dialog", async ({ page, applicationsPage }, testInfo) => {
    await applicationsPage.goto();
    const dialog = await applicationsPage.openAddDialog();
    await dialog.root.waitFor();
    await expectAccessible(page, testInfo, { include: 'dialog, [role="dialog"]' });
  });

  test("settings", async ({ page, settingsPage }, testInfo) => {
    await settingsPage.goto();
    await expectAccessible(page, testInfo);
  });
});
