import { test as base } from "@playwright/test";
import { ApplicationsApi } from "@/api/applications.api";
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
  applicationsApi: ApplicationsApi;
}

export const test = base.extend<Fixtures>({
  landingPage: async ({ page }, use) => use(new LandingPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  applicationsPage: async ({ page }, use) => use(new ApplicationsPage(page)),
  settingsPage: async ({ page }, use) => use(new SettingsPage(page)),
  appShell: async ({ page }, use) => use(new AppShell(page)),

  // Shares the page's cookies, so it acts as the signed-in user.
  applicationsApi: async ({ page }, use) => {
    const api = new ApplicationsApi(page.request);
    await use(api);
    await api.deleteTracked();
  },
});

export { expect } from "@playwright/test";
