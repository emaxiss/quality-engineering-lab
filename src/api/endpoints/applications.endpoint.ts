import type { APIRequestContext, APIResponse } from "@playwright/test";
import type { ApplicationInput, ListQuery } from "@/api/types";

const BASE_PATH = "/api/v1/opportunities";

/** One method per HTTP call. Returns the raw response so specs can assert status codes. */
export class ApplicationsEndpoint {
  constructor(private readonly request: APIRequestContext) {}

  list(query: ListQuery = {}): Promise<APIResponse> {
    const params: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params[key] = Array.isArray(value) ? value.join(",") : value;
    }
    return this.request.get(BASE_PATH, { params });
  }

  get(id: string): Promise<APIResponse> {
    return this.request.get(`${BASE_PATH}/${id}`);
  }

  create(input: ApplicationInput): Promise<APIResponse> {
    return this.request.post(BASE_PATH, { data: input });
  }

  update(id: string, changes: ApplicationInput): Promise<APIResponse> {
    return this.request.patch(`${BASE_PATH}/${id}`, { data: changes });
  }

  delete(id: string): Promise<APIResponse> {
    return this.request.delete(`${BASE_PATH}/${id}`);
  }
}
