"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Play, Calendar, Building, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { startAuditCycle } from "../actions";
import type { getAuditCyclesForUser } from "@/lib/audits/audit.queries";

type Cycle = Awaited<ReturnType<typeof getAuditCyclesForUser>>[number];

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusStyle(status: Cycle["status"]) {
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
}

export function AuditGrid({ cycles, isAdmin }: { cycles: Cycle[]; isAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStartAudit(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        "Are you sure you want to start this audit cycle? This will lock the audit scope and allow auditors to verify checklist items."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await startAuditCycle(id);
      if (result.success) {
        toast.success("Audit cycle started successfully.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cycles.map((cycle) => (
        <div
          key={cycle.id}
          onClick={() => router.push(`/audits/${cycle.id}`)}
          className="bg-card border border-border hover:border-accent-foreground/20 rounded-xl p-5 flex flex-col justify-between cursor-pointer group transition-all"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-card-foreground group-hover:text-primary transition-colors text-base line-clamp-1">
                {cycle.name}
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusStyle(cycle.status)}`}
              >
                {cycle.status.replace("_", " ")}
              </span>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              {cycle.department && (
                <div className="flex items-center gap-2">
                  <Building size={14} className="text-muted-foreground/80" />
                  <span>
                    Dept: <strong className="text-foreground font-semibold">{cycle.department.name}</strong>
                  </span>
                </div>
              )}
              {cycle.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground/80" />
                  <span>
                    Location: <strong className="text-foreground font-semibold">{cycle.location}</strong>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground/80" />
                <span>
                  {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                </span>
              </div>
            </div>

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

          <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              <strong>{cycle._count.items}</strong> assets tracked
            </span>

            <div className="flex items-center gap-2">
              {isAdmin && cycle.status === "PLANNED" && (
                <button
                  onClick={(e) => handleStartAudit(cycle.id, e)}
                  disabled={isPending}
                  className="p-1.5 bg-primary/10 hover:bg-primary hover:text-primary-foreground border border-primary/20 rounded-lg text-primary transition-all flex items-center gap-1 disabled:opacity-50"
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
  );
}
