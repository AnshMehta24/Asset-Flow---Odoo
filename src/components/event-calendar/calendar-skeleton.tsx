import { CalendarHeaderSkeleton } from "@/components/event-calendar/calendar-header-skeleton";
import { MonthViewSkeleton } from "@/components/event-calendar/month-view-skeleton";

export function CalendarSkeleton() {
  return (
    <div className="container mx-auto">
      <div className="flex h-screen flex-col">
        <CalendarHeaderSkeleton />
        <div className="flex-1">
          <MonthViewSkeleton />
        </div>
      </div>
    </div>
  );
}


