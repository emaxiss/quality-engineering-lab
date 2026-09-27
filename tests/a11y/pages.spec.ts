import { expectAccessible } from "@/a11y/axe";
import { ACTIVE_NAV_CONTRAST, DATE_LINE_CONTRAST, PRIORITY_BADGE_CONTRAST } from "@/a11y/known-issues";
import { buildApplication } from "@/data/application.factory";
import { test } from "@/fixtures/test";

test.describe("accessibility, signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("landing page", async ({ page, landingPage }, testInfo) => {
    await landingPage.goto();
    await expectAccessible(page, testInfo, { known: [PRIORITY_BADGE_CONTRAST] });
  });

  test("login page", async ({ page, loginPage }, testInfo) => {
    await loginPage.goto();
    await expectAccessible(page, testInfo);
  });
});

test.describe("accessibility, signed in", () => {
  test("dashboard", async ({ page, dashboardPage }, testInfo) => {
    await dashboardPage.goto();
    await expectAccessible(page, testInfo, { known: [ACTIVE_NAV_CONTRAST, DATE_LINE_CONTRAST] });
  });

  test("applications board and list", async ({ page, applicationsPage, applicationsApi }, testInfo) => {
    const application = await applicationsApi.create(buildApplication());
    await applicationsPage.goto();
    await applicationsPage.card(application.company).waitFor();
    await expectAccessible(page, testInfo, { known: [ACTIVE_NAV_CONTRAST] });

    await applicationsPage.switchTo("List");
    await applicationsPage.table.waitFor();
    await expectAccessible(page, testInfo, { known: [ACTIVE_NAV_CONTRAST] });
  });

  test("add application dialog", async ({ page, applicationsPage }, testInfo) => {
    await applicationsPage.goto();
    const dialog = await applicationsPage.openAddDialog();
    await dialog.root.waitFor();
    await expectAccessible(page, testInfo, { include: 'dialog, [role="dialog"]' });
  });

  test("settings", async ({ page, settingsPage }, testInfo) => {
    await settingsPage.goto();
    await expectAccessible(page, testInfo, { known: [ACTIVE_NAV_CONTRAST] });
  });
});
