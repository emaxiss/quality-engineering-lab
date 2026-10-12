import type { Locator, Page } from "@playwright/test";
import { EditorDialog } from "./editor.dialog";
import { UpdateStageDialog } from "./update-stage.dialog";

export class ApplicationDetailsDialog {
  readonly root: Locator;
  readonly header: Locator;
  readonly title: Locator;
  readonly closeButton: Locator;
  readonly moreActionsButton: Locator;
  readonly archiveButton: Locator;
  readonly deleteButton: Locator;
  readonly markAppliedButton: Locator;
  readonly reopenButton: Locator;
  readonly editDetailsButton: Locator;
  readonly editNotesButton: Locator;
  readonly updateStageButton: Locator;
  readonly backButton: Locator;
  /** Confirmation shown after a save, such as "Saved." */
  readonly message: Locator;

  readonly updateStage: UpdateStageDialog;
  readonly editDetails: EditorDialog;
  readonly notes: EditorDialog;
  readonly markApplied: EditorDialog;
  readonly reopen: EditorDialog;
  readonly confirmDelete: EditorDialog;

  constructor(page: Page) {
    this.root = page.getByRole("dialog", { name: "Application details" });
    this.header = this.root.getByRole("banner");
    this.title = this.header.getByRole("heading", { level: 1 });
    this.closeButton = this.root.getByRole("button", { name: "Close detail panel" });
    this.moreActionsButton = this.root.getByRole("button", { name: "More application actions" });
    this.archiveButton = this.root.getByRole("button", { name: "Archive application" });
    this.deleteButton = this.root.getByRole("button", { name: /^Delete application/ });
    this.markAppliedButton = this.root.getByRole("button", { name: "Mark applied" });
    this.reopenButton = this.root.getByRole("button", { name: "Reopen application" });
    this.editDetailsButton = this.root.getByRole("button", { name: "Edit details" });
    this.editNotesButton = this.root.getByRole("button", { name: "Edit notes" });
    this.updateStageButton = this.root.getByRole("button", { name: "Update stage" });
    this.backButton = this.root.getByRole("button", { name: "Back to applications" });
    this.message = this.root.getByRole("status");

    this.updateStage = new UpdateStageDialog(page);
    this.editDetails = new EditorDialog(page, "Edit application details", "Save details");
    this.notes = new EditorDialog(page, "Notes", "Save notes");
    this.markApplied = new EditorDialog(page, "Record your application", "Confirm applied");
    this.reopen = new EditorDialog(page, "Reopen application", "Reopen as saved");
    this.confirmDelete = new EditorDialog(page, "Delete application", "Delete application");
  }

  /** Value next to a label in the facts list, such as "Location" or "Priority". */
  fact(label: string): Locator {
    return this.root
      .getByRole("term")
      .filter({ hasText: new RegExp(`^${label}$`) })
      .locator("xpath=following-sibling::dd[1]");
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
