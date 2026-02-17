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
  const member = await prisma.projectMember.findFirst({ where: { projectId, userId: auth.session.user.id } });
  if (!member) {
    return fail("Forbidden", 403);
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const type = request.nextUrl.searchParams.get("type");
  const priority = request.nextUrl.searchParams.get("priority");
  const issueType = ["story", "task", "bug", "epic", "subtask"].includes(type ?? "") ? (type as "story" | "task" | "bug" | "epic" | "subtask") : undefined;
  const issuePriority = ["lowest", "low", "medium", "high", "highest"].includes(priority ?? "")
    ? (priority as "lowest" | "low" | "medium" | "high" | "highest")
    : undefined;

  const issues = await prisma.issue.findMany({
    where: {
      projectId,
      ...(q
        ? {
            OR: [{ title: { contains: q } }, { key: { contains: q } }, { description: { contains: q } }],
          }
        : {}),
      ...(issueType ? { type: issueType } : {}),
      ...(issuePriority ? { priority: issuePriority } : {}),
    },
    include: {
      assignee: { select: { firstName: true, lastName: true } },
      status: true,
      sprint: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return ok(issues);
}


