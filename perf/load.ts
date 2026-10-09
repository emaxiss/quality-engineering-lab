// Load profile: ramps to 20 virtual users reading and writing, for a non-production deployment.
// It refuses to run against production, where real users share the same server and database.
import exec from "k6/execution";
import type { Options } from "k6/options";
import { cleanUp, seed, signIn, type RunData } from "./lib/api.ts";
import { isProduction } from "./lib/config.ts";
import { browse, edit } from "./lib/journeys.ts";

export const options: Options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 15 },
        { duration: "1m", target: 15 },
        { duration: "15s", target: 0 },
      ],
      exec: "browsing",
    },
    edit: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 5 },
        { duration: "15s", target: 0 },
      ],
      exec: "editing",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    "http_req_duration{name:list}": ["p(95)<1000"],
    "http_req_duration{name:search}": ["p(95)<1000"],
    "http_req_duration{name:read}": ["p(95)<800"],
    "http_req_duration{name:dashboard}": ["p(95)<1000"],
    "http_req_duration{name:create}": ["p(95)<1000"],
    "http_req_duration{name:update}": ["p(95)<1000"],
    "http_req_duration{name:delete}": ["p(95)<1000"],
  },
};

export function setup(): RunData {
  if (isProduction())
    exec.test.abort("The load profile never runs against production. Set BASE_URL to a non-production deployment.");
  const token = signIn();
  cleanUp(token);
  return seed(token, 20);
}

export function browsing(data: RunData): void {
  browse(data);
}

export function editing(data: RunData): void {
  edit(data);
}

export function teardown(data: RunData): void {
  cleanUp(data.token);
}
