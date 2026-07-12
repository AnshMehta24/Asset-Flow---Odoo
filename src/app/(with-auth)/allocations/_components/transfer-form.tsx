"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createTransferRequest, type ActionState } from "../actions";
import { transferSchema, type TransferFormValues } from "../_lib/allocation-schema";
import type { getActiveEmployees, getActiveDepartments } from "../_lib/allocation-data";

type Employee = Awaited<ReturnType<typeof getActiveEmployees>>[number];
type Department = Awaited<ReturnType<typeof getActiveDepartments>>[number];

const INITIAL: ActionState = { success: false, message: "", fieldErrors: {} };
const inputBase =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring";
const inputNormal = "border-border";
const inputError = "border-destructive";
const selectBase =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring appearance-none cursor-pointer";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function TransferForm({
  allocationId,
  assetId,
  fromEmployeeName,
  fromDepartmentName,
  employees,
  departments,
  onClose,
}: {
  allocationId: string;
  assetId: string;
  fromEmployeeName?: string | null;
  fromDepartmentName?: string | null;
  employees: Employee[];
  departments: Department[];
  onClose?: () => void;
}) {
  const router = useRouter();
  const [serverState, dispatchAction] = useActionState(createTransferRequest, INITIAL);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TransferFormValues>({
    defaultValues: {
      allocationId,
      assetId,
      toEmployeeId: "",
      toDepartmentId: "",
      reason: "",
    },
  });

  function onSubmit(values: TransferFormValues) {
    const parsed = transferSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof TransferFormValues;
        setError(field, { message: issue.message });
      }
      return;
    }

    const fd = new FormData();
    fd.set("allocationId", values.allocationId);
    fd.set("assetId", values.assetId);
    fd.set("toEmployeeId", values.toEmployeeId ?? "");
    fd.set("toDepartmentId", values.toDepartmentId ?? "");
    fd.set("reason", values.reason ?? "");

    startTransition(() => {
      dispatchAction(fd);
    });
  }

  if (serverState.success && serverState.redirectTo) {
    router.push(serverState.redirectTo);
  }

  const fromLabel = fromEmployeeName ?? fromDepartmentName ?? "—";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Hidden fields */}
      <input type="hidden" {...register("allocationId")} />
      <input type="hidden" {...register("assetId")} />

      {/* Server error */}
      {!serverState.success && serverState.message && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverState.message}
        </div>
      )}

      {/* Current Holder (read-only) */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Current Holder
        </label>
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
          {fromLabel}
        </div>
      </div>

      {/* To — Employee */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tf-employee" className="text-sm font-medium">
          Transfer to Employee
        </label>
        <select
          id="tf-employee"
          {...register("toEmployeeId")}
          className={`${selectBase} ${errors.toEmployeeId ? inputError : inputNormal}`}
        >
          <option value="">Select employee…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}{e.department ? ` · ${e.department.name}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* To — Department */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tf-dept" className="text-sm font-medium">
          Transfer to Department
        </label>
        <select
          id="tf-dept"
          {...register("toDepartmentId")}
          className={`${selectBase} ${inputNormal}`}
        >
          <option value="">Select department…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
        <FieldError
          message={
            errors.toEmployeeId?.message ?? serverState.fieldErrors.toEmployeeId?.[0]
          }
        />
      </div>

      {/* Reason */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tf-reason" className="text-sm font-medium">
          Reason for Transfer
        </label>
        <textarea
          id="tf-reason"
          {...register("reason")}
          rows={3}
          placeholder="Explain why this asset needs to be transferred…"
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none resize-none placeholder:text-muted-foreground transition-colors focus:border-ring ${inputNormal}`}
        />
        <FieldError message={errors.reason?.message} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Submitting…" : "Submit Transfer Request"}
        </button>
      </div>
    </form>
  );
}
