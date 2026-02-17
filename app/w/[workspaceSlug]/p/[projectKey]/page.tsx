import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}) {
  const { workspaceSlug, projectKey } = await params;

  const project = await prisma.project.findFirst({
    where: {
      key: projectKey,
      workspace: { slug: workspaceSlug },
    },
    include: {
      issues: true,
      sprints: true,
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{project.name}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Issues</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{project.issues.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Sprints</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{project.sprints.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Status</p>
          <p className="mt-2 text-2xl font-bold capitalize text-[var(--color-text-primary)]">{project.status}</p>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/w/${workspaceSlug}/p/${projectKey}/board`}
          className="inline-flex h-9 items-center border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
        >
          Open Board
        </Link>
        <Link
          href={`/w/${workspaceSlug}/p/${projectKey}/issues`}
          className="inline-flex h-9 items-center border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
        >
          View Issues
        </Link>
        <Link
          href={`/w/${workspaceSlug}/p/${projectKey}/sprints`}
          className="inline-flex h-9 items-center border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
        >
          Manage Sprints
        </Link>
        <Link
          href={`/w/${workspaceSlug}/p/${projectKey}/members`}
          className="inline-flex h-9 items-center border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
        >
          Manage Members
        </Link>
        <Link
          href={`/w/${workspaceSlug}/p/${projectKey}/settings`}
          className="inline-flex h-9 items-center border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
        >
          Project Settings
        </Link>
      </div>
    </main>
  );
}


