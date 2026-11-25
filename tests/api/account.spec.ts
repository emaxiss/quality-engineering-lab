import { expectApiError, expectJson } from "@/api/assertions";
import { accountExportSchema, accountResponse } from "@/api/schemas";
import { AccountEndpoint } from "@/api/endpoints/account.endpoint";
import { env } from "@/config/env";
import { parseCsvRecords } from "@/support/csv";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

test.describe("account api", () => {
  test("returns the signed-in account", async ({ accountEndpoint }) => {
    const { data } = await expectJson(await accountEndpoint.get(), 200, accountResponse);

    expect(data).toMatchObject({
      id: expect.any(String),
      email: env.userEmail,
      createdAt: expect.any(String),
      applicationCount: expect.any(Number),
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
    expect(body.applications).toContainEqual(expect.objectContaining({ id: created.id, company: created.company }));
  });

  test("CSV export keeps commas, quotes, line breaks and non-ASCII text intact", async ({
    accountEndpoint,
    applicationsApi,
  }) => {
    const created = await applicationsApi.create({
      ...buildApplication({ company: `Acme, "Global" ${Date.now()}` }),
      title: "Ingénieure QA 🚀",
      location: "Zürich, Schweiz",
      description: 'First line, with a comma\nSecond line with "quotes"\r\nThird line: 東京',
      tags: ["remote, EU", 'says "hi"', "ñandú"],
    });

    const response = await accountEndpoint.export("csv");
    expect(response.status()).toBe(200);
    const row = parseCsvRecords(await response.text()).find((record) => record.id === created.id);

    expect(row, "exported row").toBeDefined();
    expect(row).toMatchObject({
      company: created.company,
      title: created.title,
      location: created.location,
      description: created.description,
    });
    // Tags share one column, separated by "; ".
    expect(row?.tags).toBe(created.tags.join("; "));
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
