"use client";

import Link from "next/link";
import { useActionState, useTransition, useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import type { AssetFormState } from "../actions";
import { createAsset, updateAsset } from "../actions";
import type { AssetFormOptions } from "../_lib/asset-data";
import { assetSchema, type AssetFormValues } from "../_lib/asset-schema";

// ─────────────────────────────────────────────────
// Style constants
// ─────────────────────────────────────────────────
const inputBase =
  "h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring";
const inputError = "border-destructive";
const inputNormal = "border-border";
const textareaBase =
  "w-full rounded-xl border bg-card px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring resize-none";
const selectBase =
  "h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring appearance-none cursor-pointer";

// Status options — ALLOCATED is excluded: it's set automatically by the allocation module
const CREATE_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "LOST", label: "Lost" },
  { value: "RETIRED", label: "Retired" },
  { value: "DISPOSED", label: "Disposed" },
] as const;

// Edit also shows ALLOCATED as a read-only badge (not selectable)
const EDIT_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "LOST", label: "Lost" },
  { value: "RETIRED", label: "Retired" },
  { value: "DISPOSED", label: "Disposed" },
  { value: "ALLOCATED", label: "Allocated (auto-managed)" },
] as const;

const CONDITION_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
  { value: "DAMAGED", label: "Damaged" },
] as const;

// ─────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────
function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="col-span-full border-b border-border pb-2 pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Existing Asset type (for edit mode)
// ─────────────────────────────────────────────────
type ExistingAsset = {
  id: string;
  name: string;
  description: string | null;
  serialNumber: string | null;
  qrCode: string | null;
  manufacturer: string | null;
  model: string | null;
  acquisitionDate: Date | null;
  acquisitionCost: { toString(): string } | null;
  warrantyStartDate: Date | null;
  warrantyEndDate: Date | null;
  condition: string;
  status: string;
  location: string | null;
  isBookable: boolean;
  notes: string | null;
  photoUrls: string[];
  documentUrls: string[];
  categoryId: string;
  departmentId: string | null;
  customFieldValues: {
    fieldId: string;
    valueText: string | null;
    valueNumber: { toString(): string } | null;
    valueDate: Date | null;
    valueEnum: string | null;
  }[];
};

// ─────────────────────────────────────────────────
// Main Form Component
// ─────────────────────────────────────────────────
const initialState: AssetFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

