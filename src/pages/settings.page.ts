import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class SettingsPage extends BasePage {
  protected readonly path = "/settings";

  readonly heading = this.page.getByRole("heading", { level: 1, name: "Settings" });

  readonly profileSection = this.page.getByRole("region", { name: "Profile" });
  readonly displayNameInput = this.profileSection.getByRole("textbox", { name: "Display name" });
  readonly emailInput = this.profileSection.getByRole("textbox", { name: "Email" });
  readonly saveProfileButton = this.profileSection.getByRole("button", { name: "Save profile" });
  readonly profileMessage = this.profileSection.getByRole("status");

  readonly passwordSection = this.page.getByRole("region", { name: "Password" });
  readonly currentPasswordInput = this.passwordSection.getByLabel("Current password", { exact: true });
  readonly newPasswordInput = this.passwordSection.getByLabel("New password", { exact: true });
  readonly confirmPasswordInput = this.passwordSection.getByLabel("Confirm new password", { exact: true });
  readonly updatePasswordButton = this.passwordSection.getByRole("button", { name: "Update password" });

  readonly dataSection = this.page.getByRole("region", { name: "Your data" });
  readonly downloadJsonLink = this.dataSection.getByRole("link", { name: "Download JSON" });
  readonly downloadCsvLink = this.dataSection.getByRole("link", { name: "Download CSV" });

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/settings/);
    await expect(this.heading).toBeVisible();
  }
}
