import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createFolderSchema } from "@/lib/validations/document";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { projectId } = await params;

    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    // Auto-create the "Public" folder if none exists
    const publicFolder = await prisma.documentFolder.findFirst({
      where: { projectId, isPublic: true },
    });
    if (!publicFolder) {
      await prisma.documentFolder.create({
        data: {
          projectId,
          name: "Public",
          isPublic: true,
          createdById: auth.session.user.id,
        },
      });
    }

    const folders = await prisma.documentFolder.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { documents: true, children: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return ok(folders);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { projectId } = await params;

    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    const payload = createFolderSchema.parse(await request.json());

    if (payload.parentId) {
      const parentFolder = await prisma.documentFolder.findFirst({
        where: { id: payload.parentId, projectId },
      });
      if (!parentFolder) return fail("Parent folder not found", 404);
    }

    const folder = await prisma.documentFolder.create({
      data: {
        projectId,
        name: payload.name,
        parentId: payload.parentId ?? null,
        createdById: auth.session.user.id,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok(folder, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
