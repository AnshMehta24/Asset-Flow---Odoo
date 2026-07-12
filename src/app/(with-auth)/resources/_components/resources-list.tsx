"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Laptop, Calendar, MapPin, RotateCcw, ShieldCheck, CheckCircle2, History, AlertTriangle } from "lucide-react";
import { requestReturn } from "../../allocations/actions";
import { AllocationStatusBadge } from "../../allocations/_components/allocation-status-badge";
import { toast } from "sonner";

import type { AllocationListItem } from "../../allocations/_lib/allocation-data";

interface ResourcesListProps {
  initialAllocations: AllocationListItem[];
}

function isOverdue(expectedReturnDate: string | null, status: string) {
  if (!expectedReturnDate || status !== "ACTIVE") return false;
  return new Date(expectedReturnDate) < new Date();
}

export function ResourcesList({ initialAllocations }: ResourcesListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [isPending, startTransition] = useTransition();
  const [requestingId, setRequestingId] = useState<string | null>(null);

  // Separate allocations into Active and Returned
  const activeAllocations = initialAllocations.filter((a) => a.status === "ACTIVE");
  const historyAllocations = initialAllocations.filter((a) => a.status === "RETURNED");

  const currentList = activeTab === "active" ? activeAllocations : historyAllocations;

  function handleRequestReturn(allocationId: string, assetName: string) {
    setRequestingId(allocationId);
    startTransition(async () => {
      try {
        const res = await requestReturn(allocationId);
        if (res.success) {
          toast.success(`Return request for "${assetName}" submitted successfully.`);
          router.refresh();
        } else {
          toast.error(res.message || "Failed to submit return request.");
        }
      } catch (err) {
        console.error("Error requesting return:", err);
        toast.error("An unexpected error occurred. Please try again.");
      } finally {
        setRequestingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Tabs Selector */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
            activeTab === "active"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Laptop className="size-4" />
          Active Allocations ({activeAllocations.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
            activeTab === "history"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="size-4" />
          History / Returned ({historyAllocations.length})
        </button>
      </div>

      {/* Grid List */}
      {currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/40 py-16 text-center backdrop-blur-sm">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Laptop className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No assets found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {activeTab === "active"
              ? "You do not have any active assets allocated to you at the moment."
              : "You have no past allocations recorded."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentList.map((a) => {
            const overdue = isOverdue(a.expectedReturnDate, a.status);
            const returnPending = a.status === "ACTIVE" && !!a.returnRequestedAt && !a.returnedAt;

            return (
              <div
                key={a.id}
                className="group relative rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Subtle gradient highlight */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative space-y-4">
                  {/* Top info and badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                        {a.asset.tag}
                      </span>
                      <h4 className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {a.asset.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">{a.asset.category.name}</p>
                    </div>
                    <AllocationStatusBadge
                      status={a.status}
                      isOverdue={overdue}
                      hasReturnPending={returnPending}
                      className="shrink-0"
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/60" />

                  {/* Allocation Details */}
                  <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      <span>Allocated: {new Date(a.allocatedAt).toLocaleDateString()}</span>
                    </div>

                    {a.status === "ACTIVE" && (
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        {a.expectedReturnDate ? (
                          <span className={overdue ? "text-red-500 font-semibold flex items-center gap-1" : ""}>
                            Due: {new Date(a.expectedReturnDate).toLocaleDateString()}
                            {overdue && <AlertTriangle className="size-3 text-red-500" />}
                          </span>
                        ) : (
                          <span>No expected return date</span>
                        )}
                      </div>
                    )}

                    {a.returnedAt && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Returned: {new Date(a.returnedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {a.asset.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        <span>Location: {a.asset.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-3.5 text-muted-foreground" />
                      <span className="capitalize">Condition: {a.asset.condition.toLowerCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Return Request Button */}
                {a.status === "ACTIVE" && (
                  <div className="mt-5 pt-3 border-t border-border/60 relative">
                    {returnPending ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20 w-full">
                        <RotateCcw className="size-3.5 animate-spin" />
                        Awaiting Return Approval
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending && requestingId === a.id}
                        onClick={() => handleRequestReturn(a.id, a.asset.name)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-secondary text-secondary-foreground border border-border hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                      >
                        <RotateCcw className="size-3.5 group-hover/btn:rotate-45 transition-transform" />
                        {isPending && requestingId === a.id ? "Submitting Request..." : "Request Return"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
