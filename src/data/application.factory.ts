import { randomUUID } from "node:crypto";

export interface NewApplication {
  company: string;
  title: string;
}

/** Unique per call, so parallel workers and reruns never collide on names. */
export function buildApplication(overrides: Partial<NewApplication> = {}): NewApplication {
  const suffix = randomUUID().slice(0, 8);
  return {
    company: `Smoke Co ${suffix}`,
    title: "QA Engineer",
    ...overrides,
  };
}
