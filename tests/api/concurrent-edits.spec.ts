import { expectJson } from "@/api/assertions";
import { applicationResponse } from "@/api/schemas";
import type { ApplicationInput } from "@/api/types";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

test.describe("concurrent edits api", () => {
  test("edits to different fields sent at the same moment all persist", async ({
    applicationsEndpoint,
    applicationsApi,
  }) => {
    const created = await applicationsApi.create(buildApplication({ location: "Porto", priority: "LOW" }));
    const edits: ApplicationInput[] = [
      { title: "Staff QA Engineer" },
      { location: "Lisbon" },
      { priority: "HIGH" },
      { description: "Referred by a former colleague." },
      { tags: ["remote", "fintech"] },
    ];

    // A partial update must change only the fields it names. A server that reads the record,
    // merges the change and writes the whole row back would let these overwrite each other.
    const responses = await Promise.all(edits.map((changes) => applicationsEndpoint.update(created.id, changes)));
    for (const response of responses) await expectJson(response, 200, applicationResponse);

    const { data } = await expectJson(await applicationsEndpoint.get(created.id), 200, applicationResponse);
    expect(data).toMatchObject(Object.assign({}, ...edits) as ApplicationInput);
    expect(Date.parse(data.updatedAt)).toBeGreaterThan(Date.parse(created.updatedAt));
  });
});
