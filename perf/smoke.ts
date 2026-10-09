// Smoke profile: a light, steady load that is safe against production. It proves the main reads
// stay fast under a little concurrency, and fails the run when they do not.
import type { Options } from "k6/options";
import { cleanUp, seed, signIn, type RunData } from "./lib/api.ts";
import { browse } from "./lib/journeys.ts";

export const options: Options = {
  scenarios: {
    browse: { executor: "constant-vus", vus: 2, duration: "30s" },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    "http_req_duration{name:list}": ["p(95)<800"],
    "http_req_duration{name:search}": ["p(95)<800"],
    "http_req_duration{name:read}": ["p(95)<600"],
    "http_req_duration{name:dashboard}": ["p(95)<800"],
  },
};

export function setup(): RunData {
  const token = signIn();
  cleanUp(token);
  return seed(token, 5);
}

export default function (data: RunData): void {
  browse(data);
}

export function teardown(data: RunData): void {
  cleanUp(data.token);
}
