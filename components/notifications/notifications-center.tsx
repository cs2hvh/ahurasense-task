"use client";

import { Bell, MessageSquare, UserCheck2, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type NotificationItem = {
  id: string;
  type: "assigned" | "mentioned" | "commented" | "status_changed" | "watching";
  message: string;
  isRead: boolean;
  issueId: string | null;
  createdAt: string;
};

interface NotificationsCenterProps {
  initialNotifications: NotificationItem[];
}

function notificationMeta(type: NotificationItem["type"]) {
  switch (type) {
    case "assigned":
      return {
        label: "Assigned",
        icon: UserCheck2,
        className: "text-[var(--color-info)]",
      };
    case "mentioned":
      return {
        label: "Mention",
        icon: Users,
        className: "text-[var(--color-warning)]",
      };
    case "commented":
      return {
        label: "Comment",
        icon: MessageSquare,
        className: "text-[var(--color-text-secondary)]",
      };
    case "status_changed":
      return {
        label: "Status",
        icon: Bell,
        className: "text-[var(--color-success)]",
      };
    case "watching":
      return {
        label: "Watching",
        icon: Bell,
        className: "text-[var(--color-text-secondary)]",
      };
  }
}

export function NotificationsCenter({ initialNotifications }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [pendingRead, setPendingRead] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    if (!showUnreadOnly) {
      return notifications;
    }

    return notifications.filter((notification) => !notification.isRead);
  }, [notifications, showUnreadOnly]);

  async function markRead(id: string) {
    const target = notifications.find((notification) => notification.id === id);
    if (!target || target.isRead) {
      return;
    }

    setPendingRead(id);
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to mark as read");
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                isRead: true,
              }
            : notification,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark as read");
    } finally {
      setPendingRead(null);
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) {
      return;
    }

    setBulkUpdating(true);
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to mark all as read");
      }

      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark all as read");
    } finally {
      setBulkUpdating(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-bg-secondary),var(--color-bg-tertiary))] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Notifications</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Track mentions, assignments, and issue updates from across your workspaces.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowUnreadOnly((value) => !value)}
            >
              {showUnreadOnly ? "Show All" : "Unread Only"}
            </Button>
            <Button type="button" size="sm" onClick={markAllRead} disabled={bulkUpdating || unreadCount === 0}>
              {bulkUpdating ? "Updating..." : "Mark All Read"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Total</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{notifications.length}</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Unread</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-accent-primary)]">{unreadCount}</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Read</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{notifications.length - unreadCount}</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Routing</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Open preferences for alert channels</p>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
            {showUnreadOnly ? "Unread Notifications" : "All Notifications"}
          </p>
          <Link href="/profile/notifications" className="text-xs text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
            Notification Preferences
          </Link>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {visibleNotifications.map((notification) => {
            const meta = notificationMeta(notification.type);
            const Icon = meta.icon;
            return (
              <button
                key={notification.id}
                onClick={() => void markRead(notification.id)}
                disabled={pendingRead === notification.id}
                className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-tertiary)] ${
                  notification.isRead ? "opacity-70" : "bg-[rgba(0,102,255,0.06)]"
                }`}
              >
                <div className={`mt-0.5 border border-[var(--color-border)] p-1 ${meta.className}`}>
                  <Icon className="size-3.5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
                      {meta.label}
                    </span>
                    {!notification.isRead ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent-primary)]">
                        Unread
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--color-text-primary)]">{notification.message}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                  {notification.issueId ? (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Issue Linked</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {!visibleNotifications.length ? (
        <Card className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
          {showUnreadOnly ? "No unread notifications." : "No notifications yet."}
        </Card>
      ) : null}
    </div>
  );
}
