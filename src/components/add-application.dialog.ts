import type { Locator, Page } from "@playwright/test";
import type { NewApplication } from "@/data/application.factory";

export class AddApplicationDialog {
  readonly root: Locator;
  readonly companyInput: Locator;
  readonly titleInput: Locator;
  readonly submitButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole("dialog", { name: "Add application" });
    this.companyInput = this.root.getByRole("textbox", { name: /^Company/ });
    this.titleInput = this.root.getByRole("textbox", { name: /^Position title/ });
    this.submitButton = this.root.getByRole("button", { name: "Add application" });
    this.closeButton = this.root.getByRole("button", { name: "Close dialog" });
  }

  async fill(application: NewApplication): Promise<void> {
    await this.companyInput.fill(application.company);
    await this.titleInput.fill(application.title);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
