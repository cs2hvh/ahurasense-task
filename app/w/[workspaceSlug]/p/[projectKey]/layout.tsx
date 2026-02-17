import { redirect } from "next/navigation";

import { canBypassProjectMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
      workspace: { slug: workspaceSlug },
    },
    select: { id: true, workspaceId: true },
  });

  if (!project) {
    redirect(`/w/${workspaceSlug}`);
  }

  const workspaceMembership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: project.workspaceId,
      userId: session.user.id,
    },
    select: { role: true },
  });

  const canBypass = canBypassProjectMembership(session.user.role, workspaceMembership?.role);
  const isWorkspaceAdmin = workspaceMembership?.role === "owner" || workspaceMembership?.role === "admin";

  if (canBypass) {
    if (isWorkspaceAdmin) {
      await prisma.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: session.user.id,
          },
        },
        update: {},
        create: {
          projectId: project.id,
          userId: session.user.id,
          role: "viewer",
        },
      });
    }

    return children;
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId: project.id,
      userId: session.user.id,
    },
    select: { id: true },
  });

  if (!membership) {
    redirect(`/w/${workspaceSlug}/projects`);
  }

  return children;
}
