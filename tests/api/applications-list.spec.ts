import { randomUUID } from "node:crypto";
import { expectApiError, expectJson } from "@/api/assertions";
import { applicationListResponse } from "@/api/schemas";
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

    const first = await expectJson(
      await applicationsEndpoint.list({ q: marker, pageSize: 2, page: 1 }),
      200,
      applicationListResponse,
    );
    expect(first.data).toHaveLength(2);
    expect(first.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });

    const second = await expectJson(
      await applicationsEndpoint.list({ q: marker, pageSize: 2, page: 2 }),
      200,
      applicationListResponse,
    );
    expect(second.data).toHaveLength(1);

    const seen = [...first.data, ...second.data].map((application) => application.company);
    expect(new Set(seen).size).toBe(3);
  });

  test("filters by stage", async ({ applicationsEndpoint, applicationsApi }) => {
    const marker = newMarker();
    await applicationsApi.create(buildApplication({ company: `${marker} Saved`, status: "SAVED" }));
    const applied = await applicationsApi.create(buildApplication({ company: `${marker} Applied`, status: "APPLIED" }));

    const { data } = await expectJson(
      await applicationsEndpoint.list({ q: marker, status: ["APPLIED"] }),
      200,
      applicationListResponse,
    );

    expect(data.map((application) => application.id)).toEqual([applied.id]);
  });

  test("sorts by company", async ({ applicationsEndpoint, applicationsApi }) => {
    const marker = newMarker();
    for (const name of ["Bravo", "Alpha", "Charlie"]) {
      await applicationsApi.create(buildApplication({ company: `${marker} ${name}` }));
    }

    const { data } = await expectJson(
      await applicationsEndpoint.list({ q: marker, sort: "company", order: "asc" }),
      200,
      applicationListResponse,
    );

    expect(data.map((application) => application.company)).toEqual(
      ["Alpha", "Bravo", "Charlie"].map((name) => `${marker} ${name}`),
    );
  });

  test("returns an empty page past the last one", async ({ applicationsEndpoint, applicationsApi }) => {
    const marker = newMarker();
    await applicationsApi.create(buildApplication({ company: `${marker} Only` }));

    const { data, meta } = await expectJson(
      await applicationsEndpoint.list({ q: marker, page: 5, pageSize: 10 }),
      200,
      applicationListResponse,
    );

    expect(data).toEqual([]);
    expect(meta).toEqual({ page: 5, pageSize: 10, total: 1, totalPages: 1 });
  });

  // Rows that tie on the sort key have no natural order. Without a tie-breaker, the database may
  // return them in a different order for each page, and paging repeats some rows and skips others.
  for (const sort of ["company", "status", "priority"]) {
    test(`pages through rows that tie on ${sort} without repeats or gaps`, async ({
      applicationsEndpoint,
      applicationsApi,
    }) => {
      const marker = newMarker();
      const created: string[] = [];
      for (let i = 0; i < 5; i++) {
        const application = await applicationsApi.create(
          buildApplication({ company: `${marker} Same`, title: `Role ${i}`, status: "SAVED", priority: "MEDIUM" }),
        );
        created.push(application.id);
      }

      const seen: string[] = [];
      for (let page = 1; page <= 3; page++) {
        const { data } = await expectJson(
          await applicationsEndpoint.list({ q: marker, sort, order: "asc", pageSize: 2, page }),
          200,
          applicationListResponse,
        );
        seen.push(...data.map((application) => application.id));
      }

      expect(seen, "every row once").toHaveLength(created.length);
      expect(new Set(seen)).toEqual(new Set(created));
    });
  }

  test("accepts page sizes from 1 to 100", async ({ applicationsEndpoint }) => {
    for (const pageSize of [1, 100]) {
      const { meta } = await expectJson(await applicationsEndpoint.list({ pageSize }), 200, applicationListResponse);
      expect(meta.pageSize).toBe(pageSize);
    }
  });

  test("refuses a page size or page outside the bounds", async ({ applicationsEndpoint }) => {
    const outOfBounds = [{ pageSize: 0 }, { pageSize: 101 }, { pageSize: 2.5 }, { page: 0 }, { page: -1 }];
    for (const query of outOfBounds) {
      const error = await expectApiError(await applicationsEndpoint.list(query), 400, "VALIDATION_ERROR");
      expect(error.details, JSON.stringify(query)).toContainEqual(
        expect.objectContaining({ path: Object.keys(query)[0] }),
      );
    }
  });
});
