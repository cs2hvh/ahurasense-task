import Link from "next/link";
import { notFound } from "next/navigation";
import type { IssuePriority, IssueType, Prisma } from "@prisma/client";
import { Filter, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { UserInline } from "@/components/ui/user-inline";
import { ISSUE_PRIORITY_LABELS, ISSUE_TYPE_LABELS } from "@/lib/issue-meta";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

type SortOption = "updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "due_asc" | "due_desc";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeType(value: string | undefined): IssueType | undefined {
  const allowed: IssueType[] = ["task", "story", "bug", "epic", "subtask"];
  return value && allowed.includes(value as IssueType) ? (value as IssueType) : undefined;
}

function normalizePriority(value: string | undefined): IssuePriority | undefined {
  const allowed: IssuePriority[] = ["lowest", "low", "medium", "high", "highest"];
  return value && allowed.includes(value as IssuePriority) ? (value as IssuePriority) : undefined;
}

function normalizeSort(value: string | undefined): SortOption {
  const allowed: SortOption[] = ["updated_desc", "updated_asc", "created_desc", "created_asc", "due_asc", "due_desc"];
  return value && allowed.includes(value as SortOption) ? (value as SortOption) : "updated_desc";
}

function statusBadgeVariant(category: "todo" | "in_progress" | "done"): "default" | "info" | "success" {
  if (category === "in_progress") {
    return "info";
  }
  if (category === "done") {
    return "success";
  }
  return "default";
}

function priorityBadgeVariant(priority: IssuePriority): "default" | "success" | "warning" | "error" {
  if (priority === "highest" || priority === "high") {
    return "error";
  }
  if (priority === "medium") {
    return "warning";
  }
  if (priority === "lowest") {
    return "success";
  }
  return "default";
}

