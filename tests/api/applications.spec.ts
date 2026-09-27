import { expectApiError, expectJson } from "@/api/assertions";
import { applicationResponse } from "@/api/schemas";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test.describe("applications api", () => {
  test("creates an application from the required fields with defaults", async ({
    applicationsEndpoint,
    applicationsApi,
  }) => {
    const input = buildApplication();

    const { data } = await expectJson(await applicationsEndpoint.create(input), 201, applicationResponse);
    applicationsApi.track(data.id);

    expect(data).toMatchObject({
      ...input,
      id: expect.stringMatching(UUID),
      status: "SAVED",
      priority: "P1",
      tags: [],
      appliedAt: null,
      closedAt: null,
    });
    expect(data.createdAt).toBe(data.updatedAt);
  });

  test("reads an application by id", async ({ applicationsEndpoint, applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication({ priority: "P0", tags: ["api", "smoke"] }));

    const { data } = await expectJson(await applicationsEndpoint.get(created.id), 200, applicationResponse);

    expect(data).toEqual(created);
  });

  test("updates only the fields it is sent", async ({ applicationsEndpoint, applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication());
    const changes = { priority: "P0", description: "Updated through the API" } as const;

    const { data } = await expectJson(await applicationsEndpoint.update(created.id, changes), 200, applicationResponse);

    expect(data).toEqual({ ...created, ...changes, updatedAt: expect.any(String) });
    expect(Date.parse(data.updatedAt)).toBeGreaterThan(Date.parse(created.updatedAt));
  });

  test("stamps applied and closed dates as the stage moves", async ({ applicationsEndpoint, applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication());

    const applied = await expectJson(
      await applicationsEndpoint.update(created.id, { status: "APPLIED" }),
      200,
      applicationResponse,
    );
    expect(applied.data.appliedAt).toEqual(expect.any(String));
    expect(applied.data.closedAt).toBeNull();

    const rejected = await expectJson(
      await applicationsEndpoint.update(created.id, { status: "REJECTED" }),
      200,
      applicationResponse,
    );
    expect(rejected.data.appliedAt).toBe(applied.data.appliedAt);
    expect(rejected.data.closedAt).toEqual(expect.any(String));
  });

  test("deletes an application", async ({ applicationsEndpoint, applicationsApi }) => {
    const created = await applicationsApi.create(buildApplication());

    expect((await applicationsEndpoint.delete(created.id)).status()).toBe(204);
    await expectApiError(await applicationsEndpoint.get(created.id), 404, "NOT_FOUND");
  });
});
