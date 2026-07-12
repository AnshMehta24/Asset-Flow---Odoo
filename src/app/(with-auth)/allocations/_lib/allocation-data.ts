import prisma from "@/lib/prisma";
import { formatAssetTag } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Filters / types
// ─────────────────────────────────────────────────────────────

export type AllocationListFilters = {
  search?: string;
  status?: string; // "ACTIVE" | "RETURNED" | "RETURN_PENDING" | "ALL"
  departmentId?: string;
  employeeId?: string;
  page?: number;
};

export type TransferListFilters = {
  status?: string; // TransferStatus or "ALL"
  page?: number;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function serializeAllocation<T extends { allocatedAt: Date; expectedReturnDate: Date | null; returnedAt: Date | null; returnRequestedAt: Date | null; createdAt: Date; updatedAt: Date }>(a: T) {
  const {
    allocatedAt,
    expectedReturnDate,
    returnedAt,
    returnRequestedAt,
    createdAt,
    updatedAt,
    ...rest
  } = a;
  return {
    ...rest,
    allocatedAt: allocatedAt.toISOString(),
    expectedReturnDate: expectedReturnDate?.toISOString() ?? null,
    returnedAt: returnedAt?.toISOString() ?? null,
    returnRequestedAt: returnRequestedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function serializeTransfer<T extends { createdAt: Date; updatedAt: Date; approvedAt: Date | null }>(t: T) {
  const { createdAt, updatedAt, approvedAt, ...rest } = t;
  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    approvedAt: approvedAt?.toISOString() ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// Allocations — list
// ─────────────────────────────────────────────────────────────

export async function getAllocationList(filters: AllocationListFilters = {}) {
  const search = filters.search?.trim();
  const statusFilter =
    filters.status && filters.status !== "ALL" && filters.status !== "RETURN_PENDING"
      ? (filters.status as "ACTIVE" | "RETURNED")
      : undefined;
  const departmentFilter = filters.departmentId || undefined;

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.employeeId ? 100 : 10;

  const whereClause = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(filters.status === "RETURN_PENDING"
      ? {
          status: "ACTIVE",
          returnRequestedAt: { not: null },
          returnedAt: null,
        }
      : {}),
    ...(departmentFilter ? { departmentId: departmentFilter } : {}),
    ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(search
      ? {
          OR: [
            { asset: { name: { contains: search, mode: "insensitive" } } },
            { employee: { name: { contains: search, mode: "insensitive" } } },
            { department: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.allocation.findMany({
      where: whereClause as any,
      orderBy: [{ status: "asc" }, { allocatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        allocatedAt: true,
        expectedReturnDate: true,
        returnedAt: true,
        returnRequestedAt: true,
        createdAt: true,
        updatedAt: true,
        asset: {
          select: {
            id: true,
            tagNumber: true,
            name: true,
            status: true,
            condition: true,
            location: true,
            category: { select: { id: true, name: true } },
          },
        },
        employee: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
        allocatedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.allocation.count({
      where: whereClause as any,
    }),
  ]);

  const items = rows.map((a) => ({
    ...serializeAllocation(a),
    asset: {
      ...a.asset,
      tag: formatAssetTag(a.asset.tagNumber),
    },
  }));

  return {
    allocations: items,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export type AllocationListItem = Awaited<ReturnType<typeof getAllocationList>>["allocations"][number];

// ─────────────────────────────────────────────────────────────
// Allocations — stats
// ─────────────────────────────────────────────────────────────

export async function getAllocationStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [active, returned, pendingReturn, pendingTransfer, overdue] =
    await Promise.all([
      prisma.allocation.count({ where: { status: "ACTIVE" } }),
      prisma.allocation.count({ where: { status: "RETURNED" } }),
      prisma.allocation.count({
        where: { status: "ACTIVE", returnRequestedAt: { not: null }, returnedAt: null },
      }),
      prisma.transferRequest.count({ where: { status: "REQUESTED" } }),
      prisma.allocation.count({
        where: {
          status: "ACTIVE",
          expectedReturnDate: { lt: today },
          returnedAt: null,
        },
      }),
    ]);

  return { active, returned, pendingReturn, pendingTransfer, overdue };
}

// ─────────────────────────────────────────────────────────────
// Allocations — detail
// ─────────────────────────────────────────────────────────────

export async function getAllocationById(id: string) {
  const a = await prisma.allocation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      allocatedAt: true,
      expectedReturnDate: true,
      returnedAt: true,
      returnRequestedAt: true,
      returnConditionNotes: true,
      createdAt: true,
      updatedAt: true,
      asset: {
        select: {
          id: true,
          tagNumber: true,
          name: true,
          status: true,
          condition: true,
          location: true,
          manufacturer: true,
          model: true,
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          allocations: {
            orderBy: { allocatedAt: "desc" },
            select: {
              id: true,
              status: true,
              allocatedAt: true,
              returnedAt: true,
              employee: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
            },
          },
        },
      },
      employee: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } },
      allocatedBy: { select: { id: true, name: true } },
      returnRequestedBy: { select: { id: true, name: true } },
      returnApprovedBy: { select: { id: true, name: true } },
      transferRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          reason: true,
          createdAt: true,
          updatedAt: true,
          approvedAt: true,
          requestedBy: { select: { id: true, name: true } },
          fromEmployee: { select: { id: true, name: true } },
          toEmployee: { select: { id: true, name: true } },
          toDepartment: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!a) return null;

  return {
    ...serializeAllocation(a),
    asset: {
      ...a.asset,
      tag: formatAssetTag(a.asset.tagNumber),
      allocations: a.asset.allocations.map((al) => ({
        ...al,
        allocatedAt: al.allocatedAt.toISOString(),
        returnedAt: al.returnedAt?.toISOString() ?? null,
      })),
    },
    transferRequests: a.transferRequests.map(serializeTransfer),
  };
}

export type AllocationDetail = NonNullable<Awaited<ReturnType<typeof getAllocationById>>>;

// ─────────────────────────────────────────────────────────────
// Transfer requests — list
// ─────────────────────────────────────────────────────────────

export async function getTransferList(filters: TransferListFilters = {}) {
  const statusFilter =
    filters.status && filters.status !== "ALL"
      ? (filters.status as "REQUESTED" | "APPROVED" | "REJECTED" | "RE_ALLOCATED")
      : undefined;

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = 10;

  const whereClause = {
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.transferRequest.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        asset: {
          select: {
            id: true,
            tagNumber: true,
            name: true,
            status: true,
            category: { select: { name: true } },
          },
        },
        requestedBy: { select: { id: true, name: true } },
        fromEmployee: { select: { id: true, name: true } },
        toEmployee: { select: { id: true, name: true } },
        toDepartment: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.transferRequest.count({
      where: whereClause,
    }),
  ]);

  const items = rows.map((t) => ({
    ...serializeTransfer(t),
    asset: { ...t.asset, tag: formatAssetTag(t.asset.tagNumber) },
  }));

  return {
    transfers: items,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export type TransferListItem = Awaited<ReturnType<typeof getTransferList>>["transfers"][number];

// ─────────────────────────────────────────────────────────────
// Transfer — detail
// ─────────────────────────────────────────────────────────────

export async function getTransferById(id: string) {
  const t = await prisma.transferRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
      updatedAt: true,
      approvedAt: true,
      asset: {
        select: {
          id: true,
          tagNumber: true,
          name: true,
          status: true,
          condition: true,
          location: true,
          category: { select: { name: true } },
          allocations: {
            where: { status: "ACTIVE" },
            take: 1,
            select: {
              id: true,
              allocatedAt: true,
              employee: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
            },
          },
        },
      },
      allocation: {
        select: {
          id: true,
          status: true,
          allocatedAt: true,
          employee: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      },
      requestedBy: { select: { id: true, name: true } },
      fromEmployee: { select: { id: true, name: true } },
      toEmployee: { select: { id: true, name: true } },
      toDepartment: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  if (!t) return null;

  return {
    ...serializeTransfer(t),
    asset: {
      ...t.asset,
      tag: formatAssetTag(t.asset.tagNumber),
      allocations: t.asset.allocations.map((al) => ({
        ...al,
        allocatedAt: al.allocatedAt.toISOString(),
      })),
    },
    allocation: t.allocation
      ? { ...t.allocation, allocatedAt: t.allocation.allocatedAt.toISOString() }
      : null,
  };
}

export type TransferDetail = NonNullable<Awaited<ReturnType<typeof getTransferById>>>;

// ─────────────────────────────────────────────────────────────
// Form options
// ─────────────────────────────────────────────────────────────

export async function getAvailableAssetsForAllocation() {
  const assets = await prisma.asset.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { tagNumber: "asc" },
    select: {
      id: true,
      tagNumber: true,
      name: true,
      location: true,
      condition: true,
      category: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
  return assets.map((a) => ({ ...a, tag: formatAssetTag(a.tagNumber) }));
}

export async function getActiveEmployees() {
  return prisma.user.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, department: { select: { name: true } } },
  });
}

export async function getActiveDepartments() {
  return prisma.department.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}
