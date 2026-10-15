import { z } from "zod";
import { accountSchema, applicationSchema, dashboardSummarySchema } from "@/api/schemas";
import type { Account, Application, DashboardSummary, Status } from "@/api/types";

/** Every visual test runs at this moment, so dates such as "3 days ago" never change. */
export const NOW = new Date("2026-10-15T10:00:00.000Z");

const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000).toISOString();

type Overrides = Partial<Application> & Pick<Application, "company" | "title" | "status">;

let sequence = 0;
function application(overrides: Overrides): Application {
  sequence++;
  return {
    id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    location: null,
    workMode: null,
    employmentType: null,
    jobUrl: null,
    companyDomain: null,
    logoUrl: null,
    source: null,
    priority: "MEDIUM",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: "USD",
    description: null,
    tags: [],
    appliedAt: null,
    followUpAt: null,
    closedAt: null,
    createdAt: day(-20 + sequence),
    updatedAt: day(-10 + sequence),
    ...overrides,
  };
}

// Fictional companies and people only. Validated against the same strict schemas as the real API,
// so the pages are drawn from data the API could actually return.
export const applications: Application[] = z.array(applicationSchema).parse([
  application({
    company: "Northwind Labs",
    title: "Senior QA Engineer",
    status: "SAVED",
    priority: "HIGH",
    workMode: "REMOTE",
    employmentType: "FULL_TIME",
    location: "Remote, EU",
    source: "linkedin",
    salaryMin: 90_000,
    salaryMax: 115_000,
    salaryCurrency: "EUR",
    tags: ["Playwright", "TypeScript"],
    jobUrl: "https://example.com/careers/qa",
    description: "Own the test strategy for the web app. Playwright, API tests, CI.",
  }),
  application({
    company: "Bluefin Health",
    title: "Test Automation Engineer",
    status: "SAVED",
    priority: "LOW",
    workMode: "HYBRID",
    location: "Lisbon",
  }),
  application({
    company: "Cedar & Co",
    title: "Quality Engineer",
    status: "APPLIED",
    priority: "MEDIUM",
    workMode: "ONSITE",
    location: "Porto",
    source: "referral",
    appliedAt: day(-6),
    followUpAt: day(-1),
    tags: ["API"],
  }),
  application({
    company: "Harbor Analytics",
    title: "SDET",
    status: "APPLIED",
    priority: "HIGH",
    workMode: "REMOTE",
    appliedAt: day(-3),
    source: "company_site",
  }),
  application({
    company: "Quill Systems",
    title: "Lead QA Engineer",
    status: "INTERVIEW",
    priority: "HIGH",
    workMode: "HYBRID",
    location: "Berlin",
    appliedAt: day(-14),
    followUpAt: day(2),
    salaryMin: 100_000,
    salaryMax: 125_000,
    salaryCurrency: "EUR",
    source: "recruiter",
  }),
  application({
    company: "Orbit Retail",
    title: "QA Engineer",
    status: "OFFER",
    priority: "MEDIUM",
    appliedAt: day(-25),
    source: "job_board",
  }),
  application({
    company: "Pinecrest Bank",
    title: "Automation Tester",
    status: "REJECTED",
    priority: "LOW",
    appliedAt: day(-30),
    closedAt: day(-9),
  }),
  application({ company: "Lumen Media", title: "QA Analyst", status: "ARCHIVED", priority: "LOW", closedAt: day(-12) }),
]);

export const account: Account = accountSchema.parse({
  id: "00000000-0000-4000-8000-0000000000aa",
  email: "sam.rivera@example.com",
  displayName: "Sam Rivera",
  createdAt: day(-60),
  applicationCount: applications.length,
  isDemo: false,
  demoExpiresAt: null,
});

const count = (status: Status) => applications.filter((a) => a.status === status).length;
const closed = new Set<Status>(["REJECTED", "WITHDRAWN", "ARCHIVED"]);
const active = applications.filter((a) => !closed.has(a.status));

export const summary: DashboardSummary = dashboardSummarySchema.parse({
  total: applications.length,
  active: active.length,
  byStatus: Object.fromEntries(
    (["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"] as const).map((s) => [
      s,
      count(s),
    ]),
  ),
  activeByPriority: Object.fromEntries(
    (["HIGH", "MEDIUM", "LOW"] as const).map((p) => [p, active.filter((a) => a.priority === p).length]),
  ),
  recent: [...applications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
  applicationsSent: applications.filter((a) => a.appliedAt).length,
  interviews: count("INTERVIEW") + count("OFFER"),
  offers: count("OFFER"),
  savedTopPriority: applications.filter((a) => a.status === "SAVED" && a.priority === "HIGH").length,
  followUpsDue: { count: 1, first: applications.find((a) => a.company === "Cedar & Co") ?? null },
  sources: [
    { source: "referral", total: 1, interviews: 0, rate: 0 },
    { source: "recruiter", total: 1, interviews: 1, rate: 100 },
    { source: "linkedin", total: 1, interviews: 0, rate: 0 },
  ],
  activeDays: ["2026-10-12", "2026-10-13", "2026-10-15"],
});
