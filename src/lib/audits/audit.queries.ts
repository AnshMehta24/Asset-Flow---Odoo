import prisma from "@/lib/prisma";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { AuditScopeInput } from "./audit.types";
import { canViewAudit } from "./audit.permissions";
import type { Prisma } from "@/../generated/prisma/client";

// Build where clause for assets falling in the scope of the audit
export function buildAuditAssetWhere(scope: AuditScopeInput): Prisma.AssetWhereInput {
  const conditions: Prisma.AssetWhereInput = {
    status: {
      in: ["AVAILABLE", "ALLOCATED", "RESERVED", "UNDER_MAINTENANCE"],
    },
  };

  if (scope.departmentId) {
    conditions.departmentId = scope.departmentId;
  }

  if (scope.location) {
    conditions.location = {
      equals: scope.location,
      mode: "insensitive",
    };
  }

  return conditions;
}

// Preview matching assets count
export async function previewAuditAssetCount(scope: AuditScopeInput) {
  const where = buildAuditAssetWhere(scope);
  return await prisma.asset.count({ where });
}

// Get all audit cycles visible to the user
export async function getAuditCyclesForUser(
  filters: {
    search?: string;
    status?: string;
    departmentId?: string;
    assignedToMe?: boolean;
  },
  currentUser: AuthenticatedUser
) {
  const roleVisibility: Prisma.AuditCycleWhereInput = {};

  // Visibility logic: normal employees can only see audits they are assigned to
  if (currentUser.role !== "ADMIN" && currentUser.role !== "ASSET_MANAGER") {
    roleVisibility.auditors = {
      some: {
        auditorId: currentUser.id,
      },
    };
  } else if (filters.assignedToMe) {
    roleVisibility.auditors = {
      some: {
        auditorId: currentUser.id,
      },
    };
  }

  const where: Prisma.AuditCycleWhereInput = {
    AND: [
      roleVisibility,
      filters.status ? { status: filters.status as any } : {},
      filters.departmentId ? { departmentId: filters.departmentId } : {},
      filters.search
        ? {
            name: {
              contains: filters.search,
              mode: "insensitive",
            },
          }
        : {},
    ],
  };

  return await prisma.auditCycle.findMany({
    where,
    include: {
      department: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      auditors: {
        include: {
          auditor: { select: { id: true, name: true, email: true } },
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get details and metrics summary for a specific audit cycle
export async function getAuditCycleSummary(auditId: string, currentUser: AuthenticatedUser) {
  const audit = await prisma.auditCycle.findUnique({
    where: { id: auditId },
    include: {
      department: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      startedBy: { select: { id: true, name: true, email: true } },
      closedBy: { select: { id: true, name: true, email: true } },
      auditors: {
        include: {
          auditor: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!audit) return null;

  // Perform a permission check
  const mappedAuditors = audit.auditors.map((a) => ({ auditorId: a.auditorId }));
  if (!canViewAudit(currentUser, { ...audit, auditors: mappedAuditors })) {
    throw new Error("AUDIT_FORBIDDEN");
  }

  // Count items grouped by verification status
  const verificationCounts = await prisma.auditItem.groupBy({
    by: ["verification"],
    where: { auditCycleId: auditId },
    _count: { _all: true },
  });

  // Count open discrepancies
  const openDiscrepancies = await prisma.auditItem.count({
    where: {
      auditCycleId: auditId,
      discrepancyStatus: "OPEN",
    },
  });

  const summary = {
    PENDING: 0,
    VERIFIED: 0,
    MISSING: 0,
    DAMAGED: 0,
  };

  verificationCounts.forEach((c) => {
    summary[c.verification as keyof typeof summary] = c._count._all;
  });

  const total = await prisma.auditItem.count({ where: { auditCycleId: auditId } });
  const completed = summary.VERIFIED + summary.MISSING + summary.DAMAGED;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    audit,
    metrics: {
      total,
      pending: summary.PENDING,
      verified: summary.VERIFIED,
      missing: summary.MISSING,
      damaged: summary.DAMAGED,
      completed,
      percentage,
      openDiscrepancies,
    },
  };
}

// Get paginated checklist items
export async function getAuditChecklist(
  auditId: string,
  filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    verification?: string;
    category?: string;
    location?: string;
    checkedByMe?: boolean;
  },
  currentUser: AuthenticatedUser
) {
  const audit = await prisma.auditCycle.findUnique({
    where: { id: auditId },
    select: { id: true, status: true, auditors: { select: { auditorId: true } } },
  });

  if (!audit) throw new Error("AUDIT_NOT_FOUND");
  if (!canViewAudit(currentUser, audit)) throw new Error("AUDIT_FORBIDDEN");

  const page = Math.max(filters.page || 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize || 25, 1), 100);
  const skip = (page - 1) * pageSize;

  // Search filter matching asset tag, name, or serial number
  let assetSearchFilter: Prisma.AssetWhereInput = {};
  if (filters.search) {
    const numericSearch = parseInt(filters.search.replace(/^\D+/g, ""), 10);
    assetSearchFilter = {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { serialNumber: { contains: filters.search, mode: "insensitive" } },
        !isNaN(numericSearch) ? { tagNumber: numericSearch } : {},
      ],
    };
  }

  const where: Prisma.AuditItemWhereInput = {
    auditCycleId: auditId,
    AND: [
      filters.verification ? { verification: filters.verification as any } : {},
      filters.checkedByMe ? { verifiedById: currentUser.id } : {},
      filters.category ? { asset: { categoryId: filters.category } } : {},
      filters.location
        ? {
            OR: [
              { expectedLocation: { equals: filters.location, mode: "insensitive" } },
              { observedLocation: { equals: filters.location, mode: "insensitive" } },
            ],
          }
        : {},
      filters.search ? { asset: assetSearchFilter } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.auditItem.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        verifiedBy: { select: { id: true, name: true, email: true } },
        asset: {
          select: {
            id: true,
            tagNumber: true,
            name: true,
            serialNumber: true,
            location: true,
            status: true,
            condition: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { asset: { tagNumber: "asc" } },
    }),
    prisma.auditItem.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// Get all discrepancy audit items
export async function getAuditDiscrepancies(
  auditId: string,
  filters: {
    resolutionStatus?: string;
  },
  currentUser: AuthenticatedUser
) {
  const audit = await prisma.auditCycle.findUnique({
    where: { id: auditId },
    select: { id: true, status: true, auditors: { select: { auditorId: true } } },
  });

  if (!audit) throw new Error("AUDIT_NOT_FOUND");
  if (!canViewAudit(currentUser, audit)) throw new Error("AUDIT_FORBIDDEN");

  const where: Prisma.AuditItemWhereInput = {
    auditCycleId: auditId,
    verification: { in: ["MISSING", "DAMAGED"] },
    AND: [
      filters.resolutionStatus ? { discrepancyStatus: filters.resolutionStatus as any } : {},
    ],
  };

  return await prisma.auditItem.findMany({
    where,
    include: {
      verifiedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
      asset: {
        select: {
          id: true,
          tagNumber: true,
          name: true,
          serialNumber: true,
          location: true,
          status: true,
          condition: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { asset: { tagNumber: "asc" } },
  });
}

// Get activity logs associated with this audit cycle
export async function getAuditActivity(auditId: string, currentUser: AuthenticatedUser) {
  const audit = await prisma.auditCycle.findUnique({
    where: { id: auditId },
    select: { id: true, status: true, auditors: { select: { auditorId: true } } },
  });

  if (!audit) throw new Error("AUDIT_NOT_FOUND");
  if (!canViewAudit(currentUser, audit)) throw new Error("AUDIT_FORBIDDEN");

  return await prisma.activityLog.findMany({
    where: {
      entityType: "AuditCycle",
      entityId: auditId,
    },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
