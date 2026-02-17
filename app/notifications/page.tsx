import { redirect } from "next/navigation";

import { NotificationsCenter } from "@/components/notifications/notifications-center";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function NotificationsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="space-y-4 p-6">
      <NotificationsCenter
        initialNotifications={notifications.map((notification) => ({
          id: notification.id,
          type: notification.type,
          message: notification.message,
          isRead: notification.isRead,
          issueId: notification.issueId,
          createdAt: notification.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}


