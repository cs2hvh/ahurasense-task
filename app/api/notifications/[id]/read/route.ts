import { requireUser } from "@/lib/api-auth";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== auth.session.user.id) {
    return fail("Notification not found", 404);
  }

  const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return ok(updated);
}


