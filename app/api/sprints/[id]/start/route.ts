import { requireUser } from "@/lib/api-auth";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;
  const sprint = await prisma.sprint.findUnique({ where: { id } });
  if (!sprint) {
    return fail("Sprint not found", 404);
  }

  const member = await prisma.projectMember.findFirst({ where: { projectId: sprint.projectId, userId: auth.session.user.id } });
  if (!member) {
    return fail("Forbidden", 403);
  }

  if (sprint.status !== "planning") {
    return fail("Only planning sprint can be started", 400);
  }

  await prisma.sprint.update({ where: { id }, data: { status: "active" } });
  return ok({ started: true });
}


