import type { ApplicationInput } from "@/api/types";

// Fixed dates, far from any run date, so "follow-up due" never flips between seed and verify.
const APPLIED = "2025-11-03T09:30:00.000Z";
const CLOSED = "2026-01-15T17:45:00.000Z";
const FOLLOW_UP_DUE = "2025-12-01T00:00:00.000Z";
const FOLLOW_UP_LATER = "2035-01-01T00:00:00.000Z";

/** Pads text to an exact length, so a record sits on the API's maximum. */
const exactly = (text: string, length: number) => text.padEnd(length, "x").slice(0, length);

type Record = ApplicationInput & { company: string; title: string };

/**
 * The records the seed phase creates. Every company starts with the run's marker,
 * so a search for the marker finds exactly this dataset.
 */
export function buildDataset(marker: string): { main: Record[]; second: Record[] } {
  const company = (name: string) => `${marker} ${name}`;

  const main: Record[] = [
    { company: company("Minimal"), title: "Only required fields" },
    {
      company: company("Complete"),
      title: "Every optional field set",
      status: "APPLIED",
      priority: "P1",
      location: "Remote (US)",
      workMode: "REMOTE",
      employmentType: "FULL_TIME",
      jobUrl: "https://example.com/jobs/complete",
      source: "referral",
      salaryMin: 120000,
      salaryMax: 150000,
      salaryCurrency: "USD",
      description: "Multi-line notes.\nSecond line.\n\nAfter a blank line.",
      tags: ["api", "playwright"],
      appliedAt: APPLIED,
      followUpAt: FOLLOW_UP_DUE,
    },
    {
      company: company("Interview"),
      title: "Follow-up not due",
      status: "INTERVIEW",
      priority: "P2",
      workMode: "HYBRID",
      employmentType: "CONTRACT",
      source: "recruiter",
      appliedAt: APPLIED,
      followUpAt: FOLLOW_UP_LATER,
    },
    {
      company: company("Offer"),
      title: "Salary minimum equals maximum",
      status: "OFFER",
      priority: "P0",
      workMode: "ONSITE",
      employmentType: "PART_TIME",
      source: "company_site",
      salaryMin: 100000,
      salaryMax: 100000,
      salaryCurrency: "EUR",
      appliedAt: APPLIED,
    },
    {
      company: company("Rejected"),
      title: "Closed after applying",
      status: "REJECTED",
      employmentType: "INTERNSHIP",
      source: "linkedin",
      appliedAt: APPLIED,
      closedAt: CLOSED,
    },
    { company: company("Withdrawn"), title: "Closed", status: "WITHDRAWN", source: "indeed", closedAt: CLOSED },
    { company: company("Archived"), title: "Closed", status: "ARCHIVED", source: "job_board", closedAt: CLOSED },
    {
      company: exactly(company("Longest "), 200),
      title: exactly("Longest title ", 200),
      location: exactly("Longest location ", 200),
      description: exactly("Longest description ", 10000),
      tags: Array.from({ length: 10 }, (_, i) => exactly(`tag-${i} `, 40)),
      source: "networking",
    },
    {
      company: company("Café Zürich 東京 🚀"),
      title: "Ingeniera de Calidad ✅",
      location: "São Paulo",
      description: "Emoji 🎉, accents é à ü, CJK 日本語, RTL שלום.",
      tags: ["ünïcödé", "日本語", "🚀"],
      source: "other",
    },
    {
      company: company("Salary bounds"),
      title: "Lowest and highest salary",
      salaryMin: 0,
      salaryMax: 10000000,
      salaryCurrency: "GBP",
    },
    { company: company("Page filler A"), title: "Saved", priority: "P0" },
    { company: company("Page filler B"), title: "Saved", priority: "P2" },
  ];

  const second: Record[] = [
    { company: company("Second user A"), title: "Belongs to the second account" },
    {
      company: company("Second user B"),
      title: "Belongs to the second account",
      status: "APPLIED",
      appliedAt: APPLIED,
    },
  ];

  return { main, second };
}
