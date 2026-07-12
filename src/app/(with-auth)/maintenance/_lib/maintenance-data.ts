import prisma from "@/lib/prisma";
import { formatAssetTag } from "@/lib/utils";
import type { AuthenticatedUser } from "@/lib/auth/types";

export const BOARD_COLUMNS = [
  "PENDING",
  "APPROVED",
  "TECHNICIAN_ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
] as const;

export type MaintenanceColumnStatus = (typeof BOARD_COLUMNS)[number];

export type MaintenanceCardData = {
  id: string;
  assetTag: string;
  assetName: string;
  issueDescription: string;
  priority: string;
  technicianName: string | null;
  scheduledDate: string | null;
  resolvedAt: string | null;
  raisedByName: string;
  createdAt: string;
};

export type MaintenanceBoard = Record<MaintenanceColumnStatus, MaintenanceCardData[]>;

function toCardData(r: {
  id: string;
  issueDescription: string;
  priority: string;
  technicianName: string | null;
  scheduledDate: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  asset: { tagNumber: number; name: string };
  raisedBy: { name: string };
}): MaintenanceCardData {
  return {
    id: r.id,
    assetTag: formatAssetTag(r.asset.tagNumber),
    assetName: r.asset.name,
    issueDescription: r.issueDescription,
    priority: r.priority,
    technicianName: r.technicianName,
    scheduledDate: r.scheduledDate?.toISOString() ?? null,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    raisedByName: r.raisedBy.name,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Board data for the 5 active columns; REJECTED requests are excluded (surfaced via a separate filter). */
export async function getMaintenanceBoard(): Promise<MaintenanceBoard> {
  const requests = await prisma.maintenanceRequest.findMany({
    where: { status: { in: BOARD_COLUMNS as unknown as never[] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      issueDescription: true,
      priority: true,
      technicianName: true,
      scheduledDate: true,
      resolvedAt: true,
      createdAt: true,
      asset: { select: { tagNumber: true, name: true } },
      raisedBy: { select: { name: true } },
    },
  });

  const board = Object.fromEntries(
    BOARD_COLUMNS.map((status) => [status, []])
  ) as unknown as MaintenanceBoard;

  for (const r of requests) {
    board[r.status as (typeof BOARD_COLUMNS)[number]].push(toCardData(r));
  }

  return board;
}

export async function getRejectedRequests(): Promise<
  (MaintenanceCardData & { rejectionReason: string | null })[]
> {
  const requests = await prisma.maintenanceRequest.findMany({
    where: { status: "REJECTED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      issueDescription: true,
      priority: true,
      technicianName: true,
      scheduledDate: true,
      resolvedAt: true,
      createdAt: true,
      rejectionReason: true,
      asset: { select: { tagNumber: true, name: true } },
      raisedBy: { select: { name: true } },
    },
  });

  return requests.map((r) => ({
    ...toCardData(r),
    rejectionReason: r.rejectionReason,
  }));
}

export type EligibleAsset = { id: string; tag: string; name: string };

/**
 * Assets a user is allowed to raise a maintenance request against.
 * Asset Manager/Admin administer the whole registry; everyone else can only
 * raise against assets currently allocated to them (or their department).
 */
export async function getEligibleAssetsForRaise(
  user: AuthenticatedUser
): Promise<EligibleAsset[]> {
  const isFleetWide = user.role === "ADMIN" || user.role === "ASSET_MANAGER";

  const assets = await prisma.asset.findMany({
    where: isFleetWide
      ? { status: { notIn: ["RETIRED", "DISPOSED", "UNDER_MAINTENANCE"] } }
      : {
          status: { notIn: ["RETIRED", "DISPOSED", "UNDER_MAINTENANCE"] },
          allocations: {
            some: {
              status: "ACTIVE",
              OR: [
                { employeeId: user.id },
                ...(user.departmentId
                  ? [{ departmentId: user.departmentId }]
                  : []),
              ],
            },
          },
        },
    orderBy: { tagNumber: "asc" },
    select: { id: true, tagNumber: true, name: true },
  });

  return assets.map((a) => ({
    id: a.id,
    tag: formatAssetTag(a.tagNumber),
    name: a.name,
  }));
}
