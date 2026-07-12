"use client";

import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";

type Props = {
  initialSearch: string;
  initialStatus: string;
  initialCategoryId: string;
  initialDepartmentId: string;
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  canRegister: boolean;
};

export function AssetFilters({
  initialSearch,
  initialStatus,
  initialCategoryId,
  initialDepartmentId,
  categories,
  departments,
  canRegister,
}: Props) {
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
    <div className="flex flex-col gap-3">
      {/* Top row: search + register button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground">
          <Search className="size-4 shrink-0" />
          <input
            type="search"
            defaultValue={initialSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by tag, name, serial, QR code or location…"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        {canRegister && (
          <Link
            href="/assets/create"
            className={buttonVariants({ size: "lg", className: "shrink-0 gap-2" })}
          >
            <Plus className="size-4" />
            Register Asset
          </Link>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        {/* Category */}
        <select
          defaultValue={initialCategoryId}
          onChange={(e) => updateFilters({ categoryId: e.target.value })}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          defaultValue={initialStatus}
          onChange={(e) => updateFilters({ status: e.target.value })}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ALLOCATED">Allocated</option>
          <option value="RESERVED">Reserved</option>
          <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          <option value="LOST">Lost</option>
          <option value="RETIRED">Retired</option>
          <option value="DISPOSED">Disposed</option>
        </select>

        {/* Department */}
        <select
          defaultValue={initialDepartmentId}
          onChange={(e) => updateFilters({ departmentId: e.target.value })}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {isPending && (
          <span className="self-center text-xs text-muted-foreground">
            Updating…
          </span>
        )}
      </div>
    </div>
  );
}
