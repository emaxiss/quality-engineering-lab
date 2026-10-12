import { randomUUID } from "node:crypto";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

test.describe("finding applications", () => {
  test("search narrows the board, survives a reload and clears", async ({
    page,
    applicationsPage,
    applicationsApi,
  }) => {
    const marker = randomUUID().slice(0, 8);
    const match = await applicationsApi.create(buildApplication({ company: `Search Co ${marker}` }));
    const other = await applicationsApi.create(buildApplication());

    await applicationsPage.goto();
    await expect(applicationsPage.card(other.company)).toBeVisible();

    await applicationsPage.searchInput.fill(marker);
    await expect(page).toHaveURL(new RegExp(`[?&]q=${marker}`));
    await expect(applicationsPage.cards).toHaveCount(1);
    await expect(applicationsPage.card(match.company)).toBeVisible();

    await page.reload();
    await expect(applicationsPage.searchInput, "the search lives in the URL").toHaveValue(marker);
    await expect(applicationsPage.cards).toHaveCount(1);

    await applicationsPage.clearSearchButton.click();
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(applicationsPage.card(other.company)).toBeVisible();
  });

  test("the priority filter combines with search", async ({ page, applicationsPage, applicationsApi }) => {
    const marker = randomUUID().slice(0, 8);
    const high = await applicationsApi.create(buildApplication({ company: `Filter Co ${marker} A`, priority: "HIGH" }));
    await applicationsApi.create(buildApplication({ company: `Filter Co ${marker} B`, priority: "LOW" }));

    await applicationsPage.goto();
    await applicationsPage.searchInput.fill(marker);
    await expect(applicationsPage.cards).toHaveCount(2);

    await applicationsPage.priorityFilter.selectOption({ label: "High" });
    await expect(page).toHaveURL(/[?&]priority=HIGH/);
    await expect(applicationsPage.cards).toHaveCount(1);
    await expect(applicationsPage.card(high.company)).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(applicationsPage.searchInput).toHaveValue("");
    await expect(applicationsPage.priorityFilter).toHaveValue("");
  });

  test("an application link opens its details over the board", async ({ page, applicationsPage, applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication());
    const { details } = applicationsPage;

    await applicationsPage.gotoApplication(created.id);
    await expect(details.title).toHaveText(created.title);
    await expect(details.header).toContainText(created.company);

    await details.close();
    await expect(page).toHaveURL(/\/applications$/);
    await expect(applicationsPage.card(created.company)).toBeVisible();
  });

  test("a link to a missing application says so and leads back", async ({ page, applicationsPage }) => {
    const { details } = applicationsPage;

    await applicationsPage.gotoApplication(randomUUID());
    await expect(details.root.getByRole("heading", { name: "Application not found" })).toBeVisible();

    await details.backButton.click();
    await expect(details.root).toBeHidden();
    await expect(page).toHaveURL(/\/applications$/);
  });
});
