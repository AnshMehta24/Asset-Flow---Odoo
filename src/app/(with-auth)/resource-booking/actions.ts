"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/user";
import { bookingFormSchema, type BookingActionResult, type UpsertBookingInput } from "./_schema/booking-schema";
import { mapBookingToEvent } from "./_utils/booking-mappers";

const bookingInclude = {
  asset: { select: { name: true } },
  bookedBy: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
} as const;

// A resource can be isBookable AND individually allocated to someone at the
// same time (e.g. the iPad is checked out to an employee). If so it must
// not be bookable during that allocation window — mirrors the exclusion
// filter in booking-data.ts's getBookableAssets so the picker and this
// server-side guard never drift apart.
async function findBlockingAllocation(assetId: string, startTime: Date) {
  return prisma.allocation.findFirst({
    where: {
      assetId,
      status: "ACTIVE",
      OR: [{ expectedReturnDate: null }, { expectedReturnDate: { gt: startTime } }],
    },
    select: {
      expectedReturnDate: true,
      employee: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
}

// App-layer pre-check: fast, friendly rejection before we ever hit the DB
// write. Mirrors the same predicate as the booking_no_overlap GiST exclusion
// constraint (status != CANCELLED, overlapping [startTime, endTime)) — see
// prisma/migrations/.../migration.sql.
async function hasOverlap(
  assetId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
) {
  const conflict = await prisma.booking.findFirst({
    where: {
      assetId,
      status: { not: "CANCELLED" },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { id: true },
  });

  return conflict !== null;
}

// Single sync entry point for both create and reschedule: no bookingId ->
// create; bookingId provided -> update. Keeps the create form and the
// drag/resize path in dnd-context.tsx routed through identical validation
// instead of two mutation functions that could drift apart.
export async function upsertBooking(input: UpsertBookingInput): Promise<BookingActionResult> {
  const user = await requireCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to book a resource.",
      code: "UNAUTHENTICATED",
    };
  }

  const parsed = bookingFormSchema.safeParse({
    assetId: input.assetId,
    startDate: input.startDate,
    endDate: input.endDate,
    purpose: input.purpose,
    departmentId: input.departmentId ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check the booking details.",
      code: "VALIDATION",
    };
  }

  const { assetId, startDate, endDate, purpose, departmentId } = parsed.data;

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, isBookable: true, departmentId: true },
  });

  if (!asset || !asset.isBookable) {
    return { success: false, error: "This asset is not bookable.", code: "NOT_FOUND" };
  }

  if (user.role === "EMPLOYEE" && asset.departmentId && asset.departmentId !== user.departmentId) {
    return {
      success: false,
      error: "This resource belongs to another department.",
      code: "OUT_OF_SCOPE",
    };
  }

  const blockingAllocation = await findBlockingAllocation(assetId, startDate);
  if (blockingAllocation) {
    const holder = blockingAllocation.department?.name ?? blockingAllocation.employee?.name ?? "someone";
    const error = blockingAllocation.expectedReturnDate
      ? `This resource is allocated to ${holder} until ${blockingAllocation.expectedReturnDate.toLocaleDateString()}.`
      : `This resource is allocated to ${holder} full-time and isn't available for booking.`;
    return { success: false, error, code: "ALLOCATED" };
  }

  if (await hasOverlap(assetId, startDate, endDate, input.bookingId)) {
    return {
      success: false,
      error: "This slot overlaps an existing booking for this resource.",
      code: "OVERLAP",
    };
  }

  try {
    const booking = input.bookingId
      ? await prisma.booking.update({
          where: { id: input.bookingId },
          data: {
            startTime: startDate,
            endTime: endDate,
            purpose,
            departmentId: departmentId || null,
          },
          include: bookingInclude,
        })
      : await prisma.booking.create({
          data: {
            assetId,
            startTime: startDate,
            endTime: endDate,
            purpose,
            departmentId: departmentId || null,
            bookedById: user.id,
            status: "UPCOMING",
          },
          include: bookingInclude,
        });

    revalidatePath("/resource-booking");

    return { success: true, event: mapBookingToEvent(booking) };
  } catch (error) {
    // Backstop for a race the pre-check missed: the booking_no_overlap GiST
    // exclusion constraint rejects the write at the DB level (Postgres
    // exclusion violations use SQLSTATE 23P01). It isn't declared in
    // schema.prisma (partial/filtered constraints aren't expressible there),
    // so Prisma can't map it to a typed P2002-style error — we match on the
    // raw message instead and translate it to the same clean shape as the
    // pre-check above.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("23P01") || message.toLowerCase().includes("exclusion")) {
      return {
        success: false,
        error: "This slot overlaps an existing booking for this resource.",
        code: "OVERLAP",
      };
    }

    console.error("Failed to save booking:", error);
    return { success: false, error: "Something went wrong while saving the booking." };
  }
}

export async function cancelBooking(bookingId: string): Promise<BookingActionResult> {
  const user = await requireCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to cancel a booking.",
      code: "UNAUTHENTICATED",
    };
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    include: bookingInclude,
  });

  revalidatePath("/resource-booking");

  return { success: true, event: mapBookingToEvent(booking) };
}
