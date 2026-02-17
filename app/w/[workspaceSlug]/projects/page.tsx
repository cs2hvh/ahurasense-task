import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { canBypassProjectMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";

export default async function WorkspaceProjectsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await getAuthSession();
  const { workspaceSlug } = await params;
  const currentUserId = session?.user?.id ?? "";
  const canViewAllWorkspaceProjects = canBypassProjectMembership(session?.user?.role);

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      projects: {
        where: canViewAllWorkspaceProjects ? undefined : { members: { some: { userId: currentUserId } } },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { issues: true, sprints: true },
          },
        },
      },
    },
  });

  if (!workspace) {
    notFound();
  }

  return (
    <main className="space-y-4 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Projects</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{workspace.name}</p>
        </div>
        <Link
          href={`/w/${workspace.slug}/projects/create`}
          className="inline-flex h-9 items-center border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
        >
          Create Project
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspace.projects.map((project) => (
          <Card key={project.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">{project.key}</p>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{project.name}</h2>
              </div>
              <span className="border border-[var(--color-border)] px-2 py-1 text-[10px] uppercase text-[var(--color-text-secondary)]">
                {project.status.replace("_", " ")}
              </span>
            </div>

            <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
              {project.description || "No description"}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
              <span>{project._count.issues} issues</span>
              <span>|</span>
              <span>{project._count.sprints} sprints</span>
              <span>|</span>
              <span>{project.type.replace("_", " ")}</span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Link
                href={`/w/${workspace.slug}/p/${project.key}/board`}
                className="inline-flex h-8 items-center border border-[var(--color-border)] px-3 text-xs hover:bg-[var(--color-bg-tertiary)]"
              >
                Open Board
              </Link>
              <Link
                href={`/w/${workspace.slug}/p/${project.key}/settings`}
                className="inline-flex h-8 items-center border border-[var(--color-border)] px-3 text-xs hover:bg-[var(--color-bg-tertiary)]"
              >
                Settings
              </Link>
            </div>
          </Card>
        ))}
      </section>

      {!workspace.projects.length ? (
        <Card className="p-6 text-sm text-[var(--color-text-secondary)]">No projects yet. Create your first project.</Card>
      ) : null}
    </main>
  );
}
