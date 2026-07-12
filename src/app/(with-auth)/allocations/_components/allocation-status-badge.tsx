"use client";

import { cn } from "@/lib/utils";

const STATUS_MAP: Record<
  string,
  { label: string; classes: string }
> = {
  ACTIVE: {
    label: "Active",
    classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  },
  RETURNED: {
    label: "Returned",
    classes: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/30",
  },
  OVERDUE: {
    label: "Overdue",
    classes: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  },
  RETURN_PENDING: {
    label: "Return Pending",
    classes: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  },
  // Transfer statuses
  REQUESTED: {
    label: "Pending",
    classes: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  },
  APPROVED: {
    label: "Approved",
    classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  },
  REJECTED: {
    label: "Rejected",
    classes: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  },
  RE_ALLOCATED: {
    label: "Completed",
    classes: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  },
};

export function AllocationStatusBadge({
  status,
  isOverdue,
  hasReturnPending,
  className,
}: {
  status: string;
  isOverdue?: boolean;
  hasReturnPending?: boolean;
  className?: string;
}) {
  const key =
    isOverdue && status === "ACTIVE"
      ? "OVERDUE"
      : hasReturnPending && status === "ACTIVE"
      ? "RETURN_PENDING"
      : status;

  const config = STATUS_MAP[key] ?? {
    label: key,
    classes: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase select-none",
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
