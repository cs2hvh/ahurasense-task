import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createBoardStatusSchema, reorderBoardStatusesSchema } from "@/lib/validations/board";

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;
    const payload = createBoardStatusSchema.parse(await request.json());

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });
    if (!project) {
      return fail("Project not found", 404);
    }

    const [projectMember, workspaceMember] = await Promise.all([
      prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: auth.session.user.id,
        },
        select: { role: true },
      }),
      prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: auth.session.user.id,
        },
        select: { role: true },
      }),
    ]);

    const canManage =
      auth.session.user.role === "admin" ||
      workspaceMember?.role === "owner" ||
      workspaceMember?.role === "admin" ||
      projectMember?.role === "lead";

    if (!canManage) {
      return fail("Only project/workspace admins can create board columns", 403);
    }

    const existing = await prisma.issueStatus.findFirst({
      where: {
        projectId,
        name: payload.name,
      },
      select: { id: true },
    });

    if (existing) {
      return fail("Status already exists", 409);
    }

    const maxPosition = await prisma.issueStatus.aggregate({
      where: { projectId },
      _max: { position: true },
    });

    const status = await prisma.issueStatus.create({
      data: {
        projectId,
        name: payload.name,
        category: payload.category,
        color: payload.color,
        position: (maxPosition._max.position ?? -1) + 1,
      },
    });

    return ok(status, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;
    const payload = reorderBoardStatusesSchema.parse(await request.json());

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });
    if (!project) {
      return fail("Project not found", 404);
    }

    const [projectMember, workspaceMember] = await Promise.all([
      prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: auth.session.user.id,
        },
        select: { role: true },
      }),
      prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: auth.session.user.id,
        },
        select: { role: true },
      }),
    ]);

    const canManage =
      auth.session.user.role === "admin" ||
      workspaceMember?.role === "owner" ||
      workspaceMember?.role === "admin" ||
      projectMember?.role === "lead";

    if (!canManage) {
      return fail("Only project/workspace admins can reorder board columns", 403);
    }

    const statuses = await prisma.issueStatus.findMany({
      where: { projectId },
      select: { id: true },
    });

    const validIds = new Set(statuses.map((status) => status.id));
    const hasUnknown = payload.statuses.some((status) => !validIds.has(status.id));
    if (hasUnknown) {
      return fail("One or more statuses do not belong to this project", 400);
    }

    await prisma.$transaction(
      payload.statuses.map((status) =>
        prisma.issueStatus.update({
          where: { id: status.id },
          data: {
            position: status.position,
            ...(status.name ? { name: status.name } : {}),
            ...(status.category ? { category: status.category } : {}),
            ...(status.color !== undefined ? { color: status.color } : {}),
          },
        }),
      ),
    );

    const updated = await prisma.issueStatus.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}


