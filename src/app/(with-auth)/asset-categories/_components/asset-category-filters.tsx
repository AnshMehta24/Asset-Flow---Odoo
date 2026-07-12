"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";

export function AssetCategoryFilters({
  initialSearch,
}: {
  initialSearch: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<number | null>(null);

  function updateFilters(nextSearch: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    } else {
      params.delete("search");
    }

    const query = params.toString();

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 border border-border bg-background px-3 text-sm text-muted-foreground">
        <Search className="size-4" />
        <input
          type="search"
          defaultValue={initialSearch}
          onChange={(event) => {
            const nextSearch = event.target.value;

            if (timeoutRef.current) {
              window.clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = window.setTimeout(() => {
              updateFilters(nextSearch);
            }, 250);
          }}
          placeholder="Search by category name or description"
          className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      <Link
        href="/asset-categories/create"
        className={buttonVariants({ size: "lg", className: "px-5" })}
      >
        Add
      </Link>

      {isPending ? (
        <span className="text-xs text-muted-foreground">Updating...</span>
      ) : null}
    </div>
  );
}
