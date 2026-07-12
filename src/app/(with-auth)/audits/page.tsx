"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Users,
  Play,
  Calendar,
  Building,
  MapPin,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FolderSync
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

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
  department: { id: string; name: string; code: string } | null;
  location: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  createdBy: { id: string; name: string };
  auditors: Auditor[];
  _count: {
    items: number;
  };
}

export default function AuditsListPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedToMe, setAssignedToMe] = useState(false);

  // Fetch current user and list of cycles
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Get logged in user details
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData);
      }

      // 2. Fetch cycles
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (assignedToMe) params.append("assignedToMe", "true");

      const res = await fetch(`/api/audits?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCycles(data);
      }
    } catch (err) {
      toast.error("Failed to load audit cycles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, assignedToMe]);

  // Handle triggering start of audit
  const handleStartAudit = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to start this audit cycle? This will lock the audit scope and allow auditors to verify checklist items.")) {
      return;
    }

    try {
      const res = await fetch(`/api/audits/${id}/start`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Audit cycle started successfully.");
        loadData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to start audit cycle.");
      }
    } catch (err) {
      toast.error("An error occurred starting the audit.");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusStyle = (status: AuditCycle["status"]) => {
    switch (status) {
      case "PLANNED":
        return "bg-blue-500/10 border-blue-500/20 text-blue-500";
      case "IN_PROGRESS":
        return "bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse";
      case "CLOSED":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
      default:
        return "bg-muted border-border text-muted-foreground";
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Asset Verification Audits</h1>
          <p className="text-xs text-muted-foreground">Manage and track physical resource verification checklists</p>
        </div>

        {isAdmin && (
          <Link
            href="/audits/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold rounded-lg shadow active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>New Audit Cycle</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by audit name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border hover:border-accent-foreground/20 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-muted-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Assigned checkbox */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer font-semibold select-none">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(e) => setAssignedToMe(e.target.checked)}
              className="rounded border-border text-primary focus:ring-ring size-4 cursor-pointer"
            />
            <span>Assigned to me</span>
          </label>
        </div>
      </div>

      {/* Audit Cycles List grid */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
          <FolderSync size={32} className="animate-spin text-primary" />
          <p className="text-xs font-semibold mt-3">Loading audit cycles...</p>
        </div>
      ) : cycles.length === 0 ? (
        <div className="py-24 border border-border border-dashed rounded-xl text-center bg-card">
          <ClipboardCheck size={40} className="mx-auto mb-4 opacity-40 text-muted-foreground" />
          <h3 className="font-bold text-base text-foreground">No audit cycles found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            {search || statusFilter !== "ALL" || assignedToMe
              ? "Try adjusting your search query or filters to find cycles."
              : "Generate an audit cycle to begin physical resource verification."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cycles.map((cycle) => (
            <div
              key={cycle.id}
              onClick={() => router.push(`/audits/${cycle.id}`)}
              className="bg-card border border-border hover:border-accent-foreground/20 rounded-xl p-5 flex flex-col justify-between cursor-pointer group transition-all"
            >
              <div className="space-y-4">
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-card-foreground group-hover:text-primary transition-colors text-base line-clamp-1">
                    {cycle.name}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusStyle(cycle.status)}`}>
                    {cycle.status.replace("_", " ")}
                  </span>
                </div>

                {/* Scope items */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  {cycle.department && (
                    <div className="flex items-center gap-2">
                      <Building size={14} className="text-muted-foreground/80" />
                      <span>Dept: <strong className="text-foreground font-semibold">{cycle.department.name}</strong></span>
                    </div>
                  )}
                  {cycle.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-muted-foreground/80" />
                      <span>Location: <strong className="text-foreground font-semibold">{cycle.location}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-muted-foreground/80" />
                    <span>{formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}</span>
                  </div>
                </div>

                {/* Auditors */}
                <div className="pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Users size={14} />
                    <span>Auditors:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cycle.auditors.map((a) => (
                      <span
                        key={a.auditor.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-muted border border-border text-foreground font-medium"
                      >
                        {a.auditor.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions footer */}
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  <strong>{cycle._count.items}</strong> assets tracked
                </span>

                <div className="flex items-center gap-2">
                  {isAdmin && cycle.status === "PLANNED" && (
                    <button
                      onClick={(e) => handleStartAudit(cycle.id, e)}
                      className="p-1.5 bg-primary/10 hover:bg-primary hover:text-primary-foreground border border-primary/20 rounded-lg text-primary transition-all flex items-center gap-1"
                      title="Start Audit"
                    >
                      <Play size={13} fill="currentColor" />
                      <span className="text-[10px] font-bold px-1">Start</span>
                    </button>
                  )}

                  <span className="flex items-center gap-1 text-xs text-primary font-bold group-hover:translate-x-0.5 transition-transform">
                    <span>Details</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
