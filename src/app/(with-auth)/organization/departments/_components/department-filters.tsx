"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";

export function DepartmentFilters({
  initialSearch,
  initialStatus,
}: {
  initialSearch: string;
  initialStatus: "ALL" | "ACTIVE" | "INACTIVE";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<number | null>(null);

  function updateFilters(nextSearch: string, nextStatus: "ALL" | "ACTIVE" | "INACTIVE") {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    } else {
      params.delete("search");
    }

    if (nextStatus !== "ALL") {
      params.set("status", nextStatus);
    } else {
      params.delete("status");
    }

    const query = params.toString();

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground">
        <Search className="size-4" />
        <input
          type="search"
          name="search"
          defaultValue={initialSearch}
          onChange={(event) => {
            const nextSearch = event.target.value;
            const nextStatus =
              (
                event.currentTarget.form?.elements.namedItem("status") as HTMLSelectElement | null
              )?.value ?? "ALL";

            if (timeoutRef.current) {
              window.clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = window.setTimeout(() => {
              updateFilters(
                nextSearch,
                nextStatus as "ALL" | "ACTIVE" | "INACTIVE"
              );
            }, 250);
          }}
          placeholder="Search by department, code, head, or parent"
          className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      <select
        name="status"
        defaultValue={initialStatus}
        onChange={(event) => {
          const nextStatus = event.target.value as "ALL" | "ACTIVE" | "INACTIVE";
          const nextSearch =
            (
              event.currentTarget.form?.elements.namedItem("search") as HTMLInputElement | null
            )?.value ?? "";

          updateFilters(nextSearch, nextStatus);
        }}
        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none sm:w-44"
      >
        <option value="ALL">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>

      <Link
        href="/organization/departments/create"
        className={buttonVariants({ size: "lg", className: "px-5" })}
      >
        Add
      </Link>

      {isPending ? (
        <span className="text-xs text-muted-foreground">Updating...</span>
      ) : null}
    </form>
  );
}
