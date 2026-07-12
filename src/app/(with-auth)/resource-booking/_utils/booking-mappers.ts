import type { TEventColor } from "@/components/event-calendar/types";
import type { IBookingEvent } from "../_schema/booking-schema";
import type { Booking, BookingStatus } from "../../../../../generated/prisma/client";

type BookingWithRelations = Booking & {
  asset: { name: string };
  bookedBy: { id: string; name: string };
  department: { id: string; name: string } | null;
};

// Only CANCELLED is ever a real stored transition (via the cancel action).
// UPCOMING/ONGOING/COMPLETED are computed at read time from the current
// clock against startTime/endTime, so no cron job is needed to keep them
// accurate — see EVENT_CALENDAR_BOOKING_PLAN.md, decision #2.
export function computeDisplayStatus(
  storedStatus: BookingStatus,
  startTime: Date,
  endTime: Date,
): BookingStatus {
  if (storedStatus === "CANCELLED") return "CANCELLED";

  const now = new Date();
  if (now < startTime) return "UPCOMING";
  if (now <= endTime) return "ONGOING";
  return "COMPLETED";
}

export function statusToColor(status: BookingStatus): TEventColor {
  switch (status) {
    case "UPCOMING":
      return "blue";
    case "ONGOING":
      return "green";
    case "COMPLETED":
      return "purple";
    case "CANCELLED":
      return "red";
    default:
      return "blue";
  }
}

// departmentName ?? user.name — show who/what this booking is for. A
// booking made "on behalf of" a department shows the department; a
// self-booking falls back to the booking employee's own name.
export function mapBookingToEvent(booking: BookingWithRelations): IBookingEvent {
  const status = computeDisplayStatus(booking.status, booking.startTime, booking.endTime);
  const bookedByLabel = booking.department?.name ?? booking.bookedBy.name;

  return {
    id: booking.id,
    bookingId: booking.id,
    startDate: booking.startTime.toISOString(),
    endDate: booking.endTime.toISOString(),
    title: `${bookedByLabel} - ${booking.purpose ?? "Booking"}`,
    description: booking.purpose ?? "",
    color: statusToColor(status),
    user: {
      id: booking.bookedBy.id,
      name: booking.bookedBy.name,
      picturePath: null,
    },
    assetId: booking.assetId,
    assetName: booking.asset.name,
    departmentId: booking.departmentId,
    departmentName: booking.department?.name ?? null,
    status,
    purpose: booking.purpose,
  };
}
