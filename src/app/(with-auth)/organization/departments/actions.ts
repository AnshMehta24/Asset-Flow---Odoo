"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";

type DepartmentStatusValue = "ACTIVE" | "INACTIVE";

export type DepartmentFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
};

function getTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validateDepartmentPayload(formData: FormData) {
  const name = getTrimmedString(formData, "name");
  const code = getTrimmedString(formData, "code").toUpperCase();
  const description = getTrimmedString(formData, "description");
  const parentId = getTrimmedString(formData, "parentId");
  const headId = getTrimmedString(formData, "headId");
  const statusValue = getTrimmedString(formData, "status");
  const fieldErrors: DepartmentFormState["fieldErrors"] = {};

  if (!name) {
    fieldErrors.name = ["Department name is required."];
  }

  if (!code) {
    fieldErrors.code = ["Department code is required."];
  }

  if (code && code.length > 20) {
    fieldErrors.code = ["Department code must be 20 characters or less."];
  }

  if (description.length > 500) {
    fieldErrors.description = ["Description must be 500 characters or less."];
  }

  const status: DepartmentStatusValue | null =
    statusValue === "INACTIVE"
      ? "INACTIVE"
      : statusValue === "ACTIVE"
        ? "ACTIVE"
        : null;

  if (!status) {
    fieldErrors.status = ["Please choose a valid status."];
  }

  return {
    values: {
      name,
      code,
      description: description || null,
      parentId: parentId || null,
      headId: headId || null,
      status,
    },
    fieldErrors,
  };
}

async function hasCircularParent(departmentId: string, parentId: string | null) {
  let currentParentId = parentId;

  while (currentParentId) {
    if (currentParentId === departmentId) {
      return true;
    }

    const currentParent = await prisma.department.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });

    currentParentId = currentParent?.parentId ?? null;
  }

  return false;
}

export async function createDepartment(
  _prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const { values, fieldErrors } = validateDepartmentPayload(formData);

  if (Object.keys(fieldErrors).length > 0 || !values.status) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const duplicateDepartment = await prisma.department.findFirst({
    where: {
      OR: [{ name: values.name }, { code: values.code }],
    },
    select: {
      name: true,
      code: true,
    },
  });

  if (duplicateDepartment) {
    return {
      success: false,
      message: "Department already exists.",
      fieldErrors: {
        ...(duplicateDepartment.name === values.name
          ? { name: ["Department name must be unique."] }
          : {}),
        ...(duplicateDepartment.code === values.code
          ? { code: ["Department code must be unique."] }
          : {}),
      },
    };
  }

  if (values.parentId) {
    const parentDepartment = await prisma.department.findUnique({
      where: { id: values.parentId },
      select: { id: true },
    });

    if (!parentDepartment) {
      return {
        success: false,
        message: "Selected parent department was not found.",
        fieldErrors: {
          parentId: ["Please choose a valid parent department."],
        },
      };
    }
  }

  await prisma.department.create({
    data: {
      name: values.name,
      code: values.code,
      description: values.description,
      status: values.status,
      parentId: values.parentId,
      headId: values.headId,
    },
  });

  revalidatePath("/organization/departments");
  redirect("/organization/departments");
}

export async function updateDepartment(
  departmentId: string,
  _prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const { values, fieldErrors } = validateDepartmentPayload(formData);

  if (Object.keys(fieldErrors).length > 0 || !values.status) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const existingDepartment = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true },
  });

  if (!existingDepartment) {
    return {
      success: false,
      message: "Department not found.",
      fieldErrors: {},
    };
  }

  const duplicateDepartment = await prisma.department.findFirst({
    where: {
      id: {
        not: departmentId,
      },
      OR: [{ name: values.name }, { code: values.code }],
    },
    select: {
      name: true,
      code: true,
    },
  });

  if (duplicateDepartment) {
    return {
      success: false,
      message: "Department already exists.",
      fieldErrors: {
        ...(duplicateDepartment.name === values.name
          ? { name: ["Department name must be unique."] }
          : {}),
        ...(duplicateDepartment.code === values.code
          ? { code: ["Department code must be unique."] }
          : {}),
      },
    };
  }

  if (await hasCircularParent(departmentId, values.parentId)) {
    return {
      success: false,
      message: "Parent department selection creates a circular hierarchy.",
      fieldErrors: {
        parentId: ["Please choose a valid parent department."],
      },
    };
  }

  await prisma.department.update({
    where: {
      id: departmentId,
    },
    data: {
      name: values.name,
      code: values.code,
      description: values.description,
      status: values.status,
      parentId: values.parentId,
      headId: values.headId,
    },
  });

  revalidatePath("/organization/departments");
  revalidatePath(`/organization/departments/${departmentId}/edit`);
  redirect("/organization/departments");
}
