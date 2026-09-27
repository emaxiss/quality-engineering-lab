import { expectApiError } from "@/api/assertions";
import { ApplicationsEndpoint } from "@/api/endpoints/applications.endpoint";
import type { ApplicationInput } from "@/api/types";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

test.describe("applications api errors", () => {
  test("rejects a create without a company", async ({ applicationsEndpoint }) => {
    const error = await expectApiError(await applicationsEndpoint.create({ title: "QA Engineer" }), 400, "VALIDATION_ERROR");

    expect(error.details).toContainEqual(expect.objectContaining({ path: "company" }));
  });

  test("rejects an unknown priority", async ({ applicationsEndpoint }) => {
    const input = { ...buildApplication(), priority: "P9" } as unknown as ApplicationInput;

    const error = await expectApiError(await applicationsEndpoint.create(input), 400, "VALIDATION_ERROR");

    expect(error.details).toContainEqual(expect.objectContaining({ path: "priority" }));
  });

  test("rejects an unknown sort field", async ({ applicationsEndpoint }) => {
    const error = await expectApiError(await applicationsEndpoint.list({ sort: "notAField" }), 400, "VALIDATION_ERROR");

    expect(error.details).toContainEqual(expect.objectContaining({ path: "sort" }));
  });

  test("rejects an id that is not a UUID", async ({ applicationsEndpoint }) => {
    await expectApiError(await applicationsEndpoint.get("not-a-uuid"), 400, "VALIDATION_ERROR");
  });

  test("returns not found for an id that does not exist", async ({ applicationsEndpoint }) => {
    await expectApiError(await applicationsEndpoint.get(UNKNOWN_ID), 404, "NOT_FOUND");
    await expectApiError(await applicationsEndpoint.update(UNKNOWN_ID, { priority: "P0" }), 404, "NOT_FOUND");
    await expectApiError(await applicationsEndpoint.delete(UNKNOWN_ID), 404, "NOT_FOUND");
  });

  test("rejects every call without a session", async ({ request }) => {
    const anonymous = new ApplicationsEndpoint(request);

    await expectApiError(await anonymous.list(), 401, "UNAUTHORIZED");
    await expectApiError(await anonymous.create(buildApplication()), 401, "UNAUTHORIZED");
    await expectApiError(await anonymous.get(UNKNOWN_ID), 401, "UNAUTHORIZED");
  });
});
