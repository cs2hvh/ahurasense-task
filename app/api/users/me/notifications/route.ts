import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: auth.session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok(notifications);
}


