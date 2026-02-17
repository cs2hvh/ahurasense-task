import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/app-shell/workspace-shell";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const { workspaceSlug } = await params;

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspace: { slug: workspaceSlug },
      userId: session.user.id,
    },
  });

  if (!member) {
    redirect("/workspaces");
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}


