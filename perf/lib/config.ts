/** Where the scripts run, and the account they sign in with. k6 reads these from the environment. */
export const BASE_URL = (__ENV.BASE_URL ?? "https://rolequeue.vercel.app").replace(/\/$/, "");
export const APPLICATIONS_PATH = __ENV.APPLICATIONS_API_PATH ?? "/api/v1/applications";

// Hosts where only the smoke profile may run: real users share them.
const PRODUCTION_HOSTS = ["rolequeue.vercel.app"];

// k6 has no URL global, so the host is read from the URL by hand.
export function isProduction(): boolean {
  const host = BASE_URL.replace(/^[a-z]+:\/\//i, "").split(/[/:?#]/)[0] ?? "";
  return PRODUCTION_HOSTS.includes(host.toLowerCase());
}

export function credentials(): { email: string; password: string } {
  const email = __ENV.E2E_USER_EMAIL;
  const password = __ENV.E2E_USER_PASSWORD;
  if (!email || !password) throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set");
  return { email, password };
}
