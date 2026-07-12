import prisma from "@/lib/prisma";
import { formatAssetTag } from "@/lib/format";

export interface DepartmentUtilization {
  departmentId: string;
  departmentName: string;
  totalAssets: number;
  allocatedAssets: number;
  utilizationRate: number;
}

export interface MonthlyMaintenanceCount {
  month: string;
  count: number;
}

export interface MostUsedAssetSummary {
  assetId: string;
  assetName: string;
  tagNumberFormatted: string;
  bookingCount: number;
  detail: string;
}

export interface IdleAssetSummary {
  assetId: string;
  assetName: string;
  tagNumberFormatted: string;
  daysIdle: number;
  detail: string;
}

export interface OperationalAlert {
  type: "MAINTENANCE" | "RETIREMENT";
  assetId: string;
  assetName: string;
  tagNumberFormatted: string;
  message: string;
  daysRemainingOrAge: number;
  priority: string;
}

export interface HeatmapCell {
  day: string;
  timeSlot: string;
  density: number;
}

export interface DepartmentAllocationSummary {
  departmentName: string;
  totalAssets: number;
  activeAllocations: number;
  totalCost: number;
  availabilityRate: number;
}

export interface ReportsData {
  totalAssets: number;
  activeAllocations: number;
  allocationRate: number;
  pendingMaintenance: number;
  totalValue: number;
  deptUtilization: DepartmentUtilization[];
  maintFrequency: MonthlyMaintenanceCount[];
  mostUsed: MostUsedAssetSummary[];
  idleAssets: IdleAssetSummary[];
  alerts: OperationalAlert[];
  heatmap: HeatmapCell[];
  deptSummary: DepartmentAllocationSummary[];
}

// Judgment calls — not from the doc, not discussed. Easy to retune.
const IDLE_THRESHOLD_DAYS = 30;
const NEARING_RETIREMENT_YEARS = 4;
const MAINTENANCE_DUE_SOON_DAYS = 7;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_SLOTS = [
  { label: "Morning (9-11 AM)", startHour: 9, endHour: 11 },
  { label: "Mid-day (11-1 PM)", startHour: 11, endHour: 13 },
  { label: "Afternoon (1-3 PM)", startHour: 13, endHour: 15 },
  { label: "Late Afternoon (3-5 PM)", startHour: 15, endHour: 17 },
  { label: "Evening (5-7 PM)", startHour: 17, endHour: 19 },
  { label: "Night (7-9 PM)", startHour: 19, endHour: 21 },
];

// Dept Head sees a dept-scoped view; Admin/Asset Manager see everything.
export interface ReportsScope {
  departmentId?: string;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

async function getDepartmentUtilization(scope: ReportsScope): Promise<DepartmentUtilization[]> {
  const departments = await prisma.department.findMany({
    where: {
      status: "ACTIVE",
      ...(scope.departmentId ? { id: scope.departmentId } : {}),
    },
    select: {
      id: true,
      name: true,
      assets: { select: { status: true } },
    },
    orderBy: { name: "asc" },
  });

  return departments.map((dept) => {
    const totalAssets = dept.assets.length;
    const allocatedAssets = dept.assets.filter((a) => a.status === "ALLOCATED").length;

    return {
      departmentId: dept.id,
      departmentName: dept.name.split(" ")[0],
      totalAssets,
      allocatedAssets,
      utilizationRate: totalAssets > 0 ? Math.round((allocatedAssets / totalAssets) * 100) : 0,
    };
  });
}

async function getMaintenanceFrequency(scope: ReportsScope): Promise<MonthlyMaintenanceCount[]> {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const counts: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    counts[months[d.getMonth()]] = 0;
  }

  const resolved = await prisma.maintenanceRequest.findMany({
    where: {
      resolvedAt: { gte: sixMonthsAgo },
      ...(scope.departmentId ? { asset: { departmentId: scope.departmentId } } : {}),
    },
    select: { resolvedAt: true },
  });

  resolved.forEach((req) => {
    if (!req.resolvedAt) return;
    const label = months[req.resolvedAt.getMonth()];
    if (counts[label] !== undefined) counts[label]++;
  });

  return Object.entries(counts).map(([month, count]) => ({ month, count }));
}

