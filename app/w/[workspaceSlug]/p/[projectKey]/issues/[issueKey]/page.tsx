import Link from "next/link";
import { notFound } from "next/navigation";

import { IssueEditForm } from "@/components/issues/issue-edit-form";
import { IssueAttachmentUpload } from "@/components/issues/issue-attachment-upload";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserInline } from "@/components/ui/user-inline";
import { IssueCommentForm } from "@/components/issues/issue-comment-form";
import { ISSUE_PRIORITY_LABELS, ISSUE_TYPE_LABELS } from "@/lib/issue-meta";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string; issueKey: string }>;
}) {
  const { workspaceSlug, projectKey, issueKey } = await params;
  const session = await getAuthSession();

  const issue = await prisma.issue.findFirst({
    where: {
      key: issueKey,
      project: {
        key: projectKey,
        workspace: { slug: workspaceSlug },
      },
    },
    include: {
      status: true,
      assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      reporter: { select: { firstName: true, lastName: true, avatarUrl: true } },
      parent: { select: { key: true, title: true } },
      epic: { select: { key: true, title: true } },
      subtasks: {
        select: { id: true, key: true, title: true },
        orderBy: { createdAt: "asc" },
      },
      epicChildren: {
        select: { id: true, key: true, title: true, type: true },
        orderBy: { createdAt: "asc" },
      },
      sprint: true,
      project: {
        include: {
          issueStatuses: {
            orderBy: { position: "asc" },
          },
          members: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
          sprints: {
            where: { status: { in: ["planning", "active"] } },
            orderBy: [{ status: "asc" }, { startDate: "asc" }],
          },
          issues: {
            select: { id: true, key: true, title: true, type: true, epicId: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      comments: {
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      history: {
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!issue) {
    notFound();
  }

  const workspaceMembership = session?.user?.id
    ? await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: issue.project.workspaceId,
          userId: session.user.id,
        },
        select: { role: true },
      })
    : null;

  const isWorkspaceOwner = workspaceMembership?.role === "owner";
  const canEdit = Boolean(
    session?.user?.id &&
      (session.user.role === "admin" ||
        isWorkspaceOwner ||
        issue.reporterId === session.user.id ||
        issue.assigneeId === session.user.id),
  );

  return (
    <main className="grid gap-4 p-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)]">{issue.key}</p>
              <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{issue.title}</h1>
            </div>
            <Link href={`/w/${workspaceSlug}/p/${projectKey}/board`} className="text-xs text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
              Back to board
            </Link>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">{issue.description || "No description"}</p>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Comments</h2>
          <div className="space-y-3">
            {issue.comments.map((comment) => (
              <div key={comment.id} className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
                <div className="mb-1">
                  <UserInline
                    name={`${comment.user.firstName} ${comment.user.lastName}`}
                    avatarUrl={comment.user.avatarUrl}
                    size="xs"
                  />
                </div>
                <p className="text-sm text-[var(--color-text-primary)]">{comment.content}</p>
              </div>
            ))}

            {!issue.comments.length ? <p className="text-sm text-[var(--color-text-secondary)]">No comments yet.</p> : null}
          </div>

          <div className="mt-4">
            <IssueCommentForm issueId={issue.id} />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Activity</h2>
          <div className="space-y-2">
            {issue.history.map((entry) => (
              <div key={entry.id} className="border-l-2 border-[var(--color-border)] pl-3 text-xs">
                <div className="mb-1 flex items-center gap-2 text-[var(--color-text-primary)]">
                  <UserInline name={`${entry.user.firstName} ${entry.user.lastName}`} avatarUrl={entry.user.avatarUrl} size="xs" />
                  <span>
                    changed <span className="text-[var(--color-accent-primary)]">{entry.fieldName}</span>
                  </span>
                </div>
                <p className="text-[var(--color-text-tertiary)]">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <aside className="space-y-4">
        <IssueEditForm
          issueId={issue.id}
          canEdit={canEdit}
          initial={{
            title: issue.title,
            description: issue.description,
            type: issue.type,
            priority: issue.priority,
            statusId: issue.statusId,
            assigneeId: issue.assigneeId,
            parentId: issue.parentId,
            epicId: issue.epicId,
            sprintId: issue.sprintId,
            storyPoints: issue.storyPoints,
            dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString().slice(0, 10) : null,
          }}
          statuses={issue.project.issueStatuses.map((status) => ({
            id: status.id,
            name: status.name,
          }))}
          members={issue.project.members.map((member) => ({
            id: member.user.id,
            name: `${member.user.firstName} ${member.user.lastName}`,
          }))}
          sprints={issue.project.sprints.map((sprint) => ({
            id: sprint.id,
            name: sprint.name,
          }))}
          issues={issue.project.issues
            .filter((candidate) => candidate.id !== issue.id)
            .map((candidate) => ({
              id: candidate.id,
              key: candidate.key,
              title: candidate.title,
              type: candidate.type,
              epicId: candidate.epicId,
            }))}
        />

        <Card className="space-y-3 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-secondary)]">Type</span>
            <Badge variant="info" className="normal-case">
              {ISSUE_TYPE_LABELS[issue.type]}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-secondary)]">Status</span>
            <Badge className="normal-case">{issue.status.name}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-secondary)]">Priority</span>
            <span>{ISSUE_PRIORITY_LABELS[issue.priority]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-secondary)]">Assignee</span>
            <UserInline
              name={issue.assignee ? `${issue.assignee.firstName} ${issue.assignee.lastName}` : null}
              avatarUrl={issue.assignee?.avatarUrl ?? null}
              fallbackLabel="Unassigned"
              size="xs"
              textClassName="text-[var(--color-text-primary)]"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-secondary)]">Reporter</span>
            <UserInline
              name={`${issue.reporter.firstName} ${issue.reporter.lastName}`}
              avatarUrl={issue.reporter.avatarUrl}
              size="xs"
              textClassName="text-[var(--color-text-primary)]"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-secondary)]">Sprint</span>
            <span>{issue.sprint?.name ?? "Backlog"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[var(--color-text-secondary)]">Epic</span>
            {issue.epic ? (
              <Link href={`/w/${workspaceSlug}/p/${projectKey}/issues/${issue.epic.key}`} className="truncate text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
                {issue.epic.key}
              </Link>
            ) : (
              <span>None</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[var(--color-text-secondary)]">Parent</span>
            {issue.parent ? (
              <Link href={`/w/${workspaceSlug}/p/${projectKey}/issues/${issue.parent.key}`} className="truncate text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
                {issue.parent.key}
              </Link>
            ) : (
              <span>None</span>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Hierarchy</h3>
          {issue.type === "epic" ? (
            <div className="space-y-2 text-xs">
              {issue.epicChildren.map((child) => (
                <Link key={child.id} href={`/w/${workspaceSlug}/p/${projectKey}/issues/${child.key}`} className="block border border-[var(--color-border)] p-2 text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
                  {child.key} - {child.title}
                </Link>
              ))}
              {!issue.epicChildren.length ? <p className="text-[var(--color-text-secondary)]">No linked issues.</p> : null}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {issue.subtasks.map((subtask) => (
                <Link key={subtask.id} href={`/w/${workspaceSlug}/p/${projectKey}/issues/${subtask.key}`} className="block border border-[var(--color-border)] p-2 text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
                  {subtask.key} - {subtask.title}
                </Link>
              ))}
              {!issue.subtasks.length ? <p className="text-[var(--color-text-secondary)]">No child issues.</p> : null}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Attachments</h3>
          <IssueAttachmentUpload issueId={issue.id} />
          <div className="space-y-2 text-xs">
            {issue.attachments.map((attachment) => (
              <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="block border border-[var(--color-border)] p-2 text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
                {attachment.filename}
              </a>
            ))}
            {!issue.attachments.length ? <p className="text-[var(--color-text-secondary)]">No attachments uploaded.</p> : null}
          </div>
        </Card>
      </aside>
    </main>
  );
}


