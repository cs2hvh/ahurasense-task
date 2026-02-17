import { NextRequest } from "next/server";
import sanitizeHtml from "sanitize-html";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createIssueSchema } from "@/lib/validations/issue";

type IssueKind = "story" | "task" | "bug" | "epic" | "subtask";

async function resolveHierarchyForCreate(projectId: string, payload: { type: IssueKind; parentId?: string; epicId?: string }) {
  const resolvedParentId = payload.parentId ?? null;
  let resolvedEpicId = payload.epicId ?? null;

  if (payload.type === "epic") {
    if (resolvedParentId || resolvedEpicId) {
      throw new Error("Epic cannot be linked to parent or epic");
    }
    return { parentId: null, epicId: null };
  }

  if (resolvedParentId) {
    const parent = await prisma.issue.findFirst({
      where: { id: resolvedParentId, projectId },
      select: { id: true, type: true, epicId: true },
    });

    if (!parent) {
      throw new Error("Invalid parent issue for this project");
    }

    if ((payload.type === "task" || payload.type === "bug") && parent.type !== "story") {
      throw new Error("Task/Bug parent must be a Story");
    }
    if (payload.type === "subtask" && !["story", "task", "bug"].includes(parent.type)) {
      throw new Error("Subtask parent must be Story/Task/Bug");
    }
    if (payload.type === "story") {
      throw new Error("Story cannot have a parent issue");
    }

    if (!resolvedEpicId && parent.epicId) {
      resolvedEpicId = parent.epicId;
    }
  } else if (payload.type === "subtask") {
    throw new Error("Subtask must have a parent issue");
  }

  if (resolvedEpicId) {
    const epic = await prisma.issue.findFirst({
      where: { id: resolvedEpicId, projectId },
      select: { id: true, type: true },
    });
    if (!epic || epic.type !== "epic") {
      throw new Error("Epic link must reference an Epic issue");
    }
  }

  return { parentId: resolvedParentId, epicId: resolvedEpicId };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { projectId } = await params;
  const statusId = request.nextUrl.searchParams.get("statusId");
  const type = request.nextUrl.searchParams.get("type");
  const sprintId = request.nextUrl.searchParams.get("sprintId");
  const assigneeId = request.nextUrl.searchParams.get("assigneeId");
  const q = request.nextUrl.searchParams.get("q");

  const member = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: auth.session.user.id,
    },
  });

  if (!member) {
    return fail("Forbidden", 403);
  }

  const issues = await prisma.issue.findMany({
    where: {
      projectId,
      ...(statusId ? { statusId } : {}),
      ...(type ? { type: type as "story" | "task" | "bug" | "epic" | "subtask" } : {}),
      ...(sprintId ? { sprintId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(q
        ? {
            OR: [{ title: { contains: q } }, { key: { contains: q } }],
          }
        : {}),
    },
    include: {
      assignee: {
        select: { id: true, firstName: true, lastName: true },
      },
      status: true,
    },
    orderBy: [{ status: { position: "asc" } }, { position: "asc" }],
  });

  return ok(issues);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;
    const payload = createIssueSchema.parse(await request.json());

    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: auth.session.user.id,
      },
      include: {
        project: true,
      },
    });

    if (!member) {
      return fail("Forbidden", 403);
    }

    const status = await prisma.issueStatus.findFirst({
      where: {
        id: payload.statusId,
        projectId,
      },
    });

    if (!status) {
      return fail("Invalid status", 400);
    }

    const hierarchy = await resolveHierarchyForCreate(projectId, {
      type: payload.type,
      parentId: payload.parentId,
      epicId: payload.epicId,
    });

    const issue = await prisma.$transaction(async (tx) => {
      const latest = await tx.issue.findFirst({
        where: { projectId },
        orderBy: { issueNumber: "desc" },
        select: { issueNumber: true },
      });

      const issueNumber = (latest?.issueNumber ?? 0) + 1;
      const key = `${member.project.key}-${issueNumber}`;

      const latestPosition = await tx.issue.findFirst({
        where: {
          projectId,
          statusId: payload.statusId,
        },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      const created = await tx.issue.create({
        data: {
          projectId,
          issueNumber,
          key,
          type: payload.type,
          title: payload.title,
          description: payload.description
            ? sanitizeHtml(payload.description, {
                allowedTags: ["b", "i", "strong", "em", "p", "ul", "ol", "li", "a", "code", "pre", "blockquote"],
                allowedAttributes: { a: ["href", "target", "rel"] },
              })
            : undefined,
          statusId: payload.statusId,
          priority: payload.priority,
          storyPoints: payload.storyPoints,
          assigneeId: payload.assigneeId,
          reporterId: auth.session.user.id,
          sprintId: payload.sprintId,
          dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
          parentId: hierarchy.parentId,
          epicId: hierarchy.epicId,
          position: (latestPosition?.position ?? -1) + 1,
        },
      });

      await tx.issueHistory.create({
        data: {
          issueId: created.id,
          userId: auth.session.user.id,
          fieldName: "create",
          newValue: "Issue created",
        },
      });

      return created;
    });

    return ok(issue, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}


