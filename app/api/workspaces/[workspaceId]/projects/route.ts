import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { canBypassProjectMembership } from "@/lib/access";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validations/project";

export async function GET(_: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { workspaceId } = await params;

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: auth.session.user.id,
    },
  });

  if (!membership) {
    return fail("Forbidden", 403);
  }

  const canViewAllWorkspaceProjects = canBypassProjectMembership(auth.session.user.role, membership.role);

  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      ...(canViewAllWorkspaceProjects
        ? {}
        : {
            members: {
              some: {
                userId: auth.session.user.id,
              },
            },
          }),
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(projects);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { workspaceId } = await params;
    const payload = createProjectSchema.parse(await request.json());

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: auth.session.user.id,
      },
    });

    if (!membership) {
      return fail("Forbidden", 403);
    }

    const existing = await prisma.project.findUnique({
      where: { key: payload.key },
      select: { id: true },
    });

    if (existing) {
      return fail("Project key already exists", 409);
    }

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          workspaceId,
          key: payload.key,
          name: payload.name,
          description: payload.description,
          type: payload.type,
          leadId: payload.leadId ?? auth.session.user.id,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: created.id,
          userId: auth.session.user.id,
          role: "lead",
        },
      });

      await tx.issueStatus.createMany({
        data: [
          {
            projectId: created.id,
            name: "Backlog",
            category: "todo",
            color: "#6B6B73",
            position: 0,
          },
          {
            projectId: created.id,
            name: "Selected",
            category: "todo",
            color: "#A0A0A6",
            position: 1,
          },
          {
            projectId: created.id,
            name: "In Progress",
            category: "in_progress",
            color: "#0066FF",
            position: 2,
          },
          {
            projectId: created.id,
            name: "In Review",
            category: "in_progress",
            color: "#FF991F",
            position: 3,
          },
          {
            projectId: created.id,
            name: "QA",
            category: "in_progress",
            color: "#0052CC",
            position: 4,
          },
          {
            projectId: created.id,
            name: "Done",
            category: "done",
            color: "#00875A",
            position: 5,
          },
        ],
      });

      return created;
    });

    return ok(project, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}


