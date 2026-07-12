import { z } from "zod";

export function buildValidationErrorResponse(error: z.ZodError) {
  const flattened = z.flattenError(error);
  const firstFormError = flattened.formErrors[0];

  return {
    error: firstFormError ?? "Please check the submitted fields.",
    fieldErrors: flattened.fieldErrors,
  };
}
