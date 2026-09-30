import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";
import { hasFocusWithin, tabTo } from "@/support/keyboard";

// Every flow here uses the keyboard only: Tab, Enter, Space, Escape and typing. No clicks.
test.describe("keyboard only", () => {
  test("user can add an application", async ({ page, applicationsPage, applicationsApi }) => {
    const application = buildApplication({ company: `Keyboard Co ${Date.now()}` });
    await applicationsPage.goto();

    const dialog = await applicationsPage.openAddDialogWithKeyboard();
    expect(await hasFocusWithin(dialog.root), "focus moves into the dialog").toBe(true);

    await tabTo(page, dialog.companyInput);
    await page.keyboard.type(application.company);
    await tabTo(page, dialog.titleInput);
    await page.keyboard.type(application.title);
    await page.keyboard.press("Enter");

    await expect(applicationsPage.details.title).toHaveText(application.title);
    applicationsApi.track(applicationsPage.openApplicationId());
    expect(await hasFocusWithin(applicationsPage.details.root), "focus moves into the details panel").toBe(true);

    await page.keyboard.press("Escape");
    await expect(applicationsPage.details.root).toBeHidden();
    await expect(applicationsPage.stage("Saved")).toContainText(application.company);
  });

  test("Escape closes the Add dialog and returns focus to the Add button", async ({ page, applicationsPage }) => {
    await applicationsPage.goto();
    const dialog = await applicationsPage.openAddDialogWithKeyboard();

    await page.keyboard.press("Escape");

    await expect(dialog.root).toBeHidden();
    await expect(applicationsPage.addButton).toBeFocused();
  });

  test("a card opens with Enter and with Space, and Escape returns focus to it", async ({
    page,
    applicationsPage,
    applicationsApi,
  }) => {
    const application = buildApplication();
    await applicationsApi.create(application);
    await applicationsPage.goto();
    const card = applicationsPage.card(application.company);

    for (const key of ["Enter", "Space"]) {
      await card.focus();
      await page.keyboard.press(key);
      await expect(applicationsPage.details.title, `${key} opens the details`).toHaveText(application.title);

      await page.keyboard.press("Escape");
      await expect(applicationsPage.details.root).toBeHidden();
      await expect(card, `focus returns to the card after ${key}`).toBeFocused();
    }
  });

  test("user can move an application to another stage", async ({ page, applicationsPage, applicationsApi }) => {
    const application = buildApplication();
    await applicationsApi.create(application);
    await applicationsPage.goto();
    const { details } = applicationsPage;

    await applicationsPage.card(application.company).focus();
    await page.keyboard.press("Enter");
    await expect(details.title).toHaveText(application.title);

    await tabTo(page, details.updateStageButton);
    await page.keyboard.press("Enter");
    await expect(details.updateStage.root).toBeVisible();

    // Type-ahead picks an option on a native select on every platform; arrow keys differ.
    await tabTo(page, details.updateStage.stageSelect);
    await page.keyboard.type("Applied");
    await expect(details.updateStage.stageSelect).toHaveValue("APPLIED");
    await tabTo(page, details.updateStage.saveButton);
    await page.keyboard.press("Enter");

    await expect(details.updateStage.root).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(details.root).toBeHidden();
    await expect(applicationsPage.stage("Applied")).toContainText(application.company);
  });

  test("list columns sort with the keyboard and announce the order", async ({
    page,
    applicationsPage,
    applicationsApi,
  }) => {
    await applicationsApi.create(buildApplication());
    await applicationsPage.goto();
    await applicationsPage.viewButton("List").focus();
    await page.keyboard.press("Enter");
    await expect(applicationsPage.table).toBeVisible();
    const company = applicationsPage.columnHeader("Company");

    await applicationsPage.sortButton("Company").focus();
    await page.keyboard.press("Enter");
    await expect(company).toHaveAttribute("aria-sort", "ascending");

    await page.keyboard.press("Enter");
    await expect(company).toHaveAttribute("aria-sort", "descending");
  });
});
