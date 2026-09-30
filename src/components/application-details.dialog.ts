import type { Locator, Page } from "@playwright/test";
import { UpdateStageDialog } from "./update-stage.dialog";

export class ApplicationDetailsDialog {
  readonly root: Locator;
  readonly header: Locator;
  readonly title: Locator;
  readonly closeButton: Locator;
  readonly updateStageButton: Locator;
  readonly updateStage: UpdateStageDialog;

  constructor(page: Page) {
    this.root = page.getByRole("dialog", { name: "Application details" });
    this.header = this.root.getByRole("banner");
    this.title = this.header.getByRole("heading", { level: 1 });
    this.closeButton = this.root.getByRole("button", { name: "Close detail panel" });
    this.updateStageButton = this.root.getByRole("button", { name: "Update stage" });
    this.updateStage = new UpdateStageDialog(page);
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
