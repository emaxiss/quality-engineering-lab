import { expectApiError, expectJson } from "@/api/assertions";
import { accountExportSchema, accountResponse } from "@/api/schemas";
import { AccountEndpoint } from "@/api/endpoints/account.endpoint";
import { env } from "@/config/env";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

test.describe("account api", () => {
  test("returns the signed-in account", async ({ accountEndpoint }) => {
    const { data } = await expectJson(await accountEndpoint.get(), 200, accountResponse);

    expect(data).toMatchObject({
      id: expect.any(String),
      email: env.userEmail,
      createdAt: expect.any(String),
      opportunityCount: expect.any(Number),
      isDemo: false,
    });
  });

  test("rejects requests without a session", async ({ request }) => {
    await expectApiError(await new AccountEndpoint(request).get(), 401, "UNAUTHORIZED");
  });

  test("exports applications as JSON", async ({ accountEndpoint, applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication());

    const body = await expectJson(await accountEndpoint.export("json"), 200, accountExportSchema);

    expect(body.account.email).toBe(env.userEmail);
    expect(Date.parse(body.exportedAt)).not.toBeNaN();
    expect(body.opportunities).toContainEqual(expect.objectContaining({ id: created.id, company: created.company }));
  });

  test("exports applications as CSV", async ({ accountEndpoint, applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication());

    const response = await accountEndpoint.export("csv");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toMatch(/^attachment; filename=".+\.csv"$/);
    const [header, ...rows] = (await response.text()).trim().split("\n");
    expect(header?.split(",")).toEqual(expect.arrayContaining(["id", "company", "title", "status", "priority"]));
    expect(rows.find((row) => row.startsWith(created.id))).toContain(created.company);
  });
});
