import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/user";
import {
  getAllocationById,
  getActiveEmployees,
  getActiveDepartments,
} from "../_lib/allocation-data";
import { AllocationStatusBadge } from "../_components/allocation-status-badge";
import { AllocationDetailActions } from "../_components/allocation-detail-actions";
import {
  ArrowLeft,
  Package,
  User,
  Building2,
  MapPin,
  Calendar,
  ArrowLeftRight,
  Clock,
  CheckCircle,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ allocationId: string }>;
}) {
  const { allocationId } = await params;
  const a = await getAllocationById(allocationId);
  return {
    title: a ? `Allocation · ${a.asset.name} — AssetFlow` : "Allocation — AssetFlow",
  };
}

function isOverdue(expectedReturnDate: string | null, status: string) {
  if (!expectedReturnDate || status !== "ACTIVE") return false;
  return new Date(expectedReturnDate) < new Date();
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default async function AllocationDetailPage({
  params,
}: {
  params: Promise<{ allocationId: string }>;
}) {
  const { allocationId } = await params;

  const user = await requireCurrentUser();
  if (!user) redirect("/login");

  const [allocation, employees, departments] = await Promise.all([
    getAllocationById(allocationId),
    getActiveEmployees(),
    getActiveDepartments(),
  ]);

  if (!allocation) notFound();

  const overdue = isOverdue(allocation.expectedReturnDate, allocation.status);
  const returnPending =
    allocation.status === "ACTIVE" &&
    !!allocation.returnRequestedAt &&
    !allocation.returnedAt;

  const canApprove = ["ADMIN", "ASSET_MANAGER"].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/allocations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Allocations
      </Link>

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">Allocation Detail</h1>
          <AllocationStatusBadge
            status={allocation.status}
            isOverdue={overdue}
            hasReturnPending={returnPending}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Created {new Date(allocation.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Overdue banner */}
      {overdue && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-5 py-4 flex items-start gap-3 text-red-700 dark:text-red-400">
          <Clock className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Overdue Return</p>
            <p className="text-sm mt-0.5">
              Expected return was{" "}
              {allocation.expectedReturnDate
                ? new Date(allocation.expectedReturnDate).toLocaleDateString()
                : "—"}
              . This allocation has not been returned yet.
            </p>
          </div>
        </div>
      )}

      {/* Return requested banner (for non-approvers to see status) */}
      {returnPending && !canApprove && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-5 py-4 flex items-start gap-3 text-amber-700 dark:text-amber-400">
          <Clock className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Return Requested</p>
            <p className="text-sm mt-0.5">
              Return was requested on{" "}
              {new Date(allocation.returnRequestedAt!).toLocaleDateString()}.
              Awaiting Asset Manager approval.
            </p>
          </div>
        </div>
      )}

      {/* RETURNED banner */}
      {allocation.status === "RETURNED" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-5 py-4 flex items-start gap-3 text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Asset Returned</p>
            <p className="text-sm mt-0.5">
              Returned on{" "}
              {allocation.returnedAt
                ? new Date(allocation.returnedAt).toLocaleDateString()
                : "—"}
              .
              {allocation.returnApprovedBy
                ? ` Approved by ${allocation.returnApprovedBy.name}.`
                : ""}
            </p>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

        {/* ── Left: 2-col info panels ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Asset info */}
          <div className="rounded-[1.5rem] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Asset</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="flex size-14 items-center justify-center rounded-xl bg-muted font-mono text-sm font-bold text-muted-foreground shrink-0">
                  <span className="text-xs">{allocation.asset.tag}</span>
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/assets/${allocation.asset.id}`}
                    className="text-xl font-bold hover:text-primary transition-colors"
                  >
                    {allocation.asset.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{allocation.asset.category.name}</p>
                  {allocation.asset.manufacturer && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {allocation.asset.manufacturer}
                      {allocation.asset.model ? ` · ${allocation.asset.model}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                <InfoRow
                  label="Condition"
                  value={
                    <span className="capitalize">
                      {allocation.asset.condition.toLowerCase()}
                    </span>
                  }
                />
                <InfoRow
                  label="Status"
                  value={
                    <span className="capitalize">
                      {allocation.asset.status.toLowerCase().replace("_", " ")}
                    </span>
                  }
                />
                {allocation.asset.location && (
                  <InfoRow
                    label="Location"
                    value={
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {allocation.asset.location}
                      </span>
                    }
                  />
                )}
              </div>
            </div>
          </div>

          {/* Current holder */}
          <div className="rounded-[1.5rem] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center gap-2">
              {allocation.employee ? (
                <User className="size-4 text-muted-foreground" />
              ) : (
                <Building2 className="size-4 text-muted-foreground" />
              )}
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Current Holder
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <InfoRow
                  label={allocation.employee ? "Employee" : "Department"}
                  value={
                    <div>
                      <p className="text-base font-semibold">
                        {allocation.employee?.name ?? allocation.department?.name ?? "—"}
                      </p>
                      {allocation.employee?.email && (
                        <p className="text-xs text-muted-foreground font-normal">
                          {allocation.employee.email}
                        </p>
                      )}
                    </div>
                  }
                />
                <InfoRow label="Allocated By" value={allocation.allocatedBy.name} />
                <InfoRow
                  label="Allocated On"
                  value={new Date(allocation.allocatedAt).toLocaleDateString()}
                />
                <InfoRow
                  label="Expected Return"
                  value={
                    allocation.expectedReturnDate ? (
                      <span className={overdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                        {new Date(allocation.expectedReturnDate).toLocaleDateString()}
                        {overdue && <span className="ml-1 text-xs font-normal">(overdue)</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No end date</span>
                    )
                  }
                />
                {allocation.returnedAt && (
                  <InfoRow
                    label="Returned On"
                    value={new Date(allocation.returnedAt).toLocaleDateString()}
                  />
                )}
                {allocation.returnRequestedAt && !allocation.returnedAt && (
                  <InfoRow
                    label="Return Requested"
                    value={new Date(allocation.returnRequestedAt).toLocaleDateString()}
                  />
                )}
                {allocation.returnConditionNotes && (
                  <div className="col-span-full">
                    <InfoRow label="Return / Condition Notes" value={allocation.returnConditionNotes} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Actions panel — only when ACTIVE ── */}
          {allocation.status === "ACTIVE" && (
            <div className="rounded-[1.5rem] border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage return, transfer, or other actions for this allocation.
                </p>
              </div>
              <div className="p-6">
                <AllocationDetailActions
                  allocation={allocation}
                  userRole={user.role}
                  employees={employees}
                  departments={departments}
                />
              </div>
            </div>
          )}

        </div>

        {/* ── Right: Timeline sidebar ── */}
        <div className="space-y-5">

          {/* Transfer Requests */}
          <div className="rounded-[1.5rem] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Transfers
                </h3>
              </div>
              {allocation.transferRequests.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {allocation.transferRequests.length}
                </span>
              )}
            </div>
            <div className="p-4">
              {allocation.transferRequests.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No transfer requests yet
                </p>
              ) : (
                <div className="space-y-2">
                  {allocation.transferRequests.map((t) => (
                    <Link
                      key={t.id}
                      href={`/allocations/transfers/${t.id}`}
                      className="block rounded-xl border border-border p-3 hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold group-hover:text-primary transition-colors">
                          → {t.toEmployee?.name ?? t.toDepartment?.name ?? "—"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            t.status === "REQUESTED"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : t.status === "RE_ALLOCATED"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {t.status === "RE_ALLOCATED"
                            ? "Completed"
                            : t.status === "REQUESTED"
                            ? "Pending"
                            : t.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()} · {t.requestedBy.name}
                      </p>
                      {t.reason && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {t.reason}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Allocation history for this asset */}
          <div className="rounded-[1.5rem] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4 flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                History
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {allocation.asset.allocations.map((hist) => (
                <div
                  key={hist.id}
                  className={`rounded-xl border p-3 text-xs ${
                    hist.id === allocation.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <p className="font-semibold mb-0.5">
                    {hist.employee?.name ?? hist.department?.name ?? "Unknown"}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(hist.allocatedAt).toLocaleDateString()}
                    {hist.returnedAt
                      ? ` → ${new Date(hist.returnedAt).toLocaleDateString()}`
                      : hist.status === "ACTIVE"
                      ? " → Present"
                      : ""}
                  </p>
                  <span
                    className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      hist.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {hist.status === "ACTIVE" ? "Active" : "Returned"}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
