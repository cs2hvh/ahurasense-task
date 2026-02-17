import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { moveIssueSchema } from "@/lib/validations/issue";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const payload = moveIssueSchema.parse(await request.json());

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!issue) {
      return fail("Issue not found", 404);
    }

    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: issue.projectId,
        userId: auth.session.user.id,
      },
    });

    if (!member) {
      return fail("Forbidden", 403);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (payload.statusId && payload.statusId !== issue.statusId) {
        await tx.issue.updateMany({
          where: {
            projectId: issue.projectId,
            statusId: issue.statusId,
            position: { gt: issue.position ?? 0 },
          },
          data: {
            position: { decrement: 1 },
          },
        });

        await tx.issue.updateMany({
          where: {
            projectId: issue.projectId,
            statusId: payload.statusId,
            position: { gte: payload.position },
          },
          data: {
            position: { increment: 1 },
          },
        });
      }

      const next = await tx.issue.update({
        where: { id },
        data: {
          statusId: payload.statusId ?? issue.statusId,
          sprintId: payload.sprintId === null ? null : payload.sprintId ?? issue.sprintId,
          position: payload.position,
        },
      });

      await tx.issueHistory.create({
        data: {
          issueId: next.id,
          userId: auth.session.user.id,
          fieldName: "move",
          oldValue: `${issue.statusId}:${issue.position ?? 0}`,
          newValue: `${next.statusId}:${next.position ?? 0}`,
        },
      });

      return next;
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}


