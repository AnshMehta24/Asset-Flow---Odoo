"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/user";
import { createNotifications } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { formatAssetTag } from "@/lib/utils";

export type ActionState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
  redirectTo?: string;
};

const OK: ActionState = { success: true, message: "", fieldErrors: {} };

const FAIL = (
  message: string,
  fieldErrors: Record<string, string[] | undefined> = {}
): ActionState => ({
  success: false,
  message,
  fieldErrors,
});

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function optStr(fd: FormData, key: string): string | null {
  const value = str(fd, key);
  return value || null;
}

function optDate(fd: FormData, key: string): Date | null {
  const value = str(fd, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function allocateAsset(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "ASSET_MANAGER"].includes(user.role)) {
    return FAIL("You do not have permission to allocate assets.");
  }

  const assetId = str(formData, "assetId");
  const allocationType = str(formData, "allocationType");
  const employeeId = optStr(formData, "employeeId");
  const departmentId = optStr(formData, "departmentId");
  const expectedReturnDate = optDate(formData, "expectedReturnDate");
  const conditionAtAllocation = optStr(formData, "conditionAtAllocation");

  if (!assetId) return FAIL("Asset is required.", { assetId: ["Required"] });
  if (allocationType === "EMPLOYEE" && !employeeId) {
    return FAIL("Employee is required.", { employeeId: ["Required"] });
  }
  if (allocationType === "DEPARTMENT" && !departmentId) {
    return FAIL("Department is required.", { departmentId: ["Required"] });
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, status: true, name: true, tagNumber: true },
  });

  if (!asset) return FAIL("Asset not found.");
  if (asset.status !== "AVAILABLE") {
    return FAIL(
      `Asset "${asset.name}" is currently ${asset.status.toLowerCase().replace("_", " ")} and cannot be allocated.`
    );
  }

  const existing = await prisma.allocation.findFirst({
    where: { assetId, status: "ACTIVE" },
    select: { id: true },
  });

  if (existing) {
    return FAIL("This asset already has an active allocation. Please use Transfer instead.");
  }

  await prisma.$transaction([
    prisma.allocation.create({
      data: {
        assetId,
        employeeId: allocationType === "EMPLOYEE" ? employeeId : null,
        departmentId: allocationType === "DEPARTMENT" ? departmentId : null,
        allocatedById: user.id,
        allocatedAt: new Date(),
        expectedReturnDate,
        returnConditionNotes: conditionAtAllocation
          ? `Condition at allocation: ${conditionAtAllocation}`
          : null,
      },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: { status: "ALLOCATED" },
    }),
  ]);

  if (employeeId) {
    await createNotifications([
      {
        userId: employeeId,
        type: "ASSET_ASSIGNED",
        title: "Asset assigned",
        message: `${asset.name} (${formatAssetTag(asset.tagNumber)}) has been assigned to you.`,
        link: "/allocations",
      },
    ]);
  }

  revalidatePath("/allocations");
  revalidatePath("/assets");
  revalidatePath("/");
  revalidatePath("/notifications");

  return {
    ...OK,
    message: "Asset allocated successfully.",
    redirectTo: "/allocations",
  };
}

export async function requestReturn(allocationId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return FAIL("Not authenticated.");

  const allocation = await prisma.allocation.findUnique({
    where: { id: allocationId },
    select: {
      id: true,
      status: true,
      returnRequestedAt: true,
      employeeId: true,
      departmentId: true,
    },
  });

  if (!allocation) return FAIL("Allocation not found.");
  if (allocation.status !== "ACTIVE") return FAIL("This allocation is not active.");
  if (allocation.returnRequestedAt) return FAIL("A return has already been requested.");

  const isApprover = ["ADMIN", "ASSET_MANAGER"].includes(user.role);
  const isAssignedEmployee = allocation.employeeId === user.id;
  const isDepartmentHead =
    user.role === "DEPARTMENT_HEAD" &&
    !!allocation.departmentId &&
    allocation.departmentId === user.departmentId;

  if (!isApprover && !isAssignedEmployee && !isDepartmentHead) {
    return FAIL("You do not have permission to request this return.");
  }

  await prisma.allocation.update({
    where: { id: allocationId },
    data: {
      returnRequestedAt: new Date(),
      returnRequestedById: user.id,
    },
  });

  revalidatePath(`/allocations/${allocationId}`);
  revalidatePath("/allocations");
  revalidatePath("/");

  return { ...OK, message: "Return request submitted. Awaiting approval." };
}

