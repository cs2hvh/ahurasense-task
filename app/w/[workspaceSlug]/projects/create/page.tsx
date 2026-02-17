import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCreateForm } from "@/components/forms/project-create-form";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceProjectCreatePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!workspace) {
    notFound();
  }

  return (
    <main className="space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Create Project</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{workspace.name}</p>
      </header>

      <ProjectCreateForm workspaceId={workspace.id} />

      <Card className="p-4 text-sm text-[var(--color-text-secondary)]">
        Looking for existing projects?{" "}
        <Link
          href={`/w/${workspace.slug}/projects`}
          className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]"
        >
          Open project list
        </Link>
        .
      </Card>
    </main>
  );
}
