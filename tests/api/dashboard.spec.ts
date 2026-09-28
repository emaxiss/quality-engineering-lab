import { expectApiError, expectJson } from "@/api/assertions";
import { DashboardEndpoint } from "@/api/endpoints/dashboard.endpoint";
import { dashboardSummaryResponse } from "@/api/schemas";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

test.describe("dashboard api", () => {
  test("summary counts an application in its stage, source and due follow-ups", async ({
    dashboardEndpoint,
    applicationsApi,
  }) => {
    // Other tests share this account and run in parallel, so the counts are lower bounds.
    await applicationsApi.create(
      buildApplication({ status: "APPLIED", source: "referral", followUpAt: "2025-01-01T00:00:00.000Z" }),
    );

    const { data } = await expectJson(await dashboardEndpoint.summary(), 200, dashboardSummaryResponse);

    expect(data.byStatus.APPLIED).toBeGreaterThanOrEqual(1);
    expect(data.applicationsSent).toBeGreaterThanOrEqual(1);
    expect(data.followUpsDue.count).toBeGreaterThanOrEqual(1);
    expect(data.followUpsDue.first).not.toBeNull();
    expect(data.sources).toContainEqual(expect.objectContaining({ source: "referral" }));
    expect(data.recent.length).toBeGreaterThanOrEqual(1);
  });

  test("rejects requests without a session", async ({ request }) => {
    await expectApiError(await new DashboardEndpoint(request).summary(), 401, "UNAUTHORIZED");
  });
});
