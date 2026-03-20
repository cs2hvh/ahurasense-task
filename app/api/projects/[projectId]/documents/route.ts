import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createDocumentSchema } from "@/lib/validations/document";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const view = searchParams.get("view"); // "shared" | "mine" | null (all)
    const search = searchParams.get("q")?.trim();

    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    const userId = auth.session.user.id;

    // Build the where clause based on the view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let accessFilter: any;

    if (view === "shared") {
      // Only show docs explicitly shared with me (not created by me)
      accessFilter = {
        createdById: { not: userId },
        accessList: { some: { userId } },
      };
    } else if (view === "mine") {
      // Only show docs I created
      accessFilter = { createdById: userId };
    } else {
      // Show all visible docs
      const publicFolderIds = await prisma.documentFolder.findMany({
        where: { projectId, isPublic: true },
        select: { id: true },
      });
      const publicIds = publicFolderIds.map((f) => f.id);

      accessFilter = {
        OR: [
          { createdById: userId },
          { accessList: { some: { userId } } },
          { folderId: { in: publicIds } },
        ],
      };
    }

    // Folder filter — for "shared" view, show all folders (flat)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let folderFilter: any = {};
    if (view !== "shared") {
      if (folderId === "root") {
        folderFilter = { folderId: null };
      } else if (folderId) {
        folderFilter = { folderId };
      }
    }

    // Search filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let searchFilter: any = {};
    if (search) {
      searchFilter = {
        title: { contains: search },
      };
    }

    const documents = await prisma.document.findMany({
      where: {
        projectId,
        issueId: null,
        ...folderFilter,
        ...accessFilter,
        ...searchFilter,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        folderId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        folder: { select: { id: true, name: true, isPublic: true } },
        accessList: {
          select: {
            userId: true,
            accessLevel: true,
          },
        },
        _count: { select: { versions: true } },
      },
    });

    return ok(documents.map((d) => ({ ...d, fileSize: Number(d.fileSize) })));
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

    const payload = createDocumentSchema.parse(await request.json());

    const document = await prisma.document.create({
      data: {
        projectId,
        title: payload.title,
        fileUrl: payload.fileUrl,
        fileKey: payload.fileKey,
        fileSize: payload.fileSize,
        mimeType: payload.mimeType,
        createdById: auth.session.user.id,
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok({ ...document, fileSize: Number(document.fileSize) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
