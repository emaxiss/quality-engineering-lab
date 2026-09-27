import type { APIRequestContext, APIResponse } from "@playwright/test";

export interface Session {
  user: { id: string; email: string };
  session: { accessToken: string; expiresAt: number };
}

export class AuthEndpoint {
  constructor(private readonly request: APIRequestContext) {}

  login(email: string, password: string): Promise<APIResponse> {
    return this.request.post("/api/v1/auth/login", { data: { email, password } });
  }

  logout(headers?: Record<string, string>): Promise<APIResponse> {
    return this.request.post("/api/v1/auth/logout", { headers });
  }
}

export const bearer = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });
