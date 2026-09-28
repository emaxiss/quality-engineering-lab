import type { APIRequestContext, PlaywrightWorkerArgs } from "@playwright/test";
import { expectJson } from "@/api/assertions";
import { sessionResponse } from "@/api/schemas";
import { AuthEndpoint, bearer } from "@/api/endpoints/auth.endpoint";

/** Signs in through the API and returns a context that authenticates with the bearer token only. */
export async function signedInContext(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string | undefined,
  email: string,
  password: string,
): Promise<APIRequestContext> {
  const anonymous = await playwright.request.newContext({ baseURL });
  try {
    const { data } = await expectJson(await new AuthEndpoint(anonymous).login(email, password), 200, sessionResponse);
    return await playwright.request.newContext({ baseURL, extraHTTPHeaders: bearer(data.session.accessToken) });
  } finally {
    await anonymous.dispose();
  }
}
