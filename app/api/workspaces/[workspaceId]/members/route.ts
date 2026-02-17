import { NextRequest } from "next/server";
import { hash } from "bcryptjs";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { generateTemporaryPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { addWorkspaceMemberSchema } from "@/lib/validations/membership";

async function getWorkspaceAccess(workspaceId: string, userId: string, globalRole?: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true },
  });

  if (!workspace) {
    return { error: fail("Workspace not found", 404) };
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  });

  const isGlobalAdmin = globalRole === "admin";
  const canView = isGlobalAdmin || Boolean(membership);
  const canManage = isGlobalAdmin || membership?.role === "owner" || membership?.role === "admin";
  const canAssignAdmin = membership?.role === "owner";

  return { workspace, membership, canView, canManage, canAssignAdmin };
}

function deriveNamesFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const tokens = local
    .split(/[._-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const titleCase = (value: string) =>
    value ? `${value[0].toUpperCase()}${value.slice(1).toLowerCase()}` : "";

  if (!tokens.length) {
    return {
      firstName: "Workspace",
      lastName: "Member",
    };
  }

  return {
    firstName: titleCase(tokens[0]),
    lastName: titleCase(tokens[1] ?? "Member"),
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { workspaceId } = await params;
  const access = await getWorkspaceAccess(workspaceId, auth.session.user.id, auth.session.user.role);
  if ("error" in access) {
    return access.error;
  }
  if (!access.canView) {
    return fail("Forbidden", 403);
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          role: true,
          status: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return ok(members);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { workspaceId } = await params;
    const access = await getWorkspaceAccess(workspaceId, auth.session.user.id, auth.session.user.role);
    if ("error" in access) {
      return access.error;
    }
    if (!access.canManage) {
      return fail("Forbidden", 403);
    }

    const payload = addWorkspaceMemberSchema.parse(await request.json());
    const normalizedEmail = payload.email.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    let generatedPassword: string | null = null;

    if (!user && payload.createUserIfMissing) {
      generatedPassword = generateTemporaryPassword();
      const passwordHash = await hash(generatedPassword, 12);
      const fallbackName = deriveNamesFromEmail(normalizedEmail);

      const created = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: payload.firstName?.trim() || fallbackName.firstName,
          lastName: payload.lastName?.trim() || fallbackName.lastName,
        },
        select: { id: true },
      });

      user = created;
    }

    if (!user) {
      return fail("User with this email was not found. Enable account creation to create member credentials.", 404);
    }

    const existing = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
      select: { id: true, role: true },
    });

    if (existing?.role === "owner") {
      return fail("Workspace owner role cannot be modified", 400);
    }

    if (payload.role === "admin" && !access.canAssignAdmin) {
      return fail("Only workspace owner can grant admin role", 403);
    }

    if (existing?.role === "admin" && !access.canAssignAdmin) {
      return fail("Only workspace owner can modify admin members", 403);
    }

    const member = existing
      ? await prisma.workspaceMember.update({
          where: { id: existing.id },
          data: { role: payload.role },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: true,
                status: true,
              },
            },
          },
        })
      : await prisma.workspaceMember.create({
          data: {
            workspaceId,
            userId: user.id,
            role: payload.role,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: true,
                status: true,
              },
            },
          },
        });

    return ok(
      {
        member,
        generatedCredentials: generatedPassword
          ? {
              email: normalizedEmail,
              password: generatedPassword,
            }
          : null,
      },
      { status: existing ? 200 : 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
