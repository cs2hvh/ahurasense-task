import { redirect } from "next/navigation";

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

  return (
    <div className="p-6">
      <DocumentList projectId={project.id} currentUserId={session.user.id} />
    </div>
  );
}
