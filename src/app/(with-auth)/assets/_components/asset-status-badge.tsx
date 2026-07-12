export const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  ALLOCATED: "Allocated",
  RESERVED: "Reserved",
  UNDER_MAINTENANCE: "Maintenance",
  LOST: "Lost",
  RETIRED: "Retired",
  DISPOSED: "Disposed",
};

export const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  DAMAGED: "Damaged",
};

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE:
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  ALLOCATED:
    "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  RESERVED:
    "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30",
  UNDER_MAINTENANCE:
    "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  LOST:
    "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  RETIRED:
    "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/30",
  DISPOSED:
    "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/30",
};

const CONDITION_STYLES: Record<string, string> = {
  NEW: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  GOOD: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  FAIR: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  POOR: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
  DAMAGED: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
};

export function AssetStatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status] ??
    "bg-muted text-muted-foreground border-border";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${style} select-none`}
    >
      {label}
    </span>
  );
}

export function AssetConditionBadge({ condition }: { condition: string }) {
  const style =
    CONDITION_STYLES[condition] ??
    "bg-muted text-muted-foreground border-border";
  const label = CONDITION_LABELS[condition] ?? condition;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${style} select-none`}
    >
      {label}
    </span>
  );
}
