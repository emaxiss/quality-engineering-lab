import { expect, test } from "@playwright/test";
import { skippedLevels } from "@/a11y/outline";

test.describe("skippedLevels", () => {
  test("accepts going one level deeper and coming back up any number of levels", () => {
    const outline = [
      { level: 1, name: "Page" },
      { level: 2, name: "Section" },
      { level: 3, name: "Detail" },
      { level: 2, name: "Next section" },
      { level: 3, name: "Detail" },
      { level: 1, name: "Second page heading" },
    ];
    expect(skippedLevels(outline)).toEqual([]);
  });

  test("reports each heading that jumps more than one level", () => {
    const outline = [
      { level: 1, name: "Page" },
      { level: 3, name: "Too deep" },
      { level: 2, name: "Section" },
      { level: 5, name: "Far too deep" },
    ];
    expect(skippedLevels(outline)).toEqual([
      { level: 3, name: "Too deep" },
      { level: 5, name: "Far too deep" },
    ]);
  });
});
