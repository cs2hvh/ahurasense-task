import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceCreateForm } from "@/components/forms/workspace-create-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { canBypassProjectMembership, canCreateWorkspaceWithRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function WorkspacesPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const canCreateWorkspace = canCreateWorkspaceWithRole(session.user.role);
  const canViewAllWorkspaceProjects = canBypassProjectMembership(session.user.role);

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      workspace: {
        include: {
          projects: {
            where: canViewAllWorkspaceProjects ? undefined : { members: { some: { userId: session.user.id } } },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  const totalProjects = memberships.reduce((sum, membership) => sum + membership.workspace.projects.length, 0);
  const totalMembers = memberships.reduce((sum, membership) => sum + membership.workspace._count.members, 0);
  const activeRole = memberships.find((membership) => membership.role === "owner" || membership.role === "admin");

  return (
    <main className="space-y-4 p-6">
      <Card className="border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-bg-secondary),var(--color-bg-tertiary))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Workspaces</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Select a workspace and open only projects you are invited to.
            </p>
          </div>
          {canCreateWorkspace ? (
            <Link
              href="/workspaces/create"
              className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
            >
              Open Dedicated Create Page
            </Link>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">My Workspaces</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{memberships.length}</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Projects</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{totalProjects}</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Members (Total)</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{totalMembers}</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Highest Access</p>
            <p className="mt-1 text-sm font-semibold uppercase text-[var(--color-accent-primary)]">
              {activeRole?.role ?? "member"}
            </p>
          </div>
        </div>
      </Card>

      <div className={canCreateWorkspace ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]" : "grid gap-4"}>
        <section className="grid gap-4 md:grid-cols-2">
          {memberships.map(({ workspace, role }) => (
            <Card key={workspace.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge className="normal-case" variant={role === "owner" || role === "admin" ? "info" : "default"}>
                  {role}
                </Badge>
                <span className="text-xs text-[var(--color-text-tertiary)]">{workspace._count.members} members</span>
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{workspace.name}</h2>
              <p className="mb-3 mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                {workspace.description || "No description"}
              </p>
              <div className="mb-4 text-xs text-[var(--color-text-tertiary)]">
                {workspace.projects.length} projects · Updated {new Date(workspace.updatedAt).toLocaleDateString()}
              </div>
              <Link
                className="inline-flex h-9 items-center border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
                href={`/w/${workspace.slug}`}
              >
                Open Workspace
              </Link>
            </Card>
          ))}

          {!memberships.length ? (
            <Card className="border-dashed p-6 text-sm text-[var(--color-text-secondary)]">
              No workspaces yet. Create your first workspace using the panel on the right.
            </Card>
          ) : null}
        </section>

        {canCreateWorkspace ? (
          <aside className="space-y-4">
            <WorkspaceCreateForm />
          </aside>
        ) : null}
      </div>
    </main>
  );
}



