"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceCardData } from "../_lib/maintenance-data";
import { resolveMaintenanceRequest } from "../actions";

export function ResolveModal({
  request,
  open,
  onOpenChange,
}: {
  request: MaintenanceCardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    await resolveMaintenanceRequest(request.id, formData);
    setPending(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Request</DialogTitle>
          <DialogDescription>
            {request.assetTag} — {request.assetName}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resolutionNotes">Resolution notes</Label>
            <Textarea
              id="resolutionNotes"
              name="resolutionNotes"
              required
              rows={3}
              placeholder="What was done to fix the issue?"
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Resolving…" : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
