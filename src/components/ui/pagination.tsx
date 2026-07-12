"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  paramName?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize = 10,
  paramName = "page",
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const startEntry = (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalCount);

  function setPage(pageNumber: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, String(pageNumber));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-t border-border bg-muted/20 text-sm text-muted-foreground select-none">
      {/* Entry info */}
      <div>
        Showing <span className="font-semibold text-foreground">{startEntry}</span> to{" "}
        <span className="font-semibold text-foreground">{endEntry}</span> of{" "}
        <span className="font-semibold text-foreground">{totalCount}</span> entries
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-background transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="size-4" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
          // If total pages > 5, we can show a subset (simple rendering for now)
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold border transition-colors ${
                isActive
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background border-border text-foreground hover:bg-accent"
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-background transition-colors"
          title="Next Page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
