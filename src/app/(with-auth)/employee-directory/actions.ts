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

  revalidatePath("/employee-directory");
}

export async function updateEmployeeRole(userId: string, formData: FormData) {
  const nextRole = String(formData.get("role") ?? "EMPLOYEE");

  if (
    nextRole !== "EMPLOYEE" &&
    nextRole !== "DEPARTMENT_HEAD" &&
    nextRole !== "ASSET_MANAGER"
  ) {
    return;
  }

  await prisma.user.updateMany({
    where: {
      id: userId,
      role: {
        not: "ADMIN",
      },
    },
    data: {
      role: nextRole,
    },
  });

  revalidatePath("/employee-directory");
}
