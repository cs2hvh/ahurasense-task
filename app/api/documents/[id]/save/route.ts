import { NextRequest } from "next/server";
import htmlToDocx from "html-to-docx";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildObjectKey, uploadObject, getPublicObjectUrl } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        projectId: true,
        title: true,
        fileUrl: true,
        fileKey: true,
        fileSize: true,
        createdById: true,
        folder: { select: { isPublic: true } },
      },
    });

    if (!document) return fail("Document not found", 404);

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: document.projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    // Check edit permission
    const isOwner = document.createdById === auth.session.user.id;
    if (!isOwner) {
      const access = await prisma.documentAccess.findUnique({
        where: { documentId_userId: { documentId: id, userId: auth.session.user.id } },
        select: { accessLevel: true },
      });
      if (access?.accessLevel !== "editor") {
        return fail("You don't have edit access to this document", 403);
      }
    }

    const body = await request.json();
    const htmlContent = body.html;

    if (typeof htmlContent !== "string" || htmlContent.length === 0) {
      return fail("HTML content is required", 400);
    }

    if (htmlContent.length > 10 * 1024 * 1024) {
      return fail("Content is too large", 400);
    }

    // Convert HTML to .docx
    const docxResult = await htmlToDocx(htmlContent, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      header: false,
    });

    const buffer = docxResult instanceof Blob
      ? Buffer.from(await docxResult.arrayBuffer())
      : Buffer.from(docxResult as ArrayBuffer);

    // Upload to S3
    const contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const key = buildObjectKey({
      scope: "document",
      userId: auth.session.user.id,
      originalFileName: `${document.title}.docx`,
      projectId: document.projectId,
    });

    await uploadObject({ key, contentType, body: buffer });
    const fileUrl = getPublicObjectUrl(key);

    // Get the next version number
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    // Save old file as version, update document with new file
    const [version] = await prisma.$transaction([
      prisma.documentVersion.create({
        data: {
          documentId: id,
          version: nextVersion,
          fileUrl: document.fileUrl,
          fileKey: document.fileKey,
          fileSize: document.fileSize,
          createdById: auth.session.user.id,
        },
      }),
      prisma.document.update({
        where: { id },
        data: {
          fileUrl,
          fileKey: key,
          fileSize: buffer.length,
        },
      }),
    ]);

    return ok({ version: version.version });
  } catch (error) {
    return handleRouteError(error);
  }
}
