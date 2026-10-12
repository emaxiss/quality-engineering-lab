import type { Locator, Page } from "@playwright/test";

/** One of the small forms that open over the details panel: edit details, notes, applied, reopen, delete. */
export class EditorDialog {
  readonly root: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page, title: string, saveLabel: string) {
    this.root = page.getByRole("dialog", { name: title, exact: true });
    this.saveButton = this.root.getByRole("button", { name: saveLabel, exact: true });
    this.cancelButton = this.root.getByRole("button", { name: "Cancel", exact: true });
  }

  field(label: string): Locator {
    return this.root.getByLabel(label, { exact: true });
  }
}
