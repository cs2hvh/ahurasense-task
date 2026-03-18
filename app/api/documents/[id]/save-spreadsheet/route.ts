import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildObjectKey, uploadObject, getPublicObjectUrl } from "@/lib/storage";

interface SheetPayload {
  name: string;
  data: (string | number | boolean | null)[][];
}

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
    const { sheets, downloadOnly } = body as { sheets: SheetPayload[]; downloadOnly?: boolean };

    if (!Array.isArray(sheets) || sheets.length === 0) {
      return fail("Sheets data is required", 400);
    }

    // Build workbook
    const workbook = XLSX.utils.book_new();
    for (const sheet of sheets) {
      const ws = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
    }

    const buffer = Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));

    // Download-only mode
    if (downloadOnly) {
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(document.title)}.xlsx"`,
        },
      });
    }

    // Save mode: upload to S3
    const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const key = buildObjectKey({
      scope: "document",
      userId: auth.session.user.id,
      originalFileName: `${document.title}.xlsx`,
      projectId: document.projectId,
    });

    await uploadObject({ key, contentType, body: buffer });
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
