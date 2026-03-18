import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
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
        fileUrl: true,
        mimeType: true,
        title: true,
        createdById: true,
        folder: { select: { isPublic: true } },
      },
    });

    if (!document) return fail("Document not found", 404);

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: document.projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    // Check document access: owner, public folder, or explicit grant
    const isOwner = document.createdById === auth.session.user.id;
    const isPublicFolder = !!document.folder?.isPublic;
    if (!isOwner && !isPublicFolder) {
      const access = await prisma.documentAccess.findUnique({
        where: { documentId_userId: { documentId: id, userId: auth.session.user.id } },
      });
      if (!access) return fail("You don't have access to this document", 403);
    }

    // Extract S3 key from file URL
    const urlObj = new URL(document.fileUrl);
    const key = urlObj.pathname.replace(/^\//, "");

    const s3Response = await getObject(key);
    if (!s3Response.Body) return fail("Failed to fetch document file", 502);

    const headers: Record<string, string> = {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(document.title)}"`,
      "Cache-Control": "private, max-age=300",
    };

    if (s3Response.ContentLength != null) {
      headers["Content-Length"] = String(s3Response.ContentLength);
    }

    // Transform the SDK stream to a web ReadableStream
    const webStream = s3Response.Body.transformToWebStream();
    return new NextResponse(webStream, { headers });
  } catch (error) {
    return handleRouteError(error);
  }
}
