import { MatchersV3, PactV4 } from "@pact-foundation/pact";
import { ApiError, ApplicationsClient } from "@/contracts/applications.client";
import { CONSUMER, CONTRACT_COMPANY, PACT_DIR, PROVIDER, States } from "@/contracts/pact.config";
import { expect, test } from "@playwright/test";

const { atLeastLike, eachLike, fromProviderState, integer, regex, string, uuid } = MatchersV3;

const EXAMPLE_ID = "5f0c1a52-8c7e-4b5f-9a3e-2d1f6b7c8a90";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const TOKEN = "contract-test-token";

const timestamp = regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, "2026-09-27T03:28:38.049Z");
const authorization = { Authorization: regex(/^Bearer .+$/, `Bearer ${TOKEN}`) };
const applicationPath = fromProviderState("/api/v1/opportunities/${id}", `/api/v1/opportunities/${EXAMPLE_ID}`);

/** Shape of an application as this consumer reads it. */
const application = {
  id: uuid(EXAMPLE_ID),
  company: string(CONTRACT_COMPANY),
  title: string("QA Engineer"),
  status: regex(/^(SAVED|APPLIED|INTERVIEW|OFFER|REJECTED|WITHDRAWN|ARCHIVED)$/, "SAVED"),
  priority: regex(/^P[0-2]$/, "P1"),
  // Any number of tags, including none.
  tags: atLeastLike(string("contract"), 0, 1),
  createdAt: timestamp,
  updatedAt: timestamp,
};

const errorBody = (code: string) => ({ error: { code, message: string("Human readable message") } });

const pact = new PactV4({ consumer: CONSUMER, provider: PROVIDER, dir: PACT_DIR, logLevel: "warn" });

// One file, run serially: every interaction is written to the same contract file.
test.describe.configure({ mode: "serial" });

test.describe("applications api contract (consumer)", () => {
  test("lists applications one page at a time", async () => {
    await pact
      .addInteraction()
      .given(States.hasApplications)
      .uponReceiving("a request for the first page of applications")
      .withRequest("GET", "/api/v1/opportunities", (request) =>
        request.query({ page: "1", pageSize: "10" }).headers(authorization),
      )
      .willRespondWith(200, (response) =>
        response.jsonBody({
          data: eachLike(application),
          meta: { page: integer(1), pageSize: integer(10), total: integer(1), totalPages: integer(1) },
        }),
      )
      .executeTest(async (mockServer) => {
        const page = await new ApplicationsClient(mockServer.url, TOKEN).list({ page: 1, pageSize: 10 });

        expect(page.items.length).toBeGreaterThan(0);
        expect(page).toMatchObject({ page: 1, pageSize: 10 });
      });
  });

  test("reads one application", async () => {
    await pact
      .addInteraction()
      .given(States.applicationExists)
      .uponReceiving("a request for an existing application")
      .withRequest("GET", applicationPath, (request) => request.headers(authorization))
      .willRespondWith(200, (response) => response.jsonBody({ data: application }))
      .executeTest(async (mockServer) => {
        const found = await new ApplicationsClient(mockServer.url, TOKEN).get(EXAMPLE_ID);

        expect(found).toMatchObject({ id: EXAMPLE_ID, company: CONTRACT_COMPANY, status: "SAVED" });
      });
  });

  test("creates an application", async () => {
    const input = { company: CONTRACT_COMPANY, title: "QA Engineer", tags: ["contract"] };

    await pact
      .addInteraction()
      .uponReceiving("a request to create an application")
      .withRequest("POST", "/api/v1/opportunities", (request) => request.headers(authorization).jsonBody(input))
      .willRespondWith(201, (response) =>
        response.jsonBody({ data: { ...application, company: CONTRACT_COMPANY, status: "SAVED" } }),
      )
      .executeTest(async (mockServer) => {
        const created = await new ApplicationsClient(mockServer.url, TOKEN).create(input);

        expect(created).toMatchObject({ company: CONTRACT_COMPANY, status: "SAVED" });
      });
  });

  test("moves an application to applied", async () => {
    await pact
      .addInteraction()
      .given(States.applicationExists)
      .uponReceiving("a request to mark an application as applied")
      .withRequest("PATCH", applicationPath, (request) => request.headers(authorization).jsonBody({ status: "APPLIED" }))
      .willRespondWith(200, (response) =>
        response.jsonBody({ data: { ...application, status: "APPLIED", appliedAt: timestamp } }),
      )
      .executeTest(async (mockServer) => {
        const updated = await new ApplicationsClient(mockServer.url, TOKEN).update(EXAMPLE_ID, { status: "APPLIED" });

        expect(updated.status).toBe("APPLIED");
        expect(updated.appliedAt).toEqual(expect.any(String));
      });
  });

  test("deletes an application", async () => {
    await pact
      .addInteraction()
      .given(States.applicationExists)
      .uponReceiving("a request to delete an application")
      .withRequest("DELETE", applicationPath, (request) => request.headers(authorization))
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        await expect(new ApplicationsClient(mockServer.url, TOKEN).delete(EXAMPLE_ID)).resolves.toBeUndefined();
      });
  });

  test("reports an unknown application as not found", async () => {
    await pact
      .addInteraction()
      .uponReceiving("a request for an application that does not exist")
      .withRequest("GET", `/api/v1/opportunities/${UNKNOWN_ID}`, (request) => request.headers(authorization))
      .willRespondWith(404, (response) => response.jsonBody(errorBody("NOT_FOUND")))
      .executeTest(async (mockServer) => {
        const error = await new ApplicationsClient(mockServer.url, TOKEN).get(UNKNOWN_ID).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 404, code: "NOT_FOUND" });
      });
  });

  test("reports a create without a company as a validation error", async () => {
    await pact
      .addInteraction()
      .uponReceiving("a request to create an application without a company")
      .withRequest("POST", "/api/v1/opportunities", (request) =>
        request.headers(authorization).jsonBody({ title: "QA Engineer" }),
      )
      .willRespondWith(400, (response) => response.jsonBody(errorBody("VALIDATION_ERROR")))
      .executeTest(async (mockServer) => {
        const client = new ApplicationsClient(mockServer.url, TOKEN);
        const error = await client.create({ title: "QA Engineer" } as never).catch((e: unknown) => e);

        expect(error).toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
      });
  });

  test("reports a request without a token as unauthorized", async () => {
    await pact
      .addInteraction()
      .uponReceiving("a request for applications without a token")
      .withRequest("GET", "/api/v1/opportunities", (request) => request.query({ page: "1", pageSize: "10" }))
      .willRespondWith(401, (response) => response.jsonBody(errorBody("UNAUTHORIZED")))
      .executeTest(async (mockServer) => {
        const error = await new ApplicationsClient(mockServer.url)
          .list({ page: 1, pageSize: 10 })
          .catch((e: unknown) => e);

        expect(error).toMatchObject({ status: 401, code: "UNAUTHORIZED" });
      });
  });
});
