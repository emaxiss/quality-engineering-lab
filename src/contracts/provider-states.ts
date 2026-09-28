import type { APIRequestContext } from "@playwright/test";
import { CONTRACT_COMPANY } from "@/contracts/pact.config";

const BASE_PATH = "/api/v1/applications";

/**
 * Puts the live provider into the states the contract names, through its public API.
 * Every record it creates carries CONTRACT_COMPANY, so removeAll() can clean up
 * anything a verification run created, including records made by create interactions.
 */
export class ProviderStates {
  constructor(private readonly request: APIRequestContext) {}

  async createApplication(): Promise<{ id: string }> {
    const response = await this.request.post(BASE_PATH, {
      data: { company: CONTRACT_COMPANY, title: "QA Engineer", tags: ["contract"] },
    });
    if (response.status() !== 201) {
      throw new Error(`State setup failed: ${response.status()} ${await response.text()}`);
    }
    const { data } = (await response.json()) as { data: { id: string } };
    return { id: data.id };
  }

  async removeAll(): Promise<void> {
    const response = await this.request.get(BASE_PATH, { params: { q: CONTRACT_COMPANY, pageSize: 100 } });
    const { data } = (await response.json()) as { data: { id: string; company: string }[] };
    for (const { id, company } of data) {
      if (company === CONTRACT_COMPANY) await this.request.delete(`${BASE_PATH}/${id}`);
    }
  }
}
