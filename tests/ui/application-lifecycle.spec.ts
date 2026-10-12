import { randomUUID } from "node:crypto";
import { env } from "@/config/env";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

test.describe("application lifecycle", () => {
  test("user can edit an application's details", async ({ applicationsPage, applicationsApi }) => {
    const application = buildApplication({ priority: "LOW" });
    await applicationsApi.create(application);
    const newTitle = "Senior QA Engineer";
    const { details } = applicationsPage;

    await applicationsPage.goto();
    await applicationsPage.card(application.company).click();
    await details.editDetailsButton.click();
    await details.editDetails.field("Position title").fill(newTitle);
    await details.editDetails.field("Location").fill("Lisbon");
    await details.editDetails.field("Priority").selectOption({ label: "High" });
    await details.editDetails.saveButton.click();

    await expect(details.editDetails.root).toBeHidden();
    await expect(details.message).toHaveText("Saved.");
    await expect(details.title).toHaveText(newTitle);
    await expect(details.fact("Location")).toHaveText("Lisbon");
    await expect(details.fact("Priority")).toHaveText("High");

    await details.close();
    await expect(applicationsPage.card(application.company)).toHaveAccessibleName(
      new RegExp(`^Open ${application.company} ${newTitle}`),
    );
  });

  test("user can record that they applied", async ({ applicationsPage, applicationsApi }) => {
    const application = buildApplication();
    await applicationsApi.create(application);
    const { details } = applicationsPage;

    await applicationsPage.goto();
    await applicationsPage.card(application.company).click();
    await expect(details.fact("Applied")).toHaveText("Not submitted");

    await details.markAppliedButton.click();
    await expect(details.markApplied.field("Applied date"), "the date defaults to today").not.toHaveValue("");
    await details.markApplied.saveButton.click();

    await expect(details.markApplied.root).toBeHidden();
    await expect(details.fact("Applied")).not.toHaveText(/Not submitted|Not recorded/);
    await details.close();
    await expect(applicationsPage.stage("Applied")).toContainText(application.company);
  });

  test("an archived application leaves the board and can be reopened from Closed", async ({
    applicationsPage,
    applicationsApi,
  }) => {
    const application = buildApplication();
    await applicationsApi.create(application);
    const { details } = applicationsPage;

    await applicationsPage.goto();
    await applicationsPage.card(application.company).click();
    await details.moreActionsButton.click();
    await details.archiveButton.click();
    await expect(details.message).toHaveText("Archived. It now lives under Closed.");
    await details.close();
    await expect(applicationsPage.card(application.company)).toBeHidden();

    await applicationsPage.closedButton.click();
    await expect(applicationsPage.closedButton).toHaveAttribute("aria-pressed", "true");
    await applicationsPage.row(application.company).click();
    await details.reopenButton.click();
    await details.reopen.saveButton.click();
    await expect(details.reopen.root).toBeHidden();
    await expect(details.fact("Applied")).toHaveText("Not submitted");

    await details.close();
    await expect(applicationsPage.row(application.company), "it is no longer closed").toBeHidden();
    await applicationsPage.switchTo("Board");
    await expect(applicationsPage.stage("Saved")).toContainText(application.company);
  });

  test("user can delete an application after confirming", async ({
    applicationsPage,
    applicationsApi,
    applicationsEndpoint,
  }) => {
    const application = buildApplication();
    const created = await applicationsApi.create(application);
    const { details } = applicationsPage;

    await applicationsPage.goto();
    await applicationsPage.card(application.company).click();
    await details.moreActionsButton.click();
    await details.deleteButton.click();
    await expect(details.confirmDelete.root, "the confirmation names what is deleted").toContainText(
      `${application.title} at ${application.company}`,
    );
    await details.confirmDelete.saveButton.click();

    await expect(details.root).toBeHidden();
    await expect(applicationsPage.card(application.company)).toBeHidden();
    expect((await applicationsEndpoint.get(created.id)).status()).toBe(404);
  });

  test("the Add form names the missing fields and sends nothing", async ({ page, applicationsPage }) => {
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes(env.applicationsApiPath)) posts.push(request.url());
    });

    await applicationsPage.goto();
    const dialog = await applicationsPage.openAddDialog();
    await dialog.submitButton.click();

    await expect(dialog.root.getByRole("alert")).toHaveText("Enter a company and position title.");
    await expect(dialog.companyInput).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.companyInput).toHaveAccessibleDescription("Company is required");
    await expect(dialog.titleInput).toHaveAccessibleDescription("Title is required");
    await expect(dialog.companyInput, "focus moves to the first missing field").toBeFocused();
    expect(posts).toEqual([]);
  });

  test("closing the Add form with unsaved input asks first", async ({
    page,
    applicationsPage,
    applicationsEndpoint,
  }) => {
    const company = `Draft Co ${randomUUID().slice(0, 8)}`;
    const prompts: string[] = [];

    await applicationsPage.goto();
    const dialog = await applicationsPage.openAddDialog();
    await dialog.companyInput.fill(company);

    page.once("dialog", (prompt) => {
      prompts.push(prompt.message());
      void prompt.dismiss();
    });
    await page.keyboard.press("Escape");
    await expect(dialog.root, "dismissing the prompt keeps the form open").toBeVisible();
    await expect(dialog.companyInput).toHaveValue(company);

    page.once("dialog", (prompt) => {
      prompts.push(prompt.message());
      void prompt.accept();
    });
    await dialog.root.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog.root).toBeHidden();

    expect(prompts).toEqual(["Discard your unsaved changes?", "Discard your unsaved application?"]);
    const response = await applicationsEndpoint.list({ q: company });
    expect((await response.json()) as { meta: { total: number } }).toMatchObject({ meta: { total: 0 } });
  });

  // Markup typed into any field must come back as text, never run as page code (stored XSS).
  test("markup in a title and in notes is shown as text, not run", async ({
    page,
    applicationsPage,
    applicationsApi,
  }) => {
    const title = `QA <script>window.__xss = "title"</script>`;
    const notes = `<img src="x" onerror="window.__xss = 'notes'">`;
    const created = await applicationsApi.create(buildApplication({ title }));
    const { details } = applicationsPage;

    await applicationsPage.goto();
    await applicationsPage.card(created.company).click();
    await expect(details.title).toHaveText(title);

    await details.editNotesButton.click();
    await details.notes.field("Notes").fill(notes);
    await details.notes.saveButton.click();
    await expect(details.notes.root).toBeHidden();
    await expect(details.root.getByText(notes, { exact: true })).toBeVisible();

    await applicationsPage.gotoApplication(created.id);
    await expect(details.root.getByText(notes, { exact: true }), "still text after a reload").toBeVisible();
    expect(await page.evaluate(() => (window as { __xss?: string }).__xss)).toBeUndefined();
  });
});
