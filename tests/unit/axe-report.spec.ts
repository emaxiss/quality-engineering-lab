import { expect, test } from "@playwright/test";
import { violationsForReport } from "@/a11y/axe";

test.describe("violationsForReport", () => {
  test("replaces every email address in the failing elements' HTML", () => {
    const violations = [
      {
        id: "label-content-name-mismatch",
        nodes: [{ html: '<a title="qe.user+lab@example.com · Settings" aria-label="Account settings">' }],
      },
      { id: "color-contrast", nodes: [{ html: "<span>second@test.example.org</span>" }] },
    ];
    const body = violationsForReport(violations);
    expect(body).not.toMatch(/@/);
    expect(body).toContain('title=\\"[email] · Settings\\"');
    expect(body).toContain("<span>[email]</span>");
  });

  test("leaves violations without an address unchanged", () => {
    const violations = [{ id: "region", nodes: [{ html: "<div>Saved 1</div>" }] }];
    expect(violationsForReport(violations)).toBe(JSON.stringify(violations, null, 2));
  });
});
