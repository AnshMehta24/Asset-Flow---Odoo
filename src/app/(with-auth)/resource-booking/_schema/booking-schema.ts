import { z } from "zod";
import type { IEvent } from "@/components/event-calendar/interfaces";
import type { BookingStatus } from "../../../../../generated/prisma/client";

// Booking-domain extension of the generic calendar library's IEvent.
// Field names inherited from IEvent (id, startDate, endDate, title, color,
// description, user) are never renamed — only extended — so every view
// renderer in components/event-calendar keeps working unchanged.
//
// `user` (inherited) = Booking.bookedBy, the employee who made the booking.
// Always present; not to be confused with departmentId below.
export interface IBookingEvent extends IEvent {
  bookingId: string;
  assetId: string;
  assetName: string;
  departmentId: string | null;
  departmentName: string | null;
  status: BookingStatus;
  purpose: string | null;
}

export const bookingFormSchema = z
  .object({
    assetId: z.string().min(1, "Resource is required"),
    startDate: z.date("Start time is required"),
    endDate: z.date("End time is required"),
    purpose: z.string().trim().min(1, "Purpose is required").max(200, "Purpose must be 200 characters or less"),
    departmentId: z.string().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End time must be after start time",
    path: ["endDate"],
  });

export type TBookingFormData = z.infer<typeof bookingFormSchema>;

export type UpsertBookingInput = {
  bookingId?: string;
  assetId: string;
  startDate: Date;
  endDate: Date;
  purpose: string;
  departmentId?: string | null;
};

export type BookingActionResult =
  | { success: true; event: IBookingEvent }
  | {
      success: false;
      error: string;
      code?: "OVERLAP" | "VALIDATION" | "NOT_FOUND" | "UNAUTHENTICATED" | "ALLOCATED" | "OUT_OF_SCOPE";
    };
