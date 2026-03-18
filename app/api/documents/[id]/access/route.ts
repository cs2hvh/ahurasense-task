import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { grantAccessSchema, revokeAccessSchema } from "@/lib/validations/document";

// GET /api/documents/[id]/access — list who has access to a document
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const userId = auth.session.user.id;

    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, projectId: true, createdById: true },
    });

    if (!document) return fail("Document not found", 404);

    // Only project members can view access
    const membership = await prisma.projectMember.findFirst({
      where: { projectId: document.projectId, userId },
    });
    if (!membership) return fail("Forbidden", 403);

    const accessList = await prisma.documentAccess.findMany({
      where: { documentId: id },
      select: {
        id: true,
        accessLevel: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        grantedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok({
      ownerId: document.createdById,
      accessList,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

// POST /api/documents/[id]/access — grant access to a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const userId = auth.session.user.id;

    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, projectId: true, createdById: true },
    });

    if (!document) return fail("Document not found", 404);

    // Only document owner can grant access
    if (document.createdById !== userId) {
      return fail("Only the document owner can manage access", 403);
    }

    const payload = grantAccessSchema.parse(await request.json());

    // Cannot grant access to self
    if (payload.userId === userId) {
      return fail("You already own this document", 400);
    }

    // Target user must be a project member
    const targetMembership = await prisma.projectMember.findFirst({
      where: { projectId: document.projectId, userId: payload.userId },
    });
    if (!targetMembership) return fail("User is not a member of this project", 400);

    const access = await prisma.documentAccess.upsert({
      where: {
        documentId_userId: { documentId: id, userId: payload.userId },
      },
      create: {
        documentId: id,
        userId: payload.userId,
        accessLevel: payload.accessLevel,
        grantedById: userId,
      },
      update: {
        accessLevel: payload.accessLevel,
        grantedById: userId,
      },
      select: {
        id: true,
        accessLevel: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return ok(access, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

// DELETE /api/documents/[id]/access — revoke a user's access
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const userId = auth.session.user.id;

    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!document) return fail("Document not found", 404);

    // Only document owner can revoke access
    if (document.createdById !== userId) {
      return fail("Only the document owner can manage access", 403);
    }

    const payload = revokeAccessSchema.parse(await request.json());

    await prisma.documentAccess.deleteMany({
      where: { documentId: id, userId: payload.userId },
    });

    return ok({ revoked: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
