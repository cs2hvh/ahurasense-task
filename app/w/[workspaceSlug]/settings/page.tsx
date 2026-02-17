import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkspaceSettingsForm } from "@/components/workspace/workspace-settings-form";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      _count: {
        select: {
          members: true,
          projects: true,
        },
      },
    },
  });

  if (!workspace) {
    notFound();
  }

  return (
    <main className="space-y-4 p-6">
      <WorkspaceSettingsForm
        workspaceId={workspace.id}
        initial={{
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
        }}
      />

      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Workspace Overview</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[var(--color-text-primary)] md:grid-cols-4">
          <div className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
            <p className="text-xs text-[var(--color-text-tertiary)]">Members</p>
            <p className="mt-1 text-lg font-semibold">{workspace._count.members}</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
            <p className="text-xs text-[var(--color-text-tertiary)]">Projects</p>
            <p className="mt-1 text-lg font-semibold">{workspace._count.projects}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link href={`/w/${workspace.slug}/projects`} className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-bg-tertiary)]">
            View Projects
          </Link>
          <Link href={`/w/${workspace.slug}/members`} className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-bg-tertiary)]">
            Manage Members
          </Link>
          <Link href={`/w/${workspace.slug}`} className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-bg-tertiary)]">
            Open Workspace
          </Link>
        </div>
      </Card>
    </main>
  );
}
