import type { Browser } from "@playwright/test";
import type { ApplicationsEndpoint } from "@/api/endpoints/applications.endpoint";
import { expectJson } from "@/api/assertions";
import { applicationResponse } from "@/api/schemas";
import { AUTH_STATE_PATH, env } from "@/config/env";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";
import { ApplicationsPage } from "@/pages/applications.page";

// The applied and follow-up dates are calendar days. A day picked in one time zone is the same day
// for the same account in any other, and the API holds it as that day. The two zones are the
// furthest apart there are: 25 hours.
const AHEAD = "Pacific/Kiritimati"; // UTC+14
const BEHIND = "Pacific/Pago_Pago"; // UTC-11

const APPLIED = "2026-03-15";
const FOLLOW_UP = "2026-04-15";

/** How the details panel writes a day, such as "Mar 15, 2026". */
const shown = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/** The signed-in board in a browser set to a time zone, with an application's details open. */
async function openIn(browser: Browser, timezoneId: string, id: string) {
  const context = await browser.newContext({ baseURL: env.baseURL, storageState: AUTH_STATE_PATH, timezoneId });
  const applicationsPage = new ApplicationsPage(await context.newPage());
  await applicationsPage.gotoApplication(id);
  await expect(applicationsPage.details.title).toBeVisible();
  return { context, details: applicationsPage.details };
}

type Details = Awaited<ReturnType<typeof openIn>>["details"];

async function pickDates(details: Details) {
  await details.editDetailsButton.click();
  await details.editDetails.field("Applied date").fill(APPLIED);
  await details.editDetails.saveButton.click();
  await expect(details.editDetails.root).toBeHidden();

  await details.followUpButton.click();
  await details.followUp.field("Follow-up date").fill(FOLLOW_UP);
  await details.followUp.saveButton.click();
  await expect(details.followUp.root).toBeHidden();
}

async function expectDates(details: Details) {
  await expect(details.fact("Applied")).toContainText(shown(APPLIED));
  await expect(details.fact("Follow-up")).toContainText(shown(FOLLOW_UP));
  await details.editDetailsButton.click();
  await expect(details.editDetails.field("Applied date")).toHaveValue(APPLIED);
  await details.editDetails.cancelButton.click();
}

async function expectStoredDays(applicationsEndpoint: ApplicationsEndpoint, id: string) {
  const { data } = await expectJson(await applicationsEndpoint.get(id), 200, applicationResponse);
  expect(data.appliedAt?.slice(0, 10), "applied day in the API").toBe(APPLIED);
  expect(data.followUpAt?.slice(0, 10), "follow-up day in the API").toBe(FOLLOW_UP);
}

test.describe("dates across time zones", () => {
  for (const zone of [AHEAD, BEHIND]) {
    test(`dates picked in ${zone} show the same days when reopened there`, async ({ browser, applicationsApi }) => {
      const application = await applicationsApi.create(buildApplication({ status: "APPLIED" }));

      const first = await openIn(browser, zone, application.id);
      await pickDates(first.details);
      await first.context.close();

      const again = await openIn(browser, zone, application.id);
      await expectDates(again.details);
      await again.context.close();
    });
  }

  for (const [from, to] of [
    [AHEAD, BEHIND],
    [BEHIND, AHEAD],
  ] as const) {
    test(`dates picked in ${from} show the same days in ${to} and in the API`, async ({
      browser,
      applicationsApi,
      applicationsEndpoint,
    }) => {
      const application = await applicationsApi.create(buildApplication({ status: "APPLIED" }));

      const picker = await openIn(browser, from, application.id);
      await pickDates(picker.details);
      await picker.context.close();

      const viewer = await openIn(browser, to, application.id);
      await expectDates(viewer.details);
      await viewer.context.close();

      await expectStoredDays(applicationsEndpoint, application.id);
    });
  }
});
