import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { addProjectMemberSchema } from "@/lib/validations/membership";

async function getProjectAccess(projectId: string, userId: string, globalRole?: string) {
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
  const canView = isGlobalAdmin || isWorkspaceAdmin || Boolean(projectMember);
  const canManage = isGlobalAdmin || isWorkspaceAdmin || projectMember?.role === "lead";

  return {
    project,
    canView,
    canManage,
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId } = await params;
  const access = await getProjectAccess(projectId, auth.session.user.id, auth.session.user.role);
  if ("error" in access) {
    return access.error;
  }
  if (!access.canView) {
    return fail("Forbidden", 403);
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId },
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
    orderBy: { joinedAt: "asc" },
  });

  return ok(members);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;
    const access = await getProjectAccess(projectId, auth.session.user.id, auth.session.user.role);
    if ("error" in access) {
      return access.error;
    }
    if (!access.canManage) {
      return fail("Forbidden", 403);
    }

    const payload = addProjectMemberSchema.parse(await request.json());

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: access.project.workspaceId,
        userId: payload.userId,
      },
      select: { id: true },
    });
    if (!workspaceMember) {
      return fail("User must be a workspace member before adding to project", 400);
    }

    const existing = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: payload.userId,
      },
      select: { id: true },
    });

    const member = await prisma.$transaction(async (tx) => {
      const updatedMember = existing
        ? await tx.projectMember.update({
            where: { id: existing.id },
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
          })
        : await tx.projectMember.create({
            data: {
              projectId,
              userId: payload.userId,
              role: payload.role,
            },
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
          data: { leadId: payload.userId },
          select: { id: true },
        });
      } else {
        const projectState = await tx.project.findUnique({
          where: { id: projectId },
          select: { leadId: true },
        });
        if (projectState?.leadId === payload.userId) {
          await tx.project.update({
            where: { id: projectId },
            data: { leadId: null },
            select: { id: true },
          });
        }
      }

      return updatedMember;
    });

    return ok(member, { status: existing ? 200 : 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
