"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, buttonVariants } from "@/components/ui/button";
import type { DepartmentFormState } from "../actions";
import { createDepartment, updateDepartment } from "../actions";
import type { DepartmentFormOptions } from "../_lib/department-data";
import { departmentSchema, type DepartmentFormValues } from "../_lib/department-schema";

const initialState: DepartmentFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

const inputBase =
  "h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring";
const inputError = "border-destructive";
const inputNormal = "border-border";

export function DepartmentForm({
  mode,
  options,
  department,
}: {
  mode: "create" | "edit";
  options: DepartmentFormOptions;
  department?: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    status: "ACTIVE" | "INACTIVE";
    parentId: string | null;
    headId: string | null;
  };
}) {
  const formServerAction =
    mode === "edit" && department
      ? (updateDepartment.bind(
          null,
          department.id
        ) as (
          state: DepartmentFormState,
          payload: FormData
        ) => Promise<DepartmentFormState>)
      : createDepartment;

  const [state, dispatchAction] = useActionState(formServerAction, initialState);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: department?.name ?? "",
      code: department?.code ?? "",
      description: department?.description ?? "",
      parentId: department?.parentId ?? "",
      headId: department?.headId ?? "",
      status: department?.status ?? "ACTIVE",
    },
  });

  function onSubmit(values: DepartmentFormValues) {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("code", values.code.toUpperCase());
    formData.set("description", values.description ?? "");
    formData.set("parentId", values.parentId ?? "");
    formData.set("headId", values.headId ?? "");
    formData.set("status", values.status);
    startTransition(() => {
      dispatchAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors.name?.[0];
  const codeError = errors.code?.message ?? state.fieldErrors.code?.[0];
  const descError = errors.description?.message ?? state.fieldErrors.description?.[0];
  const parentError = errors.parentId?.message ?? state.fieldErrors.parentId?.[0];
  const headError = errors.headId?.message ?? state.fieldErrors.headId?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors.status?.[0];

  return (
    <section className="rounded-[1.5rem] border border-border bg-background">
      <div className="border-b border-border px-5 py-4">
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "create" ? "Create Department" : "Edit Department"}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Department Name" required error={nameError}>
            <input
              {...register("name")}
              placeholder="e.g. Engineering"
              className={`${inputBase} ${nameError ? inputError : inputNormal}`}
            />
          </Field>

          <Field label="Department Code" required error={codeError}>
            <input
              {...register("code")}
              placeholder="e.g. ENG"
              className={`${inputBase} ${codeError ? inputError : inputNormal}`}
            />
          </Field>
        </div>

        <Field label="Description" error={descError}>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Optional description…"
            className={`w-full rounded-xl border bg-card px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring ${descError ? inputError : inputNormal}`}
          />
        </Field>

        <div className="grid gap-5 lg:grid-cols-3">
          <Field label="Parent Department" error={parentError}>
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <select
                  {...field}
                  className={`${inputBase} ${parentError ? inputError : inputNormal}`}
                >
                  <option value="">--</option>
                  {options.parentDepartments.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name} ({parent.code})
                    </option>
                  ))}
                </select>
              )}
            />
          </Field>

          <Field label="Department Head" error={headError}>
            <Controller
              control={control}
              name="headId"
              render={({ field }) => (
                <select
                  {...field}
                  className={`${inputBase} ${headError ? inputError : inputNormal}`}
                >
                  <option value="">Unassigned</option>
                  {options.headCandidates.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </Field>

          <Field label="Status" error={statusError}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <select
                  {...field}
                  className={`${inputBase} ${statusError ? inputError : inputNormal}`}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              )}
            />
          </Field>
        </div>

        {state.message && (
          <p
            className={`rounded-xl border px-3 py-2.5 text-sm ${
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
            href="/organization/departments"
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
                ? "Create Department"
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
