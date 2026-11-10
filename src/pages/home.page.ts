import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class HomePage extends BasePage {
  protected readonly path = "/home";

  readonly heading = this.page.getByRole("heading", { level: 1 });
  readonly focusSection = this.page.getByRole("region", { name: "Your focus today" });
  /** Stage and priority bars, shown once the account has at least one application. */
  readonly chartBars = this.page.getByRole("link", {
    name: /^(Saved|Applied|Interviewing|Offer|Rejected|High|Medium|Low): \d+$/,
  });

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/home$/);
    await expect(this.focusSection).toBeVisible();
  }
}
