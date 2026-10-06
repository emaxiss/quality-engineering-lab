import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LandingPage extends BasePage {
  protected readonly path = "/";

  readonly heading = this.page.getByRole("heading", { level: 1 });
  private readonly accountNav = this.page.getByRole("navigation", { name: "Account" });
  readonly loginLink = this.accountNav.getByRole("link", { name: "Log in" });
  readonly signupLink = this.accountNav.getByRole("link", { name: "Sign up" });
  readonly privacyLink = this.page.getByRole("contentinfo").getByRole("link", { name: "Privacy" });

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}
