"use client";

import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CreateMenu } from "@/components/app-shell/create-menu";
import { GlobalSearchBar } from "@/components/app-shell/global-search-bar";
import { UserMenu } from "@/components/app-shell/user-menu";
import { APP_NAME } from "@/lib/constants";

export function TopNav() {
  const { data: session } = useSession();
  const { workspaceSlug, projectKey } = useParams<{ workspaceSlug?: string; projectKey?: string }>();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(session?.user?.avatarUrl ?? null);

  useEffect(() => {
    let canceled = false;

    async function loadNotifications() {
      const response = await fetch("/api/users/me/notifications");
      if (!response.ok || canceled) {
        return;
      }

      const payload = (await response.json()) as {
        data: Array<{ isRead: boolean }>;
      };

      if (!canceled) {
        setUnreadCount(payload.data.filter((notification) => !notification.isRead).length);
      }
    }

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30_000);
    return () => {
      canceled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setAvatarUrl(session?.user?.avatarUrl ?? null);
  }, [session?.user?.avatarUrl]);

  useEffect(() => {
    let canceled = false;

    async function loadAvatar() {
      const response = await fetch("/api/users/me");
      if (!response.ok || canceled) {
        return;
      }

      const payload = (await response.json()) as { data?: { avatarUrl?: string | null } };
      if (!canceled) {
        setAvatarUrl(payload.data?.avatarUrl ?? null);
      }
    }

    function handleAvatarUpdated(event: Event) {
      const customEvent = event as CustomEvent<{ avatarUrl?: string | null }>;
      if (customEvent.detail?.avatarUrl !== undefined) {
        setAvatarUrl(customEvent.detail.avatarUrl ?? null);
      }
    }

    loadAvatar();
    window.addEventListener("kanban:avatar-updated", handleAvatarUpdated);
    return () => {
      canceled = true;
      window.removeEventListener("kanban:avatar-updated", handleAvatarUpdated);
    };
  }, []);

  const unreadLabel = useMemo(() => (unreadCount > 99 ? "99+" : String(unreadCount)), [unreadCount]);
  const sectionLabel = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last || last === projectKey || last === workspaceSlug) {
      return "Overview";
    }
    if (last === "board") {
      return "Board";
    }
    if (last === "backlog") {
      return "Backlog";
    }
    if (last === "issues") {
      return "Issues";
    }
    if (last === "sprints") {
      return "Sprints";
    }
    if (last === "settings") {
      return "Settings";
    }
    if (last === "members") {
      return "Members";
    }
    if (last === "projects") {
      return "Projects";
    }
    if (last === "create" && parts.includes("projects")) {
      return "Create Project";
    }
    if (parts.includes("issues") && projectKey) {
      return "Issue Detail";
    }
    if (parts.includes("sprints") && projectKey) {
      return "Sprint Detail";
    }
    return "Overview";
  }, [pathname, projectKey, workspaceSlug]);

  return (
    <header className="flex h-14 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4">
      <div className="flex items-center gap-3 border-r border-[var(--color-border)] pr-4">
        <div className="h-6 w-6 border border-[var(--color-border)] bg-[var(--color-accent-primary)]" />
        <span className="text-sm font-bold uppercase tracking-wide text-[var(--color-text-primary)]">{APP_NAME}</span>
      </div>

      <div className="ml-4 hidden items-center gap-2 text-xs text-[var(--color-text-secondary)] lg:flex">
        {workspaceSlug ? (
          <>
            <Link href={`/w/${workspaceSlug}`} className="hover:text-[var(--color-text-primary)]">
              {workspaceSlug}
            </Link>
            {projectKey ? (
              <>
                <span className="text-[var(--color-text-tertiary)]">/</span>
                <Link href={`/w/${workspaceSlug}/p/${projectKey}`} className="hover:text-[var(--color-text-primary)]">
                  {projectKey}
                </Link>
              </>
            ) : null}
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <span className="text-[var(--color-text-primary)]">{sectionLabel}</span>
          </>
        ) : null}
      </div>

      <div className="mx-4 hidden flex-1 items-center md:flex">
        <GlobalSearchBar />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <CreateMenu />
        <Link href="/notifications" className="relative inline-flex size-9 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]">
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center bg-[var(--color-accent-primary)] px-1 text-[10px] font-semibold text-white">
              {unreadLabel}
            </span>
          ) : null}
        </Link>
        <UserMenu name={session?.user?.name} email={session?.user?.email} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}


