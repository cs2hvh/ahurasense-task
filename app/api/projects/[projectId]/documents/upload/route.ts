import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { validateDocumentUpload } from "@/lib/validations/document";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    // JSON body: file already uploaded via presigned URL
    const body = await request.json();
    const { fileName, fileKey, fileUrl, fileSize, mimeType, folderId } = body as {
      fileName: string;
      fileKey: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      folderId?: string | null;
    };

    if (!fileName || !fileKey || !fileUrl || !fileSize || !mimeType) {
      return fail("Missing required fields", 400);
    }

    validateDocumentUpload(mimeType, fileSize);

    if (folderId) {
      const folder = await prisma.documentFolder.findFirst({
        where: { id: folderId, projectId },
      });
      if (!folder) return fail("Folder not found", 404);
    }

    const title = fileName.replace(/\.(docx?|doc|pptx?|ppt)$/i, "");

    const document = await prisma.document.create({
      data: {
        projectId,
        title,
        fileUrl,
        fileKey,
        fileSize,
        mimeType,
        createdById: auth.session.user.id,
        folderId: folderId || null,
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
