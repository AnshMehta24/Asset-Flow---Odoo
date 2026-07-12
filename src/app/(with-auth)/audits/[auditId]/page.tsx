"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Calendar,
  Building,
  MapPin,
  Users,
  Play,
  ShieldCheck,
  Edit,
  Download,
  ClipboardCheck,
  AlertTriangle,
  FolderOpen,
  User,
  History,
  CheckCircle,
  Eye,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";

interface Auditor {
  auditor: {
    id: string;
    name: string;
    email: string;
  };
}

interface AuditCycle {
  id: string;
  name: string;
  status: "PLANNED" | "IN_PROGRESS" | "CLOSED";
  departmentId: string | null;
  department: { id: string; name: string; code: string } | null;
  location: string | null;
  startDate: string;
  endDate: string;
  createdById: string;
  createdBy: { id: string; name: string };
  startedById: string | null;
  startedBy: { id: string; name: string } | null;
  startedAt: string | null;
  closedById: string | null;
  closedBy: { id: string; name: string } | null;
  closedAt: string | null;
  createdAt: string;
  auditors: Auditor[];
}

interface AuditMetrics {
  total: number;
  pending: number;
  verified: number;
  missing: number;
  damaged: number;
  completed: number;
  percentage: number;
  openDiscrepancies: number;
}

interface ChecklistItem {
  id: string;
  verification: "PENDING" | "VERIFIED" | "MISSING" | "DAMAGED";
  discrepancyStatus: "OPEN" | "CONFIRMED" | "RESOLVED" | "DISMISSED" | null;
  expectedLocation: string | null;
  observedLocation: string | null;
  notes: string | null;
  verifiedById: string | null;
  verifiedBy: { name: string } | null;
  verifiedAt: string | null;
  resolutionNotes: string | null;
  resolvedById: string | null;
  resolvedBy: { name: string } | null;
  resolvedAt: string | null;
  asset: {
    id: string;
    tagNumber: number;
    name: string;
    serialNumber: string | null;
    location: string | null;
    status: string;
    condition: string;
    category: { name: string };
  };
}

interface ActivityLog {
  id: string;
  action: string;
  actor: { name: string } | null;
  createdAt: string;
  metadata: any;
}

