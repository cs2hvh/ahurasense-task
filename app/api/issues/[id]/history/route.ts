import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

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

  const history = await prisma.issueHistory.findMany({
    where: { issueId: id },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return ok(history);
}


