import type { APIRequestContext } from "@playwright/test";
import { ApplicationsEndpoint } from "@/api/endpoints/applications.endpoint";
import type { Application, ApplicationInput, Envelope } from "@/api/types";
import type { NewApplication } from "@/data/application.factory";

/**
 * Arranges and cleans up test data through the REST API, so specs do not
 * depend on seed data and leave nothing behind. Every id it creates or is
 * told about is deleted by deleteTracked().
 */
export class ApplicationsApi {
  private readonly tracked = new Set<string>();
  private readonly endpoint: ApplicationsEndpoint;

  constructor(request: APIRequestContext) {
    this.endpoint = new ApplicationsEndpoint(request);
  }

  async create(application: NewApplication & ApplicationInput): Promise<Application> {
    const response = await this.endpoint.create(application);
    if (response.status() !== 201) {
      throw new Error(`Create failed: ${response.status()} ${await response.text()}`);
    }
    const { data } = (await response.json()) as Envelope<Application>;
    this.track(data.id);
    return data;
  }

  track(id: string): void {
    this.tracked.add(id);
  }

  async delete(id: string): Promise<void> {
    const response = await this.endpoint.delete(id);
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
