import { expect, test } from "@/fixtures/test";

test.describe("health", { tag: "@smoke" }, () => {
  test("service and database report ok", async ({ request }) => {
    const response = await request.get("/api/v1/health");

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { status: "ok", database: "ok" },
    });
  });
});
