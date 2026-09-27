import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class DashboardPage extends BasePage {
  protected readonly path = "/dashboard";

  readonly heading = this.page.getByRole("heading", { level: 1 });
  readonly focusSection = this.page.getByRole("region", { name: "Your focus today" });

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard$/);
    await expect(this.focusSection).toBeVisible();
  }
}
