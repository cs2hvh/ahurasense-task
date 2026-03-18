import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { deleteObjectByKey } from "@/lib/storage";
import { updateDocumentSchema } from "@/lib/validations/document";

async function getDocumentWithAccess(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      projectId: true,
      title: true,
      fileUrl: true,
      fileKey: true,
      fileSize: true,
      mimeType: true,
      folderId: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      folder: { select: { isPublic: true } },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      versions: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          fileUrl: true,
          fileSize: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!document) return { error: fail("Document not found", 404) } as const;

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: document.projectId, userId },
  });

  if (!membership) return { error: fail("Forbidden", 403) } as const;

  // Determine access level:
  // 1. Owner → full access (editor)
  // 2. Document is in a public folder → viewer access for all project members
  // 3. Explicit access grant in DocumentAccess table
  // 4. No access otherwise
  let accessLevel: "owner" | "editor" | "viewer" | null = null;

  if (document.createdById === userId) {
    accessLevel = "owner";
  } else if (document.folder?.isPublic) {
    accessLevel = "viewer";
    // Check if they also have explicit higher access
    const explicit = await prisma.documentAccess.findUnique({
      where: { documentId_userId: { documentId, userId } },
      select: { accessLevel: true },
    });
    if (explicit?.accessLevel === "editor") accessLevel = "editor";
  } else {
    const explicit = await prisma.documentAccess.findUnique({
      where: { documentId_userId: { documentId, userId } },
      select: { accessLevel: true },
    });
    if (explicit) {
      accessLevel = explicit.accessLevel;
    }
  }

  if (!accessLevel) return { error: fail("You don't have access to this document", 403) } as const;

  return { document, membership, accessLevel } as const;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeDocument(doc: any) {
  return {
    ...doc,
    fileSize: Number(doc.fileSize),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    versions: doc.versions?.map((v: any) => ({ ...v, fileSize: Number(v.fileSize) })),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const result = await getDocumentWithAccess(id, auth.session.user.id);
    if ("error" in result) return result.error;

    return ok({ ...serializeDocument(result.document), accessLevel: result.accessLevel });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const result = await getDocumentWithAccess(id, auth.session.user.id);
    if ("error" in result) return result.error;

    if (result.accessLevel === "viewer") {
      return fail("You don't have edit access to this document", 403);
    }

    const payload = updateDocumentSchema.parse(await request.json());

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(payload.title !== undefined && { title: payload.title }),
        ...(payload.folderId !== undefined && { folderId: payload.folderId }),
      },
      select: {
        id: true,
        title: true,
        folderId: true,
        updatedAt: true,
      },
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const result = await getDocumentWithAccess(id, auth.session.user.id);
    if ("error" in result) return result.error;

    if (result.accessLevel !== "owner") {
      return fail("Only the document owner can delete it", 403);
    }

    const doc = result.document;

    // Delete all version files from storage
    for (const version of doc.versions) {
      try {
        const versionKey = version.fileUrl.split("/").slice(-4).join("/");
        await deleteObjectByKey(versionKey);
      } catch {
        // Best-effort deletion of version files
      }
    }

    // Delete the main file from storage
    try {
      await deleteObjectByKey(doc.fileKey);
    } catch {
      // Best-effort deletion
    }

    await prisma.document.delete({ where: { id } });

    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
