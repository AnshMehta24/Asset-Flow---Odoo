"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Building,
  MapPin,
  Users,
  Play,
  ShieldCheck,
  Edit,
  Download,
  ClipboardCheck,
  AlertTriangle,
  History,
  CheckCircle,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { startAuditCycle, verifyAuditItem, resolveAuditDiscrepancy, closeAuditCycle } from "../actions";
import type {
  getAuditCycleSummary,
  getAuditChecklist,
  getAuditDiscrepancies,
  getAuditActivity,
} from "@/lib/audits/audit.queries";

type Summary = NonNullable<Awaited<ReturnType<typeof getAuditCycleSummary>>>;
type Cycle = Summary["audit"];
type Metrics = Summary["metrics"];
type ChecklistResult = Awaited<ReturnType<typeof getAuditChecklist>>;
type ChecklistItem = ChecklistResult["items"][number];
type DiscrepancyItem = Awaited<ReturnType<typeof getAuditDiscrepancies>>[number];
type ActivityLog = Awaited<ReturnType<typeof getAuditActivity>>[number];

type Tab = "overview" | "checklist" | "discrepancies" | "activity";

type Props = {
  auditId: string;
  cycle: Cycle;
  metrics: Metrics;
  tab: Tab;
  checklist: ChecklistResult | null;
  checklistFilters: {
    page: number;
    search?: string;
    verification?: string;
    location?: string;
    checkedByMe: boolean;
  };
  discrepancies: DiscrepancyItem[] | null;
  resolutionStatus: string | undefined;
  activity: ActivityLog[] | null;
  confirmedMissing: number;
  confirmedDamaged: number;
  currentUserId: string;
  isUserAuditor: boolean;
  isManager: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  canStart: boolean;
  canVerify: boolean;
  canResolve: boolean;
  canClose: boolean;
};

function formatDate(date: Date | string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case "PLANNED":
    case "OPEN":
    case "PENDING":
      return "bg-blue-500/10 border-blue-500/20 text-blue-500";
    case "IN_PROGRESS":
    case "CONFIRMED":
      return "bg-amber-500/10 border-amber-500/20 text-amber-500";
    case "CLOSED":
    case "RESOLVED":
    case "VERIFIED":
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
    case "MISSING":
    case "DAMAGED":
    case "DISMISSED":
      return "bg-rose-500/10 border-rose-500/20 text-rose-500";
    default:
      return "bg-muted border-border text-muted-foreground";
  }
}

