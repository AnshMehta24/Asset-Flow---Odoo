import { CalendarBody } from "@/components/event-calendar/calendar-body";
import { CalendarProvider } from "@/components/event-calendar/calendar-context";
import { DndProvider } from "@/components/event-calendar/dnd-context";
import { CalendarHeader } from "@/components/event-calendar/calendar-header";
import { getBookingsForAsset, getDepartmentOptions } from "../_utils/booking-data";

export async function BookingCalendar({ assetId }: { assetId: string }) {
  const [events, departmentOptions] = await Promise.all([
    getBookingsForAsset(assetId),
    getDepartmentOptions(),
  ]);

  // "Booked by" filter options — unique bookers among this resource's
  // existing bookings. Avoids a separate all-employees query.
  const users = Array.from(new Map(events.map((event) => [event.user.id, event.user])).values());

  return (
    <CalendarProvider
      events={events}
      users={users}
      resourceId={assetId}
      departmentOptions={departmentOptions}
      view="week"
    >
      <DndProvider>
        <div className="w-full border rounded-xl">
          <CalendarHeader />
          <CalendarBody />
        </div>
      </DndProvider>
    </CalendarProvider>
  );
}
