import { expect, type Locator } from "@playwright/test";
import { AddApplicationDialog } from "@/components/add-application.dialog";
import { ApplicationDetailsDialog } from "@/components/application-details.dialog";
import { BasePage } from "./base.page";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type ApplicationsView = "Board" | "List";

export class ApplicationsPage extends BasePage {
  protected readonly path = "/applications";

  readonly heading = this.page.getByRole("heading", { level: 1, name: "Applications" });
  readonly addButton = this.page.getByRole("main").getByRole("button", { name: "Add application", exact: true });
  readonly board = this.page.getByRole("region", { name: "Application stages" });
  readonly table = this.page.getByRole("region", { name: "Applications table" });
  private readonly viewToggle = this.page.getByRole("group", { name: "Applications view" });

  readonly addDialog = new AddApplicationDialog(this.page);
  readonly details = new ApplicationDetailsDialog(this.page);

  viewButton(view: ApplicationsView): Locator {
    return this.viewToggle.getByRole("button", { name: view });
  }

  async switchTo(view: ApplicationsView): Promise<void> {
    await this.viewButton(view).click();
  }

  stage(name: string): Locator {
    return this.board.getByRole("region", { name: `${name} stage` });
  }

  /** Board card for a company. Card names start with "Open <company> <title>". */
  card(company: string): Locator {
    return this.board.getByRole("button", { name: new RegExp(`^Open ${escapeRegExp(company)}\\b`) });
  }

  /** Column header in the list view. Sortable headers hold a button with the column name. */
  columnHeader(name: string): Locator {
    return this.table.getByRole("columnheader", { name: new RegExp(`^${escapeRegExp(name)}`) });
  }

  sortButton(column: string): Locator {
    return this.columnHeader(column).getByRole("button");
  }

  async openAddDialog(): Promise<AddApplicationDialog> {
    await this.addButton.click();
    return this.addDialog;
  }

  /**
   * Opens the Add dialog with Enter on the focused Add button. Keys pressed before the page
   * is interactive do nothing (the button needs its script), so this presses again until
   * the dialog opens, and never presses while it is open.
   */
  async openAddDialogWithKeyboard(): Promise<AddApplicationDialog> {
    await expect(async () => {
      if (!(await this.addDialog.root.isVisible())) {
        await this.addButton.focus();
        await this.page.keyboard.press("Enter");
      }
      await expect(this.addDialog.root).toBeVisible({ timeout: 1_000 });
    }).toPass();
    return this.addDialog;
  }

  /** Id of the application whose details panel is open, read from the URL. */
  openApplicationId(): string {
    const id = new URL(this.page.url()).pathname.match(/^\/applications\/([^/]+)$/)?.[1];
    if (!id) throw new Error(`No application is open at ${this.page.url()}`);
    return id;
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/applications/);
    await expect(this.heading).toBeVisible();
  }
}
