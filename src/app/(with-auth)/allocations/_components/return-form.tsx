"use client";

import { useActionState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { approveReturn, type ActionState } from "../actions";
import { returnApprovalSchema, type ReturnApprovalFormValues } from "../_lib/allocation-schema";

const INITIAL: ActionState = { success: false, message: "", fieldErrors: {} };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function ReturnApprovalForm({
  allocationId,
  isDirectReturn = false,
  onClose,
}: {
  allocationId: string;
  isDirectReturn?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [serverState, dispatchAction] = useActionState(approveReturn, INITIAL);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReturnApprovalFormValues>({
    defaultValues: {
      allocationId,
      notes: "",
      wasDamaged: "false",
    },
  });

  function onSubmit(values: ReturnApprovalFormValues) {
    const parsed = returnApprovalSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ReturnApprovalFormValues;
        setError(field, { message: issue.message });
      }
      return;
    }

    const fd = new FormData();
    fd.set("allocationId", values.allocationId);
    fd.set("notes", values.notes ?? "");
    fd.set("wasDamaged", values.wasDamaged);

    startTransition(() => {
      dispatchAction(fd);
    });
  }

  if (serverState.success && serverState.redirectTo) {
    router.push(serverState.redirectTo);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("allocationId")} />

      {/* Server error */}
      {!serverState.success && serverState.message && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverState.message}
        </div>
      )}

      {/* Check-in notes */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="return-notes" className="text-sm font-medium">
          Check-In Notes
        </label>
        <textarea
          id="return-notes"
          {...register("notes")}
          rows={3}
          placeholder="Describe the condition of the asset on return…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none placeholder:text-muted-foreground transition-colors focus:border-ring"
        />
        <FieldError message={errors.notes?.message} />
      </div>

      {/* Damaged toggle — using Controller for radio group */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Asset Damaged?</label>
        <Controller
          name="wasDamaged"
          control={control}
          render={({ field }) => (
            <div className="flex gap-3">
              {[
                { value: "false" as const, label: "No — return as Available" },
                { value: "true" as const, label: "Yes — send to Maintenance" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors"
                >
                  <input
                    type="radio"
                    value={opt.value}
                    checked={field.value === opt.value}
                    onChange={() => field.onChange(opt.value)}
                    className="accent-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        />
        <FieldError message={errors.wasDamaged?.message} />
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
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Processing…" : isDirectReturn ? "Return Asset" : "Approve Return"}
        </button>
      </div>
    </form>
  );
}
