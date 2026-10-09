import http from "k6/http";
import { check, fail } from "k6";
import { APPLICATIONS_PATH, BASE_URL, credentials } from "./config.ts";

/** Everything the virtual users share: a bearer token and the records the run created. */
export interface RunData {
  token: string;
  ids: string[];
  marker: string;
}

/** Every record a run creates starts with this, so teardown can find leftovers too. */
const PREFIX = "Perf Co";

export const json = (token: string) => ({
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
});

/** Signs in once for the whole run. Sign-in is rate limited per IP, so virtual users never sign in. */
export function signIn(): string {
  const response = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(credentials()), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "login" },
  });
  if (response.status !== 200) fail(`sign-in failed with ${response.status}`);
  return (response.json() as { data: { session: { accessToken: string } } }).data.session.accessToken;
}

/** Creates `count` records to read during the run. */
export function seed(token: string, count: number): RunData {
  const marker = `${PREFIX} ${crypto.randomUUID().slice(0, 8)}`;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const response = http.post(
      `${BASE_URL}${APPLICATIONS_PATH}`,
      JSON.stringify({ company: `${marker} ${i}`, title: "Performance Engineer", tags: ["perf"] }),
      { ...json(token), tags: { name: "seed" } },
    );
    if (response.status !== 201) fail(`seeding failed with ${response.status}`);
    ids.push((response.json() as { data: { id: string } }).data.id);
  }
  return { token, ids, marker };
}

/** Deletes every record whose company starts with the prefix, including ones a failed run left. */
export function cleanUp(token: string): void {
  for (let page = 0; page < 20; page++) {
    const response = http.get(`${BASE_URL}${APPLICATIONS_PATH}?q=${encodeURIComponent(PREFIX)}&pageSize=100`, {
      ...json(token),
      tags: { name: "cleanup" },
    });
    const rows = (response.json() as { data: { id: string; company: string }[] }).data.filter((row) =>
      row.company.startsWith(PREFIX),
    );
    if (rows.length === 0) return;
    for (const row of rows) {
      const deleted = http.del(`${BASE_URL}${APPLICATIONS_PATH}/${row.id}`, null, {
        ...json(token),
        tags: { name: "cleanup" },
      });
      check(deleted, { "cleanup deletes the record": (r) => r.status === 204 || r.status === 404 });
    }
  }
}
