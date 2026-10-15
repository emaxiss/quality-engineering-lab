import type { Page, Route } from "@playwright/test";
import type { Application } from "@/api/types";
import { account, applications, NOW, summary } from "./data";

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

function list(url: URL) {
  const statuses = url.searchParams.get("status")?.split(",");
  const q = url.searchParams.get("q")?.toLowerCase();
  const priority = url.searchParams.get("priority");
  const sort = (url.searchParams.get("sort") ?? "updatedAt") as keyof Application;
  const desc = url.searchParams.get("order") !== "asc";
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 25);

  const matches = applications
    .filter((a) => !statuses || statuses.includes(a.status))
    .filter((a) => !priority || a.priority === priority)
    .filter((a) => !q || `${a.company} ${a.title} ${a.tags.join(" ")}`.toLowerCase().includes(q))
    .sort((a, b) => String(a[sort] ?? "").localeCompare(String(b[sort] ?? "")) * (desc ? -1 : 1));
  return {
    data: matches.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total: matches.length, totalPages: Math.ceil(matches.length / pageSize) },
  };
}

/**
 * Serves the signed-in pages from fixed, fictional data and freezes the clock, so a screenshot
 * changes only when the interface does. Writes are refused: a visual test never changes the account.
 */
export async function stubApi(page: Page): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await page.route(
    (url) => url.pathname.startsWith("/api/v1/"),
    async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace("/api/v1", "");
      if (route.request().method() !== "GET")
        return json(route, { error: { code: "READ_ONLY", message: "Visual tests do not write" } }, 405);
      if (path === "/account") return json(route, { data: account });
      if (path === "/dashboard/summary") return json(route, { data: summary });
      if (path === "/applications") return json(route, list(url));
      const one = applications.find((a) => path === `/applications/${a.id}`);
      if (one) return json(route, { data: one });
      return json(route, { error: { code: "NOT_FOUND", message: `No stub for ${path}` } }, 404);
    },
  );
}
