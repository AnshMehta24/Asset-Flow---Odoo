"use client";

import { format, parseISO } from "date-fns";
import { Building2, Calendar, Clock, Text, User } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCalendar } from "@/components/event-calendar/calendar-context";
import { AddEditEventDialog } from "@/components/event-calendar/add-edit-event-dialog";
import { formatTime } from "@/components/event-calendar/helpers";
import type { IBookingEvent } from "@/app/(with-auth)/resource-booking/_schema/booking-schema";
import { cancelBooking } from "@/app/(with-auth)/resource-booking/actions";

interface IProps {
  event: IBookingEvent;
  children: ReactNode;
}

export function EventDetailsDialog({ event, children }: IProps) {
  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  const { use24HourFormat, updateEvent } = useCalendar();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelBooking(event.bookingId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      updateEvent(result.event);
      toast.success("Booking cancelled.");
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancelled = event.status === "CANCELLED";

  return (
    <Dialog>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{event.assetName}</DialogTitle>
            <Badge variant="secondary">{event.status}</Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-4 p-4">
            <div className="flex items-start gap-2">
              <User className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Booked by</p>
                <p className="text-sm text-muted-foreground">
                  {event.user.name}
                </p>
              </div>
            </div>

            {event.departmentName && (
              <div className="flex items-start gap-2">
                <Building2 className="mt-1 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">On behalf of</p>
                  <p className="text-sm text-muted-foreground">
                    {event.departmentName}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Start</p>
                <p className="text-sm text-muted-foreground">
                  {format(startDate, "EEEE dd MMMM")}
                  <span className="mx-1">at</span>
                  {formatTime(parseISO(event.startDate), use24HourFormat)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">End</p>
                <p className="text-sm text-muted-foreground">
                  {format(endDate, "EEEE dd MMMM")}
                  <span className="mx-1">at</span>
                  {formatTime(parseISO(event.endDate), use24HourFormat)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Text className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Purpose</p>
                <p className="text-sm text-muted-foreground">
                  {event.purpose}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2">
          {!isCancelled && (
            <>
              <AddEditEventDialog event={event}>
                <Button variant="outline">Reschedule</Button>
              </AddEditEventDialog>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  Cancel Booking
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This frees up the slot for others to book. The booking stays in history — it isn&apos;t deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep booking</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} disabled={isCancelling}>
                      Cancel Booking
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
