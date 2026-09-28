import type { APIRequestContext } from "@playwright/test";
import { ApplicationsApi } from "@/api/applications.api";
import { expectApiError, expectJson } from "@/api/assertions";
import { AccountEndpoint } from "@/api/endpoints/account.endpoint";
import { ApplicationsEndpoint } from "@/api/endpoints/applications.endpoint";
import { accountExportSchema, applicationListResponse, applicationResponse } from "@/api/schemas";
import { signedInContext } from "@/api/sessions";
import type { Application } from "@/api/types";
import { AUTH_STATE_PATH, env } from "@/config/env";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

// One account owns an application; a second, signed-in account tries to reach it by id,
// search, export, update and delete. Every attempt must fail as if the id did not exist,
// and the owner's copy must stay exactly as it was.
test.describe("cross-user isolation", () => {
  test.describe.configure({ mode: "default" });

  let owner: APIRequestContext;
  let other: APIRequestContext;
  let ownerData: ApplicationsApi;
  let record: Application;

  test.beforeAll(async ({ playwright, baseURL }) => {
    owner = await playwright.request.newContext({ baseURL, storageState: AUTH_STATE_PATH });
    other = await signedInContext(playwright, baseURL, env.loginUserEmail, env.loginUserPassword);
    ownerData = new ApplicationsApi(owner);
    record = await ownerData.create(buildApplication({ priority: "P0", tags: ["private"] }));
  });

  test.afterAll(async () => {
    await ownerData?.deleteTracked();
    await owner?.dispose();
    await other?.dispose();
  });

  const expectOwnerCopyUnchanged = async () => {
    const { data } = await expectJson(await new ApplicationsEndpoint(owner).get(record.id), 200, applicationResponse);
    expect(data).toEqual(record);
  };

  test("another account cannot read it by id", async () => {
    await expectApiError(await new ApplicationsEndpoint(other).get(record.id), 404, "NOT_FOUND");
  });

  test("another account cannot find it by search or in its export", async () => {
    const found = await expectJson(
      await new ApplicationsEndpoint(other).list({ q: record.company }),
      200,
      applicationListResponse,
    );
    expect(found.data).toEqual([]);
    expect(found.meta.total).toBe(0);

    const exported = await expectJson(await new AccountEndpoint(other).export("json"), 200, accountExportSchema);
    expect(exported.opportunities.map((application) => application.id)).not.toContain(record.id);
  });

  test("another account cannot update it", async () => {
    await expectApiError(
      await new ApplicationsEndpoint(other).update(record.id, { title: "Changed by another account" }),
      404,
      "NOT_FOUND",
    );
    await expectOwnerCopyUnchanged();
  });

  test("another account cannot delete it", async () => {
    await expectApiError(await new ApplicationsEndpoint(other).delete(record.id), 404, "NOT_FOUND");
    await expectOwnerCopyUnchanged();
  });
});
