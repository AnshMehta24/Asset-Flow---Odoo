import { z } from "zod";
import { emailSchema, passwordSchema } from "@/schema/auth/shared";

export const signupSchema = z.strictObject(
  {
    name: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? "Name is required."
            : "Name must be a string.",
      })
      .trim()
      .min(1, { error: "Name is required." })
      .min(2, { error: "Name must be at least 2 characters long." }),
    email: emailSchema,
    password: passwordSchema,
  },
  {
    error: "Invalid signup payload.",
  }
);
