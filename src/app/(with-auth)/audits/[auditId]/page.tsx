import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/user";
import {
  getAuditCycleSummary,
  getAuditChecklist,
  getAuditDiscrepancies,
  getAuditActivity,
} from "@/lib/audits/audit.queries";
import {
  canEditAudit,
  canStartAudit,
  canVerifyAuditItem,
  canResolveDiscrepancy,
  canCloseAudit,
} from "@/lib/audits/audit.permissions";
import { AuditDetailView } from "../_components/audit-detail-view";

type Tab = "overview" | "checklist" | "discrepancies" | "activity";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ auditId: string }>;
}) {
  const { auditId } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Audit — AssetFlow" };

  try {
    const summary = await getAuditCycleSummary(auditId, user);
    if (!summary) return { title: "Audit Not Found — AssetFlow" };
    return { title: `${summary.audit.name} — AssetFlow` };
  } catch {
    return { title: "Audit — AssetFlow" };
  }
}

export default async function AuditDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ auditId: string }>;
  searchParams: Promise<{
    tab?: string;
    page?: string;
    search?: string;
    verification?: string;
    location?: string;
    checkedByMe?: string;
    resolutionStatus?: string;
  }>;
}) {
  const { auditId } = await params;
  const resolvedSearchParams = await searchParams;

  const user = await getCurrentUser();
  if (!user) return null;

  let summary;
  try {
    summary = await getAuditCycleSummary(auditId, user);
  } catch (error) {
    if (error instanceof Error && error.message === "AUDIT_FORBIDDEN") {
      return (
        <div className="flex-1 py-20 text-center text-muted-foreground">
          <p className="text-sm font-semibold">You don&apos;t have access to this audit cycle.</p>
        </div>
      );
    }
    throw error;
  }

  if (!summary) notFound();

  const { audit: cycle, metrics } = summary;

  const tab: Tab = (["overview", "checklist", "discrepancies", "activity"] as const).includes(
    resolvedSearchParams.tab as Tab
  )
    ? (resolvedSearchParams.tab as Tab)
    : "overview";

  const checklistFilters = {
    page: resolvedSearchParams.page ? parseInt(resolvedSearchParams.page, 10) : 1,
    search: resolvedSearchParams.search,
    verification: resolvedSearchParams.verification,
    location: resolvedSearchParams.location,
    checkedByMe: resolvedSearchParams.checkedByMe === "true",
  };
  const resolutionStatus =
    resolvedSearchParams.resolutionStatus && resolvedSearchParams.resolutionStatus !== "ALL"
      ? resolvedSearchParams.resolutionStatus
      : undefined;

  const isManager = user.role === "ADMIN" || user.role === "ASSET_MANAGER";
  const isUserAuditor = cycle.auditors.some((a) => a.auditorId === user.id);

  const [checklist, discrepancies, activity, closePreview] = await Promise.all([
    tab === "checklist" ? getAuditChecklist(auditId, checklistFilters, user) : null,
    tab === "discrepancies" ? getAuditDiscrepancies(auditId, { resolutionStatus }, user) : null,
    tab === "activity" ? getAuditActivity(auditId, user) : null,
    isManager && cycle.status === "IN_PROGRESS"
      ? getAuditDiscrepancies(auditId, { resolutionStatus: "CONFIRMED" }, user)
      : null,
  ]);

  const confirmedMissing = closePreview?.filter((i) => i.verification === "MISSING").length ?? 0;
  const confirmedDamaged = closePreview?.filter((i) => i.verification === "DAMAGED").length ?? 0;

  return (
    <AuditDetailView
      auditId={auditId}
      cycle={cycle}
      metrics={metrics}
      tab={tab}
      checklist={checklist}
      checklistFilters={checklistFilters}
      discrepancies={discrepancies}
      resolutionStatus={resolutionStatus}
      activity={activity}
      confirmedMissing={confirmedMissing}
      confirmedDamaged={confirmedDamaged}
      currentUserId={user.id}
      isUserAuditor={isUserAuditor}
      isManager={isManager}
      isAdmin={user.role === "ADMIN"}
      canEdit={canEditAudit(user, cycle)}
      canStart={canStartAudit(user, cycle)}
      canVerify={canVerifyAuditItem(user, { ...cycle, auditors: cycle.auditors.map((a) => ({ auditorId: a.auditorId })) })}
      canResolve={canResolveDiscrepancy(user)}
      canClose={canCloseAudit(user, cycle)}
    />
  );
}
