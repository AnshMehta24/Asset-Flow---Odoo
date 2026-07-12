import { format } from "date-fns";
import type { ReactNode } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/event-calendar/responsive-modal";
import { cn } from "@/lib/utils";
import { useCalendar } from "@/components/event-calendar/calendar-context";
import { formatTime } from "@/components/event-calendar/helpers";
import type { IBookingEvent } from "@/app/(with-auth)/resource-booking/_schema/booking-schema";
import { dayCellVariants } from "@/components/event-calendar/day-cell";
import { EventBullet } from "@/components/event-calendar/event-bullet";
import { EventDetailsDialog } from "@/components/event-calendar/event-details-dialog";

interface EventListDialogProps {
  date: Date;
  events: IBookingEvent[];
  maxVisibleEvents?: number;
  children?: ReactNode;
}

export function EventListDialog({
  date,
  events,
  maxVisibleEvents = 3,
  children,
}: EventListDialogProps) {
  const cellEvents = events;
  const hiddenEventsCount = Math.max(cellEvents.length - maxVisibleEvents, 0);
  const { badgeVariant, use24HourFormat } = useCalendar();

  const defaultTrigger = (
    <span className="cursor-pointer">
      <span className="sm:hidden">+{hiddenEventsCount}</span>
      <span className="hidden sm:inline py-0.5 px-2 my-1 rounded-xl border">
        {hiddenEventsCount}
        <span className="mx-1">more...</span>
      </span>
    </span>
  );

  return (
    <Modal>
      <ModalTrigger>{children || defaultTrigger}</ModalTrigger>
      <ModalContent className="sm:max-w-[425px]">
        <ModalHeader>
          <ModalTitle className="my-2">
            <div className="flex items-center gap-2">
              <EventBullet color={cellEvents[0]?.color} className="" />
              <p className="text-sm font-medium">
                Events on {format(date, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </ModalTitle>
        </ModalHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {cellEvents.length > 0 ? (
            cellEvents.map((event) => (
              <EventDetailsDialog event={event} key={event.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer",
                    {
                      [dayCellVariants({ color: event.color })]:
                        badgeVariant === "colored",
                    },
                  )}
                >
                  <EventBullet color={event.color} />
                  <div className="flex justify-between items-center w-full">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs">
                      {formatTime(event.startDate, use24HourFormat)}
                    </p>
                  </div>
                </div>
              </EventDetailsDialog>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No events for this date.
            </p>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}


