import { expectJson } from "@/api/assertions";
import { healthResponse } from "@/api/schemas";
import { expect, test } from "@/fixtures/test";

test.describe("health", { tag: "@smoke" }, () => {
  test("service and database report ok", async ({ request }) => {
    const { data } = await expectJson(await request.get("/api/v1/health"), 200, healthResponse);

    expect(data).toMatchObject({ status: "ok", database: "ok" });
  });
});
