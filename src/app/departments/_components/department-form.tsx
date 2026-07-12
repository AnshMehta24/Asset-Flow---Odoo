"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { DepartmentFormState } from "../actions";
import { createDepartment, updateDepartment } from "../actions";
import type { DepartmentFormOptions } from "../_lib/department-data";

const initialState: DepartmentFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

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
  const [state, formAction, pending] = useActionState(
    formServerAction,
    initialState
  );

  return (
    <section className="rounded-[1.5rem] border border-border bg-background">
      <div className="border-b border-border px-5 py-4">
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "create" ? "Create Department" : "Edit Department"}
        </h1>
      </div>

      <form action={formAction} className="space-y-5 p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Department Name"
            name="name"
            defaultValue={department?.name}
            error={state.fieldErrors.name?.[0]}
            required
          />
          <Field
            label="Department Code"
            name="code"
            defaultValue={department?.code}
            error={state.fieldErrors.code?.[0]}
            required
          />
        </div>

        <Field
          label="Description"
          name="description"
          defaultValue={department?.description ?? ""}
          error={state.fieldErrors.description?.[0]}
          multiline
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <SelectField
            label="Parent Department"
            name="parentId"
            defaultValue={department?.parentId ?? ""}
            options={[
              { value: "", label: "--" },
              ...options.parentDepartments.map((parent) => ({
                value: parent.id,
                label: `${parent.name} (${parent.code})`,
              })),
            ]}
            error={state.fieldErrors.parentId?.[0]}
          />
          <SelectField
            label="Department Head"
            name="headId"
            defaultValue={department?.headId ?? ""}
            options={[
              { value: "", label: "Unassigned" },
              ...options.headCandidates.map((user) => ({
                value: user.id,
                label: user.name,
              })),
            ]}
            error={state.fieldErrors.headId?.[0]}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={department?.status ?? "ACTIVE"}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
            error={state.fieldErrors.status?.[0]}
          />
        </div>

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
            href="/departments"
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
  name,
  defaultValue,
  error,
  required = false,
  multiline = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
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
          rows={4}
          className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground outline-none"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          required={required}
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none"
        />
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}
