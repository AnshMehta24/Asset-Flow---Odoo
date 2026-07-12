import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z
    .string()
    .min(1, "Department code is required")
    .max(20, "Department code must be 20 characters or less")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Code must contain only letters, numbers, hyphens, or underscores"
    ),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  headId: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"], {
    error: "Please choose a valid status",
  }),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
