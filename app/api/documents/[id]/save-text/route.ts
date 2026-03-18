import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildObjectKey, uploadObject, getPublicObjectUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

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
        mimeType: true,
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
    const { content } = body as { content: string };

    if (typeof content !== "string") {
      return fail("Content is required", 400);
    }

    const buffer = Buffer.from(content, "utf-8");

    // Determine extension from current MIME type
    const extMap: Record<string, string> = {
      "text/plain": ".txt",
      "text/markdown": ".md",
      "text/csv": ".csv",
      "text/html": ".html",
      "text/css": ".css",
      "text/javascript": ".js",
      "application/json": ".json",
      "application/xml": ".xml",
      "text/xml": ".xml",
    };
    const ext = extMap[document.mimeType] ?? ".txt";

    const key = buildObjectKey({
      scope: "document",
      userId: auth.session.user.id,
      originalFileName: `${document.title}${ext}`,
      projectId: document.projectId,
    });

    await uploadObject({ key, contentType: document.mimeType, body: buffer });
    const fileUrl = getPublicObjectUrl(key);

    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const [version] = await prisma.$transaction([
      prisma.documentVersion.create({
        data: {
          documentId: id,
          version: nextVersion,
          fileKey: key,
          fileUrl,
          fileSize: buffer.length,
          createdById: auth.session.user.id,
        },
      }),
      prisma.document.update({
        where: { id },
        data: {
          fileKey: key,
          fileUrl,
          fileSize: buffer.length,
        },
      }),
    ]);

    return ok({ version: version.version, fileUrl });
  } catch (error) {
    return handleRouteError(error);
  }
}
