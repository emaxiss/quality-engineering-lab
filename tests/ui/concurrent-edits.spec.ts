import { applicationResponse } from "@/api/schemas";
import { buildApplication } from "@/data/application.factory";
import { ApplicationsPage } from "@/pages/applications.page";
import { expect, test } from "@/fixtures/test";

test.describe("concurrent edits", () => {
  test("saving an edit form opened earlier keeps a change made since in another tab", async ({
    page,
    applicationsEndpoint,
    applicationsApi,
  }) => {
    test.fail(true, "Known defect: the edit form sends every field, so an older copy reverts newer changes");
    const { id } = await applicationsApi.create(buildApplication({ location: "Porto" }));
    const laterTab = new ApplicationsPage(page);
    const earlierTab = new ApplicationsPage(await page.context().newPage());

    await test.step("the earlier tab opens the edit form", async () => {
      await earlierTab.gotoApplication(id);
      await earlierTab.details.editDetailsButton.click();
      await expect(earlierTab.details.editDetails.field("Location")).toHaveValue("Porto");
    });

    await test.step("another tab changes the location", async () => {
      await laterTab.gotoApplication(id);
      await laterTab.details.editDetailsButton.click();
      await laterTab.details.editDetails.field("Location").fill("Lisbon");
      await laterTab.details.editDetails.saveButton.click();
      await expect(laterTab.details.message).toHaveText("Saved.");
    });

    await test.step("the earlier tab saves a new title", async () => {
      const saved = earlierTab.page.waitForResponse((response) => response.request().method() === "PATCH");
      await earlierTab.details.editDetails.field("Position title").fill("Staff QA Engineer");
      await earlierTab.details.editDetails.saveButton.click();
      await saved;
    });

    // Either outcome keeps the other tab's work: the title saves on its own, or the save is refused
    // because the application changed. Silently writing the old location back is a lost update.
    const { data } = applicationResponse.parse(await (await applicationsEndpoint.get(id)).json());
    expect(data.location, "location saved in the other tab").toBe("Lisbon");
  });
});
