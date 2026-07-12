"use client";

import { useActionState, useTransition, useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { allocateAsset, type ActionState } from "../actions";
import { allocationSchema, type AllocationFormValues } from "../_lib/allocation-schema";
import type {
  getAvailableAssetsForAllocation,
  getActiveEmployees,
  getActiveDepartments,
} from "../_lib/allocation-data";
import Link from "next/link";

type Asset = Awaited<ReturnType<typeof getAvailableAssetsForAllocation>>[number];
type Employee = Awaited<ReturnType<typeof getActiveEmployees>>[number];
type Department = Awaited<ReturnType<typeof getActiveDepartments>>[number];

const INITIAL_STATE: ActionState = { success: false, message: "", fieldErrors: {} };

const inputBase =
  "h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring";
const inputError = "border-destructive";
const inputNormal = "border-border";
const selectBase =
  "h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring appearance-none cursor-pointer";

const CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"] as const;

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

export function AllocationForm({
  assets,
  employees,
  departments,
}: {
  assets: Asset[];
  employees: Employee[];
  departments: Department[];
}) {
  const router = useRouter();
  const [serverState, dispatchAction] = useActionState(allocateAsset, INITIAL_STATE);
  const [isPending, startTransition] = useTransition();

  const [assetSearch, setAssetSearch] = useState("");
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<AllocationFormValues>({
    defaultValues: {
      assetId: "",
      allocationType: "EMPLOYEE",
      employeeId: "",
      departmentId: "",
      expectedReturnDate: "",
      conditionAtAllocation: "",
      purpose: "",
    },
  });

  const allocationType = watch("allocationType");

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAssetDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredAssets = assets.filter((a) => {
    const q = assetSearch.toLowerCase();
    return (
      a.tag.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.category.name.toLowerCase().includes(q)
    );
  });

  function onSubmit(values: AllocationFormValues) {
    const parsed = allocationSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path[0] as keyof AllocationFormValues, { message: issue.message });
      }
      return;
    }
    const fd = new FormData();
    fd.set("assetId", values.assetId);
    fd.set("allocationType", values.allocationType);
    fd.set("employeeId", values.employeeId ?? "");
    fd.set("departmentId", values.departmentId ?? "");
    fd.set("expectedReturnDate", values.expectedReturnDate ?? "");
    fd.set("conditionAtAllocation", values.conditionAtAllocation ?? "");
    fd.set("purpose", values.purpose ?? "");
    startTransition(() => dispatchAction(fd));
  }

  if (serverState.success && serverState.redirectTo) {
    router.push(serverState.redirectTo);
  }

  return (
    <section className="rounded-[1.5rem] border border-border bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-semibold text-foreground">Allocate Asset</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Assign an available asset to an employee or department.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        {/* Server error banner */}
        {!serverState.success && serverState.message && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverState.message}
          </div>
        )}

        <div className="grid gap-8">

          {/* ── SECTION: Asset Selection ── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SectionHeader title="Asset Selection" />

            {/* Asset combobox — full row */}
            <div className="col-span-full">
              <Controller
                name="assetId"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Asset"
                    required
                    error={errors.assetId?.message ?? serverState.fieldErrors.assetId?.[0]}
                  >
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowAssetDropdown((v) => !v)}
                        className={`${inputBase} flex items-center gap-2 text-left ${
                          errors.assetId ? inputError : inputNormal
                        }`}
                      >
                        {selectedAsset ? (
                          <>
                            <span className="font-mono text-xs text-muted-foreground shrink-0 w-16">
                              {selectedAsset.tag}
                            </span>
                            <span className="flex-1 truncate font-medium">
                              {selectedAsset.name}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {selectedAsset.category.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            Search available assets…
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-muted-foreground text-xs">▾</span>
                      </button>

                      {showAssetDropdown && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
                          <div className="border-b border-border px-3 py-2.5 bg-muted/30">
                            <input
                              autoFocus
                              placeholder="Type to search by name, tag, or category…"
                              value={assetSearch}
                              onChange={(e) => setAssetSearch(e.target.value)}
                              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                          <div className="max-h-72 overflow-y-auto">
                            {filteredAssets.length === 0 ? (
                              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                No available assets match your search
                              </div>
                            ) : (
                              filteredAssets.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent transition-colors border-b border-border/50 last:border-0"
                                  onClick={() => {
                                    setSelectedAsset(a);
                                    field.onChange(a.id);
                                    setShowAssetDropdown(false);
                                    setAssetSearch("");
                                  }}
                                >
                                  <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">
                                    {a.tag}
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block font-medium truncate">{a.name}</span>
                                    <span className="block text-xs text-muted-foreground truncate">
                                      {a.category.name}
                                      {a.location ? ` · ${a.location}` : ""}
                                    </span>
                                  </span>
                                  <span
                                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                                      a.condition === "NEW" || a.condition === "GOOD"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : a.condition === "FAIR"
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    }`}
                                  >
                                    {a.condition.charAt(0) + a.condition.slice(1).toLowerCase()}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selected asset detail strip */}
                    {selectedAsset && (
                      <div className="mt-2 flex items-center gap-6 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs">
                        <span>
                          <span className="text-muted-foreground">Category: </span>
                          <span className="font-medium">{selectedAsset.category.name}</span>
                        </span>
                        {selectedAsset.location && (
                          <span>
                            <span className="text-muted-foreground">Location: </span>
                            <span className="font-medium">{selectedAsset.location}</span>
                          </span>
                        )}
                        <span>
                          <span className="text-muted-foreground">Condition: </span>
                          <span className="font-medium">
                            {selectedAsset.condition.charAt(0) +
                              selectedAsset.condition.slice(1).toLowerCase()}
                          </span>
                        </span>
                        {selectedAsset.department && (
                          <span>
                            <span className="text-muted-foreground">Dept: </span>
                            <span className="font-medium">{selectedAsset.department.name}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </Field>
                )}
              />
            </div>
          </div>

          {/* ── SECTION: Recipient ── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SectionHeader title="Recipient" />

            {/* Allocation type toggle */}
            <div className="col-span-full">
              <Field label="Allocate to">
                <Controller
                  name="allocationType"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      {(["EMPLOYEE", "DEPARTMENT"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={`flex-1 max-w-[200px] rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                            field.value === type
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:bg-accent"
                          }`}
                        >
                          {type === "EMPLOYEE" ? "👤 Employee" : "🏢 Department"}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </Field>
            </div>

            {allocationType === "EMPLOYEE" ? (
              <div className="sm:col-span-2">
                <Field
                  label="Employee"
                  required
                  error={errors.employeeId?.message ?? serverState.fieldErrors.employeeId?.[0]}
                >
                  <select
                    {...register("employeeId")}
                    className={`${selectBase} ${errors.employeeId ? inputError : inputNormal}`}
                  >
                    <option value="">Select employee…</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.department ? ` (${e.department.name})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <Field
                  label="Department"
                  required
                  error={errors.departmentId?.message ?? serverState.fieldErrors.departmentId?.[0]}
                >
                  <select
                    {...register("departmentId")}
                    className={`${selectBase} ${errors.departmentId ? inputError : inputNormal}`}
                  >
                    <option value="">Select department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </div>

          {/* ── SECTION: Allocation Details ── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SectionHeader title="Allocation Details" />

            <Field
              label="Expected Return Date"
              error={errors.expectedReturnDate?.message}
              hint="Leave blank if the allocation is permanent"
            >
              <input
                type="date"
                {...register("expectedReturnDate")}
                min={new Date().toISOString().split("T")[0]}
                className={`${inputBase} ${inputNormal}`}
              />
            </Field>

            <Field
              label="Condition at Allocation"
              error={errors.conditionAtAllocation?.message}
            >
              <select
                {...register("conditionAtAllocation")}
                className={`${selectBase} ${inputNormal}`}
              >
                <option value="">Select condition…</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </Field>

            <div className="col-span-full">
              <Field label="Purpose / Notes" error={errors.purpose?.message}>
                <textarea
                  {...register("purpose")}
                  rows={3}
                  placeholder="Describe the purpose of this allocation…"
                  className={`w-full rounded-xl border bg-card px-3 py-2.5 text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground transition-colors focus:border-ring ${inputNormal}`}
                />
              </Field>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-6">
          <Link
            href="/allocations"
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending || !selectedAsset}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Allocating…" : "Allocate Asset"}
          </button>
        </div>
      </form>
    </section>
  );
}
