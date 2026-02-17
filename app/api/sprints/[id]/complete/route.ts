import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { completeSprintSchema } from "@/lib/validations/sprint";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const payload = completeSprintSchema.parse(await request.json());

    const sprint = await prisma.sprint.findUnique({ where: { id } });
    if (!sprint) {
      return fail("Sprint not found", 404);
    }

    const member = await prisma.projectMember.findFirst({ where: { projectId: sprint.projectId, userId: auth.session.user.id } });
    if (!member) {
      return fail("Forbidden", 403);
    }

    if (sprint.status !== "active") {
      return fail("Only active sprint can be completed", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.sprint.update({ where: { id }, data: { status: "completed" } });

      if (payload.nextSprintId !== undefined) {
        const targetId = payload.nextSprintId || null;

        if (targetId) {
          const next = await tx.sprint.findUnique({ where: { id: targetId } });
          if (!next || next.projectId !== sprint.projectId) {
            throw new Error("nextSprintId is invalid for this project");
          }
        }

        await tx.issue.updateMany({
          where: {
            sprintId: id,
            status: {
              category: { not: "done" },
            },
          },
          data: {
            sprintId: targetId,
          },
        });
      }
    });

    return ok({ completed: true });
  } catch (error) {
    return handleRouteError(error);
  }
}


