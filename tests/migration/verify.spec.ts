import type { APIRequestContext } from "@playwright/test";
import { ApplicationsApi } from "@/api/applications.api";
import { expectApiError, expectJson } from "@/api/assertions";
import { applicationListResponse, applicationResponse } from "@/api/schemas";
import { ApplicationsEndpoint } from "@/api/endpoints/applications.endpoint";
import { signedInContext } from "@/api/sessions";
import type { Application } from "@/api/types";
import { AUTH_STATE_PATH, env } from "@/config/env";
import { expect, test } from "@/fixtures/test";
import { expectedAccountState, parseExpectedChanges } from "@/migration/expected-changes";
import { type AccountState, loadSnapshot, readAccountState, type Role, type Snapshot } from "@/migration/snapshot";

// Read-only comparisons run first, the checks that change data run last.
test.describe.configure({ mode: "serial" });

test.describe("migration verify", () => {
  let snapshot: Snapshot;
  const contexts = {} as Partial<Record<Role, APIRequestContext>>;
  const after = {} as Record<Role, AccountState>;
  // The snapshot with the value changes the upgrade is supposed to make applied.
  const expected = {} as Record<Role, AccountState>;
  // Set once both accounts are read. If setup fails (for example on a sign-in rate limit),
  // the seeded data is kept, so the verify phase can simply be run again.
  let verifying = false;

  test.beforeAll(async ({ playwright }) => {
    snapshot = loadSnapshot();
    const changes = parseExpectedChanges(env.migrationExpectedChanges);
    for (const role of ["main", "second"] as const)
      expected[role] = expectedAccountState(snapshot.accounts[role], changes);
    if (Object.keys(changes).length > 0) {
      test.info().annotations.push({ type: "expected changes", description: JSON.stringify(changes) });
    }
    contexts.main = await playwright.request.newContext({ baseURL: env.baseURL, storageState: AUTH_STATE_PATH });
    contexts.second = await signedInContext(playwright, env.baseURL, env.loginUserEmail, env.loginUserPassword);
    after.main = await readAccountState(contexts.main);
    after.second = await readAccountState(contexts.second);
    verifying = true;
  });

  test.afterAll(async () => {
    for (const role of ["main", "second"] as const) {
      const context = contexts[role];
      if (!context) continue;
      if (verifying) {
        const data = new ApplicationsApi(context);
        for (const id of snapshot.seeded[role]) data.track(id);
        await data.deleteTracked();
      }
      await context.dispose();
    }
  });

  const account = (role: Role): APIRequestContext => {
    const context = contexts[role];
    if (!context) throw new Error(`No ${role} session`);
    return context;
  };

  const seededRecord = (role: Role, name: string): Application => {
    const record = snapshot.accounts[role].records.find((candidate) => candidate.company.endsWith(name));
    if (!record) throw new Error(`The snapshot has no '${name}' record`);
    return record;
  };

  test("keeps every record, and adds none", () => {
    for (const role of ["main", "second"] as const) {
      expect(after[role].total, role).toBe(expected[role].total);
      expect(
        after[role].records.map((record) => record.id),
        role,
      ).toEqual(expected[role].records.map((record) => record.id));
    }
  });

  test("leaves every record as it was, apart from the expected changes, timestamps included", () => {
    for (const role of ["main", "second"] as const) {
      expect(after[role].records, role).toEqual(expected[role].records);
    }
  });

  test("keeps the dashboard figures", () => {
    for (const role of ["main", "second"] as const) {
      expect(after[role].summary, role).toEqual(expected[role].summary);
    }
  });

  test("keeps each account's records private", async () => {
    const mainView = new ApplicationsEndpoint(account("main"));
    const secondView = new ApplicationsEndpoint(account("second"));

    for (const id of snapshot.seeded.second) await expectApiError(await mainView.get(id), 404, "NOT_FOUND");
    for (const id of snapshot.seeded.main) await expectApiError(await secondView.get(id), 404, "NOT_FOUND");
  });

  test("migrated records can still be updated, filtered, sorted and deleted", async () => {
    const applications = new ApplicationsEndpoint(account("main"));
    const before = seededRecord("main", "Page filler A");

    const { data: updated } = await expectJson(
      await applications.update(before.id, { title: "Updated after the upgrade", status: "APPLIED" }),
      200,
      applicationResponse,
    );
    expect(updated).toMatchObject({ id: before.id, title: "Updated after the upgrade", status: "APPLIED" });
    expect(updated.appliedAt).toEqual(expect.any(String));
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(before.updatedAt));

    const applied = await expectJson(
      await applications.list({ q: snapshot.marker, status: ["APPLIED"], pageSize: 100 }),
      200,
      applicationListResponse,
    );
    expect(applied.data.map((record) => record.id)).toContain(before.id);

    const byCompany = async (order: "asc" | "desc") =>
      (
        await expectJson(
          await applications.list({ q: snapshot.marker, sort: "company", order, pageSize: 100 }),
          200,
          applicationListResponse,
        )
      ).data.map((record) => record.id);
    const ascending = await byCompany("asc");
    expect(ascending).toHaveLength(snapshot.seeded.main.length);
    expect(await byCompany("desc")).toEqual([...ascending].reverse());

    expect((await applications.delete(before.id)).status()).toBe(204);
    await expectApiError(await applications.get(before.id), 404, "NOT_FOUND");
  });

  test("paths the upgrade removed answer 404", async () => {
    test.skip(env.migrationRemovedPaths.length === 0, "MIGRATION_REMOVED_PATHS is not set");

    for (const removed of env.migrationRemovedPaths) {
      expect((await account("main").get(removed)).status(), removed).toBe(404);
    }
  });
});
