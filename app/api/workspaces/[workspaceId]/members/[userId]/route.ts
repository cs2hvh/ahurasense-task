import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateWorkspaceMemberSchema } from "@/lib/validations/membership";

async function canManageWorkspace(workspaceId: string, userId: string, globalRole?: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  });

  return globalRole === "admin" || member?.role === "owner" || member?.role === "admin";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { workspaceId, userId } = await params;
    const hasPermission = await canManageWorkspace(workspaceId, auth.session.user.id, auth.session.user.role);
    if (!hasPermission) {
      return fail("Forbidden", 403);
    }

    const payload = updateWorkspaceMemberSchema.parse(await request.json());

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (!workspace) {
      return fail("Workspace not found", 404);
    }
    if (workspace.ownerId === userId) {
      return fail("Workspace owner role cannot be modified", 400);
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { id: true },
    });
    if (!membership) {
      return fail("Member not found", 404);
    }

    const updated = await prisma.workspaceMember.update({
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

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ workspaceId: string; userId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { workspaceId, userId } = await params;
  const hasPermission = await canManageWorkspace(workspaceId, auth.session.user.id, auth.session.user.role);
  if (!hasPermission) {
    return fail("Forbidden", 403);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (!workspace) {
    return fail("Workspace not found", 404);
  }
  if (workspace.ownerId === userId) {
    return fail("Workspace owner cannot be removed", 400);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { id: true },
  });
  if (!membership) {
    return fail("Member not found", 404);
  }

  await prisma.workspaceMember.delete({ where: { id: membership.id } });
  return ok({ success: true });
}
