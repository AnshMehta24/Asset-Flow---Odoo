"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceCardData } from "../_lib/maintenance-data";
import { approveMaintenanceRequest, rejectMaintenanceRequest } from "../actions";

export function ApproveRejectModal({
  request,
  open,
  onOpenChange,
}: {
  request: MaintenanceCardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleApprove() {
    setPending(true);
    await approveMaintenanceRequest(request.id);
    setPending(false);
    onOpenChange(false);
  }

  async function handleReject(formData: FormData) {
    setPending(true);
    await rejectMaintenanceRequest(request.id, formData);
    setPending(false);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setRejecting(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {request.assetTag} — {request.assetName}
          </DialogTitle>
          <DialogDescription>{request.issueDescription}</DialogDescription>
        </DialogHeader>

        {!rejecting ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setRejecting(true)}
            >
              Reject
            </Button>
            <Button type="button" disabled={pending} onClick={handleApprove}>
              {pending ? "Approving…" : "Approve"}
            </Button>
          </DialogFooter>
        ) : (
          <form action={handleReject} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rejectionReason">Rejection reason</Label>
              <Textarea
                id="rejectionReason"
                name="rejectionReason"
                required
                rows={3}
                placeholder="Why is this request being rejected?"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setRejecting(false)}
              >
                Back
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Rejecting…" : "Confirm Reject"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
