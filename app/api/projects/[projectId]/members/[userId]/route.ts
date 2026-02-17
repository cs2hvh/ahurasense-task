import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateProjectMemberSchema } from "@/lib/validations/membership";

async function getProjectManagementAccess(projectId: string, userId: string, globalRole?: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true, leadId: true },
  });

  if (!project) {
    return { error: fail("Project not found", 404) };
  }

  const [projectMember, workspaceMember] = await Promise.all([
    prisma.projectMember.findFirst({
      where: { projectId, userId },
      select: { role: true },
    }),
    prisma.workspaceMember.findFirst({
      where: { workspaceId: project.workspaceId, userId },
      select: { role: true },
    }),
  ]);

  const isGlobalAdmin = globalRole === "admin";
  const isWorkspaceAdmin = workspaceMember?.role === "owner" || workspaceMember?.role === "admin";
  const canManage = isGlobalAdmin || isWorkspaceAdmin || projectMember?.role === "lead";

  return { project, canManage };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { projectId, userId } = await params;
    const access = await getProjectManagementAccess(projectId, auth.session.user.id, auth.session.user.role);
    if ("error" in access) {
      return access.error;
    }
    if (!access.canManage) {
      return fail("Forbidden", 403);
    }

    const payload = updateProjectMemberSchema.parse(await request.json());

    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId },
      select: { id: true },
    });
    if (!membership) {
      return fail("Member not found", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextMember = await tx.projectMember.update({
        where: { id: membership.id },
        data: { role: payload.role },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              role: true,
              status: true,
            },
          },
        },
      });

      if (payload.role === "lead") {
        await tx.project.update({
          where: { id: projectId },
          data: { leadId: userId },
          select: { id: true },
        });
      } else if (access.project.leadId === userId) {
        await tx.project.update({
          where: { id: projectId },
          data: { leadId: null },
          select: { id: true },
        });
      }

      return nextMember;
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string; userId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId, userId } = await params;
  const access = await getProjectManagementAccess(projectId, auth.session.user.id, auth.session.user.role);
  if ("error" in access) {
    return access.error;
  }
  if (!access.canManage) {
    return fail("Forbidden", 403);
  }

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: { id: true },
  });
  if (!membership) {
    return fail("Member not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.delete({ where: { id: membership.id } });
    if (access.project.leadId === userId) {
      await tx.project.update({
        where: { id: projectId },
        data: { leadId: null },
        select: { id: true },
      });
    }
  });

  return ok({ success: true });
}
