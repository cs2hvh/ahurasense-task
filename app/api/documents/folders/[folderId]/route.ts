import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateFolderSchema } from "@/lib/validations/document";

async function getFolderWithAccess(folderId: string, userId: string) {
  const folder = await prisma.documentFolder.findUnique({
    where: { id: folderId },
    select: {
      id: true,
      projectId: true,
      name: true,
      parentId: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
    },
  });

  if (!folder) return { error: fail("Folder not found", 404) } as const;

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: folder.projectId, userId },
  });

  if (!membership) return { error: fail("Forbidden", 403) } as const;

  return { folder, membership } as const;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { folderId } = await params;
    const result = await getFolderWithAccess(folderId, auth.session.user.id);
    if ("error" in result) return result.error;

    if (result.folder.isPublic) return fail("Cannot rename the Public folder", 400);

    const payload = updateFolderSchema.parse(await request.json());

    const updated = await prisma.documentFolder.update({
      where: { id: folderId },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.parentId !== undefined && { parentId: payload.parentId }),
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        updatedAt: true,
      },
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { folderId } = await params;
    const result = await getFolderWithAccess(folderId, auth.session.user.id);
    if ("error" in result) return result.error;

    if (result.folder.isPublic) return fail("Cannot delete the Public folder", 400);

    await prisma.documentFolder.delete({ where: { id: folderId } });

    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
