import { z } from "zod";

const requiredString = (fieldName: string) =>
  z.string({
    error: (issue) =>
      issue.input === undefined
        ? `${fieldName} is required.`
        : `${fieldName} must be a string.`,
  });

export const emailSchema = z
  .email({
    error: (issue) =>
      issue.input === undefined || issue.input === ""
        ? "Email is required."
        : "Please enter a valid email address.",
  })
  .trim()
  .toLowerCase();

export const passwordSchema = requiredString("Password")
  .min(1, { error: "Password is required." })
  .min(8, { error: "Password must be at least 8 characters long." });
