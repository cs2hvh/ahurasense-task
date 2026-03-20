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

    const userId = auth.session.user.id;

    // Fetch all folders for the project to build the parent chain
    const allFolders = await prisma.documentFolder.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Find folders that directly contain documents shared with the user
    const foldersWithSharedDocs = await prisma.document.findMany({
      where: {
        projectId,
        folderId: { not: null },
        accessList: { some: { userId } },
      },
      select: { folderId: true },
      distinct: ["folderId"],
    });
    const sharedDocFolderIds = new Set(
      foldersWithSharedDocs.map((d) => d.folderId).filter(Boolean) as string[],
    );

    // Determine directly visible folders
    const directlyVisible = new Set<string>();
    for (const f of allFolders) {
      if (f.isPublic || f.createdById === userId || sharedDocFolderIds.has(f.id)) {
        directlyVisible.add(f.id);
      }
    }

    // Walk up parent chains — include ALL ancestor folders so the user
    // can navigate to shared docs inside deeply nested folders
    const folderById = new Map(allFolders.map((f) => [f.id, f]));
    const visible = new Set(directlyVisible);
    for (const folderId of directlyVisible) {
      let current = folderById.get(folderId);
      while (current?.parentId) {
        if (visible.has(current.parentId)) break;
        visible.add(current.parentId);
        current = folderById.get(current.parentId);
      }
    }

    // Count visible documents per folder
    const visibleDocCounts = await prisma.document.groupBy({
      by: ["folderId"],
      where: {
        projectId,
        folderId: { in: [...visible] },
        issueId: null,
        OR: [
          { createdById: userId },
          { accessList: { some: { userId } } },
          { folder: { isPublic: true } },
        ],
      },
      _count: { id: true },
    });
    const countByFolder = new Map(
      visibleDocCounts.map((c) => [c.folderId, c._count.id]),
    );

    // Count visible children per folder
    const childrenCountMap = new Map<string, number>();
    for (const f of allFolders) {
      if (f.parentId && visible.has(f.parentId) && visible.has(f.id)) {
        childrenCountMap.set(
          f.parentId,
          (childrenCountMap.get(f.parentId) || 0) + 1,
        );
      }
    }

    const result = allFolders
      .filter((f) => visible.has(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        isPublic: f.isPublic,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        _count: {
          documents: countByFolder.get(f.id) || 0,
          children: childrenCountMap.get(f.id) || 0,
        },
        createdBy: f.createdBy,
      }));

    return ok(result);
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
