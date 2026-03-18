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

    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    // Build access filter: show docs the user owns, docs in public folders, or docs shared with them
    const sharedDocIds = await prisma.documentAccess.findMany({
      where: { userId: auth.session.user.id },
      select: { documentId: true },
    });
    const sharedIds = sharedDocIds.map((d) => d.documentId);

    const publicFolderIds = await prisma.documentFolder.findMany({
      where: { projectId, isPublic: true },
      select: { id: true },
    });
    const publicIds = publicFolderIds.map((f) => f.id);

    const documents = await prisma.document.findMany({
      where: {
        projectId,
        folderId: folderId === "root" ? null : folderId ?? undefined,
        issueId: null,
        OR: [
          { createdById: auth.session.user.id },
          { id: { in: sharedIds } },
          { folderId: { in: publicIds } },
        ],
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
        folder: { select: { isPublic: true } },
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
