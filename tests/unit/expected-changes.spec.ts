import { applyExpectedChanges, parseExpectedChanges } from "@/migration/expected-changes";
import { expect, test } from "@playwright/test";

// A hypothetical upgrade that renames one stage and merges two sources into one.
const changes = parseExpectedChanges(
  JSON.stringify({ status: { WITHDRAWN: "DECLINED" }, source: { indeed: "job_board", linkedin: "job_board" } }),
);

test.describe("expected migration changes", () => {
  test("rewrite mapped fields and leave everything else alone", () => {
    const record = { id: "1", status: "WITHDRAWN", source: "indeed", title: "WITHDRAWN", tags: ["indeed"] };

    expect(applyExpectedChanges(record, changes)).toEqual({ ...record, status: "DECLINED", source: "job_board" });
    expect(applyExpectedChanges({ ...record, status: "APPLIED" }, changes).status).toBe("APPLIED");
  });

  test("rename keys in counts and add up counts that merge", () => {
    const summary = {
      total: 5,
      byStatus: { APPLIED: 2, WITHDRAWN: 3 },
      bySource: { indeed: 1, linkedin: 2, referral: 2 },
      recent: [{ id: "1", status: "WITHDRAWN" }],
      followUpsDue: { count: 1, first: { id: "1", status: "WITHDRAWN" } },
    };

    expect(applyExpectedChanges(summary, changes)).toEqual({
      total: 5,
      byStatus: { APPLIED: 2, DECLINED: 3 },
      bySource: { job_board: 3, referral: 2 },
      recent: [{ id: "1", status: "DECLINED" }],
      followUpsDue: { count: 1, first: { id: "1", status: "DECLINED" } },
    });
  });

  test("mean no changes when unset or empty", () => {
    expect(parseExpectedChanges(undefined)).toEqual({});
    expect(parseExpectedChanges("  ")).toEqual({});
  });

  test("reject a value that is not a map of fields to value maps", () => {
    expect(() => parseExpectedChanges('{"status":"DECLINED"}')).toThrow(/MIGRATION_EXPECTED_CHANGES is not valid/);
  });
});
