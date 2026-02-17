import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ projectId: string; statusId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { projectId, statusId } = await params;

    const [status, project] = await Promise.all([
      prisma.issueStatus.findFirst({
        where: {
          id: statusId,
          projectId,
        },
        select: {
          id: true,
        },
      }),
      prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, workspaceId: true, leadId: true },
      }),
    ]);

    if (!project) {
      return fail("Project not found", 404);
    }

    const [workspaceMembership, projectMembership] = await Promise.all([
      prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: auth.session.user.id,
        },
        select: { role: true },
      }),
      prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: auth.session.user.id,
        },
        select: { role: true },
      }),
    ]);

    const canDelete =
      auth.session.user.role === "admin" ||
      workspaceMembership?.role === "owner" ||
      workspaceMembership?.role === "admin" ||
      projectMembership?.role === "lead";

    if (!canDelete) {
      return fail("Only project/workspace admins can delete board columns", 403);
    }

    if (!status) {
      return fail("Status not found", 404);
    }

    const [issueCount, statusCount] = await Promise.all([
      prisma.issue.count({
        where: {
          projectId,
          statusId,
        },
      }),
      prisma.issueStatus.count({
        where: { projectId },
      }),
    ]);

    if (statusCount <= 1) {
      return fail("Project must have at least one status column", 400);
    }

    if (issueCount > 0) {
      return fail("Move issues out of this column before deleting it", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.issueStatus.delete({
        where: { id: statusId },
      });

      const remaining = await tx.issueStatus.findMany({
        where: { projectId },
        orderBy: { position: "asc" },
        select: { id: true },
      });

      for (let index = 0; index < remaining.length; index += 1) {
        await tx.issueStatus.update({
          where: { id: remaining[index].id },
          data: { position: index },
          select: { id: true },
        });
      }
    });

    return ok({ success: true, statusId });
  } catch (error) {
    return handleRouteError(error);
  }
}
