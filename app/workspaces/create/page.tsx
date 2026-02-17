import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceCreateForm } from "@/components/forms/workspace-create-form";
import { Card } from "@/components/ui/card";
import { canCreateWorkspaceWithRole } from "@/lib/access";
import { getAuthSession } from "@/lib/session";

export default async function WorkspaceCreatePage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const canCreateWorkspace = canCreateWorkspaceWithRole(session.user.role);
  if (!canCreateWorkspace) {
    redirect("/workspaces");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Create Workspace</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Set up a workspace for your teams, projects, and shared workflow configuration.
        </p>
      </header>

      <WorkspaceCreateForm />

      <Card className="p-4 text-sm text-[var(--color-text-secondary)]">
        Need to switch instead?{" "}
        <Link href="/workspaces" className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
          Go back to workspace list
        </Link>
        .
      </Card>
    </main>
  );
}
