"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { createAsset, updateAsset, type AssetFormState } from "../actions";
import type { AssetFormOptions } from "../_lib/asset-data";
import { assetSchema, type AssetFormValues } from "../_lib/asset-schema";

const inputBase =
  "h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring";
const inputError = "border-destructive";
const inputNormal = "border-border";
const textareaBase =
  "w-full rounded-xl border bg-card px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring resize-none";
const selectBase =
  "h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring appearance-none cursor-pointer";

const CREATE_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "LOST", label: "Lost" },
  { value: "RETIRED", label: "Retired" },
  { value: "DISPOSED", label: "Disposed" },
] as const;

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

const initialState: AssetFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

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

export function AssetForm({
  mode,
  options,
  asset,
}: {
  mode: "create" | "edit";
  options: AssetFormOptions;
  asset?: ExistingAsset;
}) {
  const formAction =
    mode === "edit" && asset
      ? (updateAsset.bind(null, asset.id) as (
          state: AssetFormState,
          formData: FormData
        ) => Promise<AssetFormState>)
      : createAsset;

  const [state, dispatchAction] = useActionState(formAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>(asset?.photoUrls ?? []);

  const existingCustomValues = new Map<string, string>();
  if (asset) {
    for (const value of asset.customFieldValues) {
      existingCustomValues.set(
        value.fieldId,
        value.valueEnum ??
          value.valueText ??
          value.valueDate?.toISOString().slice(0, 10) ??
          value.valueNumber?.toString() ??
          ""
      );
    }
  }

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<AssetFormValues>({
    defaultValues: {
      name: asset?.name ?? "",
      description: asset?.description ?? "",
      categoryId: asset?.categoryId ?? "",
      serialNumber: asset?.serialNumber ?? "",
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
      departmentId: asset?.departmentId ?? "",
      isBookable: asset?.isBookable ?? false,
      notes: asset?.notes ?? "",
      photoUrls: (asset?.photoUrls ?? []).join("\n"),
      documentUrls: (asset?.documentUrls ?? []).join("\n"),
      qrCode: asset?.qrCode ?? "",
    },
  });

  useEffect(() => {
    setValue("photoUrls", photoUrls.join("\n"), { shouldDirty: true });
  }, [photoUrls, setValue]);

  const selectedCategoryId = useWatch({
    control,
    name: "categoryId",
  });
  const selectedCategory = options.categories.find(
    (category) => category.id === selectedCategoryId
  );

  const [customValues, setCustomValues] = useState<Record<string, string>>(
    Object.fromEntries(existingCustomValues)
  );

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setIsUploadingPhotos(true);
    setPhotoUploadError(null);

    try {
      const uploadedUrls = await Promise.all(
        Array.from(files).map(async (file) => {
          const formData = new FormData();
          formData.set("file", file);

          const response = await fetch("/api/uploads/assets", {
            method: "POST",
            body: formData,
          });

          const data = (await response.json().catch(() => null)) as
            | { url?: string; error?: string }
            | null;

          if (!response.ok || !data?.url) {
            throw new Error(data?.error ?? "Photo upload failed.");
          }

          return data.url;
        })
      );

      setPhotoUrls((current) => [...current, ...uploadedUrls]);
    } catch (error) {
      setPhotoUploadError(
        error instanceof Error ? error.message : "Photo upload failed."
      );
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  function removePhoto(url: string) {
    setPhotoUrls((current) => current.filter((item) => item !== url));
  }

  function onSubmit(values: AssetFormValues) {
    const parsed = assetSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof AssetFormValues;
        setError(field, { message: issue.message });
      }
      return;
    }

    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("description", values.description ?? "");
    formData.set("categoryId", values.categoryId);
    formData.set("serialNumber", values.serialNumber ?? "");
    formData.set("manufacturer", values.manufacturer ?? "");
    formData.set("model", values.model ?? "");
    formData.set("acquisitionDate", values.acquisitionDate ?? "");
    formData.set("acquisitionCost", values.acquisitionCost ?? "");
    formData.set("warrantyStartDate", values.warrantyStartDate ?? "");
    formData.set("warrantyEndDate", values.warrantyEndDate ?? "");
    formData.set("condition", values.condition);
    formData.set("status", values.status);
    formData.set("location", values.location ?? "");
    formData.set("departmentId", values.departmentId ?? "");
    formData.set("isBookable", values.isBookable ? "true" : "false");
    formData.set("notes", values.notes ?? "");
    formData.set("photoUrls", photoUrls.join("\n"));
    formData.set("documentUrls", values.documentUrls ?? "");
    formData.set("qrCode", asset?.qrCode ?? "");

    for (const [fieldId, value] of Object.entries(customValues)) {
      if (value.trim()) {
        formData.set(`customField_${fieldId}`, value.trim());
      }
    }

    startTransition(() => dispatchAction(formData));
  }

  const statusOptions = mode === "edit" ? EDIT_STATUS_OPTIONS : CREATE_STATUS_OPTIONS;

  return (
    <section className="rounded-[1.5rem] border border-border bg-background">
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "create" ? "Register New Asset" : "Edit Asset"}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {mode === "create"
            ? "Create the asset record and attach supporting media."
            : "Update the asset record and media."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <div className="grid gap-8">
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
                    <option value="">Select a category...</option>
                    {options.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
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
                  <select {...field} className={`${selectBase} ${inputNormal}`}>
                    <option value="">No department</option>
                    {options.departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name} ({department.code})
                      </option>
                    ))}
                  </select>
                )}
              />
            </Field>

            <Field label="Description" error={errors.description?.message}>
              <textarea
                {...register("description")}
                rows={3}
                className={`${textareaBase} ${errors.description ? inputError : inputNormal}`}
              />
            </Field>

            <Field label="Notes" error={errors.notes?.message}>
              <textarea
                {...register("notes")}
                rows={3}
                className={`${textareaBase} ${inputNormal}`}
              />
            </Field>

            <Field label="Current Location" error={errors.location?.message}>
              <input
                {...register("location")}
                placeholder="e.g. HQ Floor 2"
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SectionHeader title="Identification" />

            <Field
              label="Serial Number"
              error={errors.serialNumber?.message ?? state.fieldErrors.serialNumber?.[0]}
            >
              <input
                {...register("serialNumber")}
                placeholder="e.g. SN-DELL-20241115"
                className={`${inputBase} ${errors.serialNumber ? inputError : inputNormal}`}
              />
            </Field>

            <Field label="Manufacturer" error={errors.manufacturer?.message}>
              <input {...register("manufacturer")} className={`${inputBase} ${inputNormal}`} />
            </Field>

            <Field label="Model" error={errors.model?.message}>
              <input {...register("model")} className={`${inputBase} ${inputNormal}`} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SectionHeader title="Status & Condition" />

            <Field label="Condition" required error={errors.condition?.message}>
              <Controller
                control={control}
                name="condition"
                render={({ field }) => (
                  <select {...field} className={`${selectBase} ${inputNormal}`}>
                    {CONDITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </Field>

            <Field label="Status" required error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <select
                    {...field}
                    disabled={mode === "edit" && field.value === "ALLOCATED"}
                    className={`${selectBase} ${inputNormal} disabled:opacity-60`}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </Field>

            <Field label="Shared / Bookable">
              <Controller
                control={control}
                name="isBookable"
                render={({ field }) => (
                  <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <SectionHeader title="Acquisition & Warranty" />

            <Field label="Acquisition Date" error={errors.acquisitionDate?.message}>
              <input type="date" {...register("acquisitionDate")} className={`${inputBase} ${inputNormal}`} />
            </Field>

            <Field label="Acquisition Cost (INR)" error={errors.acquisitionCost?.message}>
              <input
                type="number"
                {...register("acquisitionCost")}
                min="0"
                step="0.01"
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>

            <Field label="Warranty Start Date" error={errors.warrantyStartDate?.message}>
              <input type="date" {...register("warrantyStartDate")} className={`${inputBase} ${inputNormal}`} />
            </Field>

            <Field label="Warranty End Date" error={errors.warrantyEndDate?.message}>
              <input type="date" {...register("warrantyEndDate")} className={`${inputBase} ${inputNormal}`} />
            </Field>
          </div>

          {selectedCategory && selectedCategory.customFields.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SectionHeader title={`${selectedCategory.name} Specific Fields`} />

              {selectedCategory.customFields.map((field) => {
                const value = customValues[field.id] ?? "";

                if (field.fieldType === "ENUM") {
                  return (
                    <Field key={field.id} label={field.key}>
                      <select
                        value={value}
                        onChange={(event) =>
                          setCustomValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        className={`${selectBase} ${inputNormal}`}
                      >
                        <option value="">Select</option>
                        {field.enumOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
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
                        value={value}
                        onChange={(event) =>
                          setCustomValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
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
                        value={value}
                        onChange={(event) =>
                          setCustomValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        className={`${inputBase} ${inputNormal}`}
                      />
                    </Field>
                  );
                }

                return (
                  <Field key={field.id} label={field.key}>
                    <input
                      value={value}
                      onChange={(event) =>
                        setCustomValues((current) => ({
                          ...current,
                          [field.id]: event.target.value,
                        }))
                      }
                      className={`${inputBase} ${inputNormal}`}
                    />
                  </Field>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <SectionHeader title="Photos & Documents" />

            <div className="lg:col-span-2 space-y-4">
              <Field
                label="Asset Photos"
                error={photoUploadError ?? errors.photoUrls?.message}
                hint="Upload one or more images to Cloudinary."
              >
                <div className="rounded-2xl border border-dashed border-border bg-card p-4">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                    {isUploadingPhotos ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="size-4" />
                        Upload Photos
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => void handlePhotoUpload(event.target.files)}
                    />
                  </label>

                  {photoUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {photoUrls.map((url) => (
                        <div
                          key={url}
                          className="group relative overflow-hidden rounded-xl border border-border bg-background"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Asset"
                            className="aspect-square w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(url)}
                            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>

            <div className="space-y-4">
              <Field
                label="Document URLs"
                error={errors.documentUrls?.message}
                hint="One URL per line"
              >
                <textarea
                  {...register("documentUrls")}
                  rows={8}
                  className={`${textareaBase} ${inputNormal} font-mono text-xs`}
                />
              </Field>

              <Field
                label="QR Code"
                error={errors.qrCode?.message ?? state.fieldErrors.qrCode?.[0]}
                hint="Generated automatically after save when Cloudinary is configured."
              >
                <div className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                  {asset?.qrCode ? "QR code already generated for this asset." : "QR code will be generated automatically."}
                </div>
              </Field>
            </div>
          </div>

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

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Link
              href={mode === "edit" && asset ? `/assets/${asset.id}` : "/assets"}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              size="lg"
              disabled={isPending || isUploadingPhotos}
            >
              {isPending
                ? mode === "create"
                  ? "Registering..."
                  : "Saving..."
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
