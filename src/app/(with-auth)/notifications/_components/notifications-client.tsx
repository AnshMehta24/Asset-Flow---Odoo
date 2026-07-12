"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  Inbox,
  Info,
  Loader2,
  TriangleAlert,
  UserPlus,
} from "lucide-react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date | string;
};

type Filter = "all" | "alerts" | "approvals" | "assignments";

function getRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getNotificationStyle(type: string) {
  switch (type) {
    case "ASSET_ASSIGNED":
      return {
        icon: UserPlus,
        tone: "text-blue-600 bg-blue-500/10 border-blue-500/20",
        category: "assignments" as const,
      };
    case "TRANSFER_APPROVED":
      return {
        icon: ArrowLeftRight,
        tone: "text-cyan-600 bg-cyan-500/10 border-cyan-500/20",
        category: "approvals" as const,
      };
    case "MAINTENANCE_APPROVED":
      return {
        icon: CheckCircle,
        tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
        category: "approvals" as const,
      };
    case "BOOKING_CONFIRMED":
      return {
        icon: Calendar,
        tone: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
        category: "approvals" as const,
      };
    default:
      return {
        icon: TriangleAlert,
        tone: "text-amber-600 bg-amber-500/10 border-amber-500/20",
        category: "alerts" as const,
      };
  }
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialNotifications.map((item) => ({
      ...item,
      createdAt:
        typeof item.createdAt === "string"
          ? item.createdAt
          : item.createdAt.toISOString(),
    }))
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchNotifications() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications?limit=100", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications.");
      }

      const data = (await response.json()) as Array<
        Omit<NotificationItem, "createdAt"> & { createdAt: string }
      >;
      setNotifications(data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to fetch notifications."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function markAsRead(notificationId: string) {
    const previous = notifications;
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item
      )
    );

    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });

    if (!response.ok) {
      setNotifications(previous);
    }
  }

  async function markAllAsRead() {
    const previous = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));

    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });

    if (!response.ok) {
      setNotifications(previous);
    }
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === "all") return true;
      return getNotificationStyle(item.type).category === filter;
    });
  }, [filter, notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="rounded-[1.5rem] border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Bell className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
              <p className="text-sm text-muted-foreground">Recent asset events for your account.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void fetchNotifications()}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Check className="size-4" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-6 py-4">
          {(["all", "assignments", "approvals", "alerts"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                filter === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {item === "all"
                ? "All"
                : item === "assignments"
                  ? "Assignments"
                  : item === "approvals"
                    ? "Approvals"
                    : "Alerts"}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <div className="mx-6 mb-4 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            <Info className="size-4 text-primary" />
            <span>
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}.
            </span>
          </div>
        )}

        {error && (
          <div className="mx-6 mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="border-t border-border">
          {filteredNotifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
              <Inbox className="size-6" />
              <p className="text-sm">No notifications found for this filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => {
                const style = getNotificationStyle(notification.type);
                const Icon = style.icon;

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 px-6 py-4 transition-colors hover:bg-accent/40 ${
                      notification.isRead ? "" : "bg-primary/5"
                    }`}
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-2xl border ${style.tone}`}
                    >
                      <Icon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="size-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {getRelativeTime(String(notification.createdAt))}
                      </p>
                    </div>

                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => void markAsRead(notification.id)}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
