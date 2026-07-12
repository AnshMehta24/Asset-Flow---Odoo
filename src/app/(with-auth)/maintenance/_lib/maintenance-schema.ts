import { z } from "zod";

export const raiseRequestSchema = z.object({
  assetId: z.string().min(1, "Select an asset."),
  issueDescription: z.string().trim().min(1, "Describe the issue."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  photoUrl: z
    .string()
    .trim()
    .url("Enter a valid URL.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const rejectRequestSchema = z.object({
  rejectionReason: z.string().trim().min(1, "A rejection reason is required."),
});

export const assignTechnicianSchema = z.object({
  technicianName: z.string().trim().min(1, "Technician name is required."),
  scheduledDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const resolveRequestSchema = z.object({
  resolutionNotes: z.string().trim().min(1, "Resolution notes are required."),
});
