import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createLabelSchema } from "@/lib/validations/label";

export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId } = await params;
  const member = await prisma.projectMember.findFirst({ where: { projectId, userId: auth.session.user.id } });
  if (!member) {
    return fail("Forbidden", 403);
  }

  const labels = await prisma.label.findMany({ where: { projectId }, orderBy: { name: "asc" } });
  return ok(labels);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;
    const payload = createLabelSchema.parse(await request.json());

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
      return fail("Only project/workspace admins can manage labels", 403);
    }

    const existing = await prisma.label.findFirst({ where: { projectId, name: payload.name } });
    if (existing) {
      return fail("Label already exists", 409);
    }

    const label = await prisma.label.create({ data: { projectId, name: payload.name, color: payload.color } });
    return ok(label, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}


