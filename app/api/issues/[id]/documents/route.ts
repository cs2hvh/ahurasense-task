import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildObjectKey, uploadObject, getPublicObjectUrl } from "@/lib/storage";
import { validateDocumentUpload } from "@/lib/validations/document";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const issue = await prisma.issue.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });

    if (!issue) return fail("Issue not found", 404);

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: issue.projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    const documents = await prisma.document.findMany({
      where: { issueId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        _count: { select: { versions: true } },
      },
    });

    return ok(documents.map((d) => ({ ...d, fileSize: Number(d.fileSize) })));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const issue = await prisma.issue.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });

    if (!issue) return fail("Issue not found", 404);

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: issue.projectId, userId: auth.session.user.id },
    });

    if (!membership) return fail("Forbidden", 403);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return fail("File is required", 400);
    }

    const fileName = (file as File).name || "document";
    const contentType = file.type || "application/octet-stream";
    const fileSize = file.size;

    validateDocumentUpload(contentType, fileSize);

    const key = buildObjectKey({
      scope: "document",
      userId: auth.session.user.id,
      originalFileName: fileName,
      projectId: issue.projectId,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadObject({ key, contentType, body: buffer });

    const fileUrl = getPublicObjectUrl(key);
    const title = fileName.replace(/\.[^.]+$/, "");

    const document = await prisma.document.create({
      data: {
        projectId: issue.projectId,
        issueId: id,
        title,
        fileUrl,
        fileKey: key,
        fileSize,
        mimeType: contentType,
        createdById: auth.session.user.id,
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok({ ...document, fileSize: Number(document.fileSize) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
