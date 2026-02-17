import { prisma } from "@/lib/prisma";

export async function getWorkspaceMembership(workspaceSlug: string, userId: string) {
  return prisma.workspaceMember.findFirst({
    where: {
      workspace: { slug: workspaceSlug },
      userId,
    },
    include: {
      workspace: true,
    },
  });
}

export async function canAccessProject(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  });

  return Boolean(membership);
}

export async function canManageWorkspace(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      role: { in: ["owner", "admin"] },
    },
  });

  return Boolean(member);
}


