"use client";

import {
  Bell,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
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

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

const projectLinks = [
  { label: "Overview", href: "", icon: LayoutGrid },
  { label: "Board", href: "/board", icon: FolderKanban },
  { label: "Backlog", href: "/backlog", icon: ListTodo },
  { label: "Issues", href: "/issues", icon: Ticket },
  { label: "Members", href: "/members", icon: Users },
  { label: "Sprints", href: "/sprints", icon: CalendarRange },
  { label: "Settings", href: "/settings", icon: Settings },
];

const workspaceLinks = [
  { label: "Overview", href: "", icon: LayoutGrid },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Members", href: "/members", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
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

  const hasWorkspaceContext = Boolean(workspaceSlug);
  const basePath = hasWorkspaceContext ? (projectKey ? `/w/${workspaceSlug}/p/${projectKey}` : `/w/${workspaceSlug}`) : "";
  const links = hasWorkspaceContext ? (projectKey ? projectLinks : workspaceLinks) : globalLinks;

  return (
    <aside
      className={cn(
        "relative h-[calc(100vh-56px)] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isSidebarCollapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-3 z-10 inline-flex size-6 items-center justify-center border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        {isSidebarCollapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>

      <nav className="space-y-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={basePath ? `${basePath}${link.href}` : link.href}
              className="group flex h-10 items-center gap-2 border border-transparent px-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
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


