import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  protected readonly path = "/login";

  readonly heading = this.page.getByRole("heading", { level: 1, name: /^Log in/ });
  readonly emailInput = this.page.getByRole("textbox", { name: "Email" });
  readonly passwordInput = this.page.getByRole("textbox", { name: "Password" });
  readonly submitButton = this.page.getByRole("button", { name: "Log in" });

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.heading).toBeVisible();
  }
}
