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
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const projectSections: NavSection[] = [
  {
    title: "Planning",
    items: [
      { label: "Board", href: "/board", icon: FolderKanban },
      { label: "Backlog", href: "/backlog", icon: ListTodo },
      { label: "Issues", href: "/issues", icon: Ticket },
      { label: "Sprints", href: "/sprints", icon: CalendarRange },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Members", href: "/members", icon: Users, adminOnly: true },
      { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
    ],
  },
];

const workspaceSections: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Overview", href: "", icon: LayoutGrid },
      { label: "Projects", href: "/projects", icon: FolderKanban },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Members", href: "/members", icon: Users, adminOnly: true },
      { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
    ],
  },
];

const globalSections: NavSection[] = [
  {
    title: "Account",
    items: [
      { label: "Workspaces", href: "/workspaces", icon: LayoutGrid },
      { label: "My Profile", href: "/profile", icon: UserCircle2 },
      { label: "Preferences", href: "/profile/notifications", icon: Settings },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
];

function isActive(pathname: string, fullHref: string, allHrefs: string[]): boolean {
  if (pathname === fullHref) return true;
  if (fullHref === "/" || fullHref === "") return pathname === fullHref || pathname === "/";
  // Only match as prefix if no other, more specific sibling href matches
  if (pathname.startsWith(fullHref + "/")) {
    const hasMoreSpecific = allHrefs.some((h) => h !== fullHref && h.startsWith(fullHref + "/") && pathname.startsWith(h));
    return !hasMoreSpecific;
  }
  return false;
}

export function Sidebar() {
  const { workspaceSlug, projectKey } = useParams<{ workspaceSlug?: string; projectKey?: string }>();
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null);
  const [projectRole, setProjectRole] = useState<string | null>(null);

  const hasWorkspaceContext = Boolean(workspaceSlug);
  const basePath = hasWorkspaceContext ? (projectKey ? `/w/${workspaceSlug}/p/${projectKey}` : `/w/${workspaceSlug}`) : "";
  const sections = hasWorkspaceContext ? (projectKey ? projectSections : workspaceSections) : globalSections;
  const isWorkspaceAdmin = workspaceRole === "owner" || workspaceRole === "admin";
  const isProjectAdmin = isWorkspaceAdmin || projectRole === "lead";
  const canSeeAdminItems = hasWorkspaceContext && projectKey ? isProjectAdmin : isWorkspaceAdmin;

  // Collect all resolved hrefs for accurate active-state matching
  const allHrefs = sections.flatMap((s) =>
    s.items.filter((i) => !i.adminOnly || canSeeAdminItems).map((i) => basePath ? `${basePath}${i.href}` : i.href),
  );

  useEffect(() => {
    if (!workspaceSlug) { setWorkspaceRole(null); return; }
    fetch(`/api/workspaces/by-slug/${workspaceSlug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => { if (payload?.data?.membershipRole) setWorkspaceRole(payload.data.membershipRole); })
      .catch(() => {});
  }, [workspaceSlug]);

  useEffect(() => {
    if (!workspaceSlug || !projectKey) { setProjectRole(null); return; }
    fetch(`/api/projects/by-key/${workspaceSlug}/${projectKey}/role`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => { if (payload?.data?.role) setProjectRole(payload.data.role); })
      .catch(() => {});
  }, [workspaceSlug, projectKey]);

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isSidebarCollapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-3 z-10 inline-flex size-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        {isSidebarCollapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>

      <nav className="flex-1 overflow-y-auto px-2 pt-3 pb-4">
        {sections.map((section, si) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || canSeeAdminItems);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className={si > 0 ? "mt-5" : ""}>
              {/* Section header */}
              {!isSidebarCollapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                  {section.title}
                </p>
              )}
              {isSidebarCollapsed && si > 0 && (
                <div className="mx-3 mb-2 border-t border-[var(--color-border)]" />
              )}

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const fullHref = basePath ? `${basePath}${item.href}` : item.href;
                  const active = isActive(pathname, fullHref, allHrefs);

                  return (
                    <Link
                      key={item.label}
                      href={fullHref}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex h-9 items-center gap-2.5 px-3 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]",
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1 left-0 w-[3px] bg-[var(--color-accent-primary)]" />
                      )}
                      <Icon className={cn("size-[18px] shrink-0", active && "text-[var(--color-accent-primary)]")} />
                      {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}


