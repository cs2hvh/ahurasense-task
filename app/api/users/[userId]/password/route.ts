import { hash } from "bcryptjs";
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[0-9]/, "Password must include a number"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const callerId = auth.session.user.id;
  const { userId } = await params;

  // Only admin or workspace owner can reset another user's password
  const caller = await prisma.user.findUnique({
    where: { id: callerId },
    select: { role: true },
  });

  let isPrivileged = caller?.role === "admin";
  if (!isPrivileged) {
    const ownerMembership = await prisma.workspaceMember.findFirst({
      where: { userId: callerId, role: "owner" },
      select: { userId: true },
    });
    isPrivileged = !!ownerMembership;
  }

  if (!isPrivileged) {
    return fail("Forbidden", 403);
  }

  // Cannot reset own password through this endpoint
  if (userId === callerId) {
    return fail("Use the password change endpoint for your own account", 400);
  }

  try {
    const payload = resetPasswordSchema.parse(await request.json());

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) {
      return fail("User not found", 404);
    }

    const passwordHash = await hash(payload.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true },
    });

    return ok({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
