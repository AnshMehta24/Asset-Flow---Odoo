import { z } from "zod";

const customFieldSchema = z
  .object({
    key: z.string().min(1, "Field key is required"),
    fieldType: z.enum(["TEXT", "NUMBER", "DATE", "ENUM"]),
    enumOptions: z.string(),
  })
  .refine(
    (f) => f.fieldType !== "ENUM" || f.enumOptions.trim().length > 0,
    { message: "Enum field needs at least one option", path: ["enumOptions"] }
  );

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  customFields: z
    .array(customFieldSchema)
    .superRefine((fields, ctx) => {
      const seen = new Set<string>();
      fields.forEach((field, index) => {
        const normalizedKey = field.key.toLowerCase();
        if (seen.has(normalizedKey)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "key"],
            message: `Duplicate key "${field.key}" — all field keys must be unique`,
          });
        }
        seen.add(normalizedKey);
      });
    }),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
