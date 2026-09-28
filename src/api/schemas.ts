import { z } from "zod";

// Response schemas for /api/v1. Objects are strict: a field the API starts returning, or stops
// returning, fails the test that received it.

const timestamp = z.iso.datetime();
const count = z.int().nonnegative();

export const statusSchema = z.enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"]);
export const prioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const workModeSchema = z.enum(["REMOTE", "HYBRID", "ONSITE"]);
export const employmentTypeSchema = z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]);
export const sourceSchema = z.enum([
  "referral",
  "recruiter",
  "company_site",
  "linkedin",
  "indeed",
  "job_board",
  "networking",
  "other",
]);

const salary = z.number().min(0).max(10_000_000);

export const applicationSchema = z.strictObject({
  id: z.uuid(),
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  location: z.string().max(200).nullable(),
  workMode: workModeSchema.nullable(),
  employmentType: employmentTypeSchema.nullable(),
  jobUrl: z.url().nullable(),
  companyDomain: z.string().nullable(),
  logoUrl: z.url().nullable(),
  source: sourceSchema.nullable(),
  status: statusSchema,
  priority: prioritySchema,
  salaryMin: salary.nullable(),
  salaryMax: salary.nullable(),
  salaryCurrency: z.string().length(3).nullable(),
  description: z.string().max(10_000).nullable(),
  tags: z.array(z.string().min(1).max(40)).max(10),
  appliedAt: timestamp.nullable(),
  followUpAt: timestamp.nullable(),
  closedAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const listMetaSchema = z.strictObject({
  page: z.int().positive(),
  pageSize: z.int().positive(),
  total: count,
  totalPages: count,
});

export const envelope = <T extends z.ZodType>(data: T) => z.strictObject({ data });
export const listEnvelope = <T extends z.ZodType>(item: T) =>
  z.strictObject({ data: z.array(item), meta: listMetaSchema });

export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional(),
  }),
});

export const sessionSchema = z.strictObject({
  user: z.strictObject({ id: z.uuid(), email: z.email() }),
  session: z.strictObject({ accessToken: z.string().min(1), expiresAt: z.int().positive() }),
});

export const accountSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  createdAt: timestamp,
  opportunityCount: count,
  isDemo: z.boolean(),
  demoExpiresAt: timestamp.nullable(),
});

export const accountExportSchema = z.strictObject({
  exportedAt: timestamp,
  account: z.strictObject({ email: z.email(), displayName: z.string().nullable(), createdAt: timestamp }),
  opportunities: z.array(applicationSchema),
});

export const healthSchema = z.strictObject({
  status: z.string(),
  database: z.string(),
  time: timestamp,
});

export const dashboardSummarySchema = z.strictObject({
  total: count,
  active: count,
  byStatus: z.record(statusSchema, count),
  activeByPriority: z.record(prioritySchema, count),
  recent: z.array(applicationSchema),
  applicationsSent: count,
  interviews: count,
  offers: count,
  savedTopPriority: count,
  followUpsDue: z.strictObject({ count, first: applicationSchema.nullable() }),
  sources: z.array(
    z.strictObject({ source: sourceSchema, total: count, interviews: count, rate: z.number().min(0).max(100) }),
  ),
  activeDays: z.array(z.iso.date()),
});

export const applicationResponse = envelope(applicationSchema);
export const applicationListResponse = listEnvelope(applicationSchema);
export const sessionResponse = envelope(sessionSchema);
export const accountResponse = envelope(accountSchema);
export const healthResponse = envelope(healthSchema);
export const dashboardSummaryResponse = envelope(dashboardSummarySchema);
