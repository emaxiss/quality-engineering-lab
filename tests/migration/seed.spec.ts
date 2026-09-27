import { randomUUID } from "node:crypto";
import { ApplicationsApi } from "@/api/applications.api";
import { signedInContext } from "@/api/sessions";
import { env } from "@/config/env";
import { expect, test } from "@/fixtures/test";
import { buildDataset } from "@/migration/dataset";
import { readAccountState, saveSnapshot } from "@/migration/snapshot";

test.describe("migration seed", () => {
  test("creates the dataset and snapshots both accounts", async ({ playwright, baseURL, userRequest }) => {
    const marker = `Mig${randomUUID().slice(0, 8)}`;
    const dataset = buildDataset(marker);
    const second = await signedInContext(playwright, baseURL, env.loginUserEmail, env.loginUserPassword);
    const mainData = new ApplicationsApi(userRequest);
    const secondData = new ApplicationsApi(second);

    try {
      const seeded = {
        main: [] as string[],
        second: [] as string[],
      };
      for (const record of dataset.main) seeded.main.push((await mainData.create(record)).id);
      for (const record of dataset.second) seeded.second.push((await secondData.create(record)).id);

      const accounts = { main: await readAccountState(userRequest), second: await readAccountState(second) };
      for (const role of ["main", "second"] as const) {
        const ids = accounts[role].records.map((record) => record.id);
        expect(ids).toEqual(expect.arrayContaining(seeded[role]));
        expect(accounts[role].total).toBe(ids.length);
      }

      const file = saveSnapshot({ marker, takenAt: new Date().toISOString(), seeded, accounts });
      test.info().annotations.push({ type: "snapshot", description: file });
    } catch (error) {
      // A half-seeded dataset is useless to the verify phase: remove it.
      await mainData.deleteTracked();
      await secondData.deleteTracked();
      throw error;
    } finally {
      await second.dispose();
    }
  });
});
