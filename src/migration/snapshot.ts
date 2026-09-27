import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";
import { expectJson } from "@/api/assertions";
import { ApplicationsEndpoint } from "@/api/endpoints/applications.endpoint";
import { DashboardEndpoint } from "@/api/endpoints/dashboard.endpoint";
import type { Application, Envelope, ListEnvelope } from "@/api/types";
import { env } from "@/config/env";

export type Role = "main" | "second";

/** Everything the API reports about one account, captured before and compared after. */
export interface AccountState {
  total: number;
  records: Application[];
  /** Dashboard summary without date-relative fields. */
  summary: Record<string, unknown>;
}

export interface Snapshot {
  marker: string;
  takenAt: string;
  seeded: Record<Role, string[]>;
  accounts: Record<Role, AccountState>;
}

// The summary's per-day activity depends on the day the request is made, not on the data.
const DATE_RELATIVE_SUMMARY_FIELDS = ["activeDays"];

export async function readAccountState(request: APIRequestContext): Promise<AccountState> {
  const applications = new ApplicationsEndpoint(request);
  const records: Application[] = [];
  let total = 0;
  for (let page = 1; ; page++) {
    const body = await expectJson<ListEnvelope<Application>>(
      await applications.list({ sort: "createdAt", order: "asc", page, pageSize: 100 }),
      200,
    );
    records.push(...body.data);
    total = body.meta.total;
    if (page >= body.meta.totalPages) break;
  }

  const { data } = await expectJson<Envelope<Record<string, unknown>>>(
    await new DashboardEndpoint(request).summary(),
    200,
  );
  const summary = Object.fromEntries(
    Object.entries(data).filter(([key]) => !DATE_RELATIVE_SUMMARY_FIELDS.includes(key)),
  );

  return { total, records: records.sort((a, b) => a.id.localeCompare(b.id)), summary };
}

const snapshotFile = () => path.resolve(env.migrationSnapshotDir, "snapshot.json");

export function saveSnapshot(snapshot: Snapshot): string {
  mkdirSync(path.dirname(snapshotFile()), { recursive: true });
  writeFileSync(snapshotFile(), `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshotFile();
}

export function loadSnapshot(): Snapshot {
  try {
    return JSON.parse(readFileSync(snapshotFile(), "utf8")) as Snapshot;
  } catch {
    throw new Error(`No snapshot at ${snapshotFile()}. Run the seed phase first: pnpm test:migration:seed`);
  }
}
