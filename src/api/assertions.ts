import { expect, type APIResponse } from "@playwright/test";
import { z } from "zod";
import { apiErrorSchema } from "@/api/schemas";
import type { ApiError } from "@/api/types";

/**
 * A response body for a failure message, with tokens and email addresses blanked out: the HTML
 * report is published, and a sign-in response carries both.
 */
export async function bodyForMessage(response: APIResponse): Promise<string> {
  return (await response.text())
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<token>")
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "<email>");
}

/** Asserts the status code. The body is quoted only when it differs, so passing steps stay short. */
async function expectStatus(response: APIResponse, status: number): Promise<void> {
  const actual = response.status();
  const message = actual === status ? undefined : `${response.url()} answered:\n${await bodyForMessage(response)}`;
  expect(actual, message).toBe(status);
}

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
  await expectStatus(response, status);
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
  await expectStatus(response, status);
  expect(response.headers()["content-type"]).toContain("application/json");
  return parseBody(response, schema);
}
