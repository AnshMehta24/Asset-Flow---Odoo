"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";

export async function updateEmployeeStatus(
  userId: string,
  nextStatus: "ACTIVE" | "INACTIVE"
) {
  await prisma.user.updateMany({
    where: {
      id: userId,
      role: {
        not: "ADMIN",
      },
    },
    data: {
      status: nextStatus,
    },
  });

  revalidatePath("/organization/employee-directory");
}

export async function updateEmployeeRole(userId: string, formData: FormData) {
  const nextRole = String(formData.get("role") ?? "EMPLOYEE");
  const headOfDepartmentId = formData.get("headOfDepartmentId")
    ? String(formData.get("headOfDepartmentId"))
    : null;

  if (nextRole !== "EMPLOYEE" && nextRole !== "ASSET_MANAGER") {
    return;
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: {
        id: userId,
        role: {
          not: "ADMIN",
        },
      },
      data: {
        role: nextRole,
      },
    }),
    // Clear old head assignments for this user
    prisma.department.updateMany({
      where: { headId: userId },
      data: { headId: null },
    }),
    // If a department is selected, assign this user as its head
    ...(headOfDepartmentId
      ? [
          prisma.department.update({
            where: { id: headOfDepartmentId },
            data: { headId: userId },
          }),
        ]
      : []),
  ]);

  revalidatePath("/organization/employee-directory");
}
