import type { Locator, Page } from "@playwright/test";

export class ApplicationDetailsDialog {
  readonly root: Locator;
  readonly header: Locator;
  readonly title: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole("dialog", { name: "Application details" });
    this.header = this.root.getByRole("banner");
    this.title = this.header.getByRole("heading", { level: 1 });
    this.closeButton = this.root.getByRole("button", { name: "Close detail panel" });
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
