import type { APIRequestContext } from "@playwright/test";
import type { NewApplication } from "@/data/application.factory";

const BASE_PATH = "/api/v1/opportunities";

/**
 * Arranges and cleans up test data through the REST API, so UI specs do not
 * depend on seed data and leave nothing behind. Every id it creates or is
 * told about is deleted by deleteTracked().
 */
export class ApplicationsApi {
  private readonly tracked = new Set<string>();

  constructor(private readonly request: APIRequestContext) {}

  async create(application: NewApplication): Promise<string> {
    const response = await this.request.post(BASE_PATH, { data: application });
    if (response.status() !== 201) {
      throw new Error(`Create failed: ${response.status()} ${await response.text()}`);
    }
    const { data } = (await response.json()) as { data: { id: string } };
    this.track(data.id);
    return data.id;
  }

  track(id: string): void {
    this.tracked.add(id);
  }

  async delete(id: string): Promise<void> {
    const response = await this.request.delete(`${BASE_PATH}/${id}`);
    // 404 means it is already gone, which is the outcome cleanup wants.
    if (response.status() !== 204 && response.status() !== 404) {
      throw new Error(`Delete ${id} failed: ${response.status()} ${await response.text()}`);
    }
  }

  async deleteTracked(): Promise<void> {
    for (const id of this.tracked) await this.delete(id);
    this.tracked.clear();
  }
}
