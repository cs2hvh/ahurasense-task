import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function PATCH() {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const result = await prisma.notification.updateMany({ where: { userId: auth.session.user.id, isRead: false }, data: { isRead: true } });
  return ok(result);
}


