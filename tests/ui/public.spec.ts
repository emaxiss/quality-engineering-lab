import { expect, test } from "@/fixtures/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("public pages", { tag: "@smoke" }, () => {
  test("landing page offers log in and sign up", async ({ landingPage }) => {
    await landingPage.goto();

    await expect(landingPage.loginLink).toBeVisible();
    await expect(landingPage.signupLink).toBeVisible();
  });

  test("landing page links to the login form", async ({ landingPage, loginPage }) => {
    await landingPage.goto();
    await landingPage.loginLink.click();

    await loginPage.expectLoaded();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  });
});
