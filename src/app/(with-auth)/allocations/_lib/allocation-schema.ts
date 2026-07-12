import { z } from "zod";

export const allocationSchema = z
  .object({
    assetId: z.string().min(1, "Asset is required"),
    allocationType: z.enum(["EMPLOYEE", "DEPARTMENT"]),
    employeeId: z.string().optional().or(z.literal("")),
    departmentId: z.string().optional().or(z.literal("")),
    expectedReturnDate: z.string().optional().or(z.literal("")),
    conditionAtAllocation: z.string().optional().or(z.literal("")),
    purpose: z.string().max(1000).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.allocationType === "EMPLOYEE" && !val.employeeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Employee is required",
        path: ["employeeId"],
      });
    }
    if (val.allocationType === "DEPARTMENT" && !val.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Department is required",
        path: ["departmentId"],
      });
    }
  });

export type AllocationFormValues = z.infer<typeof allocationSchema>;

// ─────────────────────────────────────────────────────────────

export const transferSchema = z.object({
  allocationId: z.string().min(1),
  assetId: z.string().min(1),
  toEmployeeId: z.string().optional().or(z.literal("")),
  toDepartmentId: z.string().optional().or(z.literal("")),
  reason: z.string().max(1000).optional().or(z.literal("")),
}).superRefine((val, ctx) => {
  if (!val.toEmployeeId && !val.toDepartmentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one recipient — employee or department",
      path: ["toEmployeeId"],
    });
  }
});

export type TransferFormValues = z.infer<typeof transferSchema>;

// ─────────────────────────────────────────────────────────────

export const returnApprovalSchema = z.object({
  allocationId: z.string().min(1),
  notes: z.string().max(1000).optional().or(z.literal("")),
  wasDamaged: z.enum(["true", "false"]).default("false"),
});

export type ReturnApprovalFormValues = z.infer<typeof returnApprovalSchema>;

// ─────────────────────────────────────────────────────────────

export const approveTransferSchema = z.object({
  transferId: z.string().min(1),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export const rejectTransferSchema = z.object({
  transferId: z.string().min(1),
  reason: z.string().min(1, "Rejection reason is required").max(1000),
});

export type ApproveTransferFormValues = z.infer<typeof approveTransferSchema>;
export type RejectTransferFormValues = z.infer<typeof rejectTransferSchema>;
