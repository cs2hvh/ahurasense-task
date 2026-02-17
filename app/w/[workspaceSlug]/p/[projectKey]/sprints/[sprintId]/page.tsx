import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserInline } from "@/components/ui/user-inline";
import { ISSUE_TYPE_LABELS } from "@/lib/issue-meta";
import { prisma } from "@/lib/prisma";

export default async function SprintDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string; sprintId: string }>;
  searchParams: Promise<{ q?: string; statusId?: string; type?: string; assigneeId?: string; epicId?: string; parentId?: string }>;
}) {
  const { workspaceSlug, projectKey, sprintId } = await params;
  const filters = await searchParams;

  const sprint = await prisma.sprint.findFirst({
    where: {
      id: sprintId,
      project: {
        key: projectKey,
        workspace: { slug: workspaceSlug },
      },
    },
    include: {
      issues: {
        include: {
          status: true,
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          epic: { select: { id: true, key: true, title: true } },
          parent: { select: { id: true, key: true, title: true } },
        },
        orderBy: [{ status: { position: "asc" } }, { updatedAt: "desc" }],
      },
      project: {
        include: {
          issueStatuses: { orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (!sprint) {
    notFound();
  }

  const q = filters.q?.trim().toLowerCase() ?? "";
  const filteredIssues = sprint.issues.filter((issue) => {
    const matchesQ = q ? issue.title.toLowerCase().includes(q) || issue.key.toLowerCase().includes(q) : true;
    const matchesStatus = filters.statusId ? issue.statusId === filters.statusId : true;
    const matchesType = filters.type ? issue.type === filters.type : true;
    const matchesAssignee = filters.assigneeId ? issue.assigneeId === filters.assigneeId : true;
    const matchesEpic = filters.epicId ? issue.epicId === filters.epicId : true;
    const matchesParent = filters.parentId ? issue.parentId === filters.parentId : true;
    return matchesQ && matchesStatus && matchesType && matchesAssignee && matchesEpic && matchesParent;
  });

  const assignees = Array.from(
    new Map(
      sprint.issues
        .filter((issue) => issue.assignee)
        .map((issue) => [
          issue.assignee!.id,
          {
            id: issue.assignee!.id,
            name: `${issue.assignee!.firstName} ${issue.assignee!.lastName}`,
          },
        ]),
    ).values(),
  );

  const doneCount = sprint.issues.filter((issue) => issue.status.category === "done").length;
  const completion = sprint.issues.length ? Math.round((doneCount / sprint.issues.length) * 100) : 0;
  const epicOptions = Array.from(
    new Map(
      sprint.issues
        .filter((issue) => issue.epic)
        .map((issue) => [
          issue.epic!.id,
          {
            id: issue.epic!.id,
            key: issue.epic!.key,
            title: issue.epic!.title,
          },
        ]),
    ).values(),
  );
  const parentOptions = Array.from(
    new Map(
      sprint.issues
        .filter((issue) => issue.parent)
        .map((issue) => [
          issue.parent!.id,
          {
            id: issue.parent!.id,
            key: issue.parent!.key,
            title: issue.parent!.title,
          },
        ]),
    ).values(),
  );

  return (
    <main className="space-y-4 p-6">
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{sprint.name}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">{sprint.goal || "No goal"}</p>
          </div>
          <Link href={`/w/${workspaceSlug}/p/${projectKey}/sprints`} className="text-xs text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
            Back to Sprints
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="normal-case">{sprint.status}</Badge>
          <Badge variant="info" className="normal-case">
            {sprint.issues.length} Issues
          </Badge>
          <Badge variant="success" className="normal-case">
            {completion}% Complete
          </Badge>
        </div>
      </Card>

      <form className="grid gap-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 md:grid-cols-7" method="GET">
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search key/summary"
          className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3"
        />
        <select name="statusId" defaultValue={filters.statusId ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
          <option value="">All statuses</option>
          {sprint.project.issueStatuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={filters.type ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
          <option value="">All types</option>
          <option value="task">Task</option>
          <option value="story">Story</option>
          <option value="bug">Bug</option>
          <option value="epic">Epic</option>
          <option value="subtask">Subtask</option>
        </select>
        <select name="assigneeId" defaultValue={filters.assigneeId ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
          <option value="">All assignees</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.name}
            </option>
          ))}
        </select>
        <select name="epicId" defaultValue={filters.epicId ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
          <option value="">All epics</option>
          {epicOptions.map((epic) => (
            <option key={epic.id} value={epic.id}>
              {epic.key}
            </option>
          ))}
        </select>
        <select name="parentId" defaultValue={filters.parentId ?? ""} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
          <option value="">All parents</option>
          {parentOptions.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.key}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 text-sm font-semibold text-white">
          Apply
        </button>
      </form>

      <Card className="p-0">
        <div className="grid grid-cols-[120px_minmax(0,1fr)_90px_110px_140px_80px_120px_120px] border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
          <div>Issue Key</div>
          <div>Summary</div>
          <div>Type</div>
          <div>Status</div>
          <div>Assignee</div>
          <div>Points</div>
          <div>Epic</div>
          <div>Parent</div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {filteredIssues.map((issue) => (
            <div key={issue.id} className="grid grid-cols-[120px_minmax(0,1fr)_90px_110px_140px_80px_120px_120px] items-center px-4 py-3 text-sm">
              <Link href={`/w/${workspaceSlug}/p/${projectKey}/issues/${issue.key}`} className="font-semibold text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
                {issue.key}
              </Link>
              <Link href={`/w/${workspaceSlug}/p/${projectKey}/issues/${issue.key}`} className="truncate text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)]">
                {issue.title}
              </Link>
              <span className="text-xs text-[var(--color-text-secondary)]">{ISSUE_TYPE_LABELS[issue.type]}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{issue.status.name}</span>
              <UserInline
                name={issue.assignee ? `${issue.assignee.firstName} ${issue.assignee.lastName}` : null}
                avatarUrl={issue.assignee?.avatarUrl ?? null}
                fallbackLabel="Unassigned"
                size="xs"
              />
              <span className="text-xs text-[var(--color-text-secondary)]">{issue.storyPoints ?? "-"}</span>
              <span className="truncate text-xs text-[var(--color-text-secondary)]">{issue.epic?.key ?? "-"}</span>
              <span className="truncate text-xs text-[var(--color-text-secondary)]">{issue.parent?.key ?? "-"}</span>
            </div>
          ))}
        </div>

        {!filteredIssues.length ? (
          <div className="p-6 text-sm text-[var(--color-text-secondary)]">No sprint issues matched current filters.</div>
        ) : null}
      </Card>
    </main>
  );
}
