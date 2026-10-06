import type { APIRequestContext, PlaywrightWorkerArgs } from "@playwright/test";
import { expectApiError, expectJson } from "@/api/assertions";
import { accountResponse, sessionResponse } from "@/api/schemas";
import { AccountEndpoint } from "@/api/endpoints/account.endpoint";
import { AuthEndpoint, bearer } from "@/api/endpoints/auth.endpoint";
import type { Session } from "@/api/types";
import { env } from "@/config/env";
import { expect, test } from "@/fixtures/test";

async function signIn(request: APIRequestContext): Promise<Session> {
  const response = await new AuthEndpoint(request).login(env.loginUserEmail, env.loginUserPassword);
  return (await expectJson(response, 200, sessionResponse)).data;
}

/** A context that authenticates with the bearer token only, no cookies. */
async function tokenContext(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string | undefined,
  session: Session,
): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL, extraHTTPHeaders: bearer(session.session.accessToken) });
}

/** Cookie attributes a session cookie needs. Secure only applies over HTTPS. */
function requiredCookieAttributes(baseURL: string | undefined): string[] {
  return baseURL?.startsWith("https:") ? ["httponly", "secure", "samesite=lax"] : ["httponly", "samesite=lax"];
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
      const account = await expectJson(await new AccountEndpoint(tokenOnly).get(), 200, accountResponse);
      expect(account.data.email).toBe(env.loginUserEmail);
    } finally {
      await tokenOnly.dispose();
    }

    // The same token, altered: a changed signature, or claims for another user under the real signature.
    const [header, payload, signature] = session.session.accessToken.split(".");
    const claims = JSON.parse(Buffer.from(payload ?? "", "base64url").toString()) as Record<string, unknown>;
    const otherUser = Buffer.from(JSON.stringify({ ...claims, sub: "00000000-0000-4000-8000-000000000000" }));
    const forged = {
      "changed signature": `${header}.${payload}.${signature?.slice(0, -4)}AAAA`,
      "changed subject": `${header}.${otherUser.toString("base64url")}.${signature}`,
    };
    for (const [label, token] of Object.entries(forged)) {
      const context = await playwright.request.newContext({ baseURL, extraHTTPHeaders: bearer(token) });
      try {
        await test.step(label, async () => {
          await expectApiError(await new AccountEndpoint(context).get(), 401, "UNAUTHORIZED");
        });
      } finally {
        await context.dispose();
      }
    }
  });

  test("the session cookie is out of reach of page scripts and plain HTTP", async ({ request, baseURL }) => {
    test.fail(true, "Known issue: the session cookie is set without HttpOnly and Secure");

    const response = await new AuthEndpoint(request).login(env.loginUserEmail, env.loginUserPassword);
    expect(response.status()).toBe(200);
    const cookies = response.headersArray().filter((header) => header.name.toLowerCase() === "set-cookie");
    expect(cookies.length, "the login sets a session cookie").toBeGreaterThan(0);

    for (const { value } of cookies) {
      const attributes = value.split(";").map((part) => part.trim().toLowerCase());
      expect(attributes, value.split("=")[0]).toEqual(expect.arrayContaining(requiredCookieAttributes(baseURL)));
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
