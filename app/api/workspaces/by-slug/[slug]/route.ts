import { requireUser } from "@/lib/api-auth";
import { canBypassProjectMembership } from "@/lib/access";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { slug } = await params;

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspace: { slug },
      userId: auth.session.user.id,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          ownerId: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!membership) {
    return fail("Workspace not found", 404);
  }

  const canViewAllWorkspaceProjects = canBypassProjectMembership(auth.session.user.role, membership.role);

  const projects = await prisma.project.findMany({
    where: {
      workspaceId: membership.workspace.id,
      ...(canViewAllWorkspaceProjects
        ? {}
        : {
            members: {
              some: {
                userId: auth.session.user.id,
              },
            },
          }),
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok({
    ...membership.workspace,
    projects,
    membershipRole: membership.role,
  });
}

