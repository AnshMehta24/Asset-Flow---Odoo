"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ArrowLeftRight, CheckCircle, XCircle } from "lucide-react";
import { requestReturn } from "../actions";
import { ReturnApprovalForm } from "./return-form";
import { TransferForm } from "./transfer-form";
import { Modal } from "@/components/ui/modal";
import type { AllocationDetail } from "../_lib/allocation-data";
import type { getActiveEmployees, getActiveDepartments } from "../_lib/allocation-data";

type Employee = Awaited<ReturnType<typeof getActiveEmployees>>[number];
type Department = Awaited<ReturnType<typeof getActiveDepartments>>[number];

type Panel = "none" | "approve-return" | "transfer";

export function AllocationDetailActions({
  allocation,
  userRole,
  employees,
  departments,
}: {
  allocation: AllocationDetail;
  userRole: string;
  employees: Employee[];
  departments: Department[];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("none");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (allocation.status !== "ACTIVE") return null;

  const canApprove = ["ADMIN", "ASSET_MANAGER"].includes(userRole);
  const returnRequested = !!allocation.returnRequestedAt && !allocation.returnedAt;
  const transferPending = allocation.transferRequests.some((t) => t.status === "REQUESTED");

  function handleRequestReturn() {
    setError(null);
    startTransition(async () => {
      const result = await requestReturn(allocation.id);
      if (!result.success) setError(result.message);
      else router.refresh();
    });
  }

  function togglePanel(next: Panel) {
    setPanel((cur) => (cur === next ? "none" : next));
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <XCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── STATE: Transfer pending ── */}
      {transferPending && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 px-5 py-4 flex items-start gap-3">
          <ArrowLeftRight className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Transfer In Progress
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              A transfer request is pending approval. No other actions are available until it is
              resolved.
            </p>
          </div>
        </div>
      )}

      {/* ── STATE: Return requested + CAN approve ── */}
      {returnRequested && canApprove && !transferPending && (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-5 py-4 flex items-start gap-3">
            <RotateCcw className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Return Requested
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Requested on{" "}
                {allocation.returnRequestedAt
                  ? new Date(allocation.returnRequestedAt).toLocaleDateString()
                  : "—"}
                {allocation.returnRequestedBy
                  ? ` by ${allocation.returnRequestedBy.name}`
                  : ""}
                . Review and approve or reject below.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => togglePanel("approve-return")}
            className="w-full flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors gap-2"
          >
            <CheckCircle className="size-4" />
            Review &amp; Approve Return
          </button>
        </div>
      )}

      {/* ── STATE: Normal active — no pending actions ── */}
      {!returnRequested && !transferPending && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This allocation is active. Choose an action below.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Request Return / Return Asset */}
            {canApprove ? (
              <button
                type="button"
                onClick={() => togglePanel("approve-return")}
                className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20 px-5 py-4 text-left hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors group"
              >
                <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2.5 shrink-0 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                  <RotateCcw className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    Return Asset
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Directly check in and return asset
                  </p>
                </div>
              </button>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={handleRequestReturn}
                className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20 px-5 py-4 text-left hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors disabled:opacity-50 group"
              >
                <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2.5 shrink-0 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                  <RotateCcw className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {isPending ? "Requesting…" : "Request Return"}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Initiate the return workflow
                  </p>
                </div>
              </button>
            )}

            {/* Transfer Asset */}
            <button
              type="button"
              onClick={() => togglePanel("transfer")}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left hover:bg-accent transition-colors group"
            >
              <div className="rounded-lg bg-muted p-2.5 shrink-0 group-hover:bg-accent-foreground/10 transition-colors">
                <ArrowLeftRight className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Transfer Asset</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Move to another employee or department
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Return Asset / Approve Return Modal */}
      <Modal
        isOpen={panel === "approve-return"}
        onClose={() => setPanel("none")}
        title={returnRequested ? "Approve Return" : "Return Asset"}
        description={
          returnRequested
            ? "Record check-in condition to approve the employee return request."
            : "Directly process this asset check-in to return it to inventory."
        }
      >
        <ReturnApprovalForm
          allocationId={allocation.id}
          isDirectReturn={!returnRequested}
          onClose={() => setPanel("none")}
        />
      </Modal>

      {/* Transfer Asset Modal */}
      <Modal
        isOpen={panel === "transfer"}
        onClose={() => setPanel("none")}
        title="Transfer Asset"
        description="Select the recipient employee or department to submit a transfer request."
      >
        <TransferForm
          allocationId={allocation.id}
          assetId={allocation.asset.id}
          fromEmployeeName={allocation.employee?.name}
          fromDepartmentName={allocation.department?.name}
          employees={employees}
          departments={departments}
          onClose={() => setPanel("none")}
        />
      </Modal>
    </div>
  );
}
