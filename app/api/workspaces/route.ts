import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { canCreateWorkspaceWithRole } from "@/lib/access";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createWorkspaceSchema } from "@/lib/validations/workspace";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: auth.session.user.id },
    include: {
      workspace: true,
    },
    orderBy: { joinedAt: "desc" },
  });

  return ok(memberships.map((membership) => ({ ...membership.workspace, membershipRole: membership.role })));
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  if (!canCreateWorkspaceWithRole(auth.session.user.role)) {
    return fail("You are not allowed to create workspaces", 403);
  }

  try {
    const payload = createWorkspaceSchema.parse(await request.json());

    const existing = await prisma.workspace.findUnique({
      where: { slug: payload.slug },
      select: { id: true },
    });

    if (existing) {
      return fail("Workspace slug already exists", 409);
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          ownerId: auth.session.user.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: created.id,
          userId: auth.session.user.id,
          role: "owner",
        },
      });

      return created;
    });

    return ok(workspace, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}


