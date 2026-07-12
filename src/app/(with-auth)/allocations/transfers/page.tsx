import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/user";
import { getTransferList } from "../_lib/allocation-data";
import { AllocationStatusBadge } from "../_components/allocation-status-badge";
import { Pagination } from "@/components/ui/pagination";
import { ArrowLeft, ArrowLeftRight, Eye } from "lucide-react";

export const metadata = { title: "Transfer Requests — AssetFlow" };

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = params.status || "ALL";

  const { transfers, totalCount, totalPages } = await getTransferList({
    status: status === "ALL" ? undefined : status,
    page,
  });

  const canApprove = ["ADMIN", "ASSET_MANAGER"].includes(user.role);

  const statusTabs = [
    { value: "ALL", label: "All" },
    { value: "REQUESTED", label: "Pending" },
    { value: "RE_ALLOCATED", label: "Completed" },
    { value: "REJECTED", label: "Rejected" },
  ];

  const currentStatus = params.status ?? "ALL";

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <Link
        href="/allocations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Allocations
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transfer Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve asset transfer requests.
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "ALL" ? "/allocations/transfers" : `/allocations/transfers?status=${tab.value}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentStatus === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.value === "REQUESTED" && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 text-xs font-semibold leading-none">
                {totalCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Table */}
      {transfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ArrowLeftRight className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No transfer requests</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Transfer requests will appear here when raised.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requested By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/assets/${t.asset.id}`} className="group flex flex-col">
                        <span className="font-mono text-xs text-muted-foreground">{t.asset.tag}</span>
                        <span className="font-medium group-hover:text-primary transition-colors">{t.asset.name}</span>
                        <span className="text-xs text-muted-foreground">{t.asset.category.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {t.fromEmployee?.name ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {t.toEmployee?.name ?? t.toDepartment?.name ?? "—"}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {t.toEmployee ? "Employee" : t.toDepartment ? "Department" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.requestedBy.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <AllocationStatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/allocations/transfers/${t.id}`}
                        className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title={canApprove && t.status === "REQUESTED" ? "Review Request" : "View Details"}
                      >
                        <Eye className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
      )}
    </div>
  );
}
