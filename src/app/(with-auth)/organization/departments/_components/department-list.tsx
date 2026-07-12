import Link from "next/link";
import { PencilLine } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { DepartmentListItem } from "../_lib/department-data";

export function DepartmentList({
  departments,
}: {
  departments: DepartmentListItem[];
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-border bg-background">
      <div className="grid grid-cols-[minmax(160px,1.5fr)_minmax(140px,1fr)_minmax(140px,1fr)_120px_72px] gap-4 border-b border-border bg-muted px-5 py-4 text-sm font-medium text-foreground">
        <span>Department</span>
        <span>Head</span>
        <span>Parent Dept</span>
        <span>Status</span>
        <span className="text-right">Action</span>
      </div>

      <div className="divide-y divide-border">
        {departments.length === 0 ? (
          <div className="px-5 py-12 text-sm text-muted-foreground">
            No departments created yet.
          </div>
        ) : (
          departments.map((department) => (
            <div
              key={department.id}
              className="grid grid-cols-[minmax(160px,1.5fr)_minmax(140px,1fr)_minmax(140px,1fr)_120px_72px] items-center gap-4 px-5 py-4 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {department.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {department.code}
                </p>
              </div>
              <p className="truncate text-foreground">
                {department.headName ?? "--"}
              </p>
              <p className="truncate text-foreground">
                {department.parentName ?? "--"}
              </p>
              <StatusBadge status={department.status} />
              <div className="flex justify-end">
                <Link
                  href={`/organization/departments/${department.id}/edit`}
                  aria-label={`Edit ${department.name}`}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                  <PencilLine className="size-4" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  return (
    <span className="inline-flex w-fit rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </span>
  );
}
