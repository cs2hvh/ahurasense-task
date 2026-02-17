import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateProjectSchema } from "@/lib/validations/project";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;
    const payload = updateProjectSchema.parse(await request.json());

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, leadId: true, workspaceId: true },
    });

    if (!project) {
      return fail("Project not found", 404);
    }

    const [member, workspaceMember] = await Promise.all([
      prisma.projectMember.findFirst({
        where: { projectId, userId: auth.session.user.id },
        select: { role: true },
      }),
      prisma.workspaceMember.findFirst({
        where: { workspaceId: project.workspaceId, userId: auth.session.user.id },
        select: { role: true },
      }),
    ]);

    const isGlobalAdmin = auth.session.user.role === "admin";
    const isWorkspaceAdmin = workspaceMember?.role === "owner" || workspaceMember?.role === "admin";
    const canManage = isGlobalAdmin || isWorkspaceAdmin || member?.role === "lead";

    if (!canManage) {
      return fail("Forbidden", 403);
    }

    if (payload.leadId) {
      const nextLeadIsMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: payload.leadId,
        },
        select: { id: true },
      });
      if (!nextLeadIsMember) {
        return fail("Lead must be a project member", 400);
      }
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.startDate !== undefined ? { startDate: payload.startDate ? new Date(payload.startDate) : null } : {}),
        ...(payload.targetEndDate !== undefined
          ? {
              targetEndDate: payload.targetEndDate ? new Date(payload.targetEndDate) : null,
            }
          : {}),
        ...(payload.leadId !== undefined ? { leadId: payload.leadId } : {}),
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        type: true,
        status: true,
        startDate: true,
        targetEndDate: true,
        leadId: true,
      },
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
