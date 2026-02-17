import { notFound, redirect } from "next/navigation";

import { WorkspaceMembersManager } from "@/components/workspace/workspace-members-manager";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function WorkspaceMembersPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const { workspaceSlug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              role: true,
              status: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!workspace) {
    notFound();
  }

  const currentMembership = workspace.members.find((member) => member.userId === session.user.id);
  const isGlobalAdmin = session.user.role === "admin";
  const canManage = isGlobalAdmin || currentMembership?.role === "owner" || currentMembership?.role === "admin";

  return (
    <main className="space-y-4 p-6">
      <header>
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Workspace Members</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{workspace.name}</p>
      </header>

      <WorkspaceMembersManager
        workspaceId={workspace.id}
        currentUserId={session.user.id}
        canManage={canManage}
        initialMembers={workspace.members.map((member) => ({
          userId: member.user.id,
          name: `${member.user.firstName} ${member.user.lastName}`,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl ?? null,
          workspaceRole: member.role,
          systemRole: member.user.role,
          status: member.user.status,
          joinedAt: member.joinedAt.toISOString(),
        }))}
      />
    </main>
  );
}
