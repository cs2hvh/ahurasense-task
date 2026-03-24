import { redirect } from "next/navigation";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { DocumentList } from "@/components/documents/document-list";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/auth/login");

  const { workspaceSlug, projectKey } = await params;

  const project = await prisma.project.findFirst({
    where: { key: projectKey, workspace: { slug: workspaceSlug } },
    select: { id: true },
  });

  if (!project) redirect(`/w/${workspaceSlug}`);

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: project.id, userId: session.user.id },
    select: { role: true },
  });

  return (
    <div className="p-6">
      <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="size-6 animate-spin rounded-full border-2 border-[var(--color-text-tertiary)] border-t-transparent" /></div>}>
        <DocumentList projectId={project.id} currentUserId={session.user.id} userRole={membership?.role ?? "viewer"} />
      </Suspense>
    </div>
  );
}