export async function approveReturn(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "ASSET_MANAGER"].includes(user.role)) {
    return FAIL("You do not have permission to approve returns.");
  }

  const allocationId = str(formData, "allocationId");
  const notes = optStr(formData, "notes");
  const wasDamaged = str(formData, "wasDamaged") === "true";

  const allocation = await prisma.allocation.findUnique({
    where: { id: allocationId },
    select: {
      id: true,
      status: true,
      assetId: true,
      employeeId: true,
      returnRequestedAt: true,
      returnRequestedById: true,
      asset: {
        select: {
          name: true,
          tagNumber: true,
        },
      },
    },
  });

  if (!allocation) return FAIL("Allocation not found.");
  if (allocation.status !== "ACTIVE") return FAIL("Allocation is not active.");

  const newAssetStatus = wasDamaged ? "UNDER_MAINTENANCE" : "AVAILABLE";

  await prisma.$transaction([
    prisma.allocation.update({
      where: { id: allocationId },
      data: {
        status: "RETURNED",
        returnedAt: new Date(),
        returnRequestedAt: allocation.returnRequestedAt ?? new Date(),
        returnRequestedById: allocation.returnRequestedById ?? user.id,
        returnApprovedById: user.id,
        returnConditionNotes: notes,
      },
    }),
    prisma.asset.update({
      where: { id: allocation.assetId },
      data: { status: newAssetStatus },
    }),
  ]);

  if (allocation.employeeId) {
    await createNotifications([
      {
        userId: allocation.employeeId,
        type: "ASSET_ASSIGNED",
        title: "Asset return completed",
        message: `${allocation.asset.name} (${formatAssetTag(allocation.asset.tagNumber)}) has been checked in successfully.`,
        link: `/allocations/${allocationId}`,
      },
    ]);
  }

  revalidatePath(`/allocations/${allocationId}`);
  revalidatePath("/allocations");
  revalidatePath("/assets");
  revalidatePath("/");
  revalidatePath("/notifications");

  return {
    ...OK,
    message: `Return processed. Asset is now ${newAssetStatus === "AVAILABLE" ? "available" : "sent to maintenance"}.`,
    redirectTo: "/allocations",
  };
}

export async function createTransferRequest(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return FAIL("Not authenticated.");

  const allocationId = str(formData, "allocationId");
  const assetId = str(formData, "assetId");
  const toEmployeeId = optStr(formData, "toEmployeeId");
  const toDepartmentId = optStr(formData, "toDepartmentId");
  const reason = optStr(formData, "reason");

  if (!assetId) return FAIL("Asset is required.");
  if (!toEmployeeId && !toDepartmentId) {
    return FAIL("Please select a recipient employee or department.", {
      toEmployeeId: ["Select at least one recipient"],
    });
  }
  if (toEmployeeId && toDepartmentId) {
    return FAIL("Select either an employee or a department, not both.");
  }

  const allocation = await prisma.allocation.findUnique({
    where: { id: allocationId },
    select: {
      id: true,
      status: true,
      employeeId: true,
      departmentId: true,
      assetId: true,
    },
  });

  if (!allocation || allocation.status !== "ACTIVE") {
    return FAIL("Allocation is not active; cannot request a transfer.");
  }
  if (allocation.employeeId && toEmployeeId && allocation.employeeId === toEmployeeId) {
    return FAIL("This asset is already allocated to the selected employee.");
  }
  if (allocation.departmentId && toDepartmentId && allocation.departmentId === toDepartmentId) {
    return FAIL("This asset is already allocated to the selected department.");
  }

  const existing = await prisma.transferRequest.findFirst({
    where: { assetId, status: "REQUESTED" },
    select: { id: true },
  });

  if (existing) {
    return FAIL("There is already a pending transfer request for this asset.");
  }

  await prisma.transferRequest.create({
    data: {
      assetId,
      allocationId,
      requestedById: user.id,
      fromEmployeeId: allocation.employeeId,
      toEmployeeId,
      toDepartmentId,
      reason,
      status: "REQUESTED",
    },
  });

  revalidatePath(`/allocations/${allocationId}`);
  revalidatePath("/allocations");
  revalidatePath("/allocations/transfers");

  return {
    ...OK,
    message: "Transfer request submitted.",
    redirectTo: "/allocations/transfers",
  };
}

