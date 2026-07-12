"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react";
import { Power, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { updateEmployeeStatus } from "../actions";

export function DeactivateEmployeeModal({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDeactivate() {
    setPending(true);
    await updateEmployeeStatus(employeeId, "INACTIVE");
    setPending(false);
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={buttonVariants({ variant: "destructive", size: "icon" })}
        aria-label={`Deactivate ${employeeName}`}
      >
        <Power className="size-3.5" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-6 shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-foreground">
                Deactivate Employee
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Are you sure you want to deactivate <span className="font-medium text-foreground">{employeeName}</span>? They will no longer be able to log in to the application.
              </Dialog.Description>
            </div>
            <Dialog.Close className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Dialog.Close className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Dialog.Close>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={pending}
            >
              {pending ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
