import { z } from "zod";
import type { AccountState } from "@/migration/snapshot";

/**
 * Value changes an upgrade is supposed to make, per field: `{ "<field>": { "<before>": "<after>" } }`.
 * The verify phase applies them to the snapshot before comparing, so a migration that rewrites
 * stored values is checked for doing exactly that, and nothing else.
 */
export const expectedChangesSchema = z.record(z.string().min(1), z.record(z.string().min(1), z.string().min(1)));

export type ExpectedChanges = z.infer<typeof expectedChangesSchema>;

export function parseExpectedChanges(raw: string | undefined): ExpectedChanges {
  if (!raw?.trim()) return {};
  const result = expectedChangesSchema.safeParse(JSON.parse(raw));
  if (!result.success) throw new Error(`MIGRATION_EXPECTED_CHANGES is not valid:\n${z.prettifyError(result.error)}`);
  return result.data;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCounts = (value: Record<string, unknown>): value is Record<string, number> =>
  Object.values(value).every((count) => typeof count === "number");

/**
 * Rewrites a value the way the upgrade should have:
 * - a field named in `changes` gets its mapped value (records, recent lists, sources);
 * - in a set of counts (an object of numbers, such as counts per stage), mapped keys are
 *   renamed, and counts that end up under the same key are added together.
 * Rows in a list are not merged: when two values merge into one, per-value rows (such as
 * the per-source breakdown) need a verify step of their own.
 */
export function applyExpectedChanges<T>(value: T, changes: ExpectedChanges): T {
  if (Array.isArray(value)) return value.map((item: unknown) => applyExpectedChanges(item, changes)) as T;
  if (!isObject(value)) return value;

  if (isCounts(value)) {
    const renames = Object.assign({}, ...Object.values(changes)) as Record<string, string>;
    const counts: Record<string, number> = {};
    for (const [key, count] of Object.entries(value)) {
      const renamed = renames[key] ?? key;
      counts[renamed] = (counts[renamed] ?? 0) + count;
    }
    return counts as T;
  }

  const entries = Object.entries(value).map(([key, field]): [string, unknown] => {
    const mapping = changes[key];
    if (mapping && typeof field === "string" && field in mapping) return [key, mapping[field]];
    return [key, applyExpectedChanges(field, changes)];
  });
  return Object.fromEntries(entries) as T;
}

export const expectedAccountState = (state: AccountState, changes: ExpectedChanges): AccountState =>
  applyExpectedChanges(state, changes);
