import { expect, type APIResponse } from "@playwright/test";
import { z } from "zod";
import { apiErrorSchema } from "@/api/schemas";
import type { ApiError } from "@/api/types";

/** Validates a response body against its schema and returns the parsed value. */
async function parseBody<T extends z.ZodType>(response: APIResponse, schema: T): Promise<z.output<T>> {
  const result = schema.safeParse(await response.json());
  if (!result.success) {
    throw new Error(
      `${response.url()} returned a body that does not match its schema:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

/** Asserts the status code and the error envelope, and returns the error for further checks. */
export async function expectApiError(response: APIResponse, status: number, code: string): Promise<ApiError["error"]> {
  expect(response.status(), await response.text()).toBe(status);
  const { error } = await parseBody(response, apiErrorSchema);
  expect(error.code).toBe(code);
  return error;
}

/** Asserts the status code and the content type, and returns the body validated against `schema`. */
export async function expectJson<T extends z.ZodType>(
  response: APIResponse,
  status: number,
  schema: T,
): Promise<z.output<T>> {
  expect(response.status(), await response.text()).toBe(status);
  expect(response.headers()["content-type"]).toContain("application/json");
  return parseBody(response, schema);
}