export default function AuditDetailPage() {
  const router = useRouter();
  const params = useParams();
  const auditId = params.auditId as string;

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "checklist" | "discrepancies" | "activity">("overview");

  // Summary and currentUser states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cycle, setCycle] = useState<AuditCycle | null>(null);
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Tab 1: Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistPage, setChecklistPage] = useState(1);
  const [checklistTotalPages, setChecklistTotalPages] = useState(1);
  const [checklistSearch, setChecklistSearch] = useState("");
  const [checklistVerification, setChecklistVerification] = useState("");
  const [checklistLocation, setChecklistLocation] = useState("");
  const [checklistCheckedByMe, setChecklistCheckedByMe] = useState(false);
  const [isChecklistLoading, setIsChecklistLoading] = useState(false);

  // Tab 2: Discrepancies state
  const [discrepancyItems, setDiscrepancyItems] = useState<ChecklistItem[]>([]);
  const [discrepancyStatusFilter, setDiscrepancyStatusFilter] = useState("ALL");
  const [isDiscrepanciesLoading, setIsDiscrepanciesLoading] = useState(false);

  // Tab 3: Activity logs state
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  // Verification Dialog Modals
  const [verifyModalItem, setVerifyModalItem] = useState<ChecklistItem | null>(null);
  const [verifyVerification, setVerifyVerification] = useState<"VERIFIED" | "MISSING" | "DAMAGED">("VERIFIED");
  const [verifyObservedLocation, setVerifyObservedLocation] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [isVerifySubmitting, setIsVerifySubmitting] = useState(false);

  // Resolution Dialog Modals
  const [resolveModalItem, setResolveModalItem] = useState<ChecklistItem | null>(null);
  const [resolveStatus, setResolveStatus] = useState<"CONFIRMED" | "RESOLVED" | "DISMISSED">("CONFIRMED");
  const [resolveNotes, setResolveNotes] = useState("");
  const [isResolveSubmitting, setIsResolveSubmitting] = useState(false);

  // Close Audit Dialog Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCloseSubmitting, setIsCloseSubmitting] = useState(false);

  // Load Main Audit Metadata
  const loadAuditSummary = async () => {
    setIsSummaryLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const userData = await meRes.json();
        setCurrentUser(userData);
      }

      const res = await fetch(`/api/audits/${auditId}`);
      if (res.ok) {
        const data = await res.json();
        setCycle(data.audit);
        setMetrics(data.metrics);
      } else {
        toast.error("Failed to load audit summary.");
      }
    } catch (err) {
      toast.error("An error occurred loading audit details.");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (auditId) {
      loadAuditSummary();
    }
  }, [auditId]);

  // Load Checklist Items
  const loadChecklist = async () => {
    setIsChecklistLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(checklistPage));
      if (checklistSearch) params.append("search", checklistSearch);
      if (checklistVerification) params.append("verification", checklistVerification);
      if (checklistLocation) params.append("location", checklistLocation);
      if (checklistCheckedByMe) params.append("checkedByMe", "true");

      const res = await fetch(`/api/audits/${auditId}/items?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setChecklistItems(data.items);
        setChecklistTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error("Checklist load error:", err);
    } finally {
      setIsChecklistLoading(false);
    }
  };

  // Load Discrepancies
  const loadDiscrepancies = async () => {
    setIsDiscrepanciesLoading(true);
    try {
      const params = new URLSearchParams();
      if (discrepancyStatusFilter !== "ALL") {
        params.append("resolutionStatus", discrepancyStatusFilter);
      }
      const res = await fetch(`/api/audits/${auditId}/discrepancies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDiscrepancyItems(data);
      }
    } catch (err) {
      console.error("Discrepancies load error:", err);
    } finally {
      setIsDiscrepanciesLoading(false);
    }
  };

  // Load Activity Logs
  const loadActivityLogs = async () => {
    setIsActivityLoading(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error("Activity load error:", err);
    } finally {
      setIsActivityLoading(false);
    }
  };

  // Triggers reload based on tab select
  useEffect(() => {
    if (!cycle) return;
    if (activeTab === "checklist") loadChecklist();
    else if (activeTab === "discrepancies") loadDiscrepancies();
    else if (activeTab === "activity") loadActivityLogs();
  }, [
    activeTab,
    checklistPage,
    checklistSearch,
    checklistVerification,
    checklistLocation,
    checklistCheckedByMe,
    discrepancyStatusFilter,
    cycle
  ]);

  // Handle Start Cycle
  const handleStartAudit = async () => {
    if (!confirm("Are you sure you want to start this audit?")) return;
    try {
      const res = await fetch(`/api/audits/${auditId}/start`, { method: "POST" });
      if (res.ok) {
        toast.success("Audit started successfully.");
        loadAuditSummary();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to start audit.");
      }
    } catch (err) {
      toast.error("Error starting audit.");
    }
  };

  // Open Verify modal
  const openVerifyModal = (item: ChecklistItem) => {
    setVerifyModalItem(item);
    setVerifyVerification(item.verification !== "PENDING" ? item.verification : "VERIFIED");
    setVerifyObservedLocation(item.observedLocation || item.expectedLocation || "");
    setVerifyNotes(item.notes || "");
  };

  // Submit Auditor verification
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalItem) return;

    if (["MISSING", "DAMAGED"].includes(verifyVerification) && !verifyNotes.trim()) {
      toast.error("Notes are required for missing or damaged assets.");
      return;
    }

    setIsVerifySubmitting(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/items/${verifyModalItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification: verifyVerification,
          observedLocation: verifyObservedLocation.trim() || null,
          notes: verifyNotes.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success("Checklist item updated.");
        setVerifyModalItem(null);
        loadChecklist();
        loadAuditSummary(); // Update metrics counts
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update item.");
      }
    } catch (err) {
      toast.error("Error updating item.");
    } finally {
      setIsVerifySubmitting(false);
    }
  };

  // Open Resolution modal
  const openResolveModal = (item: ChecklistItem) => {
    setResolveModalItem(item);
    setResolveStatus(item.discrepancyStatus !== "OPEN" && item.discrepancyStatus ? item.discrepancyStatus : "CONFIRMED");
    setResolveNotes(item.resolutionNotes || "");
  };

  // Submit discrepancy resolution review
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalItem) return;

    if (["RESOLVED", "DISMISSED"].includes(resolveStatus) && !resolveNotes.trim()) {
      toast.error("Resolution notes are required for resolved or dismissed discrepancies.");
      return;
    }

    setIsResolveSubmitting(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/items/${resolveModalItem.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: resolveStatus,
          resolutionNotes: resolveNotes.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success("Discrepancy reviewed and updated.");
        setResolveModalItem(null);
        loadDiscrepancies();
        loadAuditSummary(); // Update metrics counts
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit resolution.");
      }
    } catch (err) {
      toast.error("Error resolving discrepancy.");
    } finally {
      setIsResolveSubmitting(false);
    }
  };

  // Handle Close Cycle Submission
  const handleCloseAudit = async () => {
    setIsCloseSubmitting(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/close`, { method: "POST" });
      if (res.ok) {
        toast.success("Audit cycle closed successfully.");
        setIsCloseModalOpen(false);
        loadAuditSummary();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to close audit cycle.");
      }
    } catch (err) {
      toast.error("Error closing audit.");
    } finally {
      setIsCloseSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
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
  };

  if (isSummaryLoading) {
    return (
      <div className="flex-1 py-32 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="text-xs font-semibold mt-3">Loading cycle details...</p>
      </div>
    );
  }

  if (!cycle || !metrics) {
    return (
      <div className="flex-1 py-20 text-center text-muted-foreground">
        <AlertTriangle size={36} className="mx-auto mb-3 text-destructive" />
        <p className="text-sm font-semibold">Audit cycle not found or access denied.</p>
        <Link href="/audits" className="text-xs text-primary underline mt-2 inline-block">Back to list</Link>
      </div>
    );
  }

  const isUserAuditor = cycle.auditors.some((a) => a.auditor.id === currentUser?.id);
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "ASSET_MANAGER";
  const isAdmin = currentUser?.role === "ADMIN";

  // Check if closed blockers exist
  const hasCloseBlockers = metrics.pending > 0 || metrics.openDiscrepancies > 0;

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto relative">
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

        {/* Action Controls */}
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

              <button
                onClick={handleStartAudit}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-lg shadow active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play size={14} fill="currentColor" />
                <span>Start Audit</span>
              </button>
            </>
          )}

          {isManager && cycle.status === "IN_PROGRESS" && (
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
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "overview"
              ? "border-primary text-foreground font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("checklist")}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "checklist"
              ? "border-primary text-foreground font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Checklist ({metrics.total})
        </button>
        <button
          onClick={() => setActiveTab("discrepancies")}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "discrepancies"
              ? "border-primary text-foreground font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Discrepancies ({metrics.openDiscrepancies + metrics.missing + metrics.damaged - metrics.pending - metrics.verified})
          {/* Note: this calculates discrepancy items list count */}
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "activity"
              ? "border-primary text-foreground font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Activity Log
        </button>
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Metrics cards (Left) */}
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

              {/* Progress Detail */}
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

            {/* Auditors List (Right Sidebar) */}
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

        {/* CHECKLIST TAB */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            {/* Checklist Filters */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by tag, name, or serial number..."
                  value={checklistSearch}
                  onChange={(e) => {
                    setChecklistSearch(e.target.value);
                    setChecklistPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-1.5 bg-background border border-border hover:border-accent-foreground/20 rounded-lg text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <select
                  value={checklistVerification}
                  onChange={(e) => {
                    setChecklistVerification(e.target.value);
                    setChecklistPage(1);
                  }}
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
                    checked={checklistCheckedByMe}
                    onChange={(e) => {
                      setChecklistCheckedByMe(e.target.checked);
                      setChecklistPage(1);
                    }}
                    className="rounded border-border text-primary focus:ring-ring size-3.5 cursor-pointer"
                  />
                  <span>Checked by me</span>
                </label>
              </div>
            </div>

            {/* Checklist Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {isChecklistLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                  <RefreshCw size={24} className="animate-spin text-primary" />
                  <p className="text-xs font-semibold mt-2">Loading items...</p>
                </div>
              ) : checklistItems.length === 0 ? (
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
                      {checklistItems.map((item) => (
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

            {/* Checklist Pagination */}
            {checklistTotalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                <span>Page <strong>{checklistPage}</strong> of {checklistTotalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={checklistPage === 1}
                    onClick={() => setChecklistPage((p) => p - 1)}
                    className="px-3 py-1 bg-card border border-border rounded hover:bg-muted cursor-pointer disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={checklistPage === checklistTotalPages}
                    onClick={() => setChecklistPage((p) => p + 1)}
                    className="px-3 py-1 bg-card border border-border rounded hover:bg-muted cursor-pointer disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DISCREPANCIES TAB */}
        {activeTab === "discrepancies" && (
          <div className="space-y-4">
            {/* Discrepancy Filters */}
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Discrepancies includes all missing or damaged assets.</span>
              <select
                value={discrepancyStatusFilter}
                onChange={(e) => setDiscrepancyStatusFilter(e.target.value)}
                className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 text-muted-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">All Resolutions</option>
                <option value="OPEN">Open Discrepancies</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>

            {/* Discrepancy Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {isDiscrepanciesLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                  <RefreshCw size={24} className="animate-spin text-primary" />
                  <p className="text-xs font-semibold mt-2">Loading discrepancies...</p>
                </div>
              ) : discrepancyItems.length === 0 ? (
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
                      {discrepancyItems.map((item) => (
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

        {/* ACTIVITY LOG TAB */}
        {activeTab === "activity" && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
              <History size={16} />
              <span>Audit Timeline Activity Logs</span>
            </h3>

            {isActivityLoading ? (
              <div className="py-12 flex items-center justify-center text-muted-foreground">
                <RefreshCw size={20} className="animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No activities recorded for this audit cycle.</p>
            ) : (
              <div className="relative border-l border-border/70 pl-5 ml-2.5 space-y-6">
                {activities.map((act) => (
                  <div key={act.id} className="relative">
                    {/* Circle icon marker on line */}
                    <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-background border-2 border-primary flex items-center justify-center" />
                    
                    <div className="text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">{act.actor?.name || "System"}</span>{" "}
                      <span className="text-foreground">{act.action.replace("AUDIT_", "").toLowerCase().replace(/_/g, " ")}</span>
                      {act.metadata?.tag && (
                        <span> — Asset <strong className="text-foreground font-mono">{act.metadata.tag}</strong></span>
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

              {/* Verification Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-card-foreground">Verification Result</label>
                <div className="flex gap-2">
                  {["VERIFIED", "MISSING", "DAMAGED"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVerifyVerification(v as any)}
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

              {/* Observed location */}
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

              {/* Notes */}
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setVerifyModalItem(null)}
                  disabled={isVerifySubmitting}
                  className="px-4 py-2 bg-secondary border border-border text-secondary-foreground rounded-lg hover:bg-secondary/90 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifySubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg font-semibold shadow cursor-pointer"
                >
                  {isVerifySubmitting && <Loader2 size={12} className="animate-spin" />}
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
                    Auditor notes: "{resolveModalItem.notes}"
                  </p>
                )}
              </div>

              {/* Resolution options */}
              <div className="space-y-1.5">
                <label className="font-bold text-card-foreground">Review Resolution Status</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-muted-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="CONFIRMED">CONFIRMED (Approve discrepancy and update asset state at closure)</option>
                  <option value="RESOLVED">RESOLVED (Problem was corrected. Discrepancy resolved before closure)</option>
                  <option value="DISMISSED">DISMISSED (False positive or incorrect verification)</option>
                </select>
              </div>

              {/* Resolution Notes */}
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setResolveModalItem(null)}
                  disabled={isResolveSubmitting}
                  className="px-4 py-2 bg-secondary border border-border text-secondary-foreground rounded-lg hover:bg-secondary/90 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolveSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg font-semibold shadow cursor-pointer"
                >
                  {isResolveSubmitting && <Loader2 size={12} className="animate-spin" />}
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

              {/* Metrics Recap list */}
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
                  <span className="font-bold text-rose-500">
                    {discrepancyItems.filter((i) => i.verification === "MISSING" && i.discrepancyStatus === "CONFIRMED").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed Damaged (Will update to DAMAGED condition):</span>
                  <span className="font-bold text-rose-600">
                    {discrepancyItems.filter((i) => i.verification === "DAMAGED" && i.discrepancyStatus === "CONFIRMED").length}
                  </span>
                </div>
              </div>

              {/* Close Blockers Warning */}
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

              {/* Action controls */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  disabled={isCloseSubmitting}
                  className="px-4 py-2 bg-secondary border border-border text-secondary-foreground rounded-lg hover:bg-secondary/90 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isCloseSubmitting || hasCloseBlockers}
                  onClick={handleCloseAudit}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg font-semibold shadow cursor-pointer disabled:opacity-50"
                >
                  {isCloseSubmitting && <Loader2 size={12} className="animate-spin" />}
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
