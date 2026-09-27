import path from "node:path";

export const CONSUMER = "quality-engineering-lab";
export const PROVIDER = "applications-api";
export const PACT_DIR = path.resolve("pacts");
export const PACT_FILE = path.join(PACT_DIR, `${CONSUMER}-${PROVIDER}.json`);

/** Provider states shared by the consumer tests and the provider verification. */
export const States = {
  hasApplications: "the user has applications",
  applicationExists: "an application exists",
} as const;
