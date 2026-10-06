import { env } from "@/config/env";
import { expect, test } from "@/fixtures/test";

test.describe("authentication", { tag: "@smoke" }, () => {
  test("user can log in and log out", async ({ loginPage, homePage, appShell }) => {
    await loginPage.goto();
    await loginPage.login(env.loginUserEmail, env.loginUserPassword);
    await homePage.expectLoaded();

    await appShell.logout();
    await loginPage.expectLoaded();
  });
});

test.describe("login redirect", () => {
  // A crafted login link must never send the user to another site after they sign in (open redirect).
  // Browsers drop tabs and line breaks from URLs, so "/<tab>/example.com" becomes "//example.com".
  test("next cannot point to another site", async ({ page, loginPage, baseURL }) => {
    test.fail(true, "Known issue: a tab, line feed or carriage return in next passes the redirect check");
    await page.route(
      (url) => url.hostname === "example.com",
      (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Another site</h1>" }),
    );

    await page.goto("/login?next=%2F%09%2Fexample.com");
    await loginPage.expectLoaded();
    await loginPage.login(env.loginUserEmail, env.loginUserPassword);

    await expect(page).not.toHaveURL(/\/login(\?|$)/);
    await expect(page).toHaveURL((url) => url.origin === new URL(baseURL ?? "").origin);
  });
});
