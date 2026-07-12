import { PrismaClient } from "../generated/prisma/client";
import { Role, UserStatus, AuditCycleStatus, AuditVerificationStatus, AuditDiscrepancyStatus, AssetStatus, AssetCondition } from "../generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

// Setup connection adapter; ensure DATABASE_URL is not undefined under strict type checks
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Audit module scenario data...");

  // 1. Ensure an Admin user exists to close/resolve things
  let adminUser = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: "System Admin",
        email: "admin@assetflow.com",
        passwordHash: "$2b$10$EpI5sK.y5L6N7h8sM5h.K.6B4jF8c8d8e8f8g8h8i8j8k8l8m8n8o", // 'password'
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
  }

  // 2. Ensure "Engineering" department exists
  let engineeringDept = await prisma.department.findUnique({
    where: { name: "Engineering" },
  });

  if (!engineeringDept) {
    engineeringDept = await prisma.department.create({
      data: {
        name: "Engineering",
        code: "ENG",
        description: "Core software engineering and development group",
        status: "ACTIVE",
      },
    });
  }

  // 3. Ensure Auditors "A. Rao" and "S. Iqbal" exist
  let auditor1 = await prisma.user.findUnique({ where: { email: "a.rao@assetflow.com" } });
  if (!auditor1) {
    auditor1 = await prisma.user.create({
      data: {
        name: "A. Rao",
        email: "a.rao@assetflow.com",
        passwordHash: "$2b$10$EpI5sK.y5L6N7h8sM5h.K.6B4jF8c8d8e8f8g8h8i8j8k8l8m8n8o",
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        departmentId: engineeringDept.id,
      },
    });
  }

  let auditor2 = await prisma.user.findUnique({ where: { email: "s.iqbal@assetflow.com" } });
  if (!auditor2) {
    auditor2 = await prisma.user.create({
      data: {
        name: "S. Iqbal",
        email: "s.iqbal@assetflow.com",
        passwordHash: "$2b$10$EpI5sK.y5L6N7h8sM5h.K.6B4jF8c8d8e8f8g8h8i8j8k8l8m8n8o",
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        departmentId: engineeringDept.id,
      },
    });
  }

  // 4. Ensure Assets: AF-0003, AF-0021, AF-4938 exist
  // We need to fetch/create an AssetCategory first
  let laptopCategory = await prisma.assetCategory.findFirst({ where: { name: "Laptops" } });
  if (!laptopCategory) {
    laptopCategory = await prisma.assetCategory.create({
      data: {
        name: "Laptops",
        description: "Office workstations and laptops",
      },
    });
  }

  let furnitureCategory = await prisma.assetCategory.findFirst({ where: { name: "Office Furniture" } });
  if (!furnitureCategory) {
    furnitureCategory = await prisma.assetCategory.create({
      data: {
        name: "Office Furniture",
        description: "Desks, chairs, and cabinets",
      },
    });
  }

  let monitorCategory = await prisma.assetCategory.findFirst({ where: { name: "Monitors" } });
  if (!monitorCategory) {
    monitorCategory = await prisma.assetCategory.create({
      data: {
        name: "Monitors",
        description: "External display screens",
      },
    });
  }

  // Helper to find or create asset
  const getAsset = async (tagNumber: number, name: string, categoryId: string, location: string) => {
    let asset = await prisma.asset.findUnique({ where: { tagNumber } });
    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          tagNumber,
          name,
          categoryId,
          location,
          status: AssetStatus.ALLOCATED,
          condition: AssetCondition.GOOD,
          acquisitionCost: 1200.0,
          acquisitionDate: new Date(),
          departmentId: engineeringDept.id,
          registeredById: adminUser.id,
        },
      });
    }
    return asset;
  };

  const asset1 = await getAsset(3, "Dell Latitude Workstation Laptop", laptopCategory.id, "Desk E12");
  const asset2 = await getAsset(21, "Ergonomic Office Swivel Chair", furnitureCategory.id, "Desk E14");
  const asset3 = await getAsset(4938, "UltraSharp 27-inch 4K Monitor", monitorCategory.id, "Desk E15");

  // 5. Create or re-create the Q3 Engineering Audit Cycle in IN_PROGRESS state
  const auditName = "Q3 Engineering Audit";
  let audit = await prisma.auditCycle.findFirst({
    where: { name: auditName },
  });

  if (audit) {
    // Delete existing items to re-seed cleanly
    await prisma.activityLog.deleteMany({ where: { entityId: audit.id, entityType: "AuditCycle" } });
    await prisma.auditItem.deleteMany({ where: { auditCycleId: audit.id } });
    await prisma.auditAssignment.deleteMany({ where: { auditCycleId: audit.id } });
    await prisma.auditCycle.delete({ where: { id: audit.id } });
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const endDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);  // 5 days from now

  audit = await prisma.auditCycle.create({
    data: {
      name: auditName,
      status: AuditCycleStatus.IN_PROGRESS,
      departmentId: engineeringDept.id,
      location: "Ahmedabad Office",
      startDate,
      endDate,
      createdById: adminUser.id,
      startedById: adminUser.id,
      startedAt: startDate,
      auditors: {
        create: [
          { auditorId: auditor1.id },
          { auditorId: auditor2.id },
        ],
      },
    },
  });

  console.log(`Created audit cycle: ${audit.name}`);

  // 6. Create Audit Items with states:
  // AF-0003: VERIFIED
  // AF-0021: MISSING, discrepancy OPEN
  // AF-4938: DAMAGED, discrepancy CONFIRMED
  await prisma.auditItem.create({
    data: {
      auditCycleId: audit.id,
      assetId: asset1.id,
      verification: AuditVerificationStatus.VERIFIED,
      expectedLocation: asset1.location,
      observedLocation: asset1.location,
      verifiedById: auditor1.id,
      verifiedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  });

  await prisma.auditItem.create({
    data: {
      auditCycleId: audit.id,
      assetId: asset2.id,
      verification: AuditVerificationStatus.MISSING,
      expectedLocation: asset2.location,
      observedLocation: null,
      discrepancyStatus: AuditDiscrepancyStatus.OPEN,
      notes: "Asset Swivel Chair was not present at Desk E14 expected station.",
      verifiedById: auditor1.id,
      verifiedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12h ago
    },
  });

  await prisma.auditItem.create({
    data: {
      auditCycleId: audit.id,
      assetId: asset3.id,
      verification: AuditVerificationStatus.DAMAGED,
      expectedLocation: asset3.location,
      observedLocation: asset3.location,
      discrepancyStatus: AuditDiscrepancyStatus.CONFIRMED,
      notes: "Monitor display panel has a horizontal crack and does not power on.",
      verifiedById: auditor2.id,
      verifiedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6h ago
      resolutionNotes: "Confirmed crack with department head. Monitor will need replacement and disposal.",
      resolvedById: adminUser.id,
      resolvedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4h ago
    },
  });

  // 7. Write Activity Logs
  const writeLog = async (action: string, actorId: string, metadata: any, offsetMins: number) => {
    await prisma.activityLog.create({
      data: {
        actorId,
        action,
        entityType: "AuditCycle",
        entityId: audit!.id,
        metadata,
        createdAt: new Date(now.getTime() - offsetMins * 60 * 1000),
      },
    });
  };

  await writeLog("AUDIT_CREATED", adminUser.id, { assetCount: 3, auditorIds: [auditor1.id, auditor2.id] }, 48 * 60);
  await writeLog("AUDIT_STARTED", adminUser.id, {}, 47 * 60);
  await writeLog("AUDIT_ITEM_VERIFIED", auditor1.id, { assetId: asset1.id, tag: "AF-0003" }, 24 * 60);
  await writeLog("AUDIT_ITEM_MARKED_MISSING", auditor1.id, { assetId: asset2.id, tag: "AF-0021", notes: "Swivel chair not present." }, 12 * 60);
  await writeLog("AUDIT_ITEM_MARKED_DAMAGED", auditor2.id, { assetId: asset3.id, tag: "AF-4938", notes: "Monitor display screen cracked." }, 6 * 60);
  await writeLog("AUDIT_DISCREPANCY_CONFIRMED", adminUser.id, { assetId: asset3.id, tag: "AF-4938" }, 4 * 60);

  console.log("Seeding Audit module scenario completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during Audit seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
