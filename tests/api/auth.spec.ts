import type { APIRequestContext, PlaywrightWorkerArgs } from "@playwright/test";
import { expectApiError, expectJson } from "@/api/assertions";
import { AccountEndpoint } from "@/api/endpoints/account.endpoint";
import { AuthEndpoint, bearer, type Session } from "@/api/endpoints/auth.endpoint";
import type { Envelope } from "@/api/types";
import { env } from "@/config/env";
import { expect, test } from "@/fixtures/test";

async function signIn(request: APIRequestContext): Promise<Session> {
  const response = await new AuthEndpoint(request).login(env.loginUserEmail, env.loginUserPassword);
  return (await expectJson<Envelope<Session>>(response, 200)).data;
}

/** A context that authenticates with the bearer token only, no cookies. */
async function tokenContext(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string | undefined,
  session: Session,
): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL, extraHTTPHeaders: bearer(session.session.accessToken) });
}

test.describe("auth api", () => {
  // Both tests sign in to the same account, and logging out ends every session of it, including
  // the other test's token. Run them one after the other, never in parallel.
  test.describe.configure({ mode: "default" });

  test("login issues a bearer token that authorizes requests", async ({ playwright, request, baseURL }) => {
    const session = await signIn(request);
    expect(session.user.email).toBe(env.loginUserEmail);
    expect(session.session.expiresAt * 1000).toBeGreaterThan(Date.now());

    const tokenOnly = await tokenContext(playwright, baseURL, session);
    try {
      const account = await expectJson<Envelope<{ email: string }>>(await new AccountEndpoint(tokenOnly).get(), 200);
      expect(account.data.email).toBe(env.loginUserEmail);
    } finally {
      await tokenOnly.dispose();
    }
  });

  test("logout with a bearer token ends the session", async ({ playwright, request, baseURL }) => {
    const tokenOnly = await tokenContext(playwright, baseURL, await signIn(request));
    try {
      expect((await new AuthEndpoint(tokenOnly).logout()).status()).toBe(204);
      await expectApiError(await new AccountEndpoint(tokenOnly).get(), 401, "UNAUTHORIZED");
    } finally {
      await tokenOnly.dispose();
    }
  });
});
