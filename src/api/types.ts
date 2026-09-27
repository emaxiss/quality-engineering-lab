export type Status = "SAVED" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN" | "ARCHIVED";
export type Priority = "P0" | "P1" | "P2";

export interface Application {
  id: string;
  company: string;
  title: string;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  jobUrl: string | null;
  companyDomain: string | null;
  logoUrl: string | null;
  source: string | null;
  status: Status;
  priority: Priority;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string | null;
  tags: string[];
  appliedAt: string | null;
  followUpAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationInput = Partial<Omit<Application, "id" | "createdAt" | "updatedAt" | "companyDomain" | "logoUrl">>;

export interface Account {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  opportunityCount: number;
  isDemo: boolean;
  demoExpiresAt: string | null;
}

export interface ListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListQuery {
  status?: Status[];
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface Envelope<T> {
  data: T;
}

export interface ListEnvelope<T> extends Envelope<T[]> {
  meta: ListMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}
