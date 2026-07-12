import { z } from "zod";

export const createAuditCycleSchema = z
  .object({
    name: z.string().trim().min(3, "Audit name must be at least 3 characters").max(120),
    departmentId: z.string().trim().nullable().optional(),
    location: z.string().trim().max(255).nullable().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    auditorIds: z.array(z.string()).min(1, "Assign at least one auditor"),
  })
  .superRefine((val, ctx) => {
    if (!val.departmentId && !val.location) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentId"],
        message: "Select a department, a location, or both.",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location"],
        message: "Select a department, a location, or both.",
      });
    }

    if (val.endDate < val.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date cannot be before start date.",
      });
    }
  });

export const updateAuditCycleSchema = createAuditCycleSchema;

export const verifyAuditItemSchema = z
  .object({
    verification: z.enum(["VERIFIED", "MISSING", "DAMAGED"]),
    observedLocation: z.string().trim().max(255).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (
      ["MISSING", "DAMAGED"].includes(val.verification) &&
      (!val.notes || !val.notes.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notes"],
        message: "Notes are required for missing or damaged assets.",
      });
    }
  });

export const resolveAuditDiscrepancySchema = z
  .object({
    status: z.enum(["CONFIRMED", "RESOLVED", "DISMISSED"]),
    resolutionNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (
      ["RESOLVED", "DISMISSED"].includes(val.status) &&
      (!val.resolutionNotes || !val.resolutionNotes.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolutionNotes"],
        message: "Resolution notes are required for resolved or dismissed status.",
      });
    }
  });
