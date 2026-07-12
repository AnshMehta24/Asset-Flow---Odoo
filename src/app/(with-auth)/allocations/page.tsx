import Link from "next/link";
import {
  getAllocationList,
  getAllocationStats,
  getActiveDepartments,
} from "./_lib/allocation-data";
import { requireCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { AllocationStatusBadge } from "./_components/allocation-status-badge";
import { AllocationFilters } from "./_components/allocation-filters";
import { Pagination } from "@/components/ui/pagination";
import {
  ArrowLeftRight,
  Plus,
  Users,
  RotateCcw,
  AlertTriangle,
  Eye,
} from "lucide-react";

export const metadata = { title: "Allocation & Transfer — AssetFlow" };

function isOverdue(expectedReturnDate: string | null, status: string) {
  if (!expectedReturnDate || status !== "ACTIVE") return false;
  return new Date(expectedReturnDate) < new Date();
}

export default async function AllocationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const status = params.status ?? "ALL";
  const departmentId = params.departmentId ?? "";
  const page = Number(params.page) || 1;

  const [{ allocations, totalCount, totalPages }, stats, departments] = await Promise.all([
    getAllocationList({ search, status, departmentId, page }),
    getAllocationStats(),
    getActiveDepartments(),
  ]);

  const canAllocate = ["ADMIN", "ASSET_MANAGER"].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Allocation &amp; Transfer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage asset allocations, returns, and transfer requests.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/allocations/transfers"
            className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <ArrowLeftRight className="size-4" />
            Transfer Requests
            {stats.pendingTransfer > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-white leading-none">
                {stats.pendingTransfer}
              </span>
            )}
          </Link>
          {canAllocate && (
            <Link
              href="/allocations/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              New Allocation
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Active",
            value: stats.active,
            icon: Users,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Overdue",
            value: stats.overdue,
            icon: AlertTriangle,
            color: "text-red-500",
            bg: "bg-red-500/10",
          },
          {
            label: "Return Pending",
            value: stats.pendingReturn,
            icon: RotateCcw,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
          {
            label: "Transfer Pending",
            value: stats.pendingTransfer,
            icon: ArrowLeftRight,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
          >
            <div className={`rounded-lg p-2 ${s.bg}`}>
              <s.icon className={`size-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <AllocationFilters
        initialSearch={search}
        initialStatus={status}
        initialDepartmentId={departmentId}
        departments={departments}
      />

      {/* Table */}
      {allocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No allocations found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {canAllocate
              ? "Start by allocating an available asset to an employee or department."
              : "No allocations match your filters."}
          </p>
          {canAllocate && (
            <Link
              href="/allocations/new"
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              New Allocation
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Allocated To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Allocated By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Since
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allocations.map((a) => {
                  const overdue = isOverdue(a.expectedReturnDate, a.status);
                  const returnPending =
                    a.status === "ACTIVE" &&
                    !!a.returnRequestedAt &&
                    !a.returnedAt;

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        overdue ? "bg-red-50/30 dark:bg-red-950/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/assets/${a.asset.id}`}
                          className="group flex flex-col"
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            {a.asset.tag}
                          </span>
                          <span className="font-medium group-hover:text-primary transition-colors">
                            {a.asset.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {a.asset.category.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {a.employee ? (
                          <div>
                            <p className="font-medium">{a.employee.name}</p>
                            <p className="text-xs text-muted-foreground">Employee</p>
                          </div>
                        ) : a.department ? (
                          <div>
                            <p className="font-medium">{a.department.name}</p>
                            <p className="text-xs text-muted-foreground">Department</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {a.allocatedBy.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(a.allocatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {a.expectedReturnDate ? (
                          <span
                            className={`text-sm ${
                              overdue
                                ? "text-red-600 dark:text-red-400 font-semibold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {new Date(a.expectedReturnDate).toLocaleDateString()}
                            {overdue && (
                              <span className="ml-1 text-xs">(overdue)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <AllocationStatusBadge
                          status={a.status}
                          isOverdue={overdue}
                          hasReturnPending={returnPending}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/allocations/${a.id}`}
                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          title="View Details"
                        >
                          <Eye className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
      )}
    </div>
  );
}
