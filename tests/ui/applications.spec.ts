import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

test.describe("applications", { tag: "@smoke" }, () => {
  test("board and list views both render", async ({ applicationsPage }) => {
    await applicationsPage.goto();
    await expect(applicationsPage.board).toBeVisible();

    await applicationsPage.switchTo("List");
    await expect(applicationsPage.table).toBeVisible();
    await expect(applicationsPage.viewButton("List")).toHaveAttribute("aria-pressed", "true");

    await applicationsPage.switchTo("Board");
    await expect(applicationsPage.board).toBeVisible();
  });

  test("user can add an application", async ({ applicationsPage, applicationsApi }) => {
    const application = buildApplication();

    await applicationsPage.goto();
    const dialog = await applicationsPage.openAddDialog();
    await dialog.fill(application);
    await dialog.submit();

    await expect(applicationsPage.details.title).toHaveText(application.title);
    applicationsApi.track(applicationsPage.openApplicationId());

    await applicationsPage.details.close();
    await expect(applicationsPage.card(application.company)).toBeVisible();
    await expect(applicationsPage.stage("Saved")).toContainText(application.company);
  });

  test("user can open an application's details", async ({ applicationsPage, applicationsApi }) => {
    const application = buildApplication();
    await applicationsApi.create(application);

    await applicationsPage.goto();
    await applicationsPage.card(application.company).click();

    await expect(applicationsPage.details.title).toHaveText(application.title);
    await expect(applicationsPage.details.header).toContainText(application.company);
  });
});
