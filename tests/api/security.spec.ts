import type { APIResponse } from "@playwright/test";
import { expectApiError, expectJson } from "@/api/assertions";
import type { ApplicationsApi } from "@/api/applications.api";
import { applicationResponse } from "@/api/schemas";
import { ApplicationsEndpoint } from "@/api/endpoints/applications.endpoint";
import { env } from "@/config/env";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";
import { parseCsvRecords } from "@/support/csv";

// Fields the server owns. A client that sets them must be refused, never silently obeyed.
const SERVER_OWNED = {
  userId: "00000000-0000-4000-8000-000000000000",
  id: "00000000-0000-4000-8000-000000000001",
  createdAt: "2000-01-01T00:00:00.000Z",
  updatedAt: "2000-01-01T00:00:00.000Z",
};

/** Deletes a record the API should have refused, if it was created anyway. */
async function trackIfCreated(response: APIResponse, applicationsApi: ApplicationsApi): Promise<void> {
  if (response.status() !== 201) return;
  applicationsApi.track(((await response.json()) as { data: { id: string } }).data.id);
}

test.describe("security, applications api", () => {
  test("refuses server-owned fields on create and update (mass assignment)", async ({
    applicationsEndpoint,
    applicationsApi,
  }) => {
    const existing = await applicationsApi.create(buildApplication());

    for (const [field, value] of Object.entries(SERVER_OWNED)) {
      const create = await expectApiError(
        await applicationsEndpoint.create({ ...buildApplication(), [field]: value }),
        400,
        "VALIDATION_ERROR",
      );
      expect(JSON.stringify(create.details), `create with ${field}`).toContain(`Unrecognized key: \\"${field}\\"`);

      await expectApiError(await applicationsEndpoint.update(existing.id, { [field]: value }), 400, "VALIDATION_ERROR");
    }

    const unchanged = await expectJson(await applicationsEndpoint.get(existing.id), 200, applicationResponse);
    expect(unchanged.data).toEqual(existing);
  });

  test("refuses a prototype pollution payload", async ({ userRequest }) => {
    const response = await userRequest.post(env.applicationsApiPath, {
      headers: { "content-type": "application/json" },
      data: Buffer.from(`{"company":"Proto Co","title":"QA","__proto__":{"isAdmin":true}}`),
    });
    await expectApiError(response, 400, "VALIDATION_ERROR");
  });

  test("answers malformed bodies with a JSON error, not a crash", async ({ userRequest, applicationsEndpoint }) => {
    const json = { "content-type": "application/json" };
    await expectApiError(
      await userRequest.post(env.applicationsApiPath, { headers: json, data: Buffer.from("{company:") }),
      400,
      "BAD_REQUEST",
    );
    await expectApiError(
      await userRequest.post(env.applicationsApiPath, { headers: json, data: Buffer.from("[]") }),
      400,
      "VALIDATION_ERROR",
    );

    const oversized = await expectApiError(
      await applicationsEndpoint.create({ ...buildApplication(), description: "a".repeat(10_001) }),
      400,
      "VALIDATION_ERROR",
    );
    expect(oversized.details).toContainEqual(expect.objectContaining({ path: "description" }));
  });

  test("rejects forged and malformed bearer tokens", async ({ playwright, baseURL }) => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const claims = encode({
      sub: SERVER_OWNED.userId,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const authorizations = {
      "unsigned (alg none)": `Bearer ${encode({ alg: "none", typ: "JWT" })}.${claims}.`,
      "made-up signature": `Bearer ${encode({ alg: "HS256", typ: "JWT" })}.${claims}.${"A".repeat(43)}`,
      "not a JWT": "Bearer not.a.jwt",
      "empty bearer": "Bearer ",
      "wrong scheme": "Basic dXNlcjpwYXNz",
    };

    for (const [label, authorization] of Object.entries(authorizations)) {
      const context = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { authorization } });
      try {
        await test.step(label, async () => {
          // 401 from the API, or 403 from the hosting firewall, which drops some forged tokens before they reach it.
          expect([401, 403]).toContain((await new ApplicationsEndpoint(context).list()).status());
        });
      } finally {
        await context.dispose();
      }
    }
  });

  test("CSV export neutralizes spreadsheet formulas (CSV injection)", async ({ accountEndpoint, applicationsApi }) => {
    const created = await applicationsApi.create({
      ...buildApplication(),
      company: `=HYPERLINK("https://example.com","Formula Co ${Date.now()}")`,
      title: "+SUM(1,2)",
      location: "-2+3",
      tags: ["@cmd"],
    });

    const response = await accountEndpoint.export("csv");
    expect(response.status()).toBe(200);
    const row = parseCsvRecords(await response.text()).find((record) => record.id === created.id);

    expect(row, "exported row").toBeDefined();
    // A leading apostrophe makes Excel, Sheets and Numbers show the text instead of running it.
    expect(row?.company).toBe(`'${created.company}`);
    expect(row?.title).toBe("'+SUM(1,2)");
    expect(row?.location).toBe("'-2+3");
    expect(row?.tags).toBe("'@cmd");
  });

  test("cookie-signed writes from another site are refused (CSRF defense in depth)", async ({
    userRequest,
    applicationsApi,
  }) => {
    test.fail(true, "Known issue: the API accepts cookie-signed writes whatever the Origin header says");

    const response = await userRequest.post(env.applicationsApiPath, {
      headers: { origin: "https://attacker.example", "content-type": "text/plain" },
      data: JSON.stringify(buildApplication()),
    });
    await trackIfCreated(response, applicationsApi);

    expect(response.status()).toBe(403);
  });
});

test.describe("security headers", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of ["/", "/api/v1/health"]) {
    test(`${path} sends the browser protections`, async ({ request }) => {
      const headers = (await request.get(path)).headers();

      expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(headers["content-security-policy"]).toContain("object-src 'none'");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    });
  }

  test("HTTPS responses tell browsers to stay on HTTPS (HSTS)", async ({ request, baseURL }) => {
    test.skip(!baseURL?.startsWith("https:"), "HSTS is only sent over HTTPS");
    expect((await request.get("/")).headers()["strict-transport-security"]).toMatch(/max-age=\d{7,}/);
  });
});
