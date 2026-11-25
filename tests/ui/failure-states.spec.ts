import type { Route } from "@playwright/test";
import { env } from "@/config/env";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

interface Failure {
  name: string;
  fail: (route: Route) => Promise<void>;
  message: string | RegExp;
}

const isApplicationsApi = (url: URL) => url.pathname === env.applicationsApiPath;

const failures: Failure[] = [
  {
    name: "the server answers with an error",
    fail: (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side." } }),
      }),
    message: "Something went wrong on our side.",
  },
  {
    name: "a proxy answers with a page instead of JSON",
    fail: (route) => route.fulfill({ status: 502, contentType: "text/html", body: "<html>Bad gateway</html>" }),
    message: "Request failed (502)",
  },
  {
    name: "the network drops the request",
    fail: (route) => route.abort("failed"),
    message: /Could not reach the server/,
  },
];

test.describe("failure states", () => {
  for (const { name, fail, message } of failures) {
    test(`a failed save keeps the draft when ${name}`, async ({ page, applicationsPage, applicationsApi }) => {
      const application = buildApplication();
      let attempts = 0;
      await page.route(isApplicationsApi, (route) => {
        if (route.request().method() !== "POST") return route.continue();
        attempts++;
        return fail(route);
      });

      await applicationsPage.goto();
      const dialog = await applicationsPage.openAddDialog();
      await dialog.fill(application);
      await dialog.submit();

      await expect(dialog.root.getByRole("alert")).toHaveText(message);
      await expect(dialog.companyInput).toHaveValue(application.company);
      await expect(dialog.titleInput).toHaveValue(application.title);
      expect(attempts).toBe(1);

      // Once the connection is back, the same draft saves with one more click.
      await page.unroute(isApplicationsApi);
      await dialog.submit();
      await expect(applicationsPage.details.title).toHaveText(application.title);
      applicationsApi.track(applicationsPage.openApplicationId());
    });
  }

  test("a board that fails to load says so and recovers on Retry", async ({
    page,
    applicationsPage,
    applicationsApi,
  }) => {
    const application = buildApplication();
    await applicationsApi.create(application);
    await page.route(isApplicationsApi, (route) =>
      route.request().method() === "GET" ? route.abort("failed") : route.continue(),
    );

    await applicationsPage.goto();
    const saved = applicationsPage.stage("Saved");
    await expect(saved.getByRole("alert")).toContainText(/Couldn.t load this stage/);
    await expect(applicationsPage.cards, "no card pretends the board is empty or full").toHaveCount(0);

    await page.unroute(isApplicationsApi);
    await saved.getByRole("button", { name: "Retry" }).click();
    await expect(applicationsPage.card(application.company)).toBeVisible();
    await expect(saved.getByRole("alert")).toBeHidden();
  });
});
