import http from "k6/http";
import { check, group, sleep } from "k6";
import { APPLICATIONS_PATH, BASE_URL } from "./config.ts";
import { json, type RunData } from "./api.ts";

const ok = (name: string) => ({ [`${name} answers 200`]: (r: { status: number }) => r.status === 200 });

/** What a person does most: open the list, search, open one record, look at Home. */
export function browse(data: RunData): void {
  const auth = json(data.token);

  group("browse", () => {
    const list = http.get(`${BASE_URL}${APPLICATIONS_PATH}?page=1&pageSize=20&sort=updatedAt&order=desc`, {
      ...auth,
      tags: { name: "list" },
    });
    check(list, {
      ...ok("list"),
      "list has a page of records": (r) => Array.isArray((r.json() as { data: unknown[] }).data),
    });

    const search = http.get(`${BASE_URL}${APPLICATIONS_PATH}?q=${encodeURIComponent(data.marker)}`, {
      ...auth,
      tags: { name: "search" },
    });
    check(search, {
      ...ok("search"),
      "search finds the seeded records": (r) =>
        (r.json() as { meta: { total: number } }).meta.total === data.ids.length,
    });

    const id = data.ids[Math.floor(Math.random() * data.ids.length)];
    check(http.get(`${BASE_URL}${APPLICATIONS_PATH}/${id}`, { ...auth, tags: { name: "read" } }), ok("read"));

    check(http.get(`${BASE_URL}/api/v1/dashboard/summary`, { ...auth, tags: { name: "dashboard" } }), ok("dashboard"));
  });

  sleep(1);
}

/** Saving work: add a record, move it to Applied, delete it. */
export function edit(data: RunData): void {
  const auth = json(data.token);

  group("edit", () => {
    const created = http.post(
      `${BASE_URL}${APPLICATIONS_PATH}`,
      JSON.stringify({ company: `${data.marker} edit ${__VU}-${__ITER}`, title: "Performance Engineer" }),
      { ...auth, tags: { name: "create" } },
    );
    if (!check(created, { "create answers 201": (r) => r.status === 201 })) return;
    const id = (created.json() as { data: { id: string } }).data.id;

    const updated = http.patch(`${BASE_URL}${APPLICATIONS_PATH}/${id}`, JSON.stringify({ status: "APPLIED" }), {
      ...auth,
      tags: { name: "update" },
    });
    check(updated, ok("update"));

    const deleted = http.del(`${BASE_URL}${APPLICATIONS_PATH}/${id}`, null, { ...auth, tags: { name: "delete" } });
    check(deleted, { "delete answers 204": (r) => r.status === 204 });
  });

  sleep(1);
}
