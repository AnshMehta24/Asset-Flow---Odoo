"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react";
import { Pencil, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { updateEmployeeRole } from "../actions";

export function ChangeRoleModal({
  employeeId,
  employeeName,
  currentRole,
}: {
  employeeId: string;
  employeeName: string;
  currentRole: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    await updateEmployeeRole(employeeId, formData);
    setPending(false);
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={buttonVariants({ variant: "outline", size: "icon" })}
        aria-label={`Change role for ${employeeName}`}
      >
        <Pencil className="size-3.5" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-6 shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-foreground">
                Change Role
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Update role for <span className="font-medium text-foreground">{employeeName}</span>
              </Dialog.Description>
            </div>
            <Dialog.Close className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Role
              </label>
              <select
                name="role"
                defaultValue={currentRole}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="DEPARTMENT_HEAD">Department Head</option>
                <option value="ASSET_MANAGER">Asset Manager</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Dialog.Close className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Dialog.Close>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
