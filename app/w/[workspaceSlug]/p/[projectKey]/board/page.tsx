import Link from "next/link";
import { notFound } from "next/navigation";

import { KanbanBoard } from "@/components/board/kanban-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import type { BoardColumn } from "@/types/domain";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}) {
  const { workspaceSlug, projectKey } = await params;
  const session = await getAuthSession();
  const currentUserId = session?.user?.id ?? null;

  const project = await prisma.project.findFirst({
    where: {
      key: projectKey,
      workspace: {
        slug: workspaceSlug,
      },
    },
    include: {
      issueStatuses: {
        orderBy: { position: "asc" },
      },
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
      },
      sprints: {
        where: { status: { in: ["planning", "active"] } },
        orderBy: [{ status: "asc" }, { startDate: "asc" }],
      },
      issues: {
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          reporter: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const [workspaceMembership, projectMembership] = currentUserId
    ? await Promise.all([
        prisma.workspaceMember.findFirst({
          where: {
            workspaceId: project.workspaceId,
            userId: currentUserId,
          },
          select: { role: true },
        }),
        prisma.projectMember.findFirst({
          where: {
            projectId: project.id,
            userId: currentUserId,
          },
          select: { role: true },
        }),
      ])
    : [null, null];

  const canManageColumns = Boolean(
    session?.user?.role === "admin" ||
      workspaceMembership?.role === "owner" ||
      workspaceMembership?.role === "admin" ||
      projectMembership?.role === "lead",
  );

  const typeCounts = {
    task: project.issues.filter((issue) => issue.type === "task").length,
    story: project.issues.filter((issue) => issue.type === "story").length,
    bug: project.issues.filter((issue) => issue.type === "bug").length,
    epic: project.issues.filter((issue) => issue.type === "epic").length,
    subtask: project.issues.filter((issue) => issue.type === "subtask").length,
  };

  const columns: BoardColumn[] = project.issueStatuses.map((status) => ({
    id: status.id,
    name: status.name,
    category: status.category,
    color: status.color,
    issues: project.issues
      .filter((issue) => issue.statusId === status.id)
      .map((issue) => ({
        id: issue.id,
        key: issue.key,
        type: issue.type,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        storyPoints: issue.storyPoints,
        assigneeId: issue.assigneeId,
        assigneeName: issue.assignee ? `${issue.assignee.firstName} ${issue.assignee.lastName}` : null,
        assigneeAvatarUrl: issue.assignee?.avatarUrl ?? null,
        reporterId: issue.reporterId,
        reporterName: issue.reporter ? `${issue.reporter.firstName} ${issue.reporter.lastName}` : null,
        reporterAvatarUrl: issue.reporter?.avatarUrl ?? null,
        parentId: issue.parentId,
        epicId: issue.epicId,
        sprintId: issue.sprintId,
        statusId: issue.statusId,
        position: issue.position ?? 0,
      })),
  }));

  return (
    <main className="h-[calc(100vh-56px)] overflow-hidden bg-[linear-gradient(180deg,#101114_0%,#0a0a0b_52%)] p-4">
      <header className="mb-2 flex items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 shadow-[var(--shadow-sm)]">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{project.name} Board</h1>
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-tertiary)]">{project.key}</span>
            <span className="mx-2 text-[var(--color-text-tertiary)]">|</span>
            {project.issues.length} issues
            <span className="mx-2 text-[var(--color-text-tertiary)]">|</span>
            {project.issueStatuses.length} columns
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <Badge className="normal-case px-1.5 py-0 text-[10px]">Tasks: {typeCounts.task}</Badge>
            <Badge className="normal-case px-1.5 py-0 text-[10px]" variant="info">
              Stories: {typeCounts.story}
            </Badge>
            <Badge className="normal-case px-1.5 py-0 text-[10px]" variant="error">
              Bugs: {typeCounts.bug}
            </Badge>
            <Badge className="normal-case px-1.5 py-0 text-[10px]" variant="warning">
              Epics: {typeCounts.epic}
            </Badge>
            <Badge className="normal-case px-1.5 py-0 text-[10px]" variant="success">
              Subtasks: {typeCounts.subtask}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/w/${workspaceSlug}/p/${projectKey}/issues`}>
            <Button variant="secondary" size="sm">
              Issues
            </Button>
          </Link>
          <Link href={`/w/${workspaceSlug}/p/${projectKey}/sprints`}>
            <Button variant="secondary" size="sm">
              Sprints
            </Button>
          </Link>
        </div>
      </header>
      <KanbanBoard
        projectId={project.id}
        projectKey={project.key}
        initialColumns={columns}
        members={project.members.map((member) => ({
          id: member.user.id,
          name: `${member.user.firstName} ${member.user.lastName}`,
          avatarUrl: member.user.avatarUrl ?? null,
        }))}
        sprints={project.sprints.map((sprint) => ({ id: sprint.id, name: sprint.name }))}
        currentUserId={currentUserId}
        canDeleteColumns={canManageColumns}
        canManageColumns={canManageColumns}
      />
    </main>
  );
}