export async function approveTransfer(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "ASSET_MANAGER"].includes(user.role)) {
    return FAIL("You do not have permission to approve transfers.");
  }

  const transferId = str(formData, "transferId");

  const transfer = await prisma.transferRequest.findUnique({
    where: { id: transferId },
    select: {
      id: true,
      status: true,
      assetId: true,
      allocationId: true,
      toEmployeeId: true,
      toDepartmentId: true,
      requestedById: true,
      asset: {
        select: {
          name: true,
          tagNumber: true,
        },
      },
    },
  });

  if (!transfer) return FAIL("Transfer request not found.");
  if (transfer.status !== "REQUESTED") return FAIL("Transfer is not in a requestable state.");

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (transfer.allocationId) {
      await tx.allocation.update({
        where: { id: transfer.allocationId },
        data: {
          status: "RETURNED",
          returnedAt: now,
          returnApprovedById: user.id,
          returnRequestedAt: now,
          returnRequestedById: transfer.requestedById,
        },
      });
    }

    await tx.allocation.create({
      data: {
        assetId: transfer.assetId,
        employeeId: transfer.toEmployeeId,
        departmentId: transfer.toDepartmentId,
        allocatedById: user.id,
        allocatedAt: now,
        status: "ACTIVE",
      },
    });

    await tx.transferRequest.update({
      where: { id: transferId },
      data: {
        status: "RE_ALLOCATED",
        approvedById: user.id,
        approvedAt: now,
      },
    });
  });

  const notifications = [];

  if (transfer.toEmployeeId) {
    notifications.push({
      userId: transfer.toEmployeeId,
      type: "TRANSFER_APPROVED" as const,
      title: "Asset transfer approved",
      message: `${transfer.asset.name} (${formatAssetTag(transfer.asset.tagNumber)}) has been transferred to you.`,
      link: "/allocations",
    });
  }

  if (transfer.requestedById !== transfer.toEmployeeId) {
    notifications.push({
      userId: transfer.requestedById,
      type: "TRANSFER_APPROVED" as const,
      title: "Transfer completed",
      message: `${transfer.asset.name} (${formatAssetTag(transfer.asset.tagNumber)}) has been re-allocated successfully.`,
      link: `/allocations/transfers/${transferId}`,
    });
  }

  if (notifications.length > 0) {
    await createNotifications(notifications);
  }

  revalidatePath("/allocations");
  revalidatePath("/allocations/transfers");
  revalidatePath(`/allocations/transfers/${transferId}`);
  revalidatePath("/");
  revalidatePath("/notifications");

  return {
    ...OK,
    message: "Transfer approved. New allocation created.",
    redirectTo: "/allocations/transfers",
  };
}

export async function rejectTransfer(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "ASSET_MANAGER"].includes(user.role)) {
    return FAIL("You do not have permission to reject transfers.");
  }

  const transferId = str(formData, "transferId");
  const reason = str(formData, "reason");

  if (!reason) return FAIL("Rejection reason is required.", { reason: ["Required"] });

  const transfer = await prisma.transferRequest.findUnique({
    where: { id: transferId },
    select: { id: true, status: true },
  });

  if (!transfer) return FAIL("Transfer request not found.");
  if (transfer.status !== "REQUESTED") return FAIL("Transfer is not in a pending state.");

  await prisma.transferRequest.update({
    where: { id: transferId },
    data: {
      status: "REJECTED",
      approvedById: user.id,
      approvedAt: new Date(),
      reason,
    },
  });

  revalidatePath("/allocations/transfers");
  revalidatePath(`/allocations/transfers/${transferId}`);

  return { ...OK, message: "Transfer rejected.", redirectTo: "/allocations/transfers" };
}