export function AssetForm({
  mode,
  options,
  asset,
}: {
  mode: "create" | "edit";
  options: AssetFormOptions;
  asset?: ExistingAsset;
}) {
  // Server action binding
  const formAction =
    mode === "edit" && asset
      ? (updateAsset.bind(null, asset.id) as (
          s: AssetFormState,
          fd: FormData
        ) => Promise<AssetFormState>)
      : createAsset;

  const [state, dispatchAction] = useActionState(formAction, initialState);
  const [isPending, startTransition] = useTransition();

  // ── Build existing custom field defaults ──
  const existingCustomValues = new Map<string, string>();
  if (asset) {
    for (const v of asset.customFieldValues) {
      existingCustomValues.set(
        v.fieldId,
        v.valueEnum ??
          v.valueText ??
          v.valueDate?.toISOString().slice(0, 10) ??
          v.valueNumber?.toString() ??
          ""
      );
    }
  }

  // ── React Hook Form ──
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<AssetFormValues>({
    defaultValues: {
      name: asset?.name ?? "",
      description: asset?.description ?? "",
      categoryId: asset?.categoryId ?? "",
      serialNumber: asset?.serialNumber ?? "",
      qrCode: asset?.qrCode ?? "",
      manufacturer: asset?.manufacturer ?? "",
      model: asset?.model ?? "",
      acquisitionDate: asset?.acquisitionDate
        ? new Date(asset.acquisitionDate).toISOString().slice(0, 10)
        : "",
      acquisitionCost: asset?.acquisitionCost?.toString() ?? "",
      warrantyStartDate: asset?.warrantyStartDate
        ? new Date(asset.warrantyStartDate).toISOString().slice(0, 10)
        : "",
      warrantyEndDate: asset?.warrantyEndDate
        ? new Date(asset.warrantyEndDate).toISOString().slice(0, 10)
        : "",
      condition: (asset?.condition as AssetFormValues["condition"]) ?? "GOOD",
      status: (asset?.status as AssetFormValues["status"]) ?? "AVAILABLE",
      location: asset?.location ?? "",
      isBookable: asset?.isBookable ?? false,
      notes: asset?.notes ?? "",
      photoUrls: asset?.photoUrls.join("\n") ?? "",
      documentUrls: asset?.documentUrls.join("\n") ?? "",
    },
  });

  // Watch categoryId to render dynamic custom fields
  const selectedCategoryId = watch("categoryId");
  const selectedCategory = options.categories.find(
    (c) => c.id === selectedCategoryId
  );

  // Watch photoUrls for live preview
  const photoUrlsRaw = watch("photoUrls");
  const photoUrlList = (photoUrlsRaw ?? "")
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  // Custom field local state (keyed by fieldId)
  const [customValues, setCustomValues] = useState<Record<string, string>>(
    () => Object.fromEntries(existingCustomValues)
  );

  // ── Submit handler: validate with Zod then build FormData manually ──
  function onSubmit(values: AssetFormValues) {
    // Client-side validation
    const parsed = assetSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof AssetFormValues;
        setError(field, { message: issue.message });
      }
      return;
    }

    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("description", values.description ?? "");
    fd.set("categoryId", values.categoryId);
    fd.set("serialNumber", values.serialNumber ?? "");
    fd.set("qrCode", values.qrCode ?? "");
    fd.set("manufacturer", values.manufacturer ?? "");
    fd.set("model", values.model ?? "");
    fd.set("acquisitionDate", values.acquisitionDate ?? "");
    fd.set("acquisitionCost", values.acquisitionCost ?? "");
    fd.set("warrantyStartDate", values.warrantyStartDate ?? "");
    fd.set("warrantyEndDate", values.warrantyEndDate ?? "");
    fd.set("condition", values.condition);
    fd.set("status", values.status);
    fd.set("location", values.location ?? "");
    fd.set("isBookable", values.isBookable ? "true" : "false");
    fd.set("notes", values.notes ?? "");
    fd.set("photoUrls", values.photoUrls ?? "");
    fd.set("documentUrls", values.documentUrls ?? "");
    fd.set("departmentId", values.departmentId ?? "");

    // Append dynamic custom fields
    for (const [fieldId, val] of Object.entries(customValues)) {
      if (val.trim()) fd.set(`customField_${fieldId}`, val.trim());
    }

    startTransition(() => dispatchAction(fd));
  }

  const statusOptions = mode === "edit" ? EDIT_STATUS_OPTIONS : CREATE_STATUS_OPTIONS;

  return (
    <section className="rounded-[1.5rem] border border-border bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "create" ? "Register New Asset" : "Edit Asset"}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {mode === "create"
            ? "Fill in the details below to register a new asset into the system."
            : "Update the asset details. Changes will be logged."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <div className="grid gap-8">

          {/* ── SECTION: Basic Information ── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SectionHeader title="Basic Information" />

            <Field label="Asset Name" required error={errors.name?.message ?? state.fieldErrors.name?.[0]}>
              <input
                {...register("name")}
                placeholder="e.g. Dell Latitude 5540 Laptop"
                className={`${inputBase} ${errors.name ? inputError : inputNormal}`}
              />
            </Field>

            <Field label="Category" required error={errors.categoryId?.message ?? state.fieldErrors.categoryId?.[0]}>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <select
                    {...field}
                    className={`${selectBase} ${errors.categoryId ? inputError : inputNormal}`}
                  >
                    <option value="">Select a category…</option>
                    {options.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </Field>

            <Field label="Department Owner" error={errors.departmentId?.message}>
              <Controller
                control={control}
                name="departmentId"
                render={({ field }) => (
                  <select
                    {...field}
                    className={`${selectBase} ${inputNormal}`}
                  >
                    <option value="">No department</option>
                    {options.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                )}
              />
            </Field>

            <Field
              label="Description"
              error={errors.description?.message}
              hint="Brief overview of this asset"
            >
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Enter a brief description…"
                className={`${textareaBase} ${errors.description ? inputError : inputNormal}`}
              />
            </Field>

            <Field label="Notes" error={errors.notes?.message}>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Any additional notes…"
                className={`${textareaBase} ${inputNormal}`}
              />
            </Field>

            <Field label="Current Location" error={errors.location?.message} hint="e.g. HQ Floor 2, Warehouse A">
              <input
                {...register("location")}
                placeholder="e.g. Warehouse, HQ Floor 2"
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>
          </div>

          {/* ── SECTION: Identification ── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SectionHeader title="Identification" />

            <Field
              label="Serial Number"
              error={errors.serialNumber?.message ?? state.fieldErrors.serialNumber?.[0]}
              hint="Must be unique"
            >
              <input
                {...register("serialNumber")}
                placeholder="e.g. SN-DELL-20241115"
                className={`${inputBase} ${errors.serialNumber ? inputError : inputNormal}`}
              />
            </Field>

            <Field label="Manufacturer" error={errors.manufacturer?.message}>
              <input
                {...register("manufacturer")}
                placeholder="e.g. Dell, HP, Herman Miller"
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>

            <Field label="Model" error={errors.model?.message}>
              <input
                {...register("model")}
                placeholder="e.g. Latitude 5540"
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>
          </div>

          {/* ── SECTION: Status & Condition ── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SectionHeader title="Status & Condition" />

            <Field label="Condition" required error={errors.condition?.message}>
              <Controller
                control={control}
                name="condition"
                render={({ field }) => (
                  <select {...field} className={`${selectBase} ${inputNormal}`}>
                    {CONDITION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
              />
            </Field>

            <Field
              label="Status"
              required
              error={errors.status?.message}
              hint={mode === "create" ? "Allocation status is set automatically when assigned" : undefined}
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <select
                    {...field}
                    disabled={mode === "edit" && field.value === "ALLOCATED"}
                    className={`${selectBase} ${inputNormal} disabled:opacity-60`}
                  >
                    {statusOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
              />
            </Field>

            {/* Bookable toggle */}
            <Field label="Shared / Bookable" error={errors.isBookable?.message}>
              <Controller
                control={control}
                name="isBookable"
                render={({ field }) => (
                  <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="size-4 rounded accent-primary"
                    />
                    <span className="text-sm text-foreground">
                      Allow employees to book this asset
                    </span>
                  </label>
                )}
              />
            </Field>
          </div>

          {/* ── SECTION: Acquisition & Warranty ── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <SectionHeader title="Acquisition & Warranty" />

            <Field label="Acquisition Date" error={errors.acquisitionDate?.message}>
              <input
                type="date"
                {...register("acquisitionDate")}
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>

            <Field
              label="Acquisition Cost (₹)"
              error={errors.acquisitionCost?.message}
              hint="For reporting only"
            >
              <input
                type="number"
                {...register("acquisitionCost")}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>

            <Field label="Warranty Start Date" error={errors.warrantyStartDate?.message}>
              <input
                type="date"
                {...register("warrantyStartDate")}
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>

            <Field label="Warranty End Date" error={errors.warrantyEndDate?.message}>
              <input
                type="date"
                {...register("warrantyEndDate")}
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>
          </div>

          {/* ── SECTION: Category Custom Fields ── */}
          {selectedCategory && selectedCategory.customFields.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SectionHeader title={`${selectedCategory.name} — Specific Fields`} />

              {selectedCategory.customFields.map((field) => {
                const val = customValues[field.id] ?? "";

                if (field.fieldType === "ENUM") {
                  return (
                    <Field key={field.id} label={field.key}>
                      <select
                        value={val}
                        onChange={(e) =>
                          setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className={`${selectBase} ${inputNormal}`}
                      >
                        <option value="">— Select —</option>
                        {field.enumOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </Field>
                  );
                }

                if (field.fieldType === "DATE") {
                  return (
                    <Field key={field.id} label={field.key}>
                      <input
                        type="date"
                        value={val}
                        onChange={(e) =>
                          setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className={`${inputBase} ${inputNormal}`}
                      />
                    </Field>
                  );
                }

                if (field.fieldType === "NUMBER") {
                  return (
                    <Field key={field.id} label={field.key}>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) =>
                          setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        placeholder="Enter a number…"
                        step="any"
                        className={`${inputBase} ${inputNormal}`}
                      />
                    </Field>
                  );
                }

                // TEXT (default)
                return (
                  <Field key={field.id} label={field.key}>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder={`Enter ${field.key}…`}
                      className={`${inputBase} ${inputNormal}`}
                    />
                  </Field>
                );
              })}
            </div>
          )}

          {/* ── SECTION: Photos, Documents & QR Code ── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SectionHeader title="Photos, Documents & QR Code" />

            <Field
              label="Photo URLs"
              error={errors.photoUrls?.message}
              hint="One URL per line"
            >
              <textarea
                {...register("photoUrls")}
                rows={4}
                placeholder={
                  "https://example.com/photo1.jpg\nhttps://example.com/photo2.png"
                }
                className={`${textareaBase} ${inputNormal} font-mono text-xs`}
              />
              {/* Live photo preview */}
              {photoUrlList.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photoUrlList.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Preview ${i + 1}`}
                      className="size-16 rounded-lg border border-border object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ))}
                </div>
              )}
            </Field>

            <Field
              label="Document URLs"
              error={errors.documentUrls?.message}
              hint="One URL per line (PDFs, manuals, invoices)"
            >
              <textarea
                {...register("documentUrls")}
                rows={4}
                placeholder={
                  "https://example.com/manual.pdf\nhttps://example.com/invoice.pdf"
                }
                className={`${textareaBase} ${inputNormal} font-mono text-xs`}
              />
            </Field>

            <Field
              label="QR Code"
              error={errors.qrCode?.message ?? state.fieldErrors.qrCode?.[0]}
              hint="Unique identifier — used for scanning"
            >
              <input
                {...register("qrCode")}
                placeholder="e.g. QR-AF0001"
                className={`${inputBase} ${errors.qrCode ? inputError : inputNormal}`}
              />
            </Field>
          </div>

          {/* ── Server error/success message ── */}
          {state.message && (
            <p
              className={`rounded-xl border px-4 py-3 text-sm ${
                state.success
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {state.message}
            </p>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Link
              href={mode === "edit" && asset ? `/assets/${asset.id}` : "/assets"}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Cancel
            </Link>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending
                ? mode === "create"
                  ? "Registering…"
                  : "Saving…"
                : mode === "create"
                ? "Register Asset"
                : "Save Changes"}
            </Button>
          </div>

        </div>
      </form>
    </section>
  );
}
