import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { PresentationViewer } from "@/components/documents/presentation-viewer";
import { SpreadsheetViewer } from "@/components/documents/spreadsheet-viewer";
import { PdfViewer } from "@/components/documents/pdf-viewer";
import { TextFileEditor } from "@/components/documents/text-file-editor";
import { isPresentationMime, isSpreadsheetMime, isPdfMime, isTextMime } from "@/lib/validations/document";

export default async function DocumentViewPage({
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

  // Check access: owner, public folder, or explicit grant
  const userId = session.user.id;
  const isOwner = document.createdById === userId;
  const isPublicFolder = !!document.folder?.isPublic;

  if (!isOwner && !isPublicFolder) {
    const access = await prisma.documentAccess.findUnique({
      where: { documentId_userId: { documentId, userId } },
      select: { id: true },
    });
    if (!access) notFound();
  }

  // Check if user can edit (owner or editor grant)
  let canEdit = isOwner;
  if (!canEdit) {
    const access = await prisma.documentAccess.findUnique({
      where: { documentId_userId: { documentId, userId } },
      select: { accessLevel: true },
    });
    if (access?.accessLevel === "editor") canEdit = true;
  }

  const isPresentation = isPresentationMime(document.mimeType);
  const isSpreadsheet = isSpreadsheetMime(document.mimeType);
  const isPdf = isPdfMime(document.mimeType);
  const isText = isTextMime(document.mimeType);

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
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{document.title}</span>
        <div className="ml-auto">
          {!isPdf && (
            <a
              href={`/w/${workspaceSlug}/p/${projectKey}/documents/${documentId}/edit`}
              className="inline-flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              {canEdit ? "Edit" : "View in Editor"}
            </a>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {isPdf ? (
          <PdfViewer documentId={document.id} title={document.title} />
        ) : isSpreadsheet ? (
          <SpreadsheetViewer documentId={document.id} title={document.title} />
        ) : isPresentation ? (
          <PresentationViewer documentId={document.id} title={document.title} />
        ) : isText ? (
          <TextFileEditor documentId={document.id} title={document.title} mimeType={document.mimeType} readOnly />
        ) : (
          <DocumentViewer documentId={document.id} title={document.title} />
        )}
      </div>
    </div>
  );
}
