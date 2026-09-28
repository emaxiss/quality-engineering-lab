/**
 * The consumer under contract: a minimal typed client for the applications API,
 * the way a front end or integration would call it. Contract tests run it against
 * Pact's mock server, and the resulting contract is verified against the real API.
 */

export type Status = "SAVED" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN" | "ARCHIVED";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

/** Only the fields this consumer reads. The provider may return more. */
export interface Application {
  id: string;
  company: string;
  title: string;
  status: Status;
  priority: Priority;
  tags: string[];
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface NewApplication {
  company: string;
  title: string;
  status?: Status;
  priority?: Priority;
  tags?: string[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class ApplicationsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token?: string,
  ) {}

  async list(query: { page?: number; pageSize?: number } = {}): Promise<Page<Application>> {
    const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
    const body = await this.call<{ data: Application[]; meta: Omit<Page<Application>, "items"> }>(
      "GET",
      `/api/v1/opportunities?${params}`,
    );
    return { items: body.data, ...body.meta };
  }

  async get(id: string): Promise<Application> {
    return (await this.call<{ data: Application }>("GET", `/api/v1/opportunities/${id}`)).data;
  }

  async create(input: NewApplication): Promise<Application> {
    return (await this.call<{ data: Application }>("POST", "/api/v1/opportunities", input)).data;
  }

  async update(id: string, changes: Partial<NewApplication>): Promise<Application> {
    return (await this.call<{ data: Application }>("PATCH", `/api/v1/opportunities/${id}`, changes)).data;
  }

  async delete(id: string): Promise<void> {
    await this.call<void>("DELETE", `/api/v1/opportunities/${id}`);
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(new URL(path, this.baseUrl), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const { error } = (await response.json()) as { error: { code: string; message: string } };
      throw new ApiError(response.status, error.code, error.message);
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  }
}
