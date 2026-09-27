import { env } from "@/config/env";
import { test } from "@/fixtures/test";

test.describe("authentication", { tag: "@smoke" }, () => {
  test("user can log in and log out", async ({ loginPage, dashboardPage, appShell }) => {
    await loginPage.goto();
    await loginPage.login(env.loginUserEmail, env.loginUserPassword);
    await dashboardPage.expectLoaded();

    await appShell.logout();
    await loginPage.expectLoaded();
  });
});