export function AuditDetailView({
  auditId,
  cycle,
  metrics,
  tab,
  checklist,
  checklistFilters,
  discrepancies,
  resolutionStatus,
  activity,
  confirmedMissing,
  confirmedDamaged,
  isUserAuditor,
  isManager,
  isAdmin,
  canStart,
  canClose,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavPending, startNavTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();

  const [verifyModalItem, setVerifyModalItem] = useState<ChecklistItem | null>(null);
  const [verifyVerification, setVerifyVerification] = useState<"VERIFIED" | "MISSING" | "DAMAGED">("VERIFIED");
  const [verifyObservedLocation, setVerifyObservedLocation] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");

  const [resolveModalItem, setResolveModalItem] = useState<DiscrepancyItem | null>(null);
  const [resolveStatus, setResolveStatus] = useState<"CONFIRMED" | "RESOLVED" | "DISMISSED">("CONFIRMED");
  const [resolveNotes, setResolveNotes] = useState("");

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const query = params.toString();
    startNavTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function switchTab(next: Tab) {
    const params = new URLSearchParams();
    if (next !== "overview") params.set("tab", next);
    startNavTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  function handleStartAudit() {
    if (!confirm("Are you sure you want to start this audit?")) return;
    startActionTransition(async () => {
      const result = await startAuditCycle(auditId);
      if (result.success) {
        toast.success("Audit started successfully.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function openVerifyModal(item: ChecklistItem) {
    setVerifyModalItem(item);
    setVerifyVerification(item.verification !== "PENDING" ? item.verification : "VERIFIED");
    setVerifyObservedLocation(item.observedLocation || item.expectedLocation || "");
    setVerifyNotes(item.notes || "");
  }

  function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyModalItem) return;

    if (["MISSING", "DAMAGED"].includes(verifyVerification) && !verifyNotes.trim()) {
      toast.error("Notes are required for missing or damaged assets.");
      return;
    }

    startActionTransition(async () => {
      const result = await verifyAuditItem(auditId, verifyModalItem.id, {
        verification: verifyVerification,
        observedLocation: verifyObservedLocation.trim() || null,
        notes: verifyNotes.trim() || null,
      });

      if (result.success) {
        toast.success("Checklist item updated.");
        setVerifyModalItem(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function openResolveModal(item: DiscrepancyItem) {
    setResolveModalItem(item);
    setResolveStatus(item.discrepancyStatus !== "OPEN" && item.discrepancyStatus ? item.discrepancyStatus : "CONFIRMED");
    setResolveNotes(item.resolutionNotes || "");
  }

  function handleResolveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveModalItem) return;

    if (["RESOLVED", "DISMISSED"].includes(resolveStatus) && !resolveNotes.trim()) {
      toast.error("Resolution notes are required for resolved or dismissed discrepancies.");
      return;
    }

    startActionTransition(async () => {
      const result = await resolveAuditDiscrepancy(auditId, resolveModalItem.id, {
        status: resolveStatus,
        resolutionNotes: resolveNotes.trim() || null,
      });

      if (result.success) {
        toast.success("Discrepancy reviewed and updated.");
        setResolveModalItem(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCloseAudit() {
    startActionTransition(async () => {
      const result = await closeAuditCycle(auditId);
      if (result.success) {
        toast.success("Audit cycle closed successfully.");
        setIsCloseModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const hasCloseBlockers = metrics.pending > 0 || metrics.openDiscrepancies > 0;
  const discrepancyCount = metrics.missing + metrics.damaged;

  return (
    <div className="flex-1 space-y-6 max-w-7xl w-full mx-auto relative">
      {/* Header breadcrumb & operations */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="space-y-1">
          <Link
            href="/audits"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
          >
            <ChevronLeft size={14} />
            <span>Back to Audits List</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{cycle.name}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusColor(cycle.status)}`}>
              {cycle.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && cycle.status === "PLANNED" && (
            <>
              <Link
                href={`/audits/${cycle.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-border text-xs font-semibold rounded-lg shadow cursor-pointer transition-all"
              >
                <Edit size={14} />
                <span>Edit Scope</span>
              </Link>

              {canStart && (
                <button
                  onClick={handleStartAudit}
                  disabled={isActionPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-lg shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Start Audit</span>
                </button>
              )}
            </>
          )}

          {isManager && cycle.status === "IN_PROGRESS" && canClose && (
            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-lg shadow active:scale-[0.98] transition-all cursor-pointer"
            >
              <ShieldCheck size={15} />
              <span>Close Audit</span>
            </button>
          )}

          {cycle.status !== "PLANNED" && (
            <a
              href={`/api/audits/${auditId}/report`}
              className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-border text-xs font-semibold rounded-lg shadow cursor-pointer transition-all"
            >
              <Download size={14} />
              <span>Export Discrepancies (.csv)</span>
            </a>
          )}
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border/60">
        {(
          [
            ["overview", "Overview"],
            ["checklist", `Checklist (${metrics.total})`],
            ["discrepancies", `Discrepancies (${discrepancyCount})`],
            ["activity", "Activity Log"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            disabled={isNavPending}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              tab === key
                ? "border-primary text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Checked</span>
                  <h4 className="text-xl font-bold mt-1">{metrics.completed} / {metrics.total}</h4>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-3">
                    <div className="bg-primary h-full" style={{ width: `${metrics.percentage}%` }} />
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pending</span>
                  <h4 className="text-xl font-bold mt-1 text-blue-500">{metrics.pending}</h4>
                  <span className="text-[10px] text-muted-foreground">Awaiting inspection</span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Missing</span>
                  <h4 className="text-xl font-bold mt-1 text-rose-500">{metrics.missing}</h4>
                  <span className="text-[10px] text-muted-foreground">Flagged absent</span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Damaged</span>
                  <h4 className="text-xl font-bold mt-1 text-rose-600">{metrics.damaged}</h4>
                  <span className="text-[10px] text-muted-foreground">Flagged broken</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground">Audit Scope & Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div className="space-y-2">
                    <div>
                      <span className="block font-semibold">Scope Department</span>
                      <strong className="text-foreground">{cycle.department?.name || "All Departments"}</strong>
                    </div>
                    <div>
                      <span className="block font-semibold">Scope Location</span>
                      <strong className="text-foreground">{cycle.location || "All Locations"}</strong>
                    </div>
                    <div>
                      <span className="block font-semibold">Date Range</span>
                      <strong className="text-foreground">{formatDate(cycle.startDate).split(" at")[0]} — {formatDate(cycle.endDate).split(" at")[0]}</strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="block font-semibold">Created By</span>
                      <strong className="text-foreground">{cycle.createdBy.name} ({formatDate(cycle.createdAt)})</strong>
                    </div>
                    {cycle.startedBy && (
                      <div>
                        <span className="block font-semibold">Started By</span>
                        <strong className="text-foreground">{cycle.startedBy.name} ({formatDate(cycle.startedAt)})</strong>
                      </div>
                    )}
                    {cycle.closedBy && (
                      <div>
                        <span className="block font-semibold">Closed By</span>
                        <strong className="text-foreground">{cycle.closedBy.name} ({formatDate(cycle.closedAt)})</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 h-fit space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Users size={16} />
                <span>Assigned Auditors</span>
              </h3>
              <div className="space-y-3">
                {cycle.auditors.map((a) => (
                  <div key={a.auditor.id} className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground border border-border flex items-center justify-center font-bold text-xs uppercase">
                      {a.auditor.name[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{a.auditor.name}</h4>
                      <span className="text-[10px] text-muted-foreground block">{a.auditor.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "checklist" && checklist && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by tag, name, or serial number..."
                  defaultValue={checklistFilters.search ?? ""}
                  onChange={(e) => updateParams({ tab: "checklist", search: e.target.value || undefined, page: undefined })}
                  className="w-full pl-9 pr-4 py-1.5 bg-background border border-border hover:border-accent-foreground/20 rounded-lg text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <select
                  defaultValue={checklistFilters.verification ?? ""}
                  onChange={(e) => updateParams({ tab: "checklist", verification: e.target.value || undefined, page: undefined })}
                  className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 text-muted-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="">All Verification</option>
                  <option value="PENDING">Pending</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="MISSING">Missing</option>
                  <option value="DAMAGED">Damaged</option>
                </select>

                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer font-semibold select-none">
                  <input
                    type="checkbox"
                    defaultChecked={checklistFilters.checkedByMe}
                    onChange={(e) => updateParams({ tab: "checklist", checkedByMe: e.target.checked ? "true" : undefined, page: undefined })}
                    className="rounded border-border text-primary focus:ring-ring size-3.5 cursor-pointer"
                  />
                  <span>Checked by me</span>
                </label>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {isNavPending ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                  <RefreshCw size={24} className="animate-spin text-primary" />
                  <p className="text-xs font-semibold mt-2">Loading items...</p>
                </div>
              ) : checklist.items.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <ClipboardCheck size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No assets match the selected filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-3 px-4">Asset Tag</th>
                        <th className="py-3 px-4">Asset Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Expected Location</th>
                        <th className="py-3 px-4">Current/Observed</th>
                        <th className="py-3 px-4 text-center">Verification</th>
                        <th className="py-3 px-4">Auditor Notes</th>
                        <th className="py-3 px-4">Inspector</th>
                        {cycle.status === "IN_PROGRESS" && isUserAuditor && (
                          <th className="py-3 px-4 text-right">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-xs">
                      {checklist.items.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            AF-{String(item.asset.tagNumber).padStart(4, "0")}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {item.asset.name}
                            <span className="block text-[10px] text-muted-foreground font-normal">S/N: {item.asset.serialNumber || "N/A"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {item.asset.category.name}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground font-medium">
                            {item.expectedLocation || "N/A"}
                          </td>
                          <td className="py-3.5 px-4 text-foreground font-medium">
                            {item.observedLocation || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusColor(item.verification)}`}>
                              {item.verification}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground max-w-[200px] truncate" title={item.notes || ""}>
                            {item.notes || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {item.verifiedBy?.name || "—"}
                            {item.verifiedAt && <span className="block text-[9px] font-normal">{formatDate(item.verifiedAt).split(" at")[0]}</span>}
                          </td>
                          {cycle.status === "IN_PROGRESS" && isUserAuditor && (
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => openVerifyModal(item)}
                                className="px-2.5 py-1 bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground border border-border rounded text-[10px] font-semibold cursor-pointer transition-all shadow-sm"
                              >
                                Verify
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {checklist.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                <span>Page <strong>{checklist.pagination.page}</strong> of {checklist.pagination.totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={checklist.pagination.page === 1}
                    onClick={() => updateParams({ tab: "checklist", page: String(checklist.pagination.page - 1) })}
                    className="px-3 py-1 bg-card border border-border rounded hover:bg-muted cursor-pointer disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={checklist.pagination.page === checklist.pagination.totalPages}
                    onClick={() => updateParams({ tab: "checklist", page: String(checklist.pagination.page + 1) })}
                    className="px-3 py-1 bg-card border border-border rounded hover:bg-muted cursor-pointer disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "discrepancies" && discrepancies && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Discrepancies includes all missing or damaged assets.</span>
              <select
                defaultValue={resolutionStatus ?? "ALL"}
                onChange={(e) => updateParams({ tab: "discrepancies", resolutionStatus: e.target.value === "ALL" ? undefined : e.target.value })}
                className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 text-muted-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">All Resolutions</option>
                <option value="OPEN">Open Discrepancies</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {isNavPending ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                  <RefreshCw size={24} className="animate-spin text-primary" />
                  <p className="text-xs font-semibold mt-2">Loading discrepancies...</p>
                </div>
              ) : discrepancies.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500 opacity-60" />
                  <p className="text-xs">No discrepancies found in this audit.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-3 px-4">Asset Tag</th>
                        <th className="py-3 px-4">Asset Name</th>
                        <th className="py-3 px-4">Expected Location</th>
                        <th className="py-3 px-4">Observed Location</th>
                        <th className="py-3 px-4 text-center">Audited Verification</th>
                        <th className="py-3 px-4">Auditor / Notes</th>
                        <th className="py-3 px-4 text-center">Resolution Status</th>
                        <th className="py-3 px-4">Reviewer / Notes</th>
                        {cycle.status === "IN_PROGRESS" && isManager && (
                          <th className="py-3 px-4 text-right">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-xs">
                      {discrepancies.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            AF-{String(item.asset.tagNumber).padStart(4, "0")}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {item.asset.name}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {item.expectedLocation || "N/A"}
                          </td>
                          <td className="py-3.5 px-4 text-foreground">
                            {item.observedLocation || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusColor(item.verification)}`}>
                              {item.verification}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            <span className="font-semibold text-foreground block">{item.verifiedBy?.name || "—"}</span>
                            <span className="block italic mt-0.5">{item.notes || "No notes"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusColor(item.discrepancyStatus || "")}`}>
                              {item.discrepancyStatus || "OPEN"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {item.resolvedBy ? (
                              <>
                                <span className="font-semibold text-foreground block">{item.resolvedBy.name}</span>
                                <span className="block italic mt-0.5">{item.resolutionNotes || "No notes"}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground/60 italic">Awaiting review</span>
                            )}
                          </td>
                          {cycle.status === "IN_PROGRESS" && isManager && (
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => openResolveModal(item)}
                                className="px-2.5 py-1 bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground border border-border rounded text-[10px] font-semibold cursor-pointer transition-all shadow-sm"
                              >
                                Review
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "activity" && activity && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
              <History size={16} />
              <span>Audit Timeline Activity Logs</span>
            </h3>

            {activity.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No activities recorded for this audit cycle.</p>
            ) : (
              <div className="relative border-l border-border/70 pl-5 ml-2.5 space-y-6">
                {activity.map((act) => (
                  <div key={act.id} className="relative">
                    <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-background border-2 border-primary flex items-center justify-center" />

                    <div className="text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">{act.actor?.name || "System"}</span>{" "}
                      <span className="text-foreground">{act.action.replace("AUDIT_", "").toLowerCase().replace(/_/g, " ")}</span>
                      {(act.metadata as { tag?: string } | null)?.tag && (
                        <span> — Asset <strong className="text-foreground font-mono">{(act.metadata as { tag?: string }).tag}</strong></span>
                      )}
                      <span className="block text-[10px] text-muted-foreground/80 mt-1">{formatDate(act.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* VERIFICATION DIALOG MODAL */}
      {verifyModalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground">Verify Asset Checklist Item</h3>
              <button onClick={() => setVerifyModalItem(null)} className="p-1 hover:bg-muted rounded text-muted-foreground cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
              <div>
                <p className="font-bold text-foreground">
                  Asset Tag: <span className="font-mono text-primary font-black">AF-{String(verifyModalItem.asset.tagNumber).padStart(4, "0")}</span>
                </p>
                <p className="text-muted-foreground mt-0.5">{verifyModalItem.asset.name}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-card-foreground">Verification Result</label>
                <div className="flex gap-2">
                  {(["VERIFIED", "MISSING", "DAMAGED"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVerifyVerification(v)}
                      className={`flex-1 py-2 text-center rounded border font-bold uppercase transition-all cursor-pointer ${
                        verifyVerification === v
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-card-foreground">Observed Location</label>
                <input
                  type="text"
                  placeholder="e.g. Desk F14 (Leave blank if same as expected)"
                  value={verifyObservedLocation}
                  onChange={(e) => setVerifyObservedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border hover:border-accent-foreground/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                />
                <span className="text-[10px] text-muted-foreground block">Expected: {verifyModalItem.expectedLocation || "N/A"}</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-card-foreground flex items-center justify-between">
                  <span>Inspection Notes</span>
                  {["MISSING", "DAMAGED"].includes(verifyVerification) && (
                    <span className="text-[9px] text-rose-500 font-bold">Notes Required</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide physical condition details or desk status..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border hover:border-accent-foreground/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setVerifyModalItem(null)}
                  disabled={isActionPending}
                  className="px-4 py-2 bg-secondary border border-border text-secondary-foreground rounded-lg hover:bg-secondary/90 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg font-semibold shadow cursor-pointer"
                >
                  {isActionPending && <Loader2 size={12} className="animate-spin" />}
                  <span>Save Verification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLUTION DIALOG MODAL */}
      {resolveModalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground font-semibold">Review Discrepancy Case</h3>
              <button onClick={() => setResolveModalItem(null)} className="p-1 hover:bg-muted rounded text-muted-foreground cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <div>
                <p className="font-bold text-foreground">
                  Asset Tag: <span className="font-mono text-primary font-black">AF-{String(resolveModalItem.asset.tagNumber).padStart(4, "0")}</span>
                </p>
                <p className="text-muted-foreground mt-0.5">{resolveModalItem.asset.name}</p>
                <p className="text-rose-500 font-semibold mt-1 uppercase tracking-wide">
                  Flagged as {resolveModalItem.verification.toLowerCase()} by auditor {resolveModalItem.verifiedBy?.name}
                </p>
                {resolveModalItem.notes && (
                  <p className="p-2 rounded bg-muted text-[10px] text-muted-foreground mt-1.5 italic">
                    Auditor notes: &quot;{resolveModalItem.notes}&quot;
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-card-foreground">Review Resolution Status</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value as "CONFIRMED" | "RESOLVED" | "DISMISSED")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-muted-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="CONFIRMED">CONFIRMED (Approve discrepancy and update asset state at closure)</option>
                  <option value="RESOLVED">RESOLVED (Problem was corrected. Discrepancy resolved before closure)</option>
                  <option value="DISMISSED">DISMISSED (False positive or incorrect verification)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-card-foreground flex items-center justify-between">
                  <span>Manager Review Notes</span>
                  {["RESOLVED", "DISMISSED"].includes(resolveStatus) && (
                    <span className="text-[9px] text-rose-500 font-bold">Notes Required</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide resolution audit notes (e.g., 'Confirmed item is missing and user notified' or 'Asset was found on another desk')..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border hover:border-accent-foreground/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setResolveModalItem(null)}
                  disabled={isActionPending}
                  className="px-4 py-2 bg-secondary border border-border text-secondary-foreground rounded-lg hover:bg-secondary/90 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg font-semibold shadow cursor-pointer"
                >
                  {isActionPending && <Loader2 size={12} className="animate-spin" />}
                  <span>Save Resolution</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE AUDIT CONFIRMATION MODAL */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground font-semibold flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                <span>Confirm Audit Closure</span>
              </h3>
              <button onClick={() => setIsCloseModalOpen(false)} className="p-1 hover:bg-muted rounded text-muted-foreground cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Closing the audit cycle will permanently lock the records against edits. Confirmed discrepancies will update assets:
              </p>

              <div className="p-3 bg-muted rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Scoped Assets:</span>
                  <span className="font-bold text-foreground">{metrics.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verified Assets:</span>
                  <span className="font-bold text-foreground">{metrics.verified}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed Missing (Will become LOST):</span>
                  <span className="font-bold text-rose-500">{confirmedMissing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed Damaged (Will update to DAMAGED condition):</span>
                  <span className="font-bold text-rose-600">{confirmedDamaged}</span>
                </div>
              </div>

              {hasCloseBlockers ? (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">Close Blockers Active</h5>
                    <p className="mt-0.5 leading-relaxed text-[10px]">
                      This audit cannot be closed because{" "}
                      {metrics.pending > 0 && <strong className="font-bold">{metrics.pending} assets are still pending</strong>}
                      {metrics.pending > 0 && metrics.openDiscrepancies > 0 && " and "}
                      {metrics.openDiscrepancies > 0 && <strong className="font-bold">{metrics.openDiscrepancies} discrepancies are awaiting review</strong>}
                      . Please complete verification and review all discrepancies first.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-start gap-2.5">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">Eligible for Closure</h5>
                    <p className="mt-0.5 leading-relaxed text-[10px]">
                      All checklist items have been checked and all discrepancies reviewed. It is safe to close this audit.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  disabled={isActionPending}
                  className="px-4 py-2 bg-secondary border border-border text-secondary-foreground rounded-lg hover:bg-secondary/90 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isActionPending || hasCloseBlockers}
                  onClick={handleCloseAudit}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg font-semibold shadow cursor-pointer disabled:opacity-50"
                >
                  {isActionPending && <Loader2 size={12} className="animate-spin" />}
                  <span>Close Audit Permanently</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
