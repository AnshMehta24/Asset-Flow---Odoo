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
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  ALLOCATED:
    "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  RESERVED:
    "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  UNDER_MAINTENANCE:
    "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  LOST: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  RETIRED:
    "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400",
  DISPOSED:
    "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400",
};

const CONDITION_STYLES: Record<string, string> = {
  NEW: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  GOOD: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  FAIR: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  POOR: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  DAMAGED: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
};

export function AssetStatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status] ??
    "bg-muted text-muted-foreground border-border";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