function typeBadgeVariant(type: IssueType): "default" | "success" | "warning" | "error" | "info" {
  if (type === "bug") {
    return "error";
  }
  if (type === "epic") {
    return "warning";
  }
  if (type === "story") {
    return "info";
  }
  if (type === "subtask") {
    return "success";
  }
  return "default";
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function toQueryString(filters: {
  q?: string;
  type?: string;
  statusId?: string;
  epicId?: string;
  priority?: string;
  assigneeId?: string;
  reporterId?: string;
  sprintId?: string;
  sort?: SortOption;
}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.statusId) params.set("statusId", filters.statusId);
  if (filters.epicId) params.set("epicId", filters.epicId);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.reporterId) params.set("reporterId", filters.reporterId);
  if (filters.sprintId) params.set("sprintId", filters.sprintId);
  if (filters.sort && filters.sort !== "updated_desc") params.set("sort", filters.sort);
  return params.toString();
}

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
  searchParams: Promise<{
    q?: string | string[];
    type?: string | string[];
    statusId?: string | string[];
    epicId?: string | string[];
    priority?: string | string[];
    assigneeId?: string | string[];
    reporterId?: string | string[];
    sprintId?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const session = await getAuthSession();
  const currentUserId = session?.user?.id;
  const { workspaceSlug, projectKey } = await params;
  const rawFilters = await searchParams;

  const q = first(rawFilters.q)?.trim() ?? "";
  const type = normalizeType(first(rawFilters.type));
  const statusId = first(rawFilters.statusId) || undefined;
  const epicId = first(rawFilters.epicId) || undefined;
  const priority = normalizePriority(first(rawFilters.priority));
  const assigneeId = first(rawFilters.assigneeId) || undefined;
  const reporterId = first(rawFilters.reporterId) || undefined;
  const sprintId = first(rawFilters.sprintId) || undefined;
  const sort = normalizeSort(first(rawFilters.sort));

  const project = await prisma.project.findFirst({
    where: { key: projectKey, workspace: { slug: workspaceSlug } },
    include: {
      issueStatuses: { orderBy: { position: "asc" } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      sprints: {
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  const issueWhere: Prisma.IssueWhereInput = {
    projectId: project.id,
    ...(type ? { type } : {}),
    ...(statusId ? { statusId } : {}),
    ...(epicId ? { epicId } : {}),
    ...(priority ? { priority } : {}),
    ...(assigneeId
      ? assigneeId === "unassigned"
        ? { assigneeId: null }
        : { assigneeId }
      : {}),
    ...(reporterId ? { reporterId } : {}),
    ...(sprintId
      ? sprintId === "backlog"
        ? { sprintId: null }
        : { sprintId }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { key: { contains: q } },
          ],
        }
      : {}),
  };

  const issueOrderBy: Prisma.IssueOrderByWithRelationInput[] =
    sort === "updated_asc"
      ? [{ updatedAt: "asc" }]
      : sort === "created_desc"
        ? [{ createdAt: "desc" }]
        : sort === "created_asc"
          ? [{ createdAt: "asc" }]
          : sort === "due_asc"
            ? [{ dueDate: "asc" }, { updatedAt: "desc" }]
            : sort === "due_desc"
              ? [{ dueDate: "desc" }, { updatedAt: "desc" }]
              : [{ updatedAt: "desc" }];

  const [issues, totalIssueCount] = await Promise.all([
    prisma.issue.findMany({
      where: issueWhere,
      include: {
        status: { select: { name: true, category: true } },
        assignee: { select: { firstName: true, lastName: true, avatarUrl: true } },
        reporter: { select: { firstName: true, lastName: true, avatarUrl: true } },
        sprint: { select: { name: true } },
        epic: { select: { key: true } },
        parent: { select: { key: true } },
      },
      orderBy: issueOrderBy,
    }),
    prisma.issue.count({ where: { projectId: project.id } }),
  ]);

  const epics = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      type: "epic",
    },
    select: { id: true, key: true, title: true },
    orderBy: { createdAt: "asc" },
  });

  const filteredIssueCount = issues.length;
  const todoCount = issues.filter((issue) => issue.status.category === "todo").length;
  const inProgressCount = issues.filter((issue) => issue.status.category === "in_progress").length;
  const doneCount = issues.filter((issue) => issue.status.category === "done").length;
  const hasActiveFilters = Boolean(
    q || type || statusId || epicId || priority || assigneeId || reporterId || sprintId || sort !== "updated_desc",
  );
  const issuesPath = `/w/${workspaceSlug}/p/${projectKey}/issues`;
  const mineQuery =
    currentUserId
      ? toQueryString({
          q,
          type,
          statusId,
          epicId,
          priority,
          assigneeId: currentUserId,
          reporterId,
          sprintId,
          sort,
        })
      : "";
  const mineHref = currentUserId ? `${issuesPath}${mineQuery ? `?${mineQuery}` : ""}` : null;

  return (
    <main className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Issues</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {project.key} · {filteredIssueCount}/{totalIssueCount} visible
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mineHref ? (
            <Link
              href={mineHref}
              className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
            >
              My Issues
            </Link>
          ) : null}
          <Link
            href={`/w/${workspaceSlug}/p/${projectKey}/board`}
            className="inline-flex h-9 items-center border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            Open Board
          </Link>
        </div>
      </header>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
            <Filter className="size-3.5 text-[var(--color-accent-primary)]" />
            Filters
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="normal-case">To Do: {todoCount}</Badge>
            <Badge variant="info" className="normal-case">
              In Progress: {inProgressCount}
            </Badge>
            <Badge variant="success" className="normal-case">
              Done: {doneCount}
            </Badge>
          </div>
        </div>

        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" method="GET" action={issuesPath}>
          <Input name="q" defaultValue={q} placeholder="Search key or summary" className="bg-[var(--color-bg-primary)]" />

          <select name="type" defaultValue={type ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm">
            <option value="">All types</option>
            <option value="task">Task</option>
            <option value="story">Story</option>
            <option value="bug">Bug</option>
            <option value="epic">Epic</option>
            <option value="subtask">Subtask</option>
          </select>

          <select name="statusId" defaultValue={statusId ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm">
            <option value="">All statuses</option>
            {project.issueStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          <select name="priority" defaultValue={priority ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm">
            <option value="">All priorities</option>
            <option value="highest">Highest</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="lowest">Lowest</option>
          </select>

          <select name="assigneeId" defaultValue={assigneeId ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm">
            <option value="">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {project.members.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.firstName} {member.user.lastName}
              </option>
            ))}
          </select>

          <select name="reporterId" defaultValue={reporterId ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm">
            <option value="">All reporters</option>
            {project.members.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.firstName} {member.user.lastName}
              </option>
            ))}
          </select>

          <select name="sprintId" defaultValue={sprintId ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm">
            <option value="">All sprints</option>
            <option value="backlog">Backlog (No Sprint)</option>
            {project.sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>

          <select name="epicId" defaultValue={epicId ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm">
            <option value="">All epics</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.key} · {epic.title}
              </option>
            ))}
          </select>

          <select name="sort" defaultValue={sort} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm">
            <option value="updated_desc">Updated (Newest)</option>
            <option value="updated_asc">Updated (Oldest)</option>
            <option value="created_desc">Created (Newest)</option>
            <option value="created_asc">Created (Oldest)</option>
            <option value="due_asc">Due Date (Soonest)</option>
            <option value="due_desc">Due Date (Latest)</option>
          </select>

          <div className="flex items-center gap-2 xl:col-span-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
            >
              Apply Filters
            </button>
            <Link
              href={issuesPath}
              className="inline-flex h-10 items-center border border-[var(--color-border)] px-4 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <RefreshCw className="mr-1 size-4" />
              Reset
            </Link>
          </div>
        </form>

        {hasActiveFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
            <span className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Active</span>
            {q ? <Badge className="normal-case">Search: {q}</Badge> : null}
            {type ? <Badge className="normal-case">Type: {ISSUE_TYPE_LABELS[type]}</Badge> : null}
            {priority ? <Badge className="normal-case">Priority: {ISSUE_PRIORITY_LABELS[priority]}</Badge> : null}
            {assigneeId ? (
              <Badge className="normal-case">
                Assignee:{" "}
                {assigneeId === "unassigned"
                  ? "Unassigned"
                  : project.members.find((member) => member.user.id === assigneeId)
                    ? `${project.members.find((member) => member.user.id === assigneeId)?.user.firstName ?? ""} ${
                        project.members.find((member) => member.user.id === assigneeId)?.user.lastName ?? ""
                      }`.trim()
                    : "Selected"}
              </Badge>
            ) : null}
            {reporterId ? (
              <Badge className="normal-case">
                Reporter:{" "}
                {project.members.find((member) => member.user.id === reporterId)
                  ? `${project.members.find((member) => member.user.id === reporterId)?.user.firstName ?? ""} ${
                      project.members.find((member) => member.user.id === reporterId)?.user.lastName ?? ""
                    }`.trim()
                  : "Selected"}
              </Badge>
            ) : null}
            {sprintId ? (
              <Badge className="normal-case">
                Sprint:{" "}
                {sprintId === "backlog"
                  ? "Backlog"
                  : project.sprints.find((sprint) => sprint.id === sprintId)?.name ?? "Selected"}
              </Badge>
            ) : null}
            {epicId ? (
              <Badge className="normal-case">
                Epic: {epics.find((epic) => epic.id === epicId)?.key ?? "Selected"}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </Card>

      <section className="space-y-2">
        <div className="hidden grid-cols-[120px_1fr_100px_120px_110px_170px_170px_110px] gap-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] lg:grid">
          <span>Key</span>
          <span>Summary</span>
          <span>Type</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Assignee</span>
          <span>Reporter</span>
          <span>Updated</span>
        </div>

        {issues.map((issue) => (
          <Card key={issue.id} className="p-3">
            <div className="grid gap-3 lg:grid-cols-[120px_1fr_100px_120px_110px_170px_170px_110px] lg:items-center">
              <div>
                <Link
                  href={`/w/${workspaceSlug}/p/${projectKey}/issues/${issue.key}`}
                  className="text-sm font-semibold text-[var(--color-accent-primary)] hover:underline"
                >
                  {issue.key}
                </Link>
              </div>

              <div className="min-w-0">
                <Link
                  href={`/w/${workspaceSlug}/p/${projectKey}/issues/${issue.key}`}
                  className="block truncate text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)]"
                >
                  {issue.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-secondary)]">
                  {issue.epic ? <span>Epic: {issue.epic.key}</span> : null}
                  {issue.parent ? <span>Parent: {issue.parent.key}</span> : null}
                  <span>Due: {formatDate(issue.dueDate)}</span>
                  <span>Points: {issue.storyPoints ?? "-"}</span>
                  <span>Sprint: {issue.sprint?.name ?? "Backlog"}</span>
                </div>
              </div>

              <div>
                <Badge variant={typeBadgeVariant(issue.type)} className="normal-case">
                  {ISSUE_TYPE_LABELS[issue.type]}
                </Badge>
              </div>

              <div>
                <Badge variant={statusBadgeVariant(issue.status.category)} className="normal-case">
                  {issue.status.name}
                </Badge>
              </div>

              <div>
                <Badge variant={priorityBadgeVariant(issue.priority)} className="normal-case">
                  {ISSUE_PRIORITY_LABELS[issue.priority]}
                </Badge>
              </div>

              <UserInline
                name={issue.assignee ? `${issue.assignee.firstName} ${issue.assignee.lastName}` : null}
                avatarUrl={issue.assignee?.avatarUrl ?? null}
                fallbackLabel="Unassigned"
                size="xs"
              />

              <UserInline
                name={`${issue.reporter.firstName} ${issue.reporter.lastName}`}
                avatarUrl={issue.reporter.avatarUrl ?? null}
                fallbackLabel="-"
                size="xs"
              />

              <span className="text-xs text-[var(--color-text-secondary)]">{formatDate(issue.updatedAt)}</span>
            </div>
          </Card>
        ))}

        {!issues.length ? (
          <Card className="p-6 text-sm text-[var(--color-text-secondary)]">
            No issues found for current filters.
          </Card>
        ) : null}
      </section>
    </main>
  );
}


