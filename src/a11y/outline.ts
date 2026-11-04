import type { Page } from "@playwright/test";

export type Heading = { level: number; name: string };

/** Headings inside the page's single main landmark, in reading order, as the accessibility tree exposes them. */
export async function headingOutline(page: Page): Promise<Heading[]> {
  const tree = await page.getByRole("main").ariaSnapshot();
  return [...tree.matchAll(/- heading "(.*)" \[level=(\d)\]/g)].map((match) => ({
    level: Number(match[2]),
    name: match[1] ?? "",
  }));
}

/** Headings that go more than one level deeper than the heading before them, such as a level 3 right after a level 1. */
export function skippedLevels(outline: Heading[]): Heading[] {
  return outline.filter((heading, i) => {
    const previous = outline[i - 1];
    return previous !== undefined && heading.level > previous.level + 1;
  });
}
