"use client";

import { useActionState, useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { approveTransfer, rejectTransfer, type ActionState } from "../../actions";
import {
  approveTransferSchema,
  rejectTransferSchema,
  type ApproveTransferFormValues,
  type RejectTransferFormValues,
} from "../../_lib/allocation-schema";

const INITIAL: ActionState = { success: false, message: "", fieldErrors: {} };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function TransferApprovalPanel({ transferId }: { transferId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");

  // ── Approve form ──
  const [approveState, dispatchApprove] = useActionState(approveTransfer, INITIAL);
  const [approvePending, startApproveTransition] = useTransition();
  const {
    register: regApprove,
    handleSubmit: handleApprove,
    setError: setApproveError,
    formState: { errors: approveErrors },
  } = useForm<ApproveTransferFormValues>({
    defaultValues: { transferId, notes: "" },
  });

  // ── Reject form ──
  const [rejectState, dispatchReject] = useActionState(rejectTransfer, INITIAL);
  const [rejectPending, startRejectTransition] = useTransition();
  const {
    register: regReject,
    handleSubmit: handleReject,
    setError: setRejectError,
    formState: { errors: rejectErrors },
  } = useForm<RejectTransferFormValues>({
    defaultValues: { transferId, reason: "" },
  });

  // Redirect on success
  if (approveState.success && approveState.redirectTo) router.push(approveState.redirectTo);
  if (rejectState.success && rejectState.redirectTo) router.push(rejectState.redirectTo);

  function onApprove(values: ApproveTransferFormValues) {
    const parsed = approveTransferSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setApproveError(issue.path[0] as keyof ApproveTransferFormValues, {
          message: issue.message,
        });
      }
      return;
    }
    const fd = new FormData();
    fd.set("transferId", values.transferId);
    fd.set("notes", values.notes ?? "");
    startApproveTransition(() => dispatchApprove(fd));
  }

  function onReject(values: RejectTransferFormValues) {
    const parsed = rejectTransferSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setRejectError(issue.path[0] as keyof RejectTransferFormValues, {
          message: issue.message,
        });
      }
      return;
    }
    const fd = new FormData();
    fd.set("transferId", values.transferId);
    fd.set("reason", values.reason);
    startRejectTransition(() => dispatchReject(fd));
  }

  const serverError =
    (!approveState.success && approveState.message) ||
    (!rejectState.success && rejectState.message);

  return (
    <div className="space-y-4">
      {serverError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Idle — show two action buttons */}
      {mode === "idle" && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMode("approve")}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            ✓ Approve Transfer
          </button>
          <button
            type="button"
            onClick={() => setMode("reject")}
            className="flex-1 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
          >
            ✗ Reject
          </button>
        </div>
      )}

      {/* Approve form */}
      {mode === "approve" && (
        <form onSubmit={handleApprove(onApprove)} className="space-y-3">
          <input type="hidden" {...regApprove("transferId")} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="approve-notes" className="text-sm font-medium">
              Approval Notes (optional)
            </label>
            <textarea
              id="approve-notes"
              {...regApprove("notes")}
              rows={3}
              placeholder="Add any notes for this approval…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none placeholder:text-muted-foreground transition-colors focus:border-ring"
            />
            <FieldError message={approveErrors.notes?.message} />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={approvePending}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {approvePending ? "Approving…" : "Confirm Approval"}
            </button>
          </div>
        </form>
      )}

      {/* Reject form */}
      {mode === "reject" && (
        <form onSubmit={handleReject(onReject)} className="space-y-3">
          <input type="hidden" {...regReject("transferId")} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reject-reason" className="text-sm font-medium">
              Rejection Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              id="reject-reason"
              {...regReject("reason")}
              rows={3}
              placeholder="Explain why this transfer is being rejected…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none placeholder:text-muted-foreground transition-colors focus:border-ring"
            />
            <FieldError
              message={rejectErrors.reason?.message ?? rejectState.fieldErrors.reason?.[0]}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejectPending}
              className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {rejectPending ? "Rejecting…" : "Confirm Rejection"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
