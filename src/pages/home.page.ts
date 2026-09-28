import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class HomePage extends BasePage {
  protected readonly path = "/home";

  readonly heading = this.page.getByRole("heading", { level: 1 });
  readonly focusSection = this.page.getByRole("region", { name: "Your focus today" });

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/home$/);
    await expect(this.focusSection).toBeVisible();
  }
}
