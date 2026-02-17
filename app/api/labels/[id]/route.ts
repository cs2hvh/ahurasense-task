import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateLabelSchema } from "@/lib/validations/label";

async function canAccessLabel(labelId: string, userId: string) {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    include: {
      project: {
        select: {
          workspaceId: true,
        },
      },
    },
  });
  if (!label) {
    return { label: null, member: null, workspaceMember: null };
  }

  const [member, workspaceMember] = await Promise.all([
    prisma.projectMember.findFirst({
      where: { projectId: label.projectId, userId },
      select: { role: true },
    }),
    prisma.workspaceMember.findFirst({
      where: {
        workspaceId: label.project.workspaceId,
        userId,
      },
      select: { role: true },
    }),
  ]);
  return { label, member, workspaceMember };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const payload = updateLabelSchema.parse(await request.json());
    const { label, member, workspaceMember } = await canAccessLabel(id, auth.session.user.id);

    if (!label) {
      return fail("Label not found", 404);
    }

    const canManage =
      auth.session.user.role === "admin" ||
      workspaceMember?.role === "owner" ||
      workspaceMember?.role === "admin" ||
      member?.role === "lead";

    if (!canManage) {
      return fail("Only project/workspace admins can manage labels", 403);
    }

    const updated = await prisma.label.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.color ? { color: payload.color } : {}),
      },
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;
  const { label, member, workspaceMember } = await canAccessLabel(id, auth.session.user.id);

  if (!label) {
    return fail("Label not found", 404);
  }
  const canManage =
    auth.session.user.role === "admin" ||
    workspaceMember?.role === "owner" ||
    workspaceMember?.role === "admin" ||
    member?.role === "lead";
  if (!canManage) {
    return fail("Only project/workspace admins can manage labels", 403);
  }

  await prisma.label.delete({ where: { id } });
  return ok({ deleted: true });
}


