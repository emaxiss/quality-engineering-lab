import { AccountEndpoint } from "@/api/endpoints/account.endpoint";
import { expectApiError } from "@/api/assertions";
import { env } from "@/config/env";
import { expect, test } from "@/fixtures/test";

test.describe("authentication", { tag: "@smoke" }, () => {
  test("user can log in and log out", async ({ page, browser, playwright, baseURL, loginPage, homePage, appShell }) => {
    await loginPage.goto();
    await loginPage.login(env.loginUserEmail, env.loginUserPassword);
    await homePage.expectLoaded();
    await appShell.goTo("Settings");
    await expect(page).toHaveURL(/\/settings/);
    // A copy of the session as it was before logout, the way a stolen cookie would be. Held in
    // memory only: the value is a live session and must never reach a log or the report.
    const copiedSession = await page.context().storageState();

    await appShell.logout();
    await loginPage.expectLoaded();

    await test.step("Back does not bring the signed-in pages back", async () => {
      await page.goBack();
      await loginPage.expectLoaded();
      await expect(appShell.logoutButton).toBeHidden();
    });

    await test.step("the copied session cookie no longer opens the app", async () => {
      const replayed = await browser.newContext({ baseURL, storageState: copiedSession });
      try {
        const replayedPage = await replayed.newPage();
        await replayedPage.goto("/settings");
        await expect(replayedPage).toHaveURL(/\/login/);
      } finally {
        await replayed.close();
      }
    });

    await test.step("the copied session cookie no longer opens the API", async () => {
      const replayed = await playwright.request.newContext({ baseURL, storageState: copiedSession });
      try {
        await expectApiError(await new AccountEndpoint(replayed).get(), 401, "UNAUTHORIZED");
      } finally {
        await replayed.dispose();
      }
    });
  });
});

test.describe("login redirect", () => {
  // A crafted login link must never send the user to another site after they sign in (open redirect).
  // Browsers drop tabs and line breaks from URLs, so "/<tab>/example.com" becomes "//example.com".
  test("next cannot point to another site", async ({ page, loginPage, baseURL }) => {
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
