import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateWorkspaceSchema } from "@/lib/validations/workspace";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { workspaceId } = await params;
    const payload = updateWorkspaceSchema.parse(await request.json());

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: auth.session.user.id,
      },
      select: { role: true },
    });

    const isGlobalAdmin = auth.session.user.role === "admin";
    const canManage = isGlobalAdmin || membership?.role === "owner" || membership?.role === "admin";
    if (!canManage) {
      return fail("Forbidden", 403);
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        ownerId: true,
      },
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

