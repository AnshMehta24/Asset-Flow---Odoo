"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Calendar,
  ArrowLeftRight,
  UserPlus,
  AlertOctagon,
  Inbox,
  Check,
  RotateCw,
  Eye,
  Info
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "alerts" | "approvals" | "bookings">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();

    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case "ASSET_ASSIGNED":
        return {
          icon: UserPlus,
          colorClass: "text-blue-500 bg-blue-500/10 border-blue-500/20",
          category: "assignment"
        };
      case "MAINTENANCE_APPROVED":
        return {
          icon: CheckCircle,
          colorClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
          category: "approvals"
        };
      case "BOOKING_CONFIRMED":
        return {
          icon: Calendar,
          colorClass: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
          category: "bookings"
        };
      case "TRANSFER_APPROVED":
        return {
          icon: ArrowLeftRight,
          colorClass: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
          category: "approvals"
        };
      case "OVERDUE_RETURN":
        return {
          icon: AlertTriangle,
          colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
          category: "alerts"
        };
      case "AUDIT_DISCREPANCY":
        return {
          icon: AlertOctagon,
          colorClass: "text-rose-500 bg-rose-500/10 border-rose-500/20",
          category: "alerts"
        };
      default:
        return {
          icon: Info,
          colorClass: "text-muted-foreground bg-muted border-border",
          category: "general"
        };
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    if (!response.ok) {
      // Revert on failure — the optimistic update didn't actually persist.
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    const response = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!response.ok) {
      setNotifications(previous);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const style = getNotificationStyle(n.type);
      if (filter === "all") return true;
      return style.category === filter;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/85 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Bell size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Stay updated with organizational activity logs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="p-2 bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RotateCw size={15} className={isLoading ? "animate-spin" : ""} />
          </button>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs font-semibold rounded-lg border border-border transition-all active:scale-[0.98] cursor-pointer"
            >
              <Check size={14} />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 p-6 space-y-6 max-w-4xl w-full mx-auto">

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              filter === "all"
                ? "bg-primary border-primary text-primary-foreground shadow"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/5"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("alerts")}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              filter === "alerts"
                ? "bg-destructive border-destructive text-destructive-foreground shadow"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/5"
            }`}
          >
            Alerts
          </button>
          <button
            onClick={() => setFilter("approvals")}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              filter === "approvals"
                ? "bg-primary border-primary text-primary-foreground shadow"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/5"
            }`}
          >
            Approvals
          </button>
          <button
            onClick={() => setFilter("bookings")}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              filter === "bookings"
                ? "bg-secondary border-border text-secondary-foreground shadow"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/5"
            }`}
          >
            Bookings
          </button>
        </div>

        {/* Info panel */}
        {unreadCount > 0 && (
          <div className="p-4 rounded-xl bg-accent/5 border border-border flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-primary" />
              <span>You have <strong className="text-foreground">{unreadCount}</strong> unread activity notifications.</span>
            </div>
          </div>
        )}

        {/* Notifications List Container */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <RotateCw size={24} className="animate-spin text-primary" />
              <p className="text-xs font-medium mt-3">Fetching activity logs...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-destructive p-6">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-85" />
              <h4 className="font-bold text-sm">Failed to connect to backend server</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {error}. Please check your database connection or try refreshing.
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground">
              <Inbox size={32} className="mx-auto mb-3 opacity-40 text-muted-foreground" />
              <h4 className="font-semibold text-sm">No notifications found</h4>
              <p className="text-xs text-muted-foreground/80 mt-0.5">There are no activities matching this filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredNotifications.map((notif: NotificationItem) => {
                const style = getNotificationStyle(notif.type);
                const Icon = style.icon;

                return (
                  <div
                    key={notif.id}
                    className={`p-4 flex gap-4 items-start transition-all hover:bg-accent/5 relative group ${
                      !notif.isRead ? "bg-accent/3" : ""
                    }`}
                  >
                    {/* Left Icon Panel */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${style.colorClass}`}>
                      <Icon size={18} />
                    </div>

                    {/* Middle Text Panel */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className={`text-sm mt-1 leading-relaxed ${
                        !notif.isRead ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}>
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground/80 font-medium block mt-2">
                        {getRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Right Mark-As-Read Action button (visible on hover) */}
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 bg-secondary hover:bg-primary hover:text-primary-foreground border border-border rounded-lg text-muted-foreground transition-all cursor-pointer scale-90 group-hover:scale-100 shadow-sm"
                        title="Mark as read"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
