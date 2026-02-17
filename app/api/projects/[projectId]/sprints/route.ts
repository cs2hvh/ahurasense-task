import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSprintSchema } from "@/lib/validations/sprint";

export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId } = await params;
  const member = await prisma.projectMember.findFirst({ where: { projectId, userId: auth.session.user.id } });
  if (!member) {
    return fail("Forbidden", 403);
  }

  const sprints = await prisma.sprint.findMany({ where: { projectId }, orderBy: [{ status: "asc" }, { startDate: "desc" }] });
  return ok(sprints);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;
    const payload = createSprintSchema.parse(await request.json());

    const member = await prisma.projectMember.findFirst({ where: { projectId, userId: auth.session.user.id } });
    if (!member) {
      return fail("Forbidden", 403);
    }

    const sprint = await prisma.sprint.create({
      data: {
        projectId,
        name: payload.name,
        goal: payload.goal,
        startDate: new Date(payload.startDate),
        endDate: new Date(payload.endDate),
        status: "planning",
      },
    });

    return ok(sprint, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}


