import type { Page } from "@playwright/test";

/**
 * Waits until no finite animation has run for a short quiet period, so the page is checked as the
 * user sees it once it settles. One check is not enough:
 * content that renders when its data arrives starts its own fade-in after the first wait, and a
 * scan during a fade-in measures half-transparent text as a contrast failure. Timed with
 * performance.now(), which keeps running when a test freezes the page's clock.
 */
export async function waitForAnimations(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const running = () =>
      document.getAnimations().filter((animation) => {
        return animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity;
      });
    const deadline = performance.now() + 5_000;
    let quietSince = performance.now();
    while (performance.now() < deadline && performance.now() - quietSince < 300) {
      const active = running();
      if (active.length > 0) {
        await Promise.all(active.map((animation) => animation.finished.catch(() => undefined)));
        quietSince = performance.now();
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
}
