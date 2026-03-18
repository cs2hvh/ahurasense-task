import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createDocumentSchema } from "@/lib/validations/document";

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
        fileUrl: true,
        fileKey: true,
        fileSize: true,
        mimeType: true,
      },
    });

    if (!document) return fail("Document not found", 404);

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: document.projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    const payload = createDocumentSchema.pick({
      fileKey: true,
      fileUrl: true,
      fileSize: true,
    }).parse(await request.json());

    // Get the next version number
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    // Save the current file as a version before updating
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
          fileUrl: payload.fileUrl,
          fileKey: payload.fileKey,
          fileSize: payload.fileSize,
        },
      }),
    ]);

    return ok({ version: version.version }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
