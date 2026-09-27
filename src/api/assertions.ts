import { expect, type APIResponse } from "@playwright/test";
import type { ApiError } from "@/api/types";

/** Asserts the status code and the error envelope, and returns the error for further checks. */
export async function expectApiError(response: APIResponse, status: number, code: string): Promise<ApiError["error"]> {
  expect(response.status(), await response.text()).toBe(status);
  const body = (await response.json()) as ApiError;
  expect(body.error).toMatchObject({ code, message: expect.any(String) });
  return body.error;
}

/** Asserts the status code and returns the parsed body. */
export async function expectJson<T>(response: APIResponse, status: number): Promise<T> {
  expect(response.status(), await response.text()).toBe(status);
  expect(response.headers()["content-type"]).toContain("application/json");
  return (await response.json()) as T;
}
