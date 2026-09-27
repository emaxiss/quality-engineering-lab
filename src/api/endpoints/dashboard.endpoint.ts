import type { APIRequestContext, APIResponse } from "@playwright/test";

export class DashboardEndpoint {
  constructor(private readonly request: APIRequestContext) {}

  summary(): Promise<APIResponse> {
    return this.request.get("/api/v1/dashboard/summary");
  }
}
