"use client";

import {
  Bell,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutGrid,
  ListTodo,
  Settings,
  Ticket,
  UserCircle2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

const projectLinks = [
  { label: "Overview", href: "", icon: LayoutGrid },
  { label: "Board", href: "/board", icon: FolderKanban },
  { label: "Backlog", href: "/backlog", icon: ListTodo },
  { label: "Issues", href: "/issues", icon: Ticket },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Members", href: "/members", icon: Users },
  { label: "Sprints", href: "/sprints", icon: CalendarRange },
  { label: "Settings", href: "/settings", icon: Settings },
];

const workspaceLinks = [
  { label: "Overview", href: "", icon: LayoutGrid },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Members", href: "/members", icon: Users, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

const globalLinks = [
  { label: "Workspaces", href: "/workspaces", icon: LayoutGrid },
  { label: "Profile", href: "/profile", icon: UserCircle2 },
  { label: "Preferences", href: "/profile/notifications", icon: Settings },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export function Sidebar() {
  const { workspaceSlug, projectKey } = useParams<{ workspaceSlug?: string; projectKey?: string }>();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null);

  const hasWorkspaceContext = Boolean(workspaceSlug);
  const basePath = hasWorkspaceContext ? (projectKey ? `/w/${workspaceSlug}/p/${projectKey}` : `/w/${workspaceSlug}`) : "";
  const allLinks = hasWorkspaceContext ? (projectKey ? projectLinks : workspaceLinks) : globalLinks;
  const isWorkspaceAdmin = workspaceRole === "owner" || workspaceRole === "admin";
  const links = allLinks.filter((link) => !("adminOnly" in link && link.adminOnly) || isWorkspaceAdmin);

  useEffect(() => {
    if (!workspaceSlug) { setWorkspaceRole(null); return; }
    fetch(`/api/workspaces/by-slug/${workspaceSlug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => { if (payload?.data?.membershipRole) setWorkspaceRole(payload.data.membershipRole); })
      .catch(() => {});
  }, [workspaceSlug]);

  return (
    <aside
      className={cn(
        "relative h-full shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isSidebarCollapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-3 z-10 inline-flex size-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        {isSidebarCollapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>

      <nav className="space-y-0.5 px-2 pt-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={basePath ? `${basePath}${link.href}` : link.href}
              className="group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <Icon className="size-4 shrink-0" />
              {!isSidebarCollapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


