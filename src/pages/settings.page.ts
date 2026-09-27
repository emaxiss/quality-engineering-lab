import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class SettingsPage extends BasePage {
  protected readonly path = "/settings";

  readonly heading = this.page.getByRole("heading", { level: 1, name: "Settings" });
  readonly profileSection = this.page.getByRole("region", { name: "Profile" });
  readonly emailInput = this.profileSection.getByRole("textbox", { name: "Email" });

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/settings/);
    await expect(this.heading).toBeVisible();
  }
}
