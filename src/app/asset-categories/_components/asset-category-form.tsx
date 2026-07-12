"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useActionState, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { AssetCategoryFormState } from "../actions";
import { createAssetCategory, updateAssetCategory } from "../actions";

const initialState: AssetCategoryFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

export function AssetCategoryForm({
  mode,
  category,
}: {
  mode: "create" | "edit";
  category?: {
    id: string;
    name: string;
    description: string | null;
    customFieldSchema: unknown;
  };
}) {
  const defaultCustomFields = Array.isArray(category?.customFieldSchema)
    ? category.customFieldSchema
        .map((field) =>
          typeof field === "object" &&
          field !== null &&
          "label" in field &&
          typeof field.label === "string"
            ? field.label
            : ""
        )
        .filter(Boolean)
    : [];

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

  const [state, formAction, pending] = useActionState(
    formServerAction,
    initialState
  );

  return (
    <section className="rounded-[1.5rem] border border-border bg-background">
      <div className="border-b border-border px-5 py-4">
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "create" ? "Create Category" : "Edit Category"}
        </h1>
      </div>

      <form action={formAction} className="space-y-5 p-5">
        <Field
          label="Category Name"
          name="name"
          defaultValue={category?.name}
          error={state.fieldErrors.name?.[0]}
          required
        />

        <Field
          label="Description"
          name="description"
          defaultValue={category?.description ?? ""}
          error={state.fieldErrors.description?.[0]}
          multiline
        />

        <CustomFieldsInput
          label="Custom Fields"
          defaultValue={defaultCustomFields}
          error={state.fieldErrors.customFields?.[0]}
        />

        {state.message ? (
          <p
            className={`rounded-xl border px-3 py-2 text-sm ${
              state.success
                ? "border-border bg-muted text-foreground"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Link
            href="/asset-categories"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Cancel
          </Link>
          <Button type="submit" size="lg" disabled={pending}>
            {pending
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

function CustomFieldsInput({
  label,
  defaultValue,
  error,
}: {
  label: string;
  defaultValue: string[];
  error?: string;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");

  function normalizeValue(value: string) {
    return value.trim().replace(/\s+/g, " ");
  }

  function addTag(rawValue: string) {
    const value = normalizeValue(rawValue);

    if (!value) {
      return;
    }

    setTags((current) =>
      current.some((tag) => tag.toLowerCase() === value.toLowerCase())
        ? current
        : [...current, value]
    );
    setDraft("");
  }

  function removeTag(tagToRemove: string) {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  }

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input type="hidden" name="customFields" value={JSON.stringify(tags)} />

      <div className="rounded-xl border border-border bg-card px-3 py-3">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}

          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(draft);
              }

              if (event.key === "Backspace" && !draft && tags.length > 0) {
                event.preventDefault();
                removeTag(tags[tags.length - 1]);
              }
            }}
            onBlur={() => addTag(draft)}
            placeholder="Type a field and press Enter"
            className="h-9 min-w-[220px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Add multiple category-specific fields like Warranty Period, Brand, or
        Model.
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}

function Field({
  label,
  name,
  defaultValue,
  error,
  placeholder,
  required = false,
  multiline = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-muted-foreground"> *</span> : null}
      </span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}
