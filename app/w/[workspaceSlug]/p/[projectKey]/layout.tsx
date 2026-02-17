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
    select: { id: true },
  });

  if (!project) {
    redirect(`/w/${workspaceSlug}`);
  }

  if (canBypassProjectMembership(session.user.role)) {
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
