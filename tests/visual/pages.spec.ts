import { devices, type Page } from "@playwright/test";
import { expect, test } from "@/fixtures/test";
import { account, applications } from "@/visual/data";
import { waitForAnimations } from "@/support/animations";
import { stubApi } from "@/visual/stub-api";

// The account chip shows the signed-in account's email, which the server renders, so the API stub
// cannot replace it. It is swapped for the fictional account's email before every screenshot, so a
// real account never reaches a committed image.
async function expectScreenshot(page: Page, name: string) {
  await page.getByRole("link", { name: "Account settings" }).evaluateAll((links, fictional) => {
    for (const link of links) {
      link.removeAttribute("title");
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.textContent?.includes("@")) node.textContent = fictional;
      }
    }
  }, account.email);
  await waitForAnimations(page);
  await expect(page).toHaveScreenshot(name, { fullPage: true });
}

const northwind = applications.find((a) => a.company === "Northwind Labs")!;

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("landing", async ({ landingPage, page }) => {
    await landingPage.goto();
    await expectScreenshot(page, "landing.png");
  });

  test("login", async ({ loginPage, page }) => {
    await loginPage.goto();
    await expectScreenshot(page, "login.png");
  });

  test("privacy", async ({ privacyPage, page }) => {
    await privacyPage.goto();
    await expectScreenshot(page, "privacy.png");
  });
});

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => stubApi(page));

  test("home", async ({ homePage, page }) => {
    await homePage.goto();
    await expect(homePage.heading).toHaveText("Make your next move, Sam.");
    await expect(page.getByText("Applications sent")).toBeVisible();
    await expectScreenshot(page, "home.png");
  });

  test("applications board", async ({ applicationsPage, page }) => {
    await applicationsPage.goto();
    await expect(applicationsPage.cards).toHaveCount(7);
    await expectScreenshot(page, "board.png");
  });

  test("applications list", async ({ applicationsPage, page }) => {
    await page.goto("/applications?view=list");
    await expect(applicationsPage.table.getByRole("row")).toHaveCount(applications.length + 1);
    await expectScreenshot(page, "list.png");
  });

  test("application details", async ({ applicationsPage, page }) => {
    await applicationsPage.gotoApplication(northwind.id);
    await expect(applicationsPage.details.title).toHaveText(northwind.title);
    await expect(applicationsPage.cards).toHaveCount(7);
    await expectScreenshot(page, "details.png");
  });

  test("add application", async ({ applicationsPage, page }) => {
    await applicationsPage.goto();
    await expect(applicationsPage.cards).toHaveCount(7);
    const dialog = await applicationsPage.openAddDialog();
    await expect(dialog.companyInput).toBeFocused();
    await expectScreenshot(page, "add.png");
  });

  test("settings", async ({ settingsPage, page }) => {
    await settingsPage.goto();
    await expect(settingsPage.displayNameInput).toHaveValue("Sam Rivera");
    await expectScreenshot(page, "settings.png");
  });
});

// Phone size and touch, still on the desktop engine: switching browser needs its own worker.
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"];

test.describe("phone", () => {
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test.beforeEach(async ({ page }) => stubApi(page));

  test("home", async ({ homePage, page }) => {
    await homePage.goto();
    await expect(page.getByText("Applications sent")).toBeVisible();
    await expectScreenshot(page, "phone-home.png");
  });

  test("applications board", async ({ applicationsPage, page }) => {
    await applicationsPage.goto();
    await expect(applicationsPage.cards).toHaveCount(7);
    await expectScreenshot(page, "phone-board.png");
  });

  test("application details", async ({ applicationsPage, page }) => {
    await applicationsPage.gotoApplication(northwind.id);
    await expect(applicationsPage.details.title).toHaveText(northwind.title);
    await expectScreenshot(page, "phone-details.png");
  });
});
