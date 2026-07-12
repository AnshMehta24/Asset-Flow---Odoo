"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/user";
import {
  raiseRequestSchema,
  rejectRequestSchema,
  assignTechnicianSchema,
  resolveRequestSchema,
} from "./_lib/maintenance-schema";

const PATH = "/maintenance";

function isApprover(role: string | undefined) {
  return role === "ASSET_MANAGER" || role === "ADMIN";
}

export async function raiseMaintenanceRequest(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const parsed = raiseRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const { assetId, issueDescription, priority, photoUrl } = parsed.data;
  const isFleetWide = user.role === "ADMIN" || user.role === "ASSET_MANAGER";

  if (!isFleetWide) {
    const holds = await prisma.allocation.findFirst({
      where: {
        assetId,
        status: "ACTIVE",
        OR: [
          { employeeId: user.id },
          ...(user.departmentId ? [{ departmentId: user.departmentId }] : []),
        ],
      },
      select: { id: true },
    });
    if (!holds) return;
  }

  await prisma.maintenanceRequest.create({
    data: {
      assetId,
      raisedById: user.id,
      issueDescription,
      priority,
      photoUrl,
    },
  });

  revalidatePath(PATH);
}

export async function approveMaintenanceRequest(requestId: string) {
  const user = await getCurrentUser();
  if (!user || !isApprover(user.role)) return;

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId, status: "PENDING" },
    select: { assetId: true },
  });
  if (!request) return;

  await prisma.$transaction([
    prisma.maintenanceRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: "APPROVED", approvedById: user.id },
    }),
    prisma.asset.update({
      where: { id: request.assetId },
      data: { status: "UNDER_MAINTENANCE" },
    }),
  ]);

  revalidatePath(PATH);
}

export async function rejectMaintenanceRequest(
  requestId: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user || !isApprover(user.role)) return;

  const parsed = rejectRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await prisma.maintenanceRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: {
      status: "REJECTED",
      approvedById: user.id,
      rejectionReason: parsed.data.rejectionReason,
    },
  });

  revalidatePath(PATH);
}

export async function assignTechnician(requestId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !isApprover(user.role)) return;

  const parsed = assignTechnicianSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await prisma.maintenanceRequest.updateMany({
    where: { id: requestId, status: "APPROVED" },
    data: {
      status: "TECHNICIAN_ASSIGNED",
      technicianName: parsed.data.technicianName,
      scheduledDate: parsed.data.scheduledDate
        ? new Date(parsed.data.scheduledDate)
        : null,
    },
  });

  revalidatePath(PATH);
}

export async function startProgress(requestId: string) {
  const user = await getCurrentUser();
  if (!user || !isApprover(user.role)) return;

  await prisma.maintenanceRequest.updateMany({
    where: { id: requestId, status: "TECHNICIAN_ASSIGNED" },
    data: { status: "IN_PROGRESS" },
  });

  revalidatePath(PATH);
}

export async function resolveMaintenanceRequest(
  requestId: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user || !isApprover(user.role)) return;

  const parsed = resolveRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId, status: "IN_PROGRESS" },
    select: { assetId: true },
  });
  if (!request) return;

  await prisma.$transaction([
    prisma.maintenanceRequest.updateMany({
      where: { id: requestId, status: "IN_PROGRESS" },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionNotes: parsed.data.resolutionNotes,
      },
    }),
    prisma.asset.update({
      where: { id: request.assetId },
      data: { status: "AVAILABLE" },
    }),
  ]);

  revalidatePath(PATH);
}
