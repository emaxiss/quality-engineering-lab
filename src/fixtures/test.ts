import { test as base, type APIRequestContext } from "@playwright/test";
import { ApplicationsApi } from "@/api/applications.api";
import { AccountEndpoint } from "@/api/endpoints/account.endpoint";
import { ApplicationsEndpoint } from "@/api/endpoints/applications.endpoint";
import { DashboardEndpoint } from "@/api/endpoints/dashboard.endpoint";
import { AUTH_STATE_PATH } from "@/config/env";
import { AppShell } from "@/components/app-shell.component";
import { ApplicationsPage } from "@/pages/applications.page";
import { HomePage } from "@/pages/home.page";
import { LandingPage } from "@/pages/landing.page";
import { LoginPage } from "@/pages/login.page";
import { SettingsPage } from "@/pages/settings.page";

interface Fixtures {
  landingPage: LandingPage;
  loginPage: LoginPage;
  homePage: HomePage;
  applicationsPage: ApplicationsPage;
  settingsPage: SettingsPage;
  appShell: AppShell;
  userRequest: APIRequestContext;
  applicationsEndpoint: ApplicationsEndpoint;
  accountEndpoint: AccountEndpoint;
  dashboardEndpoint: DashboardEndpoint;
  applicationsApi: ApplicationsApi;
}

export const test = base.extend<Fixtures>({
  landingPage: async ({ page }, use) => use(new LandingPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  homePage: async ({ page }, use) => use(new HomePage(page)),
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
  dashboardEndpoint: async ({ userRequest }, use) => use(new DashboardEndpoint(userRequest)),

  applicationsApi: async ({ userRequest }, use) => {
    const api = new ApplicationsApi(userRequest);
    await use(api);
    await api.deleteTracked();
  },
});

export { expect } from "@playwright/test";
