"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface AllocationFiltersProps {
  initialSearch: string;
  initialStatus: string;
  initialDepartmentId: string;
  departments: { id: string; name: string }[];
}

export function AllocationFilters({
  initialSearch,
  initialStatus,
  initialDepartmentId,
  departments,
}: AllocationFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<number | null>(null);

  function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v && v !== "ALL" && v !== "") {
        params.set(k, v);
      } else {
        params.delete(k);
      }
    }
    // Always reset page to 1 when filters change
    params.set("page", "1");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  function handleSearch(value: string) {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      updateFilters({ search: value });
    }, 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        name="search"
        defaultValue={initialSearch}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search asset, employee or department…"
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
      />
      <select
        name="status"
        defaultValue={initialStatus || "ALL"}
        onChange={(e) => updateFilters({ status: e.target.value })}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="ALL">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="RETURN_PENDING">Return Pending</option>
        <option value="RETURNED">Returned</option>
      </select>
      <select
        name="departmentId"
        defaultValue={initialDepartmentId || ""}
        onChange={(e) => updateFilters({ departmentId: e.target.value })}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {isPending && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Updating…
        </span>
      )}
    </div>
  );
}
