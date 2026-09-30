import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Presses Tab until `target` has focus, the way a keyboard user moves through a page.
 * Fails if it takes more than `maxTabs` presses, so a control that falls out of the
 * tab order, or moves far down it, fails the test that relies on it.
 */
export async function tabTo(page: Page, target: Locator, maxTabs = 10): Promise<void> {
  for (let presses = 0; presses < maxTabs; presses++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target, `not reached within ${maxTabs} Tab presses`).toBeFocused();
}

/** Whether keyboard focus is somewhere inside `container`. */
export function hasFocusWithin(container: Locator): Promise<boolean> {
  return container.evaluate((element) => element.contains(document.activeElement));
}
