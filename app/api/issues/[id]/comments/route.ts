import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createCommentSchema } from "@/lib/validations/comment";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;
  const issue = await prisma.issue.findUnique({ where: { id }, select: { projectId: true } });
  if (!issue) {
    return fail("Issue not found", 404);
  }

  const member = await prisma.projectMember.findFirst({ where: { projectId: issue.projectId, userId: auth.session.user.id } });
  if (!member) {
    return fail("Forbidden", 403);
  }

  const comments = await prisma.issueComment.findMany({
    where: { issueId: id },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return ok(comments);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const payload = createCommentSchema.parse(await request.json());

    const issue = await prisma.issue.findUnique({ where: { id }, select: { id: true, projectId: true } });
    if (!issue) {
      return fail("Issue not found", 404);
    }

    const member = await prisma.projectMember.findFirst({ where: { projectId: issue.projectId, userId: auth.session.user.id } });
    if (!member) {
      return fail("Forbidden", 403);
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.issueComment.create({
        data: {
          issueId: id,
          userId: auth.session.user.id,
          content: payload.content,
        },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      });

      await tx.issueHistory.create({
        data: {
          issueId: id,
          userId: auth.session.user.id,
          fieldName: "comment",
          newValue: "Added comment",
        },
      });

      return created;
    });

    const watchers = await prisma.issueWatcher.findMany({ where: { issueId: id }, select: { userId: true } });
    if (watchers.length) {
      const notificationsData = watchers
        .filter((watcher) => watcher.userId !== auth.session.user.id)
        .map((watcher) => ({
          userId: watcher.userId,
          issueId: id,
          type: "commented" as const,
          message: `${auth.session.user.firstName} commented on an issue you watch`,
        }));

      if (!notificationsData.length) {
        return ok(comment, { status: 201 });
      }

      await prisma.notification.createMany({
        data: notificationsData,
        skipDuplicates: true,
      });
    }

    return ok(comment, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}


