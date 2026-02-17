import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserInline } from "@/components/ui/user-inline";
import { ISSUE_TYPE_LABELS } from "@/lib/issue-meta";
import { prisma } from "@/lib/prisma";

const issueTypeOrder: Array<"epic" | "story" | "task" | "bug" | "subtask"> = ["epic", "story", "task", "bug", "subtask"];

export default async function BacklogPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}) {
  const { workspaceSlug, projectKey } = await params;

  const project = await prisma.project.findFirst({
    where: { key: projectKey, workspace: { slug: workspaceSlug } },
    include: {
      issues: {
        include: {
          status: true,
          sprint: true,
          assignee: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: [{ type: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <main className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Backlog</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Plan work by type, sprint assignment, and priority.</p>
        </div>
        <Link href={`/w/${workspaceSlug}/p/${projectKey}/board`} className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
          Open Board
        </Link>
      </header>

      {issueTypeOrder.map((type) => {
        const issues = project.issues.filter((issue) => issue.type === type);
        return (
          <Card key={type} className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{ISSUE_TYPE_LABELS[type]}</h2>
              <Badge variant="info">{issues.length}</Badge>
            </div>

            <div className="space-y-2">
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm">
                  <Link href={`/w/${workspaceSlug}/p/${projectKey}/issues/${issue.key}`} className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)]">
                    {issue.key} - {issue.title}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                    <span>{issue.status.name}</span>
                    <span>{issue.sprint?.name ?? "Backlog"}</span>
                    <UserInline
                      name={issue.assignee ? `${issue.assignee.firstName} ${issue.assignee.lastName}` : null}
                      avatarUrl={issue.assignee?.avatarUrl ?? null}
                      fallbackLabel="Unassigned"
                      size="xs"
                    />
                  </div>
                </div>
              ))}
              {!issues.length ? <p className="text-xs text-[var(--color-text-tertiary)]">No {ISSUE_TYPE_LABELS[type].toLowerCase()} issues.</p> : null}
            </div>
          </Card>
        );
      })}
    </main>
  );
}


