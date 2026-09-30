import type { Locator, Page } from "@playwright/test";

export class UpdateStageDialog {
  readonly root: Locator;
  readonly stageSelect: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole("dialog", { name: "Update stage" });
    this.stageSelect = this.root.getByRole("combobox", { name: "Stage" });
    this.saveButton = this.root.getByRole("button", { name: "Save stage" });
  }
}
