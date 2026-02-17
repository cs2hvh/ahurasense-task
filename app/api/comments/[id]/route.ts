import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateCommentSchema } from "@/lib/validations/comment";

async function getScopedComment(commentId: string) {
  return prisma.issueComment.findUnique({
    where: { id: commentId },
    include: { issue: { select: { projectId: true } } },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const payload = updateCommentSchema.parse(await request.json());

    const comment = await getScopedComment(id);
    if (!comment) {
      return fail("Comment not found", 404);
    }

    const member = await prisma.projectMember.findFirst({ where: { projectId: comment.issue.projectId, userId: auth.session.user.id } });
    if (!member || comment.userId !== auth.session.user.id) {
      return fail("Forbidden", 403);
    }

    const updated = await prisma.issueComment.update({ where: { id }, data: { content: payload.content } });
    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;
  const comment = await getScopedComment(id);
  if (!comment) {
    return fail("Comment not found", 404);
  }

  const member = await prisma.projectMember.findFirst({ where: { projectId: comment.issue.projectId, userId: auth.session.user.id } });
  if (!member || comment.userId !== auth.session.user.id) {
    return fail("Forbidden", 403);
  }

  await prisma.issueComment.delete({ where: { id } });
  return ok({ deleted: true });
}


