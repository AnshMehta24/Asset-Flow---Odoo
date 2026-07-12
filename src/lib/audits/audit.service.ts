import prisma from "@/lib/prisma";
import type { AuthenticatedUser } from "@/lib/auth/types";
import {
  CreateAuditCycleInput,
  VerifyAuditItemInput,
  ResolveAuditDiscrepancyInput,
} from "./audit.types";
import {
  canCreateAudit,
  canEditAudit,
  canStartAudit,
  canVerifyAuditItem,
  canResolveDiscrepancy,
  canCloseAudit,
} from "./audit.permissions";
import {
  createAuditCycleSchema,
  verifyAuditItemSchema,
  resolveAuditDiscrepancySchema,
} from "./audit.validation";
import { buildAuditAssetWhere } from "./audit.queries";
import type { AuditCycleStatus, AuditDiscrepancyStatus, NotificationType } from "@/../generated/prisma/client";

// Business layer service handlers for Asset Audits
export class AuditService {
  
  // 1. Create a planned audit cycle
  static async createAuditCycle(input: CreateAuditCycleInput, currentUser: AuthenticatedUser) {
    if (!canCreateAudit(currentUser)) {
      throw new Error("AUDIT_FORBIDDEN");
    }

    const validated = createAuditCycleSchema.parse(input);

    // Validate department exists if provided
    if (validated.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: validated.departmentId } });
      if (!dept) throw new Error("INVALID_AUDIT_SCOPE");
    }

    // Validate auditors exist
    const auditorsCount = await prisma.user.count({
      where: {
        id: { in: validated.auditorIds },
        status: "ACTIVE",
      },
    });

    if (auditorsCount !== validated.auditorIds.length) {
      throw new Error("AUDIT_HAS_NO_AUDITORS");
    }

    // Deduplicate auditor IDs
    const auditorIds = Array.from(new Set(validated.auditorIds));

    // Fetch assets in scope
    const assets = await prisma.asset.findMany({
      where: buildAuditAssetWhere(validated),
      select: { id: true, location: true },
    });

    if (assets.length === 0) {
      throw new Error("AUDIT_HAS_NO_ASSETS");
    }

    return await prisma.$transaction(async (tx) => {
      // Create Audit Cycle
      const cycle = await tx.auditCycle.create({
        data: {
          name: validated.name,
          departmentId: validated.departmentId || null,
          location: validated.location || null,
          startDate: validated.startDate,
          endDate: validated.endDate,
          createdById: currentUser.id,
          auditors: {
            create: auditorIds.map((id) => ({ auditorId: id })),
          },
          items: {
            create: assets.map((asset) => ({
              assetId: asset.id,
              expectedLocation: asset.location || null,
            })),
          },
        },
      });

      // Send assignments notifications
      await tx.notification.createMany({
        data: auditorIds.map((auditorId) => ({
          type: "AUDIT_ASSIGNED" as NotificationType,
          title: "Audit Assignment",
          message: `You were assigned as an auditor to the cycle: ${validated.name}.`,
          link: `/audits/${cycle.id}`,
          userId: auditorId,
        })),
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          actorId: currentUser.id,
          action: "AUDIT_CREATED",
          entityType: "AuditCycle",
          entityId: cycle.id,
          metadata: {
            assetCount: assets.length,
            auditorIds,
            departmentId: validated.departmentId || null,
            location: validated.location || null,
          },
        },
      });

      return cycle;
    });
  }

  // 2. Update a planned audit cycle (regenerating scoping checklist snapshot)
  static async updateAuditCycle(
    auditId: string,
    input: CreateAuditCycleInput,
    currentUser: AuthenticatedUser
  ) {
    const cycle = await prisma.auditCycle.findUnique({
      where: { id: auditId },
      include: { auditors: true },
    });

    if (!cycle) throw new Error("AUDIT_NOT_FOUND");
    if (!canEditAudit(currentUser, cycle)) throw new Error("AUDIT_FORBIDDEN");

    const validated = createAuditCycleSchema.parse(input);

    if (validated.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: validated.departmentId } });
      if (!dept) throw new Error("INVALID_AUDIT_SCOPE");
    }

    const auditorsCount = await prisma.user.count({
      where: {
        id: { in: validated.auditorIds },
        status: "ACTIVE",
      },
    });

    if (auditorsCount !== validated.auditorIds.length) {
      throw new Error("AUDIT_HAS_NO_AUDITORS");
    }

    const auditorIds = Array.from(new Set(validated.auditorIds));

    const assets = await prisma.asset.findMany({
      where: buildAuditAssetWhere(validated),
      select: { id: true, location: true },
    });

    if (assets.length === 0) {
      throw new Error("AUDIT_HAS_NO_ASSETS");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Delete prior assignments
      await tx.auditAssignment.deleteMany({ where: { auditCycleId: auditId } });

      // 2. Delete prior items
      await tx.auditItem.deleteMany({ where: { auditCycleId: auditId } });

      // 3. Update main cycle
      const updatedCycle = await tx.auditCycle.update({
        where: { id: auditId },
        data: {
          name: validated.name,
          departmentId: validated.departmentId || null,
          location: validated.location || null,
          startDate: validated.startDate,
          endDate: validated.endDate,
          auditors: {
            create: auditorIds.map((id) => ({ auditorId: id })),
          },
          items: {
            create: assets.map((asset) => ({
              assetId: asset.id,
              expectedLocation: asset.location || null,
            })),
          },
        },
      });

      // Log update
      await tx.activityLog.create({
        data: {
          actorId: currentUser.id,
          action: "AUDIT_UPDATED",
          entityType: "AuditCycle",
          entityId: auditId,
          metadata: {
            assetCount: assets.length,
            auditorIds,
            departmentId: validated.departmentId || null,
            location: validated.location || null,
          },
        },
      });

      return updatedCycle;
    });
  }

  // 3. Start the audit cycle
  static async startAuditCycle(auditId: string, currentUser: AuthenticatedUser) {
    const cycle = await prisma.auditCycle.findUnique({
      where: { id: auditId },
      include: {
        auditors: true,
        _count: { select: { items: true } },
      },
    });

    if (!cycle) throw new Error("AUDIT_NOT_FOUND");
    if (!canStartAudit(currentUser, cycle)) throw new Error("AUDIT_FORBIDDEN");
    if (cycle.status !== "PLANNED") throw new Error("AUDIT_NOT_PLANNED");
    if (cycle.auditors.length === 0) throw new Error("AUDIT_HAS_NO_AUDITORS");
    if (cycle._count.items === 0) throw new Error("AUDIT_HAS_NO_ASSETS");

    return await prisma.$transaction(async (tx) => {
      const started = await tx.auditCycle.update({
        where: { id: auditId },
        data: {
          status: "IN_PROGRESS" as AuditCycleStatus,
          startedById: currentUser.id,
          startedAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: currentUser.id,
          action: "AUDIT_STARTED",
          entityType: "AuditCycle",
          entityId: auditId,
        },
      });

      return started;
    });
  }

  // 4. Verify checklist items (Auditor role)
  static async verifyAuditItem(
    auditId: string,
    itemId: string,
    input: VerifyAuditItemInput,
    currentUser: AuthenticatedUser
  ) {
    const cycle = await prisma.auditCycle.findUnique({
      where: { id: auditId },
      include: { auditors: true },
    });

    if (!cycle) throw new Error("AUDIT_NOT_FOUND");
    
    const mappedAuditors = cycle.auditors.map((a) => ({ auditorId: a.auditorId }));
    if (!canVerifyAuditItem(currentUser, { ...cycle, auditors: mappedAuditors })) {
      throw new Error("AUDIT_FORBIDDEN");
    }

    const item = await prisma.auditItem.findFirst({
      where: { id: itemId, auditCycleId: auditId },
      include: { asset: true },
    });

    if (!item) throw new Error("AUDIT_ITEM_NOT_FOUND");

    const validated = verifyAuditItemSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      // Determine discrepancy status updates
      let discrepancyStatus: AuditDiscrepancyStatus | null = null;
      if (["MISSING", "DAMAGED"].includes(validated.verification)) {
        discrepancyStatus = "OPEN";
      }

      // Update AuditItem record
      const updatedItem = await tx.auditItem.update({
        where: { id: itemId },
        data: {
          verification: validated.verification,
          discrepancyStatus,
          observedLocation: validated.observedLocation || null,
          notes: validated.notes || null,
          verifiedById: currentUser.id,
          verifiedAt: new Date(),
          // Clear resolution logs if changed back to VERIFIED
          ...(validated.verification === "VERIFIED"
            ? { resolvedById: null, resolvedAt: null, resolutionNotes: null }
            : {}),
        },
      });

      // Send discrepancy alert if flagged
      if (discrepancyStatus === "OPEN") {
        // Log alerts/discrepancies activity
        await tx.activityLog.create({
          data: {
            actorId: currentUser.id,
            action: validated.verification === "MISSING" ? "AUDIT_ITEM_MARKED_MISSING" : "AUDIT_ITEM_MARKED_DAMAGED",
            entityType: "AuditCycle",
            entityId: auditId,
            metadata: {
              itemId,
              assetId: item.assetId,
              tag: `AF-${String(item.asset.tagNumber).padStart(4, "0")}`,
              notes: validated.notes,
            },
          },
        });

        // Query active Administrators and Asset Managers
        const managers = await tx.user.findMany({
          where: {
            role: { in: ["ADMIN", "ASSET_MANAGER"] },
            status: "ACTIVE",
          },
          select: { id: true },
        });

        const assetTag = `AF-${String(item.asset.tagNumber).padStart(4, "0")}`;
        await tx.notification.createMany({
          data: managers.map((m) => ({
            type: "AUDIT_DISCREPANCY" as NotificationType,
            title: "Audit Discrepancy Flagged",
            message: `${assetTag} was marked ${validated.verification.toLowerCase()} in ${cycle.name}.`,
            link: `/audits/${auditId}?tab=discrepancies`,
            userId: m.id,
          })),
        });
      } else {
        // Log general verification activity
        await tx.activityLog.create({
          data: {
            actorId: currentUser.id,
            action: "AUDIT_ITEM_VERIFIED",
            entityType: "AuditCycle",
            entityId: auditId,
            metadata: {
              itemId,
              assetId: item.assetId,
              tag: `AF-${String(item.asset.tagNumber).padStart(4, "0")}`,
            },
          },
        });
      }

      return updatedItem;
    });
  }

  // 5. Resolve discrepancies (Asset Manager / Admin roles)
  static async resolveAuditDiscrepancy(
    auditId: string,
    itemId: string,
    input: ResolveAuditDiscrepancyInput,
    currentUser: AuthenticatedUser
  ) {
    if (!canResolveDiscrepancy(currentUser)) {
      throw new Error("AUDIT_FORBIDDEN");
    }

    const cycle = await prisma.auditCycle.findUnique({
      where: { id: auditId },
    });

    if (!cycle) throw new Error("AUDIT_NOT_FOUND");
    if (cycle.status !== "IN_PROGRESS") throw new Error("AUDIT_NOT_IN_PROGRESS");

    const item = await prisma.auditItem.findFirst({
      where: { id: itemId, auditCycleId: auditId },
      include: { asset: true },
    });

    if (!item) throw new Error("AUDIT_ITEM_NOT_FOUND");
    if (item.verification === "PENDING" || item.verification === "VERIFIED") {
      throw new Error("INVALID_DISCREPANCY_STATE");
    }

    const validated = resolveAuditDiscrepancySchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.auditItem.update({
        where: { id: itemId },
        data: {
          discrepancyStatus: validated.status,
          resolutionNotes: validated.resolutionNotes || null,
          resolvedById: currentUser.id,
          resolvedAt: new Date(),
        },
      });

      // Log Resolution
      let logAction = "AUDIT_DISCREPANCY_CONFIRMED";
      if (validated.status === "RESOLVED") logAction = "AUDIT_DISCREPANCY_RESOLVED";
      else if (validated.status === "DISMISSED") logAction = "AUDIT_DISCREPANCY_DISMISSED";

      await tx.activityLog.create({
        data: {
          actorId: currentUser.id,
          action: logAction,
          entityType: "AuditCycle",
          entityId: auditId,
          metadata: {
            itemId,
            assetId: item.assetId,
            tag: `AF-${String(item.asset.tagNumber).padStart(4, "0")}`,
            resolutionNotes: validated.resolutionNotes,
          },
        },
      });

      return updated;
    });
  }

  // 6. Close the audit cycle
  static async closeAuditCycle(auditId: string, currentUser: AuthenticatedUser) {
    const cycle = await prisma.auditCycle.findUnique({
      where: { id: auditId },
      include: { auditors: true },
    });

    if (!cycle) throw new Error("AUDIT_NOT_FOUND");
    if (!canCloseAudit(currentUser, cycle)) throw new Error("AUDIT_FORBIDDEN");
    if (cycle.status !== "IN_PROGRESS") throw new Error("AUDIT_NOT_IN_PROGRESS");

    // Count close blockers (pending checklist items or unresolved open discrepancies)
    const [pendingCount, openDiscrepancyCount] = await Promise.all([
      prisma.auditItem.count({
        where: {
          auditCycleId: auditId,
          verification: "PENDING",
        },
      }),
      prisma.auditItem.count({
        where: {
          auditCycleId: auditId,
          discrepancyStatus: "OPEN",
        },
      }),
    ]);

    if (pendingCount > 0) throw new Error("AUDIT_HAS_PENDING_ITEMS");
    if (openDiscrepancyCount > 0) throw new Error("AUDIT_HAS_OPEN_DISCREPANCIES");

    // Query confirmed missing and damaged items
    const confirmedItems = await prisma.auditItem.findMany({
      where: {
        auditCycleId: auditId,
        discrepancyStatus: "CONFIRMED",
        verification: { in: ["MISSING", "DAMAGED"] },
      },
      select: { assetId: true, verification: true },
    });

    const missingAssetIds = confirmedItems
      .filter((item) => item.verification === "MISSING")
      .map((item) => item.assetId);

    const damagedAssetIds = confirmedItems
      .filter((item) => item.verification === "DAMAGED")
      .map((item) => item.assetId);

    return await prisma.$transaction(async (tx) => {
      // Bulk update confirmed missing assets as LOST
      if (missingAssetIds.length > 0) {
        await tx.asset.updateMany({
          where: { id: { in: missingAssetIds } },
          data: { status: "LOST" },
        });

        // Write activity logs for each asset
        for (const assetId of missingAssetIds) {
          await tx.activityLog.create({
            data: {
              actorId: currentUser.id,
              action: "AUDIT_ASSET_MARKED_LOST",
              entityType: "AuditCycle",
              entityId: auditId,
              metadata: { assetId },
            },
          });
        }
      }

      // Bulk update confirmed damaged assets condition as DAMAGED
      if (damagedAssetIds.length > 0) {
        await tx.asset.updateMany({
          where: { id: { in: damagedAssetIds } },
          data: { condition: "DAMAGED" },
        });

        // Write activity logs for each asset
        for (const assetId of damagedAssetIds) {
          await tx.activityLog.create({
            data: {
              actorId: currentUser.id,
              action: "AUDIT_ASSET_MARKED_DAMAGED",
              entityType: "AuditCycle",
              entityId: auditId,
              metadata: { assetId },
            },
          });
        }
      }

      // Close the cycle
      const closed = await tx.auditCycle.update({
        where: { id: auditId },
        data: {
          status: "CLOSED",
          closedById: currentUser.id,
          closedAt: new Date(),
        },
      });

      // Write closure logs
      await tx.activityLog.create({
        data: {
          actorId: currentUser.id,
          action: "AUDIT_CLOSED",
          entityType: "AuditCycle",
          entityId: auditId,
          metadata: {
            missingAssetCount: missingAssetIds.length,
            damagedAssetCount: damagedAssetIds.length,
          },
        },
      });

      // Notify auditor team and creators
      const notifiedUsers = Array.from(
        new Set([...cycle.auditors.map((a) => a.auditorId), cycle.createdById])
      );

      await tx.notification.createMany({
        data: notifiedUsers.map((userId) => ({
          type: "AUDIT_CLOSED" as NotificationType,
          title: "Audit Cycle Closed",
          message: `The audit cycle "${cycle.name}" has been completed and closed.`,
          link: `/audits/${auditId}`,
          userId,
        })),
      });

      return {
        closed,
        missingUpdated: missingAssetIds.length,
        damagedUpdated: damagedAssetIds.length,
      };
    });
  }
}
