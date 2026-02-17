"use client";

import { Clock3, FolderKanban, Search, Ticket, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { UserInline } from "@/components/ui/user-inline";

type SearchIssue = {
  id: string;
  key: string;
  title: string;
  project: {
    key: string;
    workspace: { slug: string };
  };
};

type SearchProject = {
  id: string;
  key: string;
  name: string;
  workspace: { slug: string };
};

type SearchUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
};

type SearchResponse = {
  data: {
    issues: SearchIssue[];
    projects: SearchProject[];
    users: SearchUser[];
  };
};

type RecentItem = {
  label: string;
  href: string;
  type: "issue" | "project";
};

const RECENT_ITEMS_KEY = "kanban.recentSearchItems";
const MAX_RECENT_ITEMS = 8;

function loadRecentItems(): RecentItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_ITEMS_KEY) ?? "[]") as RecentItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && typeof item.label === "string" && typeof item.href === "string" && (item.type === "issue" || item.type === "project"));
  } catch {
    return [];
  }
}

function saveRecentItems(items: RecentItem[]) {
  localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(items.slice(0, MAX_RECENT_ITEMS)));
}

function shorten(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

export function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<SearchIssue[]>([]);
  const [projects, setProjects] = useState<SearchProject[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasResults = issues.length > 0 || projects.length > 0 || users.length > 0;
  const normalizedQuery = query.trim();

  useEffect(() => {
    setRecentItems(loadRecentItems());
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleShortcut);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!normalizedQuery) {
      setIssues([]);
      setProjects([]);
      setUsers([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}&limit=10`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as SearchResponse;
        setIssues(payload.data.issues ?? []);
        setProjects(payload.data.projects ?? []);
        setUsers(payload.data.users ?? []);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalizedQuery, open]);

  const issueResults = useMemo(
    () =>
      issues.map((issue) => ({
        href: `/w/${issue.project.workspace.slug}/p/${issue.project.key}/issues/${issue.key}`,
        label: `${issue.key} - ${issue.title}`,
      })),
    [issues],
  );

  const projectResults = useMemo(
    () =>
      projects.map((project) => ({
        href: `/w/${project.workspace.slug}/p/${project.key}`,
        label: `${project.key} - ${project.name}`,
      })),
    [projects],
  );

  function remember(item: RecentItem) {
    const next = [item, ...recentItems.filter((candidate) => candidate.href !== item.href)].slice(0, MAX_RECENT_ITEMS);
    setRecentItems(next);
    saveRecentItems(next);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
      <input
        ref={inputRef}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder="Search issues, projects, users..."
        className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] pl-10 pr-16 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent-primary)]"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
        Ctrl/Cmd+K
      </span>

      {open ? (
        <div className="absolute top-full z-50 mt-2 max-h-[70vh] w-full overflow-y-auto border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-[var(--shadow-lg)]">
          {!normalizedQuery ? (
            <div className="p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Recent</p>
              <div className="space-y-1">
                {recentItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 border border-transparent px-2 py-1.5 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
                  >
                    <Clock3 className="size-3.5" />
                    <span className="truncate">{shorten(item.label, 60)}</span>
                  </Link>
                ))}
                {!recentItems.length ? <p className="px-2 py-1.5 text-xs text-[var(--color-text-tertiary)]">No recent items.</p> : null}
              </div>
            </div>
          ) : (
            <div className="p-3">
              {loading ? <p className="text-xs text-[var(--color-text-tertiary)]">Searching...</p> : null}

              {issueResults.length ? (
                <section className="mb-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Issues</p>
                  <div className="space-y-1">
                    {issueResults.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          remember({ type: "issue", href: item.href, label: item.label });
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 border border-transparent px-2 py-1.5 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
                      >
                        <Ticket className="size-3.5 text-[var(--color-info)]" />
                        <span className="truncate">{shorten(item.label, 74)}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {projectResults.length ? (
                <section className="mb-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Projects</p>
                  <div className="space-y-1">
                    {projectResults.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          remember({ type: "project", href: item.href, label: item.label });
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 border border-transparent px-2 py-1.5 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
                      >
                        <FolderKanban className="size-3.5 text-[var(--color-accent-primary)]" />
                        <span className="truncate">{shorten(item.label, 74)}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {users.length ? (
                <section>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Users</p>
                  <div className="space-y-1">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center gap-2 border border-transparent px-2 py-1.5 text-sm text-[var(--color-text-secondary)]">
                        <UserRound className="size-3.5 text-[var(--color-success)]" />
                        <UserInline
                          name={`${user.firstName} ${user.lastName}`}
                          avatarUrl={user.avatarUrl}
                          size="xs"
                          textClassName="text-[var(--color-text-primary)]"
                        />
                        <span className="ml-auto text-xs text-[var(--color-text-tertiary)]">{shorten(user.email, 28)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {!loading && !hasResults ? <p className="text-xs text-[var(--color-text-tertiary)]">No matches found.</p> : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

