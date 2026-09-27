import type { APIRequestContext, PlaywrightWorkerArgs } from "@playwright/test";
import { expectJson } from "@/api/assertions";
import { AuthEndpoint, bearer, type Session } from "@/api/endpoints/auth.endpoint";
import type { Envelope } from "@/api/types";

/** Signs in through the API and returns a context that authenticates with the bearer token only. */
export async function signedInContext(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string | undefined,
  email: string,
  password: string,
): Promise<APIRequestContext> {
  const anonymous = await playwright.request.newContext({ baseURL });
  try {
    const { data } = await expectJson<Envelope<Session>>(await new AuthEndpoint(anonymous).login(email, password), 200);
    return await playwright.request.newContext({ baseURL, extraHTTPHeaders: bearer(data.session.accessToken) });
  } finally {
    await anonymous.dispose();
  }
}
