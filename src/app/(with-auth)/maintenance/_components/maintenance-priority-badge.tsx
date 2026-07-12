const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400",
  MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  HIGH: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  CRITICAL: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
};

export function MaintenancePriorityBadge({ priority }: { priority: string }) {
  const style =
    PRIORITY_STYLES[priority] ?? "bg-muted text-muted-foreground border-border";
  const label = PRIORITY_LABELS[priority] ?? priority;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
