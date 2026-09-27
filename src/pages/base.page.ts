import type { Page } from "@playwright/test";

/**
 * A routable screen. Subclasses declare their path and locators, expose user
 * actions, and define what "loaded" means. Assertions about behavior stay in specs.
 */
export abstract class BasePage {
  protected abstract readonly path: string;

  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.expectLoaded();
  }

  abstract expectLoaded(): Promise<void>;
}
