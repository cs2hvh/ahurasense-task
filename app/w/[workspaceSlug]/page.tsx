import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCreateForm } from "@/components/forms/project-create-form";
import { Card } from "@/components/ui/card";
import { canBypassProjectMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function WorkspaceDashboardPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const session = await getAuthSession();
  const { workspaceSlug } = await params;
  const currentUserId = session?.user?.id ?? "";
  const canViewAllWorkspaceProjects = canBypassProjectMembership(session?.user?.role);

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      projects: {
        where: {
          status: "active",
          ...(canViewAllWorkspaceProjects ? {} : { members: { some: { userId: currentUserId } } }),
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!workspace) {
    notFound();
  }

  return (
    <main className="space-y-6 p-6">
      <header>
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{workspace.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{workspace.description || "No description"}</p>
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/w/${workspace.slug}/projects`} className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">
            Projects
          </Link>
          <Link href={`/w/${workspace.slug}/projects/create`} className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">
            Create Project
          </Link>
          <Link href={`/w/${workspace.slug}/settings`} className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">
            Workspace Settings
          </Link>
          <Link href={`/w/${workspace.slug}/members`} className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">
            Members
          </Link>
        </div>
      </header>

      <ProjectCreateForm workspaceId={workspace.id} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspace.projects.map((project) => (
          <Card key={project.id} className="flex flex-col gap-4 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">{project.key}</p>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{project.name}</h2>
            </div>
            <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)]">{project.description || "No description"}</p>
            <Link
              href={`/w/${workspace.slug}/p/${project.key}/board`}
              className="inline-flex h-9 items-center border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
            >
              Open Board
            </Link>
          </Card>
        ))}
      </section>
    </main>
  );
}


