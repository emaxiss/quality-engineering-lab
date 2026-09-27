import { randomUUID } from "node:crypto";
import { expectJson } from "@/api/assertions";
import type { Application, ListEnvelope } from "@/api/types";
import { buildApplication } from "@/data/application.factory";
import { expect, test } from "@/fixtures/test";

// Each test searches for its own marker, so it only sees what it created.
const newMarker = () => `List ${randomUUID().slice(0, 8)}`;

test.describe("applications list api", () => {
  test("search pages through matching applications", async ({ applicationsEndpoint, applicationsApi }) => {
    const marker = newMarker();
    for (const name of ["Alpha", "Bravo", "Charlie"]) {
      await applicationsApi.create(buildApplication({ company: `${marker} ${name}` }));
    }

    const first = await expectJson<ListEnvelope<Application>>(
      await applicationsEndpoint.list({ q: marker, pageSize: 2, page: 1 }),
      200,
    );
    expect(first.data).toHaveLength(2);
    expect(first.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });

    const second = await expectJson<ListEnvelope<Application>>(
      await applicationsEndpoint.list({ q: marker, pageSize: 2, page: 2 }),
      200,
    );
    expect(second.data).toHaveLength(1);

    const seen = [...first.data, ...second.data].map((application) => application.company);
    expect(new Set(seen).size).toBe(3);
  });

  test("filters by stage", async ({ applicationsEndpoint, applicationsApi }) => {
    const marker = newMarker();
    await applicationsApi.create(buildApplication({ company: `${marker} Saved`, status: "SAVED" }));
    const applied = await applicationsApi.create(buildApplication({ company: `${marker} Applied`, status: "APPLIED" }));

    const { data } = await expectJson<ListEnvelope<Application>>(
      await applicationsEndpoint.list({ q: marker, status: ["APPLIED"] }),
      200,
    );

    expect(data.map((application) => application.id)).toEqual([applied.id]);
  });

  test("sorts by company", async ({ applicationsEndpoint, applicationsApi }) => {
    const marker = newMarker();
    for (const name of ["Bravo", "Alpha", "Charlie"]) {
      await applicationsApi.create(buildApplication({ company: `${marker} ${name}` }));
    }

    const { data } = await expectJson<ListEnvelope<Application>>(
      await applicationsEndpoint.list({ q: marker, sort: "company", order: "asc" }),
      200,
    );

    expect(data.map((application) => application.company)).toEqual(
      ["Alpha", "Bravo", "Charlie"].map((name) => `${marker} ${name}`),
    );
  });

  test("returns an empty page past the last one", async ({ applicationsEndpoint, applicationsApi }) => {
    const marker = newMarker();
    await applicationsApi.create(buildApplication({ company: `${marker} Only` }));

    const { data, meta } = await expectJson<ListEnvelope<Application>>(
      await applicationsEndpoint.list({ q: marker, page: 5, pageSize: 10 }),
      200,
    );

    expect(data).toEqual([]);
    expect(meta).toEqual({ page: 5, pageSize: 10, total: 1, totalPages: 1 });
  });
});
