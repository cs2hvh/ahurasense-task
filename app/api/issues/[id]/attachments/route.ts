import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getPublicObjectUrl } from "@/lib/storage";
import { completeAttachmentSchema } from "@/lib/validations/upload";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const payload = completeAttachmentSchema.parse(await request.json());

    const issue = await prisma.issue.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });

    if (!issue) {
      return fail("Issue not found", 404);
    }

    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: issue.projectId,
        userId: auth.session.user.id,
      },
    });

    if (!projectMember) {
      return fail("Forbidden", 403);
    }

    const attachment = await prisma.issueAttachment.create({
      data: {
        issueId: issue.id,
        userId: auth.session.user.id,
        filename: payload.fileName,
        fileUrl: getPublicObjectUrl(payload.key),
        fileSize: BigInt(payload.fileSize),
        mimeType: payload.mimeType,
      },
    });

    await prisma.issueHistory.create({
      data: {
        issueId: issue.id,
        userId: auth.session.user.id,
        fieldName: "attachment",
        newValue: payload.fileName,
      },
    });

    return ok(attachment, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}


