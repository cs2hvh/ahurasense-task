import Link from "next/link";
import { notFound } from "next/navigation";

import { SprintCreateForm } from "@/components/sprints/sprint-create-form";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function SprintsPage({ params }: { params: Promise<{ workspaceSlug: string; projectKey: string }> }) {
  const { workspaceSlug, projectKey } = await params;

  const project = await prisma.project.findFirst({
    where: {
      key: projectKey,
      workspace: { slug: workspaceSlug },
    },
    include: {
      sprints: {
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <main className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Sprints</h1>
        <Link href={`/w/${workspaceSlug}/p/${projectKey}/board`} className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
          Back to board
        </Link>
      </header>

      <SprintCreateForm projectId={project.id} />

      <section className="grid gap-3">
        {project.sprints.map((sprint) => (
          <Card key={sprint.id} className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{sprint.name}</h2>
              <span className="text-xs uppercase text-[var(--color-text-tertiary)]">{sprint.status}</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">{sprint.goal || "No sprint goal"}</p>
            <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
              {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
            </p>
            <Link href={`/w/${workspaceSlug}/p/${projectKey}/sprints/${sprint.id}`} className="mt-2 inline-flex text-xs text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
              View Sprint Details
            </Link>
          </Card>
        ))}
        {!project.sprints.length ? <Card className="p-6 text-sm text-[var(--color-text-secondary)]">No sprints yet. Create your first sprint above.</Card> : null}
      </section>
    </main>
  );
}


