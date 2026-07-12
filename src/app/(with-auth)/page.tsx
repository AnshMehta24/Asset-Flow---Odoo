import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FolderKanban,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Prisma } from "../../../generated/prisma/client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/user";
import prisma from "@/lib/prisma";
import { cn, formatAssetTag } from "@/lib/utils";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function endOfToday(dayStart: Date) {
  return new Date(dayStart.getTime() + DAY_IN_MS);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function timeWindowLabel(start: Date, end: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(start)
    .concat(" - ")
    .concat(
      new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      }).format(end),
    );
}

function formatRoleLabel(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getNotificationLabel(type: string) {
  switch (type) {
    case "ASSET_ASSIGNED":
      return "Assignment";
    case "TRANSFER_APPROVED":
      return "Transfer";
    case "MAINTENANCE_APPROVED":
      return "Maintenance";
    case "BOOKING_CONFIRMED":
      return "Booking";
    case "OVERDUE_RETURN":
      return "Overdue";
    case "AUDIT_DISCREPANCY":
      return "Audit";
    default:
      return "Alert";
  }
}

function getActivityLabel(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getMaintenanceTone(status: string): "default" | "secondary" | "destructive" {
  if (status === "PENDING" || status === "IN_PROGRESS") return "default";
  if (status === "REJECTED") return "destructive";
  return "secondary";
}

function getAuditTone(verification: string): "secondary" | "destructive" {
  if (verification === "MISSING" || verification === "DAMAGED") return "destructive";
  return "secondary";
}

function getScopedAssetWhere(
  userId: string,
  role: string,
  departmentId: string | null,
): Prisma.AssetWhereInput {
  if (role === "ADMIN" || role === "ASSET_MANAGER") {
    return {};
  }

  if (role === "DEPARTMENT_HEAD") {
    if (!departmentId) {
      return { id: "__none__" };
    }

    return {
      OR: [
        { departmentId },
        {
          allocations: {
            some: {
              status: "ACTIVE",
              employee: { departmentId },
            },
          },
        },
      ],
    };
  }

  return {
    allocations: {
      some: {
        status: "ACTIVE",
        employeeId: userId,
      },
    },
  };
}

function getScopedAllocationWhere(
  userId: string,
  role: string,
  departmentId: string | null,
): Prisma.AllocationWhereInput {
  if (role === "ADMIN" || role === "ASSET_MANAGER") {
    return {};
  }

  if (role === "DEPARTMENT_HEAD") {
    if (!departmentId) {
      return { id: "__none__" };
    }

    return {
      OR: [
        { departmentId },
        { employee: { departmentId } },
        { asset: { departmentId } },
      ],
    };
  }

  return { employeeId: userId };
}

function getScopedBookingWhere(
  userId: string,
  role: string,
  departmentId: string | null,
): Prisma.BookingWhereInput {
  if (role === "ADMIN" || role === "ASSET_MANAGER") {
    return {};
  }

  if (role === "DEPARTMENT_HEAD") {
    if (!departmentId) {
      return { id: "__none__" };
    }

    return {
      OR: [
        { departmentId },
        { bookedBy: { departmentId } },
        { asset: { departmentId } },
      ],
    };
  }

  return { bookedById: userId };
}

function getScopedTransferWhere(
  userId: string,
  role: string,
  departmentId: string | null,
): Prisma.TransferRequestWhereInput {
  if (role === "ADMIN" || role === "ASSET_MANAGER") {
    return {};
  }

  if (role === "DEPARTMENT_HEAD") {
    if (!departmentId) {
      return { id: "__none__" };
    }

    return {
      OR: [
        { toDepartmentId: departmentId },
        { fromEmployee: { departmentId } },
        { toEmployee: { departmentId } },
        { requestedBy: { departmentId } },
      ],
    };
  }

  return {
    OR: [{ requestedById: userId }, { fromEmployeeId: userId }, { toEmployeeId: userId }],
  };
}

function getScopedMaintenanceWhere(
  userId: string,
  role: string,
  departmentId: string | null,
): Prisma.MaintenanceRequestWhereInput {
  if (role === "ADMIN" || role === "ASSET_MANAGER") {
    return {};
  }

  if (role === "DEPARTMENT_HEAD") {
    if (!departmentId) {
      return { id: "__none__" };
    }

    return {
      OR: [
        { raisedBy: { departmentId } },
        { asset: { departmentId } },
      ],
    };
  }

  return {
    OR: [
      { raisedById: userId },
      {
        asset: {
          allocations: {
            some: {
              status: "ACTIVE",
              employeeId: userId,
            },
          },
        },
      },
    ],
  };
}

function getScopedAuditWhere(
  userId: string,
  role: string,
  departmentId: string | null,
): Prisma.AuditCycleWhereInput {
  if (role === "ADMIN" || role === "ASSET_MANAGER") {
    return {};
  }

  if (role === "DEPARTMENT_HEAD") {
    if (!departmentId) {
      return { id: "__none__" };
    }

    return { OR: [{ departmentId }, { items: { some: { asset: { departmentId } } } }] };
  }

  return { auditors: { some: { auditorId: userId } } };
}

function getScopedAuditItemWhere(
  userId: string,
  role: string,
  departmentId: string | null,
): Prisma.AuditItemWhereInput {
  if (role === "ADMIN" || role === "ASSET_MANAGER") {
    return {};
  }

  if (role === "DEPARTMENT_HEAD") {
    if (!departmentId) {
      return { id: "__none__" };
    }

    return {
      OR: [
        { auditCycle: { departmentId } },
        { asset: { departmentId } },
      ],
    };
  }

  return { auditCycle: { auditors: { some: { auditorId: userId } } } };
}

function getScopedActivityWhere(
  userId: string,
  role: string,
): Prisma.ActivityLogWhereInput {
  if (role === "ADMIN" || role === "ASSET_MANAGER") {
    return {};
  }

  return { actorId: userId };
}

function getQuickActions(role: string) {
  const actions = [];

  if (role === "ADMIN" || role === "ASSET_MANAGER") {
    actions.push({ label: "Register Asset", href: "/assets/create", variant: "default" as const });
  }

  if (role !== "EMPLOYEE") {
    actions.push({ label: "Allocate Asset", href: "/allocations/new", variant: "outline" as const });
  }

  actions.push({ label: "Book Resource", href: "/resource-booking", variant: "outline" as const });

  if (role === "ADMIN" || role === "ASSET_MANAGER" || role === "DEPARTMENT_HEAD") {
    actions.push({ label: "Open Reports", href: "/reports", variant: "outline" as const });
  }

  actions.push({ label: "View Notifications", href: "/notifications", variant: "ghost" as const });

  return actions;
}

type DashboardCard = {
  label: string;
  value: number;
  tone?: "default" | "secondary" | "destructive";
  icon: LucideIcon;
};

export default async function Home() {
  const user = await requireCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const today = startOfToday();
  const tomorrow = endOfToday(today);
  const upcomingCutoff = new Date(today.getTime() + DAY_IN_MS * 7);

  const assetWhere = getScopedAssetWhere(user.id, user.role, user.departmentId);
  const allocationWhere = getScopedAllocationWhere(user.id, user.role, user.departmentId);
  const bookingWhere = getScopedBookingWhere(user.id, user.role, user.departmentId);
  const transferWhere = getScopedTransferWhere(user.id, user.role, user.departmentId);
  const maintenanceWhere = getScopedMaintenanceWhere(user.id, user.role, user.departmentId);
  const auditWhere = getScopedAuditWhere(user.id, user.role, user.departmentId);
  const auditItemWhere = getScopedAuditItemWhere(user.id, user.role, user.departmentId);
  const [
    totalAssets,
    availableAssets,
    allocatedAssets,
    reservedAssets,
    assetsUnderMaintenance,
    activeBookings,
    todaysBookingsCount,
    pendingTransfers,
    upcomingReturnsCount,
    overdueReturnsCount,
    openMaintenanceCount,
    activeAuditCycles,
    unreadNotifications,
    overdueReturns,
    todaysBookings,
    notifications,
  ] = await Promise.all([
    prisma.asset.count({ where: assetWhere }),
    prisma.asset.count({ where: { ...assetWhere, status: "AVAILABLE" } }),
    prisma.asset.count({ where: { ...assetWhere, status: "ALLOCATED" } }),
    prisma.asset.count({ where: { ...assetWhere, status: "RESERVED" } }),
    prisma.asset.count({ where: { ...assetWhere, status: "UNDER_MAINTENANCE" } }),
    prisma.booking.count({
      where: {
        ...bookingWhere,
        status: { in: ["UPCOMING", "ONGOING"] },
      },
    }),
    prisma.booking.count({
      where: {
        ...bookingWhere,
        status: { in: ["UPCOMING", "ONGOING"] },
        startTime: { gte: today, lt: tomorrow },
      },
    }),
    prisma.transferRequest.count({
      where: {
        ...transferWhere,
        status: "REQUESTED",
      },
    }),
    prisma.allocation.count({
      where: {
        ...allocationWhere,
        status: "ACTIVE",
        expectedReturnDate: { gte: today, lt: upcomingCutoff },
      },
    }),
    prisma.allocation.count({
      where: {
        ...allocationWhere,
        status: "ACTIVE",
        expectedReturnDate: { lt: today },
      },
    }),
    prisma.maintenanceRequest.count({
      where: {
        ...maintenanceWhere,
        status: { in: ["PENDING", "APPROVED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS"] },
      },
    }),
    prisma.auditCycle.count({
      where: {
        ...auditWhere,
        status: "IN_PROGRESS",
      },
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
    prisma.allocation.findMany({
      where: {
        ...allocationWhere,
        status: "ACTIVE",
        expectedReturnDate: { lt: today },
      },
      include: {
        asset: { select: { id: true, name: true, tagNumber: true } },
        employee: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { expectedReturnDate: "asc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: {
        ...bookingWhere,
        status: { in: ["UPCOMING", "ONGOING"] },
        startTime: { gte: today, lt: tomorrow },
      },
      include: {
        asset: { select: { name: true, tagNumber: true } },
        bookedBy: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const cards: DashboardCard[] =
    user.role === "EMPLOYEE"
      ? [
          { label: "My Assets", value: allocatedAssets, icon: Boxes },
          { label: "Bookings Today", value: todaysBookingsCount, icon: CalendarClock },
          { label: "Upcoming Returns", value: upcomingReturnsCount, icon: Clock3 },
          { label: "Open Requests", value: openMaintenanceCount + pendingTransfers, icon: FolderKanban },
          { label: "Unread Notifications", value: unreadNotifications, icon: Bell },
        ]
      : [
          { label: "Total Assets", value: totalAssets, icon: Boxes },
          { label: "Available Assets", value: availableAssets, icon: ClipboardCheck },
          { label: "Allocated Assets", value: allocatedAssets, icon: ClipboardList },
          { label: "Reserved Assets", value: reservedAssets, icon: CalendarClock },
          { label: "Under Maintenance", value: assetsUnderMaintenance, icon: Wrench },
          {
            label: "Overdue Returns",
            value: overdueReturnsCount,
            tone: overdueReturnsCount > 0 ? "destructive" : "secondary",
            icon: Clock3,
          },
          { label: "Active Bookings", value: activeBookings, icon: Activity },
          { label: "Pending Transfers", value: pendingTransfers, icon: FolderKanban },
          { label: "Active Audit Cycles", value: activeAuditCycles, icon: ClipboardCheck },
        ];

  const actionItems = getQuickActions(user.role);
  const highlightAlert =
    overdueReturnsCount > 0
      ? `${overdueReturnsCount} overdue return${overdueReturnsCount === 1 ? "" : "s"} need follow-up`
      : upcomingReturnsCount > 0
        ? `${upcomingReturnsCount} return${upcomingReturnsCount === 1 ? "" : "s"} due in the next 7 days`
        : `${todaysBookingsCount} booking${todaysBookingsCount === 1 ? "" : "s"} scheduled for today`;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full uppercase">
              {formatRoleLabel(user.role)}
            </span>
            {user.departmentId && (
              <span className="text-[10px] font-bold tracking-wider bg-muted text-muted-foreground px-2.5 py-1 rounded-full uppercase">
                Department Scoped
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here is the status of your assets, bookings, and workflow queue.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {actionItems.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={buttonVariants({ variant: action.variant, size: "sm" })}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Inline alert banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3 text-sm text-foreground">
        <div className="rounded-lg bg-primary/10 p-1.5 text-primary shrink-0">
          <Bell className="size-4" />
        </div>
        <p className="font-semibold text-xs leading-none">{highlightAlert}</p>
      </div>

      {/* Metric Tiles */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[1.5rem] border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-3 text-2xl font-bold text-foreground leading-none">{card.value}</p>
              </div>
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl border",
                  card.tone === "destructive"
                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                <card.icon className="size-4" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Main Content Blocks */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Main Column */}
        <div className="space-y-6">
          {/* Overdue Returns */}
          {overdueReturnsCount > 0 && (
            <div className="rounded-[1.5rem] border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Overdue Returns</h2>
                  <p className="text-xs text-muted-foreground">Past expected return date</p>
                </div>
                <Badge variant="destructive">{overdueReturnsCount}</Badge>
              </div>
              <div className="divide-y divide-border">
                {overdueReturns.map((allocation) => (
                  <div key={allocation.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{formatAssetTag(allocation.asset.tagNumber)}</Badge>
                        <p className="text-sm font-semibold text-foreground leading-none">
                          {allocation.asset.name}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Holder: {allocation.employee?.name ?? allocation.department?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-red-500 font-semibold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        Due {allocation.expectedReturnDate ? formatDate(allocation.expectedReturnDate) : "Not set"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Bookings */}
          <div className="rounded-[1.5rem] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Today&apos;s Bookings</h2>
                <p className="text-xs text-muted-foreground">Scheduled resource usage</p>
              </div>
              <Link
                href="/resource-booking"
                className="inline-flex items-center gap-2 text-xs font-semibold text-foreground transition-colors hover:text-primary"
              >
                Open calendar
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {todaysBookings.length === 0 ? (
                <div className="px-6 py-10 text-xs text-muted-foreground text-center">
                  No bookings scheduled for today.
                </div>
              ) : (
                todaysBookings.map((booking) => (
                  <div key={booking.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{formatAssetTag(booking.asset.tagNumber)}</Badge>
                        <p className="text-sm font-semibold text-foreground leading-none">{booking.asset.name}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Booked by {booking.bookedBy.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-foreground bg-muted px-2.5 py-1 rounded-xl">
                        {timeWindowLabel(booking.startTime, booking.endTime)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          <div className="rounded-[1.5rem] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Pending Approvals</h2>
                <p className="text-xs text-muted-foreground">Open workflow queues</p>
              </div>
            </div>
            <div className="grid gap-3 px-6 py-5">
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Pending Transfers</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Asset reassignment requests</p>
                </div>
                <Badge variant={pendingTransfers > 0 ? "default" : "secondary"} className="text-xs py-0.5 px-2">
                  {pendingTransfers}
                </Badge>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Open Maintenance Requests</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Reported asset defects</p>
                </div>
                <Badge variant={openMaintenanceCount > 0 ? "default" : "secondary"} className="text-xs py-0.5 px-2">
                  {openMaintenanceCount}
                </Badge>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Unread Notifications</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Unread alerts for your account</p>
                </div>
                <Badge variant={unreadNotifications > 0 ? "default" : "secondary"} className="text-xs py-0.5 px-2">
                  {unreadNotifications}
                </Badge>
              </div>
            </div>
          </div>

          {/* Latest Notifications */}
          <div className="rounded-[1.5rem] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Latest Notifications</h2>
                <p className="text-xs text-muted-foreground">Workflow updates for your account</p>
              </div>
              <Link
                href="/notifications"
                className="inline-flex items-center gap-2 text-xs font-semibold text-foreground transition-colors hover:text-primary"
              >
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="px-6 py-10 text-xs text-muted-foreground text-center">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="px-6 py-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] py-0 px-2 font-semibold">
                        {getNotificationLabel(notification.type)}
                      </Badge>
                      {!notification.isRead && (
                        <span className="size-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground leading-snug">
                      {notification.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      {notification.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
