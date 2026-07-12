"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type Props = {
  initialSearch: string;
  initialStatus: string;
  initialAssignedToMe: boolean;
};

export function AuditFiltersBar({ initialSearch, initialStatus, initialAssignedToMe }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v && v !== "ALL" && v !== "false") {
        params.set(k, v);
      } else {
        params.delete(k);
      }
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search by audit name..."
          defaultValue={initialSearch}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border hover:border-accent-foreground/20 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          defaultValue={initialStatus}
          onChange={(e) => updateFilters({ status: e.target.value })}
          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-muted-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="CLOSED">Closed</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer font-semibold select-none">
          <input
            type="checkbox"
            defaultChecked={initialAssignedToMe}
            onChange={(e) => updateFilters({ assignedToMe: e.target.checked ? "true" : "false" })}
            className="rounded border-border text-primary focus:ring-ring size-4 cursor-pointer"
          />
          <span>Assigned to me</span>
        </label>

        {isPending && <span className="text-xs text-muted-foreground">Updating…</span>}
      </div>
    </div>
  );
}
