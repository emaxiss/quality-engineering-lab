import { env, AUTH_STATE_PATH } from "@/config/env";
import { test as setup } from "@/fixtures/test";

setup("sign in and save the session", async ({ page, loginPage, homePage }) => {
  await loginPage.goto();
  await loginPage.login(env.userEmail, env.userPassword);
  await homePage.expectLoaded();

  await page.context().storageState({ path: AUTH_STATE_PATH });
});
