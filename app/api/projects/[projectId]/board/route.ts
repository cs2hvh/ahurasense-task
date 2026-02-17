import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId } = await params;

  const member = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: auth.session.user.id,
    },
  });

  if (!member) {
    return fail("Forbidden", 403);
  }

  const statuses = await prisma.issueStatus.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });

  const issues = await prisma.issue.findMany({
    where: { projectId },
    include: {
      assignee: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
    orderBy: [{ status: { position: "asc" } }, { position: "asc" }],
  });

  return ok({ statuses, issues });
}


