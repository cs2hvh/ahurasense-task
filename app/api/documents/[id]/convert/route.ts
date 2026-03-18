import { NextRequest, NextResponse } from "next/server";
import htmlToDocx from "html-to-docx";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

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
      select: { id: true, projectId: true, title: true },
    });

    if (!document) return fail("Document not found", 404);

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: document.projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    const body = await request.json();
    const htmlContent = body.html;

    if (typeof htmlContent !== "string" || htmlContent.length === 0) {
      return fail("HTML content is required", 400);
    }

    if (htmlContent.length > 10 * 1024 * 1024) {
      return fail("Content is too large", 400);
    }

    const docxBuffer = await htmlToDocx(htmlContent, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      header: false,
    });

    const arrayBuffer = docxBuffer instanceof Blob
      ? await docxBuffer.arrayBuffer()
      : docxBuffer;

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.title)}.docx"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
