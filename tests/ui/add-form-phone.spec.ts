import { applicationListResponse } from "@/api/schemas";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

// A 390 x 844 touch screen, the size of a current iPhone.
const PHONE = { width: 390, height: 844 };

test.describe("Add form on a phone", () => {
  test.use({ viewport: PHONE, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  test("fits the screen, every field is tappable, and it saves", async ({
    page,
    applicationsPage,
    applicationsEndpoint,
    applicationsApi,
  }) => {
    const application = buildApplication();
    await applicationsPage.goto();
    await applicationsPage.addButton.tap();
    const dialog = applicationsPage.addDialog;
    await expect(dialog.root).toBeVisible();

    await test.step("nothing scrolls sideways", async () => {
      const widths = await dialog.root.evaluate((root) => ({
        page: document.documentElement.scrollWidth,
        screen: window.innerWidth,
        dialogContent: root.scrollWidth,
        dialog: root.clientWidth,
      }));
      expect(widths.page, "page width").toBeLessThanOrEqual(widths.screen);
      expect(widths.dialogContent, "dialog content width").toBeLessThanOrEqual(widths.dialog);
    });

    await test.step("every control is on screen and at least 24 x 24 (WCAG 2.5.8)", async () => {
      const controls = dialog.root.locator("input, select, textarea, button");
      expect(await controls.count()).toBeGreaterThan(10);
      for (const control of await controls.all()) {
        await control.scrollIntoViewIfNeeded();
        const box = await control.boundingBox();
        const name = (await control.getAttribute("name")) ?? (await control.textContent()) ?? "control";
        expect(box, name).not.toBeNull();
        expect(box!.x, name).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, name).toBeLessThanOrEqual(PHONE.width);
        expect(box!.width, name).toBeGreaterThanOrEqual(24);
        expect(box!.height, name).toBeGreaterThanOrEqual(24);
      }
    });

    try {
      await dialog.companyInput.tap();
      await dialog.companyInput.fill(application.company);
      await dialog.titleInput.tap();
      await dialog.titleInput.fill(application.title);
      await dialog.submitButton.tap();

      await expect(applicationsPage.details.title).toHaveText(application.title);
    } finally {
      const response = await applicationsEndpoint.list({ q: application.company });
      for (const { id } of applicationListResponse.parse(await response.json()).data) applicationsApi.track(id);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width);
  });

  // Safari on iPhone zooms the page in when a field with text under 16px gets focus, and the user
  // has to zoom back out by hand. The app's viewport tag does not prevent it.
  test("field text is at least 16px, so Safari does not zoom in on focus", async ({ applicationsPage }) => {
    test.fail(true, "Known defect: Add form fields use 15px text");
    await applicationsPage.goto();
    await applicationsPage.addButton.tap();
    const fields = applicationsPage.addDialog.root.locator("input, select, textarea");
    await expect(fields.first()).toBeVisible();

    const small = await fields.evaluateAll((elements) =>
      elements
        .map((element) => ({
          name: element.getAttribute("name"),
          size: parseFloat(getComputedStyle(element).fontSize),
        }))
        .filter(({ size }) => size < 16),
    );
    expect(small, "fields under 16px").toEqual([]);
  });
});
