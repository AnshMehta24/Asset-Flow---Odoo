import type {
  AuditCycleStatus,
  AuditVerificationStatus,
  AuditDiscrepancyStatus,
} from "@/../generated/prisma/client";

export type AuditScopeInput = {
  departmentId?: string | null;
  location?: string | null;
};

export type CreateAuditCycleInput = AuditScopeInput & {
  name: string;
  startDate: string;
  endDate: string;
  auditorIds: string[];
};

export type UpdateAuditCycleInput = CreateAuditCycleInput;

export type VerifyAuditItemInput = {
  verification: Exclude<AuditVerificationStatus, "PENDING">;
  observedLocation?: string | null;
  notes?: string | null;
};

export type ResolveAuditDiscrepancyInput = {
  status: AuditDiscrepancyStatus;
  resolutionNotes?: string | null;
};

export type AuditCycleProgress = {
  total: number;
  pending: number;
  verified: number;
  missing: number;
  damaged: number;
  completed: number;
  percentage: number;
};
