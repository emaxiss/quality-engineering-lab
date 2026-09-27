import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

/** WCAG 2.2 level A and AA, including the rules carried over from 2.0 and 2.1. */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

/** A violation the application has today, matched by rule and the element's visible text. */
export interface KnownIssue {
  rule: string;
  text: RegExp;
  description: string;
}

export interface ScanOptions {
  /** Limit the scan to this CSS selector, for example an open dialog. */
  include?: string;
  /** Violations to tolerate. Each must still reproduce, so a fixed one gets removed from the list. */
  known?: KnownIssue[];
}

/** Text of a failing element, read from the page through the selector axe reports for it. */
async function elementText(page: Page, target: unknown[]): Promise<string> {
  const [selector] = target;
  if (typeof selector !== "string" || target.length !== 1) return ""; // inside a frame or shadow root
  return ((await page.locator(selector).first().textContent()) ?? "").trim();
}

// Content that fades or slides in is measured mid-animation otherwise, which reports
// contrast failures for colors the user never sees once the page settles.
async function waitForAnimations(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}

/**
 * Scans the page against WCAG 2.2 AA, attaches every violation to the report, and fails
 * with one line per unexpected rule, or for each known issue that no longer reproduces.
 */
export async function expectAccessible(page: Page, testInfo: TestInfo, options: ScanOptions = {}): Promise<void> {
  const known = options.known ?? [];
  await waitForAnimations(page);
  let scan = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (options.include) scan = scan.include(options.include);
  const { violations } = await scan.analyze();
  await testInfo.attach("axe-violations.json", {
    body: JSON.stringify(violations, null, 2),
    contentType: "application/json",
  });

  const seen = new Set<KnownIssue>();
  const unexpected: string[] = [];
  for (const violation of violations) {
    let unmatched = 0;
    for (const node of violation.nodes) {
      const text = await elementText(page, node.target);
      const issue = known.find((candidate) => candidate.rule === violation.id && candidate.text.test(text));
      if (issue) seen.add(issue);
      else unmatched++;
    }
    if (unmatched > 0) {
      unexpected.push(`${violation.id} (${violation.impact}): ${violation.help}, ${unmatched} element(s)`);
    }
  }

  for (const issue of seen)
    testInfo.annotations.push({ type: "known accessibility issue", description: issue.description });
  expect(unexpected, "violations").toEqual([]);
  expect(
    known.filter((issue) => !seen.has(issue)).map((issue) => issue.description),
    "known issues that no longer reproduce: remove them",
  ).toEqual([]);
}
