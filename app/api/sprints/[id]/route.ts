import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateSprintSchema } from "@/lib/validations/sprint";

async function canAccessSprint(sprintId: string, userId: string) {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId }, include: { project: true } });
  if (!sprint) {
    return { sprint: null, member: null };
  }

  const member = await prisma.projectMember.findFirst({ where: { projectId: sprint.projectId, userId } });
  return { sprint, member };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;
  const { sprint, member } = await canAccessSprint(id, auth.session.user.id);
  if (!sprint) {
    return fail("Sprint not found", 404);
  }
  if (!member) {
    return fail("Forbidden", 403);
  }

  const issues = await prisma.issue.findMany({
    where: { sprintId: sprint.id },
    include: { status: true, assignee: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return ok({ sprint, issues });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const payload = updateSprintSchema.parse(await request.json());
    const { sprint, member } = await canAccessSprint(id, auth.session.user.id);

    if (!sprint) {
      return fail("Sprint not found", 404);
    }
    if (!member) {
      return fail("Forbidden", 403);
    }

    const updated = await prisma.sprint.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.goal !== undefined ? { goal: payload.goal ?? null } : {}),
        ...(payload.startDate ? { startDate: new Date(payload.startDate) } : {}),
        ...(payload.endDate ? { endDate: new Date(payload.endDate) } : {}),
        ...(payload.status ? { status: payload.status } : {}),
      },
    });

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
  const { sprint, member } = await canAccessSprint(id, auth.session.user.id);

  if (!sprint) {
    return fail("Sprint not found", 404);
  }
  if (!member) {
    return fail("Forbidden", 403);
  }

  await prisma.$transaction([
    prisma.issue.updateMany({ where: { sprintId: id }, data: { sprintId: null } }),
    prisma.sprint.delete({ where: { id } }),
  ]);

  return ok({ deleted: true });
}


