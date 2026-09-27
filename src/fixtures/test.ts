import { test as base, type APIRequestContext } from "@playwright/test";
import { ApplicationsApi } from "@/api/applications.api";
import { AccountEndpoint } from "@/api/endpoints/account.endpoint";
import { ApplicationsEndpoint } from "@/api/endpoints/applications.endpoint";
import { AUTH_STATE_PATH } from "@/config/env";
import { AppShell } from "@/components/app-shell.component";
import { ApplicationsPage } from "@/pages/applications.page";
import { DashboardPage } from "@/pages/dashboard.page";
import { LandingPage } from "@/pages/landing.page";
import { LoginPage } from "@/pages/login.page";
import { SettingsPage } from "@/pages/settings.page";

interface Fixtures {
  landingPage: LandingPage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  applicationsPage: ApplicationsPage;
  settingsPage: SettingsPage;
  appShell: AppShell;
  userRequest: APIRequestContext;
  applicationsEndpoint: ApplicationsEndpoint;
  accountEndpoint: AccountEndpoint;
  applicationsApi: ApplicationsApi;
}

export const test = base.extend<Fixtures>({
  landingPage: async ({ page }, use) => use(new LandingPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  applicationsPage: async ({ page }, use) => use(new ApplicationsPage(page)),
  settingsPage: async ({ page }, use) => use(new SettingsPage(page)),
  appShell: async ({ page }, use) => use(new AppShell(page)),

  // API context signed in with the session the setup project saved. No browser needed.
  userRequest: async ({ playwright, baseURL }, use) => {
    const context = await playwright.request.newContext({ baseURL, storageState: AUTH_STATE_PATH });
    await use(context);
    await context.dispose();
  },
  applicationsEndpoint: async ({ userRequest }, use) => use(new ApplicationsEndpoint(userRequest)),
  accountEndpoint: async ({ userRequest }, use) => use(new AccountEndpoint(userRequest)),

  applicationsApi: async ({ userRequest }, use) => {
    const api = new ApplicationsApi(userRequest);
    await use(api);
    await api.deleteTracked();
  },
});

export { expect } from "@playwright/test";
