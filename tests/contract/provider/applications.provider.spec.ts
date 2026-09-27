import type { IncomingMessage, ServerResponse } from "node:http";
import { Verifier } from "@pact-foundation/pact";
import { PACT_FILE, PROVIDER, States } from "@/contracts/pact.config";
import { ProviderStates } from "@/contracts/provider-states";
import { env } from "@/config/env";
import { expect, test } from "@playwright/test";

test.describe("applications api contract (provider)", () => {
  test("the live api honors the consumer contract", async ({ playwright, baseURL }) => {
    test.setTimeout(120_000);

    const login = await playwright.request.newContext({ baseURL });
    const signIn = await login.post("/api/v1/auth/login", {
      data: { email: env.userEmail, password: env.userPassword },
    });
    expect(signIn.status(), await signIn.text()).toBe(200);
    const { data } = (await signIn.json()) as { data: { session: { accessToken: string } } };
    const token = data.session.accessToken;
    await login.dispose();

    const request = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const states = new ProviderStates(request);

    try {
      await states.removeAll();

      await new Verifier({
        provider: PROVIDER,
        providerBaseUrl: baseURL,
        pactUrls: [PACT_FILE],
        logLevel: "warn",
        stateHandlers: {
          [States.hasApplications]: async () => {
            await states.createApplication();
          },
          [States.applicationExists]: async () => states.createApplication(),
        },
        // The contract carries a placeholder token; swap in a real one. Requests without
        // a token stay without one, so the unauthorized interaction is verified as written.
        requestFilter: (req: IncomingMessage, _res: ServerResponse, next: () => void) => {
          if (req.headers.authorization) req.headers.authorization = `Bearer ${token}`;
          next();
        },
        afterEach: async () => {
          await states.removeAll();
        },
      }).verifyProvider();
    } finally {
      await states.removeAll();
      await request.dispose();
    }
  });
});
