import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/user";
import { getTransferById } from "../../_lib/allocation-data";
import { AllocationStatusBadge } from "../../_components/allocation-status-badge";
import { TransferApprovalPanel } from "../_components/transfer-approval-panel";
import { ArrowLeft, Package, User, ArrowRight } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ transferId: string }>;
}) {
  const { transferId } = await params;
  const t = await getTransferById(transferId);
  return {
    title: t ? `Transfer · ${t.asset.name} — AssetFlow` : "Transfer — AssetFlow",
  };
}

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ transferId: string }>;
}) {
  const { transferId } = await params;

  const user = await requireCurrentUser();
  if (!user) redirect("/login");

  const transfer = await getTransferById(transferId);
  if (!transfer) notFound();

  const canApprove =
    ["ADMIN", "ASSET_MANAGER"].includes(user.role) &&
    transfer.status === "REQUESTED";

  const isPending = transfer.status === "REQUESTED";
  const isCompleted = transfer.status === "RE_ALLOCATED";
  const isRejected = transfer.status === "REJECTED";

  const activeAllocation = transfer.asset.allocations[0] ?? null;
  const isAllocatedToSomeone = !!activeAllocation;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/allocations/transfers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Transfer Requests
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Transfer Request</h1>
            <AllocationStatusBadge status={transfer.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Submitted {new Date(transfer.createdAt).toLocaleString()} by{" "}
            <strong>{transfer.requestedBy.name}</strong>
          </p>
        </div>
      </div>

      {/* Double-allocation warning */}
      {isPending && isAllocatedToSomeone && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold">
            <span className="text-lg">⚠</span>
            Asset Currently Allocated
          </div>
          <p className="text-sm text-red-700 dark:text-red-400">
            <strong>{transfer.asset.name}</strong> ({transfer.asset.tag}) is currently held by{" "}
            <strong>
              {activeAllocation.employee?.name ??
                activeAllocation.department?.name ??
                "another holder"}
            </strong>
            . Approving this transfer will close the current allocation and create a new one for{" "}
            <strong>
              {transfer.toEmployee?.name ?? transfer.toDepartment?.name ?? "the recipient"}
            </strong>
            .
          </p>
        </div>
      )}

      {/* Completed banner */}
      {isCompleted && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 text-sm text-blue-700 dark:text-blue-400">
          ✓ Transfer completed on{" "}
          {transfer.approvedAt ? new Date(transfer.approvedAt).toLocaleDateString() : "—"}.
          {transfer.approvedBy && ` Approved by ${transfer.approvedBy.name}.`}
        </div>
      )}

      {/* Rejected banner */}
      {isRejected && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          ✗ Transfer rejected on{" "}
          {transfer.approvedAt ? new Date(transfer.approvedAt).toLocaleDateString() : "—"}.
          {transfer.approvedBy && ` Rejected by ${transfer.approvedBy.name}.`}
          {transfer.reason && (
            <p className="mt-1">
              <strong>Reason:</strong> {transfer.reason}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-5">
          {/* Asset */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Package className="size-3.5" />
              Asset
            </div>
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted font-mono text-sm font-bold text-muted-foreground shrink-0">
                {transfer.asset.tag}
              </div>
              <div>
                <Link
                  href={`/assets/${transfer.asset.id}`}
                  className="text-lg font-semibold hover:text-primary transition-colors"
                >
                  {transfer.asset.name}
                </Link>
                <p className="text-sm text-muted-foreground">{transfer.asset.category.name}</p>
              </div>
            </div>
          </div>

          {/* From → To */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Transfer Route
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">From</p>
                <p className="font-semibold">
                  {transfer.fromEmployee?.name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
              <ArrowRight className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <p className="font-semibold">
                  {transfer.toEmployee?.name ?? transfer.toDepartment?.name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transfer.toEmployee ? "Employee" : transfer.toDepartment ? "Department" : ""}
                </p>
              </div>
            </div>

            {transfer.reason && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-sm rounded-lg border border-border bg-muted/30 px-3 py-2">
                  {transfer.reason}
                </p>
              </div>
            )}
          </div>

          {/* Approval action panel */}
          {canApprove && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Approval Decision
              </div>
              <TransferApprovalPanel transferId={transfer.id} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </p>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Requested By</dt>
                <dd className="font-medium">{transfer.requestedBy.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Request Date</dt>
                <dd className="font-medium">{new Date(transfer.createdAt).toLocaleDateString()}</dd>
              </div>
              {transfer.approvedBy && (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {isCompleted ? "Approved By" : "Reviewed By"}
                  </dt>
                  <dd className="font-medium">{transfer.approvedBy.name}</dd>
                </div>
              )}
              {transfer.approvedAt && (
                <div>
                  <dt className="text-xs text-muted-foreground">Decision Date</dt>
                  <dd className="font-medium">
                    {new Date(transfer.approvedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Asset Status</dt>
                <dd className="font-medium capitalize">
                  {transfer.asset.status.toLowerCase().replace("_", " ")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Current allocation */}
          {activeAllocation && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Current Allocation
              </p>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {activeAllocation.employee?.name ??
                  activeAllocation.department?.name ??
                  "Unknown"}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Since {new Date(activeAllocation.allocatedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
