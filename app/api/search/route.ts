import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

  if (!q) {
    return ok({ issues: [], projects: [], users: [] });
  }

  const workspaceIds = await prisma.workspaceMember.findMany({
    where: { userId: auth.session.user.id },
    select: { workspaceId: true },
  });

  const projectIds = await prisma.projectMember.findMany({
    where: { userId: auth.session.user.id },
    select: { projectId: true },
  });

  const [issues, projects, users] = await Promise.all([
    prisma.issue.findMany({
      where: {
        projectId: { in: projectIds.map((item) => item.projectId) },
        OR: [{ title: { contains: q } }, { key: { contains: q } }],
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        key: true,
        title: true,
        type: true,
        priority: true,
        project: {
          select: {
            key: true,
            workspace: {
              select: { slug: true },
            },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: {
        workspaceId: { in: workspaceIds.map((item) => item.workspaceId) },
        OR: [{ name: { contains: q } }, { key: { contains: q } }],
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        key: true,
        name: true,
        workspace: {
          select: { slug: true },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        workspaceMemberships: {
          some: {
            workspaceId: { in: workspaceIds.map((item) => item.workspaceId) },
          },
        },
        OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }],
      },
      take: limit,
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
    }),
  ]);

  return ok({ issues, projects, users });
}


