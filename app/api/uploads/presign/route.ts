import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildObjectKey, createUploadUrl } from "@/lib/storage";
import { createUploadUrlSchema, validateUploadRules } from "@/lib/validations/upload";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const payload = createUploadUrlSchema.parse(await request.json());

    validateUploadRules(payload.scope, payload.contentType, payload.fileSize);

    if (payload.scope === "attachment") {
      if (!payload.issueId) {
        return fail("issueId is required for attachment uploads", 400);
      }

      const issue = await prisma.issue.findUnique({
        where: { id: payload.issueId },
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
    }

    const key = buildObjectKey({
      scope: payload.scope,
      userId: auth.session.user.id,
      originalFileName: payload.fileName,
      issueId: payload.issueId,
    });

    const signed = await createUploadUrl({
      key,
      contentType: payload.contentType,
    });

    return ok({
      key,
      uploadUrl: signed.uploadUrl,
      fileUrl: signed.fileUrl,
      expiresIn: 900,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


