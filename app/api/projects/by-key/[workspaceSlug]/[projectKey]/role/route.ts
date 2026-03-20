import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ workspaceSlug: string; projectKey: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { workspaceSlug, projectKey } = await params;

    const project = await prisma.project.findFirst({
      where: { key: projectKey, workspace: { slug: workspaceSlug } },
      select: { id: true },
    });

    if (!project) return fail("Project not found", 404);

    const member = await prisma.projectMember.findFirst({
      where: { projectId: project.id, userId: auth.session.user.id },
      select: { role: true },
    });

    return ok({ role: member?.role ?? null });
  } catch (error) {
    return handleRouteError(error);
  }
}
