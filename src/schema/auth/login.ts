import { z } from "zod";
import { emailSchema, passwordSchema } from "@/schema/auth/shared";

export const loginSchema = z.strictObject(
  {
    email: emailSchema,
    password: passwordSchema,
  },
  {
    error: "Invalid login payload.",
  }
);
