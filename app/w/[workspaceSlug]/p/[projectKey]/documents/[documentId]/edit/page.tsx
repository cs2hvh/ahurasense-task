import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { DocumentEditor } from "@/components/documents/document-editor";
import { PresentationEditor } from "@/components/documents/presentation-editor";
import { SpreadsheetEditor } from "@/components/documents/spreadsheet-editor";
import { TextFileEditor } from "@/components/documents/text-file-editor";
import { isPresentationMime, isSpreadsheetMime, isPdfMime, isTextMime } from "@/lib/validations/document";

export default async function DocumentEditPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string; documentId: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/auth/login");

  const { workspaceSlug, projectKey, documentId } = await params;

  const project = await prisma.project.findFirst({
    where: { key: projectKey, workspace: { slug: workspaceSlug } },
    select: { id: true },
  });

  if (!project) redirect(`/w/${workspaceSlug}`);

  const document = await prisma.document.findFirst({
    where: { id: documentId, projectId: project.id },
    select: {
      id: true,
      title: true,
      mimeType: true,
      createdById: true,
      folder: { select: { isPublic: true } },
    },
  });

  if (!document) notFound();

  // Determine access level
  const userId = session.user.id;
  let canEdit = document.createdById === userId; // owner can always edit

  if (!canEdit) {
    const access = await prisma.documentAccess.findUnique({
      where: { documentId_userId: { documentId, userId } },
      select: { accessLevel: true },
    });
    if (access?.accessLevel === "editor") canEdit = true;
  }

  // If not owner and not shared, check public folder (viewer only) or deny
  const isPublicFolder = !!document.folder?.isPublic;
  if (!canEdit && !isPublicFolder) {
    const hasAnyAccess = await prisma.documentAccess.findUnique({
      where: { documentId_userId: { documentId, userId } },
      select: { id: true },
    });
    if (!hasAnyAccess) notFound();
  }

  const isPresentation = isPresentationMime(document.mimeType);
  const isSpreadsheet = isSpreadsheetMime(document.mimeType);
  const isPdf = isPdfMime(document.mimeType);
  const isText = isTextMime(document.mimeType);

  // PDF is read-only — redirect to view page
  if (isPdf) {
    redirect(`/w/${workspaceSlug}/p/${projectKey}/documents/${documentId}`);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-6 py-3">
        <a
          href={`/w/${workspaceSlug}/p/${projectKey}/documents`}
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          Documents
        </a>
        <span className="text-[var(--color-text-tertiary)]">/</span>
        <a
          href={`/w/${workspaceSlug}/p/${projectKey}/documents/${documentId}`}
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          {document.title}
        </a>
        <span className="text-[var(--color-text-tertiary)]">/</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {canEdit ? "Edit" : "View (Read Only)"}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        {isText ? (
          <TextFileEditor
            documentId={document.id}
            title={document.title}
            mimeType={document.mimeType}
            readOnly={!canEdit}
          />
        ) : isSpreadsheet ? (
          <SpreadsheetEditor
            documentId={document.id}
            title={document.title}
            readOnly={!canEdit}
          />
        ) : isPresentation ? (
          <PresentationEditor
            documentId={document.id}
            title={document.title}
            readOnly={!canEdit}
          />
        ) : (
          <DocumentEditor
            documentId={document.id}
            title={document.title}
            readOnly={!canEdit}
          />
        )}
      </div>
    </div>
  );
}
