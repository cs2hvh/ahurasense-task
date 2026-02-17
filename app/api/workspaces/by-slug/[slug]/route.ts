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
  const canViewAllWorkspaceProjects = canBypassProjectMembership(auth.session.user.role);

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspace: { slug },
      userId: auth.session.user.id,
    },
    include: {
      workspace: {
        include: {
          projects: {
            where: canViewAllWorkspaceProjects ? undefined : { members: { some: { userId: auth.session.user.id } } },
          },
        },
      },
    },
  });

  if (!membership) {
    return fail("Workspace not found", 404);
  }

  return ok({
    ...membership.workspace,
    membershipRole: membership.role,
  });
}


