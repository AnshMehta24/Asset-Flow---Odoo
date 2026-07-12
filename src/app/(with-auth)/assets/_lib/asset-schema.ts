import { z } from "zod";

export const assetConditions = ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"] as const;
export const assetStatuses = [
  "AVAILABLE",
  "ALLOCATED",
  "RESERVED",
  "UNDER_MAINTENANCE",
  "LOST",
  "RETIRED",
  "DISPOSED",
] as const;

export const assetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional().or(z.literal("")),
  categoryId: z.string().min(1, "Category is required"),
  serialNumber: z.string().optional().or(z.literal("")),
  qrCode: z.string().optional().or(z.literal("")),
  manufacturer: z.string().max(200).optional().or(z.literal("")),
  model: z.string().max(200).optional().or(z.literal("")),
  acquisitionDate: z.string().optional().or(z.literal("")),
  acquisitionCost: z.string().optional().or(z.literal("")),
  warrantyStartDate: z.string().optional().or(z.literal("")),
  warrantyEndDate: z.string().optional().or(z.literal("")),
  condition: z.enum(assetConditions),
  status: z.enum(assetStatuses),
  location: z.string().max(300).optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  isBookable: z.boolean().default(false),
  notes: z.string().max(2000).optional().or(z.literal("")),
  photoUrls: z.string().optional().or(z.literal("")),   // newline-separated URLs
  documentUrls: z.string().optional().or(z.literal("")), // newline-separated URLs
  // custom field values are submitted as customField_<fieldId>
});

export type AssetFormValues = z.infer<typeof assetSchema>;
