import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProjectMembersManager } from "@/components/project/project-members-manager";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function ProjectMembersPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const { workspaceSlug, projectKey } = await params;

  const project = await prisma.project.findFirst({
    where: {
      key: projectKey,
      workspace: {
        slug: workspaceSlug,
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              status: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      workspace: {
        select: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatarUrl: true,
                  status: true,
                },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const currentProjectMember = project.members.find((member) => member.userId === session.user.id);
  const currentWorkspaceMember = project.workspace.members.find((member) => member.userId === session.user.id);

  const isGlobalAdmin = session.user.role === "admin";
  const isWorkspaceAdmin = currentWorkspaceMember?.role === "owner" || currentWorkspaceMember?.role === "admin";
  const canManage = isGlobalAdmin || isWorkspaceAdmin || currentProjectMember?.role === "lead";

  return (
    <main className="space-y-4 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Project Members</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {project.key} / {project.name}
          </p>
        </div>
        <Link
          href={`/w/${workspaceSlug}/p/${projectKey}/settings`}
          className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-bg-tertiary)]"
        >
          Open Project Settings
        </Link>
      </header>

      <ProjectMembersManager
        projectId={project.id}
        currentUserId={session.user.id}
        canManage={canManage}
        initialMembers={project.members.map((member) => {
          const workspaceRole =
            project.workspace.members.find((workspaceMember) => workspaceMember.userId === member.userId)?.role ?? "member";
          return {
            userId: member.user.id,
            name: `${member.user.firstName} ${member.user.lastName}`,
            email: member.user.email,
            avatarUrl: member.user.avatarUrl ?? null,
            projectRole: member.role,
            workspaceRole,
            status: member.user.status,
            joinedAt: member.joinedAt.toISOString(),
          };
        })}
        workspaceUsers={project.workspace.members.map((member) => ({
          userId: member.user.id,
          name: `${member.user.firstName} ${member.user.lastName}`,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl ?? null,
          workspaceRole: member.role,
          status: member.user.status,
        }))}
      />

      <Card className="p-4 text-xs text-[var(--color-text-tertiary)]">
        Lead assignment sync: setting role to <span className="font-semibold text-[var(--color-text-secondary)]">Lead</span>{" "}
        updates the project lead. Removing or demoting the lead clears the lead field until reassigned.
      </Card>
    </main>
  );
}
