import { readFile } from "node:fs/promises";
import type { Download } from "@playwright/test";
import { accountExportSchema, accountResponse } from "@/api/schemas";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";
import { parseCsvRecords } from "@/support/csv";

const downloadedText = async (download: Download) => readFile(await download.path(), "utf8");

test.describe("settings", () => {
  test("a new display name is saved and Home greets the user by it", async ({
    settingsPage,
    homePage,
    accountEndpoint,
  }) => {
    const original = accountResponse.parse(await (await accountEndpoint.get()).json()).data.displayName;
    try {
      await settingsPage.goto();
      await settingsPage.displayNameInput.fill("Robin Tester");
      await settingsPage.saveProfileButton.click();
      await expect(settingsPage.profileMessage).toHaveText("Profile saved.");
      await expect(settingsPage.saveProfileButton, "nothing left to save").toBeDisabled();

      await homePage.goto();
      await expect(homePage.heading).toHaveText("Make your next move, Robin.");
    } finally {
      await accountEndpoint.update({ displayName: original });
    }
  });

  test("a display name over 80 characters is refused before sending", async ({ page, settingsPage }) => {
    const patches: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "PATCH" && request.url().includes("/account")) patches.push(request.url());
    });

    await settingsPage.goto();
    await settingsPage.displayNameInput.fill("R".repeat(81));
    await settingsPage.saveProfileButton.click();

    await expect(settingsPage.displayNameInput).toHaveAttribute("aria-invalid", "true");
    await expect(settingsPage.displayNameInput).toHaveAccessibleDescription("Use at most 80 characters");
    expect(patches).toEqual([]);
  });

  test("the password form checks length and confirmation before sending", async ({ page, settingsPage }) => {
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/account/password")) posts.push(request.url());
    });

    await settingsPage.goto();
    await settingsPage.currentPasswordInput.fill("current-password");
    await settingsPage.newPasswordInput.fill("short");
    await settingsPage.confirmPasswordInput.fill("short");
    await settingsPage.updatePasswordButton.click();
    await expect(settingsPage.newPasswordInput).toHaveAccessibleDescription("Use at least 8 characters");

    await settingsPage.newPasswordInput.fill("long-enough-1");
    await settingsPage.confirmPasswordInput.fill("long-enough-2");
    await settingsPage.updatePasswordButton.click();
    await expect(settingsPage.confirmPasswordInput).toHaveAccessibleDescription("Passwords don’t match");

    expect(posts).toEqual([]);
  });

  test("Download JSON saves every application", async ({ page, settingsPage, applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication());

    await settingsPage.goto();
    const downloading = page.waitForEvent("download");
    await settingsPage.downloadJsonLink.click();
    const download = await downloading;

    expect(download.suggestedFilename()).toMatch(/\.json$/);
    const body = accountExportSchema.parse(JSON.parse(await downloadedText(download)));
    expect(body.applications).toContainEqual(expect.objectContaining({ id: created.id, company: created.company }));
  });

  test("Download CSV saves one row per application", async ({ page, settingsPage, applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication());

    await settingsPage.goto();
    const downloading = page.waitForEvent("download");
    await settingsPage.downloadCsvLink.click();
    const download = await downloading;

    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    const rows = parseCsvRecords(await downloadedText(download));
    expect(rows.find((row) => row.id === created.id)).toMatchObject({ company: created.company, title: created.title });
  });
});
