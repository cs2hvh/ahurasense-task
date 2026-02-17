import { compare, hash } from "bcryptjs";
import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations/user";

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const payload = changePasswordSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { id: auth.session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return fail("User not found", 404);
    }

    const isValid = await compare(payload.currentPassword, user.passwordHash);
    if (!isValid) {
      return fail("Current password is incorrect", 400);
    }

    const isSamePassword = await compare(payload.newPassword, user.passwordHash);
    if (isSamePassword) {
      return fail("New password must be different from current password", 400);
    }

    const passwordHash = await hash(payload.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
      select: { id: true },
    });

    return ok({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

