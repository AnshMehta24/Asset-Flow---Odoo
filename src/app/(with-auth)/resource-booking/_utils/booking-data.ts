import prisma from "@/lib/prisma";
import { mapBookingToEvent } from "./booking-mappers";

// Excludes assets currently tied up by an active Allocation — either
// full-time (no expectedReturnDate, so it never reappears until returned)
// or time-bound (expectedReturnDate in the future, so it reappears once
// that date passes). Mirrored server-side in actions.ts's upsertBooking so
// this isn't just a UI-level filter.
//
// employeeDepartmentId scopes the list for EMPLOYEE role: their own
// department's resources plus department-less (org-wide/unassigned) ones.
// Admin/Asset Manager/Department Head see everything — pass undefined.
export async function getBookableAssets(employeeDepartmentId?: string | null) {
  const now = new Date();

  return prisma.asset.findMany({
    where: {
      isBookable: true,
      allocations: {
        none: {
          status: "ACTIVE",
          OR: [{ expectedReturnDate: null }, { expectedReturnDate: { gt: now } }],
        },
      },
      ...(employeeDepartmentId !== undefined
        ? { OR: [{ departmentId: employeeDepartmentId }, { departmentId: null }] }
        : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, tagNumber: true },
  });
}

// Scoped to a single resource — the doc's Screen 6 is "calendar view of
// a resource's existing bookings" (singular), not an all-resources overlay.
export async function getBookingsForAsset(assetId: string) {
  const bookings = await prisma.booking.findMany({
    where: { assetId },
    include: {
      asset: { select: { name: true } },
      bookedBy: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return bookings.map(mapBookingToEvent);
}

export async function getDepartmentOptions() {
  return prisma.department.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
