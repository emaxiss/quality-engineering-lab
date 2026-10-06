import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class PrivacyPage extends BasePage {
  protected readonly path = "/privacy";

  readonly heading = this.page.getByRole("heading", { level: 1 });
  readonly sections = this.page.getByRole("main").getByRole("heading", { level: 2 });

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/privacy$/);
    await expect(this.heading).toBeVisible();
  }
}
