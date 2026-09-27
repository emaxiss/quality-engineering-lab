import type { Locator, Page } from "@playwright/test";

export type Section = "Home" | "Applications" | "Settings";

/** Signed-in chrome shared by every app page: primary navigation and logout. */
export class AppShell {
  readonly navigation: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.navigation = page.getByRole("navigation", { name: "Primary navigation" });
    this.logoutButton = page.getByRole("button", { name: "Logout" });
  }

  link(section: Section): Locator {
    return this.navigation.getByRole("link", { name: section, exact: true });
  }

  async goTo(section: Section): Promise<void> {
    await this.link(section).click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
