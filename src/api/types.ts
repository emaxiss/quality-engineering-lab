import type { z } from "zod";
import type {
  accountExportSchema,
  accountSchema,
  apiErrorSchema,
  applicationSchema,
  dashboardSummarySchema,
  listMetaSchema,
  prioritySchema,
  sessionSchema,
  statusSchema,
} from "@/api/schemas";

export type Status = z.infer<typeof statusSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type Application = z.infer<typeof applicationSchema>;
export type Account = z.infer<typeof accountSchema>;
export type AccountExport = z.infer<typeof accountExportSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type ListMeta = z.infer<typeof listMetaSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

export type ApplicationInput = Partial<
  Omit<Application, "id" | "createdAt" | "updatedAt" | "companyDomain" | "logoUrl">
>;

export interface ListQuery {
  status?: Status[];
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}
