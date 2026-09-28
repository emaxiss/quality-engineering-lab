import type { APIRequestContext, APIResponse } from "@playwright/test";
import type { ApplicationInput, ListQuery } from "@/api/types";
import { env } from "@/config/env";

/** One method per HTTP call. Returns the raw response so specs can assert status codes. */
export class ApplicationsEndpoint {
  private readonly basePath = env.applicationsApiPath;

  constructor(private readonly request: APIRequestContext) {}

  list(query: ListQuery = {}): Promise<APIResponse> {
    const params: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(query) as [string, ListQuery[keyof ListQuery]][]) {
      if (value !== undefined) params[key] = Array.isArray(value) ? value.join(",") : value;
    }
    return this.request.get(this.basePath, { params });
  }

  get(id: string): Promise<APIResponse> {
    return this.request.get(`${this.basePath}/${id}`);
  }

  create(input: ApplicationInput): Promise<APIResponse> {
    return this.request.post(this.basePath, { data: input });
  }

  update(id: string, changes: ApplicationInput): Promise<APIResponse> {
    return this.request.patch(`${this.basePath}/${id}`, { data: changes });
  }

  delete(id: string): Promise<APIResponse> {
    return this.request.delete(`${this.basePath}/${id}`);
  }
}
