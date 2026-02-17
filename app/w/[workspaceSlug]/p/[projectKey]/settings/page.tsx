import { notFound } from "next/navigation";
import Link from "next/link";

import { ProjectGeneralSettingsForm } from "@/components/project/project-general-settings-form";
import { LabelsManager } from "@/components/project/labels-manager";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}) {
  const session = await getAuthSession();
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
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const currentProjectMember = project.members.find((member) => member.userId === session?.user?.id);
  const workspaceMembership = session?.user?.id
    ? await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: session.user.id,
        },
        select: { role: true },
      })
    : null;

  const canManage =
    session?.user?.role === "admin" ||
    workspaceMembership?.role === "owner" ||
    workspaceMembership?.role === "admin" ||
    currentProjectMember?.role === "lead";

  return (
    <main className="space-y-4 p-6">
      <ProjectGeneralSettingsForm
        projectId={project.id}
        canEdit={Boolean(canManage)}
        initial={{
          key: project.key,
          name: project.name,
          description: project.description,
          type: project.type,
          status: project.status,
          startDate: project.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : null,
          targetEndDate: project.targetEndDate ? new Date(project.targetEndDate).toISOString().slice(0, 10) : null,
          leadId: project.leadId,
        }}
        members={project.members.map((member) => ({
          id: member.user.id,
          name: `${member.user.firstName} ${member.user.lastName}`,
        }))}
      />

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Labels</h2>
        <LabelsManager projectId={project.id} canManage={Boolean(canManage)} />
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Project Access</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Manage who can access this project and define member roles.
        </p>
        <Link
          href={`/w/${workspaceSlug}/p/${projectKey}/members`}
          className="mt-3 inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-bg-tertiary)]"
        >
          Manage Project Members
        </Link>
      </Card>
    </main>
  );
}


