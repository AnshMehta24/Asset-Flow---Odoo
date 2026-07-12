import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Boxes, ClipboardList } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/user";
import prisma from "@/lib/prisma";

function getNotificationLabel(type: string) {
  switch (type) {
    case "ASSET_ASSIGNED":
      return "Assignment";
    case "TRANSFER_APPROVED":
      return "Transfer";
    case "MAINTENANCE_APPROVED":
      return "Maintenance";
    default:
      return "Alert";
  }
}

export default async function Home() {
  const user = await requireCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [assetCount, activeAllocationCount, unreadCount, notifications] =
    await Promise.all([
      prisma.asset.count(),
      prisma.allocation.count({ where: { status: "ACTIVE" } }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-primary">AssetFlow</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Welcome back, {user.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Review current inventory activity and the latest notifications from one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/assets" className={buttonVariants({ size: "lg" })}>
              Open Assets
            </Link>
            <Link
              href="/allocations"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Open Allocations
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Assets</p>
            <Boxes className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-foreground">{assetCount}</p>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Active Allocations</p>
            <ClipboardList className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-foreground">
            {activeAllocationCount}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Unread Notifications</p>
            <Bell className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-foreground">{unreadCount}</p>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Latest Notifications</h2>
            <p className="text-sm text-muted-foreground">Stored directly from workflow events.</p>
          </div>
          <Link
            href="/notifications"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            View all
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {getNotificationLabel(notification.type)}
                  </span>
                  {!notification.isRead && (
                    <span className="size-2 rounded-full bg-primary" />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {notification.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {notification.message}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
