import type { APIRequestContext, APIResponse } from "@playwright/test";

export type ExportFormat = "json" | "csv";

export class AccountEndpoint {
  constructor(private readonly request: APIRequestContext) {}

  get(): Promise<APIResponse> {
    return this.request.get("/api/v1/account");
  }

  export(format: ExportFormat): Promise<APIResponse> {
    return this.request.get("/api/v1/account/export", { params: { format } });
  }
}