async function getMostUsedAssets(scope: ReportsScope, limit = 3): Promise<MostUsedAssetSummary[]> {
  const bookings = await prisma.booking.groupBy({
    by: ["assetId"],
    where: scope.departmentId ? { asset: { departmentId: scope.departmentId } } : undefined,
    _count: { assetId: true },
    orderBy: { _count: { assetId: "desc" } },
    take: limit,
  });

  if (bookings.length === 0) return [];

  const assets = await prisma.asset.findMany({
    where: { id: { in: bookings.map((b) => b.assetId) } },
    select: { id: true, name: true, tagNumber: true },
  });
  const assetById = new Map(assets.map((a) => [a.id, a]));

  return bookings.map((b) => {
    const asset = assetById.get(b.assetId);
    return {
      assetId: b.assetId,
      assetName: asset?.name ?? "Unknown Asset",
      tagNumberFormatted: asset ? formatAssetTag(asset.tagNumber) : "AF-0000",
      bookingCount: b._count.assetId,
      detail: `${b._count.assetId} bookings`,
    };
  });
}

async function getIdleAssets(scope: ReportsScope, limit = 5): Promise<IdleAssetSummary[]> {
  const now = new Date();
  const idleSince = new Date(now.getTime() - IDLE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  const assets = await prisma.asset.findMany({
    where: {
      status: "AVAILABLE",
      bookings: { none: { startTime: { gte: idleSince } } },
      allocations: { none: { allocatedAt: { gte: idleSince } } },
      ...(scope.departmentId ? { departmentId: scope.departmentId } : {}),
    },
    select: {
      id: true,
      name: true,
      tagNumber: true,
      bookings: { orderBy: { startTime: "desc" }, take: 1, select: { startTime: true } },
      allocations: { orderBy: { allocatedAt: "desc" }, take: 1, select: { allocatedAt: true } },
      createdAt: true,
    },
    take: limit,
  });

  return assets
    .map((asset) => {
      const lastActivity = [
        asset.bookings[0]?.startTime,
        asset.allocations[0]?.allocatedAt,
        asset.createdAt,
      ]
        .filter((d): d is Date => !!d)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const daysIdle = daysBetween(now, lastActivity);

      return {
        assetId: asset.id,
        assetName: asset.name,
        tagNumberFormatted: formatAssetTag(asset.tagNumber),
        daysIdle,
        detail: `unused ${daysIdle}${daysIdle >= IDLE_THRESHOLD_DAYS ? "+" : ""} days`,
      };
    })
    .sort((a, b) => b.daysIdle - a.daysIdle);
}

async function getOperationalAlerts(scope: ReportsScope): Promise<OperationalAlert[]> {
  const now = new Date();
  const alerts: OperationalAlert[] = [];

  const dueSoon = new Date(now.getTime() + MAINTENANCE_DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
  const pendingMaintenance = await prisma.maintenanceRequest.findMany({
    where: {
      status: "PENDING",
      scheduledDate: { gte: now, lte: dueSoon },
      ...(scope.departmentId ? { asset: { departmentId: scope.departmentId } } : {}),
    },
    select: {
      priority: true,
      scheduledDate: true,
      asset: { select: { id: true, name: true, tagNumber: true } },
    },
  });

  pendingMaintenance.forEach((req) => {
    if (!req.scheduledDate) return;
    const diffDays = Math.max(1, Math.ceil(daysBetween(req.scheduledDate, now)));
    alerts.push({
      type: "MAINTENANCE",
      assetId: req.asset.id,
      assetName: req.asset.name,
      tagNumberFormatted: formatAssetTag(req.asset.tagNumber),
      message: `service due in ${diffDays} days`,
      daysRemainingOrAge: diffDays,
      priority: req.priority,
    });
  });

  const retirementCutoff = new Date(now);
  retirementCutoff.setFullYear(retirementCutoff.getFullYear() - NEARING_RETIREMENT_YEARS);

  const agingAssets = await prisma.asset.findMany({
    where: {
      acquisitionDate: { lte: retirementCutoff },
      status: { notIn: ["RETIRED", "DISPOSED", "LOST"] },
      ...(scope.departmentId ? { departmentId: scope.departmentId } : {}),
    },
    select: { id: true, name: true, tagNumber: true, acquisitionDate: true },
    take: 10,
  });

  agingAssets.forEach((asset) => {
    if (!asset.acquisitionDate) return;
    const ageInYears = daysBetween(now, asset.acquisitionDate) / 365.25;
    alerts.push({
      type: "RETIREMENT",
      assetId: asset.id,
      assetName: asset.name,
      tagNumberFormatted: formatAssetTag(asset.tagNumber),
      message: `${Math.floor(ageInYears)} years old : nearing retirement`,
      daysRemainingOrAge: Math.round(ageInYears * 10) / 10,
      priority: "MEDIUM",
    });
  });

  return alerts;
}

async function getBookingHeatmap(scope: ReportsScope): Promise<HeatmapCell[]> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      startTime: { gte: ninetyDaysAgo },
      ...(scope.departmentId ? { asset: { departmentId: scope.departmentId } } : {}),
    },
    select: { startTime: true },
  });

  // grid[dayIndex][slotIndex] = raw booking count
  const grid: number[][] = DAY_LABELS.map(() => TIME_SLOTS.map(() => 0));

  bookings.forEach((booking) => {
    const dayIndex = booking.startTime.getDay();
    const hour = booking.startTime.getHours();
    const slotIndex = TIME_SLOTS.findIndex((slot) => hour >= slot.startHour && hour < slot.endHour);
    if (slotIndex !== -1) grid[dayIndex][slotIndex]++;
  });

  const max = Math.max(1, ...grid.flat());

  const cells: HeatmapCell[] = [];
  DAY_LABELS.forEach((day, dayIndex) => {
    TIME_SLOTS.forEach((slot, slotIndex) => {
      cells.push({
        day,
        timeSlot: slot.label,
        density: Math.round((grid[dayIndex][slotIndex] / max) * 100),
      });
    });
  });

  return cells;
}

