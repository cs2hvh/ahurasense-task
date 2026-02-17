import { NextRequest } from "next/server";
import sanitizeHtml from "sanitize-html";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateIssueSchema } from "@/lib/validations/issue";

type IssueKind = "story" | "task" | "bug" | "epic" | "subtask";

function stringify(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

async function resolveHierarchyForUpdate(args: {
  issueId: string;
  projectId: string;
  currentType: IssueKind;
  currentParentId: string | null;
  currentEpicId: string | null;
  nextType?: IssueKind;
  nextParentId?: string | null;
  nextEpicId?: string | null;
}) {
  const type = args.nextType ?? args.currentType;
  const parentId = args.nextParentId !== undefined ? args.nextParentId : args.currentParentId;
  let epicId = args.nextEpicId !== undefined ? args.nextEpicId : args.currentEpicId;

  if (type === "epic") {
    return { parentId: null, epicId: null };
  }

  if (parentId === args.issueId) {
    throw new Error("Issue cannot be its own parent");
  }
  if (epicId === args.issueId) {
    throw new Error("Issue cannot be its own epic");
  }

  if (parentId) {
    const parent = await prisma.issue.findFirst({
      where: { id: parentId, projectId: args.projectId },
      select: { id: true, type: true, epicId: true },
    });

    if (!parent) {
      throw new Error("Invalid parent issue for this project");
    }

    if ((type === "task" || type === "bug") && parent.type !== "story") {
      throw new Error("Task/Bug parent must be a Story");
    }
    if (type === "subtask" && !["story", "task", "bug"].includes(parent.type)) {
      throw new Error("Subtask parent must be Story/Task/Bug");
    }
    if (type === "story") {
      throw new Error("Story cannot have a parent issue");
    }

    if (!epicId && parent.epicId) {
      epicId = parent.epicId;
    }
  } else if (type === "subtask") {
    throw new Error("Subtask must have a parent issue");
  }

  if (epicId) {
    const epic = await prisma.issue.findFirst({
      where: { id: epicId, projectId: args.projectId },
      select: { id: true, type: true },
    });
    if (!epic || epic.type !== "epic") {
      throw new Error("Epic link must reference an Epic issue");
    }
  }

  return { parentId, epicId };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const payload = updateIssueSchema.parse(await request.json());

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!issue) {
      return fail("Issue not found", 404);
    }

    const isAdmin = auth.session.user.role === "admin";

    if (!isAdmin) {
      const member = await prisma.projectMember.findFirst({
        where: {
          projectId: issue.projectId,
          userId: auth.session.user.id,
        },
      });

      if (!member) {
        return fail("Forbidden", 403);
      }

      const isOwner = issue.reporterId === auth.session.user.id || issue.assigneeId === auth.session.user.id;
      if (!isOwner) {
        return fail("Only issue owner can edit this issue", 403);
      }
    }

    if (payload.statusId) {
      const status = await prisma.issueStatus.findFirst({
        where: {
          id: payload.statusId,
          projectId: issue.projectId,
        },
      });

      if (!status) {
        return fail("Invalid status for this project", 400);
      }
    }

    if (payload.assigneeId) {
      const assigneeMember = await prisma.projectMember.findFirst({
        where: {
          projectId: issue.projectId,
          userId: payload.assigneeId,
        },
      });

      if (!assigneeMember) {
        return fail("Assignee must be a project member", 400);
      }
    }

    if (payload.sprintId) {
      const sprint = await prisma.sprint.findFirst({
        where: {
          id: payload.sprintId,
          projectId: issue.projectId,
        },
      });

      if (!sprint) {
        return fail("Invalid sprint for this project", 400);
      }
    }

    const hierarchy = await resolveHierarchyForUpdate({
      issueId: issue.id,
      projectId: issue.projectId,
      currentType: issue.type,
      currentParentId: issue.parentId,
      currentEpicId: issue.epicId,
      nextType: payload.type,
      nextParentId: payload.parentId,
      nextEpicId: payload.epicId,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.issue.update({
        where: { id },
        data: {
          ...(payload.title !== undefined ? { title: payload.title } : {}),
          ...(payload.description !== undefined
            ? {
                description: payload.description
                  ? sanitizeHtml(payload.description, {
                      allowedTags: ["b", "i", "strong", "em", "p", "ul", "ol", "li", "a", "code", "pre", "blockquote"],
                      allowedAttributes: { a: ["href", "target", "rel"] },
                    })
                  : null,
              }
            : {}),
          ...(payload.type !== undefined ? { type: payload.type } : {}),
          ...(payload.statusId !== undefined ? { statusId: payload.statusId } : {}),
          ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
          ...(payload.assigneeId !== undefined ? { assigneeId: payload.assigneeId || null } : {}),
          ...(payload.sprintId !== undefined ? { sprintId: payload.sprintId || null } : {}),
          ...(payload.storyPoints !== undefined ? { storyPoints: payload.storyPoints ?? null } : {}),
          ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate ? new Date(payload.dueDate) : null } : {}),
          parentId: hierarchy.parentId,
          epicId: hierarchy.epicId,
        },
      });

      const before = {
        title: issue.title,
        type: issue.type,
        statusId: issue.statusId,
        priority: issue.priority,
        assigneeId: issue.assigneeId,
        sprintId: issue.sprintId,
        storyPoints: issue.storyPoints,
        parentId: issue.parentId,
        epicId: issue.epicId,
      };
      const after = {
        title: next.title,
        type: next.type,
        statusId: next.statusId,
        priority: next.priority,
        assigneeId: next.assigneeId,
        sprintId: next.sprintId,
        storyPoints: next.storyPoints,
        parentId: next.parentId,
        epicId: next.epicId,
      };

      const changedFields = Object.keys(before).filter((key) => stringify(before[key as keyof typeof before]) !== stringify(after[key as keyof typeof after]));
      for (const field of changedFields) {
        await tx.issueHistory.create({
          data: {
            issueId: issue.id,
            userId: auth.session.user.id,
            fieldName: field,
            oldValue: stringify(before[field as keyof typeof before]),
            newValue: stringify(after[field as keyof typeof after]),
          },
        });
      }

      if (payload.assigneeId && payload.assigneeId !== issue.assigneeId) {
        await tx.notification.create({
          data: {
            userId: payload.assigneeId,
            issueId: issue.id,
            type: "assigned",
            message: `${auth.session.user.firstName} assigned you to ${issue.key}`,
          },
        });
      }

      return next;
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
