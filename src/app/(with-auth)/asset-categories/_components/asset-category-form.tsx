"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { useActionState, useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, buttonVariants } from "@/components/ui/button";
import type { AssetCategoryFormState } from "../actions";
import { createAssetCategory, updateAssetCategory } from "../actions";
import { categorySchema, type CategoryFormValues } from "../_lib/asset-category-schema";

const initialState: AssetCategoryFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

const inputBase =
  "h-11 w-full border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring";
const inputError = "border-destructive";
const inputNormal = "border-border";

export function AssetCategoryForm({
  mode,
  category,
}: {
  mode: "create" | "edit";
  category?: {
    id: string;
    name: string;
    description: string | null;
    customFields: {
      id: string;
      key: string;
      fieldType: "TEXT" | "NUMBER" | "DATE" | "ENUM";
      enumOptions: string[];
      sortOrder: number;
    }[];
  };
}) {
  const formServerAction =
    mode === "edit" && category
      ? (updateAssetCategory.bind(
          null,
          category.id
        ) as (
          state: AssetCategoryFormState,
          payload: FormData
        ) => Promise<AssetCategoryFormState>)
      : createAssetCategory;

  const [state, dispatchAction] = useActionState(formServerAction, initialState);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
      customFields: (category?.customFields ?? []).map((f) => ({
        key: f.key,
        fieldType: f.fieldType,
        enumOptions: f.enumOptions.join(", "),
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "customFields",
  });

  function onSubmit(values: CategoryFormValues) {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("description", values.description ?? "");
    formData.set(
      "customFields",
      JSON.stringify(
        values.customFields.map((f) => ({
          key: f.key,
          fieldType: f.fieldType,
          enumOptions:
            f.fieldType === "ENUM"
              ? f.enumOptions
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
              : [],
        }))
      )
    );
    startTransition(() => {
      dispatchAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors.name?.[0];
  const descError = errors.description?.message ?? state.fieldErrors.description?.[0];

  return (
    <section className="border border-border bg-background">
      <div className="border-b border-border px-5 py-4">
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "create" ? "Create Category" : "Edit Category"}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-5">
        <Field label="Category Name" required error={nameError}>
          <input
            {...register("name")}
            placeholder="e.g. Electronics"
            className={`${inputBase} ${nameError ? inputError : inputNormal}`}
          />
        </Field>

        <Field label="Description" error={descError}>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Optional description…"
            className={`w-full border bg-background px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring ${descError ? inputError : inputNormal}`}
          />
        </Field>

        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">
            Custom Fields
          </span>

          <div className="border border-border">
            <div className="grid grid-cols-[minmax(0,1.2fr)_160px_minmax(0,1fr)_44px] border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <span>Key</span>
              <span>Value Type</span>
              <span>Options</span>
              <span />
            </div>

            {fields.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No custom fields added yet.
              </div>
            )}

            {fields.map((field, index) => {
              const keyError = errors.customFields?.[index]?.key?.message;
              const optionsError = errors.customFields?.[index]?.enumOptions?.message;
              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[minmax(0,1.2fr)_160px_minmax(0,1fr)_44px] items-start gap-px border-b border-border last:border-b-0"
                >
                  <div className="flex flex-col gap-1 p-2">
                    <input
                      {...register(`customFields.${index}.key`)}
                      placeholder="warrantyPeriod"
                      className={`h-9 w-full border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring ${keyError ? inputError : inputNormal}`}
                    />
                    {keyError && (
                      <p className="text-xs text-destructive">{keyError}</p>
                    )}
                  </div>

                  <div className="p-2">
                    <Controller
                      control={control}
                      name={`customFields.${index}.fieldType`}
                      render={({ field: ft }) => (
                        <select
                          {...ft}
                          className="h-9 w-full border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring"
                        >
                          <option value="TEXT">Text</option>
                          <option value="NUMBER">Number</option>
                          <option value="DATE">Date</option>
                          <option value="ENUM">Enum</option>
                        </select>
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-1 p-2">
                    <Controller
                      control={control}
                      name={`customFields.${index}.fieldType`}
                      render={({ field: ft }) =>
                        ft.value === "ENUM" ? (
                          <>
                            <input
                              {...register(`customFields.${index}.enumOptions`)}
                              placeholder="Active, Inactive, Pending"
                              className={`h-9 w-full border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring ${optionsError ? inputError : inputNormal}`}
                            />
                            {optionsError && (
                              <p className="text-xs text-destructive">{optionsError}</p>
                            )}
                          </>
                        ) : (
                          <div className="flex h-9 items-center px-2.5 text-xs text-muted-foreground">
                            —
                          </div>
                        )
                      }
                    />
                  </div>

                  <div className="flex items-start p-2 pt-2">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="inline-flex h-9 w-9 items-center justify-center border border-border bg-background text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove custom field ${index + 1}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="p-2">
              <button
                type="button"
                onClick={() => append({ key: "", fieldType: "TEXT", enumOptions: "" })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Plus className="size-4" />
                Add Field
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Add a field key and choose the stored value type.
          </p>

          {state.fieldErrors.customFields?.[0] && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.customFields[0]}
            </p>
          )}
        </div>

        {state.message && (
          <p
            className={`border px-3 py-2.5 text-sm ${
              state.success
                ? "border-border bg-muted text-foreground"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {state.message}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Link
            href="/asset-categories"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Cancel
          </Link>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create Category"
                : "Save Changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