async function getDepartmentAllocationSummary(scope: ReportsScope): Promise<DepartmentAllocationSummary[]> {
  const departments = await prisma.department.findMany({
    where: {
      status: "ACTIVE",
      ...(scope.departmentId ? { id: scope.departmentId } : {}),
    },
    select: {
      name: true,
      assets: { select: { status: true, acquisitionCost: true } },
    },
    orderBy: { name: "asc" },
  });

  return departments.map((dept) => {
    const allocated = dept.assets.filter((a) => a.status === "ALLOCATED").length;
    const available = dept.assets.filter((a) => a.status === "AVAILABLE").length;
    const totalCost = dept.assets.reduce((sum, a) => sum + Number(a.acquisitionCost ?? 0), 0);

    return {
      departmentName: dept.name,
      totalAssets: dept.assets.length,
      activeAllocations: allocated,
      totalCost,
      availabilityRate: dept.assets.length > 0 ? Math.round((available / dept.assets.length) * 100) : 100,
    };
  });
}

export async function getReportsData(scope: ReportsScope = {}): Promise<ReportsData> {
  const assetWhere = scope.departmentId ? { departmentId: scope.departmentId } : {};

  const [
    totalAssets,
    activeAllocations,
    pendingMaintenance,
    totalValueResult,
    deptUtilization,
    maintFrequency,
    mostUsed,
    idleAssets,
    alerts,
    heatmap,
    deptSummary,
  ] = await Promise.all([
    prisma.asset.count({ where: assetWhere }),
    prisma.allocation.count({
      where: {
        status: "ACTIVE",
        ...(scope.departmentId ? { asset: { departmentId: scope.departmentId } } : {}),
      },
    }),
    prisma.asset.count({ where: { ...assetWhere, status: "UNDER_MAINTENANCE" } }),
    prisma.asset.aggregate({ where: assetWhere, _sum: { acquisitionCost: true } }),
    getDepartmentUtilization(scope),
    getMaintenanceFrequency(scope),
    getMostUsedAssets(scope),
    getIdleAssets(scope),
    getOperationalAlerts(scope),
    getBookingHeatmap(scope),
    getDepartmentAllocationSummary(scope),
  ]);

  return {
    totalAssets,
    activeAllocations,
    allocationRate: totalAssets > 0 ? Math.round((activeAllocations / totalAssets) * 100) : 0,
    pendingMaintenance,
    totalValue: Number(totalValueResult._sum.acquisitionCost ?? 0),
    deptUtilization,
    maintFrequency,
    mostUsed,
    idleAssets,
    alerts,
    heatmap,
    deptSummary,
  };
}
